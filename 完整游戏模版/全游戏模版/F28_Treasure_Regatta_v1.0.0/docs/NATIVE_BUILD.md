# F28 native Simulator build

**Material-lustre follow-up, September 20, 2026:** full asset generation plus unsigned compilation was repeated after the `control-lustre.effect` and explicit initial uniforms were added. The resulting package was installed and launched on the existing iPhone 18 Pro / iOS 27 Simulator. All four cabinet screens render with the new custom material. This follow-up uses inspector navigation and screenshot inspection, not another native touch/settlement regression; earlier functional results below belong to their recorded snapshots. Physical-device GPU compatibility and performance remain unverified.

**Final snapshot status (September 20, 2026):** the last full Cocos generation and unsigned Xcode compilation succeeded after all source/art revisions, including the final **Erase data** caption. The installed Simulator package matches that final source snapshot. Runtime `ready=true`, Crew page (`profile`), caption text and retained balance 10216 were verified; see the final verification section below. Earlier snapshot limitations in this document are historical, not current missing-build items.

This is an unsigned, local iOS Simulator development configuration, not an App Store package. `org.treasureregatta.f28` is a provisional local bundle identifier, not a user-confirmed production identity. No team, purchases, production accounts or provisioning are configured.

Run `node tools/build-ios.mjs` to generate Simulator-only Cocos assets and configure the arm64 Xcode project. Add `--compile` to compile it unsigned. It preserves prior importer caches in a unique temporary backup and does not modify the web output. Do not run concurrent Cocos headless builds for this project.

After assets have already been generated, `node tools/build-ios.mjs --skip-generate --compile` only configures and compiles the existing native asset snapshot; this does not move or use `library/temp`. It does not include subsequent script/art changes until the next full generation. The script currently targets Apple Silicon and Creator 3.8.8; override `COCOS_CREATOR` only with a compatible editor installation.

The project-owned `native/engine/ios/F28Random.mm` class exposes `+[F28Random nextWord]` through Cocos reflection. It uses checked `SecRandomCopyBytes`; 0…4294967295 are successful words and -1 indicates failure. The TypeScript adapter must reject failure before a wager. There is no predictable PRNG fallback.

`Post-F28Simulator.cmake` is a Cocos project hook, not a shared engine edit. For an explicitly selected iphonesimulator SDK it removes Cocos 3.8.8's default arm64 exclusion, disables signing and selects available bundled M1 Simulator native libraries.

`native/engine/common/localCfg.cmake` selects iOS 15.0 as the minimum Simulator deployment target. Xcode 27 rejected 14.0 in the first compile attempt. For Xcode 27 Simulator builds only, the post hook also keeps the legacy bundled Enoki arithmetic-trait specialization diagnostic visible as a warning instead of an error. This compatibility workaround does not modify the shared editor/engine installation and needs reassessment when updating Cocos.

## Verification record — 2026-09-20

- Host: Apple Silicon, Xcode 27.0 (27A266a), iOS Simulator SDK 27.0, Cocos Creator 3.8.8.
- Native asset generation and CMake Xcode project configuration succeeded.
- Xcode recognized scheme `f28-treasure-regatta-mobile`; native RNG source and Security framework are included in that app target.
- `node tools/build-ios.mjs --skip-generate --compile` succeeded with `BUILD SUCCEEDED`. The first full engine build compiled 588 source units. The stock classic-linker option was accepted by this toolchain; no linker workaround was needed.

Unsigned Simulator app: `build/ios-simulator/proj/Debug-iphonesimulator/f28-treasure-regatta-mobile.app`. This is not an IPA or real-device binary.

### Initial runtime failures (before scene migration)

iPhone 18 Pro / iOS 27.0: the initial stock app delegate exited almost immediately. Two launches reproduced `EXC_BREAKPOINT / SIGTRAP`; the first crashing frame was `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke`. Those initial launches failed. Local report: `/Users/xzkj/Library/Logs/DiagnosticReports/f28-treasure-regatta-mobile-2026-09-20-133921.ips`. The project-local migration and subsequent passing platform checks are recorded below; they supersede this startup blocker, not the full-game verification gap.

The native asset snapshot was generated before the mainline's new six-control artwork update. Even a passing native snapshot must not be presented as visual QA of those later buttons.

iPhone 17 Pro / iOS 26.5: engine and scene JavaScript started, but `RegattaApp.measure()` raised `TypeError: probe.remove is not a function` at generated `assets/main/index.js:955`. Source location at inspection: `assets/scripts/RegattaApp.ts:98–105`. JSB provides a partial DOM, so checking only `document.body` does not establish browser support. The browser CSS safe-area probe must be skipped on native; the native safe rectangle should be used instead. This task did not edit mainline game scripts. Full UI, spin, and safe-area runtime verification remain blocked in this snapshot.

