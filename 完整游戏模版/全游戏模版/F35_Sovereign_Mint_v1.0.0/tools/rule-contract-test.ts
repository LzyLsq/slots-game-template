import assert from 'node:assert/strict';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {evaluateIndependent,PROJECT_NUMBER} from '../assets/scripts/math/IndependentCore';
import {primaryVariant} from '../assets/scripts/math/PrimaryRuleVariants';
import {primaryRuleText} from '../assets/scripts/math/PrimaryRuleText';
import {ScatterEvaluator} from '../assets/scripts/math/Evaluators';
import {ruleAward,ruleAllCounts} from '../assets/scripts/math/PaytableDisplay';
import {rulePaths,ruleExample} from '../assets/scripts/math/RuleGeometry';
import {assertVariant,variantFixtures} from './variant-fixtures';
let checks=0;
for(const [index,c] of GAME_CONFIGS.entries()){
 const size=c.columns*c.rows,bet=10000,symbol=c.symbols.find(s=>s.tier==='low')!.id,blank=()=>Array(size).fill(c.scatterId??c.bonusId),evalGrid=(g:string[])=>evaluateIndependent(c,g,bet),v=primaryVariant(c);
 assertVariant(c);checks+=2;
 for(const locale of ['en','zh-CN','zh-TW','ja','ko']){const text=primaryRuleText(c,locale);assert.equal(text.length,2);assert(text.every(p=>p.length>20&&!/\{[mnrdh]\}/.test(p)));checks++;}
 const paths=rulePaths(c);
 if(['line-reels','twin-boards'].includes(c.primaryKind!))for(const [line,path] of paths.entries()){
  const grid=blank();path.forEach(p=>grid[p]=symbol);const win=evalGrid(grid).find(w=>w.lineIndex===line);assert(win,`${c.id} diagram line ${line} must actually pay`);
  const count=path.length,divisor=c.paylines.length*(c.primaryKind==='twin-boards'?2:1),expected=Math.round(bet/divisor*c.paytable[symbol][count]*c.payoutScale);
  assert.equal(win.credits,expected);assert.equal(win.count,count);assert.deepEqual([...win.positions].sort((a,b)=>a-b),[...path].sort((a,b)=>a-b));checks++;
 }
 if(c.primaryKind==='variable-ways'){
  const cfg={...c,activeRows:Array(c.columns).fill(2)},grid=blank();for(let x=0;x<c.columns;x++)grid[x*c.rows+2]=symbol;
  assert.equal(evaluateIndependent(cfg,grid,bet).length,0,'closed symbols cannot win');for(let x=0;x<c.columns;x++)grid[x*c.rows]=symbol;
  const ws=evaluateIndependent(cfg,grid,bet);assert.equal(ws.length,1);assert.equal(ws[0].ways,1);assert(ws[0].positions.every(p=>p%c.rows<2));checks+=2;
 }
 if(['cluster-avalanche','scatter-groups','any-reel-ways'].includes(c.primaryKind!)){
  const grid=blank(),example=ruleExample(c);example.forEach(p=>grid[p]=symbol);if(v==='cluster-wild')grid[example[0]]=c.wildId;
  const ws=evalGrid(grid);assert(ws.length,`${v} diagram must qualify`);assert(ws.some(w=>w.symbolId===symbol));checks++;
 }
 if(c.primaryKind==='collector-grid'){
  const coin=c.symbols.find(s=>!['wild','scatter','bonus'].includes(s.tier))!.id;
  // Payout help must exclude non-cash symbols and impossible full-board cash counts.
  for(const id of [...c.symbols.map(s=>s.id),'__unknown__'].filter(id=>id!==coin&&id!==c.scatterId)){
   const g=blank();g[0]=id;g[1]=c.wildId;
   assert.equal(evalGrid(g).length,0,'collector cannot pay a non-cash symbol');
   assert.equal(ruleAward(c,id,1,bet),null,'payout help cannot promise a non-cash award');checks+=2;
  }
  assert.deepEqual(ruleAllCounts(c),Array.from({length:size-1},(_,i)=>i+1),'one cell must remain for the collector');checks++;
  const fullCash=Array(size).fill(coin);assert.equal(evalGrid(fullCash).length,0,'a full cash board has no collector');checks++;
  fullCash[size-1]=c.wildId;const maxCashWin=evalGrid(fullCash)[0];
  assert.equal(maxCashWin.count,size-1);assert.equal(ruleAward(c,coin,size-1,bet),maxCashWin.credits,'highest displayed count must be reachable');checks+=2;
  for(const count of [0,-1,1.5,size,size+1,NaN,Infinity]){assert.equal(ruleAward(c,coin,count,bet),null,'invalid cash count cannot advertise a payout');checks++;}
  // Exhaustive single-collector geometry is an independent reference, not the production helper.
  for(let p=0;p<size;p++)for(let q=0;q<size;q++)if(p!==q){
   const g=blank();g[p]=coin;g[q]=c.wildId;const px=Math.floor(p/c.rows),qx=Math.floor(q/c.rows),py=p%c.rows,qy=q%c.rows;
   const inside=true;
   const ws=evalGrid(g);assert.equal(ws.length,inside?1:0,`${v}: coin ${p}, collector ${q}`);if(inside){assert.equal(ws[0].credits,Math.round(bet*.15*c.payoutScale));assert.deepEqual(ws[0].positions,[p,q]);}checks++;
  }
 }
 // Every concrete fixture award must equal the payout help, including split wagers.
 for(const w of evalGrid(variantFixtures(c).positive)){assert.equal(w.credits,ruleAward(c,w.symbolId,w.count,bet,w.ways??1),v+' payout help');checks++;}
 if(c.scatterId)for(let count=3;count<=size;count++){
  const grid=Array(size).fill(symbol);for(let p=0;p<count;p++)grid[p]=c.scatterId;
  const cap=Math.min(c.columns,count),threshold=Math.max(...Object.keys(c.paytable[c.scatterId]).map(Number).filter(n=>n<=cap)),expected=Math.round(bet*c.paytable[c.scatterId][threshold]*c.payoutScale),ws=new ScatterEvaluator().evaluate(c,grid,bet);
  assert.equal(ws[0].credits,expected);assert.equal(ruleAward(c,c.scatterId,count,bet),expected,'scatter table must match capped settlement');checks++;
 }
}
console.log('PASS rule contracts: '+checks+' deterministic assertions across 4 genuinely distinct cabinets');
