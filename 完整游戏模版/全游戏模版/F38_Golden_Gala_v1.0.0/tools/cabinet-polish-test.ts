import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {CABINETS,guardianMotionBounds} from '../assets/scripts/ui/CabinetGeometry';
import {autoLatchX,smoothLatch,cabinetPressFeel,controlReflection,controlReflectionSize,emptyControlReflection,type CabinetControl} from '../assets/scripts/ui/CabinetControlMotion';
import {guardianFeedbackKeys,FEEDBACK_SCENES,cabinetFeedbackKey} from '../assets/scripts/audio/FeedbackCatalog';
import {recordingKeys} from '../assets/scripts/audio/SoundtrackCatalog';
let checks=0;const feels=new Set<string>();
for(const cfg of GAME_CONFIGS){
 const g=CABINETS[cfg.id];feels.add(JSON.stringify([0,1,2,3].map(i=>cabinetPressFeel(cfg.id,i as CabinetControl))));
 for(const [index,seat] of [g.spin,g.plus,g.minus,g.auto].entries()){
  const feel=cabinetPressFeel(cfg.id,index as CabinetControl);assert(feel.depth>0&&feel.depth<=6);assert(feel.compression>=.94&&feel.compression<=.99);assert(feel.release<=.18);
  for(let tick=0;tick<600;tick++)for(let side=0;side<2;side++){
   const p=emptyControlReflection(),r=controlReflection(cfg.id,index as CabinetControl,seat[2],seat[3],side,tick/30,tick%3/2,tick%2===0,p);assert.equal(r,p);assert(Object.values(p).every(Number.isFinite));assert(p.alpha>=0&&p.alpha<=190);
   const [w,h]=controlReflectionSize(index as CabinetControl,seat[2],seat[3]),a=p.angle*Math.PI/180;const ex=(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*h)/2,ey=(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*h)/2;
   assert(Math.abs(p.x)+ex<seat[2]/2,'Reflection remains in metal face X');assert(Math.abs(p.y)+ey<seat[3]/2,'Reflection remains in metal face Y');checks++;
  }
 }
 const [x,,w]=guardianMotionBounds(g.guardian);assert(x>=0&&x+w<=1024,'Full animal sweep remains in authored cabinet');
 for(const enabled of [false,true]){
  let state=enabled?0:1;for(let tick=0;tick<240;tick++){const next=smoothLatch(state,enabled?1:0,1/60);assert(enabled?next>=state:next<=state);state=next;const x=autoLatchX(cfg.id,g.auto[2],state),diameter=Math.min(g.auto[2]*.28,g.auto[3]*.50);assert(Math.abs(x)+diameter/2<g.auto[2]*.38);}
  assert(Math.abs(state-(enabled?1:0))<1e-5);
 }
 const theme=FEEDBACK_SCENES.indexOf(cfg.id);assert.equal(guardianFeedbackKeys(theme,cfg.id)[0],cabinetFeedbackKey(cfg.id,'collect'));
 for(const scene of ['lobby',cfg.id])for(const key of guardianFeedbackKeys(theme,scene))assert(recordingKeys(scene).includes(key),'Touch never requests an unwarmed recording');
}
assert.equal(feels.size,4);
const runtime=readFileSync('assets/scripts/ui/CabinetConsole.ts','utf8'),app=readFileSync('assets/scripts/ui/AureliaApp.ts','utf8'),sound=readFileSync('assets/scripts/audio/SoundscapeEngine.ts','utf8');
assert(!runtime.slice(runtime.indexOf('protected update'),runtime.indexOf('protected onDestroy')).includes('art.light'),'No node creation in console update');
assert(runtime.includes('game.off(Game.EVENT_HIDE')&&runtime.includes('game.off(Game.EVENT_SHOW'));
assert(app.includes('onContact:()=>this.cabinetConsole?.contact(index)')&&app.includes('this.cabinetConsole.auto=this.auto'));
assert(!app.includes('g.spin[2]*1.65'),'No giant console bloom');
assert(sound.includes('guardianFeedbackKeys(theme,this.scene)')&&sound.includes("group:'guardian',attack:.012"));
const report={status:'PASS',reflections:checks,themes:4,rolesPerTheme:4,latch:'monotonic, contained, settled',recordings:'scene-warmed, native-rate, single guardian lane',integration:'pooled optics, cleanup, immediate contact, fixed text and touch seats'};
writeFileSync('docs/qa/cabinet-polish-20261012.json',JSON.stringify(report,null,2));console.log(report);
