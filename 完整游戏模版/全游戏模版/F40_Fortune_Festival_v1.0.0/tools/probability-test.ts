import assert from 'node:assert/strict';
import {evaluateIndependent} from '../assets/scripts/math/IndependentCore';
import {PEARL_PALACE,GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
const c=PEARL_PALACE,bet=180,grid=Array(24).fill('__empty__');
for(const p of [0,3,5,8,10,13,17,23])grid[p]='chip';
let wins=evaluateIndependent(c,grid,bet);assert.equal(wins.length,1);assert.equal(wins[0].count,8);assert.equal(wins[0].symbolId,'chip');
grid[23]='wild';assert.equal(evaluateIndependent(c,grid,bet).length,0,'WILD does not complete ordinary count');
for(const p of [1,2,4,6,7,9,11,12])grid[p]='wild';wins=evaluateIndependent(c,grid,bet);assert.equal(wins.length,1);assert.equal(wins[0].symbolId,'wild');
assert.equal(evaluateIndependent(c,Array(24).fill('wild'),bet).length,1);
const gen=new ResultGenerator(),rng=new SeededRNG(0x135a7801);let boards=0;
for(let i=0;i<12000;i++){
 const r=gen.generate(c,bet,rng);
 for(const ws of [r.wins,...(r.featureResult?.rounds.map(t=>t.wins)??[])]){
  const cells=ws.filter(w=>w.kind==='cluster').flatMap(w=>[...w.positions]);assert.equal(new Set(cells).size,cells.length);boards++;
 }
 assert.equal(r.totalWin,r.baseWin+r.featureWin);
}
for(const c of GAME_CONFIGS){const low=new SeededRNG(10091),high=new SeededRNG(10091);
 for(let i=0;i<500;i++){const a=gen.generate(c,c.bets[0],low),b=gen.generate(c,c.bets.at(-1)!,high);assert.deepEqual(a.grid,b.grid);assert.deepEqual(a.layout,b.layout);assert.deepEqual(a.featureResult?.rounds.map(t=>t.grid),b.featureResult?.rounds.map(t=>t.grid));}
}
console.log('PASS 8+ anywhere, WILD independence, no reused group cells, '+boards+' real cascade boards, stake-independent draws/layout/features.');
