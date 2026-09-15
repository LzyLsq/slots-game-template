# F22 render and motion review — 2026-09-15

## Fixed
- Removed competing direct writes to cabinet light energy. Reel motion and presentation now provide targets; SalonAtmosphere alone smooths the resulting intensity.
- Integrated pillar, mote and ornament velocity over frame time. Changing energy no longer multiplies accumulated time and teleports the effect to another phase.
- Loading overlay now has a removal fallback when CSS transitions are disabled or interrupted; child transition events cannot remove it prematurely.
- Reduced-motion mode freezes the new phase clocks and suppresses their energy.

## Validation
- TypeScript typecheck passed; Cocos web-mobile build finished.
- Inspected screenshots for login, home, store, rewards, rank, profile and all four cabinets at 320×568 and 430×932. No obvious new overlapping labels found in this sweep.
- Eight actual app spins across the four cabinets and two sizes completed back to idle. Light energy stayed in 0–1; integrated phase never moved backwards. No browser page errors.
- Forced big-win app flow passed with normal and reduced motion: returns idle, normal presentation energy settles at 0.6, reduced energy and phase remain zero. Loading layer was removed in both modes. Evidence: screenshots/review-14-states.json.
- Evidence: screenshots/*-review-14.png and screenshots/review-14.json.
- Desktop Chrome with mobile viewport sizes; this is not an iPhone/Android device performance certification.

## Further polish candidates
- Small-screen secondary cabinet captions can be larger without changing the main SPIN placement.
- Account and leaderboard composition could use more deliberate spacing and decoration grouping.
- No payment, payout probability or economy changes in this revision.
