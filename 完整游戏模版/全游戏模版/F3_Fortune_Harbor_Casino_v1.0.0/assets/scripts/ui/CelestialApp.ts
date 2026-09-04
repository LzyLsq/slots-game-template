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
import { MachineControlAtlasCache, type MachineControlIcon } from './MachineControlAtlasCache';
import { GameCoverAtlasCache } from './GameCoverAtlasCache';

const { ccclass } = _decorator;
const W = 1080;
const H = 1920;
const NAV_H = 150;
type SymbolMotion = 'none' | 'float' | 'pulse' | 'orbit' | 'button';
type InterfaceControlIcon = 'mail' | 'back' | 'eye' | 'close' | 'key' | 'play' | 'reset';
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
type CabinetControlSlot = {
  readonly x: number; readonly y: number; readonly width: number; readonly height: number;
};
type CabinetLayout = {
  readonly reelX: number; readonly reelY: number; readonly reelWidth: number; readonly reelHeight: number;
  readonly titleY: number; readonly titleWidth: number; readonly titleSize: number; readonly paylineY: number; readonly darkMarquee: boolean;
  readonly jackpotY: number; readonly jackpotWidth: number; readonly featureY: number; readonly featureWidth: number;
  readonly readoutY: number; readonly readoutX: number; readonly readoutWidth: number; readonly readoutHeight: number; readonly readoutFontSize: number;
  readonly turbo: CabinetControlSlot; readonly spin: CabinetControlSlot; readonly auto: CabinetControlSlot;
  readonly minus: CabinetControlSlot; readonly plus: CabinetControlSlot;
  readonly sound: CabinetControlSlot; readonly rules: CabinetControlSlot; readonly home: CabinetControlSlot;
};
type CabinetReadoutLayout = {
  readonly topWinY: number; readonly topWinSurface: 'light' | 'dark';
  readonly creditsY: number; readonly creditsWidth: number; readonly creditsSurface: 'light' | 'dark';
  readonly winX: number; readonly winY: number; readonly winWidth: number;
  readonly betX: number; readonly betY: number; readonly betWidth: number; readonly betTone: Color;
};
const CARD_HERO_SYMBOLS = ['wheel', 'chest', 'pearl', 'diamond'] as const;
const CHARACTER_PATHS = [
  'generated/common/harbor_host_marina', 'generated/common/harbor_host_marina',
  'generated/common/harbor_host_marina', 'generated/common/harbor_host_marina',
] as const;
const BRAND_EMBLEM_PATH = 'generated/common/fortune_harbor_emblem';
const TITLE_LOGO_PATHS: Readonly<Record<GameId, string>> = {
  'golden-tide': 'generated/common/title-logos/game01_title_logo_v1',
  'captains-chest': 'generated/common/title-logos/game02_title_logo_v1',
  'pearl-parade': 'generated/common/title-logos/game03_title_logo_v1',
  'lucky-lighthouse': 'generated/common/title-logos/game04_title_logo_v1',
};
const BUTTON_FRAME_PATHS = [
  BRAND_EMBLEM_PATH, BRAND_EMBLEM_PATH, BRAND_EMBLEM_PATH, BRAND_EMBLEM_PATH,
] as const;
const FRAME_TEXTURE_SIZES = [
  { width: 556, height: 254 }, { width: 560, height: 248 },
  { width: 550, height: 279 }, { width: 562, height: 284 },
] as const;
const FRAME_STYLES: readonly { textureIndex: number; angle?: number; tint?: Color }[] = [
  { textureIndex: 0 }, { textureIndex: 1 }, { textureIndex: 2 }, { textureIndex: 3 },
  // The fifth variant mirrors the warm frame for wide promotional surfaces.
  { textureIndex: 2, angle: 180, tint: new Color(255, 214, 172) },
];
const CABINET_LAYOUTS: Readonly<Record<GameId, CabinetLayout>> = {
  'golden-tide': {
    reelX: -2, reelY: 136, reelWidth: 610, reelHeight: 550,
    titleY: 720, titleWidth: 650, titleSize: 47, paylineY: 518, darkMarquee: false,
    jackpotY: 518, jackpotWidth: 610, featureY: -650, featureWidth: 620,
    readoutY: -270, readoutX: 177, readoutWidth: 166, readoutHeight: 80, readoutFontSize: 24,
    turbo: { x: 372, y: -422, width: 98, height: 102 }, spin: { x: 0, y: -420, width: 158, height: 158 }, auto: { x: 230, y: -422, width: 98, height: 102 },
    minus: { x: -373, y: -422, width: 98, height: 102 }, plus: { x: -227, y: -422, width: 98, height: 102 },
    sound: { x: 488, y: 872, width: 96, height: 96 }, rules: { x: 488, y: 748, width: 96, height: 96 }, home: { x: -488, y: 872, width: 96, height: 96 },
  },
  'captains-chest': {
    reelX: 0, reelY: 357, reelWidth: 760, reelHeight: 500,
    titleY: 804, titleWidth: 680, titleSize: 45, paylineY: 646, darkMarquee: false,
    jackpotY: 646, jackpotWidth: 720, featureY: -650, featureWidth: 660,
    readoutY: -58, readoutX: 238, readoutWidth: 214, readoutHeight: 80, readoutFontSize: 24,
    turbo: { x: 377, y: -151, width: 102, height: 106 }, spin: { x: 0, y: -148, width: 140, height: 140 }, auto: { x: 221, y: -151, width: 102, height: 106 },
    minus: { x: -376, y: -151, width: 102, height: 106 }, plus: { x: -220, y: -151, width: 102, height: 106 },
    sound: { x: 488, y: 900, width: 96, height: 96 }, rules: { x: 488, y: 770, width: 96, height: 96 }, home: { x: -488, y: 900, width: 96, height: 96 },
  },
  'pearl-parade': {
    reelX: 0, reelY: 146, reelWidth: 650, reelHeight: 650,
    titleY: 790, titleWidth: 680, titleSize: 45, paylineY: 560, darkMarquee: false,
    jackpotY: 560, jackpotWidth: 650, featureY: -670, featureWidth: 650,
    readoutY: -255, readoutX: 238, readoutWidth: 208, readoutHeight: 80, readoutFontSize: 24,
    turbo: { x: 351, y: -367, width: 98, height: 104 }, spin: { x: 0, y: -364, width: 146, height: 146 }, auto: { x: 210, y: -367, width: 98, height: 104 },
    minus: { x: -357, y: -367, width: 98, height: 104 }, plus: { x: -205, y: -367, width: 98, height: 104 },
    sound: { x: 488, y: 910, width: 96, height: 96 }, rules: { x: 488, y: 780, width: 96, height: 96 }, home: { x: -488, y: 910, width: 96, height: 96 },
  },
  'lucky-lighthouse': {
    reelX: 0, reelY: 54, reelWidth: 690, reelHeight: 500,
    titleY: 595, titleWidth: 660, titleSize: 44, paylineY: 380, darkMarquee: false,
    jackpotY: 380, jackpotWidth: 650, featureY: -690, featureWidth: 650,
    readoutY: -294, readoutX: 216, readoutWidth: 194, readoutHeight: 80, readoutFontSize: 24,
    turbo: { x: 336, y: -412, width: 100, height: 106 }, spin: { x: 0, y: -408, width: 150, height: 150 }, auto: { x: 207, y: -412, width: 100, height: 106 },
    minus: { x: -337, y: -412, width: 100, height: 106 }, plus: { x: -204, y: -412, width: 100, height: 106 },
    sound: { x: 488, y: 808, width: 96, height: 96 }, rules: { x: 488, y: 682, width: 96, height: 96 }, home: { x: -488, y: 808, width: 96, height: 96 },
  },
};
const CABINET_READOUT_LAYOUTS: Readonly<Record<GameId, CabinetReadoutLayout>> = {
  // Deep teal ledger, ivory result window, coral control shelf.
  'golden-tide': { topWinY: 648, topWinSurface: 'light', creditsY: 518, creditsWidth: 460, creditsSurface: 'dark', winX: 0, winY: -270, winWidth: 174, betX: -300, betY: -512, betWidth: 194, betTone: new Color(113, 36, 31) },
  // Mahogany ledger, broad cream result window, nautical teal controls.
  'captains-chest': { topWinY: 734, topWinSurface: 'light', creditsY: 646, creditsWidth: 500, creditsSurface: 'dark', winX: 0, winY: -58, winWidth: 214, betX: -298, betY: -244, betWidth: 204, betTone: new Color(16, 72, 68) },
  // Pearl-white ledger and result sockets need dark, saturated lettering.
  'pearl-parade': { topWinY: 688, topWinSurface: 'light', creditsY: 560, creditsWidth: 500, creditsSurface: 'light', winX: 0, winY: -255, winWidth: 208, betX: -281, betY: -458, betWidth: 202, betTone: new Color(111, 35, 48) },
  // Both upper rails are dark; gold-white type is the readable treatment.
  'lucky-lighthouse': { topWinY: 450, topWinSurface: 'dark', creditsY: 380, creditsWidth: 480, creditsSurface: 'dark', winX: 0, winY: -294, winWidth: 194, betX: -271, betY: -504, betWidth: 184, betTone: new Color(28, 69, 48) },
};
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
  ink: new Color(23, 48, 66), navy: new Color(11, 51, 64), panel: new Color(14, 81, 82, 238),
  panel2: new Color(22, 98, 96, 244), gold: new Color(199, 137, 36), paleGold: new Color(247, 213, 124),
  cyan: new Color(64, 190, 180), violet: new Color(229, 98, 78), white: new Color(255, 243, 210),
  muted: new Color(224, 199, 145), red: new Color(229, 98, 78), green: new Color(76, 190, 145),
  glass: new Color(13, 67, 73, 238), glassRaised: new Color(18, 88, 88, 244),
  chrome: new Color(236, 211, 158), outline: new Color(16, 48, 60, 248), coral: new Color(229, 98, 78),
};
const LOBBY = {
  ink: new Color(23, 48, 66), panel: new Color(15, 77, 78, 232), panelRaised: new Color(21, 101, 98, 242),
  ruby: new Color(202, 82, 64), rubyLight: new Color(229, 98, 78), gold: new Color(199, 137, 36),
  champagne: new Color(247, 213, 124), ivory: new Color(255, 243, 210), muted: new Color(228, 205, 159),
};
const ZH: Readonly<Record<string, string>> = {
  HOME: '首页', STORE: '商店', REWARDS: '奖励', RANK: '排行', PROFILE: '我的', SETTINGS: '设置', ACHIEVEMENTS: '成就', INBOX: '邮箱',
  'ACCOUNT SIGN IN': '账号登录', 'ENTER THE PARK': '进入游戏', 'CREATE LOCAL ACCOUNT': '注册本地账号', 'FORGOT PASSWORD': '忘记密码', 'CONTINUE AS GUEST': '游客登录',
  'CREATE ACCOUNT': '创建账号', 'CREATE PROFILE': '创建资料', 'BACK TO SIGN IN': '返回登录', 'RETURN TO LOGIN': '返回登录',
  'DAILY CHECK-IN': '每日签到', 'LUCKY WHEEL': '幸运转盘', 'CLAIM TODAY': '领取今日奖励', CLAIM: '领取', CLAIMED: '已领取', LOCKED: '未解锁', COLLECT: '领取',
  'DEMO CREDITS': '试玩金币', 'ADD DEMO': '添加试玩金币', 'SIGN IN': '去登录', 'REWARD CENTER': '奖励中心', 'FORTUNE RANK': '幸运排行',
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
  private debugMode = false;
  private rememberLogin = true;
  private acceptedTerms = false;
  private loadingGeneration = 0;

  protected start(): void {
    this.node.layer = Layers.Enum.UI_2D;
    this.node.addComponent(SafeAreaAdapter);
    this.node.on('csw-layout-changed', this.onLayoutChanged, this);
    this.audio = this.node.addComponent(AudioManager);
    this.vfx = this.node.addComponent(VFXManager);
    GAME_CONFIGS.forEach((config) => MachineControlAtlasCache.preload(config.id));
    GameCoverAtlasCache.load(() => undefined);
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
  }

  private withFrameTexture(index: number, callback: (texture: Texture2D) => void): void {
    const cached = this.frameTextureCache.get(index); if (cached) { callback(cached); return; }
    resources.load(`${BUTTON_FRAME_PATHS[index]}/texture`, Texture2D, (error, texture) => {
      if (error || !texture) return; this.frameTextureCache.set(index, texture); callback(texture);
    });
  }

  private showBoot(): void {
    this.clearAll(); const generation = this.loadingGeneration;
    this.paintBackdrop('boot', C.ink, new Color(25, 77, 112));
    this.addStarField(this.page, 54);
    this.addLoadingOrbit(this.page, 0, 420, C.cyan, 150);
    this.addBrandEmblem(this.page, 0, 420, 230);
    this.label(this.page, 'FORTUNE', 0, 205, 72, C.paleGold, true);
    this.label(this.page, 'HARBOR', 0, 118, 58, C.white, true);
    this.label(this.page, 'FOUR GAMES  •  ONE SUNNY CASINO PORT', 0, 30, 22, C.muted);
    this.animateLoadingProgress(this.page, -430, -385, 680, 1.7, () => 'OPENING THE HARBOR', () => {
      if (generation !== this.loadingGeneration) return;
      const player = this.bootstrap.profile.current();
      this.router.reset(player && !player.isGuest && this.bootstrap.save.read().rememberLogin ? 'home' : 'login');
    });
    this.label(this.page, 'ALL REWARDS USE LOCAL DEMO CREDITS', 0, -770, 20, C.muted);
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
    else if (route === 'rank') this.showRank('daily');
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
    this.loadingGeneration += 1;
    for (const layer of [this.background, this.page, this.navigation, this.overlay]) {
      for (const child of [...(layer?.children ?? [])]) {
        this.stopNodeTweens(child);
        child.removeFromParent();
        child.destroy();
      }
    }
    this.balanceLabel = undefined; this.reelEngine = undefined; this.winLabel = undefined; this.betLabel = undefined; this.spinButtonLabel = undefined;
  }

  private stopNodeTweens(node: Node): void {
    Tween.stopAllByTarget(node);
    const opacity = node.getComponent(UIOpacity); if (opacity) Tween.stopAllByTarget(opacity);
    for (const child of node.children) this.stopNodeTweens(child);
  }

  private onLayoutChanged(): void { if (this.router && !this.spinning) this.render(this.router.route); }

  private showLogin(): void {
    this.paintBackdrop('login', C.ink, new Color(173, 94, 48)); this.addStarField(this.page, 34);
    this.addCharacter(this.page, 0, -410, 300, 330, 530, 62, 0.15);
    this.addCharacter(this.page, 1, 410, 280, 330, 520, 58, 0.45);
    this.addBrandEmblem(this.page, 0, 660, 150);
    this.label(this.page, 'FORTUNE HARBOR', 0, 535, 50, C.paleGold, true);
    this.label(this.page, 'YOUR CABINET IS READY', 0, 455, 25, C.white, true);
    const card = this.panel(this.page, 0, -20, 820, 860, 38, new Color(13, 24, 48, 238), C.gold, 2);
    this.label(card, 'ACCOUNT SIGN IN', 0, 350, 40, C.paleGold, true);
    this.userNameInput = this.input(card, 'Username', '', 0, 270, false);
    this.passwordInput = this.input(card, 'Password', '', 0, 150, true);
    let remember!: Node; remember = this.button(card, '✓  REMEMBER ME', -190, 50, 330, 54, () => { this.rememberLogin = !this.rememberLogin; const copy = remember.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = `${this.rememberLogin ? '✓' : '○'}  REMEMBER ME`; }, 'ghost');
    this.button(card, 'ENTER THE PARK', 0, -60, 640, 92, () => this.login(), 'primary');
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
    this.paintBackdrop('login', C.ink, new Color(49, 101, 151)); this.header('CREATE ACCOUNT', true);
    const card = this.panel(this.page, 0, -40, 840, 1160, 36, C.panel, C.gold, 2);
    this.label(card, 'LOCAL DEMO PROFILE', 0, 500, 28, C.paleGold, true);
    this.registerInputs = [
      this.input(card, 'Username', '', 0, 390), this.input(card, 'Nickname', '', 0, 265),
      this.input(card, 'Password (10–72 characters)', '', 0, 140, true), this.input(card, 'Confirm password', '', 0, 15, true),
    ];
    this.button(card, `${this.acceptedTerms ? '✓' : '○'}  I ACCEPT THE VIRTUAL-CREDIT DEMO TERMS`, 0, -105, 650, 58, () => { this.acceptedTerms = !this.acceptedTerms; this.render('register'); }, this.acceptedTerms ? 'secondary' : 'ghost');
    this.button(card, 'CREATE PROFILE', 0, -245, 650, 92, () => {
      const [username, nickname, password, confirmPassword] = this.registerInputs.map((input) => input.string);
      void this.bootstrap.auth.register({ username, nickname, password, confirmPassword, acceptedTerms: this.acceptedTerms }).then((result) => { if (result.ok) { this.bootstrap.economy.recoverPending(); this.router.reset('home'); } else this.toast(result.message ?? 'Registration failed', C.red); });
    }, 'primary');
    this.label(card, 'No email, network account, or payment profile is created.', 0, -350, 20, C.muted);
    this.button(card, 'BACK TO SIGN IN', 0, -455, 380, 58, () => this.router.back('login'), 'link');
  }

  private showForgot(): void {
    this.paintBackdrop('login', C.ink, new Color(43, 91, 142)); this.header('LOCAL RECOVERY', true);
    const card = this.panel(this.page, 0, 120, 820, 670, 38, C.panel, C.gold, 2);
    this.label(card, 'FORGOT YOUR PASSWORD?', 0, 245, 34, C.paleGold, true);
    this.label(card, 'This is a local demonstration. No email will be sent.', 0, 170, 21, C.muted);
    const identifier = this.input(card, 'Username or email', 'demo', 0, 55);
    this.button(card, 'CHECK LOCAL PROFILE', 0, -75, 620, 86, () => this.toast(this.bootstrap.auth.localPasswordHint(identifier.string), C.cyan), 'primary');
    this.button(card, 'RETURN TO LOGIN', 0, -185, 360, 56, () => this.router.back('login'), 'link');
  }

  private showHome(): void {
    this.paintBackdrop('home', new Color(23, 48, 66), new Color(199, 137, 36)); this.addStarField(this.page, 22); this.addLobbyIdleWealth(); this.topBar();
    this.addHomeJackpotMarquee();
    const banner = this.panel(this.page, 0, 495, 960, 340, 34, LOBBY.panel, LOBBY.gold, 2);
    const bannerInsets = this.visualSurfaceInsets(960, 340, 0); const bannerWidth = 960 - bannerInsets.left - bannerInsets.right; const bannerHeight = 340 - bannerInsets.top - bannerInsets.bottom; const bannerX = (bannerInsets.left - bannerInsets.right) / 2; const bannerY = (bannerInsets.bottom - bannerInsets.top) / 2;
    this.addBannerCarousel(banner, bannerWidth, bannerHeight, bannerX, bannerY); this.addCardMotes(banner, 12, LOBBY.champagne, Math.max(100, bannerWidth - 50), Math.max(80, bannerHeight - 40));
    this.addCardShine(banner, bannerWidth, bannerHeight, LOBBY.champagne, 0.3, bannerX, bannerY);
    const festival = this.label(banner, 'COINS • CHESTS • JACKPOTS', -250, 78, 25, LOBBY.champagne, true); this.addLabelOutline(festival, LOBBY.ink, 4);
    this.artTitle(banner, 'FOUR WAYS\nTO FIND FORTUNE', -180, -4, 45, LOBBY.rubyLight, 430);
    this.addBannerHeroCarousel(banner);
    this.button(banner, 'DAILY CHECK-IN', -265, -112, 360, 58, () => this.router.go('check-in'), 'lobby-secondary');
    this.button(banner, 'LUCKY WHEEL', 235, -112, 300, 58, () => this.router.go('wheel'), 'lobby-secondary');
    const sectionTitle = this.label(this.page, 'CHOOSE YOUR GAME', -265, 270, 31, LOBBY.ivory, true, 520); this.addLabelOutline(sectionTitle, LOBBY.ink, 4);
    const sharedWallet = this.label(this.page, '4 DISTINCT MODES  •  1 SHARED BALANCE', 0, 215, 22, LOBBY.champagne, true); this.addLabelOutline(sharedWallet, LOBBY.ink, 4);
    const positions = [[-250, -2], [250, -2], [-250, -407], [250, -407]] as const;
    GAME_CONFIGS.forEach((config, index) => this.gameCard(config, positions[index][0], positions[index][1], index));
    this.bottomNav('home');
  }

  private gameCard(config: GameConfig, x: number, y: number, index: number): void {
    // This node is only the touch/layout shell. Drawing a 450×330 fill here
    // leaked outside the 438×318 media window under transparent frame pixels,
    // making Neon/Cosmic look as if the border pressed into the container.
    const card = this.panel(this.page, x, y, 470, 382, 30, new Color(0, 0, 0, 0), undefined, 0, false);
    const mediaWidth = 458; const mediaHeight = 366;
    const media = this.addGameCardArt(card, index, mediaWidth, mediaHeight);
    // Golden's artwork already clears its nearly symmetrical frame. The other
    // three portraits need a true ornamental safe area because their frames
    // have deep crowns/corner housings that intentionally project inward.
    this.addCardMotes(media, 8, index === 0 ? C.gold : C.cyan, 400, 300);
    const cardFrameIndex = index; const artInsets = this.visualSurfaceInsets(mediaWidth, mediaHeight, cardFrameIndex, false, { width: 500, height: 402 }); const artWidth = mediaWidth - artInsets.left - artInsets.right; const artHeight = mediaHeight - artInsets.top - artInsets.bottom; this.addCardShine(media, artWidth, artHeight, index === 0 ? C.gold : C.cyan, 0.8 + index * 1.1, (artInsets.left - artInsets.right) / 2, (artInsets.bottom - artInsets.top) / 2);
    this.addPremiumSymbol(media, config, CARD_HERO_SYMBOLS[index], -104, 67, 126, 'float', 255, index * 0.24);
    this.addPremiumSymbol(media, config, config.scatterId ?? config.bonusId ?? config.wildId, 180, 117, 50, 'orbit', 180, index * 0.18);
    // Keep artwork and characters under the ornamental frame. Labels are
    // intentionally added afterwards so their text remains unobstructed.
    // All four featured cards use Golden's visual footprint as the reference.
    // Their art remains distinct, but the outer metal frames no longer jump
    // between wide/short and narrow/tall silhouettes from card to card.
    this.addPanelImageBorder(card, mediaWidth, mediaHeight, index, 228, { width: 500, height: 402, innerContent: media });
    const cardAccent = this.themeColor(config.id); const glass = this.panel(card, 0, -73, 422, 126, 21, new Color(70, 18, 27, 244), cardAccent, 2, false); glass.name = 'CabinetTitleGlass'; this.addGameCardPlateTrim(glass, cardAccent); this.addCardShine(glass, 402, 108, LOBBY.champagne, 0.9 + index * 0.7);
    const name = this.label(glass, config.name, 0, 27, 32, LOBBY.ivory, true, 390); this.addLabelOutline(name, LOBBY.ink, 4);
    const playMode = config.id === 'golden-tide' ? '3×3  •  CENTER LINE'
      : config.id === 'captains-chest' ? '5×3  •  HOLD & RESPIN'
        : config.id === 'pearl-parade' ? '6×5  •  CLUSTER CASCADE'
          : '6×4  •  4096 WAYS';
    const modeLabel = this.label(glass, playMode, 0, -18, 20, LOBBY.champagne, true, 392); this.addLabelOutline(modeLabel, LOBBY.ink, 3);
    this.addGameCardCta(card, index);
    const ribbon = ['COIN TOSS', 'HOLD & RESPIN', 'PEARL CASCADE', 'GRAND BEACON'][index];
    this.addGameCardModeRibbon(card, index, ribbon, 127);
    card.setScale(new Vec3(0.96, 0.96, 1)); tween(card).delay(index * 0.08).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    card.on(Node.EventType.TOUCH_END, () => { this.selectedGame = config; this.router.go('game-loading'); }, this);
  }

  private addHomeJackpotMarquee(): void {
    const node = new Node('HomeGrandJackpot'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(820, 48); node.setPosition(0, 698); this.page.addChild(node); const g = node.addComponent(Graphics);
    g.fillColor = LOBBY.panel; g.roundRect(-410, -24, 820, 48, 22); g.fill(); g.strokeColor = new Color(131, 72, 43, 235); g.lineWidth = 6; g.roundRect(-406, -20, 812, 40, 19); g.stroke(); g.strokeColor = LOBBY.gold; g.lineWidth = 2; g.roundRect(-402, -16, 804, 32, 15); g.stroke();
    [-382, 382].forEach((x) => { g.fillColor = LOBBY.rubyLight; g.circle(x, 0, 8); g.fill(); g.strokeColor = LOBBY.champagne; g.lineWidth = 1.5; g.circle(x, 0, 9); g.stroke(); g.fillColor = LOBBY.ivory; g.circle(x - 2, 2, 1.5); g.fill(); });
    const title = this.label(node, 'GRAND JACKPOT', -210, 0, 17, LOBBY.ivory, true, 280); this.addLabelOutline(title, LOBBY.ink, 2); const amount = this.label(node, '12,888,888', 135, 0, 25, LOBBY.champagne, true, 330); this.addLabelOutline(amount, LOBBY.ink, 3);
    const glow = node.addComponent(UIOpacity); glow.opacity = 238; tween(glow).to(1.25, { opacity: 255 }, { easing: 'sineInOut' }).to(1.45, { opacity: 218 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private addGameCardCta(parent: Node, index: number): void {
    const accent = this.themeColor(GAME_CONFIGS[index].id); const cta = new Node('PlayNowConsole'); cta.layer = Layers.Enum.UI_2D; cta.addComponent(UITransform).setContentSize(288, 58); cta.setPosition(0, -159); parent.addChild(cta); const g = cta.addComponent(Graphics);
    g.fillColor = LOBBY.panel; g.roundRect(-144, -29, 288, 58, 25); g.fill(); g.strokeColor = new Color(130, 73, 42, 245); g.lineWidth = 6; g.roundRect(-139, -24, 278, 48, 22); g.stroke(); g.fillColor = new Color(accent.r, accent.g, accent.b, 82); g.roundRect(-134, -20, 268, 40, 19); g.fill(); g.strokeColor = LOBBY.gold; g.lineWidth = 2.5; g.roundRect(-133, -19, 266, 38, 18); g.stroke(); g.strokeColor = new Color(255, 249, 224, 190); g.lineWidth = 1; g.moveTo(-105, 13); g.lineTo(105, 13); g.stroke(); g.fillColor = LOBBY.ivory; g.moveTo(-88, 10); g.lineTo(-88, -10); g.lineTo(-70, 0); g.close(); g.fill(); [-121, 121].forEach((x) => { g.fillColor = accent; g.circle(x, 0, 5); g.fill(); g.strokeColor = LOBBY.champagne; g.lineWidth = 1.5; g.circle(x, 0, 6); g.stroke(); });
    const label = this.label(cta, 'PLAY NOW', 18, 0, 22, LOBBY.ivory, true, 180); this.addLabelOutline(label, LOBBY.ink, 4); const opacity = cta.addComponent(UIOpacity); opacity.opacity = 236; tween(opacity).delay(index * 0.22).to(1.05, { opacity: 255 }).to(1.25, { opacity: 222 }).union().repeatForever().start();
  }

  private addGameCardPlateTrim(parent: Node, accent: Color): void {
    const trim = new Node('CabinetPlateTrim'); trim.layer = Layers.Enum.UI_2D; trim.addComponent(UITransform).setContentSize(422, 126); parent.addChild(trim); trim.setSiblingIndex(1); const g = trim.addComponent(Graphics); g.strokeColor = new Color(255, 225, 145, 220); g.lineWidth = 1.5; g.roundRect(-203, -54, 406, 108, 16); g.stroke(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 170); g.lineWidth = 1; g.moveTo(-158, 1); g.lineTo(158, 1); g.stroke(); [-194, 194].forEach((x) => { g.fillColor = accent; g.circle(x, 0, 6); g.fill(); g.strokeColor = C.gold; g.lineWidth = 1.5; g.circle(x, 0, 7); g.stroke(); g.fillColor = C.white; g.circle(x - 2, 2, 1.5); g.fill(); });
  }

  private addGameCardModeRibbon(parent: Node, index: number, text: string, y: number): void {
    const accent = this.themeColor(GAME_CONFIGS[index].id); const ribbon = new Node('CabinetModeRibbon'); ribbon.layer = Layers.Enum.UI_2D; ribbon.addComponent(UITransform).setContentSize(282, 46); ribbon.setPosition(0, y); parent.addChild(ribbon); const g = ribbon.addComponent(Graphics); g.fillColor = new Color(55, 13, 22, 250); g.roundRect(-141, -23, 282, 46, 18); g.fill(); g.strokeColor = new Color(133, 73, 42, 248); g.lineWidth = 4; g.roundRect(-138, -20, 276, 40, 16); g.stroke(); g.strokeColor = LOBBY.gold; g.lineWidth = 1.5; g.roundRect(-136, -18, 272, 36, 15); g.stroke(); g.fillColor = accent; g.circle(-113, 0, 12); g.fill(); g.strokeColor = LOBBY.champagne; g.lineWidth = 1.5; g.circle(-113, 0, 13); g.stroke(); const number = this.label(ribbon, String(index + 1).padStart(2, '0'), -113, 0, 13, LOBBY.ivory, true, 34); this.addLabelOutline(number, LOBBY.ink, 2); const label = this.label(ribbon, text, 18, 0, 18, LOBBY.ivory, true, 205); this.addLabelOutline(label, LOBBY.ink, 3);
  }

  private showStore(): void {
    const player = this.ensurePlayer(); const guest = player.isGuest;
    this.paintBackdrop('store', C.ink, new Color(33, 104, 148)); this.topBar('STORE');
    this.label(this.page, 'DEMO CREDITS', 0, 650, 47, C.paleGold, true);
    this.label(this.page, guest ? 'GUEST MODE • TOP-UPS LOCKED' : 'No real payment • No cash value', 0, 595, 21, guest ? C.red : C.muted, true);
    const daily = this.panel(this.page, 0, 475, 920, 160, 28, C.glassRaised, C.cyan, 2, true, 0, 218);
    this.addCardShine(daily, 900, 142, C.cyan, 0.4);
    this.addPremiumSymbol(daily, GAME_CONFIGS[0], 'coin', -325, -5, 62, 'pulse', 245); this.label(daily, 'DAILY HARBOR DROP', -170, 13, 25, C.white, true, 330); this.label(daily, '+5,000 DEMO CREDITS', -160, -22, 18, C.cyan, false, 350);
    this.button(daily, 'CLAIM', 292, -7, 220, 56, () => { const ok = this.bootstrap.store.claimDaily(this.today()); this.toast(ok ? '5,000 demo credits collected' : 'Already collected today', ok ? C.green : C.muted); if (ok) this.vfx.flyCredits(new Vec3(292, 468, 0), new Vec3(330, 770, 0), () => { if (this.router.route === 'store') this.render('store'); }); else this.refreshBalance(); }, okStyle(true));
    DEMO_PRODUCTS.forEach((product, index) => {
      // The Cosmic ornament adds about 29 px beyond a 205 px product panel.
      // Start the product stack 10 px lower so its top rail clears the daily
      // gift's lower rail instead of the two translucent crests crossing.
      const y = 250 - index * 245; const card = this.panel(this.page, 0, y, 920, 205, 28, C.panel2, index === 2 ? C.gold : new Color(205, 102, 86), index === 2 ? 3 : 1, true, 3, index === 2 ? 228 : 216);
      this.addCardShine(card, 900, 185, index === 2 ? C.gold : C.cyan, 1 + index * 0.9);
      this.addPremiumSymbol(card, GAME_CONFIGS[0], 'coin', -320, -7, 64, 'pulse', 245, index * 0.12); this.label(card, product.label, -170, 18, 24, C.white, true, 320);
      this.label(card, `${this.format(product.credits)} + ${this.format(product.bonus)}`, -155, -25, 20, C.cyan, false, 350);
      this.button(card, guest ? 'SIGN IN' : 'ADD DEMO', 260, -12, 230, 58, () => {
        if (guest) { this.toast('Guest accounts cannot add Store credits. Sign in or create an account.', C.red); this.router.go('login'); return; }
        const purchased = this.bootstrap.store.demoPurchase(product.id);
        if (!purchased) { this.toast('Unable to add demo credits', C.red); return; }
        this.vfx.flyCredits(new Vec3(260, y - 12, 0), new Vec3(330, 770, 0), () => this.refreshBalance()); this.toast('Local demo credits added', C.green);
      }, guest ? 'ghost' : 'secondary');
    });
    this.bottomNav('store');
  }

  private showRewards(): void {
    this.paintBackdrop('rewards', C.ink, new Color(44, 99, 151)); this.topBar('REWARD CENTER');
    this.label(this.page, 'YOUR FORTUNE REWARDS', 0, 650, 38, C.paleGold, true);
    const wheelState = this.bootstrap.save.currentScope()?.wheel; const wheelReady = !wheelState || wheelState.date !== this.today() || wheelState.remaining > 0;
    const cards: readonly [string, string, string, Route, Color, string][] = [
      ['7-DAY CHECK-IN', 'Current cycle and grand day-seven gift', 'OPEN', 'check-in', C.cyan, 'READY TODAY'],
      ['LUCKY WHEEL', 'One free local prize spin each day', wheelReady ? 'SPIN' : 'DONE', 'wheel', C.gold, wheelReady ? '1 SPIN LEFT' : 'DONE TODAY'],
      ['ACHIEVEMENTS', 'Progress rewards across all four games', 'VIEW', 'achievements', C.violet, `${this.bootstrap.redDots.achievements()} READY`],
      ['ONLINE REWARD', 'Next local session gift is counting down', '04:28', 'rewards', C.green, 'COOLDOWN'],
    ];
    cards.forEach(([title, body, action, route, color, status], index) => {
      const y = 430 - index * 270; const card = this.panel(this.page, 0, y, 920, 225, 30, C.panel2, color, 2);
      this.addCardShine(card, 900, 205, color, 0.8 + index * 1.1);
      const rewardArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'coin'], [GAME_CONFIGS[0], 'wheel'], [GAME_CONFIGS[3], 'diamond'], [GAME_CONFIGS[1], 'chart']]; this.addPremiumSymbol(card, rewardArt[index][0], rewardArt[index][1], -350, 12, 86, 'pulse', 245, index * 0.1); this.label(card, title, -150, 38, 27, C.white, true, 440); this.label(card, body, -112, -8, 18, C.muted, false, 520); this.addStatusChip(card, status, -205, -67, color, status.length > 10 ? 190 : 150);
      this.button(card, action, 310, 2, 230, 76, () => route === 'rewards' ? this.toast('Next local session gift in 04:28', C.green) : this.router.go(route), index === 3 || action === 'DONE' ? 'ghost' : 'secondary');
    });
    this.bottomNav('rewards');
  }

  private showRank(tab: 'daily' | 'weekly' | 'all-time'): void {
    this.paintBackdrop('rank', C.ink, new Color(39, 91, 142)); this.topBar('FORTUNE RANK');
    const tabs: readonly [typeof tab, string][] = [['daily', 'DAILY'], ['weekly', 'WEEKLY'], ['all-time', 'ALL TIME']];
    tabs.forEach(([id, text], index) => this.button(this.page, text, -300 + index * 300, 620, 260, 62, () => { this.clearAll(); this.showRank(id); }, id === tab ? 'primary' : 'ghost'));
    const rows = this.bootstrap.rank.list(tab, this.bootstrap.profile.current()).slice(0, 8);
    rows.forEach((entry, index) => {
      const y = 480 - index * 145; const current = entry.current; const row = this.panel(this.page, 0, y, 900, 120, 20, current ? new Color(25, 54, 87, 246) : C.panel, index < 3 ? C.gold : new Color(99, 156, 203), index < 3 ? 2 : 1);
      if (index < 3) this.addCardShine(row, 880, 102, C.gold, 0.5 + index * 1.2);
      if (index < 3) { const rankArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'wheel'], [GAME_CONFIGS[1], 'diamond'], [GAME_CONFIGS[2], 'trophy']]; this.addPremiumSymbol(row, rankArt[index][0], rankArt[index][1], -370, 0, 62, 'pulse', 235, index * 0.1); } else this.label(row, `${entry.rank}`, -370, 0, 30, C.muted, true);
      this.avatar(row, -290, 0, entry.avatar, 68); this.label(row, entry.nickname, -125, 12, 22, C.white, true, 300); this.label(row, current ? 'YOU • LOCAL' : 'LOCAL SIMULATION', -125, -16, 15, current ? C.cyan : C.muted, false, 300);
      this.label(row, this.format(entry.score), 315, 0, 25, C.paleGold, true, 230);
    });
    this.label(this.page, 'Pull-to-refresh simulation • Updated locally', 0, -680, 18, C.muted);
    this.bottomNav('rank');
  }

  private showProfile(): void {
    this.paintBackdrop('profile', C.ink, new Color(45, 96, 147)); this.topBar('PROFILE');
    // Profile uses three different frame proportions in one vertical stack.
    // Its previous 320 px hero surface made the Cosmic lower crest overlap the
    // stat-card top rails even though the plain rounded rectangles only met.
    const player = this.ensurePlayer(); const card = this.panel(this.page, 0, 470, 900, 280, 34, C.panel2, C.gold, 2, true, 3, 222);
    this.addCardShine(card, 880, 260, C.gold, 0.6);
    this.avatar(card, -285, -4, player.avatar, 120); this.label(card, player.nickname, -70, 48, 32, C.white, true, 430); this.label(card, `ID  ${player.id.slice(-10).toUpperCase()}`, -55, 10, 18, C.muted, false, 470);
    this.label(card, `LEVEL ${player.level}`, -145, -28, 20, C.cyan, true, 250); this.progress(card, -105, -62, 320, player.experience % 100 / 100);
    this.button(card, 'CHANGE AVATAR', 230, -62, 200, 48, () => { this.bootstrap.profile.setAvatar((player.avatar + 1) % 12); this.render('profile'); }, 'ghost');
    const stats = [['SPINS', player.gamesPlayed], ['BIGGEST WIN', player.biggestWin], ['TOTAL WIN', player.totalWin]] as const;
    const statArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'wheel'], [GAME_CONFIGS[3], 'captain'], [GAME_CONFIGS[0], 'coin']]; stats.forEach(([name, value], index) => { const x = -315 + index * 315; const box = this.panel(this.page, x, 235, 270, 150, 20, C.panel, new Color(86, 159, 210), 1, true, 0, 208); this.addPremiumSymbol(box, statArt[index][0], statArt[index][1], -72, -7, 52, 'pulse', 112, index * 0.1); this.label(box, name, 28, 12, 16, C.muted, false, 170); this.label(box, this.format(value), 28, -20, 22, C.paleGold, true, 170); });
    const entries: readonly [string, string, Route, Color][] = [
      ['ACHIEVEMENTS', `${this.bootstrap.redDots.achievements()} READY`, 'achievements', C.violet], ['INBOX', `${this.bootstrap.redDots.mail()} UNREAD`, 'mail', C.cyan], ['SETTINGS', player.settings.quality.toUpperCase(), 'settings', C.gold],
    ];
    // 180 px centres leave a visible air gap around the 171 px Astral outer
    // frames. Lowering the group also separates it from the stat-card frames.
    entries.forEach(([title, detail, route, color], index) => { const y = 10 - index * 180; const row = this.panel(this.page, 0, y, 900, 150, 22, C.panel2, color, 1, true, 0, 204); if (index === 0) this.addPremiumSymbol(row, GAME_CONFIGS[1], 'diamond', -330, -6, 48, 'pulse', 225); else if (index === 1) this.label(row, '✉', -330, -6, 30, color); else this.addPremiumSymbol(row, GAME_CONFIGS[0], 'wheel', -330, -6, 48, 'orbit', 210); this.label(row, title, -170, 8, 21, C.white, true, 320); this.label(row, detail, -170, -20, 15, C.muted, false, 320); this.button(row, 'OPEN  ›', 305, -6, 170, 46, () => this.router.go(route), 'ghost'); });
    this.button(this.page, 'LOG OUT', 0, -570, 350, 62, () => { this.bootstrap.auth.logout(); this.router.reset('login'); }, 'ghost');
    this.bottomNav('profile');
  }

  private showCheckIn(): void {
    this.paintBackdrop('rewards', C.ink, new Color(45, 105, 151)); this.header('7-DAY NIGHT CHECK-IN', true);
    this.label(this.page, 'Build your lucky streak one day at a time', 0, 630, 23, C.muted);
    const state = this.bootstrap.save.currentScope()?.checkIn ?? { cycleDay: 0, lastClaimDate: null };
    const claimedToday = state.lastClaimDate === this.today();
    for (let index = 0; index < 7; index += 1) {
      const row = index < 4 ? 0 : 1; const column = row === 0 ? index : index - 4; const count = row === 0 ? 4 : 3;
      const x = (column - (count - 1) / 2) * (row === 0 ? 250 : 305); const y = row === 0 ? 300 : -40;
      const claimed = index < state.cycleDay; const current = !claimedToday && index === state.cycleDay; const next = claimedToday && index === state.cycleDay;
      const card = this.panel(this.page, x, y, row === 0 ? 210 : 260, 285, 24, current ? new Color(31, 73, 108) : next ? new Color(25, 53, 84) : C.panel, current ? C.gold : next ? C.cyan : new Color(100, 145, 186), current ? 4 : next ? 2 : 1);
      this.label(card, `DAY ${index + 1}`, 0, 58, 19, current ? C.paleGold : C.muted, true); this.addPremiumSymbol(card, GAME_CONFIGS[0], index === 6 ? 'wheel' : 'coin', 0, 5, index === 6 ? 78 : 64, current ? 'pulse' : 'none', claimed ? 112 : 245, index * 0.06);
      this.label(card, `+${this.format(this.bootstrap.checkIn.rewards[index])}`, 0, -43, 21, C.white, true);
      const badge = current ? (index === 6 ? 'TODAY • GRAND' : 'TODAY') : next ? (index === 6 ? 'NEXT • GRAND' : 'NEXT') : claimed ? 'DONE' : index === 6 ? 'GRAND' : '';
      if (badge) this.addStatusChip(card, badge, 0, badge.includes('TODAY') || badge.includes('NEXT') || badge === 'GRAND' ? 108 : -94, current ? C.gold : next ? C.cyan : claimed ? C.green : C.violet, badge.length > 8 ? 136 : 90);
    }
    this.button(this.page, claimedToday ? 'CLAIMED TODAY' : 'CLAIM TODAY', 0, -360, 650, 92, () => { const result = this.bootstrap.checkIn.claimToday(this.today()); this.toast(result.ok ? `Day ${result.day}: +${this.format(result.amount)} demo credits` : 'Today is already claimed', result.ok ? C.green : C.muted); if (result.ok) this.vfx.flyCredits(new Vec3(0, -360), new Vec3(330, 790), () => { if (this.router.route === 'check-in') this.render('check-in'); }); }, claimedToday ? 'ghost' : 'primary');
    const resetInfo = this.panel(this.page, 0, -475, 480, 52, 20, new Color(13, 31, 58, 232), C.cyan, 1, false); this.label(resetInfo, 'RETURNS DAILY AT LOCAL MIDNIGHT', 0, 0, 16, C.chrome, true, 430);
  }

  private showWheel(): void {
    this.paintBackdrop('wheel', C.ink, new Color(35, 130, 137)); this.header('HARBOR LUCKY WHEEL', true);
    const subtitle = this.label(this.page, 'ONE FREE PRIZE SPIN EVERY DAY', 0, 625, 23, C.paleGold, true); this.addLabelOutline(subtitle);

    const wheel = new Node('PrizeWheel'); wheel.layer = Layers.Enum.UI_2D; wheel.addComponent(UITransform).setContentSize(790, 790); wheel.setPosition(0, 108); this.page.addChild(wheel);
    const shell = wheel.addComponent(Graphics);
    // The disc is built like a physical casino fixture: soft drop shadow,
    // bronze body, champagne rails and an inset prize face.
    shell.fillColor = new Color(31, 4, 13, 150); shell.circle(0, -18, 380); shell.fill();
    shell.fillColor = new Color(89, 35, 22); shell.circle(0, 0, 378); shell.fill();
    shell.fillColor = new Color(232, 166, 67); shell.circle(0, 0, 369); shell.fill();
    shell.fillColor = new Color(255, 226, 149); shell.circle(0, 0, 358); shell.fill();
    shell.fillColor = new Color(66, 9, 24); shell.circle(0, 0, 347); shell.fill();

    const sectorColors = [
      new Color(188, 61, 62), new Color(94, 18, 38), new Color(171, 102, 48), new Color(121, 27, 43),
      new Color(156, 44, 58), new Color(75, 33, 36), new Color(197, 77, 54), new Color(105, 20, 44),
    ];
    this.bootstrap.wheel.sectors.forEach((value, index) => {
      // Sector 0 starts under the 12 o'clock pointer and values proceed
      // clockwise. Each wedge owns its own Graphics path so fills never bleed
      // into a neighbouring prize.
      const centerDegrees = 90 - index * 45; const center = centerDegrees * Math.PI / 180;
      const start = (centerDegrees - 22.5) * Math.PI / 180; const end = (centerDegrees + 22.5) * Math.PI / 180;
      const wedge = new Node(`PrizeSector-${index}`); wedge.layer = Layers.Enum.UI_2D; wedge.addComponent(UITransform).setContentSize(700, 700); wheel.addChild(wedge); wedge.setSiblingIndex(0); const wedgeGraphics = wedge.addComponent(Graphics);
      // Polygonal arcs avoid the engine's platform-dependent arc winding,
      // which previously turned the final 45-degree wedge into a full disc.
      wedgeGraphics.moveTo(0, 0); for (let step = 0; step <= 8; step += 1) { const angle = start + (end - start) * step / 8; wedgeGraphics.lineTo(Math.cos(angle) * 337, Math.sin(angle) * 337); } wedgeGraphics.close(); wedgeGraphics.fillColor = sectorColors[index]; wedgeGraphics.fill();
      // A translucent inner facet gives each slice a jewelled, enamelled face.
      for (let step = 0; step <= 8; step += 1) { const angle = start + (end - start) * step / 8; const radius = 325; if (step === 0) wedgeGraphics.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius); else wedgeGraphics.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); } for (let step = 8; step >= 0; step -= 1) { const angle = start + (end - start) * step / 8; wedgeGraphics.lineTo(Math.cos(angle) * 128, Math.sin(angle) * 128); } wedgeGraphics.close(); wedgeGraphics.fillColor = new Color(255, 225, 160, index % 2 === 0 ? 22 : 10); wedgeGraphics.fill();

      const valueLabel = this.label(wheel, this.format(value), Math.cos(center) * 245, Math.sin(center) * 245, 29, C.white, true, 178); valueLabel.node.name = `PrizeValue-${index}`; this.addLabelOutline(valueLabel, new Color(49, 5, 17, 255), 3);
      let labelAngle = ((centerDegrees - 90 + 180) % 360 + 360) % 360 - 180; if (labelAngle > 90) labelAngle -= 180; else if (labelAngle < -90) labelAngle += 180; valueLabel.node.angle = labelAngle;

      const separator = new Node(`SectorGem-${index}`); separator.layer = Layers.Enum.UI_2D; separator.addComponent(UITransform).setContentSize(34, 34); separator.setPosition(Math.cos(start) * 340, Math.sin(start) * 340); wheel.addChild(separator); const gem = separator.addComponent(Graphics);
      gem.fillColor = new Color(48, 10, 20, 210); gem.circle(0, 0, 14); gem.fill(); gem.strokeColor = C.gold; gem.lineWidth = 2; gem.circle(0, 0, 13); gem.stroke(); gem.fillColor = index % 3 === 0 ? new Color(82, 202, 139) : index % 2 === 0 ? new Color(230, 67, 92) : C.paleGold; gem.moveTo(0, 10); gem.lineTo(8, 0); gem.lineTo(0, -10); gem.lineTo(-8, 0); gem.close(); gem.fill(); gem.fillColor = C.white; gem.circle(-2, 3, 2); gem.fill();
    });

    // Rails and radial dividers need their own child renderer; the wheel's
    // root renderer always paints behind children regardless of call order.
    const hardware = new Node('WheelHardware'); hardware.layer = Layers.Enum.UI_2D; hardware.addComponent(UITransform).setContentSize(780, 780); wheel.addChild(hardware); const hardwareGraphics = hardware.addComponent(Graphics);
    hardwareGraphics.strokeColor = new Color(255, 239, 181); hardwareGraphics.lineWidth = 7; hardwareGraphics.circle(0, 0, 355); hardwareGraphics.stroke();
    hardwareGraphics.strokeColor = new Color(132, 61, 31); hardwareGraphics.lineWidth = 5; hardwareGraphics.circle(0, 0, 341); hardwareGraphics.stroke();
    hardwareGraphics.strokeColor = new Color(255, 210, 111, 210); hardwareGraphics.lineWidth = 3;
    for (let index = 0; index < 8; index += 1) { const angle = (112.5 - index * 45) * Math.PI / 180; hardwareGraphics.moveTo(Math.cos(angle) * 116, Math.sin(angle) * 116); hardwareGraphics.lineTo(Math.cos(angle) * 336, Math.sin(angle) * 336); hardwareGraphics.stroke(); }
    hardwareGraphics.fillColor = new Color(61, 8, 23); hardwareGraphics.circle(0, 0, 118); hardwareGraphics.fill(); hardwareGraphics.strokeColor = new Color(111, 48, 27); hardwareGraphics.lineWidth = 11; hardwareGraphics.circle(0, 0, 112); hardwareGraphics.stroke(); hardwareGraphics.strokeColor = C.paleGold; hardwareGraphics.lineWidth = 4; hardwareGraphics.circle(0, 0, 104); hardwareGraphics.stroke();
    for (let index = 0; index < 16; index += 1) { const angle = (Math.PI * 2 * index / 16) + Math.PI / 32; const bulb = new Node(`WheelBulb-${index}`); bulb.layer = Layers.Enum.UI_2D; bulb.addComponent(UITransform).setContentSize(26, 26); bulb.setPosition(Math.cos(angle) * 365, Math.sin(angle) * 365); wheel.addChild(bulb); const bulbGraphics = bulb.addComponent(Graphics); bulbGraphics.fillColor = new Color(87, 35, 20); bulbGraphics.circle(0, 0, 10); bulbGraphics.fill(); bulbGraphics.fillColor = index % 4 === 0 ? new Color(255, 126, 107) : new Color(255, 236, 164); bulbGraphics.circle(0, 0, 6); bulbGraphics.fill(); bulbGraphics.fillColor = C.white; bulbGraphics.circle(-2, 2, 1.8); bulbGraphics.fill(); const bulbOpacity = bulb.addComponent(UIOpacity); bulbOpacity.opacity = 150; tween(bulbOpacity).delay(index * 0.055).to(0.32, { opacity: 255 }).to(0.55, { opacity: 126 }).delay(0.45).union().repeatForever().start(); }
    this.addPremiumSymbol(wheel, GAME_CONFIGS[0], 'coin', 0, 0, 82, 'pulse', 255, 0.1);

    const pointer = new Node('WheelPointer'); pointer.layer = Layers.Enum.UI_2D; pointer.addComponent(UITransform).setContentSize(130, 124); pointer.setPosition(0, 514); this.page.addChild(pointer); const pointerGraphics = pointer.addComponent(Graphics);
    pointerGraphics.fillColor = new Color(66, 16, 22, 220); pointerGraphics.circle(0, 31, 46); pointerGraphics.fill(); pointerGraphics.strokeColor = new Color(117, 49, 29); pointerGraphics.lineWidth = 10; pointerGraphics.circle(0, 31, 40); pointerGraphics.stroke(); pointerGraphics.strokeColor = C.paleGold; pointerGraphics.lineWidth = 3; pointerGraphics.circle(0, 31, 36); pointerGraphics.stroke();
    pointerGraphics.fillColor = new Color(244, 181, 76); pointerGraphics.moveTo(-30, 25); pointerGraphics.lineTo(30, 25); pointerGraphics.lineTo(0, -51); pointerGraphics.close(); pointerGraphics.fill(); pointerGraphics.strokeColor = new Color(96, 37, 28); pointerGraphics.lineWidth = 5; pointerGraphics.moveTo(-30, 25); pointerGraphics.lineTo(30, 25); pointerGraphics.lineTo(0, -51); pointerGraphics.close(); pointerGraphics.stroke();
    pointerGraphics.fillColor = new Color(224, 56, 79); pointerGraphics.moveTo(0, 46); pointerGraphics.lineTo(13, 31); pointerGraphics.lineTo(0, 16); pointerGraphics.lineTo(-13, 31); pointerGraphics.close(); pointerGraphics.fill(); pointerGraphics.fillColor = C.white; pointerGraphics.circle(-3, 34, 3); pointerGraphics.fill();

    const wheelState = this.bootstrap.save.currentScope()?.wheel; const displayedRemaining = !wheelState || wheelState.date !== this.today() ? 1 : wheelState.remaining;
    const statusPlate = this.panel(this.page, 0, -337, 460, 58, 22, new Color(61, 8, 23, 238), C.gold, 2, false); const statusLabel = this.label(statusPlate, `DAILY SPINS  •  ${displayedRemaining} LEFT`, 0, 0, 20, C.paleGold, true, 410); this.addLabelOutline(statusLabel);
    const buttonPedestal = new Node('WheelButtonPedestal'); buttonPedestal.layer = Layers.Enum.UI_2D; buttonPedestal.addComponent(UITransform).setContentSize(720, 128); buttonPedestal.setPosition(0, -468); this.page.addChild(buttonPedestal); const pedestalGraphics = buttonPedestal.addComponent(Graphics); pedestalGraphics.fillColor = new Color(55, 9, 20, 226); pedestalGraphics.roundRect(-350, -52, 700, 104, 34); pedestalGraphics.fill(); pedestalGraphics.strokeColor = new Color(111, 48, 27); pedestalGraphics.lineWidth = 10; pedestalGraphics.roundRect(-344, -46, 688, 92, 30); pedestalGraphics.stroke(); pedestalGraphics.strokeColor = C.gold; pedestalGraphics.lineWidth = 3; pedestalGraphics.roundRect(-340, -42, 680, 84, 28); pedestalGraphics.stroke(); [-318, 318].forEach((x) => { pedestalGraphics.fillColor = new Color(220, 59, 81); pedestalGraphics.circle(x, 0, 10); pedestalGraphics.fill(); pedestalGraphics.strokeColor = C.paleGold; pedestalGraphics.lineWidth = 2; pedestalGraphics.circle(x, 0, 11); pedestalGraphics.stroke(); });

    let wheelSpinning = false; let spinControl!: Node;
    spinControl = this.button(buttonPedestal, displayedRemaining > 0 ? 'SPIN FOR GOLD' : 'COME BACK TOMORROW', 0, 0, 610, 74, () => {
      if (wheelSpinning) return;
      const prepared = this.bootstrap.wheel.prepare(this.today());
      if (!prepared) { this.toast('No free spins remaining today', C.muted); return; }
      wheelSpinning = true; const spinButton = spinControl.getComponent(Button); if (spinButton) spinButton.interactable = false;
      statusLabel.string = 'WHEEL IN MOTION';
      // Rotate the prepared prize's centre to 12 o'clock. The previous
      // implementation stopped every reward at 3 o'clock because its final
      // angle omitted the pointer's 90-degree offset.
      const current = wheel.angle; const normalized = ((current % 360) + 360) % 360; const desired = prepared.sector * 45; const delta = (desired - normalized + 360) % 360; const targetAngle = current + 360 * 6 + delta;
      tween(pointer).to(0.1, { angle: -7 }).to(0.1, { angle: 4 }).to(0.1, { angle: -5 }).to(0.14, { angle: 0 }).union().repeat(7).start();
      tween(wheel).to(3.25, { angle: targetAngle }, { easing: 'quartOut' }).call(() => {
        const ok = this.bootstrap.wheel.settle(prepared.spinId); wheelSpinning = false; const control = spinControl.getComponent(Button); if (control) control.interactable = false;
        statusLabel.string = ok ? `YOU WON  •  ${this.format(prepared.amount)} CREDITS` : 'PRIZE ALREADY COLLECTED'; const copy = spinControl.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = 'COME BACK TOMORROW';
        this.toast(ok ? `Wheel reward: +${this.format(prepared.amount)} demo credits` : 'Reward already settled', ok ? C.gold : C.muted); this.refreshBalance();
      }).start();
    }, displayedRemaining > 0 ? 'primary' : 'ghost');
  }

  private showAchievements(): void {
    this.paintBackdrop('profile', C.ink, new Color(47, 93, 146)); this.header('ACHIEVEMENTS', true);
    this.label(this.page, 'ALL   •   SPIN   •   WIN   •   FEATURE', 0, 650, 21, C.muted);
    ACHIEVEMENTS.forEach((achievement, index) => {
      const y = 455 - index * 290; const state = this.bootstrap.achievements.state(achievement.id);
      const ready = state.progress >= achievement.target && !state.claimed; const card = this.panel(this.page, 0, y, 900, 240, 28, C.panel2, ready ? C.gold : new Color(177, 75, 74), ready ? 3 : 1);
      this.addPremiumSymbol(card, GAME_CONFIGS[1], 'diamond', -350, 4, 74, ready ? 'pulse' : 'none', ready ? 255 : 145, index * 0.08); this.label(card, achievement.title, -165, 32, 25, C.white, true, 420); this.label(card, `${state.progress} / ${achievement.target}`, -165, -2, 18, C.muted, false, 420); this.progress(card, -90, -42, 480, Math.min(1, state.progress / achievement.target));
      this.label(card, `+${this.format(achievement.reward)}`, 315, 32, 18, C.paleGold, true);
      this.button(card, state.claimed ? 'CLAIMED' : ready ? 'CLAIM' : 'LOCKED', 315, -35, 200, 60, () => { const ok = this.bootstrap.achievements.claim(achievement.id); this.toast(ok ? 'Achievement reward collected' : 'Achievement is not ready', ok ? C.green : C.muted); if (ok) this.render('achievements'); }, ready ? 'primary' : 'ghost');
    });
  }

  private showMail(): void {
    this.paintBackdrop('profile', C.ink, new Color(39, 87, 138)); this.header('INBOX', true);
    this.button(this.page, 'CLAIM ALL', 250, 650, 300, 62, () => { const amount = this.bootstrap.mail.claimAll(); this.toast(amount ? `Collected ${this.format(amount)} demo credits` : 'No attachments available', amount ? C.green : C.muted); if (amount) this.render('mail'); }, 'secondary');
    DEMO_MAIL.forEach((mail, index) => {
      const state = this.bootstrap.mail.state(mail.id); if (state.deleted) return; const y = 420 - index * 310;
      const card = this.panel(this.page, 0, y, 900, 260, 28, state.read ? C.panel : new Color(133, 43, 49), state.read ? new Color(171, 76, 72) : C.cyan, state.read ? 1 : 3);
      if (mail.kind === 'reward') this.addPremiumSymbol(card, GAME_CONFIGS[0], 'coin', -345, 18, 70, 'pulse', state.read ? 145 : 250); else this.label(card, '✉', -345, 18, 34, state.read ? C.muted : C.cyan); this.label(card, mail.title, -135, 42, 25, C.white, true, 480); this.label(card, mail.body, -110, 2, 18, C.muted, false, 540); if (mail.credits) this.label(card, `ATTACHMENT  +${this.format(mail.credits)} CREDITS`, -115, -48, 17, C.paleGold, true, 520);
      this.button(card, mail.credits ? (state.claimed ? 'CLAIMED' : 'CLAIM') : 'MARK READ', 315, -50, 210, 58, () => { this.bootstrap.mail.read(mail.id); const ok = mail.credits ? this.bootstrap.mail.claim(mail.id) : true; this.toast(ok ? 'Message updated' : 'Attachment already collected', ok ? C.green : C.muted); if (ok) this.render('mail'); }, state.claimed ? 'ghost' : 'secondary');
    });
    this.button(this.page, 'DELETE READ', 0, -610, 320, 58, () => { this.bootstrap.mail.deleteRead(); this.render('mail'); }, 'ghost');
  }

  private showSettings(): void {
    this.paintBackdrop('profile', C.ink, new Color(41, 89, 141)); this.header('SETTINGS', true); const player = this.ensurePlayer();
    this.label(this.page, 'AUDIO & FEEL', -310, 650, 18, C.paleGold, true, 340);
    this.label(this.page, 'Tap anywhere on a row to change', 245, 650, 16, C.muted, false, 420);
    const rows: readonly [string, string, () => void, boolean][] = [
      ['MUSIC', player.settings.music ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ music: !player.settings.music }); this.render('settings'); }, true],
      ['SOUND EFFECTS', player.settings.sound ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ sound: !player.settings.sound }); this.render('settings'); }, true],
      ['VIBRATION', player.settings.vibration ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ vibration: !player.settings.vibration }); this.render('settings'); }, true],
      ['QUALITY', player.settings.quality.toUpperCase(), () => { const next = player.settings.quality === 'low' ? 'medium' : player.settings.quality === 'medium' ? 'high' : 'low'; this.bootstrap.profile.updateSettings({ quality: next }); this.vfx.setQuality(next); this.render('settings'); }, false],
      ['LANGUAGE', player.settings.language === 'en' ? 'ENGLISH' : '简体中文', () => { this.bootstrap.profile.updateSettings({ language: player.settings.language === 'en' ? 'zh-CN' : 'en' }); this.render('settings'); }, false],
    ];
    const positions = [510, 340, 170, -50, -220] as const;
    rows.forEach(([name, value, action, toggle], index) => {
      if (index === 3) this.label(this.page, 'DISPLAY & REGION', -290, 66, 18, C.paleGold, true, 380);
      const row = this.panel(this.page, 0, positions[index], 880, 140, 24, C.panel2, value === 'OFF' ? new Color(147, 67, 66) : this.themeColor(index === 3 ? GAME_CONFIGS[1].id : index === 4 ? GAME_CONFIGS[0].id : GAME_CONFIGS[3].id), value === 'OFF' ? 1 : 2);
      this.addSettingGlyph(row, index, -354, 0, value !== 'OFF'); this.label(row, name, -205, 0, 25, C.white, true, 350); this.addSettingControl(row, value, 285, 0, toggle);
      const button = row.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.985; row.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(8); }, this); row.on(Node.EventType.TOUCH_END, action, this);
    });
    this.panel(this.page, 0, -465, 880, 190, 24, new Color(38, 31, 54), C.coral, 1); this.label(this.page, 'CLEAR LOCAL DATA', -190, -435, 24, C.white, true, 420); this.label(this.page, 'Requires typing RESET in the confirmation flow.', -90, -480, 18, C.muted, false, 620);
    this.button(this.page, 'RESET…', 315, -460, 210, 64, () => this.showResetConfirmation(), 'ghost');
  }

  private addStatusChip(parent: Node, text: string, x: number, y: number, color: Color, width = 150): Node {
    const chip = new Node('StatusChip'); chip.layer = Layers.Enum.UI_2D; chip.addComponent(UITransform).setContentSize(width, 34); chip.setPosition(x, y); parent.addChild(chip); const g = chip.addComponent(Graphics);
    g.fillColor = new Color(58, 13, 25, 242); g.roundRect(-width / 2, -17, width, 34, 15); g.fill(); g.strokeColor = new Color(140, 77, 46, 240); g.lineWidth = 4; g.roundRect(-width / 2 + 2, -15, width - 4, 30, 13); g.stroke(); g.strokeColor = new Color(color.r, color.g, color.b, 240); g.lineWidth = 1.5; g.roundRect(-width / 2 + 4, -13, width - 8, 26, 12); g.stroke();
    [-1, 1].forEach((side) => { g.fillColor = color; g.moveTo(side * (width / 2 - 10), 5); g.lineTo(side * (width / 2 - 5), 0); g.lineTo(side * (width / 2 - 10), -5); g.lineTo(side * (width / 2 - 15), 0); g.close(); g.fill(); });
    const label = this.label(chip, text, 0, 0, 14, C.white, true, width - 30); label.enableWrapText = false; this.addLabelOutline(label, C.outline, 2); return chip;
  }

  private addSettingGlyph(parent: Node, index: number, x: number, y: number, active: boolean): Node {
    const node = new Node(`SettingGlyph-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(82, 82); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); const accent = active ? (index === 3 ? C.green : index === 4 ? C.cyan : C.gold) : C.muted;
    g.fillColor = new Color(61, 14, 25, 245); g.circle(0, 0, 36); g.fill(); g.strokeColor = new Color(145, 80, 47, 245); g.lineWidth = 6; g.circle(0, 0, 32); g.stroke(); g.strokeColor = accent; g.lineWidth = 2; g.circle(0, 0, 29); g.stroke(); g.fillColor = accent; g.strokeColor = accent; g.lineWidth = 4;
    if (index === 0) {
      g.moveTo(-5, -16); g.lineTo(-5, 14); g.lineTo(17, 20); g.lineTo(17, -9); g.stroke(); g.circle(-12, -17, 7); g.fill(); g.circle(10, -10, 7); g.fill();
    } else if (index === 1) {
      g.moveTo(-20, -8); g.lineTo(-9, -8); g.lineTo(4, -19); g.lineTo(4, 19); g.lineTo(-9, 8); g.lineTo(-20, 8); g.close(); g.fill(); g.arc(7, 0, 12, -0.82, 0.82, false); g.stroke(); g.arc(7, 0, 21, -0.72, 0.72, false); g.stroke();
    } else if (index === 2) {
      g.roundRect(-10, -20, 20, 40, 5); g.stroke(); g.circle(0, -14, 2.5); g.fill(); [-1, 1].forEach((side) => { g.arc(side * 8, 0, 15, side < 0 ? 1.9 : -1.24, side < 0 ? 4.38 : 1.24, side < 0); g.stroke(); });
    } else if (index === 3) {
      g.moveTo(0, 22); g.lineTo(20, 5); g.lineTo(12, -20); g.lineTo(-12, -20); g.lineTo(-20, 5); g.close(); g.stroke(); g.moveTo(-20, 5); g.lineTo(20, 5); g.moveTo(-8, 5); g.lineTo(0, 22); g.lineTo(8, 5); g.lineTo(0, -20); g.close(); g.stroke();
    } else {
      g.circle(0, 0, 21); g.stroke(); g.ellipse(0, 0, 10, 21); g.stroke(); g.moveTo(-20, 0); g.lineTo(20, 0); g.moveTo(-17, 11); g.lineTo(17, 11); g.moveTo(-17, -11); g.lineTo(17, -11); g.stroke();
    }
    const opacity = node.addComponent(UIOpacity); opacity.opacity = active ? 255 : 150; return node;
  }

  private addSettingControl(parent: Node, value: string, x: number, y: number, toggle: boolean): Node {
    const control = new Node(toggle ? 'SettingToggle' : 'SettingSelector'); control.layer = Layers.Enum.UI_2D; control.addComponent(UITransform).setContentSize(236, 68); control.setPosition(x, y); parent.addChild(control); const g = control.addComponent(Graphics); const enabled = value !== 'OFF';
    g.fillColor = new Color(58, 13, 25, 245); g.roundRect(-118, -34, 236, 68, 29); g.fill(); g.strokeColor = new Color(143, 78, 47, 248); g.lineWidth = 6; g.roundRect(-114, -30, 228, 60, 26); g.stroke(); g.strokeColor = enabled ? C.gold : new Color(130, 91, 78); g.lineWidth = 2; g.roundRect(-111, -27, 222, 54, 24); g.stroke();
    if (toggle) {
      g.fillColor = enabled ? new Color(151, 45, 45, 215) : new Color(73, 44, 47, 215); g.roundRect(-103, -20, 206, 40, 19); g.fill(); const knobX = enabled ? 78 : -78; g.fillColor = enabled ? C.white : C.muted; g.circle(knobX, 0, 22); g.fill(); g.strokeColor = enabled ? C.gold : new Color(139, 100, 79); g.lineWidth = 3; g.circle(knobX, 0, 22); g.stroke(); g.fillColor = C.white; g.circle(knobX - 6, 6, 4); g.fill(); const copy = this.label(control, value, enabled ? -25 : 25, 0, 18, enabled ? C.white : C.muted, true, 100); this.addLabelOutline(copy, C.outline, 2);
    } else {
      g.strokeColor = C.paleGold; g.lineWidth = 3; g.moveTo(-87, 0); g.lineTo(-76, 10); g.moveTo(-87, 0); g.lineTo(-76, -10); g.moveTo(87, 0); g.lineTo(76, 10); g.moveTo(87, 0); g.lineTo(76, -10); g.stroke(); const copy = this.label(control, value, 0, 0, 18, C.white, true, 150); this.addLabelOutline(copy);
    }
    return control;
  }

  private showGameLoading(): void {
    const generation = this.loadingGeneration;
    const color = this.themeColor(this.selectedGame.id); const heroIndex = GAME_CONFIGS.indexOf(this.selectedGame);
    this.paintBackdrop('home', C.ink, color); this.addStarField(this.page, 34);
    const chamber = this.panel(this.page, 0, 15, 880, 1350, 46, new Color(23, 11, 18, 225), color, 3, true, heroIndex, 230);
    const cover = this.addGameCoverArt(chamber, heroIndex, 800, 560, true); cover.setPosition(0, 285);
    this.addCardMotes(chamber, 22, color, 780, 1160);
    this.addLoadingOrbit(chamber, 0, 278, color, 126);
    this.addBrandEmblem(chamber, 0, 278, 154);
    this.addPremiumSymbol(chamber, this.selectedGame, CARD_HERO_SYMBOLS[heroIndex], -320, 250, 112, 'float', 245, 0.08);
    this.addPremiumSymbol(chamber, this.selectedGame, this.selectedGame.scatterId ?? this.selectedGame.bonusId ?? this.selectedGame.wildId, 320, 250, 106, 'orbit', 238, 0.3);
    this.gameTitleLogo(chamber, this.selectedGame.name, 0, -82, 730, 168);
    const theme = this.label(chamber, `${this.selectedGame.modeLabel}  •  PREMIUM GAME READY`, 0, -158, 25, C.white, true, 740); this.addLabelOutline(theme, C.outline, 4);
    this.animateLoadingProgress(chamber, -350, -410, 650, 1.95, (ratio) => ratio < 0.34 ? 'POLISHING THE GOLD' : ratio < 0.72 ? 'CALIBRATING REELS' : 'CHARGING JACKPOT LIGHTS', () => { if (generation === this.loadingGeneration && this.router.route === 'game-loading') this.router.replace('game'); });
    const feature = this.label(chamber, `${this.selectedGame.feature.replace(/-/g, ' ').toUpperCase()}  •  DEMO CREDITS`, 0, -495, 24, C.paleGold, true, 700); this.addLabelOutline(feature, C.outline, 4);
    this.button(chamber, 'BACK TO LOBBY', 0, -585, 360, 64, () => this.router.go('home'), 'secondary');
  }

  private showGame(): void {
    this.ensurePlayer();
    const color = this.themeColor(this.selectedGame.id); const layout = CABINET_LAYOUTS[this.selectedGame.id]; const readout = CABINET_READOUT_LAYOUTS[this.selectedGame.id];
    this.paintBackdrop(`game_${this.selectedGame.id}`, C.ink, color); this.addStarField(this.page, 8);
    this.addCabinetBackdropAmbience(layout, color);
    this.addCabinetIdleAmbience(layout, color);
    this.addGameStage(layout, color);
    this.cabinetTitle(this.selectedGame.name, layout.titleY, layout.titleSize, layout.darkMarquee, layout.titleWidth);
    this.addJackpotStrip(layout, readout);
    this.addFeatureMeter(layout);
    const reelFrame = new Node('CasinoTableReelAperture'); reelFrame.layer = Layers.Enum.UI_2D; reelFrame.addComponent(UITransform).setContentSize(layout.reelWidth, layout.reelHeight); reelFrame.setPosition(layout.reelX, layout.reelY); this.page.addChild(reelFrame);
    const reelEngine = reelFrame.addComponent(ReelEngine); reelEngine.configure(this.selectedGame, layout.reelWidth, layout.reelHeight); this.reelEngine = reelEngine;
    this.addControlDeckIdle(layout, color);
    // The primary money ledger belongs in the narrow information rail above
    // the reels. Keeping it off the lower control deck prevents the labels and
    // values from fighting the physical buttons baked into each cabinet.
    this.balanceLabel = this.machineBalanceReadout(this.format(this.bootstrap.economy.balance()), readout.creditsY, readout.creditsWidth, layout.readoutHeight, layout.readoutFontSize, readout.creditsSurface);
    const winWindow = this.machineReadout('WIN', '0', readout.winX, readout.winY, readout.winWidth, layout.readoutHeight, layout.readoutFontSize, true); this.winLabel = winWindow;
    this.betLabel = this.machineBetReadout(this.format(this.bet()), readout.betX, readout.betY, readout.betWidth, layout.readoutFontSize, readout.betTone);
    this.machineButton('BET −', layout.minus.x, layout.minus.y, layout.minus.width, layout.minus.height, () => { this.betIndex = Math.max(0, this.betIndex - 1); this.refreshBet(); }, 'step', 'minus');
    this.machineButton('BET +', layout.plus.x, layout.plus.y, layout.plus.width, layout.plus.height, () => { this.betIndex = Math.min(this.selectedGame.bets.length - 1, this.betIndex + 1); this.refreshBet(); }, 'step', 'plus');
    const spin = this.machineButton('SPIN', layout.spin.x, layout.spin.y, layout.spin.width, layout.spin.height, () => void this.onSpin(), 'spin', 'spin'); this.spinButtonLabel = spin.getChildByName('MachineLabelPlaque')?.getChildByName('Text')?.getComponent(Label) ?? undefined;
    this.machineButton('AUTO', layout.auto.x, layout.auto.y, layout.auto.width, layout.auto.height, () => void this.startAuto(), 'switch', 'auto');
    this.machineButton('TURBO', layout.turbo.x, layout.turbo.y, layout.turbo.width, layout.turbo.height, () => { this.turbo = !this.turbo; this.render('game'); }, this.turbo ? 'switch-on' : 'switch', 'turbo');
    const soundOn = this.ensurePlayer().settings.sound;
    // These utility keys are viewport-corner controls, not artwork-relative
    // props. Applying the safe top offset keeps them in the true upper corners
    // on tall phones instead of letting them drift down beside the marquee.
    this.machineButton(soundOn ? 'SOUND ON' : 'SOUND OFF', layout.sound.x, this.topY(layout.sound.y), layout.sound.width, layout.sound.height, () => this.toggleGameSound(), soundOn ? 'switch-on' : 'switch', 'sound');
    this.machineButton('RULES', layout.rules.x, this.topY(layout.rules.y), layout.rules.width, layout.rules.height, () => this.showRules(), 'key', 'rules');
    this.machineButton('LOBBY', layout.home.x, this.topY(layout.home.y), layout.home.width, layout.home.height, () => this.router.go('home'), 'tool', 'home');
    if (this.forcedResult && !this.spinning) this.scheduleOnce(() => void this.onSpin(), 0.3);
  }

  private addGameStage(layout: CabinetLayout, accent: Color): void {
    const width = layout.reelWidth + 46; const height = layout.reelHeight + 46;
    const frame = new Node('HarborGlassReelStage'); frame.layer = Layers.Enum.UI_2D; frame.addComponent(UITransform).setContentSize(width, height); frame.setPosition(layout.reelX, layout.reelY); this.page.addChild(frame);
    const g = frame.addComponent(Graphics); const radius = 30;
    // The generated cabinet supplies the physical bezel. Runtime drawing is
    // limited to the inner smoked-glass seal and LED edge so it reads as one
    // manufactured screen instead of a second frame pasted over the cabinet.
    g.fillColor = new Color(255, 247, 220, 10); g.roundRect(-width / 2, -height / 2, width, height, radius); g.fill();
    g.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 138); g.lineWidth = 3; g.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, radius - 5); g.stroke();
    g.strokeColor = new Color(accent.r, accent.g, accent.b, 108); g.lineWidth = 1.5; g.roundRect(-width / 2 + 12, -height / 2 + 12, width - 24, height - 24, radius - 10); g.stroke();
    g.strokeColor = new Color(255, 252, 233, 150); g.lineWidth = 1.5; g.moveTo(-width * 0.3, height / 2 - 16); g.lineTo(width * 0.3, height / 2 - 16); g.stroke();
    for (const side of [-1, 1]) {
      const rail = new Node(side < 0 ? 'LeftPulseRail' : 'RightPulseRail'); rail.layer = Layers.Enum.UI_2D; rail.addComponent(UITransform).setContentSize(6, height * 0.72); rail.setPosition(side * (width / 2 - 14), 0); frame.addChild(rail); const rg = rail.addComponent(Graphics); rg.fillColor = new Color(side < 0 ? C.paleGold.r : accent.r, side < 0 ? C.paleGold.g : accent.g, side < 0 ? C.paleGold.b : accent.b, 128); rg.roundRect(-3, -height * 0.36, 6, height * 0.72, 3); rg.fill(); const opacity = rail.addComponent(UIOpacity); tween(opacity).delay(side > 0 ? 0.35 : 0).to(1.1, { opacity: 220 }, { easing: 'sineInOut' }).to(1.35, { opacity: 62 }, { easing: 'sineInOut' }).union().repeatForever().start();
    }
    this.addCardShine(frame, width - 34, height - 34, C.paleGold, 1.4);
  }

  private async onSpin(): Promise<boolean> {
    if (this.spinning) { this.reelEngine?.quickStop(); return true; }
    const cabinetLayout = CABINET_LAYOUTS[this.selectedGame.id]; const readoutLayout = CABINET_READOUT_LAYOUTS[this.selectedGame.id];
    const rng = this.rngByGame.get(this.selectedGame.id) as SecureRNG;
    const result = this.resultGenerator.generate(this.selectedGame, this.bet(), rng, this.forcedResult); this.forcedResult = undefined;
    if (!this.bootstrap.economy.reserveSpin(result.spinId, this.bet())) { this.toast('Not enough demo credits or spin already active', C.red); return false; }
    this.spinning = result; this.stateMachine.reset(); this.stateMachine.move('reserving-bet'); this.stateMachine.move('result-ready'); this.stateMachine.move('spinning');
    if (this.spinButtonLabel) this.spinButtonLabel.string = 'STOP'; if (this.winLabel) this.winLabel.string = 'GOOD LUCK'; this.vfx.spinCharge(new Vec3(cabinetLayout.spin.x, cabinetLayout.spin.y, 0), this.themeColor(this.selectedGame.id)); this.refreshBalance();
    this.audio.play('spin'); this.audio.vibrate(22);
    await this.reelEngine?.spin(result, this.selectedGame, this.turbo);
    this.stateMachine.move('stopping'); this.stateMachine.move('evaluating');
    this.bootstrap.economy.settleSpin(result.spinId, result.totalWin); this.bootstrap.achievements.add('spin', 1); if (result.totalWin) this.bootstrap.achievements.add('win', result.totalWin); if (result.feature) this.bootstrap.achievements.add('feature', 1);
    this.audio.play('reel-stop'); if (result.totalWin > 0) { this.audio.play('win'); this.audio.vibrate([30, 35, 45]); if (this.winLabel) this.winLabel.string = `+${this.format(result.totalWin)}`; this.vfx.pulse(this.winLabel?.node as Node); if (this.reelEngine) { this.vfx.pulse(this.reelEngine.node); this.reelEngine.presentWins(result, this.selectedGame); } const winColor = this.themeColor(this.selectedGame.id); const majorWin = result.totalWin / Math.max(1, this.bet()) >= 8; const finalBalance = this.bootstrap.economy.balance(); this.animateBalance(Math.max(0, finalBalance - result.totalWin), finalBalance, majorWin ? 1.25 : 0.9); this.vfx.celebrateWin(new Vec3(cabinetLayout.reelX, cabinetLayout.reelY, 0), winColor); this.vfx.royalWinShower(new Vec3(cabinetLayout.reelX, cabinetLayout.reelY, 0), winColor, majorWin, this.selectedGame); this.vfx.flyCredits(new Vec3(cabinetLayout.reelX, cabinetLayout.reelY, 0), new Vec3(0, readoutLayout.creditsY, 0)); await this.presentWinSplash(result); this.stateMachine.move('presenting-win'); }
    if (result.feature) { if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win') this.stateMachine.move('feature'); this.presentFeature(result); }
    if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win' || this.stateMachine.state === 'feature') this.stateMachine.move('settled'); this.stateMachine.move('idle');
    this.spinning = undefined; if (this.spinButtonLabel) this.spinButtonLabel.string = 'SPIN'; if (this.winLabel && result.totalWin <= 0) this.winLabel.string = '0'; if (result.totalWin <= 0) this.refreshBalance(); return true;
  }

  private presentFeature(result: SpinResult): void {
    if (result.feature?.type === 'hold-and-spin') {
      const feature = result.featureResult; this.rewardModal("CAPTAIN'S CHEST RESPINS", `${feature?.detail.toUpperCase() ?? 'RESPINS RESOLVED'}\n${feature?.jackpot?.toUpperCase() ?? 'LOCKED COINS'}\n+${this.format(feature?.totalCredits ?? 0)} CREDITS`, C.cyan);
    } else if (result.feature?.type === 'coin-toss') {
      this.rewardModal('GOLDEN COIN TOSS', `${result.featureResult?.detail.toUpperCase() ?? 'COIN SETTLED'}\n+${this.format(result.featureResult?.totalCredits ?? 0)} CREDITS`, C.red);
    } else if (result.feature?.type === 'beacon') {
      this.rewardModal('GRAND BEACON JACKPOT', `${result.featureResult?.detail.toUpperCase() ?? 'JACKPOT BEACON LOCKED'}\n+${this.format(result.featureResult?.totalCredits ?? 0)} CREDITS`, C.gold);
    } else {
      this.rewardModal('PEARL CASCADE', `${result.featureResult?.rounds.length ?? 0} CASCADES RESOLVED\nRISING MULTIPLIER\n+${this.format(result.featureResult?.totalCredits ?? 0)} CREDITS`, C.violet);
    }
  }

  private presentWinSplash(result: SpinResult): Promise<void> {
    const ratio = result.totalWin / Math.max(1, this.bet()); const title = ratio >= 50 ? 'EPIC WIN' : ratio >= 20 ? 'MEGA WIN' : ratio >= 8 ? 'BIG WIN' : ratio >= 2 ? 'GREAT WIN' : 'NICE WIN'; const color = this.themeColor(this.selectedGame.id); const major = ratio >= 8; const duration = ratio >= 50 ? 2.8 : ratio >= 20 ? 2.35 : 1.9;
    const root = new Node('WinCelebration'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(W, H); this.overlay.addChild(root);
    // Do not dim the full cabinet. Previous full-screen black glass read as a
    // shadow-frame bug; the local ray halo and framed artwork supply focus.
    const rays = this.addWinRayHalo(root, 0, 105, color, major); rays.setScale(new Vec3(0.42, 0.42, 1)); const rayOpacity = rays.addComponent(UIOpacity); rayOpacity.opacity = 0; tween(rays).to(0.48, { scale: new Vec3(1.02, 1.02, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }).by(duration + 1.2, { angle: 64 }).start(); tween(rayOpacity).to(0.2, { opacity: 220 }).delay(duration).to(0.38, { opacity: 0 }).start();
    const card = new Node('WinSplash'); card.layer = Layers.Enum.UI_2D; card.addComponent(UITransform).setContentSize(920, major ? 420 : 350); card.setPosition(0, 105); root.addChild(card); const opacity = card.addComponent(UIOpacity); opacity.opacity = 0; card.setScale(new Vec3(0.42, 0.42, 1));
    const winArtIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame));
    const winArtwork = this.addGameCoverArt(card, winArtIndex, 780, major ? 356 : 286, true); winArtwork.setPosition(0, 0); winArtwork.setSiblingIndex(0);
    const stage = new Node('HarborWinStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(900, major ? 400 : 330); card.addChild(stage); const g = stage.addComponent(Graphics); const halfH = major ? 178 : 143;
    // Matching animated cover art remains clearly visible through lightly
    // smoked glass. Layered gold shoulders, jewel lamps and curved rails give
    // the award its own physical stage instead of one flat rounded rectangle.
    g.fillColor = new Color(6, 18, 38, major ? 116 : 136); g.roundRect(-390, -halfH, 780, halfH * 2, 62); g.fill();
    g.strokeColor = new Color(108, 58, 24, 248); g.lineWidth = 12; g.roundRect(-390, -halfH, 780, halfH * 2, 62); g.stroke();
    g.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 250); g.lineWidth = 5; g.roundRect(-382, -halfH + 8, 764, halfH * 2 - 16, 55); g.stroke();
    g.strokeColor = new Color(255, 250, 222, 220); g.lineWidth = 1.5; g.roundRect(-374, -halfH + 16, 748, halfH * 2 - 32, 49); g.stroke();
    g.strokeColor = new Color(color.r, color.g, color.b, 225); g.lineWidth = 3; g.roundRect(-360, -halfH + 29, 720, halfH * 2 - 58, 48); g.stroke();
    for (const side of [-1, 1]) {
      const outerX = side * 390; const innerX = side * 330;
      g.fillColor = new Color(91, 29, 31, 232); g.moveTo(outerX, halfH - 62); g.lineTo(innerX, halfH - 34); g.lineTo(innerX, -halfH + 34); g.lineTo(outerX, -halfH + 62); g.close(); g.fill();
      g.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 240); g.lineWidth = 3; g.moveTo(outerX, halfH - 62); g.lineTo(innerX, halfH - 34); g.lineTo(innerX, -halfH + 34); g.lineTo(outerX, -halfH + 62); g.stroke();
    }
    g.strokeColor = new Color(255, 224, 144, 205); g.lineWidth = 3; g.moveTo(-285, halfH - 29); g.quadraticCurveTo(0, halfH + 13, 285, halfH - 29); g.stroke(); g.moveTo(-285, -halfH + 29); g.quadraticCurveTo(0, -halfH - 13, 285, -halfH + 29); g.stroke();
    g.fillColor = new Color(255, 220, 132, 28); g.roundRect(-286, major ? 3 : 0, 572, major ? 112 : 90, 34); g.fill();
    for (let index = 0; index < 9; index += 1) { const x = -288 + index * 72; const y = halfH - 14; g.fillColor = index % 2 ? color : C.chrome; g.circle(x, y, index === 4 ? 7 : 4.5); g.fill(); g.strokeColor = C.gold; g.lineWidth = 1.5; g.circle(x, y, index === 4 ? 9 : 6.5); g.stroke(); g.fillColor = C.white; g.circle(x - 1.5, y + 1.5, 1.2); g.fill(); }
    this.addCardMotes(card, major ? 34 : 22, color, 780, major ? 350 : 280); this.addCardShine(card, 800, major ? 350 : 280, C.paleGold, 0);
    this.addPremiumSymbol(card, this.selectedGame, this.selectedGame.wildId, -300, -2, major ? 168 : 146, 'pulse', 255);
    this.addPremiumSymbol(card, this.selectedGame, this.selectedGame.symbols.find((symbol) => symbol.tier === 'high')?.id ?? this.selectedGame.wildId, 300, -2, major ? 160 : 140, 'orbit', 245, 0.12);
    const eyebrow = this.label(card, major ? '✦  FORTUNE HARBOR WIN  ✦' : '✦  CABINET WIN  ✦', 0, major ? 123 : 98, 19, C.paleGold, true, 450); this.addLabelOutline(eyebrow, C.outline, 3);
    const winTitleColor = this.mix(color, C.paleGold, 0.62); this.artTitle(card, title, 0, major ? 65 : 48, major ? 68 : 54, winTitleColor, 540);
    const amount = this.label(card, '+0', 0, major ? -40 : -34, major ? 63 : 50, C.white, true, 550); amount.node.name = 'WinAmount'; this.addLabelOutline(amount, C.outline, 5);
    const multiplier = this.label(card, `${ratio.toFixed(ratio >= 10 ? 0 : 1)}× TOTAL BET`, 0, major ? -120 : -96, 21, C.paleGold, true, 510); this.addLabelOutline(multiplier, C.outline, 3);
    const counter = { value: 0 }; tween(counter).delay(0.22).to(Math.min(1.2, duration * 0.52), { value: result.totalWin }, { easing: 'cubicOut', onUpdate: () => { if (amount.node?.isValid) amount.string = `+${this.format(counter.value)}`; } }).call(() => { if (amount.node?.isValid) amount.string = `+${this.format(result.totalWin)}`; }).start();
    tween(opacity).to(0.12, { opacity: 255 }).delay(duration + 0.15).to(0.36, { opacity: 0 }).start();
    return new Promise((resolve) => {
      tween(card).to(0.38, { scale: new Vec3(1.055, 1.055, 1) }, { easing: 'backOut' }).to(0.16, { scale: Vec3.ONE }).delay(Math.max(0.8, duration - 0.35)).to(0.34, { position: new Vec3(0, 205, 0), scale: new Vec3(0.72, 0.72, 1) }, { easing: 'quadIn' }).call(() => { if (root.isValid) root.destroy(); resolve(); }).start();
    });
  }

  private addWinRayHalo(parent: Node, x: number, y: number, color: Color, major: boolean): Node {
    const node = new Node('ChampagneRayHalo'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(1060, 1060); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); const inner = major ? 145 : 120; const outer = major ? 490 : 420; const rays = major ? 24 : 18;
    for (let index = 0; index < rays; index += 1) { const angle = Math.PI * 2 * index / rays; const spread = Math.PI / rays * 0.48; g.fillColor = index % 2 === 0 ? new Color(255, 222, 138, 38) : new Color(color.r, color.g, color.b, 24); g.moveTo(Math.cos(angle - spread) * inner, Math.sin(angle - spread) * inner); g.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); g.lineTo(Math.cos(angle + spread) * inner, Math.sin(angle + spread) * inner); g.close(); g.fill(); }
    g.strokeColor = new Color(255, 224, 143, 135); g.lineWidth = 3; g.circle(0, 0, inner - 18); g.stroke(); g.strokeColor = new Color(color.r, color.g, color.b, 105); g.lineWidth = 2; g.circle(0, 0, inner + 17); g.stroke(); return node;
  }

  private async startAuto(): Promise<void> {
    if (this.autoSpin.active) { this.autoSpin.cancel(); this.toast('Auto Spin will stop after this reel', C.muted); return; }
    this.toast('Auto Spin started • 10 spins', C.cyan); const count = await this.autoSpin.start(10, () => this.onSpin()); this.toast(`Auto Spin completed ${count} spins`, C.cyan);
  }

  private toggleGameSound(): void {
    const player = this.ensurePlayer();
    const sound = !player.settings.sound;
    this.bootstrap.profile.updateSettings({ sound });
    this.audio.setEffects(sound);
    this.toast(sound ? 'Game sound on' : 'Game sound off', sound ? C.gold : C.muted);
    this.render('game');
  }

  private showPaytable(): void {
    const modal = this.modal(900, 1250); const accent = this.themeColor(this.selectedGame.id); this.artTitle(modal, `${this.selectedGame.name} PAYTABLE`, 0, 510, 37, accent, 760);
    this.selectedGame.symbols.slice(0, 9).forEach((symbol, index) => { const y = 395 - index * 95; const pay = this.selectedGame.paytable[symbol.id]; const values = Object.entries(pay ?? {}).slice(0, 4).map(([count, value]) => `${count}× ${value}`).join('   ') || 'FEATURE SYMBOL'; this.addPremiumSymbol(modal, this.selectedGame, symbol.id, -375, y, 76, 'pulse', 245, index * 0.08); this.label(modal, symbol.label.toUpperCase(), -185, y, 22, C.white, true, 350); this.label(modal, values, 225, y, 20, C.paleGold, true, 400); });
    this.button(modal, 'CLOSE', 0, -520, 320, 64, () => this.closeModal(modal), 'secondary');
  }

  private showRules(): void {
    const modal = this.modal(900, 1270); const accent = this.themeColor(this.selectedGame.id); const heroIndex = GAME_CONFIGS.indexOf(this.selectedGame); const cover = this.addGameCoverArt(modal, heroIndex, 790, 210, true); cover.setPosition(0, 465);
    this.artTitle(modal, `${this.selectedGame.name} RULES`, 0, 495, 39, accent, 730); this.addStatusChip(modal, this.selectedGame.modeLabel, 0, 417, accent, 390);
    const feature = this.selectedGame.feature.replace(/-/g, ' ').toUpperCase(); const summary = this.panel(modal, 0, 305, 780, 140, 26, new Color(38, 13, 25, 246), accent, 2, false); this.label(summary, 'FEATURE', -280, 25, 19, C.paleGold, true, 180); this.label(summary, feature, 75, 25, 25, C.white, true, 500); this.label(summary, `SIMULATED RTP  ${(this.selectedGame.targetRtp * 100).toFixed(0)}%  •  DEMO CREDITS ONLY`, 0, -31, 19, C.chrome, true, 700);
    const scatterCopy = this.selectedGame.feature === 'coin-toss' ? '3+ HARBOR TICKETS OPEN THE GOLDEN COIN TOSS'
      : this.selectedGame.feature === 'cascade-multiplier' ? 'CLUSTER WINS MAY CONTINUE AS RISING CASCADES'
        : this.selectedGame.feature === 'beacon-bonus' ? '3+ JACKPOT BEACONS OPEN THE GOLD-VAULT BONUS'
          : '6+ COIN BEACONS TRIGGER HOLD & RESPIN';
    const tips = [
      ['SPIN', 'Tap SPIN to play. Tap again to quick-stop.'],
      ['TURBO', 'Faster reel timing. The prepared result stays unchanged.'],
      ['AUTO', 'Runs 10 spins. Tap again to stop after the current spin.'],
      ['BONUS', scatterCopy],
    ] as const;
    tips.forEach(([title, body], index) => { const y = 178 - index * 100; const row = this.panel(modal, 0, y, 780, 80, 20, new Color(48, 11, 22, 248), index === 3 ? C.gold : new Color(accent.r, accent.g, accent.b, 220), 2, false); this.addStatusChip(row, title, -285, 0, index === 3 ? C.gold : accent, 124); this.label(row, body, 72, 0, 24, C.white, true, 558); });
    this.label(modal, 'TOP PAYOUTS', -280, -260, 20, C.paleGold, true, 210);
    const topPayouts = this.selectedGame.symbols
      .filter((symbol) => this.selectedGame.paytable[symbol.id])
      .sort((left, right) => Math.max(...Object.values(this.selectedGame.paytable[right.id] ?? { 0: 0 })) - Math.max(...Object.values(this.selectedGame.paytable[left.id] ?? { 0: 0 })))
      .slice(0, 3);
    topPayouts.forEach((symbol, index) => {
      const x = -250 + index * 250; const card = this.panel(modal, x, -355, 220, 132, 20, new Color(75, 19, 30, 235), index === 0 ? C.gold : accent, 2, false);
      this.addPremiumSymbol(card, this.selectedGame, symbol.id, -65, 2, 72, 'pulse', 245, index * 0.08);
      const values = Object.entries(this.selectedGame.paytable[symbol.id] ?? {}).slice(-2).map(([count, value]) => `${count}× ${value}`).join('  ');
      this.label(card, symbol.label.toUpperCase(), 38, 23, 18, C.white, true, 124);
      this.label(card, values, 38, -23, 18, C.paleGold, true, 124);
    });
    this.button(modal, 'CLOSE RULES', 0, -535, 380, 86, () => this.closeModal(modal), 'secondary');
  }

  private cabinetTitle(text: string, y: number, size: number, darkSurface: boolean, width: number): void {
    void size; void darkSurface;
    this.gameTitleLogo(this.page, text, 0, y, width, 150);
  }

  private gameTitleLogo(parent: Node, text: string, x: number, y: number, width: number, height: number): Node {
    const accent = this.themeColor(this.selectedGame.id);
    const root = new Node('CabinetTitle'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(width, height); root.setPosition(x, y); parent.addChild(root);
    const fallback = this.artTitle(root, text, 0, 0, Math.max(38, Math.round(height * 0.31)), accent, width - 18); const fallbackOpacity = fallback.node.parent?.addComponent(UIOpacity) ?? fallback.node.addComponent(UIOpacity); fallbackOpacity.opacity = 255;
    const image = new Node('TitleLogoImage'); image.layer = Layers.Enum.UI_2D; root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.RAW; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    resources.load(`${TITLE_LOGO_PATHS[this.selectedGame.id]}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !root.isValid || !image.isValid) return;
      const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame; const transform = image.getComponent(UITransform) as UITransform; transform.setContentSize(texture.width, texture.height);
      // Generated marquees intentionally carry large transparent margins.
      // Scale by the cabinet's usable width so the visible lettering remains
      // large; the transparent pixels may extend outside this unmasked root.
      const fit = width / texture.width; image.setScale(new Vec3(fit * 0.96, fit * 0.96, 1)); image.setPosition(0, 0); fallbackOpacity.opacity = 0;
      tween(opacity).to(0.28, { opacity: 255 }, { easing: 'quadOut' }).start();
      tween(image).to(1.75, { position: new Vec3(0, 4, 0), scale: new Vec3(fit * 0.978, fit * 0.978, 1) }, { easing: 'sineInOut' }).to(1.95, { position: Vec3.ZERO, scale: new Vec3(fit * 0.96, fit * 0.96, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
    for (let index = 0; index < 3; index += 1) {
      const glint = new Node(`TitleLogoGlint-${index}`); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(26, 26); glint.setPosition((-0.34 + index * 0.34) * width, index % 2 ? -height * 0.2 : height * 0.23); root.addChild(glint); const g = glint.addComponent(Graphics); g.fillColor = index === 1 ? C.white : C.paleGold; g.moveTo(0, 12); g.lineTo(3, 3); g.lineTo(12, 0); g.lineTo(3, -3); g.lineTo(0, -12); g.lineTo(-3, -3); g.lineTo(-12, 0); g.lineTo(-3, 3); g.close(); g.fill(); const glintOpacity = glint.addComponent(UIOpacity); glintOpacity.opacity = 0;
      tween(glintOpacity).delay(0.48 + index * 0.73).to(0.18, { opacity: 245 }, { easing: 'sineOut' }).to(0.42, { opacity: 0 }, { easing: 'sineInOut' }).delay(2.25 + index * 0.22).union().repeatForever().start();
      tween(glint).delay(index * 0.42).by(1.4, { angle: 180, scale: new Vec3(0.35, 0.35, 0) }).by(1.4, { angle: 180, scale: new Vec3(-0.35, -0.35, 0) }).union().repeatForever().start();
    }
    return root;
  }

  private addJackpotStrip(layout: CabinetLayout, readout: CabinetReadoutLayout): void {
    const values: Readonly<Record<GameId, string>> = {
      'golden-tide': '2,500×', 'captains-chest': '10,000×', 'pearl-parade': '10,000×', 'lucky-lighthouse': '8,000×',
    };
    // Each generated marquee has different optical padding, so TOP WIN uses a
    // cabinet-specific baseline and contrast treatment instead of a formula.
    const node = new Node('GrandJackpotDisplay'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(layout.jackpotWidth, 46); node.setPosition(0, readout.topWinY); this.page.addChild(node);
    const onDark = readout.topWinSurface === 'dark'; const textColor = onDark ? new Color(255, 238, 174) : new Color(78, 25, 22); const outlineColor = onDark ? new Color(31, 18, 15, 255) : new Color(255, 224, 137, 250);
    const label = this.label(node, `TOP WIN   ${values[this.selectedGame.id]}`, 0, 0, 28, textColor, true, layout.jackpotWidth - 24); label.node.name = 'GrandValue'; this.addLabelOutline(label, outlineColor, onDark ? 3 : 2);
  }

  private addFeatureMeter(layout: CabinetLayout): void {
    const meters: Readonly<Record<GameId, { name: string; mode: string; suffix: string }>> = {
      'golden-tide': { name: 'COIN TOSS', mode: 'CENTER LINE', suffix: '3 TICKETS' },
      'captains-chest': { name: 'TREASURE HOLD', mode: '20 LINES', suffix: '6 BEACONS' },
      'pearl-parade': { name: 'JEWEL CASCADE', mode: 'CLUSTER PAYS', suffix: 'COIN MULTIPLIER' },
      'lucky-lighthouse': { name: 'GRAND BEACON', mode: '4096 WAYS', suffix: '3 JACKPOT DISKS' },
    };
    const meter = meters[this.selectedGame.id]; const node = new Node('FeatureMeter'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(layout.featureWidth, 34); node.setPosition(0, layout.featureY); this.page.addChild(node);
    const label = this.label(node, `${meter.name}   ◆   ${meter.mode}   ◆   ${meter.suffix}`, 0, 0, 23, C.chrome, true, layout.featureWidth); this.addLabelOutline(label, C.outline, 3);
  }

  private machineReadout(title: string, value: string, x: number, y: number, width: number, height: number, fontSize: number, prominent = false): Label {
    const node = new Node(`${title}Readout`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const heading = this.label(node, title, 0, height * 0.22, Math.max(22, fontSize - 2), new Color(42, 20, 17), true, width - 8); heading.node.name = 'ReadoutHeading'; this.addLabelOutline(heading, new Color(255, 229, 151, 250), 2);
    const label = this.label(node, value, 0, -height * 0.14, Math.max(37, fontSize + 13), prominent ? new Color(137, 9, 34) : new Color(8, 27, 25), true, width - 8); label.node.name = 'ReadoutText'; this.addLabelOutline(label, new Color(255, 244, 203, 255), 2); return label;
  }

  private machineBalanceReadout(value: string, y: number, width: number, height: number, fontSize: number, surface: 'light' | 'dark'): Label {
    const node = new Node('CREDITSReadout'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(0, y); this.page.addChild(node);
    const headingWidth = 154; const valueWidth = width - headingWidth - 14;
    const onDark = surface === 'dark'; const headingColor = onDark ? new Color(255, 218, 119) : new Color(111, 13, 31); const valueColor = onDark ? new Color(255, 250, 226) : new Color(7, 69, 57); const outline = onDark ? new Color(28, 18, 14, 255) : new Color(255, 224, 130, 250);
    const heading = this.label(node, 'CREDITS', -width / 2 + headingWidth / 2 + 5, 0, Math.max(28, fontSize + 4), headingColor, true, headingWidth); heading.node.name = 'ReadoutHeading'; this.addLabelOutline(heading, outline, onDark ? 3 : 1);
    const label = this.label(node, value, width / 2 - valueWidth / 2 - 5, 0, Math.max(44, fontSize + 20), valueColor, true, valueWidth); label.node.name = 'ReadoutText'; this.addLabelOutline(label, outline, onDark ? 3 : 2); return label;
  }

  private machineBetReadout(value: string, x: number, y: number, width: number, fontSize: number, tone: Color): Label {
    const height = 58; const node = new Node('BETReadout'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const g = node.addComponent(Graphics); g.fillColor = new Color(tone.r, tone.g, tone.b, 246); g.roundRect(-width / 2, -height / 2, width, height, 21); g.fill(); g.strokeColor = new Color(137, 76, 40, 252); g.lineWidth = 5; g.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 18); g.stroke(); g.strokeColor = new Color(255, 219, 128, 248); g.lineWidth = 2; g.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, 15); g.stroke();
    const heading = this.label(node, 'BET', -width * 0.25, 0, Math.max(21, fontSize - 1), C.paleGold, true, width * 0.38); heading.node.name = 'ReadoutHeading'; this.addLabelOutline(heading, new Color(42, 6, 13, 255), 2);
    const label = this.label(node, value, width * 0.19, 0, Math.max(34, fontSize + 10), C.white, true, width * 0.48); label.node.name = 'ReadoutText'; this.addLabelOutline(label, new Color(48, 7, 14, 255), 2); return label;
  }

  private machineButton(text: string, x: number, y: number, width: number, height: number, action: () => void, kind: 'spin' | 'step' | 'switch' | 'switch-on' | 'key' | 'tool', icon: MachineControlIcon): Node {
    const node = new Node(`MachineButton-${kind}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node); const accent = this.themeColor(this.selectedGame.id);
    const floatingTool = icon === 'home' || icon === 'sound' || icon === 'rules';
    if (floatingTool) this.addMachineBackPlate(node, width, height, accent); else this.addMachineKeyEmphasis(node, width, height, kind, accent);
    const iconNode = this.addMachineControlIcon(node, width, height, icon, kind === 'switch-on');
    const labelY = kind === 'spin' ? -height * 0.33 : -height * 0.37;
    const plaqueWidth = Math.min(kind === 'spin' ? 100 : 94, Math.max(76, width + 2));
    const plaqueHeight = 34;
    const plaque = new Node('MachineLabelPlaque'); plaque.layer = Layers.Enum.UI_2D; plaque.addComponent(UITransform).setContentSize(plaqueWidth, plaqueHeight); plaque.setPosition(0, labelY); node.addChild(plaque);
    const plaqueGraphics = plaque.addComponent(Graphics); plaqueGraphics.fillColor = new Color(74, 15, 25, 244); plaqueGraphics.roundRect(-plaqueWidth / 2, -plaqueHeight / 2, plaqueWidth, plaqueHeight, 11); plaqueGraphics.fill(); plaqueGraphics.strokeColor = new Color(255, 220, 137, 238); plaqueGraphics.lineWidth = 2; plaqueGraphics.roundRect(-plaqueWidth / 2 + 2, -plaqueHeight / 2 + 2, plaqueWidth - 4, plaqueHeight - 4, 9); plaqueGraphics.stroke();
    const displayText = icon === 'sound' ? 'SOUND' : text;
    const label = this.label(plaque, displayText, 0, 0, kind === 'spin' ? 23 : 20, C.white, true, plaqueWidth - 8); label.node.name = 'Text'; label.enableWrapText = false; this.addLabelOutline(label, new Color(50, 7, 16, 250), 2);
    if (kind === 'switch' || kind === 'switch-on') {
      const lamp = new Node('MachineStatusLamp'); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(16, 16); lamp.setPosition(width * 0.32, height * 0.31); node.addChild(lamp); const lampGraphics = lamp.addComponent(Graphics); lampGraphics.fillColor = kind === 'switch-on' ? new Color(126, 245, 147) : new Color(118, 52, 57); lampGraphics.circle(0, 0, 7); lampGraphics.fill(); lampGraphics.strokeColor = C.paleGold; lampGraphics.lineWidth = 1.5; lampGraphics.circle(0, 0, 7); lampGraphics.stroke();
    }
    const button = node.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.93;
    node.on(Node.EventType.TOUCH_START, () => {
      this.audio?.play('tap'); this.audio?.vibrate(10); this.vfx?.buttonBurst(node, accent);
      if (iconNode) tween(iconNode).to(0.07, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'sineOut' }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
      tween(plaque).to(0.07, { scale: new Vec3(0.96, 0.96, 1) }, { easing: 'sineOut' }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }, this);
    node.on(Node.EventType.TOUCH_END, action, this); return node;
  }

  private addMachineBackPlate(parent: Node, width: number, height: number, accent: Color): void {
    const plate = new Node('BackMetalPlate'); plate.layer = Layers.Enum.UI_2D; plate.addComponent(UITransform).setContentSize(width, height); parent.addChild(plate); plate.setSiblingIndex(0); const g = plate.addComponent(Graphics); const circular = Math.abs(width - height) < 8;
    if (circular) {
      const radius = Math.min(width, height) / 2; g.fillColor = new Color(Math.round(accent.r * 0.38), Math.round(accent.g * 0.28), Math.round(accent.b * 0.24), 242); g.circle(0, 0, radius); g.fill(); g.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 248); g.lineWidth = 8; g.circle(0, -1, radius - 5); g.stroke(); g.strokeColor = C.paleGold; g.lineWidth = 3.5; g.circle(0, 0, radius - 9); g.stroke(); g.strokeColor = new Color(255, 252, 231, 198); g.lineWidth = 1.5; g.arc(0, 0, radius - 14, 0.36, 2.52, false); g.stroke();
      [[-1, 0], [1, 0], [0, 1], [0, -1]].forEach(([sx, sy]) => { const jewelX = sx * (radius - 10); const jewelY = sy * (radius - 10); g.fillColor = accent; g.circle(jewelX, jewelY, 3.5); g.fill(); g.fillColor = C.white; g.circle(jewelX - 1, jewelY + 1, 0.9); g.fill(); });
    } else {
      const radius = height * 0.48; g.fillColor = new Color(Math.round(accent.r * 0.34), Math.round(accent.g * 0.25), Math.round(accent.b * 0.22), 238); g.roundRect(-width / 2, -height / 2, width, height, radius); g.fill(); g.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 245); g.lineWidth = 6; g.roundRect(-width / 2 + 3, -height / 2 + 2, width - 6, height - 6, radius - 2); g.stroke(); g.strokeColor = C.paleGold; g.lineWidth = 2.5; g.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, radius - 6); g.stroke(); g.strokeColor = new Color(255, 252, 231, 170); g.lineWidth = 1; g.moveTo(-width / 2 + radius, height / 2 - 8); g.lineTo(width / 2 - radius, height / 2 - 8); g.stroke(); g.fillColor = accent; g.circle(width / 2 - 18, 0, 4); g.fill();
    }
  }

  private addMachineKeyEmphasis(parent: Node, width: number, height: number, kind: 'spin' | 'step' | 'switch' | 'switch-on' | 'key' | 'tool', accent: Color): void {
    const plate = new Node('MachineKeyEmphasis'); plate.layer = Layers.Enum.UI_2D; plate.addComponent(UITransform).setContentSize(width, height); parent.addChild(plate); plate.setSiblingIndex(0); const g = plate.addComponent(Graphics); const inset = Math.max(4, Math.min(width, height) * 0.09); const circular = Math.abs(width - height) < 8; const active = kind === 'spin' || kind === 'switch-on';
    g.fillColor = new Color(accent.r, accent.g, accent.b, active ? 30 : 8); g.strokeColor = active ? C.paleGold : new Color(C.gold.r, C.gold.g, C.gold.b, 132); g.lineWidth = active ? 3 : 1.5;
    if (circular) { g.circle(0, 0, Math.max(4, Math.min(width, height) / 2 - inset)); g.fill(); g.stroke(); }
    else { const radius = Math.max(8, height * 0.36); g.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, radius); g.fill(); g.stroke(); }
    if (kind === 'spin') { const opacity = plate.addComponent(UIOpacity); opacity.opacity = 150; tween(opacity).to(1.05, { opacity: 238 }, { easing: 'sineInOut' }).to(1.15, { opacity: 145 }, { easing: 'sineInOut' }).union().repeatForever().start(); }
  }

  private addMachineCaptionPlaque(parent: Node, text: string, y: number, accent: Color): void {
    const caption = text === 'PAYOUT' ? 'PAYS' : text; const width = caption === 'RULES' ? 84 : Math.max(70, Math.min(82, 34 + caption.length * 8)); const height = 30; const plate = new Node('MachineCaptionPlaque'); plate.layer = Layers.Enum.UI_2D; plate.addComponent(UITransform).setContentSize(width, height); plate.setPosition(0, y + 2); parent.addChild(plate); const g = plate.addComponent(Graphics);
    g.fillColor = new Color(12, 29, 54, 246); g.roundRect(-width / 2, -height / 2, width, height, 9); g.fill(); g.strokeColor = new Color(109, 150, 189, 250); g.lineWidth = 4; g.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 8); g.stroke(); g.strokeColor = accent; g.lineWidth = 1.5; g.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 7); g.stroke();
    g.fillColor = accent; g.circle(-width / 2 + 8, 0, 2.5); g.fill(); g.circle(width / 2 - 8, 0, 2.5); g.fill();
    const label = this.label(plate, caption, 0, 0, 16, C.white, true, width - 10); label.enableWrapText = false; label.node.name = 'CaptionText'; this.addLabelOutline(label, C.outline, 2);
  }

  private addMachineControlIcon(parent: Node, width: number, height: number, icon: MachineControlIcon, active: boolean): Node {
    const unit = Math.min(width, height); const visualSize = unit * (icon === 'spin' ? 0.96 : 0.82);
    const node = new Node(`ControlIcon-${icon}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(visualSize, visualSize); node.setPosition(0, height * (icon === 'spin' ? 0.05 : 0.09)); parent.addChild(node);
    // The four control atlases deliberately use different silhouettes
    // (round, octagonal, scalloped and hexagonal). A circular runtime mask
    // made them all look identical and clipped their manufactured edges.
    const clip = new Node('ControlAtlasClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(visualSize, visualSize); node.addChild(clip);
    const image = new Node('ControlAtlasImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(visualSize, visualSize); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const fallback = new Node('ControlFallback'); fallback.layer = Layers.Enum.UI_2D; fallback.addComponent(UITransform).setContentSize(visualSize, visualSize); node.addChild(fallback); const fallbackGraphics = fallback.addComponent(Graphics); fallbackGraphics.fillColor = new Color(82, 17, 28, 248); fallbackGraphics.circle(0, 0, visualSize * 0.44); fallbackGraphics.fill(); fallbackGraphics.strokeColor = C.paleGold; fallbackGraphics.lineWidth = Math.max(2, visualSize * 0.04); fallbackGraphics.circle(0, 0, visualSize * 0.42); fallbackGraphics.stroke();
    const fallbackLabel = this.label(fallback, icon === 'minus' ? '−' : icon === 'plus' ? '+' : icon === 'spin' || icon === 'auto' ? '↻' : icon === 'turbo' ? 'ϟ' : icon === 'sound' ? '♪' : icon === 'home' ? '⌂' : 'i', 0, 0, Math.max(22, visualSize * 0.42), C.paleGold, true, visualSize * 0.72); this.addLabelOutline(fallbackLabel, C.outline, 2);
    const gameId = this.selectedGame.id;
    const applyFrame = (): void => { if (!node.isValid || !image.isValid) return; const frame = MachineControlAtlasCache.frame(gameId, icon); if (!frame) return; sprite.spriteFrame = frame; opacity.opacity = active ? 255 : 238; fallback.active = false; };
    applyFrame(); MachineControlAtlasCache.preload(gameId, applyFrame);
    return node;
  }

  private topBar(title = 'HOME'): void {
    const player = this.ensurePlayer(); const bar = this.panel(this.page, 0, this.topY(790), 1000, 130, 30, LOBBY.panel, LOBBY.gold, 1);
    this.avatar(bar, -390, 0, player.avatar, 68); this.label(bar, title === 'HOME' ? player.nickname : title, -255, 12, 22, LOBBY.ivory, true, 270); this.label(bar, player.isGuest ? 'GUEST MODE • PLAY ONLY' : title === 'HOME' ? `LEVEL ${player.level}` : 'HARBOR DECK', -255, -16, 14, player.isGuest ? LOBBY.champagne : LOBBY.muted, false, 270);
    this.addPremiumSymbol(bar, GAME_CONFIGS[0], 'coin', 110, 6, 42, 'pulse', 255); this.balanceLabel = this.label(bar, this.format(player.credits), 260, 10, 23, LOBBY.champagne, true, 180);
    this.label(bar, player.isGuest ? 'PLAY CREDITS' : 'DEMO CREDITS', 260, -18, 13, LOBBY.muted, false, 180); this.button(bar, '+', 435, 0, 58, 58, () => this.router.go('store'), player.isGuest ? 'ghost' : 'lobby-secondary');
    if (title === 'HOME') { this.button(bar, `MAIL  ${this.bootstrap.redDots.mail()}`, 35, 0, 120, 58, () => this.router.go('mail'), 'ghost'); }
  }

  private header(title: string, back: boolean, showBalance = false): void {
    const bar = this.panel(this.page, 0, this.topY(800), 1020, 120, 26, LOBBY.panel, LOBBY.gold, 1);
    if (back) this.navigationBackButton(bar, () => this.router.route === 'game' ? this.router.reset('home') : this.router.back('home')); this.label(bar, title, 0, 0, 30, C.paleGold, true, 650);
    if (showBalance) { this.addPremiumSymbol(bar, GAME_CONFIGS[0], 'coin', 275, 0, 42, 'pulse', 230); this.balanceLabel = this.label(bar, this.format(this.bootstrap.economy.balance()), 380, 0, 21, C.white, true, 190); }
  }

  private navigationBackButton(parent: Node, action: () => void): void {
    this.button(parent, 'BACK', -395, 0, 176, 62, action, 'ghost');
  }

  private bottomNav(active: 'home' | 'store' | 'rewards' | 'rank' | 'profile'): void {
    const bar = this.panel(this.navigation, 0, -SafeAreaAdapter.visibleHeight / 2 + NAV_H / 2 + SafeAreaAdapter.safeBottom, SafeAreaAdapter.visibleWidth, NAV_H, 0, new Color(54, 14, 22, 252), LOBBY.gold, 2);
    const items: readonly [typeof active, string, Route][] = [['home', 'HOME', 'home'], ['store', 'STORE', 'store'], ['rewards', 'REWARDS', 'rewards'], ['rank', 'RANK', 'rank'], ['profile', 'PROFILE', 'profile']];
    const art: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'compass'], [GAME_CONFIGS[0], 'coin'], [GAME_CONFIGS[3], 'diamond'], [GAME_CONFIGS[0], 'wheel'], [GAME_CONFIGS[1], 'chest']];
    // A 205 px surface becomes roughly 228 px after its Astral image frame is
    // added, wider than the 216 px navigation pitch. Use a 185 px surface so
    // all five outer frames retain a clean gap while preserving touch spacing.
    items.forEach(([id, text, route], index) => { const x = -432 + index * 216; const item = this.button(bar, text, x, 0, 185, 120, () => this.router.reset(route), id === active ? 'nav-active' : 'nav'); const label = item.getChildByName('Text'); if (label) label.setPosition(0, -31); this.addPremiumSymbol(item, art[index][0], art[index][1], 0, 23, 54, id === active ? 'pulse' : 'none', id === active ? 255 : 165, index * 0.1); });
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

  private addBrandEmblem(parent: Node, x: number, y: number, size: number): Node {
    const root = new Node('FortuneHarborEmblem'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(size, size); root.setPosition(x, y); parent.addChild(root);
    const fallback = this.label(root, '◈', 0, 0, Math.round(size * 0.58), C.gold, true, size); const fallbackOpacity = fallback.node.addComponent(UIOpacity);
    const image = new Node('EmblemImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(size, size); root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    resources.load(`${BRAND_EMBLEM_PATH}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !root.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame; fallbackOpacity.opacity = 0; tween(opacity).to(0.32, { opacity: 255 }).start();
    });
    tween(root).to(1.2, { scale: new Vec3(1.06, 1.06, 1), angle: 4 }, { easing: 'sineInOut' }).to(1.35, { scale: Vec3.ONE, angle: -4 }, { easing: 'sineInOut' }).union().repeatForever().start();
    return root;
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

  private addReelEnergy(parent: Node, color: Color, width: number, height: number): void {
    const scannerWidth = Math.max(180, width - 28); const startY = Math.max(70, height * 0.38); const travel = Math.max(140, height * 0.74);
    for (let index = 0; index < 2; index += 1) { const scanner = new Node(`ReelScanner-${index}`); scanner.layer = Layers.Enum.UI_2D; scanner.addComponent(UITransform).setContentSize(scannerWidth, 12); scanner.setPosition(0, index ? startY : -startY); parent.addChild(scanner); const graphics = scanner.addComponent(Graphics); graphics.fillColor = new Color(color.r, color.g, color.b, 36); graphics.roundRect(-scannerWidth / 2, -6, scannerWidth, 12, 6); graphics.fill(); graphics.fillColor = new Color(255, 240, 174, 130); graphics.roundRect(-Math.min(90, scannerWidth * 0.12), -3, Math.min(180, scannerWidth * 0.24), 6, 3); graphics.fill(); const opacity = scanner.addComponent(UIOpacity); opacity.opacity = 20; const direction = index ? -travel : travel; tween(scanner).delay(index * 1.25).by(2.4, { position: new Vec3(0, direction, 0) }, { easing: 'sineInOut' }).by(2.4, { position: new Vec3(0, -direction, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).delay(index * 0.4).to(0.5, { opacity: 170 }).to(1.3, { opacity: 28 }).union().repeatForever().start(); }
  }

  private paintBackdrop(asset: string, bottom: Color, top: Color): void {
    const width = SafeAreaAdapter.visibleWidth; const height = SafeAreaAdapter.visibleHeight;
    const base = new Node('Backdrop'); base.layer = Layers.Enum.UI_2D; base.addComponent(UITransform).setContentSize(width, height); this.background.addChild(base); const graphics = base.addComponent(Graphics);
    const bands = 24; for (let index = 0; index < bands; index += 1) { const ratio = index / (bands - 1); graphics.fillColor = new Color(Math.round(bottom.r + (top.r - bottom.r) * ratio), Math.round(bottom.g + (top.g - bottom.g) * ratio), Math.round(bottom.b + (top.b - bottom.b) * ratio), 255); graphics.rect(-width / 2, -height / 2 + index * height / bands, width, height / bands + 2); graphics.fill(); }
    this.loadBackdrop(base, asset, width, height); this.addAmbientLights(base, top, width, height);
  }

  private loadBackdrop(parent: Node, asset: string, width: number, height: number): void {
    const paths: Record<string, string> = { boot: 'generated/common/fortune_harbor_lobby', login: 'generated/common/fortune_harbor_lobby', home: 'generated/common/fortune_harbor_lobby', store: 'generated/common/fortune_harbor_lobby', rewards: 'generated/common/fortune_harbor_lobby', rank: 'generated/common/fortune_harbor_lobby', profile: 'generated/common/fortune_harbor_lobby', wheel: 'generated/common/fortune_harbor_lobby' };
    const gamePaths: Record<string, string> = { 'game_golden-tide': 'generated/game01/cabinet', 'game_captains-chest': 'generated/game02/cabinet', 'game_pearl-parade': 'generated/game03/cabinet', 'game_lucky-lighthouse': 'generated/game04/cabinet' };
    const path = paths[asset] ?? gamePaths[asset]; if (!path) return;
    const gameBackground = asset.startsWith('game_');
    resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !parent.isValid) return;
      const frame = new SpriteFrame(); frame.texture = texture; const node = new Node('GeneratedBackdrop'); node.layer = Layers.Enum.UI_2D; const sprite = node.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const transform = node.getComponent(UITransform) as UITransform;
      const scale = gameBackground
        ? Math.max(width / texture.width, height / texture.height) * 1.008
        : Math.max(width / texture.width, height / texture.height) * 1.025;
      node.setScale(new Vec3(scale, scale, 1)); parent.addChild(node); node.setSiblingIndex(0); transform.setContentSize(texture.width, texture.height); const opacity = node.addComponent(UIOpacity); opacity.opacity = gameBackground ? 255 : 246;
      if (!gameBackground) {
        tween(node).to(7, { position: new Vec3(10, 7, 0), scale: new Vec3(scale * 1.015, scale * 1.015, 1) }, { easing: 'sineInOut' }).to(7, { position: new Vec3(-10, -7, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
        tween(opacity).to(3.8, { opacity: 255 }, { easing: 'sineInOut' }).to(4.2, { opacity: 242 }, { easing: 'sineInOut' }).union().repeatForever().start();
      }
    });
  }

  private addStarField(parent: Node, count: number): void {
    const warm = this.router?.route === 'home';
    for (let index = 0; index < count; index += 1) { const x = ((index * 317) % 1030) - 515; const y = ((index * 619) % 1800) - 900; const radius = 2 + (index % 3); const node = new Node(`Confetti-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 3, radius * 3); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); g.fillColor = warm ? (index % 4 === 0 ? LOBBY.rubyLight : index % 3 === 0 ? LOBBY.champagne : new Color(255, 246, 214, 175)) : index % 5 === 0 ? C.gold : index % 3 === 0 ? C.cyan : new Color(255, 218, 150, 155); if (index % 4 === 0) g.roundRect(-radius * 1.5, -radius * 0.55, radius * 3, radius * 1.1, radius * 0.5); else g.circle(0, 0, radius); g.fill(); if (index % 7 === 0) tween(node).to(1.2 + index % 5 * 0.2, { scale: new Vec3(1.65, 1.65, 1), angle: 90 }).to(1.4, { scale: Vec3.ONE, angle: 180 }).union().repeatForever().start(); }
  }

  private addAmbientLights(parent: Node, accent: Color, width: number, height: number): void {
    for (let index = 0; index < 3; index += 1) {
      const radius = 190 + index * 85; const node = new Node(`AmbientGlow-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(index === 1 ? width * 0.32 : -width * (0.26 + index * 0.04), -height * 0.22 + index * height * 0.22); parent.addChild(node);
      const graphics = node.addComponent(Graphics); graphics.fillColor = new Color(accent.r, accent.g, accent.b, 10 + index * 4); graphics.circle(0, 0, radius); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 105;
      const dx = index % 2 ? -90 : 110; const dy = 70 + index * 25; tween(node).by(5 + index * 1.4, { position: new Vec3(dx, dy, 0), scale: new Vec3(0.12, 0.12, 0) }, { easing: 'sineInOut' }).by(5 + index * 1.4, { position: new Vec3(-dx, -dy, 0), scale: new Vec3(-0.12, -0.12, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(2.8 + index, { opacity: 175 }).to(3.4 + index, { opacity: 90 }).union().repeatForever().start();
    }
  }

  private addLobbyIdleWealth(): void {
    // Keep the lobby alive even before a card is touched. These edge pieces
    // stay out of the reading column and use one Graphics node each, so the
    // motion is visible without turning the lobby into a particle curtain.
    const colors = [LOBBY.champagne, LOBBY.rubyLight, C.cyan];
    for (let index = 0; index < 8; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const node = new Node(`LobbyIdleToken-${index}`); node.layer = Layers.Enum.UI_2D;
      const radius = 8 + index % 3 * 2; node.addComponent(UITransform).setContentSize(radius * 3, radius * 3);
      const baseX = side * (430 + index % 3 * 24); const baseY = -620 + index * 168;
      node.setPosition(baseX, baseY); this.page.addChild(node);
      const graphics = node.addComponent(Graphics); const color = colors[index % colors.length];
      if (index % 3 === 1) {
        graphics.fillColor = new Color(color.r, color.g, color.b, 118); graphics.roundRect(-radius, -radius * 0.55, radius * 2, radius * 1.1, radius * 0.35); graphics.fill();
        graphics.strokeColor = new Color(255, 245, 207, 205); graphics.lineWidth = 1.5; graphics.roundRect(-radius, -radius * 0.55, radius * 2, radius * 1.1, radius * 0.35); graphics.stroke();
      } else {
        graphics.fillColor = new Color(color.r, color.g, color.b, 122); graphics.circle(0, 0, radius); graphics.fill();
        graphics.strokeColor = new Color(255, 245, 207, 210); graphics.lineWidth = 1.5; graphics.circle(0, 0, radius - 1); graphics.stroke();
        graphics.strokeColor = new Color(111, 57, 29, 150); graphics.lineWidth = 1; graphics.circle(0, 0, radius * 0.55); graphics.stroke();
      }
      const opacity = node.addComponent(UIOpacity); opacity.opacity = 46 + index % 3 * 18;
      const dx = side * (10 + index % 3 * 5); const dy = 22 + index % 4 * 8; const duration = 2.8 + index * 0.21;
      tween(node).delay(index * 0.13).by(duration, { position: new Vec3(dx, dy, 0), angle: side * (22 + index * 4), scale: new Vec3(0.08, 0.08, 0) }, { easing: 'sineInOut' }).by(duration, { position: new Vec3(-dx, -dy, 0), angle: -side * (22 + index * 4), scale: new Vec3(-0.08, -0.08, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
      tween(opacity).delay(index * 0.1).to(1.25, { opacity: 154 }, { easing: 'sineInOut' }).to(1.65, { opacity: 42 }, { easing: 'sineInOut' }).delay(0.8 + index * 0.08).union().repeatForever().start();
    }
  }

  private addCabinetBackdropAmbience(layout: CabinetLayout, accent: Color): void {
    // Keep the photographic cabinet locked to its controls. Ambient movement
    // lives only in the narrow scenery margins, so the whole composition stays
    // on one physical plane while the background no longer reads as a still.
    const edgeX = Math.min(505, Math.max(448, Math.max(layout.reelWidth, layout.titleWidth) * 0.64));
    for (let index = 0; index < 12; index += 1) {
      const side = index % 2 === 0 ? -1 : 1; const lane = Math.floor(index / 2); const radius = 4 + lane % 3 * 1.5;
      const mote = new Node(`CabinetBackdropMote-${index}`); mote.layer = Layers.Enum.UI_2D; mote.addComponent(UITransform).setContentSize(32, 32);
      const baseX = side * (edgeX + lane % 2 * 18); const baseY = -720 + lane * 286; mote.setPosition(baseX, baseY); this.page.addChild(mote);
      const g = mote.addComponent(Graphics);
      if (lane % 2 === 0) {
        g.fillColor = index % 4 === 0 ? C.paleGold : new Color(accent.r, accent.g, accent.b, 220);
        g.moveTo(0, radius * 2); g.lineTo(radius * 0.35, radius * 0.35); g.lineTo(radius * 2, 0); g.lineTo(radius * 0.35, -radius * 0.35); g.lineTo(0, -radius * 2); g.lineTo(-radius * 0.35, -radius * 0.35); g.lineTo(-radius * 2, 0); g.lineTo(-radius * 0.35, radius * 0.35); g.close(); g.fill();
      } else {
        g.fillColor = new Color(255, 223, 130, 145); g.circle(0, 0, radius); g.fill(); g.strokeColor = new Color(255, 250, 222, 190); g.lineWidth = 1.2; g.circle(0, 0, radius + 2); g.stroke();
      }
      const opacity = mote.addComponent(UIOpacity); opacity.opacity = 0; const delay = 0.2 + index * 0.31; const driftX = -side * (8 + lane % 3 * 4); const driftY = 30 + lane % 2 * 18;
      tween(mote).delay(delay).by(2.25 + lane * 0.12, { position: new Vec3(driftX, driftY, 0), angle: side * 120, scale: new Vec3(0.28, 0.28, 0) }, { easing: 'sineInOut' }).by(2.25 + lane * 0.12, { position: new Vec3(-driftX, -driftY, 0), angle: side * 120, scale: new Vec3(-0.28, -0.28, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
      tween(opacity).delay(delay).to(0.32, { opacity: 205 }, { easing: 'sineOut' }).to(0.9, { opacity: 42 }, { easing: 'sineInOut' }).delay(1.35 + lane * 0.08).union().repeatForever().start();
    }
    for (const side of [-1, 1]) {
      const glow = new Node(side < 0 ? 'CabinetBackdropGlowLeft' : 'CabinetBackdropGlowRight'); glow.layer = Layers.Enum.UI_2D; glow.addComponent(UITransform).setContentSize(42, 520); glow.setPosition(side * Math.min(515, edgeX + 30), -30); this.page.addChild(glow);
      const g = glow.addComponent(Graphics); g.fillColor = new Color(side < 0 ? C.paleGold.r : accent.r, side < 0 ? C.paleGold.g : accent.g, side < 0 ? C.paleGold.b : accent.b, 18); g.roundRect(-10, -250, 20, 500, 10); g.fill(); g.fillColor = new Color(255, 250, 226, 36); g.roundRect(-2, -178, 4, 356, 2); g.fill();
      const opacity = glow.addComponent(UIOpacity); opacity.opacity = 24; tween(opacity).delay(side > 0 ? 0.7 : 0).to(1.8, { opacity: 88 }, { easing: 'sineInOut' }).to(2.2, { opacity: 18 }, { easing: 'sineInOut' }).union().repeatForever().start();
    }
  }

  private addCabinetIdleAmbience(layout: CabinetLayout, accent: Color): void {
    const halo = new Node('CabinetMarqueeHalo'); halo.layer = Layers.Enum.UI_2D;
    halo.addComponent(UITransform).setContentSize(layout.titleWidth + 90, 118); halo.setPosition(0, layout.titleY); this.page.addChild(halo);
    const haloGraphics = halo.addComponent(Graphics);
    haloGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 22); haloGraphics.ellipse(0, 0, layout.titleWidth * 0.48, 45); haloGraphics.fill();
    haloGraphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 86); haloGraphics.lineWidth = 2; haloGraphics.arc(0, 0, Math.min(300, layout.titleWidth * 0.42), 0.12, 2.96, false); haloGraphics.stroke();
    const haloOpacity = halo.addComponent(UIOpacity); haloOpacity.opacity = 82;
    tween(haloOpacity).to(1.55, { opacity: 166 }, { easing: 'sineInOut' }).to(2.05, { opacity: 64 }, { easing: 'sineInOut' }).union().repeatForever().start();

    const glintCount = 10;
    for (let index = 0; index < glintCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1; const lane = Math.floor(index / 2); const node = new Node(`CabinetIdleGlint-${index}`); node.layer = Layers.Enum.UI_2D;
      const radius = 6 + lane % 3 * 2; node.addComponent(UITransform).setContentSize(radius * 4, radius * 4);
      const x = side * (layout.reelWidth * 0.52 + 30); const y = layout.reelY - layout.reelHeight * 0.42 + lane * layout.reelHeight * 0.21;
      node.setPosition(x, y); this.page.addChild(node); const graphics = node.addComponent(Graphics);
      graphics.fillColor = index % 3 === 0 ? C.paleGold : new Color(accent.r, accent.g, accent.b, 220);
      graphics.moveTo(0, radius * 1.7); graphics.lineTo(radius * 0.35, radius * 0.35); graphics.lineTo(radius * 1.7, 0); graphics.lineTo(radius * 0.35, -radius * 0.35); graphics.lineTo(0, -radius * 1.7); graphics.lineTo(-radius * 0.35, -radius * 0.35); graphics.lineTo(-radius * 1.7, 0); graphics.lineTo(-radius * 0.35, radius * 0.35); graphics.close(); graphics.fill();
      const opacity = node.addComponent(UIOpacity); opacity.opacity = 0;
      tween(node).delay(index * 0.34).by(2.2 + index * 0.12, { position: new Vec3(-side * 8, 30 + index * 4, 0), angle: side * 180, scale: new Vec3(0.32, 0.32, 0) }, { easing: 'sineInOut' }).by(2.2 + index * 0.12, { position: new Vec3(side * 8, -30 - index * 4, 0), angle: side * 180, scale: new Vec3(-0.32, -0.32, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
      tween(opacity).delay(index * 0.34).to(0.32, { opacity: 220 }).to(0.85, { opacity: 36 }).delay(1.35).union().repeatForever().start();
    }
    const trimSparkPoints = [
      new Vec3(-layout.titleWidth * 0.46, layout.titleY + 28, 0),
      new Vec3(layout.titleWidth * 0.46, layout.titleY - 16, 0),
      new Vec3(-layout.reelWidth * 0.55, layout.jackpotY + 30, 0),
      new Vec3(layout.reelWidth * 0.55, layout.jackpotY + 30, 0),
    ];
    trimSparkPoints.forEach((point, index) => {
      const sparkle = new Node(`CabinetTrimSparkle-${index}`); sparkle.layer = Layers.Enum.UI_2D; sparkle.addComponent(UITransform).setContentSize(42, 42); sparkle.setPosition(point); sparkle.setScale(new Vec3(0.62, 0.62, 1)); this.page.addChild(sparkle);
      const g = sparkle.addComponent(Graphics); g.fillColor = index % 2 ? new Color(accent.r, accent.g, accent.b, 235) : new Color(255, 249, 213, 245); g.moveTo(0, 18); g.lineTo(3.5, 3.5); g.lineTo(18, 0); g.lineTo(3.5, -3.5); g.lineTo(0, -18); g.lineTo(-3.5, -3.5); g.lineTo(-18, 0); g.lineTo(-3.5, 3.5); g.close(); g.fill(); g.fillColor = new Color(255, 255, 240, 220); g.circle(0, 0, 4.5); g.fill(); g.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 150); g.lineWidth = 1.5; g.circle(0, 0, 13); g.stroke();
      const opacity = sparkle.addComponent(UIOpacity); opacity.opacity = 0; const delay = 0.45 + index * 0.78;
      tween(opacity).delay(delay).to(0.14, { opacity: 245 }, { easing: 'sineOut' }).to(0.5, { opacity: 0 }, { easing: 'sineInOut' }).delay(2.2 + index * 0.16).union().repeatForever().start();
      tween(sparkle).delay(delay).to(0.22, { scale: new Vec3(1.08, 1.08, 1), angle: index % 2 ? 32 : -32 }, { easing: 'backOut' }).to(0.42, { scale: new Vec3(0.62, 0.62, 1), angle: index % 2 ? 82 : -82 }, { easing: 'sineInOut' }).delay(2.2 + index * 0.16).union().repeatForever().start();
    });
    for (const side of [-1, 1]) {
      const runner = new Node(side < 0 ? 'CabinetLeftLightRunner' : 'CabinetRightLightRunner'); runner.layer = Layers.Enum.UI_2D; runner.addComponent(UITransform).setContentSize(10, 78); const baseX = side * (layout.reelWidth / 2 + 24); const baseY = layout.reelY - layout.reelHeight * 0.42; runner.setPosition(baseX, baseY); this.page.addChild(runner); const g = runner.addComponent(Graphics); g.fillColor = side < 0 ? new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 165) : new Color(accent.r, accent.g, accent.b, 175); g.roundRect(-4, -39, 8, 78, 4); g.fill(); g.fillColor = new Color(255, 253, 232, 215); g.roundRect(-1.5, -27, 3, 54, 2); g.fill(); const opacity = runner.addComponent(UIOpacity); opacity.opacity = 0; const travel = layout.reelHeight * 0.84;
      tween(runner).delay(side > 0 ? 0.75 : 0.18).to(1.55, { position: new Vec3(baseX, baseY + travel, 0) }, { easing: 'sineInOut' }).call(() => runner.setPosition(baseX, baseY)).delay(1.85).union().repeatForever().start();
      tween(opacity).delay(side > 0 ? 0.75 : 0.18).to(0.18, { opacity: 205 }, { easing: 'sineOut' }).delay(0.92).to(0.32, { opacity: 0 }, { easing: 'sineInOut' }).delay(1.98).union().repeatForever().start();
    }
  }

  private addControlDeckIdle(layout: CabinetLayout, accent: Color): void {
    const left = Math.min(layout.minus.x - layout.minus.width / 2, layout.spin.x - layout.spin.width / 2); const right = Math.max(layout.turbo.x + layout.turbo.width / 2, layout.spin.x + layout.spin.width / 2); const width = Math.min(900, right - left + 54); const centerX = (left + right) / 2; const centerY = layout.spin.y;
    const deckGlow = new Node('ControlDeckBreathingGlow'); deckGlow.layer = Layers.Enum.UI_2D; deckGlow.addComponent(UITransform).setContentSize(width, Math.max(130, layout.spin.height * 1.05)); deckGlow.setPosition(centerX, centerY); this.page.addChild(deckGlow);
    const glowGraphics = deckGlow.addComponent(Graphics); glowGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 13); glowGraphics.ellipse(0, 0, width * 0.47, Math.max(45, layout.spin.height * 0.38)); glowGraphics.fill(); glowGraphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 80); glowGraphics.lineWidth = 2; glowGraphics.arc(0, 0, Math.min(width * 0.38, 330), 0.16, 2.98, false); glowGraphics.stroke(); glowGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, 68); glowGraphics.lineWidth = 1.4; glowGraphics.arc(0, -4, Math.min(width * 0.3, 270), 3.32, 6.03, false); glowGraphics.stroke();
    const deckOpacity = deckGlow.addComponent(UIOpacity); deckOpacity.opacity = 48; tween(deckOpacity).to(1.35, { opacity: 142 }, { easing: 'sineInOut' }).to(1.75, { opacity: 42 }, { easing: 'sineInOut' }).union().repeatForever().start();

    const spinHalo = new Node('SpinIdleHalo'); spinHalo.layer = Layers.Enum.UI_2D; const haloSize = layout.spin.width * 1.38; spinHalo.addComponent(UITransform).setContentSize(haloSize, haloSize); spinHalo.setPosition(layout.spin.x, layout.spin.y); this.page.addChild(spinHalo);
    const haloGraphics = spinHalo.addComponent(Graphics); haloGraphics.strokeColor = new Color(255, 226, 133, 118); haloGraphics.lineWidth = 3; haloGraphics.arc(0, 0, layout.spin.width * 0.57, 0.12, 2.62, false); haloGraphics.stroke(); haloGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, 108); haloGraphics.lineWidth = 2; haloGraphics.arc(0, 0, layout.spin.width * 0.64, 3.2, 5.86, false); haloGraphics.stroke();
    const haloOpacity = spinHalo.addComponent(UIOpacity); haloOpacity.opacity = 62; tween(spinHalo).by(7.2, { angle: 360 }).repeatForever().start(); tween(haloOpacity).to(1.2, { opacity: 168 }, { easing: 'sineInOut' }).to(1.5, { opacity: 54 }, { easing: 'sineInOut' }).union().repeatForever().start();

    for (let index = 0; index < 2; index += 1) {
      const runner = new Node(`ControlDeckLightPass-${index}`); runner.layer = Layers.Enum.UI_2D; runner.addComponent(UITransform).setContentSize(74, 18); const startX = centerX - width * 0.46; const y = centerY + (index === 0 ? layout.spin.height * 0.31 : -layout.spin.height * 0.3); runner.setPosition(startX, y); this.page.addChild(runner);
      const g = runner.addComponent(Graphics); g.fillColor = index === 0 ? new Color(255, 247, 207, 190) : new Color(accent.r, accent.g, accent.b, 176); g.roundRect(-37, -3, 74, 6, 3); g.fill(); g.fillColor = new Color(255, 255, 238, 230); g.circle(index === 0 ? 28 : -28, 0, 4.5); g.fill(); const opacity = runner.addComponent(UIOpacity); opacity.opacity = 0; const delay = 0.7 + index * 1.75;
      tween(runner).delay(delay).to(1.7, { position: new Vec3(centerX + width * 0.46, y, 0) }, { easing: 'sineInOut' }).call(() => runner.setPosition(startX, y)).delay(2.25).union().repeatForever().start();
      tween(opacity).delay(delay).to(0.2, { opacity: 188 }, { easing: 'sineOut' }).delay(1.05).to(0.34, { opacity: 0 }, { easing: 'sineInOut' }).delay(2.36).union().repeatForever().start();
    }
  }

  private addLoadingOrbit(parent: Node, x: number, y: number, color: Color, radius: number): void {
    const orbit = new Node('LoadingOrbit'); orbit.layer = Layers.Enum.UI_2D; orbit.addComponent(UITransform).setContentSize(radius * 2.4, radius * 2.4); orbit.setPosition(x, y); parent.addChild(orbit);
    const graphics = orbit.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, 130); graphics.lineWidth = 3; graphics.arc(0, 0, radius, 0.18, Math.PI * 1.42, false); graphics.stroke(); graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 82); graphics.lineWidth = 1; graphics.circle(0, 0, radius * 0.72); graphics.stroke();
    const comet = new Node('OrbitComet'); comet.layer = Layers.Enum.UI_2D; comet.addComponent(UITransform).setContentSize(24, 24); comet.setPosition(radius, 0); orbit.addChild(comet); const cometGraphics = comet.addComponent(Graphics); cometGraphics.fillColor = C.paleGold; cometGraphics.circle(0, 0, 7); cometGraphics.fill(); cometGraphics.fillColor = new Color(color.r, color.g, color.b, 70); cometGraphics.circle(0, 0, 13); cometGraphics.fill();
    tween(orbit).by(2.8, { angle: -360 }).repeatForever().start();
  }

  private animateLoadingProgress(parent: Node, barY: number, labelY: number, width: number, duration: number, statusForRatio: (ratio: number) => string, complete: () => void): void {
    const track = this.panel(parent, 0, barY, width, 28, 14, new Color(18, 68, 74, 220), C.chrome, 2, false); track.name = 'LoadingTrack'; const innerWidth = width - 24;
    const clip = new Node('LoadingFillClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(innerWidth, 14); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT; track.addChild(clip);
    const fill = this.panel(clip, -innerWidth / 2, 0, innerWidth, 14, 7, C.cyan, undefined, 0, false); fill.name = 'LoadingFill'; fill.setScale(new Vec3(0.001, 1, 1));
    const progress = this.label(parent, `${statusForRatio(0)}  0%`, 0, labelY, 26, C.white, true, width + 140); progress.node.name = 'LoadingPercent'; this.addLabelOutline(progress, C.outline, 4);
    const initialDelay = typeof document !== 'undefined' && document.getElementById('csw-preloader') ? 0.48 : 0.08;
    const update = (ratio: number): void => { if (!progress.node?.isValid) return; const safeRatio = Math.max(0, Math.min(1, ratio)); progress.string = `${statusForRatio(safeRatio)}  ${Math.round(safeRatio * 100)}%`; };
    tween(fill).delay(initialDelay).to(duration, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'quadInOut', onUpdate: () => update(fill.scale.x) }).call(() => { update(1); this.scheduleOnce(complete, 0.12); }).start();
  }

  private addCardShine(parent: Node, width: number, height: number, color: Color, delay: number, x = 0, y = 0): void {
    const clip = new Node('ShineClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height); clip.setPosition(x, y); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-width / 2, -height / 2, width, height, Math.max(4, Math.min(24, height * 0.2))); stencil.fill(); } parent.addChild(clip);
    const stripe = new Node('ShineStripe'); stripe.layer = Layers.Enum.UI_2D; stripe.addComponent(UITransform).setContentSize(180, height * 1.5); stripe.setPosition(-width * 0.72, 0); stripe.angle = -16; clip.addChild(stripe); const graphics = stripe.addComponent(Graphics); graphics.fillColor = new Color(color.r, color.g, color.b, 28); graphics.rect(-90, -height, 180, height * 2); graphics.fill();
    tween(stripe).delay(delay).to(0.9, { position: new Vec3(width * 0.72, 0, 0) }, { easing: 'quadInOut' }).call(() => stripe.setPosition(-width * 0.72, 0)).delay(4.6).union().repeatForever().start();
  }

  private addBannerCarousel(parent: Node, width: number, height: number, x = 0, y = 0): void {
    const clip = new Node('BannerCarousel'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height); clip.setPosition(x, y); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, Math.max(8, Math.min(34, height * 0.15))); stencil.fill(); } parent.addChild(clip); clip.setSiblingIndex(0);
    const paths = ['generated/common/fortune_harbor_lobby'];
    paths.forEach((path, index) => resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node(`BannerWorld-${index}`); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW;
      const scale = Math.max(width / texture.width, height / texture.height) * 1.13; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(0, -texture.height * scale * 0.04); const opacity = image.addComponent(UIOpacity); opacity.opacity = 245;
      tween(image).by(6.5, { position: new Vec3(22, 12, 0), scale: new Vec3(scale * 0.025, scale * 0.025, 0) }, { easing: 'sineInOut' }).by(6.5, { position: new Vec3(-22, -12, 0), scale: new Vec3(-scale * 0.025, -scale * 0.025, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
    }));
    const shade = new Node('BannerShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); const graphics = shade.addComponent(Graphics); graphics.fillColor = new Color(57, 14, 22, 116); graphics.rect(-width / 2, -height / 2, width, height); graphics.fill();
  }

  private addGameCardArt(parent: Node, index: number, width: number, height: number): Node {
    return this.addGameCoverArt(parent, index, width, height, false);
  }

  private addGameCoverArt(parent: Node, index: number, width: number, height: number, immersive: boolean): Node {
    const config = GAME_CONFIGS[index]; const clip = new Node(immersive ? 'LoadingCoverArt' : 'GameCardArt'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height);
    const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); const inset = immersive ? 10 : 13; const radius = immersive ? 36 : 42;
    if (stencil) { stencil.clear(); stencil.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, radius); stencil.fill(); }
    parent.addChild(clip); clip.setSiblingIndex(0);
    const image = new Node(immersive ? 'LoadingSceneImage' : 'GameCoverImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(width * 1.12, height * 1.12); image.setScale(new Vec3(1.04, 1.04, 1)); clip.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const applyFrame = (): void => { if (!clip.isValid || !image.isValid) return; const frame = GameCoverAtlasCache.frame(config.id); if (!frame) return; sprite.spriteFrame = frame; tween(opacity).to(0.32, { opacity: 255 }, { easing: 'quadOut' }).start(); };
    applyFrame(); GameCoverAtlasCache.load(applyFrame);
    const drift = immersive ? 15 : 7; const zoom = immersive ? 0.035 : 0.018; tween(image).to(5.4 + index * 0.45, { position: new Vec3(index % 2 ? -drift : drift, 9, 0), scale: new Vec3(1.04 + zoom, 1.04 + zoom, 1) }, { easing: 'sineInOut' }).to(5.8 + index * 0.4, { position: new Vec3(0, -5, 0), scale: new Vec3(1.04, 1.04, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    const shade = new Node('GameCoverShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); const shadeGraphics = shade.addComponent(Graphics); shadeGraphics.fillColor = new Color(32, 7, 16, immersive ? 58 : 42); shadeGraphics.rect(-width / 2, -height / 2, width, height); shadeGraphics.fill(); shadeGraphics.fillColor = new Color(255, 219, 120, immersive ? 15 : 10); shadeGraphics.roundRect(-width * 0.42, height * 0.23, width * 0.84, height * 0.11, 30); shadeGraphics.fill();
    this.addCardMotes(clip, immersive ? 16 : 7, this.themeColor(config.id), width * 0.86, height * 0.72);
    return clip;
  }

  private addCardMotes(parent: Node, count: number, color: Color, width: number, height: number): void {
    for (let index = 0; index < count; index += 1) { const node = new Node(`CardMote-${index}`); node.layer = Layers.Enum.UI_2D; const radius = 2 + index % 3; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(-width / 2 + ((index * 137) % Math.max(1, width)), -height / 2 + ((index * 91) % Math.max(1, height))); parent.addChild(node); const graphics = node.addComponent(Graphics); graphics.fillColor = index % 4 === 0 ? C.paleGold : new Color(color.r, color.g, color.b, 180); graphics.circle(0, 0, radius); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 45 + index % 3 * 35; tween(node).by(2.8 + index * 0.17, { position: new Vec3((index % 2 ? -1 : 1) * (20 + index * 2), 44 + index * 3, 0), scale: new Vec3(0.4, 0.4, 0) }, { easing: 'sineInOut' }).by(2.8 + index * 0.17, { position: new Vec3((index % 2 ? 1 : -1) * (20 + index * 2), -44 - index * 3, 0), scale: new Vec3(-0.4, -0.4, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(1.4 + index * 0.09, { opacity: 220 }).to(1.7 + index * 0.08, { opacity: 38 }).union().repeatForever().start(); }
  }

  private addSpinRings(parent: Node, radius: number): void {
    for (let index = 0; index < 2; index += 1) { const ring = new Node(`SpinEnergyRing-${index}`); ring.layer = Layers.Enum.UI_2D; ring.addComponent(UITransform).setContentSize(radius * 2.6, radius * 2.6); parent.addChild(ring); const graphics = ring.addComponent(Graphics); graphics.strokeColor = index === 0 ? new Color(C.gold.r, C.gold.g, C.gold.b, 155) : new Color(C.cyan.r, C.cyan.g, C.cyan.b, 125); graphics.lineWidth = index === 0 ? 4 : 2; graphics.arc(0, 0, radius + index * 14, index * 1.2, Math.PI * (1.45 + index * 0.15), false); graphics.stroke(); graphics.arc(0, 0, radius + index * 14, Math.PI * (1.65 + index * 0.1), Math.PI * (1.9 + index * 0.05), false); graphics.stroke(); const opacity = ring.addComponent(UIOpacity); opacity.opacity = 108; tween(ring).by(index === 0 ? 4.8 : 6.2, { angle: index === 0 ? -360 : 360 }).repeatForever().start(); tween(opacity).to(1.8 + index * 0.3, { opacity: 178 }).to(2.1, { opacity: 72 }).union().repeatForever().start(); }
  }

  private topY(designY: number): number { return designY + (SafeAreaAdapter.visibleHeight - H) / 2 - SafeAreaAdapter.safeTop; }

  private resolvedPanelFrameIndex(requestedIndex?: number): number {
    const route = this.router?.route; const gameRoute = route === 'game' || route === 'game-loading'; const routeIndex: Partial<Record<Route, number>> = { login: 1, register: 1, forgot: 1, home: 0, store: 3, rewards: 1, rank: 0, profile: 3, 'check-in': 3, wheel: 0, achievements: 1, mail: 3, settings: 3 };
    return requestedIndex ?? (gameRoute ? Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)) : routeIndex[route] ?? 0);
  }

  private visualSurfaceInsets(width: number, height: number, requestedIndex?: number, compact = false, requestedOuterSize?: { width: number; height: number }): SurfaceInsets {
    void requestedIndex; void requestedOuterSize;
    const inset = compact ? Math.max(5, Math.min(10, height * 0.1)) : Math.max(8, Math.min(16, Math.min(width, height) * 0.045));
    return { left: inset, right: inset, top: inset, bottom: inset };
  }

  private panel(parent: Node, x: number, y: number, width: number, height: number, radius: number, fill: Color, stroke?: Color, lineWidth = 0, imageBorder = true, frameIndex?: number, frameAlpha?: number): Node {
    const framedSurface = imageBorder && width >= 180 && height >= 52 && radius >= 10; const visualInset = framedSurface ? this.visualSurfaceInsets(width, height, frameIndex) : { left: 0, right: 0, top: 0, bottom: 0 }; const surfaceWidth = Math.max(2, width - visualInset.left - visualInset.right); const surfaceHeight = Math.max(2, height - visualInset.top - visualInset.bottom); const surfaceX = (visualInset.left - visualInset.right) / 2; const surfaceY = (visualInset.bottom - visualInset.top) / 2; const node = new Node('Panel'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); parent.addChild(node); const graphics = node.addComponent(Graphics); const circular = Math.abs(surfaceWidth - surfaceHeight) < 2 && radius >= Math.min(surfaceWidth, surfaceHeight) * 0.45; graphics.fillColor = fill; if (circular) graphics.circle(surfaceX, surfaceY, surfaceWidth / 2); else graphics.roundRect(-surfaceWidth / 2 + surfaceX, -surfaceHeight / 2 + surfaceY, surfaceWidth, surfaceHeight, Math.max(4, Math.min(radius, surfaceHeight * 0.26))); graphics.fill(); if (stroke && lineWidth && !imageBorder) { graphics.strokeColor = stroke; graphics.lineWidth = lineWidth; if (circular) graphics.circle(surfaceX, surfaceY, Math.max(2, surfaceWidth / 2 - lineWidth / 2)); else graphics.roundRect(-width / 2 + lineWidth / 2, -height / 2 + lineWidth / 2, width - lineWidth, height - lineWidth, Math.max(0, radius - lineWidth)); graphics.stroke(); }
    if (width >= 600 && height >= 120 && radius >= 18) this.addPanelTexture(node, width, height, radius, visualInset);
    if (imageBorder && width >= 180 && height >= 52 && radius >= 10) this.addPanelImageBorder(node, width, height, frameIndex, frameAlpha);
    return node;
  }

  private addPanelTexture(parent: Node, width: number, height: number, radius: number, visualInset: SurfaceInsets): void {
    const surfaceWidth = Math.max(2, width - visualInset.left - visualInset.right); const surfaceHeight = Math.max(2, height - visualInset.top - visualInset.bottom); const clip = new Node('PanelImageTexture'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(surfaceWidth, surfaceHeight); clip.setPosition((visualInset.left - visualInset.right) / 2, (visualInset.bottom - visualInset.top) / 2); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); const seal = Math.max(2, Math.min(8, radius * 0.2)); if (stencil) { stencil.clear(); stencil.roundRect(-surfaceWidth / 2 + seal, -surfaceHeight / 2 + seal, surfaceWidth - seal * 2, surfaceHeight - seal * 2, Math.max(4, Math.min(radius, surfaceHeight * 0.26) - seal)); stencil.fill(); } parent.addChild(clip); clip.setSiblingIndex(0);
    const path = 'generated/common/fortune_harbor_lobby';
    resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('PanelMaterialImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(surfaceWidth / texture.width, surfaceHeight / texture.height) * 1.08; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(-16, -8); const opacity = image.addComponent(UIOpacity); opacity.opacity = 34; tween(image).to(7.2, { position: new Vec3(18, 10, 0), scale: new Vec3(scale * 1.025, scale * 1.025, 1) }, { easing: 'sineInOut' }).to(7.2, { position: new Vec3(-16, -8, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(3.2, { opacity: 52 }).to(4, { opacity: 28 }).union().repeatForever().start(); });
  }

  private addPanelImageBorder(parent: Node, width: number, height: number, requestedIndex?: number, requestedAlpha?: number, requestedOuterSize?: { width: number; height: number; innerContent?: Node }): void {
    const index = this.resolvedPanelFrameIndex(requestedIndex); const outerWidth = requestedOuterSize?.width ?? width; const outerHeight = requestedOuterSize?.height ?? height; requestedOuterSize?.innerContent?.setPosition(0, 0);
    const border = new Node(`PanelImageBorder-${index}`); border.layer = Layers.Enum.UI_2D; border.addComponent(UITransform).setContentSize(outerWidth, outerHeight); parent.addChild(border); const g = border.addComponent(Graphics); const accent = [new Color(255, 67, 111), new Color(48, 166, 255), new Color(52, 218, 142), new Color(190, 92, 255)][Math.max(0, Math.min(3, index))]; const radius = Math.max(10, Math.min(34, Math.min(outerWidth, outerHeight) * 0.16)); const inset = Math.max(3, Math.min(9, Math.min(outerWidth, outerHeight) * 0.055)); const warm = this.router?.route === 'home';
    g.strokeColor = warm ? new Color(132, 74, 42, requestedAlpha ? Math.min(225, requestedAlpha) : 205) : new Color(127, 154, 184, requestedAlpha ? Math.min(210, requestedAlpha) : 185); g.lineWidth = Math.max(6, Math.min(10, outerHeight * 0.06)); g.roundRect(-outerWidth / 2 + inset + 1, -outerHeight / 2 + inset - 2, outerWidth - inset * 2, outerHeight - inset * 2, radius); g.stroke();
    g.strokeColor = warm ? new Color(LOBBY.gold.r, LOBBY.gold.g, LOBBY.gold.b, requestedAlpha ?? 225) : new Color(C.chrome.r, C.chrome.g, C.chrome.b, requestedAlpha ?? 210); g.lineWidth = Math.max(2, Math.min(4, outerHeight * 0.03)); g.roundRect(-outerWidth / 2 + inset, -outerHeight / 2 + inset, outerWidth - inset * 2, outerHeight - inset * 2, radius); g.stroke();
    g.strokeColor = new Color(255, 246, 206, requestedAlpha ? Math.min(190, requestedAlpha) : 155); g.lineWidth = 1.25; g.moveTo(-outerWidth / 2 + inset + radius, outerHeight / 2 - inset - 1); g.lineTo(outerWidth / 2 - inset - radius, outerHeight / 2 - inset - 1); g.stroke();
    g.strokeColor = warm ? new Color(79, 21, 27, 205) : new Color(48, 68, 94, 180); g.lineWidth = 2; g.moveTo(-outerWidth / 2 + inset + radius, -outerHeight / 2 + inset + 1); g.lineTo(outerWidth / 2 - inset - radius, -outerHeight / 2 + inset + 1); g.stroke();
    g.strokeColor = new Color(accent.r, accent.g, accent.b, requestedAlpha ? Math.min(210, requestedAlpha) : 150); g.lineWidth = Math.max(1, Math.min(3, outerHeight * 0.02)); g.roundRect(-outerWidth / 2 + inset * 1.9, -outerHeight / 2 + inset * 1.9, outerWidth - inset * 3.8, outerHeight - inset * 3.8, Math.max(6, radius - inset)); g.stroke();
    const jewelRadius = Math.max(2, Math.min(5, outerHeight * 0.04)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const jx = sx * (outerWidth / 2 - inset * 1.9); const jy = sy * (outerHeight / 2 - inset * 1.9); g.fillColor = warm ? new Color(74, 19, 26, 235) : new Color(19, 36, 58, 225); g.circle(jx, jy - 1, jewelRadius + 1.5); g.fill(); g.fillColor = accent; g.circle(jx, jy, jewelRadius); g.fill(); g.fillColor = C.white; g.circle(jx - jewelRadius * 0.28, jy + jewelRadius * 0.3, Math.max(1, jewelRadius * 0.24)); g.fill(); });
    border.setSiblingIndex(Math.max(0, parent.children.length - 1));
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

  private addLabelOutline(label: Label, color = new Color(52, 7, 19, 245), width = 2): void {
    label.outlineColor = color;
    label.outlineWidth = width;
  }

  private artTitle(parent: Node, text: string, x: number, y: number, size: number, accent: Color, width = 760): Label {
    const stage = new Node('AnimatedArtTitle'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(width, Math.max(96, size * (text.includes('\n') ? 2.8 : 1.9))); stage.setPosition(x, y); parent.addChild(stage);
    const lines = text.split('\n'); const lineHeight = size * 1.14; const blockHeight = lineHeight * (lines.length - 1);
    const palette = [this.mix(accent, C.white, 0.22), C.paleGold, this.mix(accent, C.cyan, 0.2)];
    let primaryTitle: Label | undefined; let tokenIndex = 0;
    lines.forEach((line, lineIndex) => {
      const words = line.trim().split(/\s+/).filter(Boolean); const gap = size * 0.36;
      const naturalWidths = words.map((word) => Math.max(size * 1.02, word.length * size * 0.62));
      const naturalTotal = naturalWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, words.length - 1) * gap;
      const fit = Math.min(1, (width - 28) / Math.max(1, naturalTotal)); const titleSize = Math.max(16, Math.round(size * fit));
      const scaledWidths = naturalWidths.map((value) => value * fit); const scaledGap = gap * fit;
      const total = scaledWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, words.length - 1) * scaledGap;
      let cursor = -total / 2; const lineY = blockHeight / 2 - lineIndex * lineHeight;
      words.forEach((word, wordIndex) => {
        const tokenWidth = scaledWidths[wordIndex]; const tokenX = cursor + tokenWidth / 2; const tone = palette[(tokenIndex + lineIndex) % palette.length];
        const shadow = this.label(stage, word, tokenX + 3, lineY - 4, titleSize + 2, new Color(28, 7, 13, 238), true, tokenWidth + 18); this.addLabelOutline(shadow, new Color(6, 2, 5, 252), 6);
        const glow = this.label(stage, word, tokenX, lineY, titleSize + 2, new Color(tone.r, tone.g, tone.b, 230), true, tokenWidth + 18); this.addLabelOutline(glow, new Color(accent.r, accent.g, accent.b, 180), 5); const glowOpacity = glow.node.addComponent(UIOpacity); glowOpacity.opacity = 26;
        const title = this.label(stage, word, tokenX, lineY, titleSize, tone, true, tokenWidth + 18); this.addLabelOutline(title, C.outline, 4); primaryTitle ??= title;
        const highlight = this.label(stage, word, tokenX, lineY + 1, titleSize, this.mix(tone, C.white, 0.55), true, tokenWidth + 18); this.addLabelOutline(highlight, new Color(255, 239, 183, 105), 2); const highlightOpacity = highlight.node.addComponent(UIOpacity); highlightOpacity.opacity = 0;
        const pulseDelay = 0.18 * tokenIndex;
        tween(glowOpacity).delay(pulseDelay).to(0.5, { opacity: 112 }, { easing: 'sineInOut' }).to(0.9, { opacity: 20 }, { easing: 'sineInOut' }).delay(2.25).union().repeatForever().start();
        tween(highlightOpacity).delay(0.48 + pulseDelay).to(0.22, { opacity: 150 }, { easing: 'sineOut' }).to(0.48, { opacity: 0 }, { easing: 'sineInOut' }).delay(2.94).union().repeatForever().start();
        cursor += tokenWidth + scaledGap; tokenIndex += 1;
      });
    });
    for (const side of [-1, 1]) {
      const jewel = new Node(side < 0 ? 'ArtTitleJewelLeft' : 'ArtTitleJewelRight'); jewel.layer = Layers.Enum.UI_2D; jewel.addComponent(UITransform).setContentSize(30, 30); jewel.setPosition(side * Math.min(width * 0.46, width / 2 - 12), 0); stage.addChild(jewel);
      const graphics = jewel.addComponent(Graphics); const jewelColor = side < 0 ? accent : palette[2]; graphics.fillColor = jewelColor; graphics.moveTo(0, 12); graphics.lineTo(7, 0); graphics.lineTo(0, -12); graphics.lineTo(-7, 0); graphics.close(); graphics.fill(); graphics.strokeColor = C.paleGold; graphics.lineWidth = 2; graphics.moveTo(0, 12); graphics.lineTo(7, 0); graphics.lineTo(0, -12); graphics.lineTo(-7, 0); graphics.close(); graphics.stroke();
      const jewelOpacity = jewel.addComponent(UIOpacity); jewelOpacity.opacity = 112;
      tween(jewel).delay(side > 0 ? 0.45 : 0).by(2.4, { angle: side * 180, scale: new Vec3(0.24, 0.24, 0) }, { easing: 'sineInOut' }).by(2.4, { angle: side * 180, scale: new Vec3(-0.24, -0.24, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
      tween(jewelOpacity).delay(side > 0 ? 0.45 : 0).to(0.55, { opacity: 238 }, { easing: 'sineOut' }).to(1.15, { opacity: 72 }, { easing: 'sineInOut' }).delay(1.4).union().repeatForever().start();
    }
    tween(stage).to(1.9, { scale: new Vec3(1.012, 1.012, 1) }, { easing: 'sineInOut' }).to(2.2, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    return primaryTitle ?? this.label(stage, text, 0, 0, size, C.paleGold, true, width);
  }

  private button(parent: Node, text: string, x: number, y: number, width: number, height: number, action: () => void, style: string): Node {
    const primary = style === 'primary' || style === 'spin'; const lobbySecondary = style === 'lobby-secondary'; const palette = primary ? [new Color(180, 45, 82), C.paleGold, C.white] : lobbySecondary ? [new Color(104, 26, 34), LOBBY.gold, LOBBY.ivory] : style === 'secondary' ? [new Color(126, 34, 43), C.gold, C.white] : style === 'nav-active' ? [new Color(0, 0, 0, 0), LOBBY.gold, LOBBY.champagne] : style === 'link' || style === 'nav' ? [new Color(0, 0, 0, 0), new Color(0, 0, 0, 0), style === 'nav' ? LOBBY.muted : C.gold] : [new Color(70, 17, 28), new Color(145, 78, 47), C.white];
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
    if (style === 'primary' || style === 'secondary' || lobbySecondary) { const surfaceTransform = effectSurface.getComponent(UITransform); const surfaceWidth = surfaceTransform?.contentSize.width ?? width; const surfaceHeight = surfaceTransform?.contentSize.height ?? height; this.addCardShine(effectSurface, Math.max(10, surfaceWidth), Math.max(10, surfaceHeight), style === 'primary' || lobbySecondary ? C.paleGold : C.cyan, style === 'primary' ? 1.4 : 2.2); }
    if (style === 'spin') this.addButtonEdgePulse(node, width, height, palette[1], true);
    if (style !== 'spin') this.addButtonImageFrame(node, text, style, width, height);
    const semanticArt = this.semanticButtonArt(text, style); if (semanticArt && style !== 'spin' && width >= 52 && height >= 52) { const compact = width < 180; this.addPremiumSymbol(node, semanticArt[0], semanticArt[1], compact ? 0 : -width / 2 + height * 0.62, 0, compact ? Math.min(width, height) * 0.7 : height * 0.78, 'button', compact ? 92 : 145, 0.2); }
    const interfaceIcon = semanticArt ? undefined : this.interfaceControlIcon(text, style); const interfaceIconNode = interfaceIcon ? this.addInterfaceControlIcon(node, interfaceIcon, width < 180 ? -width * 0.29 : -width / 2 + height * 0.63, 0, Math.min(height * 0.56, 42), palette[2], palette[1]) : undefined;
    if (style === 'spin') { this.addSpinRings(node, Math.min(width, height) * 0.52); this.addPremiumSymbol(node, this.selectedGame, this.selectedGame.wildId, 0, 0, Math.min(width, height) * 0.78, 'button', 112); }
    const compactControl = text === '‹' || text === '+' || text === '−'; const fontSize = compactControl ? Math.min(38, height * 0.52) : Math.min(style === 'spin' ? 34 : 25, Math.max(19, height * 0.3)); const hasLeftIcon = Boolean(interfaceIcon || (semanticArt && width >= 180)); const labelX = hasLeftIcon ? (width < 180 ? width * 0.13 : height * 0.3) : 0; const labelWidth = hasLeftIcon ? width - (width < 180 ? 50 : height * 0.92) : width - 16; const label = this.label(node, text, labelX, 0, fontSize, palette[2], true, labelWidth); label.node.name = 'Text';
    const button = node.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.94;
    node.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(10); this.vfx?.buttonBurst(node, palette[1]); if (style !== 'link' && style !== 'nav') tween(label.node).to(0.08, { scale: new Vec3(1.05, 1.05, 1) }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); if (interfaceIconNode) tween(interfaceIconNode).to(0.07, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'sineOut' }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }, this);
    node.on(Node.EventType.TOUCH_END, action, this); return node;
  }

  private interfaceControlIcon(text: string, style: string): InterfaceControlIcon | undefined {
    if (style === 'nav' || style === 'nav-active') return undefined;
    const copy = text.replace(/\n/g, ' ').toUpperCase();
    if (copy.startsWith('MAIL')) return 'mail';
    if (copy === 'BACK' || copy.includes('BACK TO') || copy.includes('RETURN TO') || copy === 'CANCEL') return 'back';
    if (copy === 'SHOW' || copy === 'HIDE') return 'eye';
    if (copy === 'CLOSE') return 'close';
    if (copy.includes('SIGN IN')) return 'key';
    if (copy.includes('RESET') || copy.includes('CLEAR') || copy.includes('DELETE')) return 'reset';
    if (copy.includes('PLAY')) return 'play';
    return undefined;
  }

  private addInterfaceControlIcon(parent: Node, icon: InterfaceControlIcon, x: number, y: number, size: number, color: Color, accent: Color): Node {
    const node = new Node(`InterfaceIcon-${icon}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(size, size); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); const s = size * 0.36;
    g.strokeColor = color; g.fillColor = color; g.lineWidth = Math.max(2.5, size * 0.075);
    if (icon === 'mail') {
      g.roundRect(-s, -s * 0.62, s * 2, s * 1.28, s * 0.16); g.stroke(); g.moveTo(-s * 0.9, s * 0.48); g.lineTo(0, -s * 0.08); g.lineTo(s * 0.9, s * 0.48); g.stroke();
      g.fillColor = accent; g.circle(s * 0.82, s * 0.68, s * 0.26); g.fill();
    } else if (icon === 'back') {
      g.moveTo(s * 0.8, 0); g.lineTo(-s * 0.78, 0); g.moveTo(-s * 0.78, 0); g.lineTo(-s * 0.18, s * 0.58); g.moveTo(-s * 0.78, 0); g.lineTo(-s * 0.18, -s * 0.58); g.stroke();
    } else if (icon === 'eye') {
      g.moveTo(-s, 0); g.quadraticCurveTo(0, s * 0.82, s, 0); g.quadraticCurveTo(0, -s * 0.82, -s, 0); g.stroke(); g.circle(0, 0, s * 0.26); g.fill();
    } else if (icon === 'close') {
      g.moveTo(-s * 0.7, -s * 0.7); g.lineTo(s * 0.7, s * 0.7); g.moveTo(-s * 0.7, s * 0.7); g.lineTo(s * 0.7, -s * 0.7); g.stroke();
    } else if (icon === 'key') {
      g.circle(-s * 0.42, s * 0.18, s * 0.46); g.stroke(); g.moveTo(-s * 0.02, -s * 0.08); g.lineTo(s, -s * 0.68); g.moveTo(s * 0.55, -s * 0.42); g.lineTo(s * 0.78, -s * 0.06); g.stroke();
    } else if (icon === 'play') {
      g.moveTo(-s * 0.55, s * 0.78); g.lineTo(s * 0.82, 0); g.lineTo(-s * 0.55, -s * 0.78); g.close(); g.fill();
    } else {
      g.arc(0, 0, s * 0.76, 0.35, 5.65, false); g.stroke(); g.moveTo(s * 0.62, s * 0.42); g.lineTo(s * 0.94, s * 0.52); g.lineTo(s * 0.82, s * 0.12); g.close(); g.fill();
    }
    return node;
  }

  private semanticButtonArt(text: string, style: string): readonly [GameConfig, string] | undefined {
    const copy = text.replace(/\n/g, ' ').toUpperCase();
    if (copy.includes('TURBO')) return [GAME_CONFIGS[3], 'beacon'];
    if (copy.includes('AUTO')) return [GAME_CONFIGS[0], 'wheel'];
    if (copy.includes('WHEEL')) return [GAME_CONFIGS[0], 'wheel'];
    if (copy.includes('CHECK-IN') || copy.includes('CLAIM') || copy.includes('COLLECT') || copy.includes('ADD DEMO')) return [GAME_CONFIGS[0], 'coin'];
    if (copy.includes('ENTER THE PARK') || copy.includes('CREATE PROFILE') || copy.includes('CHECK LOCAL PROFILE')) return [GAME_CONFIGS[3], 'diamond'];
    if (copy.includes('GUEST')) return [GAME_CONFIGS[0], 'ticket'];
    if (copy.includes('CHANGE AVATAR')) return [GAME_CONFIGS[1], 'chest'];
    if (copy === '+') return [GAME_CONFIGS[0], 'coin'];
    if (copy === 'OPEN' || copy.includes('OPEN  ›')) return [GAME_CONFIGS[1], 'chart'];
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
    const index = this.buttonFrameIndex(text, style); const frameNode = new Node(`ImageButtonFrame-${index}`); frameNode.layer = Layers.Enum.UI_2D; frameNode.addComponent(UITransform).setContentSize(width, height); parent.addChild(frameNode); const g = frameNode.addComponent(Graphics); const compact = width < 100; const alpha = compact ? 145 : style === 'nav' ? 62 : style === 'nav-active' ? 190 : style === 'link' ? 92 : style === 'ghost' ? 150 : 225; const inset = compact ? 3 : 5; const radius = Math.max(6, Math.min(24, height * 0.31)); const warm = this.router?.route === 'home' || style === 'lobby-secondary';
    const outer = warm ? new Color(132, 76, 42, Math.min(230, alpha + 30)) : new Color(103, 142, 180, Math.min(215, alpha + 30)); const inner = warm ? new Color(LOBBY.gold.r, LOBBY.gold.g, LOBBY.gold.b, alpha) : new Color(C.chrome.r, C.chrome.g, C.chrome.b, alpha); const energy = warm ? LOBBY.rubyLight : C.cyan;
    g.strokeColor = outer; g.lineWidth = compact ? 4 : 6; g.roundRect(-width / 2 + inset + 1, -height / 2 + inset - 2, width - inset * 2, height - inset * 2, radius); g.stroke();
    g.strokeColor = inner; g.lineWidth = compact ? 2 : 3; g.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, radius); g.stroke();
    g.strokeColor = new Color(255, 246, 207, Math.round(alpha * 0.62)); g.lineWidth = 1; g.moveTo(-width / 2 + inset + radius, height / 2 - inset - 1); g.lineTo(width / 2 - inset - radius, height / 2 - inset - 1); g.stroke();
    g.strokeColor = new Color(energy.r, energy.g, energy.b, Math.round(alpha * 0.58)); g.lineWidth = 1; g.roundRect(-width / 2 + inset * 1.9, -height / 2 + inset * 1.9, width - inset * 3.8, height - inset * 3.8, Math.max(4, radius - inset)); g.stroke(); frameNode.setSiblingIndex(Math.max(0, parent.children.length - 1));
  }

  private addButtonEdgePulse(parent: Node, width: number, height: number, color: Color, circular = false): void {
    const edge = new Node('ButtonEnergyEdge'); edge.layer = Layers.Enum.UI_2D; edge.addComponent(UITransform).setContentSize(width, height); edge.setPosition(0, 0); parent.addChild(edge); const graphics = edge.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, circular ? 112 : 62); graphics.lineWidth = circular ? 3 : 1.5; const inset = circular ? 3 : 2; if (circular) graphics.circle(0, 0, Math.max(2, Math.min(width, height) / 2 - inset)); else graphics.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, Math.min(24, Math.max(4, height * 0.3 - inset))); graphics.stroke(); const opacity = edge.addComponent(UIOpacity); opacity.opacity = circular ? 112 : 34; tween(opacity).to(circular ? 1.15 : 1.7, { opacity: circular ? 182 : 82 }, { easing: 'sineInOut' }).to(circular ? 1.35 : 1.9, { opacity: circular ? 70 : 28 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private input(parent: Node, placeholder: string, value: string, x: number, y: number, password = false): EditBox {
    const shellWidth = 650; const shellHeight = 88; const shell = this.panel(parent, x, y, shellWidth, shellHeight, 18, C.glassRaised, new Color(118, 165, 204), 2);
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
    const colors = [C.cyan, C.gold, C.violet, C.green]; const slot = index % GAME_CONFIGS.length; const node = this.panel(parent, x, y, size, size, size / 2, new Color(17, 40, 68), colors[index % colors.length], 4); const clip = new Node('AvatarCharacterClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(size - 8, size - 8); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; node.addChild(clip); this.addCharacter(clip, slot, 0, -size * 0.08, size * 0.92, size * 1.12, 255, slot * 0.12); return node;
  }

  private progress(parent: Node, x: number, y: number, width: number, ratio: number): void {
    const bar = this.panel(parent, x, y, width, 22, 11, new Color(13, 31, 57), new Color(109, 151, 190), 1); const fill = this.panel(bar, -width / 2 + width * ratio / 2, 0, Math.max(4, width * ratio), 12, 6, C.cyan); fill.name = 'ProgressFill';
  }

  private modal(width: number, height: number): Node {
    const mask = this.panel(this.overlay, 0, 0, SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight, 0, new Color(3, 12, 28, 218)); const card = this.panel(mask, 0, 0, Math.min(width, SafeAreaAdapter.visibleWidth - 100), Math.min(height, SafeAreaAdapter.visibleHeight - 160), 38, C.panel, C.chrome, 2); card.setScale(new Vec3(0.85, 0.85, 1)); tween(card).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); return card;
  }

  private closeModal(card: Node): void {
    const mask = card.parent; if (!mask) return;
    this.stopNodeTweens(mask);
    mask.removeFromParent();
    mask.destroy();
  }

  private rewardModal(title: string, body: string, color: Color): void {
    this.audio.play('reward'); const modal = this.modal(880, 780); const stage = new Node('FeatureStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(790, 650); modal.addChild(stage); const g = stage.addComponent(Graphics);
    g.strokeColor = new Color(255, 220, 133, 235); g.lineWidth = 5; g.roundRect(-385, -315, 770, 630, 42); g.stroke(); g.strokeColor = new Color(color.r, color.g, color.b, 225); g.lineWidth = 2; g.roundRect(-370, -300, 740, 600, 34); g.stroke();
    g.fillColor = new Color(color.r, color.g, color.b, 30); g.roundRect(-330, 55, 660, 190, 42); g.fill();
    this.addCardMotes(modal, 24, color, 760, 620); this.addPremiumSymbol(modal, this.selectedGame, this.selectedGame.wildId, -285, 205, 150, 'pulse', 245); this.addPremiumSymbol(modal, this.selectedGame, this.selectedGame.scatterId ?? this.selectedGame.bonusId ?? this.selectedGame.wildId, 285, 205, 150, 'orbit', 235, 0.2);
    this.label(modal, 'FEATURE COMPLETE', 0, 260, 20, new Color(color.r, color.g, color.b), true); this.artTitle(modal, title, 0, 150, 47, color, 700); this.label(modal, body, 0, -25, 27, C.white, true, 700); this.button(modal, 'COLLECT', 0, -265, 400, 76, () => this.closeModal(modal), 'primary');
  }

  private showResetConfirmation(): void {
    const modal = this.modal(820, 620); this.label(modal, 'CLEAR LOCAL DATA', 0, 205, 38, C.red, true); this.label(modal, 'Type RESET to permanently remove every local demo profile.', 0, 120, 20, C.white, false, 680);
    const confirmation = this.input(modal, 'Type RESET', '', 0, 15);
    this.button(modal, 'CONFIRM RESET', 0, -115, 440, 76, () => { if (!this.bootstrap.save.clearConfirmed(confirmation.string)) { this.toast('Type RESET exactly to continue', C.red); return; } this.closeModal(modal); this.router.reset('login'); }, 'ghost');
    this.button(modal, 'CANCEL', 0, -215, 260, 52, () => this.closeModal(modal), 'link');
  }

  private toast(message: string, color: Color): void {
    const box = this.panel(this.toastLayer, 0, -700, 820, 90, 28, new Color(12, 29, 54, 250), color, 2); this.label(box, message, 0, 0, 21, C.white, true, 760); box.setScale(new Vec3(0.9, 0.9, 1)); tween(box).to(0.18, { position: new Vec3(0, -620, 0), scale: Vec3.ONE }, { easing: 'backOut' }).delay(2).to(0.25, { position: new Vec3(0, -700, 0), scale: new Vec3(0.9, 0.9, 1) }).call(() => box.destroy()).start();
  }

  private animateBalance(from: number, to: number, duration: number): void {
    const counter = { value: from };
    if (this.balanceLabel) this.balanceLabel.string = this.format(from);
    tween(counter).to(duration, { value: to }, { easing: 'cubicOut', onUpdate: () => {
      if (this.balanceLabel?.node?.isValid) this.balanceLabel.string = this.format(counter.value);
    } }).call(() => { if (this.balanceLabel?.node?.isValid) this.balanceLabel.string = this.format(to); }).start();
  }

  private refreshBalance(): void { if (this.balanceLabel) this.balanceLabel.string = this.format(this.bootstrap.economy.balance()); }
  private refreshBet(): void { if (this.betLabel) this.betLabel.string = this.format(this.bet()); }
  private bet(): number { return this.selectedGame.bets[Math.min(this.betIndex, this.selectedGame.bets.length - 1)]; }
  private ensurePlayer() { return this.bootstrap.profile.current()!; }
  private format(value: number): string { return Math.round(value).toLocaleString('en-US'); }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private applyPlayerPreferences(): void { const settings = this.bootstrap.profile.current()?.settings; if (!settings) return; this.audio?.setMusic(settings.music); this.audio?.setEffects(settings.sound); this.audio?.setVibration(settings.vibration); this.vfx?.setQuality(settings.quality); }
  private localize(text: string): string { return this.bootstrap.profile.current()?.settings.language === 'zh-CN' ? ZH[text] ?? text : text; }
  private mix(from: Color, to: Color, amount: number): Color { const ratio = Math.max(0, Math.min(1, amount)); return new Color(Math.round(from.r + (to.r - from.r) * ratio), Math.round(from.g + (to.g - from.g) * ratio), Math.round(from.b + (to.b - from.b) * ratio), Math.round(from.a + (to.a - from.a) * ratio)); }
  private themeColor(id: GameId): Color { return id === 'golden-tide' ? new Color(229, 98, 78) : id === 'captains-chest' ? new Color(14, 111, 112) : id === 'pearl-parade' ? new Color(230, 142, 139) : new Color(255, 190, 62); }
  private selectQueryGame(query: URLSearchParams): void { const id = query.get('game') as GameId | null; if (id && GAME_CONFIG_BY_ID[id]) this.selectedGame = GAME_CONFIG_BY_ID[id]; }
  private forceFromQuery(force: string | null): ForceResult | undefined { if (force === 'win') return { symbolId: this.selectedGame.symbols.find((s) => s.tier === 'high')?.id, count: 5, wild: true }; if (force === 'free') return { scatterCount: 5 }; if (force === 'hold') return { holdAndSpin: true }; if (force === 'big' || force === 'mega' || force === 'epic') return { winTier: force }; return undefined; }
}

function okStyle(ok: boolean): string { return ok ? 'secondary' : 'ghost'; }
