# F3 FORTUNE HARBOR — 图片生成清单

更新日期：2026-09-04

## 生成方式

- Endpoint：`POST http://127.0.0.1:15721/v1/responses`
- 本机路由：CC Switch
- Responses 主模型：`gpt-5.6-sol`
- 图片工具：`image_generation`
- 图片模型：`gpt-image-2`
- 质量：`high`
- 最终素材全部进入 `assets/resources/generated/`，运行时不依赖外部 URL。

## 正式资产

| 类别 | 文件 | 用途 |
| --- | --- | --- |
| 大厅 | `common/fortune_harbor_lobby.png` | 香槟金财富娱乐城；两侧真实赌桌与老虎机、边缘金币环、下方宝箱珠宝，中央保留清晰 UI 安全区 |
| 四款封面 | `common/game_cover_atlas.png` | 2×2 非柜机 Key Art：经典金币、宝箱筹码、珍珠珠宝、大奖信标；同时用于大厅卡片和独立加载页 |
| Logo | `common/fortune_harbor_emblem.png` | 太阳罗盘、宝箱和金币统一徽章；RGBA 抠图 |
| 主持人 | `common/harbor_host_marina.png` | Marina Vale 统一主持角色；RGBA 抠图 |
| 控件图集 | `common/control_atlas.png` | 3×3 首页、声音、规则、减、Spin、加、Turbo、Auto、赔付图标 |
| Game 01 柜机 | `game01/cabinet.png` | 参考 S05 几何与 S06 材质生成的 3×3 Golden Tide |
| Game 02 柜机 | `game02/cabinet.png` | 参考 S06 几何与 S07 控台生成的 5×3 Captain's Chest |
| Game 03 柜机 | `game03/cabinet.png` | 参考 S07 轮盘与 S05 明亮感生成的 6×5 Pearl Parade |
| Game 04 柜机 | `game04/cabinet.png` | 参考 S08 六轴与 S06 金属细节生成的 6×4 Beacon Fortune 财富大奖柜机 |
| 四套转轴 | `game0*/symbol_atlas.png` | 各自独立的 3×4 RGBA 正式符号图集；Game 04 已重制为金币、筹码、皇冠、珠宝、宝箱和 Jackpot 奖盘 |

四张柜机图均在各自的真实港湾环境中构成完整画面，柜机约占竖屏高度 94%。Cocos 只在图片预留的空白屏幕、读数槽和实体按键槽内叠加内容。原始请求、响应 JSON 与绿幕中间图保存在 `work/`，便于审计和再生成；最终 Cocos 资源不含绿幕底。
