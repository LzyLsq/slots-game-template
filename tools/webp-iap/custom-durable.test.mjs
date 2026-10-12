import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {games} from './install.mjs';
const require=createRequire(import.meta.url),ts=require(join(games.find(g=>g.id===20).source,'node_modules/typescript'));
const loadTS=async(file,replace=()=>{})=>{let source=readFileSync(file,'utf8');source=replace(source)||source;const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));};
class Storage{data=new Map();fail=false;getItem(k){return this.data.get(k)||null;}setItem(k,v){if(this.fail)throw Error('Disk full');this.data.set(k,v);}removeItem(k){this.data.delete(k);}}
const results=[];
for(const id of [25,26,27,28]){
 try{
  const g=games.find(g=>g.id===id),storage=new Storage();let owner,read,reload,grant;
  if(id===25){
   const m=await loadTS(join(g.source,'assets/scripts/model/store.ts'));
   m.configureStorage(storage);owner=m.defaultState();m.save(owner);
   // Execute the production callback itself, with its real store functions.
   const text=readFileSync(join(g.source,'assets/scripts/VelvetApp.ts'),'utf8');
   const body=text.match(/\(id,amount\)=>\{([\s\S]*?)\n \}\);/)[1];
   const fn=new Function('id','amount','currentProfile','load','record','save',body);
   grant=(tx,coins)=>fn.call({state:owner},tx,coins,m.currentProfile,m.load,m.record,m.save);
   read=()=>m.load().balance;reload=()=>{};
  }else if(id===26){
   const m=await import(pathToFileURL(join(g.source,'src/services.js')));owner=m.createStore(storage);read=()=>owner.state.coins;reload=()=>{owner=m.createStore(storage);};grant=(tx,coins)=>owner.grantPurchase(tx,coins);
  }else if(id===27){
   globalThis.__testStore=storage;
   const m=await loadTS(join(g.source,'assets/scripts/PlayerState.ts'),s=>s.replace("import { sys } from 'cc';",'const sys={localStorage:globalThis.__testStore};'));
   owner=new m.PlayerState();owner.save();read=()=>owner.data.balance;reload=()=>{owner=new m.PlayerState();};grant=(tx,coins)=>owner.grantPurchase(tx,coins);
  }else{
   // Load the module through the project's tsx loader to preserve Rules imports.
   const {spawnSync}=await import('node:child_process');
   const code=`const assert=require('node:assert/strict');const {Wallet}=require('./assets/scripts/core/Wallet.ts');let raw=null,fail=false;const adapter={read:()=>raw,write:v=>{if(fail)throw Error('Disk full');raw=v;}};let w=new Wallet(adapter);const before=w.snapshot().balance;fail=true;assert.throws(()=>w.grantPurchase('1',100),/Disk full/);assert.equal(w.snapshot().balance,before);fail=false;w=new Wallet(adapter);assert.equal(w.grantPurchase('1',100),'new');w=new Wallet(adapter);assert.equal(w.grantPurchase('1',100),'duplicate');assert.equal(w.snapshot().balance,before+100);console.log('PASS');`;
   const r=spawnSync(process.execPath,['--import','tsx','-e',code],{cwd:g.source,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);results.push({id,success:true});console.log('F28: PASS');continue;
  }
  const before=read();storage.fail=true;assert.throws(()=>grant('1',100),/Disk full/);assert.equal(read(),before);
  storage.fail=false;reload();assert.equal(read(),before);assert.equal(grant('1',100),'new');reload();assert.equal(read(),before+100);assert.equal(grant('1',100),'duplicate');assert.equal(read(),before+100);
  results.push({id,success:true});console.log('F'+id+': PASS');
 }catch(e){results.push({id,success:false,error:String(e.stack)});console.log('F'+id+': '+e.stack);}
}
writeFileSync(join(import.meta.dirname,'verification/custom-durable-results.json'),JSON.stringify(results,null,2));
if(results.some(r=>!r.success))process.exitCode=1;
