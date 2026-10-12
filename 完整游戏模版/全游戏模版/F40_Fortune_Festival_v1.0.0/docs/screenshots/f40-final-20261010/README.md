# F40 final screenshots — 2026-10-10

These images were recaptured from the final Cocos web-mobile build after service text, material proportions and check-in layout corrections. All accounts are isolated local QA accounts. No screenshots from F36 are used here.

## Overview

- Current in-app browser hall（本地历史媒体：`desktop-lobby.png`）
- 390×844 hall and four cabinets（本地历史媒体：`overview-390x844.jpg`）
- 320×568 hall and four cabinets（本地历史媒体：`overview-320x568.jpg`）
- Six service scenes on a small phone（本地历史媒体：`services-review.jpg`）
- Four house arrivals（本地历史媒体：`loading-review.jpg`）
- BIG / SUPER / MEGA / EPIC on the current cabinets（本地历史媒体：`awards-review.jpg`）

## Hall and cabinets

| Scene | 390×844 | 320×568 |
|---|---|---|
| home | PNG（本地历史媒体：`home-390x844.png`） | PNG（本地历史媒体：`home-320x568.png`） |
| golden-phoenix | PNG（本地历史媒体：`golden-phoenix-390x844.png`） | PNG（本地历史媒体：`golden-phoenix-320x568.png`） |
| jade-dragon | PNG（本地历史媒体：`jade-dragon-390x844.png`） | PNG（本地历史媒体：`jade-dragon-320x568.png`） |
| pearl-qilin | PNG（本地历史媒体：`pearl-qilin-390x844.png`） | PNG（本地历史媒体：`pearl-qilin-320x568.png`） |
| amber-panda | PNG（本地历史媒体：`amber-panda-390x844.png`） | PNG（本地历史媒体：`amber-panda-320x568.png`） |

## Service scenes

| Scene | 390×844 | 320×568 |
|---|---|---|
| login | PNG（本地历史媒体：`services/login-390x844.png`） | PNG（本地历史媒体：`services/login-320x568.png`） |
| register | PNG（本地历史媒体：`services/register-390x844.png`） | PNG（本地历史媒体：`services/register-320x568.png`） |
| store | PNG（本地历史媒体：`services/store-390x844.png`） | PNG（本地历史媒体：`services/store-320x568.png`） |
| rewards | PNG（本地历史媒体：`services/rewards-390x844.png`） | PNG（本地历史媒体：`services/rewards-320x568.png`） |
| rank | PNG（本地历史媒体：`services/rank-390x844.png`） | PNG（本地历史媒体：`services/rank-320x568.png`） |
| profile | PNG（本地历史媒体：`services/profile-390x844.png`） | PNG（本地历史媒体：`services/profile-320x568.png`） |

## House arrival loading

- golden-phoenix（本地历史媒体：`services/loading-golden-phoenix-390x844.png`）
- jade-dragon（本地历史媒体：`services/loading-jade-dragon-390x844.png`）
- pearl-qilin（本地历史媒体：`services/loading-pearl-qilin-390x844.png`）
- amber-panda（本地历史媒体：`services/loading-amber-panda-390x844.png`）

Owned QA resource requests were delayed by 1000 ms to expose the live progress display. Production loading remains resource-aware and does not impose that delay. [Capture records](services/capture-audit.json) preserve this condition.

## Awards, interactions and motion

The [32 award cases](../../qa/awards/award-audit.json) use presentation fixtures at two phone sizes; they do not credit a wallet or measure natural probability. Charged paid-round conservation is covered separately in [runtime](../../qa/runtime/runtime-audit.json) and [natural settlement](../../qa/settlement/summary.json).

[Direct Canvas motion records](../../qa/motion-final/direct-canvas-audit.json) and 30 decoded poses per guardian verify continuous frame content separately from composition captures. Local WebM files are retained for playback and excluded from Git. Screenshots are not proof of device FPS, Apple login, real payments or App Store readiness.
