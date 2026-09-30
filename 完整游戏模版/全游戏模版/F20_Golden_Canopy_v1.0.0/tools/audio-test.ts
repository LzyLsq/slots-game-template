import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Actual production code against a deterministic browser/audio model. Not a listening test.
class Param {
  value = 0; events: { value: number; time: number; kind: string }[] = [];
  setValueAtTime(value: number, time: number) { this.events.push({ value, time, kind: 'set' }); this.value = value; }
  linearRampToValueAtTime(value: number, time: number) { this.events.push({ value, time, kind: 'linear' }); this.value = value; }
  exponentialRampToValueAtTime(value: number, time: number) { assert(value > 0); this.events.push({ value, time, kind: 'exponential' }); this.value = value; }
  cancelScheduledValues(time: number) { this.events = this.events.filter(e => e.time < time); }
}
class AudioNode {
  connected = false; disconnected = false;
  connect(target: AudioNode) { this.connected = true; return target; }
  disconnect() { this.disconnected = true; this.connected = false; }
}
class Source extends AudioNode {
  frequency = new Param(); type = ''; buffer: any; onended: (() => void) | null = null;
  startTime = 0; endTime = Infinity; ended = false;
  constructor(private context: Context) { super(); }
  start(time = this.context.currentTime) {
    assert(Number.isFinite(time)); assert(time >= this.context.currentTime - .1); this.startTime = time;
    if (this.buffer?.duration) this.endTime = time + this.buffer.duration;
  }
  stop(time?: number) { this.endTime = time ?? this.context.currentTime; if (time === undefined) this.finish(); }
  finish() { if (this.ended) return; this.ended = true; this.onended?.(); }
}
class Gain extends AudioNode { gain = new Param(); }
class Filter extends AudioNode { type = ''; frequency = new Param(); Q = new Param(); }
const contexts: Context[] = [], listeners = new Map<string, () => void>();
const timers = new Map<number, { fn: () => void; at: number }>();
let timerId = 0, blockPlay = false, holdPlay = false, holdFetch = false, failFetch = false;
const media: Media[] = [], pendingPlay: (() => void)[] = [], pendingFetch: (() => void)[] = [], fetches: { url: string; signal: AbortSignal }[] = [];
const durations: Record<string, number> = { 'win-small': 1.55, 'win-big': 3.4, 'win-mega': 4.273, 'win-epic': 5.143, 'win-super': 5.591 };
class Media {
  src = ''; preload = ''; loop = false; paused = true; duration = 36; currentTime = 0; playCalls = 0;
  onloadedmetadata: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor() { media.push(this); }
  setAttribute() {}
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
  load() {}
  play(): Promise<void> {
    this.playCalls++; this.onloadedmetadata?.();
    if (blockPlay) { blockPlay = false; return Promise.reject(new Error('gesture required')); }
    if (holdPlay) return new Promise(resolve => pendingPlay.push(() => { this.paused = false; resolve(); }));
    this.paused = false; return Promise.resolve();
  }
  pause() { this.paused = true; }
}
class Context {
  state = 'suspended'; currentTime = 0; sampleRate = 48000; destination = new AudioNode();
  sources: Source[] = []; nodes: AudioNode[] = []; buffers = 0; decoded = 0; onstatechange: (() => void) | null = null;
  constructor() { contexts.push(this); }
  createOscillator() { const n = new Source(this); this.sources.push(n); this.nodes.push(n); return n; }
  createBufferSource() { return this.createOscillator(); }
  createMediaElementSource(_element: Media) { const n = new AudioNode(); this.nodes.push(n); return n; }
  createGain() { const n = new Gain(); this.nodes.push(n); return n; }
  createBiquadFilter() { const n = new Filter(); this.nodes.push(n); return n; }
  createBuffer(channels: number, length: number, rate: number) {
    this.buffers++; assert.equal(channels, 1); assert.equal(rate, this.sampleRate); assert(length <= rate * .091);
    const data = new Float32Array(length); return { duration: length / rate, getChannelData: () => data };
  }
  async decodeAudioData(bytes: ArrayBuffer) {
    this.decoded++; const id = Buffer.from(bytes).toString(); assert(id.startsWith('win-'), 'Never decode a long BGM to PCM');
    return { duration: durations[id], id, numberOfChannels: 2, sampleRate: this.sampleRate, length: Math.ceil(durations[id] * this.sampleRate) };
  }
  async resume() { this.state = 'running'; this.onstatechange?.(); }
  async suspend() { this.state = 'suspended'; this.onstatechange?.(); }
  async close() { this.state = 'closed'; this.onstatechange?.(); }
  advance(seconds: number, schedule = true) {
    this.currentTime += seconds;
    this.sources.forEach(n => { if (n.endTime <= this.currentTime) n.finish(); });
    if (schedule) for (const [id, timer] of timers) if (timer.at <= this.currentTime) { timers.delete(id); timer.fn(); }
  }
}
const window = { AudioContext: Context, Audio: Media, addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) };
const code = ts.transpileModule(readFileSync('assets/scripts/audio/AudioManager.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
}).outputText;
const exports: Record<string, any> = {};
const cc = { Component: function Component() {}, cclegacy: { _RF: { push() {}, pop() {} } }, game: { on() {}, off() {} }, Game: { EVENT_HIDE: 'hide', EVENT_SHOW: 'show' }, _decorator: { ccclass: () => (type: unknown) => type } };
const sandbox = {
  exports, window, navigator: {}, require: () => cc, AbortController,
  fetch: (url: string, options: { signal: AbortSignal }) => {
    fetches.push({ url, signal: options.signal });
    const response = () => ({ ok: !failFetch, status: failFetch ? 404 : 200, arrayBuffer: async () => {
      const bytes = Buffer.from(url.replace('audio/', '').replace('.m4a', ''));
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } });
    if (holdFetch) return new Promise(resolve => pendingFetch.push(() => resolve(response())));
    return Promise.resolve(response());
  },
  setTimeout: (fn: () => void, ms: number) => { timers.set(++timerId, { fn, at: contexts.at(-1)!.currentTime + ms / 1000 }); return timerId; },
  clearTimeout: (id: number) => timers.delete(id),
};
if (process.argv.includes('--bundle')) {
  const modules = new Map<string, { dependencies: string[]; factory: (exporter: (name: string, value: unknown) => void) => { setters: ((module: unknown) => void)[]; execute: () => void } }>();
  vm.runInNewContext(readFileSync('build/web-mobile/assets/main/index.js', 'utf8'), {
    ...sandbox, System: { register: (id: string, dependencies: string[], factory: any) => modules.set(id, { dependencies, factory }) },
  }, { filename: 'release-main-index.js' });
  const record = modules.get('chunks:///_virtual/AudioManager.ts'); assert(record, 'Release contains the real AudioManager');
  const module = record.factory((name, value) => { exports[name] = value; });
  const helpers = {
    inheritsLoose: (child: any, parent: any) => { child.prototype = Object.create(parent.prototype); child.prototype.constructor = child; Object.setPrototypeOf(child, parent); },
    createForOfIteratorHelperLoose: (iterable: any) => { const iterator = iterable[Symbol.iterator](); return () => iterator.next(); },
    createClass: (type: any, properties: any[] = []) => { properties.forEach(p => Object.defineProperty(type.prototype, p.key, p)); return type; },
    assertThisInitialized: (value: any) => value,
    applyDecoratedDescriptor: (_target: any, _name: string, _decorators: any, descriptor: any) => descriptor,
    initializerDefineProperty: (target: any, name: string, descriptor: any) => Object.defineProperty(target, name, { value: descriptor.initializer.call(target), writable: true }),
  };
  record.dependencies.forEach((id, i) => { assert(id === 'cc' || id.toLowerCase().includes('babelhelpers'), `Unexpected dependency ${id}`); module.setters[i](id === 'cc' ? cc : helpers); });
  module.execute();
} else vm.runInNewContext(code, sandbox, { filename: 'AudioManager.js' });
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
const liveMedia = () => media.filter(m => m.src);
async function main() {
  const audio = new exports.AudioManager(); audio.onLoad();
  assert.equal(contexts.length, 0, 'No autoplay before a gesture');
  blockPlay = true; audio.play('tap'); await flush();
  const context = contexts[0], firstMusic = audio.music;
  assert.equal(firstMusic.element.src, 'audio/music-home.m4a'); assert.equal(firstMusic.playing, false);
  audio.unlockMusic(); await flush(); assert.equal(firstMusic.element.playCalls, 2, 'Retry blocked media on a real gesture');
  for (let i = 0; i < 100; i++) audio.unlockMusic();
  assert.equal(liveMedia().length, 1); assert.equal(timers.size, 0, 'No continual note-scheduling timer');
  firstMusic.element.currentTime = 9;
  audio.setScene('cabinet'); await flush();
  assert.notEqual(audio.music, firstMusic); assert.equal(audio.music.element.src, 'audio/music-cabinet.m4a');
  assert.equal(liveMedia().length, 2); assert.equal(audio.retiringMusic.size, 1);
  context.advance(.36); assert.equal(liveMedia().length, 1); assert(firstMusic.source.disconnected);
  audio.setScene('home'); await flush(); assert.equal(audio.music.element.currentTime, 9, 'Resume the lobby phrase, not its first note every time');
  for (let i = 0; i < 100; i++) { audio.setScene(i % 2 ? 'home' : 'cabinet'); assert(liveMedia().length <= 2); assert(timers.size <= 1); }
  context.advance(1); assert.equal(liveMedia().length, 1);
  for (let i = 0; i < 800; i++) {
    context.advance(.1); if (i % 3 === 0) audio.play('spin');
    if (i % 30 === 0) { audio.playWinFanfare(3); await flush(); }
    if (i % 30 === 20) { audio.playSmallWinJingle(); await flush(); }
    if (i % 30 < 20) audio.playWinDetail('count', (i % 30 + 1) / 30, 3);
    if (i % 30 === 10) audio.playWinDetail('burst', .5, 3);
    if (i % 30 === 25) audio.playWinDetail('reveal', 1, 3);
    assert(audio.effectsVoices.size <= 72); assert(audio.celebrationVoices.size <= 72); assert(audio.winDetailVoices.size <= 24);
    assert(audio.winBuffers.size <= 2); assert(liveMedia().length <= 2);
  }
  assert.equal(context.buffers, 1, 'One tiny noise buffer for short details');
  const countBeforeStall = context.sources.length; context.advance(30);
  assert.equal(context.sources.length, countBeforeStall, 'No backlog notes after a stalled frame');
  const reelPitches: number[] = [];
  for (let column = 0; column < 5; column++) { const n = context.sources.length; audio.playReelStop(column); reelPitches.push(context.sources[n].frequency.events[0].value); }
  assert(reelPitches.every((v, i) => i === 0 || v > reelPitches[i - 1]));
  audio.playSmallWinJingle(); await flush();
  assert(audio.music.gain.gain.events.some((e: any) => e.value === .07), 'Lower BGM beneath award music');
  const beforeRapidTap = context.sources.length;
  for (let i = 0; i < 1000; i++) audio.play('tap');
  assert(context.sources.length - beforeRapidTap <= 2, 'Debounce UI clicks');
  const spans: number[] = [];
  for (const tier of [1, 2, 3, 4]) {
    audio.playWinFanfare(tier); await flush();
    const voices = [...audio.celebrationVoices.keys()] as Source[];
    assert.equal(voices.length, 1, 'A complete arranged clip, not a stack of simple oscillators');
    assert.equal(voices[0].buffer.id, ['win-big', 'win-mega', 'win-epic', 'win-super'][tier - 1]);
    spans.push(voices[0].buffer.duration);
    assert(audio.winBuffers.size <= 2);
  }
  assert(spans.every((span, i) => !i || span > spans[i - 1]));
  const decodedBeforeRepeat = context.decoded; audio.playWinFanfare(4); await flush();
  assert.equal(context.decoded, decodedBeforeRepeat, 'Reuse the recent clip');
  audio.finishWinPresentation();
  const pitches: number[] = [];
  for (const progress of [.1, .3, .5, .7, .9]) {
    context.advance(.12, false); const n = context.sources.length; audio.playWinDetail('count', progress, 1);
    pitches.push(context.sources[n].frequency.events[0].value);
    const beforeSpam = context.sources.length;
    for (let i = 0; i < 1000; i++) audio.playWinDetail('count', progress, 1);
    assert.equal(context.sources.length, beforeSpam);
  }
  assert(pitches.every((pitch, i) => !i || pitch > pitches[i - 1]));
  audio.playWinFanfare(4); await flush(); const oldFanfare = [...audio.celebrationVoices.keys()] as Source[];
  audio.playWinDetail('burst', .5, 4); audio.playWinDetail('reveal', 1, 4);
  assert(oldFanfare.every(voice => voice.ended)); assert.equal(audio.winDetailVoices.size, 0);
  // A slow fetch/decode may complete after skipping or moving to the background.
  audio.winBuffers.clear(); holdFetch = true; audio.playWinFanfare(4);
  const slowRequest = fetches.at(-1)!; audio.playWinDetail('reveal', 1, 4);
  const revealSourceCount = context.sources.length; assert(slowRequest.signal.aborted);
  pendingFetch.splice(0).forEach(fn => fn()); holdFetch = false; await flush();
  assert.equal(context.sources.length, revealSourceCount, 'No late fanfare after skip'); assert.equal(audio.winBuffers.size, 0);
  failFetch = true; audio.playWinFanfare(2); await flush(); failFetch = false;
  assert.equal(audio.duckUntil, 0, 'Missing clip must restore BGM instead of leaving it muffled');
  audio.playWinDetail('collect', 1, 4); const collectVoices = [...audio.effectsVoices.keys()] as Source[];
  audio.finishWinPresentation(); assert.equal(audio.celebrationVoices.size, 0);
  assert(collectVoices.some(voice => !voice.ended));
  audio.setEffects(false); const silentCount = context.sources.length;
  audio.play('spin'); audio.playWinFanfare(3); audio.playReelStop(2);
  for (const cue of ['count', 'burst', 'reveal', 'collect']) audio.playWinDetail(cue, .5, 4);
  await flush(); assert.equal(context.sources.length, silentCount);
  audio.setMusic(false); context.advance(10);
  assert.equal(liveMedia().length, 0); assert.equal(timers.size, 0); assert(context.nodes.every(n => n.disconnected));
  audio.setMusic(true); audio.setEffects(true); audio.playWinFanfare(3); await flush();
  audio.setScene('cabinet'); audio.setScene('home'); assert.equal(audio.celebrationVoices.size, 0);
  audio.pause(); assert.equal(context.state, 'suspended'); assert.equal(liveMedia().length, 0); assert.equal(timers.size, 0);
  const hiddenCount = context.sources.length; audio.play('tap'); audio.unlockMusic(); assert.equal(context.sources.length, hiddenCount);
  holdPlay = true; audio.resume(); await flush(); const lateMedia = audio.music.element;
  audio.pause(); pendingPlay.splice(0).forEach(fn => fn()); await flush(); holdPlay = false;
  assert(lateMedia.paused); assert.equal(liveMedia().length, 0, 'Late play promise cannot restart hidden music');
  audio.resume(); audio.pause(); await flush(); assert.equal(liveMedia().length, 0);
  audio.resume(); await flush(); audio.onDestroy(); await flush();
  assert.equal(timers.size, 0); assert.equal(context.state, 'closed'); assert.equal(listeners.size, 0); assert.equal(liveMedia().length, 0);
  assert(context.nodes.every(n => n.disconnected)); assert.equal(audio.winBuffers.size, 0);
  audio.resume(); audio.setMusic(true); audio.play('tap'); await flush(); assert.equal(liveMedia().length, 0);

  const resourceRoot = process.argv.includes('--bundle') ? 'build/web-mobile/audio' : 'build-templates/web-mobile/audio';
  const manifest = JSON.parse(readFileSync(`${resourceRoot}/music-manifest.json`, 'utf8'));
  assert.equal(manifest.tracks.length, 7);
  assert.equal(new Set(manifest.tracks.map((t: any) => t.sha256)).size, 7, 'Seven independent recordings');
  assert.equal(new Set(manifest.tracks.map((t: any) => JSON.stringify(t.instruments))).size, 7, 'Different arrangements, not one clip retimed');
  for (const t of manifest.tracks) {
    const bytes = readFileSync(`${resourceRoot}/${t.file}`);
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp'); assert.equal(bytes.length, t.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), t.sha256);
    assert(t.peak < .8 && t.rms > .035); assert(t.loop ? t.duration >= 30 : t.duration < 6);
    if (t.loop) {
      assert(t.instruments.length >= 10 && t.notes >= 800, 'BGM includes rhythm, melodic replies and phrase fills');
      assert(t.rms < .12, 'Liveliness comes from arrangement, not simply louder mastering');
    }
  }
  assert(manifest.tracks.reduce((n: number, t: any) => n + t.bytes, 0) < 1.5 * 1024 * 1024);
  console.log(`PASS ${process.argv.includes('--bundle') ? 'actual release bundle' : 'source'}: 7 local arranged recordings, distinct melody/instruments, stream BGM/no scheduler, crossfade/resume, max 2 media/max 2 short PCM buffers, async skip/mute/background/destroy safety, award ducking, existing UI/reel/coin/firework feedback.`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
