import assert from 'node:assert/strict';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ruleAward,ruleCounts} from '../assets/scripts/math/PaytableDisplay';
import {PaylineEvaluator,WaysEvaluator,ClusterEvaluator} from '../assets/scripts/math/Evaluators';
import {explainWins,winCaption} from '../assets/scripts/math/WinExplanation';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SecureRNG} from '../assets/scripts/core/SecureRNG';
let checked=0;
for(const c of GAME_CONFIGS){
 assert(ruleCounts(c).every(n=>c.payMode==='clusters'||n<=c.columns));
 for(const bet of c.bets)for(const sym of c.symbols.filter(s=>s.tier!=='scatter'&&s.tier!=='bonus')){
  const counts=c.payMode==='clusters'?[5,6,7,8,9,10,11,12,14,15,25]:ruleCounts(c);
  for(const count of counts){
   const empty='not-a-symbol';const grid=Array(c.columns*c.rows).fill(empty);
   if(c.payMode==='clusters')for(let i=0;i<count;i++)grid[i]=sym.id;
   else for(let col=0;col<count;col++)grid[col*c.rows+(c.payMode==='paylines'?c.paylines[0][col]:0)]=sym.id;
   const wins=c.payMode==='clusters'?new ClusterEvaluator().evaluate(c,grid,bet):c.payMode==='ways'?new WaysEvaluator().evaluate(c,grid,bet):new PaylineEvaluator().evaluate(c,grid,bet);
   const win=wins.find(w=>w.symbolId===sym.id&&(c.payMode!=='paylines'||w.lineIndex===0));
   const award=ruleAward(c,sym.id,count,bet);assert.equal(award??0,win?.credits??0,`${c.id} ${sym.id} ${count} bet ${bet}`);if(award!==null)assert(Number.isSafeInteger(award));checked++;
  }
 }
}
console.log(`PASS ${checked} rule coin awards match real evaluators, including wilds and cluster thresholds.`);
const generator=new ResultGenerator(),rng=new SecureRNG();
for(const config of GAME_CONFIGS)for(let i=0;i<250;i++){
 const result=generator.generate(config,100,rng),entries=explainWins(result);
 assert.equal(entries.reduce((sum,e)=>sum+e.win.credits,0),result.totalWin,'Review must reconcile exactly to settlement');
 for(const e of entries){assert(e.win.credits>0);assert(e.win.positions.every(p=>p>=0&&p<e.grid.length));assert(winCaption(config,e.win).includes(e.win.credits.toLocaleString('en-US')));if(e.win.kind==='line')assert.equal(e.win.positions.length,e.win.count);}
}
console.log('PASS 1,000 winning breakdowns reconcile to settlement with valid original-grid positions.');
