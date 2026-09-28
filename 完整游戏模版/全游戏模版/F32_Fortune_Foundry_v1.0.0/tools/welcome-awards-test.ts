import assert from 'node:assert/strict';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
import {applyWelcomeAward,awardBand,type WelcomeProgress} from '../assets/scripts/math/WelcomeAwards';
import type {SpinResult} from '../assets/scripts/math/types';

const gen=new ResultGenerator();
for(const config of GAME_CONFIGS){
 const bet=config.bets[0], rng=new SeededRNG(42), results:SpinResult[]=[];
 let big=false,superWin=false;
 for(let n=0;n<12;n++){
  const raw=gen.generate(config,bet,rng);
  const result=applyWelcomeAward(raw,bet,config.maxWinMultiplier,{completed:n,bigSeen:big,superSeen:superWin});
  results.push(result);
  const band=awardBand(result,bet);big ||= band>=1;superWin ||= band>=2;
  assert(result.totalWin<=bet*config.maxWinMultiplier);
  assert.equal(result.totalWin,result.baseWin+result.featureWin);
  assert.equal(result.baseWin,result.wins.reduce((sum,w)=>sum+w.credits,0));
  assert.deepEqual(result.grid,raw.grid,'a welcome award cannot rewrite the board');
  if(result.welcomeAward){
   assert([5,10].includes(n+1),'welcome bonuses only settle on advertised milestones');
   assert.equal(result.totalWin-raw.totalWin,result.welcomeAward.credits);
   assert(result.wins.some(w=>w.symbolId==='welcome-treasure'&&w.positions.length===0));
  }
 }
 assert(results.slice(0,5).some(r=>awardBand(r,bet)>=1),config.id+' first five');
 assert(results.slice(0,10).some(r=>awardBand(r,bet)>=2),config.id+' first ten');
}
// Deterministic losing source makes both milestones observable; count is account-wide.
const configs=[GAME_CONFIGS[0],GAME_CONFIGS[1],GAME_CONFIGS[2],GAME_CONFIGS[3]];
const bet=configs[0].bets[0];
const empty=gen.generate(configs[0],bet,new SeededRNG(142));
const loss={...empty,wins:[],baseWin:0,featureWin:0,totalWin:0,featureResult:undefined};
let a:WelcomeProgress={completed:0,bigSeen:false,superSeen:false};
for(let n=1;n<=10;n++){
 const config=configs[(n-1)%4];const result=applyWelcomeAward({...loss,gameId:config.id},bet,config.maxWinMultiplier,a);
 assert.equal(result.welcomeAward?.tier,n===5?'big':n===10?'super':undefined);
 assert.equal(result.totalWin,n===5?bet*10:n===10?bet*50:0);
 // Replayed request does not advance progress or create an additional award.
 assert.deepEqual(applyWelcomeAward({...loss,gameId:config.id},bet,config.maxWinMultiplier,a),result);
 const band=awardBand(result,bet);a={completed:n,bigSeen:a.bigSeen||band>=1,superSeen:a.superSeen||band>=2};
}
const naturalBig={...loss,wins:[],baseWin:bet*12,totalWin:bet*12};
assert.equal(applyWelcomeAward(naturalBig,bet,configs[0].maxWinMultiplier,{completed:4,bigSeen:false,superSeen:false}).welcomeAward,undefined);
assert.equal(applyWelcomeAward(loss,bet,configs[0].maxWinMultiplier,{completed:4,bigSeen:true,superSeen:false}).welcomeAward,undefined);
const naturalSuper={...loss,baseWin:bet*51,totalWin:bet*51};
assert.equal(applyWelcomeAward(naturalSuper,bet,configs[0].maxWinMultiplier,{completed:9,bigSeen:false,superSeen:false}).welcomeAward,undefined);
assert.equal(applyWelcomeAward(loss,bet,configs[0].maxWinMultiplier,{completed:9,bigSeen:true,superSeen:true}).welcomeAward,undefined);
assert.equal(applyWelcomeAward(loss,bet,configs[0].maxWinMultiplier,{completed:10,bigSeen:false,superSeen:false}).welcomeAward,undefined);
console.log('PASS onboarding BIG within 5, SUPER within 10, all four cabinets, idempotent decision and genuine board separation');
