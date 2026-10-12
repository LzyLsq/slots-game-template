/** One pointer, one deliberate action. A vertical drag/cancellation cannot enter
 * a room, and a horizontal browse never also fires the card's enter action. */
export type HallRoomAction = 'tap' | 'previous' | 'next';
export class HallRoomGesture {
  private pointer?: number;
  private x = 0;
  private y = 0;
  private dx = 0;
  private dy = 0;
  private moved = false;
  private axis: 'horizontal' | 'vertical' | undefined;
  begin(pointer: number, x: number, y: number): boolean {
    if (this.pointer !== undefined || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    this.pointer = pointer; this.x = x; this.y = y;
    this.dx = this.dy = 0; this.moved = false; this.axis = undefined;
    return true;
  }
  owns(pointer: number): boolean { return this.pointer === pointer; }
  move(pointer: number, x: number, y: number): void {
    if (pointer !== this.pointer || !Number.isFinite(x) || !Number.isFinite(y)) return;
    this.dx = x - this.x; this.dy = y - this.y;
    const ax = Math.abs(this.dx), ay = Math.abs(this.dy);
    if (ax > 12 || ay > 12) this.moved = true;
    if (!this.axis && this.moved) {
      if (ax > ay * 1.3) this.axis = 'horizontal';
      else if (ay > ax * 1.3) this.axis = 'vertical';
    }
  }
  end(pointer: number, x: number, y: number): HallRoomAction | undefined {
    if (pointer !== this.pointer) return;
    this.move(pointer, x, y);
    const action = !this.moved ? 'tap'
      : this.axis === 'horizontal' && Math.abs(this.dx) >= 40 && Math.abs(this.dx) > Math.abs(this.dy) * 1.3
        ? this.dx < 0 ? 'next' : 'previous' : undefined;
    this.cancel(pointer);
    return action;
  }
  cancel(pointer: number): boolean {
    if (pointer !== this.pointer) return false;
    this.pointer = undefined; this.dx = this.dy = 0; this.moved = false; this.axis = undefined;
    return true;
  }
}
