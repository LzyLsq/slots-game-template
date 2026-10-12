# F17 吉祥物分层动画试做

验证日期：2026-10-09。

## 范围

只替换 F17 大厅第一张 Ruby Dunes 卡片及复用该卡片的游戏加载图。
其他卡片、柜机及 F13–F33 其他项目尚未套用这套分层动画。
原始 `assets/resources/art/caravan-card-0.png` 保留，未覆盖。
未改账号、登录、内购、中奖概率、原生桥、签名或 App 图标。

## 素材与动画

按用户要求，使用 CC Switch 当前 Codex 提供商，通过 imagegen CLI 的
`gpt-image-2` 生成无猫背景与透明角色部件，未修改 CC Switch 配置。

- 原生成图片和提示词：`output/imagegen/ccswitch-f17-cat-*`。
- 实际使用：`ccswitch-f17-cat-background-v1.png` 和
  `ccswitch-f17-cat-parts-v2-chroma.png`。
- 文件名虽带 `chroma`，图片实际已有 alpha；未按 RGB 颜色抠图。
- 处理脚本：`art-source/prepare-cat-rig.py`，依赖 Pillow。
- Cocos 源素材：599×599 静止背景、768×512 透明部件图集。
- 六个部件：身体、睁眼头、闭眼头、尾巴、露出的耳朵、头巾吊穗。
- 动画：脚固定，胸口轻微呼吸，颈部转动，眨眼，耳朵抽动，尾巴与吊穗独立摆动。
- 背景不位移；第一张卡片不再同时使用旧的整体浮动或 UV 动画。
- 不新增触摸监听、定时器或独立材质；后台暂停、减少动态效果和事件清理均已处理。

实现位于 `CaravanCatRig.ts`、`CaravanCatPose.ts`、`SalonArt.ts` 和
`AureliaApp.ts`。当前是透明 Sprite 部件动画，不是 3D 模型，也不是完整骨骼变形。

## 验证与交付

已通过：

- `node --import tsx tools/cat-rig-test.ts`
- `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`
- `node --import tsx tools/layout-test.ts`
- `npm test`
- 仓库根目录执行 `node tools/lively-optimization/build-all.mjs 17`
- WebP 压缩，PNG 回退保留，透明图集的 alpha 保留。
- `node tools/lively-optimization/verify-native.mjs 17`：本地资源服务器测试和
  Debug iOS Simulator 编译均通过，未签名。

Creator 自带 sharp 缺少 detect-libc，压缩验证使用已安装的 bundled sharp，
未更改 Creator 或全局软件。可用以下覆盖重试压缩：

```sh
SHARP_MODULE=/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp \
node tools/lively-optimization/build-all.mjs 17 --compress-only
```

新增图集 WebP 为 77,220 字节，背景 WebP 为 90,340 字节。
这些是文件大小，不是运行内存；未进行真机帧率或内存测量。
已核对新 WebP 在 H5 构建目录和 Xcode 包中的字节完全一致。

H5 交付：`build/web-mobile/`。
已同步的 Xcode 项目：

`Xcode_H5/F13-F21_20260914/F17_Golden_Caravan_OC_StoreKit2_Xcode/DBGame/GoldenCaravanH5.xcodeproj`

浏览器验证：F17 大厅正常显示，无观察到的拼接重影；运行日志未记录 error/warn。
竖屏截图：`output/imagegen/f17-cat-rig-portrait-a.png`（闭眼）与
`output/imagegen/f17-cat-rig-portrait-b.png`（睁眼）。
本次未推送 Git，未验证真机安装或 App Store 发布。

本次临时构建日志：

- H5：`/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.XmlrqD/F17.log`
- WebP：`/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.sZQpkp/F17-webp.log`
- 原生：`/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-native.uccJQB/results.json`
