import { _decorator, Color, Component, Graphics, Label, Layers, Node, resources, Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { SymbolAtlasCache, type SymbolAtlasSpec } from './SymbolAtlasCache';
const { ccclass } = _decorator;
const TILE_FRAME_PATHS = [
  'generated/common/button_frame_astral_v01', 'generated/common/button_frame_golden_v01',
  'generated/common/button_frame_neon_v01', 'generated/common/button_frame_cosmic_v01',
] as const;
@ccclass('ReelSymbol')
export class ReelSymbol extends Component {
  private symbolId = '';
  private art!: Node;
  private graphics!: Graphics;
  private label?: Label;
  private sprite!: Sprite;
  private spriteOpacity!: UIOpacity;
  private atlas!: SymbolAtlasSpec;
  private energyRing!: Node;
  private energyGraphics!: Graphics;
  private energyOpacity!: UIOpacity;
  private winGlow!: Node;
  private winGlowOpacity!: UIOpacity;

  public initialize(height: number, atlas: SymbolAtlasSpec): void {
    this.atlas = atlas;
    this.art = new Node('SymbolArt'); this.art.layer = Layers.Enum.UI_2D; this.art.addComponent(UITransform).setContentSize(164, height); this.node.addChild(this.art); this.graphics = this.art.addComponent(Graphics); this.art.addComponent(UIOpacity);
    const match = atlas.path.match(/game0([1-4])/); const themeIndex = Math.max(0, Math.min(3, Number(match?.[1] ?? 1) - 1)); const tileFrame = new Node('SymbolImageBorder'); tileFrame.layer = Layers.Enum.UI_2D; tileFrame.addComponent(UITransform).setContentSize(162, 162); this.art.addChild(tileFrame); const frameSprite = tileFrame.addComponent(Sprite); frameSprite.sizeMode = Sprite.SizeMode.CUSTOM; frameSprite.type = Sprite.Type.SLICED; const frameOpacity = tileFrame.addComponent(UIOpacity); frameOpacity.opacity = 0;
    // Cabinet reel apertures are intentionally compact. Compressing the old
    // ornamental nine-slice into an 80-110px mechanical cell collapses its
    // opaque corners into a dark square, so the physical reel glass supplies
    // the frame at cabinet scale. Retain the ornament only for larger layouts.
    tileFrame.active = height >= 145;
    if (tileFrame.active) resources.load(`${TILE_FRAME_PATHS[themeIndex]}/texture`, Texture2D, (error, texture) => { if (error || !texture || !tileFrame.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const horizontal = Math.min(Math.round(texture.width * 0.18), 48); const vertical = Math.min(Math.round(texture.height * 0.34), 64); frame.insetLeft = horizontal; frame.insetRight = horizontal; frame.insetTop = vertical; frame.insetBottom = vertical; frameSprite.spriteFrame = frame; tween(frameOpacity).to(0.3, { opacity: 112 }).to(1.8, { opacity: 146 }, { easing: 'sineInOut' }).to(1.9, { opacity: 96 }, { easing: 'sineInOut' }).union().repeatForever().start(); });
    const image = new Node('PremiumSymbolImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(148, 148); image.setPosition(0, 9); this.art.addChild(image); this.sprite = image.addComponent(Sprite); this.sprite.sizeMode = Sprite.SizeMode.CUSTOM; this.spriteOpacity = image.addComponent(UIOpacity); this.spriteOpacity.opacity = 0;
    this.winGlow = new Node('WinGlow'); this.winGlow.layer = Layers.Enum.UI_2D; this.winGlow.addComponent(UITransform).setContentSize(164, 164); this.art.addChild(this.winGlow); const winGraphics = this.winGlow.addComponent(Graphics); winGraphics.fillColor = new Color(255, 218, 93, 42); winGraphics.roundRect(-77, -77, 154, 154, 26); winGraphics.fill(); winGraphics.strokeColor = new Color(255, 239, 161, 245); winGraphics.lineWidth = 6; winGraphics.roundRect(-73, -73, 146, 146, 23); winGraphics.stroke(); this.winGlowOpacity = this.winGlow.addComponent(UIOpacity); this.winGlowOpacity.opacity = 0;
    this.energyRing = new Node('EnergyRing'); this.energyRing.layer = Layers.Enum.UI_2D; this.energyRing.addComponent(UITransform).setContentSize(126, 126); this.energyRing.setPosition(0, 10); this.art.addChild(this.energyRing); this.energyGraphics = this.energyRing.addComponent(Graphics); this.energyOpacity = this.energyRing.addComponent(UIOpacity); this.energyRing.active = false;
    const text = new Node('SymbolName'); text.layer = Layers.Enum.UI_2D; text.addComponent(UITransform).setContentSize(148, 54); text.setPosition(0, -height * 0.29); this.node.addChild(text);
    const label = text.addComponent(Label); label.fontSize = 18; label.lineHeight = 20; label.isBold = true; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER; label.overflow = Label.Overflow.SHRINK; this.label = label;
    // Physical cabinet windows use tighter cells than the former full-screen
    // web layout. The generated symbol artwork already contains its identity;
    // hiding the redundant caption keeps compact reels legible and prevents
    // labels from crossing the glass dividers.
    text.active = height >= 145;
    SymbolAtlasCache.load(atlas, () => { if (this.node && this.node.isValid) this.applyAtlasFrame(); });
  }

  public setSymbol(symbolId: string, display: string, color: Color): void {
    this.symbolId = symbolId; if (!this.graphics || !this.art) return;
    Tween.stopAllByTarget(this.art); Tween.stopAllByTarget(this.energyRing); Tween.stopAllByTarget(this.energyOpacity); this.art.setScale(Vec3.ONE); this.art.angle = 0; this.energyRing.angle = 0; this.energyOpacity.opacity = 0;
    const graphics = this.graphics; graphics.clear();
    const special = symbolId === 'wild' || symbolId === 'scatter' || symbolId === 'bonus';
    const high = special || ['crown', 'chalice', 'orrery', 'guardian', 'seal', 'seven', 'double-bar', 'reactor', 'core'].includes(symbolId);
    const base = special ? new Color(127, 24, 45, 252) : high ? new Color(255, 224, 205, 252) : new Color(255, 247, 226, 252);
    graphics.fillColor = base; graphics.roundRect(-78, -78, 156, 156, 24); graphics.fill(); graphics.strokeColor = color; graphics.lineWidth = special ? 5 : 2; graphics.roundRect(-75, -75, 150, 150, 21); graphics.stroke();
    graphics.fillColor = new Color(255, 255, 255, special ? 25 : 82); graphics.roundRect(-68, 42, 136, 24, 12); graphics.fill();
    graphics.strokeColor = new Color(255, 247, 215, special ? 165 : 210); graphics.lineWidth = 3; graphics.moveTo(-58, 62); graphics.lineTo(48, 62); graphics.quadraticCurveTo(65, 62, 65, 46); graphics.stroke();
    graphics.strokeColor = new Color(102, 55, 31, 95); graphics.lineWidth = 4; graphics.moveTo(65, -40); graphics.quadraticCurveTo(65, -64, 42, -64); graphics.lineTo(-45, -64); graphics.stroke();
    graphics.fillColor = new Color(color.r, color.g, color.b, special ? 52 : 28); graphics.circle(0, 10, 58); graphics.fill(); graphics.strokeColor = new Color(210, 156, 70, special ? 235 : 165); graphics.lineWidth = 2; graphics.circle(0, 10, 48); graphics.stroke();
    if (!this.applyAtlasFrame()) this.drawEmblem(graphics, symbolId, color);
    if (this.label) { this.label.string = display.replace('\n', ' '); this.label.color = special ? new Color(255, 238, 188) : new Color(92, 48, 32); }
    this.energyRing.active = special;
    if (special) {
      const energy = this.energyGraphics; energy.clear(); energy.strokeColor = new Color(color.r, color.g, color.b, 205); energy.lineWidth = 4; energy.arc(0, 0, 55, 0.18, 2.15, false); energy.stroke(); energy.strokeColor = new Color(255, 239, 171, 175); energy.lineWidth = 2; energy.arc(0, 0, 61, 3.38, 5.42, false); energy.stroke();
      tween(this.art).to(0.9, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' }).to(0.9, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
      tween(this.energyRing).by(2.4, { angle: -360 }).repeatForever().start(); tween(this.energyOpacity).to(0.75, { opacity: 235 }, { easing: 'sineInOut' }).to(0.95, { opacity: 115 }, { easing: 'sineInOut' }).union().repeatForever().start();
    }
  }

  private applyAtlasFrame(): boolean {
    if (!this.sprite || !this.atlas || !this.symbolId) return false;
    const frame = SymbolAtlasCache.frame(this.atlas, this.symbolId); if (!frame) { this.spriteOpacity.opacity = 0; return false; }
    this.sprite.spriteFrame = frame; this.spriteOpacity.opacity = 255; return true;
  }

  public playWin(): void {
    Tween.stopAllByTarget(this.winGlow); Tween.stopAllByTarget(this.winGlowOpacity); Tween.stopAllByTarget(this.sprite.node);
    this.winGlow.setScale(new Vec3(0.86, 0.86, 1)); this.winGlowOpacity.opacity = 0;
    tween(this.winGlow).to(0.22, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' }).to(0.3, { scale: Vec3.ONE }).union().repeat(3).start();
    tween(this.winGlowOpacity).to(0.12, { opacity: 255 }).to(0.38, { opacity: 35 }).union().repeat(3).call(() => { this.winGlowOpacity.opacity = 0; }).start();
    tween(this.sprite.node).to(0.16, { scale: new Vec3(1.12, 1.12, 1) }).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).union().repeat(3).start();
  }

  private drawEmblem(graphics: Graphics, id: string, color: Color): void {
    graphics.fillColor = color; graphics.strokeColor = new Color(255, 245, 207, 220); graphics.lineWidth = 3;
    const hash = [...id].reduce((value, char) => value + char.charCodeAt(0), 0);
    const mode = id === 'bonus' ? 1 : id === 'wild' ? 4 : id === 'scatter' ? 3 : hash % 5;
    if (mode === 0) {
      graphics.moveTo(0, 58); graphics.lineTo(42, 8); graphics.lineTo(0, -38); graphics.lineTo(-42, 8); graphics.close(); graphics.fill(); graphics.stroke();
      graphics.strokeColor = new Color(255, 255, 255, 180); graphics.moveTo(0, 52); graphics.lineTo(0, -30); graphics.moveTo(-36, 8); graphics.lineTo(36, 8); graphics.stroke();
    } else if (mode === 1) {
      graphics.circle(0, 10, 42); graphics.fill(); graphics.stroke(); graphics.fillColor = baseShade(color); graphics.circle(0, 10, 27); graphics.fill(); graphics.strokeColor = new Color(255, 245, 207, 200); graphics.circle(0, 10, 18); graphics.stroke();
    } else if (mode === 2) {
      for (let index = 0; index < 8; index += 1) { const a = Math.PI * 2 * index / 8; const b = a + Math.PI / 8; const r1 = 52; const r2 = 22; const x1 = Math.cos(a) * r1; const y1 = Math.sin(a) * r1 + 10; const x2 = Math.cos(b) * r2; const y2 = Math.sin(b) * r2 + 10; if (index === 0) graphics.moveTo(x1, y1); else graphics.lineTo(x1, y1); graphics.lineTo(x2, y2); } graphics.close(); graphics.fill(); graphics.stroke();
    } else if (mode === 3) {
      graphics.roundRect(-45, -32, 90, 84, 14); graphics.fill(); graphics.stroke(); graphics.fillColor = baseShade(color); graphics.roundRect(-29, -17, 58, 54, 10); graphics.fill(); graphics.strokeColor = new Color(255, 245, 207, 210); graphics.moveTo(-20, 10); graphics.lineTo(20, 10); graphics.moveTo(0, -8); graphics.lineTo(0, 28); graphics.stroke();
    } else {
      const points = 5; for (let index = 0; index < points * 2; index += 1) { const angle = -Math.PI / 2 + Math.PI * index / points; const radius = index % 2 === 0 ? 50 : 22; const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius + 10; if (index === 0) graphics.moveTo(x, y); else graphics.lineTo(x, y); } graphics.close(); graphics.fill(); graphics.stroke();
    }
  }

  public get id(): string { return this.symbolId; }
}

function baseShade(color: Color): Color { return new Color(Math.round(color.r * 0.22), Math.round(color.g * 0.25), Math.round(color.b * 0.32), 255); }
