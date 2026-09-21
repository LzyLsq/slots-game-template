/** Engine-independent types. Amounts are integer, nonredeemable virtual coins. */
export type ModeId = 'captain' | 'pearl' | 'cargo' | 'reef';
export type SymbolId = string;
/** Column-major, row zero at the TOP. Presentation must use this convention. */
export type Grid = SymbolId[][];
export interface Cell { column: number; row: number }
export interface Award {
  kind: 'line' | 'ways' | 'cluster' | 'cargo';
  symbol: SymbolId;
  cells: Cell[];
  matches: number;
  ways: number;
  multiplier: number;
  amount: number;
  line?: number;
}
export interface Stage {
  grid: Grid;
  awards: Award[];
  removed: Cell[];
  multiplier: number;
  /** Cargo frames show locked coin values and remaining attempts explicitly. */
  cargoValues?: number[][];
  attemptsLeft?: number;
}
export interface Round {
  mode: ModeId;
  bet: number;
  stages: Stage[];
  totalWin: number;
  capped: boolean;
}
export interface SymbolDefinition {
  id: SymbolId;
  name: string;
  weight: number;
  /** Multipliers of line stake, total stake per way, or cluster stake. */
  pays: Readonly<Record<number, number>>;
}
export interface Mode {
  id: ModeId;
  title: string;
  columns: number;
  rows: number;
  mechanic: 'line' | 'ways' | 'hold' | 'cluster';
  symbols: readonly SymbolDefinition[];
  lines: readonly (readonly number[])[];
  rules: readonly string[];
}
export const BETS = [20, 40, 100, 200, 500] as const;
export const MAX_WIN_MULTIPLIER = 5000;
export const MAX_CASCADES = 8;
export const copyGrid = (grid: Grid): Grid => grid.map(column => column.slice());
export function assertBet(bet: number): void {
  if (!Number.isSafeInteger(bet) || !(BETS as readonly number[]).includes(bet)) {
    throw new Error('Choose an available bet.');
  }
}
