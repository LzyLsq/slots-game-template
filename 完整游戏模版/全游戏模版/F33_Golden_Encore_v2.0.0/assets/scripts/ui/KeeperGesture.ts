/** Source registration and legacy presentation math for treasure keepers.
 * Source-pixel registration never depends on the phone viewport. No RNG, wallet
 * writes, input-to-spin routing, timers or scene-graph allocations live here. */
export type KeeperMode = 0 | 1 | 2 | 3;
export type KeeperScene = 'hall' | 'cabinet' | 'prize';
export type KeeperCue = 'greet' | 'spin' | 'ordinary' | 'big' | 'super';
type Zone = readonly [number, number, number, number];
type Point = readonly [number, number];
export type KeeperRig = {
  head: Zone; arm: Zone; detail: Zone; headPivot: Point; armPivot: Point; detailPivot: Point;
  palm: Point; bounds: Zone; direction: -1 | 1; period: number;
};
// Bounds register the independent frame sprites and their clearance zones.
// Head/paw fields remain for legacy offering-clearance tests, not runtime UV deformation.
export const KEEPER_RIGS: Record<KeeperScene, readonly KeeperRig[]> = {
  cabinet: [
    { head: [243, 127, 93, 78], arm: [298, 201, 31, 36], detail: [123, 211, 54, 24], headPivot: [243, 187], armPivot: [277, 181], detailPivot: [169, 217], palm: [308, 187], bounds: [170, 8, 341, 274], direction: 1, period: 6.4 },
    { head: [736, 180, 72, 55], arm: [666, 213, 30, 33], detail: [790, 139, 95, 38], headPivot: [753, 221], armPivot: [690, 218], detailPivot: [741, 162], palm: [650, 200], bounds: [629, 8, 854, 274], direction: -1, period: 6.8 },
    { head: [258, 123, 74, 76], arm: [308, 198, 28, 34], detail: [146, 175, 65, 75], headPivot: [266, 180], armPivot: [292, 174], detailPivot: [189, 222], palm: [314, 185], bounds: [170, 8, 340, 274], direction: 1, period: 5.9 },
    { head: [742, 151, 89, 86], arm: [811, 237, 38, 31], detail: [899, 179, 56, 67], headPivot: [751, 218], armPivot: [783, 222], detailPivot: [868, 229], palm: [828, 216], bounds: [640, 8, 854, 274], direction: 1, period: 7.2 },
  ],
  prize: [
    { head: [211, 1047, 91, 86], arm: [303, 1145, 39, 42], detail: [98, 1222, 45, 51], headPivot: [214, 1110], armPivot: [272, 1135], detailPivot: [127, 1252], palm: [318, 1140], bounds: [170, 948, 474, 1318], direction: 1, period: 6.4 },
    { head: [813, 746, 81, 65], arm: [717, 846, 43, 45], detail: [851, 653, 67, 70], headPivot: [831, 793], armPivot: [761, 856], detailPivot: [822, 709], palm: [692, 831], bounds: [578, 580, 854, 1004], direction: -1, period: 6.8 },
    { head: [803, 732, 96, 74], arm: [736, 829, 45, 41], detail: [932, 938, 49, 106], headPivot: [822, 788], armPivot: [780, 842], detailPivot: [903, 1010], palm: [704, 815], bounds: [584, 580, 854, 1102], direction: -1, period: 5.9 },
    { head: [795, 807, 103, 104], arm: [723, 914, 40, 36], detail: [886, 940, 43, 65], headPivot: [812, 883], armPivot: [760, 937], detailPivot: [862, 989], palm: [698, 907], bounds: [578, 676, 854, 1032], direction: -1, period: 7.2 },
  ],
  hall: [
    { head: [611, 559, 73, 63], arm: [678, 611, 37, 42], detail: [596, 662, 47, 56], headPivot: [610, 608], armPivot: [647, 639], detailPivot: [603, 705], palm: [691, 594], bounds: [530, 487, 728, 727], direction: 1, period: 6.4 },
    { head: [647, 578, 67, 55], arm: [572, 626, 47, 38], detail: [675, 512, 74, 70], headPivot: [655, 620], armPivot: [609, 644], detailPivot: [648, 558], palm: [545, 607], bounds: [516, 433, 775, 756], direction: -1, period: 6.8 },
    { head: [622, 545, 73, 67], arm: [658, 635, 41, 45], detail: [725, 709, 67, 58], headPivot: [622, 596], armPivot: [633, 605], detailPivot: [673, 714], palm: [674, 620], bounds: [541, 470, 801, 777], direction: 1, period: 5.9 },
    { head: [538, 536, 97, 93], arm: [401, 625, 82, 68], detail: [716, 646, 89, 111], headPivot: [517, 609], armPivot: [459, 646], detailPivot: [658, 716], palm: [368, 604], bounds: [310, 431, 818, 766], direction: -1, period: 7.2 },
  ],
};
export type KeeperPose = {
  headX: number; headY: number; headAngle: number;
  armX: number; armY: number; armAngle: number;
  detailX: number; detailY: number; detailAngle: number;
  invitation: number; coinPhase: number; intensity: number;
};
const TAU = Math.PI * 2;
const ease = (t: number): number => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
/** Smooth two-stroke beckon, with a dwell and rest at both ends of each stroke. */
function invitation(t: number): number {
  if (t < 0 || t >= 2.65) return 0;
  if (t < 0.55) return ease(t / 0.55);
  if (t < 0.9) return 1 - ease((t - 0.55) / 0.35) * 0.72;
  if (t < 1.5) return 0.28 + ease((t - 0.9) / 0.6) * 0.72;
  if (t < 1.85) return 1;
  return 1 - ease((t - 1.85) / 0.8);
}
export class KeeperGesture {
  readonly pose: KeeperPose = { headX: 0, headY: 0, headAngle: 0, armX: 0, armY: 0, armAngle: 0, detailX: 0, detailY: 0, detailAngle: 0, invitation: 0, coinPhase: -1, intensity: 1 };
  private time = 0;
  private cueTime = -100;
  private cueStrength = 1;
  private cueFrom = 0;
  private suspended = false;
  constructor(readonly scene: KeeperScene, readonly mode: KeeperMode) { this.trigger('greet'); }
  get rig(): KeeperRig { return KEEPER_RIGS[this.scene][this.mode]; }
  trigger(cue: KeeperCue): void {
    if (this.suspended) return;
    // Repeated taps restart one owned gesture; they never stack a motion track.
    this.cueFrom = this.pose.invitation;
    this.cueTime = this.time;
    this.cueStrength = cue === 'super' ? 1.3 : cue === 'big' ? 1.18 : cue === 'spin' ? 0.84 : 1;
  }
  suspend(): void { this.suspended = true; this.resetPose(); }
  resume(): void { this.suspended = false; this.time = 0; this.cueTime = -2.85; this.resetPose(); }
  resetPose(): KeeperPose {
    const p = this.pose;
    p.headX = p.headY = p.headAngle = p.armX = p.armY = p.armAngle = 0;
    p.detailX = p.detailY = p.detailAngle = p.invitation = 0;
    p.coinPhase = -1; p.intensity = 1;
    return p;
  }
  step(dt: number): KeeperPose {
    if (this.suspended) return this.pose;
    // Do not catch up a hidden tab's animation or produce a huge first frame.
    this.time += Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0;
    const rig = this.rig; const p = this.pose;
    const cueElapsed = this.time - this.cueTime;
    const cycle = cueElapsed % rig.period;
    const t = cueElapsed < 2.85 ? cueElapsed : cycle;
    const strength = cueElapsed < 2.85 ? this.cueStrength : 1;
    const takeover = ease(cueElapsed / 0.26);
    const call = cueElapsed < 0.26 ? this.cueFrom * (1 - takeover) + invitation(t) * strength * takeover : invitation(t) * strength;
    const breath = Math.sin(this.time * TAU / 4.8);
    const side = rig.direction;
    // Otter presents a coin, rabbit curls its paw inwards, fox makes two little
    // offering lifts, dragon sweeps its treasure claw and follows with its tail.
    const reach = this.scene === 'prize' ? [9, 10, 9, 12][this.mode] : this.scene === 'hall' ? [7, 9, 7, 12][this.mode] : [5, 6, 5, 8][this.mode];
    p.headX = side * (Math.sin(this.time * 1.02) * 1.2 + call * 1.7);
    p.headY = -breath * 1.3 + call * 2.8;
    p.headAngle = side * (Math.sin(this.time * 0.91) * 0.012 - call * [0.023, 0.02, 0.028, 0.024][this.mode]);
    p.armX = -side * call * reach * 0.45;
    p.armY = -call * reach;
    p.armAngle = side * call * [0.12, 0.16, 0.13, 0.10][this.mode];
    p.detailX = Math.sin(this.time * 1.23 + this.mode) * (this.mode === 3 ? 4 : 1.8);
    p.detailY = Math.sin(this.time * 1.38) * 1.5 - call * 1.8;
    p.detailAngle = Math.sin(this.time * 1.15 + this.mode) * [0.034, 0.046, 0.058, 0.037][this.mode];
    p.invitation = call; p.intensity = strength;
    p.coinPhase = t >= 0.24 && t <= 2.7 ? (t - 0.24) / 2.46 : -1;
    return p;
  }
}
