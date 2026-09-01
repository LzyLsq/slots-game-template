import { SecureRNG, type RandomSource } from '../core/SecureRNG';
import { EconomyService } from './EconomyService';
import { SaveService } from './SaveService';

export class RewardService {
  public constructor(protected readonly save: SaveService, protected readonly economy: EconomyService) {}
  public claim(id: string, amount: number, type: 'achievement' | 'mail' | 'check-in' | 'wheel'): boolean {
    const scope = this.save.currentScope(); if (!scope || scope.claims[id] || !Number.isSafeInteger(amount) || amount <= 0) return false;
    if (!this.economy.credit(amount, type, id)) return false;
    this.save.update((state) => { const userId = state.currentUserId; if (userId) state.playerData[userId].claims[id] = new Date().toISOString(); });
    return true;
  }
}

export class CheckInService extends RewardService {
  public readonly rewards = [2_000, 3_000, 5_000, 8_000, 12_000, 18_000, 50_000] as const;
  public claimToday(today: string): { ok: boolean; amount: number; day: number } {
    const state = this.save.currentScope()?.checkIn;
    if (!state || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return { ok: false, amount: 0, day: 1 };
    if (state.lastClaimDate === today) return { ok: false, amount: 0, day: state.cycleDay + 1 };
    const day = state.cycleDay % 7; const amount = this.rewards[day]; const ok = this.claim(`check-in:${today}`, amount, 'check-in');
    if (ok) this.save.update((draft) => { const id = draft.currentUserId; if (id) { draft.playerData[id].checkIn.cycleDay = (day + 1) % 7; draft.playerData[id].checkIn.lastClaimDate = today; } });
    return { ok, amount: ok ? amount : 0, day: day + 1 };
  }
}

export class WheelService extends RewardService {
  public readonly sectors = [1_000, 2_000, 5_000, 10_000, 1_500, 3_000, 8_000, 25_000] as const;
  /**
   * The wheel art uses eight equal-size visual sectors, but the daily reward
   * is deliberately weighted. Keep the weights in the same order as sectors
   * and expose them so the UI can disclose the real odds.
   */
  public readonly sectorWeights = [28, 19, 8, 3, 23, 13, 5, 1] as const;
  public constructor(save: SaveService, economy: EconomyService, private readonly rng: RandomSource = new SecureRNG()) { super(save, economy); }

  public probabilityPercent(sector: number): number { return this.sectorWeights[sector] ?? 0; }

  /** Returns an absolute positive rotation that centres the result under the top pointer. */
  public targetRotation(sector: number, completeTurns = 6): number {
    if (!Number.isSafeInteger(sector) || sector < 0 || sector >= this.sectors.length || !Number.isSafeInteger(completeTurns) || completeTurns < 1) throw new Error('Invalid wheel target');
    const sectorArc = 360 / this.sectors.length; const sectorCentre = (sector + 0.5) * sectorArc; const topPointer = 90;
    return completeTurns * 360 + ((topPointer - sectorCentre) % 360 + 360) % 360;
  }

  private chooseSector(): number {
    const totalWeight = this.sectorWeights.reduce((sum, weight) => sum + weight, 0); const roll = this.rng.int(0, totalWeight); let cursor = 0;
    for (let sector = 0; sector < this.sectorWeights.length; sector += 1) { cursor += this.sectorWeights[sector]; if (roll < cursor) return sector; }
    return this.sectorWeights.length - 1;
  }

  public prepare(today: string): { spinId: string; sector: number; amount: number } | undefined {
    const scope = this.save.currentScope(); if (!scope || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return undefined;
    if (scope.wheel.date !== today) this.save.update((state) => { const id = state.currentUserId; if (id) state.playerData[id].wheel = { date: today, remaining: 1, settledSpinIds: [] }; });
    const wheel = this.save.currentScope()?.wheel; if (!wheel || wheel.remaining <= 0 || wheel.pending) return wheel?.pending;
    const sector = this.chooseSector(); const prepared = { spinId: SecureRNG.id('wheel'), sector, amount: this.sectors[sector] };
    this.save.update((state) => { const id = state.currentUserId; if (!id) return; const draft = state.playerData[id].wheel; draft.remaining -= 1; draft.pending = prepared; });
    return prepared;
  }
  public settle(spinId: string): boolean {
    const pending = this.save.currentScope()?.wheel.pending; const wheel = this.save.currentScope()?.wheel;
    if (!pending || pending.spinId !== spinId || wheel?.settledSpinIds.includes(spinId) || this.sectors[pending.sector] !== pending.amount) return false;
    if (!this.claim(spinId, pending.amount, 'wheel')) return false;
    this.save.update((state) => { const id = state.currentUserId; if (!id) return; const draft = state.playerData[id].wheel; draft.settledSpinIds.push(spinId); draft.settledSpinIds = draft.settledSpinIds.slice(-100); draft.pending = undefined; });
    return true;
  }
  public recoverPending(): { spinId: string; amount: number } | undefined {
    const pending = this.save.currentScope()?.wheel.pending; if (!pending) return undefined;
    return this.settle(pending.spinId) ? { spinId: pending.spinId, amount: pending.amount } : undefined;
  }
}
