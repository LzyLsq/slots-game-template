// Normalize the first seven generated builds to the same quality-85 policy as
// the other games. Encode from Creator's original import artifacts, never from
// an already lossy WebP. Source artwork/import files remain read-only.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,basename} from 'node:path';
import {walk} from '../webp-iap/webp.mjs';
import {games} from './calm-mix-projects.mjs';
const require=createRequire(import.meta.url),sharp=require('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
sharp.concurrency(2);sharp.cache(false);
const pending=[];
for(const g of games.filter(g=>[13,15,16,17,18,19,20].includes(g.id)))for(const webp of walk(g.build).filter(p=>p.includes('/native/')&&p.endsWith('.webp'))){
 const uuid=basename(webp,'.webp'),png=join(g.project,'library',uuid.slice(0,2),uuid+'.png');
 assert(existsSync(png),'Missing original import image '+png);pending.push({id:g.id,png,webp});
}
const results=[];let index=0;
async function worker(){while(index<pending.length){
 const entry=pending[index++],original=readFileSync(entry.png);
 const encoded=await sharp(original).webp({quality:85,alphaQuality:100,effort:5}).toBuffer();
 const a=await sharp(original).metadata(),b=await sharp(encoded).metadata();
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 const input=await sharp(original).ensureAlpha().raw().toBuffer(),decoded=await sharp(encoded).ensureAlpha().raw().toBuffer();
 for(let i=3;i<input.length;i+=4)assert.equal(input[i],decoded[i],'Alpha changed '+entry.webp);
 writeFileSync(entry.webp,encoded);results.push({id:entry.id,file:entry.webp,bytes:encoded.length,width:b.width,height:b.height});
 if(results.length%50===0)console.log(`${results.length}/${pending.length}: dimensions and alpha verified`);
}}
await Promise.all([worker(),worker()]);
const report={checkedAt:new Date().toISOString(),count:results.length,format:'WebP quality 85, alpha quality 100, original dimensions; encoded from original import PNG, not from lossy WebP',sourceArtworkUntouched:true,files:results};
writeFileSync(join(import.meta.dirname,'verification/calm-mix-20261012/images.json'),JSON.stringify(report,null,2));console.log(`Normalized ${results.length} generated textures. Original artwork was not modified.`);
