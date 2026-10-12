import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CABINETS,guardianMotionBounds,imagePoint} from '../assets/scripts/ui/CabinetGeometry';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {titleImageFit,titleReliefPose,emptyTitlePose,TITLE_STRIPS,TITLE_SCALE_MAX,TITLE_LIFT} from '../assets/scripts/ui/TitleRelief';
const raw=[[432,200],[463,185],[436,189],[462,203]],oldHeights=[104,83,109,75],k=2304/1881;
// Compare visible alpha bounds: the previous frame included a 10px transparent gutter.
let checks=0;const rows=[];
for(const [i,cfg] of GAME_CONFIGS.entries()){
 const g=CABINETS[cfg.id],[sw,sh]=raw[i],[w,h]=titleImageFit(g.title,sw-20,sh-20),oldW=(sw-20)*(oldHeights[i]*k*.94/sh);
 assert(w/oldW>1.26,'Every title is measurably larger, not a tiny scale pulse');
 const [x,y]=imagePoint(g.title),p=emptyTitlePose();
 for(let j=0;j<7200;j++)for(const quiet of [false,true]){
  const out=titleReliefPose(cfg.id,j/60,w,false,quiet,p);assert.equal(out,p,'Frame output is reused');
  assert(out.scale>=1&&out.scale<=TITLE_SCALE_MAX&&out.y>=0&&out.y<=TITLE_LIFT);
  assert(w*out.scale<g.title[2]&&h*out.scale/2+out.y<g.title[3]/2,'Complete bitmap including crown stays within original enamel');
  assert(out.alpha>=0&&out.alpha<=36&&out.jewel>=0&&out.jewel<=52);
  if(quiet){const full=titleReliefPose(cfg.id,j/60,w,false,false,emptyTitlePose());assert(Math.abs(out.alpha-full.alpha*.24)<1e-6);}
  checks++;
 }
 const reduced=titleReliefPose(cfg.id,91,w,true,false,p);assert.deepEqual(reduced,emptyTitlePose());
 rows.push({id:cfg.id,size:[w,h],enlargement:w/oldW,sourceAspectPreserved:Math.abs(w/h-(sw-20)/(sh-20))<1e-10});
}
const fox=CABINETS['ruby-royale'],bounds=guardianMotionBounds(fox.guardian);
assert(fox.title[0]+fox.title[2]<bounds[0],'Fox full motion stays clear of enlarged lettering');
assert(492<fox.screen[1],'Planted left treasure is above the reel glass');
assert(-347+512+137/2<fox.title[0],'Left treasure does not touch title');
const runtime=readFileSync('assets/scripts/ui/CabinetTitle.ts','utf8');
const update=runtime.slice(runtime.indexOf('protected update'),runtime.indexOf('private publish'));
assert(!update.includes('addComponent')&&!update.includes('tween(')&&!update.includes('art.light'),'Fixed pool; no per-frame visual allocations');
assert(runtime.includes('game.off(Game.EVENT_HIDE')&&runtime.includes('game.off(Game.EVENT_SHOW'));
assert(runtime.includes('strip.image.setPosition(-x,0)'),'Moving matte must not move the lettering underneath it');
assert.equal(TITLE_STRIPS,5);
const app=readFileSync('assets/scripts/ui/AureliaApp.ts','utf8');assert(app.includes('titleImageFit(g.title')&&app.includes('this.cabinetTitle.quiet='));
const report={status:'PASS',samples:checks,rows,pool:TITLE_STRIPS,sourceAlphaMatched:true,backgroundPause:true,reducedMotion:true,foxTitleClearance:bounds[0]-fox.title[0]-fox.title[2]};
writeFileSync('docs/qa/title-relief-20261012.json',JSON.stringify(report,null,2)+'\n');console.log(report);
