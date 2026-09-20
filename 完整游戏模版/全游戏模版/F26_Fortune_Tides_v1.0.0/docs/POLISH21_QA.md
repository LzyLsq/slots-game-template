# F26 feedback and readability polish — 2026-09-18

## Changes
- Added seven-coin visual collection trail from award plaque to wallet for normal wins and after big-win dismissal. No balance mutations.
- Collection is cancelled on navigation, next spin, or hidden document; disabled for reduced motion. Its overlay cannot intercept taps.
- Receipt payout groups now include localized symbol names and amounts.
- Refined payout breakdown separators, number alignment, dialog title spacing, history rows and game links.
- Existing four differentiated idle cabinet loops and exact glass apertures preserved.

## Verification
- 46 automated tests pass; production build and iOS web sync pass.
- Four modes × normal/big awards: 8 deterministic actual settlement cases pass (ACTUAL_AWARDS_QA.json).
- Desktop browser recorded frame interval P95: 16.7–16.8 ms; this is not a physical iPhone measurement.
- Collection animation: seven coins, no hit testing, normal completion, big-win dismissal, route cleanup and reduced-motion checks pass.
- 12 interrupted spin/return cycles pass without locked controls.
- 20 rule layouts across four modes and five languages pass at 320px; modal background input disabled and restored correctly.
- Five-language actual receipt widths pass at 320px; Japanese screenshot visually inspected for fitted labels and readable amounts.

## Evidence
- screenshots/collection21.png
- screenshots/receipt21-ja.png
- screenshots/receipt21-zh.png
- screenshots/four-voyages-motion.webm

## Limits
Desktop browser testing only in this pass. No App Store acceptance or physical-device performance claim. Production Apple account integration remains a separate outstanding release dependency.
