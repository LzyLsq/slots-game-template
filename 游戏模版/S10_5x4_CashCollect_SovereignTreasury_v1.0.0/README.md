# S10 · Sovereign Treasury 5×4 Cash Collect Slot

商业级竖屏 Cocos Creator 3.8.8 + TypeScript Slots 模板。纯金、深绿琲琅和珠宝金库机柜覆盖全屏，所有文字、转轴、余额和按钮都对齐机柜的真实凹槽。核心玩法为 5×4、1024 Ways 与 Cash Collect：前四轴的金币携带倍率，第五轴出现 Collector 宝箱后一次收集。

## 运行

1. 在 Cocos Dashboard 中导入本目录。
2. 使用 Cocos Creator `3.8.8`。
3. 打开 `assets/scenes/Main.scene` 预览，或执行 `npm run build:web`。
4. Web Mobile 构建会显示一次 Sovereign Treasury 品牌加载页，并在真正准备完成后平滑交接到机柜。

## 玩法与交互

- 5 转轴 × 4 行，1024 Ways
- 金币倍率只出现在前四轴
- 第五轴 Collector 收集所有可见金币，双 Collector 可双倍收集
- 四阶段转轴运动：回拉、加速、高速滚动、逐轴减速回弹
- 宝石环境微粒子、标题呼吸、SPIN 光环、中奖符号弹性高亮
- Cash Collect 金币弧线飞入收集槽，获奖金币涌入余额栏
- 余额按真实时间线性增长，不瞬间跳数
- SPIN、AUTO/STOP、BET ±、SOUND、RULES、HOME、余额加号均有真实功能和按压反馈
- 750×1624 竖屏设计，主要验收视口为 390×844

## 配置与验证

主题配置位于 `assets/resources/config/sovereign-treasury.json`。交付前执行：

```bash
npm run theme:validate
npm run build:web
```

Web 构建后如 Cocos CLI 在 macOS 返回 `36` 但日志已显示 `Finished`，可单独执行 `node scripts/patch-web-build.mjs ./build/web-mobile` 完成加载页补丁。

## 说明

当前数学模型用于高保真游戏原型，不是经过独立审计的真实货币博彩模型。上线现金产品前需替换合规 RNG/RTP 数学包，并完成年龄、付费和地区合规。
