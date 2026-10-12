# F40 · Text, hall and touch audit · 2026-10-12

Current Cocos preview: `http://127.0.0.1:6040/?debug=1&screen=home&v=f40-centered-reading-20261012`.

This review corrects the confirmed reading/layout issues and records the remaining shortcomings. It preserves the current commissioned artwork, sampled soundtrack, award composition and settlement rules. No Git commit or push was requested in this round.

## Corrected

- Rules, feature rules, diagram explanations, terms, privacy and help use centered reading blocks. Pagination counters remain centered with separate previous/next controls. Longer copy receives additional pages; it is not hidden or truncated.
- Twelve missing service/account/dialog entries now cover Simplified Chinese, Traditional Chinese, Japanese and Korean. Saved player nicknames remain player text.
- Full 18-character Latin and CJK nicknames wrap within the header and profile rather than collapsing into tiny single-line text. The final header gives the name four lines between the mail art and avatar.
- On short phones the authored hall moves above the painted bottom navigation. Its scale is retained. The album and footer have separate reading space, and the full visible captions belong to the four selector hit boxes.
- Header top-up, mail and avatar use stable input surfaces separate from artwork motion. Their measured browser hit areas are at least **44×44 CSS pixels**, with no overlapping neighboring targets. Mail artwork and its caption move together to make room. The artwork itself retains its original size.

The original 320×568 header targets measured about 18.69×21.89 for top-up, 29.58×29.58 for mail and 32.25×32.25 for the avatar. [Before measurements](qa/text-centering-20261012/touch-targets-320.json). Cabinet decrease/increase and SPIN already had 44-pixel target height; they were not the small-target problem.

## Verification and order

| Evidence | Scope and result |
|---|---|
| [Full text audit](qa/text-centering-20261012/final/text-audit.json) | 1,198 rendered scene inspections, containing 12,342 repeated label observations; zero reported text issues or page errors. Two sizes × five locales, all legal/rule/help pagination, main/service pages, account dialogs, mailbox/history, four cabinets and long-name fixtures. These are automated inspections, not 1,198 manually reviewed pictures. |
| [Rule copy integrity](qa/text-centering-20261012/rule-copy/summary.json) | Nine checks matched complete primary-rule source paragraphs; no discarded rule text. |
| [Final hall audit](qa/text-centering-20261012/hall/hall-audit.json) | Ten contexts; footer vs. painted navigation, caption reading/hit bounds, four lower-caption taps, three reverse swipe pairs, enter Panda and return. Zero page errors. |
| [Final header audit](qa/text-centering-20261012/header/header-audit.json) | Ten contexts: 50 hall/service page geometries, 20 full-length-name geometries and 30 actual edge taps. Shop, mailbox and profile open correctly. Minimum header target is 44×44; minimum full-length nickname font is about 9.67 screen pixels at 320×568. Zero page errors. |

The complete text run preceded the final hall/header geometry refinements. The hall was rerun after all header changes; the final header audit independently covers home, shop, gifts, ranking and profile at both sizes and all five locales. The reading/rule code did not change after its full pass. Counts above describe separate scopes and must not be added together as unique test cases.

`npm run typecheck` and `npm run test:layout` pass on the final source; layout covers 40 cabinet/viewport combinations. The language and rule suites passed earlier in this review; their dictionary and rule code were unchanged by the final header adjustment.

Cocos Creator **3.8.8** was recovered from the developer's existing archive into ignored `temp/qa-creator-3.8.8/`. The normal client typecheck now resolves that version's official declarations. The [latest build log](qa/text-centering-20261012/creator-build.log) records the web-mobile task as `Finished`, with CLI exit 36. The log includes a worker SIGTERM diagnostic and is not a clean-log claim. The rebuilt preview was subsequently used by the final header and hall audits.

## Continuous animation evidence and open issue

[Four direct-canvas recordings](qa/text-centering-20261012/motion-review/direct-canvas-audit.json) cover actual local charged/settled debug EPIC rounds. All modes traverse BIG → SUPER → MEGA → EPIC, display painted amount digits, and finish with one bet and one win entry, correct conservation, idle input and no pending spin. Forced outcomes verify presentation/settlement; they are not natural-probability evidence.

