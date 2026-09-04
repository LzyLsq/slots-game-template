import { _decorator, Color, Component, Node, UITransform, Vec3 } from 'cc';
import { ReelSymbol } from './ReelSymbol';
import type { SymbolAtlasSpec } from './SymbolAtlasCache';
import type { SymbolDefinition } from '../math/types';
const { ccclass } = _decorator;

type Motion = 'idle' | 'prepress' | 'accelerate' | 'cruise' | 'decelerate' | 'align' | 'bounce';

@ccclass('ReelColumn')
export class ReelColumn extends Component {
  private symbols: ReelSymbol[] = [];
  private cycle: readonly string[] = [];
  private labels: Readonly<Record<string, string>> = {};
  private colors: Readonly<Record<string, Color>> = {};
  private tiers: Readonly<Record<string, SymbolDefinition['tier']>> = {};
  private result: readonly string[] = [];
  private rowHeight = 180;
  private visibleRows = 3;
  private visibleStart = 2;
  private restingTop = 0;
  private motion: Motion = 'idle';
  private elapsed = 0;
  private stopAt = 1;
  private speed = 0;
  private cursor = 0;
  private resolve?: () => void;
  private turbo = false;
  private quickStopRequested = false;
  private phaseDistance = 0;
  private decelDistance = 0;
  private decelMoved = 0;
  private decelDuration = 0.43;
  private decelSlope = 1.8;
  private readonly scratchPosition = new Vec3();

  public configure(visibleRows: number, columnWidth: number, rowHeight: number, cycle: readonly string[], labels: Readonly<Record<string, string>>, colors: Readonly<Record<string, Color>>, tiers: Readonly<Record<string, SymbolDefinition['tier']>>, atlas: SymbolAtlasSpec): void {
    this.visibleRows = visibleRows; this.rowHeight = rowHeight; this.cycle = cycle; this.labels = labels; this.colors = colors; this.tiers = tiers;
    // Keep a complete result band above the aperture plus two symbols of
    // bottom run-out. The result can then roll into view during deceleration
    // instead of being swapped onto already-stopped cells.
    this.visibleStart = visibleRows + 2;
    const count = visibleRows * 2 + 4;
    this.restingTop = (this.visibleStart + (visibleRows - 1) * 0.5) * rowHeight;
    for (let index = 0; index < count; index += 1) {
      const node = new Node(`Symbol-${index}`); node.addComponent(UITransform).setContentSize(columnWidth, rowHeight - 10); this.node.addChild(node);
      const symbol = node.addComponent(ReelSymbol); symbol.initialize(columnWidth - 6, rowHeight - 10, atlas); this.symbols.push(symbol);
    }
    this.symbols.forEach((symbol, index) => { const id = this.cycle[this.cursor++ % this.cycle.length]; symbol.setSymbol(id, this.labels[id] ?? id, this.colors[id] ?? Color.WHITE, this.tiers[id] ?? 'low'); });
    this.layout();
    for (let row = 0; row < this.visibleRows; row += 1) this.symbols[this.visibleStart + row]?.activateIdle(row * 0.055);
  }

