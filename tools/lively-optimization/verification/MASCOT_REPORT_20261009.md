# 吉祥物分层动作验收记录（2026-10-09）

## 本次实现

使用用户指定的 CC Switch 当前 Codex provider，通过 imagegen 官方配套 CLI 的 `gpt-image-2 edit` 生成角色分层素材。未切换 provider、模型，未修改 CC Switch 配置或 CLI；密钥未写入工程。

独立头部包含双耳、冠帽或羽冠，配合低幅度转头；只有原图睁眼且两帧轮廓匹配的角色才短眨眼。原本闭眼笑的角色保持原表情，不切换眼睛帧。静止层保留身体、柜机、背景、文字和原点击区。不是让整张背景卡片来回漂移，也不是完整身体骨骼动画。生成素材有轻微绘画差异；不承诺像素级还原角色面部。

- `LivingMascotRig.ts`：预加载、单次共享请求、20 秒超时/静态回退、迟到结果保护、帧缓存、后台/减少动态暂停、生命周期清理；动画 tick 不创建新节点或帧。
- F17 另外保留 `CaravanCatRig` 的六部件角色动作。
- F17/F23 固定浮雕柜机、F29 当前翡翠柜机：宝石星闪装饰，柜体/雕刻不扭动，不在这里硬贴与美术不符的动物。
- F29 当前大厅实际使用 `portraits` 首行四个头像，不使用旧 `canopy-destinations`。新增四条对应数据；旧八条资源保留，未计作当前画面覆盖。
- F29 合成只擦除头部轮廓，先将生成背景的圆框配准原圆框，保留其余边框、身体、尾巴、围巾及另外十二个头像。五姿态复核：原图/静止/眨眼/左右最大倾斜。

## 范围

| 项目 | 这次独立头层覆盖 | 柜机处理 |
| --- | --- | --- |
| F15 | 蜜蜂、狐狸大厅卡及对应柜机 | 蜜蜂、狐狸局部转头；桃/锦鲤主题没有新增活体头层 |
| F17 | 大厅三张主题卡；另有六部件猫角色 | 四个固定浮雕柜机星闪，撤掉整块浮雕 UV 扭动 |
| F18 | 三个有角色的柜机 | 局部头层，保留第四台静物风格 |
| F19 | 大厅金猪与三个动物柜机 | 三个动物局部头层，固定背景与布局 |
| F21 | 四张大厅目的地卡、四个动物柜机 | 四个柜机独立头层 |
| F22 | 四张大厅目的地卡、四个仙灵柜机 | 四个柜机独立头层 |
| F23 | 四张大厅目的地卡 | 固定浮雕星闪，未加活动雕塑头层 |
| F25 | 四个大厅角色、四个柜机角色 | 源码已接入并构建，正常入口年龄确认需用户操作后验收 |
| F29 | 当前实际展示的四个圆框头像；保留八条旧素材数据 | 当前翡翠柜体对应五处星闪，未添加旧版动物 |

已注册并自动测试 54 条通用头层数据，其中 F29 的八条旧素材当前不展示。F20 保留之前的专门角色实现，不属于本次通用头层批次。

F13/F14/F16/F24/F30/F31/F33 的建筑、机械或雕刻，以及 F26/F27/F28 的船舶/主题静物未强套动物头层；保留前轮主题装饰。F32 本地没有项目。

尚未完成全量角色拆分的素材包括：F15 大厅双锦鲤、F18 登录背景熊、F19 大厅小角色/登录猫、F23 登录神灯精灵、F17 登录背景骆驼和兔。不能宣称 F13–F33 所有页面、所有角色都完成骨骼化。

## 检查与结果

