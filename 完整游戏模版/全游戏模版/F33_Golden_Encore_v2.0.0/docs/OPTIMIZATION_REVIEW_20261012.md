# F33 优化复查 · 2026-10-12

## 初轮审查范围

本文件按执行轮次记录；后续改动与验证见追加章节。初轮仅审查；未修改玩法、赔率、音乐素材或界面代码。通过现有 localhost 构建检查大厅、商店、排行榜、账户、音频设置、每日奖励、登录、Jade Ferry 柜机及规则返回。桌面/390×844 检查主要页面，320×568 检查每日奖励与登录。未覆盖五种语言的全部实际渲染、全部四柜机动态、实体手机或扬声器主观试听。

使用新建的后台浏览器标签，保留用户原标签。未触发正常付费 SPIN/AUTO、购买、领取、改名、删除、重置、语言切换或设置开关。大奖使用 debug + win=big 的只读预览：balance 311,228、spins 143 在演出前后相同，场景/柜机/15 个转轴元素标识相同；演出结束后背景音乐由 0.088 恢复 0.22。不同页面读到的存档会随用户原标签游玩而变化，不将这些变化当作审查造成的数据错误，也不回写旧数据。

## 优先建议

### 1. 排行榜数据统一（已确认的信息不一致）

排行榜 podium 与 4–6 名来自固定数组，MY RANK 则根据玩家 totalWon 与固定分数计算。本次截图中示例 JadeMoth 标为 #1，玩家栏同时标为 MY RANK #1；画面虽注明 LOCAL DEMO，仍会让人误解榜单。建议将示例玩家与当前玩家合并后统一排序，再由同一结果绘制前三、后续列表和独立的“我的排名”。同分规则与长名字显示规则也应明确，并新增真正的数据一致性测试，不仅测试坐标。

定位：assets/scripts/ui/GoldenEncoreApp.ts 的 rankPage。
证据：output/playwright/optimization-audit-rank-390-20261012.png。

### 2. 小屏可读性和点击区域（实际渲染观察）

390×844 未见此次检查范围内明显金额越框。320×568 登录提示、七日标签、底部返回按钮明显偏小。当前服务页整体缩放，七日标签字号 28/高度 68 在 320 宽时约为 8.75/21.25 CSS 像素，账户设置按钮高度 82 在 390 宽时约为 31.23 CSS 像素；实际按钮 hit 与画面尺寸相同，尚无独立扩大命中区域。

建议小屏按内容重新排版，而非全部同比缩小；账户次要设置可分组展开，奖励日历可保留清晰选中状态并用更大的入口打开详细日历。扩大命中区域时仍需保证相邻按钮不交叠，也不扩大 SPIN 到柜机背景。

定位：GoldenEncoreApp.ts 的 surface/button/rewardsPage/accountPage，ServiceDetailLayout.ts 的 ACCOUNT_DETAIL。
证据：output/playwright/optimization-audit-rewards-320-20261012.png，optimization-audit-login-320-20261012.png。

### 3. 首次资源准备与包体（已测文件尺寸，不是真机性能结论）

自动化报告：catalog 191 张，startup 88 张；catalog 原始 PNG 170,789,558 bytes，startup 原始 PNG 122,376,735 bytes。du 观察：art 167 MiB、audio 43 MiB、当前 web-mobile 输出 217 MiB。

当前已按房间延迟加载柜机、符号和演出，这是已有改进；但商店/排名/账户/奖励等服务页仍纳入启动准备。建议再分开大厅必需、服务页、任务领奖和房间资源的加载生命周期，并评估发行资源导出/压缩与使用情况，保持点击前预载及现有不闪屏过渡。不能直接把原始 PNG 尺寸当作网络流量、GPU 内存、冷启时长或低端机卡顿证据；后续应在目标手机测冷启、四房往返和后台恢复。

定位：assets/scripts/ui/ArtLoadingPlan.ts 的 startupArt，GoldenEncoreApp.ts 的 boot/allArt。

### 4. 音频设置增加独立音量（体验增强，尚未实施）

当前已经有 MASTER SOUND/BACKGROUND MUSIC/SOUND EFFECTS 三个独立开关，非“没有音效”。预览实际播放状态确认 room BGM、房间 BIG 乐句、coin shower、count complete、collect 已路由，并在演出时 duck BGM、收尾恢复。

建议在保留开关的前提下增加 BGM/EFFECTS 独立音量，拖动音量时提供有限频率的试听并保存个人偏好；避免用户只能全开或全关。素材是否悦耳、不尖锐仍需实际扬声器/耳机试听，本次只验证播放状态与既有 PCM 自动检测，不作主观听感认证。

