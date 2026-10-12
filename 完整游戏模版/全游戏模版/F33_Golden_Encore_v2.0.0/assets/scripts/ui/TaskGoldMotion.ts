import { TASK_GOLD_STAGE } from './TaskGoldRigLayout';

/** Authored local-reward choreography; it never reads or changes the wallet. */
export type TaskGoldCue = 'reach' | 'shine' | 'smile' | 'return' | 'complete';
export type TaskGoldPhase = 'prepare' | 'reach' | 'show' | 'shine' | 'smile' | 'return' | 'settle' | 'complete';
export const TASK_GOLD_DURATION = 5.2;
export const TASK_GOLD_REDUCED_DURATION = 1.2;
export type TaskGoldCharacter = 0 | 1 | 2 | 3;
export const TASK_GOLD_CAST = [
  { character: 'otter', body: 'task-gold-keeper', arm: 'task-gold-held-arm', smile: 'task-gold-smile-atlas', story: 'waistband ingot offering' },
  { character: 'rabbit', body: 'task-gold-rabbit-body', arm: 'task-gold-rabbit-arm', smile: 'task-gold-rabbit-smile-atlas', story: 'pouch lift and courteous presentation' },
  { character: 'fox', body: 'task-gold-fox-body', arm: 'task-gold-fox-arm', smile: 'task-gold-fox-smile-atlas', story: 'coin tilt and merchant flourish' },
  { character: 'dragon', body: 'task-gold-dragon-body', arm: 'task-gold-dragon-arm', smile: 'task-gold-dragon-smile-atlas', story: 'slow treasure pearl blessing' },
] as const;
export const TASK_GOLD_ART = TASK_GOLD_CAST.flatMap(cast => [cast.body, cast.arm, cast.smile]);
export const TASK_GOLD_REFLECTION = 'task-gold-reflection';
const BEATS = [
  { reach: .3, show: 1.6, shine: 1.78, smile: 2.12, putBack: 3.48, settle: 4.87, tucked: -122, held: 18 },
  { reach: .23, show: 1.53, shine: 1.84, smile: 2.34, putBack: 3.43, settle: 4.82, tucked: -128, held: -6 },
  { reach: .34, show: 1.58, shine: 1.72, smile: 2.25, putBack: 3.54, settle: 4.86, tucked: -126, held: 10 },
  { reach: .4, show: 1.82, shine: 2.03, smile: 2.58, putBack: 3.72, settle: 4.94, tucked: -135, held: 22 },
] as const;
export const TASK_GOLD_SMILE = { columns: 8, frames: 16, width: 221, height: 98 } as const;
export type TaskGoldPose = {
  phase: TaskGoldPhase; bodyAngle: number; bodyX: number; bodyY: number;
  torsoAngle: number; headAngle: number; wristAngle: number;
  armX: number; armY: number; armAngle: number; smileFrame: number;
  glint: number; glintScale: number; toothGlint: number; toothScale: number; complete: boolean;
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const p = clamp(n); return p * p * p * (p * (p * 6 - 15) + 10); };
const gate = (time: number, start: number, end: number) => smooth((time - start) / (end - start));
const shine = (time: number, start: number, peak: number, end: number) =>
  time <= peak ? gate(time, start, peak) : 1 - gate(time, peak, end);
type Keys = readonly (readonly [number, number])[];
/** Shape-preserving Hermite: velocity passes THROUGH retrieval keys, rather
 * than braking to zero at every animation beat. Reversals alone come to rest.
 */
