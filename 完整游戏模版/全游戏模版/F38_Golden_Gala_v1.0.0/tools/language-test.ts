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

for(const {code} of LANGUAGES.filter(l=>l.code!=='en')){setLanguage(code);
 for(const source of ['Sign in to the Golden Gala','Begin your treasure journey','APPLE · UNAVAILABLE','Virtual coins · No cash prizes · Adults only'])assert.notEqual(tr(source),source,'F38 auth copy translated in '+code);
}
setLanguage('en');console.log('PASS F38 boarding subtitle, Apple availability and adult virtual-coin notice translations.');

const serviceCopy=['Edit nickname','Nickname could not be saved.','Treasury membership terms','Letter','Slots','WALLET','Coin journal','Account options','VIRTUAL COIN SUPPLIES','PREVIEW · PURCHASES NOT CONNECTED','PREVIEW ONLY','Virtual coins only · No withdrawals or cash prizes','Native purchases and server verification are not configured.','VIRTUAL FRIENDS · TOTAL COINS WON','PLAYERS · TOTAL COINS WON','BACK TO THE CARAVAN','DEPARTURE','OASIS','BAZAAR','CROWN PORT','COLLECT','DAILY GIFT COLLECTED','Journey rewards never change slot odds · No cash value','Journey rewards are available in local preview only.','Already collected.','Next daily gift at 00:00 UTC.'];
const friendCopy=['Caravan Captain','Oasis Treasurer','Bazaar Goldsmith','Crown Navigator','Desert Prospector','Vault Curator','Ruby Collector','Harbour Merchant'];
for(const {code} of LANGUAGES){setLanguage(code);
 for(const source of [...serviceCopy,...friendCopy]){
  const result=tr(source);if(code==='en')assert.equal(result,source);else assert.notEqual(result,source,'F38 services localized: '+code+' '+source);
 }
 for(const [source,numbers] of [
  ['CARAVAN PASSPORT · 3 / 4 STAMPS',['3','4']],
  ['+1,600 virtual coins',['1,600']],
  ['+1,600 coins · Journey reward',['1,600']],
  ['Complete 12 rounds and visit 2 lands. No extra bet required.',['12','2']],
 ] as const){const result=tr(source);for(const number of numbers)assert(result.includes(number));if(code!=='en')assert.notEqual(result,source);}
}
setLanguage('zh-CN');
assert.equal(tr('PREVIEW · PURCHASES NOT CONNECTED'),'预览模式 · 尚未接入购买');
assert.equal(tr('CARAVAN PASSPORT · 3 / 4 STAMPS'),'商队护照 · 3 / 4 枚印章');
assert(tr('Virtual coins only · No withdrawals or cash prizes').includes('不可提现'));
assert(tr('Journey rewards never change slot odds · No cash value').includes('不改变转轴概率'));
setLanguage('en');console.log('PASS F38 service pages, journey counts, honest preview/no-cash copy and localized virtual caravan companions.');
