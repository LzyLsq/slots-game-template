# Browser QA for F36

Run the built Cocos preview on port 6036 before browser scripts. Node.js and Playwright are required. The tested browser is this Mac's Google Chrome; set `BROWSER_EXECUTABLE` for another Chromium executable. On a fresh checkout install optional QA tools with `npm install --no-save --package-lock=false playwright`; do not install through the workstation's temporary shared dependency symlink.

```sh
node tools/qa/phone-layout.cjs
node tools/qa/guardian-skin-geometry.cjs
node tools/qa/guardian-anatomy.cjs
node tools/qa/direct-motion.cjs
node tools/qa/fortune-reduced-motion.cjs
```

These current scripts write to `docs/screenshots/f36-continuous-room-20261010/`. The layout harness covers the hall and four cabinets at 390×844, 320×568, 794×883 and 1366×768. Set `QA_OUTPUT` to keep a separate evidence directory and `QA_VERSION` to label the preview URL. The phone harness fixes the guardian at its neutral mesh only for composition captures. Use `QA_SIZES=390x844,320x568` and `QA_MODES=sun-lion,emerald-elephant,lotus-koi,moon-fox` to focus a layout run on affected cabinets. The geometry harness exercises 15 seconds at 60 Hz for every theme, checks every mesh triangle for folding, bounds frame-to-frame displacement, compares cached vertex deformation against the reference calculation, verifies binding reuse and exact reduced-motion neutrality, and checks that koi eyes have no eyelid deformation. Its mocked engine check does not establish renderer performance. `guardian-anatomy.cjs` independently tracks painted facial, paw, trunk and tail landmarks for 15 seconds, including watch and celebration states. It bounds changes in pair lengths and internal angles so a non-folded mesh cannot pass merely while stretching like a sheet. Use `QA_GUARDIAN_SOURCE` with `QA_BASELINE=1` to report an older source without asserting the corrected thresholds.

The direct-motion harness records actual `GameCanvas.captureStream(30)` pixels with MediaRecorder. It samples gesture continuity and asserts 2,665 vertices plus a fixed crown position, scale and angle. It records idle, celebration and a local charged/settled debug-SUPER spin per mode. Debug fixtures do not modify production RNG or establish natural jackpot probability. CSP bypass is confined to the QA context for Blob video decoding. Reduced-motion QA checks neutral mesh coordinates, zero gesture and no page scroll in all four modes at 320×568.

Decode recorded WebM sequentially with Python, Pillow and OpenCV:

```sh
python3 tools/qa/decode-fortune-recordings.py docs/screenshots/f36-continuous-room-20261010/motion --gif-mode lotus-koi
```

The decoder writes full cabinet captures as `motion/*-runtime-idle.png` without replacing neutral layout screenshots, sequential idle/spin sheets, a GIF for the selected mode (Lotus Koi in this run) and original timestamp-gap metadata. It uses preceding source frames without blending or interpolation. A requested 30 Hz capture cadence is not a measurement of native FPS. Playwright compositor videos were stale in this environment and are not used as evidence.

Additional complete-flow scripts are available as:

```sh
node tools/qa/startup.cjs
node tools/qa/runtime.cjs
node tools/qa/features.cjs
node tools/qa/awards.cjs
node tools/qa/toolbar-locales.cjs
```

`runtime.cjs` and `awards.cjs` default to the cabinet-award revision; startup, feature and exhaustive per-mode locale scripts retain historical default output directories. The complete runtime and award-tier checks were repeated for `f36-cabinet-awards-20261010`. `runtime.cjs` accepts `QA_OUTPUT` and `QA_VERSION`; the current run uses `docs/screenshots/f36-cabinet-awards-20261010/interaction`. Startup gates boot-script delivery to inspect loading, then releases normal boot and tests failure/retry. Feature fixtures run in isolated contexts. Award presentation previews are not settlement proof. Source/runtime assertions and desktop phone emulation do not certify device performance, platform service integration, music quality or App Store readiness.

The direct-motion recorder registers its own temporary video Blob URLs before decoding frames. Cancelling their pending reads during decoder cleanup is retained separately as `captureCleanupAborts`. Application exceptions, console errors and every other failed request still fail the check.

## Awards in the live cabinet

