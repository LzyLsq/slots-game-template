# F40 · Fortune Festival / 万福金街

- [2026-10-12：图集裁剪与暗边修正](docs/crop-shadow-20261012.md) · [最终截图](docs/screenshots/f40-crop-20261012/README.md)

Cocos Creator 3.8.8 project. Four fortune houses on a riverside lantern street, with original lacquer, gold, jade and pearl artwork. The playable scenes, reels, controls and effects are Cocos nodes. The browser build is an engine preview; it is not a CSS recreation or a completed native iOS release.

## Git delivery and current screenshots — 2026-10-12

Delivery revision: `f40-gilded-selection-20261012`.

[Current screenshot gallery](docs/screenshots/f40-gilded-selection-20261012/README.md) covers the hall, all four cabinets, service screens and mode loading in two phone proportions. [Hall selection comparison and continuous recording](docs/qa/hall-selection-20261012/README.md) show the selected gold rail and clearing highlights.

The Git delivery includes the F40 project, runtime art/audio, source preparation tools, tests, reports and current screenshots. Dependencies, caches, builds, raw commissions and older image iterations remain outside the commit. Historical reports retain their audit records; media marked as local archives require the developer's existing working directory.

`npm test`, `npm run typecheck` and `npm run typecheck:server` passed for this delivery. Publishing audit: 21/26 checks passed; publisher/legal settings, product IDs, executable native integration and device/production acceptance remain open. The checked export runs, but Creator returned CLI 36 with a worker SIGTERM diagnostic after reporting export completion.

## Latest hall selection refinement — 2026-10-12

Current preview: `f40-gilded-selection-20261012` on port `6040`.

The four house medallions now use a carved gold seat, warm lettering and a reflection clipped to the ornament silhouette. The bottom navigation uses the same carved material instead of its dark circular selected socket. Selection fades keep the existing house, title, hit bounds and scene transitions intact.

See [implementation and verification](docs/hall-selection-20261012.md) and [current screenshots and continuous selection recording](docs/qa/hall-selection-20261012/README.md). The award and music improvements below remain in this preview.

## Latest award and music refinement — 2026-10-12

Award/music revision: `f40-award-music-polish-20261012` on port `6040`.

Two shared musical impacts now drive the cabinet reflections, lettering sweeps, fireworks and reveal coin volleys. The scene fades back to its original controls with one receipt cue and a smooth soundtrack recovery. All 90 sampled-instrument clips have been rearranged and rendered with warmer voicing and lower award playback gains. A feathered, floor-toned reflection helps the continuation hint remain readable on bright small-phone floors.

See [changes, final verification and limitations](docs/award-music-polish-20261012.md) and [final screenshots and continuous recordings](docs/qa/award-music-polish-20261012/README.md). Final layout, language, input and exported-audio checks passed. Creator reported the export finished but returned CLI code 36 with a SIGTERM diagnostic; the checked preview is not a clean CLI exit or native release acceptance. Headphone and phone-speaker listening remains unverified.

## Earlier text, hall and input review — 2026-10-12

Current review: <http://127.0.0.1:6040/?debug=1&screen=home&v=f40-centered-reading-20261012>.

Rules, rule diagrams, terms, privacy and player support use centered reading blocks with complete pagination. Missing service translations have been filled in. The short-phone hall keeps its footer above the navigation and includes the full mode captions in their touch bounds. Header top-up, mail and avatar now have separate touch surfaces measured at 44×44 CSS pixels in the preview; full-length nicknames retain visible wrapping.

See [the findings, current screenshots and verification scope](docs/text-centering-20261012.md). This review also records the remaining visual hierarchy, intermittent frame timing, device audio and native-release limitations.

## Earlier resource readiness refinement — 2026-10-12

That review version: `f40-resource-readiness-20261012`.

