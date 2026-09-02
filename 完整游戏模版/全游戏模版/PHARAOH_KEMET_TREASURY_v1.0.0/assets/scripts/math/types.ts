export type GameId = 'astral-vault' | 'golden-dynasty' | 'neon-classic' | 'cosmic-coins';
export type PayMode = 'paylines' | 'ways';

export interface SymbolDefinition {
  readonly id: string;
  readonly label: string;
  readonly tier: 'low' | 'medium' | 'high' | 'wild' | 'scatter' | 'bonus';
}

export interface PaytableEntry {
  readonly 3?: number;
  readonly 4?: number;
  readonly 5?: number;
}

export interface GameConfig {
  readonly id: GameId;
  readonly name: string;
  readonly theme: string;
  readonly columns: number;
  readonly rows: number;
  readonly payMode: PayMode;
  readonly paylines: readonly (readonly number[])[];
  readonly reelStrips: readonly (readonly string[])[];
  readonly symbols: readonly SymbolDefinition[];
  readonly paytable: Readonly<Record<string, PaytableEntry>>;
  readonly bets: readonly number[];
  readonly wildId: string;
  readonly scatterId?: string;
  readonly bonusId?: string;
  readonly scatterAwards?: Readonly<Record<number, number>>;
  readonly feature: 'sticky-free-spins' | 'expanding-wild-free-spins' | 'hold-nudge-double' | 'hold-and-spin';
  readonly payoutScale: number;
  readonly targetRtp: number;
}

export interface WinResult {
  readonly kind: 'line' | 'ways' | 'scatter' | 'bonus';
  readonly symbolId: string;
  readonly count: number;
  readonly multiplier: number;
  readonly credits: number;
  readonly positions: readonly number[];
  readonly lineIndex?: number;
  readonly ways?: number;
}

export interface FeatureTrigger {
  readonly type: 'free-spins' | 'hold-and-spin' | 'hold' | 'nudge';
  readonly count: number;
  readonly multiplier?: number;
}

export interface SpinResult {
  readonly spinId: string;
  readonly gameId: GameId;
  readonly seed: number;
  readonly stops: readonly number[];
  readonly grid: readonly string[];
  readonly wins: readonly WinResult[];
  readonly baseWin: number;
  readonly featureWin: number;
  readonly totalWin: number;
  readonly feature?: FeatureTrigger;
  readonly featureResult?: FeatureResult;
  readonly anticipationColumns: readonly number[];
}

export interface FeatureRound {
  readonly index: number;
  readonly grid: readonly string[];
  readonly wins: readonly WinResult[];
  readonly credits: number;
}

export interface FeatureResult {
  readonly type: FeatureTrigger['type'];
  readonly rounds: readonly FeatureRound[];
  readonly totalCredits: number;
  readonly jackpot?: 'mini' | 'minor' | 'major' | 'grand';
  readonly detail: string;
}

export interface ForceResult {
  readonly symbolId?: string;
  readonly count?: 3 | 4 | 5;
  readonly wild?: boolean;
  readonly scatterCount?: 3 | 4 | 5;
  readonly holdAndSpin?: boolean;
  readonly jackpot?: 'mini' | 'minor' | 'major' | 'grand';
  readonly winTier?: 'big' | 'mega' | 'epic';
}