定位：GoldenEncoreApp.ts 的 audioSettings；SceneMusic、InteractionAudio、GameplayAudio、RewardAudio。
证据：output/playwright/optimization-audit-audio-settings-390-20261012.png。

## 已确认的正常项

- 此次 390×844 实际画面及柜机 HUD 放大观察中，COINS/BET/WIN 未见缺字或超框。
- 商店标题、数量、购买按钮文字在各自生成图片的内容区内；本次未点击购买。
- 大奖叠加在原柜机内，未切换成另一页面；收藏操作恢复原画面与 BGM。
- 规则页面的 BACK TO GAME 返回同一 Jade Ferry 柜机。
- 检查标签捕获的 warn/error 日志为空。
- npm test、npm run typecheck、npm run typecheck:math 均通过。
- 自动化通过不代表已完成所有页面/语言/真机、音频主观或苹果上架验证；此前 Creator native IPC teardown 诊断仍不可当作已解决。

测试日志：/tmp/f33-optimization-audit-test-20261012.log。

## 建议实施顺序

榜单一致性 → 小屏布局/可点击区域 → 首屏准备资源 → 可调混音 → 真机与主观试听复查。演出扩展以用户最新要求为准，并保持文字保护区与固定节点预算；不随机改变奖励概率。


## 获奖视觉演出追加完善（2026-10-12）

上一轮按视觉演出理解进行了以下调整；用户随后澄清重点是获奖音乐，见下方音乐专项。此处保留已经完成的视觉改动记录，不将此前理解视为用户最新要求。

### 已实施

- BIG 使用三个独立的已有生成透明宝物：中央大元宝、两侧房间专属宝石。宝物从柜机转轴下沿沿连续曲线升起，不替换原柜机背景，不整张图鼓动。
- SUPER 第一幕是主题大宝石加冕、两侧元宝和外侧宝石；6.18 秒开始独立第二幕，两枚底部大元宝从中央向左右展开，总共七个宝物，不是七个装饰一开始一起出现。
- 左右金饰增加真实空间展开；金币采用更宽的扇形喷洒，并保留前后景与收尾金币雨。BIG/SUPER 分别有 48/96 个固定复用的独立径向烟花碎光轨迹，不是只缩放一张烟花图片。
- 宝石/元宝切面高光跟随各自宝物位置；所有效果仍位于奖名与不透明金额底板之后，并由原柜机保护区避开角色、HUD 与实体控制台。
- 使用现有高质量生成图片，未新增手绘图标、替换式中奖页面或新角色；普通奖、概率、倍数、钱包及音频素材未修改。新增节点在演出开始时固定创建、逐帧复用，完成与销毁时清理；减少动态模式不添加新宝物/碎光。

### 实际运行检查

- 390×844：Jade Ferry BIG 和 Celestial Vault SUPER 分阶段截图验证，SUPER 在 2.13 秒为五个可见宝物，在 7.47 秒为七个。实际可见金币与烟花碎光分别沿各自路径运动，金额/标题/角色/收奖可见。
- 320×568：Ember Foundry BIG 完整演出，以及 Pearl Garden SUPER 的减少动态模式，检查奖名、金额、原角色和收奖按钮；减少动态模式新宝物/金币/碎光池为零。
- 上述检查均使用 `win=big/super` 安全预览，未进行真实 SPIN/AUTO/充值/领奖，也未写入用户存档。各次预览内 balance=311228、spins=143 未变，原 surface/backdrop/15 个 reel 节点标识未变。BIG 和 SUPER 收奖完整淡出后恢复同一原柜机，不跳页。
- 检查标签 warn/error 为空。用户自己的标签未操作；代理预览标签检查后关闭、临时 viewport 重置。

### 自动化与限制

- `npm test`、`npm run typecheck`、`npm run typecheck:math` 均通过，包含 3/7 宝物、48/96 飞散碎光、五种调度帧率、四模式真实 app/view 绑定、连续轨迹、二幕延迟、保护区、减少动态和 finish/destroy 清理验证。
- 原五个 domain 源文件与 66 个音频 WAV 共 71 项 SHA256 对比全部一致。
- Creator 3.8.8 于 2026-10-12 11:09:19 +08:00 报告 web-mobile Finished，并已从该输出运行验证；命令退出码仍为 36，日志存在 build-script 子进程 SIGTERM 诊断。不能据此声称原生发布验证或干净 release build 已通过。
- 没有做手机真机帧时分布、GPU/GC/电量测试。本次动图由真实浏览器逐帧截图合成，约 11 帧/秒、无声、无补帧，仅展示动作内容，不是手机 60 FPS 性能证据。

