import assert from 'node:assert/strict';
import {formatWinAmount,cumulativeAwardAmount,awardCredits,visibleAwardPositions} from '../assets/scripts/vfx/WinPresentation';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';

assert.equal(formatWinAmount(1234567.125),'1,234,567.125','complete readouts preserve fractional credits');
assert.equal(formatWinAmount(999999999.999),'999,999,999.999','large amounts remain exact instead of compact');
assert.equal(formatWinAmount(0.001),'0.001');
assert.equal(formatWinAmount(1234),'1,234');
let shown=0;
for(const credits of [6.125,8.875,20]){
 const next=cumulativeAwardAmount(shown,credits,10.5);
 assert(next>=shown&&next<=10.5,'a capped presentation never overcounts or runs backwards');shown=next;
}
assert.equal(shown,10.5);
const generator=new ResultGenerator();
for(const config of GAME_CONFIGS){
 const capped={...config,maxWinMultiplier:.5},rng=new SeededRNG(24);
 let result=generator.generate(capped,config.bets[0],rng);
 for(let i=0;i<500&&result.totalWin<Math.floor(config.bets[0]*.5);i++)result=generator.generate(capped,config.bets[0],rng);
 assert.equal(result.totalWin,Math.floor(config.bets[0]*.5),'the fixture must actually reach the round cap');
 assert.equal(result.wins.reduce((sum,w)=>sum+awardCredits(w),0),result.baseWin,'evidence uses capped allocations');
 let displayed=0;
 for(const win of result.wins){displayed=cumulativeAwardAmount(displayed,awardCredits(win),result.baseWin);assert(displayed<=result.baseWin);}
 assert.equal(displayed,result.baseWin);
 for(const round of result.featureResult?.rounds??[]){displayed=cumulativeAwardAmount(displayed,round.credits,result.totalWin);assert(displayed<=result.totalWin);}
 assert.equal(displayed,result.totalWin);
}
// Retained cues must never describe a previous grid, unpaid focus or a removed cluster.
for(const config of GAME_CONFIGS){
 const rng=new SeededRNG(9424);
 for(let i=0;i<100;i++){
  const result=generator.generate(config,config.bets[0],rng);
  const last=result.featureResult?.rounds.at(-1);
  const grid=last?.grid??result.grid;
  const paid=(last?.wins??result.wins).filter(w=>w.credits>0);
  assert.deepEqual(visibleAwardPositions(result,grid),[...new Set(paid.flatMap(w=>[...w.positions]))]);
  assert.deepEqual(visibleAwardPositions(result,grid.map(()=> '__different_grid__')),[]);
  assert.deepEqual(visibleAwardPositions({...result,wins:[],featureResult:undefined},result.grid),[]);
 }
}
console.log('PASS win presentation: fractional/large exact amounts, monotonic capped counts, four capped game fixtures.');
