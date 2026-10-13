import {cp,mkdir,rm,writeFile,readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'dist');
// Only this script-owned output directory is replaced, never source or user files.
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','manifest.webmanifest','src','assets'])await cp(path.join(root,name),path.join(out,name),{recursive:true});
const files=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else {const b=await readFile(p);files.push({file:path.relative(out,p),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}}
await walk(out);await writeFile(path.join(out,'build-manifest.json'),JSON.stringify({project:'F42 Fortune Conservatory',version:'1.0.0',files},null,2));
console.log(`Web build: ${files.length} files, ${Math.round(files.reduce((n,f)=>n+f.bytes,0)/1024)} KiB in ${out}`);
