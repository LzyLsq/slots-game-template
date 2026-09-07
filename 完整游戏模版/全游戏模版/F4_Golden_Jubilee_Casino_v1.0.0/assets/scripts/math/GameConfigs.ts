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

export const LUCKY_COIN_GROVE: GameConfig = {
  id: 'lucky-coin-grove', name: 'LUCKY COIN GROVE', theme: 'Sunlit coin garden classic',
  columns: 3, rows: 3, payMode: 'paylines', modeLabel: 'CENTER LINE + COIN BLOOM', paylines: CENTER_LINE_3,
  symbols: defs([
    ['coin', 'Jubilee Coin', 'low'], ['mandarin', 'Lucky Mandarin', 'low'], ['bell', 'Celebration Bell', 'medium'],
    ['seven', 'Coral Seven', 'medium'], ['clover', 'Jade Clover', 'high'], ['chest', 'Garden Treasure Chest', 'high'],
    ['ribbon-fan', 'Jubilee Ribbon Fan', 'high'], ['sun-wild', 'Smiling Sun Wild', 'wild'], ['ticket', 'Golden Admission Ticket', 'scatter'],
  ]),
  reelStrips: strips(['coin', 'mandarin', 'coin', 'bell', 'mandarin', 'seven', 'coin', 'clover', 'mandarin', 'bell', 'coin', 'chest', 'mandarin', 'sun-wild', 'coin', 'ribbon-fan', 'seven', 'ticket', 'mandarin', 'bell', 'coin', 'clover', 'mandarin', 'seven'], 3),
  paytable: {
    coin: { 3: 2 }, mandarin: { 3: 3 }, bell: { 3: 5 }, seven: { 3: 8 },
    clover: { 3: 14 }, chest: { 3: 22 }, 'ribbon-fan': { 3: 35 }, 'sun-wild': { 3: 60 }, ticket: { 3: 1 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'sun-wild', scatterId: 'ticket', scatterAwards: { 3: 1 },
  feature: 'coin-bloom', volatility: 'medium', maxWinMultiplier: 2500, payoutScale: 3.88, targetRtp: 0.96,
};

export const TREASURE_PARADE: GameConfig = {
  id: 'treasure-parade', name: 'TREASURE PARADE', theme: 'Rolling treasure-vault parade',
  columns: 5, rows: 3, payMode: 'paylines', modeLabel: '20 LINES + LOCK & RESPIN', paylines: PAYLINES_20,
  symbols: defs([
    ['ingot', 'Golden Ingot', 'low'], ['ruby-chip', 'Ruby Casino Chip', 'low'], ['jade-chip', 'Jade Casino Chip', 'low'],
    ['lock-coin', 'Engraved Lock Coin', 'medium'], ['closed-chest', 'Lacquer Treasure Chest', 'medium'], ['open-chest', 'Overflowing Parade Chest', 'high'],
    ['crown', 'Jeweled Parade Crown', 'high'], ['sun-wild', 'Ribbon Sun Wild', 'wild'], ['vault-bonus', 'Vault Door Bonus', 'bonus'],
  ]),
  reelStrips: strips(['ingot', 'ruby-chip', 'jade-chip', 'ingot', 'lock-coin', 'vault-bonus', 'vault-bonus', 'jade-chip', 'ingot', 'open-chest', 'ruby-chip', 'vault-bonus', 'jade-chip', 'sun-wild', 'ingot', 'closed-chest', 'ruby-chip', 'crown', 'jade-chip', 'ingot', 'vault-bonus', 'lock-coin', 'ruby-chip', 'ingot'], 5),
  paytable: {
    ingot: { 3: 4, 4: 10, 5: 28 }, 'ruby-chip': { 3: 4, 4: 12, 5: 35 }, 'jade-chip': { 3: 5, 4: 15, 5: 45 },
    'lock-coin': { 3: 7, 4: 22, 5: 70 }, 'closed-chest': { 3: 10, 4: 35, 5: 120 }, 'open-chest': { 3: 15, 4: 60, 5: 240 },
    crown: { 3: 22, 4: 100, 5: 500 }, 'sun-wild': { 3: 30, 4: 150, 5: 800 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'sun-wild', bonusId: 'vault-bonus',
  feature: 'treasure-respin', volatility: 'high', maxWinMultiplier: 10000, payoutScale: 2.27, targetRtp: 0.96,
};

export const LANTERN_FORTUNE: GameConfig = {
  id: 'lantern-fortune', name: 'LANTERN FORTUNE', theme: 'Soft lantern festival with expanding wilds',
  columns: 5, rows: 4, payMode: 'ways', modeLabel: '1024 WAYS + EXPANDING WILDS', paylines: [], waysDivisor: 1024,
  symbols: defs([
    ['lantern', 'Coral Festival Lantern', 'low'], ['mandarins', 'Paired Mandarins', 'low'], ['fortune-knot', 'Jade Fortune Knot', 'low'],
    ['envelope', 'Lucky Red Envelope', 'medium'], ['coin-purse', 'Golden Coin Purse', 'medium'], ['folding-fan', 'Jeweled Folding Fan', 'high'],
    ['champagne-gem', 'Champagne Gem', 'high'], ['lantern-wild', 'Radiant Lantern Wild', 'wild'], ['lucky-seal', 'Lucky Seal Scatter', 'scatter'],
  ]),
  reelStrips: strips(['lantern', 'mandarins', 'fortune-knot', 'lantern', 'envelope', 'mandarins', 'coin-purse', 'fortune-knot', 'lantern', 'folding-fan', 'mandarins', 'envelope', 'fortune-knot', 'lantern-wild', 'lantern', 'coin-purse', 'mandarins', 'lucky-seal', 'fortune-knot', 'champagne-gem', 'lantern', 'envelope', 'mandarins', 'fortune-knot'], 5),
  paytable: {
    lantern: { 3: 8, 4: 24, 5: 70 }, mandarins: { 3: 9, 4: 28, 5: 84 }, 'fortune-knot': { 3: 11, 4: 34, 5: 105 },
    envelope: { 3: 14, 4: 46, 5: 145 }, 'coin-purse': { 3: 18, 4: 62, 5: 210 }, 'folding-fan': { 3: 26, 4: 95, 5: 340 },
    'champagne-gem': { 3: 38, 4: 145, 5: 600 }, 'lantern-wild': { 3: 55, 4: 230, 5: 950 }, 'lucky-seal': { 3: 1, 4: 4, 5: 16 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'lantern-wild', scatterId: 'lucky-seal',
  feature: 'expanding-wild', volatility: 'medium-high', maxWinMultiplier: 7500, payoutScale: 1.53, targetRtp: 0.96,
};

export const JUBILEE_CASCADE: GameConfig = {
  id: 'jubilee-cascade', name: 'JUBILEE CASCADE', theme: 'Coin-fountain cluster celebration',
  columns: 6, rows: 5, payMode: 'clusters', modeLabel: 'CLUSTER PAYS + COIN CASCADES', paylines: [], minimumCluster: 5,
  symbols: defs([
    ['coins', 'Stacked Jubilee Coins', 'low'], ['gems', 'Ruby Emerald Gems', 'low'], ['dice', 'Ivory Gold Dice', 'low'],
    ['coral-fan', 'Coral Silk Fan', 'medium'], ['drum', 'Celebration Drum', 'medium'], ['goblet', 'Champagne Goblet', 'high'],
    ['chest', 'Rounded Treasure Chest', 'high'], ['firework-wild', 'Firework Wild', 'wild'], ['fountain-bonus', 'Golden Fountain Bonus', 'bonus'],
  ]),
  reelStrips: strips(['coins', 'gems', 'dice', 'coins', 'coral-fan', 'gems', 'drum', 'dice', 'coins', 'goblet', 'gems', 'coral-fan', 'dice', 'firework-wild', 'coins', 'drum', 'gems', 'fountain-bonus', 'dice', 'chest', 'coins', 'coral-fan', 'gems', 'dice'], 6),
  paytable: {
    coins: { 5: 0.8, 6: 1, 8: 2, 10: 4, 12: 8, 15: 18 }, gems: { 5: 0.9, 6: 1.2, 8: 2.5, 10: 5, 12: 10, 15: 22 },
    dice: { 5: 1, 6: 1.5, 8: 3, 10: 6, 12: 12, 15: 28 }, 'coral-fan': { 5: 1.2, 6: 2, 8: 4, 10: 8, 12: 18, 15: 40 },
    drum: { 5: 1.5, 6: 2.5, 8: 5, 10: 11, 12: 25, 15: 60 }, goblet: { 5: 2, 6: 3, 8: 7, 10: 16, 12: 38, 15: 90 },
    chest: { 5: 3, 6: 5, 8: 12, 10: 28, 12: 70, 15: 180 }, 'firework-wild': { 5: 4, 6: 8, 8: 20, 10: 50, 12: 120, 15: 300 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'firework-wild', bonusId: 'fountain-bonus',
  feature: 'jubilee-cascade', volatility: 'medium-high', maxWinMultiplier: 10000, payoutScale: 0.747, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [LUCKY_COIN_GROVE, TREASURE_PARADE, LANTERN_FORTUNE, JUBILEE_CASCADE];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Record<GameConfig['id'], GameConfig>;
