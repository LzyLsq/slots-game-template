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
  name: 'KEMET PHARAOH',
  theme: 'Dusk-lit pharaoh temple with lapis reels and gilded scarab fortune',
  columns: 5,
  rows: 3,
  payMode: 'paylines',
  paylines: PAYLINES_20,
  symbols: defs([
    ['sapphire', 'Temple Sapphire', 'low'], ['ruby', 'Ruby of Ra', 'low'], ['emerald', 'Emerald Tablet', 'low'], ['amethyst', 'Amethyst Crystal', 'low'],
    ['sun', 'Solar Disc', 'medium'], ['crown', 'Pharaoh Crown', 'medium'],
    ['ankh', 'Gilded Ankh', 'high'], ['eye', 'Eye of Horus', 'high'], ['scarab', 'Jeweled Scarab', 'high'], ['necklace', 'Pharaoh Collar', 'high'],
    ['wild', 'Pyramid Wild', 'wild'], ['gate', 'Temple Gate', 'scatter'],
  ]),
  reelStrips: strips(['sapphire', 'ruby', 'emerald', 'amethyst', 'sun', 'crown', 'ankh', 'eye', 'scarab', 'necklace', 'wild', 'gate'], 5),
  paytable: {
    sapphire: { 3: 2, 4: 6, 5: 14 }, ruby: { 3: 2, 4: 6, 5: 15 }, emerald: { 3: 3, 4: 9, 5: 20 }, amethyst: { 3: 3, 4: 10, 5: 24 },
    sun: { 3: 4, 4: 14, 5: 36 }, crown: { 3: 5, 4: 16, 5: 44 },
    ankh: { 3: 7, 4: 24, 5: 70 }, eye: { 3: 9, 4: 32, 5: 110 }, scarab: { 3: 12, 4: 48, 5: 170 }, necklace: { 3: 16, 4: 60, 5: 240 },
    wild: { 3: 20, 4: 100, 5: 450 }, gate: { 3: 2, 4: 10, 5: 50 },
  },
  bets: [100, 200, 500, 1000, 2000], wildId: 'wild', scatterId: 'gate', scatterAwards: { 3: 8, 4: 12, 5: 18 },
  feature: 'sticky-free-spins', payoutScale: 1.25, targetRtp: 0.96,
};

export const GOLDEN_DYNASTY: GameConfig = {
  id: 'golden-dynasty', name: 'NILE TREASURY', theme: 'River-gold vault of expanding wilds and 243-ways harvest',
  columns: 5, rows: 3, payMode: 'ways', paylines: [],
  symbols: defs([
    ['sapphire', 'Nile Sapphire', 'low'], ['ruby', 'Lotus Ruby', 'low'], ['emerald', 'Papyrus Emerald', 'low'], ['amethyst', 'Delta Amethyst', 'low'],
    ['chalice', 'Goblet of the Nile', 'medium'], ['orrery', 'Star Orrery', 'medium'],
    ['eye', 'Eye of Horus', 'high'], ['scarab', 'Jeweled Scarab', 'high'], ['necklace', 'Pharaoh Collar', 'high'],
    ['wild', 'Pyramid Wild', 'wild'], ['moon', 'Nile Moon', 'scatter'],
  ]),
  reelStrips: strips(['sapphire', 'ruby', 'emerald', 'amethyst', 'chalice', 'orrery', 'eye', 'scarab', 'necklace', 'wild', 'moon'], 5),
  paytable: {
    sapphire: { 3: 1, 4: 3, 5: 9 }, ruby: { 3: 1, 4: 4, 5: 11 }, emerald: { 3: 2, 4: 6, 5: 14 }, amethyst: { 3: 2, 4: 7, 5: 19 },
    chalice: { 3: 3, 4: 11, 5: 30 }, orrery: { 3: 5, 4: 19, 5: 64 },
    eye: { 3: 8, 4: 36, 5: 125 }, scarab: { 3: 10, 4: 46, 5: 155 }, necklace: { 3: 13, 4: 58, 5: 190 },
    wild: { 3: 10, 4: 50, 5: 210 }, moon: { 3: 2, 4: 8, 5: 30 },
  },
  bets: [100, 200, 500, 1000, 2000], wildId: 'wild', scatterId: 'moon', scatterAwards: { 3: 8, 4: 12, 5: 16 },
  feature: 'expanding-wild-free-spins', payoutScale: 4.5, targetRtp: 0.96,
};

