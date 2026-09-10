# F14 validation

- Cocos Creator 3.8.8 Web Mobile build completed successfully.
- 4,000 deterministic math spins passed across four games.
- Apple identity verification, real saved ranking order and persistence passed.
- TypeScript game and server checks passed.
- 32 cabinet/viewport layouts passed bounds and continuous-background coverage checks.
- Actual screenshots reviewed at 320x568, 390x844, 430x932 and 768x1024.
- All four cabinets reached their themed big win via actual debug-forced spin, with correct award, reveal/dismiss, return to idle and no duplicate wallet credit.
- 320px reduced-motion and normal celebrations auto-dismissed and left the wallet unchanged.
- Interaction and native typing results are recorded in screenshots/*validation.json.

## Remaining publisher work

Automated release audit: 21/24 passed. Remaining items are publisher identity/support/public URLs, actual App Store consumable product IDs, and finalized legal text. The included native bridges must still be configured and exercised in Apple Sandbox/TestFlight. No App Store acceptance or native device certification is claimed.

## Entry guidance update
Four explicit PLAY controls added below physical destination signs, with reduced-motion-aware shimmer/breathing. All four controls were clicked and opened the correct games. Login choices, larger primary labels and return-to-boarding navigation reviewed at 320x568 and 390x844.

## Motion and feedback update
- Rewards: active port and cargo idle motion; successful reward coins fly toward the wallet and the displayed balance counts to the authoritative balance. Duplicate claims show no coin animation and do not add funds. Daily gift status persists across page navigation.
- Passport: portrait idle motion, staggered actions, inset metal sweep, saved-portrait confirmation and entry statistics count-up. Avatar click/save/reload persistence verified in the built preview.
- Cargo: staggered manifests, floating treasure, inset sheen and catalog amount count-up. No purchase-success effects for unavailable preview products.
- Regatta: staggered saved-result rows and score count-up; current-player sheen. Existing lobby entrance breathing, shimmer and ambient effects retained.
- Reels: clipped glass dividers and actual winning-cell outlines; reverse anticipation and final settle now have zero endpoint velocity. All four debug win flows completed with the correct award and no presentation-driven balance changes.
- BIG presentation starts at 10× bet (previously 20×), MEGA at 50× and EPIC at 100×. RNG, strips and payouts unchanged. Returns below the stake show RETURN without win celebration. A seeded sample of 100,000 spins per game observed 10×+ at 3.431%, 1.219%, 2.185%, 1.399%; these are sample results, not guarantees or an industry benchmark.
- Typecheck and existing 4,000-spin, auth, rank and 32-layout checks passed. Built preview exercised at 390×844 and reduced-motion 320×568: reward credit/duplicate behavior, wallet count completion, service-page renders and no runtime errors. Metal sweep position changes verified. These checks do not certify physical-device frame rate.

## Login focus and reel line visibility
Login is now the large central primary action; Apple remains a distinct second action and Guest/Register are secondary. Edge stars and breathing light were strengthened without moving input fields. Primary login click and both form layouts verified at 320/390 widths. Reel apertures now contain horizontal and vertical dividers with dark-gold backing and a bright edge, plus stronger actual winning-cell outlines.

## Sustained motion pass
Boarding now has eight staggered, rising gold coins confined to the side margins. Home destinations pulse in sequence; service treasure/portrait idle travel increased from 6 to 17 design units. Reel motes are larger, brighter and faster, with idle sparkle intervals shortened to 1.25 seconds. All additions respect reduced motion. Login primary action and form rendering passed again at 320/390 widths after rebuilding.

## Softer movement revision
Removed expanding destination rings and broad beacon glows. Replaced them with reflections clipped to each brass nameplate perimeter. Treasure and portrait float cycles slowed from 2.6 to 5.6 seconds, sway cycles from 3.6 to 7.2 seconds, and boarding coin rise from 4.8 to 7.6 seconds. Gameplay spin timing is unchanged.

## Reel landing and hall brand
Each column now independently animates a 0.58-second uniform symbol spring immediately after it stops, including while later columns are still spinning. Target symbols and settlement are unchanged; reduced-motion mode skips the spring. Hall branding has a 6.4-second gentle vertical float and a bounded light sweep, both disabled for reduced motion.

## Ordinary award presentation
All four cabinets have a short ordinary-win banner with amount count-up, themed treasure, sparkles and automatic exit. Screenshot previews call presentation directly and do not imply a real credited win. Debug-round BIG screenshots exercise actual spin settlement separately.
