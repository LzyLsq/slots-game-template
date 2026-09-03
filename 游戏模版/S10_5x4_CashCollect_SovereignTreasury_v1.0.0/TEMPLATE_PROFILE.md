# S10 · Sovereign Treasury 5×4 Cash Collect Slot

## 模板身份

- 模板编号：`S10`
- 版本：`1.0.0`
- 状态：`GOLD_MASTER`
- 固化日期：`2026-09-03`
- 中文名：`至尊金库 5×4 金币收集 Slot`
- 英文名：`Sovereign Treasury 5×4 Cash Collect Slot`
- Cocos Creator：`3.8.8`
- 设计分辨率：`750 × 1624` 竖屏

## 核心玩法

- 5×4 转轴、1024 Ways、左侧连续相邻匹配
- 前四轴 Cash Coin 携带可见倍率
- 第五轴 Collector Chest 收集全部 Cash Coin
- 双 Collector 对全部收集奖励翻倍
- Vault Wild 替代所有常规珠宝符号

## 视觉与交互基线

- CC Switch 生成的机柜图全屏覆盖；实时 UI 必须继续与机柜凹槽对齐
- 禁止黑色阴影框、绿色残边、透明矩形烘底和过曝白闪
- 品牌加载页只能显示一次，进度条与百分比同步
- 转轴必须有位移、形变、透明过渡、逐轴停靠和机械回弹
- 所有按钮必须可用，并有按压缩放与微粒子反馈
- 规则和充值弹层在 390 px 宽竖屏上保持高对比清晰文字

## 不属于本模板的玩法

- 固定支付线
- Hold & Win 锁定重转
- Cluster Pays / Cascade
- 转盘奖励
- Megaways
