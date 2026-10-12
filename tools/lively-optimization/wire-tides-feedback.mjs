// Assertion-guarded audio-only wiring for the compact HTML/JS variant.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const file=resolve(import.meta.dirname,'../../完整游戏模版/全游戏模版/F26_Fortune_Tides_v1.0.0/src/app.js');
let s=readFileSync(file,'utf8');
function once(from,to){if(to.length>from.length&&s.includes(to))return;if(s.includes(from))s=s.replace(from,to);else assert(s.includes(to),'Missing audio anchor: '+from);}
once("<button data-action=\"motion\"><span>${tr('reducedMotion')}</span><b>${tr(s.reducedMotion?'on':'off')}</b></button></section>","<button data-action=\"motion\"><span>${tr('reducedMotion')}</span><b>${tr(s.reducedMotion?'on':'off')}</b></button><button data-action=\"music-credits\">Music credits</button></section>");
once("onCell:(c,r,s)=>toast(symbolLabel(s))","onCell:(c,r,s)=>toast(symbolLabel(s)),onStop:()=>feedback('stop')");
s=s.replaceAll("{reduced:store.state.reducedMotion});}","{reduced:store.state.reducedMotion,onCollect:()=>soundtrack.detail('collect')});}");
once("feedback();history.push", "history.push");
once("reels.settle(first.grid,first.coinValues);feedback('stop');", "reels.settle(first.grid,first.coinValues);");
once("reels.settle(stage.grid,stage.coinValues);if(stage.added)feedback('stop');", "reels.settle(stage.grid,stage.coinValues);");
once("big=isBigWin(amount,roundBet);soundtrack.present(amount/roundBet);const token=epoch", "big=isBigWin(amount,roundBet);const token=epoch");
once("{reduced:store.state.reducedMotion});host=app.querySelector('.cabinet')", "{reduced:store.state.reducedMotion,onCollect:()=>soundtrack.detail('collect')});host=app.querySelector('.cabinet')");
once("const counter=big?modalRoot.querySelector('[data-count-award]')", "soundtrack.present(amount/roundBet);soundtrack.detail('burst');const counter=big?modalRoot.querySelector('[data-count-award]')");
once("counter.textContent=fmt(amount*(1-Math.pow(1-p,3)));if(p<1)", "counter.textContent=fmt(amount*(1-Math.pow(1-p,3)));soundtrack.detail('count',p);if(p<1)");
once("if(!b||b.disabled)return;feedback();if(b.dataset.page)", "if(!b||b.disabled)return;if(b.dataset.action!=='spin'&&!((b.dataset.action||'').startsWith('bet-')&&busy))feedback(b.dataset.page==='home'||b.dataset.action==='close'?'back':b.dataset.action==='bet-up'?'bet-up':b.dataset.action==='bet-down'?'bet-down':b.dataset.game?'select':'tap');if(b.dataset.page)");
once("switch(action){case'auth-open'", "switch(action){case'music-credits':window.dispatchEvent(new Event('game-music-credits'));break;case'auth-open'");
once("if(b.dataset.action!=='spin'&&!((b.dataset.action||'').startsWith('bet-')&&busy))feedback(b.dataset.page==='home'||b.dataset.action==='close'?'back':b.dataset.action==='bet-up'?'bet-up':b.dataset.action==='bet-down'?'bet-down':b.dataset.game?'select':'tap');", "if(b.dataset.action!=='spin'&&!(b.dataset.action||'').startsWith('bet-'))feedback(b.dataset.page==='home'||b.dataset.action==='close'?'back':b.dataset.game?'select':'tap');");
once("if([50,100,200,500,1000].includes(value)){bet=value;", "if([50,100,200,500,1000].includes(value)){if(value!==bet)feedback(value>bet?'bet-up':'bet-down');bet=value;");
once("i=values.indexOf(bet);bet=values[Math.max(0,Math.min(values.length-1,i+(action==='bet-up'?1:-1)))];document.querySelector('#bet-value').textContent=fmt(bet);", "i=values.indexOf(bet),prior=bet;bet=values[Math.max(0,Math.min(values.length-1,i+(action==='bet-up'?1:-1)))];if(bet!==prior)feedback(action);document.querySelector('#bet-value').textContent=fmt(bet);");
writeFileSync(file,s);console.log('F26: animation-driven curated feedback wired');
