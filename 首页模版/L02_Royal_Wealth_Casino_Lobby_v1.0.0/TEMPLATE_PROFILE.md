# L02 · 皇家财富赌场大厅模板

- 模板编号：`L02`
- 当前版本：`1.0.0`
- 状态：`IN_DEVELOPMENT`
- 技术栈：Cocos Creator 3.8.8 + TypeScript
- 设计分辨率：750 × 1334 竖屏
- 页面：登录、注册、首页、商店、排行榜、奖励、账户
- 数据：本地演示数据，可替换为服务端 API
- 目标：作为多个 Slot 游戏共用的大厅、账户与运营入口
- 视觉主题：皇家酒红 + 祖母绿玻璃 + 黄金宝石赌场大厅，核心意象为金币、宝箱、宝石、Jackpot、VIP 与 High Rollers
- 服务游戏：`S07` Royal Fortune Wheel、`S08` Royal Diamond Megaways、`S09` Aurum Forge、`S10` Sovereign Treasury
- 图片动效：背景慢速景深推拉、真实游戏预览和特征图标漂移、宝箱 Banner 金光扫过、金币/宝石/钥匙分组漂浮、柔和金色光尘
- 输入框：登录与注册页原生输入层、文字和点击区域统一垂直居中
- 图片布局：首页卡片、底栏图标、商店商品图全部按源图宽高比显示，不再拉伸
- 图片素材：CC Switch `/v1/responses` + `image_generation` 生成登录、商店、排行、奖励、账户专属背景，以及首页背景、Banner、四张游戏封面、金币徽章和奖励宝箱
- 字体：Cinzel Bold 用于主标题，Nunito SemiBold / ExtraBold 用于正文和按钮
- 账户与商店：统一酒红金卡片、VIP 玩家中心、Casino Cashier 六档金币商品与演示购买反馈

本模板与具体 Slot 玩法解耦。`L02` 负责 S07–S10 的豪华财富赌场大厅与账户壳，四个 S 模板负责实际游戏玩法。
