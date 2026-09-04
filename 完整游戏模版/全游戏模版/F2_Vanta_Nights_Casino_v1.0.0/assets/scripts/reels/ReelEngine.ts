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
      column.configure(config.rows, columnWidth, rowHeight, strip, labels, colors, tiers, atlas);
      return column;
    });
    this.controller.setColumns(columns);
    this.addSpinSheen(clipRoot, width, height, accent);

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
  }

  public quickStop(): void { this.controller.quickStop(); }

  private addSpinSheen(parent: Node, width: number, height: number, accent: Color): void {
    const sheen = new Node('ReelMotionSheen'); sheen.layer = Layers.Enum.UI_2D; sheen.addComponent(UITransform).setContentSize(width, height * 0.18); sheen.angle = -7; parent.addChild(sheen);
    const graphics = sheen.addComponent(Graphics); graphics.fillColor = new Color(255, 249, 222, 20); graphics.roundRect(-width * 0.43, -height * 0.028, width * 0.86, height * 0.056, 18); graphics.fill(); graphics.fillColor = new Color(accent.r, accent.g, accent.b, 15); graphics.roundRect(-width * 0.23, height * 0.012, width * 0.46, height * 0.018, 10); graphics.fill();
    this.spinSheenOpacity = sheen.addComponent(UIOpacity); this.spinSheenOpacity.opacity = 0; this.spinSheen = sheen;
  }

  private startSpinSheen(turbo: boolean): void {
    if (!this.spinSheen || !this.spinSheenOpacity) return;
    Tween.stopAllByTarget(this.spinSheen); Tween.stopAllByTarget(this.spinSheenOpacity);
    const travel = this.reelHeight * 0.68; const duration = turbo ? 0.32 : 0.48;
    this.spinSheen.setPosition(0, travel, 0); this.spinSheenOpacity.opacity = 0;
    tween(this.spinSheenOpacity).to(0.12, { opacity: 86 }, { easing: 'sineOut' }).start();
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
      this.paylineMarker(parent, '243', -width / 2 - 14, 0, 34, new Color(62, 133, 78));
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
    if (config.id === 'crimson-roulette') return new Color(255, 67, 111);
    if (config.id === 'sapphire-surge') return new Color(48, 166, 255);
    if (config.id === 'emerald-dice') return new Color(52, 218, 142);
    return new Color(190, 92, 255);
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
