import {recordingKeys,musicKey} from './SoundtrackCatalog';
export interface RecordingLibrary {
 get(key:string):AudioBuffer|undefined;
 warm(scene:string,context?:AudioContext,onMusicReady?:()=>void):Promise<void>;
 clear():void;
 diagnostics?():{decoded:number;failures:number;lastError:string};
}
/** Same-origin AAC assets. Decode once, limit music memory and never defer a button
 * click until a network request completes. The engine owns all playback/lifecycle. */
export class FileRecordingLibrary implements RecordingLibrary {
 private buffers=new Map<string,AudioBuffer>();private bytes=new Map<string,Promise<ArrayBuffer|undefined>>();
 private decoding=new Map<string,Promise<void>>();private generation=0;private disposed=false;private wanted='lobby';
 private failures=0;private lastError='';
 constructor(private readonly base=typeof document==='undefined'?'':new URL('audio/',document.baseURI).href,
  private readonly read:typeof fetch=(input,init)=>globalThis.fetch(input,init)){}
 public get(key:string):AudioBuffer|undefined{return this.buffers.get(key);}
 public diagnostics():{decoded:number;failures:number;lastError:string}{return {decoded:this.buffers.size,failures:this.failures,lastError:this.lastError};}
 private failed(key:string,phase:string,error:unknown):void{if(!this.disposed){this.failures++;this.lastError=key+' '+phase+': '+String(error).slice(0,180);}}
 private fetchBytes(key:string):Promise<ArrayBuffer|undefined>{
  let task=this.bytes.get(key);if(!task){task=this.read(this.base+key+'.m4a').then(r=>{if(r.ok)return r.arrayBuffer();this.failed(key,'fetch','HTTP '+r.status);return undefined;}).catch(e=>{this.failed(key,'fetch',e);return undefined;});this.bytes.set(key,task);void task.then(data=>{if(!data)this.bytes.delete(key);});}return task;
 }
 private async load(key:string,context?:AudioContext):Promise<void>{
  if(this.disposed)return;const bytes=await this.fetchBytes(key);
  if(!bytes||!context||this.disposed||this.buffers.has(key))return;
  let task=this.decoding.get(key);if(!task){const generation=this.generation;
   task=context.decodeAudioData(bytes.slice(0)).then(buffer=>{if(!this.disposed&&generation===this.generation)this.buffers.set(key,buffer);}).catch(e=>this.failed(key,'decode',e)).finally(()=>this.decoding.delete(key));this.decoding.set(key,task);
  }await task;
 }
 public async warm(scene:string,context?:AudioContext,onMusicReady?:()=>void):Promise<void>{
  if(this.disposed)return;this.wanted=scene;
  // Music and first-touch sounds have priority. At most three requests/decode jobs
  // share startup bandwidth; changing a cabinet does not preload every soundtrack.
  const keys=recordingKeys(scene);
  let index=0;await Promise.all(Array.from({length:3},async()=>{while(index<keys.length&&!this.disposed){const key=keys[index++];await this.load(key,context);if(key===musicKey(scene)&&this.buffers.has(key)&&!this.disposed)onMusicReady?.();}}));
  if(this.disposed)return;
  const music=Array.from(this.buffers.keys()).filter(k=>k.startsWith('music-'));
  const wanted=musicKey(this.wanted),keep=new Set(music.includes(wanted)?[wanted,...music.filter(k=>k!==wanted).slice(-1)]:music.slice(-2));
  for(const key of music)if(!keep.has(key)){this.buffers.delete(key);this.bytes.delete(key);}
  // Old award buffers are not needed after the previous cabinet is left.
  for(const key of Array.from(this.buffers.keys()))if(key.startsWith('award-')&&!key.startsWith('award-'+this.wanted+'-')){this.buffers.delete(key);this.bytes.delete(key);}
 }
 public clear():void{this.disposed=true;this.generation++;this.buffers.clear();this.bytes.clear();this.decoding.clear();}
}
