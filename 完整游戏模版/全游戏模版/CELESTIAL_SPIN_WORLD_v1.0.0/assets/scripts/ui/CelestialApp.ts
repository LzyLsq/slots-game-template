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
  ink: new Color(3, 10, 31), navy: new Color(7, 22, 58), panel: new Color(10, 34, 74, 246),
  panel2: new Color(18, 45, 89, 250), gold: new Color(238, 187, 73), paleGold: new Color(255, 229, 155),
  cyan: new Color(73, 218, 255), violet: new Color(175, 92, 255), white: new Color(240, 247, 255),
  muted: new Color(145, 167, 206), red: new Color(255, 91, 120), green: new Color(72, 223, 165),
};
const ZH: Readonly<Record<string, string>> = {
  HOME: '首页', STORE: '商店', REWARDS: '奖励', RANK: '排行', PROFILE: '我的', SETTINGS: '设置', ACHIEVEMENTS: '成就', INBOX: '邮箱',
  'ACCOUNT SIGN IN': '账号登录', 'ENTER THE PARK': '进入游戏', 'CREATE LOCAL ACCOUNT': '注册本地账号', 'FORGOT PASSWORD': '忘记密码', 'CONTINUE AS GUEST': '游客登录',
  'CREATE ACCOUNT': '创建账号', 'CREATE PROFILE': '创建资料', 'BACK TO SIGN IN': '返回登录', 'RETURN TO LOGIN': '返回登录',
  'DAILY CHECK-IN': '每日签到', 'LUCKY WHEEL': '幸运转盘', 'CLAIM TODAY': '领取今日奖励', CLAIM: '领取', CLAIMED: '已领取', LOCKED: '未解锁', COLLECT: '领取',
  'DEMO CREDITS': '试玩金币', 'ADD DEMO': '添加试玩金币', 'SIGN IN': '去登录', 'REWARD CENTER': '奖励中心', 'STAR RANK': '星际排行',
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
  }

  private withFrameTexture(index: number, callback: (texture: Texture2D) => void): void {
    const cached = this.frameTextureCache.get(index); if (cached) { callback(cached); return; }
    resources.load(`${BUTTON_FRAME_PATHS[index]}/texture`, Texture2D, (error, texture) => {
      if (error || !texture) return; this.frameTextureCache.set(index, texture); callback(texture);
    });
  }

  private showBoot(): void {
    this.clearAll();
    this.paintBackdrop('boot', new Color(3, 8, 31), new Color(18, 35, 91));
    this.addStarField(this.page, 72);
    this.addLoadingOrbit(this.page, 0, 420, C.cyan, 150);
    const brandMark = this.label(this.page, '✦', 0, 420, 150, C.gold); tween(brandMark.node).to(0.9, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' }).to(0.9, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    this.label(this.page, 'CELESTIAL', 0, 205, 78, C.paleGold, true);
    this.label(this.page, 'SPIN WORLD', 0, 118, 58, C.white, true);
    this.label(this.page, 'TRADITIONAL REELS • VIRTUAL CREDITS', 0, 30, 22, C.muted);
    const bar = this.panel(this.page, 0, -430, 680, 24, 12, new Color(8, 25, 63), C.gold, 2);
    const fill = this.panel(bar, 0, 0, 660, 12, 6, C.cyan); fill.setScale(new Vec3(0.001, 1, 1));
    const progress = this.label(this.page, 'PREPARING STARWAYS  0%', 0, -385, 22, C.muted);
    tween(fill).to(1.7, { scale: Vec3.ONE }, { easing: 'quadInOut', onUpdate: (_target, ratio = 0) => { progress.string = `PREPARING STARWAYS  ${Math.floor(ratio * 100)}%`; } }).call(() => {
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
    this.balanceLabel = undefined; this.reelEngine = undefined; this.winLabel = undefined; this.betLabel = undefined; this.spinButtonLabel = undefined;
  }

  private onLayoutChanged(): void { if (this.router && !this.spinning) this.render(this.router.route); }

  private showLogin(): void {
    this.paintBackdrop('login', C.ink, new Color(18, 35, 84)); this.addStarField(this.page, 50);
    this.addCharacter(this.page, 0, -410, 300, 330, 530, 62, 0.15);
    this.addCharacter(this.page, 1, 410, 280, 330, 520, 58, 0.45);
    this.label(this.page, '✦', 0, 660, 100, C.gold);
    this.label(this.page, 'CELESTIAL SPIN WORLD', 0, 535, 50, C.paleGold, true);
    this.label(this.page, 'WELCOME, STARGAZER', 0, 455, 25, C.white, true);
    const card = this.panel(this.page, 0, -20, 820, 860, 38, new Color(6, 23, 58, 248), C.gold, 2);
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
    this.paintBackdrop('login', C.ink, new Color(26, 32, 84)); this.header('CREATE ACCOUNT', true);
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
    this.paintBackdrop('login', C.ink, new Color(16, 37, 83)); this.header('LOCAL RECOVERY', true);
    const card = this.panel(this.page, 0, 120, 820, 670, 38, C.panel, C.gold, 2);
    this.label(card, 'FORGOT YOUR PASSWORD?', 0, 245, 34, C.paleGold, true);
    this.label(card, 'This is a local demonstration. No email will be sent.', 0, 170, 21, C.muted);
    const identifier = this.input(card, 'Username or email', 'demo', 0, 55);
    this.button(card, 'CHECK LOCAL PROFILE', 0, -75, 620, 86, () => this.toast(this.bootstrap.auth.localPasswordHint(identifier.string), C.cyan), 'primary');
    this.button(card, 'RETURN TO LOGIN', 0, -185, 360, 56, () => this.router.back('login'), 'link');
  }

  private showHome(): void {
    this.paintBackdrop('home', new Color(3, 11, 34), new Color(18, 39, 92)); this.addStarField(this.page, 45); this.topBar();
    const banner = this.panel(this.page, 0, 495, 960, 340, 34, new Color(15, 37, 84, 245), C.gold, 2);
    const bannerInsets = this.visualSurfaceInsets(960, 340, 0); const bannerWidth = 960 - bannerInsets.left - bannerInsets.right; const bannerHeight = 340 - bannerInsets.top - bannerInsets.bottom; const bannerX = (bannerInsets.left - bannerInsets.right) / 2; const bannerY = (bannerInsets.bottom - bannerInsets.top) / 2;
    this.addBannerCarousel(banner, bannerWidth, bannerHeight, bannerX, bannerY); this.addCardMotes(banner, 12, C.cyan, Math.max(100, bannerWidth - 50), Math.max(80, bannerHeight - 40));
    this.addCardShine(banner, bannerWidth, bannerHeight, C.gold, 0.3, bannerX, bannerY);
    this.label(banner, 'CELESTIAL SEASON', -250, 72, 25, C.cyan, true);
    this.label(banner, 'FOUR WORLDS\nONE STARRY JOURNEY', -180, -10, 42, C.paleGold, true, 420);
    this.addBannerHeroCarousel(banner);
    this.button(banner, 'DAILY CHECK-IN', -265, -112, 360, 58, () => this.router.go('check-in'), 'secondary');
    this.button(banner, 'LUCKY WHEEL', 235, -112, 300, 58, () => this.router.go('wheel'), 'secondary');
    this.label(this.page, 'FEATURED TRADITIONAL REELS', -275, 270, 27, C.white, true, 500);
    this.label(this.page, 'ALL   •   LINES   •   WAYS   •   CLASSIC', 0, 215, 21, C.muted);
    const positions = [[-255, 0], [255, 0], [-255, -380], [255, -380]] as const;
    GAME_CONFIGS.forEach((config, index) => this.gameCard(config, positions[index][0], positions[index][1], index));
    this.bottomNav('home');
  }

  private gameCard(config: GameConfig, x: number, y: number, index: number): void {
    // This node is only the touch/layout shell. Drawing a 450×330 fill here
    // leaked outside the 438×318 media window under transparent frame pixels,
    // making Neon/Cosmic look as if the border pressed into the container.
    const card = this.panel(this.page, x, y, 450, 330, 28, new Color(0, 0, 0, 0), undefined, 0, false);
    const mediaWidth = 438; const mediaHeight = 318;
    const media = this.addGameCardArt(card, index, mediaWidth, mediaHeight);
    // Golden's artwork already clears its nearly symmetrical frame. The other
    // three portraits need a true ornamental safe area because their frames
    // have deep crowns/corner housings that intentionally project inward.
    const portrait = index === 1
      ? { x: 108, y: 30, width: 198, height: 226 }
      : { x: 90, y: 20, width: 180, height: 206 };
    this.addCharacter(media, index, portrait.x, portrait.y, portrait.width, portrait.height, 176, index * 0.16); this.addCardMotes(media, 7, index === 0 ? C.gold : C.cyan, 382, 258);
    const cardFrameIndex = index === 0 ? 4 : index; const artInsets = this.visualSurfaceInsets(mediaWidth, mediaHeight, cardFrameIndex, false, { width: 482, height: 364 }); const artWidth = mediaWidth - artInsets.left - artInsets.right; const artHeight = mediaHeight - artInsets.top - artInsets.bottom; this.addCardShine(media, artWidth, artHeight, index === 0 ? C.gold : C.cyan, 0.8 + index * 1.1, (artInsets.left - artInsets.right) / 2, (artInsets.bottom - artInsets.top) / 2);
    this.addPremiumSymbol(media, config, CARD_HERO_SYMBOLS[index], -92, 50, 118, 'float', 255, index * 0.24);
    this.addPremiumSymbol(media, config, config.scatterId ?? config.bonusId ?? config.wildId, 170, 98, 46, 'orbit', 180, index * 0.18);
    // Keep artwork and characters under the ornamental frame. Labels are
    // intentionally added afterwards so their text remains unobstructed.
    // All four featured cards use Golden's visual footprint as the reference.
    // Their art remains distinct, but the outer metal frames no longer jump
    // between wide/short and narrow/tall silhouettes from card to card.
    this.addPanelImageBorder(card, mediaWidth, mediaHeight, index === 0 ? 4 : index, 224, { width: 482, height: 364, innerContent: media });
    this.label(card, config.name, 0, -40, 29, C.white, true, 420);
    this.label(card, config.payMode === 'ways' ? '243 WAYS' : `${config.paylines.length} FIXED LINES`, 0, -76, 19, C.paleGold);
    const badgeY = index >= 2 ? 50 : 72;
    this.label(card, index === 0 ? 'RECOMMENDED' : index === 2 ? 'QUICK PLAY' : index === 3 ? 'HOLD & SPIN' : 'EXPANDING WILD', 0, badgeY, 17, index === 0 ? C.paleGold : C.white, true);
    card.on(Node.EventType.TOUCH_END, () => { this.selectedGame = config; this.router.go('game-loading'); }, this);
  }

  private showStore(): void {
    const player = this.ensurePlayer(); const guest = player.isGuest;
    this.paintBackdrop('store', C.ink, new Color(18, 37, 78)); this.topBar('STORE');
    this.label(this.page, 'DEMO CREDITS', 0, 650, 47, C.paleGold, true);
    this.label(this.page, guest ? 'GUEST MODE • TOP-UPS LOCKED' : 'No real payment • No cash value', 0, 595, 21, guest ? C.red : C.muted, true);
    const daily = this.panel(this.page, 0, 475, 920, 160, 28, new Color(17, 63, 83), C.cyan, 2, true, 0, 218);
    this.addCardShine(daily, 900, 142, C.cyan, 0.4);
    this.addPremiumSymbol(daily, GAME_CONFIGS[3], 'bonus', -325, -5, 62, 'pulse', 245); this.label(daily, 'DAILY STAR GIFT', -170, 13, 25, C.white, true, 330); this.label(daily, '+5,000 DEMO CREDITS', -160, -22, 18, C.cyan, false, 350);
    this.button(daily, 'CLAIM', 292, -7, 220, 56, () => { const ok = this.bootstrap.store.claimDaily(this.today()); this.toast(ok ? '5,000 demo credits collected' : 'Already collected today', ok ? C.green : C.muted); this.refreshBalance(); }, okStyle(true));
    DEMO_PRODUCTS.forEach((product, index) => {
      // The Cosmic ornament adds about 29 px beyond a 205 px product panel.
      // Start the product stack 10 px lower so its top rail clears the daily
      // gift's lower rail instead of the two translucent crests crossing.
      const y = 250 - index * 245; const card = this.panel(this.page, 0, y, 920, 205, 28, C.panel2, index === 2 ? C.gold : new Color(43, 100, 157), index === 2 ? 3 : 1, true, 3, index === 2 ? 228 : 216);
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
    this.paintBackdrop('rewards', C.ink, new Color(28, 31, 81)); this.topBar('REWARD CENTER');
    this.label(this.page, 'YOUR STARPATH REWARDS', 0, 650, 38, C.paleGold, true);
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
    this.paintBackdrop('rank', C.ink, new Color(13, 39, 78)); this.topBar('STAR RANK');
    const tabs: readonly [typeof tab, string][] = [['daily', 'DAILY'], ['weekly', 'WEEKLY'], ['all-time', 'ALL TIME']];
    tabs.forEach(([id, text], index) => this.button(this.page, text, -300 + index * 300, 620, 260, 62, () => this.showRank(id), id === tab ? 'primary' : 'ghost'));
    const rows = this.bootstrap.rank.list(tab, this.bootstrap.profile.current()).slice(0, 8);
    rows.forEach((entry, index) => {
      const y = 480 - index * 145; const current = entry.current; const row = this.panel(this.page, 0, y, 900, 120, 20, current ? new Color(31, 72, 104) : C.panel, index < 3 ? C.gold : new Color(49, 83, 130), index < 3 ? 2 : 1);
      if (index < 3) this.addCardShine(row, 880, 102, C.gold, 0.5 + index * 1.2);
      if (index < 3) { const rankArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'crown'], [GAME_CONFIGS[1], 'seal'], [GAME_CONFIGS[2], 'seven']]; this.addPremiumSymbol(row, rankArt[index][0], rankArt[index][1], -370, 0, 62, 'pulse', 235, index * 0.1); } else this.label(row, `${entry.rank}`, -370, 0, 30, C.muted, true);
      this.avatar(row, -290, 0, entry.avatar, 68); this.label(row, entry.nickname, -125, 12, 22, C.white, true, 300); this.label(row, current ? 'YOU • LOCAL' : 'LOCAL SIMULATION', -125, -16, 15, current ? C.cyan : C.muted, false, 300);
      this.label(row, this.format(entry.score), 315, 0, 25, C.paleGold, true, 230);
    });
    this.label(this.page, 'Pull-to-refresh simulation • Updated locally', 0, -680, 18, C.muted);
    this.bottomNav('rank');
  }

  private showProfile(): void {
    this.paintBackdrop('profile', C.ink, new Color(27, 28, 77)); this.topBar('PROFILE');
    // Profile uses three different frame proportions in one vertical stack.
    // Its previous 320 px hero surface made the Cosmic lower crest overlap the
    // stat-card top rails even though the plain rounded rectangles only met.
    const player = this.ensurePlayer(); const card = this.panel(this.page, 0, 470, 900, 280, 34, C.panel2, C.gold, 2, true, 3, 222);
    this.addCardShine(card, 880, 260, C.gold, 0.6);
    this.avatar(card, -285, -4, player.avatar, 120); this.label(card, player.nickname, -70, 48, 32, C.white, true, 430); this.label(card, `ID  ${player.id.slice(-10).toUpperCase()}`, -55, 10, 18, C.muted, false, 470);
    this.label(card, `LEVEL ${player.level}`, -145, -28, 20, C.cyan, true, 250); this.progress(card, -105, -62, 320, player.experience % 100 / 100);
    this.button(card, 'CHANGE AVATAR', 230, -62, 200, 48, () => { this.bootstrap.profile.setAvatar((player.avatar + 1) % 12); this.showProfile(); }, 'ghost');
    const stats = [['SPINS', player.gamesPlayed], ['BIGGEST WIN', player.biggestWin], ['TOTAL WIN', player.totalWin]] as const;
    const statArt: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'orrery'], [GAME_CONFIGS[0], 'crown'], [GAME_CONFIGS[3], 'bonus']]; stats.forEach(([name, value], index) => { const x = -315 + index * 315; const box = this.panel(this.page, x, 235, 270, 150, 20, C.panel, new Color(46, 84, 139), 1, true, 0, 208); this.addPremiumSymbol(box, statArt[index][0], statArt[index][1], -72, -7, 52, 'pulse', 112, index * 0.1); this.label(box, name, 28, 12, 16, C.muted, false, 170); this.label(box, this.format(value), 28, -20, 22, C.paleGold, true, 170); });
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
    this.paintBackdrop('rewards', C.ink, new Color(38, 32, 91)); this.header('7-DAY STAR CHECK-IN', true);
    this.label(this.page, 'Build your constellation one day at a time', 0, 630, 23, C.muted);
    const state = this.bootstrap.save.currentScope()?.checkIn ?? { cycleDay: 0, lastClaimDate: null };
    for (let index = 0; index < 7; index += 1) {
      const row = index < 4 ? 0 : 1; const column = row === 0 ? index : index - 4; const count = row === 0 ? 4 : 3;
      const x = (column - (count - 1) / 2) * (row === 0 ? 250 : 305); const y = row === 0 ? 300 : -40;
      const claimed = index < state.cycleDay; const current = index === state.cycleDay;
      const card = this.panel(this.page, x, y, row === 0 ? 210 : 260, 285, 24, current ? new Color(30, 81, 104) : C.panel, current ? C.gold : new Color(55, 82, 130), current ? 4 : 1);
      this.label(card, `DAY ${index + 1}`, 0, 58, 19, current ? C.paleGold : C.muted, true); this.addPremiumSymbol(card, index === 6 ? GAME_CONFIGS[0] : GAME_CONFIGS[3], index === 6 ? 'crown' : 'bonus', 0, 5, index === 6 ? 74 : 62, current ? 'pulse' : 'none', claimed ? 120 : 245, index * 0.06);
      this.label(card, `+${this.format(this.bootstrap.checkIn.rewards[index])}`, 0, -42, 21, C.white, true); if (claimed) this.label(card, '✓ CLAIMED', 0, -67, 15, C.green, true);
    }
    this.button(this.page, 'CLAIM TODAY', 0, -360, 650, 92, () => { const result = this.bootstrap.checkIn.claimToday(this.today()); this.toast(result.ok ? `Day ${result.day}: +${this.format(result.amount)} demo credits` : 'Today is already claimed', result.ok ? C.green : C.muted); if (result.ok) this.vfx.flyCredits(new Vec3(0, -360), new Vec3(330, 790), () => this.showCheckIn()); }, 'primary');
    this.button(this.page, 'DEMO MAKE-UP', 0, -475, 360, 56, () => this.toast('Make-up is a visual demo only', C.muted), 'ghost');
  }

  private showWheel(): void {
    this.paintBackdrop('wheel', C.ink, new Color(29, 33, 88)); this.header('LUCKY STAR WHEEL', true);
    this.label(this.page, '1 FREE LOCAL SPIN DAILY', 0, 625, 23, C.cyan, true);
    const wheel = new Node('Wheel'); wheel.layer = Layers.Enum.UI_2D; wheel.addComponent(UITransform).setContentSize(760, 760); wheel.setPosition(0, 110); this.page.addChild(wheel);
    const graphics = wheel.addComponent(Graphics);
    for (let index = 0; index < 8; index += 1) { graphics.moveTo(0, 0); graphics.fillColor = index % 2 ? new Color(20, 69, 106) : new Color(64, 42, 117); graphics.arc(0, 0, 350, Math.PI * 2 * index / 8, Math.PI * 2 * (index + 1) / 8, false); graphics.close(); graphics.fill(); }
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
    this.paintBackdrop('profile', C.ink, new Color(38, 25, 83)); this.header('ACHIEVEMENTS', true);
    this.label(this.page, 'ALL   •   SPIN   •   WIN   •   FEATURE', 0, 650, 21, C.muted);
    ACHIEVEMENTS.forEach((achievement, index) => {
      const y = 455 - index * 290; const state = this.bootstrap.achievements.state(achievement.id);
      const ready = state.progress >= achievement.target && !state.claimed; const card = this.panel(this.page, 0, y, 900, 240, 28, C.panel2, ready ? C.gold : new Color(54, 75, 127), ready ? 3 : 1);
      this.addPremiumSymbol(card, GAME_CONFIGS[1], 'seal', -350, 4, 74, ready ? 'pulse' : 'none', ready ? 255 : 145, index * 0.08); this.label(card, achievement.title, -165, 32, 25, C.white, true, 420); this.label(card, `${state.progress} / ${achievement.target}`, -165, -2, 18, C.muted, false, 420); this.progress(card, -90, -42, 480, Math.min(1, state.progress / achievement.target));
      this.label(card, `+${this.format(achievement.reward)}`, 315, 32, 18, C.paleGold, true);
      this.button(card, state.claimed ? 'CLAIMED' : ready ? 'CLAIM' : 'LOCKED', 315, -35, 200, 60, () => { const ok = this.bootstrap.achievements.claim(achievement.id); this.toast(ok ? 'Achievement reward collected' : 'Achievement is not ready', ok ? C.green : C.muted); }, ready ? 'primary' : 'ghost');
    });
  }

  private showMail(): void {
    this.paintBackdrop('profile', C.ink, new Color(12, 42, 77)); this.header('INBOX', true);
    this.button(this.page, 'CLAIM ALL', 250, 650, 300, 62, () => { const amount = this.bootstrap.mail.claimAll(); this.toast(amount ? `Collected ${this.format(amount)} demo credits` : 'No attachments available', amount ? C.green : C.muted); }, 'secondary');
    DEMO_MAIL.forEach((mail, index) => {
      const state = this.bootstrap.mail.state(mail.id); if (state.deleted) return; const y = 420 - index * 310;
      const card = this.panel(this.page, 0, y, 900, 260, 28, state.read ? C.panel : new Color(18, 62, 94), state.read ? new Color(55, 79, 122) : C.cyan, state.read ? 1 : 3);
      if (mail.kind === 'reward') this.addPremiumSymbol(card, GAME_CONFIGS[3], 'bonus', -345, 18, 70, 'pulse', state.read ? 145 : 250); else this.label(card, '✉', -345, 18, 34, state.read ? C.muted : C.cyan); this.label(card, mail.title, -135, 42, 25, C.white, true, 480); this.label(card, mail.body, -110, 2, 18, C.muted, false, 540); if (mail.credits) this.label(card, `ATTACHMENT  +${this.format(mail.credits)} CREDITS`, -115, -48, 17, C.paleGold, true, 520);
      this.button(card, mail.credits ? (state.claimed ? 'CLAIMED' : 'CLAIM') : 'MARK READ', 315, -50, 210, 58, () => { this.bootstrap.mail.read(mail.id); const ok = mail.credits ? this.bootstrap.mail.claim(mail.id) : true; this.toast(ok ? 'Message updated' : 'Attachment already collected', ok ? C.green : C.muted); }, state.claimed ? 'ghost' : 'secondary');
    });
    this.button(this.page, 'DELETE READ', 0, -610, 320, 58, () => { this.bootstrap.mail.deleteRead(); this.showMail(); }, 'ghost');
  }

  private showSettings(): void {
    this.paintBackdrop('profile', C.ink, new Color(20, 36, 76)); this.header('SETTINGS', true); const player = this.ensurePlayer();
    const rows: readonly [string, string, () => void][] = [
      ['MUSIC', player.settings.music ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ music: !player.settings.music }); this.showSettings(); }],
      ['SOUND EFFECTS', player.settings.sound ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ sound: !player.settings.sound }); this.showSettings(); }],
      ['VIBRATION', player.settings.vibration ? 'ON' : 'OFF', () => { this.bootstrap.profile.updateSettings({ vibration: !player.settings.vibration }); this.showSettings(); }],
      ['QUALITY', player.settings.quality.toUpperCase(), () => { const next = player.settings.quality === 'low' ? 'medium' : player.settings.quality === 'medium' ? 'high' : 'low'; this.bootstrap.profile.updateSettings({ quality: next }); this.vfx.setQuality(next); this.showSettings(); }],
      ['LANGUAGE', player.settings.language === 'en' ? 'ENGLISH' : '简体中文', () => { this.bootstrap.profile.updateSettings({ language: player.settings.language === 'en' ? 'zh-CN' : 'en' }); this.showSettings(); }],
    ];
    rows.forEach(([name, value, action], index) => { const y = 520 - index * 180; const row = this.panel(this.page, 0, y, 880, 140, 24, C.panel2, new Color(53, 84, 132), 1); this.label(row, name, -270, 0, 25, C.white, true, 380); this.button(row, value, 290, 0, 220, 62, action, value === 'OFF' ? 'ghost' : 'secondary'); });
    this.panel(this.page, 0, -440, 880, 190, 24, new Color(61, 24, 51), C.red, 1); this.label(this.page, 'CLEAR LOCAL DATA', -190, -410, 24, C.white, true, 420); this.label(this.page, 'Requires typing RESET in the debug confirmation flow.', -90, -455, 18, C.muted, false, 620);
    this.button(this.page, 'RESET…', 315, -435, 210, 60, () => this.showResetConfirmation(), 'ghost');
  }

  private showGameLoading(): void {
    const color = this.themeColor(this.selectedGame.id); this.paintBackdrop(`game_${this.selectedGame.id}`, C.ink, color);
    this.addLoadingOrbit(this.page, 0, 300, C.cyan, 210);
    const heroIndex = GAME_CONFIGS.indexOf(this.selectedGame); this.addCharacter(this.page, heroIndex, 185, 330, 410, 520, 248, 0.08);
    this.addPremiumSymbol(this.page, this.selectedGame, CARD_HERO_SYMBOLS[heroIndex], -225, 300, 240, 'pulse', 255);
    this.addPremiumSymbol(this.page, this.selectedGame, this.selectedGame.wildId, -365, 245, 82, 'orbit', 155, 0.25);
    this.addPremiumSymbol(this.page, this.selectedGame, this.selectedGame.scatterId ?? this.selectedGame.bonusId ?? this.selectedGame.wildId, 385, 360, 76, 'orbit', 155, 0.55);
    this.label(this.page, this.selectedGame.name, 0, 125, 55, C.white, true); this.label(this.page, this.selectedGame.theme.toUpperCase(), 0, 55, 21, C.muted, false, 820);
    const bar = this.panel(this.page, 0, -300, 680, 22, 11, new Color(8, 25, 58), C.gold, 2); const fill = this.panel(bar, 0, 0, 656, 10, 5, C.cyan); fill.setScale(new Vec3(0.001, 1, 1));
    const progress = this.label(this.page, 'CALIBRATING REELS  0%', 0, -355, 20, C.muted, true);
    tween(fill).to(2.15, { scale: Vec3.ONE }, { easing: 'quadInOut', onUpdate: (_target, ratio = 0) => { progress.string = `${ratio < 0.42 ? 'PRELOADING SYMBOLS' : ratio < 0.8 ? 'CALIBRATING REELS' : 'OPENING STARWAY'}  ${Math.floor(ratio * 100)}%`; } }).delay(0.25).call(() => this.router.replace('game')).start();
    this.label(this.page, this.selectedGame.feature.replace(/-/g, ' ').toUpperCase(), 0, -245, 20, C.cyan, true);
  }

  private showGame(): void {
    this.ensurePlayer();
    const color = this.themeColor(this.selectedGame.id); this.paintBackdrop(`game_${this.selectedGame.id}`, C.ink, color); this.addStarField(this.page, 24);
    const heroIndex = GAME_CONFIGS.indexOf(this.selectedGame); this.addCharacter(this.page, heroIndex, heroIndex % 2 ? -355 : 355, 500, 380, 540, 76, 0.1);
    this.addPremiumSymbol(this.page, this.selectedGame, this.selectedGame.wildId, -435, 610, 250, 'orbit', 88, 0.2);
    this.addPremiumSymbol(this.page, this.selectedGame, this.selectedGame.scatterId ?? this.selectedGame.bonusId ?? this.selectedGame.wildId, 435, 565, 220, 'float', 78, 0.7);
    this.header(this.selectedGame.name, true);
    this.label(this.page, this.selectedGame.payMode === 'ways' ? '243 WAYS' : `${this.selectedGame.paylines.length} FIXED LINES`, 0, 680, 20, C.cyan, true);
    // The themed reel frame is added explicitly below. Disable the automatic
    // panel frame here so the metal rail is not rendered twice and pushed
    // visually into the reel window.
    // The reel node is the full ornamental/touch shell. Keep it transparent so
    // no rectangular fill can show through the frame's cut-out corners. The
    // visible dark surface is deliberately smaller than the outer decoration.
    const reelFrame = this.panel(this.page, 0, 160, 970, this.selectedGame.rows === 3 ? 650 : 650, 28, new Color(0, 0, 0, 0), undefined, 0, false);
    const reelInsets = this.visualSurfaceInsets(970, 650, heroIndex); const reelSurfaceWidth = 970 - reelInsets.left - reelInsets.right; const reelSurfaceHeight = 650 - reelInsets.top - reelInsets.bottom; const reelSurfaceX = (reelInsets.left - reelInsets.right) / 2; const reelSurfaceY = (reelInsets.bottom - reelInsets.top) / 2;
    this.reelEngine = reelFrame.addComponent(ReelEngine); this.reelEngine.configure(this.selectedGame, Math.min(920, reelSurfaceWidth - 12), Math.min(590, reelSurfaceHeight - 12)); const reelClip = reelFrame.getChildByName('ReelClip'); if (reelClip) reelClip.setPosition(reelSurfaceX, reelSurfaceY);
    const reelSurface = this.panel(reelFrame, reelSurfaceX, reelSurfaceY, reelSurfaceWidth, reelSurfaceHeight, 22, new Color(2, 8, 25, 252), undefined, 0, false); reelSurface.name = 'ReelBackgroundSurface'; reelSurface.setSiblingIndex(0);
    this.addPanelImageBorder(reelFrame, 970, 650, heroIndex, 232);
    this.addCardShine(reelFrame, 930, 590, C.cyan, 1.1); this.addCardMotes(reelFrame, 10, this.themeColor(this.selectedGame.id), 900, 560); this.addReelEnergy(reelFrame, color);
    this.winLabel = this.label(this.page, 'WIN  0', 0, -235, 32, C.paleGold, true);
    this.addPremiumSymbol(this.page, GAME_CONFIGS[3], 'bonus', -490, -285, 46, 'pulse', 240); this.balanceLabel = this.label(this.page, `CREDITS  ${this.format(this.bootstrap.economy.balance())}`, -280, -285, 22, C.white, true, 380);
    this.betLabel = this.label(this.page, `BET  ${this.format(this.bet())}`, 300, -285, 22, C.white, true, 330);
    this.button(this.page, '−', 200, -410, 100, 80, () => { this.betIndex = Math.max(0, this.betIndex - 1); this.refreshBet(); }, 'ghost');
    this.button(this.page, '+', 405, -410, 100, 80, () => { this.betIndex = Math.min(this.selectedGame.bets.length - 1, this.betIndex + 1); this.refreshBet(); }, 'ghost');
    const spin = this.button(this.page, 'SPIN', 0, -480, 232, 232, () => void this.onSpin(), 'spin'); this.spinButtonLabel = spin.getChildByName('Text')?.getComponent(Label) ?? undefined;
    this.button(this.page, `TURBO\n${this.turbo ? 'ON' : 'OFF'}`, -375, -485, 190, 110, () => { this.turbo = !this.turbo; this.showGame(); }, this.turbo ? 'secondary' : 'ghost');
    this.button(this.page, 'AUTO\n10', 375, -485, 190, 110, () => void this.startAuto(), 'ghost');
    this.button(this.page, 'PAYTABLE', -360, -630, 220, 58, () => this.showPaytable(), 'link');
    this.button(this.page, 'RULES', 360, -630, 180, 58, () => this.toast(`${this.selectedGame.name}: ${this.selectedGame.feature.replace(/-/g, ' ')}`, C.cyan), 'link');
    if (this.selectedGame.id === 'neon-classic') this.label(this.page, 'HOLD 1      HOLD 2      HOLD 3      NUDGE READY', 0, 525, 18, C.violet, true);
    if (this.forcedResult && !this.spinning) this.scheduleOnce(() => void this.onSpin(), 0.3);
  }

  private async onSpin(): Promise<boolean> {
    if (this.spinning) { this.reelEngine?.quickStop(); return true; }
    const rng = this.rngByGame.get(this.selectedGame.id) as SecureRNG;
    const result = this.resultGenerator.generate(this.selectedGame, this.bet(), rng, this.forcedResult); this.forcedResult = undefined;
    if (!this.bootstrap.economy.reserveSpin(result.spinId, this.bet())) { this.toast('Not enough demo credits or spin already active', C.red); return false; }
    this.spinning = result; this.stateMachine.reset(); this.stateMachine.move('reserving-bet'); this.stateMachine.move('result-ready'); this.stateMachine.move('spinning');
    if (this.spinButtonLabel) this.spinButtonLabel.string = 'STOP'; if (this.winLabel) this.winLabel.string = 'GOOD LUCK'; this.vfx.spinCharge(new Vec3(0, -480, 0), this.themeColor(this.selectedGame.id)); this.refreshBalance();
    this.audio.play('spin'); this.audio.vibrate(22);
    await this.reelEngine?.spin(result, this.selectedGame, this.turbo);
    this.stateMachine.move('stopping'); this.stateMachine.move('evaluating');
    this.bootstrap.economy.settleSpin(result.spinId, result.totalWin); this.bootstrap.achievements.add('spin', 1); if (result.totalWin) this.bootstrap.achievements.add('win', result.totalWin); if (result.feature) this.bootstrap.achievements.add('feature', 1);
    this.audio.play('reel-stop'); if (result.totalWin > 0) { this.audio.play('win'); this.audio.vibrate([30, 35, 45]); if (this.winLabel) this.winLabel.string = `WIN  ${this.format(result.totalWin)}`; this.vfx.pulse(this.winLabel?.node as Node); if (this.reelEngine) { this.vfx.pulse(this.reelEngine.node); this.reelEngine.presentWins(result, this.selectedGame); } this.vfx.celebrateWin(new Vec3(0, 140, 0), this.themeColor(this.selectedGame.id)); this.vfx.flyCredits(new Vec3(0, 120, 0), new Vec3(-300, -285, 0)); this.presentWinSplash(result); this.stateMachine.move('presenting-win'); }
    if (result.feature) { if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win') this.stateMachine.move('feature'); this.presentFeature(result); }
    if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win' || this.stateMachine.state === 'feature') this.stateMachine.move('settled'); this.stateMachine.move('idle');
    this.spinning = undefined; if (this.spinButtonLabel) this.spinButtonLabel.string = 'SPIN'; this.refreshBalance(); return true;
  }

  private presentFeature(result: SpinResult): void {
    if (result.feature?.type === 'hold-and-spin') {
      const feature = result.featureResult; this.rewardModal('HOLD & SPIN COMPLETE', `${feature?.detail.toUpperCase() ?? 'RESPINS RESOLVED'}\n${feature?.jackpot?.toUpperCase() ?? 'ENERGY COINS'}\n+${this.format(feature?.totalCredits ?? 0)} CREDITS`, C.cyan);
    } else if (result.feature?.type === 'nudge') this.rewardModal('NEON NUDGE', `${result.featureResult?.detail.toUpperCase() ?? 'REEL NUDGED'}\nWIN EVALUATED AND SETTLED`, C.violet);
    else this.rewardModal('FREE SPINS COMPLETE', `${result.featureResult?.rounds.length ?? 0} SPINS RESOLVED\n${(result.feature?.multiplier ?? 1)}× FEATURE MULTIPLIER\n+${this.format(result.featureResult?.totalCredits ?? 0)} CREDITS`, C.violet);
  }

  private presentWinSplash(result: SpinResult): void {
    const ratio = result.totalWin / Math.max(1, this.bet()); const title = ratio >= 50 ? 'EPIC WIN' : ratio >= 20 ? 'MEGA WIN' : ratio >= 8 ? 'BIG WIN' : ratio >= 2 ? 'GREAT WIN' : 'NICE WIN'; const color = this.themeColor(this.selectedGame.id);
    const card = this.panel(this.overlay, 0, 105, 820, 250, 36, new Color(4, 18, 49, 246), C.gold, 4); card.name = 'WinSplash'; const opacity = card.addComponent(UIOpacity); opacity.opacity = 0; card.setScale(new Vec3(0.62, 0.62, 1));
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
    const player = this.ensurePlayer(); const bar = this.panel(this.page, 0, this.topY(790), 1000, 130, 30, new Color(6, 23, 58, 250), new Color(49, 84, 132), 1);
    this.avatar(bar, -390, 0, player.avatar, 68); this.label(bar, title === 'HOME' ? player.nickname : title, -255, 12, 22, C.white, true, 270); this.label(bar, player.isGuest ? 'GUEST MODE • PLAY ONLY' : title === 'HOME' ? `LEVEL ${player.level}` : 'CELESTIAL PARK', -255, -16, 14, player.isGuest ? C.paleGold : C.cyan, false, 270);
    this.addPremiumSymbol(bar, GAME_CONFIGS[3], 'bonus', 110, 6, 42, 'pulse', 255); this.balanceLabel = this.label(bar, this.format(player.credits), 260, 10, 23, C.paleGold, true, 180);
    this.label(bar, player.isGuest ? 'PLAY CREDITS' : 'DEMO CREDITS', 260, -18, 13, C.muted, false, 180); this.button(bar, '+', 435, 0, 58, 58, () => this.router.go('store'), player.isGuest ? 'ghost' : 'secondary');
    if (title === 'HOME') { this.button(bar, `MAIL  ${this.bootstrap.redDots.mail()}`, 35, 0, 120, 58, () => this.router.go('mail'), 'ghost'); }
  }

  private header(title: string, back: boolean, showBalance = false): void {
    const bar = this.panel(this.page, 0, this.topY(800), 1020, 120, 26, new Color(5, 19, 49, 250), new Color(48, 78, 123), 1);
    if (back) this.button(bar, '‹', -450, 0, 72, 72, () => this.router.route === 'game' ? this.router.reset('home') : this.router.back('home'), 'ghost'); this.label(bar, title, 0, 0, 30, C.paleGold, true, 650);
    if (showBalance) { this.addPremiumSymbol(bar, GAME_CONFIGS[3], 'bonus', 275, 0, 42, 'pulse', 230); this.balanceLabel = this.label(bar, this.format(this.bootstrap.economy.balance()), 380, 0, 21, C.white, true, 190); }
  }

  private bottomNav(active: 'home' | 'store' | 'rewards' | 'rank' | 'profile'): void {
    const bar = this.panel(this.navigation, 0, -SafeAreaAdapter.visibleHeight / 2 + NAV_H / 2 + SafeAreaAdapter.safeBottom, SafeAreaAdapter.visibleWidth, NAV_H, 0, new Color(4, 17, 47, 255), C.gold, 2);
    const items: readonly [typeof active, string, Route][] = [['home', 'HOME', 'home'], ['store', 'STORE', 'store'], ['rewards', 'REWARDS', 'rewards'], ['rank', 'RANK', 'rank'], ['profile', 'PROFILE', 'profile']];
    const art: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'scatter'], [GAME_CONFIGS[3], 'bonus'], [GAME_CONFIGS[1], 'seal'], [GAME_CONFIGS[0], 'crown'], [GAME_CONFIGS[3], 'helmet']];
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

  private paintBackdrop(asset: string, bottom: Color, top: Color): void {
    const width = SafeAreaAdapter.visibleWidth; const height = SafeAreaAdapter.visibleHeight;
    const base = new Node('Backdrop'); base.layer = Layers.Enum.UI_2D; base.addComponent(UITransform).setContentSize(width, height); this.background.addChild(base); const graphics = base.addComponent(Graphics);
    const bands = 24; for (let index = 0; index < bands; index += 1) { const ratio = index / (bands - 1); graphics.fillColor = new Color(Math.round(bottom.r + (top.r - bottom.r) * ratio), Math.round(bottom.g + (top.g - bottom.g) * ratio), Math.round(bottom.b + (top.b - bottom.b) * ratio), 255); graphics.rect(-width / 2, -height / 2 + index * height / bands, width, height / bands + 2); graphics.fill(); }
    this.loadBackdrop(base, asset, width, height); this.addAmbientLights(base, top, width, height);
  }

  private loadBackdrop(parent: Node, asset: string, width: number, height: number): void {
    const paths: Record<string, string> = { boot: 'generated/common/start_bg_v01', login: 'generated/login/login_bg_v01', home: 'generated/home/home_bg_v01', store: 'generated/common/common_bg_v01', rewards: 'generated/common/common_bg_v01', rank: 'generated/common/common_bg_v01', profile: 'generated/common/common_bg_v01', wheel: 'generated/common/common_bg_v01' };
    const gamePaths: Record<string, string> = { 'game_astral-vault': 'generated/game01/base_bg_v01', 'game_golden-dynasty': 'generated/game02/base_bg_v01', 'game_neon-classic': 'generated/game03/base_bg_v01', 'game_cosmic-coins': 'generated/game04/base_bg_v01' };
    const path = paths[asset] ?? gamePaths[asset]; if (!path) return;
    resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (error || !texture || !parent.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const node = new Node('GeneratedBackdrop'); node.layer = Layers.Enum.UI_2D; const sprite = node.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const transform = node.getComponent(UITransform) as UITransform; const scale = Math.max(width / texture.width, height / texture.height) * 1.035; node.setScale(new Vec3(scale, scale, 1)); parent.addChild(node); node.setSiblingIndex(0); transform.setContentSize(texture.width, texture.height); const opacity = node.addComponent(UIOpacity); opacity.opacity = 178; tween(node).to(7, { position: new Vec3(16, 10, 0), scale: new Vec3(scale * 1.025, scale * 1.025, 1) }, { easing: 'sineInOut' }).to(7, { position: new Vec3(-16, -10, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(3.8, { opacity: 198 }, { easing: 'sineInOut' }).to(4.2, { opacity: 172 }, { easing: 'sineInOut' }).union().repeatForever().start(); });
  }

  private addStarField(parent: Node, count: number): void {
    for (let index = 0; index < count; index += 1) { const x = ((index * 317) % 1030) - 515; const y = ((index * 619) % 1800) - 900; const radius = 1 + (index % 3); const node = new Node(`Star-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(x, y); parent.addChild(node); const g = node.addComponent(Graphics); g.fillColor = index % 7 === 0 ? C.gold : new Color(150, 210, 255, 170); g.circle(0, 0, radius); g.fill(); if (index % 8 === 0) tween(node).to(1.2 + index % 5 * 0.2, { scale: new Vec3(1.8, 1.8, 1) }).to(1.4, { scale: Vec3.ONE }).union().repeatForever().start(); }
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
    const paths = ['generated/game01/base_bg_v01', 'generated/game02/base_bg_v01', 'generated/game03/base_bg_v01', 'generated/game04/base_bg_v01'];
    paths.forEach((path, index) => resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node(`BannerWorld-${index}`); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW;
      const scale = Math.max(width / texture.width, height / texture.height) * 1.13; image.setScale(new Vec3(scale, scale, 1)); image.setPosition((index % 2 ? -1 : 1) * 28, -texture.height * scale * 0.09); const opacity = image.addComponent(UIOpacity); opacity.opacity = index === 0 ? 210 : 0;
      const cycle = paths.length * 4.2; tween(opacity).delay(index * 4.2).to(0.75, { opacity: 215 }).delay(2.7).to(0.75, { opacity: 0 }).delay(Math.max(0, cycle - index * 4.2 - 4.2)).union().repeatForever().start(); tween(image).by(6.5, { position: new Vec3(index % 2 ? 24 : -24, 14, 0), scale: new Vec3(scale * 0.025, scale * 0.025, 0) }, { easing: 'sineInOut' }).by(6.5, { position: new Vec3(index % 2 ? -24 : 24, -14, 0), scale: new Vec3(-scale * 0.025, -scale * 0.025, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
    }));
    const shade = new Node('BannerShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); const graphics = shade.addComponent(Graphics); graphics.fillColor = new Color(2, 8, 27, 152); graphics.rect(-width / 2, -height / 2, width, height); graphics.fill();
  }

  private addGameCardArt(parent: Node, index: number, width: number, height: number): Node {
    const paths = ['generated/game01/base_bg_v01', 'generated/game02/base_bg_v01', 'generated/game03/base_bg_v01', 'generated/game04/base_bg_v01']; const clip = new Node('GameCardArt'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height);
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
    const shade = new Node('GameCardShade'); shade.layer = Layers.Enum.UI_2D; shade.addComponent(UITransform).setContentSize(width, height); clip.addChild(shade); const shadeGraphics = shade.addComponent(Graphics); shadeGraphics.fillColor = new Color(2, 7, 24, 132); shadeGraphics.rect(-width / 2, -height / 2, width, height); shadeGraphics.fill();
    resources.load(`${paths[index]}/texture`, Texture2D, (error, texture) => { if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('CardWorldImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); image.setSiblingIndex(0); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(width / texture.width, height / texture.height) * 1.08; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(0, -38); const opacity = image.addComponent(UIOpacity); opacity.opacity = 218; tween(image).to(5 + index * 0.7, { position: new Vec3(index % 2 ? -22 : 22, -18, 0), scale: new Vec3(scale * 1.055, scale * 1.055, 1) }, { easing: 'sineInOut' }).to(5 + index * 0.7, { position: new Vec3(0, -38, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(2.6, { opacity: 245 }).to(3.1, { opacity: 210 }).union().repeatForever().start(); });
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
    const primary = style === 'primary' || style === 'spin'; const palette = primary ? [new Color(175, 112, 26), C.paleGold, C.ink] : style === 'secondary' ? [new Color(16, 69, 105), C.cyan, C.white] : style === 'nav-active' ? [new Color(0, 0, 0, 0), C.gold, C.paleGold] : style === 'link' || style === 'nav' ? [new Color(0, 0, 0, 0), new Color(0, 0, 0, 0), style === 'nav' ? C.muted : C.cyan] : [new Color(7, 27, 61), new Color(74, 104, 151), C.white];
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
    if (copy.includes('ENTER THE PARK') || copy.includes('CREATE PROFILE') || copy.includes('CHECK LOCAL PROFILE')) return [GAME_CONFIGS[1], 'key'];
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
    const shellWidth = 650; const shellHeight = 88; const shell = this.panel(parent, x, y, shellWidth, shellHeight, 18, new Color(3, 15, 42), new Color(58, 94, 145), 2);
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
    const colors = [C.cyan, C.gold, C.violet, C.green]; const slot = index % GAME_CONFIGS.length; const node = this.panel(parent, x, y, size, size, size / 2, new Color(13, 43, 82), colors[index % colors.length], 4); const clip = new Node('AvatarCharacterClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(size - 8, size - 8); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; node.addChild(clip); this.addCharacter(clip, slot, 0, -size * 0.08, size * 0.92, size * 1.12, 255, slot * 0.12); return node;
  }

  private progress(parent: Node, x: number, y: number, width: number, ratio: number): void {
    const bar = this.panel(parent, x, y, width, 22, 11, new Color(2, 14, 38), new Color(50, 78, 122), 1); const fill = this.panel(bar, -width / 2 + width * ratio / 2, 0, Math.max(4, width * ratio), 12, 6, C.cyan); fill.name = 'ProgressFill';
  }

  private modal(width: number, height: number): Node {
    const mask = this.panel(this.overlay, 0, 0, SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight, 0, new Color(0, 4, 18, 205)); const card = this.panel(mask, 0, 0, Math.min(width, SafeAreaAdapter.visibleWidth - 100), Math.min(height, SafeAreaAdapter.visibleHeight - 160), 38, C.panel, C.gold, 3); card.setScale(new Vec3(0.85, 0.85, 1)); tween(card).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); return card;
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
    const box = this.panel(this.toastLayer, 0, -700, 820, 90, 28, new Color(5, 22, 52, 250), color, 2); this.label(box, message, 0, 0, 21, C.white, true, 760); box.setScale(new Vec3(0.9, 0.9, 1)); tween(box).to(0.18, { position: new Vec3(0, -620, 0), scale: Vec3.ONE }, { easing: 'backOut' }).delay(2).to(0.25, { position: new Vec3(0, -700, 0), scale: new Vec3(0.9, 0.9, 1) }).call(() => box.destroy()).start();
  }

  private refreshBalance(): void { if (this.balanceLabel) this.balanceLabel.string = this.router.route === 'game' ? `CREDITS  ${this.format(this.bootstrap.economy.balance())}` : this.format(this.bootstrap.economy.balance()); }
  private refreshBet(): void { if (this.betLabel) this.betLabel.string = `BET  ${this.format(this.bet())}`; }
  private bet(): number { return this.selectedGame.bets[Math.min(this.betIndex, this.selectedGame.bets.length - 1)]; }
  private ensurePlayer() { return this.bootstrap.profile.current()!; }
  private format(value: number): string { return Math.round(value).toLocaleString('en-US'); }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private applyPlayerPreferences(): void { const settings = this.bootstrap.profile.current()?.settings; if (!settings) return; this.audio?.setMusic(settings.music); this.audio?.setEffects(settings.sound); this.audio?.setVibration(settings.vibration); this.vfx?.setQuality(settings.quality); }
  private localize(text: string): string { return this.bootstrap.profile.current()?.settings.language === 'zh-CN' ? ZH[text] ?? text : text; }
  private themeColor(id: GameId): Color { return id === 'astral-vault' ? new Color(53, 38, 113) : id === 'golden-dynasty' ? new Color(102, 58, 17) : id === 'neon-classic' ? new Color(96, 14, 116) : new Color(9, 80, 105); }
  private selectQueryGame(query: URLSearchParams): void { const id = query.get('game') as GameId | null; if (id && GAME_CONFIG_BY_ID[id]) this.selectedGame = GAME_CONFIG_BY_ID[id]; }
  private forceFromQuery(force: string | null): ForceResult | undefined { if (force === 'win') return { symbolId: this.selectedGame.symbols.find((s) => s.tier === 'high')?.id, count: 5, wild: true }; if (force === 'free') return { scatterCount: 5 }; if (force === 'hold') return { holdAndSpin: true }; if (force === 'big' || force === 'mega' || force === 'epic') return { winTier: force }; return undefined; }
}

function okStyle(ok: boolean): string { return ok ? 'secondary' : 'ghost'; }
