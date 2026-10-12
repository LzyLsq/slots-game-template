import type { KeeperCue, KeeperMode, KeeperScene } from './KeeperGesture';
import { CAST_ATLAS, castBank } from './CastArt';
export const MASCOT_ART = ['mascot-otter-motion', 'mascot-rabbit-motion', 'mascot-fox-motion', 'mascot-dragon-motion'] as const;
export const MASCOT_ATLAS = { columns: 8, rows: 8, width: 256, height: 320, frames: 64 } as const;
export const MASCOT_FPS = 30;
export type MascotScene = KeeperScene | 'loading';
/** Scene-specific, actually different baked gestures. New cues wait for a neutral
 * seam; they never restart a moving wrist or speed up a friendly character.
 * No scene graph, randomness, economics, input routing or allocations here. */
export class KeeperSequence {
  private elapsed = 0;
  private idle = 0;
  private playing = false;
  private suspended = false;
  private waitingForFirstGreeting = true;
  private pending?: KeeperCue;
  private bank = 0;
  action: KeeperCue = 'greet';
  frame = 0;
  readonly restSeconds: number;
  readonly initialRestSeconds: number;
  constructor(readonly scene: MascotScene, readonly mode: KeeperMode, readonly reduced = false) {
    this.restSeconds = (scene === 'loading' ? 1 : scene === 'prize' ? 3.6 : scene === 'hall' ? 1.58 : 1.9) + mode * .12;
    this.initialRestSeconds = (scene === 'loading' ? .12 : scene === 'prize' ? 2.8 : scene === 'hall' ? .20 : .24) + mode * .08;
  }
  private get roleCast(): boolean { return this.scene === 'cabinet' || this.scene === 'prize'; }
  cue(cue: KeeperCue): void {
    if (this.suspended || this.reduced) return;
    if (this.playing) {
      // A single priority slot, never an unbounded command queue. Repeated
      // gestures do not replay; an award supersedes a waiting spin/greeting.
      if (this.scene === 'hall' && cue === 'greet') this.pending = 'greet';
      else if (cue !== this.action && cue !== 'greet') {
        const priority = { greet: 0, spin: 1, ordinary: 2, big: 3, super: 4 };
        if (!this.pending || priority[cue] >= priority[this.pending]) this.pending = cue;
      }
      return;
    }
    this.waitingForFirstGreeting = false; this.action = cue;
    this.bank = castBank(this.scene, cue); this.playing = true;
    this.elapsed = 0; this.idle = 0; this.frame = this.bank * CAST_ATLAS.bankFrames;
  }
  suspend(): void { this.suspended = true; }
  resume(): void { this.suspended = false; }
  step(dt: number): number {
    if (this.suspended || this.reduced) return this.frame;
    const delta = Number.isFinite(dt) ? Math.min(.05, Math.max(0, dt)) : 0;
    if (this.playing) {
      const count = this.roleCast ? CAST_ATLAS.bankFrames : MASCOT_ATLAS.frames;
      const fps = this.roleCast ? CAST_ATLAS.fps : MASCOT_FPS;
      this.elapsed += delta;
      this.frame = (this.roleCast ? this.bank * count : 0) + Math.min(count - 1, Math.floor(this.elapsed * fps));
      if (this.elapsed >= count / fps) {
        this.playing = false; this.frame = 0; this.idle = 0;
        if (this.pending) { const next = this.pending; this.pending = undefined; this.cue(next); }
      }
    } else {
      this.idle += delta;
      const delay = this.waitingForFirstGreeting ? this.initialRestSeconds : this.restSeconds;
      if (this.idle >= delay) this.cue(this.scene === 'prize' ? this.action : 'greet');
    }
    return this.frame;
  }
}
