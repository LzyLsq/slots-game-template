# F28 verification — 2026-09-20

## Executed

- `npm run typecheck:core`: passed strict TypeScript with unchecked-index checking enabled.
- `npm test`: 27 tests passed, 0 failed (including lossless rules pagination, native entropy failure and no-deduction failure behavior).
- `npx tsc -p tsconfig.runtime.json --noEmit`: passed strict Cocos runtime type checking.
- 20,000 seeded rounds across four modes: exact integer totals, valid winning-cell evidence, bounded features and cascades.
- Duplicate spin/settlement, persistence failure/rollback, pending result reload/recovery, stale-session writes, reward reclaims and corrupt saves.
- Auto-spin count and hide/show cancellation; duplicate animation callbacks.
- Reel trajectory position/velocity continuity, exact end position at six simulated frame rates (not measured rendering FPS).
- 24 viewport/safe-area mathematical combinations; this is **not** completed visual or real-device verification.

## Development simulation

`npm run simulate` completed after initial paytable tuning: 100,000 seeded rounds per mode at a 100-coin bet. Observed return is total payout divided by total stake; hit rate includes payouts smaller than the stake, not just profitable rounds.

| Mode | Observed return | Any payout | Multiple stages | Largest observed win / bet |
| --- | ---: | ---: | ---: | ---: |
| Captain's Cache | 93.069% | 22.091% | 0% | 80 |
| Pearl Passage | 92.55337% | 51.276% | 0% | 93.6 |
| Jewel Cargo | 89.33724% | 15.167% | 1.785% | 55 |
| Reef Riches | 93.7452% | 26.103% | 26.103% | 90 |

These finite-sample measurements are not theoretical or certified RTP, nor proof of production fairness. Other bet sizes, rounding effects, tail probabilities, and experienced pacing still require review. No live wallet or real-money purchase was used.

## Actual web runtime checks

Cocos Creator 3.8.8 web-mobile build, served on port 4887. Screenshots are under workspace `output/playwright/`; these are browser results, not physical-device certification.

- Original marina, title, club, four complete cabinet scenes, four independent symbol sheets and controls loaded into the running game. The build now supplies its own favicon and page title.
- Four modes actually animated and settled in Chromium: Captain, Pearl, Cargo, Reef. Duplicate spin requests produced one receipt and one deduction. Example Pearl stake 20, payout 5, net -15.
- Cargo deterministic QA round: six stages, stake 20, total award 480, balance delta +460, returned to idle. Receipt did not modify the balance. Actual mouse activation of View stage 6 displayed the awarded coins and their numeric badges.
- Reef deterministic QA round: three stages, two seven-cell wins of 80 each, total 160, net +140, returned naturally to idle. Forced seeds were injected only in the QA browser, never added to the release game.
- 390×844: actual name entry, blur preservation, guest entry, daily reward, settings, profile, sign-out and re-entry. 320×568: actual game entry/Back, rewards, profile, settings, privacy pagination and close, erase confirmation Cancel.
- Daily reward clicked three times: credited exactly 500 once; balance and claim retained after reload. Sound/music/reduced-motion preferences retained after reload. Sign-out retained local wallet and captain name.
- 320×568 and 430×932 Reef screenshots: continuous scene and aligned reel region. This does not prove all notch configurations.
- Six-second desktop headless Chromium rAF sample during turbo auto: 355 warm frames, median 16.7 ms, p95 16.8 ms, none above 33.4 ms. This is not a phone GPU, draw-call, memory, or long-session performance measurement.
- S05 reference was actually run: two normal and four auto rounds, left-to-right stops and settlement bounce inspected. See REFERENCE_AUDIT.md for limitations.

Recent fixes: readable paginated rules; disabled materials; cargo value badges; receipt-stage review; award panel above reels; native safe rectangle plus browser CSS safe-area insets; removal of orphan EditBox default labels; larger service-page copy. Native/CSS inset code still needs real notched-device verification.

