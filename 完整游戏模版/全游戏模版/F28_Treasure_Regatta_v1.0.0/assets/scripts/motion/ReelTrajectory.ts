export type ReelPhase = 'pull' | 'accelerate' | 'cruise' | 'decelerate' | 'settle' | 'complete';
export interface ReelSample { offset: number; velocity: number; phase: ReelPhase }
const smooth = (u: number): number => u * u * (3 - 2 * u);
/** Integrated smoothstep speed: continuous distance AND velocity at every join. */
const integral = (u: number): number => u * u * u - .5 * u * u * u * u;

export class ReelTrajectory {
  readonly pullDuration: number;
  readonly accelerationDuration: number;
  readonly cruiseDuration: number;
  readonly decelerationDuration: number;
  readonly settleDuration: number;
  readonly speed: number;
  readonly target: number;
  readonly duration: number;
  private readonly overshoot = .085;
  private readonly accelerationDistance: number;
  private readonly cruiseDistance: number;
  constructor(column: number, turbo = false) {
    if (!Number.isInteger(column) || column < 0 || column > 5) throw new Error('Invalid reel index');
    this.pullDuration = turbo ? .04 : .075;
    this.accelerationDuration = turbo ? .11 : .2;
    this.decelerationDuration = turbo ? .2 : .38;
    this.settleDuration = turbo ? .09 : .15;
    this.speed = turbo ? 34 : 27;
    this.accelerationDistance = this.speed * this.accelerationDuration / 2;
    const decelerationDistance = this.speed * this.decelerationDuration / 2;
    const desiredCruise = (turbo ? .12 : .45) + column * (turbo ? .06 : .11);
    this.target = Math.ceil(this.accelerationDistance + this.speed * desiredCruise + decelerationDistance - this.overshoot);
    this.cruiseDistance = this.target + this.overshoot - this.accelerationDistance - decelerationDistance;
    this.cruiseDuration = this.cruiseDistance / this.speed;
    this.duration = this.pullDuration + this.accelerationDuration + this.cruiseDuration + this.decelerationDuration + this.settleDuration;
  }
  /** Caller reuses `out` and scales symbol-units to its container's cell height. */
  sample(elapsed: number, out: ReelSample): void {
    if (!Number.isFinite(elapsed)) throw new Error('Invalid animation time');
    let t = Math.max(0, elapsed);
    if (t < this.pullDuration) {
      const u = t / this.pullDuration, s = Math.sin(Math.PI * u);
      out.offset = -.1 * s * s;
      out.velocity = -.1 * Math.PI * Math.sin(2 * Math.PI * u) / this.pullDuration;
      out.phase = 'pull'; return;
    }
    t -= this.pullDuration;
    if (t < this.accelerationDuration) {
      const u = t / this.accelerationDuration;
      out.offset = this.speed * this.accelerationDuration * integral(u);
      out.velocity = this.speed * smooth(u); out.phase = 'accelerate'; return;
    }
    t -= this.accelerationDuration;
    if (t < this.cruiseDuration) {
      out.offset = this.accelerationDistance + t * this.speed;
      out.velocity = this.speed; out.phase = 'cruise'; return;
    }
    t -= this.cruiseDuration;
    if (t < this.decelerationDuration) {
      const u = t / this.decelerationDuration;
      out.offset = this.accelerationDistance + this.cruiseDistance + this.speed * this.decelerationDuration * (u - integral(u));
      out.velocity = this.speed * (1 - smooth(u)); out.phase = 'decelerate'; return;
    }
    t -= this.decelerationDuration;
    if (t < this.settleDuration) {
      const u = t / this.settleDuration;
      out.offset = this.target + this.overshoot * (1 - smooth(u));
      out.velocity = -this.overshoot * 6 * u * (1 - u) / this.settleDuration;
      out.phase = 'settle'; return;
    }
    out.offset = this.target; out.velocity = 0; out.phase = 'complete';
  }
}
