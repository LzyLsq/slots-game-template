import {AWARD_MUSIC_CROSSFADE} from '../vfx/AwardTiming';
import {winTier} from '../vfx/WinPresentation';
import { _decorator, AudioClip, AudioSource, Component, game, Game, Node, resources } from 'cc';
const { ccclass } = _decorator;

import { audioAssets, AudioScene as Scene, AudioCue as Cue, AWARD_SCORES, awardName, ClipName, cueName, tonalName } from './AudioPalette';
const FEEDBACK_LEVELS: Record<Cue, number> = {tap:.40, spin:.55, 'reel-stop':.53, win:.58, reward:.56};
const FEEDBACK_GAPS: Record<Cue, number> = {tap:.065, spin:.12, 'reel-stop':.035, win:.24, reward:.18};
// Music remains audible beneath the foreground cue; level is never added to
// the effect itself. Per-voice holds cover the decoded clip and its last tail.
const FEEDBACK_MUSIC_GAIN: Readonly<Record<string, number>> = {
  tap:.24, spin:.28, 'reel-stop':.22, win:.18, reward:.18,
  'win-normal':.18, feature:.18, 'award-accent':.28, 'award-collect':.20,
};
const FEEDBACK_TAIL = .08;
const MUSIC_RECOVERY = .45;

/** All audible voices are owned AudioSources, so mute, hide and scene exit can
 * stop them. Cocos playOneShot creates detached players that source.stop cannot
 * silence; it also multiplies the supplied level by source.volume. */
@ccclass('AudioManager')
export class AudioManager extends Component {
  private readonly clips = new Map<ClipName, AudioClip>();
  private readonly pendingClips = new Map<ClipName, Promise<void>>();
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
  private clock = 0;
  private feedbackGain = 1;
  private readonly feedbackDucks = new Map<AudioSource, {remaining: number; gain: number}>();
  private readonly lastFeedback = new Map<string, number>();
  private scorePaused = false;
  private cadencePaused = false;

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

