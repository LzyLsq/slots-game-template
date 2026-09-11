# F15 validation

- Cocos Creator 3.8.8 Web Mobile build completed; game/server TypeScript checks passed.
- Existing 4,000-spin math test, signed Apple identity verification and persisted ranking tests passed.
- 32 cabinet/device layouts passed shared-plane, full-room coverage and essential-bounds checks.
- Actual 320×568 and 390×844 renders of login, register, lobby, boutique, gifts, honours, account and four cabinets were captured and inspected. Matte theatre/frame revision replaced the first glossy treatment.
- All four selector controls opened the correct cabinet. Increase/decrease bet, daily gift credit-once, duplicate claim, sign-out to two input fields and register to four input fields passed.
- Four debug-forced real spin flows reached their matching BIG presentation, showed the settled amount, dismissed and returned to idle with no duplicate credit.
- Ordinary win presentation previews completed on all four cabinets without changing wallet balances; these screenshots do not imply an actual credited win.
- Browser evidence is saved in `screenshots/*validation.json`. Preview tests do not certify physical-device frame rate or native StoreKit behaviour.

## Publisher work

Set publisher identity, support and public legal URLs; replace `com.publisher.honeyparade.*` StoreKit IDs; finalize hosted legal documents. Configure the included production service and native Apple bridges, then validate on device and in Apple Sandbox/TestFlight. No App Store approval is claimed.

Final checks: native input at 320/390/430 widths retained typed values across simulated keyboard resize and concealed passwords. Normal and reduced-motion 320px BIG shows auto-dismissed without modifying balances. Release audit is 21/24; the remaining three requirements are the publisher configuration listed above.

Lobby refinement: featured art is inset in a porcelain/brass mount with theme corner ornaments and fixed marquee lamps. Title clearance verified at 320/390 widths (over 49 design units). Cabinet floating treasure props removed; title glints remain physically anchored and rail/chamber lights use softer cycles.

Continuous page transitions: outgoing opaque root retained underneath the incoming scene for a 0.38-second crossfade; no fade-to-empty step. Five service-page transitions passed opaque-backdrop checks, sampled frames had no near-black pixels, and six rapid rerenders left one active root. Native input/keyboard retention and cabinet-entry/reward/sign-out checks passed again. Store treasures, gift stations, honours, profile frames and cabinet control rims now have bounded cyclic reflections.

### F15 themed interaction revision — 2026-09-11
- Four independent sharp/blurred symbol atlases. Math IDs, strips, weights and payouts unchanged. Rule labels and thumbnails use the same theme mapping as reels.
- Four original jackpot prizes and matched ordinary-win badges; neutral star coins shared across themes. Bee/honey, peach, koi/lotus and fox/festival symbols remain in their own games.
- Press transforms are independent of idle transforms: measured compression 0.951, release to 1.0, followed by continuing idle movement. Reward taps, all four game entries, bet controls, single-credit daily reward and sign-out/register flows passed in Chromium.
- Typecheck, 4,000 deterministic math rounds, authentication/rank checks and 32 cabinet/viewport layout combinations passed. Four ordinary wins and four debug-forced big-win flows passed with no extra wallet credits. Debug wins are visual QA fixtures, not production odds.
- Five service-page crossfades retain an opaque previous page and release retiring roots; rapid navigation passed without runtime errors. 320px and 390px rendered cabinets reviewed.
- Evidence: `screenshots/theme-motion-validation.json`, `screenshots/320-themed-*.png`, `screenshots/fx-*.png`, `screenshots/big-win-*.png`.

### F15 idle life and precise symbol contours — 2026-09-11
- Re-extracted 32 original source objects by connected silhouette across the full image, instead of fixed grid slices. This restores fox ears, lantern finials and wild sun rays while excluding fragments of neighbouring rows. Reassembled 80 cells (shared + four theme atlases), each with at least 20px transparent padding; rebuilt blurred atlases from the cleaned artwork. Preserved intentional plum/purple materials.
- Idle choreography now includes a clipped gently moving lobby poster, theme corners/selectors, navigation artwork, all reward gifts, honour portraits, and account action icons. Four margin coins and ten staggered sparks per service page stay outside the central reading area. Text, balances and hit regions remain fixed. Reduced-motion mode skips new loops.
- Validation evidence: `screenshots/idle-pages-validation.json`, `screenshots/theme-motion-validation.json`, `screenshots/interaction-validation.json`; 320/390px service-page captures and 320px themed cabinet captures.