```sh
node tools/qa/awards.cjs
node tools/qa/award-interactions.cjs
QA_AWARDS_ONLY=1 QA_VERSION=f36-cabinet-awards-20261010 QA_OUTPUT=docs/screenshots/f36-cabinet-awards-20261010/motion node tools/qa/direct-motion.cjs
python3 tools/qa/decode-award-recordings.py docs/screenshots/f36-cabinet-awards-20261010/motion --gif-mode lotus-koi
```

`awards.cjs` covers four tiers × four cabinets × two phone sizes and checks the live scene, aperture alignment and copy bounds. `award-interactions.cjs` checks early reveal, input isolation, viewport resize, immediate consecutive awards, restored caption opacity, automatic exit and reduced motion. Both are presentation fixtures; they do not grant coins. `QA_AWARDS_ONLY=1` skips existing idle recordings and records charged/settled debug-SUPER rounds in all four modes. The award decoder writes full-sequence contact sheets, a GIF and source timestamp metadata without blending or interpolation. See [the current evidence index](../../docs/screenshots/f36-cabinet-awards-20261010/README.md).


## Cabinet glass containment

```sh
node tools/qa/reel-aperture.cjs
QA_OUTPUT=docs/screenshots/f36-reel-containment-20261010/final/features QA_VERSION=f36-reel-containment-20261010 QA_MODES=emerald-elephant,lotus-koi QA_AWARDS_ONLY=1 QA_FEATURE_FIXTURE=1 node tools/qa/direct-motion.cjs
python3 tools/qa/decode-award-recordings.py docs/screenshots/f36-reel-containment-20261010/final/features --modes emerald-elephant lotus-koi --gif-mode lotus-koi
```

The aperture harness checks actual GPU screenshot pixels from oversized content, all four cabinets at two phone sizes, and the common renderer ancestry. `getBoundingBoxToWorld()` includes overscan children, so the harness measures the stencil's own size, world position and scale. Its one-device-pixel tolerance allows edge rasterization; zero pixels beyond that margin must pass. Probe nodes exist only in isolated QA contexts and are removed after capture. `QA_FEATURE_FIXTURE=1` selects deterministic feature results instead of the SUPER fixture while retaining charged/settled wallet checks. These fixture recordings do not alter production RNG. The decoder accepts `--modes` to inspect a focused set of recordings.

[Current containment evidence](../../docs/screenshots/f36-reel-containment-20261010/README.md)

## Restored eyelids and isolated free arms

```sh
QA_OUTPUT=docs/screenshots/f36-eyelids-limb-isolation-20261010/final QA_VERSION=f36-eyelids-limb-isolation-20261010 node tools/qa/guardian-eyelids-gpu.cjs
QA_OUTPUT=docs/screenshots/f36-eyelids-limb-isolation-20261010/final QA_VERSION=f36-eyelids-limb-isolation-20261010 node tools/qa/direct-motion.cjs
QA_OUTPUT=docs/screenshots/f36-eyelids-limb-isolation-20261010/final node tools/qa/guardian-recorded-poses.cjs
```

The eyelid fixture waits for the renderer to commit neutral geometry before comparing vertices. It renders open, partial, closed and reopened eyes in all four modes, verifies mammal eye-material registration and texture size, and verifies that Koi has no eye material. The recorded-pose decoder samples actual WebM frames in the browser at 0.2-second intervals; there is no frame blending. Geometry and anatomy checks also cover eyelid cycles and free-arm isolation at celebration bounds. [Current evidence](../../docs/screenshots/f36-eyelids-limb-isolation-20261010/README.md).

## Natural probability and actual settlement

```sh
node tools/qa/probability-settlement.cjs
node --import tsx tools/qa/probability-rules.cjs
```

The settlement check uses four isolated new guest accounts, real crypto RNG and actual touch controls, with no forced wins. Twelve rounds per mode cover one result/debit despite repeated input, itemized payouts, milestone benefits, reload persistence, duplicate settlement rejection and pending-stake refunds. Reduced motion shortens presentation only. The rule check verifies all added WILD ownership copy is visible in the actual paginated dialog at 320×568 in five languages and at 390×844 in English. [Evidence and probability definitions](../../docs/probability-20261010/README.md).
