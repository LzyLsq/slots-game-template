# F32 美术来源

所有可见美术通过本地 CC Switch `http://127.0.0.1:15721/v1/responses` 调用 `gpt-image-2`、`quality: high` 生成。提示词、请求与响应 JSON、日志和未裁切源图保存在 `/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/`。四座完整机身与环境、登陆/大厅/服务场景、标题、符号、头像、大奖机械、按钮、进度条和柔和特效均在此可核验。

| 新增核心图 | CC Switch 响应 ID |
| --- | --- |
| 选择器齿环 | `resp_0c7b3f5e0f92fad1016ab21ac4cb1087d1a479369dffd258eb` |
| 四款大奖机械 | `resp_02068864e9295b16016ab21ac64f6487d281350cee34c91b1d` |
| 进度、转轴轨道及光效图集 | `resp_090a96cfdb36d0d7016ab21ac6606487d1953cdd468b788d77` |
| 全屏柔和雾幕 | `resp_011630ffd8d32077016ab216a1b76c87d1948398bda57ec799` |

`tools/process-cc-core-art.mjs` 只做色键透明、裁切、清边及缩放，不创造造型。输出位于 `assets/resources/art/`；Creator 自动导入产生 `.meta`。机身和环境在同一张画面，转轴按同一设计平面贴合。动态金额和文案用实时 `Label`；不可见 `Mask.Type.GRAPHICS_RECT` 仅裁切；不用程序绘制可见造型。

## 登录大厅改稿（2026-09-23）

登录／注册场景 `foundry-arrival.png` 使用 CC Switch 响应 `resp_04557e6581920ec8016ab389060e1487d0887d133eb3f19b5a` 生成的新原画（源图 `work/ccswitch-f32/images/foundry-arrival-v3.png`）；以透明门框为第二参考，移除旧场景中央的大徽章和台阶，将侧廊、壁龛与落地石基连成一个空间。仅替换背景 PNG，保留 Creator `.meta` 及 UUID；旧图备份在项目外 `work/ccswitch-f32/backups/`。`F32` 是覆盖在已生成的空白珐琅铭牌上的实时文字，不是程序绘图。

## 登录背景当前版本：青绿铸币宝库（2026-09-23）

`foundry-arrival.png` 已再次替换为本地 CC Switch 响应 `resp_0cfe8f3e765fbc62016ab3984194f487d08e3b73fd0b34ce17` 的原画（`work/ccswitch-f32/images/foundry-arrival-v4.png`）。以 390×844 运行截图及透明门框为输入，生成青绿珐琅墙面、两侧金币壁龛和无明显断阶的暗色落地地面。上节 v3 是历史迭代，**不再是当前背景**；它备份于项目外 `work/ccswitch-f32/backups/foundry-arrival-v3-before-teal-vault.png`。替换时保留原 `.meta` 和 UUID。

## 登录门框和正式游戏名（2026-09-23）

`foundry-brand.png` 改为本地 CC Switch `gpt-image-2` 高质量生成的青绿珐琅金币铸造机械长匾，响应 `resp_01a64b43649a9b12016ab3cf94c2c087d0a92d6c83315466d1`（源图 `work/ccswitch-f32/images/foundry-auth-nameplate.png`，请求／响应 JSON 见同目录 `responses/`）。仅以纯品红色键透明、裁切与缩小原生成图，没有程序绘制造型。实际游戏名 `FORTUNE FOUNDRY` 以实时可读文字叠在图中留白区，替代旧小字 `F32`。原匾图备份于项目外 `work/ccswitch-f32/backups/foundry-brand-before-nameplate.png`。登录／注册共用生成门框按上边缘固定放大，表单跟随门框内部比例移动，输入板缩进浅色珐琅区；保留贴图 UUID。

预加载页也使用同一张新生成横匾，并在其空白珐琅面叠清晰实时标题；纯文字不冒充生成图片。生成资源可通过 `tools/process-cc-core-art.mjs` 从 CC Switch 原图重建，修改后的处理脚本优先读取 `foundry-auth-nameplate.png`。

