import {readFileSync,existsSync,readdirSync,copyFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {profiles} from './profiles.mjs';
import {bonesFor,fullBodyBones} from './mascot-bones.mjs';
const root=resolve('完整游戏模版/全游戏模版');
function withImport(source,line){
  // TypeScript's existing file directive must stay ahead of imports.
  return source.startsWith('// @ts-nocheck\n')
    ? source.replace('// @ts-nocheck\n','// @ts-nocheck\n'+line+'\n')
    : line+'\n'+source;
}
function save(file,text){const old=existsSync(file)?readFileSync(file,'utf8'):null;if(old===text)return;
  let patch='*** Begin Patch\n'+(old===null?'*** Add File: ':'*** Update File: ')+file+'\n';
  if(old!==null)patch+='@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n';
  patch+=text.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';execFileSync('apply_patch',[],{input:patch,maxBuffer:8e6});}
function meta(file,importer='typescript',sample){if(existsSync(file+'.meta'))return;let data;
  if(sample){const source=JSON.parse(readFileSync(sample,'utf8'));data=JSON.parse(JSON.stringify(source).replaceAll(source.uuid,randomUUID()));for(const s of Object.values(data.subMetas))if('displayName'in s)s.displayName=file.split('/').pop().replace(/\.png$/,'');}
  else data={ver:'4.0.24',importer,imported:true,uuid:randomUUID(),files:[],subMetas:{},userData:{}};
  save(file+'.meta',JSON.stringify(data,null,2)+'\n');}
// Existing F20 and F29 destination artwork is byte-identical. Reuse the already
// registered F29 clean plate and alpha head crops; do not cut a new character.
const project=join(root,readdirSync(root).find(n=>n.startsWith('F20_'))),other=join(root,readdirSync(root).find(n=>n.startsWith('F29_')));
const art=join(project,'assets/resources/art'),vfx=join(project,'assets/scripts/vfx');
if(!readFileSync(join(art,'canopy-destinations.png')).equals(readFileSync(join(other,'assets/resources/art/canopy-destinations.png'))))throw Error('F20/F29 art no longer identical; refuse mismatched plate');
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE||'/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const target=join(art,'canopy-destinations-live-bg.png'),atlas=join(art,'living-mascot-parts.png');
if(!existsSync(target))copyFileSync(join(other,'assets/resources/art/canopy-destinations-live-bg.png'),target);
if(!existsSync(atlas))await sharp(join(other,'assets/resources/art/living-mascot-parts.png')).extract({left:0,top:0,width:512,height:1024}).png().toFile(atlas);
meta(target,'image',join(art,'canopy-destinations.png.meta'));meta(atlas,'image',join(art,'salon-squirrel.png.meta'));
const data=JSON.parse(readFileSync(join(other,'output/imagegen/live-heads/prepared.json'),'utf8')).slice(0,4).map((s,i)=>({...s,bones:bonesFor(20,i)}));
save(join(vfx,'LivingMascotData.ts'),`import type { MascotBone } from './ArticulatedMascot';\nexport interface LivingMascotSpec { bones: readonly MascotBone[]; art: string; index: number; canvas: number[]; rect: number[]; pivot: number[]; frames: number[][]; phase: number; angle: number; period: number; eyeState: 'open' | 'closed'; blinkEnabled: boolean; blinkSafe: boolean; blinkIoU: number; }\nexport const LIVING_MASCOTS: readonly LivingMascotSpec[] = ${JSON.stringify(data,null,2)};\n`);
save(join(vfx,'FullBodyMascotData.ts'),`import type { MascotBone } from './ArticulatedMascot';\nexport const FULL_BODY_BONES: Record<string, readonly MascotBone[]> = ${JSON.stringify(fullBodyBones,null,2)};\n`);
for(const name of ['LivingMascotRig','ArticulatedMascot','FullBodyMascotRig','ThemeMotion'])save(join(vfx,name+'.ts'),readFileSync('tools/lively-optimization/'+name+'.ts','utf8'));
save(join(vfx,'ThemeMotionRegions.ts'),'export const MOTION_REGIONS: Record<string, readonly (readonly number[])[]> = {};\n');
for(const name of ['LivingMascotData','LivingMascotRig','ArticulatedMascot','FullBodyMascotRig','FullBodyMascotData','ThemeMotion','ThemeMotionRegions'])meta(join(vfx,name+'.ts'));
const uiFile=join(project,'assets/scripts/ui/SalonArt.ts');let ui=readFileSync(uiFile,'utf8');
if(!ui.includes("import { LivingMascotRig }"))ui="import { LivingMascotRig } from '../vfx/LivingMascotRig';\nimport { FullBodyMascotRig } from '../vfx/FullBodyMascotRig';\nimport { ArticulatedMascot } from '../vfx/ArticulatedMascot';\n"+ui;
if(!ui.includes('await LivingMascotRig.prepare(names)'))ui=ui.replace('    let done = 0;','    await LivingMascotRig.prepare(names);\n    let done = 0;');
ui=ui.replace('resources.load(`art/${name}/texture`','resources.load(`art/${LivingMascotRig.file(name)}/texture`');
ui=ui.replace('const s = n.addComponent(Sprite);','const s = FullBodyMascotRig.supports(name) ? n.addComponent(ArticulatedMascot) : n.addComponent(Sprite);');
if(!ui.includes('FullBodyMascotRig.supports(name)) n.addComponent'))ui=ui.replace('    n.getComponent(UITransform)!.setContentSize(w, h);','    n.getComponent(UITransform)!.setContentSize(w, h);\n    if (FullBodyMascotRig.supports(name)) n.addComponent(FullBodyMascotRig).setup(s as ArticulatedMascot,name);\n    else LivingMascotRig.attach(s,name,index);');
save(uiFile,ui);
const appFile=join(project,'assets/scripts/ui/AureliaApp.ts');let app=readFileSync(appFile,'utf8');
// Remove only the three previously identified photo/squash loops, preserving
// cover geometry, source crop coordinates, input, scene transitions and glints.
app=app.replace(/      \/\/ The mascot and pedestal share one image\.[\s\S]*?(?=      const islandFoot)/,'      // The clean plate is fixed; its transparent mascot has independent joints.\n');
app=app.replace(/      if\(!this\.reduced\)tween\(islandFoot\)[\s\S]*?\.union\(\)\.repeatForever\(\)\.start\(\);\n/,'');
app=app.replace(/    if\(this\.reduced\)return;\n    tween\(pivot\)[\s\S]*?\.union\(\)\.repeatForever\(\)\.start\(\);\n/,'');
app=app.replace(/    \/\/ Keep the feet fixed\. Small, slow asymmetric rocking[\s\S]*?(?=    \/\/ Ambient light)/,'    // Skinning acts on the alpha mascot only; the foot pivot and cabinet stay fixed.\n');
save(appFile,app);
// Suppress parent idle tweens on integrated paintings and portrait frames in
// every project, including legacy pages with no clean character layer yet.
for(const p of [...profiles,{id:20,slug:'Golden_Canopy'}]){
  if(p.id===26)continue;
  const dir=join(root,readdirSync(root).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`))),folder=join(dir,'assets/scripts/vfx');
  save(join(folder,'StationaryArtwork.ts'),readFileSync('tools/lively-optimization/StationaryArtwork.ts','utf8'));
  meta(join(folder,'StationaryArtwork.ts'));
  const artFile=join(dir,'assets/scripts/ui/SalonArt.ts');
  if(existsSync(artFile)){
    let s=readFileSync(artFile,'utf8');
    if(!s.includes('import { StationaryArtwork }'))s=withImport(s,"import { StationaryArtwork } from '../vfx/StationaryArtwork';");
    if(!s.includes('StationaryArtwork.mark(n,name)'))s=s.replace('const n = box(parent, name, x, y, w, h);','const n = box(parent, name, x, y, w, h); StationaryArtwork.mark(n,name);');
    save(artFile,s);
  }
  for(const file of [join(dir,'assets/scripts/ui/AureliaApp.ts'),join(dir,'assets/scripts/TheatreUI.ts')]){
    if(!existsSync(file))continue;let s=readFileSync(file,'utf8');
    const signature=/(?:private (?:idleAccent|breathe)\(n:Node[^\n]+?\):void\{|export function float\(n:Node[^\n]+?\)\{)/g;
    if(!signature.test(s))continue;
    if(!s.includes('import { StationaryArtwork }'))s=withImport(s,`import { StationaryArtwork } from '${file.endsWith('TheatreUI.ts')?'./vfx/StationaryArtwork':'../vfx/StationaryArtwork'}';`);
    s=s.replace(signature,(sig,offset)=>s.slice(offset+sig.length).startsWith('if(StationaryArtwork.contains(n))return;')?sig:sig+'if(StationaryArtwork.contains(n))return;');save(file,s);
  }
  const sovereign=join(dir,'assets/scripts/SovereignApp.ts');
  if(existsSync(sovereign)){
    let s=readFileSync(sovereign,'utf8');
    if(!s.includes('import { StationaryArtwork }'))s=withImport(s,"import { StationaryArtwork } from './vfx/StationaryArtwork';");
    s=s.replace('const n=box(parent,name,x,y,w,h),s=n.addComponent(Sprite);', 'const n=box(parent,name,x,y,w,h);StationaryArtwork.mark(n,key);const s=n.addComponent(Sprite);');
    s=s.replace(/private (?:idle|breathe)\(node:Node[^\n]+?\):void\{/g,(sig,offset)=>s.slice(offset+sig.length).startsWith('if(StationaryArtwork.contains(node))return;')?sig:sig+'if(StationaryArtwork.contains(node))return;');
    s=s.replace('this.idle(arrival,this.selected*.4,8,1.008,2.8);','StationaryArtwork.mark(arrival,`f27/loading/${mode}`);');
    save(sovereign,s);
  }
  const velvet=join(dir,'assets/scripts/VelvetApp.ts');
  if(existsSync(velvet)){
    let s=readFileSync(velvet,'utf8');
    if(!s.includes('import { StationaryArtwork }'))s=withImport(s,"import { StationaryArtwork } from './vfx/StationaryArtwork';");
    s=s.replace(/breathe\(node:Node[^\n]+?\)\{/g,(sig,offset)=>s.slice(offset+sig.length).startsWith('if(StationaryArtwork.contains(node))return;')?sig:sig+'if(StationaryArtwork.contains(node))return;');
    save(velvet,s);
  }
  const theatre=join(dir,'assets/scripts/TheatreUI.ts');
  if(existsSync(theatre)){
    let s=readFileSync(theatre,'utf8');
    if(!s.includes('import { StationaryArtwork }'))s=withImport(s,"import { StationaryArtwork } from './vfx/StationaryArtwork';");
    if(!s.includes('StationaryArtwork.mark(n,name)'))s=s.replace('const n=group(p,name,x,y,w,h);if(!sf)return n;', 'const n=group(p,name,x,y,w,h);StationaryArtwork.mark(n,name);if(!sf)return n;');
    save(theatre,s);
  }
}
console.log('Installed F20 articulated alpha layers and batch fixed-painting idle policy.');