## 2026-09-20 themed-control regression

The final `harbor-controls` and `helm-controls` build was exercised with real Chromium mouse input, not direct action-callback invocation. Repeatable scripts: `tools/browser-controls-audit.js` and `tools/browser-control-gestures.js` (Playwright CLI run-code functions).

- 320×568, 390×844 and 430×932: entered all four modes, stepped wager up/down, toggled Turbo, spun and returned to idle (12 completed rounds), opened settings and toggled sound/reduced motion back and forth, closed and returned to the marina.
- All three sizes: Gifts, Rank, Shop, Crew, erase-confirmation cancellation, privacy Next/Previous/Close. No page exceptions or HTTP responses >=400 were collected during that run.
- 390×844 gesture pass: pointer drag off a boarding control left the player in the marina; Max bet followed by + remained capped; a real double click on Spin produced exactly one new round ID and one receipt, no pending result, and the exact previous balance minus stake plus win.
- After the final atlas replacement and removal of unused color-only buttons, 12 real Play → Crew navigation cycles (24 page changes) stayed at 62 nodes / 11 registered controls on Crew, 31 draw calls, and 89,642,188 reported texture bytes. This short desktop-browser check found no accumulation across those cycles; it is not a long-session memory-leak or phone-GPU certification.
- Screenshots `F28-controls-*` in workspace `output/playwright/` document the final role-specific controls. The 320px marina, captain console and settings images were visually inspected: sculpted ornaments remain proportional, labels stay in their blank material face, and settings rows do not overlap. Screenshot coverage alone is not proof of every touch target or physical-device result.
- Four main controls have independent helm/shell/chest/coral faces. Auto uses a winder, Turbo a rocker, wager keys short-travel brass parts. Harbor navigation uses ticket/chest/podium/market/passport forms; dialogs use seal/cancel/next/back forms. These share one material system rather than random unrelated button skins.
- Native results are recorded separately in `NATIVE_BUILD.md`; this browser pass must not be presented as an iPhone-device test.

Final visual correction: the profile cancellation ornament initially crowded the first letters. The common material label region now starts beyond the full 205/256-height left fitting. Unused early color-only control textures were removed from the resource bundle after reference checks; their source-generation record remains available.

After that correction, the three-size/four-mode browser suite passed again. The final profile action was shortened to “Erase data” to avoid text shrinking on 320px screens; its explicit local-data confirmation and real Cancel click were rechecked against the rebuilt application. `F28-controls-profile-final-320.png` supersedes the earlier longer-caption profile screenshot.

## Not yet verified / release blockers

- Final paytable/volatility tuning, all-bet-size analysis and certified probability review.
- Native bridge and unsigned arm64 Simulator build now compile; actual native runtime verification is tracked in NATIVE_BUILD.md. This is not real-device or distribution validation.
- Physical-device layout, real notch/keyboard behavior, audible sound QA, GPU time, memory and long sessions.
- Production account services, authoritative ledger, platform payments, server-clock rewards and release compliance.

The project is now a playable original four-mode web game, not merely a logic foundation. It is still **not a completed independently publishable App Store product**: signing, official purchasing/account services, commercial asset terms and native/device validation remain open. Local virtual coins and personal records must not be described as production online services.
# Material lustre follow-up — 2026-09-20

