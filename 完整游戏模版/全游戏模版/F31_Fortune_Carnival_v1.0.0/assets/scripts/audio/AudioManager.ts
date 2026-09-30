import { _decorator, Component, game, Game } from 'cc';
const { ccclass } = _decorator;

export type Cue = 'tap' | 'back' | 'select' | 'bet-up' | 'bet-down' | 'spin' | 'reel-stop' | 'win' | 'reward';
export type WinSoundCue = 'count' | 'burst' | 'reveal' | 'collect';
type VoicePool = Map<AudioScheduledSourceNode, () => void>;
type SoundScene = 'home' | 'cabinet';
type MusicTrack = { scene: SoundScene; element: HTMLAudioElement; source: MediaElementAudioSourceNode; gain: GainNode; released: boolean; playing: boolean; timer?: ReturnType<typeof setTimeout> };

/** Local arranged music; stream long AAC loops, decode only two short award clips. */
@ccclass('AudioManager')
export class AudioManager extends Component {
  private context?: AudioContext;
  private musicEnabled = true;
  private effectsEnabled = true;
  private vibrationEnabled = true;
  private hidden = false;
  private disposed = false;
  private scene: SoundScene = 'home';
  private noise?: AudioBuffer;
  private music?: MusicTrack;
  private retiringMusic = new Set<MusicTrack>();
  private musicPositions: Record<SoundScene, number> = { home: 0, cabinet: 0 };
  private winBuffers = new Map<string, AudioBuffer>();
  private winRequest = 0;
  private winFetch?: AbortController;
  private duckUntil = 0;
  private effectsVoices: VoicePool = new Map();
  private celebrationVoices: VoicePool = new Map();
  private winDetailVoices: VoicePool = new Map();
  private lastTap = -Infinity;
  private lastCount = -Infinity;
  private readonly musicLevel = .46;

