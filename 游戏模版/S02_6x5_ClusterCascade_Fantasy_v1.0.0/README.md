# S02 — 6×5 Cluster Cascade Fantasy Slot

High-polish Cocos Creator 3.8.8 master template for a Cluster Pays slot. It is a different game family from S01: there are no paylines. Five or more matching symbols connected vertically or horizontally win, disappear, and refill from above.

## Playable features

- 6 columns × 5 rows
- Four-direction connected-cluster search, minimum cluster size 5
- Wild rune participation and Scatter-ready symbol
- Cascading removal, gravity refill and `1× → 2× → 3× → 5×` multiplier progression
- Animated balance counting and an image-based coin stream into the balance bar
- Rules, recharge, sound, auto-play and home controls
- Dedicated loading, rules, recharge and premium win presentations
- Commercial image-based HUD, bet console, spin control, result ribbon,
  utility controls and cascade multiplier rail
- Generated illustrated home, sound, rules, auto, plus and minus controls with
  optical alignment for their destination frames
- Interactive spin states (`READY`, `SPINNING`, `CASCADE`, `WIN`), animated
  arcane aura, multiplier energy advance, touch feedback and premium tooltips
- Generated `TREASURE BURST!` and `LEGENDARY CASCADE!` artwork with restrained
  crystal effects, a dense coin stream and linear balance growth
- CC API-generated transparent UI and special-symbol artwork with packaged legacy fallbacks
- Responsive composition at a 750×1334 design resolution, including covered
  ultrawide backgrounds and safe narrow/tall viewport scaling

## Run

Open the directory in Cocos Creator 3.8.8 and run `assets/scenes/Main.scene`, or build for Web Mobile.

## Production hooks

- Replace the demo RNG in `assets/scripts/SlotGame.ts` with a server-authoritative outcome.
- Connect the home and recharge buttons to the host application bridge.
- Tune `SYMBOL_VALUES`, `MIN_CLUSTER`, bet options and multiplier steps for the product math model.
- All included third-party artwork is documented in `THIRD_PARTY_ASSETS.md`.
- AI artwork provenance and regeneration notes are documented in `ASSET_GENERATION.md`.
