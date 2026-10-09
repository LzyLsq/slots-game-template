import assert from 'node:assert/strict';
import fs from 'node:fs';
import {guardianGridIndices,appendGuardianIndices} from '../assets/scripts/ui/GuardianIndices';
import {GUARDIAN_GRID_X,GUARDIAN_GRID_Y} from '../assets/scripts/ui/GuardianMotion';
const local=guardianGridIndices(GUARDIAN_GRID_X,GUARDIAN_GRID_Y),mapped=new Uint16Array(local.length);
assert.equal(local.length,9504);assert(Math.max(...local)<1665);
// Same capacity policy as Cocos 3.8 StaticVBAccessor.appendIndices, with
// multiple dense meshes plus shared sprite indices in each completed frame.
let buffer=new Uint16Array(16384),offset=0,peak=0;
const accessor={appendIndices(_id:number,indices:Uint16Array){const needed=offset+indices.length;if(buffer.length<needed){const grown=new Uint16Array(Math.floor(1.25*needed));grown.set(buffer);buffer=grown;}buffer.set(indices,offset);offset+=indices.length;peak=Math.max(peak,offset);}};
let capacity=0;
for(let frame=0;frame<18000;frame++){
 offset=2100;
 for(let mesh=0;mesh<4;mesh++){const start=offset,vertexOffset=mesh*1665;appendGuardianIndices(accessor,{bufferId:0,vertexOffset},local,mapped);assert.equal(offset,start+local.length);assert.equal(buffer[start],vertexOffset);assert.equal(buffer[offset-1],vertexOffset+local[local.length-1]);}
 assert(offset<=buffer.length);if(frame===1)capacity=buffer.length;if(frame>1)assert.equal(buffer.length,capacity,'shared buffer stops growing after warm-up');
 offset=0; // successful upload reaches the engine-owned frame reset
}
const source=fs.readFileSync('assets/scripts/ui/GuardianSprite.ts','utf8');assert(source.includes('appendGuardianIndices(rd.accessor'));assert(!source.includes('mesh.indexOffset+='),'no unsafe direct index writes');
console.log(`PASS guardian renderer: 18000 completed shared-buffer frames, peak ${peak} indices, bounded ${buffer.length} capacity, no upload overrun`);
