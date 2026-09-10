import type { RandomSource } from '../core/SecureRNG';
import { ClusterEvaluator, PaylineEvaluator, ScatterEvaluator, WaysEvaluator } from './Evaluators';
import type { FeatureResult, FeatureRound, ForceResult, GameConfig, SpinResult, WinResult } from './types';

/** Outcomes are fully decided before reel motion and never depend on wallet history or animation timing. */
export class ResultGenerator {
  private readonly lines = new PaylineEvaluator();
  private readonly ways = new WaysEvaluator();
  private readonly clusters = new ClusterEvaluator();
  private readonly scatter = new ScatterEvaluator();
  private sequence = 0;

  public gridFromStops(config: GameConfig, stops: readonly number[]): string[] {
    return config.reelStrips.flatMap((strip, column) =>
      Array.from({ length: config.rows }, (_, row) => strip[(stops[column] + row) % strip.length]),
    );
  }

  public evaluate(config: GameConfig, grid: readonly string[], bet: number): WinResult[] {
    if (grid.length !== config.columns * config.rows || grid.some((id) => !config.symbols.some((symbol) => symbol.id === id))) {
      throw new Error('Invalid grid');
    }
    const main = config.payMode === 'clusters' ? this.clusters : config.payMode === 'ways' ? this.ways : this.lines;
    return [...main.evaluate(config, grid, bet), ...this.scatter.evaluate(config, grid, bet)];
  }

  public generate(config: GameConfig, bet: number, rng: RandomSource, force?: ForceResult): SpinResult {
    if (!Number.isSafeInteger(bet) || !config.bets.includes(bet)) throw new Error('Unsupported bet');
    const seed = rng.snapshot();
    const stops = config.reelStrips.map((strip) => rng.int(0, strip.length));
    const grid = this.gridFromStops(config, stops);
    this.applyForce(config, grid, force);

    let wins = this.evaluate(config, grid, bet);
    if (force?.winTier) {
      const multiplier = force.winTier === 'big' ? 25 : force.winTier === 'mega' ? 75 : 150;
      wins.push({ kind: 'bonus', symbolId: config.symbols.find((symbol) => symbol.tier === 'high')?.id ?? config.wildId, count: 1, multiplier, credits: bet * multiplier, positions: [] });
    }
    let featureResult = this.resolveFeature(config, bet, grid, wins, rng, force);

    let remaining = Math.floor(bet * config.maxWinMultiplier);
    const award = (value: number): number => {
      const credits = Math.max(0, Math.min(remaining, Math.round(value)));
      remaining -= credits;
      return credits;
    };
    wins = wins.map((win) => ({ ...win, credits: award(win.credits) }));
    const baseWin = wins.reduce((sum, win) => sum + win.credits, 0);
    if (featureResult) {
      const rounds = featureResult.rounds.map((round) => {
        const credits = award(round.credits);
        let roundBudget = credits;
        const roundWins = round.wins.map((win) => {
          const amount = Math.min(roundBudget, Math.max(0, Math.round(win.credits)));
          roundBudget -= amount;
          return { ...win, credits: amount };
        });
        return { ...round, wins: roundWins, credits };
      });
      const totalCredits = rounds.reduce((sum, round) => sum + round.credits, 0);
      featureResult = { ...featureResult, rounds, totalCredits, pickAwards: featureResult.pickAwards?.map((value) => Math.min(value, totalCredits)) };
    }
    const featureWin = featureResult?.totalCredits ?? 0;
    const special = config.scatterId ?? config.bonusId;
    const specialColumns = special ? Array.from({ length: config.columns }, (_, column) =>
      grid.slice(column * config.rows, (column + 1) * config.rows).includes(special) ? column : -1,
    ).filter((column) => column >= 0) : [];
    const anticipationColumns = specialColumns.length >= 2 && specialColumns.length < 3
      ? Array.from({ length: config.columns - specialColumns.length }, (_, index) => specialColumns.length + index)
      : [];

    return {
      spinId: `${config.id}-${seed}-${++this.sequence}`, gameId: config.id, seed, stops, grid, wins,
      baseWin, featureWin, totalWin: baseWin + featureWin, featureResult,
      feature: featureResult ? { type: featureResult.type, count: featureResult.rounds.length } : undefined,
      anticipationColumns,
    };
  }

