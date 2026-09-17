import {assertVariant,variantFixtures} from './variant-fixtures';
import {signature} from '../assets/scripts/math/SignatureFeature';
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
 const c={...GAME_CONFIGS[3],activeRows:Array(GAME_CONFIGS[3].columns).fill(2)},symbol=c.symbols.find(s=>s.tier==='low')!.id,grid=Array(c.columns*c.rows).fill(c.scatterId!);for(let x=0;x<c.columns;x++){grid[x*c.rows]=symbol;grid[x*c.rows+1]=symbol;}grid[0]=c.wildId;
 const base=evaluateIndependent(c,grid,c.bets[2]),feature=signature(c,c.bets[2],grid,base,new SeededRNG(14),(cfg,g,b)=>evaluateIndependent(cfg,g,b),(cfg,r)=>gen.gridFromStops(cfg,cfg.reelStrips.map(s=>r.int(0,s.length))),(cfg,g,p,r)=>gen.collapse(cfg,g,p,r));
 assert(feature?.rounds.length,'open cells start ascent');for(const round of feature!.rounds)for(let p=0;p<grid.length;p++)if(p%c.rows>=2)assert.equal(round.grid[p],grid[p],'closed cells remain outside refill');
}

// Expansion must never transform closed cells or include them in animation focus.
{
 const c={...GAME_CONFIGS[1],activeRows:Array(GAME_CONFIGS[1].columns).fill(2)}, grid=Array(c.columns*c.rows).fill(c.symbols[0].id);grid[0]=c.wildId;grid[c.rows+2]=c.wildId;
 const feature=signature(c,c.bets[0],grid,[],new SeededRNG(1401),(cfg,g,b)=>evaluateIndependent(cfg,g,b),()=>grid,()=>grid);
 assert(feature);const round=feature!.rounds[0];
 assert.deepEqual(round.focus,[0,1]);assert.deepEqual(round.expandedColumns,[0]);
 for(let p=0;p<grid.length;p++)if(p%c.rows>=2)assert.equal(round.grid[p],grid[p]);
 assert.equal(round.grid[0],c.wildId);assert.equal(round.grid[1],c.wildId);
}

// Rising clouds preserve every closed symbol and keep it out of the moving overlay.
{
 const c={...GAME_CONFIGS[0],activeRows:Array(GAME_CONFIGS[0].columns).fill(2)}, grid=Array(c.columns*c.rows).fill(c.symbols[0].id);
 const feature=signature(c,c.bets[0],grid,evaluateIndependent(c,grid,c.bets[0]),new SeededRNG(1402),(cfg,g,b)=>evaluateIndependent(cfg,g,b),()=>Array(grid.length).fill(c.symbols[1].id),()=>grid);
 assert.equal(feature?.rounds.length,3);
 for(const round of feature!.rounds)for(let p=0;p<grid.length;p++)if(p%c.rows>=2){assert.equal(round.grid[p],grid[p]);assert(round.held?.includes(p));}
}
assert.equal(new Set(GAME_CONFIGS.map(c=>c.primaryKind)).size,4,'each game must have four different primary winning rules');
