import assert from 'node:assert/strict';
import {MemoryStorage,SaveService} from '../assets/scripts/services/SaveService';
import {GameBootstrap} from '../assets/scripts/core/GameBootstrap';
import {CaravanService,CARAVAN_STOPS} from '../assets/scripts/services/CaravanService';
import {TERMS_VERSION,PRIVACY_VERSION} from '../assets/scripts/core/ReleaseConfig';
async function main(){
const storage=new MemoryStorage(),save=new SaveService(storage);save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);
const app=new GameBootstrap(save);await app.auth.guestLogin();const uid=save.read().currentUserId!;
const ids=['crown-club','emerald-fortune','ruby-royale','vault-reserve'];
assert.equal(app.caravan.claim('departure'),0);assert.equal(app.caravan.claim('bogus'),0);
assert(app.economy.reserveSpin('cancel-route-0001',30));assert(app.economy.cancelReservation('cancel-route-0001'));assert.equal(save.currentScope()!.caravan.rounds,0);
assert(app.economy.reserveSpin('recovery-route-0001',30));assert.equal(app.economy.recoverPending(),30);assert.equal(save.currentScope()!.caravan.rounds,0);
for(let i=0;i<40;i++){
 const id='gala-round-'+String(i).padStart(4,'0');assert(app.economy.reserveSpin(id,30));assert(app.economy.settleSpin(id,0,ids[Math.floor(i/10)]));
 assert(!app.economy.settleSpin(id,500,ids[3]));assert.equal(save.currentScope()!.caravan.rounds,i+1);
 if(i===0){assert.equal(app.caravan.status()[0].ready,true);assert(app.caravan.status().slice(1).every(s=>!s.ready));}
 if(i===10)assert.equal(app.caravan.status()[1].ready,true);
}
assert.equal(save.currentScope()!.caravan.visited.length,4);
const before=app.economy.balance();for(const stop of CARAVAN_STOPS){assert.equal(app.caravan.claim(stop.id),stop.coins);assert.equal(app.caravan.claim(stop.id),0);}
assert.equal(app.economy.balance(),before+3600);assert.equal(save.currentScope()!.transactions.filter(t=>t.type==='gala-route').length,4);
const restored=new SaveService(storage),again=new GameBootstrap(restored);assert.equal(restored.currentScope()!.caravan.rounds,40);assert(again.caravan.status().every(s=>s.claimed&&!s.ready));assert.equal(again.caravan.claim('crown-club'),0);
app.auth.logout();await app.auth.guestLogin();assert.notEqual(save.read().currentUserId,uid);assert.equal(save.currentScope()!.caravan.rounds,0);assert.equal(app.caravan.claim('departure'),0);
save.update(s=>{s.currentUserId=uid;s.playerData[uid].caravan.claimed=[];});const remote=new CaravanService(save,true),remoteBalance=app.economy.balance();assert(remote.status().every(s=>!s.ready));assert.equal(remote.claim('crown-club'),0);assert.equal(app.economy.balance(),remoteBalance);
save.update(s=>{s.playerData[uid].caravan={rounds:40,visited:[ids[0]],claimed:[]};});assert.equal(app.caravan.claim('oasis'),0);
// Durable storage failure must not acknowledge a route payout.
const failStore={getItem:(key:string)=>storage.getItem(key),setItem:()=>{throw new Error('disk full');},removeItem:()=>{}};
const failed=new SaveService(failStore),snapshot=JSON.stringify(failed.read());assert.throws(()=>new CaravanService(failed).claim('crown-club'),/disk full/);assert.equal(JSON.stringify(failed.read()),snapshot);
console.log('PASS caravan: 40 atomic settled rounds, duplicate/cancel/recovery protection, 4 account-scoped claims, persistence, remote authority guard and storage failure rollback.');

}
main().catch(error=>{console.error(error);process.exitCode=1;});
