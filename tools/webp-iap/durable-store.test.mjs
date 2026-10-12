import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {games} from './install.mjs';
const code=String.raw`
import assert from 'node:assert/strict';
const mod=async p=>{const m=await import(p);return m.default||m;};
const {GameBootstrap}=await mod('./assets/scripts/core/GameBootstrap.ts');
const {MemoryStorage,SaveService}=await mod('./assets/scripts/services/SaveService.ts');
const {STORE_PRODUCTS}=await mod('./assets/scripts/services/StoreService.ts');
const {TERMS_VERSION,PRIVACY_VERSION}=await mod('./assets/scripts/core/ReleaseConfig.ts');
class Storage extends MemoryStorage{fail=false;setItem(k,v){if(this.fail)throw Error('Disk full');super.setItem(k,v);}}
const storage=new Storage(),save=new SaveService(storage);
save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);
let pending=[],finished=[],failFinish=false,token;
const p=STORE_PRODUCTS[0],amount=p.credits+p.bonus;
globalThis.__AURELIA_IAP__={products:async()=>[{productId:p.appleProductId,displayPrice:'¥6.00'}],purchase:async(id,t)=>{token=t;const tx={status:'verified',productId:id,transactionId:'1',appAccountToken:t};pending=[tx];return tx;},restore:async()=>pending,finish:async(id)=>{if(failFinish)throw Error('Finish interrupted');finished.push(id);pending=pending.filter(t=>t.transactionId!==id);}};
let app=new GameBootstrap(save,false);
assert.equal((await app.auth.register({username:'iaptester',nickname:'IAP Tester',password:'LocalTest_2026',confirmPassword:'LocalTest_2026',acceptedTerms:true})).ok,true);
let before=app.economy.balance();
storage.fail=true;
assert.equal((await app.store.purchase(p.id)).ok,false);
assert.equal(app.economy.balance(),before,'failed persistence cannot mutate in-memory coins');
assert.equal(finished.length,0,'failed persistence cannot finish Apple transaction');
assert.equal(pending.length,1);
storage.fail=false;
app=new GameBootstrap(new SaveService(storage),false);
assert.equal(app.economy.balance(),before,'failed persistence cannot survive restart');
failFinish=true;
assert.equal((await app.store.restore()).ok,true);
assert.equal(app.economy.balance(),before+amount);
assert.equal(finished.length,0);
app=new GameBootstrap(new SaveService(storage),false);
assert.equal(app.economy.balance(),before+amount);
failFinish=false;
assert.equal((await app.store.restore()).ok,true);
assert.equal(app.economy.balance(),before+amount,'restart and unfinished retry must not double credit');
assert.deepEqual(finished,['1']);
// Retain old transactions beyond the previous 500-entry trimming limit.
app.save.update(s=>{s.playerData[s.currentUserId].creditedPurchaseIds.push(...Array.from({length:600},(_,i)=>'apple:'+String(i+100)));});
app=new GameBootstrap(new SaveService(storage),false);
assert(app.save.currentScope().creditedPurchaseIds.includes('apple:1'));
assert.equal((await app.store.purchase(p.id)).status,'duplicate');
assert.equal(app.economy.balance(),before+amount);
// A payment that cannot fit is left unfinished, not silently capped and lost.
app.save.update(s=>{s.players[s.currentUserId].credits=1000000000;});
globalThis.__AURELIA_IAP__.purchase=async()=>{pending=[{status:'verified',productId:p.appleProductId,transactionId:'2',appAccountToken:token}];return pending[0];};
const finishes=finished.length;
assert.equal((await app.store.purchase(p.id)).ok,false);
assert.equal(finished.length,finishes);
app.save.update(s=>{s.players[s.currentUserId].credits=0;});
assert.equal((await app.store.restore()).ok,true);
assert.equal(app.economy.balance(),amount);
assert.equal((await app.store.catalog())[0].displayPrice,'¥6.00');
console.log('PASS: actual Save/Economy/Store persistence failure, short ID, restart retry, 600 retained IDs, balance cap, catalog price');
`;
const results=[];
for(const g of games.filter(g=>![25,26,27,28].includes(g.id))){
 const r=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',code],{cwd:g.source,encoding:'utf8',timeout:60000});
 const result={id:g.id,success:r.status===0,output:r.stdout+r.stderr};results.push(result);
 console.log('F'+g.id+': '+(result.success?'PASS':result.output));
}
writeFileSync(join(import.meta.dirname,'verification/durable-store-results.json'),JSON.stringify(results,null,2));
if(results.some(r=>!r.success))process.exitCode=1;
