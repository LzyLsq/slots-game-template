import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {FEATURE_PROFILES} from '../assets/scripts/math/CabinetProfiles';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
import {signature} from '../assets/scripts/math/SignatureFeature';
const generator=new ResultGenerator(),report=[];
for(const [i,c] of GAME_CONFIGS.entries()){
 const kind=FEATURE_PROFILES[c.id].feature,bet=c.bets[2],rng=new SeededRNG(332049+i),size=c.rows*c.columns;let features=0,motions=new Set<string>();
 for(let k=0;k<6000;k++){
  const r=generator.generate(c,bet,rng);assert.equal(r.totalWin,r.baseWin+r.featureWin);assert.equal(r.featureWin,r.featureResult?.rounds.reduce((n,r)=>n+r.credits,0)??0);assert(r.totalWin<=bet*c.maxWinMultiplier&&Number.isSafeInteger(r.totalWin)&&r.totalWin>=0);
  assert.equal(r.baseWin,r.wins.reduce((n,w)=>n+w.credits,0));let prev=r.grid,locked:Readonly<Record<number,number>>={};
  if(r.featureResult)features++;
  for(const round of r.featureResult?.rounds??[]){
   if(['waterfall','scatter-cascade','harvest-refill','up-cascade','ways-cascade','cluster-bomb','sticky-cascade','route-delivery','dual-spin'].includes(kind)){
    const expected=kind==='waterfall'?2**(round.index-1):kind==='scatter-cascade'?2*round.index:round.index;
    assert.equal(round.multiplier,expected,'displayed multiplier must follow the written progression');
   }
   if(kind==='free-multiplier')assert.equal(round.multiplier,2+Math.min(3,round.grid.filter(s=>s===c.wildId).length),'free multiplier matches 2 + Wild count, capped at 5');
   if(kind==='vertical-drift')for(const m of round.moved??[])assert.equal(m.from-m.to,1,'clouds move one open cell upward');
   if(kind==='horizontal-drift'||kind==='route-delivery')for(const m of round.moved??[])assert.equal(m.from-m.to,c.rows,'crossings move one reel left');
   motions.add(round.motion??'none');assert.equal(round.grid.length,size);assert(round.grid.every(s=>c.symbols.some(d=>d.id===s)));assert.equal(round.credits,round.wins.reduce((n,w)=>n+w.credits,0));
   for(const w of round.wins){assert(w.positions.every(p=>Number.isInteger(p)&&p>=0&&p<size));assert(Number.isSafeInteger(w.credits)&&w.credits>=0);}
   if(round.motion==='drop'||round.motion==='rise'){
    const removed=new Set(round.removed);for(let x=0;x<c.columns;x++){
     const survivors=prev.slice(x*c.rows,(x+1)*c.rows).filter((_,y)=>!removed.has(x*c.rows+y)),actual=round.grid.slice(x*c.rows,(x+1)*c.rows);
     assert.deepEqual(round.motion==='rise'?actual.slice(0,survivors.length):actual.slice(c.rows-survivors.length),survivors,'real gravity preserves survivors');
    }
   }
   if(round.motion==='respin')for(const p of round.held??[])assert.equal(round.grid[p],prev[p],'held cell must stay fixed');
   for(const move of round.moved??[])assert.equal(round.grid[move.to],prev[move.from],'moving symbol must arrive unchanged');
   if(round.locked){for(const p of Object.keys(locked))assert.equal(round.locked[Number(p)],locked[Number(p)],'locked values never change');locked=round.locked;if(round!==r.featureResult!.rounds.at(-1))assert.equal(round.credits,0,'collection pays once');}
   prev=round.grid;
  }
 }
 assert(features>0,'feature must be reachable naturally: '+kind);report.push({id:c.id,core:c.coreMode,feature:kind,samples:6000,features,motions:Array.from(motions)});
 if(c.primaryKind==='poker-reels'&&kind==='nudge-last'){const g=Array(size).fill(c.wildId);const ws=generator.evaluate(c,g,bet);assert.equal(signature(c,bet,g,ws,rng,(cfg,g,b)=>generator.evaluate(cfg,g,b),()=>g,()=>g),undefined,'a winning poker hand must not trigger the losing-hand draw');}
 // Trigger exclusion: no win/Wild/scatter/mystery or frequent regular symbol.
 const regular=c.symbols.filter(s=>s.tier!=='wild'&&s.tier!=='scatter'&&s.tier!=='bonus').map(s=>s.id);
 if(!(c.primaryKind==='poker-reels'&&kind==='nudge-last')&&['nudge','nudge-last','coin-vault','travelling-wild','reverse-travelling','reel-expand','vine-spread','mystery-cross','sync-reels','sticky-reset','free-multiplier','sticky-free','sticky-five','dual-spin'].includes(kind)){
  const noWild=Array.from({length:size},(_,p)=>regular[p%regular.length]);
  assert.equal(signature(c,bet,noWild,[],rng,(cfg,g,b)=>generator.evaluate(cfg,g,b),()=>noWild,()=>noWild),undefined,'no trigger must not activate '+kind);
 }
}
writeFileSync('docs/cabinet-validation-v3.json',JSON.stringify(report,null,2));console.log('PASS 24,000 natural rounds: triggers, held cells, movement, gravity, single collection, capped conservation',report);
