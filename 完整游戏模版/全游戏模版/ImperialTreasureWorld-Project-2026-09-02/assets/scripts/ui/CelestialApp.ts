import {
  _decorator, Button, Color, Component, EditBox, Graphics, Label, Layers, Mask, Node, profiler, resources,
  Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec3,
} from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SceneRouter, type Route } from '../core/SceneRouter';
import { SecureRNG } from '../core/SecureRNG';
import { GameStateMachine } from '../core/GameStateMachine';
import { GAME_CONFIG_BY_ID, GAME_CONFIGS } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import type { ForceResult, GameConfig, GameId, SpinResult } from '../math/types';
import { DEMO_PRODUCTS } from '../services/StoreService';
import { ACHIEVEMENTS } from '../services/AchievementService';
import { DEMO_MAIL } from '../services/MailService';
import { AudioManager } from '../audio/AudioManager';
import { VFXManager } from '../vfx/VFXManager';
import { SafeAreaAdapter } from './SafeAreaAdapter';
import { ReelEngine } from '../reels/ReelEngine';
import { SymbolAtlasCache, symbolAtlasForGame } from '../reels/SymbolAtlasCache';
import { AutoSpinController } from '../features/AutoSpinController';

const { ccclass } = _decorator;
const W = 1080;
const H = 1920;
const NAV_H = 150;
type SymbolMotion = 'none' | 'float' | 'pulse' | 'orbit' | 'button';
type FrameMetrics = {
  readonly leftRatio: number;
  readonly rightRatio: number;
  readonly topRatio: number;
  readonly bottomRatio: number;
  readonly innerLeftRatio: number;
  readonly innerRightRatio: number;
  readonly innerTopRatio: number;
  readonly innerBottomRatio: number;
};
type FrameGeometry = {
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly insetLeft: number;
  readonly insetRight: number;
  readonly insetTop: number;
  readonly insetBottom: number;
};
type SurfaceInsets = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};
const CARD_HERO_SYMBOLS = ['crown', 'guardian', 'seven', 'core'] as const;
const CHARACTER_PATHS = [
  'generated/common/character_astral_v01', 'generated/common/character_golden_v01',
  'generated/common/character_neon_v01', 'generated/common/character_cosmic_v01',
] as const;
const CABINET_TOP_PATHS = [
  'generated/common/cabinet_ruby_v04_top', 'generated/common/cabinet_golden_v04_top',
  'generated/common/cabinet_classic_v04_top', 'generated/common/cabinet_pearl_v04_top',
] as const;
const CABINET_LOWER_PATHS = [
  'generated/common/cabinet_ruby_v04_lower', 'generated/common/cabinet_golden_v04_lower',
  'generated/common/cabinet_classic_v04_lower', 'generated/common/cabinet_pearl_v04_lower',
] as const;
const CABINET_BODY_PATHS = [
  'generated/common/cabinet_ruby_v04', 'generated/common/cabinet_golden_v04',
  'generated/common/cabinet_classic_v04', 'generated/common/cabinet_pearl_v04',
] as const;
type CabinetMachineLayout = {
  readonly width: number;
  readonly height: number;
  readonly y: number;
  readonly reelWidth: number;
  readonly reelHeight: number;
  readonly reelY: number;
  readonly marqueeWidth: number;
  readonly marqueeHeight: number;
  readonly marqueeY: number;
  readonly meterWidth: number;
  readonly meterY: number;
  readonly controlXs: readonly [number, number, number, number, number];
  readonly controlYs: readonly [number, number, number, number, number];
  readonly controlWidth: number;
  readonly controlHeight: number;
  readonly spinWidth: number;
  readonly spinHeight: number;
  readonly serviceY: number;
};
// These measurements map the generated cabinet artwork's real apertures into
// the 1080x1920 design canvas. Game UI is now placed inside the physical
// marquee, reel glass, button bank and lower service panel instead of being
// stacked as independent webpage cards around a decorative shell.
const CABINET_MACHINE_LAYOUTS: readonly CabinetMachineLayout[] = [
  { width: 1060, height: 1400, y: -45, reelWidth: 681, reelHeight: 420, reelY: 94, marqueeWidth: 651, marqueeHeight: 176, marqueeY: 446, meterWidth: 445, meterY: -166, controlXs: [-266, -132, 2, 134, 270], controlYs: [-250, -250, -250, -250, -250], controlWidth: 92, controlHeight: 44, spinWidth: 94, spinHeight: 46, serviceY: -515 },
  { width: 1050, height: 1420, y: -35, reelWidth: 674, reelHeight: 428, reelY: 129, marqueeWidth: 613, marqueeHeight: 184, marqueeY: 490, meterWidth: 424, meterY: -137, controlXs: [-284, -149, -13, 124, 259], controlYs: [-231, -231, -231, -231, -231], controlWidth: 88, controlHeight: 44, spinWidth: 90, spinHeight: 46, serviceY: -505 },
  { width: 960, height: 1260, y: -55, reelWidth: 609, reelHeight: 404, reelY: 125, marqueeWidth: 435, marqueeHeight: 122, marqueeY: 431, meterWidth: 361, meterY: 343, controlXs: [-288, -147, -1, 141, 282], controlYs: [-179, -179, -179, -179, -179], controlWidth: 86, controlHeight: 44, spinWidth: 88, spinHeight: 46, serviceY: -425 },
  { width: 1060, height: 1340, y: -50, reelWidth: 741, reelHeight: 350, reelY: 140, marqueeWidth: 500, marqueeHeight: 74, marqueeY: 350, meterWidth: 312, meterY: -99, controlXs: [-298, -149, 1, 154, 300], controlYs: [-196, -196, -196, -196, -196], controlWidth: 88, controlHeight: 46, spinWidth: 90, spinHeight: 48, serviceY: -448 },
] as const;
const BUTTON_FRAME_PATHS = [
  'generated/common/button_frame_astral_v01', 'generated/common/button_frame_golden_v01',
  'generated/common/button_frame_neon_v01', 'generated/common/button_frame_cosmic_v01',
] as const;
const FRAME_TEXTURE_SIZES = [
  { width: 556, height: 254 }, { width: 560, height: 248 },
  { width: 550, height: 279 }, { width: 562, height: 284 },
] as const;
const FRAME_STYLES: readonly { textureIndex: number; angle?: number; tint?: Color }[] = [
  { textureIndex: 0 }, { textureIndex: 1 }, { textureIndex: 2 }, { textureIndex: 3 },
  // A dedicated first-card treatment: inverted Neon architecture with a warm
  // starlight finish. It is structurally and chromatically distinct from both
  // the Astral banner frame and the fourth card's upright Cosmic frame.
  { textureIndex: 2, angle: 180, tint: new Color(255, 214, 172) },
];
// The four generated frames do not share the same inner window. In
// particular, Neon and Cosmic have a tall crest but a shallow lower rail.
// Treating them as symmetric nine-slices stretches the crest into the panel
// and is the source of the visible "frame pressing on content" problem.
const FRAME_METRICS: readonly FrameMetrics[] = [
  // Inner-window ratios are measured from the alpha-transparent run through
  // each source texture's centre, rather than estimated from its silhouette.
  { leftRatio: 0.18, rightRatio: 0.18, topRatio: 0.27, bottomRatio: 0.27, innerLeftRatio: 0.0737, innerRightRatio: 0.0737, innerTopRatio: 0.1732, innerBottomRatio: 0.1654 },
  { leftRatio: 0.19, rightRatio: 0.19, topRatio: 0.27, bottomRatio: 0.27, innerLeftRatio: 0.0679, innerRightRatio: 0.0696, innerTopRatio: 0.1653, innerBottomRatio: 0.1613 },
  { leftRatio: 0.18, rightRatio: 0.18, topRatio: 0.35, bottomRatio: 0.16, innerLeftRatio: 0.0709, innerRightRatio: 0.0727, innerTopRatio: 0.3262, innerBottomRatio: 0.1398 },
  { leftRatio: 0.19, rightRatio: 0.19, topRatio: 0.35, bottomRatio: 0.18, innerLeftRatio: 0.0943, innerRightRatio: 0.0943, innerTopRatio: 0.3134, innerBottomRatio: 0.1549 },
  { leftRatio: 0.18, rightRatio: 0.18, topRatio: 0.35, bottomRatio: 0.16, innerLeftRatio: 0.0709, innerRightRatio: 0.0727, innerTopRatio: 0.3262, innerBottomRatio: 0.1398 },
];
const C = {
  ink: new Color(18, 11, 8), navy: new Color(42, 27, 19), panel: new Color(58, 36, 24, 244),
  panel2: new Color(76, 49, 32, 247), gold: new Color(232, 174, 76), paleGold: new Color(255, 229, 174),
  cyan: new Color(122, 211, 170), violet: new Color(212, 76, 108), white: new Color(255, 248, 231),
  muted: new Color(198, 176, 143), red: new Color(245, 91, 105), green: new Color(87, 204, 144),
};
const ZH: Readonly<Record<string, string>> = {
  HOME: '首页', STORE: '商店', REWARDS: '奖励', RANK: '排行', PROFILE: '我的', SETTINGS: '设置', ACHIEVEMENTS: '成就', INBOX: '邮箱',
  'ACCOUNT SIGN IN': '账号登录', 'ENTER THE VAULT': '进入财富世界', 'CREATE LOCAL ACCOUNT': '注册本地账号', 'FORGOT PASSWORD': '忘记密码', 'CONTINUE AS GUEST': '游客登录',
  'CREATE ACCOUNT': '创建账号', 'CREATE PROFILE': '创建资料', 'BACK TO SIGN IN': '返回登录', 'RETURN TO LOGIN': '返回登录',
  'DAILY CHECK-IN': '每日签到', 'LUCKY WHEEL': '幸运转盘', 'CLAIM TODAY': '领取今日奖励', CLAIM: '领取', CLAIMED: '已领取', LOCKED: '未解锁', COLLECT: '领取',
  'DEMO CREDITS': '试玩金币', 'ADD DEMO': '添加试玩金币', 'SIGN IN': '去登录', 'REWARD CENTER': '奖励中心', 'FORTUNE RANK': '财富排行',
  MUSIC: '音乐', 'SOUND EFFECTS': '音效', VIBRATION: '震动', QUALITY: '画质', LANGUAGE: '语言', ENGLISH: '英文', '简体中文': '简体中文',
  ON: '开', OFF: '关', LOW: '低', MEDIUM: '中', HIGH: '高', 'CLEAR LOCAL DATA': '清除本地数据', 'RESET…': '重置…',
  SPIN: '旋转', PAYTABLE: '赔付表', RULES: '规则', CLOSE: '关闭', 'LOG OUT': '退出登录', 'CHANGE AVATAR': '更换头像', 'MARK READ': '标为已读', 'DELETE READ': '删除已读',
};

@ccclass('CelestialApp')
export class CelestialApp extends Component {
  private readonly bootstrap = new GameBootstrap();
  private readonly resultGenerator = new ResultGenerator();
  private readonly rngByGame = new Map<GameId, SecureRNG>();
  private readonly stateMachine = new GameStateMachine();
  private readonly autoSpin = new AutoSpinController();
  private router!: SceneRouter;
  private background!: Node;
  private page!: Node;
  private navigation!: Node;
  private overlay!: Node;
  private toastLayer!: Node;
  private vfx!: VFXManager;
  private audio!: AudioManager;
  private selectedGame: GameConfig = GAME_CONFIGS[0];
  private reelEngine?: ReelEngine;
  private balanceLabel?: Label;
  private winLabel?: Label;
  private betLabel?: Label;
  private spinButtonLabel?: Label;
  private spinning?: SpinResult;
  private betIndex = 2;
  private turbo = false;
  private forcedResult?: ForceResult;
  private userNameInput?: EditBox;
  private passwordInput?: EditBox;
  private registerInputs: EditBox[] = [];
  private readonly frameTextureCache = new Map<number, Texture2D>();
  private readonly cabinetTextureCache = new Map<number, Texture2D>();
  private readonly cabinetBodyTextureCache = new Map<number, Texture2D>();
  private slotLever?: Node;
  private spinEffectPosition = new Vec3(0, -280, 0);
  private reelEffectPosition = new Vec3(0, 40, 0);
  private creditEffectPosition = new Vec3(-220, -160, 0);
  private cabinetAttractLayer?: Node;
  private debugMode = false;
  private rememberLogin = true;
  private acceptedTerms = false;
  private rankTab: 'daily' | 'weekly' | 'all-time' = 'daily';
  private gildedStage?: Node;