- Web build and strict runtime/core TypeScript checks pass; all 27 unit tests pass.
- Browser pointer regression: 320×568, 390×844 and 430×932; all four modes, 12 spins, wager steps, turbo, settings, page navigation, privacy pagination and destructive-confirmation cancellation pass. The final explicit-uniform initialization also passes the separate gesture/settlement regression.
- `tools/browser-lustre-audit.js`: 540 live frames, peak reflection strength 0.3399, 465 quiet frames; disabled minimum-bet key stays unlit; reduced-motion suppresses all reflections; text has no custom reflection material. Desktop browser rAF median 16.7ms, p95 17.5ms, not a physical-device performance claim.
- 24 further Play/Crew page changes: 59 content nodes, 11 controls, 31 draw calls and 89,642,188 texture bytes before and after. This is a bounded navigation regression, not a long-duration leak proof.
- Full final native asset generation and unsigned Simulator compilation pass. Installed on iPhone 18 Pro / iOS 27 Simulator; `ready=true`, all four cabinet materials and rendering checked using inspector navigation and Simulator screenshots, not OS touch-input testing in this follow-up. Screenshots: workspace `output/playwright/F28-native-lustre-{captain,pearl,cargo,reef}.png`.
- Existing release blockers are unchanged: physical-device validation, signing, production services, StoreKit configuration/verification and commercial resource/legal review are not established by this visual pass.

## Independent console follow-up — 2026-09-20

- Pearl、Cargo、Reef 使用本轮 CC Switch 新生成并独立抠图的 v2 控制部件；Captain、Pearl、Cargo、Reef 现在分别采用机械舵轮、母贝珠宝盒、翡翠保险柜和水晶珊瑚四套实体控制语言，不是同一胶囊按钮换色。
- `ConsoleStyle.ts` 为每个模式/职责分别声明精灵、九宫格策略、标签安全区、字号、热区高度及浅色标签策略；`Surface.ts` 的 `lightLabel` 仅改变文字对比度，不改变热区或动作语义。
- `tools/browser-console-state-audit.js` 使用真实鼠标输入通过：SPIN 与 Auto/Turbo 热区不相交；禁用控件保持实体材质完全不透明，改用哑光降亮与低饱和文字表达不可用；Auto 在活动轮中保留 STOP；禁用 Rules 不穿透打开弹窗；STOP 清空后续轮次；Turbo 拖出后释放不会误触。
- 最终逻辑回归再次通过：27/27 单元测试、core/runtime 严格 TypeScript 检查和 Cocos Creator 3.8.8 web-mobile 构建。桌面浏览器证据不能替代真实 iPhone 的触控、GPU、内存和安全区测试。
- macOS Chromium 的整页 WebGL 截图在重复多视口长回归中偶发卡在浏览器截图接口，场景逻辑仍继续运行。功能回归与视觉截屏因此拆分；该工具问题不能作为产品通过或失败的替代证据。

## Final console-layout closure — 2026-09-20

- Cargo 的 Rules 铭牌最终安全区调整为避开左侧机械锁件的独立文字窗口；390×844 实际 WebGL 截图确认 `Rules`、`Max bet`、Auto 和 Turbo 均完整可读且未互相覆盖。证据：工作区 `output/playwright/F28-final-cargo-label2-390.png`。
- 当前最终代码再次通过 27/27 单元测试、`npm run typecheck:core`、`npx tsc -p tsconfig.runtime.json --noEmit` 与 Cocos Creator 3.8.8 web-mobile 构建。
- `tools/browser-console-state-audit.js` 再次以真实鼠标输入通过：SPIN 与 Auto/Turbo 热区分离、旋转禁用态透明度、Auto STOP、禁用 Rules 防穿透、Turbo 拖出取消。
- `tools/browser-controls-audit.js` 改为等待页面转场后的目标控件，避免把仍在运行的过渡动画误报为缺失按钮；无界面 Chromium 最终通过 320×568、390×844、430×932 三尺寸、四模式、12 次真实旋转，以及投注、Turbo、设置、导航、隐私翻页和删除确认取消流程。
- `node tools/build-ios.mjs --compile` 针对当前最终资源与代码重新生成 iOS Simulator 工程并以 `** BUILD SUCCEEDED **` 完成编译。构建仍报告生成工程的 Bundle Identifier 设置警告；这不是分发签名、真机、StoreKit Sandbox 或 App Store 提交验证。

## Text-safe reward polish — 2026-09-20

