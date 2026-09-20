import {test} from 'node:test';import assert from 'node:assert/strict';
import {createAuth,AUTH_KEY,saveKey} from '../src/auth.js';
import {createStore,STORAGE_KEY} from '../src/services.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('account registration, logout and reload restore only the correct independent save',async()=>{
 const s=memory(),auth=createAuth(s);const old=createStore(s);old.rename('Old guest');old.recordSpin(100,777);auth.guest();assert.equal(createStore(s,saveKey(auth.current.id)).state.coins,40677);auth.logout();assert.equal(createAuth(s).current,null);
 assert.equal((await auth.register('captain_one','StrongPass123','StrongPass123')).ok,true);const id=auth.current.id;
 const account=createStore(s,saveKey(id));assert.equal(account.state.coins,40000);account.recordSpin(100,250);auth.logout();
 assert.equal((await auth.login('captain_one','wrong')).ok,false);assert.equal(auth.current,null);
 assert.equal((await auth.login('CAPTAIN_ONE','StrongPass123')).ok,true);assert.equal(createStore(s,saveKey(id)).state.coins,40150);assert.equal(createAuth(s).current.id,id);
 assert.equal(s.getItem(AUTH_KEY).includes('StrongPass123'),false);auth.logout();auth.guest();assert.equal(createStore(s,STORAGE_KEY).state.name,'Old guest');
});
test('registration validation and protected account deletion preserve other accounts',async()=>{
 const s=memory(),a=createAuth(s);assert.equal((await a.register('x','short','short')).ok,false);
 assert.equal((await a.register('captain','StrongPass123','different')).error,'authMismatch');
 await a.register('captain','StrongPass123','StrongPass123');const id=a.current.id;createStore(s,saveKey(id)).rename('One');
 assert.equal((await a.register('CAPTAIN','StrongPass123','StrongPass123')).error,'authExists');
 assert.equal((await a.deleteCurrent('wrong')).ok,false);assert.equal(a.current.id,id);
 assert.equal((await a.deleteCurrent('StrongPass123')).ok,true);assert.equal(a.current,null);assert.equal(s.getItem(saveKey(id)),null);assert.equal((await a.login('captain','StrongPass123')).ok,false);
});
test('storage failure never reports a successful login or logout',async()=>{
 const a=createAuth({getItem:()=>null,setItem:()=>{throw Error('blocked')}});assert.equal(a.guest().error,'authStorage');assert.equal(a.current,null);
});
