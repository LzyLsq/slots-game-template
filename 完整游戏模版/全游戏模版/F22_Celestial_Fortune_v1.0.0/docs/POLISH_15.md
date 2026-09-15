# F22 readability and account polish — 2026-09-15

## Changes
- Cabinet toolbar captions and bottom hints are larger. Bottom hints use warm dark ink with a light outline suited to the gold backdrop.
- TOP WIN separates caption and amount horizontally within its measured readout. Values remain single-line and shrink within the available bounds.
- Account nickname, portrait and edit action occupy the identity frame. Total/best winnings occupy separate inset gold plaques, clear of the frame's lower artwork.
- Account utility actions have roomier captions and full-tile press feedback; the icon retains its own idle motion.
- Leaderboard has aligned rank/amount headings, wider number columns and two-line long names. Champion text has extra clearance from its decorative border.

- Added missing Shop navigation translation in Simplified/Traditional Chinese, Japanese and Korean, discovered during Chinese render review.

## Review and verification
- TypeScript check and Cocos web-mobile build passed.
- Reviewed login, home, shop, rewards, rank, account and all four cabinets at 320×568 and 430×932.
- Tested 18-character wide nicknames and large reward values. Stress data exists only in isolated browser test contexts, not the user's session.
- Reviewed Simplified Chinese profile/rank at 390×844 as well as English narrow/wide views.
- Account portrait, coin ledger, language and privacy actions open through actual clicks at 320×568.
- Nickname validation, save, reload persistence and home/rank synchronization passed; balance unchanged.
- Screenshots: `screenshots/*-polish-15.png` and `screenshots/*-stress-15.png`. Reports: `screenshots/polish-15.json`, `screenshots/polish-15-profile-final.json`.

## Scope and limits
Only F22 UI source changed. No payout, purchase or economy logic changed. Viewport checks use desktop Chrome, not physical-device GPU measurements. No new obvious overlap found in the inspected final views; this is not a claim that every device and every localized string has been exhaustively tested.
