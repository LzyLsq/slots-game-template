# F20 · Golden Canopy · 金叶福庭

Cocos Creator 3.8.8 移动端虚拟金币完整模版。以金叶拱门、宝石吊灯、金雕展台与金币树屋构建柔和卡通财富庭园。松鼠、兔子、海龟和知更鸟分别守护四个独立主题。

## 运行

```sh
npm ci
# 用 Cocos Creator 3.8.8 打开项目，按 tools/web-mobile-release-build.json 构建 Web Mobile。
python3 tools/preview_server.py --port 5020
```

本地预览：http://127.0.0.1:5020/ 。本机审查支持 `?debug=1&screen=home`，或 `screen=game&game=golden-hour`。独立存档：`golden-canopy-f20.cocos.save.v1`。本机强制大奖仅用于演出审查，不代表自然中奖概率。

## 四座宝库

| 主题 | 玩法 | 机关与材质 |
| --- | --- | --- |
| ACORN VAULT | 3×3，中线与金库选择 | 松鼠、金橡果与橡木机关 |
| RUBY ORCHARD | 5×3，20 线与锁币重转 | 兔子、红宝苹果与花瓣纹章 |
| PEARL BROOK | 5×4，1,024 ways 与扩展百搭 | 海龟、珍珠与莲花机关 |
| CROWN NEST | 5×5，集群连消与递增倍率 | 知更鸟、皇冠与金羽机关 |

底层稳定 ID 为 `golden-hour`、`jade-treasury`、`pearl-palace`、`ruby-revel`。共用钱包；各自完整场景、标题图与按钮材质独立。主题符号以金币、金条、宝石等财宝为主，不混入前作的食物或列车。

## 完整流程

- 登录直接以账号表单为主，包含 Apple 标志、游客、注册、法律入口及退出后重新登录。
- 大厅是一体化宝库场景，单座大型主题展台、四个头像选择入口、独立 PLAY 按钮、固定金叶拱门和局部金属扫光。
- 初始加载及模式加载使用林间微缩景观、模式加载光芽和进度条；达到 100% 后平滑退场。
- 四张横向柜机标题图独立缓慢浮动与扫光。转轴、机身、按钮与背景共享坐标变换；控制台读数嵌入同一显示区。
- 连续起转与平滑减速、停轴回弹、分隔线、符号待机、金币压印/宝石闪耀/珍珠波纹/皇冠纹章反馈、按钮按压反馈，普通获奖及 BIG / MEGA / EPIC 演出；演出不会再次发币。
- 主题藏品式商店四档金币包、恢复购买；七日奖励清晰标出当天/已领/锁定，另有每日宝箱。
- 荣誉展示真实保存的结算成绩；账户含 16 个卡通头像、账本、隐私、退出及删除入口。
- 减少动态效果设置、原生输入框、钱包结算与奖励防重逻辑保留。

## 实际运行截图

![F20 运行总览](docs/screenshots/F20-preview.jpg)

| 登录 | 宝库大厅 |
| --- | --- |
| ![登录](docs/screenshots/390-login.png) | ![大厅](docs/screenshots/390-home.png) |

| 金币精品店 | 七日宝藏 |
| --- | --- |
| ![商店](docs/screenshots/390-store.png) | ![奖励](docs/screenshots/390-rewards.png) |

| 荣誉 | 账户 |
| --- | --- |
| ![荣誉](docs/screenshots/390-rank.png) | ![账户](docs/screenshots/390-profile.png) |

| 金橡果宝库 | 红宝果园 |
| --- | --- |
| ![黄金](docs/screenshots/390-game-golden-hour.png) | ![红宝](docs/screenshots/390-game-jade-treasury.png) |

| 珍珠溪流 | 皇冠鸟巢 |
| --- | --- |
| ![珍珠](docs/screenshots/390-game-pearl-palace.png) | ![皇冠](docs/screenshots/390-game-ruby-revel.png) |

## 验证与发行接入

验证记录见 [QA](docs/QA.md)，图片提示词与来源见 [ART_PROVENANCE](docs/ART_PROVENANCE.md)。

本模版仅使用虚拟金币，没有提现。原生 Apple 登录、StoreKit 商品、生产服务器、法律信息、签名和真机测试需要发行方配置；浏览器不会伪造购买成功。尚未提交或获得 App Store 审核批准，接入说明位于 `release/`。

## 大奖演出实拍

以下为本地强制触发的演出检查截图，不代表自然获奖频率。

| 金橡果宝库 | 红宝果园 |
| --- | --- |
| ![黄金大奖](docs/screenshots/320-grand-win-golden-hour.png) | ![红宝大奖](docs/screenshots/320-grand-win-jade-treasury.png) |

| 珍珠溪流 | 皇冠鸟巢 |
| --- | --- |
| ![珍珠大奖](docs/screenshots/320-grand-win-pearl-palace.png) | ![皇冠大奖](docs/screenshots/320-grand-win-ruby-revel.png) |

最新交互细节包括展台主题切换、按钮金边反馈、头像保存动效、奖励金币弧线到账、停轴边框反光与大奖平滑退场。验证说明见 [QA](docs/QA.md)。
