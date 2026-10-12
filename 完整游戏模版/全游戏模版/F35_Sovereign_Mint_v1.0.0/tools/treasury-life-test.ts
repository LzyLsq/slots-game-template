import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TreasuryClock,LIFE_MAX_PARTICLES,lifeSeed,lifePose,emptyLifePose,lobbyLifeZones,cabinetLifeZones,type LifeZone} from '../assets/scripts/vfx/TreasuryMotion';
import {CABINETS,responsiveCabinet,imagePoint,type Box} from '../assets/scripts/ui/CabinetGeometry';
import type {GameId} from '../assets/scripts/math/types';
const overlap=(a:Box,b:Box)=>a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3];
const centreRect=(r:Box):Box=>{const [x,y]=imagePoint(r);return [x-r[2]/2,y-r[3]/2,r[2],r[3]];};
let samples=0;const signatures=new Set<string>();
function verify(zones:LifeZone[],keepouts:Box[]=[]){
 assert(zones.reduce((n,z)=>n+z.count,0)<=LIFE_MAX_PARTICLES,'No theme may silently drop its last zones');
 for(const z of zones){
  for(const k of keepouts)assert(!overlap(z.rect,k),z.name+' crosses a readable/control region');
  for(let i=0;i<z.count;i++)for(let t=0;t<220;t++){
   const s=lifeSeed(z,i),p=emptyLifePose(),returned=lifePose(s,t*.17,1,1,p);assert.equal(returned,p,'Reuse pose output');
   assert(Object.values(p).every(Number.isFinite));assert(p.alpha>=0&&p.alpha<=245);assert(p.scaleX>0&&p.scaleY>0);
   // Actual rotated bitmap bounding square; source frame cannot leave its zone.
   const radians=p.angle*Math.PI/180,extent=s.size/2*(Math.abs(Math.cos(radians))+Math.abs(Math.sin(radians)))*Math.max(p.scaleX,p.scaleY);
   assert(p.x-extent>=z.rect[0]-1e-8&&p.x+extent<=z.rect[0]+z.rect[2]+1e-8,z.name+' X crop');
   assert(p.y-extent>=z.rect[1]-1e-8&&p.y+extent<=z.rect[1]+z.rect[3]+1e-8,z.name+' Y crop');samples++;
  }
 }
}
for(const tall of [false,true]){
 const x=tall?330:300,upper=tall?510:440,lower=tall?-250:-240;
 const keepouts:Box[]=[];
 for(let i=0;i<4;i++){const cx=i%2?x:-x,cy=i<2?upper:lower;keepouts.push([cx-220,cy-318,440,201]);}
 verify(lobbyLifeZones(tall),keepouts);
}
for(const id of Object.keys(CABINETS) as GameId[]){
 for(const [w,h] of [[1080,1920],[1080,2340],[1080,2700],[1440,2160]]){
  const g=responsiveCabinet(id,w,h),zones=cabinetLifeZones(g);
  verify(zones,[g.screen,g.title,g.balance,g.bet,g.win,g.spin,g.auto,g.minus,g.plus,g.status].map(centreRect));
  if(w===1080&&h===1920)signatures.add(JSON.stringify(zones.map(z=>[z.path,z.rect,z.tint])));
 }
}
assert.equal(signatures.size,4,'Each cabinet keeps its own thematic motion');
const clock=new TreasuryClock();assert(clock.trigger());assert(!clock.trigger());
let paints=0;for(let i=0;i<600;i++)if(clock.advance(1/60))paints++;
assert(paints>=298&&paints<=301,'Ambient updates target 30Hz, not dozens of parallel tween chains');
const before=clock.time;for(const dt of [NaN,Infinity,-1,0])assert(!clock.advance(dt));assert.equal(clock.time,before);
clock.advance(100);assert(clock.time-before<=.051,'Resume clamps large frame gaps');
const frozen=clock.time;assert(!clock.advance(.1,true));assert(!clock.advance(.1,false,true));assert.equal(clock.time,frozen);assert(clock.trigger());
const runtime=readFileSync('assets/scripts/vfx/TreasuryLife.ts','utf8');
assert(runtime.includes('Array.from(new Set'),'Cocos production iterator compatibility');
assert(!runtime.slice(runtime.indexOf('private paint()'),runtime.indexOf('private proof()')).includes('art.image'),'No render-loop node creation');
assert(runtime.includes('game.off(Game.EVENT_HIDE')&&runtime.includes('game.off(Game.EVENT_SHOW'),'Dispose lifecycle listeners');
console.log(`PASS treasury life: ${samples} bounded bitmap poses, lobby captions and 4 cabinet keepouts, 64-node cap, 30Hz pooled motion, cue cooldown, background/reduced-motion freeze and listener cleanup.`);
