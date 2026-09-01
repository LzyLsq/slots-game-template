# S09 · 5×4 1024 Ways Slots 生产指南

S09 是“5×4 Ways 内核 + 整轴扩展 WILD + 锁轴免费重转 + 免费旋转 + 宝箱奖励 + 机柜式美术”的母模板。Royal Ascension 是已组装的皇家黄金产品。

## 共用内核

- 5×4 转轴与 1024 Ways，从最左侧相邻转轴计算
- WILD / SCATTER / BONUS / COIN 四种特殊类型
- 整轴 WILD 扩展、锁轴重转和 5 格 Ascension Meter
- 正常输赢、Near Miss、Ascension Win、Golden Lion Jackpot
- 投注、余额、AUTO/STOP、SOUND、RULES、演示充值
- 四行弹性停轮、Ways 高亮、金币流、线性金额增长和分级大奖舞台

## 生成新主题

```bash
npm run theme:new -- royal-egypt \
  --title="ROYAL EGYPT" \
  --subtitle="PHARAOH WILD RESPINS" \
  --from=royal-ascension
```

新主题至少需准备：

- 1 张竖屏机柜图，预留标题、余额、5×4 屏幕、结果槽和物理控制位
- 5 个普通 Symbol，以及 WILD、SCATTER、BONUS、COIN
- HOME、SOUND、RULES、ADD CREDITS、AUTO、BET 透明图片按钮
- 1 张透明大奖舞台；不得携带黑色烘底、矩形阴影或色键残边

机柜图负责结构和氛围；Cocos 节点负责实时数字、Symbol、输入和交互反馈。更换机柜图后必须重新对位，不能只替换背景。

## 当前机柜对位

默认设计分辨率 `750×1624`：Balance `y=516`，Reel center `y=204`，Result `y=-112`，Wild/Ways meter `y=-154`，Physical controls `y=-260`，Bet/Auto label `y≈-326`，Ascension Pot `y=-660`。五列中心为 `[-236, -118, 0, 118, 236]`，四行中心为 `[210, 70, -70, -210]`。

更换机柜图后必须在 390×844、360×800 和 430×932 竖屏上重新验收。

## 交付检查

1. 品牌加载页可见，无默认黑底 Logo、无第二加载页、无红色闪帧。
2. 20 个 Symbol 格全部位于机柜 5×4 屏幕内，图像不被强行拉长。
3. BET 会变化，SPIN 会扣款，AUTO 可停止，SOUND 有状态反馈。
4. RULES 的名称和赔率可读，充值按钮真正增加演示余额。
5. 普通未中奖、普通中奖、Scatter、Chest Bonus 和扩展 WILD 锁轴重转已检查。
6. 得奖不得出现黑色矩形边缘、色键残边或全屏过曝白闪。
7. 截图必须来自真实运行的竖屏页面。
