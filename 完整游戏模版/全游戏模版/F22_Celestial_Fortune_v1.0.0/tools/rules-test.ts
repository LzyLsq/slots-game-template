import assert from 'node:assert/strict';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {evaluateCore} from '../assets/scripts/math/CoreGame';
import {ruleAward} from '../assets/scripts/math/PaytableDisplay';
for(const c of GAME_CONFIGS){
 const bet=c.bets[2],symbol=c.symbols.find(s=>s.tier==='low')!.id,grid=Array(c.columns*c.rows).fill(symbol),wins=evaluateCore(c,grid,bet);
 assert(wins.length>0);assert(wins.every(w=>w.positions.every(p=>p>=0&&p<grid.length)));
 for(const w of wins)assert.equal(w.credits,ruleAward(c,w.symbolId,w.count,bet,w.ways??1),'displayed award equals settlement');
 if(c.coreMode==='both-lines'||c.coreMode==='both-ways')assert.equal(wins.length,c.payMode==='paylines'?c.paylines.length:1,'pay better direction once');
 const pure=evaluateCore(c,grid.map(()=>c.wildId),bet);assert(pure.every(w=>w.symbolId===c.wildId));
 if(c.coreMode==='scatterpay'){
  const shuffled=[...grid];for(let p=0;p<grid.length;p++)shuffled[p]=p%(c.symbols.length-1)===0?symbol:c.symbols[(p%(c.symbols.length-2))+1].id;
  assert.deepEqual(evaluateCore(c,shuffled,bet).map(w=>w.credits).sort(),evaluateCore(c,shuffled.reverse(),bet).map(w=>w.credits).sort(),'count-anywhere independent of positions');
 }
}
console.log('PASS actual evaluator awards, direction deduplication, Wild ownership and scatter invariance');
