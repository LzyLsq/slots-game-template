# S03 Astral Vault — 5×3 Hold & Win

Version 1.0.0. A responsive Cocos Creator 3.8.8 slot template for desktop and mobile browsers.

## Included gameplay

- Traditional 5×3 reels with 20 fixed paylines.
- Animated reel acceleration, symbol cycling, elastic stops and tap-again quick stop.
- Six or more STAR COINS trigger Hold & Win.
- The feature starts at 3 respins; every new locked coin resets the counter to 3.
- MINI, MINOR, MAJOR and GRAND coin awards, plus full-board GRAND.
- A clearly labelled `TRY FEATURE DEMO` in Rules; demo results do not alter balance.
- Auto 10, Turbo, sound, responsive home button, virtual-credit recharge and local persistence.
- Image-led loading, feature intro, lock impacts, coin flights, win counter and restrained celebration.

## Run

Double-click `RUN_GAME.command`, or open this directory in Cocos Creator 3.8.8 and build Web Mobile. The included desktop build is under `build/web-mobile`.

## Verify math

```bash
npm ci
npm run test:math
```

The current deterministic 200,000-spin report is documented in `TEST_REPORT.md`.

All credits are virtual and have no cash value. CC Switch credentials are not stored in the project.