  /** Preserve surviving symbols and their vertical order while refilling above the masked window. */
  public collapse(config: GameConfig, grid: readonly string[], removed: readonly number[], rng: RandomSource): string[] {
    const cleared = new Set(removed);
    const next: string[] = [];
    for (let column = 0; column < config.columns; column += 1) {
      const survivors = grid.slice(column * config.rows, (column + 1) * config.rows)
        .filter((_, row) => !cleared.has(column * config.rows + row));
      const strip = config.reelStrips[column];
      next.push(...Array.from({ length: config.rows - survivors.length }, () => strip[rng.int(0, strip.length)]), ...survivors);
    }
    return next;
  }

  private applyForce(config: GameConfig, grid: string[], force?: ForceResult): void {
    if (!force) return;
    if (force.symbolId && config.symbols.some((symbol) => symbol.id === force.symbolId)) {
      for (let column = 0; column < Math.min(force.count ?? 3, config.columns); column += 1) {
        grid[column * config.rows + Math.floor(config.rows / 2)] = force.symbolId;
      }
    }
    if (force.wild) grid[Math.floor(config.rows / 2)] = config.wildId;
    if (force.scatterCount && config.scatterId) {
      for (let column = 0; column < Math.min(force.scatterCount, config.columns); column += 1) grid[column * config.rows] = config.scatterId;
    }
    if (force.holdAndSpin && config.bonusId) {
      const count = Math.min(grid.length, config.id === 'tea-vault-tumble' ? 5 : 3);
      for (let index = 0; index < count; index += 1) grid[index * Math.max(1, Math.floor(grid.length / count))] = config.bonusId;
    }
  }

  private fresh(config: GameConfig, rng: RandomSource): string[] {
    return this.gridFromStops(config, config.reelStrips.map((strip) => rng.int(0, strip.length)));
  }

