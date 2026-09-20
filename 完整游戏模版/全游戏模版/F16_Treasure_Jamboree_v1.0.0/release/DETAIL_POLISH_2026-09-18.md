# F16 detail polish — 2026-09-18

## Second visual pass: treasure console

- Replaced the separate hall title plaque, four framed cards, arrow buttons and full-width play pill with one continuous selection console. Kept direct game selection and scene swipe; the focused play button sits beside the title.
- Enlarged treasure artwork from 98×85 to 132×120 design units. Only the selected treasure has an inset seat; names are separated from that seat and the mode subtitle uses lighter text weight.
- Removed the redundant continuously reflecting play-button edge. Existing responsive press and selected-symbol settling feedback remains.
- Typecheck, press, language and cabinet layout tests pass. Actual hall screenshots reviewed at 414×782 and 320×568; selected Pearl Party and verified the new play button loaded the Pearl Party cabinet. No browser error logs captured during that flow. No new image assets were generated in this pass.

## Implemented

- Bottom navigation now gives the current page an inset artwork seat and a persistent marker. Inactive icons are calmer. Tapping the current destination no longer rebuilds the page.
- Hall selected labels increased from 20 to 28 design pixels. The title, mode summary, selected label and entering/play text stay synchronized after a selection.
- Added missing navigation, hall, account and unavailable-purchase translations. Player-created names remain untouched.
- F16 now owns its language preference key. Existing legacy preference is copied once, without deleting or modifying the legacy key; subsequent changes in other templates cannot change F16's saved choice.
- Rank disclosure now has a textured reading surface and larger lettering. Shop copy explicitly states virtual coins cannot be cashed out.

## Verification

- TypeScript typecheck passed.
- All nine npm test suites passed: math, economy, Apple identity validation, rank, layout, rules, language, motion and press handling.
- Includes 4,000 math spins, 32 cabinet/viewport geometry combinations, 630 rule awards, 1,000 winning breakdown reconciliations and 40,200 motion samples. These are automated logic/geometry tests, not physical-device performance certification.
- Added preference migration/isolation tests and five-language navigation coverage.
- Runtime screenshots reviewed at 621×782: hall, account, rewards, rank, shop and Crown Carnival cabinet. Confirmed hall Crown Carnival selection leads to Crown Carnival at this viewport; spin controls were exercised and no console errors were captured.
- At 375×812, reviewed hall selection and cabinet layout. At 320×568, reviewed rank, account and shop; no panel clipping or text collisions observed. Small utility type is still compact; this is not a Dynamic Type/accessibility certification.
- Temporary viewport overrides reset after checking. Preview left on the updated hall.

## Open release gates

## September 20: cabinet receipt and input feedback

- Replaced low-contrast floor text with a textured, bounded result receipt. Kept a fixed host separate from its press-motion child so resize does not lose the layout anchor.
- Increased cabinet recharge hit area without enlarging the painted plus. Locked/limit controls no longer trigger the success tap sound and cabinet light cue.
- Typecheck and all nine existing automated suites passed. Rebuilt web-mobile and visually checked 414×896 / 320×568, including live resize back and forth after load.
- Exercised increase bet, spin and a vault feature in the browser. The 200-coin round settled with a 1,794 return (100,000 → 99,800 → 101,594). This was a local virtual-coin test, not a payment.
- Fixed the receipt disappearing after live resize found during this pass. Release gates below remain applicable.

- Cocos writes the web-mobile output and reports build task finished, but the CLI process still exits 36. The generated preview runs; this is not a clean release build result.
- Native purchase, server deployment, resource licensing, physical-device sustained FPS/memory and store submission acceptance were not certified in this pass. Web shop correctly reports purchases unavailable.
- This pass targets concrete interaction/readability issues; it is not a claim that the full game has passed commercial release acceptance.

## Follow-up: unified account header

- Combined nickname and avatar into one textured account entry, replacing the floating nickname. Balance and nickname use bounded single-line labels.
- Increased top-up and mailbox touch areas; top-up artwork remains independent of its hit area.
- Typecheck and press tests passed. Cocos reported web-mobile build finished; the existing CLI exit-code caveat above remains.
- Runtime checked at 414×782 and 320×568. Nickname opens account, coin-plus opens shop, mailbox opens its modal, and bottom navigation returns to the hall. Header, shop and hall showed no overlapping labels in these views. No console errors were captured during this check.
- No purchase was attempted. This is a focused polish pass, not full release certification.
