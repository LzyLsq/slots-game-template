import {festivalProgressKey} from './ExpeditionService';
import { SecureRNG } from '../core/SecureRNG';
import { SaveService, type TransactionRecord } from './SaveService';
import { PlayerProfileService } from './PlayerProfileService';

const validCredits = (value: number, maximum = 1_000_000_000): boolean => Number.isSafeInteger(value) && value >= 0 && value <= maximum;

export class EconomyService {
  public constructor(private readonly save: SaveService, private readonly profile: PlayerProfileService,private readonly now=()=>new Date()) {}
  public balance(): number { return this.profile.current()?.credits ?? 0; }

  public reserveSpin(spinId: string, bet: number): boolean {
    const userId = this.save.read().currentUserId; const player = this.profile.current(); const scope = this.save.currentScope();
    if (!userId || !player || !scope || scope.pendingSpin || !/^[a-z0-9-]{12,160}$/i.test(spinId) || !validCredits(bet, 100_000) || bet === 0 || player.credits < bet) return false;
    this.save.update((state) => {
      const draftPlayer = state.players[userId]; const draftScope = state.playerData[userId];
      draftPlayer.credits -= bet; draftScope.pendingSpin = { spinId, bet, reservedAt: this.now().toISOString() };
      this.addTransaction(draftScope.transactions, draftPlayer.credits, -bet, 'spin-bet', spinId);
    });
    return true;
  }

  public settleSpin(spinId: string, win: number, gameId?: string): boolean {
    const userId = this.save.read().currentUserId; const scope = this.save.currentScope();
    if (!userId || !scope?.pendingSpin || scope.pendingSpin.spinId !== spinId || scope.settledSpinIds.includes(spinId) || !validCredits(win, 50_000_000)) return false;
    this.save.update((state) => {
      const player = state.players[userId]; const data = state.playerData[userId];
      const actualWin=Math.min(win,1_000_000_000-player.credits); player.credits += actualWin; data.pendingSpin = undefined; data.settledSpinIds.push(spinId); data.settledSpinIds = data.settledSpinIds.slice(-200);
      if (actualWin > 0) this.addTransaction(data.transactions, player.credits, actualWin, 'spin-win', spinId);
      if(gameId&&['golden-strings','sapphire-harp','ruby-brass','pearl-rhythm'].includes(gameId)){const key=festivalProgressKey(gameId,this.now().toISOString().slice(0,10));const old=data.achievements[key]??{progress:0,claimed:false};data.achievements[key]={...old,progress:Math.min(36,old.progress+1)};}
      player.gamesPlayed += 1; player.totalWin += actualWin; player.biggestWin = Math.max(player.biggestWin, actualWin); player.experience += 10; player.level = 1 + Math.floor(player.experience / 100);
    });
    return true;
  }

  public cancelReservation(spinId: string): boolean {
    const userId = this.save.read().currentUserId; const scope = this.save.currentScope(); const pending = scope?.pendingSpin;
    if (!userId || !pending || pending.spinId !== spinId || scope.settledSpinIds.includes(spinId)) return false;
    this.save.update((state) => { const player = state.players[userId]; const data = state.playerData[userId]; const refund=Math.min(pending.bet,1_000_000_000-player.credits); player.credits += refund; data.pendingSpin = undefined; this.addTransaction(data.transactions, player.credits, refund, 'spin-refund', `${spinId}:cancelled`); });
    return true;
  }

  public recoverPending(): number {
    const pending = this.save.currentScope()?.pendingSpin;
    if (!pending) return 0;
    const before=this.balance();return this.cancelReservation(pending.spinId)?this.balance()-before:0;
  }

  public credit(amount: number, type: TransactionRecord['type'], reference: string): boolean {
    const userId = this.save.read().currentUserId;
    if (!userId || !validCredits(amount, 10_000_000) || amount === 0 || !reference || reference.length > 128) return false;
    this.save.update((state) => { const player = state.players[userId]; const scope = state.playerData[userId]; const credited=Math.min(amount,1_000_000_000-(scope.pendingSpin?.bet??0)-player.credits);player.credits += credited; this.addTransaction(scope.transactions, player.credits, credited, type, reference); });
    return true;
  }

  public creditVerifiedPurchase(amount: number, transactionId: string, authoritativeBalance?: number): boolean {
    const userId = this.save.read().currentUserId; const scope = this.save.currentScope();
    if (!userId || !scope || !validCredits(amount, 10_000_000) || amount === 0 || (authoritativeBalance !== undefined && !validCredits(authoritativeBalance)) || !/^[A-Za-z0-9._:-]{3,160}$/.test(transactionId) || scope.creditedPurchaseIds.includes(transactionId)) return false;
    this.save.update((state) => {
      const player = state.players[userId]; const data = state.playerData[userId];
      if (data.creditedPurchaseIds.includes(transactionId)) return;
      const before=player.credits;player.credits = Math.min(1_000_000_000-(data.pendingSpin?.bet??0),authoritativeBalance ?? before+amount);const credited=player.credits-before; data.creditedPurchaseIds.push(transactionId);
      this.addTransaction(data.transactions, player.credits, credited, 'store-iap', transactionId);
    });
    return true;
  }

  public synchronizeBalance(balance: number, reference: string): boolean {
    const userId = this.save.read().currentUserId; const player = this.profile.current();
    if (!userId || !player || !validCredits(balance) || !reference || reference.length > 128) return false;
    const delta = balance - player.credits;
    this.save.update((state) => { const draftPlayer = state.players[userId]; const scope = state.playerData[userId]; draftPlayer.credits = Math.min(balance,1_000_000_000-(scope.pendingSpin?.bet??0)); this.addTransaction(scope.transactions, draftPlayer.credits, draftPlayer.credits-player.credits, 'balance-sync', reference); });
    return true;
  }

  public synchronizePurchasedBalance(balance: number, reference: string): boolean { return this.synchronizeBalance(balance, reference); }

  private addTransaction(transactions: TransactionRecord[], balance: number, amount: number, type: TransactionRecord['type'], reference: string): void {
    transactions.unshift({ id: SecureRNG.id('tx'), at: this.now().toISOString(), type, amount, balance, reference }); transactions.splice(200);
  }
}
