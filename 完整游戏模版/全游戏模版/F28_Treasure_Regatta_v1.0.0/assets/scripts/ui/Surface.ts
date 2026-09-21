import { Node, UITransform, Sprite, SpriteFrame, Label, Color, Layers, tween, Tween, Vec3, Vec4, Material, EffectAsset, EventTouch, UIOpacity, LabelOutline } from 'cc';

type Lustre = { material: Material; values: Vec4; elapsed: number; period: number; pulse: number; lit: boolean; strength: number };
const lustres = new WeakMap<Node, Lustre>();
type CaptionState = { label: Label; enabled: Color; disabled: Color; material: Sprite };
const captionStates = new WeakMap<Node, CaptionState>();
let controlEffect: EffectAsset | null = null;
export function configureControlLustre(effect: EffectAsset): void { controlEffect = effect; }
/** One short, staggered reflection, then a long quiet rest. No nodes or hot-path allocations. */
export function tickButtonLustre(n: Node, dt: number, reduced: boolean, enabled: boolean): void {
  const s = lustres.get(n); if (!s) return;
  if (reduced || !enabled) {
    if (s.lit) { s.values.y = 0; s.material.setProperty('reflection', s.values); s.lit = false; }
    s.pulse = -1; return;
  }
  s.elapsed = (s.elapsed + dt) % s.period;
  if (s.pulse >= 0) { s.pulse += dt; if (s.pulse > 1.25) s.pulse = -1; }
  const t = s.pulse >= 0 ? s.pulse : s.elapsed;
  if (t < 1.25) {
    const p = t / 1.25;
    s.values.x = -0.22 + p * 1.66;
    s.values.y = Math.sin(p * Math.PI) * (s.pulse >= 0 ? .48 : .34) * s.strength;
    s.material.setProperty('reflection', s.values); s.lit = true;
  } else if (s.lit) { s.values.y = 0; s.material.setProperty('reflection', s.values); s.lit = false; }
}

