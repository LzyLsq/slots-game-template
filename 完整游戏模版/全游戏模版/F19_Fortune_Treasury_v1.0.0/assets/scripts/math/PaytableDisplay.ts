import {primaryVariant,pokerCategoryAllowed} from './PrimaryRuleVariants';
import {HAND_FACTORS} from './IndependentCore';
import type {GameConfig} from './types';
/** Uses the same factor lookup, divisor and rounding order as the settlement evaluators. */
export function ruleAward(c:GameConfig,symbol:string,count:number,bet:number,ways=1):number|null{
 if(c.primaryKind==='poker-reels'&&symbol.startsWith('hand-')){const hand=Number(symbol.slice(5));if(!pokerCategoryAllowed(c,hand))return null;return Math.round(bet/c.rows*HAND_FACTORS[hand]*c.payoutScale);}
 if(c.primaryKind==='collector-grid'&&symbol!==c.scatterId){const cash=c.symbols.find(s=>!['wild','scatter','bonus'].includes(s.tier))?.id;return symbol===cash&&Number.isInteger(count)&&count>=1&&count<c.columns*c.rows?Math.round(bet*count*.15*c.payoutScale):null;}
 if(c.primaryKind==='twin-boards'&&symbol!==c.scatterId)bet/=2;
 if(symbol===c.scatterId)count=Math.min(c.columns,count);
 const table=c.paytable[symbol];if(!table)return null;
 const threshold=Object.keys(table).map(Number).filter(n=>n<=count).sort((a,b)=>b-a)[0];
 const factor=threshold===undefined?0:table[threshold];if(!factor)return null;
 if(symbol===c.scatterId)return Math.round(bet*factor*c.payoutScale);
 if(c.payMode==='ways')return Math.round((bet/(c.waysDivisor??243))*factor*ways*c.payoutScale);
 if(c.payMode==='paylines')return Math.round((bet/Math.max(1,c.paylines.length))*factor*c.payoutScale);
 return Math.round(bet*factor*c.payoutScale);
}
/** Only counts reachable under the configured base rule appear in its paytable. */
export function ruleAllCounts(c:GameConfig):number[]{
 const min=c.minimumCluster??3,max=c.primaryKind==='collector-grid'?c.columns*c.rows-1:c.payMode==='clusters'?c.columns*c.rows:c.columns;
 return Array.from({length:Math.max(0,max-min+1)},(_,i)=>min+i);
}
export function ruleCounts(c:GameConfig,band=0):number[]{return ruleAllCounts(c).slice(band*4,band*4+4);}

/** Display-only, before rounding. A Ways award rounds after multiplying by its combination count. */
export function ruleReferenceAward(c:GameConfig,symbol:string,count:number,bet:number):number|null{
 if(c.payMode!=='ways'||symbol===c.scatterId)return null;
 const table=c.paytable[symbol];if(!table)return null;
 const threshold=Object.keys(table).map(Number).filter(n=>n<=count).sort((a,b)=>b-a)[0];
 const factor=threshold===undefined?0:table[threshold];
 return factor?(bet/(c.waysDivisor??243))*factor*c.payoutScale:null;
}
/** Bounded, explicitly approximate reference; tiny positive values must never become a displayed zero. */
export function formatRuleReference(value:number):string{
 if(!Number.isFinite(value)||value<=0)return '—';
 let digits=Number(value.toPrecision(4)).toString();
 if(digits.length>8)digits=value.toExponential(2);
 return '≈'+digits;
}
export function ruleAwardText(c:GameConfig,symbol:string,count:number,bet:number):string{
 if(c.payMode==='ways'&&symbol!==c.scatterId){const value=ruleReferenceAward(c,symbol,count,bet);return value===null?'—':formatRuleReference(value);}
 const value=ruleAward(c,symbol,count,bet);return value===null?'—':value.toLocaleString('en-US');
}
