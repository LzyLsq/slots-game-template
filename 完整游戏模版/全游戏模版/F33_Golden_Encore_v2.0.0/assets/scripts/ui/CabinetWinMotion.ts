import { protectionOpacity, type ClearRect, type Fixture } from './KeeperClearance';
export type CabinetPrizeTier = 'big' | 'super';
export type CabinetWinPhase = 'gather' | 'reveal' | 'cascade' | 'encore' | 'finale' | 'hold';
/** Source pixels of the EXISTING cabinet; never viewport-dependent offsets. */
export const CABINET_WIN_TITLE: Fixture = [512, 615, 566, 138];
export const CABINET_WIN_AMOUNT: Fixture = [512, 717, 468, 86];
export const CABINET_WIN_LIGHTS: readonly Fixture[] = [
  [166, 508, 46, 58], [858, 508, 46, 58],
  [164, 578, 50, 74], [860, 578, 50, 74],
  [170, 686, 48, 76], [854, 686, 48, 76],
  [176, 787, 46, 66], [848, 787, 46, 66],
  [232, 822, 70, 40], [792, 822, 70, 40], [404, 842, 64, 26], [620, 842, 64, 26],
];
/** Generated, separately animated sculpture: crown, treasury base, left/right
 * flourishes. No single static victory poster or extra mascot substitutes. */
export const CABINET_WIN_ORNAMENTS: readonly Fixture[] = [
  [512, 534, 560, 182], [512, 821, 680, 144], [241, 666, 190, 412], [783, 666, 190, 412],
];
export const CABINET_WIN_CROWN: readonly Fixture[] = [[406, 503, 62, 38], [618, 503, 62, 38], [231, 651, 64, 46], [793, 651, 64, 46]];
export const CABINET_WIN_RAYS: readonly Fixture[] = [[512, 659, 608, 340], [512, 659, 494, 298]];
/** Generated light filaments, separately expanding bursts. The protected
 * title/amount are always composited later; no burst occupies the HUD/keeper. */
export const CABINET_WIN_AUREOLE: Fixture = [512, 665, 410, 410];
export const CABINET_WIN_BURSTS: readonly Fixture[] = [
  [142, 580, 188, 188], [882, 580, 188, 188],
  [225, 791, 142, 142], [799, 791, 142, 142],
  [331, 514, 104, 104], [693, 514, 104, 104],
];
/** Actual generated plumes unfold bottom-up on the outside of the carving.
 * Their source-space extent stays between keeper lamps and the control shelf. */
export const CABINET_WIN_JETS: readonly Fixture[] = [[170, 673, 172, 374], [854, 673, 172, 374]];
export const CABINET_WIN_STREAMERS: readonly Fixture[] = [[512, 495, 642, 74], [512, 845, 704, 52]];
export const CABINET_WIN_COPY: readonly ClearRect[] = [[216, 540, 808, 684], [266, 668, 758, 766]];
export const CABINET_WIN_CLEARANCE: readonly ClearRect[] = [
  [0, 0, 1024, 438], // original wordmark, keeper and feature lamps
  // Copy is composited AFTER every effect, on its opaque room-specific inlay.
  // Do not gate the whole centre into a dead zone: gold rains behind the copy.
  [0, 896, 1024, 1536], // physical controls, status, wallet and utilities
];
export type WinHeroFixture = { kind: 'ingot' | 'jewel'; fixture: Fixture };
export type WinCoinPose = { x: number; y: number; size: number; alpha: number; angle: number; squeeze: number };
export type WinOrnamentPose = { x: number; y: number; alpha: number; angle: number; scaleX: number; scaleY: number };
export type WinBurstPose = { x: number; y: number; alpha: number; scale: number; angle: number };
export type WinLightPose = { x: number; y: number; alpha: number; angle: number; scale: number };
export const winEase = (v: number): number => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
const pulse = (time: number, start: number, duration: number): number => {
  const age = (time - start) / duration;
  return age <= 0 || age >= 1 ? 0 : Math.sin(Math.PI * age) ** 2;
};
/** A finite, pooled treasure crescendo: gathering rails → reveal → gold waves →
 * final glint → quiet hold. Absolute-time poses stay continuous at every cadence.
 * No random jitter, node creation, cabinet shake, result or wallet changes. */
