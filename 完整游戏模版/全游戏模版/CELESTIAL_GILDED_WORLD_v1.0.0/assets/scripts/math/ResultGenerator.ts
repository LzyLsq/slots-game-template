import type { RandomSource } from '../core/SecureRNG';
import { ExpandingWildController, HoldAndSpinController } from './FeatureControllers';
import { PaylineEvaluator, ScatterEvaluator, WaysEvaluator } from './Evaluators';
import type { FeatureResult, FeatureRound, FeatureTrigger, ForceResult, GameConfig, SpinResult, WinResult } from './types';

export class ResultGenerator {
  private readonly paylines = new PaylineEvaluator();
  private readonly ways = new WaysEvaluator();
  private readonly scatters = new ScatterEvaluator();
  private sequence = 0;

  public generate(config: GameConfig, bet: number, rng: RandomSource, force?: ForceResult): SpinResult {
    if (!config.bets.includes(bet)) throw new Error('Unsupported bet');
    const seed = rng.snapshot(); const stops = config.reelStrips.map((strip) => rng.int(0, strip.length)); const grid = this.gridFromStops(config, stops);
    this.applyForce(config, grid, force);
    const neonFeature = config.id === 'neon-classic' ? this.tryNeonNudge(config, grid, stops, bet, rng) : undefined;
    const wins = this.evaluate(config, grid, bet);
    if (force?.winTier) { const tierMultiplier = force.winTier === 'big' ? 30 : force.winTier === 'mega' ? 75 : 150; wins.push({ kind: 'bonus', symbolId: force.winTier, count: 1, multiplier: tierMultiplier, credits: bet * tierMultiplier, positions: [] }); }
    const trigger = neonFeature?.trigger ?? this.feature(config, grid, force);
    const baseWin = wins.reduce((sum, win) => sum + win.credits, 0);
    const featureResult = neonFeature?.result ?? this.resolveFeature(config, bet, trigger, grid, rng, force);
    const featureWin = featureResult?.totalCredits ?? 0;
    const scatterColumns = config.scatterId ? Array.from({ length: config.columns }, (_, column) => column).filter((column) => grid.slice(column * config.rows, column * config.rows + config.rows).includes(config.scatterId as string)) : [];
    const anticipationColumns = scatterColumns.length >= 2 ? Array.from({ length: config.columns - scatterColumns.length }, (_, index) => scatterColumns.length + index) : [];
    return { spinId: `${config.id}-${seed.toString(16)}-${this.sequence += 1}`, gameId: config.id, seed, stops, grid, wins, baseWin, featureWin, totalWin: baseWin + featureWin, feature: trigger, featureResult, anticipationColumns };
  }

  private gridFromStops(config: GameConfig, stops: readonly number[]): string[] {
    return config.reelStrips.flatMap((strip, column) => Array.from({ length: config.rows }, (_, row) => strip[(stops[column] + row) % strip.length]));
  }

  private evaluate(config: GameConfig, grid: readonly string[], bet: number): WinResult[] {
    return [...(config.payMode === 'ways' ? this.ways.evaluate(config, grid, bet) : this.paylines.evaluate(config, grid, bet)), ...this.scatters.evaluate(config, grid, bet)];
  }

  private applyForce(config: GameConfig, grid: string[], force?: ForceResult): void {
    if (!force) return;
    const target = force.symbolId ?? config.symbols.find((symbol) => symbol.tier === 'high')?.id ?? config.wildId; const count = force.count ?? 3;
    for (let column = 0; column < Math.min(count, config.columns); column += 1) grid[column * config.rows + 1] = target;
    if (force.wild && config.columns > 1) grid[config.rows + 1] = config.wildId;
    if (force.scatterCount && config.scatterId) for (let column = 0; column < Math.min(force.scatterCount, config.columns); column += 1) grid[column * config.rows] = config.scatterId;
    if (force.holdAndSpin && config.bonusId) for (let index = 0; index < Math.min(6, grid.length); index += 1) grid[index] = config.bonusId;
  }

