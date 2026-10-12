/** Authored inward gold gestures. Two reusable image sprites only; never fake wallet rewards. */
import {guardianCutoutV,guardianCutoutSoftY} from './GuardianDetails';
import type {GameId} from '../math/types';
import {GUARDIAN_CHOREOGRAPHY,guardianCueDuration,type GuardianContext,type GuardianCue} from './GuardianMotion';
const THEMES:Record<GameId,number>={'crown-club':0,'emerald-fortune':1,'ruby-royale':2,'vault-reserve':3};
export const GUARDIAN_WEALTH_SEATS=[
 {start:[.18,.39],bend:[.50,.62],target:[.831,.464]}, // lion sycee bowl
 {start:[.816,.13],bend:[.85,.39],target:[.57,.57]}, // trunk coin offered inward
 {start:[.17,.315],bend:[.445,.50],target:[.807,.389]}, // fox paw into the gold tray
 {start:[.17,guardianCutoutV('vault-reserve',.31)],bend:[.50,guardianCutoutV('vault-reserve',.61)],target:[.83,guardianCutoutV('vault-reserve',.31)]}, // bull vault-key medallion
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
 const touchSeconds=guardianCueDuration(id,context,'touch');
 const t=cue==='touch'?Math.max(0,cueTime)/touchSeconds*clip.actionEnd:Math.max(0,time)%clip.seconds;
 // Touch follows the character-specific phrasing, including its last release.
 const duration=cue==='touch'?.32:.48;
 for(const release of RELEASES[context][theme]){
  const start=release+index*.10;
  if(!cue&&Math.floor(Math.max(0,time)/clip.seconds)*clip.seconds+start<notBefore)continue;
  const age=t-start;
  const life=cue==='touch'?Math.min(duration*clip.actionEnd/touchSeconds,Math.max(.12,clip.actionEnd-start-.02)):duration;
  if(age<0||age>life)continue;
  const p=age/life,q=1-p;
  out.u=q*q*seat.start[0]+2*q*p*seat.bend[0]+p*p*seat.target[0];
  out.v=q*q*(seat.start[1]+index*guardianCutoutSoftY(id,.035))+2*q*p*seat.bend[1]+p*p*seat.target[1];
  out.opacity=Math.round(185*Math.min(1,p/.16)*Math.min(1,(1-p)/.20));
  out.scale=.55+.38*Math.sin(Math.PI*p);out.angle=-12+154*p+index*18;
  return out;
 }
 return out;
}

export type GuardianDetailKind='trail'|'receive';
/** Five pooled optical details follow the actual wealth gesture. The receiver
 * is pinned to the treasure, not the face, horns, title or the wallet counter. */
export function guardianWealthDetail(id:GameId,context:GuardianContext,time:number,index:number,kind:GuardianDetailKind,cue:GuardianCue|undefined,cueTime:number,reduced:boolean,out:GuardianCoinPose,notBefore=0):GuardianCoinPose{
 const lane=kind==='receive'?0:Math.floor(index/2),lag=kind==='receive'?.035:.045+(index%2)*.040;
 guardianWealthCoin(id,context,time-lag,lane,cue,cueTime-lag,reduced,out,notBefore);
 if(kind==='trail'){out.opacity=Math.round(out.opacity*(index%2?.16:.29));out.scale*=.84;return out;}
 const target=GUARDIAN_WEALTH_SEATS[THEMES[id]].target,near=Math.max(0,1-Math.hypot(out.u-target[0],out.v-target[1])/.16);
 out.opacity=Math.round(out.opacity*near*near*.48);out.u=target[0];out.v=target[1];out.scale=.80+out.opacity/200;out.angle=0;return out;
}
