import { _decorator, Component, Game, game, Layers, Node, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { LIVING_MASCOTS, LivingMascotSpec } from './LivingMascotData';
import { ThemeMotion } from './ThemeMotion';
import { ArticulatedMascot } from './ArticulatedMascot';
const { ccclass } = _decorator;

/** Registered cutout heads. Scenery, torso, layout and input nodes remain fixed. */
@ccclass('LivingMascotRig')
export class LivingMascotRig extends Component {
  private static texture?: Texture2D;
  private static pending?: Promise<void>;
  private static cached = new Map<string, readonly SpriteFrame[]>();
  public static async prepare(names: readonly string[]): Promise<void> {
    if (!names.some(name => LIVING_MASCOTS.some(s => s.art === name))) return;
    if (this.texture) return;
    if (!this.pending) this.pending = new Promise<Texture2D>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Mascot atlas load timed out')), 20000);
      resources.load('art/living-mascot-parts/texture', Texture2D, (error, texture) => {
        clearTimeout(timer); if (error) reject(error); else resolve(texture);
      });
    }).then(texture => {
      texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
      this.texture = texture;
    }).then(() => { this.pending = undefined; }, error => {
      this.pending = undefined; throw error;
    });
    // A missing optional animation atlas must not block entering the game.
    try { await this.pending; } catch (error) { console.warn('Mascot animation unavailable; using original artwork', error); }
  }
  public static file(name: string): string {
    return this.texture && LIVING_MASCOTS.some(s => s.art === name) ? name + '-live-bg' : name;
  }
  public static attach(sprite: Sprite, art: string, index = -1): boolean {
    const specs = LIVING_MASCOTS.filter(s => s.art === art && s.index === index);
    if (!this.texture || !specs.length) {
      sprite.node.getComponent(LivingMascotRig)?.clear(); return false;
    }
    const rig = sprite.node.getComponent(LivingMascotRig) || sprite.node.addComponent(LivingMascotRig);
    const painted = sprite.node.getComponent(ThemeMotion);
    if (painted) { painted.enabled = false; sprite.customMaterial = null; painted.destroy(); }
    rig.setup(specs); return true;
  }
  public static contains(node: Node): boolean {
    return !!node.getComponent(LivingMascotRig)?.parts.length || node.children.some(child => this.contains(child));
  }
  private parts: { canvas: Node; pivot: Node; face: Sprite; frames: readonly SpriteFrame[]; spec: LivingMascotSpec }[] = [];
  private artKey = '';
  private time = 0;
  private hidden = false;
  private reduced = false;
  private media?: MediaQueryList;
  private preference = (): void => { this.reduced = !!this.media?.matches; this.apply(); };
  protected onLoad(): void {
    this.media = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.media?.addEventListener?.('change', this.preference);
    game.on(GameHide, this.hide, this); game.on(GameShow, this.show, this); this.preference();
  }
  private setup(specs: readonly LivingMascotSpec[]): void {
    const key = specs.map(s => s.art + ':' + s.index).join('|');
    if (this.artKey === key && this.parts.length) return;
    this.clear(); this.artKey = key; this.time = 0;
    const ui = this.node.getComponent(UITransform)!;
    for (const spec of specs) {
      const [cw, ch] = spec.canvas, [x, y, w, h] = spec.rect, [px, py] = spec.pivot;
      const canvas = this.group(this.node, 'Registered mascot canvas', -ui.anchorX * ui.width, (1 - ui.anchorY) * ui.height);
      canvas.setScale(ui.width / cw, ui.height / ch, 1);
      const pivot = this.group(canvas, 'Mascot neck pivot', px, -py);
      const faceNode = this.group(pivot, 'Independent face and both ears', x + w / 2 - px, py - y - h / 2);
      faceNode.getComponent(UITransform)!.setContentSize(w, h);
      const key = spec.frames.toString();
      let frames = LivingMascotRig.cached.get(key);
      if (!frames) {
        frames = spec.frames.map(b => {
          const f = new SpriteFrame(); f.texture = LivingMascotRig.texture!;
          f.rect = new Rect(b[0], b[1], b[2], b[3]); f.originalSize = new Size(b[2], b[3]); f.packable = false; return f;
        }); LivingMascotRig.cached.set(key, frames);
      }
      const face = faceNode.addComponent(ArticulatedMascot); face.sizeMode = Sprite.SizeMode.CUSTOM; face.spriteFrame = frames[0];
      face.setBones(spec.bones);
      this.parts.push({ canvas, pivot, face, frames, spec });
    }
    this.apply();
  }
  private clear(): void {
    for (const part of this.parts) { part.canvas.active = false; part.canvas.destroy(); }
    this.parts = []; this.artKey = '';
  }
  private group(parent: Node, name: string, x: number, y: number): Node {
    const node = new Node(name); node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(1, 1); node.setPosition(x, y); parent.addChild(node); return node;
  }
  private apply(): void {
    for (const { pivot, face, frames, spec } of this.parts) {
      const t = this.time, phase = spec.phase;
      // Preserve the source expression: closed-eye smiles tilt but never blink.
      pivot.angle = this.reduced ? 0 : spec.angle * (Math.sin(t * 2 * Math.PI / spec.period + phase) - Math.sin(phase)) * .16;
      (face as ArticulatedMascot).setPose(t, this.reduced);
      const blinkTime = (t + phase) % (4.9 + spec.period * .12);
      const canBlink = spec.eyeState === 'open' && spec.blinkEnabled === true && spec.blinkSafe === true;
      const blink = canBlink && !this.reduced && (blinkTime > 4.15 && blinkTime < 4.29);
      const frame = frames[blink ? 1 : 0]; if (face.spriteFrame !== frame) face.spriteFrame = frame;
    }
  }
  private hide(): void { this.hidden = true; }
  private show(): void { this.hidden = false; this.preference(); }
  protected update(dt: number): void {
    if (this.hidden || this.reduced) return;
    this.time += Math.min(.08, Math.max(0, dt)); this.apply();
  }
  protected onDestroy(): void {
    game.off(GameHide, this.hide, this); game.off(GameShow, this.show, this);
    this.media?.removeEventListener?.('change', this.preference); this.parts = []; this.media = undefined;
  }
}
const GameHide = Game.EVENT_HIDE, GameShow = Game.EVENT_SHOW;