  private feature(config: GameConfig, grid: readonly string[], force?: ForceResult): FeatureTrigger | undefined {
    if (config.bonusId) { const count = grid.filter((symbol) => symbol === config.bonusId).length; if (count >= 6 || force?.holdAndSpin) return { type: 'hold-and-spin', count: 3 }; }
    if (config.scatterId && config.scatterAwards) { const count = Math.min(5, grid.filter((symbol) => symbol === config.scatterId).length); const spins = config.scatterAwards[count]; if (spins) return { type: 'free-spins', count: spins, multiplier: config.id === 'astral-vault' ? 2 : 1 }; }
    return undefined;
  }

  private resolveFeature(config: GameConfig, bet: number, trigger: FeatureTrigger | undefined, sourceGrid: readonly string[], rng: RandomSource, force?: ForceResult): FeatureResult | undefined {
    if (!trigger) return undefined;
    if (trigger.type === 'hold-and-spin') {
      const initial = sourceGrid.flatMap((symbol, index) => symbol === config.bonusId ? [index] : []).slice(0, 6); const bonus = new HoldAndSpinController().generate(rng, initial.length >= 6 ? initial : [0, 2, 4, 6, 8, 10], force?.jackpot, bet);
      const finalGrid = [...sourceGrid]; const finalValues = bonus.steps.length ? bonus.steps[bonus.steps.length - 1].values : {}; Object.keys(finalValues).forEach((position) => { finalGrid[Number(position)] = config.bonusId ?? finalGrid[Number(position)]; });
      const round: FeatureRound = { index: bonus.steps.length, grid: finalGrid, wins: [], credits: bonus.totalCredits };
      return { type: trigger.type, rounds: [round], totalCredits: bonus.totalCredits, jackpot: bonus.jackpot, detail: `${bonus.steps.length} respins resolved` };
    }
    const rounds: FeatureRound[] = []; const sticky = new Set<number>(); const expander = new ExpandingWildController(); const multiplier = trigger.multiplier ?? 1;
    for (let index = 0; index < trigger.count; index += 1) {
      const stops = config.reelStrips.map((strip) => rng.int(0, strip.length)); const grid = this.gridFromStops(config, stops);
      if (config.feature === 'sticky-free-spins') { sticky.forEach((position) => { grid[position] = config.wildId; }); grid.forEach((symbol, position) => { if (symbol === config.wildId && sticky.size < 3) sticky.add(position); }); }
      if (config.feature === 'expanding-wild-free-spins') for (let column = 0; column < config.columns; column += 1) if (grid.slice(column * config.rows, (column + 1) * config.rows).includes(config.wildId)) expander.apply(grid, config.rows, column, config.wildId);
      const rawWins = this.evaluate(config, grid, bet); const wins = rawWins.map((win) => ({ ...win, multiplier: win.multiplier * multiplier, credits: win.credits * multiplier })); const credits = wins.reduce((sum, win) => sum + win.credits, 0);
      rounds.push({ index: index + 1, grid, wins, credits });
    }
    return { type: trigger.type, rounds, totalCredits: rounds.reduce((sum, round) => sum + round.credits, 0), detail: `${rounds.length} free spins fully resolved` };
  }

  private tryNeonNudge(config: GameConfig, grid: string[], stops: readonly number[], bet: number, rng: RandomSource): { trigger: FeatureTrigger; result: FeatureResult } | undefined {
    if (!rng.bool(0.35)) return undefined;
    for (let reel = 0; reel < config.columns; reel += 1) {
      for (const offset of [-1, 1] as const) {
        const candidate = [...grid]; const strip = config.reelStrips[reel]; const stop = (stops[reel] + offset + strip.length) % strip.length;
        for (let row = 0; row < config.rows; row += 1) candidate[reel * config.rows + row] = strip[(stop + row) % strip.length];
        const original = this.evaluate(config, grid, bet).reduce((sum, win) => sum + win.credits, 0); const wins = this.evaluate(config, candidate, bet); const credits = wins.reduce((sum, win) => sum + win.credits, 0);
        if (credits > original) { grid.splice(0, grid.length, ...candidate); const trigger: FeatureTrigger = { type: 'nudge', count: 1 }; return { trigger, result: { type: 'nudge', rounds: [{ index: 1, grid: candidate, wins, credits: 0 }], totalCredits: 0, detail: `Reel ${reel + 1} nudged ${offset > 0 ? 'down' : 'up'}` } }; }
      }
    }
    return undefined;
  }
}
