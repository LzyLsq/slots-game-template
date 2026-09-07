# F4 GOLDEN JUBILEE — 图片生成清单

更新日期：2026-09-04

## 生成方式

- 本机路由：CC Switch
- 图片模型：高质量图像生成模型
- 最终素材全部进入 `assets/resources/generated/`，运行时不依赖外部 URL。
- 柜机、转轴符号、标题 Logo、控件图集和大厅封面分别生成并在 Cocos 中组合；实时文字、金额和状态不烘焙进图片。

## 正式资产

| 类别 | 文件 | 用途 |
| --- | --- | --- |
| 大厅 | `common/golden_jubilee_lobby.png` | 白昼玻璃穹顶财富大厅；两侧赌桌、宝箱、珠宝和金币形成边缘构图，中央保留 UI 安全区 |
| 四款封面 | `common/game_cover_atlas.png` | 2×2 非柜机 Key Art，用于主页卡片和独立加载页 |
| 品牌 Logo | `common/golden_jubilee_emblem.png` | 太阳、宝石和庆典金饰统一徽章 |
| 主持人 | `common/jubilee_host_sienna.png` | Sienna 统一主持角色，透明背景 |
| 通用控件 | `common/control_atlas.png` | 大厅与回退类控件图集 |
| 标题 Logo | `common/title-logos/game0*_title_logo_v1.png` | 四款独立艺术标题，透明背景 |
| Game 01 | `game01/cabinet.png`、`control_atlas.png`、`symbol_atlas.png` | Lucky Coin Grove 柜机、按钮与符号 |
| Game 02 | `game02/cabinet.png`、`control_atlas.png`、`symbol_atlas.png` | Treasure Parade 柜机、按钮与符号 |
| Game 03 | `game03/cabinet.png`、`control_atlas.png`、`symbol_atlas.png` | Lantern Fortune 柜机、按钮与符号 |
| Game 04 | `game04/cabinet.png`、`control_atlas.png`、`symbol_atlas.png` | Jubilee Cascade 柜机、按钮与符号 |

四张柜机图均覆盖完整竖屏，并包含真实柜体、屏幕开口、标题区和控制台。Cocos 只在对应物理槽内叠加转轴、金额、按钮和动态特效；大厅卡片与加载页使用独立封面，不使用柜机截图充当 Key Art。
