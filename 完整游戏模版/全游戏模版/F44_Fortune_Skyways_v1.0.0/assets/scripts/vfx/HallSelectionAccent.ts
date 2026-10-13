import { _decorator, Color, Component, Label, Mask, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { SalonArt, box, COLORS, opacity } from '../ui/SalonArt';
const { ccclass } = _decorator;

/** Positive selection light on the authored medallion and its gold seat. */
@ccclass('HallSelectionAccent')
export class HallSelectionAccent extends Component {
  public selected = false;
  public reducedMotion = false;
  private weight = 0;
  private elapsed = 0;
  private seat?: UIOpacity;
  private sweep?: Node;
  private sweepAlpha?: UIOpacity;
  private glints: UIOpacity[] = [];
  private caption?: Label;
  private readonly restingInk = new Color(COLORS.cream);
  private readonly selectedInk = new Color('#FFE19B');
  private readonly ink = new Color();

  public setup(art: SalonArt, face: Node, caption: Label, reducedMotion: boolean): void {
    this.caption = caption;
    this.reducedMotion = reducedMotion;
    // The small painted seat lives under the ornament, above the caption.
    // It never shades the room or becomes a rectangular card around the entry.
    const seat = art.selectionRail(this.node, 0, -37, 166);
    seat.name = 'Selected gilded medallion seat';
    seat.setSiblingIndex(0);
    this.seat = opacity(seat, 0);

    const shape = face.getComponent(UITransform)!;
    const clip = box(face, 'Medallion silhouette reflection', 0, 0, shape.width, shape.height);
    const mask = clip.addComponent(Mask);
    mask.type = Mask.Type.SPRITE_STENCIL;
    mask.spriteFrame = face.getComponent(Sprite)!.spriteFrame;
    mask.alphaThreshold = .15;
    this.sweep = art.light(clip, 0, -86, 0, 108, 108, 0);
    this.sweep.name = 'Selected metal sheen';
    this.sweep.setScale(.44, 1.45, 1);
    this.sweep.angle = -18;
    this.sweepAlpha = this.sweep.getComponent(UIOpacity)!;

    for (const [x, y] of [[-42, 26], [42, -17]]) {
      const light = art.light(face, 0, x, y, 31, 31, 0);
      light.name = 'Selected inset gold reflection';
      this.glints.push(light.getComponent(UIOpacity)!);
    }
    this.paint();
  }

  public select(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    if (value) this.elapsed = 0;
    if (this.reducedMotion) this.weight = value ? 1 : 0;
    this.paint();
  }

  protected update(dt: number): void {
    if (!this.seat || (!this.selected && this.weight === 0)) return;
    const target = this.selected ? 1 : 0;
    // A bounded fade retains continuity when a swipe is reversed mid-change.
    this.weight += Math.sign(target - this.weight) * Math.min(Math.abs(target - this.weight), dt / .22);
    if (!this.reducedMotion && this.weight > 0) this.elapsed += dt;
    this.paint();
  }

  private paint(): void {
    if (!this.seat || !this.caption || !this.sweep || !this.sweepAlpha) return;
    const phase = this.elapsed % 5.4;
    const breath = this.reducedMotion ? 1 : .92 + .08 * Math.cos(this.elapsed * Math.PI / 2.6);
    this.seat.opacity = Math.round(245 * this.weight * breath);
    // The only moving light is alpha-clipped to the existing ornament pixels.
    const progress = Math.min(1, phase / 1.45);
    this.sweep.setPosition(-86 + 172 * progress, 0, 0);
    this.sweepAlpha.opacity = this.reducedMotion || phase >= 1.45 ? 0 : Math.round(145 * this.weight * Math.sin(Math.PI * progress));
    this.glints.forEach((a, i) => {
      const shimmer = this.reducedMotion ? .62 : .35 + .65 * Math.pow(Math.max(0, Math.sin(this.elapsed * 1.3 + i * 2.1)), 2);
      a.opacity = Math.round(170 * this.weight * shimmer);
    });
    Color.lerp(this.ink, this.restingInk, this.selectedInk, this.weight);
    this.caption.color = this.ink;
  }
}
