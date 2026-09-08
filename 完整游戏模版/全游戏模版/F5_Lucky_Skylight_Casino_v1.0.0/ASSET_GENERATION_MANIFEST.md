# F5 LUCKY SKYLIGHT — 美术清单

统一提示词与可复现生成说明位于 `tools/prompts-f5/`，生成入口为 `tools/cc-generate.sh`。

| 类别 | 资源 | 规格 |
| --- | --- | --- |
| 大厅 | `generated/common/lucky_skylight_lobby.png` | 1024×1536，全屏天光赌场中庭，无 UI 文案 |
| 品牌 | `generated/common/lucky_skylight_emblem.png` | 透明太阳钻石财富星轨徽章 |
| 荷官 | `generated/common/skylight_host_elodie.png` | 透明全身角色 |
| 封面 | `generated/common/game_cover_atlas.png` | 2×2 四主题场景图集 |
| 四台柜机 | `generated/game01..04/cabinet.png` | 1024×1536，预留转轴、金额和独立按钮位 |
| 四组符号 | `generated/game01..04/symbol_atlas.png` | 3×4 透明图集，前 9 格使用 |
| 四组按钮 | `generated/game01..04/control_atlas.png` | 3×3 透明实体按钮图集 |
| 艺术标题 | `generated/common/title-logos/game01..04_title_logo_v1.png` | 透明高对比横向 Logo |

图片只负责材质、角色和美术轮廓；金额、状态、交互文案、Auto/Turbo 灯态由 Cocos 实时渲染，避免烘焙文字错位。