  public spinTo(result: readonly string[], delay: number, turbo: boolean): Promise<void> {
    if (this.motion !== 'idle') return Promise.resolve();
    this.result = result;
    this.elapsed = 0;
    this.speed = 0;
    this.stopAt = (turbo ? 0.24 : 0.78) + delay;
    this.turbo = turbo;
    this.quickStopRequested = false;
    this.phaseDistance = 0;
    this.decelDistance = 0;
    this.decelMoved = 0;
    this.motion = 'prepress';
    this.symbols.forEach((symbol) => symbol.setSpinMotion(true));
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  public quickStop(): void {
    if (this.motion === 'idle' || this.motion === 'decelerate' || this.motion === 'align' || this.motion === 'bounce') return;
    this.quickStopRequested = true;
    if (this.motion === 'cruise') this.stopAt = Math.min(this.stopAt, this.elapsed + 0.06);
  }
  public highlight(rows: readonly number[]): void { rows.forEach((row) => this.symbols[row + this.visibleStart]?.playWin()); }

  protected update(deltaTime: number): void {
    if (this.motion === 'idle') return;
    // Sub-stepping preserves the same travel distance after a slow frame while
    // keeping recycling and stop alignment stable. No objects are allocated in
    // this hot path.
    let remaining = Math.min(deltaTime, 0.1);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 60);
      this.advance(dt);
      remaining -= dt;
    }
  }

  private advance(dt: number): void {
    this.elapsed += dt;
    if (this.motion === 'prepress') {
      const duration = this.turbo ? 0.055 : 0.085;
      const t = Math.min(1, this.elapsed / duration);
      const targetDistance = -this.rowHeight * 0.105 * this.smoothStep(t);
      this.move(targetDistance - this.phaseDistance);
      this.phaseDistance = targetDistance;
      if (t >= 1) { this.motion = 'accelerate'; this.elapsed = 0; this.phaseDistance = 0; }
    } else if (this.motion === 'accelerate') {
      const duration = this.turbo ? 0.115 : 0.21;
      const terminal = this.terminalSpeed();
      const t = Math.min(1, this.elapsed / duration);
      this.speed = terminal * (1 - Math.pow(1 - t, 3));
      this.move(this.speed * dt);
      if (t >= 1 || this.quickStopRequested) { this.motion = 'cruise'; this.elapsed = 0; this.speed = terminal; if (this.quickStopRequested) this.stopAt = 0.04; }
    } else if (this.motion === 'cruise') {
      this.speed = this.terminalSpeed();
      this.move(this.speed * dt);
      if (this.elapsed >= this.stopAt) this.beginDeceleration();
    } else if (this.motion === 'decelerate') {
      const t = Math.min(1, this.elapsed / this.decelDuration);
      // Cubic Hermite stop: start derivative is matched to the cruise speed
      // and the end derivative is zero. This removes the speed spike caused
      // by a generic cubic-out curve on a long stopping distance.
      const eased = this.hermiteStop(t, this.decelSlope);
      const targetDistance = this.decelDistance * eased;
      this.move(targetDistance - this.decelMoved);
      this.decelMoved = targetDistance;
      if (t >= 1) {
        this.layout();
        this.motion = 'align';
        this.elapsed = 0;
      }
    } else if (this.motion === 'align') {
      const duration = this.turbo ? 0.045 : 0.075;
      const t = Math.min(1, this.elapsed / duration);
      this.layout(-this.rowHeight * 0.075 * this.smoothStep(t));
      if (t >= 1) {
        for (let row = 0; row < this.visibleRows; row += 1) this.symbols[row + this.visibleStart]?.playLand(row * 0.018);
        this.motion = 'bounce';
        this.elapsed = 0;
      }
    } else if (this.motion === 'bounce') {
      const duration = this.turbo ? 0.105 : 0.17;
      const t = Math.min(1, this.elapsed / duration);
      const settle = -this.rowHeight * 0.075 * (1 - this.easeOutBack(t));
      this.layout(settle);
      if (t >= 1) { this.finishSpin(); }
    }
  }

  private move(distance: number): void {
    if (Math.abs(distance) < 0.0001) return;
    const lastIndex = this.symbols.length - 1;
    const lowerRecycle = this.restingTop - lastIndex * this.rowHeight - this.rowHeight * 0.5;
    for (let index = 0; index < this.symbols.length; index += 1) {
      const symbol = this.symbols[index];
      this.scratchPosition.set(0, symbol.node.position.y - distance, 0);
      symbol.node.setPosition(this.scratchPosition);
    }
    while (this.symbols[lastIndex].node.position.y < lowerRecycle) {
      const recycled = this.symbols[lastIndex];
      for (let index = lastIndex; index > 0; index -= 1) this.symbols[index] = this.symbols[index - 1];
      this.symbols[0] = recycled;
      this.scratchPosition.set(0, this.symbols[1].node.position.y + this.rowHeight, 0);
      recycled.node.setPosition(this.scratchPosition);
      const id = this.cycle[this.cursor++ % this.cycle.length];
      recycled.setSymbol(id, this.labels[id] ?? id, this.colors[id] ?? Color.WHITE, this.tiers[id] ?? 'low');
    }
  }

  private beginDeceleration(): void {
    // Stage the full result band outside the top of the masked reel. Exactly
    // `visibleStart` recycle steps later it occupies the visible cells, so
    // players see the real final artwork roll in rather than a late texture
    // cross-fade.
    for (let row = 0; row < this.visibleRows; row += 1) {
      const id = this.result[row] ?? this.cycle[this.cursor++ % this.cycle.length];
      this.symbols[row].setSymbol(id, this.labels[id] ?? id, this.colors[id] ?? Color.WHITE, this.tiers[id] ?? 'low');
    }
    const rotations = this.visibleStart;
    this.decelDistance = this.symbols[0].node.position.y + rotations * this.rowHeight - this.restingTop;
    if (this.decelDistance < this.rowHeight * (rotations - 1)) this.decelDistance += this.rowHeight;
    const speed = Math.max(1, this.terminalSpeed());
    const desiredSlope = this.turbo ? 1.72 : 1.82;
    const rawDuration = desiredSlope * this.decelDistance / speed;
    this.decelDuration = this.turbo
      ? Math.max(0.32, Math.min(0.64, rawDuration))
      : Math.max(0.48, Math.min(0.84, rawDuration));
    this.decelSlope = Math.max(0.9, Math.min(2.25, speed * this.decelDuration / this.decelDistance));
    this.decelMoved = 0;
    this.elapsed = 0;
    this.motion = 'decelerate';
    this.symbols.forEach((symbol) => symbol.setSpinMotion(false));
  }

  private finishSpin(): void {
    this.layout();
    this.motion = 'idle';
    this.speed = 0;
    this.quickStopRequested = false;
    const done = this.resolve;
    this.resolve = undefined;
    done?.();
  }

  private terminalSpeed(): number { return this.rowHeight * (this.turbo ? 20 : 15.5); }
  private smoothStep(value: number): number { return value * value * (3 - 2 * value); }
  private hermiteStop(value: number, startSlope: number): number {
    return (startSlope - 2) * value * value * value + (3 - 2 * startSlope) * value * value + startSlope * value;
  }
  private easeOutBack(value: number): number {
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
  }
  private layout(offset = 0): void {
    for (let index = 0; index < this.symbols.length; index += 1) {
      this.scratchPosition.set(0, this.restingTop - index * this.rowHeight + offset, 0);
      this.symbols[index].node.setPosition(this.scratchPosition);
    }
  }
}
