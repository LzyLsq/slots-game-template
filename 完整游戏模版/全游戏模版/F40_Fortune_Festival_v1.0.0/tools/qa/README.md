# F40 browser and engine QA

Run the Cocos web-mobile build on port **6040** first. These scripts inspect the developer's own built game through isolated Chromium contexts. They do not operate an existing user browser session. Playwright is a separate QA dependency; use an existing installation via `NODE_PATH`, or install it separately from a clean checkout. Most scripts target this Mac's installed Google Chrome. Some scripts accept `BROWSER_EXECUTABLE`; others retain that absolute executable path.

```sh
npm ci
npm test
npm run typecheck
npm run typecheck:server
npm run release:audit
python3 tools/preview_server.py --port 6040
```

`release:audit` currently exits nonzero because five publishing/native/device requirements remain open. Read [release status](../../docs/f40-release-status.json). A passing source contract is not a deployed service or executable native bridge.

## Browser checks and final output directories

Set `QA_OUTPUT` explicitly: several harnesses retain historical default folder names. `QA_VERSION` labels the preview URL in harnesses that support it. The original delivery evidence uses `f40-final-20261010`; later reviews below retain their own version and output directories.

| Script under `tools/qa/` | Purpose | Delivery evidence |
|---|---|---|
| `phone-layout.cjs` | Hall and four cabinets; final composition, registered guardians | `docs/screenshots/f40-final-20261010/` |
| `service-scenes.cjs` | Six service screens and four genuinely loading arrivals | `docs/screenshots/f40-final-20261010/services/` |
| `startup.cjs` | Initial loading, retry, phone sizes/reduced motion, F40 branding and five saved locales | `docs/qa/startup/` |
| `runtime.cjs` | Touch navigation, registration/legal draft, shop/reward/profile, four charged spin settlements, rules/audio/return | `docs/qa/runtime/` |
| `toolbar-locales.cjs` | Four mode toolbars and five languages | `docs/qa/locales/` |
| `probability-rules.cjs` | Rules and itemised newcomer-benefit copy | `docs/qa/rule-copy/` |
| `probability-settlement.cjs` | 48 natural paid touch rounds, round 5/10 benefits, pending recovery and conservation | `docs/qa/settlement/` |
| `features.cjs` | Four evaluator-derived feature presentations and input recovery | `docs/qa/features/` |
| `awards.cjs` | Four cabinets × four large-award tiers × two phone sizes | `docs/qa/awards/` |
| `award-interactions.cjs` | Reveal/collect, resize, repeated celebration, automatic exit, reduced motion and no duplicate credits | `docs/qa/award-interactions/` |
| `reel-aperture.cjs` | Reel-mask, cell/frame bounds and edge contacts | `docs/qa/aperture/` |
| `fortune-reduced-motion.cjs` | Neutral mesh, restrained motion and no page scroll on small phones | `docs/qa/reduced/` |

Example final captures:

```sh
QA_OUTPUT=docs/screenshots/f40-final-20261010 QA_VERSION=f40-final-20261010 QA_SIZES=390x844,320x568 node tools/qa/phone-layout.cjs
QA_OUTPUT=docs/screenshots/f40-final-20261010/services QA_VERSION=f40-final-20261010 node tools/qa/service-scenes.cjs
QA_OUTPUT=docs/qa/runtime QA_VERSION=f40-final-20261010 node tools/qa/runtime.cjs
QA_OUTPUT=docs/qa/awards QA_VERSION=f40-final-20261010 node tools/qa/awards.cjs
QA_OUTPUT=docs/qa/award-interactions QA_VERSION=f40-final-20261010 node tools/qa/award-interactions.cjs
```

`phone-layout` uses `QA_SIZES` and `QA_MODES` for focus runs. For cabinet composition captures only, it holds the guardian at its neutral pose; those screenshots do not establish animation quality. `service-scenes` delays owned QA image requests by 1000 ms to capture actual loading progress. This delay is a QA fixture, not a production minimum loading duration.

## 2026-10-12 polish evidence

