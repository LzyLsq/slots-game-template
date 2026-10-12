/** Hall controls own a stable deck, not the cover-scaled background floor.
 * Near-square windows cover the 1024x1536 scene by width; registering the mode
 * names at source y1100 then pushes them into the fixed daily-gift buttons.
 * Keep the miniatures near the floor on portrait phones, but reserve the entire
 * lower panel for its two distinct rows on wider/shorter views. */
export const HALL_LOWER_DECK = {
  width: 950, height: 296, y: -710,
  modeMinY: -438, modeXs: [-348, -116, 116, 348],
  modeHitWidth: 210, modeHitHeight: 213,
  modeLabelY: -69, modeLabelHeight: 46,
  utilityXs: [-226, 226], utilityY: 80,
  utilityWidth: 432, utilityHeight: 110,
  navigationY: -58, navigationWidth: 222, navigationHeight: 146,
  navigationIconY: 35, navigationIconHeight: 82, navigationFloatLift: 5,
  navigationLabelY: -36, navigationLabelWidth: 205,
} as const;
export function hallModeRowY(backdropScale: number): number {
  const scale = Number.isFinite(backdropScale) && backdropScale > 0 ? backdropScale : 1;
  return Math.max(HALL_LOWER_DECK.modeMinY, (768 - 1100) * scale);
}
