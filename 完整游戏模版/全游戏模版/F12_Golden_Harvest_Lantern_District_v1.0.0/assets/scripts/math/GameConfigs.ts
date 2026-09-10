import { PAYLINES_20 } from './paylines';
import type { GameConfig, SymbolDefinition } from './types';

const BETS = [50, 100, 200, 500, 1000] as const;
const STRIP_STEPS = [1, 5, 7, 11, 13, 17] as const;
const defs = (entries: readonly [string, string, SymbolDefinition['tier']][]): readonly SymbolDefinition[] =>
  entries.map(([id, label, tier]) => ({ id, label, tier }));
const permute = (source: readonly string[], reel: number): readonly string[] => {
  let step = STRIP_STEPS[reel % STRIP_STEPS.length];
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  while (gcd(step, source.length) !== 1) step += 2;
  return source.map((_, index) => source[(index * step + reel * 7) % source.length]);
};
const strips = (source: readonly string[], count: number): readonly (readonly string[])[] =>
  Array.from({ length: count }, (_, index) => permute(source, index));

export const BELLHOP_BONANZA: GameConfig = {
  id: 'bellhop-bonanza', name: 'GRANARY GOLD BANK', theme: 'Golden wheat granary with amber glass and engraved harvest gold',
  columns: 5, rows: 3, payMode: 'paylines', modeLabel: '20 LINES · STACKED LUGGAGE SUITES', paylines: PAYLINES_20,
  symbols: defs([
    ['coin-stack', 'Hotel Gold Coins', 'low'], ['coral-chip', 'Coral Casino Chip', 'low'], ['jade-chip', 'Jade Casino Chip', 'low'],
    ['service-bell', 'Golden Service Bell', 'medium'], ['luggage-stack', 'Luxury Luggage Stack', 'medium'], ['bellhop-cap', 'Bellhop Cap', 'high'],
    ['luggage-cart', 'Golden Luggage Cart', 'high'], ['bellhop-wild', 'Bellhop Wild', 'wild'], ['room-scatter', 'Grand Suite Key', 'scatter'],
  ]),
  reelStrips: strips(['coin-stack', 'coral-chip', 'jade-chip', 'coin-stack', 'service-bell', 'coral-chip', 'luggage-stack', 'jade-chip', 'coin-stack', 'bellhop-cap', 'coral-chip', 'service-bell', 'jade-chip', 'bellhop-wild', 'coin-stack', 'luggage-stack', 'coral-chip', 'room-scatter', 'jade-chip', 'luggage-cart', 'coin-stack', 'service-bell', 'coral-chip', 'jade-chip'], 5),
  paytable: {
    'coin-stack': { 3: 3, 4: 8, 5: 20 }, 'coral-chip': { 3: 4, 4: 10, 5: 28 }, 'jade-chip': { 3: 5, 4: 14, 5: 36 },
    'service-bell': { 3: 7, 4: 20, 5: 55 }, 'luggage-stack': { 3: 10, 4: 32, 5: 90 }, 'bellhop-cap': { 3: 15, 4: 50, 5: 150 },
    'luggage-cart': { 3: 25, 4: 90, 5: 280 }, 'bellhop-wild': { 3: 30, 4: 120, 5: 400 }, 'room-scatter': { 3: 1, 4: 2, 5: 5 },
  },
  bets: BETS, wildId: 'bellhop-wild', scatterId: 'room-scatter', scatterAwards: { 3: 1, 4: 2, 5: 5 },
  feature: 'bellhop-stacked-luggage', volatility: 'medium-high', maxWinMultiplier: 7500, payoutScale: 1.96, targetRtp: 0.96,
};

