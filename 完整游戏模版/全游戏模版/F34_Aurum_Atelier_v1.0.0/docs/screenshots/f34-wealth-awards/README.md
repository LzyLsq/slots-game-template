# F34 当前财富演出截图

2026-09-30，版本 `f34-wealth-awards-final`。截图来自最新 Cocos web-mobile 构建；手机模拟 DPR 2。图片反映演出构图，连续过程另附录制。

## 四主题大奖

- [Coin · BIG · 390×844](golden-hour-big-390x844.png)
- [Sapphire · BIG · 390×844](jade-treasury-big-390x844.png)
- [Pearl · BIG · 390×844](pearl-palace-big-390x844.png)
- [Crown · BIG · 390×844](ruby-revel-big-390x844.png)
- [四主题 BIG 与普通奖对照](four-themes-awards-overview.jpg)

## 保留的高奖级与小屏

- [Coin · SUPER · 320×568](golden-hour-super-320x568.png)
- [Sapphire · MEGA · 320×568](jade-treasury-mega-320x568.png)
- [Pearl · SUPER · 390×844](pearl-palace-super-390x844.png)
- [Crown · EPIC · 320×568](ruby-revel-epic-320x568.png)
- [Pearl · BIG · reduced motion · 320×568](pearl-palace-big-320x568-reduced.png)

## 普通奖与返回

- [Sapphire · 普通奖](jade-treasury-ordinary-320x568.png)
- [Pearl · 普通奖](pearl-palace-ordinary-320x568.png)
- [Crown · 普通奖](ruby-revel-ordinary-320x568.png)
- [Coin · 等额返还演出边界](golden-hour-equal-return-320x568.png)
- 每个大奖案例的 `*-returned.png` 是关闭演出后的柜机，检查文字、按钮和吉祥物恢复。

## 连续过程与证据

- [Pearl SUPER 完整录制](motion/pearl-super-complete.webm)
- [录制时间序列](motion/pearl-super-timeline.jpg)
- [13 个运行案例](runtime-qa.json)
- [实现及验证说明](../../wealth-awards-20260930.md)

四主题 BIG 和三个低额普通奖通过确定性随机种子产生，种子仅用于临时测试上下文。高奖级使用标记的调试 bonus；等额 Coin 案例仅验证演出边界且不发币。所有 fixture 都不改变正式随机源，不作为自然中奖频率证明。桌面手机模拟不替代真机验收。
