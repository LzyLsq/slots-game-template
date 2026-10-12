# F40 festival crescendo evidence — 2026-10-12

本目录对应当前 `f40-festival-crescendo-final-20261012` 预览。图片用于检查最终构图、裁剪和可读性；WebM 与原始阶段帧用于检查连续演出。演出截图 fixture 不代表自然中奖概率；连续录像中的本地调试轮次有真实扣款和结算记录。

## 主题加载

| 画面 | 截图 |
|---|---|
| 初始 F40 金街加载（390×844） | PNG（本地历史媒体：`startup/startup-390x844-no-preference.png`） |
| 初始加载 reduced motion（390×844） | [PNG](startup/startup-390x844-reduce.png) |
| 失败与重试（320×568） | PNG（本地历史媒体：`startup/failure-320x568.png`） |
| Golden Phoenix 到达 | PNG（本地历史媒体：`services/loading-golden-phoenix-390x844.png`） |
| Jade Dragon 到达 | PNG（本地历史媒体：`services/loading-jade-dragon-390x844.png`） |
| Pearl Qilin 到达 | PNG（本地历史媒体：`services/loading-pearl-qilin-390x844.png`） |
| Amber Panda 到达 | PNG（本地历史媒体：`services/loading-amber-panda-390x844.png`） |

四个到达画面分别使用自己的门框、标题、代表符号、规则短句和地毯延伸；加载条反映资源准备，不为缓存命中强行等待。

## 服务页

| 页面 | 390×844 | 320×568 |
|---|---|---|
| 登录 | PNG（本地历史媒体：`services/login-390x844.png`） | PNG（本地历史媒体：`services/login-320x568.png`） |
| 注册 | PNG（本地历史媒体：`services/register-390x844.png`） | PNG（本地历史媒体：`services/register-320x568.png`） |
| 商店 | PNG（本地历史媒体：`services/store-390x844.png`） | PNG（本地历史媒体：`services/store-320x568.png`） |
| 奖励 | PNG（本地历史媒体：`services/rewards-390x844.png`） | PNG（本地历史媒体：`services/rewards-320x568.png`） |
| 排行 | PNG（本地历史媒体：`services/rank-390x844.png`） | PNG（本地历史媒体：`services/rank-320x568.png`） |
| 账户 | PNG（本地历史媒体：`services/profile-390x844.png`） | PNG（本地历史媒体：`services/profile-320x568.png`） |

## 奖励构图

`awards/` 保存四个模式在 BIG、SUPER、MEGA、EPIC 四个等级和两种手机尺寸下的 32 组构图。奖励使用当前房间与柜机内的渐进式演出，不切换到脱离场景的贴纸页面。

- Golden Phoenix EPIC，390×844（本地历史媒体：`awards/golden-phoenix-epic-390x844.png`）
- Jade Dragon EPIC，390×844（本地历史媒体：`awards/jade-dragon-epic-390x844.png`）
- Pearl Qilin EPIC，390×844（本地历史媒体：`awards/pearl-qilin-epic-390x844.png`）
- Amber Panda EPIC，390×844（本地历史媒体：`awards/amber-panda-epic-390x844.png`）
- [32 组布局审计](awards/award-audit.json)

## 连续动画

`final-motion/direct-canvas/` 每个模式包含一段真实 Canvas captureStream WebM，以及 tier-0/1/2/3、reveal-ignite、reveal-crest、reveal-settle、exit、restored 九个解码阶段帧。

- Golden Phoenix EPIC WebM（本地历史媒体：`final-motion/direct-canvas/golden-phoenix-spin-award.webm`）
- Jade Dragon EPIC WebM（本地历史媒体：`final-motion/direct-canvas/jade-dragon-spin-award.webm`）
- Pearl Qilin EPIC WebM（本地历史媒体：`final-motion/direct-canvas/pearl-qilin-spin-award.webm`）
- Amber Panda EPIC WebM（本地历史媒体：`final-motion/direct-canvas/amber-panda-spin-award.webm`）
- [连续录像审计](final-motion/direct-canvas-audit.json)
- [交互、输入隔离和退出恢复](interactions/interaction-audit.json)

录像检查的结果为：等级递进、两轮烟花、金币回到账户、柜机和吉祥物保持在同一场景、退出后控件恢复。原始桌面采集帧间隔不等于 iPhone/iPad 实机帧率。
