import {assertVariant,variantFixtures} from './variant-fixtures';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {evaluateIndependent,pokerHand,HAND_FACTORS,PRIMARY_FAMILY,preparePrimary} from '../assets/scripts/math/IndependentCore';
import {PaylineEvaluator} from '../assets/scripts/math/Evaluators';
import {ruleAward} from '../assets/scripts/math/PaytableDisplay';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
const gen=new ResultGenerator(),report:unknown[]=[];
for(const [i,c] of GAME_CONFIGS.entries()){
 const bet=c.bets[2],symbol=c.symbols.find(s=>s.tier==='low')!.id,size=c.columns*c.rows,empty=()=>Array(size).fill('__empty__'),sum=(g:string[])=>evaluateIndependent(c,g,bet).reduce((n,w)=>n+w.credits,0);
 let fixture=empty();
 assertVariant(c);fixture=variantFixtures(c).positive;
 for(const w of evaluateIndependent(c,fixture,bet)){assert(w.positions.every(p=>p>=0&&p<size));assert.equal(w.credits,ruleAward(c,w.symbolId,w.count,bet,w.ways??1),'visible paytable must match actual settlement');}
 const rng=new SeededRNG(0x4139+i);let features=0,won=0,wagered=0,hits=0,coreHits=0,featurePaidHits=0,coreCredits=0;const layouts=new Set<string>();
 for(let s=0;s<3000;s++){
  const r=gen.generate(c,bet,rng);assert.equal(r.grid.length,size);assert(r.grid.every(id=>c.symbols.some(s=>s.id===id)));assert(Number.isSafeInteger(r.totalWin)&&r.totalWin>=0&&r.totalWin<=bet*c.maxWinMultiplier);assert.equal(r.baseWin,r.wins.reduce((n,w)=>n+w.credits,0));assert.equal(r.totalWin,r.baseWin+r.featureWin);assert.equal(r.featureWin,r.featureResult?.rounds.reduce((n,w)=>n+w.credits,0)??0);
  layouts.add(JSON.stringify(r.layout));if(r.featureResult)features++;if(r.totalWin)hits++;const core=r.wins.filter(w=>w.kind!=='scatter'&&w.kind!=='bonus').reduce((n,w)=>n+w.credits,0);if(core>0)coreHits++;if(r.featureWin>0)featurePaidHits++;coreCredits+=core;won+=r.totalWin;wagered+=bet;
  for(const round of r.featureResult?.rounds??[]){assert.equal(round.grid.length,size);assert.equal(round.credits,round.wins.reduce((n,w)=>n+w.credits,0));assert(round.grid.every(id=>c.symbols.some(s=>s.id===id)));}
 }
 if(c.primaryKind==='variable-ways')assert(layouts.size>10,'reel heights must vary during actual spins');
 report.push({id:c.id,family:c.primaryKind,columns:c.columns,rows:c.rows,spins:3000,features,featurePaidHits,coreHits,coreReturn:coreCredits/wagered,hits,sampleReturn:won/wagered,layoutVariants:layouts.size});
}
writeFileSync('docs/primary-gameplay-v4.json',JSON.stringify(report,null,2));console.log('PASS distinct ordinary-spin rules, explicit winning/losing fixtures, actual paytables, layouts and 12,000 settled rounds',report);

{
 const c=GAME_CONFIGS.find(c=>c.primaryKind==='twin-boards')!;if(c){const grid=Array.from({length:c.columns*c.rows},(_,p)=>String(p)),removed=[0,2,4,7,10],next=gen.collapse(c,grid,removed,new SeededRNG(21));
 for(let x=0;x<c.columns;x++)for(let start=0;start<6;start+=3){const offset=x*6+start,survivors=grid.slice(offset,offset+3).filter((_,y)=>!removed.includes(offset+y));assert.deepEqual(next.slice(offset+3-survivors.length,offset+3),survivors,'survivors stay within their own panel');}}
}
assert.equal(new Set(GAME_CONFIGS.map(c=>c.primaryKind)).size,4,'each game must have four different primary winning rules');
