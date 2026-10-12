import assert from 'node:assert/strict';
import {GUARDIAN_SOURCE,GUARDIAN_JEWELS,GUARDIAN_RIGID_DETAILS,guardianCutoutV,guardianCutoutSoftY,guardianCutoutArea,fitGuardianSeat} from '../assets/scripts/ui/GuardianDetails';
import {GuardianRig,guardianPlanted,emptyGuardianPose} from '../assets/scripts/ui/GuardianMotion';
import {GUARDIAN_WEALTH_SEATS} from '../assets/scripts/ui/GuardianProsperity';
const id='vault-reserve' as const;
const v=(old:number)=>(40+old*623)/663;
assert.deepEqual(GUARDIAN_SOURCE[id],[477,663]);
for(const y of [-.14,0,.29,.5,.82,.89,1])assert.equal(guardianCutoutV(id,y),v(y));
assert.equal(guardianCutoutSoftY(id,.06),.06*623/663);
assert.deepEqual(guardianCutoutArea(id,[.2,.1,.8,.9]),[.2,v(.1),.8,v(.9)]);
for(const unchanged of ['crown-club','emerald-fortune','ruby-royale'] as const){
 assert.equal(guardianCutoutV(unchanged,.3),.3);assert.equal(guardianCutoutSoftY(unchanged,.06),.06);
}
assert.deepEqual(GUARDIAN_JEWELS[3].map(j=>j.v),[.063,.535,.269].map(v));
assert.deepEqual(GUARDIAN_RIGID_DETAILS[3].map(d=>[d.area[1],d.area[3]]),[[.135,.30],[.213,.548],[.085,.19]].map(([t,b])=>[v(t),v(b)]));
assert.deepEqual(GUARDIAN_WEALTH_SEATS[3],{start:[.17,v(.31)],bend:[.5,v(.61)],target:[.83,v(.31)]});
assert(guardianPlanted(id,.5,v(.89)));assert(!guardianPlanted(id,.5,v(.889)));
let samples=0;
for(const [width,height] of [[210,284],[390,490],[430,590]]){
 const fit=fitGuardianSeat(id,width,height),rig=new GuardianRig(id,fit.width,fit.height);
 const scale=fit.width/477;
 assert(Math.abs(fit.height/663-scale)<1e-12);
 assert.equal(fit.offsetY-fit.height/2,-height/2);
 for(const degrees of [-4,-2,2,4]){
  const pose=emptyGuardianPose(id);pose.angles[0]=degrees*Math.PI/180;rig.apply(pose);
  // Both native-alpha horn tips belong to the same head transform, not an
  // immobile crop remainder. These points are within the measured horn cores.
  // Float32 mesh vertices: seven decimal places is below a source-pixel fraction.
  for(const [u,y] of [[.455,.027],[.843,.105]]){
   const point=rig.sample(u,y,{x:0,y:0});
   const px=.53*fit.width,py=v(.29)*fit.height,dx=u*fit.width-px,dy=y*fit.height-py;
   const c=Math.cos(pose.angles[0]),s=Math.sin(pose.angles[0]);
   assert(Math.abs(point.x-(px+c*dx-s*dy)/fit.width)<1e-7,'Horn tip follows head without stretching');
   assert(Math.abs(point.y-(py+s*dx+c*dy)/fit.height)<1e-7);
   samples++;
  }
 }
}
console.log(`PASS bull registration: original pixel-coordinate contacts, feet, jewels, key/coin paths, vertical skin fades and ${samples} rigid moving horn-tip samples.`);