Hall startup prepares 14 required sound clips; each cabinet adds its own 19 clips on first entry. Startup and house loading now include sound preparation in real readiness, reuse decoded clips, ignore repeated entry while preparing, and release optional audio failures within one shared 20-second preparation budget. The complete 90-clip soundtrack remains available across all four houses.

See [the change, screenshots and verification report](docs/refinement-20261012.md). The final preview passed 12 resource-readiness checks, 27 audio lifecycle checks, 15 interaction checks and nine startup scenarios. At that check the configured Creator 3.8.8 path was absent, so a separate typecheck used available 3.8.0 declarations. In the subsequent text/input review, 3.8.8 was recovered from the developer's existing archive and the normal client typecheck and export passed. The earlier report retains its original environment evidence.

## Open and run

1. Import this directory in Cocos Creator **3.8.8** and open `assets/scenes/FortuneFestival.scene`.
2. Install project tools with `npm ci`. This workstation currently reuses a local dependency directory; dependencies are excluded from Git.
3. For the verified preview build on this Mac:

```sh
CREATOR_BIN="/path/to/CocosCreator.app/Contents/MacOS/CocosCreator"
"$CREATOR_BIN" --project "$PWD" --build 'configPath=tools/web-mobile-release-build.json'
python3 tools/preview_server.py --port 6040
```

Open <http://127.0.0.1:6040/>. First entry shows login. Local preview supports guest and device-local account flows; those accounts are not production online accounts. `?debug=1&screen=home` opens a review scene. Review paths for a cabinet use `?debug=1&screen=game&game=golden-phoenix` (or the other IDs below). Debug result fixtures are restricted to the local review path and are not natural probability evidence.

Set `CREATOR_BIN` to an existing 3.8.8 installation. This review used `temp/qa-creator-3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator`, recovered from the local archive; that ignored runtime is not included in a clean checkout. Opening/importing the project regenerates the engine declarations. The tested Creator CLI reports `Finished` and exits with code 36. Confirm the build log and generated launch scene rather than interpreting that code alone.

## Four distinct modes

| House / ID | Base game | Feature |
|---|---|---|
| Golden Phoenix / `golden-phoenix` | 5×3, 10 paylines | Five free spins with sticky WILDs |
| Jade Dragon / `jade-dragon` | Five reels, 2–4 active rows per reel, variable ways | Treasure hold feature |
| Pearl Qilin / `pearl-qilin` | 6×4, groups of 8+ anywhere | Up to three cascades at 2×, 4× and 6× |
| Amber Panda / `amber-panda` | Two independent 3×3 boards, five lines each | Three lanterns across the boards trigger three mystery free spins |

Amber Panda splits the displayed total stake equally between the boards. WILD cells are assigned once within an award evaluation. All modes use the actual evaluator for rule copy and payouts. The [difference review](docs/product-differences.md) records changes from F36 beyond replacement artwork.

## Complete local game scope

- Login, guest, local registration, eligibility consent, terms, privacy and support entrances.
- Initial loading, four resource-aware house arrivals, retry/return handling and a lantern-street hall with four selectors.
- Four cabinets, clipped downward reels, central SPIN, separate AUTO, stake controls, rules, sound settings and result history.
- Ordinary, BIG, SUPER, MEGA and EPIC awards. Celebrations keep the current cabinet, guardian and room visible; they do not replace the scene with a detached prize picture.
- Coin shop preview, seven-day check-in, reward wheel, festival album, sample ranking, profile and avatar choice, account switching/deletion and persistent wallet records.
- English default plus Simplified Chinese, Traditional Chinese, Japanese and Korean. Main scenes fit the phone viewport without page scrolling.
- Music, click, spin, stop, feature and tiered award cues, with saved mute settings and background suspension. Two managed music sources crossfade scene changes; steady playback uses one background loop.

The daily festival album counts **settled paid rounds**: five rounds in each house unlock a 400-coin stamp; claiming all four unlocks a 1,600-coin parade reward. UTC day boundaries, account isolation and duplicate-claim protection are tested. Coins are virtual; the local shop and ranking are explicitly previews/examples.

