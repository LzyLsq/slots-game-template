/** Reward presentation audio. Prepared clips and four owned, reusable voices;
 * unlike detached one-shots these can be stopped when an overlay is cancelled. */
export const REWARD_SOUNDS = {
  ordinary: 'reward-win-ordinary', big: 'reward-win-big', super: 'reward-win-super',
  open: 'reward-gift-open', coins: 'reward-coin-shower', counter: 'reward-counter',
  complete: 'reward-count-complete', collect: 'reward-collect',
} as const;
export type RewardSound = keyof typeof REWARD_SOUNDS;
export const ROOM_REWARD_SOUNDS = [0, 1, 2, 3].map(mode => ({ ordinary: `reward-${mode}-ordinary`, big: `reward-${mode}-big`, super: `reward-${mode}-super` }));
export type RewardTier = 'ordinary' | 'big' | 'super';
export const REWARD_CHANNELS = ['score', 'coins', 'counter', 'collect'] as const;
export type RewardChannel = typeof REWARD_CHANNELS[number];
export interface RewardVoice<T> {
  clip: T | null; loop: boolean; volume: number;
  play(): void; stop(): void;
}
const CHANNEL: Record<RewardSound, RewardChannel> = {
  ordinary: 'score', big: 'score', super: 'score', open: 'score',
  coins: 'coins', counter: 'counter', complete: 'counter', collect: 'collect',
};
const VOLUME: Record<RewardSound, number> = {
  ordinary: .36, big: .53, super: .56, open: .48,
  coins: .28, counter: .13, complete: .35, collect: .40,
};
// A counted amount should sound like a little tumble of coins, not a machine gun.
export const COUNTER_INTERVAL_MS = 170;
// One 780 ms shower plus a tiny release margin; a nearby finale must not
// stop/restart the previous shower halfway through its falling finish.
export const COIN_INTERVAL_MS = 800;
export class RewardAudio<T> {
  private audible = false;
  private counterAt = -Infinity;
  private coinsAt = -Infinity;
  private countResolved = false;
  private clips: Partial<Record<RewardSound, T>> = {};
  private roomClips: readonly Partial<Record<RewardTier, T>>[] = [];
  private voices: Partial<Record<RewardChannel, RewardVoice<T>>> = {};
  bind(clips: Partial<Record<RewardSound, T>>, voices: Record<RewardChannel, RewardVoice<T>>, roomClips: readonly Partial<Record<RewardTier, T>>[] = []): void {
    this.stopAll(); this.clips = clips; this.voices = voices; this.roomClips = roomClips;
  }
  setAudible(audible: boolean): void {
    this.audible = audible;
    if (!audible) this.stopAll(); // unmuting must not replay a past award
  }
  play(sound: RewardSound, now = Date.now(), mode?: number): boolean {
    if (!this.audible) return false;
    if (sound === 'counter' && (this.countResolved || now - this.counterAt < COUNTER_INTERVAL_MS)) return false;
    if (sound === 'coins' && now - this.coinsAt < COIN_INTERVAL_MS) return false;
    const tier = sound === 'ordinary' || sound === 'big' || sound === 'super';
    const clip = (tier && mode !== undefined ? this.roomClips[mode]?.[sound] : undefined) ?? this.clips[sound];
    const voice = this.voices[CHANNEL[sound]];
    if (!clip || !voice) return false; // optional audio never blocks settlement
    if (tier || sound === 'open') this.countResolved = false;
    if (sound === 'complete') this.countResolved = true;
    if (sound === 'counter') this.counterAt = now;
    if (sound === 'coins') this.coinsAt = now;
    voice.stop(); voice.clip = clip; voice.loop = false; voice.volume = VOLUME[sound]; voice.play();
    return true;
  }
  stopPresentation(): void {
    for (const channel of ['score', 'coins', 'counter'] as const) this.voices[channel]?.stop();
    this.counterAt = this.coinsAt = -Infinity; this.countResolved = false;
  }
  stopAll(): void {
    this.stopPresentation(); this.voices.collect?.stop();
  }
}
