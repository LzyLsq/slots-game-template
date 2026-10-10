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
      // A leading Wild run may pay more than the longer substituted symbol.
      // Award the best valid result exactly once on this line.
      let best:WinResult|undefined;
      for(const target of new Set([config.wildId,firstRegular??config.wildId])){
        let count=0;const positions:number[]=[];
        for(let column=0;column<line.length;column++){
          if(line[column]!==target&&line[column]!==config.wildId)break;
          count++;positions.push(column*config.rows+rows[column]);
        }
        const multiplier=count>=3?payout(config,target,count):0;
        if(multiplier>0&&(!best||multiplier*config.payoutScale>best.multiplier))best={kind:'line',symbolId:target,count,multiplier:multiplier*config.payoutScale,credits:Math.round(lineBet*multiplier*config.payoutScale),positions,lineIndex};
      }
      if(best)wins.push(best);
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
      let allWildWays = 1;
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
        allWildWays *= matches.filter(position=>grid[position]===config.wildId).length;
        positions.push(...matches);
      }
      // Natural-symbol ways must contain a natural symbol. Pure-Wild ways
      // belong only to the canonical Wild award, not every symbol's pool.
      if(target!==config.wildId)ways-=allWildWays;
      const multiplier = columns >= 3 && ways>0 ? payout(config, target, columns) : 0;
      if (multiplier > 0) wins.push({ kind: 'ways', symbolId: target, count: columns, multiplier: multiplier * config.payoutScale, credits: Math.round((bet / (config.waysDivisor ?? 243)) * multiplier * ways * config.payoutScale), positions, ways });
    }
    return wins;
  }
}

export class ClusterEvaluator {
  public evaluate(config: GameConfig, grid: readonly string[], bet: number): WinResult[] {
    const wins: WinResult[] = [];
    const minimum = config.minimumCluster ?? 5;
    const awarded = new Set<number>();
    // One cell may be paid by one connected group per board. In particular,
    // a WILD cannot be spent again to bridge a different ordinary group.
    // Pay the highest available group first, then recompute the remaining
    // components so natural groups survive a shared-WILD conflict.
    while (true) {
      const candidates: WinResult[] = [];
      for (const definition of config.symbols) {
        const target = definition.id;
        if (target === config.scatterId || target === config.bonusId) continue;
        const visited = new Set<number>();
        for (let start = 0; start < grid.length; start += 1) {
          if (awarded.has(start) || visited.has(start) || !this.matches(config, grid[start], target)) continue;
          const component: number[] = [];
          const queue = [start]; visited.add(start);
          while (queue.length > 0) {
            const position = queue.pop() as number; component.push(position);
            for (const neighbour of this.neighbours(config, position)) {
              if (!awarded.has(neighbour) && !visited.has(neighbour) && this.matches(config, grid[neighbour], target)) {
                visited.add(neighbour); queue.push(neighbour);
              }
            }
          }
          const pureWild = target !== config.wildId && component.every((position) => grid[position] === config.wildId);
          const multiplier = component.length >= minimum && !pureWild ? payout(config, target, component.length) : 0;
          if (multiplier > 0) candidates.push({ kind: 'cluster', symbolId: target, count: component.length, multiplier: multiplier * config.payoutScale, credits: Math.round(bet * multiplier * config.payoutScale), positions: component });
        }
      }
      candidates.sort((a,b)=>b.multiplier-a.multiplier || a.symbolId.localeCompare(b.symbolId) || Math.min(...a.positions)-Math.min(...b.positions));
      const best = candidates[0];
      if (!best) break;
      wins.push(best);
      best.positions.forEach(position=>awarded.add(position));
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
    if(multiplier<=0)return [];
    return [{ kind: 'scatter', symbolId: config.scatterId, count, multiplier: multiplier * config.payoutScale, credits: Math.round(bet * multiplier * config.payoutScale), positions }];
  }
}

export class WildResolver {
  public isSubstitute(config: GameConfig, candidate: string, target: string): boolean {
    return candidate === target || candidate === config.wildId;
  }
}
