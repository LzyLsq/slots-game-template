# F36 continuous room refinement · 2026-10-10

Current revision: `f36-continuous-room-20261010`. Project: `F36_Golden_Wilds_v1.0.0`, Cocos Creator 3.8.8. This request continues F36; the user's earlier “21” was an accidental input.

## Result and scope

Four newly commissioned peripheral panoramas extend the Sun Lion savannah, Emerald Elephant waterfall, Lotus Koi pond and Moon Fox sunset pavilion across wide viewports. The previous uncovered black sides are filled with matching room architecture, floor perspective and illumination. All room plates use the cabinet's coordinate plane. A 96-unit overlap feathers the room margins while preserving the original central RGB pixels and every gameplay coordinate.

`AureliaApp.ts` now composes two room wings and the registered centre. `fortuneResources()` includes the three plates in each mode's actual loading list. `layout-test.ts` checks horizontal room coverage. The guardian's deformation equations and cabinet geometry are unchanged from the saved refinement baseline. Continuous mesh articulation, open koi eyes, spin/win response and exact reduced-motion neutrality remain in place.

Assets came from the currently selected local CC Switch image provider. The actual returned panoramas are **1374×1145**; the requested 3072×2560 size was not delivered. The installed side images are 560×1280 and centres are 1024×2560. Resampling the peripheral art does not create additional source detail. Approximate decoded room texture storage is **15.47 MiB per mode**, excluding other resources and engine overhead. Prompts, output hashes and registration are retained under `art-source/room-panorama-20261010/`. [Provenance](asset-provenance.md) distinguishes commissions from licensing clearance.

## Fresh checks

| Check | Observed result |
|---|---|
| TypeScript | `npm run typecheck` passed |
| Cabinet and room bounds | 40 theme/viewport combinations passed |
| Guardian geometry | Four themes × 15 simulated seconds; 2,665 vertices, no triangle folding, cached/reference agreement, no koi eyelid deformation |
| Central registration | All four centre images preserve source RGB exactly; alpha changes only at the outer margins |
| Build | Creator log reports “Finished” in 1 min 22 s; process exit was 36 with workstation helper messages. The generated renderer was independently exercised |
| Final composition | 20 screenshots: hall + four cabinets at 390×844, 320×568, 794×883 and 1366×768; zero captured browser errors |
| Interaction | 15 groups passed, including four real spins/settlements, AUTO, rules/audio, guest/local account, rewards duplicate protection and loading failure/retry/return |
| Localisation checked in this run | Profile at all five supported locales; exhaustive four-mode locale captures remain historical |
| Reduced motion | All four modes at 320×568: exact neutral joint coordinates, zero gesture, fixed transform and no page scroll |
| Animation recordings | Eight direct GameCanvas WebMs, four modes; idle/celebration plus local charged and settled debug-SUPER spins; zero application errors captured |

[Current screenshots and recordings](screenshots/f36-continuous-room-20261010/README.md) link to the underlying reports and logs. The in-app preview was left on Lotus Koi, with no captured error-level console entries at the final check.

Sequential pose sheets were reviewed for all eight recordings. Animal silhouettes retain a single outline; room architecture stays registered; there is no second pose being crossfaded behind the animal. The recorded spin flows complete and clear busy state. These findings describe the inspected desktop evidence, not a guarantee of native smoothness.

## Recording cadence and limits

Direct `GameCanvas.captureStream(30)` and MediaRecorder were used. Sequential OpenCV decoding retains original timestamps; pose sheets and the 10 Hz koi GIF use preceding source frames without interpolation. Requested capture cadence is not measured game FPS.

| Sanctuary | Recording | Decoded frames | Duration | Largest source gap |
|---|---|---:|---:|---:|
| Sun Lion | idle | 293 | 10.008 s | 290 ms |
| Sun Lion | spin-award | 430 | 14.317 s | 67 ms |
| Emerald Elephant | idle | 295 | 10.369 s | 396 ms |
| Emerald Elephant | spin-award | 323 | 11.463 s | 122 ms |
| Lotus Koi | idle | 298 | 10.265 s | 157 ms |
| Lotus Koi | spin-award | 404 | 14.480 s | 181 ms |
| Moon Fox | idle | 295 | 10.168 s | 94 ms |
| Moon Fox | spin-award | 306 | 12.450 s | 222 ms |

The gaps are retained in [decode metadata](screenshots/f36-continuous-room-20261010/motion/sequential-decoding.json) and [timestamp locations](screenshots/f36-continuous-room-20261010/motion/recording-gap-locations.json). Capture and runtime timing cannot be separated by this evidence alone. Device profiling is still needed before claiming stable frame delivery. The geometry test checks simulated continuity, not renderer performance.

The recorder also retained 36 aborted reads from its own temporary video-decoder Blob URLs during cleanup. Those are listed separately in `captureCleanupAborts`; application exceptions, console errors and unrelated failed requests still fail the audit.

Debug-SUPER recordings use a test result while exercising actual local charge and settlement. They do not establish natural jackpot probability or RTP. Startup delivery gating, exhaustive per-mode localisation, natural RNG sampling and every award tier were not all rerun for this room refinement. The [previous report](validation-20261010.md) remains historical evidence.

Native iOS build/signing, physical device performance, real Apple sign-in, StoreKit, deployed production services, rights clearance and App Store review remain unverified. [Release checklist](release-checklist.md) records those separate tasks. No Git commit or push was made for this request.
