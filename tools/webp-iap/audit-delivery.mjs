import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,statSync,readdirSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {walk} from './webp.mjs';
const require=createRequire(import.meta.url),sharp=require('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=join(import.meta.dirname,'../..');
const out=process.argv[2]||join(root,'Xcode_H5/WebP_IAP_20261010');
const items=JSON.parse(readFileSync(join(out,'manifest.json'))),results=[];
assert.deepEqual(items.map(g=>g.id),[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33]);
assert.equal(new Set(items.map(g=>g.bundle)).size,20);
assert.equal(new Set(items.map(g=>g.port)).size,20);
for(const g of items){
 const dir=join(out,g.folder),web=join(dir,`F${g.id}_H5`),app=join(web,'ios-wrapper/App');
 const files=walk(web).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/'));
 const images=files.filter(f=>f.endsWith('.webp'));
 assert.ok(images.length>0,'No WebP F'+g.id);
 assert.equal(files.filter(f=>/\.(png|jpe?g)$/i.test(f)).length,0,'Unconverted image F'+g.id);
 for(const file of images){const b=readFileSync(file);assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');}
 const icon=await sharp(join(app,'Assets.xcassets/AppIcon.appiconset/AppIcon.png')).metadata();
 assert.equal(icon.width,1024);assert.equal(icon.height,1024);assert.equal(icon.hasAlpha,false);
 const all=[...g.products,...g.legacyProducts],ids=all.map(p=>p.appleProductId);
 assert.equal(new Set(ids).size,ids.length,'Ambiguous product F'+g.id);
 const swift=readFileSync(join(app,'StoreKitBackend.swift'),'utf8');
 const allowed=JSON.parse(swift.match(/private let allowed: Set<String> = (\[[^\n]+\])/)[1]);
 const name=g.title.replaceAll(' ',''),kit=JSON.parse(readFileSync(join(app,name+'.storekit')));
 assert.deepEqual([...allowed].sort(),[...ids].sort());
 assert.deepEqual(kit.products.map(p=>p.productID).sort(),[...ids].sort());
 for(const p of all){assert.ok(Number.isSafeInteger(p.credits+p.bonus)&&p.credits+p.bonus>0);assert.equal(kit.products.find(s=>s.productID===p.appleProductId).type,'Consumable');}
 const js=files.filter(f=>f.endsWith('.js')).map(f=>readFileSync(f,'utf8')).join('\n');
 // Standard games construct current IDs from prefix + pack + version at
 // runtime. Compare their executable TS exports, not a naive full-text search.
 if(![25,26,27,28].includes(g.id)){
   const base=join(root,'完整游戏模版/全游戏模版'),source=join(base,readdirSync(base).find(n=>n.startsWith(`F${g.id}_`)));
   const r=spawnSync(process.execPath,['--import','tsx','-e',"import('./assets/scripts/services/StoreService.ts').then(m=>{const s=m.default||m;console.log(JSON.stringify({products:s.STORE_PRODUCTS,all:s.ALL_STORE_PRODUCTS||s.STORE_PRODUCTS}))})"],{cwd:source,encoding:'utf8'});
   assert.equal(r.status,0,r.stderr);
   const exports=JSON.parse(r.stdout.trim().split('\n').at(-1));
   assert.deepEqual(exports.products,g.products);assert.deepEqual(exports.all,all);
 }else for(const id of ids)assert.ok(js.includes(id),'Missing web product '+id);
 assert.ok(js.includes('local-store-update'),'Compiled local IAP missing F'+g.id);
 const project=join(dir,'DBGame',name+'H5.xcodeproj');
 assert.ok(existsSync(project));assert.equal(g.project,project,'Nonportable manifest F'+g.id);
 const pbx=readFileSync(join(project,'project.pbxproj'),'utf8');
 assert.ok(pbx.includes('IPHONEOS_DEPLOYMENT_TARGET = 15.4;'));
 assert.ok(!pbx.includes('/Users/'),'Absolute user path in project F'+g.id);
 assert.ok(pbx.includes(g.bundle));
 const local=readFileSync(join(project,'xcshareddata/xcschemes',name+'-LocalTest.xcscheme'),'utf8');
 const release=readFileSync(join(project,'xcshareddata/xcschemes',name+'-Release.xcscheme'),'utf8');
 assert.ok(local.includes('StoreKitConfigurationFileReference'));
 assert.ok(!release.includes('StoreKitConfigurationFileReference'));
 assert.ok(release.match(/<ArchiveAction\s+buildConfiguration = "Release"/));
 const webBytes=files.reduce((n,f)=>n+statSync(f).size,0);
 assert.equal(webBytes,g.webBytes,'Size report stale F'+g.id);
 results.push({id:g.id,webp:images.length,products:g.products.length,legacyProducts:g.legacyProducts.length,webBytes,minimumIOS:'15.4',passed:true});
 console.log(`F${g.id}: ${images.length} WebP, ${all.length} product IDs, schemes/icon/paths OK`);
}
const report=process.argv.find(a=>a.startsWith('--report='))?.slice(9)||join(import.meta.dirname,'verification/delivery-audit.json');
mkdirSync(dirname(report),{recursive:true});
writeFileSync(report,JSON.stringify({out,checkedAt:new Date().toISOString(),games:results},null,2));
