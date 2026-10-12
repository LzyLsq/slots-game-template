import {awardProbe,clearAwardProbe,awardShowcase} from '../assets/scripts/vfx/AwardProbe';
import {winTier,celebrationCaption,tierRules} from '../assets/scripts/vfx/WinPresentation';
import assert from 'node:assert/strict';
import {spectacleProfile,spectacleSeed,spectaclePose,spectaclePulse,emptySpectaclePose} from '../assets/scripts/vfx/AwardSpectacle';
import {awardTiming,awardPhase,awardValue,awardCoinPose,awardFormat} from '../assets/scripts/vfx/AwardTimeline';
for(let tier=0;tier<5;tier++)for(const reduced of [true,false]){
 const plan=awardTiming(tier,reduced);assert.equal(plan.tier,tier);assert(plan.end-plan.countEnd>=1.6);
 for(const amount of [.125,1.234,80,2340.875,100000000.125]){
  let prior=0;
  for(let time=0;time<plan.end;time+=.05){const value=awardValue(amount,time,plan);assert(value>=prior&&value<=amount);prior=value;}
  assert.equal(awardValue(amount,plan.countEnd,plan),amount,'final count keeps exact settlement precision');
 }
 assert.equal(awardPhase(plan.countEnd,plan),'climax');assert.equal(awardPhase(plan.end,plan),'exit');
 for(let index=0;index<64;index++)for(const time of [-1,0,.8,2,plan.countEnd,plan.end,500]){
  const p=awardCoinPose(index,time,plan,tier===0);assert(Object.values(p).every(Number.isFinite));assert(p.alpha>=0&&p.alpha<=255.00001);assert(p.scaleX>=0&&p.scaleY>=0);assert(Math.abs(p.x)<1100&&Math.abs(p.y)<2200);
 }
}
assert.equal(awardTiming(NaN).tier,0);assert.equal(awardTiming(99).tier,4);
assert.equal(awardValue(NaN,0,awardTiming(1)),0);assert.equal(awardValue(-1,0,awardTiming(1)),0);
assert.equal(awardFormat(2340.875),'2,340.875');assert.equal(awardFormat(.125),'0.125');
for(const [multiplier,tier] of [[NaN,0],[Infinity,0],[-1,0],[0,0],[.5,0],[1,0],[1+Number.EPSILON,1],[1.001,1],[9.999,1],[10,2],[49.999,2],[50,3],[99.999,3],[100,4],[2500,4]])assert.equal(winTier(multiplier),tier,`presentation boundary ${multiplier}`);
assert.match(celebrationCaption(1.25),/EXCEEDS BET/);assert.match(celebrationCaption(10),/10×/);assert.match(celebrationCaption(50),/50×/);assert.match(celebrationCaption(100),/100×/);assert.match(tierRules(),/return > stake/);
// Local diagnostic markers never leak into a production session or payout logic.

const savedDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
const savedLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
const attrs=new Map<string,string>();
const canvas={setAttribute:(key:string,value:string)=>attrs.set(key,value),getAttribute:(key:string)=>attrs.get(key)??null,removeAttribute:(key:string)=>attrs.delete(key)};
try{
 Object.defineProperty(globalThis,'document',{value:{getElementById:()=>canvas},configurable:true});
 for(const [hostname,search,enabled,held] of [['example.com','?debug=1&showcase=1',false,false],['127.0.0.1','',false,false],['127.0.0.1','?debug=1',true,false],['localhost','?debug=1&showcase=1',true,true]] as const){
  attrs.clear();Object.defineProperty(globalThis,'location',{value:{hostname,search},configurable:true});
  assert.equal(awardShowcase(),held);
  awardProbe(2,'reveal',0);awardProbe(2,'count',900,{voices:12,state:'running',audible:true});awardProbe(2,'hold',2000,{voices:0,state:'running',audible:true});
  assert.equal(attrs.has('data-award-tier'),enabled);
  if(enabled){assert.equal(attrs.get('data-award-peak-voices'),'12');assert.equal(attrs.get('data-award-amount'),'2000');clearAwardProbe();assert.equal(attrs.size,0);}
 }
}finally{
 if(savedDocument)Object.defineProperty(globalThis,'document',savedDocument);else delete (globalThis as any).document;
 if(savedLocation)Object.defineProperty(globalThis,'location',savedLocation);else delete (globalThis as any).location;
}
console.log('PASS award: 5 tiers, reduced motion, count/hold phases, deterministic bounded coin paths, exact payout decimals, local-only QA markers and cleanup');

let previous=0;
for(let tier=1;tier<=4;tier++){
 const profile=spectacleProfile(tier),plan=awardTiming(tier),total=profile.fountain+profile.orbit+profile.rain+profile.sparks;
 assert(total>previous&&total<=176);previous=total;assert(profile.beams<=12);assert(profile.shake<=5);
 const reduced=spectacleProfile(tier,true);assert.equal(Object.values(reduced).reduce((a,b)=>a+b,0),0);
 assert(plan.climaxEnd-plan.countEnd>=1.5);assert(plan.end-plan.countEnd>=2.7);
 for(const kind of ['fountain','orbit','rain','spark'] as const)for(let i=0;i<profile[kind==='fountain'?'fountain':kind==='orbit'?'orbit':kind==='rain'?'rain':'sparks'];i++){
  const seed=spectacleSeed(kind,i),out=emptySpectaclePose();
  for(let t=-1;t<=plan.end+3;t+=.043){
   assert.equal(spectaclePose(seed,t,plan,out),out,'reuse one pose without allocations');
   assert(Object.values(out).every(Number.isFinite));assert(out.alpha>=0&&out.alpha<=255.00001);
   assert(out.scaleX>=0&&out.scaleY>=0);assert(Math.abs(out.x)<850&&Math.abs(out.y)<=880);
   const r=seed.size*Math.max(out.scaleX,out.scaleY)*.72;
   if(out.alpha>0&&((out.y+r>396&&out.y-r<776)||(out.y+r>-825&&out.y-r<-354)))assert(Math.abs(out.x)-r>=515.999,'leave title and register corridors completely clear');
  }
  const expected=spectaclePose(seed,2.341,plan,emptySpectaclePose());assert.deepEqual(spectaclePose(seed,2.341,plan,out),expected,'deterministic restart');
 }
 for(let t=0;t<=plan.end+1;t+=.03){const pulse=spectaclePulse(t,plan);assert(pulse>=0&&pulse<=1);}
 assert(spectaclePulse(plan.countEnd+.42,plan)>.9);assert(spectaclePulse(plan.countEnd+1,plan)>.7,'second cascade has a real second peak');
}
assert.equal(spectacleProfile(NaN).fountain,28);assert.equal(spectacleProfile(99).fountain,60);
console.log('PASS spectacle: four escalating fixed pools, 176-particle cap, reusable poses, deterministic paths, title/register keepouts, double climax, reduced-motion zero pools');
