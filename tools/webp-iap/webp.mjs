import {readdirSync,readFileSync,writeFileSync,existsSync,unlinkSync,statSync} from 'node:fs';
import {join,basename,relative,extname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE||'/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
export function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
// Cocos ImageAsset formats: PNG=0, JPEG=1, WebP=4. Only mutate the
// metadata belonging to an image whose replacement file actually exists.
function formats(value){if(!value||typeof value!=='object')return 0;let n=0;if(['0','1','4_0','4_1','4'].includes(value.fmt)){value.fmt='4';n++;}for(const item of Object.values(value))n+=formats(item);return n;}
// Cocos MD5 builds give import JSON and native images DIFFERENT hashes.
// Match the UUID, not the full native basename (uuid.nativeHash).
function imageMetadata(image){
 const bundle=image.slice(0,image.indexOf('/native/')),stem=basename(image,extname(image));
 const uuid=stem.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0]||stem;
 const folder=join(bundle,'import',uuid.slice(0,2)),direct=join(folder,stem+'.json');
 if(existsSync(direct))return direct;
 if(!existsSync(folder))return null;
 const matches=readdirSync(folder).filter(n=>n===uuid+'.json'||n.startsWith(uuid+'.')&&n.endsWith('.json'));
 if(matches.length>1)throw Error('Ambiguous image metadata '+image);
 return matches.length?join(folder,matches[0]):null;
}
export async function compressWeb(dir,staticGame=false){
 const files=walk(dir).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/'));let before=files.reduce((s,f)=>s+statSync(f).size,0),originalBytes=0,encodedBytes=0;const converted=[];
 for(const image of files.filter(f=>/\.(png|jpe?g)$/i.test(f))){
  const rel=relative(dir,image);let metadata,data;
  if(image.includes('/native/')){metadata=imageMetadata(image);if(!metadata)continue;data=JSON.parse(readFileSync(metadata));if(!formats(data))continue;}
  const original=readFileSync(image),encoded=await sharp(original).webp({quality:85,alphaQuality:100,effort:5}).toBuffer();
  const a=await sharp(original).metadata(),b=await sharp(encoded).metadata();if(a.width!==b.width||a.height!==b.height)throw Error('WebP dimensions changed: '+rel);
  if(a.hasAlpha){const pa=await sharp(original).ensureAlpha().raw().toBuffer(),pb=await sharp(encoded).ensureAlpha().raw().toBuffer();for(let i=3;i<pa.length;i+=4)if(pa[i]!==pb[i])throw Error('WebP alpha changed '+rel);}
  writeFileSync(image.replace(/\.(png|jpe?g)$/i,'.webp'),encoded);if(metadata)writeFileSync(metadata,JSON.stringify(data));
  // Only this verified replacement in our generated delivery is removed; source art stays intact.
  unlinkSync(image);originalBytes+=original.length;encodedBytes+=encoded.length;converted.push(rel);
 }
 // Existing WebP+PNG fallback builds can contain native WebP already. Require the
 // actual file before changing the import record to WebP-only.
 for(const webp of walk(dir).filter(f=>f.includes('/native/')&&f.endsWith('.webp'))){
  const meta=imageMetadata(webp);if(meta){const data=JSON.parse(readFileSync(meta));formats(data);writeFileSync(meta,JSON.stringify(data));}
 }
 // Update concrete converted paths, never the engine's generic extension map.
 if(staticGame&&walk(dir).some(f=>!f.includes('/ios-wrapper/')&&/\.(png|jpe?g)$/i.test(f)))throw Error('Static WebP build contains an unconverted image');
 for(const file of files.filter(f=>/\.(html|css|m?js|json|webmanifest)$/.test(f))){let text=readFileSync(file,'utf8');for(const rel of converted)text=text.replaceAll(rel,rel.replace(/\.(png|jpe?g)$/i,'.webp'));
  // Pure HTML/JS titles construct art URLs with template expressions. Concrete
  // path replacement cannot see symbol-${id}.png or a symbol-crop regexp.
  // This opt-in is never applied to Cocos' generic image extension registry.
  if(staticGame)text=text.replace(/\.(png|jpe?g)\b/gi,'.webp');
  if(file.endsWith('.webmanifest')){
   const manifest=JSON.parse(text);
   for(const icon of manifest.icons||[])if(/\.webp(?:[?#]|$)/i.test(icon.src||''))icon.type='image/webp';
   text=JSON.stringify(manifest,null,2);
  }
  writeFileSync(file,text);
 }
 const after=walk(dir).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/')).reduce((s,f)=>s+statSync(f).size,0);
 return {format:'PNG/JPEG to WebP quality 85, exact alpha, original dimensions; no duplicate image fallback',count:converted.length,before,after,savedBytes:before-after,originalBytes,encodedBytes};
}
