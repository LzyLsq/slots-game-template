import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
const count=Number(process.argv[2]??30000),out=[];
for(const c of GAME_CONFIGS){let sum=0,sq=0,hits=0,big=0,features=0,max=0;const g=new ResultGenerator(),rng=new SeededRNG(Number(process.argv[3]??0x43a110)+out.length*7919),bet=500;for(let i=0;i<count;i++){const r=g.generate(c,bet,rng);const n=r.totalWin/bet;sum+=n;sq+=n*n;if(n>0)hits++;if(n>1)big++;if(r.featureResult)features++;max=Math.max(max,n);}out.push({id:c.id,count,scale:c.payoutScale,return:sum/count,error95:1.96*Math.sqrt((sq/count-(sum/count)**2)/count),hit:hits/count,big:big/count,feature:features/count,max});}
console.log(JSON.stringify(out,null,2));
