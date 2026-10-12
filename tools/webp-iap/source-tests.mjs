import {games} from './install.mjs';
import {createWriteStream,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const results=[];
for(const g of games.filter(g=>[25,26,27,28].includes(g.id))){const file=join(import.meta.dirname,'verification',`F${g.id}-source-tests.log`),log=createWriteStream(file),c=spawn('npm',['test'],{cwd:g.source});let tail='';for(const s of [c.stdout,c.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-5000)});const code=await new Promise(resolve=>c.on('close',resolve));log.end();results.push({id:g.id,code});console.log('F'+g.id+' source tests '+code+'\n'+tail.slice(-1200));}
writeFileSync(join(import.meta.dirname,'verification/source-test-results.json'),JSON.stringify(results,null,2));if(results.some(r=>r.code))process.exitCode=1;
