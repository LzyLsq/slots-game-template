/** Stable screen-space hit test. Visual squash never changes this input region. */
export interface HitRect { left: number; top: number; right: number; bottom: number }
export class PressIntent {
  private pointer: number | null = null;
  private x = 0;
  private y = 0;
  private cancelled = false;
  constructor(private readonly bounds: () => HitRect, private readonly slop = 12) {}
  private inside(x: number, y: number): boolean {
    const r = this.bounds(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  down(pointer: number, x: number, y: number): boolean {
    if (this.pointer !== null || !this.inside(x, y)) return false;
    this.pointer = pointer; this.x = x; this.y = y; this.cancelled = false; return true;
  }
  move(pointer: number, x: number, y: number): void {
    if (pointer === this.pointer && (Math.hypot(x - this.x, y - this.y) > this.slop || !this.inside(x, y))) this.cancelled = true;
  }
  up(pointer: number, x: number, y: number): boolean {
    if (pointer !== this.pointer) return false;
    this.move(pointer, x, y);
    const activate = !this.cancelled && this.inside(x, y);
    this.cancel(); return activate;
  }
  cancel(): void { this.pointer = null; this.cancelled = true; }
}
