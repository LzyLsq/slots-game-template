// Short, gesture-unlocked theatre cues. No timers, network audio or perpetual loops.
let context;
const mixes = new Set();
export function muteTheatre(){
 for(const mix of mixes){mix.gain.value=0;mix.disconnect()}
 mixes.clear();
}
export function theatreSound(kind, enabled, mode=0, column=0){
 if(!enabled||document.hidden)return;
 try{
  context??=new(window.AudioContext||window.webkitAudioContext)();
  context.resume().catch(()=>{});
  const start=context.currentTime,master=context.createGain();
  master.gain.value=.12;master.connect(context.destination);mixes.add(master);
  let end=0;
  const note=(frequency,at,length,volume=.3,type='sine')=>{
   const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.value=frequency;
   g.gain.setValueAtTime(0,start+at);g.gain.linearRampToValueAtTime(volume,start+at+.008);g.gain.exponentialRampToValueAtTime(.0001,start+at+length);
   o.connect(g);g.connect(master);o.start(start+at);o.stop(start+at+length+.02);o.onended=()=>{o.disconnect();g.disconnect()};end=Math.max(end,at+length);
  };
  const noise=(at,length,volume)=>{
   const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*length),context.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**2;
   const src=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain();src.buffer=buffer;filter.type='lowpass';filter.frequency.value=1800;g.gain.value=volume;
   src.connect(filter);filter.connect(g);g.connect(master);src.start(start+at);src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect()};end=Math.max(end,at+length);
  };
  const root=[523.25,587.33,659.25,440][mode];
  if(kind==='spin'){noise(0,.16,.6);for(let i=0;i<8;i++)noise(.08+i*.085,.035,.13);note(100,0,.14,.4,'triangle')}
  if(kind==='stop'){noise(0,.045,.42);note(160+column*19,0,.075,.5,'triangle');note(root*2**(column/12),.015,.18,.15)}
  if(kind==='win'||kind==='grand'){
   const melody=kind==='grand'?[0,4,7,12,7,12,16,19]:[0,4,7,12];
   melody.forEach((n,i)=>{note(root*2**(n/12),i*.105,.48,.26);note(root*2**(n/12)*2.002,i*.105,.19,.055)});
   if(kind==='grand'){[1,1.25,1.5].forEach(f=>note(root*f,.6,1.5,.16,'triangle'));noise(.64,.22,.1)}
  }
  // Disconnect the mix bus on the audio clock after its last source ends.
  const tail=context.createOscillator();tail.connect(context.createGain());tail.start(start);tail.stop(start+end+.1);tail.onended=()=>{master.disconnect();mixes.delete(master);tail.disconnect()};
 }catch{}
}
