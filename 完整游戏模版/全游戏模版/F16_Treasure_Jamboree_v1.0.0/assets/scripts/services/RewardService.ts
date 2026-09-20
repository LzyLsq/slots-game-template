import { SecureRNG } from '../core/SecureRNG';
import { EconomyService } from './EconomyService';
import { SaveService, validRewardDate } from './SaveService';

export class RewardService {
  public constructor(protected readonly save: SaveService, protected readonly economy: EconomyService) {}
  public claim(id: string, amount: number, type: 'achievement' | 'mail' | 'check-in' | 'wheel'): boolean {
    const scope = this.save.currentScope(); if (!scope || scope.claims[id] || !Number.isSafeInteger(amount) || amount <= 0) return false;
    return this.economy.credit(amount, type, id);
  }
}

export class CheckInService extends RewardService {
  public readonly rewards = [2_000, 3_000, 5_000, 8_000, 12_000, 18_000, 50_000] as const;
  public claimToday(today: string): { ok: boolean; amount: number; day: number } {
    const state = this.save.currentScope()?.checkIn;
    if (!state || !validRewardDate(today)) return { ok: false, amount: 0, day: 1 };
    if (state.lastClaimDate && state.lastClaimDate >= today) return { ok: false, amount: 0, day: state.cycleDay + 1 };
    const day = state.cycleDay % 7; const amount = this.rewards[day];
    const ok = this.economy.credit(amount, 'check-in', `check-in:${today}`, (scope) => { scope.checkIn.cycleDay = (day + 1) % 7; scope.checkIn.lastClaimDate = today; });
    return { ok, amount: ok ? amount : 0, day: day + 1 };
  }
}

export class WheelService extends RewardService {
  public readonly sectors = [1_000, 2_000, 5_000, 10_000, 1_500, 3_000, 8_000, 25_000] as const;
  private readonly rng = new SecureRNG();
  public prepare(today: string): { spinId: string; sector: number; amount: number } | undefined {
    const scope = this.save.currentScope(); if (!scope || !validRewardDate(today)) return undefined;
    // Finish yesterday's recorded award before refreshing today's allowance.
    if (scope.wheel.pending) return scope.wheel.pending;
    if (scope.wheel.date && scope.wheel.date > today) return undefined;
    if (scope.wheel.date !== today) this.save.update((state) => { const id = state.currentUserId; if (id) state.playerData[id].wheel = { date: today, remaining: 1, settledSpinIds: [] }; });
    const wheel = this.save.currentScope()?.wheel; if (!wheel || wheel.remaining <= 0 || wheel.pending) return wheel?.pending;
    const sector = this.rng.int(0, this.sectors.length); const prepared = { spinId: SecureRNG.id('wheel'), sector, amount: this.sectors[sector] };
    this.save.update((state) => { const id = state.currentUserId; if (!id) return; const draft = state.playerData[id].wheel; draft.remaining -= 1; draft.pending = prepared; });
    return prepared;
  }
  public settle(spinId: string): boolean {
    const pending = this.save.currentScope()?.wheel.pending; const wheel = this.save.currentScope()?.wheel;
    if (!pending || pending.spinId !== spinId || wheel?.settledSpinIds.includes(spinId)) return false;
    return this.economy.credit(pending.amount, 'wheel', spinId, (scope) => { const draft = scope.wheel; draft.settledSpinIds.push(spinId); draft.settledSpinIds = draft.settledSpinIds.slice(-100); draft.pending = undefined; });
  }
  public recoverPending(): { spinId: string; amount: number } | undefined {
    const pending = this.save.currentScope()?.wheel.pending; if (!pending) return undefined;
    return this.settle(pending.spinId) ? { spinId: pending.spinId, amount: pending.amount } : undefined;
  }
}
