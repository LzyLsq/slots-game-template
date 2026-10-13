# F34 · 奖励演出衔接证据

2026-09-30，Cocos Creator 3.8.8 web-mobile 当前构建。对应修改见 [演出衔接说明](../../seated-awards-20260930.md)。

## 画面

- [四主题 BIG](four-awards.jpg)：标题固定尺寸，房间、宝藏与金额底座构图。截图处于计奖中，截图金额不是最终返还。
- [小屏 SUPER / MEGA / EPIC](small-screen-tiers.jpg)：320×568 手机模拟，标题与金额等比例适配。
- [珍珠入场至退出序列](award-transition-sequence.jpg)：连续录屏抽帧，显示完整柜机、渐入、计奖和淡出恢复。
- [reduced motion](pearl-reduced-320x568.png)。
- 各主题原始 idle / award PNG 保留在本目录。

## 连续音视频

- [珍珠演出片段，含实际游戏声音](motion/pearl-award-transition-with-audio.webm)：从完整录制直接截取，视频与音频流未重新编码或后配。
- [珍珠完整录制，含实际游戏声音](motion/pearl-complete-with-audio.webm)：待机→真实 seed 27 旋转→BIG→自动结束→返回大厅。
- [完整录制时间标记与返还](motion/pearl-complete-with-audio.json)：下注 80、返还 87。
- [reduced motion 结果](motion/reduced-check.json)。

## 运行结果

[runtime-qa.json](runtime-qa.json)记录 7 个通过案例：四主题 BIG（390×844），以及 Coin SUPER、Sapphire MEGA、Crown EPIC（320×568）。包括入场固定标题位置/尺寸、连续 opacity、完整柜机底板、金币路径、早揭晓、快速退出、静音和声音清理。所测案例没有浏览器错误。

四个 BIG 使用隔离测试种子从真实旋转进入；SUPER / MEGA / EPIC 使用明确标记的测试奖励 fixture，仅用于演出覆盖，不更改生产概率或用户存档。桌面模拟与录制不代表手机实机或商店发布验收完成。
