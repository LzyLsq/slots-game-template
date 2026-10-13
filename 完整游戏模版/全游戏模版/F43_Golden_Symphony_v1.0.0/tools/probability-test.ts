import assert from 'node:assert/strict';
import {evaluateIndependent} from '../assets/scripts/math/IndependentCore';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
const c=GAME_CONFIGS.find(c=>c.id==='ruby-brass')!,bet=180,grid=Array(16).fill('__empty__');
for(const p of [0,1,2,3,4])grid[p]='chip';let wins=evaluateIndependent(c,grid,bet);assert.equal(wins.length,1);assert.equal(wins[0].count,5);
grid[4]='wild';wins=evaluateIndependent(c,grid,bet);assert.equal(wins.length,1,'wild substitutes in connected group');
const disconnected=Array(16).fill('__empty__');[0,2,5,8,10,13,15].forEach(p=>disconnected[p]='chip');assert.equal(evaluateIndependent(c,disconnected,bet).length,0,'diagonal or separated symbols cannot form a connected group');
assert.equal(evaluateIndependent(c,Array(16).fill('wild'),bet).length,1);
const gen=new ResultGenerator(),rng=new SeededRNG(0x43ce01);let boards=0;
for(let i=0;i<12000;i++){
 const r=gen.generate(c,bet,rng);for(const ws of [r.wins,...(r.featureResult?.rounds.map(t=>t.wins)??[])]){const cells=ws.filter(w=>w.kind==='cluster').flatMap(w=>[...w.positions]);assert.equal(new Set(cells).size,cells.length);boards++;}assert.equal(r.totalWin,r.baseWin+r.featureWin);
 for(const step of r.featureResult?.rounds??[]){assert.equal(step.grid.length,16);assert(step.grid.every(s=>c.symbols.some(d=>d.id===s)));assert([2,4,6].includes(step.multiplier!));}
}
for(const cfg of GAME_CONFIGS){const low=new SeededRNG(10091),high=new SeededRNG(10091);for(let i=0;i<500;i++){const a=gen.generate(cfg,cfg.bets[0],low),b=gen.generate(cfg,cfg.bets.at(-1)!,high);assert.deepEqual(a.grid,b.grid);assert.deepEqual(a.layout,b.layout);assert.deepEqual(a.featureResult?.rounds.map(t=>t.grid),b.featureResult?.rounds.map(t=>t.grid));}}
console.log(`PASS connected groups, WILD substitution, single ownership, ${boards} cascade boards, stake-independent grids/features.`);
