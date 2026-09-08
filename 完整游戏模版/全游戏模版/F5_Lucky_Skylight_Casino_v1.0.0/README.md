# LUCKY SKYLIGHT CASINO — F5 v1.0.0

原创 Cocos Creator 3.8.8 竖屏完整 Slots 模板。F5 的统一世界观是明亮、柔和的金色天光赌场中庭：香槟黄铜、奶油皮革、天青磨砂玻璃和杏桃灯光构成成熟商业质感；金币、筹码与骰子沿“财富星轨”缓慢公转，贯穿登录、加载、大厅、商城、账户和大奖演出。

## 四款独立游戏

- `SEVEN SKYLIGHT`：3×3 单中线经典玩法；3 张 Orbit Ticket 触发财富星轨 Pick Bonus。
- `CLOVER CASH CLUB`：5×3、20 条固定线；6 枚 Cash Orb 触发 Lock & Respin。
- `DICE DRIFT DELUXE`：6×4、4096 Ways；3 张 Deluxe Pass 触发五局 Rolling Dice Wild 免费旋转。
- `SKY VAULT CASCADE`：6×5 Cluster Pays；中奖后可进入最多四段递增倍率 Skyfall Cascade。

## 商业模板基线

- 数学与表现分离；生产使用安全随机源，测试使用固定种子。
- Spin 动画前冻结结果，Quick Stop、Turbo、Auto 只改变演出，不改变结算。
- 共享虚拟金币钱包，完整登录/注册/游客、商城、奖励、排行、头像、账户、法律页与 Apple Consumable IAP 边界。
- PostgreSQL 权威服务端负责 Spin、奖励、排行、交易验证、退款、会话、CSRF 和幂等结算。
- 1080×1920 竖屏设计，适配安全区；余额位于转轴上方，带金币图标与充值入口；WIN/BET 按柜机结构独立定位。
- 逐轴停靠、回弹、转动光带、镜片反光、符号待机弹性、Spin 星轨、金币雨与多层大奖舞台；支持 reduced-motion 降级。
- SPIN 视觉按钮与扩大后的逻辑热区分离，避免手机端偶发点按无效。

## 验证

```bash
npm ci
npm run typecheck
npm run typecheck:server
npm test
npm run test:rtp
npm run release:audit
```

`release:audit` 会在发行主体、HTTPS 法律链接、正式商品 ID 或法律占位文本未配置时阻断发布。虚拟金币无现金价值、不可提现、不可转让；购买不改变 RTP。
