# 原创资源清单

F28 的新生成图片已接入实际 Cocos 构建；未复制旧项目图片。以下保留生成过程与发布前授权核验边界。

2026-09-20：内置 image_gen 两次请求 Treasure Regatta 码头场景，没有返回可用图片或本地文件。未擅自改用收费 API，也没有宣称资源生成成功。

随后用户明确指定“cc switch生图”。只读使用本机 CC Switch 当前启用的 Codex provider，将其端点和凭据仅传入生图子进程环境，通过技能自带 `image_gen.py` 调用图片接口。未修改 CC Switch 配置、未把凭据写入项目或输出日志。请求模型 `gpt-image-2`，high quality，PNG，1024×1536。模型名称为请求参数，不代表独立核验了供应商后台实际模型。

| 文件 | 来源 / 提示 | 检查与状态 |
| --- | --- | --- |
| `output/imagegen/f28-marina-v1.png` | 本次新生成；`docs/art-prompts/marina-v1.txt` | 成功解码，1024×1536；已目视检查。四船主题明确，但左船贴边，细节偏写实；作为迭代参考，不直接认定为最终大厅。 |
| `output/imagegen/f28-marina-v2.png` | 以本次 v1 为参考编辑；`docs/art-prompts/marina-v2.txt` | 成功解码，1024×1536；已目视检查。四船完整，前景杂物减少，下方操作区域更清楚。侧边余量仍小于提示要求，实际适配不能直接 cover 裁切；尚未验收手机比例、入口热区、文字覆盖及动态拆层。 |

商用状态：保留生成来源和提示，不将生成成功等同于商业授权审查完成。供应商适用条款及发布授权仍须核验。

## 已接入资源

生产资源均位于 `assets/resources/art`；生成源图及迭代记录位于 `output/imagegen`，不随 Cocos 资源包发布。

| 运行资源 | 本次生成来源 | 加工与用途 |
| --- | --- | --- |
| marina.jpg | f28-marina-v2.png | 码头连续场景，用于登录、大厅和资源准备页 |
| club.jpg | service-room.png | 会所航海日志场景，用于账户、记录、奖励和供应页 |
| captain/pearl/cargo/reef-scene.png | 对应 room 图延展为 scene 图 | 柜体及背景一张连续图，统一世界缩放；各自内框绑定转轴 |
| captain/pearl/cargo/reef-symbols.png | 对应 symbols 源图 | 各六枚独立主题符号，1152×768，384×384 单格；不混用模式符号 |
| plaque/coin.png | controls.png | 保留信息牌与金币；四张早期纯色按钮裁图已从资源包移除，由主题功能部件替代 |
| title.png | title.png / title.txt | 新生成透明品牌标题，登录、大厅与加载中保持原始比例 |
| helm-controls.png | helm-controls.png → helm-controls-key.png；helm-controls.txt、helm-controls-key.txt | 六个新生成船舶控制部件：舵轮、贝珠、宝箱、珊瑚四主操作，以及绞盘 Auto、摇杆 Turbo。首图未遵守底色要求，另行编辑为品红再抠出 alpha；1024×768 运行 atlas，每格 512×256，保留透明边距，未挪用旧项目图标。 |
| harbor-controls.png | harbor-controls-key.png → harbor-controls-clean.png；harbor-controls.txt、harbor-controls-clean.txt | 十二种原创功能部件：登船票、箱锁、领奖台、货物单、护照、返港柄、航海日志、仪表拨钮、确认封印、取消扣、加注滚轮、翻页签。经 CC Switch 技能 CLI 请求 1536×2048 high；供应商实际返回 1086×1448，未将请求尺寸冒充实际分辨率。首图有杂边，编辑清理后提取 alpha，等比打包成 1536×1024 atlas，每格 512×256。 |
| pearl-console.png | `pearl-console-v2-key.png` → `pearl-console-v2-alpha.png`；`docs/art-prompts/pearl-console.txt` | 本次专门重制的母贝珠宝盒控制部件：珍珠圆键、贝扇 Auto、珍珠摇杆 Turbo。CC Switch 响应 `resp_0588baeb4b2437c1016aaf92ec8bb087d29453630fe5b8e23e`。 |
| cargo-console.png | `cargo-console-v2-key.png` → `cargo-console-v2-alpha.png`；`docs/art-prompts/cargo-console.txt` | 本次专门重制的翡翠保险柜控制部件：锁芯主键、机械推杆 Auto、玉柄 Turbo。CC Switch 响应 `resp_00d09d635ddbd69c016aaf92ed67c887d2857e765885269e44`。 |
| reef-console.png | `reef-console-v2-key.png` → `reef-console-v2-alpha.png`；`docs/art-prompts/reef-console.txt` | 本次专门重制的海蓝水晶/珊瑚控制部件：水滴加减、流体 Auto、鱼鳍拨片 Turbo。CC Switch 响应 `resp_0c4d26dce168cb08016aaf92ed4e2887d184cc9173dc1b8d41`。 |

三套 v2 控制源图均以连通 alpha 区域独立提取，随后由 `tools/pack-console-controls.py` 等比打包；运行图集坐标在 `assets/resources/art/console-frames.json`。检查图 `output/playwright/console-atlas-v2.jpg` 用于确认没有邻格污染、矩形底或意外裁入其他部件。Captain 保留同一批次的红珊瑚漆面与黄铜机械部件，不把 Pearl/Cargo/Reef 的 v2 部件回套到 Captain。

保留控件源图裁切区域（左、上、右、下）：plaque `(540,570,1100,850)`，coin `(1130,526,1480,882)`。低于32的alpha杂点清理后按非透明包围框收紧，防止带入邻格或薄边。2026-09-20 引用检查后，未使用的 coral/ivory/jade/blue PNG 及对应 meta 移至本机废纸篓 `F28-retired-controls-20260920`，不随构建发布；生成源图保留为来源记录。

音频：`tools/make-audio.py` 原创合成 press、launch、stop、win、collect、marina 六个片段，无外部采样；生成至 `assets/resources/audio`。音乐和音效分别开关，后台暂停。文字使用平台字体栈，未引入未授权字体文件。

以上是来源与技术接入记录，并非第三方供应商商业条款的法律担保。公开发行前仍须核实供应商条款及生成素材使用条件。

2026-09-20 控制台补充：依照用户“按钮要有特色，不能只是单纯的按钮”要求，经 CC Switch 当前 Codex provider、技能 CLI 请求 gpt-image-2 high 生成与背景编辑；使用技能 remove_chroma_key.py 保留镂空 alpha，再由 tools/pack-helm-controls.py 等比收紧打包。主操作保持英文 SPIN/SKIP 状态；装饰、材质和文字一起按压，固定热区不跟随形变。新增图源及提示均留在本项目。

“所有按钮都要有个性”补充：十二种功能部件用于大厅、导航、登录、账户、商店、奖励、设置、规则和确认弹窗；同类操作保持同一语义，不随机更换图标。装饰原生高度缩放后，只拉伸中部空白，防止九宫格固定边距挤压文字。按钮文字与材质共用按压载体；触控层不缩放，拖动超过阈值立即取消。

首张场景提示：Portrait production illustration, cheerful luxury cartoon treasure marina, four distinct gold-trimmed jewel-colored treasure yachts around a curved ivory wooden pier, turquoise water, embossed treasure coins and chests, apricot sky, coherent upper-left sunlight, rounded polished materials, free sky for title and pier for controls, no text/UI/watermarks, no dark pirates, scene continuous to every edge.
