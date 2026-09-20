import {createCredential,verifyCredential,PasswordCredential} from './credentials';
import {storageAdapter,selectProfile,currentProfile,load,save,defaultState} from './store';
export const CONSENT_VERSION='2026-09-18';
const KEY='f25.local-accounts.v1';
type Account={username:string;credential:PasswordCredential;acceptedAt:string;termsVersion:string;privacyVersion:string};
function accounts():Account[]{const raw=storageAdapter().getItem(KEY);if(!raw)return [];const data=JSON.parse(raw);if(!Array.isArray(data))throw Error('storage');return data}
export async function registerLocal(username:string,password:string,confirmation:string,nickname:string,accepted:boolean){
 username=username.trim().toLowerCase();nickname=nickname.trim();
 if(!/^[a-z0-9_]{3,18}$/.test(username))throw Error('username');
 if(password.length<10||password.length>72)throw Error('password');
 if(password!==confirmation)throw Error('mismatch');
 if(!nickname||nickname.length>18)throw Error('nickname');
 if(!accepted)throw Error('consent');
 let list=accounts();if(list.some(a=>a.username===username))throw Error('exists');
 const credential=await createCredential(password);
 // Re-read after the asynchronous derivation to avoid overwriting another local registration.
 list=accounts();if(list.some(a=>a.username===username))throw Error('exists');
 const record={username,credential,acceptedAt:new Date().toISOString(),termsVersion:CONSENT_VERSION,privacyVersion:CONSENT_VERSION};
 const old=currentProfile();try{selectProfile(username);const s={...defaultState(),name:nickname,loggedIn:true,consent:{version:CONSENT_VERSION,at:record.acceptedAt}};save(s);storageAdapter().setItem(KEY,JSON.stringify([...list,record]));return s}catch(e){storageAdapter().removeItem('f25.velvet.fortune.v1:'+username);selectProfile(old);throw e}
}
export async function loginLocal(username:string,password:string){
 const a=accounts().find(a=>a.username===username.trim().toLowerCase());if(!a||!await verifyCredential(password,a.credential))throw Error('invalid');
 const old=currentProfile();try{selectProfile(a.username);const s=load();s.loggedIn=true;save(s);return s}catch(e){selectProfile(old);throw e}
}
export function resumeGuest(){selectProfile('');return load()}
export function removeLocalAccount(){const id=currentProfile();if(!id)return;const list=accounts();storageAdapter().setItem(KEY,JSON.stringify(list.filter(a=>a.username!==id)));storageAdapter().removeItem('f25.velvet.fortune.v1:'+id);selectProfile('')}
