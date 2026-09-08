import {
  _decorator, Button, Color, Component, EditBox, Graphics, Label, Layers, Mask, Node, profiler, resources, sys,
  Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec3,
} from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { complianceCurrent, configuredPublicUrl, PRIVACY_VERSION, RELEASE_CONFIG, TERMS_VERSION } from '../core/ReleaseConfig';
import { SceneRouter, type Route } from '../core/SceneRouter';
import { SecureRNG } from '../core/SecureRNG';
import { GameStateMachine } from '../core/GameStateMachine';
import { GAME_CONFIG_BY_ID, GAME_CONFIGS } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import type { ForceResult, GameConfig, GameId, SpinResult } from '../math/types';
import { STORE_PRODUCTS, type CoinProduct } from '../services/StoreService';
import { ACHIEVEMENTS } from '../services/AchievementService';
import { INBOX_MESSAGES } from '../services/MailService';
import { AudioManager } from '../audio/AudioManager';
import { VFXManager } from '../vfx/VFXManager';
import { SafeAreaAdapter } from './SafeAreaAdapter';
import { ReelEngine } from '../reels/ReelEngine';
import { SymbolAtlasCache, symbolAtlasForGame } from '../reels/SymbolAtlasCache';
import { AutoSpinController } from '../features/AutoSpinController';
import { MachineControlAtlasCache, type MachineControlIcon } from './MachineControlAtlasCache';
import { GameCoverAtlasCache } from './GameCoverAtlasCache';
import { LEGAL_PAGE_SUBTITLES, LEGAL_PAGE_TITLES, LEGAL_SECTIONS, type LegalPage } from './LegalContent';

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
  readonly topWinY: number; readonly topWinSurface: 'light' | 'dark'; readonly topWinHeight: number;
  readonly topWinTitleTone: Color; readonly topWinGlowTone: Color; readonly topWinValueTone: Color;
  readonly creditsY: number; readonly creditsWidth: number; readonly creditsSurface: 'light' | 'dark';
  readonly winX: number; readonly winY: number; readonly winWidth: number;
  readonly betX: number; readonly betY: number; readonly betWidth: number; readonly betTone: Color;
};
const CARD_HERO_SYMBOLS = ['parade-chest', 'jewel-peony', 'lantern-chest', 'prize-wheel'] as const;
const CHARACTER_PATHS = [
  'generated/common/host_mei', 'generated/common/host_mei',
  'generated/common/host_mei', 'generated/common/host_mei',
] as const;
const AVATAR_PATHS = [
  'generated/common/avatars/player_elodie', 'generated/common/avatars/player_kai', 'generated/common/avatars/player_nia',
  'generated/common/avatars/player_mateo', 'generated/common/avatars/player_meilin', 'generated/common/avatars/player_marina',
  'generated/common/avatars/player_astral', 'generated/common/avatars/player_cosmic', 'generated/common/avatars/player_kai',
  'generated/common/avatars/player_nia', 'generated/common/avatars/player_mateo', 'generated/common/avatars/player_meilin',
] as const;
const BRAND_EMBLEM_PATH = 'generated/common/fortune_bloom_emblem';
const TITLE_LOGO_PATHS: Readonly<Record<GameId, string>> = {
  'golden-parade': 'generated/common/title-logos/golden_parade_title_f6',
  'blossom-fortune': 'generated/common/title-logos/blossom_fortune_title_f6',
  'lantern-treasure': 'generated/common/title-logos/lantern_treasure_title_f6',
  'treasure-wheel': 'generated/common/title-logos/treasure_wheel_title_f6',
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
  'golden-parade': {
    // Source aperture: x 210..815, y 397..738 in the 1024x1536 cabinet.
    // The cabinet is presented at 1.25x, so every live element lands in the
    // photographed metal opening instead of following an approximate grid.
    reelX: 0, reelY: 251, reelWidth: 744, reelHeight: 418,
    titleY: 714, titleWidth: 650, titleSize: 46, paylineY: 525, darkMarquee: false,
    jackpotY: 596, jackpotWidth: 570, featureY: -650, featureWidth: 610,
    readoutY: -40, readoutX: 0, readoutWidth: 330, readoutHeight: 64, readoutFontSize: 21,
    turbo: { x: 379, y: -162, width: 88, height: 90 }, spin: { x: 0, y: -162, width: 146, height: 146 }, auto: { x: 229, y: -162, width: 88, height: 90 },
    minus: { x: -376, y: -162, width: 88, height: 90 }, plus: { x: -224, y: -162, width: 88, height: 90 },
    sound: { x: 486, y: 866, width: 94, height: 94 }, rules: { x: 486, y: 744, width: 94, height: 94 }, home: { x: -486, y: 866, width: 94, height: 94 },
  },
  'blossom-fortune': {
    // Tall conservatory glass and a four-petal control deck. The staggered
    // controls are intentional—the machine no longer shares the five-key bar.
    reelX: 0, reelY: 176, reelWidth: 616, reelHeight: 424,
    titleY: 610, titleWidth: 650, titleSize: 45, paylineY: 444, darkMarquee: false,
    jackpotY: 518, jackpotWidth: 560, featureY: -615, featureWidth: 610,
    readoutY: -102, readoutX: 0, readoutWidth: 332, readoutHeight: 64, readoutFontSize: 21,
    turbo: { x: 255, y: -350, width: 88, height: 88 }, spin: { x: 0, y: -296, width: 154, height: 154 }, auto: { x: 255, y: -238, width: 88, height: 88 },
    minus: { x: -257, y: -238, width: 88, height: 88 }, plus: { x: -257, y: -350, width: 88, height: 88 },
    sound: { x: 486, y: 870, width: 94, height: 94 }, rules: { x: 486, y: 748, width: 94, height: 94 }, home: { x: -486, y: 870, width: 94, height: 94 },
  },
  'lantern-treasure': {
    reelX: 0, reelY: 151, reelWidth: 748, reelHeight: 406,
    titleY: 568, titleWidth: 720, titleSize: 45, paylineY: 405, darkMarquee: false,
    jackpotY: 482, jackpotWidth: 610, featureY: -650, featureWidth: 650,
    readoutY: 0, readoutX: 0, readoutWidth: 326, readoutHeight: 64, readoutFontSize: 21,
    turbo: { x: 423, y: -281, width: 88, height: 90 }, spin: { x: 0, y: -281, width: 148, height: 148 }, auto: { x: 255, y: -281, width: 88, height: 90 },
    minus: { x: -417, y: -281, width: 88, height: 90 }, plus: { x: -251, y: -281, width: 88, height: 90 },
    sound: { x: 486, y: 866, width: 94, height: 94 }, rules: { x: 486, y: 744, width: 94, height: 94 }, home: { x: -486, y: 866, width: 94, height: 94 },
  },
  'treasure-wheel': {
    // Compact classic reels sit above a separate, physical prize wheel. This
    // intentionally uses a different vertical hierarchy from the video slots.
    reelX: 0, reelY: 189, reelWidth: 472, reelHeight: 374,
    titleY: 706, titleWidth: 690, titleSize: 46, paylineY: 439, darkMarquee: false,
    jackpotY: 566, jackpotWidth: 560, featureY: -765, featureWidth: 560,
    readoutY: 36, readoutX: 0, readoutWidth: 312, readoutHeight: 64, readoutFontSize: 21,
    turbo: { x: 311, y: -170, width: 82, height: 86 }, spin: { x: 0, y: -170, width: 142, height: 142 }, auto: { x: 181, y: -170, width: 82, height: 86 },
    minus: { x: -304, y: -170, width: 82, height: 86 }, plus: { x: -178, y: -170, width: 82, height: 86 },
    sound: { x: 486, y: 858, width: 94, height: 94 }, rules: { x: 486, y: 736, width: 94, height: 94 }, home: { x: -486, y: 858, width: 94, height: 94 },
  },
};
const CABINET_READOUT_LAYOUTS: Readonly<Record<GameId, CabinetReadoutLayout>> = {
  // S05/S06 establish the cabinet grammar: the shared balance belongs in the
  // illuminated rail above the reels, TOP WIN sits directly under the logo,
  // while WIN and BET retain their own lower readouts. Each machine keeps an
  // independently measured baseline because the generated metalwork differs.
  'golden-parade': { topWinY: 596, topWinSurface: 'dark', topWinHeight: 50, topWinTitleTone: new Color(255, 221, 124), topWinGlowTone: new Color(255, 161, 106), topWinValueTone: new Color(255, 249, 221), creditsY: 525, creditsWidth: 550, creditsSurface: 'light', winX: 0, winY: -43, winWidth: 286, betX: 0, betY: -274, betWidth: 274, betTone: new Color(144, 73, 44) },
  'blossom-fortune': { topWinY: 518, topWinSurface: 'dark', topWinHeight: 50, topWinTitleTone: new Color(162, 247, 196), topWinGlowTone: new Color(73, 180, 128), topWinValueTone: new Color(255, 245, 188), creditsY: 444, creditsWidth: 610, creditsSurface: 'light', winX: 0, winY: -116, winWidth: 452, betX: 0, betY: -430, betWidth: 200, betTone: new Color(43, 124, 86) },
  'lantern-treasure': { topWinY: 482, topWinSurface: 'dark', topWinHeight: 50, topWinTitleTone: new Color(255, 192, 136), topWinGlowTone: new Color(224, 92, 74), topWinValueTone: new Color(255, 247, 209), creditsY: 405, creditsWidth: 690, creditsSurface: 'light', winX: 0, winY: -140, winWidth: 332, betX: 0, betY: -410, betWidth: 210, betTone: new Color(151, 55, 48) },
  'treasure-wheel': { topWinY: 566, topWinSurface: 'dark', topWinHeight: 50, topWinTitleTone: new Color(151, 224, 255), topWinGlowTone: new Color(245, 180, 74), topWinValueTone: new Color(255, 247, 211), creditsY: 439, creditsWidth: 540, creditsSurface: 'light', winX: -236, winY: -66, winWidth: 176, betX: 236, betY: -66, betWidth: 176, betTone: new Color(57, 117, 145) },
};
// The four generated trims do not share the same inner window. Treating them
// as symmetric nine-slices stretches the crest into the panel, so each trim
// keeps its measured optical insets.
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
  ink: new Color(66, 27, 43), navy: new Color(34, 79, 82), panel: new Color(54, 24, 42, 240),
  panel2: new Color(71, 31, 50, 246), gold: new Color(232, 197, 107), paleGold: new Color(255, 241, 210),
  cyan: new Color(126, 200, 200), violet: new Color(239, 155, 115), white: new Color(255, 248, 229),
  muted: new Color(226, 207, 180), red: new Color(224, 95, 95), green: new Color(79, 190, 150),
  glass: new Color(52, 24, 40, 240), glassRaised: new Color(72, 34, 52, 246),
  chrome: new Color(255, 229, 166), outline: new Color(45, 17, 31, 250), coral: new Color(239, 155, 115),
};
const LOBBY = {
  ink: new Color(66, 27, 43), panel: new Color(56, 25, 43, 234), panelRaised: new Color(75, 36, 55, 244),
  ruby: new Color(42, 128, 131), rubyLight: new Color(126, 200, 200), gold: new Color(232, 197, 107),
  champagne: new Color(255, 232, 177), ivory: new Color(255, 248, 229), muted: new Color(226, 207, 180),
};
const ZH: Readonly<Record<string, string>> = {
  HOME: '首页', STORE: '商店', REWARDS: '奖励', RANK: '排行', PROFILE: '我的', SETTINGS: '设置', ACHIEVEMENTS: '成就', INBOX: '邮箱',
  'ACCOUNT SIGN IN': '账号登录', 'ENTER THE PARK': '进入游戏', 'FORGOT PASSWORD': '忘记密码', 'CONTINUE AS GUEST': '游客登录',
  'CREATE ACCOUNT': '创建账号', 'CREATE PROFILE': '创建资料', 'BACK TO SIGN IN': '返回登录', 'RETURN TO LOGIN': '返回登录',
  'DAILY CHECK-IN': '每日签到', 'LUCKY WHEEL': '幸运转盘', 'CLAIM TODAY': '领取今日奖励', CLAIM: '领取', CLAIMED: '已领取', LOCKED: '未解锁', COLLECT: '领取',
  'VIRTUAL COINS': '虚拟金币', BUY: '购买', 'SYNC PURCHASES': '同步购买', 'SIGN IN': '去登录', 'REWARD CENTER': '奖励中心', 'FORTUNE RANK': '幸运排行',
  MUSIC: '音乐', 'SOUND EFFECTS': '音效', VIBRATION: '震动', QUALITY: '画质', LANGUAGE: '语言', ENGLISH: '英文', '简体中文': '简体中文',
  ON: '开', OFF: '关', LOW: '低', MEDIUM: '中', HIGH: '高', 'CLEAR LOCAL DATA': '清除本地数据', 'RESET…': '重置…',
  SPIN: '旋转', PAYTABLE: '赔付表', RULES: '规则', CLOSE: '关闭', 'LOG OUT': '退出登录', 'CHANGE AVATAR': '更换头像', 'MARK READ': '标为已读', 'DELETE READ': '删除已读',
};

const productionApiBaseUrl = (): string | undefined => {
  const localBrowser = typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
  return !localBrowser && configuredPublicUrl(RELEASE_CONFIG.apiBaseUrl) ? RELEASE_CONFIG.apiBaseUrl : undefined;
};