The current polish uses `QA_VERSION=f40-polish-20261012`, `QA_OUTPUT=docs/screenshots/f40-polish-20261012` for phone captures and the `services/`, `interaction/`, `locales/`, `stencil/` subfolders for focused runs. See [the current report](../../docs/polish-20261012.md); the 2026-10-10 probability and release checks above retain their historical scope.

The runtime harness also tests repeated selection without rebuilding, rapid selection with retired outgoing groups and bidirectional touch swipes. `hall-motion.cjs` records actual hall canvas pixels during idle and four touch selections and verifies that only the selected presentation remains after each transition.

```sh
QA_OUTPUT=docs/qa/polish-motion-20261012 QA_VERSION=f40-polish-20261012 node tools/qa/direct-motion.cjs
QA_OUTPUT=docs/qa/polish-motion-20261012/hall QA_VERSION=f40-polish-20261012 node tools/qa/hall-motion.cjs
python3 tools/qa/decode-fortune-recordings.py docs/qa/polish-motion-20261012 --gif-mode pearl-qilin
```

The decoder requires OpenCV and Pillow in the selected Python environment. This run reused an existing local environment; no packages were installed. Sequential source-frame gaps are in `sequential-decoding.json`. The original Qilin spin/award recording contains a 601 ms gap. A separate requestAnimationFrame check did not reproduce it: maximum 16.8 ms without recording and 33.3 ms with recording, with no >100 ms gap or Long Task in either run. See [the timing data](../../docs/qa/polish-motion-20261012/qilin-frame-timing.json). The original cause remains unisolated; desktop sampling does not establish native performance.


## 2026-10-12 award crescendo

Current preview: `f40-award-crescendo-20261012`. [Evidence index](../../docs/qa/award-crescendo-20261012/README.md) distinguishes direct presentation layouts from charged, settled rounds and records timing caveats.

```sh
npm run typecheck
npm run test:win-presentation
npm run test:layout
npm run test:language
QA_OUTPUT=docs/qa/award-crescendo-20261012/awards QA_VERSION=f40-award-crescendo-20261012 node tools/qa/awards.cjs
QA_OUTPUT=docs/qa/award-crescendo-20261012/interaction QA_VERSION=f40-award-crescendo-20261012 node tools/qa/award-interactions.cjs
QA_OUTPUT=docs/qa/award-crescendo-20261012/copy QA_VERSION=f40-award-crescendo-20261012 node tools/qa/award-copy.cjs
QA_OUTPUT=docs/qa/award-crescendo-20261012/motion QA_VERSION=f40-award-crescendo-20261012 QA_AWARDS_ONLY=1 node tools/qa/direct-motion.cjs
```

`award-copy.cjs` checks five locales at 320×568 with a normal caption and a newcomer-benefit caption. Its long amount is a layout stress fixture, not a reachable-payout claim. Both this script and `awards.cjs` call presentation directly. `award-copy.cjs` also asserts that saved state is unchanged.

`direct-motion.cjs` accepts `QA_FORCE=ordinary|big|super|mega|epic` (default `super`) and `QA_FRAME_TIMES` as comma-separated seconds for still captures. It records `spin.timing`: rAF intervals, Long Tasks where available, visible amount/tier progression and the observed tier path. `QA_AWARDS_ONLY=1` skips idle recording; `QA_MODES` restricts modes. These runs still charge a bet and settle the round exactly once, but forced results are not natural probability evidence.

To reproduce the sequential EPIC review without parallel decoding:

```sh
QA_OUTPUT=docs/qa/award-crescendo-20261012/isolated-motion QA_VERSION=f40-award-crescendo-20261012 QA_AWARDS_ONLY=1 QA_FORCE=epic QA_MODES=golden-phoenix,jade-dragon QA_FRAME_TIMES=3,4,5,6,7,8,9,10,11 node tools/qa/direct-motion.cjs
python3 tools/qa/decode-award-recordings.py docs/qa/award-crescendo-20261012/isolated-motion
```

