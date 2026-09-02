# CELESTIAL SPIN WORLD — 本轮测试报告

> 2026-08-31 上线基线更新：客户端、数学、服务器三套 TypeScript 严格检查通过；4,000 局功能回归和 400,000 局 RTP 仿真通过；明文凭据、跨账号奖励、伪造转盘金额、Spin 恢复、Golden Wild 重复赔付与公网 force 参数均已加入回归。详细结果见 `MATH_REPORT.md` 和 `SECURITY.md`。

验证日期：2026-08-31  
目标：统一所有图片边框的“内窗 = 内容背景”几何规则，重排密集页面避免外侧装饰互相覆盖，并补齐正式账号 / 游客权限逻辑。

## 自动化结果

- TypeScript：`npx tsc -p tsconfig.json --noEmit` — PASS。
- 数学与权限回归：`npm test` — PASS，四款游戏各 1,000 次，共 4,000 次；游客 Store top-up 被拒绝且余额不变，正式账号 top-up 正常。
- Cocos Creator 3.8.8 Web Mobile：构建日志出现 `build Task (web-mobile) Finished`。
- Creator CLI 最终退出码为 36；日志显示构建完成后工作子进程被 SIGTERM 清理，构建产物完整生成。
- 最终浏览器抽检：319×757 与 390×844 登录、首页、Store、Profile、Achievements、Cosmic Coins 游戏页均完成实机渲染和交互验证。
- 最新 Web Mobile 正式构建：2026-08-31 15:47；日志出现 `build Task (web-mobile) Finished`。浏览器验收发现并修复 CSP 与 Cocos SystemJS 不兼容问题，最终构建正常进入游戏。

## 动效验证

| 项目 | 验证方式 | 结果 |
|---|---|---|
| Web 首帧 Loading | 80ms、300ms、1100ms 连续截图 | 双轨道星核、彗星和流动进度位置均发生变化 |
| 游戏独立 Loading | 44%、74%、100% 三帧截图 | 轨道位置、进度条和阶段文案连续变化 |
| 生成背景 | 运行中截图与节点 Tween | 等比 Cover，低频位移、缩放和透明度呼吸 |
| 页面动态光泽 | 首页卡片、商品卡、主按钮、转轴框截图 | 有裁切扫光，按错峰低频循环 |
| 特殊符号 | Wild/Scatter/Bonus 两帧截图 | 能量环旋转、透明度呼吸；节点固定复用 |
| 转轴 | 实际游戏运行 | 三行完整可见，循环节点复用，逐列减速并回弹对齐 |
| 中奖反馈 | `force=win` 实际运行 | WIN 5,650，Credits 100,000→105,150，仅结算一次 |
| 大中奖反馈 | `force=big` 实际运行 | MEGA WIN 图片化浮层、旋转能量环、金币碎片、屏闪、冲击波和 Credits 飞行正常 |
| 按钮触感 | SPIN/主按钮/次按钮实际点击 | 3D 图标、循环扫光、按压缩放、文字弹性和池化爆点正常，0 运行时错误 |
| 全按钮图片装饰 | 返回、充值、加减、链接、导航、关闭、Turbo、Auto、SPIN | 全部加载主题图片边框；充值键叠加 Energy Coin；按钮文字及点击区域正常 |
| 装饰强度 | 390×844 首页与游戏页实机对比 | 普通按钮改为低亮静态边框，未选导航降至弱装饰，主按钮仅慢速轻呼吸，不再高频闪动 |
| 人物主视觉 | Banner、四游戏卡、Loading、游戏外景、头像 | 四人物按世界对应，人物漂浮幅度克制，无文字遮挡和硬底矩形 |
| 大厅动态图 | 390×844 与 540×960 两档运行 | Banner 四世界交叉淡入，卡片 3D 主符号漂浮/呼吸/旋转，导航图标持续动态 |
| 四套透明图集 | 四游戏独立直达运行 | Astral/Golden/Neon/Cosmic 均加载 `symbol_atlas_cutout_v02`，无硬矩形底色 |
| 返回主页 | Home→Loading→Game→Back→Home | 通过；Loading 使用 replace，游戏返回使用 reset，不再循环进入游戏 |
| 登录守卫 | 未登录访问 `/` 与 `?screen=home` | 均落到 ACCOUNT SIGN IN；可选择登录、注册或游客试玩，未建立任何身份前不能进入大厅 |
| 游客权限 | Guest→Home→Store→SIGN IN 与服务层回归 | 游客可进大厅和游戏；Store 明示 `TOP-UPS LOCKED`，点击商品回到登录入口；服务层拒绝充值且 Credits 不变；每日免费奖励保留 |
| 调试直达隔离 | `?screen=home&debug=1` | 仅显式调试参数可直达；性能面板另由 `stats=1` 控制，不影响正式入口 |
| Credits 一致性 | 大厅、商店、签到、游戏 HUD、奖励飞行 | 统一使用 Cosmic Energy Coin；游戏页顶部重复余额已移除，邮件明确显示 `MAIL 3` |
| 方框图片材质 | 顶栏、Banner、游戏卡、输入框、弹窗、列表卡、转轴、符号格 | 四套主题九宫格图片边框均正常缩放；装饰角不变形，中心内容可读 |
| 按钮/面板边框贴合 | 319×757、390×844 登录、首页、Store、Profile、Achievements、Cosmic Coins 游戏页 | 四套素材分别记录真实内窗比例；面板背景与按钮底面作为内窗尺寸，装饰框按内边界向外生长，不再覆盖内容；外扩量同时受横向屏幕安全宽度和纵向列表间距约束。首页四卡、Store 商品行、Profile 统计框、签到卡均重新拉开；输入文字限制在装饰框净空区并垂直居中；圆形 SPIN 保持专属装饰，投注减号移出 SPIN 重叠区 |
| 全页面边框审计 | 首页、Store、Rewards、Rank、Profile、签到、转盘、成就、邮件、设置、登录、注册、找回密码、Paytable、大中奖浮层 | 逐屏实机检查图片框外沿、内容层级、按钮安全边距与选中态一致性；未发现残留双框、内容溢出外框或按钮压住面板角饰；浏览器 0 Error / 0 Warning |
| 语义图片 | 签到/转盘/排行/商店/成就/按钮 | 分别使用 Energy Coin/Orrery/Crown/Coin/Seal/Key 等匹配功能的 3D 物件 |
| 横屏 | 960×540 | 全屏旋转提示正确覆盖游戏交互 |

## 交付截图

- `完整游戏模版/游戏截图/CELESTIAL_SPIN_WORLD.png`：390×844 Release 构建首页。

## 已知环境说明

本机 Creator 用户级窗口布局 JSON 曾输出截断警告，但不属于项目文件；资源导入、脚本打包和 Web Mobile 构建均完成。项目没有修改参考工程或其资源。
