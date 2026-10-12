/** A short, relaxed blink with long, scene/character-staggered rests.
 * Frame art changes only generated eyelids, never a face/whole-photo transform. */
export const BLINK_ATLAS = { columns: 5, frames: 20, fps: 30, gutter: 2 } as const;
export class BlinkSequence {
  frame = 0;
  private time = 0;
  private resting = 0;
  private playing = false;
  private suspended = false;
  private first = true;
  readonly initialRestSeconds: number;
  readonly restSeconds: number;
  constructor(readonly scene: string, readonly mode: number, readonly reduced = false) {
    this.initialRestSeconds = 1.35 + mode * .39 + (scene === 'cabinet' ? .23 : scene === 'prize' ? .57 : 0);
    this.restSeconds = 3.8 + mode * .47 + (scene === 'prize' ? .6 : scene === 'cabinet' ? .35 : 0);
  }
  suspend(): void { this.suspended = true; }
  resume(): void { this.suspended = false; }
  step(dt: number): number {
    if (this.suspended || this.reduced) return this.frame;
    const delta = Number.isFinite(dt) ? Math.min(.05, Math.max(0, dt)) : 0;
    if (!delta) return this.frame;
    if (this.playing) {
      this.time += delta;
      this.frame = Math.min(BLINK_ATLAS.frames - 1, Math.floor(this.time * BLINK_ATLAS.fps));
      if (this.time >= BLINK_ATLAS.frames / BLINK_ATLAS.fps) { this.playing = false; this.frame = 0; this.resting = 0; }
    } else {
      this.resting += delta;
      if (this.resting >= (this.first ? this.initialRestSeconds : this.restSeconds)) {
        this.playing = true; this.first = false; this.time = 0; this.resting = 0;
      }
    }
    return this.frame;
  }
}