Use a Python environment with OpenCV and Pillow; the current Mac also has `/tmp/f36-image-api-env/bin/python`. The decoder reads the complete original WebM sequence, makes full-scene samples every 0.6 seconds and 30 guardian-pose samples every 0.2 seconds, then writes `sequential-decoding.json` with actual source-frame gaps. It does not interpolate frames. The guardian crop assumes the 780×1688 capture made by `direct-motion.cjs`.

Isolated Phoenix still recorded three video gaps above 100 ms and two Long Tasks; read the [report](../../docs/award-crescendo-20261012.md) before making performance claims. Run recording and decoding sequentially to avoid introducing extra contention; this does not guarantee native smoothness.

## Guardian and continuous motion checks

```sh
node tools/qa/guardian-skin-geometry.cjs
node tools/qa/guardian-anatomy.cjs
QA_OUTPUT=docs/qa/motion-final QA_VERSION=f40-final-20261010 node tools/qa/direct-motion.cjs
QA_OUTPUT=docs/qa/motion-final node tools/qa/guardian-recorded-poses.cjs
QA_OUTPUT=docs/qa/motion-final node tools/qa/guardian-eyelids-gpu.cjs
python3 tools/qa/decode-fortune-recordings.py docs/qa/motion-final --gif-mode pearl-qilin
```

Geometry checks exercise every mesh triangle at 60 simulated steps per second, fixed painted contacts, bounded step displacement, cached/reference agreement and neutral reduced motion. Anatomical checks bound the registered painted landmarks. These are geometry and behavior checks, not renderer-performance benchmarks.

`direct-motion` records actual `GameCanvas.captureStream(30)` pixels using MediaRecorder, with idle gestures and a charged/settled debug-SUPER round in every mode. Recordings are in `direct-canvas/`; pose decoders inspect 30 original poses per mode at 0.2-second intervals and eye closure. There is no blended-frame interpolation. The QA context alone permits owned Blob video decoding. Compositor recordings that were stale in this environment are not used as motion evidence.

A requested 30 Hz capture is not proof of a smooth 60 Hz native game. Pose review, source-frame timing and recording existence also do not replace complete real-time playback on a device. Generated WebM/GIF files are excluded from Git; retain local recordings for review.

## Probability and fixture boundaries

```sh
npm run audit:probability -- 2000000 40571 0 docs/qa/rtp-min.json
npm run audit:probability -- 2000000 40571 5 docs/qa/rtp-max.json
node --import tsx tools/exact-panda-audit.ts
```

Use [the probability report](../../docs/probability.md) for the actual sampling parameters and results. Natural probability audits exclude welcome credits and forced results. Exact Panda enumeration includes real integer rounding at every supported stake.

Large-award fixtures call presentation methods without crediting the wallet. Feature fixtures preserve evaluator-produced results but replay them for deterministic visual review. Charged debug-SUPER recordings verify single reservation, settlement and ledger conservation for the forced round, not the natural chance of that result. Natural touch settlement and long-run math audits are recorded separately.

## Sampled audio lifecycle — 2026-10-12

```sh
python3 tools/qa/audio-signal.py
NODE_PATH=/path/to/existing/node_modules node tools/qa/audio.cjs
```

The PCM check needs NumPy. On this Mac it can run with `/tmp/f36-image-api-env/bin/python`. It checks all 90 final WAV files against the provenance manifest: duration, format, non-silence, peak headroom, clipping and the six loop boundaries. A matching boundary is a signal check, not proof that the musical loop sounds seamless.

The runtime harness uses a private 390×844 Chromium context for each cabinet. Each direct cabinet cold start checks 33 decoded clips (14 hall/shared + 19 house-specific), 11 managed sources, one steady background loop, actual per-column stop callbacks and accepted feedback cues, tier accents, count-to-reveal routing, early collection, mute persistence, crossfade cleanup and engine hide/show recovery. Cocos can re-enter `AudioSource.play` after async preparation, so the report keeps source requests separately from accepted manager cues. Feature rounds may produce additional real landings; they must each have the correct cue.

