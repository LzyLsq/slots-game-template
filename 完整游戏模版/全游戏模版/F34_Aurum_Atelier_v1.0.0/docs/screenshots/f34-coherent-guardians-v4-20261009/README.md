# F34 原画重构与 v4 动作基准 · coherent-v4 · 2026-10-09

对应[整体结构修正记录](../../guardian-coherent-20261009.md)。本目录为新完整原画安装后的实际 Cocos 渲染；旧 v3 图片已标为历史。

当前动作和接触位置已更新：[grounded-v5 画面与录制](../f34-guardian-polish-v5-20261009/README.md)。本目录保留当时的检查基准。

## v4 画面

- [狮子与天鹅实际局部画面](guardian-live-details.png)
- 常规手机比例：[天鹅 390 × 844](pearl-390x844.png)、[狮子 390 × 844](ruby-390x844.png)
- 小屏比例：[天鹅 320 × 568](pearl-320x568.png)、[狮子 320 × 568](ruby-320x568.png)
- 减少动态：[天鹅](pearl-320x568-reduced.png)、[狮子](ruby-320x568-reduced.png)

## 连续过程

- [天鹅待机、期待、庆祝及恢复](motion/pearl-390x844-idle-and-response.webm)
- [狮子待机、期待、庆祝及恢复](motion/ruby-390x844-idle-and-response.webm)
- 小屏完整待机周期：[天鹅](motion/pearl-320x568-idle-cycle.webm)、[狮子](motion/ruby-320x568-idle-cycle.webm)
- 实际运行姿态对比：[天鹅](motion/pearl-motion-review.png)、[狮子](motion/ruby-motion-review.png)
- [最终资源理论极限组装图](motion/source-extreme-assembly.png)：用于检查肩部遮挡；这是图层组装，不是运行截图或动画。

[六例运行结果](runtime-qa.json)记录两种手机比例、DPR 2 与减少动态的检查。响应通过角色组件探针触发，不能作为真实中奖证据。全部使用独立浏览器 context，没有旋转、购买或编辑用户当前存档；测试余额保持 27000，结算状态为 idle。

录制包含截图采集开销，不是性能验收。桌面手机尺寸模拟不替代手机实机检查，本目录也不代表用户或 App Store 已验收。
