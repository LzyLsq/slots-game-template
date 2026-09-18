import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import { CABINETS, cabinetLayout, imagePoint, type Box } from '../assets/scripts/ui/CabinetGeometry';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';

// Read the current ctl() hit expansion rather than asserting inherited F23 sizes.
const app=readFileSync(fileURLToPath(new URL('../assets/scripts/ui/AureliaApp.ts',import.meta.url)),'utf8');
const dimensions=app.match(/const hit=box\(this\.plane!,label,pos\[0\],pos\[1\],Math\.max\((\d+),rect\[2\]\),Math\.max\((\d+),rect\[3\]\)\)/);
assert(dimensions,'Update test adapter: cabinet ctl() hitbox implementation changed.');
const minHitW=Number(dimensions[1]),minHitH=Number(dimensions[2]);
const controls=['minus','plus','spin','auto'] as const;
const keys=['title','balance','screen','win','spin','minus','plus','auto','bet','topWin','status'] as const;
const expanded=(r:Box):Box=>{const w=Math.max(minHitW,r[2]),h=Math.max(minHitH,r[3]);return[r[0]+(r[2]-w)/2,r[1]+(r[3]-h)/2,w,h];};
const overlap=(a:Box,b:Box):boolean=>Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])>.01&&Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1])>.01;
const failures=new Set<string>();let checked=0;
for(const cfg of GAME_CONFIGS){
 const g=CABINETS[cfg.id];
 for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
  const a=controls[i],b=controls[j];if(overlap(g[a],g[b]))failures.add(`${cfg.id}: visible ${a}/${b} faces overlap`);
  if(overlap(expanded(g[a]),expanded(g[b])))failures.add(`${cfg.id}: ${a}/${b} touch targets overlap`);
 }
 for(const name of controls)if(overlap(expanded(g[name]),g.bet))failures.add(`${cfg.id}: ${name} touch target covers BET display`);
 for(const [width,height,safeTop,safeBottom] of [[320,568,0,0],[360,640,0,0],[375,667,0,0],[390,844,47,34],[414,896,44,34],[430,932,59,34],[412,915,0,0],[768,1024,24,20],[820,1180,24,20],[1280,720,0,0],[1440,900,0,0],[1920,1080,0,0]]){
  const factor=Math.min(width/1080,height/1920),w=width/factor,h=height/factor,top=safeTop/factor,bottom=safeBottom/factor;
  const layout=cabinetLayout(w,h,g,top,bottom);
  if(width<=430&&layout.scale<(w/1024)*1.24)failures.add(`${cfg.id} ${width}×${height}: cabinet enlargement regressed below 24%`);
  for(const key of keys){const rect=g[key],[x,y]=imagePoint(rect),r=controls.includes(key as any)?expanded(rect):rect;
   const boxWidth=r[2]*layout.scale,boxHeight=r[3]*layout.scale;
   if(x*layout.scale-boxWidth/2<-w/2-.1||x*layout.scale+boxWidth/2>w/2+.1)failures.add(`${cfg.id} ${width}×${height}: ${key} horizontal clipping`);
   if(y*layout.scale+layout.y+boxHeight/2>h/2-top-169+.1)failures.add(`${cfg.id} ${width}×${height}: ${key} overlaps toolbar`);
   if(y*layout.scale+layout.y-boxHeight/2<-h/2+bottom+157-.1)failures.add(`${cfg.id} ${width}×${height}: ${key} overlaps footer`);
   if(controls.includes(key as any)){
    const touch=Math.min(boxWidth,boxHeight)*factor;
    if(touch<44-.1)failures.add(`${cfg.id} ${width}×${height}: ${key} touch target ${touch.toFixed(1)}px <44px`);
   }
  }
  checked++;
 }
}
assert.equal(failures.size,0,`F24 layout failures (${checked} cabinet/viewport combinations):\n${[...failures].join('\n')}`);
console.log(`PASS ${checked} cabinet/viewport combinations: current geometry, nonoverlapping faces/hit areas, 44px controls and safe insets.`);
