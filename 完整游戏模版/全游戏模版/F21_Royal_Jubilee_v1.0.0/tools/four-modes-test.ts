import assert from 'node:assert/strict';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {evaluateCore} from '../assets/scripts/math/CoreGame';
import {signature} from '../assets/scripts/math/SignatureFeature';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
const generator=new ResultGenerator(),bet=100;
const configs=GAME_CONFIGS.map(c=>({...c,payoutScale:1,featurePayoutScale:1}));
assert.equal(new Set(configs.map(c=>c.coreMode)).size,4);
assert.equal(new Set(configs.map(c=>c.feature)).size,4);
const [sun,coin,pearl,royal]=configs;
const empty=(c:typeof sun)=>Array(c.columns*c.rows).fill('empty');
let grid=empty(sun);grid[0]=grid[3]=grid[6]='bars';assert.equal(evaluateCore(sun,grid,bet).length,0,'off-line matches do not pay');
grid[1]=grid[4]=grid[7]='bars';assert.equal(evaluateCore(sun,grid,bet)[0].kind,'line');
grid=empty(coin);grid[0]=grid[1]=grid[3]=grid[6]='bars';assert.equal(evaluateCore(coin,grid,bet)[0].ways,2,'two paths, no fixed line needed');
grid=empty(pearl);[0,1,2,3,4].forEach(p=>grid[p]='bars');assert.equal(evaluateCore(pearl,grid,bet)[0].count,5);grid=empty(pearl);[0,5,10,15,16].forEach(p=>grid[p]='bars');assert.equal(evaluateCore(pearl,grid,bet).length,0,'diagonal-only contact must not pay');
const evalMain=(c:typeof sun,g:readonly string[],b:number)=>evaluateCore(c,g,b);
// Expansion awards the difference only, with the starting bet factor.
grid=Array(9).fill('chip');grid[0]='wild';const base=evalMain(sun,grid,bet);const sr=signature(sun,bet,grid,base,new SeededRNG(2),evalMain,()=>{throw Error('expansion must not redraw');},()=>[])!;
assert.deepEqual(sr.rounds[0].expandedColumns,[0]);assert(sr.rounds[0].grid.slice(0,3).every(s=>s==='wild'));assert.equal(sr.totalCredits,Math.max(0,evalMain(sun,sr.rounds[0].grid,bet).reduce((n,w)=>n+w.credits,0)-base.reduce((n,w)=>n+w.credits,0)));
// One new coin resets to 3; existing positions remain locked and only final collection pays.
grid=Array(15).fill('chip');for(let i=0;i<6;i++)grid[i]='coin';let draws=0;
const cr=signature(coin,bet,grid,[],new SeededRNG(4),evalMain,()=>{const g=Array(15).fill('chip');if(draws++===0)g[8]='coin';return g;},()=>[])!;
assert.deepEqual(cr.rounds.map(r=>r.remaining),[3,3,2,1,0,0]);assert(cr.rounds.slice(0,-1).every(r=>r.credits===0));
for(const r of cr.rounds.slice(1)){assert(r.grid.slice(0,6).every(s=>s==='coin'));assert.equal(r.locked![0],cr.rounds[0].locked![0]);}
assert.equal(cr.totalCredits,Object.values(cr.rounds.at(-1)!.locked!).reduce((a,b)=>a+b,0));
const full=signature(coin,bet,Array(15).fill('coin'),[],new SeededRNG(2),evalMain,()=>{throw Error('full board cannot respin');},()=>[])!;
assert.equal(full.rounds.length,2);assert(full.rounds.at(-1)!.wins.some(w=>w.count===15));
// A cascade removes the prior win, carries the multiplier and stops at the first loss.
grid=Array(20).fill('chip');const pw=evalMain(pearl,grid,bet);let drops=0;
const pr=signature(pearl,bet,grid,pw,new SeededRNG(3),()=>drops===1?pw:[],()=>[],(_c,g,removed)=>{assert(removed.length>0);drops++;return [...g];})!;
assert.equal(pr.rounds.length,2);assert.deepEqual(pr.rounds.map(r=>r.multiplier),[2,3]);assert.equal(pr.rounds[0].credits,pw.reduce((n,w)=>n+w.credits,0)*2);assert.equal(pr.rounds[1].credits,0);
// Travellers advance exactly one reel and do not absorb new Wilds.
grid=Array(25).fill('chip');grid[2]='wild';const rr=signature(royal,bet,grid,[],new SeededRNG(5),evalMain,()=>Array(25).fill('wild'),()=>[])!;
assert.equal(rr.rounds.length,4);rr.rounds.forEach((r,i)=>{assert.deepEqual(r.focus,[(i+1)*5+2]);assert.deepEqual(r.moved,[{from:i*5+2,to:(i+1)*5+2}]);});
for(const c of GAME_CONFIGS){let features=0;const rng=new SeededRNG(0x2396);for(let i=0;i<6000;i++){
 const r=generator.generate(c,c.bets[0],rng);assert.equal(r.totalWin,r.baseWin+r.featureWin);assert.equal(r.baseWin,r.wins.reduce((n,w)=>n+w.credits,0));assert(r.totalWin>=0&&Number.isSafeInteger(r.totalWin)&&r.totalWin<=c.bets[0]*c.maxWinMultiplier);
 if(r.featureResult){features++;assert.equal(r.featureWin,r.featureResult.rounds.reduce((n,s)=>n+s.credits,0));for(const s of r.featureResult.rounds){assert.equal(s.grid.length,c.columns*c.rows);assert(s.grid.every(id=>c.symbols.some(d=>d.id===id)));assert.equal(s.credits,s.wins.reduce((n,w)=>n+w.credits,0));assert(s.wins.every(w=>w.positions.every(p=>p>=0&&p<s.grid.length)));}}
 }assert(features>0,c.id+' feature must be naturally reachable');}
console.log('PASS: four distinct cabinet rules, feature state machines, 24000 natural spins and award conservation');
