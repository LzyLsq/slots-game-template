import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {games,patch} from './install.mjs';
export const customProducts={
  25:[['purse',10000,0,'0.99'],['bullion',30000,0,'4.99'],['chest',80000,0,'9.99'],['vault',200000,0,'19.99']],
  26:[['deckhand',20000,0,'0.99'],['captain',110000,0,'4.99'],['admiral',240000,0,'9.99'],['treasure',520000,0,'19.99']],
  27:[['purse',2500,0,'1.99'],['coffer',9000,0,'4.99'],['vault',25000,0,'9.99']],
  28:[['purse',10000,0,'0.99'],['bullion',50000,5000,'4.99'],['chest',120000,18000,'9.99'],['vault',300000,60000,'19.99']]
};
export function packs(g){return customProducts[g.id].map(([id,credits,bonus,price])=>({id,credits,bonus,appleProductId:`com.publisher.${g.slug.replace('_Cocos','').replaceAll('_','').toLowerCase()}.coins.${id}.v1`,label:id.toUpperCase(),debugPrice:'$'+price}));}
for(const g of games.filter(g=>[25,26,27,28].includes(g.id))){
  const dir=join(g.source,g.id===26?'src':'assets/scripts');
  const data=packs(g),products=`const LOCAL_PRODUCTS=${JSON.stringify(data)};\n`;
  if(g.id===25){
    const f=join(dir,'VelvetApp.ts');let s=readFileSync(f,'utf8');if(s.includes('private localIAP'))continue;
    s=s.replace("import {currentProfile} from './model/store';","import {currentProfile} from './model/store';\nimport {LocalCoinStore,deviceAccount} from './LocalCoinStore';\n"+products);
    s=s.replace(" art=new TheatreArt();",` private localIAP=new LocalCoinStore(LOCAL_PRODUCTS,LOCAL_PRODUCTS,()=>deviceAccount(sys.localStorage,'f25',currentProfile()||'guest'),(id,amount)=>{
   const scope=currentProfile(),fresh=load();
   if((fresh.purchaseIds||[]).includes(id))return 'duplicate';
   fresh.purchaseIds=[...(fresh.purchaseIds||[]),id];fresh.balance+=amount;record(fresh,'Apple purchase',amount);save(fresh);
   if(scope!==currentProfile())throw Error('Account changed');this.state=fresh;return 'new';
 });
 async purchaseCoins(id:string){const r=await this.localIAP.purchase(id);this.refreshWallet();this.toast(r.message);if(r.ok&&r.credited)this.coinFlight(360,700);}
 art=new TheatreArt();`);
    const old="this.confirm(t('get'),this.money(coins)+' '+t('balance'),()=>{this.state.balance+=coins;record(this.state,'Demo coins',coins);if(this.persist()){this.refreshWallet();this.coinFlight(360,700);this.toast(t('giftReceived'))}})";
    if(!s.includes(old))throw Error('F25 purchase callback changed');s=s.replace(old,"void this.purchaseCoins(LOCAL_PRODUCTS[i].id)");
    s=s.replace("label(p,t('storeNote'),42,337,636,72,21,C.ink);","label(p,phrase('Apple purchases · virtual coins · no cash value','Apple 内购 · 虚拟金币 · 不可提现'),42,337,636,72,21,C.ink);");
    s=s.replace("button(this.art,n,t('get'),24,238,259,55,()=>{", "const buy=button(this.art,n,'UNAVAILABLE',24,238,259,55,()=>{");
    s=s.replace(" },'ui4');\n });\n label(p,t('demo')+' · '+t('local'),36,1091,648,55,18,C.ink);",` },'ui4');
 void this.localIAP.catalog().then(items=>{const l=buy.getComponentsInChildren(Label).find(l=>l.string==='UNAVAILABLE');if(l&&l.isValid)l.string=items[i].available?'BUY · '+items[i].displayPrice:'UNAVAILABLE';});
 });
 button(this.art,p,'Sync unfinished purchases',36,1091,648,60,()=>void this.localIAP.restore().then(r=>{this.refreshWallet();this.toast(r.message)}),'ui4');`);
    s=s.replaceAll('Shop bundles are free demo grants.','Coin purchases require an Apple-verified payment in the iOS app.').replaceAll('This build has no real-money purchase processing.','Browser preview cannot make payments.').replaceAll('Shop grants are free demo coins. No real payment is taken and there is no purchase to restore in this build.','The iOS app uses Apple payments. Sync only recovers unfinished purchases; consumed coins cannot be restored.').replaceAll('商店礼包为免费演示金币。','iOS 应用中的购买须由 Apple 验证。').replaceAll('此版本不处理真实付款，','浏览器预览不处理付款，').replaceAll('商店发放免费演示金币，不会真实扣款，此版本没有可恢复的真实购买。','iOS 应用使用 Apple 内购；仅补发未完成的购买，已消耗金币不能恢复。');
    patch(f,s);
  }
  if(g.id===27){
    const state=join(dir,'PlayerState.ts');let s=readFileSync(state,'utf8');
    if(!s.includes('purchaseIds:string[]')){s=s.replace('  balance:number;', '  purchaseIds:string[];balance:number;').replace('const DEFAULT:PlayerStateData={','const DEFAULT:PlayerStateData={purchaseIds:[],');
      s=s.replace('  credit(amount:number)',`  grantPurchase(id:string,amount:number):'new'|'duplicate'{
    if(this.data.purchaseIds.includes(id))return 'duplicate';
    const draft={...this.data,purchaseIds:[...this.data.purchaseIds,id],balance:this.data.balance+amount};
    sys.localStorage.setItem(KEY,JSON.stringify(draft));this.data=draft;return 'new';
  }
  credit(amount:number)`);patch(state,s);}
    const f=join(dir,'SovereignApp.ts');s=readFileSync(f,'utf8');if(s.includes('private localIAP'))continue;
    s="import {LocalCoinStore,deviceAccount} from './LocalCoinStore';\n"+products+s;
    s=s.replace('  private art=new ArtBank();',`  private localIAP=new LocalCoinStore(LOCAL_PRODUCTS,LOCAL_PRODUCTS,()=>deviceAccount(sys.localStorage,'f27','guest'),(id,amount)=>this.player.grantPurchase(id,amount));
  private art=new ArtBank();`);
    s=s.replace('this.player.credit(Number(coins));this.refreshBalances();this.toast(`+${Number(coins).toLocaleString()} coins · local demo`);',"void this.localIAP.purchase(LOCAL_PRODUCTS[i].id).then(r=>{this.refreshBalances();this.toast(r.message);});");
    s=s.replace("`${tr(this.player.data.locale,'buy')} · ${price}`","'BUY · UNAVAILABLE'");
    s=s.replace('});});this.nav(root,\'store\');',`});});
    this.smallButton(stage,'Sync unfinished purchases',0,-490,690,68,()=>void this.localIAP.restore().then(r=>{this.refreshBalances();this.toast(r.message);}));
    void this.localIAP.catalog().then(items=>{const labels=stage.getComponentsInChildren(Label).filter(l=>l.string==='BUY · UNAVAILABLE');labels.forEach((l,i)=>{if(l.isValid)l.string=items[i]?.available?'BUY · '+items[i].displayPrice:'UNAVAILABLE';});});
    this.nav(root,'store');`);
    s=s.replaceAll('Apple Sign-In and StoreKit remain unavailable until native capabilities and production services are configured.','The iOS app uses Apple-verified coin purchases. Guest progress is device-local. Consumed coins cannot be restored.');
    patch(f,s);
    const c=join(dir,'Copy.ts');s=readFileSync(c,'utf8').replaceAll('DEMO BUY','BUY').replaceAll('LOCAL DEMO · STOREKIT NOT CONNECTED','APPLE PURCHASES · DEVICE-LOCAL SAVE').replaceAll('デモ購入','購入').replaceAll('本地演示 · STOREKIT 未接入','APPLE 内购 · 本地存档');patch(c,s);
  }
  if(g.id===28){
    const wf=join(dir,'core/Wallet.ts');let s=readFileSync(wf,'utf8');if(!s.includes('purchaseIds: string[]')){
      s=s.replace('  schema: 1;', '  purchaseIds: string[];\n  schema: 1;').replace('({ schema: 1,','({ purchaseIds: [], schema: 1,');
      s=s.replace('  const s: WalletState = JSON.parse(raw);','  const s: WalletState = JSON.parse(raw);\n  if(s && s.purchaseIds===undefined)s.purchaseIds=[];\n  if(!Array.isArray(s.purchaseIds)||s.purchaseIds.some(id=>!/^\\d{1,40}$/.test(id)))throw Error("Invalid purchase ledger");');
      s=s.replace('  snapshot(): WalletState',`  grantPurchase(id:string,amount:number):'new'|'duplicate' {
    if(this.state.purchaseIds.includes(id))return 'duplicate';
    this.commit(s=>{s.balance+=amount;s.purchaseIds.push(id);});return 'new';
  }
  snapshot(): WalletState`);patch(wf,s);
    }
    const f=join(dir,'RegattaApp.ts');s=readFileSync(f,'utf8');if(s.includes('private localIAP'))continue;
    s="import {LocalCoinStore,deviceAccount} from './LocalCoinStore';\n"+products+s;
    s=s.replace('  private wallet!: Wallet;',`  private localIAP=new LocalCoinStore(LOCAL_PRODUCTS,LOCAL_PRODUCTS,()=>deviceAccount(sys.localStorage,'f28','guest'),(id,amount)=>this.wallet.grantPurchase(id,amount));
  private wallet!: Wallet;`);
    s=s.replace("text(book, 'Store unavailable.\\n\\nNo payment will\\nbe taken.\\n\\nDaily provisions\\nare free to collect.', 235, 20, 365, 37, INK, 420);",`LOCAL_PRODUCTS.forEach((p,i)=>{
        const buy=this.action(book,(p.credits+p.bonus).toLocaleString()+' coins · UNAVAILABLE',235,200-i*128,390,110,()=>void this.localIAP.purchase(p.id).then(r=>{this.dialog(r.ok?'Purchase delivered':'Purchase status',r.message);}), 'control-market');
        void this.localIAP.catalog().then(items=>{const l=buy.getComponentsInChildren(Label).find(l=>l.string.includes('UNAVAILABLE'));if(l&&l.isValid)l.string=(p.credits+p.bonus).toLocaleString()+' coins · '+items[i].displayPrice;});
      });`);
    s=s.replace("'Restore purchases', 235, -315, 390, 120, () => this.dialog('Store unavailable', 'No store account or purchase service is connected.\\nThere are no purchases to restore in this build.')", "'Sync purchases', 235, -350, 390, 105, () => void this.localIAP.restore().then(r=>this.dialog('Purchase status',r.message))");
    s=s.replaceAll('No purchases are enabled in this build.','Apple-verified coin purchases are available inside the iOS app. Consumed coins cannot be restored.').replaceAll('No account, analytics or purchase service is connected.','No remote account server or analytics is connected. Apple processes purchases in the iOS app.');patch(f,s);
  }
  if(g.id===26){
    // The same audited bridge adapter is JavaScript in this non-Cocos title.
    const r=await import(join(games.find(p=>p.id===20).source,'node_modules/typescript/lib/typescript.js'));
    const ts=r.default||r;patch(join(dir,'local-iap.js'),ts.transpileModule(readFileSync(join(import.meta.dirname,'LocalCoinStore.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
    const f=join(dir,'services.js');let s=readFileSync(f,'utf8');if(!s.includes('purchaseIds: []')){
      s=s.replace('return { version: 1,','return { purchaseIds: [], version: 1,').replace('  const state = freshState();','  const state = freshState();\n  if(Array.isArray(raw?.purchaseIds))state.purchaseIds=raw.purchaseIds.filter(id=>typeof id===\'string\'&&/^\\d{1,40}$/.test(id));');
      s=s.replace("    purchase() { return fail('nativeIAPNotice'); },",`    grantPurchase(id,amount) {
      if(current.purchaseIds.includes(id))return 'duplicate';
      if(!storage||!Number.isSafeInteger(amount)||amount<=0)throw Error('Invalid purchase save');
      const next=clone(current);next.coins+=amount;next.purchaseIds.push(id);
      if(!validAmount(next.coins))throw Error('Balance limit');
      storage.setItem(storageKey,JSON.stringify(next));current=next;persistent=true;
      for(const l of listeners)try{l(clone(current));}catch{}
      return 'new';
    },
    purchase() { return fail('nativeIAPNotice'); },`);patch(f,s);
    }
    const af=join(dir,'app.js');s=readFileSync(af,'utf8');if(s.includes('const localIAP='))continue;
    s="import {LocalCoinStore,deviceAccount} from './local-iap.js';\n"+products+s;
    const at=s.indexOf('\n',s.indexOf('const auth=createAuth()'));
    s=s.slice(0,at)+"\nconst localIAP=new LocalCoinStore(LOCAL_PRODUCTS,LOCAL_PRODUCTS,()=>auth.current?deviceAccount(localStorage,'f26',auth.current.id):null,(id,amount)=>store.grantPurchase(id,amount));\n"+s.slice(at);
    s=s.replace("if(b.dataset.pack){toast(tr(store.purchase(b.dataset.pack).error));return;}","if(b.dataset.pack){b.disabled=true;void localIAP.purchase(b.dataset.pack).then(r=>{toast(r.message);if(page==='shop')render();}).finally(()=>b.disabled=false);return;}if(b.dataset.action==='sync-purchases'){void localIAP.restore().then(r=>{toast(r.message);if(page==='shop')render();});return;}");
    s=s.replace("<h2>${tr('catalogOnly')}</h2><p>${tr('nativeIAPNotice')}</p>","<h2>${tr('shop')}</h2><p>Apple purchases · virtual coins · no cash value</p>");
    s=s.replace("<p class=\"fineprint\">${tr('noCashValue')}</p></main>`;}","<button data-action=\"sync-purchases\">Sync unfinished purchases</button><p class=\"fineprint\">${tr('noCashValue')}</p></main>`;}");
    // Resolve actual StoreKit prices after each shop render without rebuilding the page.
    const marker='function pageShop(){';s=s.replace(marker,`function updateStorePrices(){void localIAP.catalog().then(items=>{if(page!=='shop')return;for(const p of items){const el=document.querySelector('[data-pack="'+p.id+'"] em');if(el)el.textContent=p.displayPrice;}});}
${marker}`);
    s=s.replace('function pageShop(){return ',"function pageShop(){queueMicrotask(updateStorePrices);return ");patch(af,s);
  }
  console.log('F'+g.id+': custom shop connected');
}
