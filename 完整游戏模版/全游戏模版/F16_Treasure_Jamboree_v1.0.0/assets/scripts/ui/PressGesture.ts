/** One finger owns a press until its end/cancel; leaving never rearms it. */
export class PressGesture {
  private owner: number | null = null;
  private eligible = false;
  private x = 0;
  private y = 0;

  public start(id: number, x: number, y: number, inside: boolean): boolean {
    if (this.owner !== null || !inside) return false;
    this.owner = id; this.eligible = true; this.x = x; this.y = y;
    return true;
  }
  public move(id: number, x: number, y: number, inside: boolean): boolean {
    if (id !== this.owner || !this.eligible) return false;
    if (inside && (x - this.x) ** 2 + (y - this.y) ** 2 <= 18 ** 2) return false;
    this.eligible = false;
    return true;
  }
  public owns(id: number): boolean { return this.owner === id; }
  public end(id: number, inside: boolean): boolean {
    if (!this.owns(id)) return false;
    const run = this.eligible && inside;
    this.reset();
    return run;
  }
  public reset(): void { this.owner = null; this.eligible = false; }
}
