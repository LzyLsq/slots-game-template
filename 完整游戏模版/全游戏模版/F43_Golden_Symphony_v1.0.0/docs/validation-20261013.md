# F43 本地模板验收 · 2026-10-13

F43 Golden Symphony / 黄金交响殿堂是 Cocos Creator 3.8.8 工程。大厅、四种传统 slot、永久三幕乐章册及完整本地账户/服务页面已实现；本机预览端口6043。当前验收为源代码与桌面浏览器，`localTemplateComplete: true`，`readyForSubmission: false`。没有执行F43 Git暂存、提交或推送。

## 本轮完成范围

四模式为5×3十五线粘性免费转、5×3固定243 ways音符锁定重转、4×4四邻接集群/三段掉落倍数、3×3五线神秘符号免费转。乐章册按账户永久保存三幕进度，按实际已结算付费轮次推进；奖励防重。登录、注册、游客、协议、初始及四模式加载、商店、签到、示例排行、账户/头像、邮箱、记录、规则、语言和声音均在本轮检查范围。

四个卡通乐师与各自柜冠共用场景、光源和材质。身体保持固定，局部手臂关节及独立眼睑动作，不以整张图片伸缩表现运动。转轴向下连续滚动，逐列落定；独立透明金框标识中奖，无跨格连线。演出在实际柜机中升级、计数、出金币并完整退出。BIG依据实际赢额严格高于下注；新手五轮/十轮福利单独披露、独立计入真实结算。

build8更正示例排行的角色名和返回音乐大厅措辞；build9将条款/隐私/帮助标题和页码移到清楚的纸面区域。最后重新检查五种语言的全部法律/帮助页，实际触摸下一页、上一页、关闭及排行返回按钮。

## 场景配乐与三段大奖演出 · build11

本轮按音乐殿堂主题重新编排大厅与四个乐团：大厅钢琴promenade、Golden弦乐3/4华尔兹、Sapphire竖琴6/8、Ruby温暖低音区铜管swing、Pearl木音/vibes与打击乐。点击、停轮、普通奖与分级大奖采用相应配器；90个WAV重新渲染，柔化2700/3300Hz区域并抑制8200Hz以上能量。部分自制短反馈的乐句思路继承，不将波形重新渲染描述为90首全新创作。未抽取成品游戏录音。当前90个文件与F40的任意WAV均无字节相同项，旧37/53统计保留为立项基线。

揭奖三段高潮位于0.20、1.05、1.90秒。新增12处沿柜框上升的纹理闪光、两处限制在金属条区域的反光、角色后方三波金色焰花及分奖级更长金币流；移除含缩小舞台的旧plume纹理。背景、角色结构、概率和结算未改变；四张4096×3072连续房间纹理与build10的SHA一致，仍为单一不透明背景Sprite。见[本轮摘要](qa/f43-concert-awards-20261013/summary.json)与[源码/构建指纹](qa/f43-concert-awards-20261013/build11-artifact-source.json)。

客户端typecheck与奖级/金币/三高潮/收场合同通过。四模式×BIG/SUPER/MEGA/EPIC×320×568及390×844共32组构图通过；逐张在四张联系图中复看。截图fixture仅延长揭示停留至60秒，不证明自然概率或自动退出时序。三组交互场景另检查提前揭示、输入隔离、resize、连续演出、自然退出及reduced motion，错误0。31项音频生命周期检查涵盖静音、后台暂停/恢复、过期演出、防重复反馈和收场，错误0。

四段实际有声Canvas录制包含待机、真实扣款旋转、本机debug SUPER、三段演出与自然退出。每轮bet80；Golden/Sapphire/Pearl赢2000，余额27000→28920；Ruby包括掉落结算赢2233，余额27000→29153。均只增加一轮、退出恢复idle、背景前中后一致，pageerror为0。已复看四段完整顺序源帧；未补帧。debug指定大奖不代表自然中奖率。

90个PCM文件与6个循环接缝检查完成；四段实际混音均非静音、削波样本0，峰值0.3679–0.3938。信号检查不等于主观试听或手机扬声器验收。原录制的最大源帧间隔为Golden151ms、Sapphire151ms、Ruby170ms、Pearl173ms，分别有2/2/5/3次超过100ms；不推断根因，不将桌面录制描述为真机流畅性证明。

Creator日志报告15秒完成并生成可运行build11，但命令行退出36且包含script-worker SIGTERM；浏览器产物已单独验证，不记录为正常exit0。日志与实际录像均保留于[本轮截图/声音索引](qa/f43-concert-awards-20261013/README.md)。本轮未提交或推送Git。

## 单背景修正 · build10

四台柜机各使用一张4096×3072不透明房间图，将柜体、建筑、地面、反射与阴影合并到同一背景节点；其余转轴、控制和角色正常置于其上。通过本机CC Switch延伸原房间，中央柜机注册区域逐像素保持不变。实际宽屏两侧黑边已消除，没有另铺模糊、暗色或拉伸背景。见[素材来源](continuous-room-art-20261013.json)与[本轮结果](qa/f43-continuous-background-20261013/summary.json)。

