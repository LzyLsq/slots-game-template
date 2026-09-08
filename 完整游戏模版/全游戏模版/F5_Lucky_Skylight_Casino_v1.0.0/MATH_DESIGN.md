# F5 数学设计

## 公平与可控边界

- `RandomSource` 可注入；生产运行使用安全随机源，固定种子仅用于测试。
- 每次 Spin 在动画开始前生成并冻结；下注只允许配置白名单值。
- 钱包先预扣再幂等结算，异常恢复会退回未结算下注。
- 每款声明目标 RTP、波动等级和最大赢分倍数，结算层执行硬上限。
- 强制结果仅在 localhost 且显式 `debug=1` 时允许。

| 游戏 | 模型 | 功能 | 目标 RTP | 波动 | 最大赢分 |
| --- | --- | --- | ---: | --- | ---: |
| Seven Skylight | 3×3 / 单中线 | 3 张票触发 Orbit Pick | 96.0% | 中 | 2,500× |
| Clover Cash Club | 5×3 / 20 fixed lines | 6 枚 Cash Orb 触发 Hold & Respin | 96.0% | 高 | 10,000× |
| Dice Drift Deluxe | 6×4 / 4096 ways | 3 张 Pass 触发五局 Dice Wild Spins | 96.0% | 中高 | 7,500× |
| Sky Vault Cascade | 6×5 / orthogonal clusters | 最多四段递增 Skyfall Cascade | 96.0% | 中高 | 10,000× |

单元回归覆盖固定种子、非法下注、Wild、Scatter、Bonus、最大赢分、钱包恢复、IAP 幂等和账号隔离。工程校准每款 100,000 局；商业发布前需扩大样本并由目标市场认可的独立数学与合规团队认证。
