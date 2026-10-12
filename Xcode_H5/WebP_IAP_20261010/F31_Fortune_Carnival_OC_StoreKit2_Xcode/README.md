# Fortune Carnival — WebP + iOS 本地内购

双击 DBGame/FortuneCarnivalH5.xcodeproj。选择 FortuneCarnival-LocalTest 运行可模拟购买，不扣真钱；FortuneCarnival-Release 不绑定本地测试商品。

Bundle ID：com.xzkj.fortunecarnivalh5；开发团队沿用 DQK6C4RU3Y（换账号需在 Signing & Capabilities 改 Team）。最低 iOS 15.4。原生主体为 Objective-C，StoreKit 2 后端为 Swift。

图片以 WebP 发布，保持尺寸和透明度；App 图标保持不透明 PNG。主题图标由现有主题资源裁切，请发布前确认设计。

商品配置见上级 products.csv / manifest.json。需在对应 App Store Connect App 下创建 Consumable 商品，完整 ID 不可自行省略版本后缀。当前商品与历史商品保留独立数量；原生只接受该款白名单和匹配账户的 Apple 已验证交易。保存金币与交易 ID 后才 finish，未完成交易可重试，不会将已消耗金币无限恢复。

无远程验证服务器。卸载、清数据或手动重置存档可能丢失本地账户和金币；无跨设备同步、服务端风控或自动退款扣币。本地 StoreKit 测试不证明真实扣款、沙盒登录或商店审核通过。