function tangent(keys: Keys, i: number): number {
  if (i === 0 || i === keys.length - 1) return 0;
  const left = (keys[i][1] - keys[i - 1][1]) / (keys[i][0] - keys[i - 1][0]);
  const right = (keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]);
  return left * right <= 0 ? 0 : 2 * left * right / (left + right);
}
function curve(time: number, keys: Keys): number {
  if (time <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, x] = keys[i], [b, y] = keys[i + 1];
    if (time > b) continue;
    const d = b - a, t = (time - a) / d, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * x + (t3 - 2 * t2 + t) * d * tangent(keys, i)
      + (-2 * t3 + 3 * t2) * y + (t3 - t2) * d * tangent(keys, i + 1);
  }
  return keys[keys.length - 1][1];
}
const MOTION: readonly { arm: Keys; torso: Keys; head: Keys; wrist: Keys }[] = [
  { // Otter: reach into the coat, broad ingot offering, a small friendly nod.
    arm: [[0,-122],[.26,-124],[.65,-108],[1.15,-35],[1.6,14],[1.96,18],[2.42,13],[2.96,16],[3.48,15],[3.91,-8],[4.45,-108],[4.87,-123],[5.2,-122]],
    torso: [[0,0],[.55,-2.4],[1.18,-1.6],[1.93,.8],[2.58,1.5],[3.12,.6],[3.8,-1.8],[4.64,-.7],[5.2,0]],
    head: [[0,0],[.74,-3.6],[1.38,-2.1],[2.02,1.1],[2.47,2.8],[2.95,.9],[3.82,-2.5],[4.63,-.8],[5.2,0]],
    wrist: [[0,0],[.64,-5],[1.26,-8],[1.94,7],[2.55,-3],[3.15,2],[3.91,-7],[4.74,0],[5.2,0]],
  },
  { // Rabbit: keeps the purse upright, lifts it close, then gives a soft bow.
    arm: [[0,-128],[.23,-130],[.68,-92],[1.19,-26],[1.53,-8],[2.02,-13],[2.73,-5],[3.43,-9],[3.95,-39],[4.5,-117],[4.82,-129],[5.2,-128]],
    torso: [[0,0],[.52,-1.2],[1.22,.4],[1.91,-.5],[2.78,2.3],[3.29,1.2],[3.98,-1.3],[4.65,-.3],[5.2,0]],
    head: [[0,0],[.78,-2.8],[1.46,-1.1],[2.04,1.4],[2.82,4.2],[3.26,1.8],[4.01,-2.1],[4.74,-.4],[5.2,0]],
    wrist: [[0,0],[.78,-6],[1.57,3],[2.18,-3],[2.87,1],[3.53,-2],[4.16,-7],[4.83,0],[5.2,0]],
  },
  { // Fox: lets the COIN roll at the wrist, not the whole stiff forearm.
    arm: [[0,-126],[.34,-129],[.83,-81],[1.29,-14],[1.58,9],[2.05,11],[2.68,6],[3.22,10],[3.54,8],[4.04,-41],[4.55,-113],[4.86,-127],[5.2,-126]],
    torso: [[0,0],[.63,-1.7],[1.33,-.5],[1.99,1.8],[2.64,.4],[3.09,1.3],[3.85,-1.1],[4.7,-.4],[5.2,0]],
    head: [[0,0],[.73,-2.1],[1.55,-.8],[2.07,3.1],[2.77,-1.2],[3.23,2],[4.03,-2.6],[4.79,-.4],[5.2,0]],
    wrist: [[0,0],[.84,-7],[1.5,4],[1.97,12],[2.54,-9],[3.11,7],[3.76,-2],[4.41,-6],[4.93,0],[5.2,0]],
  },
  { // Dragon: slower cupped pearl blessing, shoulder leads, head follows later.
    arm: [[0,-135],[.4,-137],[.97,-94],[1.49,-23],[1.82,20],[2.35,27],[2.97,22],[3.41,24],[3.72,21],[4.2,-52],[4.67,-124],[4.94,-136],[5.2,-135]],
    torso: [[0,0],[.78,-1.8],[1.52,-1.1],[2.28,.5],[3.04,1.8],[3.59,.7],[4.26,-1.4],[4.81,-.5],[5.2,0]],
    head: [[0,0],[1.05,-3.2],[1.73,-1.8],[2.54,1.3],[3.07,3.6],[3.64,1.2],[4.35,-2.2],[4.87,-.6],[5.2,0]],
    wrist: [[0,0],[1.04,-4],[1.86,3],[2.5,6],[3.12,-3],[3.71,2],[4.29,-5],[4.95,0],[5.2,0]],
  },
];

