import { PAYLINES_20, PAYLINES_5 } from './paylines';
import type { GameConfig, SymbolDefinition } from './types';

const repeatStrip = (symbols: readonly string[], shift: number): readonly string[] => {
  const weighted = [...symbols, ...symbols.slice(0, 5), symbols[0], symbols[1], symbols[2]];
  return weighted.map((_, index) => weighted[(index + shift) % weighted.length]);
};

const strips = (symbols: readonly string[], count: number): readonly (readonly string[])[] =>
  Array.from({ length: count }, (_, index) => repeatStrip(symbols, index * 3));

const defs = (entries: readonly [string, string, SymbolDefinition['tier']][]): readonly SymbolDefinition[] =>
  entries.map(([id, label, tier]) => ({ id, label, tier }));

export const ASTRAL_VAULT: GameConfig = {
  id: 'astral-vault',
  name: 'RUBY JEWEL VAULT',
  theme: 'Soft rose-gold jewel dome casino cabinet',
  columns: 5,
  rows: 3,
  payMode: 'paylines',
  paylines: PAYLINES_20,
  symbols: defs([
    ['amethyst', 'Amethyst', 'low'], ['sapphire', 'Sapphire', 'low'], ['emerald', 'Emerald', 'low'],
    ['ruby', 'Ruby', 'low'], ['moonstone', 'Moonstone', 'medium'], ['sunstone', 'Sunstone', 'medium'],
    ['wand', 'Ruby Wand', 'medium'], ['orrery', 'Roulette Orb', 'high'], ['crown', 'Ruby Crown', 'high'],
    ['chalice', 'Jewel Chalice', 'high'], ['wild', 'Jewel Star Wild', 'wild'], ['scatter', 'Ruby Vault Scatter', 'scatter'],
  ]),
  reelStrips: strips(['amethyst', 'sapphire', 'emerald', 'ruby', 'moonstone', 'sunstone', 'wand', 'orrery', 'crown', 'chalice', 'wild', 'scatter'], 5),
  paytable: {
    amethyst: { 3: 2, 4: 5, 5: 12 }, sapphire: { 3: 2, 4: 6, 5: 14 }, emerald: { 3: 3, 4: 8, 5: 18 },
    ruby: { 3: 3, 4: 9, 5: 22 }, moonstone: { 3: 4, 4: 12, 5: 30 }, sunstone: { 3: 5, 4: 15, 5: 40 },
    wand: { 3: 6, 4: 20, 5: 60 }, orrery: { 3: 8, 4: 30, 5: 100 }, crown: { 3: 10, 4: 45, 5: 160 },
    chalice: { 3: 15, 4: 65, 5: 250 }, wild: { 3: 20, 4: 100, 5: 500 }, scatter: { 3: 2, 4: 10, 5: 50 },
  },
  bets: [100, 200, 500, 1000, 2000], wildId: 'wild', scatterId: 'scatter', scatterAwards: { 3: 10, 4: 15, 5: 20 },
  feature: 'sticky-free-spins', payoutScale: 1.045, targetRtp: 0.96,
};

export const GOLDEN_DYNASTY: GameConfig = {
  id: 'golden-dynasty', name: 'JADE FORTUNE', theme: 'Peach-gold jade canopy casino cabinet',
  columns: 5, rows: 3, payMode: 'ways', paylines: [],
  symbols: defs([
    ['jade', 'Jade Coin', 'low'], ['lantern', 'Lucky Lantern', 'low'], ['key', 'Fortune Key', 'low'],
    ['fan', 'Jade Fan', 'medium'], ['vessel', 'Coin Vessel', 'medium'], ['guardian', 'Fortune Lion', 'high'],
    ['seal', 'Jade Seal', 'high'], ['wild', 'Gold Ingot Wild', 'wild'], ['scatter', 'Lucky Gate Scatter', 'scatter'],
  ]),
  reelStrips: strips(['jade', 'lantern', 'key', 'fan', 'vessel', 'guardian', 'seal', 'wild', 'scatter'], 5),
  paytable: {
    jade: { 3: 1, 4: 3, 5: 8 }, lantern: { 3: 1, 4: 4, 5: 10 }, key: { 3: 2, 4: 5, 5: 12 },
    fan: { 3: 2, 4: 7, 5: 18 }, vessel: { 3: 3, 4: 10, 5: 28 }, guardian: { 3: 5, 4: 18, 5: 60 },
    seal: { 3: 8, 4: 35, 5: 120 }, wild: { 3: 10, 4: 50, 5: 200 }, scatter: { 3: 2, 4: 8, 5: 30 },
  },
  bets: [100, 200, 500, 1000, 2000], wildId: 'wild', scatterId: 'scatter', scatterAwards: { 3: 8, 4: 12, 5: 18 },
  feature: 'expanding-wild-free-spins', payoutScale: 3.37, targetRtp: 0.96,
};