export class CabinetWinMotion {
  readonly capacity: number;
  readonly heroFixtures: readonly WinHeroFixture[];
  readonly saluteCapacity: number;
  readonly sparkleCapacity: number;
  readonly burstCapacity: number;
  readonly counterDelay = .98;
  readonly coinsPerWave = 24;
  readonly treasureCapacity: number;
  readonly encoreTime: number;
  readonly counterDuration: number;
  readonly waveTimes: readonly number[];
  readonly finaleTime: number;
  readonly holdTime: number;
  elapsed = 0;
  phase: CabinetWinPhase = 'gather';
  titleAlpha = 0; titleOffset = -22; titleScale = .91; amountAlpha = 0;
  reelFactor = 1; rayAlpha = 0; rayScale = .94; rayAngle = 0; amountScale = 1;
  aureoleAlpha = 0; aureoleScale = .78; aureoleAngle = 0;
  finished = false;
  constructor(readonly tier: CabinetPrizeTier, readonly reduced = false, readonly room = 0) {
    // Large generated treasures visibly travel out of the cabinet, rather
    // than merely adding another finished prize plate. SUPER owns a distinct
    // seven-piece coronation; BIG owns a three-piece offering.
    this.heroFixtures = reduced ? [] : tier === 'super' ? [
      { kind: 'jewel', fixture: [512, 516, 178, 178] },
      { kind: 'ingot', fixture: [344, 536, 166, 166] },
      { kind: 'ingot', fixture: [680, 536, 166, 166] },
      { kind: 'jewel', fixture: [134, 622, 152, 152] },
      { kind: 'jewel', fixture: [890, 622, 152, 152] },
      { kind: 'ingot', fixture: [182, 812, 146, 146] },
      { kind: 'ingot', fixture: [842, 812, 146, 146] },
    ] : [
      { kind: 'ingot', fixture: [512, 524, 186, 186] },
      { kind: 'jewel', fixture: [140, 666, 136, 136] },
      { kind: 'jewel', fixture: [884, 666, 136, 136] },
    ];
    this.saluteCapacity = reduced ? 0 : tier === 'super' ? 96 : 48;
    this.capacity = reduced ? 0 : tier === 'super' ? 280 : 192;
    this.treasureCapacity = reduced ? 0 : tier === 'super' ? 20 : 12;
    this.sparkleCapacity = reduced ? 0 : tier === 'super' ? 20 : 12;
    this.burstCapacity = reduced ? 0 : tier === 'super' ? 6 : 4;
    this.counterDuration = tier === 'super' ? 6.4 : 4.6;
    this.waveTimes = tier === 'super' ? [.4, 1.16, 1.92, 2.68, 3.44, 4.2, 5.18, 6.18, 6.72] : [.42, 1.2, 1.98, 2.76, 3.54, 4.5];
    this.encoreTime = tier === 'super' ? 6.18 : Infinity;
    this.finaleTime = this.counterDelay + this.counterDuration;
    this.holdTime = this.finaleTime + 1.5;
    if (reduced) this.finish();
  }
  step(dt: number): void {
    if (!this.finished && Number.isFinite(dt) && dt > 0) this.elapsed += Math.min(dt, .25);
    const t = this.elapsed, entry = winEase((t - .26) / .68);
    this.phase = this.finished || t >= this.holdTime ? 'hold' : t >= this.finaleTime ? 'finale' : t >= this.encoreTime ? 'encore' : t >= 1.02 ? 'cascade' : t >= .26 ? 'reveal' : 'gather';
    this.titleAlpha = this.finished ? 255 : Math.round(255 * entry);
    this.titleOffset = this.finished ? 0 : -42 * (1 - entry) + .9 * Math.sin(Math.max(0, t - .94) * 1.7) * entry;
    // One large reveal, then a short final accent. Never bounce the whole cabinet.
    this.titleScale = this.finished ? 1 : .68 + .32 * entry + .09 * pulse(t, .53, .86) + .055 * pulse(t, this.finaleTime, .74);
    this.amountScale = this.finished ? 1 : 1 + .055 * pulse(t, this.finaleTime + .06, .8);
    this.amountAlpha = this.finished ? 255 : Math.round(255 * winEase((t - .62) / .38));
    this.reelFactor = this.finished ? 1 : 1 - .72 * winEase(t / .58);
    const lightEnvelope = winEase((t - .1) / .58);
    let wavePower = 0;
    for (const at of this.waveTimes) wavePower = Math.max(wavePower, pulse(t, at, .72));
    const finale = pulse(t, this.finaleTime - .08, 1.1);
    const peak = (this.tier === 'super' ? 170 : 150) + 52 * wavePower + 32 * finale;
    const settle = winEase((t - this.holdTime) / .9);
    this.rayAlpha = this.finished ? 0 : Math.round(Math.min(252, lightEnvelope * ((1 - settle) * peak + settle * 62)));
    this.rayScale = this.finished ? 1 : .86 + .16 * lightEnvelope + .045 * wavePower + .09 * finale;
    this.rayAngle = this.finished ? 0 : Math.sin(t * .94 + this.room * .65) * 11;
    // A hollow generated aureole gathers light BEFORE the sculpture opens.
    // Never flash the whole screen white or shake the real cabinet/keeper.
    this.aureoleAlpha = this.finished ? 0 : Math.round(lightEnvelope * ((1 - settle) * (98 + 70 * wavePower + 40 * finale) + settle * 58));
    this.aureoleScale = this.finished ? 1 : .78 + .22 * lightEnvelope + .012 * wavePower + .014 * finale;
    this.aureoleAngle = this.finished ? 0 : Math.sin(t * .7 + this.room * .4) * 2.4;
  }
  finish(): void { this.finished = true; this.step(0); }
  coin(index: number, out: WinCoinPose): void {
    out.alpha = 0;
    if (this.finished || index < 0 || index >= this.capacity) return;
    const mainCount = this.waveTimes.length * this.coinsPerWave;
    if (index >= mainCount) {
      // Finale rains THROUGH the reel stage behind its lettering, not a static
      // horizontal necklace. Independent height, drift and stagger make every
      // coin clearly separate; the existing count/control gate handles occlusion.
      const n = index - mainCount, age = this.elapsed - (this.finaleTime - .05 + n * .017);
      if (age <= 0 || age >= 1.85) return;
      out.x = 70 + (n * 137 % 884) + Math.sin(age * 1.7 + n) * 14;
      out.y = 470 + (n * 53 % 135) + 68 * age + 82 * age * age;
      out.size = 46 + n % 5 * 7;
      out.alpha = Math.round(242 * winEase(age / .15) * (1 - winEase((age - 1.32) / .63)));
      out.angle = n * 23 + age * 108;
      out.squeeze = .28 + .72 * Math.abs(Math.cos(age * 4 + n * .5));
      return;
    }
    const wave = Math.floor(index / this.coinsPerWave), within = index % this.coinsPerWave, side = index % 2 ? 1 : -1;
    // A wide ballistic fan opens from the lower reel sill, over the ORIGINAL
    // stopped symbols. The previous narrow socket-column effect is deliberately
    // gone: varied velocity and origin separate the gold across the whole stage.
    const age = this.elapsed - (this.waveTimes[wave] + within * .032);
    const pair = Math.floor(within / 2);
    const rise = 530 + ((pair * 7 + wave * 3) % 5) * 31;
    const gravity = 580 + pair % 3 * 16;
    const life = (rise + Math.sqrt(rise * rise + 2 * gravity * 28)) / gravity + .12;
    if (age <= 0 || age >= life) return;
    const socket = 122 + pair % 4 * 16;
    // A lateral fan puts the apex OUTSIDE the opaque headline. The old
    // near-vertical centre fountain was mostly hidden behind the lettering.
    const spread = 166 + pair % 6 * 22;
    out.x = 512 + side * (socket + spread * Math.sin(Math.min(1, age / 1.82) * Math.PI / 2));
    out.y = 844 - rise * age + .5 * gravity * age * age;
    out.size = 46 + index % 6 * 7;
    out.alpha = Math.round(250 * winEase(age / .15) * (1 - winEase((age - life + .46) / .46)));
    out.angle = side * (index * 19 + this.room * 29 + age * (115 + index % 3 * 23));
    out.squeeze = .28 + .72 * Math.abs(Math.cos(age * 4.6 + index * .71));
  }

