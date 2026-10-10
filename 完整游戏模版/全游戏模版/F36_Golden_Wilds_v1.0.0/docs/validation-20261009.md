# F36 local validation · 2026-10-09

The final source is a Cocos Creator 3.8.8 project. The checked browser build is a local Cocos rendering preview. It is not a signed iOS binary. The following results describe specific checks; they do not certify parity with S05/F20, native performance or commercial release quality.

## Source and build

- Twelve automated suites pass: math, Apple verifier contracts, rank, layout, rules, language, product signature, core, cabinets, primary gameplay, win presentation and expedition passport. Evidence: `qa-20261009/automated-suites.log`.
- Coverage includes 24,000 natural feature/conservation rounds, 12,000 primary-rule rounds, settlement/recovery/idempotency/account isolation, 32 viewport geometry variants, award-coin bounds, duplicate/refunded passport events and claims. Verifier contract tests do not establish a working Apple device flow.
- Final app and server typechecks pass. Rank/language tests were repeated after their final text edits. Logs are in `qa-20261009/`.
- The Creator CLI reports the final web-mobile task finished in 11 seconds. This environment also reports a terminated build worker / nonzero process exit; the task completion was not inferred from the exit code. Final output was separately served and exercised after the build. Build log: `qa-20261009/web-build.log`.

## Runtime interaction

`screenshots/f36-review-20261009/interaction/runtime-audit.json` records **15 passing checks** and no recorded browser errors. The guest/consent path, repeated reverse swipes, daily/mail duplicate guards, virtual ranking, avatars, five account locales, options/legal, mode failure/retry/back, all four real spins, wallet/pending settlement, rules, sound, AUTO, background/mute, local account registration/logout/login and unavailable Apple/shop paths were exercised. Pages do not scroll at the checked phone viewport. Registration fixtures populate the local draft; physical mobile keyboard behaviour is not proven.

`features/feature-audit.json` records **six passing checks**: all four naturally generated feature fixtures plus ordinary Sun Lion and Emerald Elephant awards. The fixtures are deterministic natural engine outputs injected into isolated QA contexts; production RNG is unchanged. Award and wallet results settle once with no pending round. Moon Fox was not modified to manufacture a featureless positive payout at or below the bet just to force an ordinary-award example.

`awards/award-audit.json` records **32 passing presentations**: four modes × BIG/SUPER/MEGA/EPIC × two phone sizes. Amounts used were 160/960/4,400/8,800 at an 80-coin reference bet. These direct stage tests validate visible text bounds, exact amount reveal, collect/dismiss and teardown; the interaction/feature checks supply settlement evidence.

BIG means positive total return strictly greater than the **charged** bet. Ordinary positive/break-even returns remain available; higher tiers are SUPER ≥10×, MEGA ≥50× and EPIC ≥100×. The newcomer benefit is account-wide across modes: round five ≥5× and round ten ≥10×, with any shortfall separately itemised and credited. These bonuses are excluded from natural RTP samples.

## Layout and startup

- Final captures include seven pages and four cabinets at 390×844 and 320×568, DPR 2; all 22 are under `screenshots/f36-review-20261009/final/`.
- Four cabinets × five languages were rendered at 320×568. Active label boxes remain inside the viewport, with no page scroll or recorded page errors. Inspect `locales/locale-audit.json` and the actual language renders; bounding boxes alone do not establish legibility.
- Startup checks pass for both phone sizes, reduced motion and an intentionally failed script load followed by retry. Actual resource progress and app-ready events were observed, no F34 startup text remained, and the startup input overlay was removed. Evidence: `startup/startup-audit.json`.
- Rank captures were refreshed after the final wildlife-themed virtual names. Virtual opponents are explicitly identified as examples.

## Continuous motion evidence

The Playwright compositor recordings were rejected because decoded frames displayed a stale startup splash. They and their misleading sampled-frame report were removed. Runtime checks and genuine screenshots were retained; no smoothness claim is based on those invalid clips.

Four idle/celebration clips and four charged/settled spin/award clips were then captured directly from `GameCanvas.captureStream(30)` using MediaRecorder. Actual decoded frames show the final cabinets, localized guardian motion, sequential reels, win-stage reveal and recovery. `motion/direct-canvas-audit.json` records the files and final balances/labels; `motion/direct-canvas/` contains the clips and decoded samples. The spin recording uses an isolated debug SUPER fixture, not a natural probability sample. CSP is bypassed only for local Blob decoding in that QA context; production policy is unchanged.

The paired phase/pixel test in `motion/local-pixel-diff.json` confirms that guardian changes stay near the character head and do not move the reel/control/frame pixels. It is spatial-mask evidence, not frame-rate evidence. No native FPS, thermal or device animation certification is claimed.

## Natural RTP samples

Two independently seeded 100,000-round runs per mode, plus 20,000 rounds at each of the 30/900-coin bet levels per mode, produce **960,000 sampled natural rounds** in total. Benefits/debug fixtures are excluded. The four target RTPs are 0.96; integer rounding and finite sample variation apply.

| Mode | Seed 1369950974, 100k | Seed 72914211, 100k |
|---|---:|---:|
| Sun Lion | 0.958660 | 0.945777 |
| Emerald Elephant | 0.959742 | 0.948478 |
| Lotus Koi | 0.960299 | 0.953231 |
| Moon Fox | 0.960101 | 0.940680 |

All reported 95% intervals include 0.96. JSON reports under `qa-20261009/rtp-*.json` retain seeds, bets, intervals, base/feature returns and maximum sampled wins. These are repeatable simulations, not certified or measured production RTP.

## Release boundaries

`release-audit-20261009.log` reports **21/26 source/config checks passed**, with five explicit blocks: publisher/legal configuration, product IDs, finalized hosted legal documents, executable native integrations, and recorded device/production acceptance. The source-string checks establish contract presence, not real deployed services. `release-checklist.md` and `f36-release-status.json` detail the remaining work. Apple login, StoreKit, remote passport, deployed backend acceptance, signed iOS/device tests and App Store review are incomplete.

F36 was not committed or pushed in this task. The preceding F34 Git delivery is commit `6f6d16a696fbf0809a50ab9e2b380f51f3b30c73`, with its own current screenshot set. F36 source and evidence remain local for review.
