# F34 · Aurum Atelier

[Current Git delivery screenshots · 2026-10-09](docs/screenshots/f34-git-delivery-20261009/README.md)

![Current screens](docs/screenshots/f34-git-delivery-20261009/delivery-gallery.jpg)

A Cocos Creator 3.8.8 virtual-coin slot game set in an original goldsmith's atelier. Four cabinets have separately commissioned art, symbol sheets, controls, feature rules and mode arrivals. The browser build is a local preview of the Cocos game, not a separately implemented H5 game.

| Cabinet | Base game | Feature |
|---|---|---|
| Coin Engraver | 3 × 3, five left-to-right paylines | Three minting dies open a three-reset hold-and-spin Mint Reserve; collected values pay once. |
| Sapphire Faceter | 5 × 3, 243 ways | A Wild makes its row and reel Wild for one re-evaluation; only the increase pays. |
| Pearl Loom | 5 × 4 changing ways | Three Scatters grant five free spins; wins tumble for up to three additional drops with 2×/3×/4× progression. |
| Crown Foundry | 5 × 5, qualifying 8+ symbol counts | A Wild expands its reel for one re-evaluation; only the increase pays. |

Each cabinet and its surrounding workshop room share a newly commissioned environment painting (`art-source/regenerate_guardian_cabinets_ccswitch.py`). Its carved lower alcove reserves a real plinth for a separate fortune guardian, with a solid shoulder and independently moving paw or wing (`art-source/prepare_guardian_motion.py`). Pearl/Ruby now use complete newly commissioned characters, with each body and moving limb extracted from its own master (`art-source/prepare_guardian_coherent.py`); the pearl gift sits independently on the plinth. The cabinet glass, frame, controls and room retain one perspective and material palette. The original synthesized instrumental score (`art-source/compose_audio.py`) uses upbeat major-key casino celebration throughout: 116 BPM piano/brass swing in the salon, 124 BPM coin-chime shuffle for Coin Engraver, 118 BPM guitar/vibes Latin swing for Sapphire Faceter, 114 BPM piano/harp gala swing for Pearl Loom, and a 126 BPM royal brass parade for Crown Foundry. All four cabinets have their own BIG/SUPER/MEGA/EPIC counting and resolution cues; the exact amount reveal starts the ending, and early collection fades it with the scene. Button/reel, ordinary and feature cues remain. The sound switch mutes effects and music; backgrounding pauses playback. Browser music may begin after the first user gesture because autoplay is restricted.

The game includes initial and four mode-specific loading scenes, local guest/account entry and eligibility consent, legal and support pages, a swipeable hall, rules, four animated cabinets, spin/auto/bet controls, ordinary and tiered award presentations, audio settings, daily rewards, clearly labelled virtual-friend ranking, portrait selection, account data, and a store that shows unavailability when purchases are not connected. English is the default language. Virtual coins have no cash value.

