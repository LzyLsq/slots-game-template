import { _decorator, Color, Component, Graphics, Mask, Node, UITransform } from 'cc';
import type { GameConfig, SpinResult } from '../math/types';
import { ReelColumn } from './ReelColumn';
import { ReelController } from './ReelController';
import { symbolAtlasForGame } from './SymbolAtlasCache';
const { ccclass } = _decorator;

@ccclass('ReelEngine')
export class ReelEngine extends Component {
  private controller!: ReelController;
  public configure(config: GameConfig, width: number, height: number, cornerRadius = 24, faceted = false): void {
    this.node.removeAllChildren(); this.controller = this.getComponent(ReelController) ?? this.node.addComponent(ReelController);
    const clipRoot = new Node('ReelClip'); clipRoot.addComponent(UITransform).setContentSize(width, height); const mask = clipRoot.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clipRoot.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.fillColor = Color.WHITE; if (faceted) { const halfWidth = width / 2; const halfHeight = height / 2; const cut = Math.max(18, Math.min(38, Math.min(width * 0.055, height * 0.12))); stencil.moveTo(-halfWidth + cut, -halfHeight); stencil.lineTo(halfWidth - cut, -halfHeight); stencil.lineTo(halfWidth, -halfHeight + cut); stencil.lineTo(halfWidth, halfHeight - cut); stencil.lineTo(halfWidth - cut, halfHeight); stencil.lineTo(-halfWidth + cut, halfHeight); stencil.lineTo(-halfWidth, halfHeight - cut); stencil.lineTo(-halfWidth, -halfHeight + cut); stencil.close(); } else stencil.roundRect(-width / 2, -height / 2, width, height, Math.max(8, Math.min(cornerRadius, height * 0.22))); stencil.fill(); } this.node.addChild(clipRoot);
    const columnWidth = width / config.columns; const rowHeight = height / config.rows;
    const labels = Object.fromEntries(config.symbols.map((symbol) => [symbol.id, symbol.label.replace(' ', '\n')]));
    const colors = Object.fromEntries(config.symbols.map((symbol) => [symbol.id, symbol.tier === 'wild' ? new Color(255, 205, 76) : symbol.tier === 'scatter' || symbol.tier === 'bonus' ? new Color(255, 239, 201) : symbol.tier === 'high' ? new Color(232, 137, 151) : new Color(244, 211, 150)]));
    const atlas = symbolAtlasForGame(config);
    const columns = config.reelStrips.map((strip, index) => {
      const node = new Node(`Reel-${index}`); node.addComponent(UITransform).setContentSize(columnWidth, height); node.setPosition(-width / 2 + columnWidth * (index + 0.5), 0); clipRoot.addChild(node);
      const column = node.addComponent(ReelColumn); column.configure(config.rows, rowHeight, columnWidth, strip, labels, colors, atlas); return column;
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
