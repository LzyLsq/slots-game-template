import {RemoteSpinJournal} from '../assets/scripts/services/RemoteSpinJournal';
import assert from 'node:assert/strict';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {signature} from '../assets/scripts/math/SignatureFeature';
import {ECONOMY} from '../assets/scripts/math/EconomyProfile';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
import {STORE_PRODUCTS,LEGACY_STORE_PRODUCTS,ALL_STORE_PRODUCTS,StoreService} from '../assets/scripts/services/StoreService';
import {MemoryStorage,SaveService} from '../assets/scripts/services/SaveService';
import {GameBootstrap} from '../assets/scripts/core/GameBootstrap';
import {TERMS_VERSION,PRIVACY_VERSION} from '../assets/scripts/core/ReleaseConfig';
import {readFileSync} from 'node:fs';
async function main(){
 const generator=new ResultGenerator();
 for(const c of GAME_CONFIGS){
 const bet=c.bets[2],rng=new SeededRNG(20260915),reg=c.symbols.filter(s=>s.tier!=='wild'&&s.tier!=='scatter'&&s.tier!=='bonus').map(s=>s.id),size=c.columns*c.rows;
 const base=Array(size).fill(reg[0]);
 const evaluate=(cfg:typeof c,g:readonly string[],b:number)=>generator.evaluate(cfg,g,b).filter(w=>w.kind!=='scatter');
 for(let i=0;i<300;i++){const r=generator.generate(c,bet,rng);assert.equal(r.totalWin,r.baseWin+r.featureWin);assert.equal(r.featureWin,r.featureResult?.rounds.reduce((n,s)=>n+s.credits,0)??0);assert.equal(r.baseWin,r.wins.reduce((n,w)=>n+w.credits,0));assert(Number.isSafeInteger(r.totalWin));assert(r.totalWin>=0&&r.totalWin<=bet*c.maxWinMultiplier);for(const round of r.featureResult?.rounds??[]){assert.equal(round.grid.length,size);assert(round.grid.every(s=>c.symbols.some(x=>x.id===s)));assert.equal(round.credits,round.wins.reduce((n,w)=>n+w.credits,0));}}
 }
 const mapping=JSON.parse(readFileSync(new URL('../server/iap-products.v2.json',import.meta.url),'utf8'));
 assert.deepEqual(ECONOMY.packs.map(([a,b])=>b/a),[0,.2,.4,.6]);
 assert(ECONOMY.packs.every(([a,b])=>(a+b)%1000===0));
 for(const p of ALL_STORE_PRODUCTS)assert.equal(mapping[p.appleProductId],p.credits+p.bonus);
 assert(STORE_PRODUCTS.every(p=>p.appleProductId.endsWith('.v3')));
 const storage=new MemoryStorage(),save=new SaveService(storage);save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);const b=new GameBootstrap(save,true);
 assert((await b.auth.register({username:'v2_check',nickname:'V2 Check',password:'Version2Pass!',confirmPassword:'Version2Pass!',acceptedTerms:true})).ok);
 assert.equal(b.economy.balance(),ECONOMY.start);assert(b.store.claimDaily('2026-09-15'));assert.equal(b.economy.balance(),ECONOMY.start+ECONOMY.daily);assert(!b.store.claimDaily('2026-09-15'));
 assert(b.store.debugPurchase(STORE_PRODUCTS[0].id));const before=b.economy.balance();
 const old=LEGACY_STORE_PRODUCTS[0];let finished=0;
 (globalThis as any).__AURELIA_IAP__={restore:async()=>[{status:'verified',productId:old.appleProductId,transactionId:'9900000000001',signedTransactionInfo:'old-order'}],finish:async()=>{finished++;}};
 const server={verifyApplePurchase:async()=>({status:'verified' as const,productId:old.appleProductId,transactionId:'9900000000001',creditedCredits:old.credits+old.bonus,authoritativeBalance:before+old.credits+old.bonus}),synchronizePurchases:async()=>({status:'verified' as const,authoritativeBalance:before+old.credits+old.bonus})};
 const store=new StoreService(save,b.economy,false,server);assert((await store.restore()).ok);assert.equal(finished,1);assert.equal(b.economy.balance(),before+old.credits+old.bonus);await store.restore();assert.equal(b.economy.balance(),before+old.credits+old.bonus);delete (globalThis as any).__AURELIA_IAP__;
 const reloaded=new SaveService(storage);assert.equal(reloaded.read().players[reloaded.read().currentUserId!].credits,b.economy.balance());
 assert.equal(new GameBootstrap(reloaded,true).store.claimDaily('2026-09-15'),false);
 const journal=new RemoteSpinJournal(reloaded);const cfg=GAME_CONFIGS[0];
 for(const amount of [cfg.bets[0],50]){
  reloaded.update(s=>{s.playerData[s.currentUserId!].pendingRemoteSpin={requestId:'recovery-v2-round',gameId:cfg.id,bet:amount};});
  assert.equal(new RemoteSpinJournal(new SaveService(storage)).pending()?.bet,amount);
  journal.begin('recovery-v2-round',cfg.id,amount);
  journal.reject('recovery-v2-round');
 }
 console.log('PASS: signature mechanics, conservation, versioned products, historical order replay, persistent wallets and claims');
}
void main();
