# S09 · Royal Ascension 5×4 Expanding Wild Respins Slot

## 运行截图

![S09 Royal Ascension 完整运行截图](../游戏截图/S09_5x4_ExpandingWilds_RoyalAscension.png)

商业级竖屏 Cocos Creator 3.8.8 + TypeScript Slots 模板。主题采用皇家红、蓝宝石和高纯度黄金机柜，核心玩法是 5×4 的 1024 Ways、整轴扩展金狮 WILD、锁轴免费重转和皇家宝箱奖励。这是具有真实余额、投注、输赢和功能弹层的可玩模板，不是静态换皮页。

## 打开与运行

1. 在 Cocos Dashboard 中导入本目录。
2. 使用 Cocos Creator `3.8.8`。
3. 打开 `assets/scenes/Main.scene`。
4. 点击 Preview，或执行 `npm run build:web` 构建 Web Mobile。

Web 构建会关闭默认黑底引擎 Logo，只显示一次 Royal Ascension 品牌加载页；游戏准备完成后平滑交接到机柜，不再重复加载。

## 玩法与功能

- 5 转轴 × 4 行，1024 Ways
- 从最左侧开始，相邻转轴出现 3/4/5 个相同 Symbol 获奖
- 同一转轴的多个匹配位置会相乘形成真实 Ways 数
- WILD 金狮会扩展填满整个转轴
- 扩展转轴保持锁定，其余转轴自动免费重转一次
- 3+ Ascension Scatter 奖励 5 次免费旋转
- 3+ Royal Chest 触发宝箱奖金
- 每累计 5 条扩展 WILD 转轴，触发 `15× BET` Golden Ascension
- ASCENSION POT 随投注增长，余额中奖后线性计数
- SPIN、AUTO/STOP、BET ±、SOUND、RULES、充值均有真实反馈
- 四行弹性停轮、Ways 高亮、金币雨、金币涌入余额栏和分级获奖舞台
- 750×1624 竖屏设计，重点验收 390×844 手机视口

## 配置

主题配置在 `assets/resources/config/royal-ascension.json`。可调整中奖率、Near Miss、投注、Symbol 权重/赔率、免费旋转次数、金币收集目标、文案和美术路径。

交付前运行：

```bash
npm run theme:validate
npm run build:web
```

## 商业化说明

当前数学模型用于高保真游戏原型，不是经过独立审计的现金博彩模型。上线真实货币产品前，需替换为合规 RNG/RTP 数学包，并完成年龄、隐私、付费和地区合规。
