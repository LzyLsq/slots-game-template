# F40 · Resource readiness and full interaction review · 2026-10-12

Review version: `f40-resource-readiness-20261012` · Local Cocos engine preview at port 6040.

## Found and corrected

The initial loader could display **100% with zero decoded sound clips**, while the loading node still blocked entry. Merely opening the hall also prepared all **90** clips, representing about **420.29 seconds of decoded audio**. The [before audit](qa/refinement-20261012/before/resource-audit.json) records this; its `audioBytes` field is an incomplete ResourceTiming sample and must not be treated as total download size.

Sound preparation now follows the destination:

| Entry state | Newly prepared clips | Total cached clips |
|---|---:|---:|
| Hall cold start | 14 | 14 |
| Golden Phoenix first visit | 19 | 33 |
| Jade Dragon first visit | 19 | 52 |
| Pearl Qilin first visit | 19 | 71 |
| Amber Panda first visit | 19 | 90 |
| Revisit any prepared house | 0 WAV requests | Cached total retained |

An independent direct-cabinet cold start prepares 33 clips, including the hall so returning has its soundtrack ready. Hall decoded duration is about **60.80 seconds**. These counts and durations measure work deferred from startup; they are not measured startup-speed or memory percentage claims.

`AudioPalette.audioAssets` selects scenes. `AudioManager.prepare` uses two workers and reuses cached clips and pending requests. Startup and mode loaders count required sound preparation alongside artwork and other readiness work; percentage labels use floor rounding. Optional sound failures release preparation within one shared 20-second budget rather than accumulating per-file waits. The configured budget is a source property; the failure harness accelerates its clock and callback for verification.

## Verification

- **12 readiness checks:** actual WAV request gates, below-100% pending startup, four genuine mode entries, repeated-entry input protection, cached revisits and all-sound timeout recovery. [Report](qa/refinement-20261012/readiness/readiness-audit.json).
- **27 audio lifecycle checks:** four paid and locally settled debug-EPIC rounds, per-column feedback, award count/reveal routing, early collection, mute persistence, crossfade cleanup and engine hide/show. [Report](qa/refinement-20261012/audio-runtime/runtime-audit.json). Forced EPIC is a settlement and presentation fixture, not natural RNG evidence.
- **15 interaction checks:** guest eligibility, hall selectors and reverse swipes, reward duplicate protection, unavailable offline shop/restore, mailbox, profile and five locales, loading failure/retry, four natural paid spin/settlement/return paths, AUTO and local account flows. [Report](qa/refinement-20261012/runtime/runtime-audit.json).
- **Nine startup scenarios:** 390×844 and 320×568, reduced motion, five saved languages and initial failure retry. [Report](qa/refinement-20261012/startup/startup-audit.json).
- `npm run test:win-presentation` passed its stake-boundary, tier/text placement, coin-bound, reveal and exit checks.
- All of the above browser reports contain **zero page errors**. Browser checks use private desktop Chromium contexts and local state.

The earlier-in-this-task layout suite covers hall plus four cabinets at both phone proportions (10 screenshots). The service suite covers six service screens and four real mode loading scenes (16 screenshots). [Hall/cabinet evidence](qa/refinement-20261012/before/) · [Service evidence](qa/refinement-20261012/services-before/). These compositions were unchanged by resource readiness work. Inspected examples showed no obvious reel overflow or text overlap; not all 26 screenshots were manually inspected. Static pictures do not establish continuous animation smoothness.

## Export and engine environment

The first export attempt ran out of disk space. Only byte-identical F40 imported/exported cache files were replaced with independent APFS clones, verified by SHA256; [the cache audit](qa/refinement-20261012/cache-dedup-audit.json) records 360 replacements. Original and unique files were preserved.

The subsequent [final Creator log](qa/refinement-20261012/creator-build-final.log) records the web-mobile task as finished in 19 seconds (CLI exit 36). This export required no manual native-copy recovery. A fresh [export audit](qa/refinement-20261012/build-export-audit.json) matches **222 exported native files** to their imported counterparts and **all 90 WAV files** to the source, with zero mismatches. The built main script includes destination preparation, pending-request reuse and the shared budget.

At final typecheck, the configured `/Applications/CocosCreator.app` path was absent. Its generated declarations therefore could not resolve `cc`, so ordinary `npm run typecheck` did not pass in that environment. The available installed engine is **3.8.0** at `/Applications/Cocos/Creator/3.8.0/CocosCreator.app`; a separate ignored `temp/tsconfig.qa-typing.json` with those official local declarations passed without source changes ([log](qa/refinement-20261012/compatible-engine-typecheck.log)). This is a compatibility check and does not replace a final typecheck with the project’s configured **3.8.8** editor. Project version and generated 3.8.8 configuration were not changed.

## Current screenshots

Pending real sound preparation（本地历史媒体：`qa/refinement-20261012/readiness/loading-awaiting-sound.png`）

Jade Dragon genuine loading（本地历史媒体：`qa/refinement-20261012/readiness/loading-jade-dragon.png`）

Current hall（本地历史媒体：`qa/refinement-20261012/readiness/home-ready.png`）

## Remaining acceptance

Prior recorded long frame intervals in Dragon award entry and Qilin feature presentation remain unresolved; this turn did not profile or change those paths. No 60 fps or native smoothness claim is made. Frame recordings and their limits are in [the grand-reveal report](grand-reveal-20261012.md).

Audio lifecycle state establishes routing and cleanup, not audible output or musical listening quality. Phone-speaker/headphone listening, real iOS interruptions, native performance, signing, live services, StoreKit and App Store review remain separate acceptance work. Soundtrack source and licensing disclosures are in [the sampled-audio report](sampled-audio-20261012.md).

This task did not commit or push F40 to Git.
