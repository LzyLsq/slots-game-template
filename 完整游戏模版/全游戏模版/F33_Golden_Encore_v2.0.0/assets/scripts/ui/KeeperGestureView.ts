import { _decorator, Component, game, Game, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { KeeperCue, KeeperMode } from './KeeperGesture';
import { KeeperSequence, MascotScene, MASCOT_ATLAS } from './KeeperSequence';
import { CAST_ATLAS } from './CastArt';
import { BlinkSequence } from './BlinkSequence';
import type { BlinkScene } from './BlinkArt';
const { ccclass } = _decorator;
/** Prebaked local arm gestures; the original generated expression stays unchanged.
 * Only a tiny registered eyelid patch blinks; mouth/brows/head never morph.
 * Fixed feet, fixed camera, fixed scale. No picture inflation, no UV warp,
 * no frame allocation in update, no touch handler / wallet writes here. */
@ccclass('KeeperGestureView')
export class KeeperGestureView extends Component {
  private timeline?: KeeperSequence;
  private frames: readonly SpriteFrame[] = [];
  private sprite?: Sprite;
  private current = -1;
  private blinkTimeline?: BlinkSequence;
  private blinkFrames: readonly SpriteFrame[] = [];
  private blinkSprite?: Sprite;
  private blinkCurrent = -1;
  private paused = false;
  private hiddenPresentation = false;
  private wasDisabled = false;
  initialize(frames: readonly SpriteFrame[], scene: MascotScene, mode: KeeperMode, reduced: boolean,
    sourceBounds: readonly [number, number, number, number], sourceScale: number): void {
    this.frames = frames;
    this.timeline = new KeeperSequence(scene, mode, reduced);
    const [left, top, right, bottom] = sourceBounds;
    const roleCast = scene === 'cabinet' || scene === 'prize';
    const atlas = roleCast ? CAST_ATLAS : MASCOT_ATLAS;
    const pad = roleCast ? 10 : 12;
    // A single contain scale owns every pose. Atlas padding is included;
    // feet are always 12px above each cell bottom; role art has its own dimensions.
    const fit = Math.min((right - left) / (atlas.width - pad * 2), (bottom - top) / (atlas.height - pad * 2));
    const child = new Node('Animated treasure keeper · articulated image sequence');
    child.layer = this.node.layer; child.setParent(this.node);
    const transform = child.addComponent(UITransform);
    transform.setAnchorPoint(.5, 0);
    transform.setContentSize(atlas.width * fit * sourceScale, atlas.height * fit * sourceScale);
    child.setPosition(((left + right) / 2 - 512) * sourceScale, (768 - bottom - pad * fit) * sourceScale, 0);
    this.sprite = child.addComponent(Sprite); this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.writeFrame(0);
    game.on(Game.EVENT_HIDE, this.onHide, this); game.on(Game.EVENT_SHOW, this.onShow, this);
  }
  /** An opaque, pixel-identical crop of the generated hall; only its paw differs
   * across frames. One cover scale owns plate and patch, including on resize. */
  initializeScenePatch(frames: readonly SpriteFrame[], mode: KeeperMode, reduced: boolean,
    sourcePatch: readonly [number, number, number, number], sourceScale: number): void {
    this.frames = frames; this.timeline = new KeeperSequence('hall', mode, reduced);
    const [x, y, width, height] = sourcePatch;
    const child = new Node('Integrated treasure keeper · source-registered paw');
    child.layer = this.node.layer; child.setParent(this.node);
    const transform = child.addComponent(UITransform); transform.setAnchorPoint(.5, .5);
    transform.setContentSize(width * sourceScale, height * sourceScale);
    child.setPosition((x + width / 2 - 512) * sourceScale, (768 - y - height / 2) * sourceScale, 0);
    this.sprite = child.addComponent(Sprite); this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.writeFrame(0);
    game.on(Game.EVENT_HIDE, this.onHide, this); game.on(Game.EVENT_SHOW, this.onShow, this);
  }
  /** Blink only. Fixed brows/nose/mouth, with the exact scene/cast transform. */
  initializeBlink(frames: readonly SpriteFrame[], scene: BlinkScene, mode: KeeperMode, reduced: boolean,
    sourceRect: readonly [number, number, number, number], sourceScale: number): void {
    if (!this.sprite || !frames.length) return;
    this.blinkFrames = frames; this.blinkTimeline = new BlinkSequence(scene, mode, reduced);
    const [x, y, width, height] = sourceRect;
    const hall = scene === 'hall';
    const parent = hall ? this.node : this.sprite.node;
    const unit = hall ? sourceScale : this.sprite.node.getComponent(UITransform)!.contentSize.width / CAST_ATLAS.width;
    const eye = new Node('Generated eyelids · relaxed independent blink');
    eye.layer = parent.layer; eye.setParent(parent);
    const transform = eye.addComponent(UITransform); transform.setAnchorPoint(.5, .5);
    transform.setContentSize(width * unit, height * unit);
    eye.setPosition(hall ? (x + width / 2 - 512) * unit : (x + width / 2 - CAST_ATLAS.width / 2) * unit,
      hall ? (768 - y - height / 2) * unit : (CAST_ATLAS.height - y - height / 2) * unit, 0);
    this.blinkSprite = eye.addComponent(Sprite); this.blinkSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.writeBlink(0);
  }
  cue(cue: KeeperCue): void {
    if (this.paused || this.hiddenPresentation) return;
    this.timeline?.cue(cue);
  }
  setPresentationHidden(hidden: boolean): void {
    this.hiddenPresentation = hidden;
    // Hold the current frame underneath overlays, rather than visibly resetting.
    if (hidden) { this.timeline?.suspend(); this.blinkTimeline?.suspend(); }
    else if (!this.paused) { this.timeline?.resume(); this.blinkTimeline?.resume(); }
  }
  private onHide(): void { this.paused = true; this.timeline?.suspend(); this.blinkTimeline?.suspend(); }
  private onShow(): void { this.paused = false; if (!this.hiddenPresentation) { this.timeline?.resume(); this.blinkTimeline?.resume(); } }
  protected onDisable(): void { this.wasDisabled = true; this.timeline?.suspend(); this.blinkTimeline?.suspend(); }
  protected onEnable(): void {
    if (this.wasDisabled && !this.paused && !this.hiddenPresentation) { this.timeline?.resume(); this.blinkTimeline?.resume(); }
    this.wasDisabled = false;
  }
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.onHide, this); game.off(Game.EVENT_SHOW, this.onShow, this);
    // Cached atlas frames are owned by the App, not by transient scene views.
    this.frames = []; this.sprite = undefined; this.timeline = undefined;
    this.blinkFrames = []; this.blinkSprite = undefined; this.blinkTimeline = undefined;
  }
  private writeFrame(index: number): void {
    if (!this.sprite || index === this.current) return;
    this.current = index; this.sprite.spriteFrame = this.frames[index];
  }
  private writeBlink(index: number): void {
    if (!this.blinkSprite || index === this.blinkCurrent) return;
    this.blinkCurrent = index; this.blinkSprite.spriteFrame = this.blinkFrames[index];
  }
  protected update(dt: number): void {
    if (!this.timeline || this.paused || this.hiddenPresentation) return;
    this.writeFrame(this.timeline.step(dt));
    if (this.blinkTimeline) this.writeBlink(this.blinkTimeline.step(dt));
  }
}
