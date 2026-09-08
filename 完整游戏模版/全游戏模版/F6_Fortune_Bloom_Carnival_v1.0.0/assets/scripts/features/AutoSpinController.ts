export class AutoSpinController {
  private cancelled = false;
  private running = false;
  public async start(count: number, spin: () => Promise<boolean>): Promise<number> {
    if (this.running) return 0; this.running = true; this.cancelled = false;
    let completed = 0;
    try { while (completed < count && !this.cancelled && await spin()) completed += 1; }
    finally { this.running = false; }
    return completed;
  }
  public cancel(): void { this.cancelled = true; }
  public get active(): boolean { return this.running; }
}
