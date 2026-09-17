import type {RandomSource} from '../core/SecureRNG';
import type {GameConfig,FeatureResult,FeatureRound,WinResult} from './types';
export const SIGNATURE_TITLE='ROYAL CABINET FEATURES';
export const FEATURE_NOTES:Record<string,readonly string[]>={
 'golden-hour':['Any WILD starts SUN EXPANSION.','Every reel containing a WILD becomes a full WILD reel. There is no extra bet and no additional random draw.','Evaluate each board separately. Pay only the positive increase over the original line awards; Scatter awards are excluded.'],
 'jade-treasury':['Six coins start COIN LOCK with three respins.','Only empty cells respin. A new coin resets the counter to three. Coin values are 0.5x, 1x or 2x bet times the feature factor.','Stop at zero respins or a full board. All locked coins pay once; a full board adds 10x bet times the feature factor.'],
 'pearl-palace':['An edge-connected group of five or more matching symbols starts PEARL CASCADE. WILD substitutes for regular symbols; diagonal contact does not connect.','Remove winning cells; survivors fall in their own column, then refill. New boards pay at 2x, 3x, 4x, 5x, 6x and 7x.','Stop at the first board without a qualifying cluster or after six drops. No additional bet; scatters pay only on the starting board.'],
 'ruby-revel':['Three or more WILDs start five ROYAL FREE SPINS.','Count matching regular symbols anywhere on each independent free board. The five spins pay at 1x, 2x, 3x, 4x and 5x; WILDs do not substitute in count wins.','No additional bet. Free spins do not retrigger. The round win limit covers base and bonus awards.']};
export const SIGNATURE_NOTES=FEATURE_NOTES['golden-hour'];
type Evaluate=(c:GameConfig,g:readonly string[],b:number)=>WinResult[];
type Fresh=(c:GameConfig,r:RandomSource)=>string[];
type Collapse=(c:GameConfig,g:readonly string[],p:readonly number[],r:RandomSource)=>string[];
export function signature(c:GameConfig,bet:number,original:readonly string[],baseWins:readonly WinResult[],rng:RandomSource,evaluate:Evaluate,fresh:Fresh,collapse:Collapse,forced=false):FeatureResult|undefined{
 const rounds:FeatureRound[]=[],sum=(ws:readonly WinResult[])=>ws.reduce((n,w)=>n+w.credits,0);
 const raw=(w:WinResult)=>(w as WinResult&{rawCredits?:number}).rawCredits??w.credits;
 const add=(grid:readonly string[],wins:readonly WinResult[],extra:Partial<FeatureRound>)=>rounds.push({index:rounds.length+1,grid:[...grid],wins,credits:sum(wins),...extra});
 if(c.id==='golden-hour'){
  const cols=Array.from({length:c.columns},(_,x)=>x).filter(x=>original.slice(x*c.rows,(x+1)*c.rows).includes(c.wildId));
  if(!cols.length){if(!forced)return;cols.push(0);}
  const grid=[...original],focus:number[]=[];for(const x of cols)for(let y=0;y<c.rows;y++){const p=x*c.rows+y;grid[p]=c.wildId;focus.push(p);}
  const old=evaluate(c,original,bet).reduce((n,w)=>n+raw(w),0),expanded=evaluate(c,grid,bet);let deduction=old;
  const wins=expanded.map(w=>{const removed=Math.min(deduction,raw(w));deduction-=removed;const rawCredits=raw(w)-removed;return {...w,rawCredits,credits:Math.round(rawCredits)};}).filter(w=>w.rawCredits>0);
  add(grid,wins,{caption:'SUN EXPANSION',focus,expandedColumns:cols,motion:'expand'});
 }else if(c.id==='jade-treasury'){
  const coin=c.bonusId!;const locked:Record<number,number>={};let grid=[...original];
  let fractionalCarry=0;const value=()=>{const exact=bet*[.5,1,2][rng.int(0,3)]*c.payoutScale+fractionalCarry,credits=Math.round(exact);fractionalCarry=exact-credits;return credits;};
  const initial=grid.flatMap((s,i)=>s===coin?[i]:[]);if(initial.length<6&&!forced)return;
  if(forced&&initial.length<6)for(let i=0;initial.length<6&&i<grid.length;i++)if(grid[i]!==coin){grid[i]=coin;initial.push(i);}
  initial.forEach(p=>locked[p]=value());
  add(grid,[],{caption:'COIN LOCK · 3 RESPINS',locked:{...locked},remaining:3,focus:initial,motion:'collect'});
  let remaining=3;
  while(remaining>0&&Object.keys(locked).length<grid.length){
   const held=Object.keys(locked).map(Number),next=fresh(c,rng),added:number[]=[];
   for(let p=0;p<next.length;p++){if(p in locked)next[p]=coin;else if(next[p]===coin){locked[p]=value();added.push(p);}}
   remaining=added.length?3:remaining-1;grid=next;
   add(grid,[],{caption:'COIN LOCK · '+remaining+' RESPINS',locked:{...locked},remaining,held,focus:added,motion:'respin'});
  }
  const wins:WinResult[]=Object.entries(locked).map(([p,credits])=>({kind:'bonus',symbolId:coin,count:1,positions:[Number(p)],multiplier:credits/bet,credits}));
  if(Object.keys(locked).length===grid.length){const credits=Math.round(bet*10*c.payoutScale);wins.push({kind:'bonus',symbolId:coin,count:grid.length,positions:Object.keys(locked).map(Number),multiplier:credits/bet,credits});}
  add(grid,wins,{caption:Object.keys(locked).length===grid.length?'FULL VAULT · COLLECT':'COIN LOCK · COLLECT',locked:{...locked},remaining,focus:Object.keys(locked).map(Number),motion:'collect'});
 }else if(c.id==='pearl-palace'){
  let grid=[...original],wins=baseWins.filter(w=>w.kind!=='scatter');
  if(!wins.length){if(!forced)return;const freshBoard=collapse(c,grid,[0,1,2,3,4],rng);const ws=evaluate(c,freshBoard,bet);add(freshBoard,ws,{removed:[0,1,2,3,4],caption:'PEARL CASCADE · PREVIEW',multiplier:1,motion:'drop'});return finish();}
  for(let step=0;step<6&&wins.length;step++){
   const removed=Array.from(new Set(wins.flatMap(w=>Array.from(w.positions))));grid=collapse(c,grid,removed,rng);
   wins=evaluate(c,grid,bet);const multiplier=step+2,paid=evaluate(c,grid,bet*multiplier).map(w=>({...w,rawCredits:raw(w),multiplier:w.multiplier*multiplier}));
   add(grid,paid,{removed,multiplier,caption:'PEARL CASCADE',motion:'drop'});
  }
 }else{
  const triggers=original.filter(s=>s===c.wildId).length;if(triggers<3&&!forced)return;
  for(let step=0;step<5;step++){
   const grid=fresh(c,rng),multiplier=step+1,wins=evaluate(c,grid,bet*multiplier).map(w=>({...w,rawCredits:raw(w),multiplier:w.multiplier*multiplier}));
   add(grid,wins,{caption:'ROYAL FREE SPINS',multiplier,remaining:4-step,motion:'respin'});
  }
 }
 return finish();
 function finish():FeatureResult|undefined{return rounds.length?{type:c.feature,rounds,totalCredits:rounds.reduce((n,r)=>n+r.credits,0),detail:FEATURE_NOTES[c.id].join(' ')}:undefined;}
}
