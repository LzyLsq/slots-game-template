import { SaveService, type PlayerRecord } from './SaveService';

export class PlayerProfileService {
  public constructor(private readonly save: SaveService) {}
  public current(): PlayerRecord | undefined { const id = this.save.read().currentUserId; return id ? this.save.read().players[id] : undefined; }
  public setNickname(nickname: string): boolean {
    const value = nickname.trim(); const id = this.save.read().currentUserId;
    if (!id || value.length < 2 || value.length > 18) return false;
    this.save.update((state) => { state.players[id].nickname = value; }); return true;
  }
  public setAvatar(index: number): boolean {
    const id = this.save.read().currentUserId;
    if (!id || !Number.isSafeInteger(index) || index < 0 || index > 11) return false;
    this.save.update((state) => { state.players[id].avatar = index; }); return true;
  }
  public updateSettings(settings: Partial<PlayerRecord['settings']>): void {
    const id = this.save.read().currentUserId; if (!id) return;
    const allowed: Partial<PlayerRecord['settings']> = {};
    if (typeof settings.music === 'boolean') allowed.music = settings.music;
    if (typeof settings.sound === 'boolean') allowed.sound = settings.sound;
    if (typeof settings.vibration === 'boolean') allowed.vibration = settings.vibration;
    if (settings.quality === 'low' || settings.quality === 'medium' || settings.quality === 'high') allowed.quality = settings.quality;
    if (settings.language === 'en' || settings.language === 'zh-CN') allowed.language = settings.language;
    this.save.update((state) => { state.players[id].settings = { ...state.players[id].settings, ...allowed }; });
  }
  public recordSpin(win: number): void {
    const id = this.save.read().currentUserId; if (!id || !Number.isFinite(win) || win < 0) return;
    this.save.update((state) => { const player = state.players[id]; player.gamesPlayed += 1; player.totalWin += Math.floor(win); player.biggestWin = Math.max(player.biggestWin, Math.floor(win)); player.experience += 10; player.level = 1 + Math.floor(player.experience / 100); });
  }
}
