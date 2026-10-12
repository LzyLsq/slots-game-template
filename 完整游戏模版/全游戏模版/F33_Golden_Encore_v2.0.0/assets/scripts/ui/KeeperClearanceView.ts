import { _decorator, Component, Node, Sprite, UIOpacity, UITransform, Vec3 } from 'cc';
import { ClearRect, protectionOpacity } from './KeeperClearance';
const { ccclass } = _decorator;
type ProtectedParticle = { gate: Node; image: Node; alpha: UIOpacity; radius: number };
/** Award particles keep their native animation/fade on an inner image. This
 * independent outer gate follows the REAL backdrop transform, including its
 * breathing zoom, so neither coins nor rays can cover generated keeper art. */
@ccclass('KeeperClearanceView')
export class KeeperClearanceView extends Component {
  private backdrop?: Node;
  private backdropTransform?: UITransform;
  private rects: readonly ClearRect[] = [];
  private particles: ProtectedParticle[] = [];
  private point = new Vec3();
  private sourceWidth = 1024;
  private sourceHeight = 1536;
  initialize(backdrop: Node, rects: readonly ClearRect[]): void {
    this.backdrop = backdrop; this.backdropTransform = backdrop.getComponent(UITransform)!; this.rects = rects;
    const frame = backdrop.getComponent(Sprite)!.spriteFrame!;
    this.sourceWidth = frame.rect.width; this.sourceHeight = frame.rect.height;
  }
  add(gate: Node, image: Node, width: number, height: number): void {
    const entry = { gate, image, alpha: gate.addComponent(UIOpacity), radius: Math.hypot(width, height) / 2 };
    this.particles.push(entry); this.check(entry);
  }
  private check(entry: ProtectedParticle): void {
    if (!this.backdrop?.isValid || !this.backdropTransform) return;
    this.backdropTransform.convertToNodeSpaceAR(entry.image.worldPosition, this.point);
    const s = this.backdropTransform.contentSize.width / this.sourceWidth;
    // A bounding circle includes all possible coin/beam rotations and scale.
    const worldScale = Math.max(Math.abs(entry.image.worldScale.x), Math.abs(entry.image.worldScale.y));
    const backdropScale = Math.min(Math.abs(this.backdrop.worldScale.x), Math.abs(this.backdrop.worldScale.y));
    const radius = entry.radius * worldScale / (backdropScale * s);
    entry.alpha.opacity = Math.round(protectionOpacity(this.rects, this.point.x / s + this.sourceWidth / 2,
      this.sourceHeight / 2 - this.point.y / s, radius) * 255);
  }
  protected lateUpdate(): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      if (!p.gate.isValid) { this.particles.splice(i, 1); continue; }
      // Each gate owns exactly one animated image. Prune the wrapper with it;
      // the native particle tween continues to own the child's transform.
      if (!p.image.isValid) { p.gate.destroy(); this.particles.splice(i, 1); continue; }
      this.check(p);
    }
  }
  protected onDestroy(): void { this.particles.length = 0; this.backdrop = undefined; this.backdropTransform = undefined; }
}
