import {VOICE_SHAPES,themeMusic,midi,type Instrument} from './MusicTheme';
import {CUES,cueNotes,recordedCueRate,musicNotes,musicWindow,type Cue,type Note} from './AudioScore';
import {awardScore,awardFinale,type AwardNote,type AwardSoundtrack} from './AwardScore';
import {FileRecordingLibrary,type RecordingLibrary} from './RecordedAudio';
import {musicKey,cueKey,awardKey,finaleKey,musicDuration} from './SoundtrackCatalog';
import {awardTiming} from '../vfx/AwardTimeline';
type Bus = 'music'|'effects'|'award';
/** One restrained mix for recorded tracks, fallback voices, toggles and duck recovery. */
export const SOFT_MIX={music:.54,duck:.25,awardDuck:.18,returnDuck:.38,effects:.76,award:.78,master:.82,musicRoom:.035,awardRoom:.10,musicClip:.80,spinRoll:.12,pressDuck:.82} as const;
export const CUE_LEVELS:Readonly<Record<Cue,number>>={
  tap:.68,bet:.62,navigate:.60,toggle:.62,confirm:.62,spin:.42,'reel-stop':.32,
  win:.42,'big-win':.54,'epic-win':.60,reward:.48,collect:.40,error:.38
};
/** Broad, non-resonant cuts leave the melody intact but soften brass, bells and coin hiss. */
export const SOFT_TONE={
  music:{cutoff:9200,presence:-2.2,shelf:-4.5},
  effects:{cutoff:7200,presence:-3.0,shelf:-5.5},
  award:{cutoff:9000,presence:-2.0,shelf:-4.0}
} as const;
const PRESS_CUES:ReadonlySet<Cue>=new Set(['tap','bet','navigate','toggle','confirm']);
type VoiceGroup='press';
type Voice = {oscillator:OscillatorNode|AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode;bus:Bus;end:number;panner?:StereoPannerNode;awardId?:number;group?:VoiceGroup;retiring?:boolean};
export interface SoundSettings {music:boolean;sound:boolean;vibration:boolean}
const browserContext=():AudioContext|undefined=>{
  if(typeof window==='undefined')return undefined;
  const Ctor=window.AudioContext??(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  return Ctor?new Ctor({latencyHint:'interactive'}):undefined;
};
/** Browser-only mixer, separated from Cocos so lifecycle/race cases can be tested. */
export class SoundscapeEngine {
  private context?:AudioContext;
  private toneFilters:BiquadFilterNode[]=[];
  private pressMusicGate?:GainNode;private musicBus?:GainNode;private effectsBus?:GainNode;private awardBus?:GainNode;private noiseBuffer?:AudioBuffer;private room?:ConvolverNode;private roomGain?:GainNode;private musicRoomGain?:GainNode;private waveCache=new Map<Instrument,PeriodicWave>();private master?:GainNode;private limiter?:DynamicsCompressorNode;
  private settings:SoundSettings={music:true,sound:true,vibration:true};
  private unlocked=false;private hidden=false;private destroyed=false;private resuming?:Promise<void>;
  private timer?:ReturnType<typeof setInterval>;private nextBeat=0;private beat=0;private scene='lobby';
  private lastCueRate=1;private cuePlays=0;private lastPlayedCue='';private lastCueSource='';private cueCounts:Partial<Record<Cue,number>>={};
  private voices=new Set<Voice>();private lastCue=new Map<string,number>();private duckUntil=0;
  private musicVoice?:Voice;private musicVoiceKey='';private rollVoice?:Voice;private warmingScene='';private warmingContext?:AudioContext;
  private awardSerial=0;private activeAward?:{id:number;tier:number;scene:string;profitable:boolean;score:AwardNote[];cursor:number;elapsed:number;finalized:boolean;scheduled:number;recorded:boolean;countEnd:number};
  constructor(private readonly createContext:()=>AudioContext|undefined=browserContext,
    private readonly recordings:RecordingLibrary|undefined=typeof window==='undefined'?undefined:new FileRecordingLibrary()){}
  public configure(settings:Partial<SoundSettings>):void{
    const previous={...this.settings};Object.assign(this.settings,settings);
    if(this.destroyed||!this.context)return;
    if(settings.music!==undefined&&settings.music!==previous.music){
      if(settings.music){this.fade(this.musicRoomGain,SOFT_MIX.musicRoom,.14);this.fade(this.musicBus,this.musicLevel(),.14);if(this.duckUntil>this.context.currentTime){this.musicBus?.gain.setValueAtTime(SOFT_MIX.duck,this.context.currentTime);this.musicBus?.gain.linearRampToValueAtTime(SOFT_MIX.music,this.duckUntil+.55);}this.startMusic();}
      else {this.stopMusic();this.fade(this.musicRoomGain,0,.10);this.fade(this.musicBus,0,.10);this.stopVoices('music',.11);}
    }
    if(settings.sound!==undefined&&settings.sound!==previous.sound){this.fade(this.effectsBus,settings.sound?SOFT_MIX.effects:0,.035);this.fade(this.awardBus,settings.sound?SOFT_MIX.award:0,.035);this.fade(this.roomGain,settings.sound?SOFT_MIX.awardRoom:0,.035);if(!settings.sound){this.stopVoices('effects',.04);this.stopVoices('award',.04);}if(this.activeAward)this.fade(this.musicBus,this.settings.music?this.musicLevel():0,.15);}
  }
  public setScene(scene:string):void{
    if(this.scene===scene){if(!this.context)void this.recordings?.warm(scene);return;}this.endAward();this.stopSpin();this.scene=scene;
    if(!this.context){void this.recordings?.warm(scene);return;}
    this.stopMusic();this.stopVoices('music',.48);this.musicVoice=undefined;this.musicVoiceKey='';
    this.beat=0;this.nextBeat=this.context.currentTime+.15;
    this.warmRecordings();
    if(this.settings.music){this.fade(this.musicBus,this.musicLevel(),.55);this.startMusic();}
  }
  /** Decode during scene loading, but never resume or play before a real gesture.
   * A first contact can then use the same physical recording as later contacts. */
  public prepare():void{
    if(this.hidden||this.destroyed)return;
    if(!this.context){
      try {this.context=this.createContext();if(!this.context)return;this.createMixer(this.context);}catch{return;}
    }
    this.warmRecordings();
  }
  public unlock():void{
    if(this.hidden||this.destroyed)return;
    this.prepare();if(!this.context)return;
    this.unlocked=true;
    if(this.context.state==='suspended'){
      if(this.resuming)return;
      this.resuming=this.context.resume().then(()=>{if(this.hidden&&!this.destroyed)void this.context?.suspend().catch(()=>{});else if(!this.destroyed)this.startMusic();})
        .catch(()=>{}).finally(()=>{this.resuming=undefined;});
    }else this.startMusic();
  }
  public play(cue:Cue):void{
    if(this.hidden||this.destroyed||!this.settings.sound)return;
    if(this.activeAward&&['win','big-win','epic-win'].includes(cue))return;
    this.unlock();const c=this.context;if(!c||!CUES[cue])return;
    const now=c.currentTime,last=this.lastCue.get(cue);
    if(last!==undefined&&now-last<(cue==='reel-stop'?.045:.06))return;
    const press=PRESS_CUES.has(cue);
    // A button family shares one voice lane. Rapid bet/menu taps replace the tail,
    // never build a chorus of clicks or drop a new contact behind old voices.
    if(press){
      const lastPress=this.lastCue.get('press');if(lastPress!==undefined&&now-lastPress<.028)return;
      this.lastCue.set('press',now);
      for(const voice of this.voices)if(voice.group==='press'&&!voice.retiring)this.retireVoice(voice,.012);
    }
    this.lastCue.set(cue,now);
    if(['win','big-win','epic-win','reward','collect'].includes(cue))this.duck(cue==='epic-win'?1.8:cue==='big-win'?1.3:.7);
    const recorded=this.recordings?.get(cueKey(cue));
    const played=recorded?!!this.clip(recorded,'effects',CUE_LEVELS[cue],{group:press?'press':undefined,rate:recordedCueRate(cue,this.scene)}):this.pattern(cueNotes(cue,this.scene),press?1.35:1,press?'press':undefined);
    if(played){
      this.lastCueRate=recorded?recordedCueRate(cue,this.scene):1;this.cuePlays++;this.lastPlayedCue=cue;this.lastCueSource=recorded?cueKey(cue):'fallback';this.cueCounts[cue]=(this.cueCounts[cue]??0)+1;
      if(PRESS_CUES.has(cue))this.duckPressMusic();
    }
    if(cue==='spin')this.startSpin();
  }
  /** Only the active presentation owns this lease; a stale handle cannot cancel a newer win. */
  public beginAward(tier:number,countEnd:number,profitable=true):AwardSoundtrack{
    if(this.destroyed)return {update:()=>{},finish:()=>{},stop:()=>{}};
    this.endAward();this.resetPressGate();this.stopVoices('effects',.09);const id=++this.awardSerial;
    this.activeAward={id,tier,scene:this.scene,profitable,score:awardScore(tier,countEnd,this.scene,profitable),cursor:0,elapsed:0,finalized:false,scheduled:0,recorded:false,countEnd};
    this.stopSpin();
    if(this.settings.sound)this.unlock();this.duckUntil=0;
    this.fade(this.musicBus,this.settings.music?this.musicLevel():0,.09);
    const handle:AwardSoundtrack={update:t=>this.tickAward(id,t),finish:()=>this.finishAward(id),stop:()=>this.endAward(id)};
    handle.update(0);return handle;
  }
  private tickAward(id:number,elapsed:number):void{
    const a=this.activeAward;if(!a||a.id!==id||a.finalized||!Number.isFinite(elapsed))return;
    a.elapsed=Math.max(a.elapsed,elapsed);const c=this.context;
    // A muted, hidden or gesture-locked clock advances silently, never queues old fanfares.
    const audible=c&&c.state==='running'&&this.settings.sound&&!this.hidden&&!this.destroyed;
    // A ready performance is one stereo source, not dozens of per-frame oscillators.
    // Never start a delayed full fanfare halfway through an existing presentation.
    if(a.cursor===0&&a.elapsed<.13&&audible){
      const buffer=this.recordings?.get(awardKey(a.scene,a.tier));
      if(buffer&&a.score.length){this.clip(buffer,'award',a.tier===0?.34:a.tier===1?.62:.70,{awardId:id,rate:Math.max(.8,Math.min(1.2,awardTiming(a.tier).countEnd/Math.max(.1,a.countEnd)))});a.recorded=true;}
    }
    let scheduled=0;
    while(a.cursor<a.score.length&&a.score[a.cursor].at<=a.elapsed+.12){
      const n=a.score[a.cursor++];
      if(audible&&!a.recorded&&n.at>=a.elapsed-.065&&scheduled++<12)this.awardNote(n,c!.currentTime+.008+Math.max(0,n.at-a.elapsed),id);
    }
  }
  private finishAward(id:number):void{
    const a=this.activeAward;if(!a||a.id!==id||a.finalized)return;a.finalized=true;
    this.stopVoices('award',.045);
    const c=this.context;if(!c||c.state!=='running'||!this.settings.sound||this.hidden||this.destroyed)return;
    const recorded=this.recordings?.get(finaleKey(a.scene,a.tier));
    if(recorded)this.clip(recorded,'award',a.tier===0?.30:a.tier===1?.60:.68,{awardId:id});
    else for(const n of awardFinale(a.tier,a.scene,a.profitable))this.awardNote(n,c.currentTime+.055+n.at,id);
  }
  private endAward(id?:number):void{
    if(!this.activeAward||(id!==undefined&&this.activeAward.id!==id))return;
    this.activeAward=undefined;this.stopVoices('award',.065);
    this.fade(this.musicBus,this.settings.music?this.musicLevel():0,.35);
  }
  private awardNote(n:AwardNote,start:number,id:number):void{
    if(!n.noise){this.note(n.pitch,start,n.duration,n.volume,n.wave,'award',id,n.instrument,n.pan);return;}
    const c=this.context;if(!c||!this.awardBus||this.voices.size>=48)return;
    if(!this.noiseBuffer){
      this.noiseBuffer=c.createBuffer(1,Math.ceil(c.sampleRate*.7),c.sampleRate);
      const data=this.noiseBuffer.getChannelData(0);let seed=35;
      for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*Math.exp(-i/(c.sampleRate*.17));}
    }
    const source=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter();source.buffer=this.noiseBuffer;
    filter.type='bandpass';filter.frequency.value=Math.min(2600,Math.max(650,n.noiseCutoff??1800));filter.Q.value=.55;
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(n.volume,start+.009);g.gain.exponentialRampToValueAtTime(.0001,start+n.duration);
    const voice:Voice={oscillator:source,gain:g,filter,bus:'award',awardId:id,end:start+n.duration+.025};this.trackVoice(voice);
    source.connect(filter).connect(g).connect(this.awardBus);source.start(start);source.stop(voice.end);
  }
  public guardian(theme:number):void{
    if(!this.readyEffect('guardian',.25))return;
    this.duck(.6);
    const scene=['golden-hour','jade-treasury','pearl-palace','ruby-revel'][Math.max(0,Math.min(3,Math.floor(theme)))];
    const score=themeMusic(scene);
    const recorded=this.recordings?.get(awardKey(scene,0));
    if(recorded)this.clip(recorded,'effects',.34);else this.pattern(score.award.slice(0,3).map((p,i)=>[midi(p),.17+i*.07,i*.115,.018-i*.003,'sine',score.lead] as Note));
  }
  public award(step:number):void{
    if(!this.readyEffect('award',.18))return;this.duck(.5);
    const score=themeMusic(this.scene),lift=Math.min(4,Math.max(0,Math.floor(step)));
    const recorded=this.recordings?.get(cueKey('win'));
    if(recorded)this.clip(recorded,'effects',.26+lift*.025);else this.pattern(score.award.slice(0,3).map((p,i)=>[midi(p+lift),.15+i*.035,i*.075,.022,'sine',score.lead] as Note));
  }
  public vibrate(pattern:number|number[]=9):void{
    if(!this.settings.vibration||this.hidden||this.destroyed||typeof navigator==='undefined')return;
    try{navigator.vibrate?.(pattern);}catch{/* Unsupported devices simply keep visual/audio feedback. */}
  }
  public pause():void{
    this.hidden=true;this.resetPressGate();this.stopSpin();this.stopMusic();this.stopVoices(undefined,0);this.lastCue.clear();
    void this.context?.suspend().catch(()=>{});
  }
  public resume():void{
    this.hidden=false;if(!this.unlocked)return;
    // A show event may arrive before the previous gesture's resume finishes.
    if(this.resuming)void this.resuming.then(()=>this.unlock());else this.unlock();
  }
  public destroy():void{
    this.destroyed=true;this.recordings?.clear();this.stopSpin();this.endAward();this.stopMusic();this.stopVoices(undefined,0);
    void this.context?.close().catch(()=>{});
    this.pressMusicGate?.disconnect();this.musicBus?.disconnect();this.effectsBus?.disconnect();this.awardBus?.disconnect();this.room?.disconnect();this.roomGain?.disconnect();this.musicRoomGain?.disconnect();this.waveCache.clear();this.noiseBuffer=undefined;this.master?.disconnect();this.limiter?.disconnect();for(const filter of this.toneFilters)filter.disconnect();this.toneFilters=[];
  }
  /** Compact read-only diagnostics for tests; no session or player data. */
  public snapshot():Readonly<SoundSettings>&{voices:number;musicTimer:boolean;scene:string;state:string;awardActive:boolean;awardVoices:number;awardScheduledNotes:number;hidden:boolean;recordedMusic:boolean;recordedAward:boolean;musicVoices:number;musicTrack:string;readyRecordings:number;recordingFailures:number;recordingError:string;lastCueRate:number;pressVoices:number;cuePlays:number;lastPlayedCue:string;lastCueSource:string;cueCounts:Partial<Record<Cue,number>>}{
    return {...this.settings,lastCueRate:this.lastCueRate,pressVoices:Array.from(this.voices).filter(v=>v.group==='press'&&!v.retiring).length,cuePlays:this.cuePlays,lastPlayedCue:this.lastPlayedCue,lastCueSource:this.lastCueSource,cueCounts:{...this.cueCounts},voices:this.voices.size,musicTimer:this.timer!==undefined,scene:this.scene,state:this.context?.state??'locked',awardActive:!!this.activeAward,awardScheduledNotes:this.activeAward?.scheduled??0,hidden:this.hidden,awardVoices:Array.from(this.voices).filter(v=>v.bus==='award').length,musicVoices:Array.from(this.voices).filter(v=>v.bus==='music').length,recordedMusic:!!this.musicVoice,recordedAward:this.activeAward?.recorded??false,musicTrack:this.musicVoice?this.musicVoiceKey:'fallback',readyRecordings:this.recordings?.diagnostics?.().decoded??0,recordingFailures:this.recordings?.diagnostics?.().failures??0,recordingError:this.recordings?.diagnostics?.().lastError??''};
  }
  private warmRecordings():void{
    const c=this.context,scene=this.scene;if(!c||!this.recordings||this.destroyed)return;
    if(this.warmingScene===scene&&this.warmingContext===c)return;
    this.warmingScene=scene;this.warmingContext=c;
    const ready=()=>{if(!this.destroyed&&this.scene===scene&&!this.hidden&&this.settings.music&&c.state==='running'&&this.recordings?.get(musicKey(scene)))this.startMusic();};
    void this.recordings.warm(scene,c,ready).then(ready).catch(()=>{/* A bad/offline file leaves the quiet fallback available. */}).finally(()=>{if(this.warmingScene===scene&&this.warmingContext===c)this.warmingScene='';});
  }
  private clip(buffer:AudioBuffer,bus:Bus,volume:number,options:{loop?:number;rate?:number;awardId?:number;attack?:number;group?:VoiceGroup}={}):Voice|undefined{
    const c=this.context,target=bus==='music'?this.musicBus:bus==='award'?this.awardBus:this.effectsBus;
    if(!c||!target||this.hidden||this.destroyed||this.voices.size>=48)return;
    const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();source.buffer=buffer;
    const start=c.currentTime+.008,rate=options.rate??1;source.playbackRate.setValueAtTime(rate,start);
    if(options.loop){source.loop=true;source.loopStart=0;source.loopEnd=Math.min(options.loop,buffer.duration);}
    filter.type='lowpass';filter.frequency.value=SOFT_TONE[bus].cutoff;filter.Q.value=.707;
    const duration=buffer.duration/rate,end=options.loop?Infinity:start+duration;
    gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+(options.attack??.012));
    if(!options.loop){gain.gain.setValueAtTime(volume,start+Math.max(.015,duration-.045));gain.gain.linearRampToValueAtTime(.0001,end);}
    const voice:Voice={oscillator:source,gain,filter,bus,end,awardId:options.awardId,group:options.group};this.trackVoice(voice);
    source.connect(filter).connect(gain).connect(target);source.start(start);if(!options.loop)source.stop(end+.01);
    return voice;
  }
  private startSpin():void{
    this.stopSpin();const buffer=this.recordings?.get('fx-reel-roll');if(buffer)this.rollVoice=this.clip(buffer,'effects',SOFT_MIX.spinRoll,{loop:1.1,attack:.09});
  }
  public stopSpin():void{
    const voice=this.rollVoice,c=this.context;this.rollVoice=undefined;if(!voice||!c)return;
    voice.gain.gain.cancelScheduledValues(c.currentTime);voice.gain.gain.setValueAtTime(voice.gain.gain.value,c.currentTime);voice.gain.gain.linearRampToValueAtTime(.0001,c.currentTime+.10);
    voice.end=Math.min(voice.end,c.currentTime+.11);try{voice.oscillator.stop(voice.end);}catch{/* Already landed. */}
  }
  private createMixer(c:AudioContext):void{
    this.musicBus=c.createGain();this.effectsBus=c.createGain();this.awardBus=c.createGain();this.master=c.createGain();this.limiter=c.createDynamicsCompressor();
    this.musicBus.gain.value=this.settings.music?SOFT_MIX.music:0;this.effectsBus.gain.value=this.settings.sound?SOFT_MIX.effects:0;this.awardBus.gain.value=this.settings.sound?SOFT_MIX.award:0;this.master.gain.value=SOFT_MIX.master;
    // A soft safety limiter catches simultaneous celebrations without pumping the quiet music.
    this.limiter.threshold.value=-16;this.limiter.knee.value=18;this.limiter.ratio.value=4;this.limiter.attack.value=.010;this.limiter.release.value=.24;
    const musicOutput=this.softenBus(c,this.musicBus,'music'),effectsOutput=this.softenBus(c,this.effectsBus,'effects'),awardOutput=this.softenBus(c,this.awardBus,'award');
    // A short independent gate leaves award/win ducking and preference fades intact.
    this.pressMusicGate=c.createGain();this.pressMusicGate.gain.value=1;
    musicOutput.connect(this.pressMusicGate).connect(this.master);effectsOutput.connect(this.master);awardOutput.connect(this.master);this.master.connect(this.limiter).connect(c.destination);
    // A short, original stereo treasury-room impulse gives the fanfare depth.
    // Generated once; the dry cue remains clear, not washed out by a long hall tail.
    if(typeof c.createConvolver==='function'){
      this.room=c.createConvolver();this.roomGain=c.createGain();this.roomGain.gain.value=this.settings.sound?SOFT_MIX.awardRoom:0;
      const impulse=c.createBuffer(2,Math.ceil(c.sampleRate*1.1),c.sampleRate);
      for(let channel=0;channel<2;channel++){
        const data=impulse.getChannelData(channel);let seed=103+channel*37;
        for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;const p=i/data.length;data[i]=(seed/4294967296*2-1)*Math.pow(1-p,3.8)*(i<c.sampleRate*.018?0:.22);}
      }
      const roomTone=c.createBiquadFilter();roomTone.type='lowpass';roomTone.frequency.value=4400;roomTone.Q.value=.707;this.toneFilters.push(roomTone);
      this.room.buffer=impulse;awardOutput.connect(this.roomGain).connect(this.room).connect(roomTone).connect(this.master);
      // The background has its own restrained room send and independent music switch.
      this.musicRoomGain=c.createGain();this.musicRoomGain.gain.value=this.settings.music?SOFT_MIX.musicRoom:0;
      this.pressMusicGate.connect(this.musicRoomGain).connect(this.room);
    }

  }
  private softenBus(c:AudioContext,bus:GainNode,kind:Bus):BiquadFilterNode{
    const presence=c.createBiquadFilter(),shelf=c.createBiquadFilter(),tone=SOFT_TONE[kind];
    presence.type='peaking';presence.frequency.value=2800;presence.Q.value=.75;presence.gain.value=tone.presence;
    shelf.type='highshelf';shelf.frequency.value=4200;shelf.gain.value=tone.shelf;
    bus.connect(presence).connect(shelf);this.toneFilters.push(presence,shelf);return shelf;
  }
  private readyEffect(key:string,interval:number):boolean{
    if(this.hidden||this.destroyed||!this.settings.sound)return false;
    this.unlock();const c=this.context;if(!c)return false;
    const last=this.lastCue.get(key);if(last!==undefined&&c.currentTime-last<interval)return false;
    this.lastCue.set(key,c.currentTime);return true;
  }
  private pattern(notes:readonly Note[],level=1,group?:VoiceGroup):boolean{
    const c=this.context;if(!c)return false;const before=this.voices.size;
    for(const [pitch,length,delay,volume,wave,instrument,pan] of notes)this.note(pitch,c.currentTime+.005+delay,length,volume*level,wave,'effects',undefined,instrument,pan,group);
    return this.voices.size>before;
  }
  private note(pitch:number,start:number,length:number,volume:number,wave:OscillatorType,bus:Bus,awardId?:number,instrument?:Instrument,pan=0,group?:VoiceGroup):void{
    const c=this.context,target=bus==='music'?this.musicBus:bus==='award'?this.awardBus:this.effectsBus;
    if(!c||!target||this.hidden||this.destroyed||this.voices.size>=48)return;
    const o=c.createOscillator(),g=c.createGain(),tone=c.createBiquadFilter(),shape=instrument?VOICE_SHAPES[instrument]:undefined;
    o.type=wave;o.frequency.setValueAtTime(pitch,start);tone.type='lowpass';
    if(shape&&typeof c.createPeriodicWave==='function'){
      let periodic=this.waveCache.get(instrument!);
      if(!periodic){const real=new Float32Array(shape.harmonics.length+1),imag=new Float32Array(real.length);imag.set(shape.harmonics,1);periodic=c.createPeriodicWave(real,imag);this.waveCache.set(instrument!,periodic);}
      o.setPeriodicWave(periodic);
    }
    const attack=Math.min(length*.28,shape?.attack??(wave==='sawtooth'?.045:bus==='music'?.025:.009));
    tone.Q.value=.707;
    tone.frequency.setValueAtTime(shape?.cutoff??(wave==='sawtooth'?1100:wave==='triangle'?1400:2600),start);
    if(shape)tone.frequency.exponentialRampToValueAtTime(shape.tailCutoff,start+length);
    const peak=Math.max(.0002,volume);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(peak,start+attack);
    if(shape){g.gain.exponentialRampToValueAtTime(Math.max(.00015,peak*shape.sustain),start+length*.62);}
    g.gain.exponentialRampToValueAtTime(.0001,start+length);
    const panner=typeof c.createStereoPanner==='function'?c.createStereoPanner():undefined;
    if(panner)panner.pan.setValueAtTime(Math.max(-.5,Math.min(.5,pan)),start);
    const voice:Voice={oscillator:o,gain:g,filter:tone,panner,bus,awardId,group,end:start+length+.025};this.trackVoice(voice);
    const output=o.connect(tone).connect(g);if(panner)output.connect(panner).connect(target);else output.connect(target);
    o.start(start);o.stop(voice.end);
  }
  private trackVoice(voice:Voice):void{
    this.voices.add(voice);const award=this.activeAward;if(voice.bus==='award'&&award&&award.id===voice.awardId)award.scheduled++;let cleaned=false;
    voice.oscillator.onended=()=>{if(cleaned)return;cleaned=true;voice.oscillator.disconnect();voice.gain.disconnect();voice.filter.disconnect();voice.panner?.disconnect();this.voices.delete(voice);if(this.musicVoice===voice)this.musicVoice=undefined;if(this.rollVoice===voice)this.rollVoice=undefined;};
  }
  private fade(node:GainNode|undefined,value:number,duration:number):void{
    const c=this.context;if(!node||!c)return;const p=node.gain;
    // cancelAndHold keeps a quick second toggle continuous while a fade is underway.
    if(typeof p.cancelAndHoldAtTime==='function')p.cancelAndHoldAtTime(c.currentTime);
    else{p.cancelScheduledValues(c.currentTime);p.setValueAtTime(p.value,c.currentTime);}
    p.linearRampToValueAtTime(value,c.currentTime+duration);
  }
  private resetPressGate():void{
    const c=this.context,p=this.pressMusicGate?.gain;if(!c||!p)return;
    p.cancelScheduledValues(c.currentTime);p.setValueAtTime(1,c.currentTime);
  }
  /** Briefly clear space for a physical button, not a long victory-music fade. */
  private duckPressMusic():void{
    const c=this.context,gate=this.pressMusicGate;if(!c||!gate||!this.settings.music||this.activeAward)return;
    this.fade(gate,SOFT_MIX.pressDuck,.012);
    gate.gain.setValueAtTime(SOFT_MIX.pressDuck,c.currentTime+.065);
    gate.gain.linearRampToValueAtTime(1,c.currentTime+.18);
  }
  private duck(duration:number):void{
    const c=this.context;if(!c||!this.settings.music||this.activeAward)return;
    this.duckUntil=Math.max(this.duckUntil,c.currentTime+duration);
    this.fade(this.musicBus,SOFT_MIX.duck,.09);
    this.musicBus?.gain.setValueAtTime(SOFT_MIX.duck,this.duckUntil);
    this.musicBus?.gain.linearRampToValueAtTime(SOFT_MIX.music,this.duckUntil+.55);
  }
  private musicLevel():number{return this.activeAward&&this.settings.sound?(this.activeAward.tier===0?SOFT_MIX.returnDuck:SOFT_MIX.awardDuck):this.context&&this.context.currentTime<this.duckUntil?SOFT_MIX.duck:SOFT_MIX.music;}
  private startMusic():void{
    const c=this.context;if(!c||this.destroyed||this.hidden||!this.unlocked||!this.settings.music||c.state!=='running')return;
    const key=musicKey(this.scene),buffer=this.recordings?.get(key);
    if(buffer){
      if(this.musicVoice&&this.musicVoiceKey===key)return;
      this.stopMusic();this.stopVoices('music',.40);this.musicVoiceKey=key;
      this.musicVoice=this.clip(buffer,'music',SOFT_MIX.musicClip,{loop:musicDuration(this.scene),attack:.60});return;
    }
    if(this.timer!==undefined)return;
    this.nextBeat=Math.max(c.currentTime+.08,this.nextBeat);
    this.timer=setInterval(()=>this.scheduleMusic(),130);this.scheduleMusic();
  }
  private scheduleMusic():void{
    const c=this.context;if(!c||this.hidden||!this.settings.music||c.state!=='running')return;
    const plan=musicWindow(c.currentTime,this.nextBeat,this.beat,this.scene);
    plan.times.forEach((time,i)=>{for(const [pitch,length,delay,volume,wave,instrument,pan] of musicNotes(plan.firstBeat+i,this.scene))this.note(pitch,time+delay,length,volume,wave,'music',undefined,instrument,pan);});
    this.nextBeat=plan.nextBeat;this.beat=plan.beat;
  }
  private stopMusic():void{if(this.timer!==undefined){clearInterval(this.timer);this.timer=undefined;}}
  private retireVoice(voice:Voice,duration:number):void{
    const c=this.context;if(!c||voice.retiring)return;voice.retiring=true;
    voice.end=Math.min(voice.end,c.currentTime+duration);
    this.fade(voice.gain,.0001,duration);
    try{voice.oscillator.stop(voice.end);}catch{/* Already ended. */}
  }
  private stopVoices(bus?:Bus,fade=.04):void{
    const c=this.context;if(!c)return;
    for(const voice of this.voices){
      if(bus&&voice.bus!==bus)continue;
      voice.end=Math.min(voice.end,c.currentTime+fade);
      if(fade>0){voice.gain.gain.cancelScheduledValues(c.currentTime);voice.gain.gain.setValueAtTime(voice.gain.gain.value,c.currentTime);voice.gain.gain.linearRampToValueAtTime(.0001,voice.end);}
      try{voice.oscillator.stop(voice.end);}catch{/* Already ended. */}
      if(fade===0){voice.oscillator.onended?.(new Event('ended'));}
    }
    if(!bus||bus==='music'){this.nextBeat=0;this.musicVoice=undefined;this.musicVoiceKey='';}
  }
}
