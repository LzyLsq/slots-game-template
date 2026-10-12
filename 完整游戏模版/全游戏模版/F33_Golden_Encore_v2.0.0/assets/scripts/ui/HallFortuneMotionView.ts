import { _decorator, Component, game, Game, Node, Sprite, SpriteFrame, UIOpacity, UITransform, Vec3 } from 'cc';
import { HallFortuneMotion, HALL_FORTUNE_GEOMETRY, HallMode } from './HallFortuneMotion';
const { ccclass } = _decorator;
type Token = { node: Node; alpha: UIOpacity; position: Vec3; scale: Vec3 };
type Exhibit = { icon: Node; base: Vec3; scale: Vec3; light: Token; coins: Token[] };
/** Animates artwork only. Touch rectangles, names and the generated hall's
 * architecture never scale/rotate. All effect sprites are existing generated art. */
@ccclass('HallFortuneMotionView')
export class HallFortuneMotionView extends Component {
  private motion?: HallFortuneMotion;
  private readonly exhibits: Exhibit[] = [];
  private hidden = false;
  private backgrounded = false;
  private disabledOnce = false;
  initialize(rooms: readonly { hit: Node; icon: Node }[], selected: HallMode, coin: SpriteFrame, light: SpriteFrame, reduced: boolean): void {
    this.motion = new HallFortuneMotion(selected, reduced);
    rooms.forEach(({ hit, icon }, i) => {
      const size = icon.getComponent(UITransform)!;
      // Preserve the actual original bottom edge, not the rectangle's center.
      const base = icon.position.clone(); base.y -= size.contentSize.height * .5;
      size.setAnchorPoint(.5, 0); icon.setPosition(base);
      const reflection = this.token(hit, light, `Mode ${i + 1} · pooled plinth reflection`, HALL_FORTUNE_GEOMETRY.lightWidth, HALL_FORTUNE_GEOMETRY.lightHeight);
      reflection.node.setPosition(0, base.y + 6, 0); reflection.node.setSiblingIndex(0);
      const coins = Array.from({ length: 3 }, (_, k) => this.token(hit, coin, `Mode ${i + 1} · pooled fortune coin ${k + 1}`, HALL_FORTUNE_GEOMETRY.coinSize, HALL_FORTUNE_GEOMETRY.coinSize));
      this.exhibits.push({ icon, base, scale: new Vec3(1, 1, 1), light: reflection, coins });
    });
    game.on(Game.EVENT_HIDE, this.onHide, this); game.on(Game.EVENT_SHOW, this.onShow, this);
    this.apply();
  }
  private token(parent: Node, frame: SpriteFrame, name: string, w: number, h: number): Token {
    const node = new Node(name); node.layer = parent.layer; node.setParent(parent);
    node.addComponent(UITransform).setContentSize(w, h);
    const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = frame;
    const alpha = node.addComponent(UIOpacity); alpha.opacity = 0;
    return { node, alpha, position: new Vec3(), scale: new Vec3(1, 1, 1) };
  }
  select(mode: HallMode, direction = 1): void { this.motion?.select(mode, direction); this.apply(); }
  press(mode: HallMode): void { this.motion?.press(mode); }
  release(mode: HallMode): void { this.motion?.release(mode); this.apply(); }
  setPresentationHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (hidden) this.motion?.suspend(); else if (this.enabledInHierarchy && !this.backgrounded) this.motion?.resume();
    this.apply();
  }
  private onHide(): void { this.backgrounded = true; this.motion?.suspend(); this.apply(); }
  private onShow(): void { this.backgrounded = false; if (!this.hidden && this.enabledInHierarchy) this.motion?.resume(); }
  protected onDisable(): void { this.disabledOnce = true; this.motion?.suspend(); this.apply(); }
  protected onEnable(): void { if (this.disabledOnce && !this.hidden && !this.backgrounded) this.motion?.resume(); this.disabledOnce = false; }
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.onHide, this); game.off(Game.EVENT_SHOW, this.onShow, this);
    this.exhibits.length = 0; this.motion = undefined;
  }
  protected update(dt: number): void { this.motion?.step(dt); this.apply(); }
  private apply(): void {
    if (!this.motion) return;
    for (let i = 0; i < this.exhibits.length; i++) {
      const view = this.exhibits[i], pose = this.motion.poses[i];
      if (!view.icon.isValid) continue;
      view.scale.set(pose.scaleX, pose.scaleY, 1); view.icon.setScale(view.scale); view.icon.angle = pose.angle;
      if (view.light.node.isValid) {
        view.light.alpha.opacity = Math.round(pose.light);
        view.light.scale.set(pose.lightScaleX, 1, 1); view.light.node.setScale(view.light.scale);
      }
      for (let k = 0; k < view.coins.length; k++) {
        const token = view.coins[k], p = pose.coins[k];
        if (!token.node.isValid) continue;
        token.alpha.opacity = Math.round(p.opacity);
        if (!p.opacity) continue;
        token.position.set(p.x, view.base.y + p.y, 0); token.node.setPosition(token.position);
        token.scale.set(p.scaleX, p.scaleY, 1); token.node.setScale(token.scale); token.node.angle = p.angle;
      }
    }
  }
}
