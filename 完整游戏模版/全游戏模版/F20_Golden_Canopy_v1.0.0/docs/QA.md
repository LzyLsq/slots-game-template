# F20 验证记录

2026-09-11，Cocos Creator 3.8.8 Web Mobile 构建。

## 自动与交互验证

- TypeScript 类型检查通过。
- 4,000 次数学测试，Apple identity token 校验、真实排行持久化、630 条规则金额检查通过。
- 32 组柜机/视口布局检查通过，包括 320×568 至 820×1180；转轴、按钮与完整环境采用同一变换。
- 浏览器实际点击四个目的地、PLAY、加载、下注增减、规则、音效与返回。
- 第一天签到增加 2,000；每日宝箱增加 5,000；重复点击均不重复发币。
- 头像选择第 16 个并刷新后保持；账本、退出、登录两个输入框及注册四个输入框可用。
- 四个商店商品与恢复按钮可触发；浏览器未配置原生支付时明确提示不可购买，不伪造成功、不改变金币余额。
- 四套转轴连续起转、平滑减速、最终符号一致。桌面 Chrome 本次采样帧间隔 P95 约 16.7–16.8ms，不等于所有手机性能保证。
- 四套普通获奖及强制 BIG 演出均完成、正常清理且不重复发币；BIG 检查确认主题名、光效与遮罩淡出。
- 320、390 宽主要页面及 768 宽柜机实际截图；浏览器 pageerror 为零。检查结果见 screenshots 下验证 JSON。

## 视觉修正

大厅换成金叶拱门、宝石吊灯、金雕舞台与金币树屋。四个目的地以大型展品切换呈现。登录保留完整原画与 Apple 标志，表单采用细金边九宫格，避免长条材质被拉成厚重边框。大厅说明文字置于安静内衬。

四套柜机保留顶部角色，原始柜机中心与完整扩绘环境融合。逐格清除符号旁边的游离碎片，签到金额及状态避开金边。建筑保持固定，标题缓慢浮动，金饰扫光、边缘落叶、按钮反馈和获奖动态局部运动。

## 验证边界

这是虚拟金币模板，未提交 App Store。原生 Apple 登录、StoreKit 商品、生产后端、法律资料、签名、Sandbox 和 TestFlight 真机流程仍需发行方配置。强制获奖截图仅用于演出检查，不代表自然获奖概率。未执行真实充值。

## 2026-09-14 排行展示

玩家与 5 位虚拟角色在同一榜单按累计获奖排序，玩家行保留实际名次。验证 0 分第 6、100,000 分第 2、200,000 分第 1，同分真实玩家优先；虚拟角色数据不写入存档。320 宽浏览器验证 100,000 分玩家排在 96,500 分虚拟角色之前。

## 2026-09-14 多语言

支持 en、zh-CN、zh-TW、ja、ko，登录及账户入口可切换。390 宽检查五种语言七个主页面；320 宽检查语言选择、登录、账户、合并排行、四柜机及赔付/特色规则。真实点击切换、刷新及退出登录后记忆通过；切换前后玩家存档和钱包保持一致。词库完整性、动态参数数字保留、默认语言回退、类型检查及现有回归测试通过。浏览器验证不替代 iOS 真机测试。

## English default and review — 2026-09-14

- First use defaults to English in both the HTML loader and Cocos UI, independent of browser language. Explicitly saved language choices remain intact. Storage failures fall back to English.
- Browser checks: fresh zh-CN, ja-JP and ko-KR contexts all display English; actual language selector clicks, refresh and sign-out preserve the selected language without changing the wallet/save.
- Main pages captured at 320×568 and 390×844, all four cabinets at 390×844, two cabinets at 768×1024; no page errors. Narrow-screen login, account, rewards and second cabinet screenshots reviewed for text/control bounds.
- Existing math, Apple identity, mixed ranking, layout, rule amount and language tests passed; TypeScript check passed.
- Corrected stale build scene URL to the existing GildedExpress scene, and replaced the release audit's obsolete F15 artwork and scene references with F20 resources.
- Release audit still requires real publisher/legal configuration, final hosted legal documents and production product identifiers; these are not supplied by the template.

