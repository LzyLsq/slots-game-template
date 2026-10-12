import {readFileSync,existsSync,readdirSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {profiles} from '../lively-optimization/profiles.mjs';
export const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
export const games=[...profiles,{id:20,slug:'Golden_Canopy'}].sort((a,b)=>a.id-b.id).map(p=>({...p,source:join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)))}));
export function patch(file,updated){
  const previous=existsSync(file)?readFileSync(file,'utf8'):null;if(previous===updated)return;
  mkdirSync(resolve(file,'..'),{recursive:true});
  let lines;
  if(previous===null)lines=['*** Add File: '+file,...updated.trimEnd().split('\n').map(l=>'+'+l)];
  else lines=['*** Update File: '+file,'@@',...previous.trimEnd().split('\n').map(l=>'-'+l),...updated.trimEnd().split('\n').map(l=>'+'+l)];
  const r=spawnSync('apply_patch',[],{input:['*** Begin Patch',...lines,'*** End Patch',''].join('\n'),encoding:'utf8',maxBuffer:2e6});if(r.status)throw Error(r.stderr||r.stdout);
}
const helper=readFileSync(join(import.meta.dirname,'LocalCoinStore.ts'),'utf8');
for(const g of games){
  if(g.id===26)continue;
  const file=join(g.source,'assets/scripts/services/StoreService.ts');
  const shared=join(g.source,'assets/scripts/LocalCoinStore.ts');patch(shared,helper);
  if(!existsSync(shared+'.meta'))patch(shared+'.meta',JSON.stringify({ver:'4.0.24',importer:'typescript',imported:true,uuid:randomUUID(),files:[],subMetas:{},userData:{}},null,2));
  if(!existsSync(file))continue;
  let s=readFileSync(file,'utf8');if(s.includes('private localPurchases'))continue;
  s="import { LocalCoinStore } from '../LocalCoinStore';\n"+s;
  s=s.replace('  readonly signedTransactionInfo?: string;','  readonly signedTransactionInfo?: string;\n  readonly appAccountToken?: string;');
  s=s.replace('  private debugGrants = false;',`  private localPurchases?: LocalCoinStore;
  private localStore(): LocalCoinStore {
    return this.localPurchases ??= new LocalCoinStore(STORE_PRODUCTS, ALL_STORE_PRODUCTS, () => {
      const s=this.save.read(),p=s.currentUserId?s.players[s.currentUserId]:undefined;
      return p&&!p.isGuest?{id:p.id,token:p.appAccountToken}:null;
    }, (id,amount) => {
      if(this.save.currentScope()?.creditedPurchaseIds.includes(id))return 'duplicate';
      if(!this.economy.creditVerifiedPurchase(amount,id))throw Error('Unable to save purchased coins');
      if(!this.save.currentScope()?.creditedPurchaseIds.includes(id))throw Error('Purchase was not persisted');
      return 'new';
    });
  }
  private debugGrants = false;`);
  s=s.replaceAll('this.debugGrants = debugGrants;', 'this.debugGrants = debugGrants && !nativeBridge();');
  s=s.replaceAll('this.debugGrants = enabled;', 'this.debugGrants = enabled && !nativeBridge();');
  s=s.replace('Boolean(nativeBridge() && this.server)','Boolean(nativeBridge())');
  s=s.replace("if (!bridge || !this.server) return STORE_PRODUCTS.map", "if (!bridge) return STORE_PRODUCTS.map");
  s=s.replace('public async purchase(productId: string): Promise<StoreActionResult> {', 'public async purchase(productId: string): Promise<StoreActionResult> {\n    if (!this.server && nativeBridge()) return this.localStore().purchase(productId);');
  s=s.replace('public async restore(): Promise<StoreActionResult> {', 'public async restore(): Promise<StoreActionResult> {\n    if (!this.server && nativeBridge()) return this.localStore().restore();');
  // F29 accidentally reused F20 identifiers. Keep its economy, give it its own products.
  if(g.id===29)s=s.replaceAll('com.publisher.goldencanopy.coins','com.publisher.jadelanterncourt.coins');
  patch(file,s);
  console.log('F'+g.id+': local StoreKit source connected');
}
