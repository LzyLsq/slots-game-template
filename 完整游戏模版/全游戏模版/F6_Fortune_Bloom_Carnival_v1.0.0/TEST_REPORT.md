# FORTUNE BLOOM CARNIVAL F6 — 测试报告

验证日期：2026-09-08
目标：验证四种独立玩法、豪华实体柜机、稳定控制链路、奖励演出、移动适配与 Web Mobile 构建完整性。

## 自动化结果

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 客户端 TypeScript | `npm run typecheck` | PASS |
| 数学层 TypeScript | `npm run typecheck:math` | PASS |
| 服务端 TypeScript | `npm run typecheck:server` | PASS |
| 数学与功能回归 | `npm test` | PASS，四款各 1,000 局，共 4,000 局；Apple identity 验证通过 |
| RTP 仿真 | `npm run test:rtp` | PASS，四款各 100,000 局；实测 RTP 为 95.9867% / 96.0967% / 95.8097% / 95.9582% |
| Web Mobile 构建 | Cocos Creator 3.8.8 release config | PASS，日志包含 `build Task (web-mobile) Finished` |
| 发布自动审计 | `npm run release:audit` | 16/19 PASS；3 项仅待发行方真实资料，审计按设计阻断占位配置 |

Cocos Creator CLI 在成功输出 Web Mobile 包后仍返回已知退出码 36；构建日志确认项目脚本、资源、模板和产物均已完成。

## 浏览器交互回归

| 项目 | 结果 |
| --- | --- |
| 四款柜机真实渲染 | PASS；按四张 1024×1536 柜机源图逐像素重测开孔。Golden 744×418、Blossom 616×424、Lan 748×406、Wheel 472×374 的实时转轴分别落入对应镜片，金额和图片按键落入实体槽位 |
| SPIN 与连续点按 | PASS；点击立即启动；转动中再次点击可 Quick Stop；演出期点击可结束计数并排队下一局 |
| AUTO | PASS；点击后 AUTO 实体键绿灯立即点亮；再次点击停止并恢复暗灯 |
| TURBO | PASS；点击后状态灯点亮，下一局使用加速节奏；再次点击可关闭 |
| 强制大奖 | PASS；Epic Win 使用分层舞台、动态金币与缓动金额，不出现纯色贴图或黑色阴影残留；Treasure Wheel 的强制奖励已验证真实八分区转盘、指针回弹、预定落点和独立收款台 |
| Loading → Game | PASS；四套加载状态文案与对应主题资源一致，100% 后柔和溶解进入柜机 |
| 大厅与五个账户页面 | PASS；Home、Store、Rewards、Rank、Profile、Login 均完成图片场景、文字对比和底部导航检查 |
| 响应式 | PASS；320×568、390×844、430×932 与 1280×720 下柜机保持比例；柜机和功能前景共用唯一缩放平面，转轴随视口缩放且不再与背景错位，超长/超宽余量由独立场景层延展 |
| 控制台 Error / Warning | PASS；本轮交互与页面巡检为 0 Error / 0 Warning |

## 演出检查

- 转轴：逐列启停、帧时间驱动巡航、Hermite 减速、机械回弹、Quick Stop、镜片扫光和符号弹性均启用。
- 待机：标题光晕、机身跑灯、SPIN 呼吸环、背景微粒、玻璃反光和主题装饰持续运动。
- 普通中奖：获奖符号弹出、灯光聚焦、金币飞向余额槽、金额缓动计数并与声音/触感时间线同步。
- 大奖：Big、Mega、Epic 分级；分层图片舞台、光束、粒子、金币雨、金额计数和收尾动作按层编排。
- 性能：转轴节点复用；动画由 Tween 与 `dt` 驱动；转轴热路径无定时器和每帧资源加载。

## 发布前仍需补齐

模板已经具备 StoreKit 2、Sign in with Apple 和服务端权威钱包的接入边界，但正式上架前仍必须由发行方填写法定主体、支持邮箱、公开 HTTPS 协议地址、Bundle ID 与 App Store Connect Consumable 商品 ID，并在 Xcode 真机、Apple Sandbox 和 TestFlight 中完成购买、恢复、退款、撤销、Ask to Buy、网络中断、账号删除和安全区验证。`npm run release:audit` 会在这些发行方资料未配置时阻断正式发布。
