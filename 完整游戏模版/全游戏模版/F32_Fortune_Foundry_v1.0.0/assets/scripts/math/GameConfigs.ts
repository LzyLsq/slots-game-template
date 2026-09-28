import {independentCabinet} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:1,ruby:2,pearl:3,ring:4,chest:5,crown:6,wild:12,safe:13,pouch:9,chip:10,bell:8,aqua:7,key:14,ribbon:11};
const NAMES: Readonly<Record<string,string>> = {coin:'Freshly minted coin',bars:'Butter-gold ingots',ruby:'Coral mint crystal',pearl:'Cooling enamel token',ring:'Brass coil',chest:'Die supply crate',crown:'Master mint stamp',wild:'Foundry wheel WILD',safe:'Grand vault',pouch:'Coin satchel',chip:'Workshop medallion',bell:'Shift bell',aqua:'Jade cooling flask',key:'Gear-cut key',ribbon:'Festival ribbon'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'coin-press':{chip:'Blank coin die',bell:'Shift bell',bars:'Mint ingots',ring:'Press coil',chest:'Die supply crate',crown:'Master press stamp',wild:'Foundry wheel',safe:'Overseer vault'},
 'lantern-ledger':{chip:'Lantern token',pouch:'Festival coin satchel',bars:'Ledger ingots',key:'Night-shift key',chest:'Receipt coffer',crown:'Lantern seal',wild:'Golden abacus wheel',coin:'Relight coin'},
 'cloud-conveyor':{chip:'Sky-route token',aqua:'Jade coolant flask',bars:'Conveyor ingots',pearl:'Cloud enamel coin',ring:'Lift coil',crown:'Skyline stamp',wild:'Cloud turbine',safe:'Cargo vault'},
 'jubilee-vault':{chip:'Jubilee medallion',pouch:'Celebration satchel',bars:'Forge ingots',ruby:'Heat crystal',chest:'Parade coffer',crown:'Jubilee stamp',wild:'Festival gear'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[16, 10, 8, 6, 4, 2];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  // Pinned strip permutation: changing this seed changes observed return and requires recalibration.
  let seed=0x738173d;
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
export const COIN_PRESS:GameConfig=independentCabinet({
 id:'coin-press',name:"COINWORKS PRESS",theme:"Teal enamel coin press",columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"3 PRESS LINES",
 paylines:makeLines(3,3,3),
 ...make('coin-press',["chip", "bell", "bars", "ring", "chest", "crown", "wild", "safe"],3,'safe',3),paytable:{...table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:1.06654717,featurePayoutScale:1.06654717,targetRtp:0.952
});
export const LANTERN_LEDGER:GameConfig=independentCabinet({
 id:'lantern-ledger',name:"LANTERN LEDGER",theme:"Festival lantern counting house",columns:5,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"15 LANTERN LINES",
 paylines:makeLines(5,3,15),
 ...make('lantern-ledger',["chip", "pouch", "bars", "key", "chest", "crown", "wild", "coin"],5,'coin',5),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.05054057,featurePayoutScale:0.05054057,targetRtp:0.952
});
export const CLOUD_CONVEYOR:GameConfig=independentCabinet({
 id:'cloud-conveyor',name:"CLOUD CONVEYOR",theme:"Jade-glass sky mint conveyor",columns:5,rows:4,payMode:'ways',coreMode:'ways',modeLabel:"1024 CONVEYOR WAYS",
 paylines:[],
 ...make('cloud-conveyor',["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "safe"],5,'safe',3),paytable:{...table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:0.49106034,featurePayoutScale:0.49106034,targetRtp:0.952,waysDivisor:1024
});
export const JUBILEE_VAULT:GameConfig=independentCabinet({
 id:'jubilee-vault',name:"JUBILEE VAULT",theme:"Celebration vault and cascade forge",columns:5,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:"5+ JUBILEE CLUSTERS",
 paylines:[],
 ...make('jubilee-vault',["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5,true),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:1.52591418,featurePayoutScale:1.52591418,targetRtp:0.952,minimumCluster:5
});
export const GAME_CONFIGS:readonly GameConfig[]=[COIN_PRESS,LANTERN_LEDGER,CLOUD_CONVEYOR,JUBILEE_VAULT];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
