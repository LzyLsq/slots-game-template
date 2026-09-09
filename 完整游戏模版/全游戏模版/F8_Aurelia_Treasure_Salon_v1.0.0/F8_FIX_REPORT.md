# F8 修复与验证记录

日期：2026-09-09。仅修改 F8，不修改 F7，不提交或推送 Git。

## 主要问题与修复

1. 分离快照混入其他模板源码/构建：恢复四款 Aurelia 游戏并从当前源码生成网页。
2. 柜机、转轴与环境各自拉伸：使用 1024×2304 统一设计平面，保持原图比例并依据每款屏幕开口配置遮罩和控件位置。
3. 待机效果被不透明背景覆盖：环境光移至完整柜机图上方，增加屏幕反光、边框光斑和有边界的符号轻微弹性运动。
4. 窄面板纹理变形：生成专用读数纹理，九宫格保留装饰边角；标题裁切透明留白并等比显示。
5. Ruby 连消在浏览器中断：Cocos 将 Set 的展开编译成 concat(Set)，导致移除格子不是数字。改用 Array.from(Set)，并对动画入参和编译后结果增加检查。
6. 注册默认标签和输入异常：延迟激活 EditBox，修正标签锚点及网页输入所需样式策略；验证填写内容在查看和接受条款后仍保留。
7. 大奖透明画面后方读数重叠：庆祝期间隐藏柜机读数、按钮和提示，结束后恢复，不添加黑色遮罩。
8. 自然动效收敛：读数退场和恢复采用淡变；页面切换先淡出再淡入；宝箱由 94% 等比尺寸轻移入场，不再大幅弹出。待机符号保持原始比例，错峰微浮动；镜面扫光减速，金属光斑柔和渐显；金币采用不同速度、深度的重力弧线。

## 已完成验证

- 三组 TypeScript 检查通过：客户端、数学、服务端。
- 数学回归 4000 次旋转通过；这是行为回归，不证明目标 RTP、统计公平性或商业认证。
- Apple 身份校验单测通过：签名、受众、有效期、nonce。未执行原生 Apple 授权。
- 布局 32 组通过：四款游戏 × 320×568、360×640、375×667、390×844、430×932、412×915、768×1024、820×1180。
- 四款游戏通过实际浏览器点击 SPIN、转轴位移检查、AUTO 开关同步、规则打开关闭；320×568 旋转期间调整到 430×932 后能正常结束。
- 构建后每款抽取 200 个结果验证连消移除索引；Ruby 修复后浏览器未再出现该动画错误。
- 注册实际输入、条款打开/关闭/勾选后草稿保留；登录、大厅、购买、奖励、排行、账户完成截图检查。
- 大奖可揭示金额、跳过并返回 idle；待机反光与符号位置随时间变化。
- 本机浏览器一次 1.6 秒短采样中，帧间隔中位数约 16.7ms、P95 约 16.8ms；不是移动设备性能保证。

## 清理与恢复

运行时美术约 28 MB，网页构建约 39 MB。制作原图迁入 `tools/art-sources/`，保留再加工能力。
未使用 generated 素材、四张旧非 tall 柜机画面、九个未使用组件及对应 meta 移至 `/private/tmp/f8-unused-backup-TJfejS`。未删除历史模板或用户其他工作。临时备份不保证长期存续。

## 尚未验证 / 发布阻塞

当前发布静态检查 20/24。尚需真实发布者/法律地址、正式商品 ID、法律文档、条款版本更新时重新确认。正式服务端、Apple 原生桥接和沙盒内购/退款/账户删除需后续部署及真机端到端验收。本轮未更改支付商品或伪造成功充值。

浏览器视口测试不能覆盖所有手机、iOS WebView 生命周期、键盘、安全区和商店审核。当前为已修复并可预览的 F8，不标记为已通过 App Store 审核。
# Login input follow-up — 2026-09-09

- Reproduction at 390px showed the entered value remained in the EditBox and in-memory draft after blur, but rendered too small and aligned to the top. Assigning the labels under the default multiline input mode changed their vertical alignment; switching to single-line did not restore it.
- Increased entered-text size from 38 to 56 design units, used a dark high-contrast ink, and explicitly restored vertical centering. Placeholders use 46 design units.
- Auth viewport changes no longer destroy/recreate live EditBoxes. Draft updates are also captured on editing-ended and Return, not only text-changed. Password drafts remain in memory; no new persistent credential storage.
- `tools/browser-input-qa.js` passed actual typing/blur, focus changes, simulated keyboard viewport shrink/restore, and 320/390/430px width changes for both login and registration. Password labels remained masked; no page errors. Fresh screenshots inspected for both forms.
- TypeScript check and Cocos web build passed. Browser simulation is not a physical iPhone keyboard test.
