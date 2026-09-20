import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../src/engine.js',import.meta.url),'utf8');
const {MODES,PAYLINES,PAYTABLE,evaluate,spin}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const board=(cols,rows,s=7)=>Array.from({length:cols},()=>Array(rows).fill(s));
function sequence(values,fallback=0.99) {let i=0;return ()=>i<values.length ? values[i++] : fallback;}
function seeded(seed) {return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
test('mint: 20 distinct paylines, first-reel adjacency, wild substitution',()=>{
  assert.equal(PAYLINES.length,20);assert.equal(new Set(PAYLINES.map(x=>x.join())).size,20);
  const g=board(5,3);g[0][0]=5;g[1][0]=6;g[2][0]=5;
  const e=evaluate('mint',g,20);assert.equal(e.award,21);assert.equal(e.wins.length,1);
  g[0][0]=7;g[3][0]=5;assert.equal(evaluate('mint',g,20).award,0);
  const wild=board(5,3);wild[0][0]=wild[1][0]=wild[2][0]=6;
  assert.equal(evaluate('mint',wild,20).award,31.5);
});
test('pearl: all 256 ways, substitution and pure wild once',()=>{
  assert.equal(evaluate('pearl',board(4,4,1),1).award,38.4);
  const g=board(4,4);g[0][0]=1;g[0][1]=1;g[1][0]=6;g[2][0]=1;g[2][1]=1;
  const ev=evaluate('pearl',g,256);assert.equal(ev.award,57.6);assert.equal(ev.wins[0].ways,4);
  assert.equal(evaluate('pearl',board(4,4,6),1).award,192);
});
test('reef: eight anywhere, no wild substitution, all paying groups removed',()=>{
  const g=board(5,4);for(let i=0;i<8;i++)g[Math.floor(i/4)][i%4]=1;
  assert.equal(evaluate('reef',g,10).award,11.4);
  g[0][0]=6;assert.equal(evaluate('reef',g,10).award,0);
  const two=board(5,4);for(let i=0;i<16;i++)two[Math.floor(i/4)][i%4]=i<8?0:1;
  assert.equal(evaluate('reef',two,10).award,19.95);assert.equal(evaluate('reef',two,10).remove.length,16);
});
test('reef: gravity, fresh refill and hard eight-cascade limit',()=>{
  const start=Array(8).fill(0.01).concat(Array(12).fill(0.99));
  const normal=spin('reef',1,sequence(start));assert.equal(normal.stages.length,2);assert.equal(normal.totalWin,0.855);assert.equal(normal.feature.cascades,1);
  assert.ok(normal.grid.flat().every(s=>s===7));
  const capped=spin('reef',1,()=>0);assert.equal(capped.feature.cascades,8);assert.equal(capped.totalWin,27.36);assert.equal(capped.stages.at(-1).capped,true);assert.deepEqual(capped.stages.at(-1).wins,[]);
});
test('beacon: 3/4/5 base coins pay fixed totals',()=>{
  for(let n=3;n<=5;n++){const g=board(5,3);for(let i=0;i<n;i++)g[Math.floor(i/3)][i%3]=0;assert.equal(evaluate('beacon',g,2).award,(n-2)*2);}
});
test('beacon: locked values survive failed respins and new coin resets counter',()=>{
  const initial=Array(6).fill(0.01).concat(Array(9).fill(0.99));
  const values=Array(6).fill(0); // six 1x coin values
  const firstFail=Array(9).fill(0.99);
  const secondAdd=[0,0.99,...Array(8).fill(0.99)]; // add a 10x coin, remaining reset to 3
  const game=spin('beacon',2,sequence([...initial,...values,...firstFail,...secondAdd]));
  const steps=game.stages.filter(s=>s.kind==='holdspin-respin');
  assert.deepEqual(steps.map(s=>s.remaining),[2,3,2,1,0]);assert.equal(game.feature.rounds,5);
  assert.equal(game.totalWin,32);assert.equal(game.feature.collected,7);
  for(const s of game.stages)for(let i=0;i<6;i++)assert.equal(s.coinValues[Math.floor(i/3)][i%3],2);
  assert.equal(game.stages.filter(s=>s.award>0).length,1);
  assert.equal(game.stages.at(-1).award,0);
});
test('all-coins feature collects immediately with no respins',()=>{
  const game=spin('beacon',1,()=>0);assert.equal(game.feature.rounds,0);assert.equal(game.totalWin,15);
});
test('all modes deterministic; stage totals, dimensions and final empty stage hold',()=>{
  for(const m of MODES)for(let seed=1;seed<=150;seed++){
    const a=spin(m.id,1,seeded(seed)),b=spin(m.id,1,seeded(seed));assert.deepEqual(a,b);
    assert.equal(a.grid.length,m.cols);assert.ok(a.grid.every(c=>c.length===m.rows));
    assert.ok(Math.abs(a.totalWin-a.stages.reduce((s,x)=>s+x.award,0))<1e-5);
    assert.equal(a.stages.at(-1).award,0);assert.deepEqual(a.stages.at(-1).wins,[]);
    assert.ok(a.stages.length<=50);
  }
});
test('invalid requests fail explicitly',()=>{
  assert.throws(()=>spin('bad',1),RangeError);assert.throws(()=>spin('mint',0),RangeError);
  assert.throws(()=>spin('mint',1,()=>1),RangeError);assert.throws(()=>evaluate('mint',[],1),TypeError);
});

test('pearl: leading all-wild prefix belongs only to wild, with exact winning cells',()=>{
  const g=board(4,4);g[0][0]=g[1][0]=g[2][0]=6;g[3][0]=1;
  let e=evaluate('pearl',g,256);assert.equal(e.award,72);assert.equal(e.wins.length,1);assert.equal(e.wins[0].symbol,6);
  g[0][1]=1;e=evaluate('pearl',g,256);
  const pearl=e.wins.find(w=>w.symbol===1);assert.equal(pearl.ways,1);assert.equal(pearl.amount,38.4);
  assert.deepEqual(pearl.cells,[{c:0,r:1},{c:1,r:0},{c:2,r:0},{c:3,r:0}]);
});
test('evaluations preserve input, snapshots independent, exported rules deeply immutable',()=>{
  const g=board(5,3,1),before=structuredClone(g);evaluate('mint',g,100);assert.deepEqual(g,before);
  assert.throws(()=>{PAYTABLE.mint[0][0]=999;},TypeError);assert.throws(()=>{PAYLINES[0][0]=2;},TypeError);
  assert.throws(()=>{MODES[0].rows=99;},TypeError);
  const game=spin('reef',100,()=>0),last=structuredClone(game.stages.at(-1).grid);
  game.stages[0].grid[0][0]=7;assert.deepEqual(game.stages.at(-1).grid,last);
  game.grid[0][0]=7;assert.deepEqual(game.stages.at(-1).grid,last);
});
test('seeded winning cells correspond to the evaluated symbol and dimensions',()=>{
  for(const mode of MODES)for(let seed=200;seed<350;seed++){
    const game=spin(mode.id,100,seeded(seed));
    for(const st of game.stages)for(const w of st.wins)for(const {c,r} of w.cells){
      assert.ok(c>=0&&c<mode.cols&&r>=0&&r<mode.rows);
      const s=st.grid[c][r];
      if(mode.id==='beacon')assert.equal(s,0);
      else if(mode.id==='reef')assert.equal(s,w.symbol);
      else assert.ok(s===w.symbol||s===6);
    }
  }
});
