# F19 Gameplay & economy v2 — 2026-09-15

## Actual feature: VAULT COLLECTION

Gold bars required by board: 3x3 = 3; 5x3 = 4; 5x4 = 5; 5x5 = 6.

Keep every gold bar; redraw only unlocked cells for three collection rounds. New bars stay locked.

Only the final collection pays: 0.4 times bet per bar, plus 2 times bet per full column, all scaled by the payout factor. No timer resets or retriggers.

All four cabinets use this project feature with their existing distinct base payout structures (one centre line, 20 lines, 1,024 ways, connected clusters). Base evaluators are shared infrastructure; these are seven different project feature algorithms, not 28 unrelated engines. Feature rounds do not debit another bet or recursively trigger another feature. All awards are capped together at the cabinet round limit.

Base and feature use separate payout scales. Displayed base coin awards use the base scale; special formulas and feature evaluations use `featurePayoutScale`. The feature rules show both scales. Outcomes do not depend on purchase history or wallet balance.

## Economy

- New wallet: 66,000. Existing balances remain unchanged.
- Bets: [100, 250, 500, 600, 1250, 2500].
- Daily gift: 2,400.
- Seven check-in awards: [800, 1400, 2200, 3200, 4600, 6400, 11000].
- Wheel sectors: [400, 800, 1400, 2400, 1000, 2000, 3800, 8000].
- Mail attachments: [4800, 2400].
- Achievement targets (first spin / rounds / total win / features): [1, 24, 28800, 6].
- Achievement awards: [1200, 4800, 7200, 12000].

|Pack|Base coins|Bonus coins|Total|
|---|---:|---:|---:|
|1|50,000|0|50,000|
|2|250,000|50,000|300,000|
|3|500,000|200,000|700,000|
|4|1,000,000|600,000|1,600,000|

Pack tiers use base multipliers 1 / 5 / 10 / 20 and bonuses 0% / 20% / 40% / 60%. Totals are whole thousands. These are prototype coin quantities; real currency prices come from StoreKit.

## Upgrade and deployment

Existing balances, completed claims, progress and receipt IDs are preserved. The first-spin achievement remains a first-spin milestone. Existing claim IDs are retained, so changing targets does not create a second claim. Local display characters have a project-specific roster; they are presentation data, never written into real player totals.

New purchases use `.v3` Apple product IDs. Previous `.v2` products retain their previous amounts. Historical product IDs retain their original amounts and remain recognized for unfinished-order restoration. `server/iap-products.v3.json` contains both generations. Configure the backend IAP mapping and create matching products in App Store Connect before live purchases. Debug prices are reference labels, not fetched StoreKit prices. No products were created or published by this change.

Pending rounds accept historical saved bets for recovery. New rounds must use the new catalog. The server checks for an already-settled request before rejecting an obsolete bet. Keep historical server rounds available during deployment; do not reset wallets or receipt tables.

## Validation

`npm test`, `npm run typecheck`, `npm run typecheck:server`. Signature tests cover deterministic feature transitions, final settlement conservation, caps, old-order restore and preserved claims. Layout and payout tests run where available in the project.

See `math-v2-calibration.json` and `math-v2-validation.json`: separate training / validation seeds, and independent minimum / maximum bet samples. Recorded RTP is a sample estimate with standard error, not a certified theoretical return or release certification. High-variance encores require larger samples. Current factors are prototype balancing values.
