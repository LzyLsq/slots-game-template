# S01 · 3×3 Center-Line Arcade Slot Template

A reusable Cocos Creator 3.8.8 + TypeScript slot-game factory rebuilt from the supplied Unity project. Each product launches one configured theme, with no player-facing theme switcher.

## Open and run

1. Open Cocos Dashboard.
2. Import this folder as a project.
3. Use Cocos Creator 3.8.8.
4. Open `assets/scenes/Main.scene`.
5. Press Preview.

## What is included

- Three reels and three visible rows
- One fixed default theme per product, selected in `themes.json`
- Auto Spin/Stop, Sound/Mute and Paytable/Rules controls
- Exact configurable win rate and near-miss rate
- Weighted symbols loaded from per-theme JSON
- Eleven original Candy/Food symbols for noticeably richer reel variety
- Bet selection, persistent coins, win calculation and payout
- Spin/win/coin audio
- Staggered reel stops, elastic landing motion and responsive buttons
- Win-line flash, screen shake, particle burst, win banner and coin count-up
- Animated themed loading screen with logo rays, gold dust and progress feedback
- Persistent golden marquee bulbs, reel sweeps, drifting sparkles and idle symbol motion
- Responsive portrait UI built at runtime
- Original Candy/Food and Fruit resources from the supplied Unity project

## Creating another product

The project is now the master template. Generate a runnable theme skeleton with:

```bash
npm run theme:new -- ocean-treasure \
  --title="OCEAN TREASURE" \
  --subtitle="DEEP SEA SLOT" \
  --from=candy
```

This creates a new JSON config, copies the source theme assets without copying Cocos `.meta` UUIDs, rewrites resource paths, registers the theme in `themes.json`, and makes the new theme the product's default startup theme.

Then:

1. Replace the copied images under `assets/resources/theme/ocean-treasure` while keeping filenames stable.
2. Edit symbols, copy, palette, probability, payout and win tiers in `assets/resources/config/ocean-treasure.json`.
3. Run `npm run theme:validate`.
4. Open Cocos Creator, let it import the assets, preview, and build.

Loading artwork is fault-tolerant: when a theme omits dedicated loading foods, decorations, mascot, background, or progress textures, the runtime automatically falls back to that theme's own background, premium symbol, reel symbols, and code-drawn progress bar. New themes therefore stay presentable while bespoke loading art is still being produced.

The shared TypeScript gameplay code should not need to change. See `MASTER_TEMPLATE_GUIDE.md` for the full Chinese production workflow and asset checklist.

Template identity and the naming system for future mechanics are documented in `TEMPLATE_PROFILE.md`.

### Probability controls

- `winRate`: exact chance of a winning middle line (`0.09` means 9%).
- `nearMissRate`: chance of showing two matching symbols and a different third symbol.
- `weight`: how frequently a symbol appears and how frequently it is selected for a win.
- `multiplier`: payout as a multiple of the current bet.
- `minSpinDuration` and `reelStopDelay`: reel timing and stop cadence.
- `copy`: all theme-specific UI/loading/win text.
- `winTiers`: configurable big-win and jackpot multiplier thresholds.

Included presets:

- `assets/resources/config/candy.json`
- `assets/resources/config/fruit.json`
- `assets/resources/config/themes.json`

## Important

The current payout model is designed for a casual prototype, not regulated gambling or a real-money product. Before commercial release, replace it with an independently tested math model and complete App Store privacy, age-rating and purchase compliance work.
