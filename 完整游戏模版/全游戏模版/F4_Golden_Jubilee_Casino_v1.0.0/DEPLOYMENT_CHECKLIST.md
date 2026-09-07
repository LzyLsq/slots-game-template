# 上线清单

- [ ] Cocos Creator 3.8.8 Release 构建；关闭 debug、profiler 和 URL force。
- [ ] 设置 `ReleaseConfig.ts` 的真实发行主体、API、客服、隐私、条款和支持 HTTPS URL；`npm run release:audit` 无 BLOCK。
- [ ] App Store Connect 创建四个 Consumable 商品，并用其精确 ID 替换 `StoreService.ts` 中全部 `com.publisher.*`。
- [ ] 接入 `release/NATIVE_STOREKIT_BRIDGE.md` 的 StoreKit 2 桥；验证成功、取消、Ask to Buy/pending、断网重试、重复票据、同步购买、退款和撤销。
- [ ] 使用 `npm run server:production` 的 PostgreSQL 权威 API；禁止线上部署内存型 `server:dev`，禁止线上使用 LocalAuth、本地 Economy 或 Sandbox grant。
- [ ] PostgreSQL 钱包账本、Round、奖励和订单使用事务、行锁与唯一幂等键。
- [ ] Apple JWS 的 x5c 链、Apple Root CA、Bundle ID、环境、商品、账号令牌与交易状态校验使用正式配置；Notifications V2 回调已启用。
- [ ] HTTPS/HSTS/CSP、应用限流已启用；CDN/Ingress 的分布式限流、WAF、日志脱敏、监控、告警和备份恢复完成。
- [ ] 远程 Spin、所有免费奖励、排行榜、昵称/头像/设置、删除账号与钱包同步在弱网和会话过期场景验收。
- [ ] 账号删除、隐私政策、用户协议、未成年人保护、地区限制和客服流程完成。
- [ ] 真机覆盖主流 iOS/Android、安全区、弱网、断网、后台恢复、低内存和低电量。
- [ ] 大样本数学仿真、最大赔付暴露和独立 RNG/数学审查完成；保留配置版本与报告。
- [ ] Sentry/等效错误监控与性能预算启用；发布灰度和回滚方案演练完成。
