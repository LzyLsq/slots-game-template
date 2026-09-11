import type { RandomSource } from '../core/SecureRNG';
import { ExpandingWildController, HoldAndSpinController } from './FeatureControllers';
import { ClusterEvaluator, PaylineEvaluator, ScatterEvaluator, WaysEvaluator } from './Evaluators';
import type { FeatureResult, FeatureRound, FeatureTrigger, ForceResult, GameConfig, SpinResult, WinResult } from './types';

export class ResultGenerator {
  private readonly paylines = new PaylineEvaluator();
  private readonly ways = new WaysEvaluator();
  private readonly clusters = new ClusterEvaluator();
  private readonly scatters = new ScatterEvaluator();
  private sequence = 0;

  public generate(config: GameConfig, bet: number, rng: RandomSource, force?: ForceResult): SpinResult {
    if (!config.bets.includes(bet)) throw new Error('Unsupported bet');
    const seed = rng.snapshot();
    const stops = config.reelStrips.map((strip) => rng.int(0, strip.length));
    const grid = this.gridFromStops(config, stops);
    this.applyForce(config, grid, force);
    const wins = this.evaluate(config, grid, bet);
    if (force?.winTier) {
      const multiplier = force.winTier === 'big' ? 30 : force.winTier === 'mega' ? 75 : 150;
      wins.push({ kind: 'bonus', symbolId: force.winTier, count: 1, multiplier, credits: bet * multiplier, positions: [] });
    }
    const trigger = this.feature(config, grid, wins, force, rng);
    const featureResult = this.resolveFeature(config, bet, trigger, grid, rng, force);
    const maximum = bet * config.maxWinMultiplier;
    const rawBaseWin = wins.reduce((sum, win) => sum + win.credits, 0);
    const baseWin = Math.min(maximum, rawBaseWin);
    const featureWin = Math.min(Math.max(0, maximum - baseWin), featureResult?.totalCredits ?? 0);
    const scatterColumns = config.scatterId
      ? Array.from({ length: config.columns }, (_, column) => column).filter((column) => grid.slice(column * config.rows, column * config.rows + config.rows).includes(config.scatterId as string))
      : [];
    const anticipationColumns = scatterColumns.length >= 2
      ? Array.from({ length: config.columns - scatterColumns.length }, (_, index) => scatterColumns.length + index)
      : [];
    return {
      spinId: `${config.id}-${seed.toString(16)}-${this.sequence += 1}`, gameId: config.id, seed, stops, grid, wins,
      baseWin, featureWin, totalWin: baseWin + featureWin, feature: trigger,
      featureResult: featureResult ? { ...featureResult, totalCredits: featureWin } : undefined, anticipationColumns,
    };
  }

  private gridFromStops(config: GameConfig, stops: readonly number[]): string[] {
    return config.reelStrips.flatMap((strip, column) =>
      Array.from({ length: config.rows }, (_, row) => strip[(stops[column] + row) % strip.length]));
  }

  private evaluate(config: GameConfig, grid: readonly string[], bet: number): WinResult[] {
    const base = config.payMode === 'ways'
      ? this.ways.evaluate(config, grid, bet)
      : config.payMode === 'clusters'
        ? this.clusters.evaluate(config, grid, bet)
        : this.paylines.evaluate(config, grid, bet);
    return [...base, ...this.scatters.evaluate(config, grid, bet)];
  }

  private applyForce(config: GameConfig, grid: string[], force?: ForceResult): void {
    if (!force) return;
    const target = force.symbolId ?? config.symbols.find((symbol) => symbol.tier === 'high')?.id ?? config.wildId;
    const count = force.count ?? 3;
    if (config.payMode === 'clusters') {
      for (let index = 0; index < Math.min(Math.max(count, config.minimumCluster ?? 5), grid.length); index += 1) grid[index] = target;
    } else {
      for (let column = 0; column < Math.min(count, config.columns); column += 1) grid[column * config.rows + Math.floor(config.rows / 2)] = target;
    }
    if (force.wild && config.columns > 1) grid[config.rows + Math.floor(config.rows / 2)] = config.wildId;
    if (force.scatterCount && config.scatterId) {
      for (let column = 0; column < Math.min(force.scatterCount, config.columns); column += 1) grid[column * config.rows] = config.scatterId;
    }
    if (force.holdAndSpin && config.bonusId) {
      for (let index = 0; index < Math.min(6, grid.length); index += 1) grid[index] = config.bonusId;
    }
  }

