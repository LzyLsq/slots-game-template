import {independentCabinet} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:1,ruby:2,pearl:3,ring:4,chest:5,crown:6,wild:7,safe:8,pouch:9,chip:10,bell:11,aqua:12,key:13,ribbon:14};
const NAMES: Readonly<Record<string,string>> = {coin:'Gold coin',bars:'Gold bars',ruby:'Amber jewel',pearl:'Pearl shell',ring:'Nautical compass',chest:'Treasure chest',crown:'Captain crown',wild:'Wild medallion',safe:'Scatter safe',pouch:'Coin cargo',chip:'Treasure token',bell:'Sky balloon',aqua:'Honey amber',key:'Treasury key'};
const make=(ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[12,10,8,7,5,4];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13,17][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:NAMES[id],tier:id==='wild'?'wild':id===special?special==='safe'?'scatter':'bonus':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[50,100,200,500,1000];
const table=(ids:string[],minimum=3,groups=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,groups?Object.fromEntries(Array.from({length:36-minimum+1},(_,j)=>[j+minimum,(i+1)*.08*(j+1)**1.5])):{3:5*(i+1),4:18*(i+1),5:70*(i+1),6:150*(i+1)}]));
export const GOLDEN_HOUR:GameConfig=independentCabinet({
 id:'golden-hour',name:"SKY ADMIRAL",theme:"Champagne clockwork treasury",columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"3 LINES",
 paylines:makeLines(3,3,3),
 ...make(["chip", "bell", "bars", "ring", "chest", "crown", "wild", "safe"],3,'safe',3),paytable:{...table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:0.73583514,featurePayoutScale:0.73583514,targetRtp:.96
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'jade-treasury',name:"PEARL VOYAGE",theme:"Jade lacquer and golden lions",columns:5,rows:4,payMode:'ways',coreMode:'ways',modeLabel:"1024 WAYS",
 paylines:[],
 ...make(["chip", "pouch", "bars", "key", "chest", "crown", "wild", "coin"],5,'coin',5),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.5317929,featurePayoutScale:0.5317929,targetRtp:.96,waysDivisor:1024
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'pearl-palace',name:"SUNSTONE EXPRESS",theme:"Pearlescent rosewater palace",columns:6,rows:3,payMode:'ways',coreMode:'reverse-ways',modeLabel:"729 RIGHT-TO-LEFT WAYS",
 paylines:[],
 ...make(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "coin"],6,'coin',5),paytable:table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:2.33525259,featurePayoutScale:2.33525259,targetRtp:.96,waysDivisor:729
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'ruby-revel',name:"MOON CAROUSEL",theme:"Ruby velvet treasure celebration",columns:5,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:"6+ CONNECTED CLUSTERS",
 paylines:[],
 ...make(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],6,true),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:8.086351,featurePayoutScale:8.086351,targetRtp:.96,minimumCluster:6
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;


export const symbolAtlas=(id:string):string=>'symbols';
