// @ts-nocheck
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freeze(item);
  }
  return value;
};
const copy = grid => grid.map(column => [...column]);
const round = value => Math.round((value + Number.EPSILON) * 1000) / 1000;
const cellKey = (c, r) => `${c}:${r}`;

export const MODES = freeze([
  {id:'royal-mint',name:'Royal Mint',cols:3,rows:3,kind:'paylines',rule:'5 fixed paylines · mechanical nudge',accent:'#e54738'},
  {id:'jade-treasury',name:'Jade Treasury',cols:5,rows:4,kind:'ways',rule:'1024 ways · expanding wild reels',accent:'#24a878'},
  {id:'diamond-foundry',name:'Diamond Foundry',cols:6,rows:5,kind:'cluster',rule:'5+ clusters · cascading multiplier',accent:'#77bfe9'},
  {id:'crown-wheel',name:'Crown Wheel',cols:5,rows:3,kind:'paylines',rule:'20 fixed paylines · wheel scatter',accent:'#c92845'},
]);

export const PAYLINES = freeze({
  'royal-mint': [
    [1,1,1], [0,0,0], [2,2,2], [0,1,2], [2,1,0],
  ],
  'crown-wheel': [
    [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
    [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
    [2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],
    [1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],
  ],
});

export const PAYTABLE = freeze({
  'royal-mint': {
    0:{3:15},1:{3:10},2:{3:8},3:{3:6},4:{3:5},5:{3:4},6:{3:3},7:{3:25},
  },
  'jade-treasury': {
    0:{3:0.7,4:1.8,5:5},1:{3:0.6,4:1.5,5:4},2:{3:0.5,4:1.25,5:3.4},3:{3:0.4,4:1,5:2.7},
    4:{3:0.32,4:0.8,5:2.1},5:{3:0.25,4:0.65,5:1.7},6:{3:0.2,4:0.5,5:1.3},7:{3:1,4:3,5:8},
  },
  'diamond-foundry': {
    0:{5:0.6,7:1.2,9:2.4,12:5},1:{5:0.5,7:1,9:2,12:4},2:{5:0.42,7:0.85,9:1.7,12:3.4},
    3:{5:0.36,7:0.72,9:1.45,12:2.9},4:{5:0.3,7:0.6,9:1.2,12:2.4},5:{5:0.26,7:0.52,9:1,12:2},
    6:{5:0.22,7:0.44,9:0.88,12:1.75},7:{5:0.75,7:1.5,9:3,12:6},
  },
  'crown-wheel': {
    0:{3:2,4:6,5:20},1:{3:1.5,4:4,5:14},2:{3:1.2,4:3.2,5:10},3:{3:1,4:2.5,5:8},
    4:{3:0.8,4:2,5:6},5:{3:0.6,4:1.5,5:4.5},7:{3:3,4:10,5:35},
  },
});

const WEIGHTS = freeze({
  'royal-mint':[9,11,12,13,14,15,8,4],
  'jade-treasury':[9,10,11,12,13,14,15,5],
  'diamond-foundry':[9,10,11,12,13,14,15,6],
  'crown-wheel':[8,9,10,12,13,14,5,4],
});
const WHEEL = freeze([{m:2,w:28},{m:3,w:24},{m:5,w:18},{m:8,w:12},{m:10,w:8},{m:15,w:5},{m:25,w:3},{m:50,w:1}]);

function assertRandom(value) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('random must return a number in [0,1)');
  return value;
}
function pick(weights, random) {
  const total=weights.reduce((a,b)=>a+b,0); let target=assertRandom(random())*total;
  for(let i=0;i<weights.length;i++){target-=weights[i];if(target<0)return i;}
  return weights.length-1;
}
function makeGrid(mode, random) {
  return Array.from({length:mode.cols},()=>Array.from({length:mode.rows},()=>pick(WEIGHTS[mode.id],random)));
}
function validateGrid(mode, grid) {
  if (!Array.isArray(grid)||grid.length!==mode.cols||grid.some(col=>!Array.isArray(col)||col.length!==mode.rows||col.some(v=>!Number.isInteger(v)||v<0||v>7))) throw new TypeError('invalid grid');
}
function payFor(table, symbol, count) {
  const row=table[symbol]; if(!row)return 0;
  const key=Object.keys(row).map(Number).filter(n=>n<=count).sort((a,b)=>b-a)[0];
  return key ? row[key] : 0;
}
function lineWin(grid,line,wild,scatter,table,lineBet) {
  let symbol=null,count=0,cells=[];
  for(let c=0;c<line.length;c++){
    const s=grid[c][line[c]];
    if(s===scatter)break;
    if(symbol===null&&s!==wild)symbol=s;
    if(s===wild||symbol===null||s===symbol){count++;cells.push({c,r:line[c]});}
    else break;
  }
  if(symbol===null)symbol=wild;
  const multiplier=payFor(table,symbol,count);
  return multiplier ? {symbol,count,cells,multiplier,amount:round(multiplier*lineBet)} : null;
}
function evaluateLines(mode,grid,bet) {
  const lines=PAYLINES[mode.id],lineBet=bet/lines.length,wins=[];
  for(let i=0;i<lines.length;i++){
    const win=lineWin(grid,lines[i],7,mode.id==='crown-wheel'?6:-1,PAYTABLE[mode.id],lineBet);
    if(win)wins.push({...win,line:i+1});
  }
  return {wins,award:round(wins.reduce((sum,w)=>sum+w.amount,0)),remove:[]};
}
function expandJadeWilds(grid) {
  const expanded=copy(grid),reels=[];
  for(let c=0;c<expanded.length;c++)if(expanded[c].includes(7)){
    reels.push(c); expanded[c]=expanded[c].map(()=>7);
  }
  return {grid:expanded,reels};
}
function evaluateWays(grid,bet) {
  const wins=[];
  for(let symbol=0;symbol<8;symbol++){
    const matches=[];
    for(let c=0;c<grid.length;c++){
      const rows=[];for(let r=0;r<grid[c].length;r++)if(grid[c][r]===symbol||grid[c][r]===7)rows.push(r);
      if(!rows.length)break; matches.push(rows);
    }
    if(matches.length<3)continue;
    if(symbol===7 && matches[0].every(r=>grid[0][r]!==7))continue;
    const ways=matches.reduce((n,rows)=>n*rows.length,1),multiplier=payFor(PAYTABLE['jade-treasury'],symbol,matches.length);
    if(!multiplier)continue;
    const cells=[];matches.forEach((rows,c)=>rows.forEach(r=>cells.push({c,r})));
    wins.push({symbol,count:matches.length,ways,cells,multiplier,amount:round(multiplier*ways*bet/1024)});
  }
  const dedup=new Map();
  for(const w of wins){const k=w.cells.map(({c,r})=>cellKey(c,r)).sort().join('|');const prior=dedup.get(k);if(!prior||prior.amount<w.amount)dedup.set(k,w);}
  const values=[...dedup.values()];
  return {wins:values,award:round(values.reduce((s,w)=>s+w.amount,0)),remove:[]};
}
function clusters(grid) {
  const seen=new Set(),groups=[];
  for(let c=0;c<grid.length;c++)for(let r=0;r<grid[c].length;r++){
    const start=cellKey(c,r);if(seen.has(start))continue;
    const symbol=grid[c][r],queue=[{c,r}],cells=[];seen.add(start);
    while(queue.length){const cell=queue.shift();cells.push(cell);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nc=cell.c+dc,nr=cell.r+dr,k=cellKey(nc,nr);
      if(nc>=0&&nc<grid.length&&nr>=0&&nr<grid[nc].length&&!seen.has(k)&&grid[nc][nr]===symbol){seen.add(k);queue.push({c:nc,r:nr});}
    }}
    if(cells.length>=5)groups.push({symbol,cells,count:cells.length});
  }
  return groups;
}
function evaluateClusters(grid,bet,multiplier=1) {
  const wins=clusters(grid).map(group=>{
    const base=payFor(PAYTABLE['diamond-foundry'],group.symbol,group.count);
    return {...group,multiplier,amount:round(base*bet*multiplier)};
  }).filter(w=>w.amount>0);
  const unique=new Map();for(const w of wins)for(const cell of w.cells)unique.set(cellKey(cell.c,cell.r),cell);
  return {wins,award:round(wins.reduce((s,w)=>s+w.amount,0)),remove:[...unique.values()]};
}
function collapse(grid,remove,random,mode) {
  const removed=new Set(remove.map(({c,r})=>cellKey(c,r)));
  return grid.map((column,c)=>{
    const survivors=column.filter((_,r)=>!removed.has(cellKey(c,r)));
    const fresh=Array.from({length:mode.rows-survivors.length},()=>pick(WEIGHTS[mode.id],random));
    return [...fresh,...survivors];
  });
}
function wheelPick(random) {
  const value=assertRandom(random())*WHEEL.reduce((s,x)=>s+x.w,0);let cursor=value;
  for(let i=0;i<WHEEL.length;i++){cursor-=WHEEL[i].w;if(cursor<0)return {index:i,multiplier:WHEEL[i].m};}
  return {index:WHEEL.length-1,multiplier:WHEEL.at(-1).m};
}

