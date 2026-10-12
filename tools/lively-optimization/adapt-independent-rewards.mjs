import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const dir=id=>join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)));
const p=join(dir(26),'src/app.js'),source=readFileSync(p,'utf8');
if(!source.includes('class="victory-art" src="/art/premium/ivory.png"'))throw Error('F26 expected original award face missing');
writeFileSync(p,source.replace('class="victory-art" src="/art/premium/ivory.png"','class="victory-art" src="/art/victory-plaque.png"'));
console.log('F26: own original marine victory plaque');
