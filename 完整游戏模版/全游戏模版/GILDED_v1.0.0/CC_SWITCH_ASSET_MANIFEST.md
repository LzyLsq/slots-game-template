# GILDED PEARL EMPIRE — CC Switch 图片生成记录

生成日期：2026-08-31（Asia/Shanghai）  
生成方式：本机 CC Switch `http://127.0.0.1:15721/v1/responses` + `image_generation`  
Responses 主模型：`gpt-5.6-sol`  
凭据：未写入项目、日志或清单。

## 已采用资产

### 财富机柜主视觉 v1

- 文件：`art-source/ccswitch/gilded-pearl-wealth-cabinet-v1.png`
- 尺寸：1024×1536，RGB PNG
- SHA-256：`b1118ce43d8635a386176188040c3c85f076b64dd7c1988f0c9e9ed43ee05259`
- Response：`resp_0d2818a9056ab781016a954dc5b52887d0becb0ec55cfb73d8`
- Image call：`ig_0d2818a9056ab781016a954dc800d487d0a4961db7d5b84308`
- 完整最终提示词：`art-source/ccswitch/wealth-cabinet-request.json`
- 用途：四款 Slots 的完整一体式机柜底图；实时标题、余额、转轴、中奖信息与控制按钮嵌入其留白区域。
- 验收：顶部灯泡招牌、奶油白转轴窗、酒红亮漆控制台和珍珠徽章结构完整；金币、珍珠与红绿宝石贴合机身；无文字、Logo、水印、糖果或品牌复刻。

### 柔和轻奢主背景 v2

- 文件：`art-source/ccswitch/gilded-pearl-lounge-background-v2.png`
- 尺寸：1024×1536，RGB PNG
- SHA-256：`ac6d569ef176ab4328213cd8947220ef72382d80736960b8f5be9e6f0bf837d8`
- Response：`resp_066a81d8d87199d1016a953f8d242087d0b0f6cfa47db6b977`
- Image call：`ig_066a81d8d87199d1016a953f8e903487d08fbac7ee02ce25c1`
- 完整最终提示词：`art-source/ccswitch/background-soft-request.json`
- 用途：启动、登录、首页、公共页面以及四款 Slots 背景。
- 验收：五列转轴结构与建筑一体；中心留白；香槟金/奶油白柔和；珍珠、金币、红绿宝石与钻石均清晰；无文本、水印、品牌或货币符号。

### 财富符号图集 v1

- 文件：`art-source/ccswitch/gilded-pearl-symbol-atlas-v1.png`
- 尺寸：1086×1448，RGBA PNG；每格 362×362；3 列×4 行
- SHA-256：`cce7b4095aa3569691222b9236f51b20d52111a97eb3e30fb38244db89ecfdaf`
- Response：`resp_0a5eb044d2f177cd016a954327045887d0a6d1f151e722cf0a`
- Image call：`ig_0a5eb044d2f177cd016a954328ba1c87d0a192e449904cbcbe`
- 完整最终提示词：`art-source/ccswitch/symbol-atlas-request.json`
- 用途：四款 Slots 的真实转轴、首页卡片、按钮语义图与 VFX 图形。
- 顺序：珍珠、金币、祖母绿、红宝石、钻石、珍珠宝箱、皇冠、珍珠圣杯、钻石权杖、幸运马蹄、皇冠 WILD、珍珠宝库 SCATTER。
- 验收：严格 3×4；真实 Alpha；白底合成无杂点；无文字、数字、货币符号、Logo、水印；缩小仍有清晰轮廓。

### 轻奢主持人图集 v1

- 文件：`art-source/ccswitch/gilded-pearl-host-atlas-v1.png`
- 尺寸：1024×1536，RGBA PNG；2 列×2 行
- SHA-256：`0bf7c6203f867752226544984c8e0a08327781a20e9c4714756f5cd25f1a50a6`
- Response：`resp_00aaf4cddd5c3a0a016a95477649c887d0be18cb4540db2a1e`
- Image call：`ig_00aaf4cddd5c3a0a016a95477dcdec87d0a2f2448df60c76c5`
- 完整最终提示词：`art-source/ccswitch/host-atlas-request.json`
- 顺序：珍珠女主持、香槟金男主持、玫瑰金女主持、祖母绿男主持。
- 验收：白底合成确认四个人物外部为真实透明区；人物完整、等比例、友好微笑；无盔甲、皇冠、宇航服、霓虹夜店、文字、Logo、水印或现实人物。
- 用途：四款首页卡片、游戏页与头像；`CelestialApp.addCharacter` 在运行时裁切 2×2 图集。

