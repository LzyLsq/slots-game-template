# F31 验证记录

验证日期：**2026-09-22**

引擎：**Cocos Creator 3.8.8**
目标：**Web Mobile**

## 最终构建

- 构建目录：`build/web-mobile/`
- 文件数：92
- 目录体积：约 95 MB
- 日志包含明确成功标记：`build Task (web-mobile) Finished`
- Cocos 启动器在构建完成后返回 36，发生于子进程 MachPort / GPU 通讯终止阶段；构建任务已经完成，产物和启动场景均存在。

## 自动回归

执行命令：

```sh
npm run typecheck
npm run typecheck:server
npm test
npm run release:audit
```

覆盖范围包括：

- 客户端与服务端 TypeScript 类型检查；
- 四款独立基础结算规则和可见赔付表一致性；
- 自然局、特色局、锁定格、移动、重力、单次收集和最高赔付限制；
- Apple identity token 服务端校验契约；
- 排行、布局、规则金额、语言、签名、核心模式和柜机回归；
- 迎宾 SUPER 大奖保障：前五局、自然 SUPER 提前完成、存档恢复、取消旋转不消耗次数；
- 发行审计对正式域名、法律信息、原生桥接和真机验收的阻断检查。

最终结果：客户端类型检查通过、服务端类型检查通过、完整 `npm test` 通过；发行审计为 **21/26 PASS**。5 个 BLOCK 均属于发行方外部配置：发行主体与公开法律 URL、App Store 商品 ID、正式法律文档、可执行原生桥接、真机与生产验收。出现这些 BLOCK 不代表模板运行失败；必须由真实发行方提供，禁止在模板中伪造。

## 浏览器实际交互

使用 Google Chrome + Playwright 对最终构建执行点击和状态验证：

- 页面无 `pageerror`，无 console error；最终重新构建后再次启动检查，标题、Canvas 和加载流程正常；
- PLUS：下注档位 `1 → 2`；
- RULES：规则弹窗可打开、翻页并关闭；
- SPIN：扣注、起转、停轴、结算和局数累加正常；
- 迎宾大奖：新账户前五次成功结算至少一次 SUPER（≥ 50×）；自然 SUPER 可提前完成，取消/失败局不消耗保障，刷新后状态不重置；
- AUTO：可开始、可关闭，当前局完成后回到 idle；
- BACK：柜机返回大厅；
- 底部导航可进入 MINT、GIFTS、PLAZA、RANK、ACCOUNT；
- 大厅下一目的地按钮可切换选择，并进入 `lantern-vault`；
- 商店无原生支付桥接时明确提示不可购买，不伪造充值成功，不修改余额；
- 奖励重复领取不会重复发币，存档刷新后状态保持。

## 视觉与响应式复查

已检查：

- 320×568
- 390×844
- 430×932
- 768×1024
- 844×390 横屏提示
- `prefers-reduced-motion`
- 简体中文、繁体中文、英文、日文、韩文
- 四款柜机
- BIG / MEGA / EPIC 演出
- Web 启动加载页

结论：

- 财富主题集中于皇家铸币城、金库机械、金币喷泉、浮雕金币和金条；未使用低幼动物吉祥物作为核心视觉。
- 登录、大厅、商店、奖励、排行和账户不是同一张简单卡片换文案，页面主结构和互动方式存在差异。
- 柜机背景与柜体保持一体构图；转轴窗口贴合柜机屏幕，缩放时共享变换，不出现独立漂移。
- 320 宽可操作，768 平板居中正常，横屏提示正常。
- 五语言游戏名、导航、按钮和主要标题无明显溢出或遮挡。
- SPIN、加减注与 AUTO 具有固定金属底座、内凹槽、抬高珐琅帽、玻璃高光和明显按压行程；RULES、返回等按钮保持独立形态，没有互相覆盖。
- 大厅和四台柜机增加金币堆、宝箱、奖章、钥匙等财富装饰；大奖演出使用透明金币/金条粒子、金币喷泉、环绕奖章、冲击波和标题扫光，不再旋转带方形底色的符号卡。
- 减少动态效果模式关闭持续动画，仍保留必要状态反馈。

## 截图索引

- `docs/screenshots/F31-final-contact-sheet.jpg`：登录、大厅、功能页与四柜机总览
- `docs/screenshots/F31-responsive-contact-sheet.jpg`：多尺寸适配
- `docs/screenshots/F31-language-contact-sheet.jpg`：五语言大厅
- `docs/screenshots/F31-win-contact-sheet.jpg`：大奖演出
- `docs/screenshots/390-loading.png`：启动加载页
- `docs/screenshots/390-big-win-lantern-vault-polished.png`
- `docs/screenshots/390-mega-win-lantern-vault-polished.png`
- `docs/screenshots/390-epic-win-celestial-mint.png`

## 验证边界

当前不能声明“已可直接上架 App Store”。以下事项仍需发行方完成：

1. 发行商法定名称、支持邮箱、正式 API 域名；
2. 正式隐私政策、用户条款和支持页面 URL；
3. App Store 商品 ID、价格、税务和 App Store Connect 配置；
4. 可执行的 iOS StoreKit 2 与 Sign in with Apple 原生桥接；
5. Bundle ID、证书、签名、Apple 根证书与生产密钥；
6. 生产 PostgreSQL、备份、监控、WAF 和通知服务；
7. Sandbox 购买、恢复购买、退款、撤销、TestFlight 和多台真机验收；
8. 审核元数据、年龄分级、隐私清单和最终法务确认。

URL 参数 `force=big|mega|epic` 仅用于视觉演出检查，不代表自然中奖概率；迎宾大奖则是已公开的正式新账户规则。本轮未执行真实充值、真实 Apple 登录或 TestFlight 验收。

## 2026-09-24 · 大奖演出复核

- 移除压在金库主视觉上的倍率解释文案；门槛、总返还与非额外派奖说明保留在规则说明中，演出只显示奖级、主题与到账金额。
- 提升底部交互提示字号和描边；保留大奖金币喷泉、超级大奖第二层爆发及金币雨、揭晓反馈和减少动态效果支持。
- Web Mobile 构建日志显示构建任务完成；Cocos 编辑器进程随后以 36 退出，不能将其视为正常退出。重新发布到本地 5032 预览。
- Playwright 在 390×844 实际运行两档强制演出并留图；`npm run typecheck` 与 `npm test` 通过。
- 参考：`screenshots/390-big-win-lantern-vault-polished.png`、`screenshots/390-mega-win-lantern-vault-polished.png`。
