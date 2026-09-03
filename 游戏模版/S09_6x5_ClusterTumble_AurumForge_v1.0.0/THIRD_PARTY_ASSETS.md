# Asset provenance

S09 Aurum Forge 的铸造厂机柜、9 个熔金/宝石 Symbol、6 个功能图标和获奖舞台，均通过用户指定的本机 CC Switch Responses 图像生成接口制作，并在本地完成抜图、切分和边缘检查。

- 生成模式：CC Switch Responses `image_generation`
- 请求模型：`gpt-5.6-sol`
- 质量：`high`
- 完整请求：`art-source/ccswitch/*-request.json`
- 生成与运行资源索引：`S09_ASSET_PROMPTS.jsonl`
- 游戏终版资源：`assets/resources/theme/aurum-forge/`

原始 atlas 使用纯色品红背景，本地处理后生成透明通道，透明像素 RGB 已清空，避免移动端采样出现品红、绿色或黑色矩形边缘。
