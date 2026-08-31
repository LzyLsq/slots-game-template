# CELESTIAL SPIN WORLD — 图片资产清单

更新日期：2026-08-31

## 原始生成图集

所有原始 Slots 图集均通过用户指定的本地 CC Switch 生成，未使用第三方游戏素材。

| 世界 | 运行目录 | CC Switch response id | 生成提示词 |
|---|---|---|---|
| Astral Vault | `generated/game01` | `resp_06aa1858a28063c1016a92a98571fc87d0ab589815b452bb79` | `../../work/prompts/astral_symbols_atlas_v02.txt` |
| Golden Dynasty | `generated/game02` | `resp_07c4b15028c96ce6016a92aa16e9f087d0a551900aa5895bbc` | `../../work/prompts/golden_symbols_atlas_v02.txt` |
| Neon Classic | `generated/game03` | `resp_08ec0a97818dadfa016a92aaca842c87d0be88f6a822d747be` | `../../work/prompts/neon_symbols_atlas_v02.txt` |
| Cosmic Coins | `generated/game04` | `resp_0c501c996213fea9016a92ac23d5f487d0a2761fd79660ee84` | `../../work/prompts/cosmic_symbols_atlas_v02.txt` |

## 人物与图片边框图集

本轮新增两套原创公共 UI 图集，同样只通过本机 CC Switch 生成：

| 图集 | CC Switch response id | 原始尺寸 | 生成提示词 |
|---|---|---:|---|
| 四世界人物主视觉 | `resp_010feb88db4a8428016a92eee5c0f887d08708460439ea31a9` | 1254×1254 | `../../work/prompts/character_hero_atlas_v01.txt` |
| 四世界实体图片边框 | `resp_0bd1f8bb76b0e929016a92ef0823dc87d09e68a210115c293f` | 1198×1313 | `../../work/prompts/button_frame_atlas_v01.txt` |

人物顺序为 Astral Priestess、Golden Guardian、Neon Lucky Heroine、Cosmic Miner Explorer。边框顺序为 Celestial Crystal、Golden Clockwork、Neon Chrome、Cosmic Titanium；每种装饰与对应世界语义一致。

## 运行时透明衍生图

`../../work/prepare_symbol_atlases.py` 对原始图集做确定性透明背景提取，生成：

- `assets/resources/generated/game01/symbol_atlas_cutout_v02.png`
- `assets/resources/generated/game02/symbol_atlas_cutout_v02.png`
- `assets/resources/generated/game03/symbol_atlas_cutout_v02.png`
- `assets/resources/generated/game04/symbol_atlas_cutout_v02.png`

衍生图保留原图 3×4 单元格顺序和 RGBA alpha。`SymbolAtlasCache` 统一缓存切片，转轴、大厅卡片、Banner、加载页、头像、导航、支付表和按钮共享同一图集，避免重复纹理加载。

`../../work/prepare_ui_atlases.py` 对两张 2×2 公共 UI 图集逐格去除深色底图，生成四张人物透明图和四张边框透明图：

- `assets/resources/generated/common/character_astral_v01.png`
- `assets/resources/generated/common/character_golden_v01.png`
- `assets/resources/generated/common/character_neon_v01.png`
- `assets/resources/generated/common/character_cosmic_v01.png`
- `assets/resources/generated/common/button_frame_astral_v01.png`
- `assets/resources/generated/common/button_frame_golden_v01.png`
- `assets/resources/generated/common/button_frame_neon_v01.png`
- `assets/resources/generated/common/button_frame_cosmic_v01.png`

实体边框在运行时使用九宫格切片，因此能覆盖 58 像素充值小键、普通横向按钮、底部导航、内容卡、Banner、转轴外框和符号格，而不会拉伸四角细节。

## 本轮动态使用方式

- Banner：四世界背景、对应人物和 3D 主符号错峰交叉淡入、缓慢漂移。
- 游戏卡：每张卡展示对应人物、主符号与世界专属实体图片边框，叠加克制星尘。
- Loading：当前世界人物与主符号弹性进入，双副符号绕场旋转，配合轨道和进度阶段文案。
- 游戏页：人物作为低透明场景陪衬放在转轴外侧；转轴总框和每个符号格使用当前世界图片边框。
- 按钮：返回、充值、加减投注、文字链接、导航、关闭、Turbo、Auto 与 SPIN 全部有图片修饰；普通按钮使用低亮静态金属边框，主按钮只保留慢速轻呼吸，避免持续闪烁抢字。
- 中奖：透明 Wild 图标、动态浮层、金币碎片、屏闪、冲击波和 Credits 飞行。
- 语义规则：Credits 与充值使用 Cosmic Energy Coin；登录使用 Clockwork Key；签到/领取使用 Energy Coin；转盘/自动使用 Orrery；排行使用 Crown；成就使用 Seal；头像使用对应世界人物。纯控制键只使用主题边框，不强塞无关物件。
- 方框材质：大型容器复用对应世界场景图作为低透明内部纹理，并叠加主题图片边框；输入框、列表卡、弹窗和顶栏使用九宫格边框保持一致质感与可读性。

说明：新增人物和按钮边框均为本地生成的原创素材；原始图不覆盖，运行时透明衍生图使用版本化文件名保存。
