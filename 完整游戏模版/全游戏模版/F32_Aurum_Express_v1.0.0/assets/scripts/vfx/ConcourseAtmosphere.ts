import { _decorator, Component, Mask, Node, UIOpacity } from 'cc';
import { SalonArt, box } from '../ui/SalonArt';
const { ccclass } = _decorator;

type Glow = { alpha: UIOpacity; base: number; range: number; period: number; phase: number };
type Glint = { alpha: UIOpacity; peak: number; period: number; phase: number };
type Rail = { node: Node; alpha: UIOpacity; side: number; delay: number };
type Steam = { node: Node; alpha: UIOpacity; phase: number };

/** Reflected light is registered to fixtures, rails and treasure in the single
 * station photograph. Only the photographed glass receives a masked sweep. */
@ccclass('ConcourseAtmosphere')
export class ConcourseAtmosphere extends Component {
  private elapsed = 0;
  private glows: Glow[] = [];
  private glints: Glint[] = [];
  private rails: Rail[] = [];
  private steam: Steam[] = [];
  private floorWash?: { node: Node; alpha: UIOpacity };
  private wheel: UIOpacity[] = [];
  private wheelPulse = [0, 0];
  private selectionPulse = 0;
  private glassSweep?: { node: Node; alpha: UIOpacity; span: number };
  private photoScale = 1;
  private lift = 0;

  private photoPosition(x: number, y: number): [number, number] {
    return [(x - 470.5) * this.photoScale, (836 - y) * this.photoScale + this.lift];
  }

  public setup(art: SalonArt, photoScale: number, lift: number): void {
    this.photoScale = photoScale;
    this.lift = lift;
    const lamps: [number, number, number, number, number, number][] = [
      [148, 522, 100, 7.2, 0, 53], [793, 522, 100, 8.1, 2.5, 53],
      [470, 829, 145, 4.8, 1.8, 79],
      // Brass chandelier crystals, not independent floating ornaments.
      [85, 164, 84, 6.4, .4, 38], [856, 164, 84, 6.4, 3.6, 38],
    ];
    for (const [x, y, size, period, phase, range] of lamps) {
      const node = art.light(this.node, 0, ...this.photoPosition(x, y), size * photoScale, size * photoScale, 0);
      node.name = 'Reflection on photographed fixture';
      this.glows.push({ alpha: node.getComponent(UIOpacity)!, base: 12, range, period, phase });
    }
    // A translucent cutout of this same station photograph supplies the steam.
    // Two offset, cross-fading passes introduce billowing without covering the
    // chimney with unrelated art or shifting any interactive foreground.
    for (const phase of [0, .5]) {
      const node = art.image(this.node, 'f32-concourse-steam', ...this.photoPosition(477.5, 556), 215 * photoScale, 302 * photoScale);
      node.name = 'Steam from photographed locomotive';
      this.steam.push({ node, alpha: node.addComponent(UIOpacity), phase });
    }
    // Headlamp energy travels forward across the photographed floor, cropped
    // well above the brass title and below the train's wheels.
    const floor = box(this.node, 'Platform floor light aperture', ...this.photoPosition(470, 1047), 560 * photoScale, 132 * photoScale);
    floor.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    const wash = art.light(floor, 0, 0, 0, 510 * photoScale, 150 * photoScale, 0);
    wash.name = 'Advancing locomotive reflection on platform';
    this.floorWash = { node: wash, alpha: wash.getComponent(UIOpacity)! };
    // A travelling pair of glints follows the *existing* converging tracks,
    // returning to the headlight. It stops before the game-title lintel.
    for (const side of [-1, 1]) {
      const node = art.light(this.node, 3, ...this.photoPosition(470 + side * 112, 977), 99 * photoScale, 32 * photoScale, 0);
      node.name = side < 0 ? 'Left track reflection' : 'Right track reflection';
      node.angle = side < 0 ? 39 : -39;
      this.rails.push({ node, alpha: node.getComponent(UIOpacity)!, side, delay: side < 0 ? 0 : .55 });
    }
    // Brief highlights land on actual coins and the polished platform seams.
    const flecks: [number, number, number, number, number, number][] = [
      [225, 1229, 42, 130, 4.9, 0], [315, 1264, 38, 124, 5.1, 1.1],
      [456, 1218, 41, 128, 5.3, 2.2], [610, 1257, 43, 116, 5.7, 3.2],
      [334, 992, 47, 62, 6.4, 4.2], [614, 1018, 46, 62, 6.8, 1.4],
    ];
    for (const [x, y, size, peak, period, phase] of flecks) {
      const node = art.light(this.node, 3, ...this.photoPosition(x, y), size * photoScale, size * photoScale, 0);
      node.name = 'Coin or platform highlight';
      this.glints.push({ alpha: node.getComponent(UIOpacity)!, peak, period, phase });
    }
    const glassWidth = 605 * photoScale;
    const glass = box(this.node, 'Treasury glass reflection aperture', ...this.photoPosition(470, 1248), glassWidth, 88 * photoScale);
    glass.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    for (const [x, phase] of [[-167, 0], [148, 1.8]] as const) {
      const pool = art.light(glass, 0, x * photoScale, 0, 175 * photoScale, 107 * photoScale, 0);
      pool.name = 'Light breathing through inlaid treasury coins';
      this.glows.push({ alpha: pool.getComponent(UIOpacity)!, base: 16, range: 76, period: 4.8, phase });
    }
    const sweep = art.light(glass, 2, -glassWidth / 2 - 95, 0, 170 * photoScale, 82 * photoScale, 0);
    sweep.name = 'Moving reflection within treasury glass';
    this.glassSweep = { node: sweep, alpha: sweep.getComponent(UIOpacity)!, span: glassWidth + 190 * photoScale };
    for (const [i, x] of [79, 862].entries()) {
      const node = art.light(this.node, 0, ...this.photoPosition(x, 1405), 100 * photoScale, 100 * photoScale, 0);
      node.name = 'Selected wheel inlaid feedback';
      this.wheel[i] = node.getComponent(UIOpacity)!;
    }
  }

