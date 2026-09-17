# F21 Gameplay & economy v2 — 2026-09-15

## Actual feature: JUBILEE ENCORE

A high-tier or WILD line, way or group win starts an encore.

Positions in that high-tier win become sticky WILDs. Fresh symbols fill other cells. Each new win adds its positions to the sticky set.

Up to three encores at 1x, 2x and 3x. A losing encore ends the feature immediately. Scatter wins do not trigger it or pay during encores.

All four cabinets use this project feature with their existing distinct base payout structures (one centre line, 20 lines, 1,024 ways, connected clusters). Base evaluators are shared infrastructure; these are seven different project feature algorithms, not 28 unrelated engines. Feature rounds do not debit another bet or recursively trigger another feature. All awards are capped together at the cabinet round limit.

Base and feature use separate payout scales. Displayed base coin awards use the base scale; special formulas and feature evaluations use `featurePayoutScale`. The feature rules show both scales. Outcomes do not depend on purchase history or wallet balance.

## Economy

- New wallet: 54,000. Existing balances remain unchanged.
- Bets: [80, 200, 450, 500, 1000, 2200].
- Daily gift: 2,000.
- Seven check-in awards: [700, 1100, 1800, 2700, 3800, 5500, 9000].
- Wheel sectors: [350, 700, 1100, 2000, 900, 1700, 3200, 6500].
- Mail attachments: [4000, 2000].
- Achievement targets (first spin / rounds / total win / features): [1, 21, 24000, 3].
- Achievement awards: [1000, 4000, 6000, 10000].

|Pack|Base coins|Bonus coins|Total|
|---|---:|---:|---:|
|1|30,000|0|30,000|
|2|150,000|30,000|180,000|
|3|300,000|120,000|420,000|
|4|600,000|360,000|960,000|

Pack tiers use base multipliers 1 / 5 / 10 / 20 and bonuses 0% / 20% / 40% / 60%. Totals are whole thousands. These are prototype coin quantities; real currency prices come from StoreKit.

## Upgrade and deployment

Existing balances, completed claims, progress and receipt IDs are preserved. The first-spin achievement remains a first-spin milestone. Existing claim IDs are retained, so changing targets does not create a second claim. Local display characters have a project-specific roster; they are presentation data, never written into real player totals.

New purchases use `.v3` Apple product IDs. Previous `.v2` products retain their previous amounts. Historical product IDs retain their original amounts and remain recognized for unfinished-order restoration. `server/iap-products.v3.json` contains both generations. Configure the backend IAP mapping and create matching products in App Store Connect before live purchases. Debug prices are reference labels, not fetched StoreKit prices. No products were created or published by this change.

Pending rounds accept historical saved bets for recovery. New rounds must use the new catalog. The server checks for an already-settled request before rejecting an obsolete bet. Keep historical server rounds available during deployment; do not reset wallets or receipt tables.

## Validation

`npm test`, `npm run typecheck`, `npm run typecheck:server`. Signature tests cover deterministic feature transitions, final settlement conservation, caps, old-order restore and preserved claims. Layout and payout tests run where available in the project.

See `math-v2-calibration.json` and `math-v2-validation.json`: separate training / validation seeds, and independent minimum / maximum bet samples. Recorded RTP is a sample estimate with standard error, not a certified theoretical return or release certification. High-variance encores require larger samples. Current factors are prototype balancing values.
