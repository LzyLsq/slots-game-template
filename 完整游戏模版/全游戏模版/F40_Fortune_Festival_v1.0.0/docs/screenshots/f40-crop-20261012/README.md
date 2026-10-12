# F40 裁剪与暗边修正截图 · 2026-10-12

- 大厅与四台柜机，两种手机比例（本地历史媒体：`overview.jpg`）
- 登录、注册、商店、奖励、排行、账户与四模式加载（本地历史媒体：`services.jpg`）
- 四台柜机 × 四奖级 × 两种手机比例（本地历史媒体：`awards.jpg`）
- 四模式真实扣注、结算轮次的录制抽帧（本地历史媒体：`motion.jpg`）
- 凤凰 EPIC 完整截图（本地历史媒体：`golden-phoenix-epic-390x844.png`）

记录： [布局](layout-capture.json)、[服务页与加载](capture-audit.json)、[32 组演出](award-audit.json)、[8 组 GPU 遮罩](reel-aperture-audit.json)、[四模式实际轮次](direct-canvas-audit.json)。

32 组奖级截图为直接演出构图检查；四模式轮次另用调试 SUPER 结果检查真实扣注、结算和恢复，均未改变正式随机引擎。完整临时截图与录制留在 `/tmp/f40-crop-final-20261012/`，本目录保存截图索引、主要全尺寸截图、抽帧及运行记录。桌面浏览器模拟不能替代 iPhone/iPad 实机验收。
