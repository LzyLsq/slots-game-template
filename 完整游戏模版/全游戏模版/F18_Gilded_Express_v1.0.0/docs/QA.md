# F18 validation

## Completed checks

- Cocos Creator 3.8.8 Web Mobile build and TypeScript checks.
- Four thousand deterministic math-test spins with settlement invariants; Apple identity-token verification; real saved-ranking persistence and ordering.
- 32 cabinet / viewport combinations: 320×568, 360×640, 375×667, 390×844, 430×932, 412×915, 768×1024 and 820×1180. Shared-transform checks cover edge fill, essential control bounds, safe toolbar/footer and symbol breathing room.
- Original theme atlases: every 256px cell has at least 20px clear padding. All 64 theme atlas cells were checked after contour extraction.
- All four debug-forced BIG presentations use the matching theme, show the settled award, dismiss correctly and do not credit twice. Debug forcing is restricted to local review.
- Actual 320×568 and 390×844 login, registration, lobby, shop, rewards, ranking and profile screenshots, plus the four cabinet screenshots. First visual review identified login artwork occlusion and stretched cabinet margins: the form was moved to a lower boarding ticket with newly composed character art and cabinet environments were naturally outpainted.

## Boundaries

Screenshots and browser tests are Web Mobile checks, not native iPhone certification. Production backend deployment, real Apple credentials, StoreKit configuration, signing, hosted legal pages and Apple Sandbox/TestFlight checks remain publisher work. The preview does not fake purchases or online opponents. No App Store approval is claimed.

## Final browser interaction results

- Clicked all four destination BOARD buttons and verified loading overlays, matching game IDs, bet increase/decrease, rules, sound toggles and return navigation.
- Check-in adds exactly 2,000 on day 1; repeated claim does not add again. Separate daily purse adds exactly 5,000 once. Portrait selection dialog, ledger, logout, login (2 fields) and registration (4 fields) are functional.
- Native DOM inputs remain readable, passwords concealed, and text retained across keyboard/viewport changes.
- Measured idle movement on all six non-game page types: 31–53 changing artwork sprites per sampled page, with text and hit regions anchored.
- All four ordinary award presentations were inspected at 320×568 and leave the wallet unchanged when invoked as presentation fixtures. They clean up after completion.
- Loading progress sampled as a monotonic sequence from 0 to 100, reaching 100 before the overlay disappears.
- Final visual corrections: small-screen brand fitting, single-line cabinet balances and a unified readable TOP WIN label. Actual tablet cabinet screenshot at 768×1024 supplements the geometric matrix.

Evidence: `docs/screenshots/` contains current runtime screenshots and JSON reports. Forced win screenshots are local review fixtures, not advertised payout-frequency examples.

## F18-specific controls and responsive corrections

- Four shop bundle selectors update the selected amount. The Cherry Lantern physical lever dispatches exactly one spin action.
- Check-in day 1 credits 2,000 exactly once, retains the claimed day, correctly wraps day 7 and starts the next cycle. Day and amount labels sit outside decorative seal rims.
- Crown-safe cabinet fitting preserves mascots on tablet aspect ratios.
- Four contour-extracted cabinet title PNGs replace text-only titles, fit inside plaque bounds and animate independently of reel placement. Button caption overflow uses single-line shrink; balance, WIN and TOP WIN readouts shrink inside fixed containers. Values of one million or more use M/B notation; the ledger retains exact amounts.
- Theme button sheen, enamel glints and mild scale breathing use separate transforms from fixed input targets; pressing does not cancel idle effects. Console reflections follow actual asymmetric controls rather than a shared rectangular overlay.

- Final cabinet motion sampling: 164 / 174 / 180 / 179 animated artwork sprites across the four themes; all four titles are raster sprites with changing transforms, and all fixed bet-increase targets respond during animation. Nine-digit-value display fixtures were inspected at 320×568.
- Service headings use a narrower 730-unit safe text region after small-screen visual review, clearing the painted side lanterns. Low-contrast implementation notes were removed from the shop and honours footers.

## Railway world revision

- Welcome screen now opens a separate sign-in boarding pass; native keyboard/input retention checks exercise the actual Open sign-in control.
- Hall is a single continuous outpainted railway scene. Station nameplates, hit areas and stationary material effects share the same coordinate plane; discarded poster cards were removed.
- AUTO status no longer scales. Readouts and button captions use inset bounds that exclude decorative metal ends. The Cherry cabinet has aligned two-row readouts and separately spaced controls.
- AUTO ON and large-value fixtures are audited against actual rendered font measurements, in addition to screenshots.

- Removed the moving miniature train after visual review. Replacement effects are grounded in the painted scene: stationary chimney steam, headlamp breathing and rail-edge glints. The loading-screen locomotive remains part of its separate progress animation.
- Cherry bet controls now share one physical tuner housing: minus / centred BET / plus. The AUTO readout is static and inset.

- Four station regions now float with staggered 12–14.4 second periods and ±8 world-unit amplitude. A feathered background shader moves the painted destinations with their caption/input groups. Screenshot matching measured 2–3 pixel changes in the painted regions, consistent with their input-anchor direction. Four entry click flows pass with floating enabled.
- Hall lighting revision: stronger warm specular sweep limited to gold-colored pixels within the four destination regions, slightly modulated shadow levels, stronger rail reflections and locomotive headlamp breathing. Mobile shader/render checks pass; caption rendering remains separate from surface lighting.

- Entry clarity revision: removed synthetic rail-edge line reflections. Destination amplitude increased to ±22 world units while preserving 12–14.4 second periods. Each station now has an illustrated PLAY button attached to the same floating anchor. All four primary PLAY buttons complete the entry/loading/bet/return flow; mobile screenshots reviewed.
- Float pacing adjustment: one cycle now takes 22–25.6 seconds per destination, retaining the existing amplitude and synchronized click targets.

- Final float pacing: slowed further to 32–35.6 seconds per cycle; amplitude and synchronized artwork, labels and input targets are unchanged.

- Final visual correction: removed destination UV deformation and anchor floating after the scene looked wind-blown. Architecture, captions and hit areas now remain stationary; gold-selective lighting, chimney steam and headlamp breathing remain active. This supersedes the float pacing entries above.

- Strengthened the stationary gold sheen from 0.28 to 0.42 with a softer, wider highlight band. Text stays outside the lighting shader.

- Hall brand alone uses a larger 18-unit lift with a 12.9-second eased cycle; station architecture stays fixed.
