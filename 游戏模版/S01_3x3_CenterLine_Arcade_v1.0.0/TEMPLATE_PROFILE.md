# S01 · 3×3 单线街机 Slot

## 当前基线

- 模板版本：`1.0.0`
- 模板状态：`GOLD_MASTER`（正式母模板）
- 固化日期：`2026-08-28`
- 推荐用途：复制后换主题素材与 JSON 配置，不直接修改母模板
- Cocos Creator：`3.8.8`
- 技术栈：`Cocos Creator + TypeScript`
- 设计分辨率：`750 × 1334` 竖屏

## 模板身份

- 模板编号：`S01`
- 中文名：`3×3 单线街机 Slot`
- 英文名：`3×3 Center-Line Arcade Slot`
- 核心结构：3 转轴 × 3 行，仅中心横线中奖
- 产品定位：轻量、街机感、快速换皮、适合低成本批量生产

## 本模板包含的玩法

- 三个相同 Symbol 出现在中心横线时中奖
- `PAYOUT = BET × Symbol 倍率`
- 普通中奖、Near Miss、Big Win、Jackpot 四级反馈
- 自动旋转/停止、声音开关、奖励规则表
- 固定单主题启动；玩家不能在成品内切换主题
- JSON 控制中奖率、Near Miss、权重、倍率和大奖门槛
- 内嵌式 SOUND / RULES / AUTO 控制条
- 无黑底的程序化光环、冲击波、烟花、粒子和金币雨
- 单向从左至右的主题加载进度条
- 金色与暖红琥珀色的统一机台仪表风格

## 母模板使用规则

1. 复制整个干净模板目录，再修改副本。
2. 新产品继续使用 `S01` 玩法编号，美术主题不改变玩法编号。
3. 优先运行 `npm run theme:new` 生成新主题，不修改共享玩法内核。
4. 正式中奖率保持 `0.09`，Near Miss 保持 `0.14`；测试后必须恢复。
5. 每次交付前运行 `npm run theme:validate`，并检查普通中奖、Big Win 与 Jackpot。

## 本模板不属于

- 多中奖线 Slot
- 243/1024 Ways Slot
- 连消/Tumble Slot
- Hold & Win Slot
- Cluster Pays Slot
- Megaways Slot

## 后续模板编号建议

| 编号 | 玩法类型 | 建议名称 |
|---|---|---|
| `S01` | 3×3 中心单线 | 3×3 单线街机 Slot |
| `S02` | 5×3 固定多线 | 5×3 多线经典 Slot |
| `S03` | Ways | 243 Ways Slot |
| `S04` | 连消与倍率递增 | Tumble 连消 Slot |
| `S05` | 锁定 Symbol 重转 | Hold & Win Slot |
| `S06` | 相邻集群消除 | Cluster Pays Slot |

以后新建母模板时优先沿用 `S编号 + 结构 + 核心玩法` 的命名方式，美术主题只写在产品名中，不再用主题名代表玩法模板。
