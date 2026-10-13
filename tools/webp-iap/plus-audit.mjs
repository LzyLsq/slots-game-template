import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,statSync,readdirSync,mkdirSync} from 'node:fs';
import {join,relative,isAbsolute,dirname,basename,extname} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {walk} from './webp.mjs';
import {games,base,output,reports} from './plus-common.mjs';
const require=createRequire(import.meta.url),sharp=require('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=process.argv[2]||output,items=JSON.parse(readFileSync(join(out,'manifest.json'))),results=[];
const loader=join(base,'F34_Aurum_Atelier_v1.0.0/node_modules/tsx/dist/loader.mjs');
assert.deepEqual(items.map(g=>g.id),games.map(g=>g.id));
assert.equal(new Set(items.map(g=>g.bundle)).size,items.length);
assert.equal(new Set(items.map(g=>g.port)).size,items.length);
const productOwners=new Map();
for(const g of items){
 const dir=join(out,g.folder),web=join(dir,`F${g.id}_H5`),app=join(web,'ios-wrapper/App');
 const files=walk(web).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/'));
 const images=files.filter(f=>f.endsWith('.webp'));
 assert.ok(images.length>0,'No WebP F'+g.id);
 assert.equal(files.filter(f=>/\.(png|jpe?g)$/i.test(f)).length,0,'Unconverted image F'+g.id);
 for(const file of images){
  const b=readFileSync(file);assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');
  if(file.includes('/native/')){
   const bundle=file.slice(0,file.indexOf('/native/')),stem=basename(file,extname(file));
   const uuid=stem.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0]||stem;
   const folder=join(bundle,'import',uuid.slice(0,2));
   assert.ok(existsSync(folder),'Import metadata absent '+file);
   const matches=readdirSync(folder).filter(n=>n===uuid+'.json'||n.startsWith(uuid+'.')&&n.endsWith('.json'));
   assert.equal(matches.length,1,'Ambiguous metadata '+file);
   const data=JSON.parse(readFileSync(join(folder,matches[0]))),formats=[];
   const visit=v=>{if(!v||typeof v!=='object')return;if('fmt' in v)formats.push(v.fmt);for(const x of Object.values(v))visit(x);};visit(data);
   assert.ok(formats.includes('4'),'WebP-only Cocos format missing '+file);
   assert.ok(!formats.some(fmt=>['0','1','4_0','4_1'].includes(fmt)),'Stale Cocos image format '+file);
  }
 }
 const icon=await sharp(join(app,'Assets.xcassets/AppIcon.appiconset/AppIcon.png')).metadata();
 assert.equal(icon.width,1024);assert.equal(icon.height,1024);assert.equal(icon.hasAlpha,false);
 const all=[...g.products,...g.legacyProducts],ids=all.map(p=>p.appleProductId);
 assert.equal(new Set(ids).size,ids.length,'Ambiguous product F'+g.id);
 for(const id of ids){assert.ok(!productOwners.has(id),'Cross-game product collision '+id);productOwners.set(id,g.id);}
 const swift=readFileSync(join(app,'StoreKitBackend.swift'),'utf8');
 const allowed=JSON.parse(swift.match(/private let allowed: Set<String> = (\[[^\n]+\])/)[1]);
 const name=g.title.replaceAll(' ',''),kit=JSON.parse(readFileSync(join(app,name+'.storekit')));
 assert.deepEqual([...allowed].sort(),[...ids].sort());
 assert.deepEqual(kit.products.map(p=>p.productID).sort(),[...ids].sort());
 for(const p of all){assert.ok(Number.isSafeInteger(p.credits+p.bonus)&&p.credits+p.bonus>0);assert.equal(kit.products.find(s=>s.productID===p.appleProductId).type,'Consumable');}
 const js=files.filter(f=>/\.m?js$/.test(f)).map(f=>readFileSync(f,'utf8')).join('\n');
 const source=games.find(s=>s.id===g.id).source;
 if(g.id!==42){
  const r=spawnSync(process.execPath,['--import',loader,'-e',"import('./assets/scripts/services/StoreService.ts').then(m=>{const s=m.default||m;console.log(JSON.stringify({products:s.STORE_PRODUCTS,all:s.ALL_STORE_PRODUCTS}))})"],{cwd:source,encoding:'utf8',timeout:30000});
  assert.equal(r.status,0,r.stderr);const exported=JSON.parse(r.stdout.trim().split('\n').at(-1));
  assert.deepEqual(exported.products,g.products);assert.deepEqual(exported.all,all);
  assert.ok(js.includes('LocalCoinStore'),'Compiled device-local IAP missing F'+g.id);
 }else{
  const {STORE_PRODUCTS}=await import(pathToFileURL(join(source,'src/local-iap.mjs')));assert.deepEqual(STORE_PRODUCTS,g.products);
  for(const id of ids)assert.ok(js.includes(id),'Missing web product '+id);
  const pwa=JSON.parse(readFileSync(join(web,'manifest.webmanifest')));
  for(const icon of pwa.icons){assert.equal(icon.type,'image/webp');assert.ok(existsSync(join(web,icon.src)));}
  const server=readFileSync(join(app,'H5LocalServer.m'),'utf8');assert.ok(server.includes('@"mjs": @"text/javascript; charset=utf-8"'),'ESM MIME missing');assert.ok(server.includes('@"webmanifest": @"application/manifest+json; charset=utf-8"'),'Manifest MIME missing');
  const build=JSON.parse(readFileSync(join(web,'build-manifest.json')));
  assert.equal(build.files.length,files.length-1);
  for(const entry of build.files){const bytes=readFileSync(join(web,entry.file));assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);}
 }
 assert.ok(js.includes('local-store-update'),'Purchase update event missing F'+g.id);
 const project=join(dir,'DBGame',name+'H5.xcodeproj');
 assert.equal(isAbsolute(g.project)?g.project:join(out,g.project),project);
 const pbx=readFileSync(join(project,'project.pbxproj'),'utf8');
 assert.ok(pbx.includes('IPHONEOS_DEPLOYMENT_TARGET = 15.4;'));assert.ok(!pbx.includes('/Users/'),'Absolute user path in project F'+g.id);assert.ok(pbx.includes(g.bundle));
 const local=readFileSync(join(project,'xcshareddata/xcschemes',name+'-LocalTest.xcscheme'),'utf8');
 const release=readFileSync(join(project,'xcshareddata/xcschemes',name+'-Release.xcscheme'),'utf8');
 assert.ok(local.includes('StoreKitConfigurationFileReference'));assert.ok(!release.includes('StoreKitConfigurationFileReference'));assert.ok(release.match(/<ArchiveAction\s+buildConfiguration = "Release"/));
 assert.ok(readFileSync(join(app,'H5LocalServer.m'),'utf8').includes(`htons(${g.port})`));
 const webBytes=files.reduce((n,f)=>n+statSync(f).size,0);assert.equal(webBytes,g.webBytes,'Size report stale F'+g.id);
 results.push({id:g.id,webp:images.length,products:g.products.length,legacyProducts:g.legacyProducts.length,webBytes,minimumIOS:'15.4',passed:true});
 console.log(`F${g.id}: ${images.length} WebP; products, native metadata, schemes, icon, paths OK`);
}
const report=process.argv.find(a=>a.startsWith('--report='))?.slice(9)||join(reports,'delivery-audit.json');mkdirSync(dirname(report),{recursive:true});
writeFileSync(report,JSON.stringify({out,checkedAt:new Date().toISOString(),games:results},null,2));
