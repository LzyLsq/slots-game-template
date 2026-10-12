# F40 · Festival arrival and award crescendo — 2026-10-12

本轮针对两个问题收口：奖励演出缺少豪华层次，以及进入模式时加载画面与 F40 主题不一致。

## 修改

- 初始加载改为 F40「万福金街」：牌楼、灯笼、河街、红金品牌牌和同主题装饰统一成一个场景；进度槽使用红漆、金属包边和暖金填充，保持原图比例，不再使用旧动物主题素材。
- 四个模式分别使用自己的到达画面、标题和规则短句：Golden Phoenix、Jade Dragon、Pearl Qilin、Amber Panda。每个加载场景都有对应的门框、地毯、代表符号和灯光，不共用一张换色图。
- 奖励演出保留当前柜机、房间、转轴和吉祥物，分 BIG → SUPER → MEGA → EPIC 递进。演出加入从主题房间后方升起的透明金色烟花、两轮错峰揭晓、柜冠和财宝台暖色反光、金币喷泉、吉祥物局部庆祝和回到账户的金币运动。
- 烟花为本机 CC Switch 生成的透明主题素材，使用加法发光混合，作为房间内的后景层，不覆盖奖励文字和控制台。
- reduced motion 时保留等级、金额、规则和最终结果，关闭非必要烟花与扫光；演出结束清理烟花节点、恢复标题、SPIN、提示和控制输入。

## 验证

- `typecheck`、`test:win-presentation`、`test:layout`、`test:language` 通过。
- Cocos Creator 3.8.8 web-mobile 预览可运行。Creator CLI 日志显示 `Finished`；该工作站 CLI 最后返回 36，日志中的 MachPort 信息属于编辑器进程结束提示，不能作为移动端性能结论。
- 启动与模式加载：9 组启动/重试/语言/reduced-motion case 通过；服务页与四个主题加载画面共 16 张截图，错误数 0。
- 奖励布局：四模式 × BIG/SUPER/MEGA/EPIC × 390×844 与 320×568，共 32 组截图通过；金额、标题、吉祥物、转轴和控制台保持可读且未替换成独立奖励页。
- 连续实机浏览器录像：四模式各一轮本地调试 EPIC，真实完成一次扣款、一次中奖入账和一次局数递增；`busy=false`、无待结算残留、运行错误 0。录像阶段均经过 BIG → SUPER → MEGA → EPIC，烟花峰值为 6 发，吉祥物采样保持单一网格来源、固定整体变换并保留眨眼。
- 连续录像的桌面浏览器帧间隔仍受采集和解码影响：凤凰录像出现 121 ms Long Task 与一次 116.7 ms 源帧间隔，不能据此宣称手机端全程丝滑。

## 证据

- [本轮截图、录像和审计入口](screenshots/f40-festival-crescendo-20261012/README.md)
- [最终连续录像审计](screenshots/f40-festival-crescendo-20261012/final-motion/direct-canvas-audit.json)
- [加载与服务截图审计](screenshots/f40-festival-crescendo-20261012/services/capture-audit.json)
- [奖励 32 组截图审计](screenshots/f40-festival-crescendo-20261012/awards/award-audit.json)
- [交互恢复审计](screenshots/f40-festival-crescendo-20261012/interactions/interaction-audit.json)

当前预览：`http://127.0.0.1:6040/?debug=1&screen=home&v=f40-festival-crescendo-final-20261012`

本轮不修改自然概率、下注扣款、余额结算或新手福利；强制等级只用于本地演出复查。手机实机帧率、扬声器听感、签名、正式服务、支付和 App Store 审核仍未验证。
