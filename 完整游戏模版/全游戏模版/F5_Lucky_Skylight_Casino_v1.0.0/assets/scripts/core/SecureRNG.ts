export interface RandomSource {
  nextUint(): number;
  next(): number;
  int(minInclusive: number, maxExclusive: number): number;
  bool(chance?: number): boolean;
  pick<T>(values: readonly T[]): T;
  snapshot(): number;
}

const cryptoProvider = (): Crypto => {
  const provider = globalThis.crypto;
  if (!provider?.getRandomValues) throw new Error('A cryptographically secure random source is required.');
  return provider;
};

/** Runtime randomness for playable rounds. SeededRNG is restricted to tests and simulations. */
export class SecureRNG implements RandomSource {
  private lastValue = 0;

  public nextUint(): number {
    const values = new Uint32Array(1);
    cryptoProvider().getRandomValues(values);
    this.lastValue = values[0] >>> 0;
    return this.lastValue;
  }

  public next(): number { return this.nextUint() / 0x100000000; }

  public int(minInclusive: number, maxExclusive: number): number {
    if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxExclusive) || maxExclusive <= minInclusive) throw new Error('Invalid RNG range');
    const range = maxExclusive - minInclusive;
    const ceiling = Math.floor(0x100000000 / range) * range;
    let value = this.nextUint();
    while (value >= ceiling) value = this.nextUint();
    return minInclusive + (value % range);
  }

  public bool(chance = 0.5): boolean {
    if (!Number.isFinite(chance) || chance < 0 || chance > 1) throw new Error('Invalid probability');
    return this.next() < chance;
  }

  public pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error('Cannot pick from an empty collection');
    return values[this.int(0, values.length)];
  }

  public snapshot(): number { return this.lastValue || this.nextUint(); }

  public static id(prefix: string): string {
    const bytes = new Uint8Array(16);
    cryptoProvider().getRandomValues(bytes);
    const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${value}`;
  }

  /** RFC 4122 UUID used as StoreKit's appAccountToken. */
  public static uuid(): string {
    const bytes = new Uint8Array(16);
    cryptoProvider().getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }
}