export function evaluate(modeId,grid,bet=1,{cascadeMultiplier=1}={}) {
  const mode=MODES.find(m=>m.id===modeId);if(!mode)throw new RangeError('unknown mode');
  if(!Number.isFinite(bet)||bet<=0)throw new RangeError('invalid bet');validateGrid(mode,grid);
  if(mode.id==='royal-mint'||mode.id==='crown-wheel')return evaluateLines(mode,grid,bet);
  if(mode.id==='jade-treasury')return evaluateWays(expandJadeWilds(grid).grid,bet);
  return evaluateClusters(grid,bet,cascadeMultiplier);
}

export function spin(modeId,bet=100,random=Math.random) {
  const mode=MODES.find(m=>m.id===modeId);if(!mode)throw new RangeError('unknown mode');
  if(!Number.isFinite(bet)||bet<=0)throw new RangeError('invalid bet');
  let grid=makeGrid(mode,random),stages=[],feature={};
  if(mode.id==='royal-mint'){
    let result=evaluateLines(mode,grid,bet);stages.push({kind:'base',grid:copy(grid),...result});
    if(!result.award&&grid[0][1]===grid[1][1]&&assertRandom(random())<.35){
      const direction=assertRandom(random())<.5?-1:1;
      grid=copy(grid);const column=[...grid[2]],fresh=pick(WEIGHTS[mode.id],random);
      grid[2]=direction<0?[...column.slice(1),fresh]:[fresh,...column.slice(0,-1)];
      result=evaluateLines(mode,grid,bet);stages.push({kind:'nudge',grid:copy(grid),direction,...result});feature={nudge:true,direction};
    }
  } else if(mode.id==='jade-treasury'){
    const expanded=expandJadeWilds(grid);grid=expanded.grid;const result=evaluateWays(grid,bet);
    stages.push({kind:expanded.reels.length?'expanding-wild':'base',grid:copy(grid),expandedReels:expanded.reels,...result});feature={expandedReels:expanded.reels};
  } else if(mode.id==='diamond-foundry'){
    for(let cascade=0;cascade<8;cascade++){
      const result=evaluateClusters(grid,bet,cascade+1);stages.push({kind:cascade?'cascade':'base',cascade,multiplier:cascade+1,grid:copy(grid),...result});
      if(!result.remove.length)break;grid=collapse(grid,result.remove,random,mode);
      if(cascade===7)stages.at(-1).capped=true;
    }
    feature={cascades:Math.max(0,stages.length-1),maxMultiplier:Math.max(...stages.map(s=>s.multiplier||1))};
  } else {
    const result=evaluateLines(mode,grid,bet);stages.push({kind:'base',grid:copy(grid),...result});
    const scatterCells=[];for(let c=0;c<mode.cols;c++)for(let r=0;r<mode.rows;r++)if(grid[c][r]===6)scatterCells.push({c,r});
    if(scatterCells.length>=3){
      const wheel=wheelPick(random),amount=round(bet*wheel.multiplier);
      stages.push({kind:'wheel',grid:copy(grid),wins:[{symbol:6,count:scatterCells.length,cells:scatterCells,multiplier:wheel.multiplier,amount}],award:amount,remove:[],wheelIndex:wheel.index});
      feature={wheel:true,wheelIndex:wheel.index,multiplier:wheel.multiplier};
    }
  }
  const totalWin=round(stages.reduce((s,x)=>s+x.award,0));
  return {modeId,bet,totalWin,grid:copy(stages.at(-1).grid),stages:stages.map(s=>({...s,grid:copy(s.grid),wins:s.wins.map(w=>({...w,cells:w.cells.map(c=>({...c}))})),remove:s.remove.map(c=>({...c}))})),feature};
}

export function seeded(seed=1) {
  let state=seed>>>0;return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
}

freeze(PAYLINES);freeze(PAYTABLE);freeze(MODES);
