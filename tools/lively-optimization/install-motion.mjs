import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {profiles} from './profiles.mjs';
import {motionRegions} from './motion-regions.mjs';
const here=fileURLToPath(new URL('.',import.meta.url)),root=resolve(here,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const ids=process.argv.slice(2).map(Number),files=new Map();
const uuid=p=>{const h=createHash('sha256').update(relative(root,p)).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
for(const p of profiles.filter(p=>motionRegions[p.id]&&(!ids.length||ids.includes(p.id)))){
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)));
 const art=join(project,p.id===25?'assets/scripts/TheatreUI.ts':p.id===28?'assets/scripts/RegattaApp.ts':'assets/scripts/ui/SalonArt.ts');let source=readFileSync(art,'utf8');
 if(!source.includes("import { ThemeMotion }")){
  if(p.id===25){
   source="import { ThemeMotion } from './vfx/ThemeMotion';\n"+source;
   const load=' async load(names:';if(!source.includes(load))throw Error('Unknown theatre load');
   source=source.replace(/( async load\(names:[^{]+\{)/,'$1await ThemeMotion.prepare();');
   source=source.replace('s.spriteFrame=sf;if(name===','s.spriteFrame=sf;ThemeMotion.attach(s,name);if(name===');
  }else if(p.id===28){
   source="import { ThemeMotion } from './vfx/ThemeMotion';\n"+source;
   source=source.replace('      configureControlLustre(await','      await ThemeMotion.prepare();\n      configureControlLustre(await');
   source=source.replace("    return image(parent, f, 0, 0, w, h, 'Continuous scene');","    const n = image(parent, f, 0, 0, w, h, 'Continuous scene');\n    ThemeMotion.attach(n.getComponent(Sprite)!,key);\n    return n;");
  }else{
  source="import { ThemeMotion } from '../vfx/ThemeMotion';\n"+source;
  const load='    let done = 0;';if(source.split(load).length!==2)throw Error('Unknown load anchor '+art);
  source=source.replace(load,'    await ThemeMotion.prepare();\n'+load);
  const image='    n.getComponent(UITransform)!.setContentSize(w, h);';if(source.split(image).length!==2)throw Error('Unknown image anchor '+art);
  source=source.replace(image,image+'\n    ThemeMotion.attach(s,name,index);');
  }
  if(!source.includes('await ThemeMotion.prepare();')||!source.includes('ThemeMotion.attach('))throw Error('Motion integration incomplete '+art);
 }
 if(p.id===25){
  if(!source.includes('ThemeMotion.attachCompatible(')){
   const anchor="mat.setProperty('cabinet',new Vec4(geo.ry,geo.rh,geo.cy,mode));sprite.customMaterial=mat;";
   if(source.split(anchor).length!==2)throw Error('Unknown cabinet material owner');
   source=source.replace(anchor,anchor+"ThemeMotion.attachCompatible(sprite,mat,'cabinetMotion'+mode,mode);");
  }
  const effectFile=join(project,'assets/resources/effects/velvet-cabinet.effect');let effect=readFileSync(effectFile,'utf8');
  if(!effect.includes('uniform PaintedMotion')){
   const template=readFileSync(join(here,'theme-motion.effect'),'utf8');
   const properties=template.slice(template.indexOf('        frameUV:'),template.indexOf('}%'));
   const motion=template.slice(template.indexOf('  uniform PaintedMotion'),template.indexOf('  vec4 frag ()'));
   effect=effect.replace('        response: { value: [0.0, 0.0, 0.0, 0.0] }','        response: { value: [0.0, 0.0, 0.0, 0.0] }\n'+properties.trimEnd());
   effect=effect.replace('  vec4 frag () {',motion+'\n  vec4 frag () {');
   const anchor='      vec2 sampleUV = uv0;';
   if(effect.split(anchor).length!==2)throw Error('Unknown cabinet sampling anchor');
   effect=effect.replace(anchor,'      vec2 local=(uv0-frameUV.xy)/frameUV.zw;\n      vec2 moved=local+drift(local,region0,pose0)+drift(local,region1,pose1)+drift(local,region2,pose2)+drift(local,region3,pose3);\n      vec2 sampleUV=frameUV.xy+clamp(moved,vec2(0.0001),vec2(0.9999))*frameUV.zw;');
   effect=effect.replace('the character, screen and controls stay anchored.','character motion is localized above the anchored screen and controls.');
  }
  files.set(effectFile,effect);
 }
 files.set(art,source);
 for(const [name,content,importer,ver] of [
  ['assets/scripts/vfx/ThemeMotion.ts',readFileSync(join(here,'ThemeMotion.ts'),'utf8'),'typescript','4.0.24'],
  ['assets/scripts/vfx/ThemeMotionRegions.ts','export const MOTION_REGIONS: Record<string, readonly (readonly number[])[]> = '+JSON.stringify(motionRegions[p.id],null,2)+';\n','typescript','4.0.24'],
  ['assets/resources/effects/theme-motion.effect',readFileSync(join(here,'theme-motion.effect'),'utf8'),'effect','1.7.1'],
 ]){const file=join(project,name);files.set(file,content);if(!existsSync(file+'.meta'))files.set(file+'.meta',JSON.stringify({ver,importer,imported:true,uuid:uuid(file),files:importer==='effect'?['.json']:[],subMetas:{},userData:{}},null,2)+'\n');}
 console.log('F'+p.id+': explicit artwork motion regions');
}
let patch='*** Begin Patch\n';let count=0;
for(const [file,content] of files){const old=existsSync(file)?readFileSync(file,'utf8'):null;if(old===content)continue;count++;patch+=(old===null?`*** Add File: ${file}\n`:`*** Update File: ${file}\n@@\n`);if(old!==null)patch+=old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n';patch+=content.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';}
patch+='*** End Patch\n';if(count)execFileSync('apply_patch',[],{input:patch,cwd:root,maxBuffer:8*1024*1024});
console.log('Applied '+count+' files; no gameplay/account/payment edits.');
