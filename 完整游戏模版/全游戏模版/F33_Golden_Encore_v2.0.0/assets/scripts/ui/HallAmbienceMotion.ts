import { KEEPER_RIGS } from './KeeperGesture';
import { protectionOpacity, type ClearRect } from './KeeperClearance';
import type { HallMode } from './HallFortuneMotion';

/** All coordinates belong to the generated 1024×1536 room, not the viewport.
 * Only the established room hardware glows; no new frame or painted particle. */
export type HallGlowKind = 'lantern' | 'treasure' | 'arch' | 'reflection' | 'mote';
export type HallGlowFixture = { kind: HallGlowKind; x: number; y: number; width: number; height: number; phase: number };
export type HallAmbientPose = { x: number; y: number; scaleX: number; scaleY: number; angle: number; alpha: number };
export const HALL_LIGHT_CORE = [96, 180, 324, 188] as const;
export const HALL_AMBIENCE_PROFILES = [
  { period: 4.8, lift: 188, tint: '#FFE7A5', treasure: [[364, 687, 88, 45], [446, 734, 72, 34]] },
  { period: 5.4, lift: 174, tint: '#FFE1D3', treasure: [[410, 621, 106, 62], [328, 740, 70, 36]] },
  { period: 4.2, lift: 206, tint: '#FFD093', treasure: [[348, 677, 92, 50], [420, 737, 70, 34]] },
  { period: 5.8, lift: 178, tint: '#E6F4CF', treasure: [[240, 669, 78, 46], [872, 680, 64, 40]] },
] as const;
const pose = (): HallAmbientPose => ({ x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0, alpha: 0 });
const TAU = Math.PI * 2;
const smooth = (n: number): number => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
const cycle = (n: number): number => n - Math.floor(n);
const envelope = (t: number): number => smooth(t / .16) * smooth((1 - t) / .26);
export const HALL_AMBIENT_COIN_SIZE = 32;
export const HALL_AMBIENT_COIN_COUNT = 8;

export class HallAmbienceMotion {
  readonly fixtures: readonly HallGlowFixture[];
  readonly glows: HallAmbientPose[];
  readonly coins = Array.from({ length: HALL_AMBIENT_COIN_COUNT }, pose);
  private readonly clearance: readonly ClearRect[];
  private time = 0;
  private paused = false;
  constructor(readonly mode: HallMode, readonly reduced = false) {
    const fixture = (kind: HallGlowKind, x: number, y: number, width: number, height: number, phase: number): HallGlowFixture => ({ kind, x, y, width, height, phase });
    this.fixtures = [
      fixture('lantern', 198, 394, 66, 40, 0), fixture('lantern', 826, 394, 66, 40, .43),
      fixture('lantern', 92, 318, 70, 82, .25), fixture('lantern', 930, 318, 70, 82, .71),
      ...HALL_AMBIENCE_PROFILES[mode].treasure.map(([x,y,w,h], i) => fixture('treasure', x,y,w,h,.17 + i*.38)),
      fixture('arch', 228, 518, 58, 40, .08), fixture('arch', 884, 518, 58, 40, .58),
      fixture('arch', 166, 710, 56, 38, .34), fixture('arch', 864, 710, 56, 38, .84),
      // Exposed water just below the hero, not beneath the opaque mode plaque.
      fixture('reflection', 302, 792, 180, 13, .13), fixture('reflection', 721, 798, 170, 12, .64),
      fixture('reflection', 512, 800, 184, 10, .36),
      fixture('reflection', 214, 952, 100, 12, .19), fixture('reflection', 810, 952, 100, 12, .72),
      ...Array.from({length: 8}, (_,i) => fixture('mote', i < 4 ? 168 + i * 23 : 885 - (i - 4) * 5,
        500 + (i % 4) * 64, 13 + (i % 3) * 3, 11 + (i % 3) * 2, i * .137)),
    ];
    this.glows = this.fixtures.map(pose);
    // Protect the entire keeper, not merely its face. The current mode owns the
    // light field, including during the room's composited crossfade.
    this.clearance = [KEEPER_RIGS.hall[mode].bounds];
    this.write();
  }
  step(dt: number): void {
    if (this.paused || this.reduced) return;
    this.time += Number.isFinite(dt) ? Math.max(0, Math.min(.1, dt)) : 0;
    this.write();
  }
  suspend(): void { this.paused = true; }
  resume(): void { this.paused = false; }
  private write(): void {
    const profile = HALL_AMBIENCE_PROFILES[this.mode];
    for (let i = 0; i < this.fixtures.length; i++) {
      const f = this.fixtures[i], p = this.glows[i];
      const t = cycle(this.time / (profile.period + i % 3 * .38) + f.phase);
      const wave = Math.sin(t * TAU), shimmer = Math.sin(t * Math.PI) ** 4;
      p.x = f.x; p.y = f.y; p.scaleX = 1; p.scaleY = 1; p.angle = 0;
      if (this.reduced) { p.alpha = f.kind === 'lantern' ? 38 : 0; continue; }
      if (f.kind === 'lantern') {
        // Slow variation, never a strobe or a whole lantern deforming.
        p.alpha = 66 + 110 * (.5 + .5 * wave) + 10 * Math.sin(t * TAU * 3);
        p.scaleX = p.scaleY = .94 + .09 * (.5 + .5 * wave);
      } else if (f.kind === 'treasure') {
        p.alpha = 230 * shimmer; p.scaleX = .82 + .35 * shimmer; p.scaleY = .94 + .12 * shimmer;
      } else if (f.kind === 'arch') {
        p.x += (i % 2 ? -1 : 1) * 10 * wave; p.y -= 16 * wave;
        p.alpha = 215 * shimmer; p.scaleX = .86 + .2 * shimmer;
      } else if (f.kind === 'reflection') {
        p.x += 14 * wave; p.y += 3 * Math.sin(t * TAU + .4);
        p.scaleX = .7 + .65 * (.5 + .5 * wave); p.scaleY = .65 + .3 * (.5 + .5 * wave);
        p.alpha = 50 + 95 * (.5 + .5 * Math.sin(t * TAU + .7));
      } else {
        p.x += 7 * Math.sin(t * TAU); p.y -= 34 * t;
        p.alpha = 205 * envelope(t); p.scaleX = p.scaleY = .7 + .4 * shimmer;
      }
      p.alpha *= protectionOpacity(this.clearance, p.x, p.y, f.width*p.scaleX*.5, f.height*p.scaleY*.5, 16);
    }
    for (let i = 0; i < this.coins.length; i++) {
      const p = this.coins[i], side = i < 4 ? -1 : 1, index = i % 4;
      const t = cycle(this.time / profile.period + index * .245 + (side > 0 ? .11 : 0));
      // A gold stream follows the two side terraces, not the middle UI column.
      p.x = 512 + side * (344 + Math.sin(t * Math.PI) * (18 + index*2)) + side * Math.sin(t*TAU + index)*6;
      p.y = 807 - t * profile.lift;
      p.scaleY = .76 + .14 * Math.sin(t * Math.PI);
      p.scaleX = p.scaleY * (.32 + .68 * (.5 + .5 * Math.cos(t*TAU*2 + index)));
      p.angle = side * (18 + 64*t);
      p.alpha = this.reduced ? 0 : 215 * envelope(t);
      p.alpha *= protectionOpacity(this.clearance, p.x, p.y, HALL_AMBIENT_COIN_SIZE*p.scaleX*.72,
        HALL_AMBIENT_COIN_SIZE*p.scaleY*.72, 18);
    }
  }
}
