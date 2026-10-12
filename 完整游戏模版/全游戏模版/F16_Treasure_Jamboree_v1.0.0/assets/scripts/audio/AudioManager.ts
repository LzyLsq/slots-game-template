import { SampleBank } from './SampleBank';
import { _decorator, Component, game, Game } from 'cc';
const { ccclass } = _decorator;

export type Cue = 'tap' | 'back' | 'select' | 'bet-up' | 'bet-down' | 'spin' | 'reel-stop' | 'win' | 'reward';
export type WinSoundCue = 'count' | 'burst' | 'reveal' | 'skip' | 'collect';
type VoicePool = Map<AudioScheduledSourceNode, () => void>;
type SoundScene = 'home' | 'cabinet' | 'spin';
type MusicTrack = { scene: SoundScene; element: HTMLAudioElement; source: MediaElementAudioSourceNode; gain: GainNode; released: boolean; playing: boolean; timer?: ReturnType<typeof setTimeout> };

/** Licensed authored music, streamed AAC, bounded short PCM feedback. */
@ccclass('AudioManager')
export class AudioManager extends Component {
  private context?: AudioContext;
  private musicEnabled = true;
  private effectsEnabled = true;
  private vibrationEnabled = true;
  private hidden = false;
  private disposed = false;
  private scene: 'home' | 'cabinet' = 'home';
  private spinning = false;
  private celebrating = false;
  private modalOpen = false;
  private spinTimer?: ReturnType<typeof setTimeout>;
  private samples?: SampleBank;
  private music?: MusicTrack;
  private retiringMusic = new Set<MusicTrack>();
  private musicPositions: Record<SoundScene, number> = { home: 0, cabinet: 0, spin: 0 };
  private winBuffers = new Map<string, AudioBuffer>();
  private winRequest = 0;
  private winFetch?: AbortController;
  private duckUntil = 0;
  private musicHandoffAt = 0;
  private celebrationReadyAt = 0;
  private effectsVoices: VoicePool = new Map();
  private celebrationVoices: VoicePool = new Map();
  private celebrationGains = new Map<AudioScheduledSourceNode, GainNode>();
  private celebrationFades = new Map<AudioScheduledSourceNode, ReturnType<typeof setTimeout>>();
  private winDetailVoices: VoicePool = new Map();
  private lastTap = -Infinity;
  private lastCount = -Infinity;
  private lastCountStep = -1;
  private readonly musicLevel = .46;

