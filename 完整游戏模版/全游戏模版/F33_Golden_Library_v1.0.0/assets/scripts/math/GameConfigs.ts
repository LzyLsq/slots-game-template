import {independentCabinet} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:1,bars:7,ruby:5,pearl:1,ring:13,chest:5,crown:3,wild:6,safe:2,pouch:4,chip:0,bell:1,aqua:2,key:0,ribbon:11};
// The four commissioned sheets have different illustrated objects in each cell.
export const THEME_ART: Readonly<Record<string,Readonly<Record<string,number>>>> = {
 'golden-hour': {chip:0,bell:1,bars:7,ring:13,chest:5,crown:3,wild:6,safe:2},
 'jade-treasury': {chip:2,pouch:8,bars:7,key:0,chest:5,crown:10,wild:11,coin:4},
 'pearl-palace': {chip:0,aqua:2,bars:7,pearl:1,ring:11,crown:9,wild:10,safe:6},
 'ruby-revel': {chip:0,pouch:4,bars:7,ruby:5,chest:6,crown:8,wild:11},
};
export const symbolArt=(theme:string,id:string):number=>THEME_ART[theme]?.[id]??SYMBOL_ART[id]??0;
const NAMES: Readonly<Record<string,string>> = {coin:'Gold seal',bars:'Gold bullion',ruby:'Ruby jewel',pearl:'Map scroll',ring:'Astrolabe',chest:'Treasure chest',crown:'Royal crest',wild:'Illuminated wild',safe:'Rare manuscript',pouch:'Coin pouch',chip:'Golden volume',bell:'Collector coin',aqua:'Azure globe',key:'Cipher key',ribbon:'Royal ribbon'};
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-hour':{chip:'Golden volume',bell:'Library coin',bars:'Gold bullion',ring:'Scholar ring',chest:'Index coffer',crown:'Royal wax seal',wild:'Illuminated wild',safe:'Rare manuscript'},
 'jade-treasury':{chip:'Cipher seal',pouch:'Sapphire purse',bars:'Gold bullion',key:'Cipher key',chest:'Sapphire coffer',crown:'Blue codex',wild:'Wild compass',coin:'Collector coin'},
 'pearl-palace':{chip:'Explorer compass',aqua:'Azure globe',bars:'Gold bullion',pearl:'Map scroll',ring:'Astrolabe',crown:'Atlas jewel',wild:'Wild astrolabe',safe:'Sealed atlas'},
 'ruby-revel':{chip:'Royal coin',pouch:'Velvet purse',bars:'Gold bullion',ruby:'Ruby jewel',chest:'Folio coffer',crown:'Crowned lion',wild:'Wild manuscript'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[16, 10, 8, 6, 4, 2];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+33*7919;
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
 id:'golden-hour',name:"GILDED INDEX",theme:"Golden library index",columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"5 LINES",
 paylines:makeLines(3,3,5),
 ...make('golden-hour',["chip", "bell", "bars", "ring", "chest", "crown", "wild", "safe"],3,'safe',3),paytable:{...table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:1.075,featurePayoutScale:1.075,targetRtp:0.952
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'jade-treasury',name:"SAPPHIRE CIPHER",theme:"Sapphire cipher chamber",columns:5,rows:3,payMode:'ways',coreMode:'ways',modeLabel:"243 WAYS",
 paylines:[],
 ...make('jade-treasury',["chip", "pouch", "bars", "key", "chest", "crown", "wild", "coin"],5,'coin',5),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.039,featurePayoutScale:0.039,targetRtp:0.952
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'pearl-palace',name:"FORTUNE ATLAS",theme:"Cartographer’s golden atlas",columns:5,rows:4,payMode:'ways',coreMode:'ways',modeLabel:"CHANGING WAYS",
 paylines:[],
 ...make('pearl-palace',["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "safe"],5,'safe',3),paytable:{...table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:2.65,featurePayoutScale:2.65,targetRtp:0.952,waysDivisor:1024
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'ruby-revel',name:"ROYAL FOLIO",theme:"Royal illuminated folio",columns:5,rows:5,payMode:'clusters',coreMode:'scatterpay',modeLabel:"8+ BOOK COUNT",
 paylines:[],
 ...make('ruby-revel',["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],8,true),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:0.856,featurePayoutScale:0.856,targetRtp:0.952,minimumCluster:8
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
