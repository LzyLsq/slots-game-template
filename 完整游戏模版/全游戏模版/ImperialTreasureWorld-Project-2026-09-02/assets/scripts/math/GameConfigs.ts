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
  name: 'RUBY IMPERIAL',
  theme: 'Imperial ruby, diamond and champagne-gold treasury',
  columns: 5,
  rows: 3,
  payMode: 'paylines',
  paylines: PAYLINES_20,
  symbols: defs([
    ['amethyst', 'Imperial Amethyst', 'low'], ['sapphire', 'Royal Sapphire', 'low'], ['emerald', 'Grand Emerald', 'low'],
    ['ruby', 'Pigeon Blood Ruby', 'low'], ['moonstone', 'Pearl Moonstone', 'medium'], ['sunstone', 'Champagne Diamond', 'medium'],
    ['wand', 'Golden Scepter', 'medium'], ['orrery', 'Jewelled Timepiece', 'high'], ['crown', 'Imperial Crown', 'high'],
    ['chalice', 'Royal Chalice', 'high'], ['wild', 'Ruby Crest Wild', 'wild'], ['scatter', 'Treasury Scatter', 'scatter'],
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
  id: 'golden-dynasty', name: 'GOLDEN DYNASTY', theme: '24K gold, imperial jade and mechanical fortune city',
  columns: 5, rows: 3, payMode: 'ways', paylines: [],
  symbols: defs([
    ['jade', 'Jade', 'low'], ['lantern', 'Golden Lantern', 'low'], ['key', 'Clockwork Key', 'low'],
    ['fan', 'Treasure Fan', 'medium'], ['vessel', 'Treasure Vessel', 'medium'], ['guardian', 'Golden Guardian', 'high'],
    ['seal', 'Crown Seal', 'high'], ['wild', 'Clockwork Wild', 'wild'], ['scatter', 'Vault Gate Scatter', 'scatter'],
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
  id: 'neon-classic', name: 'RUBY ROYALE', theme: 'Ruby and rose-gold private classic casino salon',
  columns: 3, rows: 3, payMode: 'paylines', paylines: PAYLINES_5,
  symbols: defs([
    ['cherry', 'Ruby Cherry', 'low'], ['lemon', 'Citrine Lemon', 'low'], ['melon', 'Emerald Melon', 'low'],
    ['bell', 'Golden Bell', 'medium'], ['bar', 'Obsidian BAR', 'medium'], ['double-bar', 'Double Gold BAR', 'high'],
    ['seven', 'Ruby Seven', 'high'], ['wild', 'Diamond Star Wild', 'wild'],
  ]),
  reelStrips: strips(['cherry', 'lemon', 'melon', 'bell', 'bar', 'double-bar', 'seven', 'wild'], 3),
  paytable: {
    cherry: { 3: 3 }, lemon: { 3: 4 }, melon: { 3: 5 }, bell: { 3: 8 }, bar: { 3: 12 },
    'double-bar': { 3: 20 }, seven: { 3: 50 }, wild: { 3: 100 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'wild', feature: 'hold-nudge-double', payoutScale: 1.21, targetRtp: 0.96,
};

export const COSMIC_COINS: GameConfig = {
  id: 'cosmic-coins', name: 'PEARL FORTUNE', theme: 'Mother-of-pearl, jade and champagne-gold jewelry salon',
  columns: 5, rows: 3, payMode: 'paylines', paylines: PAYLINES_20,
  symbols: defs([
    ['crystal', 'Pearl Shell', 'low'], ['drill', 'Jade Pearl Charm', 'low'], ['battery', 'Diamond Tiara', 'low'],
    ['rover', 'Pearl Treasure Chest', 'medium'], ['helmet', 'Royal Pearl Necklace', 'medium'], ['reactor', 'Golden Phoenix Brooch', 'high'],
    ['core', 'Imperial Black Pearl', 'high'], ['wild', 'Pearl Crown Wild', 'wild'], ['scatter', 'Pearl Vault Scatter', 'scatter'], ['bonus', 'Fortune Pearl Coin', 'bonus'],
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
