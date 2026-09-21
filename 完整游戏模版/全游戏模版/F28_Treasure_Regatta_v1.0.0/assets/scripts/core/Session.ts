import type { ModeId, Round } from './Model';
import type { Random } from './Random';
import { Wallet, type Receipt } from './Wallet';

export type PlayState =
  | { kind: 'idle' }
  | { kind: 'spinning'; id: number; round: Round; turbo: boolean }
  | { kind: 'presenting'; receipt: Receipt; round: Round }
  | { kind: 'error'; message: string; recoverable: boolean };

/** Coordinates animation acknowledgements; animation must never credit the wallet itself. */
export class Session {
  private current: PlayState = { kind: 'idle' };
  private autoLeft = 0;
  private visible = true;
  private nextAutoDelay = 0;
  private lastMode: ModeId = 'captain';
  private lastBet = 20;
  private lastTurbo = false;
  constructor(private readonly wallet: Wallet, private readonly random: Random) {}
  state(): PlayState { return JSON.parse(JSON.stringify(this.current)) as PlayState; }
  get phase(): PlayState['kind'] { return this.current.kind; }
  get remainingAuto(): number { return this.autoLeft; }
  spin(mode: ModeId, bet: number, turbo: boolean): boolean {
    if (!this.visible || this.current.kind !== 'idle') return false;
    try {
      const pending = this.wallet.begin(mode, bet, this.wallet.snapshot().revision, this.random);
      this.lastMode = mode; this.lastBet = bet; this.lastTurbo = turbo;
      this.current = { kind: 'spinning', ...pending, turbo };
      return true;
    } catch (error) {
      this.autoLeft = 0;
      this.current = { kind: 'error', message: error instanceof Error ? error.message : 'Unable to start. Try again.', recoverable: true };
      return false;
    }
  }
  reelsStopped(id: number): void {
    if (this.current.kind !== 'spinning' || this.current.id !== id) return;
    const round = this.current.round;
    try {
      const receipt = this.wallet.settle(id);
      this.current = { kind: 'presenting', receipt, round };
    } catch (error) {
      this.autoLeft = 0;
      this.current = { kind: 'error', message: error instanceof Error ? error.message : 'Unable to save result.', recoverable: true };
    }
  }
  finishPresentation(): void {
    if (this.current.kind !== 'presenting') return;
    this.current = { kind: 'idle' }; this.nextAutoDelay = .65;
  }
  startAuto(count: number, mode: ModeId, bet: number, turbo: boolean): boolean {
    if (![10, 25, 50].includes(count) || this.current.kind !== 'idle' || !this.visible) return false;
    this.autoLeft = count - 1;
    return this.spin(mode, bet, turbo);
  }
  stopAuto(): void { this.autoLeft = 0; }
  /** Called with Cocos dt. No timer can continue betting while the app is hidden. */
  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Invalid frame duration');
    if (!this.visible || !this.autoLeft || this.current.kind !== 'idle') return;
    this.nextAutoDelay -= Math.min(dt, .1);
    if (this.nextAutoDelay > 0) return;
    this.autoLeft--;
    this.spin(this.lastMode, this.lastBet, this.lastTurbo);
  }
  hide(): void { this.visible = false; this.stopAuto(); }
  show(): void { this.visible = true; }
  canLeave(): boolean { return this.current.kind !== 'spinning'; }
  retrySave(): Receipt | null {
    if (this.current.kind !== 'error' && this.current.kind !== 'idle') return null;
    // Read authoritative persisted pending result, never request a new random outcome.
    const receipt = this.wallet.recover();
    this.current = { kind: 'idle' }; return receipt;
  }
}
