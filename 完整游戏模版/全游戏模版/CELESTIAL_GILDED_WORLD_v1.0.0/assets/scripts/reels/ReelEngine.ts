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
    this.addGlassDetail(clipRoot, width, height, config.columns, config.rows);

    const labels = Object.fromEntries(config.symbols.map((symbol) => [symbol.id, symbol.label.replace(' ', '\n')]));
    const colors = Object.fromEntries(config.symbols.map((symbol) => [symbol.id, symbol.tier === 'wild' ? new Color(255, 190, 48) : symbol.tier === 'scatter' || symbol.tier === 'bonus' ? new Color(235, 74, 86) : symbol.tier === 'high' ? new Color(203, 57, 91) : new Color(193, 126, 45)]));
    const atlas = symbolAtlasForGame(config);
    const columns = config.reelStrips.map((strip, index) => {
      const node = new Node(`Reel-${index}`);
      node.layer = Layers.Enum.UI_2D;
      node.addComponent(UITransform).setContentSize(columnWidth, height);
      node.setPosition(-width / 2 + columnWidth * (index + 0.5), 0);
      clipRoot.addChild(node);
      const column = node.addComponent(ReelColumn);
      column.configure(config.rows, columnWidth, rowHeight, strip, labels, colors, atlas);
      return column;
    });
    this.controller.setColumns(columns);

    this.addMechanicalChrome(config, width, height, columnWidth, rowHeight);
    this.lineLayer = new Node('WinLineLayer');
    this.lineLayer.layer = Layers.Enum.UI_2D;
    this.lineLayer.addComponent(UITransform).setContentSize(width, height);
    this.node.addChild(this.lineLayer);
  }

  public spin(result: SpinResult, config: GameConfig, turbo: boolean): Promise<void[]> {
    this.clearPaylines();
    const byColumn = Array.from({ length: config.columns }, (_, column) => result.grid.slice(column * config.rows, column * config.rows + config.rows));
    return this.controller.spin(byColumn, turbo);
  }

  public presentWins(result: SpinResult, config: GameConfig): void {
    this.controller.highlight([...new Set(result.wins.flatMap((win) => win.positions))], config.rows);
    this.drawWinningLines(result.wins, config);
  }

  public quickStop(): void { this.controller.quickStop(); }

  private addGlassDetail(parent: Node, width: number, height: number, columns: number, rows: number): void {
    const node = new Node('IvoryReelGlass');
    node.layer = Layers.Enum.UI_2D;
    node.addComponent(UITransform).setContentSize(width, height);
    parent.addChild(node);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(255, 252, 238, 36);
    graphics.rect(-width / 2, height * 0.18, width, height * 0.32);
    graphics.fill();
    graphics.fillColor = new Color(173, 104, 48, 10);
    graphics.rect(-width / 2, -height / 2, width, height * 0.22);
    graphics.fill();
    graphics.strokeColor = new Color(161, 111, 47, 58);
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

    // Cabinet art already contains the cast rails. A restrained overlay keeps
    // moving symbols behind those rails without drawing a second frame.
    for (let column = 1; column < config.columns; column += 1) {
      const x = -width / 2 + columnWidth * column;
      graphics.strokeColor = new Color(126, 73, 32, 95);
      graphics.lineWidth = 3;
      graphics.moveTo(x + 1, -height / 2 + 4);
      graphics.lineTo(x + 1, height / 2 - 4);
      graphics.stroke();
      graphics.strokeColor = new Color(255, 225, 151, 115);
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
      graphics.strokeColor = new Color(82, 35, 20, 190);
      graphics.lineWidth = 11;
      graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.stroke();
      graphics.strokeColor = colors[index % colors.length];
      graphics.lineWidth = 6;
      graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.stroke();
      graphics.strokeColor = new Color(255, 248, 206, 245);
      graphics.lineWidth = 2;
      graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.stroke();
      points.forEach((point) => {
        graphics.fillColor = new Color(255, 245, 201, 245);
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
}
