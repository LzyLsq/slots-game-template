# F23 Gameplay & economy v2 — 2026-09-15

## Actual feature: LAMP RECIPE FORGE

First ingredients required: 3x3 = 3; 5x3 = 4; 5x4 = 5; 5x5 = 6.

Recipes follow the third, fifth and sixth regular symbols in the payout list. Collect at least three copies to complete each later recipe.

Each collected symbol pays 0.2x, 0.4x then 0.6x bet, scaled by the payout factor. Remove ingredients, let survivors fall, then refill and pay the board. Stop if a recipe is missing.

All four cabinets use this project feature with their existing distinct base payout structures (one centre line, 20 lines, 1,024 ways, connected clusters). Base evaluators are shared infrastructure; these are seven different project feature algorithms, not 28 unrelated engines. Feature rounds do not debit another bet or recursively trigger another feature. All awards are capped together at the cabinet round limit.

Base and feature use separate payout scales. Displayed base coin awards use the base scale; special formulas and feature evaluations use `featurePayoutScale`. The feature rules show both scales. Outcomes do not depend on purchase history or wallet balance.

## Economy

- New wallet: 50,400. Existing balances remain unchanged.
- Bets: [70, 180, 420, 500, 900, 1800].
- Daily gift: 1,680.
- Seven check-in awards: [560, 980, 1540, 2240, 3220, 4480, 7840].
- Wheel sectors: [280, 560, 980, 1680, 840, 1400, 2800, 5600].
- Mail attachments: [3360, 1680].
- Achievement targets (first spin / rounds / total win / features): [1, 23, 20160, 9].
- Achievement awards: [840, 3360, 5040, 8400].

|Pack|Base coins|Bonus coins|Total|
|---|---:|---:|---:|
|1|25,000|0|25,000|
|2|125,000|25,000|150,000|
|3|250,000|100,000|350,000|
|4|500,000|300,000|800,000|

Pack tiers use base multipliers 1 / 5 / 10 / 20 and bonuses 0% / 20% / 40% / 60%. Totals are whole thousands. These are prototype coin quantities; real currency prices come from StoreKit.

## Upgrade and deployment

Existing balances, completed claims, progress and receipt IDs are preserved. The first-spin achievement remains a first-spin milestone. Existing claim IDs are retained, so changing targets does not create a second claim. Local display characters have a project-specific roster; they are presentation data, never written into real player totals.

New purchases use `.v3` Apple product IDs. Previous `.v2` products retain their previous amounts. Historical product IDs retain their original amounts and remain recognized for unfinished-order restoration. `server/iap-products.v3.json` contains both generations. Configure the backend IAP mapping and create matching products in App Store Connect before live purchases. Debug prices are reference labels, not fetched StoreKit prices. No products were created or published by this change.

Pending rounds accept historical saved bets for recovery. New rounds must use the new catalog. The server checks for an already-settled request before rejecting an obsolete bet. Keep historical server rounds available during deployment; do not reset wallets or receipt tables.

## Validation

`npm test`, `npm run typecheck`, `npm run typecheck:server`. Signature tests cover deterministic feature transitions, final settlement conservation, caps, old-order restore and preserved claims. Layout and payout tests run where available in the project.

See `math-v2-calibration.json` and `math-v2-validation.json`: separate training / validation seeds, and independent minimum / maximum bet samples. Recorded RTP is a sample estimate with standard error, not a certified theoretical return or release certification. High-variance encores require larger samples. Current factors are prototype balancing values.
