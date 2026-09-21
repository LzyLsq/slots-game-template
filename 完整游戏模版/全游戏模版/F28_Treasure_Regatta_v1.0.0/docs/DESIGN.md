# F28 · Treasure Regatta

2026-09-20 · 制作方案，不是完成声明。

## 核心构图

明亮的宝藏帆船码头。四艘财富主题船围绕弯曲码头停泊，大厅入口是场景中的登船踏板，而不是四张悬浮卡片。顶端为轻量船会会员牌和资产，底端为码头服务亭。入口明确标注玩法和 Board，按下踏板下沉、船侧灯响应；拖动取消点击。返回恢复原先的码头位置。

登录是同一港湾的抵达视角；排行是赛舟领奖台；奖励是航海日志及盖章进度；商店是码头补给铺；账户是船员证与航程账本。菜单不是另一套白卡片后台。

## 美术规范

| 角色 | 定义 |
| --- | --- |
| 海湾 | Lagoon `#287F8E`，浅水色用于环境，不用于正文 |
| 贵金属 | Honey gold `#DDA346`，浅暖反射，深琥珀接触阴影 |
| 漆面 | Porcelain `#FFF0CC`，非纯色满屏背景 |
| 活力 | Coral lacquer `#D85E50`，只强调行动和船体细节 |
| 字色 | Ink teal `#183E47`，正文优先清晰 |
| 宝物 | Pearl `#FCE4CC`，符号饱和度高于背景 |

左上太阳主光、水面柔和填充。金属不是黄色塑料，按钮有边缘厚度、接触阴影、凝练高光。标题采用原创图像字；正文拟选清晰圆润无衬线字体，正式接入前核查字体许可证。

最突出的记忆点是可交互的弯曲登船码头，其余功能克制、清楚。避免以 F16 的建筑大厅改色；没有模糊补边或黄色底板。

## 四种独立模式

| ID / 英文名 | 规则 | 柜机和资源方向 |
| --- | --- | --- |
| captain / Captain's Cache | 3×3 中线，从左连续2或3同符，仅付最长组合 | 黄铜罗盘顶饰、珊瑚漆船桥、舵盘式主键 |
| pearl / Pearl Passage | 5×3，243 ways，从左至少3列 | 珍珠贝壳拱顶、奶油漆台面、圆润珍珠主键 |
| cargo / Jewel Cargo | 5×3 五线；6枚货币触发锁定重转 | 翡翠货舱结构、货箱锁扣、嵌入式玉石主键 |
| reef / Reef Riches | 5×5，相邻5枚集群、最多8次连消 | 珊瑚金枝侧饰、拱形舷窗、海蓝玻璃主键 |

每种玩法六个独立符号，不共用同一套换色图。支付倍率与规则由同一份配置导出；不能只有中奖金额而没有获奖格坐标。

### 四套实体控制语言

- Captain：红珊瑚船桥漆面、黄铜舵轮、机械发条和拨杆，动作短促、有航海机械感。
- Pearl：母贝珠宝盒台面、珍珠圆键、贝扇 Auto 与珍珠摇杆，动作柔和、圆润、偏珠宝触感。
- Cargo：翡翠保险柜、锁芯 Spin、机械推杆 Auto 与玉柄 Turbo，动作更沉稳，文字只进入真实珐琅书写区。
- Reef：海蓝水晶与珊瑚包边、水滴加减、流体 Auto 与鱼鳍拨片 Turbo，浅色描边文字保证水晶表面的对比度。

差异不依赖颜色替换：轮廓、材质、功能隐喻、标签安全区、按压方式和控制台构图均分别定义。四套仍共享左上主光、温暖金属边缘和固定触控热区，避免整款游戏失去统一性。

## 动画与状态

### 所有按钮都要有个性

覆盖登录、大厅、柜机、底部导航、账户、商店、奖励、设置、规则及确认弹窗，不仅限于 SPIN。个性来自功能与场景：主键分别是舵轮、珍珠贝、货箱锁和珊瑚宝石；Auto 是发条绞盘，Turbo 是拨杆，加减是短行程黄铜滚轮；登船票、宝箱、领奖台、补给货物、船员证、返港柄、日志、仪表、封印、取消扣、翻页签各司其职。同类动作保持熟悉的形态，不为不同而随机换图。

统一左上光源、象牙珐琅和圆润黄铜。装饰与文字一起产生按压反馈，热区固定；特殊部件各有轻压、回弹、微旋或拨动感。雕刻部件等比缩放，只伸展留白面。文字从完整装饰外缘之后起排；小屏宁可缩短操作名称，也不把长标签挤成难读的小字。危险操作经明确确认，不用夸张装饰诱导误触。

启动预备→加速→匀速→逐轴减速→轻微落位；预先确定结果，动画不决定奖金。按钮图和图标共用视觉容器，热区不随弹性变化。减少动态效果时直接保留状态变化；后台暂停自动旋转，不恢复自动下注。

柜台反光绑定场景，少量错峰闪点；不用全屏币雨掩盖内容。中奖依次突出具体获奖格、说明组合/倍率、递增数字和入账。快速模式仍逐轴落位。

## 当前边界

本地虚拟币规则引擎不是生产服务器或真实支付。发布需要正式鉴权、服务端结算、StoreKit/原生桥、合法文档、签名、设备验证和资源授权清单。
# Button material polish — 2026-09-20

Theme-specific sculpted faces keep their original endcap proportions through native-height nine-slicing. The new `control-lustre` sprite shader supplies a soft, warm reflection within source alpha. It preserves engraved shadows and leaves labels untouched. Each control has a deterministic stagger: a 1.25-second reflection within a 7.5–10.5-second cycle, with an immediate short reflection on valid release. Disabled controls and reduced-motion mode suppress this motion; app background state stops its clock. Touch bounds remain stationary while the complete visual carrier depresses and settles.

This pass deliberately avoids extra glitter nodes, full-button flashing, stretching sculpted fittings, or adding glow rectangles. Per-control materials are destroyed with their targets; the update uses reusable uniform vectors and no per-frame allocations.
