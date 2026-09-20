// @ts-nocheck
let storage:any=typeof localStorage==='undefined'?null:localStorage;
export function configureStorage(adapter:any){storage=adapter}
export function storageAdapter(){return storage||globalThis.localStorage}
export function currentProfile(){return storageAdapter().getItem('f25.active-profile')||''}
export function selectProfile(id:string){if(id)storageAdapter().setItem('f25.active-profile',id);else storageAdapter().removeItem('f25.active-profile')}
function profileKey(){const id=currentProfile();return KEY+(id?':'+id:'')}
const KEY='f25.velvet.fortune.v1';
export const defaultState=()=>({version:1,name:'Royal Guest',avatar:0,balance:40000,won:0,spins:0,biggest:0,bet:100,mode:0,loggedIn:false,lang:'en',sound:false,motion:true,claims:[],mailClaims:[],dailyGift:'',history:[],pending:null});
export function normalizeState(s){
 if(!s||s.version!==1||!Number.isSafeInteger(s.balance)||s.balance<0)throw Error('Invalid save');
 const d={...defaultState(),...s};d.name=typeof d.name==='string'?d.name.trim().slice(0,18)||'Royal Guest':'Royal Guest';
 d.avatar=Number.isInteger(d.avatar)?Math.max(0,Math.min(15,d.avatar)):0;d.mode=Number.isInteger(d.mode)?Math.max(0,Math.min(3,d.mode)):0;
 d.bet=[50,100,250,500,1000,2500].includes(d.bet)?d.bet:100;
 d.lang=['en','zh','zh-TW','ja','ko'].includes(d.lang)?d.lang:'en';
 for(const k of ['won','spins','biggest'])d[k]=Number.isSafeInteger(d[k])&&d[k]>=0?d[k]:0;
 for(const k of ['loggedIn','sound','motion'])d[k]=typeof d[k]==='boolean'?d[k]:defaultState()[k];
 d.claims=Array.isArray(d.claims)?Array.from(new Set(d.claims.filter(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)))):[];
 d.mailClaims=Array.isArray(d.mailClaims)?Array.from(new Set(d.mailClaims.filter(v=>typeof v==='string'))):[];
 d.dailyGift=typeof d.dailyGift==='string'?d.dailyGift:'';
 d.history=Array.isArray(d.history)?d.history.filter(h=>h&&typeof h.label==='string'&&Number.isFinite(h.at)&&Number.isFinite(h.amount)).slice(0,30):[];
 if(d.pending&&(!Number.isSafeInteger(d.pending.total)||d.pending.total<0||!Number.isSafeInteger(d.pending.bet)||d.pending.bet<0||d.pending.total>d.pending.bet*1000))d.pending=null;
 return d;
}
export function load(){try{return normalizeState(JSON.parse((storage||globalThis.localStorage).getItem(profileKey())))}catch{return defaultState()}}
export function save(s){(storage||globalThis.localStorage).setItem(profileKey(),JSON.stringify(s))}
export function dateKey(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}
export function record(s,label,amount){s.history.unshift({label,amount,at:Date.now()});s.history=s.history.slice(0,30)}
export const DAILY=[1000,1500,2000,2500,3000,5000,10000];
export function claim(s){const today=dateKey();if(s.claims.includes(today))return false;const day=s.claims.length%7;s.balance+=DAILY[day];s.claims.push(today);record(s,'Daily check-in',DAILY[day]);return DAILY[day]}
export function settle(s){if(!s.pending)return 0;const r=s.pending;s.balance+=r.total;s.won+=r.total;s.biggest=Math.max(s.biggest,r.total);s.spins++;record(s,'Spin settlement',r.total-r.bet);s.pending=null;return r.total}
export function startRound(s,r){if(s.pending||s.balance<r.bet)throw Error('Round unavailable');s.balance-=r.bet;s.pending=r;return r}

export const MAIL=[{id:'welcome-25',en:'Your theatre invitation',zh:'剧院迎宾礼',coins:2000},{id:'rules-25',en:'Four stages, four rule sets',zh:'四个舞台，四套规则',coins:0}];
export function claimMail(s,id){const m=MAIL.find(m=>m.id===id);if(!m||s.mailClaims.includes(id))return false;s.mailClaims.push(id);s.balance+=m.coins;if(m.coins)record(s,'Mailbox gift',m.coins);return m;}