- 所有柜机按钮标题改为单行排版，禁止 `TURBO` 等短词在窄装饰件内断行；按钮文字仍使用各柜机独立的装饰安全区，而不是把同一套偏移复用到四个模式。
- 320×568、390×844、430×932 浏览器测量确认按钮文字没有触发自动缩字。四种柜机的 Turbo 最终字号下限分别为 Captain 29、Pearl 27、Cargo 24、Reef 24；Cargo 与 Reef 的 320×568 最终截图为工作区 `output/playwright/F28-text-{cargo,reef}-final-320.png`。
- 旋转禁用态不再降低整个按钮表面的透明度：实体材质始终保持 255 不透明，改用哑光材质色与低饱和文字和可点击状态区分，避免柜机底图透过控制件。`tools/browser-console-state-audit.js` 已同步检查完全不透明的实体表面、禁用材质色、热区分离、Auto STOP、禁用 Rules 防穿透与 Turbo 拖出取消。
- 中奖演出由旧的单一两行文字升级为独立的奖级标题、54px 金额和说明行，并为 `PRIZE FOUND`、`TREASURE WIN`、`GRAND TREASURE` 提供分级缩放、双层金色光环、错峰星芒、奖级对应的金币数量和缓动数字递增。说明行明确展示本次中奖组合数量与本段奖励金额。
- 金币飞行动线被限制在奖励牌与顶部资产栏走廊，不再经过转轴中央；中奖格、高亮和底部规则说明在演出过程中保持可见。真实小奖证据：项目 `output/playwright/F28-reward-final-390.png`。最大标题与五位数金额证据：项目 `output/playwright/F28-reward-grand-visual-390.png`，该图为直接调用表现层的视觉 QA，不是随机自然开出的大奖记录。
- 本轮最终状态再次通过 27/27 单元测试、core/runtime 严格 TypeScript 检查、Cocos Creator 3.8.8 web-mobile 构建及 unsigned arm64 iOS Simulator 编译（`** BUILD SUCCEEDED **`）。Cocos Creator 启动时仍报告其用户级 `layout.json` 解析信息，生成工程仍有 Bundle Identifier 设置警告；二者未阻止本轮构建成功，但发布签名、StoreKit、真机触控/GPU/内存和 App Store 审核仍未完成验证。

## Opaque control closure — 2026-09-20

- 修复禁用按钮像半透明贴片的问题：`Button surface` 在可用与禁用状态都保持 255 完全不透明；禁用反馈改为实体材质哑光降亮和低饱和文字，不再让柜机底图透过控制件。
- Reef 的 Auto 与 Turbo 标题重新放回各自的水晶/珊瑚控制件安全区，并提高 Turbo 字号。实际 WebGL 证据：工作区 `output/playwright/F28-reef-opaque-labels-final-320.png` 与 `output/playwright/F28-reef-opaque-labels-final-390.png`。
- `tools/browser-console-state-audit.js` 以真实鼠标输入复测通过：禁用 Back/Menu/Rules/Turbo 的表面透明度均为 255、材质哑光色生效、Auto STOP 保持可操作、禁用 Rules 不穿透、Turbo 拖出取消正常。
- 当前代码通过 27/27 单元测试、core/runtime 严格 TypeScript 检查、Cocos Creator 3.8.8 web-mobile 构建以及 unsigned arm64 iOS Simulator 编译（`** BUILD SUCCEEDED **`）。生成 Xcode 工程仍有 `PRODUCT_BUNDLE_IDENTIFIER` 配置警告；发布签名、StoreKit Sandbox、真机触控/GPU/内存与 App Store 审核仍未验证。

## Soft control edges and living harbor — 2026-09-20

