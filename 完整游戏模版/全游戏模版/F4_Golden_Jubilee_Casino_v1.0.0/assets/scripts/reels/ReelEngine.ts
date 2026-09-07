import { _decorator, Color, Component, Graphics, Label, Layers, Mask, Node, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import type { GameConfig, SpinResult, WinResult } from '../math/types';
import { ReelColumn } from './ReelColumn';
import { ReelController } from './ReelController';
import { symbolAtlasForGame } from './SymbolAtlasCache';

const { ccclass } = _decorator;

@ccclass('ReelEngine')
export class ReelEngine extends Component {
  private controller!: ReelController;
  private lineLayer?: Node;
  private reelWidth = 0;
  private reelHeight = 0;
  private columns = 0;
  private rows = 0;
  private spinSheen?: Node;
  private spinSheenOpacity?: UIOpacity;

  public configure(config: GameConfig, width: number, height: number): void {
    this.node.removeAllChildren();
    this.controller = this.getComponent(ReelController) ?? this.node.addComponent(ReelController);
    this.reelWidth = width;
    this.reelHeight = height;
    this.columns = config.columns;
    this.rows = config.rows;

    const clipRoot = new Node('ReelClip');
    clipRoot.layer = Layers.Enum.UI_2D;
    clipRoot.addComponent(UITransform).setContentSize(width, height);
    clipRoot.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    this.node.addChild(clipRoot);

    const columnWidth = width / config.columns;
    const rowHeight = height / config.rows;
    const accent = this.accentFor(config);
    this.addGlassDetail(clipRoot, width, height, config.columns, config.rows, accent);
    this.addThemeAmbience(clipRoot, config, width, height);

    const labels = Object.fromEntries(config.symbols.map((symbol) => [symbol.id, symbol.label.replace(' ', '\n')]));
    const colors = Object.fromEntries(config.symbols.map((symbol) => [
      symbol.id,
      symbol.tier === 'wild' ? new Color(238, 245, 255)
        : symbol.tier === 'scatter' || symbol.tier === 'bonus' ? accent
          : symbol.tier === 'high' ? this.mix(accent, new Color(255, 255, 255), 0.32)
            : this.mix(accent, new Color(118, 145, 176), 0.5),
    ]));
    const tiers = Object.fromEntries(config.symbols.map((symbol) => [symbol.id, symbol.tier]));
    const atlas = symbolAtlasForGame(config);
    const columns = config.reelStrips.map((strip, index) => {
      const node = new Node(`Reel-${index}`);
      node.layer = Layers.Enum.UI_2D;
      node.addComponent(UITransform).setContentSize(columnWidth, height);
      node.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
      node.setPosition(-width / 2 + columnWidth * (index + 0.5), 0);
      clipRoot.addChild(node);
      const column = node.addComponent(ReelColumn);
      column.configure(config.id, config.rows, columnWidth, rowHeight, strip, labels, colors, tiers, atlas);
      return column;
    });
    this.controller.setColumns(columns);
    this.addSpinSheen(clipRoot, width, height, accent);
    this.addReelGlassMotion(clipRoot, width, height, accent);

    this.addMechanicalChrome(config, width, height, columnWidth, rowHeight);
    this.lineLayer = new Node('WinLineLayer');
    this.lineLayer.layer = Layers.Enum.UI_2D;
    this.lineLayer.addComponent(UITransform).setContentSize(width, height);
    this.node.addChild(this.lineLayer);
  }

  public spin(result: SpinResult, config: GameConfig, turbo: boolean): Promise<void[]> {
    this.clearPaylines();
    const byColumn = Array.from({ length: config.columns }, (_, column) => result.grid.slice(column * config.rows, column * config.rows + config.rows));
    this.startSpinSheen(turbo);
    return this.controller.spin(byColumn, turbo).finally(() => this.stopSpinSheen());
  }

  public presentWins(result: SpinResult, config: GameConfig): void {
    this.controller.highlight([...new Set(result.wins.flatMap((win) => win.positions))], config.rows);
    this.drawWinningLines(result.wins, config);
    this.playThemeWin(config);
  }

  public quickStop(): void { this.controller.quickStop(); }

  private addSpinSheen(parent: Node, width: number, height: number, accent: Color): void {
    const sheen = new Node('ReelMotionSheen'); sheen.layer = Layers.Enum.UI_2D; sheen.addComponent(UITransform).setContentSize(width, height * 1.18); sheen.angle = -4; parent.addChild(sheen);
    const graphics = sheen.addComponent(Graphics);
    // One batched overlay supplies readable motion streaks for every column.
    // It creates speed without blurring the symbol atlas into grey smears.
    for (let index = 0; index < 7; index += 1) {
      const y = -height * 0.43 + index * height * 0.145; const streakWidth = width * (0.34 + index % 3 * 0.18); const x = index % 2 ? width * 0.12 : -width * 0.1;
      graphics.fillColor = index % 3 === 0 ? new Color(255, 249, 222, 34) : new Color(accent.r, accent.g, accent.b, 20 + index % 2 * 8);
      graphics.roundRect(x - streakWidth / 2, y - 4, streakWidth, 8, 4); graphics.fill();
      graphics.fillColor = new Color(255, 255, 244, 26); graphics.roundRect(x - streakWidth * 0.22, y - 1.5, streakWidth * 0.44, 3, 2); graphics.fill();
    }
    this.spinSheenOpacity = sheen.addComponent(UIOpacity); this.spinSheenOpacity.opacity = 0; this.spinSheen = sheen;
  }

  private startSpinSheen(turbo: boolean): void {
    if (!this.spinSheen || !this.spinSheenOpacity) return;
    Tween.stopAllByTarget(this.spinSheen); Tween.stopAllByTarget(this.spinSheenOpacity);
    const travel = this.reelHeight * 0.68; const duration = turbo ? 0.32 : 0.48;
    this.spinSheen.setPosition(0, travel, 0); this.spinSheenOpacity.opacity = 0;
    tween(this.spinSheenOpacity).to(0.12, { opacity: turbo ? 118 : 102 }, { easing: 'sineOut' }).start();
    tween(this.spinSheen).to(duration, { position: new Vec3(0, -travel, 0) }, { easing: 'quadInOut' }).call(() => this.spinSheen?.setPosition(0, travel, 0)).union().repeatForever().start();
  }

  private stopSpinSheen(): void {
    if (!this.spinSheen || !this.spinSheenOpacity) return;
    Tween.stopAllByTarget(this.spinSheen);
    Tween.stopAllByTarget(this.spinSheenOpacity);
    tween(this.spinSheenOpacity).to(0.16, { opacity: 0 }, { easing: 'sineOut' }).start();
  }

  private addGlassDetail(parent: Node, width: number, height: number, columns: number, rows: number, accent: Color): void {
    const node = new Node('ObsidianReelGlass');
    node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(width, height);
    parent.addChild(node);
    const graphics = node.addComponent(Graphics);
    // The cabinets use warm ivory reel glass. Keep reflections narrow and
    // translucent so they read as glass, never as opaque grey sticker bands.
    graphics.fillColor = new Color(255, 249, 225, 10);
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();
    graphics.fillColor = new Color(255, 255, 247, 14);
    graphics.roundRect(-width * 0.44, height * 0.29, width * 0.72, height * 0.035, 12);
    graphics.fill();
    graphics.fillColor = new Color(accent.r, accent.g, accent.b, 7);
    graphics.roundRect(-width * 0.17, -height * 0.34, width * 0.48, height * 0.022, 10);
    graphics.fill();
    graphics.strokeColor = new Color(125, 85, 52, 42);
    graphics.lineWidth = 1.5;
    for (let row = 1; row < rows; row += 1) {
      const y = height / 2 - height / rows * row;
      graphics.moveTo(-width / 2 + 5, y);
      graphics.lineTo(width / 2 - 5, y);
    }
    for (let column = 1; column < columns; column += 1) {
      const x = -width / 2 + width / columns * column;
      graphics.moveTo(x, -height / 2 + 5);
      graphics.lineTo(x, height / 2 - 5);
    }
    graphics.stroke();
  }

  private addReelGlassMotion(parent: Node, width: number, height: number, accent: Color): void {
    const layer = new Node('ReelGlassLightMotion'); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer);

    // A permanent upper reflection anchors the material read as curved glass,
    // so the aperture still looks alive between the timed sweep passes.
    const canopy = new Node('ReelGlassCanopyReflection'); canopy.layer = Layers.Enum.UI_2D; canopy.addComponent(UITransform).setContentSize(width, height); layer.addChild(canopy);
    const canopyGraphics = canopy.addComponent(Graphics); canopyGraphics.fillColor = new Color(255, 255, 244, 26); canopyGraphics.moveTo(-width * 0.49, height * 0.43); canopyGraphics.lineTo(width * 0.13, height * 0.43); canopyGraphics.lineTo(-width * 0.04, height * 0.24); canopyGraphics.lineTo(-width * 0.49, height * 0.18); canopyGraphics.close(); canopyGraphics.fill(); canopyGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 12); canopyGraphics.moveTo(width * 0.09, height * 0.43); canopyGraphics.lineTo(width * 0.39, height * 0.43); canopyGraphics.lineTo(width * 0.29, height * 0.32); canopyGraphics.lineTo(0, height * 0.25); canopyGraphics.close(); canopyGraphics.fill(); canopyGraphics.strokeColor = new Color(255, 253, 226, 76); canopyGraphics.lineWidth = 2; canopyGraphics.moveTo(-width * 0.44, height * 0.38); canopyGraphics.lineTo(width * 0.08, height * 0.38); canopyGraphics.stroke();
    const canopyOpacity = canopy.addComponent(UIOpacity); canopyOpacity.opacity = 78; tween(canopyOpacity).to(2.2, { opacity: 138 }, { easing: 'sineInOut' }).to(2.7, { opacity: 66 }, { easing: 'sineInOut' }).union().repeatForever().start();

    // A narrow diagonal reflection crosses the physical reel glass at idle.
    // It is deliberately translucent: the symbols stay readable while the
    // screen still feels like illuminated glass instead of a static picture.
    const sweep = new Node('IdleGlassSweep'); sweep.layer = Layers.Enum.UI_2D; sweep.addComponent(UITransform).setContentSize(width * 0.24, height * 1.35); sweep.setPosition(-width * 0.72, 0); sweep.angle = -14; layer.addChild(sweep);
    const sweepGraphics = sweep.addComponent(Graphics); sweepGraphics.fillColor = new Color(255, 253, 232, 42); sweepGraphics.roundRect(-width * 0.12, -height * 0.68, width * 0.24, height * 1.36, width * 0.09); sweepGraphics.fill(); sweepGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 19); sweepGraphics.roundRect(-width * 0.032, -height * 0.68, width * 0.064, height * 1.36, width * 0.024); sweepGraphics.fill(); sweepGraphics.fillColor = new Color(255, 255, 246, 58); sweepGraphics.roundRect(-width * 0.009, -height * 0.68, width * 0.018, height * 1.36, width * 0.009); sweepGraphics.fill();
    const sweepOpacity = sweep.addComponent(UIOpacity); sweepOpacity.opacity = 0;
    tween(sweep).delay(0.45).to(1.36, { position: new Vec3(width * 0.72, 0, 0) }, { easing: 'sineInOut' }).call(() => sweep.setPosition(-width * 0.72, 0)).delay(2.35).union().repeatForever().start();
    tween(sweepOpacity).delay(0.45).to(0.22, { opacity: 168 }, { easing: 'sineOut' }).delay(0.78).to(0.36, { opacity: 0 }, { easing: 'sineInOut' }).delay(2.35).union().repeatForever().start();

    const edge = new Node('LivingGlassEdge'); edge.layer = Layers.Enum.UI_2D; edge.addComponent(UITransform).setContentSize(width, height); layer.addChild(edge); const edgeGraphics = edge.addComponent(Graphics);
    edgeGraphics.strokeColor = new Color(255, 244, 194, 92); edgeGraphics.lineWidth = 2.2; edgeGraphics.roundRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, 18); edgeGraphics.stroke(); edgeGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, 62); edgeGraphics.lineWidth = 1.2; edgeGraphics.roundRect(-width / 2 + 10, -height / 2 + 10, width - 20, height - 20, 14); edgeGraphics.stroke();
    const edgeOpacity = edge.addComponent(UIOpacity); edgeOpacity.opacity = 48; tween(edgeOpacity).to(1.25, { opacity: 142 }, { easing: 'sineInOut' }).to(1.55, { opacity: 42 }, { easing: 'sineInOut' }).union().repeatForever().start();

    for (let index = 0; index < 4; index += 1) {
      const glint = new Node(`GlassCornerGlint-${index}`); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(28, 28); const sideX = index % 2 ? 1 : -1; const sideY = index < 2 ? 1 : -1; glint.setPosition(sideX * (width / 2 - 18), sideY * (height / 2 - 18)); layer.addChild(glint); const g = glint.addComponent(Graphics); g.fillColor = index % 2 ? new Color(accent.r, accent.g, accent.b, 225) : new Color(255, 247, 211, 235); g.moveTo(0, 12); g.lineTo(2.5, 2.5); g.lineTo(12, 0); g.lineTo(2.5, -2.5); g.lineTo(0, -12); g.lineTo(-2.5, -2.5); g.lineTo(-12, 0); g.lineTo(-2.5, 2.5); g.close(); g.fill(); const opacity = glint.addComponent(UIOpacity); opacity.opacity = 0;
      tween(opacity).delay(0.35 + index * 0.57).to(0.16, { opacity: 235 }, { easing: 'sineOut' }).to(0.42, { opacity: 0 }, { easing: 'sineInOut' }).delay(2.25 + index * 0.13).union().repeatForever().start();
      tween(glint).delay(index * 0.2).by(1.15, { angle: 150, scale: new Vec3(0.38, 0.38, 0) }).by(1.15, { angle: 150, scale: new Vec3(-0.38, -0.38, 0) }).union().repeatForever().start();
    }
  }

  private addThemeAmbience(parent: Node, config: GameConfig, width: number, height: number): void {
    const accent = this.accentFor(config);
    if (config.id === 'lucky-coin-grove') {
      const line = new Node('CoinGroveCenterPayline'); line.layer = Layers.Enum.UI_2D; line.addComponent(UITransform).setContentSize(width * 0.94, 12); parent.addChild(line);
      const g = line.addComponent(Graphics); g.fillColor = new Color(255, 202, 70, 44); g.roundRect(-width * 0.47, -6, width * 0.94, 12, 6); g.fill(); g.fillColor = new Color(255, 249, 214, 125); g.roundRect(-width * 0.22, -2, width * 0.44, 4, 2); g.fill();
      const opacity = line.addComponent(UIOpacity); opacity.opacity = 55; tween(opacity).to(1.1, { opacity: 185 }, { easing: 'sineInOut' }).to(1.35, { opacity: 48 }, { easing: 'sineInOut' }).union().repeatForever().start();
      for (let index = 0; index < 7; index += 1) {
        const coin = new Node(`CoinGroveBloom-${index}`); coin.layer = Layers.Enum.UI_2D; const radius = 5 + index % 3 * 1.5; coin.addComponent(UITransform).setContentSize(radius * 3, radius * 3); const startX = -width * 0.42 + index * width * 0.14; const startY = -height * 0.46 + index % 2 * 14; coin.setPosition(startX, startY); parent.addChild(coin); const coinGraphics = coin.addComponent(Graphics); coinGraphics.fillColor = index % 3 === 0 ? new Color(232, 94, 57, 135) : new Color(255, 194, 42, 165); coinGraphics.ellipse(0, 0, radius, radius * 0.72); coinGraphics.fill(); coinGraphics.strokeColor = new Color(255, 246, 190, 205); coinGraphics.lineWidth = 1.2; coinGraphics.ellipse(0, 0, radius, radius * 0.72); coinGraphics.stroke(); const coinOpacity = coin.addComponent(UIOpacity); coinOpacity.opacity = 0; const rise = height * (0.2 + index % 4 * 0.075); const drift = index % 2 ? -9 : 9;
        tween(coin).delay(index * 0.29).to(1.5 + index * 0.06, { position: new Vec3(startX + drift, startY + rise, 0), angle: (index % 2 ? -1 : 1) * (145 + index * 23), scale: new Vec3(0.78, 1.16, 1) }, { easing: 'sineOut' }).call(() => { coin.setPosition(startX, startY); coin.setScale(Vec3.ONE); coin.angle = 0; }).delay(1.2).union().repeatForever().start();
        tween(coinOpacity).delay(index * 0.29).to(0.22, { opacity: 175 }).delay(0.76).to(0.38, { opacity: 0 }).delay(1.34).union().repeatForever().start();
      }
    } else if (config.id === 'treasure-parade') {
      for (let index = 0; index < 6; index += 1) {
        const coin = new Node(`TreasureLock-${index}`); coin.layer = Layers.Enum.UI_2D; coin.addComponent(UITransform).setContentSize(22, 22); coin.setPosition(-width * 0.44 + index * width * 0.176, index % 2 ? -height * 0.43 : height * 0.43); parent.addChild(coin);
        const g = coin.addComponent(Graphics); g.fillColor = new Color(189, 116, 30, 88); g.circle(0, 0, 8); g.fill(); g.strokeColor = new Color(255, 230, 148, 160); g.lineWidth = 2; g.circle(0, 0, 8); g.stroke();
        const opacity = coin.addComponent(UIOpacity); opacity.opacity = 42; const direction = index % 2 ? -1 : 1; tween(coin).delay(index * 0.12).by(1.15 + index * 0.08, { position: new Vec3(direction * 7, direction * 8, 0), angle: direction * 26, scale: new Vec3(0.16, 0.16, 0) }, { easing: 'sineInOut' }).by(1.3 + index * 0.07, { position: new Vec3(-direction * 7, -direction * 8, 0), angle: -direction * 26, scale: new Vec3(-0.16, -0.16, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).delay(index * 0.16).to(0.55, { opacity: 190 }, { easing: 'sineInOut' }).to(1.15, { opacity: 38 }, { easing: 'sineInOut' }).delay(0.72).union().repeatForever().start();
      }
    } else if (config.id === 'lantern-fortune') {
      for (let index = 0; index < 7; index += 1) {
        const pearl = new Node(`LanternBreath-${index}`); pearl.layer = Layers.Enum.UI_2D; const radius = 4 + index % 3 * 2; pearl.addComponent(UITransform).setContentSize(radius * 4, radius * 5); pearl.setPosition(-width * 0.42 + index * width * 0.14, -height * 0.46); parent.addChild(pearl);
        const g = pearl.addComponent(Graphics); g.fillColor = new Color(234, 104, 70, 102); g.ellipse(0, 0, radius * 1.35, radius * 1.7); g.fill(); g.strokeColor = new Color(255, 233, 176, 165); g.lineWidth = 1.5; g.ellipse(0, 0, radius * 1.35, radius * 1.7); g.stroke(); g.strokeColor = new Color(69, 139, 105, 130); g.moveTo(0, -radius * 1.7); g.lineTo(0, -radius * 2.45); g.stroke();
        const opacity = pearl.addComponent(UIOpacity); opacity.opacity = 0; const travel = height * (0.72 + index % 2 * 0.14); const drift = index % 2 ? -18 : 18;
        tween(pearl).delay(index * 0.31).by(2.8 + index * 0.14, { position: new Vec3(drift, travel, 0), scale: new Vec3(0.45, 0.45, 0), angle: index % 2 ? -8 : 8 }, { easing: 'sineInOut' }).call(() => { pearl.setPosition(-width * 0.42 + index * width * 0.14, -height * 0.46); pearl.setScale(Vec3.ONE); pearl.angle = 0; }).union().repeatForever().start();
        tween(opacity).delay(index * 0.31).to(0.4, { opacity: 150 }).delay(1.55).to(0.55, { opacity: 0 }).delay(0.3).union().repeatForever().start();
      }
    } else {
      // Jubilee Cascade reads as a living coin fountain: a soft diagonal
      // glass sweep plus staggered rising coins, never a static flat grid.
      const beam = new Node('JubileeFountainSweep'); beam.layer = Layers.Enum.UI_2D; beam.addComponent(UITransform).setContentSize(width, height); beam.setPosition(-width * 0.48, 0); beam.angle = -16; parent.addChild(beam);
      const g = beam.addComponent(Graphics); g.fillColor = new Color(255, 204, 76, 24); g.moveTo(0, 0); g.lineTo(width * 0.96, height * 0.34); g.lineTo(width * 0.96, -height * 0.08); g.close(); g.fill(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 54); g.lineWidth = 2; g.moveTo(0, 0); g.lineTo(width * 0.96, height * 0.34); g.stroke();
      const opacity = beam.addComponent(UIOpacity); opacity.opacity = 22; tween(beam).to(2.2, { angle: 15 }, { easing: 'sineInOut' }).to(2.4, { angle: -16 }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(1.1, { opacity: 72 }).to(1.35, { opacity: 20 }).union().repeatForever().start();
      for (let index = 0; index < 8; index += 1) {
        const coin = new Node(`JubileeFountainCoin-${index}`); coin.layer = Layers.Enum.UI_2D; coin.addComponent(UITransform).setContentSize(22, 22); coin.setPosition(-width * 0.43 + index * width * 0.123, -height * 0.47); parent.addChild(coin);
        const coinGraphics = coin.addComponent(Graphics); coinGraphics.fillColor = index % 3 === 0 ? new Color(222, 54, 61, 150) : new Color(255, 195, 44, 175); coinGraphics.ellipse(0, 0, 6.5, 4.5); coinGraphics.fill(); coinGraphics.strokeColor = new Color(255, 244, 188, 210); coinGraphics.lineWidth = 1.2; coinGraphics.ellipse(0, 0, 6.5, 4.5); coinGraphics.stroke();
        const coinOpacity = coin.addComponent(UIOpacity); coinOpacity.opacity = 0; const rise = height * (0.34 + index % 4 * 0.1); const drift = index % 2 ? 10 : -10;
        tween(coin).delay(index * 0.23).to(1.45 + index * 0.04, { position: new Vec3(coin.position.x + drift, -height * 0.47 + rise, 0), angle: 150 + index * 27, scale: new Vec3(0.72, 1.12, 1) }, { easing: 'sineOut' }).call(() => { coin.setPosition(-width * 0.43 + index * width * 0.123, -height * 0.47); coin.setScale(Vec3.ONE); coin.angle = 0; }).delay(1.25).union().repeatForever().start();
        tween(coinOpacity).delay(index * 0.23).to(0.22, { opacity: 185 }).delay(0.72).to(0.4, { opacity: 0 }).delay(1.36).union().repeatForever().start();
      }
    }
  }

  private playThemeWin(config: GameConfig): void {
    if (!this.lineLayer) return;
    const accent = this.accentFor(config);
    const count = config.id === 'jubilee-cascade' ? 18 : config.id === 'treasure-parade' ? 12 : 14;
    for (let index = 0; index < count; index += 1) {
      const mote = new Node(`ThemeWin-${config.id}-${index}`); mote.layer = Layers.Enum.UI_2D; mote.addComponent(UITransform).setContentSize(30, 30); mote.setPosition(0, 0); this.lineLayer.addChild(mote);
      const g = mote.addComponent(Graphics); const radius = config.id === 'jubilee-cascade' ? 7 + index % 3 * 2 : 6 + index % 2 * 2;
      if (config.id === 'treasure-parade') { g.fillColor = index % 3 ? new Color(220, 151, 48) : new Color(244, 222, 145); g.circle(0, 0, radius); g.fill(); g.strokeColor = new Color(114, 55, 22, 220); g.lineWidth = 2; g.circle(0, 0, radius - 2); g.stroke(); }
      else if (config.id === 'lantern-fortune') { g.fillColor = index % 2 ? new Color(235, 103, 73, 225) : new Color(255, 224, 128, 220); g.moveTo(0, radius * 1.8); g.lineTo(radius * 0.42, radius * 0.36); g.lineTo(radius * 1.8, 0); g.lineTo(radius * 0.42, -radius * 0.36); g.lineTo(0, -radius * 1.8); g.lineTo(-radius * 0.42, -radius * 0.36); g.lineTo(-radius * 1.8, 0); g.lineTo(-radius * 0.42, radius * 0.36); g.close(); g.fill(); }
      else { g.fillColor = config.id === 'jubilee-cascade' ? new Color(255, 249, 238, 225) : new Color(255, 196, 58, 225); g.circle(0, 0, radius); g.fill(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 205); g.lineWidth = 2; g.circle(0, 0, radius); g.stroke(); }
      const opacity = mote.addComponent(UIOpacity); opacity.opacity = 0; const angle = Math.PI * 2 * index / count; const distance = Math.min(this.reelWidth, this.reelHeight) * (0.34 + index % 4 * 0.08); const target = new Vec3(Math.cos(angle) * distance, Math.sin(angle) * distance, 0);
      tween(opacity).delay(index * 0.018).to(0.08, { opacity: 255 }).delay(0.32).to(0.32, { opacity: 0 }).start();
      tween(mote).delay(index * 0.018).to(0.52, { position: target, scale: new Vec3(1.35, 1.35, 1), angle: 160 + index * 13 }, { easing: 'quartOut' }).to(0.22, { position: new Vec3(target.x, target.y - 35, 0), scale: new Vec3(0.35, 0.35, 1) }, { easing: 'quadIn' }).call(() => mote.destroy()).start();
    }
  }

  private addMechanicalChrome(config: GameConfig, width: number, height: number, columnWidth: number, rowHeight: number): void {
    const chrome = new Node('ReelChromeOverlay');
    chrome.layer = Layers.Enum.UI_2D;
    chrome.addComponent(UITransform).setContentSize(width, height);
    this.node.addChild(chrome);
    const graphics = chrome.addComponent(Graphics);

    const accent = this.accentFor(config);
    // Thin silver/chromatic separators read as one continuous glass stage,
    // without the warm carved rails that made the previous UI feel ceremonial.
    for (let column = 1; column < config.columns; column += 1) {
      const x = -width / 2 + columnWidth * column;
      graphics.strokeColor = new Color(6, 15, 34, 175);
      graphics.lineWidth = 3;
      graphics.moveTo(x + 1, -height / 2 + 4);
      graphics.lineTo(x + 1, height / 2 - 4);
      graphics.stroke();
      graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 112);
      graphics.lineWidth = 1.25;
      graphics.moveTo(x - 1, -height / 2 + 5);
      graphics.lineTo(x - 1, height / 2 - 5);
      graphics.stroke();
    }

    void rowHeight;
  }

  private addPaylineMarkers(parent: Node, config: GameConfig, width: number, height: number, rowHeight: number): void {
    if (config.payMode === 'ways') {
      const ways = config.columns === 6 && config.rows === 4 ? '4096' : '243';
      this.paylineMarker(parent, ways, -width / 2 - 14, 0, ways.length > 3 ? 40 : 34, new Color(62, 133, 78), ways.length > 3 ? 10 : 15);
      this.paylineMarker(parent, 'WAYS', width / 2 + 14, 0, 34, new Color(62, 133, 78), 12);
      return;
    }
    const left = config.paylines.length > 5 ? ['1', '2', '3'] : ['1', '2', '3'];
    const right = config.paylines.length > 5 ? ['18', '19', '20'] : ['', '4', '5'];
    for (let row = 0; row < config.rows; row += 1) {
      const y = height / 2 - rowHeight * (row + 0.5);
      this.paylineMarker(parent, left[row] ?? '', -width / 2 - 12, y, 29, new Color(183, 54, 67));
      if (right[row]) this.paylineMarker(parent, right[row], width / 2 + 12, y, 29, new Color(65, 139, 91), right[row].length > 1 ? 12 : 15);
    }
  }

  private paylineMarker(parent: Node, text: string, x: number, y: number, size: number, color: Color, fontSize = 15): void {
    const node = new Node(`Payline-${text}`);
    node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(size, size);
    node.setPosition(x, y);
    parent.addChild(node);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(70, 25, 23, 225);
    graphics.circle(0, -1, size / 2);
    graphics.fill();
    graphics.strokeColor = new Color(255, 228, 155, 245);
    graphics.lineWidth = 2;
    graphics.circle(0, 0, size / 2 - 2);
    graphics.stroke();
    graphics.fillColor = new Color(color.r, color.g, color.b, 210);
    graphics.circle(0, 0, size / 2 - 5);
    graphics.fill();
    const labelNode = new Node('MarkerText');
    labelNode.layer = Layers.Enum.UI_2D;
    labelNode.addComponent(UITransform).setContentSize(size - 2, size - 2);
    node.addChild(labelNode);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 1;
    label.isBold = true;
    label.color = new Color(255, 248, 220);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
  }

  private drawWinningLines(wins: readonly WinResult[], config: GameConfig): void {
    if (!this.lineLayer) return;
    this.clearPaylines();
    const visibleWins = wins.filter((win) => win.positions.length > 0).slice(0, 3);
    if (!visibleWins.length) return;
    const graphics = this.lineLayer.getComponent(Graphics) ?? this.lineLayer.addComponent(Graphics);
    graphics.clear();
    const colors = [new Color(255, 73, 82), new Color(55, 177, 113), new Color(255, 190, 48)];

    visibleWins.forEach((win, index) => {
      const points = this.pointsForWin(win, config);
      if (points.length < 2) return;
      graphics.strokeColor = new Color(9, 18, 38, 205);
      graphics.lineWidth = 11;
      graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.stroke();
      graphics.strokeColor = colors[index % colors.length];
      graphics.lineWidth = 6;
      graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.stroke();
      graphics.strokeColor = new Color(236, 248, 255, 245);
      graphics.lineWidth = 2;
      graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.stroke();
      points.forEach((point) => {
        graphics.fillColor = new Color(241, 250, 255, 245);
        graphics.circle(point.x, point.y, 6);
        graphics.fill();
      });
    });

    const opacity = this.lineLayer.getComponent(UIOpacity) ?? this.lineLayer.addComponent(UIOpacity);
    opacity.opacity = 0;
    this.lineLayer.setScale(new Vec3(0.98, 0.98, 1));
    tween(opacity).to(0.12, { opacity: 255 }).delay(1.6).to(0.35, { opacity: 0 }).call(() => this.clearPaylines()).start();
    tween(this.lineLayer).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
  }

  private pointsForWin(win: WinResult, config: GameConfig): readonly Vec3[] {
    const rows = win.lineIndex !== undefined && config.paylines[win.lineIndex]
      ? config.paylines[win.lineIndex]
      : Array.from({ length: config.columns }, (_, column) => {
        const match = win.positions.find((position) => Math.floor(position / config.rows) === column);
        return match === undefined ? 1 : match % config.rows;
      });
    const columnWidth = this.reelWidth / this.columns;
    const rowHeight = this.reelHeight / this.rows;
    return rows.slice(0, this.columns).map((row, column) => new Vec3(
      -this.reelWidth / 2 + columnWidth * (column + 0.5),
      this.reelHeight / 2 - rowHeight * (row + 0.5),
      0,
    ));
  }

  private clearPaylines(): void {
    if (!this.lineLayer) return;
    Tween.stopAllByTarget(this.lineLayer);
    this.lineLayer.removeAllChildren();
    const graphics = this.lineLayer.getComponent(Graphics);
    if (graphics) graphics.clear();
    const opacity = this.lineLayer.getComponent(UIOpacity);
    if (opacity) opacity.opacity = 0;
    this.lineLayer.setScale(Vec3.ONE);
  }

  private accentFor(config: GameConfig): Color {
    if (config.id === 'lucky-coin-grove') return new Color(234, 113, 61);
    if (config.id === 'treasure-parade') return new Color(188, 52, 43);
    if (config.id === 'lantern-fortune') return new Color(68, 145, 111);
    return new Color(242, 169, 48);
  }

  private mix(a: Color, b: Color, ratio: number): Color {
    const inverse = 1 - ratio;
    return new Color(
      Math.round(a.r * inverse + b.r * ratio),
      Math.round(a.g * inverse + b.g * ratio),
      Math.round(a.b * inverse + b.b * ratio),
      255,
    );
  }
}
