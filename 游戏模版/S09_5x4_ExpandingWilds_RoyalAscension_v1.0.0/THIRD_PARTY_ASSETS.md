# Asset provenance

S09 的皇家机柜、9 个珠宝/金币/宝箱 Symbol、6 个功能图标和皇家获奖舞台，均通过用户指定的本机 CC Switch 图像 API 生成，并在本地完成透明合成与边缘检查。

- 生成模式：Imagegen CLI/API fallback（用户明确指定 CC Switch）
- 模型：`gpt-image-2`
- 质量：`high`
- 提示词清单：`S09_ASSET_PROMPTS.jsonl`
- 游戏终版资源：`assets/resources/theme/royal-ascension/`

部分图片由上游直接返回透明 Alpha；其余图片使用纯色品红背景并按色相生成透明通道。透明像素会清空 RGB，避免移动端纹理采样产生品红或黑色矩形边缘。

正式游戏不得引用原始色键图、带棕色方底的旧按钮或带绿色残边的旧奖励框。金光、金币雨、转轴拖影和余额金币流使用 Cocos Creator 运行时图形生成。
