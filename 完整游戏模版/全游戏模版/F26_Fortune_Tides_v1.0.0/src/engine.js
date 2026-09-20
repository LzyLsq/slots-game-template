/** Pure, injectable-random mathematics. All grids are column-major. */
function deepFreeze(value) { if (value && typeof value==='object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }
export const SYMBOLS = deepFreeze({ COIN: 0, PEARL: 1, EMERALD: 2, RUBY: 3, COMPASS: 4, CHEST: 5, WILD: 6, SCATTER: 7 });
export const MODES = deepFreeze([
  { id: 'mint', cols: 5, rows: 3, kind: 'lines' },
  { id: 'pearl', cols: 4, rows: 4, kind: 'ways' },
  { id: 'reef', cols: 5, rows: 4, kind: 'cascade' },
  { id: 'beacon', cols: 5, rows: 3, kind: 'holdspin' },
]);
export const PAYLINES = deepFreeze([
  [0,0,0,0,0], [1,1,1,1,1], [2,2,2,2,2], [0,1,2,1,0], [2,1,0,1,2],
  [0,0,1,0,0], [2,2,1,2,2], [1,0,0,0,1], [1,2,2,2,1], [0,1,1,1,0],
  [2,1,1,1,2], [1,0,1,0,1], [1,2,1,2,1], [0,1,0,1,0], [2,1,2,1,2],
  [0,2,0,2,0], [2,0,2,0,2], [0,2,2,2,0], [2,0,0,0,2], [1,1,0,1,1],
]);
// Line and way awards = total bet / nominal paths * the table multiplier.
export const PAYTABLE = deepFreeze({
  mint: [[4.2,10.5,25.2],[6.3,14.7,33.6],[8.4,21.0,52.5],[10.5,29.4,73.5],[16.8,42.0,105.0],[21.0,63.0,168.0],[31.5,84.0,210.0]],
  pearl: [[9.6,28.8],[14.4,38.4],[19.2,48.0],[24.0,67.2],[38.4,96.0],[48.0,144.0],[72.0,192.0]],
  // Columns correspond to 8–9, 10–11, 12+ matching symbols.
  reef: [[0.855,1.71,3.42],[1.14,2.28,4.56],[1.425,2.85,5.7],[1.71,3.42,6.84],[2.28,4.56,9.12],[2.85,5.7,11.4],[4.275,8.55,17.1]],
  beacon: { 3: 1, 4: 2, 5: 3 },
});
export const RULES = deepFreeze({ cascadeLimit: 8, respins: 3, coinValues: [1,2,3,5,10], holdTrigger: 6 });
const clone = grid => grid.map(col => [...col]);
const money = n => Math.round((n + Number.EPSILON) * 1e6) / 1e6;
const positions = grid => grid.flatMap((col,c) => col.map((_,r) => ({c,r})));
const unique = cells => [...new Map(cells.map(p => [`${p.c},${p.r}`, p])).values()];
function modeOf(id) { const mode = MODES.find(m => m.id === id); if (!mode) throw new RangeError(`Unknown mode: ${id}`); return mode; }
function validate(mode, grid, bet) {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive and finite');
  if (!Array.isArray(grid) || grid.length !== mode.cols || grid.some(col => !Array.isArray(col) || col.length !== mode.rows || col.some(s => !Number.isInteger(s) || s < 0 || s > 7))) throw new TypeError('Invalid column-major symbol grid');
}
function result(wins) { return { wins, award: money(wins.reduce((sum,w) => sum+w.amount,0)), remove: unique(wins.flatMap(w => w.cells)) }; }
export function evaluate(modeId, grid, bet) {
  const mode = modeOf(modeId); validate(mode,grid,bet); const wins = [];
  if (modeId === 'mint') {
    PAYLINES.forEach((line,index) => {
      let best = null;
      for (let symbol=0;symbol<=6;symbol++) {
        const cells=[];
        for (let c=0;c<5;c++) { const s=grid[c][line[c]]; if (s!==symbol && (s!==6 || symbol===6)) break; cells.push({c,r:line[c]}); }
        if (cells.length<3) continue;
        const amount=money(bet/20*PAYTABLE.mint[symbol][cells.length-3]);
        if (!best || amount>best.amount) best={cells,amount,label:`Line ${index+1} · ${cells.length} symbols`,symbol,line:index,count:cells.length};
      }
      if (best) wins.push(best);
    });
  } else if (modeId === 'pearl') {
    for (let symbol=0;symbol<=6;symbol++) {
      const columns=[];
      for (let c=0;c<4;c++) {
        const cells=grid[c].flatMap((s,r) => s===symbol || (s===6 && symbol!==6) ? [{c,r}] : []);
        if (!cells.length) break; columns.push(cells);
      }
      if (columns.length<3) continue;
      const combinations=columns.reduce((n,col) => n*col.length,1);
      // Assign any all-wild three-reel prefix exclusively to the WILD award.
      // This prevents the same prefix paying wild-3 and substituted symbol-4.
      const wildPrefix=columns.slice(0,3).reduce((n,col)=>n*col.filter(p=>grid[p.c][p.r]===6).length,1);
      const excluded=symbol===6 ? 0 : wildPrefix*(columns[3]?.length ?? 1);
      const ways=combinations-excluded;
      const cells=columns.flat().filter(p=>symbol===6 || grid[p.c][p.r]===symbol || columns.slice(0,3).some((col,c)=>c!==p.c && col.some(q=>grid[q.c][q.r]===symbol)));
      if (ways) wins.push({ cells, amount:money(bet/256*ways*PAYTABLE.pearl[symbol][columns.length-3]),label:`${ways} ways · ${columns.length} reels`,symbol,ways,count:columns.length });
    }
  } else if (modeId === 'reef') {
    for (let symbol=0;symbol<=6;symbol++) {
      const cells=positions(grid).filter(p => grid[p.c][p.r]===symbol);
      if (cells.length>=8) wins.push({cells, amount:money(bet*PAYTABLE.reef[symbol][cells.length>=12 ? 2 : cells.length>=10 ? 1 : 0]), label:`${cells.length} matching symbols`,symbol,count:cells.length});
    }
  } else {
    const cells=positions(grid).filter(p => grid[p.c][p.r]===0);
    if (cells.length>=3 && cells.length<6) wins.push({cells,amount:money(bet*PAYTABLE.beacon[cells.length]),label:`${cells.length} coins`,symbol:0,count:cells.length});
  }
  return result(wins);
}
function draw(rng) { const n=rng(); if (!Number.isFinite(n) || n<0 || n>=1) throw new RangeError('RNG must return a finite value in [0, 1)'); return n; }
// Ordinary games: six symbols at 15% each, wild 6%, non-paying scatter 4%.
function symbol(rng, modeId) {
  const n=draw(rng);
  if (modeId==='beacon') return n<0.144 ? 0 : 1+Math.min(6,Math.floor((n-0.144)/0.856*7));
  if (modeId==='reef') return [0.35,0.60,0.75,0.85,0.91,0.95,0.98,1].findIndex(limit=>n<limit);
  return n<0.9 ? Math.min(5,Math.floor(n/0.15)) : n<0.96 ? 6 : 7;
}
function coinValue(rng,bet) { const n=draw(rng); return money(bet*(n<0.45 ? 1 : n<0.7 ? 2 : n<0.85 ? 3 : n<0.95 ? 5 : 10)); }
function stage(grid, evaluation, kind, extra={}) { return {grid:clone(grid),...evaluation,kind,...extra}; }
export function spin(modeId, bet, rng=Math.random) {
  const mode=modeOf(modeId);
  if (!Number.isFinite(bet) || bet<=0) throw new RangeError('Bet must be positive and finite');
  if (typeof rng!=='function') throw new TypeError('RNG must be a function');
  let grid=Array.from({length:mode.cols},()=>Array.from({length:mode.rows},()=>symbol(rng,modeId)));
  const stages=[]; let feature; let detail='';
  if (modeId==='reef') {
    let cascades=0;
    while (cascades<RULES.cascadeLimit) {
      const ev=evaluate(modeId,grid,bet); if (!ev.wins.length) break;
      stages.push(stage(grid,ev,'cascade',{cascade:cascades+1}));
      const removed=new Set(ev.remove.map(p=>`${p.c},${p.r}`));
      grid=grid.map((col,c)=> { const kept=col.filter((_,r)=>!removed.has(`${c},${r}`)); return [...Array.from({length:mode.rows-kept.length},()=>symbol(rng,modeId)),...kept]; });
      cascades++;
    }
    const capped=cascades===RULES.cascadeLimit;
    stages.push(stage(grid,result([]),'final',{capped}));
    feature={type:'cascade',cascades,capped}; detail=capped ? '8 paid cascades reached; final board is not evaluated.' : `${cascades} paid cascades`;
  } else if (modeId==='beacon') {
    const coinValues=grid.map(col=>col.map(s=>s===0 ? coinValue(rng,bet) : 0));
    const coins=positions(grid).filter(p=>grid[p.c][p.r]===0);
    if (coins.length>=RULES.holdTrigger) {
      let remaining=3, rounds=0;
      stages.push(stage(grid,result([]),'holdspin-start',{coinValues:clone(coinValues),remaining}));
      while (remaining>0 && coinValues.flat().some(v=>v===0)) {
        let added=0; rounds++;
        for (const {c,r} of positions(grid)) if (!coinValues[c][r] && draw(rng)<0.12) { grid[c][r]=0;coinValues[c][r]=coinValue(rng,bet);added++; }
        remaining=added ? 3 : remaining-1;
        stages.push(stage(grid,result([]),'holdspin-respin',{coinValues:clone(coinValues),remaining,added,round:rounds}));
      }
      const cells=positions(grid).filter(p=>coinValues[p.c][p.r]>0);
      const award=money(coinValues.flat().reduce((sum,v)=>sum+v,0));
      stages.push(stage(grid,{wins:[{cells,amount:award,label:'Locked coin collection'}],award,remove:[]},'holdspin-collect',{coinValues:clone(coinValues),remaining}));
      feature={type:'holdspin',rounds,collected:cells.length,coinValues:clone(coinValues)};
      detail=`${cells.length} locked coins collected after ${rounds} respins`;
    } else {
      stages.push(stage(grid,evaluate(modeId,grid,bet),'base',{coinValues:clone(coinValues)})); detail=`${coins.length} coins · 6 trigger Hold & Spin`;
    }
    stages.push(stage(grid,result([]),'final',{coinValues:clone(coinValues)}));
  } else {
    stages.push(stage(grid,evaluate(modeId,grid,bet),mode.kind)); stages.push(stage(grid,result([]),'final'));
    detail=modeId==='mint' ? '20 fixed paylines · left to right' : '256 ways · leftmost consecutive reels';
  }
  return {grid:clone(grid),stages,totalWin:money(stages.reduce((sum,s)=>sum+s.award,0)),feature,detail};
}
