import {traditionalLines,independentCabinet} from './IndependentCore';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:1,bars:7,ruby:5,pearl:1,ring:13,chest:5,crown:3,wild:6,safe:2,pouch:4,chip:0,bell:1,aqua:2,key:0,ribbon:11};
// One original treasure-symbol sheet, curated into four mode-specific sets.
export const THEME_ART:Readonly<Record<string,Readonly<Record<string,number>>>>=Object.fromEntries(['caravan-gold','sapphire-oasis','ruby-bazaar','crown-voyage'].map(id=>[id,{chip:0,bell:1,bars:2,ring:3,chest:4,crown:5,wild:6,safe:7,pouch:8,key:9,coin:7,aqua:10,pearl:11,ruby:12,ship:14}]));
export const symbolArt=(theme:string,id:string):number=>THEME_ART[theme]?.[id]??SYMBOL_ART[id]??0;
const NAMES: Readonly<Record<string,string>> = {coin:'Gold seal',bars:'Gold bullion',ruby:'Ruby jewel',pearl:'Coin chart',ring:'Exchange compass',chest:'Treasure chest',crown:'Royal crest',wild:'Sovereign wild',safe:'Rare coin die',pouch:'Coin pouch',chip:'Minted coin',bell:'Collector coin',aqua:'Sea-glass globe',key:'Treasury key',ribbon:'Royal ribbon'};
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>=Object.fromEntries(['caravan-gold','sapphire-oasis','ruby-bazaar','crown-voyage'].map(id=>[id,{chip:'Fortune coin',bell:'Golden lantern',bars:'Gold bullion',ring:'Golden compass',chest:'Treasure casket',crown:'Royal crown',wild:'Fortune WILD',safe:'Caravan SCATTER',pouch:'Merchant purse',key:'Golden key',coin:'Oasis SCATTER',aqua:'Sapphire jewel',pearl:'Pearl seashell',ruby:'Ruby jewel',ship:'Treasure galleon'}]));
// One shared atlas avoids decoding five identical sheets on phones.
export const symbolAtlas=(_id:string):string=>'symbols';
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[16, 10, 8, 6, 4, 2];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+37*7919;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13,17][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:THEME_SYMBOL_NAMES[theme]?.[id]??NAMES[id],tier:id==='wild'?'wild':id===special?'scatter':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[30, 80, 180, 400, 500, 900];
const table=(ids:string[],minimum=3,groups=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,groups?Object.fromEntries(Array.from({length:36-minimum+1},(_,j)=>[j+minimum,(i+1)*.08*(j+1)**1.5])):{3:5*(i+1),4:18*(i+1),5:70*(i+1),6:150*(i+1)}]));
export const GOLDEN_HOUR:GameConfig=independentCabinet({
 id:'caravan-gold',name:'CARAVAN GOLD',theme:'Sunset treasure caravan',columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:'5 LINES',
 paylines:[[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]],
 ...make('caravan-gold',['chip','bell','bars','ring','chest','crown','wild','safe'],3,'safe',3),
 paytable:{...table(['chip','bell','bars','ring','chest','crown','wild']),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',feature:'cabinet-feature',volatility:'medium-high',maxWinMultiplier:2500,payoutScale:1.067,featurePayoutScale:1.067,targetRtp:0.95
});
export const JADE_TREASURY:GameConfig=independentCabinet({
 id:'sapphire-oasis',name:'SAPPHIRE OASIS',theme:'Royal sapphire sanctuary',columns:5,rows:3,payMode:'ways',coreMode:'ways',modeLabel:'243 WAYS',paylines:[],
 ...make('sapphire-oasis',['chip','pouch','bars','aqua','chest','crown','wild','coin'],5,'coin',3),
 paytable:{...table(['chip','pouch','bars','aqua','chest','crown','wild']),coin:{3:1,4:2,5:4}},bets,wildId:'wild',scatterId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.960,featurePayoutScale:0.960,targetRtp:0.95
});
export const PEARL_PALACE:GameConfig=independentCabinet({
 id:'ruby-bazaar',name:'RUBY BAZAAR',theme:'Royal ruby jewel bazaar',columns:5,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:'25 LINES',
 paylines:traditionalLines(5),...make('ruby-bazaar',['chip','ruby','bars','pearl','ring','crown','wild','safe'],5,'safe',3),
 paytable:{...table(['chip','ruby','bars','pearl','ring','crown','wild']),safe:{3:1,4:2,5:4}},bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.542,featurePayoutScale:0.542,targetRtp:0.95
});
export const RUBY_REVEL:GameConfig=independentCabinet({
 id:'crown-voyage',name:'CROWN VOYAGE',theme:'Maritime crown treasure',columns:5,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:'5+ CONNECTED',paylines:[],minimumCluster:5,
 ...make('crown-voyage',['chip','ship','bars','ruby','chest','crown','wild'],5),paytable:table(['chip','ship','bars','ruby','chest','crown','wild'],5,true),
 bets,wildId:'wild',feature:'cabinet-feature',volatility:'high',maxWinMultiplier:8000,payoutScale:1.08,featurePayoutScale:1.08,targetRtp:0.95
});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];

export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig["id"],GameConfig>>;
