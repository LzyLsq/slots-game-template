import { _decorator, Color, Component, Game, game, Graphics, Layers, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { ThemeMotion } from './ThemeMotion';
const { ccclass } = _decorator;

/** Artwork-normalised glints, measured on fixed cabinet reliefs. No hit nodes. */
@ccclass('CabinetReliefGlow')
export class CabinetReliefGlow extends Component {
  public static attach(node: Node, points: readonly (readonly number[])[], seed = 0): void {
    const old = node.getComponent(ThemeMotion);
    if (old) {
      old.enabled = false; old.destroy();
      const sprite = node.getComponent(Sprite); if (sprite) sprite.customMaterial = null;
    }
    const glow = node.getComponent(CabinetReliefGlow) || node.addComponent(CabinetReliefGlow);
    if (!glow.lights.length) glow.setup(points, seed);
  }
  private lights: { node: Node; opacity: UIOpacity; phase: number; period: number }[] = [];
  private time = 0;
  private hidden = false;
  private reduced = false;
  private media?: MediaQueryList;
  private preference = (): void => { this.reduced = !!this.media?.matches; this.apply(); };
  protected onLoad(): void {
    this.media = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.media?.addEventListener?.('change', this.preference);
    game.on(Game.EVENT_HIDE, this.hide, this); game.on(Game.EVENT_SHOW, this.show, this);
    this.preference();
  }
  private setup(points: readonly (readonly number[])[], seed: number): void {
    const ui = this.node.getComponent(UITransform)!;
    for (const [i, p] of points.entries()) {
      const n = new Node('Fixed relief jewel glint'); n.layer = Layers.Enum.UI_2D;
      // UITransform bounds serve rendering only: no event listener or input blocker.
      n.addComponent(UITransform).setContentSize(1, 1);
      n.setPosition((p[0] - ui.anchorX) * ui.width, (1 - ui.anchorY - p[1]) * ui.height);
      this.node.addChild(n);
      const g = n.addComponent(Graphics), size = Math.min(ui.width, ui.height) * (p[2] || .009);
      g.fillColor = new Color('#FFF5D5');
      for (let j = 0; j < 8; j++) {
        const a = j * Math.PI / 4, r = j % 2 ? size * .18 : size;
        if (j) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.close(); g.fill();
      this.lights.push({ node: n, opacity: n.addComponent(UIOpacity), phase: seed * .7 + i * 1.4, period: 3.8 + i * .43 });
    }
    this.apply();
  }
  private apply(): void {
    for (const light of this.lights) {
      // Fixed jewels shimmer at different times; nothing drifts over the reels.
      const pulse = this.reduced ? 0 : Math.pow(Math.max(0, Math.sin(this.time * 2 * Math.PI / light.period + light.phase)), 6);
      light.opacity.opacity = Math.round(210 * pulse);
      light.node.setScale(.35 + pulse * .85, .35 + pulse * .85, 1);
    }
  }
  private hide(): void { this.hidden = true; }
  private show(): void { this.hidden = false; }
  protected update(dt: number): void {
    if (this.hidden || this.reduced) return;
    this.time += Math.min(.08, Math.max(0, dt)); this.apply();
  }
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.hide, this); game.off(Game.EVENT_SHOW, this.show, this);
    this.media?.removeEventListener?.('change', this.preference); this.lights = [];
  }
}
