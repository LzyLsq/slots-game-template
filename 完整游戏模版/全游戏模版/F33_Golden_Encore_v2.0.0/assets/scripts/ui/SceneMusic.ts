/** Scene scoring with two owned, reusable voices. No Cocos dependency: loading,
 * gesture unlock and lifetime are provided by the view, routing/mixing is tested. */
export const MUSIC_TRACKS = {
  welcome: { asset: 'welcome-foyer', volume: .20, bpm: 90 },
  hall: { asset: 'lantern-house-theme', volume: .23, bpm: 112 },
  jade: { asset: 'jade-ferry-flow', volume: .22, bpm: 104 },
  pearl: { asset: 'pearl-garden-bloom', volume: .21, bpm: 96 },
  ember: { asset: 'ember-foundry-groove', volume: .22, bpm: 118 },
  dragon: { asset: 'celestial-vault-ceremony', volume: .22, bpm: 102 },
  treasury: { asset: 'treasury-interlude', volume: .20, bpm: 108 },
  quiet: { asset: 'ledger-interlude', volume: .17, bpm: 98 },
} as const;
export type MusicScene = keyof typeof MUSIC_TRACKS;
export interface MusicVoice<T> {
  clip: T | null; loop: boolean; volume: number;
  play(): void; pause(): void; stop(): void;
}
export function musicScene(page: string, mode: number, rulesReturn = 'home'): MusicScene {
  if (page === 'login' || page === 'loading') return 'welcome';
  if (page === 'game' || page === 'rules' && rulesReturn === 'game')
    return (['jade', 'pearl', 'ember', 'dragon'] as const)[mode] ?? 'jade';
  if (page === 'home') return 'hall';
  if (page === 'store' || page === 'rewards' || page === 'atlas') return 'treasury';
  return 'quiet';
}
type Slot<T> = { voice: MusicVoice<T>; scene?: MusicScene; requested: boolean; gain: number; from: number; to: number; elapsed: number; duration: number; position: number };
export class SceneMusic<T> {
  private slots: Slot<T>[] = [];
  private clips: Partial<Record<MusicScene, T>> = {};
  private unavailable = new Set<MusicScene>();
  private desired: MusicScene = 'welcome';
  private active = -1;
  private audible = false;
  private ducked = false;
  private pending?: { scene: MusicScene; remaining: number };
  bind(voices: readonly MusicVoice<T>[]): void {
    this.stopAll();
    this.slots = voices.slice(0, 2).map(voice => ({ voice, requested: false, gain: 0, from: 0, to: 0, elapsed: 0, duration: 0, position: 0 }));
    for (const { voice } of this.slots) { voice.loop = true; voice.volume = 0; }
    this.reconcile();
  }
  setClip(scene: MusicScene, clip: T): void { this.clips[scene] = clip; this.unavailable.delete(scene); this.reconcile(); }
  markUnavailable(scene: MusicScene): void { this.unavailable.add(scene); this.reconcile(); }
  select(scene: MusicScene): void { this.desired = scene; this.reconcile(); }
  setAudible(value: boolean): void {
    if (this.audible === value) return;
    this.audible = value;
    if (!value) {
      for (const slot of this.slots) {
        if (slot.requested) slot.voice.pause();
        slot.requested = false; slot.gain = slot.from = slot.to = 0; slot.voice.volume = 0;
      }
      this.active = -1; this.pending = undefined;
    } else this.reconcile();
  }
  setDucked(value: boolean): void {
    if (this.ducked === value) return;
    this.ducked = value;
    this.slots.forEach((slot, i) => {
      if (slot.requested) this.ramp(slot, i === this.active ? this.level(slot.scene!) : 0, value ? .2 : .55);
    });
  }
  update(dt: number): void {
    if (!this.audible || !Number.isFinite(dt) || dt <= 0) return;
    if (this.pending) {
      const wait = Math.min(dt, this.pending.remaining);
      this.advance(wait); this.pending.remaining -= wait; dt -= wait;
      if (this.pending.remaining <= 1e-6) {
        const scene = this.pending.scene; this.pending = undefined; this.startScene(scene);
      }
    }
    this.advance(dt);
  }
  private advance(dt: number): void {
    for (const slot of this.slots) {
      if (!slot.requested) continue;
      slot.position += dt;
      slot.elapsed = Math.min(slot.duration, slot.elapsed + dt);
      const t = slot.duration > 0 ? slot.elapsed / slot.duration : 1;
      const eased = .5 - .5 * Math.cos(Math.PI * t);
      slot.gain = t === 1 ? slot.to : slot.from + (slot.to - slot.from) * eased;
      slot.voice.volume = Math.max(0, Math.min(.3, slot.gain));
      if (t === 1 && slot.to === 0) { slot.voice.stop(); slot.requested = false; slot.scene = undefined; slot.position = 0; }
    }
  }
  stopAll(): void {
    for (const slot of this.slots) { slot.voice.stop(); slot.requested = false; slot.scene = undefined; slot.gain = slot.from = slot.to = 0; slot.voice.volume = 0; }
    this.active = -1; this.pending = undefined;
  }
  get snapshot() {
    return { desired: this.desired, audible: this.audible, ducked: this.ducked, pending: this.pending?.scene ?? null,
      voices: this.slots.map(slot => ({ scene: slot.scene, requested: slot.requested, volume: slot.voice.volume, target: slot.to })) };
  }
  private level(scene: MusicScene): number { return MUSIC_TRACKS[scene].volume * (this.ducked ? .4 : 1); }
  private ramp(slot: Slot<T>, to: number, seconds: number): void {
    slot.from = slot.gain; slot.to = to; slot.elapsed = 0; slot.duration = seconds;
  }
  private reconcile(): void {
    if (!this.audible || !this.slots.length) return;
    const scene = this.clips[this.desired] ? this.desired : this.unavailable.has(this.desired)
      ? (['hall', 'welcome', 'quiet'] as const).find(key => this.clips[key]) : undefined;
    if (!scene) { this.pending = undefined; return; } // keep current music while an optional lazy resource loads
    const current = this.slots[this.active];
    if (current?.scene === scene && current.requested) { this.pending = undefined; return; } // render/gesture cannot queue a second play
    if (this.pending?.scene === scene) return;
    // UI responds immediately; music waits at most one half-beat (334 ms).
    // This owned clock pauses in the background and does not seek the engine.
    if (current?.requested && current.scene) {
      const subdivision = 30 / MUSIC_TRACKS[current.scene].bpm;
      const phase = current.position % subdivision;
      const wait = phase < .012 ? 0 : subdivision - phase;
      if (wait > .012) { this.pending = { scene, remaining: wait }; return; }
    }
    this.pending = undefined; this.startScene(scene);
  }
  private startScene(scene: MusicScene): void {
    let index = this.slots.findIndex(slot => slot.scene === scene);
    if (index < 0) index = this.slots.reduce((lowest, slot, i) => slot.gain < this.slots[lowest].gain ? i : lowest, 0);
    const next = this.slots[index];
    if (next.scene !== scene) { next.voice.stop(); next.voice.clip = this.clips[scene]!; next.scene = scene; next.requested = false; next.gain = 0; next.position = 0; }
    if (!next.requested) { next.voice.volume = next.gain; next.voice.loop = true; next.requested = true; next.voice.play(); }
    this.active = index;
    this.ramp(next, this.level(scene), .95);
    this.slots.forEach((slot, i) => { if (i !== index && slot.requested) this.ramp(slot, 0, .40); });
  }
}
