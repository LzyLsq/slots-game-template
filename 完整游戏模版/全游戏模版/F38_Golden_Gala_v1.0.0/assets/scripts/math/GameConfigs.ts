import {traditionalLines,independentCabinet} from './IndependentCore';
import type {GameConfig,SymbolDefinition} from './types';
export const SYMBOL_ART:Readonly<Record<string,number>>={chip:0,bell:1,bars:2,ring:3,chest:4,crown:5,wild:6,safe:7,pouch:8,key:9,aqua:10,pearl:11,ruby:12,trophy:13,horse:14,coin:15};
const ids=['crown-club','emerald-fortune','ruby-royale','vault-reserve'];
export const THEME_ART=Object.fromEntries(ids.map(id=>[id,SYMBOL_ART]));
export const symbolArt=(_theme:string,id:string):number=>SYMBOL_ART[id]??0;
export const symbolAtlas=(_id:string):string=>'symbols';
export const prizeArt=(id:string):string=>'prize-'+id;
const names:Record<string,string>={chip:'Golden chip',bell:'Golden bell',bars:'Gold bullion',ring:'Ruby ring',chest:'Treasure chest',crown:'Royal crown',wild:'Lion WILD',safe:'Treasury SCATTER',pouch:'Coin purse',key:'Vault key',aqua:'Emerald jewel',pearl:'Pearl shell',ruby:'Ruby jewel',trophy:'Sapphire trophy',horse:'Lucky horseshoe',coin:'Treasure coin'};
export const THEME_SYMBOL_NAMES=Object.fromEntries(ids.map(id=>[id,names]));
const make=(list:string[],columns:number,special='safe',bonus=false):Pick<GameConfig,'symbols'|'reelStrips'>=>{
 const regular=list.filter(id=>id!=='wild'&&id!==special),weights=[15,12,9,7,5,3];
 const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));strip.push('wild','wild',...Array(3).fill(special));
 let seed=0x735ac91+38*7919;for(let i=strip.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[strip[i],strip[j]]=[strip[j],strip[i]];}
 const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
 const reelStrips=Array.from({length:columns},(_,x)=>{let step=[1,5,7,11,13][x];while(gcd(step,strip.length)!==1)step++;return strip.map((_,i)=>strip[(i*step+x*13)%strip.length]);});
 const symbols:SymbolDefinition[]=list.map((id,i)=>({id,label:names[id],tier:id==='wild'?'wild':id===special?(bonus?'bonus':'scatter'):i<3?'low':i<5?'medium':'high'}));return {symbols,reelStrips};
};
const bets=[40,100,200,400,800,1600];
const table=(list:string[]):GameConfig['paytable']=>Object.fromEntries(list.map((id,i)=>[id,{3:4*(i+1),4:15*(i+1),5:55*(i+1)}]));
const common={bets,wildId:'wild',feature:'cabinet-feature' as const,targetRtp:.95};
export const GOLDEN_HOUR:GameConfig=independentCabinet({id:'crown-club',name:'CROWN CLUB',theme:'Crown and lion gala',columns:3,rows:3,payMode:'paylines',modeLabel:'5 LINES · GOLDEN REEL',paylines:traditionalLines(3),...make(['chip','bell','bars','ring','chest','crown','wild','safe'],3),paytable:{...table(['chip','bell','bars','ring','chest','crown','wild']),safe:{3:1,4:2,5:4}},...common,scatterId:'safe',volatility:'medium-high',maxWinMultiplier:2500,payoutScale:.979,featurePayoutScale:.979});
export const JADE_TREASURY:GameConfig=independentCabinet({id:'emerald-fortune',name:'EMERALD FORTUNE',theme:'Emerald elephant treasury',columns:5,rows:4,payMode:'ways',modeLabel:'1024 WAYS · EMERALD FREE',paylines:[],...make(['chip','pouch','bars','aqua','chest','crown','wild','safe'],5),paytable:{...table(['chip','pouch','bars','aqua','chest','crown','wild']),safe:{3:1,4:2,5:4}},...common,waysDivisor:1024,scatterId:'safe',volatility:'high',maxWinMultiplier:5000,payoutScale:1.345,featurePayoutScale:1.345});
export const PEARL_PALACE:GameConfig=independentCabinet({id:'ruby-royale',name:'RUBY ROYALE',theme:'Ruby gala and lucky fox',columns:5,rows:3,payMode:'paylines',modeLabel:'20 LINES · RUBY UPGRADE',paylines:traditionalLines(5).slice(0,20),...make(['chip','pearl','bars','ruby','ring','crown','wild','safe'],5),paytable:{...table(['chip','pearl','bars','ruby','ring','crown','wild']),safe:{3:1,4:2,5:4}},...common,scatterId:'safe',volatility:'medium-high',maxWinMultiplier:4000,payoutScale:.478,featurePayoutScale:.478});
export const RUBY_REVEL:GameConfig=independentCabinet({id:'vault-reserve',name:'VAULT RESERVE',theme:'Golden bull vault casino',columns:5,rows:3,payMode:'paylines',modeLabel:'15 LINES · LOCK & COLLECT',paylines:traditionalLines(5).slice(0,15),...make(['chip','bell','bars','key','horse','crown','wild','coin'],5,'coin',true),paytable:table(['chip','bell','bars','key','horse','crown','wild']),...common,bonusId:'coin',volatility:'high',maxWinMultiplier:5000,payoutScale:.872,featurePayoutScale:.872});
export const GAME_CONFIGS:readonly GameConfig[]=[GOLDEN_HOUR,JADE_TREASURY,PEARL_PALACE,RUBY_REVEL];

export const GAME_CONFIG_BY_ID:Readonly<Record<string,GameConfig>>=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c]));
