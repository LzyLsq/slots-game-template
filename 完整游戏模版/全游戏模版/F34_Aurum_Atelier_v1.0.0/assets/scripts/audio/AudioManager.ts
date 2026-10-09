import {AWARD_MUSIC_CROSSFADE} from '../vfx/AwardTiming';
import {winTier} from '../vfx/WinPresentation';
import { _decorator, AudioClip, AudioSource, Component, game, Game, Node, resources } from 'cc';
const { ccclass } = _decorator;

type Scene = 'salon' | 'golden-hour' | 'jade-treasury' | 'pearl-palace' | 'ruby-revel';
type Cue = 'tap' | 'spin' | 'reel-stop' | 'win' | 'reward';
type AwardName = `win-${'grand'|'super'|'mega'|'epic'}${''|'-resolve'}${''|`-${Scene}`}`;
type ClipName = 'ui-touch' | 'reel-start' | 'reel-roll' | 'reel-stop' | 'win-normal' | 'win-grand' | 'win-super' | 'win-mega' | 'win-epic' | 'coin-collect' | 'feature' | AwardName | `music-${Scene}`;
const MUSIC: Scene[] = ['salon', 'golden-hour', 'jade-treasury', 'pearl-palace', 'ruby-revel'];
const CUES: Record<Cue, ClipName> = {
  tap: 'ui-touch', spin: 'reel-start', 'reel-stop': 'reel-stop', win: 'win-normal', reward: 'coin-collect',
};
const AWARDS: AwardName[] = ['win-grand', 'win-super', 'win-mega', 'win-epic'];

/** All audible voices are owned AudioSources, so mute, hide and scene exit can
 * stop them. Cocos playOneShot creates detached players that source.stop cannot
 * silence; it also multiplies the supplied level by source.volume. */
@ccclass('AudioManager')
export class AudioManager extends Component {
  private readonly clips = new Map<ClipName, AudioClip>();
  private music: AudioSource[] = [];
  private effects: AudioSource[] = [];
  private rolling!: AudioSource;
  private score!: AudioSource;
  private cadence!: AudioSource;
  private cadenceTarget = 0;
  private awardTier = 0;
  private resolved = false;
  private closing = false;
  private closeRemaining = 0;
  private closeDuration = .42;
  private scoreFadeRemaining = 0;
  private voice = 0;
  private musicEnabled = false;
  private effectsEnabled = true;
  private vibrationEnabled = true;
  private hidden = false;
  private spinning = false;
  private celebrating = false;
  private scene: Scene = 'salon';
  private active = -1;
  private targets = [0, 0];
  private scoreTarget = 0;
  private readonly musicVolume = .42;

