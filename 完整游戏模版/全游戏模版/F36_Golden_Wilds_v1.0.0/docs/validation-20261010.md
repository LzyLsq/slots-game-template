# F36 natural wildlife motion · 2026-10-10

Current revision: `f36-natural-swim-20261010`. This report separates current runtime checks from earlier evidence. Desktop emulation does not certify native performance or App Store readiness.

## Delivered behavior

- The hall's four cartoon guardians remain a golden lion, emerald elephant, lotus koi and russet fox. They were commissioned in the preceding wildlife revision through the locally selected CC Switch image provider. No artwork PNG was regenerated or repainted for this refinement.
- Koi no longer use the generic eyelid animation. Tail, fins and gentle body motion share a swimming rhythm with phase offsets; the eye follows the head without closing or being squeezed. Other guardians retain their existing themed gestures.
- Every guardian uses one transparent animal cutout and a connected 64×40-cell Cocos Sprite mesh. Architecture, treasure and contact rails stay fixed. The clock does not reset at idle/spin/win transitions; response strength eases into the ongoing gesture. There are no pose swaps, crossfades, image scaling or ghost trails.
- Static vertex influence weights are cached and output arrays reused. Joint sine/cosine values are calculated once per update rather than per vertex. Cached output is compared with the reference calculation. This removes redundant work; no renderer FPS improvement is claimed.
- Complete cabinet bounds now include current animal silhouettes and a movement margin. Short screens use a slightly smaller complete cabinet to show the whole character and keep the treasury clear of the footer. The obsolete 60% minimum glass-width check is replaced by 58%; individual parts retain their measured artwork proportions and registration.
- Eight guardian-base/skin texture importers now clamp both axes at their edges. Repeat sampling previously exposed a faint straight seam along the panel border during linear filtering. The installer preserves importer UUIDs and applies the same clamping for future imports; it was not rerun this turn.
- The preceding shared index-buffer capacity repair is retained. Ordinary sprites and labels drawn after a guardian have reserved index capacity, preventing the previously observed typed-array overflow.

See [asset provenance](asset-provenance.md), [product differences](product-differences.md) and the [current evidence index](screenshots/f36-natural-swim-20261010/README.md).

## Current checks

| Check | Result and evidence |
|---|---|
| TypeScript | Passed for the final runtime changes. [Log](screenshots/f36-natural-swim-20261010/typecheck.log) |
| Layout assertions | 40 theme/viewport combinations pass. Includes current alpha-derived silhouette tops, motion margins, complete treasury bounds and reel-aperture geometry. [Log](screenshots/f36-natural-swim-20261010/layout-test.log) |
| Phone and desktop composition | Hall and all four cabinets at 390×844, 320×568, 794×883 and 1366×768: 20 captures, no reported page errors. Full-size cabinet captures were refreshed from final idle recordings; other composition captures use a neutral mesh. [Report](screenshots/f36-natural-swim-20261010/layout-capture.json) |
| Geometry continuity | Four themes × 15 simulated seconds at 60 Hz. All 2,665 vertices and every triangle checked: no folding. Maximum vertex steps are 1.425, 1.322, 0.588 and 1.417 panel pixels respectively. Cached/reference difference is zero or floating-point epsilon. Static binding is reused; koi eyelid deformation is absent even under a forced generic blink input. [Report](screenshots/f36-natural-swim-20261010/guardian-geometry.json) |
| Cocos build | Final log reports `web-mobile Finished in (9 s)`. Creator returned workstation exit 36; the resulting renderer was subsequently exercised. [Log](screenshots/f36-natural-swim-20261010/cocos-build.log) |
| Actual canvas motion | Four idle/celebration and four charged/settled debug-SUPER recordings. Idle samples contain 98–99 distinct gestures; spin samples contain 109–143. Parent position, scale and angle remain fixed. All four rounds finish unlocked. No application exceptions, console errors or failed game-resource reads were captured. The harness keeps 36 cancelled reads from its own temporary video decoders separately as `captureCleanupAborts`. [Report](screenshots/f36-natural-swim-20261010/motion/direct-canvas-audit.json) |
| Visual review | Twenty current composition captures, four idle pose sheets and four spin/award pose sheets reviewed. No duplicated anatomy outlines, displaced panel borders or panel-edge seams observed in the reviewed frames. [Evidence](screenshots/f36-natural-swim-20261010/README.md) |
| Reduced motion | All four modes at 320×568: exact neutral points, zero gesture, fixed scale/angle and no page scroll. [Report](screenshots/f36-natural-swim-20261010/motion/reduced-motion-audit.json) |
| Complete local interactions | 15 groups pass: consent, reverse swipes, duplicate reward protection, unavailable shop/Apple handling, rank/mail, avatar/locale/account actions, mode-loading failure/retry recovery, four real spins and shared-wallet settlement, AUTO, rules, audio lifecycle, local registration/sign-in/out, no page scroll or browser errors. [Report](screenshots/f36-natural-swim-20261010/interaction/runtime-audit.json) |