证据：
- `output/playwright/spatial-award-big-390-20261012.png`
- `output/playwright/spatial-award-super-390-20261012.png`
- `output/playwright/spatial-award-super-motion-20261012.gif`
- `output/playwright/spatial-award-big-320-20261012.png`
- `output/playwright/spatial-award-reduced-320-20261012.png`

测试日志：`/tmp/f33-visual-spectacle-final-tests-20261012.log`。
构建日志：`/tmp/f33-visual-spectacle-final-build-20261012.log`。
完整临时帧与时间记录保留在 `/tmp/f33-spatial-award-final-20261012/`，没有将临时逐帧文件加入游戏资源包。


## 获奖音乐专项（用户澄清后，2026-10-12）

用户最新要求：“我说的是音乐方面”。本轮仅重做 BIG/SUPER 获奖音乐，不再追加视觉装饰，不修改概率、倍数、下注、钱包、存档、UI 或场景节点。

### 已实施

- 编曲版本 `orchestral-awards-20261012`：只替换四房间各自 BIG/SUPER 共八条乐曲，以及两条大厅/领奖后备乐曲；其余 56 条 WAV 保持原始 PCM，所有音频 UUID 保持不变。
- BIG 有十个采样乐器声部：主题四声部、轻打击乐、温暖圆号、弦乐、竖琴、低音提琴、调性定音鼓。内容是独立开场礼赞、主题旋律问答、I → IV → ii → V → I 和声推进与完整终止式，不是简单提速、提高音量或循环旧短音效。
- SUPER 有十一声部，增加低音区铜管合奏；独立开场之后有 vi 弦乐/木管对比段，6.18 秒进入第二幕铜管回应，7.38 秒形成更丰满的最终落点。四个房间的开场节奏与第二幕旋律分别创作，不是相同乐句移调套用。
- Jade Ferry 保留笛/筝/竖琴的流动感；Pearl Garden 保留竖琴/低音区钟琴的轻盈感；Ember Foundry 保留马林巴/弱音吉他的短句节奏；Celestial Vault 保留圆号/单簧管的庆典感。
- 保持 BIG/SUPER 长度 6.50/8.35 秒、素材峰值 .50/.54、运行时乐曲增益 .53/.56。新增配器离线混入现有的一条 score 音轨，不增加运行时声源或每个粒子的独立音效。高频/削波/动态测试通过，但不据此宣称真实扬声器听感已认证。
- 作曲使用原创音符编排与已有许可的采样乐器；不是下载的第三方歌曲，也不声称真人管弦乐录音或 AI 音乐生成。选择性命令 `python3 tools/compose_sampled_audio.py --rewards-only` 先检查冻结素材哈希，随后仅输出这十条新乐曲。
- BIG/SUPER 使用独立采样器上下文，消除前一条乐曲释放尾音污染；十条新乐曲在选择性生成与全生成上下文中的 PCM 哈希一致。此结论不扩大为其余旧素材全部重新生成的等价保证。

### 实际运行验证

- 从最新 web-mobile 输出运行：Celestial Vault SUPER 与 Jade Ferry BIG 的安全 `win` 预览都确认对应 score 正在播放、非循环、增益分别 .56/.53。演出期间 BGM 自动降至 .088；收奖后 score/coin/counter 停止，背景音乐恢复到 .22。
- 预览内 balance=311228、spins=143、原柜机 surface/backdrop 和 15 个转轴节点均不变；没有真实 SPIN/AUTO、购买或领取写入。
- 固定四个 reward 通道保持不变。检查标签 warn/error 为空。仅使用后台应用内浏览器，不启动外部 Chrome，结束后关闭检查标签并保留用户原标签。

### 验证结果与限制

- `npm test`、`npm run typecheck`、`npm run typecheck:math` 完整执行，退出码 0。新测试检查真实 PCM 乐句、配器角色、调性终止、四房间独立问答与 SUPER 第二幕，并保留已有取消/金币尾音/音量与路由测试。
- 176 项资源/UUID/domain/UI SHA256 范围检查：恰好十个预期奖曲 WAV 改变，其余守护项不变。十条实际导出的 web-mobile WAV 与源文件 SHA256 全部一致。运行时音频总量 44,637,480 bytes，未增加素材条数或包体大小。
- Creator 3.8.8 于 2026-10-12 11:34:15 +08:00 报告 web-mobile Finished，最新导出文件已在 localhost 运行；命令退出码仍为 36，不将此视为干净 release/native 构建通过。
- 已验证文件信号、编曲数据与浏览器播放/混音状态；尚未进行真机扬声器、耳机主观试听或原生发布验证。提供实际新乐曲供用户试听确认审美方向。