## Hall touch navigation — 2026-09-14

- The destination illustration supports horizontal touch swipes with a small drag-follow response, directional crossfade and wraparound. Vertical gestures, short drags and cancelled touches return to the resting position. The gesture area excludes PLAY.
- Moved the exhibit up and separated PLAY from the four destination selectors. Swipe state resets when the hall is rebuilt.
- Browser touch checks at 320×568, 390×844, 430×932 and 768×1024 cover both directions, wraparound, vertical/short gesture rejection and non-overlapping PLAY/selection bounds. Screenshots: `screenshots/*-home-swipe.png`.

## Touch regression review — 2026-09-14

- Reproduced a PLAY mis-tap: dragging 45 CSS pixels across the button previously entered the game. Shared button handling now cancels activation once a gesture moves beyond the touch tolerance; returning over the button does not re-arm it. Normal taps keep their press feedback.
- Browser regression confirms dragging PLAY stays in the hall, while destination taps and PLAY still work. Left/right swipes, wraparound, short/vertical gesture rejection and layout separation pass at 320, 390, 430 and 768 pixel viewport widths.
- Local reward verification: day-one check-in adds 2,000, daily chest adds 5,000, repeat claims add nothing, and reload retains DAY 1 COLLECTED.
- Actual language selector clicks, reload/sign-out persistence, mixed standings and all four narrow-screen rule panels passed without page errors. Full npm test and TypeScript checks passed. This review does not exercise deployed production accounts or live StoreKit purchases.

## Motion continuity — 2026-09-14

- Hall drag uses gradual resistance instead of a hard position clamp. Outgoing movement continues from the dragged position in the same direction; interrupted return tweens are stopped before switching.
- Reel idle motion blends in over 450 ms after spring landing rather than jumping directly to an unrelated idle phase. Expired theme bursts and hidden idle motes skip unnecessary transform updates.
- Four-cabinet boundary checks at landing age 0.5799/0.5801 seconds passed: position changes below 0.01 design units, scale below 0.001, angle below 0.01 degrees; settled symbols unchanged.
- Desktop headless Chrome rAF sampling at 390×844: idle, four destination changes and reels each sampled around 60 fps, p95 16.7–16.8 ms, no intervals above 33.5 ms in these short runs. This is desktop browser evidence, not physical mobile GPU certification.
- Enter/loading/return/swipe flow, type checking and all 32 existing cabinet viewport layout checks passed.

### 2026-09-14 — Continuous hall swipe regression
- Reproduced lost second gesture with CDP touch input: 180 ms drag, 45 ms between gestures. Previously TOUCH_START during the 350 ms crossfade was discarded.
- Accept gestures during transitions, retain the latest pending destination, and keep the dedicated swipe surface above replacement artwork. Drag/settle transforms do not interrupt an active crossfade.
- Typecheck and web-mobile build passed. Real browser touch input passed at 320×568, 390×844, 430×932, 768×1024: rapid reverse gestures, eight consecutive forward swipes with wraparound, short/vertical rejection, selector and PLAY taps. PLAY/selection spacing remains positive. Rendered 320 px screenshot reviewed.
- Desktop mobile viewport emulation; physical-device checks not performed.

### 2026-09-14 — Release outside the swipe surface
- Reproduced a second failure: a wide swipe ending outside the destination hit rectangle resets instead of switching. Cocos rewrites an outside TOUCH_END to node TOUCH_CANCEL.
- Use the preserved original event code to finish outside releases; real system cancellations still restore without changing modes. Track the initiating touch ID to prevent a second finger from replacing the gesture.
- Expand the swipe surface across destination artwork, title and caption; its lower edge remains above PLAY.
- Browser touch regression passed at 320×568, 390×844, 430×932 and 768×1024: release outside the lower boundary, reverse swipe, genuine touchCancel, vertical rejection and subsequent recovery. Typecheck and web-mobile build passed.
