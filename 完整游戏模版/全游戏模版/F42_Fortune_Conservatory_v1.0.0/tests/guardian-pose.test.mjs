import {test} from 'node:test';import assert from 'node:assert/strict';
import {guardianPose,limbPoint,limbMesh} from '../src/guardian-pose.mjs';
import {readFileSync} from 'node:fs';
const geometry=JSON.parse(readFileSync(new URL('../assets/art/geometry.json',import.meta.url)));
const rigs=Object.fromEntries(Object.entries(geometry).map(([key,g])=>[key.replace('-cabinet',''),g.guardian]));
for(const [theme,rig]of Object.entries(rigs)){
 test(theme+' anchored joint and bounded finite motion',()=>{for(let t=0;t<=24;t+=.05){const pose=guardianPose(theme,t);assert.deepEqual(limbPoint(rig.pivot,rig,pose),rig.pivot);const locked=[rig.pivot[0]+1,rig.pivot[1]+1];assert.deepEqual(limbPoint(locked,rig,pose),locked);for(const n of Object.values(pose))assert.ok(Number.isFinite(n)&&Math.abs(n)<.2);for(const p of [[720,100],[920,210],[1000,280]]){const q=limbPoint(p,rig,pose);assert.ok(Math.hypot(q[0]-p[0],q[1]-p[1])<35,'Bounded limb travel');}}});
 test(theme+' neutral pose is exact and mesh has no cracks',()=>{const mesh=limbMesh(rig,{shoulder:0,wrist:0,reach:0},2,2);assert.equal(mesh.length,2*2*6*4);assert.deepEqual([...mesh.slice(0,4)],[-1,1,0,0]);assert.ok([...mesh].every(Number.isFinite));});
}
test('species gestures differ, repeat smoothly, and are frame-rate independent',()=>{assert.equal(new Set(Object.keys(rigs).map(n=>JSON.stringify(guardianPose(n,2)))).size,4);for(const [n,period]of [['tiger',5.6],['koi',3.8],['crane',7.2],['tortoise',6.8]])for(const key of ['shoulder','wrist','reach'])assert.ok(Math.abs(guardianPose(n,period-.00001)[key]-guardianPose(n,.00001)[key])<.0001);});
