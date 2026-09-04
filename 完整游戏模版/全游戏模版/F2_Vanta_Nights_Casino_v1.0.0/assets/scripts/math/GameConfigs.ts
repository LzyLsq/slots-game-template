import { PAYLINES_20 } from './paylines';
import type { GameConfig, SymbolDefinition } from './types';

const STRIP_STEPS = [1, 5, 7, 11, 13, 17] as const;
const permute = (source: readonly string[], reel: number): readonly string[] => {
  const step = STRIP_STEPS[reel % STRIP_STEPS.length];
  return source.map((_, index) => source[(index * step + reel * 3) % source.length]);
};

const strips = (source: readonly string[], count: number): readonly (readonly string[])[] =>
  Array.from({ length: count }, (_, index) => permute(source, index));

const defs = (entries: readonly [string, string, SymbolDefinition['tier']][]): readonly SymbolDefinition[] =>
  entries.map(([id, label, tier]) => ({ id, label, tier }));

export const CRIMSON_ROULETTE: GameConfig = {
  id: 'crimson-roulette', name: 'CRIMSON ROULETTE', theme: 'Fast, playful roulette lounge',
  columns: 5, rows: 3, payMode: 'paylines', modeLabel: '20 LINES + ROULETTE', paylines: PAYLINES_20,
  symbols: defs([
    ['heart', 'Ruby Heart', 'low'], ['club', 'Onyx Club', 'low'], ['diamond', 'Champagne Diamond', 'low'],
    ['spade', 'Chrome Spade', 'medium'], ['chip', 'Crimson Chip', 'medium'], ['ace', 'Aces High', 'high'],
    ['wheel', 'Roulette Wheel', 'high'], ['host', 'Ava Wild', 'wild'], ['eclipse', 'Eclipse Scatter', 'scatter'],
  ]),
  reelStrips: strips(['heart', 'club', 'diamond', 'spade', 'chip', 'heart', 'club', 'ace', 'diamond', 'wheel', 'heart', 'host', 'club', 'chip', 'eclipse', 'diamond', 'spade', 'heart', 'ace', 'club', 'wheel', 'diamond', 'chip', 'spade'], 5),
  paytable: {
    heart: { 3: 4, 4: 10, 5: 28 }, club: { 3: 4, 4: 11, 5: 30 }, diamond: { 3: 5, 4: 14, 5: 38 },
    spade: { 3: 6, 4: 18, 5: 50 }, chip: { 3: 8, 4: 25, 5: 75 }, ace: { 3: 12, 4: 45, 5: 160 },
    wheel: { 3: 18, 4: 80, 5: 320 }, host: { 3: 25, 4: 120, 5: 600 }, eclipse: { 3: 1, 4: 5, 5: 20 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'host', scatterId: 'eclipse', scatterAwards: { 3: 1, 4: 1, 5: 1 },
  feature: 'roulette-bonus', volatility: 'medium', maxWinMultiplier: 5000, payoutScale: 2.36, targetRtp: 0.96,
};

export const SAPPHIRE_SURGE: GameConfig = {
  id: 'sapphire-surge', name: 'SAPPHIRE SURGE', theme: 'Electric glass skyline card table',
  columns: 6, rows: 4, payMode: 'ways', modeLabel: '4096 FULL-SPAN WAYS + CASCADES', paylines: [], waysDivisor: 4096,
  symbols: defs([
    ['ten', 'Chrome Ten', 'low'], ['jack', 'Neon Jack', 'low'], ['queen', 'Glass Queen', 'low'], ['king', 'Sapphire King', 'medium'],
    ['spade', 'Blue Spade', 'medium'], ['chip', 'Silver Chip', 'high'], ['diamond', 'Skyline Diamond', 'high'],
    ['host', 'Ava Wild', 'wild'], ['eclipse', 'Eclipse Scatter', 'scatter'],
  ]),
  reelStrips: strips(['ten', 'jack', 'queen', 'king', 'ten', 'spade', 'jack', 'chip', 'queen', 'ten', 'diamond', 'king', 'jack', 'host', 'queen', 'spade', 'ten', 'eclipse', 'king', 'jack', 'chip', 'queen', 'spade', 'ten'], 6),
  paytable: {
    ten: { 6: 35 }, jack: { 6: 40 }, queen: { 6: 55 },
    king: { 6: 80 }, spade: { 6: 140 }, chip: { 6: 350 },
    diamond: { 6: 700 }, host: { 6: 1200 }, eclipse: { 6: 40 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'host', scatterId: 'eclipse',
  feature: 'cascade-multiplier', volatility: 'medium-high', maxWinMultiplier: 8000, payoutScale: 33.25, targetRtp: 0.96,
};

export const EMERALD_DICE: GameConfig = {
  id: 'emerald-dice', name: 'EMERALD DICE CLUB', theme: 'Lively metropolitan dice-pool party',
  columns: 6, rows: 5, payMode: 'clusters', modeLabel: 'CLUSTER PAYS + DICE LADDER', paylines: [], minimumCluster: 5,
  symbols: defs([
    ['clover', 'Lucky Clover', 'low'], ['horseshoe', 'Chrome Horseshoe', 'low'], ['chip', 'Emerald Chip', 'low'],
    ['dice', 'Double Dice', 'medium'], ['ring', 'Casino Ring', 'medium'], ['lime', 'Lime Gem', 'high'],
    ['trophy', 'Club Trophy', 'high'], ['host', 'Ava Wild', 'wild'], ['eclipse', 'Eclipse Dice', 'bonus'],
  ]),
  reelStrips: strips(['clover', 'horseshoe', 'chip', 'clover', 'dice', 'horseshoe', 'ring', 'chip', 'clover', 'lime', 'horseshoe', 'dice', 'chip', 'host', 'clover', 'ring', 'horseshoe', 'eclipse', 'chip', 'trophy', 'clover', 'dice', 'horseshoe', 'chip'], 6),
  paytable: {
    clover: { 5: 0.8, 6: 1, 8: 2, 10: 4, 12: 8, 15: 18 }, horseshoe: { 5: 0.9, 6: 1.2, 8: 2.5, 10: 5, 12: 10, 15: 22 },
    chip: { 5: 1, 6: 1.5, 8: 3, 10: 6, 12: 12, 15: 28 }, dice: { 5: 1.2, 6: 2, 8: 4, 10: 8, 12: 18, 15: 40 },
    ring: { 5: 1.5, 6: 2.5, 8: 5, 10: 11, 12: 25, 15: 60 }, lime: { 5: 2, 6: 3, 8: 7, 10: 16, 12: 38, 15: 90 },
    trophy: { 5: 3, 6: 5, 8: 12, 10: 28, 12: 70, 15: 180 }, host: { 5: 4, 6: 8, 8: 20, 10: 50, 12: 120, 15: 300 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'host', bonusId: 'eclipse',
  feature: 'dice-ladder', volatility: 'high', maxWinMultiplier: 10000, payoutScale: 1.079, targetRtp: 0.96,
};

export const AMETHYST_JACKPOT: GameConfig = {
  id: 'amethyst-jackpot', name: 'AMETHYST JACKPOT', theme: 'Upbeat progressive jackpot stage',
  columns: 5, rows: 3, payMode: 'paylines', modeLabel: '20 LINES + HOLD & RESPIN', paylines: PAYLINES_20,
  symbols: defs([
    ['coin', 'Violet Coin', 'low'], ['chest', 'Crystal Chest', 'low'], ['ring', 'Amethyst Ring', 'low'], ['seven', 'Royal Seven', 'medium'],
    ['crown', 'Jackpot Crown', 'medium'], ['vault', 'Grand Vault', 'high'], ['diamond', 'Eclipse Diamond', 'high'],
    ['host', 'Ava Wild', 'wild'], ['eclipse', 'Eclipse Scatter', 'scatter'], ['orb', 'Jackpot Orb', 'bonus'],
  ]),
  reelStrips: strips(['coin', 'chest', 'ring', 'coin', 'seven', 'orb', 'orb', 'ring', 'coin', 'vault', 'chest', 'orb', 'ring', 'host', 'coin', 'crown', 'chest', 'eclipse', 'ring', 'diamond', 'coin', 'orb', 'seven', 'chest'], 5),
  paytable: {
    coin: { 3: 4, 4: 10, 5: 28 }, chest: { 3: 4, 4: 12, 5: 35 }, ring: { 3: 5, 4: 15, 5: 45 }, seven: { 3: 7, 4: 22, 5: 70 },
    crown: { 3: 10, 4: 35, 5: 120 }, vault: { 3: 15, 4: 60, 5: 240 }, diamond: { 3: 22, 4: 100, 5: 500 },
    host: { 3: 30, 4: 150, 5: 800 }, eclipse: { 3: 1, 4: 5, 5: 20 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'host', scatterId: 'eclipse', bonusId: 'orb',
  feature: 'hold-and-spin', volatility: 'high', maxWinMultiplier: 10000, payoutScale: 2.68, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [CRIMSON_ROULETTE, SAPPHIRE_SURGE, EMERALD_DICE, AMETHYST_JACKPOT];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Record<GameConfig['id'], GameConfig>;
