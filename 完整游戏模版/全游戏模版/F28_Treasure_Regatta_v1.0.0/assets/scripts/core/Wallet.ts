import { BETS, MAX_WIN_MULTIPLIER, type ModeId, type Round } from './Model';
import { MODES } from './Modes';
import { generateRound, validateGrid } from './Rules';
import type { Random } from './Random';

export interface Persistence { read(): string | null; write(value: string): void }
export interface Receipt { id: number; mode: ModeId; bet: number; win: number; balance: number }
interface Pending { id: number; round: Round }
export interface WalletState {
  schema: 1;
  revision: number;
  balance: number;
  nextRoundId: number;
  pending: Pending | null;
  receipts: Receipt[];
  rewardDays: string[];
  settings: { sound: boolean; music: boolean; reducedMotion: boolean };
}
const initial = (): WalletState => ({ schema: 1, revision: 0, balance: 10000, nextRoundId: 1, pending: null, receipts: [], rewardDays: [], settings: { sound: true, music: true, reducedMotion: false } });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/** Fail closed on corruption: never silently reset a wallet and grant coins. */
function decode(raw: string): WalletState {
  const s: WalletState = JSON.parse(raw);
  if (!s || s.schema !== 1 || !integer(s.revision) || !integer(s.balance) || !integer(s.nextRoundId) || s.nextRoundId < 1 ||
    !Array.isArray(s.receipts) || s.receipts.length > 100 || !Array.isArray(s.rewardDays) ||
    !s.settings || ['sound', 'music', 'reducedMotion'].some(k => typeof s.settings[k as keyof WalletState['settings']] !== 'boolean')) {
    throw new Error('Saved wallet is invalid. Keep the save and contact support.');
  }
  const ids = new Set<number>();
  for (const r of s.receipts) {
    if (!integer(r.id) || r.id >= s.nextRoundId || ids.has(r.id) || !MODES[r.mode] || !(BETS as readonly number[]).includes(r.bet) || !integer(r.win) || !integer(r.balance)) throw new Error('Invalid receipt');
    ids.add(r.id);
  }
  if (s.rewardDays.some(day => typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) || new Set(s.rewardDays).size !== s.rewardDays.length) throw new Error('Invalid reward record');
  if (s.pending !== null) {
    const p = s.pending;
    if (!p || !integer(p.id) || p.id !== s.nextRoundId - 1 || ids.has(p.id)) throw new Error('Invalid pending round');
    assertRound(p.round);
  }
  return s;
}
function assertRound(r: Round): void {
  if (!r || !MODES[r.mode] || !(BETS as readonly number[]).includes(r.bet) || !integer(r.totalWin) || r.totalWin > r.bet * MAX_WIN_MULTIPLIER || !Array.isArray(r.stages) || !r.stages.length || r.stages.length > 50) throw new Error('Invalid round');
  let total = 0;
  for (const stage of r.stages) {
    validateGrid(MODES[r.mode], stage.grid);
    if (!Array.isArray(stage.awards)) throw new Error('Invalid awards');
    for (const a of stage.awards) {
      if (!integer(a.amount) || !a.cells.length || a.cells.some(c => !integer(c.column) || !integer(c.row) || c.column >= MODES[r.mode].columns || c.row >= MODES[r.mode].rows)) throw new Error('Invalid award');
      total += a.amount;
    }
  }
  if (total !== r.totalWin) throw new Error('Payout breakdown does not match total');
}

/** Local single-session adapter. Server/IAP authority is intentionally not impersonated. */
export class Wallet {
  private state: WalletState;
  private persisted: string | null;
  constructor(private readonly storage: Persistence) {
    this.persisted = storage.read();
    this.state = this.persisted === null ? initial() : decode(this.persisted);
    if (this.persisted === null) {
      const value = JSON.stringify(this.state);
      storage.write(value); this.persisted = value;
    }
  }
  snapshot(): WalletState { return clone(this.state); }
  private commit(mutator: (draft: WalletState) => void): void {
    if (this.storage.read() !== this.persisted) throw new Error('Wallet changed in another session. Reload before continuing.');
    const draft = clone(this.state); mutator(draft); draft.revision++;
    if (!integer(draft.balance)) throw new Error('Invalid balance');
    const serialized = JSON.stringify(draft);
    this.storage.write(serialized); // If persistence fails, in-memory state stays unchanged.
    this.state = draft; this.persisted = serialized;
  }
  /** Expected revision rejects an old/double-click command even after a fast completion. */
  begin(mode: ModeId, bet: number, expectedRevision: number, random: Random): Pending {
    if (this.state.pending) throw new Error('A round is already in progress.');
    if (expectedRevision !== this.state.revision) throw new Error('This action is out of date.');
    if (!MODES[mode]) throw new Error('Unknown game');
    if (this.state.balance < bet) throw new Error('Not enough coins. Lower your bet or visit rewards.');
    const round = generateRound(mode, bet, random);
    assertRound(round);
    const pending = { id: this.state.nextRoundId, round };
    this.commit(d => { d.balance -= bet; d.nextRoundId++; d.pending = pending; });
    return clone(pending);
  }
  settle(id: number): Receipt {
    const receipt = this.state.receipts.find(r => r.id === id);
    if (receipt) return clone(receipt);
    if (!this.state.pending || this.state.pending.id !== id) throw new Error('No matching pending round.');
    const round = this.state.pending.round;
    let result!: Receipt;
    this.commit(d => {
      d.balance += round.totalWin;
      result = { id, mode: round.mode, bet: round.bet, win: round.totalWin, balance: d.balance };
      d.pending = null; d.receipts.push(result); d.receipts = d.receipts.slice(-100);
    });
    return clone(result);
  }
  /** Recovery never generates another result or deducts another bet. */
  recover(): Receipt | null { return this.state.pending ? this.settle(this.state.pending.id) : null; }
  claimDaily(now: Date): number {
    if (!Number.isFinite(now.getTime())) throw new Error('Invalid date');
    const day = now.toISOString().slice(0, 10);
    if (this.state.pending) throw new Error('Finish the current round first.');
    if (this.state.rewardDays.includes(day)) throw new Error('Today’s reward has already been collected.');
    this.commit(d => { d.balance += 500; d.rewardDays.push(day); });
    return 500;
  }
  setting(key: keyof WalletState['settings'], value: boolean): void {
    if (!['sound', 'music', 'reducedMotion'].includes(key) || typeof value !== 'boolean') throw new Error('Invalid setting');
    this.commit(d => { d.settings[key] = value; });
  }
}
