# F34 吉祥物整体结构修正 · 2026-10-09

当前动作与接触影已在 [grounded-v5](guardian-polish-20261009.md) 继续打磨。本记录保留 v4 原画重构、同源肩部结构和当时的动作验证；下列 v4 截图和动作范围不代表 v5 的实测动作。

当前角色版本为 **coherent-v4**。此前 v3 虽然通过运行检查，仍存在不自然的姿态和连接，已被本轮替换；运行通过不能替代美术验收。本记录说明实际修改与检查，不代表用户已认可或已完成 App Store 验收。

## 修正原因与结果

- 狮子：v3 新身体与旧活动前爪结合，肩部与身体姿势不一致。v4 重新制作完整坐姿狮子：两条后腿、一只落地前爪、一只抬起的猫科前爪，项链悬挂红宝石。身体与活动前爪都从这张完整原图拆出，不再拼接旧肢体。
- 天鹅：v3 翅膀兼作托珍珠的手，造成额外肢体的观感。v4 为一只收拢翅膀、一只半展开活动翅膀、两只蹼足与一条短尾。珍珠独立放在原柜机底座上，不随翅膀或身体呼吸运动。
- 活动层置于躯干后，肩部留重叠遮挡。狮子活动爪的轮廓掩膜已沿前爪收紧，并清理分离的鬃毛碎片；天鹅活动翼清理分离的尾羽片段。
- 呼吸与姿态围绕真实脚底支点，接触影随脚底位置设置。招财前爪与半展开翼分别降低摆幅与速度；柜机主体、原有奖级、结算与已调柔的音乐不属于本轮改动范围。

## 原画与生成来源

通过本机 CC Switch 已配置的提供方调用图像接口，在内存中读取配置；没有修改全局配置或把凭证写入项目。采用图像编辑模式、`gpt-image-2.5`、高质量和透明背景。请求尺寸 1024 × 1024，返回原画为 1280 × 1280；安装资源在保持比例的情况下归一到透明 1024 × 1024 画布。

完整角色重新生成，只用脸部参考保持已有的角色气质。运行角色和活动肢体来自各自本轮完整原画，不使用 v3 的身体或前爪。

| 角色 | 实际采用原画 | 提示词 |
|---|---|---|
| 狮子 | [完整原画](../art-source/raw/guardian-ruby-coherent-v4.png) | [完整角色提示](../art-source/prompts/guardian-ruby-coherent-v4.txt) |
| 天鹅 | [修正短尾后的完整原画](../art-source/raw/guardian-pearl-coherent-refined-v4.png) | [完整角色提示](../art-source/prompts/guardian-pearl-coherent-v4.txt)、[短尾修正提示](../art-source/prompts/guardian-pearl-tail-v4.txt) |

[角色处理脚本](../art-source/prepare_guardian_coherent.py)保存比例、分离本图活动层、清理透明边缘与生成资源；[统一准备入口](../art-source/prepare_guardian_motion.py)的 Pearl/Ruby 路径已改为调用该脚本。Coin/Sapphire 仍沿用自己的原画处理路径。

安装输出：[狮子身体](../assets/resources/art/guardian-ruby.png)、[活动前爪](../assets/resources/art/guardian-ruby-wave.png)、[天鹅身体](../assets/resources/art/guardian-pearl.png)、[活动翼](../assets/resources/art/guardian-pearl-wave.png)、[底座珍珠](../assets/resources/art/guardian-pearl-offering.png)。原有身体和活动层的资源 UUID 保留，珍珠使用独立资源 UUID。

## 连接与动画检查

| 角色 | 原画肩部支点 | 原画脚底支点 | 活动肢体理论角度范围 |
|---|---|---|---|
| 狮子 | (462, 565) | (650, 977) | −3° 至 17° |
| 天鹅 | (515, 526) | (355, 977) | −3° 至 13.3° |

坐标均按左上角为原点的 1024 像素归一画布。理论范围包含待机、旋转期待和庆祝响应叠加的上界；实测不会必然达到上界。检查的是脚底**支点**固定，并非承诺每一个脚趾像素在呼吸中完全不动。

[原图层极限姿态检查](screenshots/f34-coherent-guardians-v4-20261009/motion/source-extreme-assembly.png)覆盖最终安装资源的负角、零角与理论最大角。它是资源组装检查图，不能当作连续运行证据。实际 Cocos 连续录制、最小/最大姿态截图与采样位于下方证据目录。

## 实际验证

- TypeScript 类型检查通过；Cocos Creator 3.8.8 的 `web-mobile` 构建日志明确显示任务完成。预览服务器 6035 返回新构建。
- 六个独立浏览器用例完成：狮子、天鹅各覆盖 390 × 844、320 × 568，以及 320 × 568 的 reduced motion；DPR 为 2。
- 两个常规手机比例用例各录制约 19.6 秒，覆盖待机、期待、庆祝和恢复；两个小屏用例各录制约 9.6 秒完整待机周期。减少动态的用例保持静止。
- 六例均没有页面脚本错误；活动层位于躯干后，脚底支点固定，天鹅的底座珍珠固定。截图与动作对比中未发现肩部露缝、分离的碎片或角色全身裁切。
- 此次响应探针直接调用角色组件的 `watch()` / `celebrate()`，**不是实际中奖测试**。没有旋转、购买或更改用户当前存档；独立测试余额保持 27000，结算状态为 idle。
- 帧时间采样包含截图和录制开销，不用于声称帧率或真机性能通过。

[当前截图与录制](screenshots/f34-coherent-guardians-v4-20261009/README.md)、[六例结果](screenshots/f34-coherent-guardians-v4-20261009/runtime-qa.json)、[可复现检查脚本](../tools/guardian-coherent-runtime-qa.cjs)。脚本使用独立浏览器 context；Playwright 路径可通过 `F34_PLAYWRIGHT_MODULE` 指定。

本轮完成的是桌面 Cocos 预览中的角色结构、接触位置与动画检查；手机实机、原生包和平台发布不在该证据范围。v3 的[旧检查记录](guardian-anatomy-20261008.md)保留为历史，不能作为当前角色画面。
