/** Device-local accounts. This is not a cloud identity or purchase authority. */
export const AUTH_KEY='fortune-tides:accounts:v1';
export const GUEST_KEY='fortune-tides:v1';
export const saveKey=id=>id==='guest'?GUEST_KEY:`fortune-tides:player:${id}`;
const fail=error=>({ok:false,error});
async function credential(password,salt){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(salt),iterations:210000,hash:'SHA-256'},key,256);
 return Array.from(new Uint8Array(bits)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createAuth(storage){
 if(!storage)try{storage=globalThis.localStorage;}catch{}
 let data={users:[],current:null};
 try{const raw=JSON.parse(storage?.getItem(AUTH_KEY)||'null');if(raw&&Array.isArray(raw.users)){data.users=raw.users.filter(u=>u&&typeof u.id==='string'&&typeof u.username==='string'&&typeof u.hash==='string'&&Array.isArray(u.salt));data.current=raw.current==='guest'||data.users.some(u=>u.id===raw.current)?raw.current:null;}}catch{}
 function write(next){try{if(!storage)throw Error();storage.setItem(AUTH_KEY,JSON.stringify(next));data=next;return {ok:true};}catch{return fail('authStorage');}}
 return {
 get current(){const u=data.users.find(u=>u.id===data.current);return data.current==='guest'?{id:'guest',username:'',guest:true}:u?{id:u.id,username:u.username,guest:false}:null;},
 guest(){return write({...data,current:'guest'});},
 logout(){return write({...data,current:null});},
 async register(username,password,confirm){
 username=String(username||'').trim();
 if(!/^[a-zA-Z0-9_]{3,18}$/.test(username))return fail('authUsernameHint');
 if(typeof password!=='string'||password.length<10||password.length>72)return fail('authPasswordHint');
 if(password!==confirm)return fail('authMismatch');
 if(data.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return fail('authExists');
 try{const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)));const user={id:crypto.randomUUID(),username,salt,hash:await credential(password,salt)};return write({users:[...data.users,user],current:user.id});}catch{return fail('authStorage');}
 },
 async login(username,password){
 const u=data.users.find(u=>u.username.toLowerCase()===String(username).trim().toLowerCase());
 try{if(!u||typeof password!=='string'||password.length>72||await credential(password,u.salt)!==u.hash)return fail('authInvalid');return write({...data,current:u.id});}catch{return fail('authStorage');}
 },
 async deleteCurrent(password){
 const id=data.current;if(!id)return fail('authInvalid');
 const u=data.users.find(u=>u.id===id);
 try{if(u&&await credential(password,u.salt)!==u.hash)return fail('authInvalid');
 const result=write({users:data.users.filter(u=>u.id!==id),current:null});if(!result.ok)return result;
 storage.removeItem(saveKey(id));return {ok:true};}catch{return fail('authStorage');}
 }
 };
}
