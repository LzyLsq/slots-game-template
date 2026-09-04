import { _decorator, Color, Component, Graphics, Layers, Node, Sprite, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { SymbolAtlasCache, type SymbolAtlasSpec } from './SymbolAtlasCache';
import type { SymbolDefinition } from '../math/types';

const { ccclass } = _decorator;

@ccclass('ReelSymbol')
export class ReelSymbol extends Component {
  private symbolId = '';
  private visual!: Node;
  private art!: Node;
  private graphics!: Graphics;
  private sprite!: Sprite;
  private spriteOpacity!: UIOpacity;
  private artOpacity!: UIOpacity;
  private atlas!: SymbolAtlasSpec;
  private energyRing!: Node;
  private energyGraphics!: Graphics;
  private energyOpacity!: UIOpacity;
  private winGlow!: Node;
  private winGlowOpacity!: UIOpacity;
  private baseScale = 1;
  private symbolScale = 1;
  private symbolYOffset = 0;
  private tier: SymbolDefinition['tier'] = 'low';
  private inMotion = false;
  private idleEnabled = false;

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
    this.baseScale = Math.max(0.46, Math.min(1.05, width / 176, height / 176));
    this.visual.setScale(new Vec3(this.baseScale, this.baseScale, 1));

    this.art = new Node('SymbolArt');
    this.art.layer = Layers.Enum.UI_2D;
    this.art.addComponent(UITransform).setContentSize(176, 176);
    this.visual.addChild(this.art);
    this.graphics = this.art.addComponent(Graphics);
    this.artOpacity = this.art.addComponent(UIOpacity);

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
    winGraphics.fillColor = new Color(106, 214, 255, 28);
    winGraphics.circle(0, 0, 76);
    winGraphics.fill();
    winGraphics.strokeColor = new Color(241, 250, 255, 248);
    winGraphics.lineWidth = 6;
    winGraphics.circle(0, 0, 72);
    winGraphics.stroke();
    winGraphics.strokeColor = new Color(105, 213, 255, 205);
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

  public setSymbol(symbolId: string, _display: string, color: Color, tier: SymbolDefinition['tier']): void {
    this.symbolId = symbolId;
    this.tier = tier;
    const profile = this.artProfile(symbolId);
    this.symbolScale = profile.scale;
    this.symbolYOffset = profile.y;
    if (!this.graphics || !this.art) return;
    Tween.stopAllByTarget(this.art);
    Tween.stopAllByTarget(this.energyRing);
    Tween.stopAllByTarget(this.energyOpacity);
    Tween.stopAllByTarget(this.sprite.node);
    this.art.setScale(Vec3.ONE);
    this.art.angle = 0;
    this.artOpacity.opacity = this.inMotion ? 218 : 255;
    this.sprite.node.setScale(new Vec3(this.symbolScale, this.symbolScale, 1));
    this.sprite.node.setPosition(0, this.symbolYOffset, 0);
    this.sprite.node.angle = 0;
    this.energyRing.angle = 0;
    this.energyOpacity.opacity = 0;

    const graphics = this.graphics;
    graphics.clear();
    const special = tier === 'wild' || tier === 'scatter' || tier === 'bonus';
    const high = special || tier === 'high';

    // Transparent symbols sit directly in the reel glass. Only premium symbols
    // receive a light halo; there is intentionally no dark floor-shadow card.
    graphics.fillColor = new Color(color.r, color.g, color.b, special ? 34 : high ? 16 : 0);
    graphics.circle(0, 0, special ? 73 : 66);
    graphics.fill();
    graphics.strokeColor = new Color(color.r, color.g, color.b, special ? 126 : high ? 42 : 18);
    graphics.lineWidth = special ? 3 : 1.5;
    graphics.circle(0, 0, special ? 74 : 68);
    graphics.stroke();

    if (!this.applyAtlasFrame()) this.drawEmblem(graphics, symbolId, color);
    this.energyRing.active = high;
    if (high) {
      const energy = this.energyGraphics;
      energy.clear();
      energy.strokeColor = new Color(color.r, color.g, color.b, special ? 220 : 92);
      energy.lineWidth = special ? 4 : 2;
      energy.arc(0, 0, 75, 0.18, 2.15, false);
      energy.stroke();
      energy.strokeColor = new Color(255, 246, 215, special ? 205 : 72);
      energy.lineWidth = special ? 2 : 1;
      energy.arc(0, 0, 81, 3.38, 5.42, false);
      energy.stroke();
    }
    if (this.idleEnabled && !this.inMotion) this.startIdleMotion();
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
    tween(this.sprite.node)
      .to(0.15, { scale: new Vec3(this.symbolScale * 1.15, this.symbolScale * 1.15, 1) })
      .to(0.28, { scale: new Vec3(this.symbolScale, this.symbolScale, 1) }, { easing: 'backOut' })
      .union().repeat(3).call(() => this.startIdleMotion()).start();
  }

  public playLand(delay = 0): void {
    Tween.stopAllByTarget(this.visual);
    Tween.stopAllByTarget(this.sprite.node);
    this.visual.setScale(new Vec3(this.baseScale * 0.98, this.baseScale * 1.035, 1));
    this.sprite.node.angle = -1.4;
    tween(this.visual)
      .delay(delay)
      .to(0.075, { scale: new Vec3(this.baseScale * 1.035, this.baseScale * 0.965, 1) }, { easing: 'sineOut' })
      .to(0.17, { scale: new Vec3(this.baseScale, this.baseScale, 1) }, { easing: 'backOut' })
      .start();
    tween(this.sprite.node).delay(delay).to(0.21, { angle: 0 }, { easing: 'backOut' }).call(() => {
      this.idleEnabled = true;
      this.startIdleMotion(delay * 0.35);
    }).start();
  }

  public setSpinMotion(spinning: boolean): void {
    this.inMotion = spinning;
    this.idleEnabled = false;
    Tween.stopAllByTarget(this.visual);
    Tween.stopAllByTarget(this.art);
    Tween.stopAllByTarget(this.artOpacity);
    Tween.stopAllByTarget(this.energyRing);
    Tween.stopAllByTarget(this.energyOpacity);
    Tween.stopAllByTarget(this.sprite.node);
    this.art.setScale(Vec3.ONE);
    this.energyRing.angle = 0;
    this.energyOpacity.opacity = 0;
    this.sprite.node.setScale(new Vec3(this.symbolScale, this.symbolScale, 1));
    this.sprite.node.setPosition(0, this.symbolYOffset, 0);
    this.sprite.node.angle = 0;
    if (spinning) {
      tween(this.visual).to(0.1, { scale: new Vec3(this.baseScale * 0.975, this.baseScale * 1.025, 1) }, { easing: 'sineOut' }).start();
      tween(this.artOpacity).to(0.11, { opacity: 218 }, { easing: 'sineOut' }).start();
    } else {
      tween(this.visual).to(0.16, { scale: new Vec3(this.baseScale, this.baseScale, 1) }, { easing: 'sineOut' }).start();
      tween(this.artOpacity).to(0.13, { opacity: 255 }, { easing: 'sineOut' }).start();
    }
  }

  public activateIdle(delay = 0): void {
    this.idleEnabled = true;
    if (!this.inMotion) this.startIdleMotion(delay);
  }

  public settleSymbol(symbolId: string, display: string, color: Color, tier: SymbolDefinition['tier']): void {
    Tween.stopAllByTarget(this.spriteOpacity);
    this.setSymbol(symbolId, display, color, tier);
    if (this.spriteOpacity.opacity > 0) {
      this.spriteOpacity.opacity = 105;
      tween(this.spriteOpacity).to(0.13, { opacity: 255 }, { easing: 'sineOut' }).start();
    }
  }

  private startIdleMotion(delay = 0): void {
    if (!this.idleEnabled || this.inMotion || !this.sprite?.node?.isValid) return;
    Tween.stopAllByTarget(this.sprite.node);
    Tween.stopAllByTarget(this.energyRing);
    Tween.stopAllByTarget(this.energyOpacity);
    const hash = [...this.symbolId].reduce((value, char) => value + char.charCodeAt(0), 0);
    const lift = this.tier === 'wild' || this.tier === 'scatter' || this.tier === 'bonus' ? 2.8 : this.tier === 'high' ? 2 : this.tier === 'medium' ? 1.3 : 0.8;
    const breathe = this.tier === 'wild' || this.tier === 'scatter' || this.tier === 'bonus' ? 1.03 : this.tier === 'high' ? 1.02 : this.tier === 'medium' ? 1.012 : 1.007;
    const duration = 1.65 + (hash % 7) * 0.11;
    const base = new Vec3(this.symbolScale, this.symbolScale, 1);
    const peak = new Vec3(this.symbolScale * breathe, this.symbolScale * breathe, 1);
    this.sprite.node.setScale(base);
    this.sprite.node.setPosition(0, this.symbolYOffset, 0);
    tween(this.sprite.node)
      .delay(delay)
      .to(duration, { position: new Vec3(0, this.symbolYOffset + lift, 0), scale: peak }, { easing: 'sineInOut' })
      .to(duration, { position: new Vec3(0, this.symbolYOffset, 0), scale: base }, { easing: 'sineInOut' })
      .union().repeatForever().start();
    if (this.energyRing.active) {
      const special = this.tier === 'wild' || this.tier === 'scatter' || this.tier === 'bonus';
      tween(this.energyRing).delay(delay).by(special ? 2.8 : 4.2, { angle: -360 }).repeatForever().start();
      tween(this.energyOpacity)
        .delay(delay)
        .to(special ? 0.8 : 1.25, { opacity: special ? 220 : 88 }, { easing: 'sineInOut' })
        .to(special ? 1.05 : 1.4, { opacity: special ? 82 : 24 }, { easing: 'sineInOut' })
        .union().repeatForever().start();
    }
  }

  private artProfile(symbolId: string): { readonly scale: number; readonly y: number } {
    const folder = this.atlas.path.match(/game0[1-4]/)?.[0] ?? '';
    const profiles: Readonly<Record<string, Readonly<Record<string, readonly [number, number]>>>> = {
      game01: { heart: [1.02, 0], club: [1.08, 0], diamond: [1.28, 0], spade: [1.12, 0], chip: [1.08, 0], ace: [1.16, 0], wheel: [1.02, 0], host: [1.17, -2], eclipse: [1.04, 0] },
      game02: { ten: [1.08, 0], jack: [1.16, -1], queen: [1.08, -2], king: [1.08, 0], spade: [1.14, 0], chip: [1.1, 0], diamond: [1.03, 0], host: [1.17, -2], eclipse: [1.04, 0] },
      game03: { clover: [1.1, 0], horseshoe: [1.08, 0], chip: [1.08, 0], dice: [1.1, 0], ring: [1.08, 0], lime: [1.02, 0], trophy: [1.08, 0], host: [1.17, -2], eclipse: [1.04, 0] },
      game04: { coin: [1.06, 0], chest: [1.04, 0], ring: [1.1, 0], seven: [1.04, 0], crown: [1.08, -1], vault: [1.12, 0], diamond: [1.08, 0], host: [1.17, -2], eclipse: [1.04, 0], orb: [1.08, 0] },
    };
    const value = profiles[folder]?.[symbolId] ?? [1, 0];
    return { scale: value[0], y: value[1] };
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
