import type { RandomSource } from './SecureRNG';

/** Deterministic test/simulation source. Never use for a playable runtime round. */
export class SeededRNG implements RandomSource {
  private state: number;

  public constructor(seed: number) {
    this.state = seed | 0;
    if (this.state === 0) this.state = 0x6d2b79f5;
  }

  public nextUint(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value | 0;
    return value >>> 0;
  }

  public next(): number {
    return this.nextUint() / 0x100000000;
  }

  public int(minInclusive: number, maxExclusive: number): number {
    if (maxExclusive <= minInclusive) throw new Error('Invalid RNG range');
    return minInclusive + Math.floor(this.next() * (maxExclusive - minInclusive));
  }

  public bool(chance = 0.5): boolean {
    return this.next() < chance;
  }

  public pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error('Cannot pick from an empty collection');
    return values[this.int(0, values.length)];
  }

  public snapshot(): number {
    return this.state >>> 0;
  }
}
