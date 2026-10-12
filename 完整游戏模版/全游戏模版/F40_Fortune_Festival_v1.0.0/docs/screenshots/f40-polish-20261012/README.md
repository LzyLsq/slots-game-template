# F40 优化版截图 — 2026-10-12

全部为本轮实际 Cocos 渲染。柜机构图图使用中性角色姿态，不能作为动画质量证明。连续动画单独记录在 `docs/qa/polish-motion-20261012/`。

| 页面 | 390×844 | 320×568 |
|---|---|---|
| home | 截图（本地历史媒体：`home-390x844.png`） | 截图（本地历史媒体：`home-320x568.png`） |
| golden-phoenix | 截图（本地历史媒体：`golden-phoenix-390x844.png`） | 截图（本地历史媒体：`golden-phoenix-320x568.png`） |
| jade-dragon | 截图（本地历史媒体：`jade-dragon-390x844.png`） | 截图（本地历史媒体：`jade-dragon-320x568.png`） |
| pearl-qilin | 截图（本地历史媒体：`pearl-qilin-390x844.png`） | 截图（本地历史媒体：`pearl-qilin-320x568.png`） |
| amber-panda | 截图（本地历史媒体：`amber-panda-390x844.png`） | 截图（本地历史媒体：`amber-panda-320x568.png`） |

## 辅助页

| 页面 | 390×844 | 320×568 |
|---|---|---|
| login | 截图（本地历史媒体：`services/login-390x844.png`） | 截图（本地历史媒体：`services/login-320x568.png`） |
| register | 截图（本地历史媒体：`services/register-390x844.png`） | 截图（本地历史媒体：`services/register-320x568.png`） |
| store | 截图（本地历史媒体：`services/store-390x844.png`） | 截图（本地历史媒体：`services/store-320x568.png`） |
| rewards | 截图（本地历史媒体：`services/rewards-390x844.png`） | 截图（本地历史媒体：`services/rewards-320x568.png`） |
| rank | 截图（本地历史媒体：`services/rank-390x844.png`） | 截图（本地历史媒体：`services/rank-320x568.png`） |
| profile | 截图（本地历史媒体：`services/profile-390x844.png`） | 截图（本地历史媒体：`services/profile-320x568.png`） |

## 四模式加载

- golden-phoenix（本地历史媒体：`services/loading-golden-phoenix-390x844.png`）
- jade-dragon（本地历史媒体：`services/loading-jade-dragon-390x844.png`）
- pearl-qilin（本地历史媒体：`services/loading-pearl-qilin-390x844.png`）
- amber-panda（本地历史媒体：`services/loading-amber-panda-390x844.png`）

QA 延迟本项目资源请求 1 秒以截取真实加载进度；该延迟只在测试环境生效。五语言柜机按钮截图位于 `locales/`，运行交互截图位于 `interaction/`。

[优化说明与验证边界](../../polish-20261012.md)。

## 连续画布录制

- 大厅四次选区过渡抽帧（本地历史媒体：`../../qa/polish-motion-20261012/hall/hall-recorded-transitions.jpg`）及[原始时间戳](../../qa/polish-motion-20261012/hall/hall-decoding.json)。
- [四模式待机、旋转、演出和结算记录](../../qa/polish-motion-20261012/direct-canvas-audit.json)及[帧间隔记录](../../qa/polish-motion-20261012/sequential-decoding.json)。
- 当前应用内预览截图（本地历史媒体：`preview-in-app.png`）。

原始 WebM/GIF 在本地 QA 目录保留，不纳入 Git。抽帧只能检查被抽取的姿态，录制间隔不等于实机帧率；详见本轮优化说明。
