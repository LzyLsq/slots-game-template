export const STORAGE_KEY='f27.sovereign-wealth.player.v1';
const clone=value=>structuredClone(value);
const dayNumber=()=>Math.floor(Date.now()/86400000);
const validAmount=n=>Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
const money=n=>Math.round((n+Number.EPSILON)*1000)/1000;
export const LANGUAGES=Object.freeze(['en','zh-CN','es','ja']);
export const DAILY_COINS=1500;
export const SHOP_PACKS=Object.freeze([
  {id:'purse',coins:5000,price:'$0.99'},{id:'coffer',coins:14000,price:'$2.99'},
  {id:'vault',coins:32000,price:'$5.99'},{id:'crown',coins:75000,price:'$12.99'},
]);
const avatars=Object.freeze(['crown','lion','jade','diamond','scepter','mint','wheel','treasury']);
const defaultMail=()=>[
  {id:'welcome',title:'The Treasury Opens',body:'Welcome to Sovereign Wealth. Accept this ceremonial purse to begin.',coins:1200,read:false,claimed:false},
  {id:'mint-note',title:'Master of the Mint',body:'Five fixed lines make every Royal Mint result easy to verify.',coins:600,read:false,claimed:false},
  {id:'gallery',title:'Gallery Invitation',body:'Your account, rewards and example ranking share one protected balance.',coins:0,read:false,claimed:false},
];
const fresh=()=>({coins:12000,name:'Royal Guest',lang:'en',sound:true,reducedMotion:false,avatar:'crown',dailyLast:-1,dailyClaims:0,
  mail:defaultMail(),spins:0,totalBet:0,totalWin:0,bestWin:0,keys:0,pending:null,version:1});
function normalize(raw){
  const base=fresh();if(!raw||typeof raw!=='object')return base;
  if(validAmount(raw.coins))base.coins=money(raw.coins);
  if(typeof raw.name==='string'&&raw.name.trim()&&[...raw.name.trim()].length<=20)base.name=raw.name.trim();
  if(LANGUAGES.includes(raw.lang))base.lang=raw.lang;
  if(typeof raw.sound==='boolean')base.sound=raw.sound;if(typeof raw.reducedMotion==='boolean')base.reducedMotion=raw.reducedMotion;
  if(avatars.includes(raw.avatar))base.avatar=raw.avatar;
  for(const key of ['dailyLast','dailyClaims','spins','keys'])if(Number.isSafeInteger(raw[key]))base[key]=Math.max(-1,raw[key]);
  for(const key of ['totalBet','totalWin','bestWin'])if(validAmount(raw[key]))base[key]=money(raw[key]);
  if(Array.isArray(raw.mail))for(const item of base.mail){const saved=raw.mail.find(x=>x?.id===item.id);if(saved){item.read=saved.read===true;item.claimed=saved.claimed===true;}}
  if(raw.pending&&typeof raw.pending==='object'&&validAmount(raw.pending.win)){
    base.coins=money(base.coins+raw.pending.win);base.totalWin=money(base.totalWin+raw.pending.win);base.bestWin=Math.max(base.bestWin,raw.pending.win);base.pending=null;
  }
  return base;
}
function localStorageSafe(){try{return globalThis.localStorage||null}catch{return null}}
export function createStore(storage=localStorageSafe(),key=STORAGE_KEY){
  let state=fresh(),persistent=Boolean(storage);try{state=normalize(JSON.parse(storage?.getItem(key)||'null'))}catch{state=fresh()}
  const listeners=new Set();
  const save=()=>{try{storage?.setItem(key,JSON.stringify(state));persistent=Boolean(storage)}catch{persistent=false}for(const fn of listeners)try{fn(clone(state))}catch{}}
  const fail=error=>({ok:false,error});
  const commit=fn=>{const next=clone(state),result=fn(next);if(!result.ok)return result;state=next;save();return {...result,persistent}};
  save();
  return {
    get state(){return clone(state)},get persistent(){return persistent},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
    rename(name){return typeof name==='string'&&name.trim()&&[...name.trim()].length<=20?commit(s=>{s.name=name.trim();return{ok:true}}):fail('invalidName')},
    setSetting(setting,value){return commit(s=>{
      if(setting==='lang'){if(!LANGUAGES.includes(value))return fail('invalidSetting');s.lang=value;}
      else if(['sound','reducedMotion'].includes(setting)&&typeof value==='boolean')s[setting]=value;
      else return fail('invalidSetting');return{ok:true};
    })},
    setAvatar(avatar){return avatars.includes(avatar)?commit(s=>{s.avatar=avatar;return{ok:true}}):fail('invalidAvatar')},
    beginSpin(modeId,bet,win){if(typeof modeId!=='string'||!validAmount(bet)||bet<=0||!validAmount(win))return fail('invalidSpin');return commit(s=>{
      if(s.pending)return fail('spinPending');bet=money(bet);if(s.coins<bet)return fail('insufficientCoins');
      s.coins=money(s.coins-bet);s.spins+=1;s.totalBet=money(s.totalBet+bet);const id=`${Date.now()}-${s.spins}`;s.pending={id,modeId,bet,win:money(win)};return{ok:true,id,coins:s.coins};
    })},
    settleSpin(id){return commit(s=>{if(!s.pending)return fail('noPendingSpin');if(s.pending.id!==id)return fail('spinMismatch');
      const win=s.pending.win;if(!validAmount(s.coins+win))return fail('balanceLimit');s.coins=money(s.coins+win);s.totalWin=money(s.totalWin+win);s.bestWin=Math.max(s.bestWin,win);if(win>=s.pending.bet*10)s.keys=Math.min(4,s.keys+1);s.pending=null;return{ok:true,win,coins:s.coins};
    })},
    canClaimDaily(){return state.dailyLast<dayNumber()},claimDaily(){return commit(s=>{const day=dayNumber();if(s.dailyLast>=day)return fail('alreadyClaimed');s.dailyLast=day;s.dailyClaims+=1;s.coins=money(s.coins+DAILY_COINS);return{ok:true,amount:DAILY_COINS}})},
    markRead(id){return commit(s=>{const item=s.mail.find(x=>x.id===id);if(!item)return fail('mailMissing');item.read=true;return{ok:true}})},
    claimMail(id){return commit(s=>{const item=s.mail.find(x=>x.id===id);if(!item)return fail('mailMissing');if(item.claimed)return fail('alreadyClaimed');item.read=true;item.claimed=true;s.coins=money(s.coins+item.coins);return{ok:true,amount:item.coins}})},
    purchase(){return fail('nativeIAPNotice')},reset(){state=fresh();save();return{ok:true}},
  };
}
export function getRanks(player){
  const examples=[
    ['Ruby Regent',486400],['Jade Chancellor',421800],['Diamond Envoy',378200],['Golden Laureate',319600],['Velvet Duchess',284900],
    ['Mintmaster Leo',242500],['Crown Curator',208700],['Emerald Keeper',179400],['Sapphire Herald',151300],['Ivory Treasurer',126800],
    ['Royal Falcon',104200],['Gilded Scribe',85600],['Pearl Ambassador',69200],['Coinwright',53100],['Laurel Knight',38600],
  ].map(([name,coins])=>({name,coins,example:true,isPlayer:false}));
  return [...examples,{name:player.name,coins:player.coins,example:false,isPlayer:true}].sort((a,b)=>b.coins-a.coins).map((row,i)=>({...row,rank:i+1}));
}
export const AVATARS=avatars;
