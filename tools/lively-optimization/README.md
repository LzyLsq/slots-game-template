# F13–F33 主题动态与音频优化

## 当前音频版本：2026-10-10 授权配乐与采样反馈

F13–F31、F33 共 20 款现使用已发表的 Kevin MacLeod 配乐（CC BY 4.0）和 Kenney 短乐句/声音素材（CC0），不是定制原创配乐或运行时单音合成。每款有 2 首独立背景曲、5 段奖级短乐句和 16 段动作反馈，共 23 段；20 款大厅与柜机曲共 40 首不同作品。Pizzicato 中奖短句约 0.5–1.3 秒，不是长篇演出配乐。下文 MIDI 编曲、原短音效和旧报告仅记载历史版本，不再描述当前 Web 音频实现。

点击、返回、选择、投注升降、启转、各列停轴、数字计奖、揭幕及领奖分别接入对应事件。计奖间隔至少 170 ms；短反馈最多 12 声部、按组限流，延迟过期的点击丢弃；静音/后台停止，恢复不补播积压声音。长背景曲使用 AAC 流式播放；短大奖 PCM 缓存最多 2 段。每款 `audio/credits.json`、授权文件和账户/设置内音乐署名入口需随包保留。

当前完整验收由 `finalize-curated-audio-verification.mjs` 汇总，输出 `verification/curated-audio-20261010/final-report.json` 和两套交付内的 `音频与反馈验证.json`。检查实际播放、动作触发、生命周期、音频解码/哈希、WebP/IAP 配置及无签名原生构建；这些检查不能代替主观试听、iPhone 真机测试或真实付款。旧 `test-audio.mjs` 和 `finalize-music-verification.mjs` 硬编码历史 7 段音乐，不用于此版本验收。

```sh
node tools/lively-optimization/verify-curated-feedback.mjs 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 33
node tools/lively-optimization/verify-music-browser.mjs 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 33
```

## 历史音乐与动画记录

2026-10-10 后续修复覆盖 F13–F31 和 F33 共 20 款，包括 F20。20 款音乐实际播放、大奖回归及无签名 arm64 Release 编译已通过，完整验收见 `verification/music-20261010/results.json`。下文范围与历史验证小节保留 2026-10-09 的记录，仅供历史对照，以最新报告为准；不代表真机试听、签名安装或真实支付已验证。

本次修复启动声音设置、大厅/柜机切曲、静音恢复及前后台暂停恢复。F25/F28 的 Web 版本新增各自主题的两条 AAC 背景循环，保留原生 AudioSource fallback 和原短音效；不再在 Web 中加载长背景 WAV。窗口手势在捕获阶段解锁播放器，记住加载期间的有效手势但不绕过静音。F26 声音开关立即更新播放器，后台恢复继续原曲。40 个交付 AppDelegate 注入统一生命周期事件；其余原生、内购、签名文件使用 SHA256 保护。

可按编号实际验证音乐播放（依赖本机主题预览服务）：

```sh
node tools/lively-optimization/verify-music-browser.mjs 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 33
```

浏览器检查播放时间、实际解码信号、四柜机及静音/生命周期；不是硬件试听或真机内购证明。

## 范围

- 本轮：F13、14、15、16、17、18、19、21、22、23、24、25、26、27、28、29、30、31、33，共 19 款。
- F20 保留上一轮版本，不重写。F32 在本次本地与远端检索中不存在，未创建替代。
- 18 款 Cocos 的源工程位于 `完整游戏模版/全游戏模版`；F14 使用 `_good` 工程。
- F26 原本就是 HTML/JavaScript 项目，使用独立 DOM/WebAudio 实现，不伪称重新从 Cocos 转换。
- 同步了已有的 7 个 OC 壳：F13、14、15、17、18、19、21，位于 `Xcode_H5/F13-F21_20260914`。
- F26 同步自带 `ios/FortuneTides`。F16 没有对应 OC 壳；本轮没有复制其他游戏的原生壳。
- F26 在其工程目录运行 `node tools/build.mjs --sync-ios` 可同步完整网页资源到原生包；普通构建只生成 dist，不改原生壳或签名。

## 改动

`ThemeFestivity.ts` 是小型装饰层，不接管游戏状态。星光、灯笼、海浪、纸屑等配色、形状、速度及摆幅按 `profiles.mjs` 分主题配置；保留原有美术和演出。

- Cocos 大厅 28 个装饰节点；柜机 `24 + 2 × 列数` 个，固定池更新，不在每帧新增节点。
- 共用一张 256×64 RGBA 小图集。动态生成的 SpriteFrame 设为 `packable=false`，避免上传到动态合图时发生 WebGL 类型错误；没有关闭全局动态合图。
- 按实际转轴开孔布置边缘装饰，不覆盖转轴，也不注册触摸拦截。
- 响应后台暂停、减少动态效果和销毁清理。
- F26 使用大厅 22 / 柜机 16 个固定 DOM 装饰节点，独立清理和暂停。

