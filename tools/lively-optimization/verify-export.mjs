/** Read-only verification of source/assets; native build output goes to a temporary directory. */
import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync,statSync,mkdtempSync,writeFileSync,createWriteStream} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {profiles} from './profiles.mjs';

const original=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..');
const root=resolve(process.argv[2]||original),base=join(root,'完整游戏模版/全游戏模版');
const localBase=join(original,'完整游戏模版/全游戏模版');
const out=mkdtempSync(join(tmpdir(),'lively-export-verify.')),checks=[],native=[];
console.log('Verification logs: '+out);
function files(dir){if(!existsSync(dir))return[];return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);}
function project(p,folder=base){const name=readdirSync(folder).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`));assert(name,`Missing F${p.id}`);return join(folder,name);}
function same(a,b){assert(existsSync(b),'Missing delivery file: '+b);assert(readFileSync(a).equals(readFileSync(b)),'Delivery differs from release: '+b);}
function entryReferences(web,id){
  const index=readFileSync(join(web,'index.html'),'utf8');
  for(const m of index.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
    if(/^(https?:|data:|#)/.test(m[1]))continue;
    const path=m[1].split(/[?#]/)[0].replace(/^\/+/, '');
    assert(existsSync(resolve(web,path)),`Missing entry reference F${id}: ${m[1]}`);
  }
}
function manifest(dir){const m=JSON.parse(readFileSync(join(dir,'music-manifest.json'),'utf8'));assert.equal(m.tracks.length,7);for(const t of m.tracks){const b=readFileSync(join(dir,t.file));assert.equal(b.length,t.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),t.sha256);}return m.tracks.reduce((n,t)=>n+t.bytes,0);}
for(const p of profiles){
  const src=project(p),localSource=project(p,localBase);let imports=0,audioBytes=null;
  if(p.id!==26){
    // A release built from one source set must not be published with another.
    // Compare scripts individually, including files untracked by the old local HEAD.
    for(const f of files(join(localSource,'assets/scripts')).filter(f=>/\.ts(?:\.meta)?$/.test(f)))same(f,join(src,f.slice(localSource.length+1)));
    const scenes=files(join(src,'assets/scenes')).filter(f=>f.endsWith('.scene'));assert(scenes.length>0);
    for(const f of scenes){assert(JSON.parse(readFileSync(f+'.meta','utf8')).uuid);JSON.parse(readFileSync(f,'utf8'));}
    for(const f of files(join(src,'assets/scripts')).filter(f=>f.endsWith('.ts'))){
      const text=readFileSync(f,'utf8');
      for(const m of text.matchAll(/\b(?:from|import)\s*['"](\.[^'"]+)['"]/g)){
        const target=resolve(dirname(f),m[1]);assert([target,target+'.ts',target+'.js',target+'.json',join(target,'index.ts')].some(existsSync),`Unresolved import in ${f}: ${m[1]}`);imports++;
      }
    }
    const theme=join(src,'assets/scripts/vfx/ThemeFestivity.ts');assert(existsSync(theme));assert(JSON.parse(readFileSync(theme+'.meta','utf8')).uuid);
    if(p.id!==27){
      for(const sub of ['assets/scripts/vfx/ThemeMotion.ts','assets/scripts/vfx/ThemeMotionRegions.ts','assets/resources/effects/theme-motion.effect']){
        const f=join(src,sub);same(join(localSource,sub),f);assert(JSON.parse(readFileSync(f+'.meta','utf8')).uuid);
      }
    }
    if([25,28].includes(p.id))for(const f of files(join(localSource,'assets/resources/audio')).filter(f=>f.endsWith('.wav')))same(f,join(src,f.slice(localSource.length+1)));
    if(![25,28].includes(p.id))audioBytes=manifest(join(src,'build-templates/web-mobile/audio'));
    if(p.id===29){
      const app=readFileSync(join(src,'assets/scripts/ui/AureliaApp.ts'),'utf8'),preload=app.slice(app.indexOf('await this.art.load('),app.indexOf('const resumed='));
      for(const n of ['f29-hall-courtyard-v1','f29-login-courtyard-v1','f29-cabinet-jade-v1']){assert(preload.includes(n));assert(existsSync(join(src,'assets/resources/art',n+'.png')));}
    }
  }else{
    audioBytes=manifest(join(src,'audio'));
    for(const f of files(join(localSource,'src')))same(f,join(src,f.slice(localSource.length+1)));
    for(const f of files(join(localSource,'audio')))same(f,join(src,f.slice(localSource.length+1)));
    for(const f of files(join(src,'src')))same(f,join(src,'ios/FortuneTides/Web/src',f.slice(join(src,'src').length+1)));
    for(const f of files(join(src,'audio')))same(f,join(src,'ios/FortuneTides/Web/audio',f.slice(join(src,'audio').length+1)));
    for(const f of files(join(src,'public/art')))same(f,join(src,'ios/FortuneTides/Web/art',f.slice(join(src,'public/art').length+1)));
    same(join(src,'index.html'),join(src,'ios/FortuneTides/Web/index.html'));
    entryReferences(join(src,'ios/FortuneTides/Web'),p.id);
  }
  checks.push({id:p.id,sourceImports:imports,audioBytes,passed:true});console.log(`F${p.id} source/assets PASS`);
}
const delivery=join(root,'Xcode_H5/F13-F21_20260914');
for(const id of [13,14,15,17,18,19,21]){
  const p=profiles.find(p=>p.id===id),name=readdirSync(delivery).find(n=>n.startsWith(`F${id}_`)),pkg=join(delivery,name),web=join(pkg,`F${id}_H5`);
  const local=join(project(p,localBase),'build/web-mobile');let count=0;
  for(const f of files(local)){const sub=f.slice(local.length+1);if(sub.startsWith('ios-wrapper/')||sub.includes('.DS_Store'))continue;same(f,join(web,sub));count++;}
  entryReferences(web,id);
  console.log(`F${id} complete release sync PASS (${count} files)`);
  const proj=join(pkg,'DBGame',readdirSync(join(pkg,'DBGame')).find(n=>n.endsWith('.xcodeproj'))),scheme=readdirSync(join(proj,'xcshareddata/xcschemes')).find(n=>n.endsWith('-Release.xcscheme')).replace('.xcscheme','');
  native.push({id,project:proj,scheme});
}
native.push({id:26,project:join(project(profiles.find(p=>p.id===26)),'ios/FortuneTides.xcodeproj'),scheme:'FortuneTides'});
function build(p){return new Promise(resolve=>{
  const log=createWriteStream(join(out,`F${p.id}-xcode.log`)),c=spawn('xcodebuild',['-project',p.project,'-scheme',p.scheme,'-configuration','Debug','-sdk','iphonesimulator','-destination','generic/platform=iOS Simulator','-derivedDataPath',join(out,`F${p.id}-DerivedData`),'CODE_SIGNING_ALLOWED=NO','build'],{cwd:root,stdio:['ignore','pipe','pipe']});
  let tail='';for(const s of[c.stdout,c.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-3000);});
  c.on('error',e=>{log.end(String(e));resolve({id:p.id,passed:false,error:String(e)});});
  c.on('close',code=>{log.end();console.log(`F${p.id} exported Xcode ${code===0?'PASS':'FAIL'}`);resolve({id:p.id,passed:code===0,code,...(code?{tail}:{})});});
});}
const nativeResults=[];
for(let i=0;i<native.length;i+=2)nativeResults.push(...await Promise.all(native.slice(i,i+2).map(build)));
writeFileSync(join(out,'results.json'),JSON.stringify({sourceChecks:checks,nativeBuilds:nativeResults},null,2)+'\n');
console.log('Results: '+join(out,'results.json'));
if(nativeResults.some(r=>!r.passed))process.exitCode=1;
