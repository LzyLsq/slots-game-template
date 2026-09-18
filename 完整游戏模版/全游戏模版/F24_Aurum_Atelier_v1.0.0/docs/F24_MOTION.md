# F24 Atelier motion pass

Presentation-only changes in `assets/scripts/reels/ReelMotion.ts`, `SalonReels.ts` and `assets/scripts/vfx/SalonWinStage.ts`.

## Four material signatures

| Mode ID | Stop / award | Idle / local accent |
|---|---|---|
| golden-hour | Firm press, shallow rebound, column-first stamp timing | Almost seated metal; open die-edge impression on a true award |
| jade-treasury | Short facet lift, tighter column spacing | Restrained facet pivot; three diagonal specular lines |
| pearl-palace | Alternating short lateral settle; diagonal award cadence | Small pendulum motion; paired gold loops |
| ruby-revel | Slower brake, small heavy settle | Seated vault pieces; eight engraved dial ticks |

Names/IDs remain connected to the game's existing math configs. The accent geometry is decorative and does not create paylines or award positions. Root-owned artwork can replace the existing atlas slots directly: motion requires no extra texture or re-indexing.

## Retained correctness and legibility

- Reel travel/brake functions and all result/cascade mappings remain unchanged.
- Actual selected positions still use the v12 CoreReelGuide, including permanent boundaries and the dim layer below locked amounts.
- A symbol tap produces two small glints, without the true-award die/facet/link/dial accent.
- A new locked amount stays fixed. Only its art child settles from 94% width / 91% height to 100%, without overshoot.
- Award envelopes return to exact rest at 700 ms and blend with the underlying landing/idle pose.
- Reduced motion cancels a running award response. Layout, totals and selection remain visible.
- The big-win presentation has an engraved assay seal, a restrained prize reveal, stationary amount/title, and fewer particles. It preserves settlement-before-entry, tap-to-reveal, double-tap protection and the full-amount hold.

## Performance choices

The four pose functions reuse a single pose object. The new effects use pooled geometry, drawn once at setup. Six motes replace twelve; one inspection glint moves between cells instead of a broad shimmer on every column. Existing particle pools remain bounded. These are allocation/render-work reductions, not a claim about measured iPhone FPS.

## Validation

- `npm run typecheck`: passed.
- Actual TypeScript helpers and `awardCell` / `prepareAward` evaluated in Node at 120/60/30 Hz and uneven timesteps: passed.
- Landing and idle sampled across six columns, seven rows and 1,001 phases for each theme, including rotated sprite bounds: all stay inside their cell.
- Maximum half-cell extent including award movement: 0.48311 (boundary 0.5).
- Award joins have effectively zero velocity; no selected cell repeats its spark emission and no unselected cell receives award motion.
- Reduced-motion interruption, transition suppression, exact landing endpoints and brake endpoints: passed.
- QA script/report: workspace `work/f24-motion/check.cjs` and `work/f24-motion/results.json`.

Browser screenshots, artwork integration and real-device motion verification are still part of the parent integration pass. No build was run concurrently with that work.
