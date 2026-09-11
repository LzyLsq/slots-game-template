# F17 validation

## Completed checks

- Cocos Creator 3.8.8 Web Mobile build and TypeScript checks.
- Four thousand deterministic math-test spins with settlement invariants; Apple identity-token verification; real saved-ranking persistence and ordering.
- 32 cabinet / viewport combinations: 320×568, 360×640, 375×667, 390×844, 430×932, 412×915, 768×1024 and 820×1180. Shared-transform checks cover edge fill, essential control bounds, safe toolbar/footer and symbol breathing room.
- Original theme atlases: every 256px cell has at least 20px clear padding. A source object that touched its neighbour was separated before atlas packing.
- All four debug-forced BIG presentations use the matching theme, show the settled award, dismiss correctly and do not credit twice. Debug forcing is restricted to local review.
- Actual 320×568 and 390×844 login, registration, lobby, shop, rewards, ranking and profile screenshots, plus the four cabinet screenshots. First visual review identified login artwork occlusion and stretched cabinet margins: the form was raised and cabinet environments were naturally outpainted.

## Boundaries

Screenshots and browser tests are Web Mobile checks, not native iPhone certification. Production backend deployment, real Apple credentials, StoreKit configuration, signing, hosted legal pages and Apple Sandbox/TestFlight checks remain publisher work. The preview does not fake purchases or online opponents. No App Store approval is claimed.

## Final browser interaction results

- Clicked all four destination ENTER buttons and verified loading overlays, matching game IDs, bet increase/decrease, rules, sound toggles and return navigation.
- Check-in adds exactly 2,000 on day 1; repeated claim does not add again. Separate daily purse adds exactly 5,000 once. Portrait selection dialog, ledger, logout, login (2 fields) and registration (4 fields) are functional.
- Native DOM inputs remain readable, passwords concealed, and text retained across keyboard/viewport changes.
- Measured idle movement on all six non-game page types: 31–53 changing artwork sprites per sampled page, with text and hit regions anchored.
- All four ordinary award presentations were inspected at 320×568 and leave the wallet unchanged when invoked as presentation fixtures. They clean up after completion.
- Loading progress sampled as a monotonic sequence from 0 to 100, reaching 100 before the overlay disappears.
- Final visual corrections: small-screen brand fitting, single-line cabinet balances and a unified readable TOP WIN label. Actual tablet cabinet screenshot at 768×1024 supplements the geometric matrix.

Evidence: `docs/screenshots/` contains current runtime screenshots and JSON reports. Forced win screenshots are local review fixtures, not advertised payout-frequency examples.
