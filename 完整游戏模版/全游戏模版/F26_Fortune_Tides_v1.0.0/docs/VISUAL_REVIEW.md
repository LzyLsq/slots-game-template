# F26 visual revision — 2026-09-18

Reference review: F13, F14, F15, F17–F23 screenshots and S05 cabinet artwork. No F16 screenshot was available in the reference set.

## Implemented
- Continuous illustrated harbor with four physical destination plaques; native DOM text remains localized and interactive.
- Four new integrated cabinet masters: wood/gold galleon, pearl/rose gold shell, jade/crystal grotto, sapphire/enamel lighthouse. Each contains its own glass aperture, physical wager/history plaques and central spin jewel. Transparent interactive controls align with those materials.
- Shared illustrated treasury architecture for shop, gifts, ranking, mail and profile.
- Dedicated treasure award plaque, animated amount, rays and coin/gem burst; ordinary wins retain cabinet feedback. Payline rendering follows evaluated winning cells.
- Five-language destination fitting and daily amount interpolation fixed.

## Verification
- 27 automated math/service/localization tests passed.
- Four actual browser spins completed without a stuck busy state.
- Five languages at 320 and 414 CSS pixels across seven screens: no checked horizontal DOM overflow.
- Sixteen navigation cancellations during spinning completed without browser errors.
- Visually reviewed four cabinets, Chinese services/rules, award plaque and five-language 320px lobby captures. DOM overflow checks alone do not prove all artwork insets.
- big-win-preview.png is a developer-triggered presentation preview; it does not credit wallet coins.

- Whole wager plaques open 48px wager choices; all four modes verified at 320px with real clicks, rules close and return navigation.
- Six isolated illustrated UI icons replace mismatched symbols; decorative stars use CSS shapes to avoid WKWebView font gaps.

## Remaining release gates
Browser and native development builds, not an approved App Store build. Simulator and unsigned arm64 builds pass; details and evidence are in IOS_READINESS.md. Native purchases, signing, authoritative wallet and physical iOS device acceptance remain release work. Rankings identify sample opponents, and shop purchases remain unavailable.

## Treasure richness revision — 2026-09-18
- Repainted the harbor with integrated coin banks, overflowing chests and gold around all four destinations, preserving their nameplates and the central walkway.
- Added two isolated transparent treasure assets to cabinet foreground corners, shop bundles and daily gifts; decorative glints do not intercept input and respect reduced motion.
- Verified the updated harbor, shop and cabinet artwork screenshots; automated five-language layout, artwork text-inset and four-mode wager/rules/return checks passed. All 27 tests and production build passed. Updated web assets were synced into the iOS project; this revision was not separately device-tested.

## Materials and motion revision — 2026-09-18
- Added engraved wave materials, ivory/gold edge lighting and teal enamel across controls, sheets, account, letters, rules and loading. Retained isolated illustrated navigation icons.
- Added bounded button reflections, pressed depth, selected-icon settling, localized harbor water reflection/light rays and ten decorative motes. All decoration ignores pointer input and respects reduced motion; backgrounding pauses CSS animation.
- Five-language 320/414px layout checks, physical control text insets, four-mode wager/rules/return checks and 27 unit tests passed. Browser screenshots updated; no physical-device frame-rate claim.

## Detail and localized animation revision — 2026-09-18
- Re-rendered harbor detail while preserving four destination plaques; stored lossless WebP. Image service returned 1024×1536 despite requesting 1536×2304; this is a detail revision, not a high-resolution asset upgrade.
- Removed stacked title glow and softened icon shadows. Reel canvas now supports devicePixelRatio up to 3, verified at 862 backing pixels for 287.34 CSS pixels.
- Added localized coin flips, pearl rings, crystal highlights, lighthouse sweep, water rings, precise treasure glints and mode-specific cabinet crown/rim accents. Added bounded, short-lived pointer feedback with no input interception.
- Browser video records home animation, real cabinet entry/spin and reduced-motion behavior. Five-language overflow and physical text-inset checks passed; four-mode wager/rules/return checks and all 27 unit tests passed. No physical-device FPS claim.

## S05 reference motion pass — 2026-09-18
Inspected S05 candy-v2 cabinet-master-v3-tall artwork and SlotGame.ts spinReel, spawnReelGhost, spawnSpinBeam, reelStopBurst and danceWinningSymbols. Adapted its coordinated column motion, stretch, trails, landing pulse and winning-symbol dance into F26's continuous deterministic strip renderer. F26 retains its own four rulesets and harbor art.

Replaced repeated cell-window scrolling with continuous column strips; held coins retain individual protected apertures. Added speed-dependent stretch/trails, subtle curved-edge compression, traveling highlights, 210ms sequential landing recoil, localized stop light and winner bounce/rings. All canvas drawing remains inside glass clipping; reduced motion skips kinetic effects. Glass reflection uses low-opacity light only, without a dark cabinet overlay.

Validation: 27 tests passing, four browser spins completed, video recorded, production build and native web-resource sync successful. This is a motion refinement, not a claim of full S05 visual parity or physical-device performance certification.

## Symbol alignment and control fittings — 2026-09-18
- Measured the largest connected alpha silhouette of each symbol. Ruby art includes a detached bottom remnant: renderer now uses source bounds [34,8,187,177] rather than the full 256-square canvas. All eight source silhouettes are fit proportionally into a centered cell box. Resting symbols no longer independently bob vertically.
- Increased continuous reel travel from 10+2c to 18+3c symbols over the same duration; increased speed-dependent stretch and ghost strength while retaining gradual braking, exact outcomes and protected locked-coin apertures.
- Added theme-tinted cabinet lantern breathing, narrow moving metal reflections and six localized embers. Layers remain noninteractive and obey reduced-motion settings.
- Added vector control fittings for back, rules, spin, history, rename, gifts and home; preserved existing illustrated navigation icons and cabinet control hit areas. Sound controls and service/footer controls have 44px minimum height. Form submit fittings are scoped to forms, avoiding accidental decoration of wager selectors.
- Verified the four cabinet screenshots after changes. Added centered-silhouette renderer test: 28 tests pass. Five-language 320px cabinet text insets and four wager/modal/back flows pass. Browser validation does not substitute for physical-device performance acceptance.


## 2026-09-18 · Four distinct voyages

32 mode-owned sprites replace the shared reel set. Source sheets generated through the previously authorized CC Switch workflow; isolated connected components, normalized optical bounds and 256px alpha canvases prevent neighboring art from leaking into cells. All five languages now use each mode's names in the paytable, symbol tap and award breakdown.

Reels use integrated cosine acceleration/deceleration, distinct mode profiles and finite winner choreography. Pearl paths are confined to individual award groups; Reef count wins do not imply adjacency. Fixed the exact multiplier display, short-height lobby title inset and award particle z-order. See SESSION_ACCEPTANCE.md and ACTUAL_AWARDS_QA.json for evidence and remaining release gates.


## 2026-09-18 — painted controls and scene-first lobby
- Replaced green utility/header/button panels with raster ivory, gold, amber and wood materials; twelve new dimensional control icons.
- Removed lobby wallet/subtitle/daily-reward backing cards. Existing signs are part of the painted scene; reward chest is a direct target on the pier. Short screens show destination titles within the painted plaques.
- Loading uses existing high-resolution harbor art, bounded image progress fill driven by real loading, no artificial dwell. Two new-background requests failed upstream; no failed output ships.
- Verified five languages at 320/414 widths, 34 unit tests, button navigation and loading bounds; screenshots loading-premium.png and home-premium-320.png. No page errors.
