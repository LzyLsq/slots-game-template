import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

/** Keep the contact pivot grounded. Each complete character has a deliberate
 * invitation and a smooth response; the cabinet and its controls stay still. */
@ccclass('CabinetGuardian')
export class CabinetGuardian extends Component {
  public reducedMotion = false;
  private body!: Node;
  private arm!: Node;
  private theme = 0;
  private time = 0;
  private joy = 0;
  private responseAge = 4;
  private response = 0;
  private anticipation = 0;
  private watching = false;
  public setup(body: Node, arm: Node, theme: number): void {
    this.body = body; this.arm = arm; this.theme = theme; this.time = theme * 1.07;
  }
  public watch(spinning: boolean): void { this.watching = spinning; }
  public celebrate(): void {
    if (this.reducedMotion) return;
    if (this.theme >= 2) this.responseAge = 0;
    else this.joy = 1;
  }
  private smooth(value: number): number {
    const t = Math.max(0, Math.min(1, value));
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  private groundedPose(step: number): void {
    this.responseAge += step;
    // The response begins at rest and eases back to it. A repeated win does
    // not jump the current pose because the envelope itself is damped.
    const crest = this.smooth(this.responseAge / .24) *
      (1 - this.smooth((this.responseAge - .7) / 1.6));
    this.response += (crest - this.response) * (1 - Math.exp(-step / .13));
    const pearl = this.theme === 2;
    const cycle = (this.time + this.theme * .7) % (pearl ? 8.6 : 7.9);
    let invitation: number;
    if (pearl) {
      // One unhurried wing opening with a quiet hold and a long return.
      const unfold = this.smooth(cycle / 1.15) *
        (1 - this.smooth((cycle - 2.35) / 1.45));
      const feather = this.smooth((cycle - .9) / .45) *
        (1 - this.smooth((cycle - 2.35) / .75));
      invitation = unfold * 6.9 + feather * .55 * Math.sin((cycle - .9) * 3.4);
    } else {
      // Lift once, make two feline beckons, then let the paw settle. The
      // enclosing quintic curve makes both cycle boundaries continuous.
      const lift = this.smooth(cycle / .85) *
        (1 - this.smooth((cycle - 2.95) / 1.05));
      const beckon = this.smooth((cycle - .65) / .45) *
        (1 - this.smooth((cycle - 2.6) / .6));
      invitation = lift * 5.6 + beckon * 4.5 *
        (.5 - .5 * Math.cos((cycle - .65) * 5.8));
    }
    const delight = this.response *
      (1.5 + .7 * Math.sin(this.responseAge * 4.8));
    const target = invitation + this.anticipation * (pearl ? 1.7 : 2.0) + delight;
    this.arm.angle += (target - this.arm.angle) * (1 - Math.exp(-step / .09));
    const breath = .5 - .5 * Math.cos(this.time * .94);
    // Keep the painted paws/feet close to their contact shadows. The gesture
    // carries the visible movement rather than scaling the entire cutout.
    this.body.setScale(1 + breath * .004 + this.response * .0015,
      1 + breath * .008 + this.response * .003, 1);
    this.body.angle = Math.sin(this.time * .58) * .2 +
      this.anticipation * .2 + this.response * .12 * Math.sin(this.responseAge * 3.3);
  }
  protected update(dt: number): void {
    if (!this.body) return;
    if (this.reducedMotion) {
      this.arm.angle = 0; this.body.angle = 0; this.body.setScale(1, 1, 1);
      this.joy = this.response = this.anticipation = 0; this.responseAge = 4;
      return;
    }
    const step = Math.min(dt, .05); this.time += step;
    this.anticipation += ((this.watching ? 1 : 0) - this.anticipation) *
      (1 - Math.exp(-step / .35));
    if (this.theme >= 2) { this.groundedPose(step); return; }
    // Preserve the existing Coin/Sapphire choreography and authored joint.
    this.joy = Math.max(0, this.joy - step / 2.8);
    const breath = .5 - .5 * Math.cos(this.time * 1.08);
    const cycle = (this.time + this.theme * .7) % (6.8 + this.theme * .27);
    const window = cycle < 3.7 ? Math.pow(Math.sin(Math.PI * cycle / 3.7), 2) : 0;
    const gesture = (.5 + .5 * Math.sin(cycle * 6.0)) * window;
    const direction = [1, -1][this.theme];
    const happy = Math.sin(this.time * 8.2) * this.joy;
    this.arm.angle = direction * (gesture * [15, 14][this.theme] +
      this.anticipation * 5 + happy * 5);
    this.body.setScale(1 + breath * .010 + this.joy * .006,
      1 + breath * .018 + this.joy * .010, 1);
    this.body.angle = Math.sin(this.time * .64) * .55 +
      direction * this.anticipation * .6 + happy * .35;
  }
}
