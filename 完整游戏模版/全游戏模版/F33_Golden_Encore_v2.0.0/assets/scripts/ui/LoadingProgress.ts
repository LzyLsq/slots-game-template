/** Monotonic presentation of real completed preload work, not a fake timer.
 * Boot reserves the final band for animation atlases and the optional material. */
export class LoadingProgress {
  private target = .03;
  value = .03;
  private ready = false;
  constructor(private readonly reduced = false) {}
  advance(fraction: number): void {
    if (!Number.isFinite(fraction)) return;
    this.target = Math.max(this.target, Math.min(this.ready ? 1 : .98, Math.max(0, fraction)));
  }
  complete(): void { this.ready = true; this.target = 1; }
  step(dt: number): number {
    const seconds = Number.isFinite(dt) ? Math.max(0, Math.min(.1, dt)) : 0;
    this.value = this.reduced ? this.target : this.value + (this.target - this.value) * -Math.expm1(-seconds / .12);
    if (this.ready && this.target - this.value <= .005) this.value = 1;
    return this.value;
  }
  get percent(): number { return this.ready && this.value === 1 ? 100 : Math.min(99, Math.floor(this.value * 100)); }
}

/** 278px generated title + 3px float + 13px edge clearance. */
export function loadingTitleY(logicalHeight: number): number {
  return Math.min(820, logicalHeight / 2 - 155);
}
