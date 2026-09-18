import { AchievementService } from '../services/AchievementService';
import { EconomyService } from '../services/EconomyService';
import { LocalAuthService } from '../services/LocalAuthService';
import { RemoteAuthService } from '../services/RemoteAuthService';
import { ProductionApiClient } from '../services/ProductionApiClient';
import type { AuthService } from '../services/AuthService';
import { MailService } from '../services/MailService';
import { PlayerProfileService } from '../services/PlayerProfileService';
import { RankService } from '../services/RankService';
import { RedDotManager } from '../services/RedDotManager';
import { CheckInService, RewardService, WheelService } from '../services/RewardService';
import { SaveService } from '../services/SaveService';
import { StoreService } from '../services/StoreService';

export class GameBootstrap {
  public readonly profile: PlayerProfileService;
  public readonly economy: EconomyService;
  public readonly auth: AuthService;
  public readonly api?: ProductionApiClient;
  public readonly remoteMode: boolean;
  public readonly store: StoreService;
  public readonly rank: RankService;
  public readonly rewards: RewardService;
  public readonly checkIn: CheckInService;
  public readonly wheel: WheelService;
  public readonly mail: MailService;
  public readonly achievements: AchievementService;
  public readonly redDots: RedDotManager;

  public constructor(public readonly save = new SaveService(), debugPurchases = false, apiBaseUrl?: string) {
    this.api = apiBaseUrl ? new ProductionApiClient(apiBaseUrl) : undefined; this.remoteMode = Boolean(this.api); this.profile = new PlayerProfileService(save, this.api); this.economy = new EconomyService(save, this.profile); this.mail = new MailService(save, this.economy, this.api); this.auth = this.api ? new RemoteAuthService(save, this.api, async()=>{await this.mail.synchronizeRemote();}) : new LocalAuthService(save); this.rank = new RankService(this.api, save);
    this.store = new StoreService(save, this.economy, debugPurchases, this.api); this.rewards = new RewardService(save, this.economy); this.checkIn = new CheckInService(save, this.economy);
    this.wheel = new WheelService(save, this.economy); this.achievements = new AchievementService(save, this.economy); this.redDots = new RedDotManager(save);
    if (this.profile.current()) { this.economy.recoverPending(); this.wheel.recoverPending(); }
  }

  public async resumeSession(): Promise<boolean> {
    const state=this.save.read(),current=state.currentUserId?state.players[state.currentUserId]:undefined;
    if(!state.rememberLogin&&!current?.isGuest)return false;
    const result=await this.auth.resume();return result.ok;
  }
}
