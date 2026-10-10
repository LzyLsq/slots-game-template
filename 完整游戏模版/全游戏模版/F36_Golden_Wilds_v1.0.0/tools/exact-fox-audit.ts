import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import { PaylineEvaluator } from '../assets/scripts/math/Evaluators';

// Only one payline: integer rounding applies to a single award per board.
// Enumerate every equally likely stop and every uniform mystery replacement.
const c=GAME_CONFIGS.find(c=>c.id==='moon-fox')!;
assert.equal(c.paylines.length,1);
const gen=new ResultGenerator(),line=new PaylineEvaluator(),unitConfig={...c,payoutScale:1};
const regular=c.symbols.filter(s=>!['wild','scatter','bonus'].includes(s.tier)).map(s=>s.id);
const base=new Map<number,number>(),free=new Map<number,number>();
const count=(hist:Map<number,number>,units:number)=>hist.set(units,(hist.get(units)??0)+1);
const units=(g:readonly string[])=>line.evaluate(unitConfig,g,1).reduce((s,w)=>s+w.multiplier,0);
let combinations=0,triggers=0;
for(let x=0;x<c.reelStrips[0].length;x++)for(let y=0;y<c.reelStrips[1].length;y++)for(let z=0;z<c.reelStrips[2].length;z++) {
  const g=gen.gridFromStops(c,[x,y,z]);combinations++;count(base,units(g));
  if(g.filter(s=>s===c.bonusId).length>=3)triggers++;
  for(const replacement of regular)count(free,units(g.map(s=>s===c.bonusId?replacement:s)));
}
const expectation=(hist:Map<number,number>,bet:number,scale:number,n:number)=>
  [...hist].reduce((s,[u,count])=>s+Math.round(bet*u*scale)*count,0)/(bet*n);
const results=c.bets.map(bet=>{
  const baseRtp=expectation(base,bet,c.payoutScale,combinations);
  const featureRtp=triggers/combinations*3*expectation(free,bet,c.featurePayoutScale??c.payoutScale,combinations*regular.length);
  const rtp=baseRtp+featureRtp;
  assert(Math.abs(rtp-c.targetRtp)<.001,'Fox exact return must be within 0.1 percentage points at every supported stake');
  return {bet,baseRtp,featureRtp,rtp,targetRtp:c.targetRtp,difference:rtp-c.targetRtp};
});
const report={gameId:c.id,naturalOnly:true,combinations,featureTriggerRate:triggers/combinations,baseHitRate:1-(base.get(0)??0)/combinations,method:'All stop combinations and all equally likely mystery replacements; actual per-award integer rounding at all supported stakes; three independent free spins.',results};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
