import { MODES } from './Modes';
import { assertBet, copyGrid, MAX_CASCADES, MAX_WIN_MULTIPLIER } from './Model';
import type { Award, Cell, Grid, Mode, ModeId, Round, Stage } from './Model';
import type { Random } from './Random';

export function validateGrid(mode: Mode, grid: Grid): void {
  if (grid.length !== mode.columns || grid.some(c => c.length !== mode.rows || c.some(id => !mode.symbols.some(s => s.id === id)))) {
    throw new Error(`Invalid ${mode.id} symbol grid`);
  }
}
const money = (bet: number, multiplier: number): number => Math.round(bet * Math.round(multiplier * 100) / 100);
function pick(mode: Mode, rng: Random): string {
  let n = rng.int(mode.symbols.reduce((sum, s) => sum + s.weight, 0));
  for (const s of mode.symbols) { n -= s.weight; if (n < 0) return s.id; }
  throw new Error('Invalid symbol weights');
}
export function newGrid(id: ModeId, rng: Random): Grid {
  const mode = MODES[id];
  return Array.from({ length: mode.columns }, () => Array.from({ length: mode.rows }, () => pick(mode, rng)));
}

/** Evaluators are also consumed by rule/help and win-line presentation. */
export function evaluate(id: ModeId, grid: Grid, bet: number, cascade = 1): Award[] {
  assertBet(bet);
  const mode = MODES[id];
  validateGrid(mode, grid);
  if (!Number.isInteger(cascade) || cascade < 1 || cascade > 4) throw new Error('Invalid cascade multiplier');
  if (mode.mechanic === 'cluster') return clusters(mode, grid, bet, cascade);
  const awards: Award[] = [];
  if (mode.mechanic === 'ways') {
    for (const symbol of mode.symbols) {
      const cells: Cell[] = [];
      let columns = 0, ways = 1;
      for (let c = 0; c < mode.columns; c++) {
        const rows = grid[c]!.flatMap((s, r) => s === symbol.id ? [r] : []);
        if (!rows.length) break;
        ways *= rows.length; columns++;
        rows.forEach(row => cells.push({ column: c, row }));
      }
      const multiplier = symbol.pays[columns];
      if (multiplier) awards.push({ kind: 'ways', symbol: symbol.id, cells, matches: columns, ways, multiplier, amount: money(bet * ways, multiplier) });
    }
  } else {
    mode.lines.forEach((line, index) => {
      const first = grid[0]![line[0]!]!;
      const cells: Cell[] = [];
      for (let c = 0; c < mode.columns && grid[c]![line[c]!] === first; c++) cells.push({ column: c, row: line[c]! });
      const multiplier = mode.symbols.find(s => s.id === first)!.pays[cells.length];
      if (multiplier) awards.push({ kind: 'line', symbol: first, cells, matches: cells.length, ways: 1, multiplier, amount: money(bet / mode.lines.length, multiplier), line: index + 1 });
    });
  }
  return awards;
}

function clusters(mode: Mode, grid: Grid, bet: number, cascade: number): Award[] {
  const visited = new Set<number>(), awards: Award[] = [];
  for (let c = 0; c < mode.columns; c++) for (let r = 0; r < mode.rows; r++) {
    const key = c * mode.rows + r;
    if (visited.has(key)) continue;
    const id = grid[c]![r]!, cells: Cell[] = [], queue: Cell[] = [{ column: c, row: r }];
    visited.add(key);
    while (queue.length) {
      const cell = queue.pop()!; cells.push(cell);
      for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nc = cell.column + dc, nr = cell.row + dr, nextKey = nc * mode.rows + nr;
        if (nc >= 0 && nc < mode.columns && nr >= 0 && nr < mode.rows && !visited.has(nextKey) && grid[nc]![nr] === id) {
          visited.add(nextKey); queue.push({ column: nc, row: nr });
        }
      }
    }
    const pays = mode.symbols.find(s => s.id === id)!.pays;
    const tier = Object.keys(pays).map(Number).filter(n => n <= cells.length).sort((a, b) => b - a)[0];
    if (tier !== undefined) {
      const multiplier = pays[tier]! * cascade;
      awards.push({ kind: 'cluster', symbol: id, cells, matches: cells.length, ways: 1, multiplier, amount: money(bet, multiplier) });
    }
  }
  return awards;
}

export function collapse(grid: Grid, removed: Cell[], rng: Random): Grid {
  validateGrid(MODES.reef, grid);
  const removedKeys = new Set(removed.map(p => p.column * 5 + p.row));
  return grid.map((column, c) => {
    const survivors = column.filter((_, r) => !removedKeys.has(c * 5 + r));
    return [...Array.from({ length: column.length - survivors.length }, () => pick(MODES.reef, rng)), ...survivors];
  });
}

export function generateRound(id: ModeId, bet: number, rng: Random): Round {
  assertBet(bet);
  let grid = newGrid(id, rng);
  const stages: Stage[] = [];
  if (id === 'reef') {
    for (let step = 0; step < MAX_CASCADES; step++) {
      const multiplier = Math.min(step + 1, 4), awards = evaluate(id, grid, bet, multiplier);
      const removed = awards.flatMap(a => a.cells);
      stages.push({ grid: copyGrid(grid), awards, multiplier, removed });
      if (!awards.length || step === MAX_CASCADES - 1) break;
      grid = collapse(grid, removed, rng);
    }
  } else {
    stages.push({ grid: copyGrid(grid), awards: evaluate(id, grid, bet), multiplier: 1, removed: [] });
    if (id === 'cargo' && grid.flat().filter(s => s === 'cargo-coin').length >= 6) holdFeature(grid, bet, rng, stages);
  }
  let budget = bet * MAX_WIN_MULTIPLIER, totalWin = 0, capped = false;
  for (const stage of stages) for (const award of stage.awards) {
    const payable = Math.min(budget, award.amount);
    if (payable < award.amount) capped = true;
    award.amount = payable; budget -= payable; totalWin += payable;
  }
  return { mode: id, bet, stages, totalWin, capped };
}

function holdFeature(grid: Grid, bet: number, rng: Random, stages: Stage[]): void {
  const values = grid.map(col => col.map(id => id === 'cargo-coin' ? rng.int(5) + 1 : 0));
  let left = 3;
  const frame = (): Stage => ({ grid: copyGrid(grid), awards: [], multiplier: 1, removed: [], cargoValues: values.map(c => c.slice()), attemptsLeft: left });
  stages.push(frame());
  // Every reset locks >=1 new cell: at most 15 resets, hence this loop is bounded.
  while (left && values.some(c => c.some(v => !v))) {
    left--; let added = false;
    for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) {
      if (!values[c]![r] && rng.int(100) < 8) {
        values[c]![r] = rng.int(5) + 1; grid[c]![r] = 'cargo-coin'; added = true;
      }
    }
    if (added) left = 3;
    stages.push(frame());
  }
  const cells: Cell[] = [];
  let multiplier = 0;
  values.forEach((col, c) => col.forEach((value, r) => { if (value) { multiplier += value; cells.push({ column: c, row: r }); } }));
  stages[stages.length - 1]!.awards.push({ kind: 'cargo', symbol: 'cargo-coin', cells, matches: cells.length, ways: 1, multiplier, amount: bet * multiplier });
}
