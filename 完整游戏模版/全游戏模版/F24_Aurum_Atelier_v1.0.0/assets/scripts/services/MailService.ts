import {ECONOMY} from '../math/EconomyProfile';
import { EconomyService } from './EconomyService';
import type { ProductionApiClient } from './ProductionApiClient';
import { SaveService } from './SaveService';

export interface MailItem { id: string; title: string; body: string; credits: number; kind: 'system' | 'reward'; }
export interface RemoteMailClaimResult { amount: number; balance: number; alreadyClaimed: boolean; }
export const INBOX_MESSAGES: readonly MailItem[] = [
  { id: 'welcome', title: 'Welcome to Aurum Atelier', body: 'Your first workshop coin allocation is attached.', credits: ECONOMY.mail[0], kind: 'reward' },
  { id: 'maintenance', title: 'Workshop bulletin', body: 'Workshop notices and account messages arrive in this inbox.', credits: 0, kind: 'system' },
  { id: 'weekend', title: 'A gift from the mint', body: 'Collect the attached virtual coins for your next creation.', credits: ECONOMY.mail[1], kind: 'reward' },
];
export class MailService {
  public constructor(private readonly save: SaveService, private readonly economy: EconomyService, private readonly api?: ProductionApiClient) {}
  public state(id: string): { read: boolean; claimed: boolean; deleted: boolean } { return this.save.currentScope()?.mail[id] ?? { read: false, claimed: false, deleted: false }; }
  public read(id: string): void { this.save.update((state) => { const userId = state.currentUserId; if (userId) state.playerData[userId].mail[id] = { ...state.playerData[userId].mail[id], read: true, claimed: state.playerData[userId].mail[id]?.claimed ?? false, deleted: state.playerData[userId].mail[id]?.deleted ?? false }; }); }
  public claim(id: string): boolean {
    const mail = INBOX_MESSAGES.find((item) => item.id === id); const current = this.state(id);
    if (!mail || mail.credits <= 0 || current.claimed || current.deleted || !this.economy.credit(mail.credits, 'mail', `mail:${id}`)) return false;
    this.save.update((state) => { const userId = state.currentUserId; if (userId) state.playerData[userId].mail[id] = { ...current, read: true, claimed: true }; }); return true;
  }
  public claimAll(): number { return INBOX_MESSAGES.reduce((sum, item) => sum + (this.claim(item.id) ? item.credits : 0), 0); }

  public async synchronizeRemote(): Promise<number> {
    if (!this.api) return 0;
    const response = await this.api.mailState();
    if (!Number.isSafeInteger(response.balance) || response.balance < 0) throw new Error('Invalid authoritative mail balance.');
    const knownRewards = INBOX_MESSAGES.filter((item) => item.credits > 0);
    const claimed = new Set(response.claimedIds.filter((id) => knownRewards.some((item) => item.id === id)));
    if (response.balance !== this.economy.balance() && !this.economy.synchronizeBalance(response.balance, 'mail-state-sync')) throw new Error('Unable to synchronize mail balance.');
    this.save.update((state) => {
      const userId = state.currentUserId; if (!userId) return;
      for (const item of knownRewards) {
        const current = state.playerData[userId].mail[item.id] ?? { read: false, claimed: false, deleted: false };
        const isClaimed = claimed.has(item.id);
        state.playerData[userId].mail[item.id] = { ...current, claimed: isClaimed, deleted: isClaimed ? current.deleted : false };
      }
    });
    return claimed.size;
  }

  public async claimRemote(id: string): Promise<RemoteMailClaimResult> {
    const mail = INBOX_MESSAGES.find((item) => item.id === id && item.credits > 0);
    if (!this.api || !mail) throw new Error('Remote mail reward is unavailable.');
    const response = await this.api.claimReward('mail', id);
    const alreadyClaimed = response.alreadyClaimed === true;
    if (response.rewardKey !== `mail:${id}` || !Number.isSafeInteger(response.balance) || response.balance < 0 || !Number.isSafeInteger(response.amount) || (alreadyClaimed ? response.amount !== 0 : response.amount !== mail.credits)) throw new Error('Invalid authoritative mail reward.');
    if (response.balance !== this.economy.balance() && !this.economy.synchronizeBalance(response.balance, `mail:${id}:sync`)) throw new Error('Unable to synchronize mail reward.');
    this.save.update((state) => { const userId = state.currentUserId; if (!userId) return; const current = state.playerData[userId].mail[id] ?? { read: false, claimed: false, deleted: false }; state.playerData[userId].mail[id] = { ...current, read: true, claimed: true }; });
    return { amount: response.amount, balance: response.balance, alreadyClaimed };
  }

  public async claimAllRemote(): Promise<number> {
    let amount = 0;
    for (const item of INBOX_MESSAGES) if (item.credits > 0) amount += (await this.claimRemote(item.id)).amount;
    return amount;
  }

  public deleteRead(): void { this.save.update((state) => { const userId = state.currentUserId; if (!userId) return; INBOX_MESSAGES.forEach((item) => { const value = state.playerData[userId].mail[item.id] ?? { read: false, claimed: false, deleted: false }; if (value.read && (item.credits === 0 || value.claimed)) state.playerData[userId].mail[item.id] = { ...value, deleted: true }; }); }); }
}
