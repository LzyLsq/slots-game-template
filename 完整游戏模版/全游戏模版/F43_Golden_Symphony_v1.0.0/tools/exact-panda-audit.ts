import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {PaylineEvaluator} from '../assets/scripts/math/Evaluators';
const c=GAME_CONFIGS.find(c=>c.id==='pearl-rhythm')!;assert.equal(c.columns,3);assert.equal(c.rows,3);assert.equal(c.paylines.length,5);
const evaluator=new PaylineEvaluator(),regular=c.symbols.filter(s=>!['wild','scatter','bonus'].includes(s.tier)).map(s=>s.id),cfg={...c,payoutScale:1},strips=c.reelStrips;
const base=new Map<string,number>(),free=new Map<string,number>();let combinations=0,triggers=0;
const record=(hist:Map<string,number>,g:readonly string[])=>{const key=evaluator.evaluate(cfg,g,10000).map(w=>w.multiplier).sort((a,b)=>a-b).join(',');hist.set(key,(hist.get(key)??0)+1);};
for(let a=0;a<strips[0].length;a++)for(let b=0;b<strips[1].length;b++)for(let d=0;d<strips[2].length;d++){
 const stops=[a,b,d],g=strips.flatMap((strip,x)=>[0,1,2].map(y=>strip[(stops[x]+y)%strip.length]));combinations++;if(g.filter(id=>id===c.bonusId).length>=3)triggers++;record(base,g);
 for(const replacement of regular)record(free,g.map(id=>id===c.bonusId?replacement:id));
}
const expectation=(hist:Map<string,number>,bet:number,scale:number,n:number)=>[...hist].reduce((sum,[key,freq])=>sum+freq*(key?key.split(',').reduce((paid,u)=>paid+Math.round(bet*Number(u)*scale/5),0):0),0)/(bet*n);
const at=(scale:number)=>c.bets.map(bet=>{const baseRtp=expectation(base,bet,scale,combinations),featureRtp=triggers/combinations*3*expectation(free,bet,scale,combinations*regular.length);return{bet,baseRtp,featureRtp,rtp:baseRtp+featureRtp,difference:baseRtp+featureRtp-c.targetRtp};});
let best=c.payoutScale,bestError=Infinity;for(let s=1.4;s<1.8;s+=.0001){const e=Math.max(...at(s).map(r=>Math.abs(r.difference)));if(e<bestError){best=s;bestError=e;}}
const results=at(c.payoutScale),report={gameId:c.id,combinations,triggers,featureTriggerRate:triggers/combinations,payoutScale:c.payoutScale,recommendedScale:Number(best.toFixed(5)),recommendedMaxError:bestError,method:'Exact single 3×3 board stops, six uniform mystery replacements, five independently rounded lines; three free spins and no retriggers.',results};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
assert(Math.max(...results.map(r=>Math.abs(r.difference)))<.001,'Exact supported-stake return must remain within 0.1 percentage points of the declared design target');