### Divider and ordinary-win readability — 2026-09-11
- Permanent row/column dividers now render above symbols and additive glass reflections, inside the reel aperture. Opaque theme-toned 6px under-strokes with a narrow ivory highlight keep all segments legible at mobile scale.
- Ordinary-win banners use a fully opaque dark reading surface with white bold sans-serif amounts. Theme-specific dark plum/blue/umber surfaces replace the pale-on-pale combinations; animated metal reflections remain on the rim. Long amounts reduce their font size to fit.
- Typecheck and web build passed. All four ordinary-win fixtures passed at 390×844 and 320×568, including banner teardown and unchanged wallet balance. Reviewed rendered Peach/Koi awards and all four 320px reel grids; theme atlas/idle checks passed.

### Theatre curtain revision
- Two original fabric curtains use 40 overlapping strips each; deformation increases from zero at the top to the loose hem. Six chain-hung coins sway from fixed suspension points with independent glints and face rotation. Reduced-motion mode keeps this scene static.
- Typecheck/build passed; `screenshots/curtains-validation.json` measures 80 strips, six coins, stationary tops and moving hems on 320×568 and 390×844. Screenshots: `320-curtain-stage.png`, `390-curtain-stage.png`; logo, featured art and entry controls remain visible.

### Full proscenium fit and elastic buttons
- Replaced the domestic-style curtain with original theatrical velvet wings and a scalloped top valance. The 1080px-wide valance spans the stage, wings overlap poster edges, and the enlarged brand renders above the fabric. Reviewed at 320×568 and 390×844; all four game entries and account/reward interactions passed.
- Button press compresses to 92–94%, releases to 104.5%, then settles to 100%; actions dispatch immediately. Idle animation remains independent. `theme-motion-validation.json` includes the measured release rebound.
- Curtain frames are shared immutable slices: this avoids destroying frames during overlapping page transitions. Repeated selector/game navigation passes without runtime errors.

### Background registration, fuller drapes and sliding card changes
- Curtain transforms are registered to the actual full-screen backdrop sprite (887×1774 source), not the independently scaled menu stage. Curved valance follows the arch; wings run from the arch shoulders to the stage deck. Side fabric is 180 source pixels wide, with a deeper 170px upper drape. Warmed velvet tones match the peach/gold architecture.
- Switching show closes masked velvet panels in 0.52s, swaps the selected art while fully covered, then opens in 0.78s after a short hold. A covered swap bypasses the ordinary page crossfade so images cannot ghost through overlapping curtain layers. Repeated inputs are ignored during the finite transition; reduced-motion changes instantly.
- Curtain slide QA verifies fully closed swap, final selected index, complete reopen and cleared busy state. Four cabinet entries/bet/reward/account flows passed with waits for the new animation. Two mobile sizes reviewed.

### Door attachments and integrated card captions
- Raised the curved valance 41 background-source pixels to meet the golden door arch, widened it to 750px and moved side attachments onto the inner columns. Fabric remains registered to background cover scaling.
- Title and description plaques are children of `Framed festival mount`, placed inside its lower edge. Both render below the curtain layer, so a closed curtain conceals image, title and description together. Only the fixed PLAY/navigation controls remain in front.
- Typecheck/build passed. 320×568 and 390×844 screenshots reviewed, including fully closed curtains with no visible card labels. Closed-swap/reopen and all four game-entry, bet, reward/account interaction checks passed.

### Unified theatre and gathering cloth
- Separate warped curtain overlays are superseded by a single painted room with consistent fabric, attachment shadows and stage lighting. The foreground cloth is extracted from that same image; gold architecture stays static.
- Each moving half has 32 fabric strips. Opening compresses pleats toward the side supports instead of translating a rigid panel across the image; closing expands the pleats with a small hem lag. Durations: 0.65s close, 0.95s open. The opaque textile covers the whole card and its caption.
- Typecheck/build, concealed-swap/reopen, two mobile sizes and four-cabinet interaction checks passed. Captures include `curtain-closing.png`, `curtain-closed.png`, `curtain-opened.png` and `390-curtain-stage.png`.

