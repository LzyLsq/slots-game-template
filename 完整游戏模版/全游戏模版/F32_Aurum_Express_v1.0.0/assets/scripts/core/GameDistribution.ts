import type { GameId } from '../math/types';

/** null is the four-game collection. The standalone preparation tool replaces
 * this literal in an isolated project copy; it never changes this source tree. */
export const STANDALONE_GAME_ID: GameId | null = null;