export const INK = new Color(64, 43, 28);
export function node(parent: Node, name: string, x = 0, y = 0, w = 1, h = 1): Node {
  const n = new Node(name); n.layer = Layers.Enum.UI_2D; parent.addChild(n);
  n.addComponent(UITransform).setContentSize(w, h); n.setPosition(x, y); return n;
}
export function image(parent: Node, frame: SpriteFrame, x: number, y: number, w: number, h: number, name = 'Artwork'): Node {
  const n = node(parent, name, x, y, w, h); const s = n.addComponent(Sprite);
  // Sprite applies its native texture dimensions when assigned in TRIMMED mode.
  // Select CUSTOM first, then restore the intended layout after assignment.
  s.sizeMode = Sprite.SizeMode.CUSTOM; s.spriteFrame = frame;
  n.getComponent(UITransform)!.setContentSize(w, h); return n;
}
export function text(parent: Node, value: string, x: number, y: number, width: number, size = 32, color = INK, height = 64): Label {
  const n = node(parent, 'Text', x, y, width, height); const l = n.addComponent(Label);
  l.string = value; l.fontSize = size; l.lineHeight = size * 1.22; l.color = color;
  l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
  l.overflow = Label.Overflow.SHRINK; l.enableWrapText = true; l.isBold = true; l.cacheMode = Label.CacheMode.CHAR;
  n.getComponent(UITransform)!.setContentSize(width, height);
  return l;
}
export function outlined(l: Label, width = 3): Label {
  const o = l.node.addComponent(LabelOutline); o.color = new Color(76, 48, 28, 210); o.width = width; return l;
}
export type ControlFeel = 'press' | 'helm' | 'winder' | 'rocker' | 'step';
export interface ControlFace {
  feel?: ControlFeel;
  /** Material response, independent from the control's functional role. */
  touchMaterial?: 'brass' | 'nacre' | 'jade' | 'water';
  labelX?: number;
  labelY?: number;
  labelWidth?: number;
  fontSize?: number;
  /** Force pearl/water/lever labels to a high-contrast enamel treatment. */
  lightLabel?: boolean;
  hitHeight?: number;
  sliced?: boolean;
  contain?: boolean;
  /** Gentle material lift for bright enamel controls; dark engraved edges remain intact. */
  finishLift?: number;
  /** Warms only the dark translucent fringe left by illustrated lobby controls. */
  shadowLift?: number;
  /** Scales only the travelling reflection, not the whole button. */
  lustreStrength?: number;
  reduced?: () => boolean;
}
/** Transform only the visual child: touch target remains stable during a jelly press. */
export function button(parent: Node, frame: SpriteFrame, caption: string, x: number, y: number, w: number, h: number,
  action: () => void, enabled: () => boolean = () => true, light = false, face: ControlFace = {}): Node {
  const target = node(parent, caption || 'Button', x, y, w, face.hitHeight ?? Math.max(h, 150));
  const art = node(target, 'Button surface', 0, 0, w, h);
  // Cocos nine-slice insets are fixed local pixels, not percentages of target height.
  // Scale a native-height material inside the press carrier so the sculpted clasp
  // keeps its aspect ratio at every size; only its blank center gains width.
  const materialScale = face.sliced ? h / frame.rect.height : 1;
  const fit = face.contain ? Math.min(w / frame.rect.width, h / frame.rect.height) : 0;
  const material = image(art, frame, 0, 0, fit ? frame.rect.width * fit : w / materialScale, fit ? frame.rect.height * fit : h / materialScale, 'Material');
  if (face.sliced) { material.getComponent(Sprite)!.type = Sprite.Type.SLICED; material.setScale(materialScale, materialScale); }
  if (controlEffect) {
    // Atlas UVs must remain stable, including the nine-sliced ornamental endcaps.
    frame.packable = false;
    const finish = new Material(); finish.initialize({effectAsset: controlEffect, defines: {USE_TEXTURE: true}});
    const r = frame.rect, texture = frame.texture;
    finish.setProperty('atlasRect', new Vec4(r.x / texture.width, r.y / texture.height, r.width / texture.width, r.height / texture.height));
    material.getComponent(Sprite)!.customMaterial = finish;
    let seed = 0; for (let i = 0; i < caption.length; i++) seed = (seed * 31 + caption.charCodeAt(i)) >>> 0;
    const values = new Vec4(-1, 0, .18, face.finishLift ?? 0); finish.setProperty('reflection', values);
    finish.setProperty('tone', new Vec4(face.shadowLift ?? 0, 0, 0, 0));
    lustres.set(target, {material: finish, values, elapsed: 1.5 + seed % 57 / 10, period: 7.5 + seed % 31 / 10, pulse: -1, lit: false, strength: face.lustreStrength ?? 1});
    target.once(Node.EventType.NODE_DESTROYED, () => { lustres.delete(target); finish.destroy(); });
  }
  const labelIsLight = face.lightLabel ?? light;
  const label = text(art, caption, face.labelX ?? 0, face.labelY ?? 2, face.labelWidth ?? w * .78,
    face.fontSize ?? Math.min(44, h * .48), labelIsLight ? Color.WHITE : INK, Math.min(h * .66, 78));
  // Hardware captions are single-line engravings. Wrapping short words such as
  // TURBO into two rows makes the control look broken, so let SHRINK preserve
  // the line inside the per-control safe zone instead.
  label.enableWrapText = false;
  art.addComponent(UIOpacity);
  if (labelIsLight) {
    // Control copy needs separation from enamel, not a drop-shadow silhouette.
    // A translucent one-pixel warm keyline stays crisp while letting the
    // sculpted button art provide all of the physical depth.
    const outline = label.node.addComponent(LabelOutline);
    outline.color = new Color(72, 50, 34, 188); outline.width = 2;
  } else {
    // Keep dark engraved lettering optically cut into the face. The previous
    // high-opacity ivory rim read as a pale shadow around every caption.
    const outline = label.node.addComponent(LabelOutline);
    // Pale plaques need a firm, warm keyline so captions remain readable over
    // illustrated highlights at both phone sizes and during the button lustre.
    outline.color = new Color(255, 247, 218, 218); outline.width = 2;
  }
  captionStates.set(target, {
    label,
    enabled: labelIsLight ? new Color(255, 255, 255, 255) : new Color(64, 43, 28, 255),
    disabled: labelIsLight ? new Color(244, 242, 225, 255) : new Color(118, 101, 82, 255),
    material: material.getComponent(Sprite)!,
  });
  target.once(Node.EventType.NODE_DESTROYED, () => captionStates.delete(target));
  let pointer = -1, sx = 0, sy = 0, cancelled = false;
  // Dense hardware has short travel; nacre/water keys have a softer release.
  const motion = face.touchMaterial === 'brass' ? {x:.985,y:.96,drop:3,down:.055,up:.14}
    : face.touchMaterial === 'nacre' ? {x:1.012,y:.94,drop:4,down:.08,up:.24}
    : face.touchMaterial === 'jade' ? {x:.992,y:.975,drop:5,down:.07,up:.16}
    : face.touchMaterial === 'water' ? {x:1.018,y:.93,drop:3,down:.075,up:.26}
    : null;
  const releaseVisual = () => {
    Tween.stopAllByTarget(art);
    if (face.reduced?.()) { art.setScale(Vec3.ONE); art.setPosition(0, 0); art.angle = 0; return; }
    // The helm seats into its socket; the rocker tilts; the bet keys have short travel.
    // None of these transforms ever move the input rectangle or postpone the action.
    tween(art).to(motion?.up ?? (face.feel === 'step' ? .12 : .19), { scale: Vec3.ONE, position: Vec3.ZERO, angle: 0 }, { easing: 'backOut' }).start();
  };
  target.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
    if (pointer !== -1 || !enabled()) return;
    pointer = e.getID() ?? -1; const p = e.getUILocation(); sx = p.x; sy = p.y; cancelled = false;
    const feel = face.feel ?? 'press';
    Tween.stopAllByTarget(art);
    if (face.reduced?.()) { art.setPosition(0, -3); return; }
    tween(art).to(motion?.down ?? .065, {
      scale: new Vec3(motion?.x ?? (feel === 'helm' ? .985 : .97), motion?.y ?? (feel === 'helm' ? .95 : .94), 1),
      position: new Vec3(0, -(motion?.drop ?? (feel === 'step' ? 3 : 5)), 0),
      angle: feel === 'rocker' ? -2 : feel === 'winder' ? 1 : 0,
    }, { easing: 'sineOut' }).start();
  });
  target.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
    if (e.getID() !== pointer) return; const p = e.getUILocation();
    if (!cancelled && Math.hypot(p.x - sx, p.y - sy) > 26) { cancelled = true; releaseVisual(); }
  });
  const release = (e: EventTouch, cancel = false) => {
    if (e.getID() !== pointer) return; pointer = -1;
    releaseVisual();
    if (!cancel && !cancelled && enabled()) {
      const shine = lustres.get(target); if (shine && !face.reduced?.()) shine.pulse = 0;
      action();
    }
  };
  target.on(Node.EventType.TOUCH_END, (e: EventTouch) => release(e));
  target.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => release(e, true));
  return target;
}
/** Disabled material remains visible; its hit target never shifts or receives a success response. */
export function buttonState(n: Node, enabled: boolean): void {
  const art = n.getChildByName('Button surface');
  // Physical hardware must remain opaque. Fading the complete carrier exposed
  // the cabinet artwork beneath it and made the controls look transparent.
  // Disabled state is now expressed with a matte material tint, muted caption
  // and no reflection pulse; geometry and material opacity remain unchanged.
  if (art) art.getComponent(UIOpacity)!.opacity = 255;
  const state = captionStates.get(n);
  if (state) {
    state.material.color = enabled ? Color.WHITE : new Color(222, 218, 203, 255);
    state.label.color = enabled ? state.enabled : state.disabled;
  }
}
/** Stretch only the flat center of the brass plaque, not its decorative ends. */
export function panel(parent: Node, frame: SpriteFrame, w: number, h: number): Node {
  const n = image(parent, frame, 0, 0, w, h, 'Inlaid panel');
  n.getComponent(Sprite)!.type = Sprite.Type.SLICED;
  return n;
}
export function fadeIn(n: Node, reduced: boolean): void {
  if (reduced) return; const o = n.addComponent(UIOpacity); o.opacity = 0;
  tween(o).to(.24, { opacity: 255 }, { easing: 'sineOut' }).start();
}
