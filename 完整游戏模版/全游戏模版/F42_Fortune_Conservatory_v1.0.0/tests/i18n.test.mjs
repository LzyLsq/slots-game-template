import test from 'node:test';import assert from 'node:assert/strict';
import {currentLanguage,translate} from '../src/i18n.mjs';import {GAMES} from '../src/config.mjs';
test('a fresh install starts in English without storage',()=>assert.equal(currentLanguage(),'en'));
test('all four mode summaries and features fully translate',()=>{for(const game of GAMES){for(const text of [game.cn,game.description,game.feature,'游玩 '+game.cn])assert.doesNotMatch(translate(text),/[\u4e00-\u9fff]/);assert.equal(translate(game.cn),game.title);}});
test('Chinese switching preserves original canonical strings',()=>{for(const g of GAMES)assert.equal(translate(g.feature,'zh'),g.feature);});
test('English controls are concise and avoid duplicate PLAY labels',()=>{assert.equal(translate('进入财苑 · 领取 10,000 金币'),'ENTER · 10,000 COINS');for(const g of GAMES)assert.equal(translate('游玩 '+g.cn),'PLAY '+g.title.toUpperCase());});
test('dynamic reel geometry and daily headings translate',()=>{assert.equal(translate('3轴3行转轴'),'3 reels × 3 rows');assert.equal(translate('第 4 天'),'Day 4');});

test('complete daily disclaimer translates before dynamic fragments',()=>assert.doesNotMatch(translate('以 UTC 00:00 为每日分界；连续7天循环，中断从第1天开始。'),/[\u4e00-\u9fff]/));

test('paid coin notice remains fully localized and states real payment',()=>{
 const notice=translate('这是本机 Slots 娱乐游戏，所有金币无现金价值，不能提现、兑换物品或交易。可选 Apple 内购会产生真实付款，须经 Apple 付款页确认。不要把奖励概率理解为现实收益。','en');
 assert.doesNotMatch(notice,/[\u4e00-\u9fff]/);
 assert.match(notice,/real payment/);
 assert.match(notice,/no cash value/);
});
