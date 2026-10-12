/** A control activates only from its owning pointer's deliberate tap.
 * Track the maximum excursion: dragging out and returning is not a tap. */
export class ControlTap {
  private pointer?: number;
  private x = 0;
  private y = 0;
  private dragged = false;
  constructor(private readonly slop = 12) {}
  begin(pointer: number, x: number, y: number): boolean {
    if (this.pointer !== undefined || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    this.pointer = pointer; this.x = x; this.y = y; this.dragged = false;
    return true;
  }
  owns(pointer: number): boolean { return this.pointer === pointer; }
  /** Returns true only when a drag first disarms this control's visual press. */
  move(pointer: number, x: number, y: number): boolean {
    if (!this.owns(pointer) || this.dragged) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x - this.x, y - this.y) > this.slop) {
      this.dragged = true; return true;
    }
    return false;
  }
  end(pointer: number, x: number, y: number): boolean {
    if (!this.owns(pointer)) return false;
    this.move(pointer, x, y);
    const activate = !this.dragged;
    this.cancel(pointer);
    return activate;
  }
  cancel(pointer: number): boolean {
    if (!this.owns(pointer)) return false;
    this.pointer = undefined; this.dragged = false;
    return true;
  }
}
