# F18 美术来源

F18 原创位图通过用户已授权的本地 CC Switch Responses 路由（gpt-image-2）生成，最终提示词保存在 [art-prompts](art-prompts/)。生成原始响应和中间图保留在项目外；项目仅包含实际交付资源和审查证据。

原创资源包括：列车抵站登录场景、四站相连的铁路大厅及其整体环境扩绘、车厢服务场景、品牌字标、蒸汽机车加载图、十六种通用财宝、十六种主题物件、十六个功能图标、十六个主题立体按钮、四种材质面板、四幅奖品图、四台一体化机柜场景，以及四张独立柜机标题字标。背景自然扩绘为竖屏场景，没有复制拉长边缘像素。

最终图片位于 `assets/resources/art/`；网页加载器所需图片另置 `build-templates/web-mobile/`。标题按四个独立横行提取透明轮廓，保留字腔和装饰，不带其他标题。主题图集按连通轮廓提取，每个 256px 单元至少留 20px 透明边距，64 个主题单元通过检查。四个柔和角色头像与各自线路一致。Apple 标志与加法光学纹理复用此前认可的基础资源。

`cabinet-measurements.json` 保存最终绘制转轴区域的测量值。背景、机身、转轴、标题、读数及控件共用变换，除几何校验外另以实际浏览器渲染复查。

数学、服务与基础交互沿用成熟实现；F18 的包标识、存档空间、美术及页面布局独立。运行截图见 `screenshots/`，不是设计稿。

Station steam uses a small procedural feathered alpha texture for particle rendering; it is not an icon or character asset. The rejected moving-train sprites were excluded from the delivered runtime.
