import type { GameConfig, WinResult } from './types';

const cell = (grid: readonly string[], config: GameConfig, column: number, row: number): string =>
  grid[column * config.rows + row];

const payout = (config: GameConfig, symbol: string, count: number): number => {
  const table = config.paytable[symbol];
  if (!table) return 0;
  const threshold = Object.keys(table).map(Number).filter((value) => value <= count).sort((a, b) => b - a)[0];
  return threshold ? table[threshold] ?? 0 : 0;
};

export class PaylineEvaluator {
  public evaluate(config: GameConfig, grid: readonly string[], bet: number): WinResult[] {
    const lineBet = bet / Math.max(1, config.paylines.length);
    const wins: WinResult[] = [];
    config.paylines.forEach((rows, lineIndex) => {
      const line = rows.map((row, column) => cell(grid, config, column, row));
      const firstRegular = line.find((symbol) => symbol !== config.wildId && symbol !== config.scatterId && symbol !== config.bonusId);
      const target = firstRegular ?? config.wildId;
      let count = 0;
      const positions: number[] = [];
      for (let column = 0; column < line.length; column += 1) {
        const symbol = line[column];
        if (symbol !== target && symbol !== config.wildId) break;
        count += 1;
        positions.push(column * config.rows + rows[column]);
      }
      const multiplier = count >= 3 ? payout(config, target, count) : 0;
      if (multiplier > 0) wins.push({ kind: 'line', symbolId: target, count, multiplier: multiplier * config.payoutScale, credits: Math.round(lineBet * multiplier * config.payoutScale), positions, lineIndex });
    });
    return wins;
  }
}

export class WaysEvaluator {
  public evaluate(config: GameConfig, grid: readonly string[], bet: number): WinResult[] {
    const wins: WinResult[] = [];
    for (const definition of config.symbols) {
      const target = definition.id;
      if (target === config.scatterId || target === config.bonusId) continue;
      let columns = 0;
      let ways = 1;
      const positions: number[] = [];
      for (let column = 0; column < config.columns; column += 1) {
        const matches: number[] = [];
        for (let row = 0; row < config.rows; row += 1) {
          const position = column * config.rows + row;
          const symbol = grid[position];
          if (symbol === target || (target !== config.wildId && symbol === config.wildId)) matches.push(position);
        }
        if (matches.length === 0) break;
        columns += 1;
        ways *= matches.length;
        positions.push(...matches);
      }
      const pureWild = target !== config.wildId && positions.length > 0 && positions.every((position) => grid[position] === config.wildId);
      const multiplier = columns >= 3 && !pureWild ? payout(config, target, columns) : 0;
      if (multiplier > 0) wins.push({ kind: 'ways', symbolId: target, count: columns, multiplier: multiplier * config.payoutScale, credits: Math.round((bet / (config.waysDivisor ?? 243)) * multiplier * ways * config.payoutScale), positions, ways });
    }
    return wins;
  }
}

export class ClusterEvaluator {
  public evaluate(config: GameConfig, grid: readonly string[], bet: number): WinResult[] {
    const wins: WinResult[] = [];
    const minimum = config.minimumCluster ?? 5;
    for (const definition of config.symbols) {
      const target = definition.id;
      if (target === config.scatterId || target === config.bonusId) continue;
      const visited = new Set<number>();
      for (let start = 0; start < grid.length; start += 1) {
        if (visited.has(start) || !this.matches(config, grid[start], target)) continue;
        const component: number[] = [];
        const queue = [start]; visited.add(start);
        while (queue.length > 0) {
          const position = queue.pop() as number; component.push(position);
          for (const neighbour of this.neighbours(config, position)) {
            if (!visited.has(neighbour) && this.matches(config, grid[neighbour], target)) { visited.add(neighbour); queue.push(neighbour); }
          }
        }
        const pureWild = target !== config.wildId && component.every((position) => grid[position] === config.wildId);
        const multiplier = component.length >= minimum && !pureWild ? payout(config, target, component.length) : 0;
        if (multiplier > 0) wins.push({ kind: 'cluster', symbolId: target, count: component.length, multiplier: multiplier * config.payoutScale, credits: Math.round(bet * multiplier * config.payoutScale), positions: component });
      }
    }
    return wins;
  }

  private matches(config: GameConfig, candidate: string, target: string): boolean {
    return candidate === target || (target !== config.wildId && candidate === config.wildId);
  }

  private neighbours(config: GameConfig, position: number): readonly number[] {
    const column = Math.floor(position / config.rows); const row = position % config.rows; const result: number[] = [];
    if (column > 0) result.push((column - 1) * config.rows + row);
    if (column + 1 < config.columns) result.push((column + 1) * config.rows + row);
    if (row > 0) result.push(column * config.rows + row - 1);
    if (row + 1 < config.rows) result.push(column * config.rows + row + 1);
    return result;
  }
}

export class ScatterEvaluator {
  public evaluate(config: GameConfig, grid: readonly string[], bet: number): WinResult[] {
    if (!config.scatterId) return [];
    const positions = grid.flatMap((symbol, index) => symbol === config.scatterId ? [index] : []);
    if (positions.length < 3) return [];
    const count = Math.min(config.columns, positions.length);
    const multiplier = payout(config, config.scatterId, count);
    return [{ kind: 'scatter', symbolId: config.scatterId, count, multiplier: multiplier * config.payoutScale, credits: Math.round(bet * multiplier * config.payoutScale), positions }];
  }
}

export class WildResolver {
  public isSubstitute(config: GameConfig, candidate: string, target: string): boolean {
    return candidate === target || candidate === config.wildId;
  }
}
