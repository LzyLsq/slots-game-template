/* situation audio */
export function isBigWin(total:number,bet:number):boolean{return Number.isFinite(total)&&Number.isFinite(bet)&&bet>0&&total>bet;}
import {LocalCoinStore,deviceAccount} from './LocalCoinStore';
const LOCAL_PRODUCTS=[{"id":"purse","credits":10000,"bonus":0,"appleProductId":"com.publisher.treasureregatta.coins.purse.v1","label":"PURSE","debugPrice":"$0.99"},{"id":"bullion","credits":50000,"bonus":5000,"appleProductId":"com.publisher.treasureregatta.coins.bullion.v1","label":"BULLION","debugPrice":"$4.99"},{"id":"chest","credits":120000,"bonus":18000,"appleProductId":"com.publisher.treasureregatta.coins.chest.v1","label":"CHEST","debugPrice":"$9.99"},{"id":"vault","credits":300000,"bonus":60000,"appleProductId":"com.publisher.treasureregatta.coins.vault.v1","label":"VAULT","debugPrice":"$19.99"}];
import { SceneMusic } from './SceneMusic';
import { ThemeMotion } from './vfx/ThemeMotion';
import { ThemeFestivity } from './vfx/ThemeFestivity';
import { _decorator, Component, Node, Canvas, Camera, UITransform, Layers, view, ResolutionPolicy, resources,
  SpriteFrame, Texture2D, Rect, Color, Label, Graphics, UIOpacity, tween, Tween, Vec3, sys, game, Game, EditBox, Sprite, AudioClip, AudioSource, EffectAsset, JsonAsset, BlockInputEvents } from 'cc';
import { MODES, modeRules } from './core/Modes';
import { BETS, type ModeId, type Round, type Stage } from './core/Model';
import { platformRandom } from './game/PlatformRandom';
import { Wallet } from './core/Wallet';
import { Session } from './core/Session';
import { ReelView } from './game/ReelView';
import { node, image, text, button, buttonState, panel, outlined, fadeIn, INK, configureControlLustre, tickButtonLustre } from './ui/Surface';
import type { ControlFace } from './ui/Surface';
import { readablePages } from './ui/Pages';
import { CONSOLE_ROLES, consoleFace, type ConsoleRole } from './ui/ConsoleStyle';
import { harborFace, type HarborControlRole } from './ui/HarborStyle';

const { ccclass } = _decorator;
type Page = 'login' | 'home' | 'game' | 'rank' | 'rewards' | 'shop' | 'profile';
const IDS: ModeId[] = ['captain', 'pearl', 'cargo', 'reef'];
const CONTROL_IDS = ['ticket', 'chest', 'podium', 'market', 'passport', 'back', 'log', 'switch', 'seal', 'cancel', 'wager', 'next'];
const KEY = 'f28.regatta.wallet.v1';
const GOLD = new Color(255, 226, 144);
const SCENES: Record<ModeId, { aperture: [number, number, number, number]; console: number }> = {
  captain: { aperture: [.158, .326, .684, .208], console: .641 },
  pearl: { aperture: [.235, .358, .526, .174], console: .613 },
  cargo: { aperture: [.186, .350, .630, .165], console: .610 },
  reef: { aperture: [.191, .286, .615, .282], console: .670 },
};
type ControlPlacement = { x: number; y: number; w: number; h: number };
type ConsoleLayout = {
  spin: ControlPlacement;
  betMinus: ControlPlacement;
  betPlus: ControlPlacement;
  auto: ControlPlacement;
  turbo: ControlPlacement;
  betReadoutY: number;
  headerSize: [number, number];
};
type LoadingMilestone = { n: Node; opacity: UIOpacity; threshold: number; lit: boolean; activatedAt: number };
type LoadingSpark = { n: Node; opacity: UIOpacity; x: number; y: number; phase: number };
type LoadingRing = { n: Node; opacity: UIOpacity; speed: number; phase: number };
type LoadingView = {
  root: Node;
  background: Node;
  title: Node;
  instrument: Node;
  instrumentOpacity: UIOpacity;
  instrumentGlowOpacity: UIOpacity;
  compass: Node;
  needle: Node;
  compassRings: LoadingRing[];
  route: Graphics;
  routeAura: Node;
  routeAuraOpacity: UIOpacity;
  routeDot: Node;
  convoyGlow: Node;
  convoyGlowOpacity: UIOpacity;
  chartSweep: Node;
  chartSweepOpacity: UIOpacity;
  status: Label;
  percent: Label;
  milestones: LoadingMilestone[];
  sparks: LoadingSpark[];
  progress: number;
  target: number;
  displayedPercent: number;
  complete: boolean;
  failed: boolean;
};
/** Distinct physical consoles; positions are local to each 1024 x 2048 cabinet scene. */
const CONSOLE_LAYOUTS: Record<ModeId, Omit<ConsoleLayout, 'betReadoutY'> & { betReadoutOffset: number }> = {
  captain: {
    spin: {x:0,y:0,w:418,h:209}, betMinus:{x:-335,y:0,w:160,h:96}, betPlus:{x:335,y:0,w:160,h:96},
    auto:{x:-286,y:-154,w:264,h:132}, turbo:{x:286,y:-154,w:264,h:132}, betReadoutOffset:-154, headerSize:[190,103],
  },
  pearl: {
    spin: {x:0,y:0,w:258,h:224}, betMinus:{x:-337,y:0,w:142,h:136}, betPlus:{x:337,y:0,w:142,h:136},
    auto:{x:-286,y:-158,w:280,h:124}, turbo:{x:304,y:-158,w:154,h:168}, betReadoutOffset:-158, headerSize:[148,122],
  },
  cargo: {
    spin: {x:0,y:0,w:270,h:238}, betMinus:{x:-340,y:0,w:146,h:138}, betPlus:{x:340,y:0,w:146,h:138},
    auto:{x:-292,y:-160,w:292,h:116}, turbo:{x:303,y:-158,w:174,h:174}, betReadoutOffset:-160, headerSize:[150,122],
  },
  reef: {
    spin: {x:0,y:0,w:272,h:242}, betMinus:{x:-340,y:0,w:140,h:150}, betPlus:{x:340,y:0,w:140,h:150},
    auto:{x:-294,y:-162,w:294,h:112}, turbo:{x:304,y:-157,w:158,h:180}, betReadoutOffset:-162, headerSize:[152,124],
  },
};
const TAGLINES = ['The captain’s lucky line', 'A sea of 243 winning ways', 'Lock coins. Fill your cargo.', 'Discover cascading treasures'];

@ccclass('RegattaApp')
export class RegattaApp extends Component {
  private frames = new Map<string, SpriteFrame>();
  private symbols = new Map<ModeId, SpriteFrame[]>();
  private clips = new Map<string, AudioClip>();
  private audio!: AudioSource;
  private music!: AudioSource;
  private webMusic?: SceneMusic;
  private audioUnlocked = false;
  private localIAP=new LocalCoinStore(LOCAL_PRODUCTS,LOCAL_PRODUCTS,()=>deviceAccount(sys.localStorage,'f28','guest'),(id,amount)=>this.wallet.grantPurchase(id,amount));
  private wallet!: Wallet;
  private session!: Session;
  private page: Page = 'login';
  private mode: ModeId = 'captain';
  private content!: Node;
  private modal: Node | null = null;
  private width = 1080;
  private height = 1920;
  private safeTop = 0;
  private safeBottom = 0;
  private scene: Node | null = null;
  private reels: ReelView | null = null;
  private balanceLabel: Label | null = null;
  private betLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private spinLabel: Label | null = null;
  private autoLabel: Label | null = null;
  private turboLabel: Label | null = null;
  private betIndex = 0;
  private turbo = false;
  private round: Round | null = null;
  private roundId = 0;
  private stageIndex = 0;
  private reviewStageIndex = 0;
  private stageTime = 0;
  private presenting = false;
  private awardShown = 0;
  private grandShown = false;
  private grandStage: Node | null = null;
  private grandAmount: Label | null = null;
  private grandTime = 0;
  private autoVoyage = false;
  private grandFx: { n: Node; opacity: UIOpacity; x: number; y: number; phase: number; ring: boolean }[] = [];
  private counterStart = 0;
  private transitioning = false;
  private coinPool: Node[] = [];
  private winPanel: Node | null = null;
  private winTitleLabel: Label | null = null;
  private winAmountLabel: Label | null = null;
  private winDetailLabel: Label | null = null;
  private rewardRings: { n: Node; opacity: UIOpacity }[] = [];
  private rewardSparkles: { n: Node; opacity: UIOpacity }[] = [];
  private ambience: { n: Node; x: number; y: number; phase: number; base: number }[] = [];
  private clock = 0;
  private reduced = false;
  private hidden = false;
  private ready = false;
  private loading = false;
  private uiLocked = false;
  private captainName = 'Captain';
  private resizePending = false;
  private controls: {n: Node; enabled: () => boolean}[] = [];
  private titleMotion: Node | null = null;
  private harborBackground: Node | null = null;
  private harborEntries: { n: Node; x: number; y: number; phase: number; readyAt: number }[] = [];
  private harborGlints: { n: Node; opacity: UIOpacity; x: number; y: number; phase: number; range: number }[] = [];
  private harborAccents: { n: Node; opacity: UIOpacity; x: number; y: number; phase: number; kind: 'wake' | 'lantern' | 'tide' | 'treasure' | 'current' | 'sunpath' }[] = [];
  private modeTransition: Node | null = null;
  private cabinetFx: { n: Node; opacity: UIOpacity; x: number; y: number; phase: number; range: number; kind: 'rim' | 'sweep' | 'spark' | 'beacon' }[] = [];
  private loadingView: LoadingView | null = null;
  private loadingDestination: Page = 'login';

