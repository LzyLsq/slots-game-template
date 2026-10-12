/** Short authored PCM cues, shared AudioContext, bounded voices, no tone synthesis. */
export class SampleBank {
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer>>();
  private controllers = new Set<AbortController>();
  private voices = new Map<AudioBufferSourceNode, { group: string; clean: () => void }>();
  private epochs = new Map<string, number>();
  private last = new Map<string, number>();
  private output: DynamicsCompressorNode;
  private disposed = false;
  private errors: string[] = [];
  private highWater = 0;
  private played = 0;
  private dropped = 0;
  constructor(private context: AudioContext, private base = 'audio/') {
    this.output = context.createDynamicsCompressor();
    this.output.threshold.value = -12; this.output.knee.value = 12;
    this.output.ratio.value = 4; this.output.attack.value = .003; this.output.release.value = .12;
    this.output.connect(context.destination);
    void this.preload();
  }
  async preload(): Promise<void> {
    await Promise.all(['ui-tap','ui-back','ui-select','bet-up','bet-down','spin-start',
      'stop-1','stop-2','stop-3','coin-1','coin-2','coin-3','burst','reveal','collect','reward']
      .map(id => this.load(id).catch(() => undefined)));
  }
  private load(id: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(id); if (cached) return Promise.resolve(cached);
    const loading = this.pending.get(id); if (loading) return loading;
    const controller = new AbortController(); this.controllers.add(controller);
    const promise = fetch(this.base + 'sfx-' + id + '.wav', { signal: controller.signal })
      .then(r => { if (!r.ok) throw Error(`${id}: HTTP ${r.status}`); return r.arrayBuffer(); })
      .then(bytes => this.context.decodeAudioData(bytes))
      .then(buffer => { if (!this.disposed) this.buffers.set(id, buffer); return buffer; })
      .catch(error => { if (!controller.signal.aborted) this.errors.push(String(error)); throw error; })
      .finally(() => { this.pending.delete(id); this.controllers.delete(controller); });
    this.pending.set(id, promise); return promise;
  }
  play(id: string, volume = .45, group = 'ui', rate = 1, interval = .065): void {
    if (this.disposed || this.context.state !== 'running') return;
    const stamp = performance.now(), key = group + ':' + id;
    if (stamp - (this.last.get(key) ?? -Infinity) < interval * 1000) { this.dropped++; return; }
    this.last.set(key, stamp);
    const epoch = this.epochs.get(group) ?? 0;
    const start = (buffer: AudioBuffer) => {
      // Never replay a delayed click after its page/animation has ended.
      if (this.disposed || this.context.state !== 'running' || epoch !== (this.epochs.get(group) ?? 0) || performance.now() - stamp > 180) { this.dropped++; return; }
      const groupLimit = group === 'detail' ? 4 : 5;
      while (this.voices.size >= 12 || Array.from(this.voices.values()).filter(v => v.group === group).length >= groupLimit) {
        let victim: AudioBufferSourceNode | undefined;
        this.voices.forEach((v, source) => { if (!victim && v.group === group) victim = source; });
        victim ??= this.voices.keys().next().value;
        if (!victim) break;
        this.release(victim);
      }
      const source = this.context.createBufferSource(), gain = this.context.createGain();
      source.buffer = buffer; source.playbackRate.value = Math.max(.96, Math.min(1.04, rate));
      const now = this.context.currentTime, duration = buffer.duration / source.playbackRate.value;
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + .002);
      gain.gain.setValueAtTime(volume, now + Math.max(.003, duration - .015));
      gain.gain.linearRampToValueAtTime(0, now + duration);
      source.connect(gain).connect(this.output);
      const clean = () => { this.voices.delete(source); source.onended = null; source.disconnect(); gain.disconnect(); };
      this.voices.set(source, { group, clean }); source.onended = clean;
      this.highWater = Math.max(this.highWater, this.voices.size); this.played++;
      source.start(now); source.stop(now + duration + .02);
    };
    const buffer = this.buffers.get(id);
    if (buffer) start(buffer); else void this.load(id).then(start).catch(() => {});
  }
  private release(source: AudioBufferSourceNode): void {
    const voice = this.voices.get(source); if (!voice) return;
    try { source.stop(); } catch { /* ended */ } voice.clean();
  }
  stop(group?: string): void {
    if (group) this.epochs.set(group, (this.epochs.get(group) ?? 0) + 1);
    else for (const key of ['ui','reel','detail','collect']) this.epochs.set(key, (this.epochs.get(key) ?? 0) + 1);
    this.voices.forEach((v, source) => { if (!group || v.group === group) this.release(source); });
    if (!group) this.last.clear();
  }
  close(): void {
    this.disposed = true; this.stop(); this.controllers.forEach(c => c.abort());
    this.buffers.clear(); this.pending.clear(); this.output.disconnect();
  }
  status(): { played: number; voices: number; highWater: number; decodedBytes: number; buffers: number; dropped: number; errors: string[] } {
    let decodedBytes = 0; this.buffers.forEach(b => { decodedBytes += b.length * b.numberOfChannels * 4; });
    return { played: this.played, voices: this.voices.size, highWater: this.highWater, decodedBytes, buffers: this.buffers.size, dropped: this.dropped, errors: this.errors.slice() };
  }
}
