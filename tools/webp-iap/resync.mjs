import {readFileSync,writeFileSync,existsSync,cpSync,mkdtempSync,renameSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {root,games} from './install.mjs';
import {compressWeb} from './webp.mjs';

// Replaces only this run's generated Web output. Source artwork and previous
// deliveries are untouched. The replaced output is retained for recovery.
const out=join(root,'Xcode_H5/WebP_IAP_20261010');
const reports=join(import.meta.dirname,'verification');
const file=join(out,'manifest.json');
const ids=process.argv.slice(2).filter(a=>a!=='--wait');
const wait=process.argv.includes('--wait');
const resultsFile=join(reports,'build-results.json');
const selected=games.filter(g=>!ids.length||ids.includes(String(g.id)));
mkdirSync(reports,{recursive:true});
for(const g of selected){
  if(wait){
    const deadline=Date.now()+30*60*1000;
    while(true){
      const result=existsSync(resultsFile)?JSON.parse(readFileSync(resultsFile)).find(r=>r.id===g.id):null;
      if(result){if(!result.success)throw Error('Failed build F'+g.id);break;}
      if(Date.now()>deadline)throw Error('Build wait timed out F'+g.id);
      await new Promise(r=>setTimeout(r,2000));
    }
  }
  const items=JSON.parse(readFileSync(file));
  const item=items.find(i=>i.id===g.id);
  if(!item)throw Error('Missing delivery F'+g.id);
  const web=join(out,item.folder,`F${g.id}_H5`);
  const source=join(g.source,g.id===26?'dist':'build/web-mobile');
  if(!existsSync(join(source,'index.html')))throw Error('Missing fresh Web build F'+g.id);
  const staging=mkdtempSync(join(reports,`resync-F${g.id}-`));
  const next=join(staging,'new-web');
  cpSync(source,next,{recursive:true,filter:p=>!p.endsWith('.DS_Store')&&!p.endsWith('.map')&&!p.includes('/ios-wrapper/')});
  console.log('F'+g.id+': compressing fresh Web build');
  const compression=await compressWeb(next,g.id===26);
  cpSync(join(web,'ios-wrapper'),join(next,'ios-wrapper'),{recursive:true});
  renameSync(web,join(staging,'previous-web'));
  try{renameSync(next,web);}catch(error){renameSync(join(staging,'previous-web'),web);throw error;}
  // Reread so other independent report updates cannot lose manifest entries.
  const manifest=JSON.parse(readFileSync(file));
  const current=manifest.find(i=>i.id===g.id);
  current.compression=compression;current.webBytes=compression.after;
  current.sourceBuildRefreshedAt=new Date().toISOString();
  current.previousGeneratedWebBackup=join(staging,'previous-web');
  writeFileSync(file,JSON.stringify(manifest,null,2));
  console.log(JSON.stringify({id:g.id,images:compression.count,webMiB:(compression.after/1048576).toFixed(1)}));
}