- 用户指出 F15 柜机角色原本闭眼后，复核全部 54 条原图/静止帧：16 条闭眼表情关闭眨眼，37 条睁眼且轮廓合格的保留眨眼，1 条睁眼但轮廓不合格的保持静止脸。F29 的闭眼旧素材当前不展示。修正运行时门控，并在后续生成提示词、合成处理和安装工具中保留此策略；本次未重新生成角色图片或修改原眼睛表情。
- 新增回归断言：每条闭眼数据在完整眨眼周期内始终使用静止脸，但头部动作继续；安全标志失效时即使开启元数据过期也不切换帧。不能再把“两个闭眼帧互切”标作眨眼成功。
- 原图、分层合成、眨眼、最大左右倾斜的图片复核已做；修正过 F21 天鹅断颈、F22 错带挂牌/头部配准、F19/F25 水獭绿边及 F29 圆框被盖掉的问题。
- `node tools/lively-optimization/test-live-heads.mjs`：九款、全部 54 条数据通过。覆盖图集范围、重复绑定、静态回退/超时、全部条目固定布局、缓存复用、后台/减少动态、清理；三个浮雕项目无新增触摸拦截。F29 另检查真实 UI 使用 `portraits`、四头像数据、金框/围巾采样及其余十二头像逐字节不变。
- 九款原批次的 `npm test`、`tsc --noEmit`、Creator 网页构建及 WebP 通过。F29 新头像加入后再次执行项目全套测试和 TypeScript 检查，通过。
- 最新 F29 Creator 构建正常结束（工具返回码 36，但构建日志明确 success）。压缩初次因 Creator 自带 sharp 缺 `detect-libc` 失败，指定本机已安装的 sharp 重新执行后成功；没有新增工程依赖。
- WebP 保留尺寸和 alpha，并同步 Cocos ImageAsset 格式引用。仅更小的图片转 WebP，PNG 回退仍保留，不能说全部资源都是 WebP。
- 现有 F15/F17/F18/F19/F21 五个 OC 壳已同步完整网页构建，资源逐文件比对、本地服务器测试、禁签名模拟器编译通过。目录：`Xcode_H5/F13-F21_20260914`。未新建 F22–F33 的 Xcode 壳。
- 本轮闭眼策略修正后，F15/F17/F18/F19/F21/F22/F23/F25/F29 九款再次执行现有测试、TypeScript 检查、Creator 网页构建及 WebP 压缩，全部通过；五个已有 OC 壳再次同步并通过本地服务器测试、禁签名模拟器编译。源网页构建与 OC 壳对应资源共 1,141 个文件逐字节一致。

构建记录：

- `/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.TIqGWa/results.json`（原九款）
- `/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.WFeGSS/results.json`（F29 新头像构建成功、首次压缩失败）
- `/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.fOYUbz/results.json`（F29 压缩重跑成功）
- `/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-native.ahixdy/results.json`（五个 OC 壳服务器/编译）
- `/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.p6qVUe/results.json`（闭眼策略修正后九款构建/压缩）
- `/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-regression.hv40fU/results.json`（闭眼策略修正后九款类型/现有测试）
- `/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-native.WokFwz/results.json`（闭眼策略修正后五个 OC 壳服务器/编译）

## 浏览器画面复核

预览入口 `http://127.0.0.1:52575/`，选择游戏后通过“运行入口”选择大厅或柜机。以下截图保存在本报告同级的 `mascot-20261009` 文件夹：

- F17 大厅/柜机 2–4；F18 柜机 1–3；F19 柜机 1–4；F21 柜机 1–4；F22 柜机 1–4。
- F15 大厅/柜机 1/4；F23 大厅/柜机 1；F29 新大厅/新柜机 2。
- F25 只复核正常登录入口，没有替用户完成年龄确认。

上述浏览器复核期间控制台 error/warn 为空。截图验证外观，不等同于全量点击链路验收。

闭眼策略修正后的 F15 柜机 4：重新加载预览并选择柜机 4，实际画面确认为 FOX FIESTA；狐狸保持闭眼笑。最终截图为 `mascot-20261009/F15-cabinet4-closed-eye-fix.png`，控制台 error/warn 为空。首次选择后画面曾停留在其他页面，未计作柜机验收；重新加载后才保存最终正确画面。截图本身不能证明完整动作周期，闭眼不切帧和头部继续动作由逐条自动测试验证。

## 未验证与未更改

未测手机峰值内存、持续帧率、完整“SPIN → 返回大厅”操作链路、真机登录/内购或音乐主观试听。不能保证稳定 60 FPS、内存下降或可直接上架。

本次未修改概率、结算、登录、内购、原生 Bridge、签名或图标；未自动提交或推送 Git。

## 复用入口

新增同类角色需先查看原图并登记 `mascot-live-manifest.mjs`，生成并人工复核，才执行下面的处理链，不能把未展示的旧素材当成验收通过。

```sh
node tools/lively-optimization/prepare-live-heads.mjs 29
# 用 CC Switch 当前 provider 经 imagegen 配套 CLI 生成，每份提示词/参考图见工程 output/imagegen/live-heads
node tools/lively-optimization/process-live-heads.mjs 29
node tools/lively-optimization/review-live-heads.mjs 29
# 人工看五姿态后安装
node tools/lively-optimization/install-live-heads.mjs 29
node tools/lively-optimization/test-live-heads.mjs
SHARP_MODULE=/absolute/path/to/node_modules/sharp node tools/lively-optimization/build-all.mjs 29
```

生成提示词、参考图、版本化结果和五姿态图都保存在各工程 `output/imagegen/live-heads`，运行时只引用 `assets/resources/art` 下的最终图集与静止层。