  protected onLoad(): void {
    game.on(Game.EVENT_HIDE, this.pause, this); game.on(Game.EVENT_SHOW, this.resume, this);
    globalThis.window?.addEventListener('pointerdown', this.unlockMusic, { passive: true });
    globalThis.window?.addEventListener('touchstart', this.unlockMusic, { passive: true });
    globalThis.window?.addEventListener('keydown', this.unlockMusic);
  }
  protected onEnable(): void { this.audioContext(); }
  protected onDestroy(): void {
    this.disposed = true;
    game.off(Game.EVENT_HIDE, this.pause, this); game.off(Game.EVENT_SHOW, this.resume, this);
    globalThis.window?.removeEventListener('pointerdown', this.unlockMusic); globalThis.window?.removeEventListener('keydown', this.unlockMusic);
    globalThis.window?.removeEventListener('touchstart', this.unlockMusic);
    this.finishSpin(); this.stopEffects(); this.stopMusic(); this.samples?.close(); this.samples = undefined; this.winBuffers.clear();
    if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); }
  }

  public setMusic(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
    else if (this.context?.state === 'running') this.startMusic();
  }
  public setEffects(enabled: boolean): void { this.effectsEnabled = enabled; if (!enabled) this.stopEffects(); }
  public setVibration(enabled: boolean): void { this.vibrationEnabled = enabled; }
  /** Separate compositions, with sequential fade-out/fade-in and bounded player count. */
  public setScene(scene: 'home' | 'cabinet'): void {
    if (this.scene === scene) return;
    this.scene = scene; this.modalOpen = false;
    if (this.spinTimer !== undefined) clearTimeout(this.spinTimer);
    this.spinTimer = undefined; this.spinning = false; this.stopEffects();
    this.retireMusic(); this.startMusic();
  }


  /** BGM changes only after an accepted spin; invalid taps never start a loop. */
  public beginSpin(): void {
    if (this.scene !== 'cabinet' || this.hidden || this.disposed) return;
    if (this.spinning) return;
    this.finishWinPresentation();
    this.spinning = true; this.restoreMusic(); this.startMusic();
    // Safety cleanup for interrupted external requests, not an award timer.
    this.spinTimer = setTimeout(() => this.finishSpin(), 20000);
  }
  public finishSpin(): void {
    if (this.spinTimer !== undefined) clearTimeout(this.spinTimer);
    this.spinTimer = undefined;
    if (!this.spinning) return;
    this.spinning = false; this.restoreMusic();
  }
  public setModalOpen(open: boolean): void {
    if (this.modalOpen === open) return;
    this.modalOpen = open; this.restoreMusic();
  }
  public situationStatus(): { mix: string; scene: string; spinning: boolean; celebrating: boolean; modal: boolean; track?: string } {
    return { mix: 'calm-single-focus-20261012', scene: this.scene, spinning: this.spinning, celebrating: this.celebrating, modal: this.modalOpen, track: this.music?.scene };
  }
  private get activeMusicScene(): SoundScene { return this.scene; }
  private get situationLevel(): number { return this.celebrating ? 0 : this.modalOpen ? .18 : this.spinning ? .30 : this.musicLevel; }

  public play(cue: Cue): void {
    if (cue === 'spin') this.beginSpin();
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    if (cue === 'reel-stop') { this.playReelStop(); return; }
    if (this.celebrating && (cue === 'win' || cue === 'reward')) return;
    this.audioContext();
    const names: Record<Cue, string> = {tap:'ui-tap',back:'ui-back',select:'ui-select','bet-up':'bet-up','bet-down':'bet-down',spin:'spin-start','reel-stop':'stop-1',win:'reward',reward:'reward'};
    const levels: Record<Cue, number> = {tap:.23,back:.25,select:.28,'bet-up':.22,'bet-down':.22,spin:.30,'reel-stop':.28,win:.25,reward:.25};
    this.samples?.play(names[cue], levels[cue], cue === 'spin' ? 'reel' : 'ui', 1, .09);
  }
  public playReelStop(column = 0, final = false): void {
    if (final) this.finishSpin();
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    this.audioContext(); const index = Math.max(0, Math.floor(column)) % 3;
    this.samples?.play('stop-' + (index + 1), .28, 'reel', 1, .06);
  }
  public playAward(step = 0): void {
    if (!this.effectsEnabled || this.hidden || this.disposed || this.celebrating) return;
    this.audioContext(); this.samples?.play('reward', .25, 'detail', 1, .5);
  }

  public playSmallWinJingle(): void {
    this.playWinMusic('win-small', 1.55, .45);
  }

  public playWinFanfare(tier = 1): void {
    const i = Math.max(0, this.safeTier(tier) - 1);
    this.playWinMusic(['win-big', 'win-mega', 'win-epic', 'win-super'][i], [3.4, 4.273, 5.143, 5.591][i], .50);
  }

  private playWinMusic(id: string, duration: number, volume: number): void {
    this.finishSpin();
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    this.finishWinPresentation();
    const context = this.audioContext(); if (!context) return;
    const request = this.winRequest;
    this.samples?.stop('ui'); this.samples?.stop('reel');
    this.celebrating = true; this.duckMusic(duration + .4);
    // A long BGM is not decoded to PCM. Short celebrations have a two-item LRU.
    const begin = (buffer: AudioBuffer) => {
      if (request !== this.winRequest || !this.effectsEnabled || this.hidden || this.disposed || context.state !== 'running') return;
      const source = context.createBufferSource(), gain = context.createGain();
      gain.gain.value = 0;
      // Wait for the BGM/previous award to finish fading before a new melody.
      const startAt = Math.max(context.currentTime + .13, this.celebrationReadyAt, this.musicHandoffAt);
      source.buffer = buffer; gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(volume, startAt + .08);
      this.duckMusic(buffer.duration + startAt - context.currentTime + .25);
      this.celebrationGains.set(source, gain);
      source.connect(gain).connect(context.destination);
      this.track(source, [gain], this.celebrationVoices, 2);
      source.start(startAt);
    };
    const cached = this.winBuffers.get(id);
    if (cached) { this.winBuffers.delete(id); this.winBuffers.set(id, cached); begin(cached); return; }
    const controller = new AbortController(); this.winFetch = controller;
    void fetch(`audio/${id}.m4a`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`Music HTTP ${response.status}`); return response.arrayBuffer(); })
      .then(bytes => context.decodeAudioData(bytes))
      .then(buffer => {
        if (request !== this.winRequest || controller.signal.aborted || this.disposed) return;
        while (this.winBuffers.size >= 2) this.winBuffers.delete(this.winBuffers.keys().next().value!);
        this.winBuffers.set(id, buffer); this.winFetch = undefined; begin(buffer);
      }).catch(() => {
        if (request === this.winRequest && !controller.signal.aborted) this.finishWinPresentation();
      });
  }

  /** Called by actual animation events, including early reveal. No timer backlog. */
  public playWinDetail(cue: WinSoundCue, progress = 0, tier = 1): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    const context = this.audioContext(); if (!context) return;
    const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    if (cue === 'count') {
      // Three progress accents, not a second rhythmic track under the award.
      const step = Math.floor(p * 4);
      if (step < 1 || step > 3 || step <= this.lastCountStep || context.currentTime - this.lastCount < .55) return;
      this.lastCount = context.currentTime; this.lastCountStep = step;
      this.samples?.play('coin-' + step, tier ? .08 : .06, 'detail', 1, .55);
    } else if (cue === 'burst') {
      this.samples?.play('burst', .14, 'detail', 1, 1);
    } else if (cue === 'reveal' || cue === 'skip') {
      // Automatic number reveal keeps the authored phrase. A real skip fades it.
      if (cue === 'skip') this.stopCelebration(.18);
      this.samples?.stop('detail');
      if (cue === 'skip' || !this.celebrationVoices.size) this.samples?.play('reveal', .22, 'detail');
    } else { this.finishWinPresentation(); this.samples?.play('collect', .30, 'collect', 1, .20); }
  }
  public soundStatus(): ReturnType<SampleBank['status']> | undefined { return this.samples?.status(); }
  public finishWinPresentation(): void {
    this.celebrating = false;
    this.stopCelebration(); this.clearVoices(this.winDetailVoices); this.samples?.stop('detail'); this.lastCount = -Infinity; this.lastCountStep = -1; this.restoreMusic();
  }
  private safeTier(tier: number): number {
    return Number.isFinite(tier) ? Math.max(0, Math.min(4, Math.floor(tier))) : 1;
  }

  public vibrate(pattern: number | number[] = 18): void {
    if (!this.vibrationEnabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(pattern);
  }

  private audioContext(): AudioContext | undefined {
    if (typeof window === 'undefined' || this.hidden || this.disposed) return undefined;
    const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return undefined;
    try {
      if (!this.context) {
        this.context = new Constructor(); this.samples = new SampleBank(this.context);
        this.context.onstatechange = () => {
          if (this.context?.state === 'running') this.startMusic();
          else { this.stopEffects(); this.stopMusic(); }
        };
      }
      if (this.context.state === 'closed') return undefined;
      if (this.context.state === 'suspended') void this.context.resume().then(() => this.startMusic()).catch(() => {});
      return this.context;
    } catch { return undefined; }
  }

  /** Track and cap every source, including short UI sounds and scheduled notes. */
  private track(source: AudioScheduledSourceNode, nodes: AudioNode[], pool: VoicePool, limit = 72): void {
    while (pool.size >= limit) {
      const [old, cleanup] = pool.entries().next().value!;
      try { old.stop(); } catch { /* already ended */ } cleanup();
    }
    const cleanup = () => {
      pool.delete(source); this.celebrationGains.delete(source);
      const timer = this.celebrationFades.get(source); if (timer !== undefined) clearTimeout(timer);
      this.celebrationFades.delete(source);
      source.onended = null; source.disconnect(); nodes.forEach(n => n.disconnect());
    };
    pool.set(source, cleanup); source.onended = cleanup;
  }
  private clearVoices(pool: VoicePool): void {
    // Creator's release compiler assumes array spreads are arrays, not Maps.
    // forEach safely deletes current entries without iterable downlevel helpers.
    pool.forEach((cleanup, source) => { try { source.stop(); } catch { /* already ended */ } cleanup(); });
  }
  private readonly unlockMusic = (): void => {
    if (!this.musicEnabled && !this.effectsEnabled) return;
    const context = this.audioContext(); if (!context) return;
    if (context.state === 'running') this.startMusic();
    else void context.resume().then(() => this.startMusic()).catch(() => {});
  };
  private startMusic(): void {
    if (!this.musicEnabled || this.hidden || this.disposed || this.context?.state !== 'running' || typeof window.Audio !== 'function') return;
    if (this.music) { if (!this.music.playing) this.playMusicTrack(this.music); return; }
    const context = this.context, element = new window.Audio(), gain = context.createGain();
    gain.gain.value = 0;
    element.preload = 'none'; element.loop = true; element.setAttribute('playsinline', '');
    element.src = `audio/music-${this.activeMusicScene}.m4a`;
    let source: MediaElementAudioSourceNode;
    try { source = context.createMediaElementSource(element); } catch { element.removeAttribute('src'); return; }
    source.connect(gain).connect(context.destination);
    const music: MusicTrack = { scene: this.activeMusicScene, element, source, gain, released: false, playing: false };
    const enterAt = Math.max(context.currentTime, this.musicHandoffAt, this.celebrationReadyAt);
    gain.gain.setValueAtTime(0, context.currentTime); gain.gain.setValueAtTime(0, enterAt);
    const ducked = this.duckUntil > context.currentTime;
    gain.gain.linearRampToValueAtTime(ducked ? 0 : this.situationLevel, enterAt + .4);
    if (ducked) {
      gain.gain.setValueAtTime(0, Math.max(enterAt + .4, this.duckUntil));
      gain.gain.linearRampToValueAtTime(this.situationLevel, this.duckUntil + .6);
    }
    element.onloadedmetadata = () => {
      if (!music.released && Number.isFinite(element.duration) && this.musicPositions[music.scene] < element.duration) {
        try { element.currentTime = this.musicPositions[music.scene]; } catch { /* not seekable yet */ }
      }
    };
    element.onerror = () => { music.playing = false; };
    this.music = music; this.playMusicTrack(music);
  }
  private playMusicTrack(music: MusicTrack): void {
    if (music.released || music.playing) return;
    music.playing = true;
    void music.element.play().then(() => {
      if (music.released || this.hidden || this.disposed || !this.musicEnabled || this.context?.state !== 'running') { music.element.pause(); music.playing = false; }
    }).catch(() => { music.playing = false; }); // A blocked browser retries on the next real gesture.
  }
  private releaseMusicTrack(music: MusicTrack): void {
    if (music.released) return;
    music.released = true;
    if (music.timer !== undefined) clearTimeout(music.timer);
    this.retiringMusic.delete(music);
    if (Number.isFinite(music.element.currentTime)) this.musicPositions[music.scene] = music.element.currentTime;
    music.element.pause(); music.element.onloadedmetadata = null; music.element.onerror = null;
    music.element.removeAttribute('src'); music.element.load();
    music.source.disconnect(); music.gain.disconnect();
  }
  private retireMusic(): void {
    // Fade-out then fade-in: two allocated players, only one audible composition.
    this.retiringMusic.forEach(track => this.releaseMusicTrack(track));
    const music = this.music, now = this.context?.currentTime; this.music = undefined;
    if (!music) return;
    if (now === undefined || !music.playing) { this.releaseMusicTrack(music); return; }
    music.gain.gain.cancelScheduledValues(now);
    music.gain.gain.setValueAtTime(music.gain.gain.value, now);
    this.musicHandoffAt = now + .18;
    music.gain.gain.linearRampToValueAtTime(0, now + .16);
    this.retiringMusic.add(music);
    music.timer = setTimeout(() => this.releaseMusicTrack(music), 190);
  }
  private duckMusic(seconds: number): void {
    const gain = this.music?.gain.gain, now = this.context?.currentTime;
    if (now === undefined) return;
    this.duckUntil = now + seconds;
    if (!gain) return;
    const current = gain.value;
    gain.cancelScheduledValues(now); gain.setValueAtTime(current, now);
    gain.linearRampToValueAtTime(0, now + .12); gain.setValueAtTime(0, now + seconds);
    gain.linearRampToValueAtTime(this.situationLevel, now + seconds + .6);
  }
  private restoreMusic(): void {
    this.duckUntil = 0;
    const gain = this.music?.gain.gain, now = this.context?.currentTime;
    if (!gain || now === undefined) return;
    const current = gain.value, target = this.situationLevel;
    const enterAt = target > 0 ? Math.max(now, this.musicHandoffAt, this.celebrationReadyAt) : now;
    gain.cancelScheduledValues(now); gain.setValueAtTime(current, now);
    if (enterAt > now) {
      gain.linearRampToValueAtTime(0, Math.min(enterAt, now + .06)); gain.setValueAtTime(0, enterAt);
    }
    gain.linearRampToValueAtTime(target, enterAt + (target > 0 ? .4 : .12));
  }
  private stopCelebration(fade = .22): void {
    this.winRequest++; this.winFetch?.abort(); this.winFetch = undefined;
    const context = this.context;
    this.celebrationVoices.forEach((cleanup, source) => {
      if (this.celebrationFades.has(source)) return;
      const gain = this.celebrationGains.get(source)?.gain;
      if (!gain || !context || context.state !== 'running' || this.hidden || this.disposed || !this.effectsEnabled) {
        try { source.stop(); } catch { /* already ended */ } cleanup(); return;
      }
      const now = context.currentTime;
      this.celebrationReadyAt = Math.max(this.celebrationReadyAt, now + fade + .02);
      gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now); gain.linearRampToValueAtTime(0, now + fade);
      try { source.stop(now + fade + .01); } catch { cleanup(); return; }
      this.celebrationFades.set(source, setTimeout(cleanup, (fade + .06) * 1000));
    });
  }
  private stopEffects(): void { this.samples?.stop(); this.clearVoices(this.effectsVoices); this.finishWinPresentation(); this.lastTap = -Infinity; }
  private stopMusic(): void {
    const music = this.music; this.music = undefined;
    if (music) this.releaseMusicTrack(music);
    this.retiringMusic.forEach(track => this.releaseMusicTrack(track));
  }
  private pause(): void { this.hidden = true; this.stopEffects(); this.stopMusic(); void this.context?.suspend().catch(() => {}); }
  private resume(): void {
    this.hidden = false;
    if (this.disposed || !this.context || (!this.musicEnabled && !this.effectsEnabled)) return;
    void this.context.resume().then(() => this.startMusic()).catch(() => {});
  }
}
