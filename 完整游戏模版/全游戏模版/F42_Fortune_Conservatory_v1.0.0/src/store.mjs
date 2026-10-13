import {newProfile,validateProfile} from './model.mjs';
export class ProfileStore{
 constructor(){this.db=null;this.profile=null;this.events=new EventTarget();this.channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('f42-estate'):null;this.channel?.addEventListener('message',()=>this.refresh().catch(console.error));}
 async open(){
  this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('f42-fortune-conservatory',1);r.onupgradeneeded=()=>{r.result.createObjectStore('profiles',{keyPath:'id'});r.result.createObjectStore('meta');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('请关闭旧版本游戏后重试'));});
  this.db.onversionchange=()=>this.db.close();await this.refresh();return this.profile;
 }
 async read(store,key){return new Promise((resolve,reject)=>{const r=this.db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async refresh(){if(!this.db)return;const id=await this.read('meta','active');this.profile=id?await this.read('profiles',id):null;if(this.profile)validateProfile(this.profile);this.events.dispatchEvent(new Event('change'));return this.profile;}
 async profiles(){return new Promise((resolve,reject)=>{const r=this.db.transaction('profiles').objectStore('profiles').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async enter(id,name){
  await new Promise((resolve,reject)=>{const t=this.db.transaction(['profiles','meta'],'readwrite'),s=t.objectStore('profiles'),r=s.get(id);r.onsuccess=()=>{if(!r.result)s.put(newProfile(id,name));t.objectStore('meta').put(id,'active');};t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});
  this.channel?.postMessage('enter');return this.refresh();
 }
 async update(mutator){
  const id=this.profile?.id;if(!id)throw new Error('请先进入财苑');let output,error;
  await new Promise((resolve,reject)=>{const t=this.db.transaction('profiles','readwrite'),s=t.objectStore('profiles'),r=s.get(id);r.onsuccess=()=>{try{const p=validateProfile(r.result);output=mutator(p);validateProfile(p);s.put(p);}catch(e){error=e;t.abort();}};t.oncomplete=resolve;t.onerror=()=>reject(error||t.error);t.onabort=()=>reject(error||t.error||new Error('保存失败，未扣除金币'));});
  await this.refresh();this.channel?.postMessage('update');return output;
 }
 async logout(){await new Promise((resolve,reject)=>{const t=this.db.transaction('meta','readwrite');t.objectStore('meta').delete('active');t.oncomplete=resolve;t.onerror=()=>reject(t.error);});await this.refresh();this.channel?.postMessage('logout');}
 async removeCurrent(){const id=this.profile?.id;if(!id)return;await new Promise((resolve,reject)=>{const t=this.db.transaction(['profiles','meta'],'readwrite');t.objectStore('profiles').delete(id);t.objectStore('meta').delete('active');t.oncomplete=resolve;t.onerror=()=>reject(t.error);});await this.refresh();this.channel?.postMessage('delete');}
}