### Title edges, award materials and cabinet lighting
- Removed dark burgundy backdrop pixels accidentally retained in the foreground curtain cutout; cleaned dark outer fringe and transparent RGB on the brand artwork. Foreground occlusion keeps only fabric, not an opaque rectangle beneath the logo.
- Ordinary awards use the existing sculpted cream/gold panel directly, with dark bold text; removed the separate flat dark reading rectangle. Big-win amount plaques use the same cream/gold material. Four ordinary awards at 320px and four real debug-forced big-win flows passed without extra wallet credits.
- Added eight moving crown glints per cabinet, stronger phased metal edge sweeps and perimeter lamp chases, and energy/landing-linked lower console illumination. Theme tint matches peach, river blue, amber and festival gold. Reel geometry remains unchanged. Typecheck/build and concealed curtain-swap QA passed.

### Hall life and foreground occlusion refinement
- The card frame is narrowed from 820 to 720 design pixels, with a matching 654px poster aperture and integrated 690px caption plates. Card/captions float together; fixed foreground fabric no longer deforms the doorway or exposes mismatched edge pixels.
- The travelling curtain extends upward behind the valance and remains clipped to the arched opening; its upper rectangular texture edge is hidden. Reduced hem movement avoids visible strip stepping.
- Added two slow, low-opacity theatre spotlights, a gentle 11px whole-card float, larger brand/pendant movement and a breathing PLAY icon. Actual idle transforms measured in `hall-life-validation.json`.
- Typecheck/build passed. Reviewed 320/390px layouts and closed curtains; concealed swap/reopen and all four entries/bet/reward/auth checks passed. New screenshots: `320-hall-life.png`, `390-hall-life.png`, `curtain-closed.png`.

### Clear card aperture and retained breeze
- Drew both painted background curtains and the matching foreground back with the same interior-only warp; architecture and columns remain fixed. The subject image now fits its aperture instead of being enlarged behind a narrow crop, and title/caption stay below the image within the frame.
- Restored slow idle cloth motion using 32 strips per side with fixed top rows and a 3.4 source-pixel maximum travelling displacement. The wider opening reserves clearance so the breeze does not sweep across card content.
- Typecheck/build passed. Two mobile-size breeze checks confirm fixed attachments and moving cloth. Concealed-swap/reopen and all four cabinet entries, bet controls, reward idempotence and authentication navigation passed. Reviewed `390-curtain-stage.png` with the full subject and captions visible.

### Continuous card switching and mode loading
- Card switching now updates only the poster, integrated labels, corner symbols and selected tabs in the existing home root after curtain closure. No root rebuild or full-page alpha reset occurs; background lighting and pendants retain their clocks.
- All four game entries show a matching themed loading screen with animated gold coins, including cached entry. It persists independently above the root until the requested cabinet texture loads and the new game scene is rendered, then fades out. Errors clean up the overlay and return control.
- Added card clearance with 92% uniform mount scale while restoring readable label sizes. Wind displacement increased to 8 source pixels with fixed top attachments.
- Typecheck/build passed. Four entry overlays (three animated coins each), bet controls, daily reward idempotence, signout/register navigation and two-size breeze checks passed. Screenshots: `loading-BEE-TREASURY.png`, `loading-PEACH-JUBILEE.png`, `loading-KOI-FORTUNE.png`, `loading-FOX-FIESTA.png`.

### Check-in clarity / loading progress (revision 21)
- Seven rewards now show ordered day numbers, actual coin amounts, and explicit CLAIMED / CLAIM NOW / LOCKED labels. Today's panel and claim button identify the exact day.
- Verified claim day 1 credits 2,000 once; repeated claims cannot credit again. Claimed day stays highlighted. Day 7 wrap retains DAY 7 COLLECTED until the next UTC day, then starts day 1.
- Inspected 390×844 and 320×568 renders; shortened claimed label to prevent wrapping on narrow screens.
- Mode loading progress is monotonic and reaches 100% before dismissal, driven by asset loading and scene readiness milestones.
- Validation: TypeScript check, Cocos web build, checkin-qa.cjs and loading-bar-qa.cjs. Screenshots: checkin-today-390.png / checkin-claimed-320.png.