export const TEA_VAULT_TUMBLE: GameConfig = {
  id: 'tea-vault-tumble', name: 'RIVER OF LANTERNS', theme: 'Celadon river pavilion illuminated by floating fortune lanterns',
  columns: 6, rows: 5, payMode: 'clusters', modeLabel: '6×5 CLUSTERS · TEA-TRAY MULTIPLIERS', paylines: [], minimumCluster: 5,
  symbols: defs([
    ['gold-coins', 'Afternoon Gold Coins', 'low'], ['jade-macaron', 'Jade Macaron', 'low'], ['coral-macaron', 'Coral Macaron', 'low'],
    ['tea-cup', 'Celadon Tea Cup', 'medium'], ['tea-pot', 'Golden Tea Pot', 'medium'], ['tea-trolley', 'Treasure Tea Trolley', 'high'],
    ['fortune-cake', 'Fortune Celebration Cake', 'high'], ['tea-wild', 'Tea Vault Wild', 'wild'], ['vault-bonus', 'Patisserie Vault Bonus', 'bonus'],
  ]),
  reelStrips: strips(['gold-coins', 'jade-macaron', 'coral-macaron', 'gold-coins', 'tea-cup', 'jade-macaron', 'coral-macaron', 'tea-pot', 'gold-coins', 'jade-macaron', 'tea-cup', 'coral-macaron', 'gold-coins', 'tea-trolley', 'jade-macaron', 'tea-wild', 'coral-macaron', 'tea-pot', 'gold-coins', 'fortune-cake', 'jade-macaron', 'vault-bonus', 'coral-macaron', 'tea-cup', 'gold-coins', 'jade-macaron', 'coral-macaron'], 6),
  paytable: {
    'gold-coins': { 5: .08, 6: .12, 8: .25, 10: .55, 12: 1.1, 15: 2.5, 20: 7 },
    'jade-macaron': { 5: .1, 6: .15, 8: .3, 10: .7, 12: 1.5, 15: 3.2, 20: 9 },
    'coral-macaron': { 5: .12, 6: .2, 8: .4, 10: .9, 12: 1.9, 15: 4.2, 20: 12 },
    'tea-cup': { 5: .18, 6: .28, 8: .55, 10: 1.2, 12: 2.6, 15: 6, 20: 18 },
    'tea-pot': { 5: .25, 6: .4, 8: .8, 10: 1.8, 12: 4, 15: 9, 20: 28 },
    'tea-trolley': { 5: .4, 6: .7, 8: 1.4, 10: 3.2, 12: 7, 15: 18, 20: 55 },
    'fortune-cake': { 5: .7, 6: 1.1, 8: 2.4, 10: 5.5, 12: 13, 15: 32, 20: 100 },
    'tea-wild': { 5: 1, 6: 1.8, 8: 4, 10: 10, 12: 25, 15: 65, 20: 200 },
  },
  bets: BETS, wildId: 'tea-wild', bonusId: 'vault-bonus', feature: 'tea-vault-cascade', volatility: 'medium',
  maxWinMultiplier: 10000, payoutScale: 4.1, targetRtp: 0.96,
};

export const BALLROOM_KEYWAYS: GameConfig = {
  id: 'ballroom-keyways', name: 'JADE KOI TREASURY', theme: 'Emerald koi treasury with carved jade and warm gilded scales',
  columns: 5, rows: 4, payMode: 'ways', modeLabel: '1024 WAYS · COLLECT THE BALLROOM KEYS', paylines: [], waysDivisor: 1024,
  symbols: defs([
    ['gold-chip', 'Ballroom Gold Chip', 'low'], ['sapphire-chip', 'Sapphire Casino Chip', 'low'], ['ruby-chip', 'Ruby Casino Chip', 'low'],
    ['opera-glasses', 'Golden Opera Glasses', 'medium'], ['crystal-chandelier', 'Crystal Chandelier', 'medium'], ['ballroom-key', 'Ballroom Key', 'high'],
    ['champagne-vault', 'Champagne Vault', 'high'], ['ballroom-wild', 'Dancing Key Wild', 'wild'], ['invitation-scatter', 'Grand Invitation', 'scatter'],
  ]),
  reelStrips: strips(['gold-chip', 'sapphire-chip', 'ruby-chip', 'gold-chip', 'opera-glasses', 'sapphire-chip', 'crystal-chandelier', 'ruby-chip', 'gold-chip', 'ballroom-key', 'sapphire-chip', 'opera-glasses', 'ruby-chip', 'ballroom-wild', 'gold-chip', 'crystal-chandelier', 'sapphire-chip', 'invitation-scatter', 'ruby-chip', 'champagne-vault', 'gold-chip', 'opera-glasses', 'sapphire-chip', 'ruby-chip'], 5),
  paytable: {
    'gold-chip': { 3: 3, 4: 8, 5: 22 }, 'sapphire-chip': { 3: 4, 4: 11, 5: 30 }, 'ruby-chip': { 3: 5, 4: 15, 5: 42 },
    'opera-glasses': { 3: 7, 4: 22, 5: 65 }, 'crystal-chandelier': { 3: 10, 4: 34, 5: 100 }, 'ballroom-key': { 3: 16, 4: 55, 5: 175 },
    'champagne-vault': { 3: 25, 4: 95, 5: 320 }, 'ballroom-wild': { 3: 35, 4: 135, 5: 480 }, 'invitation-scatter': { 3: 1, 4: 2, 5: 5 },
  },
  bets: BETS, wildId: 'ballroom-wild', scatterId: 'invitation-scatter', scatterAwards: { 3: 1, 4: 2, 5: 5 },
  feature: 'ballroom-key-path', volatility: 'high', maxWinMultiplier: 10000, payoutScale: 4, targetRtp: 0.96,
};

