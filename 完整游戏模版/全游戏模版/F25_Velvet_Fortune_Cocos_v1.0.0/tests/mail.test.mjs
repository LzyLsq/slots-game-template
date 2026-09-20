import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,claimMail,save,load} from '../assets/scripts/model/store.ts';
test('mail attachment can be claimed once and survives local save',()=>{let stored=null;globalThis.localStorage={setItem:(_,value)=>stored=value,getItem:()=>stored};const s=defaultState();assert.equal(claimMail(s,'welcome-25').coins,2000);save(s);const restored=load();assert.equal(restored.balance,42000);assert.equal(claimMail(restored,'welcome-25'),false);assert.equal(restored.balance,42000);assert.equal(restored.history.length,1);});
test('information mail and invalid ids never create credits',()=>{const s=defaultState();assert.equal(claimMail(s,'rules-25').coins,0);assert.equal(claimMail(s,'unknown'),false);assert.equal(s.balance,40000);assert.equal(s.history.length,0);});
test('older saves migrate mail state without losing wallet',()=>{const s=defaultState();delete s.mailClaims;s.balance=51234;globalThis.localStorage={getItem:()=>JSON.stringify(s)};const restored=load();assert.deepEqual(restored.mailClaims,[]);assert.equal(restored.balance,51234);});