Current preview: **f34-whole-game-polish-v6-20261009**. Open [the salon](http://127.0.0.1:6035/?debug=1&screen=home&v=f34-whole-game-polish-v6-20261009) or [Crown Foundry](http://127.0.0.1:6035/?debug=1&screen=game&game=ruby-revel&v=f34-whole-game-polish-v6-20261009). See the [whole-game changes and verification](docs/whole-game-polish-20261009.md) and [current screenshots, recordings and reports](docs/screenshots/f34-whole-game-polish-v6-20261009/README.md).

## Run and verify

Open this directory in **Cocos Creator 3.8.8**. Build `web-mobile` with `tools/web-mobile-release-build.json`; serve the resulting build with:

```sh
python3 tools/preview_server.py --directory build/web-mobile --port 6035
```

Visit `http://127.0.0.1:6035/`. `?debug=1&screen=game&game=golden-hour` is a local visual QA route; the other IDs are `jade-treasury`, `pearl-palace`, and `ruby-revel`. From the project directory, `npm ci`, `npm run typecheck`, and `npm test` verify the client and rule contracts. `npm run test:rtp` is a seeded estimate, not a promise of future returns. `npm run release:audit` intentionally reports release blockers until publisher, native and production requirements are fulfilled.

## Award presentation

The presentation uses the stake actually charged for the round, including a recovered round. A positive return up to and including the stake retains ordinary feedback; any return strictly greater than the stake qualifies for a grand presentation. Higher tiers remain:

| Actual total return | Presentation |
|---|---|
| `0 < return <= charged stake` | Ordinary award / bet returned |
| `charged stake < return < 10 × charged stake` | BIG WIN |
| `10 × stake <= return < 50 × stake` | SUPER BIG WIN |
| `50 × stake <= return < 100 × stake` | MEGA WIN |
| `return >= 100 × stake` | EPIC WIN |

Four newly commissioned treasure rooms match the mint, sapphire, pearl and crown workshops. The complete cabinet remains behind an opaque treasure room revealed from top to bottom through a rectangular aperture over 0.85 seconds. The room itself stays stationary. Exit reverses the current aperture progress over 0.42 seconds; an early exit cancels the entrance tween, and reduced motion displays the whole room directly. Art titles keep a fixed position and scale; a 2.8-second lettering sheen stays inside the raster letter shapes. Three image-coin layers supply the larger celebration: mixed-size continuous fountains, an amount-reveal volley and a second volley 0.65 seconds later. Independent inner and outer throws form broad plumes from the room’s treasure. Soft light fans and floor reflections build with the two reveal crests; flying coins catch local glints, the payout’s gold shoulders light up, and a reveal sweep stays inside the title lettering. Fountain density, flight height, reveal coins and jewel lighting increase through BIG, SUPER, MEGA and EPIC. Coin paths keep the caption, number plinth and collection controls clear. A dedicated 192 × 179 derivative of the original coin image improves small-sprite sampling.

The caption, payout and collection controls enter in sequence. A first tap reveals the full amount without jumping the visual clock; the next tap closes the aperture back to the cabinet. Automatic completion and reduced motion remain supported. The presentation shows coins already settled to the wallet and does not pay them again. Symbol frames, feature sequences, ordinary awards, welcome bonuses and themed music remain.

The [preceding grand-wealth changes and verification](docs/grand-wealth-20260930.md) and [four-theme and small-screen evidence](docs/screenshots/f34-grand-wealth/README.md) document the preceding 2026-09-30 revision. The [Pearl BIG recording](docs/screenshots/f34-grand-wealth/motion/pearl-complete-with-audio.webm) uses a seeded real settlement. The [Crown EPIC recording](docs/screenshots/f34-grand-wealth/motion/crown-epic-complete-with-audio.webm) uses an isolated reward fixture. Both capture the actual Cocos animation and the unchanged festive score on one clock.

The [preceding choreography changes and verification](docs/gilded-crescendo-20260930.md), [four-theme and small-screen captures](docs/screenshots/f34-gilded-crescendo/README.md), and [Pearl BIG transition with actual game audio](docs/screenshots/f34-gilded-crescendo/motion/pearl-award-transition-with-audio.webm) document the preceding choreography revision with its earlier score. The [Crown EPIC clip](docs/screenshots/f34-gilded-crescendo/motion/crown-epic-award-with-audio.webm) uses a clearly labelled isolated reward fixture. Seven runtime cases passed; complete Pearl BIG and Crown EPIC recordings cover automatic resolution, cleanup and return to the salon. The [earlier natural-transition changes](docs/seated-awards-20260930.md) and [award rules and boundary verification](docs/wealth-awards-20260930.md) remain historical records. Deterministic QA fixtures do not change production randomness or establish natural award frequencies.

The [complete guardian reconstruction and live verification](docs/guardian-coherent-20261009.md) records the current Pearl/Ruby art, same-source shoulder assembly, grounded pivots and independent pearl offering. The [v3 anatomy record](docs/guardian-anatomy-20261008.md) is superseded and retained as history.

## Current render

**Whole-game v6, 2026-10-09**, refines the existing theme across login, registration, hall, service pages, dialogs, four cabinets and four arrivals. Sixteen interface image crops and their usage now match the intended artwork. Ivory/gold materials support service text and legal links; rules headings use clearer dark ink. Cabinet numerals keep fixed baselines, utility icons and controls have larger touch regions, and each arrival has a separate composition. Resource failure, retry, return, repeated entry and input cleanup were checked in disposable contexts.

The [whole-game report](docs/whole-game-polish-20261009.md) records the changes and verification boundaries. [Current evidence](docs/screenshots/f34-whole-game-polish-v6-20261009/README.md) includes 112 visual states across 390 × 844 and 320 × 568, a further 20 fresh dialogs at 390 × 844, 18 grouped service/account operation checks, seven gameplay/audio cases, and AUTO checks for all four modes. These are local browser checks; layout bounds and a successful build do not establish visual or commercial quality. Screenshots and continuous recordings were also reviewed.

The [current Pearl video](docs/screenshots/f34-whole-game-polish-v6-20261009/gameplay/motion/pearl-live-video.webm) and [separate captured game audio](docs/screenshots/f34-whole-game-polish-v6-20261009/gameplay/motion/pearl-live-audio.webm) document the final aperture choreography, rotation, awards and restoration. They are separate recordings, not a combined synchronized clip. Deterministic outcomes are isolated QA fixtures; they do not modify production randomness or establish natural award frequencies. Loading screenshots use a fixed progress value for composition only.

The mascot foundation remains [grounded-v5](docs/guardian-polish-20261009.md) with [coherent-v4 art and shoulder assembly](docs/guardian-coherent-20261009.md): Pearl opens and settles its wing; Crown lifts its paw, beckons twice and returns, with contact shadows anchored to the plinth. [v5 captures and recordings](docs/screenshots/f34-guardian-polish-v5-20261009/README.md) are preceding evidence for that retained component, rather than screenshots of the final whole-game revision. Their response probes are component checks, not gameplay wins.

The retained soundtrack is [rounded festive audio, 2026-10-08](docs/soft-audio-20261008.md). All 44 clips keep the cheerful themes with softer bell/brass harmonics, less sharp attacks and gentler reveal accents. The [source audition](docs/audio/f34-soft-audio/soft-music-preview.wav) remains useful for listening; final runtime audio is linked above.

Earlier [grand-wealth](docs/screenshots/f34-grand-wealth/README.md), [festive-score](docs/screenshots/f34-festive-score/README.md), [gilded-crescendo](docs/screenshots/f34-gilded-crescendo/README.md), [seated-awards](docs/screenshots/f34-seated-awards/README.md), [theme-score](docs/screenshots/f34-theme-score/README.md), and [integrated guardian captures](docs/screenshots/f34-integrated-guardians/) are historical comparison records with their earlier visuals or audio. Desktop preview checks do not replace mobile-device acceptance.

## Release boundary

This is a playable local template, **not an App Store accepted commercial release**. Real Sign in with Apple and StoreKit need native bridges and sandbox testing. Publisher-controlled legal/support URLs, product IDs, deployed service, signing, privacy disclosures, real-device performance and platform review remain unverified. The offline store does not grant coins or pretend a purchase succeeded. Code and image generation inputs are in `assets/` and `art-source/`; generated art belongs to this theme and no prior game's image is deliberately reused.
