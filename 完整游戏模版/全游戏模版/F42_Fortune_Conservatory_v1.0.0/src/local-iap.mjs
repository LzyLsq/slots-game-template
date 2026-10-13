import {creditVerifiedPurchase} from './model.mjs';
export const STORE_PRODUCTS=Object.freeze([
 {id:'purse',appleProductId:'com.publisher.fortuneconservatory.coins.purse.v1',credits:2000,bonus:0,label:'COIN PURSE',debugPrice:'$0.99'},
 {id:'chest',appleProductId:'com.publisher.fortuneconservatory.coins.chest.v1',credits:6000,bonus:0,label:'GARDEN CHEST',debugPrice:'$2.99'},
 {id:'vault',appleProductId:'com.publisher.fortuneconservatory.coins.vault.v1',credits:16000,bonus:0,label:'CONSERVATORY VAULT',debugPrice:'$4.99'}
]);
const native=()=>globalThis.__AURELIA_IAP__;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failed=(message,status='failed')=>({ok:false,status,credited:0,message});
export class LocalCoinStore{
 constructor(store){this.store=store;this.busy=false;this.lastAccount=null;
  globalThis.addEventListener?.('local-store-update',()=>{void this.restore();});
  store.events.addEventListener('change',()=>{const id=store.profile?.id??null;if(id!==this.lastAccount){this.lastAccount=id;if(id&&native())void this.restore();}});
 }
 async account(){
  const p=this.store.profile;if(!p)return null;
  if(!uuid.test(p.appAccountToken??''))await this.store.update(saved=>{saved.appAccountToken=uuid.test(saved.id)?saved.id:crypto.randomUUID();});
  const current=this.store.profile;
  return current?.id===p.id?{id:current.id,token:current.appAccountToken}:null;
 }
 async catalog(){
  let prices=[];if(native())try{await this.restore();prices=await native().products(STORE_PRODUCTS.map(p=>p.appleProductId));}catch{}
  return STORE_PRODUCTS.map(p=>({...p,available:prices.some(n=>n.productId===p.appleProductId),displayPrice:prices.find(n=>n.productId===p.appleProductId)?.displayPrice??'暂不可购买'}));
 }
 async deliver(tx,account){
  if(tx.status!=='verified')return failed(tx.status==='cancelled'?'购买已取消':tx.status==='pending'?'等待批准，尚未发放金币':'交易未通过验证',tx.status==='cancelled'?'cancelled':tx.status==='pending'?'pending':'failed');
  const p=STORE_PRODUCTS.find(p=>p.appleProductId===tx.productId),current=this.store.profile;
  if(!p||!/^\d{1,40}$/.test(tx.transactionId??'')||tx.appAccountToken?.toLowerCase()!==account.token.toLowerCase()||current?.id!==account.id||current.appAccountToken?.toLowerCase()!==account.token.toLowerCase())return failed('交易与当前账户不匹配');
  // ProfileStore resolves only after IndexedDB oncomplete. The balance and
  // permanent purchase-ID set commit in the SAME transaction, before finish.
  const granted=await this.store.update(saved=>{
   if(saved.id!==account.id||saved.appAccountToken?.toLowerCase()!==account.token.toLowerCase())throw Error('Account changed');
   return creditVerifiedPurchase(saved,tx.transactionId,p.credits+p.bonus);
  });
  let finished=true;try{await native().finish(tx.transactionId);}catch{finished=false;}
  return {ok:true,status:granted?'verified':'duplicate',credited:granted,message:finished?(granted?'购买成功，金币已到账':'该交易已到账，不会重复发币'):'金币已保存，交易确认稍后重试'};
 }
 async purchase(id){
  if(this.busy)return failed('另一笔交易正在处理','pending');
  const p=STORE_PRODUCTS.find(p=>p.id===id);if(!native()||!p)return failed('内购仅在 iOS App 中可用','unavailable');
  this.busy=true;try{const a=await this.account();if(!a)return failed('请先进入本机账户','unavailable');return await this.deliver(await native().purchase(p.appleProductId,a.token),a);}catch{return failed('付款或本机保存失败，可稍后同步未完成交易');}finally{this.busy=false;}
 }
 async restore(){
  if(this.busy)return failed('另一笔交易正在处理','pending');if(!native())return failed('内购仅在 iOS App 中可用','unavailable');
  this.busy=true;try{const a=await this.account();if(!a)return failed('请先进入本机账户','unavailable');let credited=0;for(const tx of await native().restore(a.token)){const r=await this.deliver(tx,a);if(!r.ok)return r;credited+=r.credited;}return {ok:true,status:'verified',credited,message:credited?'未完成交易已到账':'没有未完成交易，已消耗金币不可恢复'};}catch{return failed('交易同步失败，请稍后重试');}finally{this.busy=false;}
 }
}
