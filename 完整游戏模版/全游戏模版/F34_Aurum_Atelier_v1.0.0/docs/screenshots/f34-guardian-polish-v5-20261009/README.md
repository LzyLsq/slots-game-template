# F34 当前吉祥物动作 · grounded-v5 · 2026-10-09

对应[动作与接触位置修改记录](../../guardian-polish-20261009.md)。沿用 coherent-v4 完整原画，本目录为新动作和接触影的实际 Cocos 渲染。

## 当前画面

- [狮子与天鹅实际局部画面](guardian-live-details.png)
- 常规手机比例：[天鹅 390 × 844](pearl-390x844.png)、[狮子 390 × 844](ruby-390x844.png)
- 小屏比例：[天鹅 320 × 568](pearl-320x568.png)、[狮子 320 × 568](ruby-320x568.png)
- 减少动态：[天鹅](pearl-320x568-reduced.png)、[狮子](ruby-320x568-reduced.png)

## 连续过程

- [天鹅待机、期待、庆祝及恢复](motion/pearl-390x844-idle-and-response.webm)
- [狮子待机、期待、庆祝及恢复](motion/ruby-390x844-idle-and-response.webm)
- 小屏完整待机周期：[天鹅](motion/pearl-320x568-idle-cycle.webm)、[狮子](motion/ruby-320x568-idle-cycle.webm)
- 实际运行姿态对比：[天鹅](motion/pearl-motion-review.png)、[狮子](motion/ruby-motion-review.png)

[运行结果](runtime-qa.json)记录六个比例/动态用例及一次动作中切换 reduced motion。响应在独立 context 中通过角色组件探针触发，不是实际中奖证据。期待/庆祝实际升起并恢复，身体支点、三处接触影及独立珍珠位置固定。

全部检查未旋转、购买或编辑用户当前存档；测试余额保持 27000，结算为 idle。录制和截图存在采集开销，不能作为性能验收；桌面手机尺寸模拟不替代手机实机与平台审核。

[前版同源原画结构和动作证据](../f34-coherent-guardians-v4-20261009/README.md)保留为比较基准。
