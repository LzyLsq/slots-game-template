# 大厅选中效果 · 当前证据

版本：`f40-gilded-selection-20261012`。以下截图及录像来自本轮最终导出预览，日期 2026-10-12。

## 画面与连续过程

- [修改前 · 390×844](before-390x844.png)
- [修改后 · 390×844](after-390x844.png)
- [入口与底部导航对比](selection-comparison.jpg)
- [实际画布切换录像](motion/hall-selection.webm)
- [切换过程接触表](motion/selection-transition-sheet.jpg)
- [录像结束后大厅](motion/hall-restored.png)
- [录像解码记录](motion/decoded-video.json)：242 帧，8.031 秒。

录像为无声视觉记录，不用于证明原生帧率或音频品质。本轮未修改音乐。

## 四个选中状态

| 模式 | 320×568 | 390×844 |
| --- | --- | --- |
| Golden Phoenix | [截图](states/320x568-0.png) | [截图](states/390x844-0.png) |
| Jade Dragon | [截图](states/320x568-1.png) | [截图](states/390x844-1.png) |
| Pearl Qilin | [截图](states/320x568-2.png) | [截图](states/390x844-2.png) |
| Amber Panda | [截图](states/320x568-3.png) | [截图](states/390x844-3.png) |

## 自动检查记录

- [8 个选中状态](selection-state-audit.json)：稳定后一个当前场景，其他高光透明。
- [四模式进入、返回与五个底部导航](entry-navigation-audit.json)。
- [快速点击与立即反向滑动](rapid-selection-audit.json)。
- [两种视口、五种语言的布局与交互检查](layout/hall-audit.json)：10 个渲染场景。
- [连续切换状态及浏览器错误检查](motion/hall-motion-audit.json)。
- [Creator 导出日志](creator-build.log)。

Creator 报告导出完成，但 CLI 返回 36 并出现 worker SIGTERM 诊断；运行中的最终导出已检查，不应将其记录为干净的 CLI 退出。桌面手机尺寸模拟与画布录像不替代移动真机或原生发布验收。

[实现与完整验证说明](../../hall-selection-20261012.md)。
