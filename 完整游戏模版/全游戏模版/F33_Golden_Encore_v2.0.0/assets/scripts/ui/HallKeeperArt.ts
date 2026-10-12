/** Source-integrated generated arm/sleeve with continuous two-joint articulation.
 * Fixed shoulder; forearm leads and a small rigid-palm gesture follows.
 * A CC Switch underlay clears the original arm footprint (no pose dissolves).
 * Cached opaque patches stay registered; face, torso and room remain fixed. */
export const HALL_KEEPER_ART = ['hall-otter-paw-motion', 'hall-rabbit-paw-motion', 'hall-fox-paw-motion', 'hall-dragon-paw-motion'] as const;
export const HALL_KEEPER_ATLAS = { columns: 8, rows: 8, width: 224, height: 224, gutter: 2, frames: 64 } as const;
export const HALL_KEEPER_PATCHES: readonly (readonly [number, number, number, number])[] = [[510, 550, 224, 224], [525, 565, 224, 224], [540, 560, 224, 224], [430, 550, 224, 224]];
