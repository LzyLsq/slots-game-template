import {PaylineEvaluator,WaysEvaluator,ClusterEvaluator} from './Evaluators';
import type {GameConfig,WinResult,SpinResult} from './types';
import type {RandomSource} from '../core/SecureRNG';
export const PROJECT_NUMBER:number=32;
export const PRIMARY_FAMILY:string="any-reel-ways";
export const CABINET_FAMILIES:readonly string[]=["any-reel-ways", "cluster-avalanche", "scatter-groups", "line-reels"];
const ids=['coin-carousel','lantern-vault','lucky-parade','celestial-mint'];
export const cabinetIndex=(c:GameConfig)=>Math.max(0,ids.indexOf(c.id));
const ordinary=(c:GameConfig)=>c.symbols.filter(s=>!['scatter','bonus'].includes(s.tier)).map(s=>s.id);
const lines=new PaylineEvaluator(),ways=new WaysEvaluator(),clusters=new ClusterEvaluator();
/** Authored horizontal, V, inverted-V, stair and zigzag lines; never enumerate arbitrary row permutations. */
export function traditionalLines(columns:number):number[][]{
 if(columns===3)return [[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]];
 const pairs=[[0,0,0,0,0],[0,1,2,1,0],[0,0,1,0,0],[1,1,0,1,1],[0,1,1,1,0],[1,0,0,0,1],[0,1,0,1,0],[1,0,1,0,1],[0,0,1,2,2],[0,1,2,2,2],[0,0,0,1,2],[1,0,1,2,1]];
 return [[1,1,1,1,1],...pairs.flatMap(line=>[line,line.map(y=>2-y)])];
}
export function independentCabinet(original:GameConfig):GameConfig{
 const i=cabinetIndex(original),family=CABINET_FAMILIES[i];
 let columns=5,rows=3,payMode:GameConfig['payMode']='ways',minimumCluster:number|undefined,divisor:number|undefined,paylines:number[][]=[];
 if(family==='line-reels'){columns=i===0?3:5;payMode='paylines';paylines=traditionalLines(columns);}
 if(family==='variable-ways'){columns=6;rows=5;divisor=rows**columns;}
 if(family==='cluster-avalanche'){columns=6;rows=5;payMode='clusters';minimumCluster=5;}
 if(family==='collector-grid'){payMode='clusters';minimumCluster=1;}
 if(family==='any-reel-ways')divisor=rows**columns;
 if(family==='twin-boards'){columns=3;rows=6;payMode='paylines';paylines=traditionalLines(columns);}
 if(family==='scatter-groups'){columns=6;rows=5;payMode='clusters';minimumCluster=8;}
 const reelStrips=Array.from({length:columns},(_,x)=>{const strip=original.reelStrips[x%original.reelStrips.length];return strip.map((_,y)=>strip[(y+Math.floor(x/original.reelStrips.length)*7)%strip.length]);});
 const paytable:Record<string,Record<number,number>>={};
 ordinary(original).forEach((id,k)=>{const table:Record<number,number>={};for(let n=minimumCluster??3;n<=columns*rows;n++)table[n]=minimumCluster?(k+1)*.08*(n-minimumCluster+1)**1.5:(k+1)*[0,0,0,5,18,70,150][Math.min(n,6)];paytable[id]=table;});
 if(original.scatterId)paytable[original.scatterId]={3:1,4:2,5:4,6:6,7:8};
 const modeLabel=({'line-reels':paylines.length+' PAYLINES','variable-ways':'VARIABLE HEIGHT WAYS','cluster-avalanche':minimumCluster+'+ CONNECTED CLUSTERS','collector-grid':'CASH COLLECT','any-reel-ways':'243 WAYS','twin-boards':'TWIN REELS','scatter-groups':minimumCluster+'+ ANYWHERE PAYS'} as Record<string,string>)[family];
 return {...original,columns,rows,payMode,paylines,reelStrips,paytable,coreMode:'independent-'+family,primaryKind:family,modeLabel,minimumCluster,waysDivisor:divisor,payoutScale:[0.802, 0.116, 0.246, 0.238][i],featurePayoutScale:[0.802, 0.116, 0.246, 0.238][i]};
}
export interface PrimaryLayout {readonly family:string;readonly activeRows?:readonly number[];readonly panels?:number;}
export function preparePrimary(c:GameConfig,rng:RandomSource):{config:GameConfig;layout:PrimaryLayout}{
 if(c.primaryKind==='variable-ways'){const activeRows=Array.from({length:c.columns},()=>rng.int(2,c.rows+1));return {config:{...c,activeRows},layout:{family:c.primaryKind,activeRows}};}
 return {config:c,layout:{family:c.primaryKind??PRIMARY_FAMILY,...(c.primaryKind==='twin-boards'?{panels:2}:{})}};
}
export function visibleGrid(c:GameConfig,g:readonly string[]):string[]{return g.map((id,p)=>c.activeRows&&p%c.rows>=c.activeRows[Math.floor(p/c.rows)]?'__closed__':id);}
const pay=(c:GameConfig,id:string,n:number)=>{const table=c.paytable[id]??{},key=Object.keys(table).map(Number).filter(x=>x<=n).sort((a,b)=>b-a)[0];return table[key]??0;};
export function evaluateIndependent(c:GameConfig,source:readonly string[],bet:number):WinResult[]{
 const g=visibleGrid(c,source),family=c.primaryKind??PRIMARY_FAMILY;
 if(family==='line-reels')return lines.evaluate(c,g,bet);
 if(family==='variable-ways'||family==='any-reel-ways')return ways.evaluate(c,g,bet);
 if(family==='cluster-avalanche')return clusters.evaluate(c,g,bet);
 if(family==='twin-boards'){
  const wins:WinResult[]=[];
  for(let panel=0;panel<2;panel++){const local=g.flatMap((_,p)=>p%c.rows>=panel*3&&p%c.rows<panel*3+3?[g[p]]:[]);for(const w of lines.evaluate({...c,rows:3},local,bet/2))wins.push({...w,lineIndex:panel*c.paylines.length+(w.lineIndex??0),positions:w.positions.map(p=>Math.floor(p/3)*6+p%3+panel*3)});}return wins;
 }
 if(family==='scatter-groups'){
  const wins:WinResult[]=[];for(const id of ordinary(c)){const positions=g.flatMap((s,p)=>s===id?[p]:[]),factor=positions.length>=(c.minimumCluster??8)?pay(c,id,positions.length):0;if(factor)wins.push({kind:'cluster',symbolId:id,count:positions.length,positions,multiplier:factor*c.payoutScale,credits:Math.round(bet*factor*c.payoutScale)});}return wins;
 }
 if(family==='collector-grid'){
  const coin=c.symbols.find(s=>!['wild','scatter','bonus'].includes(s.tier))!.id,collectors=g.flatMap((s,p)=>s===c.wildId?[p]:[]),positions=g.flatMap((s,p)=>s===coin?[p]:[]);if(!collectors.length||!positions.length)return [];
  const factor=positions.length*.15;return [{kind:'cluster',symbolId:coin,count:positions.length,positions:[...positions,...collectors],multiplier:factor*c.payoutScale,credits:Math.round(bet*factor*c.payoutScale)}];
 }
 throw new Error('Unsupported traditional slot family: '+family);
}
/** Legacy display exports remain for old saved UI, never selected as an active slot mode. */
export const HAND_NAMES=['PAIR','TWO PAIRS','THREE OF A KIND','FULL HOUSE','FOUR OF A KIND','FIVE OF A KIND'] as const;
export const HAND_FACTORS=[.1,.3,.5,1.5,4,12] as const;
export function pokerHand(row:readonly string[],wild:string):number{
 const normal=row.filter(s=>s!==wild&&!s.startsWith('__blocked_')),counts=Array.from(new Set(normal)).map(s=>normal.filter(v=>v===s).length).sort((a,b)=>b-a);const wilds=row.filter(s=>s===wild).length,a=(counts[0]??0)+wilds,b=counts[1]??0;return a>=5?5:a===4?4:a===3&&b>=2?3:a===3?2:a===2&&b>=2?1:a===2?0:-1;
}
export function primaryStatus(c:GameConfig,result?:Pick<SpinResult,'layout'>):string{
 if(c.primaryKind==='variable-ways'){const rows=result?.layout?.activeRows;return rows?rows.join(' × ')+' · '+rows.reduce((a,b)=>a*b,1)+' WAYS':'VARIABLE REEL HEIGHTS';}
 if(c.primaryKind==='twin-boards')return 'TWO BOARDS · ONE TOTAL BET';
 return c.modeLabel;
}
export const PRIMARY_DESCRIPTIONS:Record<string,readonly string[]>={"coin-carousel": ["Match identical symbols on 3 or more consecutive reels from the leftmost reel. Symbols may be in any row; every matching combination is a way. A missing reel ends the run. WILD substitutes for ordinary symbols.", "This 5 × 3 board has 243 possible ways. Award = total bet ÷ 243 × symbol-table value × winning ways × payout factor. Only the longest run per symbol pays; all-WILD combinations are counted only as WILD, never again for each ordinary symbol."], "lantern-vault": ["A group of at least 5 identical symbols joined horizontally or vertically wins. Diagonal contact does not connect a group. Separate groups are evaluated independently, never combined to reach the minimum.", "Each winning group pays total bet × its symbol-table value × payout factor. WILD joins ordinary-symbol groups; a group made entirely of WILD is paid only as WILD. SCATTER and BONUS do not form ordinary groups. Follow-up effects use the feature rules below."], "lucky-parade": ["At least 8 identical ordinary symbols anywhere on the whole board win. Symbols do not need to touch or share a row. All positions belong to one board-wide count for each symbol type.", "Each qualifying type pays once: total bet × the symbol-table value for its total count × payout factor. WILD counts as its own symbol type and does not complete another symbol’s count. SCATTER and BONUS have separate rules."], "celestial-mint": ["Match at least 3 identical symbols on a shown payline, starting on the leftmost reel without a gap. Each line pays only its highest valid result. WILD substitutes for ordinary symbols, never SCATTER or BONUS.", "All 25 lines are active. Award = total bet ÷ 25 × symbol-table value × payout factor. Different winning lines are added; shorter prefixes of one winning line are not paid again."]};
