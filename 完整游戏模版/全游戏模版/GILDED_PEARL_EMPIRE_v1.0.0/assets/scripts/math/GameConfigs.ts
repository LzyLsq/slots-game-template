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
  name: 'PEARL FORTUNE',
  theme: 'Soft champagne pearl lounge and glittering fortune reels',
  columns: 5,
  rows: 3,
  payMode: 'paylines',
  paylines: PAYLINES_20,
  symbols: defs([
    ['amethyst', 'Pearl Halo', 'low'], ['sapphire', 'Coin Stack', 'low'], ['emerald', 'Royal Emerald', 'low'],
    ['ruby', 'Rose Ruby', 'low'], ['moonstone', 'Brilliant Diamond', 'medium'], ['sunstone', 'Pearl Chest', 'medium'],
    ['wand', 'Jeweled Crown', 'medium'], ['orrery', 'Pearl Chalice', 'high'], ['crown', 'Diamond Scepter', 'high'],
    ['chalice', 'Golden Horseshoe', 'high'], ['wild', 'Crown Wild', 'wild'], ['scatter', 'Pearl Vault Scatter', 'scatter'],
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
  id: 'golden-dynasty', name: 'COIN GARDEN', theme: 'Playful coin cascades and pearl-framed golden reels',
  columns: 5, rows: 3, payMode: 'ways', paylines: [],
  symbols: defs([
    ['jade', 'Pearl Halo', 'low'], ['lantern', 'Coin Stack', 'low'], ['key', 'Royal Emerald', 'low'],
    ['fan', 'Rose Ruby', 'medium'], ['vessel', 'Brilliant Diamond', 'medium'], ['guardian', 'Pearl Chest', 'high'],
    ['seal', 'Jeweled Crown', 'high'], ['wild', 'Chalice Wild', 'wild'], ['scatter', 'Scepter Scatter', 'scatter'],
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
  id: 'neon-classic', name: 'GEM CLASSIC', theme: 'Friendly three-reel jewel boutique with classic slot rhythm',
  columns: 3, rows: 3, payMode: 'paylines', paylines: PAYLINES_5,
  symbols: defs([
    ['cherry', 'Pearl Halo', 'low'], ['lemon', 'Coin Stack', 'low'], ['melon', 'Royal Emerald', 'low'],
    ['bell', 'Rose Ruby', 'medium'], ['bar', 'Brilliant Diamond', 'medium'], ['double-bar', 'Pearl Chest', 'high'],
    ['seven', 'Jeweled Crown', 'high'], ['wild', 'Chalice Wild', 'wild'],
  ]),
  reelStrips: strips(['cherry', 'lemon', 'melon', 'bell', 'bar', 'double-bar', 'seven', 'wild'], 3),
  paytable: {
    cherry: { 3: 3 }, lemon: { 3: 4 }, melon: { 3: 5 }, bell: { 3: 8 }, bar: { 3: 12 },
    'double-bar': { 3: 20 }, seven: { 3: 50 }, wild: { 3: 100 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'wild', feature: 'hold-nudge-double', payoutScale: 1.21, targetRtp: 0.96,
};

export const COSMIC_COINS: GameConfig = {
  id: 'cosmic-coins', name: 'DIAMOND JACKPOT', theme: 'Pearl marquee, diamond sparkle and golden hold-and-spin',
  columns: 5, rows: 3, payMode: 'paylines', paylines: PAYLINES_20,
  symbols: defs([
    ['crystal', 'Pearl Halo', 'low'], ['drill', 'Coin Stack', 'low'], ['battery', 'Royal Emerald', 'low'],
    ['rover', 'Rose Ruby', 'medium'], ['helmet', 'Brilliant Diamond', 'medium'], ['reactor', 'Pearl Chest', 'high'],
    ['core', 'Jeweled Crown', 'high'], ['wild', 'Chalice Wild', 'wild'], ['scatter', 'Scepter Scatter', 'scatter'], ['bonus', 'Golden Horseshoe', 'bonus'],
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
