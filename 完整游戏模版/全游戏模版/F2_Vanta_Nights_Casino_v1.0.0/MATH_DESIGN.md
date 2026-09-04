# F2 MATH DESIGN

## 公平与可控边界

- RNG 通过 `RandomSource` 注入；生产使用安全随机源，测试使用固定种子。
- Spin 开始前一次性生成并冻结结果；动画、Quick Stop、Turbo、Auto 不参与概率计算。
- 所有下注只能取配置白名单；钱包先预扣、后幂等结算，异常可恢复。
- 每个模式均声明目标 RTP、波动等级和最大赢分倍数，结算层执行硬上限。
- Debug 强制结果仅限 localhost 且必须显式 `debug=1`。

## 模式模型

| 模式 | 基础模型 | Bonus | 目标 RTP | 波动 | 最大赢分 |
| --- | --- | --- | ---: | --- | ---: |
| Crimson Roulette | 5×3 / 20 fixed lines | 轮盘概率奖（含 0×） | 96.0% | 中 | 5,000× |
| Sapphire Surge | 6×4 / 4096 ways | 最多 3 次连消、递增倍率 | 96.0% | 中高 | 8,000× |
| Emerald Dice Club | 6×5 / orthogonal clusters | 三骰倍率阶梯 | 96.0% | 高 | 10,000× |
| Amethyst Jackpot | 5×3 / 20 fixed lines | Hold & Respin | 96.0% | 高 | 10,000× |

## 验证标准

- 单元测试：网格边界、固定种子复现、非法下注拒绝、Wild/Scatter/Bonus 边界、最大赢分上限。
- 批量模拟：每款至少 100,000 spins；报告 RTP、基础/功能 RTP、命中率、功能频率和最大样本赢分。
- 发布阶段应扩大到至少 10,000,000 spins，并由独立数学/合规团队校验转轴条与理论 RTP。

本项目中的 96% 是工程目标和模拟校准值，不等同于外部实验室认证值。
