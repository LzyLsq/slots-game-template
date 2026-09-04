# GILDED CELEBRATION — 图片生成清单

更新日期：2026-09-01

## 生成链

本轮正式图片资产按用户指定方式生成：

- Endpoint：`POST http://127.0.0.1:15721/v1/responses`
- Responses 主模型：`gpt-5.6-sol`
- Tool：`image_generation`
- 图片模型：`gpt-image-2`
- Quality：`high`
- Authorization：本机 CC Switch 托管凭据

所有正式图片均已复制进 `assets/resources/generated/`，运行时不依赖外部 URL。

## 最终资产

| 类别 | 最终文件 | 生成提示词摘要 |
|---|---|---|
| 大厅 | `home/home_bg_v01.png` | 竖屏喜庆高端赌场大厅，金红软装、四台差异化真实柜机、金币筹码和珠宝，柔和暖光，无文字、无 UI |
| 登录 | `login/login_bg_v01.png` | 红毯珠宝赌场入口，香槟金拱门、红宝石与翡翠、金币骰子，欢迎而不庄重，无文字、无 UI |
| 功能页 | `common/common_bg_v01.png` | 金红赌场桌面背景，轮盘、筹码、金币与宝石分布在边缘，中部留出清晰 UI 空间 |
| 启动页 | `common/start_bg_v01.png` | 复用统一入口背景，配合代码绘制的品牌与加载动效 |
| 柜机 1 | `game01/base_bg_v03.png` | 红宝石珠宝圆拱完整柜机，5×3 实体转轮窗、玫瑰金读数窗与高低两层七键物理控制台 |
| 柜机 2 | `game02/base_bg_v04.png` | 青玉横檐完整柜机，严格 5×3 实体转轮窗、玉石读数窗与舒展的高低两层七键控制台 |
| 柜机 3 | `game03/base_bg_v02.png` | 宽矮香槟复古完整柜机，3×3 机械鼓轮、跑马灯与七键斜面控制台 |
| 柜机 4 | `game04/base_bg_v03.png` | 金币瀑布双塔完整柜机，5×3 转轮、金币仓与高低两层七键金属控制台 |
| 柜机环境 1 | `game01/scene_bg_v01.png` | 红宝石赌场空间，真实穹顶、红毯与边缘金币珠宝，中央低细节供柜机覆盖 |
| 柜机环境 2 | `game02/scene_bg_v01.png` | 翡翠香槟金赌场壁龛，玉石灯光、红毯与边缘筹码，中央低细节 |
| 柜机环境 3 | `game03/scene_bg_v01.png` | 柔和复古赌场舞台，灯泡曲线、天鹅绒与珠宝金币，中央低细节 |
| 柜机环境 4 | `game04/scene_bg_v01.png` | 金币翡翠高滚客大厅，流线金属灯带、红毯与边缘金币，中央低细节 |
| 角色 | `common/character_*_v01.png` | 四位原创赌场角色，分别对应珠宝、翡翠、经典、金币模式；暖光、可抠图构图 |
| 符号 | `game0*/symbol_atlas_cutout_v02.png` | 四套独立 3×4 赌场符号图集；红宝石、翡翠、经典水果、金币高滚客元素；纯色键背景后确定性抠图 |

共同约束：柔和土豪金、金红喜庆、博彩气氛、材质高级但不严肃；无品牌、水印、乱码、真实货币标识或现成 IP。

四台柜机均以生成图本身作为运行时物理坐标系：代码只在空白转轮格、黑色读数窗和实体按钮面上叠加符号、数字、标签与透明点击区，不再另画悬浮按钮壳。红宝石、青玉和金币柜机的七键控制台升级请求与响应保存在 `work/control-console-v01/`；Classic 继续使用经验证的宽矮实体控制台。旧版本资产保留用于回溯。

四张 `scene_bg_v01.png` 是独立补绘的完整赌场环境，只负责在柜机后方自然覆盖手机全屏；它们不包含第二台柜机，也不是原柜机图的放大、复制或模糊延伸。对应请求与响应保存在 `work/scene-bg/`。

## 透明处理

角色与符号先生成纯色键背景，再执行确定性色键提取，最终 RGBA 图只保留运行时文件：

- `assets/resources/generated/common/character_astral_v01.png`
- `assets/resources/generated/common/character_golden_v01.png`
- `assets/resources/generated/common/character_neon_v01.png`
- `assets/resources/generated/common/character_cosmic_v01.png`
- `assets/resources/generated/game01/symbol_atlas_cutout_v02.png`
- `assets/resources/generated/game02/symbol_atlas_cutout_v02.png`
- `assets/resources/generated/game03/symbol_atlas_cutout_v02.png`
- `assets/resources/generated/game04/symbol_atlas_cutout_v02.png`

验收项：无黑底、无粉边、无整格渐变底；四套符号与对应柜机颜色匹配。

纯色键中间图已从 Cocos `resources` 移出，可在 `work/intermediate/chroma/` 恢复或重新处理，不会增加正式包体。
