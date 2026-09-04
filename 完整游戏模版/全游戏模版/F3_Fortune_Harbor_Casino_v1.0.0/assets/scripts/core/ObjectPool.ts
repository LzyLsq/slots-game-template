export class ObjectPool<T> {
  private readonly available: T[] = [];
  private readonly active = new Set<T>();

  public constructor(
    private readonly create: () => T,
    private readonly reset: (item: T) => void,
    prewarm = 0,
  ) {
    for (let index = 0; index < prewarm; index += 1) this.available.push(this.create());
  }

  public acquire(): T {
    const item = this.available.pop() ?? this.create();
    this.active.add(item);
    return item;
  }

  public release(item: T): void {
    if (!this.active.delete(item)) return;
    this.reset(item);
    this.available.push(item);
  }

  public releaseAll(): void {
    [...this.active].forEach((item) => this.release(item));
  }

  public get activeCount(): number {
    return this.active.size;
  }
}
