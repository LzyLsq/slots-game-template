# F34 柜机与招财角色修正 · 2026-09-30

本轮对应“重新生成柜机、为吉祥物预留位置、重新生成喜庆招财角色并使其摆动”的要求；在 Cocos 工程中完成，运行的是 Cocos 构建预览。

## 已修正

- 四幅柜机与房间图通过本机 CC Switch 所选图片服务重新生成。背景延伸、柜机结构和下方角色壁龛采用同一透视与材质，角色位置在绘制柜机时预留。
- 重新生成金币狐狸、蓝宝石猫头鹰、珍珠天鹅和红宝石狮子。独立的手臂/翅膀围绕肩部枢轴招财摆动；身体轻微呼吸，柜机与按钮点击区域保持稳定。
- 补齐摆动肢体后方的实体肩部，柔化交接遮罩，避免抬手时露空或出现残影。脚底按实际透明轮廓对齐石台，保留完整身体与接触阴影。
- COINS、BET、WIN、TOP、加减、SPIN 与 AUTO 重新对齐绘制好的控制台开口；转轴仍在玻璃开口内裁切。适度增大读数。
- 浅色珐琅的 AUTO 改为深色文字，切换开关时保持可读；深色控制台保留浅色文字。
- 修正设备方向识别：桌面横向窗口可直接操作，竖屏提示仅用于手机与原生目标，避免桌面预览被遮罩锁住。

## 本轮实际运行检查

- 390 × 844 与 320 × 568 均逐台截取并查看最终渲染，检查标题、文字、按钮、转轴开口、角色与底座。
- 从大厅实际进入四个模式，完成各自加载与返回。普通旋转、加减投注、规则打开/关闭、声音开关已检查。
- 四模式小屏实际开启 AUTO，并在旋转中关闭；每次只完成当前一轮，随后恢复 idle，无待结算残留。
- 真实旋转结果逐次核对：最终余额 = 原余额 − 投注 + 实际派彩；获奖流程结束后恢复操作。未使用强制获奖参数证明自然中奖。
- 连续录制四个角色的招财循环，并取每个循环 9 帧核对肩部、摆动和固定站位。记录保存在 motion/。
- reduced motion 下角色手臂不摆动、身体不缩放；仍可旋转并正常回到 idle。
- 1280 × 720 桌面预览的方向遮罩关闭，可实际旋转；iPhone UA 的 844 × 390 横屏遮罩保持开启，切回 390 × 844 后自动解除。两个上下文均完成真实旋转并返回 idle，金币流水核对通过，无待结算残留。
- 本轮观察到的浏览器 pageerror 为 0。原始运行数据见下方 JSON。
- `npm run typecheck` 与 `npm test` 的 10 组检查通过；包括 32 组柜机/视口布局、12,000 轮核心结算及 24,000 轮柜机规则检查。

## 证据

| 模式 | 常规手机 | 小屏 |
|---|---|---|
| Coin Engraver | [390 × 844](screenshots/f34-integrated-guardians/golden-hour-390x844.png) | [320 × 568](screenshots/f34-integrated-guardians/golden-hour-320x568.png) |
| Sapphire Faceter | [390 × 844](screenshots/f34-integrated-guardians/jade-treasury-390x844.png) | [320 × 568](screenshots/f34-integrated-guardians/jade-treasury-320x568.png) |
| Pearl Loom | [390 × 844](screenshots/f34-integrated-guardians/pearl-palace-390x844.png) | [320 × 568](screenshots/f34-integrated-guardians/pearl-palace-320x568.png) |
| Crown Foundry | [390 × 844](screenshots/f34-integrated-guardians/ruby-revel-390x844.png) | [320 × 568](screenshots/f34-integrated-guardians/ruby-revel-320x568.png) |

- [四角色连续动作录像](screenshots/f34-integrated-guardians/motion/four-guardian-cycles.webm)
- [运行检查原始数据](screenshots/f34-integrated-guardians/runtime-checks.json)
- [动作采样](screenshots/f34-integrated-guardians/motion/poses.json)
- [低动态设置截图](screenshots/f34-integrated-guardians/pearl-palace-reduced-320x568.png)
- [桌面方向修正截图](screenshots/f34-integrated-guardians/desktop-1280x720.png)
- [手机横屏转回竖屏截图](screenshots/f34-integrated-guardians/mobile-restored-390x844.png)

## 运行状态与边界

预览服务位于 `http://127.0.0.1:6035/`。本轮最新 Cocos CLI 返回 36；[Cocos Creator 3.8 官方命令行构建文档](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-in-command-line.html) 将 36 定义为构建成功。日志显示 web-mobile build Task Finished，输出产物已完成上述实际运行检查。最新日志保存在本机 `/tmp/f34-preview-device-build.log`；柜机与角色修正构建日志为 `/tmp/f34-grounded-final-build.log`。

以上是桌面 Cocos 预览及模拟手机比例检查。iOS 原生构建、真机性能、签名、Apple 登录、StoreKit、正式服务及 App Store 审核未在本轮验证。按本次请求未提交或推送 Git。
