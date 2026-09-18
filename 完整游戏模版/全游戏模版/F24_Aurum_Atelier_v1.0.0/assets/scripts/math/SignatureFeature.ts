import type {RandomSource} from '../core/SecureRNG';
import type {GameConfig,FeatureResult,FeatureRound,WinResult} from './types';
import {FEATURE_PROFILES} from './CabinetProfiles';
type Evaluate=(c:GameConfig,g:readonly string[],b:number)=>WinResult[];
type Fresh=(c:GameConfig,r:RandomSource)=>string[];
type Collapse=(c:GameConfig,g:readonly string[],p:readonly number[],r:RandomSource)=>string[];
/** F24 bonuses always follow the stopped board. Debug input cannot bypass a trigger. */
export function signature(c:GameConfig,bet:number,original:readonly string[],base:readonly WinResult[],rng:RandomSource,evaluate:Evaluate,fresh:Fresh,collapse:Collapse,_forced=false):FeatureResult|undefined{
 const spec=FEATURE_PROFILES[c.id],kind=spec.feature,wild=c.wildId,size=original.length,rounds:FeatureRound[]=[];
 const positions=(g:readonly string[],id:string|undefined)=>g.flatMap((s,p)=>s===id?[p]:[]);
 const add=(grid:readonly string[],extra:Partial<FeatureRound>,custom?:readonly WinResult[])=>{
  const multiplier=extra.multiplier??1;
  const wins=custom?[...custom]:evaluate(c,grid,bet*multiplier).map(w=>({...w,multiplier:w.multiplier*multiplier}));
  rounds.push({index:rounds.length+1,grid:[...grid],wins,credits:wins.reduce((n,w)=>n+w.credits,0),caption:spec.title,...extra});
 };
 if(kind==='mint-stamp'){
  const column=1,focus=Array.from({length:c.rows},(_,y)=>column*c.rows+y);
  if(!focus.some(p=>original[p]===wild))return;
  const next=[...original];focus.forEach(p=>next[p]=wild);
  const previous=new Map(evaluate(c,original,bet).map(w=>[w.lineIndex,w.rawCredits??w.credits]));
  const increases=evaluate(c,next,bet).map(w=>{const rawCredits=Math.max(0,(w.rawCredits??w.credits)-(previous.get(w.lineIndex)??0));return {...w,rawCredits,credits:Math.round(rawCredits)};}).filter(w=>(w.rawCredits??w.credits)>0);
  add(next,{motion:'expand',focus,expandedColumn:column,expandedColumns:[column],held:Array.from({length:size},(_,p)=>p).filter(p=>!focus.includes(p))},increases);
 }else if(kind==='prism-free'){
  if(!c.scatterId||positions(original,c.scatterId).length<3)return;
  for(let step=0;step<spec.steps;step++)add(fresh(c,rng),{motion:'respin',held:[],remaining:spec.steps-step-1,multiplier:2});
 }else if(kind==='link-respin'){
  const target=c.bonusId;if(!target)return;
  const initial=positions(original,target);if(initial.length<3)return;
  let grid=[...original],carry=0,remaining=3;const locked:Record<number,number>={};
  const value=()=>{const exact=bet*[.5,1,2,5][rng.int(0,4)]*c.payoutScale+carry,credits=Math.round(exact);carry=exact-credits;return credits;};
  initial.forEach(p=>locked[p]=value());
  add(grid,{motion:'collect',lockedSymbol:target,locked:{...locked},remaining,focus:initial},[]);
  for(let step=0;remaining>0&&Object.keys(locked).length<size&&step<spec.steps;step++){
   remaining--;const held=Object.keys(locked).map(Number),next=fresh(c,rng);held.forEach(p=>next[p]=target);
   const added=positions(next,target).filter(p=>!(p in locked));added.forEach(p=>locked[p]=value());if(added.length)remaining=3;
   // A fresh draw of an ordinary cash symbol or WILD has no separate bonus award.
   add(next,{motion:'respin',held,lockedSymbol:target,locked:{...locked},remaining,focus:added},[]);grid=next;
  }
  const awards=Object.entries(locked).map(([p,credits]):WinResult=>({kind:'bonus',symbolId:target,count:1,positions:[Number(p)],credits,multiplier:credits/bet}));
  add(grid,{motion:'collect',lockedSymbol:target,locked:{...locked},remaining:0,focus:Object.keys(locked).map(Number)},awards);
 }else if(kind==='forge-cascade'){
  let grid=[...original],wins=base.filter(w=>w.kind==='cluster');
  for(let step=0;step<spec.steps&&wins.length;step++){
   const removed=[...new Set(wins.flatMap(w=>[...w.positions]))];if(!removed.length)break;
   const next=collapse(c,grid,removed,rng);add(next,{motion:'drop',removed,multiplier:[2,3,5,8][step]});grid=next;wins=evaluate(c,grid,bet);
  }
 }else throw new Error('Unknown F24 cabinet feature: '+kind);
 return rounds.length?{type:'cabinet-feature',rounds,totalCredits:rounds.reduce((n,r)=>n+r.credits,0),detail:spec.notes.join(' ')}:undefined;
}
export {FEATURE_PROFILES} from './CabinetProfiles';
export const SIGNATURE_TITLE='ATELIER BONUS';export const SIGNATURE_NOTES=FEATURE_PROFILES['golden-hour'].notes;
