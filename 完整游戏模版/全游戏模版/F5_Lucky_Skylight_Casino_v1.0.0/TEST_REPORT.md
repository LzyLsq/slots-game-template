# LUCKY SKYLIGHT CASINO F5 — 测试报告

验证日期：2026-09-07
目标：验证四种独立玩法、商业级柜机演出、按钮稳定性、奖励舞台与 Web Mobile 构建完整性。

## 自动化结果

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 客户端 TypeScript | `npm run typecheck` | PASS |
| 数学层 TypeScript | `npm run typecheck:math` | PASS |
| 服务端 TypeScript | `npm run typecheck:server` | PASS |
| 数学与功能回归 | `npm test` | PASS，四款各 1,000 局，共 4,000 局 |
| RTP 仿真 | `npm run test:rtp` | PASS，四款各 100,000 局；实测 RTP 为 95.972% / 95.982% / 95.982% / 96.081% |
| Web Mobile 构建 | Cocos Creator 3.8.8 release config | PASS，日志包含 `build Task (web-mobile) Finished` |
| 发布自动审计 | `npm run release:audit` | 15/18 PASS；3 项发行方资料仍需发布者填写 |

Cocos Creator CLI 在构建完成后仍返回 36；日志表明项目脚本、资源、模板和 Web Mobile 输出均已成功完成，退出码来自构建后子进程清理。

## 浏览器交互回归

| 项目 | 结果 |
| --- | --- |
| 四款游戏直达 Loading → Game | PASS；加载进度、阶段文案和 100% 收尾均可见 |
| Seven / Clover / Dice / Sky 四台 SPIN | PASS；每台点按后按钮立即显示 STOP，转轴进入运动状态 |
| AUTO | PASS；点按立即启动，右上状态灯变绿；再次点按停止后恢复暗灯 |
| TURBO | PASS；点按立即切换绿灯，下一局使用加速节奏 |
| 快速停止与中奖衔接 | PASS；SPIN 在转动中可 quick-stop，中奖舞台结束后恢复可用 |
| Rules 打开和关闭 | PASS；内容完整，关闭后遮罩和阴影完全移除 |
| 大厅到四款游戏 | PASS；入口各自进入对应 Loading 和柜机，不发生路由串台 |
| 控制台 Error / Warning | PASS；本轮检查为 0 Error / 0 Warning |

## 演出检查

- 转轴：逐列启动与停止、镜片扫光、符号弹性、停靠回弹和特殊符号呼吸均启用。
- 待机：大厅财富运行光点、柜机边缘跑灯、标题光晕、SPIN 双环、环境粒子和镜面反光持续运行。
- 普通中奖：局部光芒舞台、主题封面、双侧高价值符号、金额缓动计数和金币飞向余额槽。
- 特色奖励：Orbit Pick 为椭圆选择轨道；Cash Respin 为 5×3 锁币网格；Dice Wild 为五段弧形航线；Skyfall 为四级上升阶梯。
- 性能约束：转轴节点复用；动效由 Tween / 帧时间驱动；未在转轴热路径新增定时器或实例化循环。

## 发布前仍需补齐

自动发行审计仍会阻止正式发布，直到发布者填写法定主体、支持邮箱、HTTPS 协议地址、App Store Connect 商品 ID，并完成法务文本中的地区、留存与管辖条款。这些值不能由模板代替真实发行信息。
