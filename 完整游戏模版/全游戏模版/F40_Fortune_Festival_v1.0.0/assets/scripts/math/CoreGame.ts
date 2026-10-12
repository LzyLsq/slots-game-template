import {evaluateIndependent} from './IndependentCore';
import {PaylineEvaluator,WaysEvaluator,ClusterEvaluator} from './Evaluators';
import type {GameConfig,WinResult} from './types';
export const coreSymbols=(c:GameConfig)=>c.symbols.filter(s=>s.tier!=='scatter'&&s.tier!=='bonus').map(s=>s.id);
export const coreRank=(c:GameConfig,id:string)=>coreSymbols(c).indexOf(id)+1;
export const coreCoins=(c:GameConfig,bet:number,units:number)=>Math.round(bet*units*c.payoutScale);
const lines=new PaylineEvaluator(),ways=new WaysEvaluator(),clusters=new ClusterEvaluator();
const reverse=(c:GameConfig,g:readonly string[])=>Array.from({length:c.columns},(_,x)=>g.slice((c.columns-1-x)*c.rows,(c.columns-x)*c.rows)).flat();
const remap=(c:GameConfig,w:WinResult):WinResult=>({...w,positions:w.positions.map(p=>(c.columns-1-Math.floor(p/c.rows))*c.rows+p%c.rows)});
export function evaluateCore(c:GameConfig,g:readonly string[],bet:number):WinResult[]{
 if(c.primaryKind)return evaluateIndependent(c,g,bet);

 const mode=c.coreMode??'lines';
 if(mode==='lines')return lines.evaluate(c,g,bet);
 if(mode==='ways')return ways.evaluate(c,g,bet);
 if(mode==='clusters')return clusters.evaluate(c,g,bet);
 if(mode==='reverse-ways')return ways.evaluate(c,reverse(c,g),bet).map(w=>remap(c,w));
 if(mode==='both-lines'||mode==='both-ways'){
  const evaluator=mode==='both-lines'?lines:ways,left=evaluator.evaluate(c,g,bet),right=evaluator.evaluate(mode==='both-lines'?{...c,paylines:c.paylines.map(line=>Array.from(line).reverse())}:c,reverse(c,g),bet).map(w=>remap(c,w));
  const wins=new Map<string,WinResult>();for(const w of [...left,...right]){const key=mode==='both-lines'?String(w.lineIndex):w.symbolId,old=wins.get(key);if(!old||w.credits>old.credits)wins.set(key,w);}return Array.from(wins.values());
 }
 if(mode==='scatterpay'){
  const wins:WinResult[]=[];for(const symbol of c.symbols.filter(s=>s.tier!=='scatter'&&s.tier!=='bonus')){
   // Count-anywhere modes count Wild separately, avoiding spending one Wild for several groups.
   const positions=g.flatMap((id,p)=>id===symbol.id?[p]:[]);if(positions.length<(c.minimumCluster??6))continue;
   const table=c.paytable[symbol.id]??{},threshold=Object.keys(table).map(Number).filter(n=>n<=positions.length).sort((a,b)=>b-a)[0],multiple=table[threshold]??0;
   if(multiple)wins.push({kind:'cluster',symbolId:symbol.id,count:positions.length,positions,multiplier:multiple*c.payoutScale,credits:Math.round(bet*multiple*c.payoutScale)});
  }return wins;
 }
 // Adjacent-row ways: every next matching cell must be at most one row away.
 const wins:WinResult[]=[];
 for(const target of coreSymbols(c)){
  let counts:number[]=Array.from({length:c.rows},(_,y)=>g[y]===target||target!==c.wildId&&g[y]===c.wildId?1:0);
  let pure:number[]=Array.from({length:c.rows},(_,y)=>g[y]===c.wildId?1:0),length=counts.some(Boolean)?1:0;
  const reachable:number[][]=[counts.map(v=>v)];
  for(let x=1;x<c.columns&&length;x++){
   const next=counts.map((_,y)=>(g[x*c.rows+y]===target||target!==c.wildId&&g[x*c.rows+y]===c.wildId)?counts.slice(Math.max(0,y-1),y+2).reduce((a,b)=>a+b,0):0);
   const nextPure=pure.map((_,y)=>g[x*c.rows+y]===c.wildId?pure.slice(Math.max(0,y-1),y+2).reduce((a,b)=>a+b,0):0);
   if(!next.some(Boolean))break;counts=next;pure=nextPure;length++;reachable.push(next.map(v=>v));
  }
  const positions:number[]=[];let valid=new Set(counts.flatMap((v,y)=>v?[y]:[]));
  for(let x=length-1;x>=0;x--){for(const y of valid)positions.push(x*c.rows+y);if(x>0)valid=new Set(reachable[x-1].flatMap((v,y)=>v&&Array.from(valid).some(z=>Math.abs(y-z)<=1)?[y]:[]));}
  const count=counts.reduce((a,b)=>a+b,0)-(target===c.wildId?0:pure.reduce((a,b)=>a+b,0));
  const pay=c.paytable[target]?.[length]??0;if(length>=3&&count>0&&pay)wins.push({kind:'ways',symbolId:target,count:length,ways:count,positions,multiplier:pay*c.payoutScale,credits:Math.round(bet/(c.waysDivisor??243)*pay*count*c.payoutScale)});
 }return wins;
}

export const CORE_MODE='cabinet-rules';export const CORE_TITLE='CABINET RULES';
import {PRIMARY_DESCRIPTIONS as CORE_DESCRIPTIONS} from './IndependentCore';
export {CORE_DESCRIPTIONS};
export const CORE_NOTES=CORE_DESCRIPTIONS['golden-phoenix'];
