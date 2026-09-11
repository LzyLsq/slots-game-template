import { EconomyService } from './EconomyService';
import { SaveService } from './SaveService';

export interface MailItem { id: string; title: string; body: string; credits: number; kind: 'system' | 'reward'; }
export const INBOX_MESSAGES: readonly MailItem[] = [
  { id: 'welcome', title: 'Welcome aboard Gilded Express', body: 'Your new-player virtual coin gift is attached.', credits: 5_000, kind: 'reward' },
  { id: 'maintenance', title: 'Railway Notice', body: 'Service notices and railway updates will appear here.', credits: 0, kind: 'system' },
  { id: 'weekend', title: 'Weekend Gold Shower', body: 'Claim a virtual-credit bonus.', credits: 3_000, kind: 'reward' },
];
export class MailService {
  public constructor(private readonly save: SaveService, private readonly economy: EconomyService) {}
  public state(id: string): { read: boolean; claimed: boolean; deleted: boolean } { return this.save.currentScope()?.mail[id] ?? { read: false, claimed: false, deleted: false }; }
  public read(id: string): void { this.save.update((state) => { const userId = state.currentUserId; if (userId) state.playerData[userId].mail[id] = { ...state.playerData[userId].mail[id], read: true, claimed: state.playerData[userId].mail[id]?.claimed ?? false, deleted: state.playerData[userId].mail[id]?.deleted ?? false }; }); }
  public claim(id: string): boolean {
    const mail = INBOX_MESSAGES.find((item) => item.id === id); const current = this.state(id);
    if (!mail || mail.credits <= 0 || current.claimed || current.deleted || !this.economy.credit(mail.credits, 'mail', `mail:${id}`)) return false;
    this.save.update((state) => { const userId = state.currentUserId; if (userId) state.playerData[userId].mail[id] = { ...current, read: true, claimed: true }; }); return true;
  }
  public claimAll(): number { return INBOX_MESSAGES.reduce((sum, item) => sum + (this.claim(item.id) ? item.credits : 0), 0); }
  public deleteRead(): void { this.save.update((state) => { const userId = state.currentUserId; if (!userId) return; INBOX_MESSAGES.forEach((item) => { const value = state.playerData[userId].mail[item.id] ?? { read: false, claimed: false, deleted: false }; if (value.read) state.playerData[userId].mail[item.id] = { ...value, deleted: true }; }); }); }
}
