# F43 · Golden Symphony / 黄金交响殿堂

Cocos Creator **3.8.8** 完整游戏模板。黄金音乐殿堂、象牙石材、红木与宝石乐器构成统一场景；猫指挥、猫头鹰竖琴师、狐狸铜管手和兔子鼓手与各自柜冠衔接。主题美术通过本机 CC Switch 重新生成，Apple 标准标志单独保留；可靠逻辑与前作质量标准分别继承。

## 游戏内容

| 乐团 | 传统 slot 主规则 | 特色机制 |
|---|---|---|
| Golden Strings | 5×3，15 条线 | 五次粘性 WILD 免费转 |
| Sapphire Harp | 5×3，243 ways | 宝石音符锁定重转 |
| Ruby Brass | 4×4，四邻接集群 5+ | 最多三次掉落，2× / 4× / 6× |
| Pearl Rhythm | 3×3，5 条线 | 三次神秘符号免费转 |

四入口同时可见的大厅与永久三幕乐章册：四个乐团各自积累已结算付费轮次，完成个人曲目与全乐团终场目标。进度按账户保存，不在午夜清空，领奖防重复。

完整页面包括初始加载、登录/注册/游客、协议与隐私、四个模式专属加载、商店、奖励签到、示例排行、账户、头像、邮箱、规则/赔付表、记录与设置。默认英语，提供简体中文、繁体中文、日语、韩语；页面与弹窗采用分块/翻页排布，无整页滚动。

转轴连续向下滚动、逐列落定；中奖格采用独立透明金框。BIG 为实际赢额严格高于下注，普通奖、SUPER、MEGA、EPIC 均保留。新手前五轮/前十轮福利单独说明并计入真实结算，不混入自然中奖概率。大奖在实际柜机场景内完成升级、金额滚动、金币/金色乐章及退出，首触揭示金额、再次触摸收场。

四台柜机各使用一张4096×3072不透明场景图，柜体、建筑、地面、反射与阴影共用同一背景节点和坐标系。转轴、按钮与角色在其上交互，宽屏自然延伸同一房间；[本轮背景检查](docs/qa/f43-continuous-background-20261013/summary.json)记录实际验证范围。

角色以固定身体、局部关节动作和独立眨眼表现待机与中奖反馈；不采用整张角色缩放。当前配乐按音乐殿堂编排：大厅钢琴、弦乐华尔兹、竖琴6/8、温暖铜管与木音打击乐分别对应场景。90个音频文件已重新渲染并柔化高频，点击、停轮、普通奖与大奖反馈采用对应配器；部分自制短反馈乐句的创作逻辑继承，见[资源对照](docs/asset-baseline-comparison.json)。静音、退后台与返回状态互通。

大奖揭奖采用三段音乐高潮，配合柜框金属闪光、限定材质区域的扫光、角色后方金色焰花和分奖级金币流；标题与金额保持清晰，收场后恢复柜机操作。当前build11验收见[本轮结果](docs/qa/f43-concert-awards-20261013/summary.json)。

## 在本机运行

1. 用 **Cocos Creator 3.8.8** 打开此目录，等待资源导入；启动场景为 `assets/scenes/GoldenSymphony.scene`。
2. 安装工具依赖：`npm ci`。Creator 导入后生成 `temp/tsconfig.cocos.json`，客户端类型检查依赖该文件。
3. 构建 Cocos 预览：

```sh
"/path/to/CocosCreator" --project "$PWD" --build "configPath=$PWD/tools/web-mobile-release-build.json"
python3 tools/preview_server.py --port 6043
```

当前本机预览为 `http://127.0.0.1:6043/?debug=1&screen=home&v=f43-concert-awards-20261013`。`screen=game&game=golden-strings` 等参数用于隔离的开发预览。`debug` 仅在 localhost 被允许，发布默认为关闭；真实 Apple 登录或购买不可用时明确显示服务状态。

这是 **Cocos 工程及其浏览器预览**。`tools/ios-preview-build.json` 是原生预览构建配置，不代表已有已签名、接通 Apple 服务的 iOS 成品。

## 当前截图与验证

- [最新演出截图与有声录像](docs/qa/f43-concert-awards-20261013/README.md)：build11、四台柜机连续演出及32组手机大奖构图。
- [基础场景截图索引](docs/screenshots/f43-final-20261013/README.md)：大厅、柜机、辅助页与模式加载；各图保留build6–10的来源标签。
- [验收记录](docs/validation-20261013.md)：记录实际执行范围、视觉与连续动画证据，以及限制。
- [QA 命令](tools/qa/README.md)：浏览器检查按顺序执行，避免多个 GPU 会话相互干扰。
- [参考审查](docs/reference-audit.md)、[独立产品差异](docs/product-differences.md)。
- [自然分布模拟](docs/natural-distribution-final.json)、[Pearl Rhythm 精确回报](docs/rhythm-exact-return.json)。模拟排除新手福利和强制结果，不把模拟值称为真实玩家的必然回报。
- [音频来源与处理](docs/audio-provenance.json)、[采样库许可](art-source/GeneralUser-GS-LICENSE.txt)。事件乐谱为本项目原创，未提取成品游戏声音；最终采样使用权审查仍须单独完成。

```sh
npm test
npm run typecheck
npm run typecheck:server
npm run release:audit
```

## 原生与正式发布边界

[发布状态](docs/f43-release-status.json) 当前为 `readyForSubmission: false`。本地模板功能和浏览器验收，与真实设备及正式发布分别记录。API 客户端、Apple 验证路径、持久化数据库结构和支付边界已有源码，但本地测试不代表已部署。

仍需可执行的 iOS Apple 授权/StoreKit 2 桥接、发布者及产品配置、最终法律文本与 HTTPS 地址、正式服务部署、资源权利审查、签名/真机/Sandbox/TestFlight 验收和实际 App Store 审核。未接通的入口不会伪造成功。

本轮没有执行 Git 提交或推送。工程不包含依赖、缓存或构建产物作为交付源文件。
