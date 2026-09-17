import {independentCabinet} from './IndependentCore';
import {CORE_MODE,CORE_TITLE} from './CoreGame';
import { PAYLINES_20 } from './paylines';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:5,ruby:3,pearl:3,ring:10,chest:11,crown:1,wild:13,safe:14,pouch:9,chip:2,bell:6,aqua:7,key:8,ribbon:15};
const NAMES: Readonly<Record<string,string>> = {coin:'Gold coin',bars:'Gold bullion',ruby:'Faceted ruby',pearl:'Pearl shell',ring:'Golden ring',chest:'Treasure chest',crown:'Golden crown',wild:'Royal crest wild',safe:'Treasure vault',pouch:'Coin purse',chip:'Gold medallion',bell:'Sun chalice',aqua:'Crystal bottle',key:'Golden key',ribbon:'Silk ribbon'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-hour':{chip:'Lion cameo',bell:'Sun chalice',bars:'Gold bullion',ring:'Treasury ring',chest:'Bullion chest',crown:'Gold reserve crown'},
 'jade-treasury':{chip:'Fox cameo',pouch:'Ruby brooch',bars:'Gold bullion',key:'Royal vault key',chest:'Ruby treasure coffer',crown:'Ruby crown'},
 'pearl-palace':{chip:'Swan cameo',aqua:'Golden ballet shoe',bars:'Gold bullion',pearl:'Pearl shell',ring:'Pearl ring',crown:'Pearl crown'},
 'ruby-revel':{chip:'Elephant cameo',pouch:'Royal shield',bars:'Gold bullion',ruby:'Violet gemstone',chest:'Royal treasure chest',crown:'Vault crown'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[12, 12, 9, 7, 4, 3];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+21*7919;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:THEME_SYMBOL_NAMES[theme]?.[id]??NAMES[id],tier:id==='wild'?'wild':id===special?special==='safe'?'scatter':'bonus':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[80, 200, 450, 500, 1000, 2200];
const table=(ids:string[],cluster=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,cluster?{5:.12*(i+1),6:.2*(i+1),8:.45*(i+1),10:1.2*(i+1),12:3*(i+1),15:9*(i+1)}:{3:5*(i+1),4:18*(i+1),5:70*(i+1)}]));
export const GOLDEN_HOUR:GameConfig=independentCabinet({
 id:'golden-hour',name:'SUN CROWN',theme:'Sun crown treasury',columns:3,rows:3,payMode:'paylines',coreMode:'royal-centre-line',modeLabel:'CENTRE LINE · SUN EXPANSION',paylines:[[1,1,1]],
 ...make('golden-hour',['chip','bell','bars','ring','chest','crown','wild','safe'],3,'safe'),paytable:{...table(['chip','bell','bars','ring','chest','crown','wild']),safe:{3:1}},
 bets,wildId:'wild',scatterId:'safe',feature:'sun-expansion',volatility:'medium',maxWinMultiplier:2500,payoutScale:0.848872,featurePayoutScale:0.848872,targetRtp:0.956
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'jade-treasury',name:'RUBY PARADE',theme:'Ruby royal parade',columns:5,rows:3,payMode:'ways',coreMode:'royal-coin-ways',modeLabel:'243 WAYS · COIN LOCK',paylines:[],waysDivisor:243,
 ...make('jade-treasury',['chip','pouch','bars','key','chest','crown','wild','coin'],5,'coin',6),paytable:table(['chip','pouch','bars','key','chest','crown','wild']),
 bets,wildId:'wild',bonusId:'coin',feature:'coin-lock',volatility:'medium-high',maxWinMultiplier:5000,payoutScale:1.920101,featurePayoutScale:1.920101,targetRtp:0.956
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'pearl-palace',name:'PEARL WALTZ',theme:'Pearl royal ballroom',columns:5,rows:4,payMode:'clusters',coreMode:'royal-clusters',modeLabel:'CLUSTERS · PEARL CASCADE',paylines:[],minimumCluster:5,
 ...make('pearl-palace',['chip','aqua','bars','pearl','ring','crown','wild','safe'],5,'safe',2),paytable:{...table(['chip','aqua','bars','pearl','ring','crown','wild'],true),safe:{3:1,4:2,5:4}},
 bets,wildId:'wild',scatterId:'safe',feature:'pearl-drop',volatility:'high',maxWinMultiplier:7500,payoutScale:3.425622,featurePayoutScale:3.425622,targetRtp:0.956
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'ruby-revel',name:'ROYAL VAULT',theme:'Royal elephant vault',columns:5,rows:5,payMode:'paylines',coreMode:'royal-procession',modeLabel:'20 LINES · WILD PROCESSION',paylines:PAYLINES_20,
 ...make('ruby-revel',['chip','pouch','bars','ruby','chest','crown','wild'],5),paytable:table(['chip','pouch','bars','ruby','chest','crown','wild']),
 bets,wildId:'wild',feature:'royal-procession',volatility:'medium-high',maxWinMultiplier:10000,payoutScale:0.277655,featurePayoutScale:0.277655,targetRtp:0.956
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
