# F32 本地验收记录

日期：2026-09-24。引擎：Cocos Creator 3.8.8；目标：Web Mobile。

## 已执行

- `npm run typecheck`、`npm run typecheck:server`、`npm test`：通过；覆盖四种核心模式、柜机、资源清单、布局、语言、特色和迎宾超级奖。
- 每台 100,000 局、默认种子模拟见 `work/f32-rtp-default.json`。四台样本 RTP 约 0.959、0.960、0.962、0.942；均为统计估计，不是理论认证。另一固定种子见 `work/f32-rtp-calibration-1.json`。迎宾保证局不计入自然 RTP 模拟。
- `work/f32-rebuild-9.log` 有 Web Mobile 构建完成标记，产物存在；Cocos 启动器退出码 36，不能称为 CLI 零错误。
- Chrome WebGL 预览：四柜机和登录/大厅/商店/奖励/排行/账户在 320、390 和部分 768 像素宽度截图，见 `docs/screenshots/f32-*.png`。真实触摸事件确认下注 `80→30→80`，SPIN `idle→spinning→presenting→idle`；该局余额 62,796→62,721。此为 Web 触控，不替代 iPhone 真机。最终构建在 390×844 重新打开，通过 `work/f32-smoke-10.log` 验证自动大奖后回到 idle、商店/奖励/大厅/排行/账户导航及奖励直达页；页面加载成功且本次无控制台异常。`work/f32-stage-11.log` 验证超级大奖独立演出出现、可点击揭晓并回到 idle，截图为 `docs/screenshots/f32-super-stage-final-390.png`。`work/f32-sizes.log` 验证 320×568、390×844、768×1024 下 Golden Sleeper 柜机完整加载，无控制台错误，对应 `f32-final-game-*.png`。`work/f32-hall-12.log` 用真实触控依次切换四个大厅入口，进入 High Roller 并打开 RULES，均无控制台异常。
- `npm run release:audit` 当前 21/26 PASS、5 BLOCK；不伪造正式发行验收。

- 美术预载清单已剔除未使用的前代整幅场景、旧标题与符号，共清理 33 组原图与 Cocos meta；art 资源目录约从 99 MB 降为 49 MB。`npm run test:art` 核对实际依赖。

## 仍待验收

- 网页商店只能预览，不得假装成功充值；商品、原生登录/支付、生产服务、真实排行与正式法律文本须由发行方接入。
- 尚无 TestFlight、真实 iPhone/iPad 帧率、低内存、无障碍、离线恢复与退款端到端证据。
- 发行阻断清单见 `docs/f32-release-status.json`。

## 2026-09-24 大厅自然融合复查

大厅现使用同系列原画中的站台 + 财宝调度台合成底图：台身落在站台地面，金币橱窗、黄铜横梁和胡桃木凹槽处于同一张场景图内；旧 2×2 漂浮按钮与空中路线标题已移除。轮盘热区切换四款游戏，左侧木槽动态显示游戏及模式，右侧木槽入场。大厅飘币数量由 12 减至 5，速度和亮度降低。图片来源见 `ART_PROVENANCE.md`。

`npm run typecheck`、`npm test` 通过。Cocos Web Mobile 构建有 Finished 标记但进程退出码仍为 36，非零错误构建不可虚称。390×844、320×568、768×1024 实际 WebGL 截图：`screenshots/f32-hall-natural-{390,320,768}.png`；Jackpot Engine 长标题复查：`screenshots/f32-hall-jackpot-{390,320,768}.png`。Web 真实触控连续切换四路线并点击 High Roller 入场，无控制台错误。当前只是网页视觉与交互验收，不代替 iOS 真机、无障碍或苹果商店审核。

单游戏源码准备工具生成过 Roulette Rail 隔离项目并完成一次 Web 构建与 3 档视口截图 `screenshots/f32-standalone-roulette-*.png`；该构建早于此次合集大厅修订；四款独立工程仍需按最终源工程重新准备和逐一验证。

## 2026-09-24 交互与运动复查

- 大厅车头原有灯位做低亮度慢呼吸；轮盘与入场木槽只在按下时提供局部暖光与下沉反馈，不新增浮空贴图。路线铭牌沿切换方向短距滑入，保留连续点击的最终目标；系统减少动态效果设置下不播放环境和滑移动画。
- 已缓存美术的页面切换不再强制展示加载过场；首次加载仍保留遮罩并在新场景提交画面后渐隐，缩短固定等待，旧画面一直留在下方避免黑帧。此处只改善感知延迟，不宣称真机帧率达标。
- `npm run typecheck`、`npm run typecheck:server`、`npm test` 均通过（含 32 个柜机/视口组合）。390×844 真触控依次切换四路并进入 High Roller，无控制台错误；320×568、390×844、768×1024 大厅截图为 `screenshots/f32-motion-{320,390,768}.png`，长标题复查为 `screenshots/f32-motion-jackpot-{320,390,768}.png`，检查未见文字溢出或页脚遮挡。320 宽下文字仍较小，未以这些网页截图替代真实手机可读性/性能验收。
- 最新构建日志 `../f32-motion-build.log` 有 `build Task (web-mobile) Finished` 标记，产物更新，CLI 退出码仍为 **36**，并有子进程 SIGTERM；不能宣称构建全绿。最终 iOS 真机和原生发行检查仍未完成。

