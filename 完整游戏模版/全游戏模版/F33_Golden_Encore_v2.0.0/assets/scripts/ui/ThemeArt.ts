import type { ModeId } from '../domain/VaultMath';
import type { ClearRect, Fixture } from './KeeperClearance';
/** Logical IDs are stable; only the current room's generated artwork changes.
 * Never recolor/relabel a shared sprite as a substitute for a separate set. */
export const REEL_ART = [
  ['reel-jade-lantern', 'reel-jade-koi', 'reel-jade-wheel', 'reel-jade-ingot', 'reel-jade-chest', 'reel-jade-otter'],
  ['reel-pearl-bell', 'reel-pearl-fan', 'reel-pearl-lotus', 'reel-pearl-purse', 'reel-pearl-box', 'reel-pearl-rabbit'],
  ['reel-ember-lamp', 'reel-ember-key', 'reel-ember-hammer', 'reel-ember-ingots', 'reel-ember-safe', 'reel-ember-fox'],
  ['reel-vault-lantern', 'reel-vault-compass', 'reel-vault-orb', 'reel-vault-ingot', 'reel-vault-chest', 'reel-vault-dragon'],
] as const;
export const PRIMARY_SYMBOL = [0, 2, 3, 5] as const;
export type PrizeStage = {
  art: string; keeper: 'otter' | 'rabbit' | 'fox' | 'dragon'; rects: readonly ClearRect[];
  title: Fixture; amount: Fixture; caption: Fixture; claimY: number; vessel: readonly [number, number];
};
/** Source pixels of the WHOLE generated scene. Stage is selected by room,
 * never by prize tier. All live copy is attached to its source artwork. */
export const PRIZE_STAGES: readonly PrizeStage[] = [
  { art: 'win-big', keeper: 'otter', rects: [[170, 948, 474, 1318]],
    title: [512, 671, 450, 82], amount: [512, 781, 460, 48], caption: [512, 731, 410, 22], claimY: 1410, vessel: [544, 1058] },
  { art: 'win-ordinary', keeper: 'rabbit', rects: [[578, 580, 854, 1004]],
    title: [512, 450, 408, 76], amount: [512, 550, 410, 38], caption: [512, 508, 370, 18], claimY: 1374, vessel: [482, 848] },
  { art: 'win-ember', keeper: 'fox', rects: [[584, 580, 854, 1102]],
    title: [512, 450, 408, 76], amount: [512, 550, 410, 38], caption: [512, 508, 370, 18], claimY: 1374, vessel: [482, 848] },
  { art: 'win-super', keeper: 'dragon', rects: [[578, 676, 854, 1032], [268, 44, 756, 394], [130, 446, 343, 664], [720, 446, 931, 664]],
    title: [512, 455, 294, 78], amount: [512, 603, 290, 56], caption: [512, 532, 280, 48], claimY: 1388, vessel: [510, 1065] },
];
export const PRIZE_TITLES = { ordinary: 'prize-title-win', big: 'prize-title-big', super: 'prize-title-super' } as const;
export function reelArt(mode: ModeId, symbol: number): string { return REEL_ART[mode][symbol]; }
