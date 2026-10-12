# F15 奖励演出主题样式验收 · 2026-10-09

## 范围

仅修改 F15 Honey Parade 的四个柜机奖励演出。本轮未修改其他游戏，未提交或推送 Git。

- 蜂蜜柜机：蜂巢纹样、金匾、蜜蜂与蜜罐端饰。
- 桃花柜机：曲面花饰牌、桃花与桃果端饰。
- 锦鲤柜机：碧玉色水纹牌、锦鲤与莲花端饰。
- 狐狸柜机：红金折角庆典卷轴、折扇与灯笼端饰。
- 大奖标题、说明、金额、领取按钮与普通小奖框均使用专用主题渲染。

复用现有符号图集，边框与纹样由 Cocos Graphics 在面板创建时绘制；没有新增大型奖励图片。通用 UI 面板、中奖档位规则、概率、金额、演出时长、账户、内购和原生 Bridge 均未改动。

## 文件

- `assets/scripts/ui/RewardTheme.ts`：四主题配色、图案映射与文字安全区。
- `assets/scripts/ui/SalonArt.ts`：独立奖励牌匾、主题纹饰与稳定领取点击区。
- `assets/scripts/vfx/SalonWinStage.ts`：大奖演出接入主题牌匾。
- `assets/scripts/vfx/OrdinaryWinStage.ts`：小奖主题框。
- `assets/scripts/ui/AureliaApp.ts`：传入柜机主题，以及仅本机 debug 模式可用的无结算样式预览。
- `tools/reward-theme-test.ts`、`tools/reward-stage-test.mjs`：主题映射和 Cocos mock 合约测试。

上述路径相对 `完整游戏模版/全游戏模版/F15_Honey_Parade_v1.0.0`。

## 验证结果

- TypeScript 类型检查：通过。
- 完整 `npm test`：通过（数学、Apple 身份校验、排行榜、布局、核心玩法、柜机及奖励测试）。修正本地预览档位映射后另行重跑类型检查和奖励测试，也通过。
- 奖励 mock 合约测试：使用真实 `WIN_TIERS` 检查四主题 × 四档位；检查 20 个小奖语言组合、精确金额、两步领取、事件隔离、无逐帧新增节点和销毁完成。该测试不等同于真实设备性能测试。
- Cocos Web Mobile 最终重建与 WebP 压缩：通过。
- 原生壳本地资源服务测试：通过。
- Xcode 禁签名 iOS Simulator 编译：通过。未宣称完成真机测试或 App Store 发布验证。
- H5 与原生壳资源逐文件 SHA-256 比较：241 个构建文件一致。

最终构建日志：`/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.lkIUGC/`。

最终原生验证日志：`/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-native.tlmhoa/`。

## 实际浏览器验收

使用真实 Cocos WebGL 构建，在本机独立样式预览中检查：

- 四个主题的大型奖励框，390 × 844。
- 蜂蜜大奖、桃花巨奖以及四主题小奖框，320 × 568。
- 桃花奖励的领取按钮点击后正常关闭演出，回到柜机。
- 奖励标题、说明与金额居中，端饰避开文字区；小奖不覆盖转轴及操作按钮。
- 本地预览不转轴、不结算、不写钱包、不调用内购；页面明示 `LOCAL STYLE PREVIEW · NO COINS CREDITED`。正式游戏中奖仍按原流程执行。
- 临时浏览器尺寸已恢复，临时验收页已关闭，原 F15 预览入口已刷新。

截图保存在本目录；`f15-reward-themes-overview.png` 是四张真实验收截图的缩放拼接图。

## 同步位置

源构建：`完整游戏模版/全游戏模版/F15_Honey_Parade_v1.0.0/build/web-mobile`。

壳内资源：`Xcode_H5/F13-F21_20260914/F15_Honey_Parade_OC_StoreKit2_Xcode/F15_H5`。

Xcode 工程：`Xcode_H5/F13-F21_20260914/F15_Honey_Parade_OC_StoreKit2_Xcode/DBGame/HoneyParadeH5.xcodeproj`。
