import { _decorator, Component, Node, UIOpacity } from 'cc';
import { CabinetWinMotion, CABINET_WIN_TITLE, CABINET_WIN_RAYS, CABINET_WIN_LIGHTS, WinCoinPose, WinLightPose, WinOrnamentPose, WinBurstPose, CABINET_WIN_AUREOLE } from './CabinetWinMotion';
const { ccclass } = _decorator;
type ImageBinding = { node: Node; alpha: UIOpacity };
type FocusBinding = ImageBinding & { originalAlpha: number; owned: boolean };
/** Generated effects move over the SAME cabinet. Reels only soften in opacity;
 * their transforms, board identity and original keeper remain untouched. */
@ccclass('CabinetWinView')
export class CabinetWinView extends Component {
  private motion?: CabinetWinMotion;
  private held = false;
  private title?: ImageBinding;
  private amount: ImageBinding[] = [];
  private coins: ImageBinding[] = [];
  private lights: ImageBinding[] = [];
  private rays: ImageBinding[] = [];
  private sparkles: ImageBinding[] = [];
  private focus: FocusBinding[] = [];
  private ornaments: ImageBinding[] = [];
  private bursts: ImageBinding[] = [];
  private aureole?: ImageBinding;
  private jets: ImageBinding[] = [];
  private streamers: ImageBinding[] = [];
  private treasures: ImageBinding[] = [];
  private heroes: ImageBinding[] = [];
  private heroGlints: ImageBinding[] = [];
  private salutes: ImageBinding[] = [];
  private treasureGlints: ImageBinding[] = [];
  private burstPose: WinBurstPose = { x: 0, y: 0, alpha: 0, scale: 1, angle: 0 };
  private ornamentPose: WinOrnamentPose = { x: 0, y: 0, alpha: 0, angle: 0, scaleX: 1, scaleY: 1 };
  private pose: WinCoinPose = { x: 0, y: 0, size: 0, alpha: 0, angle: 0, squeeze: 1 };
  private lightPose: WinLightPose = { x: 0, y: 0, alpha: 0, angle: 0, scale: 1 };
  private qa = false;
  private lastReport = -1;
  initialize(motion: CabinetWinMotion, title: Node, amount: readonly Node[], coins: readonly Node[], lights: readonly Node[],
    rays: readonly Node[] = [], sparkles: readonly Node[] = [], reels: readonly Node[] = [], ornaments: readonly Node[] = [], bursts: readonly Node[] = [], aureole?: Node, jets: readonly Node[] = [], streamers: readonly Node[] = [], treasures: readonly Node[] = [], treasureGlints: readonly Node[] = [], heroes: readonly Node[] = [], heroGlints: readonly Node[] = [], salutes: readonly Node[] = []): void {
    const bind = (node: Node): ImageBinding => ({ node, alpha: node.getComponent(UIOpacity) || node.addComponent(UIOpacity) });
    this.motion = motion; this.title = bind(title); this.amount = amount.map(bind); this.coins = coins.map(bind); this.lights = lights.map(bind);
    this.rays = rays.map(bind); this.sparkles = sparkles.map(bind); this.ornaments = ornaments.map(bind); this.bursts = bursts.map(bind); this.aureole = aureole ? bind(aureole) : undefined;
    this.jets = jets.map(bind); this.streamers = streamers.map(bind); this.treasures = treasures.map(bind); this.treasureGlints = treasureGlints.map(bind);
    this.heroes = heroes.map(bind); this.heroGlints = heroGlints.map(bind); this.salutes = salutes.map(bind);
    this.focus = reels.filter(node => node.isValid).map(node => {
      const existing = node.getComponent(UIOpacity), binding = bind(node);
      return { ...binding, originalAlpha: binding.alpha.opacity, owned: !existing };
    });
    this.qa = typeof document !== 'undefined' && !!document.documentElement.dataset.cabinetWinPreview;
    this.update(0);
  }
  hold(): void { this.held = true; }
  private restoreFocus(): void {
    for (const b of this.focus) if (b.node.isValid && b.alpha.isValid) {
      b.alpha.opacity = b.originalAlpha;
      if (b.owned) b.alpha.destroy();
    }
    this.focus.length = 0;
  }
  finish(): void { this.held = false; this.motion?.finish(); this.update(0); this.restoreFocus(); }
  protected update(dt: number): void {
    const motion = this.motion; if (!motion || !this.title || this.held) return;
    motion.step(dt);
    this.title.alpha.opacity = motion.titleAlpha;
    this.title.node.setPosition(CABINET_WIN_TITLE[0] - 512, 768 - CABINET_WIN_TITLE[1] + motion.titleOffset);
    this.title.node.setScale(motion.titleScale, motion.titleScale, 1);
    for (const binding of this.amount) { binding.alpha.opacity = motion.amountAlpha; binding.node.setScale(motion.amountScale, motion.amountScale, 1); }
    for (const b of this.focus) if (b.node.isValid) b.alpha.opacity = Math.round(b.originalAlpha * motion.reelFactor);
    for (let i = 0; i < this.ornaments.length; i += 1) {
      const b = this.ornaments[i]; motion.ornament(i, this.ornamentPose);
      b.alpha.opacity = this.ornamentPose.alpha;
      b.node.setPosition(this.ornamentPose.x - 512, 768 - this.ornamentPose.y);
      b.node.setScale(this.ornamentPose.scaleX, this.ornamentPose.scaleY, 1); b.node.angle = this.ornamentPose.angle;
    }
    for (let layer = 0; layer < 2; layer++) {
      const sprites = layer === 0 ? this.jets : this.streamers;
      for (let i = 0; i < sprites.length; i++) {
        const b = sprites[i];
        if (layer === 0) motion.jet(i, this.ornamentPose); else motion.streamer(i, this.ornamentPose);
        b.alpha.opacity = this.ornamentPose.alpha;
        b.node.setPosition(this.ornamentPose.x - 512, 768 - this.ornamentPose.y);
        b.node.setScale(this.ornamentPose.scaleX, this.ornamentPose.scaleY, 1); b.node.angle = this.ornamentPose.angle;
      }
    }
    let visibleHeroes = 0, visibleSalutes = 0;
    for (let i = 0; i < this.heroes.length; i++) {
      const b = this.heroes[i], glint = this.heroGlints[i];
      motion.hero(i, this.ornamentPose);
      b.alpha.opacity = this.ornamentPose.alpha;
      if (glint) glint.alpha.opacity = 0;
      if (!this.ornamentPose.alpha) continue;
      visibleHeroes++;
      b.node.setPosition(this.ornamentPose.x - 512, 768 - this.ornamentPose.y);
      b.node.setScale(this.ornamentPose.scaleX, this.ornamentPose.scaleY, 1);
      b.node.angle = this.ornamentPose.angle;
      if (glint) {
        const p = Math.max(0, Math.sin(motion.elapsed * 3.7 - i * 1.17)) ** 6;
        const facet = motion.heroFixtures[i].fixture[2] * this.ornamentPose.scaleX * .22;
        glint.alpha.opacity = Math.round(this.ornamentPose.alpha * p);
        glint.node.setPosition(this.ornamentPose.x - 512 + facet, 768 - this.ornamentPose.y + facet);
        const size = .74 + .58 * p;
        glint.node.setScale(size, size, 1); glint.node.angle = motion.elapsed * 26 + i * 17;
      }
    }
    for (let i = 0; i < this.salutes.length; i++) {
      const b = this.salutes[i]; motion.salute(i, this.pose);
      b.alpha.opacity = this.pose.alpha;
      if (!this.pose.alpha) continue;
      visibleSalutes++;
      b.node.setPosition(this.pose.x - 512, 768 - this.pose.y);
      const size = this.pose.size / 32;
      b.node.setScale(size * this.pose.squeeze, size, 1); b.node.angle = this.pose.angle;
    }
    if (this.aureole) {
      this.aureole.alpha.opacity = motion.aureoleAlpha;
      this.aureole.node.setPosition(CABINET_WIN_AUREOLE[0] - 512, 768 - CABINET_WIN_AUREOLE[1]);
      this.aureole.node.setScale(motion.aureoleScale, motion.aureoleScale, 1); this.aureole.node.angle = motion.aureoleAngle;
    }
    let visibleBursts = 0;
    for (let i = 0; i < this.bursts.length; i += 1) {
      const b = this.bursts[i]; motion.burst(i, this.burstPose); b.alpha.opacity = this.burstPose.alpha;
      if (!this.burstPose.alpha) continue;
      visibleBursts++;
      b.node.setPosition(this.burstPose.x - 512, 768 - this.burstPose.y);
      b.node.setScale(this.burstPose.scale, this.burstPose.scale, 1); b.node.angle = this.burstPose.angle;
    }
    let visibleCoins = 0;
    for (let i = 0; i < this.coins.length; i += 1) {
      const b = this.coins[i]; motion.coin(i, this.pose); b.alpha.opacity = this.pose.alpha;
      if (!this.pose.alpha) continue;
      visibleCoins++;
      b.node.setPosition(this.pose.x - 512, 768 - this.pose.y);
      const scale = this.pose.size / 64;
      b.node.setScale(this.pose.squeeze * scale, scale, 1); b.node.angle = this.pose.angle;
    }
    let visibleTreasures = 0;
    for (let i = 0; i < this.treasures.length; i++) {
      const b = this.treasures[i], glint = this.treasureGlints[i]; motion.treasure(i, this.pose);
      b.alpha.opacity = this.pose.alpha;
      if (glint) glint.alpha.opacity = 0;
      if (!this.pose.alpha) continue;
      visibleTreasures++;
      const scale = this.pose.size / 64;
      b.node.setPosition(this.pose.x - 512, 768 - this.pose.y);
      b.node.setScale(scale, scale, 1); b.node.angle = this.pose.angle;
      // A glint belongs to this jewel/ingot, rather than a screen-wide flash.
      // Staggered smooth highlights travel with real treasure facets.
      if (glint) {
        const power = Math.max(0, Math.sin(motion.elapsed * 3.2 + i * 1.73)) ** 8;
        glint.alpha.opacity = Math.round(this.pose.alpha * power);
        glint.node.setPosition(this.pose.x - 512 + this.pose.size * .18, 768 - this.pose.y + this.pose.size * .2);
        const shine = .72 + .4 * power;
        glint.node.setScale(shine, shine, 1); glint.node.angle = motion.elapsed * 18 + i * 29;
      }
    }
    for (let i = 0; i < this.lights.length; i += 1) {
      const b = this.lights[i], alpha = motion.light(i); b.alpha.opacity = alpha;
      if (i >= CABINET_WIN_LIGHTS.length) {
        const size = 1 + .48 * alpha / 255; b.node.setScale(size, size, 1);
        b.node.angle = Math.sin(motion.elapsed * 1.8 + i) * 12;
      }
    }
    for (let i = 0; i < this.rays.length; i += 1) {
      const b = this.rays[i], fixture = CABINET_WIN_RAYS[i];
      b.alpha.opacity = Math.round(motion.rayAlpha * (i ? .52 : 1));
      b.node.setPosition(fixture[0] - 512, 768 - fixture[1]);
      b.node.setScale(motion.rayScale, motion.rayScale, 1);
      b.node.angle = motion.rayAngle * (i ? -1 : 1);
    }
    for (let i = 0; i < this.sparkles.length; i += 1) {
      const b = this.sparkles[i]; motion.sparkle(i, this.lightPose); b.alpha.opacity = this.lightPose.alpha;
      if (!this.lightPose.alpha) continue;
      b.node.setPosition(this.lightPose.x - 512, 768 - this.lightPose.y);
      b.node.setScale(this.lightPose.scale, this.lightPose.scale, 1); b.node.angle = this.lightPose.angle;
    }
    // Read-only UI evidence, no engine/debug mutation channel. Normal builds
    // have no reporting allocations; QA snapshots are throttled to 8Hz.
    if (this.qa && motion.elapsed - this.lastReport >= .125) {
      this.lastReport = motion.elapsed;
      document.documentElement.dataset.cabinetWinChoreography = JSON.stringify({
        phase: motion.phase, time: motion.elapsed, tier: motion.tier, room: motion.room,
        visibleHeroes, heroes: this.heroes.length, visibleSalutes, salutes: this.salutes.length, visibleCoins, visibleTreasures, treasureCapacity: this.treasures.length, jets: this.jets.length, visibleJets: this.jets.filter(b => b.alpha.opacity > 30).length, streamers: this.streamers.length, encoreTime: Number.isFinite(motion.encoreTime) ? motion.encoreTime : null, visibleBursts, bursts: this.bursts.length, aureole: !!this.aureole, aureoleAlpha: motion.aureoleAlpha, capacity: this.coins.length, rays: this.rays.length, sparkles: this.sparkles.length,
        lights: this.lights.length, ornaments: this.ornaments.length, reelFactor: motion.reelFactor, titleAlpha: motion.titleAlpha,
      });
    }
  }
  protected onDestroy(): void {
    this.restoreFocus(); this.motion = undefined; this.title = undefined;
    this.heroes.length = 0; this.heroGlints.length = 0; this.salutes.length = 0;
    this.aureole = undefined; this.jets.length = 0; this.streamers.length = 0; this.treasures.length = 0; this.treasureGlints.length = 0; this.bursts.length = 0; this.ornaments.length = 0; this.amount.length = 0; this.coins.length = 0; this.lights.length = 0; this.rays.length = 0; this.sparkles.length = 0;
  }
}
