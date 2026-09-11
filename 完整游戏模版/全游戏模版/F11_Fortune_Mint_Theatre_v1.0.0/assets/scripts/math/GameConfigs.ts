import type { GameConfig, SymbolDefinition } from './types';

const STRIP_STEPS = [1, 5, 7, 11, 13] as const;
const permute = (source: readonly string[], reel: number): readonly string[] => {
  const step = STRIP_STEPS[reel % STRIP_STEPS.length];
  return source.map((_, index) => source[(index * step + reel * 3) % source.length]);
};
const strips = (source: readonly string[], count: number): readonly (readonly string[])[] =>
  Array.from({ length: count }, (_, index) => permute(source, index));
const defs = (entries: readonly [string, string, SymbolDefinition['tier']][]): readonly SymbolDefinition[] =>
  entries.map(([id, label, tier]) => ({ id, label, tier }));
const BETS = [50, 100, 200, 500, 1000] as const;

/** Four embossed tiles form a mint stamp. Adjacent stamps may overlap. */
export const MINT_MOSAIC: GameConfig = {
  id: 'mint-mosaic', name: 'MINT MOSAIC', theme: 'A sunlit artisan mint where matching coin dies lock into engraved 2×2 stamps',
  columns: 4, rows: 4, payMode: 'stamp', modeLabel: '2×2 STAMP PAYS + OVERSTAMP', paylines: [],
  symbols: defs([
    ['copper-rosette', 'Copper Rosette', 'low'], ['enamel-ribbon', 'Enamel Ribbon', 'low'], ['pearl-button', 'Pearl Button', 'low'],
    ['mint-hammer', 'Mint Hammer', 'medium'], ['coin-die', 'Engraved Coin Die', 'medium'], ['velvet-purse', 'Velvet Purse', 'high'],
    ['master-medal', 'Master Medal', 'high'], ['press-wild', 'Press Wild', 'wild'], ['overstamp-seal', 'Overstamp Seal', 'scatter'],
  ]),
  reelStrips: strips(['copper-rosette', 'enamel-ribbon', 'pearl-button', 'copper-rosette', 'mint-hammer', 'enamel-ribbon', 'coin-die', 'pearl-button', 'copper-rosette', 'velvet-purse', 'enamel-ribbon', 'master-medal', 'pearl-button', 'press-wild', 'copper-rosette', 'mint-hammer', 'overstamp-seal', 'enamel-ribbon', 'coin-die', 'pearl-button', 'copper-rosette', 'velvet-purse', 'enamel-ribbon', 'pearl-button'], 4),
  paytable: {
    'copper-rosette': { 4: 0.55 }, 'enamel-ribbon': { 4: 0.7 }, 'pearl-button': { 4: 0.9 }, 'mint-hammer': { 4: 1.3 },
    'coin-die': { 4: 1.8 }, 'velvet-purse': { 4: 2.8 }, 'master-medal': { 4: 5.5 }, 'press-wild': { 4: 8 }, 'overstamp-seal': { 3: 1, 4: 3 },
  },
  bets: BETS, wildId: 'press-wild', scatterId: 'overstamp-seal', scatterAwards: { 3: 1, 4: 3 },
  feature: 'overstamp', volatility: 'medium-high', maxWinMultiplier: 6000, payoutScale: 0.72, targetRtp: 0.96,
};

/** Paths bend one row at a time and can begin at either side of the stage. */
export const RIBBON_ROUTES: GameConfig = {
  id: 'ribbon-routes', name: 'RIBBON ROUTES', theme: 'A celebratory ribbon theatre where matching emblems travel along luminous bidirectional routes',
  columns: 5, rows: 4, payMode: 'routes', modeLabel: 'TWO-WAY ROUTE PAYS + ENCORE', paylines: [], routeDivisor: 64,
  symbols: defs([
    ['coral-token', 'Coral Token', 'low'], ['aqua-token', 'Aqua Token', 'low'], ['ivory-token', 'Ivory Token', 'low'],
    ['silk-fanfare', 'Silk Fanfare', 'medium'], ['golden-baton', 'Golden Baton', 'medium'], ['jewel-mask', 'Jewel Mask', 'high'],
    ['maestro-chest', 'Maestro Chest', 'high'], ['route-wild', 'Route Wild', 'wild'], ['encore-ticket', 'Encore Ticket', 'scatter'],
  ]),
  reelStrips: strips(['coral-token', 'aqua-token', 'ivory-token', 'coral-token', 'silk-fanfare', 'aqua-token', 'golden-baton', 'ivory-token', 'coral-token', 'jewel-mask', 'aqua-token', 'maestro-chest', 'ivory-token', 'route-wild', 'coral-token', 'silk-fanfare', 'encore-ticket', 'aqua-token', 'golden-baton', 'ivory-token', 'coral-token', 'jewel-mask', 'aqua-token', 'ivory-token'], 5),
  paytable: {
    'coral-token': { 3: 1, 4: 2, 5: 5 }, 'aqua-token': { 3: 1.1, 4: 2.4, 5: 6 }, 'ivory-token': { 3: 1.25, 4: 2.8, 5: 7 },
    'silk-fanfare': { 3: 1.8, 4: 4, 5: 11 }, 'golden-baton': { 3: 2.5, 4: 6, 5: 18 }, 'jewel-mask': { 3: 4, 4: 11, 5: 36 },
    'maestro-chest': { 3: 6, 4: 18, 5: 70 }, 'route-wild': { 3: 8, 4: 28, 5: 120 }, 'encore-ticket': { 3: 2, 4: 6, 5: 18 },
  },
  bets: BETS, wildId: 'route-wild', scatterId: 'encore-ticket', scatterAwards: { 3: 2, 4: 6, 5: 18 },
  feature: 'route-encore', volatility: 'medium', maxWinMultiplier: 7500, payoutScale: 0.84, targetRtp: 0.96,
};

