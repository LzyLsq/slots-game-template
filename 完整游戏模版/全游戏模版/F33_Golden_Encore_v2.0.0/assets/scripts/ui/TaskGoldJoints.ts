import { TaskGoldCharacter, TaskGoldPose } from './TaskGoldMotion';
import { TASK_GOLD_RIGS } from './TaskGoldRigLayout';

/** Small, bounded articulation of the existing generated pixels.
 * Legs stay untransformed. Above the collar the whole face is a rigid region:
 * there is no eye, nose, cheek or expression warping. Shader and attachments
 * use precisely the same forward transform, in source-pixel coordinates.
 */
export const TASK_GOLD_JOINTS = [
  { hip: [42, 235], neck: [57, 436], torsoBand: [170, 365], headBand: [400, 461], wrist: [166, -72], wristBand: [136, 191] },
  { hip: [42, 213], neck: [51, 419], torsoBand: [155, 346], headBand: [383, 438], wrist: [69, -17], wristBand: [46, 92] },
  { hip: [77, 213], neck: [102, 459], torsoBand: [165, 374], headBand: [416, 490], wrist: [90, 50], wristBand: [63, 113] },
  { hip: [104, 214], neck: [117, 425], torsoBand: [158, 357], headBand: [393, 460], wrist: [80, 26], wristBand: [56, 105] },
] as const;
export type JointPoint = { x: number; y: number };
export const TO_RADIANS = Math.PI / 180;
export function jointWeight(value: number, low: number, high: number): number {
  const p = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return p * p * (3 - 2 * p);
}
function turn(x: number, y: number, px: number, py: number, degrees: number, weight: number, out: JointPoint): JointPoint {
  const r = degrees * TO_RADIANS, c = Math.cos(r), s = Math.sin(r);
  const dx = x - px, dy = y - py;
  out.x = x + weight * (c * dx - s * dy - dx);
  out.y = y + weight * (s * dx + c * dy - dy);
  return out;
}
export function transformGoldBody(x: number, y: number, pose: TaskGoldPose, mode: TaskGoldCharacter, out: JointPoint): JointPoint {
  const r = TASK_GOLD_JOINTS[mode];
  turn(x, y, r.hip[0], r.hip[1], pose.torsoAngle, jointWeight(y, r.torsoBand[0], r.torsoBand[1]), out);
  const angle = pose.torsoAngle * TO_RADIANS, c = Math.cos(angle), s = Math.sin(angle);
  const dx = r.neck[0] - r.hip[0], dy = r.neck[1] - r.hip[1];
  const nx = r.hip[0] + c * dx - s * dy, ny = r.hip[1] + s * dx + c * dy;
  return turn(out.x, out.y, nx, ny, pose.headAngle, jointWeight(y, r.headBand[0], r.headBand[1]), out);
}
export function transformGoldWrist(x: number, y: number, pose: TaskGoldPose, mode: TaskGoldCharacter, out: JointPoint): JointPoint {
  const r = TASK_GOLD_JOINTS[mode];
  return turn(x, y, r.wrist[0], r.wrist[1], pose.wristAngle, jointWeight(x, r.wristBand[0], r.wristBand[1]), out);
}
/** Sleeve attachment uses the same torso tangent as the actual coat pixels. */
export function goldElbowAngle(pose: TaskGoldPose, mode: TaskGoldCharacter): number {
  const r = TASK_GOLD_JOINTS[mode], e = TASK_GOLD_RIGS[mode].elbow;
  return pose.armAngle + pose.torsoAngle * jointWeight(e[1], r.torsoBand[0], r.torsoBand[1]);
}
