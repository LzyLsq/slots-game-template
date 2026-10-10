import assert from 'node:assert/strict';
import { ClusterEvaluator } from '../assets/scripts/math/Evaluators';
import { PEARL_PALACE, GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { primaryRuleText } from '../assets/scripts/math/PrimaryRuleText';

const evaluator=new ClusterEvaluator(),bet=180;
const grid=Array(25).fill('__empty__');
for(const p of [0,1,5,6])grid[p]='chip';
for(const p of [11,12,16,17])grid[p]='aqua';
grid[7]='wild';
const shared=evaluator.evaluate(PEARL_PALACE,grid,bet);
assert.equal(shared.length,1,'one shared WILD cannot produce two paid five-symbol groups');
assert.equal(shared[0].symbolId,'aqua','the higher-paying available group owns the shared WILD');
assert.deepEqual(evaluator.evaluate({...PEARL_PALACE,symbols:[...PEARL_PALACE.symbols].reverse()},grid,bet),shared,'symbol listing order must not choose the paid group');
const surviving=[...grid];surviving[2]='chip';surviving[22]='aqua';
const wins=evaluator.evaluate(PEARL_PALACE,surviving,bet);
assert.equal(wins.length,2,'a natural five-symbol group must still pay after another group claims the WILD');
assert.equal(wins.filter(w=>w.positions.includes(7)).length,1);
assert.equal(wins.find(w=>w.symbolId==='chip')?.count,5);
assert.equal(evaluator.evaluate(PEARL_PALACE,Array(25).fill('wild'),bet).length,1,'an all-WILD board pays one canonical group');
const disconnected=Array(25).fill('__empty__');
for(const p of [0,1,5,6,10,14,18,19,23,24])disconnected[p]='chip';
assert.equal(evaluator.evaluate(PEARL_PALACE,disconnected,bet).length,2,'separate natural groups of the same symbol both pay');
for(const locale of ['en','zh-CN','zh-TW','ja','ko'])assert(primaryRuleText(PEARL_PALACE,locale).some(p=>p.includes('WILD')),'every language explains WILD ownership');

const gen=new ResultGenerator(),rng=new SeededRNG(0x135a7801);
let boards=0;
for(let i=0;i<12000;i++) {
  const r=gen.generate(PEARL_PALACE,bet,rng);
  for(const ws of [r.wins,...(r.featureResult?.rounds.map(t=>t.wins)??[])]) {
    const cells=ws.filter(w=>w.kind==='cluster').flatMap(w=>[...w.positions]);
    assert.equal(new Set(cells).size,cells.length,'paid Koi clusters must never reuse a cell on the same board');boards++;
  }
  assert.equal(r.totalWin,r.baseWin+r.featureWin);
}
for(const c of GAME_CONFIGS) {
  const a=new ResultGenerator(),b=new ResultGenerator(),low=new SeededRNG(10091),high=new SeededRNG(10091);
  for(let i=0;i<500;i++) {
    const x=a.generate(c,c.bets[0],low),y=b.generate(c,c.bets.at(-1)!,high);
    assert.deepEqual(x.grid,y.grid,'stake size must not change the reel draw');
    assert.deepEqual(x.featureResult?.rounds.map(t=>t.grid),y.featureResult?.rounds.map(t=>t.grid),'stake size must not change feature draws');
  }
}
console.log('PASS shared-WILD conflicts, surviving natural clusters, all-WILD and disconnected groups, '+boards+' natural Koi boards, stake-independent draws');
