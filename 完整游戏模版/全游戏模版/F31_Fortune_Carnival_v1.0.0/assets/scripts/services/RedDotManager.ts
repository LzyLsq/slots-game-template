import { ACHIEVEMENTS } from './AchievementService';
import { INBOX_MESSAGES } from './MailService';
import { SaveService } from './SaveService';

export class RedDotManager {
  public constructor(private readonly save: SaveService) {}
  public mail(): number { const mail = this.save.currentScope()?.mail ?? {}; return INBOX_MESSAGES.filter((item) => !mail[item.id]?.read && !mail[item.id]?.deleted).length; }
  public achievements(): number { const achievements = this.save.currentScope()?.achievements ?? {}; return ACHIEVEMENTS.filter((item) => { const state = achievements[item.id]; return state && state.progress >= item.target && !state.claimed; }).length; }
  public rewards(today: string): number { return (this.save.currentScope()?.checkIn.lastClaimDate === today ? 0 : 1) + this.achievements(); }
}
