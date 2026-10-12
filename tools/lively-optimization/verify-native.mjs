import {cpSync,existsSync,readdirSync,mkdtempSync,writeFileSync,readFileSync,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {profiles} from './profiles.mjs';

const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..');
const base=join(root,'完整游戏模版/全游戏模版');
const delivery=join(root,'Xcode_H5/F13-F21_20260914');
const out=mkdtempSync(join(tmpdir(),'lively-native.'));
const ids=process.argv.slice(2).filter(x=>!x.startsWith('--'));
const results=[];
console.log('Native logs: '+out);
function run(command,args,cwd,file){return new Promise(resolve=>{
  const log=createWriteStream(file),c=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe']});
  let tail='';for(const s of [c.stdout,c.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-8000);});
  c.on('error',e=>{log.end(String(e));resolve({code:-1,tail:String(e)});});
  c.on('close',code=>{log.end();resolve({code,tail});});
});}
function sameResources(source,target){
  let files=0,webp=0;const mismatches=[];
  function walk(from,to){for(const e of readdirSync(from,{withFileTypes:true})){
    if(['ios-wrapper','.DS_Store'].includes(e.name))continue;
    const a=join(from,e.name),b=join(to,e.name);
    if(e.isDirectory()){walk(a,b);continue;}
    files++;if(e.name.endsWith('.webp'))webp++;
    const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
    if(!existsSync(b)||sha(a)!==sha(b))mismatches.push(b);
  }}walk(source,target);return {files,webp,match:mismatches.length===0,mismatches};
}
const nativeProfiles=[...profiles,{id:20,slug:'Golden_Canopy'}].sort((a,b)=>a.id-b.id);
for(const p of nativeProfiles.filter(p=>[13,14,15,17,18,19,20,21,26].includes(p.id)&&(!ids.length||ids.includes(String(p.id))))){
  const source=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)));
  const packages=p.id===26?[null]:readdirSync(delivery).filter(n=>n.startsWith(`F${p.id}_`)).map(n=>join(delivery,n));
  if(p.id===20)packages.push(join(root,'Xcode_H5/F20_Golden_Canopy_OC_StoreKit2_Xcode'));
  if(!packages.length)throw new Error(`No existing native shell for F${p.id}`);
  for(const [packageIndex,packageRoot] of packages.entries()){
  const suffix=packageIndex?`-${packageIndex+1}`:'';
  let project,scheme,server=true,resources;
  if(p.id===26){
    const built=await run(process.execPath,['tools/build.mjs','--sync-ios'],source,join(out,'F26-web.log'));
    if(built.code!==0)throw new Error(built.tail);
    project=join(source,'ios/FortuneTides.xcodeproj');scheme='FortuneTides';
    resources=sameResources(join(source,'dist'),join(source,'ios/FortuneTides/Web'));
  }else{
    const web=join(packageRoot,`F${p.id}_H5`),built=join(source,'build/web-mobile');
    if(!existsSync(join(built,'index.html')))throw new Error('Missing release: '+built);
    // Copy only the complete build output. Never overwrite native bridges,
    // signing settings or app icons; never delete unrelated local files.
    for(const name of readdirSync(built)){
      if(['ios-wrapper','.DS_Store'].includes(name))continue;
      cpSync(join(built,name),join(web,name),{recursive:true});
    }
    resources=sameResources(built,web);
    const app=join(web,'ios-wrapper/App'),binary=join(out,`F${p.id}-server`);
    const compiled=await run('xcrun',['clang','-fobjc-arc','-fblocks','-framework','Foundation','-I',app,
      join(app,'H5LocalServer.m'),join(base,'F20_Golden_Canopy_v1.0.0/tools/local-audio-server-test.m'),'-o',binary],root,join(out,`F${p.id}-server-compile.log`));
    const tested=compiled.code===0?await run(binary,[web],root,join(out,`F${p.id}-server-test.log`)):compiled;
    server=tested.code===0;
    if(!server)console.log(tested.tail);
    project=join(packageRoot,'DBGame',readdirSync(join(packageRoot,'DBGame')).find(n=>n.endsWith('.xcodeproj')));
    scheme=readdirSync(join(project,'xcshareddata/xcschemes')).find(n=>n.endsWith('-Release.xcscheme')).replace('.xcscheme','');
  }
  console.log(`F${p.id}: native build`);
  const build=await run('xcodebuild',['-project',project,'-scheme',scheme,'-configuration','Debug','-sdk','iphonesimulator',
    '-destination','generic/platform=iOS Simulator','-derivedDataPath',join(out,`F${p.id}${suffix}-DerivedData`),
    'CODE_SIGNING_ALLOWED=NO','build'],root,join(out,`F${p.id}${suffix}-xcode.log`));
  results.push({id:p.id,serverTest: p.id===26?null:server,simulatorBuild:build.code===0,resources,project,derivedData:join(out,`F${p.id}${suffix}-DerivedData`)});
  writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.at(-1)));if(build.code!==0)console.log(build.tail);
  }
}
console.log('Results: '+join(out,'results.json'));
if(results.some(r=>r.serverTest===false||!r.simulatorBuild||!r.resources.match))process.exitCode=1;