  private resolveFeature(config: GameConfig, bet: number, grid: readonly string[], wins: readonly WinResult[], rng: RandomSource, force?: ForceResult): FeatureResult | undefined {
    const scatterCount = config.scatterId ? grid.filter((id) => id === config.scatterId).length : 0;
    const bonusCount = config.bonusId ? grid.filter((id) => id === config.bonusId).length : 0;

    if (config.feature === 'bellhop-stacked-luggage' && scatterCount >= 3) {
      const rounds: FeatureRound[] = [];
      for (let index = 0; index < 6; index += 1) {
        const next = this.fresh(config, rng);
        const column = rng.int(0, config.columns);
        const stacked = rng.bool(0.34) ? config.wildId : 'luggage-stack';
        for (let row = 0; row < config.rows; row += 1) next[column * config.rows + row] = stacked;
        const roundWins = this.lines.evaluate(config, next, bet);
        rounds.push({ index: index + 1, grid: next, wins: roundWins, credits: roundWins.reduce((sum, win) => sum + win.credits, 0), expandedColumn: column });
      }
      return { type: config.feature, rounds, totalCredits: rounds.reduce((sum, round) => sum + round.credits, 0), detail: 'Six suite rounds. One luggage tower lands fully stacked on every round; premium towers may arrive Wild.' };
    }

    if (config.feature === 'tea-vault-cascade' && (wins.some((win) => win.kind === 'cluster') || bonusCount >= 3)) {
      const rounds: FeatureRound[] = [];
      let previous = grid;
      let previousWins = wins.filter((win) => win.kind === 'cluster');
      let multiplier = bonusCount >= 3 ? 2 : 1;
      // A Vault Bonus trigger must always open onto a real, payable tea-tray
      // arrangement even when the triggering screen contains no natural cluster.
      if (!previousWins.length && bonusCount >= 3) {
        const starter = this.fresh(config, rng);
        const starterSymbol = 'gold-coins';
        [0, 1, 2, config.rows, config.rows + 1].forEach((position) => { starter[position] = starterSymbol; });
        const starterWins = this.clusters.evaluate(config, starter, bet).map((win) => ({
          ...win,
          credits: win.credits * multiplier,
          multiplier: win.multiplier * multiplier,
        }));
        rounds.push({ index: 1, grid: starter, wins: starterWins, credits: starterWins.reduce((sum, win) => sum + win.credits, 0), multiplier });
        previous = starter;
        previousWins = starterWins;
      }
      for (let index = rounds.length; index < 8; index += 1) {
        const removed = [...new Set(previousWins.flatMap((win) => win.positions))];
        if (!removed.length) break;
        const next = this.collapse(config, previous, removed, rng);
        multiplier = Math.min(10, multiplier + 1);
        const nextWins = this.clusters.evaluate(config, next, bet).map((win) => ({ ...win, credits: win.credits * multiplier, multiplier: win.multiplier * multiplier }));
        rounds.push({ index: index + 1, grid: next, wins: nextWins, credits: nextWins.reduce((sum, win) => sum + win.credits, 0), removed, multiplier });
        previous = next;
        previousWins = nextWins;
      }
      return { type: config.feature, rounds, totalCredits: rounds.reduce((sum, round) => sum + round.credits, 0), detail: 'Winning tea clusters tumble away. The serving-tray multiplier rises each cascade, up to 10×.' };
    }

    if (config.feature === 'ballroom-key-path' && scatterCount >= 3) {
      const rounds: FeatureRound[] = [];
      let collectedKeys = 0;
      for (let index = 0; index < 6; index += 1) {
        const next = this.fresh(config, rng);
        const keys = 1 + (rng.bool(0.34) ? 1 : 0);
        for (let key = 0; key < keys; key += 1) next[rng.int(0, next.length)] = 'ballroom-key';
        collectedKeys += keys;
        if (collectedKeys >= 5) next[rng.int(0, next.length)] = config.wildId;
        const multiplier = collectedKeys >= 9 ? 5 : collectedKeys >= 6 ? 3 : collectedKeys >= 3 ? 2 : 1;
        const roundWins = this.ways.evaluate(config, next, bet).map((win) => ({ ...win, credits: win.credits * multiplier, multiplier: win.multiplier * multiplier }));
        rounds.push({ index: index + 1, grid: next, wins: roundWins, credits: roundWins.reduce((sum, win) => sum + win.credits, 0), multiplier, collectedKeys });
      }
      return { type: config.feature, rounds, totalCredits: rounds.reduce((sum, round) => sum + round.credits, 0), detail: 'Six ballroom rounds collect golden keys. Key milestones open 2×, 3× and 5× champagne-vault paths.' };
    }

    if (config.feature === 'penthouse-lift' && (bonusCount >= 3 || force?.jackpot)) {
      const jackpot = force?.jackpot ?? (bonusCount >= 5 ? 'grand' : bonusCount === 4 ? 'major' : rng.bool(0.18) ? 'minor' : 'mini');
      const floor = jackpot === 'grand' ? 8 : jackpot === 'major' ? 6 : jackpot === 'minor' ? 4 : 2;
      const multipliers = jackpot === 'grand' ? [5, 8, 12, 20, 30, 50, 80, 120]
        : jackpot === 'major' ? [3, 5, 8, 12, 20, 40]
          : jackpot === 'minor' ? [2, 3, 5, 10] : [1, 2];
      const rounds = multipliers.map((multiplier, index) => ({ index: index + 1, grid, wins: [], credits: Math.round(bet * multiplier * config.payoutScale), floor: index + 1, multiplier }));
      return { type: config.feature, rounds, totalCredits: rounds.reduce((sum, round) => sum + round.credits, 0), jackpot, detail: `The Fortune Lift reached floor ${floor}. The destination is predetermined before the doors open.` };
    }
    return undefined;
  }
}