The live iOS 26.5 V8 inspector did successfully invoke `jsb.reflection.callStaticMethod("F28Random", "nextWord")` eight times. All results were integer JS numbers within the uint32 range, including values above 2^31 (2427437507 and 3771459276), confirming the double-return bridge avoids signed truncation. This is a bridge smoke test, not a statistical RNG certification or end-to-end wager test. OS entropy failure was not injected on Simulator.

Generated project: `build/ios-simulator/proj/f28-treasure-regatta.xcodeproj`. Build logs for this local attempt: `/tmp/f28-native-generate.log`, `/tmp/f28-native-cmake.log`, `/tmp/f28-native-xcodebuild.log` (temporary, not durable release evidence).

### Project-local iOS 27 migration

- `Info.plist` declares static `F28SceneDelegate` configuration with multiple scenes disabled. No storyboard root is declared because the Cocos root view is programmatic.
- SDK initialization and process termination stay in AppDelegate. SceneDelegate owns UIWindow; AppDelegate keeps a weak compatibility getter because unmodified Cocos `SystemWindow` and `Screen` consumers expect `application.delegate.window`.
- Window/root-view setup finishes before starting the Cocos bridge once. A scene reconnect reuses the same view controller/engine. All four foreground/background lifecycle callbacks moved together to SceneDelegate and continue to forward to SDK/Cocos.
- The first scene-enabled launch reached V8, then aborted inside upstream `Screen::getDeviceOrientation()` because iOS 27's obsolete `statusBarOrientation` no longer returned a usable value. `F28SceneScreen.mm` is a project-owned copy of Creator 3.8.8's iOS Screen implementation with its upstream license retained. Only its orientation path is changed: SceneDelegate injects the actual game window before engine startup; orientation reads that window's scene and retains the last valid value during unknown transition states. CMake removes the original Screen source from this project's compilation and adds the local replacement. No files under `/Applications` were changed. The override must be reassessed on engine upgrades; configuration fails if the expected upstream source is not found exactly once.
- ARC is enabled only for the three project-owned lifecycle/Screen files. No shared-engine memory-management mode was changed. Other legacy `UIScreen` uses in the copied implementation remain outside this bounded migration.

### Verified after migration — iPhone 18 Pro / iOS 27.0

`node tools/build-ios.mjs --skip-generate --compile` succeeded again (`/tmp/f28-native-scene-build.log`). The actual built `.app` manifest includes `F28SceneDelegate`, and installation/launch reached Cocos scene JS without the two native startup aborts.

- Live inspector returned 12 valid uint32 RNG words, including 4259709232; orientation returned portrait (`0`).
- Native safe-area edges returned `[62, 0, 34, 0]` points (top, left, bottom, right). This verifies the platform value, **not** the game's safe-area layout.
- Backgrounded by opening Simulator Settings, then foregrounded the game. Unified logs recorded connected/foreground/active, resign-active/background, then foreground/active. PID remained 25005; only one scene-connected/engine-started log occurred.
- An inspector request during suspension completed upon return while `paused=true`, frame 3063. A subsequent foreground request returned `paused=false`, frame 4255, and a valid RNG word (1456418363), demonstrating resumed engine progression without restarting the process.
- The old native JS snapshot still throws its known `probe.remove` error. Mainline reports that guard fixed in source, but this task deliberately did not regenerate Cocos assets while UI artwork was changing. Full launch UI, spin interactions, persistence, new artwork, and safe-area layout require a fresh native generation and another runtime pass.

Only these platform smoke checks are passed. Scene disconnection/reconnection under memory pressure, real-device performance, signing, StoreKit, production services, and App Store approval remain unverified or externally blocked.

### Fresh full generation — September 20, 2026, 14:07–14:10 local time

`node tools/build-ios.mjs --compile` completed successfully (`/tmp/f28-native-final-build.log`). Cocos generation has exited and no longer owns `library/temp`. This snapshot includes the native DOM guard and all-role button atlas, superseding the old `probe.remove` and missing-button-snapshot blockers above. A later source-only label-inset correction is **not** included; regenerate again before calling this the final visual build.

