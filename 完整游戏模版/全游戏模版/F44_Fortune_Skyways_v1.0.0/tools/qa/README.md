# F44 QA 运行说明

此目录包含共用工具与 F44 已运行的检查。旧工具文件的存在不代表其已在 F44 通过；以下列表对应 F44 证据。

先导出当前 Creator 工程，启动 `python3 tools/preview_server.py --port 6044`。脚本在独立浏览器上下文运行，不改用户当前浏览器账户。使用可解析 Playwright 的 Node 环境；本机脚本默认 Chrome 应用路径，可用 `BROWSER_EXECUTABLE` 覆盖 runtime 脚本。

| 工具 | 验证范围 |
|---|---|
| `runtime.cjs` | 实际触摸、快速大厅切换/反向滑动、四模式付费回合、钱包、自动、加载失败、账户实际输入、奖励防重复 |
| `text-centering.cjs` | 两手机比例×五语言、各规则/法律/帮助分页、服务页、长昵称与额外弹窗；实际字形边界检查 |
| `phone-layout.cjs` | 最终大厅和四柜机两种手机比例；角色根节点稳定与当前截图 |
| `service-scenes.cjs` | 登录/注册/商店/奖励/排行/账户与真实进入加载截图 |
| `f44-continuous.cjs` | 四柜机连续运动帧/录制、眨眼及关节幅度、实际付费 EPIC 调试路径、退出结算 |
| `startup.cjs` | 初始资源进度、品牌/已保存语言、首屏、失败重试和减少动态 |
| `audio-readiness.cjs` | 四模式真实资源就绪、缓存、快速重复进入、音频失败/超时和输入恢复 |
| `loading-copy.cjs` | 两手机比例×五语言×四模式的加载规则字形范围；明确使用渲染夹具 |
| `award-copy.cjs` | 五语言奖励图片数字与长金额布局；渲染夹具不改变钱包 |
| `text-centering.cjs`（`QA_SCOPE=registration`） | 最终导出的两手机比例×五语言注册页，协议断行、标题、居中与越界 |
| `audio.cjs` | 实际音乐/反馈载入、奖级与结束提示、静音和生命周期 |

不以源字符串检查证明原生桥或线上服务运行。

示例：

```sh
QA_OUTPUT=docs/qa/f44-final-20261013/operations QA_VERSION=f44-final-20261013 node tools/qa/runtime.cjs
QA_OUTPUT=docs/qa/f44-final-20261013/text-final QA_VERSION=f44-final-20261013 QA_SCOPE=all node tools/qa/text-centering.cjs
QA_OUTPUT=docs/screenshots/f44-final-20261013 QA_SIZES=390x844,320x568 node tools/qa/phone-layout.cjs
QA_OUTPUT=docs/screenshots/f44-final-20261013/services node tools/qa/service-scenes.cjs
npm run typecheck
npm test
node --import tsx tools/probability-audit.ts 100000 427310044 5 docs/qa/f44-final-20261013/rtp-high.json
```

测试夹具明确区分：航程 UI 的资格注入只测可领与防重复，真实结算进度由单元测试与实际旋转检查；强制 EPIC 只测演出，不作为自然概率证据。加载截图仅延迟本工具拥有的图片请求，让真实加载可见。连续视频保存在本地并按 `.gitignore` 排除。

所有结果见 `docs/acceptance.md` 和 `docs/qa/f44-final-20261013/`。浏览器模拟与音频信号检查不代替实机性能、主观听感、正式支付或外部审核。
