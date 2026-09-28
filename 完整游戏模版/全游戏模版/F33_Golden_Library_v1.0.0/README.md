# F33 · Golden Library

An original Cocos Creator 3.8.8 virtual-coin slot game set in a gilded library. The four cabinets use separate illustrated symbols, cabinet materials and ordinary-spin rules. Artwork in `assets/resources/art/` was generated for this project through the locally configured CC Switch image provider; editable generation prompts and processing code are in `art-source/`.

| Cabinet | Ordinary spin | Signature feature |
|---|---|---|
| Gilded Index | 3 × 3, five left-to-right paylines | Matching symbols spread to WILD on eligible rounds |
| Sapphire Cipher | 5 × 3, 243 left-to-right ways | A winning symbol transforms to WILD |
| Fortune Atlas | 5 reels, independently varying heights of 2–4 rows; ways use the displayed heights | Free-count cascade with falling replacements |
| Royal Folio | 5 × 5; 8 or more matching symbols counted across the board | Winning groups fall and refill |

The client includes initial and cabinet loading, guest and local account flows, consent and legal pages, a browsable hall, four cabinets, rules, sound settings, automatic spin, ordinary and tiered award presentations, a local rank with clearly labelled virtual friends, store, daily rewards, profile and avatar selection, language selection, and saved balances. A production API and verification contracts are present, but release-only services require configuration and native integration.

## Run and verify

Open this folder in Cocos Creator 3.8.8. For the existing browser preview build, run `python3 tools/preview_server.py --directory build/web-mobile --port 6033` and visit `http://127.0.0.1:6033/`. To regenerate that build, use the Cocos Creator build task with `tools/web-mobile-release-build.json`.

From this folder, run `npm ci`, `npm run typecheck:math`, `npm test`, `npm run test:rtp`, and `npm run release:audit`. The release audit intentionally reports blockers while publisher and native credentials are unconfigured. The 2026-09-24 browser pass checked 390 × 844 and 320 × 568 views, all four cabinets' spin-and-return flow, and debug-only tiered award playback. On the same date all unit/contract tests passed, and a 300,000-round seeded sample per cabinet was within the project's 0.93–0.99 simulation tolerance. The simulated RTP is an estimate, not a guarantee of outcomes.

## Current visual review · 2026-09-28

These screenshots were captured from the latest local Cocos browser preview at fixed mobile viewports. Two hall frames show different phases of the staggered brass, lamp, folio and navigation reflections; a still image cannot establish animation smoothness. The hall was also checked at 320 × 568, and the Shop → Hall → Cipher → Play path was exercised without browser errors.

| Screen | Current screenshot |
|---|---|
| Hall, 390 × 844 | [View](docs/screenshots/living-hall-20260928/390-home.png) |
| Hall light phase, 390 × 844 | [View](docs/screenshots/living-hall-20260928/390-home-light-phase.png) |
| Hall, 320 × 568 | [View](docs/screenshots/living-hall-20260928/320-home.png) |
| Gilded Index, 390 × 844 | [View](docs/screenshots/living-hall-20260928/390-game-golden-hour.png) |
| Sapphire Cipher, 390 × 844 | [View](docs/screenshots/living-hall-20260928/390-game-jade-treasury.png) |
| Fortune Atlas, 390 × 844 | [View](docs/screenshots/living-hall-20260928/390-game-pearl-palace.png) |
| Royal Folio, 390 × 844 | [View](docs/screenshots/living-hall-20260928/390-game-ruby-revel.png) |

These are browser viewport captures, not native-device screenshots. The previous visual set is retained only in the local work folder and is not part of this release snapshot.

## Release boundary

This is a playable local game template, **not an App Store accepted build**. The current publisher name, product IDs, HTTPS legal/support URLs and production API endpoint are placeholders. Native Sign in with Apple and StoreKit bridges, publisher-reviewed legal text, signatures, real-device performance, sandbox purchase and sign-in verification, production deployment and App Store review remain outstanding. `npm run release:audit` is the source of truth for the current automated gates. The Cocos CLI wrote a usable browser build and logged `Finished`, but returned code 36 with a worker SIGTERM diagnostic; rebuild in the editor before release. Never treat this preview as native or production acceptance.
