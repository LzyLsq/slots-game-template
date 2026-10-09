/** Presentation-only clock. It never reads or mutates the wallet or RNG. */
export interface AwardTiming {tier:number;intro:number;countStart:number;countEnd:number;climaxEnd:number;end:number;exit:number}
export type AwardPhase='reveal'|'count'|'climax'|'hold'|'exit';
export const clamp01=(value:number):number=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export const smooth=(value:number):number=>{const p=clamp01(value);return p*p*(3-2*p);};
export function awardTiming(tier:number,reduced=false):AwardTiming{
 const t=Number.isFinite(tier)?Math.max(0,Math.min(4,Math.floor(tier))):0;
 if(t===0)return {tier:t,intro:.14,countStart:0,countEnd:reduced?0:.72,climaxEnd:1.35,end:2.35,exit:.28};
 if(reduced)return {tier:t,intro:0,countStart:0,countEnd:0,climaxEnd:.8,end:2.2,exit:.01};
 const countEnd=[0,4.1,5.1,5.65,6.2][t];
 return {tier:t,intro:.56,countStart:1.0,countEnd,climaxEnd:countEnd+1.6,end:countEnd+[0,2.7,3.0,3.3,3.6][t],exit:.36};
}
export function awardPhase(time:number,plan:AwardTiming):AwardPhase{
 if(time>=plan.end)return 'exit';if(time>=plan.climaxEnd)return 'hold';
 if(time>=plan.countEnd)return 'climax';if(time>=plan.countStart)return 'count';return 'reveal';
}
export function awardValue(amount:number,time:number,plan:AwardTiming):number{
 if(!Number.isFinite(amount)||amount<=0)return 0;
 if(time>=plan.countEnd)return amount;
 const p=clamp01((time-plan.countStart)/(plan.countEnd-plan.countStart));
 return Math.floor(amount*(1-Math.pow(1-p,2.1)));
}
/** Fixed, deterministic sprite paths: no allocation, physics engine or per-frame RNG. */
export interface AwardCoinPose{x:number;y:number;scaleX:number;scaleY:number;angle:number;alpha:number}
export function awardCoinPose(index:number,time:number,plan:AwardTiming,small=false):AwardCoinPose{
 const inactive:AwardCoinPose={x:0,y:0,scaleX:0,scaleY:0,angle:0,alpha:0};
 if(!Number.isFinite(time)||time<0)return inactive;
 const seed=(index*.61803398875)%1,side=index%2?1:-1;
 if(small){
  const age=(time-.07-index*.025)/.82;if(age<0||age>=1)return inactive;
  return {x:side*(200+150*age)+(seed-.5)*40,y:15+125*Math.sin(age*Math.PI)-45*age,scaleX:.35+.65*Math.abs(Math.cos(age*9+index)),scaleY:1,angle:side*age*180,alpha:255*Math.sin(age*Math.PI)};
 }
 // At the cadence, reuse the same sprites for a fresh treasure-crown burst.
 if(time>=plan.countEnd){
  const p=(time-plan.countEnd-(index%12)*.026)/1.35;if(p<0||p>=1)return inactive;
  const angle=seed*Math.PI*2,radius=115+560*p;
  return {x:Math.cos(angle)*radius,y:170+Math.sin(angle)*radius*.75-130*p*p,
   scaleX:(.25+.75*Math.abs(Math.cos(p*14+index)))*(1-p*.32),scaleY:1-p*.32,angle:index*17+p*220,
   alpha:255*Math.min(1,p*7,(1-p)*5)};
 }
 const life=1.75+seed*.65,local=time-.4-index*.035;
 if(local<0)return inactive;
 const cycle=Math.floor(local/life),launch=.4+index*.035+cycle*life;
 // At the climax the fountain becomes a fresh outward crown of coins.
 const finale=clamp01((time-plan.countEnd)/1.6);
 if(launch>plan.countEnd+.25||finale>=1)return inactive;
 const p=(local%life)/life;
 const width=1+plan.tier*.04;
 return {x:side*(100+seed*60+(380+seed*190)*p)*width,y:120+1800*p-(1750+seed*260)*p*p,
  scaleX:(.25+.75*Math.abs(Math.cos(p*14+index)))*(1-finale*.35),scaleY:1-finale*.35,
  angle:side*(p*250+index*19),alpha:255*Math.min(1,p*8,(1-p)*6)*(1-finale)};
}
export function awardFormat(amount:number,locale='en-US'):string{
 return (Number.isFinite(amount)?Math.max(0,amount):0).toLocaleString(locale,{maximumFractionDigits:3});
}
