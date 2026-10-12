import {SampleBank} from './sample-bank.js';
// Authored local AAC music + short PCM feedback; no oscillator sound effects.
export class TidalSound {
 constructor(){
  this.enabled=true;this.scene='home';this.music=null;this.award=null;this.context=null;
  this.samples=null;this.unlocked=false;this.duckTimer=0;this.stopIndex=0;
  this.spinning=false;this.celebrating=false;this.modalOpen=false;this.spinTimer=0;
  this.retiring=new Set();this.nodes=new Map();this.positions={home:0,cabinet:0};
  this.musicHandoffAt=0;this.awardReadyAt=0;this.lastCountStep=-1;
  this.prepare();
  document.addEventListener('pointerdown',()=>this.unlock(),{passive:true});
  document.addEventListener('keydown',()=>this.unlock());
  document.addEventListener('visibilitychange',()=>{
   if(document.hidden){this.finishSpin();this.finishAward(0);this.clearVoices();this.stopMusic();void this.context?.suspend().catch(()=>{});}
   else if(this.unlocked){void this.context?.resume().then(()=>this.start()).catch(()=>{});}
  });
 }
 prepare(){try{this.context??=new (window.AudioContext||window.webkitAudioContext)();this.samples??=new SampleBank(this.context,new URL('../audio/',import.meta.url).href);}catch{}}
 configure(scene,enabled){
  this.enabled=!!enabled;
  if(scene!==this.scene){clearTimeout(this.spinTimer);this.spinTimer=0;this.spinning=false;this.modalOpen=false;this.finishAward();this.clearVoices();this.retireMusic();this.scene=scene;}
  if(!enabled){this.stopMusic();this.finishAward(0);this.clearVoices();return;}
  this.start();
 }
 get activeScene(){return this.scene;}
 get musicLevel(){return this.celebrating?0:this.modalOpen?.16:this.spinning?.28:.38;}
 get musicGain(){return this.nodes.get(this.music)?.gain;}
 mix(){
  const gain=this.musicGain?.gain;if(!gain||!this.context)return;
  const now=this.context.currentTime,target=this.musicLevel,enter=target>0?Math.max(now,this.musicHandoffAt,this.awardReadyAt):now;
  gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);
  if(enter>now){gain.linearRampToValueAtTime(0,Math.min(enter,now+.06));gain.setValueAtTime(0,enter);}
  gain.linearRampToValueAtTime(target,enter+(target>0?.4:.12));
 }
 beginSpin(){
  if(this.scene!=='cabinet'||this.spinning)return;
  this.finishAward();this.spinning=true;this.stopIndex=0;
  this.mix();this.start();
  this.spinTimer=setTimeout(()=>this.finishSpin(),20000);
 }
 finishSpin(){clearTimeout(this.spinTimer);this.spinTimer=0;if(!this.spinning)return;this.spinning=false;this.mix();}
 setModalOpen(open){this.modalOpen=!!open;this.mix();}
 situationStatus(){return{mix:'calm-single-focus-20261012',scene:this.scene,spinning:this.spinning,celebrating:this.celebrating,modal:this.modalOpen,track:this.music?this.activeScene:undefined};}
 unlock(){if(!this.enabled||document.hidden)return;this.unlocked=true;this.prepare();if(this.context?.state==='running')this.start();else void this.context?.resume().then(()=>this.start()).catch(()=>{});}
 connect(audio){const source=this.context.createMediaElementSource(audio),gain=this.context.createGain();gain.gain.value=0;source.connect(gain).connect(this.context.destination);this.nodes.set(audio,{source,gain});return gain;}
 release(audio){
  if(!audio)return;const node=this.nodes.get(audio);if(node?.timer)clearTimeout(node.timer);
  this.retiring.delete(audio);node?.source.disconnect();node?.gain.disconnect();this.nodes.delete(audio);
  if(audio===this.music||audio.dataset.scene)this.positions[audio.dataset.scene||this.scene]=audio.currentTime;
  audio.onended=audio.onerror=audio.onloadedmetadata=null;audio.pause();audio.removeAttribute('src');audio.load();
 }
 fadeRelease(audio,seconds){
  if(!audio)return;const node=this.nodes.get(audio);
  if(!node||!seconds||!this.enabled||document.hidden||this.context?.state!=='running'){this.release(audio);return;}
  if(node.timer)return;const now=this.context.currentTime,gain=node.gain.gain;
  gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);gain.linearRampToValueAtTime(0,now+seconds);
  this.retiring.add(audio);node.timer=setTimeout(()=>this.release(audio),(seconds+.03)*1000);
 }
 retireMusic(){
  for(const a of this.retiring)if(a.dataset.scene)this.release(a);
  const a=this.music;this.music=null;if(!a)return;
  this.musicHandoffAt=(this.context?.currentTime||0)+.18;this.fadeRelease(a,.16);
 }
 stopMusic(){this.release(this.music);this.music=null;for(const a of this.retiring)this.release(a);}
 start(){
  if(!this.enabled||!this.unlocked||document.hidden||this.context?.state!=='running')return;
  if(this.music){if(this.music.paused)void this.music.play().catch(()=>{});return;}
  const a=new Audio(new URL(`../audio/music-${this.activeScene}.m4a`,import.meta.url));
  a.loop=true;a.preload='metadata';a.setAttribute('playsinline','');a.dataset.scene=this.scene;
  const gain=this.connect(a),now=this.context.currentTime,enter=Math.max(now,this.musicHandoffAt,this.awardReadyAt);
  gain.gain.setValueAtTime(0,now);gain.gain.setValueAtTime(0,enter);gain.gain.linearRampToValueAtTime(this.musicLevel,enter+.4);
  a.onloadedmetadata=()=>{if(this.music===a&&Number.isFinite(a.duration)&&this.positions[this.scene]<a.duration)a.currentTime=this.positions[this.scene];};this.music=a;
  void a.play().catch(()=>{if(this.music===a){this.release(a);this.music=null;}});
 }
 clearVoices(){this.samples?.stop();}
 cue(kind='tap'){
  if(kind==='spin')this.beginSpin();
  if(!this.enabled||document.hidden)return;this.unlock();
  if(this.celebrating&&(kind==='win'||kind==='reward'))return;
  const names={tap:'ui-tap',back:'ui-back',select:'ui-select','bet-up':'bet-up','bet-down':'bet-down',spin:'spin-start',win:'reward',reward:'reward'};
  const levels={tap:.23,back:.25,select:.28,'bet-up':.22,'bet-down':.22,spin:.30,stop:.28,win:.25,reward:.25};
  this.samples?.play(kind==='stop'?'stop-'+(1+this.stopIndex++%3):(names[kind]||'ui-tap'),levels[kind]||.23,kind==='stop'||kind==='spin'?'reel':'ui',1,kind==='stop'?.06:.09);
 }
 detail(kind,progress=0){
  if(!this.enabled||document.hidden)return;
  if(kind==='count'){
   if(!Number.isFinite(progress))return;const step=Math.floor(progress*4);
   if(step<1||step>3||step<=this.lastCountStep||performance.now()-(this.lastCount??-Infinity)<550)return;
   this.lastCount=performance.now();this.lastCountStep=step;this.samples?.play('coin-'+step,.08,'detail',1,.55);
  }
  else if(kind==='collect'){this.finishAward();this.samples?.play('collect',.30,'collect',1,.20);}
  else if(kind==='burst')this.samples?.play('burst',.14,'detail',1,1);
  else if(kind==='reveal'||kind==='skip'){if(kind==='skip')this.finishAward(.18);this.samples?.stop('detail');if(kind==='skip'||!this.award)this.samples?.play('reveal',.22,'detail');}
 }
 present(ratio){
  this.finishSpin();
  if(!Number.isFinite(ratio)||ratio<=0||!this.enabled||document.hidden)return;this.finishAward();this.unlock();this.celebrating=true;
  const id=ratio>=100?'super':ratio>=40?'epic':ratio>=20?'mega':ratio>1?'big':'small',a=new Audio(new URL(`../audio/win-${id}.m4a`,import.meta.url));
  this.samples?.stop('ui');this.samples?.stop('reel');
  a.preload='metadata';a.setAttribute('playsinline','');const gain=this.connect(a),now=this.context.currentTime,enter=Math.max(now+.13,this.awardReadyAt,this.musicHandoffAt);
  gain.gain.setValueAtTime(0,now);gain.gain.setValueAtTime(0,enter);gain.gain.linearRampToValueAtTime(id==='small'?.45:.50,enter+.08);this.award=a;this.mix();
  // A short sting ending is not the end of the visual award presentation.
  const end=()=>{if(this.award!==a)return;clearTimeout(this.duckTimer);this.release(a);this.award=null;};
  a.onended=end;a.onerror=()=>{if(this.award===a)this.finishAward();};this.duckTimer=setTimeout(end,18000);
  a.onloadedmetadata=()=>{if(this.award!==a)return;clearTimeout(this.duckTimer);this.duckTimer=setTimeout(end,Math.min(18000,Math.max(1000,(a.duration+.5)*1000)));};void a.play().catch(end);
 }
 finishAward(fade=.22){
  clearTimeout(this.duckTimer);const a=this.award;this.award=null;
  if(a){if(this.context?.state==='running'&&fade>0&&this.enabled&&!document.hidden)this.awardReadyAt=Math.max(this.awardReadyAt,this.context.currentTime+fade+.02);this.fadeRelease(a,fade);}
  this.celebrating=false;this.samples?.stop('detail');this.lastCount=-Infinity;this.lastCountStep=-1;this.mix();
 }
 status(){return {scene:this.scene,enabled:this.enabled,music:!!this.music,award:!!this.award,voices:this.samples?.status().voices||0,samples:this.samples?.status()};}
}
