import type {RandomSource} from '../core/SecureRNG';
import type {GameConfig,FeatureResult,FeatureRound,WinResult} from './types';
import {FEATURE_PROFILES} from './CabinetProfiles';
type Evaluate=(c:GameConfig,g:readonly string[],b:number)=>WinResult[];
type Fresh=(c:GameConfig,r:RandomSource)=>string[];
type Collapse=(c:GameConfig,g:readonly string[],p:readonly number[],r:RandomSource)=>string[];
export function signature(c:GameConfig,bet:number,original:readonly string[],base:readonly WinResult[],rng:RandomSource,evaluate:Evaluate,fresh:Fresh,collapse:Collapse,forced=false):FeatureResult|undefined{
 const spec=FEATURE_PROFILES[c.id],kind=spec.feature,wild=c.wildId,regular=c.symbols.filter(s=>s.tier!=='wild'&&s.tier!=='scatter'&&s.tier!=='bonus').map(s=>s.id);
 const size=original.length,rounds:FeatureRound[]=[],sum=(ws:readonly WinResult[])=>ws.reduce((n,w)=>n+w.credits,0),positions=(grid:readonly string[],id:string)=>grid.flatMap((s,p)=>s===id&&(!c.activeRows||p%c.rows<c.activeRows[Math.floor(p/c.rows)])?[p]:[]);
 const winning=base.filter(w=>w.kind!=='scatter'),winCells=Array.from(new Set(winning.flatMap(w=>Array.from(w.positions)))),wilds=positions(original,wild);
 let grid=[...original];
 const raw=(w:WinResult)=>(w as WinResult&{rawCredits?:number}).rawCredits??w.credits;
 const add=(next:readonly string[],extra:Partial<FeatureRound>={},custom?:readonly WinResult[])=>{const multiplier=extra.multiplier??1;const wins=(custom??evaluate(c,next,bet*multiplier)).map(w=>{const rawCredits=raw(w)*(custom?multiplier:1);return {...w,rawCredits,credits:Math.round(rawCredits),multiplier:w.multiplier*multiplier};});rounds.push({index:rounds.length+1,grid:Array.from(next),wins,credits:sum(wins),caption:spec.title,...extra});grid=Array.from(next);};
 const requireWild=()=>forced||wilds.length>0,requireWin=()=>forced||winCells.length>0;
 const requireFree=()=>forced||(c.scatterId?positions(original,c.scatterId).length>=3:false);
 const requireTwoWilds=()=>forced||wilds.length>=2;
 const initialWilds=()=>wilds.length?wilds:forced?[Math.floor(c.rows/2)]:[];
 const neighbours=(p:number)=>[p-c.rows,p+c.rows,...(p%c.rows>0?[p-1]:[]),...(p%c.rows<c.rows-1?[p+1]:[])].filter(q=>q>=0&&q<size);
 const difference=(next:readonly string[],previous:readonly string[])=>{let budget=evaluate(c,previous,bet).reduce((n,w)=>n+raw(w),0);return evaluate(c,next,bet).map(w=>{const deduction=Math.min(budget,raw(w));budget-=deduction;const rawCredits=raw(w)-deduction;return {...w,rawCredits,credits:Math.round(rawCredits)};}).filter(w=>w.rawCredits>0);};
 if(['harvest-refill','up-cascade','ways-cascade','cluster-bomb','waterfall','scatter-cascade','sticky-cascade'].includes(kind)){
  if(!requireWin())return;let wins=winning;if(forced&&!wins.length)wins=[{kind:'bonus',symbolId:regular[0],count:3,positions:[0,1,2],credits:0,multiplier:0}];
  for(let step=0;step<spec.steps&&wins.length;step++){
   let removed=Array.from(new Set(wins.flatMap(w=>Array.from(w.positions))));
   if(kind==='cluster-bomb')removed=Array.from(new Set(removed.flatMap(p=>[p,...neighbours(p)])));
   if(kind==='sticky-cascade')removed=removed.filter(p=>grid[p]!==wild);
   if(!removed.length)break;
   let next:string[];
   if(kind==='harvest-refill'){next=[...grid];const fill=fresh(c,rng);removed.forEach(p=>next[p]=fill[p]);}
   else if(kind==='up-cascade'){
    // Refill only the open portion. Closed cells never move into the playable area.
    next=[...grid];const cleared=new Set(removed);
    for(let x=0;x<c.columns;x++){
     const offset=x*c.rows,height=c.activeRows?.[x]??c.rows;
     const survivors=grid.slice(offset,offset+height).filter((_,y)=>!cleared.has(offset+y)),strip=c.reelStrips[x];
     const open=[...survivors,...Array.from({length:height-survivors.length},()=>strip[rng.int(0,strip.length)])];
     open.forEach((id,y)=>next[offset+y]=id);
    }
   }else next=collapse(c,grid,removed,rng);
   const multiplier=kind==='waterfall'?2**step:kind==='scatter-cascade'?2+step*2:step+1;
   add(next,{removed,multiplier,motion:kind==='up-cascade'?'rise':kind==='harvest-refill'?'respin':'drop',held:kind==='harvest-refill'?Array.from({length:size},(_,p)=>p).filter(p=>!removed.includes(p)):undefined});wins=evaluate(c,next,bet);
  }
 }else if(['nudge','nudge-last'].includes(kind)){
  if(!forced&&(winning.length||!wilds.length))return;
  const column=kind==='nudge-last'?c.columns-1:Math.floor(initialWilds()[0]/c.rows);
  for(let step=0;step<spec.steps;step++){
   const next=[...grid],strip=c.reelStrips[column],head=strip[rng.int(0,strip.length)],moves:{from:number;to:number}[]=[];
   for(let y=c.rows-1;y>0;y--){next[column*c.rows+y]=grid[column*c.rows+y-1];moves.push({from:column*c.rows+y-1,to:column*c.rows+y});}next[column*c.rows]=head;
   add(next,{motion:'move',moved:moves,held:Array.from({length:size},(_,p)=>p).filter(p=>Math.floor(p/c.rows)!==column)});if(rounds[rounds.length-1].credits)break;
  }
 }else if(['vertical-drift','horizontal-drift','route-delivery'].includes(kind)){
  if(!requireWin())return;
  for(let step=0;step<spec.steps;step++){
   const next=fresh(c,rng),moves:{from:number;to:number}[]=[];
   for(let x=0;x<c.columns;x++)for(let y=0;y<(c.activeRows?.[x]??c.rows);y++){
    const from=x*c.rows+y,to=kind==='vertical-drift'?x*c.rows+y-1:(x-1)*c.rows+y;
    if((kind==='vertical-drift'?y>0:x>0)&&to>=0&&to%c.rows<(c.activeRows?.[Math.floor(to/c.rows)]??c.rows)){next[to]=grid[from];moves.push({from,to});}
   }
   const closed=Array.from({length:size},(_,p)=>p).filter(p=>p%c.rows>=(c.activeRows?.[Math.floor(p/c.rows)]??c.rows));
   closed.forEach(p=>next[p]=grid[p]);
   add(next,{motion:'move',moved:moves,held:closed,multiplier:kind==='route-delivery'?step+1:1});
  }
 }else if(['travelling-wild','reverse-travelling'].includes(kind)){
  const start=kind==='reverse-travelling'?c.columns-1:0,rows=wilds.filter(p=>Math.floor(p/c.rows)===start).map(p=>p%c.rows);if(!rows.length&&!forced)return;if(!rows.length)rows.push(0);
  for(let step=1;step<c.columns;step++){
   const x=start+(kind==='reverse-travelling'?-step:step),from=x+(kind==='reverse-travelling'?1:-1),next=fresh(c,rng),moved=rows.map(y=>({from:from*c.rows+y,to:x*c.rows+y}));moved.forEach(m=>next[m.to]=wild);add(next,{motion:'move',moved,held:moved.map(m=>m.to)});
  }
 }else if(['sticky-free','sticky-five','sticky-reset','free-multiplier'].includes(kind)){
  if((kind==='sticky-reset'||kind==='free-multiplier')?!requireTwoWilds():!requireFree())return;let held=kind==='sticky-free'?[]:initialWilds(),remaining=spec.steps;
  for(let step=0;remaining>0&&step<10;step++){
   remaining--;const next=fresh(c,rng);if(kind!=='free-multiplier')held.forEach(p=>next[p]=wild);
   const found=positions(next,wild),added=found.filter(p=>!held.includes(p));
   if(kind==='sticky-reset'&&added.length)remaining=3;
   add(next,{motion:'respin',held:kind==='free-multiplier'?[]:held,remaining,multiplier:kind==='free-multiplier'?2+Math.min(3,found.length):1});
   held=Array.from(new Set([...held,...found]));
  }
 }else if(['sticky-symbol','hold-reels','key-respin','dual-spin','sync-reels'].includes(kind)){
  if(kind==='dual-spin'?!requireFree():kind==='sync-reels'?!requireWild():!requireWin())return;
  let held=kind==='hold-reels'?Array.from(new Set(winCells.map(p=>Math.floor(p/c.rows)))).flatMap(x=>Array.from({length:c.rows},(_,y)=>x*c.rows+y)):kind==='sticky-symbol'?winCells:[];
  for(let step=0;step<spec.steps;step++){
   let next=fresh(c,rng);held.forEach(p=>next[p]=grid[p]);
   if(kind==='key-respin'){held=[];const column=(step+1)%c.columns;const wildColumn=Array.from({length:c.rows},(_,y)=>column*c.rows+y);wildColumn.forEach(p=>next[p]=wild);}
   if(kind==='sync-reels'){const selected=rng.int(0,c.columns),copy=next.slice(selected*c.rows,(selected+1)*c.rows);next=Array.from({length:c.columns},()=>copy).flat();}
   add(next,{motion:'respin',held,remaining:spec.steps-step-1,multiplier:kind==='dual-spin'?step+1:1});
  }
 }else if(kind==='cash-collect'){
  if(!requireWin())return;
  const cash=regular[0];let held=initialWilds();
  for(let step=0;step<spec.steps;step++){
   const next=fresh(c,rng);held.forEach(p=>next[p]=wild);
   const collectors=positions(next,wild),cashCells=positions(next,cash);
   const awards:WinResult[]=cashCells.map(p=>{const rawCredits=bet*[.5,1,2][rng.int(0,3)]*c.payoutScale*collectors.length;return {kind:'bonus',symbolId:cash,count:1,positions:[p,...collectors],rawCredits,credits:Math.round(rawCredits),multiplier:rawCredits/bet};});
   add(next,{motion:'respin',held,focus:[...cashCells,...collectors],remaining:spec.steps-step-1},awards);
   held=collectors;
  }
 }else if(kind==='mystery-free'){
  const mystery=c.bonusId??wild;
  if(!forced&&positions(original,mystery).length<3)return;
  for(let step=0;step<spec.steps;step++){
   const next=fresh(c,rng),focus=positions(next,mystery),remaining=spec.steps-step-1;
   if(focus.length){
    add(next,{motion:'respin',remaining},[]);
    const revealed=[...next],replacement=regular[rng.int(0,regular.length)];focus.forEach(p=>revealed[p]=replacement);
    add(revealed,{motion:'transform',focus,remaining});
   }else add(next,{motion:'respin',remaining});
  }
 }else if(kind==='free-count-cascade'){
  if(!requireFree())return;
  for(let spin=0;spin<spec.steps;spin++){
   let next=fresh(c,rng),wins=evaluate(c,next,bet);const remaining=spec.steps-spin-1;
   add(next,{motion:'respin',remaining,multiplier:1});
   for(let drop=0;drop<3&&wins.length;drop++){
    const removed=Array.from(new Set(wins.flatMap(w=>Array.from(w.positions))));
    if(!removed.length)break;
    next=collapse(c,next,removed,rng);add(next,{motion:'drop',removed,multiplier:drop+2,remaining});wins=evaluate(c,next,bet);
   }
  }
 }else if(kind==='coin-vault'||kind==='symbol-collector'){
  const target=kind==='coin-vault'?(c.bonusId??wild):regular.slice().sort((a,b)=>positions(grid,b).length-positions(grid,a).length)[0],initial=positions(grid,target);
  if(initial.length<(kind==='coin-vault'?3:6)&&!forced)return;
  if(forced&&!initial.length){initial.push(0);grid[0]=target;}
  const locked:Record<number,number>={};let fractionalCarry=0;const value=()=>{const exact=bet*[.25,.5,1][rng.int(0,3)]*c.payoutScale+fractionalCarry,credits=Math.round(exact);fractionalCarry=exact-credits;return credits;};initial.forEach(p=>locked[p]=value());
  add(grid,{motion:'collect',lockedSymbol:target,locked:{...locked},remaining:3,focus:initial},[]);
  let remaining=3;
  while(remaining&&Object.keys(locked).length<size){remaining--;const held=Object.keys(locked).map(Number),next=fresh(c,rng);held.forEach(p=>next[p]=target);const added=positions(next,target).filter(p=>!(p in locked));added.forEach(p=>locked[p]=value());if(added.length)remaining=3;
   add(next,{motion:'respin',held,lockedSymbol:target,locked:{...locked},remaining,focus:added},[]);
  }
  const awards=Object.entries(locked).map(([p,credits])=>({kind:'bonus' as const,symbolId:target,count:1,positions:[Number(p)],multiplier:credits/bet,credits}));
  add(grid,{motion:'collect',lockedSymbol:target,locked:{...locked},remaining:0,focus:Object.keys(locked).map(Number)},awards);
 }else if(['wild-grow','vine-spread','win-to-wild','reel-expand','mystery-cross'].includes(kind)){
  if(kind==='win-to-wild'?!requireWin():!requireWild())return;
  let frontier=kind==='win-to-wild'?winCells:initialWilds();
  for(let step=0;step<spec.steps;step++){
   const next=[...grid];let focus:number[];
   if(kind==='reel-expand')focus=Array.from(new Set(frontier.map(p=>Math.floor(p/c.rows)))).flatMap(x=>Array.from({length:c.activeRows?.[x]??c.rows},(_,y)=>x*c.rows+y));
   else if(kind==='mystery-cross'){const center=frontier[0];focus=Array.from({length:size},(_,p)=>p).filter(p=>p%c.rows===center%c.rows||Math.floor(p/c.rows)===Math.floor(center/c.rows));}
   else if(kind==='win-to-wild')focus=frontier;
   else focus=Array.from(new Set(frontier.flatMap(p=>kind==='vine-spread'?[p,...(p%c.rows>0?[p-1]:[])]:[p,...neighbours(p)])));
   focus.forEach(p=>next[p]=wild);const wins=difference(next,grid);add(next,{motion:'transform',focus,expandedColumns:kind==='reel-expand'?Array.from(new Set(focus.map(p=>Math.floor(p/c.rows)))):undefined},wins);frontier=focus;
  }
 }else{
  // Mystery reveal and ordered symbol upgrades change the stopped board, paying only the increase.
  const mystery=kind==='all-mystery'||kind==='mystery-right';const target=mystery?(c.bonusId??wild):regular.slice().sort((a,b)=>positions(grid,b).length-positions(grid,a).length)[0];
  if(!forced&&(mystery?positions(grid,target).length<2:positions(grid,target).length<3))return;
  let current=target;
  for(let step=0;step<spec.steps;step++){
   const focus=positions(grid,current);if(!focus.length)break;
   const index=regular.indexOf(current);let replacement=mystery?regular[rng.int(0,regular.length)]:kind==='nectar-transform'?regular[regular.length-1]:regular[Math.min(regular.length-1,index+1)];
   if(current===replacement)break;const next=[...grid];focus.forEach(p=>next[p]=replacement);const wins=difference(next,grid);add(next,{motion:'transform',focus},wins);current=replacement;
  }
 }
 return rounds.length?{type:'cabinet-feature',rounds,totalCredits:rounds.reduce((n,r)=>n+r.credits,0),detail:spec.notes.join(' ')}:undefined;
}

export {FEATURE_PROFILES} from './CabinetProfiles';
export const SIGNATURE_TITLE='CABINET BONUS';export const SIGNATURE_NOTES=FEATURE_PROFILES['golden-hour'].notes;
