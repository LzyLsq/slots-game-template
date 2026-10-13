import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {games,patch} from './plus-common.mjs';
const helper=readFileSync(join(import.meta.dirname,'LocalCoinStore.ts'),'utf8');
for(const g of games.filter(g=>g.id!==42)){
 const dir=join(g.source,'assets/scripts/services'),file=join(dir,'StoreService.ts'),shared=join(g.source,'assets/scripts/LocalCoinStore.ts');
 patch(shared,helper);
 if(!existsSync(shared+'.meta'))patch(shared+'.meta',JSON.stringify({ver:'4.0.24',importer:'typescript',imported:true,uuid:randomUUID(),files:[],subMetas:{},userData:{}},null,2));
 let s=readFileSync(file,'utf8');
 if(!s.includes('private localPurchases')){
  s="import { LocalCoinStore } from '../LocalCoinStore';\n"+s;
  s=s.replace('  readonly signedTransactionInfo?: string;','  readonly signedTransactionInfo?: string;\n  readonly appAccountToken?: string;');
  s=s.replace('  private debugGrants = false;',`  private localPurchases?: LocalCoinStore;
  private localStore(): LocalCoinStore {
    return this.localPurchases ??= new LocalCoinStore(STORE_PRODUCTS, ALL_STORE_PRODUCTS, () => {
      const s=this.save.read(),p=s.currentUserId?s.players[s.currentUserId]:undefined;
      return p&&!p.isGuest?{id:p.id,token:p.appAccountToken}:null;
    }, (nativeId,amount) => {
      const id='apple:'+nativeId,ledger=this.save.currentScope()?.creditedPurchaseIds;
      if(ledger?.includes(id)||ledger?.includes(nativeId))return 'duplicate';
      if(this.economy.balance()>1_000_000_000-amount)throw Error('Coin balance limit: spend coins before retrying this unfinished purchase');
      if(!this.economy.creditVerifiedPurchase(amount,id))throw Error('Unable to save purchased coins');
      if(!this.save.currentScope()?.creditedPurchaseIds.includes(id))throw Error('Purchase was not persisted');
      return 'new';
    });
  }
  private debugGrants = false;`);
  s=s.replaceAll('this.debugGrants = debugGrants;','this.debugGrants = debugGrants && !nativeBridge();').replaceAll('this.debugGrants = enabled;','this.debugGrants = enabled && !nativeBridge();');
  s=s.replace('Boolean(nativeBridge() && this.server)','Boolean(nativeBridge())');
  s=s.replace('if (!bridge || !this.server) return STORE_PRODUCTS.map','if (!bridge) return STORE_PRODUCTS.map');
  for(const method of ['catalog','purchase','restore']){
   const signature=method==='catalog'?'public async catalog(): Promise<readonly StoreCatalogItem[]> {':method==='purchase'?'public async purchase(productId: string): Promise<StoreActionResult> {':'public async restore(): Promise<StoreActionResult> {';
   if(!s.includes(signature))throw Error('Unsupported StoreService '+g.id+' '+method);
   s=s.replace(signature,signature+`\n    if (!this.server && nativeBridge()) return this.localStore().${method}(${method==='purchase'?'productId':''});`);
  }
 }
 // Unreleased F34 duplicates an older title; F38 accidentally reused F37.
 if(g.id===34)s=s.replaceAll('com.publisher.aurumatelier.coins','com.publisher.f34aurumatelier.coins');
 if(g.id===38)s=s.replaceAll('com.publisher.fortunecaravan.coins','com.publisher.goldengala.coins');
 patch(file,s);
 const economy=join(dir,'EconomyService.ts');s=readFileSync(economy,'utf8').replace(' data.creditedPurchaseIds = data.creditedPurchaseIds.slice(-500);','');patch(economy,s);
 const save=join(dir,'SaveService.ts');s=readFileSync(save,'utf8').replace("/^[A-Za-z0-9._:-]{3,160}$/.test(id)).slice(-500)","/^[A-Za-z0-9._:-]{3,160}$/.test(id))");patch(save,s);
 console.log('F'+g.id+': durable device-local StoreKit connected');
}
