import {evaluateIndependent} from './IndependentCore';
import type {GameConfig,WinResult} from './types';
import {PaylineEvaluator,WaysEvaluator,ClusterEvaluator} from './Evaluators';
export const CORE_MODE='royal-four-modes';
export const CORE_TITLE='ROYAL FOUR MODES';
export const CORE_NOTES=['Each cabinet has its own payout rules.','Open the selected cabinet rules for details.','Coin awards use the displayed bet.'] as const;
export const coreSymbols=(c:GameConfig)=>c.symbols.filter(s=>s.tier!=='scatter'&&s.tier!=='bonus').map(s=>s.id);
export const coreRank=(c:GameConfig,id:string)=>coreSymbols(c).indexOf(id)+1;
export const coreCoins=(c:GameConfig,b:number,u:number)=>Math.round(b*u*c.payoutScale);
import {PRIMARY_DESCRIPTIONS as CORE_DESCRIPTIONS} from './IndependentCore';
export {CORE_DESCRIPTIONS};
const lines=new PaylineEvaluator(),ways=new WaysEvaluator(),clusters=new ClusterEvaluator();
export function evaluateCore(c:GameConfig,g:readonly string[],bet:number):WinResult[]{
 if(c.primaryKind)return evaluateIndependent(c,g,bet);
return (c.payMode==='clusters'?clusters:c.payMode==='ways'?ways:lines).evaluate(c,g,bet);}