export const PENTHOUSE_FORTUNE_LIFT: GameConfig = {
  id: 'penthouse-fortune-lift', name: 'FORTUNE DRUM', theme: 'Vermilion festival drum pavilion with ivory enamel and golden studs',
  columns: 4, rows: 4, payMode: 'ways', modeLabel: '512 TWO-WAY WAYS · FORTUNE LIFT FLOORS', paylines: [], waysDivisor: 512, bidirectionalWays: true,
  symbols: defs([
    ['coin-stack', 'Penthouse Gold Coins', 'low'], ['coral-chip', 'Coral Casino Chip', 'low'], ['jade-chip', 'Jade Casino Chip', 'low'],
    ['service-bell', 'Penthouse Service Bell', 'medium'], ['penthouse-key', 'Penthouse Key', 'medium'], ['treasure-case', 'Treasure Attaché Case', 'high'],
    ['lift-vault', 'Fortune Lift Vault', 'high'], ['penthouse-wild', 'Penthouse Wild', 'wild'], ['floor-bonus', 'Golden Floor Bonus', 'bonus'],
  ]),
  reelStrips: strips(['coin-stack', 'coral-chip', 'jade-chip', 'coin-stack', 'service-bell', 'coral-chip', 'penthouse-key', 'jade-chip', 'coin-stack', 'treasure-case', 'coral-chip', 'service-bell', 'jade-chip', 'penthouse-wild', 'coin-stack', 'penthouse-key', 'coral-chip', 'floor-bonus', 'jade-chip', 'lift-vault', 'coin-stack', 'service-bell', 'coral-chip', 'jade-chip'], 4),
  paytable: {
    'coin-stack': { 3: 2, 4: 7 }, 'coral-chip': { 3: 3, 4: 10 }, 'jade-chip': { 3: 4, 4: 14 },
    'service-bell': { 3: 6, 4: 22 }, 'penthouse-key': { 3: 9, 4: 35 }, 'treasure-case': { 3: 15, 4: 65 },
    'lift-vault': { 3: 24, 4: 120 }, 'penthouse-wild': { 3: 36, 4: 220 },
  },
  bets: BETS, wildId: 'penthouse-wild', bonusId: 'floor-bonus', feature: 'penthouse-lift', volatility: 'medium-high',
  maxWinMultiplier: 7500, payoutScale: 3.94, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [BELLHOP_BONANZA, TEA_VAULT_TUMBLE, BALLROOM_KEYWAYS, PENTHOUSE_FORTUNE_LIFT];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Readonly<Record<GameConfig['id'], GameConfig>>;

/** Each F12 symbol atlas is a 4×4 sheet whose first nine cells match the config order. */
export const SYMBOL_ART: Readonly<Record<string, number>> = Object.fromEntries(
  GAME_CONFIGS.flatMap((config) => config.symbols.map((symbol, index) => [symbol.id, index] as const)),
);