  protected onLoad(): void {
    game.on(Game.EVENT_HIDE, this.pause, this); game.on(Game.EVENT_SHOW, this.resume, this);
    globalThis.window?.addEventListener('pointerdown', this.unlockMusic, { passive: true });
    globalThis.window?.addEventListener('touchstart', this.unlockMusic, { passive: true });
    globalThis.window?.addEventListener('keydown', this.unlockMusic);
  }
  protected onDestroy(): void {
    this.disposed = true;
    game.off(Game.EVENT_HIDE, this.pause, this); game.off(Game.EVENT_SHOW, this.resume, this);
    globalThis.window?.removeEventListener('pointerdown', this.unlockMusic); globalThis.window?.removeEventListener('keydown', this.unlockMusic);
    globalThis.window?.removeEventListener('touchstart', this.unlockMusic);
    this.stopEffects(); this.stopMusic(); this.noise = undefined; this.winBuffers.clear();
    if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); }
  }

  public setMusic(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
    else if (this.context?.state === 'running') this.startMusic();
  }
  public setEffects(enabled: boolean): void { this.effectsEnabled = enabled; if (!enabled) this.stopEffects(); }
  public setVibration(enabled: boolean): void { this.vibrationEnabled = enabled; }
  /** Separate compositions, with a brief crossfade and bounded player count. */
  public setScene(scene: SoundScene): void {
    if (this.scene === scene) return;
    this.scene = scene; this.stopEffects();
    this.retireMusic(); this.startMusic();
  }

  public play(cue: Cue): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    if (cue === 'tap') {
      const context = this.audioContext(); if (!context || context.currentTime - this.lastTap < .07) return;
      this.lastTap = context.currentTime;
    }
    if (cue === 'reel-stop') { this.playReelStop(0); return; }
    if (cue === 'spin') {
      this.finishWinPresentation();
      [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, .13, 'triangle', i * .045, .029));
      this.percussion('kick', 0, .042, this.effectsVoices);
      return;
    }
    const notes: Record<Exclude<Cue, 'spin' | 'reel-stop'>, readonly [number, number, OscillatorType, number][]> = {
      tap: [[1046.5, .065, 'sine', 0], [1567.98, .075, 'sine', .024]],
      back: [[783.99, .085, 'triangle', 0], [523.25, .13, 'sine', .055]],
      select: [[659.25, .08, 'triangle', 0], [1046.5, .13, 'sine', .065]],
      'bet-up': [[880, .07, 'sine', 0], [1174.66, .095, 'sine', .045]],
      'bet-down': [[880, .07, 'sine', 0], [659.25, .095, 'sine', .045]],
      win: [[523.25, .14, 'triangle', 0], [659.25, .16, 'triangle', .10], [783.99, .30, 'sine', .20]],
      reward: [[659.25, .14, 'triangle', 0], [783.99, .18, 'triangle', .095], [1046.5, .36, 'sine', .19]],
    };
    notes[cue].forEach(([f, duration, type, delay], i) => this.tone(f, duration, type, delay, cue === 'tap' ? (i ? .026 : .05) : .04));
  }

  public playReelStop(column = 0): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    const pitches = [523.25, 659.25, 783.99, 880, 1046.5, 1174.66];
    const f = pitches[Math.max(0, Math.min(pitches.length - 1, Math.floor(column)))];
    this.tone(f, .105, 'triangle', 0, .037);
    this.tone(f * 2, .085, 'sine', .018, .009);
  }

  /** Only paid feature rounds receive award cues, never silent misses. */
  public playAward(step = 0): void {
    if (!this.effectsEnabled) return;
    const pitch = [1, 1.05946, 1.12246, 1.18921, 1.25992][Math.max(0, Math.min(4, Math.floor(step)))];
    for (const [f, duration, delay] of [[523.25, .10, 0], [659.25, .12, .065], [783.99, .19, .13]]) this.tone(f * pitch, duration, 'triangle', delay, .028);
  }

  public playSmallWinJingle(): void {
    this.playWinMusic('win-small', 1.55, .55);
  }

  public playWinFanfare(tier = 1): void {
    const i = Math.max(0, this.safeTier(tier) - 1);
    this.playWinMusic(['win-big', 'win-mega', 'win-epic', 'win-super'][i], [3.4, 4.273, 5.143, 5.591][i], .64);
  }

  private playWinMusic(id: string, duration: number, volume: number): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    this.finishWinPresentation();
    const context = this.audioContext(); if (!context) return;
    const request = this.winRequest;
    this.duckMusic(duration + .4);
    // A long BGM is not decoded to PCM. Short celebrations have a two-item LRU.
    const begin = (buffer: AudioBuffer) => {
      if (request !== this.winRequest || !this.effectsEnabled || this.hidden || this.disposed || context.state !== 'running') return;
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; gain.gain.value = volume;
      source.connect(gain).connect(context.destination);
      this.track(source, [gain], this.celebrationVoices);
      source.start();
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
        if (request === this.winRequest && !controller.signal.aborted) { this.winFetch = undefined; this.restoreMusic(); }
      });
  }

  /** Called by actual animation events, including early reveal. No timer backlog. */
  public playWinDetail(cue: WinSoundCue, progress = 0, tier = 1): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    const context = this.audioContext(); if (!context) return;
    const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    tier = this.safeTier(tier);
    const start = context.currentTime + .008;
    if (cue === 'count') {
      if (p <= 0 || p >= 1 || context.currentTime - this.lastCount < .11) return;
      this.lastCount = context.currentTime;
      const f = [1046.5, 1174.66, 1318.51, 1567.98, 1760][Math.min(4, Math.floor(p * 5))];
      this.note(f, start, .055, 'sine', tier ? .023 : .013, this.winDetailVoices, context.destination);
      this.note(f * 1.5, start + .012, .035, 'sine', tier ? .007 : .004, this.winDetailVoices, context.destination);
    } else if (cue === 'burst') {
      const f = [783.99, 1046.5, 1318.51][Math.min(2, Math.floor(p * 2))];
      this.note(147, start, .18, 'sine', .045, this.winDetailVoices, context.destination, 55);
      this.percussion('brush', .008, .032, this.winDetailVoices);
      [f, f * 1.25, f * 1.5].forEach((note, i) => this.note(note, start + .055 + i * .045, .18, 'sine', .021, this.winDetailVoices, context.destination));
    } else if (cue === 'reveal') {
      // Cancel the unfinished melody when the player skips the counter.
      this.stopCelebration(); this.clearVoices(this.winDetailVoices);
      this.duckMusic(tier ? 1.4 : .65);
      const chord = tier ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 783.99, 1046.5];
      chord.forEach((f, i) => this.note(f, start + i * .022, tier ? .95 : .42, 'triangle', tier ? .026 : .014, this.celebrationVoices, context.destination));
      if (tier) {
        this.percussion('kick', .008, .082, this.celebrationVoices);
        [1318.51, 1567.98, 2093].forEach((f, i) => this.note(f, start + .13 + i * .085, .34, 'sine', .016 + tier * .002, this.celebrationVoices, context.destination));
      }
    } else {
      // UI collection sound stays alive while the stage's voices are removed.
      [1046.5, 1318.51, 1567.98].forEach((f, i) => this.note(f, start + i * .045, .15, 'sine', .032, this.effectsVoices, context.destination));
    }
  }
  public finishWinPresentation(): void {
    this.stopCelebration(); this.clearVoices(this.winDetailVoices); this.lastCount = -Infinity; this.restoreMusic();
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
        this.context = new Constructor();
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
    const cleanup = () => { pool.delete(source); source.onended = null; source.disconnect(); nodes.forEach(n => n.disconnect()); };
    pool.set(source, cleanup); source.onended = cleanup;
  }
  private clearVoices(pool: VoicePool): void {
    // Creator's release compiler assumes array spreads are arrays, not Maps.
    // forEach safely deletes current entries without iterable downlevel helpers.
    pool.forEach((cleanup, source) => { try { source.stop(); } catch { /* already ended */ } cleanup(); });
  }
  private tone(f: number, duration: number, type: OscillatorType, delay: number, volume: number): void {
    const context = this.audioContext(); if (!context) return;
    this.note(f, context.currentTime + delay, duration, type, volume, this.effectsVoices, context.destination);
  }
  private note(f: number, start: number, duration: number, type: OscillatorType, volume: number, pool: VoicePool, destination: AudioNode, endFrequency = f): void {
    const context = this.context; if (!context || this.hidden || this.disposed) return;
    const source = context.createOscillator(), envelope = context.createGain();
    source.type = type; source.frequency.setValueAtTime(f, start);
    if (endFrequency !== f) source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.linearRampToValueAtTime(volume, start + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(envelope).connect(destination); this.track(source, [envelope], pool, pool === this.winDetailVoices ? 24 : 72);
    source.start(start); source.stop(start + duration + .02);
  }

  /** A single 90ms mono noise buffer is reused for all quiet shakers/brushes. */
  private percussion(kind: 'kick' | 'shaker' | 'brush', delay: number, volume: number, pool: VoicePool, destination?: AudioNode): void {
    const context = this.audioContext(); if (!context) return;
    const start = context.currentTime + delay, target = destination ?? context.destination;
    if (kind === 'kick') { this.note(110, start, .13, 'sine', volume, pool, target, 48); return; }
    if (!this.noise) {
      this.noise = context.createBuffer(1, Math.ceil(context.sampleRate * .09), context.sampleRate);
      const data = this.noise.getChannelData(0); let seed = 173;
      for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; data[i] = seed / 2147483648 - 1; }
    }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    const duration = kind === 'shaker' ? .035 : .085;
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = kind === 'shaker' ? 5200 : 2200; filter.Q.value = .55;
    envelope.gain.setValueAtTime(.0001, start); envelope.gain.linearRampToValueAtTime(volume, start + .003);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter).connect(envelope).connect(target); this.track(source, [filter, envelope], pool, pool === this.winDetailVoices ? 24 : 72);
    source.start(start); source.stop(start + duration + .005);
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
    element.preload = 'none'; element.loop = true; element.setAttribute('playsinline', '');
    element.src = `audio/music-${this.scene}.m4a`;
    let source: MediaElementAudioSourceNode;
    try { source = context.createMediaElementSource(element); } catch { element.removeAttribute('src'); return; }
    source.connect(gain).connect(context.destination);
    const music: MusicTrack = { scene: this.scene, element, source, gain, released: false, playing: false };
    gain.gain.setValueAtTime(0, context.currentTime);
    const ducked = this.duckUntil > context.currentTime;
    gain.gain.linearRampToValueAtTime(ducked ? .07 : this.musicLevel, context.currentTime + .4);
    if (ducked) {
      gain.gain.setValueAtTime(.07, this.duckUntil);
      gain.gain.linearRampToValueAtTime(this.musicLevel, this.duckUntil + .6);
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
      if (music.released || this.hidden || this.disposed || !this.musicEnabled) music.element.pause();
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
    // At most one outgoing and one incoming loop, even if pages change rapidly.
    this.retiringMusic.forEach(track => this.releaseMusicTrack(track));
    const music = this.music, now = this.context?.currentTime; this.music = undefined;
    if (!music) return;
    if (now === undefined || !music.playing) { this.releaseMusicTrack(music); return; }
    music.gain.gain.cancelScheduledValues(now);
    music.gain.gain.setValueAtTime(music.gain.gain.value, now);
    music.gain.gain.linearRampToValueAtTime(0, now + .32);
    this.retiringMusic.add(music);
    music.timer = setTimeout(() => this.releaseMusicTrack(music), 350);
  }
  private duckMusic(seconds: number): void {
    const gain = this.music?.gain.gain, now = this.context?.currentTime;
    if (now === undefined) return;
    this.duckUntil = now + seconds;
    if (!gain) return;
    const current = gain.value;
    gain.cancelScheduledValues(now); gain.setValueAtTime(current, now);
    gain.linearRampToValueAtTime(.07, now + .08); gain.setValueAtTime(.07, now + seconds);
    gain.linearRampToValueAtTime(this.musicLevel, now + seconds + .6);
  }
  private restoreMusic(): void {
    this.duckUntil = 0;
    const gain = this.music?.gain.gain, now = this.context?.currentTime;
    if (!gain || now === undefined) return;
    const current = gain.value; gain.cancelScheduledValues(now); gain.setValueAtTime(current, now); gain.linearRampToValueAtTime(this.musicLevel, now + .2);
  }
  private stopCelebration(): void { this.winRequest++; this.winFetch?.abort(); this.winFetch = undefined; this.clearVoices(this.celebrationVoices); }
  private stopEffects(): void { this.clearVoices(this.effectsVoices); this.finishWinPresentation(); this.lastTap = -Infinity; }
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