  protected onLoad(): void {
    this.music = [0, 1].map(index => this.source(`Music ${index}`, true));
    this.effects = Array.from({length: 6}, (_, index) => this.source(`Managed feedback ${index}`, false));
    this.rolling = this.source('Reel mechanism', true);
    this.score = this.source('Award performance score', false);
    this.cadence = this.source('Award resolution score', false);
    game.on(Game.EVENT_HIDE, this.pause, this);
    game.on(Game.EVENT_SHOW, this.resume, this);
  }
  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.pause, this);
    game.off(Game.EVENT_SHOW, this.resume, this);
    this.music.forEach(source => source.stop());
    this.stopFeedback(); this.score.stop(); this.cadence.stop();
  }

  public async prepare(): Promise<void> {
    const names = new Set<ClipName>([
      ...MUSIC.map(scene => `music-${scene}` as ClipName), ...Object.values(CUES), 'reel-roll', 'feature',
      ...MUSIC.filter(scene=>scene!=='salon').flatMap(scene=>AWARDS.flatMap(name=>[this.awardName(name,scene),this.awardName(name,scene,true)])),
    ]);
    // A missing optional score cannot lock the game or prevent settlement.
    await Promise.all(Array.from(names).map(name => new Promise<void>(resolve => {
      resources.load(`audio/${name}`, AudioClip, (error, clip) => {
        if (error) console.warn('Audio unavailable:', name, error);
        else this.clips.set(name, clip);
        resolve();
      });
    })));
    this.switchScene();
  }

  public setScene(scene: Scene): void {
    if (this.scene === scene && this.active >= 0) return;
    this.stopFeedback(); this.spinning = false;
    this.celebrating = false; this.closing = false; this.scoreTarget = this.cadenceTarget = 0; this.score.stop(); this.cadence.stop();
    this.scene = scene; this.switchScene();
  }
  public setMusic(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.targets = [0, 0];
      this.music.forEach(source => { source.volume = 0; source.stop(); });
      return;
    }
    this.switchScene();
  }
  public setEffects(enabled: boolean): void {
    this.effectsEnabled = enabled;
    if (!enabled) {
      this.stopFeedback(); this.score.stop(); this.cadence.stop();
      this.score.volume = this.cadence.volume = 0; this.scoreTarget = this.cadenceTarget = 0;
    } else this.syncRolling();
    this.mixMusic();
  }
  public setVibration(enabled: boolean): void { this.vibrationEnabled = enabled; }

  public play(cue: Cue): void {
    this.feedback(CUES[cue], cue === 'tap' ? .36 : cue === 'reel-stop' ? .50 : .60);
  }
  public playAward(step = 0): void { this.feedback(step === 0 ? 'win-normal' : 'feature', .56); }
  public setSpinning(spinning: boolean): void {
    if (this.spinning === spinning) return;
    this.spinning = spinning; this.syncRolling(); this.mixMusic();
  }
  public playCelebration(ratio: number): void {
    this.setSpinning(false);
    this.celebrating = true; this.resolved = false; this.closing = false;
    this.awardTier = Math.max(0, Math.min(3, winTier(ratio) - 1));
    this.score.stop(); this.cadence.stop();
    this.score.volume = this.cadence.volume = 0;
    this.scoreTarget = this.cadenceTarget = 0; this.scoreFadeRemaining = 0;
    const clip = this.clips.get(this.awardName(AWARDS[this.awardTier],this.scene));
    if (this.effectsEnabled && !this.hidden && clip) {
      this.score.clip = clip; this.score.play(); this.scoreTarget = .62;
    }
    this.mixMusic();
  }
  /** The exact amount becoming visible is the musical resolution event,
   * including an early tap and reduced-motion entry. Never restart on unmute. */
  public revealCelebration(): void {
    if (!this.celebrating || this.resolved || this.closing) return;
    this.resolved = true; this.scoreTarget = 0; this.scoreFadeRemaining = AWARD_MUSIC_CROSSFADE;
    const clip = this.clips.get(this.awardName(AWARDS[this.awardTier],this.scene,true));
    if (this.effectsEnabled && !this.hidden && clip) {
      this.cadence.clip = clip; this.cadence.volume = 0;
      this.cadence.play(); this.cadenceTarget = .60;
    }
    this.mixMusic();
  }
  /** Match both voices to the visual exit instead of cutting a long fanfare. */
  public closeCelebration(seconds: number): void {
    if (!this.celebrating || this.closing) return;
    this.closing = true; this.closeDuration = Math.max(.01,seconds); this.closeRemaining = this.closeDuration;
  }
  /** Automatic completion, early collection and exceptional destruction. */
  public endCelebration(): void {
    this.celebrating = false; this.closing = false;
    this.scoreTarget = this.cadenceTarget = 0;
    this.score.stop(); this.cadence.stop(); this.score.volume = this.cadence.volume = 0;
    this.mixMusic();
  }
  public vibrate(pattern: number | number[] = 18): void {
    if (!this.vibrationEnabled || this.hidden || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(pattern);
  }

  protected update(dt: number): void {
    // Do not fade/stop a paused source while backgrounded; play() must resume
    // its position when the same still-active presentation returns.
    if (this.hidden) return;
    const blend = 1 - Math.exp(-Math.min(dt, .1) / .30);
    for (let i = 0; i < this.music.length; i++) {
      const source = this.music[i];
      source.volume += (this.targets[i] - source.volume) * blend;
      if (this.targets[i] === 0 && source.volume < .002 && source.playing) { source.stop(); source.volume = 0; }
    }
    if (this.closing) {
      const previous = this.closeRemaining;
      this.closeRemaining = Math.max(0,previous-Math.min(dt,.1));
      const fade = previous > 0 ? this.closeRemaining/previous : 0;
      this.score.volume *= fade; this.cadence.volume *= fade;
      this.mixMusic();
      if (this.closeRemaining === 0) this.endCelebration();
    } else {
      if(this.scoreFadeRemaining>0){
        const previous=this.scoreFadeRemaining;
        this.scoreFadeRemaining=Math.max(0,previous-Math.min(dt,.1));
        this.score.volume*=this.scoreFadeRemaining/previous;
        if(this.scoreFadeRemaining===0)this.score.stop();
      }
      for (const [source,target,time] of [[this.score,this.scoreTarget,.10],[this.cadence,this.cadenceTarget,.08]] as const) {
        if(source===this.score&&this.scoreFadeRemaining>0)continue;
        source.volume += (target-source.volume)*(1-Math.exp(-Math.min(dt,.1)/time));
        if (!target && source.volume < .002 && source.playing) { source.stop(); source.volume=0; }
      }
    }
  }

  private awardName(name: AwardName, scene: Scene, resolve = false): AwardName {
    return `${name}${resolve?'-resolve':''}${scene==='salon'||scene==='golden-hour'?'':`-${scene}`}` as AwardName;
  }
  private source(name: string, loop: boolean): AudioSource {
    const child = new Node(name); this.node.addChild(child);
    const source = child.addComponent(AudioSource);
    source.playOnAwake = false; source.loop = loop; source.volume = 0;
    return source;
  }
  private mixMusic(): void {
    this.targets = [0, 0];
    if (this.active >= 0 && this.musicEnabled && !this.hidden) {
      const audibleAward = this.celebrating && this.effectsEnabled && (this.scoreTarget>0 || this.cadenceTarget>0);
      const duck = audibleAward ? this.closing ? 1-.84*(this.closeRemaining/this.closeDuration) : .16 : this.spinning ? .80 : 1;
      this.targets[this.active] = this.musicVolume * duck;
    }
  }
  private switchScene(): void {
    if (!this.musicEnabled || this.hidden) { this.targets = [0, 0]; return; }
    const clip = this.clips.get(`music-${this.scene}`);
    if (!clip) return;
    if (this.active >= 0 && this.music[this.active].clip === clip && this.music[this.active].playing) {
      this.mixMusic(); return;
    }
    const next = this.active === 0 ? 1 : 0;
    this.music[next].stop(); this.music[next].clip = clip; this.music[next].volume = 0;
    this.music[next].play(); this.active = next; this.mixMusic();
  }
  private feedback(name: ClipName, volume: number): void {
    if (!this.effectsEnabled || this.hidden) return;
    const clip = this.clips.get(name); if (!clip) return;
    // Rotate through bounded voices even during asynchronous native loading:
    // `playing` can still be false immediately after a queued play operation.
    const source = this.effects[this.voice++ % this.effects.length];
    source.stop(); source.clip = clip; source.volume = volume; source.play();
  }
  private syncRolling(): void {
    if (!this.spinning || !this.effectsEnabled || this.hidden) { this.rolling.stop(); return; }
    const clip = this.clips.get('reel-roll'); if (!clip || this.rolling.playing) return;
    this.rolling.clip = clip; this.rolling.volume = .20; this.rolling.play();
  }
  private stopFeedback(): void { this.effects.forEach(source => source.stop()); this.rolling.stop(); }
  private pause(): void {
    this.hidden = true; this.music.forEach(source => source.pause()); this.score.pause(); this.cadence.pause();
    this.stopFeedback();
  }
  private resume(): void {
    this.hidden = false;
    if (this.musicEnabled && this.active >= 0 && this.music[this.active].clip === this.clips.get(`music-${this.scene}`)) {
      this.music[this.active].play(); this.mixMusic();
    } else this.switchScene();
    if (this.celebrating && this.effectsEnabled) {
      if (this.scoreTarget > 0) this.score.play();
      if (this.cadenceTarget > 0) this.cadence.play();
    }
    this.syncRolling();
  }
}
