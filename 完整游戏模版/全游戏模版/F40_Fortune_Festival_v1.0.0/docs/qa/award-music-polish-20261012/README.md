# F40 演出与音乐检查索引 · 2026-10-12

当前版本：`f40-award-music-polish-20261012`。变更与限制见 [本轮报告](../../award-music-polish-20261012.md)。

## 最后导出的画面与交互

最后导出包含地面提示衬底的最终修正。

- 四柜机 EPIC · 320×568（本地历史媒体：`final/awards/four-epic-320x568.jpg`）
- 四柜机 EPIC · 390×844（本地历史媒体：`final/awards/four-epic-390x844.jpg`）
- [32 组模式/奖级/手机比例检查](final/awards/award-audit.json)
- [10 组五语言与长金额检查](final/copy/copy-audit.json)
- [提前揭晓、尺寸变化、恢复、自动退出与低动态检查](final/interactions/interaction-audit.json)
- 最后麒麟完整过程图（本地历史媒体：`final/motion/pearl-qilin-spin-award-sequence.jpg`）
- 最后麒麟连续视频（无声音）（本地历史媒体：`final/motion/direct-canvas/pearl-qilin-spin-award.webm`）
- [最后麒麟实时状态、帧时间与单次扣款/结算](final/motion/direct-canvas-audit.json)
- [最后麒麟原始视频帧顺序解码](final/motion/sequential-decoding.json)

## 本轮四柜机连续演出

以下录制覆盖本轮双高潮、音乐事件配合及收尾逻辑，早于最后地面提示衬底修正。视频只录画面；不能用它们证明听感或声画输出延迟。每轮经过真实本地扣款和结算，但使用调试 EPIC 结果，不能证明生产随机概率。

| 柜机 | 完整过程图 | 连续画面视频 |
| --- | --- | --- |
| Golden Phoenix | 顺序帧（本地历史媒体：`motion/golden-phoenix-spin-award-sequence.jpg`） | 无声 WebM（本地历史媒体：`motion/direct-canvas/golden-phoenix-spin-award.webm`） |
| Jade Dragon | 顺序帧（本地历史媒体：`motion/jade-dragon-spin-award-sequence.jpg`） | 无声 WebM（本地历史媒体：`motion/direct-canvas/jade-dragon-spin-award.webm`） |
| Pearl Qilin | 顺序帧（本地历史媒体：`motion/pearl-qilin-spin-award-sequence.jpg`） | 无声 WebM（本地历史媒体：`motion/direct-canvas/pearl-qilin-spin-award.webm`） |
| Amber Panda | 顺序帧（本地历史媒体：`motion/amber-panda-spin-award-sequence.jpg`） | 无声 WebM（本地历史媒体：`motion/direct-canvas/amber-panda-spin-award.webm`） |

- [四轮状态、扣款/结算及 RAF 帧时间](motion/direct-canvas-audit.json)
- [四段视频原始帧顺序解码](motion/sequential-decoding.json)
- [龙柜机三轮无录制复查](frame-consistency/frame-review.json)

龙柜机初次录制出现一次超过 100 ms 的 RAF/源视频间隔；随后无录制三轮未复现。不能据此排除实机卡顿。最后麒麟录制最大 RAF 间隔约 16.8 ms，原视频最大间隔 51 ms；仅代表本次桌面环境的记录。

## 音频、源码和导出

- [90 段最终 PCM 检查与循环边界](audio/signal-audit.json)
- [31 项音频运行检查及四轮扣款/结算](audio/runtime-audit.json)
- [最后导出 90 个 WAV 与作者源文件的哈希](final/export-audit.json)
- [重排前后部分频谱/音量测量](audio/measurement-comparison.json)（并非全部高频能量下降）
- [成功音频渲染日志](audio-render.log) · [首次失败渲染日志](audio-render-attempt-1.log)
- [最后 TypeScript 和演出契约检查](final-source-checks.log)
- [40 组柜机/视口布局检查](test-layout.log) · [五语言检查](test-language.log)
- [最后 Creator 导出日志](creator-build-final.log) · [上一导出日志](creator-build.log)

音频运行检查早于最后提示衬底修正；音频源码与 90 段 WAV 此后未变。Creator 报告最后导出 Finished，但 CLI 退出码为 36 并含 SIGTERM 诊断；已运行验证当前预览，不能记为干净的 CLI 成功退出。主观试听、移动原生设备、正式服务、支付、签名与商店审核未验证。
