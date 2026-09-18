import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {GAME_CONFIGS,GAME_CONFIG_BY_ID,SYMBOL_ART} from '../assets/scripts/math/GameConfigs';
import {PROJECT_NUMBER,evaluateIndependent} from '../assets/scripts/math/IndependentCore';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {FEATURE_PROFILES} from '../assets/scripts/math/CabinetProfiles';
import {featureRuleText} from '../assets/scripts/math/AtelierRuleText';
import {primaryRuleText} from '../assets/scripts/math/PrimaryRuleText';
import {signature} from '../assets/scripts/math/SignatureFeature';
import {ruleAward} from '../assets/scripts/math/PaytableDisplay';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
import type {GameConfig,SpinResult} from '../assets/scripts/math/types';
const gen=new ResultGenerator(),bet=500;
const evaluate=(c:GameConfig,g:readonly string[],b:number)=>gen.evaluate(c,g,b).filter(w=>w.kind!=='scatter');
const regular=(c:GameConfig)=>c.symbols.filter(s=>!['wild','scatter','bonus'].includes(s.tier)).map(s=>s.id);
// Valid natural-symbol boards with no same-symbol straight run; never invent an award record.
const quiet=(c:GameConfig)=>Array.from({length:c.columns*c.rows},(_,p)=>regular(c)[(Math.floor(p/c.rows)*2+p%c.rows)%regular(c).length]);
assert.equal(PROJECT_NUMBER,24);assert.equal(new Set(GAME_CONFIGS.map(c=>c.primaryKind)).size,4);
assert.deepEqual(GAME_CONFIGS.map(c=>[c.columns,c.rows]),[[3,3],[5,4],[5,3],[6,5]]);
assert.deepEqual(GAME_CONFIGS.map(c=>FEATURE_PROFILES[c.id].feature),['mint-stamp','prism-free','link-respin','forge-cascade']);
assert.notEqual(SYMBOL_ART.chip,SYMBOL_ART.coin,'cash coin and locking BONUS must be visually distinguishable');
for(const c of GAME_CONFIGS)for(const locale of ['en','zh-CN','zh-TW','ja','ko']){
 const base=primaryRuleText(c,locale),bonus=featureRuleText(c,locale);assert.equal(base.length,2);assert.equal(bonus.length,3);
 assert(!base.concat(bonus).some(s=>/\{\w+\}/.test(s)),'no unresolved rule placeholders');
 if(c.id==='jade-treasury')assert(base.join(' ').includes('1024'),'1024 must be stated in every language');
 if(c.id==='ruby-revel')assert(base.join(' ').includes('6'),'six-symbol threshold must be stated in every language');
 if(locale!=='en')assert.notDeepEqual(bonus,featureRuleText(c,'en'),'bonus rules must actually switch language');
}
// Mint: one stamped reel, outer reels fixed, exact per-line difference (never repay base).
{
 const c=GAME_CONFIG_BY_ID['golden-hour'],mintBet=50,grid=quiet(c);grid[4]=c.wildId;grid[0]=grid[6]='crown';
 const before=gen.evaluate(c,grid,mintBet),r=signature(c,mintBet,grid,before,new SeededRNG(1),evaluate,()=>{throw Error('mint must not draw a board');},()=>{throw Error('mint must not collapse');})!;
 assert(r);assert.equal(r.rounds.length,1);const round=r.rounds[0],next=[...grid];[3,4,5].forEach(p=>next[p]=c.wildId);
 assert.deepEqual(round.grid,next);assert.deepEqual(round.expandedColumns,[1]);assert.equal(round.motion,'expand');
 const old=new Map(before.map(w=>[w.lineIndex,w.rawCredits??w.credits]));const expected=gen.evaluate(c,next,mintBet).map(w=>[w.lineIndex,Math.max(0,(w.rawCredits??w.credits)-(old.get(w.lineIndex)??0))]).filter(([,credits])=>credits>0);
 assert.deepEqual(round.wins.map(w=>[w.lineIndex,w.rawCredits]),expected);assert(round.wins.every(w=>w.credits===Math.round(w.rawCredits??w.credits)));
 const already=signature(c,mintBet,next,gen.evaluate(c,next,mintBet),new SeededRNG(1),evaluate,()=>next,()=>next)!;assert.equal(already.totalCredits,0,'already-stamped board pays no duplicate amount');
 assert.equal(signature(c,mintBet,quiet(c),[],new SeededRNG(1),evaluate,()=>quiet(c),()=>quiet(c)),undefined,'no middle Wild means no stamp');
}
// Prism: exactly six fresh boards at x2. Free-spin SCATTER never pays or retriggers.
{
 const c=GAME_CONFIG_BY_ID['jade-treasury'],grid=quiet(c);[0,4,8].forEach(p=>grid[p]=c.scatterId!);let draws=0;
 const fresh=Array(c.columns*c.rows).fill(c.scatterId!);[1,5,9].forEach(p=>fresh[p]='crown');
 const r=signature(c,bet,grid,gen.evaluate(c,grid,bet),new SeededRNG(2),evaluate,()=>{draws++;return [...fresh];},()=>fresh)!;
 assert.equal(draws,6);assert.equal(r.rounds.length,6);
 for(const [i,round]of r.rounds.entries()){assert.equal(round.multiplier,2);assert.equal(round.remaining,5-i);assert.deepEqual(round.wins.map(w=>w.credits),evaluate(c,fresh,bet*2).map(w=>w.credits));assert(round.wins.every(w=>w.kind!=='scatter'));}
 const noTrigger=[...grid];noTrigger[8]=regular(c)[0];assert.equal(signature(c,bet,noTrigger,[],new SeededRNG(2),evaluate,()=>fresh,()=>fresh),undefined);
 // A path starting on reel two is not a left-start way.
 const isolated=Array(c.columns*c.rows).fill(c.scatterId!);[c.rows,2*c.rows,3*c.rows].forEach(p=>isolated[p]='crown');assert.equal(evaluateIndependent(c,isolated,bet).length,0);
 isolated[0]='crown';const w=evaluateIndependent(c,isolated,bet)[0];assert.equal(w.count,4);assert.equal(w.ways,1);assert.equal(w.credits,ruleAward(c,'crown',4,bet,1));
}
// Links: locked values remain fixed, three misses end, exactly one final collection.
{
 const c=GAME_CONFIG_BY_ID['pearl-palace'],grid=quiet(c),target=c.bonusId!;[0,5,10].forEach(p=>grid[p]=target);
 let draws=0;const r=signature(c,bet,grid,gen.evaluate(c,grid,bet),new SeededRNG(3),evaluate,()=>{draws++;return quiet(c);},()=>grid)!;
 assert.equal(draws,3);assert.equal(r.rounds.length,5);assert(r.rounds.slice(0,-1).every(round=>round.credits===0));
 const initial=r.rounds[0].locked!;for(const round of r.rounds){assert.deepEqual(round.locked,initial);for(const p of Object.keys(initial))assert.equal(round.grid[Number(p)],target);}
 assert.equal(r.totalCredits,Object.values(initial).reduce((a,b)=>a+b,0));assert.deepEqual(r.rounds.filter(round=>round.motion==='respin').map(round=>round.remaining),[2,1,0]);
 // One newly appearing coin resets chances to three, then three misses end.
 let index=0;const reset=signature(c,bet,grid,[],new SeededRNG(3),evaluate,()=>{const next=quiet(c);if(index++===1)next[2]=target;return next;},()=>grid)!;
 assert.equal(index,5);assert.deepEqual(reset.rounds.filter(round=>round.motion==='respin').map(round=>round.remaining),[2,3,2,1,0]);
 assert.equal(reset.totalCredits,Object.values(reset.rounds.at(-1)!.locked!).reduce((a,b)=>a+b,0));
 // A new coin on every respin cannot continue past twelve respins.
 let step=0;const free=Array.from({length:grid.length},(_,p)=>p).filter(p=>grid[p]!==target);const capped=signature(c,bet,grid,[],new SeededRNG(3),evaluate,()=>{const next=quiet(c);if(step<free.length)next[free[step++]]=target;return next;},()=>grid)!;
 assert.equal(capped.rounds.filter(round=>round.motion==='respin').length,12);assert.equal(Object.keys(capped.rounds.at(-1)!.locked!).length,15);assert.equal(capped.totalCredits,Object.values(capped.rounds.at(-1)!.locked!).reduce((a,b)=>a+b,0),'full board has no invented jackpot');
 assert.equal(signature(c,bet,quiet(c),[],new SeededRNG(3),evaluate,()=>quiet(c),()=>grid),undefined);
}
// Forge: six-connected threshold, separate groups, exact x2/x3/x5/x8 boards and real gravity.
{
 const c=GAME_CONFIG_BY_ID['ruby-revel'],grid=quiet(c),shape=[0,1,5,6,10,11];shape.forEach(p=>grid[p]='crown');
 const base=gen.evaluate(c,grid,bet);assert(base.some(w=>w.symbolId==='crown'&&w.count>=6));let calls=0;
 const r=signature(c,bet,grid,base,new SeededRNG(4),evaluate,()=>grid,(_c,_g,removed)=>{calls++;assert(removed.length>=6);return [...grid];})!;
 assert.equal(calls,4);assert.deepEqual(r.rounds.map(x=>x.multiplier),[2,3,5,8]);for(const round of r.rounds)assert.deepEqual(round.wins.map(w=>w.credits),evaluate(c,grid,bet*round.multiplier!).map(w=>w.credits));
 const stop=signature(c,bet,grid,base,new SeededRNG(4),evaluate,()=>quiet(c),()=>quiet(c))!;assert.equal(stop.rounds.length,1);assert.equal(stop.totalCredits,0,'empty refill ends without fabricated reward');
 const collapsed=gen.collapse(c,grid,[1,6,11],new SeededRNG(4));for(let x=0;x<c.columns;x++){const survivors=grid.slice(x*c.rows,(x+1)*c.rows).filter((_,y)=>![1,6,11].includes(x*c.rows+y));assert.deepEqual(collapsed.slice((x+1)*c.rows-survivors.length,(x+1)*c.rows),survivors);}
 const gaps=quiet(c);[0,2,4,6,8,10].forEach(p=>gaps[p]='crown');assert(!evaluateIndependent(c,gaps,bet).some(w=>w.symbolId==='crown'),'six scattered crowns do not form a group');
}
// Natural seeds prove every feature and positive winning presentation is reachable without forcing.
const fixtures:Record<string,{base:SpinResult;feature:SpinResult;featureSeed:number}>= {},report=[];
for(const [index,c]of GAME_CONFIGS.entries()){
 let base:SpinResult|undefined,feature:SpinResult|undefined,featureSeed=0,naturalFeatureCount=0;
 const rng=new SeededRNG(24000+index);
 for(let i=0;i<6000;i++){
  const seed=rng.snapshot(),r=gen.generate(c,c.bets[2],rng);assert.equal(r.totalWin,r.baseWin+r.featureWin);assert.equal(r.baseWin,r.wins.reduce((n,w)=>n+w.credits,0));assert.equal(r.featureWin,r.featureResult?.rounds.reduce((n,w)=>n+w.credits,0)??0);assert(r.totalWin>=0&&Number.isSafeInteger(r.totalWin)&&r.totalWin<=c.bets[2]*c.maxWinMultiplier);
  if(!base&&r.wins.some(w=>w.credits>0))base=r;if(r.featureResult)naturalFeatureCount++;if(!feature&&r.featureWin>0){feature=r;featureSeed=seed;}
  for(const w of [...r.wins,...(r.featureResult?.rounds.flatMap(x=>[...x.wins])??[])])assert(w.positions.length&&w.positions.every(p=>p>=0&&p<c.rows*c.columns),'every payable award points to real positions');
 }
 assert(base&&feature,'positive base and bonus must be naturally reachable');fixtures[c.id]={base:base!,feature:feature!,featureSeed};report.push({id:c.id,name:c.name,primary:c.primaryKind,bonus:FEATURE_PROFILES[c.id].feature,naturalRounds:6000,naturalFeatures:naturalFeatureCount,featureSeed});
 const plain=gen.generate(c,bet,new SeededRNG(240)),forcedTier=gen.generate(c,bet,new SeededRNG(240),{winTier:'epic'});assert.equal(plain.totalWin,forcedTier.totalWin);assert.deepEqual(plain.grid,forcedTier.grid,'visual win tier must not fabricate a payout');
}
writeFileSync('docs/f24-winning-fixtures.json',JSON.stringify(fixtures,null,2));writeFileSync('docs/f24-gameplay-test.json',JSON.stringify(report,null,2));
console.log('PASS F24: deterministic rules/bonus boundaries, 5-language rule content, 24,000 natural rounds, no invented payout, four positive base/feature fixtures',report);