## 高柜机、场景入口与文字对比度修缮（2026-09-24）

登录和注册使用本地 CC Switch 生成的加高门框 `foundry-auth-gate.png`（`resp_064943f3f80a8656016ab48089f37c87d087de3f87b021e685`）；旧版金币模具局部加载图 `foundry-loading-die.png`（`resp_0bba42c36532b753016ab4827e30c087d081e2482f8bd4290d`）曾替代完整柜机，现已被一体化工坊场景替换；大厅四个游戏入口图 `foundry-hall-seals.png`（`resp_013793bb8eb887ec016ab4827e32b487d09c362d161d670656`）；商店、奖励、排行、账户的动态铭牌图集 `foundry-title-strips.png`（`resp_0f0af9dd7af2749e016ab48a40c6ec87d0b7ab252531988c45`）。生成请求、响应、源图和处理脚本在项目外 `work/ccswitch-f32/`，成品位于项目 `assets/resources/art/`。

本轮可读性修缮**没有程序画新按钮或装饰**：大厅入口文字改放在此前通过 CC Switch 生成的 `foundry-plate-0` 珐琅牌上；商店、奖励、排行榜的说明文字使用已生成的 `foundry-plate-1` 深色底；登录字段去掉同色粗描边并将表单移离机械横梁；账户操作按钮恢复已生成的珐琅底图合理高度。实时文字和排名数据仍用 Cocos Label 更新，金属底图、光效和进度图均是生成图片。

## 字体铭牌与转轴窗口校准（2026-09-24）

主品牌 `foundry-brand-lettered.png` 由本地 CC Switch 响应 `resp_005b49c38b3fdce6016ab4a3363e7087d0961d535050d724fc` 生成，英文名已经铸进画面；预加载页 `build-templates/web-mobile/foundry-brand.png` 使用同一张成品，不再以 HTML 文字覆盖空白牌。四块带精确英文标题的店铺／奖励／排行／账户铭牌经 `resp_0e1db4541b9b77f9016ab4a2386e4487d0a02cb1d4bf1b9040`、`resp_0a7303936bdb4021016ab4a238b36887d0abe6ea20fd868cec`、`resp_01e440fe46e4798a016ab4a2562c5c87d0bf1b5fb08a47ba49`、`resp_02d0c180c7bedcb6016ab4a27538c487d0b925c843653d11a1` 生成，透明裁边后收录于 `foundry-page-titles.png`。旧空白牌只供非英语本地化文字和登录小通行证标签回退使用。所有铭牌的轻浮动和扫光由已生成的光效贴图驱动，系统减少动态效果时会停用。

四台柜机的转轴矩形直接按各自 1024×2048 CC Switch 原画中金边的内缘测量并分别内缩。柜机绘画、转轴 Mask 与按钮同属 `Cabinet-coordinate-plane`，统一比例和位移；Mask 仅负责不可见的裁切，不绘制可见边框。原始 CC Switch 图、请求／响应以及透明边缘处理脚本：`/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/`。

## 一体化铸币工坊加载场景（2026-09-24）

之前的独立透明模具叠在另一张大厅图上，视觉上像悬浮贴纸。现通过本地 CC Switch `gpt-image-2` 生成完整的全幅 `foundry-loading-scene.png`（响应 `resp_0f434265d436fa31016ab4d4bbdbe087d0acfb80f8607a90ad`，以 `foundry-arrival.png` 为材质与建筑参考）：压币机、固定工作台、金币传送轨、墙柱、地面阴影与反光在同一张图里。HTML 首屏、Cocos 启动层和进入模式时的加载层共同使用这张场景，只有品牌、可访问的进度与状态文字作为功能层放入预留区域。旧 `foundry-loading-die.png` 及首屏的独立光斑／遮罩已从成品移除。
