import { _decorator, Color, Component, Mask, Node, UITransform } from 'cc';
import type { GameConfig, SpinResult } from '../math/types';
import { ReelColumn } from './ReelColumn';
import { ReelController } from './ReelController';
import { symbolAtlasForGame } from './SymbolAtlasCache';
const { ccclass } = _decorator;

@ccclass('ReelEngine')
export class ReelEngine extends Component {
  private controller!: ReelController;
  public configure(config: GameConfig, width: number, height: number): void {
    this.node.removeAllChildren(); this.controller = this.getComponent(ReelController) ?? this.node.addComponent(ReelController);
    const clipRoot = new Node('ReelClip'); clipRoot.addComponent(UITransform).setContentSize(width, height); clipRoot.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT; this.node.addChild(clipRoot);
    const columnWidth = width / config.columns; const rowHeight = height / config.rows;
    const labels = Object.fromEntries(config.symbols.map((symbol) => [symbol.id, symbol.label.replace(' ', '\n')]));
    const colors = Object.fromEntries(config.symbols.map((symbol) => [symbol.id, symbol.tier === 'wild' ? new Color(255, 208, 70) : symbol.tier === 'scatter' || symbol.tier === 'bonus' ? new Color(84, 234, 255) : symbol.tier === 'high' ? new Color(226, 120, 255) : new Color(220, 230, 255)]));
    const atlas = symbolAtlasForGame(config);
    const columns = config.reelStrips.map((strip, index) => {
      const node = new Node(`Reel-${index}`); node.addComponent(UITransform).setContentSize(columnWidth, height); node.setPosition(-width / 2 + columnWidth * (index + 0.5), 0); clipRoot.addChild(node);
      const column = node.addComponent(ReelColumn); column.configure(config.rows, rowHeight, strip, labels, colors, atlas); return column;
    });
    this.controller.setColumns(columns);
  }
  public spin(result: SpinResult, config: GameConfig, turbo: boolean): Promise<void[]> {
    const byColumn = Array.from({ length: config.columns }, (_, column) => result.grid.slice(column * config.rows, column * config.rows + config.rows));
    return this.controller.spin(byColumn, turbo);
  }
  public presentWins(result: SpinResult, config: GameConfig): void { this.controller.highlight([...new Set(result.wins.flatMap((win) => win.positions))], config.rows); }
  public quickStop(): void { this.controller.quickStop(); }
}
