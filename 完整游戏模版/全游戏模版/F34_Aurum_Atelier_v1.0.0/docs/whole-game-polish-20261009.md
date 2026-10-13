# F34 全界面打磨与交互复核 · v6 · 2026-10-09

预览版本：`f34-whole-game-polish-v6-20261009`。Cocos Creator 3.8.8 工程，继续保留招财工坊主题、四种传统 slot 规则、coherent-v4 吉祥物原画、grounded-v5 肢体动作、现有奖级和已调柔的喜庆音乐。本轮落实“每一处再优化”，覆盖主页面、柜机、加载及必要弹窗，不另行换美术方向。

## 本轮修改

- **图标与材质**：校正 16 个界面图标的实际裁切及用途映射，按各自图像边界展示。服务页和弹窗沿用工坊的象牙珐琅、金属边饰与原画台面，减少额外图标遮住按钮自带徽饰的问题。
- **登录、注册与服务文字**：调整文字基线、对比度及所属区域。登录协议区域使用保持比例的象牙金边图片；协议触区高 104 个设计单位，文字 50，免责声明 40，使用清楚的深色字和细浅色边。规则页标题、页签同样改为深色墨迹，避免与浅色材料混在一起。补齐免责声明、Sync、记录条数、资源准备提示的语言映射。
- **四台柜机**：余额、BET、WIN/TOP 分别落在原画仪表窗口，数字基线固定，装饰动画与数字分开。BACK、RULES、SOUND 使用对应图片徽章、清晰标签与较大的触区；AUTO 与 SPIN 分层，投注加减、主按钮和待机状态逐台检查。保留角色在柜机底座上的接触影及独立爪/翼动作。
- **四模式加载**：分别调整标题、工坊装置、规则牌、进度轨道及状态文字位置；局部反光和入场按对应设备组织，避免整张场景摇晃。进度由实际资源准备回调更新。资源失败提供重试和返回，结束时清理加载层、回调及输入锁。
- **大奖进出场**：用矩形遮罩从上向下揭开不透明宝库，0.85 秒入场；房间与金额保持固定位置，消除两套建筑及文字同时交叠的全场景溶解。退出在 0.42 秒内反向关闭当前揭幕进度；入场未完就退出时取消入场 tween。低动态设置直接显示完整房间，仍保留奖级及金额。
- **交互恢复**：复核服务导航、连续双向切换、邮箱与签到只到账一次、账户输入及保存、反复开关弹窗、模式失败与重试。自动旋转停止、打开规则或切到后台后，当前轮安全结束，后续轮不会继续扣款。

主要实现位于 [AureliaApp.ts](../assets/scripts/ui/AureliaApp.ts)、[SalonArt.ts](../assets/scripts/ui/SalonArt.ts)、[SalonWinStage.ts](../assets/scripts/vfx/SalonWinStage.ts) 及 [UiLocaleAdditions.ts](../assets/scripts/ui/UiLocaleAdditions.ts)。保持原有真实结算与奖级边界，不由演出重复发奖。

## 完成的验证

| 检查 | 范围与结果 | 证据 |
|---|---|---|
| 工程检查 | 完整 `npm test`、最终 `npm run typecheck`、最终语言检查通过 | 项目测试脚本；本轮构建与测试日志摘要见下 |
| 最终构建 | `web-mobile` 日志明确显示 Finished，6035 提供最终构建 | Cocos Creator 3.8.8 |
| 渲染状态 | 112 个状态；390×844、320×568，主要页面、四柜机、加载、弹窗及五种语言；无页面错误、整页滚动或标签越出视口 | [视觉报告](screenshots/f34-whole-game-polish-v6-20261009/visual-runtime-qa.json) |
| 弹窗补查 | 最终构建下 390×844 的 20 个状态，四模式规则/特色、账户、法律页、游客与协议确认 | [弹窗报告](screenshots/f34-whole-game-polish-v6-20261009/dialog-refresh-qa.json) |
| 服务及账户 | 18 组真实触摸/输入检查：导航、滑动、奖励、邮箱、头像、昵称、本地注册登录退出、失败重试等通过 | [操作报告](screenshots/f34-whole-game-polish-v6-20261009/operations/runtime-qa.json) |
| 旋转与声音 | 七组：四模式 BIG；小屏 Coin SUPER、Sapphire MEGA、Crown EPIC。检查扣款、结算、演出揭幕、自动结束/提前退出、静音、后台恢复及清理；各例无页面错误 | [玩法与声音报告](screenshots/f34-whole-game-polish-v6-20261009/gameplay/runtime-qa.json) |
| 自动旋转 | 四模式各五项：当前轮停止、仅续开一次、规则取消、后台恢复、返回大厅；核对扣款、结算次数及无挂起保留款 | [AUTO 报告](screenshots/f34-whole-game-polish-v6-20261009/auto/runtime-qa.json) |

