import {independentCabinet} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:5,ruby:3,pearl:3,ring:10,chest:11,crown:1,wild:13,safe:14,pouch:9,chip:2,bell:6,aqua:7,key:8,ribbon:15};
const NAMES: Readonly<Record<string,string>> = {coin:'Gold coin',bars:'Gold bullion',ruby:'Faceted ruby',pearl:'Pearl shell',ring:'Golden ring',chest:'Treasure chest',crown:'Golden crown',wild:'Royal crest wild',safe:'Treasure vault',pouch:'Coin purse',chip:'Gold medallion',bell:'Fortune bell',aqua:'Crystal bottle',key:'Golden key',ribbon:'Silk ribbon'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-hour':{chip:'Caishen cameo',bell:'Fortune bell',bars:'Gold bullion',ring:'Treasury ring',chest:'Bullion chest',crown:'Fortune crown'},
 'jade-treasury':{chip:'Wish elf cameo',pouch:'Wish pouch',bars:'Gold bullion',key:'Wish key',chest:'Wish treasure chest',crown:'Amber crown'},
 'pearl-palace':{chip:'Lotus fairy cameo',aqua:'Pink shell',bars:'Gold bullion',pearl:'Pearl shell',ring:'Pearl ring',crown:'Lotus tiara'},
 'ruby-revel':{chip:'Gold spirit cameo',pouch:'Gold pouch',bars:'Gold bullion',ruby:'Fire gemstone',chest:'Forge treasure chest',crown:'Forge crown'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[15, 10, 9, 5, 4, 3];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+22*7919;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13,17][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:THEME_SYMBOL_NAMES[theme]?.[id]??NAMES[id],tier:id==='wild'?'wild':id===special?special==='safe'?'scatter':'bonus':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[50, 120, 300, 500, 650, 1400];
const table=(ids:string[],minimum=3,groups=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,groups?Object.fromEntries(Array.from({length:36-minimum+1},(_,j)=>[j+minimum,(i+1)*.08*(j+1)**1.5])):{3:5*(i+1),4:18*(i+1),5:70*(i+1),6:150*(i+1)}]));
export const GOLDEN_HOUR:GameConfig=independentCabinet({
 id:'golden-hour',name:"CAISHEN HALL",theme:"Caishen celestial treasury",columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"5 LINES",
 paylines:makeLines(3,3,5),
 ...make('golden-hour',["chip", "bell", "bars", "ring", "chest", "crown", "wild", "safe"],3,'safe',3),paytable:{...table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:0.48054805,featurePayoutScale:0.48054805,targetRtp:0.954

});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'jade-treasury',name:"WISH GROVE",theme:"Wish elf garden",columns:5,rows:3,payMode:'ways',coreMode:'ways',modeLabel:"243 WAYS",
 paylines:[],
 ...make('jade-treasury',["chip", "pouch", "bars", "key", "chest", "crown", "wild", "coin"],5,'coin',5),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:1.18992427,featurePayoutScale:1.18992427,targetRtp:0.954,waysDivisor:243

});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'pearl-palace',name:"LOTUS LIGHT",theme:"Lotus lantern sanctuary",columns:5,rows:4,payMode:'clusters',coreMode:'scatterpay',modeLabel:"7+ COUNT ANYWHERE",
 paylines:[],
 ...make('pearl-palace',["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "safe"],5,'safe',3),paytable:{...table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],7,true),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:1.80288567,featurePayoutScale:1.80288567,targetRtp:0.954,minimumCluster:7

});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'ruby-revel',name:"GOLDEN FORGE",theme:"Golden spirit forge",columns:5,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:"5+ CONNECTED CLUSTERS",
 paylines:[],
 ...make('ruby-revel',["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5,true),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:0.04447023,featurePayoutScale:0.04447023,targetRtp:0.954,minimumCluster:5

});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
