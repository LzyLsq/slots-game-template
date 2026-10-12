import { _decorator, Component, Color, Label, Node, Rect, Size, Sprite, SpriteFrame, UIOpacity, Vec2 } from 'cc';
import { ModeEntryLoading, MODE_ENTRY_THEMES } from './ModeEntryLoading';
import { tr } from './Language';
const { ccclass } = _decorator;
/** Owns only a cropped generated gold fill and one small emblem glint. Scene
 * character gestures/lanterns belong to the existing source-registered views. */
@ccclass('ModeEntryLoadingView')
export class ModeEntryLoadingView extends Component {
  private fillFrame?: SpriteFrame;
  private motion?: ModeEntryLoading;
  private fill?: Sprite;
  private caption?: Label;
  private emblem?: Node;
  private glint?: Node;
  private glintAlpha?: UIOpacity;
  private copy = '';
  initialize(motion: ModeEntryLoading, fill: Sprite, caption: Label, emblem: Node, glint: Node, gold: SpriteFrame): void {
    this.motion = motion; this.fill = fill; this.caption = caption; this.emblem = emblem; this.glint = glint;
    this.glintAlpha = glint.getComponent(UIOpacity) || glint.addComponent(UIOpacity);
    // Inner gold light only: the ornate border never gets sliced by progress.
    this.fillFrame = new SpriteFrame(); this.fillFrame.texture = gold.texture;
    this.fillFrame.rect = new Rect(96, 180, 324, 188); this.fillFrame.originalSize = new Size(324, 188);
    this.fillFrame.offset = new Vec2(); this.fillFrame.packable = false;
    fill.spriteFrame = this.fillFrame; fill.color = new Color(MODE_ENTRY_THEMES[motion.mode].tint);
    this.apply();
  }
  apply(): void {
    if (!this.motion || !this.fill || !this.caption || !this.emblem || !this.glint || !this.glintAlpha) return;
    const theme = MODE_ENTRY_THEMES[this.motion.mode];
    const copy = this.motion.phase === 'preparing' ? `${tr(theme.preparing)} ${this.motion.progress.percent}%` : tr(theme.entering);
    if (this.copy !== copy) { this.copy = copy; this.caption.string = copy; }
    this.fill.fillRange = this.motion.progress.value;
    const p = this.motion.pose;
    this.emblem.setPosition(-300 + p.x, p.y, 0); this.emblem.angle = p.angle;
    this.glint.setPosition(-300 + p.x + p.glintX, p.y + p.glintY, 0); this.glintAlpha.opacity = p.glintAlpha;
  }
  protected onDestroy(): void {
    this.fillFrame?.destroy(); this.fillFrame = undefined; this.motion = undefined;
    this.fill = undefined; this.caption = undefined; this.emblem = undefined; this.glint = undefined; this.glintAlpha = undefined;
  }
}
