import { PAYLINES_20 } from './paylines';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:1,ruby:2,pearl:3,ring:4,chest:5,crown:6,wild:12,safe:13,pouch:9,chip:10,bell:8,aqua:7,key:14,ribbon:11};
const NAMES: Readonly<Record<string,string>> = {coin:'Gold coin',bars:'Amber crystal',ruby:'Faceted ruby',pearl:'Porcelain pearl',ring:'Golden crown',chest:'Treasure chest',crown:'Golden crown',wild:'Wild sun',safe:'Bonus safe',pouch:'Coin purse',chip:'Compass medallion',bell:'Golden bell',aqua:'Crystal bottle',key:'Golden key',ribbon:'Silk ribbon'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'golden-hour':{chip:'Ruby palm',bell:'Desert kitten',bars:'Gold ingots',ring:'Ruby scarab',chest:'Treasure urn',crown:'Golden crown'},
 'jade-treasury':{chip:'Pearl lotus',pouch:'Coin purse',bars:'Enamel conch',key:'Oasis turtle',chest:'Pearl treasure bowl',crown:'Golden crown'},
 'pearl-palace':{chip:'Saffron spice',aqua:'Spice elephant',bars:'Gold ingots',pearl:'Embroidered silk',ring:'Spice canister',crown:'Golden crown'},
 'ruby-revel':{chip:'Moon lantern',pouch:'Coin purse',bars:'Star map',ruby:'Moon rabbit',chest:'Celestial globe',crown:'Golden crown'}
};
export const symbolAtlas=(id:string):string=>'symbols-'+id;
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[12,10,8,7,5,4];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91;
  for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const reelStrips=Array.from({length:columns},(_,col)=>{
    let step=[1,5,7,11,13][col];while(gcd(step,strip.length)!==1)step++;
    return strip.map((_,i)=>strip[(i*step+col*9)%strip.length]);
  });
  const symbols:SymbolDefinition[]=ids.map((id,i)=>({id,label:THEME_SYMBOL_NAMES[theme]?.[id]??NAMES[id],tier:id==='wild'?'wild':id===special?special==='safe'?'scatter':'bonus':i<3?'low':i<5?'medium':'high'}));
  return {symbols,reelStrips};
};
const bets=[50,100,200,500,1000];
const table=(ids:string[],cluster=false):GameConfig['paytable']=>Object.fromEntries(ids.map((id,i)=>[id,cluster?{5:.12*(i+1),6:.2*(i+1),8:.45*(i+1),10:1.2*(i+1),12:3*(i+1),15:9*(i+1)}:{3:5*(i+1),4:18*(i+1),5:70*(i+1)}]));
export const GOLDEN_HOUR:GameConfig={
 id:'golden-hour',name:'RUBY DUNES',theme:'Champagne clockwork treasury',columns:3,rows:3,payMode:'paylines',modeLabel:'1 CENTRE LINE · TREASURE PICK',paylines:[[1,1,1]],
 ...make('golden-hour',['chip','bell','bars','ring','chest','crown','wild','safe'],3,'safe'),paytable:{...table(['chip','bell','bars','ring','chest','crown','wild']),safe:{3:1}},
 bets,wildId:'wild',scatterId:'safe',feature:'golden-hour',volatility:'medium',maxWinMultiplier:2500,payoutScale:1.495,targetRtp:.96};
export const JADE_TREASURY:GameConfig={
 id:'jade-treasury',name:'PEARL OASIS',theme:'Jade lacquer and golden lions',columns:5,rows:3,payMode:'paylines',modeLabel:'20 LINES · COIN LOCK RESPINS',paylines:PAYLINES_20,
 ...make('jade-treasury',['chip','pouch','bars','key','chest','crown','wild','coin'],5,'coin',6),paytable:table(['chip','pouch','bars','key','chest','crown','wild']),
 bets,wildId:'wild',bonusId:'coin',feature:'jade-respin',volatility:'medium-high',maxWinMultiplier:5000,payoutScale:1.008,targetRtp:.96};
export const PEARL_PALACE:GameConfig={
 id:'pearl-palace',name:'SPICE GOLD',theme:'Pearlescent rosewater palace',columns:5,rows:4,payMode:'ways',modeLabel:'1024 WAYS · EXPANDING WILDS',paylines:[],waysDivisor:1024,
 ...make('pearl-palace',['chip','aqua','bars','pearl','ring','crown','wild','safe'],5,'safe',2),paytable:{...table(['chip','aqua','bars','pearl','ring','crown']),wild:{5:490},safe:{3:1,4:2,5:4}},
 bets,wildId:'wild',scatterId:'safe',feature:'pearl-expansion',volatility:'high',maxWinMultiplier:7500,payoutScale:1.077,targetRtp:.96};
export const RUBY_REVEL:GameConfig={
 id:'ruby-revel',name:'MOON SILK',theme:'Ruby velvet treasure celebration',columns:5,rows:5,payMode:'clusters',modeLabel:'5+ CLUSTERS · RISING CASCADES',paylines:[],minimumCluster:5,
 ...make('ruby-revel',['chip','pouch','bars','ruby','chest','crown','wild'],5),paytable:table(['chip','pouch','bars','ruby','chest','crown','wild'],true),
 bets,wildId:'wild',feature:'ruby-cascade',volatility:'medium-high',maxWinMultiplier:10000,payoutScale:2.86,targetRtp:.96};
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