## Awards and probability

An ordinary award returns up to the charged stake. **BIG requires a return strictly greater than that stake**; SUPER starts at 10×, MEGA at 50× and EPIC at 100×. Higher tiers take precedence.

Newcomer benefits count settled rounds across all four houses for one account: round 5 reaches at least 5× and round 10 at least 10× through an **itemised shortfall credit** when needed. Reel results remain natural, and the benefit is disclosed in the result evidence. These benefits are excluded from natural return audits.

Natural sampling uses two million rounds per mode at the minimum and maximum stake. The nominal long-run return target is 96%, with a 0.4 percentage-point rounding tolerance; confidence intervals do not prove an exact 96% return or a fixed chance of profit. See the [probability report](docs/probability.md) and exact Panda enumeration. Nominal RTP, hit frequency and profit frequency are different quantities.

## Original resources and animation

The 42 main image commissions used the user's local **CC Switch compatible image service**, with separate original room continuations and four eyelid commissions. [Image provenance](docs/art-provenance.json) and `art-source/` retain prompts, preparation and registration records. No previous project's image pixels are used. Cabinet source images are 1536×1024, processed proportionally to 2304×1536, then extended to 2304×3072; processing is not native higher-resolution generation.

Each cartoon guardian is registered above its cabinet crown with one silhouette and local head/limb articulation. Its 2,665-vertex mesh preserves a fixed contact rail; eye closure uses aligned commissioned textures. The whole character is not repeatedly scaled to fake animation. Thirty decoded poses per mode and fixed-contact/geometry checks are recorded. See [motion evidence](docs/qa/motion-final/direct-canvas-audit.json); desktop recording cadence is not a measurement of native device frame rate.

There are 90 locally arranged audio clips, including five 24-bar background loops, scene-tuned feedback, per-column stops and four tiers of counting/reveal scores for each cabinet. Original MIDI event scores use sampled piano, brass, woodwinds, strings and percussion, with softened high frequencies. [Audio provenance](docs/audio-provenance.json) records the GeneralUser GS sample source, its license disclosure, arrangement and final signal levels. No commercial game recordings or melodies were extracted. Phone-speaker and headphone listening remains a separate acceptance step.

## Earlier sampled soundtrack — 2026-10-12

That audio revision was `f40-sampled-audio-20261012`; its audit and screenshots are historical. The current revision is linked above. Hall and cabinet music now use 24-bar A / response B / varied A arrangements. Stop, collection, normal-win, feature and tier-upgrade cues follow the active house key. Award music follows the real presentation: counting score, a short accent at each visible upgrade, then a resolving phrase when the amount becomes visible. Early collection triggers that same resolution; scene exit fades the score and restores the background level.

See [soundtrack implementation, sources and verification](docs/sampled-audio-20261012.md). The source tracks and render recipe are retained in `art-source/`. The sample library author's permission and incomplete constituent sample provenance are disclosed in the source record; this local render is not final product rights clearance. Audio playback and phone listening are reported separately.

## Previous grand reveal — 2026-10-12

The visual grand-reveal preview was `f40-grand-reveal-final-20261012`; its artwork and presentation remain in the latest soundtrack preview. Newly commissioned gold rays and spark plumes rise within the live cabinet, while tier upgrades and the final payout produce two distinct crescendos. Proportional painted metal digits replace the plain payout text; a Creator transpilation compatibility fix ensures multi-digit amounts use the actual sprite atlas. Original room, guardian, reels and controls remain visible, and exit coins return to the live wallet position.

See [the implementation and verification report](docs/grand-reveal-20261012.md) and [final screenshots, four continuous recordings and audits](docs/screenshots/f40-grand-reveal-20261012/README.md). The final build passes 32 award fixtures, 10 language/amount fixtures, three interaction checks and four charged/settled debug rounds. Long frame intervals remain in the Dragon entry and Qilin feature path; desktop RAF and recorded frame timing are documented separately. Native device performance, live services, audio listening, payment, signing and App Store review remain unverified.

