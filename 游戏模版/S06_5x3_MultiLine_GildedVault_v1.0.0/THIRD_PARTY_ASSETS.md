# Asset provenance

S06 的主机柜、标题艺术字、珠宝/COIN/WILD/SCATTER/BONUS 符号、控制按钮和奖励美术，均为本项目通过用户指定的本机 CC Switch 图像 API 生成并针对 Cocos 透明合成处理的原创位图素材。

源生成纪录位于开发工作区：

- `output/imagegen/s06-gilded-vault`
- `work/s06-gilded-vault/imagegen`

正式游戏仅引用 `assets/resources/theme/gilded-vault/` 下的终版资源。

## 透明处理注意

品红底符号使用低容差硬抠图，以保留红宝石和暗金边缘：

```text
--key-color #FF00FF --tolerance 18 --edge-contract 1 --edge-feather 0.5
```

不得使用带黑色烘底、暗色矩形边缘或高亮过曝的版本。程序化金光、金币雨和粒子使用 Cocos Creator 运行时图形生成。