  public routeSelected(direction: number): void {
    this.wheelPulse[direction > 0 ? 1 : 0] = 1;
    this.selectionPulse = 1;
  }

  protected update(dt: number): void {
    const step = Math.min(Math.max(dt, 0), .05);
    this.elapsed += step;
    this.selectionPulse = Math.max(0, this.selectionPulse - step * 1.25);
    for (const g of this.glows) {
      g.alpha.opacity = Math.round(g.base + g.range * (.5 + .5 * Math.sin((this.elapsed + g.phase) * Math.PI * 2 / g.period)));
    }
    for (const g of this.glints) {
      const phase = ((this.elapsed + g.phase) % g.period) / g.period;
      g.alpha.opacity = phase < .25 ? Math.round(g.peak * Math.sin(Math.PI * phase / .25) ** 2) : 0;
    }
    for (const plume of this.steam) {
      const phase = (this.elapsed / 5.4 + plume.phase) % 1;
      const breathe = Math.sin(Math.PI * phase);
      plume.node.setPosition(...this.photoPosition(477.5 + Math.sin(phase * Math.PI * 2 + plume.phase * 2) * 7, 556 - phase * 26));
      plume.node.setScale(1 + phase * .10, 1 + phase * .07, 1);
      plume.alpha.opacity = Math.round(112 * breathe * breathe);
    }
    if (this.floorWash) {
      const phase = this.elapsed % 6.3 / 6.3;
      const t = Math.max(0, Math.min(1, (phase - .05) / .68));
      this.floorWash.node.setPosition(0, (1047 - (985 + 116 * t)) * this.photoScale);
      this.floorWash.node.setScale(.32 + .72 * t, .48 + .37 * t, 1);
      this.floorWash.alpha.opacity = phase > .05 && phase < .73 ? Math.round(90 * Math.sin(Math.PI * t) ** 2) : 0;
    }
    for (const rail of this.rails) {
      const phase = ((this.elapsed + rail.delay) % 5.1) / 5.1;
      const t = Math.max(0, Math.min(1, (phase - .09) / .62));
      rail.node.setPosition(...this.photoPosition(470 + rail.side * (112 + 87 * t), 977 + 117 * t));
      rail.alpha.opacity = phase > .09 && phase < .71 ? Math.round(93 * Math.sin(Math.PI * t) ** 2) : 0;
    }
    if (this.glassSweep) {
      const sweep = this.glassSweep;
      const phase = this.elapsed % 7.6 / 7.6;
      const travel = Math.max(0, Math.min(1, (phase - .06) / .52));
      sweep.node.setPosition(-sweep.span / 2 + sweep.span * travel, 0);
      const natural = phase > .06 && phase < .58 ? 92 * Math.sin(Math.PI * travel) ** 2 : 0;
      sweep.alpha.opacity = Math.round(Math.max(natural, this.selectionPulse * 62));
    }
    for (let i = 0; i < this.wheel.length; i++) {
      this.wheelPulse[i] = Math.max(0, this.wheelPulse[i] - step * 1.8);
      this.wheel[i].opacity = Math.round(112 * this.wheelPulse[i] ** 2);
    }
  }
}