@ccclass('SkylightApp')
export class SkylightApp extends Component {
  private readonly bootstrap = new GameBootstrap(undefined, false, productionApiBaseUrl());
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
  private autoStatusLamp?: Node;
  private turboStatusLamp?: Node;
  private soundStatusLamp?: Node;
  private spinning?: SpinResult;
  private queuedSpin = false;
  private autoStartPending = false;
  private readonly spinIdleWaiters: Array<() => void> = [];
  private skipWinPresentation?: () => void;
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
  private readonly registerDraft = { username: '', nickname: '', password: '', confirmPassword: '' };
  private loadingGeneration = 0;
  private rankRequestGeneration = 0;
  private readonly purchaseLocks = new Set<string>();
  private spinRequestPending = false;

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
    this.debugMode = localDebugHost && query.get('debug') === '1'; this.bootstrap.store.setDebugGrants(this.debugMode); if (this.debugMode && query.get('stats') === '1') profiler.showStats(); else profiler.hideStats();
    if (this.debugMode && query.get('screen') && !complianceCurrent(this.bootstrap.save.read().compliance)) this.bootstrap.save.acceptCompliance(TERMS_VERSION, PRIVACY_VERSION);
    this.selectQueryGame(query);
    this.forcedResult = this.debugMode ? this.forceFromQuery(query.get('force')) : undefined;
    const target = query.get('screen') as Route | null; const publicRoute = target === 'age-gate' || target === 'login' || target === 'register' || target === 'forgot' || target === 'privacy' || target === 'terms' || target === 'support';
    if (target && (this.debugMode || publicRoute)) this.router.reset(target); else this.showBoot();
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('csw-app-ready'));
  }

  protected onDestroy(): void { this.autoStartPending = false; this.autoSpin.cancel(); this.releaseSpinIdleWaiters(); this.node.off('csw-layout-changed', this.onLayoutChanged, this); }

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
    this.paintBackdrop('boot', C.ink, new Color(214, 132, 52));
    this.addStarField(this.page, 54);
    this.addLoadingOrbit(this.page, 0, 420, C.cyan, 150);
    this.addBrandEmblem(this.page, 0, 420, 230);
    this.label(this.page, 'FORTUNE BLOOM', 0, 205, 67, C.paleGold, true);
    this.label(this.page, 'CARNIVAL', 0, 118, 58, C.white, true);
    this.label(this.page, 'FOUR WAYS TO CELEBRATE  •  ONE JOYFUL WORLD', 0, 30, 22, C.muted);
    this.animateLoadingProgress(this.page, -430, -385, 680, 1.7, () => 'OPENING THE FORTUNE GARDEN', () => {
      if (generation !== this.loadingGeneration) return;
      if (!complianceCurrent(this.bootstrap.save.read().compliance)) { this.router.reset('age-gate'); return; }
      void this.bootstrap.resumeSession().then((resumed) => { if (generation !== this.loadingGeneration) return; this.router.reset(resumed ? 'home' : 'login'); });
    });
    this.label(this.page, 'VIRTUAL COINS HAVE NO CASH VALUE', 0, -770, 20, C.muted);
  }

  private render(route: Route): void {
    const publicRoute = route === 'boot' || route === 'age-gate' || route === 'login' || route === 'register' || route === 'forgot' || route === 'privacy' || route === 'terms' || route === 'support'; const player = this.bootstrap.profile.current();
    if (!publicRoute && !player) { if (this.debugMode) void this.bootstrap.auth.guestLogin().then(() => this.router.reset(route)); else this.router.reset('login'); return; }
    if (route !== 'game' && route !== 'game-loading') { this.autoStartPending = false; if (this.autoSpin.active) this.autoSpin.cancel(); }
    this.applyPlayerPreferences(); this.clearAll();
    if (route === 'boot') this.showBoot();
    else if (route === 'age-gate') this.showAgeGate();
    else if (route === 'login') this.showLogin();
    else if (route === 'register') this.showRegister();
    else if (route === 'forgot') this.showForgot();
    else if (route === 'privacy') this.showLegal('privacy');
    else if (route === 'terms') this.showLegal('terms');
    else if (route === 'support') this.showLegal('support');
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
    this.balanceLabel = undefined; this.reelEngine = undefined; this.winLabel = undefined; this.betLabel = undefined; this.spinButtonLabel = undefined; this.autoStatusLamp = undefined; this.turboStatusLamp = undefined; this.soundStatusLamp = undefined;
  }

  private stopNodeTweens(node: Node): void {
    Tween.stopAllByTarget(node);
    const opacity = node.getComponent(UIOpacity); if (opacity) Tween.stopAllByTarget(opacity);
    for (const child of node.children) this.stopNodeTweens(child);
  }

  private onLayoutChanged(): void { if (this.router && !this.spinning) this.render(this.router.route); }

  private showAgeGate(): void {
    this.paintBackdrop('login', C.ink, new Color(192, 88, 50)); this.addStarField(this.page, 36); this.addLobbyIdleWealth();
    this.addBrandEmblem(this.page, 0, 650, 178); this.artTitle(this.page, 'WELCOME TO FORTUNE BLOOM', 0, 500, 47, C.gold, 860);
    const card = this.panel(this.page, 0, -50, 860, 980, 40, new Color(69, 24, 25, 244), C.gold, 3);
    this.addCardMotes(card, 22, C.paleGold, 800, 910); this.addPremiumSymbol(card, GAME_CONFIGS[0], 'coin-fan', -330, 380, 80, 'pulse', 235); this.addPremiumSymbol(card, GAME_CONFIGS[2], 'lantern-chest', 330, 380, 80, 'pulse', 235, 0.2);
    this.label(card, 'AGE & PLAY NOTICE', 0, 378, 38, C.paleGold, true, 680);
    this.label(card, 'SIMULATED CASINO ENTERTAINMENT', 0, 318, 21, C.cyan, true, 700);
    const notices: readonly [string, string][] = [
      ['ELIGIBILITY', 'You meet the minimum age required for\nsimulated gambling in your region.'],
      ['VIRTUAL COINS', 'Coins have no cash value and cannot be withdrawn,\ntransferred or exchanged for prizes.'],
      ['APPLE PURCHASES', 'Optional consumable coin packs are processed\nby Apple In-App Purchase.'],
      ['SAFER PLAY', 'Take regular breaks. Rules, purchases and account\ncontrols remain available at any time.'],
    ];
    notices.forEach(([title, body], index) => { const y = 210 - index * 118; this.label(card, title, -280, y + 18, 19, C.paleGold, true, 210); this.label(card, body, 90, y - 2, 18, C.white, false, 520); });
    this.button(card, 'TERMS', -190, -292, 300, 58, () => this.router.go('terms'), 'ghost'); this.button(card, 'PRIVACY', 190, -292, 300, 58, () => this.router.go('privacy'), 'ghost');
    this.button(card, 'I AM ELIGIBLE • CONTINUE', 0, -386, 650, 86, () => { this.bootstrap.save.acceptCompliance(TERMS_VERSION, PRIVACY_VERSION); this.router.reset('login'); }, 'primary');
    this.button(card, 'I AM NOT ELIGIBLE', 0, -458, 330, 46, () => this.toast('This game is unavailable if you do not meet the age requirement.', C.red), 'link');
  }

  private showLegal(kind: LegalPage): void {
    this.paintBackdrop(kind === 'support' ? 'profile' : 'login', C.ink, kind === 'privacy' ? new Color(64, 142, 112) : kind === 'terms' ? new Color(198, 91, 52) : new Color(202, 144, 55)); this.addStarField(this.page, 20); this.header(LEGAL_PAGE_TITLES[kind], true);
    this.addLobbyPageHero(LEGAL_PAGE_TITLES[kind], LEGAL_PAGE_SUBTITLES[kind], kind === 'privacy' ? C.cyan : C.gold, kind === 'support' ? GAME_CONFIGS[2] : GAME_CONFIGS[0], kind === 'support' ? 'lantern-chest' : 'coin-fan');
    LEGAL_SECTIONS[kind].forEach((section, index) => {
      const y = 445 - index * 205; const accent = index % 2 ? C.coral : kind === 'privacy' ? C.cyan : C.gold; const card = this.panel(this.page, 0, y, 900, 172, 24, C.panel2, accent, 1, true, index % 4, 190);
      this.label(card, section.title, -274, 34, 20, C.paleGold, true, 270); this.label(card, section.body, 84, -3, 18, C.white, false, 650);
    });
    const url = kind === 'privacy' ? RELEASE_CONFIG.privacyUrl : kind === 'terms' ? RELEASE_CONFIG.termsUrl : RELEASE_CONFIG.supportUrl;
    const online = configuredPublicUrl(url);
    this.button(this.page, online ? 'OPEN FULL ONLINE COPY' : 'PUBLIC URL REQUIRED BEFORE RELEASE', 0, -678, 590, 58, () => { if (online) sys.openURL(url); else this.toast('Configure the public URL in ReleaseConfig.ts', C.red); }, online ? 'secondary' : 'ghost');
  }

  private showLogin(): void {
    this.paintBackdrop('login', C.ink, new Color(173, 94, 48)); this.addLoginAtmosphere();
    // One hostess and a floating treasury vignette frame the form. Repeating
    // the same portrait on both sides made the welcome screen feel synthetic.
    this.addCharacter(this.page, 0, 418, 284, 340, 540, 74, 0.32);
    this.addBrandEmblem(this.page, 0, 660, 150);
    this.label(this.page, 'FORTUNE BLOOM', 0, 535, 50, C.paleGold, true);
    this.label(this.page, 'YOUR JOYFUL CASINO GARDEN AWAITS', 0, 455, 27, C.white, true);
    const card = this.panel(this.page, 0, -15, 840, 1010, 38, new Color(69, 24, 25, 238), C.gold, 2);
    this.addCardShine(card, 790, 960, LOBBY.champagne, 0.2);
    this.label(card, 'ACCOUNT SIGN IN', 0, 418, 42, C.paleGold, true);
    this.label(card, 'Secure player account • one balance across four fair games', 0, 370, 22, C.muted, true, 700);
    this.userNameInput = this.input(card, 'Player ID', '', 0, 282, false);
    this.passwordInput = this.input(card, 'Password', '', 0, 157, true);
    let remember!: Node; remember = this.button(card, '✓  REMEMBER ME', -190, 70, 330, 56, () => { this.rememberLogin = !this.rememberLogin; const copy = remember.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = `${this.rememberLogin ? '✓' : '○'}  REMEMBER ME`; }, 'ghost');
    this.button(card, 'ENTER THE CASINO', 0, -30, 650, 94, () => this.login(), 'primary');
    this.button(card, 'CREATE ACCOUNT', -170, -128, 310, 54, () => this.router.go('register'), 'link');
    this.button(card, 'FORGOT PASSWORD', 190, -128, 280, 54, () => this.router.go('forgot'), 'link');
    this.label(card, 'OR', 0, -181, 18, C.muted, true);
    const apple = this.button(card, 'CONTINUE WITH APPLE', 0, -245, 650, 76, () => void this.signInWithApple(), 'apple'); apple.name = 'AppleSignInButton';
    this.button(card, 'CONTINUE AS GUEST', 0, -340, 650, 70, () => this.guestLogin(), 'ghost');
    const guestCopy = this.label(card, 'GUEST PLAY  •  NO REAL MONEY  •  PURCHASES REQUIRE AN ACCOUNT', 0, -413, 20, C.cyan, true, 720); this.addLabelOutline(guestCopy, C.outline, 2);
    const secureCopy = this.label(this.page, 'SECURE SIGN-IN  •  APPLE ACCOUNT READY  •  PRIVATE BY DESIGN', 0, -562, 23, C.white, true, 900); this.addLabelOutline(secureCopy, C.outline, 4);
    // Legal links must remain readable after the 1080×1920 design canvas is
    // scaled down to a compact phone. Give them a dedicated high-contrast
    // rail and larger physical touch targets instead of treating them as
    // low-priority footer copy.
    const legalRail = this.panel(this.page, 0, -674, 930, 182, 30, new Color(54, 12, 22, 252), C.paleGold, 3, false);
    this.addCardShine(legalRail, 900, 154, C.paleGold, 0.8);
    const legalRailTitle = this.label(legalRail, 'LEGAL  •  PRIVACY  •  PLAYER SUPPORT', 0, 54, 27, C.white, true, 850); this.addLabelOutline(legalRailTitle, C.outline, 4);
    const legalActions: readonly [string, number, LegalPage][] = [['TERMS', -292, 'terms'], ['PRIVACY', 0, 'privacy'], ['SUPPORT', 292, 'support']];
    legalActions.forEach(([text, x, route]) => {
      const entry = this.button(legalRail, text, x, -31, 270, 78, () => this.router.go(route), 'secondary'); const copy = entry.getChildByName('Text')?.getComponent(Label);
      if (copy) { copy.fontSize = 31; copy.lineHeight = 36; copy.color = C.white; this.addLabelOutline(copy, C.outline, 4); }
    });
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

  private async signInWithApple(): Promise<void> {
    this.toast('Opening secure Apple sign-in…', C.cyan); const result = await this.bootstrap.auth.signInWithApple();
    if (result.ok) { this.bootstrap.economy.recoverPending(); this.router.reset('home'); }
    else this.toast(result.message ?? 'Unable to sign in with Apple', C.red);
  }

  private showRegister(): void {
    this.paintBackdrop('login', C.ink, new Color(196, 91, 55)); this.header('CREATE ACCOUNT', true);
    const card = this.panel(this.page, 0, -40, 840, 1160, 36, C.panel, C.gold, 2);
    this.label(card, 'FORTUNE BLOOM PROFILE', 0, 500, 28, C.paleGold, true);
    this.registerInputs = [
      this.input(card, 'Username', this.registerDraft.username, 0, 390), this.input(card, 'Nickname', this.registerDraft.nickname, 0, 265),
      this.input(card, 'Password (10–72 characters)', this.registerDraft.password, 0, 140, true), this.input(card, 'Confirm password', this.registerDraft.confirmPassword, 0, 15, true),
    ];
    const draftKeys = ['username', 'nickname', 'password', 'confirmPassword'] as const;
    const captureDraft = (): void => {
      this.registerInputs.forEach((input, index) => { this.registerDraft[draftKeys[index]] = input.string; });
    };
    this.registerInputs.forEach((input, index) => {
      input.node.on(EditBox.EventType.TEXT_CHANGED, () => { this.registerDraft[draftKeys[index]] = input.string; }, this);
      input.node.on(EditBox.EventType.EDITING_DID_ENDED, captureDraft, this);
    });
    let termsButton!: Node;
    const refreshTermsButton = (): void => {
      const copy = termsButton.getChildByName('Text')?.getComponent(Label); if (!copy) return;
      copy.string = `${this.acceptedTerms ? '✓' : '○'}  I ACCEPT THE TERMS & PRIVACY POLICY`;
      copy.color = this.acceptedTerms ? new Color(137, 255, 171) : C.white;
      this.addLabelOutline(copy, this.acceptedTerms ? new Color(18, 73, 47, 255) : C.outline, 3);
      if (this.acceptedTerms) this.vfx.pulse(copy.node);
    };
    // Agreement is a local control state, not navigation. Re-rendering the
    // route here destroyed every native EditBox and erased the user's draft.
    termsButton = this.button(card, '', 0, -105, 650, 58, () => { captureDraft(); this.acceptedTerms = !this.acceptedTerms; refreshTermsButton(); }, 'ghost');
    refreshTermsButton();
    this.button(card, 'READ TERMS', -178, -177, 300, 48, () => { captureDraft(); this.router.go('terms'); }, 'link');
    this.button(card, 'READ PRIVACY', 178, -177, 300, 48, () => { captureDraft(); this.router.go('privacy'); }, 'link');
    this.button(card, 'CREATE PROFILE', 0, -270, 650, 92, () => {
      captureDraft(); const { username, nickname, password, confirmPassword } = this.registerDraft;
      void this.bootstrap.auth.register({ username, nickname, password, confirmPassword, acceptedTerms: this.acceptedTerms }).then((result) => {
        if (result.ok) {
          this.registerDraft.username = ''; this.registerDraft.nickname = ''; this.registerDraft.password = ''; this.registerDraft.confirmPassword = ''; this.acceptedTerms = false;
          this.bootstrap.economy.recoverPending(); this.router.reset('home');
        } else this.toast(result.message ?? 'Registration failed', C.red);
      });
    }, 'primary');
    this.label(card, 'Purchases use Apple In-App Purchase. Coins have no cash value.', 0, -365, 20, C.muted);
    this.button(card, 'BACK TO SIGN IN', 0, -465, 380, 58, () => this.router.back('login'), 'link');
  }

  private showForgot(): void {
    this.paintBackdrop('login', C.ink, new Color(166, 72, 50)); this.header('ACCOUNT ACCESS', true);
    const card = this.panel(this.page, 0, 120, 820, 670, 38, C.panel, C.gold, 2);
    this.label(card, 'FORGOT YOUR PASSWORD?', 0, 245, 34, C.paleGold, true);
    this.label(card, 'Account recovery is completed through verified support.', 0, 170, 21, C.muted);
    const identifier = this.input(card, 'Username', '', 0, 55);
    this.button(card, 'GET RECOVERY HELP', 0, -75, 620, 86, () => {
      if (!identifier.string.trim()) { this.toast('Enter your username first.', C.red); return; }
      if (this.bootstrap.remoteMode && configuredPublicUrl(RELEASE_CONFIG.supportUrl)) { sys.openURL(RELEASE_CONFIG.supportUrl); return; }
      this.toast(this.bootstrap.auth.passwordRecoveryGuidance(identifier.string), C.cyan);
    }, 'primary');
    this.button(card, 'RETURN TO LOGIN', 0, -185, 360, 56, () => this.router.back('login'), 'link');
  }

  private showHome(): void {
    this.paintBackdrop('home', new Color(52, 31, 40), new Color(238, 174, 83)); this.addStarField(this.page, 30); this.addLobbyIdleWealth(); this.topBar();
    this.addHomeJackpotMarquee();
    this.addBrandEmblem(this.page, 0, 568, 126);
    const brandPlate = this.panel(this.page, 0, 468, 850, 126, 42, new Color(49, 18, 31, 218), LOBBY.champagne, 2, false); brandPlate.name = 'FortuneBloomLobbyMarquee';
    const title = this.artTitle(brandPlate, 'FORTUNE BLOOM', 0, 18, 52, LOBBY.champagne, 770); this.addLabelOutline(title, new Color(62, 16, 28, 255), 7);
    const subtitle = this.label(brandPlate, 'CARNIVAL • FOUR WAYS TO WIN', 0, -35, 21, LOBBY.ivory, true, 760); this.addLabelOutline(subtitle, LOBBY.ink, 4); this.addCardShine(brandPlate, 810, 100, C.paleGold, 0.35);
    const portalLayouts = [
      { x: -244, y: 168, width: 466, height: 382 },
      { x: 244, y: 168, width: 466, height: 382 },
      { x: -244, y: -248, width: 466, height: 382 },
      { x: 244, y: -248, width: 466, height: 382 },
    ] as const;
    portalLayouts.forEach((layout, index) => this.constellationGamePortal(GAME_CONFIGS[index], index, layout.x, layout.y, layout.width, layout.height));
    this.button(this.page, 'DAILY GIFT', -338, -657, 270, 60, () => this.router.go('check-in'), 'lobby-secondary');
    this.button(this.page, 'LUCKY WHEEL', 338, -657, 270, 60, () => this.router.go('wheel'), 'lobby-secondary');
    this.addHomeLiveFloorRibbon();
    this.bottomNav('home');
  }

  private addHomeFortuneShowcase(): void {
    const showcase = new Node('FortuneLivingGallery'); showcase.layer = Layers.Enum.UI_2D; showcase.addComponent(UITransform).setContentSize(1040, 1280); showcase.setPosition(0, -54); this.page.addChild(showcase);
    const galleryOpacity = showcase.addComponent(UIOpacity); galleryOpacity.opacity = 0; tween(galleryOpacity).to(0.65, { opacity: 255 }, { easing: 'sineOut' }).start();
    const galleries = [
      { y: 148, games: [0, 1] as const, accent: new Color(255, 193, 105), drift: 1 },
      { y: -342, games: [2, 3] as const, accent: new Color(115, 224, 213), drift: -1 },
    ] as const;
    galleries.forEach((gallery, galleryIndex) => {
      const chamber = new Node(`FortunePanoramaChamber-${galleryIndex}`); chamber.layer = Layers.Enum.UI_2D; chamber.addComponent(UITransform).setContentSize(900, 410); chamber.setPosition(0, gallery.y); showcase.addChild(chamber);
      const frame = chamber.addComponent(Graphics); frame.fillColor = new Color(35, 10, 24, 86); frame.roundRect(-448, -202, 896, 404, 76); frame.fill(); frame.strokeColor = new Color(114, 62, 37, 168); frame.lineWidth = 10; frame.roundRect(-444, -198, 888, 396, 72); frame.stroke(); frame.strokeColor = new Color(gallery.accent.r, gallery.accent.g, gallery.accent.b, 138); frame.lineWidth = 2.5; frame.roundRect(-435, -189, 870, 378, 65); frame.stroke();
      gallery.games.forEach((gameIndex, slideIndex) => {
        const slide = this.addGameCoverArt(chamber, gameIndex, 870, 378, false); slide.name = `LivingTheme-${GAME_CONFIGS[gameIndex].id}`; slide.setPosition(0, 0); slide.setSiblingIndex(0); const opacity = slide.addComponent(UIOpacity); opacity.opacity = slideIndex === 0 ? 112 : 0;
        const cycle = 10.8; const revealAt = slideIndex * 5.4 + galleryIndex * 0.7;
        tween(opacity).delay(revealAt).to(0.78, { opacity: 122 }, { easing: 'sineInOut' }).delay(3.75).to(0.82, { opacity: 0 }, { easing: 'sineInOut' }).delay(Math.max(0, cycle - revealAt - 5.4)).union().repeatForever().start();
      });
      const lens = new Node('GalleryLensLight'); lens.layer = Layers.Enum.UI_2D; lens.addComponent(UITransform).setContentSize(850, 350); chamber.addChild(lens); const lensGraphics = lens.addComponent(Graphics); lensGraphics.fillColor = new Color(255, 247, 214, 16); lensGraphics.moveTo(-420, 138); lensGraphics.lineTo(-160, 175); lensGraphics.lineTo(418, -126); lensGraphics.lineTo(150, -174); lensGraphics.close(); lensGraphics.fill(); lensGraphics.strokeColor = new Color(gallery.accent.r, gallery.accent.g, gallery.accent.b, 74); lensGraphics.lineWidth = 1.5; lensGraphics.moveTo(-410, gallery.drift * -88); lensGraphics.quadraticCurveTo(0, gallery.drift * 82, 410, gallery.drift * -36); lensGraphics.stroke(); const lensOpacity = lens.addComponent(UIOpacity); lensOpacity.opacity = 32; tween(lensOpacity).delay(galleryIndex * 0.7).to(2.1, { opacity: 92 }, { easing: 'sineInOut' }).to(2.7, { opacity: 24 }, { easing: 'sineInOut' }).union().repeatForever().start();
      this.addCardShine(chamber, 850, 350, C.paleGold, 1.2 + galleryIndex * 1.8);
      tween(chamber).by(5.8 + galleryIndex * 0.7, { position: new Vec3(gallery.drift * 8, 7, 0) }, { easing: 'sineInOut' }).by(6.2 + galleryIndex * 0.6, { position: new Vec3(gallery.drift * -8, -7, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
    showcase.setSiblingIndex(Math.min(3, this.page.children.length - 1));
  }

  private addFortuneConstellationRail(): void {
    const rail = new Node('FortuneConstellationRail'); rail.layer = Layers.Enum.UI_2D; rail.addComponent(UITransform).setContentSize(980, 1160); rail.setPosition(0, -95); this.page.addChild(rail); const g = rail.addComponent(Graphics);
    const points = [new Vec3(-42, 390), new Vec3(-8, 274), new Vec3(58, 166), new Vec3(18, 30), new Vec3(-52, -108), new Vec3(8, -244), new Vec3(54, -390)];
    g.strokeColor = new Color(255, 237, 172, 104); g.lineWidth = 8; g.moveTo(points[0].x, points[0].y); points.slice(1).forEach((point) => g.lineTo(point.x, point.y)); g.stroke();
    g.strokeColor = new Color(126, 220, 214, 190); g.lineWidth = 2; g.moveTo(points[0].x, points[0].y); points.slice(1).forEach((point) => g.lineTo(point.x, point.y)); g.stroke();
    points.forEach((point, index) => { g.fillColor = index % 2 ? LOBBY.champagne : LOBBY.rubyLight; g.circle(point.x, point.y, index === 0 || index === points.length - 1 ? 11 : 7); g.fill(); g.strokeColor = new Color(255, 252, 228, 220); g.lineWidth = 2; g.circle(point.x, point.y, index === 0 || index === points.length - 1 ? 14 : 10); g.stroke(); });
    const pulse = rail.addComponent(UIOpacity); pulse.opacity = 126; tween(pulse).to(1.4, { opacity: 236 }, { easing: 'sineInOut' }).to(1.9, { opacity: 112 }, { easing: 'sineInOut' }).union().repeatForever().start();
    // Two light couriers continuously travel through the same waypoints that
    // connect the four cabinets. This makes the constellation a real system,
    // rather than a decorative line hidden behind floating cards.
    for (let courierIndex = 0; courierIndex < 2; courierIndex += 1) {
      const courier = new Node(`FortuneCourier-${courierIndex}`); courier.layer = Layers.Enum.UI_2D; courier.addComponent(UITransform).setContentSize(42, 42); courier.setPosition(points[0]); rail.addChild(courier);
      const courierGraphics = courier.addComponent(Graphics); const courierColor = courierIndex === 0 ? LOBBY.champagne : LOBBY.rubyLight;
      courierGraphics.fillColor = new Color(courierColor.r, courierColor.g, courierColor.b, 42); courierGraphics.circle(0, 0, 19); courierGraphics.fill(); courierGraphics.strokeColor = new Color(courierColor.r, courierColor.g, courierColor.b, 172); courierGraphics.lineWidth = 2; courierGraphics.circle(0, 0, 12); courierGraphics.stroke(); courierGraphics.fillColor = C.white; courierGraphics.circle(0, 0, 5); courierGraphics.fill();
      const courierOpacity = courier.addComponent(UIOpacity); courierOpacity.opacity = 0;
      tween(courier).delay(courierIndex * 2.9)
        .to(0.58, { position: points[1] }, { easing: 'sineInOut' }).to(0.58, { position: points[2] }, { easing: 'sineInOut' })
        .to(0.58, { position: points[3] }, { easing: 'sineInOut' }).to(0.58, { position: points[4] }, { easing: 'sineInOut' })
        .to(0.58, { position: points[5] }, { easing: 'sineInOut' }).to(0.58, { position: points[6] }, { easing: 'sineInOut' })
        .call(() => courier.setPosition(points[0])).delay(1.5).union().repeatForever().start();
      tween(courierOpacity).delay(courierIndex * 2.9).to(0.24, { opacity: 238 }, { easing: 'sineOut' }).delay(2.8).to(0.38, { opacity: 0 }, { easing: 'sineInOut' }).delay(1.54).union().repeatForever().start();
    }
  }

  private addHomeLiveFloorRibbon(): void {
    const ribbon = this.panel(this.page, 0, -757, 760, 92, 30, new Color(46, 18, 32, 244), LOBBY.rubyLight, 2, false); ribbon.name = 'LiveFortuneFloorRibbon';
    const title = this.label(ribbon, 'LIVE FORTUNE FLOOR', -136, 17, 24, LOBBY.ivory, true, 440); this.addLabelOutline(title, LOBBY.ink, 3);
    const detail = this.label(ribbon, '4 DISTINCT GAMES  •  FAIR VIRTUAL PLAY', -136, -19, 17, LOBBY.champagne, true, 440); this.addLabelOutline(detail, LOBBY.ink, 2);
    const live = this.panel(ribbon, 260, 0, 190, 60, 24, new Color(34, 88, 73, 232), C.green, 2, false); live.name = 'AllWorldsLiveStatus';
    const liveLabel = this.label(live, 'ALL 4 LIVE', 18, 0, 20, C.white, true, 136); this.addLabelOutline(liveLabel, new Color(18, 55, 43, 255), 3);
    const lamp = new Node('LiveFloorLamp'); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(28, 28); lamp.setPosition(-65, 0); live.addChild(lamp); const lampGraphics = lamp.addComponent(Graphics); lampGraphics.fillColor = new Color(104, 255, 174, 48); lampGraphics.circle(0, 0, 13); lampGraphics.fill(); lampGraphics.fillColor = new Color(104, 255, 174, 255); lampGraphics.circle(0, 0, 7); lampGraphics.fill(); lampGraphics.fillColor = C.white; lampGraphics.circle(-2, 2, 2); lampGraphics.fill(); const lampOpacity = lamp.addComponent(UIOpacity); tween(lampOpacity).to(0.72, { opacity: 255 }, { easing: 'sineInOut' }).to(0.9, { opacity: 104 }, { easing: 'sineInOut' }).union().repeatForever().start();
    this.addCardShine(ribbon, 730, 76, C.paleGold, 1.15);
  }

  private constellationGamePortal(config: GameConfig, index: number, x: number, y: number, width: number, height: number): void {
    const accent = this.themeColor(config.id); const portal = this.panel(this.page, x, y, width, height, 38, new Color(45, 17, 31, 232), accent, 2, false); portal.name = `FortunePortal-${config.id}`;
    const art = this.addGameCoverArt(portal, index, width - 12, height - 12, false); art.setSiblingIndex(0);
    const deckTones = [
      new Color(78, 35, 27, 246), new Color(26, 75, 62, 246),
      new Color(28, 72, 79, 246), new Color(31, 52, 86, 246),
    ] as const;
    const deckHeight = 120; const deckY = -height / 2 + deckHeight / 2 + 10;
    const deck = this.panel(portal, 0, deckY, width - 22, deckHeight, 25, deckTones[index], accent, 2, false); deck.name = 'PortalTitleDeck';
    const deckLine = new Node('PortalDeckHighlight'); deckLine.layer = Layers.Enum.UI_2D; deckLine.addComponent(UITransform).setContentSize(width - 56, 8); deckLine.setPosition(0, deckHeight / 2 - 12); deck.addChild(deckLine); const deckGraphics = deckLine.addComponent(Graphics); deckGraphics.fillColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 156); deckGraphics.roundRect(-(width - 56) / 2, -1, width - 56, 2, 1); deckGraphics.fill(); deckGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 210); deckGraphics.roundRect(-72, -3, 144, 6, 3); deckGraphics.fill();
    const name = this.label(deck, config.name, -58, 19, 27, LOBBY.ivory, true, width - 160); name.enableWrapText = false; this.addLabelOutline(name, LOBBY.ink, 5);
    const cadence = ['1024 WAYS • ROAMING WILD', 'CLUSTERS • BLOOM CASCADES', '20 LINES • LOCK & RESPIN', 'ONE LINE • TREASURE WHEEL'][index];
    const cadenceLabel = this.label(deck, cadence, -58, -24, 16, LOBBY.champagne, true, width - 160); cadenceLabel.enableWrapText = false; this.addLabelOutline(cadenceLabel, LOBBY.ink, 3);
    const numberPlate = this.panel(portal, -width / 2 + 50, height / 2 - 42, 72, 44, 18, deckTones[index], C.paleGold, 2, false);
    const number = this.label(numberPlate, `0${index + 1}`, 0, 0, 18, LOBBY.ivory, true, 54); this.addLabelOutline(number, LOBBY.ink, 3);
    const launch = this.panel(deck, width / 2 - 78, -4, 116, 70, 28, new Color(accent.r, accent.g, accent.b, 238), C.paleGold, 2, false); const launchLabel = this.label(launch, 'PLAY', 0, 0, 19, C.white, true, 92); this.addLabelOutline(launchLabel, C.outline, 3);
    this.addCardShine(portal, width - 16, height - 16, C.paleGold, 0.5 + index * 0.8);
    this.addPanelImageBorder(portal, width, height, index, 236);
    portal.setScale(new Vec3(0.94, 0.94, 1)); tween(portal).delay(index * 0.09).to(0.32, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    const button = portal.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.975; let opening = false;
    portal.on(Button.EventType.CLICK, () => { if (opening || this.router.route !== 'home') return; opening = true; this.selectedGame = config; this.router.go('game-loading'); }, this);
  }

  private gameCard(config: GameConfig, x: number, y: number, index: number, featured: boolean): void {
    const cardWidth = featured ? 960 : 312; const cardHeight = featured ? 400 : 430;
    const card = this.panel(this.page, x, y, cardWidth, cardHeight, 30, new Color(0, 0, 0, 0), undefined, 0, false);
    const mediaWidth = cardWidth - 12; const mediaHeight = cardHeight - 14;
    const media = this.addGameCardArt(card, index, mediaWidth, mediaHeight);
    this.addCardShine(media, mediaWidth - 30, mediaHeight - 30, LOBBY.champagne, 0.8 + index * 0.72);
    const outerWidth = featured ? 980 : 326; const outerHeight = featured ? 416 : 446;
    this.addPanelImageBorder(card, mediaWidth, mediaHeight, index, 228, { width: outerWidth, height: outerHeight, innerContent: media });
    const cardAccent = this.themeColor(config.id); const glassWidth = featured ? 500 : 282; const glassHeight = featured ? 142 : 126; const glassX = featured ? -205 : 0; const glassY = featured ? -102 : -105;
    const glass = this.panel(card, glassX, glassY, glassWidth, glassHeight, 21, new Color(76, 24, 23, 242), cardAccent, 2, false); glass.name = 'CabinetTitleGlass'; if (featured) this.addGameCardPlateTrim(glass, cardAccent); this.addCardShine(glass, glassWidth - 20, glassHeight - 18, LOBBY.champagne, 0.9 + index * 0.7);
    const name = this.label(glass, config.name, 0, 27, featured ? 34 : 23, LOBBY.ivory, true, glassWidth - 20); this.addLabelOutline(name, LOBBY.ink, 4);
    const playMode = config.id === 'golden-parade' ? '5×4  •  1024 WAYS'
      : config.id === 'blossom-fortune' ? '5×5  •  BLOOM CLUSTERS'
        : config.id === 'lantern-treasure' ? '5×3  •  LOCK RESPIN'
          : '3×3  •  TREASURE WHEEL';
    const modeLabel = this.label(glass, playMode, 0, -18, featured ? 20 : 16, LOBBY.champagne, true, glassWidth - 18); this.addLabelOutline(modeLabel, LOBBY.ink, 3);
    this.addGameCardCta(card, index, featured ? 282 : 0, featured ? -116 : -183, featured ? 300 : 220);
    const ribbon = ['ROAMING PARADE', 'BLOOM CASCADE', 'LANTERN RESPIN', 'TREASURE WHEEL'][index];
    this.addGameCardModeRibbon(card, index, ribbon, featured ? 144 : 172, featured ? -252 : 0, featured ? 300 : 248);
    card.setScale(new Vec3(0.96, 0.96, 1)); tween(card).delay(index * 0.08).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    // Use Cocos Button's completed click gesture for the whole cabinet card.
    // Raw TOUCH_END can be lost when a finger drifts by a few pixels, which
    // made the smaller second and third cards feel intermittently unresponsive.
    const cardButton = card.addComponent(Button); cardButton.transition = Button.Transition.SCALE; cardButton.zoomScale = 0.985;
    let opening = false;
    card.on(Button.EventType.CLICK, () => {
      if (opening || this.router.route !== 'home') return;
      opening = true; this.selectedGame = config; this.router.go('game-loading');
    }, this);
  }

  private addHomeJackpotMarquee(): void {
    const node = new Node('HomeGrandJackpot'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(820, 48); node.setPosition(0, 698); this.page.addChild(node); const g = node.addComponent(Graphics);
    g.fillColor = LOBBY.panel; g.roundRect(-410, -24, 820, 48, 22); g.fill(); g.strokeColor = new Color(131, 72, 43, 235); g.lineWidth = 6; g.roundRect(-406, -20, 812, 40, 19); g.stroke(); g.strokeColor = LOBBY.gold; g.lineWidth = 2; g.roundRect(-402, -16, 804, 32, 15); g.stroke();
    [-382, 382].forEach((x) => { g.fillColor = LOBBY.rubyLight; g.circle(x, 0, 8); g.fill(); g.strokeColor = LOBBY.champagne; g.lineWidth = 1.5; g.circle(x, 0, 9); g.stroke(); g.fillColor = LOBBY.ivory; g.circle(x - 2, 2, 1.5); g.fill(); });
    const title = this.label(node, 'GRAND JACKPOT', -210, 0, 17, LOBBY.ivory, true, 280); this.addLabelOutline(title, LOBBY.ink, 2); const amount = this.label(node, '12,888,888', 135, 0, 25, LOBBY.champagne, true, 330); this.addLabelOutline(amount, LOBBY.ink, 3);
    const glow = node.addComponent(UIOpacity); glow.opacity = 238; tween(glow).to(1.25, { opacity: 255 }, { easing: 'sineInOut' }).to(1.45, { opacity: 218 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private addLobbyPageHero(title: string, subtitle: string, accent: Color, config: GameConfig, symbol: string): Node {
    // Every lobby destination opens with the same physical treasury plaque,
    // while its symbol and accent communicate the job of that destination.
    // Keeping the copy on an opaque manufactured surface prevents the busy
    // festival hall from swallowing small type on mobile displays.
    const hero = this.panel(this.page, 0, 634, 920, 126, 30, new Color(76, 25, 25, 244), accent, 2, true, Math.max(0, GAME_CONFIGS.indexOf(config)), 232);
    this.addCardShine(hero, 900, 106, C.paleGold, 0.18); this.addCardMotes(hero, 7, accent, 820, 82);
    this.addPremiumSymbol(hero, config, symbol, -374, 0, 84, 'pulse', 248, 0.08);
    const titleLabel = this.label(hero, title, -72, 22, 34, LOBBY.ivory, true, 610); this.addLabelOutline(titleLabel, LOBBY.ink, 4);
    const subtitleLabel = this.label(hero, subtitle, -72, -25, 18, LOBBY.muted, true, 620); this.addLabelOutline(subtitleLabel, LOBBY.ink, 3);
    const rail = new Node('LobbyHeroJewelRail'); rail.layer = Layers.Enum.UI_2D; rail.addComponent(UITransform).setContentSize(52, 86); rail.setPosition(382, 0); hero.addChild(rail); const g = rail.addComponent(Graphics);
    g.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 170); g.lineWidth = 2; g.moveTo(0, 30); g.lineTo(0, -30); g.stroke();
    [-24, 0, 24].forEach((y, index) => { const tone = index === 1 ? C.paleGold : accent; g.fillColor = new Color(tone.r, tone.g, tone.b, 238); g.moveTo(0, y + 8); g.lineTo(6, y); g.lineTo(0, y - 8); g.lineTo(-6, y); g.close(); g.fill(); });
    const opacity = rail.addComponent(UIOpacity); opacity.opacity = 112; tween(opacity).to(0.75, { opacity: 242 }, { easing: 'sineInOut' }).to(1.15, { opacity: 92 }, { easing: 'sineInOut' }).delay(0.7).union().repeatForever().start();
    return hero;
  }

  private addGameCardCta(parent: Node, index: number, x: number, y: number, width: number): void {
    const accent = this.themeColor(GAME_CONFIGS[index].id); const half = width / 2; const cta = new Node('PlayNowConsole'); cta.layer = Layers.Enum.UI_2D; cta.addComponent(UITransform).setContentSize(width, 58); cta.setPosition(x, y); parent.addChild(cta); const g = cta.addComponent(Graphics);
    g.fillColor = LOBBY.panel; g.roundRect(-half, -29, width, 58, 25); g.fill(); g.strokeColor = new Color(130, 73, 42, 245); g.lineWidth = 6; g.roundRect(-half + 5, -24, width - 10, 48, 22); g.stroke(); g.fillColor = new Color(accent.r, accent.g, accent.b, 82); g.roundRect(-half + 10, -20, width - 20, 40, 19); g.fill(); g.strokeColor = LOBBY.gold; g.lineWidth = 2.5; g.roundRect(-half + 11, -19, width - 22, 38, 18); g.stroke(); g.strokeColor = new Color(255, 249, 224, 190); g.lineWidth = 1; g.moveTo(-half + 36, 13); g.lineTo(half - 36, 13); g.stroke(); g.fillColor = LOBBY.ivory; g.moveTo(-half + 40, 10); g.lineTo(-half + 40, -10); g.lineTo(-half + 58, 0); g.close(); g.fill(); [-half + 22, half - 22].forEach((lampX) => { g.fillColor = accent; g.circle(lampX, 0, 5); g.fill(); g.strokeColor = LOBBY.champagne; g.lineWidth = 1.5; g.circle(lampX, 0, 6); g.stroke(); });
    const label = this.label(cta, 'PLAY NOW', 15, 0, 22, LOBBY.ivory, true, Math.max(120, width - 76)); this.addLabelOutline(label, LOBBY.ink, 4); const opacity = cta.addComponent(UIOpacity); opacity.opacity = 236; tween(opacity).delay(index * 0.22).to(1.05, { opacity: 255 }).to(1.25, { opacity: 222 }).union().repeatForever().start();
  }

  private addGameCardPlateTrim(parent: Node, accent: Color): void {
    const parentSize = parent.getComponent(UITransform)?.contentSize; const width = parentSize?.width ?? 500; const height = parentSize?.height ?? 142; const trim = new Node('CabinetPlateTrim'); trim.layer = Layers.Enum.UI_2D; trim.addComponent(UITransform).setContentSize(width, height); parent.addChild(trim); trim.setSiblingIndex(1); const g = trim.addComponent(Graphics); const halfWidth = width / 2; const halfHeight = height / 2; const inset = 9;
    g.strokeColor = new Color(255, 225, 145, 220); g.lineWidth = 1.5; g.roundRect(-halfWidth + inset, -halfHeight + inset, width - inset * 2, height - inset * 2, 16); g.stroke(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 170); g.lineWidth = 1; g.moveTo(-halfWidth + 58, 1); g.lineTo(halfWidth - 58, 1); g.stroke(); [-halfWidth + 18, halfWidth - 18].forEach((x) => { g.fillColor = accent; g.circle(x, 0, 6); g.fill(); g.strokeColor = C.gold; g.lineWidth = 1.5; g.circle(x, 0, 7); g.stroke(); g.fillColor = C.white; g.circle(x - 2, 2, 1.5); g.fill(); });
  }

  private addGameCardModeRibbon(parent: Node, index: number, text: string, y: number, x: number, width: number): void {
    const accent = this.themeColor(GAME_CONFIGS[index].id); const half = width / 2; const dotX = -half + 28; const ribbon = new Node('CabinetModeRibbon'); ribbon.layer = Layers.Enum.UI_2D; ribbon.addComponent(UITransform).setContentSize(width, 46); ribbon.setPosition(x, y); parent.addChild(ribbon); const g = ribbon.addComponent(Graphics); g.fillColor = new Color(66, 20, 21, 250); g.roundRect(-half, -23, width, 46, 18); g.fill(); g.strokeColor = new Color(133, 73, 42, 248); g.lineWidth = 4; g.roundRect(-half + 3, -20, width - 6, 40, 16); g.stroke(); g.strokeColor = LOBBY.gold; g.lineWidth = 1.5; g.roundRect(-half + 5, -18, width - 10, 36, 15); g.stroke(); g.fillColor = accent; g.circle(dotX, 0, 12); g.fill(); g.strokeColor = LOBBY.champagne; g.lineWidth = 1.5; g.circle(dotX, 0, 13); g.stroke(); const number = this.label(ribbon, String(index + 1).padStart(2, '0'), dotX, 0, 13, LOBBY.ivory, true, 34); this.addLabelOutline(number, LOBBY.ink, 2); const label = this.label(ribbon, text, 21, 0, width < 260 ? 16 : 18, LOBBY.ivory, true, width - 72); this.addLabelOutline(label, LOBBY.ink, 3);
  }

  private addSkylightPageSeal(title: string, subtitle: string, accent: Color, config: GameConfig, symbol: string): void {
    const seal = new Node(`${title}-Seal`); seal.layer = Layers.Enum.UI_2D; seal.addComponent(UITransform).setContentSize(920, 158); seal.setPosition(0, 620); this.page.addChild(seal); const g = seal.addComponent(Graphics);
    const configIndex = Math.max(0, GAME_CONFIGS.indexOf(config)); const art = this.addGameCoverArt(seal, configIndex, 908, 150, false); const artOpacity = art.addComponent(UIOpacity); artOpacity.opacity = 172;
    const veil = new Node('PageSealGlass'); veil.layer = Layers.Enum.UI_2D; veil.addComponent(UITransform).setContentSize(900, 142); seal.addChild(veil); const vg = veil.addComponent(Graphics); vg.fillColor = new Color(42, 15, 29, 164); vg.roundRect(-450, -71, 900, 142, 30); vg.fill(); vg.fillColor = new Color(accent.r, accent.g, accent.b, 36); vg.roundRect(-360, -58, 720, 116, 24); vg.fill();
    g.strokeColor = new Color(119, 66, 37, 242); g.lineWidth = 9; g.roundRect(-456, -75, 912, 150, 34); g.stroke(); g.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 228); g.lineWidth = 3; g.roundRect(-450, -69, 900, 138, 30); g.stroke(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 220); g.lineWidth = 1.5; g.roundRect(-441, -60, 882, 120, 26); g.stroke();
    const heading = this.artTitle(seal, title, 0, 24, 42, accent, 760); this.addLabelOutline(heading, C.outline, 6);
    const copy = this.label(seal, subtitle, 0, -31, 18, C.white, true, 800); this.addLabelOutline(copy, C.outline, 4);
    this.addCardShine(seal, 882, 126, C.paleGold, 0.35);
    void symbol;
  }

  private showStore(): void {
    const player = this.ensurePlayer(); const guest = player.isGuest;
    this.paintBackdrop('store', new Color(53, 23, 38), new Color(205, 142, 70)); this.addLobbyIdleWealth(); this.topBar('TREASURY');
    this.addSkylightPageSeal('CARNIVAL TREASURY', guest ? 'GUEST PASS • SIGN IN TO OPEN THE TREASURY' : 'APPLE PURCHASES • VIRTUAL COINS • NO CASH VALUE', C.gold, GAME_CONFIGS[2], 'lantern-chest');
    const daily = this.panel(this.page, 0, 455, 820, 108, 40, new Color(42, 91, 83, 236), C.paleGold, 2, false); daily.name = 'DailyOrbitGift'; this.addCardPhotoBackdrop(daily, 0, 820, 108, 104, 112, -28);
    this.addPremiumSymbol(daily, GAME_CONFIGS[0], 'coin-fan', -340, 0, 72, 'pulse', 250); const giftTitle = this.label(daily, 'DAILY PARADE GIFT', -155, 18, 26, C.white, true, 300); this.addLabelOutline(giftTitle, C.outline, 3); this.label(daily, '+5,000 VIRTUAL COINS', -138, -20, 19, C.paleGold, true, 340);
    this.button(daily, 'CLAIM', 292, 0, 200, 66, () => {
      if (this.bootstrap.remoteMode) { void this.claimRemoteReward('daily').then((ok) => { if (ok) this.vfx.flyCredits(new Vec3(292, 455, 0), new Vec3(350, this.topY(800), 0), () => { if (this.router.route === 'store') this.render('store'); }); }); return; }
      const ok = this.bootstrap.store.claimDaily(this.today()); this.toast(ok ? '5,000 virtual coins collected' : 'Already collected today', ok ? C.green : C.muted); if (ok) this.vfx.flyCredits(new Vec3(292, 455, 0), new Vec3(350, this.topY(800), 0), () => { if (this.router.route === 'store') this.render('store'); }); else this.refreshBalance();
    }, okStyle(true));
    const catalogViews = new Map<string, { price: Label; button: Button; buttonLabel?: Label }>();
    const symbols = ['coin-fan', 'lantern-chest', 'parade-crown', 'jade-chip'] as const;
    STORE_PRODUCTS.forEach((product, index) => {
      const column = index % 2; const row = Math.floor(index / 2); const x = column ? 232 : -232; const y = 224 - row * 320; const featured = index === 2; const accent = featured ? C.gold : index === 1 ? C.cyan : C.coral;
      const card = this.panel(this.page, x, y, 430, 284, 40, new Color(0, 0, 0, 0), undefined, 0, false); card.name = `VaultPack-${product.id}`;
      // Product cards are manufactured treasury objects, not miniature game
      // posters. Their single, product-specific atlas asset carries the visual
      // meaning; inserting an unrelated game scene underneath made the store
      // look assembled from spare artwork and reduced text contrast.
      this.addStoreVaultMaterial(card, index, 430, 284);
      this.addCardPhotoBackdrop(card, [0, 1, 3, 2][index], 430, 284, featured ? 154 : 136, featured ? 92 : 108, index === 1 ? -34 : index === 2 ? 28 : 0);
      this.addCardShine(card, 408, 262, accent, 0.6 + index * 0.75); this.addPremiumSymbol(card, index === 0 ? GAME_CONFIGS[0] : GAME_CONFIGS[1], symbols[index], -138, 55, 92, 'pulse', 248, index * 0.1);
      const packName = this.label(card, product.label, 45, 76, 24, C.white, true, 270); this.addLabelOutline(packName, C.outline, 3);
      this.label(card, this.format(product.credits + product.bonus), 42, 28, 31, C.paleGold, true, 270); this.label(card, 'VIRTUAL COINS', 42, -6, 16, C.muted, true, 260);
      this.addStatusChip(card, product.bonus > 0 ? `+${this.format(product.bonus)} BONUS` : 'STARTER', -80, -55, accent, 184);
      const price = this.label(card, this.debugMode ? `${product.debugPrice} SANDBOX` : 'LOADING PRICE', 99, -55, 17, C.paleGold, true, 205);
      const buyNode = this.button(card, guest ? 'SIGN IN' : 'BUY', 0, -103, 292, 60, () => { if (guest) { this.toast('Guest accounts cannot purchase coins. Sign in or create an account.', C.red); this.router.go('login'); return; } void this.purchaseCoins(product, new Vec3(x, y - 103, 0)); }, guest ? 'ghost' : featured ? 'primary' : 'secondary');
      catalogViews.set(product.id, { price, button: buyNode.getComponent(Button) as Button, buttonLabel: buyNode.getChildByName('Text')?.getComponent(Label) ?? undefined });
    });
    this.button(this.page, 'SYNC PURCHASES', 0, -462, 350, 56, () => void this.synchronizePurchases(), 'ghost');
    this.label(this.page, 'STOREKIT SECURED • CONSUMABLE VIRTUAL ITEMS', 0, -520, 17, C.muted, true, 820);
    void this.loadStoreCatalog(catalogViews); this.bottomNav('store');
  }

  private showRewards(): void {
    this.paintBackdrop('rewards', new Color(43, 31, 47), new Color(126, 179, 168)); this.addLobbyIdleWealth(); this.topBar('REWARDS');
    this.addSkylightPageSeal('FORTUNE FESTIVITIES', 'FOUR LIVE REWARD PATHS • RETURN DAILY', C.cyan, GAME_CONFIGS[1], 'jewel-peony');
    const wheelState = this.bootstrap.save.currentScope()?.wheel; const wheelReady = !wheelState || wheelState.date !== this.today() || wheelState.remaining > 0;
    const cards: readonly [string, string, string, Route, Color, string, GameConfig, string][] = [
      ['7-DAY STREAK', 'Grow the fortune garden daily', 'OPEN', 'check-in', C.cyan, 'READY TODAY', GAME_CONFIGS[0], 'coin-fan'],
      ['LUCKY WHEEL', 'One free prize spin daily', wheelReady ? 'SPIN' : 'DONE', 'wheel', C.gold, wheelReady ? '1 SPIN LEFT' : 'DONE TODAY', GAME_CONFIGS[3], 'prize-wheel'],
      ['BLOOM TROPHIES', 'Cross-game milestones', 'VIEW', 'achievements', C.violet, `${this.bootstrap.redDots.achievements()} READY`, GAME_CONFIGS[1], 'jewel-peony'],
      ['TREASURE MAIL', 'Messages and attachments', 'OPEN', 'mail', C.green, `${this.bootstrap.redDots.mail()} UNREAD`, GAME_CONFIGS[2], 'locked-coin'],
    ];
    cards.forEach(([title, body, action, route, color, status, config, symbol], index) => {
      const x = index % 2 ? 246 : -246; const y = index < 2 ? 278 : -215; const card = this.panel(this.page, x, y, 430, 304, 46, new Color(0, 0, 0, 0), undefined, 0, false); card.name = `RewardOrbit-${route}`;
      // Keep one clear hero image in the page seal and one meaningful reward
      // object per card. The former constellation spokes and extra background
      // scenes competed with the actions without communicating anything.
      this.addRewardDeviceMaterial(card, index, 430, 304, color);
      this.addCardPhotoBackdrop(card, [0, 2, 3, 1][index], 430, 304, 142, 104, index === 2 ? 30 : index === 3 ? -28 : 0);
      this.addPremiumSymbol(card, config, symbol, 0, 70, 96, index === 1 ? 'orbit' : 'pulse', 248, index * 0.11); const heading = this.label(card, title, 0, 8, 27, C.white, true, 380); this.addLabelOutline(heading, C.outline, 3);
      this.label(card, body, 0, -30, 18, C.muted, true, 370); this.addStatusChip(card, status, 0, -70, color, status.length > 10 ? 210 : 170); this.button(card, action, 0, -116, 238, 58, () => this.router.go(route), action === 'DONE' ? 'ghost' : 'secondary'); this.addCardShine(card, 408, 282, color, 0.6 + index * 0.8);
    });
    this.bottomNav('rewards');
  }

  private showRank(tab: 'daily' | 'weekly' | 'all-time'): void {
    this.paintBackdrop('rank', new Color(53, 22, 37), new Color(224, 153, 66)); this.addLobbyIdleWealth(); this.topBar('RANK');
    this.addSkylightPageSeal('PARADE OF WINNERS', this.bootstrap.remoteMode ? 'SERVER-VERIFIED VIRTUAL-COIN WINNINGS' : 'PREVIEW LEADERBOARD • RANKED BY TOTAL WIN', C.gold, GAME_CONFIGS[3], 'prize-wheel');
    const tabs: readonly [typeof tab, string][] = [['daily', 'DAILY'], ['weekly', 'WEEKLY'], ['all-time', 'ALL TIME']]; tabs.forEach(([id, text], index) => this.button(this.page, text, -286 + index * 286, 500, 242, 62, () => { this.clearAll(); this.showRank(id); }, id === tab ? 'primary' : 'ghost'));
    const rows = this.bootstrap.rank.list(tab, this.bootstrap.profile.current()).slice(0, 8);
    if (this.bootstrap.remoteMode && !this.bootstrap.rank.hasSnapshot(tab)) { const generation = ++this.rankRequestGeneration; this.label(this.page, 'LOADING VERIFIED RANKINGS…', 0, 255, 25, C.paleGold, true, 720); void this.bootstrap.rank.refresh(tab).then(() => { if (this.router.route === 'rank' && generation === this.rankRequestGeneration) { this.clearAll(); this.showRank(tab); } }).catch((error) => { if (this.router.route === 'rank' && generation === this.rankRequestGeneration) this.toast(error instanceof Error ? error.message : 'Rankings are temporarily unavailable', C.red); }); }
    // Keep a full visual breath between the filter rail and the first-place
    // card. The former crown silhouette protruded into WEEKLY and looked like
    // loose clip-art; rank is now communicated by portrait scale and finish.
    const podiumX = [0, -286, 286] as const; const podiumY = [310, 270, 262] as const; const podiumHeights = [286, 246, 238] as const;
    rows.slice(0, 3).forEach((entry, index) => {
      const height = podiumHeights[index]; const card = this.panel(this.page, podiumX[index], podiumY[index], 250, height, 44, new Color(0, 0, 0, 0), undefined, 0, false); this.addPodiumMaterial(card, index, 250, height);
      this.addCardPhotoBackdrop(card, [0, 1, 3][index], 250, height, index === 0 ? 136 : 112, index === 0 ? 104 : 120, index === 0 ? 24 : 0);
      const rank = this.label(card, `#${entry.rank}`, 0, index === 0 ? 105 : 88, 22, index === 0 ? C.paleGold : C.white, true, 100); this.addLabelOutline(rank, C.outline, 3);
      this.avatar(card, 0, index === 0 ? 38 : 27, entry.avatar, index === 0 ? 92 : 82);
      this.label(card, entry.nickname, 0, -35, 22, C.white, true, 222); this.label(card, 'TOTAL WON', 0, -65, 14, C.chrome, true, 190);
      const winnings = this.label(card, this.format(entry.winnings), 0, -92, 24, C.paleGold, true, 210); this.addLabelOutline(winnings, C.outline, 3);
    });
    rows.slice(3, 8).forEach((entry, index) => { const y = 82 - index * 121; const row = this.panel(this.page, 0, y, 860, 96, 28, new Color(0, 0, 0, 0), undefined, 0, false); this.addLedgerTicketMaterial(row, index, 860, 96, entry.current); this.addCardPhotoBackdrop(row, [2, 3, 1, 0, 2][index], 860, 96, entry.current ? 104 : 82, 132, index % 2 ? -54 : 42); this.label(row, `#${entry.rank}`, -370, 0, 24, entry.current ? C.white : C.muted, true, 90); this.avatar(row, -285, 0, entry.avatar, 64); this.label(row, entry.nickname, -125, 13, 24, C.white, true, 260); this.label(row, entry.current ? 'YOU' : 'TOTAL WON', -125, -17, 16, entry.current ? C.cyan : C.chrome, true, 260); const winnings = this.label(row, this.format(entry.winnings), 300, 0, 27, C.paleGold, true, 220); this.addLabelOutline(winnings, C.outline, 3); });
    this.label(this.page, 'VIRTUAL-COIN LEADERBOARD • NO CASH VALUE', 0, -550, 17, C.muted, true, 820); this.bottomNav('rank');
  }

  private showProfile(): void {
    this.paintBackdrop('profile', new Color(41, 30, 45), new Color(107, 176, 164)); this.addLobbyIdleWealth(); this.topBar('PROFILE');
    this.addSkylightPageSeal('CARNIVAL PASS', 'IDENTITY • PROGRESS • PLAYER CONTROLS', C.cyan, GAME_CONFIGS[0], 'parade-crown');
    const player = this.ensurePlayer(); const pass = this.panel(this.page, 0, 382, 900, 294, 48, new Color(0, 0, 0, 0), undefined, 0, false); pass.name = 'FortuneBloomMemberPass'; this.addBannerCarousel(pass, 884, 278); this.addPassSecurityMaterial(pass, 900, 294); this.addCardShine(pass, 872, 266, C.paleGold, 0.5);
    this.avatar(pass, -314, 12, player.avatar, 142); const playerName = this.label(pass, player.nickname, -98, 72, 38, C.white, true, 420); this.addLabelOutline(playerName, C.outline, 4); this.label(pass, `PLAYER ID  ${player.id.slice(-10).toUpperCase()}`, -84, 26, 18, C.muted, true, 450); this.label(pass, `LEVEL ${player.level} • ${player.isGuest ? 'GUEST PASS' : 'FORTUNE MEMBER'}`, -80, -16, 21, C.cyan, true, 470); this.progress(pass, -72, -55, 390, player.experience % 100 / 100); this.button(pass, 'CHOOSE AVATAR', 248, -82, 250, 60, () => this.showAvatarPicker(), 'ghost'); this.addBrandEmblem(pass, 320, 70, 92);
    const stats = [['SPINS', player.gamesPlayed], ['BIGGEST WIN', player.biggestWin], ['TOTAL WIN', player.totalWin]] as const; stats.forEach(([name, value], index) => { const x = -302 + index * 302; const box = this.panel(this.page, x, 146, 270, 136, 36, new Color(0, 0, 0, 0), undefined, 0, false); this.addProfileStatMaterial(box, index, 270, 136); this.addCardPhotoBackdrop(box, [2, 0, 3][index], 270, 136, 106, 122, index === 2 ? 34 : 0); this.label(box, name, 0, 21, 19, C.chrome, true, 230); const amount = this.label(box, this.format(value), 0, -22, 29, C.paleGold, true, 230); this.addLabelOutline(amount, C.outline, 3); this.addCardShine(box, 244, 112, C.paleGold, 0.7 + index * 0.55); });
    const entries: readonly [string, string, Route, Color, GameConfig, string][] = [['ACHIEVEMENTS', `${this.bootstrap.redDots.achievements()} READY`, 'achievements', C.violet, GAME_CONFIGS[1], 'jewel-peony'], ['INBOX', `${this.bootstrap.redDots.mail()} UNREAD`, 'mail', C.cyan, GAME_CONFIGS[2], 'locked-coin'], ['SETTINGS', player.settings.quality.toUpperCase(), 'settings', C.gold, GAME_CONFIGS[0], 'bloom-wild']];
    entries.forEach(([title, detail, route, color], index) => { const x = -302 + index * 302; const node = this.panel(this.page, x, -86, 272, 242, 42, new Color(0, 0, 0, 0), undefined, 0, false); this.addProfileEntryMaterial(node, index, 272, 242, color); this.addCardPhotoBackdrop(node, [3, 1, 0][index], 272, 242, 132, 112, index === 0 ? 30 : index === 1 ? -24 : 0); this.label(node, title, 0, 52, 24, C.white, true, 244); this.label(node, detail, 0, 13, 19, C.chrome, true, 238); this.button(node, 'OPEN', 0, -68, 190, 58, () => this.router.go(route), 'ghost'); this.addCardShine(node, 246, 216, color, 0.6 + index * 0.7); });
    this.button(this.page, 'LOG OUT', 0, -448, 350, 62, () => { this.bootstrap.auth.logout(); this.router.reset('login'); }, 'ghost'); this.bottomNav('profile');
  }

  private showQuickTopUp(): void {
    const player = this.ensurePlayer(); const guest = player.isGuest; const card = this.modal(900, 1080);
    this.addCardMotes(card, 26, C.gold, 820, 980); this.addCardShine(card, 840, 1010, C.paleGold, 0.15);
    this.addPremiumSymbol(card, GAME_CONFIGS[2], 'lantern-chest', -330, 414, 112, 'pulse', 245);
    this.artTitle(card, 'FORTUNE BLOOM TREASURY', 40, 420, 45, C.gold, 650);
    this.label(card, guest ? 'SIGN IN TO PURCHASE VIRTUAL COINS' : 'SECURE APPLE IN-APP PURCHASE', 40, 360, 21, guest ? C.red : C.muted, true, 650);
    const balancePlate = this.panel(card, 0, 286, 720, 92, 30, new Color(63, 18, 25, 242), C.gold, 2, false);
    this.addPremiumSymbol(balancePlate, GAME_CONFIGS[0], 'coin-fan', -262, 0, 62, 'pulse', 245);
    this.label(balancePlate, this.format(this.bootstrap.economy.balance()), -10, 7, 40, C.paleGold, true, 430);
    this.label(balancePlate, 'CURRENT VIRTUAL COIN BALANCE', -10, -29, 16, C.muted, true, 430);
    const catalogViews = new Map<string, { price: Label; button: Button; buttonLabel?: Label }>();
    STORE_PRODUCTS.forEach((product, index) => {
      const column = index % 2; const row = Math.floor(index / 2); const x = column ? 204 : -204; const y = 88 - row * 278;
      const productCard = this.panel(card, x, y, 370, 238, 28, new Color(92, 31, 30, 246), index === 2 ? C.gold : C.coral, index === 2 ? 3 : 1, true, index, 230);
      const symbol = index === 0 ? 'coin-fan' : index === 1 ? 'lantern-chest' : index === 2 ? 'parade-crown' : 'bloom-wild'; const symbolGame = index === 1 ? GAME_CONFIGS[2] : GAME_CONFIGS[0];
      this.addPremiumSymbol(productCard, symbolGame, symbol, -112, 48, 76, 'pulse', 245, index * 0.09);
      this.label(productCard, product.label, 48, 66, 22, C.white, true, 230);
      this.label(productCard, this.format(product.credits + product.bonus), 46, 25, 29, C.paleGold, true, 230);
      const bonus = product.bonus > 0 ? `INCLUDES +${this.format(product.bonus)} BONUS` : 'VIRTUAL COINS';
      this.label(productCard, bonus, 0, -13, 15, product.bonus > 0 ? C.cyan : C.muted, true, 320); const price = this.label(productCard, this.debugMode ? `${product.debugPrice} SANDBOX` : 'LOADING PRICE', 0, -43, 16, C.paleGold, true, 320);
      const buyNode = this.button(productCard, guest ? 'SIGN IN' : 'BUY', 0, -86, 290, 54, () => {
        if (guest) { this.closeModal(card); this.router.reset('login'); return; }
        void this.purchaseCoins(product, new Vec3(x, y, 0), card);
      }, guest ? 'ghost' : index === 2 ? 'primary' : 'secondary');
      catalogViews.set(product.id, { price, button: buyNode.getComponent(Button) as Button, buttonLabel: buyNode.getChildByName('Text')?.getComponent(Label) ?? undefined });
    });
    this.label(card, 'APPLE PAYMENT  •  VIRTUAL COINS  •  NO CASH VALUE', 0, -345, 18, C.muted, true, 720);
    this.button(card, 'SYNC PURCHASES', 0, -392, 340, 52, () => void this.synchronizePurchases(), 'link');
    this.button(card, 'CLOSE', 0, -444, 300, 58, () => this.closeModal(card), 'ghost');
    void this.loadStoreCatalog(catalogViews);
  }

  private async loadStoreCatalog(views: ReadonlyMap<string, { price: Label; button: Button; buttonLabel?: Label }>): Promise<void> {
    const catalog = await this.bootstrap.store.catalog();
    catalog.forEach((product) => {
      const view = views.get(product.id); if (!view?.price.node.isValid || !view.button.node.isValid) return;
      view.price.string = product.displayPrice; view.price.color = product.available ? C.paleGold : C.muted;
      const player = this.bootstrap.profile.current(); if (!player) return;
      if (!player.isGuest) view.button.interactable = product.available;
      if (view.buttonLabel?.node.isValid && !product.available && !player.isGuest) view.buttonLabel.string = 'UNAVAILABLE';
    });
  }

  private async purchaseCoins(product: CoinProduct, origin: Vec3, modal?: Node): Promise<void> {
    if (this.purchaseLocks.has(product.id)) { this.toast('Purchase already in progress', C.muted); return; }
    this.purchaseLocks.add(product.id); const before = this.bootstrap.economy.balance(); this.toast(this.debugMode ? 'Opening StoreKit sandbox…' : 'Contacting Apple…', C.cyan);
    try {
      const result = await this.bootstrap.store.purchase(product.id); this.toast(result.message, result.ok ? C.green : result.status === 'pending' ? C.gold : C.red);
      if (!result.ok || result.credited <= 0) return;
      const after = this.bootstrap.economy.balance(); this.animateBalance(before, after, 0.72);
      const target = this.router.route === 'game' ? new Vec3(0, CABINET_READOUT_LAYOUTS[this.selectedGame.id].creditsY, 0) : new Vec3(252, this.topY(790), 0);
      this.vfx.flyCredits(origin, target, () => this.refreshBalance()); if (modal?.isValid) this.closeModal(modal);
    } finally { this.purchaseLocks.delete(product.id); }
  }

  private async synchronizePurchases(): Promise<void> {
    const before = this.bootstrap.economy.balance(); const result = await this.bootstrap.store.restore(); this.toast(result.message, result.ok ? C.green : result.status === 'pending' ? C.gold : C.red);
    if (result.ok) this.animateBalance(before, this.bootstrap.economy.balance(), 0.6);
  }

  private async claimRemoteReward(kind: 'daily' | 'check-in' | 'wheel' | 'mail' | 'achievement', id?: string): Promise<boolean> {
    const api = this.bootstrap.api; if (!api) return false; const before = this.bootstrap.economy.balance();
    try {
      const reward = await api.claimReward(kind, id); this.bootstrap.economy.synchronizeBalance(reward.balance, `reward-sync:${reward.rewardKey}`);
      this.bootstrap.save.update((state) => { const userId = state.currentUserId; if (!userId) return; const scope = state.playerData[userId]; scope.claims[reward.rewardKey] = new Date().toISOString();
        if (kind === 'check-in') { scope.checkIn.lastClaimDate = this.today(); scope.checkIn.cycleDay = (reward.detail?.day ?? scope.checkIn.cycleDay + 1) % 7; }
        if (kind === 'wheel') scope.wheel = { date: this.today(), remaining: 0, settledSpinIds: [reward.rewardKey] };
        if (kind === 'mail' && id) { const current = scope.mail[id] ?? { read: false, claimed: false, deleted: false }; scope.mail[id] = { ...current, read: true, claimed: true }; }
        if (kind === 'achievement' && id) { const current = scope.achievements[id] ?? { progress: 0, claimed: false }; scope.achievements[id] = { ...current, claimed: true }; }
      });
      this.animateBalance(before, reward.balance, 0.65); this.toast(`+${this.format(reward.amount)} virtual coins collected`, C.green); return true;
    } catch (error) { this.toast(error instanceof Error ? error.message : 'Reward could not be claimed', C.muted); return false; }
  }

  private async claimAllRemoteMail(): Promise<void> {
    let claimed = false;
    for (const mail of INBOX_MESSAGES) if (mail.credits > 0 && !this.bootstrap.mail.state(mail.id).claimed) claimed = (await this.claimRemoteReward('mail', mail.id)) || claimed;
    if (!claimed) this.toast('No attachments available', C.muted); if (this.router.route === 'mail') this.render('mail');
  }

  private showAvatarPicker(): void {
    const player = this.ensurePlayer(); const card = this.modal(900, 1030);
    this.addCardMotes(card, 20, C.cyan, 820, 920); this.artTitle(card, 'CHOOSE YOUR LUCK', 0, 420, 43, C.gold, 700);
    this.label(card, 'TWELVE PLAYER PORTRAITS • TAP TO SELECT', 0, 364, 20, C.muted, true, 660);
    AVATAR_PATHS.forEach((_, index) => {
      const column = index % 4; const row = Math.floor(index / 4); const x = -270 + column * 180; const y = 225 - row * 205; const selected = index === player.avatar;
      const cell = this.panel(card, x, y, 150, 170, 30, selected ? new Color(116, 43, 32, 250) : new Color(66, 20, 27, 238), selected ? C.paleGold : C.coral, selected ? 4 : 1, true, index % 4, selected ? 255 : 190);
      this.avatar(cell, 0, 20, index, 108);
      this.label(cell, selected ? 'SELECTED' : `LUCK ${String(index + 1).padStart(2, '0')}`, 0, -59, 16, selected ? C.paleGold : C.muted, true, 126);
      const button = cell.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.94;
      cell.on(Node.EventType.TOUCH_START, () => { this.audio.play('tap'); this.vfx.buttonBurst(cell, selected ? C.paleGold : C.cyan); }, this);
      cell.on(Node.EventType.TOUCH_END, () => {
        void this.bootstrap.profile.setAvatar(index).then((ok) => {
          if (!ok) { this.toast('Unable to change avatar', C.red); return; }
          this.closeModal(card); this.toast('Fortune Bloom avatar updated', C.green); if (this.router.route === 'profile') this.render('profile');
        });
      }, this);
    });
    this.button(card, 'CLOSE', 0, -414, 300, 58, () => this.closeModal(card), 'ghost');
  }

  private showCheckIn(): void {
    this.paintBackdrop('rewards', C.ink, new Color(199, 95, 55)); this.header('7-DAY FORTUNE BLOOM CHECK-IN', true);
    this.label(this.page, 'Build your lucky streak one day at a time', 0, 630, 23, C.muted);
    const state = this.bootstrap.save.currentScope()?.checkIn ?? { cycleDay: 0, lastClaimDate: null };
    const claimedToday = state.lastClaimDate === this.today();
    for (let index = 0; index < 7; index += 1) {
      const row = index < 4 ? 0 : 1; const column = row === 0 ? index : index - 4; const count = row === 0 ? 4 : 3;
      const x = (column - (count - 1) / 2) * (row === 0 ? 250 : 305); const y = row === 0 ? 300 : -40;
      const claimed = index < state.cycleDay; const current = !claimedToday && index === state.cycleDay; const next = claimedToday && index === state.cycleDay;
      const card = this.panel(this.page, x, y, row === 0 ? 210 : 260, 285, 24, current ? new Color(128, 49, 31) : next ? new Color(91, 61, 35) : C.panel, current ? C.gold : next ? C.cyan : C.coral, current ? 4 : next ? 2 : 1);
      this.label(card, `DAY ${index + 1}`, 0, 58, 19, current ? C.paleGold : C.muted, true); this.addPremiumSymbol(card, GAME_CONFIGS[0], index === 6 ? 'parade-chest' : 'coin-fan', 0, 5, index === 6 ? 78 : 64, current ? 'pulse' : 'none', claimed ? 112 : 245, index * 0.06);
      this.label(card, `+${this.format(this.bootstrap.checkIn.rewards[index])}`, 0, -43, 21, C.white, true);
      const badge = current ? (index === 6 ? 'TODAY • GRAND' : 'TODAY') : next ? (index === 6 ? 'NEXT • GRAND' : 'NEXT') : claimed ? 'DONE' : index === 6 ? 'GRAND' : '';
      if (badge) this.addStatusChip(card, badge, 0, badge.includes('TODAY') || badge.includes('NEXT') || badge === 'GRAND' ? 108 : -94, current ? C.gold : next ? C.cyan : claimed ? C.green : C.violet, badge.length > 8 ? 136 : 90);
    }
    this.button(this.page, claimedToday ? 'CLAIMED TODAY' : 'CLAIM TODAY', 0, -360, 650, 92, () => {
      if (this.bootstrap.remoteMode) { void this.claimRemoteReward('check-in').then((ok) => { if (ok) this.vfx.flyCredits(new Vec3(0, -360), new Vec3(330, 790), () => { if (this.router.route === 'check-in') this.render('check-in'); }); }); return; }
      const result = this.bootstrap.checkIn.claimToday(this.today()); this.toast(result.ok ? `Day ${result.day}: +${this.format(result.amount)} virtual coins` : 'Today is already claimed', result.ok ? C.green : C.muted); if (result.ok) this.vfx.flyCredits(new Vec3(0, -360), new Vec3(330, 790), () => { if (this.router.route === 'check-in') this.render('check-in'); });
    }, claimedToday ? 'ghost' : 'primary');
    const resetInfo = this.panel(this.page, 0, -475, 560, 52, 20, new Color(74, 25, 24, 232), C.cyan, 1, false); this.label(resetInfo, 'RESETS ON THE NEXT DAILY SERVICE CYCLE', 0, 0, 16, C.chrome, true, 510);
  }

  private showWheel(): void {
    this.paintBackdrop('wheel', C.ink, new Color(198, 76, 50)); this.header('FORTUNE BLOOM LUCKY WHEEL', true);
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

      const separator = new Node(`SectorLamp-${index}`); separator.layer = Layers.Enum.UI_2D; separator.addComponent(UITransform).setContentSize(34, 34); separator.setPosition(Math.cos(start) * 340, Math.sin(start) * 340); wheel.addChild(separator); const gem = separator.addComponent(Graphics);
      const lampTone = index % 3 === 0 ? new Color(82, 202, 139) : index % 2 === 0 ? new Color(230, 67, 92) : C.paleGold; gem.fillColor = new Color(lampTone.r, lampTone.g, lampTone.b, 54); gem.circle(0, 0, 14); gem.fill(); gem.fillColor = lampTone; gem.circle(0, 0, 6); gem.fill(); gem.fillColor = new Color(255, 255, 244, 220); gem.circle(-1.5, 1.5, 1.8); gem.fill();
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
    this.addPremiumSymbol(wheel, GAME_CONFIGS[3], 'prize-wheel', 0, 0, 82, 'pulse', 255, 0.1);

    const pointer = new Node('WheelPointer'); pointer.layer = Layers.Enum.UI_2D; pointer.addComponent(UITransform).setContentSize(130, 124); pointer.setPosition(0, 514); this.page.addChild(pointer); const pointerGraphics = pointer.addComponent(Graphics);
    pointerGraphics.fillColor = new Color(66, 16, 22, 220); pointerGraphics.circle(0, 31, 46); pointerGraphics.fill(); pointerGraphics.strokeColor = new Color(117, 49, 29); pointerGraphics.lineWidth = 10; pointerGraphics.circle(0, 31, 40); pointerGraphics.stroke(); pointerGraphics.strokeColor = C.paleGold; pointerGraphics.lineWidth = 3; pointerGraphics.circle(0, 31, 36); pointerGraphics.stroke();
    pointerGraphics.fillColor = new Color(244, 181, 76); pointerGraphics.moveTo(-30, 25); pointerGraphics.lineTo(30, 25); pointerGraphics.lineTo(0, -51); pointerGraphics.close(); pointerGraphics.fill(); pointerGraphics.strokeColor = new Color(96, 37, 28); pointerGraphics.lineWidth = 5; pointerGraphics.moveTo(-30, 25); pointerGraphics.lineTo(30, 25); pointerGraphics.lineTo(0, -51); pointerGraphics.close(); pointerGraphics.stroke();
    pointerGraphics.fillColor = new Color(224, 56, 79); pointerGraphics.moveTo(0, 46); pointerGraphics.lineTo(13, 31); pointerGraphics.lineTo(0, 16); pointerGraphics.lineTo(-13, 31); pointerGraphics.close(); pointerGraphics.fill(); pointerGraphics.fillColor = C.white; pointerGraphics.circle(-3, 34, 3); pointerGraphics.fill();

    const wheelState = this.bootstrap.save.currentScope()?.wheel; const displayedRemaining = !wheelState || wheelState.date !== this.today() ? 1 : wheelState.remaining;
    const statusPlate = this.panel(this.page, 0, -337, 460, 58, 22, new Color(61, 8, 23, 238), C.gold, 2, false); const statusLabel = this.label(statusPlate, `DAILY SPINS  •  ${displayedRemaining} LEFT`, 0, 0, 20, C.paleGold, true, 410); this.addLabelOutline(statusLabel);
    const buttonPedestal = new Node('WheelButtonPedestal'); buttonPedestal.layer = Layers.Enum.UI_2D; buttonPedestal.addComponent(UITransform).setContentSize(720, 128); buttonPedestal.setPosition(0, -468); this.page.addChild(buttonPedestal); const pedestalGraphics = buttonPedestal.addComponent(Graphics); pedestalGraphics.fillColor = new Color(55, 9, 20, 226); pedestalGraphics.roundRect(-350, -52, 700, 104, 34); pedestalGraphics.fill(); pedestalGraphics.strokeColor = new Color(111, 48, 27); pedestalGraphics.lineWidth = 10; pedestalGraphics.roundRect(-344, -46, 688, 92, 30); pedestalGraphics.stroke(); pedestalGraphics.strokeColor = C.gold; pedestalGraphics.lineWidth = 3; pedestalGraphics.roundRect(-340, -42, 680, 84, 28); pedestalGraphics.stroke(); [-318, 318].forEach((x) => { pedestalGraphics.fillColor = new Color(220, 59, 81); pedestalGraphics.circle(x, 0, 10); pedestalGraphics.fill(); pedestalGraphics.strokeColor = C.paleGold; pedestalGraphics.lineWidth = 2; pedestalGraphics.circle(x, 0, 11); pedestalGraphics.stroke(); });

    let wheelSpinning = false; let spinControl!: Node;
    const runWheel = async (): Promise<void> => {
      if (wheelSpinning) return; wheelSpinning = true; const spinButton = spinControl.getComponent(Button); if (spinButton) spinButton.interactable = false;
      let prepared: { spinId: string; sector: number; amount: number; balance?: number } | undefined;
      if (this.bootstrap.remoteMode) {
        try { const remote = await this.bootstrap.api?.claimReward('wheel'); if (remote?.detail?.sector !== undefined) prepared = { spinId: remote.rewardKey, sector: remote.detail.sector, amount: remote.amount, balance: remote.balance }; }
        catch (error) { this.toast(error instanceof Error ? error.message : 'No free spins remaining today', C.muted); }
      } else prepared = this.bootstrap.wheel.prepare(this.today());
      if (!prepared) { wheelSpinning = false; if (spinButton) spinButton.interactable = displayedRemaining > 0; return; }
      statusLabel.string = 'WHEEL IN MOTION';
      // Rotate the prepared prize's centre to 12 o'clock. The previous
      // implementation stopped every reward at 3 o'clock because its final
      // angle omitted the pointer's 90-degree offset.
      const current = wheel.angle; const normalized = ((current % 360) + 360) % 360; const desired = prepared.sector * 45; const delta = (desired - normalized + 360) % 360; const targetAngle = current + 360 * 6 + delta;
      tween(pointer).to(0.1, { angle: -7 }).to(0.1, { angle: 4 }).to(0.1, { angle: -5 }).to(0.14, { angle: 0 }).union().repeat(7).start();
      tween(wheel).to(3.25, { angle: targetAngle }, { easing: 'quartOut' }).call(() => {
        const ok = prepared?.balance !== undefined ? this.bootstrap.economy.synchronizeBalance(prepared.balance, `reward-sync:${prepared.spinId}`) : this.bootstrap.wheel.settle(prepared.spinId); if (ok && prepared?.balance !== undefined) this.bootstrap.save.update((state) => { const id = state.currentUserId; if (id) state.playerData[id].wheel = { date: this.today(), remaining: 0, settledSpinIds: [prepared.spinId] }; }); wheelSpinning = false; const control = spinControl.getComponent(Button); if (control) control.interactable = false;
        statusLabel.string = ok ? `YOU WON  •  ${this.format(prepared.amount)} CREDITS` : 'PRIZE ALREADY COLLECTED'; const copy = spinControl.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = 'COME BACK TOMORROW';
        this.toast(ok ? `Wheel reward: +${this.format(prepared.amount)} virtual coins` : 'Reward already settled', ok ? C.gold : C.muted); this.refreshBalance();
      }).start();
    };
    spinControl = this.button(buttonPedestal, displayedRemaining > 0 ? 'SPIN FOR GOLD' : 'COME BACK TOMORROW', 0, 0, 610, 74, () => void runWheel(), displayedRemaining > 0 ? 'primary' : 'ghost');
  }

  private showAchievements(): void {
    this.paintBackdrop('profile', C.ink, new Color(176, 78, 51)); this.header('ACHIEVEMENTS', true);
    this.label(this.page, 'ALL   •   SPIN   •   WIN   •   FEATURE', 0, 650, 21, C.muted);
    ACHIEVEMENTS.forEach((achievement, index) => {
      const y = 455 - index * 290; const state = this.bootstrap.achievements.state(achievement.id);
      const ready = state.progress >= achievement.target && !state.claimed; const card = this.panel(this.page, 0, y, 900, 240, 28, C.panel2, ready ? C.gold : new Color(177, 75, 74), ready ? 3 : 1);
      this.addPremiumSymbol(card, GAME_CONFIGS[1], 'jewel-peony', -350, 4, 74, ready ? 'pulse' : 'none', ready ? 255 : 145, index * 0.08); this.label(card, achievement.title, -165, 32, 25, C.white, true, 420); this.label(card, `${state.progress} / ${achievement.target}`, -165, -2, 18, C.muted, false, 420); this.progress(card, -90, -42, 480, Math.min(1, state.progress / achievement.target));
      this.label(card, `+${this.format(achievement.reward)}`, 315, 32, 18, C.paleGold, true);
      this.button(card, state.claimed ? 'CLAIMED' : ready ? 'CLAIM' : 'LOCKED', 315, -35, 200, 60, () => {
        if (this.bootstrap.remoteMode) { void this.claimRemoteReward('achievement', achievement.id).then((ok) => { if (ok && this.router.route === 'achievements') this.render('achievements'); }); return; }
        const ok = this.bootstrap.achievements.claim(achievement.id); this.toast(ok ? 'Achievement reward collected' : 'Achievement is not ready', ok ? C.green : C.muted); if (ok) this.render('achievements');
      }, ready ? 'primary' : 'ghost');
    });
  }

  private showMail(): void {
    this.paintBackdrop('profile', C.ink, new Color(164, 72, 49)); this.header('INBOX', true);
    this.button(this.page, 'CLAIM ALL', 250, 650, 300, 62, () => {
      if (this.bootstrap.remoteMode) { void this.claimAllRemoteMail(); return; }
      const amount = this.bootstrap.mail.claimAll(); this.toast(amount ? `Collected ${this.format(amount)} virtual coins` : 'No attachments available', amount ? C.green : C.muted); if (amount) this.render('mail');
    }, 'secondary');
    INBOX_MESSAGES.forEach((mail, index) => {
      const state = this.bootstrap.mail.state(mail.id); if (state.deleted) return; const y = 420 - index * 310;
      const card = this.panel(this.page, 0, y, 900, 260, 28, state.read ? C.panel : new Color(133, 43, 49), state.read ? new Color(171, 76, 72) : C.cyan, state.read ? 1 : 3);
      if (mail.kind === 'reward') this.addPremiumSymbol(card, GAME_CONFIGS[0], 'coin-fan', -345, 18, 70, 'pulse', state.read ? 145 : 250); else this.addInterfaceControlIcon(card, 'mail', -345, 18, 44, state.read ? C.muted : C.cyan, C.paleGold); this.label(card, mail.title, -135, 42, 25, C.white, true, 480); this.label(card, mail.body, -110, 2, 18, C.muted, false, 540); if (mail.credits) this.label(card, `ATTACHMENT  +${this.format(mail.credits)} CREDITS`, -115, -48, 17, C.paleGold, true, 520);
      this.button(card, mail.credits ? (state.claimed ? 'CLAIMED' : 'CLAIM') : 'MARK READ', 315, -50, 210, 58, () => {
        this.bootstrap.mail.read(mail.id);
        if (mail.credits && this.bootstrap.remoteMode) { void this.claimRemoteReward('mail', mail.id).then((ok) => { if (ok && this.router.route === 'mail') this.render('mail'); }); return; }
        const ok = mail.credits ? this.bootstrap.mail.claim(mail.id) : true; this.toast(ok ? 'Message updated' : 'Attachment already collected', ok ? C.green : C.muted); if (ok) this.render('mail');
      }, state.claimed ? 'ghost' : 'secondary');
    });
    this.button(this.page, 'DELETE READ', 0, -610, 320, 58, () => { this.bootstrap.mail.deleteRead(); this.render('mail'); }, 'ghost');
  }

  private showSettings(): void {
    this.paintBackdrop('profile', C.ink, new Color(170, 75, 50)); this.header('SETTINGS', true); const player = this.ensurePlayer();
    this.label(this.page, 'AUDIO & FEEL', -310, 650, 18, C.paleGold, true, 340);
    this.label(this.page, 'Tap anywhere on a row to change', 245, 650, 16, C.muted, false, 420);
    const rows: readonly [string, string, () => void, boolean][] = [
      ['MUSIC', player.settings.music ? 'ON' : 'OFF', () => void this.updatePlayerSettings({ music: !player.settings.music }), true],
      ['SOUND EFFECTS', player.settings.sound ? 'ON' : 'OFF', () => void this.updatePlayerSettings({ sound: !player.settings.sound }), true],
      ['VIBRATION', player.settings.vibration ? 'ON' : 'OFF', () => void this.updatePlayerSettings({ vibration: !player.settings.vibration }), true],
      ['QUALITY', player.settings.quality.toUpperCase(), () => { const next = player.settings.quality === 'low' ? 'medium' : player.settings.quality === 'medium' ? 'high' : 'low'; void this.updatePlayerSettings({ quality: next }, () => this.vfx.setQuality(next)); }, false],
      ['LANGUAGE', player.settings.language === 'en' ? 'ENGLISH' : '简体中文', () => void this.updatePlayerSettings({ language: player.settings.language === 'en' ? 'zh-CN' : 'en' }), false],
    ];
    const positions = [510, 340, 170, -50, -220] as const;
    rows.forEach(([name, value, action, toggle], index) => {
      if (index === 3) this.label(this.page, 'DISPLAY & REGION', -290, 66, 18, C.paleGold, true, 380);
      const row = this.panel(this.page, 0, positions[index], 880, 140, 24, C.panel2, value === 'OFF' ? new Color(147, 67, 66) : this.themeColor(index === 3 ? GAME_CONFIGS[1].id : index === 4 ? GAME_CONFIGS[0].id : GAME_CONFIGS[3].id), value === 'OFF' ? 1 : 2);
      this.addSettingGlyph(row, index, -354, 0, value !== 'OFF'); this.label(row, name, -205, 0, 25, C.white, true, 350); this.addSettingControl(row, value, 285, 0, toggle);
      const button = row.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.985; row.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(8); }, this); row.on(Node.EventType.TOUCH_END, action, this);
    });
    this.button(this.page, 'TERMS', -285, -350, 240, 54, () => this.router.go('terms'), 'link'); this.button(this.page, 'PRIVACY', 0, -350, 240, 54, () => this.router.go('privacy'), 'link'); this.button(this.page, 'SUPPORT', 285, -350, 240, 54, () => this.router.go('support'), 'link');
    this.panel(this.page, 0, -500, 880, 150, 24, new Color(67, 25, 29), C.coral, 1); this.label(this.page, 'DELETE ACCOUNT & DATA', -170, -475, 23, C.white, true, 470); this.label(this.page, 'Re-authentication and explicit confirmation required.', -125, -518, 17, C.muted, false, 560);
    this.button(this.page, 'DELETE…', 315, -500, 210, 64, () => this.showDeleteAccountConfirmation(), 'ghost');
  }

  private addStatusChip(parent: Node, text: string, x: number, y: number, color: Color, width = 150): Node {
    const chip = new Node('StatusChip'); chip.layer = Layers.Enum.UI_2D; chip.addComponent(UITransform).setContentSize(width, 40); chip.setPosition(x, y); parent.addChild(chip); const g = chip.addComponent(Graphics);
    g.fillColor = new Color(58, 13, 25, 242); g.roundRect(-width / 2, -20, width, 40, 17); g.fill(); g.strokeColor = new Color(140, 77, 46, 240); g.lineWidth = 4; g.roundRect(-width / 2 + 2, -18, width - 4, 36, 15); g.stroke(); g.strokeColor = new Color(color.r, color.g, color.b, 240); g.lineWidth = 1.5; g.roundRect(-width / 2 + 4, -16, width - 8, 32, 14); g.stroke();
    [-1, 1].forEach((side) => { g.fillColor = color; g.moveTo(side * (width / 2 - 10), 5); g.lineTo(side * (width / 2 - 5), 0); g.lineTo(side * (width / 2 - 10), -5); g.lineTo(side * (width / 2 - 15), 0); g.close(); g.fill(); });
    const label = this.label(chip, text, 0, 0, 16, C.white, true, width - 30); label.enableWrapText = false; this.addLabelOutline(label, C.outline, 2); return chip;
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
    const loadingCopy: Readonly<Record<GameId, { duration: number; status: (ratio: number) => string }>> = {
      'golden-parade': { duration: 2.25, status: (ratio) => ratio < 0.34 ? 'POLISHING THE COIN FLOAT' : ratio < 0.72 ? 'LIGHTING THE PARADE' : 'CHARGING THE ROAMING WILD' },
      'blossom-fortune': { duration: 2.35, status: (ratio) => ratio < 0.34 ? 'OPENING THE CONSERVATORY' : ratio < 0.72 ? 'GATHERING GOLDEN PETALS' : 'GROWING BLOOM MULTIPLIERS' },
      'lantern-treasure': { duration: 2.45, status: (ratio) => ratio < 0.34 ? 'LIGHTING THE TREASURY' : ratio < 0.72 ? 'CALIBRATING RESPINS' : 'LOCKING BONUS COINS' },
      'treasure-wheel': { duration: 2.15, status: (ratio) => ratio < 0.34 ? 'POLISHING THE LUCKY REELS' : ratio < 0.72 ? 'WAKING THE PRIZE WHEEL' : 'OPENING THE CLASSIC PAVILION' },
    };
    const loading = loadingCopy[this.selectedGame.id];
    this.paintBackdrop('home', C.ink, color); this.addStarField(this.page, 34);
    const chamber = this.panel(this.page, 0, 15, 880, 1350, 46, new Color(23, 11, 18, 225), color, 3, true, heroIndex, 230);
    const chamberOpacity = chamber.addComponent(UIOpacity); chamberOpacity.opacity = 255;
    const cover = this.addGameCoverArt(chamber, heroIndex, 800, 560, true); cover.setPosition(0, 285);
    this.addCardMotes(chamber, 22, color, 780, 1160);
    this.addLoadingOrbit(chamber, 0, 278, color, 126);
    this.addBrandEmblem(chamber, 0, 278, 154);
    this.addPremiumSymbol(chamber, this.selectedGame, CARD_HERO_SYMBOLS[heroIndex], -320, 250, 112, 'float', 245, 0.08);
    this.addPremiumSymbol(chamber, this.selectedGame, this.selectedGame.scatterId ?? this.selectedGame.bonusId ?? this.selectedGame.wildId, 320, 250, 106, 'orbit', 238, 0.3);
    this.gameTitleLogo(chamber, this.selectedGame.name, 0, -82, 730, 168);
    const theme = this.label(chamber, `${this.selectedGame.modeLabel}  •  PREMIUM GAME READY`, 0, -158, 25, C.white, true, 740); this.addLabelOutline(theme, C.outline, 4);
    this.animateLoadingProgress(chamber, -350, -410, 650, loading.duration, loading.status, () => {
      if (generation !== this.loadingGeneration || this.router.route !== 'game-loading') return;
      // Let 100% register visually, then dissolve the loading chamber into the
      // matching cabinet instead of cutting between two dense illustrated scenes.
      tween(chamberOpacity).to(0.28, { opacity: 0 }, { easing: 'sineInOut' }).call(() => {
        if (generation === this.loadingGeneration && this.router.route === 'game-loading') this.router.replace('game');
      }).start();
    });
    const feature = this.label(chamber, `${this.selectedGame.feature.replace(/-/g, ' ').toUpperCase()}  •  VIRTUAL COINS`, 0, -495, 24, C.paleGold, true, 700); this.addLabelOutline(feature, C.outline, 4);
    this.button(chamber, 'BACK TO LOBBY', 0, -585, 360, 64, () => this.router.go('home'), 'secondary');
  }

  private showGame(): void {
    this.ensurePlayer();
    const color = this.themeColor(this.selectedGame.id); const layout = CABINET_LAYOUTS[this.selectedGame.id]; const readout = CABINET_READOUT_LAYOUTS[this.selectedGame.id]; const cabinetScale = this.cabinetViewportScale();
    this.paintBackdrop(`game_${this.selectedGame.id}`, C.ink, color); this.addStarField(this.page, 8);
    this.addCabinetBackdropAmbience(layout, color);
    this.addCabinetIdleAmbience(layout, color);
    this.addGameStage(layout, color);
    this.cabinetTitle(this.selectedGame.name, layout.titleY, layout.titleSize, layout.darkMarquee, layout.titleWidth);
    this.addJackpotStrip(layout, readout);
    this.addMachineFeatureConsole(layout, color);
    const reelFrame = new Node('CasinoTableReelAperture'); reelFrame.layer = Layers.Enum.UI_2D; reelFrame.addComponent(UITransform).setContentSize(layout.reelWidth, layout.reelHeight);
    // The generated cabinet windows have rounded glass corners. A rectangular
    // mask lets the first/last reel briefly show through the metal shoulders
    // during squash, bounce and win-pop motion, which reads as reel overflow.
    // Keep the whole reel presentation (symbols, paylines and particles) inside
    // the same rounded physical aperture.
    const reelMask = reelFrame.addComponent(Mask); reelMask.type = Mask.Type.GRAPHICS_STENCIL;
    const reelStencil = reelFrame.getComponent(Graphics); const reelRadius = Math.min(34, layout.reelHeight * 0.075);
    if (reelStencil) { reelStencil.clear(); reelStencil.fillColor = Color.WHITE; reelStencil.roundRect(-layout.reelWidth / 2 + 4, -layout.reelHeight / 2 + 4, layout.reelWidth - 8, layout.reelHeight - 8, reelRadius); reelStencil.fill(); }
    reelFrame.setPosition(layout.reelX, layout.reelY); this.page.addChild(reelFrame);
    const reelEngine = reelFrame.addComponent(ReelEngine); reelEngine.configure(this.selectedGame, layout.reelWidth, layout.reelHeight); this.reelEngine = reelEngine;
    this.addControlDeckIdle(layout, color);
    // Each readout is measured against the corresponding photographed socket.
    // In particular, the wheel cabinet uses two separate side meters while the
    // conservatory owns a wide lower cascade window.
    this.balanceLabel = this.machineBalanceReadout(this.format(this.bootstrap.economy.balance()), readout.creditsY, readout.creditsWidth, layout.readoutHeight, layout.readoutFontSize, readout.creditsSurface);
    const winWindow = this.machineReadout('WIN', '0', readout.winX, readout.winY, readout.winWidth, layout.readoutHeight, layout.readoutFontSize, true); this.winLabel = winWindow;
    this.betLabel = this.machineBetReadout(this.format(this.bet()), readout.betX, readout.betY, readout.betWidth, layout.readoutFontSize, readout.betTone);
    this.machineButton('−', layout.minus.x, layout.minus.y, layout.minus.width, layout.minus.height, () => { this.betIndex = Math.max(0, this.betIndex - 1); this.refreshBet(); }, 'step', 'minus');
    this.machineButton('+', layout.plus.x, layout.plus.y, layout.plus.width, layout.plus.height, () => { this.betIndex = Math.min(this.selectedGame.bets.length - 1, this.betIndex + 1); this.refreshBet(); }, 'step', 'plus');
    const spin = this.machineButton('SPIN', layout.spin.x, layout.spin.y, layout.spin.width, layout.spin.height, () => void this.onSpin(), 'spin', 'spin'); this.spinButtonLabel = spin.getChildByName('MachineLabelPlaque')?.getChildByName('Text')?.getComponent(Label) ?? undefined;
    const autoActive = this.autoSpin.active || this.autoStartPending; const auto = this.machineButton('AUTO', layout.auto.x, layout.auto.y, layout.auto.width, layout.auto.height, () => void this.startAuto(), autoActive ? 'switch-on' : 'switch', 'auto'); this.autoStatusLamp = auto.getChildByName('MachineStatusLamp') ?? undefined; this.setAutoIndicator(autoActive);
    const turbo = this.machineButton('TURBO', layout.turbo.x, layout.turbo.y, layout.turbo.width, layout.turbo.height, () => this.toggleTurbo(), this.turbo ? 'switch-on' : 'switch', 'turbo'); this.turboStatusLamp = turbo.getChildByName('MachineStatusLamp') ?? undefined;
    const soundOn = this.ensurePlayer().settings.sound;
    // Utility keys remain attached to the cabinet shoulders. Safe-area clamps
    // only prevent clipping; they never rescale the photographed machine.
    const utilityPosition = (slot: CabinetControlSlot): Vec3 => {
      const halfWidth = slot.width * cabinetScale / 2; const sideInset = slot.x < 0 ? SafeAreaAdapter.safeLeft : SafeAreaAdapter.safeRight;
      const worldX = Math.sign(slot.x) * Math.min(Math.abs(slot.x), Math.max(0, SafeAreaAdapter.visibleWidth / 2 - sideInset - halfWidth - 6));
      const preferredY = this.topY(slot.y); const worldY = Math.min(preferredY, SafeAreaAdapter.visibleHeight / 2 - SafeAreaAdapter.safeTop - slot.height * cabinetScale / 2 - 8);
      return new Vec3(worldX / cabinetScale, worldY / cabinetScale, 0);
    };
    const soundPosition = utilityPosition(layout.sound); const rulesPosition = utilityPosition(layout.rules); const homePosition = utilityPosition(layout.home);
    const sound = this.machineButton(soundOn ? 'SOUND ON' : 'SOUND OFF', soundPosition.x, soundPosition.y, layout.sound.width, layout.sound.height, () => this.toggleGameSound(), soundOn ? 'switch-on' : 'switch', 'sound'); this.soundStatusLamp = sound.getChildByName('MachineStatusLamp') ?? undefined;
    this.machineButton('RULES', rulesPosition.x, rulesPosition.y, layout.rules.width, layout.rules.height, () => this.showRules(), 'key', 'rules');
    this.machineButton('LOBBY', homePosition.x, homePosition.y, layout.home.width, layout.home.height, () => void this.leaveGame(), 'tool', 'home');
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
    if (this.spinRequestPending) { this.toast('Preparing the verified result…', C.muted); return false; }
    if (this.spinning) {
      if (this.stateMachine.state === 'spinning') {
        this.reelEngine?.quickStop();
      } else {
        // Once the reels have stopped, SPIN must not become a dead control
        // while the win stage is counting up. One tap dismisses that stage
        // and queues the next manual spin; AUTO owns its own next-spin loop.
        this.queuedSpin = !this.autoSpin.active;
        this.skipWinPresentation?.();
        this.setSpinButtonState(this.queuedSpin ? 'NEXT' : 'STOP');
        if (this.spinButtonLabel?.node?.isValid) this.vfx.pulse(this.spinButtonLabel.node);
      }
      return true;
    }
    const reelEngine = this.reelEngine;
    if (!reelEngine?.node?.isValid) { this.toast('Reels are still preparing', C.muted); return false; }
    // The local preview reserves a recoverable bet. Release rounds are
    // generated and settled by the authenticated server in one transaction.
    if (!this.bootstrap.remoteMode) { const recoveredBet = this.bootstrap.economy.recoverPending(); if (recoveredBet > 0) this.refreshBalance(); }
    const cabinetLayout = CABINET_LAYOUTS[this.selectedGame.id]; const readoutLayout = CABINET_READOUT_LAYOUTS[this.selectedGame.id];
    let result: SpinResult; let authoritativeBalance: number | undefined; this.stateMachine.reset(); this.stateMachine.move('reserving-bet');
    if (this.bootstrap.remoteMode) {
      if (!this.bootstrap.api) { this.stateMachine.reset(); this.toast('Secure game service is unavailable', C.red); return false; }
      this.spinRequestPending = true; this.setSpinButtonState('WAIT'); if (this.winLabel) this.winLabel.string = 'VERIFY'; this.vfx.spinCharge(this.cabinetWorldPoint(cabinetLayout.spin.x, cabinetLayout.spin.y), this.themeColor(this.selectedGame.id));
      try {
        const response = await this.bootstrap.api.spin(this.selectedGame.id, this.bet(), SecureRNG.id('round')); result = response.result; authoritativeBalance = response.balance;
      } catch (error) {
        this.stateMachine.reset(); this.toast(error instanceof Error ? error.message : 'Unable to prepare a secure round', C.red); this.setSpinButtonState('SPIN'); if (this.winLabel) this.winLabel.string = '0'; return false;
      } finally { this.spinRequestPending = false; }
      if (this.router.route !== 'game' || this.reelEngine !== reelEngine || !reelEngine.node.isValid) { this.bootstrap.economy.synchronizeBalance(authoritativeBalance, `round-sync:${result.spinId}`); this.stateMachine.reset(); return false; }
      if (this.balanceLabel) this.balanceLabel.string = this.format(Math.max(0, this.bootstrap.economy.balance() - this.bet()));
    } else {
      const rng = this.rngByGame.get(this.selectedGame.id) as SecureRNG; result = this.resultGenerator.generate(this.selectedGame, this.bet(), rng, this.forcedResult); this.forcedResult = undefined;
      if (!this.bootstrap.economy.reserveSpin(result.spinId, this.bet())) { this.stateMachine.reset(); this.toast('Not enough virtual coins or spin already active', C.red); return false; }
    }
    this.spinning = result; this.stateMachine.move('result-ready'); this.stateMachine.move('spinning');
    this.setSpinButtonState('STOP'); if (this.winLabel) this.winLabel.string = 'LUCK'; this.vfx.spinCharge(this.cabinetWorldPoint(cabinetLayout.spin.x, cabinetLayout.spin.y), this.themeColor(this.selectedGame.id)); if (!this.bootstrap.remoteMode) this.refreshBalance();
    this.audio.play('spin'); this.audio.vibrate(22);
    try {
      await reelEngine.spin(result, this.selectedGame, this.turbo);
    } catch (error) {
      console.error('Reel spin failed', error);
      if (authoritativeBalance !== undefined) this.bootstrap.economy.synchronizeBalance(authoritativeBalance, `round-recovery:${result.spinId}`); else this.bootstrap.economy.cancelReservation(result.spinId);
      this.resetInterruptedSpin();
      this.toast('Spin recovered — please try again', C.red);
      return false;
    }
    // A route/layout rebuild must not settle a result whose original reel
    // stage no longer exists. ReelColumn resolves on destruction, allowing the
    // reservation and UI lock to be released instead of hanging indefinitely.
    if (this.reelEngine !== reelEngine || !reelEngine.node.isValid || this.router.route !== 'game') {
      if (authoritativeBalance !== undefined) this.bootstrap.economy.synchronizeBalance(authoritativeBalance, `round-route-sync:${result.spinId}`); else this.bootstrap.economy.cancelReservation(result.spinId);
      this.resetInterruptedSpin();
      return false;
    }
    this.stateMachine.move('stopping'); this.stateMachine.move('evaluating');
    if (authoritativeBalance !== undefined) this.bootstrap.economy.synchronizeBalance(authoritativeBalance, `round:${result.spinId}`); else this.bootstrap.economy.settleSpin(result.spinId, result.totalWin); this.bootstrap.achievements.add('spin', 1); if (result.totalWin) this.bootstrap.achievements.add('win', result.totalWin); if (result.feature) this.bootstrap.achievements.add('feature', 1);
    this.audio.play('reel-stop'); if (result.totalWin > 0) { this.audio.play('win'); this.audio.vibrate([30, 35, 45]); if (this.winLabel) this.winLabel.string = `+${this.format(result.totalWin)}`; this.vfx.pulse(this.winLabel?.node as Node); if (this.reelEngine) { this.vfx.pulse(this.reelEngine.node); this.reelEngine.presentWins(result, this.selectedGame); } const winColor = this.themeColor(this.selectedGame.id); const majorWin = result.totalWin / Math.max(1, this.bet()) >= 8; const finalBalance = this.bootstrap.economy.balance(); this.animateBalance(Math.max(0, finalBalance - result.totalWin), finalBalance, majorWin ? 1.25 : 0.9); const reelWorld = this.cabinetWorldPoint(cabinetLayout.reelX, cabinetLayout.reelY); const creditsWorld = this.cabinetWorldPoint(0, readoutLayout.creditsY); this.vfx.celebrateWin(reelWorld, winColor); this.vfx.royalWinShower(reelWorld, winColor, majorWin, this.selectedGame); this.vfx.flyCredits(reelWorld, creditsWorld); await this.presentWinSplash(result); this.stateMachine.move('presenting-win'); }
    if (result.feature) { if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win') this.stateMachine.move('feature'); this.presentFeature(result); }
    if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win' || this.stateMachine.state === 'feature') this.stateMachine.move('settled'); this.stateMachine.move('idle');
    const launchQueuedSpin = this.queuedSpin && !this.autoSpin.active && this.router.route === 'game'; this.queuedSpin = false;
    this.spinning = undefined; this.releaseSpinIdleWaiters(); this.setSpinButtonState('SPIN'); if (this.winLabel && result.totalWin <= 0) this.winLabel.string = '0'; if (result.totalWin <= 0) this.refreshBalance();
    if (launchQueuedSpin) this.scheduleOnce(() => void this.onSpin(), 0.08);
    return true;
  }

  private presentFeature(result: SpinResult): void {
    if (result.feature?.type === 'lantern-respin') this.presentCashRespinStage(result);
    else if (result.feature?.type === 'treasure-wheel') this.presentOrbitPickStage(result);
    else if (result.feature?.type === 'parade-wild') this.presentDiceWildStage(result);
    else this.presentCascadeStage(result);
  }

  private featureCollectButton(modal: Node, total: number, color: Color, y: number): void {
    const amount = this.panel(modal, 0, y + 92, 610, 102, 34, new Color(54, 18, 33, 246), color, 2, false); this.addPremiumSymbol(amount, this.selectedGame, this.selectedGame.symbols.find((symbol) => symbol.tier === 'high')?.id ?? this.selectedGame.wildId, -240, 0, 70, 'pulse', 240); const value = this.label(amount, `+${this.format(total)}`, 20, 13, 43, C.paleGold, true, 430); this.addLabelOutline(value, C.outline, 5); this.label(amount, 'VIRTUAL COINS', 20, -28, 17, C.white, true, 420);
    this.button(modal, 'COLLECT', 0, y, 390, 72, () => this.closeModal(modal), 'primary');
  }

  private addFeatureStageChrome(parent: Node, accent: Color, kind: 'orbit' | 'respin' | 'dice' | 'cascade', width: number, height: number): void {
    const stage = new Node(`FeatureStageChrome-${kind}`); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(width, height); parent.addChild(stage); stage.setSiblingIndex(0); const g = stage.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2;
    // The feature lives inside a manufactured presentation bay: brass outer
    // shoulders, an enamel inner rail and a lit plinth. Its motif changes by
    // mechanic, so these screens do not collapse into one recoloured modal.
    g.fillColor = new Color(accent.r, accent.g, accent.b, 13); g.roundRect(-halfW + 10, -halfH + 10, width - 20, height - 20, 58); g.fill();
    g.strokeColor = new Color(101, 48, 28, 230); g.lineWidth = 10; g.roundRect(-halfW + 12, -halfH + 12, width - 24, height - 24, 56); g.stroke();
    g.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 205); g.lineWidth = 3.5; g.roundRect(-halfW + 20, -halfH + 20, width - 40, height - 40, 48); g.stroke();
    g.strokeColor = new Color(accent.r, accent.g, accent.b, 158); g.lineWidth = 1.8; g.roundRect(-halfW + 29, -halfH + 29, width - 58, height - 58, 41); g.stroke();
    g.fillColor = new Color(87, 24, 39, 190); g.moveTo(-halfW + 32, halfH - 112); g.lineTo(-halfW + 74, halfH - 65); g.lineTo(halfW - 74, halfH - 65); g.lineTo(halfW - 32, halfH - 112); g.close(); g.fill();
    g.strokeColor = new Color(255, 228, 150, 192); g.lineWidth = 3; g.moveTo(-halfW + 84, halfH - 68); g.quadraticCurveTo(0, halfH - 28, halfW - 84, halfH - 68); g.stroke();
    g.fillColor = new Color(35, 13, 27, 205); g.roundRect(-halfW + 74, -halfH + 30, width - 148, 54, 24); g.fill(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 145); g.lineWidth = 2; g.roundRect(-halfW + 70, -halfH + 27, width - 140, 60, 27); g.stroke();
    if (kind === 'orbit') {
      [0.78, 0.59, 0.4].forEach((ratio, index) => { g.strokeColor = index === 1 ? new Color(accent.r, accent.g, accent.b, 88) : new Color(255, 225, 142, 68 - index * 10); g.lineWidth = index === 0 ? 3 : 1.5; g.ellipse(0, 18, halfW * ratio, halfH * ratio * 0.55); g.stroke(); });
    } else if (kind === 'respin') {
      g.strokeColor = new Color(accent.r, accent.g, accent.b, 55); g.lineWidth = 1.3; for (let column = -2; column <= 2; column += 1) { g.moveTo(column * 126, -halfH + 120); g.lineTo(column * 126, halfH - 150); g.stroke(); } for (let row = -1; row <= 1; row += 1) { g.moveTo(-halfW + 92, row * 132); g.lineTo(halfW - 92, row * 132); g.stroke(); }
    } else if (kind === 'dice') {
      g.strokeColor = new Color(accent.r, accent.g, accent.b, 82); g.lineWidth = 3; g.moveTo(-halfW + 75, -40); g.quadraticCurveTo(0, halfH * 0.48, halfW - 75, -40); g.stroke(); g.strokeColor = new Color(255, 223, 144, 52); g.lineWidth = 1.5; g.moveTo(-halfW + 92, -76); g.quadraticCurveTo(0, halfH * 0.34, halfW - 92, -76); g.stroke();
    } else {
      const baseY = -halfH + 128; for (let index = 0; index < 4; index += 1) { const left = -halfW + 95 + index * 145; const top = baseY + index * 92; g.fillColor = new Color(accent.r, accent.g, accent.b, 18 + index * 7); g.moveTo(left, top); g.lineTo(left + 112, top); g.lineTo(left + 145, top + 58); g.lineTo(left + 32, top + 58); g.close(); g.fill(); g.strokeColor = new Color(255, 226, 143, 70 + index * 18); g.lineWidth = 2; g.moveTo(left, top); g.lineTo(left + 112, top); g.lineTo(left + 145, top + 58); g.stroke(); }
    }
    const stageOpacity = stage.addComponent(UIOpacity); stageOpacity.opacity = 165; tween(stageOpacity).to(1.5, { opacity: 228 }, { easing: 'sineInOut' }).to(1.9, { opacity: 154 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const lampPoints = [[-halfW + 34, halfH - 92], [halfW - 34, halfH - 92], [-halfW + 34, 0], [halfW - 34, 0], [-halfW + 42, -halfH + 72], [halfW - 42, -halfH + 72]] as const;
    lampPoints.forEach(([x, y], index) => { const lamp = new Node(`FeatureStageLamp-${index}`); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(26, 26); lamp.setPosition(x, y); stage.addChild(lamp); const lg = lamp.addComponent(Graphics); lg.fillColor = new Color(accent.r, accent.g, accent.b, 48); lg.circle(0, 0, 12); lg.fill(); lg.fillColor = index % 2 ? accent : C.paleGold; lg.circle(0, 0, 5.5); lg.fill(); lg.fillColor = C.white; lg.circle(-1.5, 1.5, 1.4); lg.fill(); const opacity = lamp.addComponent(UIOpacity); opacity.opacity = 52; tween(opacity).delay(index * 0.21).to(0.48, { opacity: 245 }, { easing: 'sineInOut' }).to(0.78, { opacity: 58 }, { easing: 'sineInOut' }).delay(0.75).union().repeatForever().start(); });
  }

  private presentOrbitPickStage(result: SpinResult): void {
    const feature = result.featureResult; const modal = this.modal(900, 940); this.addFeatureStageChrome(modal, C.gold, 'orbit', 820, 860); this.addCardMotes(modal, 26, C.gold, 820, 830); this.artTitle(modal, 'TREASURE WHEEL', 0, 365, 45, C.gold, 760); this.label(modal, 'ONE PHYSICAL WHEEL  •  ONE VERIFIED MULTIPLIER', 0, 316, 19, C.white, true, 700);
    const stage = new Node('TreasureWheelFeatureStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(600, 520); stage.setPosition(0, 45); modal.addChild(stage);
    const wheel = new Node('TreasureWheelRotor'); wheel.layer = Layers.Enum.UI_2D; wheel.addComponent(UITransform).setContentSize(470, 470); stage.addChild(wheel); const g = wheel.addComponent(Graphics); const radius = 214; const segments = [0, 0.5, 1, 1, 2, 3, 5, 10] as const;
    segments.forEach((multiplier, index) => {
      const start = -Math.PI / 2 + Math.PI * 2 * index / segments.length; const end = -Math.PI / 2 + Math.PI * 2 * (index + 1) / segments.length;
      g.fillColor = index % 2 ? new Color(73, 150, 168, 246) : new Color(232, 153, 93, 246); g.moveTo(0, 0); g.lineTo(Math.cos(start) * radius, Math.sin(start) * radius); for (let step = 1; step <= 7; step += 1) { const angle = start + (end - start) * step / 7; g.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); } g.close(); g.fill();
      g.strokeColor = new Color(255, 235, 164, 218); g.lineWidth = 2.5; g.moveTo(0, 0); g.lineTo(Math.cos(start) * radius, Math.sin(start) * radius); g.stroke();
      const middle = (start + end) / 2; const copy = multiplier === 0 ? 'TRY' : `${multiplier}×`; const label = this.label(wheel, copy, Math.cos(middle) * 139, Math.sin(middle) * 139, 24, C.white, true, 82); label.node.angle = middle * 180 / Math.PI + 90; this.addLabelOutline(label, C.outline, 4);
    });
    g.fillColor = new Color(47, 24, 32, 248); g.circle(0, 0, 70); g.fill(); g.strokeColor = new Color(255, 224, 132, 250); g.lineWidth = 9; g.circle(0, 0, 66); g.stroke(); g.strokeColor = new Color(255, 251, 224, 190); g.lineWidth = 2; g.circle(0, 0, radius - 5); g.stroke();
    this.addPremiumSymbol(wheel, GAME_CONFIGS[3], 'prize-wheel', 0, 0, 108, 'pulse', 255);
    const rotorOpacity = wheel.addComponent(UIOpacity); rotorOpacity.opacity = 230; tween(rotorOpacity).to(0.38, { opacity: 255 }, { easing: 'sineOut' }).start();
    const multiplier = Math.max(0, (feature?.totalCredits ?? 0) / Math.max(1, this.bet())); const landedIndex = Math.max(0, segments.findIndex((value) => Math.abs(value - multiplier) < 0.001)); const landingAngle = 90 - (landedIndex + 0.5) * 360 / segments.length;
    tween(wheel).to(2.25, { angle: -1080 + landingAngle }, { easing: 'cubicOut' }).to(0.16, { angle: -1080 + landingAngle + 4 }, { easing: 'sineInOut' }).to(0.2, { angle: -1080 + landingAngle }, { easing: 'backOut' }).start();
    const pointer = new Node('TreasureWheelFeaturePointer'); pointer.layer = Layers.Enum.UI_2D; pointer.addComponent(UITransform).setContentSize(86, 80); pointer.setPosition(0, 238); stage.addChild(pointer); const pointerGraphics = pointer.addComponent(Graphics); pointerGraphics.fillColor = new Color(255, 226, 133, 255); pointerGraphics.moveTo(0, -38); pointerGraphics.lineTo(-22, 23); pointerGraphics.lineTo(22, 23); pointerGraphics.close(); pointerGraphics.fill(); pointerGraphics.strokeColor = new Color(87, 38, 28, 255); pointerGraphics.lineWidth = 5; pointerGraphics.moveTo(0, -34); pointerGraphics.lineTo(-18, 20); pointerGraphics.lineTo(18, 20); pointerGraphics.close(); pointerGraphics.stroke(); tween(pointer).delay(1.45).to(0.11, { angle: -13 }).to(0.11, { angle: 12 }).union().repeat(7).to(0.18, { angle: 0 }, { easing: 'backOut' }).start();
    const detail = this.label(modal, feature?.detail.toUpperCase() ?? 'TREASURE WHEEL COMPLETE', 0, -216, 23, C.white, true, 720); this.addLabelOutline(detail, C.outline, 3); this.featureCollectButton(modal, feature?.totalCredits ?? 0, C.gold, -357);
  }

  private presentCashRespinStage(result: SpinResult): void {
    const feature = result.featureResult; const modal = this.modal(900, 1120); this.addFeatureStageChrome(modal, C.green, 'respin', 820, 1030); this.addCardMotes(modal, 30, C.green, 820, 1000); this.artTitle(modal, 'LANTERN LOCK RESPINS', 0, 450, 43, C.green, 760); this.label(modal, feature?.jackpot ? `${feature.jackpot.toUpperCase()} JACKPOT LOCKED` : 'LOCKED COINS RESET THE RESPIN METER', 0, 402, 19, C.paleGold, true, 730);
    const finalGrid = feature?.rounds[feature.rounds.length - 1]?.grid ?? []; const lockedCount = finalGrid.filter((symbol) => symbol === this.selectedGame.bonusId).length; const stage = this.panel(modal, 0, 120, 720, 500, 38, new Color(31, 72, 61, 244), C.gold, 3, false); stage.name = 'CashRespinLockGrid';
    const heldLabel = this.label(stage, `HELD  ${lockedCount} / 15`, -220, 218, 17, C.paleGold, true, 240); this.addLabelOutline(heldLabel, new Color(16, 51, 42, 255), 3); const respinLabel = this.label(stage, 'RESPIN METER  COMPLETE', 190, 218, 16, C.white, true, 290); this.addLabelOutline(respinLabel, new Color(16, 51, 42, 255), 3);
    for (let column = 0; column < 5; column += 1) for (let row = 0; row < 3; row += 1) { const index = column * 3 + row; const x = -280 + column * 140; const y = 135 - row * 135; const locked = finalGrid[index] === this.selectedGame.bonusId; const cell = this.panel(stage, x, y, 112, 108, 24, new Color(47, 24, 37, locked ? 248 : 158), locked ? C.gold : new Color(93, 145, 126, 150), locked ? 3 : 1, false); this.addPremiumSymbol(cell, GAME_CONFIGS[2], 'locked-coin', 0, 7, 76, locked ? 'pulse' : 'none', locked ? 248 : 42, index * 0.025); this.label(cell, locked ? 'LOCKED' : 'OPEN', 0, -38, 13, locked ? C.paleGold : C.muted, true, 96); }
    this.label(modal, feature?.detail.toUpperCase() ?? 'RESPINS RESOLVED', 0, -190, 23, C.white, true, 720); this.featureCollectButton(modal, feature?.totalCredits ?? 0, C.green, -455);
  }

  private presentDiceWildStage(result: SpinResult): void {
    const feature = result.featureResult; const modal = this.modal(900, 1010); this.addFeatureStageChrome(modal, C.cyan, 'dice', 820, 920); this.addCardMotes(modal, 30, C.cyan, 820, 900); this.artTitle(modal, 'ROAMING WILD PARADE', 0, 398, 47, C.cyan, 760); this.label(modal, 'SIX SPINS • THE WILD MARCHES ACROSS THE REELS', 0, 342, 18, C.white, true, 760);
    const lane = new Node('DiceWildSpinLane'); lane.layer = Layers.Enum.UI_2D; lane.addComponent(UITransform).setContentSize(780, 430); lane.setPosition(0, 85); modal.addChild(lane); const g = lane.addComponent(Graphics); g.strokeColor = new Color(126, 200, 200, 176); g.lineWidth = 4; g.moveTo(-330, -40); g.quadraticCurveTo(0, 185, 330, -40); g.stroke();
    for (let index = 0; index < 6; index += 1) { const x = -325 + index * 130; const distanceFromCenter = Math.abs(2.5 - index); const y = 10 + (2.5 - distanceFromCenter) * 48; const spin = this.panel(lane, x, y, 112, 160, 34, new Color(48, 29, 48, 245), index === 2 || index === 3 ? C.gold : C.cyan, index === 2 || index === 3 ? 3 : 1, false); this.addPremiumSymbol(spin, GAME_CONFIGS[0], 'bloom-wild', 0, 25, 82, index % 2 ? 'orbit' : 'pulse', 248, index * 0.1); this.label(spin, `STOP ${index + 1}`, 0, -47, 15, C.white, true, 98); const roundWin = feature?.rounds[index]?.credits ?? 0; this.label(spin, `+${this.format(roundWin)}`, 0, -68, 14, C.paleGold, true, 98); }
    const flight = new Node('DiceWildFlightComet'); flight.layer = Layers.Enum.UI_2D; flight.addComponent(UITransform).setContentSize(34, 34); flight.setPosition(-350, -48); lane.addChild(flight); const flightGraphics = flight.addComponent(Graphics); flightGraphics.fillColor = new Color(C.cyan.r, C.cyan.g, C.cyan.b, 55); flightGraphics.circle(0, 0, 16); flightGraphics.fill(); flightGraphics.fillColor = C.paleGold; flightGraphics.circle(0, 0, 6); flightGraphics.fill(); const flightOpacity = flight.addComponent(UIOpacity); flightOpacity.opacity = 0; tween(flight).delay(0.5).to(0.34, { position: new Vec3(-325, 10, 0) }, { easing: 'sineInOut' }).to(0.34, { position: new Vec3(-195, 58, 0) }, { easing: 'sineInOut' }).to(0.34, { position: new Vec3(-65, 106, 0) }, { easing: 'sineInOut' }).to(0.34, { position: new Vec3(65, 106, 0) }, { easing: 'sineInOut' }).to(0.34, { position: new Vec3(195, 58, 0) }, { easing: 'sineInOut' }).to(0.34, { position: new Vec3(325, 10, 0) }, { easing: 'sineInOut' }).call(() => flight.setPosition(-350, -48)).delay(1.2).union().repeatForever().start(); tween(flightOpacity).delay(0.5).to(0.18, { opacity: 245 }).delay(1.52).to(0.34, { opacity: 0 }).delay(1.24).union().repeatForever().start();
    const detail = this.label(modal, feature?.detail.toUpperCase() ?? 'ROAMING PARADE COMPLETE', 0, -175, 21, C.white, true, 760); this.addLabelOutline(detail, C.outline, 3); this.featureCollectButton(modal, feature?.totalCredits ?? 0, C.cyan, -390);
  }

  private presentCascadeStage(result: SpinResult): void {
    const feature = result.featureResult; const cascadeAccent = new Color(117, 226, 166); const modal = this.modal(900, 1060); this.addFeatureStageChrome(modal, cascadeAccent, 'cascade', 820, 970); this.addCardMotes(modal, 34, new Color(255, 169, 148), 820, 950); this.artTitle(modal, 'BLOSSOM CASCADE', 0, 420, 48, cascadeAccent, 760); this.label(modal, 'EACH BLOOM RAISES THE PETAL MULTIPLIER', 0, 365, 19, C.white, true, 720);
    const ladder = new Node('CascadeMultiplierLadder'); ladder.layer = Layers.Enum.UI_2D; ladder.addComponent(UITransform).setContentSize(700, 570); ladder.setPosition(0, 72); modal.addChild(ladder); const g = ladder.addComponent(Graphics); g.strokeColor = new Color(255, 222, 132, 180); g.lineWidth = 5; g.moveTo(-250, -175); g.lineTo(-120, -55); g.lineTo(20, 55); g.lineTo(210, 178); g.stroke();
    for (let index = 0; index < 4; index += 1) { const x = -250 + index * 155; const y = -175 + index * 118; const round = feature?.rounds[index]; const active = Boolean(round); const step = this.panel(ladder, x, y, 150, 118, 30, new Color(active ? 49 : 45, active ? 82 : 35, active ? 66 : 49, 245), active ? (index === 3 ? C.gold : C.green) : C.muted, active ? 3 : 1, false); this.addPremiumSymbol(step, GAME_CONFIGS[1], index === 3 ? 'jewel-peony' : index === 2 ? 'peony-wild' : 'coin-blossom', 0, 26, 64, active ? 'pulse' : 'none', active ? 245 : 110, index * 0.1); this.label(step, `×${index + 1}`, -43, -36, 24, active ? C.paleGold : C.muted, true, 62); this.label(step, active ? `+${this.format(round?.credits ?? 0)}` : 'LOCKED', 33, -36, 16, active ? C.white : C.muted, true, 88); }
    const climber = new Node('BlossomPrizeClimber'); climber.layer = Layers.Enum.UI_2D; climber.addComponent(UITransform).setContentSize(44, 44); climber.setPosition(-274, -198); ladder.addChild(climber); this.addPremiumSymbol(climber, GAME_CONFIGS[1], 'coin-blossom', 0, 0, 38, 'pulse', 230); const climberOpacity = climber.addComponent(UIOpacity); climberOpacity.opacity = 0; tween(climber).delay(0.65).to(0.54, { position: new Vec3(-120, -55, 0) }, { easing: 'backOut' }).to(0.54, { position: new Vec3(35, 63, 0) }, { easing: 'backOut' }).to(0.54, { position: new Vec3(225, 185, 0) }, { easing: 'backOut' }).call(() => climber.setPosition(-274, -198)).delay(1.35).union().repeatForever().start(); tween(climberOpacity).delay(0.65).to(0.2, { opacity: 245 }).delay(1.08).to(0.36, { opacity: 0 }).delay(1.39).union().repeatForever().start();
    this.label(modal, `${feature?.rounds.length ?? 0} CASCADES RESOLVED`, 0, -212, 25, C.white, true, 680); this.featureCollectButton(modal, feature?.totalCredits ?? 0, new Color(142, 218, 255), -420);
  }

  private presentWinSplash(result: SpinResult): Promise<void> {
    const ratio = result.totalWin / Math.max(1, this.bet()); const title = ratio >= 50 ? 'EPIC WIN' : ratio >= 20 ? 'MEGA WIN' : ratio >= 8 ? 'BIG WIN' : ratio >= 2 ? 'GREAT WIN' : 'NICE WIN'; const color = this.themeColor(this.selectedGame.id); const major = ratio >= 8; const duration = ratio >= 50 ? 4.25 : ratio >= 20 ? 3.7 : ratio >= 8 ? 3.15 : 2.25;
    const root = new Node('WinCelebration'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(W, H); this.overlay.addChild(root);
    // Do not dim the full cabinet. Previous full-screen black glass read as a
    // shadow-frame bug; the local ray halo and framed artwork supply focus.
    this.addWinLightCurtain(root, color, major, duration);
    const rays = this.addWinRayHalo(root, 0, 105, color, major); rays.setScale(new Vec3(0.42, 0.42, 1)); const rayOpacity = rays.addComponent(UIOpacity); rayOpacity.opacity = 0; tween(rays).to(0.48, { scale: new Vec3(1.02, 1.02, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }).by(duration + 1.2, { angle: 64 }).start(); tween(rayOpacity).to(0.2, { opacity: 220 }).delay(duration).to(0.38, { opacity: 0 }).start();
    const card = new Node('WinSplash'); card.layer = Layers.Enum.UI_2D; card.addComponent(UITransform).setContentSize(920, major ? 540 : 470); card.setPosition(0, 92); root.addChild(card); const opacity = card.addComponent(UIOpacity); opacity.opacity = 0; card.setScale(new Vec3(0.42, 0.42, 1));
    const winArtIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame));
    const stage = new Node('SkylightWinStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(900, major ? 510 : 440); card.addChild(stage); const g = stage.addComponent(Graphics); const halfH = major ? 232 : 197;
    // The award is a manufactured cabinet stage, not a game-cover card. The
    // high-resolution symbol atlas supplies the prize artwork; Graphics only
    // provides metal, enamel, glass and light hardware around it.
    g.fillColor = new Color(45, 12, 25, major ? 246 : 238); g.roundRect(-390, -halfH, 780, halfH * 2, 62); g.fill();
    g.fillColor = new Color(color.r, color.g, color.b, 42); g.roundRect(-365, -halfH + 24, 730, halfH * 2 - 48, 50); g.fill();
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
    g.fillColor = new Color(255, 220, 132, 28); g.roundRect(-316, -halfH + 34, 632, major ? 126 : 108, 34); g.fill();
    if (winArtIndex === 0) {
      g.strokeColor = new Color(255, 218, 111, 176); g.lineWidth = 3; for (let ray = -2; ray <= 2; ray += 1) { g.moveTo(ray * 34, -halfH + 34); g.lineTo(ray * 62, halfH - 42); g.stroke(); }
      g.fillColor = new Color(255, 219, 103, 34); g.arc(0, -8, 126, 0.12, Math.PI - 0.12, false); g.lineTo(0, -8); g.close(); g.fill();
    } else if (winArtIndex === 1) {
      g.strokeColor = new Color(145, 241, 210, 184); g.lineWidth = 3; g.circle(0, -4, major ? 118 : 94); g.stroke(); g.strokeColor = new Color(255, 224, 133, 132); g.lineWidth = 2; for (let spoke = 0; spoke < 8; spoke += 1) { const angle = spoke * Math.PI / 4; g.moveTo(Math.cos(angle) * 72, -4 + Math.sin(angle) * 72); g.lineTo(Math.cos(angle) * 112, -4 + Math.sin(angle) * 112); g.stroke(); }
    } else if (winArtIndex === 2) {
      g.strokeColor = new Color(127, 222, 239, 180); g.lineWidth = 3; g.moveTo(-258, -halfH + 38); g.lineTo(-80, 18); g.lineTo(80, 18); g.lineTo(258, -halfH + 38); g.stroke(); g.strokeColor = new Color(255, 211, 126, 142); g.lineWidth = 2; for (let x = -204; x <= 204; x += 68) { g.moveTo(x - 18, -halfH + 46); g.lineTo(x, -halfH + 64); g.lineTo(x + 18, -halfH + 46); g.stroke(); }
    } else {
      g.fillColor = new Color(113, 179, 255, 34); g.moveTo(-230, -halfH + 38); g.lineTo(-150, -halfH + 88); g.lineTo(150, -halfH + 88); g.lineTo(230, -halfH + 38); g.close(); g.fill(); g.strokeColor = new Color(255, 224, 131, 175); g.lineWidth = 3; g.moveTo(-230, -halfH + 38); g.lineTo(230, -halfH + 38); g.moveTo(-174, -halfH + 76); g.lineTo(174, -halfH + 76); g.moveTo(-118, -halfH + 111); g.lineTo(118, -halfH + 111); g.stroke();
    }
    // S05-quality presentation: one full-bleed, high-resolution themed scene
    // supplies the award artwork. Do not decorate the stage with generated
    // mini-icons; the remaining runtime geometry is light, glass and metal.
    const sceneWidth = 746; const sceneHeight = major ? 404 : 338;
    const sceneClip = new Node('PremiumWinSceneClip'); sceneClip.layer = Layers.Enum.UI_2D; sceneClip.addComponent(UITransform).setContentSize(sceneWidth, sceneHeight); sceneClip.setPosition(0, 2); stage.addChild(sceneClip);
    const sceneMask = sceneClip.addComponent(Mask); sceneMask.type = Mask.Type.GRAPHICS_STENCIL; const sceneStencil = sceneClip.getComponent(Graphics);
    if (sceneStencil) { sceneStencil.clear(); sceneStencil.fillColor = Color.WHITE; sceneStencil.roundRect(-sceneWidth / 2, -sceneHeight / 2, sceneWidth, sceneHeight, 46); sceneStencil.fill(); }
    const sceneImage = new Node('PremiumWinSceneImage'); sceneImage.layer = Layers.Enum.UI_2D; const sceneExtent = sceneWidth * 1.04; sceneImage.addComponent(UITransform).setContentSize(sceneExtent, sceneExtent); sceneImage.setScale(new Vec3(1.035, 1.035, 1)); sceneClip.addChild(sceneImage); const sceneSprite = sceneImage.addComponent(Sprite); sceneSprite.sizeMode = Sprite.SizeMode.CUSTOM; const sceneOpacity = sceneImage.addComponent(UIOpacity); sceneOpacity.opacity = 0;
    const applyWinScene = (): void => { if (!sceneImage.isValid) return; const frame = GameCoverAtlasCache.frame(this.selectedGame.id); if (!frame) return; sceneSprite.spriteFrame = frame; tween(sceneOpacity).to(0.2, { opacity: 255 }, { easing: 'quadOut' }).start(); };
    applyWinScene(); GameCoverAtlasCache.load(applyWinScene);
    tween(sceneImage).to(duration + 1.1, { position: new Vec3(winArtIndex % 2 ? -18 : 18, 10, 0), scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' }).start();
    const sceneShade = new Node('PremiumWinSceneShade'); sceneShade.layer = Layers.Enum.UI_2D; sceneShade.addComponent(UITransform).setContentSize(sceneWidth, sceneHeight); sceneClip.addChild(sceneShade); const sg = sceneShade.addComponent(Graphics);
    sg.fillColor = new Color(24, 7, 18, 58); sg.rect(-sceneWidth / 2, -sceneHeight / 2, sceneWidth, sceneHeight); sg.fill();
    const shadeBands = 10; for (let index = 0; index < shadeBands; index += 1) { const alpha = 18 + index * 14; sg.fillColor = new Color(30, 6, 18, alpha); sg.rect(-sceneWidth / 2, -sceneHeight / 2 + index * sceneHeight * 0.052, sceneWidth, sceneHeight * 0.06 + 2); sg.fill(); }
    this.addCardShine(sceneClip, sceneWidth - 18, sceneHeight - 18, C.paleGold, 0);
    this.addWinSceneSweeps(sceneClip, sceneWidth - 18, sceneHeight - 18, color, major);
    this.addWinStageFootlights(card, color, major ? 370 : 330, major ? -190 : -164);
    const eyebrow = this.label(card, major ? 'FORTUNE BLOOM  •  GRAND PRIZE PARADE' : 'FORTUNE BLOOM CABINET WIN', 0, major ? 176 : 145, 19, C.paleGold, true, 620); this.addLabelOutline(eyebrow, C.outline, 3);
    const winTitleColor = this.mix(color, C.paleGold, 0.62); this.artTitle(card, title, 0, major ? 104 : 88, major ? 70 : 58, winTitleColor, 620);
    const initialAmount = Math.max(1, Math.floor(result.totalWin * 0.03));
    const amountHalo = this.addWinAmountHalo(card, color, major, major ? -57 : -47);
    const amount = this.label(card, `+${this.format(initialAmount)}`, 0, major ? -58 : -48, major ? 67 : 55, C.white, true, 590); amount.node.name = 'WinAmount'; this.addLabelOutline(amount, C.outline, 6);
    const multiplier = this.label(card, `${ratio.toFixed(ratio >= 10 ? 0 : 1)}× TOTAL BET`, 0, major ? -138 : -116, 22, C.paleGold, true, 520); this.addLabelOutline(multiplier, C.outline, 3);
    const counter = { value: initialAmount }; tween(counter).delay(0.55).to(Math.min(1.5, duration * 0.48), { value: result.totalWin }, { easing: 'cubicOut', onUpdate: () => { if (amount.node?.isValid) amount.string = `+${this.format(counter.value)}`; } }).call(() => { if (!amount.node?.isValid) return; amount.string = `+${this.format(result.totalWin)}`; tween(amount.node).to(0.1, { scale: new Vec3(1.16, 1.16, 1) }, { easing: 'sineOut' }).to(0.24, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); tween(amountHalo).to(0.1, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'sineOut' }).to(0.34, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }).start();
    // A second atlas-art shower makes BIG/MEGA/EPIC land in two musical beats
    // instead of spending every particle on the first frame. The callback is
    // attached to the celebration root so skip/teardown cancels it cleanly.
    if (major) tween(root).delay(ratio >= 50 ? 1.35 : 1.05).call(() => { if (!root.isValid) return; this.audio.play('reward'); this.audio.vibrate(ratio >= 50 ? [24, 42, 52] : [18, 34, 34]); this.vfx.royalWinShower(new Vec3(0, 96, 0), color, true, this.selectedGame); }).start();
    tween(opacity).delay(0.22).to(0.16, { opacity: 255 }, { easing: 'quadOut' }).delay(duration - 0.07).to(0.36, { opacity: 0 }).start();
    return new Promise((resolve) => {
      let completed = false;
      const finish = (): void => {
        if (completed) return; completed = true;
        if (this.skipWinPresentation === skip) this.skipWinPresentation = undefined;
        if (root.isValid) { this.stopNodeTweens(root); root.destroy(); }
        resolve();
      };
      const skip = (): void => {
        if (completed || !root.isValid) { finish(); return; }
        this.stopNodeTweens(root); Tween.stopAllByTarget(counter); counter.value = result.totalWin; if (amount.node?.isValid) { amount.string = `+${this.format(result.totalWin)}`; amount.node.setScale(Vec3.ONE); } opacity.opacity = Math.min(opacity.opacity, 255);
        tween(opacity).to(0.08, { opacity: 255 }, { easing: 'sineOut' }).to(0.16, { opacity: 0 }, { easing: 'sineInOut' }).call(finish).start();
      };
      this.skipWinPresentation = skip;
      tween(card).delay(0.18).to(0.38, { scale: new Vec3(1.055, 1.055, 1) }, { easing: 'backOut' }).to(0.16, { scale: Vec3.ONE }).delay(Math.max(0.8, duration - 0.53)).to(0.34, { position: new Vec3(0, 205, 0), scale: new Vec3(0.72, 0.72, 1) }, { easing: 'quadIn' }).call(finish).start();
    });
  }

  private addWinRayHalo(parent: Node, x: number, y: number, color: Color, major: boolean): Node {
    const node = new Node('ChampagneRayHalo'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(1060, 1060); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); const inner = major ? 145 : 120; const outer = major ? 490 : 420; const rays = major ? 24 : 18;
    for (let index = 0; index < rays; index += 1) { const angle = Math.PI * 2 * index / rays; const spread = Math.PI / rays * 0.48; g.fillColor = index % 2 === 0 ? new Color(255, 222, 138, 38) : new Color(color.r, color.g, color.b, 24); g.moveTo(Math.cos(angle - spread) * inner, Math.sin(angle - spread) * inner); g.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); g.lineTo(Math.cos(angle + spread) * inner, Math.sin(angle + spread) * inner); g.close(); g.fill(); }
    g.strokeColor = new Color(255, 224, 143, 135); g.lineWidth = 3; g.circle(0, 0, inner - 18); g.stroke(); g.strokeColor = new Color(color.r, color.g, color.b, 105); g.lineWidth = 2; g.circle(0, 0, inner + 17); g.stroke(); return node;
  }

  private addWinLightCurtain(parent: Node, color: Color, major: boolean, duration: number): void {
    const curtain = new Node('WinLightCurtain'); curtain.layer = Layers.Enum.UI_2D; curtain.addComponent(UITransform).setContentSize(W, H); parent.addChild(curtain); curtain.setSiblingIndex(0); const opacity = curtain.addComponent(UIOpacity); opacity.opacity = 0;
    const glow = curtain.addComponent(Graphics); const beamCount = major ? 9 : 7; const beamWidth = major ? 128 : 104;
    for (let index = 0; index < beamCount; index += 1) { const centerX = -430 + index * (860 / Math.max(1, beamCount - 1)); const lean = (index - (beamCount - 1) / 2) * 14; glow.fillColor = index % 2 === 0 ? new Color(255, 228, 148, major ? 19 : 12) : new Color(color.r, color.g, color.b, major ? 20 : 13); glow.moveTo(centerX - beamWidth / 2, 940); glow.lineTo(centerX + beamWidth / 2, 940); glow.lineTo(centerX + lean + beamWidth * 1.55, -760); glow.lineTo(centerX + lean - beamWidth * 1.55, -760); glow.close(); glow.fill(); }
    glow.fillColor = new Color(color.r, color.g, color.b, major ? 26 : 17); glow.ellipse(0, -258, major ? 475 : 405, major ? 128 : 98); glow.fill(); glow.strokeColor = new Color(255, 231, 157, major ? 88 : 54); glow.lineWidth = major ? 3 : 2; glow.ellipse(0, -258, major ? 420 : 360, major ? 92 : 74); glow.stroke();
    tween(opacity).to(0.18, { opacity: major ? 238 : 195 }, { easing: 'quadOut' }).delay(duration - 0.1).to(0.4, { opacity: 0 }, { easing: 'sineInOut' }).start();
    tween(curtain).to(duration * 0.52, { angle: major ? 4.5 : 2.8, scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' }).to(duration * 0.48, { angle: major ? -3.5 : -2.2, scale: Vec3.ONE }, { easing: 'sineInOut' }).start();
  }

  private addWinSceneSweeps(parent: Node, width: number, height: number, color: Color, major: boolean): void {
    const passes = major ? 3 : 2;
    for (let index = 0; index < passes; index += 1) { const stripe = new Node(`WinGlassSweep-${index}`); stripe.layer = Layers.Enum.UI_2D; stripe.addComponent(UITransform).setContentSize(120, height * 1.45); stripe.setPosition(-width * 0.7, 0); stripe.angle = -17; parent.addChild(stripe); const graphics = stripe.addComponent(Graphics); graphics.fillColor = index % 2 === 0 ? new Color(255, 247, 215, 34) : new Color(color.r, color.g, color.b, 30); graphics.rect(-60, -height, 120, height * 2); graphics.fill(); const opacity = stripe.addComponent(UIOpacity); opacity.opacity = 0; const delay = 0.24 + index * (major ? 0.72 : 0.9); tween(stripe).delay(delay).to(0.88, { position: new Vec3(width * 0.7, 0, 0) }, { easing: 'quadInOut' }).start(); tween(opacity).delay(delay).to(0.15, { opacity: 220 }, { easing: 'sineOut' }).delay(0.42).to(0.3, { opacity: 0 }, { easing: 'sineInOut' }).start(); }
  }

  private addWinStageFootlights(parent: Node, color: Color, radius: number, y: number): void {
    const rail = new Node('WinStageFootlights'); rail.layer = Layers.Enum.UI_2D; rail.addComponent(UITransform).setContentSize(radius * 2.2, 64); rail.setPosition(0, y); parent.addChild(rail); const railGraphics = rail.addComponent(Graphics); railGraphics.strokeColor = new Color(255, 222, 137, 155); railGraphics.lineWidth = 3; railGraphics.moveTo(-radius, 0); railGraphics.quadraticCurveTo(0, -22, radius, 0); railGraphics.stroke();
    for (let index = 0; index < 9; index += 1) { const lamp = new Node(`WinFootlight-${index}`); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(32, 32); const normalized = index / 8; const x = -radius + normalized * radius * 2; const arcY = -Math.sin(normalized * Math.PI) * 20; lamp.setPosition(x, arcY); rail.addChild(lamp); const g = lamp.addComponent(Graphics); g.fillColor = new Color(color.r, color.g, color.b, 42); g.circle(0, 0, 12); g.fill(); g.fillColor = index % 2 === 0 ? C.paleGold : this.mix(color, C.white, 0.42); g.circle(0, 0, 4.2); g.fill(); const opacity = lamp.addComponent(UIOpacity); opacity.opacity = 48; const delay = index * 0.055; tween(opacity).delay(delay).to(0.18, { opacity: 245 }, { easing: 'sineOut' }).to(0.5, { opacity: 72 }, { easing: 'sineInOut' }).delay(0.52).union().repeatForever().start(); }
  }

  private addWinAmountHalo(parent: Node, color: Color, major: boolean, y: number): Node {
    const node = new Node('WinAmountHalo'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(major ? 570 : 500, major ? 112 : 94); node.setPosition(0, y); parent.addChild(node); const g = node.addComponent(Graphics); const width = major ? 530 : 460; const height = major ? 88 : 72;
    g.fillColor = new Color(39, 10, 26, 170); g.roundRect(-width / 2, -height / 2, width, height, height / 2); g.fill(); g.fillColor = new Color(color.r, color.g, color.b, 24); g.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, height / 2 - 7); g.fill(); g.strokeColor = new Color(255, 231, 157, 215); g.lineWidth = 3; g.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, height / 2 - 3); g.stroke(); g.strokeColor = new Color(color.r, color.g, color.b, 155); g.lineWidth = 1.5; g.roundRect(-width / 2 + 11, -height / 2 + 11, width - 22, height - 22, height / 2 - 11); g.stroke(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 155; tween(opacity).to(0.75, { opacity: 235 }, { easing: 'sineInOut' }).to(0.95, { opacity: 150 }, { easing: 'sineInOut' }).union().repeatForever().start(); return node;
  }

  private async startAuto(): Promise<void> {
    if (this.autoSpin.active || this.autoStartPending) {
      this.autoStartPending = false; this.autoSpin.cancel(); this.setAutoIndicator(false); this.toast('Auto Spin will stop after this reel', C.muted); return;
    }
    this.autoStartPending = true; this.setAutoIndicator(true); this.toast('Auto Spin started • 10 spins', C.cyan);
    try {
      // Starting AUTO during a manual reel must wait for that reel to settle.
      // Treating quick-stop as a completed auto turn made the lamp flash off
      // and could consume all ten turns without launching ten real spins.
      await this.waitForSpinIdle();
      if (!this.autoStartPending || this.router.route !== 'game') return;
      this.autoStartPending = false;
      const count = await this.autoSpin.start(10, () => this.onSpin());
      if (this.router.route === 'game') this.toast(`Auto Spin completed ${count} spins`, C.cyan);
    } finally {
      this.autoStartPending = false; this.setAutoIndicator(false);
    }
  }

  private waitForSpinIdle(): Promise<void> {
    if (!this.spinning) return Promise.resolve();
    return new Promise((resolve) => this.spinIdleWaiters.push(resolve));
  }

  private releaseSpinIdleWaiters(): void {
    const waiters = this.spinIdleWaiters.splice(0, this.spinIdleWaiters.length);
    for (const resolve of waiters) resolve();
  }

  private resetInterruptedSpin(): void {
    this.stateMachine.reset();
    this.spinning = undefined;
    this.queuedSpin = false;
    this.releaseSpinIdleWaiters();
    this.setSpinButtonState('SPIN');
    if (this.winLabel?.node?.isValid) this.winLabel.string = '0';
    this.refreshBalance();
  }

  private async leaveGame(): Promise<void> {
    this.autoStartPending = false;
    if (this.autoSpin.active) this.autoSpin.cancel();
    this.setAutoIndicator(false);
    if (this.spinning) {
      this.queuedSpin = false;
      if (this.stateMachine.state === 'spinning') this.reelEngine?.quickStop();
      else this.skipWinPresentation?.();
      this.toast('Finishing current spin…', C.muted);
      await this.waitForSpinIdle();
    }
    if (this.router.route === 'game') this.router.go('home');
  }

  private toggleTurbo(): void {
    this.turbo = !this.turbo;
    this.setMachineSwitchIndicator(this.turboStatusLamp, this.turbo, 'turbo');
    this.toast(this.turbo ? 'Turbo ready for the next spin' : 'Turbo off', this.turbo ? C.cyan : C.muted);
  }

  private async toggleGameSound(): Promise<void> {
    const player = this.ensurePlayer();
    const sound = !player.settings.sound;
    const updated = await this.bootstrap.profile.updateSettings({ sound });
    if (!updated) { this.toast('Sound setting could not be saved', C.red); return; }
    this.audio.setEffects(sound);
    this.setMachineSwitchIndicator(this.soundStatusLamp, sound, 'sound');
    this.toast(sound ? 'Game sound on' : 'Game sound off', sound ? C.gold : C.muted);
  }

  private async updatePlayerSettings(settings: Partial<ReturnType<SkylightApp['ensurePlayer']>['settings']>, applied?: () => void): Promise<void> {
    const updated = await this.bootstrap.profile.updateSettings(settings); if (!updated) this.toast('Setting could not be saved', C.red); else applied?.(); if (this.router.route === 'settings') this.render('settings');
  }

  private showPaytable(): void {
    const modal = this.modal(900, 1250); const accent = this.themeColor(this.selectedGame.id); this.artTitle(modal, `${this.selectedGame.name} PAYTABLE`, 0, 510, 37, accent, 760);
    this.selectedGame.symbols.slice(0, 9).forEach((symbol, index) => { const y = 395 - index * 95; const pay = this.selectedGame.paytable[symbol.id]; const values = Object.entries(pay ?? {}).slice(0, 4).map(([count, value]) => `${count}× ${value}`).join('   ') || 'FEATURE SYMBOL'; this.addPremiumSymbol(modal, this.selectedGame, symbol.id, -375, y, 76, 'pulse', 245, index * 0.08); this.label(modal, symbol.label.toUpperCase(), -185, y, 22, C.white, true, 350); this.label(modal, values, 225, y, 20, C.paleGold, true, 400); });
    this.button(modal, 'CLOSE', 0, -520, 320, 64, () => this.closeModal(modal), 'secondary');
  }

  private showRules(): void {
    const modal = this.modal(900, 1270); const accent = this.themeColor(this.selectedGame.id); const heroIndex = GAME_CONFIGS.indexOf(this.selectedGame); const cover = this.addGameCoverArt(modal, heroIndex, 790, 210, true); cover.setPosition(0, 465);
    this.artTitle(modal, `${this.selectedGame.name} RULES`, 0, 495, 39, accent, 730); this.addStatusChip(modal, this.selectedGame.modeLabel, 0, 417, accent, 390);
    const feature = this.selectedGame.feature.replace(/-/g, ' ').toUpperCase(); const summary = this.panel(modal, 0, 305, 780, 140, 26, new Color(38, 13, 25, 246), accent, 2, false); this.label(summary, 'FEATURE', -280, 25, 19, C.paleGold, true, 180); this.label(summary, feature, 75, 25, 25, C.white, true, 500); this.label(summary, `SIMULATED RTP  ${(this.selectedGame.targetRtp * 100).toFixed(0)}%  •  VIRTUAL COINS ONLY`, 0, -31, 19, C.chrome, true, 700);
    const scatterCopy = this.selectedGame.feature === 'treasure-wheel' ? '3 WHEEL TICKETS OPEN THE PHYSICAL TREASURE WHEEL'
      : this.selectedGame.feature === 'blossom-cascade' ? 'CLUSTER WINS CAN CONTINUE WITH A RISING BLOOM MULTIPLIER'
        : this.selectedGame.feature === 'parade-wild' ? '3 PARADE TICKETS AWARD 6 ROAMING-WILD PARADE SPINS'
          : '6 LOCKED COINS TRIGGER LANTERN LOCK & RESPIN';
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
      const fit = width / texture.width; const logoScale = fit * 0.82; image.setScale(new Vec3(logoScale, logoScale, 1)); image.setPosition(0, 0); fallbackOpacity.opacity = 0;
      tween(opacity).to(0.28, { opacity: 255 }, { easing: 'quadOut' }).start();
      tween(image).to(1.75, { position: new Vec3(0, 4, 0), scale: new Vec3(logoScale * 1.018, logoScale * 1.018, 1) }, { easing: 'sineInOut' }).to(1.95, { position: Vec3.ZERO, scale: new Vec3(logoScale, logoScale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
    for (let index = 0; index < 3; index += 1) {
      const glint = new Node(`TitleLogoLightSweep-${index}`); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(48, 12); glint.setPosition((-0.34 + index * 0.34) * width, index % 2 ? -height * 0.2 : height * 0.23); root.addChild(glint); const g = glint.addComponent(Graphics); g.fillColor = index === 1 ? new Color(255, 255, 244, 215) : new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 205); g.roundRect(-24, -2.5, 48, 5, 2.5); g.fill(); g.fillColor = new Color(accent.r, accent.g, accent.b, 86); g.roundRect(-15, -5, 30, 10, 5); g.fill(); const glintOpacity = glint.addComponent(UIOpacity); glintOpacity.opacity = 0;
      tween(glintOpacity).delay(0.48 + index * 0.73).to(0.18, { opacity: 245 }, { easing: 'sineOut' }).to(0.42, { opacity: 0 }, { easing: 'sineInOut' }).delay(2.25 + index * 0.22).union().repeatForever().start();
      tween(glint).delay(index * 0.42).by(1.4, { angle: 180, scale: new Vec3(0.35, 0.35, 0) }).by(1.4, { angle: 180, scale: new Vec3(-0.35, -0.35, 0) }).union().repeatForever().start();
    }
    return root;
  }

  private addJackpotStrip(layout: CabinetLayout, readout: CabinetReadoutLayout): void {
    const values: Readonly<Record<GameId, string>> = {
      'golden-parade': '7,500×', 'blossom-fortune': '10,000×', 'lantern-treasure': '10,000×', 'treasure-wheel': '2,500×',
    };
    // Each generated marquee has different optical padding, so TOP WIN uses a
    // cabinet-specific baseline and contrast treatment instead of a formula.
    // The two-tier typography keeps the label and value legible on a 390px
    // phone while the translucent enamel rail still reads as cabinet hardware.
    const displayWidth = Math.min(500, layout.jackpotWidth - 20); const displayHeight = readout.topWinHeight;
    const node = new Node('GrandJackpotDisplay'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(displayWidth, displayHeight); node.setPosition(0, readout.topWinY); this.page.addChild(node);
    const onDark = readout.topWinSurface === 'dark'; const accent = this.themeColor(this.selectedGame.id); const g = node.addComponent(Graphics);
    g.fillColor = onDark ? new Color(57, 17, 23, 228) : new Color(91, 16, 29, 242); g.roundRect(-displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight, 22); g.fill();
    g.fillColor = new Color(accent.r, accent.g, accent.b, onDark ? 34 : 48); g.roundRect(-displayWidth / 2 + 8, -displayHeight / 2 + 8, displayWidth - 16, displayHeight * 0.45, 13); g.fill();
    g.strokeColor = onDark ? new Color(188, 119, 47, 248) : new Color(177, 102, 40, 250); g.lineWidth = 4; g.roundRect(-displayWidth / 2 + 2, -displayHeight / 2 + 2, displayWidth - 4, displayHeight - 4, 20); g.stroke();
    g.strokeColor = new Color(255, 232, 143, 245); g.lineWidth = 1.5; g.roundRect(-displayWidth / 2 + 7, -displayHeight / 2 + 7, displayWidth - 14, displayHeight - 14, 16); g.stroke();
    const outlineColor = new Color(30, 3, 12, 255);
    // Every cabinet now treats TOP WIN as a small piece of theme artwork,
    // rather than a pale utility label. The coloured underprint gives the
    // letters a hand-painted marquee edge while the dark outline preserves
    // legibility over both ivory and mahogany cabinet surfaces.
    const glowTitle = this.label(node, 'TOP WIN', -displayWidth * 0.24, -1, 38, readout.topWinGlowTone, true, displayWidth * 0.38); glowTitle.node.name = 'GrandTitleGlow'; glowTitle.enableWrapText = false; this.addLabelOutline(glowTitle, outlineColor, 7); const glowOpacity = glowTitle.node.addComponent(UIOpacity); glowOpacity.opacity = 96; tween(glowOpacity).to(0.9, { opacity: 174 }, { easing: 'sineInOut' }).to(1.1, { opacity: 76 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const title = this.label(node, 'TOP WIN', -displayWidth * 0.24, 1, 36, readout.topWinTitleTone, true, displayWidth * 0.38); title.node.name = 'GrandTitle'; title.enableWrapText = false; this.addLabelOutline(title, outlineColor, 4);
    const divider = new Node('GrandDivider'); divider.layer = Layers.Enum.UI_2D; divider.addComponent(UITransform).setContentSize(26, 34); node.addChild(divider); const dividerGraphics = divider.addComponent(Graphics); dividerGraphics.strokeColor = new Color(255, 220, 101, 210); dividerGraphics.lineWidth = 2; dividerGraphics.moveTo(0, -10); dividerGraphics.lineTo(0, 10); dividerGraphics.stroke(); dividerGraphics.strokeColor = new Color(255, 248, 215, 105); dividerGraphics.lineWidth = 5; dividerGraphics.moveTo(0, -6); dividerGraphics.lineTo(0, 6); dividerGraphics.stroke();
    const valueGlow = this.label(node, values[this.selectedGame.id], displayWidth * 0.24, -1, 41, readout.topWinGlowTone, true, displayWidth * 0.40); valueGlow.node.name = 'GrandValueGlow'; valueGlow.enableWrapText = false; this.addLabelOutline(valueGlow, outlineColor, 7); const valueGlowOpacity = valueGlow.node.addComponent(UIOpacity); valueGlowOpacity.opacity = 54; tween(valueGlowOpacity).delay(0.28).to(1.05, { opacity: 128 }, { easing: 'sineInOut' }).to(1.15, { opacity: 42 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const value = this.label(node, values[this.selectedGame.id], displayWidth * 0.24, 1, 39, readout.topWinValueTone, true, displayWidth * 0.40); value.node.name = 'GrandValue'; value.enableWrapText = false; this.addLabelOutline(value, outlineColor, 4);
    const glint = new Node('TopWinLightSweep'); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(54, displayHeight - 12); glint.setPosition(-displayWidth * 0.42, 0); glint.angle = -14; node.addChild(glint); const glintGraphics = glint.addComponent(Graphics); glintGraphics.fillColor = new Color(255, 253, 224, 48); glintGraphics.roundRect(-16, -displayHeight / 2, 32, displayHeight, 12); glintGraphics.fill(); glintGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 28); glintGraphics.roundRect(-27, -displayHeight / 2, 54, displayHeight, 16); glintGraphics.fill(); const glintOpacity = glint.addComponent(UIOpacity); glintOpacity.opacity = 0; tween(glint).delay(0.65).to(1.25, { position: new Vec3(displayWidth * 0.42, 0, 0) }, { easing: 'sineInOut' }).call(() => glint.setPosition(-displayWidth * 0.42, 0)).delay(2.25).union().repeatForever().start(); tween(glintOpacity).delay(0.65).to(0.18, { opacity: 190 }, { easing: 'sineOut' }).delay(0.64).to(0.28, { opacity: 0 }, { easing: 'sineInOut' }).delay(3.05).union().repeatForever().start();
  }

  private addMachineFeatureConsole(layout: CabinetLayout, accent: Color): void {
    if (this.selectedGame.id === 'golden-parade') { this.addParadeTrackConsole(layout, accent); return; }
    if (this.selectedGame.id === 'blossom-fortune') { this.addBloomMultiplierConsole(layout, accent); return; }
    if (this.selectedGame.id === 'lantern-treasure') { this.addLanternRespinConsole(layout, accent); return; }
    this.addTreasureWheelConsole(layout, accent);
  }

  private featureConsoleBase(name: string, x: number, y: number, width: number, height: number, accent: Color): Node {
    const node = new Node(name); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const g = node.addComponent(Graphics); g.fillColor = new Color(42, 14, 24, 220); g.roundRect(-width / 2, -height / 2, width, height, Math.min(24, height * 0.32)); g.fill();
    g.fillColor = new Color(accent.r, accent.g, accent.b, 25); g.roundRect(-width / 2 + 8, 1, width - 16, height / 2 - 9, Math.min(15, height * 0.2)); g.fill();
    g.strokeColor = new Color(117, 64, 34, 248); g.lineWidth = 5; g.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, Math.min(22, height * 0.29)); g.stroke();
    g.strokeColor = new Color(255, 224, 139, 224); g.lineWidth = 1.5; g.roundRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16, Math.min(16, height * 0.22)); g.stroke();
    return node;
  }

  private addParadeTrackConsole(layout: CabinetLayout, accent: Color): void {
    const node = this.featureConsoleBase('ParadeCoinConveyorConsole', 0, layout.featureY, layout.featureWidth, 96, accent);
    const title = this.label(node, 'ROAMING PARADE', -178, 21, 22, new Color(255, 233, 162), true, 230); this.addLabelOutline(title, C.outline, 3);
    const mode = this.label(node, '1024 WAYS', 192, 21, 21, C.white, true, 180); this.addLabelOutline(mode, C.outline, 3);
    for (let index = 0; index < 3; index += 1) {
      const lamp = new Node(`ParadeTicketLamp-${index}`); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(92, 30); lamp.setPosition(-112 + index * 112, -22); node.addChild(lamp); const g = lamp.addComponent(Graphics);
      g.fillColor = new Color(111, 52, 31, 242); g.roundRect(-43, -12, 86, 24, 12); g.fill(); g.strokeColor = new Color(255, 205, 105, 220); g.lineWidth = 2; g.roundRect(-40, -9, 80, 18, 9); g.stroke();
      g.fillColor = index === 0 ? new Color(255, 221, 112, 220) : new Color(accent.r, accent.g, accent.b, 92); g.circle(-27, 0, 5); g.fill();
      const label = this.label(lamp, index === 0 ? 'READY' : `TICKET ${index + 1}`, 8, 0, 14, C.white, true, 60); this.addLabelOutline(label, C.outline, 2);
      const opacity = lamp.addComponent(UIOpacity); opacity.opacity = 115 + index * 25; tween(opacity).delay(index * 0.32).to(0.85, { opacity: 245 }, { easing: 'sineInOut' }).to(1.15, { opacity: 118 }, { easing: 'sineInOut' }).union().repeatForever().start();
    }
  }

  private addBloomMultiplierConsole(layout: CabinetLayout, accent: Color): void {
    const rail = this.featureConsoleBase('BloomCascadeMultiplierRail', 388, 120, 118, 530, accent);
    const heading = this.label(rail, 'BLOOM\nCHAIN', 0, 205, 19, C.white, true, 94); heading.lineHeight = 23; this.addLabelOutline(heading, C.outline, 3);
    const multipliers = ['1×', '2×', '3×', '5×', '10×'];
    multipliers.forEach((copy, index) => {
      const y = 125 - index * 72; const bud = new Node(`BloomMultiplierBud-${index}`); bud.layer = Layers.Enum.UI_2D; bud.addComponent(UITransform).setContentSize(72, 56); bud.setPosition(0, y); rail.addChild(bud); const g = bud.addComponent(Graphics);
      const active = index === 0; g.fillColor = active ? new Color(71, 159, 105, 238) : new Color(54, 47, 40, 232); g.ellipse(0, 0, 34, 25); g.fill();
      g.strokeColor = active ? new Color(255, 235, 155, 250) : new Color(accent.r, accent.g, accent.b, 155); g.lineWidth = active ? 4 : 2; g.ellipse(0, 0, 31, 22); g.stroke();
      const label = this.label(bud, copy, 0, 0, 21, active ? C.white : C.muted, true, 62); this.addLabelOutline(label, C.outline, 3);
      if (active) { const opacity = bud.addComponent(UIOpacity); tween(opacity).to(0.9, { opacity: 220 }, { easing: 'sineInOut' }).to(1.1, { opacity: 255 }, { easing: 'sineInOut' }).union().repeatForever().start(); }
    });
    const footer = this.featureConsoleBase('BloomCascadeStatus', 0, layout.featureY, 440, 70, accent); const status = this.label(footer, 'CLUSTER PAYS  •  CASCADE READY', 0, 0, 21, new Color(233, 255, 227), true, 408); this.addLabelOutline(status, C.outline, 3);
  }

  private addLanternRespinConsole(layout: CabinetLayout, accent: Color): void {
    const node = this.featureConsoleBase('LanternHoldAndRespinConsole', 0, layout.featureY, layout.featureWidth, 112, accent);
    const title = this.label(node, 'LANTERN LOCK & RESPIN', 0, 33, 23, new Color(255, 220, 137), true, layout.featureWidth - 40); this.addLabelOutline(title, C.outline, 4);
    this.label(node, 'LOCK 6 COINS', -198, -22, 18, C.white, true, 170);
    for (let index = 0; index < 6; index += 1) {
      const coin = new Node(`LockedCoinMeter-${index}`); coin.layer = Layers.Enum.UI_2D; coin.addComponent(UITransform).setContentSize(44, 44); coin.setPosition(-91 + index * 42, -22); node.addChild(coin); const g = coin.addComponent(Graphics);
      g.fillColor = new Color(255, 179, 50, index === 0 ? 215 : 78); g.circle(0, 0, 14); g.fill(); g.strokeColor = new Color(255, 238, 164, 230); g.lineWidth = 2; g.circle(0, 0, 11); g.stroke();
      if (index === 0) { const opacity = coin.addComponent(UIOpacity); tween(opacity).to(0.75, { opacity: 150 }).to(0.95, { opacity: 255 }).union().repeatForever().start(); }
    }
    const life = this.label(node, 'RESPINS  ● ● ●', 214, -22, 18, new Color(255, 240, 187), true, 180); this.addLabelOutline(life, C.outline, 3);
  }

  private addTreasureWheelConsole(layout: CabinetLayout, accent: Color): void {
    const wheel = new Node('PhysicalTreasureWheelLiveOverlay'); wheel.layer = Layers.Enum.UI_2D; wheel.addComponent(UITransform).setContentSize(560, 560); wheel.setPosition(0, -520); this.page.addChild(wheel);
    const ring = new Node('TreasureWheelLightRing'); ring.layer = Layers.Enum.UI_2D; ring.addComponent(UITransform).setContentSize(520, 520); wheel.addChild(ring); const g = ring.addComponent(Graphics);
    for (let index = 0; index < 16; index += 1) { const angle = Math.PI * 2 * index / 16; const x = Math.cos(angle) * 226; const y = Math.sin(angle) * 226; g.fillColor = index % 2 ? new Color(accent.r, accent.g, accent.b, 154) : new Color(255, 234, 154, 210); g.circle(x, y, index % 2 ? 5 : 7); g.fill(); }
    g.strokeColor = new Color(255, 232, 155, 138); g.lineWidth = 3; g.circle(0, 0, 238); g.stroke(); const opacity = ring.addComponent(UIOpacity); opacity.opacity = 74; tween(ring).by(18, { angle: 360 }).repeatForever().start(); tween(opacity).to(1.1, { opacity: 188 }).to(1.35, { opacity: 62 }).union().repeatForever().start();
    const pointer = new Node('WheelPointer'); pointer.layer = Layers.Enum.UI_2D; pointer.addComponent(UITransform).setContentSize(70, 70); pointer.setPosition(0, 256); wheel.addChild(pointer); const pg = pointer.addComponent(Graphics); pg.fillColor = new Color(255, 228, 142, 248); pg.moveTo(0, -30); pg.lineTo(-18, 18); pg.lineTo(18, 18); pg.close(); pg.fill(); pg.strokeColor = new Color(108, 53, 29, 255); pg.lineWidth = 4; pg.moveTo(0, -27); pg.lineTo(-15, 16); pg.lineTo(15, 16); pg.close(); pg.stroke(); tween(pointer).to(0.45, { angle: -5 }, { easing: 'sineInOut' }).to(0.52, { angle: 5 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const meter = this.featureConsoleBase('TreasureWheelTicketMeter', 0, layout.featureY, layout.featureWidth, 74, accent); const label = this.label(meter, '3 TICKETS  →  SPIN THE PHYSICAL WHEEL', 0, 0, 21, C.white, true, layout.featureWidth - 28); this.addLabelOutline(label, C.outline, 3);
  }

  private machineReadout(title: string, value: string, x: number, y: number, width: number, height: number, fontSize: number, prominent = false): Label {
    const node = new Node(`${title}Readout`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const onDark = this.selectedGame.id === 'lantern-treasure'; const outline = onDark ? new Color(38, 14, 16, 255) : new Color(255, 229, 151, 250);
    const winSymbol = this.selectedGame.symbols.find((symbol) => symbol.tier === 'high')?.id ?? this.selectedGame.wildId; this.addPremiumSymbol(node, this.selectedGame, winSymbol, -width / 2 + 24, 0, 34, 'pulse', 220);
    const labelColor = onDark ? new Color(255, 250, 220) : prominent ? new Color(150, 8, 38) : new Color(4, 82, 60); const label = this.label(node, value, 14, 0, Math.max(38, fontSize + 15), labelColor, true, width - 44); label.node.name = 'ReadoutText'; this.addLabelOutline(label, outline, onDark ? 4 : 3); return label;
  }

  private machineBalanceReadout(value: string, y: number, width: number, height: number, fontSize: number, surface: 'light' | 'dark'): Label {
    const node = new Node('CREDITSReadout'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(0, y); this.page.addChild(node);
    const iconWidth = 58; const topUpWidth = 54; const valueWidth = width - iconWidth - topUpWidth - 8;
    const onDark = surface === 'dark'; const valueColor = onDark ? new Color(255, 250, 226) : new Color(7, 69, 57); const outline = onDark ? new Color(28, 18, 14, 255) : new Color(255, 224, 130, 250);
    // The manufactured balance rail belongs above the reels on every F6 cabinet.
    // A thin enamel-and-brass insert keeps it consistent and readable.
    const g = node.addComponent(Graphics); const inset = 3; const railHeight = height - 6;
    g.fillColor = onDark ? new Color(75, 23, 25, 242) : new Color(244, 228, 183, 244); g.roundRect(-width / 2, -railHeight / 2, width, railHeight, 24); g.fill();
    g.strokeColor = new Color(119, 68, 35, 250); g.lineWidth = 6; g.roundRect(-width / 2 + inset, -railHeight / 2 + inset, width - inset * 2, railHeight - inset * 2, 21); g.stroke();
    g.strokeColor = C.paleGold; g.lineWidth = 2; g.roundRect(-width / 2 + 7, -railHeight / 2 + 7, width - 14, railHeight - 14, 17); g.stroke();
    g.strokeColor = new Color(onDark ? 239 : 255, onDark ? 183 : 250, onDark ? 92 : 220, 165); g.lineWidth = 1; g.moveTo(-width / 2 + 30, railHeight / 2 - 10); g.lineTo(width / 2 - 30, railHeight / 2 - 10); g.stroke();
    this.addPremiumSymbol(node, GAME_CONFIGS[0], 'coin-fan', -width / 2 + 31, 0, 48, 'pulse', 245);
    const valueX = -width / 2 + iconWidth + valueWidth / 2; const label = this.label(node, value, valueX, 0, Math.max(44, fontSize + 20), valueColor, true, valueWidth); label.node.name = 'ReadoutText'; this.addLabelOutline(label, outline, onDark ? 3 : 2);
    const topUp = this.button(node, '+', width / 2 - 29, 0, 50, 50, () => this.showQuickTopUp(), 'lobby-secondary'); topUp.name = 'CreditsTopUpButton'; return label;
  }

  private machineBetReadout(value: string, x: number, y: number, width: number, fontSize: number, tone: Color): Label {
    const height = 58; const node = new Node('BETReadout'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const g = node.addComponent(Graphics); g.fillColor = new Color(tone.r, tone.g, tone.b, 202); g.roundRect(-width / 2, -height / 2, width, height, 21); g.fill(); g.strokeColor = new Color(137, 76, 40, 205); g.lineWidth = 4; g.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 18); g.stroke(); g.strokeColor = new Color(255, 219, 128, 205); g.lineWidth = 1.5; g.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, 15); g.stroke();
    const betSymbol = this.selectedGame.id === 'golden-parade' ? 'coin-fan' : this.selectedGame.id === 'blossom-fortune' ? 'coin-blossom' : this.selectedGame.id === 'lantern-treasure' ? 'coin-stack' : 'gold-coin'; this.addPremiumSymbol(node, this.selectedGame, betSymbol, -width * 0.31, 0, 40, 'pulse', 230);
    const label = this.label(node, value, width * 0.14, 0, Math.max(38, fontSize + 14), new Color(255, 249, 218), true, width * 0.58); label.node.name = 'ReadoutText'; this.addLabelOutline(label, new Color(40, 4, 12, 255), 3); return label;
  }

  private machineButton(text: string, x: number, y: number, width: number, height: number, action: () => void, kind: 'spin' | 'step' | 'switch' | 'switch-on' | 'key' | 'tool', icon: MachineControlIcon): Node {
    const node = new Node(`MachineButton-${kind}`); node.layer = Layers.Enum.UI_2D;
    // Keep the manufactured art unchanged while giving the primary control a
    // forgiving 196×196 logical hit target. This absorbs small finger drift
    // on tall phones without colliding with the neighbouring cabinet keys.
    const hitWidth = icon === 'spin' ? Math.max(220, width) : icon === 'auto' ? Math.max(116, width) : width; const hitHeight = icon === 'spin' ? Math.max(220, height) : icon === 'auto' ? Math.max(116, height) : height;
    node.addComponent(UITransform).setContentSize(hitWidth, hitHeight); node.setPosition(x, y); this.page.addChild(node); const accent = this.themeColor(this.selectedGame.id);
    const floatingTool = icon === 'home' || icon === 'sound' || icon === 'rules';
    if (floatingTool) this.addMachineBackPlate(node, width, height, accent); else this.addMachineKeyEmphasis(node, width, height, kind, accent);
    const labelY = kind === 'spin' ? -height * 0.33 : -height * 0.37;
    const plaqueWidth = Math.min(kind === 'spin' ? 100 : 94, Math.max(76, width + 2));
    const plaqueHeight = 34;
    const plaque = new Node('MachineLabelPlaque'); plaque.layer = Layers.Enum.UI_2D; plaque.addComponent(UITransform).setContentSize(plaqueWidth, plaqueHeight); plaque.setPosition(0, labelY); node.addChild(plaque);
    const plaqueGraphics = plaque.addComponent(Graphics); plaqueGraphics.fillColor = new Color(74, 15, 25, 244); plaqueGraphics.roundRect(-plaqueWidth / 2, -plaqueHeight / 2, plaqueWidth, plaqueHeight, 11); plaqueGraphics.fill(); plaqueGraphics.strokeColor = new Color(255, 220, 137, 238); plaqueGraphics.lineWidth = 2; plaqueGraphics.roundRect(-plaqueWidth / 2 + 2, -plaqueHeight / 2 + 2, plaqueWidth - 4, plaqueHeight - 4, 9); plaqueGraphics.stroke();
    const displayText = icon === 'sound' ? 'SOUND' : text;
    const label = this.label(plaque, displayText, 0, 0, kind === 'spin' ? 24 : 21, new Color(255, 250, 224), true, plaqueWidth - 8); label.node.name = 'Text'; label.enableWrapText = false; this.addLabelOutline(label, new Color(42, 4, 13, 255), 3);
    const iconNode = this.addMachineControlIcon(node, width, height, icon, kind === 'switch-on');
    if (kind === 'switch' || kind === 'switch-on') { const lamp = new Node('MachineStatusLamp'); lamp.layer = Layers.Enum.UI_2D; lamp.addComponent(UITransform).setContentSize(34, 34); lamp.setPosition(width * 0.32, height * 0.31); node.addChild(lamp); lamp.addComponent(Graphics); this.paintMachineStatusLamp(lamp, kind === 'switch-on'); }
    // The cabinet bezel is part of the photographed machine and must never
    // move. Cocos' SCALE transition shrank the whole logical hit target,
    // including the manufactured key edge, so on press it appeared to crush
    // into the surrounding cabinet frame. Keep that outer geometry fixed and
    // animate only the cap artwork and its caption.
    const button = node.addComponent(Button); button.transition = Button.Transition.NONE; button.interactable = true;
    const iconRestY = iconNode.position.y; const plaqueRestY = plaque.position.y;
    const pressCap = (): void => {
      Tween.stopAllByTarget(iconNode); Tween.stopAllByTarget(plaque);
      tween(iconNode).to(0.065, { position: new Vec3(iconNode.position.x, iconRestY - 3, 0), scale: new Vec3(0.955, 0.955, 1) }, { easing: 'sineOut' }).start();
      tween(plaque).to(0.065, { position: new Vec3(plaque.position.x, plaqueRestY - 2, 0), scale: new Vec3(0.975, 0.975, 1) }, { easing: 'sineOut' }).start();
    };
    const releaseCap = (): void => {
      Tween.stopAllByTarget(iconNode); Tween.stopAllByTarget(plaque);
      tween(iconNode).to(0.16, { position: new Vec3(iconNode.position.x, iconRestY, 0), scale: Vec3.ONE }, { easing: 'backOut' }).start();
      tween(plaque).to(0.16, { position: new Vec3(plaque.position.x, plaqueRestY, 0), scale: Vec3.ONE }, { easing: 'backOut' }).start();
    };
    let actionLocked = false; const invokeAction = (): void => {
      if (actionLocked) return; actionLocked = true; action(); this.scheduleOnce(() => { actionLocked = false; }, 0.1);
    };
    node.on(Node.EventType.TOUCH_START, () => {
      this.audio?.play('tap'); this.audio?.vibrate(10); pressCap();
      // SPIN and AUTO are the two time-critical cabinet controls. Fire them on
      // press so a small finger drift cannot cause Cocos' completed-click
      // gesture to disappear before the action is dispatched.
      if (icon === 'spin' || icon === 'auto') invokeAction();
    }, this);
    node.on(Node.EventType.TOUCH_END, releaseCap, this);
    node.on(Node.EventType.TOUCH_CANCEL, releaseCap, this);
    if (icon !== 'spin' && icon !== 'auto') node.on(Button.EventType.CLICK, invokeAction, this); return node;
  }

  private setSpinButtonState(state: 'SPIN' | 'STOP' | 'WAIT' | 'NEXT'): void {
    const label = this.spinButtonLabel; if (!label?.node?.isValid) return;
    label.string = state;
    // The generated SPIN cap already carries finished typography. Keep the
    // runtime plaque hidden at rest, then reveal it only for live machine state
    // that the static cap cannot communicate (WAIT, STOP or queued NEXT).
    const plaque = label.node.parent; const buttonRoot = plaque?.parent;
    const art = buttonRoot?.getChildByName('ControlIcon-spin')?.getChildByName('ControlAtlasClip')?.getChildByName('ControlAtlasImage')?.getComponent(Sprite);
    if (plaque) plaque.active = state !== 'SPIN' || !art?.spriteFrame;
  }

  private paintMachineStatusLamp(lamp: Node, active: boolean): void {
    const g = lamp.getComponent(Graphics); if (!g) return; g.clear();
    if (active) { g.fillColor = new Color(52, 255, 104, 92); g.circle(0, 0, 16); g.fill(); g.fillColor = new Color(12, 83, 39, 248); g.circle(0, 0, 11.5); g.fill(); }
    g.fillColor = active ? new Color(75, 255, 118, 255) : new Color(118, 52, 57, 255); g.circle(0, 0, active ? 9 : 7); g.fill();
    g.strokeColor = active ? new Color(239, 255, 205, 255) : C.paleGold; g.lineWidth = active ? 3 : 1.5; g.circle(0, 0, active ? 10.5 : 7); g.stroke();
    if (active) { g.fillColor = new Color(255, 255, 236, 255); g.circle(-3, 3, 2.6); g.fill(); }
  }

  private setAutoIndicator(active: boolean): void {
    const lamp = this.autoStatusLamp; if (!lamp?.isValid) return;
    Tween.stopAllByTarget(lamp); lamp.setScale(Vec3.ONE); this.paintMachineStatusLamp(lamp, active);
    const buttonRoot = lamp.parent; const plaqueText = buttonRoot?.getChildByName('MachineLabelPlaque')?.getChildByName('Text')?.getComponent(Label); if (plaqueText) plaqueText.color = active ? new Color(135, 255, 159) : new Color(255, 250, 224);
    const atlasSprite = buttonRoot?.getChildByName('ControlIcon-auto')?.getChildByName('ControlAtlasClip')?.getChildByName('ControlAtlasImage')?.getComponent(Sprite); if (atlasSprite) atlasSprite.color = active ? new Color(205, 255, 213) : Color.WHITE;
    if (active) tween(lamp).to(0.52, { scale: new Vec3(1.24, 1.24, 1) }, { easing: 'sineInOut' }).to(0.64, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private setMachineSwitchIndicator(lamp: Node | undefined, active: boolean, icon: 'turbo' | 'sound'): void {
    if (!lamp?.isValid) return;
    Tween.stopAllByTarget(lamp); lamp.setScale(Vec3.ONE); this.paintMachineStatusLamp(lamp, active);
    const buttonRoot = lamp.parent;
    const plaqueText = buttonRoot?.getChildByName('MachineLabelPlaque')?.getChildByName('Text')?.getComponent(Label);
    if (plaqueText) plaqueText.color = active ? new Color(135, 255, 159) : new Color(255, 250, 224);
    const atlasSprite = buttonRoot?.getChildByName(`ControlIcon-${icon}`)?.getChildByName('ControlAtlasClip')?.getChildByName('ControlAtlasImage')?.getComponent(Sprite);
    if (atlasSprite) atlasSprite.color = active ? new Color(205, 255, 213) : Color.WHITE;
    if (active) tween(lamp).to(0.52, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'sineInOut' }).to(0.64, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
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
    g.fillColor = new Color(70, 17, 27, 246); g.roundRect(-width / 2, -height / 2, width, height, 9); g.fill(); g.strokeColor = new Color(150, 82, 45, 250); g.lineWidth = 4; g.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 8); g.stroke(); g.strokeColor = accent; g.lineWidth = 1.5; g.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 7); g.stroke();
    g.fillColor = accent; g.circle(-width / 2 + 8, 0, 2.5); g.fill(); g.circle(width / 2 - 8, 0, 2.5); g.fill();
    const label = this.label(plate, caption, 0, 0, 16, C.white, true, width - 10); label.enableWrapText = false; label.node.name = 'CaptionText'; this.addLabelOutline(label, C.outline, 2);
  }

  private addMachineControlIcon(parent: Node, width: number, height: number, icon: MachineControlIcon, active: boolean): Node {
    const unit = Math.min(width, height); const utility = icon === 'home' || icon === 'sound' || icon === 'rules';
    // The generated atlas cells retain generous transparent cutting margins.
    // Scale the finished caps past their logical key size so their metal lips
    // seat into the photographed sockets instead of hovering as tiny badges.
    const visualSize = unit * (icon === 'spin' ? 1.02 : utility ? 1.08 : 1.18);
    const node = new Node(`ControlIcon-${icon}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(visualSize, visualSize); node.setPosition(0, utility ? 0 : icon === 'spin' ? height * 0.04 : -height * 0.015); parent.addChild(node);
    // The four control atlases deliberately use different silhouettes
    // (round, octagonal, scalloped and hexagonal). A circular runtime mask
    // made them all look identical and clipped their manufactured edges.
    const clip = new Node('ControlAtlasClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(visualSize, visualSize); node.addChild(clip);
    const image = new Node('ControlAtlasImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(visualSize, visualSize); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const fallback = new Node('ControlFallback'); fallback.layer = Layers.Enum.UI_2D; fallback.addComponent(UITransform).setContentSize(visualSize, visualSize); node.addChild(fallback); const fallbackGraphics = fallback.addComponent(Graphics); fallbackGraphics.fillColor = new Color(82, 17, 28, 248); fallbackGraphics.circle(0, 0, visualSize * 0.44); fallbackGraphics.fill(); fallbackGraphics.strokeColor = C.paleGold; fallbackGraphics.lineWidth = Math.max(2, visualSize * 0.04); fallbackGraphics.circle(0, 0, visualSize * 0.42); fallbackGraphics.stroke();
    // Functional captions remain visible below the control while its atlas is
    // loading. Avoid flashing text glyphs such as ↻, ♪ or ⌂ that read as cheap
    // placeholder icons before the cabinet-specific artwork arrives.
    const gameId = this.selectedGame.id;
    const applyFrame = (): void => {
      if (!node.isValid || !image.isValid) return; const frame = MachineControlAtlasCache.frame(gameId, icon); if (!frame) return;
      sprite.spriteFrame = frame; opacity.opacity = active ? 255 : 238; fallback.active = false;
      // Finished atlas keys include their own engraved captions. The generated
      // art should read as one manufactured control, not as a button with a
      // second label pasted beneath it. SPIN can temporarily reveal the plaque
      // when its state changes to WAIT / STOP / NEXT.
      const plaque = parent.getChildByName('MachineLabelPlaque'); const copy = plaque?.getChildByName('Text')?.getComponent(Label);
      if (plaque && (icon !== 'spin' || copy?.string === 'SPIN')) plaque.active = false;
    };
    applyFrame(); MachineControlAtlasCache.preload(gameId, applyFrame);
    return node;
  }

  private topBar(title = 'HOME'): void {
    const player = this.ensurePlayer(); const y = this.topY(800);
    const identity = this.panel(this.page, -350, y, 330, 104, 34, new Color(50, 20, 34, 242), LOBBY.rubyLight, 2, false); identity.name = 'FortuneIdentityPod';
    this.avatar(identity, -112, 0, player.avatar, 76); const displayName = this.label(identity, title === 'HOME' ? player.nickname : title, 36, 16, 25, LOBBY.ivory, true, 205); this.addLabelOutline(displayName, LOBBY.ink, 3);
    const clubLine = this.label(identity, player.isGuest ? 'GUEST PASS' : title === 'HOME' ? `LEVEL ${player.level} • CARNIVAL PASS` : 'FORTUNE BLOOM', 36, -20, 16, player.isGuest ? LOBBY.champagne : LOBBY.muted, true, 205); this.addLabelOutline(clubLine, LOBBY.ink, 2);
    const emblem = this.addBrandEmblem(this.page, 0, y, 94); emblem.name = 'TopFortuneBloomSeal';
    if (title === 'HOME') {
      const mail = this.button(this.page, '', -142, y, 72, 72, () => this.router.go('mail'), 'ghost'); mail.name = 'TopMailButton'; this.addInterfaceControlIcon(mail, 'mail', 0, 0, 35, C.white, this.bootstrap.redDots.mail() > 0 ? C.red : C.cyan);
    }
    const wallet = this.panel(this.page, 350, y, 330, 104, 34, new Color(50, 20, 34, 246), LOBBY.gold, 2, false); wallet.name = 'FortuneWalletPod';
    this.addPremiumSymbol(wallet, GAME_CONFIGS[0], 'coin-fan', -112, 0, 60, 'pulse', 255); this.balanceLabel = this.label(wallet, this.format(player.credits), 8, 15, 30, LOBBY.champagne, true, 176); this.addLabelOutline(this.balanceLabel, LOBBY.ink, 3);
    const walletLine = this.label(wallet, player.isGuest ? 'PLAY COINS' : 'VIRTUAL COINS', 8, -22, 16, LOBBY.muted, true, 176); this.addLabelOutline(walletLine, LOBBY.ink, 2);
    this.button(wallet, '+', 126, 0, 58, 58, () => this.showQuickTopUp(), player.isGuest ? 'ghost' : 'lobby-secondary');
  }

  private header(title: string, back: boolean, showBalance = false): void {
    const bar = this.panel(this.page, 0, this.topY(800), 1020, 120, 26, LOBBY.panel, LOBBY.gold, 1);
    if (back) this.navigationBackButton(bar, () => this.router.route === 'game' ? this.router.reset('home') : this.router.back('home')); this.label(bar, title, 0, 0, 30, C.paleGold, true, 650);
    if (showBalance) { this.addPremiumSymbol(bar, GAME_CONFIGS[0], 'coin-fan', 275, 0, 42, 'pulse', 230); this.balanceLabel = this.label(bar, this.format(this.bootstrap.economy.balance()), 380, 0, 21, C.white, true, 190); }
  }

  private navigationBackButton(parent: Node, action: () => void): void {
    this.button(parent, 'BACK', -395, 0, 176, 62, action, 'ghost');
  }

  private bottomNav(active: 'home' | 'store' | 'rewards' | 'rank' | 'profile'): void {
    const barY = -SafeAreaAdapter.visibleHeight / 2 + NAV_H / 2 + SafeAreaAdapter.safeBottom; const bar = this.panel(this.navigation, 0, barY, 920, 126, 46, new Color(45, 17, 31, 250), LOBBY.gold, 2, false); bar.name = 'SkylightOrbitDock';
    const rail = new Node('OrbitDockRail'); rail.layer = Layers.Enum.UI_2D; rail.addComponent(UITransform).setContentSize(820, 74); rail.setPosition(0, 8); bar.addChild(rail); const railGraphics = rail.addComponent(Graphics); railGraphics.strokeColor = new Color(126, 200, 200, 112); railGraphics.lineWidth = 2; railGraphics.arc(0, -140, 385, 0.22, Math.PI - 0.22, false); railGraphics.stroke();
    const items: readonly [typeof active, string, Route][] = [['home', 'HOME', 'home'], ['store', 'STORE', 'store'], ['rewards', 'REWARDS', 'rewards'], ['rank', 'RANK', 'rank'], ['profile', 'PROFILE', 'profile']];
    const art: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'bloom-wild'], [GAME_CONFIGS[0], 'coin-fan'], [GAME_CONFIGS[1], 'jewel-peony'], [GAME_CONFIGS[3], 'prize-wheel'], [GAME_CONFIGS[2], 'lantern-chest']];
    items.forEach(([id, text, route], index) => {
      const x = -348 + index * 174; const raised = id === active ? 14 : index === 2 ? 5 : 0; const item = new Node(`OrbitNav-${id}`); item.layer = Layers.Enum.UI_2D; item.addComponent(UITransform).setContentSize(150, 106); item.setPosition(x, raised); bar.addChild(item);
      const visual = new Node('OrbitNavCap'); visual.layer = Layers.Enum.UI_2D; visual.addComponent(UITransform).setContentSize(150, 106); item.addChild(visual);
      const g = visual.addComponent(Graphics); if (id === active) { g.fillColor = new Color(74, 34, 51, 252); g.circle(0, 17, 43); g.fill(); g.strokeColor = LOBBY.champagne; g.lineWidth = 3; g.circle(0, 17, 40); g.stroke(); } else { g.fillColor = new Color(255, 244, 205, 24); g.roundRect(-68, -45, 136, 88, 30); g.fill(); }
      this.addPremiumSymbol(visual, art[index][0], art[index][1], 0, 19, id === active ? 67 : 56, id === active ? 'pulse' : 'none', id === active ? 255 : 184, index * 0.08);
      const navLabel = this.label(visual, text, 0, -38, id === active ? 21 : 19, id === active ? LOBBY.champagne : LOBBY.muted, true, 142); this.addLabelOutline(navLabel, LOBBY.ink, 3);
      const navButton = item.addComponent(Button); navButton.transition = Button.Transition.NONE;
      const releaseNav = (): void => { Tween.stopAllByTarget(visual); tween(visual).to(0.16, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'backOut' }).start(); };
      item.on(Node.EventType.TOUCH_START, () => { Tween.stopAllByTarget(visual); tween(visual).to(0.065, { position: new Vec3(0, -3, 0), scale: new Vec3(0.965, 0.965, 1) }, { easing: 'sineOut' }).start(); }, this);
      item.on(Node.EventType.TOUCH_END, releaseNav, this); item.on(Node.EventType.TOUCH_CANCEL, releaseNav, this);
      item.on(Button.EventType.CLICK, () => { if (this.router.route !== route) this.router.reset(route); }, this);
    });
    this.addPanelImageBorder(bar, 920, 126, 0, 220);
  }

  private playPageReveal(): void {
    const pageOpacity = this.page.getComponent(UIOpacity) ?? this.page.addComponent(UIOpacity); const navOpacity = this.navigation.getComponent(UIOpacity) ?? this.navigation.addComponent(UIOpacity); const backdropOpacity = this.background.getComponent(UIOpacity) ?? this.background.addComponent(UIOpacity);
    Tween.stopAllByTarget(this.page); Tween.stopAllByTarget(pageOpacity); Tween.stopAllByTarget(navOpacity); Tween.stopAllByTarget(backdropOpacity);
    // Preserve exact cabinet geometry throughout the transition: only opacity
    // and a restrained 12 px vertical settle are animated. This avoids the
    // former late-arriving borders while removing the abrupt clear-and-swap
    // between lobby destinations. The warm veil also hides asynchronous image
    // decoding without ever presenting a black frame.
    // Cocos already maps the 1080x1920 design space to the visible viewport.
    // Scaling the game page a second time made the live reels drift away from
    // the photographic apertures on tall phones and wide preview windows.
    const pageScale = 1;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.page.setScale(new Vec3(pageScale, pageScale, 1)); this.page.setPosition(reducedMotion ? Vec3.ZERO : new Vec3(0, -12, 0));
    if (reducedMotion) { pageOpacity.opacity = 255; navOpacity.opacity = 255; backdropOpacity.opacity = 255; return; }
    pageOpacity.opacity = 0; navOpacity.opacity = 0; backdropOpacity.opacity = 0;
    tween(backdropOpacity).to(0.38, { opacity: 255 }, { easing: 'sineInOut' }).start();
    tween(this.page).to(0.34, { position: Vec3.ZERO }, { easing: 'cubicOut' }).start();
    tween(pageOpacity).delay(0.035).to(0.3, { opacity: 255 }, { easing: 'sineOut' }).start();
    tween(navOpacity).delay(0.09).to(0.28, { opacity: 255 }, { easing: 'sineOut' }).start();
    const veil = new Node('ChampagneRouteTransition'); veil.layer = Layers.Enum.UI_2D; veil.addComponent(UITransform).setContentSize(SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight); this.overlay.addChild(veil); veil.setSiblingIndex(0); const g = veil.addComponent(Graphics);
    g.fillColor = new Color(255, 239, 195, 42); g.rect(-SafeAreaAdapter.visibleWidth / 2, -SafeAreaAdapter.visibleHeight / 2, SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight); g.fill();
    const veilOpacity = veil.addComponent(UIOpacity); veilOpacity.opacity = 190; tween(veilOpacity).to(0.36, { opacity: 0 }, { easing: 'sineInOut' }).call(() => { if (veil.isValid) veil.destroy(); }).start();
  }

  private addBrandEmblem(parent: Node, x: number, y: number, size: number): Node {
    const root = new Node('LuckySkylightEmblem'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(size, size); root.setPosition(x, y); parent.addChild(root);
    const fallback = this.label(root, '', 0, 0, Math.round(size * 0.58), C.gold, true, size); const fallbackOpacity = fallback.node.addComponent(UIOpacity);
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
    const accent = this.themeColor(GAME_CONFIGS[slot].id); for (let glintIndex = 0; glintIndex < 2; glintIndex += 1) { const glint = new Node(`CharacterLightAccent-${glintIndex}`); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(44, 12); glint.setPosition((glintIndex ? 1 : -1) * maxWidth * 0.36, maxHeight * (glintIndex ? 0.24 : -0.08)); root.addChild(glint); const graphics = glint.addComponent(Graphics); const light = glintIndex ? C.paleGold : accent; graphics.fillColor = new Color(light.r, light.g, light.b, 205); graphics.roundRect(-22, -2.5, 44, 5, 2.5); graphics.fill(); graphics.fillColor = new Color(255, 255, 242, 92); graphics.roundRect(-10, -5, 20, 10, 5); graphics.fill(); const glintOpacity = glint.addComponent(UIOpacity); glintOpacity.opacity = 0; tween(glintOpacity).delay(delay + 0.8 + glintIndex * 0.6).to(0.3, { opacity: Math.min(alpha, 205) }).to(0.5, { opacity: 0 }).delay(1.5).union().repeatForever().start(); tween(glint).delay(delay).by(2.4, { position: new Vec3(glintIndex ? -16 : 16, 7, 0), scale: new Vec3(0.22, 0.22, 0) }).by(2.4, { position: new Vec3(glintIndex ? 16 : -16, -7, 0), scale: new Vec3(-0.22, -0.22, 0) }).union().repeatForever().start(); }
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
    this.loadBackdrop(base, asset, width, height); this.loadRouteSceneBackdrop(base, asset, width, height); this.addAmbientLights(base, top, width, height); this.addRouteBackdropSignature(base, asset, width, height);
  }

  private loadBackdrop(parent: Node, asset: string, width: number, height: number): void {
    const paths: Record<string, string> = { boot: 'generated/common/fortune_bloom_lobby', login: 'generated/common/fortune_bloom_lobby', home: 'generated/common/fortune_bloom_lobby', store: 'generated/common/fortune_bloom_lobby', rewards: 'generated/common/fortune_bloom_lobby', rank: 'generated/common/fortune_bloom_lobby', profile: 'generated/common/fortune_bloom_lobby', wheel: 'generated/common/fortune_bloom_lobby' };
    const gamePaths: Record<string, string> = { 'game_golden-parade': 'generated/game01/cabinet_f6', 'game_blossom-fortune': 'generated/game02/cabinet_f6', 'game_lantern-treasure': 'generated/game03/cabinet_f6', 'game_treasure-wheel': 'generated/game04/cabinet_f6' };
    const dedicatedRouteScene = asset === 'store' || asset === 'rewards' || asset === 'rank' || asset === 'profile';
    const path = dedicatedRouteScene ? undefined : paths[asset] ?? gamePaths[asset]; if (!path) return;
    const gameBackground = asset.startsWith('game_');
    if (gameBackground) {
      // The scenic layer fills non-portrait margins. The cabinet itself is
      // fitted to the 1920-high design stage below, never cover-cropped.
      resources.load('generated/common/fortune_bloom_lobby/texture', Texture2D, (error, texture) => {
        if (error || !texture || !parent.isValid) return;
        const frame = new SpriteFrame(); frame.texture = texture; const environment = new Node('CabinetEnvironmentBackdrop'); environment.layer = Layers.Enum.UI_2D; const sprite = environment.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const transform = environment.getComponent(UITransform) as UITransform; transform.setContentSize(texture.width, texture.height);
        const scale = Math.max(width / texture.width, height / texture.height) * 1.02; environment.setScale(new Vec3(scale, scale, 1)); parent.addChild(environment); environment.setSiblingIndex(0); const opacity = environment.addComponent(UIOpacity); opacity.opacity = 210;
        tween(environment).to(8.5, { position: new Vec3(12, 7, 0), scale: new Vec3(scale * 1.012, scale * 1.012, 1) }, { easing: 'sineInOut' }).to(8.5, { position: new Vec3(-12, -7, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
      });
    }
    resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !parent.isValid) return;
      const frame = new SpriteFrame(); frame.texture = texture; const node = new Node('GeneratedBackdrop'); node.layer = Layers.Enum.UI_2D; const sprite = node.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const transform = node.getComponent(UITransform) as UITransform;
      const scale = gameBackground
        ? H / texture.height
        : Math.max(width / texture.width, height / texture.height) * 1.025;
      node.setScale(new Vec3(scale, scale, 1)); parent.addChild(node); node.setSiblingIndex(gameBackground ? Math.min(1, parent.children.length - 1) : 0); transform.setContentSize(texture.width, texture.height); const opacity = node.addComponent(UIOpacity); opacity.opacity = gameBackground ? 255 : 246;
      if (!gameBackground) {
        tween(node).to(7, { position: new Vec3(10, 7, 0), scale: new Vec3(scale * 1.015, scale * 1.015, 1) }, { easing: 'sineInOut' }).to(7, { position: new Vec3(-10, -7, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
        tween(opacity).to(3.8, { opacity: 255 }, { easing: 'sineInOut' }).to(4.2, { opacity: 242 }, { easing: 'sineInOut' }).union().repeatForever().start();
      }
    });
  }

  private loadRouteSceneBackdrop(parent: Node, asset: string, width: number, height: number): void {
    // Lobby destinations now have their own photographic focal point instead
    // of sharing one generic hall with differently coloured vector overlays.
    // The atlas contains finished high-resolution casino scenes, so the page
    // still feels like the same property while STORE, REWARDS, RANK and
    // PROFILE read as genuinely different rooms. LOGIN deliberately keeps the
    // uncluttered photographic atrium so the form remains the first action.
    const scenes: Partial<Record<string, {
      readonly game: GameId; readonly opacity: number; readonly x: number; readonly y: number;
      readonly grade: Color; readonly gradeAlpha: number; readonly driftX: number;
    }>> = {
      store: { game: 'lantern-treasure', opacity: 232, x: 0, y: -42, grade: new Color(78, 44, 38), gradeAlpha: 48, driftX: -12 },
      rewards: { game: 'blossom-fortune', opacity: 232, x: 0, y: -78, grade: new Color(34, 66, 52), gradeAlpha: 45, driftX: 12 },
      rank: { game: 'golden-parade', opacity: 228, x: 0, y: 76, grade: new Color(83, 51, 27), gradeAlpha: 46, driftX: -10 },
      profile: { game: 'treasure-wheel', opacity: 220, x: 0, y: -24, grade: new Color(34, 65, 76), gradeAlpha: 52, driftX: 11 },
    };
    const scene = scenes[asset]; if (!scene) return;
    const image = new Node(`RouteSceneBackdrop-${asset}`); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(627, 627); image.setPosition(scene.x, scene.y); parent.addChild(image); image.setSiblingIndex(Math.min(1, parent.children.length - 1));
    const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.RAW; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const applyFrame = (): void => {
      if (!image.isValid) return; const frame = GameCoverAtlasCache.frame(scene.game); if (!frame) return;
      sprite.spriteFrame = frame; const frameWidth = Math.max(1, frame.rect.width); const frameHeight = Math.max(1, frame.rect.height); image.getComponent(UITransform)?.setContentSize(frameWidth, frameHeight);
      const scale = Math.max(width / frameWidth, height / frameHeight) * 1.08; image.setScale(new Vec3(scale, scale, 1));
      if (reducedMotion) { opacity.opacity = scene.opacity; return; }
      tween(opacity).to(0.42, { opacity: scene.opacity }, { easing: 'sineOut' }).start();
      tween(image)
        .to(7.6, { position: new Vec3(scene.x + scene.driftX, scene.y + 12, 0), scale: new Vec3(scale * 1.018, scale * 1.018, 1) }, { easing: 'sineInOut' })
        .to(8.2, { position: new Vec3(scene.x - scene.driftX, scene.y - 8, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' })
        .union().repeatForever().start();
    };
    applyFrame(); GameCoverAtlasCache.load(applyFrame);

    // A restrained colour grade unifies the photograph with each destination.
    // It is translucent by design: the scene, not a flat fill, remains the
    // dominant visual material behind the glass UI.
    const grade = new Node(`RouteSceneGrade-${asset}`); grade.layer = Layers.Enum.UI_2D; grade.addComponent(UITransform).setContentSize(width, height); parent.addChild(grade); grade.setSiblingIndex(Math.min(2, parent.children.length - 1)); const g = grade.addComponent(Graphics);
    g.fillColor = new Color(scene.grade.r, scene.grade.g, scene.grade.b, scene.gradeAlpha); g.rect(-width / 2, -height / 2, width, height); g.fill();
    g.fillColor = new Color(24, 8, 18, 36); g.rect(-width / 2, -height / 2, width, height * 0.2); g.fill();
    g.fillColor = new Color(255, 244, 211, 13); g.rect(-width / 2, height * 0.3, width, height * 0.2); g.fill();
  }

  private addStarField(parent: Node, count: number): void {
    const warm = this.router?.route === 'home';
    for (let index = 0; index < count; index += 1) { const x = ((index * 317) % 1030) - 515; const y = ((index * 619) % 1800) - 900; const radius = 2 + (index % 3); const node = new Node(`AmbientBokeh-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 4, radius * 4); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); const tone = warm ? (index % 4 === 0 ? LOBBY.rubyLight : index % 3 === 0 ? LOBBY.champagne : new Color(255, 246, 214, 175)) : index % 5 === 0 ? C.gold : index % 3 === 0 ? C.cyan : new Color(255, 218, 150, 155); g.fillColor = new Color(tone.r, tone.g, tone.b, 46); g.circle(0, 0, radius * 1.9); g.fill(); g.fillColor = new Color(tone.r, tone.g, tone.b, 145); g.circle(0, 0, radius * 0.65); g.fill(); if (index % 7 === 0) tween(node).to(1.2 + index % 5 * 0.2, { scale: new Vec3(1.5, 1.5, 1) }).to(1.4, { scale: Vec3.ONE }).union().repeatForever().start(); }
  }

  private addAmbientLights(parent: Node, accent: Color, width: number, height: number): void {
    for (let index = 0; index < 3; index += 1) {
      const radius = 190 + index * 85; const node = new Node(`AmbientGlow-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(index === 1 ? width * 0.32 : -width * (0.26 + index * 0.04), -height * 0.22 + index * height * 0.22); parent.addChild(node);
      const graphics = node.addComponent(Graphics); graphics.fillColor = new Color(accent.r, accent.g, accent.b, 10 + index * 4); graphics.circle(0, 0, radius); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 105;
      const dx = index % 2 ? -90 : 110; const dy = 70 + index * 25; tween(node).by(5 + index * 1.4, { position: new Vec3(dx, dy, 0), scale: new Vec3(0.12, 0.12, 0) }, { easing: 'sineInOut' }).by(5 + index * 1.4, { position: new Vec3(-dx, -dy, 0), scale: new Vec3(-0.12, -0.12, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(2.8 + index, { opacity: 175 }).to(3.4 + index, { opacity: 90 }).union().repeatForever().start();
    }
  }

  private addRouteBackdropSignature(parent: Node, asset: string, width: number, height: number): void {
    if (!['home', 'store', 'rewards', 'rank', 'profile'].includes(asset)) return;
    const signature = new Node(`BackdropSignature-${asset}`); signature.layer = Layers.Enum.UI_2D; signature.addComponent(UITransform).setContentSize(width, height); parent.addChild(signature); const g = signature.addComponent(Graphics); const halfW = width / 2; const floorY = -height * 0.27;
    if (asset === 'home') {
      g.strokeColor = new Color(66, 173, 166, 70); g.lineWidth = 3; g.ellipse(0, height * 0.17, halfW * 0.84, height * 0.18); g.stroke(); g.strokeColor = new Color(255, 220, 132, 82); g.lineWidth = 1.5; g.ellipse(0, height * 0.17, halfW * 0.7, height * 0.13); g.stroke();
    } else if (asset === 'store') {
      g.fillColor = new Color(90, 43, 31, 35); g.ellipse(0, floorY, halfW * 0.88, height * 0.16); g.fill();
      [0.92, 0.72, 0.52].forEach((ratio, index) => { g.strokeColor = index === 1 ? new Color(77, 194, 180, 88) : new Color(255, 217, 124, 98 - index * 18); g.lineWidth = index === 0 ? 5 : 2; g.ellipse(0, floorY, halfW * ratio, height * (0.16 - index * 0.025)); g.stroke(); });
      g.strokeColor = new Color(255, 233, 171, 62); g.lineWidth = 2; for (let index = -3; index <= 3; index += 1) { g.moveTo(index * halfW * 0.22, floorY - height * 0.12); g.lineTo(index * halfW * 0.16, floorY + height * 0.12); g.stroke(); }
    } else if (asset === 'rewards') {
      [0.78, 0.58, 0.38].forEach((ratio, index) => { g.strokeColor = index === 1 ? new Color(255, 221, 133, 92) : new Color(90, 203, 195, 88 - index * 12); g.lineWidth = index === 0 ? 4 : 2; g.arc(0, 10, halfW * ratio, 0.12 + index * 0.4, Math.PI * (1.76 - index * 0.12), false); g.stroke(); });
      g.fillColor = new Color(255, 244, 207, 70); [[-310, 290], [310, 290], [-310, -240], [310, -240]].forEach(([x, y]) => { g.circle(x, y, 8); g.fill(); });
    } else if (asset === 'rank') {
      g.fillColor = new Color(255, 226, 143, 26); g.moveTo(-halfW * 0.72, height * 0.45); g.lineTo(-halfW * 0.18, floorY); g.lineTo(0, floorY); g.close(); g.fill(); g.moveTo(halfW * 0.72, height * 0.45); g.lineTo(halfW * 0.18, floorY); g.lineTo(0, floorY); g.close(); g.fill();
      g.strokeColor = new Color(255, 229, 151, 86); g.lineWidth = 3; [-255, 0, 255].forEach((x, index) => { g.ellipse(x, floorY + (index === 1 ? 28 : 0), 145, 38); g.stroke(); });
    } else {
      g.strokeColor = new Color(101, 210, 199, 76); g.lineWidth = 4; g.roundRect(-halfW * 0.78, floorY - 110, halfW * 1.56, 360, 72); g.stroke(); g.strokeColor = new Color(255, 222, 140, 72); g.lineWidth = 1.5; g.roundRect(-halfW * 0.69, floorY - 78, halfW * 1.38, 296, 56); g.stroke();
      for (let index = 0; index < 5; index += 1) { const y = floorY - 25 + index * 54; g.moveTo(-halfW * 0.62, y); g.lineTo(halfW * 0.62, y); g.stroke(); }
    }
    const opacity = signature.addComponent(UIOpacity); opacity.opacity = 72; tween(opacity).to(2.4, { opacity: 148 }, { easing: 'sineInOut' }).to(3.1, { opacity: 62 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const accent = asset === 'store' || asset === 'rank' ? C.gold : C.cyan;
    for (let index = 0; index < 6; index += 1) { const spark = new Node(`RouteLightPass-${index}`); spark.layer = Layers.Enum.UI_2D; spark.addComponent(UITransform).setContentSize(52, 14); const side = index % 2 ? 1 : -1; spark.setPosition(side * (350 + index % 3 * 42), -610 + index * 210); signature.addChild(spark); const sg = spark.addComponent(Graphics); const tone = index % 3 === 0 ? C.paleGold : accent; sg.fillColor = new Color(tone.r, tone.g, tone.b, 205); sg.roundRect(-26, -2.5, 52, 5, 2.5); sg.fill(); sg.fillColor = new Color(255, 255, 242, 70); sg.roundRect(-12, -6, 24, 12, 6); sg.fill(); const so = spark.addComponent(UIOpacity); so.opacity = 0; tween(so).delay(index * 0.48).to(0.18, { opacity: 180 }).to(0.52, { opacity: 0 }).delay(1.5 + index * 0.2).union().repeatForever().start(); tween(spark).delay(index * 0.31).by(2.2, { position: new Vec3(-side * 18, 34, 0), scale: new Vec3(0.28, 0.28, 0) }).by(2.2, { position: new Vec3(side * 18, -34, 0), scale: new Vec3(-0.28, -0.28, 0) }).union().repeatForever().start(); }
  }

  private addLobbyIdleWealth(): void {
    // Keep motion atmospheric: edge-only reflected light, never placeholder
    // coins, diamonds or glyphs competing with the real atlas artwork.
    const colors = [LOBBY.champagne, LOBBY.rubyLight, C.cyan];
    for (let index = 0; index < 8; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const node = new Node(`LobbyEdgeReflection-${index}`); node.layer = Layers.Enum.UI_2D;
      const radius = 8 + index % 3 * 2; node.addComponent(UITransform).setContentSize(radius * 5, radius * 2.4);
      const baseX = side * (430 + index % 3 * 24); const baseY = -620 + index * 168;
      node.setPosition(baseX, baseY); this.page.addChild(node);
      const graphics = node.addComponent(Graphics); const color = colors[index % colors.length];
      graphics.fillColor = new Color(color.r, color.g, color.b, 52); graphics.roundRect(-radius * 2.4, -radius * 0.62, radius * 4.8, radius * 1.24, radius * 0.62); graphics.fill();
      graphics.fillColor = new Color(255, 250, 226, 152); graphics.roundRect(-radius * 1.2, -radius * 0.18, radius * 2.4, radius * 0.36, radius * 0.18); graphics.fill();
      const opacity = node.addComponent(UIOpacity); opacity.opacity = 46 + index % 3 * 18;
      const dx = side * (10 + index % 3 * 5); const dy = 22 + index % 4 * 8; const duration = 2.8 + index * 0.21;
      tween(node).delay(index * 0.13).by(duration, { position: new Vec3(dx, dy, 0), angle: side * 5, scale: new Vec3(0.08, 0.08, 0) }, { easing: 'sineInOut' }).by(duration, { position: new Vec3(-dx, -dy, 0), angle: -side * 5, scale: new Vec3(-0.08, -0.08, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
      tween(opacity).delay(index * 0.1).to(1.25, { opacity: 154 }, { easing: 'sineInOut' }).to(1.65, { opacity: 42 }, { easing: 'sineInOut' }).delay(0.8 + index * 0.08).union().repeatForever().start();
    }
  }

  private addLoginAtmosphere(): void {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Two large, masked scene windows make the sign-in screen feel like the
    // entrance to the same casino instead of a static form placed on a photo.
    // They use the real high-resolution game-cover atlas, never placeholder
    // glyphs, and stay clear of both the title and the legal action rail.
    for (const [index, x, phase] of [[1, -304, 0], [2, 304, 0.55]] as const) {
      const windowFrame = new Node(`LoginSceneWindow-${index}`); windowFrame.layer = Layers.Enum.UI_2D; windowFrame.addComponent(UITransform).setContentSize(286, 196); windowFrame.setPosition(x, 682); this.page.addChild(windowFrame);
      const art = this.addGameCoverArt(windowFrame, index, 276, 186, false); art.name = `LoginSceneArt-${index}`;
      const border = new Node('LoginSceneChrome'); border.layer = Layers.Enum.UI_2D; border.addComponent(UITransform).setContentSize(286, 196); windowFrame.addChild(border); const borderGraphics = border.addComponent(Graphics);
      const accent = this.themeColor(GAME_CONFIGS[index].id); borderGraphics.strokeColor = new Color(104, 48, 28, 245); borderGraphics.lineWidth = 10; borderGraphics.roundRect(-138, -93, 276, 186, 44); borderGraphics.stroke(); borderGraphics.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 235); borderGraphics.lineWidth = 3; borderGraphics.roundRect(-133, -88, 266, 176, 39); borderGraphics.stroke(); borderGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, 210); borderGraphics.lineWidth = 1.5; borderGraphics.roundRect(-127, -82, 254, 164, 34); borderGraphics.stroke();
      const glint = new Node('LoginSceneGlint'); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(64, 14); glint.setPosition(-86, 77); border.addChild(glint); const glintGraphics = glint.addComponent(Graphics); glintGraphics.fillColor = new Color(255, 250, 221, 218); glintGraphics.roundRect(-32, -2.5, 64, 5, 2.5); glintGraphics.fill(); glintGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 92); glintGraphics.roundRect(-18, -6, 36, 12, 6); glintGraphics.fill();
      const frameOpacity = windowFrame.addComponent(UIOpacity); frameOpacity.opacity = 226;
      if (!reducedMotion) {
        tween(windowFrame).delay(phase).by(3.8, { position: new Vec3(index === 1 ? 8 : -8, 8, 0), angle: index === 1 ? 0.8 : -0.8 }, { easing: 'sineInOut' }).by(4.1, { position: new Vec3(index === 1 ? -8 : 8, -8, 0), angle: index === 1 ? -0.8 : 0.8 }, { easing: 'sineInOut' }).union().repeatForever().start();
        tween(frameOpacity).delay(phase).to(1.8, { opacity: 255 }, { easing: 'sineInOut' }).to(2.4, { opacity: 218 }, { easing: 'sineInOut' }).union().repeatForever().start();
        tween(glint).delay(phase + 0.4).to(1.25, { position: new Vec3(86, 77, 0) }, { easing: 'sineInOut' }).call(() => glint.setPosition(-86, 77)).delay(2.8).union().repeatForever().start();
      }
    }
    // Large photographic vignettes and slow reflected light read as part of
    // the lobby, not as loose decorative glyphs around the form.
    for (const [index, x, y] of [[0, -410, 155], [3, 410, -20]] as const) {
      const portrait = new Node(`LoginFortuneVignette-${index}`); portrait.layer = Layers.Enum.UI_2D; portrait.addComponent(UITransform).setContentSize(310, 440); portrait.setPosition(x, y); this.page.addChild(portrait);
      const clip = new Node('VignetteClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(290, 420); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; portrait.addChild(clip);
      const art = this.addGameCoverArt(clip, index, 360, 470, true); const artOpacity = art.addComponent(UIOpacity); artOpacity.opacity = 72;
      const edge = portrait.addComponent(Graphics); edge.strokeColor = new Color(255, 229, 166, 72); edge.lineWidth = 2; edge.ellipse(0, 0, 145, 210); edge.stroke();
      if (!reducedMotion) { tween(portrait).delay(index * 0.3).by(4.2, { position: new Vec3(index ? -9 : 9, 14, 0), angle: index ? -1.4 : 1.4 }, { easing: 'sineInOut' }).by(4.6, { position: new Vec3(index ? 9 : -9, -14, 0), angle: index ? 1.4 : -1.4 }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(artOpacity).delay(index * 0.4).to(2.4, { opacity: 108 }).to(3.2, { opacity: 58 }).union().repeatForever().start(); }
    }
    for (let index = 0; index < 3; index += 1) {
      const sweep = new Node(`LoginLightSweep-${index}`); sweep.layer = Layers.Enum.UI_2D; sweep.addComponent(UITransform).setContentSize(190, 1120); sweep.setPosition(-620 - index * 210, 40 + index * 250); sweep.angle = -21; this.page.addChild(sweep); const g = sweep.addComponent(Graphics);
      const tone = index === 1 ? C.cyan : C.paleGold; g.fillColor = new Color(tone.r, tone.g, tone.b, 14 + index * 3); g.roundRect(-95, -560, 190, 1120, 95); g.fill(); const opacity = sweep.addComponent(UIOpacity); opacity.opacity = reducedMotion ? 24 : 0;
      if (!reducedMotion) { tween(sweep).delay(index * 1.9).to(5.8, { position: new Vec3(620, -160 + index * 250, 0) }, { easing: 'sineInOut' }).to(0, { position: new Vec3(-620, 40 + index * 250, 0) }).delay(3.2).union().repeatForever().start(); tween(opacity).delay(index * 1.9).to(0.8, { opacity: 72 }).delay(3.2).to(1.1, { opacity: 0 }).delay(3.9).union().repeatForever().start(); }
    }
    this.addLobbyIdleWealth();
  }

  private addCabinetBackdropAmbience(layout: CabinetLayout, accent: Color): void {
    // Keep the photographic cabinet locked to its controls. Ambient movement
    // lives only in the narrow scenery margins, so the whole composition stays
    // on one physical plane while the background no longer reads as a still.
    const edgeX = Math.min(505, Math.max(448, Math.max(layout.reelWidth, layout.titleWidth) * 0.64));
    for (let index = 0; index < 12; index += 1) {
      const side = index % 2 === 0 ? -1 : 1; const lane = Math.floor(index / 2); const radius = 4 + lane % 3 * 1.5;
      const mote = new Node(`CabinetBackdropBokeh-${index}`); mote.layer = Layers.Enum.UI_2D; mote.addComponent(UITransform).setContentSize(32, 32);
      const baseX = side * (edgeX + lane % 2 * 18); const baseY = -720 + lane * 286; mote.setPosition(baseX, baseY); this.page.addChild(mote);
      const g = mote.addComponent(Graphics);
      const moteColor = index % 4 === 0 ? C.paleGold : new Color(accent.r, accent.g, accent.b, 220); g.fillColor = new Color(moteColor.r, moteColor.g, moteColor.b, 42); g.circle(0, 0, radius * 2.2); g.fill(); g.fillColor = new Color(moteColor.r, moteColor.g, moteColor.b, 170); g.circle(0, 0, radius * 0.7); g.fill();
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

    const glintCount = 8;
    for (let index = 0; index < glintCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1; const lane = Math.floor(index / 2); const node = new Node(`CabinetEdgeLight-${index}`); node.layer = Layers.Enum.UI_2D;
      const radius = 6 + lane % 3 * 2; node.addComponent(UITransform).setContentSize(radius * 7, radius * 2.2);
      const x = side * (layout.reelWidth * 0.52 + 30); const y = layout.reelY - layout.reelHeight * 0.42 + lane * layout.reelHeight * 0.21;
      node.setPosition(x, y); this.page.addChild(node); const graphics = node.addComponent(Graphics);
      const light = index % 3 === 0 ? C.paleGold : new Color(accent.r, accent.g, accent.b, 220); graphics.fillColor = new Color(light.r, light.g, light.b, 58); graphics.roundRect(-radius * 3.2, -radius * 0.7, radius * 6.4, radius * 1.4, radius * 0.7); graphics.fill(); graphics.fillColor = new Color(255, 255, 239, 180); graphics.roundRect(-radius * 1.3, -radius * 0.18, radius * 2.6, radius * 0.36, radius * 0.18); graphics.fill();
      const opacity = node.addComponent(UIOpacity); opacity.opacity = 0;
      tween(node).delay(index * 0.34).by(2.2 + index * 0.12, { position: new Vec3(-side * 8, 30 + index * 4, 0), angle: side * 4, scale: new Vec3(0.24, 0.24, 0) }, { easing: 'sineInOut' }).by(2.2 + index * 0.12, { position: new Vec3(side * 8, -30 - index * 4, 0), angle: -side * 4, scale: new Vec3(-0.24, -0.24, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
      tween(opacity).delay(index * 0.34).to(0.32, { opacity: 220 }).to(0.85, { opacity: 36 }).delay(1.35).union().repeatForever().start();
    }
    const trimSparkPoints = [
      new Vec3(-layout.titleWidth * 0.46, layout.titleY + 28, 0),
      new Vec3(layout.titleWidth * 0.46, layout.titleY - 16, 0),
      new Vec3(-layout.reelWidth * 0.55, layout.jackpotY + 30, 0),
      new Vec3(layout.reelWidth * 0.55, layout.jackpotY + 30, 0),
    ];
    trimSparkPoints.forEach((point, index) => {
      const sparkle = new Node(`CabinetTrimReflection-${index}`); sparkle.layer = Layers.Enum.UI_2D; sparkle.addComponent(UITransform).setContentSize(68, 18); sparkle.setPosition(point); sparkle.setScale(new Vec3(0.62, 0.62, 1)); this.page.addChild(sparkle);
      const g = sparkle.addComponent(Graphics); const light = index % 2 ? new Color(accent.r, accent.g, accent.b, 235) : new Color(255, 249, 213, 245); g.fillColor = new Color(light.r, light.g, light.b, 62); g.roundRect(-34, -7, 68, 14, 7); g.fill(); g.fillColor = new Color(255, 255, 240, 205); g.roundRect(-18, -2, 36, 4, 2); g.fill();
      const opacity = sparkle.addComponent(UIOpacity); opacity.opacity = 0; const delay = 0.45 + index * 0.78;
      tween(opacity).delay(delay).to(0.14, { opacity: 245 }, { easing: 'sineOut' }).to(0.5, { opacity: 0 }, { easing: 'sineInOut' }).delay(2.2 + index * 0.16).union().repeatForever().start();
      tween(sparkle).delay(delay).to(0.22, { scale: new Vec3(1.08, 1.08, 1), angle: index % 2 ? 4 : -4 }, { easing: 'backOut' }).to(0.42, { scale: new Vec3(0.62, 0.62, 1), angle: index % 2 ? 7 : -7 }, { easing: 'sineInOut' }).delay(2.2 + index * 0.16).union().repeatForever().start();
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

    const spinHalo = new Node('SpinIdleHalo'); spinHalo.layer = Layers.Enum.UI_2D; const haloSize = layout.spin.width * 1.62; spinHalo.addComponent(UITransform).setContentSize(haloSize, haloSize); spinHalo.setPosition(layout.spin.x, layout.spin.y); this.page.addChild(spinHalo);
    const haloGraphics = spinHalo.addComponent(Graphics); const radii = [0.57, 0.66, 0.75] as const;
    radii.forEach((ratio, ringIndex) => {
      const radius = layout.spin.width * ratio; haloGraphics.strokeColor = ringIndex === 1 ? new Color(accent.r, accent.g, accent.b, 150) : new Color(255, 226, 133, ringIndex === 0 ? 168 : 106); haloGraphics.lineWidth = ringIndex === 0 ? 4 : ringIndex === 1 ? 2.8 : 1.5;
      for (let segment = 0; segment < 4; segment += 1) { const start = segment * Math.PI * 0.5 + ringIndex * 0.22; haloGraphics.arc(0, 0, radius, start, start + Math.PI * (0.22 + ringIndex * 0.035), false); haloGraphics.stroke(); }
    });
    const haloOpacity = spinHalo.addComponent(UIOpacity); haloOpacity.opacity = 82; tween(spinHalo).by(6.4, { angle: 360 }).repeatForever().start(); tween(haloOpacity).to(1.05, { opacity: 206 }, { easing: 'sineInOut' }).to(1.35, { opacity: 72 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const counterRing = new Node('SpinCounterRing'); counterRing.layer = Layers.Enum.UI_2D; counterRing.addComponent(UITransform).setContentSize(haloSize, haloSize); counterRing.setPosition(layout.spin.x, layout.spin.y); this.page.addChild(counterRing); const counterGraphics = counterRing.addComponent(Graphics); counterGraphics.strokeColor = new Color(255, 251, 223, 132); counterGraphics.lineWidth = 2; counterGraphics.arc(0, 0, layout.spin.width * 0.7, 0.2, 1.18, false); counterGraphics.stroke(); counterGraphics.arc(0, 0, layout.spin.width * 0.7, 3.34, 4.32, false); counterGraphics.stroke(); const counterOpacity = counterRing.addComponent(UIOpacity); counterOpacity.opacity = 94; tween(counterRing).by(4.6, { angle: -360 }).repeatForever().start(); tween(counterOpacity).to(0.8, { opacity: 190 }).to(1.25, { opacity: 70 }).union().repeatForever().start();
    for (let index = 0; index < 4; index += 1) {
      const orbit = new Node(`SpinOrbitLight-${index}`); orbit.layer = Layers.Enum.UI_2D; orbit.addComponent(UITransform).setContentSize(haloSize, haloSize); orbit.setPosition(layout.spin.x, layout.spin.y); orbit.angle = index * 90; this.page.addChild(orbit);
      const jewel = new Node('LightCapsule'); jewel.layer = Layers.Enum.UI_2D; jewel.addComponent(UITransform).setContentSize(28, 12); jewel.setPosition(layout.spin.width * 0.72, 0); orbit.addChild(jewel); const g = jewel.addComponent(Graphics); const jewelColor = index % 2 ? accent : C.paleGold; g.fillColor = new Color(jewelColor.r, jewelColor.g, jewelColor.b, 76); g.roundRect(-14, -5, 28, 10, 5); g.fill(); g.fillColor = new Color(255, 255, 239, 190); g.roundRect(-7, -1.5, 14, 3, 1.5); g.fill(); const opacity = jewel.addComponent(UIOpacity); opacity.opacity = 102;
      tween(orbit).delay(index * 0.11).by(4.2 + index * 0.18, { angle: index % 2 ? -360 : 360 }).repeatForever().start(); tween(opacity).delay(index * 0.16).to(0.7, { opacity: 248 }).to(1.05, { opacity: 82 }).union().repeatForever().start();
    }

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
    const track = this.panel(parent, 0, barY, width, 28, 14, new Color(73, 30, 26, 220), C.chrome, 2, false); track.name = 'LoadingTrack'; const innerWidth = width - 24;
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
    const paths = ['generated/common/fortune_bloom_lobby'];
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
    const image = new Node(immersive ? 'LoadingSceneImage' : 'GameCoverImage'); image.layer = Layers.Enum.UI_2D; const imageExtent = Math.max(width, height) * 1.12; image.addComponent(UITransform).setContentSize(imageExtent, imageExtent); image.setScale(new Vec3(1.04, 1.04, 1)); clip.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const applyFrame = (): void => { if (!clip.isValid || !image.isValid) return; const frame = GameCoverAtlasCache.frame(config.id); if (!frame) return; sprite.spriteFrame = frame; tween(opacity).to(0.32, { opacity: 255 }, { easing: 'quadOut' }).start(); };
    applyFrame(); GameCoverAtlasCache.load(applyFrame);
    const drift = immersive ? 15 : 7; const zoom = immersive ? 0.035 : 0.018; tween(image).to(5.4 + index * 0.45, { position: new Vec3(index % 2 ? -drift : drift, 9, 0), scale: new Vec3(1.04 + zoom, 1.04 + zoom, 1) }, { easing: 'sineInOut' }).to(5.8 + index * 0.4, { position: new Vec3(0, -5, 0), scale: new Vec3(1.04, 1.04, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    const shade = new Node('GameCoverShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); const shadeGraphics = shade.addComponent(Graphics); shadeGraphics.fillColor = new Color(32, 7, 16, immersive ? 58 : 14); shadeGraphics.rect(-width / 2, -height / 2, width, height); shadeGraphics.fill(); shadeGraphics.fillColor = new Color(255, 245, 207, immersive ? 15 : 22); shadeGraphics.roundRect(-width * 0.43, height * 0.27, width * 0.64, height * 0.09, 26); shadeGraphics.fill();
    return clip;
  }

  private addCardPhotoBackdrop(parent: Node, requestedIndex: number, width: number, height: number, alpha: number, shadeAlpha: number, focusY = 0): Node {
    // Small lobby cards use a real scene crop as their inner material. One
    // shared atlas keeps the draw-call cost bounded; only the already-present
    // card shine animates, so adding photographic depth does not create a grid
    // of competing perpetual tweens on mobile.
    const index = Math.max(0, Math.min(GAME_CONFIGS.length - 1, requestedIndex)); const config = GAME_CONFIGS[index]; const inset = height <= 110 ? 13 : 17; const surfaceWidth = Math.max(2, width - inset * 2); const surfaceHeight = Math.max(2, height - inset * 2);
    const clip = new Node(`CardPhotoBackdrop-${config.id}`); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(surfaceWidth, surfaceHeight); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics);
    if (stencil) { stencil.clear(); stencil.roundRect(-surfaceWidth / 2, -surfaceHeight / 2, surfaceWidth, surfaceHeight, Math.max(10, Math.min(30, surfaceHeight * 0.2))); stencil.fill(); }
    parent.addChild(clip); clip.setSiblingIndex(Math.min(1, parent.children.length - 1));
    const image = new Node('CardPhotoScene'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(627, 627); image.setPosition(0, focusY); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.RAW; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const applyFrame = (): void => {
      if (!image.isValid) return; const frame = GameCoverAtlasCache.frame(config.id); if (!frame) return; sprite.spriteFrame = frame;
      const frameWidth = Math.max(1, frame.rect.width); const frameHeight = Math.max(1, frame.rect.height); image.getComponent(UITransform)?.setContentSize(frameWidth, frameHeight); const scale = Math.max(surfaceWidth / frameWidth, surfaceHeight / frameHeight) * 1.055; image.setScale(new Vec3(scale, scale, 1)); tween(opacity).to(0.24, { opacity: Math.max(0, Math.min(255, alpha)) }, { easing: 'sineOut' }).start();
    };
    applyFrame(); GameCoverAtlasCache.load(applyFrame);
    const tones = [new Color(70, 26, 30), new Color(18, 62, 53), new Color(22, 62, 72), new Color(28, 43, 74)] as const; const tone = tones[index]; const shade = new Node('CardPhotoGlass'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(surfaceWidth, surfaceHeight); clip.addChild(shade); const g = shade.addComponent(Graphics);
    g.fillColor = new Color(tone.r, tone.g, tone.b, shadeAlpha); g.rect(-surfaceWidth / 2, -surfaceHeight / 2, surfaceWidth, surfaceHeight); g.fill();
    g.fillColor = new Color(24, 8, 18, Math.min(96, Math.round(shadeAlpha * 0.68))); g.rect(-surfaceWidth / 2, -surfaceHeight / 2, surfaceWidth, surfaceHeight * 0.54); g.fill();
    g.fillColor = new Color(255, 246, 214, 16); g.roundRect(-surfaceWidth * 0.43, surfaceHeight * 0.27, surfaceWidth * 0.66, Math.max(6, surfaceHeight * 0.08), Math.max(3, surfaceHeight * 0.04)); g.fill();
    return clip;
  }

  private addStoreVaultMaterial(parent: Node, index: number, width: number, height: number): void {
    const palettes = [
      { base: new Color(98, 39, 39, 218), edge: new Color(255, 204, 112, 248), glass: new Color(255, 141, 101, 45) },
      { base: new Color(24, 76, 68, 224), edge: new Color(141, 242, 196, 248), glass: new Color(124, 230, 205, 48) },
      { base: new Color(27, 68, 89, 220), edge: new Color(255, 224, 137, 250), glass: new Color(112, 211, 238, 52) },
      { base: new Color(24, 36, 86, 226), edge: new Color(124, 193, 255, 250), glass: new Color(99, 140, 255, 54) },
    ] as const;
    const palette = palettes[Math.max(0, Math.min(palettes.length - 1, index))]; const halfW = width / 2; const halfH = height / 2;
    const layer = new Node(`VaultMaterial-${index}`); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(Math.min(1, parent.children.length - 1)); const g = layer.addComponent(Graphics);
    g.fillColor = new Color(28, 8, 17, 230); g.roundRect(-halfW + 5, -halfH + 3, width - 10, height - 8, 34); g.fill();
    g.fillColor = new Color(palette.base.r, palette.base.g, palette.base.b, 238); g.roundRect(-halfW + 9, -halfH + 9, width - 18, height - 18, index === 1 ? 22 : index === 2 ? 48 : 34); g.fill();
    g.fillColor = palette.glass; g.roundRect(-halfW + 18, 12, width - 36, halfH - 28, 24); g.fill();
    if (index === 0) {
      // Champagne ticket: perforated rails and diagonal security foil.
      g.strokeColor = palette.edge; g.lineWidth = 3; g.roundRect(-halfW + 14, -halfH + 14, width - 28, height - 28, 30); g.stroke();
      g.strokeColor = new Color(255, 243, 207, 116); g.lineWidth = 1.5; for (let x = -halfW + 34; x < halfW - 28; x += 32) { g.moveTo(x, halfH - 24); g.lineTo(x + 14, halfH - 24); g.stroke(); }
      g.fillColor = new Color(255, 219, 142, 42); for (let x = -170; x <= 160; x += 44) { g.moveTo(x - 34, -halfH + 18); g.lineTo(x - 12, -halfH + 18); g.lineTo(x + 46, halfH - 18); g.lineTo(x + 24, halfH - 18); g.close(); g.fill(); }
      [-1, 1].forEach((side) => { g.fillColor = new Color(255, 232, 176, 210); for (let y = -82; y <= 82; y += 41) { g.circle(side * (halfW - 16), y, 3.5); g.fill(); } });
    } else if (index === 1) {
      // Mint safe door: clipped-corner chrome, bolts and a proper lock dial.
      g.strokeColor = new Color(187, 255, 229, 225); g.lineWidth = 7; g.moveTo(-halfW + 36, halfH - 14); g.lineTo(halfW - 36, halfH - 14); g.lineTo(halfW - 14, halfH - 36); g.lineTo(halfW - 14, -halfH + 36); g.lineTo(halfW - 36, -halfH + 14); g.lineTo(-halfW + 36, -halfH + 14); g.lineTo(-halfW + 14, -halfH + 36); g.lineTo(-halfW + 14, halfH - 36); g.close(); g.stroke();
      g.strokeColor = new Color(44, 139, 111, 245); g.lineWidth = 2; g.roundRect(-halfW + 26, -halfH + 26, width - 52, height - 52, 20); g.stroke();
      g.fillColor = new Color(7, 45, 38, 170); g.circle(-138, 55, 55); g.fill(); g.strokeColor = palette.edge; g.lineWidth = 3; g.circle(-138, 55, 48); g.stroke(); g.circle(-138, 55, 30); g.stroke();
      for (let bolt = 0; bolt < 4; bolt += 1) { const bx = bolt % 2 ? halfW - 31 : -halfW + 31; const by = bolt < 2 ? halfH - 30 : -halfH + 30; g.fillColor = new Color(233, 255, 245, 230); g.circle(bx, by, 5); g.fill(); }
    } else if (index === 2) {
      // Jewel casket: arched crown, faceted lower apron and champagne inlay.
      g.strokeColor = palette.edge; g.lineWidth = 4; g.roundRect(-halfW + 13, -halfH + 13, width - 26, height - 26, 46); g.stroke();
      g.strokeColor = new Color(128, 224, 242, 220); g.lineWidth = 2; g.arc(0, 24, halfW - 30, 0.18, Math.PI - 0.18, false); g.stroke();
      g.fillColor = new Color(244, 203, 100, 54); g.moveTo(-halfW + 18, -halfH + 22); g.lineTo(-90, -halfH + 22); g.lineTo(-52, -halfH + 55); g.lineTo(52, -halfH + 55); g.lineTo(90, -halfH + 22); g.lineTo(halfW - 18, -halfH + 22); g.lineTo(halfW - 30, -halfH + 68); g.lineTo(-halfW + 30, -halfH + 68); g.close(); g.fill();
      [-116, 0, 116].forEach((x, gem) => { const tone = gem === 1 ? new Color(255, 220, 110) : new Color(113, 226, 238); g.fillColor = tone; g.moveTo(x, halfH - 22); g.lineTo(x + 8, halfH - 32); g.lineTo(x, halfH - 42); g.lineTo(x - 8, halfH - 32); g.close(); g.fill(); });
    } else {
      // Sapphire transit vault: segmented rails and guarded corner clasps.
      g.strokeColor = new Color(116, 192, 255, 238); g.lineWidth = 7; g.roundRect(-halfW + 14, -halfH + 14, width - 28, height - 28, 30); g.stroke();
      g.strokeColor = new Color(255, 220, 121, 236); g.lineWidth = 2; g.roundRect(-halfW + 25, -halfH + 25, width - 50, height - 50, 22); g.stroke();
      for (let rail = -1; rail <= 1; rail += 1) { g.strokeColor = rail === 0 ? new Color(255, 236, 171, 148) : new Color(94, 158, 255, 138); g.lineWidth = rail === 0 ? 2 : 1; g.moveTo(-halfW + 30, rail * 38); g.lineTo(halfW - 30, rail * 38); g.stroke(); }
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const cx = sx * (halfW - 31); const cy = sy * (halfH - 31); g.fillColor = new Color(17, 25, 68, 246); g.roundRect(cx - 13, cy - 13, 26, 26, 6); g.fill(); g.strokeColor = sy > 0 ? palette.edge : C.gold; g.lineWidth = 2; g.roundRect(cx - 10, cy - 10, 20, 20, 5); g.stroke(); });
    }
    const opacity = layer.addComponent(UIOpacity); opacity.opacity = 246; tween(opacity).delay(index * 0.22).to(1.4, { opacity: 255 }, { easing: 'sineInOut' }).to(1.8, { opacity: 234 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private addRewardDeviceMaterial(parent: Node, index: number, width: number, height: number, accent: Color): void {
    const fills = [new Color(29, 72, 77, 224), new Color(87, 39, 24, 224), new Color(56, 31, 78, 226), new Color(27, 75, 62, 226)] as const;
    const halfW = width / 2; const halfH = height / 2; const layer = new Node(`RewardDeviceMaterial-${index}`); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(Math.min(1, parent.children.length - 1)); const g = layer.addComponent(Graphics);
    g.fillColor = new Color(22, 8, 18, 228); g.roundRect(-halfW + 4, -halfH + 2, width - 8, height - 7, 42); g.fill(); g.fillColor = new Color(fills[index].r, fills[index].g, fills[index].b, 236); g.roundRect(-halfW + 10, -halfH + 10, width - 20, height - 20, index === 1 ? 64 : 38); g.fill();
    if (index === 0) {
      g.fillColor = new Color(227, 248, 242, 26); for (let y = -110; y <= 110; y += 44) { g.roundRect(-halfW + 28, y - 12, width - 56, 24, 8); g.fill(); }
      g.strokeColor = new Color(173, 244, 225, 232); g.lineWidth = 4; g.roundRect(-halfW + 16, -halfH + 16, width - 32, height - 32, 30); g.stroke(); g.strokeColor = new Color(255, 231, 154, 210); g.lineWidth = 2; g.moveTo(-halfW + 36, halfH - 66); g.lineTo(halfW - 36, halfH - 66); g.stroke();
      for (let x = -150; x <= 150; x += 50) { g.fillColor = new Color(255, 241, 198, 215); g.circle(x, halfH - 24, 4); g.fill(); }
    } else if (index === 1) {
      g.fillColor = new Color(255, 218, 115, 26); g.circle(0, 70, 104); g.fill(); g.strokeColor = new Color(255, 220, 112, 246); g.lineWidth = 7; g.circle(0, 70, 101); g.stroke(); g.strokeColor = new Color(255, 248, 213, 194); g.lineWidth = 2; g.circle(0, 70, 85); g.stroke();
      for (let spoke = 0; spoke < 8; spoke += 1) { const angle = spoke * Math.PI / 4; g.moveTo(Math.cos(angle) * 76, 70 + Math.sin(angle) * 76); g.lineTo(Math.cos(angle) * 96, 70 + Math.sin(angle) * 96); g.stroke(); }
      g.strokeColor = new Color(accent.r, accent.g, accent.b, 210); g.lineWidth = 3; g.arc(0, 70, 114, 0.12, 2.72, false); g.stroke();
    } else if (index === 2) {
      g.fillColor = new Color(222, 203, 255, 28); g.roundRect(-halfW + 28, -halfH + 28, width - 56, height - 56, 18); g.fill(); g.strokeColor = new Color(225, 195, 255, 230); g.lineWidth = 4; g.roundRect(-halfW + 18, -halfH + 18, width - 36, height - 36, 28); g.stroke();
      [-156, 156].forEach((x) => { g.fillColor = new Color(111, 68, 143, 238); g.roundRect(x - 13, -halfH + 28, 26, height - 56, 9); g.fill(); g.strokeColor = new Color(255, 223, 142, 210); g.lineWidth = 2; g.moveTo(x - 17, -halfH + 48); g.lineTo(x - 17, halfH - 48); g.stroke(); });
      g.strokeColor = new Color(255, 225, 143, 215); g.lineWidth = 3; g.moveTo(-halfW + 42, -52); g.lineTo(halfW - 42, -52); g.stroke(); g.moveTo(-halfW + 42, 128); g.lineTo(halfW - 42, 128); g.stroke();
    } else {
      g.fillColor = new Color(204, 255, 231, 28); g.roundRect(-halfW + 24, -halfH + 24, width - 48, height - 48, 26); g.fill(); g.strokeColor = new Color(151, 245, 203, 232); g.lineWidth = 4; g.roundRect(-halfW + 17, -halfH + 17, width - 34, height - 34, 34); g.stroke();
      g.strokeColor = new Color(255, 231, 157, 220); g.lineWidth = 3; g.moveTo(-halfW + 38, 118); g.lineTo(0, 34); g.lineTo(halfW - 38, 118); g.stroke(); g.moveTo(-halfW + 38, 118); g.lineTo(-halfW + 38, -112); g.lineTo(halfW - 38, -112); g.lineTo(halfW - 38, 118); g.stroke();
      g.fillColor = new Color(255, 225, 139, 220); g.moveTo(0, 45); g.lineTo(10, 34); g.lineTo(0, 23); g.lineTo(-10, 34); g.close(); g.fill();
    }
    this.addCardMotes(layer, 5 + index, accent, width * 0.78, height * 0.72);
  }

  private addPodiumMaterial(parent: Node, index: number, width: number, height: number): void {
    const tones = [
      { base: new Color(90, 45, 18, 246), edge: new Color(255, 225, 122, 255), glow: new Color(255, 206, 78, 72) },
      { base: new Color(38, 68, 78, 244), edge: new Color(200, 239, 244, 248), glow: new Color(117, 211, 222, 58) },
      { base: new Color(94, 46, 36, 244), edge: new Color(242, 169, 123, 248), glow: new Color(239, 130, 94, 54) },
    ] as const;
    const tone = tones[index]; const halfW = width / 2; const halfH = height / 2; const layer = new Node(`PodiumMaterial-${index}`); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(0); const g = layer.addComponent(Graphics);
    g.fillColor = new Color(31, 9, 18, 232); g.roundRect(-halfW + 3, -halfH + 1, width - 6, height - 5, 38); g.fill(); g.fillColor = new Color(tone.base.r, tone.base.g, tone.base.b, 238); g.roundRect(-halfW + 9, -halfH + 9, width - 18, height - 18, index === 0 ? 52 : 36); g.fill(); g.fillColor = tone.glow; g.ellipse(0, halfH * 0.38, halfW * 0.78, halfH * 0.5); g.fill();
    g.strokeColor = tone.edge; g.lineWidth = index === 0 ? 6 : 4; g.roundRect(-halfW + 13, -halfH + 13, width - 26, height - 26, index === 0 ? 46 : 30); g.stroke();
    if (index === 0) {
      // First place uses restrained internal halo work instead of a protruding
      // code-drawn crown. Nothing may cross the card boundary or compete with
      // the WEEKLY tab above it.
      g.fillColor = new Color(255, 229, 137, 34); g.ellipse(0, halfH * 0.23, halfW * 0.66, halfH * 0.32); g.fill();
      g.strokeColor = new Color(255, 247, 213, 210); g.lineWidth = 1.5; g.arc(0, 10, 90, 0.28, 2.86, false); g.stroke();
      g.strokeColor = new Color(255, 206, 78, 150); g.lineWidth = 2.5; g.arc(0, 42, 72, 0.42, 2.72, false); g.stroke();
    } else if (index === 1) {
      g.fillColor = new Color(205, 244, 245, 96); g.moveTo(-halfW + 14, 54); g.lineTo(-halfW - 4, 31); g.lineTo(-halfW + 14, 8); g.close(); g.fill(); g.strokeColor = tone.edge; g.lineWidth = 2; for (let y = -78; y < 78; y += 36) { g.moveTo(-halfW + 24, y); g.lineTo(halfW - 24, y + 16); g.stroke(); }
    } else {
      g.fillColor = new Color(244, 171, 124, 92); g.moveTo(halfW - 14, 54); g.lineTo(halfW + 4, 31); g.lineTo(halfW - 14, 8); g.close(); g.fill(); g.strokeColor = new Color(255, 218, 170, 182); g.lineWidth = 2; for (let y = -72; y < 82; y += 42) { g.moveTo(-halfW + 30, y + 10); g.lineTo(halfW - 30, y - 10); g.stroke(); }
    }
  }

  private addLedgerTicketMaterial(parent: Node, index: number, width: number, height: number, current: boolean): void {
    const halfW = width / 2; const halfH = height / 2; const accent = current ? new Color(122, 241, 205) : index % 2 ? new Color(119, 199, 204) : new Color(244, 173, 112); const layer = new Node(`LedgerTicket-${index}`); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(0); const g = layer.addComponent(Graphics);
    g.fillColor = current ? new Color(25, 84, 70, 244) : index % 2 ? new Color(36, 52, 65, 238) : new Color(70, 31, 39, 238); g.roundRect(-halfW + 8, -halfH + 6, width - 16, height - 12, 22); g.fill();
    g.fillColor = new Color(accent.r, accent.g, accent.b, 32); g.roundRect(-halfW + 18, -halfH + 16, width - 36, height - 32, 15); g.fill(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 228); g.lineWidth = current ? 4 : 2; g.roundRect(-halfW + 10, -halfH + 8, width - 20, height - 16, 20); g.stroke();
    g.strokeColor = new Color(255, 233, 173, 138); g.lineWidth = 1.5; for (let x = -halfW + 40; x < halfW - 28; x += 42) { g.moveTo(x, halfH - 14); g.lineTo(x + 18, halfH - 14); g.stroke(); }
    g.fillColor = new Color(255, 245, 207, 150); [-1, 1].forEach((side) => { g.circle(side * (halfW - 9), 0, 6); g.fill(); }); g.strokeColor = new Color(accent.r, accent.g, accent.b, 112); g.lineWidth = 1; g.moveTo(168, -halfH + 18); g.lineTo(168, halfH - 18); g.stroke();
  }

  private addPassSecurityMaterial(parent: Node, width: number, height: number): void {
    const halfW = width / 2; const halfH = height / 2; const layer = new Node('SkylightPassSecurityFoil'); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(Math.min(1, parent.children.length - 1)); const g = layer.addComponent(Graphics);
    g.fillColor = new Color(27, 54, 58, 205); g.roundRect(-halfW + 10, -halfH + 10, width - 20, height - 20, 42); g.fill();
    for (let x = -halfW - 60; x < halfW; x += 48) { g.fillColor = x % 96 === 0 ? new Color(255, 225, 139, 24) : new Color(120, 223, 209, 21); g.moveTo(x, -halfH + 12); g.lineTo(x + 28, -halfH + 12); g.lineTo(x + 176, halfH - 12); g.lineTo(x + 148, halfH - 12); g.close(); g.fill(); }
    g.strokeColor = new Color(255, 221, 127, 246); g.lineWidth = 5; g.roundRect(-halfW + 14, -halfH + 14, width - 28, height - 28, 38); g.stroke(); g.strokeColor = new Color(148, 239, 221, 206); g.lineWidth = 2; g.roundRect(-halfW + 25, -halfH + 25, width - 50, height - 50, 30); g.stroke();
    g.strokeColor = new Color(255, 239, 187, 128); g.lineWidth = 1.5; for (let y = -86; y <= 86; y += 43) { g.moveTo(98, y); g.lineTo(halfW - 34, y); g.stroke(); }
    const foil = new Node('PassFoilSweep'); foil.layer = Layers.Enum.UI_2D; foil.addComponent(UITransform).setContentSize(54, height - 34); foil.setPosition(-halfW + 40, 0); layer.addChild(foil); const fg = foil.addComponent(Graphics); fg.fillColor = new Color(255, 245, 202, 36); fg.rect(-27, -(height - 34) / 2, 54, height - 34); fg.fill(); tween(foil).to(2.2, { position: new Vec3(halfW - 40, 0, 0) }, { easing: 'sineInOut' }).to(0, { position: new Vec3(-halfW + 40, 0, 0) }).delay(3.4).union().repeatForever().start();
  }

  private addProfileStatMaterial(parent: Node, index: number, width: number, height: number): void {
    const bases = [new Color(37, 68, 72, 238), new Color(76, 39, 27, 238), new Color(45, 41, 76, 238)] as const; const edges = [new Color(137, 230, 214), new Color(255, 210, 111), new Color(174, 176, 255)] as const; const edge = edges[index]; const halfW = width / 2; const halfH = height / 2; const layer = new Node(`ProfileCounterMaterial-${index}`); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(0); const g = layer.addComponent(Graphics);
    g.fillColor = bases[index]; g.roundRect(-halfW + 5, -halfH + 5, width - 10, height - 10, index === 1 ? 40 : 28); g.fill(); g.strokeColor = edge; g.lineWidth = 3; g.roundRect(-halfW + 9, -halfH + 9, width - 18, height - 18, index === 1 ? 36 : 24); g.stroke();
    if (index === 0) { g.strokeColor = new Color(edge.r, edge.g, edge.b, 100); g.lineWidth = 1.5; for (let x = -92; x <= 92; x += 23) { g.moveTo(x, -halfH + 15); g.lineTo(x, halfH - 15); g.stroke(); } }
    else if (index === 1) { g.fillColor = new Color(255, 221, 120, 35); g.ellipse(0, 0, 106, 45); g.fill(); g.strokeColor = new Color(255, 238, 178, 120); g.lineWidth = 2; g.arc(0, -8, 104, 0.18, 2.96, false); g.stroke(); }
    else { g.strokeColor = new Color(191, 193, 255, 110); g.lineWidth = 1.5; for (let y = -38; y <= 38; y += 25) { g.moveTo(-halfW + 18, y); g.lineTo(halfW - 18, y); g.stroke(); } g.fillColor = new Color(255, 220, 114, 68); g.roundRect(18, -halfH + 14, halfW - 32, height - 28, 12); g.fill(); }
  }

  private addProfileEntryMaterial(parent: Node, index: number, width: number, height: number, accent: Color): void {
    const bases = [new Color(57, 34, 79, 238), new Color(28, 69, 73, 238), new Color(74, 45, 29, 238)] as const; const halfW = width / 2; const halfH = height / 2; const layer = new Node(`ProfileEntryMaterial-${index}`); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(0); const g = layer.addComponent(Graphics);
    g.fillColor = bases[index]; g.roundRect(-halfW + 6, -halfH + 6, width - 12, height - 12, index === 0 ? 56 : index === 1 ? 32 : 20); g.fill(); g.fillColor = new Color(accent.r, accent.g, accent.b, 28); g.roundRect(-halfW + 17, -halfH + 17, width - 34, height - 34, index === 0 ? 46 : 22); g.fill();
    if (index === 0) {
      g.strokeColor = new Color(225, 190, 255, 230); g.lineWidth = 4; g.roundRect(-halfW + 12, -halfH + 12, width - 24, height - 24, 50); g.stroke(); g.strokeColor = new Color(255, 224, 130, 164); g.lineWidth = 2; g.arc(0, 60, 80, 0.15, 2.99, false); g.stroke();
    } else if (index === 1) {
      g.strokeColor = new Color(148, 240, 224, 232); g.lineWidth = 4; g.roundRect(-halfW + 12, -halfH + 12, width - 24, height - 24, 28); g.stroke(); g.strokeColor = new Color(255, 228, 145, 170); g.lineWidth = 2; g.moveTo(-halfW + 28, halfH - 36); g.lineTo(0, 40); g.lineTo(halfW - 28, halfH - 36); g.stroke();
    } else {
      g.strokeColor = new Color(255, 211, 118, 238); g.lineWidth = 5; g.roundRect(-halfW + 11, -halfH + 11, width - 22, height - 22, 18); g.stroke(); g.strokeColor = new Color(255, 244, 208, 132); g.lineWidth = 1.5; for (let y = -72; y <= 72; y += 48) { g.moveTo(-halfW + 30, y); g.lineTo(halfW - 30, y); g.stroke(); } [[-80, 62], [80, 62], [-80, -62], [80, -62]].forEach(([x, y]) => { g.fillColor = new Color(accent.r, accent.g, accent.b, 210); g.circle(x, y, 5); g.fill(); });
    }
  }

  private addCardMotes(parent: Node, count: number, color: Color, width: number, height: number): void {
    for (let index = 0; index < count; index += 1) { const node = new Node(`CardMote-${index}`); node.layer = Layers.Enum.UI_2D; const radius = 2 + index % 3; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(-width / 2 + ((index * 137) % Math.max(1, width)), -height / 2 + ((index * 91) % Math.max(1, height))); parent.addChild(node); const graphics = node.addComponent(Graphics); graphics.fillColor = index % 4 === 0 ? C.paleGold : new Color(color.r, color.g, color.b, 180); graphics.circle(0, 0, radius); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 45 + index % 3 * 35; tween(node).by(2.8 + index * 0.17, { position: new Vec3((index % 2 ? -1 : 1) * (20 + index * 2), 44 + index * 3, 0), scale: new Vec3(0.4, 0.4, 0) }, { easing: 'sineInOut' }).by(2.8 + index * 0.17, { position: new Vec3((index % 2 ? 1 : -1) * (20 + index * 2), -44 - index * 3, 0), scale: new Vec3(-0.4, -0.4, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(1.4 + index * 0.09, { opacity: 220 }).to(1.7 + index * 0.08, { opacity: 38 }).union().repeatForever().start(); }
  }

  private addSpinRings(parent: Node, radius: number): void {
    for (let index = 0; index < 2; index += 1) { const ring = new Node(`SpinEnergyRing-${index}`); ring.layer = Layers.Enum.UI_2D; ring.addComponent(UITransform).setContentSize(radius * 2.6, radius * 2.6); parent.addChild(ring); const graphics = ring.addComponent(Graphics); graphics.strokeColor = index === 0 ? new Color(C.gold.r, C.gold.g, C.gold.b, 155) : new Color(C.cyan.r, C.cyan.g, C.cyan.b, 125); graphics.lineWidth = index === 0 ? 4 : 2; graphics.arc(0, 0, radius + index * 14, index * 1.2, Math.PI * (1.45 + index * 0.15), false); graphics.stroke(); graphics.arc(0, 0, radius + index * 14, Math.PI * (1.65 + index * 0.1), Math.PI * (1.9 + index * 0.05), false); graphics.stroke(); const opacity = ring.addComponent(UIOpacity); opacity.opacity = 108; tween(ring).by(index === 0 ? 4.8 : 6.2, { angle: index === 0 ? -360 : 360 }).repeatForever().start(); tween(opacity).to(1.8 + index * 0.3, { opacity: 178 }).to(2.1, { opacity: 72 }).union().repeatForever().start(); }
  }

  private topY(designY: number): number { return designY + (SafeAreaAdapter.visibleHeight - H) / 2 - SafeAreaAdapter.safeTop; }

  private cabinetViewportScale(): number {
    // The cabinet photograph and its controls share the same fixed 1080x1920
    // design plane. Responsive adaptation is handled once by Cocos' resolution
    // policy; a second content scale would break the physical registration.
    return 1;
  }

  private cabinetWorldPoint(x: number, y: number): Vec3 {
    const scale = this.cabinetViewportScale(); return new Vec3(x * scale, y * scale, 0);
  }

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
    const path = 'generated/common/fortune_bloom_lobby';
    resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('PanelMaterialImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(surfaceWidth / texture.width, surfaceHeight / texture.height) * 1.08; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(-16, -8); const opacity = image.addComponent(UIOpacity); opacity.opacity = 34; tween(image).to(7.2, { position: new Vec3(18, 10, 0), scale: new Vec3(scale * 1.025, scale * 1.025, 1) }, { easing: 'sineInOut' }).to(7.2, { position: new Vec3(-16, -8, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(3.2, { opacity: 52 }).to(4, { opacity: 28 }).union().repeatForever().start(); });
  }

  private addPanelImageBorder(parent: Node, width: number, height: number, requestedIndex?: number, requestedAlpha?: number, requestedOuterSize?: { width: number; height: number; innerContent?: Node }): void {
    const index = this.resolvedPanelFrameIndex(requestedIndex); const outerWidth = requestedOuterSize?.width ?? width; const outerHeight = requestedOuterSize?.height ?? height; requestedOuterSize?.innerContent?.setPosition(0, 0);
    const border = new Node(`PanelImageBorder-${index}`); border.layer = Layers.Enum.UI_2D; border.addComponent(UITransform).setContentSize(outerWidth, outerHeight); parent.addChild(border); const g = border.addComponent(Graphics); const accent = [new Color(235, 113, 62), new Color(198, 53, 44), new Color(70, 151, 114), new Color(242, 169, 48)][Math.max(0, Math.min(3, index))]; const radius = Math.max(10, Math.min(34, Math.min(outerWidth, outerHeight) * 0.16)); const inset = Math.max(3, Math.min(9, Math.min(outerWidth, outerHeight) * 0.055));
    g.strokeColor = new Color(132, 74, 42, requestedAlpha ? Math.min(225, requestedAlpha) : 205); g.lineWidth = Math.max(6, Math.min(10, outerHeight * 0.06)); g.roundRect(-outerWidth / 2 + inset + 1, -outerHeight / 2 + inset - 2, outerWidth - inset * 2, outerHeight - inset * 2, radius); g.stroke();
    g.strokeColor = new Color(LOBBY.gold.r, LOBBY.gold.g, LOBBY.gold.b, requestedAlpha ?? 225); g.lineWidth = Math.max(2, Math.min(4, outerHeight * 0.03)); g.roundRect(-outerWidth / 2 + inset, -outerHeight / 2 + inset, outerWidth - inset * 2, outerHeight - inset * 2, radius); g.stroke();
    g.strokeColor = new Color(255, 246, 206, requestedAlpha ? Math.min(190, requestedAlpha) : 155); g.lineWidth = 1.25; g.moveTo(-outerWidth / 2 + inset + radius, outerHeight / 2 - inset - 1); g.lineTo(outerWidth / 2 - inset - radius, outerHeight / 2 - inset - 1); g.stroke();
    g.strokeColor = new Color(79, 21, 27, 205); g.lineWidth = 2; g.moveTo(-outerWidth / 2 + inset + radius, -outerHeight / 2 + inset + 1); g.lineTo(outerWidth / 2 - inset - radius, -outerHeight / 2 + inset + 1); g.stroke();
    g.strokeColor = new Color(accent.r, accent.g, accent.b, requestedAlpha ? Math.min(210, requestedAlpha) : 150); g.lineWidth = Math.max(1, Math.min(3, outerHeight * 0.02)); g.roundRect(-outerWidth / 2 + inset * 1.9, -outerHeight / 2 + inset * 1.9, outerWidth - inset * 3.8, outerHeight - inset * 3.8, Math.max(6, radius - inset)); g.stroke();
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

  private label(parent: Node, text: string, x: number, y: number, size: number, color: Color, bold = true, width = 900): Label {
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
    // Keep the title treatment typographic. Earlier code-drawn diamonds on
    // both ends read as placeholder clip-art beside the generated artwork.
    tween(stage).to(1.9, { scale: new Vec3(1.012, 1.012, 1) }, { easing: 'sineInOut' }).to(2.2, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    return primaryTitle ?? this.label(stage, text, 0, 0, size, C.paleGold, true, width);
  }

  private button(parent: Node, text: string, x: number, y: number, width: number, height: number, action: () => void, style: string): Node {
    const primary = style === 'primary' || style === 'spin'; const lobbySecondary = style === 'lobby-secondary'; const palette = style === 'apple' ? [new Color(14, 14, 16, 252), new Color(245, 245, 247), new Color(255, 255, 255)] : primary ? [new Color(180, 45, 82), C.paleGold, C.white] : lobbySecondary ? [new Color(104, 26, 34), LOBBY.gold, LOBBY.ivory] : style === 'secondary' ? [new Color(126, 34, 43), C.gold, C.white] : style === 'nav-active' ? [new Color(0, 0, 0, 0), LOBBY.gold, LOBBY.champagne] : style === 'link' || style === 'nav' ? [new Color(0, 0, 0, 0), new Color(0, 0, 0, 0), style === 'nav' ? LOBBY.muted : C.gold] : [new Color(70, 17, 28), new Color(145, 78, 47), C.white];
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
    const surfaceTransform = effectSurface.getComponent(UITransform); const surfaceWidth = surfaceTransform?.contentSize.width ?? width; const surfaceHeight = surfaceTransform?.contentSize.height ?? height;
    if (style !== 'link' && style !== 'nav' && style !== 'nav-active') {
      this.addButtonMaterialSurface(effectSurface, text, style, Math.max(10, surfaceWidth), Math.max(10, surfaceHeight), palette);
      this.addCardShine(effectSurface, Math.max(10, surfaceWidth - 8), Math.max(10, surfaceHeight - 8), style === 'primary' || lobbySecondary ? C.paleGold : C.cyan, style === 'primary' ? 1.1 : 2 + this.buttonFrameIndex(text, style) * 0.22);
      this.addButtonEdgePulse(node, width, height, palette[1], style === 'spin');
    }
    if (style !== 'spin') this.addButtonImageFrame(node, text, style, width, height);
    const semanticArt = style === 'apple' ? undefined : this.semanticButtonArt(text, style); if (semanticArt && style !== 'spin' && width >= 52 && height >= 52) { const compact = width < 180; this.addPremiumSymbol(node, semanticArt[0], semanticArt[1], compact ? 0 : -width / 2 + height * 0.62, 0, compact ? Math.min(width, height) * 0.7 : height * 0.78, 'button', compact ? 132 : 210, 0.2); }
    const appleMark = style === 'apple' ? this.addAppleMark(node, -width / 2 + 72, 0, Math.min(48, height * 0.62), palette[2]) : undefined;
    const interfaceIcon = style === 'apple' || semanticArt ? undefined : this.interfaceControlIcon(text, style); const interfaceIconNode = interfaceIcon ? this.addInterfaceControlIcon(node, interfaceIcon, width < 180 ? -width * 0.29 : -width / 2 + height * 0.63, 0, Math.min(height * 0.56, 42), palette[2], palette[1]) : undefined;
    if (style === 'spin') { this.addSpinRings(node, Math.min(width, height) * 0.52); this.addPremiumSymbol(node, this.selectedGame, this.selectedGame.wildId, 0, 0, Math.min(width, height) * 0.78, 'button', 112); }
    const compactControl = text === '‹' || text === '+' || text === '−'; const fontSize = compactControl ? Math.min(38, height * 0.52) : Math.min(style === 'spin' ? 34 : 25, Math.max(19, height * 0.3)); const hasLeftIcon = Boolean(appleMark || interfaceIcon || (semanticArt && width >= 180)); const labelX = hasLeftIcon ? (width < 180 ? width * 0.13 : height * 0.3) : 0; const labelWidth = hasLeftIcon ? width - (width < 180 ? 50 : height * 0.92) : width - 16; const label = this.label(node, text, labelX, 0, fontSize, palette[2], true, labelWidth); label.node.name = 'Text';
    const button = node.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.94;
    node.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(10); this.vfx?.buttonBurst(node, palette[1]); if (style !== 'link' && style !== 'nav') tween(label.node).to(0.08, { scale: new Vec3(1.05, 1.05, 1) }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); if (interfaceIconNode) tween(interfaceIconNode).to(0.07, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'sineOut' }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); if (appleMark) tween(appleMark).to(0.07, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineOut' }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }, this);
    let actionLocked = false; const invokeAction = (): void => {
      if (actionLocked) return; actionLocked = true; action(); this.scheduleOnce(() => { actionLocked = false; }, 0.1);
    };
    node.on(Button.EventType.CLICK, invokeAction, this); return node;
  }

  private interfaceControlIcon(text: string, style: string): InterfaceControlIcon | undefined {
    if (style === 'nav' || style === 'nav-active') return undefined;
    const copy = text.replace(/\n/g, ' ').toUpperCase();
    if (copy.startsWith('MAIL')) return 'mail';
    if (copy === 'BACK' || copy.includes('BACK TO') || copy.includes('RETURN TO') || copy === 'CANCEL' || copy.includes('LOG OUT')) return 'back';
    if (copy === 'SHOW' || copy === 'HIDE') return 'eye';
    if (copy === 'CLOSE') return 'close';
    if (copy.includes('SIGN IN')) return 'key';
    if (copy.includes('RESET') || copy.includes('CLEAR') || copy.includes('DELETE') || copy.includes('SYNC')) return 'reset';
    if (copy.includes('PLAY')) return 'play';
    return undefined;
  }

  private addAppleMark(parent: Node, x: number, y: number, size: number, color: Color): Node {
    // Vector reconstruction of the official Apple silhouette. It remains
    // crisp at every device scale and mirrors the native
    // ASAuthorizationAppleIDButton that replaces this surface in Xcode.
    const node = new Node('AppleSignInMark'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(size, size); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); const unit = size / 24; const px = (value: number): number => (value - 12) * unit; const py = (value: number): number => (12 - value) * unit;
    g.fillColor = color;
    g.moveTo(px(18.71), py(19.5));
    g.bezierCurveTo(px(17.88), py(20.74), px(17), py(21.95), px(15.66), py(21.97));
    g.bezierCurveTo(px(14.34), py(22), px(13.91), py(21.18), px(12.39), py(21.18));
    g.bezierCurveTo(px(10.86), py(21.18), px(10.39), py(21.94), px(9.14), py(22));
    g.bezierCurveTo(px(7.84), py(22.05), px(6.85), py(20.69), px(6.02), py(19.5));
    g.bezierCurveTo(px(4.32), py(17.05), px(3.02), py(12.57), px(4.77), py(9.54));
    g.bezierCurveTo(px(5.64), py(8.03), px(7.2), py(7.08), px(8.89), py(7.05));
    g.bezierCurveTo(px(10.17), py(7.02), px(11.39), py(7.92), px(12.16), py(7.92));
    g.bezierCurveTo(px(12.92), py(7.92), px(14.37), py(6.85), px(15.88), py(7.01));
    g.bezierCurveTo(px(16.51), py(7.04), px(18.28), py(7.26), px(19.42), py(8.92));
    g.bezierCurveTo(px(19.33), py(8.98), px(17.31), py(10.17), px(17.33), py(12.67));
    g.bezierCurveTo(px(17.36), py(15.66), px(19.95), py(16.66), px(19.98), py(16.67));
    g.bezierCurveTo(px(19.95), py(16.76), px(19.57), py(18.09), px(18.71), py(19.5));
    g.close(); g.fill();
    g.moveTo(px(13), py(3.5));
    g.bezierCurveTo(px(13.73), py(2.67), px(14.94), py(2.04), px(16), py(2));
    g.bezierCurveTo(px(16.14), py(3.23), px(15.64), py(4.48), px(14.94), py(5.37));
    g.bezierCurveTo(px(14.25), py(6.27), px(13.11), py(6.97), px(12), py(6.88));
    g.bezierCurveTo(px(11.84), py(5.67), px(12.41), py(4.4), px(13), py(3.5));
    g.close(); g.fill();
    return node;
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
    if (copy.includes('TURBO')) return [GAME_CONFIGS[2], 'flame-wild'];
    if (copy.includes('AUTO')) return [GAME_CONFIGS[0], 'bloom-wild'];
    if (copy.includes('WHEEL')) return [GAME_CONFIGS[3], 'prize-wheel'];
    if (copy.includes('CHECK-IN') || copy.includes('CLAIM') || copy.includes('COLLECT')) return [GAME_CONFIGS[0], 'coin-fan'];
    if (copy === 'BUY' || copy.includes('PURCHASE')) return [GAME_CONFIGS[1], 'coin-stack'];
    if (copy === 'VIEW') return [GAME_CONFIGS[3], 'goblet'];
    if (copy === 'DONE') return [GAME_CONFIGS[0], 'parade-ticket'];
    if (copy.includes('ENTER THE PARK') || copy.includes('CREATE PROFILE') || copy.includes('RECOVERY HELP')) return [GAME_CONFIGS[2], 'lantern-chest'];
    if (copy.includes('GUEST')) return [GAME_CONFIGS[0], 'parade-ticket'];
    if (copy.includes('CHANGE AVATAR') || copy.includes('CHOOSE AVATAR')) return [GAME_CONFIGS[0], 'parade-crown'];
    if (copy === '+') return [GAME_CONFIGS[0], 'coin-fan'];
    if (copy === 'OPEN' || copy.includes('OPEN  ›')) return [GAME_CONFIGS[2], 'locked-coin'];
    return undefined;
  }

  private buttonFrameIndex(text: string, style: string): number {
    const copy = text.replace(/\n/g, ' ').toUpperCase(); let index = style === 'primary' ? 1 : style === 'secondary' ? 3 : 0;
    if (this.router?.route === 'game' || this.router?.route === 'game-loading') index = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame));
    if (style === 'nav' || style === 'nav-active') index = 0;
    else if (copy.includes('TURBO') || copy === '−') index = 2; else if (copy.includes('AUTO') || copy.includes('WHEEL') || copy.includes('GUEST') || copy === 'HOME' || copy === '‹') index = 0; else if (copy.includes('CHECK-IN') || copy.includes('CLAIM') || copy.includes('COLLECT') || copy === '+' || copy === 'STORE') index = 3; else if (copy.includes('ENTER') || copy.includes('CREATE PROFILE') || copy.includes('REWARDS')) index = 1;
    return index;
  }

  private addButtonMaterialSurface(parent: Node, text: string, style: string, width: number, height: number, palette: readonly Color[]): void {
    const index = this.buttonFrameIndex(text, style); const circular = style === 'spin'; const halfW = width / 2; const halfH = height / 2; const layer = new Node(`ButtonMaterial-${index}`); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(0); const g = layer.addComponent(Graphics);
    const bases = [new Color(91, 26, 44, 246), new Color(20, 80, 69, 246), new Color(52, 35, 82, 246), new Color(19, 40, 92, 246)] as const;
    const edges = [new Color(255, 197, 104, 248), new Color(152, 244, 215, 248), new Color(126, 220, 239, 248), new Color(118, 181, 255, 248)] as const; const base = bases[index]; const edge = edges[index];
    if (circular) {
      const radius = Math.max(6, Math.min(width, height) / 2); g.fillColor = new Color(26, 7, 18, 248); g.circle(0, -3, radius - 1); g.fill(); g.fillColor = this.mix(base, palette[0], 0.36); g.circle(0, 0, radius - 6); g.fill(); g.fillColor = new Color(255, 244, 205, 34); g.arc(0, 7, radius - 13, 0.18, Math.PI - 0.18, false); g.lineTo(0, 7); g.close(); g.fill(); g.strokeColor = edge; g.lineWidth = 5; g.circle(0, 0, radius - 8); g.stroke(); g.strokeColor = new Color(255, 252, 227, 205); g.lineWidth = 1.5; g.arc(0, 1, radius - 14, 0.3, 2.75, false); g.stroke();
      for (let jewel = 0; jewel < 8; jewel += 1) { const angle = jewel * Math.PI / 4; const x = Math.cos(angle) * (radius - 11); const y = Math.sin(angle) * (radius - 11); g.fillColor = jewel % 2 ? edge : C.paleGold; g.circle(x, y, 2.8); g.fill(); }
      return;
    }
    const radius = Math.max(7, Math.min(26, height * 0.3)); g.fillColor = new Color(18, 6, 14, 235); g.roundRect(-halfW + 1, -halfH, width - 2, height - 3, radius + 2); g.fill(); g.fillColor = base; g.roundRect(-halfW + 4, -halfH + 5, width - 8, height - 10, radius); g.fill(); g.fillColor = new Color(255, 245, 216, 29); g.roundRect(-halfW + 10, 0, width - 20, Math.max(8, halfH - 9), Math.max(5, radius - 5)); g.fill();
    if (index === 0) {
      g.strokeColor = edge; g.lineWidth = 3; g.roundRect(-halfW + 6, -halfH + 7, width - 12, height - 14, radius - 1); g.stroke(); g.strokeColor = new Color(255, 244, 211, 120); g.lineWidth = 1; for (let x = -halfW + 26; x < halfW - 18; x += 27) { g.moveTo(x, halfH - 11); g.lineTo(Math.min(x + 12, halfW - 12), halfH - 11); g.stroke(); }
    } else if (index === 1) {
      g.strokeColor = edge; g.lineWidth = 4; g.moveTo(-halfW + 18, halfH - 6); g.lineTo(halfW - 18, halfH - 6); g.lineTo(halfW - 6, halfH - 18); g.lineTo(halfW - 6, -halfH + 18); g.lineTo(halfW - 18, -halfH + 6); g.lineTo(-halfW + 18, -halfH + 6); g.lineTo(-halfW + 6, -halfH + 18); g.lineTo(-halfW + 6, halfH - 18); g.close(); g.stroke();
      for (const side of [-1, 1]) { g.fillColor = new Color(224, 255, 241, 220); g.circle(side * (halfW - 13), 0, 3.5); g.fill(); }
    } else if (index === 2) {
      g.strokeColor = edge; g.lineWidth = 3.5; g.moveTo(-halfW + 24, halfH - 6); g.lineTo(halfW - 24, halfH - 6); g.lineTo(halfW - 6, 0); g.lineTo(halfW - 24, -halfH + 6); g.lineTo(-halfW + 24, -halfH + 6); g.lineTo(-halfW + 6, 0); g.close(); g.stroke(); g.strokeColor = new Color(255, 223, 144, 135); g.lineWidth = 1.5; g.moveTo(-halfW + 28, 0); g.lineTo(halfW - 28, 0); g.stroke();
    } else {
      g.strokeColor = edge; g.lineWidth = 4; g.roundRect(-halfW + 6, -halfH + 6, width - 12, height - 12, radius); g.stroke(); g.strokeColor = new Color(255, 223, 132, 192); g.lineWidth = 1.5; g.roundRect(-halfW + 13, -halfH + 13, width - 26, height - 26, Math.max(4, radius - 7)); g.stroke();
      for (const side of [-1, 1]) { g.fillColor = new Color(12, 22, 62, 244); g.roundRect(side * (halfW - 17) - 7, -10, 14, 20, 4); g.fill(); g.strokeColor = C.paleGold; g.lineWidth = 1.5; g.roundRect(side * (halfW - 17) - 5, -8, 10, 16, 3); g.stroke(); }
    }
    g.strokeColor = new Color(255, 252, 231, 128); g.lineWidth = 1; g.moveTo(-halfW + radius + 4, halfH - 9); g.lineTo(halfW - radius - 4, halfH - 9); g.stroke();
  }

  private addButtonImageFrame(parent: Node, text: string, style: string, width: number, height: number): void {
    const index = this.buttonFrameIndex(text, style); const frameNode = new Node(`ImageButtonFrame-${index}`); frameNode.layer = Layers.Enum.UI_2D; frameNode.addComponent(UITransform).setContentSize(width, height); parent.addChild(frameNode); const g = frameNode.addComponent(Graphics); const compact = width < 100; const alpha = compact ? 145 : style === 'nav' ? 62 : style === 'nav-active' ? 190 : style === 'link' ? 92 : style === 'ghost' ? 150 : 225; const inset = compact ? 3 : 5; const radius = Math.max(6, Math.min(24, height * 0.31)); const warm = this.router?.route === 'home' || style === 'lobby-secondary';
    const outer = new Color(132, 76, 42, Math.min(230, alpha + 30)); const inner = new Color(LOBBY.gold.r, LOBBY.gold.g, LOBBY.gold.b, alpha); const energy = warm ? LOBBY.rubyLight : C.cyan;
    g.strokeColor = outer; g.lineWidth = compact ? 4 : 6; g.roundRect(-width / 2 + inset + 1, -height / 2 + inset - 2, width - inset * 2, height - inset * 2, radius); g.stroke();
    g.strokeColor = inner; g.lineWidth = compact ? 2 : 3; g.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, radius); g.stroke();
    g.strokeColor = new Color(255, 246, 207, Math.round(alpha * 0.62)); g.lineWidth = 1; g.moveTo(-width / 2 + inset + radius, height / 2 - inset - 1); g.lineTo(width / 2 - inset - radius, height / 2 - inset - 1); g.stroke();
    g.strokeColor = new Color(energy.r, energy.g, energy.b, Math.round(alpha * 0.58)); g.lineWidth = 1; g.roundRect(-width / 2 + inset * 1.9, -height / 2 + inset * 1.9, width - inset * 3.8, height - inset * 3.8, Math.max(4, radius - inset)); g.stroke(); frameNode.setSiblingIndex(Math.max(0, parent.children.length - 1));
  }

  private addButtonEdgePulse(parent: Node, width: number, height: number, color: Color, circular = false): void {
    const edge = new Node('ButtonEnergyEdge'); edge.layer = Layers.Enum.UI_2D; edge.addComponent(UITransform).setContentSize(width, height); edge.setPosition(0, 0); parent.addChild(edge); const graphics = edge.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, circular ? 112 : 62); graphics.lineWidth = circular ? 3 : 1.5; const inset = circular ? 3 : 2; if (circular) graphics.circle(0, 0, Math.max(2, Math.min(width, height) / 2 - inset)); else graphics.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, Math.min(24, Math.max(4, height * 0.3 - inset))); graphics.stroke(); const opacity = edge.addComponent(UIOpacity); opacity.opacity = circular ? 112 : 34; tween(opacity).to(circular ? 1.15 : 1.7, { opacity: circular ? 182 : 82 }, { easing: 'sineInOut' }).to(circular ? 1.35 : 1.9, { opacity: circular ? 70 : 28 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private input(parent: Node, placeholder: string, value: string, x: number, y: number, password = false): EditBox {
    const shellWidth = 650; const shellHeight = 88; const shell = this.panel(parent, x, y, shellWidth, shellHeight, 18, C.glassRaised, new Color(207, 133, 68), 2);
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
        const copy = visibilityButton.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = '';
      }, 'link');
      // The eye glyph already communicates visibility at phone scale. The
      // SHOW/HIDE word wrapped inside this narrow trailing slot and looked
      // like broken text on 390 px screens.
      const copy = visibilityButton.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = '';
    }
    return edit;
  }

  private avatar(parent: Node, x: number, y: number, index: number, size: number): Node {
    const safeIndex = Math.max(0, Math.min(AVATAR_PATHS.length - 1, index)); const colors = [C.cyan, C.gold, C.violet, C.green]; const node = this.panel(parent, x, y, size, size, size / 2, new Color(34, 23, 31), colors[safeIndex % colors.length], 4, false); const clip = new Node('PlayerPortraitClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(size - 8, size - 8); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; node.addChild(clip);
    const image = new Node('PlayerPortraitImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(size - 8, size - 8); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    resources.load(`${AVATAR_PATHS[safeIndex]}/texture`, Texture2D, (error, texture) => { if (error || !texture || !image.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame; tween(opacity).to(0.22, { opacity: 255 }, { easing: 'quadOut' }).start(); });
    const sheen = new Node('PortraitSheen'); sheen.layer = Layers.Enum.UI_2D; sheen.addComponent(UITransform).setContentSize(size * 0.3, size * 1.2); sheen.setPosition(-size * 0.62, 0); clip.addChild(sheen); sheen.angle = -20; const sg = sheen.addComponent(Graphics); sg.fillColor = new Color(255, 248, 218, 32); sg.roundRect(-size * 0.15, -size * 0.6, size * 0.3, size * 1.2, size * 0.12); sg.fill(); tween(sheen).delay(safeIndex * 0.08).to(2.4, { position: new Vec3(size * 0.62, 0, 0) }, { easing: 'sineInOut' }).to(0, { position: new Vec3(-size * 0.62, 0, 0) }).delay(3.2).union().repeatForever().start(); return node;
  }

  private progress(parent: Node, x: number, y: number, width: number, ratio: number): void {
    const bar = this.panel(parent, x, y, width, 22, 11, new Color(71, 24, 26), new Color(163, 92, 48), 1); const fill = this.panel(bar, -width / 2 + width * ratio / 2, 0, Math.max(4, width * ratio), 12, 6, C.cyan); fill.name = 'ProgressFill';
  }

  private modal(width: number, height: number): Node {
    const mask = this.panel(this.overlay, 0, 0, SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight, 0, new Color(38, 12, 17, 210)); const card = this.panel(mask, 0, 0, Math.min(width, SafeAreaAdapter.visibleWidth - 100), Math.min(height, SafeAreaAdapter.visibleHeight - 160), 38, C.panel, C.chrome, 2); card.setScale(new Vec3(0.85, 0.85, 1)); tween(card).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); return card;
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

  private showDeleteAccountConfirmation(): void {
    const player = this.ensurePlayer(); const modal = this.modal(840, player.isGuest ? 680 : 850);
    this.label(modal, 'DELETE ACCOUNT & DATA', 0, player.isGuest ? 235 : 320, 37, C.red, true, 700);
    this.label(modal, 'This permanently removes the profile, wallet and gameplay data.\nRequired purchase and fraud records may be retained as described in Privacy.', 0, player.isGuest ? 145 : 230, 19, C.white, false, 700);
    const password = player.isGuest || player.signInProvider === 'apple' ? undefined : this.input(modal, 'Current password', '', 0, 100, true);
    if (player.signInProvider === 'apple') this.label(modal, 'Your active Apple-authenticated session authorizes this deletion.', 0, 102, 18, C.cyan, true, 700);
    const confirmation = this.input(modal, 'Type DELETE', '', 0, player.isGuest ? 30 : -15);
    this.button(modal, 'PERMANENTLY DELETE', 0, player.isGuest ? -105 : -150, 520, 78, () => {
      if (confirmation.string !== 'DELETE') { this.toast('Type DELETE exactly to continue', C.red); return; }
      void this.bootstrap.auth.deleteCurrentAccount(password?.string ?? '').then((result) => {
        if (!result.ok) { this.toast(result.message ?? 'Account deletion failed', C.red); return; }
        this.closeModal(modal); this.toast('Account and gameplay data deleted', C.green); this.router.reset('login');
      });
    }, 'ghost');
    this.button(modal, 'CANCEL', 0, player.isGuest ? -205 : -250, 280, 54, () => this.closeModal(modal), 'link');
  }

  private toast(message: string, color: Color): void {
    const box = this.panel(this.toastLayer, 0, -700, 820, 90, 28, new Color(65, 20, 25, 250), color, 2); this.label(box, message, 0, 0, 21, C.white, true, 760); box.setScale(new Vec3(0.9, 0.9, 1)); tween(box).to(0.18, { position: new Vec3(0, -620, 0), scale: Vec3.ONE }, { easing: 'backOut' }).delay(2).to(0.25, { position: new Vec3(0, -700, 0), scale: new Vec3(0.9, 0.9, 1) }).call(() => box.destroy()).start();
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
  private themeColor(id: GameId): Color { return id === 'golden-parade' ? new Color(239, 174, 87) : id === 'blossom-fortune' ? new Color(76, 177, 128) : id === 'lantern-treasure' ? new Color(226, 103, 79) : new Color(93, 177, 207); }
  private selectQueryGame(query: URLSearchParams): void { const id = query.get('game') as GameId | null; if (id && GAME_CONFIG_BY_ID[id]) this.selectedGame = GAME_CONFIG_BY_ID[id]; }
  private forceFromQuery(force: string | null): ForceResult | undefined { if (force === 'win') return { symbolId: this.selectedGame.symbols.find((s) => s.tier === 'high')?.id, count: 5, wild: true }; if (force === 'free') return { scatterCount: 5 }; if (force === 'hold') return { holdAndSpin: true }; if (force === 'big' || force === 'mega' || force === 'epic') return { winTier: force }; return undefined; }
}

function okStyle(ok: boolean): string { return ok ? 'secondary' : 'ghost'; }
