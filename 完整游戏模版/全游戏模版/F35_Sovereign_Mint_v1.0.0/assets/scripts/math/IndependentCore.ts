import {PaylineEvaluator,WaysEvaluator,ClusterEvaluator} from './Evaluators';
import type {GameConfig,WinResult,SpinResult} from './types';
import type {RandomSource} from '../core/SecureRNG';
export const PROJECT_NUMBER:number=35;
export const PRIMARY_FAMILY:string="line-reels";
export const CABINET_FAMILIES:readonly string[]=["line-reels", "any-reel-ways", "variable-ways", "scatter-groups"];
const ids=['golden-hour','jade-treasury','pearl-palace','ruby-revel'];
export const cabinetIndex=(c:GameConfig)=>Math.max(0,ids.indexOf(c.id));
const ordinary=(c:GameConfig)=>c.symbols.filter(s=>!['scatter','bonus'].includes(s.tier)).map(s=>s.id);
const lines=new PaylineEvaluator(),ways=new WaysEvaluator(),clusters=new ClusterEvaluator();
/** Authored horizontal, V, inverted-V, stair and zigzag lines; never enumerate arbitrary row permutations. */
export function traditionalLines(columns:number):number[][]{
 if(columns===3)return [[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]];
 const pairs=[[0,0,0,0,0],[0,1,2,1,0],[0,0,1,0,0],[1,1,0,1,1],[0,1,1,1,0],[1,0,0,0,1],[0,1,0,1,0],[1,0,1,0,1],[0,0,1,2,2],[0,1,2,2,2],[0,0,0,1,2],[1,0,1,2,1]];
 return [[1,1,1,1,1],...pairs.flatMap(line=>[line,line.map(y=>2-y)])];
}
/** Validate the four authored mint cabinet families against their evaluators.
 * The primary family selects the matching evaluator; it must never silently
 * replace the advertised rules with a previous game's configuration. */
export function independentCabinet(original:GameConfig):GameConfig{
 const family=CABINET_FAMILIES[cabinetIndex(original)];
 if((family==='line-reels'&&original.payMode!=='paylines')||((family==='any-reel-ways'||family==='variable-ways')&&original.payMode!=='ways')||(family==='scatter-groups'&&original.payMode!=='clusters'))throw new Error('F35 cabinet rule mismatch: '+original.id);
 return {...original,primaryKind:family};
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
export const PRIMARY_DESCRIPTIONS:Record<string,readonly string[]>={
 "golden-hour":["DIE FORGE: seven active lines across a 3 × 3 board. Match three identical symbols on one line from the leftmost reel. WILD substitutes for ordinary symbols, never the SCATTER.","Each line pays its best matching result once. The total bet is split over seven lines. The die rise and scatter awards are listed separately."],
 "jade-treasury":["EMERALD RESERVE: identical symbols on at least three consecutive reels from the left, in any row of the 5 × 3 board. Every matching combination is a way. WILD substitutes for ordinary symbols, never the BONUS.","All 243 ways are active. The paytable uses the total bet divided by 243. The reserve WILD transformation pays only the increase after the base award."],
 "pearl-palace":["TIDAL EXCHANGE: five reels show two to four open cells each spin. Match identical symbols on at least three consecutive reels from the left, in any open row. Closed cells cannot win.","The number of active ways changes with the open cells. The paytable uses the total bet divided by the fixed 1,024-way base. Three or more Scatters trigger five free tumble spins."],
 "ruby-revel":["CROWN TREASURY: count at least eight identical symbols anywhere on the 5 × 5 board. Symbols do not need to touch. Every qualifying symbol type pays once.","WILD is counted separately and does not complete other symbol groups. Winning cells cascade for up to four drops with 1×, 2×, 4× and 8× multipliers."]
};
