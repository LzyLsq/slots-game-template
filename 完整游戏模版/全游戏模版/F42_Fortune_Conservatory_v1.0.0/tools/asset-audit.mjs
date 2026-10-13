import {readFile,stat,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ASSETS,GAMES} from '../src/config.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const art=JSON.parse(await readFile(path.join(root,'assets/art/manifest.json'),'utf8'));
const audio=JSON.parse(await readFile(path.join(root,'assets/audio/manifest.json'),'utf8'));
const geometry=JSON.parse(await readFile(path.join(root,'assets/art/geometry.json'),'utf8'));
assert.equal(GAMES.length,4);assert.equal(Object.keys(audio).length,36);
const files=[...ASSETS,'assets/art/app-icon.png','assets/art/geometry.json','assets/art/manifest.json','assets/audio/manifest.json',...Object.keys(audio).map(n=>`assets/audio/${n}.m4a`)];
const records=[];
for(const file of files){
 const bytes=await readFile(path.join(root,file));assert.ok(bytes.length>0,file);
 records.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
for(const game of GAMES){
 assert.ok(art[game.art]&&art[game.mascot]&&art['nameplate-'+game.mascot]);
 const geo=geometry[game.art];assert.ok(geo&&geo.ratio>0&&geo.ratio<1);
 const rig=geo.guardian;assert.equal(rig.patch.length,4);assert.ok(rig.patch.every(Number.isFinite));
 const [x,y,w,h]=rig.patch;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=geo.width&&y+h<=geo.height);
 for(const joint of [rig.pivot,rig.wrist])assert.ok(joint.length===2&&joint[0]>=x&&joint[0]<=x+w&&joint[1]>=y&&joint[1]<=y+h);
 for(const layer of ['base','limb']){const asset=art[game.mascot+'-guardian-'+layer];assert.equal(asset.width,w);assert.equal(asset.height,h);}
}
for(const [name,entry] of Object.entries(art)){
 assert.ok(entry.width>0&&entry.height>0,name);
 assert.ok((await stat(path.join(root,'art-source',entry.source))).isFile(),'missing selected source: '+entry.source);
 for(const source of [entry.protectedSource,entry.continuationRepair?.source].filter(Boolean))assert.ok((await stat(path.join(root,'art-source',source))).isFile(),'missing protected/repair source: '+source);
}
for(const [name,entry] of Object.entries(audio)){
 assert.ok(entry.seconds>0&&entry.peak<.98&&entry.rms>0,name);
 assert.equal((await stat(path.join(root,'assets/audio',name+'.m4a'))).size,entry.bytes);
}
const referenced=new Set(files.map(n=>n.replace('assets/','')));
const extras=[];for(const dir of ['art','audio'])for(const file of await readdir(path.join(root,'assets',dir))){if(!referenced.has(dir+'/'+file))extras.push(dir+'/'+file);}
assert.equal(extras.length,0,'unreferenced runtime assets: '+extras.join(', '));
const result={date:new Date().toISOString(),modes:GAMES.length,art:ASSETS.length,audio:Object.keys(audio).length,totalBytes:records.reduce((n,f)=>n+f.bytes,0),files:records,extras};
await writeFile(path.join(root,'docs/asset-audit.json'),JSON.stringify(result,null,2));
console.log(`Assets OK: ${ASSETS.length} art images, ${Object.keys(audio).length} audio tracks, ${Math.round(result.totalBytes/1024)} KiB.`);
