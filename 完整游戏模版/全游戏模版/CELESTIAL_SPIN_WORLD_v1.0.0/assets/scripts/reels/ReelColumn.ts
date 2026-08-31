import { _decorator, Color, Component, Node, UITransform, Vec3 } from 'cc';
import { ReelSymbol } from './ReelSymbol';
import type { SymbolAtlasSpec } from './SymbolAtlasCache';
const { ccclass } = _decorator;

type Motion = 'idle' | 'prepress' | 'accelerate' | 'cruise' | 'decelerate' | 'align' | 'bounce';

@ccclass('ReelColumn')
export class ReelColumn extends Component {
  private symbols: ReelSymbol[] = [];
  private cycle: readonly string[] = [];
  private labels: Readonly<Record<string, string>> = {};
  private colors: Readonly<Record<string, Color>> = {};
  private result: readonly string[] = [];
  private rowHeight = 180;
  private visibleRows = 3;
  private motion: Motion = 'idle';
  private elapsed = 0;
  private stopAt = 1;
  private speed = 0;
  private cursor = 0;
  private resolve?: () => void;

  public configure(visibleRows: number, rowHeight: number, cycle: readonly string[], labels: Readonly<Record<string, string>>, colors: Readonly<Record<string, Color>>, atlas: SymbolAtlasSpec): void {
    this.visibleRows = visibleRows; this.rowHeight = rowHeight; this.cycle = cycle; this.labels = labels; this.colors = colors;
    const count = visibleRows + 4;
    for (let index = 0; index < count; index += 1) {
      const node = new Node(`Symbol-${index}`); node.addComponent(UITransform).setContentSize(170, rowHeight - 16); this.node.addChild(node);
      const symbol = node.addComponent(ReelSymbol); symbol.initialize(rowHeight - 16, atlas); this.symbols.push(symbol);
    }
    this.symbols.forEach((symbol, index) => { const id = this.cycle[this.cursor++ % this.cycle.length]; symbol.setSymbol(id, this.labels[id] ?? id, this.colors[id] ?? Color.WHITE); });
    this.layout();
  }

  public spinTo(result: readonly string[], delay: number, turbo: boolean): Promise<void> {
    if (this.motion !== 'idle') return Promise.resolve();
    this.result = result; this.elapsed = 0; this.speed = -120; this.stopAt = (turbo ? 0.42 : 1.05) + delay; this.motion = 'prepress';
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  public quickStop(): void { if (this.motion === 'cruise' || this.motion === 'accelerate') this.stopAt = Math.min(this.stopAt, this.elapsed + 0.12); }
  public highlight(rows: readonly number[]): void { rows.forEach((row) => this.symbols[row + 2]?.playWin()); }

  protected update(deltaTime: number): void {
    if (this.motion === 'idle') return;
    const dt = Math.min(deltaTime, 1 / 20); this.elapsed += dt;
    if (this.motion === 'prepress') {
      this.speed = -240; this.move(this.speed * dt);
      if (this.elapsed >= 0.09) { this.motion = 'accelerate'; this.elapsed = 0; }
    } else if (this.motion === 'accelerate') {
      this.speed = Math.min(2600, this.speed + 7200 * dt); this.move(this.speed * dt);
      if (this.elapsed >= 0.28) { this.motion = 'cruise'; this.elapsed = 0; }
    } else if (this.motion === 'cruise') {
      this.speed = 2600; this.move(this.speed * dt);
      if (this.elapsed >= this.stopAt) { this.motion = 'decelerate'; this.elapsed = 0; }
    } else if (this.motion === 'decelerate') {
      const t = Math.min(1, this.elapsed / 0.48); this.speed = 2600 * (1 - t) * (1 - t) + 120; this.move(this.speed * dt);
      if (t >= 1) { this.motion = 'align'; this.elapsed = 0; this.applyResult(); }
    } else if (this.motion === 'align') {
      const t = Math.min(1, this.elapsed / 0.12); this.layout(18 * (1 - t));
      if (t >= 1) { this.motion = 'bounce'; this.elapsed = 0; }
    } else if (this.motion === 'bounce') {
      const t = Math.min(1, this.elapsed / 0.14); this.layout(-8 * Math.sin(t * Math.PI));
      if (t >= 1) { this.layout(); this.motion = 'idle'; const done = this.resolve; this.resolve = undefined; done?.(); }
    }
  }

  private move(distance: number): void {
    const upper = (this.symbols.length / 2) * this.rowHeight;
    const lower = -upper;
    this.symbols.forEach((symbol) => {
      const position = symbol.node.position.clone(); position.y -= distance;
      if (position.y < lower) { position.y += this.symbols.length * this.rowHeight; const id = this.cycle[this.cursor++ % this.cycle.length]; symbol.setSymbol(id, this.labels[id] ?? id, this.colors[id] ?? Color.WHITE); }
      symbol.node.setPosition(position);
    });
  }
  private applyResult(): void {
    const visibleStart = 2;
    this.symbols.forEach((symbol, index) => { const resultIndex = index - visibleStart; const id = resultIndex >= 0 && resultIndex < this.visibleRows ? this.result[resultIndex] : this.cycle[this.cursor++ % this.cycle.length]; symbol.setSymbol(id, this.labels[id] ?? id, this.colors[id] ?? Color.WHITE); });
  }
  private layout(offset = 0): void { const top = ((this.symbols.length - 1) * this.rowHeight) / 2; this.symbols.forEach((symbol, index) => symbol.node.setPosition(new Vec3(0, top - index * this.rowHeight + offset, 0))); }
}
