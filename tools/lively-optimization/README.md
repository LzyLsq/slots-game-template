# F13–F33 主题动态与音频优化

2026-10-09 更新。最新验证见 `verification/REPORT_20261009.md`；`verification/REPORT.md` 保留 2026-09-30 的历史记录，不代表当前版本的验收结果。

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

构建、固定池/音频回归、浏览器冒烟和模拟器媒体测试不等同于真机帧率、峰值内存、主观试听或 StoreKit Sandbox 验收。本轮不作稳定 60 FPS、内存下降或可直接上架的保证。
