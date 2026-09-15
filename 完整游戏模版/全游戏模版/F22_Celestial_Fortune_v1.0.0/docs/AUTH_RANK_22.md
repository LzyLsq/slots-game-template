# F22 · Login and honour roll polish

- Authentication buttons display localized connecting text and a restrained inset breathing reflection while the request is pending. Reduced motion uses a static reflection.
- Failed authentication restores button text without rebuilding the form; entered values remain available for retry. Guest entry is blocked during authentication, matching the existing duplicate-submit guard.
- Current-player rows show a separate localized YOU label below the portrait without narrowing the nickname or winnings fields. A current-player champion has a dedicated identity label.
- Champion winnings were moved inward after visual inspection revealed proximity to the decorative bottom border.

## Validation

TypeScript typecheck, five-language tests and Cocos web-mobile build passed. Playwright used actual pointer clicks at widths 320, 430 and 390 (reduced motion). Authentication responses were delayed/stubbed to verify pending, duplicate clicks, guest-entry guard, failure preserving root and fields, and successful retry clearing passwords. This checks UI request handling, not production authentication.

Rank screenshots exercise the current player outside the top eight and as champion with a nine-digit winnings value. Screenshots and results: `screenshots/auth-rank-22.json`, `*-auth-pending-22.png`, `*-rank-player-22.png`, `*-rank-champion-22.png`. Browser viewport checks are not physical-phone performance measurements.
