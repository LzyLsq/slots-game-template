import {strict as assert} from 'node:assert';
import {createRound,evaluate,INITIAL_WELCOME,SeededRandom,STAKES,tierFor,type Board} from '../assets/scripts/domain/EncoreMath';
const empty=(n:number):Board=>Array.from({length:5},()=>Array(4).fill(n));
const board=empty(8);for(let c=0;c<4;c++){board[c][0]=0;board[c][1]=0;}assert.equal(evaluate(board,100).find(w=>w.symbol===0)?.ways,16);
assert.equal(evaluate(board,100).find(w=>w.symbol===0)?.length,4);
assert.throws(()=>createRound(new SeededRandom(1),-10,0,INITIAL_WELCOME));
assert.throws(()=>createRound(new SeededRandom(1),100,5,INITIAL_WELCOME));
for(const seed of [1,2,3,42,1234567]){
 const r1=new SeededRandom(seed),r2=new SeededRandom(seed);
 let p1={...INITIAL_WELCOME},p2={...INITIAL_WELCOME};
 for(let i=0;i<100;i++){
   const a=createRound(r1,STAKES[i%4],i%5,p1),b=createRound(r2,STAKES[i%4],i%5,p2);
   assert.deepEqual(a,b);p1=a.progress;p2=b.progress;
   assert.equal(a.award,Math.min(a.stake*250,a.primaryAward+a.encoreAward));
   assert.equal(a.tier,tierFor(a.award,a.stake));
   assert.ok(a.award>=0&&Number.isSafeInteger(a.award));
   if(a.encore){assert.equal(a.encore[a.held!.column][a.held!.row],a.held!.symbol);assert.ok(a.primary.flat().filter(x=>x===4).length>=3);}
   if(i===4)assert.equal(a.progress.bigSeen,true);
   if(i===9)assert.equal(a.progress.superSeen,true);
 }
}
console.log('PASS deterministic boards, ways, held encore, integer accounting, onboarding BIG<=5 and SUPER<=10');
