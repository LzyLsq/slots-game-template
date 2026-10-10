import {themeMusic} from './MusicTheme';
import {_decorator,Component,game,Game} from 'cc';
import {SoundscapeEngine} from './SoundscapeEngine';
import type {FeatureSoundStage} from './FeedbackCatalog';
import type {Cue} from './AudioScore';
import type {AwardSoundtrack} from './AwardScore';
const {ccclass}=_decorator;
/** Gesture-unlocked, independently persisted music/effects with gentle tactile feedback. */
@ccclass('AudioManager')
export class AudioManager extends Component {
  private qa=false;private proofWait=0;
  private readonly engine=new SoundscapeEngine();
  private readonly gesture=():void=>this.engine.unlock();
  private readonly pause=():void=>this.engine.pause();
  private readonly resume=():void=>this.engine.resume();
  protected onLoad():void{
    this.qa=typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('debug')==='1';
    this.engine.prepare();
    game.on(Game.EVENT_HIDE,this.pause,this);game.on(Game.EVENT_SHOW,this.resume,this);
    globalThis.document?.addEventListener('pointerdown',this.gesture,{passive:true});
    // Fallback for older WebViews, not a duplicate unlock on modern touch devices.
    if(typeof PointerEvent==='undefined')globalThis.document?.addEventListener('touchstart',this.gesture,{passive:true});
  }
  protected onDestroy():void{
    game.off(Game.EVENT_HIDE,this.pause,this);game.off(Game.EVENT_SHOW,this.resume,this);
    globalThis.document?.removeEventListener('pointerdown',this.gesture);
    globalThis.document?.removeEventListener('touchstart',this.gesture);this.engine.destroy();
  }
  /** Read-only markers only for explicit localhost QA; no visible debug overlay. */
  protected update(dt:number):void{
    if(!this.qa)return;this.proofWait-=dt;if(this.proofWait>0)return;this.proofWait=.7;
    const canvas=globalThis.document?.getElementById('GameCanvas');if(!canvas)return;
    const s=this.engine.snapshot(),proof:Record<string,string|number|boolean>={scene:s.scene,bpm:themeMusic(s.scene).bpm,track:s.musicTrack,recorded:s.recordedMusic,voices:s.musicVoices,state:s.state,music:s.music,effects:s.sound,ready:s.readyRecordings,failures:s.recordingFailures,'cue-sequence':s.cuePlays,cue:s.lastPlayedCue,'cue-source':s.lastCueSource,'cue-rate':s.lastCueRate,'press-voices':s.pressVoices,'cue-counts':JSON.stringify(s.cueCounts),'music-level':s.musicLevel,'music-trim':s.musicTrim.toFixed(4),'music-position':s.musicPosition.toFixed(3),'award-active':s.awardActive,'award-voices':s.awardVoices,'success-voices':s.celebrationVoices,'guardian-voices':s.guardianVoices,'feature-voices':s.featureVoices,'feature-sequence':s.featurePlays,'feature-stage':s.lastFeatureStage,'feature-source':s.lastFeatureSource};
    for(const key of Object.keys(proof))canvas.setAttribute('data-soundtrack-'+key,String(proof[key]));
  }
  public setMusic(enabled:boolean):void{this.engine.configure({music:enabled});}
  public setEffects(enabled:boolean):void{this.engine.configure({sound:enabled});}
  public setVibration(enabled:boolean):void{this.engine.configure({vibration:enabled});}
  public setScene(scene:string):void{this.engine.setScene(scene);}
  public stopSpin():void{this.engine.stopSpin();}
  public unlock():void{this.engine.unlock();}
  public play(cue:Cue):void{this.engine.play(cue);}
  public awardDiagnostics():{voices:number;state:string;audible:boolean;scene:string;musicBpm:number;scheduled:number;hidden:boolean;recordedMusic:boolean;recordedAward:boolean;musicTrack:string;readyRecordings:number;recordingFailures:number;recordingError:string}{const s=this.engine.snapshot();return {voices:s.awardVoices,state:s.state,audible:s.sound&&s.state==='running'&&!s.hidden,scene:s.scene,musicBpm:themeMusic(s.scene).bpm,scheduled:s.awardScheduledNotes,hidden:s.hidden,recordedMusic:s.recordedMusic,recordedAward:s.recordedAward,musicTrack:s.musicTrack,readyRecordings:s.readyRecordings,recordingFailures:s.recordingFailures,recordingError:s.recordingError};}
  public beginAward(tier:number,countEnd:number,profitable=true):AwardSoundtrack{return this.engine.beginAward(tier,countEnd,profitable);}
  public playGuardian(theme:number):void{this.engine.guardian(theme);}
  public playFeature(stage:FeatureSoundStage):void{this.engine.feature(stage);}
  public playAward(step=0):void{this.engine.award(step);}
  public vibrate(pattern:number|number[]=9):void{this.engine.vibrate(pattern);}
}
