# F16 · Treasure Jamboree

A new English-first virtual-coin Cocos Creator 3.8.8 game project. Four destinations: Lucky Chest, Gem Parade, Pearl Party, and Crown Carnival. Coins have no cash value and cannot be withdrawn. This project does not implement real-money gambling.

## Build and run locally

Run from this project directory. Install Cocos Creator **3.8.8** separately.

```sh
npm ci
npm test
npm run typecheck:math
npm run typecheck:server
/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator --project "$PWD" --build "configPath=$PWD/tools/web-mobile-release-build.json"
python3 tools/preview_server.py --directory build/web-mobile --port 4350
```

Open `http://127.0.0.1:4350/`. The build output must exist first; serving source files is not a playable build. The preview server disables browser caching. If the port is occupied, select another free port rather than stopping an unrelated process.

The Creator scene asset retains the technical filename `assets/scenes/GildedExpress.scene` and its original UUID so the build entry remains valid. It is not the displayed game brand. `npm run typecheck` needs Creator-generated `temp/tsconfig.cocos.json`; open/import the project in Creator before using that command. `build-templates/web-mobile` supplies the pre-engine illustrated loading page, engine bootstrap and legal pages. Its background is an optimized export of the new Jamboree plaza art, not an old F16 image.

## Verification boundaries

See [named runtime screenshots](release/screenshots/README.md) for the hall,
login, shop, rewards, ranking, account and all four cabinets captured on
2026-09-20. The [production standard](GAME_PRODUCTION_STANDARD.md) records the
user's design and acceptance requirements, not a claim of release readiness.

Logic tests exercise seeded math, economy persistence, identity verification, rank, geometry, rule definitions and localization. They do not replace integrated browser rendering or real-device testing. Validate each destination, spin mode, reward, insufficient-balance path, navigation, input retention and background/resume on small and large devices. Do not treat a successful source typecheck as proof of a successful Cocos build.

## Native integration and release

`tools/ios-preview-build.json` is an export configuration, not a signed app. Its `com.example.treasurejamboree.f16` identifier is intentionally a placeholder. JavaScript contracts `__JAMBOREE_IAP__` and `__JAMBOREE_APPLE_AUTH__` require native implementation and a deployed verification service. Browser guest coins are not an authoritative paid wallet. Do not simulate a successful payment when those services are missing.

Before a commercial release, supply publisher details, hosted policies, production identity/database configuration, licensed-asset evidence, native Apple login and StoreKit integration, then complete sandbox/TestFlight and physical-device testing. See `release/JAMBOREE_RELEASE_STATUS.md` for the explicit outstanding release gates. `npm run release:audit` is designed to fail while required publisher configuration or evidence is missing. No App Store approval or production readiness is asserted by this repository.
