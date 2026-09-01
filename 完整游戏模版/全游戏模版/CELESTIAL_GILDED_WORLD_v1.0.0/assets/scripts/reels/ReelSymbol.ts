import { _decorator, Color, Component, Graphics, Layers, Node, Sprite, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { SymbolAtlasCache, type SymbolAtlasSpec } from './SymbolAtlasCache';

const { ccclass } = _decorator;

@ccclass('ReelSymbol')
export class ReelSymbol extends Component {
  private symbolId = '';
  private visual!: Node;
  private art!: Node;
  private graphics!: Graphics;
  private sprite!: Sprite;
  private spriteOpacity!: UIOpacity;
  private atlas!: SymbolAtlasSpec;
  private energyRing!: Node;
  private energyGraphics!: Graphics;
  private energyOpacity!: UIOpacity;
  private winGlow!: Node;
  private winGlowOpacity!: UIOpacity;

  public initialize(width: number, height: number, atlas: SymbolAtlasSpec): void {
    this.atlas = atlas;

    // The reel glass is the tile. Symbols therefore stay as large transparent
    // cut-outs instead of sitting inside a second dark card with a caption.
    this.visual = new Node('SymbolVisual');
    this.visual.layer = Layers.Enum.UI_2D;
    this.visual.addComponent(UITransform).setContentSize(156, 160);
    this.node.addChild(this.visual);
    // Fit inside the physical cells baked into each cabinet. Generated drum
    // rails remain visible instead of being covered by oversized artwork.
    const visualScale = Math.max(0.46, Math.min(1.05, width / 176, height / 176));
    this.visual.setScale(new Vec3(visualScale, visualScale, 1));

    this.art = new Node('SymbolArt');
    this.art.layer = Layers.Enum.UI_2D;
    this.art.addComponent(UITransform).setContentSize(176, 176);
    this.visual.addChild(this.art);
    this.graphics = this.art.addComponent(Graphics);
    this.art.addComponent(UIOpacity);

    const image = new Node('PremiumSymbolImage');
    image.layer = Layers.Enum.UI_2D;
    image.addComponent(UITransform).setContentSize(176, 176);
    this.art.addChild(image);
    this.sprite = image.addComponent(Sprite);
    this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.spriteOpacity = image.addComponent(UIOpacity);
    this.spriteOpacity.opacity = 0;

    this.winGlow = new Node('WinGlow');
    this.winGlow.layer = Layers.Enum.UI_2D;
    this.winGlow.addComponent(UITransform).setContentSize(182, 182);
    this.art.addChild(this.winGlow);
    const winGraphics = this.winGlow.addComponent(Graphics);
    winGraphics.fillColor = new Color(255, 215, 92, 34);
    winGraphics.circle(0, 0, 76);
    winGraphics.fill();
    winGraphics.strokeColor = new Color(255, 246, 195, 248);
    winGraphics.lineWidth = 6;
    winGraphics.circle(0, 0, 72);
    winGraphics.stroke();
    winGraphics.strokeColor = new Color(230, 126, 69, 220);
    winGraphics.lineWidth = 2;
    winGraphics.circle(0, 0, 81);
    winGraphics.stroke();
    this.winGlowOpacity = this.winGlow.addComponent(UIOpacity);
    this.winGlowOpacity.opacity = 0;

    this.energyRing = new Node('EnergyRing');
    this.energyRing.layer = Layers.Enum.UI_2D;
    this.energyRing.addComponent(UITransform).setContentSize(168, 168);
    this.art.addChild(this.energyRing);
    this.energyGraphics = this.energyRing.addComponent(Graphics);
    this.energyOpacity = this.energyRing.addComponent(UIOpacity);
    this.energyRing.active = false;

    SymbolAtlasCache.load(atlas, () => {
      if (this.node && this.node.isValid) this.applyAtlasFrame();
    });
  }

  public setSymbol(symbolId: string, _display: string, color: Color): void {
    this.symbolId = symbolId;
    if (!this.graphics || !this.art) return;
    Tween.stopAllByTarget(this.art);
    Tween.stopAllByTarget(this.energyRing);
    Tween.stopAllByTarget(this.energyOpacity);
    this.art.setScale(Vec3.ONE);
    this.art.angle = 0;
    this.energyRing.angle = 0;
    this.energyOpacity.opacity = 0;

    const graphics = this.graphics;
    graphics.clear();
    const special = symbolId === 'wild' || symbolId === 'scatter' || symbolId === 'bonus';
    const high = special || ['crown', 'chalice', 'orrery', 'guardian', 'seal', 'seven', 'double-bar', 'reactor', 'core'].includes(symbolId);

    // A soft floor shadow and restrained jewel halo keep transparent art
    // readable on ivory reel glass without restoring the old boxed-card look.
    graphics.fillColor = new Color(82, 40, 24, high ? 18 : 11);
    graphics.circle(0, -10, high ? 70 : 62);
    graphics.fill();
    graphics.fillColor = new Color(color.r, color.g, color.b, special ? 40 : high ? 25 : 14);
    graphics.circle(0, 0, special ? 73 : 66);
    graphics.fill();
    graphics.strokeColor = new Color(197, 133, 54, special ? 118 : 54);
    graphics.lineWidth = special ? 3 : 1.5;
    graphics.circle(0, 0, special ? 74 : 68);
    graphics.stroke();

    if (!this.applyAtlasFrame()) this.drawEmblem(graphics, symbolId, color);
    this.energyRing.active = special;
    if (special) {
      const energy = this.energyGraphics;
      energy.clear();
      energy.strokeColor = new Color(color.r, color.g, color.b, 220);
      energy.lineWidth = 4;
      energy.arc(0, 0, 75, 0.18, 2.15, false);
      energy.stroke();
      energy.strokeColor = new Color(255, 241, 171, 205);
      energy.lineWidth = 2;
      energy.arc(0, 0, 81, 3.38, 5.42, false);
      energy.stroke();
      tween(this.art).to(0.9, { scale: new Vec3(1.045, 1.045, 1) }, { easing: 'sineInOut' }).to(0.9, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
      tween(this.energyRing).by(2.4, { angle: -360 }).repeatForever().start();
      tween(this.energyOpacity).to(0.75, { opacity: 235 }, { easing: 'sineInOut' }).to(0.95, { opacity: 105 }, { easing: 'sineInOut' }).union().repeatForever().start();
    }
  }

  private applyAtlasFrame(): boolean {
    if (!this.sprite || !this.atlas || !this.symbolId) return false;
    const frame = SymbolAtlasCache.frame(this.atlas, this.symbolId);
    if (!frame) {
      this.spriteOpacity.opacity = 0;
      return false;
    }
    this.sprite.spriteFrame = frame;
    this.spriteOpacity.opacity = 255;
    return true;
  }

  public playWin(): void {
    Tween.stopAllByTarget(this.winGlow);
    Tween.stopAllByTarget(this.winGlowOpacity);
    Tween.stopAllByTarget(this.sprite.node);
    this.winGlow.setScale(new Vec3(0.72, 0.72, 1));
    this.winGlowOpacity.opacity = 0;
    tween(this.winGlow).to(0.2, { scale: new Vec3(1.14, 1.14, 1) }, { easing: 'backOut' }).to(0.28, { scale: Vec3.ONE }).union().repeat(3).start();
    tween(this.winGlowOpacity).to(0.1, { opacity: 255 }).to(0.36, { opacity: 28 }).union().repeat(3).call(() => { this.winGlowOpacity.opacity = 0; }).start();
    tween(this.sprite.node).to(0.15, { scale: new Vec3(1.15, 1.15, 1) }).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).union().repeat(3).start();
  }

  private drawEmblem(graphics: Graphics, id: string, color: Color): void {
    graphics.fillColor = color;
    graphics.strokeColor = new Color(255, 245, 207, 225);
    graphics.lineWidth = 3;
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

function baseShade(color: Color): Color {
  return new Color(Math.round(color.r * 0.22), Math.round(color.g * 0.25), Math.round(color.b * 0.32), 255);
}
