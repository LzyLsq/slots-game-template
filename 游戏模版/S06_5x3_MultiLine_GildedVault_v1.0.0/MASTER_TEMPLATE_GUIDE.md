# S06 · 5×3 固定多线 Slots 生产指南

S06 是“5×3 转轴内核 + 10 条支付线 + 特殊奖励 + 机柜式美术”的母模板。Gilded Vault 是已组装的黑金金库产品。

## 共用内核

- 5×3 转轴与 10 条固定支付线
- WILD / SCATTER / BONUS / COIN 四种特殊类型
- 免费旋转、金币进度、三宝箱奖励
- 正常输赢、Near Miss、Major Win、Jackpot
- 投注、余额、AUTO/STOP、SOUND、RULES、演示充值
- 弹性停轮、支付线高亮、金币流、线性金额增长和分级大奖舞台

## 生成新主题

```bash
npm run theme:new -- royal-egypt \
  --title="ROYAL EGYPT" \
  --subtitle="PHARAOH HIGH ROLLER" \
  --from=gilded-vault
```

新主题需准备：

- 1 张竖屏机柜/场景图，必须预留标题、金额、5×3 转轴、结果和控制台槽位
- 1 张标题艺术字
- 6–8 个普通符号，以及 WILD、SCATTER、BONUS、COIN
- HOME、SOUND、RULES、ADD COINS、AUTO、BET 图像按钮
- 可选的透明大奖框；任何光效都不得携带黑色烘底

保持美术图层和程序 UI 的责任分离：机柜图提供结构和氛围，Cocos 节点提供可变数字、实时 Symbol、输入区和交互反馈。

## 对位与适配

默认设计分辨率为 750×1624：Title `y=566`，Balance/GRAND `y=356`（ADD COINS 硬件位 `y=420`），Reel center `y=125`，Result `y=-64`，Meter `y=-103`，Physical controls `y=-188`，Bet label `y=-270`。五列中心为 `[-180, -90, 0, 90, 180]`，所有 Symbol 必须完整落在机柜奶油色五列开窗内。

更换机柜图后必须在 390×844、360×800 和 430×932 竖屏上重新验收，不能只替换背景不校准 UI。

## 交付检查

```bash
npm run theme:validate
npm run build:web
```

1. 品牌加载页可见，无 Cocos 黑底 Logo、无黑框、无红色闪屏。
2. 15 个 Symbol 格全部位于机柜转轴窗内。
3. BET 会变化，SPIN 会扣款，AUTO 可停止，SOUND 有状态反馈。
4. 规则页的名称和赔率可读，充值页按钮真正增加演示金币。
5. 普通未中奖、普通中奖、SCATTER、BONUS 和大奖都已检查。
6. 得奖不得出现暗色矩形边缘或全屏过曝白闪。
7. 截图必须来自真实运行的竖屏页面。