export const NEON_CLASSIC: GameConfig = {
  id: 'neon-classic', name: 'SCARAB CLASSIC', theme: 'Three-reel scarab parlor with nudging holds and doubled fortunes',
  columns: 3, rows: 3, payMode: 'paylines', paylines: PAYLINES_5,
  symbols: defs([
    ['amethyst', 'Amethyst Crystal', 'low'], ['sapphire', 'Temple Sapphire', 'low'], ['emerald', 'Emerald Tablet', 'low'],
    ['ruby', 'Ruby of Ra', 'medium'], ['sun', 'Solar Disc', 'medium'], ['crown', 'Pharaoh Crown', 'high'],
    ['scarab', 'Royal Scarab', 'high'], ['wild', 'Pyramid Wild', 'wild'],
  ]),
  reelStrips: strips(['amethyst', 'sapphire', 'emerald', 'ruby', 'sun', 'crown', 'scarab', 'wild'], 3),
  paytable: {
    amethyst: { 3: 3 }, sapphire: { 3: 5 }, emerald: { 3: 8 }, ruby: { 3: 14 },
    sun: { 3: 24 }, crown: { 3: 60 }, scarab: { 3: 120 }, wild: { 3: 200 },
  },
  bets: [50, 100, 200, 500, 1000], wildId: 'wild', feature: 'hold-nudge-double', payoutScale: 0.656, targetRtp: 0.96,
};

export const COSMIC_COINS: GameConfig = {
  id: 'cosmic-coins', name: 'PYRAMID JACKPOT', theme: 'Amethyst night vault with hold-and-spin sun coin prizes',
  columns: 5, rows: 3, payMode: 'paylines', paylines: PAYLINES_20,
  symbols: defs([
    ['sapphire', 'Night Sapphire', 'low'], ['ruby', 'Ember Ruby', 'low'], ['emerald', 'Jade Tablet', 'low'], ['amethyst', 'Vault Amethyst', 'low'],
    ['wand', 'Scepter of Winds', 'medium'], ['chalice', 'Goblet of the Nile', 'medium'],
    ['ankh', 'Gilded Ankh', 'high'], ['eye', 'Eye of Horus', 'high'], ['necklace', 'Pharaoh Collar', 'high'],
    ['wild', 'Pyramid Wild', 'wild'], ['star', 'Star of Ra', 'scatter'], ['suncoin', 'Sun Coin', 'bonus'],
  ]),
  reelStrips: strips(['sapphire', 'ruby', 'emerald', 'amethyst', 'wand', 'chalice', 'ankh', 'eye', 'necklace', 'wild', 'star', 'suncoin', 'suncoin'], 5),
  paytable: {
    sapphire: { 3: 2, 4: 5, 5: 12 }, ruby: { 3: 2, 4: 5, 5: 13 }, emerald: { 3: 3, 4: 8, 5: 18 }, amethyst: { 3: 4, 4: 11, 5: 27 },
    wand: { 3: 5, 4: 15, 5: 42 }, chalice: { 3: 8, 4: 26, 5: 84 },
    ankh: { 3: 10, 4: 36, 5: 125 }, eye: { 3: 12, 4: 46, 5: 165 }, necklace: { 3: 15, 4: 56, 5: 205 },
    wild: { 3: 20, 4: 90, 5: 420 }, star: { 3: 2, 4: 8, 5: 30 },
  },
  bets: [100, 200, 500, 1000, 2000], wildId: 'wild', scatterId: 'star', bonusId: 'suncoin',
  scatterAwards: { 3: 8, 4: 12, 5: 16 }, feature: 'hold-and-spin', payoutScale: 3.65, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [ASTRAL_VAULT, GOLDEN_DYNASTY, NEON_CLASSIC, COSMIC_COINS];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Record<GameConfig['id'], GameConfig>;
