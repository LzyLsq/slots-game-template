# F28 · Treasure Regatta

Independent four-mode Cocos Creator 3.8.8 / TypeScript virtual-coin game. The web build is playable, with original Treasure Regatta scenes and artwork. **This is not yet an App Store submission build.** No previous F16 project or artwork was copied into this directory.

## Implemented

- Four independent virtual-coin rules engines: 3×3 center line, 243 ways, five-line hold-and-respin, and 5×5 cluster cascades.
- Twenty-four separate themed symbol definitions; exact winning-cell evidence, feature frames and payout breakdowns.
- Integer wallet, persisted pending outcomes, idempotent settlement/recovery, revision protection, daily reward and settings state.
- Auto-spin coordinator with background cancellation and explicit animation acknowledgements.
- Frame-rate-independent continuous reel trajectories, ordered stops, precise final cells, and stable pointer/drag cancellation.
- Container-relative layout calculations; background and cabinet use the same world scale. Four-mode controls were exercised at three browser phone sizes; physical-device acceptance remains open.
- Eighteen original sculpted control faces: four mode-specific main actions, automatic/turbo instruments and twelve harbor/service roles. Stable touch targets, drag cancellation, disabled states and material/label press feedback share one coherent style.

## Build and run

Open this directory in Cocos Creator 3.8.8 and run the TreasureRegatta scene, or build from a terminal:

```sh
npm ci
node tools/build-web.mjs
python3 -m http.server 4887 --directory build/web-mobile
```

Open localhost port 4887. Guest progress is stored locally. Production accounts and purchases are deliberately not simulated as real services.

The build wrapper preserves generated caches in a unique temporary backup before rebuilding; this avoids the importer-registration failure observed with repeated headless builds on this host. Set `COCOS_CREATOR` to override the editor executable path. Cocos-generated splash branding is retained.

## Run checks

```sh
npm ci
npm run typecheck:core
npm test
npm run simulate
```

The simulation reports observed outcomes, not certified RTP. Paytable/volatility tuning remains in progress.

## Remaining work

The runtime includes guest entry, marina boarding, four playable cabinets, local records, daily rewards, shop availability information, crew profile, settings, paginated rules/payouts and per-round winning evidence. The original audio is synthesized locally. Buttons have stable touch targets and release feedback; reel strips use fixed pools, staged trajectories and separate cascade/hold presentations. An unsigned iOS Simulator build has launched the game and settled a round; this is not distribution or physical-device validation. Release services and full acceptance testing remain incomplete; see the verification matrix rather than treating this feature list as release approval.

Local persistence is single-session development storage, not a tamper-proof or multi-client server ledger. Daily rewards use local UTC date and need server time for production. Production authentication, wallet authority, StoreKit integration, privacy/terms/support configuration, asset licenses, native signing and physical-device tests are external release requirements, not completed features.

See [design](docs/DESIGN.md), [reference audit](docs/REFERENCE_AUDIT.md), [assets](docs/ASSETS.md) and [verification](docs/VERIFICATION.md).
