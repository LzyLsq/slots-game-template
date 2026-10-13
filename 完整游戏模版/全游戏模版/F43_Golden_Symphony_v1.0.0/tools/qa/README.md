# F43 QA

针对 Cocos Creator 3.8.8 的当前构建，预览端口 **6043**。脚本创建隔离浏览器上下文，不操作用户已有标签页或存档。浏览器检查应按顺序运行；同一桌面同时运行多个 GPU 检查会影响时间过程。

```sh
npm ci
npm test
npm run typecheck
npm run typecheck:server
python3 tools/preview_server.py --port 6043
```

客户端类型检查需要 Creator 导入后生成的 `temp/tsconfig.cocos.json`。Playwright 是单独的 QA 依赖，可使用已有的安装设置 `NODE_PATH`；图像解码/信号审查分别需要 Pillow、OpenCV/numpy。浏览器默认使用本机 Google Chrome，部分脚本提供 `BROWSER_EXECUTABLE`。

明确设置 `QA_OUTPUT` 和 `QA_VERSION`；部分脚本仍保留早期目录名称作为默认值。当前build12混音证据在 `docs/qa/f43-feedback-mix-20261013/`；build11演出/编曲证据在 `docs/qa/f43-concert-awards-20261013/`；基础页面检查在 `docs/qa/f43-final-20261013/`，基础截图在 `docs/screenshots/f43-final-20261013/`，来源版本分别标注。以[本轮报告](../../docs/validation-20261013.md)记录的实际结果为准，不把脚本存在当作已通过。

| 脚本 | 检查范围 |
|---|---|
| `startup.cjs` | 初始真实准备、三种手机/动效设置、五种保存语言、加载失败重试 |
| `phone-layout.cjs` | 大厅与四台柜机，320 / 390 / 430 宽度及较宽视口；静态构图 |
| `service-scenes.cjs` | 登录、注册、商店、奖励、排行、账户及四个实际加载画面 |
| `runtime.cjs` | 触摸导航、注册/协议草稿、四模式真实扣款/结算、奖励防重、账户设置、失败恢复 |
| `text-centering.cjs` | 五语言×两尺寸；规则/法律正文翻页、辅助页、弹窗、18字符昵称排布 |
| `reel-aperture.cjs` | GPU 实际遮罩、中奖框/图案边界，统计视窗外像素 |
| `features.cjs` | 来自真实 evaluator 的特殊机制/普通奖种子；不修改正式 RNG |
| `awards.cjs` | 四模式×四大奖层级×两尺寸；仅演出构图 fixture，不证明自然中奖率 |
| `award-interactions.cjs` | 提前揭示、再次收场、输入隔离、调整视口、连续演出、自动退出、reduced motion和无重复入账 |
| `award-copy.cjs` | 五语言及极长金额压力 fixture；极长金额不代表实际可达赔付 |
| `direct-motion.cjs` | 实际 GameCanvas 连续录制；待机、付费旋转、调试 SUPER 结算、演出与退出 |
| `decode-award-recordings.py` | 顺序解码连续录制，保留原始时间间隔；无补帧 |
| `guardian-eyelids-gpu.cjs` | 四角色眼部局部像素与睁眼后原图恢复 |
| `hall-motion.cjs` | 实际大厅录制、四个入口触摸选中、稳定位置与唯一选中状态 |
| `audio-mix.cjs` | 大厅/四模式实际WebAudio音量曲线、完整反馈尾部、连续停轮、重复点击、收场到账及实际混音录音 |
| `audio.cjs` | 四模式声音资源、点击/落定/演出、静音和后台生命周期 |
| `audio-signal.py` | PCM 峰值/能量/高频与循环接缝，不替代主观试听 |
| `recorded-audio.cjs` | 解码实际有声Canvas录像的WebAudio混音，检查信号与削波；不替代主观试听 |
| `audio-readiness.cjs` | 声音准备与失败路径 |
| `toolbar-locales.cjs` | 四台柜机工具按钮的五语言排布 |
| `probability-rules.cjs` | 规则中自然回报/新手福利说明 |
| `probability-settlement.cjs` | 自然付费轮次、前五/十轮福利、待结算恢复与余额守恒 |
| `header-touch.cjs`、`frame-consistency.cjs` | 页头触摸及连续帧诊断，按相关改动选用 |

```sh
QA_OUTPUT=/tmp/f43-runtime QA_VERSION=f43-final-20261013 node tools/qa/runtime.cjs
QA_OUTPUT=/tmp/f43-text QA_VERSION=f43-final-20261013 node tools/qa/text-centering.cjs
QA_OUTPUT=/tmp/f43-awards QA_VERSION=f43-final-20261013 node tools/qa/awards.cjs
QA_AUDIO=1 QA_LONG_AWARD=1 QA_OUTPUT=/tmp/f43-motion QA_VERSION=f43-concert-awards-20261013 node tools/qa/direct-motion.cjs
node tools/qa/recorded-audio.cjs /tmp/f43-motion
QA_OUTPUT=/tmp/f43-mix QA_VERSION=f43-feedback-mix-20261013 node tools/qa/audio-mix.cjs
node tools/qa/recorded-audio.cjs /tmp/f43-mix
python3 tools/qa/decode-award-recordings.py /tmp/f43-motion
```

`phone-layout.cjs` 支持 `QA_SIZES`、`QA_MODES`；构图截图会将角色保持在中立姿态，不能用这些截图证明动画。`text-centering.cjs` 支持 `QA_SCOPE=all|reading|extras`、`QA_SIZES` 和 `QA_LOCALES`。模式加载 fixture 仅延迟本项目的资源请求以便截取加载过程，不在产品中增加假进度。`awards.cjs` 仅将 fixture 的揭示停留延长到60秒以保证截图稳定，自动退出另由交互脚本按实际逻辑检查。

发布审查使用 `npm run release:audit`；当前五项发布条件未完成，非零退出是准确记录，不能删掉检查来制造通过。查看[发布状态](../../docs/f43-release-status.json)。

本地 Cocos 浏览器、源代码合同、静态截图及桌面录制均不能代替原生桥接、真实设备性能、音乐主观试听、正式服务、资源权利和商店审核验收。

`direct-motion.cjs` 的 `QA_AUDIO=1` 将实际WebAudio最终混音镜像到录制流，不替换音源；`QA_LONG_AWARD=1` 等待正常演出自动退出，不延长产品时序。关键帧按实际演出状态取Canvas帧，避免截图耗时导致错过收场。

`audio-mix.cjs`直接调用真实已解码的Cocos声音，记录组件请求与下游WebAudio gain；录音镜像最终混音，不替换或合成音源。Cocos增益命令在WebAudio中有短暂平滑延迟，因此稳定段衰减、实际音效尾部及恢复都单独检查，不要求瞬间值逐采样相等。慢帧条件下等待实际恢复，额外等待有4秒上限。`recorded-audio.cjs`同时支持Canvas录像目录及这些纯音频WebM。
