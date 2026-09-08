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
  private idleGlint!: Node;
  private idleGlintGraphics!: Graphics;
  private idleGlintOpacity!: UIOpacity;
  private winGlow!: Node;
  private winGlowOpacity!: UIOpacity;
  private baseScale = 1;
  private cellHeight = 180;
  private symbolScale = 1;
  private symbolYOffset = 0;
  private tier: SymbolDefinition['tier'] = 'low';
  private inMotion = false;
  private idleEnabled = false;

  public initialize(width: number, height: number, atlas: SymbolAtlasSpec): void {
    this.atlas = atlas;
    this.cellHeight = height;

    // The reel glass is the tile. Symbols therefore stay as large transparent
    // cut-outs instead of sitting inside a second dark card with a caption.
    this.visual = new Node('SymbolVisual');
    this.visual.layer = Layers.Enum.UI_2D;
    this.visual.addComponent(UITransform).setContentSize(156, 160);
    this.node.addChild(this.visual);
    // Fit inside the physical cells baked into each cabinet. Generated drum
    // rails remain visible instead of being covered by oversized artwork.
    // Width can stay generous, but vertical motion needs a stricter safety
    // envelope. At the former height/184 fit, a 1.15 win pop exceeded a cell
    // and visually occupied the neighbouring row. height/204 keeps even the
    // largest pop inside one row while preserving the premium artwork size.
    this.baseScale = Math.max(0.38, Math.min(1.05, width / 184, height / 204));
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

    this.idleGlint = new Node('SymbolIdleGlint');
    this.idleGlint.layer = Layers.Enum.UI_2D;
    this.idleGlint.addComponent(UITransform).setContentSize(34, 34);
    this.art.addChild(this.idleGlint);
    this.idleGlintGraphics = this.idleGlint.addComponent(Graphics);
    this.idleGlintOpacity = this.idleGlint.addComponent(UIOpacity);
    this.idleGlintOpacity.opacity = 0;
    this.idleGlint.active = false;

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
    const spinDirection = [...symbolId].reduce((value, char) => value + char.charCodeAt(0), 0) % 2 ? 1 : -1;
    if (!this.graphics || !this.art) return;
    Tween.stopAllByTarget(this.art);
    Tween.stopAllByTarget(this.energyRing);
    Tween.stopAllByTarget(this.energyOpacity);
    Tween.stopAllByTarget(this.idleGlint);
    Tween.stopAllByTarget(this.idleGlintOpacity);
    Tween.stopAllByTarget(this.sprite.node);
    this.art.setScale(Vec3.ONE);
    this.art.angle = 0;
    this.artOpacity.opacity = this.inMotion ? 218 : 255;
    this.sprite.node.setScale(this.inMotion ? new Vec3(this.symbolScale * 0.95, this.symbolScale * 1.07, 1) : new Vec3(this.symbolScale, this.symbolScale, 1));
    this.sprite.node.setPosition(0, this.symbolYOffset, 0);
    this.sprite.node.angle = this.inMotion ? spinDirection * 1.8 : 0;
    this.energyRing.angle = 0;
    this.energyOpacity.opacity = 0;
    this.idleGlint.setPosition(-46, 34, 0);
    this.idleGlint.setScale(Vec3.ONE);
    this.idleGlint.angle = 0;
    this.idleGlintOpacity.opacity = 0;

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

    // Keep the slot transparent while its premium atlas frame warms. A
    // code-drawn placeholder would visibly change art direction mid-spin.
    if (!this.applyAtlasFrame()) this.spriteOpacity.opacity = 0;
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
    this.idleGlint.active = high;
    if (high) {
      const glint = this.idleGlintGraphics; glint.clear();
      glint.fillColor = special ? new Color(255, 252, 226, 245) : new Color(color.r, color.g, color.b, 235);
      glint.moveTo(0, 15); glint.lineTo(3, 3); glint.lineTo(15, 0); glint.lineTo(3, -3); glint.lineTo(0, -15); glint.lineTo(-3, -3); glint.lineTo(-15, 0); glint.lineTo(-3, 3); glint.close(); glint.fill();
      glint.fillColor = new Color(color.r, color.g, color.b, 145); glint.circle(0, 0, 7); glint.fill();
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
    Tween.stopAllByTarget(this.spriteOpacity);
    this.visual.setScale(new Vec3(this.baseScale * 0.97, this.baseScale * 1.045, 1));
    this.sprite.node.angle = -2.2;
    this.spriteOpacity.opacity = 205;
    tween(this.visual)
      .delay(delay)
      .to(0.07, { scale: new Vec3(this.baseScale * 1.075, this.baseScale * 0.925, 1) }, { easing: 'sineOut' })
      .to(0.11, { scale: new Vec3(this.baseScale * 0.985, this.baseScale * 1.035, 1) }, { easing: 'backOut' })
      .to(0.15, { scale: new Vec3(this.baseScale, this.baseScale, 1) }, { easing: 'sineOut' })
      .start();
    tween(this.spriteOpacity).delay(delay).to(0.09, { opacity: 255 }).to(0.16, { opacity: 232 }).to(0.2, { opacity: 255 }, { easing: 'sineOut' }).start();
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
    Tween.stopAllByTarget(this.idleGlint);
    Tween.stopAllByTarget(this.idleGlintOpacity);
    Tween.stopAllByTarget(this.sprite.node);
    this.art.setScale(Vec3.ONE);
    this.energyRing.angle = 0;
    this.energyOpacity.opacity = 0;
    this.idleGlintOpacity.opacity = 0;
    this.sprite.node.setScale(new Vec3(this.symbolScale, this.symbolScale, 1));
    this.sprite.node.setPosition(0, this.symbolYOffset, 0);
    this.sprite.node.angle = 0;
    if (spinning) {
      tween(this.visual)
        .to(0.055, { scale: new Vec3(this.baseScale * 1.035, this.baseScale * 0.965, 1) }, { easing: 'sineOut' })
        .to(0.1, { scale: new Vec3(this.baseScale * 0.965, this.baseScale * 1.055, 1) }, { easing: 'backOut' })
        .start();
      const direction = [...this.symbolId].reduce((value, char) => value + char.charCodeAt(0), 0) % 2 ? 1 : -1;
      tween(this.sprite.node).to(0.12, { scale: new Vec3(this.symbolScale * 0.95, this.symbolScale * 1.07, 1), angle: direction * 1.8 }, { easing: 'sineOut' }).start();
      tween(this.artOpacity).to(0.11, { opacity: 228 }, { easing: 'sineOut' }).start();
    } else {
      tween(this.visual).to(0.16, { scale: new Vec3(this.baseScale, this.baseScale, 1) }, { easing: 'sineOut' }).start();
      tween(this.sprite.node).to(0.15, { scale: new Vec3(this.symbolScale, this.symbolScale, 1), angle: 0 }, { easing: 'sineOut' }).start();
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
    Tween.stopAllByTarget(this.idleGlint);
    Tween.stopAllByTarget(this.idleGlintOpacity);
    const hash = [...this.symbolId].reduce((value, char) => value + char.charCodeAt(0), 0);
    const folder = this.atlas.path.match(/game0[1-4]/)?.[0] ?? '';
    const materialLift = folder === 'game03' ? 1.35 : folder === 'game04' ? 1.18 : folder === 'game01' ? 1.12 : 0.92;
    const requestedLift = (this.tier === 'wild' || this.tier === 'scatter' || this.tier === 'bonus' ? 5.8 : this.tier === 'high' ? 4.5 : this.tier === 'medium' ? 3.4 : 2.6) * materialLift;
    const lift = Math.min(requestedLift, this.cellHeight * 0.045);
    const breathe = this.tier === 'wild' || this.tier === 'scatter' || this.tier === 'bonus' ? 1.065 : this.tier === 'high' ? 1.05 : this.tier === 'medium' ? 1.036 : 1.028;
    const duration = (folder === 'game04' ? 1.42 : folder === 'game03' ? 1.78 : folder === 'game02' ? 1.92 : 1.58) + (hash % 7) * 0.1;
    const direction = hash % 2 ? 1 : -1;
    const driftX = folder === 'game03' ? direction * 2.4 : folder === 'game04' ? direction * 2.1 : folder === 'game02' ? direction * 0.7 : direction * 0.45;
    const driftAngle = folder === 'game01' ? direction * 1.35 : folder === 'game02' ? direction * 0.55 : folder === 'game03' ? direction * 0.9 : folder === 'game04' ? direction * 1.15 : 0;
    const base = new Vec3(this.symbolScale, this.symbolScale, 1);
    const crouch = new Vec3(this.symbolScale * 1.025, this.symbolScale * 0.975, 1);
    const peak = new Vec3(this.symbolScale * (2 - breathe * 0.985), this.symbolScale * breathe, 1);
    const rebound = new Vec3(this.symbolScale * 1.018, this.symbolScale * 0.992, 1);
    this.sprite.node.setScale(base);
    this.sprite.node.setPosition(0, this.symbolYOffset, 0);
    tween(this.sprite.node)
      .delay(delay)
      .to(duration * 0.24, { position: new Vec3(-driftX * 0.2, this.symbolYOffset - lift * 0.12, 0), scale: crouch, angle: -driftAngle * 0.25 }, { easing: 'sineIn' })
      .to(duration * 0.42, { position: new Vec3(driftX, this.symbolYOffset + lift, 0), scale: peak, angle: driftAngle }, { easing: 'backOut' })
      .to(duration * 0.36, { position: new Vec3(-driftX * 0.34, this.symbolYOffset + lift * 0.26, 0), scale: rebound, angle: -driftAngle * 0.28 }, { easing: 'sineInOut' })
      .to(duration * 0.48, { position: new Vec3(0, this.symbolYOffset, 0), scale: base, angle: 0 }, { easing: 'backOut' })
      .delay(0.28 + (hash % 4) * 0.08)
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
    if (this.idleGlint.active) {
      const glintDirection = hash % 2 ? 1 : -1; const startX = -glintDirection * 48; const endX = glintDirection * 44;
      this.idleGlint.setPosition(startX, 34, 0); this.idleGlint.setScale(new Vec3(0.72, 0.72, 1)); this.idleGlint.angle = 0; this.idleGlintOpacity.opacity = 0;
      tween(this.idleGlint)
        .delay(delay + 0.65 + (hash % 5) * 0.13)
        .to(0.72, { position: new Vec3(endX, -24, 0), scale: new Vec3(1.18, 1.18, 1), angle: glintDirection * 135 }, { easing: 'sineInOut' })
        .call(() => { this.idleGlint.setPosition(startX, 34, 0); this.idleGlint.setScale(new Vec3(0.72, 0.72, 1)); this.idleGlint.angle = 0; })
        .delay(2.4 + (hash % 4) * 0.28)
        .union().repeatForever().start();
      tween(this.idleGlintOpacity)
        .delay(delay + 0.65 + (hash % 5) * 0.13)
        .to(0.18, { opacity: this.tier === 'wild' || this.tier === 'scatter' || this.tier === 'bonus' ? 235 : 165 }, { easing: 'sineOut' })
        .to(0.54, { opacity: 0 }, { easing: 'sineInOut' })
        .delay(2.42 + (hash % 4) * 0.28)
        .union().repeatForever().start();
    }
  }

  private artProfile(symbolId: string): { readonly scale: number; readonly y: number } {
    const folder = this.atlas.path.match(/game0[1-4]/)?.[0] ?? '';
    const profiles: Readonly<Record<string, Readonly<Record<string, readonly [number, number]>>>> = {
      game01: { 'coin-fan': [1.04, 0], 'peach-chip': [1.04, 0], 'jade-chip': [1.04, 0], 'money-purse': [1.03, -1], 'treasure-float': [1.02, -1], 'parade-crown': [1.03, 0], 'parade-chest': [1.02, -1], 'bloom-wild': [1.02, 0], 'parade-ticket': [1.03, 0] },
      game02: { 'coin-blossom': [1.04, 0], 'aqua-gem': [1.04, 0], 'peach-gem': [1.04, 0], 'jade-leaf': [1.04, 0], 'gold-dust': [1.02, -1], hummingbird: [1.03, 0], 'jewel-peony': [1.02, 0], 'peony-wild': [1.02, 0], 'bloom-bonus': [1.03, 0] },
      game03: { 'coin-stack': [1.04, 0], 'coral-chip': [1.04, 0], 'jade-chip': [1.04, 0], 'gold-lantern': [1.03, 0], 'vault-key': [1.04, 0], 'silk-pouch': [1.03, -1], 'lantern-chest': [1.02, -1], 'flame-wild': [1.02, 0], 'locked-coin': [1.03, 0] },
      game04: { 'gold-coin': [1.04, 0], 'peach-pair': [1.04, 0], 'lucky-bell': [1.05, 0], 'blue-bar': [1.04, 0], 'jade-seven': [1.04, 0], 'money-bag': [1.03, -1], 'prize-wheel': [1.02, 0], 'star-wild': [1.02, 0], 'wheel-ticket': [1.03, 0] },
    };
    const value = profiles[folder]?.[symbolId] ?? [1, 0];
    return { scale: value[0], y: value[1] };
  }

  public get id(): string { return this.symbolId; }
}