- 按钮文字不再使用厚重的深色外轮廓：浅色标题改为 1px 半透明暖棕分离线，深色雕刻标题的象牙边缘同步降低透明度。禁用按钮仍保持 255 完全不透明，但材质改用更明亮的哑光色，避免再次产生黑影或透明贴片感。
- 大厅增加一套受控的分层环境运动：背景以 2.5% overscan 做低速景深漂移，四个泊位错峰入场并采用不同相位的轻微浮动，水面使用 8 条低透明横向金色反射，星芒改为更长的静默周期。所有运动在 reduced-motion 和应用后台状态停止，未加入每帧节点创建或全屏半透明叠层。
- 实际 WebGL 视觉证据：`output/playwright/F28-home-motion-soft-{320,390,430}.png` 与 `output/playwright/F28-cargo-button-shadow-soft-390.png`。运行时隔 1.8 秒采样确认背景、泊位和水面反射分别发生独立位移与透明度变化；三种尺寸均未露出清屏底色，入口、标题和底栏未发生遮挡。
- 本轮通过 27/27 单元测试、core/runtime 严格 TypeScript 检查、Cocos Creator 3.8.8 web-mobile 构建、按钮光泽性能检查（9 个控件，帧间隔中位数 16.6ms、p95 17.8ms）、柜机禁用/热区/拖拽回归，以及 320×568、390×844、430×932 三尺寸四玩法共 12 次真实鼠标旋转与全部主要页面导航。以上仍是桌面 Chromium 证据，不替代真实 iPhone GPU、触控、能耗、安全区与发布签名验证。
- 当前修改还通过 `node tools/build-ios.mjs --compile` 的 unsigned arm64 iOS Simulator 编译（`** BUILD SUCCEEDED **`）。生成工程仍报告 Bundle Identifier 配置警告；本项仅证明模拟器目标可编译，不代表分发签名、StoreKit Sandbox、真机运行或 App Store 审核已完成。

## Mode entry and cabinet idle motion — 2026-09-20

- 四个大厅入口现在均通过真实鼠标点击触发各自的短入场演出，不再直接切到静态柜机：Captain 使用罗盘校准、Pearl 使用珍珠潮汐环、Cargo 使用宝库解锁、Reef 使用珊瑚水波；入场层使用对应柜机完整场景、英文主题文案、实体进度槽与错峰珠灯序列。长标题在 Cargo/Reef 上使用独立字号，390×844 实际截图未溢出牌匾。
- 四个柜机增加与转轴边框绑定的材质呼吸光、上沿移动反射、两侧异步星芒和沿实体边框顺序追逐的主题珠灯。灯效节点在建页时一次创建，更新循环只改已有节点的变换和透明度，不在帧循环创建节点。
- 四套转轴符号增加不同的待机运动语言：Captain 为轻微航向摇摆，Pearl 为浮力漂移，Cargo 为克制的宝石脉冲，Reef 为珊瑚水下浮动。动画在旋转、中奖演出、弹窗、后台与 reduced-motion 状态停止；开始旋转前会恢复精确基础位置。
- `tools/browser-motion-audit.js` 在 390×844 下依次真实点击四个入口并截取入场与柜机待机画面。间隔约 1.85 秒的运行时采样确认四个模式的符号位置/缩放/旋转与柜机光效位置/透明度均独立变化。证据：工作区 `output/playwright/F28-{captain,pearl,cargo,reef}-entry-motion.png` 与 `F28-{captain,pearl,cargo,reef}-cabinet-idle.png`。
- reduced-motion 运行采样确认 Pearl 符号从动态姿态复位到精确基础位置（scale 1、rotation 0），随后 0.7 秒保持完全稳定；柜机光效值也保持不变。Cargo 的实体按钮、Auto STOP、旋转中禁用、Rules 防穿透与 Turbo 拖出取消再次通过 `tools/browser-console-state-audit.js`。
- 本轮最终通过 27/27 单元测试、core/runtime 严格 TypeScript 检查和 Cocos Creator 3.8.8 web-mobile 重建。浏览器证据仍不是实体 iPhone GPU、能耗、触控、安全区、签名或 App Store 审核证明。
