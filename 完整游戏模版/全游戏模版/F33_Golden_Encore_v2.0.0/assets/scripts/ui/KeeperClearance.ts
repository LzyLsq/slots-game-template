/** Source-pixel clearance rules, not viewport offsets or new artwork. */
import { KEEPER_RIGS, KeeperMode, KeeperPose, KeeperScene } from './KeeperGesture';
export type ClearRect = readonly [number, number, number, number];
export type Fixture = readonly [number, number, number, number];
// All four titles keep their complete generated wordmarks. Left-side keepers
// get a right-hand marquee; right-side keepers get a left-hand marquee.
export const CABINET_TITLE_SLOTS: readonly Fixture[] = [
  [605, 140, 500, 500 / 3], [389, 143, 446, 446 / 3],
  [605, 140, 500, 500 / 3], [391, 145, 450, 150],
];
export const CABINET_SUBTITLE: Fixture = [512, 309, 624, 36];
export const CABINET_METER_Y = 394;
// These fixtures clear *every* hall keeper, even during room crossfades.
export const HALL_BACKLIGHTS: readonly Fixture[] = [
  [220, 594, 92, 80], [882, 615, 72, 84], [512, 867, 175, 42],
];
export const HALL_EXHIBIT_GLINTS: readonly Fixture[] = [
  [220, 839, 72, 40], [852, 852, 68, 38], [240, 978, 80, 42],
  [784, 988, 72, 38], [440, 889, 66, 38], [596, 893, 66, 38],
];
export const HALL_INLAY_GLINTS: readonly Fixture[] = [
  [250, 1150, 72, 42], [430, 1160, 72, 42], [604, 1160, 72, 42],
  [774, 1150, 72, 42], [202, 490, 64, 42], [882, 490, 64, 42],
];
export const HALL_SCENE_LIGHTS: readonly Fixture[] = [
  [210, 285, 110, 95], [814, 285, 110, 95], [220, 1060, 96, 54], [804, 1060, 96, 54],
];
// Ears/horns, face and offering hands of the actual generated award keepers.
// The super stage also protects the architectural dragon's face and hands.
export const PRIZE_KEEPER_RECTS: Record<'ordinary' | 'big' | 'super', readonly ClearRect[]> = {
  ordinary: [[578, 580, 854, 1004]],
  big: [[170, 948, 474, 1318]],
  super: [[578, 676, 854, 1032], [268, 44, 756, 394], [130, 446, 343, 664], [720, 446, 931, 664]],
};
// The super stage has a second, architectural keeper above the small dragon.
// Fit live award copy into the open central column, rather than across its jaw.
// Source pixels share the generated backdrop's registration at every viewport.
export const SUPER_PRIZE_LAYOUT = {
  headline: [512, 450, 300, 66] as Fixture,
  subtitle: [512, 530, 300, 58] as Fixture,
  caption: [512, 580, 300, 32] as Fixture,
  amount: [512, 625, 300, 50] as Fixture,
};
export const BIG_PRIZE_CLAIM_Y = 1410;
export const SUPER_HEADLINE_ENTRANCE = { below: 14, above: 4, initialScale: .94, overshootScale: 1.025 } as const;
const ease = (t: number): number => { const v = Math.max(0, Math.min(1, t)); return v * v * (3 - 2 * v); };
/** A separate opacity gate multiplies, never rewrites, the particle's native
 * fade. Radius-expanded bounds allow rotated coins/light to clear the keeper.
 * Fade before overlap and return afterwards: no hard disappearance at the face. */
export function protectionOpacity(rects: readonly ClearRect[], x: number, y: number, rx: number, ry = rx, feather = 30): number {
  let alpha = 1;
  for (const r of rects) {
    const dx = Math.max(r[0] - x - rx, x - rx - r[2], 0);
    const dy = Math.max(r[1] - y - ry, y - ry - r[3], 0);
    alpha = Math.min(alpha, ease(Math.hypot(dx, dy) / feather));
  }
  return alpha;
}
export type OfferingPose = { x: number; y: number; opacity: number; squeeze: number; shrink: number; angle: number };
/** Reuse one output object; approach from the outside and BELOW the hand,
 * never through the cheek. The coin is almost gone before reaching fingers. */
export function offeringPose(scene: KeeperScene, mode: KeeperMode, p: KeeperPose, index: number, out: OfferingPose): OfferingPose {
  const rig = KEEPER_RIGS[scene][mode];
  const t = p.coinPhase * 1.42 - index * 0.17;
  out.opacity = 0;
  if (p.coinPhase < 0 || t < 0 || t > 1) return out;
  const travel = ease(t);
  out.x = rig.palm[0] + rig.direction * (scene === 'cabinet' ? 36 : 45) * (1 - travel) + p.armX;
  out.y = rig.palm[1] + (scene === 'cabinet' ? 32 : 40) * (1 - travel) + Math.sin(t * Math.PI) * 6 + p.armY;
  out.squeeze = 0.46 + Math.abs(Math.cos(t * Math.PI * 2 + index)) * 0.54;
  out.shrink = 1 - travel * 0.42;
  out.angle = rig.direction * (t * 96 - 22);
  const radius = (22 + index * 3) * 0.71 * out.shrink;
  const face = rig.head;
  const distance = Math.hypot((out.x - face[0]) / (face[2] * .8 + radius + 8), (out.y - face[1]) / (face[3] * .76 + radius + 8));
  out.opacity = Math.sin(t * Math.PI) * (scene === 'hall' ? 195 : 165)
    * (1 - ease((travel - .62) / .32)) * ease((distance - 1) / .22);
  return out;
}
