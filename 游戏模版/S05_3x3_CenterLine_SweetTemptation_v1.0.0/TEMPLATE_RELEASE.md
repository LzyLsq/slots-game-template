# S05 Sweet Temptation Gold Master · v1.0.0

这是 `S05 · Sweet Temptation 3×3 单线 Slot` 的正式商业模板基线，固化于 2026-08-31。

## 已锁定能力

- 3×3 转轴与中心单线中奖
- 9% 正式中奖率与 14% Near Miss
- 自动旋转、声音开关、动态奖励规则表
- 普通中奖、Big Win、Jackpot 分级反馈
- 无黑色方框的程序化光环、烟花、冲击波、粒子与金币雨
- 内嵌式次级控制栏与独立醒目的 SPIN 主按钮
- 左到右加载进度与完整主题加载画面
- JSON 驱动的 Symbol、倍率、权重、概率、文案与视觉配置
- `theme:new` 主题生成器和 `theme:validate` 交付校验器

## 复制模板时不需要携带

- `library/`
- `temp/`
- `build/`
- `profiles/`
- `output/`
- `.playwright-cli/`

这些目录都是 Cocos 或测试工具生成的缓存、构建产物与截图。第一次用 Cocos Creator 3.8.8 打开模板副本时会自动重新生成必要缓存。

## 基线验收

- 主题配置：2 个，通过校验，0 个警告
- Web Mobile：构建完成
- 浏览器控制台：0 个错误，0 个警告
- RULES：11 个 Symbol 完整显示
- AUTO / STOP：可启动与停止
- 中奖反馈：已捕获真实中奖画面，无黑色方框
