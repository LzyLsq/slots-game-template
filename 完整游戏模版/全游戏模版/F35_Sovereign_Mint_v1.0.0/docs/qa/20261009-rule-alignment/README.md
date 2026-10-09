# F35 规则居中修复 · 2026-10-09

## 修改
- RulePages 正文 x=72 → 0；阅读框宽度 720。分页与 38px 字号不变。
- RuleHelp 正文 x=72 → 0；阅读框宽度 720。四行分页与底部雕花留白不变。
- 玩法图解 x=62 → 0，与标题、正文、页码共用中心线。
- 未调整玩法、赔率、派奖或美术素材。

## 验证
- npm test 全部通过；npm run typecheck 通过。
- Cocos web-mobile 构建日志明确 Finished；CLI 退出码 36，产物已生成并同步正式目录。
- 6038 真实运行：中奖条件、奖励说明翻页、玩法图解均居中，无文字越框/压住雕花。
- 最终截图：默认窗口、320×568、390×844；测试后已恢复默认窗口尺寸。
- 浏览器 warn/error 日志为空。

## 截图
- rules-centered.png：中奖条件。
- features-centered.png：奖励规则第二页。
- how-to-play-centered.png：玩法图解与解释。
- how-to-play-320.png、how-to-play-390.png：窄屏与常见手机尺寸。