### 实体机柜控制件图集 v1

- CC Switch 原图：`art-source/ccswitch/gilded-pearl-control-atlas-v1.png`
- 透明后处理图：`art-source/ccswitch/gilded-pearl-control-atlas-cutout-v1.png`
- 尺寸：1254×1254；原图 RGB PNG，后处理图 RGBA PNG
- 原图 SHA-256：`e273d1e4369e9ee0c2fb82d1b70bb6f8be3d85f5cac41b187144f9e0341864a7`
- 透明后处理图 SHA-256：`26df9db689f68843a767945ee9271c4d31fe98077982f2e9ed75383eb37bb353`
- Response：`resp_0cfcd5ea81919af2016a95543c3b4487d08a912d0bd09337cc`
- Image call：`ig_0cfcd5ea81919af2016a95543da66487d0a0579343c15098bc`
- 完整最终提示词：`art-source/ccswitch/cabinet-control-atlas-request.json`
- 裁切资源：`cabinet_control_spin_v01.png`（555×515）、`cabinet_control_bet_v01.png`（583×297）、`cabinet_control_auto_v01.png`（389×490）、`cabinet_control_secondary_v01.png`（555×302）。
- 用途：SPIN 奶油珐琅旋钮、BET 酒红双实体键、AUTO 珍珠水晶球，以及 HOME/RULES/TURBO/PAYTABLE 统一酒红玻璃铭牌。
- 后处理：CC Switch 返回图将棋盘背景烘入 RGB；通过边缘连通区域识别并生成真实 Alpha，透明像素约 65.28%，再按四个独立控件裁切接入。
- 验收：酒红底合成边缘干净；无棋盘格残留、文字、Logo 或水印；按钮材质、比例、阴影与香槟金机柜一致。

### 实体赌场机柜嵌框 v2

- 文件：`art-source/ccswitch/casino-bezel-large-frame-v02.png`
- 尺寸：768×482，RGBA PNG；另有 384×241 与 192×121 的九宫格专用派生尺寸。
- SHA-256：`e4e14dd1d2ea777c2ff5b42b47fbdadc43895945f3d07f4420a6e925bd4aa42e`
- Response：`resp_01c8a000ef5620f8016a967488c17487d0b7fe08c9e4e9d2cd`
- Image call：`ig_01c8a000ef5620f8016a96748acfe087d0b5c635713b121c9c`
- 完整最终提示词：`art-source/ccswitch/casino-bezel-large-frame-v02-request.json`
- 用途：首页顶部、四张游戏卡片、标题栏、规则与赔率等大型面板。
- 后处理：从统一蓝幕提取真实 Alpha；三档尺寸分别服务高面板、卡片/轮播和薄标题栏，并选择珍珠灯之间的单像素直线作为九宫格拉伸区，避免灯珠与金币被拉长。
- 验收：已弃用四角独立大金币的 v1 相框；v2 为酒红玻璃、香槟金金属、象牙珐琅和连续珍珠灯组成的真实机柜嵌框，无文字、Logo、水印或蓝边。

### 首页内嵌老虎机屏幕 v1

- 文件：`art-source/ccswitch/home-embedded-slot-screen-v01.png`
- 尺寸：1536×544，RGB PNG。
- SHA-256：`110620a5cf39475dc9a060599f3673a307f7c7f00848c9c5bbe1b90870e407fc`
- Response：`resp_058494b8bec86512016a967488d51c87d08ae43d62e3f5f1e3`
- Image call：`ig_058494b8bec86512016a967489fd5c87d0994ebe2adabff3fc`
- 完整最终提示词：`art-source/ccswitch/home-embedded-slot-screen-v01-request.json`
- 用途：首页顶部轮播屏；左侧保留高对比文字区，右侧呈现真实五轴转鼓、金币、珍珠与宝石。
- 验收：移除四张柜机插画交叉淡入和右侧二次插画卡；无拼贴分缝、人物、文字、Logo、水印或货币符号。

### 四模式独立加载舞台 v1

