import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore, STORAGE_KEY, SHOP_PACKS, DAILY_COINS, LANGUAGES, AVATARS, getRanks} from '../src/services.js';
import {languages, t} from '../src/i18n.js';

const memory=raw=>{
  const data=new Map(raw===undefined?[]:[[STORAGE_KEY,raw]]);
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),data};
};

test('defaults and corrupted storage recover to a playable English profile',()=>{
  for(const raw of [undefined,'{broken','null','[]','42',JSON.stringify({coins:-1,lang:'bad'})]){
    const store=createStore(memory(raw));
    assert.equal(store.state.coins,12000);
    assert.equal(store.state.lang,'en');
    assert.equal(store.state.pending,null);
  }
});

test('profile, avatar and four-language settings persist with detached state',()=>{
  const storage=memory(),store=createStore(storage);
  const snapshot=store.state;snapshot.coins=0;
  assert.equal(store.state.coins,12000);
  assert.equal(store.rename('  Crown Keeper  ').ok,true);
  assert.equal(store.setAvatar('diamond').ok,true);
  assert.equal(store.setSetting('lang','ja').ok,true);
  const restored=createStore(storage).state;
  assert.equal(restored.name,'Crown Keeper');
  assert.equal(restored.avatar,'diamond');
  assert.equal(restored.lang,'ja');
  assert.equal(AVATARS.length,8);
  assert.deepEqual(LANGUAGES,languages.map(language=>language.id));
});

test('spin debit and settlement are atomic and cannot pay twice',()=>{
  const store=createStore(memory());
  const begun=store.beginSpin('royal-mint',100,1250.5);
  assert.equal(begun.ok,true);
  assert.equal(store.state.coins,11900);
  assert.equal(store.beginSpin('crown-wheel',100,0).error,'spinPending');
  assert.equal(store.settleSpin('wrong').error,'spinMismatch');
  assert.equal(store.settleSpin(begun.id).ok,true);
  assert.equal(store.state.coins,13150.5);
  assert.equal(store.state.spins,1);
  assert.equal(store.state.keys,1);
  assert.equal(store.settleSpin(begun.id).error,'noPendingSpin');
});

test('pending spin restores exactly once after reload',()=>{
  const storage=memory(),store=createStore(storage);
  store.beginSpin('jade-treasury',200,700);
  assert.equal(store.state.coins,11800);
  const restored=createStore(storage);
  assert.equal(restored.state.coins,12500);
  assert.equal(restored.state.pending,null);
  assert.equal(createStore(storage).state.coins,12500);
});

test('daily reward and mail awards reject repeat claims',()=>{
  const storage=memory(),store=createStore(storage);
  assert.equal(store.claimDaily().amount,DAILY_COINS);
  assert.equal(store.claimDaily().error,'alreadyClaimed');
  assert.equal(store.claimMail('welcome').amount,1200);
  assert.equal(store.claimMail('welcome').error,'alreadyClaimed');
  assert.equal(createStore(storage).claimMail('welcome').error,'alreadyClaimed');
});

test('shop is clearly local-only and never grants coins without StoreKit',()=>{
  const store=createStore(memory()),before=store.state.coins;
  assert.deepEqual(SHOP_PACKS.map(pack=>pack.coins),[5000,14000,32000,75000]);
  assert.equal(store.purchase('purse').error,'nativeIAPNotice');
  assert.equal(store.state.coins,before);
});

test('ranking mixes one player with clearly identified example rivals',()=>{
  const store=createStore(memory());
  const rows=getRanks(store.state);
  assert.equal(rows.filter(row=>row.isPlayer).length,1);
  assert.equal(rows.filter(row=>row.example).length,15);
  assert.deepEqual(rows.map(row=>row.rank),Array.from({length:16},(_,i)=>i+1));
});

test('all languages provide the essential controls and four mode rules',()=>{
  const keys=['guest','apple','home','shop','gifts','rank','profile','spin','auto','rules','back','logout',
    'royal-mint-rule','jade-treasury-rule','diamond-foundry-rule','crown-wheel-rule'];
  for(const {id} of languages)for(const key of keys){
    const value=t(key,id);
    assert.ok(value&&value!==key,`${id}:${key}`);
  }
});
