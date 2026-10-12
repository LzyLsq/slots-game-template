import test from 'node:test';
import assert from 'node:assert/strict';
import {MODES, PAYLINES, PAYTABLE, evaluate, spin, seeded} from '../src/engine.js';

const weights={
  'royal-mint':[9,11,12,13,14,15,8,4],
  'jade-treasury':[9,10,11,12,13,14,15,5],
  'diamond-foundry':[9,10,11,12,13,14,15,6],
  'crown-wheel':[8,9,10,12,13,14,5,4],
};
const pickValue=(mode,symbol)=>{
  const list=weights[mode],total=list.reduce((a,b)=>a+b,0);
  return (list.slice(0,symbol).reduce((a,b)=>a+b,0)+list[symbol]/2)/total;
};
const sequence=values=>{let i=0;return()=>values[Math.min(i++,values.length-1)];};
const valuesForGrid=(mode,grid)=>grid.flatMap(column=>column.map(symbol=>pickValue(mode,symbol)));
const board=(cols,rows,fill=6)=>Array.from({length:cols},()=>Array(rows).fill(fill));

test('four modes expose distinct traditional slot structures',()=>{
  assert.deepEqual(MODES.map(({id,cols,rows,kind})=>[id,cols,rows,kind]),[
    ['royal-mint',3,3,'paylines'],['jade-treasury',5,4,'ways'],
    ['diamond-foundry',6,5,'cluster'],['crown-wheel',5,3,'paylines'],
  ]);
  assert.equal(PAYLINES['royal-mint'].length,5);
  assert.equal(PAYLINES['crown-wheel'].length,20);
});

test('Royal Mint pays five fixed lines and nudge shifts the complete third reel',()=>{
  const base=[[1,0,2],[3,0,4],[0,1,6]];
  assert.equal(evaluate('royal-mint',base,100).award,0);
  const rng=sequence([...valuesForGrid('royal-mint',base),0,.8,pickValue('royal-mint',2)]);
  const result=spin('royal-mint',100,rng);
  assert.equal(result.stages.length,2);
  assert.equal(result.stages[1].kind,'nudge');
  assert.equal(result.stages[1].direction,1);
  assert.deepEqual(result.stages[0].grid[2],[0,1,6]);
  assert.deepEqual(result.stages[1].grid[2],[2,0,1]);
  assert.equal(result.stages[1].award,300);
  assert.deepEqual(result.stages[0].grid,base,'base snapshot is not mutated by nudge');
});

test('Jade Treasury expands a wild reel before calculating 1024 ways',()=>{
  const grid=[[0,1,2,3],[0,4,5,6],[7,4,5,6],[0,1,2,3],[0,4,5,6]];
  const evaluation=evaluate('jade-treasury',grid,1024);
  assert.equal(evaluation.award,20);
  assert.equal(evaluation.wins[0].ways,4);
  const result=spin('jade-treasury',1024,sequence(valuesForGrid('jade-treasury',grid)));
  assert.equal(result.stages[0].kind,'expanding-wild');
  assert.deepEqual(result.stages[0].expandedReels,[2]);
  assert.deepEqual(result.stages[0].grid[2],[7,7,7,7]);
});

test('Diamond Foundry detects orthogonal 5+ clusters and applies cascade multiplier',()=>{
  const grid=board(6,5);
  grid[0]=[0,0,0,0,0];
  for(let c=1;c<6;c++)grid[c]=Array.from({length:5},(_,r)=>1+(c+r)%5);
  const base=evaluate('diamond-foundry',grid,100);
  const triple=evaluate('diamond-foundry',grid,100,{cascadeMultiplier:3});
  assert.equal(base.wins.length,1);
  assert.equal(base.wins[0].count,5);
  assert.equal(base.award,60);
  assert.equal(triple.award,180);
  assert.equal(new Set(base.remove.map(({c,r})=>`${c}:${r}`)).size,5);
});

test('Crown Wheel triggers one weighted wheel stage from 3+ scatter symbols',()=>{
  const grid=[[6,1,2],[3,6,4],[5,1,6],[2,3,4],[5,0,1]];
  const result=spin('crown-wheel',100,sequence([...valuesForGrid('crown-wheel',grid),.999]));
  const wheel=result.stages.filter(stage=>stage.kind==='wheel');
  assert.equal(wheel.length,1);
  assert.equal(result.feature.wheel,true);
  assert.equal(result.feature.multiplier,50);
  assert.equal(wheel[0].award,5000);
  assert.equal(wheel[0].wins[0].cells.length,3);
});

test('seeded spins are deterministic, dimensionally valid and use detached snapshots',()=>{
  for(const mode of MODES){
    const a=spin(mode.id,100,seeded(27));
    const b=spin(mode.id,100,seeded(27));
    assert.deepEqual(a,b);
    assert.equal(a.grid.length,mode.cols);
    assert.ok(a.grid.every(column=>column.length===mode.rows));
    assert.equal(a.totalWin,Math.round(a.stages.reduce((sum,stage)=>sum+stage.award,0)*1000)/1000);
    const final=structuredClone(a.grid);
    a.stages[0].grid[0][0]=(a.stages[0].grid[0][0]+1)%8;
    assert.deepEqual(a.grid,final);
  }
});

test('invalid requests fail and exported rule data stays immutable',()=>{
  assert.throws(()=>spin('unknown',100),RangeError);
  assert.throws(()=>spin('royal-mint',0),RangeError);
  assert.throws(()=>spin('royal-mint',100,()=>1),RangeError);
  assert.throws(()=>evaluate('royal-mint',[],100),TypeError);
  assert.throws(()=>{MODES[0].rows=99;},TypeError);
  assert.throws(()=>{PAYTABLE['royal-mint'][0][3]=999;},TypeError);
});