  onLoad(): void {
    view.setDesignResolutionSize(1080, 1920, ResolutionPolicy.FIXED_WIDTH);
    const cn = node(this.node, 'UI camera'); cn.setPosition(0, 0, 1000);
    const camera = cn.addComponent(Camera); camera.projection = Camera.ProjectionType.ORTHO;
    camera.visibility = Layers.Enum.UI_2D; camera.clearColor = new Color(29, 136, 154); camera.near = 0; camera.far = 2000;
    this.node.addComponent(UITransform); const canvas = this.node.addComponent(Canvas); canvas.cameraComponent = camera;
    this.audio = this.node.addComponent(AudioSource);
    this.music = node(this.node, 'Marina music').addComponent(AudioSource);
    this.music.loop = true; this.music.volume = .15;
    if (typeof window !== 'undefined' && typeof window.Audio === 'function') {
      this.webMusic = this.node.addComponent(SceneMusic);this.webMusic.setEffects(false);this.webMusic.setMusic(false);
    }
    this.reduced = this.savedReducedMotion();
    this.measure(); this.content = node(this.node, 'Loading');
    game.on(Game.EVENT_HIDE, this.onHide, this); game.on(Game.EVENT_SHOW, this.onShow, this);
    view.on('canvas-resize', this.onResize, this);
    void this.boot();
  }
  private savedReducedMotion(): boolean {
    try {
      const raw = sys.localStorage.getItem(KEY);
      if (raw) {
        const settings = (JSON.parse(raw) as { settings?: { reducedMotion?: unknown } }).settings;
        if (typeof settings?.reducedMotion === 'boolean') return settings.reducedMotion;
      }
    } catch { /* Wallet recovery will surface malformed persistence with context. */ }
    return !sys.isNative && typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  private measure(): void {
    const size = view.getVisibleSize(); this.width = size.width; this.height = size.height;
    const safe = sys.getSafeAreaRect(false);
    this.safeTop = Math.max(0, size.height - safe.y - safe.height);
    this.safeBottom = Math.max(0, safe.y);
    // Native safe rectangles already use UI units; browser env() values use CSS pixels.
    if (!sys.isNative && typeof document !== 'undefined' && document.body) {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
      document.body.appendChild(probe);
      const css = getComputedStyle(probe), units = size.height / Math.max(1, window.innerHeight);
      this.safeTop = Math.max(this.safeTop, (parseFloat(css.paddingTop) || 0) * units);
      this.safeBottom = Math.max(this.safeBottom, (parseFloat(css.paddingBottom) || 0) * units);
      probe.remove();
    }
    this.node.getComponent(UITransform)!.setContentSize(size);
    this.node.setPosition(size.width / 2, size.height / 2);
  }
  private async boot(): Promise<void> {
    if (this.loading) return;
    this.loading = true; this.ready = false; this.uiLocked = false; this.loadingView = null;
    this.content.destroyAllChildren();
    const primer = this.buildLoadingPrimer();
    const coreKeys = ['marina', 'title', 'plaque', 'coin'];
    const artKeys = ['club', 'harbor-controls', ...IDS.map(m => `${m}-scene`), ...IDS.map(m => `${m}-console`)];
    const audioKeys = (this.webMusic ? [] : ['press','launch','stop','win','collect','marina']);
    const total = 1 + coreKeys.length + artKeys.length + 1 + IDS.length + audioKeys.length + 1;
    let count = 0;
    const report = () => {
      count++;
      if (this.loadingView) this.loadingView.target = Math.max(this.loadingView.target, count / total);
    };
    try {
      await ThemeMotion.prepare();
      configureControlLustre(await new Promise<EffectAsset>((resolve, reject) => resources.load('effects/control-lustre', EffectAsset, (e, effect) => e ? reject(e) : resolve(effect))));
      report();
      for (const key of coreKeys) {
        if (!this.frames.has(key)) this.frames.set(key, await this.loadFrame(key));
        report();
      }
      if (primer.isValid) primer.destroy();
      this.loadingView = this.buildLoadingView(count / total);
      this.dismissWebBootSplash();
      for (const key of artKeys) {
        if (!this.frames.has(key)) this.frames.set(key, await this.loadFrame(key));
        report();
      }
      const consoleAtlas = await new Promise<JsonAsset>((resolve, reject) => resources.load('art/console-frames', JsonAsset, (e, a) => e ? reject(e) : resolve(a)));
      const atlasRects = consoleAtlas.json as Record<ModeId, Record<ConsoleRole, {rect: [number,number,number,number]; left: number; right: number}>>;
      for (const mode of IDS) for (const role of CONSOLE_ROLES) {
        const spec = atlasRects[mode][role];
        const frame = new SpriteFrame(); frame.texture = this.f(`${mode}-console`).texture;
        frame.rect = new Rect(...spec.rect);
        frame.insetLeft = spec.left; frame.insetRight = spec.right;
        this.frames.set(`console-${mode}-${role}`, frame);
      }
      report();
      CONTROL_IDS.forEach((id, i) => {
        const frame = new SpriteFrame(); frame.texture = this.f('harbor-controls').texture;
        frame.rect = new Rect(i % 3 * 512, Math.floor(i / 3) * 256, 512, 256);
        // Only the blank enamel center stretches; clasp and outer bevel retain their proportions.
        frame.insetLeft = 205; frame.insetRight = 70; frame.insetTop = 0; frame.insetBottom = 0;
        this.frames.set(`control-${id}`, frame);
      });
      for (const id of IDS) {
        const texture = await new Promise<Texture2D>((resolve, reject) => resources.load(`art/${id}-symbols/texture`, Texture2D, (e, t) => e ? reject(e) : resolve(t)));
        const frames: SpriteFrame[] = [];
        for (let i = 0; i < 6; i++) { const frame = new SpriteFrame(); frame.texture = texture; frame.rect = new Rect(i % 3 * 384, Math.floor(i / 3) * 384, 384, 384); frames.push(frame); }
        this.symbols.set(id, frames);
        report();
      }
      for (const key of audioKeys) {
        const clip = await new Promise<AudioClip>((resolve, reject) => resources.load(`audio/${key}`, AudioClip, (e, a) => e ? reject(e) : resolve(a)));
        this.clips.set(key, clip);
        report();
      }
      this.wallet = new Wallet({ read: () => sys.localStorage.getItem(KEY), write: v => sys.localStorage.setItem(KEY, v) });
      this.wallet.recover(); this.session = new Session(this.wallet, platformRandom());
      this.reduced = this.wallet.snapshot().settings.reducedMotion;
      if (!this.webMusic) this.music.clip = this.clips.get('marina')!;
      this.captainName = sys.localStorage.getItem('f28.regatta.name') || 'Captain';
      const query = typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined' ? new URLSearchParams(location.search) : null;
      const requested = query?.get('screen'); const mode = query?.get('game');
      if (mode && IDS.includes(mode as ModeId)) this.mode = mode as ModeId;
      this.loadingDestination = query?.get('debug') === '1' && ['home','game','rank','rewards','shop','profile'].includes(requested || '') ? requested as Page : sys.localStorage.getItem('f28.regatta.guest') ? 'home' : 'login';
      report();
      this.completeLoading();
    } catch (e) {
      this.loading = false;
      this.dismissWebBootSplash();
      this.failLoading(e, primer);
    }
  }
  /** Covers the engine's default black/Cocos splash until our painted loading scene has rendered. */
  private dismissWebBootSplash(): void {
    if (sys.isNative) return;
    // A newly-created Cocos scene is committed on the following render ticks.
    // Keep the painted HTML harbor in front long enough for the brass departure
    // instrument to exist underneath it; otherwise slower phones can expose a
    // single empty-harbor frame between the two loading stages.
    this.scheduleOnce(() => {
      const host = globalThis as typeof globalThis & { __f28BootReady?: () => void };
      host.__f28BootReady?.();
    }, .20);
  }
  private buildLoadingPrimer(): Node {
    const root = node(this.content, 'Harbor prelude', 0, 0, this.width, this.height);
    const g = node(root, 'Painted water', 0, 0, this.width, this.height).addComponent(Graphics);
    g.fillColor = new Color(7, 47, 67); g.rect(-this.width / 2, -this.height / 2, this.width, this.height); g.fill();
    g.fillColor = new Color(20, 117, 126, 220); g.rect(-this.width / 2, -this.height * .18, this.width, this.height * .68); g.fill();
    g.fillColor = new Color(52, 158, 155, 118); g.rect(-this.width / 2, -this.height * .44, this.width, this.height * .30); g.fill();
    g.fillColor = new Color(255, 207, 91, 34); g.circle(0, this.height * .18, Math.min(this.width, this.height) * .28); g.fill();
    for (let i = 0; i < 17; i++) {
      const y = -this.height * .42 + i * this.height * .072;
      g.lineWidth = 4 + i % 4 * 2;
      g.strokeColor = i % 3 === 0 ? new Color(255, 228, 145, 36 + i * 3) : new Color(92 + i * 3, 225, 211, 28 + i * 4);
      g.moveTo(-this.width * .56, y);
      g.bezierCurveTo(-this.width * .25, y + 22 + i % 3 * 8, this.width * .18, y - 20 - i % 2 * 7, this.width * .56, y + 9); g.stroke();
    }
    const beacon = node(root, 'First harbor light', 0, 80, 150, 150); const bg = beacon.addComponent(Graphics);
    bg.fillColor = new Color(255, 209, 79, 22); bg.circle(0, 0, 72); bg.fill();
    bg.lineWidth = 5; bg.strokeColor = new Color(255, 224, 137, 210); bg.circle(0, 0, 54); bg.stroke();
    bg.lineWidth = 2; bg.strokeColor = new Color(255, 245, 205, 130); bg.circle(0, 0, 70); bg.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; bg.moveTo(Math.cos(a) * 76, Math.sin(a) * 76); bg.lineTo(Math.cos(a) * 94, Math.sin(a) * 94); bg.stroke(); }
    text(root, 'CHARTING THE HARBOR', 0, -70, 760, 34, new Color(255, 239, 189), 64).enableWrapText = false;
    text(root, 'Treasure lights are waking', 0, -116, 760, 24, new Color(221, 251, 241), 46).enableWrapText = false;
    return root;
  }
  private buildLoadingView(initialProgress: number): LoadingView {
    this.content.destroyAllChildren();
    const root = node(this.content, 'Treasure Regatta departure', 0, 0, this.width, this.height);
    const background = this.background(root, 'marina'); background.setScale(1.045, 1.045, 1);
    const shade = node(root, 'Departure vignette', 0, 0, this.width, this.height).addComponent(Graphics);
    shade.fillColor = new Color(7, 37, 56, 82); shade.rect(-this.width / 2, this.height * .16, this.width, this.height * .34); shade.fill();
    shade.fillColor = new Color(5, 28, 42, 108); shade.rect(-this.width / 2, -this.height / 2, this.width, this.height * .35); shade.fill();
    const titleY = this.height / 2 - this.safeTop - 235;
    const titleFrame = this.f('title');
    const title = image(root, titleFrame, 0, titleY, 820, 820 * titleFrame.originalSize.height / titleFrame.originalSize.width, 'Treasure Regatta departure crest');
    const panelY = -42;
    const instrumentGlow = node(root, 'Golden departure instrument glow', 0, panelY + 4, 980, 700);
    const instrumentGlowArt = instrumentGlow.addComponent(Graphics);
    instrumentGlowArt.fillColor = new Color(255, 205, 68, 20); instrumentGlowArt.ellipse(-485, -322, 970, 644); instrumentGlowArt.fill();
    instrumentGlowArt.fillColor = new Color(90, 236, 215, 16); instrumentGlowArt.ellipse(-420, -280, 840, 560); instrumentGlowArt.fill();
    const instrumentGlowOpacity = instrumentGlow.addComponent(UIOpacity); instrumentGlowOpacity.opacity = 88;
    const chart = node(root, 'Golden departure instrument', 0, panelY, 940, 650);
    const instrumentOpacity = chart.addComponent(UIOpacity);
    const chartArt = chart.addComponent(Graphics);
    const outerPath = () => {
      chartArt.moveTo(-392, -280); chartArt.lineTo(-447, -230); chartArt.lineTo(-458, 170); chartArt.lineTo(-408, 244);
      chartArt.lineTo(-164, 274); chartArt.lineTo(-120, 312); chartArt.lineTo(120, 312); chartArt.lineTo(164, 274);
      chartArt.lineTo(408, 244); chartArt.lineTo(458, 170); chartArt.lineTo(447, -230); chartArt.lineTo(392, -280); chartArt.close();
    };
    const glassPath = () => {
      chartArt.moveTo(-368, -245); chartArt.lineTo(-414, -205); chartArt.lineTo(-422, 154); chartArt.lineTo(-380, 214);
      chartArt.lineTo(-142, 244); chartArt.lineTo(-98, 280); chartArt.lineTo(98, 280); chartArt.lineTo(142, 244);
      chartArt.lineTo(380, 214); chartArt.lineTo(422, 154); chartArt.lineTo(414, -205); chartArt.lineTo(368, -245); chartArt.close();
    };
    // A carved captain's instrument rather than a floating UI card: walnut body,
    // brass edging and inset sea glass all share the harbor's warm upper-left light.
    chartArt.fillColor = new Color(32, 24, 20, 150); outerPath(); chartArt.fill();
    chartArt.lineWidth = 18; chartArt.strokeColor = new Color(50, 30, 16, 235); outerPath(); chartArt.stroke();
    chartArt.lineWidth = 10; chartArt.strokeColor = new Color(193, 123, 37, 245); outerPath(); chartArt.stroke();
    chartArt.lineWidth = 3; chartArt.strokeColor = new Color(255, 236, 165, 238); outerPath(); chartArt.stroke();
    chartArt.fillColor = new Color(7, 59, 72, 232); glassPath(); chartArt.fill();
    chartArt.lineWidth = 7; chartArt.strokeColor = new Color(101, 60, 27, 244); glassPath(); chartArt.stroke();
    chartArt.lineWidth = 3; chartArt.strokeColor = new Color(255, 213, 104, 220); glassPath(); chartArt.stroke();
    chartArt.lineWidth = 2; chartArt.strokeColor = new Color(187, 244, 228, 62);
    for (let i = 0; i < 6; i++) { const y = -190 + i * 72; chartArt.moveTo(-372, y); chartArt.bezierCurveTo(-190, y + 27, 174, y - 25, 372, y + 8); chartArt.stroke(); }
    chartArt.lineWidth = 2; chartArt.strokeColor = new Color(255, 229, 145, 80);
    chartArt.arc(-318, 108, 68, Math.PI * .12, Math.PI * 1.02, false); chartArt.stroke();
    chartArt.arc(322, -80, 54, Math.PI * .92, Math.PI * 1.82, false); chartArt.stroke();
    const chartSweep = node(chart, 'Charted sunlight', -350, -4, 118, 520); const chartSweepArt = chartSweep.addComponent(Graphics);
    chartSweepArt.fillColor = new Color(255, 239, 170, 76);
    chartSweepArt.moveTo(-56, -252); chartSweepArt.lineTo(-8, -252); chartSweepArt.lineTo(56, 252); chartSweepArt.lineTo(8, 252); chartSweepArt.close(); chartSweepArt.fill();
    const chartSweepOpacity = chartSweep.addComponent(UIOpacity); chartSweepOpacity.opacity = 0;
    [[-407,198],[407,198],[-407,-205],[407,-205]].forEach(([x,y], i) => {
      const clasp = node(chart, `Brass instrument clasp ${i + 1}`, x!, y!, 74, 74); const claspArt = clasp.addComponent(Graphics);
      claspArt.fillColor = new Color(91, 53, 23, 245); claspArt.circle(0, 0, 31); claspArt.fill();
      claspArt.lineWidth = 5; claspArt.strokeColor = new Color(255, 211, 100, 235); claspArt.circle(0, 0, 28); claspArt.stroke();
      claspArt.fillColor = new Color(255, 239, 174, 224); claspArt.circle(-6, 7, 7); claspArt.fill();
    });
    image(chart, this.f('coin'), -386, 232, 66, 66, 'Chart seal');
    image(chart, this.f('coin'), 386, -224, 66, 66, 'Chart seal');
    const departurePlate = node(chart, 'Departure engraved plate', 0, 247, 570, 72); const plateArt = departurePlate.addComponent(Graphics);
    plateArt.fillColor = new Color(77, 47, 24, 236); plateArt.roundRect(-282, -34, 564, 68, 22); plateArt.fill();
    plateArt.lineWidth = 4; plateArt.strokeColor = new Color(242, 188, 71, 238); plateArt.roundRect(-282, -34, 564, 68, 22); plateArt.stroke();
    plateArt.lineWidth = 1; plateArt.strokeColor = new Color(255, 245, 196, 210); plateArt.roundRect(-270, -24, 540, 48, 16); plateArt.stroke();
    text(departurePlate, 'THE GOLDEN DEPARTURE', 0, 1, 510, 30, new Color(255, 237, 174), 44).enableWrapText = false;
    const compass = node(chart, 'Fortune compass', 0, 102, 224, 224); const cg = compass.addComponent(Graphics);
    cg.fillColor = new Color(6, 43, 59, 228); cg.circle(0, 0, 92); cg.fill();
    cg.lineWidth = 8; cg.strokeColor = new Color(233, 171, 50, 238); cg.circle(0, 0, 90); cg.stroke();
    cg.lineWidth = 3; cg.strokeColor = new Color(255, 239, 178, 220); cg.circle(0, 0, 72); cg.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cg.moveTo(Math.cos(a) * 66, Math.sin(a) * 66); cg.lineTo(Math.cos(a) * 84, Math.sin(a) * 84); cg.stroke(); }
    const compassRings: LoadingRing[] = [];
    [[108, 2, 8.5, 0], [118, 1, -5.6, 1.4]].forEach(([radius, width, speed, phase], index) => {
      const ring = node(compass, `Fortune bearing ring ${index + 1}`, 0, 0, radius! * 2 + 12, radius! * 2 + 12); const rg = ring.addComponent(Graphics);
      rg.lineWidth = width!; rg.strokeColor = index === 0 ? new Color(255, 222, 111, 150) : new Color(115, 238, 222, 112);
      rg.circle(0, 0, radius!); rg.stroke();
      const divisions = index === 0 ? 12 : 8;
      for (let i = 0; i < divisions; i++) {
        const a = i * Math.PI * 2 / divisions, inner = radius! - (index === 0 && i % 3 === 0 ? 12 : 6);
        rg.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); rg.lineTo(Math.cos(a) * radius!, Math.sin(a) * radius!); rg.stroke();
      }
      const opacity = ring.addComponent(UIOpacity); opacity.opacity = index === 0 ? 128 : 84;
      compassRings.push({n:ring, opacity, speed:speed!, phase:phase!});
    });
    const needle = node(compass, 'Compass needle', 0, 0, 130, 130); const ng = needle.addComponent(Graphics);
    ng.fillColor = new Color(255, 214, 82); ng.moveTo(0, 64); ng.lineTo(14, -8); ng.lineTo(0, -24); ng.lineTo(-14, -8); ng.close(); ng.fill();
    ng.fillColor = new Color(222, 73, 48); ng.moveTo(0, -64); ng.lineTo(14, 8); ng.lineTo(0, 24); ng.lineTo(-14, 8); ng.close(); ng.fill();
    image(compass, this.f('coin'), 0, 0, 58, 58, 'Compass coin');
    const routeAura = node(chart, 'Golden route aura', 0, -42, 700, 150); const routeAuraArt = routeAura.addComponent(Graphics);
    routeAuraArt.lineWidth = 22; routeAuraArt.strokeColor = new Color(255, 219, 100, 36); routeAuraArt.moveTo(this.loadingRouteX(0), this.loadingRouteY(0));
    for (let i = 1; i <= 30; i++) { const t = i / 30; routeAuraArt.lineTo(this.loadingRouteX(t), this.loadingRouteY(t)); } routeAuraArt.stroke();
    const routeAuraOpacity = routeAura.addComponent(UIOpacity); routeAuraOpacity.opacity = 72;
    const routeNode = node(chart, 'Golden route', 0, -42, 700, 150); const route = routeNode.addComponent(Graphics);
    const convoyGlow = node(routeNode, 'Treasure convoy glow', -300, 0, 96, 96); const convoyGlowArt = convoyGlow.addComponent(Graphics);
    convoyGlowArt.fillColor = new Color(255, 220, 92, 52); convoyGlowArt.circle(0, 0, 42); convoyGlowArt.fill();
    convoyGlowArt.fillColor = new Color(255, 245, 190, 62); convoyGlowArt.circle(0, 0, 24); convoyGlowArt.fill();
    const convoyGlowOpacity = convoyGlow.addComponent(UIOpacity); convoyGlowOpacity.opacity = 110;
    const routeDot = image(routeNode, this.f('coin'), -300, 0, 64, 64, 'Treasure convoy marker');
    const milestones: LoadingMilestone[] = [];
    const milestoneData: [number, string][] = [[.27, 'SUPPLIES'], [.57, 'CREW'], [.86, 'COURSE']];
    for (let i = 0; i < milestoneData.length; i++) {
      const [threshold, caption] = milestoneData[i]!;
      const x = this.loadingRouteX(threshold), y = this.loadingRouteY(threshold);
      const mark = node(routeNode, `${caption} ready`, x, y, 128, 116);
      const sealRing = node(mark, `${caption} seal ring`, 0, 14, 78, 78); const sealArt = sealRing.addComponent(Graphics);
      sealArt.lineWidth = 4; sealArt.strokeColor = new Color(255, 224, 116, 180); sealArt.circle(0, 0, 35); sealArt.stroke();
      image(mark, this.f('coin'), 0, 14, 58, 58, `${caption} treasure seal`);
      text(mark, caption, 0, -39, 126, 23, new Color(255, 244, 202), 32).enableWrapText = false;
      const opacity = mark.addComponent(UIOpacity); opacity.opacity = 62; mark.setScale(.82, .82, 1);
      milestones.push({n: mark, opacity, threshold, lit: false, activatedAt:-1});
    }
    const status = text(chart, 'Stocking the treasure hold', 0, -158, 720, 32, Color.WHITE, 48); status.enableWrapText = false;
    image(chart, this.f('plaque'), 0, -230, 540, 112, 'Departure progress plaque');
    const percent = text(chart, `${Math.round(initialProgress * 100)}% · PREPARING VOYAGE`, 0, -228, 470, 34, INK, 58); percent.enableWrapText = false;
    text(root, 'Virtual coins · No cash prizes', 0, -this.height / 2 + this.safeBottom + 54, 700, 25, new Color(255, 247, 218), 38).enableWrapText = false;
    const sparks: LoadingSpark[] = [];
    const sparkData: [number, number][] = [[-.36,.18], [.31,.21], [-.25,-.24], [.34,-.18], [-.08,.31], [.12,-.34]];
    sparkData.forEach(([px, py], i) => {
      const x = px * this.width, y = py * this.height;
      const spark = node(root, 'Departure glint', x, y, 38, 38); const sg = spark.addComponent(Graphics);
      sg.fillColor = new Color(255, 238, 163, 230); sg.ellipse(-2, -17, 4, 34); sg.fill(); sg.ellipse(-17, -2, 34, 4); sg.fill();
      const opacity = spark.addComponent(UIOpacity); opacity.opacity = 0;
      sparks.push({n:spark, opacity, x, y, phase:i * 1.53});
    });
    const view: LoadingView = {root, background, title, instrument:chart, instrumentOpacity, instrumentGlowOpacity, compass, needle, compassRings, route, routeAura, routeAuraOpacity,
      routeDot, convoyGlow, convoyGlowOpacity, chartSweep, chartSweepOpacity, status, percent, milestones, sparks,
      progress:initialProgress, target:initialProgress, displayedPercent:-1, complete:false, failed:false};
    this.drawLoadingRoute(view, initialProgress);
    if (!this.reduced) {
      // The web harbor veil fades after this scene is already painted. Keep the
      // instrument almost opaque so slow devices never reveal an empty harbor
      // between the two loading stages; motion, rather than a blank fade-in,
      // provides the handoff.
      const opacity = title.addComponent(UIOpacity); opacity.opacity = 242; title.setScale(.94, .94, 1);
      instrumentOpacity.opacity = 238; chart.setScale(.955, .955, 1);
      tween(opacity).to(.24, {opacity:255}, {easing:'sineOut'}).start();
      tween(title).to(.54, {scale:Vec3.ONE}, {easing:'backOut'}).start();
      tween(instrumentOpacity).to(.28, {opacity:255}, {easing:'sineOut'}).start();
      tween(chart).to(.5, {scale:Vec3.ONE}, {easing:'backOut'}).start();
    }
    return view;
  }
  private loadingRouteX(t: number): number { return -300 + Math.max(0, Math.min(1, t)) * 600; }
  private loadingRouteY(t: number): number { const p = Math.max(0, Math.min(1, t)); return Math.sin(p * Math.PI * 2) * 25 + Math.sin(p * Math.PI) * 16; }
  private drawLoadingRoute(view: LoadingView, progress: number): void {
    const g = view.route, steps = 30, p = Math.max(0, Math.min(1, progress)); g.clear();
    g.lineWidth = 8; g.strokeColor = new Color(113, 191, 184, 86); g.moveTo(this.loadingRouteX(0), this.loadingRouteY(0));
    for (let i = 1; i <= steps; i++) { const t = i / steps; g.lineTo(this.loadingRouteX(t), this.loadingRouteY(t)); } g.stroke();
    g.lineWidth = 5; g.strokeColor = new Color(255, 206, 77, 245); g.moveTo(this.loadingRouteX(0), this.loadingRouteY(0));
    const completeSteps = Math.floor(p * steps);
    for (let i = 1; i <= completeSteps; i++) { const t = i / steps; g.lineTo(this.loadingRouteX(t), this.loadingRouteY(t)); }
    if (p > 0 && completeSteps < steps) g.lineTo(this.loadingRouteX(p), this.loadingRouteY(p));
    g.stroke();
    for (let i = 0; i <= 12; i++) { const t = i / 12; g.fillColor = t <= p ? new Color(255, 239, 166, 238) : new Color(181, 230, 218, 76); g.circle(this.loadingRouteX(t), this.loadingRouteY(t), t <= p ? 4 : 3); g.fill(); }
  }
  private tickLoading(dt: number): void {
    const view = this.loadingView; if (!view || !view.root.isValid) return;
    const ease = 1 - Math.exp(-dt * 5.4); view.progress += (view.target - view.progress) * ease;
    if (view.complete && view.progress > .992) view.progress = 1;
    this.drawLoadingRoute(view, view.progress);
    const routeX = this.loadingRouteX(view.progress), routeY = this.loadingRouteY(view.progress);
    view.routeDot.setPosition(routeX, routeY); view.convoyGlow.setPosition(routeX, routeY);
    const percent = Math.round(view.progress * 100);
    if (percent !== view.displayedPercent && !view.failed) {
      view.displayedPercent = percent; view.percent.string = `${percent}% · ${percent >= 100 ? 'READY TO SAIL' : 'PREPARING VOYAGE'}`;
    }
    if (!view.failed) view.status.string = view.progress < .28 ? 'Stocking the treasure hold' : view.progress < .58 ? 'Lighting the harbor beacons' : view.progress < .88 ? 'Charting the lucky course' : view.progress < 1 ? 'Securing the golden route' : 'Course set · welcome aboard';
    for (const mark of view.milestones) {
      const lit = view.progress >= mark.threshold;
      if (lit !== mark.lit) {
        mark.lit = lit; mark.activatedAt = lit ? this.clock : -1; mark.opacity.opacity = lit ? 255 : 62;
        mark.n.setScale(lit ? 1.12 : .82, lit ? 1.12 : .82, 1);
      }
      if (!this.reduced && lit) {
        const age = Math.max(0, this.clock - mark.activatedAt);
        const arrival = age < .62 ? Math.sin(age / .62 * Math.PI) * Math.exp(-age * 2.2) * .14 : 0;
        const pulse = .5 + .5 * Math.sin(this.clock * 1.25 + mark.threshold * 9);
        const s = 1.01 + pulse * .038 + arrival; mark.n.setScale(s, s, 1);
      } else if (this.reduced && lit) mark.n.setScale(1, 1, 1);
    }
    if (this.reduced || view.complete) return;
    view.background.setPosition(Math.sin(this.clock * .12) * 8, Math.cos(this.clock * .10) * 5);
    const bgScale = 1.045 + Math.sin(this.clock * .15) * .004; view.background.setScale(bgScale, bgScale, 1);
    view.title.setPosition(0, this.height / 2 - this.safeTop - 235 + Math.sin(this.clock * .72) * 5);
    const titleScale = 1 + Math.sin(this.clock * .37) * .004; view.title.setScale(titleScale, titleScale, 1);
    const instrumentPulse = .5 + .5 * Math.sin(this.clock * .64);
    const instrumentScale = 1 + instrumentPulse * .0035; view.instrument.setScale(instrumentScale, instrumentScale, 1);
    view.instrumentGlowOpacity.opacity = Math.round(68 + instrumentPulse * 72);
    const compassPulse = 1 + Math.sin(this.clock * .83) * .012; view.compass.setScale(compassPulse, compassPulse, 1);
    for (const ring of view.compassRings) {
      ring.n.setRotationFromEuler(0, 0, this.clock * ring.speed + ring.phase * 18);
      ring.opacity.opacity = Math.round(72 + (.5 + .5 * Math.sin(this.clock * .72 + ring.phase)) * 96);
    }
    view.needle.setRotationFromEuler(0, 0, Math.sin(this.clock * .78) * 13);
    const convoyWave = .5 + .5 * Math.sin(this.clock * 2.2);
    const convoyScale = .90 + convoyWave * .17; view.routeDot.setScale(convoyScale, convoyScale, 1);
    view.routeDot.setRotationFromEuler(0, 0, Math.sin(this.clock * 1.18) * 4);
    view.convoyGlow.setScale(.82 + convoyWave * .34, .82 + convoyWave * .34, 1);
    view.convoyGlowOpacity.opacity = Math.round(66 + convoyWave * 92);
    view.routeAuraOpacity.opacity = Math.round(68 + (.5 + .5 * Math.sin(this.clock * .74)) * 92);
    const sweepCycle = (this.clock * .17) % 1;
    view.chartSweep.setPosition(-360 + sweepCycle * 720, -4);
    view.chartSweepOpacity.opacity = Math.round(Math.pow(Math.sin(sweepCycle * Math.PI), 3) * 92);
    for (const spark of view.sparks) {
      const flare = Math.pow(Math.max(0, Math.sin(this.clock * .84 + spark.phase)), 8);
      spark.n.setPosition(spark.x + Math.sin(this.clock * .21 + spark.phase) * 12, spark.y + Math.cos(this.clock * .27 + spark.phase) * 7);
      spark.n.setScale(.72 + flare * .74, .72 + flare * .74, 1); spark.opacity.opacity = Math.round(12 + flare * 225);
    }
  }
  private completeLoading(): void {
    const view = this.loadingView;
    this.ready = true;
    if (!view || this.reduced) { this.loading = false; this.loadingView = null; this.go(this.loadingDestination); return; }
    view.target = 1; view.progress = 1; view.complete = true; view.status.string = 'Course set · welcome aboard';
    view.percent.string = '100% · READY TO SAIL'; this.drawLoadingRoute(view, 1);
    tween(view.compass).to(.22, {scale:new Vec3(1.13,1.13,1)}, {easing:'backOut'}).to(.24, {scale:Vec3.ONE}, {easing:'sineOut'}).start();
    tween(view.instrument).to(.2, {scale:new Vec3(1.025,1.025,1)}, {easing:'backOut'}).to(.28, {scale:Vec3.ONE}, {easing:'sineOut'}).start();
    tween(view.instrumentGlowOpacity).to(.18, {opacity:215}, {easing:'sineOut'}).to(.3, {opacity:112}, {easing:'sineInOut'}).start();
    tween(view.title).by(.22, {position:new Vec3(0,12,0)}, {easing:'sineOut'}).start();
    tween(view.routeAuraOpacity).to(.18, {opacity:238}, {easing:'sineOut'}).to(.26, {opacity:132}, {easing:'sineInOut'}).start();
    tween(view.convoyGlow).to(.2, {scale:new Vec3(1.45,1.45,1)}, {easing:'backOut'}).to(.22, {scale:Vec3.ONE}, {easing:'sineOut'}).start();
    this.scheduleOnce(() => {
      if (!this.loading || !this.ready) return;
      this.loading = false; this.loadingView = null; this.go(this.loadingDestination);
    }, .52);
  }
  private failLoading(error: unknown, primer: Node): void {
    const message = error instanceof Error ? error.message : String(error);
    const retry = () => {
      if (this.loading) return;
      this.loadingView = null; void this.boot();
    };
    if (this.loadingView) {
      const view = this.loadingView; view.failed = true;
      view.status.string = 'Voyage preparation paused';
      view.percent.string = 'TAP TO TRY AGAIN';
      text(view.root, message, 0, -405, 780, 26, new Color(255, 239, 204), 82);
      view.root.on(Node.EventType.TOUCH_END, retry);
      return;
    }
    text(primer, 'VOYAGE PREPARATION PAUSED', 0, -80, 820, 38, new Color(255, 232, 166), 58);
    text(primer, `${message}\nTap to try again`, 0, -180, 820, 27, Color.WHITE, 128);
    primer.on(Node.EventType.TOUCH_END, retry);
  }
  private loadFrame(key: string): Promise<SpriteFrame> {
    return new Promise((resolve, reject) => resources.load(`art/${key}/texture`, Texture2D, (e, texture) => {
      if (e) { reject(e); return; }
      const frame = new SpriteFrame(); frame.texture = texture;
      if (key === 'plaque') { frame.insetLeft = 145; frame.insetRight = 145; frame.insetTop = 86; frame.insetBottom = 86; }
      resolve(frame);
    }));
  }
  private f(key: string): SpriteFrame { const frame = this.frames.get(key); if (!frame) throw new Error(`Missing art: ${key}`); return frame; }
  private sound(key: string): void { /* curated web cues */ if(this.webMusic){if(this.hidden||!this.wallet?.snapshot().settings.sound)return;this.webMusic.setEffects(true);if(key==='win'){const ratio=(this.round?.totalWin||0)/(this.round?.bet||1);if(ratio>1)this.webMusic.playWinFanfare(ratio>=100?4:ratio>=40?3:ratio>=20?2:1);else this.webMusic.playSmallWinJingle();}else if(key==='collect')this.webMusic.playWinDetail('collect');else if(key==='stop')this.webMusic.playReelStop();else this.webMusic.play(key==='launch'?'spin':key==='bet-up'?'bet-up':key==='bet-down'?'bet-down':key==='back'?'back':'tap');return;}  if (!this.hidden && this.wallet?.snapshot().settings.sound) { const clip = this.clips.get(key); if (clip) { this.audio.playOneShot(clip, .42); if (key === 'win' || key === 'collect') this.webMusic?.duckFor(key === 'win' ? 2.8 : .9); } } }
  private background(parent: Node, key: string): Node {
    const f = this.f(key), ratio = f.originalSize.width / f.originalSize.height;
    const h = Math.max(this.height, this.width / ratio), w = h * ratio;
    const n = image(parent, f, 0, 0, w, h, 'Continuous scene');
    ThemeMotion.attach(n.getComponent(Sprite)!,key);
    return n;
  }
  private safe(action: () => void): void { try { action(); } catch (e) { this.dialog('Action not completed', e instanceof Error ? e.message : String(e)); } }
  private action(parent: Node, caption: string, x: number, y: number, w: number, h: number, callback: () => void, color = 'control-log', enabled: () => boolean = () => true, face: ControlFace = {}): Node {
    const harbor = color.startsWith('control-');
    const darkInk = harbor || color === 'plaque' || (color.startsWith('console-') && (!color.endsWith('-spin') || this.mode === 'pearl'));
    // Keep copy beyond the sculpted left fitting (205/256 of the face height),
    // including the broad rope/lifebuoy silhouette on destructive actions.
    const role = harbor ? color.slice('control-'.length) as HarborControlRole : null;
    const family: ControlFace = role ? harborFace(role, w, h) : {};
    const effectiveEnabled = () => !this.uiLocked && enabled();
    const n = button(parent, this.f(color), caption, x, y, w, h, () => { this.audioUnlocked = true; this.syncMusic(); if(!color.endsWith('-spin')&&!color.endsWith('-minus')&&!color.endsWith('-plus'))this.sound(role==='back'?'back':'press'); this.safe(callback); this.refreshButtonStates(); }, effectiveEnabled, !darkInk, {...family, ...face, reduced: () => this.reduced});
    this.controls.push({n, enabled: effectiveEnabled}); buttonState(n, effectiveEnabled()); return n;
  }
  private cabinetAction(parent: Node, role: ConsoleRole, caption: string, x: number, y: number, w: number, h: number, callback: () => void, enabled: () => boolean = () => true): Node {
    return this.action(parent, caption, x, y, w, h, callback, `console-${this.mode}-${role}`, enabled, consoleFace(this.mode, role, w, h));
  }
  private refreshButtonStates(): void {
    this.controls = this.controls.filter(c => c.n.isValid);
    for (const c of this.controls) buttonState(c.n, c.enabled());
  }
  private go(page: Page): void {
    if (!this.ready || this.uiLocked || (this.session.phase === 'spinning')) return;
    this.session.stopAuto(); this.autoVoyage = false; if (this.session.phase === 'presenting') this.session.finishPresentation();
    this.clearGrandStage();
    this.reels?.clearHighlights();
    if (this.titleMotion) Tween.stopAllByTarget(this.titleMotion);
    this.titleMotion = null; this.harborBackground = null; this.harborEntries = []; this.harborGlints = []; this.harborAccents = []; this.cabinetFx = []; this.controls = [];
    this.presenting = false; this.transitioning = false; this.round = null; this.reels = null; this.scene = null;
    this.coinPool = []; this.winPanel = null;
    this.winTitleLabel = this.winAmountLabel = this.winDetailLabel = null;
    this.rewardRings = []; this.rewardSparkles = [];
    this.webMusic?.setModalOpen(false); this.modal?.destroy(); this.modal = null; this.ambience = [];
    this.balanceLabel = this.betLabel = this.statusLabel = this.spinLabel = this.autoLabel = this.turboLabel = null;
    const previous = this.content; this.content = node(this.node, page); this.page = page;
    if (page === 'game') this.gamePage(); else if (page === 'home' || page === 'login') this.harbor(page === 'login'); else this.service(page);
    fadeIn(this.content, this.reduced); this.uiLocked = true;
    this.scheduleOnce(() => { previous.destroy(); this.uiLocked = false; }, this.reduced ? 0 : .25);
    this.refreshBalance();this.syncMusic();
  }
  private header(title: string, parent = this.content): void {
    const top = this.height / 2 - this.safeTop - 115;
    image(parent, this.f('plaque'), 0, top, 560, 105);
    text(parent, title, 0, top + 2, 490, 40);
    if (this.page === 'game') {
      const [controlWidth, controlHeight] = CONSOLE_LAYOUTS[this.mode].headerSize;
      this.cabinetAction(parent, 'back', 'Back', -407, top, controlWidth, controlHeight, () => this.go('home'), () => this.idle());
      this.cabinetAction(parent, 'menu', 'Menu', 407, top, controlWidth, controlHeight, () => this.settings(), () => this.idle());
    } else {
      this.action(parent, 'Back', -407, top, 190, 103, () => this.go('home'), 'control-back');
      this.action(parent, 'Menu', 407, top, 190, 103, () => this.settings(), 'control-log');
    }
    const y = top - 112;
    image(parent, this.f('plaque'), 0, y, 375, 91);
    image(parent, this.f('coin'), -135, y, 58, 58);
    this.balanceLabel = text(parent, '', 28, y, 265, 40);
  }
  private footer(): void {
    const y = -this.height / 2 + this.safeBottom + 120;
    // Keep each port and its hit area inside the safe width on narrow phones.
    const gap = Math.max(6, Math.min(16, this.width * .018));
    const tabWidth = Math.min(196, Math.max(48, (this.width - gap * 4 - 36) / 5));
    const tabHeight = Math.max(62, Math.min(100, tabWidth * .51));
    const tabStep = tabWidth + gap;
    const fontSize = Math.max(14, Math.min(40, tabWidth * .205));
    ['Play', 'Gifts', 'Rank', 'Shop', 'Crew'].forEach((label, i) => {
      const pages: Page[] = ['home','rewards','rank','shop','profile'];
      const roles = ['ticket', 'chest', 'podium', 'market', 'passport'];
      const current = this.page === pages[i];
      const tab = this.action(this.content, label, (i - 2) * tabStep, y, tabWidth, tabHeight,
        () => this.go(pages[i]!), `control-${roles[i]}`, () => true,
        {fontSize, hitHeight: Math.min(150, tabHeight + 44)});
      if (current) image(tab.getChildByName('Button surface')!, this.f('coin'), tabWidth * .41, tabHeight * .42,
        Math.max(18, Math.min(32, tabWidth * .16)), Math.max(18, Math.min(32, tabWidth * .16)), 'Current port');
    });
  }
  private harbor(login: boolean): void {
    const harbor = this.background(this.content, 'marina');
    // Keep the painted marina fixed; reflections and lanterns animate separately.
    harbor.setScale(1.025, 1.025, 1); this.harborBackground = harbor;
    this.addHarborReflections(login);
    if(!login)ThemeFestivity.hall(this.content,this.width,this.height,this.reduced);
    const compactViewport = this.height < 1000;
    const titleY = this.height / 2 - this.safeTop - (login ? 210 : (compactViewport ? 112 : 160));
    const titleFrame = this.f('title');
    const titleWidth = login ? 800 : (compactViewport ? Math.min(560, this.width * .62) : 620);
    const title = image(this.content, titleFrame, 0, titleY, titleWidth, titleWidth * titleFrame.originalSize.height / titleFrame.originalSize.width, 'Treasure Regatta brand');
    this.titleMotion = title;
    text(this.content, 'A little luck. A grand adventure.', 0, titleY - (login ? 235 : 175), 900, 35, Color.WHITE);
    this.sparkles(this.content, login ? 12 : 16, this.width * .82, this.height * .70);
    if (login) {
      const y = -this.height / 2 + this.safeBottom + 410;
      image(this.content, this.f('plaque'), 0, y + 140, 640, 112);
      const inputNode = node(this.content, 'Captain name', 0, y + 140, 560, 100);
      const input = inputNode.addComponent(EditBox); input.maxLength = 18;
      input.inputMode = EditBox.InputMode.SINGLE_LINE; input.string = this.captainName;
      // EditBox eagerly creates default labels on load. Replace, rather than leave
      // their white text visible outside the custom inset field.
      for (const generated of [input.textLabel, input.placeholderLabel]) {
        if (generated) { generated.node.active = false; generated.node.destroy(); }
      }
      const label = text(inputNode, this.captainName, 0, 0, 540, 48); input.textLabel = label;
      const placeholder = text(inputNode, 'Your captain name', 0, 0, 540, 44); input.placeholderLabel = placeholder;
      inputNode.on('text-changed', (box: EditBox) => { this.captainName = box.string; sys.localStorage.setItem('f28.regatta.name', this.captainName); });
      this.action(this.content, 'Set sail as guest', 0, y - 8, 650, 155, () => { sys.localStorage.setItem('f28.regatta.guest', '1'); this.captainName = input.string.trim() || 'Captain'; sys.localStorage.setItem('f28.regatta.name', this.captainName); this.go('home'); }, 'control-ticket');
      text(this.content, 'Virtual coins only · No cash prizes', 0, y - 128, 840, 30, Color.WHITE);
      this.action(this.content, 'Privacy', -190, y - 228, 320, 95, () => this.legal('privacy'));
      this.action(this.content, 'Terms', 190, y - 228, 320, 95, () => this.legal('terms'));
    } else {
      // The balance plaque is part of the boarding deck. On compact phones it
      // moves a little higher so the four entrances retain a real separation
      // from the footer instead of becoming one overlapping stack.
      const balanceY = titleY - (compactViewport ? Math.max(116, Math.min(170, this.height * .22))
        : Math.max(250, Math.min(300, this.height * .34)));
      image(this.content, this.f('plaque'), 0, balanceY, 440, 94);
      // Seat the coin seal inside the plaque's left medallion instead of on
      // the border. Its offset is derived from the plaque width so it remains
      // visually centered when the plaque is scaled by the UI layout.
      const balanceCoinX = -440 * .375;
      image(this.content, this.f('coin'), balanceCoinX, balanceY + 1, 56, 56);
      this.balanceLabel = text(this.content, '', 28, balanceY, 300, 38);
      // Boarding signs are attached to four berths, not a repeated card grid.
      // Derive the berths from the actual safe areas. The previous percentage
      // points looked acceptable at one tall viewport, but pushed the lower
      // cards into the footer and made the two columns collide on narrow phones.
      // The balance plaque owns the upper boundary; the footer owns the lower
      // boundary. Everything between them is a stable two-row boarding deck.
      const footerY = -this.height / 2 + this.safeBottom + 120;
      const marinaRatio = 1024 / 1536;
      const marinaH = Math.max(this.height, this.width / marinaRatio) * 1.045;
      const marinaW = marinaH * marinaRatio;
      // Derive the two columns from explicit outer and center gutters. This
      // keeps the complete hit areas inside the viewport at every width.
      const outerGutter = Math.max(18, Math.min(42, this.width * .045));
      const centerGutter = Math.max(22, Math.min(48, this.width * .052));
      // The tickets belong to the boats, so their width follows the painted
      // hulls instead of filling half the viewport. The viewport budget stays
      // as a hard upper bound for narrow phones, while the marina proportion
      // keeps the same visual scale on tablets and tall devices.
      const viewportCardWidth = (this.width - outerGutter * 2 - centerGutter) / 2;
      const sceneCardWidth = marinaW * .385;
      const cardWidth = Math.min(470, viewportCardWidth, Math.max(96, sceneCardWidth));
      const columnX = (cardWidth + centerGutter) / 2;
      const topGutter = Math.max(18, Math.min(30, this.height * .018));
      const bottomGutter = Math.max(18, Math.min(30, this.height * .022));
      const rowGutter = Math.max(22, Math.min(42, this.height * .032));
      const deckHeight = Math.max(0, balanceY - footerY);
      const desiredCardHeight = Math.min(145, Math.max(compactViewport ? 56 : 88, this.width * .14));
      const cardHeight = Math.min(desiredCardHeight,
        Math.max(64, (deckHeight - topGutter - bottomGutter - rowGutter) / 2));
      const upperY = balanceY - topGutter - cardHeight / 2;
      // The marina is a single painted scene, so the entrances must follow the
      // actual hulls instead of behaving like a generic two-row card grid.
      // Convert four source-pixel anchors from marina.jpg into the current
      // visible scene bounds. This keeps each ticket attached to its own boat
      // as the viewport changes, while the final clamp protects the title,
      // balance plaque and footer on short screens.
      const berthAnchor = (sourceX: number, sourceY: number): [number, number] => [
        (sourceX / 1024 - .5) * marinaW,
        (.5 - sourceY / 1536) * marinaH,
      ];
      const rawPositions = [
        berthAnchor(285, 640),  // red captain's cache
        berthAnchor(758, 640),  // pearl passage
        berthAnchor(280, 966),  // green jewel cargo
        berthAnchor(760, 978),  // coral reef riches
      ] as const;
      const minY = footerY + bottomGutter + cardHeight / 2;
      const maxY = balanceY - topGutter - cardHeight / 2;
      const positions = rawPositions.map(([rawX, rawY]) => [
        Math.max(-this.width / 2 + outerGutter + cardWidth / 2,
          Math.min(this.width / 2 - outerGutter - cardWidth / 2, rawX)),
        Math.max(minY, Math.min(maxY, rawY)),
      ] as [number, number]);
      IDS.forEach((id, i) => {
        const p = positions[i]!, x = p[0]!, y = p[1]!;
        const berthRoles = ['ticket', 'podium', 'chest', 'passport'];
        const entry = this.action(this.content, MODES[id].title, x, y, cardWidth, cardHeight, () => this.enterMode(id), `control-${berthRoles[i]}`, () => true, {
          labelY: cardHeight * .12,
          labelWidth: cardWidth * .58,
          fontSize: Math.max(compactViewport ? 18 : 31, Math.min(39, cardHeight * .27)),
          hitHeight: Math.min(cardHeight + 34, Math.max(48, cardHeight + 18)),
        });
        const wakeWidth = cardWidth * .70, wakeHeight = cardHeight * .82;
        const wake = node(entry, 'Berth light wake', cardWidth * .08, -3, wakeWidth, wakeHeight);
        wake.setSiblingIndex(0);
        const wakeArt = wake.addComponent(Graphics);
        wakeArt.fillColor = new Color(255, 232, 142, 38);
        wakeArt.roundRect(-wakeWidth / 2, -wakeHeight / 2, wakeWidth, wakeHeight, wakeHeight / 2); wakeArt.fill();
        wakeArt.strokeColor = new Color(255, 249, 214, 92); wakeArt.lineWidth = 3;
        wakeArt.roundRect(-wakeWidth / 2 + 7, -wakeHeight / 2 + 6, wakeWidth - 14, wakeHeight - 12, Math.max(20, wakeHeight / 2 - 6)); wakeArt.stroke();
        const wakeOpacity = wake.addComponent(UIOpacity); wakeOpacity.opacity = 24;
        wake.active = !this.reduced;
        this.harborAccents.push({n:wake, opacity:wakeOpacity, x:cardWidth * .08, y:-3, phase:i * 1.47, kind:'wake'});
        const surface = entry.getChildByName('Button surface')!;
        const detail = text(surface, `${['3 × 3','243 WAYS','HOLD & RESPIN','CLUSTER FALL'][i]}  ·  BOARD`,
          cardWidth * .105, -cardHeight * .22, cardWidth * .58,
          Math.max(compactViewport ? 12 : 20, Math.min(24, cardHeight * .16)), INK,
          Math.max(compactViewport ? 16 : 28, cardHeight * .22));
        detail.isBold = true; detail.enableWrapText = false;
        const opacity = entry.addComponent(UIOpacity);
        if (!this.reduced) {
          const direction = i % 2 ? 1 : -1;
          entry.setPosition(x + direction * Math.min(38, cardWidth * .09), y - Math.min(20, cardHeight * .14)); opacity.opacity = 0;
          tween(entry).delay(i * .065).to(.38, { position: new Vec3(x, y, 0) }, { easing: 'cubicOut' }).start();
          tween(opacity).delay(i * .065).to(.26, { opacity: 255 }, { easing: 'sineOut' }).start();
        }
        this.harborEntries.push({n: entry, x, y, phase: i * 1.67, readyAt: this.clock + .48 + i * .065});
      });
      this.footer();
    }
    this.syncTitleMotion();
  }
  /** Assets are already resident; this is a short themed boarding ceremony, not fake I/O. */
  private enterMode(id: ModeId): void {
    if (this.uiLocked || this.modeTransition?.isValid) return;
    this.mode = id; this.uiLocked = true; this.sound('press');
    if (this.reduced) { this.uiLocked = false; this.go('game'); return; }
    const overlay = node(this.node, `Boarding ${id}`); this.modeTransition = overlay;
    const frame = this.f(`${id}-scene`), scale = Math.max(this.width / 1024, this.height / 2048);
    const art = image(overlay, frame, 0, 0, 1024, 2048, `${MODES[id].title} preview`); art.setScale(scale, scale, 1);
    const veil = node(overlay, 'Boarding vignette', 0, 0, this.width, this.height).addComponent(Graphics);
    veil.fillColor = new Color(18, 25, 35, 118); veil.rect(-this.width / 2, -this.height / 2, this.width, this.height); veil.fill();
    const titleY = this.height * .09;
    const crest = image(overlay, this.f('plaque'), 0, titleY, 900, 206, 'Voyage crest');
    crest.setScale(.86, .86, 1);
    const captions: Record<ModeId, [string, string]> = {
      captain: ['CHARTING LUCKY WATERS', 'Compass aligned · Fortune ahead'],
      pearl: ['OPENING THE PEARL TIDE', 'Moonlit currents are rising'],
      cargo: ['UNSEALING THE TREASURE HOLD', 'Vault locks released'],
      reef: ['AWAKENING THE JEWEL REEF', 'The treasure garden stirs'],
    };
    const titleSize = id === 'cargo' || id === 'reef' ? 48 : 53;
    text(overlay, captions[id][0], 0, titleY + 22, 790, 42, INK, titleSize).enableWrapText = false;
    text(overlay, captions[id][1], 0, titleY - 43, 690, 26, INK, 42).enableWrapText = false;
    this.buildBoardingMotif(overlay, id, titleY + 235);
    text(overlay, 'PREPARING YOUR CABINET', 0, titleY - 116, 560, 24, Color.WHITE, 33).enableWrapText = false;
    const track = node(overlay, 'Boarding progress track', 0, titleY - 163, 680, 26);
    const tg = track.addComponent(Graphics); tg.fillColor = new Color(44, 31, 23, 205); tg.roundRect(-340, -10, 680, 20, 10); tg.fill();
    tg.lineWidth = 2; tg.strokeColor = new Color(255, 231, 156, 175); tg.roundRect(-340, -10, 680, 20, 10); tg.stroke();
    const fill = node(overlay, 'Boarding progress', -3, 0, 640, 12); const fg = fill.addComponent(Graphics);
    fg.fillColor = id === 'pearl' ? new Color(255, 238, 235, 235) : id === 'reef' ? new Color(142, 255, 226, 235) : new Color(255, 220, 104, 240);
    fg.roundRect(-320, -6, 640, 12, 6); fg.fill(); fill.setScale(.025, 1, 1);
    tween(fill).to(.92, {scale:new Vec3(1,1,1)}, {easing:'cubicOut'}).start();
    const pulseColor = id === 'pearl' ? new Color(255, 242, 246, 245) : id === 'reef' ? new Color(151, 255, 229, 245) : new Color(255, 227, 119, 245);
    for (let i=0;i<7;i++) {
      const lamp=node(overlay,`Boarding lamp ${i+1}`,-270+i*90,titleY-213,30,30); const lg=lamp.addComponent(Graphics);
      lg.fillColor=new Color(pulseColor.r,pulseColor.g,pulseColor.b,65); lg.circle(0,0,9); lg.fill();
      lg.lineWidth=2; lg.strokeColor=pulseColor; lg.circle(0,0,11); lg.stroke();
      const lo=lamp.addComponent(UIOpacity); lo.opacity=65; lamp.setScale(.72,.72,1);
      tween(lamp).delay(i*.105).to(.19,{scale:new Vec3(1.34,1.34,1)},{easing:'backOut'}).to(.22,{scale:Vec3.ONE},{easing:'sineOut'}).start();
      tween(lo).delay(i*.105).to(.16,{opacity:255},{easing:'sineOut'}).to(.34,{opacity:105},{easing:'sineInOut'}).start();
    }
    const opacity = overlay.addComponent(UIOpacity); opacity.opacity = 0;
    tween(opacity).to(.16, {opacity:255}, {easing:'sineOut'}).delay(.86).call(() => {
      this.uiLocked = false; this.go('game');
    }).delay(.08).to(.30, {opacity:0}, {easing:'sineInOut'}).call(() => {
      if (overlay.isValid) overlay.destroy(); if (this.modeTransition === overlay) this.modeTransition = null;
    }).start();
  }
  private buildBoardingMotif(parent: Node, id: ModeId, y: number): void {
    const root = node(parent, 'Mode boarding emblem', 0, y, 290, 290);
    const g = root.addComponent(Graphics);
    const accent = id === 'pearl' ? new Color(255, 237, 238, 225) : id === 'reef' ? new Color(131, 255, 221, 225) : new Color(255, 212, 91, 230);
    g.lineWidth = 6; g.strokeColor = accent;
    if (id === 'captain') {
      g.circle(0,0,92); g.stroke();
      for (let i=0;i<8;i++) { const a=i*Math.PI/4; g.moveTo(Math.cos(a)*38,Math.sin(a)*38); g.lineTo(Math.cos(a)*112,Math.sin(a)*112); } g.stroke();
      tween(root).by(.72,{angle:55},{easing:'cubicOut'}).start();
    } else if (id === 'pearl') {
      for (let i=0;i<5;i++) { const r=18+i*13; g.circle(0,(i-2)*17,r); } g.stroke();
      tween(root).to(.36,{scale:new Vec3(1.12,1.12,1)},{easing:'backOut'}).to(.34,{scale:Vec3.ONE},{easing:'sineOut'}).start();
    } else if (id === 'cargo') {
      g.roundRect(-100,-82,200,164,28); g.stroke(); g.circle(0,8,32); g.stroke(); g.moveTo(0,-24); g.lineTo(0,-62); g.stroke();
      root.setScale(.84,.84,1); tween(root).to(.42,{scale:new Vec3(1.06,1.06,1)},{easing:'backOut'}).to(.24,{scale:Vec3.ONE},{easing:'sineOut'}).start();
    } else {
      for (let i=0;i<3;i++) { g.arc(0,-38+i*35,72+i*18,Math.PI*.12,Math.PI*.88,false); g.stroke(); }
      tween(root).by(.34,{position:new Vec3(0,14,0)},{easing:'sineOut'}).by(.34,{position:new Vec3(0,-14,0)},{easing:'sineIn'}).start();
    }
  }
  private addHarborReflections(login: boolean): void {
    if (login) return;
    // Low, horizontal water reflections carry motion through the open marina
    // without covering labels or behaving like generic full-screen particles.
    const bands = [
      [-.34,.285,108], [.30,.23,82], [-.10,.09,92], [.36,-.02,72],
      [-.35,-.10,88], [.12,-.235,74], [-.18,-.36,96], [.34,-.41,68],
    ];
    bands.forEach(([px, py, range], i) => {
      const x = px! * this.width, y = py! * this.height;
      const n = node(this.content, 'Water gold reflection', x, y, 130, 18);
      const g = n.addComponent(Graphics);
      g.fillColor = i % 3 === 0 ? new Color(255, 220, 113, 175) : new Color(255, 249, 206, 150);
      g.roundRect(-48, -2, 96, 4, 2); g.fill();
      g.fillColor = new Color(255, 255, 240, 115); g.roundRect(-24, 4, 48, 3, 2); g.fill();
      const opacity = n.addComponent(UIOpacity); opacity.opacity = 0;
      n.active = !this.reduced;
      this.harborGlints.push({n, opacity, x, y, phase:i * 1.31, range:range!});
    });
    // Wider current lines reveal the marina's depth. They stay behind all controls
    // and cross the water at different periods, so the harbor never reads as a still poster.
    [[-.12,.33],[.17,.13],[-.08,-.08],[.13,-.30]].forEach(([px,py], i) => {
      const x = px! * this.width, y = py! * this.height;
      const n = node(this.content, 'Passing tide ribbon', x, y, 420, 34); const g = n.addComponent(Graphics);
      g.lineWidth = 5; g.strokeColor = new Color(255, 240, 176, 92);
      g.moveTo(-195,-6); g.bezierCurveTo(-95,12,78,-18,195,2); g.stroke();
      g.lineWidth = 2; g.strokeColor = new Color(235, 255, 244, 112);
      g.moveTo(-148,8); g.bezierCurveTo(-62,18,46,-6,148,9); g.stroke();
      const opacity = n.addComponent(UIOpacity); opacity.opacity = 18; n.active = !this.reduced;
      this.harborAccents.push({n, opacity, x, y, phase:i * 1.71 + .4, kind:'tide'});
    });
    // Broad turquoise currents make the water feel alive at a glance. They use
    // the marina's perspective and remain below every label and touch target.
    [[-.18,.24,1], [.16,-.01,-1], [-.10,-.27,1]].forEach(([px,py,direction], i) => {
      const x = px! * this.width, y = py! * this.height;
      const n = node(this.content, 'Marina current caustic', x, y, 610, 86); const g = n.addComponent(Graphics);
      for (let line = 0; line < 3; line++) {
        g.lineWidth = 4 - line;
        g.strokeColor = line === 1 ? new Color(117, 245, 229, 105) : new Color(255, 244, 184, 78);
        const offset = (line - 1) * 17;
        g.moveTo(-268, offset - 5); g.bezierCurveTo(-132, offset + 24, 112, offset - 21, 268, offset + 4); g.stroke();
      }
      const opacity = n.addComponent(UIOpacity); opacity.opacity = 26; n.active = !this.reduced;
      this.harborAccents.push({n, opacity, x, y, phase:i * 2.14 + (direction! < 0 ? Math.PI : 0), kind:'current'});
    });
    // Long perspective highlights are the harbor's main ambient gesture. Each
    // follows the water plane at a different depth and crosses only open water,
    // giving the lobby visible life without placing particles over the buttons.
    [[-.10,.30,.12], [.08,.055,.46], [-.05,-.255,.79]].forEach(([px,py,phase], i) => {
      const x = px! * this.width, y = py! * this.height;
      const n = node(this.content, 'Golden sunlight wake', x, y, 760 - i * 72, 96 - i * 9); const g = n.addComponent(Graphics);
      const half = 330 - i * 34;
      for (let band = 0; band < 4; band++) {
        const lift = (band - 1.5) * 15;
        g.lineWidth = 7 - band;
        g.strokeColor = band === 0 ? new Color(255, 211, 83, 126) : band === 1
          ? new Color(255, 244, 184, 112) : new Color(143, 244, 225, 72);
        g.moveTo(-half + band * 22, lift - 4);
        g.bezierCurveTo(-half * .45, lift + 25, half * .38, lift - 22, half - band * 18, lift + 3);
        g.stroke();
      }
      const opacity = n.addComponent(UIOpacity); opacity.opacity = 0; n.active = !this.reduced;
      this.harborAccents.push({n, opacity, x, y, phase:phase! * Math.PI * 2, kind:'sunpath'});
    });
    // Fixed treasure glints are attached to the four boats rather than scattered
    // particles; each berth gets one recognisable, occasional reward sparkle.
    [[-.39,.19],[.37,.17],[-.34,-.18],[.36,-.25]].forEach(([px,py], i) => {
      const x = px! * this.width, y = py! * this.height;
      const n = node(this.content, 'Berth treasure glint', x, y, 58, 58); const g = n.addComponent(Graphics);
      g.fillColor = new Color(255, 242, 174, 240); g.ellipse(-3,-25,6,50); g.fill(); g.ellipse(-25,-3,50,6); g.fill();
      g.fillColor = new Color(255, 206, 68, 190); g.circle(0,0,8); g.fill();
      const opacity = n.addComponent(UIOpacity); opacity.opacity = 0; n.active = !this.reduced;
      this.harborAccents.push({n, opacity, x, y, phase:i * 1.83 + .7, kind:'treasure'});
    });
    // Warm foreground lantern pools anchor the upper and lower marina planes.
    // Their slow pulse is broad enough to read on a phone without becoming a
    // full-screen colour wash or obscuring the controls.
    [[-.39,.39],[.39,.34],[-.43,-.43],[.42,-.38]].forEach(([px,py], i) => {
      const x = px! * this.width, y = py! * this.height;
      const n = node(this.content, 'Harbor lantern bloom', x, y, 126, 126);
      const g = n.addComponent(Graphics);
      g.fillColor = new Color(255, 216, 113, 34); g.circle(0, 0, 56); g.fill();
      g.fillColor = new Color(255, 247, 206, 66); g.circle(0, 0, 18); g.fill();
      const opacity = n.addComponent(UIOpacity); opacity.opacity = 30;
      n.active = !this.reduced;
      this.harborAccents.push({n, opacity, x, y, phase:i * 1.73, kind:'lantern'});
    });
  }
  private syncTitleMotion(): void {
    const title = this.titleMotion;
    if (!title) return;
    Tween.stopAllByTarget(title);
    if (!this.reduced && !this.hidden) tween(title)
      .by(3.4, { position: new Vec3(0, 5, 0) }, { easing: 'sineInOut' })
      .by(3.4, { position: new Vec3(0, -5, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
  }
  private gamePage(): void {
    const spec = SCENES[this.mode], f = this.f(`${this.mode}-scene`);
    const scale = Math.max(this.width / 1024, this.height / 2048);
    this.scene = node(this.content, 'Cabinet and world'); this.scene.setScale(scale, scale, 1);
    image(this.scene, f, 0, 0, 1024, 2048);
    const [left, top, width, height] = spec.aperture;
    const trim=ThemeFestivity.cabinet(this.scene,(left+width/2-.5)*1024,(.5-top-height/2)*2048,width*1024,height*2048,MODES[this.mode].columns,this.reduced);
    this.reels = new ReelView(this.scene, MODES[this.mode], this.symbols.get(this.mode)!, (left + width / 2 - .5) * 1024, (.5 - top - height / 2) * 2048, width * 1024, height * 2048, column => {if(this.webMusic)this.webMusic.playReelStop(column);else this.sound('stop');trim.land(column);});
    this.buildCabinetAmbience(left, top, width, height);
    const consoleY = (.5 - spec.console) * 2048;
    const layout = CONSOLE_LAYOUTS[this.mode];
    const at = (placement: ControlPlacement): ControlPlacement => ({...placement, y: consoleY + placement.y});
    const minus = at(layout.betMinus), plus = at(layout.betPlus), spinPlacement = at(layout.spin);
    this.cabinetAction(this.scene, 'bet', '−', minus.x, minus.y, minus.w, minus.h, () => this.changeBet(-1), () => this.idle() && this.betIndex > 0);
    this.cabinetAction(this.scene, 'bet', '+', plus.x, plus.y, plus.w, plus.h, () => this.changeBet(1), () => this.idle() && this.betIndex < BETS.length - 1);
    const spin = this.cabinetAction(this.scene, 'spin', 'SPIN', spinPlacement.x, spinPlacement.y, spinPlacement.w, spinPlacement.h, () => this.spin(), () => this.session.phase !== 'spinning' && this.session.phase !== 'error');
    this.spinLabel = spin.getComponentInChildren(Label);
    const betY = consoleY + layout.betReadoutOffset;
    image(this.scene, this.f('plaque'), 0, betY, 260, 74); this.betLabel = text(this.scene, `BET  ${BETS[this.betIndex]}`, 0, betY, 225, 32);
    const autoPlacement = at(layout.auto), turboPlacement = at(layout.turbo);
    const auto = this.cabinetAction(this.scene, 'auto', 'AUTO', autoPlacement.x, autoPlacement.y, autoPlacement.w, autoPlacement.h, () => this.auto(), () => this.idle() || this.session.remainingAuto > 0);
    this.autoLabel = auto.getComponentInChildren(Label);
    const turbo = this.cabinetAction(this.scene, 'turbo', 'TURBO', turboPlacement.x, turboPlacement.y, turboPlacement.w, turboPlacement.h, () => { if (this.idle()) { this.turbo = !this.turbo; this.refreshControls(); } }, () => this.idle());
    this.turboLabel = turbo.getComponentInChildren(Label);
    this.header(MODES[this.mode].title);
    const statusY = -this.height / 2 + this.safeBottom + 300;
    image(this.content, this.f('plaque'), 0, statusY, 960, 126);
    this.statusLabel = text(this.content, TAGLINES[IDS.indexOf(this.mode)]!, 0, statusY, 800, 36, INK, 102);
    this.statusLabel.node.on(Node.EventType.TOUCH_END, () => { if (this.round && this.idle()) this.roundDetails(); });
    // Cargo's locking hardware leaves a deliberately narrower enamel window.
    // Keep the action name readable there; the modal still contains the full pay table.
    const rulesCaption = this.mode === 'cargo' ? 'Rules' : 'Rules & pays';
    this.cabinetAction(this.content, 'rules', rulesCaption, -267, -this.height / 2 + this.safeBottom + 135, 420, 110, () => this.rules(), () => this.idle());
    this.cabinetAction(this.content, 'max', 'Max bet', 267, -this.height / 2 + this.safeBottom + 135, 420, 110, () => { this.betIndex = BETS.length - 1; this.refreshControls(); }, () => this.idle());
    this.sparkles(this.scene, 8, 860, 970); this.refreshControls();
    for (let i = 0; i < 18; i++) { const coin = image(this.content, this.f('coin'), 0, 0, 52, 52, 'Pooled award coin'); coin.active = false; this.coinPool.push(coin); }
    // The reward crest sits between the asset header and reel evidence. Its
    // title, amount and detail have separate safe zones, so no tier can force
    // the entire message to shrink into an unreadable two-line label.
    this.winPanel = node(this.content, 'Treasure reveal', 0, this.height / 2 - this.safeTop - 365, 860, 230);
    for (let i = 0; i < 2; i++) {
      const ring = node(this.winPanel, `Award halo ${i + 1}`, 0, 0, 770 - i * 74, 190 - i * 20);
      const g = ring.addComponent(Graphics);
      g.lineWidth = i ? 4 : 7;
      g.strokeColor = i ? new Color(255, 241, 171, 175) : new Color(255, 198, 61, 205);
      g.ellipse(-(770 - i * 74) / 2, -(190 - i * 20) / 2, 770 - i * 74, 190 - i * 20); g.stroke();
      const opacity = ring.addComponent(UIOpacity); opacity.opacity = 0;
      this.rewardRings.push({n:ring, opacity});
    }
    image(this.winPanel, this.f('plaque'), 0, 0, 800, 190);
    this.winTitleLabel = text(this.winPanel, '', 0, 48, 600, 30, INK, 42);
    this.winTitleLabel.enableWrapText = false;
    this.winAmountLabel = outlined(text(this.winPanel, '', 0, -4, 650, 54, new Color(126, 65, 22), 72), 1);
    this.winAmountLabel.enableWrapText = false;
    this.winDetailLabel = text(this.winPanel, '', 0, -49, 610, 24, INK, 34);
    this.winDetailLabel.enableWrapText = false;
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI * 2 * i / 8;
      const sparkle = node(this.winPanel, `Award sparkle ${i + 1}`, Math.cos(angle) * 380, Math.sin(angle) * 92);
      const g = sparkle.addComponent(Graphics); g.fillColor = new Color(255, 246, 191, 240);
      g.ellipse(-3, -15, 6, 30); g.fill(); g.ellipse(-15, -3, 30, 6); g.fill();
      const opacity = sparkle.addComponent(UIOpacity); opacity.opacity = 0;
      this.rewardSparkles.push({n:sparkle, opacity});
    }
    this.winPanel.active = false;
  }
  private buildCabinetAmbience(left: number, top: number, width: number, height: number): void {
    if (!this.scene) return;
    const cx = (left + width / 2 - .5) * 1024, cy = (.5 - top - height / 2) * 2048;
    const aw = width * 1024, ah = height * 2048;
    const palette: Record<ModeId, Color> = {
      captain:new Color(255,207,83,220), pearl:new Color(255,225,235,215),
      cargo:new Color(255,194,69,220), reef:new Color(113,255,221,215),
    };
    const rim = node(this.scene, 'Living reel bezel', cx, cy, aw + 28, ah + 28); const rg = rim.addComponent(Graphics);
    rg.lineWidth = 7; rg.strokeColor = palette[this.mode]; rg.roundRect(-(aw+20)/2,-(ah+20)/2,aw+20,ah+20,24); rg.stroke();
    const ro = rim.addComponent(UIOpacity); ro.opacity = 70; this.cabinetFx.push({n:rim,opacity:ro,x:cx,y:cy,phase:.4,range:0,kind:'rim'});
    // A material reflection travels on the upper metal lip, never across the symbols.
    const sweep = node(this.scene, 'Bezel light sweep', cx-aw*.42, cy+ah*.52, 90, 20); const sg=sweep.addComponent(Graphics);
    sg.fillColor=palette[this.mode]; sg.roundRect(-42,-3,84,6,3); sg.fill(); const so=sweep.addComponent(UIOpacity); so.opacity=0;
    this.cabinetFx.push({n:sweep,opacity:so,x:cx-aw*.42,y:cy+ah*.52,phase:IDS.indexOf(this.mode)*.83,range:aw*.84,kind:'sweep'});
    const count = this.mode === 'reef' ? 8 : 6;
    for (let i=0;i<count;i++) {
      const side=i%2?-1:1, x=cx+side*(aw*.58+(i%3)*23), y=cy-ah*.38+i*(ah*.76/Math.max(1,count-1));
      const star=node(this.scene,`${this.mode} cabinet glint`,x,y,30,30); const g=star.addComponent(Graphics);
      g.fillColor=palette[this.mode]; g.ellipse(-2,-12,4,24); g.fill(); g.ellipse(-12,-2,24,4); g.fill();
      const opacity=star.addComponent(UIOpacity); opacity.opacity=0;
      this.cabinetFx.push({n:star,opacity,x,y,phase:i*1.37+IDS.indexOf(this.mode),range:this.mode==='pearl'?12:7,kind:'spark'});
    }
    // Sequenced jewel lamps make the cabinet feel electrically alive while
    // remaining attached to the physical bezel rather than floating over reels.
    for (let i=0;i<10;i++) {
      const across=i<6, p=across?i/5:(i-6)/3;
      const side=i%2?-1:1;
      const x=across?cx-aw*.40+p*aw*.80:cx+side*aw*.535;
      const y=across?cy+ah*.545:cy+ah*.29-p*ah*.56;
      const lamp=node(this.scene,`${this.mode} bezel jewel ${i+1}`,x,y,28,28); const g=lamp.addComponent(Graphics);
      g.fillColor=palette[this.mode];
      if (this.mode==='pearl') { g.ellipse(-7,-5,14,10); g.fill(); }
      else if (this.mode==='cargo') { g.moveTo(0,9); g.lineTo(8,0); g.lineTo(0,-9); g.lineTo(-8,0); g.close(); g.fill(); }
      else if (this.mode==='reef') { g.circle(0,0,7); g.fill(); g.lineWidth=2; g.strokeColor=new Color(225,255,248,230); g.circle(0,0,10); g.stroke(); }
      else { g.circle(0,0,7); g.fill(); g.fillColor=new Color(255,249,207,245); g.circle(-2,2,2); g.fill(); }
      const opacity=lamp.addComponent(UIOpacity); opacity.opacity=45;
      this.cabinetFx.push({n:lamp,opacity,x,y,phase:i*.48+IDS.indexOf(this.mode)*.35,range:0,kind:'beacon'});
    }
  }
  private idle(): boolean { return this.session.phase === 'idle' && this.session.remainingAuto === 0; }
  private changeBet(delta: number): void { if (this.idle()) { const prior=this.betIndex; this.betIndex = Math.max(0, Math.min(BETS.length - 1, this.betIndex + delta)); if(prior!==this.betIndex)this.sound(delta>0?'bet-up':'bet-down'); this.refreshControls(); } }
  private spin(): void {
    if (this.session.phase === 'presenting') { this.finishRound(); return; }
    this.autoVoyage = false;
    if (this.session.spin(this.mode, BETS[this.betIndex]!, this.turbo)) this.beginVisual();
    else this.sessionError();
  }
  private beginVisual(): void {
    const state = this.session.state(); if (state.kind !== 'spinning' || !this.reels) return;
    this.round = state.round; this.roundId = state.id; this.stageIndex = 0; this.reviewStageIndex = 0; this.presenting = false; this.awardShown = 0;
    this.clearGrandStage(); this.grandShown = false;
    if (this.winPanel) this.winPanel.active = false;
    this.reels.start(state.round.stages[0]!.grid, state.turbo); this.webMusic?.beginSpin(); this.sound('launch');
    if (this.statusLabel) this.statusLabel.string = this.session.remainingAuto ? `Auto voyage · ${this.session.remainingAuto} spins queued` : 'Bon voyage…'; this.refreshBalance(); this.refreshControls();
  }
  private stopped(): void {this.webMusic?.finishSpin();
    this.session.reelsStopped(this.roundId);
    if (this.session.phase === 'error') { this.sessionError(); return; }
    this.presenting = true; this.stageTime = 0; this.counterStart = 0; this.presentStage(); this.refreshBalance(); this.refreshControls();
  }
  private presentStage(): void {
    if (!this.round || !this.reels) return;
    const stage = this.round.stages[this.stageIndex]!; this.reels.show(stage.grid); this.reels.highlight(stage, this.reduced);
    const stageWin = stage.awards.reduce((sum, a) => sum + a.amount, 0);
    this.counterStart = this.awardShown; this.awardShown += stageWin;
    if (stageWin) {
      const tier = this.rewardTier(this.awardShown / Math.max(1, this.round.bet));
      if(this.webMusic)this.webMusic.playSmallWinJingle();else this.sound('win');
      this.coinFlight(tier === 2 ? 18 : tier === 1 ? 12 : Math.min(8, 4 + stage.awards.length));
      this.showReward(tier, stageWin, stage.awards.length);
    } else if (this.winPanel) this.winPanel.active = false;
    if (this.statusLabel) this.statusLabel.string = this.stageDescription(stage);
  }
  private rewardTier(ratio: number): 0 | 1 | 2 { return Number.isFinite(ratio) ? (ratio >= 20 ? 2 : ratio > 1 ? 1 : 0) : 0; }
  private showReward(tier: 0 | 1 | 2, stageWin: number, awardCount: number): void {
    if (!this.winPanel || !this.winTitleLabel || !this.winAmountLabel || !this.winDetailLabel) return;
    this.winPanel.active = true;
    this.winTitleLabel.string = tier === 2 ? 'GRAND TREASURE' : tier === 1 ? 'TREASURE WIN' : 'PRIZE FOUND';
    this.winAmountLabel.string = `${this.counterStart.toLocaleString('en-US')} COINS`;
    this.winDetailLabel.string = `${awardCount} WIN${awardCount === 1 ? '' : 'S'}  ·  +${stageWin.toLocaleString('en-US')} THIS REVEAL`;
    Tween.stopAllByTarget(this.winPanel);
    if (this.reduced) {
      this.winPanel.setScale(Vec3.ONE); this.winPanel.angle = 0;
      for (const ring of this.rewardRings) ring.opacity.opacity = tier ? 150 : 90;
      for (const sparkle of this.rewardSparkles) sparkle.opacity.opacity = tier === 2 ? 180 : 0;
      return;
    }
    const start = tier === 2 ? .78 : tier === 1 ? .86 : .93;
    this.winPanel.setScale(start, start, 1); this.winPanel.angle = tier === 2 ? -1.2 : 0;
    tween(this.winPanel)
      .to(tier === 2 ? .44 : .30, {scale:Vec3.ONE, angle:0}, {easing:'backOut'})
      .start();
    for (let i = 0; i < this.rewardRings.length; i++) {
      const ring = this.rewardRings[i]!; Tween.stopAllByTarget(ring.n); Tween.stopAllByTarget(ring.opacity);
      ring.n.setScale(.68 + i * .08, .68 + i * .08, 1); ring.opacity.opacity = 0;
      tween(ring.opacity).delay(i * .08).to(.15, {opacity:tier === 2 ? 245 : tier === 1 ? 190 : 120}, {easing:'sineOut'})
        .to(.42 + tier * .09, {opacity:0}, {easing:'sineIn'}).start();
      tween(ring.n).delay(i * .08).to(.58 + tier * .08, {scale:new Vec3(1.18 + tier * .08, 1.18 + tier * .08, 1)}, {easing:'quadOut'}).start();
    }
    for (let i = 0; i < this.rewardSparkles.length; i++) {
      const sparkle = this.rewardSparkles[i]!; Tween.stopAllByTarget(sparkle.n); Tween.stopAllByTarget(sparkle.opacity);
      sparkle.n.setScale(.2, .2, 1); sparkle.opacity.opacity = 0;
      const delay = .08 + i * .045;
      tween(sparkle.opacity).delay(delay).to(.12, {opacity:tier === 2 ? 255 : tier === 1 ? 205 : 145})
        .delay(.10 + tier * .08).to(.24, {opacity:0}, {easing:'sineIn'}).start();
      tween(sparkle.n).delay(delay).to(.24, {scale:new Vec3(1.18 + tier * .18, 1.18 + tier * .18, 1)}, {easing:'backOut'})
        .to(.24, {scale:new Vec3(.35, .35, 1)}, {easing:'sineIn'}).start();
    }
  }
  private stageDescription(stage: Stage): string {
    if (stage.cargoValues && !stage.awards.length && stage.attemptsLeft !== undefined) return `CARGO LOCKED · ${stage.attemptsLeft} respins\nCoin value × bet · No extra bet`;
    if (!stage.awards.length) return this.stageIndex ? 'Voyage complete' : 'No winning combination this time';
    const a = stage.awards[0]!, name = MODES[this.mode].symbols.find(s => s.id === a.symbol)?.name || 'Coins';
    const description = a.kind === 'line' ? `Line ${a.line ?? 1} · ${a.matches} ${name}` : a.kind === 'ways' ? `${a.ways} ways · ${a.matches} columns · ${name}` : a.kind === 'cluster' ? `${a.cells.length} connected · ${name} · ×${stage.multiplier}` : 'Cargo collected';
    return `${description}${stage.awards.length > 1 ? ` + ${stage.awards.length - 1} more` : ''}\nWIN ${this.awardShown.toLocaleString('en-US')} · Tap SKIP to finish`;
  }
  private finishRound(): void {
    if (!this.round) return;
    // Stages may each return less than the stake. Classify the final total once,
    // using the accepted round's stake, never the live wager selector.
    if (!this.grandShown && isBigWin(this.round.totalWin, this.round.bet)) {
      this.grandShown = true; this.showGrandStage(); return;
    }
    this.completeRound();
  }
  private showGrandStage(): void {
    if (!this.round || this.grandStage) return;
    this.presenting = false;
    if (this.winPanel) this.winPanel.active = false;
    this.transitioning = false;
    const stage = this.grandStage = node(this.content, 'Grand treasure stage', 0, 0, this.width, this.height);
    stage.addComponent(BlockInputEvents);
    const scene = this.f(`${this.mode}-scene`), ratio = scene.originalSize.width / scene.originalSize.height;
    const h = Math.max(this.height, this.width / ratio);
    image(stage, scene, 0, 0, h * ratio, h, 'Voyage prize backdrop');
    const shade = node(stage, 'Ocean velvet', 0, 0, this.width, this.height), g = shade.addComponent(Graphics);
    g.fillColor = new Color(6, 31, 49, 195); g.rect(-this.width / 2, -this.height / 2, this.width, this.height); g.fill();
    const composition = node(stage, 'Treasure coronation');
    const compositionScale = Math.min(1, (this.height - this.safeTop - this.safeBottom - 170) / 1240);
    composition.setScale(compositionScale, compositionScale, 1);
    for (let i = 0; i < 3; i++) {
      const ring = node(composition, 'Golden wake', 0, 100), ink = ring.addComponent(Graphics);
      ink.strokeColor = new Color(255, 221, 117); ink.lineWidth = i === 0 ? 9 : 4;
      ink.circle(0, 0, 235 + i * 67); ink.stroke();
      ink.strokeColor = new Color(162, 233, 237); ink.lineWidth = 3;
      for (let j = 0; j < 12; j++) {
        const a = j * Math.PI / 6, r = 235 + i * 67;
        ink.moveTo(Math.cos(a) * (r + 9), Math.sin(a) * (r + 9));
        ink.lineTo(Math.cos(a) * (r + 34), Math.sin(a) * (r + 34)); ink.stroke();
      }
      const opacity = ring.addComponent(UIOpacity); opacity.opacity = 155;
      this.grandFx.push({n:ring, opacity, x:0, y:100, phase:i * .8, ring:true});
    }
    const frame = this.symbols.get(this.mode)![0]!, fit = 530 / Math.max(frame.rect.width, frame.rect.height);
    image(composition, frame, 0, 100, frame.rect.width * fit, frame.rect.height * fit, 'Mode treasure');
    image(composition, this.f('plaque'), 0, 500, 940, 190, 'Treasure title plaque');
    const tier = this.rewardTier(this.round.totalWin / this.round.bet);
    text(composition, tier === 2 ? 'GRAND TREASURE' : 'BIG WIN', 0, 504, 770, 76, INK, 108);
    outlined(text(composition, MODES[this.mode].title.toUpperCase(), 0, 371, 840, 31, GOLD));
    image(composition, this.f('plaque'), 0, -276, 920, 175, 'Prize amount plaque');
    this.grandAmount = text(composition, this.reduced ? this.round.totalWin.toLocaleString('en-US') : '0', 0, -274, 790, 83, INK, 116);
    outlined(text(composition, 'COINS WON', 0, -391, 850, 34, GOLD));
    outlined(text(composition, `TOTAL RETURN ${this.round.totalWin.toLocaleString('en-US')}  >  BET ${this.round.bet.toLocaleString('en-US')}`, 0, -447, 910, 27, GOLD));
    for (let i = 0; i < (this.reduced ? 0 : 36); i++) {
      const x = (i % 2 ? 1 : -1) * (330 + i % 4 * 45), y = 560 - i % 9 * 130;
      const coin = image(composition, this.f('coin'), x, y, 38 + i % 3 * 12, 38 + i % 3 * 12, 'Treasure coin shower');
      const opacity = coin.addComponent(UIOpacity); opacity.opacity = 210;
      this.grandFx.push({n:coin, opacity, x, y, phase:i * .31, ring:false});
    }
    button(composition, this.f('plaque'), 'Collect & continue', 0, -580, 650, 150,
      () => this.completeRound(), () => !!this.grandStage, false, {fontSize:40, reduced:() => this.reduced});
    this.grandTime = 0; this.sound('win');
    if (!this.reduced) {
      composition.setScale(composition.scale.x * .88, composition.scale.y * .88, 1);
      const scale = Math.min(1, (this.height - this.safeTop - this.safeBottom - 170) / 1240);
      tween(composition).to(.42, {scale:new Vec3(scale, scale, 1)}, {easing:'backOut'}).start();
    }
  }
  private clearGrandStage(): void {
    if (this.grandStage?.isValid) {
      const stop = (n:Node) => { Tween.stopAllByTarget(n); for (const c of n.children) stop(c); };
      stop(this.grandStage); this.grandStage.destroy();
    }
    this.grandStage = null; this.grandAmount = null; this.grandFx = []; this.grandTime = 0;
  }
  private completeRound(): void {
    if (!this.round) return;
    this.clearGrandStage();
    const win = this.round.totalWin, bet = this.round.bet;
    this.webMusic?.finishWinPresentation();
    if(win>0)this.sound('collect');
    if (this.statusLabel) this.statusLabel.string = win ? `WIN ${win.toLocaleString('en-US')}  ·  Net ${win - bet >= 0 ? '+' : ''}${win - bet}\nTap here for winning combinations` : `No win · Bet ${bet}\nTap here for round details`;
    this.presenting = false; this.transitioning = false;
    this.reels?.clearHighlights();
    const last = this.round.stages[this.round.stages.length - 1]!;
    this.reels?.show(last.grid); this.reels?.highlight(last, this.reduced);
    if (this.winPanel) this.winPanel.active = false;
    this.session.finishPresentation(); this.refreshControls(); this.refreshBalance();
    if (!this.session.remainingAuto) this.autoVoyage = false;
  }
  private auto(): void {
    if (this.session.remainingAuto || this.session.phase === 'spinning') { this.session.stopAuto(); this.autoVoyage = false; this.refreshControls(); return; }
    if (!this.idle()) return;
    this.dialog('Auto voyage', 'Play 10 rounds at the current bet.\nStop at any time; the active round will finish.\nAuto stops when you leave or hide the game.', 'Start 10 rounds', () => {
      if (this.session.startAuto(10, this.mode, BETS[this.betIndex]!, this.turbo)) { this.autoVoyage = true; this.beginVisual(); } else this.sessionError();
    });
  }
  private sessionError(): void {this.webMusic?.finishSpin();
    const state = this.session.state(); if (state.kind !== 'error') return;
    this.dialog('Voyage paused', state.message, 'Retry saved state', () => { this.session.retrySave(); this.refreshBalance(); this.refreshControls(); });
  }
  private refreshBalance(): void { if (this.balanceLabel) this.balanceLabel.string = this.wallet.snapshot().balance.toLocaleString('en-US'); }
  private refreshControls(): void {
    if (!this.ready) return;
    if (this.betLabel) this.betLabel.string = `BET  ${BETS[this.betIndex]}`;
    if (this.spinLabel) this.spinLabel.string = this.session.phase === 'spinning' ? 'SAILING' : this.session.phase === 'presenting' ? 'SKIP' : 'SPIN';
    if (this.autoLabel) this.autoLabel.string = this.session.remainingAuto ? 'STOP' : 'AUTO';
    if (this.turboLabel) this.turboLabel.string = this.turbo ? 'FAST' : 'TURBO';
    this.refreshButtonStates();
  }
  private service(page: Exclude<Page, 'login' | 'home' | 'game'>): void {
    this.background(this.content, 'club'); this.header({ rank: 'Regatta records', rewards: 'Voyage rewards', shop: 'Dock supplies', profile: 'Crew passport' }[page]);
    // A single open logbook underlies these views; copy follows its two-page composition.
    const book = node(this.content, 'Logbook copy', 0, -30);
    const receipts = this.wallet.snapshot().receipts;
    if (page === 'rewards') {
      image(book, this.symbols.get('captain')![0]!, -235, 130, 255, 255);
      text(book, 'DAILY\nPROVISIONS', -235, 340, 380, 45, INK, 140);
      text(book, '500 coins', -235, -48, 390, 50);
      text(book, 'Fresh provisions.\nOnce per UTC day.', -235, -170, 375, 36, INK, 140);
      const claimed = this.wallet.snapshot().rewardDays.includes(new Date().toISOString().slice(0,10));
      this.action(book, claimed ? 'Collected' : 'Collect 500', -235, -330, 370, 112, () => { this.wallet.claimDaily(new Date()); this.sound('collect'); this.go('rewards'); }, 'control-chest', () => !claimed);
      text(book, 'YOUR JOURNEY', 235, 340, 360, 38);
      text(book, `${receipts.length}\nrecorded voyages`, 235, 175, 360, 44, INK, 150);
      text(book, `${new Set(receipts.map(r => r.mode)).size} of 4\nwaters explored`, 235, -30, 360, 39, INK, 150);
      text(book, 'Four berths.\nFour adventures.\nDiscover them all.', 235, -240, 370, 36, INK, 180);
    } else if (page === 'rank') {
      const sorted = receipts.slice().sort((a,b) => b.win - a.win).slice(0, 5);
      image(book, this.symbols.get('captain')![1]!, -235, 170, 255, 255);
      text(book, 'PERSONAL BEST', -235, 340, 375, 36);
      text(book, sorted.length ? sorted[0]!.win.toLocaleString('en-US') : 'Your first\nvoyage awaits', -235, -25, 380, 47, INK, 150);
      text(book, 'On this device only.\nLast 100 rounds.\nNot an online rank.', -235, -235, 375, 35, INK, 180);
      text(book, 'TOP VOYAGES', 235, 340, 365, 36);
      if (!sorted.length) text(book, 'Set sail to begin\nyour treasure log.', 235, 50, 355, 36, INK, 180);
      sorted.forEach((r,i) => { text(book, `${i+1}.  ${MODES[r.mode].title}\n${r.win.toLocaleString('en-US')} coins`, 235, 205-i*116, 360, 34, INK, 102); });
    } else if (page === 'shop') {
      text(book, 'COIN SUPPLIES', -235, 340, 375, 37); image(book, this.f('coin'), -235, 130, 240, 240);
      text(book, 'Virtual coins\nNo cash value', -235, -80, 375, 40, INK, 140);
      this.action(book, 'Daily provisions', -235, -315, 390, 120, () => this.go('rewards'), 'control-chest');
      text(book, 'PURCHASE STATUS', 235, 340, 375, 34);
      LOCAL_PRODUCTS.forEach((p,i)=>{
        const buy=this.action(book,(p.credits+p.bonus).toLocaleString()+' coins · UNAVAILABLE',235,200-i*128,390,110,()=>void this.localIAP.purchase(p.id).then(r=>{this.dialog(r.ok?'Purchase delivered':'Purchase status',r.message);}), 'control-market');
        void this.localIAP.catalog().then(items=>{const l=buy.getComponentsInChildren(Label).find(l=>l.string.includes('UNAVAILABLE'));if(l&&l.isValid)l.string=(p.credits+p.bonus).toLocaleString()+' coins · '+items[i].displayPrice;});
      });
      this.action(book, 'Sync purchases', 235, -350, 390, 105, () => void this.localIAP.restore().then(r=>this.dialog('Purchase status',r.message)), 'control-market');
    } else {
      text(book, 'CREW PASSPORT', -235, 340, 375, 36); image(book, this.symbols.get('captain')![2]!, -235, 150, 250, 250);
      text(book, this.captainName, -235, -30, 365, 48); text(book, 'Guest captain\nSaved here', -235, -148, 370, 37, INK, 110);
      this.action(book, 'Settings', -235, -315, 375, 106, () => this.settings(), 'control-switch');
      text(book, 'VOYAGE DETAILS', 235, 340, 365, 34);
      text(book, `${this.wallet.snapshot().balance.toLocaleString('en-US')} coins\n${receipts.length} rounds\n${this.wallet.snapshot().rewardDays.length} daily rewards`, 235, 150, 365, 38, INK, 230);
      this.action(book, 'Privacy & data', 235, -50, 370, 101, () => this.legal('privacy'), 'control-passport');
      this.action(book, 'Sign out', 235, -210, 370, 101, () => { sys.localStorage.removeItem('f28.regatta.guest'); this.go('login'); }, 'control-back');
      this.action(book, 'Erase data', 235, -370, 370, 101, () => this.dialog('Erase local data?', 'This removes this device’s guest name, coins and records.\nThis cannot be undone. No online account exists.', 'Erase and restart', () => { sys.localStorage.removeItem(KEY); sys.localStorage.removeItem('f28.regatta.name'); sys.localStorage.removeItem('f28.regatta.guest'); this.ready = false; void this.boot(); }), 'control-cancel');
    }
    this.footer();
  }
  private dialog(title: string, body: string, confirm = 'Close', action?: () => void): void {
    this.modal?.destroy(); this.webMusic?.setModalOpen(true); const modal = node(this.node, 'Modal'); this.modal = modal;
    const scrim = node(modal, 'Scrim', 0, 0, this.width, this.height); const g = scrim.addComponent(Graphics);
    g.fillColor = new Color(18, 38, 43, 170); g.rect(-this.width/2, -this.height/2, this.width, this.height); g.fill();
    scrim.on(Node.EventType.TOUCH_START, () => undefined);
    panel(modal, this.f('plaque'), 1000, 1260);
    text(modal, title, 0, 455, 790, 49, INK, 122);
    const pages = readablePages(body); let page = 0;
    const copy = text(modal, pages[0]!, 0, 75, 800, 42, INK, 610);
    copy.isBold = false; copy.overflow = Label.Overflow.CLAMP;
    const number = text(modal, pages.length > 1 ? `1 / ${pages.length}` : '', 0, -305, 200, 35);
    if (pages.length > 1) {
      const turn = (delta: number) => { page += delta; copy.string = pages[page]!; number.string = `${page+1} / ${pages.length}`; this.refreshButtonStates(); };
      this.action(modal, 'Previous', -278, -305, 300, 110, () => turn(-1), 'control-back', () => page > 0);
      this.action(modal, 'Next', 278, -305, 300, 110, () => turn(1), 'control-next', () => page < pages.length - 1);
    }
    const close = () => { this.webMusic?.setModalOpen(false); modal.destroy(); if (this.modal === modal) this.modal = null; };
    this.action(modal, confirm, action ? 180 : 0, -475, action ? 540 : 660, 128, () => { close(); action?.(); }, 'control-seal');
    if (action) this.action(modal, 'Cancel', -310, -475, 275, 110, close, 'control-cancel');
    fadeIn(modal, this.reduced);
  }
  private settings(): void {
    if (this.session.phase === 'spinning') return;
    this.session.stopAuto();
    this.dialog('On-board settings', '');
    const m = this.modal!; const state = this.wallet.snapshot().settings;
    this.action(m, `Sound: ${state.sound ? 'on' : 'off'}`, 0, 120, 650, 145, () => { this.wallet.setting('sound', !state.sound); this.syncMusic(); this.settings(); }, 'control-switch');
    this.action(m, `Music: ${state.music ? 'on' : 'off'}`, 0, -65, 650, 145, () => { this.wallet.setting('music', !state.music); this.syncMusic(); this.settings(); }, 'control-switch');
    this.action(m, `Motion: ${state.reducedMotion ? 'reduced' : 'full'}`, 0, -250, 650, 145, () => {
      this.wallet.setting('reducedMotion', !state.reducedMotion); this.reduced = !state.reducedMotion;
      for (const a of this.ambience) a.n.active = !this.reduced;
      for (const glint of this.harborGlints) glint.n.active = !this.reduced;
      for (const accent of this.harborAccents) accent.n.active = !this.reduced;
      if (this.reduced) {
        this.harborBackground?.setPosition(0, 0); this.harborBackground?.setScale(1.025, 1.025, 1);
        for (const entry of this.harborEntries) entry.n.setPosition(entry.x, entry.y);
        for (const accent of this.harborAccents) {
          accent.n.setPosition(accent.x, accent.y); accent.n.setScale(Vec3.ONE);
          accent.opacity.opacity = accent.kind === 'wake' ? 24 : 30;
        }
      }
      this.syncTitleMotion(); this.settings();
    }, 'control-switch');
    this.action(m, 'Music credits', 0, -365, 650, 65, ()=>window.dispatchEvent(new Event('game-music-credits')), 'control-switch');
    text(m, 'Choose your on-board atmosphere.\nYour preferences are saved.', 0, 290, 790, 38, INK, 120);
  }
  private rules(): void {
    const mode = MODES[this.mode];
    const pays = mode.symbols.map(s => `${s.name}\n${Object.entries(s.pays).map(([n,v]) => `${n}${this.mode === 'reef' ? '+' : ''} = ×${v}`).join(' / ') || 'Feature only'}`).join('\n\n');
    const lines = this.mode === 'cargo' ? '\n\nLines, rows counted from top:\n1: 1–1–1–1–1\n2: 2–2–2–2–2\n3: 3–3–3–3–3\n4: 1–2–3–2–1\n5: 3–2–1–2–3' : '';
    this.dialog(`${mode.title} · Rules`, modeRules(this.mode).join('\n\n') + lines, 'Payout table', () => this.dialog('Payout multipliers', pays + '\n\n' + (this.mode === 'cargo' ? 'Line stake = total bet ÷ 5.' : 'Multipliers apply to total bet.') + '\nSee Rules for ways and cluster multiplication.'));
  }
  private roundDetails(): void {
    if (!this.round) return;
    const r = this.round;
    const summary = [`Bet: ${r.bet} coins`, `Total awarded: ${r.totalWin} coins`, `Net change: ${r.totalWin-r.bet} coins`];
    r.stages.forEach((s,i) => s.awards.forEach(a => {
      const symbol = MODES[r.mode].symbols.find(x => x.id === a.symbol)?.name || 'Cargo coins';
      const match = a.kind === 'line' ? `Line ${a.line}: ${a.matches} symbols` : a.kind === 'ways' ? `${a.matches} columns / ${a.ways} ways` : a.kind === 'cluster' ? `${a.cells.length} connected / cascade ×${s.multiplier}` : `${a.cells.length} locked coins`;
      summary.push(`Stage ${i+1} · ${symbol}\n${match}\nAward: ${a.amount} coins`);
    }));
    if (!r.totalWin) summary.push('No combination matched the payout rules. No prize was awarded.');
    if (r.capped) summary.push('The 5,000 × bet maximum win was applied.');
    const wins = r.stages.map((s, i) => ({s, i})).filter(({s}) => s.awards.length > 0);
    const chosen = wins[this.reviewStageIndex % Math.max(1, wins.length)];
    this.dialog('Voyage receipt', summary.join('\n\n'), chosen ? `View stage ${chosen.i+1}` : 'Close', chosen ? () => {
      // Review uses the already settled result. Never generate or pay another round.
      this.reels?.show(chosen.s.grid); this.reels?.highlight(chosen.s, this.reduced);
      this.reviewStageIndex++;
      const amount = chosen.s.awards.reduce((sum, a) => sum+a.amount, 0);
      if (this.statusLabel) this.statusLabel.string = `REVIEW · Stage ${chosen.i+1} · ${amount} coins\nHighlighted cells won · Tap for receipt`;
    } : undefined);
  }
  private legal(kind: 'terms' | 'privacy'): void {
    this.dialog(kind === 'privacy' ? 'Privacy · this local build' : 'Play responsibly', kind === 'privacy'
      ? 'Your guest name, settings and virtual coin records are stored on this device. No remote account server or analytics is connected. Apple processes purchases in the iOS app.\n\nChoose Erase data in Crew to remove them.\n\nThe publisher’s contact, privacy policy and production services must be configured before public distribution.'
      : 'This game uses nonredeemable virtual coins. There is no cash-out and no real-money prize.\n\nResults are random. Past results do not predict future results.\n\nApple-verified coin purchases are available inside the iOS app. Consumed coins cannot be restored. Take breaks and play within your limits.');
  }
  private sparkles(parent: Node, count: number, width: number, height: number): void {
    for (let i = 0; i < count; i++) {
      const x = Math.sin(i * 2.399) * width / 2, y = Math.cos(i * 1.91) * height / 2;
      const n = node(parent, 'Light reflection', x, y); const g = n.addComponent(Graphics);
      g.fillColor = new Color(255, 244, 185, 190); g.ellipse(-2, -7, 4, 14); g.fill(); g.ellipse(-7, -2, 14, 4); g.fill();
      n.addComponent(UIOpacity); n.active = !this.reduced;
      this.ambience.push({ n, x, y, phase: i * 1.73, base: 1 });
    }
  }
  private coinFlight(count: number): void {
    if (this.reduced) return;
    this.webMusic?.playWinDetail('burst');
    for (let i = 0; i < Math.min(count, this.coinPool.length); i++) {
      const n = this.coinPool[i]!, origin = this.height / 2 - this.safeTop - 365;
      Tween.stopAllByTarget(n); n.setPosition((i-count/2)*14, origin - 18); n.setScale(1,1,1); n.active = true;
      const x = (i % 2 ? 1 : -1) * (185 + i * 11), top = this.height / 2 - this.safeTop - 227;
      // Keep the flight in the reward/header corridor. Winning reel cells stay
      // visible throughout the presentation instead of being buried by coins.
      tween(n).delay(i*.035).to(.27, { position: new Vec3(x, origin + 28 + (i%3)*24, 0) }, { easing: 'quadOut' })
        .to(.55, { position: new Vec3(-135, top, 0), scale: new Vec3(.45,.45,1) }, { easing: 'sineIn' }).call(() => { n.active = false; }).start();
    }
  }
  update(dt: number): void {
    if (this.hidden) return;
    this.clock += dt;
    if (this.loadingView) this.tickLoading(dt);
    if (!this.ready || this.loading) return;
    for (const c of this.controls) if (c.n.isValid && c.n.activeInHierarchy) tickButtonLustre(c.n, dt, this.reduced, !this.uiLocked && c.enabled());
    if (!this.reduced) {
      for (const a of this.ambience) {
        a.n.setPosition(a.x, a.y + Math.sin(this.clock*.6+a.phase)*5);
        a.n.getComponent(UIOpacity)!.opacity = Math.round(28+Math.pow(Math.max(0,Math.sin(this.clock*.9+a.phase)),7)*190);
      }
      for (const entry of this.harborEntries) if (entry.n.isValid && this.clock >= entry.readyAt) {
        const invite = .5 + .5 * Math.sin(this.clock * .46 + entry.phase);
        entry.n.setPosition(entry.x + Math.sin(this.clock * .29 + entry.phase) * 5,
          entry.y + Math.sin(this.clock * .67 + entry.phase) * 10);
        entry.n.setRotationFromEuler(0, 0, Math.sin(this.clock * .38 + entry.phase) * .45);
        const scale = 1 + invite * .011; entry.n.setScale(scale, scale, 1);
      }
      for (const glint of this.harborGlints) if (glint.n.isValid) {
        const wave = Math.sin(this.clock * .72 + glint.phase);
        glint.n.setPosition(glint.x + Math.sin(this.clock * .18 + glint.phase) * glint.range,
          glint.y + Math.sin(this.clock * .44 + glint.phase) * 5);
        glint.n.setScale(.72 + (wave + 1) * .20, 1, 1);
        glint.opacity.opacity = Math.round(34 + Math.pow(Math.max(0, wave), 3) * 202);
      }
      for (const accent of this.harborAccents) if (accent.n.isValid) {
        const wave = .5 + .5 * Math.sin(this.clock * (accent.kind === 'wake' ? .82 : .58) + accent.phase);
        if (accent.kind === 'wake') {
          accent.n.setPosition(accent.x + Math.sin(this.clock * .33 + accent.phase) * 5, accent.y);
          accent.n.setScale(1 + wave * .035, .96 + wave * .08, 1);
          accent.opacity.opacity = Math.round(45 + wave * 105);
        } else if (accent.kind === 'lantern') {
          accent.n.setPosition(accent.x + Math.sin(this.clock * .22 + accent.phase) * 7,
            accent.y + Math.cos(this.clock * .31 + accent.phase) * 6);
          const scale = .84 + wave * .34; accent.n.setScale(scale, scale, 1);
          accent.opacity.opacity = Math.round(42 + wave * 125);
        } else if (accent.kind === 'tide') {
          const drift = Math.sin(this.clock * .19 + accent.phase);
          accent.n.setPosition(accent.x + drift * 76, accent.y + Math.sin(this.clock * .31 + accent.phase) * 8);
          accent.n.setScale(.88 + wave * .32, .94 + wave * .12, 1);
          accent.opacity.opacity = Math.round(44 + Math.pow(wave, 1.45) * 170);
        } else if (accent.kind === 'treasure') {
          const flare = Math.pow(Math.max(0, Math.sin(this.clock * .82 + accent.phase)), 5);
          accent.n.setPosition(accent.x, accent.y + Math.sin(this.clock * .27 + accent.phase) * 5);
          accent.n.setRotationFromEuler(0, 0, this.clock * 8 + accent.phase * 22);
          const scale = .68 + flare * .82; accent.n.setScale(scale, scale, 1);
          accent.opacity.opacity = Math.round(15 + flare * 240);
        } else if (accent.kind === 'current') {
          const travel = Math.sin(this.clock * .24 + accent.phase);
          accent.n.setPosition(accent.x + travel * 92, accent.y + Math.sin(this.clock * .37 + accent.phase) * 7);
          accent.n.setScale(.94 + wave * .12, .90 + wave * .20, 1);
          accent.opacity.opacity = Math.round(38 + Math.pow(wave, 1.45) * 158);
        } else {
          const cycle = (this.clock * .09 + accent.phase / (Math.PI * 2)) % 1;
          const reveal = Math.pow(Math.sin(cycle * Math.PI), 1.65);
          accent.n.setPosition(accent.x + (cycle - .5) * 230, accent.y + Math.sin(this.clock * .28 + accent.phase) * 9);
          accent.n.setScale(.82 + cycle * .34, .88 + reveal * .16, 1);
          accent.n.setRotationFromEuler(0, 0, Math.sin(this.clock * .18 + accent.phase) * .5);
          accent.opacity.opacity = Math.round(18 + reveal * 174);
        }
      }
      for (const fx of this.cabinetFx) if (fx.n.isValid) {
        if (fx.kind === 'rim') {
          const pulse = .5 + .5 * Math.sin(this.clock * .78 + fx.phase);
          fx.opacity.opacity = Math.round(72 + pulse * 108);
          const scale = 1 + pulse * .008; fx.n.setScale(scale, scale, 1);
        } else if (fx.kind === 'sweep') {
          const cycle = (this.clock * .225 + fx.phase) % 1;
          fx.n.setPosition(fx.x + cycle * fx.range, fx.y + Math.sin(cycle * Math.PI) * 3);
          fx.n.setScale(.72 + Math.sin(cycle * Math.PI) * .66, 1.08, 1);
          fx.opacity.opacity = Math.round(Math.pow(Math.sin(cycle * Math.PI), 3) * 235);
        } else if (fx.kind === 'spark') {
          const wave = Math.sin(this.clock * .72 + fx.phase);
          fx.n.setPosition(fx.x + Math.cos(this.clock * .32 + fx.phase) * fx.range * .25,
            fx.y + wave * fx.range);
          const pulse = Math.pow(Math.max(0, Math.sin(this.clock * .92 + fx.phase)), 7);
          fx.opacity.opacity = Math.round(18 + pulse * 210);
          fx.n.setScale(.72 + pulse * .62, .72 + pulse * .62, 1);
          fx.n.setRotationFromEuler(0, 0, this.clock * 12 + fx.phase * 18);
        } else {
          const chase = Math.pow(Math.max(0, Math.sin(this.clock * 2.05 - fx.phase)), 8);
          fx.opacity.opacity = Math.round(38 + chase * 217);
          const scale = .78 + chase * .58;
          fx.n.setScale(scale, scale, 1);
        }
      }
    }
    const before = this.session.phase; this.session.tick(dt);
    if (before === 'idle' && this.session.phase === 'spinning') this.beginVisual();
    if (this.session.phase === 'spinning' && this.reels?.tick(dt)) this.stopped();
    this.reels?.tickIdle(dt, !this.reduced && this.page === 'game' && this.idle() && !this.presenting && !this.modal);
    if (this.grandStage && this.round) {
      this.grandTime += Math.min(dt, .1);
      const p = this.reduced ? 1 : Math.min(1, this.grandTime / 1.65);
      this.webMusic?.playWinDetail('count',p);
      if (this.grandAmount) this.grandAmount.string = Math.round(this.round.totalWin * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US');
      if (!this.reduced) for (const fx of this.grandFx) {
        if (fx.ring) {
          fx.n.angle = this.grandTime * (fx.phase ? -14 : 18);
          const pulse = .5 + .5 * Math.sin(this.grandTime * 2.5 + fx.phase);
          fx.opacity.opacity = Math.round(100 + pulse * 135);
        } else {
          const cycle = (this.grandTime * .26 + fx.phase) % 1;
          fx.n.setPosition(fx.x + Math.sin(this.grandTime * 1.5 + fx.phase) * 27, 660 - cycle * 1300);
          fx.n.angle = this.grandTime * 85 + fx.phase * 120;
          fx.n.setScale(.45 + Math.abs(Math.cos(this.grandTime * 2.2 + fx.phase)) * .55, 1, 1);
          fx.opacity.opacity = Math.round(235 * Math.min(1, cycle * 8, (1 - cycle) * 8));
        }
      }
      if (this.autoVoyage && this.grandTime >= 4.8) this.completeRound();
    }
    if (this.presenting && this.round && !this.transitioning && !this.grandStage) {
      this.stageTime += dt;
      const stage = this.round.stages[this.stageIndex]!;
      if (this.winAmountLabel && this.winPanel?.active) {
        const p = this.reduced ? 1 : Math.min(1, this.stageTime / 1.25);
        this.webMusic?.playWinDetail('count',p);
        const value = Math.round(this.counterStart + (this.awardShown - this.counterStart) * (1 - Math.pow(1-p,3)));
        this.winAmountLabel.string = `${value.toLocaleString('en-US')} COINS`;
      }
      const duration = stage.cargoValues ? 1.2 : stage.awards.length ? 2.2 : .65;
      if (this.stageTime > duration) {
        this.stageTime = 0;
        if (++this.stageIndex < this.round.stages.length) {
          this.transitioning = true;
          this.reels!.transition(stage, this.round.stages[this.stageIndex]!, this.reduced, () => {
            this.transitioning = false; if (this.presenting) this.presentStage();
          });
        } else this.finishRound();
      }
    }
    if (this.resizePending && this.session.phase === 'idle') { this.resizePending = false; this.onResize(); }
  }
  private syncMusic(): void {
    if (this.webMusic) {
      this.music?.pause();this.webMusic.setScene(this.page === 'game' ? 'cabinet' : 'home');
      this.webMusic.setMusic(!this.hidden && !!this.wallet?.snapshot().settings.music);this.webMusic.setEffects(!this.hidden && !!this.wallet?.snapshot().settings.sound);return;
    }
    if (!this.hidden && this.audioUnlocked && this.wallet?.snapshot().settings.music) { if (!this.music.playing) this.music.play(); }
    else this.music.pause();
  }
  private onHide(): void { this.hidden = true; this.autoVoyage = false; this.session?.hide(); this.audio?.pause(); this.music?.pause(); }
  private onShow(): void { this.hidden = false; this.session?.show(); this.refreshControls(); this.syncMusic(); }
  private onResize(): void {
    if (!this.ready) return;
    if (this.session.phase !== 'idle' || this.uiLocked) { this.resizePending = true; return; }
    this.measure(); this.go(this.page);
  }
  onDestroy(): void {
    this.clearGrandStage();
    game.off(Game.EVENT_HIDE, this.onHide, this); game.off(Game.EVENT_SHOW, this.onShow, this); view.off('canvas-resize', this.onResize, this);
  }
}
