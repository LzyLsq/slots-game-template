# F40 获奖演出验收资料 · 2026-10-12

版本：`f40-award-crescendo-20261012`。参见[修改与验证报告](../../award-crescendo-20261012.md)。

## 四台柜机的分级演出

四柜机 EPIC · 390×844（本地历史媒体：`awards/four-epic-390x844.jpg`）

- 390×844 对照图（本地历史媒体：`awards/four-epic-390x844.jpg`） · 320×568 对照图（本地历史媒体：`awards/four-epic-320x568.jpg`）
- 凤凰（本地历史媒体：`awards/golden-phoenix-epic-390x844.png`） · 玉龙（本地历史媒体：`awards/jade-dragon-epic-390x844.png`） · 麒麟（本地历史媒体：`awards/pearl-qilin-epic-390x844.png`） · 熊猫（本地历史媒体：`awards/amber-panda-epic-390x844.png`）
- [32 组布局数据](awards/award-audit.json) · [交互与恢复](interaction/interaction-audit.json)

以上为直接演出样例，**不结算钱包**。截图只能验证构图和可读性。

## 连续录像与实际结算

| 模式 | 扣款并结算的 SUPER 录像 | 连续画面 | 吉祥物局部姿态 |
|---|---|---|---|
| 凤凰 | WebM（本地历史媒体：`motion/direct-canvas/golden-phoenix-spin-award.webm`） | 原始帧（本地历史媒体：`motion/golden-phoenix-spin-award-sequence.jpg`） | 姿态（本地历史媒体：`motion/golden-phoenix-spin-award-guardian-poses.jpg`） |
| 玉龙 | WebM（本地历史媒体：`motion/direct-canvas/jade-dragon-spin-award.webm`） | 原始帧（本地历史媒体：`motion/jade-dragon-spin-award-sequence.jpg`） | 姿态（本地历史媒体：`motion/jade-dragon-spin-award-guardian-poses.jpg`） |
| 麒麟 | WebM（本地历史媒体：`motion/direct-canvas/pearl-qilin-spin-award.webm`） | 原始帧（本地历史媒体：`motion/pearl-qilin-spin-award-sequence.jpg`） | 姿态（本地历史媒体：`motion/pearl-qilin-spin-award-guardian-poses.jpg`） |
| 熊猫 | WebM（本地历史媒体：`motion/direct-canvas/amber-panda-spin-award.webm`） | 原始帧（本地历史媒体：`motion/amber-panda-spin-award-sequence.jpg`） | 姿态（本地历史媒体：`motion/amber-panda-spin-award-guardian-poses.jpg`） |

[四模式扣款、入账和录制检查](motion/direct-canvas-audit.json) · [原始视频解码时间](motion/sequential-decoding.json)。本地强制结果用于重复验证实际账务流程，不代表自然中奖概率。

EPIC 顺序复测：

- 凤凰：完整录像（本地历史媒体：`isolated-motion/direct-canvas/golden-phoenix-spin-award.webm`）、全流程原始帧（本地历史媒体：`isolated-motion/golden-phoenix-spin-award-sequence.jpg`）、姿态（本地历史媒体：`isolated-motion/golden-phoenix-spin-award-guardian-poses.jpg`）。
- 玉龙：完整录像（本地历史媒体：`isolated-motion/direct-canvas/jade-dragon-spin-award.webm`）、全流程原始帧（本地历史媒体：`isolated-motion/jade-dragon-spin-award-sequence.jpg`）、姿态（本地历史媒体：`isolated-motion/jade-dragon-spin-award-guardian-poses.jpg`）。该轮包含特色玩法，实际入账 13,324。
- [页面 rAF、Long Tasks、升级路径和结算](isolated-motion/direct-canvas-audit.json) · [源视频解码时序](isolated-motion/sequential-decoding.json)。

所有录像均直接采集 Cocos GameCanvas，解码图按源时间逐帧读取，无插帧。凤凰顺序复测仍有 3 个 >100 ms 视频间隔，详见报告；录制不等于原生手机性能验收。WebM 为本地审查材料，按项目规则不纳入 Git。

## 小屏多语言和长金额

五语言 × 两金额截图（本地历史媒体：`copy/five-language-small-screen.jpg`） · [10 组数据](copy/copy-audit.json)。逐张检查实际渲染。长金额 12,345,678 只用于排版压力检查，演出样例不会修改存档或钱包。
