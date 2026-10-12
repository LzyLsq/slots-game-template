# F27 · Sovereign Wealth

原创皇家财富主题传统 slot 完整游戏模板。四个模式分别采用 3×3 paylines、5×4 ways、6×5 cluster cascade、5×3 paylines + bonus wheel；共享安全余额与服务页面，但规则、符号、柜机、加载场景和反馈均独立。

## 运行

```bash
npm run dev
```

调试入口：`?debug=1`。可追加 `&screen=game&game=royal-mint` 直接进入模式。

## 检查

```bash
npm test
npm run build
```

独立性说明见 `docs/INDEPENDENCE_MATRIX.md`，发布门槛见 `docs/RELEASE_GATES.md`。本地构建与浏览器测试不代表 Apple 审核、真机签名、StoreKit 或正式服务已完成。
