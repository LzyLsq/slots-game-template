import type {GameConfig} from './types';
/** Uses the same factor lookup, divisor and rounding order as the settlement evaluators. */
export function ruleAward(c:GameConfig,symbol:string,count:number,bet:number,ways=1):number|null{
 const table=c.paytable[symbol];if(!table)return null;
 const threshold=Object.keys(table).map(Number).filter(n=>n<=count).sort((a,b)=>b-a)[0];
 const factor=threshold===undefined?0:table[threshold];if(!factor)return null;
 if(symbol===c.scatterId)return Math.round(bet*factor*c.payoutScale);
 if(c.payMode==='ways')return Math.round((bet/(c.waysDivisor??243))*factor*ways*c.payoutScale);
 if(c.payMode==='paylines')return Math.round((bet/Math.max(1,c.paylines.length))*factor*c.payoutScale);
 return Math.round(bet*factor*c.payoutScale);
}
export function ruleCounts(c:GameConfig,band=0):number[]{return c.payMode==='clusters'?(band?[10,12,15]:[5,6,8]):c.columns===3?[3]:[3,4,5];}
