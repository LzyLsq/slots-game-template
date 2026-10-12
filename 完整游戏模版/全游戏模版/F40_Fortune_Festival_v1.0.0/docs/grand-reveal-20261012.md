# F40 大奖递进演出 · 2026-10-12

版本：`f40-grand-reveal-final-20261012`。本轮在 Cocos Creator 3.8.8 中修改演出，不改生产中奖规则、概率和余额结算。

## 本轮修改

- 通过本机 CC Switch 图片服务新增金色光幕、喷金礼花及金属金额字形三张资源。原始图片、提示词、加工记录及哈希保存在 `art-source/` 和 `docs/art-provenance.json`。
- 光幕从当前柜机内渐升；左右礼花错峰展开，与原房间、柜冠、财宝和吉祥物的反馈共同形成高潮。原转轴、角色、控制台和背景在演出期间持续可见。
- 实际金额按现有奖级逐级显示 BIG → SUPER → MEGA → EPIC。升级与最终揭晓有两波不同节奏的喷金、金币和材质扫光；提前揭晓和自动结束保留。
- 金额采用精确裁切的图片字形，按真实字宽整体居中并等比适配，逗号基线单独处理。修复 Creator loose Babel 将字符串展开编译为数组拼接的问题，最终构建使用 `value.split('')`，多位金额不再回退到普通文字。
- 演出退出时金币飞向当前柜机真实 COINS 位置，原标题与操作区渐显并恢复。静音、reduced motion、输入隔离和防重复入账保留。

主要实现：`SalonWinStage.ts`、`AwardStageLayout.ts`、`AwardDigits.ts`、`SymbolCrop.ts`；图片加工：`tools/prepare-award-art.py`。

## 已完成验证

| 检查 | 结果 | 范围 |
|---|---|---|
| TypeScript | 通过 | `npm run typecheck` |
| 中奖演出逻辑 | 通过 | `npm run test:win-presentation` |
| 柜机布局 | 40 组合通过 | `test:layout` |
| 奖级画面 | 32 组，错误 0 | 四模式 × 四奖级 × 390×844 / 320×568 |
| 多语言与长金额 | 10 组，错误 0 | 五语言 × 2,537 / 12,345,678 × 320×568 |
| 交互恢复 | 3 项，错误 0 | 提前揭晓、隔离、resize、重复操作、自动退出、reduced motion |
| 连续录像 | 四模式，错误 0 | 本地实际扣款、结算、递进揭晓、退出与恢复 |

最终 Cocos 构建日志显示 `Finished`；此工作站 CLI 返回 36，已通过实际预览确认生成内容可运行。最终服务脚本与本地构建哈希一致。

32 组奖级和 10 组文字检查都读取实际图片字形 Sprite；四模式录像的每次采样也确认图片金额启用、fallback Label 透明度为 0。已人工查看小屏四模式图、中文长金额、完整连续帧以及揭晓/退出画面，检查裁剪、文字、标题与角色遮挡。

## 连续流程与证据范围

四模式录像使用 **debug 强制 EPIC 结果**。该轮仍经过真实本地扣款、中奖入账和局数递增；fixture 不修改生产 RNG，不是自然中奖频率或自然 RTP 的证据。12,345,678 仅为构图压力值，不是可达赔付证明。

| 模式 | 录像秒数 | 下注 | 中奖入账 | 恢复后余额 |
|---|---:|---:|---:|---:|
| Golden Phoenix | 21.57 | −80 | 12,033 | 38,953 |
| Jade Dragon | 14.94 | −80 | 12,003 | 38,923 |
| Pearl Qilin | 20.63 | −80 | 12,284 | 39,204 |
| Amber Panda | 12.95 | −80 | 12,000 | 38,920 |

每轮最终 `busy=false`；一条下注交易、一条中奖交易，演出恢复后余额与显示一致。较长录像包含该模式的免费旋转或 cascade 流程。

演出时的 COINS 显示遵循原 UI 更新时序，内部结算已完成，演出结束再刷新余额。图片和金额显示不参与发奖逻辑。

## 时间过程与尚未验证范围

录制为 `GameCanvas.captureStream(30)`，使用原始 WebM 逐帧解码，无插值。浏览器 RAF 的 p95 四模式均约 16.8ms，但不能据此声称全程无卡顿或手机 60fps。

| 模式 | 浏览器最大 RAF 间隔 | 原始录像最大帧间隔 | 大于 100ms 的源间隔 |
|---|---:|---:|---:|
| Golden Phoenix | 33.3ms | 75ms | 0 |
| Jade Dragon | 166.6ms | 194ms | 3 |
| Pearl Qilin | 466.6ms | 451ms | 4 |
| Amber Panda | 66.6ms | 93ms | 0 |

Jade Dragon 的 123ms 源间隔跨越大奖开始采样位置；其余两次在演出前。Pearl Qilin 的四次源间隔都发生在演出开始前的特殊玩法阶段。阶段采样只能定位时间范围，不能直接证明 CPU/GPU 原因。保留此性能限制，未将它标为已修复。

本轮没有手机实机、原生 iOS 性能、音乐听感、正式服务、支付、签名或 App Store 审核验收；没有 Git 提交或推送。

## 查看

- [本轮截图、录像和 JSON 验证入口](screenshots/f40-grand-reveal-20261012/README.md)
- [资源出处](art-provenance.json)
- [QA 工具与 fixture 说明](../tools/qa/README.md)

正常预览：`http://127.0.0.1:6040/?debug=1&screen=home&v=f40-grand-reveal-final-20261012`。

大奖测试预览：`http://127.0.0.1:6040/?debug=1&screen=game&game=golden-phoenix&force=epic&v=f40-grand-reveal-final-20261012`，进入后自动执行一次强制大奖测试；该入口不代表自然中奖。
