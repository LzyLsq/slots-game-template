import {independentCabinet} from './IndependentCore';
import {traditionalLines} from './IndependentCore';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:1,bars:7,ruby:5,pearl:1,ring:13,chest:5,crown:3,wild:6,safe:2,pouch:4,chip:0,bell:1,aqua:2,key:0,ribbon:11};
// The four commissioned sheets have different illustrated objects in each cell.
export const THEME_ART: Readonly<Record<string,Readonly<Record<string,number>>>> = Object.fromEntries(['sun-lion','emerald-elephant','lotus-koi','moon-fox'].map(id=>[id,{chip:0,bell:1,pouch:1,aqua:1,bars:2,ring:3,key:3,pearl:3,ruby:3,chest:4,crown:5,wild:6,safe:7,coin:7}]));
export const symbolArt=(theme:string,id:string):number=>THEME_ART[theme]?.[id]??SYMBOL_ART[id]??0;
const NAMES:Readonly<Record<string,string>>={chip:'Fortune coin',bell:'Sun amber',pouch:'Jungle emerald',aqua:'Lotus bloom',bars:'Gold bullion',ring:'Lion crown',key:'Elephant crown',pearl:'Koi crown',ruby:'Fox crown',chest:'Treasure chest',crown:'Fortune medallion',wild:'Wild guardian',safe:'Bonus idol',coin:'Bonus idol'};
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'sun-lion':{chip:'Sun coin',bell:'Acacia amber',ring:'Lion crown',crown:'Sun medallion',wild:'Wild lion',safe:'Scatter sun idol'},
 'emerald-elephant':{chip:'Cash coin',pouch:'Jungle emerald',key:'Elephant crown',crown:'Lotus medal',wild:'Wild elephant collector',coin:'Bonus leaf idol'},
 'lotus-koi':{chip:'Fortune coin',aqua:'Lotus bloom',pearl:'Koi crown',chest:'Treasure shell',crown:'Koi pearl medal',wild:'Wild koi',safe:'Scatter lotus idol'},
 'moon-fox':{chip:'Fortune coin',pouch:'Moon amber',ruby:'Fox crown',chest:'Lantern chest',crown:'Moon medal',wild:'Wild fox',safe:'Scatter moon idol'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[16, 10, 8, 6, 4, 2];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+36*7919;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13,17][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:THEME_SYMBOL_NAMES[theme]?.[id]??NAMES[id],tier:id==='wild'?'wild':id===special?special==='safe'?'scatter':'bonus':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[30, 80, 180, 400, 500, 900];
const table=(ids:string[],minimum=3,groups=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,groups?Object.fromEntries(Array.from({length:36-minimum+1},(_,j)=>[j+minimum,(i+1)*.08*(j+1)**1.5])):{3:5*(i+1),4:18*(i+1),5:70*(i+1),6:150*(i+1)}]));
export const GOLDEN_HOUR:GameConfig=independentCabinet({
 id:'sun-lion',name:'SUN LION',theme:'Golden sun temple',columns:5,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:'20 PAYLINES',
 paylines:traditionalLines(5).slice(0,20),...make('sun-lion',['chip','bell','bars','ring','chest','crown','wild','safe'],5,'safe',3),
 paytable:{...table(['chip','bell','bars','ring','chest','crown','wild']),safe:{3:1,4:2,5:4}},bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,targetRtp:.96,payoutScale:.4133,featurePayoutScale:.4133
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'emerald-elephant',name:'EMERALD ELEPHANT',theme:'Jungle treasury',columns:5,rows:3,payMode:'clusters',coreMode:'clusters',modeLabel:'COIN COLLECTOR',paylines:[],
 ...make('emerald-elephant',['chip','pouch','bars','key','chest','crown','wild','coin'],5,'coin',3),paytable:table(['chip','pouch','bars','key','chest','crown','wild']),
 bets,wildId:'wild',bonusId:'coin',feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,targetRtp:.96,payoutScale:1.8534,featurePayoutScale:1.8534
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'lotus-koi',name:'LOTUS KOI',theme:'Lotus lake court',columns:5,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:'5+ CONNECTED',paylines:[],
 ...make('lotus-koi',['chip','aqua','bars','pearl','chest','crown','wild','safe'],5,'safe',2),paytable:{...table(['chip','aqua','bars','pearl','chest','crown','wild'],5,true),safe:{3:1,4:2,5:4}},
 bets,wildId:'wild',scatterId:'safe',minimumCluster:5,feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,targetRtp:.96,payoutScale:1.7933,featurePayoutScale:1.7933
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'moon-fox',name:'MOON FOX',theme:'Moon lantern pavilion',columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:'CENTRE LINE',paylines:[[1,1,1]],
 ...make('moon-fox',['chip','pouch','bars','ruby','chest','crown','wild','safe'],3,'safe',3),paytable:table(['chip','pouch','bars','ruby','chest','crown','wild']),
 bets,wildId:'wild',bonusId:'safe',feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,targetRtp:.96,payoutScale:1.5916,featurePayoutScale:1.5916
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
