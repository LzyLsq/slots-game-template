import { LoadingProgress } from './LoadingProgress';
export type EntryMode = 0 | 1 | 2 | 3;
/** Generated scene/brand/symbol art belongs to the selected room. Never use a
 * cabinet, another room's animal or a full-screen prize as the loading plate. */
export const MODE_ENTRY_THEMES = [
  { scene: 'hero-otter-ferry', title: 'title-jade-ferry-wide', emblem: 'reel-jade-lantern', preparing: 'Lighting the ferry lanterns…', entering: 'Your jade voyage is ready', tint: '#FFE8AD', period: 2.6 },
  { scene: 'hero-pearl-garden', title: 'title-pearl-garden-wide', emblem: 'reel-pearl-lotus', preparing: 'Opening the pearl garden…', entering: 'The lotus garden welcomes you', tint: '#FFF0DA', period: 3.1 },
  { scene: 'hero-ember-foundry', title: 'title-ember-foundry-wide', emblem: 'reel-ember-ingots', preparing: 'Warming the golden foundry…', entering: 'The golden forge is ready', tint: '#FFD282', period: 2.2 },
  { scene: 'hero-celestial-vault', title: 'title-celestial-vault-wide', emblem: 'reel-vault-orb', preparing: 'Awakening the dragon vault…', entering: 'The dragon opens the treasury', tint: '#E2F2D1', period: 3.5 },
] as const;
export const MODE_ENTRY_WORK = ['cabinet', 'symbols', 'keeper', 'celebration'] as const;
export type EntryWork = typeof MODE_ENTRY_WORK[number];
export type EntryPhase = 'preparing' | 'entering' | 'complete' | 'failed' | 'cancelled';
export const MODE_ENTRY_MINIMUM = 2.05;
export const MODE_ENTRY_READY_HOLD = .36;
export type EntryEmblemPose = { x: number; y: number; angle: number; glintX: number; glintY: number; glintAlpha: number };
/** The bar measures completed prerequisites ONLY. A cache hit fills it and shows
 * the explicit entering caption; the welcome animation is not fake load work.
 * Elapsed time advances only while visible, and the owner gates final navigation. */
export class ModeEntryLoading {
  readonly progress: LoadingProgress;
  readonly pose: EntryEmblemPose = { x: 0, y: 0, angle: 0, glintX: 25, glintY: 25, glintAlpha: 0 };
  private completed = new Set<EntryWork>();
  private suspended = false;
  private time = 0;
  private readyAt = -1;
  phase: EntryPhase = 'preparing';
  constructor(readonly mode: EntryMode, readonly reduced = false) { this.progress = new LoadingProgress(reduced); this.writePose(); }
  get elapsed(): number { return this.time; }
  get completedWork(): number { return this.completed.size; }
  get terminal(): boolean { return this.phase === 'complete' || this.phase === 'failed' || this.phase === 'cancelled'; }
  completeWork(work: EntryWork): void {
    if (this.terminal || !MODE_ENTRY_WORK.includes(work) || this.completed.has(work)) return;
    this.completed.add(work); this.progress.advance(this.completed.size / MODE_ENTRY_WORK.length);
    if (this.completed.size === MODE_ENTRY_WORK.length) {
      this.readyAt = this.time; this.phase = 'entering'; this.progress.complete();
    }
  }
  fail(): void { if (!this.terminal) this.phase = 'failed'; }
  cancel(): void { this.phase = 'cancelled'; }
  suspend(): void { this.suspended = true; }
  resume(): void { this.suspended = false; }
  step(dt: number): void {
    if (this.suspended || this.terminal || !Number.isFinite(dt) || dt <= 0) return;
    // Ignore long background/stall deltas rather than skipping the visible show.
    const delta = Math.min(.1, dt); this.time += delta; this.progress.step(delta); this.writePose();
    if (this.phase === 'preparing' && this.time >= 18) { this.fail(); return; }
    if (this.phase === 'entering' && this.time >= (this.reduced ? .24 : MODE_ENTRY_MINIMUM)
      && this.time - this.readyAt >= (this.reduced ? .12 : MODE_ENTRY_READY_HOLD) && this.progress.value === 1) this.phase = 'complete';
  }
  private writePose(): void {
    const pose = this.pose;
    if (this.reduced) { pose.x = pose.y = pose.angle = 0; pose.glintAlpha = 115; return; }
    const t = this.time / MODE_ENTRY_THEMES[this.mode].period * Math.PI * 2;
    // Tide drift, lotus sway, a grounded ingot gleam and an orbital dragon seal
    // are deliberately not four copies of a rotating coin or bouncing mascot.
    if (this.mode === 0) { pose.x = 6 * Math.sin(t); pose.y = 3 * Math.sin(t * 2); pose.angle = 2 * Math.sin(t); }
    else if (this.mode === 1) { pose.x = 2 * Math.sin(t); pose.y = 5 * Math.sin(t); pose.angle = 5 * Math.sin(t); }
    else if (this.mode === 2) { pose.x = 0; pose.y = 1.5 * Math.sin(t); pose.angle = 0; }
    else { pose.x = 3 * Math.cos(t); pose.y = 4 * Math.sin(t); pose.angle = -3 * Math.sin(t); }
    pose.glintX = 26 * Math.cos(t + this.mode * .7); pose.glintY = 22 * Math.sin(t + this.mode * .7);
    pose.glintAlpha = 65 + 170 * Math.pow((Math.sin(t * 1.5) + 1) / 2, 3);
  }
}
/** Header/footer have viewport-owned safe margins; the actor and all scene
 * lighting remain registered to their source backdrop, not these UI fixtures. */
export function modeEntryLayout(logicalHeight: number): { titleY: number; panelY: number; tipY: number } {
  const half = logicalHeight / 2;
  const panelY = -Math.min(680, half - 156);
  return { titleY: Math.min(820, half - 160), panelY, tipY: panelY - 122 };
}