## 2026-09-28 大厅直接入场

- 移除重复的独立模式页及其专属轮盘图片资源。大厅保留四款游戏切换，木槽入场按钮直接打开当前柜机；`?debug=1&screen=mode` 旧调试入口安全回到大厅。
- 大厅模式短名由四款实际 `modeLabel` 派生，避免原始配置被玩法覆盖后产生误导；扩大轮盘方向提示。截图：`screenshots/f32-home-direct-selection-{320,390}.png`。
- `npm run typecheck`、`npm test` 通过。Web Mobile 日志显示 `build Task (web-mobile) Finished`，产物与 5034 预览已更新；CLI 仍退出码 36，日志中有子进程 SIGTERM，不能视为全绿。Chrome WebGL 390×844、320×568 分别实测四路切换并直接入场，旧调试入口回大厅；390 宽额外点柜机 BACK 返回大厅并保留选路，均未捕获 JS 异常。未代替真机验收。

## 2026-09-28 大厅环境动态

- 在同一张站台原画的既有壁灯、车灯、柜台金币及地板反光处加入相位错开的柔和呼吸与短暂亮点；财宝柜玻璃内加入被玻璃边界裁切的慢速反射扫光。切换路线时，轮盘位置有短促局部光反馈。不新增漂浮卡片或额外独立背景。
- 新动态由大厅专属 `ConcourseAtmosphere` 管理，页面销毁后停止更新；系统“减少动态效果”下不创建此效果。截图：`screenshots/f32-concourse-motion-{320,390,768}.png`（静态截图不能体现时间变化）。
- `npm run typecheck` 和 `npm test` 通过。Chrome WebGL 320×568、390×844、768×1024 页面正常显示；运行时确认灯光亮度随时间变化、玻璃扫光和路线反馈存在，320/390 点击切换后仍直接进入对应柜机；减少动态效果下环境层不存在。本次未捕获 JS 异常。Cocos CLI 构建有 Web Mobile Finished 标记、预览产物已更新，但退出码仍为 36，含构建子进程 SIGTERM，不能称为零错误构建。未进行真机帧率验收。

## 2026-09-28 大厅轨道与金币动态增强

- 保留同一张大厅原画，车头灯和吊灯随相位柔和呼吸；两条既有轨道上增加一前一后的移动反射，财宝柜玻璃内扫光改为约 7.6 秒一轮，并让金币表面亮点顺序闪过。轮盘切换给予局部反馈。光点均基于既有 `optics` 美术图集，不新增浮空卡片、柜机或独立背景；反光不越过柜台文字区域。
- `ConcourseAtmosphere` 统一逐帧更新有限的 Sprite，不引入常驻 Tween；大厅离开时随节点释放，系统“减少动态效果”模式不创建该层。
- `npm run typecheck`、`npm test` 通过。Web Mobile 构建日志有 Finished 标记并更新 5034 预览产物，Cocos CLI 退出码仍为 36，不能算完整构建成功。Chrome WebGL 在 320×568、390×844、768×1024 复查；390/320 点击轮盘切换后直接入场，均未捕获 JS 异常。390 宽运行时检查轨道及玻璃透明度随时间变化。减少动态效果时确认大厅环境层未创建。截图：`screenshots/f32-concourse-rails-{320,390,768}.png`。这些网页检查不代替 iPhone/iPad 真机性能验收。

## 2026-09-28 大厅第二轮动态增强

- 由于上轮反射变化仍不明显，在现有站台原画的蒸汽上叠加从同一原画透明提取的低透明度烟雾层，错相缓慢上升；车头灯的能量沿地面向前扩散，财宝柜内部增添两个玻璃裁切的金币光池。附 390×844 约 6 秒实机浏览器录屏帧合成 `screenshots/f32-concourse-motion-live.gif`，静态截图 `screenshots/f32-concourse-strong-motion-{320,390,768}.png`。
- `npm run typecheck`、`npm test` 均通过；Chrome WebGL 320×568、390×844、768×1024 复查，320/390 切换路线及直接进入柜机正常，未捕获 JS 异常；减少动态效果模式下环境层不创建。Cocos Web Mobile 产物已更新，日志有 Finished 标记，但 CLI 仍以 36 退出并含子进程 SIGTERM；真机帧率和发行构建尚未验收。
