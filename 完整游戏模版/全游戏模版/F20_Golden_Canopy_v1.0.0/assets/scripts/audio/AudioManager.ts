import { _decorator, Component, game, Game } from 'cc';
const { ccclass } = _decorator;

type Cue = 'tap' | 'spin' | 'reel-stop' | 'win' | 'reward';

@ccclass('AudioManager')
export class AudioManager extends Component {
  private context?: AudioContext;
  private musicEnabled = true;
  private effectsEnabled = true;
  private vibrationEnabled = true;
  private ambient?: { gain: GainNode; oscillators: OscillatorNode[] };

  protected onLoad(): void { game.on(Game.EVENT_HIDE, this.pause, this); game.on(Game.EVENT_SHOW, this.resume, this); }
  protected onDestroy(): void { game.off(Game.EVENT_HIDE, this.pause, this); game.off(Game.EVENT_SHOW, this.resume, this); this.stopAmbient(); void this.context?.close(); }

  public setMusic(enabled: boolean): void { this.musicEnabled = enabled; if (!enabled) this.stopAmbient(); else this.startAmbient(); }
  public setEffects(enabled: boolean): void { this.effectsEnabled = enabled; }
  public setVibration(enabled: boolean): void { this.vibrationEnabled = enabled; }

  public play(cue: Cue): void {
    if (!this.effectsEnabled) return;
    const notes: Record<Cue, readonly [number, number, OscillatorType, number][]> = {
      tap: [[520, 0.045, 'sine', 0]], spin: [[180, 0.12, 'sawtooth', 0], [360, 0.1, 'sine', 0.08]],
      'reel-stop': [[130, 0.07, 'triangle', 0]], win: [[523, 0.13, 'sine', 0], [659, 0.15, 'sine', 0.09], [784, 0.22, 'sine', 0.18]],
      reward: [[440, 0.12, 'triangle', 0], [660, 0.18, 'sine', 0.08], [880, 0.24, 'sine', 0.18]],
    };
    notes[cue].forEach(([frequency, duration, type, delay]) => this.tone(frequency, duration, type, delay, cue === 'tap' ? 0.018 : 0.035));
  }

  /** A short, bounded musical lift follows paid feature rounds, never silent misses. */
  public playAward(step = 0): void {
    if (!this.effectsEnabled) return;
    const pitches = [1, 1.05946, 1.12246, 1.18921, 1.25992];
    const pitch = pitches[Math.max(0, Math.min(4, Math.floor(step)))];
    for (const [frequency, duration, delay] of [[523, .10, 0], [659, .12, .065], [784, .17, .13]]) {
      this.tone(frequency * pitch, duration, 'sine', delay, .025);
    }
  }

  public vibrate(pattern: number | number[] = 18): void {
    if (!this.vibrationEnabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(pattern);
  }

  private audioContext(): AudioContext | undefined {
    if (typeof window === 'undefined') return undefined;
    const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return undefined;
    this.context ??= new Constructor(); if (this.context.state === 'suspended') void this.context.resume(); return this.context;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, delay: number, volume: number): void {
    const context = this.audioContext(); if (!context) return; const oscillator = context.createOscillator(); const gain = context.createGain(); const start = context.currentTime + delay;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, frequency * 0.94), start + duration);
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination); oscillator.start(start); oscillator.stop(start + duration + 0.02);
  }

  private startAmbient(): void {
    if (!this.musicEnabled || this.ambient) return; const context = this.audioContext(); if (!context) return; const gain = context.createGain(); gain.gain.value = 0.012; gain.connect(context.destination);
    const oscillators = [110, 164.81].map((frequency, index) => { const oscillator = context.createOscillator(); oscillator.type = index ? 'sine' : 'triangle'; oscillator.frequency.value = frequency; const localGain = context.createGain(); localGain.gain.value = index ? 0.28 : 0.18; oscillator.connect(localGain).connect(gain); oscillator.start(); return oscillator; });
    this.ambient = { gain, oscillators };
  }

  private stopAmbient(): void { this.ambient?.oscillators.forEach((oscillator) => { try { oscillator.stop(); } catch { /* already stopped */ } }); this.ambient?.gain.disconnect(); this.ambient = undefined; }
  private pause(): void { void this.context?.suspend(); }
  private resume(): void { if (this.musicEnabled) { void this.context?.resume(); this.startAmbient(); } }
}