export const NEON_CLASSIC: GameConfig = {
  id: 'neon-classic', name: 'CHAMPAGNE CLASSIC', theme: 'Rounded retro marquee casino cabinet',
  columns: 3, rows: 3, payMode: 'paylines', paylines: PAYLINES_5,
  symbols: defs([
    ['cherry', 'Ruby Cherry', 'low'], ['lemon', 'Golden Lemon', 'low'], ['melon', 'Lucky Melon', 'low'],
    ['bell', 'Champagne Bell', 'medium'], ['bar', 'Single BAR', 'medium'], ['double-bar', 'Double BAR', 'high'],
    ['seven', 'Lucky Seven', 'high'], ['wild', 'Marquee Star Wild', 'wild'],
  ]),
  reelStrips: strips(['cherry', 'lemon', 'melon', 'bell', 'bar', 'double-bar', 'seven', 'wild'], 3),
  paytable: {
    cherry: { 3: 3 }, lemon: { 3: 4 }, melon: { 3: 5 }, bell: { 3: 8 }, bar: { 3: 12 },
    'double-bar': { 3: 20 }, seven: { 3: 50 }, wild: { 3: 100 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'wild', feature: 'hold-nudge-double', payoutScale: 1.21, targetRtp: 0.96,
};

export const COSMIC_COINS: GameConfig = {
  id: 'cosmic-coins', name: 'COIN CARNIVAL', theme: 'High-roller coin waterfall casino cabinet',
  columns: 5, rows: 3, payMode: 'paylines', paylines: PAYLINES_20,
  symbols: defs([
    ['crystal', 'Emerald Diamond', 'low'], ['drill', 'Champagne Bottle', 'low'], ['battery', 'Ruby Casino Chip', 'low'],
    ['rover', 'Golden Dice', 'medium'], ['helmet', 'Coin Purse', 'medium'], ['reactor', 'Roulette Crown', 'high'],
    ['core', 'High Roller Vault', 'high'], ['wild', 'Gilded Wild', 'wild'], ['scatter', 'Roulette Scatter', 'scatter'], ['bonus', 'Bonus Gold Coin', 'bonus'],
  ]),
  reelStrips: strips(['crystal', 'drill', 'battery', 'rover', 'helmet', 'reactor', 'core', 'wild', 'scatter', 'bonus', 'bonus'], 5),
  paytable: {
    crystal: { 3: 2, 4: 4, 5: 10 }, drill: { 3: 2, 4: 5, 5: 12 }, battery: { 3: 3, 4: 7, 5: 16 },
    rover: { 3: 4, 4: 10, 5: 25 }, helmet: { 3: 5, 4: 14, 5: 40 }, reactor: { 3: 8, 4: 25, 5: 80 },
    core: { 3: 12, 4: 45, 5: 160 }, wild: { 3: 20, 4: 90, 5: 400 }, scatter: { 3: 2, 4: 8, 5: 30 },
  },
  bets: [100, 200, 500, 1000, 2000], wildId: 'wild', scatterId: 'scatter', bonusId: 'bonus',
  scatterAwards: { 3: 8, 4: 12, 5: 16 }, feature: 'hold-and-spin', payoutScale: 2.84, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [ASTRAL_VAULT, GOLDEN_DYNASTY, NEON_CLASSIC, COSMIC_COINS];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Record<GameConfig['id'], GameConfig>;
