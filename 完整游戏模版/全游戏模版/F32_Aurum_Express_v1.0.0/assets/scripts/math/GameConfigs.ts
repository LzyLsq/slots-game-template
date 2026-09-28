import {independentCabinet,PROJECT_NUMBER} from './IndependentCore';
import {makeLines} from './CabinetProfiles';
import type { GameConfig, SymbolDefinition } from './types';
export const SYMBOL_ART: Readonly<Record<string, number>> = {coin:0,bars:1,ruby:2,pearl:3,ring:4,chest:5,crown:6,wild:13,safe:14,pouch:9,chip:10,bell:8,aqua:12,key:11,ribbon:15};
const NAMES: Readonly<Record<string,string>> = {coin:'Aurum coin',bars:'Gold bullion',ruby:'Royal coin crest',pearl:'Rail medallion',ring:'Art Deco seal',chest:'Treasure chest',crown:'Golden crown',wild:'Aurum WILD',safe:'Feature SCATTER',pouch:'K card',chip:'Q card',bell:'A card',aqua:'Jade tassel',key:'Grand prize',ribbon:'J card'};
// Visual identity is separate from immutable math symbol IDs and reel weights.
export const THEME_SYMBOL_NAMES:Readonly<Record<string,Readonly<Record<string,string>>>>={
 'coin-carousel':{chip:'Q Roulette Card',bell:'A Roulette Card',bars:'Roulette Gold Wheel',ring:'Diamond Rail Ring',chest:'Jackpot Bell',crown:'Aurum Crown',wild:'Golden WILD',safe:'Roulette SCATTER'},
 'lantern-vault':{chip:'Q Sleeper Card',pouch:'K Sleeper Card',bars:'Ancient Fortune Coin',key:'Golden Vault Treasury',chest:'Dining Car Chest',crown:'Gold Train Crest',wild:'Moonlit Coin WILD',coin:'Lucky Coin BONUS'},
 'lucky-parade':{chip:'Q High Roller Card',aqua:'Emerald Rail Seal',bars:'High Roller Bar',pearl:'High Roller Diamond',ring:'Ruby Rail Ring',crown:'Gold Trophy',wild:'High Roller WILD',safe:'Casino SCATTER'},
 'celestial-mint':{chip:'Q Engine Card',pouch:'K Engine Card',bars:'Golden Turbine',ruby:'Aurum Star Coin',chest:'Engine Vault Chest',crown:'Engine Medallion',wild:'Solar WILD'}
};
export const symbolAtlas=(_id:string):string=>'f32-casino-symbols';
export const prizeArt=(id:string):string=>'prize-'+id;
const make=(theme:string,ids:string[],columns:number,special?:'safe'|'coin',specialCount=3):Pick<GameConfig,'symbols'|'reelStrips'>=>{
  const regular=ids.filter(id=>id!=='wild'&&id!==special), weights=[16, 10, 8, 6, 4, 2];
  const strip=regular.flatMap((id,i)=>Array.from({length:weights[i]??3},()=>id));
  strip.push('wild','wild',...(special?Array.from({length:specialCount},()=>special):[]),regular[0],regular[1]);
  // Deterministic author-time shuffle prevents rows of identical symbols
  // from being an accidental consequence of contiguous weight blocks.
  let seed=0x735ac91+PROJECT_NUMBER*7919;
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
export const COIN_CAROUSEL:GameConfig=independentCabinet({
 id:'coin-carousel',name:"ROULETTE RAIL",theme:"Roulette and gold collector",columns:3,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"3 LINES",
 paylines:makeLines(3,3,3),
 ...make('coin-carousel',["chip", "bell", "bars", "ring", "chest", "crown", "wild", "safe"],3,'safe',3),paytable:{...table(["chip", "bell", "bars", "ring", "chest", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:2500,payoutScale:1.06654717,featurePayoutScale:1.06654717,targetRtp:0.952
});
export const LANTERN_VAULT:GameConfig=independentCabinet({
 id:'lantern-vault',name:"GOLDEN SLEEPER",theme:"Luxury treasure sleeper",columns:5,rows:3,payMode:'paylines',coreMode:'lines',modeLabel:"15 LINES",
 paylines:makeLines(5,3,15),
 ...make('lantern-vault',["chip", "pouch", "bars", "key", "chest", "crown", "wild", "coin"],5,'coin',5),paytable:table(["chip", "pouch", "bars", "key", "chest", "crown", "wild"],3,false),
 bets,wildId:'wild',bonusId:'coin',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:5000,payoutScale:0.05054057,featurePayoutScale:0.05054057,targetRtp:0.952
});
export const LUCKY_PARADE:GameConfig=independentCabinet({
 id:'lucky-parade',name:"HIGH ROLLER",theme:"High stakes casino lounge",columns:5,rows:4,payMode:'ways',coreMode:'ways',modeLabel:"1024 WAYS",
 paylines:[],
 ...make('lucky-parade',["chip", "aqua", "bars", "pearl", "ring", "crown", "wild", "safe"],5,'safe',3),paytable:{...table(["chip", "aqua", "bars", "pearl", "ring", "crown", "wild"],3,false),safe:{3:1,4:2,5:4,6:6}},
 bets,wildId:'wild',scatterId:'safe',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:7500,payoutScale:0.49106034,featurePayoutScale:0.49106034,targetRtp:0.952,waysDivisor:1024
});
export const CELESTIAL_MINT:GameConfig=independentCabinet({
 id:'celestial-mint',name:"JACKPOT ENGINE",theme:"Jackpot engine room",columns:5,rows:5,payMode:'clusters',coreMode:'clusters',modeLabel:"5+ CONNECTED CLUSTERS",
 paylines:[],
 ...make('celestial-mint',["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5),paytable:table(["chip", "pouch", "bars", "ruby", "chest", "crown", "wild"],5,true),
 bets,wildId:'wild',
 feature:'cabinet-feature',volatility:'high',maxWinMultiplier:10000,payoutScale:1.52591418,featurePayoutScale:1.52591418,targetRtp:0.952,minimumCluster:5
});
export const GAME_CONFIGS:readonly GameConfig[]=[COIN_CAROUSEL,LANTERN_VAULT,LUCKY_PARADE,CELESTIAL_MINT];
export const GAME_CONFIG_BY_ID=Object.fromEntries(GAME_CONFIGS.map(c=>[c.id,c])) as Readonly<Record<GameConfig['id'],GameConfig>>;