本轮48组布局计算与客户端typecheck通过；四模式×320/390/794/1366共16个实际画面检查通过。每个场景只有一个背景Sprite，与柜机共用坐标系且覆盖视口。已查看四模式手机、平板和宽屏实际图；图库更新12张柜机画面，另将Golden SUPER更新为正常时长的实际结算fixture。

四段连续记录覆盖待机、付费旋转、本机debug SUPER、演出及退出。每轮下注80、赢额2000，余额27000→28920，已结算轮次增加1；背景节点、纹理与位置在演出前/中/后保持一致，退出恢复idle且清除弹层，pageerror为0。已查看完整顺序源帧。[运行记录](qa/f43-continuous-background-20261013/motion/motion-audit.json)与[解码时间](qa/f43-continuous-background-20261013/motion/sequential-decoding.json)保留；每段存在一次167–216ms源帧间隔，未补帧、未推断根因，也不以录制证明真机丝滑或性能。debug SUPER不证明自然中奖率。

build10日志报告23秒完成并生成可运行产物，CLI仍退出36、记录script worker SIGTERM；没有声称正常exit0或修改全局Creator配置。保存[完整日志](qa/f43-continuous-background-20261013/build10.log)和[产物/源码指纹](qa/f43-continuous-background-20261013/build10-artifact-source.json)。本轮没有修改数学、法律正文、配乐或角色动画；以下既有完整功能结果保留原构建标签。

## 既有完整功能检查与证据（build9及以前）

下列链接指向保存的结果，不用脚本存在或前作结果代替F43验收。

| 范围 | 实际结果 | 证据 |
|---|---|---|
| 源码功能/数学/账本/规则/语言/布局/演出 | `npm test` 13组脚本全部完成 | [日志](qa/f43-final-20261013/source-tests.log) |
| 客户端与服务端类型 | 通过；最后法律布局改动后客户端再次通过 | [客户端](qa/f43-final-20261013/final-typecheck.log) · [服务端](qa/f43-final-20261013/server-typecheck.log) |
| 最终柜机边界计算 | 40组柜机/视口通过 | [日志](qa/f43-final-20261013/final-test-layout.log) |
| 大厅/四柜机静态手机布局 | 25画面，320×568、390×844、430×932、794×883、1366×768，错误0 | [结果](qa/f43-final-20261013/phone/layout-capture.json) |
| 启动与真实准备/失败重试 | 9项，错误0 | [结果](qa/f43-final-20261013/startup/startup-audit.json) |
| 导航/账户/奖励/四模式结算与恢复 | 15项，错误0 | [结果](qa/f43-final-20261013/runtime/runtime-audit.json) |
| 特殊玩法及普通奖种子 | 6项真实 evaluator fixture，错误0 | [结果](qa/f43-final-20261013/features/feature-audit.json) |
| 五语言正文、规则、长昵称与弹窗 | 1134个渲染状态，溢出/重叠/居中问题0 | [结果](qa/f43-final-20261013/text/text-audit.json) |
| build8辅助页及四种加载 | 16画面，错误0 | [结果](qa/f43-final-20261013/services-build8/capture-audit.json) |
| build8排行文字及返回触摸 | 五语言×两尺寸10画面，问题0 | [结果](qa/f43-final-20261013/rank-build8/text-audit.json) |
| build9法律页/帮助页及大厅/排行复核 | 五语言×320/390共170状态，问题0；完整往返翻页与关闭 | [结果](qa/f43-final-20261013/legal-build9/text-audit.json) |
| 转轴实际GPU遮罩 | 8组，错误0，检查实际视窗外像素 | [结果](qa/f43-final-20261013/reel-mask/reel-aperture-audit.json) |
| 四个角色眨眼/眼部恢复 | 4组GPU检查，错误0 | [结果](qa/f43-final-20261013/eyes/eyes-audit.json) |
| 四模式分级大奖构图 | 32画面：四模式×四层级×两尺寸，错误0 | [结果](qa/f43-final-20261013/awards/award-audit.json) |
| 演出触摸、输入隔离、连续/自动退出 | 3组流程，错误0 | [结果](qa/f43-final-20261013/award-interactions/interaction-audit.json) |
| 五语言与长金额演出排版 | 10组，错误0 | [结果](qa/f43-final-20261013/award-copy/copy-audit.json) |
| 待机→旋转→结算→演出→退出 | 四段实际Canvas连续录制，错误0 | [结果](qa/f43-final-20261013/motion/motion-audit.json) |
| 大厅动作及实际选中触摸 | 四入口操作，错误0 | [结果](qa/f43-final-20261013/hall/hall-motion-audit.json) |
| 声音资源/事件/静音/后台管理 | 31项及四个实际轮次，错误0 | [结果](qa/f43-final-20261013/audio-runtime/runtime-audit.json) |
| 音频PCM信号 | 90文件的时长、非静音、峰值、边界及哈希 | [结果](qa/f43-final-20261013/audio-signal/signal-audit.json) |

