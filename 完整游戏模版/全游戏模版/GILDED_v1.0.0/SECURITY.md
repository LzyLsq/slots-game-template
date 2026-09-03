# 安全基线

## 已实施

- 浏览器 Demo 不再保存明文密码；本地凭据使用 WebCrypto PBKDF2-SHA-256、独立随机盐和恒定时间比较。
- 线上参考服务使用 scrypt、随机盐和部署端 pepper；会话仅通过 `HttpOnly; SameSite=Strict` Cookie 传递，CSRF token 只保存在内存。
- Spin 下注白名单、结果生成、余额扣减/入账和 requestId 幂等由服务器权威流程完成；客户端不能传中奖金额或强制结果。
- 签到、邮件、成就、转盘、交易和待结算 Spin 均按账号隔离。
- 损坏或超大本地存档经过白名单迁移；不再把 Storage 当成可信输入。
- Web 模板移除内联脚本、内联事件，使用 CSP；Cocos Creator 3.8.8 的 SystemJS/运行时会动态构造函数，因此 `script-src` 保留 `unsafe-eval` 兼容项，其他脚本和资源仍限制为同源。服务端额外发送 `frame-ancestors 'none'`、nosniff、Referrer-Policy、Permissions-Policy。
- 线上票据验证未配置时返回 501 且不加币；游客商店加币被拒绝。

## 上线前必须完成

- 将参考服务的内存 Repository 替换为 PostgreSQL/云数据库实现，并用 `server/postgresql-schema.sql` 建立唯一约束和账本表。
- 在数据库事务中锁定钱包行，保证扣注、Round、入账与幂等记录同事务提交。
- 接入 Apple/Google/渠道服务器票据校验，校验 bundle、product、transaction、金额、币种和重复订单。
- 使用 KMS/Secret Manager 提供 pepper、数据库凭据和支付密钥；禁止写入仓库或前端。
- 在 CDN/Ingress 强制 HTTPS、HSTS、限流、WAF、日志脱敏、备份恢复和告警。
- 完成依赖审计、渗透测试、隐私评估、年龄分级、地区法律审核以及独立 RNG/数学认证。

若这些外部步骤未完成，只能作为虚拟金币 Demo 发布，不能宣称真实付费或监管认证。
