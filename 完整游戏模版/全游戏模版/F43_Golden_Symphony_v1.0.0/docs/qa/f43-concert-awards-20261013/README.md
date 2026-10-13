# F43 · build11 配乐与大奖演出

版本 `f43-concert-awards-20261013`，日期2026-10-13。此索引记录本轮实际画面与声音，不复用旧版演出截图。完整结果见[summary.json](summary.json)，构建及源码指纹见[build11-artifact-source.json](build11-artifact-source.json)。

## 实际扣款、结算及自然退出录像

各段均录制实际Canvas与WebAudio最终混音，包含待机、旋转、调试SUPER结算、三段揭奖和自动退出。调试大奖不代表自然中奖概率；源帧未补帧，151–173ms的最大录制间隔保留在[解码结果](motion/sequential-decoding.json)。声音信号正常不等于主观试听或手机扬声器验收。

| 模式 | 揭奖画面 | 第三段高潮 | 有声连续录像 | 顺序源帧 |
|---|---|---|---|---|
| Golden Strings | [画面](motion/golden-strings-super-390x844.png) | [画面](motion/golden-strings-encore-390x844.png) | [播放](motion/direct-canvas/golden-strings-spin-award.webm) | [联系图](motion/golden-strings-spin-award-sequence.jpg) |
| Sapphire Harp | [画面](motion/sapphire-harp-super-390x844.png) | [画面](motion/sapphire-harp-encore-390x844.png) | [播放](motion/direct-canvas/sapphire-harp-spin-award.webm) | [联系图](motion/sapphire-harp-spin-award-sequence.jpg) |
| Ruby Brass | [画面](motion/ruby-brass-super-390x844.png) | [画面](motion/ruby-brass-encore-390x844.png) | [播放](motion/direct-canvas/ruby-brass-spin-award.webm) | [联系图](motion/ruby-brass-spin-award-sequence.jpg) |
| Pearl Rhythm | [画面](motion/pearl-rhythm-super-390x844.png) | [画面](motion/pearl-rhythm-encore-390x844.png) | [播放](motion/direct-canvas/pearl-rhythm-spin-award.webm) | [联系图](motion/pearl-rhythm-spin-award-sequence.jpg) |

[结算与背景状态](motion/motion-audit.json)、[实际录音信号](motion/recorded-audio-audit.json)、[31项声音生命周期](audio-runtime/runtime-audit.json)、[演出交互](interactions/interaction-audit.json)。

## 四模式、四奖级、两种手机尺寸

以下32张为独立演出构图fixture，延长揭示停留至60秒便于截图；不用于证明自然中奖率、实际可达金额或自动退出时序。普通产品时序另由上方实际录像及交互检查验证。

| 模式与视口 | BIG | SUPER | MEGA | EPIC |
|---|---|---|---|---|
| Golden Strings · 320x568 | [画面](awards/golden-strings-big-320x568.png) | [画面](awards/golden-strings-super-320x568.png) | [画面](awards/golden-strings-mega-320x568.png) | [画面](awards/golden-strings-epic-320x568.png) |
| Sapphire Harp · 320x568 | [画面](awards/sapphire-harp-big-320x568.png) | [画面](awards/sapphire-harp-super-320x568.png) | [画面](awards/sapphire-harp-mega-320x568.png) | [画面](awards/sapphire-harp-epic-320x568.png) |
| Ruby Brass · 320x568 | [画面](awards/ruby-brass-big-320x568.png) | [画面](awards/ruby-brass-super-320x568.png) | [画面](awards/ruby-brass-mega-320x568.png) | [画面](awards/ruby-brass-epic-320x568.png) |
| Pearl Rhythm · 320x568 | [画面](awards/pearl-rhythm-big-320x568.png) | [画面](awards/pearl-rhythm-super-320x568.png) | [画面](awards/pearl-rhythm-mega-320x568.png) | [画面](awards/pearl-rhythm-epic-320x568.png) |
| Golden Strings · 390x844 | [画面](awards/golden-strings-big-390x844.png) | [画面](awards/golden-strings-super-390x844.png) | [画面](awards/golden-strings-mega-390x844.png) | [画面](awards/golden-strings-epic-390x844.png) |
| Sapphire Harp · 390x844 | [画面](awards/sapphire-harp-big-390x844.png) | [画面](awards/sapphire-harp-super-390x844.png) | [画面](awards/sapphire-harp-mega-390x844.png) | [画面](awards/sapphire-harp-epic-390x844.png) |
| Ruby Brass · 390x844 | [画面](awards/ruby-brass-big-390x844.png) | [画面](awards/ruby-brass-super-390x844.png) | [画面](awards/ruby-brass-mega-390x844.png) | [画面](awards/ruby-brass-epic-390x844.png) |
| Pearl Rhythm · 390x844 | [画面](awards/pearl-rhythm-big-390x844.png) | [画面](awards/pearl-rhythm-super-390x844.png) | [画面](awards/pearl-rhythm-mega-390x844.png) | [画面](awards/pearl-rhythm-epic-390x844.png) |

[构图检查结果](awards/award-audit.json)。全部画面已在[小屏1](awards/review-320x568-1.jpg)、[小屏2](awards/review-320x568-2.jpg)、[常规1](awards/review-390x844-1.jpg)、[常规2](awards/review-390x844-2.jpg)中逐张复看。

## 音频和构建范围

90个WAV按五个场景配器重新渲染，三高潮时点为0.20/1.05/1.90秒；高频处理、乐谱与来源分别保存于[音频来源](../../audio-provenance.json)与[乐谱](../../../art-source/symphony-score.json)。[PCM检查](audio/signal-audit.json)覆盖90个文件与6个循环接缝。

Creator在15秒报告构建完成，但CLI退出36并含script-worker SIGTERM；保留[原日志](build11.log)。实际浏览器产物和声音已单独验证，不将退出码描述为0。本轮没有提交或推送Git；未进行主观试听、原生真机性能或发布验证。
