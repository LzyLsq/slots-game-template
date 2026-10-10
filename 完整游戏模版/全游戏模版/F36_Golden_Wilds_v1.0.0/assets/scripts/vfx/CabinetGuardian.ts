import { _decorator, Component, Sprite } from 'cc';
import { GuardianMesh } from './GuardianMesh';
const { ccclass } = _decorator;
/** Coordinates in the Cocos room plane: the painted upper crown is fixed. */
export const FORTUNE_PANELS = [
  { top: -256, width: 736, height: 448 },
  { top: -256, width: 736, height: 448 },
  { top: -256, width: 736, height: 448 },
  { top: -256, width: 736, height: 448 },
] as const;
export const fortuneResources = (id: string): string[] => [
  id + '-room-left', id + '-room-right', id + '-room-center',
  id + '-guardian-base', id + '-guardian-skin',
  ...(id === 'lotus-koi' ? [] : [id + '-guardian-eyelids']),
];
const smooth = (v: number): number => { const x = Math.max(0, Math.min(1, v)); return x * x * (3 - 2 * x); };
/** Feather only the attachment boundary, not the middle of a face or limb. */
const polygon = (points: readonly (readonly [number, number])[], feather: number, edge = .5) =>
  (x: number, y: number): number => {
    let inside = false, distance = Infinity;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[j], [bx, by] = points[i];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      distance = Math.min(distance, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return smooth(edge + (inside ? distance : -distance) / feather);
  };
/** A beckon has a rest, a forward gesture and a return, with zero velocity at
 * either end. It is not a continuous wind-like wobble of the entire drawing. */
const beckon = (t: number, phase: number): number => {
  const p = ((t + phase) % 5.6) / 3.8;
  return p < 1 ? Math.sin(p * Math.PI * 2) * Math.sin(p * Math.PI) ** 2 : 0;
};
const support = (x: number, y: number, cx: number, cy: number, core: number, feather: number): number =>
  1 - smooth((Math.hypot(x - cx, y - cy) - core) / feather);
const sector = (x: number, y: number, cx: number, cy: number, direction: number, core: number, feather: number): number => {
  const a = Math.atan2(y - cy, x - cx) - direction;
  const d = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
  return 1 - smooth((d - core) / feather);
};
// A short closure and hold, followed by a slower opening. Fish has no lids.
export const guardianBlink = (t: number, theme: number): number => {
  if (theme === 2) return 0;
  const p = (t + theme * .73) % 5.8 - 2.1;
  if (p < 0 || p >= .34) return 0;
  if (p < .105) return smooth(p / .105);
  if (p < .155) return 1;
  return 1 - smooth((p - .155) / .185);
};
interface EyelidController { setClosure(value: number): void; }
type Motion = 'nod' | 'gesture' | 'ear' | 'tail' | 'fin' | 'wrist';
interface SkinJoint {
  x: number; y: number; motion: Motion; factor: number;
  weight: (x: number, y: number) => number;
  angle: number; cos: number; sin: number;
}
interface GridBinding {
  columns: number; rows: number; width: number; height: number;
  source: Float64Array; weights: Float64Array;
}
/** One commissioned character, with rotations in anatomical order: fingers
 * before shoulder, ears/trunk before head, fins/tail before the swimming body.
 * Faces and free appendages have full rigid influence. Only their attachments
 * blend. There is no radial face warp, additive overlap, image scaling, eye
 * squeeze, pose swapping or crossfade. The cabinet and supporting paws stay put. */
@ccclass('CabinetGuardian')
export class CabinetGuardian extends Component {
  public reducedMotion = false;
  public sprite?: Sprite;
  public mesh?: GuardianMesh;
  public clock = 0;
  public gesture = 0;
  private theme = 0;
  private watching = false;
  private cheer = 0;
  private energy = 0;
  private nod = 0;
  private ear = 0;
  private tail = 0;
  private blink = 0;
  private fin = 0;
  private wrist = 0;
  private lift = 0;
  private joints: SkinJoint[] = [];
  private grid?: GridBinding;
  private eyelids?: EyelidController;
  public setup(sprite: Sprite, mesh: GuardianMesh, theme: number, eyelids?: EyelidController): void {
    this.sprite = sprite; this.mesh = mesh; this.theme = theme; this.eyelids = eyelids;
    this.bindJoints(); this.grid = undefined;
    mesh.skin = this; this.apply();
  }
  public anticipate(active: boolean): void { this.watch(active); }
  public watch(active: boolean): void { this.watching = active; }
  public celebrate(): void { this.cheer = 5.8; }
  protected update(dt: number): void {
    if (!this.mesh) return;
    if (!this.reducedMotion) this.clock += dt;
    this.cheer = Math.max(0, this.cheer - dt);
    const target = this.reducedMotion ? 0 : this.cheer > 0 ? 1 : this.watching ? .55 : 0;
    this.energy += (target - this.energy) * (1 - Math.exp(-dt * 2.5));
    this.apply();
  }
  private apply(): void {
    if (this.reducedMotion) {
      this.gesture = this.nod = this.ear = this.tail = this.blink = this.fin = this.wrist = this.lift = 0;
    } else {
      const t = this.clock, offset = this.theme * .61;
      const reach = ((t + offset) % 5.6) / 3.8;
      // Swing away from the chest, return to rest, then pause. Never press the
      // free paw into the mane or stretch the inner shoulder seam.
      this.gesture = reach < 1 ? -(Math.sin(reach * Math.PI) ** 2) * (.115 + this.energy * .035) : 0;
      this.wrist = beckon(t - .18 + 5.6, offset) * (.045 + this.energy * .014);
      this.nod = Math.sin(t * .9 + offset) * (.022 + this.energy * .006);
      // Brief ear turns, separated by rests, rather than perpetually rippling fur.
      const twitch = ((t + offset + 2.4) % 6.4) / 1.15;
      this.ear = twitch < 1 ? Math.sin(twitch * Math.PI * 2) * Math.sin(twitch * Math.PI) ** 2 * .055 : 0;
      this.tail = Math.sin(t * 1.28 + offset - .65) * (.065 + this.energy * .018);
      this.fin = Math.sin(t * 1.7 + offset) * (.08 + this.energy * .018);
      this.lift = 0;
      // Only registered eyelid pixels change; blink never deforms the face mesh.
      this.blink = guardianBlink(t, this.theme);
      if (this.theme === 1) {
        this.gesture = Math.sin(t * 1.22 + offset) * (.065 + this.energy * .02);
        this.nod *= .7;
      } else if (this.theme === 2) {
        const swim = t * 1.65 + offset;
        this.nod = Math.sin(swim - .8) * (.011 + this.energy * .003);
        this.tail = Math.sin(swim) * (.075 + this.energy * .018);
        this.fin = Math.sin(swim + 1.1) * (.085 + this.energy * .02);
        this.lift = Math.sin(t * .85 + offset) * 1.8;
      }
    }
    for (const joint of this.joints) {
      joint.angle = this[joint.motion] * joint.factor;
      joint.cos = Math.cos(joint.angle); joint.sin = Math.sin(joint.angle);
    }
    this.eyelids?.setClosure(this.blink);
    this.mesh?.redraw();
  }
  private bindJoints(): void {
    this.joints = [];
    const add = (x: number, y: number, motion: Motion, factor: number,
      weight: (x: number, y: number) => number): void => {
      this.joints.push({ x, y, motion, factor, weight, angle: 0, cos: 1, sin: 0 });
    };
    if (this.theme === 0) {
      // Entire paw/fingers rotate, then the arm follows its fixed shoulder.
      // Bind the free limb rigidly. Weight changes only at its shoulder, so
      // the nearby mane, chest jewel and fixed paw never follow a beckon.
      const arm = (x: number, y: number): number => {
        const edge = 248 + Math.max(0, y - 175) * .35;
        return smooth((x - 75) / 65) * (1 - smooth((x - edge + 16) / 16)) * (1 - smooth((y - 207) / 39));
      };
      add(210, 177, 'wrist', 1, (x, y) => arm(x,y) * (1 - smooth((y - 160) / 25)));
      add(258, 230, 'gesture', 1, arm);
      add(309, 102, 'ear', 1, (x, y) => (1 - smooth((y - 83) / 21)) * (1 - smooth((x - 308) / 21)) * support(x, y, 294, 80, 30, 60));
      add(447, 135, 'ear', -.7, (x, y) => smooth((x - 444) / 20) * (1 - smooth((y - 123) / 21)) * support(x, y, 462, 120, 25, 65));
      add(366, 246, 'nod', 1, (x, y) => smooth((x - (y < 190 ? 239 : 239 + (y - 190) * .45)) / 24) * (1 - smooth((y - 223) / 30)) * support(x, y, 370, 142, 195, 100));
    } else if (this.theme === 1) {
      // The curled trunk swings as one shape. No three overlapping radial
      // rotations that alternately inflate and stretch its painted thickness.
      const trunk = polygon([[345,155],[375,170],[373,200],[353,226],[326,248],[292,255],
        [252,251],[221,234],[205,212],[197,198],[180,201],[169,191],[171,176],[182,159],
        [202,153],[224,158],[237,178],[237,195],[249,210],[267,216],[296,214],
        [318,206],[332,190],[338,170]], 38, .9);
      add(270, 143, 'ear', 1, (x, y) => (1 - trunk(x, y)) * (1 - smooth((x - 246) / 32)) * (1 - smooth((y - 208) / 27)) * support(x, y, 222, 151, 90, 80));
      add(431, 141, 'ear', -.82, (x, y) => smooth((x - 427) / 27) * (1 - smooth((y - 205) / 29)) * support(x, y, 475, 152, 90, 80));
      add(350, 178, 'gesture', 1, (x, y) => trunk(x, y) * (1 - smooth((x - 275) / 20) * (1 - smooth((y - 145) / 28))) * smooth((Math.hypot(x - 350, y - 178) - 9) / 32));
      add(353, 245, 'nod', 1, (_x, y) => 1 - smooth((y - 246) / 39));
    } else if (this.theme === 2) {
      // Tail and pectoral fin turn at their roots; the whole fish then glides
      // rigidly. Its head, eye and scales never expand with a radial lift mask.
      const pectoral = polygon([[297,180],[317,179],[350,183],[361,209],[346,221],[316,211]], 16);
      add(307, 181, 'fin', 1, pectoral);
      add(457, 165, 'tail', 1, (x, y) => smooth((x - 439) / 39) * support(x, y, 535, 124, 93, 100));
      add(381, 178, 'nod', 1, () => 1);
    } else {
      const arm = (x: number, y: number): number => {
        const edge = 265 + Math.max(0, y - 219) * .25;
        return smooth((x - 110) / 70) * (1 - smooth((x - edge + 18) / 18)) * (1 - smooth((y - 239) / 37));
      };
      add(233, 220, 'wrist', 1, (x, y) => arm(x,y) * (1 - smooth((y - 201) / 25)));
      add(270, 266, 'gesture', 1, arm);
      add(308, 141, 'ear', 1, (x, y) => (1 - smooth((y - 108) / 33)) * (1 - smooth((x - 320) / 30)) * support(x, y, 293, 98, 42, 70));
      add(450, 153, 'ear', -.8, (x, y) => smooth((x - 443) / 28) * (1 - smooth((y - 128) / 26)) * support(x, y, 468, 123, 35, 70));
      add(535, 323, 'tail', 1, (x, y) => {
        const contact = smooth((y - 249) / 26) * (1 - smooth((x - 520) / 26));
        return smooth((x - 470) / 27) * (1 - contact) * (1 - smooth((y - 272) / 61)) * support(x, y, 535, 239, 85, 100);
      });
      add(364, 269, 'nod', 1, (x, y) => {
        const right = y < 185 ? 495 : 495 - (y - 185) * .56;
        return smooth((x - 259) / 26) * (1 - smooth((x - right) / 20)) * (1 - smooth((y - 255) / 22)) * support(x, y, 365, 162, 175, 80);
      });
    }
  }
  public point(x: number, y: number): readonly [number, number] {
    if (this.reducedMotion) return [x, y];
    let px = x, py = y;
    for (const joint of this.joints) {
      const weight = joint.weight(x, y);
      if (weight < .0001) continue;
      // Blend the angle at a joint, not separately-added displacements. A fully
      // bound face/paw stays rigid, and child motion inherits its parent turn.
      const angle = joint.angle * weight;
      const cos = weight === 1 ? joint.cos : Math.cos(angle);
      const sin = weight === 1 ? joint.sin : Math.sin(angle);
      const rx = px - joint.x, ry = py - joint.y;
      px = joint.x + rx * cos - ry * sin;
      py = joint.y + rx * sin + ry * cos;
    }
    return [px, py + this.lift];
  }
  /** Static anatomical bindings are reused, with no per-frame point arrays. */
  public writePoints(target: Float64Array, columns: number, rows: number, width: number, height: number): void {
    let grid = this.grid;
    const count = (columns + 1) * (rows + 1), jointCount = this.joints.length;
    if (!grid || grid.columns !== columns || grid.rows !== rows || grid.width !== width || grid.height !== height) {
      grid = this.grid = { columns, rows, width, height,
        source: new Float64Array(count * 2), weights: new Float64Array(count * jointCount) };
      for (let row = 0, k = 0; row <= rows; row++) for (let col = 0; col <= columns; col++, k++) {
        const x = col / columns * width, y = row / rows * height;
        grid.source[k * 2] = x; grid.source[k * 2 + 1] = y;
        for (let j = 0; j < jointCount; j++) {
          const weight = this.joints[j].weight(x, y);
          grid.weights[k * jointCount + j] = weight < .0001 ? 0 : weight;
        }
      }
    }
    if (this.reducedMotion) { target.set(grid.source); return; }
    for (let k = 0; k < count; k++) {
      let px = grid.source[k * 2], py = grid.source[k * 2 + 1];
      for (let j = 0; j < jointCount; j++) {
        const weight = grid.weights[k * jointCount + j];
        if (!weight) continue;
        const joint = this.joints[j], angle = joint.angle * weight;
        const cos = weight === 1 ? joint.cos : Math.cos(angle);
        const sin = weight === 1 ? joint.sin : Math.sin(angle);
        const rx = px - joint.x, ry = py - joint.y;
        px = joint.x + rx * cos - ry * sin;
        py = joint.y + rx * sin + ry * cos;
      }
      target[k * 2] = px; target[k * 2 + 1] = py + this.lift;
    }
  }
  protected onDestroy(): void { if (this.mesh) this.mesh.skin = undefined; this.mesh = undefined; this.sprite = undefined; this.eyelids = undefined; this.grid = undefined; this.joints = []; }
}
