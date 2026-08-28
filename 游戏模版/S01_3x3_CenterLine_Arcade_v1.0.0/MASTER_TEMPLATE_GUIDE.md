# S01 · 3×3 单线街机 Slot 母模板批量生产指南

这个项目现在是“玩法内核 + 主题配置 + 主题素材”的母模板。以后做海洋、埃及、财神、农场、太空等 Slot 时，原则上不再修改 `assets/scripts/SlotGame.ts` 和 `PayoutCalculator.ts`。

本模板的固定识别名为 `S01 · 3×3 单线街机 Slot`。`S01` 表示玩法类型，不表示美术主题；糖果、海洋、埃及都可以是 S01 产品。

## 一、哪些东西是共用内核

- 3×3 转轴、中心中奖线、逐列停轮
- 正常中奖、Near Miss、普通大奖、Mega Win、Jackpot
- 转动残影、能量光、停轮光环、粒子、金币雨、中奖横幅
- Bet、金币、自动旋转、声音开关、奖励规则表、加载进度
- Web Mobile 与 iOS 共用的 Cocos Creator 3.8.8 工程

这些逻辑属于母模板。新产品只改变 JSON 和图片，避免每个游戏复制一套逻辑后越改越乱。

## 二、生成新游戏骨架

在项目目录打开终端：

```bash
cd /Users/xzkj/Desktop/CocosSlotFactory
npm run theme:new -- ocean-treasure \
  --title="OCEAN TREASURE" \
  --subtitle="DEEP SEA SLOT" \
  --from=candy
```

参数说明：

- `ocean-treasure`：主题唯一 id，只能使用小写字母、数字和连字符。
- `--title`：游戏主标题。
- `--subtitle`：副标题。
- `--from=candy`：复制品质最完整的糖果主题作为视觉基础。

生成器会自动：

1. 创建 `assets/resources/config/ocean-treasure.json`。
2. 创建 `assets/resources/theme/ocean-treasure/`。
3. 把所有素材路径改成新主题路径。
4. 将新主题加入 `themes.json`。
5. 将新主题设为 `themes.json` 的默认启动主题；玩家界面不提供主题切换。
6. 不复制 `.meta` 文件，让 Cocos 为新资源生成独立 UUID。

生成后的主题立即可运行，但画面暂时还是源主题素材，需要继续替换美术。

## 三、每个主题需要准备的素材

优先保持生成目录中的文件名不变，直接替换图片：

| 类型 | 建议数量 | 用途 |
|---|---:|---|
| `background.png` | 1 | 主游戏全屏背景与机台氛围 |
| `loading-bg.png` | 1 | 加载页全屏背景 |
| `loading-logo.png` | 1 | 加载页游戏 Logo |
| `loading-mascot.png` | 1 | 加载页主角色或核心宝物 |
| `loading-food-1…5.png` | 5 | 加载页下方预览图标，可换成任意主题符号 |
| 普通转轴图标 | 6–8 | 低至中倍率符号 |
| 稀有转轴图标 | 2–3 | 高倍率符号 |
| Jackpot 图标 | 1 | 最高倍率符号，辨识度必须最高 |
| VFX 图片 | 复用母模板 | 光环、星芒、拖尾光、中奖边框等 |

加载素材支持自动降级：如果新主题暂时没有配置专属加载背景、主角色、预览图标或进度条，母模板会自动使用该主题自己的背景、最高倍率 Symbol、转轴 Symbol 和代码绘制的进度条，不会再出现空白圆形占位。正式交付时仍建议换成专属 Logo 与主视觉，以获得更强的主题辨识度。

美术要求：

- 符号使用透明 PNG，四周留 8%–12% 安全边距。
- 同一套符号保持统一视角、描边宽度、光源方向和饱和度。
- 最高倍率符号必须在轮廓、色相或外框上明显区别于普通符号。
- 不要把黑色背景烘进光效图；必须检查 Alpha 通道。
- 背景负责氛围，符号负责识别，特效负责反馈，三者不要抢同一层对比度。

## 四、编辑主题配置

新主题配置位于：

```text
assets/resources/config/<主题id>.json
```

重点字段：

- `copy`：按钮、加载页、结果、大奖与 Jackpot 的全部文案。
- `visual`：背景、加载页、符号、光效路径及主色。
- `symbols`：图标 id、素材路径、出现权重和赔率倍率。
- `winRate`：正式中奖率。
- `nearMissRate`：近中奖率。
- `winTiers.bigWinMultiplier`：进入 Mega Win 表现的倍率门槛。
- `winTiers.jackpotMultiplier`：进入 Jackpot 表现的倍率门槛。

游戏内 `RULES` 会自动读取当前主题的 `symbols`、倍率、Big Win/Jackpot 门槛和 `winRate`，无需为每个换皮产品手工重写奖励表。最高倍率达到 Jackpot 门槛时，会启用独立的多段金光、冲击波、烟花、金币雨与延长大奖横幅。

母模板当前正式概率为：

```json
"winRate": 0.09,
"nearMissRate": 0.14
```

开发时如需强制测试大奖，可以临时修改，但交付前必须恢复，并用校验命令确认。

## 五、每次交付前必须执行

```bash
cd /Users/xzkj/Desktop/CocosSlotFactory
npm run theme:validate
```

校验会检查：

- 主题是否注册、id 是否重复
- JSON 是否可解析
- 概率范围是否正确
- 默认 Bet 是否有效
- Symbol id、权重、倍率是否合法
- 配置引用的图片是否存在
- Jackpot 门槛是否有可达到的符号倍率

然后在 Cocos Creator 中：

1. 等待资源导入完成。
2. 清空控制台。
3. 预览加载页、空闲态、转动、停轮、普通中奖、Near Miss、Mega Win、Jackpot。
4. 构建 Web Mobile。
5. 检查浏览器控制台必须没有资源错误。
6. 准备上架时，再构建 iOS 并配置 Bundle ID、签名、图标、隐私信息和年龄评级。

## 六、推荐的批量生产节奏

一个主题分为四个阶段：

1. 主题策划：确定受众、色板、11 个符号、倍率层级、Logo 和主角色。
2. AI 美术：一次生成完整风格板，再批量生成透明符号和加载页资产。
3. 模板装配：运行 `theme:new`、替换素材、编辑 JSON、校验。
4. 品质验收：录制完整一局，逐帧检查溢出、黑底、遮挡、文字对比和大奖层级。

建议先做 3 个差异明显的高质量主题作为产品线基准，例如：

- 海洋宝藏：蓝绿、珍珠金、潜水光束。
- 埃及神庙：黑金、沙尘、圣甲虫与法老。
- 财神红包：朱红、鎏金、铜钱与烟花。

三套基准稳定后，再批量扩到更多主题，成本会明显下降。
