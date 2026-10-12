# F38 素材与复现

## 位图

保留 19 张有效源图：4 张原始 `art-source/portrait/` 柜机、10 张大厅／登录／服务房间及符号、角色、按钮、标题、面板、奖台、宝物图集、1 张独立招财狐狸源图，另含 4 张 `art-source/expanded/` 同相机扩景原画。生成提示词保留在 `art-source/prompts.jsonl`、`art-source/portraits.jsonl` 与 `art-source/expanded/prompts.jsonl`，不包含凭据；生成请求响应与重复旧柜机不交付。

- 柜机原图 836×1881；等比 cover 为 1024×2304，少量横向裁切，**不是拉长**。
- 扩景原画实际 1448×1086（请求3072×2304，但返回不是该尺寸）；实测排除生成图中发生偏移的整段柜机轮廓，只取左右建筑／财宝部分，均匀采样打包为1024×1152。**原柜机中央像素和全部按键／转轴几何不变**。平板侧边不再把24像素条带拉宽；两侧采样与柜机同相机、同比例，不是虚化背景。极宽窗口超出完整侧景时，仅对侧景作等比反射，不重复柜机。
- 房间原图 1024×1536；等比 cover 为 1024×1920，会裁两侧，不是虚化或平铺旧柜机。
- 多数图集约1254×1254，标题1024×1536，面板／奖台1536×1024。放大不增加原画细节，不宣称4K源图。
- 符号为 native alpha，保留合法翡翠绿色；16格图集含透明间隔与模糊图集间隔。
- 按钮取最大连通主体去除邻格碎片；柜机按钮直接提取原画按键座。标题按非等距原画边界单独裁切并去除邻行碎片，保留完整皇冠。角色按比例缩放、保持脚底位置。
- `docs/art-manifest.json` 记录实际输出尺寸；`docs/qa/art-crops.json` 记录像素裁剪验收。
- 少量通用光学纹理／Apple标识复用基础设施；不把这些辅助素材称为本次新生成角色。

```sh
python3 -m venv /tmp/f38-art-env
/tmp/f38-art-env/bin/pip install -r tools/requirements-art.txt
/tmp/f38-art-env/bin/python tools/prepare-gala-art.py
/tmp/f38-art-env/bin/python tools/symbol-cutout-test.py docs/qa/art-crops.json
```

素材已经处理好；只有需要重处理时才执行上述命令。编辑器会为新导入图片生成 .meta，交付的现有 .meta 保留 UUID。

## 2026-10-12：全部改为动物吉祥物

- 红金招财狐狸替换真人主持：大厅／柜机共用同一角色身份，但采用不同局部动作；16头像图集的4个相关单元全部从当前狐狸重建。其余角色为金狮、福象、金牛。
- 狐狸原始透明源图 `art-source/guardian-ruby-royale.png` 为1056×1514；实际运行图为721×1040。图集原真人单元已清为透明，不保留供制作流程重新导入的真人原画。
- 使用本地CC Switch配置通过原装ImageGen CLI生成，模型 `gpt-image-2`、high、请求1024×1536、native alpha；返回尺寸与请求不同，按实际文件记录，不宣称4K。完整提示词、处理方式及源哈希在 `art-source/animal-mascot.json`，无凭据。
- 制图工具优先读取独立 `guardian-{id}.png`；透明补边、等比缩放和实际狐狸头部头像裁切可复现，不能恢复旧人图。
- 新素材／原画／头像像素审计：`docs/qa/animal-assets-20261012.json`。编译输出的alpha与所有可见RGB逐像素等于当前源资源，见 `docs/qa/animal-build-20261012.json`。Cocos导入会处理不可见像素和PNG编码，因此不能只比较文件SHA判断图像是否一致。

## 音频

`assets/resources/effects/manifest.json`：93个AAC。没有打包系统音色库、临时PCM或模型请求。原创编曲不等于音源许可自动通过，发行方需核查生成素材与采样音源的商业使用条件。

复现依赖 macOS AVFoundation／CoreAudio、Swift、afconvert 和 NumPy：

```sh
mkdir -p /tmp/f38-audio/raw
node --import tsx tools/compose-soundtracks.ts /tmp/f38-audio/scores.json
swift tools/render-instruments.swift /tmp/f38-audio/scores.json /tmp/f38-audio/raw
python3 tools/master-audio.py /tmp/f38-audio/raw assets/resources/effects /tmp/f38-audio/scores.json
python3 tools/render-feedback.py assets/resources/effects
python3 tools/audio-asset-qa.py assets/resources/effects docs/qa/audio-assets.json
```

5首背景曲、40个演出／收尾段采用本机采样乐器离线渲染；其余48个短音效为离线合成。技术验收包含解码、非静音、峰值、接缝、起音与高频能量；**尚未完成耳机／扬声器主观试听及真机音频验收**。
