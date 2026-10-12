/** Quiet machine foley follows accepted spin/reel events, never changes outcomes. */
export const GAMEPLAY_SOUNDS = {
  roll: 'reel-silk-roll', stop0: 'reel-stop-0', stop1: 'reel-stop-1', stop2: 'reel-stop-2',
  stop3: 'reel-stop-3', stop4: 'reel-stop-4', feature: 'feature-lantern-rise',
} as const;
export const ROOM_GAMEPLAY_SOUNDS = [0, 1, 2, 3].map(mode => ({
  ...GAMEPLAY_SOUNDS, launch: mode === 0 ? 'ui-spin-launch' : `cabinet-${mode}-launch`,
  ...(mode === 0 ? {} : { roll: `cabinet-${mode}-roll`, feature: `cabinet-${mode}-feature`,
    ...Object.fromEntries([0,1,2,3,4].map(column => [`stop${column}`, `cabinet-${mode}-stop-${column}`])) }),
}));
export type GameplaySound = keyof typeof GAMEPLAY_SOUNDS | 'launch';
export interface GameplayVoice<T> { clip: T | null; loop: boolean; volume: number; play(): void; stop(): void; }
export class GameplayAudio<T> {
  private audible = false;
  private running = false;
  private stopped = new Set<number>();
  private lastStop = -Infinity;
  private clips: Partial<Record<GameplaySound, T>> = {};
  private voices: GameplayVoice<T>[] = [];
  private mode = 0;
  private roomClips: readonly Partial<Record<GameplaySound, T>>[] = [];
  bind(clips: Partial<Record<GameplaySound, T>>, voices: readonly GameplayVoice<T>[], roomClips: readonly Partial<Record<GameplaySound, T>>[] = []): void {
    this.stopAll(); this.clips = clips; this.voices = voices.slice(0, 3); this.roomClips = roomClips;
  }
  setAudible(value: boolean): void { this.audible = value; if (!value) this.stopAll(); }
  /** Call only after a persisted debit. A held re-spin never charges/launches again. */
  begin(rolling = true, mode = 0, accepted = false): void {
    this.mode = Number.isInteger(mode) && mode >= 0 && mode < 4 ? mode : 0;
    this.stopReels(); this.running = true; this.stopped.clear(); this.lastStop = -Infinity;
    if (accepted) this.play('launch', 2, .30);
    if (rolling) this.play('roll', 0, .13, true);
  }
  columnStop(column: number, now = Date.now()): void {
    if (!this.running || !Number.isInteger(column) || column < 0 || column > 4 || this.stopped.has(column)) return;
    this.stopped.add(column);
    // Reduced motion may settle all columns in one frame; emit one soft finish,
    // not five notes replacing each other or a loud instantaneous chord.
    if (now - this.lastStop >= 65) { this.lastStop = now; this.play(`stop${column}` as GameplaySound, 1, .25); }
    const roll = this.voices[0]; if (roll) roll.volume = .13 * (1 - this.stopped.size / 6);
    if (this.stopped.size === 5) this.stopReels();
  }
  feature(): void { this.play('feature', 2, .30); }
  stopReels(): void { this.running = false; this.voices[0]?.stop(); }
  stopAll(): void { this.running = false; this.stopped.clear(); this.lastStop = -Infinity; for (const voice of this.voices) voice.stop(); }
  get snapshot() { return { audible: this.audible, running: this.running, mode: this.mode, stopped: Array.from(this.stopped) }; }
  private play(sound: GameplaySound, index: number, volume: number, loop = false): void {
    const voice = this.voices[index], clip = this.roomClips[this.mode]?.[sound] ?? this.clips[sound];
    if (!this.audible || !voice || !clip) return;
    voice.stop(); voice.clip = clip; voice.loop = loop; voice.volume = volume; voice.play();
  }
}
