# 安全基线

## 已实施

- 本机预览不保存明文密码；本地凭据使用 WebCrypto PBKDF2-SHA-256、独立随机盐和恒定时间比较。
- PostgreSQL 生产服务使用 scrypt、随机盐和部署端 pepper；会话仅通过 `Secure; HttpOnly; SameSite=Strict` Cookie 传递，CSRF token 只保存在运行内存。
- Spin 下注白名单、结果生成、余额扣减/入账和 requestId 幂等由服务器权威流程完成；客户端不能传中奖金额或强制结果。
- 签到、邮件、成就、转盘、交易和 Spin 均在服务端按账号隔离；排行按服务端 Round 聚合，头像和设置同步到账号。
- 损坏或超大本地存档经过白名单迁移；不再把 Storage 当成可信输入。
- Web 模板移除内联脚本、内联事件，使用 CSP；Cocos Creator 3.8.8 的 SystemJS/运行时会动态构造函数，因此 `script-src` 保留 `unsafe-eval` 兼容项，其他脚本和资源仍限制为同源。服务端额外发送 `frame-ancestors 'none'`、nosniff、Referrer-Policy、Permissions-Policy。
- Apple ES256 JWS 与 x5c 证书链由生产服务校验，并核对根证书、Bundle ID、环境、Consumable 类型、商品、数量、撤销状态和 `appAccountToken`。交易 ID 使用数据库唯一约束和事务锁防止重复入账；退款/撤销通知幂等扣除对应剩余金币。
- 正式配置缺少数据库、Apple 验证或商品映射时，生产进程拒绝启动；游客购买被拒绝。进程内基础限流已覆盖认证、Spin、商店和其他 API。

## 上线前必须完成

- 只部署 `PostgresProductionServer.ts`；`ProductionServer.ts` 是无持久化的本机开发服务，不可对公网开放。
- 用迁移工具部署并版本化 `server/postgresql-schema.sql`，演练备份恢复、故障切换、通知重放和钱包账本核对。
- 从 Apple PKI 安全更新信任根，并在 Sandbox/TestFlight/Production 分别使用匹配环境；监控验证失败率和通知积压。
- 使用 KMS/Secret Manager 提供 pepper、数据库凭据和支付密钥；禁止写入仓库或前端。
- 在 CDN/Ingress 强制 HTTPS、分布式限流、WAF、日志脱敏、备份恢复和告警；仅在可信反向代理会覆盖客户端地址时设置 `CSW_TRUST_PROXY=1`。
- 完成依赖审计、渗透测试、隐私评估、年龄分级、地区法律审核以及独立 RNG/数学认证。

若这些外部步骤未完成，不得开启正式付费，也不能宣称已通过监管、数学实验室或安全认证。
