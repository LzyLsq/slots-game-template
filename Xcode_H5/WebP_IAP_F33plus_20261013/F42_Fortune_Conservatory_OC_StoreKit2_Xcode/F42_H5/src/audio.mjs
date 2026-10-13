const FX=['tap','select','bet','toggle','confirm','error','spin','stop','coin','collect','feature'];
export class Soundscape{
 constructor(){this.ctx=null;this.buffers=new Map();this.pending=new Map();this.fxBus=null;this.loading=null;this.theme='lobby';this.musicLevel=.45;this.sfxLevel=.65;this.players=[];this.fadeToken=0;this.ducked=false;this.unlocked=false;this.suspended=false;this.lastStop=0;this.voices=new Set();this.failed=false;}
 prepare(){this.createContext();for(const theme of ['lobby','tiger','koi','crane','tortoise']){const a=new Audio(`assets/audio/music-${theme}.m4a`);a.preload='auto';a.loop=true;a.volume=0;this.players.push({theme,a});}}
 createContext(){
  if(this.ctx)return;
  try{
   this.ctx=new(window.AudioContext||window.webkitAudioContext)();
   // Predecode while suspended; playback still requires a user gesture.
   // A shared soft-knee bus prevents layered coin/stop accents from clipping.
   this.fxBus=this.ctx.createDynamicsCompressor();
   this.fxBus.threshold.value=-12;this.fxBus.knee.value=14;this.fxBus.ratio.value=3;
   this.fxBus.attack.value=.004;this.fxBus.release.value=.12;this.fxBus.connect(this.ctx.destination);
   this.loading=this.load();
  }catch{this.failed=true;}
 }
 unlock(){
  this.createContext();if(!this.ctx)return;
  this.ctx.resume().catch(()=>{this.failed=true;});this.unlocked=true;
  if(!this.suspended)this.switch(this.theme);
 }
 async load(){
  const jobs=[...FX.map(n=>'fx-'+n),...['lobby','tiger','koi','crane','tortoise'].flatMap(n=>['normal','big','super','mega'].map(t=>`award-${n}-${t}`))].map(name=>{const job=(async()=>{
   try{const r=await fetch(`assets/audio/${name}.m4a`);if(!r.ok)throw new Error(name);this.buffers.set(name,await this.ctx.decodeAudioData(await r.arrayBuffer()));}catch{this.failed=true;}
  })();this.pending.set(name,job);return job;});await Promise.all(jobs);
 }
 set(p){this.musicLevel=Math.max(0,Math.min(1,p.music));this.sfxLevel=Math.max(0,Math.min(1,p.sfx));this.switch(this.theme);}
 async cue(name){
  if(!this.unlocked||this.suspended||this.sfxLevel===0)return;
  if(name==='stop'){const now=performance.now();if(now-this.lastStop<65)return;this.lastStop=now;}
  const full=name.startsWith('award-')?name:'fx-'+name;
  const requested=performance.now();if(!this.buffers.has(full)&&this.pending.has(full))await this.pending.get(full);
  if(!full.startsWith('award-')&&performance.now()-requested>180)return; // Never replay stale clicks after a slow decode.
  if(this.suspended||this.sfxLevel===0||!this.ctx||this.ctx.state!=='running')return;
  const buffer=this.buffers.get(full);if(!buffer)return;
  const limit=full.startsWith('award-')?3:6;if(this.voices.size>=limit&&!full.startsWith('award-'))return;
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=this.sfxLevel*(full==='fx-tap'?.72:.85);source.connect(gain);gain.connect(this.fxBus||this.ctx.destination);this.voices.add(source);source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(source);};source.start();
 }
 switch(theme){
  this.theme=theme;const token=++this.fadeToken,desired=this.musicLevel*(this.ducked?.11:.32),target=this.players.find(p=>p.theme===theme);
  if(!target||!this.unlocked||this.suspended)return;
  if(target.a.paused)target.a.play().catch(()=>{this.failed=true;});
  const from=this.players.map(p=>p.a.volume),start=performance.now();
  const frame=now=>{if(token!==this.fadeToken)return;const t=Math.max(0,Math.min(1,(now-start)/520));this.players.forEach((p,i)=>{p.a.volume=Math.max(0,Math.min(1,from[i]+((p===target?desired:0)-from[i])*t));if(t===1&&p!==target)p.a.pause();});if(t<1)requestAnimationFrame(frame);};requestAnimationFrame(frame);
 }
 duck(on){this.ducked=on;this.switch(this.theme);}
 stopCues(){for(const s of this.voices){try{s.stop();}catch{}}this.voices.clear();}
 suspend(on){this.suspended=on;++this.fadeToken;if(on){this.players.forEach(p=>p.a.pause());this.stopCues();this.ctx?.suspend().catch(()=>{});}else if(this.unlocked){this.ctx?.resume().catch(()=>{});this.switch(this.theme);}}
 snapshot(){return {theme:this.theme,unlocked:this.unlocked,decoded:this.buffers.size,failed:this.failed,playing:this.players.filter(p=>!p.a.paused).length,voices:this.voices.size};}
}
