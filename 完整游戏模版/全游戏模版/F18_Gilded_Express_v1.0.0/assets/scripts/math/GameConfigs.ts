import {independentCabinet} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:1,ruby:2,pearl:3,ring:4,chest:5,crown:6,wild:12,safe:13,pouch:9,chip:10,bell:8,aqua:7,key:14,ribbon:11};
const NAMES: Readonly<Record<string,string>> = {coin:'Gold coin',bars:'Amber crystal',ruby:'Faceted ruby',pearl:'Porcelain pearl',ring:'Golden crown',chest:'Treasure chest',crown:'Golden crown',wild:'Wild sun',safe:'Bonus safe',pouch:'Coin purse',chip:'Compass medallion',bell:'Golden bell',aqua:'Crystal bottle',key:'Golden key',ribbon:'Silk ribbon'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-hour':{chip:'Cocoa pod',bell:'Conductor bear',bars:'Gold-foil chocolate',ring:'Copper cocoa mug',chest:'Treasure trunk',crown:'Railway crown'},
 'jade-treasury':{chip:'Cherry blossom',pouch:'Coin purse',bars:'Festival lantern',key:'Red panda conductor',chest:'Gold lunchbox',crown:'Railway crown'},
 'pearl-palace':{chip:'Pink coral',aqua:'Seal porter',bars:'Gold ingots',pearl:'Pearl shell',ring:'Treasure diving bell',crown:'Railway crown'},
 'ruby-revel':{chip:'Star gear',pouch:'Coin purse',bars:'Mint press',ruby:'Hedgehog mintmaster',chest:'Night-blue coin chest',crown:'Railway crown'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[14, 9, 8, 6, 5, 3];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+18*7919;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13,17][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:THEME_SYMBOL_NAMES[theme]?.[id]??NAMES[id],tier:id==='wild'?'wild':id===special?special==='safe'?'scatter':'bonus':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[60, 150, 350, 500, 750, 1500];
const table=(ids:string[],minimum=3,groups=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,groups?Object.fromEntries(Array.from({length:36-minimum+1},(_,j)=>[j+minimum,(i+1)*.08*(j+1)**1.5])):{3:5*(i+1),4:18*(i+1),5:70*(i+1),6:150*(i+1)}]));
export const GOLDEN_HOUR:GameConfig=independentCabinet({
 id:'golden-hour',name:"COCOA COMET",theme:"Champagne clockwork treasury",columns:3,rows:3,payMode:'paylines',coreMode:'both-lines',modeLabel:"3 BOTH-WAY LINES",
 paylines:makeLines(3,3,3),
 ...make('golden-hour',["chip", "bell", "bars", "ring", "chest", "crown", "wild", "safe"],3,'safe',3),paytable:{...table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:1.09747715,featurePayoutScale:1.09747715,targetRtp:0.958
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'jade-treasury',name:"CHERRY LANTERN",theme:"Jade lacquer and golden lions",columns:5,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"20 LINES",
 paylines:makeLines(5,3,20),
 ...make('jade-treasury',["chip", "pouch", "bars", "key", "chest", "crown", "wild", "coin"],5,'coin',5),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.22562367,featurePayoutScale:0.22562367,targetRtp:0.958
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'pearl-palace',name:"CORAL CARGO",theme:"Pearlescent rosewater palace",columns:5,rows:4,payMode:'ways',coreMode:'ways',modeLabel:"1024 WAYS",
 paylines:[],
 ...make('pearl-palace',["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "safe"],5,'safe',3),paytable:{...table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:1.19866304,featurePayoutScale:1.19866304,targetRtp:0.958,waysDivisor:1024
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'ruby-revel',name:"STARLIGHT MINT",theme:"Ruby velvet treasure celebration",columns:5,rows:5,payMode:'ways',coreMode:'both-ways',modeLabel:"3125 BOTH-WAY WAYS",
 paylines:[],
 ...make('ruby-revel',["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:0.36972376,featurePayoutScale:0.36972376,targetRtp:0.958,waysDivisor:3125
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