- 珍珠舞台：`art-source/ccswitch/loading-fortune-stage-v01.png`，SHA-256 `639bdcccbce286658278ea5013276b9b8ba701f95679b7cd7e63bab7803e14a3`，Response `resp_0107fad3c4d55f20016a967aa0f09c87d08df98cb661fbcb9d`，Image call `ig_0107fad3c4d55f20016a967aa2873c87d09ff462987b14c6fe`。
- 金币花园：`art-source/ccswitch/loading-coin-garden-v01.png`，SHA-256 `a510fbaff52509c26cfa3a73152966d9adbdf7d72765e1a412cc7904e379fb31`，Response `resp_003cee030029dea7016a967d258ce087d08e5b3e54e0b619dd`，Image call `ig_003cee030029dea7016a967d275efc87d09bedaf86adbdab0e`。
- 红宝石经典舞台：`art-source/ccswitch/loading-gem-classic-v01.png`，SHA-256 `216b80033efcb7ca6386992d1c955c68c1859a92d5e1a8cbd56db90a98b711c2`，Response `resp_020291872a72bdff016a967d256b8c87d087dea3b60fe850f8`，Image call `ig_020291872a72bdff016a967d27f64487d09e6c5f82fda161ee`。
- 钻石翡翠晶宫：`art-source/ccswitch/loading-diamond-vault-v01.png`，SHA-256 `7d28f55bacff3a4cdc412d592d3d5d78dc3892df1bf25a25f5f7badb35bbc2b5`，Response `resp_03ba21af9c82687d016a967d25fba887d0a2f99c51dfde6f6d`，Image call `ig_03ba21af9c82687d016a967d285e2887d0b2fe7dcf478d3f59`。
- 完整提示词：对应的 `art-source/ccswitch/loading-*-v01-request.json`。
- 接入：`assets/resources/generated/common/loading_*_v01.png`；四款加载页分别绑定不同背景、标题、吉祥物、奖励图和动态进度。
- 验收：四张图均为 1024×1536 RGB PNG；无柜机、转轴、控制台、文字、Logo 或水印；中央留白足够承载动态 UI。

### 珍珠结算翅膀 v3

- CC Switch 原图：`art-source/ccswitch/jackpot-pearl-stage-v03.png`，SHA-256 `5dcd1222e8406dfa6316ce3c8925fef9c83ead4602eac09306e49ecf2d611ef8`。
- 透明接入图：`assets/resources/generated/common/jackpot_pearl_stage_v03.png`，SHA-256 `263b1cdd2ac10443a730aa8b5759432e4dceb5fd0bb34427df7696b030d3e8e8`。
- Response：`resp_08591fec58ecc641016a967d24c33087d0bf2258c2a50a0760`；Image call：`ig_08591fec58ecc641016a967d270f2887d0b37e18483973886f`。
- 完整提示词：`art-source/ccswitch/jackpot-pearl-stage-v03-request.json`。
- 后处理：从统一蓝幕提取真实 Alpha，中央结算文字区完全透明；移除 v2 的红色圆盘、红黑阴影和重色底板。
- 验收：1536×1024 RGBA PNG；珍珠白珐琅、香槟金、钻石与祖母绿材质清晰；配合白金玻璃光晕、放射光和金币粒子使用。

## 备用资产

### 深色大奖宝库背景 v1

- 文件：`art-source/ccswitch/gilded-pearl-vault-background-v1.png`
- 尺寸：1024×1536，RGB PNG
- SHA-256：`1d0020543f64ad93613421cc77659c6528e0adec528070ce36546b0495d97912`
- Response：`resp_0b87e605b9efc27a016a953eae9dcc87d0b2c35d7ffe4045d6`
- Image call：`ig_0b87e605b9efc27a016a953eafe57087d0b662a752c46fdac3`
- 完整最终提示词：`art-source/ccswitch/background-vault-request.json`
- 状态：作为大奖/功能场景备用；因用户要求“柔和、不要太庄重”，未作为全局主背景。

## 接入映射

- 主背景已复制到 `assets/resources/generated/{common,login,home,game01,game02,game03,game04}` 对应运行时路径，保留原 Cocos `.meta` UUID。
- 图集已复制到四款游戏的 `symbol_atlas_v02.png` 与 `symbol_atlas_cutout_v02.png`，由 `SymbolAtlasCache.ts` 按统一财富语义映射。
- 主持人图集已复制到四个既有角色资源路径并保留 `.meta` UUID；运行时按角色槽位裁切。
- 实体控制件图集已裁切到 `assets/resources/generated/common/cabinet_control_*_v01.png`；运行时保持原比例装入控制台，并叠加接触阴影、呼吸/悬浮和物理按压反馈。
- 一次并发图集请求遇到上游 HTTP 504；在背景请求完成后单次重试成功，未对无效参数或内容错误进行重复提交。
- 一次透明背景编辑测试因上游缺少可用的图片上下文返回 `image_generation_user_error`，未原样重试；原始图经白底合成验证已有真实透明 Alpha，因此直接采用原始图集。
