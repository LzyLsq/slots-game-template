/** Transparent new-player welcome rule shared by client and authoritative servers. */
export const INTRO_JACKPOT_SPIN_LIMIT = 3;
export const INTRO_JACKPOT_MULTIPLIER = 10;

export const isIntroJackpot = (win: number, bet: number): boolean =>
  Number.isSafeInteger(win) && Number.isSafeInteger(bet) && bet > 0 && win >= bet * INTRO_JACKPOT_MULTIPLIER;

/** Force only the final eligible spin; natural BIG wins on spins one or two satisfy the promise. */
export const shouldForceIntroJackpot = (settledSpins: number, alreadyAwarded: boolean): boolean =>
  Number.isSafeInteger(settledSpins) && settledSpins === INTRO_JACKPOT_SPIN_LIMIT - 1 && !alreadyAwarded;