  /** Rigid, individually staged treasure pieces follow an eased curved rise
   * from the lower reel sill. They are NOT duplicate keeper cutouts. The
   * SUPER encore re-opens a visible lateral fan while the number completes. */
  hero(index: number, out: WinOrnamentPose): void {
    out.alpha = 0;
    const item = this.heroFixtures[index];
    if (!item || this.finished) return;
    const f = item.fixture, t = this.elapsed;
    // The lower SUPER treasury opens only in its second act: two large
    // ingots fan out from the central sill at the encore, not seven static
    // decorations appearing together at the start.
    const start = this.tier === 'super' && index >= 5 ? this.encoreTime + (index - 5) * .1
      : .18 + (index === 0 ? 0 : Math.ceil(index / 2) * .14);
    const travel = winEase((t - start) / 1.24);
    const side = f[0] < 512 ? -1 : f[0] > 512 ? 1 : 0;
    const encore = this.tier === 'super' && index < 5 ? pulse(t, this.encoreTime + index * .06, 1.28) : 0;
    const settle = 1 - winEase((t - this.holdTime) / .8);
    const arc = Math.sin(travel * Math.PI);
    out.x = 512 + (f[0] - 512) * travel + side * (30 * arc + 18 * encore);
    out.y = 844 + (f[1] - 844) * travel - 36 * arc - 14 * encore
      + Math.sin(t * 1.8 + index * .83) * 4 * travel * settle;
    const size = .54 + .46 * travel + .08 * encore;
    out.scaleX = size; out.scaleY = size;
    out.angle = side * (22 * (1 - travel) + Math.sin(t * 1.6 + index) * 3 * settle + 6 * encore);
    out.alpha = Math.round(255 * winEase((t - start) / .25));
  }
  /** Real flying firework fragments, not a scaled firework photograph. Each
   * fixed bank owns twelve radial trajectories. SUPER adds two additional
   * gold salutes around its coronation; no recurring loop after the hold. */
  salute(index: number, out: WinCoinPose): void {
    out.alpha = 0;
    if (this.finished || index < 0 || index >= this.saluteCapacity || this.elapsed >= this.holdTime) return;
    const bank = Math.floor(index / 12), spoke = index % 12;
    const passStarts = this.tier === 'super' ? [.82, 2.3, 3.88, 5.28, 6.48, 7.48] : [.82, 2.3, 3.88, 5.36];
    // Fixed looping banks reuse nodes, with invisible gaps between salutes.
    let age = -1;
    for (const at of passStarts) {
      const candidate = this.elapsed - at - bank * .038;
      if (candidate > 0 && candidate < 1.16) age = candidate;
    }
    if (age <= 0) return;
    const side = bank % 2 ? 1 : -1;
    const column = Math.floor(bank / 2) % 2;
    const x = side < 0 ? 140 + column * 46 : 884 - column * 46;
    const y = column ? 765 : 559;
    const angle = spoke * Math.PI / 6 + bank * .19 + this.room * .12;
    const distance = 15 + (78 + spoke % 3 * 14) * (1 - Math.exp(-age * 3.1));
    out.x = x + Math.cos(angle) * distance;
    out.y = y + Math.sin(angle) * distance + 22 * age * age;
    out.size = 22 + spoke % 3 * 6;
    out.squeeze = .44 + .56 * (1 - age / 1.16);
    out.angle = -angle * 180 / Math.PI - 90;
    out.alpha = Math.round(255 * winEase(age / .09) * (1 - winEase((age - .3) / .86))
      * protectionOpacity(CABINET_WIN_CLEARANCE, out.x, out.y, out.size * .6, out.size * .6, 16)
      * protectionOpacity(CABINET_WIN_COPY, out.x, out.y, out.size * .45, out.size * .45, 8));
  }

