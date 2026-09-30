import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {profiles} from './profiles.mjs';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..'),base=join(root,'完整游戏模版/全游戏模版');
const ts=createRequire(join(base,'F13_Golden_Harvest_v1.0.0/package.json'))('typescript');
// Reuse the full production lifecycle/concurrency regression, not a second audio implementation.
let test=readFileSync(join(base,'F20_Golden_Canopy_v1.0.0/tools/audio-test.ts'),'utf8').replace(/^import .*;\n/gm,'');
test=test.slice(0,test.indexOf('  const resourceRoot ='))+'\n}\nglobalThis.testDone=main();';
test=ts.transpileModule(test,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const ids=process.argv.slice(2).filter(x=>!x.startsWith('--')),bundle=process.argv.includes('--bundle');
for(const p of profiles.filter(p=>![25,26,28].includes(p.id)&&(!ids.length||ids.includes(String(p.id))))){
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)));
 const sandbox={assert,ts,vm,Buffer,AbortController,console,createHash,process:{argv:bundle?['--bundle']:[]},readFileSync:(file,encoding)=>readFileSync(join(project,file),encoding)};
 const context=vm.createContext(sandbox);vm.runInContext(test,context,{filename:'audio-lifecycle-regression.js'});await context.testDone;
 const resource=join(project,bundle?'build/web-mobile/audio':'build-templates/web-mobile/audio'),manifest=JSON.parse(readFileSync(join(resource,'music-manifest.json'),'utf8'));
 assert.equal(manifest.tracks.length,7);assert.equal(new Set(manifest.tracks.map(t=>t.sha256)).size,7);assert.equal(new Set(manifest.tracks.map(t=>t.scoreSha256)).size,7);
 for(const t of manifest.tracks){const bytes=readFileSync(join(resource,t.file));assert.equal(bytes.length,t.bytes);assert.equal(bytes.toString('ascii',4,8),'ftyp');assert.equal(createHash('sha256').update(bytes).digest('hex'),t.sha256);assert(t.rms>.035&&t.rms<.2&&t.peak<=.8);assert(t.loop?t.duration>=15:t.duration<7);assert(t.programs.length>=3&&t.notes>=8);}
 assert(manifest.tracks.reduce((n,t)=>n+t.bytes,0)<1.1*1024*1024);
 console.log(`F${p.id} PASS ${bundle?'release bundle':'source'} audio lifecycle, mute/skip/background, bounded voices/PCM, duck/restore, 7 verified recordings`);
}
