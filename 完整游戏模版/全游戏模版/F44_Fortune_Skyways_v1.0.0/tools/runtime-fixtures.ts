/** Natural seeded rounds for isolated presentation QA; never wired into the client RNG. */
import {writeFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
import type {SpinResult} from '../assets/scripts/math/types';
const generator=new ResultGenerator(),fixtures:Record<string,{seed:number;sample:number;searched:number;feature:SpinResult;ordinary?:SpinResult}>={};
for(const config of GAME_CONFIGS){
 const seed=0xf441009,rng=new SeededRNG(seed),bet=config.bets[1];
 let feature:SpinResult|undefined,ordinary:SpinResult|undefined,sample=0,featureSample=0;
 for(;sample<100000;sample++){
  const round=generator.generate(config,bet,rng);
  if(!ordinary&&round.totalWin>0&&round.totalWin<=bet&&!round.featureResult)ordinary=round;
  if(!feature&&round.featureResult&&round.featureResult.rounds.length>0){
   if(config.id==='star-fox'&&round.featureResult.rounds.length<3)continue;
   if(config.id==='cloud-elephant'&&!round.featureResult.rounds.some(r=>r.focus?.length))continue;
   feature=round;featureSample=sample;
  }
  if(feature&&(ordinary||config.id==='star-fox'))break;
 }
 if(!feature)throw Error('No feature sample '+config.id);
 fixtures[config.id]={seed,sample:featureSample,searched:sample,feature,ordinary};
 console.log(config.id, 'sample',sample,'feature',feature.featureResult!.rounds.length,'rounds','win',feature.totalWin,'ordinary',ordinary?.totalWin);
}
writeFileSync('/tmp/f44-natural-fixtures.json',JSON.stringify(fixtures,null,2));
