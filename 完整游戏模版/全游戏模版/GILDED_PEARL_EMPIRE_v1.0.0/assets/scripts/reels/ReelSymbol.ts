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
  private sparkle!: Node;
  private sparkleOpacity!: UIOpacity;
  private baseScale = 1;
  private cellWidth = 164;
  private cellHeight = 164;
  private iconSize = 148;
  private spriteBaseY = 0;

  public initialize(width: number, height: number, atlas: SymbolAtlasSpec): void {
    this.atlas = atlas;
    this.cellWidth = Math.max(76, width); this.cellHeight = Math.max(76, height); this.iconSize = Math.max(72, Math.min(148, Math.min(this.cellWidth, this.cellHeight) * 0.84)); this.baseScale = 1; this.art = new Node('SymbolArt'); this.art.layer = Layers.Enum.UI_2D; this.art.addComponent(UITransform).setContentSize(this.cellWidth, this.cellHeight); this.node.addChild(this.art); this.graphics = this.art.addComponent(Graphics); this.art.addComponent(UIOpacity);
    const match = atlas.path.match(/game0([1-4])/); const themeIndex = Math.max(0, Math.min(3, Number(match?.[1] ?? 1) - 1)); const tileFrame = new Node('SymbolImageBorder'); tileFrame.layer = Layers.Enum.UI_2D; tileFrame.addComponent(UITransform).setContentSize(this.cellWidth + 2, this.cellHeight + 2); this.art.addChild(tileFrame); const frameSprite = tileFrame.addComponent(Sprite); frameSprite.sizeMode = Sprite.SizeMode.CUSTOM; frameSprite.type = Sprite.Type.SLICED; const frameOpacity = tileFrame.addComponent(UIOpacity); frameOpacity.opacity = 0;
    resources.load(`${TILE_FRAME_PATHS[themeIndex]}/texture`, Texture2D, (error, texture) => { if (error || !texture || !tileFrame.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const horizontal = Math.min(Math.round(texture.width * 0.18), 48); const vertical = Math.min(Math.round(texture.height * 0.34), 64); frame.insetLeft = horizontal; frame.insetRight = horizontal; frame.insetTop = vertical; frame.insetBottom = vertical; frameSprite.spriteFrame = frame; tween(frameOpacity).to(0.3, { opacity: 8 }).to(1.8, { opacity: 16 }, { easing: 'sineInOut' }).to(1.9, { opacity: 6 }, { easing: 'sineInOut' }).union().repeatForever().start(); });
    this.spriteBaseY = Math.min(8, this.cellHeight * 0.05); const image = new Node('PremiumSymbolImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(this.iconSize, this.iconSize); image.setPosition(0, this.spriteBaseY); this.art.addChild(image); this.sprite = image.addComponent(Sprite); this.sprite.sizeMode = Sprite.SizeMode.CUSTOM; this.spriteOpacity = image.addComponent(UIOpacity); this.spriteOpacity.opacity = 0;
    this.sparkle = new Node('SymbolSparkle'); this.sparkle.layer = Layers.Enum.UI_2D; this.sparkle.addComponent(UITransform).setContentSize(38, 38); this.sparkle.setPosition(this.iconSize * 0.24, this.spriteBaseY + this.iconSize * 0.24); this.art.addChild(this.sparkle); const sparkleGraphics = this.sparkle.addComponent(Graphics); sparkleGraphics.strokeColor = new Color(255, 251, 232, 245); sparkleGraphics.lineWidth = 2.4; sparkleGraphics.moveTo(-14, 0); sparkleGraphics.lineTo(14, 0); sparkleGraphics.moveTo(0, -14); sparkleGraphics.lineTo(0, 14); sparkleGraphics.stroke(); sparkleGraphics.strokeColor = new Color(255, 220, 116, 205); sparkleGraphics.lineWidth = 1.4; sparkleGraphics.moveTo(-8, -8); sparkleGraphics.lineTo(8, 8); sparkleGraphics.moveTo(-8, 8); sparkleGraphics.lineTo(8, -8); sparkleGraphics.stroke(); this.sparkleOpacity = this.sparkle.addComponent(UIOpacity); this.sparkleOpacity.opacity = 0;
    this.winGlow = new Node('WinGlow'); this.winGlow.layer = Layers.Enum.UI_2D; this.winGlow.addComponent(UITransform).setContentSize(this.cellWidth, this.cellHeight); this.art.addChild(this.winGlow); const winGraphics = this.winGlow.addComponent(Graphics); const glowInset = 5; const glowRadius = Math.max(10, Math.min(22, this.cellHeight * 0.14)); winGraphics.fillColor = new Color(255, 218, 93, 42); winGraphics.roundRect(-this.cellWidth / 2 + 2, -this.cellHeight / 2 + 2, this.cellWidth - 4, this.cellHeight - 4, glowRadius); winGraphics.fill(); winGraphics.strokeColor = new Color(255, 239, 161, 245); winGraphics.lineWidth = 5; winGraphics.roundRect(-this.cellWidth / 2 + glowInset, -this.cellHeight / 2 + glowInset, this.cellWidth - glowInset * 2, this.cellHeight - glowInset * 2, glowRadius - 2); winGraphics.stroke(); this.winGlowOpacity = this.winGlow.addComponent(UIOpacity); this.winGlowOpacity.opacity = 0;
    const energySize = Math.min(126, this.iconSize * 0.9); this.energyRing = new Node('EnergyRing'); this.energyRing.layer = Layers.Enum.UI_2D; this.energyRing.addComponent(UITransform).setContentSize(energySize, energySize); this.energyRing.setPosition(0, Math.min(8, this.cellHeight * 0.05)); this.art.addChild(this.energyRing); this.energyGraphics = this.energyRing.addComponent(Graphics); this.energyOpacity = this.energyRing.addComponent(UIOpacity); this.energyRing.active = false;
    const text = new Node('SymbolName'); text.layer = Layers.Enum.UI_2D; text.addComponent(UITransform).setContentSize(this.cellWidth - 12, Math.min(54, this.cellHeight * 0.32)); text.setPosition(0, -this.cellHeight * 0.32); this.node.addChild(text);
    const label = text.addComponent(Label); label.fontSize = 18; label.lineHeight = 20; label.isBold = true; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER; label.overflow = Label.Overflow.SHRINK; label.node.active = false; this.label = label;
    SymbolAtlasCache.load(atlas, () => { if (this.node && this.node.isValid) this.applyAtlasFrame(); });
  }

  public setSymbol(symbolId: string, display: string, color: Color): void {
    this.symbolId = symbolId; if (!this.graphics || !this.art) return;
    Tween.stopAllByTarget(this.art); Tween.stopAllByTarget(this.sprite.node); Tween.stopAllByTarget(this.energyRing); Tween.stopAllByTarget(this.energyOpacity); Tween.stopAllByTarget(this.sparkle); Tween.stopAllByTarget(this.sparkleOpacity); this.art.setScale(new Vec3(this.baseScale, this.baseScale, 1)); this.sprite.node.setScale(Vec3.ONE); this.sprite.node.setPosition(0, this.spriteBaseY); this.sprite.node.angle = 0; this.art.angle = 0; this.energyRing.angle = 0; this.energyOpacity.opacity = 0; this.sparkle.setScale(Vec3.ONE); this.sparkle.angle = 0; this.sparkleOpacity.opacity = 0;
    const graphics = this.graphics; graphics.clear();
    const special = symbolId === 'wild' || symbolId === 'scatter' || symbolId === 'bonus';
    const high = special || ['crown', 'chalice', 'orrery', 'guardian', 'seal', 'seven', 'double-bar', 'reactor', 'core'].includes(symbolId);
    // Reel cells are intentionally transparent: the cabinet aperture and its
    // extended backdrop remain visible behind every symbol.
    const base = special ? new Color(255, 232, 193, 0) : high ? new Color(255, 241, 216, 0) : new Color(255, 249, 235, 0);
    const halfWidth = this.cellWidth / 2; const halfHeight = this.cellHeight / 2; const haloRadius = Math.min(this.iconSize * 0.39, Math.min(halfWidth, halfHeight) - 8);
    graphics.fillColor = base; graphics.rect(-halfWidth - 0.5, -halfHeight - 0.5, this.cellWidth + 1, this.cellHeight + 1); graphics.fill(); graphics.strokeColor = special ? new Color(205, 137, 32, 125) : new Color(166, 102, 37, 42); graphics.lineWidth = special ? 2 : 1; graphics.rect(-halfWidth + 1, -halfHeight + 1, this.cellWidth - 2, this.cellHeight - 2); graphics.stroke();
    graphics.fillColor = new Color(255, 255, 255, high ? 18 : 12); graphics.rect(-halfWidth + 4, halfHeight - 20, this.cellWidth - 8, 14); graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, special ? 190 : 125); graphics.lineWidth = 2; graphics.moveTo(-halfWidth + 12, halfHeight - 9); graphics.lineTo(halfWidth - 22, halfHeight - 9); graphics.stroke();
    graphics.strokeColor = new Color(142, 76, 31, 68); graphics.lineWidth = 2; graphics.moveTo(halfWidth - 8, -halfHeight + 18); graphics.lineTo(-halfWidth + 18, -halfHeight + 18); graphics.stroke();
    graphics.fillColor = new Color(color.r, color.g, color.b, 9); graphics.circle(0, 7, haloRadius); graphics.fill(); graphics.strokeColor = new Color(219, 166, 58, special ? 205 : 88); graphics.lineWidth = 1.5; graphics.circle(0, 7, haloRadius * 0.78); graphics.stroke();
    if (!this.applyAtlasFrame()) this.drawEmblem(graphics, symbolId, color);
    if (this.label) { this.label.string = display.replace('\n', ' '); this.label.color = special ? new Color(126, 35, 35) : new Color(92, 51, 29); }
    this.energyRing.active = special;
    if (special) {
      const energy = this.energyGraphics; energy.clear(); energy.strokeColor = new Color(color.r, color.g, color.b, 205); energy.lineWidth = 4; energy.arc(0, 0, 55, 0.18, 2.15, false); energy.stroke(); energy.strokeColor = new Color(255, 239, 171, 175); energy.lineWidth = 2; energy.arc(0, 0, 61, 3.38, 5.42, false); energy.stroke();
      tween(this.energyRing).by(2.4, { angle: -360 }).repeatForever().start(); tween(this.energyOpacity).to(0.75, { opacity: 235 }, { easing: 'sineInOut' }).to(0.95, { opacity: 115 }, { easing: 'sineInOut' }).union().repeatForever().start();
    }
    this.startIdleMotion(special, high);
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
    tween(this.sprite.node).to(0.16, { scale: new Vec3(1.12, 1.12, 1), position: new Vec3(0, this.spriteBaseY + 5, 0) }).to(0.28, { scale: Vec3.ONE, position: new Vec3(0, this.spriteBaseY, 0) }, { easing: 'backOut' }).union().repeat(3).call(() => this.startIdleMotion(this.symbolId === 'wild' || this.symbolId === 'scatter' || this.symbolId === 'bonus', true)).start();
  }

  private startIdleMotion(special: boolean, high: boolean): void {
    if (!this.sprite?.node?.isValid || !this.sparkle?.isValid) return;
    Tween.stopAllByTarget(this.sprite.node); Tween.stopAllByTarget(this.sparkle); Tween.stopAllByTarget(this.sparkleOpacity);
    const hash = [...this.symbolId].reduce((value, char) => value * 31 + char.charCodeAt(0), this.node.getSiblingIndex() + 17); const phase = Math.abs(hash % 9); const direction = hash % 2 === 0 ? 1 : -1; const lift = special ? 4.5 : high ? 3.2 : 2.2; const grow = special ? 1.034 : high ? 1.022 : 1.014; const duration = 1.35 + phase * 0.09;
    this.sprite.node.setPosition(0, this.spriteBaseY); this.sprite.node.setScale(Vec3.ONE); this.sprite.node.angle = 0;
    tween(this.sprite.node).delay(phase * 0.055).to(duration, { position: new Vec3(0, this.spriteBaseY + lift, 0), scale: new Vec3(grow, grow, 1), angle: direction * (special ? 1.1 : 0.55) }, { easing: 'sineInOut' }).to(duration * 0.92, { position: new Vec3(0, this.spriteBaseY - lift * 0.36, 0), scale: new Vec3(0.996, 0.996, 1), angle: -direction * 0.38 }, { easing: 'sineInOut' }).to(duration * 0.54, { position: new Vec3(0, this.spriteBaseY, 0), scale: Vec3.ONE, angle: 0 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const sparkleDelay = 0.7 + phase * 0.21; const sparkleRest = 2.2 + phase * 0.16; this.sparkle.setScale(new Vec3(0.42, 0.42, 1)); this.sparkle.angle = direction * 12; this.sparkleOpacity.opacity = 0;
    tween(this.sparkle).delay(sparkleDelay).to(0.2, { scale: new Vec3(1.12, 1.12, 1), angle: -direction * 18 }, { easing: 'quadOut' }).to(0.34, { scale: new Vec3(0.72, 0.72, 1), angle: direction * 8 }, { easing: 'sineInOut' }).delay(sparkleRest).union().repeatForever().start();
    tween(this.sparkleOpacity).delay(sparkleDelay).to(0.12, { opacity: special ? 245 : high ? 215 : 170 }, { easing: 'quadOut' }).to(0.42, { opacity: 0 }, { easing: 'quadIn' }).delay(sparkleRest).union().repeatForever().start();
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
