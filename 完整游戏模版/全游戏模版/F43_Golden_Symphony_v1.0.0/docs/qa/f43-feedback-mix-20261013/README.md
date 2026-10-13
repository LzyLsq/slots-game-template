# F43 · build12 反馈混音

版本 `f43-feedback-mix-20261013`，2026-10-13。当前预览端口6043。生产改动在 `AudioManager.ts`；[构建/源码指纹](build12-artifact-source.json)确认当前源码与Creator编译的AudioManager一致。

点击、旋转开始、逐轴停轮、普通奖、奖励、特色反馈及收场到账使用各自的背景衰减深度。背景在反馈播放前降低，持续覆盖已解码的实际音效长度和80ms尾部；并发反馈分别追踪，后来的短点击不能释放较长的奖励。滚动状态与反馈取更低的音量，滚动机械声也为停轮提示让位。背景恢复采用450ms时间常数的平滑曲线，不骤然回满音量。

实测稳定段：点击背景0.1008、停轮0.0924、普通奖/奖励0.0756、到账0.084；常态背景为0.42。音效原播放音量保持原值。大奖音乐仍按原计数、揭示与收场事件播放。

[混音检查](mix/mix-audit.json)覆盖大厅和四模式，共33项：音效起音、完整尾部、下游WebAudio gain、连续四轴停轮、普通奖与多个反馈重叠、12次连续点击、大奖退出后的到账尾部、独立音效静音及后台恢复。直接声音调用是隔离fixture，不代表真实中奖或自然概率。[31项声音生命周期检查](audio-runtime/runtime-audit.json)另覆盖四模式真实本地扣款及QA强制EPIC结算、逐轴反馈、静音持久化、后台恢复和过期演出不重播，错误0。强制结果用于验证结算及声音，不代表自然概率。

## 实际最终混音录音

录音镜像浏览器真实WebAudio输出，不替换音源。下面每段依次包含反馈、重叠、快速点击、静音/后台等压力fixture，不能当成正常游戏音乐编排或手机听感验收。

| 场景 | 实际录音 | 音量曲线 |
|---|---|---|
| 大厅 | [录音](mix/salon-mix.webm) | [曲线](mix/salon-curves.json) |
| Golden Strings | [录音](mix/golden-strings-mix.webm) | [曲线](mix/golden-strings-curves.json) |
| Sapphire Harp | [录音](mix/sapphire-harp-mix.webm) | [曲线](mix/sapphire-harp-curves.json) |
| Ruby Brass | [录音](mix/ruby-brass-mix.webm) | [曲线](mix/ruby-brass-curves.json) |
| Pearl Rhythm | [录音](mix/pearl-rhythm-mix.webm) | [曲线](mix/pearl-rhythm-curves.json) |

[本轮摘要](summary.json)汇总已完成结果。[录音信号审查](mix/recorded-audio-audit.json)解码以上五段实际混音，五段均有声音且削波采样数为0，峰值0.4072–0.5700；信号检查未代替主观试听。类型检查及演出时序合同通过。Creator报告72秒完成并生成产物，CLI退出36并记录script-worker SIGTERM；[日志](build12.log)保留，不将它描述为正常exit0。桌面浏览器检查与录音信号不替代手机扬声器主观试听或原生中断验证。

初次探针把组件音量命令与平滑中的WebAudio瞬时gain要求为同一数值，另一次使用固定墙钟等待；这些检查假设已修正。最终稳定段、音效尾部、实际增益边界和完成恢复分别验证，慢GPU模拟等待有额外4秒上限。首次探针日志保留，未因这些检查假设变更再次修改生产混音。

画面与三段演出沿用[build11已验证的基线](../f43-concert-awards-20261013/README.md)。本轮没有Git提交或推送请求。
