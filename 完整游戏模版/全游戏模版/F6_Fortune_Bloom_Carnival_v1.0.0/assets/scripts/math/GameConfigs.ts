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

/** 5x4 ways game with a roaming Wild parade across successive feature rounds. */
export const GOLDEN_PARADE: GameConfig = {
  id: 'golden-parade', name: 'GOLDEN PARADE', theme: 'Sunlit coin-float boulevard with ribbon arches and a roaming treasure Wild',
  columns: 5, rows: 4, payMode: 'ways', modeLabel: '1024 WAYS + ROAMING PARADE WILD', paylines: [], waysDivisor: 1024,
  symbols: defs([
    ['coin-fan', 'Golden Coin Fan', 'low'], ['peach-chip', 'Peach Parade Chip', 'low'], ['jade-chip', 'Jade Parade Chip', 'low'],
    ['money-purse', 'Ribbon Money Purse', 'medium'], ['treasure-float', 'Treasure Parade Float', 'medium'], ['parade-crown', 'Jubilee Crown', 'high'],
    ['parade-chest', 'Grand Parade Chest', 'high'], ['bloom-wild', 'Blooming Coin Wild', 'wild'], ['parade-ticket', 'Golden Parade Ticket', 'scatter'],
  ]),
  reelStrips: strips(['coin-fan', 'peach-chip', 'jade-chip', 'coin-fan', 'money-purse', 'peach-chip', 'treasure-float', 'jade-chip', 'coin-fan', 'parade-crown', 'peach-chip', 'money-purse', 'jade-chip', 'bloom-wild', 'coin-fan', 'treasure-float', 'peach-chip', 'parade-ticket', 'jade-chip', 'parade-chest', 'coin-fan', 'money-purse', 'peach-chip', 'jade-chip'], 5),
  paytable: {
    'coin-fan': { 3: 7, 4: 20, 5: 60 }, 'peach-chip': { 3: 8, 4: 24, 5: 72 }, 'jade-chip': { 3: 9, 4: 28, 5: 86 },
    'money-purse': { 3: 12, 4: 40, 5: 130 }, 'treasure-float': { 3: 16, 4: 58, 5: 210 }, 'parade-crown': { 3: 24, 4: 95, 5: 420 },
    'parade-chest': { 3: 36, 4: 160, 5: 900 }, 'bloom-wild': { 3: 50, 4: 240, 5: 1500 }, 'parade-ticket': { 3: 1, 4: 5, 5: 24 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'bloom-wild', scatterId: 'parade-ticket', scatterAwards: { 3: 1, 4: 3, 5: 8 },
  feature: 'parade-wild', volatility: 'medium-high', maxWinMultiplier: 7500, payoutScale: 1.626, targetRtp: 0.96,
};

/** 5x5 cluster game whose flowers collapse and raise a persistent multiplier. */
export const BLOSSOM_FORTUNE: GameConfig = {
  id: 'blossom-fortune', name: 'BLOSSOM FORTUNE', theme: 'Jade conservatory where coin blossoms burst into petal cascades',
  columns: 5, rows: 5, payMode: 'clusters', modeLabel: 'CLUSTER PAYS + BLOOM CASCADES', paylines: [], minimumCluster: 5,
  symbols: defs([
    ['coin-blossom', 'Coin Blossom', 'low'], ['aqua-gem', 'Aqua Gem', 'low'], ['peach-gem', 'Peach Gem', 'low'],
    ['jade-leaf', 'Jade Leaf', 'medium'], ['gold-dust', 'Gold Dust Bottle', 'medium'], ['hummingbird', 'Golden Hummingbird', 'high'],
    ['jewel-peony', 'Jewel Peony', 'high'], ['peony-wild', 'Floral Wild Seal', 'wild'], ['bloom-bonus', 'Radiant Bonus Bud', 'bonus'],
  ]),
  reelStrips: strips(['coin-blossom', 'aqua-gem', 'peach-gem', 'coin-blossom', 'jade-leaf', 'aqua-gem', 'gold-dust', 'peach-gem', 'coin-blossom', 'hummingbird', 'aqua-gem', 'jade-leaf', 'peach-gem', 'peony-wild', 'coin-blossom', 'gold-dust', 'aqua-gem', 'bloom-bonus', 'peach-gem', 'jewel-peony', 'coin-blossom', 'jade-leaf', 'aqua-gem', 'peach-gem'], 5),
  paytable: {
    'coin-blossom': { 5: 0.8, 6: 1, 8: 2, 10: 4, 12: 8, 15: 18 }, 'aqua-gem': { 5: 0.9, 6: 1.2, 8: 2.5, 10: 5, 12: 10, 15: 22 },
    'peach-gem': { 5: 1, 6: 1.5, 8: 3, 10: 6, 12: 12, 15: 28 }, 'jade-leaf': { 5: 1.2, 6: 2, 8: 4, 10: 8, 12: 18, 15: 40 },
    'gold-dust': { 5: 1.5, 6: 2.5, 8: 5, 10: 11, 12: 25, 15: 60 }, hummingbird: { 5: 2, 6: 3, 8: 7, 10: 16, 12: 38, 15: 90 },
    'jewel-peony': { 5: 3, 6: 5, 8: 12, 10: 28, 12: 70, 15: 180 }, 'peony-wild': { 5: 4, 6: 8, 8: 20, 10: 50, 12: 120, 15: 300 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'peony-wild', bonusId: 'bloom-bonus',
  feature: 'blossom-cascade', volatility: 'medium', maxWinMultiplier: 10000, payoutScale: 0.996, targetRtp: 0.96,
};

/** 5x3 fixed-line cabinet where six Bonus coins unlock a three-life hold-and-respin board. */
export const LANTERN_TREASURE: GameConfig = {
  id: 'lantern-treasure', name: 'LANTERN TREASURE', theme: 'Warm lantern treasury with locked gold coins and jackpot chests',
  columns: 5, rows: 3, payMode: 'paylines', modeLabel: '20 LINES + LANTERN LOCK RESPIN', paylines: PAYLINES_20,
  symbols: defs([
    ['coin-stack', 'Lucky Coin Stack', 'low'], ['coral-chip', 'Coral Casino Chip', 'low'], ['jade-chip', 'Jade Casino Chip', 'low'],
    ['gold-lantern', 'Golden Lantern', 'medium'], ['vault-key', 'Treasury Key', 'medium'], ['silk-pouch', 'Silk Money Pouch', 'high'],
    ['lantern-chest', 'Lantern Treasure Chest', 'high'], ['flame-wild', 'Lantern Flame Wild', 'wild'], ['locked-coin', 'Locked Bonus Coin', 'bonus'],
  ]),
  reelStrips: strips(['coin-stack', 'coral-chip', 'jade-chip', 'coin-stack', 'gold-lantern', 'locked-coin', 'locked-coin', 'jade-chip', 'coin-stack', 'silk-pouch', 'coral-chip', 'locked-coin', 'jade-chip', 'flame-wild', 'coin-stack', 'vault-key', 'coral-chip', 'lantern-chest', 'jade-chip', 'coin-stack', 'locked-coin', 'gold-lantern', 'coral-chip', 'coin-stack'], 5),
  paytable: {
    'coin-stack': { 3: 4, 4: 10, 5: 28 }, 'coral-chip': { 3: 4, 4: 12, 5: 35 }, 'jade-chip': { 3: 5, 4: 15, 5: 45 },
    'gold-lantern': { 3: 7, 4: 22, 5: 70 }, 'vault-key': { 3: 10, 4: 35, 5: 120 }, 'silk-pouch': { 3: 15, 4: 60, 5: 240 },
    'lantern-chest': { 3: 22, 4: 100, 5: 500 }, 'flame-wild': { 3: 30, 4: 150, 5: 800 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'flame-wild', bonusId: 'locked-coin',
  feature: 'lantern-respin', volatility: 'high', maxWinMultiplier: 10000, payoutScale: 2.30, targetRtp: 0.96,
};

/** A tactile three-reel classic whose three Bonus tickets open a physical treasure wheel. */
export const TREASURE_WHEEL: GameConfig = {
  id: 'treasure-wheel', name: 'TREASURE WHEEL', theme: 'Sunny vintage prize pavilion with a physical fortune wheel',
  columns: 3, rows: 3, payMode: 'paylines', modeLabel: 'CENTER LINE + TREASURE WHEEL', paylines: CENTER_LINE_3,
  symbols: defs([
    ['gold-coin', 'Lucky Gold Coin', 'low'], ['peach-pair', 'Peach Pair', 'low'], ['lucky-bell', 'Lucky Bell', 'medium'],
    ['blue-bar', 'Blue Gold Bar', 'medium'], ['jade-seven', 'Jade Seven', 'high'], ['money-bag', 'Jeweled Money Bag', 'high'],
    ['prize-wheel', 'Floral Prize Wheel', 'high'], ['star-wild', 'Carnival Star Wild', 'wild'], ['wheel-ticket', 'Treasure Wheel Ticket', 'scatter'],
  ]),
  reelStrips: strips(['gold-coin', 'peach-pair', 'gold-coin', 'lucky-bell', 'peach-pair', 'blue-bar', 'gold-coin', 'jade-seven', 'peach-pair', 'lucky-bell', 'gold-coin', 'money-bag', 'peach-pair', 'star-wild', 'gold-coin', 'prize-wheel', 'blue-bar', 'wheel-ticket', 'peach-pair', 'lucky-bell', 'gold-coin', 'jade-seven', 'peach-pair', 'blue-bar'], 3),
  paytable: {
    'gold-coin': { 3: 2 }, 'peach-pair': { 3: 3 }, 'lucky-bell': { 3: 5 }, 'blue-bar': { 3: 8 }, 'jade-seven': { 3: 14 },
    'money-bag': { 3: 22 }, 'prize-wheel': { 3: 35 }, 'star-wild': { 3: 60 }, 'wheel-ticket': { 3: 1 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'star-wild', scatterId: 'wheel-ticket', scatterAwards: { 3: 1 },
  feature: 'treasure-wheel', volatility: 'medium', maxWinMultiplier: 2500, payoutScale: 3.83, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [GOLDEN_PARADE, BLOSSOM_FORTUNE, LANTERN_TREASURE, TREASURE_WHEEL];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Record<GameConfig['id'], GameConfig>;
