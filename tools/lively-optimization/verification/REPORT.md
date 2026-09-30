# 主题动态与音频优化验证记录

验证日期：2026-09-30。本轮新增优化 19 款：F13–F19、F21–F31、F33；F20 保留前一轮版本，F32 本地及远端未找到。F14 使用 `F14_Cloud_Crown_v1.0.0_good`，F25 使用 Cocos 工程，不修改同名 HTML 原型。

## 实际完成的检查

| 检查 | 覆盖与结果 |
| --- | --- |
| Creator 发布构建及 WebP 引用同步 | 18 款 Cocos 全部通过；保留转换后反而变大的图片及必要 PNG，非全 WebP |
| TypeScript / 既有项目测试 | 既有检查全部通过；F22 修复测试夹具，F25 恢复原有 ts-nocheck 首行，F27/F29 修后重新通过 |
| 动态装饰回归 | 18 主题，各 2400 帧；固定池、有限数值、转轴开孔、减少动态、后台暂停与销毁清理通过 |
| 流式音频回归 | 16 款 Cocos 的实际发布 bundle 通过；检查并发、淡入淡出、duck 恢复与释放 |
| 音乐资源 | 17 款每款 7 段 AAC；字节数、SHA-256、峰值/RMS 已检查；F25/F28 保留原有音乐 |
| 本地 Xcode 构建 | 7 个已有 OC 壳及 F26 自带 Swift 壳，共 8 个模拟器构建通过；关闭签名，仅验证编译 |
| OC 本地资源服务器 | 7 壳：AAC MIME、GET/HEAD、closed/open/suffix Range、416、路径限制检查通过 |
| iPhone 11 / iOS 17.5 模拟器媒体 | F13、F26 均成功读取本地 AAC，播放时间推进；F13 约 1.268 秒，F26 约 0.546 秒；测试结束释放播放器 |
| 待发布 Git 树导出检查 | 全部通过：19 工程引用/scene/meta，17 款音乐 manifest，F26 源码/音频/美术/网页入口同步，7 个 OC 壳完整 release 逐字节一致；基于远端原有工程配置的 8 个 Xcode 构建通过 |

F28 单独通过 `tsc -p tsconfig.core.json --noEmit`，不代表全面 runtime 类型检查。F25 保留原有 `ts-nocheck`，不代表该 UI 文件已获得完整类型覆盖。F27 原有 `npm test` 返回通过，但发现的测试数是 **0**，不能将其当作单元测试覆盖。

## 浏览器人工冒烟

使用真实按钮点击；Cocos debug 参数只用于进入测试大厅，未自动购买或修改余额。

- F13：大厅 → 柜机 → 转轴 → 静音 → 返回 → 另一柜机。
- F16：大厅 → Lucky Chest → 转轴 → 返回。
- F26：协议 → 游客 → Coin Corsair → 转轴/中奖 → 静音 → 返回。
- F27：游客 → 大厅 → Royal Mint → 转轴 → 返回。修复 Sprite 尺寸覆盖、Mask 类型及柜机标题适配；余额 25000 → 24900。
- F28：大厅 → Captain → 转轴 → 返回。
- F29：大厅 → Acorn Vault → 转轴 → 返回。修复三个背景资源未预加载导致大厅无法显示；余额 27000 → 26920，正常无奖结算。修复后未新增 console error。
- F30：大厅 → Pendulum Vault → 转轴/中奖 → 返回；下注 80、中奖 142，余额 27000 → 27062。
- F14、15、17、18、19、21、22、23、24、31、33：大厅加载及显示已检查，实际截图位于本目录。不宣称这些项目已逐个完整走完柜机流程。
- F25：登录 → 游客 → 年龄确认可达；未确认年龄，未绕过年龄门槛，不宣称完整游客/柜机流程通过。

截图为发布版本的实际画面；静态截图不能证明动态节奏、音质或帧率。

## 本轮修复及边界

- 共用动态 ImageAsset 的 SpriteFrame 设置 `packable=false`，修复 97% 加载处动态合图 WebGL 类型错误；未关闭全局动态合图。
- F22 只调整 collector-grid 对应的规则测试夹具，未改结算规则。
- F27 保留原标题 PNG，柜机使用已有材质面板和自适应 Label，避免白底及文字裁断。
- F29 补充 hall/login/cabinet 三个主题背景 preload，保留原美术。
- 导出检查发现 F26 原生 Web 资源陈旧：翻译缺少加载/账户/排行条目，网页入口未包含两个已有样式。核对后同步现有源文件；增加显式 `--sync-ios` 构建选项，避免未来源网页与原生资源再次脱节。不修改 native bridge 或签名。
- 本轮没有新改概率、结算、登录、充值或内购业务。部分较早工作区改动为当前 UI 依赖，一并发布；其中已有公开的新手奖励机制。
- 7 壳完整同步本次 release 必需文件；未删除远端额外的旧 loader 图片，不误删无关资源。
- F16 没有对应 OC 壳，本轮未新建。F26 原本 HTML/JavaScript，使用独立 DOM/WebAudio 实现。
- 未测试真机 FPS / 峰值内存、长时间压测、主观试听、Apple 登录、StoreKit Sandbox 或 App Store 审核。不得据此声称稳定 60 FPS、内存下降或可直接上架。

## 日志与复现

本次机器的临时日志分组：`lively-build.jdlKPi`（17 款）、`lively-build.fkxN4k`（F13）、`lively-build.aAZbNT`（F25）、`lively-build.mzYcCo`（F27）、`lively-build.S6joDj`（F29）；回归初次日志 `lively-regression.cRAY0P`，修后分别为 `lHSOEF`（F22）、`eSO8xR`（F25）、`z6z2wq`（F27）、`5hdGmM`（F29）；原生构建日志 `lively-native.LYtuR1`，F26 媒体调整后重编译为 `lively-native.EFOh9K`。临时日志不随 Git 提交。

最终导出验证日志为 `lively-export-verify.foxSV0/results.json`，验证树 `0d843315ea9934df193b2b557b2c65feb76ae1f5`。验证结束后仅更新本报告的结果记录；提交前校验最终树与验证树只有本报告差异。源码、运行资源、原生代码及工程配置不变。

复现命令见上级 `README.md`；各脚本会输出新的日志目录。发布仅使用目标项目、已有原生壳必需运行资源和本工具目录的白名单，不包含签名配置、个人 Xcode 状态、缓存或无关项目。
