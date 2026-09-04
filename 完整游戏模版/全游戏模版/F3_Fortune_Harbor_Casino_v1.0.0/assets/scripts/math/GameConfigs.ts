import { PAYLINES_20 } from './paylines';
import type { GameConfig, SymbolDefinition } from './types';

const CENTER_LINE_3 = [[1, 1, 1]] as const;
const STRIP_STEPS = [1, 5, 7, 11, 13, 17] as const;
const permute = (source: readonly string[], reel: number): readonly string[] => {
  const step = STRIP_STEPS[reel % STRIP_STEPS.length];
  return source.map((_, index) => source[(index * step + reel * 3) % source.length]);
};
const strips = (source: readonly string[], count: number): readonly (readonly string[])[] =>
  Array.from({ length: count }, (_, index) => permute(source, index));
const defs = (entries: readonly [string, string, SymbolDefinition['tier']][]): readonly SymbolDefinition[] =>
  entries.map(([id, label, tier]) => ({ id, label, tier }));

export const GOLDEN_TIDE: GameConfig = {
  id: 'golden-tide', name: 'GOLDEN TIDE', theme: 'Sunny three-reel harbor classic',
  columns: 3, rows: 3, payMode: 'paylines', modeLabel: 'CENTER LINE + COIN TOSS', paylines: CENTER_LINE_3,
  symbols: defs([
    ['coin', 'Harbor Coin', 'low'], ['lemon', 'Sunny Lemon', 'low'], ['bell', 'Brass Bell', 'medium'],
    ['horseshoe', 'Teal Horseshoe', 'medium'], ['seven', 'Coral Seven', 'high'], ['chest', 'Open Coin Chest', 'high'],
    ['wheel', 'Ship Wheel', 'high'], ['compass', 'Sun Compass', 'wild'], ['ticket', 'Harbor Ticket', 'scatter'],
  ]),
  reelStrips: strips(['coin', 'lemon', 'coin', 'bell', 'lemon', 'horseshoe', 'coin', 'seven', 'lemon', 'bell', 'coin', 'chest', 'lemon', 'compass', 'coin', 'wheel', 'horseshoe', 'ticket', 'lemon', 'bell', 'coin', 'seven', 'lemon', 'horseshoe'], 3),
  paytable: {
    coin: { 3: 2 }, lemon: { 3: 3 }, bell: { 3: 5 }, horseshoe: { 3: 8 },
    seven: { 3: 14 }, chest: { 3: 22 }, wheel: { 3: 35 }, compass: { 3: 60 }, ticket: { 3: 1 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'compass', scatterId: 'ticket', scatterAwards: { 3: 1 },
  feature: 'coin-toss', volatility: 'medium', maxWinMultiplier: 2500, payoutScale: 3.88, targetRtp: 0.96,
};

export const CAPTAINS_CHEST: GameConfig = {
  id: 'captains-chest', name: "CAPTAIN'S CHEST", theme: 'Treasure-hold marina cabinet',
  columns: 5, rows: 3, payMode: 'paylines', modeLabel: '20 LINES + HOLD & RESPIN', paylines: PAYLINES_20,
  symbols: defs([
    ['bronze', 'Bronze Anchor Coin', 'low'], ['silver', 'Silver Anchor Coin', 'low'], ['gold', 'Gold Anchor Coin', 'low'],
    ['anchor', 'Brass Anchor', 'medium'], ['key', 'Jeweled Key', 'medium'], ['chest', 'Captain Chest', 'high'],
    ['captain', 'Captain Cap', 'high'], ['compass', 'Sun Compass', 'wild'], ['chart', 'Harbor Chart', 'scatter'], ['beacon', 'Coin Beacon', 'bonus'],
  ]),
  reelStrips: strips(['bronze', 'silver', 'gold', 'bronze', 'anchor', 'beacon', 'beacon', 'gold', 'bronze', 'chest', 'silver', 'beacon', 'gold', 'compass', 'bronze', 'key', 'silver', 'chart', 'gold', 'captain', 'bronze', 'beacon', 'anchor', 'silver'], 5),
  paytable: {
    bronze: { 3: 4, 4: 10, 5: 28 }, silver: { 3: 4, 4: 12, 5: 35 }, gold: { 3: 5, 4: 15, 5: 45 },
    anchor: { 3: 7, 4: 22, 5: 70 }, key: { 3: 10, 4: 35, 5: 120 }, chest: { 3: 15, 4: 60, 5: 240 },
    captain: { 3: 22, 4: 100, 5: 500 }, compass: { 3: 30, 4: 150, 5: 800 }, chart: { 3: 1, 4: 5, 5: 20 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'compass', scatterId: 'chart', bonusId: 'beacon',
  feature: 'hold-and-spin', volatility: 'high', maxWinMultiplier: 10000, payoutScale: 2.75, targetRtp: 0.96,
};

export const PEARL_PARADE: GameConfig = {
  id: 'pearl-parade', name: 'PEARL PARADE', theme: 'Bright pearl-wheel cluster celebration',
  columns: 6, rows: 5, payMode: 'clusters', modeLabel: 'CLUSTER PAYS + RISING CASCADES', paylines: [], minimumCluster: 5,
  symbols: defs([
    ['shell', 'Ivory Shell', 'low'], ['starfish', 'Coral Starfish', 'low'], ['pearl', 'Luminous Pearl', 'low'],
    ['coral', 'Coral Branch', 'medium'], ['ring', 'Pearl Ring', 'medium'], ['tiara', 'Shell Tiara', 'high'],
    ['necklace', 'Pearl Necklace', 'high'], ['compass', 'Sun Compass', 'wild'], ['pearl-wheel', 'Pearl Wheel', 'bonus'],
  ]),
  reelStrips: strips(['shell', 'starfish', 'pearl', 'shell', 'coral', 'starfish', 'ring', 'pearl', 'shell', 'tiara', 'starfish', 'coral', 'pearl', 'compass', 'shell', 'ring', 'starfish', 'pearl-wheel', 'pearl', 'necklace', 'shell', 'coral', 'starfish', 'pearl'], 6),
  paytable: {
    shell: { 5: 0.8, 6: 1, 8: 2, 10: 4, 12: 8, 15: 18 }, starfish: { 5: 0.9, 6: 1.2, 8: 2.5, 10: 5, 12: 10, 15: 22 },
    pearl: { 5: 1, 6: 1.5, 8: 3, 10: 6, 12: 12, 15: 28 }, coral: { 5: 1.2, 6: 2, 8: 4, 10: 8, 12: 18, 15: 40 },
    ring: { 5: 1.5, 6: 2.5, 8: 5, 10: 11, 12: 25, 15: 60 }, tiara: { 5: 2, 6: 3, 8: 7, 10: 16, 12: 38, 15: 90 },
    necklace: { 5: 3, 6: 5, 8: 12, 10: 28, 12: 70, 15: 180 }, compass: { 5: 4, 6: 8, 8: 20, 10: 50, 12: 120, 15: 300 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'compass', bonusId: 'pearl-wheel',
  feature: 'cascade-multiplier', volatility: 'medium-high', maxWinMultiplier: 10000, payoutScale: 0.74, targetRtp: 0.96,
};

export const LUCKY_LIGHTHOUSE: GameConfig = {
  id: 'lucky-lighthouse', name: 'BEACON FORTUNE', theme: 'Gold-and-gem six-reel jackpot ways',
  columns: 6, rows: 4, payMode: 'ways', modeLabel: '4096 WAYS + GRAND BEACON', paylines: [], waysDivisor: 4096,
  symbols: defs([
    ['ten', 'Gold Coin Stack', 'low'], ['captain', 'Coral Casino Chips', 'low'], ['voyager', 'Emerald Crown Chip', 'low'],
    ['sea-king', 'Royal Ruby Crown', 'medium'], ['lantern', 'Jackpot Jewel Ring', 'medium'], ['lighthouse', 'Overflowing Treasure Chest', 'high'],
    ['diamond', 'Royal Blue Diamond', 'high'], ['compass', 'Coin Sun Wild', 'wild'], ['beacon', 'Grand Jackpot Beacon', 'scatter'],
  ]),
  reelStrips: strips(['ten', 'captain', 'voyager', 'sea-king', 'ten', 'lantern', 'captain', 'lighthouse', 'voyager', 'ten', 'diamond', 'sea-king', 'captain', 'compass', 'voyager', 'lantern', 'ten', 'beacon', 'sea-king', 'captain', 'lighthouse', 'voyager', 'lantern', 'ten'], 6),
  paytable: {
    ten: { 6: 35 }, captain: { 6: 40 }, voyager: { 6: 55 }, 'sea-king': { 6: 80 }, lantern: { 6: 140 },
    lighthouse: { 6: 350 }, diamond: { 6: 700 }, compass: { 6: 1200 }, beacon: { 3: 1, 4: 4, 5: 12, 6: 40 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'compass', scatterId: 'beacon',
  feature: 'beacon-bonus', volatility: 'medium-high', maxWinMultiplier: 8000, payoutScale: 6, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [GOLDEN_TIDE, CAPTAINS_CHEST, PEARL_PARADE, LUCKY_LIGHTHOUSE];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Record<GameConfig['id'], GameConfig>;
