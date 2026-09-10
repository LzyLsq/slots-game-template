# F13 美术接入

制作方式：用户指定的 CC Switch，gpt-image-2 生成后裁切并接入 Cocos，未修改原 F8 工程。

本轮原创资源：四台独立柜机与背景、三组精雕主题按钮、丰收展馆、金库与荣誉场景、四幅独立主题封面、16 位柔和卡通成人头像。头像与封面生成提示见 `art-prompts/`。

转轴、柜机及按钮统一使用 1024×2304 图像坐标平面。封面与头像是独立图集，玩法沿用经过测试的四套数学逻辑。原始生成响应、弃用图和旧工程资料保存在工程之外，避免进入发布包。

动态效果由 Cocos 实时渲染：转轴内粒子池与符号浮动、金属边缘裁切扫光、底座呼吸光、按键下沉回弹。减少动态效果模式关闭装饰动画。

## 柔和风格更新

CC Switch 生成的奶油金大厅、四个服务场景、圆润图标与框体、四台柜机风格编辑及 16 格转轴符号已接入。对应提示保存在 art-prompts。所有图集按实际输出尺寸处理，深色底被移除为透明图层。大厅插画用圆角遮罩裁入边框，标题独占底部区域。

主界面原深绿珐琅已改为暖玫瑰棕，保留金边与透明度；标题采用深焦糖色，绿色仅保留在果园等主题装饰。

最终接入：四套不同轮廓的主题按钮；图集按独立连通主体裁切并留透明安全边距；柜机中心 1024×2304 坐标保持不变，CC Switch 延展原图至 1536×3072，并固定中心柜机像素；背景与柜机使用单张图片、同一变换，不再有独立铺底层；大厅四个入口嵌入同一展示墙的窗口；Apple 标志与文案组合居中。

柜机强化效果：18 段顺序灯光、8 路按主题运动的玻璃仓反射、落轴灯光反馈。大奖演出分为 20× BIG、50× MEGA、100× EPIC，支持跳过递增和收尾；演出只展示已经结算的金额。

### Cabinet celebration variants — 2026-09-10
All four cabinets now pass their theme into the shared BIG/MEGA/EPIC stage. Existing clean symbol artwork supplies mint coins/bullion, vault safe/keys, orchard fruit/wheat, and festival lantern/ribbon accents. Theme objects animate alongside the original treasure hero; typography and amount stay anchored. Cabinet lower chambers now contain bounded physical symbol motion with higher energy during spinning/presentation. Reduced motion hides chamber particles and freezes celebration accents.

Verified each cabinet through a local debug forced-award spin (normal settlement/reel/feature/presentation flow), including reveal, dismiss, return to idle and no second wallet credit. Normal game probabilities and the 20×/50×/100× celebration thresholds are unchanged. Reference screenshots: `screenshots/big-win-{game-id}.png`.