  /** Precious ingots and room-specific jewels spiral around, never through,
   * the opaque title/amount. Two/three passes, finite at the quiet hold. */
  treasure(index: number, out: WinCoinPose): void {
    out.alpha = 0;
    if (this.finished || index < 0 || index >= this.treasureCapacity) return;
    const start = .8 + index * .11, cycle = 2.68;
    const pass = Math.floor((this.elapsed - start) / cycle);
    if (pass < 0 || pass >= (this.tier === 'super' ? 3 : 2)) return;
    const age = this.elapsed - start - pass * cycle;
    if (age <= 0 || age >= 2.38 || this.elapsed >= this.holdTime) return;
    const angle = index * 2.399 + this.room * .31 + age * (index % 2 ? -.92 : .92);
    out.x = 512 + (344 + index % 3 * 8) * Math.cos(angle);
    out.y = 666 + (176 + index % 3 * 4) * Math.sin(angle);
    out.size = 34 + index % 4 * 8;
    out.squeeze = 1;
    out.angle = (index % 2 ? -1 : 1) * (age * 26 + index * 13);
    out.alpha = Math.round(250 * winEase(age / .24) * (1 - winEase((age - 1.93) / .45))
      * (1 - winEase((this.elapsed - this.holdTime + .5) / .5))
      * protectionOpacity(CABINET_WIN_COPY, out.x, out.y, out.size * .54, out.size * .54, 14));
  }
  /** New CC Switch sparkle plumes actually rise from the treasury, reaching
   * a peak with EACH count wave, then fading before the next launch. */
  jet(index: number, out: WinOrnamentPose): void {
    const f = CABINET_WIN_JETS[index];
    out.alpha = 0; out.x = f[0]; out.y = f[1]; out.angle = 0;
    out.scaleX = 1; out.scaleY = 1;
    if (this.finished || this.reduced || this.elapsed >= this.holdTime) return;
    let power = 0, flow = 0;
    for (let wave = 0; wave <= this.waveTimes.length; wave++) {
      const launch = wave === this.waveTimes.length ? this.finaleTime : this.waveTimes[wave];
      const age = this.elapsed - launch - index * .045;
      if (age <= 0 || age >= 1.06) continue;
      const envelope = winEase(age / .2) * (1 - winEase((age - .56) / .5));
      if (envelope > power) { power = envelope; flow = winEase(age / .56); }
    }
    out.alpha = Math.round(power * (this.tier === 'super' ? 228 : 210));
    // Rigid uniform scale: never squash the coins embedded in the plume.
    out.scaleX = (index ? -1 : 1) * (.93 + .07 * flow);
    out.scaleY = .93 + .07 * flow;
    out.y = 860 - f[3] * out.scaleY / 2 - 18 * flow;
  }
  streamer(index: number, out: WinOrnamentPose): void {
    const f = CABINET_WIN_STREAMERS[index], t = this.elapsed;
    out.alpha = 0; out.x = f[0]; out.y = f[1]; out.angle = 0; out.scaleX = 1; out.scaleY = 1;
    if (this.finished || this.reduced) return;
    const entry = winEase((t - .38 - index * .18) / .64);
    const crest = pulse(t, this.finaleTime - .12, 1.1);
    const end = 1 - winEase((t - this.holdTime + .28) / .5);
    out.alpha = Math.round(222 * entry * end);
    out.scaleX = .42 + .58 * entry + .03 * crest;
    out.scaleY = .78 + .22 * entry;
    out.y += Math.sin(t * 2.1 + index * 2) * 3 * entry;
    out.angle = Math.sin(t * 1.45 + index * 2) * 1.8 * entry;
  }

