# F26 iOS 本地原生工程状态

验证日期：2026-09-18。此工程可离线运行，尚不构成可提交 App Store 的商业发行版本。

## 已完成

- `ios/FortuneTides.xcodeproj`：真实 UIKit + WKWebView 工程，无第三方原生依赖，iPhone 竖屏，最低 iOS 17。
- `ios/FortuneTides/Web/`：完整打包的静态游戏、ES modules、图片；通过 `fortune://game` 自定义资源协议读取，完全不依赖开发服务器。拒绝外部导航，限定资源目录。
- 原生安全区、持久化 WKWebsiteDataStore、进入后台暂停媒体并通知网页 visibilitychange、返回前台恢复、WebContent 进程终止后重新载入。
- 正常加载和错误状态。应用图标复用项目现有罗盘图形。
- 真实 StoreKit 2 商品查询桥：`webkit.messageHandlers.fortuneStore.postMessage({action:'products'})`，返回 Apple 的本地化名称和价格；仅允许主页面来源调用。
- 支付桥的 `status` 明确返回 `purchasesEnabled:false`，`purchase` / `restore` 返回 `unavailable/nativeLedgerNotIntegrated`。空商品配置返回 `notConfigured`，未伪造价格、购买成功或发币。

## 本机验证与证据

- Xcode 26.3（17C529）。
- iPhone 17 Pro / iOS 26.3 和 iPhone 11（414×896）/ iOS 18.4 模拟器均已安装并实际运行。
- 最终网页资源已同步。两台设备均通过四玩法、5项投注弹窗（点击选择200并关闭，选项高度≥44）、每局返回大厅、杀进程重启金币/局数恢复、转动中切系统设置再回游戏且不重复结算检查。证据：`ios/evidence/iphone17pro-final/`、`ios/evidence/iphone11-final-fixed/`。
- 已修复 Xcode 26 Swift WebKit overlay 导致旧系统缺少 libswiftWebKit.dylib 的调试构建启动崩溃：诊断脚本改调同一公开 Objective-C completion API；iOS 18.4 实际启动与全套回归通过。
- Debug 模拟器编译成功：`ios/evidence/build-simulator.log`。
- Release arm64 真机目标无签名编译成功：`ios/evidence/build-device-unsigned.log`。无签名构建不是可安装真机包、签名 IPA 或商店提交包。
- 首屏原生运行证据：`ios/evidence/iphone17pro-launch.png`。
- 原生 WKWebView 启动检查：13 个按钮、四个游戏入口、全部图片加载完成，无 JavaScript 求值错误。见 `ios/evidence/simulator-smoke.log`。
- 原生 gameplay smoke 已实际通过：mint、pearl、reef、beacon 各一局，四局均完成；localStorage 与 StoreKit 禁用状态断言通过。日志含 `F26_GAMEPLAY_SMOKE success({"passed":true,...})`。
- Debug 可使用 `--native-smoke` 运行真实 WKWebView 内四种玩法各一局、金币有限值、局数计数、localStorage 写入读取、StoreKit 桥不可支付状态检查。此测试会修改该模拟器的本地存档；不要用于已有重要存档。

## 构建和运行

在项目根目录运行：

```sh
./ios/scripts/build-simulator.sh
open ios/FortuneTides.xcodeproj
```

在 Xcode 选择 FortuneTides scheme 和一个 iPhone 模拟器，Run。
修改网页后必须先执行 `./ios/scripts/sync-web.sh`；工程直接打包同步后的资源，不联网下载。

命令行安装与诊断（使用 `xcrun simctl list devices available` 查得实际设备 UUID）：

```sh
xcrun simctl boot <DEVICE_UUID>
xcrun simctl install <DEVICE_UUID> ios/build/Build/Products/Debug-iphonesimulator/FortuneTides.app
xcrun simctl launch <DEVICE_UUID> local.f26.fortunetides --native-smoke
xcrun simctl spawn <DEVICE_UUID> log show --last 3m --predicate 'eventMessage CONTAINS "F26_"' --style compact
```

## 商业发行仍需完成

1. **签名身份与应用登记**：目前 `local.f26.fortunetides` 仅为本地测试标识，`DEVELOPMENT_TEAM` 留空。虽然机器上存在开发/分发证书，未选用或推定其拥有者属于本项目；尚未配置项目专用 Bundle ID、provisioning profile、App Store Connect 记录。未导出任何私钥或凭证。
2. **内购配置**：在 Info.plist 添加开发者实际登记的 `FortuneProductIdentifiers` 字符串数组后，当前桥可读取真实商品。网页现有商店仍为不可购买目录；尚未接入桥展示真实价格。
3. **交易与金币账本**：需要实现 StoreKit 2 `Product.purchase()`、验证 `VerificationResult`、持久化唯一 transaction ID 与发币原子提交、监听 `Transaction.updates`、补偿未完成交易，并确保网页钱包以原生/服务端权威账本为准后再 `finish()`。目前网页金币保存在 localStorage，不能把“收到客户端购买成功消息”直接当作可靠发币依据。还需测试取消、pending、失败、重复投递、杀进程后补单。未执行真实扣款，也无真实支付验证记录。
4. **真机与业务验收**：需要真实设备触控、音频/后台恢复、低内存恢复、持久存档回归，及 TestFlight。当前证据覆盖模拟器启动和本地运行，不等于这些项目完成。
5. **商店材料和配置**：需运营方确定年龄分级、模拟博彩披露、隐私政策/支持地址、数据使用说明、应用描述、截图和地区。未替运营方虚构内容或提交审核。
6. **视觉验收**：最初的星芒和信封缺字已修复。最终原生游戏截图仍发现声音按钮的 `♫` 显示缺字框；需网页 UI 层改成 CSS/图片或不依赖该字形的标签后重新同步。不能以网页浏览器截图代替原生截图。

## 下一步优先级

先完成原生截图暴露的缺字和实际设备布局，再把商品目录与真实 StoreKit 商品查询接通；实现可靠交易账本后才开启购买。签名、商店登记与沙盒账号就绪后执行完整内购测试和 TestFlight 验收。

## 可重复原生验收

```sh
./ios/scripts/acceptance.sh 1821DD65-D054-4030-9280-00C8FECA9B5F iphone11-final
./ios/scripts/acceptance.sh 5A5CBB9D-356D-4F09-92D4-0E168D8FC3B0 iphone17pro-final
```

脚本要求模拟器已启动，使用现有 Debug 构建并修改测试存档；记录同一应用进程日志，保存大厅及后台返回后的机台截图。测试通过不代表真实触屏覆盖、真机验收或上架审核通过。

## 最终声音图形复验

2026-09-18：将游戏声音按钮的 Unicode 音符替换为内联 SVG，重新同步并构建原生资源；iPhone 11 / iOS 18.4 再次通过四玩法、投注弹窗、返回、进程重启存档及旋转中后台恢复。`ios/evidence/iphone11-sound-fixed/resumed-game.png` 已人工检查，声音图形无缺字，中奖格与金额正常显示。日志和截图保存在同目录。
