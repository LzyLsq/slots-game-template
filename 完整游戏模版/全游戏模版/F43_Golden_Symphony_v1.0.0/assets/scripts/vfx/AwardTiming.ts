/** Shared by the visual stage and the offline music authoring tool. */
export const AWARD_COUNT_SECONDS = [3.1, 4.0, 4.7, 5.3] as const;
// Audible brass attacks and cabinet light crests share these reveal offsets.
export const AWARD_REVEAL_IMPACTS = [.20, 1.05, 1.90] as const;
export const AWARD_HOLD_SECONDS = 3.1;
export const AWARD_EXIT_SECONDS = .64;
export const AWARD_ENTER_SECONDS = .85;
export const AWARD_COUNT_START = .7;
export const AWARD_MUSIC_CROSSFADE = .16;
export interface AwardAudioEvents {
  reveal: () => void;
  exit: (seconds: number) => void;
  accent?: (tier: number) => void;
}
