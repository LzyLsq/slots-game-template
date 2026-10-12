/** Shared by the visual stage and the offline music authoring tool. */
export const AWARD_COUNT_SECONDS = [3.1, 4.0, 4.7, 5.3] as const;
export const AWARD_HOLD_SECONDS = 2.5;
export const AWARD_EXIT_SECONDS = .42;
export const AWARD_ENTER_SECONDS = .85;
export const AWARD_COUNT_START = .7;
export const AWARD_MUSIC_CROSSFADE = .16;
export interface AwardAudioEvents {
  reveal: () => void;
  exit: (seconds: number) => void;
}