| Mode | Recording duration | Maximum rAF interval | p95 interval | Intervals over 100 ms |
|---|---:|---:|---:|---:|
| Golden Phoenix | 13.03 s | **383.4 ms** | 16.7 ms | 1 |
| Jade Dragon | 12.72 s | 16.8 ms | 16.8 ms | 0 |
| Pearl Qilin | 21.24 s | 16.8 ms | 16.8 ms | 0 |
| Amber Panda | 16.03 s | 16.8 ms | 16.7 ms | 0 |

A [three-round follow-up](qa/text-centering-20261012/frame-consistency/frame-review.json) measures Phoenix without MediaRecorder, screenshots, tracing or decoding during the round. Each round has a maximum interval of 16.8 ms, p95 16.7 ms, no interval over 50 ms and no Long Tasks. The 383.4 ms interval did not reproduce; its cause remains unresolved. Earlier recording sessions also contained isolated Dragon/Qilin long intervals. It would be inaccurate to call those stalls fixed or to attribute them confidently to recording overhead. rAF timing is a desktop browser callback proxy, not GPU or native device timing.

## Remaining shortcomings

1. **Secondary text still competes with artwork.** In the reviewed Phoenix award frame, the white threshold, return label, bottom reveal/continue hint and cabinet toolbar captions are readable but visually heavy next to the painted gold title and amount. They need a coordinated typography/material pass that retains small-phone legibility. No accepted award artwork was replaced to hide this finding.
2. **The hall still needs stronger spatial and visual hierarchy.** Manual review of the final 320×568 hall screenshots shows a relatively small brand mark against the detailed gold gateway. The selected house's cutout platform has weak contact with the street behind it, so the entrance still reads as a separate illustration. Aligning perspective, lighting and the platform's ground contact deserves a dedicated art pass. This is a visual judgment from rendered screenshots, not a geometry-test failure.
3. **Small-phone secondary text remains compact.** Full-length header names wrap completely, but their minimum measured font is about 9.67 screen pixels. Mode captions and the hall footer are also around 10 screen pixels in the 320×568 preview. Passing containment and centering checks does not establish comfortable reading; the four-line nickname also makes the header dense. Any refinement should preserve the complete name and existing touch targets without shrinking the whole page.
4. **Intermittent long frames need device/profile confirmation.** Four-mode recordings and the clean lightweight follow-up narrow the scope but do not establish iPhone smoothness, memory use or thermal behavior. The Phoenix recording's 383.4 ms interval remains unresolved despite three subsequent clean rounds.
5. **Audio comfort is unverified on actual outputs.** Clip signal checks and playback routing/lifecycle pass in the prior audio review; phone-speaker/headphone listening is still needed for brightness, award/background balance and loop comfort. AudioSource state is not evidence that the final mix sounds good.
6. **Native release is incomplete.** Executable Apple authentication and StoreKit bridges, production service/publisher details, signing and device validation remain open in [release status](f40-release-status.json). This is a Cocos engine preview, not an accepted App Store build.

## Representative screenshots

Final short-phone hall and long-name header:

Final English hall（本地历史媒体：`qa/text-centering-20261012/hall/en-320x568-home.png`）
Full-length CJK header（本地历史媒体：`qa/text-centering-20261012/header/en-320x568-cjk.png`）

Reading surfaces (their layout was unchanged by the subsequent header refinement):

Centered player support（本地历史媒体：`qa/text-centering-20261012/final/en-320x568-support-1.png`）
Centered Chinese rule explanation（本地历史媒体：`qa/text-centering-20261012/final/zh-CN-320x568-jade-dragon-help-1.png`）

Award frame showing the remaining white-copy hierarchy concern:

Golden Phoenix EPIC frame（本地历史媒体：`qa/text-centering-20261012/motion-review/direct-canvas/golden-phoenix-spin-award-t9.png`）