A forced EPIC round is started through the actual SPIN touch input and verifies a single local reservation and settlement with wallet conservation. It does not measure production RNG probability. Ordinary-win, collection and feature routing are direct audio fixtures; engine hide/show is a lifecycle fixture, not native iOS interruption testing. AudioSource state does not establish audible output, subjective musical quality or phone-speaker/headphone listening. Reports are in `docs/qa/audio-20261012/`; [the implementation report](../../docs/sampled-audio-20261012.md) records the build-copy recovery and source disclosures.

## Resource preparation — 2026-10-12

```sh
NODE_PATH=/path/to/existing/node_modules QA_OUTPUT=docs/qa/refinement-20261012/readiness node tools/qa/audio-readiness.cjs
```

This harness gates actual WAV requests in a private 390×844 browser context. It checks that startup stays below 100% while audio is pending, hall startup decodes 14 clips, first visits to the four houses increase the cached total to 33/52/71/90, repeated entry is blocked, returning retains one steady hall loop and cached re-entry requests no additional WAVs. Loading screenshots and the 12-check report are in that output directory.

The all-sound failure fixture uses a 320×568 context, an accelerated clock and the preparation timeout callback. It verifies release of the input lock and successful return with zero decoded clips; its elapsed browser time is not a measurement of a real network timeout or native platform loading.

Final rechecks are in `docs/qa/refinement-20261012/audio-runtime/`, `startup/` and `runtime/`. See [the report](../../docs/refinement-20261012.md) for counts, export hashes and the missing configured Creator declaration path. Existing soundtrack provenance and licensing disclosures remain in the sampled-audio report.

## Centered reading, short-phone hall and header input — 2026-10-12

Run against the current Creator export with `QA_VERSION=f40-centered-reading-20261012`:

```sh
NODE_PATH=/path/to/existing/node_modules QA_OUTPUT=docs/qa/text-centering-20261012/final node tools/qa/text-centering.cjs
NODE_PATH=/path/to/existing/node_modules node tools/qa/home-readability.cjs
NODE_PATH=/path/to/existing/node_modules node tools/qa/header-touch.cjs
NODE_PATH=/path/to/existing/node_modules node tools/qa/frame-consistency.cjs
```

- `text-centering.cjs`: two phone sizes and five locales; legal/rules/help pagination, service and account dialogs, mailbox/history, four cabinets and full 18-character names. `QA_SCOPE=reading|extras|all`, `QA_SIZES` and `QA_LOCALES` allow focused reruns. Its 1,198 records are rendered scene inspections containing repeated label checks, not 1,198 manually reviewed screenshots.
- `home-readability.cjs`: painted navigation vs. footer, caption fonts and full hit bounds, taps on the lower part of every caption, three reverse swipe pairs, enter/return and outgoing-group cleanup. Ten final contexts were rerun after the header changes.
- `header-touch.cjs`: stable non-overlapping header targets measured at 44×44 CSS pixels on five service/hall pages, all five locales and two sizes; saved 18-character Latin/CJK names and actual edge taps to shop, mailbox and profile. Private contexts do not modify the player's account.
- `frame-consistency.cjs`: three charged/settled debug EPIC Phoenix rounds with rAF and Long Tasks only. No recorder, still captures, trace or decoding runs during measured rounds. rAF cadence is a desktop browser proxy, not native or GPU timing. `QA_MODE` and `QA_ROUNDS` allow focus review.

[The report](../../docs/text-centering-20261012.md) separates the full text pass from subsequent hall/header changes and records continuous-capture findings. The configured 3.8.8 runtime was recovered into ignored `temp/qa-creator-3.8.8/`; the normal client typecheck now uses that version's declarations. The earlier resource review's absent-path limitation remains historical.

## Acceptance limits

Tests cover local Cocos browser behavior, source contracts and saved data. Fresh static screenshots establish layout, clipping and legibility. The 2026-10-10 suite does not establish phone GPU performance, live production service availability, executable native Apple/StoreKit integration, audible music quality on devices or App Store approval. Those remain separate release tasks.
