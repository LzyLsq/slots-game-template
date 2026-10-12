import { _decorator, Component, Game, game, Layers, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { sampleCaravanCatPose } from './CaravanCatPose';
const { ccclass } = _decorator;

/** Only the F17 first hall card uses this independently layered mascot.
 * There is no duplicated baked cat, UV warp, moving background or touch handler.
 * Shares six SpriteFrames from one 768x512 alpha atlas; owns no materials/timers.
 */
@ccclass('CaravanCatRig')
export class CaravanCatRig extends Component {
  private chest?: Node;
  private head?: Node;
  private tail?: Node;
  private ear?: Node;
  private tassel?: Node;
  private face?: Sprite;
  private frames: readonly SpriteFrame[] = [];
  private time = 0;
  private hidden = false;
  private reduced = false;
  private media?: MediaQueryList;
  private readPreference = (): void => { this.reduced = !!this.media?.matches; this.apply(); };

  protected onLoad(): void {
    this.media = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.media?.addEventListener?.('change', this.readPreference);
    game.on(Game.EVENT_HIDE, this.hide, this);
    game.on(Game.EVENT_SHOW, this.show, this);
    this.readPreference();
  }

  public setup(frames: readonly SpriteFrame[]): void {
    if (this.chest || frames.length !== 6) return;
    this.frames = frames;
    // Coordinates use the original 599px square. The surrounding card mask,
    // press animation and stable input surface are still owned by SalonArt.
    const size = this.node.getComponent(UITransform)!;
    const canvas = this.group(this.node, 'Living orange cat', 0, 0);
    canvas.setScale(size.width / 599, size.height / 599, 1);
    const feetX = 268.5, feetY = 528;
    this.tail = this.group(canvas, 'Tail base', 191 - 299.5, 299.5 - 508);
    this.visual(this.tail, 'Independent tail', frames[3], -45, 63, 136, 154);
    this.chest = this.group(canvas, 'Grounded paws · breathing chest', feetX - 299.5, 299.5 - feetY);
    this.visual(this.chest, 'Torso and paws', frames[0], 0, 126, 237, 252);
    this.head = this.group(this.chest, 'Neck pivot', 299 - feetX, feetY - 333);
    this.ear = this.group(this.head, 'Ear base', -7, 176);
    this.visual(this.ear, 'Independent exposed ear', frames[4], 0, 35, 80, 78);
    this.face = this.visual(this.head, 'Open face · blink face', frames[1], 0, 99, 270, 246);
    this.tassel = this.group(this.head, 'Turban tassel attachment', 90.5, 54);
    this.visual(this.tassel, 'Soft tassel follow-through', frames[5], 0, -59.5, 33, 119);
    this.apply();
  }

  private group(parent: Node, name: string, x: number, y: number): Node {
    const n = new Node(name); n.layer = Layers.Enum.UI_2D;
    n.addComponent(UITransform).setContentSize(599, 599);
    n.setPosition(x, y); parent.addChild(n); return n;
  }

  private visual(parent: Node, name: string, frame: SpriteFrame, x: number, y: number, w: number, h: number): Sprite {
    const n = this.group(parent, name, x, y); n.getComponent(UITransform)!.setContentSize(w, h);
    const sprite = n.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = frame;
    return sprite;
  }

  private apply(): void {
    if (!this.chest || !this.head || !this.tail || !this.ear || !this.tassel || !this.face) return;
    const pose = sampleCaravanCatPose(this.time, this.reduced);
    this.chest.setScale(pose.chestX, pose.chestY, 1);
    this.head.angle = pose.headAngle;
    this.tail.angle = pose.tailAngle;
    this.ear.angle = pose.earAngle;
    this.tassel.angle = pose.tasselAngle;
    const frame = this.frames[pose.blink ? 2 : 1];
    if (this.face.spriteFrame !== frame) this.face.spriteFrame = frame;
  }

  private hide(): void { this.hidden = true; }
  private show(): void { this.hidden = false; this.readPreference(); }
  protected update(dt: number): void {
    if (this.hidden || this.reduced) return;
    this.time += Math.min(.08, Math.max(0, dt)); this.apply();
  }
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.hide, this); game.off(Game.EVENT_SHOW, this.show, this);
    this.media?.removeEventListener?.('change', this.readPreference);
    this.frames = []; this.media = undefined; this.face = undefined;
    this.chest = this.head = this.tail = this.ear = this.tassel = undefined;
  }
}
