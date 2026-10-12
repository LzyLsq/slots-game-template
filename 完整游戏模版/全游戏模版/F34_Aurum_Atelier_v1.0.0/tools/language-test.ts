import assert from 'node:assert/strict';
import {LANGUAGES,initializeLanguage,resolveLanguage,setLanguage,tr,translations} from '../assets/scripts/ui/Language';
assert.equal(resolveLanguage('zh-Hant-HK'),'zh-TW');assert.equal(resolveLanguage('ko-KR'),'ko');assert.equal(resolveLanguage('fr-FR'),'en');
for(const [key,values] of Object.entries(translations)){assert.equal(values.length,4,key);for(const value of values){assert.ok(value.trim(),key);assert.deepEqual(value.match(/\{\d+\}/g)?.sort()??[],key.match(/\{\d+\}/g)?.sort()??[],key);}}
for(const {code} of LANGUAGES){setLanguage(code);assert.ok(tr('SPIN'));assert.ok(tr('WIN  123,456').includes('123,456'));assert.ok(tr('CLAIM DAY 7 · 12,000').includes('12,000'));assert.equal(tr('玩家🍀 987'),'玩家🍀 987');assert.equal(tr('1,024'),'1,024');}
setLanguage('zh-CN');assert.equal(tr('Choose\nportrait'),'选择头像');assert.equal(tr('WIN  123,456'),'获奖 123,456');assert.equal(tr('DAY 7 · COLLECTED'),'第 7 天 · 已领取');assert.equal(tr('Base 5,000 · Gift 0'),'基础 5,000 · 赠送 0');assert.equal(tr('0 recorded entries · Saved to your account'),'0条记录 · 已保存到账户');assert.equal(tr('Password'),'密码');
console.log('Five languages: dictionary, number preservation, fallback and dynamic messages passed.');

const saved=new Map<string,string>();
const deviceStorage={getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>{saved.set(k,v);}};
initializeLanguage(deviceStorage);assert.equal(tr('SPIN'),'SPIN');
setLanguage('ko');initializeLanguage(deviceStorage);assert.equal(tr('SPIN'),'스핀');
saved.clear();initializeLanguage(deviceStorage);assert.equal(tr('SPIN'),'SPIN');
initializeLanguage({getItem:()=>{throw new Error('Storage unavailable');},setItem:()=>{}});assert.equal(tr('SPIN'),'SPIN');
console.log('English first-use default, saved language retention and unavailable storage passed.');
