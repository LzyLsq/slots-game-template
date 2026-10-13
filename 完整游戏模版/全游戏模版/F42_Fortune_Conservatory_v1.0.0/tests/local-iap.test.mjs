import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,creditVerifiedPurchase,validateProfile} from '../src/model.mjs';
import {LocalCoinStore,STORE_PRODUCTS} from '../src/local-iap.mjs';
function fixture(){
 const p=newProfile('00000000-0000-4000-8000-000000000042','Buyer');p.appAccountToken=p.id;
 const store={profile:p,events:new EventTarget(),update:async fn=>fn(p)};
 return {p,store,iap:new LocalCoinStore(store)};
}
test('IAP ID survives presentation-ledger pruning and balance overflow is rejected',()=>{
 const p=newProfile('a','Buyer');assert.equal(creditVerifiedPurchase(p,'123',2000),2000);
 for(let n=0;n<310;n++)creditVerifiedPurchase(p,String(1000+n),1);
 assert.equal(p.ledger.length,300);assert.equal(creditVerifiedPurchase(p,'123',2000),0);validateProfile(p);
 p.balance=1_000_000_000;assert.throws(()=>creditVerifiedPurchase(p,'99999',1),/limit/);
});
test('verified transaction saves before finish, failed finish retries without double credit',async()=>{
 const {p,iap}=fixture();let attempts=0;
 const tx={status:'verified',productId:STORE_PRODUCTS[0].appleProductId,transactionId:'42',appAccountToken:p.id};
 globalThis.__AURELIA_IAP__={purchase:async()=>tx,finish:async()=>{assert.ok(p.creditedPurchaseIds.includes('apple:42'));if(++attempts===1)throw Error('offline');},restore:async()=>[tx]};
 try{assert.equal((await iap.purchase('purse')).credited,2000);assert.equal((await iap.restore()).credited,0);assert.equal(p.balance,12000);assert.equal(attempts,2);}finally{delete globalThis.__AURELIA_IAP__;}
});
test('pending, cancelled, wrong-account and save failures never finish or grant',async()=>{
 for(const status of ['pending','cancelled','wrong-account','save-failed']){
  const {p,store,iap}=fixture();let finishes=0;
  const tx={status:status==='wrong-account'||status==='save-failed'?'verified':status,productId:STORE_PRODUCTS[0].appleProductId,transactionId:'43',appAccountToken:status==='wrong-account'?'00000000-0000-4000-8000-000000000099':p.id};
  if(status==='save-failed')store.update=async()=>{throw Error('disk full');};
  globalThis.__AURELIA_IAP__={purchase:async()=>tx,finish:async()=>{finishes++;}};
  try{assert.equal((await iap.purchase('purse')).ok,false);assert.equal(p.balance,10000);assert.equal(finishes,0);}finally{delete globalThis.__AURELIA_IAP__;}
 }
});
