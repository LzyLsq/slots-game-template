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

/** A tactile three-reel classic with a controlled pick feature. */
export const SEVEN_SKYLIGHT: GameConfig = {
  id: 'seven-skylight', name: 'SEVEN SKYLIGHT', theme: 'Champagne skylight classic with orbiting lucky coins',
  columns: 3, rows: 3, payMode: 'paylines', modeLabel: 'CENTER LINE + ORBIT PICK', paylines: CENTER_LINE_3,
  symbols: defs([
    ['coin', 'Skylight Coin', 'low'], ['cherry', 'Velvet Cherry', 'low'], ['bell', 'Brass Bell', 'medium'],
    ['bar', 'Casino Bar', 'medium'], ['seven', 'Prism Seven', 'high'], ['diamond', 'Sky Diamond', 'high'],
    ['champagne-seven', 'Champagne Seven', 'high'], ['sun-wild', 'Skylight Wild', 'wild'], ['orbit-ticket', 'Orbit Ticket', 'scatter'],
  ]),
  reelStrips: strips(['coin', 'cherry', 'coin', 'bell', 'cherry', 'bar', 'coin', 'seven', 'cherry', 'bell', 'coin', 'diamond', 'cherry', 'sun-wild', 'coin', 'champagne-seven', 'bar', 'orbit-ticket', 'cherry', 'bell', 'coin', 'seven', 'cherry', 'bar'], 3),
  paytable: {
    coin: { 3: 2 }, cherry: { 3: 3 }, bell: { 3: 5 }, bar: { 3: 8 }, seven: { 3: 14 },
    diamond: { 3: 22 }, 'champagne-seven': { 3: 35 }, 'sun-wild': { 3: 60 }, 'orbit-ticket': { 3: 1 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'sun-wild', scatterId: 'orbit-ticket', scatterAwards: { 3: 1 },
  feature: 'orbit-pick', volatility: 'medium', maxWinMultiplier: 2500, payoutScale: 3.88, targetRtp: 0.96,
};

/** A 20-line social-club cabinet with a visible cash-orb respin meter. */
export const CLOVER_CASH_CLUB: GameConfig = {
  id: 'clover-cash-club', name: 'CLOVER CASH CLUB', theme: 'Mint leather cash club with brass clover hardware',
  columns: 5, rows: 3, payMode: 'paylines', modeLabel: '20 LINES + CASH ORB RESPIN', paylines: PAYLINES_20,
  symbols: defs([
    ['coin-stack', 'Coin Stack', 'low'], ['cream-chip', 'Cream Casino Chip', 'low'], ['mint-chip', 'Mint Casino Chip', 'low'],
    ['clover', 'Lucky Clover', 'medium'], ['cash-case', 'Leather Cash Case', 'medium'], ['open-vault', 'Open Cash Vault', 'high'],
    ['club-crown', 'Cash Club Crown', 'high'], ['clover-wild', 'Clover Wild', 'wild'], ['cash-orb', 'Cash Orb', 'bonus'],
  ]),
  reelStrips: strips(['coin-stack', 'cream-chip', 'mint-chip', 'coin-stack', 'clover', 'cash-orb', 'cash-orb', 'mint-chip', 'coin-stack', 'open-vault', 'cream-chip', 'cash-orb', 'mint-chip', 'clover-wild', 'coin-stack', 'cash-case', 'cream-chip', 'club-crown', 'mint-chip', 'coin-stack', 'cash-orb', 'clover', 'cream-chip', 'coin-stack'], 5),
  paytable: {
    'coin-stack': { 3: 4, 4: 10, 5: 28 }, 'cream-chip': { 3: 4, 4: 12, 5: 35 }, 'mint-chip': { 3: 5, 4: 15, 5: 45 },
    clover: { 3: 7, 4: 22, 5: 70 }, 'cash-case': { 3: 10, 4: 35, 5: 120 }, 'open-vault': { 3: 15, 4: 60, 5: 240 },
    'club-crown': { 3: 22, 4: 100, 5: 500 }, 'clover-wild': { 3: 30, 4: 150, 5: 800 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'clover-wild', bonusId: 'cash-orb',
  feature: 'cash-respin', volatility: 'high', maxWinMultiplier: 10000, payoutScale: 2.27, targetRtp: 0.96,
};

/** A wide 4096-Ways game whose free spins expand animated dice Wilds. */
export const DICE_DRIFT_DELUXE: GameConfig = {
  id: 'dice-drift-deluxe', name: 'DICE DRIFT DELUXE', theme: 'Aqua glass dice lounge with peach neon accents',
  columns: 6, rows: 4, payMode: 'ways', modeLabel: '4096 WAYS + DICE WILD SPINS', paylines: [], waysDivisor: 4096,
  symbols: defs([
    ['gold-coin', 'Gold Coin', 'low'], ['aqua-chip', 'Aqua Chip', 'low'], ['peach-chip', 'Peach Chip', 'low'],
    ['single-die', 'Lucky Die', 'medium'], ['dice-pair', 'Golden Dice Pair', 'medium'], ['cocktail', 'Club Cocktail', 'high'],
    ['prism-gem', 'Prism Gem', 'high'], ['dice-wild', 'Rolling Dice Wild', 'wild'], ['dice-pass', 'Deluxe Pass', 'scatter'],
  ]),
  reelStrips: strips(['gold-coin', 'aqua-chip', 'peach-chip', 'gold-coin', 'single-die', 'aqua-chip', 'dice-pair', 'peach-chip', 'gold-coin', 'cocktail', 'aqua-chip', 'single-die', 'peach-chip', 'dice-wild', 'gold-coin', 'dice-pair', 'aqua-chip', 'dice-pass', 'peach-chip', 'prism-gem', 'gold-coin', 'single-die', 'aqua-chip', 'peach-chip'], 6),
  paytable: {
    'gold-coin': { 3: 8, 4: 24, 5: 70, 6: 150 }, 'aqua-chip': { 3: 9, 4: 28, 5: 84, 6: 175 }, 'peach-chip': { 3: 11, 4: 34, 5: 105, 6: 220 },
    'single-die': { 3: 14, 4: 46, 5: 145, 6: 310 }, 'dice-pair': { 3: 18, 4: 62, 5: 210, 6: 450 }, cocktail: { 3: 26, 4: 95, 5: 340, 6: 760 },
    'prism-gem': { 3: 38, 4: 145, 5: 600, 6: 1400 }, 'dice-wild': { 3: 55, 4: 230, 5: 950, 6: 2200 }, 'dice-pass': { 3: 1, 4: 4, 5: 16, 6: 40 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'dice-wild', scatterId: 'dice-pass',
  feature: 'dice-wild', volatility: 'medium-high', maxWinMultiplier: 7500, payoutScale: 1.885, targetRtp: 0.96,
};

/** A large cluster-pay vault where winning treasures cascade under a rising multiplier. */
export const SKY_VAULT_CASCADE: GameConfig = {
  id: 'sky-vault-cascade', name: 'SKY VAULT CASCADE', theme: 'Cream and sky-blue treasure atrium above the clouds',
  columns: 6, rows: 5, payMode: 'clusters', modeLabel: 'CLUSTER PAYS + SKYFALL CASCADES', paylines: [], minimumCluster: 5,
  symbols: defs([
    ['coin-pile', 'Coin Pile', 'low'], ['blue-gem', 'Sky Gem', 'low'], ['peach-gem', 'Peach Gem', 'low'],
    ['key', 'Vault Key', 'medium'], ['mini-chest', 'Mini Treasure Chest', 'medium'], ['goblet', 'Champagne Goblet', 'high'],
    ['sky-chest', 'Skylight Treasure Chest', 'high'], ['vault-wild', 'Vault Wing Wild', 'wild'], ['sky-vault', 'Sky Vault Bonus', 'bonus'],
  ]),
  reelStrips: strips(['coin-pile', 'blue-gem', 'peach-gem', 'coin-pile', 'key', 'blue-gem', 'mini-chest', 'peach-gem', 'coin-pile', 'goblet', 'blue-gem', 'key', 'peach-gem', 'vault-wild', 'coin-pile', 'mini-chest', 'blue-gem', 'sky-vault', 'peach-gem', 'sky-chest', 'coin-pile', 'key', 'blue-gem', 'peach-gem'], 6),
  paytable: {
    'coin-pile': { 5: 0.8, 6: 1, 8: 2, 10: 4, 12: 8, 15: 18 }, 'blue-gem': { 5: 0.9, 6: 1.2, 8: 2.5, 10: 5, 12: 10, 15: 22 },
    'peach-gem': { 5: 1, 6: 1.5, 8: 3, 10: 6, 12: 12, 15: 28 }, key: { 5: 1.2, 6: 2, 8: 4, 10: 8, 12: 18, 15: 40 },
    'mini-chest': { 5: 1.5, 6: 2.5, 8: 5, 10: 11, 12: 25, 15: 60 }, goblet: { 5: 2, 6: 3, 8: 7, 10: 16, 12: 38, 15: 90 },
    'sky-chest': { 5: 3, 6: 5, 8: 12, 10: 28, 12: 70, 15: 180 }, 'vault-wild': { 5: 4, 6: 8, 8: 20, 10: 50, 12: 120, 15: 300 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'vault-wild', bonusId: 'sky-vault',
  feature: 'skyfall-cascade', volatility: 'medium-high', maxWinMultiplier: 10000, payoutScale: 0.6945, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [SEVEN_SKYLIGHT, CLOVER_CASH_CLUB, DICE_DRIFT_DELUXE, SKY_VAULT_CASCADE];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Record<GameConfig['id'], GameConfig>;
