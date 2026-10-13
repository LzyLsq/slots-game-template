import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAMES} from '../src/config.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const manifest=read('../assets/art/manifest.json'),geometry=read('../assets/art/geometry.json'),rigs=read('../art-source/guardian-rig.json');
for(const game of GAMES)test(game.mascot+' uses one festive shot and matching complete cast/rig',()=>{
 const n=game.mascot,art=manifest[game.art],g=geometry[game.art],rig=rigs[n];
 assert.equal(art.source,n+'-festive-outpaint.png');assert.equal(art.protectedSource,n+'-festive-mobile.png');
 assert.equal(art.continuationRepair.source,art.source);
 assert.deepEqual(art.continuationRepair.appliedRect,[0,0,3072,256]);
 assert.equal(art.continuationRepair.appliedRect[1]+art.continuationRepair.appliedRect[3],art.protectedRect[1]);
 assert.equal(g.measurementSource,art.protectedSource);assert.deepEqual(art.nativePortraitSize,[1024,1536]);assert.deepEqual(art.protectedRect,[0,256,1024,1536]);
 assert.equal(manifest[n].source,'guardians-festive.png');assert.equal(manifest['portrait-'+n].source,'guardians-festive.png');
 assert.equal(manifest[n+'-guardian-limb'].source,art.protectedSource);
 assert.equal(manifest[n+'-guardian-base'].source,n+'-festive-guardian-repair.png');
 assert.deepEqual(g.guardian.pivot,rig.pivot);assert.deepEqual(g.guardian.wrist,rig.wrist);
 const [x,y,w,h]=g.guardian.patch;assert.ok(rig.points.every(([px,py])=>px>=x&&px<=x+w&&py>=y&&py<=y+h));
 for(const [key,v]of [['reel-x',g.screenPixels[0]/g.width],['reel-y',g.screenPixels[1]/g.height],['reel-w',(g.screenPixels[2]-g.screenPixels[0])/g.width],['reel-h',(g.screenPixels[3]-g.screenPixels[1])/g.height]])assert.ok(Math.abs(parseFloat(g.layout[key])/100-v)<1e-7);
});
test('utility control uses an intact round festive rim and a separate press face',()=>{
 const socket=manifest['button-small'],face=manifest['button-small-face'];
 assert.equal(socket.source,'utility-festive.png');assert.equal(face.source,socket.source);
 assert.ok(socket.width/socket.height>.94&&socket.width/socket.height<1.06);
 assert.deepEqual(face.faceMask,socket.socketMask);assert.ok(socket.transparent&&face.transparent);
});
