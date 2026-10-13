# Golden Library — WebP + 本地内购

双击 DBGame/GoldenLibraryH5.xcodeproj。LocalTest Scheme 模拟支付，不扣真钱；Release Scheme 不绑定测试商品。

Bundle ID：com.xzkj.goldenlibraryh5。Team 模板沿用 DQK6C4RU3Y，实际签名请选择自己的开发团队。最低iOS15.4。原生主体Objective-C，StoreKit2保留Swift。

商品配置见上级 products.csv，必须在对应App Store Connect App创建同名Consumable（含版本后缀），填写价格/本地化/审核截图，完成付费协议、税务和银行资料。参考价格不是线上实际价格。

先同意协议并注册/登录本机账户，游客不能购买。已接交易验证、商品/账户核对、取消/待批准拒绝授币、保存后finish、未完成交易补发及重复交易幂等。无发布方远程验单服务器；Apple付款仍需联网。

昵称/多语言/游戏音乐动画沿用源码。本轮未改变中奖规则。Apple登录原生桥保留，但标准款LocalAuth仍禁用Apple登录，并非已接通，需另行完成认证/能力配置及真机测试。

发布图使用WebP；本次PNG/JPEG转换采用quality85，尺寸不变，透明度逐像素校验，已有WebP不重复压缩。图标1024×1024无透明PNG，由现有主题资源制作，发布前请确认设计。WebP减包体，不等于按比例减运行内存。

本地保存无跨设备同步、云端风控或自动退款扣币；卸载/删存档会丢失账户金币。本地测试不证明真实扣款或商店审核通过。测试结果见上级 本机检查.md。
