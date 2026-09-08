import { SaveService, type PlayerRecord } from './SaveService';
import type { RemoteProfileUpdate, RemotePlayer } from './ProductionApiClient';

export interface ProfileServerClient {
  updateProfile(input: RemoteProfileUpdate): Promise<{ player: RemotePlayer }>;
}

export class PlayerProfileService {
  public constructor(private readonly save: SaveService, private readonly server?: ProfileServerClient) {}
  public current(): PlayerRecord | undefined { const id = this.save.read().currentUserId; return id ? this.save.read().players[id] : undefined; }
  public async setNickname(nickname: string): Promise<boolean> {
    const value = nickname.trim(); const id = this.save.read().currentUserId;
    if (!id || value.length < 2 || value.length > 18) return false;
    const previous = this.save.read().players[id].nickname; this.save.update((state) => { state.players[id].nickname = value; });
    return this.commit({ nickname: value }, () => this.save.update((state) => { if (state.players[id]) state.players[id].nickname = previous; }));
  }
  public async setAvatar(index: number): Promise<boolean> {
    const id = this.save.read().currentUserId;
    if (!id || !Number.isSafeInteger(index) || index < 0 || index > 11) return false;
    const previous = this.save.read().players[id].avatar; this.save.update((state) => { state.players[id].avatar = index; });
    return this.commit({ avatar: index }, () => this.save.update((state) => { if (state.players[id]) state.players[id].avatar = previous; }));
  }
  public async updateSettings(settings: Partial<PlayerRecord['settings']>): Promise<boolean> {
    const id = this.save.read().currentUserId; if (!id) return false;
    const allowed: Partial<PlayerRecord['settings']> = {};
    if (typeof settings.music === 'boolean') allowed.music = settings.music;
    if (typeof settings.sound === 'boolean') allowed.sound = settings.sound;
    if (typeof settings.vibration === 'boolean') allowed.vibration = settings.vibration;
    if (settings.quality === 'low' || settings.quality === 'medium' || settings.quality === 'high') allowed.quality = settings.quality;
    if (settings.language === 'en' || settings.language === 'zh-CN') allowed.language = settings.language;
    if (!Object.keys(allowed).length) return false;
    const previous = { ...this.save.read().players[id].settings }; this.save.update((state) => { state.players[id].settings = { ...state.players[id].settings, ...allowed }; });
    return this.commit({ settings: allowed }, () => this.save.update((state) => { if (state.players[id]) state.players[id].settings = previous; }));
  }
  public recordSpin(win: number): void {
    const id = this.save.read().currentUserId; if (!id || !Number.isFinite(win) || win < 0) return;
    this.save.update((state) => { const player = state.players[id]; player.gamesPlayed += 1; player.totalWin += Math.floor(win); player.biggestWin = Math.max(player.biggestWin, Math.floor(win)); player.experience += 10; player.level = 1 + Math.floor(player.experience / 100); });
  }

  private async commit(input: RemoteProfileUpdate, rollback: () => void): Promise<boolean> {
    if (!this.server) return true;
    try {
      const response = await this.server.updateProfile(input); const id = this.save.read().currentUserId;
      if (!id || response.player.id !== id) { rollback(); return false; }
      this.save.update((state) => { const player = state.players[id]; if (!player) return; player.nickname = response.player.nickname; player.avatar = response.player.avatar; player.settings = response.player.settings; });
      return true;
    } catch { rollback(); return false; }
  }
}
