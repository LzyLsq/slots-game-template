# F26 scene craft pass — 2026-09-18

Replaced service and authentication backgrounds with a purpose-made captain cabin illustration. Added sliced coral, pearl and parchment controls; removed redundant service panels. Long rankings now scroll inside the chart to preserve artwork proportions. Gameplay math was not changed.

Validation: 46 unit tests; 20 localized authentication layouts; 20 rules layouts; 25 narrow service layouts; four award previews; 12 interrupted spin/return cycles. Login, shop, gifts, profile, narrow registration, leaderboard and award screenshots visually inspected. Static build and iOS web sync passed. Desktop browser coverage only; physical iPhone and production Apple authentication remain unverified.

The persistent winning-symbol pulse test now checks bounded scale, stationary cell positions, and clearing on reset rather than requiring a static highlight.
