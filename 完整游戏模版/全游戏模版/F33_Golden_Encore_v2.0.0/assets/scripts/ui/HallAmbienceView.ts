import { _decorator, Color, Component, game, Game, Node, Rect, Size, Sprite, SpriteFrame, UIOpacity, UITransform, Vec2, Vec3 } from 'cc';
import { HallAmbienceMotion, HALL_AMBIENT_COIN_SIZE, HALL_AMBIENCE_PROFILES, HALL_LIGHT_CORE, type HallAmbientPose } from './HallAmbienceMotion';
import type { HallMode } from './HallFortuneMotion';
const { ccclass } = _decorator;
type Binding = { node: Node; alpha: UIOpacity; position: Vec3; scale: Vec3 };
/** Room-attached, bounded layer. Generated light/coin raster only; no touches,
 * timers, per-frame creation, screen-space overlays or changes to the keeper. */
@ccclass('HallAmbienceView')
export class HallAmbienceView extends Component {
  private motion?: HallAmbienceMotion;
  private glows: Binding[] = [];
  private coins: Binding[] = [];
  private lightCore?: SpriteFrame;
  private sourceScale = 1;
  private hidden = false;
  private backgrounded = false;
  initialize(mode: HallMode, coin: SpriteFrame, light: SpriteFrame, scale: number, reduced: boolean): void {
    if (this.motion) return;
    this.sourceScale = scale; this.motion = new HallAmbienceMotion(mode, reduced);
    // The source light has a broad transparent margin. Register its luminous
    // center once, so a 60px light is visibly 60px rather than a tiny speck.
    this.lightCore = new SpriteFrame(); this.lightCore.texture = light.texture;
    this.lightCore.rect = new Rect(...HALL_LIGHT_CORE);
    this.lightCore.originalSize = new Size(HALL_LIGHT_CORE[2], HALL_LIGHT_CORE[3]);
    this.lightCore.offset = new Vec2(); this.lightCore.packable = false;
    const tint = new Color(HALL_AMBIENCE_PROFILES[mode].tint);
    this.glows = this.motion.fixtures.map((f,i) => this.token(this.lightCore!, `Hall ${mode} · ${f.kind} ${i}`,f.width,f.height,tint));
    this.coins = this.motion.coins.map((_,i) => this.token(coin, `Hall ${mode} · gold current ${i}`,HALL_AMBIENT_COIN_SIZE,HALL_AMBIENT_COIN_SIZE));
    game.on(Game.EVENT_HIDE,this.onHide,this); game.on(Game.EVENT_SHOW,this.onShow,this);
    this.apply();
  }
  private token(frame: SpriteFrame, name: string, w: number, h: number, tint?: Color): Binding {
    const node = new Node(name); node.layer = this.node.layer; node.setParent(this.node);
    node.addComponent(UITransform).setContentSize(w*this.sourceScale,h*this.sourceScale);
    const sprite=node.addComponent(Sprite); sprite.sizeMode=Sprite.SizeMode.CUSTOM; sprite.spriteFrame=frame;
    if(tint) sprite.color=tint;
    const alpha=node.addComponent(UIOpacity); alpha.opacity=0;
    return { node,alpha,position:new Vec3(),scale:new Vec3(1,1,1) };
  }
  setPresentationHidden(hidden: boolean): void { this.hidden=hidden; this.syncSuspension(); }
  private onHide(): void { this.backgrounded=true; this.syncSuspension(); }
  private onShow(): void { this.backgrounded=false; this.syncSuspension(); }
  private syncSuspension(): void {
    if(this.hidden || this.backgrounded || !this.enabledInHierarchy) this.motion?.suspend(); else this.motion?.resume();
  }
  protected onEnable(): void { this.syncSuspension(); }
  protected onDisable(): void { this.motion?.suspend(); }
  protected update(dt: number): void { if (!this.motion) return; this.motion.step(dt); this.apply(); }
  private apply(): void {
    if(!this.motion) return;
    for(let i=0;i<this.glows.length;i++)this.applyPose(this.glows[i],this.motion.glows[i]);
    for(let i=0;i<this.coins.length;i++)this.applyPose(this.coins[i],this.motion.coins[i]);
  }
  private applyPose(b: Binding, p: HallAmbientPose): void {
    if(!b.node.isValid)return;
    b.alpha.opacity=Math.round(p.alpha);
    if(!p.alpha)return;
    b.position.set((p.x-512)*this.sourceScale,(768-p.y)*this.sourceScale,0); b.node.setPosition(b.position);
    b.scale.set(p.scaleX,p.scaleY,1);b.node.setScale(b.scale);b.node.angle=p.angle;
  }
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE,this.onHide,this);game.off(Game.EVENT_SHOW,this.onShow,this);
    this.glows.length=0;this.coins.length=0;this.motion=undefined;this.lightCore?.destroy();this.lightCore=undefined;
  }
}
