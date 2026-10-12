/** Tactile UI feedback. Confirmation is requested by accepted actions, not hit boxes.
 * Two owned voices let a short contact finish without an unbounded one-shot pool. */
export const INTERACTION_SOUNDS = {
  tap: 'ui-jade-tap', betUp: 'ui-gold-step', betDown: 'ui-gold-step-down',
  settle: 'ui-room-settle', enter: 'ui-room-enter', blocked: 'ui-soft-limit',
} as const;
export type InteractionSound = keyof typeof INTERACTION_SOUNDS;
export interface InteractionVoice<T> { clip: T | null; loop: boolean; volume: number; play(): void; stop(): void; }
const LEVEL: Record<InteractionSound, number> = { tap: .26, betUp: .29, betDown: .27, settle: .28, enter: .32, blocked: .18 };
export class InteractionAudio<T> {
  private clips: Partial<Record<InteractionSound, T>> = {};
  private voices: InteractionVoice<T>[] = [];
  private audible = false;
  private lastAt = -Infinity;
  private lastKind?: InteractionSound;
  private cursor = 0;
  private played = 0;
  bind(clips: Partial<Record<InteractionSound, T>>, voices: readonly InteractionVoice<T>[]): void {
    this.stopAll(); this.clips = clips; this.voices = voices.slice(0, 2);
  }
  setAudible(value: boolean): void { this.audible = value; if (!value) this.stopAll(); }
  play(kind: InteractionSound = 'tap', now = Date.now()): boolean {
    if (!this.audible || !Number.isFinite(now)) return false;
    // Never mask a meaningful accepted direction with the preceding neutral tap.
    if (now - this.lastAt < (kind === this.lastKind ? 75 : 35)) return false;
    const clip = this.clips[kind], voice = this.voices[this.cursor % this.voices.length];
    if (!clip || !voice) return false;
    this.lastAt = now; this.lastKind = kind; this.cursor++; this.played++;
    voice.stop(); voice.clip = clip; voice.loop = false; voice.volume = LEVEL[kind]; voice.play(); return true;
  }
  get snapshot() { return { audible: this.audible, lastKind: this.lastKind ?? null, played: this.played, voices: this.voices.length }; }
  stopAll(): void { for (const voice of this.voices) voice.stop(); this.lastAt = -Infinity; this.lastKind = undefined; }
}
