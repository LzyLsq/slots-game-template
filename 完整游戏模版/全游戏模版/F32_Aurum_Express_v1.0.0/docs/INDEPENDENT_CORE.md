# F32 四柜机独立结算

`assets/scripts/math/IndependentCore.ts` 选择四种基础中奖算法：243 WAYS、相邻簇、任意位置同符号成组、固定赔付线。`CabinetProfiles.ts` 和 `SignatureFeature.ts` 提供相应的 WILD 上升、中奖格炼金、五次免费回合与瀑布式下落。各柜机配置从 `GameConfigs.ts` 经 `independentCabinet()` 生成，不可使用构建前的旧盘面字段推断实际尺寸。

`ResultGenerator.ts` 负责生成盘面、派彩与上限，`RoundAwards.ts` 负责小数奖励在整局结算时归整。迎宾保证奖在单独的首次局数逻辑中处理。客户端动画不决定服务端实际结算；生产使用服务端权威回合和持久化的幂等请求。`npm test` 覆盖固定赢/输盘面、每柜机 3,000 局基本一致性、特色回合、上限、迎宾保证和持久化。

本项目完成的是 Web Mobile 可运行模板。自然 RTP 为随机模拟的估计，不是认证承诺；生产安全、原生 StoreKit / Apple 登录、退单恢复与真机适配仍属于发行阻断。详情见 `QA.md`、`f32-release-status.json`。
