// Stream local arranged AAC; never decode an entire background track into PCM.
export class TidalSound{
 constructor(){this.enabled=true;this.scene='home';this.music=null;this.award=null;this.context=null;this.voices=new Set();this.unlocked=false;this.duckTimer=0;this.lastTap=0;
  document.addEventListener('pointerdown',()=>this.unlock(),{passive:true});
  document.addEventListener('keydown',()=>this.unlock());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.music?.pause();this.finishAward();this.clearVoices();void this.context?.suspend();}else if(this.unlocked){void this.context?.resume();this.start();}});
 }
 configure(scene,enabled){this.enabled=!!enabled;if(!enabled){this.release(this.music);this.music=null;this.finishAward();this.clearVoices();return;}if(scene!==this.scene){this.release(this.music);this.music=null;this.finishAward();this.scene=scene;}this.start();}
 unlock(){if(!this.enabled||document.hidden)return;this.unlocked=true;try{this.context??=new (window.AudioContext||window.webkitAudioContext)();void this.context.resume().catch(()=>{});}catch{}this.start();}
 release(audio){if(!audio)return;audio.onended=audio.onerror=audio.onloadedmetadata=null;audio.pause();audio.removeAttribute('src');audio.load();}
 start(){if(!this.enabled||!this.unlocked||document.hidden||this.music)return;const a=new Audio(new URL(`../audio/music-${this.scene}.m4a`,import.meta.url));a.loop=true;a.preload='metadata';a.volume=.38;this.music=a;void a.play().catch(()=>{if(this.music===a){this.release(a);this.music=null;}});}
 clearVoices(){for(const v of this.voices){try{v.stop();}catch{}}this.voices.clear();}
 cue(kind='tap'){if(!this.enabled||document.hidden)return;this.unlock();const c=this.context;if(!c)return;if(kind==='tap'&&c.currentTime-this.lastTap<.07)return;if(kind==='tap')this.lastTap=c.currentTime;
  const notes=kind==='spin'?[329.63,392,493.88,587.33]:kind==='win'?[440,554.37,659.25]:kind==='stop'?[493.88,739.99]:[659.25,987.77];
  notes.forEach((f,i)=>{if(this.voices.size>=20)return;const o=c.createOscillator(),g=c.createGain(),at=c.currentTime+i*(kind==='stop'?.023:.04),duration=kind==='win'?.23:.10;o.type=kind==='spin'?'triangle':'sine';o.frequency.value=f;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(kind==='tap'?.025:.035,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration+.02);});
 }
 present(ratio){if(!this.enabled||document.hidden)return;this.finishAward();this.unlock();const id=ratio>=100?'super':ratio>=40?'epic':ratio>=20?'mega':ratio>=10?'big':'small',a=new Audio(new URL(`../audio/win-${id}.m4a`,import.meta.url));a.preload='metadata';a.volume=.6;this.award=a;if(this.music)this.music.volume=.09;
  const end=()=>{if(this.award!==a)return;this.finishAward();};a.onended=a.onerror=end;this.duckTimer=setTimeout(end,18000);a.onloadedmetadata=()=>{if(this.award!==a)return;clearTimeout(this.duckTimer);this.duckTimer=setTimeout(end,Math.min(18000,Math.max(1000,(a.duration+.5)*1000)));};void a.play().catch(end);
 }
 finishAward(){clearTimeout(this.duckTimer);this.release(this.award);this.award=null;if(this.music)this.music.volume=.38;}
 status(){return {scene:this.scene,enabled:this.enabled,music:!!this.music,award:!!this.award,voices:this.voices.size};}
}
