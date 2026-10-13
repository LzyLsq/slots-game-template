import assert from 'node:assert/strict';
import {evaluateIndependent} from '../assets/scripts/math/IndependentCore';
import {PEARL_PALACE,GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
const c=PEARL_PALACE,bet=180,grid=Array(c.rows*c.columns).fill('__empty__');
for(const p of [0,1,2,3,4])grid[p]='chip';
let wins=evaluateIndependent(c,grid,bet);assert.equal(wins.length,1);assert.equal(wins[0].count,5);assert.equal(wins[0].symbolId,'chip');
grid[4]='__empty__';assert.equal(evaluateIndependent(c,grid,bet).length,0,'Four cells are below the minimum');
for(const p of [0,6,12,18,24])grid[p]='chip';grid[1]=grid[2]=grid[3]='__empty__';assert.equal(evaluateIndependent(c,grid,bet).length,0,'Diagonal cells are not adjacent');
assert.equal(evaluateIndependent(c,Array(25).fill('wild'),bet).length,1,'One all-WILD component');
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
console.log('PASS 5+ orthogonally adjacent clusters, diagonal exclusion, no reused group cells, '+boards+' real cascade boards, stake-independent draws/layout/features.');