  private feature(config: GameConfig, grid: readonly string[], wins: readonly WinResult[], force: ForceResult | undefined, rng: RandomSource): FeatureTrigger | undefined {
    if (config.feature === 'lantern-respin' && config.bonusId) {
      const count = grid.filter((symbol) => symbol === config.bonusId).length;
      if (count >= 6 || force?.holdAndSpin) return { type: 'lantern-respin', count: 3 };
    }
    if (config.feature === 'treasure-wheel' && config.scatterId) {
      const count = grid.filter((symbol) => symbol === config.scatterId).length;
      if (count >= 3) return { type: 'treasure-wheel', count: 1 };
    }
    if (config.feature === 'blossom-cascade' && wins.some((win) => win.kind === 'cluster') && rng.bool(0.42)) {
      return { type: 'blossom-cascade', count: 5, multiplier: 1 };
    }
    if (config.feature === 'parade-wild' && config.scatterId) {
      const count = grid.filter((symbol) => symbol === config.scatterId).length;
      if (count >= 3) return { type: 'parade-wild', count: 6 };
    }
    return undefined;
  }

  private resolveFeature(config: GameConfig, bet: number, trigger: FeatureTrigger | undefined, sourceGrid: readonly string[], rng: RandomSource, force?: ForceResult): FeatureResult | undefined {
    if (!trigger) return undefined;
    if (trigger.type === 'lantern-respin') {
      const initial = sourceGrid.flatMap((symbol, index) => symbol === config.bonusId ? [index] : []).slice(0, 6);
      const bonus = new HoldAndSpinController().generate(rng, initial.length >= 6 ? initial : [0, 2, 4, 6, 8, 10], force?.jackpot, bet);
      const finalGrid = [...sourceGrid];
      const values = bonus.steps.length ? bonus.steps[bonus.steps.length - 1].values : {};
      Object.keys(values).forEach((position) => { finalGrid[Number(position)] = config.bonusId ?? finalGrid[Number(position)]; });
      return {
        type: trigger.type, rounds: [{ index: bonus.steps.length, grid: finalGrid, wins: [], credits: bonus.totalCredits }],
        totalCredits: bonus.totalCredits, jackpot: bonus.jackpot, detail: `${bonus.steps.length} lantern locks resolved`,
      };
    }
    if (trigger.type === 'treasure-wheel') {
      const segments = [0, 0.5, 1, 1, 2, 3, 5, 10] as const;
      const multiplier = segments[rng.int(0, segments.length)];
      const credits = Math.round(bet * multiplier);
      return {
        type: trigger.type, rounds: [{ index: 1, grid: sourceGrid, wins: [], credits }],
        totalCredits: credits, detail: `Treasure wheel landed on ${multiplier}x`,
      };
    }
    if (trigger.type === 'parade-wild') {
      const rounds: FeatureRound[] = [];
      const expandingWild = new ExpandingWildController();
      for (let index = 0; index < trigger.count; index += 1) {
        const stops = config.reelStrips.map((strip) => rng.int(0, strip.length));
        const grid = this.gridFromStops(config, stops);
        // The Wild travels through the cabinet as a visible parade rather than
        // choosing an unrelated random column on each free round.
        const expandedColumn = index % config.columns;
        expandingWild.apply(grid, config.rows, expandedColumn, config.wildId);
        const wins = this.evaluate(config, grid, bet);
        const credits = wins.reduce((sum, win) => sum + win.credits, 0);
        rounds.push({ index: index + 1, grid, wins, credits });
      }
      return {
        type: trigger.type, rounds, totalCredits: rounds.reduce((sum, round) => sum + round.credits, 0),
        detail: `${rounds.length} parade spins with a roaming Wild column`,
      };
    }
    const rounds: FeatureRound[] = [];
    for (let index = 0; index < trigger.count; index += 1) {
      const stops = config.reelStrips.map((strip) => rng.int(0, strip.length));
      const grid = this.gridFromStops(config, stops);
      const multiplier = index + 1;
      const wins = this.evaluate(config, grid, bet).map((win) => ({
        ...win, multiplier: win.multiplier * multiplier, credits: win.credits * multiplier,
      }));
      const credits = wins.reduce((sum, win) => sum + win.credits, 0);
      if (credits <= 0) break;
      rounds.push({ index: index + 1, grid, wins, credits });
    }
    return {
      type: trigger.type, rounds, totalCredits: rounds.reduce((sum, round) => sum + round.credits, 0),
      detail: `${rounds.length} cascade${rounds.length === 1 ? '' : 's'} resolved`,
    };
  }
}
