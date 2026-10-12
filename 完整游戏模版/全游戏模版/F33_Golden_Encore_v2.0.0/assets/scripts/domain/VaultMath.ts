export type Tier = 'none' | 'ordinary' | 'big' | 'super';
export type ModeId = 0 | 1 | 2 | 3;
export type Cell = { column: number; row: number };
export type Match = { tier: Exclude<Tier, 'none'>; cells: Cell[]; description: string };
export const MODE_RULES = [
  'FERRY · lantern row · tide bonus',
  'GARDEN · pearl path · hold & re-spin',
  'FOUNDRY · ingots anywhere · forge press',
  'VAULT · dragon columns · seal streak',
] as const;
export type SymbolId = 0 | 1 | 2 | 3 | 4 | 5;
export type Board = SymbolId[][];
export type LanternMeters = [number, number, number];

export const SYMBOLS: readonly string[] = [
  'symbol-lantern', 'symbol-koi', 'symbol-pearl', 'symbol-ingot', 'symbol-chest', 'symbol-dragon',
];
export const ATLAS_THRESHOLDS = [3, 10, 25] as const;
export const ATLAS_AWARDS = [200, 750, 2000] as const;
export function atlasMilestone(spins: number, claimed: number): { threshold: number; award: number; ready: boolean } | null {
  if (!Number.isSafeInteger(spins) || spins < 0 || !Number.isSafeInteger(claimed) || claimed < 0 || claimed >= ATLAS_THRESHOLDS.length) return null;
  return { threshold: ATLAS_THRESHOLDS[claimed], award: ATLAS_AWARDS[claimed], ready: spins >= ATLAS_THRESHOLDS[claimed] };
}
export const STAKES = [1, 2, 5, 10, 20, 50, 100, 200, 500] as const;
// Local virtual-coin demo only. Feature upgrades are evaluated separately.
export const BASE_ODDS = { none: .576, ordinary: .34, big: .08, super: .004 } as const;
export const BASE_MULTIPLIERS = { none: 0, ordinary: 1, big: 4, super: 8 } as const;
export const FEATURE_MATH = {
  pearlUpgradeChance: .06,
  tide: { target: 100, gains: { none: 3, ordinary: 8, big: 17, super: 30 }, multiplier: 3 },
  forge: { target: 60, multiplier: 2 },
  dragon: { target: 3, multiplier: 5 },
} as const;
/** Board tier describes the match; presentation describes the actual paid award.
 * A feature-only profit is still BIG. An ordinary refund remains a short WIN.
 * SUPER is reserved for the complete highest-tier board, not arbitrary inflation. */
export function awardTier(award: number, stake: number, boardTier: Tier): Tier {
  if (award <= 0) return 'none';
  if (boardTier === 'super') return 'super';
  return award > stake ? 'big' : 'ordinary';
}
export const INITIAL_GUARANTEE = { bigSeen: false, superSeen: false };
export type Guarantee = { bigSeen: boolean; superSeen: boolean };
/** Seen flags record actual prizes; they must never extend the introductory window.
 * Old saves may omit flags. Do not fabricate seen prizes or catch up after spin ten. */
export function restoreGuarantee(value: unknown): Guarantee {
  const raw = value && typeof value === 'object' ? value as Partial<Guarantee> : undefined;
  return { bigSeen: raw?.bigSeen === true, superSeen: raw?.superSeen === true };
}
export function onboardingTier(spinsBefore: number, guarantee: Guarantee): 'big' | 'super' | undefined {
  if (spinsBefore === 9 && !guarantee.superSeen) return 'super';
  if (spinsBefore === 4 && !guarantee.bigSeen) return 'big';
  return undefined;
}
export type Round = {
  board: Board;
  tier: Tier;
  award: number;
  presentationTier: Tier;
  lanternBonus: number;
  lane: number;
  meters: LanternMeters;
  guarantee: Guarantee;
  matchedRow: number;
  matchedCells: Cell[];
  matchDescription: string;
  firstBoard?: Board;
  lockedCells?: Cell[];
  featureBonus: number;
  featureName: string;
  featureProgress: number;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const randomSymbol = (rng: () => number): SymbolId => Math.floor(rng() * SYMBOLS.length) as SymbolId;

function blankBoard(rng: () => number, excluded: SymbolId): Board {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => {
    const pick = Math.floor(rng() * (SYMBOLS.length - 1));
    return (pick >= excluded ? pick + 1 : pick) as SymbolId;
  }));
}

