/** Presentation-only motion for the four generated lobby miniatures.
 * Fixed-size state/pools; no RNG, timers, wallet or navigation dependency. */
export type HallMode = 0 | 1 | 2 | 3;
export const HALL_JELLY_PROFILES = [
  { frequency: 11.5, damping: 4.0, tilt: 13, flight: 1.18 }, // buoyant jade boat
  { frequency: 10.0, damping: 3.8, tilt: 9, flight: 1.40 }, // soft pearl bloom
  { frequency: 14.2, damping: 4.9, tilt: 11, flight: 1.06 }, // quick golden press
  { frequency: 10.8, damping: 3.9, tilt: 14, flight: 1.30 }, // stately dragon seal
] as const;
export const HALL_FORTUNE_GEOMETRY = { iconWidth: 180, iconHeight: 135, coinSize: 30, lightWidth: 154, lightHeight: 36 } as const;
export type HallCoinPose = { x: number; y: number; scaleX: number; scaleY: number; angle: number; opacity: number };
export type HallJellyPose = { scaleX: number; scaleY: number; angle: number; light: number; lightScaleX: number; coins: HallCoinPose[] };
type Pulse = { at: number; amount: number; direction: number; burst: number; pressedAt: number; pressedFrom: number };
const clamp = (value: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, value));
const freshPose = (): HallJellyPose => ({ scaleX: 1, scaleY: 1, angle: 0, light: 0, lightScaleX: 1,
  coins: Array.from({ length: 3 }, (): HallCoinPose => ({ x: 0, y: 32, scaleX: 1, scaleY: 1, angle: 0, opacity: 0 })) });

export class HallFortuneMotion {
  readonly poses = [freshPose(), freshPose(), freshPose(), freshPose()];
  private readonly pulses: Pulse[] = Array.from({ length: 4 }, () => ({ at: -10, amount: 0, direction: 1, burst: 0, pressedAt: -1, pressedFrom: 0 }));
  private time = 0;
  private nextAmbient = 1.9;
  private ambientStep = 0;
  private paused = false;
  private selected: HallMode;
  constructor(selected: HallMode, readonly reduced = false) {
    this.selected = selected;
    if (!reduced) this.pulse(selected, -.10, 1, 2);
    this.write();
  }
  private wave(mode: HallMode): number {
    const p = this.pulses[mode];
    if (p.pressedAt >= 0) return -.095 + (p.pressedFrom + .095) * Math.exp(-24 * (this.time - p.pressedAt));
    const age = this.time - p.at;
    if (age > 1.8) return 0;
    const profile = HALL_JELLY_PROFILES[mode];
    return p.amount * Math.exp(-profile.damping * age) * (Math.cos(profile.frequency * age) - .16 * Math.sin(profile.frequency * age));
  }
  private pulse(mode: HallMode, amount: number, direction: number, burst: number): void {
    const p = this.pulses[mode];
    p.at = this.time; p.amount = amount; p.direction = direction; p.burst = burst; p.pressedAt = -1;
  }
  select(mode: HallMode, direction = 1): void {
    if (this.paused) return;
    this.selected = mode;
    if (!this.reduced) this.pulse(mode, -.14, direction, 3);
    this.nextAmbient = this.time + 2.4;
    this.write();
  }
  press(mode: HallMode): void {
    if (this.reduced || this.paused) return;
    const p = this.pulses[mode];
    p.pressedFrom = this.wave(mode); p.pressedAt = this.time; p.burst = 0;
    this.nextAmbient = this.time + 2.4;
  }
  release(mode: HallMode): void {
    const p = this.pulses[mode];
    if (p.pressedAt < 0) return;
    this.pulse(mode, this.wave(mode), p.direction, 0);
    this.nextAmbient = this.time + 1.9;
    this.write();
  }
  step(dt: number): void {
    if (this.paused || this.reduced) return;
    // No catch-up burst after tab suspension / a long frame.
    this.time += clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
    let held = false;
    for (const p of this.pulses) if (p.pressedAt >= 0) held = true;
    if (this.time >= this.nextAmbient && !held) {
      const active = this.ambientStep % 2 === 0;
      let mode = this.selected;
      if (!active) mode = (this.selected + 1 + Math.floor(this.ambientStep / 2) % 3) % 4 as HallMode;
      this.pulse(mode, active ? -.086 : -.061, this.ambientStep % 4 < 2 ? 1 : -1, active ? 2 : 1);
      this.ambientStep++; this.nextAmbient = this.time + 1.25;
    }
    this.write();
  }
  suspend(): void { this.paused = true; this.reset(); }
  resume(): void { this.paused = false; this.nextAmbient = this.time + 1.9; this.write(); }
  private reset(): void {
    for (const p of this.pulses) { p.at = -10; p.amount = 0; p.burst = 0; p.pressedAt = -1; }
    this.write();
  }
  private write(): void {
    for (let i = 0; i < 4; i++) {
      const mode = i as HallMode, pose = this.poses[i], p = this.pulses[i];
      const wave = this.reduced || this.paused ? 0 : this.wave(mode);
      pose.scaleY = 1 + wave; pose.scaleX = 1 - wave * .72;
      pose.angle = wave * HALL_JELLY_PROFILES[mode].tilt * p.direction;
      const age = this.time - p.at;
      const flash = this.reduced || this.paused ? 0 : Math.max(0, Math.sin(Math.min(1, age / .85) * Math.PI)) * (p.burst ? 132 : 45);
      pose.light = this.paused ? 0 : i === this.selected ? this.reduced ? 90 : 76 + Math.sin(this.time * 2.0) * 25 + flash : flash;
      pose.lightScaleX = 1 + Math.abs(wave) * 1.4;
      for (let k = 0; k < 3; k++) {
        const coin = pose.coins[k];
        coin.opacity = 0;
        if (this.reduced || this.paused || k >= p.burst || p.pressedAt >= 0) continue;
        const t = (age - .10 - k * .14) / HALL_JELLY_PROFILES[mode].flight;
        if (t <= 0 || t >= 1) continue;
        const side = (k % 2 === 0 ? -1 : 1) * p.direction;
        // The arc hugs the OUTSIDE of each miniature, well above its live name.
        coin.x = side * (85 + Math.sin(t * Math.PI) * 4);
        coin.y = 24 + 71 * t - 31 * t * t;
        coin.scaleY = .78 + Math.sin(t * Math.PI) * .18;
        coin.scaleX = coin.scaleY * (.40 + .60 * Math.abs(Math.cos(t * Math.PI * 2 + k)));
        coin.angle = side * (t * 100 - 20);
        coin.opacity = Math.sin(t * Math.PI) ** .75 * (p.burst === 3 ? 240 : 195);
      }
    }
  }
}
