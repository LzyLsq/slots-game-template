import {GAME_BY_ID,PAYTABLE,awardTier} from './config.mjs';
export function secureInt(n) {
 if(!Number.isSafeInteger(n)||n<1||n>0x100000000) throw new RangeError('Invalid random range');
 const a=new Uint32Array(1),limit=Math.floor(0x100000000/n)*n;
 do {crypto.getRandomValues(a);} while(a[0]>=limit);
 return a[0]%n;
}
export function seededInt(seed=1){let s=seed>>>0;return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/0x100000000*n);};}
const ids=['coin','ingot','emerald','ruby','pearl','chest','lotus','wild','lantern','crown','bell','fan'];
export function pick(weights,rng){let n=rng(weights.reduce((a,b)=>a+b,0));for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return ids[i];}throw new Error('Invalid RNG');}
export function makeBoard(game,rng=secureInt){return Array.from({length:game.cols},()=>Array.from({length:game.rows},()=>pick(game.weights,rng)));}
export function countSymbol(board,s){return board.flat().filter(x=>x===s).length;}
export function lineValue(sequence){
 let best={score:0,symbol:null,length:0};
 for(const symbol of Object.keys(PAYTABLE)){
  if(symbol==='wild')continue;
  let length=0;for(const s of sequence){if(s===symbol||s==='wild')length++;else break;}
  const score=PAYTABLE[symbol][length]||0;
  if(score>best.score)best={score,symbol,length};
 }
 return best;
}
export function evaluate(game,board,bet,multiplier=1){
 if(board.length!==game.cols||board.some(c=>c.length!==game.rows))throw new Error('Board geometry mismatch');
 if(!Number.isSafeInteger(bet)||bet<=0)throw new Error('Invalid stake');
 const awards=[];
 if(game.kind==='ways'){
  // Each full path selects its best prefix. Matching prefixes are paid once,
  // not once for each arbitrary trailing row. This also assigns all-WILD paths once.
  const prefixes=new Map();
  function visit(rows,col){
   if(col===game.cols){
    const v=lineValue(rows.map((r,c)=>board[c][r]));
    if(v.score){const key=rows.slice(0,v.length).join(',');const existing=prefixes.get(key);if(!existing||existing.score<v.score)prefixes.set(key,{...v,cells:rows.slice(0,v.length).map((r,c)=>[c,r]),key});}
    return;
   }
   for(let row=0;row<game.rows;row++)visit([...rows,row],col+1);
  }
  visit([],0);awards.push(...prefixes.values());
 }else{
  game.lines.forEach((rows,line)=>{
   const seq=rows.map((r,c)=>board[c][r]);let v=lineValue(seq),direction='left';
   if(game.kind==='dual'){const rev=lineValue([...seq].reverse());if(rev.score>v.score){v=rev;direction='right';}}
   if(v.score)awards.push({...v,line,direction,cells:Array.from({length:v.length},(_,i)=>{const c=direction==='left'?i:game.cols-1-i;return [c,rows[c]];})});
  });
 }
 const divisor=game.kind==='ways'?game.divisor:game.lines.length;
 const score=awards.reduce((s,a)=>s+a.score,0);
 return {win:Math.floor(score*bet/divisor*game.scale*multiplier),awards,multiplier};
}
export function generateRound(gameId,bet,rng=secureInt){
 const g=GAME_BY_ID[gameId];if(!g)throw new Error('Unknown house');
 const base=makeBoard(g,rng),ev=evaluate(g,base,bet),frames=[{board:base,...ev,type:'base',index:0}];
 const scatters=countSymbol(base,'lotus');let feature=null,streak=0;
 if(scatters>=3){
  feature=g.kind==='lines'?'garden':g.kind==='ways'?'pearl':g.kind==='vault'?'vault':'mirror';
  const total=g.kind==='lines'?5:4,held=new Set();
  for(let i=0;i<total;i++){
   const board=makeBoard(g,rng);let multiplier=1;
   if(feature==='garden')multiplier=1+Math.min(streak,3);
   if(feature==='pearl')multiplier=Math.min(5,1+Math.floor(countSymbol(board,'pearl')/2));
   if(feature==='mirror')board[2]=[...board[1]];
   if(feature==='vault'){for(const key of held){const[c,r]=key.split('-').map(Number);board[c][r]='coin';}for(let c=0;c<g.cols;c++)for(let r=0;r<g.rows;r++)if(board[c][r]==='coin')held.add(c+'-'+r);}
   const e=evaluate(g,board,bet,multiplier);
   streak=e.win>0?streak+1:0;
   frames.push({board,...e,type:'free',index:i+1,total,feature,held:feature==='vault'?[...held]:[]});
  }
 }
 const natural=frames.reduce((s,f)=>s+f.win,0);
 return {gameId,bet,frames,natural,feature,scatters,tier:awardTier(natural,bet)};
}
