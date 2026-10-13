# F34 — 财富演出与大奖判定

日期：2026-09-30。对应预览版本 `f34-wealth-awards-final`。

本次要求：获奖演出更豪华；只要赢钱大于下注就算大奖；其他奖保留。

## 最终行为

按本轮**实际扣除的下注**比较总返还金额。旋转开始即固定该金额，扣款、结算、状态说明和演出使用同一个值；恢复待结算轮次时取原轮次下注。获奖演出只展示已到账金额，不再次发币。

| 总返还金额 | 演出 |
|---|---|
| 0 | 无奖 |
| 大于 0 且小于或等于实际下注 | 普通奖；等额显示下注返还 |
| 严格大于下注且小于 10 倍 | BIG WIN |
| 至少 10 倍、小于 50 倍 | SUPER BIG WIN |
| 至少 50 倍、小于 100 倍 | MEGA WIN |
| 至少 100 倍 | EPIC WIN |

自然随机、赔付引擎和原新人独立补足机制未更改。普通奖、中奖格相框、模式特征过程及高奖级保留。规则和五语言说明与新阈值一致。

## 画面与交互

- 四个模式分别使用新生成的金币宝箱、蓝宝石、珍珠贝壳及红宝石王冠财富房间。
- BIG / SUPER / MEGA / EPIC 均为透明背景图片艺术标题，等比例显示；扫光限制在标题字形内部。
- 图片金币向两侧喷涌，珠宝局部反光，标题慢浮动；金额计数位于每张房间插画真实的珐琅底座内。
- 一次点击立即显示完整金额，再次点击退出；等待也会自动结束。关闭时恢复柜机部件，转轴、余额、下注、规则和返回操作恢复可用。
- reduced motion 下直接显示完整金额，保留清楚的等级及继续操作。
- 修复演出节点销毁时查询已销毁子节点组件造成的持续浏览器错误；销毁时直接停止已保存的动画目标。

图片生成入口：`art-source/generate_wealth_awards_ccswitch.py`，使用本机 CC Switch 已配置的图片服务；没有更改全局配置。对应资源为 `assets/resources/art/award-*-room.png`、`award-title-*.png` 与 `award-coin.png`。

## 已执行验证

Cocos Creator 3.8.8 的 web-mobile 构建成功，TypeScript 检查通过，`npm test` 的 11 组检查通过。新增测试覆盖严格金额边界、保留的高奖级、五语言和四个房间的比例及金额位置。

桌面 Chrome 手机模拟完成 13 个运行案例：9 个大奖/高奖级/reduced motion 案例、3 个真实低额普通奖，以及 1 个等额返还的演出边界案例。常规比例 390×844，小屏比例 320×568，DPR 2。大奖案例均实际点按 SPIN、触发结算，再检查余额、退出、增减下注、规则开关、下一局和返回大厅。未出现重复入账、遗留待结算轮次、输入锁死或浏览器错误。

| 模式 | 可复现种子 | 实际下注 | 基础总返还 | 结果 |
|---|---:|---:|---:|---|
| Coin Engraver | 17 | 80 | 341 | BIG |
| Sapphire Faceter | 13305 | 80 | 105 | BIG |
| Pearl Loom | 27 | 80 | 87 | BIG |
| Crown Foundry | 2 | 80 | 83 | BIG |
| Sapphire Faceter | 1 | 80 | 3 | 普通 |
| Pearl Loom | 1 | 80 | 2 | 普通 |
| Crown Foundry | 3 | 80 | 66 | 普通 |

上述种子仅注入临时测试浏览器上下文，正常游戏仍使用原随机源。SUPER / MEGA / EPIC 的高档演出另外使用明确标记的 debug bonus 检查，并非自然随机概率证据。Coin 的等额返还 80 使用仅演出的边界输入，不更改余额，不冒充自然产生的中奖。

完整结果在 [runtime-qa.json](screenshots/f34-wealth-awards/runtime-qa.json)。[四主题对照](screenshots/f34-wealth-awards/four-themes-awards-overview.jpg)覆盖 BIG 和普通奖构图；[Pearl 连续录制](screenshots/f34-wealth-awards/motion/pearl-super-complete.webm)覆盖旋转、落定、入场、金额递增、停留、退出及再次旋转。[时间序列](screenshots/f34-wealth-awards/motion/pearl-super-timeline.jpg)辅助检查时序，不将单张截图视为流畅度证明。

本轮是本地演出与交互验收；没有执行移动真机或 App Store 发布验收。
