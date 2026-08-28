# S02 Master Template Guide

## Architecture

`assets/scripts/SlotGame.ts` owns the demo state machine, runtime interface composition, cluster detection, cascades, multiplier state, overlays and effects. Image and audio resources live under `assets/resources/fantasy/`.

## Safe reskin workflow

1. Keep the 6×5 board and all button hit areas unchanged.
2. Replace images under the same resource keys, or update the `FRAMES` map.
3. Preserve transparent padding around symbol artwork so adjacent clusters remain readable.
4. Keep the rules page in English unless a complete localization pass is made.
5. Verify loading, rules, recharge, one-cascade and multi-cascade outcomes at 750×1334 before release.
6. Also verify 390×844 portrait and 1440×900 landscape/desktop layouts; the camera clear color should remain deep indigo rather than black.

## Math integration

The included random generator deliberately produces showcase wins so the visual pipeline can be reviewed. A production game must supply audited outcomes from its math/RNG service and treat the client as presentation-only.
