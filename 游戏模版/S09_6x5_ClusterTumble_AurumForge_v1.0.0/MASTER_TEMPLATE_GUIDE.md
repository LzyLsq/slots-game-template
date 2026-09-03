# S09 · 6×5 Cluster Tumble Slots 生产指南

S09 是“6×5 Cluster Pays + 连锁掉落 + 递增倍率 + 能量奖励 + 免费旋转”母模板，Aurum Forge 是已组装的香槟金/祖母绿铸造厂产品。

## 共用内核

- 6×5 网格，正交相邻的 5+ 同 Symbol 计算 Cluster
- 中奖消除、弹性掉落、补位和连锁重算
- `1× / 2× / 3× / 5× / 8×` 连锁倍率
- WILD / SCATTER / BONUS 三种特殊类型
- Forge Energy 、免费旋转和熔炉奖励
- 投注、余额、AUTO/STOP、SOUND、RULES、HOME 和演示充值

## 生成新主题

```bash
npm run theme:new -- ocean-mint \
  --title="OCEAN MINT" \
  --subtitle="PEARL CLUSTER TUMBLE" \
  --from=aurum-forge
```

新主题至少需要：

- 1 张竖屏机柜图，预留标题、余额、6×5 屏幕、能量条和物理控制位
- 6 个普通 Symbol，以及 WILD、SCATTER、BONUS
- HOME、SOUND、RULES、ADD CREDITS、AUTO、SPIN 透明图片按钮
- 1 张中央留白的透明获奖舞台

更换机柜后必须重新对齐网格、Forge Energy 和控制台，不能只替换背景。

## 验收

1. `npm run theme:validate` 通过，Cocos Web Mobile 构建完成。
2. 30 个 Symbol 格全部在机柜屏幕内，图像不拉伸。
3. SPIN 扣款，AUTO 可停止，BET 变更，SOUND/RULES/充值/HOME 真实可用。
4. Cluster 高亮、掉落、补位和连锁倍率表现流畅。
5. 加载和获奖画面无黑色矩形边缘、绿色残边或过曝白闪。
6. 截图来自真实 390×844 竖屏运行页面。
