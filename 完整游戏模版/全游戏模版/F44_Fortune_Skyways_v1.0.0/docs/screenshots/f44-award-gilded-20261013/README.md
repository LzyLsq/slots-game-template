# F44 · 获奖闪光与嵌饰专项

日期：2026-10-13。来自当前 Cocos 导出 `build/web-award-gilded-20261013`，版本 `f44-award-gilded-20261013`。四张主图均在实际付费强制 EPIC、钱包完成结算后，等待完整入场，再揭晓后约 1.12 秒截取。强制结果用于演出和结算检查，不用于说明自然中奖概率。

本轮四台柜机均增加主题宝石、罗盘嵌饰、沿金属侧轨错峰的图片星芒；增强标题掩膜扫光、金币反光、两波金色喷泉和柜机背后烟花。使用 F44 已有的精细图片，不新增手绘图标。金额、余额和控制区保持原有位置。

![四模式演出高潮](four-awards.jpg)

| 模式 | 当前 EPIC 图片 |
|---|---|
| Golden Otter | [390×844](golden-otter-epic-390x844.png) |
| Moon Rabbit | [390×844](moon-rabbit-epic-390x844.png) |
| Star Fox | [390×844](star-fox-epic-390x844.png) |
| Cloud Elephant | [390×844](cloud-elephant-epic-390x844.png) |

- [两种手机比例、四奖级，共 32 项检查](../../qa/f44-award-gilded-20261013/tiers/award-audit.json)。
- [小屏四模式、四奖级总览](../../qa/f44-award-gilded-20261013/tiers/small-screen-tiers.jpg)：使用演出夹具，不改钱包，WIN 为原来的读数。
- [提前揭晓、自动退出、重复进入、尺寸变化与减少动态](../../qa/f44-award-gilded-20261013/interactions/interaction-audit.json)。
- [连续录像与真实付费结算](../../qa/f44-award-gilded-20261013/motion/motion-audit.json)：1,181 个金额/余额采样；四个模式本地 `continuous.webm` 均保留。
- [录像解码与采样时间](../../qa/f44-award-gilded-20261013/motion/recorded-sequences.json)。逐张查看四条序列，涵盖揭晓高光与淡出；静态截图只用于构图和可读性。
- [嵌饰与保护区边界](../../qa/f44-award-gilded-20261013/ornament-geometry.json) · [本轮源码/导出与检查记录](../../qa/f44-award-gilded-20261013/delivery/manifest.json) · [验收记录](../../acceptance.md)。

检查范围是桌面 Chromium 中的 Cocos 导出与手机比例模拟，不代表移动真机、原生支付或商店发布验收。
