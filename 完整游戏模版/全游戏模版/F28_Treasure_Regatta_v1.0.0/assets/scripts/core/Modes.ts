import type { Mode, ModeId, SymbolDefinition } from './Model';

const symbol = (id: string, name: string, weight: number, pays: Record<number, number>): SymbolDefinition => ({ id, name, weight, pays });
export const MODES: Readonly<Record<ModeId, Mode>> = {
  captain: {
    id: 'captain', title: "Captain's Cache", columns: 3, rows: 3, mechanic: 'line', lines: [[1, 1, 1]],
    symbols: [
      symbol('captain-chest', 'Captain chest', 5, { 2: 1, 3: 80 }),
      symbol('captain-crown', 'Compass crown', 8, { 2: 1, 3: 54 }),
      symbol('captain-compass', 'Golden compass', 12, { 2: .5, 3: 32 }),
      symbol('captain-bell', 'Ship bell', 18, { 2: .5, 3: 22 }),
      symbol('captain-wheel', 'Captain wheel', 25, { 2: .5, 3: 16 }),
      symbol('captain-anchor', 'Gold anchor', 32, { 2: .5, 3: 11 }),
    ],
    rules: ['Only the middle horizontal line pays.', 'Match two or three identical symbols consecutively from the left. Only the longest match pays.', 'Award = total bet × the listed multiplier. Other rows do not pay.'],
  },
  pearl: {
    id: 'pearl', title: 'Pearl Passage', columns: 5, rows: 3, mechanic: 'ways', lines: [],
    symbols: [
      symbol('pearl-oyster', 'Royal oyster', 6, { 3: 1.04, 4: 2.6, 5: 7.8 }),
      symbol('pearl-necklace', 'Pearl tiara', 10, { 3: .65, 4: 1.95, 5: 5.2 }),
      symbol('pearl-brooch', 'Pearl chalice', 14, { 3: .39, 4: 1.04, 5: 2.6 }),
      symbol('pearl-conch', 'Pearl starfish', 20, { 3: .26, 4: .65, 5: 1.95 }),
      symbol('pearl-scallop', 'Pink conch', 24, { 3: .13, 4: .39, 5: 1.3 }),
      symbol('pearl-star', 'Pearl ring', 26, { 3: .13, 4: .26, 5: .65 }),
    ],
    rules: ['243 possible ways; there are no fixed paylines.', 'Match a symbol on at least three consecutive columns, starting on the left.', 'Ways = the product of matching symbol counts in each consecutive column.', 'Award = total bet × listed multiplier × winning ways. Only the longest consecutive match pays for each symbol.'],
  },
  cargo: {
    id: 'cargo', title: 'Jewel Cargo', columns: 5, rows: 3, mechanic: 'hold',
    lines: [[0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2]],
    symbols: [
      symbol('cargo-coin', 'Cargo coin', 15, {}),
      symbol('cargo-emerald', 'Emerald crate', 10, { 3: 18, 4: 45, 5: 180 }),
      symbol('cargo-ruby', 'Sapphire goblet', 15, { 3: 14.4, 4: 36, 5: 108 }),
      symbol('cargo-sapphire', 'Ruby padlock', 18, { 3: 10.8, 4: 27, 5: 72 }),
      symbol('cargo-key', 'Jewel pouch', 20, { 3: 7.2, 4: 18, 5: 54 }),
      symbol('cargo-seal', 'Jade ingot', 22, { 3: 5.4, 4: 14.4, 5: 36 }),
    ],
    rules: ['Five fixed lines. Match at least three from the left; the longest match on each line pays.', 'Each line receives one fifth of the total bet.', 'Six or more Cargo coins anywhere trigger three free hold-and-respin attempts.', 'Coins lock in place; each new coin resets remaining attempts to three. A full board ends the feature.', 'Each locked coin is worth 1–5 × total bet and pays once at feature end. No additional bet is deducted.'],
  },
  reef: {
    id: 'reef', title: 'Reef Riches', columns: 5, rows: 5, mechanic: 'cluster', lines: [],
    symbols: [
      symbol('reef-turtle', 'Sapphire gem', 8, { 5: 8, 7: 16, 10: 32, 15: 80 }),
      symbol('reef-coral', 'Ruby heart', 12, { 5: 6, 7: 12, 10: 24, 15: 60 }),
      symbol('reef-seahorse', 'Jewel seahorse', 16, { 5: 4, 7: 8, 10: 20, 15: 48 }),
      symbol('reef-fish', 'Turquoise shell', 20, { 5: 2, 7: 4, 10: 12, 15: 32 }),
      symbol('reef-shell', 'Sun medallion', 22, { 5: 1.2, 7: 3.2, 10: 8, 15: 24 }),
      symbol('reef-pebble', 'Nautilus', 22, { 5: .8, 7: 2, 10: 6, 15: 16 }),
    ],
    rules: ['Five or more identical symbols connected horizontally or vertically form a paying cluster. Diagonals do not connect.', 'Every paying cluster is removed; remaining symbols fall and new symbols enter from above.', 'Cascade multipliers are ×1, ×2, ×3, then ×4 for all later cascades.', 'Up to eight paying stages per spin. The eighth stage is the final evaluated stage.', 'Award = total bet × size-tier multiplier × cascade multiplier. Separate clusters pay separately.'],
  },
};

export function modeRules(id: ModeId): string[] {
  return [...MODES[id].rules, 'Each award is rounded to the nearest whole virtual coin; half a coin rounds up.', 'All prizes use virtual coins with no cash value or cash-out.', 'Total win is capped at 5,000 × total bet, including features.'];
}
