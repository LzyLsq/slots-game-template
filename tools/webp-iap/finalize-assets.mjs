import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {compressWeb} from './webp.mjs';
import {root} from './install.mjs';
const out=join(root,'Xcode_H5/WebP_IAP_20261010'),file=join(out,'manifest.json'),games=JSON.parse(readFileSync(file));
for(const g of games){const r=await compressWeb(join(out,g.folder,`F${g.id}_H5`),false),c=g.compression;c.count+=r.count;c.after=r.after;c.savedBytes=c.before-c.after;c.originalBytes+=r.originalBytes;c.encodedBytes+=r.encodedBytes;g.webBytes=c.after;console.log('F'+g.id+': additional '+r.count+' WebP, '+(c.after/1048576).toFixed(1)+' MiB');}
writeFileSync(file,JSON.stringify(games,null,2));
