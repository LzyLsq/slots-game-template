export interface Random { int(exclusiveMax: number): number }

/** Shared unbiased sampling for browser and native OS random-word sources. */
export class WordRandom implements Random {
  constructor(private readonly nextWord: () => number) {}
  int(max: number): number {
    if (!Number.isSafeInteger(max) || max < 1 || max > 0x100000000) throw new Error('Invalid random range');
    const limit = Math.floor(0x100000000 / max) * max;
    let value: number;
    do {
      value = this.nextWord();
      if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Secure random source failed');
    } while (value >= limit);
    return value % max;
  }
}

/** Runtime random source, not a substitute for a production-authoritative outcome service. */
export class SecureRandom extends WordRandom {
  constructor(source: Pick<Crypto, 'getRandomValues'>) {
    if (!source || typeof source.getRandomValues !== 'function') throw new Error('Secure random source unavailable');
    const word = new Uint32Array(1);
    super(() => { source.getRandomValues(word); return word[0]!; });
  }
}

/** Reproducible tests only. Never silently fall back from secure RNG to this. */
export class SeededRandom implements Random {
  constructor(private seed: number) { this.seed = (seed >>> 0) || 0x6d2b79f5; }
  int(max: number): number {
    if (!Number.isSafeInteger(max) || max < 1) throw new Error('Invalid random range');
    this.seed ^= this.seed << 13; this.seed ^= this.seed >>> 17; this.seed ^= this.seed << 5;
    return Math.floor((this.seed >>> 0) / 0x100000000 * max);
  }
}
