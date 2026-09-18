# F24 AURUM ATELIER — implemented gameplay and verification

Updated 2026-09-17. Source of truth: `GameConfigs.ts`, `IndependentCore.ts`, `SignatureFeature.ts`. The client and both server implementations import the same configuration and result generator.

| Immutable ID | Visible title | Grid and ordinary award | Bonus |
| --- | --- | --- | --- |
| golden-hour | SOVEREIGN MINT | 3×3; five fixed left-start paylines | SOVEREIGN STAMP |
| jade-treasury | PRISM CUT | 5×4; 1024 left-start ways | PRISM FREE SPINS |
| pearl-palace | GILDED LINKS | 5×3; sovereign coins plus WILD collector | LOCKED GOLD LINKS |
| ruby-revel | MASTERWORK VAULT | 6×5; six or more orthogonally connected matching symbols | MASTERWORK CASCADE |

These are four traditional slot families. They are not claimed to be globally exclusive mechanisms. In F23 the order was collector / paylines / ways / anywhere-count, with cash-collect / sticky-reset / synchronized-reels / sticky-cascade features. F24 changes that configuration to paylines / ways / collector / connected-clusters and implements the following actual bonus state machines; titles alone do not determine outcomes.

## Exact rules

**Sovereign Mint.** A line must start at the leftmost reel with three matching symbols; WILD substitutes. The middle horizontal, top, bottom and two diagonals are active. Each line pays its best result only. A WILD anywhere on the middle reel stamps all three cells of that reel to WILD after the original award. The outside reels stay fixed. Each line pays only its positive increase over that line's original award. No extra wager, random redraw or second payment of the original award. A fully WILD middle reel may stamp visually but earns no additional credits if no line improves.

**Prism Cut.** Three or more consecutive matching reels must start on the left; any matching row combination qualifies. The ways divisor is 1024. Three or more SCATTER guild seals anywhere trigger six fresh free spins. The trigger board pays ordinary ways and its scatter award first. Each free spin pays ways at 2×. Free-spin SCATTERs neither pay nor retrigger; WILDs are not sticky. Exactly six boards are resolved without extra wagers.

**Gilded Links.** Ordinary collection requires at least one sovereign cash coin and one WILD collector. Each cash coin contributes 0.15× total bet times the payout factor; multiple WILD collectors do not multiply that award. Three or more BONUS coin stacks trigger the bonus separately. Each starting or newly landed stack locks an equally selected 0.5×, 1×, 2× or 5× total-bet value times the payout factor. Start with three chances, respin only unlocked positions, and reset chances to three when a new stack lands. Stop after three misses, a full 15-cell board, or twelve respins. Collect locked values once at the end. There is no extra full-board jackpot and no ordinary cash payout during the respins. Fractional carry keeps integer cell values equal to the final collection. Cash coins and BONUS stacks use different sprites (atlas index 0 versus 15).

**Masterwork Vault.** Six or more identical cells joined horizontally or vertically form a winning cluster; diagonal contact does not join groups. WILD can join ordinary groups. Remove actual winning cells including participating WILDs, drop survivors preserving column order, then refill from above. Refilled boards pay at 2×, 3×, 5× and 8× on drops one through four. Stop as soon as a refill has no group, or after four drops. Every board settles once; no extra wager is taken.

Every game applies its configured combined base-plus-feature round cap. Rule tables calculate coin awards at the active bet including payout factors. Debug `force.winTier` cannot inject invented bonus credits. A forced symbol layout must still satisfy the real evaluator and trigger rules.

## Rules and UI integration

`PrimaryRuleText.ts` supplies dimension-, ways- and threshold-aware base rules in English, Simplified Chinese, Traditional Chinese, Japanese and Korean. `AtelierRuleText.ts` supplies all bonus explanations in the same five languages.

The UI owner must use `featureRuleText(config, language())` for bonus pages or spread `ATELIER_RULE_TRANSLATIONS` into its existing translation dictionary. Passing the English `FEATURE_PROFILES[id].notes` through a dictionary without those entries leaves the feature paragraphs untranslated. Cocos metadata is included for the new file.

The old `LampContract.ts` utility and service remain outside the F24 slot result path. They must not be exposed as a newly implemented F24 gameplay feature without a separate theme/behavior review.

## Economy

Available bets: 50, 100, 250, 500, 1000 and 2500. Initial wallet: 40,000. Daily gift: 2,000. Seven-day rewards: 1,000 / 1,500 / 2,000 / 2,500 / 3,000 / 5,000 / 10,000. Packages match StoreService: 20,000+0; 100,000+10,000; 200,000+40,000; 400,000+120,000. StoreKit supplies production prices; local debug prices are not production product approval.

## Validation evidence

- `tools/f24-gameplay-test.ts`: deterministic trigger/stop/award tests, five-language rule content, 24,000 natural rounds and true positive base/bonus fixtures in `docs/f24-winning-fixtures.json`.
- `tools/cabinet-test.ts`: additional 24,000 natural rounds checking held cells, movement, gravity, single collection and capped conservation.
- `tools/primary-test.ts`: 12,000 primary-result rounds.
- `tools/rule-contract-test.ts`: 294 assertions.
- `npm run test:math`: 4,000 rounds plus service/account/purchase invariants.
- `npm run typecheck:math` and `npm run typecheck:server`: pass.
- Max-bet independent-seed validation: 100,000 rounds per mode, seed 271828182, results in `docs/f24-rtp-validation-100k.json`. Sample returns: Mint 96.5563%; Prism 94.5428%; Links 97.1365%; Masterwork 95.4915%.

Payout factors are 1.03 / 0.69 / 0.45 / 1.55 after an independent calibration seed. The initial uncalibrated baseline is retained explicitly in `f24-calibration-baseline-100k.json`; it is not the final deployed configuration. Target RTP is 95.7%. Simulations are reproducible sample estimates, not formal certification or an App Store approval guarantee. Real-device animation smoothness and production StoreKit/backend configuration require their own integration evidence.

Minimum-bet cross-check: another 100,000 rounds per mode at bet 50, seed 314159265, PASS. Sample returns golden-hour: 96.8226%; jade-treasury: 95.4064%; pearl-palace: 95.7144%; ruby-revel: 94.4211%. Full output: `docs/f24-rtp-minbet-100k.json`.