  /** Prepare only the destination's music and cues before its controls unlock.
   * Two decode workers keep first entry from queuing every soundtrack at once. */
  public async prepare(scenes: readonly Scene[] = ['salon'], progress?: (done: number, total: number) => void): Promise<void> {
    const names = audioAssets(scenes), queue = names.slice();
    let done = 0;
    const deadline = Date.now() + 20000;
    const worker = async (): Promise<void> => {
      while (queue.length) {
        const name = queue.shift()!, remaining = deadline - Date.now();
        // One preparation budget for the whole scene, including stalled sounds.
        if (remaining > 0) await this.loadClip(name, remaining);
        progress?.(++done, names.length);
      }
    };
    await Promise.all([worker(), worker()]);
  }
  private loadClip(name: ClipName, timeoutMs: number): Promise<void> {
    if (this.clips.has(name)) return Promise.resolve();
    const pending = this.pendingClips.get(name);
    if (pending) return pending;
    // Optional audio failure must not hold input or settlement indefinitely.
    const load = new Promise<void>(resolve => {
      let settled = false;
      const finish = (error?: unknown, clip?: AudioClip): void => {
        if (settled) return;
        settled = true; clearTimeout(timeout);
        if (error) console.warn('Audio unavailable:', name, error);
        else if (clip && this.isValid) this.clips.set(name, clip);
        resolve();
      };
      const timeout = setTimeout(() => finish(new Error('Sound load timed out')), timeoutMs);
      resources.load(`audio/${name}`, AudioClip, (error, clip) => finish(error, clip));
    });
    this.pendingClips.set(name, load);
    void load.then(() => this.pendingClips.delete(name));
    return load;
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

  public play(cue: Cue, column = 0): void {
    this.feedback(cueName(cue, this.scene, column), FEEDBACK_LEVELS[cue], cue, FEEDBACK_GAPS[cue]);
  }
  public playAward(step = 0): void {
    const cue = step === 0 ? 'win-normal' : 'feature';
    this.feedback(tonalName(cue, this.scene), .58, cue, .24);
  }
  /** One punctuation at each visible tier upgrade; not a second fanfare. */
  public accentCelebration(tier: number): void {
    if (!this.celebrating || this.resolved || this.closing) return;
    this.feedback(tonalName('award-accent', this.scene), .30 + Math.min(3, Math.max(0, tier)) * .035, 'award-accent', .18);
  }
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
    const clip = this.clips.get(awardName(AWARD_SCORES[this.awardTier],this.scene));
    if (this.effectsEnabled && !this.hidden && clip) {
      this.score.clip = clip; this.score.play(); this.scoreTarget = .59 + this.awardTier*.014;
    }
    this.mixMusic();
  }
  /** The exact amount becoming visible is the musical resolution event,
   * including an early tap and reduced-motion entry. Never restart on unmute. */
  public revealCelebration(): void {
    if (!this.celebrating || this.resolved || this.closing) return;
    this.resolved = true; this.scoreTarget = 0; this.scoreFadeRemaining = AWARD_MUSIC_CROSSFADE;
    const clip = this.clips.get(awardName(AWARD_SCORES[this.awardTier],this.scene,true));
    if (this.effectsEnabled && !this.hidden && clip) {
      this.cadence.clip = clip; this.cadence.volume = 0;
      this.cadence.play(); this.cadenceTarget = .58 + this.awardTier*.014;
    }
    this.mixMusic();
  }
  /** Match both voices to the visual exit instead of cutting a long fanfare. */
  public closeCelebration(seconds: number): void {
    if (!this.celebrating || this.closing) return;
    this.closing = true; this.closeDuration = Math.max(.01,seconds); this.closeRemaining = this.closeDuration;
    // A single short receipt accompanies coins reaching the real wallet.
    // It never awards currency and obeys the same mute/background policy.
    this.feedback(tonalName('coin-collect',this.scene),.38,'award-collect',.18);
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
    const elapsed = Math.min(dt, .1);
    this.clock += elapsed;
    if (this.feedbackDucks.size) {
      this.feedbackDucks.forEach((duck, source) => {
        duck.remaining -= elapsed;
        // Native playback may be queued: never restore over a still-live tail.
        if (duck.remaining <= 0 && !source.playing) this.feedbackDucks.delete(source);
      });
      this.mixMusic();
    }
    if (this.rolling.playing) {
      const target = .20 * (this.feedbackGain < 1 ? .45 : 1);
      const time = target < this.rolling.volume ? .018 : .18;
      this.rolling.volume += (target - this.rolling.volume) * (1 - Math.exp(-elapsed / time));
    }
    for (let i = 0; i < this.music.length; i++) {
      const source = this.music[i];
      const time = this.targets[i] < source.volume ? .018 : MUSIC_RECOVERY;
      source.volume += (this.targets[i] - source.volume) * (1 - Math.exp(-elapsed / time));
      if (this.targets[i] === 0 && source.volume < .002 && source.playing) { source.stop(); source.volume = 0; }
    }
    if (this.closing) {
      const previous = this.closeRemaining;
      this.closeRemaining = Math.max(0,previous-Math.min(dt,.1));
      const p=this.closeRemaining/this.closeDuration,q=previous/this.closeDuration;
      const fade = q>0 ? (p*p*(3-2*p))/(q*q*(3-2*q)) : 0;
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

  private source(name: string, loop: boolean): AudioSource {
    const child = new Node(name); this.node.addChild(child);
    const source = child.addComponent(AudioSource);
    source.playOnAwake = false; source.loop = loop; source.volume = 0;
    return source;
  }
  private mixMusic(): void {
    this.feedbackGain = 1;
    this.feedbackDucks.forEach(duck => { this.feedbackGain = Math.min(this.feedbackGain, duck.gain); });
    this.targets = [0, 0];
    if (this.active >= 0 && this.musicEnabled && !this.hidden) {
      const audibleAward = this.celebrating && this.effectsEnabled && (this.scoreTarget>0 || this.cadenceTarget>0);
      const awardGain = audibleAward
        ? this.closing
          ? 1 - .84 * ((this.closeRemaining / this.closeDuration) ** 2 * (3 - 2 * this.closeRemaining / this.closeDuration))
          : .16
        : 1;
      // Stops must also duck while other columns are still rolling. Award
      // exits cannot restore music before the wallet receipt has finished.
      const duck = Math.min(awardGain, this.spinning ? .76 : 1, this.feedbackGain);
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
  private feedback(name: ClipName, volume: number, category: string, gap: number): void {
    if (!this.effectsEnabled || this.hidden) return;
    const clip = this.clips.get(name); if (!clip) return;
    const previous = this.lastFeedback.get(category);
    if (previous !== undefined && this.clock - previous < gap) return;
    this.lastFeedback.set(category, this.clock);
    // Rotate through bounded voices even during asynchronous native loading:
    // `playing` can still be false immediately after a queued play operation.
    const source = this.effects[this.voice++ % this.effects.length];
    source.stop(); source.clip = clip; source.volume = volume;
    const duration = clip.getDuration();
    this.feedbackDucks.set(source, {
      remaining: (Number.isFinite(duration) && duration > 0 ? duration : .35) + FEEDBACK_TAIL,
      gain: FEEDBACK_MUSIC_GAIN[category] ?? .24,
    });
    this.mixMusic();
    // Arm the reduction before play, including an outgoing crossfade voice.
    // Cocos' WebAudio player smooths its gain change; recovery uses update.
    for (const music of this.music) music.volume = Math.min(music.volume, this.musicVolume * this.feedbackGain);
    if (this.rolling.playing) this.rolling.volume = Math.min(this.rolling.volume, .09);
    source.play();
  }
  private syncRolling(): void {
    if (!this.spinning || !this.effectsEnabled || this.hidden) { this.rolling.stop(); return; }
    const clip = this.clips.get('reel-roll'); if (!clip || this.rolling.playing) return;
    this.rolling.clip = clip; this.rolling.volume = .20 * (this.feedbackGain < 1 ? .45 : 1); this.rolling.play();
  }
  private stopFeedback(): void {
    this.effects.forEach(source => source.stop()); this.rolling.stop();
    this.lastFeedback.clear(); this.feedbackDucks.clear(); this.feedbackGain = 1;
  }
  private pause(): void {
    this.hidden = true;
    this.scorePaused = this.score.playing; this.cadencePaused = this.cadence.playing;
    this.music.forEach((source, index) => index === this.active ? source.pause() : source.stop());
    this.score.pause(); this.cadence.pause();
    this.stopFeedback();
  }
  private resume(): void {
    this.hidden = false;
    if (this.musicEnabled && this.active >= 0 && this.music[this.active].clip === this.clips.get(`music-${this.scene}`)) {
      this.music[this.active].play(); this.mixMusic();
    } else this.switchScene();
    if (this.celebrating && this.effectsEnabled) {
      if (this.scoreTarget > 0 && this.scorePaused) this.score.play();
      if (this.cadenceTarget > 0 && this.cadencePaused) this.cadence.play();
    }
    this.scorePaused = this.cadencePaused = false;
    this.syncRolling();
  }
}