## Current recording limits

Eight final WebM files were decoded sequentially using original timestamps. The koi GIF selects a preceding source frame every 100 ms without interpolation, blending or retiming; it is a viewing aid rather than proof of frame rate. Original WebM files retain the recorded cadence. Source-frame gaps range up to 36–71 ms across these desktop recordings. Requested canvas capture cadence is 30 Hz; neither this setting nor those timestamp gaps establish native device frame times. See [decoding metadata](screenshots/f36-natural-swim-20261010/motion/sequential-decoding.json).

Idle series include a celebration trigger after 6.6 seconds. Debug-SUPER spins exercise local charging and settlement through the real round flow, but the controlled results do not demonstrate natural jackpot probability. The implementation is continuously deformed 2D bitmap skinning through the installed Cocos Sprite assembler, not a 3D skeletal character. Earlier human atlases and optical-flow/crossfade recordings are superseded history and are not shipped.

## Earlier complete-page checks (superseded character art)

| Check | Result and evidence |
|---|---|
| TypeScript typecheck | Passed for the final source revision |
| Cabinet layout | 32 size/theme combinations passed; full crown and footer separation checked by `tools/layout-test.ts` |
| Cocos build | Final log reports `web-mobile Finished in 1 min 45 s`; the resulting renderer was subsequently exercised. The local Creator command returned exit 36, so exit status alone was not used as proof. [Build log](qa-20261010/web-build-final-layout.log) |
| Phone rendering | Hall and all four modes captured at 390×844 and 320×568; 10 current captures, no reported browser errors. [Layout report](screenshots/f36-cartoon-fortune-20261010/layout-capture.json) |
| Startup and recovery | Three viewport/motion startup cases plus injected failure/retry passed; progress completed, input recovered and startup overlay removed. [Startup report](screenshots/f36-cartoon-fortune-20261010/startup/startup-audit.json) |
| Complete local interactions | 15 groups passed: consent, repeated hall swipes, duplicate reward protection, unavailable shop/Apple service handling, rank/mail, avatars/locales/account, mode failure recovery, all four real spins and balance settlement, AUTO, rules, audio lifecycle, local sign-in/out, no page scroll or errors. [Runtime report](screenshots/f36-cartoon-fortune-20261010/interaction/runtime-audit.json) |
| Character motion | Four idle/gesture and four charged/settled debug-SUPER recordings. Idle samples contain 33–42 distinct poses; spin/award samples contain 38–42. Crown position/scale/angle stayed fixed. Debug award fixtures are labelled and do not demonstrate natural jackpot probability. [Canvas report](screenshots/f36-cartoon-fortune-20261010/motion/direct-canvas-audit.json) |
| Five languages | All four modes × English, Simplified Chinese, Traditional Chinese, Japanese and Korean: 20 cases passed at 320×568; rank captures also refreshed. [Locale report](screenshots/f36-cartoon-fortune-20261010/locales/locale-audit.json) |
| Reduced motion | All four modes retain neutral frame zero with fixed scale and angle, and no page scroll. [Motion preference report](screenshots/f36-cartoon-fortune-20261010/motion/reduced-motion-audit.json) |

The earlier screenshots were reviewed after the footer rebuild. They document layout but contain the superseded motion bake. Current animal appearance and motion should be assessed using the wildlife evidence index above. Static images establish composition and registration only.

## Remaining boundaries

Current full interaction, composition and guardian-motion checks were repeated. Exhaustive per-mode five-language screenshots, startup delivery-gating tests, gameplay math/RTP sampling and production service checks were not all repeated for this refinement. Earlier reports remain historical evidence; see [the preceding report](validation-20261009.md).

No F36 commit or push was made for this request. Native iOS build/signing, device performance, real Apple sign-in, StoreKit, production services, rights clearance and App Store review remain unverified by these local checks. See [release checklist](release-checklist.md).