  ornament(index: number, out: WinOrnamentPose): void {
    const f = CABINET_WIN_ORNAMENTS[index], t = this.elapsed;
    const entry = this.finished ? 1 : winEase((t - (index === 0 ? .34 : index === 1 ? .82 : .18)) / (index === 0 ? .78 : .72));
    const crest = this.finished || this.reduced ? 0 : pulse(t, this.finaleTime - .02, .9);
    const idle = this.finished || this.reduced ? 0 : Math.sin(t * 1.9 + index * .8) * entry;
    out.alpha = Math.round(255 * entry); out.x = f[0]; out.y = f[1];
    const grandeur = this.tier === 'super' ? 1 : .94;
    out.scaleX = grandeur * (index > 1 ? .72 + .28 * entry : .88 + .12 * entry) + .014 * crest;
    out.scaleY = grandeur * (.96 + .04 * entry) + .014 * crest;
    out.angle = this.finished || this.reduced ? 0 : index < 2 ? .45 * idle : (index === 2 ? -1 : 1) * (9 * (1 - entry) + .65 * idle);
    if (index === 0) out.y -= 48 * (1 - entry) + idle * .65;
    else if (index === 1) out.y += 38 * (1 - entry) + idle * .6;
    else out.x += (index === 2 ? 1 : -1) * (68 * (1 - entry) - .7 * idle);
  }
  /** Each pooled sprite expands an actual generated filigree firework,
   * then dissipates before the next wave. There is only one image per burst,
   * never cross-faded duplicate silhouettes or an unbounded screen flash. */
  burst(index: number, out: WinBurstPose): void {
    out.alpha = 0;
    if (this.finished || index < 0 || index >= this.burstCapacity) return;
    const f = CABINET_WIN_BURSTS[index], first = .62 + index * .21;
    const interval = this.tier === 'super' ? 1.42 : 1.58;
    const pass = Math.floor((this.elapsed - first) / interval);
    if (pass < 0 || pass > (this.tier === 'super' ? 5 : 3)) return;
    const age = this.elapsed - first - pass * interval;
    if (age <= 0 || age >= 1.32 || this.elapsed >= this.holdTime) return;
    const opening = winEase(age / .34), ending = 1 - winEase((age - .67) / .65);
    const finishEnvelope = 1 - winEase((this.elapsed - this.holdTime + .5) / .5);
    out.x = f[0]; out.y = f[1];
    out.alpha = Math.round((this.tier === 'super' ? 236 : 216) * opening * ending * finishEnvelope);
    out.scale = .3 + .72 * winEase(age / 1.32);
    out.angle = (index % 2 ? 1 : -1) * (index * 9 + age * 12 + pass * 11);
  }
  light(index: number): number {
    if (this.finished) return 0;
    if (index >= CABINET_WIN_LIGHTS.length) {
      const n = index - CABINET_WIN_LIGHTS.length;
      return Math.round(240 * Math.max(pulse(this.elapsed, .58 + n * .09, .64),
        pulse(this.elapsed, this.finaleTime + n * .07, .76)));
    }
    const entry = winEase(this.elapsed / .28);
    const chase = pulse(this.elapsed, .06 + Math.floor(index / 2) * .07, .56);
    const crest = pulse(this.elapsed, this.finaleTime + Math.floor(index / 2) * .045, .76);
    const held = this.elapsed > this.holdTime ? .48 : 1;
    return Math.round(entry * Math.min(250, held * (118 + 93 * (.5 + .5 * Math.sin(this.elapsed * 3.4 - index * .72))) + chase * 95 + crest * 100));
  }
  sparkle(index: number, out: WinLightPose): void {
    out.alpha = 0;
    if (this.finished || index < 0 || index >= this.sparkleCapacity) return;
    const side = index % 2 ? 1 : -1, pair = Math.floor(index / 2);
    const cycle = Math.floor(Math.max(0, this.elapsed - .72 - pair * .19) / 2.48);
    const age = this.elapsed - (.72 + pair * .19 + cycle * 2.48);
    const power = pulse(age, 0, .88);
    if (!power) return;
    out.x = side < 0 ? 223 + pair % 5 * 46 : 801 - pair % 5 * 46;
    out.y = 493 + pair % 5 * 68 - Math.sin(age * 2) * 5;
    out.alpha = Math.round((this.elapsed > this.holdTime ? 150 : 246) * power);
    out.scale = .68 + .4 * power; out.angle = side * (14 + age * 18);
  }
}

/** Explicit QA only. The preview cannot reserve a round or mutate saved coins. */
export function cabinetWinPreview(search: string, stake: number): { tier: CabinetPrizeTier; amount: number; mode?: 0 | 1 | 2 | 3; reduced: boolean } | undefined {
  const query = new URLSearchParams(search), tier = query.get('win');
  if (query.get('debug') !== '1' || query.get('screen') !== 'game' || (tier !== 'big' && tier !== 'super')) return;
  const modeText = query.get('mode');
  const mode = modeText !== null && /^[0-3]$/.test(modeText) ? Number(modeText) as 0 | 1 | 2 | 3 : undefined;
  return { tier, amount: Math.max(1, Math.floor(stake)) * (tier === 'super' ? 12 : 3), mode, reduced: query.get('reduced') === '1' };
}
