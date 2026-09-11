# GOLDEN JUBILEE CASINO — F4 v1.0.0

## 运行截图

![F4 完整运行截图](../../游戏截图/F4_Golden_Jubilee_Casino.png)

一套原创的 Cocos Creator 3.8.8 竖屏完整 Slots 世界。F4 以“柔和喜庆的财富庆典”为统一世界观，使用 Golden Jubilee 太阳徽章、主持人 Sienna、香槟金、珊瑚红、玉石绿和真实实体柜机工艺。大厅、账户、商店、奖励、排行、加载页与四台柜机共享同一视觉语言，四款游戏则通过玩法、场景、主色、符号和特效形成清晰差异。

## 四个子游戏

- `LUCKY COIN GROVE`：3×3 单中线经典玩法；Golden Ticket 触发 Coin Bloom。
- `TREASURE PARADE`：5×3、20 条固定线；Vault Coin 触发 Lock & Respin。
- `LANTERN FORTUNE`：5×4、1024 Ways；Lucky Seal 触发 Expanding Wild 免费旋转。
- `JUBILEE CASCADE`：6×5 Cluster Pays；连消配合递增金币倍率。

## 成熟产品基线

- 数学与表现分离；安全随机源用于运行，固定种子用于回归。
- Spin 开始前冻结结果，Quick Stop、Turbo、Auto 只改变演出速度，不改变结算。
- 共享虚拟金币钱包，支持正式账号/游客、Apple 消耗型金币包、每日奖励、幸运转盘、成就、邮件、服务端排行榜、头像和设置。
- 1080×1920 设计分辨率；柜机使用 S05/S06 的视觉语法：上方嵌入式余额、独立 WIN/BET、五个实体控制位和主题化图标。
- SPIN 保留原视觉尺寸并使用 196×196 容错点击热区，适合手机拇指操作。
- 逐轴停靠、回弹、镜片扫光、符号弹性、待机光带、分级中奖舞台、金币流与 reduced-motion 降级。
- `server/PostgresProductionServer.ts` 提供 PostgreSQL 持久化的服务器权威 Spin、奖励、排行、资料、Apple 交易验证、退款撤销、会话、CSRF 与幂等结算；`ProductionServer.ts` 只用于本机开发，禁止部署。

## 付费金币边界

- 金币包是 App Store Connect 中的 **Consumable In-App Purchase**，正式价格只读取 StoreKit 本地化价格。
- 客户端购买成功不会直接加币；Apple 签名交易必须提交给已登录的生产服务，核对证书链、Bundle ID、环境、商品 ID、`appAccountToken` 与交易状态后，才由 PostgreSQL 钱包事务入账。
- Apple transaction ID、Round requestId、奖励领取和通知 UUID 均有服务端幂等约束。只有服务器确认成功后才 `finish()` StoreKit 交易，网络中断会保留未完成交易供下次同步。
- 仅 `localhost/127.0.0.1 + debug=1` 可使用 Sandbox 模拟购买。普通 Web 预览和正式构建均不能在本地直接发放付费金币。
- 金币无现金价值、不可提现、不可转让、不可兑换奖品；购买不会提高胜率或改变 RTP。

## 验证

```bash
npm ci
npm run typecheck
npm run typecheck:math
npm run typecheck:server
npm test
npm run test:rtp -- 100000
npm run release:audit
```

`release:audit` 在发行主体、公共 HTTPS 法律链接、正式商品 ID 或法律文本仍为占位内容时会阻断发布。原生 StoreKit 2 桥接见 `release/NATIVE_STOREKIT_BRIDGE.md`。本产品只允许购买无现金价值的娱乐型虚拟金币；如果未来加入提现、可转让价值或现实奖品，就会变成完全不同的受监管产品，不能沿用当前发布方案。
