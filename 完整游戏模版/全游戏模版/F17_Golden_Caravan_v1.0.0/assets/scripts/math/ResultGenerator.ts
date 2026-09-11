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
  return [...main.evaluate(c,grid,bet),...this.scatter.evaluate(c,grid,bet)];
 }
 public generate(c:GameConfig,bet:number,rng:RandomSource,force?:ForceResult):SpinResult{
  if(!Number.isSafeInteger(bet)||!c.bets.includes(bet))throw new Error('Unsupported bet');
  const seed=rng.snapshot(),stops=c.reelStrips.map(strip=>rng.int(0,strip.length)),grid=this.gridFromStops(c,stops);
  if(force?.symbolId&&c.symbols.some(s=>s.id===force.symbolId))for(let col=0;col<Math.min(force.count??3,c.columns);col++)grid[col*c.rows+Math.floor(c.rows/2)]=force.symbolId;
  if(force?.wild)grid[Math.floor(c.rows/2)]=c.wildId;
  if(force?.scatterCount&&c.scatterId)for(let i=0;i<Math.min(force.scatterCount,c.columns);i++)grid[i*c.rows]=c.scatterId;
  if(force?.holdAndSpin&&c.bonusId)for(let i=0;i<6;i++)grid[i*2]=c.bonusId;
  let wins=this.evaluate(c,grid,bet);
  if(force?.winTier){const multiplier=force.winTier==='big'?25:force.winTier==='mega'?75:150;wins.push({kind:'bonus',symbolId:'chest',count:1,multiplier,credits:bet*multiplier,positions:[]});}
  let featureResult=this.resolve(c,bet,grid,wins,rng);let remaining=Math.floor(bet*c.maxWinMultiplier);
  const award=(value:number):number=>{const credits=Math.min(remaining,value);remaining-=credits;return credits;};
  wins=wins.map(w=>({...w,credits:award(w.credits)}));
  const baseWin=wins.reduce((sum,w)=>sum+w.credits,0);
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
  return {spinId:`${c.id}-${seed}-${++this.sequence}`,gameId:c.id,seed,stops,grid,wins,baseWin,featureWin,totalWin:baseWin+featureWin,featureResult,feature:featureResult?{type:featureResult.type,count:featureResult.rounds.length}:undefined,anticipationColumns:[]};
 }
 private fresh(c:GameConfig,rng:RandomSource):string[]{return this.gridFromStops(c,c.reelStrips.map(strip=>rng.int(0,strip.length)));}
 /** Preserve all surviving symbols and their vertical order, refill at the top. */
 public collapse(c:GameConfig,grid:readonly string[],removed:readonly number[],rng:RandomSource):string[]{
  const cleared=new Set(removed),next:string[]=[];
  for(let col=0;col<c.columns;col++){const survivors=grid.slice(col*c.rows,(col+1)*c.rows).filter((_,row)=>!cleared.has(col*c.rows+row));const strip=c.reelStrips[col];next.push(...Array.from({length:c.rows-survivors.length},()=>strip[rng.int(0,strip.length)]),...survivors);}
  return next;
 }
 private resolve(c:GameConfig,bet:number,grid:readonly string[],wins:readonly WinResult[],rng:RandomSource):FeatureResult|undefined{
  const count=grid.filter(id=>id===c.scatterId).length;
  if(c.feature==='golden-hour'&&count>=3){const prize=Math.round(bet*[1,2,3,5,8,12][rng.int(0,6)]*c.payoutScale);return {type:c.feature,rounds:[{index:1,grid,wins:[],credits:prize}],totalCredits:prize,pickAwards:[prize,prize,prize],detail:'Choose a vault to reveal a predetermined prize. Choice does not change the odds.'};}
  if(c.feature==='pearl-expansion'&&count>=3){const rounds:FeatureRound[]=[];
   for(let index=0;index<5;index++){const next=this.fresh(c,rng),column=rng.int(0,c.columns);for(let row=0;row<c.rows;row++)next[column*c.rows+row]=c.wildId;const roundWins=this.ways.evaluate(c,next,bet);rounds.push({index:index+1,grid:next,wins:roundWins,credits:roundWins.reduce((a,w)=>a+w.credits,0),expandedColumn:column});}
   return {type:c.feature,rounds,totalCredits:rounds.reduce((a,r)=>a+r.credits,0),detail:'Five included rounds, one fully expanding Wild column per round. No retriggers.'};
  }
  if(c.feature==='jade-respin'&&grid.filter(id=>id===c.bonusId).length>=6){
   const values:Record<number,number>={},coinValue=():number=>Math.round(bet*[.1,.2,.4,1,2][rng.int(0,5)]*c.payoutScale);grid.forEach((id,i)=>{if(id===c.bonusId)values[i]=coinValue();});
   let remaining=3;const rounds:FeatureRound[]=[];
   while(remaining>0&&Object.keys(values).length<15&&rounds.length<40){remaining--;let added=false;for(let i=0;i<15;i++)if(!(i in values)&&rng.bool(.095)){values[i]=coinValue();added=true;}if(added)remaining=3;rounds.push({index:rounds.length+1,grid:grid.map((id,i)=>i in values?'coin':id),wins:[],credits:0,remaining,locked:{...values}});}
   const full=Object.keys(values).length===15,prize=Object.values(values).reduce((a,v)=>a+v,0)+(full?Math.round(bet*20*c.payoutScale):0);
   if(rounds.length)rounds[rounds.length-1]={...rounds[rounds.length-1],credits:prize};else rounds.push({index:1,grid,wins:[],credits:prize,remaining:0,locked:values});
   return {type:c.feature,rounds,totalCredits:prize,jackpot:full?'grand':undefined,detail:'Coins stay locked. A new coin resets three respins. Filling all 15 adds a bonus.'};
  }
  if(c.feature==='ruby-cascade'&&wins.some(w=>w.kind==='cluster')){const rounds:FeatureRound[]=[];let previous=grid,previousWins=wins;
   // Cocos' loose spread transform assumes arrays; spreading a Set becomes
   // [Set] in the web build. Explicit conversion preserves numeric cell IDs.
   for(let index=0;index<8;index++){const removed=Array.from(new Set(previousWins.filter(w=>w.kind==='cluster').flatMap(w=>w.positions)));if(!removed.length)break;const next=this.collapse(c,previous,removed,rng),multiplier=index+2;const nextWins=this.clusters.evaluate(c,next,bet).map(w=>({...w,credits:w.credits*multiplier,multiplier:w.multiplier*multiplier}));rounds.push({index:index+1,grid:next,wins:nextWins,credits:nextWins.reduce((a,w)=>a+w.credits,0),removed,multiplier});previous=next;previousWins=nextWins;}
   return {type:c.feature,rounds,totalCredits:rounds.reduce((a,r)=>a+r.credits,0),detail:'Winning clusters collapse. Multiplier rises from 2× to 9×, up to eight refills.'};
  }
  return undefined;
 }
}
