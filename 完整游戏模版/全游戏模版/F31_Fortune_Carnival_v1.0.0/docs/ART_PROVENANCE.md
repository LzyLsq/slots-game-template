# F31 美术来源与处理记录

## 生成方式

本轮财富主题美术通过用户本机 **CC Switch 当前 provider** 调用图像生成流程完成。项目不保存、不打印任何 API Key。最终使用的请求参数和完整提示词保存在：

- `docs/art-prompts/f31-wealth-refresh-part1.jsonl`
- `docs/art-prompts/f31-wealth-refresh-part2.jsonl`

JSONL 中记录了每个输出文件、尺寸、质量和请求模型字段，便于追溯与重新生成。原始接口响应和临时中间图不放入发行项目。

## 财富主题刷新范围

最终版以皇家铸币城、金币机械、金库建筑、金币喷泉、浮雕金属和庆典金雨为核心，主动排除动物吉祥物、Q 版人物、玩具感和低幼卡通装饰。

已生成并集成的主要位图类别：

- 登录背景：`salon.png`
- 大厅背景：`carnival-hall-soft.png`
- 商店、奖励、排行和账户共用服务大厅：`carnival-services.png`
- 四目的地 2×2 图集：`carnival-destinations.png`
- 16 枚财富纹章头像：`portraits.png`
- 四款独立大奖图：`prize-coin-carousel.png`、`prize-lantern-vault.png`、`prize-lucky-parade.png`、`prize-celestial-mint.png`
- 四套 4×4 主题符号图集：`symbols-coin-carousel.png`、`symbols-lantern-vault.png`、`symbols-lucky-parade.png`、`symbols-celestial-mint.png`
- 通用符号图集及运行时模糊衍生图：`symbols.png`、`symbols-blur.png`、`symbols-*-blur.png`
- Web 启动页背景：`build-templates/web-mobile/carnival-arrival.jpg`、`carnival-destinations.jpg`

现有四台一体化柜机图保持各自独立建筑、柜体和环境构图，并与新版金币符号、大奖图、界面纹章和大厅目的地图共同组成最终视觉。

## 图集与运行时处理

- 符号和头像按严格等分网格切片，单格内容保持安全留白，不跨越相邻图块。
- 每套符号图生成对应模糊图，用于高速转轴阶段，停轴后切回清晰图，避免运行时重复滤镜造成抖动。
- 柜机背景、柜体屏幕和转轴窗口使用共享布局变换；窗口尺寸由最终渲染适配，不依赖单一设备绝对坐标。
- 标题、按钮、发光层、粒子和获奖遮罩由 Cocos 节点动态叠加，位图本身不预烘焙可交互文字。
- 文本保持运行时渲染，便于五语言切换、自动缩放和高对比度控制。

## 复用边界

Apple 标志和少量通用光学纹理来自项目已有合法资源；数学、账户、服务端契约和支付边界沿用成熟代码结构。F31 的页面编排、财富主题美术、四游戏命名、符号图集、大奖图、存档命名空间与最终 Web 启动视觉均为本项目独立配置。
