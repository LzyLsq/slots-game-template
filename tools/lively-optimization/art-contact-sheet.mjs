import {createRequire} from 'node:module';
import {readdirSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {profiles} from './profiles.mjs';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE||'/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base=resolve('完整游戏模版/全游戏模版'),out='/tmp/mascot-art-audit';mkdirSync(out,{recursive:true});
for(const p of profiles.filter(p=>![25,26,27,28].includes(p.id))){
 const d=readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)),dir=join(base,d,'assets/resources/art');
 const candidates=readdirSync(dir).filter(n=>n.endsWith('.png')&&(/-tall|hall-soft|jamboree-plaza|f29-.*v1|^salon/.test(n)));
 const pieces=[];let k=0;for(const name of candidates){const image=await sharp(join(dir,name)).resize(220,440,{fit:'contain',background:'#27303a'}).png().toBuffer();pieces.push({input:image,left:k%6*220,top:Math.floor(k/6)*470});const label=Buffer.from(`<svg width="220" height="30"><rect width="220" height="30" fill="#fff"/><text x="4" y="20" font-size="12">F${p.id} ${name}</text></svg>`);pieces.push({input:label,left:k%6*220,top:Math.floor(k/6)*470+440});k++;}
 await sharp({create:{width:1320,height:Math.ceil(k/6)*470,channels:4,background:'#27303a'}}).composite(pieces).png().toFile(join(out,`F${p.id}.png`));
}
console.log(out);
