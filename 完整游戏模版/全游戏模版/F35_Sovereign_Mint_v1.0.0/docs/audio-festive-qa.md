# F35 欢快喜庆财富主题配乐

日期：2026-09-30。仅重做音乐编曲与领奖金币音效，不修改中奖概率、钱包、布局、吉祥物、奖励等级和视觉演出时间。

## 本次实际变更

不是提高旧曲播放速度：五首旋律、独立伴奏、A/B回答句和打击乐均重新编写；播放保持正常速率。五首16小节原创新谱，使用本机已安装乐器采样离线渲染，交付实际44.1kHz立体声AAC。

| 场景 | BPM | 编曲 |
| --- | ---: | --- |
| 大厅及非柜机页面 | 116 | C大调赌场庆典摇摆，跳跃钢琴、铜管回答、行进低音、颤音琴与轻鼓组 |
| 金狮 | 122 | D大调淘金jackpot律动，铜管组断奏、切分钢琴、低音、金属亮点、鼓组 |
| 翡翠 | 112 | D大调五声音阶招财节庆，琴筝类采样与笛子对答，拨弦、轻弦乐、木鱼块与手鼓 |
| 珍珠 | 108 | F大调6/8宝藏舞曲，钢片琴与笛子、竖琴分解和弦、圆润低音、铃鼓与沙锤 |
| 红宝石 | 124 | G大调凤凰嘉年华，短句弦乐与庆典小号对答，低音、竖琴点缀、轻鼓组 |

打击乐使用独立GM percussion bank，而不是把鼓音号当作钢琴音符。本机隔离渲染测试证实底鼓、军鼓、铃鼓、沙锤和木块均非静音。

四款柜机的五档奖励主段/收束共40段同步重新渲染：普通部分返还/保本仍是克制确认，盈利大奖加入节庆鼓点、主题铜管或笛弦回答，超级大奖以上增加上行华彩和落点镲片。金额计数、高潮与领取时间不变。领奖、领取和派奖短反馈改为大三和弦金币音阶；点击、下注和机械转轴反馈保留短促实体手感。

音乐响度保持受控，不用大音量代替欢快感；奖励自动压低BGM，领取后恢复。原有独立音乐/效果开关、首次触摸解锁、后台暂停、曲间交叉淡化、缓存上限和去重保留。

## 技术验收

- `typecheck`、`typecheck:server`、完整`npm test`（含新增`test:audio:festive`）。
- 编曲测试：5种大调旋律、5套实际乐器组合、5种独立节奏、45份谱、奖励视觉时钟不变。
- 59个实际AAC逐个解码，验证时长、非静音、峰值余量、6个循环接缝及独立文件hash；报告`audio-festive-decode-qa-20260930.json`。
- 真鼓组隔离渲染报告`audio-festive-percussion-qa-20260930.json`。
- Cocos web-mobile生产构建，以`Finished in`和实际网页验收为成功判据。源码、最终AAC和构建同步正式模版。
- 显式localhost debug会每0.7秒更新只读`data-soundtrack-*`标记，供验证真实AAC路径、场景BPM、单BGM声源、音乐/效果独立开关和加载失败数；正常生产会话无标记、无可见调试层。

## 实际浏览器验收

在6038正式构建通过真实点击从大厅进入四个柜机：五首均匹配各自BPM和`music-<scene>`实际录音，稳定状态只有1个BGM声源，加载失败0。红宝石最终正常页面25份录音就绪。

- 独立开关：音乐关/效果开时BGM声源为0；音乐开/效果关时仍使用实际BGM录音且声源为1，最后已恢复两个开关为开。
- 实际点击SPIN验收红宝石超级大奖：BGM与奖励均使用实际录音，主段/收束累计2个演出声源，加载失败0。点击领取后正常退回柜机。
- 最终去除强制大奖/showcase参数并重新加载正常红宝石页面，实际触摸解锁后确认124 BPM实际录音、单BGM、音乐/效果均开、失败0；本次最终reload以来浏览器错误0。
- 正常预览保留：`http://127.0.0.1:6038/?debug=1&screen=game&game=ruby-revel`。浏览器首次触摸后解锁音频，遵循浏览器自动播放限制。

证据：`screenshots/f35-festive-audio-20260930/`，含五场景播放、独立开关、超级大奖、正常交付页面的JSON与截图。截图及播放状态不作为扬声器主观听感证明。

## 重生成

使用带NumPy的Python环境：

```sh
node --import tsx tools/compose-soundtracks.ts /tmp/f35-festive-audio/scores.json
swiftc tools/render-instruments.swift -o /tmp/f35-festive-audio/render-instruments
/tmp/f35-festive-audio/render-instruments /tmp/f35-festive-audio/scores.json /tmp/f35-festive-audio/raw
python3 tools/master-audio.py /tmp/f35-festive-audio/raw build-templates/web-mobile/audio /tmp/f35-festive-audio/scores.json
python3 tools/audio-asset-qa.py build-templates/web-mobile/audio docs/audio-festive-decode-qa-20260930.json
npm run typecheck && npm run typecheck:server && npm test
```

原始WAV、临时谱和编译程序仅在`/tmp`，未放入交付目录。本轮未提交或推送Git。

## 验收边界

已验证编曲结构、音频文件和实际浏览器播放链路；未进行扬声器主观试听、物理手机或原生端音频验收，不能据此保证所有设备听感或商业版权/苹果上架审核。