日志及临时证据：
- `/tmp/f33-luxury-music-tests-20261012.log`
- `/tmp/f33-luxury-music-build-20261012.log`
- `/tmp/f33-luxury-music-repro-20261012.log`
- `/tmp/f33-orchestral-big-active-20261012.json`
- `/tmp/f33-orchestral-big-collected-20261012.json`
- `/tmp/f33-orchestral-super-active-20261012.json`
- `/tmp/f33-orchestral-super-collected-20261012.json`

编曲与许可证说明见 `docs/AUDIO_DESIGN.md`；素材/音符/测量清单见 `docs/audio-score-manifest.json` 与 `docs/audio-acoustic-regression.json`。临时渲染日志、回滚备份与验证证据置于 `/tmp`，未添加到游戏资源目录。


## 大奖／超级大奖自动收尾（2026-10-12）

用户要求：“大奖动画出现一会后肯定就会自动消失啊”。本轮仅修复演出生命周期，不改音乐素材、视觉素材、奖励概率、下注或钱包。

### 已实施

- 原先只有 AUTO 会安排收尾，手动玩家和减少动态路径会永久停留在 COLLECT。现在所有 BIG/SUPER 共用演出自身的 holdTime，不依赖 AUTO，且在减少动态返回之前安排一次自动收尾。
- BIG：金额计数完成于 5.58 秒，再停留 1.5 秒，7.08 秒开始 0.24 秒淡出；SUPER：7.38 秒完成，8.88 秒开始淡出。正常运动完整收尾约 7.32／9.12 秒，回同一柜机，不跳页。
- 保留点击 COLLECT 提前收起。手动与定时器竞争走同一幂等关闭路径，取消旧计时器、金额计数和视觉节点；不重复结算，自动模式仅安排下一次流程一次。
- 减少动态省去视觉运动，但保留完整奖曲与相同停留期限，不为减少运动截断音乐。BIG／SUPER 音乐于 0.26 秒启动、分别长 6.50／8.35 秒，在自动淡出前结束。
- 切后台会取消演出时间线；回到前台只收起已经结算的 Win 演出，避免取消后留下失效模态。其他领奖弹窗不受影响。

### 实际运行验证

- 最新 web-mobile 输出的 Jade Ferry BIG 与 Celestial Vault SUPER 安全预览均只点击启动一次，未点击 COLLECT，最终自动恢复 PRESS SPIN 和原房间实体按钮。
- 两次预览内 balance=311828、spins=150 不变；surface、backdrop、原角色及 15 个 reel 节点标识不变，结束时 overlayParent=null。未进行真实下注、AUTO、购买或领奖写入。
- 自动收尾后 score／coin／counter／collect 通道停止，房间 BGM 恢复 .22、ducked=false；检查标签 warn/error 为空。只使用后台应用内浏览器，代理检查标签已关闭，用户原标签未操作。

### 自动化与范围

- 生产方法回归覆盖 32 组：两档奖 × 四房间 × 常规／减少动态 × 手动／AUTO；检查完整音乐、最终金额停留、计时器与手动竞态、旧计时器不能关闭新演出、切后台恢复及普通奖原行为。
- npm test、npm run typecheck、npm run typecheck:math 全部退出码 0。137 项音频文件／meta／domain SHA256 守护全部不变。
- Creator 3.8.8 于 2026-10-12 11:45:59 +08:00 报告 web-mobile Finished，并已从该输出运行验证；命令退出码仍为 36，既有构建进程收尾问题未在本轮修复。不是原生或 App Store 发布验证。
- 本轮修改源文件：assets/scripts/ui/GoldenEncoreApp.ts、tools/cabinet-win-test.ts。未新增游戏资源或临时素材。

日志与运行证据置于项目外：
- /tmp/f33-auto-dismiss-tests-20261012.log
- /tmp/f33-auto-dismiss-build-20261012.log
- /tmp/f33-auto-dismiss-evidence-20261012/runtime.json
- /tmp/f33-auto-dismiss-evidence-20261012/big-restored.png
- /tmp/f33-auto-dismiss-evidence-20261012/super-restored.png
