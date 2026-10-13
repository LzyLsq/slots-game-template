import { _decorator, Component, Game, game, Layers, Node, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { CANOPY_BLINKS, CanopyBlinkSpec } from './CanopyBlinkData';
const { ccclass } = _decorator;

/** Local eyelid overlays; the complete original painting is never deformed. */
@ccclass('CanopyBlinkRig')
export class CanopyBlinkRig extends Component {
  private static texture?: Texture2D;
  private static pending?: Promise<void>;
  private static cached = new Map<string, readonly SpriteFrame[]>();
  public static async prepare(names: readonly string[]): Promise<void> {
    if (this.texture || !names.some(name => CANOPY_BLINKS.some(s => s.art === name))) return;
    if (!this.pending) this.pending = new Promise<Texture2D>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Eyelid atlas load timed out')), 8000);
      resources.load('art/canopy-blink-eyelids-v1/texture', Texture2D, (error, texture) => {
        clearTimeout(timeout); if (error) reject(error); else resolve(texture);
      });
    }).then(texture => {
      texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
      this.texture = texture;
    }).finally(() => { this.pending = undefined; });
    // This optional cosmetic asset must not prevent login or entering a game.
    try { await this.pending; } catch (error) { console.warn('Blink unavailable; keeping original artwork', error); }
  }
  public static attach(sprite: Sprite, art: string, index = -1): void {
    const spec = CANOPY_BLINKS.find(s => s.art === art && s.index === index);
    if (!spec || !this.texture) return;
    (sprite.node.getComponent(CanopyBlinkRig) || sprite.node.addComponent(CanopyBlinkRig)).setup(spec);
  }
  private canvas?: Node;
  private eyes: { sprite: Sprite; frames: readonly SpriteFrame[] }[] = [];
  private wait = 2;
  private elapsed = -1;
  private shown = -1;
  private doubleBlink = false;
  private hidden = false;
  private reduced = false;
  private media?: MediaQueryList;
  private preference = (): void => {
    this.reduced = !!this.media?.matches;
    this.reset();
  };
  protected onLoad(): void {
    this.media = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.media?.addEventListener?.('change', this.preference);
    game.on(Game.EVENT_HIDE, this.hide, this);
    game.on(Game.EVENT_SHOW, this.show, this);
    this.preference();
  }
  private setup(spec: CanopyBlinkSpec): void {
    this.canvas?.destroy(); this.eyes = [];
    const ui = this.node.getComponent(UITransform)!;
    const canvas = new Node('Registered eyelids only'); canvas.layer = Layers.Enum.UI_2D;
    canvas.addComponent(UITransform).setContentSize(1, 1);
    canvas.setParent(this.node);
    canvas.setPosition(-ui.anchorX * ui.width, (1 - ui.anchorY) * ui.height);
    canvas.setScale(ui.width / spec.canvas[0], ui.height / spec.canvas[1], 1);
    this.canvas = canvas;
    for (const [i, eye] of spec.eyes.entries()) {
      const key = eye.frames.toString();
      let frames = CanopyBlinkRig.cached.get(key);
      if (!frames) {
        frames = eye.frames.map(rect => {
          const frame = new SpriteFrame(); frame.texture = CanopyBlinkRig.texture!;
          frame.rect = new Rect(rect[0], rect[1], rect[2], rect[3]);
          frame.originalSize = new Size(rect[2], rect[3]); frame.packable = false;
          return frame;
        });
        CanopyBlinkRig.cached.set(key, frames);
      }
      const [x, y, w, h] = eye.rect;
      const node = new Node('Eyelid ' + i); node.layer = Layers.Enum.UI_2D;
      node.addComponent(UITransform).setContentSize(w, h);
      node.setParent(canvas); node.setPosition(x + w / 2, -y - h / 2);
      const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      sprite.spriteFrame = frames[0]; node.active = false;
      this.eyes.push({ sprite, frames });
    }
    this.reset();
    this.wait = 1.4 + Math.random() * 3.6; // Stagger visible characters on first entry.
  }
  private display(frame: number): void {
    if (this.shown === frame) return;
    this.shown = frame;
    for (const eye of this.eyes) {
      eye.sprite.node.active = frame >= 0;
      if (frame >= 0) eye.sprite.spriteFrame = eye.frames[frame];
    }
  }
  private reset(): void {
    this.display(-1); this.elapsed = -1; this.wait = 3.5 + Math.random() * 3.5;
    this.doubleBlink = false;
  }
  private hide(): void { this.hidden = true; this.reset(); }
  private show(): void { this.hidden = false; this.preference(); }
  protected onDisable(): void { this.reset(); }
  protected update(dt: number): void {
    if (this.hidden || this.reduced || !this.eyes.length) return;
    dt = Math.min(.08, Math.max(0, dt));
    if (this.elapsed < 0) {
      this.wait -= dt;
      if (this.wait > 0) return;
      this.elapsed = 0; this.doubleBlink = Math.random() < .12;
    }
    this.elapsed += dt;
    // Both eyes share the shutter sequence; only characters have separate clocks.
    if (this.elapsed < .035) this.display(0);
    else if (this.elapsed < .125) this.display(1);
    else if (this.elapsed < .165) this.display(0);
    else {
      this.display(-1);
      if (this.doubleBlink && this.elapsed < .29) return;
      if (this.doubleBlink) { this.doubleBlink = false; this.elapsed = 0; }
      else this.reset();
    }
  }
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.hide, this);
    game.off(Game.EVENT_SHOW, this.show, this);
    this.media?.removeEventListener?.('change', this.preference);
    this.eyes = []; this.media = undefined; this.canvas = undefined;
  }
}
