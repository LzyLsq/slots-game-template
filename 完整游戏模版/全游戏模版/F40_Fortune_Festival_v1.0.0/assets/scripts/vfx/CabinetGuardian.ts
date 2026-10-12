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
  id + '-guardian-eyelids',
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
// A short closure and hold, followed by a slower opening.
export const guardianBlink = (t: number, theme: number): number => {

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
/** One commissioned character, with rotations in anatomical order: wrist
 * before shoulder, wing before its attachment, ears before the head.
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
  private celebrationAge=10;
  private celebrationStrength=1;
  public celebrate(strength=1): void {
    this.cheer=5.8;this.celebrationAge=0;this.celebrationStrength=Math.max(0,Math.min(1,strength));
  }
  protected update(dt: number): void {
    if (!this.mesh) return;
    if (!this.reducedMotion) this.clock += dt;
    this.cheer = Math.max(0, this.cheer - dt);this.celebrationAge+=dt;
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
      // A reward adds two small shoulder/wrist gestures to the existing skin
      // joints. The character root and the entire artwork remain fixed.
      const age=this.celebrationAge;
      const salute=age<.95?Math.sin(age/.95*Math.PI)**2:0;
      const follow=age>=1.02&&age<2.1?Math.sin((age-1.02)/1.08*Math.PI)**2:0;
      const cheer=(salute+follow*.64)*this.celebrationStrength;
      this.gesture-=cheer*.024;this.wrist-=cheer*.019;this.nod-=salute*.010;
      this.lift = 0;
      // Only registered eyelid pixels change; blink never deforms the face mesh.
      this.blink = guardianBlink(t, this.theme);

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
    // Rigid free appendage rotations. No stationary duplicate limb is painted
    // beneath this skin; only the neck/shoulder attachment has a blend margin.
    if(this.theme===0){
      const wing=polygon([[60,40],[138,38],[248,127],[264,191],[315,224],[326,270],[301,338],[242,349],[138,296],[58,210]],50);
      add(314,258,'gesture',.60,wing);
      const head=polygon([[275,45],[302,0],[535,0],[548,192],[486,232],[432,250],[342,250],[289,213],[256,151]],20);
      add(381,246,'nod',1,head);
    }else{
      const cfg=this.theme===1?{edge:278,top:130,root:[288,314],head:[257,0,537,269],neck:[387,283]}
        :this.theme===2?{edge:267,top:149,root:[274,319],head:[248,0,546,257],neck:[385,278]}
        :{edge:252,top:94,root:[276,317],head:[251,0,538,226],neck:[376,247]};
      const arm=(x:number,y:number)=>{
        const edge=cfg.edge+Math.max(0,y-220)*.20;
        const panda=this.theme===3;
        return smooth((x-(panda?96:120))/(panda?46:22))
          *(1-smooth((x-edge+10)/(panda?48:16)))
          *smooth((y-cfg.top+(panda?40:10))/(panda?50:18))
          *(1-smooth((y-(panda?303:315))/(panda?40:28)));
      };
      add(cfg.root[0],cfg.root[1],'gesture',this.theme===3?.75:.65,arm);
      const [left,top,right,bottom]=cfg.head;
      const head=(x:number,y:number)=>smooth((x-left)/18)*(1-smooth((x-right+18)/18))*(1-smooth((y-bottom)/28));
      add(cfg.neck[0],cfg.neck[1],'nod',1,head);
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