  protected start(): void {
    this.node.layer = Layers.Enum.UI_2D;
    this.node.addComponent(SafeAreaAdapter);
    this.node.on('csw-layout-changed', this.onLayoutChanged, this);
    this.audio = this.node.addComponent(AudioManager);
    this.vfx = this.node.addComponent(VFXManager);
    this.preloadFrameTextures();
    this.background = this.layer('BackgroundLayer');
    this.page = this.layer('PageLayer');
    this.navigation = this.layer('NavigationLayer');
    this.overlay = this.layer('OverlayLayer');
    this.toastLayer = this.layer('ToastLayer');
    this.router = new SceneRouter((route) => this.render(route));
    GAME_CONFIGS.forEach((config) => this.rngByGame.set(config.id, new SecureRNG()));
    const query = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const localDebugHost = typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
    this.debugMode = localDebugHost && query.get('debug') === '1'; if (this.debugMode && query.get('stats') === '1') profiler.showStats(); else profiler.hideStats();
    this.selectQueryGame(query);
    this.forcedResult = this.debugMode ? this.forceFromQuery(query.get('force')) : undefined;
    const target = query.get('screen') as Route | null; const publicRoute = target === 'login' || target === 'register' || target === 'forgot';
    if (target && (this.debugMode || publicRoute)) this.router.reset(target); else this.showBoot();
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('csw-app-ready'));
  }

  protected onDestroy(): void { this.node.off('csw-layout-changed', this.onLayoutChanged, this); }

  private layer(name: string): Node {
    const node = new Node(name); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(W, H); this.node.addChild(node); return node;
  }

  private preloadFrameTextures(): void {
    BUTTON_FRAME_PATHS.forEach((path, index) => {
      resources.load(`${path}/texture`, Texture2D, (error, texture) => {
        if (!error && texture) this.frameTextureCache.set(index, texture);
      });
    });
    [...CABINET_TOP_PATHS, ...CABINET_LOWER_PATHS].forEach((path, index) => {
      resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (!error && texture) this.cabinetTextureCache.set(index, texture); });
    });
    CABINET_BODY_PATHS.forEach((path, index) => {
      resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (!error && texture) this.cabinetBodyTextureCache.set(index, texture); });
    });
  }

  private withFrameTexture(index: number, callback: (texture: Texture2D) => void): void {
    const cached = this.frameTextureCache.get(index); if (cached) { callback(cached); return; }
    resources.load(`${BUTTON_FRAME_PATHS[index]}/texture`, Texture2D, (error, texture) => {
      if (error || !texture) return; this.frameTextureCache.set(index, texture); callback(texture);
    });
  }

  private withCabinetTexture(index: number, lower: boolean, callback: (texture: Texture2D) => void): void {
    const cacheIndex = index + (lower ? 4 : 0); const cached = this.cabinetTextureCache.get(cacheIndex); if (cached) { callback(cached); return; }
    const path = lower ? CABINET_LOWER_PATHS[index] : CABINET_TOP_PATHS[index]; resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture) return; this.cabinetTextureCache.set(cacheIndex, texture); callback(texture);
    });
  }

  private withCabinetBodyTexture(index: number, callback: (texture: Texture2D) => void): void {
    const cached = this.cabinetBodyTextureCache.get(index); if (cached) { callback(cached); return; }
    resources.load(`${CABINET_BODY_PATHS[index]}/texture`, Texture2D, (error, texture) => {
      if (error || !texture) return; this.cabinetBodyTextureCache.set(index, texture); callback(texture);
    });
  }

  private showBoot(): void {
    this.clearAll();
    this.paintBackdrop('boot', new Color(7, 4, 3), new Color(73, 39, 9));
    this.addStarField(this.page, 72);
    this.addLoadingOrbit(this.page, 0, 420, C.cyan, 150);
    const brandMark = this.label(this.page, '◆', 0, 420, 150, C.gold); tween(brandMark.node).to(0.9, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' }).to(0.9, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    this.label(this.page, 'IMPERIAL', 0, 205, 78, C.paleGold, true);
    this.label(this.page, 'TREASURE WORLD', 0, 118, 56, C.white, true);
    this.label(this.page, 'TRADITIONAL REELS • VIRTUAL CREDITS', 0, 30, 22, C.muted);
    const bar = this.panel(this.page, 0, -430, 680, 24, 12, new Color(34, 19, 8), C.gold, 2);
    const fill = this.panel(bar, 0, 0, 660, 12, 6, C.cyan); fill.setScale(new Vec3(0.001, 1, 1));
    const progress = this.label(this.page, 'UNLOCKING THE VAULT  0%', 0, -385, 22, C.muted);
    tween(fill).to(1.7, { scale: Vec3.ONE }, { easing: 'quadInOut', onUpdate: (_target, ratio = 0) => { progress.string = `UNLOCKING THE VAULT  ${Math.floor(ratio * 100)}%`; } }).call(() => {
      const player = this.bootstrap.profile.current();
      this.router.reset(player && !player.isGuest && this.bootstrap.save.read().rememberLogin ? 'home' : 'login');
    }).start();
    this.label(this.page, 'All rewards are local DEMO CREDITS', 0, -770, 20, C.muted);
  }

  private render(route: Route): void {
    const publicRoute = route === 'boot' || route === 'login' || route === 'register' || route === 'forgot'; const player = this.bootstrap.profile.current();
    if (!publicRoute && !player) { if (this.debugMode) void this.bootstrap.auth.guestLogin().then(() => this.router.reset(route)); else this.router.reset('login'); return; }
    this.applyPlayerPreferences(); this.clearAll();
    if (route === 'boot') this.showBoot();
    else if (route === 'login') this.showLogin();
    else if (route === 'register') this.showRegister();
    else if (route === 'forgot') this.showForgot();
    else if (route === 'home') this.showHome();
    else if (route === 'store') this.showStore();
    else if (route === 'rewards') this.showRewards();
    else if (route === 'rank') this.showRank(this.rankTab);
    else if (route === 'profile') this.showProfile();
    else if (route === 'check-in') this.showCheckIn();
    else if (route === 'wheel') this.showWheel();
    else if (route === 'achievements') this.showAchievements();
    else if (route === 'mail') this.showMail();
    else if (route === 'settings') this.showSettings();
    else if (route === 'game-loading') this.showGameLoading();
    else if (route === 'game') this.showGame();
    this.playPageReveal();
  }

  private clearAll(): void {
    for (const layer of [this.background, this.page, this.navigation, this.overlay]) { for (const child of [...(layer?.children ?? [])]) { child.removeFromParent(); child.destroy(); } }
    this.balanceLabel = undefined; this.reelEngine = undefined; this.winLabel = undefined; this.betLabel = undefined; this.spinButtonLabel = undefined; this.slotLever = undefined; this.cabinetAttractLayer = undefined; this.gildedStage = undefined;
  }

  private onLayoutChanged(): void { if (this.router && !this.spinning) this.render(this.router.route); }

  private showLogin(): void {
    this.paintBackdrop('login', C.ink, new Color(84, 49, 14)); this.addStarField(this.page, 50);
    this.addCharacter(this.page, 0, -410, 300, 330, 530, 62, 0.15);
    this.addCharacter(this.page, 1, 410, 280, 330, 520, 58, 0.45);
    this.label(this.page, '◆', 0, 660, 100, C.gold);
    this.label(this.page, 'IMPERIAL TREASURE WORLD', 0, 535, 46, C.paleGold, true);
    this.label(this.page, 'WELCOME TO THE PRIVATE VAULT', 0, 455, 24, C.white, true);
    const card = this.panel(this.page, 0, -20, 820, 860, 38, C.panel, C.gold, 2);
    this.label(card, 'ACCOUNT SIGN IN', 0, 350, 40, C.paleGold, true);
    this.userNameInput = this.input(card, 'Username', '', 0, 270, false);
    this.passwordInput = this.input(card, 'Password', '', 0, 150, true);
    let remember!: Node; remember = this.button(card, '✓  REMEMBER ME', -190, 50, 330, 54, () => { this.rememberLogin = !this.rememberLogin; const copy = remember.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = `${this.rememberLogin ? '✓' : '○'}  REMEMBER ME`; }, 'ghost');
    this.button(card, 'ENTER THE VAULT', 0, -60, 640, 92, () => this.login(), 'primary');
    this.button(card, 'CREATE LOCAL ACCOUNT', -170, -165, 300, 50, () => this.router.go('register'), 'link');
    this.button(card, 'FORGOT PASSWORD', 190, -165, 280, 50, () => this.router.go('forgot'), 'link');
    this.label(card, 'OR', 0, -218, 18, C.muted, true);
    this.button(card, 'CONTINUE AS GUEST', 0, -285, 640, 76, () => this.guestLogin(), 'ghost');
    this.label(card, 'GUEST: PLAY ENABLED • STORE TOP-UPS AND RECOVERY LOCKED', 0, -370, 17, C.cyan, true, 700);
    this.label(this.page, 'Sign in, create an account, or continue as a guest', 0, -535, 21, C.muted);
    remember.setScale(new Vec3(0.95, 0.95, 1));
  }

  private async login(): Promise<void> {
    const result = await this.bootstrap.auth.login({ username: this.userNameInput?.string || '', password: this.passwordInput?.string || '', remember: this.rememberLogin });
    if (result.ok) this.bootstrap.economy.recoverPending();
    if (result.ok) this.router.reset('home'); else this.toast(result.message ?? 'Unable to sign in', C.red);
  }

  private async guestLogin(): Promise<void> {
    const result = await this.bootstrap.auth.guestLogin();
    if (result.ok) this.router.reset('home'); else this.toast(result.message ?? 'Unable to start guest session', C.red);
  }

  private showRegister(): void {
    this.paintBackdrop('login', C.ink, new Color(84, 45, 16)); this.header('CREATE ACCOUNT', true);
    const card = this.panel(this.page, 0, -40, 840, 1160, 36, C.panel, C.gold, 2);
    this.label(card, 'LOCAL DEMO PROFILE', 0, 500, 28, C.paleGold, true);
    this.registerInputs = [
      this.input(card, 'Username', '', 0, 390), this.input(card, 'Nickname', '', 0, 265),
      this.input(card, 'Password (10–72 characters)', '', 0, 140, true), this.input(card, 'Confirm password', '', 0, 15, true),
    ];
    this.button(card, `${this.acceptedTerms ? '✓' : '○'}  I ACCEPT THE VIRTUAL-CREDIT DEMO TERMS`, 0, -105, 650, 58, () => { this.acceptedTerms = !this.acceptedTerms; this.showRegister(); }, this.acceptedTerms ? 'secondary' : 'ghost');
    this.button(card, 'CREATE PROFILE', 0, -245, 650, 92, () => {
      const [username, nickname, password, confirmPassword] = this.registerInputs.map((input) => input.string);
      void this.bootstrap.auth.register({ username, nickname, password, confirmPassword, acceptedTerms: this.acceptedTerms }).then((result) => { if (result.ok) { this.bootstrap.economy.recoverPending(); this.router.reset('home'); } else this.toast(result.message ?? 'Registration failed', C.red); });
    }, 'primary');
    this.label(card, 'No email, network account, or payment profile is created.', 0, -350, 20, C.muted);
    this.button(card, 'BACK TO SIGN IN', 0, -455, 380, 58, () => this.router.back('login'), 'link');
  }

  private showForgot(): void {
    this.paintBackdrop('login', C.ink, new Color(72, 42, 16)); this.header('LOCAL RECOVERY', true);
    const card = this.panel(this.page, 0, 120, 820, 670, 38, C.panel, C.gold, 2);
    this.label(card, 'FORGOT YOUR PASSWORD?', 0, 245, 34, C.paleGold, true);
    this.label(card, 'This is a local demonstration. No email will be sent.', 0, 170, 21, C.muted);
    const identifier = this.input(card, 'Username or email', 'demo', 0, 55);
    this.button(card, 'CHECK LOCAL PROFILE', 0, -75, 620, 86, () => this.toast(this.bootstrap.auth.localPasswordHint(identifier.string), C.cyan), 'primary');
    this.button(card, 'RETURN TO LOGIN', 0, -185, 360, 56, () => this.router.back('login'), 'link');
  }

  private beginGildedStage(): Node {
    const stage = new Node('GildedImageAlignedStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(W, H); this.page.addChild(stage);
    const widthScale = SafeAreaAdapter.visibleWidth / W; const heightScale = SafeAreaAdapter.visibleHeight / H; const shortPortrait = SafeAreaAdapter.visibleHeight / SafeAreaAdapter.visibleWidth < H / W;
    const scale = (shortPortrait ? Math.min(widthScale, heightScale) : Math.max(widthScale, heightScale)) * 1.035; stage.setScale(new Vec3(scale, scale, 1)); this.gildedStage = stage; return stage;
  }

  private showHome(): void {
    this.paintBackdrop('home', new Color(62, 10, 18), new Color(158, 37, 35));
    const stage = this.beginGildedStage();
    this.addHomeFortuneCelebration(stage);
    this.gildedTopBar('HOME');
    const welcome = this.panel(stage, 0, 408, 690, 96, 42, new Color(118, 15, 31, 222), new Color(255, 211, 103), 4, false); welcome.name = 'FortuneWelcomeMarquee'; this.addCardShine(welcome, 620, 70, C.paleGold, 0.35);
    this.gildedLabel(welcome, 'FORTUNE WELCOMES YOU', 0, 15, 31, new Color(255, 226, 132), true, 610);
    this.gildedLabel(welcome, 'PICK A LUCKY CABINET • CELEBRATION LIGHTS LIVE', 0, -23, 12, new Color(255, 238, 211), true, 620);

    const positions = [[-255, 92], [255, 112], [-255, -425], [255, -405]] as const;
    const symbols = ['crown', 'guardian', 'seven', 'core'] as const;
    const modes = ['20 LINES • FREE SPINS', '243 WAYS • EXPANDING WILD', '3 REELS • HOLD & NUDGE', '20 LINES • HOLD & SPIN'] as const;
    GAME_CONFIGS.forEach((config, index) => {
      this.addFortuneLobbyCabinet(config, index, positions[index][0], positions[index][1], index === 1 ? 408 : 430, 510, symbols[index], modes[index]);
    });
    this.gildedBottomNav('home');
  }

  private addHomeFortuneCelebration(parent: Node): void {
    const celebration = new Node('HomeFortuneCelebration'); celebration.layer = Layers.Enum.UI_2D; celebration.addComponent(UITransform).setContentSize(W, H); parent.addChild(celebration); celebration.setSiblingIndex(0); const graphics = celebration.addComponent(Graphics);
    graphics.fillColor = new Color(225, 41, 60, 18); graphics.rect(-W / 2, -H / 2, W, H); graphics.fill(); graphics.fillColor = new Color(255, 185, 91, 28); graphics.circle(0, 410, 360); graphics.fill();
    const blush = celebration.addComponent(UIOpacity); blush.opacity = 128; tween(blush).to(2.8, { opacity: 184 }, { easing: 'sineInOut' }).to(3.4, { opacity: 112 }, { easing: 'sineInOut' }).union().repeatForever().start();
    for (let index = 0; index < 18; index += 1) {
      const bulb = new Node(`FortuneWelcomeBulb-${index}`); bulb.layer = Layers.Enum.UI_2D; bulb.addComponent(UITransform).setContentSize(22, 22); bulb.setPosition(-430 + index * (860 / 17), 478); celebration.addChild(bulb); const bulbGraphics = bulb.addComponent(Graphics); const color = index % 3 === 0 ? new Color(255, 97, 119) : index % 3 === 1 ? new Color(255, 220, 126) : new Color(92, 225, 201); bulbGraphics.fillColor = color; bulbGraphics.circle(0, 0, 6); bulbGraphics.fill(); bulbGraphics.strokeColor = new Color(255, 246, 216, 145); bulbGraphics.lineWidth = 2; bulbGraphics.circle(0, 0, 9); bulbGraphics.stroke(); const opacity = bulb.addComponent(UIOpacity); opacity.opacity = 36; tween(opacity).delay(index * 0.07).to(0.22, { opacity: 242 }, { easing: 'quadOut' }).to(0.72, { opacity: 42 }, { easing: 'sineInOut' }).delay(0.4).union().repeatForever().start();
    }
    for (let index = 0; index < 28; index += 1) {
      const mote = new Node(`FortuneLightMote-${index}`); mote.layer = Layers.Enum.UI_2D; const size = 4 + index % 4 * 2; mote.addComponent(UITransform).setContentSize(size * 3, size * 3); mote.setPosition(-490 + (index * 173) % 980, -700 + (index * 239) % 1260); celebration.addChild(mote); const moteGraphics = mote.addComponent(Graphics); const colors = [new Color(255, 211, 104), new Color(255, 91, 117), new Color(76, 222, 198), new Color(255, 241, 210)]; moteGraphics.fillColor = colors[index % colors.length]; if (index % 3 === 0) { moteGraphics.moveTo(0, size); moteGraphics.lineTo(size * 0.28, size * 0.28); moteGraphics.lineTo(size, 0); moteGraphics.lineTo(size * 0.28, -size * 0.28); moteGraphics.lineTo(0, -size); moteGraphics.lineTo(-size * 0.28, -size * 0.28); moteGraphics.lineTo(-size, 0); moteGraphics.lineTo(-size * 0.28, size * 0.28); moteGraphics.close(); } else moteGraphics.circle(0, 0, size * 0.46); moteGraphics.fill(); const opacity = mote.addComponent(UIOpacity); opacity.opacity = 18 + index % 4 * 13; tween(mote).delay(index * 0.09).by(2.4 + index % 5 * 0.25, { position: new Vec3(index % 2 ? -18 : 18, 54 + index % 4 * 12, 0), angle: index % 2 ? -70 : 70 }).by(2.8 + index % 4 * 0.3, { position: new Vec3(index % 2 ? 18 : -18, -54 - index % 4 * 12, 0), angle: index % 2 ? 70 : -70 }).union().repeatForever().start(); tween(opacity).delay(index * 0.11).to(0.45, { opacity: 206 }).to(1.2, { opacity: 22 }).delay(0.55).union().repeatForever().start();
    }
    for (const side of [-1, 1]) { const beam = new Node(`FortuneSpotBeam-${side}`); beam.layer = Layers.Enum.UI_2D; beam.addComponent(UITransform).setContentSize(420, 980); beam.setPosition(side * 350, -130); celebration.addChild(beam); const beamGraphics = beam.addComponent(Graphics); beamGraphics.fillColor = new Color(side < 0 ? 255 : 88, side < 0 ? 118 : 225, side < 0 ? 137 : 202, 13); beamGraphics.moveTo(0, -480); beamGraphics.lineTo(side * -145, 480); beamGraphics.lineTo(side * 145, 480); beamGraphics.close(); beamGraphics.fill(); const opacity = beam.addComponent(UIOpacity); opacity.opacity = 38; tween(beam).delay(side > 0 ? 1.1 : 0).to(3.2, { angle: side * 9 }, { easing: 'sineInOut' }).to(3.6, { angle: side * -7 }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(2.4, { opacity: 76 }).to(2.8, { opacity: 26 }).union().repeatForever().start(); }
  }

  private addFortuneLobbyCabinet(config: GameConfig, index: number, x: number, y: number, width: number, height: number, symbol: string, mode: string): void {
    const specs = [
      { sourceWidth: 498, sourceHeight: 614, reel: [248, 246, 320, 184], marquee: [249, 92] },
      { sourceWidth: 461, sourceHeight: 611, reel: [231, 235, 296, 184], marquee: [231, 80] },
      { sourceWidth: 481, sourceHeight: 590, reel: [241, 211, 305, 188], marquee: [241, 68] },
      { sourceWidth: 479, sourceHeight: 596, reel: [244, 197, 335, 188], marquee: [244, 137] },
    ][index];
    const root = new Node(`FortuneLobbyCabinet-${config.id}`); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(width, height); root.setPosition(x, y); (this.gildedStage ?? this.page).addChild(root);
    const accent = this.themeColor(config.id); const aura = new Node('LobbyCabinetAura'); aura.layer = Layers.Enum.UI_2D; aura.addComponent(UITransform).setContentSize(width * 1.12, height * 0.75); aura.setPosition(0, -height * 0.03); root.addChild(aura); const auraGraphics = aura.addComponent(Graphics); auraGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 38); auraGraphics.circle(0, 0, width * 0.44); auraGraphics.fill(); const auraOpacity = aura.addComponent(UIOpacity); auraOpacity.opacity = 62; tween(auraOpacity).delay(index * 0.27).to(1.8, { opacity: 132 }, { easing: 'sineInOut' }).to(2.2, { opacity: 48 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const body = new Node('LobbyPhysicalCabinetBody'); body.layer = Layers.Enum.UI_2D; body.addComponent(UITransform).setContentSize(width, height); root.addChild(body); const bodySprite = body.addComponent(Sprite); bodySprite.sizeMode = Sprite.SizeMode.CUSTOM; bodySprite.type = Sprite.Type.SIMPLE; this.withCabinetBodyTexture(index, (texture) => { if (!root.isValid || !body.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; bodySprite.spriteFrame = frame; });
    const [reelSourceX, reelSourceY, reelSourceWidth, reelSourceHeight] = specs.reel; const reelWidth = reelSourceWidth / specs.sourceWidth * width; const reelHeight = reelSourceHeight / specs.sourceHeight * height; const reelX = (reelSourceX - specs.sourceWidth / 2) / specs.sourceWidth * width; const reelY = (specs.sourceHeight / 2 - reelSourceY) / specs.sourceHeight * height;
    const clip = new Node('LobbyCabinetLiveScreen'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(reelWidth, reelHeight); clip.setPosition(reelX, reelY); root.addChild(clip); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-reelWidth / 2, -reelHeight / 2, reelWidth, reelHeight, index === 3 ? 22 : 12); stencil.fill(); }
    resources.load(`generated/game0${index + 1}/base_bg_casino_v02/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !clip.isValid) return; const image = new Node('LobbyCabinetThemeArtwork'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); image.setSiblingIndex(0); const frame = new SpriteFrame(); frame.texture = texture; const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(reelWidth / texture.width, reelHeight / texture.height); image.setScale(new Vec3(scale, scale, 1)); image.setPosition(index % 2 ? 6 : -6, 0); tween(image).delay(index * 0.25).to(3.4, { position: new Vec3(index % 2 ? -5 : 5, 4, 0), scale: new Vec3(scale * 1.055, scale * 1.055, 1) }, { easing: 'sineInOut' }).to(3.8, { position: new Vec3(index % 2 ? 6 : -6, 0, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
    const shade = new Node('LobbyCabinetScreenShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(reelWidth, 58); shade.setPosition(0, -reelHeight / 2 + 29); clip.addChild(shade); const shadeGraphics = shade.addComponent(Graphics); shadeGraphics.fillColor = new Color(20, 4, 8, 205); shadeGraphics.rect(-reelWidth / 2, -29, reelWidth, 58); shadeGraphics.fill(); this.addPremiumSymbol(clip, config, symbol, 0, 18, Math.min(82, reelHeight * 0.52), 'pulse', 245, index * 0.14); this.gildedLabel(clip, mode, 0, -reelHeight / 2 + 39, 10, new Color(255, 240, 218), true, reelWidth - 12); this.gildedLabel(clip, 'TAP TO PLAY', 0, -reelHeight / 2 + 17, 10, new Color(255, 205, 105), true, reelWidth - 20);
    const [marqueeSourceX, marqueeSourceY] = specs.marquee; const marqueeX = (marqueeSourceX - specs.sourceWidth / 2) / specs.sourceWidth * width; const marqueeY = (specs.sourceHeight / 2 - marqueeSourceY) / specs.sourceHeight * height; const title = this.gildedLabel(root, config.name, marqueeX, marqueeY, index === 3 ? 16 : 18, index === 1 ? new Color(119, 237, 180) : index === 3 ? new Color(105, 227, 213) : new Color(255, 146, 158), true, width * 0.68); title.node.name = 'LobbyCabinetTitle';
    const scanner = new Node('LobbyScreenScanner'); scanner.layer = Layers.Enum.UI_2D; scanner.addComponent(UITransform).setContentSize(reelWidth * 0.72, 5); scanner.setPosition(-reelWidth, reelHeight * 0.25); clip.addChild(scanner); const scanGraphics = scanner.addComponent(Graphics); scanGraphics.fillColor = new Color(255, 239, 181, 92); scanGraphics.roundRect(-reelWidth * 0.36, -2, reelWidth * 0.72, 4, 2); scanGraphics.fill(); tween(scanner).delay(0.7 + index * 0.4).to(0.95, { position: new Vec3(reelWidth, -reelHeight * 0.18, 0) }, { easing: 'quadInOut' }).call(() => scanner.setPosition(-reelWidth, reelHeight * 0.25)).delay(2.2).union().repeatForever().start();
    for (let lampIndex = 0; lampIndex < 11; lampIndex += 1) { const lamp = new Node(`LobbyBaseChase-${lampIndex}`); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(16, 16); lamp.setPosition(-width * 0.36 + lampIndex * width * 0.072, -height / 2 + 16); root.addChild(lamp); const lampGraphics = lamp.addComponent(Graphics); const lampColor = lampIndex % 3 === 0 ? accent : lampIndex % 3 === 1 ? C.paleGold : new Color(92, 226, 201); lampGraphics.fillColor = lampColor; lampGraphics.circle(0, 0, 4); lampGraphics.fill(); const opacity = lamp.addComponent(UIOpacity); opacity.opacity = 22; tween(opacity).delay(lampIndex * 0.075 + index * 0.22).to(0.18, { opacity: 245 }).to(0.55, { opacity: 24 }).delay(0.35).union().repeatForever().start(); }
    const button = root.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.97; root.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(10); this.vfx?.buttonBurst(root, accent); tween(auraOpacity).to(0.08, { opacity: 220 }).to(0.25, { opacity: 84 }).start(); }, this); root.on(Node.EventType.TOUCH_END, () => { this.selectedGame = config; this.router.go('game-loading'); }, this);
  }

  private addCasinoPageVeil(accent: Color): void {
    const stage = new Node('LuxuryCasinoPageStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(W, H); this.page.addChild(stage); stage.setSiblingIndex(0); const graphics = stage.addComponent(Graphics);
    graphics.fillColor = new Color(75, 24, 28, 92); graphics.roundRect(-510, -760, 1020, 1430, 58); graphics.fill();
    graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 72); graphics.lineWidth = 5; graphics.roundRect(-496, -748, 992, 1406, 50); graphics.stroke();
    graphics.fillColor = new Color(255, 236, 201, 40); graphics.moveTo(-420, -710); graphics.lineTo(420, -710); graphics.lineTo(285, 610); graphics.lineTo(-285, 610); graphics.close(); graphics.fill();
    for (const side of [-1, 1]) { graphics.fillColor = new Color(112, 33, 45, 174); graphics.roundRect(side * 474 - 32, -720, 64, 1340, 28); graphics.fill(); graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 118); graphics.lineWidth = 4; graphics.roundRect(side * 474 - 25, -706, 50, 1312, 22); graphics.stroke(); }
    const glow = new Node('PageStageGlow'); glow.layer = Layers.Enum.UI_2D; glow.addComponent(UITransform).setContentSize(760, 760); glow.setPosition(0, 210); stage.addChild(glow); const glowGraphics = glow.addComponent(Graphics); glowGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 22); glowGraphics.circle(0, 0, 340); glowGraphics.fill(); const opacity = glow.addComponent(UIOpacity); opacity.opacity = 88; tween(opacity).to(3.1, { opacity: 150 }, { easing: 'sineInOut' }).to(3.8, { opacity: 74 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private addCasinoMarquee(title: string, subtitle: string, y: number, accent: Color, leftArt: readonly [GameConfig, string], rightArt: readonly [GameConfig, string]): Node {
    const marquee = new Node('CasinoPageMarquee'); marquee.layer = Layers.Enum.UI_2D; marquee.addComponent(UITransform).setContentSize(940, 162); marquee.setPosition(0, y); this.page.addChild(marquee); const graphics = marquee.addComponent(Graphics);
    graphics.fillColor = new Color(238, 205, 151, 252); graphics.roundRect(-470, -81, 940, 162, 54); graphics.fill(); graphics.fillColor = new Color(123, 31, 46, 250); graphics.roundRect(-449, -62, 898, 124, 40); graphics.fill(); graphics.fillColor = new Color(255, 231, 190, 38); graphics.roundRect(-425, 10, 850, 34, 16); graphics.fill(); graphics.strokeColor = C.gold; graphics.lineWidth = 7; graphics.roundRect(-463, -74, 926, 148, 48); graphics.stroke(); graphics.strokeColor = new Color(255, 242, 212, 155); graphics.lineWidth = 2; graphics.roundRect(-439, -54, 878, 108, 35); graphics.stroke();
    for (let index = 0; index < 14; index += 1) { for (const edge of [-1, 1]) { const bulb = new Node(`PageMarqueeBulb-${edge}-${index}`); bulb.layer = Layers.Enum.UI_2D; bulb.addComponent(UITransform).setContentSize(18, 18); bulb.setPosition(-405 + index * (810 / 13), edge * 66); marquee.addChild(bulb); const bulbGraphics = bulb.addComponent(Graphics); bulbGraphics.fillColor = index % 4 === 0 ? accent : C.paleGold; bulbGraphics.circle(0, 0, 6); bulbGraphics.fill(); bulbGraphics.strokeColor = new Color(117, 72, 28, 220); bulbGraphics.lineWidth = 2; bulbGraphics.circle(0, 0, 8); bulbGraphics.stroke(); const bulbOpacity = bulb.addComponent(UIOpacity); bulbOpacity.opacity = 132 + index % 3 * 18; tween(bulbOpacity).delay(index * 0.06 + (edge > 0 ? 0.3 : 0)).to(2.1, { opacity: 238 }, { easing: 'sineInOut' }).to(2.5, { opacity: 118 }, { easing: 'sineInOut' }).union().repeatForever().start(); } }
    this.addPremiumSymbol(marquee, leftArt[0], leftArt[1], -382, 0, 96, 'pulse', 248, 0.1); this.addPremiumSymbol(marquee, rightArt[0], rightArt[1], 382, 0, 96, 'pulse', 248, 0.3);
    this.label(marquee, title, 0, 18, 37, C.paleGold, true, 620); this.label(marquee, subtitle, 0, -27, 15, C.white, true, 650); this.addCardShine(marquee, 820, 104, C.paleGold, 1.2); return marquee;
  }

  private addLuxuryShowcaseCard(parent: Node, title: string, detail: string, x: number, y: number, width: number, height: number, accent: Color, art: readonly [GameConfig, string], actionText: string, action: () => void, featured = false): Node {
    const card = new Node(`LuxuryShowcase-${title}`); card.layer = Layers.Enum.UI_2D; card.addComponent(UITransform).setContentSize(width, height); card.setPosition(x, y); parent.addChild(card); const graphics = card.addComponent(Graphics);
    graphics.fillColor = new Color(242, 215, 172, 250); graphics.roundRect(-width / 2, -height / 2, width, height, 34); graphics.fill(); graphics.fillColor = featured ? new Color(118, 31, 48, 252) : new Color(255, 241, 216, 247); graphics.roundRect(-width / 2 + 13, -height / 2 + 13, width - 26, height - 26, 26); graphics.fill(); graphics.fillColor = new Color(accent.r, accent.g, accent.b, featured ? 74 : 28); graphics.roundRect(-width / 2 + 25, -height / 2 + 25, width - 50, height - 50, 20); graphics.fill(); graphics.strokeColor = new Color(255, 238, 201, 210); graphics.lineWidth = 3; graphics.roundRect(-width / 2 + 19, -height / 2 + 19, width - 38, height - 38, 23); graphics.stroke(); graphics.strokeColor = C.gold; graphics.lineWidth = 5; graphics.roundRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, 30); graphics.stroke();
    const header = new Node('ShowcaseHeader'); header.layer = Layers.Enum.UI_2D; header.addComponent(UITransform).setContentSize(width - 42, 60); header.setPosition(0, height / 2 - 47); card.addChild(header); const headerGraphics = header.addComponent(Graphics); headerGraphics.fillColor = featured ? new Color(86, 20, 35, 246) : new Color(128, 35, 48, 246); headerGraphics.roundRect(-(width - 42) / 2, -28, width - 42, 56, 21); headerGraphics.fill(); headerGraphics.strokeColor = C.paleGold; headerGraphics.lineWidth = 2; headerGraphics.roundRect(-(width - 42) / 2 + 3, -25, width - 48, 50, 18); headerGraphics.stroke(); this.label(header, title, 0, 0, width < 320 ? 19 : 23, C.paleGold, true, width - 66);
    const shelf = new Node('ShowcaseShelf'); shelf.layer = Layers.Enum.UI_2D; shelf.addComponent(UITransform).setContentSize(width - 72, 48); shelf.setPosition(0, -height * 0.08); card.addChild(shelf); const shelfGraphics = shelf.addComponent(Graphics); shelfGraphics.fillColor = new Color(98, 54, 31, 112); shelfGraphics.roundRect(-(width - 72) / 2, -12, width - 72, 24, 12); shelfGraphics.fill(); shelfGraphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 150); shelfGraphics.lineWidth = 3; shelfGraphics.moveTo(-(width - 82) / 2, 0); shelfGraphics.lineTo((width - 82) / 2, 0); shelfGraphics.stroke();
    this.addPremiumSymbol(card, art[0], art[1], 0, height * 0.075, Math.min(width * 0.52, height * 0.4), 'pulse', 255, 0.1); this.label(card, detail, 0, -height / 2 + 102, width < 320 ? 15 : 17, featured ? C.white : new Color(107, 65, 42), true, width - 52);
    this.physicalMachineButton(card, actionText, 0, -height / 2 + 45, Math.min(width - 62, 235), 58, action, featured ? 0 : 3, accent, featured ? 'toggle-on' : 'service');
    for (const corner of [new Vec3(-width / 2 + 22, height / 2 - 22), new Vec3(width / 2 - 22, height / 2 - 22), new Vec3(-width / 2 + 22, -height / 2 + 22), new Vec3(width / 2 - 22, -height / 2 + 22)]) { const jewel = new Node('ShowcaseCornerJewel'); jewel.layer = Layers.Enum.UI_2D; jewel.addComponent(UITransform).setContentSize(20, 20); jewel.setPosition(corner); card.addChild(jewel); const jewelGraphics = jewel.addComponent(Graphics); jewelGraphics.fillColor = accent; jewelGraphics.circle(0, 0, 6); jewelGraphics.fill(); jewelGraphics.strokeColor = C.paleGold; jewelGraphics.lineWidth = 2; jewelGraphics.circle(0, 0, 9); jewelGraphics.stroke(); }
    if (height > 520) { this.addCardMotes(card, 8, accent, width - 60, height - 130); for (const side of [-1, 1]) { const lamp = new Node(`TallShowcaseLamp-${side}`); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(34, 110); lamp.setPosition(side * (width / 2 - 37), -height * 0.16); card.addChild(lamp); const lampGraphics = lamp.addComponent(Graphics); lampGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 54); lampGraphics.roundRect(-11, -45, 22, 90, 11); lampGraphics.fill(); lampGraphics.strokeColor = C.gold; lampGraphics.lineWidth = 2; lampGraphics.roundRect(-11, -45, 22, 90, 11); lampGraphics.stroke(); const lampOpacity = lamp.addComponent(UIOpacity); lampOpacity.opacity = 72; tween(lampOpacity).delay(side > 0 ? 0.45 : 0).to(2.2, { opacity: 154 }).to(2.8, { opacity: 60 }).union().repeatForever().start(); } }
    this.addCardShine(card, width - 38, height - 38, C.paleGold, featured ? 0.6 : 1.7); return card;
  }

  private addCasinoLobbyAtmosphere(parent: Node): void {
    const atmosphere = new Node('CasinoLobbyAtmosphere'); atmosphere.layer = Layers.Enum.UI_2D; atmosphere.addComponent(UITransform).setContentSize(W, H); parent.addChild(atmosphere); atmosphere.setSiblingIndex(0);
    const architecture = atmosphere.addComponent(Graphics);
    architecture.fillColor = new Color(44, 24, 16, 186); architecture.rect(-W / 2, -H / 2, W, 650); architecture.fill();
    architecture.fillColor = new Color(105, 24, 39, 172); architecture.moveTo(-360, -H / 2); architecture.lineTo(360, -H / 2); architecture.lineTo(142, 250); architecture.lineTo(-142, 250); architecture.close(); architecture.fill();
    architecture.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 82); architecture.lineWidth = 7; architecture.moveTo(-330, -H / 2); architecture.lineTo(-122, 250); architecture.moveTo(330, -H / 2); architecture.lineTo(122, 250); architecture.stroke();
    for (const side of [-1, 1]) {
      architecture.fillColor = new Color(85, 49, 29, 160); architecture.roundRect(side * 420 - 82, -690, 164, 1420, 38); architecture.fill();
      architecture.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 72); architecture.lineWidth = 4; architecture.roundRect(side * 420 - 66, -660, 132, 1360, 30); architecture.stroke();
      architecture.fillColor = new Color(118, 24, 42, 118); architecture.roundRect(side * 420 - 44, -530, 88, 1020, 30); architecture.fill();
    }
    const lampPositions = [new Vec3(-442, 710), new Vec3(442, 710), new Vec3(-474, 235), new Vec3(474, 235)];
    lampPositions.forEach((position, index) => {
      const lamp = new Node(`LobbyWallLamp-${index}`); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(128, 164); lamp.setPosition(position); atmosphere.addChild(lamp); const graphics = lamp.addComponent(Graphics);
      graphics.fillColor = new Color(255, 211, 133, 22); graphics.circle(0, 18, 60); graphics.fill(); graphics.fillColor = new Color(105, 65, 34, 242); graphics.roundRect(-9, -62, 18, 60, 8); graphics.fill();
      graphics.fillColor = new Color(255, 230, 176, 225); graphics.moveTo(-34, 35); graphics.lineTo(34, 35); graphics.lineTo(19, -8); graphics.lineTo(-19, -8); graphics.close(); graphics.fill(); graphics.strokeColor = C.gold; graphics.lineWidth = 4; graphics.moveTo(-34, 35); graphics.lineTo(34, 35); graphics.lineTo(19, -8); graphics.lineTo(-19, -8); graphics.close(); graphics.stroke();
      const opacity = lamp.addComponent(UIOpacity); opacity.opacity = 118 + index * 9; tween(opacity).delay(index * 0.34).to(2.8, { opacity: 176 }, { easing: 'sineInOut' }).to(3.4, { opacity: 112 }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
    for (const side of [-1, 1]) {
      const rope = new Node(`VelvetRope-${side}`); rope.layer = Layers.Enum.UI_2D; rope.addComponent(UITransform).setContentSize(350, 180); rope.setPosition(side * 365, -690); atmosphere.addChild(rope); const graphics = rope.addComponent(Graphics);
      graphics.fillColor = C.gold; graphics.circle(side * -92, 52, 14); graphics.fill(); graphics.roundRect(side * -99 - 8, -62, 16, 116, 8); graphics.fill(); graphics.strokeColor = new Color(146, 31, 49, 190); graphics.lineWidth = 13; graphics.arc(0, 74, 108, side < 0 ? 3.2 : -0.06, side < 0 ? 4.82 : 1.62, side > 0); graphics.stroke();
    }
  }

  private addMiniSlotControlDeck(parent: Node, index: number): void {
    const mediaWidth = 438; const mediaHeight = 318; const frameIndex = index === 0 ? 4 : index; const insets = this.visualSurfaceInsets(mediaWidth, mediaHeight, frameIndex, false, { width: 482, height: 364 });
    const deckWidth = Math.max(250, mediaWidth - insets.left - insets.right - 28); const deckHeight = 48; const apertureBottom = -mediaHeight / 2 + insets.bottom; const deckY = apertureBottom + deckHeight / 2 + 5;
    const fills = [new Color(124, 28, 47, 244), new Color(118, 76, 24, 244), new Color(92, 20, 34, 244), new Color(42, 91, 79, 244)]; const accents = [new Color(238, 94, 118), C.gold, new Color(255, 112, 128), C.cyan];
    const deck = new Node(`MiniSlotControlDeck-${index}`); deck.layer = Layers.Enum.UI_2D; deck.addComponent(UITransform).setContentSize(deckWidth, deckHeight); deck.setPosition(0, deckY); parent.addChild(deck); const frameSibling = parent.children.findIndex((child) => child.name.startsWith('PanelImageBorder-')); if (frameSibling >= 0) deck.setSiblingIndex(frameSibling);
    const graphics = deck.addComponent(Graphics); graphics.fillColor = new Color(239, 214, 173, 246); graphics.roundRect(-deckWidth / 2, -deckHeight / 2, deckWidth, deckHeight, 18); graphics.fill(); graphics.fillColor = fills[index]; graphics.roundRect(-deckWidth / 2 + 7, -deckHeight / 2 + 7, deckWidth - 14, deckHeight - 14, 13); graphics.fill(); graphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 190); graphics.lineWidth = 2; graphics.roundRect(-deckWidth / 2 + 7, -deckHeight / 2 + 7, deckWidth - 14, deckHeight - 14, 13); graphics.stroke();
    const labels = [['ROYAL', 'LINES'], ['243', 'WAYS'], ['HOLD', 'NUDGE'], ['HOLD', 'SPIN']][index];
    labels.forEach((copy, lightIndex) => { const light = new Node(`MiniStatus-${lightIndex}`); light.layer = Layers.Enum.UI_2D; light.addComponent(UITransform).setContentSize(82, 30); light.setPosition(-deckWidth / 2 + 67 + lightIndex * 94, 0); deck.addChild(light); const lightGraphics = light.addComponent(Graphics); lightGraphics.fillColor = new Color(accents[index].r, accents[index].g, accents[index].b, lightIndex === 0 ? 205 : 120); lightGraphics.roundRect(-38, -12, 76, 24, 10); lightGraphics.fill(); this.label(light, copy, 0, 0, 11, C.white, true, 70); });
    const coinSlot = new Node('MiniCoinSlot'); coinSlot.layer = Layers.Enum.UI_2D; coinSlot.addComponent(UITransform).setContentSize(58, 30); coinSlot.setPosition(deckWidth / 2 - 92, 0); deck.addChild(coinSlot); const coinGraphics = coinSlot.addComponent(Graphics); coinGraphics.fillColor = new Color(25, 16, 11); coinGraphics.roundRect(-26, -6, 52, 12, 6); coinGraphics.fill(); coinGraphics.strokeColor = C.gold; coinGraphics.lineWidth = 2; coinGraphics.roundRect(-26, -6, 52, 12, 6); coinGraphics.stroke();
    const spin = new Node('MiniSpinLamp'); spin.layer = Layers.Enum.UI_2D; spin.addComponent(UITransform).setContentSize(44, 44); spin.setPosition(deckWidth / 2 - 32, 0); deck.addChild(spin); const spinGraphics = spin.addComponent(Graphics); spinGraphics.fillColor = new Color(accents[index].r, accents[index].g, accents[index].b, 218); spinGraphics.circle(0, 0, 14); spinGraphics.fill(); spinGraphics.fillColor = new Color(255, 255, 255, 80); spinGraphics.circle(-4, 5, 5); spinGraphics.fill(); spinGraphics.strokeColor = C.paleGold; spinGraphics.lineWidth = 3; spinGraphics.circle(0, 0, 17); spinGraphics.stroke(); const opacity = spin.addComponent(UIOpacity); opacity.opacity = 142; tween(opacity).delay(index * 0.42).to(2.2, { opacity: 220 }, { easing: 'sineInOut' }).to(2.6, { opacity: 128 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private showStore(): void {
    const player = this.ensurePlayer(); const guest = player.isGuest;
    this.paintBackdrop('store', new Color(8, 8, 7), new Color(28, 22, 12)); const stage = this.beginGildedStage(); this.gildedTopBar('STORE');
    this.gildedLabel(stage, 'JEWEL EXCHANGE', 0, 634, 33, C.paleGold, true, 570);
    this.gildedLabel(stage, guest ? 'GUEST VIEW • SIGN IN TO ADD CREDITS' : 'CURATED TREASURES • LOCAL DEMO CREDITS', 0, 599, 13, guest ? new Color(232, 172, 115) : new Color(195, 213, 188), true, 650);
    DEMO_PRODUCTS.forEach((product, index) => {
      const displayNames = ['GOLDEN CHALICE', 'JEWEL CASKET', 'PEARL CHEST', 'IMPERIAL VAULT']; const accents = [new Color(102, 199, 143), new Color(220, 77, 104), new Color(239, 219, 183), new Color(81, 143, 219)];
      const column = index % 2; const row = Math.floor(index / 2); const x = column ? 250 : -250; const titleY = row ? -517 : 157; const amountY = row ? -590 : 84; const actionY = row ? -673 : 7;
      this.gildedLabel(stage, displayNames[index], x, titleY, 21, C.paleGold, true, 365);
      this.gildedLabel(stage, `${this.format(product.credits)}  +  ${this.format(product.bonus)} BONUS`, x, amountY, 15, new Color(236, 226, 207), true, 355);
      this.gildedAction(stage, guest ? 'SIGN IN' : 'ADD CREDITS', x, actionY, 286, 68, () => {
        if (guest) { this.toast('Guest accounts cannot add Store credits. Sign in or create an account.', C.red); this.router.go('login'); return; }
        const purchased = this.bootstrap.store.demoPurchase(product.id);
        if (!purchased) { this.toast('Unable to add demo credits', C.red); return; }
        this.vfx.flyCredits(new Vec3(x, actionY, 0), new Vec3(330, 790, 0), () => this.refreshBalance()); this.toast('Local demo credits added', C.green);
      }, accents[index], 16, index === 3);
    });
    this.gildedBottomNav('store');
  }

  private showRewards(): void {
    this.paintBackdrop('rewards', new Color(9, 7, 6), new Color(34, 24, 13)); const stage = this.beginGildedStage(); this.gildedTopBar('REWARDS');
    this.gildedLabel(stage, 'FORTUNE REWARD GALLERY', 0, 672, 31, C.paleGold, true, 650);
    this.gildedLabel(stage, 'FOUR LIVE EXPERIENCES • COLLECT AND RETURN DAILY', 0, 636, 13, new Color(208, 199, 182), true, 690);
    const cards: readonly [string, string, string, Route, Color][] = [
      ['7-DAY TREASURE', 'DAILY GEMS • GRAND DAY-SEVEN CHEST', 'OPEN', 'check-in', new Color(204, 73, 95)],
      ['FORTUNE WHEEL', 'ONE FREE LOCAL SPIN EVERY DAY', 'SPIN', 'wheel', new Color(216, 157, 54)],
      ['TROPHY GALLERY', 'PROGRESS REWARDS ACROSS FOUR CABINETS', 'VIEW', 'achievements', new Color(124, 174, 116)],
      ['SESSION VAULT', 'NEXT LOCAL GIFT READY IN 04:28', 'CLAIM', 'rewards', new Color(91, 176, 150)],
    ];
    cards.forEach(([title, body, action, route, color], index) => {
      const column = index % 2; const row = Math.floor(index / 2); const x = column ? 250 : -250; const titleY = row ? -126 : 548; const detailY = row ? -558 : 103; const actionY = row ? -674 : -8;
      this.gildedLabel(stage, title, x, titleY, 20, C.paleGold, true, 360);
      this.gildedLabel(stage, body, x, detailY, 13, new Color(231, 222, 204), true, 365);
      this.gildedAction(stage, action, x, actionY, 286, 68, () => route === 'rewards' ? this.toast('Next local session gift: 04:28', C.green) : this.router.go(route), color, 17, index === 0);
    });
    this.gildedBottomNav('rewards');
  }

  private showRank(tab: 'daily' | 'weekly' | 'all-time'): void {
    this.rankTab = tab; this.paintBackdrop('rank', new Color(8, 8, 7), new Color(28, 22, 12)); const stage = this.beginGildedStage(); this.gildedTopBar('RANK');
    this.gildedLabel(stage, 'CHAMPIONS HALL', 0, 632, 33, C.paleGold, true, 600);
    this.gildedLabel(stage, 'LOCAL TOURNAMENT • VIRTUAL-CREDIT LEADERBOARD', 0, 594, 13, new Color(207, 198, 181), true, 680);
    const tabs: readonly [typeof tab, string][] = [['daily', 'DAILY'], ['weekly', 'WEEKLY'], ['all-time', 'ALL TIME']];
    tabs.forEach(([id, text], index) => this.gildedAction(stage, text, -300 + index * 300, 440, 238, 62, () => { if (id === this.rankTab) return; this.rankTab = id; this.render('rank'); }, id === tab ? new Color(226, 78, 104) : C.paleGold, 16, id === tab));
    const rows = this.bootstrap.rank.list(tab, this.bootstrap.profile.current()).slice(0, 8);
    const podiumOrder = [1, 0, 2]; const podiumX = [-280, 0, 280]; const portraitY = [191, 260, 191]; const portraitSize = [154, 184, 154]; const nameY = [73, 105, 73]; const scoreY = [-39, -9, -39];
    podiumOrder.forEach((entryIndex, column) => {
      const entry = rows[entryIndex]; if (!entry) return; const x = podiumX[column];
      this.addGildedPortrait(stage, x, portraitY[column], entry.avatar, portraitSize[column]);
      this.gildedLabel(stage, `#${entry.rank}  ${entry.nickname}`, x, nameY[column], column === 1 ? 18 : 16, C.paleGold, true, 235);
      this.gildedLabel(stage, this.format(entry.score), x, scoreY[column], column === 1 ? 22 : 19, column === 1 ? new Color(255, 212, 105) : C.white, true, 215);
    });
    rows.slice(3, 8).forEach((entry, listIndex) => {
      const y = -248 - listIndex * 109; this.addGildedPortrait(stage, -356, y, entry.avatar, 68);
      this.gildedLabel(stage, `#${entry.rank}`, -316, y - 24, 12, entry.current ? C.cyan : C.paleGold, true, 74);
      this.gildedLabel(stage, entry.nickname, -83, y + 11, 18, C.white, true, 390);
      this.gildedLabel(stage, entry.current ? 'YOU • LOCAL PLAYER' : `${tab.toUpperCase()} CHALLENGER`, -83, y - 17, 12, entry.current ? C.cyan : new Color(181, 173, 159), false, 390);
      this.gildedLabel(stage, this.format(entry.score), 296, y, 19, entry.current ? C.cyan : C.paleGold, true, 210);
    });
    this.gildedBottomNav('rank');
  }

  private showProfile(): void {
    const jade = new Color(90, 188, 146); this.paintBackdrop('profile', new Color(8, 8, 7), new Color(29, 23, 13)); const stage = this.beginGildedStage(); this.gildedTopBar('PROFILE');
    this.gildedLabel(stage, 'IMPERIAL CLUB CONSOLE', 0, 644, 31, C.paleGold, true, 640);
    this.gildedLabel(stage, 'PRIVATE MEMBER SALON • CABINET HISTORY • TROPHIES', 0, 607, 13, new Color(205, 198, 182), true, 700);
    const player = this.ensurePlayer(); this.addConciergePortrait(stage, (player.avatar + 2) % 4, -272, 328, 318, 388);
    this.gildedLabel(stage, player.nickname, 197, 494, 29, C.paleGold, true, 420);
    this.gildedLabel(stage, player.isGuest ? 'GUEST PLAYER • STORE LOCKED' : 'IMPERIAL CLUB MEMBER', 197, 404, 15, player.isGuest ? new Color(226, 155, 106) : jade, true, 420);
    this.gildedLabel(stage, `MEMBER ID  ${player.id.slice(-10).toUpperCase()}`, 197, 310, 15, C.white, false, 420);
    this.gildedLabel(stage, `LEVEL ${player.level}  •  ${player.experience % 100}% TO NEXT`, 197, 215, 17, C.paleGold, true, 420);
    const stats = [['SPINS', player.gamesPlayed], ['BIGGEST WIN', player.biggestWin], ['TOTAL WIN', player.totalWin]] as const;
    const statArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'orrery'], [GAME_CONFIGS[0], 'crown'], [GAME_CONFIGS[3], 'bonus']]; stats.forEach(([name, value], index) => { const x = -292 + index * 292; this.addPremiumSymbol(stage, statArt[index][0], statArt[index][1], x, -9, 62, 'pulse', 238, index * 0.15); this.gildedLabel(stage, this.format(value), x, -54, 20, C.paleGold, true, 170); this.gildedLabel(stage, name, x, -79, 11, new Color(203, 195, 180), true, 170); });
    const entries: readonly [string, string, Route, Color][] = [
      ['ACHIEVEMENTS', `${this.bootstrap.redDots.achievements()} READY`, 'achievements', C.violet], ['INBOX', `${this.bootstrap.redDots.mail()} UNREAD`, 'mail', C.cyan], ['SETTINGS', player.settings.quality.toUpperCase(), 'settings', C.gold],
    ];
    const entryArt: readonly (readonly [GameConfig, string])[] = [[GAME_CONFIGS[1], 'seal'], [GAME_CONFIGS[3], 'rover'], [GAME_CONFIGS[0], 'orrery']]; entries.forEach(([title, detail, route, color], index) => { const y = -233 - index * 143; this.addPremiumSymbol(stage, entryArt[index][0], entryArt[index][1], -414, y, 62, index === 2 ? 'orbit' : 'pulse', 238, index * 0.12); this.gildedLabel(stage, title, -76, y + 13, 20, C.white, true, 430); this.gildedLabel(stage, detail, -76, y - 17, 13, new Color(191, 183, 169), false, 430); this.gildedAction(stage, 'OPEN', 365, y, 178, 62, () => this.router.go(route), color, 16); });
    this.gildedAction(stage, 'CHANGE PORTRAIT', -178, -660, 280, 62, () => { this.bootstrap.profile.setAvatar((player.avatar + 1) % 12); this.render('profile'); }, jade, 14);
    this.gildedAction(stage, 'LOG OUT', 178, -660, 280, 62, () => { this.bootstrap.auth.logout(); this.router.reset('login'); }, new Color(218, 74, 98), 16);
    this.gildedBottomNav('profile');
  }

  private showCheckIn(): void {
    this.paintBackdrop('rewards', C.ink, new Color(86, 44, 18)); this.header('7-DAY TREASURE CHECK-IN', true);
    this.label(this.page, 'Build your constellation one day at a time', 0, 630, 23, C.muted);
    const state = this.bootstrap.save.currentScope()?.checkIn ?? { cycleDay: 0, lastClaimDate: null };
    for (let index = 0; index < 7; index += 1) {
      const row = index < 4 ? 0 : 1; const column = row === 0 ? index : index - 4; const count = row === 0 ? 4 : 3;
      const x = (column - (count - 1) / 2) * (row === 0 ? 250 : 305); const y = row === 0 ? 300 : -40;
      const claimed = index < state.cycleDay; const current = index === state.cycleDay;
      const card = this.panel(this.page, x, y, row === 0 ? 210 : 260, 285, 24, current ? new Color(68, 58, 28) : C.panel, current ? C.gold : new Color(112, 80, 36), current ? 4 : 1);
      this.label(card, `DAY ${index + 1}`, 0, 58, 19, current ? C.paleGold : C.muted, true); this.addPremiumSymbol(card, index === 6 ? GAME_CONFIGS[0] : GAME_CONFIGS[3], index === 6 ? 'crown' : 'bonus', 0, 5, index === 6 ? 74 : 62, current ? 'pulse' : 'none', claimed ? 120 : 245, index * 0.06);
      this.label(card, `+${this.format(this.bootstrap.checkIn.rewards[index])}`, 0, -42, 21, C.white, true); if (claimed) this.label(card, '✓ CLAIMED', 0, -67, 15, C.green, true);
    }
    this.button(this.page, 'CLAIM TODAY', 0, -360, 650, 92, () => { const result = this.bootstrap.checkIn.claimToday(this.today()); this.toast(result.ok ? `Day ${result.day}: +${this.format(result.amount)} demo credits` : 'Today is already claimed', result.ok ? C.green : C.muted); if (result.ok) this.vfx.flyCredits(new Vec3(0, -360), new Vec3(330, 790), () => this.showCheckIn()); }, 'primary');
    this.button(this.page, 'DEMO MAKE-UP', 0, -475, 360, 56, () => this.toast('Make-up is a visual demo only', C.muted), 'ghost');
  }

  private showWheel(): void {
    this.paintBackdrop('wheel', C.ink, new Color(74, 39, 15)); this.header('FORTUNE WHEEL', true);
    this.label(this.page, '1 FREE LOCAL SPIN DAILY', 0, 625, 23, C.cyan, true);
    const wheel = new Node('Wheel'); wheel.layer = Layers.Enum.UI_2D; wheel.addComponent(UITransform).setContentSize(760, 760); wheel.setPosition(0, 110); this.page.addChild(wheel);
    const graphics = wheel.addComponent(Graphics);
    for (let index = 0; index < 8; index += 1) { graphics.moveTo(0, 0); graphics.fillColor = index % 2 ? new Color(98, 56, 16) : new Color(113, 17, 38); graphics.arc(0, 0, 350, Math.PI * 2 * index / 8, Math.PI * 2 * (index + 1) / 8, false); graphics.close(); graphics.fill(); }
    graphics.strokeColor = C.gold; graphics.lineWidth = 10; graphics.circle(0, 0, 350); graphics.stroke();
    this.bootstrap.wheel.sectors.forEach((value, index) => { const angle = Math.PI * 2 * (index + 0.5) / 8; this.label(wheel, this.format(value), Math.cos(angle) * 245, Math.sin(angle) * 245, 23, C.white, true, 150); });
    this.addPremiumSymbol(wheel, GAME_CONFIGS[0], 'orrery', 0, 0, 190, 'orbit', 245);
    const pointer = this.label(this.page, '▼', 0, 500, 62, C.gold, true); pointer.node.setScale(new Vec3(1.2, 1.2, 1));
    this.label(this.page, `FREE SPINS LEFT: ${this.bootstrap.save.currentScope()?.wheel.remaining ?? 0}`, 0, -345, 22, C.muted);
    this.button(this.page, 'SPIN THE WHEEL', 0, -455, 650, 92, () => {
      const prepared = this.bootstrap.wheel.prepare(this.today());
      if (!prepared) return this.toast('No free spins remaining today', C.muted);
      const target = 360 * 6 + (360 - prepared.sector * 45 - 22.5);
      tween(wheel).by(0.4, { angle: 180 }, { easing: 'quadIn' }).by(1.4, { angle: target - 360 }, { easing: 'linear' }).by(1.2, { angle: 180 }, { easing: 'quartOut' }).call(() => { const ok = this.bootstrap.wheel.settle(prepared.spinId); this.toast(ok ? `Wheel reward: +${this.format(prepared.amount)} demo credits` : 'Reward already settled', ok ? C.gold : C.muted); this.refreshBalance(); }).start();
    }, 'primary');
  }

  private showAchievements(): void {
    this.paintBackdrop('profile', C.ink, new Color(82, 39, 24)); this.header('ACHIEVEMENTS', true);
    this.label(this.page, 'ALL   •   SPIN   •   WIN   •   FEATURE', 0, 650, 21, C.muted);
    ACHIEVEMENTS.forEach((achievement, index) => {
      const y = 455 - index * 290; const state = this.bootstrap.achievements.state(achievement.id);
      const ready = state.progress >= achievement.target && !state.claimed; const card = this.panel(this.page, 0, y, 900, 240, 28, C.panel2, ready ? C.gold : new Color(108, 75, 34), ready ? 3 : 1);
      this.addPremiumSymbol(card, GAME_CONFIGS[1], 'seal', -350, 4, 74, ready ? 'pulse' : 'none', ready ? 255 : 145, index * 0.08); this.label(card, achievement.title, -165, 32, 25, C.white, true, 420); this.label(card, `${state.progress} / ${achievement.target}`, -165, -2, 18, C.muted, false, 420); this.progress(card, -90, -42, 480, Math.min(1, state.progress / achievement.target));
      this.label(card, `+${this.format(achievement.reward)}`, 315, 32, 18, C.paleGold, true);
      this.button(card, state.claimed ? 'CLAIMED' : ready ? 'CLAIM' : 'LOCKED', 315, -35, 200, 60, () => { const ok = this.bootstrap.achievements.claim(achievement.id); this.toast(ok ? 'Achievement reward collected' : 'Achievement is not ready', ok ? C.green : C.muted); }, ready ? 'primary' : 'ghost');
    });
  }

  private showMail(): void {
    this.paintBackdrop('profile', C.ink, new Color(62, 42, 18)); this.header('INBOX', true);
    this.button(this.page, 'CLAIM ALL', 250, 650, 300, 62, () => { const amount = this.bootstrap.mail.claimAll(); this.toast(amount ? `Collected ${this.format(amount)} demo credits` : 'No attachments available', amount ? C.green : C.muted); }, 'secondary');
    DEMO_MAIL.forEach((mail, index) => {
      const state = this.bootstrap.mail.state(mail.id); if (state.deleted) return; const y = 420 - index * 310;
      const card = this.panel(this.page, 0, y, 900, 260, 28, state.read ? C.panel : new Color(51, 47, 26), state.read ? new Color(106, 77, 36) : C.cyan, state.read ? 1 : 3);
      if (mail.kind === 'reward') this.addPremiumSymbol(card, GAME_CONFIGS[3], 'bonus', -345, 18, 70, 'pulse', state.read ? 145 : 250); else this.label(card, '✉', -345, 18, 34, state.read ? C.muted : C.cyan); this.label(card, mail.title, -135, 42, 25, C.white, true, 480); this.label(card, mail.body, -110, 2, 18, C.muted, false, 540); if (mail.credits) this.label(card, `ATTACHMENT  +${this.format(mail.credits)} CREDITS`, -115, -48, 17, C.paleGold, true, 520);
      this.button(card, mail.credits ? (state.claimed ? 'CLAIMED' : 'CLAIM') : 'MARK READ', 315, -50, 210, 58, () => { this.bootstrap.mail.read(mail.id); const ok = mail.credits ? this.bootstrap.mail.claim(mail.id) : true; this.toast(ok ? 'Message updated' : 'Attachment already collected', ok ? C.green : C.muted); }, state.claimed ? 'ghost' : 'secondary');
    });
    this.button(this.page, 'DELETE READ', 0, -610, 320, 58, () => { this.bootstrap.mail.deleteRead(); this.showMail(); }, 'ghost');
  }

  private showSettings(): void {
    this.paintBackdrop('profile', C.ink, new Color(72, 41, 16)); this.header('SETTINGS', true); const player = this.ensurePlayer();
    const rows: readonly [string, string, () => void][] = [
      ['MUSIC', player.settings.music ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ music: !player.settings.music }); this.showSettings(); }],
      ['SOUND EFFECTS', player.settings.sound ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ sound: !player.settings.sound }); this.showSettings(); }],
      ['VIBRATION', player.settings.vibration ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ vibration: !player.settings.vibration }); this.showSettings(); }],
      ['QUALITY', player.settings.quality.toUpperCase(), () => { const next = player.settings.quality === 'low' ? 'medium' : player.settings.quality === 'medium' ? 'high' : 'low'; this.bootstrap.profile.updateSettings({ quality: next }); this.vfx.setQuality(next); this.showSettings(); }],
      ['LANGUAGE', player.settings.language === 'en' ? 'ENGLISH' : '简体中文', () => { this.bootstrap.profile.updateSettings({ language: player.settings.language === 'en' ? 'zh-CN' : 'en' }); this.showSettings(); }],
    ];
    rows.forEach(([name, value, action], index) => { const y = 520 - index * 180; const row = this.panel(this.page, 0, y, 880, 140, 24, C.panel2, new Color(109, 78, 35), 1); this.label(row, name, -270, 0, 25, C.white, true, 380); this.button(row, value, 290, 0, 220, 62, action, value === 'OFF' ? 'ghost' : 'secondary'); });
    this.panel(this.page, 0, -440, 880, 190, 24, new Color(61, 24, 51), C.red, 1); this.label(this.page, 'CLEAR LOCAL DATA', -190, -410, 24, C.white, true, 420); this.label(this.page, 'Requires typing RESET in the debug confirmation flow.', -90, -455, 18, C.muted, false, 620);
    this.button(this.page, 'RESET…', 315, -435, 210, 60, () => this.showResetConfirmation(), 'ghost');
  }

  private showGameLoading(): void {
    const color = this.themeColor(this.selectedGame.id); const machineIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); const layout = CABINET_MACHINE_LAYOUTS[machineIndex];
    this.paintBackdrop(`game_${this.selectedGame.id}`, new Color(20, 13, 9), color);
    this.addCasinoMachineStage(this.page, color, layout);
    this.addFullCabinetBody(this.page, machineIndex, layout, 255);
    this.addCabinetAttractMode(this.page, machineIndex, layout, color);
    this.addMachineMarquee(this.page, machineIndex, layout, color, true);
    const bootScreen = this.addMachineScreenSurface(this.page, layout, machineIndex); this.addMachineGlass(bootScreen, layout.reelWidth, layout.reelHeight, color);
    const barWidth = Math.min(layout.reelWidth - 80, 430); const bar = this.panel(bootScreen, 0, -38, barWidth, 18, 9, new Color(33, 19, 12, 238), undefined, 0, false); const fill = this.panel(bar, 0, 0, barWidth - 12, 8, 4, color, undefined, 0, false); fill.setScale(new Vec3(0.001, 1, 1));
    const progress = this.label(bootScreen, 'CABINET POWER  0%', 0, 22, 20, C.paleGold, true, layout.reelWidth - 30);
    this.label(bootScreen, 'SELF TEST • REELS • LAMPS • AUDIO', 0, -78, 14, C.muted, true, layout.reelWidth - 30);
    this.addGameBackButton(this.page, machineIndex, color);
    tween(fill).to(2.15, { scale: Vec3.ONE }, { easing: 'quadInOut', onUpdate: (_target, ratio = 0) => { progress.string = `${ratio < 0.34 ? 'CABINET POWER' : ratio < 0.74 ? 'REEL SELF TEST' : 'READY TO PLAY'}  ${Math.floor(ratio * 100)}%`; } }).delay(0.18).call(() => { if (this.router.route === 'game-loading') this.router.replace('game'); }).start();
  }

  private showGame(): void {
    this.ensurePlayer();
    const color = this.themeColor(this.selectedGame.id); const machineIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); const layout = CABINET_MACHINE_LAYOUTS[machineIndex];
    this.paintBackdrop(`game_${this.selectedGame.id}`, new Color(20, 13, 9), color);
    this.addCasinoMachineStage(this.page, color, layout);
    this.addFullCabinetBody(this.page, machineIndex, layout, 255);
    this.addCabinetAttractMode(this.page, machineIndex, layout, color);
    this.addMachineMarquee(this.page, machineIndex, layout, color, false);
    this.addMachineScreenSurface(this.page, layout, machineIndex);
    const reelFrame = new Node('CabinetReelMechanism'); reelFrame.layer = Layers.Enum.UI_2D; reelFrame.addComponent(UITransform).setContentSize(layout.reelWidth, layout.reelHeight); reelFrame.setPosition(0, layout.reelY); this.page.addChild(reelFrame);
    this.reelEngine = reelFrame.addComponent(ReelEngine); this.reelEngine.configure(this.selectedGame, layout.reelWidth, layout.reelHeight);
    this.addMachineGlass(this.page, layout.reelWidth, layout.reelHeight, color, layout.reelY);
    this.addMachineMeter(this.page, layout, machineIndex, color);
    this.addMachineControls(this.page, layout, machineIndex, color);
    this.addMachineServicePanel(this.page, layout, machineIndex, color);
    this.addGameBackButton(this.page, machineIndex, color);
    this.spinEffectPosition = new Vec3(layout.controlXs[2], layout.controlYs[2], 0); this.reelEffectPosition = new Vec3(0, layout.reelY, 0); this.creditEffectPosition = new Vec3(-layout.meterWidth * 0.32, layout.meterY, 0);
    if (this.forcedResult && !this.spinning) this.scheduleOnce(() => void this.onSpin(), 0.3);
  }

  private async onSpin(): Promise<boolean> {
    if (this.spinning) { this.reelEngine?.quickStop(); return true; }
    const rng = this.rngByGame.get(this.selectedGame.id) as SecureRNG;
    const result = this.resultGenerator.generate(this.selectedGame, this.bet(), rng, this.forcedResult); this.forcedResult = undefined;
    if (!this.bootstrap.economy.reserveSpin(result.spinId, this.bet())) { this.toast('Not enough demo credits or spin already active', C.red); return false; }
    this.spinning = result; this.stateMachine.reset(); this.stateMachine.move('reserving-bet'); this.stateMachine.move('result-ready'); this.stateMachine.move('spinning');
    if (this.spinButtonLabel) this.spinButtonLabel.string = 'STOP'; if (this.winLabel) this.winLabel.string = 'GOOD LUCK'; this.pullSlotLever(); this.pulseCabinetAttractMode(false); this.vfx.spinCharge(this.spinEffectPosition, this.themeColor(this.selectedGame.id)); this.refreshBalance();
    this.audio.play('spin'); this.audio.vibrate(22);
    await this.reelEngine?.spin(result, this.selectedGame, this.turbo);
    this.stateMachine.move('stopping'); this.stateMachine.move('evaluating');
    this.bootstrap.economy.settleSpin(result.spinId, result.totalWin); this.bootstrap.achievements.add('spin', 1); if (result.totalWin) this.bootstrap.achievements.add('win', result.totalWin); if (result.feature) this.bootstrap.achievements.add('feature', 1);
    this.audio.play('reel-stop'); if (result.totalWin > 0) { this.audio.play('win'); this.audio.vibrate([30, 35, 45]); this.pulseCabinetAttractMode(true); if (this.winLabel) this.winLabel.string = `WIN  ${this.format(result.totalWin)}`; this.vfx.pulse(this.winLabel?.node as Node); if (this.reelEngine) { this.vfx.pulse(this.reelEngine.node); this.reelEngine.presentWins(result, this.selectedGame); } this.vfx.celebrateWin(this.reelEffectPosition, this.themeColor(this.selectedGame.id)); this.vfx.flyCredits(this.reelEffectPosition, this.creditEffectPosition); this.presentWinSplash(result); this.stateMachine.move('presenting-win'); }
    if (result.feature) { if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win') this.stateMachine.move('feature'); this.presentFeature(result); }
    if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win' || this.stateMachine.state === 'feature') this.stateMachine.move('settled'); this.stateMachine.move('idle');
    this.spinning = undefined; if (this.spinButtonLabel) this.spinButtonLabel.string = 'SPIN'; this.refreshBalance(); return true;
  }

  private presentFeature(result: SpinResult): void {
    if (result.feature?.type === 'hold-and-spin') {
      const feature = result.featureResult; this.rewardModal('HOLD & SPIN COMPLETE', `${feature?.detail.toUpperCase() ?? 'RESPINS RESOLVED'}\n${feature?.jackpot?.toUpperCase() ?? 'FORTUNE COINS'}\n+${this.format(feature?.totalCredits ?? 0)} CREDITS`, C.cyan);
    } else if (result.feature?.type === 'nudge') this.rewardModal('RUBY NUDGE', `${result.featureResult?.detail.toUpperCase() ?? 'REEL NUDGED'}\nWIN EVALUATED AND SETTLED`, C.violet);
    else this.rewardModal('FREE SPINS COMPLETE', `${result.featureResult?.rounds.length ?? 0} SPINS RESOLVED\n${(result.feature?.multiplier ?? 1)}× FEATURE MULTIPLIER\n+${this.format(result.featureResult?.totalCredits ?? 0)} CREDITS`, C.violet);
  }

  private presentWinSplash(result: SpinResult): void {
    const ratio = result.totalWin / Math.max(1, this.bet()); const title = ratio >= 50 ? 'EPIC WIN' : ratio >= 20 ? 'MEGA WIN' : ratio >= 8 ? 'BIG WIN' : ratio >= 2 ? 'GREAT WIN' : 'NICE WIN'; const color = this.themeColor(this.selectedGame.id);
    const card = this.panel(this.overlay, 0, 105, 820, 250, 36, C.panel2, C.gold, 4); card.name = 'WinSplash'; const opacity = card.addComponent(UIOpacity); opacity.opacity = 0; card.setScale(new Vec3(0.62, 0.62, 1));
    this.addCardMotes(card, 14, color, 760, 200); this.addCardShine(card, 790, 220, C.paleGold, 0); this.addPremiumSymbol(card, this.selectedGame, this.selectedGame.wildId, -300, 0, 175, 'pulse', 255);
    this.label(card, title, 65, 40, 43, C.paleGold, true, 500); this.label(card, `+${this.format(result.totalWin)}`, 70, -35, 38, C.white, true, 500);
    tween(opacity).to(0.12, { opacity: 255 }).delay(1.55).to(0.32, { opacity: 0 }).start(); tween(card).to(0.28, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' }).to(0.14, { scale: Vec3.ONE }).delay(1.25).to(0.3, { position: new Vec3(0, 175, 0), scale: new Vec3(0.82, 0.82, 1) }, { easing: 'quadIn' }).call(() => { if (card.isValid) card.destroy(); }).start();
  }

  private async startAuto(): Promise<void> {
    const count = await this.autoSpin.start(10, () => this.onSpin()); this.toast(`Auto Spin completed ${count} spins`, C.cyan);
  }

  private showPaytable(): void {
    const modal = this.modal(900, 1250); this.label(modal, `${this.selectedGame.name} PAYTABLE`, 0, 510, 34, C.paleGold, true);
    this.selectedGame.symbols.slice(0, 9).forEach((symbol, index) => { const y = 395 - index * 95; const pay = this.selectedGame.paytable[symbol.id]; this.addPremiumSymbol(modal, this.selectedGame, symbol.id, -375, y, 72, 'pulse', 245, index * 0.08); this.label(modal, symbol.label.toUpperCase(), -190, y, 20, C.white, true, 330); this.label(modal, `3× ${pay?.[3] ?? '—'}   4× ${pay?.[4] ?? '—'}   5× ${pay?.[5] ?? '—'}`, 220, y, 18, C.cyan, false, 410); });
    this.button(modal, 'CLOSE', 0, -520, 320, 64, () => modal.parent?.removeAllChildren(), 'secondary');
  }

  private topBar(title = 'HOME'): void {
    const player = this.ensurePlayer(); const bar = this.panel(this.page, 0, this.topY(790), 1000, 130, 30, new Color(58, 35, 24, 248), C.gold, 4, false);
    this.addCardShine(bar, 960, 108, C.paleGold, 1.6); this.avatar(bar, -410, 0, player.avatar, 68); this.label(bar, title === 'HOME' ? player.nickname : title, -285, 12, 22, C.white, true, 220); this.label(bar, player.isGuest ? 'GUEST MODE • PLAY ONLY' : title === 'HOME' ? `LEVEL ${player.level}` : 'IMPERIAL CLUB', -285, -16, 14, player.isGuest ? C.paleGold : C.cyan, false, 220);
    if (title === 'HOME') this.physicalMachineButton(bar, `INBOX ${this.bootstrap.redDots.mail()}`, -72, 0, 132, 54, () => this.router.go('mail'), 0, C.gold, 'service');
    this.addPremiumSymbol(bar, GAME_CONFIGS[3], 'bonus', 78, 6, 42, 'pulse', 255); this.balanceLabel = this.label(bar, this.format(player.credits), 216, 10, 23, C.paleGold, true, 175);
    this.label(bar, player.isGuest ? 'PLAY CREDITS' : 'DEMO CREDITS', 216, -18, 13, C.muted, false, 175); this.physicalMachineButton(bar, player.isGuest ? 'LOCKED' : 'STORE', 414, 0, 112, 54, () => this.router.go('store'), 3, C.cyan, player.isGuest ? 'service' : 'toggle-on');
  }

  private header(title: string, back: boolean, showBalance = false): void {
    const bar = this.panel(this.page, 0, this.topY(800), 1020, 120, 26, C.panel, new Color(112, 80, 35), 1);
    if (back) this.button(bar, '‹', -450, 0, 72, 72, () => this.router.route === 'game' ? this.router.reset('home') : this.router.back('home'), 'ghost'); this.label(bar, title, 0, 0, 30, C.paleGold, true, 650);
    if (showBalance) { this.addPremiumSymbol(bar, GAME_CONFIGS[3], 'bonus', 275, 0, 42, 'pulse', 230); this.balanceLabel = this.label(bar, this.format(this.bootstrap.economy.balance()), 380, 0, 21, C.white, true, 190); }
  }

  private bottomNav(active: 'home' | 'store' | 'rewards' | 'rank' | 'profile'): void {
    const bar = this.panel(this.navigation, 0, -SafeAreaAdapter.visibleHeight / 2 + NAV_H / 2 + SafeAreaAdapter.safeBottom, SafeAreaAdapter.visibleWidth, NAV_H, 0, new Color(40, 25, 18, 255), C.gold, 3, false);
    const items: readonly [typeof active, string, Route][] = [['home', 'HOME', 'home'], ['store', 'STORE', 'store'], ['rewards', 'REWARDS', 'rewards'], ['rank', 'RANK', 'rank'], ['profile', 'PROFILE', 'profile']];
    const art: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'scatter'], [GAME_CONFIGS[3], 'bonus'], [GAME_CONFIGS[1], 'seal'], [GAME_CONFIGS[0], 'crown'], [GAME_CONFIGS[3], 'helmet']];
    items.forEach(([id, text, route], index) => { const x = -432 + index * 216; const accent = this.themeColor(art[index][0].id); const item = this.physicalMachineButton(bar, text, x, 0, 185, 112, () => this.router.reset(route), index % 4, accent, id === active ? 'toggle-on' : 'service'); const label = item.getChildByName('Text'); if (label) label.setPosition(0, -32); this.addPremiumSymbol(item, art[index][0], art[index][1], 0, 22, 52, id === active ? 'pulse' : 'none', id === active ? 255 : 168, index * 0.1); });
  }

  private gildedLabel(parent: Node, text: string, x: number, y: number, size: number, color: Color = C.paleGold, bold = true, width = 900): Label {
    const label = this.label(parent, text, x, y, size, color, bold, width); label.outlineColor = new Color(5, 4, 3, 235); label.outlineWidth = Math.max(1, Math.round(size * 0.075)); return label;
  }

  private gildedAction(parent: Node, text: string, x: number, y: number, width: number, height: number, action: () => void, color: Color = C.paleGold, fontSize = 18, active = false): Node {
    const node = new Node(`GildedAction-${text}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); parent.addChild(node);
    const glow = new Node('GildedActionGlow'); glow.layer = Layers.Enum.UI_2D; glow.addComponent(UITransform).setContentSize(width, height); node.addChild(glow); const glowGraphics = glow.addComponent(Graphics); glowGraphics.fillColor = new Color(color.r, color.g, color.b, active ? 28 : 7); glowGraphics.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, Math.min(22, height * 0.42)); glowGraphics.fill(); glowGraphics.strokeColor = new Color(color.r, color.g, color.b, active ? 126 : 24); glowGraphics.lineWidth = active ? 3 : 1.5; glowGraphics.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, Math.min(20, height * 0.38)); glowGraphics.stroke(); const glowOpacity = glow.addComponent(UIOpacity); glowOpacity.opacity = active ? 148 : 38;
    if (active) tween(glowOpacity).to(1.5, { opacity: 205 }, { easing: 'sineInOut' }).to(1.8, { opacity: 108 }, { easing: 'sineInOut' }).union().repeatForever().start();
    this.gildedLabel(node, text, 0, 0, fontSize, color, true, width - 18).node.name = 'Text'; const button = node.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.94;
    const restore = (): void => { tween(glowOpacity).to(0.16, { opacity: active ? 170 : 48 }, { easing: 'quadOut' }).start(); };
    node.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(8); tween(glowOpacity).to(0.08, { opacity: 255 }).start(); this.vfx?.buttonBurst(node, color); }, this); node.on(Node.EventType.TOUCH_CANCEL, restore, this); node.on(Node.EventType.TOUCH_END, () => { restore(); action(); }, this); return node;
  }

  private gildedTopBar(title = 'HOME'): void {
    const player = this.ensurePlayer(); const bar = new Node('GildedStatusOverlay'); bar.layer = Layers.Enum.UI_2D; bar.addComponent(UITransform).setContentSize(950, 120); bar.setPosition(0, 815); (this.gildedStage ?? this.page).addChild(bar);
    this.addGildedPortrait(bar, -372, 0, player.avatar, 58); this.gildedLabel(bar, title === 'HOME' ? player.nickname : title, -275, 14, 20, C.paleGold, true, 210); this.gildedLabel(bar, player.isGuest ? 'GUEST • PLAY ONLY' : title === 'HOME' ? `LEVEL ${player.level}` : 'IMPERIAL CLUB', -275, -17, 12, player.isGuest ? new Color(231, 182, 90) : new Color(117, 214, 174), false, 210);
    if (title === 'HOME') this.gildedAction(bar, `INBOX ${this.bootstrap.redDots.mail()}`, -62, 0, 138, 52, () => this.router.go('mail'), new Color(219, 164, 73), 13);
    this.addPremiumSymbol(bar, GAME_CONFIGS[3], 'bonus', 70, 4, 42, 'pulse', 238); this.balanceLabel = this.gildedLabel(bar, this.format(player.credits), 190, 13, 22, C.paleGold, true, 155); this.gildedLabel(bar, player.isGuest ? 'PLAY CREDITS' : 'DEMO CREDITS', 190, -18, 11, new Color(207, 193, 166), false, 155);
    if (title === 'STORE') this.gildedAction(bar, player.isGuest ? 'SIGN IN' : 'GIFT +5K', 350, 0, 116, 54, () => {
      if (player.isGuest) { this.router.go('login'); return; }
      const ok = this.bootstrap.store.claimDaily(this.today()); this.toast(ok ? '5,000 demo credits collected' : 'Daily gift already collected', ok ? C.green : C.muted); this.refreshBalance();
    }, player.isGuest ? new Color(197, 126, 96) : new Color(92, 188, 150), 13, !player.isGuest);
    else if (title === 'REWARDS') this.gildedAction(bar, 'DAILY', 350, 0, 116, 54, () => this.router.go('check-in'), new Color(219, 164, 73), 13, true);
    else if (title === 'PROFILE') this.gildedAction(bar, 'SETTINGS', 350, 0, 116, 54, () => this.router.go('settings'), new Color(92, 188, 150), 11);
    else this.gildedAction(bar, player.isGuest ? 'LOCKED' : title === 'HOME' ? 'STORE' : 'HOME', 350, 0, 116, 54, () => title === 'HOME' ? this.router.go('store') : this.router.reset('home'), player.isGuest ? new Color(173, 118, 93) : new Color(92, 188, 150), 13, title === 'HOME' && !player.isGuest);
  }

  private addGildedPortrait(parent: Node, x: number, y: number, index: number, size: number): Node {
    const clip = new Node(`GildedPortrait-${index}`); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(size, size); clip.setPosition(x, y); parent.addChild(clip); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_ELLIPSE;
    this.addCharacter(clip, index % GAME_CONFIGS.length, 0, -size * 0.08, size * 0.96, size * 1.16, 255, (index % 4) * 0.08); return clip;
  }

  private addGildedNavIcon(parent: Node, index: number, size: number, active: boolean): void {
    const clip = new Node(`GildedNavIcon-${index}`); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(size, size); clip.setPosition(0, 11); parent.addChild(clip); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.circle(0, 0, size / 2); stencil.fill(); }
    resources.load('generated/common/nav_icon_atlas_gilded_v03/texture', Texture2D, (error, texture) => { if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('GildedNavAtlasImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const cellWidth = texture.width / 5; const scale = size * 0.9 / cellWidth; const centerOffset = (index + 0.5) * cellWidth - texture.width / 2; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(-centerOffset * scale, 0); const opacity = image.addComponent(UIOpacity); opacity.opacity = active ? 255 : 185; if (active) tween(image).to(1.45, { scale: new Vec3(scale * 1.06, scale * 1.06, 1) }, { easing: 'sineInOut' }).to(1.65, { scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); });
  }

  private gildedBottomNav(active: 'home' | 'store' | 'rewards' | 'rank' | 'profile'): void {
    const bar = new Node('GildedNavigationOverlay'); bar.layer = Layers.Enum.UI_2D; bar.addComponent(UITransform).setContentSize(SafeAreaAdapter.visibleWidth, NAV_H); bar.setPosition(0, -SafeAreaAdapter.visibleHeight / 2 + NAV_H / 2 + SafeAreaAdapter.safeBottom); this.navigation.addChild(bar);
    const items: readonly [typeof active, string, Route][] = [['home', 'HOME', 'home'], ['store', 'STORE', 'store'], ['rewards', 'REWARDS', 'rewards'], ['rank', 'RANK', 'rank'], ['profile', 'PROFILE', 'profile']];
    items.forEach(([id, text, route], index) => { const selected = id === active; const item = new Node(`GildedNav-${id}`); item.layer = Layers.Enum.UI_2D; item.addComponent(UITransform).setContentSize(170, 118); item.setPosition(-432 + index * 216, 0); bar.addChild(item); const ring = item.addComponent(Graphics); ring.strokeColor = selected ? new Color(255, 214, 122, 225) : new Color(255, 225, 164, 45); ring.lineWidth = selected ? 5 : 2; ring.circle(0, 10, 51); ring.stroke(); this.addGildedNavIcon(item, index, 88, selected); this.gildedLabel(item, text, 0, -43, 14, selected ? C.paleGold : new Color(205, 196, 177), true, 150); const button = item.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.92; item.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(7); this.vfx?.buttonBurst(item, C.paleGold); }, this); item.on(Node.EventType.TOUCH_END, () => this.router.reset(route), this); });
  }

  private playPageReveal(): void {
    const pageOpacity = this.page.getComponent(UIOpacity) ?? this.page.addComponent(UIOpacity); const navOpacity = this.navigation.getComponent(UIOpacity) ?? this.navigation.addComponent(UIOpacity);
    Tween.stopAllByTarget(this.page); Tween.stopAllByTarget(pageOpacity); Tween.stopAllByTarget(navOpacity);
    // Structural UI must be correct on the first rendered frame. Moving and
    // scaling the whole page made every border look as if it arrived late and
    // continued settling after navigation. Content-level character, symbol,
    // shine and reel animations remain independent and continue to play.
    this.page.setPosition(Vec3.ZERO); this.page.setScale(Vec3.ONE); pageOpacity.opacity = 255; navOpacity.opacity = 255;
  }

  private addPremiumSymbol(parent: Node, config: GameConfig, symbolId: string, x: number, y: number, size: number, motion: SymbolMotion = 'float', alpha = 255, delay = 0): Node {
    const root = new Node(`PremiumArt-${config.id}-${symbolId}`); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(size, size); root.setPosition(x, y); parent.addChild(root);
    const halo = new Node('ArtHalo'); halo.layer = Layers.Enum.UI_2D; halo.addComponent(UITransform).setContentSize(size * 1.18, size * 1.18); root.addChild(halo); const haloGraphics = halo.addComponent(Graphics); const accent = this.themeColor(config.id); haloGraphics.fillColor = new Color(accent.r, accent.g, accent.b, Math.round(34 * alpha / 255)); haloGraphics.circle(0, 0, size * 0.43); haloGraphics.fill(); haloGraphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, Math.round(85 * alpha / 255)); haloGraphics.lineWidth = Math.max(1, size * 0.012); haloGraphics.circle(0, 0, size * 0.48); haloGraphics.stroke(); const haloOpacity = halo.addComponent(UIOpacity); haloOpacity.opacity = Math.min(alpha, 190);
    const image = new Node('PremiumImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(size, size); root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const imageOpacity = image.addComponent(UIOpacity); imageOpacity.opacity = 0; image.setScale(new Vec3(0.72, 0.72, 1));
    const atlas = symbolAtlasForGame(config); SymbolAtlasCache.load(atlas, () => { if (!root.isValid || !image.isValid) return; const frame = SymbolAtlasCache.frame(atlas, symbolId); if (!frame) return; sprite.spriteFrame = frame; tween(imageOpacity).delay(delay * 0.25).to(0.28, { opacity: alpha }, { easing: 'quadOut' }).start(); tween(image).delay(delay * 0.25).to(0.42, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); });
    for (let index = 0; index < 3; index += 1) { const glint = new Node(`ArtGlint-${index}`); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(14, 14); glint.setPosition((index - 1) * size * 0.33, (index % 2 ? -1 : 1) * size * 0.28); root.addChild(glint); const graphics = glint.addComponent(Graphics); graphics.fillColor = index === 1 ? C.paleGold : accent; graphics.moveTo(0, 7); graphics.lineTo(3, 1); graphics.lineTo(7, 0); graphics.lineTo(3, -1); graphics.lineTo(0, -7); graphics.lineTo(-3, -1); graphics.lineTo(-7, 0); graphics.lineTo(-3, 1); graphics.close(); graphics.fill(); const opacity = glint.addComponent(UIOpacity); opacity.opacity = 20; tween(opacity).delay(delay + index * 0.42).to(0.32, { opacity: Math.min(alpha, 235) }).to(0.48, { opacity: 18 }).delay(1.2 + index * 0.35).union().repeatForever().start(); tween(glint).delay(delay + index * 0.3).by(1.2 + index * 0.2, { angle: 120, scale: new Vec3(0.45, 0.45, 0) }).by(1.2 + index * 0.2, { angle: 120, scale: new Vec3(-0.45, -0.45, 0) }).union().repeatForever().start(); }
    tween(halo).delay(delay).to(1.35, { scale: new Vec3(1.12, 1.12, 1), angle: 12 }, { easing: 'sineInOut' }).to(1.55, { scale: Vec3.ONE, angle: -8 }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(haloOpacity).delay(delay).to(1.15, { opacity: Math.min(alpha, 220) }).to(1.45, { opacity: Math.min(alpha, 90) }).union().repeatForever().start();
    if (motion === 'float') tween(root).delay(delay).by(2.2, { position: new Vec3(10, 12, 0), angle: 3 }, { easing: 'sineInOut' }).by(2.4, { position: new Vec3(-10, -12, 0), angle: -3 }, { easing: 'sineInOut' }).union().repeatForever().start();
    else if (motion === 'pulse') tween(root).delay(delay).to(1.05, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'sineInOut' }).to(1.15, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    else if (motion === 'orbit') tween(root).delay(delay).by(3.8, { angle: 360 }).repeatForever().start();
    else if (motion === 'button') tween(image).delay(delay).to(1.35, { angle: 7, scale: new Vec3(1.04, 1.04, 1) }, { easing: 'sineInOut' }).to(1.55, { angle: -7, scale: new Vec3(0.98, 0.98, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    return root;
  }

  private addBannerHeroCarousel(parent: Node): void {
    const cycle = GAME_CONFIGS.length * 4.2;
    GAME_CONFIGS.forEach((config, index) => { const slide = new Node(`BannerHero-${index}`); slide.layer = Layers.Enum.UI_2D; slide.addComponent(UITransform).setContentSize(270, 310); slide.setPosition(320, 28); parent.addChild(slide); const opacity = slide.addComponent(UIOpacity); opacity.opacity = index === 0 ? 255 : 0; this.addCharacter(slide, index, 15, 6, 260, 305, 255, index * 0.12); this.addPremiumSymbol(slide, config, CARD_HERO_SYMBOLS[index], -92, -78, 82, 'pulse', 225, index * 0.15); tween(opacity).delay(index * 4.2).to(0.6, { opacity: 255 }).delay(3).to(0.6, { opacity: 0 }).delay(Math.max(0, cycle - index * 4.2 - 4.2)).union().repeatForever().start(); });
  }

  private addCharacter(parent: Node, index: number, x: number, y: number, maxWidth: number, maxHeight: number, alpha = 255, delay = 0): Node {
    const slot = Math.max(0, Math.min(CHARACTER_PATHS.length - 1, index)); const root = new Node(`CharacterHero-${slot}`); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(maxWidth, maxHeight); root.setPosition(x, y); root.setScale(new Vec3(0.92, 0.92, 1)); parent.addChild(root); const opacity = root.addComponent(UIOpacity); opacity.opacity = 0;
    const image = new Node('CharacterImage'); image.layer = Layers.Enum.UI_2D; root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.RAW;
    resources.load(`${CHARACTER_PATHS[slot]}/texture`, Texture2D, (error, texture) => { if (error || !texture || !root.isValid || !image.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame; const transform = image.getComponent(UITransform) as UITransform; transform.setContentSize(texture.width, texture.height); const scale = Math.min(maxWidth / texture.width, maxHeight / texture.height); image.setScale(new Vec3(scale, scale, 1)); tween(opacity).delay(delay).to(0.42, { opacity: alpha }, { easing: 'quadOut' }).start(); tween(root).delay(delay).to(0.48, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); tween(image).delay(delay + 0.52).by(2.5 + slot * 0.22, { position: new Vec3(slot % 2 ? -7 : 7, 10, 0), angle: slot % 2 ? -1.4 : 1.4 }, { easing: 'sineInOut' }).by(2.7 + slot * 0.2, { position: new Vec3(slot % 2 ? 7 : -7, -10, 0), angle: slot % 2 ? 1.4 : -1.4 }, { easing: 'sineInOut' }).union().repeatForever().start(); });
    const accent = this.themeColor(GAME_CONFIGS[slot].id); for (let glintIndex = 0; glintIndex < 2; glintIndex += 1) { const glint = new Node(`CharacterGlint-${glintIndex}`); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(18, 18); glint.setPosition((glintIndex ? 1 : -1) * maxWidth * 0.36, maxHeight * (glintIndex ? 0.24 : -0.08)); root.addChild(glint); const graphics = glint.addComponent(Graphics); graphics.fillColor = glintIndex ? C.paleGold : accent; graphics.moveTo(0, 9); graphics.lineTo(2, 2); graphics.lineTo(9, 0); graphics.lineTo(2, -2); graphics.lineTo(0, -9); graphics.lineTo(-2, -2); graphics.lineTo(-9, 0); graphics.lineTo(-2, 2); graphics.close(); graphics.fill(); const glintOpacity = glint.addComponent(UIOpacity); glintOpacity.opacity = 0; tween(glintOpacity).delay(delay + 0.8 + glintIndex * 0.6).to(0.3, { opacity: Math.min(alpha, 225) }).to(0.5, { opacity: 0 }).delay(1.5).union().repeatForever().start(); tween(glint).delay(delay).by(2.4, { angle: 180, scale: new Vec3(0.35, 0.35, 0) }).by(2.4, { angle: 180, scale: new Vec3(-0.35, -0.35, 0) }).union().repeatForever().start(); }
    return root;
  }

  private addReelEnergy(parent: Node, color: Color): void {
    for (let index = 0; index < 2; index += 1) { const scanner = new Node(`ReelScanner-${index}`); scanner.layer = Layers.Enum.UI_2D; scanner.addComponent(UITransform).setContentSize(890, 12); scanner.setPosition(0, index ? 275 : -275); parent.addChild(scanner); const graphics = scanner.addComponent(Graphics); graphics.fillColor = new Color(color.r, color.g, color.b, 36); graphics.roundRect(-445, -6, 890, 12, 6); graphics.fill(); graphics.fillColor = new Color(255, 240, 174, 130); graphics.roundRect(-90, -3, 180, 6, 3); graphics.fill(); const opacity = scanner.addComponent(UIOpacity); opacity.opacity = 20; const travel = index ? -540 : 540; tween(scanner).delay(index * 1.25).by(2.4, { position: new Vec3(0, travel, 0) }, { easing: 'sineInOut' }).by(2.4, { position: new Vec3(0, -travel, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).delay(index * 0.4).to(0.5, { opacity: 170 }).to(1.3, { opacity: 28 }).union().repeatForever().start(); }
  }

  private addPearlReelRail(parent: Node, width: number, height: number, accent: Color): void {
    const rail = new Node('PearlReelRail'); rail.layer = Layers.Enum.UI_2D; rail.addComponent(UITransform).setContentSize(width, height); parent.addChild(rail); const graphics = rail.addComponent(Graphics);
    graphics.strokeColor = new Color(255, 244, 218, 245); graphics.lineWidth = 20; graphics.roundRect(-width / 2 + 12, -height / 2 + 12, width - 24, height - 24, 38); graphics.stroke();
    graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 230); graphics.lineWidth = 7; graphics.roundRect(-width / 2 + 22, -height / 2 + 22, width - 44, height - 44, 30); graphics.stroke();
    graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 145); graphics.lineWidth = 3; graphics.roundRect(-width / 2 + 32, -height / 2 + 32, width - 64, height - 64, 24); graphics.stroke();
    for (const point of [new Vec3(-width / 2 + 31, height / 2 - 31), new Vec3(width / 2 - 31, height / 2 - 31), new Vec3(-width / 2 + 31, -height / 2 + 31), new Vec3(width / 2 - 31, -height / 2 + 31)]) { const pearl = new Node('PearlRailRivet'); pearl.layer = Layers.Enum.UI_2D; pearl.addComponent(UITransform).setContentSize(26, 26); pearl.setPosition(point); rail.addChild(pearl); const pearlGraphics = pearl.addComponent(Graphics); pearlGraphics.fillColor = C.white; pearlGraphics.circle(0, 0, 9); pearlGraphics.fill(); pearlGraphics.strokeColor = C.gold; pearlGraphics.lineWidth = 2; pearlGraphics.circle(0, 0, 11); pearlGraphics.stroke(); }
  }

  private paintBackdrop(asset: string, bottom: Color, top: Color): void {
    const width = SafeAreaAdapter.visibleWidth; const height = SafeAreaAdapter.visibleHeight;
    const base = new Node('Backdrop'); base.layer = Layers.Enum.UI_2D; base.addComponent(UITransform).setContentSize(width, height); this.background.addChild(base); const graphics = base.addComponent(Graphics);
    const bands = 24; for (let index = 0; index < bands; index += 1) { const ratio = index / (bands - 1); graphics.fillColor = new Color(Math.round(bottom.r + (top.r - bottom.r) * ratio), Math.round(bottom.g + (top.g - bottom.g) * ratio), Math.round(bottom.b + (top.b - bottom.b) * ratio), 255); graphics.rect(-width / 2, -height / 2 + index * height / bands, width, height / bands + 2); graphics.fill(); }
    this.loadBackdrop(base, asset, width, height); if (!['home', 'store', 'rewards', 'rank', 'profile'].includes(asset)) this.addAmbientLights(base, top, width, height);
  }

  private loadBackdrop(parent: Node, asset: string, width: number, height: number): void {
    const paths: Record<string, string> = { boot: 'generated/common/start_bg_v01', login: 'generated/login/login_bg_v01', home: 'generated/home/home_fortune_welcome_v12', store: 'generated/store/store_gilded_exchange_v03', rewards: 'generated/rewards/rewards_gilded_gallery_v03', rank: 'generated/rank/rank_gilded_hall_v03', profile: 'generated/profile/profile_gilded_console_v03', wheel: 'generated/common/common_bg_v01' };
    const gamePaths: Record<string, string> = { 'game_astral-vault': 'generated/game01/base_bg_casino_v02', 'game_golden-dynasty': 'generated/game02/base_bg_casino_v02', 'game_neon-classic': 'generated/game03/base_bg_casino_v02', 'game_cosmic-coins': 'generated/game04/base_bg_casino_v02' };
    const path = paths[asset] ?? gamePaths[asset]; if (!path) return;
    resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (error || !texture || !parent.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const node = new Node('GeneratedBackdrop'); node.layer = Layers.Enum.UI_2D; const sprite = node.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const transform = node.getComponent(UITransform) as UITransform; const showcase = asset === 'home' || asset === 'store' || asset === 'rewards' || asset === 'rank' || asset === 'profile'; const gameBackdrop = asset.startsWith('game_'); const widthScale = width / texture.width; const heightScale = height / texture.height; const shortPortrait = height / width < H / W; const scale = (showcase && shortPortrait ? Math.min(widthScale, heightScale) : Math.max(widthScale, heightScale)) * (showcase ? 1.035 : 1); node.setScale(new Vec3(scale, scale, 1)); parent.addChild(node); node.setSiblingIndex(0); transform.setContentSize(texture.width, texture.height); const opacity = node.addComponent(UIOpacity); opacity.opacity = showcase ? 255 : gameBackdrop ? 232 : 178; if (!showcase) { tween(node).to(7, { position: new Vec3(16, 10, 0), scale: new Vec3(scale * 1.025, scale * 1.025, 1) }, { easing: 'sineInOut' }).to(7, { position: new Vec3(-16, -10, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(3.8, { opacity: gameBackdrop ? 246 : 198 }, { easing: 'sineInOut' }).to(4.2, { opacity: gameBackdrop ? 218 : 172 }, { easing: 'sineInOut' }).union().repeatForever().start(); } });
  }

  private addConciergePortrait(parent: Node, fallbackCharacter: number, x = 0, y = -2, width = 316, height = 316): void {
    const clip = new Node('ConciergePortraitClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height); clip.setPosition(x, y); parent.addChild(clip); clip.setSiblingIndex(0);
    const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_ELLIPSE;
    resources.load('generated/profile/concierge_portrait_v02/texture', Texture2D, (error, texture) => {
      if (error || !texture || !clip.isValid) { if (clip.isValid) this.addCharacter(clip, fallbackCharacter, 0, -height * 0.06, width, height * 1.08, 255, 0.1); return; }
      const image = new Node('ConciergePortraitImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); const sprite = image.addComponent(Sprite); const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(width / texture.width, height / texture.height); image.setScale(new Vec3(scale, scale, 1)); image.setPosition(0, -height * 0.025); const opacity = image.addComponent(UIOpacity); opacity.opacity = 0; tween(opacity).to(0.3, { opacity: 255 }, { easing: 'quadOut' }).start(); tween(image).to(4.2, { position: new Vec3(5, -height * 0.015, 0), scale: new Vec3(scale * 1.018, scale * 1.018, 1) }, { easing: 'sineInOut' }).to(4.6, { position: new Vec3(0, -height * 0.025, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
  }

  private addStarField(parent: Node, count: number): void {
    for (let index = 0; index < count; index += 1) { const x = ((index * 317) % 1030) - 515; const y = ((index * 619) % 1800) - 900; const radius = 1 + (index % 3); const node = new Node(`GoldMote-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); g.fillColor = index % 7 === 0 ? C.gold : new Color(255, 239, 199, 158); g.circle(0, 0, radius); g.fill(); if (index % 8 === 0) tween(node).to(1.2 + index % 5 * 0.2, { scale: new Vec3(1.8, 1.8, 1) }).to(1.4, { scale: Vec3.ONE }).union().repeatForever().start(); }
  }

  private addAmbientLights(parent: Node, accent: Color, width: number, height: number): void {
    for (let index = 0; index < 3; index += 1) {
      const radius = 190 + index * 85; const node = new Node(`AmbientGlow-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(index === 1 ? width * 0.32 : -width * (0.26 + index * 0.04), -height * 0.22 + index * height * 0.22); parent.addChild(node);
      const graphics = node.addComponent(Graphics); graphics.fillColor = new Color(accent.r, accent.g, accent.b, 10 + index * 4); graphics.circle(0, 0, radius); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 105;
      const dx = index % 2 ? -90 : 110; const dy = 70 + index * 25; tween(node).by(5 + index * 1.4, { position: new Vec3(dx, dy, 0), scale: new Vec3(0.12, 0.12, 0) }, { easing: 'sineInOut' }).by(5 + index * 1.4, { position: new Vec3(-dx, -dy, 0), scale: new Vec3(-0.12, -0.12, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(2.8 + index, { opacity: 175 }).to(3.4 + index, { opacity: 90 }).union().repeatForever().start();
    }
  }

  private addLoadingOrbit(parent: Node, x: number, y: number, color: Color, radius: number): void {
    const orbit = new Node('LoadingOrbit'); orbit.layer = Layers.Enum.UI_2D; orbit.addComponent(UITransform).setContentSize(radius * 2.4, radius * 2.4); orbit.setPosition(x, y); parent.addChild(orbit);
    const graphics = orbit.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, 130); graphics.lineWidth = 3; graphics.arc(0, 0, radius, 0.18, Math.PI * 1.42, false); graphics.stroke(); graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 82); graphics.lineWidth = 1; graphics.circle(0, 0, radius * 0.72); graphics.stroke();
    const comet = new Node('OrbitComet'); comet.layer = Layers.Enum.UI_2D; comet.addComponent(UITransform).setContentSize(24, 24); comet.setPosition(radius, 0); orbit.addChild(comet); const cometGraphics = comet.addComponent(Graphics); cometGraphics.fillColor = C.paleGold; cometGraphics.circle(0, 0, 7); cometGraphics.fill(); cometGraphics.fillColor = new Color(color.r, color.g, color.b, 70); cometGraphics.circle(0, 0, 13); cometGraphics.fill();
    tween(orbit).by(2.8, { angle: -360 }).repeatForever().start();
  }

  private addCardShine(parent: Node, width: number, height: number, color: Color, delay: number, x = 0, y = 0): void {
    const clip = new Node('ShineClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height); clip.setPosition(x, y); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-width / 2, -height / 2, width, height, Math.max(4, Math.min(24, height * 0.2))); stencil.fill(); } parent.addChild(clip);
    const stripe = new Node('ShineStripe'); stripe.layer = Layers.Enum.UI_2D; stripe.addComponent(UITransform).setContentSize(180, height * 1.5); stripe.setPosition(-width * 0.72, 0); stripe.angle = -16; clip.addChild(stripe); const graphics = stripe.addComponent(Graphics); graphics.fillColor = new Color(color.r, color.g, color.b, 28); graphics.rect(-90, -height, 180, height * 2); graphics.fill();
    tween(stripe).delay(delay).to(0.9, { position: new Vec3(width * 0.72, 0, 0) }, { easing: 'quadInOut' }).call(() => stripe.setPosition(-width * 0.72, 0)).delay(4.6).union().repeatForever().start();
  }

  private addBannerCarousel(parent: Node, width: number, height: number, x = 0, y = 0): void {
    const clip = new Node('BannerCarousel'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height); clip.setPosition(x, y); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, Math.max(8, Math.min(34, height * 0.15))); stencil.fill(); } parent.addChild(clip); clip.setSiblingIndex(0);
    const paths = ['generated/game01/base_bg_casino_v02', 'generated/game02/base_bg_casino_v02', 'generated/game03/base_bg_casino_v02', 'generated/game04/base_bg_casino_v02'];
    paths.forEach((path, index) => resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node(`BannerWorld-${index}`); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW;
      const scale = Math.max(width / texture.width, height / texture.height) * 1.13; image.setScale(new Vec3(scale, scale, 1)); image.setPosition((index % 2 ? -1 : 1) * 28, -texture.height * scale * 0.09); const opacity = image.addComponent(UIOpacity); opacity.opacity = index === 0 ? 210 : 0;
      const cycle = paths.length * 4.2; tween(opacity).delay(index * 4.2).to(0.75, { opacity: 215 }).delay(2.7).to(0.75, { opacity: 0 }).delay(Math.max(0, cycle - index * 4.2 - 4.2)).union().repeatForever().start(); tween(image).by(6.5, { position: new Vec3(index % 2 ? 24 : -24, 14, 0), scale: new Vec3(scale * 0.025, scale * 0.025, 0) }, { easing: 'sineInOut' }).by(6.5, { position: new Vec3(index % 2 ? -24 : 24, -14, 0), scale: new Vec3(-scale * 0.025, -scale * 0.025, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
    }));
    const shade = new Node('BannerShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); const graphics = shade.addComponent(Graphics); graphics.fillColor = new Color(12, 7, 4, 158); graphics.rect(-width / 2, -height / 2, width, height); graphics.fill();
  }

  private addGameCardArt(parent: Node, index: number, width: number, height: number): Node {
    const paths = ['generated/game01/base_bg_casino_v02', 'generated/game02/base_bg_casino_v02', 'generated/game03/base_bg_casino_v02', 'generated/game04/base_bg_casino_v02']; const clip = new Node('GameCardArt'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height);
    // The ornamental windows have rounded/concave corners. A rectangular mask
    // leaves visible background squares in the frame's transparent corners,
    // even when the frame's inner bounds are otherwise aligned correctly.
    const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL;
    // Each frame has a different inner silhouette. In particular, card 1 uses
    // an inverted Neon frame (deep lower crest), while cards 3/4 have deep top
    // crowns. Clip per edge so the background ends at each frame's real inner
    // rail instead of letting a thick ornament project into the artwork.
    const frameIndex = index === 0 ? 4 : index; const aperture = this.visualSurfaceInsets(width, height, frameIndex, false, { width: 482, height: 364 }); const radius = [46, 42, 40, 42][index] ?? 42;
    const stencil = clip.getComponent(Graphics);
    if (stencil) { stencil.clear(); stencil.roundRect(-width / 2 + aperture.left, -height / 2 + aperture.bottom, width - aperture.left - aperture.right, height - aperture.top - aperture.bottom, radius); stencil.fill(); }
    parent.addChild(clip); clip.setSiblingIndex(0);
    const shade = new Node('GameCardShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); const shadeGraphics = shade.addComponent(Graphics); shadeGraphics.fillColor = new Color(11, 6, 4, 132); shadeGraphics.rect(-width / 2, -height / 2, width, height); shadeGraphics.fill();
    resources.load(`${paths[index]}/texture`, Texture2D, (error, texture) => { if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('CardWorldImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(width / texture.width, height / texture.height) * 1.08; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(0, -38); const opacity = image.addComponent(UIOpacity); opacity.opacity = 218; tween(image).to(5 + index * 0.7, { position: new Vec3(index % 2 ? -22 : 22, -18, 0), scale: new Vec3(scale * 1.055, scale * 1.055, 1) }, { easing: 'sineInOut' }).to(5 + index * 0.7, { position: new Vec3(0, -38, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(2.6, { opacity: 245 }).to(3.1, { opacity: 210 }).union().repeatForever().start(); });
    return clip;
  }

  private addCardMotes(parent: Node, count: number, color: Color, width: number, height: number): void {
    for (let index = 0; index < count; index += 1) { const node = new Node(`CardMote-${index}`); node.layer = Layers.Enum.UI_2D; const radius = 2 + index % 3; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(-width / 2 + ((index * 137) % Math.max(1, width)), -height / 2 + ((index * 91) % Math.max(1, height))); parent.addChild(node); const graphics = node.addComponent(Graphics); graphics.fillColor = index % 4 === 0 ? C.paleGold : new Color(color.r, color.g, color.b, 180); graphics.circle(0, 0, radius); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 45 + index % 3 * 35; tween(node).by(2.8 + index * 0.17, { position: new Vec3((index % 2 ? -1 : 1) * (20 + index * 2), 44 + index * 3, 0), scale: new Vec3(0.4, 0.4, 0) }, { easing: 'sineInOut' }).by(2.8 + index * 0.17, { position: new Vec3((index % 2 ? 1 : -1) * (20 + index * 2), -44 - index * 3, 0), scale: new Vec3(-0.4, -0.4, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(1.4 + index * 0.09, { opacity: 220 }).to(1.7 + index * 0.08, { opacity: 38 }).union().repeatForever().start(); }
  }

  private addSpinRings(parent: Node, radius: number): void {
    for (let index = 0; index < 2; index += 1) { const ring = new Node(`SpinEnergyRing-${index}`); ring.layer = Layers.Enum.UI_2D; ring.addComponent(UITransform).setContentSize(radius * 2.6, radius * 2.6); parent.addChild(ring); const graphics = ring.addComponent(Graphics); graphics.strokeColor = index === 0 ? new Color(C.gold.r, C.gold.g, C.gold.b, 155) : new Color(C.cyan.r, C.cyan.g, C.cyan.b, 125); graphics.lineWidth = index === 0 ? 4 : 2; graphics.arc(0, 0, radius + index * 14, index * 1.2, Math.PI * (1.45 + index * 0.15), false); graphics.stroke(); graphics.arc(0, 0, radius + index * 14, Math.PI * (1.65 + index * 0.1), Math.PI * (1.9 + index * 0.05), false); graphics.stroke(); const opacity = ring.addComponent(UIOpacity); opacity.opacity = 108; tween(ring).by(index === 0 ? 4.8 : 6.2, { angle: index === 0 ? -360 : 360 }).repeatForever().start(); tween(opacity).to(1.8 + index * 0.3, { opacity: 178 }).to(2.1, { opacity: 72 }).union().repeatForever().start(); }
  }

  private addSpinGlassDome(parent: Node, width: number, height: number): void {
    const radius = Math.min(width, height) * 0.46; const dome = new Node('SpinGlassDome'); dome.layer = Layers.Enum.UI_2D; dome.addComponent(UITransform).setContentSize(radius * 2.2, radius * 2.2); parent.addChild(dome); dome.setSiblingIndex(0); const graphics = dome.addComponent(Graphics);
    graphics.fillColor = new Color(255, 225, 154, 52); graphics.circle(0, 0, radius); graphics.fill(); graphics.fillColor = new Color(255, 250, 225, 45); graphics.arc(-radius * 0.12, radius * 0.08, radius * 0.72, 0.62, 2.42, false); graphics.lineTo(-radius * 0.22, radius * 0.12); graphics.close(); graphics.fill();
    graphics.strokeColor = new Color(255, 239, 198, 205); graphics.lineWidth = 6; graphics.arc(0, 0, radius - 3, 0.12, Math.PI * 1.36, false); graphics.stroke(); graphics.strokeColor = new Color(116, 74, 30, 185); graphics.lineWidth = 5; graphics.arc(0, 0, radius + 1, Math.PI * 1.36, Math.PI * 2.12, false); graphics.stroke();
    const opacity = dome.addComponent(UIOpacity); opacity.opacity = 152; tween(opacity).to(2.6, { opacity: 192 }, { easing: 'sineInOut' }).to(3.2, { opacity: 142 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private addCasinoMachineStage(parent: Node, accent: Color, layout: CabinetMachineLayout): void {
    const backGlow = new Node('CabinetWallGlow'); backGlow.layer = Layers.Enum.UI_2D; backGlow.addComponent(UITransform).setContentSize(980, 1180); backGlow.setPosition(0, 70); parent.addChild(backGlow); const glowGraphics = backGlow.addComponent(Graphics);
    glowGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 30); glowGraphics.circle(0, 0, 430); glowGraphics.fill(); glowGraphics.fillColor = new Color(255, 224, 166, 14); glowGraphics.circle(0, 70, 520); glowGraphics.fill(); const glowOpacity = backGlow.addComponent(UIOpacity); glowOpacity.opacity = 108; tween(glowOpacity).to(2.8, { opacity: 162 }, { easing: 'sineInOut' }).to(3.4, { opacity: 96 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const baseY = layout.y - layout.height / 2 + 26; const floor = new Node('CabinetFloorPlinth'); floor.layer = Layers.Enum.UI_2D; floor.addComponent(UITransform).setContentSize(1040, 170); floor.setPosition(0, baseY - 12); parent.addChild(floor); const floorGraphics = floor.addComponent(Graphics);
    floorGraphics.fillColor = new Color(20, 11, 8, 180); floorGraphics.roundRect(-460, -42, 920, 84, 42); floorGraphics.fill(); floorGraphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 90); floorGraphics.lineWidth = 3; floorGraphics.roundRect(-420, -27, 840, 54, 27); floorGraphics.stroke(); floorGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, 74); floorGraphics.lineWidth = 2; floorGraphics.roundRect(-355, -13, 710, 26, 13); floorGraphics.stroke();
    const reflection = new Node('CabinetFloorReflection'); reflection.layer = Layers.Enum.UI_2D; reflection.addComponent(UITransform).setContentSize(720, 120); reflection.setPosition(0, baseY + 38); parent.addChild(reflection); const reflectionGraphics = reflection.addComponent(Graphics); reflectionGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 20); reflectionGraphics.roundRect(-330, -26, 660, 52, 26); reflectionGraphics.fill(); const reflectionOpacity = reflection.addComponent(UIOpacity); reflectionOpacity.opacity = 70; tween(reflectionOpacity).to(3.1, { opacity: 118 }).to(3.8, { opacity: 58 }).union().repeatForever().start();
    for (const side of [-1, 1]) { const beam = new Node(`CabinetCelebrationBeam-${side}`); beam.layer = Layers.Enum.UI_2D; beam.addComponent(UITransform).setContentSize(430, 1180); beam.setPosition(side * 330, 90); parent.addChild(beam); beam.setSiblingIndex(1); const beamGraphics = beam.addComponent(Graphics); const beamColor = side < 0 ? new Color(255, 104, 133, 15) : new Color(92, 225, 205, 15); beamGraphics.fillColor = beamColor; beamGraphics.moveTo(0, -560); beamGraphics.lineTo(side * -130, 560); beamGraphics.lineTo(side * 130, 560); beamGraphics.close(); beamGraphics.fill(); const beamOpacity = beam.addComponent(UIOpacity); beamOpacity.opacity = 36; tween(beam).delay(side > 0 ? 0.8 : 0).to(2.8, { angle: side * 11 }, { easing: 'sineInOut' }).to(3.2, { angle: side * -9 }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(beamOpacity).to(1.9, { opacity: 82 }).to(2.3, { opacity: 25 }).union().repeatForever().start(); }
    for (let index = 0; index < 18; index += 1) { const bokeh = new Node(`CabinetCelebrationBokeh-${index}`); bokeh.layer = Layers.Enum.UI_2D; const radius = 4 + index % 4 * 2; bokeh.addComponent(UITransform).setContentSize(radius * 3, radius * 3); bokeh.setPosition(-480 + (index * 163) % 960, -560 + (index * 211) % 1120); parent.addChild(bokeh); bokeh.setSiblingIndex(2); const bokehGraphics = bokeh.addComponent(Graphics); const color = index % 3 === 0 ? accent : index % 3 === 1 ? C.paleGold : new Color(92, 225, 205); bokehGraphics.fillColor = new Color(color.r, color.g, color.b, 170); bokehGraphics.circle(0, 0, radius); bokehGraphics.fill(); const opacity = bokeh.addComponent(UIOpacity); opacity.opacity = 12; tween(bokeh).delay(index * 0.13).by(2.4 + index % 4 * 0.35, { position: new Vec3(index % 2 ? -14 : 14, 45 + index % 3 * 16, 0), scale: new Vec3(0.38, 0.38, 0) }, { easing: 'sineInOut' }).by(2.8 + index % 5 * 0.28, { position: new Vec3(index % 2 ? 14 : -14, -45 - index % 3 * 16, 0), scale: new Vec3(-0.38, -0.38, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).delay(index * 0.1).to(0.38, { opacity: 178 }).to(1.1, { opacity: 14 }).delay(0.65).union().repeatForever().start(); }
  }

  private addFullCabinetBody(parent: Node, machineIndex: number, layout: CabinetMachineLayout, alpha = 255): Node {
    const body = new Node(`FullPhysicalCabinet-${machineIndex}`); body.layer = Layers.Enum.UI_2D; body.addComponent(UITransform).setContentSize(layout.width, layout.height); body.setPosition(0, layout.y); parent.addChild(body); const sprite = body.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.type = Sprite.Type.SIMPLE; const opacity = body.addComponent(UIOpacity); opacity.opacity = alpha;
    this.withCabinetBodyTexture(machineIndex, (texture) => { if (!body.isValid || !parent.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame; });
    const idleLight = new Node('CabinetIdleLight'); idleLight.layer = Layers.Enum.UI_2D; idleLight.addComponent(UITransform).setContentSize(layout.width * 0.88, 12); idleLight.setPosition(0, -layout.height / 2 + 34); body.addChild(idleLight); const lightGraphics = idleLight.addComponent(Graphics); lightGraphics.fillColor = new Color(255, 226, 165, 48); lightGraphics.roundRect(-layout.width * 0.36, -4, layout.width * 0.72, 8, 4); lightGraphics.fill(); const lightOpacity = idleLight.addComponent(UIOpacity); lightOpacity.opacity = 52; tween(lightOpacity).delay(machineIndex * 0.32).to(2.2, { opacity: 128 }, { easing: 'sineInOut' }).to(2.9, { opacity: 42 }, { easing: 'sineInOut' }).union().repeatForever().start();
    return body;
  }

  private addCabinetAttractMode(parent: Node, machineIndex: number, layout: CabinetMachineLayout, accent: Color): void {
    const layer = new Node(`CabinetAttractMode-${machineIndex}`); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(layout.width, layout.height); layer.setPosition(0, layout.y); parent.addChild(layer); const layerOpacity = layer.addComponent(UIOpacity); layerOpacity.opacity = 215; this.cabinetAttractLayer = layer;
    const lowQuality = this.bootstrap.profile.current()?.settings.quality === 'low'; const railCount = lowQuality ? 5 : 9; const bulbCount = lowQuality ? 10 : 18;
    const specs = [
      { railX: 0.39, railTop: 0.23, railBottom: -0.23, crownY: 0.44, crownRadius: 46 },
      { railX: 0.37, railTop: 0.27, railBottom: -0.29, crownY: 0.46, crownRadius: 40 },
      { railX: 0.36, railTop: 0.20, railBottom: -0.27, crownY: 0.455, crownRadius: 39 },
      { railX: 0.36, railTop: 0.21, railBottom: -0.27, crownY: 0.42, crownRadius: 49 },
    ][machineIndex];
    const addLamp = (name: string, x: number, y: number, width: number, height: number, delay: number, pale = false): void => {
      const lamp = new Node(name); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(width + 18, height + 18); lamp.setPosition(x, y); layer.addChild(lamp); const graphics = lamp.addComponent(Graphics); const color = pale ? C.paleGold : accent;
      graphics.fillColor = new Color(color.r, color.g, color.b, pale ? 190 : 170); graphics.roundRect(-width / 2, -height / 2, width, height, Math.min(width, height) / 2); graphics.fill(); graphics.strokeColor = new Color(255, 245, 218, pale ? 125 : 72); graphics.lineWidth = 2; graphics.roundRect(-width / 2 - 2, -height / 2 - 2, width + 4, height + 4, Math.min(width, height) / 2 + 2); graphics.stroke();
      const opacity = lamp.addComponent(UIOpacity); opacity.opacity = 25; tween(opacity).delay(delay).to(0.26, { opacity: pale ? 220 : 190 }, { easing: 'quadOut' }).to(1.12, { opacity: 26 }, { easing: 'sineInOut' }).delay(0.46).union().repeatForever().start();
    };
    for (const side of [-1, 1]) {
      for (let index = 0; index < railCount; index += 1) {
        const ratio = index / (railCount - 1); const y = layout.height * (specs.railTop + (specs.railBottom - specs.railTop) * ratio); const phase = side < 0 ? index : railCount - index - 1;
        addLamp(`CabinetRailLamp-${side}-${index}`, side * layout.width * specs.railX, y, lowQuality ? 9 : 11, lowQuality ? 44 : 50, phase * 0.11 + machineIndex * 0.13, index % 3 === 1);
      }
    }
    const marqueeCenterY = layout.marqueeY - layout.y;
    for (let index = 0; index < bulbCount; index += 1) {
      const ratio = index / (bulbCount - 1); const angle = Math.PI * (0.12 + ratio * 0.76); const x = Math.cos(angle) * layout.marqueeWidth * 0.43; const y = marqueeCenterY + Math.sin(angle) * layout.marqueeHeight * 0.47;
      addLamp(`CabinetMarqueeChase-${index}`, x, y, lowQuality ? 7 : 9, lowQuality ? 7 : 9, index * 0.075 + machineIndex * 0.09, index % 3 !== 0);
    }
    layout.controlXs.forEach((x, index) => addLamp(`CabinetDeckLamp-${index}`, x, layout.controlYs[index] - layout.y + layout.controlHeight * 0.72, Math.max(24, layout.controlWidth * 0.42), 6, index * 0.14 + 0.3, index % 2 === 0));
    const screenCenterY = layout.reelY - layout.y; const horizontalCount = lowQuality ? 10 : 16; const verticalCount = lowQuality ? 5 : 8;
    for (let index = 0; index < horizontalCount; index += 1) { const ratio = index / (horizontalCount - 1); const x = -layout.reelWidth * 0.44 + ratio * layout.reelWidth * 0.88; for (const edge of [-1, 1]) addLamp(`ReelBezelChase-H-${edge}-${index}`, x, screenCenterY + edge * (layout.reelHeight / 2 + 9), lowQuality ? 8 : 10, lowQuality ? 6 : 8, (edge > 0 ? index : horizontalCount - index - 1) * 0.055 + machineIndex * 0.1, (index + edge) % 3 === 0); }
    for (let index = 0; index < verticalCount; index += 1) { const ratio = index / (verticalCount - 1); const y = screenCenterY - layout.reelHeight * 0.38 + ratio * layout.reelHeight * 0.76; for (const edge of [-1, 1]) addLamp(`ReelBezelChase-V-${edge}-${index}`, edge * (layout.reelWidth / 2 + 9), y, lowQuality ? 6 : 8, lowQuality ? 9 : 11, (edge > 0 ? index : verticalCount - index - 1) * 0.07 + 0.25, index % 3 === 1); }
    const sparkleCount = lowQuality ? 6 : 14;
    for (let index = 0; index < sparkleCount; index += 1) { const sparkle = new Node(`CabinetFortuneSparkle-${index}`); sparkle.layer = Layers.Enum.UI_2D; const size = 8 + index % 4 * 3; sparkle.addComponent(UITransform).setContentSize(size * 2, size * 2); const side = index % 2 ? 1 : -1; sparkle.setPosition(side * layout.width * (0.28 + (index % 4) * 0.04), layout.height * (0.34 - (index % 7) * 0.105)); layer.addChild(sparkle); const sparkleGraphics = sparkle.addComponent(Graphics); const sparkleColor = index % 3 === 0 ? C.paleGold : index % 3 === 1 ? accent : new Color(92, 225, 205); sparkleGraphics.fillColor = sparkleColor; sparkleGraphics.moveTo(0, size); sparkleGraphics.lineTo(size * 0.22, size * 0.22); sparkleGraphics.lineTo(size, 0); sparkleGraphics.lineTo(size * 0.22, -size * 0.22); sparkleGraphics.lineTo(0, -size); sparkleGraphics.lineTo(-size * 0.22, -size * 0.22); sparkleGraphics.lineTo(-size, 0); sparkleGraphics.lineTo(-size * 0.22, size * 0.22); sparkleGraphics.close(); sparkleGraphics.fill(); const opacity = sparkle.addComponent(UIOpacity); opacity.opacity = 0; sparkle.setScale(new Vec3(0.45, 0.45, 1)); tween(opacity).delay(index * 0.19).to(0.18, { opacity: 242 }).to(0.5, { opacity: 0 }).delay(0.8 + index % 3 * 0.24).union().repeatForever().start(); tween(sparkle).delay(index * 0.11).to(0.3, { scale: new Vec3(1.15, 1.15, 1), angle: 65 }).to(0.52, { scale: new Vec3(0.45, 0.45, 1), angle: 130 }).delay(0.75).union().repeatForever().start(); }
    const crown = new Node('CabinetCrownGemGlow'); crown.layer = Layers.Enum.UI_2D; crown.addComponent(UITransform).setContentSize(specs.crownRadius * 3, specs.crownRadius * 3); crown.setPosition(0, layout.height * specs.crownY); layer.addChild(crown); const crownGraphics = crown.addComponent(Graphics); crownGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 46); crownGraphics.circle(0, 0, specs.crownRadius); crownGraphics.fill(); crownGraphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 105); crownGraphics.lineWidth = 3; crownGraphics.arc(0, 0, specs.crownRadius * 0.74, 0.25, Math.PI * 1.38, false); crownGraphics.stroke(); const crownOpacity = crown.addComponent(UIOpacity); crownOpacity.opacity = 48; crown.setScale(new Vec3(0.94, 0.94, 1)); tween(crownOpacity).delay(machineIndex * 0.28).to(2.6, { opacity: 124 }, { easing: 'sineInOut' }).to(3.2, { opacity: 42 }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(crown).to(2.6, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'sineInOut' }).to(3.2, { scale: new Vec3(0.94, 0.94, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private pulseCabinetAttractMode(win: boolean): void {
    const layer = this.cabinetAttractLayer; const opacity = layer?.getComponent(UIOpacity); if (!layer?.isValid || !opacity) return; Tween.stopAllByTarget(opacity);
    if (win) tween(opacity).to(0.08, { opacity: 255 }).to(0.13, { opacity: 118 }).to(0.08, { opacity: 255 }).to(0.16, { opacity: 142 }).to(0.09, { opacity: 255 }).to(0.48, { opacity: 215 }, { easing: 'sineOut' }).start();
    else tween(opacity).to(0.1, { opacity: 245 }).to(0.5, { opacity: 215 }, { easing: 'sineOut' }).start();
  }

  private addMachineMarquee(parent: Node, machineIndex: number, layout: CabinetMachineLayout, accent: Color, booting: boolean): void {
    const marquee = new Node(`PhysicalMarqueeCopy-${machineIndex}`); marquee.layer = Layers.Enum.UI_2D; marquee.addComponent(UITransform).setContentSize(layout.marqueeWidth, layout.marqueeHeight); marquee.setPosition(0, layout.marqueeY); parent.addChild(marquee);
    const titleColors = [new Color(255, 112, 137), new Color(146, 230, 169), new Color(255, 126, 132), new Color(137, 220, 203)]; const featureCopy = ['20 FIXED LINES • FREE SPINS', '243 WAYS • EXPANDING WILD', '3 REELS • HOLD • NUDGE', '20 LINES • HOLD & SPIN'];
    const compact = machineIndex === 3; this.label(marquee, this.selectedGame.name, 0, compact ? 12 : machineIndex === 0 ? 23 : 19, compact ? 29 : machineIndex === 1 ? 36 : 38, titleColors[machineIndex], true, layout.marqueeWidth - 38);
    this.label(marquee, booting ? 'CABINET STARTUP' : featureCopy[machineIndex], 0, compact ? -21 : machineIndex === 0 ? -37 : -31, compact ? 11 : 14, new Color(242, 216, 174), true, layout.marqueeWidth - 48);
    const lamp = new Node('MarqueeBreathingLamp'); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(layout.marqueeWidth * 0.72, 12); lamp.setPosition(0, compact ? -30 : machineIndex === 0 ? -70 : -58); marquee.addChild(lamp); const lampGraphics = lamp.addComponent(Graphics); lampGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 78); lampGraphics.roundRect(-layout.marqueeWidth * 0.27, -3, layout.marqueeWidth * 0.54, 6, 3); lampGraphics.fill(); const lampOpacity = lamp.addComponent(UIOpacity); lampOpacity.opacity = 66; tween(lampOpacity).delay(machineIndex * 0.18).to(1.35, { opacity: 182 }, { easing: 'sineInOut' }).to(1.65, { opacity: 48 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private addMachineScreenSurface(parent: Node, layout: CabinetMachineLayout, machineIndex: number): Node {
    const screen = new Node(`PhysicalReelGlassAperture-${machineIndex}`); screen.layer = Layers.Enum.UI_2D; screen.addComponent(UITransform).setContentSize(layout.reelWidth, layout.reelHeight); screen.setPosition(0, layout.reelY); parent.addChild(screen); const graphics = screen.addComponent(Graphics); const surfaces = [new Color(48, 25, 28), new Color(26, 37, 26), new Color(45, 23, 18), new Color(24, 33, 35)];
    graphics.fillColor = surfaces[machineIndex]; graphics.roundRect(-layout.reelWidth / 2, -layout.reelHeight / 2, layout.reelWidth, layout.reelHeight, machineIndex === 3 ? 20 : 12); graphics.fill(); graphics.strokeColor = new Color(18, 10, 7, 210); graphics.lineWidth = 8; graphics.roundRect(-layout.reelWidth / 2 + 2, -layout.reelHeight / 2 + 2, layout.reelWidth - 4, layout.reelHeight - 4, machineIndex === 3 ? 18 : 10); graphics.stroke();
    return screen;
  }

  private addMachineGlass(parent: Node, width: number, height: number, accent: Color, y = 0): void {
    const glass = new Node('CabinetReelGlassReflection'); glass.layer = Layers.Enum.UI_2D; glass.addComponent(UITransform).setContentSize(width, height); glass.setPosition(0, y); parent.addChild(glass); const graphics = glass.addComponent(Graphics);
    graphics.fillColor = new Color(255, 250, 233, 15); graphics.moveTo(-width / 2 + 20, height / 2 - 8); graphics.lineTo(width * 0.18, height / 2 - 8); graphics.lineTo(-width * 0.08, -height / 2 + 8); graphics.lineTo(-width / 2 + 20, -height / 2 + 8); graphics.close(); graphics.fill();
    graphics.strokeColor = new Color(255, 246, 218, 68); graphics.lineWidth = 3; graphics.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 12); graphics.stroke();
    const scanner = new Node('CabinetGlassScanner'); scanner.layer = Layers.Enum.UI_2D; scanner.addComponent(UITransform).setContentSize(width - 24, 8); scanner.setPosition(0, -height / 2 + 18); glass.addChild(scanner); const scanGraphics = scanner.addComponent(Graphics); scanGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 44); scanGraphics.roundRect(-(width - 24) / 2, -3, width - 24, 6, 3); scanGraphics.fill(); const scanOpacity = scanner.addComponent(UIOpacity); scanOpacity.opacity = 24; tween(scanner).delay(1.2).to(3.8, { position: new Vec3(0, height / 2 - 18, 0) }, { easing: 'sineInOut' }).call(() => scanner.setPosition(0, -height / 2 + 18)).delay(3.2).union().repeatForever().start(); tween(scanOpacity).to(1.2, { opacity: 92 }).to(1.8, { opacity: 20 }).union().repeatForever().start();
    const sweep = new Node('CabinetGlassLightSweep'); sweep.layer = Layers.Enum.UI_2D; sweep.addComponent(UITransform).setContentSize(width * 0.24, height * 1.3); sweep.setPosition(-width * 0.68, 0); sweep.angle = -16; glass.addChild(sweep); const sweepGraphics = sweep.addComponent(Graphics); sweepGraphics.fillColor = new Color(255, 246, 214, 24); sweepGraphics.roundRect(-width * 0.09, -height * 0.58, width * 0.18, height * 1.16, width * 0.07); sweepGraphics.fill(); const sweepOpacity = sweep.addComponent(UIOpacity); sweepOpacity.opacity = 0; tween(sweep).delay(1.6).to(1.45, { position: new Vec3(width * 0.68, 0, 0) }, { easing: 'quadInOut' }).call(() => sweep.setPosition(-width * 0.68, 0)).delay(2.1).union().repeatForever().start(); tween(sweepOpacity).delay(1.45).to(0.22, { opacity: 138 }).to(0.85, { opacity: 18 }).delay(2.25).union().repeatForever().start();
  }

  private addMachineMeter(parent: Node, layout: CabinetMachineLayout, machineIndex: number, accent: Color): void {
    const height = machineIndex === 2 ? 28 : machineIndex === 3 ? 54 : 52; const meter = new Node(`CabinetDigitalMeter-${machineIndex}`); meter.layer = Layers.Enum.UI_2D; meter.addComponent(UITransform).setContentSize(layout.meterWidth, height); meter.setPosition(0, layout.meterY); parent.addChild(meter); const graphics = meter.addComponent(Graphics);
    graphics.fillColor = new Color(17, 13, 10, 238); graphics.roundRect(-layout.meterWidth / 2, -height / 2, layout.meterWidth, height, height * 0.28); graphics.fill(); graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 112); graphics.lineWidth = 2; graphics.roundRect(-layout.meterWidth / 2 + 3, -height / 2 + 3, layout.meterWidth - 6, height - 6, height * 0.23); graphics.stroke();
    this.balanceLabel = this.label(meter, `CREDITS  ${this.format(this.bootstrap.economy.balance())}`, -layout.meterWidth * 0.32, 0, machineIndex === 2 ? 10 : 14, C.white, true, layout.meterWidth * 0.34);
    this.winLabel = this.label(meter, 'WIN  0', 0, 0, machineIndex === 2 ? 11 : 15, C.paleGold, true, layout.meterWidth * 0.28);
    this.betLabel = this.label(meter, `BET  ${this.format(this.bet())}`, layout.meterWidth * 0.32, 0, machineIndex === 2 ? 10 : 14, C.white, true, layout.meterWidth * 0.3);
  }

  private addMachineControls(parent: Node, layout: CabinetMachineLayout, machineIndex: number, accent: Color): void {
    const [turboX, minusX, spinX, plusX, autoX] = layout.controlXs; const [turboY, minusY, spinY, plusY, autoY] = layout.controlYs;
    this.physicalMachineButton(parent, 'TURBO', turboX, turboY, layout.controlWidth, layout.controlHeight, () => { this.turbo = !this.turbo; this.showGame(); }, machineIndex, accent, this.turbo ? 'toggle-on' : 'toggle');
    this.physicalMachineButton(parent, '−', minusX, minusY, layout.controlWidth, layout.controlHeight, () => { this.betIndex = Math.max(0, this.betIndex - 1); this.refreshBet(); }, machineIndex, accent, 'step');
    const spin = this.physicalMachineButton(parent, 'SPIN', spinX, spinY, layout.spinWidth, layout.spinHeight, () => void this.onSpin(), machineIndex, accent, 'spin'); this.spinButtonLabel = spin.getChildByName('Text')?.getComponent(Label) ?? undefined;
    this.physicalMachineButton(parent, '+', plusX, plusY, layout.controlWidth, layout.controlHeight, () => { this.betIndex = Math.min(this.selectedGame.bets.length - 1, this.betIndex + 1); this.refreshBet(); }, machineIndex, accent, 'step');
    this.physicalMachineButton(parent, 'AUTO', autoX, autoY, layout.controlWidth, layout.controlHeight, () => void this.startAuto(), machineIndex, accent, 'toggle');
  }

  private addMachineServicePanel(parent: Node, layout: CabinetMachineLayout, machineIndex: number, accent: Color): void {
    const compact = machineIndex === 2; const plateWidth = compact ? 360 : 430; const plate = new Node(`CabinetServicePlate-${machineIndex}`); plate.layer = Layers.Enum.UI_2D; plate.addComponent(UITransform).setContentSize(plateWidth, 108); plate.setPosition(0, layout.serviceY); parent.addChild(plate); const graphics = plate.addComponent(Graphics);
    graphics.fillColor = new Color(28, 18, 13, machineIndex === 3 ? 185 : 214); graphics.roundRect(-plateWidth / 2, -51, plateWidth, 102, 24); graphics.fill(); graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 105); graphics.lineWidth = 3; graphics.roundRect(-plateWidth / 2 + 4, -47, plateWidth - 8, 94, 20); graphics.stroke();
    for (let index = 0; index < 5; index += 1) { graphics.fillColor = new Color(255, 230, 185, 58); graphics.circle(-plateWidth / 2 + 20, -25 + index * 12, 2); graphics.fill(); graphics.circle(plateWidth / 2 - 20, -25 + index * 12, 2); graphics.fill(); }
    const payX = compact ? -110 : -132; const lobbyX = compact ? 108 : 132; const payWidth = compact ? 98 : 120; const keyWidth = compact ? 82 : 102;
    this.physicalMachineButton(plate, 'PAYTABLE', payX, 12, payWidth, 44, () => this.showPaytable(), machineIndex, accent, 'service');
    this.physicalMachineButton(plate, 'RULES', 0, 12, keyWidth, 44, () => this.toast(`${this.selectedGame.name}: ${this.selectedGame.feature.replace(/-/g, ' ')}`, C.cyan), machineIndex, accent, 'service');
    this.physicalMachineButton(plate, 'LOBBY', lobbyX, 12, keyWidth, 44, () => this.router.reset('home'), machineIndex, accent, 'service');
    this.label(plate, 'VIRTUAL CREDITS • DEMO CABINET', 0, -29, 11, new Color(255, 239, 204, 155), true, plateWidth - 70);
  }

  private addGameBackButton(parent: Node, machineIndex: number, accent: Color): void {
    const x = -SafeAreaAdapter.visibleWidth / 2 + SafeAreaAdapter.safeLeft + 72;
    const y = SafeAreaAdapter.visibleHeight / 2 - SafeAreaAdapter.safeTop - 72;
    const back = this.physicalMachineButton(parent, '‹', x, y, 112, 112, () => this.router.reset('home'), machineIndex, accent, 'back');
    back.name = 'GameBackButtonTopLeft';
  }

  private physicalButtonArt(text: string): readonly [GameConfig, string] | undefined {
    const copy = text.replace(/\n/g, ' ').toUpperCase();
    if (copy.includes('CLAIM') || copy.includes('ADD CREDITS') || copy.includes('GIFT')) return [GAME_CONFIGS[3], 'bonus'];
    if (copy.includes('WHEEL') || copy.includes('AUTO')) return [GAME_CONFIGS[0], 'orrery'];
    if (copy.includes('SIGN IN') || copy === 'OPEN' || copy === 'LOBBY') return [GAME_CONFIGS[1], 'key'];
    if (copy.includes('VIEW') || copy.includes('RULES') || copy.includes('PAYTABLE')) return [GAME_CONFIGS[1], 'seal'];
    if (copy.includes('DAILY') || copy.includes('WEEKLY') || copy.includes('RANK')) return [GAME_CONFIGS[0], 'crown'];
    if (copy.includes('ALL TIME')) return [GAME_CONFIGS[3], 'battery'];
    if (copy.includes('PORTRAIT') || copy.includes('PROFILE')) return [GAME_CONFIGS[3], 'helmet'];
    if (copy.includes('LOG OUT')) return [GAME_CONFIGS[1], 'scatter'];
    if (copy.includes('TURBO')) return [GAME_CONFIGS[2], 'wild'];
    return undefined;
  }

  private physicalMachineButton(parent: Node, text: string, x: number, y: number, width: number, height: number, action: () => void, machineIndex: number, accent: Color, style: 'spin' | 'toggle' | 'toggle-on' | 'step' | 'service' | 'back'): Node {
    const node = new Node(style === 'spin' ? 'PhysicalSpinButton' : `PhysicalMachineButton-${style}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); parent.addChild(node); const graphics = node.addComponent(Graphics); const circular = style === 'back'; const oval = !circular && style !== 'service' && (machineIndex === 2 || machineIndex === 3); const active = style === 'spin' || style === 'toggle-on'; const shell = machineIndex === 3 ? new Color(239, 225, 195) : new Color(205, 177, 132); const face = style === 'spin' ? new Color(accent.r, accent.g, accent.b, 255) : style === 'toggle-on' ? new Color(accent.r, accent.g, accent.b, 225) : style === 'service' ? new Color(39, 29, 21, 248) : new Color(29, 24, 19, 250);
    if (circular) { graphics.fillColor = new Color(28, 20, 15, 220); graphics.circle(0, 0, width / 2); graphics.fill(); graphics.strokeColor = shell; graphics.lineWidth = 5; graphics.circle(0, 0, width / 2 - 3); graphics.stroke(); graphics.fillColor = new Color(255, 240, 207, 32); graphics.circle(-8, 10, width * 0.2); graphics.fill(); }
    else if (oval) { graphics.fillColor = new Color(22, 15, 10, 235); graphics.ellipse(0, -2, width / 2 + 4, height / 2 + 4); graphics.fill(); graphics.fillColor = shell; graphics.ellipse(0, 0, width / 2, height / 2); graphics.fill(); graphics.fillColor = face; graphics.ellipse(0, 0, width / 2 - 6, height / 2 - 6); graphics.fill(); graphics.fillColor = new Color(255, 255, 255, active ? 42 : 22); graphics.ellipse(-width * 0.06, height * 0.12, width * 0.27, Math.max(3, height * 0.1)); graphics.fill(); graphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, active ? 165 : 82); graphics.lineWidth = active ? 3 : 2; graphics.ellipse(0, 0, width / 2 - 3, height / 2 - 3); graphics.stroke(); }
    else { graphics.fillColor = new Color(22, 15, 10, 235); graphics.roundRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, Math.min(18, height * 0.35)); graphics.fill(); graphics.fillColor = shell; graphics.roundRect(-width / 2, -height / 2, width, height, Math.min(16, height * 0.32)); graphics.fill(); graphics.fillColor = face; graphics.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, Math.min(12, height * 0.25)); graphics.fill(); graphics.fillColor = new Color(255, 255, 255, active ? 36 : 18); graphics.roundRect(-width / 2 + 10, 2, width - 20, Math.max(7, height * 0.2), 6); graphics.fill(); graphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, active ? 155 : 72); graphics.lineWidth = active ? 3 : 2; graphics.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, Math.min(14, height * 0.29)); graphics.stroke(); }
    if (!circular) { const shadow = new Node('ButtonDepthShadow'); shadow.layer = Layers.Enum.UI_2D; shadow.addComponent(UITransform).setContentSize(width, height); shadow.setPosition(0, -height * 0.1); node.addChild(shadow); shadow.setSiblingIndex(0); const shadowGraphics = shadow.addComponent(Graphics); shadowGraphics.fillColor = new Color(8, 5, 3, 118); if (oval) shadowGraphics.ellipse(0, 0, width / 2 - 5, height / 2 - 5); else shadowGraphics.roundRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, Math.min(14, height * 0.27)); shadowGraphics.fill(); }
    const feedbackGlow = new Node('ButtonFeedbackGlow'); feedbackGlow.layer = Layers.Enum.UI_2D; feedbackGlow.addComponent(UITransform).setContentSize(width + 24, height + 24); feedbackGlow.setPosition(0, 0); node.addChild(feedbackGlow); feedbackGlow.setSiblingIndex(0); const feedbackGraphics = feedbackGlow.addComponent(Graphics); feedbackGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, active ? 145 : 82); feedbackGraphics.lineWidth = active ? 6 : 4; if (circular) feedbackGraphics.circle(0, 0, width / 2 + 5); else if (oval) feedbackGraphics.ellipse(0, 0, width / 2 + 5, height / 2 + 5); else feedbackGraphics.roundRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, Math.min(21, height * 0.38)); feedbackGraphics.stroke(); const feedbackOpacity = feedbackGlow.addComponent(UIOpacity); feedbackOpacity.opacity = active ? 124 : 22;
    if (active) tween(feedbackOpacity).to(1.25, { opacity: 186 }, { easing: 'sineInOut' }).to(1.55, { opacity: 82 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const copy = text.replace(/\n/g, ' ').toUpperCase(); const navButton = height >= 90 && ['HOME', 'STORE', 'REWARDS', 'RANK', 'PROFILE'].includes(copy); const art = !navButton && style !== 'spin' && style !== 'step' && width >= 145 && height >= 52 ? this.physicalButtonArt(text) : undefined; const artOffset = art ? height * 0.3 : 0;
    if (art) this.addPremiumSymbol(node, art[0], art[1], -width / 2 + height * 0.57, 0, height * 0.7, 'button', 236, 0.08);
    const copyColor = active ? C.paleGold : C.white; const fontSize = style === 'step' || style === 'back' ? Math.min(30, height * 0.5) : style === 'spin' ? 20 : style === 'service' ? (height >= 90 ? 16 : 13) : width >= 180 ? 17 : 12; const label = this.label(node, text, artOffset, 0, fontSize, copyColor, true, width - (art ? height + 22 : 12)); label.node.name = 'Text';
    if (!circular && !oval) { const indicator = new Node('ButtonStatusLED'); indicator.layer = Layers.Enum.UI_2D; indicator.addComponent(UITransform).setContentSize(Math.max(30, width * 0.32), 8); indicator.setPosition(0, -height / 2 + 7); node.addChild(indicator); const indicatorGraphics = indicator.addComponent(Graphics); indicatorGraphics.fillColor = new Color(accent.r, accent.g, accent.b, active ? 210 : 112); indicatorGraphics.roundRect(-Math.max(15, width * 0.16), -2, Math.max(30, width * 0.32), 4, 2); indicatorGraphics.fill(); const indicatorOpacity = indicator.addComponent(UIOpacity); indicatorOpacity.opacity = active ? 210 : 78; tween(indicatorOpacity).to(1.8, { opacity: active ? 245 : 132 }).to(2.2, { opacity: active ? 145 : 54 }).union().repeatForever().start(); }
    const button = node.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.91;
    const restore = (): void => { node.setPosition(x, y); tween(feedbackOpacity).to(0.16, { opacity: active ? 124 : 22 }, { easing: 'quadOut' }).start(); };
    node.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(style === 'spin' ? 18 : 8); node.setPosition(x, y - 3); tween(feedbackOpacity).to(0.08, { opacity: 238 }).start(); tween(feedbackGlow).to(0.08, { scale: new Vec3(1.06, 1.06, 1) }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); if (height >= 52) this.vfx?.buttonBurst(node, style === 'spin' ? C.paleGold : accent); }, this);
    node.on(Node.EventType.TOUCH_CANCEL, restore, this); node.on(Node.EventType.TOUCH_END, () => { restore(); action(); }, this); return node;
  }

  private addGeneratedCabinetSkin(parent: Node, machineIndex: number): void {
    const topSizes = [{ width: 1010, height: 430, y: 645 }, { width: 930, height: 420, y: 650 }, { width: 760, height: 410, y: 645 }, { width: 940, height: 440, y: 650 }];
    const lowerSizes = [{ width: 900, height: 600, y: -680 }, { width: 880, height: 580, y: -690 }, { width: 740, height: 590, y: -690 }, { width: 860, height: 600, y: -680 }];
    const addPart = (name: string, lower: boolean, layout: { width: number; height: number; y: number }): void => {
      const node = new Node(name); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(layout.width, layout.height); node.setPosition(0, layout.y); parent.addChild(node); const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.type = Sprite.Type.SIMPLE; const opacity = node.addComponent(UIOpacity); opacity.opacity = 248;
      this.withCabinetTexture(machineIndex, lower, (texture) => { if (!node.isValid || !parent.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame; });
    };
    addPart(`GeneratedCabinetTop-${machineIndex}`, false, topSizes[machineIndex]);
    addPart(`GeneratedCabinetLower-${machineIndex}`, true, lowerSizes[machineIndex]);
  }

  private addLowerCabinetContent(parent: Node, x: number, y: number, accent: Color): void {
    const machineIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); const sizes = [{ width: 360, height: 100, radius: 48 }, { width: 400, height: 112, radius: 20 }, { width: 340, height: 108, radius: 18 }, { width: 250, height: 148, radius: 72 }]; const size = sizes[machineIndex];
    const plaque = new Node(`CabinetLowerContent-${machineIndex}`); plaque.layer = Layers.Enum.UI_2D; plaque.addComponent(UITransform).setContentSize(size.width, size.height); plaque.setPosition(x, y); parent.addChild(plaque); const graphics = plaque.addComponent(Graphics); graphics.fillColor = new Color(255, 246, 222, 32); graphics.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, size.radius); graphics.fill(); graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 118); graphics.lineWidth = 3; graphics.roundRect(-size.width / 2 + 4, -size.height / 2 + 4, size.width - 8, size.height - 8, Math.max(8, size.radius - 4)); graphics.stroke();
    this.label(plaque, ['ROYAL JEWEL\nCABINET', 'GOLD MECHANICAL\nCABINET', 'CLASSIC 3 REEL\nCABINET', 'PEARL FORTUNE\nCABINET'][machineIndex], 0, 0, 17, new Color(88, 51, 30), true, size.width - 28);
  }

  private addGrandSlotMarquee(parent: Node, x: number, y: number, width: number, height: number, accent: Color): void {
    const machineIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); const spec = [
      { face: new Color(166, 48, 75, 252), glass: new Color(112, 26, 50, 240), lamp: new Color(255, 126, 145), subtitle: 'ROYAL JEWELS  •  STICKY FREE SPINS' },
      { face: new Color(168, 111, 40, 252), glass: new Color(67, 113, 76, 240), lamp: new Color(142, 232, 175), subtitle: 'MECHANICAL GOLD  •  243 WAYS' },
      { face: new Color(158, 42, 61, 252), glass: new Color(105, 29, 43, 240), lamp: new Color(255, 129, 143), subtitle: 'CLASSIC 3 REEL  •  HOLD & NUDGE' },
      { face: new Color(72, 131, 114, 252), glass: new Color(45, 94, 83, 240), lamp: new Color(154, 235, 205), subtitle: 'PEARL VAULT  •  HOLD & SPIN' },
    ][machineIndex];
    const marquee = new Node(`GrandSlotMarquee-${machineIndex}`); marquee.layer = Layers.Enum.UI_2D; marquee.addComponent(UITransform).setContentSize(width, height); marquee.setPosition(x, y); parent.addChild(marquee); const graphics = marquee.addComponent(Graphics);
    graphics.fillColor = new Color(242, 216, 174, 255); graphics.roundRect(-width / 2, -height / 2 + 8, width, height - 16, 76); graphics.fill();
    graphics.fillColor = spec.face; graphics.roundRect(-width / 2 + 17, -height / 2 + 24, width - 34, height - 48, 60); graphics.fill();
    graphics.fillColor = spec.glass; graphics.roundRect(-width / 2 + 48, -height / 2 + 48, width - 96, height - 96, 44); graphics.fill();
    graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 245); graphics.lineWidth = 10; graphics.roundRect(-width / 2 + 6, -height / 2 + 14, width - 12, height - 28, 70); graphics.stroke();
    graphics.strokeColor = new Color(255, 240, 201, 160); graphics.lineWidth = 3; graphics.roundRect(-width / 2 + 34, -height / 2 + 39, width - 68, height - 78, 48); graphics.stroke();
    this.addCardShine(marquee, width - 104, height - 100, C.paleGold, 1.8);
    const bulbPositions: Vec3[] = [];
    for (let index = 0; index < 11; index += 1) { bulbPositions.push(new Vec3(-width / 2 + 64 + index * ((width - 128) / 10), height / 2 - 31)); bulbPositions.push(new Vec3(-width / 2 + 64 + index * ((width - 128) / 10), -height / 2 + 31)); }
    bulbPositions.forEach((position, index) => { const bulb = new Node(`GrandMarqueeBulb-${index}`); bulb.layer = Layers.Enum.UI_2D; bulb.addComponent(UITransform).setContentSize(24, 24); bulb.setPosition(position); marquee.addChild(bulb); const bulbGraphics = bulb.addComponent(Graphics); bulbGraphics.fillColor = index % 5 === 0 ? spec.lamp : C.paleGold; bulbGraphics.circle(0, 0, index % 5 === 0 ? 8 : 7); bulbGraphics.fill(); bulbGraphics.strokeColor = new Color(115, 74, 31, 210); bulbGraphics.lineWidth = 2; bulbGraphics.circle(0, 0, 10); bulbGraphics.stroke(); const opacity = bulb.addComponent(UIOpacity); opacity.opacity = 142 + index % 3 * 18; tween(opacity).delay(machineIndex * 0.3 + index * 0.06).to(2.4, { opacity: 228 }, { easing: 'sineInOut' }).to(2.8, { opacity: 126 }, { easing: 'sineInOut' }).union().repeatForever().start(); });
    this.label(marquee, this.selectedGame.name, 0, 34, 43, C.paleGold, true, 590);
    this.label(marquee, spec.subtitle, 0, -18, 17, C.white, true, 610);
    const meter = new Node('DemoJackpotMeter'); meter.layer = Layers.Enum.UI_2D; meter.addComponent(UITransform).setContentSize(520, 36); meter.setPosition(0, -74); marquee.addChild(meter); const meterGraphics = meter.addComponent(Graphics); meterGraphics.fillColor = new Color(18, 10, 7, 210); meterGraphics.roundRect(-260, -17, 520, 34, 15); meterGraphics.fill(); meterGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, 175); meterGraphics.lineWidth = 2; meterGraphics.roundRect(-260, -17, 520, 34, 15); meterGraphics.stroke(); this.label(meter, 'DEMO JACKPOT METER  •  VIRTUAL CREDITS ONLY', 0, 0, 13, C.paleGold, true, 490);
  }

  private addLowerSlotPedestal(parent: Node, x: number, y: number, width: number, height: number, accent: Color): void {
    const machineIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); const bodyColors = [new Color(151, 40, 65), new Color(76, 123, 79), new Color(142, 37, 55), new Color(69, 126, 111)]; const featureCopy = ['ROYAL JEWEL CABINET', 'GOLD MECHANICAL CABINET', 'CLASSIC CASINO CABINET', 'PEARL FORTUNE CABINET'][machineIndex];
    const pedestal = new Node(`LowerSlotPedestal-${machineIndex}`); pedestal.layer = Layers.Enum.UI_2D; pedestal.addComponent(UITransform).setContentSize(width, height); pedestal.setPosition(x, y); parent.addChild(pedestal); const graphics = pedestal.addComponent(Graphics);
    graphics.fillColor = new Color(239, 211, 169, 255); graphics.roundRect(-width / 2, -height / 2, width, height, 52); graphics.fill();
    graphics.fillColor = new Color(bodyColors[machineIndex].r, bodyColors[machineIndex].g, bodyColors[machineIndex].b, 255); graphics.roundRect(-width / 2 + 26, -height / 2 + 25, width - 52, height - 50, 38); graphics.fill();
    graphics.fillColor = new Color(82, 45, 31, 74); graphics.roundRect(-width / 2 + 118, -height / 2 + 52, width - 236, height - 104, 30); graphics.fill();
    graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 248); graphics.lineWidth = 10; graphics.roundRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16, 46); graphics.stroke();
    graphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 120); graphics.lineWidth = 3; graphics.roundRect(-width / 2 + 104, -height / 2 + 43, width - 208, height - 86, 34); graphics.stroke();
    for (const side of [-1, 1]) {
      graphics.fillColor = new Color(255, 232, 194, 242); graphics.roundRect(side * (width / 2 - 67) - 37, -height / 2 + 32, 74, height - 64, 30); graphics.fill();
      graphics.fillColor = new Color(accent.r, accent.g, accent.b, 125); graphics.roundRect(side * (width / 2 - 67) - 20, -height / 2 + 54, 40, height - 108, 18); graphics.fill();
      graphics.strokeColor = C.gold; graphics.lineWidth = 4; graphics.roundRect(side * (width / 2 - 67) - 37, -height / 2 + 32, 74, height - 64, 30); graphics.stroke();
    }
    graphics.fillColor = new Color(76, 44, 24, 252); graphics.roundRect(-width / 2 + 36, height / 2 - 30, width - 72, 52, 22); graphics.fill(); graphics.strokeColor = C.paleGold; graphics.lineWidth = 4; graphics.roundRect(-width / 2 + 36, height / 2 - 30, width - 72, 52, 22); graphics.stroke();
    graphics.fillColor = new Color(96, 57, 29, 255); graphics.roundRect(-width / 2 - 18, -height / 2 + 4, width + 36, 48, 20); graphics.fill(); graphics.strokeColor = C.gold; graphics.lineWidth = 5; graphics.roundRect(-width / 2 - 18, -height / 2 + 4, width + 36, 48, 20); graphics.stroke();
    this.addCardShine(pedestal, width - 230, height - 106, C.paleGold, 2.9);
    const medallion = new Node('CabinetThemeMedallion'); medallion.layer = Layers.Enum.UI_2D; medallion.addComponent(UITransform).setContentSize(190, 190); medallion.setPosition(0, 12); pedestal.addChild(medallion); const medallionGraphics = medallion.addComponent(Graphics); medallionGraphics.fillColor = new Color(255, 239, 205, 220); medallionGraphics.circle(0, 0, 82); medallionGraphics.fill(); medallionGraphics.strokeColor = C.gold; medallionGraphics.lineWidth = 8; medallionGraphics.circle(0, 0, 86); medallionGraphics.stroke(); medallionGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, 175); medallionGraphics.lineWidth = 3; medallionGraphics.circle(0, 0, 69); medallionGraphics.stroke(); this.label(medallion, 'IMPERIAL\nTREASURE', 0, 0, 18, new Color(94, 55, 31), true, 145);
    this.label(pedestal, featureCopy, 0, -112, 16, C.paleGold, true, 460);
  }

  private addSlotCabinetHardware(parent: Node, x: number, y: number, width: number, height: number, accent: Color): void {
    const machineIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); const machine = [
      { shell: new Color(238, 210, 176), inset: new Color(255, 239, 218, 156), marquee: new Color(125, 24, 48), knob: new Color(192, 42, 70), copy: 'RUBY ROYAL  •  20 LINES  •  FREE SPINS' },
      { shell: new Color(221, 186, 119), inset: new Color(255, 235, 184, 156), marquee: new Color(38, 88, 63), knob: new Color(45, 126, 89), copy: 'GOLD MECHANICAL  •  243 WAYS  •  WILD' },
      { shell: new Color(222, 196, 157), inset: new Color(255, 234, 204, 148), marquee: new Color(105, 19, 35), knob: new Color(218, 51, 73), copy: 'CLASSIC 3 REEL  •  HOLD  •  NUDGE' },
      { shell: new Color(238, 224, 196), inset: new Color(255, 247, 229, 168), marquee: new Color(38, 93, 82), knob: new Color(90, 164, 144), copy: 'PEARL FORTUNE  •  HOLD & SPIN  •  JACKPOT' },
    ][machineIndex];
    const cabinet = new Node(`LuxurySlotCabinet-${machineIndex}`); cabinet.layer = Layers.Enum.UI_2D; cabinet.addComponent(UITransform).setContentSize(width, height); cabinet.setPosition(x, y); parent.addChild(cabinet);
    const shell = cabinet.addComponent(Graphics); shell.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 155); shell.lineWidth = 5; shell.roundRect(-width / 2 + 14, -height / 2 + 14, width - 28, height - 28, 44); shell.stroke(); shell.strokeColor = new Color(accent.r, accent.g, accent.b, 95); shell.lineWidth = machineIndex === 1 ? 5 : 3; shell.roundRect(-width / 2 + 28, -height / 2 + 28, width - 56, height - 56, 34); shell.stroke();
    const marquee = new Node('CabinetMarquee'); marquee.layer = Layers.Enum.UI_2D; marquee.addComponent(UITransform).setContentSize(700, 58); marquee.setPosition(0, height / 2 - 38); cabinet.addChild(marquee); const marqueeGraphics = marquee.addComponent(Graphics); marqueeGraphics.fillColor = machine.marquee; marqueeGraphics.roundRect(-350, -27, 700, 54, 25); marqueeGraphics.fill(); marqueeGraphics.fillColor = new Color(255, 216, 137, 30); marqueeGraphics.roundRect(-330, 4, 660, 14, 7); marqueeGraphics.fill(); marqueeGraphics.strokeColor = C.paleGold; marqueeGraphics.lineWidth = 3; marqueeGraphics.roundRect(-350, -27, 700, 54, 25); marqueeGraphics.stroke(); this.label(marquee, machine.copy, 0, 0, 18, C.paleGold, true, 650);
    const bulbPoints: Vec3[] = [];
    for (let index = 0; index < 10; index += 1) bulbPoints.push(new Vec3(-420 + index * 94, height / 2 - 28, 0));
    for (let index = 0; index < 5; index += 1) { bulbPoints.push(new Vec3(-width / 2 + 18, 220 - index * 106, 0)); bulbPoints.push(new Vec3(width / 2 - 18, 220 - index * 106, 0)); }
    bulbPoints.forEach((position, index) => { const bulb = new Node(`MarqueeBulb-${index}`); bulb.layer = Layers.Enum.UI_2D; bulb.addComponent(UITransform).setContentSize(22, 22); bulb.setPosition(position); cabinet.addChild(bulb); const glow = bulb.addComponent(Graphics); glow.fillColor = index % 4 === 0 ? new Color(accent.r, accent.g, accent.b, 210) : C.paleGold; glow.circle(0, 0, index % 4 === 0 ? 7 : 6); glow.fill(); glow.strokeColor = new Color(105, 70, 28, 220); glow.lineWidth = 2; glow.circle(0, 0, 9); glow.stroke(); const opacity = bulb.addComponent(UIOpacity); opacity.opacity = 120 + index % 3 * 25; tween(opacity).delay(index * 0.11 + machineIndex * 0.26).to(2.1, { opacity: 225 }, { easing: 'sineInOut' }).to(2.4, { opacity: 110 }, { easing: 'sineInOut' }).union().repeatForever().start(); });
    const lever = new Node('MechanicalLever'); lever.layer = Layers.Enum.UI_2D; lever.addComponent(UITransform).setContentSize(70, 250); lever.setPosition(width / 2 - 22, -42); cabinet.addChild(lever); const leverGraphics = lever.addComponent(Graphics); leverGraphics.fillColor = new Color(121, 77, 39); leverGraphics.roundRect(-26, -92, 52, 82, 20); leverGraphics.fill(); leverGraphics.strokeColor = C.gold; leverGraphics.lineWidth = 5; leverGraphics.roundRect(-26, -92, 52, 82, 20); leverGraphics.stroke(); leverGraphics.strokeColor = C.paleGold; leverGraphics.lineWidth = 9; leverGraphics.moveTo(0, -18); leverGraphics.lineTo(0, 82); leverGraphics.stroke(); leverGraphics.fillColor = machine.knob; leverGraphics.circle(0, 100, machineIndex === 3 ? 29 : 26); leverGraphics.fill(); leverGraphics.fillColor = new Color(255, 239, 215, 105); leverGraphics.circle(-8, 109, 9); leverGraphics.fill(); leverGraphics.strokeColor = C.paleGold; leverGraphics.lineWidth = 4; leverGraphics.circle(0, 100, machineIndex === 3 ? 29 : 26); leverGraphics.stroke(); this.slotLever = lever;
    const tray = new Node('CoinTray'); tray.layer = Layers.Enum.UI_2D; tray.addComponent(UITransform).setContentSize(330, 42); tray.setPosition(0, -height / 2 + 26); cabinet.addChild(tray); const trayGraphics = tray.addComponent(Graphics); trayGraphics.fillColor = new Color(28, 17, 12); trayGraphics.roundRect(-165, -18, 330, 36, 16); trayGraphics.fill(); trayGraphics.strokeColor = C.gold; trayGraphics.lineWidth = 3; trayGraphics.roundRect(-165, -18, 330, 36, 16); trayGraphics.stroke(); trayGraphics.fillColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 80); trayGraphics.roundRect(-112, -5, 224, 10, 5); trayGraphics.fill();
  }

  private addSlotControlDeck(parent: Node, x: number, y: number, width: number, height: number, accent: Color): void {
    const machineIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); const deckFills = [new Color(122, 25, 43), new Color(49, 91, 62), new Color(101, 20, 36), new Color(47, 99, 86)]; const featureLabels = [['20 LINES', 'FREE SPINS', 'RUBY'], ['243 WAYS', 'WILD', 'RESPIN'], ['HOLD', 'NUDGE', 'DOUBLE'], ['HOLD & SPIN', 'PEARL', 'JACKPOT']][machineIndex];
    const deck = new Node('PhysicalSlotControlDeck'); deck.layer = Layers.Enum.UI_2D; deck.addComponent(UITransform).setContentSize(width, height); deck.setPosition(x, y); parent.addChild(deck); const graphics = deck.addComponent(Graphics);
    graphics.fillColor = new Color(232, 207, 166, 252); graphics.roundRect(-width / 2, -height / 2, width, height, 62); graphics.fill();
    graphics.fillColor = new Color(deckFills[machineIndex].r, deckFills[machineIndex].g, deckFills[machineIndex].b, 248); graphics.roundRect(-width / 2 + 24, -height / 2 + 28, width - 48, height - 76, 44); graphics.fill();
    graphics.fillColor = new Color(255, 242, 211, 234); graphics.roundRect(-width / 2 + 58, -height / 2 + 74, width - 116, height - 158, 38); graphics.fill();
    graphics.strokeColor = C.gold; graphics.lineWidth = 10; graphics.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, 56); graphics.stroke();
    graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 135); graphics.lineWidth = 3; graphics.roundRect(-width / 2 + 38, -height / 2 + 42, width - 76, height - 104, 38); graphics.stroke();
    const balanceRail = new Node('BalanceRail'); balanceRail.layer = Layers.Enum.UI_2D; balanceRail.addComponent(UITransform).setContentSize(720, 62); balanceRail.setPosition(0, height / 2 - 38); deck.addChild(balanceRail); const railGraphics = balanceRail.addComponent(Graphics); railGraphics.fillColor = new Color(deckFills[machineIndex].r, deckFills[machineIndex].g, deckFills[machineIndex].b, 250); railGraphics.roundRect(-360, -29, 720, 58, 27); railGraphics.fill(); railGraphics.strokeColor = C.paleGold; railGraphics.lineWidth = 3; railGraphics.roundRect(-360, -29, 720, 58, 27); railGraphics.stroke();
    for (const screwX of [-width / 2 + 34, width / 2 - 34]) { const screw = new Node('CabinetScrew'); screw.layer = Layers.Enum.UI_2D; screw.addComponent(UITransform).setContentSize(26, 26); screw.setPosition(screwX, -height / 2 + 42); deck.addChild(screw); const screwGraphics = screw.addComponent(Graphics); screwGraphics.fillColor = C.gold; screwGraphics.circle(0, 0, 11); screwGraphics.fill(); screwGraphics.strokeColor = C.paleGold; screwGraphics.lineWidth = 2; screwGraphics.moveTo(-5, 0); screwGraphics.lineTo(5, 0); screwGraphics.stroke(); }
    featureLabels.forEach((copy, index) => { const light = new Node(`CabinetFeatureLight-${index}`); light.layer = Layers.Enum.UI_2D; light.addComponent(UITransform).setContentSize(210, 42); light.setPosition(-250 + index * 250, 106); deck.addChild(light); const lightGraphics = light.addComponent(Graphics); lightGraphics.fillColor = new Color(accent.r, accent.g, accent.b, index === 1 ? 165 : 100); lightGraphics.roundRect(-100, -18, 200, 36, 16); lightGraphics.fill(); lightGraphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 140); lightGraphics.lineWidth = 2; lightGraphics.roundRect(-100, -18, 200, 36, 16); lightGraphics.stroke(); this.label(light, copy, 0, 0, 14, C.white, true, 185); });
    const gloss = new Node('DeckGlassGloss'); gloss.layer = Layers.Enum.UI_2D; gloss.addComponent(UITransform).setContentSize(width - 120, 80); gloss.setPosition(0, -2); deck.addChild(gloss); const glossGraphics = gloss.addComponent(Graphics); glossGraphics.fillColor = new Color(255, 255, 255, 25); glossGraphics.roundRect(-(width - 120) / 2, 4, width - 120, 32, 16); glossGraphics.fill(); const glossOpacity = gloss.addComponent(UIOpacity); glossOpacity.opacity = 42; tween(glossOpacity).to(2.4, { opacity: 92 }, { easing: 'sineInOut' }).to(2.8, { opacity: 34 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private pullSlotLever(): void {
    const lever = this.slotLever; if (!lever?.isValid) return; Tween.stopAllByTarget(lever); const origin = lever.position.clone(); tween(lever).to(0.12, { position: new Vec3(origin.x, origin.y - 78, origin.z), angle: 7 }, { easing: 'quadIn' }).to(0.32, { position: origin, angle: 0 }, { easing: 'backOut' }).start();
  }

  private topY(designY: number): number { return designY + (SafeAreaAdapter.visibleHeight - H) / 2 - SafeAreaAdapter.safeTop; }

  private resolvedPanelFrameIndex(requestedIndex?: number): number {
    const route = this.router?.route; const gameRoute = route === 'game' || route === 'game-loading'; const routeIndex: Partial<Record<Route, number>> = { login: 1, register: 1, forgot: 1, home: 0, store: 3, rewards: 1, rank: 0, profile: 3, 'check-in': 3, wheel: 0, achievements: 1, mail: 3, settings: 3 };
    return requestedIndex ?? (gameRoute ? Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)) : routeIndex[route] ?? 0);
  }

  private visualSurfaceInsets(width: number, height: number, requestedIndex?: number, compact = false, requestedOuterSize?: { width: number; height: number }): SurfaceInsets {
    const index = this.resolvedPanelFrameIndex(requestedIndex); const style = FRAME_STYLES[index] ?? FRAME_STYLES[0]; const source = FRAME_TEXTURE_SIZES[style.textureIndex]; const metrics = FRAME_METRICS[index] ?? FRAME_METRICS[0]; const geometry = this.calculateFrameGeometry(source.width, source.height, width, height, index, compact); const inverted = Math.abs((style.angle ?? 0) % 360) === 180; const alignedX = inverted ? -geometry.offsetX : geometry.offsetX; const alignedY = inverted ? -geometry.offsetY : geometry.offsetY; const outerWidth = requestedOuterSize?.width ?? geometry.width; const outerHeight = requestedOuterSize?.height ?? geometry.height;
    // Generated frames contain transparent apertures with very different
    // crowns and corner housings. Measure the visible aperture from the source
    // alpha geometry, scale it only when the whole target is smaller, and crop
    // the surface to that aperture. This is intentionally independent from the
    // panel's mathematical bounds: pixels under a transparent ornament still
    // read as overflow to the eye.
    const renderedScale = Math.max(0.12, Math.min(1, outerWidth / source.width, outerHeight / source.height)); let apertureLeft = source.width * metrics.innerLeftRatio * renderedScale; let apertureRight = source.width * metrics.innerRightRatio * renderedScale; let apertureTop = source.height * metrics.innerTopRatio * renderedScale; let apertureBottom = source.height * metrics.innerBottomRatio * renderedScale;
    if (inverted) { [apertureLeft, apertureRight] = [apertureRight, apertureLeft]; [apertureTop, apertureBottom] = [apertureBottom, apertureTop]; }
    const safety = Math.max(3, Math.min(7, Math.min(width, height) * (compact ? 0.055 : 0.025))); let left = alignedX - outerWidth / 2 + apertureLeft + width / 2 + safety; let right = width / 2 - (alignedX + outerWidth / 2 - apertureRight) + safety; let top = height / 2 - (alignedY + outerHeight / 2 - apertureTop) + safety; let bottom = alignedY - outerHeight / 2 + apertureBottom + height / 2 + safety;
    const normalize = (leading: number, trailing: number, size: number): readonly [number, number] => { let first = Math.max(3, leading); let second = Math.max(3, trailing); const maximum = Math.max(6, size - 16); if (first + second > maximum) { const scale = maximum / (first + second); first *= scale; second *= scale; } return [first, second]; };
    [left, right] = normalize(left, right, width); [top, bottom] = normalize(top, bottom, height); return { left, right, top, bottom };
  }

  private panel(parent: Node, x: number, y: number, width: number, height: number, radius: number, fill: Color, stroke?: Color, lineWidth = 0, imageBorder = true, frameIndex?: number, frameAlpha?: number): Node {
    const framedSurface = imageBorder && width >= 180 && height >= 52 && radius >= 10; const visualInset = framedSurface ? this.visualSurfaceInsets(width, height, frameIndex) : { left: 0, right: 0, top: 0, bottom: 0 }; const surfaceWidth = Math.max(2, width - visualInset.left - visualInset.right); const surfaceHeight = Math.max(2, height - visualInset.top - visualInset.bottom); const surfaceX = (visualInset.left - visualInset.right) / 2; const surfaceY = (visualInset.bottom - visualInset.top) / 2; const node = new Node('Panel'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); parent.addChild(node); const graphics = node.addComponent(Graphics); graphics.fillColor = fill; graphics.roundRect(-surfaceWidth / 2 + surfaceX, -surfaceHeight / 2 + surfaceY, surfaceWidth, surfaceHeight, Math.max(4, Math.min(radius, surfaceHeight * 0.26))); graphics.fill(); if (stroke && lineWidth && !imageBorder) { graphics.strokeColor = stroke; graphics.lineWidth = lineWidth; graphics.roundRect(-width / 2 + lineWidth / 2, -height / 2 + lineWidth / 2, width - lineWidth, height - lineWidth, Math.max(0, radius - lineWidth)); graphics.stroke(); }
    if (width >= 600 && height >= 120 && radius >= 18) this.addPanelTexture(node, width, height, radius, visualInset);
    if (imageBorder && width >= 180 && height >= 52 && radius >= 10) this.addPanelImageBorder(node, width, height, frameIndex, frameAlpha);
    return node;
  }

  private addPanelTexture(parent: Node, width: number, height: number, radius: number, visualInset: SurfaceInsets): void {
    const surfaceWidth = Math.max(2, width - visualInset.left - visualInset.right); const surfaceHeight = Math.max(2, height - visualInset.top - visualInset.bottom); const clip = new Node('PanelImageTexture'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(surfaceWidth, surfaceHeight); clip.setPosition((visualInset.left - visualInset.right) / 2, (visualInset.bottom - visualInset.top) / 2); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); const seal = Math.max(2, Math.min(8, radius * 0.2)); if (stencil) { stencil.clear(); stencil.roundRect(-surfaceWidth / 2 + seal, -surfaceHeight / 2 + seal, surfaceWidth - seal * 2, surfaceHeight - seal * 2, Math.max(4, Math.min(radius, surfaceHeight * 0.26) - seal)); stencil.fill(); } parent.addChild(clip); clip.setSiblingIndex(0);
    const route = this.router?.route; const game = route === 'game' || route === 'game-loading'; const path = game ? { 'astral-vault': 'generated/game01/base_bg_casino_v02', 'golden-dynasty': 'generated/game02/base_bg_casino_v02', 'neon-classic': 'generated/game03/base_bg_casino_v02', 'cosmic-coins': 'generated/game04/base_bg_casino_v02' }[this.selectedGame.id] : 'generated/common/common_bg_v01';
    resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('PanelMaterialImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(surfaceWidth / texture.width, surfaceHeight / texture.height) * 1.08; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(-16, -8); const opacity = image.addComponent(UIOpacity); opacity.opacity = 34; tween(image).to(7.2, { position: new Vec3(18, 10, 0), scale: new Vec3(scale * 1.025, scale * 1.025, 1) }, { easing: 'sineInOut' }).to(7.2, { position: new Vec3(-16, -8, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(3.2, { opacity: 52 }).to(4, { opacity: 28 }).union().repeatForever().start(); });
  }

  private addPanelImageBorder(parent: Node, width: number, height: number, requestedIndex?: number, requestedAlpha?: number, requestedOuterSize?: { width: number; height: number; innerContent?: Node }): void {
    const index = this.resolvedPanelFrameIndex(requestedIndex); const style = FRAME_STYLES[index] ?? FRAME_STYLES[0]; const sourceSize = FRAME_TEXTURE_SIZES[style.textureIndex]; const geometry = this.calculateFrameGeometry(sourceSize.width, sourceSize.height, width, height, index); const inverted = Math.abs((style.angle ?? 0) % 360) === 180; const alignedX = inverted ? -geometry.offsetX : geometry.offsetX; const alignedY = inverted ? -geometry.offsetY : geometry.offsetY;
    const border = new Node(`PanelImageBorder-${index}`); border.layer = Layers.Enum.UI_2D; const borderTransform = border.addComponent(UITransform); borderTransform.setContentSize(requestedOuterSize?.width ?? geometry.width, requestedOuterSize?.height ?? geometry.height); border.angle = style.angle ?? 0; if (requestedOuterSize) { border.setPosition(0, 0); requestedOuterSize.innerContent?.setPosition(-alignedX, -alignedY); } else border.setPosition(alignedX, alignedY); parent.addChild(border); const sprite = border.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.type = Sprite.Type.SLICED; if (style.tint) sprite.color = style.tint; const opacity = border.addComponent(UIOpacity); const portrait = width < height * 1.2; opacity.opacity = requestedAlpha ?? (portrait ? 220 : height <= 110 ? 215 : height <= 200 ? 205 : 190);
    // Geometry and opacity are final before the texture callback. Loading now
    // only supplies pixels; it can no longer move, resize or fade the border.
    this.withFrameTexture(style.textureIndex, (texture) => { if (!border.isValid || !parent.isValid) return; const frame = new SpriteFrame(); this.configureSlicedFrame(frame, texture, width, height, index); sprite.spriteFrame = frame; border.setSiblingIndex(Math.max(0, parent.children.length - 1)); });
  }

  private calculateFrameGeometry(textureWidth: number, textureHeight: number, innerWidth: number, innerHeight: number, index: number, compact = false): FrameGeometry {
    const metrics = FRAME_METRICS[index] ?? FRAME_METRICS[0];
    // `innerWidth` / `innerHeight` describe the background or control surface,
    // not the outer ornament. The visible inner edge of every generated frame
    // is measured separately, then the frame grows outward so its clear window
    // matches that surface exactly. A height-based expansion cap keeps adjacent
    // cards and controls from covering one another in dense mobile layouts.
    const visualHorizontal = textureWidth * (metrics.innerLeftRatio + metrics.innerRightRatio); const visualVertical = textureHeight * (metrics.innerTopRatio + metrics.innerBottomRatio);
    const naturalScale = Math.max(0.08, Math.min(1, innerWidth / textureWidth, innerHeight / textureHeight));
    const maxVerticalExpansion = compact ? Math.max(14, Math.min(24, innerHeight * 0.28)) : Math.max(18, Math.min(64, innerHeight * 0.14));
    const maxHorizontalExpansion = Math.max(14, Math.min(96, innerWidth * 0.14, Math.max(14, W - innerWidth - 24)));
    const ornamentScale = Math.max(0.08, Math.min(naturalScale, maxVerticalExpansion / Math.max(1, visualVertical), maxHorizontalExpansion / Math.max(1, visualHorizontal)));
    const visualLeft = textureWidth * metrics.innerLeftRatio * ornamentScale; const visualRight = textureWidth * metrics.innerRightRatio * ornamentScale;
    const visualTop = textureHeight * metrics.innerTopRatio * ornamentScale; const visualBottom = textureHeight * metrics.innerBottomRatio * ornamentScale;
    const width = innerWidth + visualLeft + visualRight; const height = innerHeight + visualTop + visualBottom;
    const left = Math.max(4, Math.min(Math.round(textureWidth * metrics.leftRatio * ornamentScale), Math.floor(width * 0.3)));
    const right = Math.max(4, Math.min(Math.round(textureWidth * metrics.rightRatio * ornamentScale), Math.floor(width * 0.3)));
    const topRatio = compact ? 0.27 : metrics.topRatio; const bottomRatio = compact ? 0.27 : metrics.bottomRatio;
    const top = Math.max(4, Math.min(Math.round(textureHeight * topRatio * ornamentScale), Math.floor(height * 0.4)));
    const bottom = Math.max(4, Math.min(Math.round(textureHeight * bottomRatio * ornamentScale), Math.floor(height * 0.36), Math.floor(height - top - 4)));
    // A centred outer sprite only aligns a centred clear window. These frames
    // are asymmetric, so offset the sprite until its measured transparent
    // inner window is centred exactly on the supplied content surface.
    return { width, height, offsetX: (visualRight - visualLeft) / 2, offsetY: (visualTop - visualBottom) / 2, insetLeft: left, insetRight: right, insetTop: top, insetBottom: bottom };
  }

  private configureSlicedFrame(frame: SpriteFrame, texture: Texture2D, innerWidth: number, innerHeight: number, index: number, compact = false): FrameGeometry {
    const geometry = this.calculateFrameGeometry(texture.width, texture.height, innerWidth, innerHeight, index, compact); frame.texture = texture; frame.insetLeft = geometry.insetLeft; frame.insetRight = geometry.insetRight; frame.insetTop = geometry.insetTop; frame.insetBottom = geometry.insetBottom; return geometry;
  }

  private fitButtonInsidePanelFrame(parent: Node, x: number, width: number): number {
    const border = parent.children.find((child) => child.name.startsWith('PanelImageBorder-')); if (!border) return x;
    const transform = parent.getComponent(UITransform); if (!transform || transform.contentSize.width < 600) return x;
    const contentPadding = Math.max(18, Math.min(42, transform.contentSize.width * 0.04)); const maxCenter = Math.max(0, transform.contentSize.width / 2 - contentPadding - width / 2);
    return Math.max(-maxCenter, Math.min(maxCenter, x));
  }

  private label(parent: Node, text: string, x: number, y: number, size: number, color: Color, bold = false, width = 900): Label {
    const localized = this.localize(text); const node = new Node('Text'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, Math.max(60, size * (localized.includes('\n') ? 3 : 1.7))); node.setPosition(x, y); parent.addChild(node); const label = node.addComponent(Label); label.string = localized; label.fontSize = size; label.lineHeight = Math.round(size * 1.18); label.color = color; label.isBold = bold; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER; label.overflow = Label.Overflow.SHRINK; return label;
  }

  private button(parent: Node, text: string, x: number, y: number, width: number, height: number, action: () => void, style: string): Node {
    const primary = style === 'primary' || style === 'spin'; const palette = primary ? [new Color(175, 112, 26), C.paleGold, C.ink] : style === 'secondary' ? [new Color(12, 62, 43), C.cyan, C.white] : style === 'nav-active' ? [new Color(0, 0, 0, 0), C.gold, C.paleGold] : style === 'link' || style === 'nav' ? [new Color(0, 0, 0, 0), new Color(0, 0, 0, 0), style === 'nav' ? C.muted : C.cyan] : [new Color(26, 15, 9), new Color(114, 81, 38), C.white];
    const fittedX = this.fitButtonInsidePanelFrame(parent, x, width); const radius = style === 'spin' ? Math.min(width, height) / 2 : Math.min(24, height / 3);
    // Preserve the original shell as the touch target and layout box. For
    // framed controls, only the visible colour surface moves inward; labels,
    // semantic art and the ornamental sprite keep their original geometry.
    const node = this.panel(parent, fittedX, y, width, height, radius, style === 'spin' ? palette[0] : new Color(0, 0, 0, 0), style === 'spin' ? palette[1] : undefined, style === 'spin' ? 5 : 0, false); node.name = 'Button';
    let effectSurface = node;
    if (style !== 'spin') {
      const buttonFrameIndex = this.buttonFrameIndex(text, style); const surfaceInset = this.visualSurfaceInsets(width, height, buttonFrameIndex, true); const surfaceWidth = Math.max(2, width - surfaceInset.left - surfaceInset.right); const surfaceHeight = Math.max(2, height - surfaceInset.top - surfaceInset.bottom); const surfaceX = (surfaceInset.left - surfaceInset.right) / 2; const surfaceY = (surfaceInset.bottom - surfaceInset.top) / 2;
      effectSurface = this.panel(node, surfaceX, surfaceY, surfaceWidth, surfaceHeight, Math.max(2, Math.min(radius, surfaceHeight * 0.3)), palette[0], undefined, 0, false); effectSurface.name = 'ButtonSurface'; effectSurface.setSiblingIndex(0);
    }
    if (style === 'primary' || style === 'secondary') { const surfaceTransform = effectSurface.getComponent(UITransform); const surfaceWidth = surfaceTransform?.contentSize.width ?? width; const surfaceHeight = surfaceTransform?.contentSize.height ?? height; this.addCardShine(effectSurface, Math.max(10, surfaceWidth), Math.max(10, surfaceHeight), style === 'primary' ? C.paleGold : C.cyan, style === 'primary' ? 1.4 : 2.2); }
    if (style === 'spin') { this.addSpinGlassDome(node, width, height); this.addButtonEdgePulse(node, width, height, palette[1], true); }
    if (style !== 'spin') this.addButtonImageFrame(node, text, style, width, height);
    const semanticArt = this.semanticButtonArt(text, style); if (semanticArt && style !== 'spin' && width >= 52 && height >= 52) { const compact = width < 180; this.addPremiumSymbol(node, semanticArt[0], semanticArt[1], compact ? 0 : -width / 2 + height * 0.62, 0, compact ? Math.min(width, height) * 0.7 : height * 0.78, 'button', compact ? 92 : 145, 0.2); }
    if (style === 'spin') { this.addSpinRings(node, Math.min(width, height) * 0.52); this.addPremiumSymbol(node, this.selectedGame, this.selectedGame.wildId, 0, 0, Math.min(width, height) * 0.78, 'button', 112); }
    const compactControl = text === '‹' || text === '+' || text === '−'; const fontSize = compactControl ? Math.min(38, height * 0.52) : Math.min(style === 'spin' ? 34 : 25, Math.max(19, height * 0.3)); const label = this.label(node, text, 0, 0, fontSize, palette[2], true, width - 16); label.node.name = 'Text';
    const button = node.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.94;
    node.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(10); this.vfx?.buttonBurst(node, palette[1]); if (style !== 'link' && style !== 'nav') tween(label.node).to(0.08, { scale: new Vec3(1.05, 1.05, 1) }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }, this);
    node.on(Node.EventType.TOUCH_END, action, this); return node;
  }

  private semanticButtonArt(text: string, style: string): readonly [GameConfig, string] | undefined {
    const copy = text.replace(/\n/g, ' ').toUpperCase();
    if (copy.includes('TURBO')) return [GAME_CONFIGS[2], 'wild'];
    if (copy.includes('AUTO')) return [GAME_CONFIGS[0], 'orrery'];
    if (copy.includes('WHEEL')) return [GAME_CONFIGS[0], 'orrery'];
    if (copy.includes('CHECK-IN') || copy.includes('CLAIM') || copy.includes('COLLECT') || copy.includes('ADD DEMO')) return [GAME_CONFIGS[3], 'bonus'];
    if (copy.includes('ENTER THE VAULT') || copy.includes('CREATE PROFILE') || copy.includes('CHECK LOCAL PROFILE')) return [GAME_CONFIGS[1], 'key'];
    if (copy.includes('GUEST')) return [GAME_CONFIGS[0], 'guardian'];
    if (copy.includes('CHANGE AVATAR')) return [GAME_CONFIGS[3], 'helmet'];
    if (copy === '+') return [GAME_CONFIGS[3], 'bonus'];
    if (copy === 'OPEN' || copy.includes('OPEN  ›')) return [GAME_CONFIGS[3], 'scatter'];
    return undefined;
  }

  private buttonFrameIndex(text: string, style: string): number {
    const copy = text.replace(/\n/g, ' ').toUpperCase(); let index = style === 'primary' ? 1 : style === 'secondary' ? 3 : 0;
    if (this.router?.route === 'game' || this.router?.route === 'game-loading') index = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame));
    if (style === 'nav' || style === 'nav-active') index = 0;
    else if (copy.includes('TURBO') || copy === '−') index = 2; else if (copy.includes('AUTO') || copy.includes('WHEEL') || copy.includes('GUEST') || copy === 'HOME' || copy === '‹') index = 0; else if (copy.includes('CHECK-IN') || copy.includes('CLAIM') || copy.includes('COLLECT') || copy.includes('ADD DEMO') || copy === '+' || copy === 'STORE') index = 3; else if (copy.includes('ENTER') || copy.includes('CREATE PROFILE') || copy.includes('REWARDS')) index = 1;
    return index;
  }

  private addButtonImageFrame(parent: Node, text: string, style: string, width: number, height: number): void {
    const index = this.buttonFrameIndex(text, style);
    const sourceSize = FRAME_TEXTURE_SIZES[index]; const geometry = this.calculateFrameGeometry(sourceSize.width, sourceSize.height, width, height, index, true); const frameNode = new Node(`ImageButtonFrame-${index}`); frameNode.layer = Layers.Enum.UI_2D; const frameTransform = frameNode.addComponent(UITransform); frameTransform.setContentSize(geometry.width, geometry.height); frameNode.setPosition(geometry.offsetX, geometry.offsetY); parent.addChild(frameNode); const sprite = frameNode.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.type = Sprite.Type.SLICED; const opacity = frameNode.addComponent(UIOpacity); const compact = width < 100; opacity.opacity = compact ? 142 : style === 'nav' ? 72 : style === 'nav-active' ? 154 : style === 'link' ? 96 : style === 'ghost' ? 124 : 172;
    this.withFrameTexture(index, (texture) => { if (!frameNode.isValid || !parent.isValid) return; const frame = new SpriteFrame(); this.configureSlicedFrame(frame, texture, width, height, index, true); sprite.spriteFrame = frame; frameNode.setSiblingIndex(Math.max(0, parent.children.length - 1)); });
  }

  private addButtonEdgePulse(parent: Node, width: number, height: number, color: Color, circular = false): void {
    const edge = new Node('ButtonEnergyEdge'); edge.layer = Layers.Enum.UI_2D; edge.addComponent(UITransform).setContentSize(width, height); edge.setPosition(0, 0); parent.addChild(edge); const graphics = edge.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, circular ? 112 : 62); graphics.lineWidth = circular ? 3 : 1.5; const inset = circular ? 3 : 2; if (circular) graphics.circle(0, 0, Math.max(2, Math.min(width, height) / 2 - inset)); else graphics.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, Math.min(24, Math.max(4, height * 0.3 - inset))); graphics.stroke(); const opacity = edge.addComponent(UIOpacity); opacity.opacity = circular ? 112 : 34; tween(opacity).to(circular ? 1.15 : 1.7, { opacity: circular ? 182 : 82 }, { easing: 'sineInOut' }).to(circular ? 1.35 : 1.9, { opacity: circular ? 70 : 28 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private input(parent: Node, placeholder: string, value: string, x: number, y: number, password = false): EditBox {
    const shellWidth = 650; const shellHeight = 88; const shell = this.panel(parent, x, y, shellWidth, shellHeight, 18, new Color(18, 10, 6), new Color(116, 83, 38), 2);
    // Keep both the native editing overlay and the canvas labels inside the
    // ornamental frame's clear center window. Using the full 650px shell made
    // typed text begin under the left crest even though the placeholder looked
    // acceptable before focus.
    const insets = this.visualSurfaceInsets(shellWidth, shellHeight, undefined, true); const clearWidth = shellWidth - insets.left - insets.right - 30; const clearCenter = (insets.left - insets.right) / 2; const actionWidth = password ? 112 : 0; const inputWidth = clearWidth - actionWidth; const inputX = clearCenter - actionWidth / 2;
    const node = new Node('EditBoxInput'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(inputWidth, 70); node.setPosition(inputX, 0); shell.addChild(node);
    const edit = node.addComponent(EditBox);
    for (const generatedName of ['TEXT_LABEL', 'PLACEHOLDER_LABEL']) { const generated = node.getChildByName(generatedName); if (generated) { generated.active = false; generated.destroy(); } }
    const labelWidth = inputWidth - 24;
    const textLabel = this.label(node, value, 0, 0, 23, C.white, false, labelWidth); textLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    const placeholderLabel = this.label(node, placeholder, 0, 0, 23, C.muted, false, labelWidth); placeholderLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    edit.textLabel = textLabel; edit.placeholderLabel = placeholderLabel; edit.placeholder = placeholder; edit.string = value; edit.inputMode = EditBox.InputMode.SINGLE_LINE; edit.maxLength = password ? 72 : 24; placeholderLabel.node.active = value.length === 0;
    if (password) {
      edit.inputFlag = EditBox.InputFlag.PASSWORD;
      let hidden = true; let visibilityButton!: Node;
      visibilityButton = this.button(shell, 'SHOW', clearCenter + clearWidth / 2 - 56, 0, 98, 48, () => {
        hidden = !hidden; edit.inputFlag = hidden ? EditBox.InputFlag.PASSWORD : EditBox.InputFlag.DEFAULT;
        const copy = visibilityButton.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = hidden ? 'SHOW' : 'HIDE';
      }, 'link');
    }
    return edit;
  }

  private avatar(parent: Node, x: number, y: number, index: number, size: number): Node {
    const colors = [C.cyan, C.gold, C.violet, C.green]; const slot = index % GAME_CONFIGS.length; const node = this.panel(parent, x, y, size, size, size / 2, new Color(31, 18, 10), colors[index % colors.length], 4); const clip = new Node('AvatarCharacterClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(size - 8, size - 8); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; node.addChild(clip); this.addCharacter(clip, slot, 0, -size * 0.08, size * 0.92, size * 1.12, 255, slot * 0.12); return node;
  }

  private progress(parent: Node, x: number, y: number, width: number, ratio: number): void {
    const bar = this.panel(parent, x, y, width, 22, 11, new Color(22, 12, 6), new Color(108, 78, 35), 1); const fill = this.panel(bar, -width / 2 + width * ratio / 2, 0, Math.max(4, width * ratio), 12, 6, C.gold); fill.name = 'ProgressFill';
  }

  private modal(width: number, height: number): Node {
    const mask = this.panel(this.overlay, 0, 0, SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight, 0, new Color(2, 1, 0, 210)); const card = this.panel(mask, 0, 0, Math.min(width, SafeAreaAdapter.visibleWidth - 100), Math.min(height, SafeAreaAdapter.visibleHeight - 160), 38, C.panel, C.gold, 3); card.setScale(new Vec3(0.85, 0.85, 1)); tween(card).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); return card;
  }

  private rewardModal(title: string, body: string, color: Color): void {
    this.audio.play('reward'); const modal = this.modal(850, 720); this.label(modal, '✦', 0, 220, 90, color); this.label(modal, title, 0, 105, 48, C.paleGold, true); this.label(modal, body, 0, -30, 28, C.white, true, 700); this.button(modal, 'COLLECT', 0, -230, 400, 76, () => modal.parent?.removeAllChildren(), 'primary');
  }

  private showResetConfirmation(): void {
    const modal = this.modal(820, 620); this.label(modal, 'CLEAR LOCAL DATA', 0, 205, 38, C.red, true); this.label(modal, 'Type RESET to permanently remove every local demo profile.', 0, 120, 20, C.white, false, 680);
    const confirmation = this.input(modal, 'Type RESET', '', 0, 15);
    this.button(modal, 'CONFIRM RESET', 0, -115, 440, 76, () => { if (!this.bootstrap.save.clearConfirmed(confirmation.string)) { this.toast('Type RESET exactly to continue', C.red); return; } modal.parent?.removeAllChildren(); this.router.reset('login'); }, 'ghost');
    this.button(modal, 'CANCEL', 0, -215, 260, 52, () => modal.parent?.removeAllChildren(), 'link');
  }

  private toast(message: string, color: Color): void {
    const box = this.panel(this.toastLayer, 0, -700, 820, 90, 28, new Color(28, 16, 8, 250), color, 2); this.label(box, message, 0, 0, 21, C.white, true, 760); box.setScale(new Vec3(0.9, 0.9, 1)); tween(box).to(0.18, { position: new Vec3(0, -620, 0), scale: Vec3.ONE }, { easing: 'backOut' }).delay(2).to(0.25, { position: new Vec3(0, -700, 0), scale: new Vec3(0.9, 0.9, 1) }).call(() => box.destroy()).start();
  }

  private refreshBalance(): void { if (this.balanceLabel) this.balanceLabel.string = this.router.route === 'game' ? `CREDITS  ${this.format(this.bootstrap.economy.balance())}` : this.format(this.bootstrap.economy.balance()); }
  private refreshBet(): void { if (this.betLabel) this.betLabel.string = `BET  ${this.format(this.bet())}`; }
  private bet(): number { return this.selectedGame.bets[Math.min(this.betIndex, this.selectedGame.bets.length - 1)]; }
  private ensurePlayer() { return this.bootstrap.profile.current()!; }
  private format(value: number): string { return Math.round(value).toLocaleString('en-US'); }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private applyPlayerPreferences(): void { const settings = this.bootstrap.profile.current()?.settings; if (!settings) return; this.audio?.setMusic(settings.music); this.audio?.setEffects(settings.sound); this.audio?.setVibration(settings.vibration); this.vfx?.setQuality(settings.quality); }
  private localize(text: string): string { return this.bootstrap.profile.current()?.settings.language === 'zh-CN' ? ZH[text] ?? text : text; }
  private themeColor(id: GameId): Color { return id === 'astral-vault' ? new Color(151, 30, 58) : id === 'golden-dynasty' ? new Color(151, 91, 19) : id === 'neon-classic' ? new Color(178, 23, 59) : new Color(91, 140, 126); }
  private selectQueryGame(query: URLSearchParams): void { const id = query.get('game') as GameId | null; if (id && GAME_CONFIG_BY_ID[id]) this.selectedGame = GAME_CONFIG_BY_ID[id]; }
  private forceFromQuery(force: string | null): ForceResult | undefined { if (force === 'win') return { symbolId: this.selectedGame.symbols.find((s) => s.tier === 'high')?.id, count: 5, wild: true }; if (force === 'free') return { scatterCount: 5 }; if (force === 'hold') return { holdAndSpin: true }; if (force === 'big' || force === 'mega' || force === 'epic') return { winTier: force }; return undefined; }
}

function okStyle(ok: boolean): string { return ok ? 'secondary' : 'ghost'; }