export function taskGoldPose(time: number, reduced = false, mode: TaskGoldCharacter = 0): TaskGoldPose {
  const duration = reduced ? TASK_GOLD_REDUCED_DURATION : TASK_GOLD_DURATION;
  const t = Number.isFinite(time) ? Math.max(0, Math.min(duration, time)) : 0;
  const beat = BEATS[mode];
  if (reduced) return {
    phase: t >= duration ? 'complete' : 'smile', bodyAngle: 0, bodyX: 0, bodyY: 0,
    torsoAngle: 0, headAngle: 0, wristAngle: 0, armX: 0, armY: 0, armAngle: beat.held, smileFrame: 15,
    glint: Math.round(110 * shine(t, .12, .4, .85)), glintScale: 1, toothGlint: 0, toothScale: 1,
    complete: t >= duration,
  };
  const motion = MOTION[mode];
  // Smile overlaps the final wrist presentation; it is not a separate pop-up.
  const smileAmount = gate(t, beat.smile, beat.smile + .48) * (1 - gate(t, beat.putBack + .16, beat.putBack + .76));
  const glint = 192 * shine(t, beat.shine, beat.shine + .2, beat.shine + .64)
    + 82 * shine(t, beat.shine + .76, beat.shine + .94, beat.shine + 1.26);
  const toothShine = shine(t, beat.smile + .48, beat.smile + .62, beat.smile + .94);
  const phase: TaskGoldPhase = t >= duration ? 'complete' : t >= beat.settle ? 'settle' :
    t >= beat.putBack ? 'return' : t >= beat.smile ? 'smile' : t >= beat.shine ? 'shine' :
    t >= beat.show ? 'show' : t >= beat.reach ? 'reach' : 'prepare';
  return {
    phase, bodyAngle: 0, bodyX: 0, bodyY: 0,
    torsoAngle: curve(t, motion.torso), headAngle: curve(t, motion.head), wristAngle: curve(t, motion.wrist),
    armX: 0, armY: 0, armAngle: curve(t, motion.arm), smileFrame: Math.round(15 * smileAmount),
    glint: Math.round(glint), glintScale: .78 + .24 * glint / 192,
    toothGlint: Math.round(182 * toothShine), toothScale: .82 + .18 * toothShine,
    complete: t >= duration,
  };
}
function cueBeats(mode: TaskGoldCharacter): readonly [number, TaskGoldCue][] {
  const b = BEATS[mode];
  return [[b.reach + .4, 'reach'], [b.shine, 'shine'], [b.smile, 'smile'], [b.putBack, 'return'], [TASK_GOLD_DURATION, 'complete']];
}
const REDUCED_CUES: readonly [number, TaskGoldCue][] = [
  [.05, 'reach'], [.2, 'shine'], [.35, 'smile'], [TASK_GOLD_REDUCED_DURATION, 'complete'],
];

/** Exactly-once cues even across a dropped frame, fast-forward, or cancellation. */
export class TaskGoldPlayback {
  public time = 0;
  private nextCue = 0;
  private stopped = false;
  private readonly cues: readonly [number, TaskGoldCue][];
  public constructor(public readonly reduced = false, public readonly mode: TaskGoldCharacter = 0) {
    this.cues = reduced ? REDUCED_CUES : cueBeats(mode);
  }
  public get duration(): number { return this.reduced ? TASK_GOLD_REDUCED_DURATION : TASK_GOLD_DURATION; }
  public advance(dt: number): { pose: TaskGoldPose; cues: TaskGoldCue[] } {
    const cues: TaskGoldCue[] = [];
    if (this.stopped) return { pose: taskGoldPose(this.time, this.reduced, this.mode), cues };
    if (Number.isFinite(dt) && dt > 0) this.time = Math.min(this.duration, this.time + dt);
    const sequence = this.cues;
    while (this.nextCue < sequence.length && sequence[this.nextCue][0] <= this.time) {
      cues.push(sequence[this.nextCue++][1]);
    }
    if (this.time >= this.duration) this.stopped = true;
    return { pose: taskGoldPose(this.time, this.reduced, this.mode), cues };
  }
  public cancel(): void { this.stopped = true; }
}

/** Keep actual soles on the clear dais, and leave headroom below the caption.
 * The whole rig retains its proportions: narrow/short screens never crop ears.
 */
export function taskGoldStagePlacement(stageScale: number): { x: number; y: number; scale: number } {
  const safe = Number.isFinite(stageScale) && stageScale > 0 ? stageScale : 1;
  const y = (TASK_GOLD_STAGE.height / 2 - TASK_GOLD_STAGE.footY) * safe;
  return {
    x: (TASK_GOLD_STAGE.footX - TASK_GOLD_STAGE.width / 2) * safe, y,
    // 750 includes the ears/horns and the small, authored body inclination.
    scale: Math.min(TASK_GOLD_STAGE.actorScale * safe, (TASK_GOLD_STAGE.maxActorTop - y) / 750),
  };
}
