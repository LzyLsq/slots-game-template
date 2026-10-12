import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {GUARDIAN_SOURCE} from '../assets/scripts/ui/GuardianDetails';
import {GuardianRig,GUARDIAN_CHOREOGRAPHY,guardianCueDuration,type GuardianContext,type GuardianCue} from '../assets/scripts/ui/GuardianMotion';
import {emptyGuardianCoinPose,guardianWealthDetail,GUARDIAN_WEALTH_SEATS,type GuardianDetailKind} from '../assets/scripts/ui/GuardianProsperity';
import {CABINETS} from '../assets/scripts/ui/CabinetGeometry';
import {cabinetLifeZones,lobbyLifeZones,lifeSeed,lifePose,emptyLifePose,LIFE_MAX_PARTICLES} from '../assets/scripts/vfx/TreasuryMotion';
let gestureSamples=0,environmentSamples=0;const signatures=[];
for(const cfg of GAME_CONFIGS){
 const theme=CABINETS[cfg.id].titleIndex,[width,height]=GUARDIAN_SOURCE[cfg.id],target=GUARDIAN_WEALTH_SEATS[theme].target;
 for(const context of ['lobby','cabinet'] as GuardianContext[]){
  const cycle=GUARDIAN_CHOREOGRAPHY[context][theme].seconds;
  for(const [kind,index] of [['trail',0],['trail',1],['trail',2],['trail',3],['receive',0]] as [GuardianDetailKind,number][]){
   let visible=0;const out=emptyGuardianCoinPose(),rig=new GuardianRig(cfg.id,width,height,false,context),point={x:0,y:0};
   for(let tick=0;tick<Math.ceil(cycle*120);tick++){
    rig.advance(1/120);const p=guardianWealthDetail(cfg.id,context,tick/120,index,kind,undefined,0,false,out);assert.equal(p,out);
    assert(Object.values(p).every(Number.isFinite));assert(p.opacity>=0&&p.opacity<90);
    if(p.opacity>0){
     visible++;const extent=(kind==='receive'?.16:.062)*p.scale*.7072;
     assert(p.u-extent>=0&&p.u+extent<=1,'Optics never leave original alpha footprint X');
     assert(p.v-extent*width/height>=0&&p.v+extent*width/height<=1,'Optics never leave original alpha footprint Y');
     rig.sample(p.u,p.v,point);assert(point.x-extent>=0&&point.x+extent<=1,'Deformed gesture optics remain inside the cabinet seat X');assert(point.y-extent*width/height>=0&&point.y+extent*width/height<=1,'Deformed gesture optics remain inside the cabinet seat Y');
     if(kind==='receive'){assert.equal(p.u,target[0]);assert.equal(p.v,target[1]);}
    }
    gestureSamples++;
   }
   assert(visible>0,'All characters have a visible, individually timed treasure response');
   for(const cue of ['spin','ordinary','big','super'] as GuardianCue[]){
    guardianWealthDetail(cfg.id,context,cycle/2,index,kind,cue,.3,false,out);assert.equal(out.opacity,0,'No gesture optics over spin/award presentation');
   }
   guardianWealthDetail(cfg.id,context,cycle/2,index,kind,undefined,0,true,out);assert.equal(out.opacity,0);
   const seconds=guardianCueDuration(cfg.id,context,'touch');let touched=0;
   for(let tick=0;tick<seconds*120;tick++){guardianWealthDetail(cfg.id,context,2,index,kind,'touch',tick/120,false,out);touched+=out.opacity;gestureSamples++;}
   assert(touched>0,'Touch reacts without creating a new emitter');
   guardianWealthDetail(cfg.id,context,cycle/2,index,kind,undefined,0,false,out,cycle*2);assert.equal(out.opacity,0,'Old paused releases are not replayed');
  }
  signatures.push([cfg.id,context,cycle]);
 }
}
for(const zones of [lobbyLifeZones(false),...Object.values(CABINETS).map(cabinetLifeZones)]){
 assert(zones.reduce((sum,z)=>sum+z.count,0)<=LIFE_MAX_PARTICLES);
 assert(zones.some(z=>z.path==='offering')&&zones.some(z=>z.path==='glimmer'));
 for(const z of zones.filter(z=>z.path==='offering'||z.path==='glimmer'))for(let index=0;index<z.count;index++){
  const seed=lifeSeed(z,index),out=emptyLifePose(),initial=lifePose(seed,0,0,0,emptyLifePose());let visible=0,invisible=0;
  for(let tick=0;tick<360;tick++){
   lifePose(seed,tick/360*z.period,0,0,out);assert(Object.values(out).every(Number.isFinite));
   if(out.alpha>1)visible++;else invisible++;
   if(z.path==='glimmer'){assert.equal(out.x,initial.x);assert.equal(out.y,initial.y);assert.equal(out.angle,initial.angle);}
   environmentSamples++;
  }
  assert(visible>0&&invisible>0,'Slow local glints and gold arcs include quiet intervals');
  const boundary=z.period*(1-seed.phase),a=lifePose(seed,boundary-1e-7,0,0,emptyLifePose()),b=lifePose(seed,boundary+1e-7,0,0,emptyLifePose());
  assert(a.alpha<.001&&b.alpha<.001,'An offering resets invisibly, never popping across the scene');
 }
}
const sprite=readFileSync('assets/scripts/ui/GuardianSprite.ts','utf8');
const update=sprite.slice(sprite.indexOf('protected update'),sprite.indexOf('private publishMotion'));
assert(!update.includes('art.light')&&!update.includes('art.image')&&!update.includes('tween('),'Rendering reuses the complete pool');
assert(sprite.includes('this.wealthDetails.length=0;'),'Dispose detail pool');
const report={date:'2026-10-12',status:'PASS',scope:'Pure motion and integration regression, not GPU/physical-device certification',gestureSamples,environmentSamples,guardianPool:5,cabinetPool:58,lobbyPool:38,signatures};
if(process.env.WRITE_QA==='1'){mkdirSync('docs/qa',{recursive:true});writeFileSync('docs/qa/treasure-effects-20261012.json',JSON.stringify(report,null,2)+'\n');}
console.log(`PASS treasure effects: ${gestureSamples} gesture and ${environmentSamples} environment samples; five pooled gesture optics, fixed treasure contacts, invisible loop resets, quiet intervals, cue suppression and cleanup.`);
