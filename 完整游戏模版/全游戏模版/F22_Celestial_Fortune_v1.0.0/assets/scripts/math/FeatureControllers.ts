import type { RandomSource } from '../core/SecureRNG';

export interface HoldAndSpinStep {
  readonly remaining: number;
  readonly newPositions: readonly number[];
  readonly values: Readonly<Record<number, number>>;
}

export interface HoldAndSpinResult {
  readonly steps: readonly HoldAndSpinStep[];
  readonly totalCredits: number;
  readonly jackpot?: 'mini' | 'minor' | 'major' | 'grand';
}

export class FreeSpinsController {
  private remaining = 0;
  private readonly stickyWilds = new Set<number>();

  public start(count: number): void { this.remaining = count; this.stickyWilds.clear(); }
  public consume(): boolean { if (this.remaining <= 0) return false; this.remaining -= 1; return true; }
  public addSticky(position: number): void { this.stickyWilds.add(position); }
  public get count(): number { return this.remaining; }
  public get sticky(): readonly number[] { return [...this.stickyWilds]; }
}

export class StickyWildController {
  private readonly positions = new Set<number>();
  public lock(position: number): void { this.positions.add(position); }
  public apply(grid: string[], wildId: string): void { this.positions.forEach((position) => { grid[position] = wildId; }); }
  public clear(): void { this.positions.clear(); }
}

export class HoldAndSpinController {
  public generate(rng: RandomSource, initialPositions: readonly number[], forcedJackpot?: HoldAndSpinResult['jackpot'], unitBet = 500): HoldAndSpinResult {
    const locked = new Set(initialPositions);
    const values: Record<number, number> = {};
    initialPositions.forEach((position) => { values[position] = Math.round(unitBet * [0.02, 0.04, 0.1, 0.2][rng.int(0, 4)]); });
    let remaining = 3;
    const steps: HoldAndSpinStep[] = [];
    while (remaining > 0 && locked.size < 15 && steps.length < 30) {
      remaining -= 1;
      const candidates = Array.from({ length: 15 }, (_, index) => index).filter((position) => !locked.has(position));
      const newPositions = candidates.filter(() => rng.bool(0.14)).slice(0, 3);
      newPositions.forEach((position) => { locked.add(position); values[position] = Math.round(unitBet * [0.02, 0.04, 0.1, 0.2, 0.5][rng.int(0, 5)]); });
      if (newPositions.length > 0) remaining = 3;
      steps.push({ remaining, newPositions, values: { ...values } });
    }
    const jackpot = forcedJackpot ?? (locked.size === 15 ? 'grand' : locked.size >= 12 ? 'major' : locked.size >= 9 ? 'minor' : locked.size >= 7 ? 'mini' : undefined);
    const jackpotCredits = unitBet * (jackpot === 'grand' ? 20 : jackpot === 'major' ? 5 : jackpot === 'minor' ? 1 : jackpot === 'mini' ? 0.5 : 0);
    return { steps, totalCredits: Object.values(values).reduce((sum, value) => sum + value, jackpotCredits), jackpot };
  }
}

export class HoldController {
  private held = new Set<number>();
  public toggle(reel: number): void { this.held.has(reel) ? this.held.delete(reel) : this.held.add(reel); }
  public consume(): readonly number[] { const result = [...this.held]; this.held.clear(); return result; }
}

export class NudgeController {
  public calculate(rng: RandomSource): { reel: number; offset: -1 | 1 } | undefined {
    return rng.bool(0.12) ? { reel: rng.int(0, 3), offset: rng.bool() ? -1 : 1 } : undefined;
  }
}

export class DoubleOrCollectController {
  private attempts = 0;
  public constructor(private readonly maximumAttempts = 3) {}
  public guess(rng: RandomSource, choice: 'red' | 'blue', credits: number): { won: boolean; credits: number } {
    if (this.attempts >= this.maximumAttempts) return { won: false, credits };
    this.attempts += 1;
    const won = choice === (rng.bool() ? 'red' : 'blue');
    return { won, credits: won ? credits * 2 : 0 };
  }
  public reset(): void { this.attempts = 0; }
}

export class ExpandingWildController {
  public apply(grid: string[], rows: number, column: number, wildId: string): void {
    for (let row = 0; row < rows; row += 1) grid[column * rows + row] = wildId;
  }
}