最终截图另行目视复查，包括小屏主要页面、四柜机、规则与账户弹窗、代表性长文字和多语言。连续录制检查了 Pearl 的转轴、普通中奖/未中奖跟进、大奖揭幕与计数、退出及柜机恢复。静态边界数据只用于定位问题，不作为视觉质量或丝滑程度的证明。

本轮测试日志位于执行环境 `/tmp/f34-v6-tests.log`、`/tmp/f34-v6-typecheck.log`、`/tmp/f34-v6-locale-tests.log`、`/tmp/f34-whole-game-v6-final-build.log`、`/tmp/f34-v6-gameplay.log`、`/tmp/f34-v6-auto.log`。构建任务完成后，编辑器 CLI 仍以既有退出码 36 结束；没有修改全局编辑器配置。构建结论依据任务完成日志及最终运行检查。后续仅编辑文档、报告范围描述、录制文件清理和源码注释，没有更改已验证的游戏行为。

## 证据与复现边界

[当前截图和录制入口](screenshots/f34-whole-game-polish-v6-20261009/README.md) 按最终画面、加载、弹窗、语言、玩法及 AUTO 分类。约 36 秒的 [Pearl 视频](screenshots/f34-whole-game-polish-v6-20261009/gameplay/motion/pearl-live-video.webm) 与 [实际游戏音频](screenshots/f34-whole-game-polish-v6-20261009/gameplay/motion/pearl-live-audio.webm) 分开保存，不能称为已经合成的同步音画文件。

全部运行检查在一次性浏览器 context 中执行，没有使用用户正在玩的存档。七组中奖测试使用隔离的确定性结果；AUTO 使用真实生成器中选出的连续无奖/无特色种子，并仅在测试存档中关闭新手福利。生产随机逻辑未因此改变，测试不证明自然中奖频率。加载截图使用 66% 固定值检查构图，实际失败、重试和返回由独立操作检查覆盖；截图本身不证明真实进度。

复现脚本：

- [whole-game-visual-qa.cjs](../tools/whole-game-visual-qa.cjs)，`F34_QA_DIALOG_ONLY=1` 可只补查 390×844 弹窗。
- [whole-game-polish-runtime-qa.cjs](../tools/whole-game-polish-runtime-qa.cjs)：服务、账户及加载操作。
- [cabinet-audio-runtime.cjs](../tools/cabinet-audio-runtime.cjs)：四柜机旋转、声音及分级演出。复现时设置 `F34_QA_OUTPUT=docs/screenshots/f34-whole-game-polish-v6-20261009/gameplay`。
- [whole-game-auto-qa.cjs](../tools/whole-game-auto-qa.cjs)：四模式自动旋转。

使用既有 Playwright、Chrome 及 `F34_QA_URL` 指定本机预览，不操作用户浏览器标签。脚本支持 `PLAYWRIGHT_PACKAGE`、`BROWSER_EXECUTABLE` 指定已有运行环境。

320×568 中部分次级说明实际仅约 8–11 CSS 像素；本轮确认其位置和对比度，不能据此宣称所有文字都达到大字号触读标准。五语言边界检查也不等于每一条译文经过人工母语审校。

Apple 登录与正式购买仍显示未接通，不伪装成功。本轮通过的是本地 Cocos 预览检查；手机实机、原生桥接、StoreKit、签名、正式服务及 App Store 审核尚未验证。本轮未提交或推送 Git。
