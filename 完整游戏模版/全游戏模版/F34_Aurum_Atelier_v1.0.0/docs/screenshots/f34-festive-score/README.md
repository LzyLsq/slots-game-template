# F34 · Festive score evidence

当前配乐版本：2026-09-30。五个场景背景循环和所有获奖/反馈音效重新编排为欢快、喜庆、具有赌场庆典和财富气息的音乐。

## 试听

[35 秒五主题背景音乐合集](festive-music-preview.wav)是源曲片段拼接，仅用于试听，不是游戏录屏。每个主题 7 秒：

| 时间 | 主题 |
|---|---|
| 0–7 s | 大厅 · 钢琴/铜管 swing |
| 7–14 s | Coin Engraver · 金币铃音 shuffle |
| 14–21 s | Sapphire Faceter · 珠宝 Latin swing |
| 21–28 s | Pearl Loom · 钢琴 gala swing |
| 28–35 s | Crown Foundry · 皇家铜管庆典 |

## 实际游戏原声

- [Pearl BIG 完整过程](motion/pearl-complete-with-audio.webm)：待机、真实种子结算、旋转、自动演出、金额揭晓、退出和返回大厅。[事件时刻与结算](motion/pearl-complete-with-audio.json)。
- [Crown EPIC 完整过程](motion/crown-epic-complete-with-audio.webm)：同样覆盖旋转、自动计数、高潮、退出和返回大厅，使用隔离测试获奖 fixture。[事件时刻与结算](motion/crown-epic-complete-with-audio.json)。

以上录屏直接抓取 Cocos Canvas 和受管理的 WebAudio，两者使用同一 MediaRecorder 时钟，没有后期配音。固定随机种子和 fixture 只存在于隔离测试上下文，不反映自然奖级频率。

## 截图

截图用于确认录制场景和构图，不能证明音乐听感或动画流畅性。

| 柜机 | 待机 | 自动演出或 BIG 高潮 |
|---|---|---|
| Coin Engraver | [待机](golden-hour-390x844-idle.png) | [BIG](golden-hour-big-climax.png) |
| Sapphire Faceter | [待机](jade-treasury-390x844-idle.png) | [BIG](jade-treasury-big-climax.png) |
| Pearl Loom | [待机](pearl-palace-390x844-idle.png) | [自动 BIG](pearl-automatic-climax.png) |
| Crown Foundry | [待机](ruby-revel-390x844-idle.png) | [自动 EPIC fixture](crown-epic-automatic-climax.png) |

## 检查结果

- [源 WAV 更新、身份及 PCM 检查](source-audio-audit.json)：44 条全部更新、UUID 保持、无削波、6 个循环接缝通过。
- [最终构建音频比对](build-audit.json)：构建中 44 条 WAV 与当前源文件相同。
- [7 个实际播放与交互案例](runtime-qa.json)：四模式、四档演出、静音、后台恢复、退出、余额和大厅音乐检查。
- [reduced motion 检查](motion/reduced-check.json)：320 × 568 下声音输出与即时揭晓、退出和旋转清理。
- [TypeScript 检查](typecheck.log)及 [11 组逻辑检查](test.log)。
- [试听 PCM 与录屏音轨检查](media-audit.json)：35 秒试听信号正常，两段最终录屏均包含立体声 Opus 音轨。
- [修改前清单](previous-audio-inventory.json)仅用于比较资源哈希和 UUID，保留的是历史状态。

原创建模合成音乐，无外部采样。桌面预览验证不代替主观听感和移动实机声音验收。[改动记录](../../festive-score-20260930.md)。
