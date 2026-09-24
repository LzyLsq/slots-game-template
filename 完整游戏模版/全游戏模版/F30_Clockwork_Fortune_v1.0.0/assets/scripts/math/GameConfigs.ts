import {independentCabinet} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:1,ruby:2,pearl:3,ring:4,chest:5,crown:6,wild:12,safe:13,pouch:9,chip:10,bell:8,aqua:7,key:14,ribbon:11};
const NAMES: Readonly<Record<string,string>> = {coin:'Minted coin',bars:'Gold bullion',ruby:'Ruby gear',pearl:'Amber hourglass',ring:'Clockwork ring',chest:'Treasure chest',crown:'Clockwork crown',wild:'Wild golden gear',safe:'Vault seal',pouch:'Coin purse',chip:'Mint medallion',bell:'Clock chime',aqua:'Time vial',key:'Vault key',ribbon:'Velvet ribbon'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-hour':{chip:'Engraved watch medallion',bell:'Golden chime',bars:'Gold bullion',ring:'Clockwork ring',chest:'Pendulum coffer',crown:'Pendulum crown',wild:'Wild golden gear',safe:'Sealed vault'},
 'jade-treasury':{chip:'Coin press medal',pouch:'Minted coin pouch',bars:'Gold bullion',key:'Brass press key',chest:'Pressed coin chest',crown:'Mint crown',wild:'Wild mint gear',coin:'Bonus coin seal'},
 'pearl-palace':{chip:'Clock medallion',aqua:'Time vial',bars:'Gold bullion',pearl:'Amber hourglass',ring:'Timekeeper ring',crown:'Hourglass crown',wild:'Wild golden gear',safe:'Sealed clock'},
 'ruby-revel':{chip:'Royal medallion',pouch:'Crown coin purse',bars:'Gold bullion',ruby:'Ruby gear',chest:'Clock tower chest',crown:'Ruby gear crown',wild:'Wild clock gear'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[16, 10, 8, 6, 4, 2];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+30*7919;
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
 id:'golden-hour',name:"PENDULUM VAULT",theme:"Pendulum treasury",columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"3 LINES",
 paylines:makeLines(3,3,3),
 ...make('golden-hour',["chip", "bell", "bars", "ring", "chest", "crown", "wild", "safe"],3,'safe',3),paytable:{...table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:1.06654717,featurePayoutScale:1.06654717,targetRtp:0.952
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'jade-treasury',name:"COIN PRESS",theme:"Royal coin mint",columns:5,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"15 LINES",
 paylines:makeLines(5,3,15),
 ...make('jade-treasury',["chip", "pouch", "bars", "key", "chest", "crown", "wild", "coin"],5,'coin',5),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.05054057,featurePayoutScale:0.05054057,targetRtp:0.952
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'pearl-palace',name:"HOURGLASS HOARD",theme:"Amber hourglass vault",columns:5,rows:4,payMode:'ways',coreMode:'ways',modeLabel:"1024 WAYS",
 paylines:[],
 ...make('pearl-palace',["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "safe"],5,'safe',3),paytable:{...table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:0.49106034,featurePayoutScale:0.49106034,targetRtp:0.952,waysDivisor:1024
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'ruby-revel',name:"CROWN GEARS",theme:"Clockwork crown tower",columns:5,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:"5+ CONNECTED CLUSTERS",
 paylines:[],
 ...make('ruby-revel',["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5,true),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:1.52591418,featurePayoutScale:1.52591418,targetRtp:0.952,minimumCluster:5
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
