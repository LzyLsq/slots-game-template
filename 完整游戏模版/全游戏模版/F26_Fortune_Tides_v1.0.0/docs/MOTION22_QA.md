# Motion polish 22 — 2026-09-18

- Coin collection uses a sampled quadratic curve with continuous tangent, staggered launches, rotation and tapered scaling.
- Paying cells have two travelling perimeter highlights; only the currently presented award animates these lights.
- Particles mix small stars with dots in each cabinet palette, capped at 240 and clipped to glass. Full star extents avoid coin value badges.
- Cascade removal adds expanding rings and slight rotation; falling symbols stretch and settle with recoil, returning to exact original proportions.
- No rule, payout, cabinet aperture or text position changes.

Validation: 46 automated tests passed; build and iOS web sync passed. Four modes × normal/big actual awards (8 cases) passed with exact balances, no browser errors, desktop frame interval P95 16.7–16.8ms. Collection cleanup, reduced motion, pointer transparency and 12 interrupted spin/return cycles passed. Coin-flight screenshot inspected. Video: screenshots/four-voyages-motion.webm. Physical iPhone performance not measured.