17 款各有 7 段独立离线编曲 AAC：大厅、柜机、small/big/mega/epic/super。各主题使用不同旋律、配器与节拍，不仅改变播放速度。最新每款约 564–1434 KiB，44.1 kHz 双声道 96 kbps。`warm-v2-low-air-5200Hz` 渲染降低部分旋律音区，并使用高频搁架和低通控制刺耳高频；点击、停轴和中奖合成提示也降低音区。

F25/F28 保留原有编曲和 AudioSource，对原 WAV 进行暖化处理，不改变路径、通道数或时长。`audio-originals` 只存放工具的原始备份，不进入游戏资源或 App；重复执行从原始备份处理，避免反复滤波。

`ThemeMotion.ts` 在同一张图内做局部 UV 形变，为已有吉祥物、主题船只或宝物添加轻微摆动，不抠图、不叠加复制层。区域按原图分别配置，最多四个，底部固定并柔和衰减，尽量避开标题与转轴。每个 Sprite 复用一个材质，后台/减少动态时暂停，加载失败静态降级。已有自定义修复 shader 优先；F25 柜机显式组合原灯光材质，保留金属反射和帷幕效果。F27 保留原有主题宝物动态，F26 使用 DOM 装饰；不能将这两款称为新增动物骨骼动画。

- 16 款 Cocos 共用流式 AudioManager 的生命周期/并发控制；F26 使用独立 HTMLAudio + WebAudio 实现。
- 背景音乐在实际用户手势后启动；领奖时降低背景音乐音量，结束/跳过后恢复。
- 停轴按列反馈，点击与中奖反馈保留上限，避免持续累积音频节点或 PCM。
- OC 本地服务器补充 AAC MIME、Range/HEAD/416 支持和 socket 防 SIGPIPE；原生后台状态传递给 Web 层。
- DEBUG 媒体冒烟参数仅检测音频能否读取和播放，结束后释放，不自动登录或购买。

本次更新没有新增或修改概率、结算、充值、登录、账户或内购业务逻辑。发布从远端既有版本建立独立暂存树，只加入本次白名单文件，不覆盖其他工作区修改或原生签名配置。

## 构建与回归

在仓库根目录运行。需要各工程 npm 依赖、Cocos Creator、macOS/Xcode；WebP 工具需要 sharp。脚本默认 Creator 路径为 `/Applications/CocosCreator.app/Contents/MacOS/CocosCreator`。

```sh
# 仅在需要重新生成音乐或安装优化时运行；先检查当前工作区差异。
node tools/lively-optimization/compose-music.mjs 13
node tools/lively-optimization/install.mjs
node tools/lively-optimization/install-special.mjs
node tools/lively-optimization/install-tides.mjs
node tools/lively-optimization/install-motion.mjs
node tools/lively-optimization/warm-original-audio.mjs

# 构建，可指定编号；不指定则构建本轮全部 18 款 Cocos。
SHARP_MODULE=/absolute/path/to/node_modules/sharp node tools/lively-optimization/build-all.mjs 13 22
node tools/lively-optimization/regression.mjs
node tools/lively-optimization/test-theme.mjs
node tools/lively-optimization/test-motion.mjs
node tools/lively-optimization/test-warmth.mjs
node tools/lively-optimization/test-audio.mjs --bundle
node tools/lively-optimization/verify-native.mjs

# 对独立导出的待发布树验证资源、源码引用与原生构建。
node tools/lively-optimization/verify-export.mjs /absolute/path/to/exported-tree
```

WebP 压缩复用 F20 的发布压缩器：只有转换后更小时才替换，校验尺寸/alpha，同步资源引用，并保留必要 PNG。不能据此声称所有图片都是 WebP；F26 仍含原有 PNG/JPEG/SVG 资源。

预览需 HTTP 服务，不能直接双击 `index.html`：`node tools/lively-optimization/preview-all.mjs` 会输出 20 款（含未改动的 F20）的统一切换入口，各游戏使用独立 origin。大厅/柜机选择从当前源码读取实际 ID，F25/F26/F27 走原有正常入口，年龄确认由用户本人操作。F26 需要先生成 dist。`preview.mjs` 是另一种按源资源映射的预览方式，不应将其当作完整 release 验证。

## 验证边界

2026-10-09 的 CC Switch 分层吉祥物后续实现、实际柜机覆盖和验收边界见 [吉祥物分层报告](verification/MASCOT_REPORT_20261009.md)。角色独立头层优先于旧 UV 形变；固定浮雕仅做星闪，不应把本页旧 UV 方案描述为所有角色的最终效果。

构建、固定池/音频回归、浏览器冒烟和模拟器媒体测试不等同于真机帧率、峰值内存、主观试听或 StoreKit Sandbox 验收。本轮不作稳定 60 FPS、内存下降或可直接上架的保证。
