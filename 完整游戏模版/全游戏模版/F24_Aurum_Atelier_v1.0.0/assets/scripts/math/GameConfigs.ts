import {independentCabinet} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:15,bars:6,ruby:2,pearl:5,ring:10,chest:14,crown:9,wild:12,safe:13,pouch:1,chip:0,bell:8,aqua:3,key:7,ribbon:11};
const NAMES: Readonly<Record<string,string>> = {coin:'Gold coin',bars:'Gold bullion',ruby:'Faceted ruby',pearl:'Pearl shell',ring:'Golden ring',chest:'Treasure chest',crown:'Golden crown',wild:'Diamond star wild',safe:'Guild seal scatter',pouch:'Emerald',chip:'Sovereign coin',bell:'Gold gear',aqua:'Sapphire',key:'Golden key',ribbon:'Gold pocket watch'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-hour':{chip:'Sovereign coin',bell:'Gold gear',crown:'Sovereign crown'},
 'jade-treasury':{chip:'Sovereign coin',pouch:'Emerald',key:'Gold key',crown:'Prism crown'},
 'pearl-palace':{chip:'Cash sovereign',aqua:'Sapphire',crown:'Guild crown',coin:'Locking coin stack'},
 'ruby-revel':{chip:'Cast sovereign',pouch:'Emerald',crown:'Masterwork crown'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[14, 11, 9, 6, 3, 2];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+24*7919;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13,17][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:THEME_SYMBOL_NAMES[theme]?.[id]??NAMES[id],tier:id==='wild'?'wild':id===special?special==='safe'?'scatter':'bonus':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[50,100,250,500,1000,2500];
const table=(ids:string[],minimum=3,groups=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,groups?Object.fromEntries(Array.from({length:36-minimum+1},(_,j)=>[j+minimum,(i+1)*.08*(j+1)**1.5])):{3:5*(i+1),4:18*(i+1),5:70*(i+1),6:150*(i+1)}]));
export const GOLDEN_HOUR:GameConfig=independentCabinet({
 id:'golden-hour',name:"SOVEREIGN MINT",theme:"Precision sovereign mint",columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"5 PAYLINES",
 paylines:makeLines(3,3,5),
 ...make('golden-hour',["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3),paytable:table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:1,featurePayoutScale:1,targetRtp:0.957

});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'jade-treasury',name:"PRISM CUT",theme:"Diamond cutting atelier",columns:5,rows:4,payMode:'ways',coreMode:'ways',modeLabel:"1024 WAYS",
 paylines:[],
 ...make('jade-treasury',["chip", "pouch", "bars", "key", "chest", "crown", "wild", "safe"],5,'safe',3),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:1,featurePayoutScale:1,targetRtp:0.957,waysDivisor:1024

});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'pearl-palace',name:"GILDED LINKS",theme:"Gold-chain workshop",columns:5,rows:3,payMode:'clusters',coreMode:'collector',modeLabel:"CASH COLLECT",
 paylines:[],
 ...make('pearl-palace',["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "coin"],5,'coin',4),paytable:table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:1,featurePayoutScale:1,targetRtp:0.957

});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'ruby-revel',name:"MASTERWORK VAULT",theme:"Master goldsmith foundry",columns:6,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:"6+ CONNECTED CLUSTERS",
 paylines:[],
 ...make('ruby-revel',["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],6,true),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:1,featurePayoutScale:1,targetRtp:0.957,minimumCluster:6

});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
