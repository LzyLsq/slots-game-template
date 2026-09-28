# F31 · Fortune Carnival · 财富嘉年华

F31 是一套基于 **Cocos Creator 3.8.8** 的竖屏虚拟金币完整游戏模板。整体视觉为皇家铸币城、金库机械与庆典金币建筑：以香槟金、酒红、翡翠绿和午夜蓝组成统一商业化美术体系，强调大量金币、金条、浮雕金属与华丽柜机，弱化低幼、吉祥物和拼贴感。

> 本项目使用虚拟金币，不提供现金兑换。当前代码与 Web Mobile 构建已完成本地质量验证；App Store 商品、法律主体、正式域名、原生 StoreKit / Apple 登录桥接和 TestFlight 真机验收仍须由发行方配置。

## 页面与原创布局

- **加载页**：金币圆环、金库呼吸光、扫光和进度反馈；支持 `prefers-reduced-motion`。
- **登录 / 注册**：皇家铸币城抵达大厅，通行证式表单，访客入口、Apple 登录入口和法律链接完整。
- **大厅**：中心财富展台而非普通卡片列表；四个目的地可点选、左右滑动并循环切换，PLAY 与滑动热区分离。
- **商店**：皇家铸币柜台、商品陈列、恢复购买和未完成订单同步入口。
- **奖励**：七日签到与每日金币信封；重复领取不会重复加币。
- **排行**：玩家与虚拟角色合并排序，显示真实玩家名次。
- **账户**：钱包、最佳获奖、总获奖、局数、头像、昵称、语言、隐私和账户操作集中在通行证布局中。
- **柜机**：背景、柜体、标题、转轴窗口和控制台在同一视觉体系内；SPIN、AUTO 与加减注采用金属底座、内凹插槽、珐琅按钮帽和真实下压回弹，标题材质与获奖演出随主题变化。

## 四款独立游戏

最终运行规则由 `IndependentCore` 生成，四台柜机不是同一数学模式换皮。

| 游戏 | 最终盘面与基础规则 | 主题方向 |
| --- | --- | --- |
| **COIN CAROUSEL / 金币旋转宝库** | 5×3，243 WAYS | 珊瑚金旋转金库、金币环与金币喷泉 |
| **LANTERN VAULT / 金灯秘库** | 6×5，5+ 相邻成团 | 翡翠金币锁、金灯与金条秘库 |
| **LUCKY PARADE / 鸿运巡游** | 6×5，8+ 全盘同符号计奖 | 胜利金鼓、金币旗阵与庆典金雨 |
| **CELESTIAL MINT / 星穹铸币殿** | 5×3，25 条固定线 | 行星金币、星象仪与天穹铸币机械 |

稳定 ID：`coin-carousel`、`lantern-vault`、`lucky-parade`、`celestial-mint`。四款游戏共用账户钱包，但拥有不同盘面、结算几何、特色机关、符号图集、柜机、奖品图和动态反馈。

## 交互与系统

- 下注增减、SPIN、AUTO、RULES、声音开关、返回大厅均可操作。
- 连续起转、分列减速、停轴回弹、符号待机、中奖轮廓、金币喷泉、分层金雨和 BIG / MEGA / EPIC 演出完整。
- **迎宾大奖**：新账户前五次成功结算的旋转内至少一次 SUPER / MEGA WIN（总投注 ≥ 50×）；前四次自然 SUPER 奖会完成保障，否则第五次由结算层产生 ≥ 50× 的真实赔付，取消、失败和未结算旋转不计次数。规则已在五语言 RULES 页面公开。
- **资源分批加载**：首屏仅加载登录、大厅和通用界面图；首次进入商店才加载商品图，进入某台柜机时才加载其盘面、动态模糊图、柜机背景与大奖场景。
- `?debug=1&force=big|mega|epic` 仅供本机视觉验收，不改变正式环境的自然局规则，也不会在演出阶段二次发币。
- 支持简体中文、繁体中文、英文、日文、韩文；语言选择在刷新、退出与重新登录后保持。
- 安全区、窄屏、平板、横屏提示和减少动态效果均有适配。
- 本地存档键：`fortune-carnival-f31.cocos.save.v1`。

## 安装、检查与构建

先执行 `npm ci`，再用 **Cocos Creator 3.8.8 打开项目**，由编辑器生成未入库的 `temp/tsconfig.cocos.json` 和类型声明。之后执行：

```sh
npm run typecheck
npm run typecheck:server
npm test
npm run release:audit
```

按下列配置构建 Web Mobile：

```text
tools/web-mobile-release-build.json
```

最终构建目录：

```text
build/web-mobile/
```

本地常驻预览（macOS）：

```sh
./tools/publish-preview.sh
```

该脚本将最新 `build/web-mobile/` 发布到可由 LaunchAgent 读取的缓存目录，并启动无缓存预览服务。每次重新构建后再运行一次发布脚本；打开 `http://127.0.0.1:5032/`。如果不需要常驻服务，也可在项目目录运行 `python3 tools/preview_server.py --port 5031`。本机可使用以下调试入口：

```text
?debug=1&screen=home
?debug=1&screen=game&game=coin-carousel
?debug=1&screen=game&game=coin-carousel&force=big
```

## 视觉验收

本轮已检查 320×568、390×844、430×932、768×1024、844×390 横屏提示、五种语言、四台柜机和三档大奖演出。

- [完整页面与柜机总览](docs/screenshots/F31-final-contact-sheet.jpg)
- [响应式总览](docs/screenshots/F31-responsive-contact-sheet.jpg)
- [五语言总览](docs/screenshots/F31-language-contact-sheet.jpg)
- [大奖演出实拍（390×844）](docs/screenshots/390-big-win-lantern-vault-polished.png)
- [超级大奖演出实拍（390×844）](docs/screenshots/390-mega-win-lantern-vault-polished.png)
- [三档演出总览（历史验收）](docs/screenshots/F31-win-contact-sheet.jpg)
- [加载页](docs/screenshots/390-loading.png)

详细验证记录见 [docs/QA.md](docs/QA.md)，美术来源见 [docs/ART_PROVENANCE.md](docs/ART_PROVENANCE.md)。

## 发行边界

模板不包含也不会虚构以下外部发行信息：

1. 发行商法定名称、支持邮箱和正式 API 域名；
2. 已上线的隐私政策、用户条款和支持页面 URL；
3. App Store 商品 ID、价格区间和 App Store Connect 配置；
4. 可执行的 iOS StoreKit 2 与 Sign in with Apple 原生桥接；
5. Apple 根证书、Bundle ID、签名、生产数据库和通知密钥；
6. Sandbox、TestFlight、真机性能、恢复购买、退款与审核验收记录。

只有在发行方补齐上述信息并完成真实设备与生产环境验收后，才能声明具备提交 App Store 的条件。
