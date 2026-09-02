# IMPERIAL TREASURE WORLD — 财富主题资产清单

## 制作方式

基础财富主题由 `tools/wealth-theme-assets.py` 基于已保留的高清模板源图进行确定性重制，包括金属色分级、红宝石/祖母绿/珍珠母贝高光和建筑节点珍珠金托。完整实体机柜与新版大厅按用户要求只通过本机 CC Switch `http://127.0.0.1:15721/v1/responses` 的 `image_generation` 生成；没有调用其他图片服务，也没有把参考图中的糖果品牌或符号复制进项目。

## 本机 CC Switch 新增原图

| 资产 | response id | 原始尺寸 | 提示词 |
|---|---|---:|---|
| 四类完整实体机柜 2×2 图集 | `resp_0616c8ccbdb37ee5016a9635b8640c87d0a8c33609a0abd370` | 1024×1536 | `../../work/prompts/wealth_cabinet_atlas_v01.txt` |
| 四类写实深色金属实体机柜 v02 | `resp_088db4003dfea0dc016a9674e4490487d0b649c8f47df9f53a` | 1254×1254 | `../../work/prompts/wealth_cabinet_atlas_v02.txt` |
| 四类灵动追光实体机柜 v03 | `resp_06fedb0109d665d2016a96888ca1fc87d0a1dab33215131509` | 1254×1254 | `../../work/prompts/wealth_cabinet_atlas_v03.txt` |
| 四类喜庆大卷轴实体机柜 v04 | `resp_02994652c041d25d016a968f9f4abc87d0b5148a605d45e180` | 1254×1254 | `../../work/prompts/wealth_cabinet_atlas_v04.txt` |
| 财神迎福喜庆赌场首页 v04 | `resp_0c12d29e0402a879016a96909c518487d08e646a9a96c3ad5e` | 1024×1536 | `../../work/prompts/home_fortune_welcome_v04.txt` |
| 柔和喜庆财富赌场大厅 | `resp_083db62e1e10b778016a963b5807d087d0b04783c739194dc1` | 1024×1536 | `../../work/prompts/wealth_lobby_bg_v01.txt` |
| PEARL FORTUNE 珍珠珠宝符号 3×4 图集 | `resp_07e1cdf43dc07bae016a9642bdc57887d0988c24e85035651a` | 1086×1448 | `../../work/prompts/pearl_fortune_symbols_atlas_v01.txt` |
| 四类柔和博彩氛围游戏背景 2×2 图集 v02 | `resp_07b198c06f5c0757016a967f5a3e4087d0b73ec4234e5a77f6` | 1024×1536 | `../../work/prompts/game_casino_backdrops_atlas_v02.txt` |

CC Switch 原图保存在 `generated-assets/cc-switch/`。`tools/prepare-cabinet-assets.py` 只做确定性的四格裁切、与画布边缘连通的蓝幕去除和上柜/下柜分段；这种连通抠图会保留珍珠柜内部的蓝宝石按钮和顶冠。`tools/prepare-pearl-symbol-assets.py` 只移除与画布边缘连通的统一深色背景并保留黑珍珠内部，不生成或重绘符号。

## 运行时资产

- `generated/home/lobby_bg_wealth_v01.png`：奶油石材、香槟金与柔和宝石红地毯的财富赌场大厅。
- `generated/login/login_bg_v01.png`：私人金库登录大厅。
- `generated/common/common_bg_v01.png`：黑曜石与鎏金公共页面。
- `generated/game01/base_bg_v01.png`：RUBY IMPERIAL 红宝石宝库。
- `generated/game02/base_bg_v01.png`：GOLDEN DYNASTY 24K 金机关城。
- `generated/game03/base_bg_v01.png`：RUBY ROYALE 红宝石私人赌场。
- `generated/game04/base_bg_v01.png`：PEARL FORTUNE 珍珠母贝高科技金库。
- `generated/game01..04/base_bg_casino_v02.png`：带实体灯带、邻机、筹码台和中奖环境光的四套柔和赌场机位背景。
- `generated/common/character_*_v01.png`：四位角色的财富主题材质重制。
- `generated/common/button_frame_*_v01.png`：红宝石、黄金、蓝宝石与珍珠金四套边框。
- `generated/common/cabinet_*_v02.png`：四类结构不同的写实深色金属完整机柜透明原件。
- `generated/common/cabinet_*_v02_top.png`、`cabinet_*_v02_lower.png`：运行时上柜与下柜透明分段。
- `generated/common/cabinet_*_v03.png`：保留四种独立实体结构、增加内嵌追光灯组与更活跃工业曲面的完整机柜透明原件。
- `generated/common/cabinet_*_v03_top.png`、`cabinet_*_v03_lower.png`：v03 运行时上柜与下柜透明分段。
- `generated/common/cabinet_*_v04.png`：更明快喜庆的四种实体柜机，主卷轴黑玻璃扩大为柜体视觉核心并保留五键台与拉杆。
- `generated/common/cabinet_*_v04_top.png`、`cabinet_*_v04_lower.png`：v04 运行时上柜与下柜透明分段。
- `generated/home/home_fortune_welcome_v04.png`：原创财神式赌场迎宾角色、红金灯阵与珠宝光斑首页背景，确定性裁切为 9:16。
- `generated/home/home_fortune_welcome_v12.png`：无人物的红金宝箱与金币首页背景，避免角色表情风险并保留喜庆财富氛围。
- `generated/game01..04/symbol_atlas*_v02.png`：四套保持原坐标的财富主题符号图集。

## 技术约束

- 所有图片保持原始像素尺寸。
- 所有 RGBA 资源保持原始 Alpha 通道。
- 符号图集单元坐标、资源路径和 `.meta` 不变。
- 边框透明窗、九宫格测量值和运行时布局参数不变。
- 语义规则：金币与领取使用 Fortune Coin；登录使用金钥匙；排行使用 Crown；成就使用 Seal；头像使用对应财富世界人物。
