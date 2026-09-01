import {
  _decorator, Button, Color, Component, EditBox, EventTouch, Graphics, Label, Layers, Mask, Node, profiler, Rect, resources,
  Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec2, Vec3,
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
type CabinetControlCropMode = false | 'secondary' | 'spin' | 'auto';
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
type CabinetLayout = {
  readonly titleX: number;
  readonly titleY: number;
  readonly titleWidth: number;
  readonly titleHeight: number;
  readonly mascotX: number;
  readonly mascotY: number;
  readonly balanceCoinX: number;
  readonly balanceLabelX: number;
  readonly balanceY: number;
  readonly reelY: number;
  readonly reelWidth: number;
  readonly reelHeight: number;
  readonly reelRadius: number;
  readonly reelFaceted: boolean;
  readonly reelGlassColor: Color;
  readonly winCoinX: number;
  readonly winLabelX: number;
  readonly winY: number;
  readonly minusX: number;
  readonly minusY: number;
  readonly plusX: number;
  readonly plusY: number;
  readonly spinX: number;
  readonly spinY: number;
  readonly autoX: number;
  readonly autoY: number;
  readonly betCoinX: number;
  readonly betLabelX: number;
  readonly betReadoutY: number;
  readonly payoutsX: number;
  readonly payoutsY: number;
  readonly turboX: number;
  readonly turboY: number;
};
const CARD_HERO_SYMBOLS = ['crown', 'guardian', 'seven', 'core'] as const;
const CHARACTER_PATHS = [
  'generated/common/character_astral_v01', 'generated/common/character_golden_v01',
  'generated/common/character_neon_v01', 'generated/common/character_cosmic_v01',
] as const;
const BUTTON_FRAME_PATHS = [
  'generated/common/button_frame_astral_v01', 'generated/common/button_frame_golden_v01',
  'generated/common/button_frame_neon_v01', 'generated/common/button_frame_cosmic_v01',
] as const;
const CABINET_CONTROL_PATHS = {
  spin: 'generated/common/cabinet_control_spin_v01',
  bet: 'generated/common/cabinet_control_bet_v01',
  auto: 'generated/common/cabinet_control_auto_v01',
  secondary: 'generated/common/cabinet_control_secondary_v01',
} as const;
const GENERATED_ART_PATHS = {
  jackpotStage: 'generated/common/jackpot_pearl_stage_v03',
  pearlFortuneTitle: 'generated/common/pearl_fortune_title_v01',
  currencyCoin: 'generated/common/currency_coin_icon_v01',
  fortuneMascots: 'generated/common/fortune_mascot_atlas_v01',
  luckyWheel: 'generated/common/lucky_pearl_wheel_disc_v02',
  largePanelFrame: 'generated/common/casino_bezel_large_frame_v02',
  largePanelFrameMedium: 'generated/common/casino_bezel_large_frame_v02_medium',
  largePanelFrameCompact: 'generated/common/casino_bezel_large_frame_v02_compact',
  homeEmbeddedScreen: 'generated/home/home_embedded_slot_screen_v01',
  loadingFrame: 'generated/common/button_frame_golden_v01',
  loadingMedallion: 'generated/common/cabinet_control_spin_v01',
} as const;
const GAME_TITLE_PATHS: Readonly<Record<GameId, string>> = {
  'astral-vault': 'generated/game01/title_v02',
  'golden-dynasty': 'generated/game02/title_v02',
  'neon-classic': 'generated/game03/title_v02',
  'cosmic-coins': 'generated/game04/title_v02',
};
const CABINET_LAYOUTS: Readonly<Record<GameId, CabinetLayout>> = {
  'astral-vault': {
    titleX: 0, titleY: 676, titleWidth: 710, titleHeight: 126, mascotX: 412, mascotY: 676,
    balanceCoinX: -128, balanceLabelX: 34, balanceY: 494,
    reelY: 136, reelWidth: 804, reelHeight: 526, reelRadius: 52, reelFaceted: false, reelGlassColor: new Color(255, 247, 236, 42), winCoinX: -126, winLabelX: 0, winY: -211,
    minusX: -436, minusY: -336, plusX: -282, plusY: -336, spinX: 0, spinY: -362, autoX: 370, autoY: -345,
    betCoinX: -150, betLabelX: 38, betReadoutY: -500, payoutsX: -405, payoutsY: -820, turboX: 405, turboY: -820,
  },
  'golden-dynasty': {
    titleX: 0, titleY: 624, titleWidth: 720, titleHeight: 142, mascotX: -412, mascotY: 612,
    balanceCoinX: -128, balanceLabelX: 34, balanceY: 444,
    reelY: 174, reelWidth: 816, reelHeight: 448, reelRadius: 42, reelFaceted: false, reelGlassColor: new Color(255, 239, 203, 48), winCoinX: -126, winLabelX: 0, winY: -93,
    minusX: -448, minusY: -259, plusX: -270, plusY: -259, spinX: 0, spinY: -259, autoX: 360, autoY: -259,
    betCoinX: -168, betLabelX: 20, betReadoutY: -438, payoutsX: -405, payoutsY: -820, turboX: 405, turboY: -820,
  },
  'neon-classic': {
    titleX: 0, titleY: 670, titleWidth: 720, titleHeight: 150, mascotX: 412, mascotY: 682,
    balanceCoinX: -128, balanceLabelX: 34, balanceY: 446,
    reelY: 135, reelWidth: 800, reelHeight: 470, reelRadius: 48, reelFaceted: false, reelGlassColor: new Color(255, 239, 231, 38), winCoinX: -126, winLabelX: 0, winY: -198,
    minusX: -360, minusY: -387, plusX: -211, plusY: -387, spinX: 0, spinY: -367, autoX: 292, autoY: -371,
    betCoinX: -150, betLabelX: 38, betReadoutY: -495, payoutsX: -405, payoutsY: -820, turboX: 405, turboY: -820,
  },
  'cosmic-coins': {
    titleX: 0, titleY: 580, titleWidth: 680, titleHeight: 128, mascotX: -412, mascotY: 562,
    balanceCoinX: -128, balanceLabelX: 34, balanceY: 400,
    reelY: 112, reelWidth: 696, reelHeight: 438, reelRadius: 22, reelFaceted: true, reelGlassColor: new Color(235, 255, 244, 42), winCoinX: -126, winLabelX: 0, winY: -199,
    minusX: -360, minusY: -343, plusX: -205, plusY: -343, spinX: 0, spinY: -353, autoX: 300, autoY: -353,
    betCoinX: -150, betLabelX: 38, betReadoutY: -488, payoutsX: -405, payoutsY: -820, turboX: 405, turboY: -820,
  },
};
const FRAME_TEXTURE_SIZES = [
  { width: 556, height: 254 }, { width: 560, height: 248 },
  { width: 550, height: 279 }, { width: 562, height: 284 },
] as const;
const FRAME_STYLES: readonly { textureIndex: number; angle?: number; tint?: Color }[] = [
  { textureIndex: 1, tint: new Color(255, 244, 214) },
  { textureIndex: 1, tint: new Color(255, 236, 188) },
  { textureIndex: 1, tint: new Color(255, 231, 202) },
  { textureIndex: 1, tint: new Color(255, 246, 224) },
  { textureIndex: 1, tint: new Color(255, 238, 202) },
];
// The four generated frames do not share the same inner window. In
// particular, Neon and Cosmic have a tall crest but a shallow lower rail.
// Treating them as symmetric nine-slices stretches the crest into the panel
// and is the source of the visible "frame pressing on content" problem.
const FRAME_METRICS: readonly FrameMetrics[] = [
  // Inner-window ratios are measured from the alpha-transparent run through
  // each source texture's centre, rather than estimated from its silhouette.
  { leftRatio: 0.19, rightRatio: 0.19, topRatio: 0.27, bottomRatio: 0.27, innerLeftRatio: 0.0679, innerRightRatio: 0.0696, innerTopRatio: 0.1653, innerBottomRatio: 0.1613 },
  { leftRatio: 0.19, rightRatio: 0.19, topRatio: 0.27, bottomRatio: 0.27, innerLeftRatio: 0.0679, innerRightRatio: 0.0696, innerTopRatio: 0.1653, innerBottomRatio: 0.1613 },
  { leftRatio: 0.19, rightRatio: 0.19, topRatio: 0.27, bottomRatio: 0.27, innerLeftRatio: 0.0679, innerRightRatio: 0.0696, innerTopRatio: 0.1653, innerBottomRatio: 0.1613 },
  { leftRatio: 0.19, rightRatio: 0.19, topRatio: 0.27, bottomRatio: 0.27, innerLeftRatio: 0.0679, innerRightRatio: 0.0696, innerTopRatio: 0.1653, innerBottomRatio: 0.1613 },
  { leftRatio: 0.19, rightRatio: 0.19, topRatio: 0.27, bottomRatio: 0.27, innerLeftRatio: 0.0679, innerRightRatio: 0.0696, innerTopRatio: 0.1653, innerBottomRatio: 0.1613 },
];
const C = {
  ink: new Color(48, 10, 19), navy: new Color(83, 20, 30), panel: new Color(78, 20, 30, 238),
  panel2: new Color(105, 29, 38, 242), gold: new Color(229, 178, 79), paleGold: new Color(255, 242, 197),
  cyan: new Color(255, 224, 196), violet: new Color(232, 145, 158), white: new Color(255, 251, 240),
  muted: new Color(222, 192, 158), red: new Color(241, 104, 118), green: new Color(113, 204, 151),
};
const ZH: Readonly<Record<string, string>> = {
  HOME: '首页', STORE: '商店', REWARDS: '奖励', RANK: '排行', PROFILE: '我的', SETTINGS: '设置', ACHIEVEMENTS: '成就', INBOX: '邮箱',
  'ACCOUNT SIGN IN': '账号登录', 'ENTER THE CASINO': '进入游戏', 'CREATE LOCAL ACCOUNT': '注册本地账号', 'FORGOT PASSWORD': '忘记密码', 'CONTINUE AS GUEST': '游客登录',
  'CREATE ACCOUNT': '创建账号', 'CREATE PROFILE': '创建资料', 'BACK TO SIGN IN': '返回登录', 'RETURN TO LOGIN': '返回登录',
  'DAILY CHECK-IN': '每日签到', 'LUCKY WHEEL': '幸运转盘', 'CLAIM TODAY': '领取今日奖励', CLAIM: '领取', CLAIMED: '已领取', LOCKED: '未解锁', COLLECT: '领取',
  'DEMO CREDITS': '试玩金币', 'ADD DEMO': '添加试玩金币', 'SIGN IN': '去登录', 'REWARD CENTER': '奖励中心', 'STAR RANK': '星际排行',
  MUSIC: '音乐', 'SOUND EFFECTS': '音效', VIBRATION: '震动', QUALITY: '画质', LANGUAGE: '语言', ENGLISH: '英文', '简体中文': '简体中文',
  ON: '开', OFF: '关', LOW: '低', MEDIUM: '中', HIGH: '高', 'CLEAR LOCAL DATA': '清除本地数据', 'RESET…': '重置…',
  SPIN: '旋转', PAYTABLE: '赔付表', PAYOUTS: '赔率表', RULES: '规则', 'HOW TO PLAY': '玩法规则', CLOSE: '关闭', 'LOG OUT': '退出登录', 'CHANGE AVATAR': '更换头像', 'MARK READ': '标为已读', 'DELETE READ': '删除已读',
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
  private betCurrencyIcon?: Node;
  private winCurrencyIcon?: Node;
  private spinButtonLabel?: Label;
  private autoButtonLabel?: Label;
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
  private readonly largePanelFrameTextureCache = new Map<string, Texture2D>();

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
    [GENERATED_ART_PATHS.largePanelFrame, GENERATED_ART_PATHS.largePanelFrameMedium, GENERATED_ART_PATHS.largePanelFrameCompact].forEach((path) => {
      resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (!error && texture) this.largePanelFrameTextureCache.set(path, texture); });
    });
  }

  private withFrameTexture(index: number, callback: (texture: Texture2D) => void): void {
    const cached = this.frameTextureCache.get(index); if (cached) { callback(cached); return; }
    resources.load(`${BUTTON_FRAME_PATHS[index]}/texture`, Texture2D, (error, texture) => {
      if (error || !texture) return; this.frameTextureCache.set(index, texture); callback(texture);
    });
  }

  private withLargePanelFrameTexture(path: string, callback: (texture: Texture2D) => void): void {
    const cached = this.largePanelFrameTextureCache.get(path); if (cached) { callback(cached); return; }
    resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture) return; this.largePanelFrameTextureCache.set(path, texture); callback(texture);
    });
  }

  private showBoot(): void {
    this.clearAll();
    this.paintBackdrop('boot', new Color(48, 10, 19), new Color(143, 72, 51));
    this.addStarField(this.page, 54);
    this.addLoadingOrbit(this.page, 0, 420, C.cyan, 156);
    const brandMark = this.addPremiumSymbol(this.page, GAME_CONFIGS[0], 'crown', 0, 420, 230, 'pulse', 255, 0.08);
    tween(brandMark).to(1.15, { scale: new Vec3(1.055, 1.055, 1) }, { easing: 'sineInOut' }).to(1.25, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    this.artLabel(this.page, 'GILDED PEARL', 0, 205, 68, 820);
    this.artLabel(this.page, 'CASINO', 0, 116, 54, 620);
    this.label(this.page, 'PLAY • WIN • CELEBRATE', 0, 28, 23, C.paleGold, true);
    const bar = this.panel(this.page, 0, -430, 680, 24, 12, new Color(79, 14, 24), C.gold, 2, false);
    const fill = this.panel(bar, 0, 0, 660, 12, 6, C.cyan); fill.setScale(new Vec3(0.001, 1, 1));
    const progress = this.label(this.page, 'POLISHING THE PEARLS  0%', 0, -385, 22, C.muted);
    tween(fill).to(1.7, { scale: Vec3.ONE }, { easing: 'quadInOut', onUpdate: (_target, ratio = 0) => { progress.string = `POLISHING THE PEARLS  ${Math.floor(ratio * 100)}%`; } }).call(() => {
      const player = this.bootstrap.profile.current();
      this.router.reset(player && !player.isGuest && this.bootstrap.save.read().rememberLogin ? 'home' : 'login');
    }).start();
    this.label(this.page, 'All rewards use local demo credits • No cash value', 0, -770, 20, C.muted);
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
    for (const layer of [this.background, this.page, this.navigation, this.overlay]) { for (const child of [...(layer?.children ?? [])]) { child.removeFromParent(); child.destroy(); } }
    this.balanceLabel = undefined; this.reelEngine = undefined; this.winLabel = undefined; this.betLabel = undefined; this.betCurrencyIcon = undefined; this.winCurrencyIcon = undefined; this.spinButtonLabel = undefined; this.autoButtonLabel = undefined;
  }

  private onLayoutChanged(): void { if (this.router && !this.spinning) this.render(this.router.route); }

  private showLogin(): void {
    this.paintBackdrop('login', C.ink, new Color(146, 75, 52)); this.addStarField(this.page, 34);
    this.addPremiumSymbol(this.page, GAME_CONFIGS[0], 'crown', -385, 580, 112, 'float', 210, 0.15);
    this.addPremiumSymbol(this.page, GAME_CONFIGS[3], 'bonus', 385, 580, 112, 'float', 210, 0.35);
    this.artLabel(this.page, 'GILDED PEARL CASINO', 0, 590, 48, 860);
    this.label(this.page, 'WELCOME TO THE FORTUNE LOUNGE', 0, 486, 24, C.white, true);
    const card = this.panel(this.page, 0, -20, 820, 860, 38, new Color(77, 19, 29, 242), C.gold, 2);
    this.label(card, 'ACCOUNT SIGN IN', 0, 350, 40, C.paleGold, true);
    this.userNameInput = this.input(card, 'Username', '', 0, 270, false);
    this.passwordInput = this.input(card, 'Password', '', 0, 150, true);
    let remember!: Node; remember = this.button(card, '✓  REMEMBER ME', -190, 50, 330, 54, () => { this.rememberLogin = !this.rememberLogin; const copy = remember.getChildByName('Text')?.getComponent(Label); if (copy) copy.string = `${this.rememberLogin ? '✓' : '○'}  REMEMBER ME`; }, 'ghost');
    this.button(card, 'ENTER THE CASINO', 0, -60, 640, 92, () => this.login(), 'primary');
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
    this.paintBackdrop('login', C.ink, new Color(144, 73, 51)); this.header('CREATE ACCOUNT', true);
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
    this.paintBackdrop('login', C.ink, new Color(133, 63, 48)); this.header('LOCAL RECOVERY', true);
    const card = this.panel(this.page, 0, 120, 820, 670, 38, C.panel, C.gold, 2);
    this.label(card, 'FORGOT YOUR PASSWORD?', 0, 245, 34, C.paleGold, true);
    this.label(card, 'This is a local demonstration. No email will be sent.', 0, 170, 21, C.muted);
    const identifier = this.input(card, 'Username or email', 'demo', 0, 55);
    this.button(card, 'CHECK LOCAL PROFILE', 0, -75, 620, 86, () => this.toast(this.bootstrap.auth.localPasswordHint(identifier.string), C.cyan), 'primary');
    this.button(card, 'RETURN TO LOGIN', 0, -185, 360, 56, () => this.router.back('login'), 'link');
  }

  private showHome(): void {
    this.paintBackdrop('home', new Color(48, 10, 19), new Color(151, 80, 52)); this.addStarField(this.page, 32); this.topBar();
    const banner = this.panel(this.page, 0, 495, 960, 340, 34, new Color(91, 25, 34, 238), C.gold, 2);
    const bannerInsets = this.visualSurfaceInsets(960, 340, 0); const bannerWidth = 960 - bannerInsets.left - bannerInsets.right; const bannerHeight = 340 - bannerInsets.top - bannerInsets.bottom; const bannerX = (bannerInsets.left - bannerInsets.right) / 2; const bannerY = (bannerInsets.bottom - bannerInsets.top) / 2;
    this.addBannerCarousel(banner, bannerWidth, bannerHeight, bannerX, bannerY); this.addCardMotes(banner, 12, C.cyan, Math.max(100, bannerWidth - 50), Math.max(80, bannerHeight - 40));
    this.addCardShine(banner, bannerWidth, bannerHeight, C.gold, 0.3, bannerX, bannerY);
    this.outlineLabel(this.label(banner, 'GILDED PEARL CASINO', -250, 76, 30, C.white, true, 420), new Color(75, 8, 18), 4);
    this.outlineLabel(this.label(banner, 'FOUR MACHINES\nONE FORTUNE FLOOR', -205, 0, 44, C.paleGold, true, 470), new Color(69, 7, 17), 5);
    this.button(banner, 'DAILY CHECK-IN', -265, -112, 360, 58, () => this.router.go('check-in'), 'secondary');
    this.button(banner, 'LUCKY WHEEL', 235, -112, 300, 58, () => this.router.go('wheel'), 'secondary');
    this.outlineLabel(this.label(this.page, 'CHOOSE YOUR LUCKY MACHINE', 0, 278, 34, C.white, true, 800), new Color(67, 7, 17), 4);
    this.addHomeJackpotMarquee();
    const positions = [[-255, 0], [255, 0], [-255, -380], [255, -380]] as const;
    GAME_CONFIGS.forEach((config, index) => this.gameCard(config, positions[index][0], positions[index][1], index));
    this.addHomeFortuneHost();
    this.bottomNav('home');
  }

  private gameCard(config: GameConfig, x: number, y: number, index: number): void {
    const card = this.panel(this.page, x, y, 450, 330, 28, new Color(0, 0, 0, 0), undefined, 0, false);
    card.name = `CasinoMachineCard-${index + 1}`;
    const mediaWidth = 438; const mediaHeight = 318;
    const media = this.addGameCardArt(card, index, mediaWidth, mediaHeight);
    this.addCardMotes(media, 9, index === 0 ? C.gold : this.themeColor(config.id), 382, 258);
    const artInsets = { left: 7, right: 7, top: 7, bottom: 7 }; const artWidth = mediaWidth - artInsets.left - artInsets.right; const artHeight = mediaHeight - artInsets.top - artInsets.bottom; this.addCardShine(media, artWidth, artHeight, index === 0 ? C.gold : C.cyan, 0.8 + index * 1.1);
    this.addPremiumSymbol(media, config, config.scatterId ?? config.bonusId ?? config.wildId, -160, -72, 56, 'pulse', 225, index * 0.12);
    this.addMascot(media, index, 151, -56, 104, 132, 245, index * 0.08);
    this.addLargePanelImageBorder(card, 482, 364, 246);
    const title = this.addGeneratedImage(card, GAME_TITLE_PATHS[config.id], 0, 101, 302, 68, 255, 0.06 + index * 0.06); tween(title).to(1.25, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' }).to(1.4, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    const strip = this.panel(card, 0, -111, 354, 66, 18, new Color(255, 246, 222, 248), new Color(193, 132, 43, 225), 2, false); strip.name = 'MachineFeaturePlaque'; this.addCardShine(strip, 342, 56, C.white, 0.7 + index * 0.32);
    this.outlineLabel(this.label(strip, config.payMode === 'ways' ? '243 WAYS • EXPANDING WILD' : index === 2 ? '3 REELS • HOLD & NUDGE' : index === 3 ? '20 LINES • HOLD & SPIN' : '20 LINES • FREE SPINS', 0, 12, 20, new Color(86, 14, 24), true, 338), new Color(255, 253, 235), 2);
    this.outlineLabel(this.label(strip, index === 0 ? 'PEARL LOUNGE' : index === 2 ? 'RUBY CLASSIC' : index === 3 ? 'DIAMOND JACKPOT' : 'FORTUNE GARDEN', 0, -17, 17, new Color(112, 51, 17), true, 338), new Color(255, 250, 226), 2);
    const button = card.addComponent(Button); button.interactable = true; button.transition = Button.Transition.NONE;
    card.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(8); this.vfx?.buttonBurst(card, this.themeColor(config.id)); Tween.stopAllByTarget(card); tween(card).to(0.08, { scale: new Vec3(0.97, 0.97, 1) }).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }, this);
    card.on(Button.EventType.CLICK, () => { this.selectedGame = config; this.router.go('game-loading'); }, this);
  }

  private showStore(): void {
    const player = this.ensurePlayer(); const guest = player.isGuest;
    this.paintBackdrop('store', C.ink, new Color(139, 68, 48)); this.topBar('STORE');
    this.label(this.page, 'DEMO CREDITS', 0, 650, 47, C.paleGold, true);
    this.label(this.page, guest ? 'GUEST MODE • TOP-UPS LOCKED' : 'No real payment • No cash value', 0, 595, 21, guest ? C.red : C.muted, true);
    const daily = this.panel(this.page, 0, 475, 920, 160, 28, new Color(100, 27, 38), C.cyan, 2, true, 0, 218);
    this.addCardShine(daily, 900, 142, C.cyan, 0.4);
    this.addPremiumSymbol(daily, GAME_CONFIGS[3], 'bonus', -325, -5, 62, 'pulse', 245); this.label(daily, 'DAILY PEARL GIFT', -170, 13, 25, C.white, true, 330); this.label(daily, '+5,000 DEMO CREDITS', -160, -22, 18, C.cyan, false, 350);
    this.button(daily, 'CLAIM', 292, -7, 220, 56, () => { const ok = this.bootstrap.store.claimDaily(this.today()); this.toast(ok ? '5,000 demo credits collected' : 'Already collected today', ok ? C.green : C.muted); this.refreshBalance(); }, okStyle(true));
    DEMO_PRODUCTS.forEach((product, index) => {
      // The Cosmic ornament adds about 29 px beyond a 205 px product panel.
      // Start the product stack 10 px lower so its top rail clears the daily
      // gift's lower rail instead of the two translucent crests crossing.
      const y = 250 - index * 245; const card = this.panel(this.page, 0, y, 920, 205, 28, C.panel2, index === 2 ? C.gold : new Color(160, 111, 54), index === 2 ? 3 : 1, true, 3, index === 2 ? 228 : 216);
      this.addCardShine(card, 900, 185, index === 2 ? C.gold : C.cyan, 1 + index * 0.9);
      this.addPremiumSymbol(card, GAME_CONFIGS[3], 'bonus', -320, -7, 64, 'pulse', 245, index * 0.12); this.label(card, product.label, -170, 18, 24, C.white, true, 320);
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
    this.paintBackdrop('rewards', C.ink, new Color(151, 77, 54)); this.topBar('REWARD CENTER');
    this.label(this.page, 'YOUR GOLDEN PATH REWARDS', 0, 650, 38, C.paleGold, true);
    const cards: readonly [string, string, string, Route, Color][] = [
      ['7-DAY CHECK-IN', 'Current cycle and grand day-seven gift', 'OPEN', 'check-in', C.cyan],
      ['LUCKY WHEEL', '1 free local spin each day', 'SPIN', 'wheel', C.gold],
      ['ACHIEVEMENTS', 'Progress rewards across all four games', 'VIEW', 'achievements', C.violet],
      ['ONLINE REWARD', 'Local session gift available', 'CLAIM', 'rewards', C.green],
    ];
    cards.forEach(([title, body, action, route, color], index) => {
      const y = 430 - index * 270; const card = this.panel(this.page, 0, y, 920, 225, 30, C.panel2, color, 2);
      this.addCardShine(card, 900, 205, color, 0.8 + index * 1.1);
      const rewardArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[3], 'bonus'], [GAME_CONFIGS[0], 'orrery'], [GAME_CONFIGS[1], 'seal'], [GAME_CONFIGS[3], 'scatter']]; this.addPremiumSymbol(card, rewardArt[index][0], rewardArt[index][1], -350, 4, 82, 'pulse', 245, index * 0.1); this.label(card, title, -170, 28, 26, C.white, true, 420); this.label(card, body, -130, -18, 18, C.muted, false, 500);
      this.button(card, action, 310, 0, 220, 70, () => route === 'rewards' ? this.toast('Online demo reward timer: 04:28', C.green) : this.router.go(route), 'secondary');
    });
    this.bottomNav('rewards');
  }

  private showRank(tab: 'daily' | 'weekly' | 'all-time'): void {
    this.paintBackdrop('rank', C.ink, new Color(129, 62, 48)); this.topBar('FORTUNE RANK');
    const tabs: readonly [typeof tab, string][] = [['daily', 'DAILY'], ['weekly', 'WEEKLY'], ['all-time', 'ALL TIME']];
    tabs.forEach(([id, text], index) => this.button(this.page, text, -300 + index * 300, 620, 260, 62, () => this.showRank(id), id === tab ? 'primary' : 'ghost'));
    const snapshot = this.bootstrap.rank.snapshot(tab, this.ensurePlayer()); const rows = snapshot.leaders.slice(0, 7);
    rows.forEach((entry, index) => {
      const y = 480 - index * 145; const current = entry.current; const row = this.panel(this.page, 0, y, 900, 120, 20, current ? new Color(102, 62, 28) : C.panel, index < 3 ? C.gold : new Color(149, 97, 49), index < 3 ? 2 : 1);
      if (index < 3) this.addCardShine(row, 880, 102, C.gold, 0.5 + index * 1.2);
      if (index < 3) { const rankArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'crown'], [GAME_CONFIGS[1], 'seal'], [GAME_CONFIGS[2], 'seven']]; this.addPremiumSymbol(row, rankArt[index][0], rankArt[index][1], -370, 0, 62, 'pulse', 235, index * 0.1); } else this.label(row, entry.rankLabel, -370, 0, 30, C.muted, true);
      this.avatar(row, -290, 0, entry.avatar, 68); this.label(row, entry.nickname, -125, 12, 22, C.white, true, 300); this.label(row, current ? 'YOU' : 'FORTUNE PLAYER', -125, -16, 17, current ? C.cyan : C.muted, false, 300);
      this.label(row, this.format(entry.score), 315, 0, 25, C.paleGold, true, 230);
    });
    const mine = snapshot.current; if (mine) { const mineRow = this.panel(this.page, 0, -550, 900, 126, 24, new Color(108, 68, 30, 250), C.gold, 3); this.addCardShine(mineRow, 874, 104, C.paleGold, 1.1); this.outlineLabel(this.label(mineRow, `#${mine.rankLabel}`, -368, 0, mine.rankLabel.length > 3 ? 27 : 31, C.paleGold, true, 120), new Color(76, 11, 18), 3); this.avatar(mineRow, -286, 0, mine.avatar, 70); this.label(mineRow, mine.nickname, -118, 14, 23, C.white, true, 310); this.label(mineRow, 'MY RANK', -118, -18, 18, C.cyan, true, 330); this.label(mineRow, this.format(mine.score), 315, 0, 25, C.paleGold, true, 230); }
    this.label(this.page, `${snapshot.populationLabel} • UPDATED NOW`, 0, -672, 20, C.muted, true, 860);
    this.bottomNav('rank');
  }

  private showProfile(): void {
    this.paintBackdrop('profile', C.ink, new Color(143, 70, 53)); this.topBar('PROFILE');
    // Profile uses three different frame proportions in one vertical stack.
    // Its previous 320 px hero surface made the Cosmic lower crest overlap the
    // stat-card top rails even though the plain rounded rectangles only met.
    const player = this.ensurePlayer(); const card = this.panel(this.page, 0, 470, 900, 280, 34, C.panel2, C.gold, 2, true, 3, 222);
    this.addCardShine(card, 880, 260, C.gold, 0.6);
    this.avatar(card, -285, -4, player.avatar, 120); this.label(card, player.nickname, -70, 48, 32, C.white, true, 430); this.label(card, `ID  ${player.id.slice(-10).toUpperCase()}`, -55, 10, 18, C.muted, false, 470);
    this.label(card, `LEVEL ${player.level}`, -145, -28, 20, C.cyan, true, 250); this.progress(card, -105, -62, 320, player.experience % 100 / 100);
    this.button(card, 'CHANGE AVATAR', 230, -62, 200, 48, () => { this.bootstrap.profile.setAvatar((player.avatar + 1) % 12); this.showProfile(); }, 'ghost');
    const stats = [['SPINS', player.gamesPlayed], ['BIGGEST WIN', player.biggestWin], ['TOTAL WIN', player.totalWin]] as const;
    const statArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'orrery'], [GAME_CONFIGS[0], 'crown'], [GAME_CONFIGS[3], 'bonus']]; stats.forEach(([name, value], index) => { const x = -315 + index * 315; const box = this.panel(this.page, x, 235, 270, 150, 20, C.panel, new Color(156, 105, 53), 1, true, 0, 208); this.addPremiumSymbol(box, statArt[index][0], statArt[index][1], -72, -7, 52, 'pulse', 112, index * 0.1); this.label(box, name, 28, 12, 16, C.muted, false, 170); this.label(box, this.format(value), 28, -20, 22, C.paleGold, true, 170); });
    const entries: readonly [string, string, Route, Color][] = [
      ['ACHIEVEMENTS', `${this.bootstrap.redDots.achievements()} READY`, 'achievements', C.violet], ['INBOX', `${this.bootstrap.redDots.mail()} UNREAD`, 'mail', C.cyan], ['SETTINGS', player.settings.quality.toUpperCase(), 'settings', C.gold],
    ];
    // 180 px centres leave a visible air gap around the 171 px Astral outer
    // frames. Lowering the group also separates it from the stat-card frames.
    entries.forEach(([title, detail, route, color], index) => { const y = 10 - index * 180; const row = this.panel(this.page, 0, y, 900, 150, 22, C.panel2, color, 1, true, 0, 204); if (index === 0) this.addPremiumSymbol(row, GAME_CONFIGS[1], 'seal', -330, -6, 48, 'pulse', 225); else if (index === 1) this.label(row, '✉', -330, -6, 30, color); else this.addPremiumSymbol(row, GAME_CONFIGS[0], 'orrery', -330, -6, 48, 'orbit', 210); this.label(row, title, -170, 8, 21, C.white, true, 320); this.label(row, detail, -170, -20, 15, C.muted, false, 320); this.button(row, 'OPEN  ›', 305, -6, 170, 46, () => this.router.go(route), 'ghost'); });
    this.button(this.page, 'LOG OUT', 0, -570, 350, 62, () => { this.bootstrap.auth.logout(); this.router.reset('login'); }, 'ghost');
    this.bottomNav('profile');
  }

  private showCheckIn(): void {
    this.paintBackdrop('rewards', C.ink, new Color(157, 80, 54)); this.header('7-DAY PEARL CHECK-IN', true);
    this.label(this.page, 'Build your constellation one day at a time', 0, 630, 23, C.muted);
    const state = this.bootstrap.save.currentScope()?.checkIn ?? { cycleDay: 0, lastClaimDate: null };
    for (let index = 0; index < 7; index += 1) {
      const row = index < 4 ? 0 : 1; const column = row === 0 ? index : index - 4; const count = row === 0 ? 4 : 3;
      const x = (column - (count - 1) / 2) * (row === 0 ? 250 : 305); const y = row === 0 ? 300 : -40;
      const claimed = index < state.cycleDay; const current = index === state.cycleDay;
      const card = this.panel(this.page, x, y, row === 0 ? 210 : 260, 285, 24, current ? new Color(108, 65, 26) : C.panel, current ? C.gold : new Color(151, 98, 47), current ? 4 : 1);
      this.label(card, `DAY ${index + 1}`, 0, 58, 19, current ? C.paleGold : C.muted, true); this.addPremiumSymbol(card, index === 6 ? GAME_CONFIGS[0] : GAME_CONFIGS[3], index === 6 ? 'crown' : 'bonus', 0, 5, index === 6 ? 74 : 62, current ? 'pulse' : 'none', claimed ? 120 : 245, index * 0.06);
      this.label(card, `+${this.format(this.bootstrap.checkIn.rewards[index])}`, 0, -42, 21, C.white, true); if (claimed) this.label(card, '✓ CLAIMED', 0, -67, 15, C.green, true);
    }
    this.button(this.page, 'CLAIM TODAY', 0, -360, 650, 92, () => { const result = this.bootstrap.checkIn.claimToday(this.today()); this.toast(result.ok ? `Day ${result.day}: +${this.format(result.amount)} demo credits` : 'Today is already claimed', result.ok ? C.green : C.muted); if (result.ok) this.vfx.flyCredits(new Vec3(0, -360), new Vec3(330, 790), () => this.showCheckIn()); }, 'primary');
    this.button(this.page, 'DEMO MAKE-UP', 0, -475, 360, 56, () => this.toast('Make-up is a visual demo only', C.muted), 'ghost');
  }

  private showWheel(): void {
    this.paintBackdrop('wheel', C.ink, new Color(154, 73, 51)); this.header('LUCKY PEARL WHEEL', true);
    this.label(this.page, '1 FREE GOLDEN SPIN DAILY', 0, 625, 23, C.cyan, true);
    const wheel = new Node('Wheel'); wheel.layer = Layers.Enum.UI_2D; wheel.addComponent(UITransform).setContentSize(760, 760); wheel.setPosition(0, 105); this.page.addChild(wheel);
    const wheelArt = this.addGeneratedImage(wheel, GENERATED_ART_PATHS.luckyWheel, 0, 0, 660, 1010, 255, 0.04); wheelArt.name = 'LuckyPearlWheelArtwork';
    const sectorLabels: Label[] = []; this.bootstrap.wheel.sectors.forEach((value, index) => { const angle = Math.PI * 2 * (index + 0.5) / 8; const copy = this.outlineLabel(this.label(wheel, this.format(value), Math.cos(angle) * 222, Math.sin(angle) * 222, 22, C.white, true, 142), new Color(70, 8, 17), 3); copy.node.angle = -index * 45 - 22.5; sectorLabels.push(copy); });
    const pointer = new Node('WheelPointerAssembly'); pointer.layer = Layers.Enum.UI_2D; pointer.addComponent(UITransform).setContentSize(100, 132); pointer.setPosition(0, 498); this.page.addChild(pointer); const pointerGraphics = pointer.addComponent(Graphics); pointerGraphics.fillColor = new Color(191, 120, 34); pointerGraphics.moveTo(-28, 24); pointerGraphics.lineTo(28, 24); pointerGraphics.lineTo(0, -52); pointerGraphics.close(); pointerGraphics.fill(); pointerGraphics.fillColor = new Color(255, 236, 177); pointerGraphics.moveTo(-18, 18); pointerGraphics.lineTo(18, 18); pointerGraphics.lineTo(0, -36); pointerGraphics.close(); pointerGraphics.fill(); this.addPremiumSymbol(pointer, GAME_CONFIGS[2], 'bell', 0, 38, 48, 'pulse', 255, 0.08);
    this.addMascot(this.page, 1, 382, -286, 138, 178, 235, 0.12, () => this.toast('FORTUNE HOST • TAP SPIN FOR TODAY’S GIFT', C.gold));
    const resultCopy = this.outlineLabel(this.label(this.page, 'WEIGHTED DRAW • TOP PRIZE 25,000', 0, -292, 19, C.paleGold, true, 620), new Color(61, 7, 16), 3);
    const wheelState = this.bootstrap.save.currentScope()?.wheel; const canResume = Boolean(wheelState?.pending); const spinsLeft = this.label(this.page, `FREE SPINS LEFT: ${wheelState?.remaining ?? 0}`, 0, -345, 22, C.muted);
    let wheelRunning = false;
    let spinButton!: Node; spinButton = this.button(this.page, canResume || (wheelState?.remaining ?? 0) > 0 ? 'SPIN THE WHEEL' : 'COME BACK TOMORROW', 0, -455, 650, 92, () => {
      if (wheelRunning) return;
      const prepared = this.bootstrap.wheel.prepare(this.today());
      if (!prepared) return this.toast('No free spins remaining today', C.muted);
      wheelRunning = true; const spinControl = spinButton.getComponent(Button); if (spinControl) spinControl.interactable = false; const spinCopy = spinButton.getChildByName('Text')?.getComponent(Label); if (spinCopy) spinCopy.string = 'SPINNING…'; spinsLeft.string = `FREE SPINS LEFT: ${this.bootstrap.save.currentScope()?.wheel.remaining ?? 0}`;
      this.vfx.spinCharge(new Vec3(0, 105, 0), C.gold); tween(pointer).to(0.08, { angle: -13 }).to(0.1, { angle: 9 }).to(0.08, { angle: -7 }).to(0.11, { angle: 0 }).union().repeat(8).start();
      const target = this.bootstrap.wheel.targetRotation(prepared.sector);
      tween(wheel).by(0.4, { angle: 180 }, { easing: 'quadIn' }).by(1.4, { angle: target - 360 }, { easing: 'linear' }).by(1.2, { angle: 180 }, { easing: 'quartOut' }).call(() => {
        Tween.stopAllByTarget(pointer); pointer.angle = 0; wheelRunning = false; const ok = this.bootstrap.wheel.settle(prepared.spinId); const remaining = this.bootstrap.save.currentScope()?.wheel.remaining ?? 0;
        if (spinCopy?.node.isValid) spinCopy.string = remaining > 0 ? 'SPIN THE WHEEL' : 'COME BACK TOMORROW'; if (spinControl) spinControl.interactable = remaining > 0;
        if (ok) { resultCopy.string = `WIN +${this.format(prepared.amount)} • REWARD CREDITED`; resultCopy.color = C.paleGold; this.vfx.pulse(resultCopy.node); this.vfx.buttonBurst(sectorLabels[prepared.sector].node, C.gold); this.vfx.celebrateWin(new Vec3(0, 440, 0), C.gold); this.vfx.flyCredits(new Vec3(0, 440, 0), new Vec3(330, 790, 0), () => this.refreshBalance()); this.rewardModal('LUCKY WHEEL WIN', `POINTER LOCKED ON ${this.format(prepared.amount)}\n+${this.format(prepared.amount)} DEMO CREDITS`, C.gold); }
        else this.toast('Reward already settled', C.muted); this.refreshBalance();
      }).start();
    }, 'primary');
    const initialSpinControl = spinButton.getComponent(Button); if (initialSpinControl) initialSpinControl.interactable = canResume || (wheelState?.remaining ?? 0) > 0;
    const oddsButton = this.button(this.page, 'PRIZE ODDS', 0, -558, 340, 58, () => this.showWheelOdds(), 'ghost'); const oddsCopy = oddsButton.getChildByName('Text'); if (oddsCopy) oddsCopy.setPosition(24, 0); this.addPremiumSymbol(oddsButton, GAME_CONFIGS[3], 'bonus', -112, 0, 42, 'button', 220, 0.08);
  }

  private showWheelOdds(): void {
    const modal = this.modal(850, 1120); this.outlineLabel(this.label(modal, 'PRIZE ODDS', 0, 460, 42, C.paleGold, true, 700), new Color(68, 9, 17), 4);
    this.label(modal, 'WEIGHTED DAILY DRAW • TOTAL ODDS 100%', 0, 408, 20, new Color(255, 229, 171), true, 720);
    const entries = this.bootstrap.wheel.sectors.map((amount, sector) => ({ amount, chance: this.bootstrap.wheel.probabilityPercent(sector) })).sort((left, right) => left.amount - right.amount);
    entries.forEach((entry, index) => { const y = 334 - index * 86; const row = this.panel(modal, 0, y, 720, 70, 18, index % 2 ? new Color(94, 40, 27, 218) : new Color(72, 26, 23, 225), new Color(210, 151, 62, 115), 1, false); this.addCurrencyIcon(row, -310, 0, 34, index * 0.025); const amount = this.outlineLabel(this.label(row, this.format(entry.amount), -112, 0, 23, C.white, true, 320), new Color(47, 7, 13), 3); amount.horizontalAlign = Label.HorizontalAlign.LEFT; this.outlineLabel(this.label(row, `${entry.chance}%`, 265, 0, 24, entry.chance <= 3 ? C.paleGold : C.cyan, true, 130), new Color(52, 7, 14), 3); });
    this.outlineLabel(this.label(modal, 'One reward per day\nThe selected reward and pointer landing always match', 0, -374, 20, C.white, true, 700), new Color(48, 7, 13), 2);
    this.button(modal, 'CLOSE', 0, -472, 300, 62, () => modal.parent?.destroy(), 'secondary');
  }

  private showAchievements(): void {
    this.paintBackdrop('profile', C.ink, new Color(146, 67, 54)); this.header('ACHIEVEMENTS', true);
    this.label(this.page, 'ALL   •   SPIN   •   WIN   •   FEATURE', 0, 650, 21, C.muted);
    ACHIEVEMENTS.forEach((achievement, index) => {
      const y = 455 - index * 290; const state = this.bootstrap.achievements.state(achievement.id);
      const ready = state.progress >= achievement.target && !state.claimed; const card = this.panel(this.page, 0, y, 900, 240, 28, C.panel2, ready ? C.gold : new Color(145, 91, 45), ready ? 3 : 1);
      this.addPremiumSymbol(card, GAME_CONFIGS[1], 'seal', -350, 4, 74, ready ? 'pulse' : 'none', ready ? 255 : 145, index * 0.08); this.label(card, achievement.title, -165, 32, 25, C.white, true, 420); this.label(card, `${state.progress} / ${achievement.target}`, -165, -2, 18, C.muted, false, 420); this.progress(card, -90, -42, 480, Math.min(1, state.progress / achievement.target));
      this.label(card, `+${this.format(achievement.reward)}`, 315, 32, 18, C.paleGold, true);
      this.button(card, state.claimed ? 'CLAIMED' : ready ? 'CLAIM' : 'LOCKED', 315, -35, 200, 60, () => { const ok = this.bootstrap.achievements.claim(achievement.id); this.toast(ok ? 'Achievement reward collected' : 'Achievement is not ready', ok ? C.green : C.muted); }, ready ? 'primary' : 'ghost');
    });
  }

  private showMail(): void {
    this.paintBackdrop('profile', C.ink, new Color(126, 58, 47)); this.header('INBOX', true);
    this.button(this.page, 'CLAIM ALL', 250, 650, 300, 62, () => { const amount = this.bootstrap.mail.claimAll(); this.toast(amount ? `Collected ${this.format(amount)} demo credits` : 'No attachments available', amount ? C.green : C.muted); }, 'secondary');
    DEMO_MAIL.forEach((mail, index) => {
      const state = this.bootstrap.mail.state(mail.id); if (state.deleted) return; const y = 420 - index * 310;
      const card = this.panel(this.page, 0, y, 900, 260, 28, state.read ? C.panel : new Color(98, 57, 27), state.read ? new Color(145, 92, 48) : C.cyan, state.read ? 1 : 3);
      if (mail.kind === 'reward') this.addPremiumSymbol(card, GAME_CONFIGS[3], 'bonus', -345, 18, 70, 'pulse', state.read ? 145 : 250); else this.label(card, '✉', -345, 18, 34, state.read ? C.muted : C.cyan); this.label(card, mail.title, -135, 42, 25, C.white, true, 480); this.label(card, mail.body, -110, 2, 18, C.muted, false, 540); if (mail.credits) this.label(card, `ATTACHMENT  +${this.format(mail.credits)} CREDITS`, -115, -48, 17, C.paleGold, true, 520);
      this.button(card, mail.credits ? (state.claimed ? 'CLAIMED' : 'CLAIM') : 'MARK READ', 315, -50, 210, 58, () => { this.bootstrap.mail.read(mail.id); const ok = mail.credits ? this.bootstrap.mail.claim(mail.id) : true; this.toast(ok ? 'Message updated' : 'Attachment already collected', ok ? C.green : C.muted); }, state.claimed ? 'ghost' : 'secondary');
    });
    this.button(this.page, 'DELETE READ', 0, -610, 320, 58, () => { this.bootstrap.mail.deleteRead(); this.showMail(); }, 'ghost');
  }

  private showSettings(): void {
    this.paintBackdrop('profile', C.ink, new Color(137, 64, 49)); this.header('SETTINGS', true); const player = this.ensurePlayer();
    const rows: readonly [string, string, () => void][] = [
      ['MUSIC', player.settings.music ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ music: !player.settings.music }); this.showSettings(); }],
      ['SOUND EFFECTS', player.settings.sound ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ sound: !player.settings.sound }); this.showSettings(); }],
      ['VIBRATION', player.settings.vibration ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ vibration: !player.settings.vibration }); this.showSettings(); }],
      ['QUALITY', player.settings.quality.toUpperCase(), () => { const next = player.settings.quality === 'low' ? 'medium' : player.settings.quality === 'medium' ? 'high' : 'low'; this.bootstrap.profile.updateSettings({ quality: next }); this.vfx.setQuality(next); this.showSettings(); }],
      ['LANGUAGE', player.settings.language === 'en' ? 'ENGLISH' : '简体中文', () => { this.bootstrap.profile.updateSettings({ language: player.settings.language === 'en' ? 'zh-CN' : 'en' }); this.showSettings(); }],
    ];
    rows.forEach(([name, value, action], index) => { const y = 520 - index * 180; const row = this.panel(this.page, 0, y, 880, 140, 24, C.panel2, new Color(151, 99, 51), 1); this.label(row, name, -270, 0, 25, C.white, true, 380); this.button(row, value, 290, 0, 220, 62, action, value === 'OFF' ? 'ghost' : 'secondary'); });
    this.panel(this.page, 0, -440, 880, 190, 24, new Color(61, 24, 51), C.red, 1); this.label(this.page, 'CLEAR LOCAL DATA', -190, -410, 24, C.white, true, 420); this.label(this.page, 'Requires typing RESET in the debug confirmation flow.', -90, -455, 18, C.muted, false, 620);
    this.button(this.page, 'RESET…', 315, -435, 210, 60, () => this.showResetConfirmation(), 'ghost');
  }

  private showGameLoading(): void {
    const color = this.themeColor(this.selectedGame.id);
    this.paintBackdrop(`loading_${this.selectedGame.id}`, new Color(55, 11, 20), color); this.addStarField(this.page, 34);
    this.outlineLabel(this.label(this.page, 'GILDED PEARL CASINO', 0, 838, 24, C.paleGold, true, 720), new Color(69, 7, 17), 3);
    const title = this.addGeneratedImage(this.page, GAME_TITLE_PATHS[this.selectedGame.id], 0, 620, 740, 164, 255, 0.04);
    tween(title).to(1.15, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' }).to(1.3, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    this.outlineLabel(this.label(this.page, 'PREPARING YOUR LUCKY GAME', 0, 475, 24, C.white, true, 650), new Color(72, 7, 17), 3);

    const stage = new Node('FortuneLoadingStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(820, 560); stage.setPosition(0, 100); stage.setScale(new Vec3(0.72, 0.72, 1)); this.page.addChild(stage); const stageOpacity = stage.addComponent(UIOpacity); stageOpacity.opacity = 0;
    this.addLoadingOrbit(stage, 135, 10, color, 168); this.addLoadingOrbit(stage, 135, 10, C.gold, 118);
    const heroId = this.selectedGame.scatterId ?? this.selectedGame.bonusId ?? this.selectedGame.wildId;
    const loadingMascotIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); this.addMascot(stage, loadingMascotIndex, -185, -8, 260, 326, 255, 0.04); const hero = this.addPremiumSymbol(stage, this.selectedGame, heroId, 135, 10, 224, 'pulse', 255, 0.08); hero.setScale(new Vec3(0.68, 0.68, 1)); tween(hero).to(0.46, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    for (let index = 0; index < 20; index += 1) { const angle = Math.PI * 2 * index / 20; const bulb = new Node(`LoadingBulb-${index}`); bulb.layer = Layers.Enum.UI_2D; bulb.addComponent(UITransform).setContentSize(18, 18); bulb.setPosition(135 + Math.cos(angle) * 194, 10 + Math.sin(angle) * 132); stage.addChild(bulb); const graphics = bulb.addComponent(Graphics); graphics.fillColor = index % 3 === 0 ? C.white : C.gold; graphics.circle(0, 0, index % 3 === 0 ? 6 : 4.5); graphics.fill(); const bulbOpacity = bulb.addComponent(UIOpacity); bulbOpacity.opacity = 28; tween(bulbOpacity).delay(index * 0.055).to(0.12, { opacity: 255 }).to(0.28, { opacity: 70 }).union().repeatForever().start(); }
    tween(stageOpacity).to(0.25, { opacity: 255 }).start(); tween(stage).to(0.5, { scale: Vec3.ONE }, { easing: 'backOut' }).start();

    const statusY = -470; const bar = this.panel(this.page, 0, statusY, 700, 30, 15, new Color(78, 13, 23, 220), new Color(238, 184, 77), 3, false); const fill = this.panel(bar, -334, 0, 668, 15, 8, new Color(255, 225, 132), undefined, 0, false); fill.setScale(new Vec3(0.001, 1, 1));
    this.addPearlRail(bar, 568, 28, 12);
    const progress = this.outlineLabel(this.label(this.page, 'GATHERING FORTUNE  0%', 0, statusY - 58, 25, C.paleGold, true, 760), new Color(78, 12, 23), 3);
    const feature = this.outlineLabel(this.label(this.page, this.selectedGame.feature.replace(/-/g, ' ').toUpperCase(), 0, statusY - 112, 21, C.white, true, 760), new Color(96, 20, 29), 3);
    tween(fill).delay(0.35).to(2.55, { scale: Vec3.ONE, position: Vec3.ZERO }, { easing: 'quadInOut', onUpdate: (_target, ratio = 0) => { if (progress.node.isValid) progress.string = `${ratio < 0.3 ? 'GATHERING FORTUNE' : ratio < 0.63 ? 'POLISHING GEMS' : ratio < 0.9 ? 'CALLING THE MASCOT' : 'READY TO PLAY'}  ${Math.floor(ratio * 100)}%`; } }).delay(0.12).call(() => this.router.replace('game')).start();
    tween(feature.node).to(1.05, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' }).to(1.15, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private showGame(): void {
    this.ensurePlayer();
    const color = this.themeColor(this.selectedGame.id); const layout = CABINET_LAYOUTS[this.selectedGame.id]; this.paintBackdrop(`game_${this.selectedGame.id}`, new Color(68, 17, 18), color); this.addStarField(this.page, 10);
    const featureIcon = this.selectedGame.scatterId ?? this.selectedGame.bonusId ?? this.selectedGame.wildId; const highIcon = this.selectedGame.symbols.find((symbol) => symbol.tier === 'high')?.id ?? this.selectedGame.wildId;
    const cornerButtonY = this.topY(812); const leftCornerX = -SafeAreaAdapter.visibleWidth / 2 + SafeAreaAdapter.safeLeft + 105; const rightCornerX = SafeAreaAdapter.visibleWidth / 2 - SafeAreaAdapter.safeRight - 150;
    this.cabinetUtilityHotspot(this.page, 'HOME', highIcon, leftCornerX, cornerButtonY, 180, 84, () => this.router.go('home'), 23, true);
    this.cabinetUtilityHotspot(this.page, 'HOW TO PLAY', featureIcon, rightCornerX, cornerButtonY, 270, 84, () => this.showRulesAndPayouts(), 21, true);
    const jackpotTiers = this.outlineLabel(this.label(this.page, 'MINI  88,888   •   MAJOR  888,888   •   GRAND  8,888,888', 0, this.topY(742), 19, new Color(255, 231, 176), true, 760), new Color(77, 13, 22), 2);
    tween(jackpotTiers.node).to(1.1, { scale: new Vec3(1.018, 1.018, 1) }, { easing: 'sineInOut' }).to(1.25, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    const title = this.addGeneratedImage(this.page, GAME_TITLE_PATHS[this.selectedGame.id], layout.titleX, layout.titleY, layout.titleWidth, layout.titleHeight, 255, 0.04);
    tween(title).to(1.4, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' }).to(1.5, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    const mascotIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame)); let gameMascot!: Node; gameMascot = this.addMascot(this.page, mascotIndex, layout.mascotX, layout.mascotY, 145, 184, 232, 0.12, () => { const mascotPosition = gameMascot.position.clone(); this.vfx.celebrateWin(mascotPosition, color); this.vfx.flyCredits(mascotPosition, new Vec3(-115, layout.balanceY, 0)); this.toast(`${this.selectedGame.name} LUCK IS READY`, color); }, true);
    const balanceCoin = this.addCurrencyIcon(this.page, layout.balanceCoinX, layout.balanceY, 40, 0.08); this.makeCurrencyInteractive(balanceCoin, () => this.toast(`BALANCE  ${this.format(this.bootstrap.economy.balance())} DEMO CREDITS`, C.gold)); this.balanceLabel = this.outlineLabel(this.label(this.page, `BALANCE  ${this.format(this.bootstrap.economy.balance())}`, layout.balanceLabelX, layout.balanceY, 21, new Color(103, 28, 32), true, 310), new Color(255, 247, 218), 2);
    const reelFrame = this.panel(this.page, 0, layout.reelY, layout.reelWidth, layout.reelHeight, layout.reelRadius, new Color(0, 0, 0, 0), undefined, 0, false);
    this.reelEngine = reelFrame.addComponent(ReelEngine); this.reelEngine.configure(this.selectedGame, layout.reelWidth, layout.reelHeight, layout.reelRadius, layout.reelFaceted);
    const reelClip = reelFrame.getChildByName('ReelClip') ?? reelFrame; const reelSurface = this.panel(reelClip, 0, 0, layout.reelWidth, layout.reelHeight, layout.reelRadius, layout.reelGlassColor, undefined, 0, false); reelSurface.name = 'ReelBackgroundSurface'; reelSurface.setSiblingIndex(0); this.addCardShine(reelClip, layout.reelWidth - 4, layout.reelHeight - 4, C.paleGold, 0.9); this.addCardMotes(reelClip, 8, color, layout.reelWidth - 10, layout.reelHeight - 10); this.addReelEnergy(reelClip, new Color(224, 160, 62), layout.reelWidth, layout.reelHeight); this.addReelInsetShadow(reelClip, layout.reelWidth, layout.reelHeight, layout.reelRadius);
    this.winCurrencyIcon = this.addCurrencyIcon(this.page, layout.winCoinX, layout.winY, 36, 0.16); this.winCurrencyIcon.active = false; this.winLabel = this.outlineLabel(this.label(this.page, 'PLACE YOUR BET', layout.winLabelX, layout.winY, 27, new Color(108, 27, 33), true, 500), new Color(255, 244, 211), 2);
    const classicSigns = this.selectedGame.id === 'neon-classic';
    this.cabinetHotspot(this.page, classicSigns ? '' : '−', layout.minusX, layout.minusY, 104, 92, () => { this.betIndex = Math.max(0, this.betIndex - 1); this.refreshBet(); }, 39, new Color(101, 26, 31));
    this.cabinetHotspot(this.page, classicSigns ? '' : '+', layout.plusX, layout.plusY, 104, 92, () => { this.betIndex = Math.min(this.selectedGame.bets.length - 1, this.betIndex + 1); this.refreshBet(); }, 39, new Color(101, 26, 31));
    const betCoin = this.addCurrencyIcon(this.page, layout.betCoinX, layout.betReadoutY, 34, 0.22); this.betCurrencyIcon = betCoin; this.makeCurrencyInteractive(betCoin, () => this.toast(`CURRENT BET  ${this.format(this.bet())} • ${this.lineReadout()}`, C.gold)); this.betLabel = this.outlineLabel(this.label(this.page, `BET  ${this.format(this.bet())}   •   ${this.lineReadout()}`, layout.betLabelX, layout.betReadoutY, 22, C.paleGold, true, 350), new Color(78, 13, 22), 3);
    const spin = this.cabinetHotspot(this.page, 'SPIN', layout.spinX, layout.spinY, 190, 128, () => void this.onSpin(), 31, new Color(104, 25, 31)); this.spinButtonLabel = spin.getChildByName('Text')?.getComponent(Label) ?? undefined;
    const auto = this.cabinetHotspot(this.page, 'AUTO', layout.autoX, layout.autoY, 150, 108, () => void this.startAuto(), 23, new Color(104, 25, 31)); this.autoButtonLabel = auto.getChildByName('Text')?.getComponent(Label) ?? undefined;
    this.cabinetUtilityHotspot(this.page, 'PAYOUTS', highIcon, layout.payoutsX, layout.payoutsY, 220, 72, () => this.showPaytable(), 21);
    let turboControl!: Node; turboControl = this.cabinetUtilityHotspot(this.page, `TURBO ${this.turbo ? 'ON' : 'OFF'}`, this.selectedGame.wildId, layout.turboX, layout.turboY, 220, 72, () => { this.turbo = !this.turbo; const turboLabel = turboControl.getChildByName('Text')?.getComponent(Label); if (turboLabel) turboLabel.string = `TURBO ${this.turbo ? 'ON' : 'OFF'}`; this.vfx.pulse(turboControl); this.toast(`Turbo mode ${this.turbo ? 'enabled' : 'disabled'}`, this.turbo ? C.gold : C.muted); }, 20);
    if (this.selectedGame.id === 'neon-classic') this.outlineLabel(this.label(this.page, 'HOLD 1       HOLD 2       HOLD 3       NUDGE READY', 0, 548, 17, new Color(255, 229, 182), true, 720), new Color(91, 19, 28), 3);
    if (this.forcedResult && !this.spinning) this.scheduleOnce(() => void this.onSpin(), 0.3);
    if (this.debugMode && typeof window !== 'undefined') { const modal = new URLSearchParams(window.location.search).get('modal'); if (modal === 'rules') this.scheduleOnce(() => this.showRulesAndPayouts(), 0.2); else if (modal === 'payouts') this.scheduleOnce(() => this.showPaytable(), 0.2); }
  }

  private async onSpin(): Promise<boolean> {
    if (this.spinning) { this.reelEngine?.quickStop(); return true; }
    const rng = this.rngByGame.get(this.selectedGame.id) as SecureRNG;
    const result = this.resultGenerator.generate(this.selectedGame, this.bet(), rng, this.forcedResult); this.forcedResult = undefined;
    if (!this.bootstrap.economy.reserveSpin(result.spinId, this.bet())) { this.toast('Not enough demo credits or spin already active', C.red); return false; }
    this.spinning = result; this.stateMachine.reset(); this.stateMachine.move('reserving-bet'); this.stateMachine.move('result-ready'); this.stateMachine.move('spinning');
    if (this.spinButtonLabel) this.spinButtonLabel.string = 'STOP'; if (this.winLabel) this.winLabel.string = 'GOOD LUCK'; if (this.winCurrencyIcon) this.winCurrencyIcon.active = false; const layout = CABINET_LAYOUTS[this.selectedGame.id]; this.vfx.spinCharge(new Vec3(layout.spinX, layout.spinY, 0), this.themeColor(this.selectedGame.id)); this.refreshBalance();
    this.audio.play('spin'); this.audio.vibrate(22);
    await this.reelEngine?.spin(result, this.selectedGame, this.turbo);
    this.stateMachine.move('stopping'); this.stateMachine.move('evaluating');
    this.bootstrap.economy.settleSpin(result.spinId, result.totalWin); this.bootstrap.achievements.add('spin', 1); if (result.totalWin) this.bootstrap.achievements.add('win', result.totalWin); if (result.feature) this.bootstrap.achievements.add('feature', 1);
    this.audio.play('reel-stop');
    if (result.totalWin > 0) {
      const winRatio = result.totalWin / Math.max(1, this.bet()); this.audio.play('win'); this.audio.vibrate(winRatio >= 8 ? [35, 30, 55, 35, 80] : [30, 35, 45]);
      if (this.winLabel) this.winLabel.string = `WIN  ${this.format(result.totalWin)}`; if (this.winCurrencyIcon) this.winCurrencyIcon.active = true; this.vfx.pulse(this.winLabel?.node as Node);
      if (this.reelEngine) { this.vfx.pulse(this.reelEngine.node); this.reelEngine.presentWins(result, this.selectedGame); }
      if (winRatio >= 8) this.vfx.jackpotBurst(new Vec3(0, layout.reelY, 0), this.themeColor(this.selectedGame.id)); else this.vfx.celebrateWin(new Vec3(0, layout.reelY, 0), this.themeColor(this.selectedGame.id));
      this.presentWinSplash(result); this.stateMachine.move('presenting-win');
    }
    if (result.totalWin <= 0) { if (this.winLabel) { this.winLabel.string = 'NO WIN • SPIN AGAIN'; this.vfx.pulse(this.winLabel.node); } if (this.winCurrencyIcon) this.winCurrencyIcon.active = false; this.scheduleOnce(() => { if (!this.spinning && this.winLabel?.node.isValid && this.winLabel.string === 'NO WIN • SPIN AGAIN') this.winLabel.string = 'PLACE YOUR BET'; }, 1.1); }
    if (result.feature) { if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win') this.stateMachine.move('feature'); this.presentFeature(result); }
    if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win' || this.stateMachine.state === 'feature') this.stateMachine.move('settled'); this.stateMachine.move('idle');
    this.spinning = undefined; if (this.spinButtonLabel) this.spinButtonLabel.string = 'SPIN'; this.refreshBalance(); if (result.totalWin > 0 && this.balanceLabel) this.vfx.pulse(this.balanceLabel.node); return true;
  }

  private presentFeature(result: SpinResult): void {
    if (result.feature?.type === 'hold-and-spin') {
      const feature = result.featureResult; this.rewardModal('HOLD & SPIN COMPLETE', `${feature?.detail.toUpperCase() ?? 'RESPINS RESOLVED'}\n${feature?.jackpot?.toUpperCase() ?? 'ENERGY COINS'}\n+${this.format(feature?.totalCredits ?? 0)} CREDITS`, C.cyan);
    } else if (result.feature?.type === 'nudge') this.rewardModal('GEM NUDGE', `${result.featureResult?.detail.toUpperCase() ?? 'REEL NUDGED'}\nWIN EVALUATED AND SETTLED`, C.violet);
    else this.rewardModal('FREE SPINS COMPLETE', `${result.featureResult?.rounds.length ?? 0} SPINS RESOLVED\n${(result.feature?.multiplier ?? 1)}× FEATURE MULTIPLIER\n+${this.format(result.featureResult?.totalCredits ?? 0)} CREDITS`, C.violet);
  }

  private presentWinSplash(result: SpinResult): void {
    const ratio = result.totalWin / Math.max(1, this.bet()); const titleText = ratio >= 50 ? 'ROYAL JACKPOT!' : ratio >= 20 ? 'MEGA WIN' : ratio >= 8 ? 'BIG WIN' : ratio >= 2 ? 'GREAT WIN' : 'NICE WIN'; const color = this.themeColor(this.selectedGame.id);
    const root = this.panel(this.overlay, 0, 128, 920, 700, 0, new Color(0, 0, 0, 0), undefined, 0, false); root.name = 'WinSplash'; const opacity = root.addComponent(UIOpacity); opacity.opacity = 0; root.setScale(new Vec3(0.68, 0.68, 1));
    const bloom = new Node('JackpotCrystalBloom'); bloom.layer = Layers.Enum.UI_2D; bloom.addComponent(UITransform).setContentSize(760, 760); root.addChild(bloom); const bloomGraphics = bloom.addComponent(Graphics); bloomGraphics.fillColor = new Color(255, 252, 235, 34); bloomGraphics.circle(0, 0, 338); bloomGraphics.fill(); bloomGraphics.fillColor = new Color(255, 226, 145, 42); bloomGraphics.circle(0, 0, 280); bloomGraphics.fill(); bloomGraphics.fillColor = new Color(255, 255, 255, 24); bloomGraphics.circle(0, 0, 218); bloomGraphics.fill(); const bloomOpacity = bloom.addComponent(UIOpacity); bloomOpacity.opacity = 0;
    const rays = new Node('JackpotPrismaticRays'); rays.layer = Layers.Enum.UI_2D; rays.addComponent(UITransform).setContentSize(780, 780); root.addChild(rays); const rayGraphics = rays.addComponent(Graphics); for (let index = 0; index < 18; index += 1) { const angle = Math.PI * 2 * index / 18; const inner = index % 2 ? 196 : 168; const outer = index % 3 ? 344 : 378; const spread = index % 2 ? 0.018 : 0.028; rayGraphics.fillColor = index % 3 === 0 ? new Color(255, 255, 255, 38) : new Color(255, 225, 144, 31); rayGraphics.moveTo(Math.cos(angle - spread) * inner, Math.sin(angle - spread) * inner); rayGraphics.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); rayGraphics.lineTo(Math.cos(angle + spread) * inner, Math.sin(angle + spread) * inner); rayGraphics.close(); rayGraphics.fill(); } const raysOpacity = rays.addComponent(UIOpacity); raysOpacity.opacity = 0;
    const ring = new Node('JackpotOrbitRings'); ring.layer = Layers.Enum.UI_2D; ring.addComponent(UITransform).setContentSize(760, 760); root.addChild(ring); const ringGraphics = ring.addComponent(Graphics); ringGraphics.strokeColor = new Color(255, 230, 151, 235); ringGraphics.lineWidth = 6; ringGraphics.arc(0, 0, 294, 0.12, Math.PI * 1.32, false); ringGraphics.stroke(); ringGraphics.strokeColor = new Color(color.r, color.g, color.b, 205); ringGraphics.lineWidth = 4; ringGraphics.arc(0, 0, 322, Math.PI * 1.08, Math.PI * 1.94, false); ringGraphics.stroke(); ringGraphics.strokeColor = new Color(255, 248, 214, 148); ringGraphics.lineWidth = 2; ringGraphics.circle(0, 0, 350); ringGraphics.stroke();
    this.addCardMotes(root, ratio >= 8 ? 28 : 18, color, 850, 620);

    const stageArt = this.addGeneratedImage(root, GENERATED_ART_PATHS.jackpotStage, 0, 0, 900, 620, 255, 0.04); stageArt.name = 'JackpotGeneratedArtwork'; stageArt.setScale(new Vec3(0.28, 0.28, 1));
    this.addCardShine(root, 790, 520, new Color(255, 236, 174), 0.52);
    this.addWinCoinRain(root, ratio >= 8 ? 16 : 11);

    // Keep all dynamic copy in one geometric centre. The generated artwork is
    // decorative only and intentionally has no touch listener, so the cabinet
    // controls remain usable while the celebration is visible.
    const copyGroup = new Node('JackpotCenteredCopy'); copyGroup.layer = Layers.Enum.UI_2D; copyGroup.addComponent(UITransform).setContentSize(520, 280); copyGroup.setPosition(0, -4); root.addChild(copyGroup);
    const title = this.artLabel(copyGroup, titleText, 0, 66, ratio >= 50 ? 52 : 48, 500); const titleOpacity = title.addComponent(UIOpacity); titleOpacity.opacity = 0;
    const amount = this.outlineLabel(this.label(copyGroup, '+0', 0, -15, ratio >= 8 ? 61 : 55, new Color(255, 221, 104), true, 470), new Color(61, 5, 16), 6); const amountOpacity = amount.node.addComponent(UIOpacity); amountOpacity.opacity = 0;
    const payoutText = ratio >= 50 ? 'JACKPOT PAID • VAULT OPEN' : `${Math.max(1, Math.round(ratio))}× BET PAYOUT`; const payout = this.outlineLabel(this.label(copyGroup, payoutText, 0, -91, 22, new Color(255, 240, 192), true, 470), new Color(72, 7, 18), 4); const payoutOpacity = payout.node.addComponent(UIOpacity); payoutOpacity.opacity = 0;
    const counter = { value: 0 }; tween(counter).delay(0.48).to(1.35, { value: result.totalWin }, { easing: 'quartOut', onUpdate: () => { amount.string = `+${this.format(counter.value)}`; } }).start();
    tween(bloomOpacity).to(0.12, { opacity: 255 }).to(0.42, { opacity: 126 }, { easing: 'quadOut' }).to(0.28, { opacity: 245 }).to(0.72, { opacity: 145 }, { easing: 'sineInOut' }).union().repeat(3).start(); tween(bloom).to(0.24, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' }).to(0.22, { scale: new Vec3(0.98, 0.98, 1) }).to(1.05, { scale: new Vec3(1.16, 1.16, 1) }, { easing: 'sineInOut' }).to(1.05, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeat(2).start(); tween(raysOpacity).to(0.18, { opacity: 215 }).to(0.62, { opacity: 82 }, { easing: 'quadOut' }).to(0.8, { opacity: 178 }, { easing: 'sineInOut' }).to(0.9, { opacity: 72 }, { easing: 'sineInOut' }).union().repeat(2).start(); tween(rays).by(3.8, { angle: 36, scale: new Vec3(0.08, 0.08, 0) }, { easing: 'sineInOut' }).start(); tween(ring).by(1.2, { angle: 105 }, { easing: 'quadOut' }).by(2.6, { angle: 125 }, { easing: 'sineInOut' }).start();
    tween(stageArt).delay(0.03).to(0.3, { scale: new Vec3(1.085, 1.085, 1), position: new Vec3(0, 10, 0), angle: -1.2 }, { easing: 'backOut' }).to(0.16, { scale: new Vec3(0.985, 0.985, 1), position: Vec3.ZERO, angle: 0.4 }, { easing: 'quadOut' }).to(0.16, { scale: Vec3.ONE, angle: 0 }, { easing: 'backOut' }).call(() => { if (!stageArt.isValid) return; tween(stageArt).by(0.72, { position: new Vec3(0, 9, 0), angle: 0.65, scale: new Vec3(0.024, 0.024, 0) }, { easing: 'sineInOut' }).by(0.72, { position: new Vec3(0, -9, 0), angle: -0.65, scale: new Vec3(-0.024, -0.024, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); }).start();
    tween(copyGroup).delay(0.7).by(1.15, { position: new Vec3(0, 5, 0), scale: new Vec3(0.012, 0.012, 0) }, { easing: 'sineInOut' }).by(1.25, { position: new Vec3(0, -5, 0), scale: new Vec3(-0.012, -0.012, 0) }, { easing: 'sineInOut' }).union().repeat(2).start();
    tween(titleOpacity).delay(0.25).to(0.18, { opacity: 255 }).start(); tween(title).delay(0.25).to(0.28, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' }).to(0.14, { scale: Vec3.ONE }).start(); tween(amountOpacity).delay(0.43).to(0.18, { opacity: 255 }).start(); tween(amount.node).delay(1.72).to(0.16, { scale: new Vec3(1.065, 1.065, 1) }, { easing: 'quadOut' }).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).delay(0.48).union().repeat(3).start(); tween(payoutOpacity).delay(0.62).to(0.18, { opacity: 255 }).start();
    tween(opacity).to(0.08, { opacity: 255 }).delay(4.25).to(0.42, { opacity: 0 }).start(); tween(root).to(0.18, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' }).to(0.12, { scale: new Vec3(0.97, 0.97, 1) }, { easing: 'quadOut' }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).delay(3.82).to(0.46, { scale: new Vec3(0.78, 0.78, 1), angle: 1.2 }, { easing: 'quadIn' }).call(() => { if (root.isValid) root.destroy(); }).start();
  }

  private async startAuto(): Promise<void> {
    if (this.autoSpin.active) { this.autoSpin.cancel(); if (this.autoButtonLabel) this.autoButtonLabel.string = 'STOPPING'; this.toast('AUTO SPIN WILL STOP AFTER THIS REEL', C.muted); return; }
    if (this.autoButtonLabel) { this.autoButtonLabel.string = 'AUTO ×10'; this.vfx.pulse(this.autoButtonLabel.node); } const count = await this.autoSpin.start(10, () => this.onSpin()); if (this.autoButtonLabel?.node.isValid) this.autoButtonLabel.string = 'AUTO'; this.toast(`AUTO SPIN COMPLETE • ${count} SPINS`, C.cyan);
  }

  private showPaytable(): void {
    const modal = this.modal(920, 1280); this.outlineLabel(this.label(modal, `${this.selectedGame.name} PAYOUTS`, 0, 520, 42, C.paleGold, true, 780), new Color(68, 9, 17), 4);
    this.label(modal, 'LISTED VALUES ARE MULTIPLIERS', 0, 464, 23, new Color(255, 231, 177), true, 760);
    this.label(modal, 'SYMBOL', -185, 408, 23, C.muted, true, 360); this.label(modal, '3 MATCH', 90, 408, 20, C.muted, true, 120); this.label(modal, '4 MATCH', 230, 408, 20, C.muted, true, 120); this.label(modal, '5 MATCH', 365, 408, 20, C.muted, true, 120);
    const tierOrder: Readonly<Record<string, number>> = { wild: 0, scatter: 1, bonus: 2, high: 3, medium: 4, low: 5 };
    const symbols = [...this.selectedGame.symbols].sort((left, right) => (tierOrder[left.tier] ?? 9) - (tierOrder[right.tier] ?? 9) || (this.selectedGame.paytable[right.id]?.[5] ?? this.selectedGame.paytable[right.id]?.[3] ?? 0) - (this.selectedGame.paytable[left.id]?.[5] ?? this.selectedGame.paytable[left.id]?.[3] ?? 0)).slice(0, 8);
    symbols.forEach((symbol, index) => { const y = 342 - index * 91; const pay = this.selectedGame.paytable[symbol.id]; const row = this.panel(modal, 0, y, 820, 78, 18, index % 2 ? new Color(99, 43, 28, 210) : new Color(73, 25, 24, 218), new Color(208, 151, 62, 110), 1, false); this.addPremiumSymbol(row, this.selectedGame, symbol.id, -356, 0, 66, 'pulse', 245, index * 0.06); const name = this.outlineLabel(this.label(row, symbol.label.toUpperCase(), -153, 0, 24, C.white, true, 340), new Color(47, 8, 13), 3); name.horizontalAlign = Label.HorizontalAlign.LEFT; ([3, 4, 5] as const).forEach((match, column) => this.outlineLabel(this.label(row, `${pay?.[match] ?? '—'}×`, [90, 230, 365][column], 0, 23, C.paleGold, true, 112), new Color(58, 9, 16), 3)); });
    this.button(modal, 'CLOSE', 0, -520, 320, 64, () => modal.parent?.destroy(), 'secondary');
  }

  private showRulesAndPayouts(): void {
    const config = this.selectedGame; const modal = this.modal(930, 1280); this.outlineLabel(this.label(modal, 'HOW TO PLAY', 0, 526, 44, C.paleGold, true, 760), new Color(67, 8, 17), 4);
    this.label(modal, config.name, 0, 472, 25, new Color(255, 230, 174), true, 760);
    const modeLine = config.payMode === 'ways' ? `${config.columns} REELS × ${config.rows} ROWS • ${Math.pow(config.rows, config.columns)} WAYS` : `${config.columns} REELS × ${config.rows} ROWS • ${config.paylines.length} FIXED PAYLINES`;
    const direction = config.payMode === 'ways' ? 'Matching symbols pay on adjacent reels from left to right.' : 'Wins pay left to right, starting on reel 1 along a fixed line.';
    const scatterCount = config.scatterAwards ? Object.keys(config.scatterAwards).map(Number).sort((a, b) => a - b) : [];
    const scatterRule = config.scatterId && config.scatterAwards ? `${scatterCount.join(' / ')} SCATTERS award ${scatterCount.map((count) => config.scatterAwards?.[count]).join(' / ')} free spins.` : config.bonusId ? 'Six or more BONUS symbols trigger Hold & Spin.' : 'Special symbols activate the feature shown on the cabinet.';
    const rules = [
      modeLine,
      direction,
      'Only the highest matching symbol is paid on each line or way.',
      'WILD substitutes for normal pay symbols to complete combinations.',
      scatterRule,
      `FEATURE: ${config.feature.replace(/-/g, ' ').toUpperCase()}.`,
      'Demo credits are virtual play points and have no cash value.',
    ];
    rules.forEach((copy, index) => { const y = 388 - index * 82; const row = this.panel(modal, 0, y, 824, 70, 17, index % 2 ? new Color(92, 39, 27, 210) : new Color(70, 25, 23, 218), new Color(207, 148, 58, 105), 1, false); const pearl = new Node(`RulePearl-${index}`); pearl.layer = Layers.Enum.UI_2D; pearl.addComponent(UITransform).setContentSize(26, 26); pearl.setPosition(-378, 0); row.addChild(pearl); const graphics = pearl.addComponent(Graphics); graphics.fillColor = new Color(255, 249, 227); graphics.circle(0, 0, 9); graphics.fill(); graphics.strokeColor = new Color(208, 148, 58); graphics.lineWidth = 2; graphics.circle(0, 0, 11); graphics.stroke(); const text = this.outlineLabel(this.label(row, copy, 28, 0, 23, C.white, true, 750), new Color(42, 7, 12), 2); text.horizontalAlign = Label.HorizontalAlign.LEFT; });
    const formula = config.payMode === 'ways' ? `WAYS WIN = BET ÷ 243 × MULTIPLIER × WAYS × ${config.payoutScale.toFixed(3)}` : `LINE WIN = BET ÷ ${config.paylines.length} × MULTIPLIER × ${config.payoutScale.toFixed(3)}`;
    const formulaBox = this.panel(modal, 0, -272, 824, 116, 22, new Color(105, 25, 34, 245), new Color(242, 190, 78), 3, false); this.label(formulaBox, 'PAYOUT CALCULATION', 0, 27, 22, new Color(255, 232, 169), true, 760); this.outlineLabel(this.label(formulaBox, formula, 0, -22, 22, C.white, true, 760), new Color(48, 6, 13), 3);
    this.button(modal, 'VIEW PAYOUTS', -205, -502, 360, 68, () => { modal.parent?.destroy(); this.showPaytable(); }, 'primary'); this.button(modal, 'CLOSE', 235, -502, 250, 64, () => modal.parent?.destroy(), 'secondary');
  }

  private topBar(title = 'HOME'): void {
    const player = this.ensurePlayer(); const bar = this.panel(this.page, 0, this.topY(790), 1000, 130, 30, new Color(75, 16, 27, 242), new Color(202, 149, 67), 1);
    this.avatar(bar, -390, 0, player.avatar, 68); this.outlineLabel(this.label(bar, title === 'HOME' ? player.nickname : title, -255, 14, 26, C.white, true, 270), new Color(52, 5, 13), 3); this.outlineLabel(this.label(bar, player.isGuest ? 'GUEST MODE • PLAY ONLY' : title === 'HOME' ? `LEVEL ${player.level}` : 'PEARL LOUNGE', -255, -18, 17, player.isGuest ? C.paleGold : C.cyan, true, 270), new Color(58, 7, 15), 2);
    const coin = this.addCurrencyIcon(bar, 112, 6, 46, 0.04); this.makeCurrencyInteractive(coin, () => this.toast(`${this.format(player.credits)} DEMO CREDITS`, C.gold)); this.balanceLabel = this.outlineLabel(this.label(bar, this.format(player.credits), 260, 12, 27, C.paleGold, true, 180), new Color(61, 6, 15), 3);
    this.outlineLabel(this.label(bar, player.isGuest ? 'PLAY CREDITS' : 'DEMO CREDITS', 260, -21, 16, C.white, true, 180), new Color(58, 7, 15), 2); this.button(bar, '+', 435, 0, 58, 58, () => this.router.go('store'), player.isGuest ? 'ghost' : 'secondary');
    if (title === 'HOME') { this.button(bar, `MAIL  ${this.bootstrap.redDots.mail()}`, 35, 0, 120, 58, () => this.router.go('mail'), 'ghost'); }
  }

  private header(title: string, back: boolean, showBalance = false): void {
    const bar = this.panel(this.page, 0, this.topY(800), 1020, 120, 26, new Color(75, 16, 27, 242), new Color(202, 149, 67), 1);
    if (back) this.button(bar, '‹', -450, 0, 72, 72, () => this.router.route === 'game' ? this.router.reset('home') : this.router.back('home'), 'ghost'); this.label(bar, title, 0, 0, 30, C.paleGold, true, 650);
    if (showBalance) { this.addCurrencyIcon(bar, 275, 0, 42, 0.04); this.balanceLabel = this.label(bar, this.format(this.bootstrap.economy.balance()), 380, 0, 21, C.white, true, 190); }
  }

  private bottomNav(active: 'home' | 'store' | 'rewards' | 'rank' | 'profile'): void {
    const bar = this.panel(this.navigation, 0, -SafeAreaAdapter.visibleHeight / 2 + NAV_H / 2 + SafeAreaAdapter.safeBottom, SafeAreaAdapter.visibleWidth, NAV_H, 0, new Color(68, 12, 23, 252), new Color(222, 170, 70), 2, false); this.addCoinBorder(bar, SafeAreaAdapter.visibleWidth - 78, 112, 18, 18, 188);
    const items: readonly [typeof active, string, Route][] = [['home', 'HOME', 'home'], ['store', 'STORE', 'store'], ['rewards', 'REWARDS', 'rewards'], ['rank', 'RANK', 'rank'], ['profile', 'PROFILE', 'profile']];
    const art: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'scatter'], [GAME_CONFIGS[3], 'bonus'], [GAME_CONFIGS[1], 'seal'], [GAME_CONFIGS[0], 'crown'], [GAME_CONFIGS[3], 'helmet']];
    // A 205 px surface becomes roughly 228 px after its Astral image frame is
    // added, wider than the 216 px navigation pitch. Use a 185 px surface so
    // all five outer frames retain a clean gap while preserving touch spacing.
    items.forEach(([id, text, route], index) => { const x = -432 + index * 216; const selected = id === active; const dock = this.panel(bar, x, -3, 172, 110, 34, selected ? new Color(128, 34, 43, 224) : new Color(84, 20, 31, 92), undefined, 0, false); dock.name = selected ? 'ActiveNavDock' : 'NavDock'; if (selected) { this.addCardShine(dock, 160, 100, C.paleGold, index * 0.18); const coin = this.addCurrencyIcon(dock, 62, 31, 24, index * 0.04); const coinOpacity = coin.getComponent(UIOpacity); if (coinOpacity) coinOpacity.opacity = 155; } const item = this.button(bar, text, x, 0, 185, 120, () => this.router.reset(route), selected ? 'nav-active' : 'nav'); const label = item.getChildByName('Text'); if (label) label.setPosition(0, -34); this.addPremiumSymbol(item, art[index][0], art[index][1], 0, 22, selected ? 58 : 52, selected ? 'pulse' : 'none', selected ? 255 : 175, index * 0.1); });
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
    const cabinetPaths = ['generated/game01/base_bg_v01', 'generated/game02/base_bg_v01', 'generated/game03/base_bg_v01', 'generated/game04/base_bg_v01'] as const;
    const shell = this.panel(parent, 280, 38, 396, 238, 28, new Color(49, 8, 17, 244), new Color(236, 190, 91, 230), 4, false); shell.name = 'EmbeddedMachineShowcase';
    const recess = this.panel(shell, 0, 0, 374, 216, 22, new Color(95, 29, 35, 246), new Color(255, 237, 177, 150), 2, false); recess.name = 'ShowcaseInnerRim';
    const viewport = new Node('ShowcaseViewport'); viewport.layer = Layers.Enum.UI_2D; viewport.addComponent(UITransform).setContentSize(364, 206); const mask = viewport.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = viewport.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-182, -103, 364, 206, 18); stencil.fill(); } recess.addChild(viewport);
    const depth = new Node('ShowcaseDepth'); depth.layer = Layers.Enum.UI_2D; depth.addComponent(UITransform).setContentSize(364, 206); viewport.addChild(depth); const depthGraphics = depth.addComponent(Graphics); depthGraphics.fillColor = new Color(37, 5, 13, 198); depthGraphics.roundRect(-182, -103, 364, 206, 18); depthGraphics.fill(); depthGraphics.fillColor = new Color(255, 223, 153, 18); depthGraphics.ellipse(48, -76, 152, 36); depthGraphics.fill();
    GAME_CONFIGS.forEach((config, index) => {
      const slide = new Node(`BannerMachine-${index}`); slide.layer = Layers.Enum.UI_2D; slide.addComponent(UITransform).setContentSize(364, 206); viewport.addChild(slide); const opacity = slide.addComponent(UIOpacity); opacity.opacity = index === 0 ? 255 : 0;
      const stage = new Node('BannerFortuneStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(364, 206); slide.addChild(stage);
      this.addLoadingOrbit(stage, 72, -12, this.themeColor(config.id), 96);
      const cabinet = this.addGeneratedImage(stage, cabinetPaths[index], 82, -30, 230, 326, 255, index * 0.08); cabinet.setScale(new Vec3(0.94, 0.94, 1)); tween(cabinet).to(2.1, { scale: new Vec3(1.02, 1.02, 1), position: new Vec3(82, -21, 0) }, { easing: 'sineInOut' }).to(2.1, { scale: new Vec3(0.94, 0.94, 1), position: new Vec3(82, -30, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
      this.addMascot(stage, index, -104, -38, 132, 168, 250, index * 0.08);
      const title = this.addGeneratedImage(stage, GAME_TITLE_PATHS[config.id], 44, 77, 224, 54, 255, index * 0.07); tween(title).to(1.1, { scale: new Vec3(1.03, 1.03, 1) }, { easing: 'sineInOut' }).to(1.25, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
      const badge = this.panel(stage, 54, -82, 226, 32, 16, new Color(255, 242, 206, 232), new Color(205, 147, 50, 190), 1.5, false); this.label(badge, index === 0 ? 'PEARL LUCK' : index === 1 ? 'COIN CASCADE' : index === 2 ? 'RUBY CLASSIC' : 'DIAMOND PRIZE', 0, 0, 13, new Color(105, 27, 31), true, 212);
      tween(opacity).delay(index * 4.2).to(0.6, { opacity: 255 }).delay(3).to(0.6, { opacity: 0 }).delay(Math.max(0, cycle - index * 4.2 - 4.2)).union().repeatForever().start();
    });
    this.addCoinBorder(shell, 360, 212, 8, 18, 218); this.addCardShine(viewport, 356, 198, C.paleGold, 0.5);
    const glass = new Node('ShowcaseGlass'); glass.layer = Layers.Enum.UI_2D; glass.addComponent(UITransform).setContentSize(364, 206); viewport.addChild(glass); const glassGraphics = glass.addComponent(Graphics); glassGraphics.fillColor = new Color(255, 255, 242, 18); glassGraphics.moveTo(-182, 103); glassGraphics.lineTo(88, 103); glassGraphics.lineTo(-16, 20); glassGraphics.lineTo(-182, -20); glassGraphics.close(); glassGraphics.fill();
  }

  private addCharacter(parent: Node, index: number, x: number, y: number, maxWidth: number, maxHeight: number, alpha = 255, delay = 0): Node {
    const slot = Math.max(0, Math.min(CHARACTER_PATHS.length - 1, index)); const root = new Node(`CharacterHero-${slot}`); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(maxWidth, maxHeight); root.setPosition(x, y); root.setScale(new Vec3(0.92, 0.92, 1)); parent.addChild(root); const opacity = root.addComponent(UIOpacity); opacity.opacity = 0;
    const image = new Node('CharacterImage'); image.layer = Layers.Enum.UI_2D; root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.RAW;
    resources.load(`${CHARACTER_PATHS[slot]}/texture`, Texture2D, (error, texture) => { if (error || !texture || !root.isValid || !image.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const cellWidth = Math.floor(texture.width / 2); const cellHeight = Math.floor(texture.height / 2); frame.rect = new Rect((slot % 2) * cellWidth, Math.floor(slot / 2) * cellHeight, cellWidth, cellHeight); sprite.spriteFrame = frame; const transform = image.getComponent(UITransform) as UITransform; transform.setContentSize(cellWidth, cellHeight); const scale = Math.min(maxWidth / cellWidth, maxHeight / cellHeight); image.setScale(new Vec3(scale, scale, 1)); tween(opacity).delay(delay).to(0.42, { opacity: alpha }, { easing: 'quadOut' }).start(); tween(root).delay(delay).to(0.48, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); tween(image).delay(delay + 0.52).by(2.5 + slot * 0.22, { position: new Vec3(slot % 2 ? -7 : 7, 10, 0), angle: slot % 2 ? -1.4 : 1.4 }, { easing: 'sineInOut' }).by(2.7 + slot * 0.2, { position: new Vec3(slot % 2 ? 7 : -7, -10, 0), angle: slot % 2 ? 1.4 : -1.4 }, { easing: 'sineInOut' }).union().repeatForever().start(); });
    const accent = this.themeColor(GAME_CONFIGS[slot].id); for (let glintIndex = 0; glintIndex < 2; glintIndex += 1) { const glint = new Node(`CharacterGlint-${glintIndex}`); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(18, 18); glint.setPosition((glintIndex ? 1 : -1) * maxWidth * 0.36, maxHeight * (glintIndex ? 0.24 : -0.08)); root.addChild(glint); const graphics = glint.addComponent(Graphics); graphics.fillColor = glintIndex ? C.paleGold : accent; graphics.moveTo(0, 9); graphics.lineTo(2, 2); graphics.lineTo(9, 0); graphics.lineTo(2, -2); graphics.lineTo(0, -9); graphics.lineTo(-2, -2); graphics.lineTo(-9, 0); graphics.lineTo(-2, 2); graphics.close(); graphics.fill(); const glintOpacity = glint.addComponent(UIOpacity); glintOpacity.opacity = 0; tween(glintOpacity).delay(delay + 0.8 + glintIndex * 0.6).to(0.3, { opacity: Math.min(alpha, 225) }).to(0.5, { opacity: 0 }).delay(1.5).union().repeatForever().start(); tween(glint).delay(delay).by(2.4, { angle: 180, scale: new Vec3(0.35, 0.35, 0) }).by(2.4, { angle: 180, scale: new Vec3(-0.35, -0.35, 0) }).union().repeatForever().start(); }
    return root;
  }

  private addMascot(parent: Node, index: number, x: number, y: number, maxWidth: number, maxHeight: number, alpha = 255, delay = 0, action?: () => void, draggable = false): Node {
    const slot = Math.max(0, Math.min(3, index)); const root = new Node(`FortuneMascot-${slot}`); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(maxWidth, maxHeight); root.setPosition(x, y); parent.addChild(root); const opacity = root.addComponent(UIOpacity); opacity.opacity = 0;
    const image = new Node('MascotImage'); image.layer = Layers.Enum.UI_2D; root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.RAW;
    resources.load(`${GENERATED_ART_PATHS.fortuneMascots}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !root.isValid || !image.isValid) return; const cellWidth = Math.floor(texture.width / 2); const cellHeight = Math.floor(texture.height / 2); const frame = new SpriteFrame(); frame.texture = texture; frame.rect = new Rect((slot % 2) * cellWidth, Math.floor(slot / 2) * cellHeight, cellWidth, cellHeight); sprite.spriteFrame = frame; const transform = image.getComponent(UITransform) as UITransform; transform.setContentSize(cellWidth, cellHeight); const scale = Math.min(maxWidth / cellWidth, maxHeight / cellHeight); image.setScale(new Vec3(scale, scale, 1)); tween(opacity).delay(delay).to(0.34, { opacity: alpha }).start(); tween(root).delay(delay).to(0.42, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' }).to(0.2, { scale: Vec3.ONE }).start(); tween(image).delay(delay + 0.5).by(1.8 + slot * 0.16, { position: new Vec3(slot % 2 ? -4 : 4, 7, 0), angle: slot % 2 ? -1.4 : 1.4 }, { easing: 'sineInOut' }).by(2 + slot * 0.16, { position: new Vec3(slot % 2 ? 4 : -4, -7, 0), angle: slot % 2 ? 1.4 : -1.4 }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
    if (action) {
      const button = root.addComponent(Button); button.interactable = true; button.transition = Button.Transition.NONE; let dragDistance = 0;
      const dragHalo = new Node('MascotDragHalo'); dragHalo.layer = Layers.Enum.UI_2D; dragHalo.addComponent(UITransform).setContentSize(maxWidth + 48, maxHeight + 38); root.addChild(dragHalo); dragHalo.setSiblingIndex(0); const dragGraphics = dragHalo.addComponent(Graphics); const accent = this.themeColor(GAME_CONFIGS[slot].id); dragGraphics.fillColor = new Color(255, 229, 153, 24); dragGraphics.ellipse(0, -maxHeight * 0.3, maxWidth * 0.53, maxHeight * 0.14); dragGraphics.fill(); dragGraphics.strokeColor = new Color(accent.r, accent.g, accent.b, 220); dragGraphics.lineWidth = 4; dragGraphics.ellipse(0, -maxHeight * 0.3, maxWidth * 0.48, maxHeight * 0.11); dragGraphics.stroke(); const dragOpacity = dragHalo.addComponent(UIOpacity); dragOpacity.opacity = 0; tween(dragHalo).by(3.4, { angle: 360 }).repeatForever().start();
      const finishDrag = (triggerAction: boolean): void => { Tween.stopAllByTarget(dragOpacity); tween(dragOpacity).to(0.2, { opacity: 0 }).start(); if (draggable && dragDistance >= 8) { this.audio?.vibrate(6); this.vfx?.buttonBurst(root, accent); } else if (triggerAction) action(); };
      root.on(Node.EventType.TOUCH_START, () => { dragDistance = 0; root.setSiblingIndex(Math.max(0, parent.children.length - 1)); this.audio?.play('tap'); this.audio?.vibrate(8); this.vfx?.buttonBurst(root, accent); Tween.stopAllByTarget(dragOpacity); tween(dragOpacity).to(0.12, { opacity: draggable ? 230 : 0 }).start(); Tween.stopAllByTarget(root); tween(root).to(0.08, { scale: new Vec3(0.9, 0.9, 1), angle: slot % 2 ? -4 : 4 }).to(0.24, { scale: new Vec3(1.08, 1.08, 1), angle: 0 }, { easing: 'backOut' }).to(0.16, { scale: Vec3.ONE }).start(); }, this);
      if (draggable) root.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => { const delta = event.getUIDelta(); dragDistance += Math.abs(delta.x) + Math.abs(delta.y); const halfWidth = SafeAreaAdapter.visibleWidth / 2; const halfHeight = SafeAreaAdapter.visibleHeight / 2; const nextX = Math.max(-halfWidth + maxWidth / 2 + 18, Math.min(halfWidth - maxWidth / 2 - 18, root.position.x + delta.x)); const nextY = Math.max(-halfHeight + maxHeight / 2 + 42, Math.min(halfHeight - maxHeight / 2 - 112, root.position.y + delta.y)); root.setPosition(nextX, nextY); }, this);
      root.on(Node.EventType.TOUCH_CANCEL, () => finishDrag(false), this); root.on(Node.EventType.TOUCH_END, () => finishDrag(true), this); if (!draggable) root.on(Button.EventType.CLICK, action, this);
    }
    return root;
  }

  private addGeneratedImage(parent: Node, path: string, x: number, y: number, maxWidth: number, maxHeight: number, alpha = 255, delay = 0): Node {
    const root = new Node(`GeneratedImage-${path.split('/').pop() ?? 'art'}`); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(maxWidth, maxHeight); root.setPosition(x, y); parent.addChild(root);
    const opacity = root.addComponent(UIOpacity); opacity.opacity = 0;
    const image = new Node('GeneratedArtwork'); image.layer = Layers.Enum.UI_2D; root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.RAW;
    resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !root.isValid || !image.isValid) return;
      const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame;
      const transform = image.getComponent(UITransform) as UITransform; transform.setContentSize(texture.width, texture.height);
      const scale = Math.min(maxWidth / texture.width, maxHeight / texture.height); image.setScale(new Vec3(scale, scale, 1));
      tween(opacity).delay(delay).to(0.26, { opacity: alpha }, { easing: 'quadOut' }).start();
    });
    return root;
  }

  private addCurrencyIcon(parent: Node, x: number, y: number, size: number, delay = 0): Node {
    const icon = this.addGeneratedImage(parent, GENERATED_ART_PATHS.currencyCoin, x, y, size, size, 255, delay); icon.name = 'CurrencyCoinIcon'; icon.setScale(new Vec3(0.92, 0.92, 1));
    tween(icon).delay(delay + 0.35).to(1.25, { scale: new Vec3(1.04, 1.04, 1), angle: 3 }, { easing: 'sineInOut' }).to(1.4, { scale: new Vec3(0.94, 0.94, 1), angle: -3 }, { easing: 'sineInOut' }).union().repeatForever().start(); return icon;
  }

  private addHomeJackpotMarquee(): void {
    const marquee = this.panel(this.page, 0, 214, 900, 50, 22, new Color(76, 15, 27, 232), new Color(230, 179, 77, 175), 1, false); marquee.name = 'HomeJackpotMarquee'; this.addCardShine(marquee, 872, 40, C.paleGold, 0.2);
    this.addCurrencyIcon(marquee, -405, 0, 36, 0.04); this.addPremiumSymbol(marquee, GAME_CONFIGS[3], 'bonus', 405, 0, 38, 'pulse', 230, 0.12);
    const copy = this.outlineLabel(this.label(marquee, 'MINI  88,888   •   MAJOR  888,888   •   GRAND  8,888,888', 0, 0, 20, C.paleGold, true, 790), new Color(62, 6, 15), 3); tween(copy.node).to(1.15, { scale: new Vec3(1.015, 1.015, 1) }, { easing: 'sineInOut' }).to(1.3, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private addHomeFortuneHost(): void {
    const lounge = this.panel(this.page, 0, -686, 900, 148, 30, new Color(84, 19, 30, 238), new Color(227, 176, 75, 170), 1, false); lounge.name = 'InteractiveFortuneHost'; this.addCardShine(lounge, 872, 132, C.paleGold, 0.5); this.addCoinBorder(lounge, 850, 126, 14, 18, 210);
    this.addMascot(lounge, 1, -354, -2, 116, 140, 255, 0.06, () => { this.vfx.celebrateWin(new Vec3(-354, -686, 0), C.gold); this.toast('FORTUNE HOST SAYS: YOUR NEXT SPIN MAY SHINE', C.gold); });
    this.outlineLabel(this.label(lounge, 'FORTUNE HOST', -135, 24, 27, C.paleGold, true, 330), new Color(59, 6, 15), 3); this.outlineLabel(this.label(lounge, 'Tap mascot for a lucky sparkle', -110, -21, 20, C.white, true, 390), new Color(59, 6, 15), 2);
    this.addCurrencyIcon(lounge, 116, 5, 42, 0.1); this.button(lounge, 'DAILY REWARDS', 292, 0, 238, 64, () => this.router.go('rewards'), 'secondary');
  }

  private makeCurrencyInteractive(icon: Node, action: () => void): void {
    const transform = icon.getComponent(UITransform); if (transform) { const size = transform.contentSize; transform.setContentSize(size.width + 20, size.height + 20); }
    const button = icon.addComponent(Button); button.interactable = true; button.transition = Button.Transition.NONE;
    icon.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(8); this.vfx?.buttonBurst(icon, C.gold); }, this);
    icon.on(Button.EventType.CLICK, action, this);
  }

  private addWinCoinRain(parent: Node, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const size = 46 + (index % 4) * 10; const startX = -390 + ((index * 137) % 780); const startY = 240 + ((index * 83) % 130); const delay = 0.12 + (index % 8) * 0.14 + Math.floor(index / 8) * 0.34;
      const coin = this.addGeneratedImage(parent, GENERATED_ART_PATHS.currencyCoin, startX, startY, size, size, 255, delay); coin.name = `JackpotCoin-${index}`; coin.setScale(new Vec3(0.38, 0.38, 1)); coin.angle = index % 2 ? -18 : 18;
      const drift = ((index % 5) - 2) * 24; const direction = index % 2 ? 1 : -1;
      tween(coin).delay(delay).to(0.18, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' }).by(0.58, { position: new Vec3(drift, -225, 0), angle: direction * 118, scale: new Vec3(-0.12, -0.12, 0) }, { easing: 'quadIn' }).by(0.72, { position: new Vec3(-drift * 0.65, -390, 0), angle: direction * 190, scale: new Vec3(-0.18, -0.18, 0) }, { easing: 'quadIn' }).call(() => { if (coin.isValid) coin.destroy(); }).start();
    }
  }

  private artLabel(parent: Node, text: string, x: number, y: number, size: number, width: number): Node {
    const multiline = text.includes('\n'); const height = Math.max(size * (multiline ? 2.7 : 1.65), 76); const root = new Node('ArtLabel'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(width, height); root.setPosition(x, y); parent.addChild(root);
    const addLayer = (name: string, offsetY: number, fontSize: number, color: Color, outline: Color, outlineWidth: number): Label => {
      const node = new Node(name); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(0, offsetY); root.addChild(node);
      const copy = node.addComponent(Label); copy.useSystemFont = true; copy.fontFamily = 'Georgia'; copy.string = text; copy.fontSize = fontSize; copy.lineHeight = Math.round(fontSize * 1.04); copy.color = color; copy.isBold = true; copy.horizontalAlign = Label.HorizontalAlign.CENTER; copy.verticalAlign = Label.VerticalAlign.CENTER; copy.overflow = Label.Overflow.SHRINK; copy.enableOutline = true; copy.outlineColor = outline; copy.outlineWidth = outlineWidth; return copy;
    };
    addLayer('ArtTextShadow', -7, size, new Color(67, 7, 18, 245), new Color(39, 3, 10), Math.max(5, Math.round(size * 0.12)));
    addLayer('ArtTextGoldDepth', -2, size, new Color(195, 118, 29), new Color(102, 32, 14), Math.max(4, Math.round(size * 0.085)));
    addLayer('ArtTextFace', 2, size, new Color(255, 242, 185), new Color(235, 172, 58), Math.max(2, Math.round(size * 0.045)));
    const sheen = addLayer('ArtTextSheen', Math.max(3, size * 0.055), Math.max(12, Math.round(size * 0.96)), new Color(255, 253, 233, 178), new Color(255, 230, 142, 90), 1); const sheenOpacity = sheen.node.addComponent(UIOpacity); sheenOpacity.opacity = 12;
    tween(sheenOpacity).delay(0.42).to(0.2, { opacity: 190 }, { easing: 'quadOut' }).to(0.52, { opacity: 18 }, { easing: 'quadIn' }).delay(1.4).union().repeatForever().start();
    return root;
  }

  private addReelEnergy(parent: Node, color: Color, width: number, height: number): void {
    const lens = new Node('ReelGlassLens'); lens.layer = Layers.Enum.UI_2D; lens.addComponent(UITransform).setContentSize(width - 10, height - 10); lens.setPosition(0, 0); const mask = lens.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = lens.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16, 22); stencil.fill(); } parent.addChild(lens);
    const glass = new Node('LensDepth'); glass.layer = Layers.Enum.UI_2D; glass.addComponent(UITransform).setContentSize(width, height); lens.addChild(glass); const glassGraphics = glass.addComponent(Graphics); glassGraphics.fillColor = new Color(255, 250, 232, 9); glassGraphics.roundRect(-width / 2, -height / 2, width, height, 22); glassGraphics.fill(); glassGraphics.fillColor = new Color(255, 255, 255, 16); glassGraphics.moveTo(-width / 2, height * 0.48); glassGraphics.lineTo(width * 0.2, height * 0.48); glassGraphics.lineTo(-width * 0.04, height * 0.08); glassGraphics.lineTo(-width / 2, -height * 0.04); glassGraphics.close(); glassGraphics.fill();
    for (let index = 0; index < 3; index += 1) { const sweep = new Node(`GlassReflection-${index}`); sweep.layer = Layers.Enum.UI_2D; sweep.addComponent(UITransform).setContentSize(260, height * 1.7); sweep.setPosition(-width * 0.72, 0); sweep.angle = -17 + index * 3; lens.addChild(sweep); const graphics = sweep.addComponent(Graphics); graphics.fillColor = index === 1 ? new Color(color.r, color.g, color.b, 26) : new Color(255, 255, 245, index === 0 ? 30 : 18); const half = 52 + index * 22; graphics.moveTo(-half, -height); graphics.lineTo(half * 0.08, -height); graphics.lineTo(half, height); graphics.lineTo(-half * 0.18, height); graphics.close(); graphics.fill(); const opacity = sweep.addComponent(UIOpacity); opacity.opacity = 0; const delay = 0.45 + index * 1.1; tween(opacity).delay(delay).to(0.18, { opacity: index === 0 ? 112 : 76 }).delay(0.52).to(0.42, { opacity: 0 }).delay(3.2 + index * 0.35).union().repeatForever().start(); tween(sweep).delay(delay).to(1.1 + index * 0.12, { position: new Vec3(width * 0.72, 0, 0) }, { easing: 'sineInOut' }).call(() => sweep.setPosition(-width * 0.72, 0)).delay(3.62 + index * 0.35).union().repeatForever().start(); }
    const points = [[-0.49, 0.47], [-0.18, 0.5], [0.26, 0.49], [0.49, 0.29], [0.49, -0.4], [0.12, -0.5], [-0.31, -0.49], [-0.49, -0.2]] as const; points.forEach(([rx, ry], index) => { const glint = new Node(`MetalRimGlint-${index}`); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(22, 22); glint.setPosition(rx * width, ry * height); parent.addChild(glint); const graphics = glint.addComponent(Graphics); graphics.fillColor = index % 3 === 0 ? C.paleGold : C.white; graphics.moveTo(0, 10); graphics.lineTo(2.2, 2.2); graphics.lineTo(10, 0); graphics.lineTo(2.2, -2.2); graphics.lineTo(0, -10); graphics.lineTo(-2.2, -2.2); graphics.lineTo(-10, 0); graphics.lineTo(-2.2, 2.2); graphics.close(); graphics.fill(); const opacity = glint.addComponent(UIOpacity); opacity.opacity = 0; tween(opacity).delay(0.28 + index * 0.37).to(0.13, { opacity: 235 }).to(0.38, { opacity: 0 }).delay(1.75 + index * 0.08).union().repeatForever().start(); tween(glint).delay(index * 0.18).to(0.18, { scale: new Vec3(1.45, 1.45, 1), angle: 35 }).to(0.4, { scale: new Vec3(0.55, 0.55, 1), angle: 85 }).delay(1.75).union().repeatForever().start(); });
  }

  private addReelInsetShadow(parent: Node, width: number, height: number, radius: number): void {
    const inset = new Node('ReelInsetGlassBevel'); inset.layer = Layers.Enum.UI_2D; inset.addComponent(UITransform).setContentSize(width, height); parent.addChild(inset); inset.setSiblingIndex(Math.max(0, parent.children.length - 1));
    const graphics = inset.addComponent(Graphics); const corner = Math.max(8, radius - 4);
    graphics.strokeColor = new Color(63, 29, 14, 92); graphics.lineWidth = 18; graphics.roundRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16, corner); graphics.stroke();
    graphics.strokeColor = new Color(255, 251, 231, 76); graphics.lineWidth = 4; graphics.roundRect(-width / 2 + 18, -height / 2 + 18, width - 36, height - 36, Math.max(6, corner - 10)); graphics.stroke();
    graphics.strokeColor = new Color(211, 156, 61, 62); graphics.lineWidth = 2; graphics.roundRect(-width / 2 + 23, -height / 2 + 23, width - 46, height - 46, Math.max(5, corner - 14)); graphics.stroke();
    const opacity = inset.addComponent(UIOpacity); opacity.opacity = 220;
  }

  private paintBackdrop(asset: string, bottom: Color, top: Color): void {
    const width = SafeAreaAdapter.visibleWidth; const height = SafeAreaAdapter.visibleHeight;
    const base = new Node('Backdrop'); base.layer = Layers.Enum.UI_2D; base.addComponent(UITransform).setContentSize(width, height); this.background.addChild(base); const graphics = base.addComponent(Graphics);
    const bands = 24; for (let index = 0; index < bands; index += 1) { const ratio = index / (bands - 1); graphics.fillColor = new Color(Math.round(bottom.r + (top.r - bottom.r) * ratio), Math.round(bottom.g + (top.g - bottom.g) * ratio), Math.round(bottom.b + (top.b - bottom.b) * ratio), 255); graphics.rect(-width / 2, -height / 2 + index * height / bands, width, height / bands + 2); graphics.fill(); }
    this.loadBackdrop(base, asset, width, height); this.addAmbientLights(base, top, width, height);
  }

  private loadBackdrop(parent: Node, asset: string, width: number, height: number): void {
    const paths: Record<string, string> = { boot: 'generated/common/start_bg_v01', 'loading_astral-vault': 'generated/common/loading_fortune_stage_v01', 'loading_golden-dynasty': 'generated/common/loading_coin_garden_v01', 'loading_neon-classic': 'generated/common/loading_gem_classic_v01', 'loading_cosmic-coins': 'generated/common/loading_diamond_vault_v01', login: 'generated/login/login_bg_v01', home: 'generated/home/home_bg_v01', store: 'generated/common/common_bg_v01', rewards: 'generated/common/common_bg_v01', rank: 'generated/common/common_bg_v01', profile: 'generated/common/common_bg_v01', wheel: 'generated/common/common_bg_v01' };
    const gamePaths: Record<string, string> = { 'game_astral-vault': 'generated/game01/base_bg_v01', 'game_golden-dynasty': 'generated/game02/base_bg_v01', 'game_neon-classic': 'generated/game03/base_bg_v01', 'game_cosmic-coins': 'generated/game04/base_bg_v01' };
    const path = paths[asset] ?? gamePaths[asset]; if (!path) return;
    resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (error || !texture || !parent.isValid) return; const cabinet = asset.startsWith('game_'); const frame = new SpriteFrame(); frame.texture = texture; const node = new Node('GeneratedBackdrop'); node.layer = Layers.Enum.UI_2D; const sprite = node.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const transform = node.getComponent(UITransform) as UITransform; const scale = Math.max(width / texture.width, height / texture.height) * (cabinet ? 1 : 1.025); node.setScale(new Vec3(scale, scale, 1)); parent.addChild(node); node.setSiblingIndex(0); transform.setContentSize(texture.width, texture.height); const opacity = node.addComponent(UIOpacity); const baseOpacity = asset === 'home' ? 226 : 210; opacity.opacity = cabinet ? 255 : baseOpacity; if (cabinet) return; tween(node).to(7, { position: new Vec3(12, 8, 0), scale: new Vec3(scale * 1.018, scale * 1.018, 1) }, { easing: 'sineInOut' }).to(7, { position: new Vec3(-12, -8, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(3.8, { opacity: Math.min(238, baseOpacity + 14) }, { easing: 'sineInOut' }).to(4.2, { opacity: Math.max(188, baseOpacity - 12) }, { easing: 'sineInOut' }).union().repeatForever().start(); });
  }

  private addStarField(parent: Node, count: number): void {
    for (let index = 0; index < count; index += 1) { const x = ((index * 317) % 1030) - 515; const y = ((index * 619) % 1800) - 900; const radius = 2 + (index % 4); const node = new Node(`WealthMote-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 3, radius * 3); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); const pearl = index % 3 !== 0; g.fillColor = pearl ? new Color(255, 248, 226, 185) : index % 6 === 0 ? new Color(231, 142, 154, 180) : new Color(232, 181, 82, 185); g.circle(0, 0, radius); g.fill(); if (pearl) { g.strokeColor = new Color(221, 178, 90, 150); g.lineWidth = 1; g.circle(0, 0, radius + 1); g.stroke(); } const opacity = node.addComponent(UIOpacity); opacity.opacity = 45 + index % 5 * 20; tween(node).delay((index % 7) * 0.18).by(4.8 + index % 5, { position: new Vec3(index % 2 ? -14 : 14, 64, 0) }, { easing: 'sineInOut' }).by(4.8 + index % 5, { position: new Vec3(index % 2 ? 14 : -14, -64, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(1.8, { opacity: 175 }).to(2.2, { opacity: 55 }).union().repeatForever().start(); }
  }

  private addPearlRail(parent: Node, width: number, height: number, count = 14): void {
    const rails = height > 180 ? [height / 2 - 8, -height / 2 + 8] : [height / 2 - 6];
    rails.forEach((y, railIndex) => { for (let index = 0; index < count; index += 1) { const pearl = new Node(`PearlRail-${railIndex}-${index}`); pearl.layer = Layers.Enum.UI_2D; pearl.addComponent(UITransform).setContentSize(18, 18); pearl.setPosition(-width / 2 + width * index / Math.max(1, count - 1), y); parent.addChild(pearl); const graphics = pearl.addComponent(Graphics); graphics.fillColor = new Color(116, 69, 24, 145); graphics.circle(0, 0, 7); graphics.fill(); graphics.fillColor = new Color(255, 249, 229, 238); graphics.circle(-1, 1, 5.2); graphics.fill(); graphics.fillColor = new Color(255, 255, 255, 165); graphics.circle(-2.5, 3, 1.4); graphics.fill(); const opacity = pearl.addComponent(UIOpacity); opacity.opacity = 150 + (index % 4) * 20; tween(opacity).delay(index * 0.06).to(1.2, { opacity: 245 }).to(1.6, { opacity: 145 }).union().repeatForever().start(); } });
  }

  private addCoinBorder(parent: Node, width: number, height: number, count = 10, size = 22, alpha = 220): Node {
    const root = new Node('RealCoinBorder'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(width, height); parent.addChild(root);
    resources.load(`${GENERATED_ART_PATHS.currencyCoin}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !root.isValid) return; root.setSiblingIndex(Math.max(0, parent.children.length - 1)); const frame = new SpriteFrame(); frame.texture = texture; const usableWidth = Math.max(1, width - size * 1.35);
      const addCoin = (x: number, y: number, index: number, lower: boolean): void => { const coin = new Node(`BorderCoin-${lower ? 'B' : 'T'}-${index}`); coin.layer = Layers.Enum.UI_2D; coin.addComponent(UITransform).setContentSize(texture.width, texture.height); coin.setPosition(x, y); coin.angle = (index % 3 - 1) * 5; root.addChild(coin); const sprite = coin.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = size / Math.max(texture.width, texture.height) * (index % 2 ? 0.9 : 1); coin.setScale(new Vec3(scale, scale, 1)); const opacity = coin.addComponent(UIOpacity); opacity.opacity = 0; tween(opacity).delay(index * 0.035 + (lower ? 0.12 : 0)).to(0.24, { opacity: alpha }, { easing: 'quadOut' }).delay(1.1 + index * 0.06).to(0.28, { opacity: Math.max(145, alpha - 42) }).to(0.5, { opacity: alpha }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(coin).delay(index * 0.04).by(1.8 + index * 0.05, { angle: index % 2 ? 5 : -5, position: new Vec3(0, lower ? -1.5 : 1.5, 0) }, { easing: 'sineInOut' }).by(1.9 + index * 0.05, { angle: index % 2 ? -5 : 5, position: new Vec3(0, lower ? 1.5 : -1.5, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); };
      for (let index = 0; index < count; index += 1) { const x = -usableWidth / 2 + usableWidth * index / Math.max(1, count - 1); addCoin(x, height / 2 - size * 0.48, index, false); addCoin(x, -height / 2 + size * 0.48, index, true); }
    });
    return root;
  }

  private addCoinCornerAccents(parent: Node, width: number, height: number, requestedSize?: number, alpha = 205): Node {
    const root = new Node('CoinFrameAccents'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(width, height); parent.addChild(root);
    resources.load(`${GENERATED_ART_PATHS.currencyCoin}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !root.isValid) return; root.setSiblingIndex(Math.max(0, parent.children.length - 1)); const frame = new SpriteFrame(); frame.texture = texture; const size = requestedSize ?? Math.max(15, Math.min(32, Math.min(width, height) * 0.16)); const inset = size * 0.58; const compact = height <= 94; const positions: readonly (readonly [number, number])[] = compact ? [[-width / 2 + inset, 0], [width / 2 - inset, 0]] : [[-width / 2 + inset, height / 2 - inset], [width / 2 - inset, height / 2 - inset], [-width / 2 + inset, -height / 2 + inset], [width / 2 - inset, -height / 2 + inset]];
      positions.forEach(([x, y], index) => { const coin = new Node(`CoinCorner-${index}`); coin.layer = Layers.Enum.UI_2D; coin.addComponent(UITransform).setContentSize(texture.width, texture.height); coin.setPosition(x, y); coin.angle = index % 2 ? 7 : -7; root.addChild(coin); const sprite = coin.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = size / Math.max(texture.width, texture.height); coin.setScale(new Vec3(scale, scale, 1)); const opacity = coin.addComponent(UIOpacity); opacity.opacity = 0; tween(opacity).delay(0.04 * index).to(0.22, { opacity: alpha }, { easing: 'quadOut' }).delay(1.4 + index * 0.18).to(0.22, { opacity: Math.max(145, alpha - 46) }).to(0.42, { opacity: alpha }, { easing: 'sineInOut' }).union().repeatForever().start(); });
    });
    return root;
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
    const graphics = orbit.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, 130); graphics.lineWidth = 3; graphics.arc(0, 0, radius, 0.18, Math.PI * 1.42, false); graphics.stroke(); graphics.strokeColor = new Color(C.gold.r, C.gold.g, C.gold.b, 82); graphics.lineWidth = 1; graphics.circle(0, 0, radius * 0.72); graphics.stroke(); for (let index = 0; index < 10; index += 1) { const angle = Math.PI * 2 * index / 10; graphics.fillColor = index % 3 === 0 ? C.gold : C.white; graphics.circle(Math.cos(angle) * radius * 0.72, Math.sin(angle) * radius * 0.72, index % 3 === 0 ? 5 : 7); graphics.fill(); }
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
    resources.load(`${GENERATED_ART_PATHS.homeEmbeddedScreen}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('EmbeddedSlotScreenArtwork'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW;
      const scale = Math.max(width / texture.width, height / texture.height) * 1.035; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(0, 0); const opacity = image.addComponent(UIOpacity); opacity.opacity = 0; tween(opacity).to(0.32, { opacity: 255 }).start(); tween(image).to(5.2, { position: new Vec3(-12, 3, 0), scale: new Vec3(scale * 1.018, scale * 1.018, 1) }, { easing: 'sineInOut' }).to(5.4, { position: new Vec3(10, -3, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
    const shade = new Node('BannerGlassShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); const graphics = shade.addComponent(Graphics); for (let index = 0; index < 5; index += 1) { const bandWidth = width * (0.5 - index * 0.07); graphics.fillColor = new Color(42, 4, 13, 54 - index * 8); graphics.rect(-width / 2, -height / 2, bandWidth, height); graphics.fill(); }
    const glass = new Node('BannerCabinetGlass'); glass.layer = Layers.Enum.UI_2D; glass.addComponent(UITransform).setContentSize(width, height); clip.addChild(glass); const glassGraphics = glass.addComponent(Graphics); glassGraphics.fillColor = new Color(255, 246, 212, 20); glassGraphics.moveTo(-width * 0.5, height * 0.46); glassGraphics.lineTo(width * 0.17, height * 0.46); glassGraphics.lineTo(-width * 0.04, height * 0.05); glassGraphics.lineTo(-width * 0.5, -height * 0.18); glassGraphics.close(); glassGraphics.fill(); const glassOpacity = glass.addComponent(UIOpacity); glassOpacity.opacity = 74; tween(glassOpacity).to(2.1, { opacity: 116 }).to(2.4, { opacity: 52 }).union().repeatForever().start();
  }

  private addGameCardArt(parent: Node, index: number, width: number, height: number): Node {
    const paths = ['generated/game01/base_bg_v01', 'generated/game02/base_bg_v01', 'generated/game03/base_bg_v01', 'generated/game04/base_bg_v01']; const clip = new Node('GameCardArt'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height);
    // The ornamental windows have rounded/concave corners. A rectangular mask
    // leaves visible background squares in the frame's transparent corners,
    // even when the frame's inner bounds are otherwise aligned correctly.
    const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL;
    // Every card now uses the same physical cabinet bezel. Keep the artwork
    // flush to its clear aperture; the four distinct machines provide the
    // visual identity instead of four unrelated ornamental picture frames.
    const aperture = { left: 7, right: 7, top: 7, bottom: 7 }; const radius = [36, 36, 34, 34][index] ?? 36;
    const stencil = clip.getComponent(Graphics);
    if (stencil) { stencil.clear(); stencil.roundRect(-width / 2 + aperture.left, -height / 2 + aperture.bottom, width - aperture.left - aperture.right, height - aperture.top - aperture.bottom, radius); stencil.fill(); }
    parent.addChild(clip); clip.setSiblingIndex(0);
    const pedestal = new Node('MachinePedestalGlow'); pedestal.layer = Layers.Enum.UI_2D; pedestal.addComponent(UITransform).setContentSize(330, 100); pedestal.setPosition(0, -112); clip.addChild(pedestal); const pedestalGraphics = pedestal.addComponent(Graphics); const accent = this.themeColor(GAME_CONFIGS[index].id); pedestalGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 48); pedestalGraphics.ellipse(0, 0, 150, 34); pedestalGraphics.fill();
    resources.load(`${paths[index]}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture;
      const backdrop = new Node('CardWorldBackdrop'); backdrop.layer = Layers.Enum.UI_2D; backdrop.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(backdrop); backdrop.setSiblingIndex(0); const backdropSprite = backdrop.addComponent(Sprite); backdropSprite.spriteFrame = frame; backdropSprite.sizeMode = Sprite.SizeMode.RAW; const coverScale = Math.max(width / texture.width, height / texture.height) * 1.12; backdrop.setScale(new Vec3(coverScale, coverScale, 1)); backdrop.setPosition(0, -32); const backdropOpacity = backdrop.addComponent(UIOpacity); backdropOpacity.opacity = 126;
      const shade = new Node('GameCardShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); shade.setSiblingIndex(1); const shadeGraphics = shade.addComponent(Graphics); shadeGraphics.fillColor = new Color(index === 1 || index === 3 ? 33 : 62, index === 1 || index === 3 ? 45 : 12, index === 1 || index === 3 ? 25 : 25, 144); shadeGraphics.rect(-width / 2, -height / 2, width, height); shadeGraphics.fill();
      const cabinet = new Node('CardFullCabinet'); cabinet.layer = Layers.Enum.UI_2D; cabinet.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(cabinet); const cabinetSprite = cabinet.addComponent(Sprite); cabinetSprite.spriteFrame = frame; cabinetSprite.sizeMode = Sprite.SizeMode.RAW; const cabinetScale = Math.min(width * 0.58 / texture.width, height * 0.96 / texture.height); cabinet.setScale(new Vec3(cabinetScale, cabinetScale, 1)); cabinet.setPosition(0, 0); const cabinetOpacity = cabinet.addComponent(UIOpacity); cabinetOpacity.opacity = 0;
      tween(cabinetOpacity).to(0.28, { opacity: 255 }).start(); tween(cabinet).delay(index * 0.08).to(0.45, { scale: new Vec3(cabinetScale * 1.04, cabinetScale * 1.04, 1) }, { easing: 'backOut' }).to(0.22, { scale: new Vec3(cabinetScale, cabinetScale, 1) }).call(() => { if (cabinet.isValid) tween(cabinet).by(2.2 + index * 0.16, { position: new Vec3(index % 2 ? -5 : 5, 7, 0), angle: index % 2 ? -0.8 : 0.8 }, { easing: 'sineInOut' }).by(2.4 + index * 0.16, { position: new Vec3(index % 2 ? 5 : -5, -7, 0), angle: index % 2 ? 0.8 : -0.8 }, { easing: 'sineInOut' }).union().repeatForever().start(); }).start(); tween(backdrop).to(5 + index * 0.7, { position: new Vec3(index % 2 ? -20 : 20, -16, 0), scale: new Vec3(coverScale * 1.04, coverScale * 1.04, 1) }, { easing: 'sineInOut' }).to(5 + index * 0.7, { position: new Vec3(0, -32, 0), scale: new Vec3(coverScale, coverScale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
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

  private usesLargePanelFrame(width: number, height: number, compact = false, requestedOuterSize?: { width: number; height: number }): boolean {
    return !compact && !requestedOuterSize && width >= 700 && height >= 110;
  }

  private largePanelSurfaceInsets(width: number, height: number): SurfaceInsets {
    const horizontal = height <= 170 ? Math.max(18, Math.min(24, width * 0.025)) : height <= 420 ? Math.max(28, Math.min(42, width * 0.045)) : Math.max(42, Math.min(62, width * 0.065));
    const vertical = height <= 170 ? 18 : height <= 420 ? 34 : 52;
    return { left: horizontal, right: horizontal, top: vertical, bottom: vertical };
  }

  private largePanelFrameSpec(height: number): { path: string; left: number; right: number; top: number; bottom: number } {
    if (height <= 170) return { path: GENERATED_ART_PATHS.largePanelFrameCompact, left: 86, right: 105, top: 63, bottom: 57 };
    if (height <= 420) return { path: GENERATED_ART_PATHS.largePanelFrameMedium, left: 172, right: 211, top: 126, bottom: 114 };
    return { path: GENERATED_ART_PATHS.largePanelFrame, left: 344, right: 423, top: 251, bottom: 230 };
  }

  private visualSurfaceInsets(width: number, height: number, requestedIndex?: number, compact = false, requestedOuterSize?: { width: number; height: number }): SurfaceInsets {
    if (this.usesLargePanelFrame(width, height, compact, requestedOuterSize)) return this.largePanelSurfaceInsets(width, height);
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
    const route = this.router?.route; const game = route === 'game' || route === 'game-loading'; const path = game ? { 'astral-vault': 'generated/game01/base_bg_v01', 'golden-dynasty': 'generated/game02/base_bg_v01', 'neon-classic': 'generated/game03/base_bg_v01', 'cosmic-coins': 'generated/game04/base_bg_v01' }[this.selectedGame.id] : 'generated/common/common_bg_v01';
    resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('PanelMaterialImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(surfaceWidth / texture.width, surfaceHeight / texture.height) * 1.08; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(-16, -8); const opacity = image.addComponent(UIOpacity); opacity.opacity = 34; tween(image).to(7.2, { position: new Vec3(18, 10, 0), scale: new Vec3(scale * 1.025, scale * 1.025, 1) }, { easing: 'sineInOut' }).to(7.2, { position: new Vec3(-16, -8, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(3.2, { opacity: 52 }).to(4, { opacity: 28 }).union().repeatForever().start(); });
  }

  private addPanelImageBorder(parent: Node, width: number, height: number, requestedIndex?: number, requestedAlpha?: number, requestedOuterSize?: { width: number; height: number; innerContent?: Node }): void {
    if (this.usesLargePanelFrame(width, height, false, requestedOuterSize)) { this.addLargePanelImageBorder(parent, width, height, requestedAlpha); return; }
    const index = this.resolvedPanelFrameIndex(requestedIndex); const style = FRAME_STYLES[index] ?? FRAME_STYLES[0]; const sourceSize = FRAME_TEXTURE_SIZES[style.textureIndex]; const geometry = this.calculateFrameGeometry(sourceSize.width, sourceSize.height, width, height, index); const inverted = Math.abs((style.angle ?? 0) % 360) === 180; const alignedX = inverted ? -geometry.offsetX : geometry.offsetX; const alignedY = inverted ? -geometry.offsetY : geometry.offsetY;
    const border = new Node(`PanelImageBorder-${index}`); border.layer = Layers.Enum.UI_2D; const borderTransform = border.addComponent(UITransform); borderTransform.setContentSize(requestedOuterSize?.width ?? geometry.width, requestedOuterSize?.height ?? geometry.height); border.angle = style.angle ?? 0; if (requestedOuterSize) { border.setPosition(0, 0); requestedOuterSize.innerContent?.setPosition(-alignedX, -alignedY); } else border.setPosition(alignedX, alignedY); parent.addChild(border); const sprite = border.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.type = Sprite.Type.SLICED; if (style.tint) sprite.color = style.tint; const opacity = border.addComponent(UIOpacity); const portrait = width < height * 1.2; opacity.opacity = requestedAlpha ?? (portrait ? 220 : height <= 110 ? 215 : height <= 200 ? 205 : 190);
    // Geometry and opacity are final before the texture callback. Loading now
    // only supplies pixels; it can no longer move, resize or fade the border.
    this.withFrameTexture(style.textureIndex, (texture) => { if (!border.isValid || !parent.isValid) return; const frame = new SpriteFrame(); this.configureSlicedFrame(frame, texture, width, height, index); sprite.spriteFrame = frame; border.setSiblingIndex(Math.max(0, parent.children.length - 1)); });
    const accentWidth = requestedOuterSize?.width ?? geometry.width; const accentHeight = requestedOuterSize?.height ?? geometry.height; this.addCoinCornerAccents(parent, accentWidth, accentHeight, undefined, height <= 94 ? 185 : 205);
    if (accentWidth >= 300 && accentHeight >= 120) { const railSize = Math.max(17, Math.min(22, accentHeight * 0.065)); const railCount = Math.max(6, Math.min(14, Math.round(accentWidth / 70))); this.addCoinBorder(parent, accentWidth - railSize * 0.7, accentHeight - railSize * 0.7, railCount, railSize, 190); }
  }

  private addLargePanelImageBorder(parent: Node, width: number, height: number, requestedAlpha?: number): void {
    const border = new Node('PanelImageBorder-LargeWealth'); border.layer = Layers.Enum.UI_2D; border.addComponent(UITransform).setContentSize(width, height); parent.addChild(border);
    const sprite = border.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.type = Sprite.Type.SLICED;
    const opacity = border.addComponent(UIOpacity); opacity.opacity = requestedAlpha ?? (height <= 150 ? 244 : 232);
    const spec = this.largePanelFrameSpec(height); this.withLargePanelFrameTexture(spec.path, (texture) => {
      if (!border.isValid || !parent.isValid) return;
      const frame = new SpriteFrame(); frame.texture = texture; frame.insetLeft = spec.left; frame.insetRight = spec.right; frame.insetTop = spec.top; frame.insetBottom = spec.bottom; sprite.spriteFrame = frame;
      border.setSiblingIndex(Math.max(0, parent.children.length - 1));
    });
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
    const localized = this.localize(text); const lineCount = localized.split('\n').length; const textHeight = Math.max(60, Math.ceil(size * (lineCount * 1.24 + 0.55))); const node = new Node('Text'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, textHeight); node.setPosition(x, y); parent.addChild(node); const label = node.addComponent(Label); label.useSystemFont = true; label.fontFamily = 'Arial'; label.string = localized; label.fontSize = size; label.lineHeight = Math.round(size * (lineCount > 1 ? 1.22 : 1.18)); label.color = color; label.isBold = bold; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER; label.overflow = Label.Overflow.SHRINK;
    if (size >= 16 && color.r + color.g + color.b > 430) { label.enableShadow = true; label.shadowColor = new Color(45, 4, 13, bold ? 150 : 110); label.shadowOffset = new Vec2(0, -1.5); label.shadowBlur = bold ? 1.2 : 0.8; }
    return label;
  }

  private outlineLabel(label: Label, color: Color, width: number): Label { label.enableOutline = true; label.outlineColor = color; label.outlineWidth = width; return label; }

  private button(parent: Node, text: string, x: number, y: number, width: number, height: number, action: () => void, style: string): Node {
    const primary = style === 'primary' || style === 'spin'; const palette = primary ? [new Color(205, 146, 50), C.paleGold, C.ink] : style === 'secondary' ? [new Color(112, 66, 32), C.cyan, C.white] : style === 'nav-active' ? [new Color(0, 0, 0, 0), C.gold, C.paleGold] : style === 'link' || style === 'nav' ? [new Color(0, 0, 0, 0), new Color(0, 0, 0, 0), style === 'nav' ? C.muted : C.cyan] : [new Color(54, 31, 13), new Color(154, 103, 44), C.white];
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
    if (style === 'spin') this.addButtonEdgePulse(node, width, height, palette[1], true);
    if (style !== 'spin' && style !== 'nav' && style !== 'nav-active' && style !== 'link') this.addButtonImageFrame(node, text, style, width, height);
    const semanticArt = this.semanticButtonArt(text, style); if (semanticArt && style !== 'spin' && width >= 52 && height >= 52) { const compact = width < 180; this.addPremiumSymbol(node, semanticArt[0], semanticArt[1], compact ? 0 : -width / 2 + height * 0.62, 0, compact ? Math.min(width, height) * 0.7 : height * 0.78, 'button', compact ? 92 : 145, 0.2); }
    if (style === 'spin') { this.addSpinRings(node, Math.min(width, height) * 0.52); this.addPremiumSymbol(node, this.selectedGame, this.selectedGame.wildId, 0, 0, Math.min(width, height) * 0.78, 'button', 112); }
    const compactControl = text === '‹' || text === '+' || text === '−'; const fontSize = compactControl ? Math.min(38, height * 0.52) : Math.min(style === 'spin' ? 34 : 25, Math.max(19, height * 0.3)); const label = this.label(node, text, 0, 0, fontSize, palette[2], true, width - 16); label.node.name = 'Text';
    const button = node.addComponent(Button); button.interactable = true; button.transition = Button.Transition.SCALE; button.zoomScale = 0.94;
    const resetCopy = () => { Tween.stopAllByTarget(label.node); tween(label.node).to(0.12, { scale: Vec3.ONE }, { easing: 'quadOut' }).start(); };
    node.on(Node.EventType.MOUSE_ENTER, () => { Tween.stopAllByTarget(label.node); tween(label.node).to(0.12, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'quadOut' }).start(); }, this);
    node.on(Node.EventType.MOUSE_LEAVE, resetCopy, this);
    node.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(10); this.vfx?.buttonBurst(node, palette[1]); if (style !== 'link' && style !== 'nav') tween(label.node).to(0.08, { scale: new Vec3(1.05, 1.05, 1) }).to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }, this);
    node.on(Node.EventType.TOUCH_CANCEL, resetCopy, this); node.on(Node.EventType.TOUCH_END, resetCopy, this); node.on(Button.EventType.CLICK, action, this); return node;
  }

  private cabinetHotspot(parent: Node, text: string, x: number, y: number, width: number, height: number, action: () => void, fontSize = 24, color = C.paleGold): Node {
    const node = new Node('CabinetHotspot'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); parent.addChild(node);
    const feedback = new Node('CabinetTouchFeedback'); feedback.layer = Layers.Enum.UI_2D; feedback.addComponent(UITransform).setContentSize(width, height); node.addChild(feedback); feedback.setSiblingIndex(0); const feedbackGraphics = feedback.addComponent(Graphics); feedbackGraphics.fillColor = new Color(255, 232, 164, 110); feedbackGraphics.roundRect(-width * 0.46, -height * 0.39, width * 0.92, height * 0.78, Math.min(30, height * 0.34)); feedbackGraphics.fill(); const feedbackOpacity = feedback.addComponent(UIOpacity); feedbackOpacity.opacity = 0;
    const copy = this.outlineLabel(this.label(node, text, 0, 0, fontSize, color, true, Math.max(40, width - 12)), color === C.paleGold ? new Color(70, 8, 18) : new Color(255, 246, 216), color === C.paleGold ? 3 : 2); copy.node.name = 'Text';
    const opacity = copy.node.addComponent(UIOpacity); opacity.opacity = text ? 244 : 0; const button = node.addComponent(Button); button.interactable = true; button.transition = Button.Transition.NONE;
    const settle = () => { Tween.stopAllByTarget(node); Tween.stopAllByTarget(copy.node); Tween.stopAllByTarget(feedbackOpacity); tween(node).to(0.12, { scale: Vec3.ONE }, { easing: 'quadOut' }).start(); tween(copy.node).to(0.12, { scale: Vec3.ONE }, { easing: 'quadOut' }).start(); tween(feedbackOpacity).to(0.18, { opacity: 0 }).start(); };
    node.on(Node.EventType.MOUSE_ENTER, () => { Tween.stopAllByTarget(copy.node); Tween.stopAllByTarget(feedbackOpacity); tween(copy.node).to(0.12, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'quadOut' }).start(); tween(feedbackOpacity).to(0.14, { opacity: 54 }).start(); }, this);
    node.on(Node.EventType.MOUSE_LEAVE, settle, this);
    node.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(10); this.vfx?.buttonBurst(node, this.themeColor(this.selectedGame.id)); Tween.stopAllByTarget(node); Tween.stopAllByTarget(feedbackOpacity); feedbackOpacity.opacity = 126; tween(feedbackOpacity).to(0.34, { opacity: 0 }).start(); tween(node).to(0.07, { scale: new Vec3(0.91, 0.91, 1) }).to(0.18, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' }).to(0.12, { scale: Vec3.ONE }).start(); }, this);
    node.on(Node.EventType.TOUCH_CANCEL, settle, this); node.on(Node.EventType.TOUCH_END, settle, this); node.on(Button.EventType.CLICK, action, this); return node;
  }

  private cabinetUtilityHotspot(parent: Node, text: string, iconId: string, x: number, y: number, width: number, height: number, action: () => void, fontSize = 21, detached = false): Node {
    const rightSide = x > 0; const node = this.cabinetHotspot(parent, text, x, y, width, height, action, fontSize, C.paleGold); node.name = detached ? 'TransparentCornerUtility' : 'CabinetUtilityHotspot';
    const copy = node.getChildByName('Text'); if (copy) { copy.setPosition(rightSide ? -31 : 31, 0); const transform = copy.getComponent(UITransform); transform?.setContentSize(Math.max(60, width - 90), Math.max(60, height)); copy.setSiblingIndex(Math.max(0, node.children.length - 1)); }
    this.addPremiumSymbol(node, this.selectedGame, iconId, rightSide ? width / 2 - 42 : -width / 2 + 42, 0, Math.min(48, height * 0.7), 'button', 230, 0.03); return node;
  }

  private cabinetButton(parent: Node, text: string, x: number, y: number, width: number, height: number, action: () => void, circular = false): Node {
    const copyKey = text.replace(/\n/g, ' ').toUpperCase(); const auto = copyKey.includes('AUTO'); const artPath = circular ? CABINET_CONTROL_PATHS.spin : auto ? CABINET_CONTROL_PATHS.auto : CABINET_CONTROL_PATHS.secondary;
    const node = this.panel(parent, x, y, width, height, circular ? Math.min(width, height) / 2 : Math.min(34, height / 2), new Color(0, 0, 0, 0), undefined, 0, false); node.name = 'CabinetButton';
    const cropMode: CabinetControlCropMode = circular ? 'spin' : auto ? 'auto' : 'secondary';
    const visual = this.addCabinetControlArt(node, artPath, circular ? width * 0.79 : auto ? width * 0.78 : width * 0.96, circular ? height * 0.79 : auto ? width * 0.78 : height * 0.82, cropMode);
    const fontSize = circular ? 34 : auto ? 23 : Math.min(27, Math.max(24, height * 0.3)); const copy = this.outlineLabel(this.label(node, text, 0, 0, fontSize, circular || auto ? new Color(100, 20, 31) : C.paleGold, true, width - 24), circular || auto ? new Color(255, 239, 200) : new Color(68, 8, 18), circular ? 2 : 3); copy.node.name = 'Text';
    const button = node.addComponent(Button); button.interactable = true; button.transition = Button.Transition.NONE;
    const setHover = (active: boolean) => { Tween.stopAllByTarget(visual); tween(visual).to(0.14, { scale: active ? new Vec3(1.035, 1.035, 1) : Vec3.ONE }, { easing: 'quadOut' }).start(); Tween.stopAllByTarget(copy.node); tween(copy.node).to(0.12, { scale: active ? new Vec3(1.045, 1.045, 1) : Vec3.ONE }, { easing: 'quadOut' }).start(); };
    node.on(Node.EventType.MOUSE_ENTER, () => setHover(true), this); node.on(Node.EventType.MOUSE_LEAVE, () => setHover(false), this);
    node.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(10); this.vfx?.buttonBurst(node, circular ? C.paleGold : C.gold); Tween.stopAllByTarget(visual); tween(visual).to(0.07, { scale: new Vec3(0.94, 0.94, 1) }).to(0.18, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'backOut' }).start(); tween(copy.node).to(0.07, { scale: new Vec3(0.96, 0.96, 1) }).to(0.18, { scale: new Vec3(1.045, 1.045, 1) }, { easing: 'backOut' }).start(); }, this);
    node.on(Node.EventType.TOUCH_CANCEL, () => setHover(false), this); node.on(Node.EventType.TOUCH_END, () => setHover(false), this); node.on(Button.EventType.CLICK, action, this); return node;
  }

  private cabinetBetControl(parent: Node, x: number, y: number, width: number, height: number): Node {
    const root = this.panel(parent, x, y, width, height, 34, new Color(0, 0, 0, 0), undefined, 0, false); root.name = 'CabinetBetControl';
    const actions = [() => { this.betIndex = Math.max(0, this.betIndex - 1); this.refreshBet(); }, () => { this.betIndex = Math.min(this.selectedGame.bets.length - 1, this.betIndex + 1); this.refreshBet(); }];
    const artCentres = [-width * 0.228, width * 0.19];
    const visuals = this.addCabinetBetInnerArt(root, artCentres, height * 0.64);
    ['−', '+'].forEach((text, index) => { const hit = new Node(index ? 'BetPlus' : 'BetMinus'); hit.layer = Layers.Enum.UI_2D; hit.addComponent(UITransform).setContentSize(width * 0.4, height * 0.82); hit.setPosition(artCentres[index], 0); root.addChild(hit); const copy = this.outlineLabel(this.label(hit, text, 0, text === '+' ? 1 : 0, 38, C.paleGold, true, width * 0.3), new Color(63, 7, 16), 3); const button = hit.addComponent(Button); button.interactable = true; button.transition = Button.Transition.NONE; const setState = (hovered: boolean) => { Tween.stopAllByTarget(visuals[index]); tween(visuals[index]).to(0.12, { scale: hovered ? new Vec3(1.06, 1.06, 1) : Vec3.ONE }, { easing: 'quadOut' }).start(); Tween.stopAllByTarget(copy.node); tween(copy.node).to(0.12, { scale: hovered ? new Vec3(1.08, 1.08, 1) : Vec3.ONE }, { easing: 'quadOut' }).start(); }; hit.on(Node.EventType.MOUSE_ENTER, () => setState(true), this); hit.on(Node.EventType.MOUSE_LEAVE, () => setState(false), this); hit.on(Node.EventType.TOUCH_START, () => { this.audio?.play('tap'); this.audio?.vibrate(9); this.vfx?.buttonBurst(hit, C.gold); Tween.stopAllByTarget(visuals[index]); tween(visuals[index]).to(0.07, { scale: new Vec3(0.9, 0.9, 1) }).to(0.18, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'backOut' }).start(); tween(copy.node).to(0.07, { scale: new Vec3(0.94, 0.94, 1) }).to(0.18, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' }).start(); }, this); hit.on(Node.EventType.TOUCH_CANCEL, () => setState(false), this); hit.on(Node.EventType.TOUCH_END, () => setState(false), this); hit.on(Button.EventType.CLICK, actions[index], this); });
    return root;
  }

  private addCabinetControlShadow(parent: Node, width: number, height: number, circular: boolean, auto: boolean): void {
    const shadow = new Node('CabinetControlShadow'); shadow.layer = Layers.Enum.UI_2D; shadow.addComponent(UITransform).setContentSize(width, height); shadow.setPosition(0, circular ? -10 : auto ? -height * 0.33 : -7); parent.addChild(shadow); shadow.setSiblingIndex(0); const graphics = shadow.addComponent(Graphics); graphics.fillColor = new Color(43, 5, 10, circular ? 108 : 82);
    if (circular) graphics.ellipse(0, 0, width * 0.43, height * 0.2); else if (auto) graphics.ellipse(0, 0, width * 0.4, height * 0.09); else graphics.roundRect(-width * 0.45, -height * 0.34, width * 0.9, height * 0.68, Math.min(30, height * 0.28)); graphics.fill();
  }

  private addCabinetHoverGlow(parent: Node, width: number, height: number, circular: boolean): UIOpacity {
    const glow = new Node('CabinetHoverGlow'); glow.layer = Layers.Enum.UI_2D; glow.addComponent(UITransform).setContentSize(width * 1.06, height * 1.06); parent.addChild(glow); glow.setSiblingIndex(1); const graphics = glow.addComponent(Graphics); graphics.strokeColor = new Color(255, 237, 176, 238); graphics.lineWidth = circular ? 7 : 5; if (circular) graphics.circle(0, 0, Math.min(width, height) * 0.49); else graphics.roundRect(-width * 0.48, -height * 0.42, width * 0.96, height * 0.84, Math.min(30, height * 0.3)); graphics.stroke(); const opacity = glow.addComponent(UIOpacity); opacity.opacity = 42; tween(opacity).to(1.2, { opacity: 88 }, { easing: 'sineInOut' }).to(1.35, { opacity: 32 }, { easing: 'sineInOut' }).union().repeatForever().start(); return opacity;
  }

  private addCabinetControlArt(parent: Node, path: string, maxWidth: number, maxHeight: number, cropMode: CabinetControlCropMode = false): Node {
    const visual = new Node('CabinetControlVisual'); visual.layer = Layers.Enum.UI_2D; visual.addComponent(UITransform).setContentSize(maxWidth, maxHeight); parent.addChild(visual); visual.setSiblingIndex(0);
    let imageParent = visual;
    if (cropMode) { const clip = new Node('CabinetInnerButtonClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(maxWidth, maxHeight); visual.addChild(clip); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; imageParent = clip; }
    resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !parent.isValid) return;
      const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('CabinetControlArt'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); imageParent.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW;
      const horizontalRatio = cropMode === 'spin' ? 0.6 : cropMode === 'auto' ? 0.72 : cropMode === 'secondary' ? 0.68 : 1; const verticalRatio = cropMode === 'spin' ? 0.64 : cropMode === 'auto' ? 0.57 : cropMode === 'secondary' ? 0.49 : 1;
      const scale = cropMode ? Math.max(maxWidth / (texture.width * horizontalRatio), maxHeight / (texture.height * verticalRatio)) : Math.min(maxWidth / texture.width, maxHeight / texture.height); image.setScale(new Vec3(scale, scale, 1)); if (cropMode === 'auto') image.setPosition(0, -texture.height * 0.174 * scale); const opacity = image.addComponent(UIOpacity); opacity.opacity = 0; tween(opacity).to(0.24, { opacity: 255 }).start();
      tween(image).to(0.25, { scale: new Vec3(scale * 1.025, scale * 1.025, 1) }, { easing: 'backOut' }).to(0.18, { scale: new Vec3(scale, scale, 1) }).call(() => { if (!image.isValid) return; if (path === CABINET_CONTROL_PATHS.spin) tween(image).to(1.35, { scale: new Vec3(scale * 1.022, scale * 1.022, 1) }, { easing: 'sineInOut' }).to(1.45, { scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); else if (path === CABINET_CONTROL_PATHS.auto) tween(image).by(1.65, { position: new Vec3(0, 5, 0), scale: new Vec3(scale * 0.012, scale * 0.012, 0) }, { easing: 'sineInOut' }).by(1.75, { position: new Vec3(0, -5, 0), scale: new Vec3(-scale * 0.012, -scale * 0.012, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); }).start();
    });
    return visual;
  }

  private addCabinetBetInnerArt(parent: Node, centres: readonly number[], diameter: number): Node[] {
    const visuals = centres.map((x, index) => { const visual = new Node(index ? 'BetPlusVisual' : 'BetMinusVisual'); visual.layer = Layers.Enum.UI_2D; visual.addComponent(UITransform).setContentSize(diameter, diameter); visual.setPosition(x, 0); parent.addChild(visual); const clip = new Node('CabinetBetInnerClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(diameter, diameter); visual.addChild(clip); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; return visual; });
    resources.load(`${CABINET_CONTROL_PATHS.bet}/texture`, Texture2D, (error, texture) => { if (error || !texture || !parent.isValid) return; const sourceCentres = [160, 402]; const scale = diameter / (texture.height * 0.51); visuals.forEach((visual, index) => { if (!visual.isValid) return; const clip = visual.getChildByName('CabinetBetInnerClip'); if (!clip) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('CabinetControlArt'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); image.setPosition((texture.width * 0.5 - sourceCentres[index]) * scale, 0); image.setScale(new Vec3(scale, scale, 1)); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0; tween(opacity).to(0.24, { opacity: 255 }).start(); }); });
    return visuals;
  }

  private semanticButtonArt(text: string, style: string): readonly [GameConfig, string] | undefined {
    const copy = text.replace(/\n/g, ' ').toUpperCase();
    if (copy.includes('TURBO')) return [GAME_CONFIGS[2], 'wild'];
    if (copy.includes('AUTO')) return [GAME_CONFIGS[0], 'orrery'];
    if (copy.includes('WHEEL')) return [GAME_CONFIGS[0], 'orrery'];
    if (copy.includes('CHECK-IN') || copy.includes('CLAIM') || copy.includes('COLLECT') || copy.includes('ADD DEMO')) return [GAME_CONFIGS[3], 'bonus'];
    if (copy.includes('ENTER THE CASINO') || copy.includes('CREATE PROFILE') || copy.includes('CHECK LOCAL PROFILE')) return [GAME_CONFIGS[1], 'key'];
    if (copy.includes('GUEST')) return [GAME_CONFIGS[0], 'guardian'];
    if (copy.includes('CHANGE AVATAR')) return [GAME_CONFIGS[3], 'helmet'];
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
    if (style !== 'nav' && style !== 'nav-active' && width >= 170 && height >= 50) this.addCoinCornerAccents(parent, width - 6, height - 8, Math.max(14, Math.min(18, height * 0.25)), 185);
  }

  private addButtonEdgePulse(parent: Node, width: number, height: number, color: Color, circular = false): void {
    const edge = new Node('ButtonEnergyEdge'); edge.layer = Layers.Enum.UI_2D; edge.addComponent(UITransform).setContentSize(width, height); edge.setPosition(0, 0); parent.addChild(edge); const graphics = edge.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, circular ? 112 : 62); graphics.lineWidth = circular ? 3 : 1.5; const inset = circular ? 3 : 2; if (circular) graphics.circle(0, 0, Math.max(2, Math.min(width, height) / 2 - inset)); else graphics.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, Math.min(24, Math.max(4, height * 0.3 - inset))); graphics.stroke(); const opacity = edge.addComponent(UIOpacity); opacity.opacity = circular ? 112 : 34; tween(opacity).to(circular ? 1.15 : 1.7, { opacity: circular ? 182 : 82 }, { easing: 'sineInOut' }).to(circular ? 1.35 : 1.9, { opacity: circular ? 70 : 28 }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private input(parent: Node, placeholder: string, value: string, x: number, y: number, password = false): EditBox {
    const shellWidth = 650; const shellHeight = 88; const shell = this.panel(parent, x, y, shellWidth, shellHeight, 18, new Color(52, 28, 10), new Color(170, 115, 57), 2);
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
    const colors = [C.cyan, C.gold, C.violet, C.green]; const slot = index % GAME_CONFIGS.length; const node = this.panel(parent, x, y, size, size, size / 2, new Color(70, 39, 15), colors[index % colors.length], 4); const clip = new Node('AvatarCharacterClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(size - 8, size - 8); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; node.addChild(clip); this.addCharacter(clip, slot, 0, -size * 0.08, size * 0.92, size * 1.12, 255, slot * 0.12); return node;
  }

  private progress(parent: Node, x: number, y: number, width: number, ratio: number): void {
    const bar = this.panel(parent, x, y, width, 22, 11, new Color(48, 27, 10), new Color(151, 99, 50), 1); const fill = this.panel(bar, -width / 2 + width * ratio / 2, 0, Math.max(4, width * ratio), 12, 6, C.cyan); fill.name = 'ProgressFill';
  }

  private modal(width: number, height: number): Node {
    const mask = this.panel(this.overlay, 0, 0, SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight, 0, new Color(28, 13, 3, 205)); const card = this.panel(mask, 0, 0, Math.min(width, SafeAreaAdapter.visibleWidth - 100), Math.min(height, SafeAreaAdapter.visibleHeight - 160), 38, C.panel, C.gold, 3); card.setScale(new Vec3(0.85, 0.85, 1)); tween(card).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); return card;
  }

  private rewardModal(title: string, body: string, color: Color): void {
    this.audio.play('reward'); const modal = this.modal(850, 820); this.addLoadingOrbit(modal, 0, 212, color, 112); this.addLoadingOrbit(modal, 0, 212, C.gold, 80); this.addPremiumSymbol(modal, this.selectedGame, this.selectedGame.scatterId ?? this.selectedGame.bonusId ?? this.selectedGame.wildId, 0, 212, 154, 'pulse', 255, 0.06); this.addWinCoinRain(modal, 9); const heading = this.artLabel(modal, title, 0, 70, 43, 720); tween(heading).to(1.05, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' }).to(1.2, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start(); this.outlineLabel(this.label(modal, body, 0, -68, 26, C.white, true, 690), new Color(54, 7, 14), 3); this.button(modal, 'COLLECT', 0, -292, 400, 76, () => { this.vfx.celebrateWin(Vec3.ZERO, color); modal.parent?.destroy(); }, 'primary');
  }

  private showResetConfirmation(): void {
    const modal = this.modal(820, 620); this.label(modal, 'CLEAR LOCAL DATA', 0, 205, 38, C.red, true); this.label(modal, 'Type RESET to permanently remove every local demo profile.', 0, 120, 20, C.white, false, 680);
    const confirmation = this.input(modal, 'Type RESET', '', 0, 15);
    this.button(modal, 'CONFIRM RESET', 0, -115, 440, 76, () => { if (!this.bootstrap.save.clearConfirmed(confirmation.string)) { this.toast('Type RESET exactly to continue', C.red); return; } modal.parent?.destroy(); this.router.reset('login'); }, 'ghost');
    this.button(modal, 'CANCEL', 0, -215, 260, 52, () => modal.parent?.destroy(), 'link');
  }

  private toast(message: string, color: Color): void {
    const wealthMessage = /CREDIT|COLLECT|REWARD|JACKPOT|FORTUNE/i.test(message); const box = this.panel(this.toastLayer, 0, -700, 820, 90, 28, new Color(61, 34, 13, 250), color, 2); if (wealthMessage) this.addCurrencyIcon(box, -355, 0, 42, 0.02); this.label(box, message, wealthMessage ? 22 : 0, 0, 21, C.white, true, wealthMessage ? 700 : 760); box.setScale(new Vec3(0.9, 0.9, 1)); tween(box).to(0.18, { position: new Vec3(0, -620, 0), scale: Vec3.ONE }, { easing: 'backOut' }).delay(2).to(0.25, { position: new Vec3(0, -700, 0), scale: new Vec3(0.9, 0.9, 1) }).call(() => box.destroy()).start();
  }

  private refreshBalance(): void { if (this.balanceLabel) this.balanceLabel.string = this.router.route === 'game' ? `BALANCE  ${this.format(this.bootstrap.economy.balance())}` : this.format(this.bootstrap.economy.balance()); }
  private refreshBet(): void { if (this.betLabel) { this.betLabel.string = `BET  ${this.format(this.bet())}   •   ${this.lineReadout()}`; this.vfx.pulse(this.betLabel.node); } if (this.betCurrencyIcon) this.vfx.pulse(this.betCurrencyIcon); }
  private lineReadout(): string { return this.selectedGame.payMode === 'ways' ? `${Math.pow(this.selectedGame.rows, this.selectedGame.columns)} WAYS` : `${this.selectedGame.paylines.length} LINES`; }
  private bet(): number { return this.selectedGame.bets[Math.min(this.betIndex, this.selectedGame.bets.length - 1)]; }
  private ensurePlayer() { return this.bootstrap.profile.current()!; }
  private format(value: number): string { return Math.round(value).toLocaleString('en-US'); }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private applyPlayerPreferences(): void { const settings = this.bootstrap.profile.current()?.settings; if (!settings) return; this.audio?.setMusic(settings.music); this.audio?.setEffects(settings.sound); this.audio?.setVibration(settings.vibration); this.vfx?.setQuality(settings.quality); }
  private localize(text: string): string { return this.bootstrap.profile.current()?.settings.language === 'zh-CN' ? ZH[text] ?? text : text; }
  private themeColor(id: GameId): Color { return id === 'astral-vault' ? new Color(242, 202, 139) : id === 'golden-dynasty' ? new Color(211, 151, 53) : id === 'neon-classic' ? new Color(224, 128, 147) : new Color(97, 190, 147); }
  private selectQueryGame(query: URLSearchParams): void { const id = query.get('game') as GameId | null; if (id && GAME_CONFIG_BY_ID[id]) this.selectedGame = GAME_CONFIG_BY_ID[id]; }
  private forceFromQuery(force: string | null): ForceResult | undefined { if (force === 'win') return { symbolId: this.selectedGame.symbols.find((s) => s.tier === 'high')?.id, count: 5, wild: true }; if (force === 'free') return { scatterCount: 5 }; if (force === 'hold') return { holdAndSpin: true }; if (force === 'big' || force === 'mega' || force === 'epic') return { winTier: force }; return undefined; }
}

function okStyle(ok: boolean): string { return ok ? 'secondary' : 'ghost'; }
