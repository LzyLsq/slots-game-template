# CELESTIAL SPIN WORLD — 屏幕适配报告

验证日期：2026-08-31
运行环境：Cocos Creator 3.8.8 Web Mobile Release / Chromium

## 本轮修复

- `SafeAreaAdapter` 根据窗口比例动态选择 `FIXED_WIDTH` 或 `FIXED_HEIGHT`。
- Web 运行时没有 `screen.safeArea` 时，使用完整 viewport 作为安全区；原生环境仍读取真实安全区。
- 监听窗口尺寸变化，重新计算可视设计尺寸、安全边距、背景 Cover 和页面层尺寸。
- 顶栏、底部导航和弹窗相对可视区域/安全区锚定。
- 超长屏扩展背景范围，核心游戏 UI 不被拉伸；平板采用横向留白。
- 横屏显示独立、全屏且高对比度的旋转提示。
- 生成背景保持 Cover 比例，不进行非等比拉伸。

## 实际截图矩阵

以下历史验证矩阵来自真实 Web Mobile 构建；仓库交付截图为 `完整游戏模版/游戏截图/CELESTIAL_SPIN_WORLD.png`。

| 视口 | 结果 | 截图 |
|---|---|---|
| 360×640 | 通过 | `astral_game_360x640_v3.png` |
| 540×960 | 通过 | `astral_symbols_energy_540x960_v4.png` |
| 540×1170 | 通过 | `astral_game_540x1170_v3.png` |
| 720×1280 | 通过 | `adaptation_astral_720x1280_v4.png` |
| 1080×1920 | 通过 | `adaptation_astral_1080x1920_v4.png` |
| 1080×2160 | 通过 | `adaptation_astral_1080x2160_v4.png` |
| 1080×2340 | 通过 | `adaptation_astral_1080x2340_v4.png` |
| 1170×2532 | 通过 | `adaptation_astral_1170x2532_v4.png` |
| 1242×2688 | 通过 | `adaptation_astral_1242x2688_v4.png` |
| 1440×2560 | 通过 | `adaptation_astral_1440x2560_v4.png` |
| 768×1024（4:3） | 通过 | `astral_game_768x1024_v3.png` |
| 1024×1366（平板） | 通过 | `adaptation_astral_tablet_1024x1366_v4.png` |
| 960×540（横屏） | 通过，显示旋转提示 | `astral_landscape_960x540_v3.png` |
| 390×844（主流手机） | 通过，商业图片化大厅/四游戏/大中奖 | `home_390x844_commercial_v5.png`、`astral_bigwin_splash_390x844_v5.png` |
| 540×960（宽屏手机） | 通过，卡片、Banner 与底部图片导航完整 | `home_540x960_commercial_v5.png` |

## 外围页面抽检

登录、首页、商店、奖励中心、排行榜和个人信息页均在 540×960 实际渲染检查。商业图片化升级后又复测 390×844 与 540×960：首页 Banner、四张动态图卡、3D 头像及底部图片导航均未越界；底部导航未覆盖内容，顶栏、长文本、商品卡、排行列表与个人资料卡均在可视区内。

## 验收结论

上述视口均未发现转轴、Spin、WIN、BET、Credits 被裁切，也未发现背景拉伸、符号越过遮罩或横屏误展示可玩界面。刘海/灵动岛的最终像素边距仍需在对应真机上复核，因为桌面 Chromium 不能完整模拟每款设备的物理挖孔形状。
