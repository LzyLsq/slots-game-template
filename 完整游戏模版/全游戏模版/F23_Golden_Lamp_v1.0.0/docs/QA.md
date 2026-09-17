# F23 检查记录

检查日期：2026-09-15。构建：Cocos Creator 3.8.8，web-mobile。

## 已完成

- TypeScript 类型检查通过；Web 构建完成。
- 项目测试通过：数学规则、Apple 登录服务模拟、排行榜、32 个柜机/视口组合、630 个规则奖励核对、五语言与默认英语。
- 四个大厅入口通过真实点击进入游戏，均显示带百分比的加载动画；投注加减、规则、SPIN、返回大厅可用。
- 四种转轴检查：启动连续、速度变化有界、最终符号准确；桌面 Chrome 帧间隔 P95 为 16.7–16.8ms。结果见 screenshots/reel-motion-validation.json。这不是手机性能保证。
- 四种普通获奖与大奖演出完成并清理；单独播放演出不改变账户余额，避免重复结算。
- 魔灯祈愿每天仅领取一次；邮件读取持久化、带附件邮件保护、单封及全部领取不重复；里程碑奖励仅发放一次。
- 昵称空输入验证、修改保存、刷新持久化、大厅/排名同步及余额不变检查通过。
- 414×896（顶部44、底部34安全区）、414×715、320×568、430×932（顶部59、底部34安全区），四种柜机的顶部返回/规则/声音按钮均检查了实际坐标、44px热区与点击。
- 登录、大厅、商店、奖励、排名、账户、四种柜机的最终渲染截图已留存。主题图标和按钮已清理邻格残片。

## 可核查证据

- screenshots/release/overview.jpg：六页面总览。
- screenshots/release/：四柜机、加载、普通奖励、大奖及窄屏截图。
- screenshots/safe-tools.json：16组手机视口/柜机的工具栏几何与点击结果。
- screenshots/interaction-validation.json：四入口与真实转动检查。
- screenshots/reel-motion-validation.json：四种转轴连续性和帧采样。

## 发行前仍需完成

- iPhone 真机及 Safari/WebView 长时间性能、触控和安全区验收；本次为浏览器模拟视口。
- 真实 Apple 登录、内购、生产后端与发行方隐私条款配置。未接内购时商品保持不可购买，不发放假购买奖励。
- 金灯柜机使用翡翠整景框架并搭配独立金灯徽章；另外两种柜机有独立画面，共三个整景框架。
- 概率规则沿用模板数学层，本轮没有通过提高获奖概率制造演出；需要发行方进行大样本数值验收。

## 布局与材质修订（同日）

- 大厅改为单秘境主景、环形基座、四缩略入口；主景支持连续滑动切换、点击进入。
- 连续8次滑动、4个缩略选项与进入最终所选玩法通过浏览器指针事件检查，无页面异常。
- 商店由四横排更改为四个独立宝物陈列位；深青铜底座和导航替代大块浅色圆角底板。
- 柜机移除通用服务页背景。源图按顶部建筑、中央柜机和地面分区连续适配，中央区尺寸不变，屏幕和控制几何不变；没有拼接另一张背景。
- 同源画面的顶部及地面会适度延展，这不是新增绘制的场景内容。四种手机视口与四种柜机再次检查顶部按钮安全区及点击。
- 原始四入口交互报告属于修订前版本；修订后按本节的选景方式验收。


## Open treasury lobby — 2026-09-15

Replaced the featured-card selector with four simultaneously visible, staggered treasure doorways. The original treasury painting and hit regions share one cover transform. Added anchored treasure reflections and a compact wish interaction for short screens.

Validated rendered 414×896 and 320×568 screens, four direct entries, loading progress bars and correct destination IDs. TypeScript check and Cocos web-mobile build passed. Screenshots: `screenshots/release/home.png` and `screenshots/release/narrow-home.png`. Earlier carousel validation describes the superseded lobby.


## Cabinet jewellery — 2026-09-15

Added theme-colored faceted stones, inset reel-side scrollwork, title engravings, hanging ornaments and grounded treasure offerings with shadows. Decoration uses existing themed artwork, leaves reel geometry and settlement unchanged, and follows reduced-motion preference.

Validation: TypeScript check and web-mobile build passed. All four cabinets passed toolbar bounds and Rules/Audio/Back click checks at 414×896 (44/34 safe insets), 414×715, 320×568 and 430×932 (59/34 insets): 16 combinations, no runtime errors. Refreshed four cabinet release screenshots and inspected the 320px Ruby layout.


## Service pages — 2026-09-15

Bazaar uses horizontal offers with base/bonus breakdown and wallet balance. Rewards show cumulative cycle coins and claimed-day progress. League adds the player’s mixed rank and score gap to the nearest strictly higher score. Profile uses a collector passport, balance/total/top-win metrics and four shortcut tiles. All values derive from existing products or player state.

Validated four 320px pages visually, nickname dialog opening, a 2,000-coin day-one claim, progress changing to 1/7 and 2,000/98,000, and duplicate-claim protection. TypeScript, five-language tests and Cocos build passed.


## Service content insets — 2026-09-15

Reduced bazaar artwork/glints and inset its purchase controls; brought profile shortcut icons and both text lines inside the ornamental frame; inset daily-chest content and league summary labels. Validated English 414px/320px screenshots and Chinese 320px screenshots, including a long nickname and large records. Nickname dialog and single-claim reward regression passed; TypeScript and web-mobile build passed.


## 金灯寻宝（2026-09-15）

- 独立路线挑战：4 个主题 × 3 张地图 × 2 个难度，共 24 种组合均有有效解。
- 单元测试：非法移动、步数、保存数据校验、能量封顶、刷新恢复、撤回重置、星章最佳值、重复结算与账号隔离。金币奖励不受收藏系统影响。
- 原子性：普通本地结算与远程结果确认在同一个存档更新内增加能量；重复结果不增加；存储失败时钱包和能量都不在内存中提前更新。
- 浏览器实际点击：大厅入口、难度选择、逐格寻路、刷新续玩、撤回、终点入册、第二主题、柜机入口。完成挑战前后钱包余额相同。
- 414×896 与 320×568 渲染检查，补充简体中文窄屏检查；动态数值已本地化。路线步进不重播遮罩开场，使用金线连接与旅者平移动画；减少动态效果时直接到位。
- 四种柜机 × 四种视口（16 组）的新寻宝入口、返回、规则与声音按钮通过安全区、尺寸和实际点击检查，结果见 `screenshots/contract-safe-tools.json`。
- 实际点击 SPIN 完成一局后，该主题灵光从 8 增至 10，顶部状态同步为 LIGHT 10；Gifts 页面实际点击 MAKE A WISH 可打开原每日祈愿。
- 新入口保留 SPIN/AUTO 分区；原每日祈愿移至 Gifts 页面，不删除旧奖励数据。
- 项目测试和前端/服务器 TypeScript 检查通过；Cocos web-mobile 构建完成。截图来自 Chrome 模拟视口，不代表 iPhone 真机测试。
- 截图：`screenshots/release/lamp-contract-{home,menu,route,award,album,cabinet,narrow,chinese}.png`。

范围：新增的是独立收藏解谜循环，四个基础转轴的数学规则未重做；收藏为账户隔离的本机存档，未实现跨设备同步。它不代表已获得 App Store 审核认可。
