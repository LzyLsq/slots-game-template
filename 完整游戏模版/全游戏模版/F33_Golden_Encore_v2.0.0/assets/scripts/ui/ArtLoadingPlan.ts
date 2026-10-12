import type { ModeId } from '../domain/VaultMath';
import { BLINK_ART } from './BlinkArt';
import { CABINET_CAST_ART, PRIZE_CAST_ART } from './CastArt';
import { MODE_ENTRY_THEMES } from './ModeEntryLoading';
import { PRIMARY_SYMBOL, PRIZE_STAGES, PRIZE_TITLES, REEL_ART } from './ThemeArt';

export const GAME_BACKDROPS = ['game', 'game-pearl', 'game-ember', 'game-vault'] as const;
export const SHARED_CELEBRATION_ART = [
  ...Object.values(PRIZE_TITLES), 'fx-prize-rays', 'fx-prize-firework',
  'fx-prize-aureole', 'fx-prize-jet', 'fx-prize-streamer', 'prize-ingot',
] as const;
const ROOMS = [0, 1, 2, 3] as const;

export function roomCabinetArt(mode: ModeId): readonly string[] {
  return [GAME_BACKDROPS[mode], `fx-cabinet-${mode}`, `hud-inlay-${mode}`, `spin-face-${mode}`,
    `bet-minus-${mode}`, `bet-plus-${mode}`, `utility-home-${mode}`, `utility-auto-${mode}`, `utility-rules-${mode}`];
}
export function roomCelebrationArt(mode: ModeId): readonly string[] {
  return [...SHARED_CELEBRATION_ART, `prize-jewel-${mode}`,
    ...[0, 1, 2, 3].map(part => `prize-ornament-${mode}-${part}`)];
}
/** Preserve every hall switch, service page and reward-claim prerequisite at
 * boot. Only room-owned cabinet/reel/cast/win work waits behind room entry.
 * The rulebook's primary icons and entry emblems are needed BEFORE that work. */
export function startupArt(catalog: readonly string[]): string[] {
  const deferred = new Set<string>(ROOMS.flatMap(mode => [
    ...roomCabinetArt(mode), ...REEL_ART[mode], ...roomCelebrationArt(mode),
    CABINET_CAST_ART[mode], PRIZE_CAST_ART[mode],
    BLINK_ART.cabinet[mode].art, BLINK_ART.prize[mode].art, PRIZE_STAGES[mode].art,
  ]));
  // The hall treasury shares Jade's generated + face (not its bet control).
  deferred.delete('bet-plus-0');
  for (const mode of ROOMS) {
    deferred.delete(REEL_ART[mode][PRIMARY_SYMBOL[mode]]);
    deferred.delete(MODE_ENTRY_THEMES[mode].emblem);
  }
  // Creator's loose spread lowering assumes Arrays; spreading Set would turn
  // the entire manifest into a single "[object Set]" texture request in Web.
  return Array.from(new Set(catalog)).filter(art => !deferred.has(art));
}
