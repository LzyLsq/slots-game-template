import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
for(const name of ['src','index.html','audio'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
fs.cpSync(path.join(root,'public/art'),path.join(out,'art'),{recursive:true});
console.log('Built offline-capable static app in dist/');

// Web is a generated resource folder. Keep the native shell/signing untouched.
// Opt in explicitly so a normal web build does not modify the iOS delivery.
if(process.argv.includes('--sync-ios')){
  const web=path.join(root,'ios/FortuneTides/Web');
  fs.mkdirSync(web,{recursive:true});
  for(const name of ['src','index.html','audio','art'])fs.cpSync(path.join(out,name),path.join(web,name),{recursive:true});
  console.log('Synchronized complete web resources to ios/FortuneTides/Web/');
}
