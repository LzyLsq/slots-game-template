# F22 material motion — 2026-09-15

Four separate reel timing profiles: Caishen uses slower weighty stops, Wish uses closer stagger and elastic landing, Lotus uses the longest deceleration and softer return, Forge uses shorter brisk stops. All use continuous acceleration and Hermite braking with a bounded return to exact result positions.

Initial symbol positions blend into the reel movement without a position jump. A pooled low-opacity symbol echo follows actual speed and disappears on stopping. Landing response propagates between rows; idle movement is reduced. Winning symbols retain contrast while non-winning symbols briefly dim.

Cabinet pillar lights follow the measured outer aperture. Theme-colored gold dust, wish sparks, pearl lights and forge embers use different movement profiles. Cabinet energy follows actual reel activity, clamped to 0–1; stops send a light response across title ornaments. Reduced-motion mode disables decorative flow and echoes. Cabinet artwork and aperture geometry are unchanged.

## Validation

TypeScript and Cocos web-mobile build passed. At 320×568 and 430×932, each of four cabinets completed three consecutive rounds including quick mode: 24 spins total. Checked zero initial position shift, exact final symbol frames, finite bounded velocity, no growing reel node pool, no residual echoes, stop ordering and cabinet energy bounds. No browser page errors. Desktop Chrome animation frame p95 was 16.7–16.8 ms while recording; this does not establish real-device performance.

Reviewed rendered phone screenshots and sampled animation frames. Reports: screenshots/material-motion-13.json. Full recordings: screenshots/motion-13-video/. Gameplay odds, bets and wallet logic were not modified.
