import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {games,patch} from './install.mjs';
for(const g of games){
 const dir=join(g.source,'assets/scripts/services'),file=join(dir,'StoreService.ts');if(!existsSync(file))continue;
 let s=readFileSync(file,'utf8');
 s=s.replace("(id,amount) => {\n      if(this.save.currentScope()?.creditedPurchaseIds.includes(id))return 'duplicate';", "(nativeId,amount) => {\n      const id='apple:'+nativeId,ledger=this.save.currentScope()?.creditedPurchaseIds;\n      if(ledger?.includes(id)||ledger?.includes(nativeId))return 'duplicate';\n      if(this.economy.balance()>1_000_000_000-amount)throw Error('Coin balance limit: spend coins before retrying this unfinished purchase');");
 patch(file,s);
 const economy=join(dir,'EconomyService.ts');s=readFileSync(economy,'utf8');s=s.replace(' data.creditedPurchaseIds = data.creditedPurchaseIds.slice(-500);','');patch(economy,s);
 const save=join(dir,'SaveService.ts');s=readFileSync(save,'utf8');s=s.replace("/^[A-Za-z0-9._:-]{3,160}$/.test(id)).slice(-500)","/^[A-Za-z0-9._:-]{3,160}$/.test(id))");patch(save,s);
 console.log('F'+g.id+': namespaced local purchase ledger, retained IDs, balance limit guard');
}
