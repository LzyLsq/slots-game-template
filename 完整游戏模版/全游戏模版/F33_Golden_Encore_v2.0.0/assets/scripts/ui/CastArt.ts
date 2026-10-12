import type { KeeperCue } from './KeeperGesture';
/** Each area has its own generated cast, not the same costume under a new name.
 * Hall hosts stay scene-integrated; these are cabinet assistants / prize heralds.
 * All action banks close on exactly the same neutral pixels. */
export const CABINET_CAST_ART = ['cabinet-otter-roles-motion', 'cabinet-rabbit-roles-motion', 'cabinet-fox-roles-motion', 'cabinet-dragon-roles-motion'] as const;
export const PRIZE_CAST_ART = ['prize-otter-roles-motion', 'prize-rabbit-roles-motion', 'prize-fox-roles-motion', 'prize-dragon-roles-motion'] as const;
export const CAST_ATLAS = { columns: 8, width: 160, height: 200, gutter: 2, bankFrames: 48, fps: 30, footY: 190 } as const;
export function castBank(scene: string, cue: KeeperCue): number {
  if (scene === 'cabinet') return cue === 'spin' || cue === 'big' || cue === 'super' ? 1 : 0;
  if (scene === 'prize') return cue === 'super' ? 2 : cue === 'big' ? 1 : 0;
  return 0;
}
export function castFrameCount(scene: string): number { return (scene === 'prize' ? 3 : 2) * CAST_ATLAS.bankFrames; }
