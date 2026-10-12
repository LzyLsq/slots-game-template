import {preparePrimary,visibleGrid} from './IndependentCore';
import {evaluateCore} from './CoreGame';
import {signature} from './SignatureFeature';
import type {RandomSource} from '../core/SecureRNG';
import {ClusterEvaluator,PaylineEvaluator,ScatterEvaluator,WaysEvaluator} from './Evaluators';
import type {FeatureResult,FeatureRound,ForceResult,GameConfig,SpinResult,WinResult} from './types';

/** Outcomes are independent of animation, purchase history and wallet balance. */
export class ResultGenerator {
 private readonly lines=new PaylineEvaluator(); private readonly ways=new WaysEvaluator();
 private readonly clusters=new ClusterEvaluator(); private readonly scatter=new ScatterEvaluator(); private sequence=0;
 public gridFromStops(c:GameConfig,stops:readonly number[]):string[]{return c.reelStrips.flatMap((strip,col)=>Array.from({length:c.rows},(_,row)=>strip[(stops[col]+row)%strip.length]));}
 public evaluate(c:GameConfig,grid:readonly string[],bet:number):WinResult[]{
  if(grid.length!==c.columns*c.rows||grid.some(id=>!c.symbols.some(s=>s.id===id)))throw new Error('Invalid grid');
  const main=c.payMode==='clusters'?this.clusters:c.payMode==='ways'?this.ways:this.lines;
  return [...(c.coreMode?evaluateCore(c,grid,bet):main.evaluate(c,grid,bet)),...this.scatter.evaluate(c,visibleGrid(c,grid),bet)];
 }
 public generate(c:GameConfig,bet:number,rng:RandomSource,force?:ForceResult):SpinResult{
  if(!Number.isSafeInteger(bet)||!c.bets.includes(bet))throw new Error('Unsupported bet');
  const seed=rng.snapshot(),prepared=preparePrimary(c,rng);c=prepared.config;const stops=c.reelStrips.map(strip=>rng.int(0,strip.length)),grid=this.gridFromStops(c,stops);
  if(force?.symbolId&&c.symbols.some(s=>s.id===force.symbolId))for(let col=0;col<Math.min(force.count??3,c.columns);col++)grid[col*c.rows+Math.floor(c.rows/2)]=force.symbolId;
  if(force?.wild)grid[Math.floor(c.rows/2)]=c.wildId;
  if(force?.scatterCount&&c.scatterId)for(let i=0;i<Math.min(force.scatterCount,c.columns);i++)grid[i*c.rows]=c.scatterId;
  if(force?.holdAndSpin&&c.bonusId)for(let i=0;i<Math.min(6,Math.ceil(grid.length/2));i++)grid[i*2]=c.bonusId;
  let wins=this.evaluate(c,grid,bet);
  if(force?.winTier){const multiplier=force.winTier==='big'?7:force.winTier==='super'?25:force.winTier==='mega'?75:150;wins.push({kind:'bonus',symbolId:'chest',count:1,multiplier,credits:bet*multiplier,positions:[]});}
  let featureResult=this.resolve(c,bet,grid,wins,rng,!!(force?.scatterCount||force?.holdAndSpin));let remaining=Math.floor(bet*c.maxWinMultiplier);
  const award=(value:number):number=>{const credits=Math.min(remaining,value);remaining-=credits;return credits;};
  wins=wins.map(w=>({...w,credits:award(w.credits)}));
  let baseWin=wins.reduce((sum,w)=>sum+w.credits,0);
  if(featureResult){
   const rounds=featureResult.rounds.map(round=>{
    const credits=award(round.credits);let roundBudget=credits;
    const roundWins=round.wins.map(w=>{const amount=Math.min(roundBudget,w.credits);roundBudget-=amount;return {...w,credits:amount};});
    return {...round,wins:roundWins,credits};
   });
   const totalCredits=rounds.reduce((sum,r)=>sum+r.credits,0);
   featureResult={...featureResult,rounds,totalCredits,pickAwards:featureResult.pickAwards?.map(()=>totalCredits)};
  }
  const featureWin=featureResult?.totalCredits??0;
  // Draw/settle the reels and features first. Only a separate, visible benefit
  // fills a qualifying new player's total return up to 10x the stake.
  if(force?.newcomerSuper&&baseWin+featureWin<bet*10){
   const credits=Math.min(remaining,bet*10-baseWin-featureWin);
   if(credits>0){wins.push({kind:'bonus',symbolId:'newcomer-benefit',count:1,multiplier:0,credits,positions:[]});baseWin+=credits;}
  }
  return {spinId:`${c.id}-${seed}-${++this.sequence}`,gameId:c.id,seed,stops,grid,layout:prepared.layout,wins,baseWin,featureWin,totalWin:baseWin+featureWin,featureResult,feature:featureResult?{type:featureResult.type,count:featureResult.rounds.length}:undefined,anticipationColumns:[]};
 }
 private fresh(c:GameConfig,rng:RandomSource):string[]{return this.gridFromStops(c,c.reelStrips.map(strip=>rng.int(0,strip.length)));}
 /** Preserve all surviving symbols and their vertical order, refill at the top. */
 public collapse(c:GameConfig,grid:readonly string[],removed:readonly number[],rng:RandomSource):string[]{
  const cleared=new Set(removed),next:string[]=[];
  for(let col=0;col<c.columns;col++){const survivors=grid.slice(col*c.rows,(col+1)*c.rows).filter((_,row)=>!cleared.has(col*c.rows+row));const strip=c.reelStrips[col];next.push(...Array.from({length:c.rows-survivors.length},()=>strip[rng.int(0,strip.length)]),...survivors);}
  return next;
 }
 private resolve(c:GameConfig,bet:number,grid:readonly string[],wins:readonly WinResult[],rng:RandomSource,forced=false):FeatureResult|undefined{
  return signature({...c,payoutScale:c.featurePayoutScale??c.payoutScale},bet,grid,wins,rng,(cfg,g,b)=>this.evaluate(cfg,g,b).filter(w=>w.kind!=='scatter'),(cfg,r)=>this.fresh(cfg,r),(cfg,g,ps,r)=>this.collapse(cfg,g,ps,r),forced);
 }
}
