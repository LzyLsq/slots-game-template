import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REWARD_THEMES,rewardTheme,rewardPlateLayout} from '../assets/scripts/ui/RewardTheme';

assert.equal(REWARD_THEMES.length,4);
assert.equal(new Set(REWARD_THEMES.map(p=>p.atlas)).size,4);
assert.equal(new Set(REWARD_THEMES.map(p=>p.motif)).size,4);
for(const p of REWARD_THEMES){
  assert(p.ornaments.every(i=>Number.isInteger(i)&&i>=0&&i<16));
  for(const c of [p.accent,p.deep,p.pale,p.ink])assert(/^#[0-9a-f]{6}$/i.test(c));
  assert(readFileSync(new URL('../assets/resources/art/'+p.atlas+'.png',import.meta.url)).length>0);
}
for(const [width,height] of [[1040,240],[940,100],[871,189],[730,118],[980,160],[320,160]]){
  const layout=rewardPlateLayout(width,height);
  assert(layout.textWidth>100&&layout.textWidth<width);
  assert(layout.ornamentSize/2<=height/2-8,'Decoration remains within the panel');
  assert(layout.ornamentX+layout.ornamentSize/2<=width/2-8);
  assert(layout.textWidth/2+8<layout.ornamentX-layout.ornamentSize/2,'No text/ornament overlap');
}
assert.equal(rewardTheme(Number.NaN),REWARD_THEMES[0]);
assert.equal(rewardTheme(-1),REWARD_THEMES[0]);
assert.equal(rewardTheme(99),REWARD_THEMES[3]);
assert.equal(rewardTheme(1.5),REWARD_THEMES[1]);
const stage=readFileSync(new URL('../assets/scripts/vfx/SalonWinStage.ts',import.meta.url),'utf8');
assert.equal((stage.match(/art\.rewardPanel\(/g)??[]).length,3);
assert(stage.includes('art.rewardButton('));
assert(!stage.includes('art.panel('),'The grand presentation must not use generic plates');
assert(stage.includes('event.propagationStopped=true'),'Collect must not also dismiss the stage');
assert(stage.includes('this.countDuration=[3.3,4.2,4.7,5.1][this.tier]'));
assert(stage.includes('this.holdUntil=this.countDuration+2.2'));
const small=readFileSync(new URL('../assets/scripts/vfx/OrdinaryWinStage.ts',import.meta.url),'utf8');
assert(small.includes('placement.theme??0')&&small.includes('art.rewardPanel('));
assert(small.includes('if(t>=1.85)'));
const app=readFileSync(new URL('../assets/scripts/ui/AureliaApp.ts',import.meta.url),'utf8');
assert(app.includes('width:980,theme:GAME_CONFIGS.indexOf(this.config)'));
assert(app.includes("if(this.debug&&this.page==='game'&&query.get('awardPreview'))"));
const preview=app.slice(app.indexOf('private previewAwardStyle('),app.indexOf('private refreshBalance():'));
assert(!/economy|generator|purchase|presentWin/.test(preview),'Style preview cannot settle or purchase');
console.log('PASS four distinct themes, six panel layouts, real source atlases, stage timings, collect isolation, local-only non-settling preview.');