这些状态/画面数量不是用户功能总数，也不证明已经达到商业品质或实机帧率。

## build9构建与一次启动超时记录

build9日志报告web-mobile在26秒完成，实际产物可运行，法律页新位置已经渲染确认；Creator命令行退出码为36，日志含脚本worker的SIGTERM。因此没有将命令行描述为正常exit0，也未根据该日志推断根因。未修改全局Creator配置。保存[完整日志](qa/f43-final-20261013/build9.log)与[构建产物/源码指纹](qa/f43-final-20261013/build9-artifact-source.json)。

最终阅读复查第一次完成英文两个上下文，第三个上下文启动等待90秒超时。单独重启同一中文小屏后，首个5秒观察即已到大厅、无请求失败；其余八个上下文使用各自浏览器进程完成136状态，与英文34状态合并为170。一次超时未确定根因，不能把这次中断隐藏为无失败运行。[原始中断日志](qa/f43-final-20261013/legal-build9/initial-attempt.log)、[启动观察](qa/f43-final-20261013/legal-build9/startup-diagnosis.log)、[续跑日志](qa/f43-final-20261013/legal-build9/resumed.log)均保留。此项仍需在真实设备启动稳定性验收中确认。

## 视觉、动画与fixture说明

已复看大厅、四柜机的320/390/430画面、辅助页、四模式加载和分级演出；最终法律页新增390英文及320中文原比例查看，中日韩小屏补充截图保存于[阅读证据](qa/f43-final-20261013/legal-build9/)。标题、正文、页码均居中，不压底部装饰。build6–10的[47张截图索引](screenshots/f43-final-20261013/README.md)及[逐张来源/哈希](screenshots/f43-final-20261013/capture-manifest.json)区分构建版本与fixture。

连续录制覆盖四模式待机、实际扣款旋转/结算、本机debug SUPER、演出和退出；已查看完整顺序帧及角色姿态图，未观察到重复轮廓、整身体拉伸或场景拖动。原始[视频目录](qa/f43-final-20261013/motion/direct-canvas/)与[逐帧时间](qa/f43-final-20261013/motion/sequential-decoding.json)保留，无补帧；四段分别约18.47/18.48/16.40/19.50秒，最大源帧间隔70/78/51/62ms。它们反映浏览器录制节奏，不是原生设备性能测量。

大奖截图只使用隔离的演出fixture，并延长揭示停留至60秒；自动退出另按真实逻辑验证。12,345,678金额是排版压力值，不是可达赔付。debug SUPER仍经过真实扣款与结算，但不代表自然中奖率。普通奖自然种子检查覆盖Golden/Sapphire；Pearl当前最小自然奖即高于下注，因此归BIG；Ruby普通奖种子搜索未完成，未宣称四模式均实测自然普通奖。

## 概率、来源与未验证边界

[自然分布](natural-distribution-final.json)按每模式80,000轮、bet80和固定种子250138633检查，排除新手福利/强制结果。样本回报依次约96.862%、96.114%、97.486%、94.631%；有限模拟不是玩家必然回报。[Pearl精确计算](rhythm-exact-return.json)在bet80为95.9257%，各支持下注的独立取整会使回报略变。数学规则与结算合同已检查，不称未经验证参数为行业标准。

[资源对照](asset-baseline-comparison.json)：129个美术文件中128个与F40不同，唯一相同为Apple平台标志。主题图片通过本机CC Switch重新生成。立项时90个音频文件中37个不同、53个相同短反馈/乐句/别名；该历史统计存于`initialAudioComparison`。当前build11的90个WAV已按场景配器与高频处理重新渲染，全部与F40字节不同。部分短反馈乐句思路继承，未抽取成品游戏配乐。[音频来源](audio-provenance.json)和[采样库许可](../art-source/GeneralUser-GS-LICENSE.txt)单独保存。PCM和事件检查不等于主观试听、手机听感或最终素材权利审查。

自动[发布审查](qa/f43-final-20261013/release-audit.log)21/26通过，五项阻塞按实记录：发布者/公网地址、商品ID、最终法律内容、可执行原生Apple/StoreKit桥接、真机及正式服务验收。API客户端、Apple验证路径和PostgreSQL源码不代表已部署。本地商店/账户明确演示或服务状态，未接通入口不伪造成功。

仍需签名及iOS真机渲染/触摸/内存/持续性能/音乐输出；Apple登录、StoreKit Sandbox/TestFlight与正式API部署；正式隐私/支持地址、法律及素材许可确认；实际App Store审核。见[发布状态](f43-release-status.json)。这些事项没有被标成完成。
