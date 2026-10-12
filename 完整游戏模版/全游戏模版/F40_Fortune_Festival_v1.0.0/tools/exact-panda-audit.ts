import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {PaylineEvaluator} from '../assets/scripts/math/Evaluators';
const c=GAME_CONFIGS.find(c=>c.id==='amber-panda')!;
assert.equal(c.columns,6);assert.equal(c.rows,3);assert.equal(c.paylines.length,5);
const line=new PaylineEvaluator(),regular=c.symbols.filter(s=>!['wild','scatter','bonus'].includes(s.tier)).map(s=>s.id);
// Six independent reels form two boards. Enumerate each board's three stops,
// then convolve the two SCATTER-count distributions for the shared trigger.
const boards=[0,1].map(panel=>{
 const strips=c.reelStrips.slice(panel*3,panel*3+3),cfg={...c,columns:3,payoutScale:1};
 const counts=new Map<number,number>(),base=new Map<string,number>(),free=new Map<string,number>();let combinations=0;
 const record=(hist:Map<string,number>,g:readonly string[])=>{const key=line.evaluate(cfg,g,1).map(w=>w.multiplier).sort((a,b)=>a-b).join(',');hist.set(key,(hist.get(key)??0)+1);};
 for(let a=0;a<strips[0].length;a++)for(let b=0;b<strips[1].length;b++)for(let d=0;d<strips[2].length;d++){
  const stops=[a,b,d],g=strips.flatMap((strip,x)=>[0,1,2].map(y=>strip[(stops[x]+y)%strip.length]));combinations++;
  const n=g.filter(id=>id===c.bonusId).length;counts.set(n,(counts.get(n)??0)+1);record(base,g);
  for(const replacement of regular)record(free,g.map(id=>id===c.bonusId?replacement:id));
 }
 return {combinations,counts,base,free};
});
let trigger=0;for(const [a,n] of boards[0].counts)for(const [b,m] of boards[1].counts)if(a+b>=3)trigger+=n/boards[0].combinations*m/boards[1].combinations;
const expectation=(hist:Map<string,number>,bet:number,scale:number,n:number)=>[...hist].reduce((sum,[key,freq])=>sum+freq*(key?key.split(',').reduce((paid,u)=>paid+Math.round(bet*Number(u)*scale/10),0):0),0)/(bet*n);
const at=(scale:number)=>c.bets.map(bet=>{
 const baseRtp=boards.reduce((sum,b)=>sum+expectation(b.base,bet,scale,b.combinations),0);
 const featureRtp=trigger*3*boards.reduce((sum,b)=>sum+expectation(b.free,bet,scale,b.combinations*regular.length),0);
 return {bet,baseRtp,featureRtp,rtp:baseRtp+featureRtp,targetRtp:c.targetRtp,difference:baseRtp+featureRtp-c.targetRtp};
});
// Exact integer rounding produces small stake-dependent return steps. Pick a
// common scale minimizing worst error across every supported stake.
let best=c.payoutScale,bestError=Infinity;
for(let s=.5;s<2;s+=.0001){const error=Math.max(...at(s).map(r=>Math.abs(r.difference)));if(error<bestError){best=s;bestError=error;}}
const results=at(c.payoutScale),report={gameId:c.id,naturalOnly:true,boardStopCombinations:boards.map(b=>b.combinations),featureTriggerRate:trigger,payoutScale:c.payoutScale,recommendedScale:Number(best.toFixed(5)),recommendedMaxError:bestError,method:'Enumerate each independent 3-reel board and all uniform mystery replacements; convolve lantern counts across boards; actual per-line integer rounding; three independent free spins; payout cap cannot bind below 200x.',results};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert(Math.max(...results.map(r=>Math.abs(r.difference)))<.004,'Exact Panda return must be within 0.4 percentage points at every supported stake');