function intendedCells(mode: ModeId, tier: Tier, lane: number, rng: () => number): Cell[] {
  const columns = tier === 'super' ? 5 : tier === 'big' ? 4 : tier === 'none' ? 2 : 3;
  if (mode === 0) return Array.from({ length: columns }, (_, column) => ({ column, row: lane }));
  if (mode === 1) {
    const path = lane === 0 ? [0, 1, 2, 1, 0] : lane === 1 ? [1, 0, 1, 2, 1] : [2, 1, 0, 1, 2];
    return Array.from({ length: columns }, (_, column) => ({ column, row: path[column] }));
  }
  if (mode === 2) {
    const count = tier === 'super' ? 12 : tier === 'big' ? 9 : tier === 'none' ? 4 : 6;
    const positions = Array.from({ length: 15 }, (_, index) => ({ column: Math.floor(index / 3), row: index % 3 }));
    for (let i = positions.length - 1; i > 0; i -= 1) {
      const j = Math.min(i, Math.floor(rng() * (i + 1)));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    return positions.slice(0, count);
  }
  return Array.from({ length: columns }, (_, column) => ({ column, row: (lane + column * 2) % 3 }));
}

const TARGETS: readonly SymbolId[] = [0, 2, 3, 5];
export function evaluateBoard(board: Board, mode: ModeId, lane: number): Match | null {
  if (board.length !== 5 || board.some(column => column.length !== 3)) return null;
  const symbol = TARGETS[mode];
  let cells: Cell[] = [];
  if (mode === 0 || mode === 1) {
    const path = mode === 0 ? [lane, lane, lane, lane, lane]
      : lane === 0 ? [0, 1, 2, 1, 0] : lane === 1 ? [1, 0, 1, 2, 1] : [2, 1, 0, 1, 2];
    for (let column = 0; column < 5 && board[column][path[column]] === symbol; column += 1) cells.push({ column, row: path[column] });
  } else if (mode === 2) {
    for (let column = 0; column < 5; column += 1) for (let row = 0; row < 3; row += 1)
      if (board[column][row] === symbol) cells.push({ column, row });
  } else {
    for (let column = 0; column < 5; column += 1) {
      const row = [0, 1, 2].find(index => board[column][index] === symbol);
      if (row === undefined) break;
      cells.push({ column, row });
    }
  }
  const count = cells.length;
  const threshold = mode === 2 ? [6, 9, 12] : [3, 4, 5];
  if (count < threshold[0]) return null;
  const tier: Tier = count >= threshold[2] ? 'super' : count >= threshold[1] ? 'big' : 'ordinary';
  const unit = mode === 2 ? 'ingots' : mode === 3 ? 'dragon columns' : mode === 1 ? 'lotus-path pearls' : 'lanterns';
  return { tier, cells, description: `${count} ${unit}` };
}

export function evaluateTier(spinsBefore: number, guarantee: Guarantee, rng: () => number): Tier {
  const welcome = onboardingTier(spinsBefore, guarantee);
  if (welcome) return welcome;
  const roll = rng();
  if (roll < BASE_ODDS.super) return 'super';
  if (roll < BASE_ODDS.super + BASE_ODDS.big) return 'big';
  if (roll < BASE_ODDS.super + BASE_ODDS.big + BASE_ODDS.ordinary) return 'ordinary';
  return 'none';
}

export function createRound(args: {
  spinsBefore: number;
  bet: number;
  mode?: ModeId;
  lane: number;
  meters: LanternMeters;
  guarantee: Guarantee;
  featureProgress?: number;
  rng?: () => number;
}): Round {
  const rng = args.rng ?? Math.random;
  const tier = evaluateTier(args.spinsBefore, args.guarantee, rng);
  const mode = args.mode ?? 0;
  const lane = clamp(Math.floor(args.lane), 0, 2);
  const symbol = TARGETS[mode];
  const board = blankBoard(rng, symbol);
  const intended = intendedCells(mode, tier, lane, rng);
  for (const { column, row } of intended) board[column][row] = symbol;
  const initialMatch = evaluateBoard(board, mode, lane);
  if (tier === 'none' ? initialMatch !== null : !initialMatch || initialMatch.tier !== tier)
    throw new Error('Generated board does not match its award tier');
  let firstBoard: Board | undefined;
  let lockedCells: Cell[] | undefined;
  // Garden is a genuine hold-and-respin reveal: resolve BOTH boards before animation.
  // The locked pearls remain in their path while every other symbol is re-rolled.
  if (mode === 1 && initialMatch) {
    firstBoard = board.map(column => [...column]);
    lockedCells = initialMatch.cells;
    const renewed = blankBoard(rng, symbol);
    for (const cell of lockedCells) renewed[cell.column][cell.row] = symbol;
    const path = lane === 0 ? [0, 1, 2, 1, 0] : lane === 1 ? [1, 0, 1, 2, 1] : [2, 1, 0, 1, 2];
    // The fifth-spin promise is for a distinct BIG award, not a SUPER
    // upgrade from the hold re-spin. Preserve its tier on the final board.
    const preserveBigGuarantee = onboardingTier(args.spinsBefore, args.guarantee) === 'big';
    for (let column = lockedCells.length; !preserveBigGuarantee && column < 5; column += 1) {
      if (rng() > 1 - FEATURE_MATH.pearlUpgradeChance) renewed[column][path[column]] = symbol;
      else break;
    }
    for (let column = 0; column < 5; column += 1) board[column] = renewed[column];
  }
  const match = evaluateBoard(board, mode, lane);
  const resolvedTier: Tier = match?.tier ?? 'none';
  const matchedRow = intended[0].row;
  const base = BASE_MULTIPLIERS[resolvedTier];
  const laneGain = FEATURE_MATH.tide.gains[resolvedTier];
  const meters = [...args.meters] as LanternMeters;
  const charged = mode === 0 && meters[lane] + laneGain >= FEATURE_MATH.tide.target;
  if (mode === 0) meters[lane] = charged ? 0 : clamp(meters[lane] + laneGain, 0, FEATURE_MATH.tide.target);
  const lanternBonus = charged ? args.bet * FEATURE_MATH.tide.multiplier : 0;
  const before = clamp(Math.floor(args.featureProgress ?? 0), 0, 100);
  let featureProgress = before;
  let featureBonus = 0;
  let featureName = '';
  if (mode === 2) {
    // The press stores every ingot, including non-winning spins, across rounds.
    const ingots = board.reduce((count, column) => count + column.filter(id => id === symbol).length, 0);
    featureProgress = before + ingots;
    if (featureProgress >= FEATURE_MATH.forge.target) { featureProgress -= FEATURE_MATH.forge.target; featureBonus = args.bet * FEATURE_MATH.forge.multiplier; featureName = 'FORGE RELEASE'; }
  } else if (mode === 3) {
    // Consecutive dragon-column results charge a three-seal chamber; a miss breaks the chain.
    featureProgress = resolvedTier === 'none' ? 0 : before + 1;
    if (featureProgress >= FEATURE_MATH.dragon.target) { featureProgress = 0; featureBonus = args.bet * FEATURE_MATH.dragon.multiplier; featureName = 'DRAGON SEAL'; }
  }
  const award = args.bet * base + lanternBonus + featureBonus;
  const presentationTier = awardTier(award, args.bet, resolvedTier);
  return {
    board,
    tier: resolvedTier,
    award, presentationTier,
    lanternBonus,
    lane: args.lane,
    meters,
    guarantee: {
      bigSeen: args.guarantee.bigSeen || presentationTier === 'big',
      superSeen: args.guarantee.superSeen || presentationTier === 'super',
    },
    matchedRow,
    matchedCells: match?.cells ?? [],
    matchDescription: match?.description ?? 'NO MATCH',
    firstBoard, lockedCells, featureBonus, featureName, featureProgress,
  };
}
