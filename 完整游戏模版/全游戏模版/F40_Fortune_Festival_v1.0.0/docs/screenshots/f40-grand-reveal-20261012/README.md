# F40 大奖演出 · 最终证据

版本：`f40-grand-reveal-final-20261012`。所有下方截图、录像和报告均为金属金额修复后的构建。

[修改及验证说明](../../grand-reveal-20261012.md)。静态截图验收构图；连续录像验收演出进入、升级、揭晓、回收和恢复。

## 最终画面

- 四模式 EPIC 小屏对照（本地历史媒体：`small-phone-epic.jpg`）
- 四模式 BIG 小屏对照（本地历史媒体：`small-phone-big.jpg`）
- [32 组奖级及字形验证](awards/award-audit.json)
- [五语言和长金额验证](copy/copy-audit.json)
- [交互恢复验证](interactions/interaction-audit.json)

凤凰 EPIC 演出（本地历史媒体：`awards/golden-phoenix-epic-390x844.png`）

## 四模式连续录像

| 模式 | 原始视频 | 连续帧图 |
|---|---|---|
| Golden Phoenix | 观看（本地历史媒体：`final-motion/direct-canvas/golden-phoenix-spin-award.webm`） | 查看（本地历史媒体：`final-motion/golden-phoenix-spin-award-sequence.jpg`） |
| Jade Dragon | 观看（本地历史媒体：`final-motion/direct-canvas/jade-dragon-spin-award.webm`） | 查看（本地历史媒体：`final-motion/jade-dragon-spin-award-sequence.jpg`） |
| Pearl Qilin | 观看（本地历史媒体：`final-motion/direct-canvas/pearl-qilin-spin-award.webm`） | 查看（本地历史媒体：`final-motion/pearl-qilin-spin-award-sequence.jpg`） |
| Amber Panda | 观看（本地历史媒体：`final-motion/direct-canvas/amber-panda-spin-award.webm`） | 查看（本地历史媒体：`final-motion/amber-panda-spin-award-sequence.jpg`） |

- [四模式实际本地扣款、结算与演出报告](final-motion/direct-canvas-audit.json)
- [顺序原始帧解码报告](final-motion/sequential-decoding.json)
- [原始帧间隔与演出阶段位置](final-motion/source-frame-gaps.json)

录像使用强制 EPIC 测试结果，仍验证真实本地交易与恢复，不是自然概率证据。帧图来自原始录像，没有插值。龙入口及麒麟特殊玩法存在少量长帧，详见修改说明；不代表手机实机性能验收。

`motion/` 是金额兼容修复前的中间证据，不用于最终结论；本页只引用 `final-motion/`。
