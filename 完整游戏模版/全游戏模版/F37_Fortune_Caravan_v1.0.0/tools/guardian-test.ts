import assert from 'node:assert/strict';
import {GuardianRig,guardianAwardCue,guardianPose,emptyGuardianPose,guardianPlanted,GUARDIAN_GRID_X as NX,GUARDIAN_GRID_Y as NY,GUARDIAN_SWEEP,GUARDIAN_CUE_SECONDS,GUARDIAN_CHOREOGRAPHY,type GuardianContext,type GuardianCue} from '../assets/scripts/ui/GuardianMotion';
import {CABINETS,guardianMotionBounds} from '../assets/scripts/ui/CabinetGeometry';
import {GUARDIAN_JEWELS,GUARDIAN_SOURCE,GUARDIAN_RIGID_DETAILS,fitGuardianSeat} from '../assets/scripts/ui/GuardianDetails';
import {guardianWealthCoin,emptyGuardianCoinPose} from '../assets/scripts/ui/GuardianProsperity';
import {readFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
const cues:readonly (GuardianCue|undefined)[]=[undefined,'touch','spin','ordinary','big','super'];
assert.deepEqual([0,1,2,3,4].map(guardianAwardCue),['ordinary','big','super','super','super'],'Guardian and full-screen award tiers must agree');
let poses=0,plantedChecks=0,triangles=0;const signatures:number[]=[];
for(const context of ['lobby','cabinet'] as const)for(const cfg of GAME_CONFIGS){
 const g=CABINETS[cfg.id].guardian,rig=new GuardianRig(cfg.id,g.width,g.height,false,context),bounds=guardianMotionBounds(g);let signature=0;
 rig.apply(guardianPose(cfg.id,0,undefined,0,true,undefined,context));
 assert.deepEqual(rig.vertices,rig.rest,'Rest pose must reproduce the exact original bitmap');
 for(const cue of cues)for(let sample=0;sample<=240;sample++){
  const time=sample/240*GUARDIAN_CHOREOGRAPHY[context][rig.theme].seconds,ct=cue?sample/240*GUARDIAN_CUE_SECONDS[cue]:0;
  rig.apply(guardianPose(cfg.id,time,cue,ct,false,undefined,context));poses++;
  for(let i=0;i<rig.vertices.length;i+=2){
   const u=rig.vertices[i],v=rig.vertices[i+1],ru=rig.rest[i],rv=rig.rest[i+1];
   assert(Number.isFinite(u)&&Number.isFinite(v));
   assert(Math.abs(u-ru)<=GUARDIAN_SWEEP.x&&Math.abs(v-rv)<=GUARDIAN_SWEEP.y,`${cfg.id}: joint escapes normalized sweep`);
   const x=g.centre+(u-.5)*g.width,y=g.bottom-g.height+v*g.height;
   assert(x>=bounds[0]&&x<=bounds[0]+bounds[2]&&y>=bounds[1]&&y<=bounds[1]+bounds[3],`${cfg.id}: animated point outside responsive bounds`);
   if(guardianPlanted(cfg.id,ru,rv)){assert.equal(u,ru,`${cfg.id}: planted foot moved sideways`);assert.equal(v,rv,`${cfg.id}: pedestal floated`);plantedChecks++;}
   signature+=Math.abs(u-ru)+Math.abs(v-rv);
  }
  // Every triangle retains orientation. A negative signed area would fold
  // or mirror a piece of the commissioned image, even over alpha pixels.
  const area=(a:number,b:number,c:number)=>{
   const p=rig.vertices;return (p[b*2]-p[a*2])*(p[c*2+1]-p[a*2+1])-(p[b*2+1]-p[a*2+1])*(p[c*2]-p[a*2]);
  };
  for(let row=0;row<NY;row++)for(let col=0;col<NX;col++){
   const a=row*(NX+1)+col,b=a+1,c=a+NX+1,d=c+1;
   assert(area(a,b,c)>1e-6&&area(b,d,c)>1e-6,`${cfg.id} ${cue} @${sample}: skin triangle inverted`);triangles+=2;
  }
 }
 signatures.push(signature);
 assert(rig.trigger('touch'));assert(!rig.trigger('touch'),'Touch must be throttled');assert(rig.trigger('spin'));assert(!rig.trigger('touch'),'Tap cannot interrupt a spin cue');
 assert(rig.trigger('super'));assert(!rig.trigger('ordinary'),'Ordinary cannot overwrite a super-win flourish');
 for(let i=0;i<220;i++)rig.advance(1/60);assert.equal(rig.cue,undefined,'Cue returns to idle');
 assert(rig.trigger('touch'));assert(!rig.trigger('touch'));
 const before=rig.time;rig.advance(NaN);assert.equal(rig.time,before);rig.advance(100);assert(rig.time-before<=.051,'Resume cannot teleport the statue');
 const reduced=new GuardianRig(cfg.id,g.width,g.height,true,context);reduced.trigger('super');for(let i=0;i<20;i++)reduced.advance(.016);assert.deepEqual(reduced.vertices,reduced.rest,'Reduced motion must remain planted at rest');
}
assert.equal(new Set(signatures.map(s=>Math.round(s))).size,8,'All eight character/scene clips must have distinct mesh motion signatures');
console.log(`PASS ${poses} guardian poses, ${plantedChecks} planted-point checks, ${triangles} non-inverting triangles; cue priority, tap cooldown, pause and reduced motion.`);

let samples=0;
for(const cfg of GAME_CONFIGS){
 const g=CABINETS[cfg.id].guardian,rig=new GuardianRig(cfg.id,g.width,g.height),out=emptyGuardianPose(cfg.id),angles=out.angles,scales=out.scales,point={x:0,y:0};
 for(let frame=0;frame<240;frame++){
  assert.equal(guardianPose(cfg.id,frame/60,'touch',frame/60,false,out),out,'reuse caller-owned pose');
  assert.equal(out.angles,angles);assert.equal(out.scales,scales);
 }
 // Exact corners plus all mesh vertices, including bottom/right edge: no NaN at u/v=1.
 for(let row=0;row<=NY;row++)for(let col=0;col<=NX;col++){
  const i=(row*(NX+1)+col)*2;assert.equal(rig.sample(col/NX,row/NY,point),point);
  assert(Math.abs(point.x-rig.rest[i])<1e-7&&Math.abs(point.y-rig.rest[i+1])<1e-7);samples++;
 }
 rig.advance(.05);assert(rig.trigger('touch'));for(let i=0;i<24;i++)rig.advance(1/60);
 const before=rig.vertices.slice();assert(rig.trigger('super'));
 assert.deepEqual(rig.vertices,before,'cue preemption does not move any pixel until the next frame');
 assert(!rig.trigger('super'),'repeated settlements cannot restart the same flourish');
 rig.advance(1/240);
 let largest=0;for(let i=0;i<before.length;i++)largest=Math.max(largest,Math.abs(before[i]-rig.vertices[i]));
 assert(largest<.001,'high-priority reaction blends in instead of snapping the wing');
 for(const jewel of GUARDIAN_JEWELS[rig.theme]){
  assert(jewel.u>0&&jewel.u<1&&jewel.v>0&&jewel.v<.75);assert(jewel.diameter>=.04&&jewel.diameter<=.10);
  rig.sample(jewel.u,jewel.v,point);assert(Number.isFinite(point.x)&&Number.isFinite(point.y));
 }
}
const sprite=readFileSync('assets/scripts/ui/GuardianSprite.ts','utf8');
const response=sprite.slice(sprite.indexOf('private jewelResponse('),sprite.indexOf('public onDestroy()'));
assert(!response.includes('.light(')&&!response.includes('.destroy('),'touch/awards reuse reflection nodes');
assert(sprite.includes('this.rig.sample('),'accessory highlights follow the actual skinned bitmap');
assert(sprite.includes('Tween.stopAllByTarget(item.alpha)'),'destroyed characters cannot retain reflection tweens');
console.log(`PASS guardian detail polish: ${samples} edge-safe mesh samples, reusable poses, cue crossfade, no repeated-cue reset, measured/pooled jewel reflections and cleanup.`);

// Inspect authored time structure, not just total movement or playback speed.
function prominentPeaks(track:readonly (readonly [number,number])[]|undefined):number{
 if(!track)return 0;
 const max=Math.max(...track.map(k=>Math.abs(k[1])));let peaks=0,rising=false,previous=0;
 for(const [,v] of track){const a=Math.abs(v);if(a>previous+.01)rising=true;
  if(a<previous-.01&&rising){if(previous>=max*.45)peaks++;rising=false;}previous=a;}
 return peaks;
}
const hall=GUARDIAN_CHOREOGRAPHY.lobby,cab=GUARDIAN_CHOREOGRAPHY.cabinet;
assert.deepEqual([prominentPeaks(hall[0].tracks[1]),prominentPeaks(cab[0].tracks[1])],[3,2],'lion: welcome wave versus two coin beckons');
assert.deepEqual([prominentPeaks(hall[1].tracks[4]),prominentPeaks(cab[1].tracks[4])],[2,1],'elephant: two trunk salutes versus held offering');
assert(hall[2].tracks[4]!.every(k=>k[1]>=0)&&cab[2].tracks[4]!.some(k=>k[1]<0),'peacock: held fan versus reversing sweep');
assert.deepEqual([prominentPeaks(hall[3].tracks[1]),prominentPeaks(cab[3].tracks[1])],[3,2],'parrot: three-beat hello versus two wing flicks');
assert(hall[3].tracks[0]!.find(k=>k[1]!==0)![1]<0&&cab[3].tracks[0]!.find(k=>k[1]!==0)![1]>0,'parrot: curious head dip versus watching the reels');
let timingChecks=0;
for(const context of ['lobby','cabinet'] as const)for(const [theme,cfg] of GAME_CONFIGS.entries()){
 const clip=GUARDIAN_CHOREOGRAPHY[context][theme],out=emptyGuardianPose(cfg.id);
 assert(clip.seconds-clip.actionEnd>=2.5,'Every invitation has a genuine resting interval');
 for(const track of clip.tracks){if(!track)continue;assert.equal(track[0][1],0);assert.equal(track.at(-1)![1],0);
  for(let i=1;i<track.length;i++)assert(track[i][0]>track[i-1][0],'Keys strictly increase');}
 for(const t of [0,clip.actionEnd+.2,clip.seconds-.01,clip.seconds+.01]){
  const pose=guardianPose(cfg.id,t,undefined,0,false,out,context);
  assert(pose.angles.every(a=>Math.abs(a*180/Math.PI)<.6),'Invitations rest instead of endlessly swaying');timingChecks++;
 }
 const before=guardianPose(cfg.id,clip.seconds-.0001,undefined,0,false,emptyGuardianPose(cfg.id),context);
 const after=guardianPose(cfg.id,clip.seconds+.0001,undefined,0,false,emptyGuardianPose(cfg.id),context);
 for(let j=0;j<before.angles.length;j++)assert(Math.abs(before.angles[j]-after.angles[j])<.00001,'Loop has no seam snap');
 // Entire 20 second runtime, arbitrary cue interruptions and smooth returns.
 const g=CABINETS[cfg.id].guardian,rig=new GuardianRig(cfg.id,g.width,g.height,false,context);
 for(let frame=0;frame<1200;frame++){
  if(frame===57)rig.trigger('touch');if(frame===101)rig.trigger('spin');if(frame===135)rig.trigger('big');if(frame===190)rig.trigger('super');
  const old=rig.vertices.slice();rig.advance(1/60);let delta=0;
  for(let i=0;i<old.length;i++)delta=Math.max(delta,Math.abs(old[i]-rig.vertices[i]));
  assert(delta<.008,`${context} ${cfg.id} frame ${frame} cue ${rig.cue}: bitmap joint step ${delta}`);timingChecks++;
 }
}
const app=readFileSync('assets/scripts/ui/AureliaApp.ts','utf8');
assert(app.includes("390,490,this.reduced,this.audio,'lobby')"));
assert(app.includes("width,height,this.reduced,this.audio,'cabinet')"));
assert(sprite.includes('new GuardianRig(id,width,height,reduced,context)'),'Actual renderer receives scene-specific clips');
console.log(`PASS ${timingChecks} authored choreography checks: eight scene-specific clips, distinct wave counts/holds/reversals, resting intervals, runtime cue continuity, and actual lobby/cabinet routing.`);

// Wealth-god invitation uses an independent wrist/feather-tip, not a scaled whole bitmap.
for(const context of ['lobby','cabinet'] as const)for(const clip of GUARDIAN_CHOREOGRAPHY[context]){
 assert(clip.tracks.length===7&&clip.tracks[6]!.some(k=>k[1]>=4),'A visibly authored inward palm or feather curl is present');
}
assert(sprite.includes("art.image(this.node,'award-coin-detail'"),'Use the existing high-quality 3D minted coin image, never drawn dots');
assert(sprite.includes('guardianWealthCoin(')&&sprite.includes('this.rig.cueTime'),'Actual renderer follows the invitation timeline');
console.log('PASS prosperity: eight inward palm/feather tracks; measured high-quality coin art, pooled runtime invitation and no new audio.');

let wealthSamples=0;
for(const context of ['lobby','cabinet'] as const)for(const cfg of GAME_CONFIGS){
 const clip=GUARDIAN_CHOREOGRAPHY[context][GAME_CONFIGS.indexOf(cfg)],coin=emptyGuardianCoinPose();let seen=0;
 const g=CABINETS[cfg.id].guardian,rig=new GuardianRig(cfg.id,g.width,g.height,false,context),point={x:0,y:0};
 for(let frame=0;frame<=1200;frame++){
  const t=frame/60;rig.advance(1/60);
  for(let index=0;index<2;index++){
   assert.equal(guardianWealthCoin(cfg.id,context,t,index,undefined,0,false,coin),coin,'Coin output is reused, not allocated each frame');
   assert(coin.opacity>=0&&coin.opacity<=185);wealthSamples++;
   if(coin.opacity){seen++;assert(coin.u>=.10&&coin.u<=.90&&coin.v>=.35&&coin.v<=.60,'Coin arc stays below the face inside the character footprint');
    rig.sample(coin.u,coin.v,point);const radius=.075*.5*coin.scale;
    assert(point.x-radius>0&&point.x+radius<1&&point.y-radius>0&&point.y+radius<1,'The complete minted coin is inside the original guardian seat');}
  }
 }
 assert(seen>0,'Each character and scene visibly draws wealth inward');
 // No effect past the resting interval, on reduced motion, or while a result is being shown.
 for(const t of [clip.actionEnd+1,clip.seconds-.01])for(let i=0;i<2;i++)assert.equal(guardianWealthCoin(cfg.id,context,t,i,undefined,0,false,coin).opacity,0);
 for(const cue of ['spin','ordinary','big','super'] as const)assert.equal(guardianWealthCoin(cfg.id,context,1.5,0,cue,.5,false,coin).opacity,0);
 for(let frame=0;frame<=132;frame++)for(let index=0;index<2;index++){
  const t=frame/60;guardianWealthCoin(cfg.id,context,1,index,'touch',t,false,coin);assert(coin.opacity>=0&&coin.opacity<=185);wealthSamples++;
 }
 assert.equal(guardianWealthCoin(cfg.id,context,2,0,undefined,0,true,coin).opacity,0);
 assert.equal(guardianWealthCoin(cfg.id,context,NaN,0,undefined,0,false,coin).opacity,0);
 assert.equal(guardianWealthCoin(cfg.id,context,2,0,'touch',NaN,false,coin).opacity,0);
 assert.equal(guardianWealthCoin(cfg.id,context,2,0,undefined,0,false,coin,clip.seconds).opacity,0,'Cue handoff never resumes a half-finished old coin flight');
}
console.log(`PASS ${wealthSamples} prosperity coin samples: below-face arcs, complete coin seat bounds, reuse, rest, cue suppression, reduced motion and safe handoff.`);

// Preserve the exact generated anatomy in every presentation context.
let proportionChecks=0,rigidChecks=0;
for(const cfg of GAME_CONFIGS){
 const bytes=readFileSync(`assets/resources/art/guardian-${cfg.id}.png`);
 assert.deepEqual(GUARDIAN_SOURCE[cfg.id],[bytes.readUInt32BE(16),bytes.readUInt32BE(20)],'Declared ratio matches the actual PNG, not an estimated portrait ratio');
 const g=CABINETS[cfg.id].guardian;
 for(const [seatWidth,seatHeight] of [[390,490],[210,284],[g.width,g.height]]){
  const fit=fitGuardianSeat(cfg.id,seatWidth,seatHeight),[sw,sh]=GUARDIAN_SOURCE[cfg.id];
  assert(Math.abs(fit.width/fit.height-sw/sh)<1e-12,'No anisotropic stretch of face, hands, clothes or treasure');
  assert(fit.width<=seatWidth+1e-8&&fit.height<=seatHeight+1e-8,'Contained inside its authored seat');
  assert(Math.abs(fit.offsetY-fit.height/2+seatHeight/2)<1e-9,'Foot/ledge contact is identical');
  proportionChecks++;
  for(const context of ['lobby','cabinet'] as const){
   const rig=new GuardianRig(cfg.id,fit.width,fit.height,false,context);
   for(const cue of cues){
    const pose=guardianPose(cfg.id,1.4,cue,cue?GUARDIAN_CUE_SECONDS[cue]*.43:0,false,undefined,context);rig.apply(pose);
    for(const detail of GUARDIAN_RIGID_DETAILS[rig.theme]){
     const [l,t,r,b]=detail.area,inside:number[]=[];
     for(let row=0;row<=NY;row++)for(let col=0;col<=NX;col++){
      const u=col/NX,v=row/NY;
      if(u>=l+detail.soft&&u<=r-detail.soft&&v>=t+detail.soft&&v<=b-detail.soft)inside.push((row*(NX+1)+col)*2);
     }
     assert(inside.length>=4,'Rigid core contains actual mesh samples');
     const a=inside[0];
     for(const z of inside.slice(1)){
      const rest=Math.hypot((rig.rest[z]-rig.rest[a])*fit.width,(rig.rest[z+1]-rig.rest[a+1])*fit.height);
      const posed=Math.hypot((rig.vertices[z]-rig.vertices[a])*fit.width,(rig.vertices[z+1]-rig.vertices[a+1])*fit.height);
      assert(Math.abs(posed-rest*pose.scales[detail.joint])<.00015,`${cfg.id}: eye/beak or treasure detail bent under ${cue}`);rigidChecks++;
     }
    }
   }
  }
 }
 const meta=JSON.parse(readFileSync(`assets/resources/art/guardian-${cfg.id}.png.meta`,'utf8'));
 assert(meta.userData.fixAlphaTransparencyArtifacts);
 assert.equal(meta.subMetas['6c48a'].userData.wrapModeS,'clamp-to-edge');
 assert.equal(meta.subMetas['6c48a'].userData.wrapModeT,'clamp-to-edge');
}
assert(sprite.includes('fitGuardianSeat(id,width,height)')&&sprite.includes('position.y+fit.offsetY'),'Renderer applies the measured proportions with the same foot baseline');
console.log(`PASS character refinement: ${proportionChecks} original-ratio/foot-anchored seats, ${rigidChecks} rigid facial/held-treasure checks, bounded anatomy and alpha-safe clamped textures.`);