## Earlier festival arrival and award crescendo — 2026-10-12

The earlier `f40-festival-crescendo-final-20261012` preview uses a Fortune Festival street arrival for startup and four theme-specific mode loading scenes. BIG → SUPER → MEGA → EPIC now builds inside the active cabinet with room-matched additive fireworks, treasure reflections, coin fountains and guardian celebration; the original controls and wallet state return after the reveal.

See [the festival arrival and award report](docs/festival-crescendo-20261012.md) and [that version’s screenshots, recordings and audits](docs/screenshots/f40-festival-crescendo-20261012/README.md). This is a local Cocos preview; native device performance, live services, payment, signing and App Store review remain unverified.

## Earlier award presentation — 2026-10-12

The earlier preview was `f40-award-crescendo-20261012`. Art titles unfold across the cabinet nameplate and upper glass; the visible payout advances BIG → SUPER → MEGA → EPIC at the existing charged-stake thresholds. Wider image-coin fountains, two staggered reveal volleys, crown/treasure reflections and local guardian celebrations build to the final return. Exit coins travel to the live COINS meter while the original cabinet title and controls return. Presentation does not alter settlement or natural probabilities.

See [the change and verification report](docs/award-crescendo-20261012.md) and [that version’s screenshots, recordings and audits](docs/qa/award-crescendo-20261012/README.md). This round covers 32 award layouts, 10 small-phone language/amount fixtures, input/restoration checks and four charged/settled debug rounds. Original-frame timing and remaining performance limits are recorded; these are local Cocos preview checks, not native device acceptance.

## Earlier whole-game polish — 2026-10-12

Hall selection now crossfades the house artwork, art title and rule together, preserves repeated selections and retires outgoing groups after rapid switching. Cabinet meters use clearer baselines and larger digits; short-phone fitting includes the guardian's parent offset and motion headroom. Shop, rewards, ranking and profile spacing has been revised, and authored gentle button compression now takes effect.

See [whole-game polish screenshots](docs/screenshots/f40-polish-20261012/README.md) and [that change and verification report](docs/polish-20261012.md). Historical probability and release audits below retain their original dates and scope.

## Checks and evidence — 2026-10-10

- `npm test`: 13 test suites passed, including 40 cabinet/viewport combinations, rule contracts, real settlement conservation, feature behavior, album and probability checks.
- Client and server TypeScript checks and the Cocos web-mobile build passed.
- Browser QA covers four real entry/spin/settlement/return flows, all 32 large-award mode/tier/phone combinations, startup/retry, five-language rules, loaded services and reel apertures.
- Fresh [hall, cabinets and service screenshots](docs/screenshots/f40-final-20261010/README.md) cover 320×568 and 390×844. Static images verify composition; continuous motion evidence is separate.
- Commands, fixture limitations and output directories are documented in [QA instructions](tools/qa/README.md).

## Native release boundaries

The release audit reports **21/26 automated checks passed**. This is a playable local Cocos game template, **not yet ready for App Store submission**. [Release status](docs/f40-release-status.json) separates verified local work from missing implementation and external acceptance.

Executable iOS Sign in with Apple and StoreKit bridges, publisher/legal URLs, bundle and product IDs, and deployed production services remain to be completed. Server verification, persistence and transaction contracts exist but are not proof of live service availability. iPhone/iPad rendering, frame time, audio listening, signing, Apple login, Sandbox purchases/refunds/restoration, TestFlight and App Store review have not been verified.

F36 was delivered separately in Git commit `b85c58ca721b1b0be8097b18344060683a9e3228`. F40 is delivered independently in the Git repository; current screenshots and verification scope are linked at the top of this README.
