export class SeededRNG {
  private state: number;
  constructor(seed = 0xA57A1) { this.state = seed >>> 0 || 1; }
  next(): number {
    let x = this.state;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }
  int(max: number): number { return Math.floor(this.next() * max); }
  pick<T>(items: readonly T[]): T { return items[this.int(items.length)]; }
  get seedState(): number { return this.state; }
}
