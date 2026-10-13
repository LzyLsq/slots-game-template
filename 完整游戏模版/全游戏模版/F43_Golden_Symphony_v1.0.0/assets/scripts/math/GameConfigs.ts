import {independentCabinet} from './IndependentCore';
import {traditionalLines} from './IndependentCore';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:1,bars:7,ruby:5,pearl:1,ring:13,chest:5,crown:3,wild:6,safe:2,pouch:4,chip:0,bell:1,aqua:2,key:0,ribbon:11};
// The four commissioned sheets have different illustrated objects in each cell.
export const THEME_ART: Readonly<Record<string,Readonly<Record<string,number>>>> = Object.fromEntries(['golden-strings','sapphire-harp','ruby-brass','pearl-rhythm'].map(id=>[id,{chip:0,bell:1,pouch:1,aqua:1,bars:2,ring:3,key:3,pearl:3,ruby:3,chest:4,crown:5,wild:6,safe:7,coin:7}]));
export const symbolArt=(theme:string,id:string):number=>THEME_ART[theme]?.[id]??SYMBOL_ART[id]??0;
const NAMES:Readonly<Record<string,string>>={chip:'Concert coin',bell:'Amber jewel',pouch:'Sapphire jewel',aqua:'Ruby jewel',bars:'Golden instrument',ring:'Violin',key:'Harp',pearl:'Trumpet',ruby:'Pearl drum',chest:'Treasure case',crown:'Concert medallion',wild:'Musician WILD',safe:'SCORE SCATTER',coin:'Treasure note'};
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-strings':{chip:'Concert coin',bell:'Amber jewel',bars:'Gold bullion',ring:'Golden violin',chest:'Treasure case',crown:'Conductor medal',wild:'Cat conductor WILD',safe:'SCORE SCATTER'},
 'sapphire-harp':{chip:'Concert coin',pouch:'Sapphire jewel',bars:'Gold bullion',key:'Sapphire harp',chest:'Treasure case',crown:'Harpist medal',wild:'Owl harpist WILD',coin:'Treasure note'},
 'ruby-brass':{chip:'Concert coin',aqua:'Ruby jewel',bars:'Gold bullion',pearl:'Ruby trumpet',chest:'Treasure case',crown:'Trumpeter medal',wild:'Fox trumpeter WILD',safe:'SCORE SCATTER'},
 'pearl-rhythm':{chip:'Concert coin',pouch:'Pearl jewel',bars:'Gold bullion',ruby:'Pearl drum',chest:'Treasure case',crown:'Drummer medal',wild:'Rabbit drummer WILD',safe:'Mystery score'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[16, 10, 8, 6, 4, 2];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+43*7919;
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
 id:'golden-strings',name:'GOLDEN STRINGS',theme:'Amber string concert hall',columns:5,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:'15 PAYLINES',
 paylines:traditionalLines(5).slice(0,15),...make('golden-strings',['chip','bell','bars','ring','chest','crown','wild','safe'],5,'safe',3),
 paytable:{...table(['chip','bell','bars','ring','chest','crown','wild']),safe:{3:1,4:2,5:4}},bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,targetRtp:.96,payoutScale:.45076,featurePayoutScale:.45076
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'sapphire-harp',name:'SAPPHIRE HARP',theme:'Sapphire harp gallery',columns:5,rows:3,payMode:'ways',coreMode:'ways',waysDivisor:243,modeLabel:'243 WAYS',paylines:[],
 ...make('sapphire-harp',['chip','pouch','bars','key','chest','crown','wild','coin'],5,'coin',3),paytable:table(['chip','pouch','bars','key','chest','crown','wild']),
 bets,wildId:'wild',bonusId:'coin',feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,targetRtp:.96,payoutScale:1.10862,featurePayoutScale:1.10862
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'ruby-brass',name:'RUBY BRASS',theme:'Ruby brass amphitheatre',columns:4,rows:4,payMode:'clusters',coreMode:'clusters',modeLabel:'5+ CONNECTED',paylines:[],
 ...make('ruby-brass',['chip','aqua','bars','pearl','chest','crown','wild','safe'],4,'safe',2),paytable:{...table(['chip','aqua','bars','pearl','chest','crown','wild'],5,true),safe:{3:1,4:2,5:4}},
 bets,wildId:'wild',scatterId:'safe',minimumCluster:5,feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,targetRtp:.96,payoutScale:5.06016,featurePayoutScale:5.06016
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'pearl-rhythm',name:'PEARL RHYTHM',theme:'Pearl rhythm pavilion',columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:'5 LINES · MYSTERY',paylines:traditionalLines(3),
 ...make('pearl-rhythm',['chip','pouch','bars','ruby','chest','crown','wild','safe'],3,'safe',3),paytable:table(['chip','pouch','bars','ruby','chest','crown','wild']),
 bets,wildId:'wild',bonusId:'safe',feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,targetRtp:.96,payoutScale:1.5913,featurePayoutScale:1.5913
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