- Installed and launched on iPhone 18 Pro / iOS 27.0, PID 26285. `RegattaApp.ready=true`; login, guest entry, lobby, and Captain's Cache rendered. Native control input was tested by dispatching start/end events to the real Cocos button nodes through V8 inspection, **not physical Simulator taps**.
- Double SPIN press from balance 10000 debited exactly one 20-coin bet, created pending round 1, and settled once: revision 2, balance 9980, nextRoundId 2, pending null, one receipt (bet 20 / win 0), phase idle. No settlement or wallet state was manually changed.
- Native safe edges [62,0,34,0] points map to game top/bottom insets 166.567/91.343 at design size 1080×2348.060. Screenshot inspection confirmed the main game header and lower controls within the safe layout. Evidence was moved to `output/native-qa/native-pre-inset-game.png` and `output/native-qa/native-pre-inset-login.png`; login capture contains the debug profiler overlay, which was then hidden via inspector for the game capture. These are development screenshots, not release-store artwork.
- Background via Settings and return retained PID 26285, page game and balance 9980. Logs contain the paired resign-active/background and foreground/active callbacks with only one engine startup. Initial returning inspector evaluation observes paused=true before activation; subsequent evaluation confirms resumed progression.
- Four-mode native coverage, physical taps/keyboard input, in-flight background settlement, process-relaunch persistence, scene reconnection, sustained performance, real device and production signing/release remain unverified. Browser acceptance is separate and does not substitute for those native checks.

### Delivery-candidate regeneration and extended runtime verification

Full generation and unsigned compilation succeeded again (`/tmp/f28-native-delivery-build.log`). This snapshot includes labelX=0.35h / labelWidth=w−1.05h and removal of unused coral/ivory/jade/blue resources. The later caption shortening to **Erase data** was applied after generation and still requires a final asset regeneration; do not confuse this snapshot with that last text revision.

Installed on the same iPhone 18 Pro / iOS 27.0 Simulator. The pre-existing guest session and 9980 balance survived installation. Through the actual native Cocos button start/end event handlers, entered each mode from the lobby, double-pressed SPIN, and verified exactly one wager and receipt each. Winning presentation could be skipped through its button; no wallet values or outcomes were injected.

| Mode | Starting balance | Bet | Win | Settled balance | Round |
| --- | ---: | ---: | ---: | ---: | ---: |
| Captain's Cache | 9980 | 20 | 0 | 9960 | 2 |
| Pearl Passage | 9960 | 20 | 16 | 9956 | 3 |
| Jewel Cargo | 9956 | 20 | 0 | 9936 | 4 |
| Reef Riches | 9936 | 20 | 0 | 9916 | 5 |

All returned idle with pending null and nextRoundId incrementing once. Evidence: `output/native-qa/final-four-mode-results.json`.

Started Captain round 6 (bet 20, win 320) then immediately opened Simulator Settings while spinning. On foreground, the same PID 27266 still had spinning/pending round 6 and balance 9896; after animation resumed it reached idle, pending null, revision 12 and balance 10216, with one new receipt. Evidence: `background-round-start.json` / `background-round-resumed.json` in `output/native-qa/`.

Explicitly terminated and relaunched the application. New process reached ready/home and restored balance 10216, revision 12, nextRoundId 7, six receipts and pending null (`output/native-qa/process-relaunch.json`). This verifies completed-round process-relaunch persistence, not termination during an unsettled round. Game capture: `output/native-qa/final-captain.png`.

These interaction checks are **programmatically dispatched Cocos scene touch events, not OS-level physical taps**. Scene reconnection, physical touches/keyboard, pending-round process kill, long performance sessions, real devices and all signing/release steps remain unverified. Four-mode settlement, active-round background recovery and settled-state process persistence are now verified, superseding their earlier pending status above.

### Final source-matched caption build

After the last Web generation released the Cocos lock, `node tools/build-ios.mjs --compile` completed successfully again (`/tmp/f28-native-final-caption-build.log`, `BUILD SUCCEEDED`). This full generation includes the **Erase data** caption and associated privacy wording, all-role atlas, final label insets and unused-resource cleanup. No source revisions were reported after this generation.

Installed the resulting `.app` on iPhone 18 Pro / iOS 27.0, launched it and dispatched the Crew navigation button's touch events. Runtime inspection returned `ready=true`, `page=profile`, balance 10216 and the actual rendered Label string **Erase data**. Inspected `output/native-qa/final-crew.png`: the short caption is legible and clears its ornament; header and footer remain inside the safe layout. Raw check: `output/native-qa/final-caption-ready.json`. The erase action was **not** invoked and saved data was preserved.

The four-mode, active-round background and process-relaunch checks above were performed on the immediately preceding snapshot; this last change only shortens visible text. Those tests were not redundantly rerun on this caption-only build. The final package is still unsigned Simulator development output, not a real-device or App Store release.
