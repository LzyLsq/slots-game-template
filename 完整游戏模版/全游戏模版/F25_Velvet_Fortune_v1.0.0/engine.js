// All results are generated before animation. Presentation never invents awards.
export const SYMBOLS=[0,1,2,3,5,6];
export const WILD=9, SCATTER=15;
export const BETS=[50,100,250,500,1000,2500];
export const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,1,2,0]];
export const GAMES=[
{id:'crown',name:'CROWN CLASSIC',tag:'THE ROYAL BOX',cols:3,rows:3,lines:5,type:'classic',color:'#b45746',accent:'#ffe2a2',scale:3.95,icon:9,room:0},
{id:'mirror',name:'RUBY REFLECTION',tag:'THE MIRROR SALON',cols:5,rows:3,lines:20,type:'both',color:'#922c56',accent:'#ffb8c8',scale:1.19,icon:2,room:1},
{id:'pearl',name:'PEARL PARADE',tag:'THE PEARL GALLERY',cols:5,rows:3,lines:243,type:'ways',color:'#275878',accent:'#b6e9ff',scale:2.3,icon:5,room:2},
{id:'encore',name:'GOLDEN ENCORE',tag:'THE GRAND FINALE',cols:5,rows:3,lines:10,type:'free',color:'#73522b',accent:'#ffe4a6',scale:1.85,icon:6,room:3}
];
// Total-bet multipliers before division by active lines / 243 combinations.
export function basePay(symbol,count){const i=SYMBOLS.indexOf(symbol);if(symbol===WILD)return ({3:24,4:90,5:300})[count]||0;if(i<0)return 0;return ({3:[3,4,5,6,8,12],4:[10,14,18,24,32,50],5:[40,60,80,110,160,240]})[count]?.[i]||0}
export function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function random(){const x=new Uint32Array(1);crypto.getRandomValues(x);return x[0]/4294967296}
export function draw(game,rng=random){const bag=[[0,20],[1,18],[2,14],[3,10],[5,7],[6,5],[WILD,2],...(game.type==='free'||game.type==='both'?[[SCATTER,2]]:[])];const total=bag.reduce((s,x)=>s+x[1],0);let n=rng()*total;for(const [id,w]of bag){n-=w;if(n<0)return id}return bag.at(-1)[0]}
export function board(game,rng=random){return Array.from({length:game.cols},()=>Array.from({length:3},()=>draw(game,rng)))}
function lineAward(values){let best={pay:0,count:0,symbol:0};for(const s of [...SYMBOLS,WILD]){let count=0;for(const v of values){if(v===s||(s!==WILD&&v===WILD))count++;else break}const pay=basePay(s,count);if(pay>best.pay)best={pay,count,symbol:s}}return best}
export function evaluate(game,grid,bet,{free=false,multiplier=1}={}){
 if(!Number.isFinite(bet)||bet<=0)throw Error('Invalid bet');
 if(grid.length!==game.cols||grid.some(c=>c.length!==3||c.some(v=>![...SYMBOLS,WILD,SCATTER].includes(v))))throw Error('Invalid board');
 let raw=0;const wins=[];
 if(game.type==='ways'){
  // Enumerate unique row paths. A path gets its single best symbol payout.
  const seen=new Set();
  for(let n=0;n<243;n++){let q=n;const rows=Array.from({length:5},()=>{let r=q%3;q=Math.floor(q/3);return r});const vals=rows.map((r,c)=>grid[c][r]);const a=lineAward(vals);if(a.pay){const cells=rows.slice(0,a.count).map((r,c)=>[c,r]);const key=cells.map(([c,r])=>`${c}:${r}`).join("|");if(seen.has(key))continue;seen.add(key);const boost=cells.some(([c,r])=>grid[c][r]===WILD)?2:1;raw+=a.pay*boost/243;wins.push({...a,cells,boost,line:n})}}
 }else{
  for(let n=0;n<game.lines;n++){const rows=LINES[n].slice(0,game.cols);const vals=rows.map((r,c)=>grid[c][r]);let a=lineAward(vals),direction='left';if(game.type==='both'){const right=lineAward([...vals].reverse());if(right.pay>a.pay){a=right;direction='right'}}if(a.pay){const cells=Array.from({length:a.count},(_,i)=>{let c=direction==='left'?i:game.cols-1-i;return[c,rows[c]]});raw+=a.pay/game.lines;wins.push({...a,cells,line:n,direction})}}
 }
 const scatters=grid.filter(c=>c.includes(SCATTER)).length;
 const scatterAward=!free&&game.type==='both'?({3:2,4:5,5:20}[scatters]||0):0;
 const trigger=!free&&game.type==='free'&&scatters>=3;
 const amount=Math.min(bet*1000,Math.floor((raw*game.scale+scatterAward)*bet*multiplier+1e-8));
 return{amount,wins,scatters,trigger,multiplier,scatterAward,grid};
}
export function makeRound(game,bet,rng=random){
 const first=evaluate(game,board(game,rng),bet);const steps=[first];let multi=1;
 if(first.trigger)for(let i=0;i<8;i++){const step=evaluate(game,board(game,rng),bet,{free:true,multiplier:multi});steps.push({...step,free:true,freeIndex:i+1});if(step.amount>0)multi=Math.min(5,multi+1)}
 // Shared round cap applies to all feature steps, not once per board.
 let remaining=bet*1000;for(const step of steps){step.amount=Math.min(remaining,step.amount);remaining-=step.amount}
 return{steps,total:steps.reduce((s,x)=>s+x.amount,0),bet,game:game.id};
}
