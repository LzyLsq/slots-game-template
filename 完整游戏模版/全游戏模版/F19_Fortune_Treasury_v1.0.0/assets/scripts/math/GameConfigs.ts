import {independentCabinet} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:1,ruby:2,pearl:3,ring:4,chest:5,crown:6,wild:12,safe:13,pouch:9,chip:10,bell:8,aqua:7,key:14,ribbon:11};
const NAMES: Readonly<Record<string,string>> = {coin:'Gold coin',bars:'Gold bullion',ruby:'Faceted ruby',pearl:'Treasury pearl',ring:'Golden crown',chest:'Treasure chest',crown:'Golden crown',wild:'Wild sun',safe:'Bonus safe',pouch:'Coin purse',chip:'Gold medallion',bell:'Golden pig bank',aqua:'Crystal bottle',key:'Golden key',ribbon:'Silk ribbon'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-hour':{chip:'Mint medallion',bell:'Golden pig bank',bars:'Gold bullion',ring:'Treasury ring',chest:'Bullion chest',crown:'Gold reserve crown'},
 'jade-treasury':{chip:'Ruby medallion',pouch:'Velvet coin purse',bars:'Gold bullion',key:'Royal vault key',chest:'Ruby treasure coffer',crown:'Ruby crown'},
 'pearl-palace':{chip:'Pearl medallion',aqua:'Crystal perfume',bars:'Gold bullion',pearl:'Treasury pearl',ring:'Pearl ring',crown:'Pearl crown'},
 'ruby-revel':{chip:'Royal medallion',pouch:'Sapphire coin purse',bars:'Gold bullion',ruby:'Royal ruby',chest:'Royal treasure chest',crown:'Jubilee crown'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[13, 11, 7, 6, 5, 4];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+19*7919;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13,17][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:THEME_SYMBOL_NAMES[theme]?.[id]??NAMES[id],tier:id==='wild'?'wild':id===special?special==='safe'?'scatter':'bonus':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[100, 250, 500, 600, 1250, 2500];
const table=(ids:string[],minimum=3,groups=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,groups?Object.fromEntries(Array.from({length:36-minimum+1},(_,j)=>[j+minimum,(i+1)*.08*(j+1)**1.5])):{3:5*(i+1),4:18*(i+1),5:70*(i+1),6:150*(i+1)}]));
export const GOLDEN_HOUR:GameConfig=independentCabinet({
 id:'golden-hour',name:"GOLDEN RESERVE",theme:"Champagne clockwork treasury",columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"5 LINES",
 paylines:makeLines(3,3,5),
 ...make('golden-hour',["chip", "bell", "bars", "ring", "chest", "crown", "wild", "coin"],3,'coin',5),paytable:table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:1.48419181,featurePayoutScale:1.48419181,targetRtp:0.96
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'jade-treasury',name:"RUBY ROYALE",theme:"Jade lacquer and golden lions",columns:5,rows:3,payMode:'ways',coreMode:'ways',modeLabel:"243 WAYS",
 paylines:[],
 ...make('jade-treasury',["chip", "pouch", "bars", "key", "chest", "crown", "wild", "coin"],5,'coin',5),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.37701767,featurePayoutScale:0.37701767,targetRtp:0.96,waysDivisor:243
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'pearl-palace',name:"PEARL DIVIDEND",theme:"Pearlescent rosewater palace",columns:4,rows:4,payMode:'clusters',coreMode:'scatterpay',modeLabel:"8+ COUNT ANYWHERE",
 paylines:[],
 ...make('pearl-palace',["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "safe"],4,'safe',3),paytable:{...table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],8,true),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:0.28440871,featurePayoutScale:0.28440871,targetRtp:0.96,minimumCluster:8
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'ruby-revel',name:"CROWN JUBILEE",theme:"Ruby velvet treasure celebration",columns:5,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:"5+ CONNECTED CLUSTERS",
 paylines:[],
 ...make('ruby-revel',["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5,true),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:0.05204381,featurePayoutScale:0.05204381,targetRtp:0.96,minimumCluster:5
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
