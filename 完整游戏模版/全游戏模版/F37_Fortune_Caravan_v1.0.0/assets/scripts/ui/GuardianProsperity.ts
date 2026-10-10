/** Authored inward gold gestures. Two reusable image sprites only; never fake wallet rewards. */
import type {GameId} from '../math/types';
import {GUARDIAN_CHOREOGRAPHY,GUARDIAN_CUE_SECONDS,type GuardianContext,type GuardianCue} from './GuardianMotion';
const THEMES:Record<GameId,number>={'caravan-gold':0,'sapphire-oasis':1,'ruby-bazaar':2,'crown-voyage':3};
export const GUARDIAN_WEALTH_SEATS=[
 {start:[.17,.37],bend:[.50,.58],target:[.850,.385]}, // coin bag mouth
 {start:[.17,.42],bend:[.52,.58],target:[.843,.410]}, // sycee ingot bowl
 {start:[.22,.41],bend:[.53,.57],target:[.848,.421]}, // treasure chest lock
 {start:[.20,.39],bend:[.53,.57],target:[.847,.426]}, // golden treasure compass
] as const;
const RELEASES:Record<GuardianContext,readonly (readonly number[])[]>={
 lobby:[[1.00,1.90,2.75],[1.42,2.85],[2.00,3.80],[1.25,1.8,2.35]],
 cabinet:[[1.04,1.90],[1.68,3.2],[2.28,3.35],[1.64,2.20]],
};
export interface GuardianCoinPose {u:number;v:number;opacity:number;scale:number;angle:number;}
export function emptyGuardianCoinPose():GuardianCoinPose{return {u:0,v:0,opacity:0,scale:1,angle:0};}
/** Coin travel stays below the face and wholly within the original character footprint.
 * During spins/awards it is silent and absent, so it cannot obscure reel results. */
export function guardianWealthCoin(id:GameId,context:GuardianContext,time:number,index:number,cue:GuardianCue|undefined,cueTime:number,reduced:boolean,out:GuardianCoinPose,notBefore=0):GuardianCoinPose{
 out.opacity=0;out.scale=1;out.angle=0;
 if(reduced||!Number.isFinite(time)||!Number.isInteger(index)||index<0||index>1||(cue&&cue!=='touch')||(cue==='touch'&&!Number.isFinite(cueTime)))return out;
 const theme=THEMES[id],clip=GUARDIAN_CHOREOGRAPHY[context][theme],seat=GUARDIAN_WEALTH_SEATS[theme];
 const t=cue==='touch'?Math.max(0,cueTime)/GUARDIAN_CUE_SECONDS.touch*clip.actionEnd:Math.max(0,time)%clip.seconds;
 // Touch uses the same staged invitation at its real 2.2 s cue rate.
 const duration=cue==='touch'?.32:.48;
 for(const release of RELEASES[context][theme]){
  const start=release+index*.10;
  if(!cue&&Math.floor(Math.max(0,time)/clip.seconds)*clip.seconds+start<notBefore)continue;
  const age=t-start;
  const life=cue==='touch'?Math.min(duration*clip.actionEnd/GUARDIAN_CUE_SECONDS.touch,Math.max(.12,clip.actionEnd-start-.02)):duration;
  if(age<0||age>life)continue;
  const p=age/life,q=1-p;
  out.u=q*q*seat.start[0]+2*q*p*seat.bend[0]+p*p*seat.target[0];
  out.v=q*q*(seat.start[1]+index*.035)+2*q*p*seat.bend[1]+p*p*seat.target[1];
  out.opacity=Math.round(185*Math.min(1,p/.16)*Math.min(1,(1-p)/.20));
  out.scale=.55+.38*Math.sin(Math.PI*p);out.angle=-12+154*p+index*18;
  return out;
 }
 return out;
}
