import { SecureRNG } from '../core/SecureRNG';
import { SaveService, type TransactionRecord } from './SaveService';
import { PlayerProfileService } from './PlayerProfileService';

const validCredits = (value: number, maximum = 1_000_000_000): boolean => Number.isSafeInteger(value) && value >= 0 && value <= maximum;

export class EconomyService {
  public constructor(private readonly save: SaveService, private readonly profile: PlayerProfileService) {}
  public balance(): number { return this.profile.current()?.credits ?? 0; }

  public reserveSpin(spinId: string, bet: number): boolean {
    const userId = this.save.read().currentUserId; const player = this.profile.current(); const scope = this.save.currentScope();
    if (!userId || !player || !scope || scope.pendingSpin || !/^[a-z0-9-]{12,160}$/i.test(spinId) || !validCredits(bet, 100_000) || bet === 0 || player.credits < bet) return false;
    this.save.update((state) => {
      const draftPlayer = state.players[userId]; const draftScope = state.playerData[userId];
      draftPlayer.credits -= bet; draftScope.pendingSpin = { spinId, bet, reservedAt: new Date().toISOString() };
      this.addTransaction(draftScope.transactions, draftPlayer.credits, -bet, 'spin-bet', spinId);
    });
    return true;
  }

  public settleSpin(spinId: string, win: number): boolean {
    const userId = this.save.read().currentUserId; const scope = this.save.currentScope();
    if (!userId || !scope?.pendingSpin || scope.pendingSpin.spinId !== spinId || scope.settledSpinIds.includes(spinId) || !validCredits(win, 50_000_000)) return false;
    this.save.update((state) => {
      const player = state.players[userId]; const data = state.playerData[userId];
      player.credits = Math.min(1_000_000_000, player.credits + win); data.pendingSpin = undefined; data.settledSpinIds.push(spinId); data.settledSpinIds = data.settledSpinIds.slice(-200);
      if (win > 0) this.addTransaction(data.transactions, player.credits, win, 'spin-win', spinId);
      player.gamesPlayed += 1; player.totalWin += win; player.biggestWin = Math.max(player.biggestWin, win); player.experience += 10; player.level = 1 + Math.floor(player.experience / 100);
    });
    return true;
  }

  public cancelReservation(spinId: string): boolean {
    const userId = this.save.read().currentUserId; const scope = this.save.currentScope(); const pending = scope?.pendingSpin;
    if (!userId || !pending || pending.spinId !== spinId || scope.settledSpinIds.includes(spinId)) return false;
    this.save.update((state) => { const player = state.players[userId]; const data = state.playerData[userId]; player.credits += pending.bet; data.pendingSpin = undefined; this.addTransaction(data.transactions, player.credits, pending.bet, 'spin-refund', `${spinId}:cancelled`); });
    return true;
  }

  public recoverPending(): number {
    const pending = this.save.currentScope()?.pendingSpin;
    if (!pending) return 0;
    return this.cancelReservation(pending.spinId) ? pending.bet : 0;
  }

  public credit(amount: number, type: TransactionRecord['type'], reference: string): boolean {
    const userId = this.save.read().currentUserId;
    if (!userId || !validCredits(amount, 10_000_000) || amount === 0 || !reference || reference.length > 128) return false;
    this.save.update((state) => { const player = state.players[userId]; const scope = state.playerData[userId]; player.credits = Math.min(1_000_000_000, player.credits + amount); this.addTransaction(scope.transactions, player.credits, amount, type, reference); });
    return true;
  }

  private addTransaction(transactions: TransactionRecord[], balance: number, amount: number, type: TransactionRecord['type'], reference: string): void {
    transactions.unshift({ id: SecureRNG.id('tx'), at: new Date().toISOString(), type, amount, balance, reference }); transactions.splice(200);
  }
}
