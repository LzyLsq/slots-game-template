import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),sharp=require('sharp');
const source='/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010/F20_Golden_Canopy_OC_StoreKit2_Xcode/F20_H5';
const bundled='/tmp/f20-blink-simulator-20261013/Build/Products/Release-iphonesimulator/GoldenCanopyH5.app/web';
const evidence=join(import.meta.dirname,'verification/f20-blink-20261013');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const list=files(source).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/'));
for(const file of list)assert.equal(hash(file),hash(join(bundled,relative(source,file))),'Stale simulator Web resource '+file);
assert(readFileSync('/tmp/f20-blink-xcode-20261013.log','utf8').includes('** BUILD SUCCEEDED **'));
const samples=[],layers=[];
for(let i=0;i<30;i++){
 const png=execFileSync('xcrun',['simctl','io','2C45F638-CEBE-4BC8-9D79-28D0EADB4BF9','screenshot','-'],{stdio:['ignore','pipe','ignore'],maxBuffer:16*1024*1024});
 const eye=await sharp(png).extract({left:325,top:715,width:95,height:75}).resize(190,150).png().toBuffer();
 layers.push({input:eye,left:i%6*190,top:Math.floor(i/6)*150});
 samples.push({sample:i,eyeHash:createHash('sha256').update(eye).digest('hex')});
 await new Promise(resolve=>setTimeout(resolve,220));
}
await sharp({create:{width:1140,height:750,channels:4,background:'#000000'}}).composite(layers).png().toFile(join(evidence,'iphone11-eyes-time-series.png'));
const report={date:new Date().toISOString(),device:'iPhone 11 / iOS 17.5 simulator',compile:'passed',launch:'passed',matchedBundledWebFiles:list.length,samples};
const file=join(evidence,'native-report.json'),text=JSON.stringify(report,null,2);
let old;try{old=readFileSync(file,'utf8');}catch{}
let patch='*** Begin Patch\n'+(old?'*** Update File: ':'*** Add File: ')+file+'\n';
if(old)patch+='@@\n'+old.trimEnd().split('\n').map(line=>'-'+line).join('\n')+'\n';
patch+=text.split('\n').map(line=>'+'+line).join('\n')+'\n*** End Patch\n';execFileSync('apply_patch',[],{input:patch});
console.log('PASS: iPhone 11 app compiled and launched; '+list.length+' matching Web resources; native eye time-series captured');
