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

Open this folder in Cocos Creator 3.8.8. For the rebuilt browser preview, run `python3 tools/preview_server.py --directory build/web-mobile --port 6034` and visit `http://127.0.0.1:6034/`. To regenerate that build, use the Cocos Creator build task with `tools/web-mobile-release-build.json`.

From this folder, run `npm ci`, `npm run typecheck:math`, `npm test`, `npm run test:rtp`, and `npm run release:audit`. The release audit intentionally reports blockers while publisher and native credentials are unconfigured. The 2026-09-24 browser pass checked 390 × 844 and 320 × 568 views, all four cabinets' spin-and-return flow, and debug-only tiered award playback. On the same date all unit/contract tests passed, and a 300,000-round seeded sample per cabinet was within the project's 0.93–0.99 simulation tolerance. The simulated RTP is an estimate, not a guarantee of outcomes.

## Verified local preview · 2026-09-28

The four collections remain on one library-hall screen; selecting a collection slides the exhibit, and PLAY NOW enters its distinct cabinet. Ordinary, Big and SUPER BIG awards use distinct staged presentations. For a new local profile, **the fifth settled spin across all four collections returns at least 10× its stake**. Any shortfall is separately credited and labelled as a newcomer bonus; the reel result is not falsified. Server settlement uses the same milestone. This newcomer benefit is excluded from the natural RTP simulation.

The isolated Cocos web-mobile build was rendered at 320 × 568, 390 × 844 and 768 × 1024. The captures below came from the rebuilt `6034` preview, not an older copied build. Automated browser checks found no page/console errors on the sampled screens. A five-round browser flow confirmed round 5 at 800 credits on an 80-credit bet, with an 800-credit separately itemised bonus and SUPER BIG presentation. The Big and SUPER presentations were visually inspected; a button tap dismissed the SUPER presentation and returned to the idle cabinet. Hall selection and PLAY NOW were tested by pointer clicks. These are browser checks, **not** native device certification.

| Screen | Verified capture |
|---|---|
| Hall (390 / 320 / 768) | [390](docs/screenshots/verified-20260928/390-hall.png) · [320](docs/screenshots/verified-20260928/320-hall.png) · [768](docs/screenshots/verified-20260928/768-hall.png) |
| Hall after switching collection | [Sapphire Cipher](docs/screenshots/verified-20260928/390-hall-cipher.png) |
| Four cabinets | [Gilded Index](docs/screenshots/verified-20260928/390-index.png) · [Sapphire Cipher](docs/screenshots/verified-20260928/390-cipher.png) · [Fortune Atlas](docs/screenshots/verified-20260928/390-atlas.png) · [Royal Folio](docs/screenshots/verified-20260928/390-folio.png) |
| Narrow cabinet | [Fortune Atlas at 320](docs/screenshots/verified-20260928/320-atlas.png) |
| Other screens | [Login](docs/screenshots/verified-20260928/320-login.png) · [Store](docs/screenshots/verified-20260928/390-store.png) · [Rewards](docs/screenshots/verified-20260928/390-rewards.png) · [Rank](docs/screenshots/verified-20260928/390-rank.png) · [Account](docs/screenshots/verified-20260928/390-profile.png) |
| Reward presentations | [Ordinary](docs/screenshots/verified-20260928/390-ordinary-award.png) · [Big](docs/screenshots/verified-20260928/390-big-award.png) · [SUPER BIG](docs/screenshots/verified-20260928/390-super-award.png) · [Fifth-round guarantee](docs/screenshots/verified-20260928/390-fifth-super.png) |

`npm run typecheck`, `npm run typecheck:server`, `npm test` and the seeded 100,000-round-per-cabinet `npm run test:rtp` passed on this isolated project. The CLI logged a finished Cocos build but exited with code 36 after its worker SIGTERM diagnostic; the resulting browser artifact was directly served and inspected. `npm run release:audit` passed 21/26 checks, with five release blockers listed below.

## Release boundary

This is a playable local game template, **not an App Store accepted build**. The current publisher name, product IDs, HTTPS legal/support URLs and production API endpoint are placeholders. Native Sign in with Apple and StoreKit bridges, publisher-reviewed legal text, signatures, real-device performance, sandbox purchase and sign-in verification, production deployment and App Store review remain outstanding. `npm run release:audit` is the source of truth for the current automated gates. The Cocos CLI wrote a usable browser build and logged `Finished`, but returned code 36 with a worker SIGTERM diagnostic; rebuild in the editor before release. Never treat this preview as native or production acceptance.
