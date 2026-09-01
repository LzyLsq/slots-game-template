# S06 · Gilded Vault 5×3 Multi-Line Slot

商业级竖屏 Cocos Creator 3.8.8 + TypeScript Slots 模板。主题为黑金私人金库，核心元素包括金币、珠宝、宝石、金库门和金币宝箱。这是真正可玩的 5×3 多线 Slots，不是静态换皮页。

## 打开与运行

1. 在 Cocos Dashboard 中导入本目录。
2. 使用 Cocos Creator `3.8.8`。
3. 打开 `assets/scenes/Main.scene`。
4. 点击 Preview，或执行 `npm run build:web`构建 Web Mobile。

`build:web` 会关闭黑底 Cocos 启动 Logo，让游戏自己的 Gilded Vault 动态加载页直接出现。

## 玩法与功能

- 5 转轴 × 3 行，10 条固定支付线
- 从左向右连续 3/4/5 个相同 Symbol 获奖
- WILD 皇冠可替代普通 Symbol
- 3+ SCATTER 金库门奖励 5 次免费旋转
- 3+ 金币宝箱触发 Treasure Bonus
- 收集 12 枚金币开启 Coin Vault 奖励
- GRAND 奖池随投注线性增长
- 中奖后金币涌入 BALANCE，金额平滑计数增长
- SPIN、AUTO/STOP、BET ±、SOUND、RULES、充值均有真实反馈
- 弹性停轮、多线高亮、金币雨、金光环和分级得奖舞台
- 750×1624 竖屏设计，适配常见手机比例

## 配置

主题配置在 `assets/resources/config/gilded-vault.json`，可调整 `winRate`、`nearMissRate`、投注、支付线、符号权重/赔率、文案、美术路径与机柜对位。

交付前运行：

```bash
npm run theme:validate
npm run build:web
```

## 商业化说明

当前数学模型用于高保真游戏原型，不是经过独立审计的现金博彩模型。上线真实货币产品前，需替换为合规的 RNG/RTP 数学包，并完成年龄、隐私、付费与地区合规。
