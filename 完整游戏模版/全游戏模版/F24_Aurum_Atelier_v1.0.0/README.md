# F24 · Aurum Atelier · 黄金工坊

Cocos Creator 3.8.8 游戏模板。以铸币、宝石切割、金链工艺、金库为主题，使用金色、象牙白与深松绿。默认英语，支持简体中文、繁体中文、日语和韩语。

当前交付是可构建的浏览器游戏项目；**不是已签名、已审核或可立即提交的 iOS 发行包**。发行阻塞项见 [RELEASE_GATES](docs/RELEASE_GATES.md)。

## 运行

```sh
npm install
npm run typecheck
npm test
/Applications/CocosCreator.app/Contents/MacOS/CocosCreator --project "$PWD" --build "configPath=$PWD/tools/web-mobile-release-build.json"
python3 tools/preview_server.py --port 5424
```

预览地址：`http://127.0.0.1:5424/`。调试可用 `?debug=1&screen=home`；调试配置不能作为发行配置。

## 四个柜机

| 柜机 | 基础规则 |
|---|---|
| Sovereign Mint | 3×3，五条固定中奖线 |
| Prism Cut | 5×4，1024 ways |
| Gilded Links | 5×3，金币收集规则 |
| Masterwork Vault | 6×5，六个起算的相邻连簇消除 |

实际结算与精确触发条件以 [F24_GAMEPLAY](docs/F24_GAMEPLAY.md)、游戏内规则和可重复测试为准。转轴停靠、真实中奖反馈、消除、减少动态效果与大奖演出记录在 [F24_MOTION](docs/F24_MOTION.md)。收藏进度、奖励、账户、邮件等功能应以当前构建逐项验收；不会用 F23 截图充当 F24 成品证据。

## 发布

- 使用独立候选 Bundle ID `com.publisher.aurumatelier`；仍需发行方在 Apple 开发者账户注册或替换为其真实命名空间。
- 原生构建配置：[release/ios-release-build.json](release/ios-release-build.json)。`tools/ios-preview-build.json` 也已同步 F24 身份；两者均未包含发行签名。
- 金币包为 20,000 / 110,000 / 240,000 / 520,000 总金币；商店发行价格必须来自 StoreKit。源码测试价格不是实际出售价格。
- 真实内购需要原生桥接、服务器验证与 Sandbox/TestFlight 验收。未接通不能模拟真实购买到账。
- 排名可包含清楚标注的演示角色，不能把本机或模拟数据宣传为真实在线玩家。
- 金币没有现金价值、不能提现。不得附加实物或现金奖品而继续沿用本模板的发布说明。

执行 `node release/check-gates.cjs` 查看 F24 发布阻塞项。`npm run release:audit` 已接入 F24 状态文件，缺失或损坏的状态会报告 BLOCK；上线前两个检查都必须完成。完整操作顺序见 [release/README](release/README.md)。

## 当前版本截图

[查看大厅、四个柜机和中奖演出截图](docs/screenshots/release/README.md)（2026-09-18）。

![大厅](docs/screenshots/release/01-lobby.png)

本次上传前已通过 `npm test`；类型检查、Web 构建及四柜机视觉回归检查亦已完成。浏览器截图不等同于 iPhone 真机验收。
