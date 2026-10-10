import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { newcomerMinimum } from '../assets/scripts/math/NewcomerGuarantee';
import { PaylineEvaluator } from '../assets/scripts/math/Evaluators';
import type { GameConfig } from '../assets/scripts/math/types';

const spins = Number(process.argv[2] ?? 250000);
const seeds = (process.argv[3] ?? '2510457887,918273645,12648430').split(',').map(Number);
const betIndex = Number(process.argv[4] ?? 2);
assert(Number.isSafeInteger(spins) && spins >= 10000);
const exactFox = (c: GameConfig, bet: number) => {
  const gen = new ResultGenerator();
  const line = new PaylineEvaluator();
  const ordinary = c.symbols.filter(s => !['wild','scatter','bonus'].includes(s.tier)).map(s=>s.id);
  const special = c.bonusId!;
  let combinations = 0, base = 0, hits = 0, triggers = 0, freeReturn = 0;
  for (let x=0;x<c.reelStrips[0].length;x++) for(let y=0;y<c.reelStrips[1].length;y++) for(let z=0;z<c.reelStrips[2].length;z++) {
    const grid=gen.gridFromStops(c,[x,y,z]);
    const amount=line.evaluate(c,grid,bet).reduce((sum,w)=>sum+w.credits,0);
    combinations++;base+=amount;if(amount>0)hits++;
    if(grid.filter(s=>s===special).length>=3)triggers++;
    for(const replacement of ordinary) {
      const revealed=grid.map(s=>s===special?replacement:s);
      freeReturn+=line.evaluate({...c,payoutScale:c.featurePayoutScale??c.payoutScale},revealed,bet).reduce((sum,w)=>sum+w.credits,0)/ordinary.length;
    }
  }
  const baseRtp=base/(bet*combinations),featureRate=triggers/combinations;
  // Each of the three mystery free spins uses independent fresh reel stops.
  const featureRtp=featureRate*3*freeReturn/(bet*combinations);
  return {combinations,baseHitRate:hits/combinations,baseRtp,featureRate,featureRtp,rtp:baseRtp+featureRtp};
};
const audit = (c:GameConfig) => {
  const bet=c.bets[betIndex], runs=[];
  let total=0,squares=0,base=0,feature=0,trigger=0,maxWin=0,longestDryRun=0;
  const buckets={zero:0,partialReturn:0,breakEven:0,big:0,super:0,mega:0,epic:0};
  for(const seed of seeds) {
    const gen=new ResultGenerator(),rng=new SeededRNG(seed);let runTotal=0,runSquares=0,dry=0,hits=0,profits=0;
    for(let i=0;i<spins;i++) {
      const r=gen.generate(c,bet,rng),w=r.totalWin,m=w/bet;
      assert.equal(w,r.baseWin+r.featureWin);
      runTotal+=m;runSquares+=m*m;total+=m;squares+=m*m;base+=r.baseWin/bet;feature+=r.featureWin/bet;
      if(r.feature)trigger++;maxWin=Math.max(maxWin,w);
      if(w===0){buckets.zero++;dry++;longestDryRun=Math.max(longestDryRun,dry);} else {hits++;dry=0;if(w<bet)buckets.partialReturn++;else if(w===bet)buckets.breakEven++;else {profits++;if(m<10)buckets.big++;else if(m<50)buckets.super++;else if(m<100)buckets.mega++;else buckets.epic++;}}
    }
    const rtp=runTotal/spins,se=Math.sqrt(Math.max(0,runSquares/spins-rtp*rtp)/(spins-1));
    runs.push({seed,spins,rtp,confidence95:[rtp-1.96*se,rtp+1.96*se],hitRate:hits/spins,netProfitRate:profits/spins});
    console.error(c.id,seed,JSON.stringify(runs.at(-1)));
  }
  const n=spins*seeds.length,rtp=total/n,se=Math.sqrt(Math.max(0,squares/n-rtp*rtp)/(n-1));
  const rate=Object.fromEntries(Object.entries(buckets).map(([k,v])=>[k,v/n]));
  const exact=c.id==='moon-fox'?exactFox(c,bet):undefined;
  const gen=new ResultGenerator(),rng=new SeededRNG(194512312);const milestones=[];
  for(let played=0;played<12;played++) {
    const minimum=newcomerMinimum(played);
    const r=gen.generate(c,bet,rng,minimum?{newcomerMinimum:minimum}:undefined);
    if(minimum)assert(r.totalWin>=minimum*bet);
    milestones.push({round:played+1,minimum:minimum??0,totalWin:r.totalWin,benefit:r.wins.filter(w=>w.symbolId==='newcomer-benefit').reduce((s,w)=>s+w.credits,0)});
  }
  return {gameId:c.id,bet,spins:n,seeds,targetRtp:c.targetRtp,payoutScale:c.payoutScale,featurePayoutScale:c.featurePayoutScale,rtp,confidence95:[rtp-1.96*se,rtp+1.96*se],targetWithinConfidence95:Math.abs(rtp-c.targetRtp)<=1.96*se,hitRate:1-buckets.zero/n,netProfitRate:(buckets.big+buckets.super+buckets.mega+buckets.epic)/n,superOrHigherRate:(buckets.super+buckets.mega+buckets.epic)/n,baseRtp:base/n,featureRtp:feature/n,featureRate:trigger/n,rate,longestDryRun,maxWin,runs,exact,milestones};
};
const results=GAME_CONFIGS.filter(c=>!process.env.PROBABILITY_GAME||c.id===process.env.PROBABILITY_GAME).map(audit);
const report={naturalOnly:true,newcomerIncluded:false,forcedResultsIncluded:false,method:'Independent xorshift32 seeds; real ResultGenerator and integer settlement. Fox exact enumeration verifies base and independent mystery free spins.',results};
if(process.argv[5])writeFileSync(process.argv[5],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
