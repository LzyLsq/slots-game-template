# F32 · Aurum Express · 鎏金财富列车

基于 **Cocos Creator 3.8.8** 的竖屏虚拟金币游戏模板：装饰艺术风格列车、雕刻黄铜与翡翠柜机、轮盘车厢、财富兑换台和四种独立结算模式。金币没有现金价值，不可提现。本项目是可运行的 **Web Mobile 模板**，不是已验收的 iOS 发行包。

## 可玩的内容

- 加载、登录/注册、访客资格确认、**列车站台中的实体财宝调度台（双轮切换四路、选定后直接进入柜机，局部按压反馈和方向滑动）**、账户、排行、每日奖励、商店预览、五语言界面与规则页。
- 四款柜机：**Roulette Rail**（5×3，243 ways）、**Golden Sleeper**（6×5，相邻连片）、**High Roller**（6×5，任意位置成组）、**Jackpot Engine**（5×3，固定赔付线）。兼容存档的内部 ID 为 `coin-carousel`、`lantern-vault`、`lucky-parade`、`celestial-mint`。
- SPIN、加减注、MAX、AUTO、声音、返回、规则、奖励领取和账户操作；普通、大、超级奖有分档演出。新账户前五次**成功结算**的旋转至少一次 50× 或以上的迎宾超级奖；失败或取消的旋转不计入次数。迎宾规则不属于自然 RTP。
- Web 本地预览不执行假支付；没有原生桥接时商店明确显示不可购买。交易验证、幂等和存档代码是集成接口，不代表已连接真实 App Store。

## 启动与验收

```sh
npm ci
npm run typecheck
npm run typecheck:server
npm test
npm run test:rtp
npm run release:audit  # 发行未就绪时预期非零退出，逐项报告 BLOCK
```

用 Cocos Creator 3.8.8 打开本目录，再按 `tools/web-mobile-release-build.json` 构建。已缓存页面免重复加载过场；首次资源加载保留场景遮罩与平滑揭幕。当前预览指向 `build/web-mobile`，地址 **http://127.0.0.1:5034/**。调试页面仅在 localhost 且 `debug=1` 时生效，例如 `?debug=1&screen=game&game=coin-carousel`。与 F31 的 5032 服务互不覆盖。

**构建工具边界**：本机 CLI 日志出现 `build Task (web-mobile) Finished` 且网页产物存在，但 Cocos 启动器退出码 36；不能写为零错误构建。浏览器截图和测试记录见 [docs/QA.md](docs/QA.md)，美术来源和复用边界见 [docs/ART_PROVENANCE.md](docs/ART_PROVENANCE.md)。

## 四款游戏独立打包（准备工具，不等于可提交）

可分别制作四个**单游戏源码工程**，默认大厅只展示当前游戏，客户端和配套服务端都限制结算到该游戏，商品命名空间与 iOS Bundle ID 各自独立：

```sh
node tools/prepare-standalone.mjs --game coin-carousel --out /absolute/path/roulette-rail
node tools/prepare-standalone.mjs --game lantern-vault --out /absolute/path/golden-sleeper
node tools/prepare-standalone.mjs --game lucky-parade --out /absolute/path/high-roller
node tools/prepare-standalone.mjs --game celestial-mint --out /absolute/path/jackpot-engine
```

`--out` 必须是尚不存在的绝对路径；工具不会改动当前合集工程。分别用 Cocos Creator 3.8.8 打开输出项目，使用其 `tools/ios-preview-build.json`，并逐款进行构建、真机/Sandbox/TestFlight 验收。生成的 `com.publisher.*` 只是占位 ID，不能直接提交。四个产品虽然玩法与柜机图不同，仍共享底层品牌和界面；是否构成 Apple [App Review Guidelines 4.3](https://developer.apple.com/app-store/review/guidelines/) 所说的相似应用，只能由发行方做差异化审查并最终由 Apple 判断，不保证独立上架。虚拟币不得提现，亦不得与真钱博彩混同。

## 发行阻断

`docs/f32-release-status.json` 记录尚未完成的发行事项：真实发行主体与法律 URL、生产域名/密钥/数据库、App Store Connect 商品和价格、原生 StoreKit 2 与 Apple 登录桥接、Sandbox/TestFlight/真机性能及退款恢复验收。示例商品 ID `com.publisher.aurumexpress.f32.*` 不是已创建的真实商品。**不得据此宣称已可上架**。
