# Cabinet cascade polish — 2026-09-15

- Pause idle opacity updates during cascade tweens to avoid competing writers.
- Drop symbols from validated survivor positions, with distance-based timing, a small contained landing rebound, and pooled theme accents.
- Fade new symbols into the aperture; resume idle motion from the settled pose.
- Keep win focus through the final column’s staggered highlight.
- No payout or result-selection changes.

Validation: TypeScript and Cocos web-mobile build passed. Twelve browser cases cover four cabinets at 414×896, 320×568, and 390×844 with reduced motion. Each checks cascade destination, settled position and scale, highlight duration, a subsequent real spin, unchanged Sprite count, and page errors. Screenshots reviewed. These are browser tests, not physical-device certification.

Evidence: screenshots/cascade-26.json and *-cascade-26.png.
