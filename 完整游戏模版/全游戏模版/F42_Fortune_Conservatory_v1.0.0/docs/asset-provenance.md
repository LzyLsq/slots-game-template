# F42 资源记录与发行边界

## 本轮红金招财美术（2026-10-13）

- 选用图像通过用户指定的本地 CC Switch/API 路径生成，模型 `gpt-image-2`，质量 `high`。原画和选用提示词保存在 `art-source`；没有使用网络搜图或把 CSS 几何图形当作新角色、柜机或雕刻按钮。
- 四张 `tiger-festive-mobile.png`、`koi-festive-mobile.png`、`crane-festive-mobile.png`、`tortoise-festive-mobile.png` 的实际原生尺寸均为 **1024×1536**。主题分别为红衣白虎捧金锭、红白锦鲤举铜钱、锦袍仙鹤托金盘、金龟守宝；吉祥物、雕刻柜机、金币、房间与落脚平台在同一张图里统一生成和照明，屏幕、标题与台面预留实时 UI 位置。
- 四张 `*-festive-outpaint.png` 为同一原画向上、下、右延伸的室内景象，实际 API 返回尺寸均为 **1374×1145**，不是原生3K。新的第一轮扩图使用透明外区，避免保留旧稿头部或耳朵；仙鹤再做上方穹顶与侧边的定向建筑衔接编辑。制作时对扩图全宽的顶部256像素做离线调和边界光照衔接，保留建筑纹理与轮廓，再逐像素恢复完整原生肖像；不是模糊处理、运行时阴影或渐隐遮缝。未采用会移动建筑或重绘角色的追加编辑结果。`tools/prepare-scenes.py` 将环境整理到 **3072×2560工作栅格**，在 `[0,256,1024,1536]` 恢复原生肖像细节。没有柜机拉长、第二张大厅背景、镜像延伸、黑影或运行时渐隐遮缝。
- `guardians-festive.png` 的实际尺寸 **1254×1254**，包含四种完整大厅角色，具有原生 alpha。角色/头像只做主体连通域清理与紧凑裁切，保留原始透明度和白色毛羽；不全局把白色删掉。大厅、登录、头像及应用图标同步使用本轮新角色。
- `controls-mechanical-v3.png`（1254×1254）及 `controls-spin-left-v4.png`（1774×887）用于固定金玉镶嵌框、四种专属雕刻旋转按钮、独立按压面和长比例主按钮；新 `utility-festive.png`（1254×1254）提供完整圆形红金雕刻环与象牙珠光压面，不沿用被裁掉顶部的旧圆框。
- `panels-festive.png`（1536×1024）提供红金玉石雕刻边框、行条、说明卷轴、输入框和滑轨；九宫格切片保持雕刻边缘比例。说明文字为两侧玉石柄预留安全区；最小横屏柜机的 BET 改为上下两行，避免金额和标签出框。
- 标题、符号、财富粒子及奖励舞台使用本项目选用原画图集。运行包包含 **84张 WebP 和1张应用图标 PNG**。`assets/art/manifest.json` 记录源图、图集区域、裁切、尺寸及场景保护区；`docs/asset-audit.json` 保存资源哈希。放大工作尺寸不作为原生清晰度声明。
- 本轮移除明确弃用的柜机草案、旧角色、旧圆框与临时修复源；保留当前选用原画/提示词以便再现。项目内不保存 CC Switch 凭据或 API 密钥。美术仍需最终发行方独立完成艺术和权利核验。

## 完整角色与自然招财动作

- 大厅人物使用完整连续 RGBA 图，不拼接独立手臂；白虎、仙鹤、金龟以足部锚定做克制呼吸变化，锦鲤轻微浮游。
- 柜机动作使用 `guardian-rig.json` 的原生像素关节、精准肢体提取及四张 `*-festive-guardian-repair.png` 的局部遮挡修复。API 编辑会改变未选择区域，因此 **只采用被活动肢体遮挡的区域**；不把修复图当整台柜机替换。`tools/prepare-guardian-rig.py` 可再现处理结果。
- 身体、脚底、金币托盘、柜机和房间不整体摇晃；肩根锁定，四种角色使用不同节奏的局部招财动作及活动状态渐变。关闭动态或 WebGL 不可用时使用原始完整柜机静态场景，不露出空袖或被删肢体。
- 这些是图像局部形变和完整图轻微运动，不是新绘逐帧人物或完整3D骨骼动画，不能宣称为真实逐关节重绘。
- `docs/guardian-audit.json` 与 `docs/screenshots/guardian-motion.jpg` 保存真实浏览器动作阶段采样。最终审计指纹覆盖实际美术/音频字节，防止同名替换图片后沿用旧 QA；它们仍不能替代最终人工艺术验收或真机检查。

## 音乐与反馈

共36个 AAC/m4a 文件：

- 5首背景曲：lobby、tiger、koi、crane、tortoise，各有独立旋律、拍号/配器组合。
- 11种反馈：tap、select、bet、toggle、confirm、error、spin、stop、coin、collect、feature。
- 每个场景主题4种奖励曲：normal / big / super / mega，共20首。

`tools/compose-audio.py` 编写原始音符谱；`art-source/scores.json`、`audio-loops.json` 保存谱与循环信息。`tools/render-instruments.swift` 使用本机 Apple `gs_instruments.dls` 乐器音色离线渲染；**该音色的发行授权核验未完成，未附授权证明**。不可仅根据旋律自编就声称整段录音权利已清。

`tools/master-audio.py` 完成直流偏置清理、轻微空间反射、循环尾部处理、响度/峰值控制与 AAC 编码。各文件实际秒数、峰值和 RMS 在 `assets/audio/manifest.json`。原始 WAV 是可再现临时文件，交付只保留 m4a 与乐谱，不保留94MB重复 WAV。

macOS 再现步骤（需要 Python Pillow/numpy、Swift/AVFoundation、afconvert）：

```sh
python3 tools/prepare-art.py
python3 tools/write-geometry.py
python3 tools/compose-audio.py
swift tools/render-instruments.swift art-source/scores.json art-source/audio-raw
python3 tools/master-audio.py
```

运行时首次用户操作解锁声音；切换曲目淡化，稳态只保留当前一首 BGM，奖励时降低背景音乐；反馈声有并发与转轴停止音节流；独立预解码不让点击等待所有演出音乐，超过180ms的滞后点击丢弃，共享soft-knee压缩总线缓和多声叠加。隐藏页面暂停声音。实际人工试听和设备扬声器检查尚待完成。

## 尚未完成的生产发行内容

1. 原生 iOS 包装、真机适配及平台审核；当前只有 Web 模板。
2. 目前具备本机 Apple 内购桥接接口与验证、幂等发币测试，Web 中没有原生桥接时禁用购买；仍需真实 StoreKit 实现、商品配置与原生交易验证。
3. 在线账户、在线榜单和可信服务器结算；当前 IndexedDB 本机档案不提供服务端防篡改。
4. 系统音色授权核验、最终美术与人工音频验收。
5. 实际商店材料及隐私声明；当前本机说明不等于完成平台申报。

不得将上述未完成事项写成已验证或保证能上架。
