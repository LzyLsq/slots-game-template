import {cpSync,existsSync,readdirSync,mkdtempSync,writeFileSync,createWriteStream} from 'node:fs';
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
for(const p of profiles.filter(p=>[13,14,15,17,18,19,21,26].includes(p.id)&&(!ids.length||ids.includes(String(p.id))))){
  const source=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)));
  let project,scheme,server=true;
  if(p.id===26){
    const built=await run(process.execPath,['tools/build.mjs','--sync-ios'],source,join(out,'F26-web.log'));
    if(built.code!==0)throw new Error(built.tail);
    project=join(source,'ios/FortuneTides.xcodeproj');scheme='FortuneTides';
  }else{
    const packageRoot=join(delivery,readdirSync(delivery).find(n=>n.startsWith(`F${p.id}_`)));
    const web=join(packageRoot,`F${p.id}_H5`),built=join(source,'build/web-mobile');
    if(!existsSync(join(built,'index.html')))throw new Error('Missing release: '+built);
    // Copy only the complete build output. Never overwrite native bridges,
    // signing settings or app icons; never delete unrelated local files.
    for(const name of readdirSync(built)){
      if(['ios-wrapper','.DS_Store'].includes(name))continue;
      cpSync(join(built,name),join(web,name),{recursive:true});
    }
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
    '-destination','generic/platform=iOS Simulator','-derivedDataPath',join(out,`F${p.id}-DerivedData`),
    'CODE_SIGNING_ALLOWED=NO','build'],root,join(out,`F${p.id}-xcode.log`));
  results.push({id:p.id,serverTest: p.id===26?null:server,simulatorBuild:build.code===0,project,derivedData:join(out,`F${p.id}-DerivedData`)});
  writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.at(-1)));if(build.code!==0)console.log(build.tail);
}
console.log('Results: '+join(out,'results.json'));
if(results.some(r=>r.serverTest===false||!r.simulatorBuild))process.exitCode=1;