/** Coin emblems are collected anywhere; the lift converts quantity and quality into one award. */
export const VAULT_ELEVATOR: GameConfig = {
  id: 'vault-elevator', name: 'VAULT ELEVATOR', theme: 'A glass treasury lift that gathers minted denominations and climbs through four reward floors',
  columns: 5, rows: 5, payMode: 'collect', modeLabel: 'ANYWHERE COIN COLLECT + VAULT LIFT', paylines: [],
  symbols: defs([
    ['copper-coin', 'Copper Coin', 'low'], ['silver-coin', 'Silver Coin', 'low'], ['gold-coin', 'Gold Coin', 'medium'],
    ['platinum-coin', 'Platinum Coin', 'high'], ['vault-key', 'Vault Key', 'medium'], ['reserve-bond', 'Reserve Bond', 'medium'],
    ['diamond-case', 'Diamond Case', 'high'], ['lift-wild', 'Lift Wild', 'wild'], ['floor-pass', 'Floor Pass', 'bonus'],
  ]),
  reelStrips: strips(['copper-coin', 'silver-coin', 'vault-key', 'copper-coin', 'gold-coin', 'reserve-bond', 'silver-coin', 'copper-coin', 'floor-pass', 'gold-coin', 'vault-key', 'platinum-coin', 'silver-coin', 'lift-wild', 'copper-coin', 'diamond-case', 'silver-coin', 'reserve-bond', 'gold-coin', 'copper-coin', 'floor-pass', 'vault-key', 'silver-coin', 'gold-coin'], 5),
  paytable: {
    'copper-coin': { 3: 0.3, 5: 0.8, 8: 2, 12: 6 }, 'silver-coin': { 3: 0.5, 5: 1.2, 8: 3, 12: 9 },
    'gold-coin': { 3: 0.8, 5: 2, 8: 5, 12: 15 }, 'platinum-coin': { 3: 1.4, 5: 3.5, 8: 9, 12: 28 }, 'floor-pass': { 3: 1, 5: 4, 8: 12 },
  },
  bets: BETS, wildId: 'lift-wild', bonusId: 'floor-pass', collectIds: ['copper-coin', 'silver-coin', 'gold-coin', 'platinum-coin'],
  feature: 'vault-lift', volatility: 'high', maxWinMultiplier: 10000, payoutScale: 0.68, targetRtp: 0.96,
};

/** The outer eight positions form a circular reel whose streaks wrap at the seam. */
export const FORTUNE_ORBIT: GameConfig = {
  id: 'fortune-orbit', name: 'FORTUNE ORBIT', theme: 'A compact kinetic coin clock where the outer ring pays wrapped streaks around a multiplier centre',
  columns: 3, rows: 3, payMode: 'orbit', modeLabel: 'WRAPAROUND ORBIT STREAKS + PRIZE DIAL', paylines: [],
  symbols: defs([
    ['sun-coin', 'Sun Coin', 'low'], ['rose-coin', 'Rose Coin', 'low'], ['teal-coin', 'Teal Coin', 'low'],
    ['clockwork-bell', 'Clockwork Bell', 'medium'], ['fortune-hand', 'Fortune Hand', 'medium'], ['gilded-seven', 'Gilded Seven', 'high'],
    ['orbit-crown', 'Orbit Crown', 'high'], ['axis-wild', 'Axis Wild', 'wild'], ['dial-key', 'Prize Dial Key', 'scatter'],
  ]),
  reelStrips: strips(['sun-coin', 'rose-coin', 'teal-coin', 'sun-coin', 'clockwork-bell', 'rose-coin', 'fortune-hand', 'teal-coin', 'sun-coin', 'gilded-seven', 'rose-coin', 'orbit-crown', 'teal-coin', 'axis-wild', 'sun-coin', 'clockwork-bell', 'dial-key', 'rose-coin', 'fortune-hand', 'teal-coin', 'sun-coin', 'gilded-seven', 'rose-coin', 'teal-coin'], 3),
  paytable: {
    'sun-coin': { 3: 1, 4: 2, 5: 4, 6: 8, 7: 14, 8: 24 }, 'rose-coin': { 3: 1.2, 4: 2.4, 5: 5, 6: 10, 7: 18, 8: 30 },
    'teal-coin': { 3: 1.4, 4: 3, 5: 6, 6: 12, 7: 22, 8: 38 }, 'clockwork-bell': { 3: 2, 4: 4, 5: 9, 6: 18, 7: 32, 8: 55 },
    'fortune-hand': { 3: 3, 4: 7, 5: 15, 6: 30, 7: 55, 8: 90 }, 'gilded-seven': { 3: 5, 4: 12, 5: 28, 6: 55, 7: 95, 8: 160 },
    'orbit-crown': { 3: 8, 4: 20, 5: 45, 6: 90, 7: 160, 8: 260 }, 'axis-wild': { 3: 10, 4: 28, 5: 65, 6: 130, 7: 230, 8: 380 }, 'dial-key': { 3: 2 },
  },
  bets: BETS, wildId: 'axis-wild', scatterId: 'dial-key', scatterAwards: { 3: 2 },
  feature: 'orbit-wheel', volatility: 'medium-high', maxWinMultiplier: 5000, payoutScale: 0.76, targetRtp: 0.96,
};

export const GAME_CONFIGS: readonly GameConfig[] = [MINT_MOSAIC, RIBBON_ROUTES, VAULT_ELEVATOR, FORTUNE_ORBIT];
export const GAME_CONFIG_BY_ID = Object.fromEntries(GAME_CONFIGS.map((config) => [config.id, config])) as Record<GameConfig['id'], GameConfig>;
