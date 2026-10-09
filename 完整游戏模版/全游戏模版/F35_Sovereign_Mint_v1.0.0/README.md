# F35 · Sovereign Mint

Cocos Creator 3.8.8 **virtual-coin slots** prototype. F35 opens at a slot-selection hall, not the former coin-strike minigame. Four vault doors in the treasury rotunda remain visible and directly open their corresponding slots cabinet; a foreground mint-guardian lion marks the coin river and responds to touch with decorative coins (no balance changes); adjust BET and press its physical SPIN control. The hall does not display a fake reel result; wagers and awards occur only inside a cabinet. There are no cash prizes or cash-out.

| Slot | Base game | Feature |
|---|---|---|
| Die Forge | 3 × 3; **seven** authored, always-active left-to-right paylines | WILD moves upward for up to three steps; only increased awards pay |
| Emerald Reserve | 5 × 3; 243 ways | Winning cells become WILD; pay only the increment |
| Tidal Exchange | Five reels, each opening 2–4 rows | Three scatters trigger five free tumbling spins |
| Crown Treasury | 5 × 5; eight or more matching symbols anywhere | Winning symbols drop and refill up to four times |

The seven Die Forge lines are the three horizontal lines, two crossing diagonals, and the top–middle–top and bottom–middle–bottom chevrons. The evaluator, rules, paytable, and hall label share that configuration. An earlier timed coin-press interaction was removed because it was not a slots core game. The four cabinet mechanics, services and much of the art/UI infrastructure still descend from the preceding template: this **does not yet establish an independently differentiated App Store product**.

## Build and run

```sh
npm install
npm test
npm run typecheck
npm run typecheck:server
/Applications/CocosCreator.app/Contents/MacOS/CocosCreator --project "$PWD" --build "configPath=$PWD/tools/web-mobile-release-build.json" --dev true
python3 tools/preview_server.py --directory build/web-mobile --port 6040
```

Open `http://127.0.0.1:6040/`. Local-only `?debug=1&screen=home` opens the hall; `?debug=1&screen=game&game=golden-hour` opens Die Forge. On this machine Cocos writes a usable web-mobile artifact and logs `Finished`, but the CLI exits with code 36; verify the output and browser rather than interpreting that exit as a certified release.

## Verification · 2026-09-29

Type checking (client/server), all tests, and 100,000 seeded natural rounds per cabinet passed. Die Forge sample RTP was **95.59%** (95% simulation interval approximately 94.34–96.84%); this finite simulation is not a guarantee or regulatory approval. Manually exercised the built preview at 390 × 844 and 320 × 568: hall selection, cabinet entry, SPIN and result. The four-vault lobby was additionally checked at 390 × 844, 320 × 568 and 430 × 932; all four direct entry targets opened the correct cabinet. The mint guardian was checked at 390 × 844, 320 × 568 and 430 × 932; touching it leaves the hall intact, and every vault entry still works. Guardian captures: [390](docs/screenshots/f35-mascot-20260929/hall-390.png), [320](docs/screenshots/f35-mascot-20260929/hall-320.png), [430](docs/screenshots/f35-mascot-20260929/hall-430.png). Earlier lobby captures: [four vaults 390](docs/screenshots/f35-vault-hall-20260929/hall-390.png), [four vaults 320](docs/screenshots/f35-vault-hall-20260929/hall-320.png), [four vaults 430](docs/screenshots/f35-vault-hall-20260929/hall-430.png). Prior captures: [hall 390](docs/screenshots/f35-slots-20260929/hall-390.png), [hall 320](docs/screenshots/f35-slots-20260929/hall-320.png), [mode selection](docs/screenshots/f35-slots-20260929/emerald-selected-390.png), [cabinet 390](docs/screenshots/f35-slots-20260929/cabinet-390.png), [cabinet 320](docs/screenshots/f35-slots-20260929/cabinet-320.png), [post-spin](docs/screenshots/f35-slots-20260929/post-spin-390.png).

A fifth-settled-spin newcomer promotion raises return to at least 10× that round's bet if necessary, identified separately from a natural reel win. Simulation excludes this promotion. The feature and tiers have existing presentations; their artistic adequacy is still subject to independent device QA.

The four cabinets now carry different original, high-resolution 3D guardian sculptures: golden lion, jade qilin, pearl seahorse, and ruby phoenix. Their feet sit behind cabinet-specific architectural foreground strips rather than floating above the machines. Each bends gently around its planted base in an asynchronous beckoning cycle; reduced-motion preference keeps it still. The hall's existing lion remains distinct from the new cabinet sculptures. Viewport captures at [390 × 844](docs/screenshots/f35-guardian-audio-20260929/golden-hour-390.png) and [320 × 568](docs/screenshots/f35-guardian-audio-20260929/golden-hour-320.png) were saved for all four cabinets. Headroom and title occlusion were checked in the actual web-mobile render, with no page errors.

Audio uses five independently arranged stereo AAC soundtracks: a piano/vibraphone casino lounge, golden-lion muted brass, jade koto/flute, pearl harp/celesta, and ruby strings/horn. Button/deck mechanics, spins/landings, neutral small awards, five graded performances/finales, and coin collection have separate cues. Original MIDI scores are rendered offline with AVAudioUnitSampler and the installed CoreAudio instrument bank; the bank itself is not bundled. These are sampled-instrument renders, not live orchestra recordings. Music/effects/vibration are independently persisted; scene tracks crossfade, celebrations duck the background, and hidden pages stop voices. Files are served from `build-templates/web-mobile/audio/`; the former low-level synthesizer is only a missing-file/first-load fallback. `npm run test:audio:recordings` verifies the actual recorded-source runtime path and all 59 AAC payloads. See [sound design and QA](docs/audio-sound-design-qa.md). Technical decode/peak/loop checks do not establish speaker listening, commercial licensing clearance or physical-device QA.

## Release boundary

`npm run release:audit` remains blocked. Publisher/legal URLs and texts, product IDs, executable native StoreKit/Apple sign-in, real-device and TestFlight acceptance, and **F34/F35 product distinctiveness** require independent completion. `tools/ios-preview-build.json` includes a placeholder bundle ID. Do not claim App Store readiness or real-money gambling eligibility. See [product review](docs/PRODUCT_DISTINCTIVENESS_REVIEW.md).

大厅/柜机动态细节与边界验收：[`docs/treasury-life-qa.md`](docs/treasury-life-qa.md)。
