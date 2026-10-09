# F37 Fortune Caravan · 验收记录

日期：2026-10-09（Asia/Shanghai）。正式交付目录构建，预览服务端口 6037。本记录区分自动测试、浏览器目视和发行待验项目，不将 Web 预览等同真机或苹果审核。

## 最终构建与自动验证

- Cocos Creator 3.8.8，web-mobile release config；最终 `Finished` 时间见 `qa/formal-build.log`。本机进程返回 36，同时核查完整产物并实际打开构建页面。
- `npm run typecheck`、`npm run typecheck:server`、全套 `npm test` 通过；最终完整输出：`qa/final-tests.log`。
- 覆盖实际赔付线、243 Ways、Mystery 最终盘与连簇下落，扣注/取消/重复结算、账号隔离、钱包落盘失败回滚、Apple 签名边界及独立旅程领取。
- 132 个柜机/viewport/安全区组合；11 种大小包括手机和平板尺寸。这是几何测试，不代表 11 台真机验收。
- 吉祥物 18,000 渲染帧共享索引缓冲回归；动画完整摆幅、转轴遮罩/裁剪、按钮/金额框/长金额/五语言文字布局均有测试。未测得或宣称恒定 60fps。
- 36 张 PNG 的 alpha/图集边缘与头像处理检查：`qa/art-crops.json`。共享的财富符号图集并非四套独立原画。
- 59 个 AAC 实际解码、起音、峰值、循环及高频检查：`qa/audio-technical.json`。音频事件及场景互斥通过测试；**没有主观音箱/耳机试听结论**。
- 下注 30/180/900，每模式每档 150,000 自然回合，总 1,800,000；`qa/rtp-bet*.json` 有样本值/95% CI。排除新人及旅程额外币，不是理论精确 RTP 或监管认证。

## 浏览器实际交互与金额

通过游戏按钮操作，读取只读 DOM 音频/演出标记，不注入运行时游戏状态。强制演出仅使用源码明确限制 localhost + debug 的 QA 路由。

| 实测 | 结果 |
|---|---|
| 大厅地区切换 | 原地滑动；PLAY 直接进对应游戏，无独立模式中转页 |
| 普通奖 | 26,740 − 80 + 40 = 26,700，停轴余额更新；普通奖金额可见，可退出 |
| 第五局新人权益 | 26,700 − 180 + 1,800 = 28,320；明确 NEW PLAYER BONUS，独立 `newcomer-benefit`，不冒充自然盘大奖 |
| 集市自然大奖 | 28,320 − 180 + 273 = 28,413 |
| 港口无奖及旅程 | 28,413 − 180 = 28,233；首次旅程 +800 = 29,033；再次领取不可重复发币 |
| 320px 普通奖 | 29,033 − 80 + 40 = 28,993；金额条与 AUTO/SPIN 分离 |
| 430px 集市超级大奖 QA | 手点 SPIN，28,993 − 80 + 2,009 = 30,922；tier 2 / hold；手点 COLLECT 后显示 WIN 2,009、余额 30,922，输入恢复 |
| 音乐/效果设置 | 独立关闭/恢复；不是两开关控制同一通道；对应 JSON 在 `qa/settings-*-dom.json` |
| 点击及收奖 | `fx-tap`、`fx-collect` 来源和事件计数可观察；奖曲及背景录音标记 true、recording failures 0 |
| 商店 | 显示 50,000 + 20,000 = 70,000 的对应预览包；PREVIEW ONLY，未发起真实支付 |
| 退出/导航 | 实际点击排行 BACK、语言 Close、收取及大厅 PLAY 可用 |

演出及收取证据：`qa/super-final-dom.json`、`qa/super-collected-dom.json`；普通奖/设置证据另存同目录。最终构建日志/DOM 见 `qa/browser-final.json`，最后一轮验收范围内控制台 error/warn 为 0。输入 `QA_resize` 在聚焦状态改变 viewport 后仍保留，已清空且未提交账号。

## 本轮修复

- 图集透明 gutter、符号 blur 和头像边缘；转轴/特效与玻璃同平面。
- 柜机底部根据屏高分配提示/普通奖/控制空间；余额/下注/赢币严格落在材质框内。
- 排行亮背景文字补深棕浮雕描边；弹窗退出改真实纹理 Close，320px 有 44px 以上点击区。
- 登录输入提示改清晰单行字；Apple 未接入状态诚实禁用；登录副标题及成年人虚拟币提示补齐四种译文。
- 登录尺寸改变保留 EditBox/IME，单独铺满背景；未聚焦键盘时重定位表单/法律条，不再留下旧比例黑边。
- 旅程达标地区数对目标显示封顶，避免 4/2、4/1 之类误导进度。
- 资源 ES5 唯一队列与吉祥物共享索引扩容回归，防止加载无效资产/渲染卡死。

## 截图索引

全部为实际 Web 构建截屏，非生成效果图。尺寸为浏览器 viewport，不代表设备型号。部分机制截图在最终文字/进度补丁前拍摄，相关机制及画面未再更改；最终登录/大厅/柜机回归图以最终 build 重拍。

- 320×568：`login-320.jpg`、`login-zh-320.jpg`、`hall-320.jpg`、`ordinary-320.jpg`、`voyage-320.jpg`、`rules-voyage-320.jpg`、`journey-320.jpg`、`shop-320.jpg`、`rank-320.jpg`、`account-320.jpg`、`settings-music-off-320.jpg`、`language-close-320.jpg`。
- 390×844：`loading-390.jpg`、`login-390.jpg`、`login-resize-input-390.jpg`、`hall-390.jpg`、`caravan-390.jpg`、`ordinary-390.jpg`、`oasis-390.jpg`、`bazaar-390.jpg`、`voyage-390.jpg`、`big-bazaar-390.jpg`、`super-oasis-390.jpg`、`rules-oasis-390.jpg`、`language-close-390.jpg`。
- 430×932：`hall-430.jpg`、`hall-oasis-430.jpg`、`bazaar-430.jpg`、`oasis-430.jpg`、`super-bazaar-430.jpg`、`super-collected-430.jpg`。

## 发行待验（不可省略）

`readyForSubmission: false`；发行审计 21/27 PASS，6 BLOCK 保留，见 `qa/release-audit.log`、`release-status.json`。

发行方仍需：合法主体与正式法律/支持链接、真实产品 ID、可执行原生 StoreKit/Apple 登录桥、部署生产 PostgreSQL/权威旅程奖励接口、原创图与采样乐器授权核验、iPhone/iPad 真机性能与音乐试听、Sandbox/TestFlight、独立产品/元数据审查。当前无真实下注货币、现金奖、提现；不保证苹果审核通过。
