import {
  _decorator, BlockInputEvents, Button, Color, Component, EditBox, Graphics, Label, Layers, Mask, Node, profiler, resources, sys,
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
import { GameTitleAtlasCache } from './GameTitleAtlasCache';
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
  readonly topWinX: number; readonly topWinY: number; readonly topWinSurface: 'light' | 'dark'; readonly topWinHeight: number;
  readonly topWinTitleTone: Color; readonly topWinGlowTone: Color; readonly topWinValueTone: Color;
  readonly creditsX: number; readonly creditsY: number; readonly creditsWidth: number; readonly creditsHeight: number; readonly creditsSurface: 'light' | 'dark';
  readonly winX: number; readonly winY: number; readonly winWidth: number; readonly winHeight: number; readonly splitWin: boolean;
  readonly betX: number; readonly betY: number; readonly betWidth: number; readonly betHeight: number; readonly betTone: Color;
};
type MachineMaterialPalette = {
  readonly meterFill: Color; readonly meterInner: Color; readonly edge: Color; readonly highlight: Color;
  readonly label: Color; readonly value: Color; readonly outline: Color;
  readonly buttonPlaqueFill: Color; readonly buttonPlaqueStroke: Color;
};
const CARD_HERO_SYMBOLS = ['luggage-cart', 'fortune-cake', 'champagne-vault', 'lift-vault'] as const;
const CHARACTER_PATHS = [
  'art/festival-concierge', 'art/festival-concierge',
  'art/festival-concierge', 'art/festival-concierge',
] as const;
const AVATAR_SYMBOLS: readonly [GameId, string][] = [
  ['bellhop-bonanza', 'bellhop-cap'], ['bellhop-bonanza', 'luggage-cart'], ['bellhop-bonanza', 'bellhop-wild'],
  ['tea-vault-tumble', 'tea-trolley'], ['tea-vault-tumble', 'fortune-cake'], ['tea-vault-tumble', 'tea-wild'],
  ['ballroom-keyways', 'crystal-chandelier'], ['ballroom-keyways', 'champagne-vault'], ['ballroom-keyways', 'ballroom-wild'],
  ['penthouse-fortune-lift', 'treasure-case'], ['penthouse-fortune-lift', 'lift-vault'], ['penthouse-fortune-lift', 'penthouse-wild'],
] as const;
const BRAND_EMBLEM_PATH = 'generated/common/golden_harvest_emblem';
const LOGIN_SCENE_PATH = 'art/lantern-district-login';
const LOBBY_SCENE_PATH = 'art/lantern-district-lobby';
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
  'bellhop-bonanza': {
    reelX: 0, reelY: 147.5, reelWidth: 765, reelHeight: 450,
    titleY: 600, titleWidth: 620, titleSize: 44, paylineY: 350, darkMarquee: false,
    jackpotY: 612, jackpotWidth: 510, featureY: -646, featureWidth: 610,
    readoutY: -44, readoutX: 0, readoutWidth: 330, readoutHeight: 58, readoutFontSize: 20,
    turbo: { x: 424, y: 620, width: 100, height: 90 }, spin: { x: 110, y: -360, width: 240, height: 150 }, auto: { x: 394, y: -359, width: 108, height: 82 },
    minus: { x: -370, y: -359, width: 108, height: 82 }, plus: { x: -202, y: -359, width: 108, height: 82 },
    sound: { x: 424, y: 814, width: 78, height: 78 }, rules: { x: 424, y: 720, width: 78, height: 78 }, home: { x: -424, y: 814, width: 78, height: 78 },
  },
  'tea-vault-tumble': {
    reelX: 0.625, reelY: 60, reelWidth: 653.75, reelHeight: 387.5,
    titleY: 490, titleWidth: 650, titleSize: 43, paylineY: 235, darkMarquee: false,
    jackpotY: 624, jackpotWidth: 520, featureY: -632, featureWidth: 610,
    readoutY: -60, readoutX: 0, readoutWidth: 332, readoutHeight: 58, readoutFontSize: 20,
    turbo: { x: 428, y: 622, width: 100, height: 90 }, spin: { x: 0, y: -323, width: 205, height: 130 }, auto: { x: 276, y: -344, width: 156, height: 90 },
    minus: { x: -320, y: -340, width: 96, height: 78 }, plus: { x: -220, y: -340, width: 96, height: 78 },
    sound: { x: 428, y: 816, width: 78, height: 78 }, rules: { x: 428, y: 722, width: 78, height: 78 }, home: { x: -428, y: 816, width: 78, height: 78 },
  },
  'ballroom-keyways': {
    reelX: 0, reelY: 33.125, reelWidth: 687.5, reelHeight: 353.75,
    titleY: 520, titleWidth: 640, titleSize: 43, paylineY: 190, darkMarquee: false,
    jackpotY: 518, jackpotWidth: 500, featureY: -650, featureWidth: 650,
    readoutY: -20, readoutX: 0, readoutWidth: 326, readoutHeight: 58, readoutFontSize: 20,
    turbo: { x: 404, y: 616, width: 100, height: 90 }, spin: { x: 32, y: -355, width: 205, height: 124 }, auto: { x: 277, y: -356, width: 120, height: 82 },
    minus: { x: -292, y: -355, width: 95, height: 82 }, plus: { x: -181, y: -355, width: 95, height: 82 },
    sound: { x: 404, y: 806, width: 76, height: 76 }, rules: { x: 404, y: 716, width: 76, height: 76 }, home: { x: -404, y: 806, width: 76, height: 76 },
  },
  'penthouse-fortune-lift': {
    reelX: -1.25, reelY: 100, reelWidth: 662.5, reelHeight: 372.5,
    titleY: 530, titleWidth: 700, titleSize: 43, paylineY: 265, darkMarquee: false,
    jackpotY: 438, jackpotWidth: 500, featureY: -736, featureWidth: 560,
    readoutY: -34, readoutX: 0, readoutWidth: 312, readoutHeight: 58, readoutFontSize: 20,
    turbo: { x: -172, y: -330, width: 90, height: 72 }, spin: { x: 0, y: -328, width: 186, height: 120 }, auto: { x: 328, y: -330, width: 120, height: 82 },
    minus: { x: -302, y: -330, width: 96, height: 76 }, plus: { x: 169, y: -330, width: 90, height: 72 },
    sound: { x: 430, y: 790, width: 78, height: 78 }, rules: { x: 430, y: 696, width: 78, height: 78 }, home: { x: -430, y: 790, width: 78, height: 78 },
  },
};
const CABINET_READOUT_MATERIALS: Readonly<Record<GameId, CabinetReadoutLayout>> = {
  // S05/S06 establish the cabinet grammar: the shared balance belongs in the
  // illuminated rail above the reels, TOP WIN sits directly under the logo,
  // while WIN and BET retain their own lower readouts. Each machine keeps an
  // independently measured baseline because the generated metalwork differs.
  'bellhop-bonanza': { topWinX: 0, topWinY: 648, topWinSurface: 'dark', topWinHeight: 44, topWinTitleTone: new Color(255, 221, 124), topWinGlowTone: new Color(255, 161, 106), topWinValueTone: new Color(255, 249, 221), creditsX: 1, creditsY: 597, creditsWidth: 500, creditsHeight: 36, creditsSurface: 'dark', winX: 0, winY: -122, winWidth: 270, winHeight: 36, splitWin: false, betX: 0, betY: -304, betWidth: 250, betHeight: 52, betTone: new Color(144, 73, 44) },
  'tea-vault-tumble': { topWinX: 4, topWinY: 654, topWinSurface: 'dark', topWinHeight: 44, topWinTitleTone: new Color(162, 247, 196), topWinGlowTone: new Color(73, 180, 128), topWinValueTone: new Color(255, 245, 188), creditsX: 4, creditsY: 608, creditsWidth: 510, creditsHeight: 40, creditsSurface: 'dark', winX: 4, winY: -123, winWidth: 282, winHeight: 36, splitWin: false, betX: 0, betY: -304, betWidth: 240, betHeight: 52, betTone: new Color(43, 124, 86) },
  'ballroom-keyways': { topWinX: 1, topWinY: 598, topWinSurface: 'dark', topWinHeight: 36, topWinTitleTone: new Color(255, 192, 136), topWinGlowTone: new Color(224, 92, 74), topWinValueTone: new Color(255, 247, 209), creditsX: 1, creditsY: 557, creditsWidth: 470, creditsHeight: 36, creditsSurface: 'dark', winX: 0, winY: -89, winWidth: 272, winHeight: 44, splitWin: false, betX: 0, betY: -292, betWidth: 235, betHeight: 52, betTone: new Color(119, 48, 52) },
  'penthouse-fortune-lift': { topWinX: 0, topWinY: 499, topWinSurface: 'dark', topWinHeight: 34, topWinTitleTone: new Color(191, 241, 249), topWinGlowTone: new Color(245, 180, 74), topWinValueTone: new Color(255, 247, 218), creditsX: 0, creditsY: 456, creditsWidth: 460, creditsHeight: 34, creditsSurface: 'dark', winX: 0, winY: -158, winWidth: 230, winHeight: 30, splitWin: false, betX: 0, betY: -314, betWidth: 230, betHeight: 50, betTone: new Color(48, 112, 122) },
};
// F12 readouts sit on the photographed rails, not on the reel surface.
const CABINET_READOUT_LAYOUTS: Readonly<Record<GameId, CabinetReadoutLayout>> = {
  'bellhop-bonanza': { ...CABINET_READOUT_MATERIALS['bellhop-bonanza'], topWinY: 540, creditsY: 450, creditsWidth: 580, creditsHeight: 60, winY: -168, winHeight: 54, betX: -264, betY: -448, betWidth: 230 },
  'tea-vault-tumble': { ...CABINET_READOUT_MATERIALS['tea-vault-tumble'], topWinY: 410, creditsY: 310, creditsWidth: 390, creditsHeight: 56, winY: -187, winHeight: 54, betX: -270, betY: -418, betWidth: 210 },
  'ballroom-keyways': { ...CABINET_READOUT_MATERIALS['ballroom-keyways'], topWinY: 420, creditsY: 285, creditsWidth: 320, creditsHeight: 56, winY: -217, winHeight: 54, betX: -240, betY: -434, betWidth: 210 },
  'penthouse-fortune-lift': { ...CABINET_READOUT_MATERIALS['penthouse-fortune-lift'], topWinY: 450, creditsY: 332, creditsWidth: 360, creditsHeight: 52, winY: -172, winHeight: 54, betX: 0, betY: -418, betWidth: 230 },
};
const MACHINE_MATERIALS: Readonly<Record<GameId, MachineMaterialPalette>> = {
  'bellhop-bonanza': {
    meterFill: new Color(68, 17, 24, 244), meterInner: new Color(112, 37, 34, 224), edge: new Color(181, 111, 49, 252), highlight: new Color(255, 225, 146, 238),
    label: new Color(255, 213, 121), value: new Color(255, 248, 218), outline: new Color(37, 6, 12, 255), buttonPlaqueFill: new Color(73, 15, 23, 246), buttonPlaqueStroke: new Color(226, 174, 86, 242),
  },
  'tea-vault-tumble': {
    meterFill: new Color(19, 65, 54, 244), meterInner: new Color(49, 113, 84, 218), edge: new Color(168, 129, 68, 252), highlight: new Color(234, 239, 190, 236),
    label: new Color(174, 244, 199), value: new Color(255, 247, 211), outline: new Color(8, 38, 31, 255), buttonPlaqueFill: new Color(20, 72, 57, 246), buttonPlaqueStroke: new Color(202, 168, 93, 242),
  },
  'ballroom-keyways': {
    meterFill: new Color(14, 35, 65, 246), meterInner: new Color(31, 66, 102, 220), edge: new Color(198, 150, 82, 252), highlight: new Color(247, 222, 157, 238),
    label: new Color(255, 195, 139), value: new Color(255, 247, 216), outline: new Color(5, 16, 34, 255), buttonPlaqueFill: new Color(16, 39, 72, 246), buttonPlaqueStroke: new Color(222, 179, 101, 242),
  },
  'penthouse-fortune-lift': {
    meterFill: new Color(20, 72, 73, 244), meterInner: new Color(43, 105, 103, 218), edge: new Color(205, 145, 116, 252), highlight: new Color(247, 221, 193, 236),
    label: new Color(199, 242, 241), value: new Color(255, 246, 220), outline: new Color(11, 43, 44, 255), buttonPlaqueFill: new Color(22, 72, 73, 246), buttonPlaqueStroke: new Color(225, 163, 125, 242),
  },
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
  'ACCOUNT SIGN IN': '账号登录', 'ENTER THE SALON': '进入游戏', 'FORGOT PASSWORD': '忘记密码', 'CONTINUE AS GUEST': '游客登录',
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

@ccclass('AureliaApp')
export class AureliaApp extends Component {
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
  private rankError = '';
  private readonly purchaseLocks = new Set<string>();
  private spinRequestPending = false;
  private routeTransitionGeneration = 0;
  private routeTransitionVeil?: Node;
  private renderedRoute?: Route;

  protected start(): void {
    this.node.layer = Layers.Enum.UI_2D;
    this.node.addComponent(SafeAreaAdapter);
    this.node.on('csw-layout-changed', this.onLayoutChanged, this);
    this.audio = this.node.addComponent(AudioManager);
    this.vfx = this.node.addComponent(VFXManager);
    GAME_CONFIGS.forEach((config) => MachineControlAtlasCache.preload(config.id));
    ['nice', 'great', 'big', 'mega', 'epic'].forEach((tier) => resources.preload(`art/f12-${tier}-win-enamel/texture`, Texture2D));
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
    if (typeof window !== 'undefined') {
      const runtimeWindow = window as Window & { __AURELIA_APP_READY__?: boolean };
      runtimeWindow.__AURELIA_APP_READY__ = true;
      runtimeWindow.dispatchEvent(new CustomEvent('aurelia-app-ready'));
    }
  }

  protected onDestroy(): void { this.routeTransitionGeneration += 1; if (this.routeTransitionVeil?.isValid) this.routeTransitionVeil.destroy(); this.autoStartPending = false; this.autoSpin.cancel(); this.releaseSpinIdleWaiters(); this.node.off('csw-layout-changed', this.onLayoutChanged, this); }

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
    this.label(this.page, 'GOLDEN HARVEST', 0, 205, 67, C.paleGold, true);
    this.label(this.page, 'LANTERN DISTRICT', 0, 118, 58, C.white, true);
    this.label(this.page, 'FOUR WAYS TO CELEBRATE  •  ONE JOYFUL WORLD', 0, 30, 22, C.muted);
    this.animateLoadingProgress(this.page, -430, -385, 680, 1.7, () => 'OPENING THE TREASURE SALON', () => {
      if (generation !== this.loadingGeneration) return;
      if (!complianceCurrent(this.bootstrap.save.read().compliance)) { this.router.reset('age-gate'); return; }
      void this.bootstrap.resumeSession().then((resumed) => { if (generation !== this.loadingGeneration) return; this.router.reset(resumed ? 'home' : 'login'); });
    });
    this.label(this.page, 'VIRTUAL COINS HAVE NO CASH VALUE', 0, -770, 20, C.muted);
  }

  private render(route: Route): void {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const hasOutgoingScene = Boolean(this.page?.children.length || this.background?.children.length || this.navigation?.children.length);
    const routeChanged = this.renderedRoute !== route;
    this.routeTransitionGeneration += 1;
    if (this.routeTransitionVeil?.isValid) {
      Tween.stopAllByTarget(this.routeTransitionVeil);
      this.routeTransitionVeil.destroy();
    }
    this.routeTransitionVeil = undefined;
    // Keep a fully painted backdrop on screen at all times. The previous
    // transition faded an almost-opaque wine veil in before rebuilding the
    // destination, then also started the new backdrop at opacity zero. That
    // exposed the WebGL clear colour as a black frame on every navigation.
    this.renderNow(route, hasOutgoingScene && routeChanged && !reducedMotion);
  }

  private renderNow(route: Route, animateReveal = true): void {
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
    this.renderedRoute = route;
    this.playPageReveal(animateReveal);
  }

  private clearAll(): void {
    this.rankRequestGeneration += 1;
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

  private onLayoutChanged(): void { if (this.router && !this.spinning) { this.routeTransitionGeneration += 1; if (this.routeTransitionVeil?.isValid) this.routeTransitionVeil.destroy(); this.routeTransitionVeil = undefined; this.renderNow(this.router.route, false); } }

  private showAgeGate(): void {
    this.paintBackdrop('login', C.ink, new Color(192, 88, 50)); this.addStarField(this.page, 36); this.addLobbyIdleWealth();
    this.addBrandEmblem(this.page, 0, 650, 178); this.artTitle(this.page, 'WELCOME TO GOLDEN HARVEST', 0, 500, 47, C.gold, 860);
    const card = this.panel(this.page, 0, -50, 860, 980, 40, new Color(69, 24, 25, 244), C.gold, 3);
    this.addCardMotes(card, 22, C.paleGold, 800, 910); this.addPremiumSymbol(card, GAME_CONFIGS[0], 'luggage-cart', -330, 380, 80, 'pulse', 235); this.addPremiumSymbol(card, GAME_CONFIGS[2], 'champagne-vault', 330, 380, 80, 'pulse', 235, 0.2);
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
    this.addLobbyPageHero(LEGAL_PAGE_TITLES[kind], LEGAL_PAGE_SUBTITLES[kind], kind === 'privacy' ? C.cyan : C.gold, kind === 'support' ? GAME_CONFIGS[2] : GAME_CONFIGS[0], kind === 'support' ? 'champagne-vault' : 'coin-stack');
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
    // A single welcoming gate, with a wide readable sign-in surface below it.
    // No narrow desktop-style secondary column on a phone.
    const title = this.artTitle(this.page, 'GOLDEN HARVEST', 0, 648, 66, C.paleGold, 910);
    this.addLabelOutline(title, new Color(65, 19, 27), 7);
    const district = this.label(this.page, 'L A N T E R N   D I S T R I C T', 0, 578, 26, C.white, true, 860);
    this.addLabelOutline(district, C.outline, 4);
    const welcome = this.label(this.page, 'A warm welcome. A world of treasure.', 0, 503, 27, C.paleGold, true, 860);
    this.addLabelOutline(welcome, C.outline, 4);
    const desk = this.panel(this.page, 0, -115, 864, 1040, 42, new Color(45, 18, 22, 160), C.paleGold, 2, false);
    desk.name = 'LanternGateSignIn';
    this.addPhotographicMaterial(desk, LOGIN_SCENE_PATH, 850, 1026, 38, 230, new Color(45, 16, 24, 94), 0, -230, false);
    this.addLuxuryFolioFrame(desk, 864, 1040);
    const heading = this.label(desk, 'WELCOME BACK', 0, 421, 41, C.paleGold, true, 730); this.addLabelOutline(heading, C.outline, 4);
    this.label(desk, 'Sign in to keep your coins and progress together', 0, 366, 25, C.white, true, 748);
    this.userNameInput = this.input(desk, 'Player ID', '', 0, 254, false, 730);
    this.passwordInput = this.input(desk, 'Password', '', 0, 132, true, 730);
    let remember!: Node;
    remember = this.button(desk, this.rememberLogin ? 'REMEMBER: ON' : 'REMEMBER: OFF', -178, 39, 352, 78, () => {
      this.rememberLogin = !this.rememberLogin; const copy = remember.getChildByName('Text')?.getComponent(Label);
      if (copy) copy.string = this.rememberLogin ? 'REMEMBER: ON' : 'REMEMBER: OFF';
    }, 'ghost');
    this.button(desk, 'RESET PASSWORD', 211, 39, 306, 78, () => this.router.go('forgot'), 'link');
    this.button(desk, 'SIGN IN & ENTER', 0, -54, 730, 98, () => void this.login(), 'primary');
    const apple = this.button(desk, 'SIGN IN WITH APPLE', 0, -180, 730, 108, () => void this.signInWithApple(), 'apple'); apple.name = 'AppleSignInButton';
    this.button(desk, 'CREATE ACCOUNT', -193, -291, 344, 78, () => this.router.go('register'), 'secondary');
    this.button(desk, 'PLAY AS GUEST', 193, -291, 344, 78, () => void this.guestLogin(), 'ghost');
    const note = this.label(desk, 'Virtual coins only\nNo cash prizes or withdrawals', 0, -407, 32, C.white, true, 748); note.lineHeight = 42; this.addLabelOutline(note, C.outline, 3);
    this.addMaterialLightSweep(desk, 830, 980, C.paleGold, 1.2);
    const legalActions: readonly [string, number, LegalPage][] = [['TERMS', -285, 'terms'], ['PRIVACY', 0, 'privacy'], ['SUPPORT', 285, 'support']];
    legalActions.forEach(([text, x, route]) => this.button(this.page, text, x, -705, 258, 104, () => this.router.go(route), 'secondary'));
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
    this.label(card, 'GOLDEN HARVEST PROFILE', 0, 500, 28, C.paleGold, true);
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
    this.paintBackdrop('home', new Color(52, 31, 40), new Color(238, 174, 83));
    this.addLobbyIdleWealth(); this.topBar();
    const heading = this.artTitle(this.page, 'GOLDEN HARVEST', 0, 648, 60, C.paleGold, 910); this.addLabelOutline(heading, C.outline, 6);
    const copy = this.label(this.page, 'EXPLORE THE LANTERN DISTRICT', 0, 585, 25, C.white, true, 880); this.addLabelOutline(copy, C.outline, 4);
    const venues = ['GRANARY GOLD BANK', 'RIVER OF LANTERNS', 'JADE KOI TREASURY', 'FORTUNE DRUM'];
    const descriptions = ['GOLDEN REELS', 'LANTERN CASCADES', 'JADE TREASURES', 'FESTIVAL FORTUNES'];
    GAME_CONFIGS.forEach((config, index) => {
      const x = index % 2 ? 241 : -241; const y = index < 2 ? 270 : -221;
      const height = 464;
      const venue = new Node('DistrictVenue-' + config.id); venue.layer = Layers.Enum.UI_2D;
      venue.addComponent(UITransform).setContentSize(448, height); venue.setPosition(x, y); this.page.addChild(venue);
      const tones = [new Color(70, 30, 20), new Color(18, 66, 62), new Color(20, 65, 42), new Color(84, 24, 27)];
      this.panel(venue, 0, 0, 448, height, 22, tones[index], C.paleGold, 3, false);
      const cover = new Node('FramedGameCover'); cover.layer = Layers.Enum.UI_2D;
      cover.addComponent(UITransform).setContentSize(428, 280); cover.setPosition(0, 80); venue.addChild(cover);
      this.addGameCoverArt(cover, index, 428, 280, false);
      // The picture is the game cover; the separate name and entry rail below
      // it is never overlaid on the photograph or confused with lobby scenery.
      const name = this.label(venue, venues[index], 0, -88, 29, C.paleGold, true, 416); this.addLabelOutline(name, C.outline, 2);
      this.label(venue, descriptions[index], 0, -126, 21, C.white, true, 410);
      const enter = (): void => { this.selectedGame = config; this.router.go('game-loading'); };
      const play = this.button(venue, 'PLAY', 0, -182, 246, 70, enter, 'primary'); play.name = `EnterGame-${config.id}`;
      const coverButton = cover.addComponent(Button); coverButton.transition = Button.Transition.NONE;
      cover.on(Button.EventType.CLICK, enter, this);
      this.addPanelImageBorder(venue, 448, height, index, 240);
      this.addCardShine(cover, 416, 268, C.paleGold, 0.6 + index * 0.8);
    });
    this.button(this.page, 'DAILY REWARDS', -238, -574, 440, 86, () => this.router.go('rewards'), 'lobby-secondary');
    this.button(this.page, 'GOLDEN HONOURS', 238, -574, 440, 86, () => this.router.go('rank'), 'lobby-secondary');
    this.bottomNav('home');
  }

  private addHotelDestinationSpine(): void {
    // A working glass lift is the lobby's signature navigation object. It
    // connects four genuinely different venue silhouettes instead of drawing
    // a decorative zig-zag behind four interchangeable cards.
    const route = new Node('FortuneFloorLift'); route.layer = Layers.Enum.UI_2D; route.addComponent(UITransform).setContentSize(76, 788); route.setPosition(0, -36); this.page.addChild(route); const g = route.addComponent(Graphics);
    // Keep the lift as an architectural seam in the atrium, not a dark HUD
    // strip laid over the venue photography. The warm translucent glass lets
    // the lobby image continue through it while the brass rails still explain
    // how the four destinations are connected.
    g.fillColor = new Color(77, 42, 29, 74); g.roundRect(-27, -382, 54, 764, 20); g.fill(); g.strokeColor = new Color(151, 99, 50, 210); g.lineWidth = 6; g.roundRect(-27, -382, 54, 764, 20); g.stroke(); g.strokeColor = new Color(255, 235, 171, 174); g.lineWidth = 1.5; g.moveTo(-14, -350); g.lineTo(-14, 350); g.moveTo(14, -350); g.lineTo(14, 350); g.stroke();
    const floorY = [252, 80, -92, -264] as const;
    floorY.forEach((y, index) => { const tone = index % 2 ? new Color(83, 176, 142, 214) : new Color(221, 105, 70, 214); g.fillColor = new Color(48, 23, 23, 174); g.circle(0, y, 14); g.fill(); g.strokeColor = C.paleGold; g.lineWidth = 2; g.circle(0, y, 13); g.stroke(); g.fillColor = tone; g.circle(0, y, 5); g.fill(); });
    const car = new Node('FortuneLiftCar'); car.layer = Layers.Enum.UI_2D; car.addComponent(UITransform).setContentSize(42, 58); car.setPosition(0, floorY[0]); route.addChild(car); const carGraphics = car.addComponent(Graphics); carGraphics.fillColor = new Color(70, 27, 35, 224); carGraphics.roundRect(-21, -29, 42, 58, 14); carGraphics.fill(); carGraphics.strokeColor = new Color(255, 230, 151, 226); carGraphics.lineWidth = 2.5; carGraphics.roundRect(-18, -26, 36, 52, 11); carGraphics.stroke(); carGraphics.fillColor = new Color(164, 229, 211, 188); carGraphics.roundRect(-7, 13, 14, 4, 2); carGraphics.fill();
    tween(car).to(1.4, { position: new Vec3(0, floorY[1], 0) }, { easing: 'sineInOut' }).delay(1.1).to(1.4, { position: new Vec3(0, floorY[2], 0) }, { easing: 'sineInOut' }).delay(1.1).to(1.4, { position: new Vec3(0, floorY[3], 0) }, { easing: 'sineInOut' }).delay(1.1).to(2.2, { position: new Vec3(0, floorY[0], 0) }, { easing: 'sineInOut' }).delay(1.2).union().repeatForever().start();
  }

  private hotelDestinationPortal(config: GameConfig, index: number): void {
    const placements = [new Vec3(-247, 220), new Vec3(247, 220), new Vec3(-247, -176), new Vec3(247, -176)] as const;
    const names = ['BELLHOP BONANZA', 'TEA VAULT TUMBLE', 'BALLROOM KEYWAYS', 'PENTHOUSE FORTUNE LIFT'] as const;
    const modes = ['20 LINES • STACKED ARRIVALS', 'CLUSTER TUMBLE • TEA MULTIPLIER', '1024 WAYS • KEY MILESTONES', '512 TWO-WAY • FORTUNE LIFT'] as const;
    const accent = this.themeColor(config.id); const width = 448; const height = 348; const root = new Node(`FortuneVenue-${config.id}`); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(width, height); root.setPosition(placements[index]); this.page.addChild(root);
    const art = this.addGameCoverArt(root, index, width - 24, height - 24, false); art.name = `VenuePhotography-${config.id}`; art.setSiblingIndex(0);
    const frame = new Node('VenueArchitecture'); frame.layer = Layers.Enum.UI_2D; frame.addComponent(UITransform).setContentSize(width, height); root.addChild(frame); const g = frame.addComponent(Graphics);
    const dark = new Color(42, 13, 24, 146); const brass = new Color(132, 75, 39, 250); const glass = new Color(accent.r, accent.g, accent.b, 54);
    if (index === 0) {
      // Bellhop: a curved revolving-door canopy and luggage conveyor sill.
      g.fillColor = new Color(28, 10, 19, 116); g.roundRect(-218, -168, 436, 336, 82); g.fill(); g.strokeColor = brass; g.lineWidth = 11; g.roundRect(-218, -168, 436, 336, 82); g.stroke(); g.strokeColor = C.paleGold; g.lineWidth = 2.5; g.roundRect(-207, -157, 414, 314, 72); g.stroke(); g.strokeColor = new Color(255, 240, 188, 110); g.lineWidth = 2; g.moveTo(0, 154); g.lineTo(0, -70); g.moveTo(-196, -70); g.lineTo(196, -70); g.stroke();
    } else if (index === 1) {
      // Tea vault: a cut-glass conservatory window with stepped tea rails.
      g.fillColor = new Color(18, 47, 39, 94); g.moveTo(-192, -170); g.lineTo(192, -170); g.lineTo(220, -126); g.lineTo(220, 112); g.lineTo(180, 170); g.lineTo(-180, 170); g.lineTo(-220, 112); g.lineTo(-220, -126); g.close(); g.fill(); g.strokeColor = brass; g.lineWidth = 11; g.moveTo(-192, -170); g.lineTo(192, -170); g.lineTo(220, -126); g.lineTo(220, 112); g.lineTo(180, 170); g.lineTo(-180, 170); g.lineTo(-220, 112); g.lineTo(-220, -126); g.close(); g.stroke(); g.strokeColor = new Color(204, 255, 224, 190); g.lineWidth = 2.5; g.moveTo(-177, -154); g.lineTo(177, -154); g.lineTo(203, -116); g.lineTo(203, 102); g.lineTo(166, 152); g.lineTo(-166, 152); g.lineTo(-203, 102); g.lineTo(-203, -116); g.close(); g.stroke(); for (let rail = 0; rail < 3; rail += 1) { g.strokeColor = new Color(accent.r, accent.g, accent.b, 75 + rail * 30); g.lineWidth = 2; g.moveTo(-182, 82 - rail * 52); g.lineTo(182, 82 - rail * 52); g.stroke(); }
    } else if (index === 2) {
      // Ballroom: a theatre proscenium with a high central chandelier crown.
      g.fillColor = new Color(20, 24, 47, 112); g.moveTo(-218, -168); g.lineTo(-218, 78); g.quadraticCurveTo(-164, 170, 0, 170); g.quadraticCurveTo(164, 170, 218, 78); g.lineTo(218, -168); g.close(); g.fill(); g.strokeColor = brass; g.lineWidth = 11; g.moveTo(-218, -168); g.lineTo(-218, 78); g.quadraticCurveTo(-164, 170, 0, 170); g.quadraticCurveTo(164, 170, 218, 78); g.lineTo(218, -168); g.close(); g.stroke(); g.strokeColor = new Color(211, 232, 255, 205); g.lineWidth = 2.5; g.moveTo(-205, -154); g.lineTo(-205, 71); g.quadraticCurveTo(-150, 153, 0, 153); g.quadraticCurveTo(150, 153, 205, 71); g.lineTo(205, -154); g.stroke(); g.fillColor = new Color(255, 244, 198, 198); g.circle(0, 126, 10); g.fill();
    } else {
      // Penthouse: split lift doors, floor indicator and rising light seams.
      g.fillColor = new Color(21, 30, 50, 104); g.roundRect(-218, -170, 436, 340, 24); g.fill(); g.strokeColor = brass; g.lineWidth = 12; g.roundRect(-218, -170, 436, 340, 24); g.stroke(); g.strokeColor = C.paleGold; g.lineWidth = 2.5; g.roundRect(-204, -156, 408, 312, 18); g.stroke(); g.fillColor = new Color(24, 10, 20, 186); g.roundRect(-78, 128, 156, 36, 14); g.fill(); g.strokeColor = new Color(255, 233, 157, 218); g.lineWidth = 2; g.roundRect(-75, 131, 150, 30, 12); g.stroke(); g.strokeColor = new Color(210, 239, 255, 114); g.lineWidth = 2; g.moveTo(0, 125); g.lineTo(0, -72); g.stroke();
    }
    const deckY = -112; const deck = new Node('VenueIdentityDeck'); deck.layer = Layers.Enum.UI_2D; deck.addComponent(UITransform).setContentSize(404, 102); deck.setPosition(0, deckY); root.addChild(deck); const deckGraphics = deck.addComponent(Graphics); deckGraphics.fillColor = dark; deckGraphics.roundRect(-202, -51, 404, 102, index === 1 ? 16 : 26); deckGraphics.fill(); deckGraphics.fillColor = glass; deckGraphics.roundRect(-195, -44, 390, 88, 20); deckGraphics.fill(); deckGraphics.strokeColor = C.paleGold; deckGraphics.lineWidth = 2; deckGraphics.roundRect(-195, -44, 390, 88, 20); deckGraphics.stroke();
    this.addCardPhotoBackdrop(deck, index, 404, 102, 116, 112, index % 2 ? -28 : 20);
    const floor = this.label(deck, `FLOOR 0${index + 1}`, -143, 27, 14, C.paleGold, true, 96); this.addLabelOutline(floor, LOBBY.ink, 3);
    const name = this.label(deck, names[index], -38, 4, index === 3 ? 20 : 22, LOBBY.ivory, true, 296); name.enableWrapText = false; this.addLabelOutline(name, LOBBY.ink, 5);
    const mode = this.label(deck, modes[index], -38, -29, 12, new Color(188, 239, 222), true, 292); mode.enableWrapText = false; this.addLabelOutline(mode, LOBBY.ink, 3);
    // The entire photographed doorway is clickable; this small illuminated
    // key is an affordance mounted in the same identity deck, never a tag
    // floating over the room art.
    const enter = this.panel(deck, 159, 0, 70, 58, 18, new Color(accent.r, accent.g, accent.b, 164), C.paleGold, 2, false); this.addCardPhotoBackdrop(enter, index, 70, 58, 128, 104, index % 2 ? -16 : 12); const enterLabel = this.label(enter, 'PLAY', 0, 0, 15, C.white, true, 54); this.addLabelOutline(enterLabel, LOBBY.ink, 3);
    this.addCardShine(root, width - 34, height - 34, C.paleGold, 0.45 + index * 0.58);
    root.setScale(new Vec3(0.95, 0.95, 1)); tween(root).delay(index * 0.09).to(0.34, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    const button = root.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.982; let opening = false;
    root.on(Button.EventType.CLICK, () => { if (opening || this.router.route !== 'home') return; opening = true; this.selectedGame = config; this.router.go('game-loading'); }, this);
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
    const ribbon = this.panel(this.page, 0, -666, 760, 92, 30, new Color(46, 18, 32, 244), LOBBY.rubyLight, 2, false); ribbon.name = 'LiveFortuneFloorRibbon';
    const title = this.label(ribbon, 'LIVE FORTUNE FLOOR', -136, 17, 26, LOBBY.ivory, true, 440); this.addLabelOutline(title, LOBBY.ink, 3);
    const detail = this.label(ribbon, '4 DISTINCT GAMES  •  FAIR VIRTUAL PLAY', -136, -20, 18, LOBBY.champagne, true, 440); this.addLabelOutline(detail, LOBBY.ink, 2);
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
    const compact = width < 600; const deckHeight = compact ? 104 : 116; const deckY = -height / 2 + deckHeight / 2 + 10;
    const deck = this.panel(portal, 0, deckY, width - 22, deckHeight, 25, deckTones[index], accent, 2, false); deck.name = 'PortalTitleDeck';
    const deckLine = new Node('PortalDeckHighlight'); deckLine.layer = Layers.Enum.UI_2D; deckLine.addComponent(UITransform).setContentSize(width - 56, 8); deckLine.setPosition(0, deckHeight / 2 - 12); deck.addChild(deckLine); const deckGraphics = deckLine.addComponent(Graphics); deckGraphics.fillColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 156); deckGraphics.roundRect(-(width - 56) / 2, -1, width - 56, 2, 1); deckGraphics.fill(); deckGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 210); deckGraphics.roundRect(-72, -3, 144, 6, 3); deckGraphics.fill();
    const name = this.label(deck, config.name, compact ? -43 : -58, compact ? 16 : 19, compact ? 21 : 28, LOBBY.ivory, true, width - (compact ? 132 : 168)); name.enableWrapText = false; this.addLabelOutline(name, LOBBY.ink, 5);
    const cadence = ['5×3 • 20 LINES', '6×5 • CLUSTER TUMBLE', '5×4 • 1024 WAYS', '4×4 • 512 TWO-WAY WAYS'][index];
    const cadenceLabel = this.label(deck, cadence, compact ? -43 : -58, compact ? -19 : -24, compact ? 14 : 17, LOBBY.champagne, true, width - (compact ? 132 : 168)); cadenceLabel.enableWrapText = false; this.addLabelOutline(cadenceLabel, LOBBY.ink, 3);
    const numberPlate = this.panel(portal, -width / 2 + 50, height / 2 - 42, 72, 44, 18, deckTones[index], C.paleGold, 2, false);
    const number = this.label(numberPlate, `0${index + 1}`, 0, 0, 18, LOBBY.ivory, true, 54); this.addLabelOutline(number, LOBBY.ink, 3);
    const launch = this.panel(deck, width / 2 - (compact ? 58 : 78), -4, compact ? 92 : 116, compact ? 62 : 70, 28, new Color(accent.r, accent.g, accent.b, 238), C.paleGold, 2, false); const launchLabel = this.label(launch, 'PLAY', 0, 0, compact ? 17 : 19, C.white, true, compact ? 72 : 92); this.addLabelOutline(launchLabel, C.outline, 3);
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
    const playMode = config.id === 'bellhop-bonanza' ? '5×3  •  20 LINES'
      : config.id === 'tea-vault-tumble' ? '6×5  •  CLUSTER TUMBLE'
        : config.id === 'ballroom-keyways' ? '5×4  •  1024 WAYS'
          : '4×4  •  512 TWO-WAY WAYS';
    const modeLabel = this.label(glass, playMode, 0, -18, featured ? 20 : 16, LOBBY.champagne, true, glassWidth - 18); this.addLabelOutline(modeLabel, LOBBY.ink, 3);
    this.addGameCardCta(card, index, featured ? 282 : 0, featured ? -116 : -183, featured ? 300 : 220);
    const ribbon = ['STACKED LUGGAGE', 'TEA VAULT CASCADE', 'BALLROOM KEY PATH', 'FORTUNE LIFT'][index];
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

  private addAureliaPageSeal(title: string, subtitle: string, accent: Color, config: GameConfig, symbol: string): void {
    const seal = new Node(`${title}-Seal`); seal.layer = Layers.Enum.UI_2D; seal.addComponent(UITransform).setContentSize(920, 158); seal.setPosition(0, 620); this.page.addChild(seal); const g = seal.addComponent(Graphics);
    const configIndex = Math.max(0, GAME_CONFIGS.indexOf(config)); const art = this.addGameCoverArt(seal, configIndex, 908, 150, false); const artOpacity = art.addComponent(UIOpacity); artOpacity.opacity = 172;
    const veil = new Node('PageSealGlass'); veil.layer = Layers.Enum.UI_2D; veil.addComponent(UITransform).setContentSize(900, 142); seal.addChild(veil); const vg = veil.addComponent(Graphics); vg.fillColor = new Color(42, 15, 29, 164); vg.roundRect(-450, -71, 900, 142, 30); vg.fill(); vg.fillColor = new Color(accent.r, accent.g, accent.b, 36); vg.roundRect(-360, -58, 720, 116, 24); vg.fill();
    g.strokeColor = new Color(119, 66, 37, 242); g.lineWidth = 9; g.roundRect(-456, -75, 912, 150, 34); g.stroke(); g.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 228); g.lineWidth = 3; g.roundRect(-450, -69, 900, 138, 30); g.stroke(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 220); g.lineWidth = 1.5; g.roundRect(-441, -60, 882, 120, 26); g.stroke();
    const heading = this.artTitle(seal, title, 0, 24, 42, accent, 760); this.addLabelOutline(heading, C.outline, 6);
    const copy = this.label(seal, subtitle, 0, -31, 18, C.white, true, 800); this.addLabelOutline(copy, C.outline, 4);
    this.addCardShine(seal, 882, 126, C.paleGold, 0.35);
    void symbol;
  }

  private addF12SceneHeader(title: string, subtitle: string, accent: Color, y: number): void {
    const width = 850; const height = 118; const root = new Node(`${title}-SceneHeader`); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(width, height); root.setPosition(0, y); this.page.addChild(root); const g = root.addComponent(Graphics);
    g.fillColor = new Color(29, 15, 18, 174); g.roundRect(-width / 2, -height / 2, width, height, 34); g.fill();
    g.fillColor = new Color(accent.r, accent.g, accent.b, 28); g.roundRect(-width / 2 + 17, -height / 2 + 14, width - 34, height - 28, 27); g.fill();
    g.strokeColor = new Color(88, 45, 25, 246); g.lineWidth = 7; g.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 32); g.stroke();
    g.strokeColor = new Color(C.paleGold.r, C.paleGold.g, C.paleGold.b, 230); g.lineWidth = 2.5; g.roundRect(-width / 2 + 10, -height / 2 + 10, width - 20, height - 20, 28); g.stroke();
    g.strokeColor = new Color(accent.r, accent.g, accent.b, 184); g.lineWidth = 1.5; g.moveTo(-width / 2 + 52, -16); g.lineTo(-width / 2 + 190, -16); g.moveTo(width / 2 - 190, -16); g.lineTo(width / 2 - 52, -16); g.stroke();
    const heading = this.artTitle(root, title, 0, 20, 37, accent, width - 78); this.addLabelOutline(heading, C.outline, 6); const copy = this.label(root, subtitle, 0, -29, 17, C.white, true, width - 90); this.addLabelOutline(copy, C.outline, 4);
    this.addMaterialLightSweep(root, width - 32, height - 26, accent, 0.25);
  }

  private addF12SceneAtmosphere(accent: Color, asset: 'store' | 'rewards' | 'rank' | 'profile'): void {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lanes = asset === 'rank' ? [-390, -250, 250, 390] : asset === 'rewards' ? [-420, -286, 286, 420] : [-430, -318, 318, 430];
    lanes.forEach((x, lane) => {
      for (let index = 0; index < 3; index += 1) {
        const mote = new Node(`${asset}-SceneMote-${lane}-${index}`); mote.layer = Layers.Enum.UI_2D; mote.addComponent(UITransform).setContentSize(32, 32); const y = -520 + index * 395 + lane % 2 * 76; mote.setPosition(x, y); this.page.addChild(mote); const g = mote.addComponent(Graphics); const tone = (lane + index) % 3 === 0 ? C.paleGold : accent;
        g.fillColor = new Color(tone.r, tone.g, tone.b, 42); g.circle(0, 0, 10 + index * 2); g.fill(); g.fillColor = new Color(255, 250, 222, 206); g.circle(0, 0, 2.2 + index * 0.5); g.fill(); const opacity = mote.addComponent(UIOpacity); opacity.opacity = reducedMotion ? 78 : 28 + index * 12;
        if (!reducedMotion) { tween(mote).delay((lane + index) * 0.17).by(3.4 + index * 0.45, { position: new Vec3(lane % 2 ? -13 : 13, 48 + index * 12, 0), scale: new Vec3(0.18, 0.18, 0) }, { easing: 'sineInOut' }).by(3.8 + index * 0.4, { position: new Vec3(lane % 2 ? 13 : -13, -48 - index * 12, 0), scale: new Vec3(-0.18, -0.18, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).delay(index * 0.23).to(1.4, { opacity: 150 }).to(2.2, { opacity: 36 }).union().repeatForever().start(); }
      }
    });
  }

  private addMaterialLightSweep(parent: Node, width: number, height: number, accent: Color, delay: number): void {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; const glint = new Node('MaterialLightSweep'); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(104, Math.max(12, height * 0.72)); glint.setPosition(-width / 2 + 70, 0); parent.addChild(glint); glint.setSiblingIndex(0); glint.angle = -14; const g = glint.addComponent(Graphics);
    g.fillColor = new Color(accent.r, accent.g, accent.b, 18); g.roundRect(-52, -height * 0.36, 104, height * 0.72, 48); g.fill(); g.fillColor = new Color(255, 250, 220, 58); g.roundRect(-8, -height * 0.31, 16, height * 0.62, 8); g.fill(); const opacity = glint.addComponent(UIOpacity); opacity.opacity = reducedMotion ? 18 : 0;
    if (!reducedMotion) tween(glint).delay(delay).to(2.4, { position: new Vec3(width / 2 - 70, 0, 0) }, { easing: 'sineInOut' }).call(() => glint.setPosition(-width / 2 + 70, 0)).delay(2.7 + delay).union().repeatForever().start();
    if (!reducedMotion) tween(opacity).delay(delay).to(0.35, { opacity: 92 }).delay(1.25).to(0.65, { opacity: 0 }).delay(3.15 + delay).union().repeatForever().start();
  }

  private addTreasuryDrawerMaterial(parent: Node, index: number, width: number, height: number, accent: Color): void {
    const compact = height < 140;
    this.addPhotographicMaterial(parent, 'art/treasury-exchange', width, height, compact ? 30 : 25, compact ? 92 : 142, new Color(37, 17, 17, compact ? 126 : 104), index % 2 ? 96 : -88, compact ? 54 : -18, !compact);
    const material = new Node(`TreasuryDrawerMaterial-${index}`); material.layer = Layers.Enum.UI_2D; material.addComponent(UITransform).setContentSize(width, height); parent.addChild(material); material.setSiblingIndex(1); const g = material.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2;
    g.fillColor = compact ? new Color(34, 56, 48, 132) : new Color(52, 24, 20, 142); g.roundRect(-halfW + 3, -halfH + 3, width - 6, height - 6, compact ? 30 : 25); g.fill();
    g.fillColor = new Color(accent.r, accent.g, accent.b, compact ? 42 : 28); g.roundRect(-halfW + 15, -halfH + 15, width - 30, height - 30, compact ? 24 : 19); g.fill();
    g.strokeColor = new Color(92, 45, 23, 252); g.lineWidth = compact ? 6 : 8; g.roundRect(-halfW + 4, -halfH + 4, width - 8, height - 8, compact ? 29 : 24); g.stroke(); g.strokeColor = new Color(255, 224, 147, 232); g.lineWidth = 2.5; g.roundRect(-halfW + 11, -halfH + 11, width - 22, height - 22, compact ? 25 : 20); g.stroke();
    if (!compact) { g.fillColor = new Color(14, 52, 43, 196); g.roundRect(-halfW + 20, halfH - 58, width - 40, 42, 16); g.fill(); g.strokeColor = new Color(122, 210, 176, 174); g.lineWidth = 1.5; g.roundRect(-halfW + 23, halfH - 55, width - 46, 36, 14); g.stroke(); g.fillColor = new Color(255, 226, 145, 210); g.circle(0, -halfH + 20, 7); g.fill(); g.strokeColor = new Color(88, 44, 24, 238); g.lineWidth = 5; g.arc(0, -halfH + 18, 22, 0.2, Math.PI - 0.2, false); g.stroke(); }
    [[-halfW + 24, halfH - 24], [halfW - 24, halfH - 24], [-halfW + 24, -halfH + 24], [halfW - 24, -halfH + 24]].forEach(([x, y]) => { g.fillColor = new Color(255, 226, 147, 230); g.circle(x, y, 4); g.fill(); }); this.addMaterialLightSweep(material, width - 24, height - 20, accent, 0.45 + index * 0.37);
  }

  private addRewardPavilionMaterial(parent: Node, index: number, width: number, height: number, accent: Color): void {
    const wide = width > 500; const focus = [-120, 95, -34, 128][index] ?? 0;
    this.addPhotographicMaterial(parent, 'art/lantern-gift-pavilion', width, height, index === 0 || index === 3 ? 40 : 32, wide ? 154 : 128, new Color(31, 15, 25, wide ? 104 : 128), focus, index % 2 ? 38 : -28, wide);
    const material = new Node(`RewardPavilionMaterial-${index}`); material.layer = Layers.Enum.UI_2D; material.addComponent(UITransform).setContentSize(width, height); parent.addChild(material); material.setSiblingIndex(1); const g = material.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2;
    const fills = [new Color(82, 24, 28, 136), new Color(23, 63, 60, 142), new Color(51, 31, 70, 142), new Color(52, 35, 23, 142)] as const; g.fillColor = fills[index]; g.roundRect(-halfW + 4, -halfH + 4, width - 8, height - 8, index === 0 || index === 3 ? 40 : 32); g.fill();
    g.fillColor = new Color(accent.r, accent.g, accent.b, 28); g.roundRect(-halfW + 17, -halfH + 17, width - 34, height - 34, index === 0 || index === 3 ? 32 : 24); g.fill(); g.strokeColor = new Color(255, 224, 150, 226); g.lineWidth = 3; g.roundRect(-halfW + 10, -halfH + 10, width - 20, height - 20, index === 0 || index === 3 ? 36 : 28); g.stroke();
    g.strokeColor = new Color(accent.r, accent.g, accent.b, 190); g.lineWidth = 2; if (index === 1) { g.arc(0, halfH - 55, 45, 0, Math.PI * 2, false); g.stroke(); g.arc(0, halfH - 55, 31, 0, Math.PI * 2, false); g.stroke(); } else if (index === 2) { g.moveTo(-halfW + 34, halfH - 62); g.lineTo(0, halfH - 22); g.lineTo(halfW - 34, halfH - 62); g.stroke(); } else { g.arc(0, halfH - 46, Math.min(94, width * 0.25), 0.16, Math.PI - 0.16, false); g.stroke(); }
    g.strokeColor = new Color(255, 245, 207, 104); g.lineWidth = 1.5; g.moveTo(-halfW + 36, -halfH + 66); g.lineTo(halfW - 36, -halfH + 66); g.stroke(); this.addMaterialLightSweep(material, width - 26, height - 24, accent, 0.55 + index * 0.62);
  }

  private addFortuneDrumPodiumMaterial(parent: Node, index: number, width: number, height: number): void {
    this.addPhotographicMaterial(parent, 'art/fortune-drum-rank-stage', width, height, Math.min(48, width * 0.18), 148, new Color(47, 14, 20, 110), index === 0 ? 0 : index === 1 ? -120 : 120, -32, true);
    const material = new Node(`FortuneDrumPodium-${index}`); material.layer = Layers.Enum.UI_2D; material.addComponent(UITransform).setContentSize(width, height); parent.addChild(material); material.setSiblingIndex(1); const g = material.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2; const tone = index === 0 ? C.gold : index === 1 ? C.cyan : C.coral;
    g.fillColor = new Color(65, 20, 21, 138); g.roundRect(-halfW + 5, -halfH + 5, width - 10, height - 10, Math.min(48, width * 0.18)); g.fill(); g.fillColor = new Color(tone.r, tone.g, tone.b, 32); g.roundRect(-halfW + 17, -halfH + 17, width - 34, height - 34, Math.min(39, width * 0.15)); g.fill();
    g.strokeColor = new Color(103, 47, 24, 252); g.lineWidth = 8; g.roundRect(-halfW + 5, -halfH + 5, width - 10, height - 10, Math.min(48, width * 0.18)); g.stroke(); g.strokeColor = new Color(255, 224, 142, 238); g.lineWidth = 2.5; g.roundRect(-halfW + 13, -halfH + 13, width - 26, height - 26, Math.min(41, width * 0.16)); g.stroke();
    g.strokeColor = new Color(tone.r, tone.g, tone.b, 195); g.lineWidth = 3; g.arc(0, halfH - 55, Math.min(54, width * 0.22), 0, Math.PI * 2, false); g.stroke(); g.fillColor = new Color(255, 230, 152, 178); g.roundRect(-halfW + 28, -halfH + 26, width - 56, 13, 6); g.fill(); this.addMaterialLightSweep(material, width - 30, height - 28, tone, 0.35 + index * 0.53);
  }

  private addSilkRankingRowMaterial(parent: Node, index: number, width: number, height: number, current: boolean): void {
    this.addPhotographicMaterial(parent, 'art/fortune-drum-rank-stage', width, height, 22, current ? 102 : 82, new Color(40, 14, 20, current ? 112 : 142), index % 2 ? 132 : -132, 62, false);
    const material = new Node(`SilkRankingRow-${index}`); material.layer = Layers.Enum.UI_2D; material.addComponent(UITransform).setContentSize(width, height); parent.addChild(material); material.setSiblingIndex(1); const g = material.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2; const accent = current ? C.cyan : index % 2 ? C.coral : C.gold;
    g.fillColor = current ? new Color(17, 66, 62, 142) : new Color(70, 23, 27, 130); g.roundRect(-halfW + 4, -halfH + 4, width - 8, height - 8, 22); g.fill(); g.fillColor = new Color(accent.r, accent.g, accent.b, 25); g.roundRect(-halfW + 15, -halfH + 13, width - 30, height - 26, 16); g.fill();
    g.strokeColor = new Color(255, 223, 144, current ? 244 : 190); g.lineWidth = current ? 3 : 2; g.roundRect(-halfW + 9, -halfH + 9, width - 18, height - 18, 19); g.stroke(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 160); g.lineWidth = 1.5; g.moveTo(-halfW + 92, 0); g.lineTo(halfW - 190, 0); g.stroke(); g.fillColor = new Color(255, 229, 151, 218); g.circle(-halfW + 28, 0, 5); g.fill(); g.circle(halfW - 28, 0, 5); g.fill(); this.addMaterialLightSweep(material, width - 36, height - 24, accent, 0.4 + index * 0.31);
  }

  private addMemberLedgerMaterial(parent: Node, width: number, height: number): void {
    this.addPhotographicMaterial(parent, 'art/jade-koi-member-ledger', width, height, 42, 164, new Color(12, 43, 40, 100), -84, -20, true);
    const material = new Node('MemberLedgerMaterial'); material.layer = Layers.Enum.UI_2D; material.addComponent(UITransform).setContentSize(width, height); parent.addChild(material); material.setSiblingIndex(1); const g = material.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2;
    g.fillColor = new Color(18, 55, 49, 136); g.roundRect(-halfW + 4, -halfH + 4, width - 8, height - 8, 42); g.fill(); g.fillColor = new Color(229, 206, 158, 30); g.roundRect(-halfW + 18, -halfH + 18, width - 36, height - 36, 34); g.fill();
    g.strokeColor = new Color(81, 42, 24, 252); g.lineWidth = 9; g.roundRect(-halfW + 4, -halfH + 4, width - 8, height - 8, 42); g.stroke(); g.strokeColor = new Color(255, 226, 150, 235); g.lineWidth = 2.5; g.roundRect(-halfW + 13, -halfH + 13, width - 26, height - 26, 36); g.stroke(); g.strokeColor = new Color(119, 213, 187, 152); g.lineWidth = 2; g.moveTo(50, halfH - 27); g.lineTo(50, -halfH + 27); g.stroke();
    [[-halfW + 28, halfH - 28], [halfW - 28, halfH - 28], [-halfW + 28, -halfH + 28], [halfW - 28, -halfH + 28]].forEach(([x, y]) => { g.fillColor = new Color(255, 227, 149, 224); g.circle(x, y, 5); g.fill(); }); this.addMaterialLightSweep(material, width - 32, height - 30, C.cyan, 0.6);
  }

  private addOpenLedgerStatMaterial(parent: Node, index: number, width: number, height: number): void {
    this.addPhotographicMaterial(parent, 'art/jade-koi-member-ledger', width, height, 27, 92, new Color(29, 19, 17, 140), index === 0 ? -112 : index === 1 ? 0 : 112, 76, false);
    const material = new Node(`OpenLedgerStat-${index}`); material.layer = Layers.Enum.UI_2D; material.addComponent(UITransform).setContentSize(width, height); parent.addChild(material); material.setSiblingIndex(1); const g = material.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2; const tones = [C.cyan, C.coral, C.gold] as const; const accent = tones[index];
    g.fillColor = new Color(46, 28, 20, 126); g.roundRect(-halfW + 4, -halfH + 4, width - 8, height - 8, 27); g.fill(); g.fillColor = new Color(accent.r, accent.g, accent.b, 30); g.roundRect(-halfW + 15, -halfH + 14, width - 30, height - 28, 20); g.fill(); g.strokeColor = new Color(255, 225, 151, 216); g.lineWidth = 2.5; g.roundRect(-halfW + 10, -halfH + 10, width - 20, height - 20, 23); g.stroke(); g.strokeColor = new Color(accent.r, accent.g, accent.b, 154); g.lineWidth = 1.5; g.moveTo(-halfW + 34, 0); g.lineTo(halfW - 34, 0); g.stroke(); this.addMaterialLightSweep(material, width - 26, height - 24, accent, 0.4 + index * 0.42);
  }

  private addLedgerServiceBayMaterial(parent: Node, index: number, width: number, height: number, accent: Color): void {
    this.addPhotographicMaterial(parent, 'art/jade-koi-member-ledger', width, height, 34, 126, new Color(22, 17, 24, 124), index === 0 ? -138 : index === 1 ? 0 : 138, -46, width > 430);
    const material = new Node(`LedgerServiceBay-${index}`); material.layer = Layers.Enum.UI_2D; material.addComponent(UITransform).setContentSize(width, height); parent.addChild(material); material.setSiblingIndex(1); const g = material.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2; const fills = [new Color(23, 67, 55, 142), new Color(83, 28, 28, 142), new Color(31, 47, 67, 142)] as const;
    g.fillColor = fills[index]; g.roundRect(-halfW + 4, -halfH + 4, width - 8, height - 8, 34); g.fill(); g.fillColor = new Color(accent.r, accent.g, accent.b, 27); g.roundRect(-halfW + 17, -halfH + 17, width - 34, height - 34, 26); g.fill(); g.strokeColor = new Color(255, 225, 148, 228); g.lineWidth = 3; g.roundRect(-halfW + 10, -halfH + 10, width - 20, height - 20, 30); g.stroke();
    g.strokeColor = new Color(accent.r, accent.g, accent.b, 172); g.lineWidth = 2; g.arc(0, halfH - 59, 45, 0.15, Math.PI - 0.15, false); g.stroke(); g.fillColor = new Color(255, 227, 151, 198); g.roundRect(-42, -halfH + 19, 84, 7, 3.5); g.fill(); this.addMaterialLightSweep(material, width - 28, height - 26, accent, 0.5 + index * 0.56);
  }

  private showStore(): void {
    const player = this.ensurePlayer(); const guest = player.isGuest;
    this.paintBackdrop('store', new Color(28, 18, 22), new Color(138, 73, 42)); this.topBar('TREASURY');
    this.addF12SceneAtmosphere(C.gold, 'store');
    this.addF12SceneHeader('GOLDEN HARVEST EXCHANGE', guest ? 'GUEST PASS • SIGN IN TO OPEN THE COIN DRAWERS' : 'APPLE PURCHASES • VIRTUAL COINS • NO CASH VALUE', C.gold, 620);
    const daily = this.panel(this.page, 0, 465, 780, 100, 34, new Color(0, 0, 0, 0), undefined, 0, false); daily.name = 'DailyTreasuryDrawer'; this.addTreasuryDrawerMaterial(daily, 4, 780, 100, C.green);
    this.addPremiumSymbol(daily, GAME_CONFIGS[0], 'coin-stack', -326, 0, 68, 'pulse', 250); const giftTitle = this.label(daily, 'DAILY HARVEST GIFT', -138, 17, 25, C.white, true, 360); this.addLabelOutline(giftTitle, C.outline, 4); const giftAmount = this.label(daily, '+5,000 VIRTUAL COINS', -138, -19, 19, C.paleGold, true, 360); this.addLabelOutline(giftAmount, C.outline, 3);
    this.button(daily, 'CLAIM', 292, 0, 200, 66, () => {
      if (this.bootstrap.remoteMode) { void this.claimRemoteReward('daily').then((ok) => { if (ok) this.vfx.flyCredits(new Vec3(292, 455, 0), new Vec3(350, this.topY(800), 0), () => { if (this.router.route === 'store') this.render('store'); }); }); return; }
      const ok = this.bootstrap.store.claimDaily(this.today()); this.toast(ok ? '5,000 virtual coins collected' : 'Already collected today', ok ? C.green : C.muted); if (ok) this.vfx.flyCredits(new Vec3(292, 455, 0), new Vec3(350, this.topY(800), 0), () => { if (this.router.route === 'store') this.render('store'); }); else this.refreshBalance();
    }, okStyle(true));
    const catalogViews = new Map<string, { price: Label; button: Button; buttonLabel?: Label }>();
    const symbols = ['coin-stack', 'gold-coins', 'ballroom-key', 'treasure-case'] as const;
    const symbolGames = [GAME_CONFIGS[0], GAME_CONFIGS[1], GAME_CONFIGS[2], GAME_CONFIGS[3]] as const;
    STORE_PRODUCTS.forEach((product, index) => {
      const x = 0; const y = 276 - index * 258; const featured = index === 2; const accent = featured ? C.gold : index === 1 ? C.cyan : index === 3 ? C.green : C.coral;
      const card = this.panel(this.page, x, y, 894, 236, 28, new Color(0, 0, 0, 0), undefined, 0, false); card.name = `TreasuryDrawer-${product.id}`;
      this.addTreasuryDrawerMaterial(card, index, 894, 236, accent);
      this.addPremiumSymbol(card, symbolGames[index], symbols[index], -348, 10, 120, 'pulse', 250, index * 0.12);
      const packName = this.label(card, product.label, -75, 70, 33, C.white, true, 415); this.addLabelOutline(packName, C.outline, 3);
      const credits = this.label(card, this.format(product.credits + product.bonus), -75, 11, 54, C.paleGold, true, 415); this.addLabelOutline(credits, C.outline, 3);
      const detail = this.label(card, product.bonus ? `Includes ${this.format(product.bonus)} bonus` : 'Virtual coins', -75, -64, 29, C.white, true, 415); this.addLabelOutline(detail, C.outline, 3);
      const price = this.label(card, this.debugMode ? `${product.debugPrice} TEST` : 'CHECKING…', 286, 54, 36, C.paleGold, true, 258); this.addLabelOutline(price, C.outline, 3);
      const buyNode = this.button(card, guest ? 'SIGN IN' : 'BUY', 286, -38, 258, 110, () => { if (guest) { this.toast('Sign in or create an account to purchase coins.', C.red); this.router.go('login'); return; } void this.purchaseCoins(product, new Vec3(x, y - 38, 0)); }, guest ? 'ghost' : featured ? 'primary' : 'secondary');
      catalogViews.set(product.id, { price, button: buyNode.getComponent(Button) as Button, buttonLabel: buyNode.getChildByName('Text')?.getComponent(Label) ?? undefined });
    });
    this.button(this.page, 'SYNC PURCHASES', 0, -703, 460, 102, () => void this.synchronizePurchases(), 'ghost');
    const storeFootnote = this.label(this.page, this.debugMode ? 'TEST PRICES · VIRTUAL COINS ONLY' : 'VIRTUAL COINS · NO CASH VALUE', 0, -791, 28, C.white, true, 850); this.addLabelOutline(storeFootnote, C.outline, 3);
    void this.loadStoreCatalog(catalogViews); this.bottomNav('store');
  }

  private showRewards(): void {
    this.paintBackdrop('rewards', new Color(20, 31, 41), new Color(95, 91, 106)); this.topBar('REWARDS');
    this.addF12SceneAtmosphere(C.cyan, 'rewards');
    this.addF12SceneHeader('RIVER LANTERN REWARDS', 'YOUR DAILY HARVEST AWAITS', C.paleGold, 620);
    const wheelState = this.bootstrap.save.currentScope()?.wheel;
    const wheelReady = !wheelState || wheelState.date !== this.today() || wheelState.remaining > 0;
    const hero = this.panel(this.page, 0, 292, 900, 428, 38, new Color(0, 0, 0, 0), undefined, 0, false);
    hero.name = 'DailyHarvestStage'; this.addRewardPavilionMaterial(hero, 0, 900, 428, C.gold);
    this.addPremiumSymbol(hero, GAME_CONFIGS[0], 'room-scatter', -258, 33, 238, 'pulse', 255);
    this.label(hero, 'THE DAILY HARVEST', 123, 123, 36, C.paleGold, true, 518);
    this.label(hero, 'Seven days of lantern gifts', 123, 63, 27, C.white, true, 510);
    this.label(hero, 'Return each day to build your streak', 123, 9, 24, C.white, true, 510);
    this.button(hero, 'OPEN DAILY GIFTS', 123, -91, 460, 90, () => this.router.go('check-in'), 'primary');
    this.addCardShine(hero, 850, 388, C.gold, 0.8);
    const wheel = this.panel(this.page, 0, -82, 900, 280, 34, new Color(0, 0, 0, 0), undefined, 0, false);
    wheel.name = 'FortuneWheelPavilion'; this.addRewardPavilionMaterial(wheel, 1, 900, 280, C.cyan);
    this.addPremiumSymbol(wheel, GAME_CONFIGS[3], 'floor-bonus', 307, 10, 190, 'orbit', 250);
    this.label(wheel, 'FORTUNE WHEEL', -123, 72, 36, C.paleGold, true, 538);
    this.label(wheel, wheelReady ? 'Your daily spin is ready' : 'Your next spin arrives tomorrow', -123, 17, 26, C.white, true, 538);
    this.button(wheel, wheelReady ? 'OPEN THE WHEEL' : 'VIEW WHEEL', -123, -70, 450, 82, () => this.router.go('wheel'), 'secondary');
    const services: readonly [string, string, Route, number][] = [
      ['HARVEST TROPHIES', this.bootstrap.redDots.achievements() + ' rewards ready', 'achievements', -232],
      ['TREASURE POST', this.bootstrap.redDots.mail() + ' unread messages', 'mail', 232],
    ];
    services.forEach(([title, detail, route, x], index) => {
      const service = this.panel(this.page, x, -418, 436, 304, 32, new Color(0, 0, 0, 0), undefined, 0, false);
      this.addRewardPavilionMaterial(service, index + 2, 436, 304, index ? C.cyan : C.gold);
      this.label(service, title, 0, 77, 28, C.paleGold, true, 394);
      this.label(service, detail, 0, 19, 26, C.white, true, 390);
      this.button(service, 'OPEN', 0, -73, 330, 80, () => this.router.go(route), 'secondary');
    });
    this.bottomNav('rewards');
  }

  private showRank(tab: 'daily' | 'weekly' | 'all-time'): void {
    this.paintBackdrop('rank', new Color(29, 16, 18), new Color(147, 72, 35)); this.topBar('RANK');
    this.addF12SceneAtmosphere(C.gold, 'rank'); this.addF12SceneHeader(this.bootstrap.remoteMode ? 'FORTUNE DRUM HONOURS' : 'MY HARVEST RECORD', this.bootstrap.remoteMode ? 'SERVER-VERIFIED VIRTUAL-COIN WINNINGS' : 'ON THIS DEVICE · PERSONAL WINNINGS', C.gold, 620);
    const tabs: readonly [typeof tab, string][] = [['daily', 'DAILY'], ['weekly', 'WEEKLY'], ['all-time', 'ALL TIME']]; tabs.forEach(([id, text], index) => this.button(this.page, text, -286 + index * 286, 512, 242, 78, () => { if (id !== tab) this.switchRankTab(id); }, id === tab ? 'primary' : 'ghost'));
    const rows = this.bootstrap.rank.list(tab, this.bootstrap.profile.current()).slice(0, 8);
    const rankingsLoading = this.bootstrap.remoteMode && !this.bootstrap.rank.hasSnapshot(tab) && !this.rankError;
    const periodText = tab === 'daily' ? 'TODAY · UTC' : tab === 'weekly' ? 'THIS WEEK · MON–SUN UTC' : 'ALL-TIME WINNINGS';
    if (rankingsLoading) { const generation = ++this.rankRequestGeneration; void this.bootstrap.rank.refresh(tab).then(() => { if (this.router.route === 'rank' && generation === this.rankRequestGeneration) { this.clearAll(); this.showRank(tab); } }).catch(() => { if (this.router.route === 'rank' && generation === this.rankRequestGeneration) { this.rankError = 'Rankings could not load. Please try again.'; this.clearAll(); this.showRank(tab); } }); }
    const dais = new Node('FortuneHonoursDais'); dais.layer = Layers.Enum.UI_2D; dais.addComponent(UITransform).setContentSize(930, 408); dais.setPosition(0, 260); this.page.addChild(dais);
    this.addPhotographicMaterial(dais, 'art/fortune-drum-rank-stage', 930, 408, 38, 240, new Color(44, 15, 18, 52), 0, 150, false);
    this.addMaterialLightSweep(dais, 888, 376, C.paleGold, 1.1);
    const periodCaption = this.label(this.page, periodText, 0, 447, 27, C.white, true, 790); this.addLabelOutline(periodCaption, C.outline, 3);
    const podiumX = [0, -296, 296] as const; const podiumY = [280, 243, 243] as const; const podiumHeights = [310, 270, 270] as const;
    rows.slice(0, 3).forEach((entry, index) => {
      const height = podiumHeights[index]; const card = this.panel(this.page, podiumX[index], podiumY[index], 250, height, 44, new Color(0, 0, 0, 0), undefined, 0, false); card.name = 'HonoursWinner-' + entry.rank;
      const rank = this.label(card, this.bootstrap.remoteMode ? `#${entry.rank}` : 'YOU', 0, height / 2 - 27, 23, index === 0 ? C.paleGold : C.white, true, 100); this.addLabelOutline(rank, C.outline, 4);
      this.avatar(card, 0, index === 0 ? 42 : 32, entry.avatar, index === 0 ? 116 : 98);
      const nickname = this.label(card, entry.nickname, 0, -42, 27, C.white, true, 222); this.addLabelOutline(nickname, C.outline, 3); const wonCaption = this.label(card, tab === 'daily' ? 'TODAY WON' : tab === 'weekly' ? 'WEEK WON' : 'TOTAL WON', 0, -78, 24, C.white, true, 190); this.addLabelOutline(wonCaption, C.outline, 3);
      const winnings = this.label(card, this.format(entry.winnings), 0, -112, 29, C.paleGold, true, 210); this.addLabelOutline(winnings, C.outline, 4);
    });
    rows.slice(3, 8).forEach((entry, index) => { const y = 5 - index * 115; const row = this.panel(this.page, 0, y, 860, 84, 24, new Color(0, 0, 0, 0), undefined, 0, false); this.addSilkRankingRowMaterial(row, index, 860, 84, entry.current); const rank = this.label(row, `#${entry.rank}`, -370, 0, 23, entry.current ? C.white : C.paleGold, true, 90); this.addLabelOutline(rank, C.outline, 3); this.avatar(row, -287, 0, entry.avatar, 58); const nickname = this.label(row, entry.nickname, -126, 13, 23, C.white, true, 260); this.addLabelOutline(nickname, C.outline, 3); const context = this.label(row, entry.current ? 'YOU' : 'TOTAL WON', -126, -17, 15, entry.current ? C.cyan : C.white, true, 260); this.addLabelOutline(context, C.outline, 2); const winnings = this.label(row, this.format(entry.winnings), 300, 0, 26, C.paleGold, true, 220); this.addLabelOutline(winnings, C.outline, 4); });
    if (rankingsLoading || this.rankError) {
      this.label(this.page, rankingsLoading ? 'LOADING VERIFIED RANKINGS…' : this.rankError, 0, 160, 30, C.white, true, 760);
      if (this.rankError) this.button(this.page, 'TRY AGAIN', 0, 30, 390, 82, () => { this.rankError = ''; this.clearAll(); this.showRank(tab); }, 'primary');
    }
    if (!rankingsLoading && !this.rankError && rows.length === 0) {
      const empty = this.panel(this.page, 0, 176, 860, 430, 54, new Color(0, 0, 0, 0), undefined, 0, false); empty.name = 'VerifiedRankingsEmptyState';
      this.addFortuneDrumPodiumMaterial(empty, 0, 860, 430); this.addCardShine(empty, 824, 394, C.gold, 0.55);
      this.addCharacter(empty, 3, -292, -18, 255, 350, 235, 0.08); this.addPremiumSymbol(empty, GAME_CONFIGS[3], 'lift-vault', 294, 84, 138, 'pulse', 246, 0.16);
      const heading = this.artTitle(empty, 'THE VERIFIED HARVEST BOARD', 62, 130, 34, C.gold, 590); this.addLabelOutline(heading, C.outline, 5);
      const body = this.bootstrap.remoteMode ? 'NO VERIFIED WINNINGS HAVE ARRIVED FOR THIS PERIOD YET' : 'PLAY A ROUND TO START YOUR PERSONAL RECORD';
      const bodyLabel = this.label(empty, body, 70, 31, 19, C.white, true, 560); this.addLabelOutline(bodyLabel, C.outline, 3);
      const detail = this.label(empty, 'Only server-confirmed virtual-coin winnings appear here.\nNo opponents or prize totals are fabricated.', 70, -49, 18, C.muted, true, 560); detail.lineHeight = 27;
      this.addStatusChip(empty, 'VIRTUAL COINS • NO CASH VALUE', 70, -139, C.cyan, 350);
    }
    const rankFootnote = this.label(this.page, this.bootstrap.remoteMode ? 'VIRTUAL-COIN LEADERBOARD • NO CASH VALUE' : tab === 'all-time' ? 'LIFETIME LOCAL WINNINGS • NO CASH VALUE' : 'RECORDED WINS FROM YOUR LAST 200 TRANSACTIONS\nLOCAL HISTORY MAY NOT COVER THE FULL PERIOD', 0, -570, 25, C.white, true, 880); this.addLabelOutline(rankFootnote, C.outline, 3); this.bottomNav('rank');
  }

  private switchRankTab(tab: 'daily' | 'weekly' | 'all-time'): void {
    if (this.router.route !== 'rank') return;
    this.rankError = '';
    this.routeTransitionGeneration += 1;
    this.clearAll();
    this.showRank(tab);
    this.playPageReveal(true);
  }

  private showProfile(): void {
    this.paintBackdrop('profile', new Color(17, 31, 31), new Color(88, 111, 91)); this.topBar('PROFILE');
    this.addF12SceneAtmosphere(C.cyan, 'profile'); this.addF12SceneHeader('JADE KOI MEMBER LEDGER', 'IDENTITY • PROGRESS • PLAYER SERVICES', C.cyan, 620);
    const player = this.ensurePlayer(); const pass = this.panel(this.page, 0, 382, 890, 250, 44, new Color(0, 0, 0, 0), undefined, 0, false); pass.name = 'JadeKoiMemberLedger'; this.addMemberLedgerMaterial(pass, 890, 250); this.addCardShine(pass, 852, 216, C.paleGold, 0.5);
    this.avatar(pass, -318, 3, player.avatar, 136); const playerName = this.label(pass, player.nickname, -93, 70, 37, C.white, true, 430); this.addLabelOutline(playerName, C.outline, 5); const playerId = this.label(pass, `PLAYER ID  ${player.id.slice(-10).toUpperCase()}`, -85, 27, 18, C.white, true, 460); this.addLabelOutline(playerId, C.outline, 3); const membership = this.label(pass, `LEVEL ${player.level} • ${player.isGuest ? 'GUEST PASS' : 'HARVEST MEMBER'}`, -80, -12, 21, C.cyan, true, 470); this.addLabelOutline(membership, C.outline, 3); this.progress(pass, -72, -50, 390, player.experience % 100 / 100); this.button(pass, 'CHOOSE AVATAR', 248, -78, 250, 58, () => this.showAvatarPicker(), 'ghost'); this.addPremiumSymbol(pass, GAME_CONFIGS[1], 'jade-macaron', 326, 66, 86, 'pulse', 230);
    const stats = [['SPINS', player.gamesPlayed], ['BIGGEST WIN', player.biggestWin], ['TOTAL WIN', player.totalWin]] as const; stats.forEach(([name, value], index) => { const x = -296 + index * 296; const box = this.panel(this.page, x, 153, 262, 122, 30, new Color(0, 0, 0, 0), undefined, 0, false); this.addOpenLedgerStatMaterial(box, index, 262, 122); const caption = this.label(box, name, 0, 20, 18, C.white, true, 230); this.addLabelOutline(caption, C.outline, 3); const amount = this.label(box, this.format(value), 0, -22, 29, C.paleGold, true, 230); this.addLabelOutline(amount, C.outline, 4); });
    const entries: readonly [string, string, Route, Color, GameConfig, string][] = [['ACHIEVEMENTS', `${this.bootstrap.redDots.achievements()} READY`, 'achievements', C.violet, GAME_CONFIGS[1], 'fortune-cake'], ['INBOX', `${this.bootstrap.redDots.mail()} UNREAD`, 'mail', C.cyan, GAME_CONFIGS[2], 'ballroom-key'], ['SETTINGS', player.settings.quality.toUpperCase(), 'settings', C.gold, GAME_CONFIGS[0], 'bellhop-wild']];
    entries.forEach(([title, detail, route, color, config, symbol], index) => {
      const node = this.panel(this.page, 0, -44 - index * 206, 890, 182, 36, new Color(0, 0, 0, 0), undefined, 0, false); node.name = `MemberServiceBay-${route}`;
      this.addLedgerServiceBayMaterial(node, index, 890, 182, color);
      this.addPremiumSymbol(node, config, symbol, -344, 0, 102, 'pulse', 238, index * 0.15);
      const titleLabel = this.label(node, title, -65, 30, 34, C.white, true, 410); this.addLabelOutline(titleLabel, C.outline, 4);
      const detailLabel = this.label(node, detail, -65, -28, 29, C.white, true, 410); this.addLabelOutline(detailLabel, C.outline, 3);
      this.button(node, 'OPEN', 292, 0, 210, 108, () => this.router.go(route), 'ghost');
    });
    this.button(this.page, 'LOG OUT', 0, -655, 380, 100, () => { this.bootstrap.auth.logout(); this.router.reset('login'); }, 'ghost'); this.bottomNav('profile');
  }

  private showQuickTopUp(): void {
    const player = this.ensurePlayer(); const guest = player.isGuest; const card = this.modal(900, 1080);
    this.addCardMotes(card, 26, C.gold, 820, 980); this.addCardShine(card, 840, 1010, C.paleGold, 0.15);
    this.addPremiumSymbol(card, GAME_CONFIGS[2], 'champagne-vault', -330, 414, 112, 'pulse', 245);
    this.artTitle(card, 'GOLDEN HARVEST TREASURY', 40, 420, 45, C.gold, 650);
    this.label(card, guest ? 'SIGN IN TO PURCHASE VIRTUAL COINS' : 'SECURE APPLE IN-APP PURCHASE', 40, 360, 21, guest ? C.red : C.muted, true, 650);
    const balancePlate = this.panel(card, 0, 286, 720, 92, 30, new Color(63, 18, 25, 242), C.gold, 2, false);
    this.addPremiumSymbol(balancePlate, GAME_CONFIGS[0], 'coin-stack', -262, 0, 62, 'pulse', 245);
    this.label(balancePlate, this.format(this.bootstrap.economy.balance()), -10, 7, 40, C.paleGold, true, 430);
    this.label(balancePlate, 'CURRENT VIRTUAL COIN BALANCE', -10, -29, 16, C.muted, true, 430);
    const catalogViews = new Map<string, { price: Label; button: Button; buttonLabel?: Label }>();
    STORE_PRODUCTS.forEach((product, index) => {
      const column = index % 2; const row = Math.floor(index / 2); const x = column ? 204 : -204; const y = 88 - row * 278;
      const productCard = this.panel(card, x, y, 370, 238, 28, new Color(92, 31, 30, 246), index === 2 ? C.gold : C.coral, index === 2 ? 3 : 1, true, index, 230);
      const symbol = index === 0 ? 'coin-stack' : index === 1 ? 'champagne-vault' : index === 2 ? 'bellhop-cap' : 'bellhop-wild'; const symbolGame = index === 1 ? GAME_CONFIGS[2] : GAME_CONFIGS[0];
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
    AVATAR_SYMBOLS.forEach((_, index) => {
      const column = index % 4; const row = Math.floor(index / 4); const x = -270 + column * 180; const y = 225 - row * 205; const selected = index === player.avatar;
      const cell = this.panel(card, x, y, 150, 170, 30, selected ? new Color(116, 43, 32, 250) : new Color(66, 20, 27, 238), selected ? C.paleGold : C.coral, selected ? 4 : 1, true, index % 4, selected ? 255 : 190);
      this.avatar(cell, 0, 20, index, 108);
      this.label(cell, selected ? 'SELECTED' : `LUCK ${String(index + 1).padStart(2, '0')}`, 0, -59, 16, selected ? C.paleGold : C.muted, true, 126);
      const button = cell.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.94;
      cell.on(Node.EventType.TOUCH_START, () => { this.audio.play('tap'); this.vfx.buttonBurst(cell, selected ? C.paleGold : C.cyan); }, this);
      cell.on(Node.EventType.TOUCH_END, () => {
        void this.bootstrap.profile.setAvatar(index).then((ok) => {
          if (!ok) { this.toast('Unable to change avatar', C.red); return; }
          this.closeModal(card); this.toast('Golden Harvest avatar updated', C.green); if (this.router.route === 'profile') this.render('profile');
        });
      }, this);
    });
    this.button(card, 'CLOSE', 0, -414, 300, 58, () => this.closeModal(card), 'ghost');
  }

  private showCheckIn(): void {
    this.paintBackdrop('rewards', C.ink, new Color(199, 95, 55)); this.header('7-DAY GOLDEN HARVEST CHECK-IN', true);
    this.label(this.page, 'Build your lucky streak one day at a time', 0, 630, 23, C.muted);
    const state = this.bootstrap.save.currentScope()?.checkIn ?? { cycleDay: 0, lastClaimDate: null };
    const claimedToday = state.lastClaimDate === this.today();
    for (let index = 0; index < 7; index += 1) {
      const row = index < 4 ? 0 : 1; const column = row === 0 ? index : index - 4; const count = row === 0 ? 4 : 3;
      const x = (column - (count - 1) / 2) * (row === 0 ? 250 : 305); const y = row === 0 ? 300 : -40;
      const claimed = index < state.cycleDay; const current = !claimedToday && index === state.cycleDay; const next = claimedToday && index === state.cycleDay;
      const card = this.panel(this.page, x, y, row === 0 ? 210 : 260, 285, 24, current ? new Color(128, 49, 31) : next ? new Color(91, 61, 35) : C.panel, current ? C.gold : next ? C.cyan : C.coral, current ? 4 : next ? 2 : 1);
      this.label(card, `DAY ${index + 1}`, 0, 58, 19, current ? C.paleGold : C.muted, true); this.addPremiumSymbol(card, GAME_CONFIGS[0], index === 6 ? 'luggage-cart' : 'coin-stack', 0, 5, index === 6 ? 78 : 64, current ? 'pulse' : 'none', claimed ? 112 : 245, index * 0.06);
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
    this.paintBackdrop('wheel', C.ink, new Color(198, 76, 50)); this.header('GOLDEN HARVEST LUCKY WHEEL', true);
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
    this.addPremiumSymbol(wheel, GAME_CONFIGS[3], 'lift-vault', 0, 0, 82, 'pulse', 255, 0.1);

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
      this.addPremiumSymbol(card, GAME_CONFIGS[1], 'fortune-cake', -350, 4, 74, ready ? 'pulse' : 'none', ready ? 255 : 145, index * 0.08); this.label(card, achievement.title, -165, 32, 25, C.white, true, 420); this.label(card, `${state.progress} / ${achievement.target}`, -165, -2, 18, C.muted, false, 420); this.progress(card, -90, -42, 480, Math.min(1, state.progress / achievement.target));
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
      if (mail.kind === 'reward') this.addPremiumSymbol(card, GAME_CONFIGS[0], 'coin-stack', -345, 18, 70, 'pulse', state.read ? 145 : 250); else this.addInterfaceControlIcon(card, 'mail', -345, 18, 44, state.read ? C.muted : C.cyan, C.paleGold); this.label(card, mail.title, -135, 42, 25, C.white, true, 480); this.label(card, mail.body, -110, 2, 18, C.muted, false, 540); if (mail.credits) this.label(card, `ATTACHMENT  +${this.format(mail.credits)} CREDITS`, -115, -48, 17, C.paleGold, true, 520);
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
      'bellhop-bonanza': { duration: 1.25, status: (ratio) => ratio < 1 ? 'PREPARING THE GOLDEN GRANARY' : 'GRANARY READY' },
      'tea-vault-tumble': { duration: 1.25, status: (ratio) => ratio < 1 ? 'PREPARING THE LANTERN RIVER' : 'LANTERNS READY' },
      'ballroom-keyways': { duration: 2.45, status: (ratio) => ratio < 0.34 ? 'LIGHTING THE TREASURY' : ratio < 0.72 ? 'CALIBRATING RESPINS' : 'LOCKING BONUS COINS' },
      'penthouse-fortune-lift': { duration: 2.15, status: (ratio) => ratio < 0.34 ? 'POLISHING THE LUCKY REELS' : ratio < 0.72 ? 'WAKING THE PRIZE WHEEL' : 'OPENING THE CLASSIC PAVILION' },
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
    const cabinetPaths = ['art/granary-bank-cabinet', 'art/lantern-river-cabinet', 'art/jade-koi-cabinet', 'art/fortune-drum-cabinet'];
    const required = [cabinetPaths[heroIndex], symbolAtlasForGame(this.selectedGame).path, MachineControlAtlasCache.resourcePath(this.selectedGame.id, 'primary'), MachineControlAtlasCache.resourcePath(this.selectedGame.id, 'key')];
    let loaded = 0; let loadFailed = false;
    const fail = (): void => {
      if (loadFailed || generation !== this.loadingGeneration || !chamber.isValid) return;
      loadFailed = true;
      const status = chamber.getChildByName('LoadingPercent')?.getComponent(Label);
      if (status) status.string = 'CONNECTION INTERRUPTED · PLEASE RETRY';
      this.button(chamber, 'RETRY LOADING', 0, -280, 440, 78, () => { this.clearAll(); this.showGameLoading(); }, 'primary');
    };
    required.forEach(path => resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (generation !== this.loadingGeneration || loadFailed) return;
      if (error || !texture) { fail(); return; }
      loaded += 1;
    }));
    this.scheduleOnce(() => { if (loaded < required.length) fail(); }, 30);
    this.animateLoadingProgress(chamber, -350, -410, 650, 1.25, ratio => loadFailed ? 'CONNECTION INTERRUPTED · PLEASE RETRY' : loading.status(ratio), () => {
      if (generation !== this.loadingGeneration || this.router.route !== 'game-loading') return;
      // Let 100% register visually, then dissolve the loading chamber into the
      // matching cabinet instead of cutting between two dense illustrated scenes.
      tween(chamberOpacity).to(0.28, { opacity: 0 }, { easing: 'sineInOut' }).call(() => {
        if (generation === this.loadingGeneration && this.router.route === 'game-loading') this.router.replace('game');
      }).start();
    }, () => loadFailed ? -1 : loaded / required.length);
    const feature = this.label(chamber, `${this.selectedGame.feature.replace(/-/g, ' ').toUpperCase()}  •  VIRTUAL COINS`, 0, -495, 24, C.paleGold, true, 700); this.addLabelOutline(feature, C.outline, 4);
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
    // Each cabinet keeps its meters registered to the sockets painted into its
    // own photographed control deck, rather than sharing a generic HUD grid.
    this.balanceLabel = this.machineBalanceReadout(this.format(this.bootstrap.economy.balance()), readout.creditsX, readout.creditsY, readout.creditsWidth, readout.creditsHeight, layout.readoutFontSize, readout.creditsSurface);
    const winWindow = this.machineReadout('WIN', '0', readout.winX, readout.winY, readout.winWidth, readout.winHeight, layout.readoutFontSize, true, readout.splitWin); this.winLabel = winWindow;
    this.betLabel = this.machineBetReadout(this.format(this.bet()), readout.betX, readout.betY, readout.betWidth, readout.betHeight, layout.readoutFontSize, readout.betTone);
    this.machineButton('−', layout.minus.x, layout.minus.y, layout.minus.width, layout.minus.height, () => { this.betIndex = Math.max(0, this.betIndex - 1); this.refreshBet(); }, 'step', 'minus');
    this.machineButton('+', layout.plus.x, layout.plus.y, layout.plus.width, layout.plus.height, () => { this.betIndex = Math.min(this.selectedGame.bets.length - 1, this.betIndex + 1); this.refreshBet(); }, 'step', 'plus');
    const spin = this.machineButton('SPIN', layout.spin.x, layout.spin.y, layout.spin.width, layout.spin.height, () => void this.onSpin(), 'spin', 'spin'); this.spinButtonLabel = spin.getChildByName('MachineLabelPlaque')?.getChildByName('Text')?.getComponent(Label) ?? undefined;
    const autoActive = this.autoSpin.active || this.autoStartPending; const auto = this.machineButton('AUTO', layout.auto.x, layout.auto.y, layout.auto.width, layout.auto.height, () => void this.startAuto(), autoActive ? 'switch-on' : 'switch', 'auto'); this.autoStatusLamp = auto.getChildByName('MachineStatusLamp') ?? undefined; this.setAutoIndicator(autoActive);
    const turbo = this.machineButton('TURBO', layout.turbo.x, layout.turbo.y, layout.turbo.width, layout.turbo.height, () => this.toggleTurbo(), this.turbo ? 'switch-on' : 'switch', 'turbo'); this.turboStatusLamp = turbo.getChildByName('MachineStatusLamp') ?? undefined;
    const soundOn = this.ensurePlayer().settings.sound;
    // HOME, SOUND and RULES are part of the same fixed cabinet plane. Applying
    // an extra safe-area conversion here used to make them drift relative to
    // the photographed machine on short or wide devices.
    const sound = this.machineButton(soundOn ? 'SOUND ON' : 'SOUND OFF', layout.sound.x, layout.sound.y, layout.sound.width, layout.sound.height, () => this.toggleGameSound(), soundOn ? 'switch-on' : 'switch', 'sound'); this.soundStatusLamp = sound.getChildByName('MachineStatusLamp') ?? undefined;
    this.machineButton('RULES', layout.rules.x, layout.rules.y, layout.rules.width, layout.rules.height, () => this.showRules(), 'key', 'rules');
    this.machineButton('LOBBY', layout.home.x, layout.home.y, layout.home.width, layout.home.height, () => void this.leaveGame(), 'tool', 'home');
    if (this.forcedResult && !this.spinning) {
      const playVisiblePreview = (): void => {
        if (this.router.route !== 'game' || !this.forcedResult) return;
        const loader = typeof document !== 'undefined' ? document.getElementById('csw-preloader') : null;
        if (loader && !loader.classList.contains('is-ready')) { this.scheduleOnce(playVisiblePreview, 0.2); return; }
        this.scheduleOnce(() => { if (this.router.route === 'game' && this.forcedResult) void this.onSpin(); }, 0.55);
      };
      this.scheduleOnce(playVisiblePreview, 0.3);
    }
  }

  private addGameStage(layout: CabinetLayout, accent: Color): void {
    const width = layout.reelWidth + 8; const height = layout.reelHeight + 8;
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
    this.audio.play('reel-stop'); if (result.totalWin > 0) { this.audio.play('win'); this.audio.vibrate([30, 35, 45]); if (this.winLabel) this.winLabel.string = `+${this.format(result.totalWin)}`; this.vfx.pulse(this.winLabel?.node as Node); if (this.reelEngine) { this.vfx.pulse(this.reelEngine.node); this.reelEngine.presentWins(result, this.selectedGame); } const winColor = this.themeColor(this.selectedGame.id); const majorWin = result.totalWin / Math.max(1, this.bet()) >= 8; const finalBalance = this.bootstrap.economy.balance(); this.animateBalance(Math.max(0, finalBalance - result.totalWin), finalBalance, majorWin ? 1.25 : 0.9); const reelWorld = this.cabinetWorldPoint(cabinetLayout.reelX, cabinetLayout.reelY); const creditsWorld = this.cabinetWorldPoint(readoutLayout.creditsX, readoutLayout.creditsY); this.vfx.celebrateWin(reelWorld, winColor); this.vfx.royalWinShower(reelWorld, winColor, majorWin, this.selectedGame); this.vfx.flyCredits(reelWorld, creditsWorld); await this.presentAureliaWinStage(result); this.stateMachine.move('presenting-win'); }
    if (result.feature) { if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win') this.stateMachine.move('feature'); this.presentFeature(result); }
    if (this.stateMachine.state === 'evaluating' || this.stateMachine.state === 'presenting-win' || this.stateMachine.state === 'feature') this.stateMachine.move('settled'); this.stateMachine.move('idle');
    const launchQueuedSpin = this.queuedSpin && !this.autoSpin.active && this.router.route === 'game'; this.queuedSpin = false;
    this.spinning = undefined; this.releaseSpinIdleWaiters(); this.setSpinButtonState('SPIN'); if (this.winLabel && result.totalWin <= 0) this.winLabel.string = '0'; if (result.totalWin <= 0) this.refreshBalance();
    if (launchQueuedSpin) this.scheduleOnce(() => void this.onSpin(), 0.08);
    return true;
  }

  private presentFeature(result: SpinResult): void {
    if (result.feature?.type === 'bellhop-stacked-luggage') this.presentBellhopLuggageStage(result);
    else if (result.feature?.type === 'tea-vault-cascade') this.presentTeaVaultCascadeStage(result);
    else if (result.feature?.type === 'ballroom-key-path') this.presentBallroomKeyPathStage(result);
    else if (result.feature?.type === 'penthouse-lift') this.presentPenthouseLiftStage(result);
  }

  private featureCollectButton(modal: Node, total: number, color: Color, y: number): void {
    const amount = this.panel(modal, 0, y + 92, 610, 102, 34, new Color(54, 18, 33, 246), color, 2, false); this.addPremiumSymbol(amount, this.selectedGame, this.selectedGame.symbols.find((symbol) => symbol.tier === 'high')?.id ?? this.selectedGame.wildId, -240, 0, 70, 'pulse', 240); const value = this.label(amount, `+${this.format(total)}`, 20, 13, 43, C.paleGold, true, 430); this.addLabelOutline(value, C.outline, 5); this.label(amount, 'VIRTUAL COINS', 20, -28, 17, C.white, true, 420);
    this.button(modal, 'COLLECT', 0, y, 390, 72, () => this.closeModal(modal), 'primary');
  }

  private addAureliaFeatureBay(parent: Node, accent: Color, kind: 'luggage' | 'tea' | 'ballroom' | 'lift', width: number, height: number): Node {
    const bay = new Node(`AureliaFeatureBay-${kind}`); bay.layer = Layers.Enum.UI_2D; bay.addComponent(UITransform).setContentSize(width, height); parent.addChild(bay); bay.setSiblingIndex(0);
    const g = bay.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2;
    g.fillColor = new Color(43, 14, 27, 245); g.roundRect(-halfW, -halfH, width, height, 54); g.fill();
    g.fillColor = new Color(accent.r, accent.g, accent.b, 27); g.roundRect(-halfW + 24, -halfH + 24, width - 48, height - 48, 42); g.fill();
    g.strokeColor = new Color(112, 61, 31, 250); g.lineWidth = 10; g.roundRect(-halfW + 6, -halfH + 6, width - 12, height - 12, 50); g.stroke();
    g.strokeColor = new Color(255, 228, 150, 232); g.lineWidth = 3; g.roundRect(-halfW + 16, -halfH + 16, width - 32, height - 32, 44); g.stroke();
    g.strokeColor = new Color(accent.r, accent.g, accent.b, 170); g.lineWidth = 1.5; g.roundRect(-halfW + 28, -halfH + 28, width - 56, height - 56, 36); g.stroke();
    if (kind === 'luggage') {
      g.strokeColor = new Color(255, 225, 145, 100); g.lineWidth = 3;
      g.moveTo(-halfW + 82, -halfH + 160); g.quadraticCurveTo(0, -halfH + 105, halfW - 82, -halfH + 160); g.stroke();
      [-1, 0, 1].forEach((lane) => { g.strokeColor = new Color(accent.r, accent.g, accent.b, 58); g.lineWidth = 2; g.moveTo(-halfW + 92, lane * 116); g.lineTo(halfW - 92, lane * 116); g.stroke(); });
    } else if (kind === 'tea') {
      for (let step = 0; step < 5; step += 1) { const x = -halfW + 86 + step * 142; const y = -halfH + 145 + step * 88; g.fillColor = new Color(accent.r, accent.g, accent.b, 20 + step * 8); g.roundRect(x, y, 116, 62, 24); g.fill(); g.strokeColor = new Color(255, 226, 147, 78 + step * 22); g.lineWidth = 2; g.roundRect(x, y, 116, 62, 24); g.stroke(); }
    } else if (kind === 'ballroom') {
      g.strokeColor = new Color(accent.r, accent.g, accent.b, 95); g.lineWidth = 3; g.moveTo(-halfW + 95, -halfH + 190); g.quadraticCurveTo(0, halfH - 145, halfW - 95, -halfH + 190); g.stroke();
      g.strokeColor = new Color(255, 234, 166, 72); g.lineWidth = 1.5; g.moveTo(-halfW + 115, -halfH + 150); g.quadraticCurveTo(0, halfH - 205, halfW - 115, -halfH + 150); g.stroke();
    } else {
      g.strokeColor = new Color(255, 226, 146, 112); g.lineWidth = 4; g.roundRect(-175, -halfH + 118, 350, height - 260, 34); g.stroke();
      for (let floor = 0; floor < 8; floor += 1) { const y = -halfH + 162 + floor * 75; g.strokeColor = new Color(accent.r, accent.g, accent.b, 55 + floor * 10); g.lineWidth = 2; g.moveTo(-146, y); g.lineTo(146, y); g.stroke(); }
    }
    const opacity = bay.addComponent(UIOpacity); opacity.opacity = 205; tween(opacity).to(1.45, { opacity: 245 }, { easing: 'sineInOut' }).to(1.85, { opacity: 195 }, { easing: 'sineInOut' }).union().repeatForever().start();
    this.addCardShine(bay, width - 42, height - 42, accent, 0.15); return bay;
  }

  private presentBellhopLuggageStage(result: SpinResult): void {
    const feature = result.featureResult; const rounds = feature?.rounds ?? []; const accent = new Color(255, 167, 112); const modal = this.modal(900, 1110);
    this.addAureliaFeatureBay(modal, accent, 'luggage', 820, 1020); this.addCardMotes(modal, 28, C.gold, 790, 960);
    this.artTitle(modal, 'SUITE TOWER BONANZA', 0, 442, 44, accent, 720); this.label(modal, 'SIX ARRIVALS  •  ONE FULL LUGGAGE TOWER EACH ROUND', 0, 390, 18, C.white, true, 740);
    const rail = new Node('BellhopSuiteRail'); rail.layer = Layers.Enum.UI_2D; rail.addComponent(UITransform).setContentSize(720, 570); rail.setPosition(0, 56); modal.addChild(rail);
    rounds.slice(0, 6).forEach((round, index) => {
      const x = -230 + (index % 3) * 230; const y = 155 - Math.floor(index / 3) * 260; const tower = this.panel(rail, x, y, 192, 220, 30, new Color(82, 27, 31, 238), index % 2 ? C.gold : accent, 3, false); tower.setScale(new Vec3(0.72, 0.72, 1));
      this.addPremiumSymbol(tower, this.selectedGame, index % 3 === 2 ? 'bellhop-wild' : index % 2 ? 'luggage-cart' : 'luggage-stack', 0, 40, 112, 'pulse', 245, index * 0.08);
      const suite = this.label(tower, `SUITE ${index + 1}`, 0, -55, 19, C.paleGold, true, 150); this.addLabelOutline(suite, C.outline, 3);
      const column = this.label(tower, `TOWER ${Number(round.expandedColumn ?? 0) + 1}  •  +${this.format(round.credits)}`, 0, -84, 16, C.white, true, 170); this.addLabelOutline(column, C.outline, 2);
      tween(tower).delay(0.12 + index * 0.08).to(0.35, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' }).to(0.16, { scale: Vec3.ONE }).start();
    });
    const cart = new Node('BellhopArrivalCart'); cart.layer = Layers.Enum.UI_2D; cart.addComponent(UITransform).setContentSize(130, 130); cart.setPosition(-325, -260); modal.addChild(cart); this.addPremiumSymbol(cart, this.selectedGame, 'luggage-cart', 0, 0, 124, 'pulse', 245); const cartOpacity = cart.addComponent(UIOpacity); cartOpacity.opacity = 0;
    tween(cart).delay(0.55).to(2.1, { position: new Vec3(325, -260, 0) }, { easing: 'sineInOut' }).call(() => cart.setPosition(-325, -260)).delay(1.1).union().repeatForever().start(); tween(cartOpacity).delay(0.55).to(0.22, { opacity: 245 }).delay(1.45).to(0.28, { opacity: 0 }).delay(1.8).union().repeatForever().start();
    this.featureCollectButton(modal, feature?.totalCredits ?? 0, accent, -440);
  }

  private presentTeaVaultCascadeStage(result: SpinResult): void {
    const feature = result.featureResult; const rounds = feature?.rounds ?? []; const accent = new Color(129, 229, 186); const modal = this.modal(900, 1110);
    this.addAureliaFeatureBay(modal, accent, 'tea', 820, 1020); this.addCardMotes(modal, 32, new Color(255, 182, 157), 790, 960);
    this.artTitle(modal, 'TEA VAULT TUMBLE', 0, 442, 48, accent, 720); this.label(modal, 'WINNING TRAYS TUMBLE  •  THE SERVING MULTIPLIER WARMS TO 10×', 0, 386, 18, C.white, true, 750);
    const tray = new Node('TeaCascadeTray'); tray.layer = Layers.Enum.UI_2D; tray.addComponent(UITransform).setContentSize(720, 585); tray.setPosition(0, 40); modal.addChild(tray);
    const visibleRounds = rounds.slice(Math.max(0, rounds.length - 5));
    visibleRounds.forEach((round, index) => {
      const x = -250 + index * 126; const y = -150 + index * 94; const step = this.panel(tray, x, y, 150, 145, 30, new Color(25, 76, 66, 240), index === visibleRounds.length - 1 ? C.gold : accent, 3, false);
      this.addPremiumSymbol(step, this.selectedGame, index === visibleRounds.length - 1 ? 'tea-wild' : index % 2 ? 'fortune-cake' : 'tea-trolley', 0, 28, 82, 'pulse', 245, index * 0.1);
      const multiplier = this.label(step, `${round.multiplier ?? 1}×`, 0, -40, 27, C.paleGold, true, 110); this.addLabelOutline(multiplier, C.outline, 4);
      const payout = this.label(step, `+${this.format(round.credits)}`, 0, -68, 15, C.white, true, 125); this.addLabelOutline(payout, C.outline, 2);
      step.setScale(new Vec3(0.68, 0.68, 1)); tween(step).delay(index * 0.16).to(0.4, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'backOut' }).to(0.2, { scale: Vec3.ONE }).start();
    });
    const trolley = new Node('TeaTrolleyClimber'); trolley.layer = Layers.Enum.UI_2D; trolley.addComponent(UITransform).setContentSize(104, 104); trolley.setPosition(-330, -245); modal.addChild(trolley); this.addPremiumSymbol(trolley, this.selectedGame, 'tea-trolley', 0, 0, 100, 'pulse', 242); const trolleyOpacity = trolley.addComponent(UIOpacity); trolleyOpacity.opacity = 0;
    tween(trolley).delay(0.7).to(1.65, { position: new Vec3(286, 215, 0) }, { easing: 'sineInOut' }).call(() => trolley.setPosition(-330, -245)).delay(1.45).union().repeatForever().start(); tween(trolleyOpacity).delay(0.7).to(0.2, { opacity: 245 }).delay(1.02).to(0.3, { opacity: 0 }).delay(2.28).union().repeatForever().start();
    this.label(modal, `${rounds.length} TUMBLES RESOLVED  •  PEAK ${rounds.reduce((peak, round) => Math.max(peak, round.multiplier ?? 1), 1)}×`, 0, -315, 23, C.white, true, 700);
    this.featureCollectButton(modal, feature?.totalCredits ?? 0, accent, -440);
  }

  private presentBallroomKeyPathStage(result: SpinResult): void {
    const feature = result.featureResult; const rounds = feature?.rounds ?? []; const collected = rounds.reduce((max, round) => Math.max(max, round.collectedKeys ?? 0), 0); const accent = new Color(126, 220, 240); const modal = this.modal(900, 1080);
    this.addAureliaFeatureBay(modal, accent, 'ballroom', 820, 990); this.addCardMotes(modal, 32, accent, 790, 920);
    this.artTitle(modal, 'BALLROOM KEYWAYS', 0, 426, 48, accent, 720); this.label(modal, 'SIX DANCES  •  COLLECT KEYS TO OPEN THE CHAMPAGNE VAULT', 0, 369, 18, C.white, true, 740);
    const path = new Node('BallroomKeyPath'); path.layer = Layers.Enum.UI_2D; path.addComponent(UITransform).setContentSize(720, 530); path.setPosition(0, 40); modal.addChild(path);
    const milestones = [{ keys: 3, multiplier: 2, x: -230, y: -125 }, { keys: 6, multiplier: 3, x: 0, y: 62 }, { keys: 9, multiplier: 5, x: 230, y: -125 }];
    milestones.forEach((milestone, index) => {
      const unlocked = collected >= milestone.keys; const station = this.panel(path, milestone.x, milestone.y, 195, 205, 42, new Color(unlocked ? 35 : 47, unlocked ? 72 : 35, unlocked ? 82 : 52, 242), unlocked ? accent : C.muted, unlocked ? 4 : 2, false);
      this.addPremiumSymbol(station, this.selectedGame, unlocked ? (index === 2 ? 'champagne-vault' : 'ballroom-key') : 'invitation-scatter', 0, 40, 108, unlocked ? 'pulse' : 'none', unlocked ? 250 : 118, index * 0.12);
      const keyCopy = this.label(station, `${milestone.keys} KEYS`, 0, -48, 20, unlocked ? C.paleGold : C.muted, true, 150); this.addLabelOutline(keyCopy, C.outline, 3);
      const multiplier = this.label(station, `${milestone.multiplier}× VAULT`, 0, -79, 18, unlocked ? C.white : C.muted, true, 160); this.addLabelOutline(multiplier, C.outline, 2);
      if (unlocked) tween(station).to(0.7 + index * 0.14, { scale: new Vec3(1.045, 1.045, 1) }, { easing: 'sineInOut' }).to(0.8, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
    const dancer = new Node('BallroomKeyDancer'); dancer.layer = Layers.Enum.UI_2D; dancer.addComponent(UITransform).setContentSize(112, 112); dancer.setPosition(-320, -230); modal.addChild(dancer); this.addPremiumSymbol(dancer, this.selectedGame, 'ballroom-wild', 0, 0, 108, 'pulse', 248); const dancerOpacity = dancer.addComponent(UIOpacity); dancerOpacity.opacity = 0;
    tween(dancer).delay(0.55).to(0.72, { position: new Vec3(-230, -85, 0), angle: 5 }, { easing: 'backOut' }).to(0.72, { position: new Vec3(0, 100, 0), angle: -4 }, { easing: 'backOut' }).to(0.72, { position: new Vec3(230, -85, 0), angle: 4 }, { easing: 'backOut' }).call(() => dancer.setPosition(-320, -230)).delay(1.2).union().repeatForever().start(); tween(dancerOpacity).delay(0.55).to(0.18, { opacity: 245 }).delay(1.72).to(0.28, { opacity: 0 }).delay(2.27).union().repeatForever().start();
    this.label(modal, `${collected} KEYS COLLECTED  •  ${collected >= 9 ? '5× GRAND PATH OPEN' : collected >= 6 ? '3× CHAMPAGNE PATH OPEN' : collected >= 3 ? '2× BALLROOM PATH OPEN' : 'NEXT VAULT AT 3 KEYS'}`, 0, -295, 21, C.white, true, 730);
    this.featureCollectButton(modal, feature?.totalCredits ?? 0, accent, -420);
  }

  private presentPenthouseLiftStage(result: SpinResult): void {
    const feature = result.featureResult; const rounds = feature?.rounds ?? []; const last = rounds[rounds.length - 1]; const reachedFloor = last?.floor ?? rounds.length; const accent = new Color(255, 201, 111); const modal = this.modal(900, 1130);
    this.addAureliaFeatureBay(modal, accent, 'lift', 820, 1040); this.addCardMotes(modal, 32, accent, 790, 980);
    this.artTitle(modal, 'PENTHOUSE FORTUNE LIFT', 0, 450, 44, accent, 740); this.label(modal, 'THE DESTINATION IS LOCKED BEFORE THE GOLDEN DOORS OPEN', 0, 396, 18, C.white, true, 720);
    const lift = new Node('FortuneLiftJourney'); lift.layer = Layers.Enum.UI_2D; lift.addComponent(UITransform).setContentSize(710, 610); lift.setPosition(0, 40); modal.addChild(lift);
    for (let floor = 1; floor <= 8; floor += 1) {
      const active = floor <= reachedFloor; const side = floor % 2 ? -1 : 1; const y = -220 + (floor - 1) * 66; const station = this.panel(lift, side * 245, y, 150, 54, 18, new Color(active ? 92 : 44, active ? 53 : 32, active ? 28 : 41, 238), active ? accent : C.muted, active ? 3 : 1, false);
      const copy = this.label(station, `FLOOR ${floor}`, 17, 0, 16, active ? C.white : C.muted, true, 102); this.addLabelOutline(copy, C.outline, 2);
      this.addPremiumSymbol(station, this.selectedGame, floor === reachedFloor ? 'lift-vault' : floor % 2 ? 'penthouse-key' : 'treasure-case', -50, 0, 44, active ? 'pulse' : 'none', active ? 236 : 82, floor * 0.04);
    }
    const car = this.panel(lift, 0, -220, 280, 170, 34, new Color(62, 24, 28, 248), accent, 5, false); this.addPremiumSymbol(car, this.selectedGame, 'penthouse-wild', 0, 31, 116, 'pulse', 250); const floorCopy = this.label(car, `ARRIVING  ${Math.max(1, reachedFloor)}`, 0, -58, 22, C.paleGold, true, 220); this.addLabelOutline(floorCopy, C.outline, 4);
    tween(car).delay(0.45).to(1.7, { position: new Vec3(0, Math.min(240, -220 + Math.max(1, reachedFloor) * 61), 0) }, { easing: 'cubicOut' }).to(0.12, { scale: new Vec3(1.06, 0.96, 1) }, { easing: 'sineOut' }).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    const jackpot = (feature?.jackpot ?? 'mini').toUpperCase(); const jackpotLabel = this.artTitle(modal, `${jackpot} VAULT`, 0, -300, 39, feature?.jackpot === 'grand' ? C.gold : accent, 650); this.addLabelOutline(jackpotLabel, C.outline, 4);
    this.featureCollectButton(modal, feature?.totalCredits ?? 0, accent, -450);
  }

  private presentAureliaWinStage(result: SpinResult): Promise<void> {
    const ratio = result.totalWin / Math.max(1, this.bet()); const title = ratio >= 50 ? 'EPIC WIN' : ratio >= 20 ? 'MEGA WIN' : ratio >= 8 ? 'BIG WIN' : ratio >= 2 ? 'GREAT WIN' : 'NICE WIN'; const color = this.themeColor(this.selectedGame.id); const major = ratio >= 8; const duration = ratio >= 50 ? 4.5 : ratio >= 20 ? 3.9 : ratio >= 8 ? 3.35 : 2.45;
    const root = new Node('AureliaTreasuryCelebration'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(W, H); this.overlay.addChild(root);
    this.addWinLightCurtain(root, color, major, duration);
    const rays = this.addWinRayHalo(root, 0, 86, color, major); rays.setScale(new Vec3(0.5, 0.5, 1)); const rayOpacity = rays.addComponent(UIOpacity); rayOpacity.opacity = 0; tween(rays).to(0.52, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }).by(duration + 1.15, { angle: major ? 72 : 52 }).start(); tween(rayOpacity).to(0.18, { opacity: major ? 224 : 188 }).delay(duration).to(0.34, { opacity: 0 }).start();
    // Celebrate in the cabinet's own space. Never place a full-scene poster over it.
    const stage = new Node('CabinetWinChoreography'); stage.layer = Layers.Enum.UI_2D;
    stage.addComponent(UITransform).setContentSize(800, 660); stage.setPosition(0, -10);
    stage.setScale(new Vec3(0.98, 0.98, 1)); root.addChild(stage);
    const stageOpacity = stage.addComponent(UIOpacity); stageOpacity.opacity = 0;
    this.addWinStageFootlights(stage, color, 285, -200);
    const brand = this.label(stage, 'GOLDEN HARVEST', 0, 296, 25, C.paleGold, true, 650); this.addLabelOutline(brand, C.outline, 4);
    const winTitle = this.artTitle(stage, title, 0, 218, major ? 78 : 66, this.mix(color, C.paleGold, 0.62), 720); this.addLabelOutline(winTitle, C.outline, 6);
    {
      const fallback = winTitle.node.parent;
      resources.load(`art/f12-${title.split(' ')[0].toLowerCase()}-win-enamel/texture`, Texture2D, (error, texture) => {
        if (error || !texture || !stage.isValid) return;
        const image = new Node('EnamelWinTitle'); image.layer = Layers.Enum.UI_2D;
        const scale = Math.min(740 / texture.width, 170 / texture.height);
        image.addComponent(UITransform).setContentSize(texture.width * scale, texture.height * scale);
        image.setPosition(0, 210); stage.addChild(image);
        const frame = new SpriteFrame(); frame.texture = texture;
        const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = frame;
        if (fallback?.isValid) fallback.active = false;
        const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
        image.setScale(new Vec3(0.96, 0.96, 1));
        tween(opacity).to(0.24, { opacity: 255 }, { easing: 'sineOut' }).start();
        tween(image).to(0.38, { scale: Vec3.ONE }, { easing: 'sineOut' })
          .by(1.6, { position: new Vec3(0, 5, 0) }, { easing: 'sineInOut' })
          .by(1.6, { position: new Vec3(0, -5, 0) }, { easing: 'sineInOut' }).start();
      });
    }
    const subtitle = this.label(stage, major ? 'A GOLDEN HARVEST' : 'FORTUNE FOUND', 0, 100, 22, C.white, true, 620); this.addLabelOutline(subtitle, C.outline, 4);
    const amountHalo = this.addWinAmountHalo(stage, color, major, 8); const initialAmount = Math.max(1, Math.floor(result.totalWin * 0.025));
    const amount = this.label(stage, `+${this.format(initialAmount)}`, 0, 8, major ? 74 : 62, C.white, true, 620); amount.node.name = 'AureliaWinAmount'; this.addLabelOutline(amount, new Color(62, 15, 19, 255), 7);
    const multiplier = this.label(stage, `${ratio.toFixed(ratio >= 10 ? 0 : 1)}× TOTAL BET`, 0, -88, 24, C.paleGold, true, 520); this.addLabelOutline(multiplier, C.outline, 4);
    const premiumSymbol = this.selectedGame.symbols.find((symbol) => symbol.tier === 'high')?.id ?? this.selectedGame.wildId;
    this.addPremiumSymbol(stage, this.selectedGame, premiumSymbol, -265, -128, 128, 'pulse', 250); this.addPremiumSymbol(stage, this.selectedGame, this.selectedGame.wildId, 265, -128, 128, 'orbit', 250, 0.16);
    const counter = { value: initialAmount }; tween(counter).delay(0.48).to(Math.min(1.65, duration * 0.48), { value: result.totalWin }, { easing: 'cubicOut', onUpdate: () => { if (amount.node.isValid) amount.string = `+${this.format(counter.value)}`; } }).call(() => { if (!amount.node.isValid) return; amount.string = `+${this.format(result.totalWin)}`; tween(amount.node).to(0.1, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'sineOut' }).to(0.26, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); tween(amountHalo).to(0.1, { scale: new Vec3(1.13, 1.13, 1) }, { easing: 'sineOut' }).to(0.34, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }).start();
    if (major) tween(root).delay(ratio >= 50 ? 1.35 : 1.05).call(() => { if (!root.isValid) return; this.audio.play('reward'); this.audio.vibrate(ratio >= 50 ? [24, 42, 52] : [18, 34, 34]); this.vfx.royalWinShower(new Vec3(0, 70, 0), color, true, this.selectedGame); }).start();
    return new Promise((resolve) => {
      let completed = false;
      const finish = (): void => { if (completed) return; completed = true; if (this.skipWinPresentation === skip) this.skipWinPresentation = undefined; Tween.stopAllByTarget(counter); if (root.isValid) { this.stopNodeTweens(root); root.destroy(); } resolve(); };
      const skip = (): void => {
        if (completed || !root.isValid) { finish(); return; }
        Tween.stopAllByTarget(counter); counter.value = result.totalWin; if (amount.node.isValid) { amount.string = `+${this.format(result.totalWin)}`; amount.node.setScale(Vec3.ONE); }
        this.stopNodeTweens(root);
        // Fade the entire composition, including rays, when skipping — no hard light cut.
        const exitOpacity = root.getComponent(UIOpacity) ?? root.addComponent(UIOpacity);
        tween(exitOpacity).to(0.24, { opacity: 0 }, { easing: 'sineInOut' }).call(finish).start();
      };
      this.skipWinPresentation = skip;
      tween(stage).to(0.42, { scale: Vec3.ONE }, { easing: 'sineOut' }).start();
      // Cleanup belongs to the fade timeline so the last frames are never cut short.
      tween(stageOpacity).to(0.2, { opacity: 255 }, { easing: 'quadOut' }).delay(duration)
        .to(0.36, { opacity: 0 }, { easing: 'sineInOut' }).call(finish).start();
    });
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

  private presentWinSplash(result: SpinResult): Promise<void> {
    const ratio = result.totalWin / Math.max(1, this.bet()); const title = ratio >= 50 ? 'EPIC WIN' : ratio >= 20 ? 'MEGA WIN' : ratio >= 8 ? 'BIG WIN' : ratio >= 2 ? 'GREAT WIN' : 'NICE WIN'; const color = this.themeColor(this.selectedGame.id); const major = ratio >= 8; const duration = ratio >= 50 ? 4.25 : ratio >= 20 ? 3.7 : ratio >= 8 ? 3.15 : 2.25;
    const root = new Node('WinCelebration'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(W, H); this.overlay.addChild(root);
    // Do not dim the full cabinet. Previous full-screen black glass read as a
    // shadow-frame bug; the local ray halo and framed artwork supply focus.
    this.addWinLightCurtain(root, color, major, duration);
    const rays = this.addWinRayHalo(root, 0, 105, color, major); rays.setScale(new Vec3(0.42, 0.42, 1)); const rayOpacity = rays.addComponent(UIOpacity); rayOpacity.opacity = 0; tween(rays).to(0.48, { scale: new Vec3(1.02, 1.02, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }).by(duration + 1.2, { angle: 64 }).start(); tween(rayOpacity).to(0.2, { opacity: 220 }).delay(duration).to(0.38, { opacity: 0 }).start();
    const card = new Node('WinSplash'); card.layer = Layers.Enum.UI_2D; card.addComponent(UITransform).setContentSize(920, major ? 540 : 470); card.setPosition(0, 92); root.addChild(card); const opacity = card.addComponent(UIOpacity); opacity.opacity = 0; card.setScale(new Vec3(0.42, 0.42, 1));
    const winArtIndex = Math.max(0, GAME_CONFIGS.indexOf(this.selectedGame));
    const stage = new Node('AureliaWinStage'); stage.layer = Layers.Enum.UI_2D; stage.addComponent(UITransform).setContentSize(900, major ? 510 : 440); card.addChild(stage); const g = stage.addComponent(Graphics); const halfH = major ? 232 : 197;
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
    const eyebrow = this.label(card, major ? 'GOLDEN HARVEST  •  LANTERN DISTRICT OVATION' : 'GOLDEN HARVEST WIN', 0, major ? 176 : 145, 19, C.paleGold, true, 620); this.addLabelOutline(eyebrow, C.outline, 3);
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

  private async updatePlayerSettings(settings: Partial<ReturnType<AureliaApp['ensurePlayer']>['settings']>, applied?: () => void): Promise<void> {
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
    const scatterCopy = this.selectedGame.feature === 'penthouse-lift' ? '3 FLOOR BONUSES OPEN THE PREDETERMINED FORTUNE LIFT'
      : this.selectedGame.feature === 'tea-vault-cascade' ? 'TEA CLUSTERS TUMBLE WITH A RISING SERVING-TRAY MULTIPLIER'
        : this.selectedGame.feature === 'bellhop-stacked-luggage' ? '3 SUITE KEYS AWARD 6 STACKED-LUGGAGE SUITE ROUNDS'
          : '3 GRAND INVITATIONS AWARD 6 GOLDEN-KEY BALLROOM ROUNDS';
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
    const image = new Node('TitleLogoImage'); image.layer = Layers.Enum.UI_2D; root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const gameId = this.selectedGame.id;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    GameTitleAtlasCache.load(gameId, () => {
      if (!root.isValid || !image.isValid) return;
      const frame = GameTitleAtlasCache.frame(gameId); if (!frame) return;
      sprite.spriteFrame = frame; const transform = image.getComponent(UITransform) as UITransform; const aspect = Math.max(0.1, frame.rect.width / Math.max(1, frame.rect.height)); const maxWidth = width * 0.96; const maxHeight = height * 0.94; const fittedWidth = Math.min(maxWidth, maxHeight * aspect); const fittedHeight = fittedWidth / aspect; transform.setContentSize(fittedWidth, fittedHeight);
      image.setScale(Vec3.ONE); image.setPosition(0, 0); fallbackOpacity.opacity = 0;
      if (reducedMotion) { opacity.opacity = 255; return; }
      tween(opacity).to(0.28, { opacity: 255 }, { easing: 'quadOut' }).start();
      // Keep the optical baseline fixed: only a restrained metal-light breath.
      tween(image).to(3.2, { scale: new Vec3(1.008, 1.008, 1) }, { easing: 'sineInOut' }).to(3.2, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
      const stencil = new Node('TitleLetterStencil'); stencil.layer = Layers.Enum.UI_2D; image.addChild(stencil);
      stencil.addComponent(UITransform).setContentSize(fittedWidth, fittedHeight);
      const mask = stencil.addComponent(Mask); mask.type = Mask.Type.SPRITE_STENCIL; mask.spriteFrame = frame; mask.alphaThreshold = 0.15;
      const maskSprite = stencil.getComponent(Sprite); if (maskSprite) maskSprite.sizeMode = Sprite.SizeMode.CUSTOM;
      stencil.getComponent(UITransform)?.setContentSize(fittedWidth, fittedHeight);
      const sweep = new Node('LetterSurfaceShimmer'); sweep.layer = Layers.Enum.UI_2D; stencil.addChild(sweep);
      sweep.addComponent(UITransform).setContentSize(100, fittedHeight * 3);
      const graphics = sweep.addComponent(Graphics);
      for (let band = 0; band < 12; band += 1) {
        graphics.fillColor = new Color(255, 249, 222, Math.round(38 * (1 - Math.abs(band - 5.5) / 6)));
        graphics.rect((band - 6) * 8, -fittedHeight * 1.5, 8, fittedHeight * 3); graphics.fill();
      }
      sweep.angle = -18; sweep.setPosition(-fittedWidth * 0.65, 0);
      tween(sweep).delay(0.7).to(1.6, { position: new Vec3(fittedWidth * 0.65, 0, 0) }, { easing: 'sineInOut' }).delay(3.8).set({ position: new Vec3(-fittedWidth * 0.65, 0, 0) }).union().repeatForever().start();
    });
    return root;
  }

  private addJackpotStrip(layout: CabinetLayout, readout: CabinetReadoutLayout): void {
    const values: Readonly<Record<GameId, string>> = {
      'bellhop-bonanza': '7,500×', 'tea-vault-tumble': '10,000×', 'ballroom-keyways': '10,000×', 'penthouse-fortune-lift': '2,500×',
    };
    // Each generated marquee has different optical padding, so TOP WIN uses a
    // cabinet-specific baseline and contrast treatment instead of a formula.
    // The two-tier typography keeps the label and value legible on a 390px
    // phone while the translucent enamel rail still reads as cabinet hardware.
    const displayWidth = Math.min(500, layout.jackpotWidth - 20); const displayHeight = readout.topWinHeight;
    const node = new Node('GrandJackpotDisplay'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(displayWidth, displayHeight); node.setPosition(readout.topWinX, readout.topWinY); this.page.addChild(node);
    const material = MACHINE_MATERIALS[this.selectedGame.id]; const accent = this.themeColor(this.selectedGame.id); const g = node.addComponent(Graphics); const radius = Math.max(14, displayHeight * 0.46);
    g.fillColor = material.meterFill; g.roundRect(-displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight, radius); g.fill();
    g.fillColor = material.meterInner; g.roundRect(-displayWidth / 2 + 7, -displayHeight / 2 + 7, displayWidth - 14, displayHeight - 14, Math.max(10, radius - 6)); g.fill();
    g.strokeColor = material.edge; g.lineWidth = 4; g.roundRect(-displayWidth / 2 + 2, -displayHeight / 2 + 2, displayWidth - 4, displayHeight - 4, radius - 2); g.stroke();
    g.strokeColor = material.highlight; g.lineWidth = 1.5; g.roundRect(-displayWidth / 2 + 7, -displayHeight / 2 + 7, displayWidth - 14, displayHeight - 14, Math.max(10, radius - 6)); g.stroke();
    g.strokeColor = new Color(material.highlight.r, material.highlight.g, material.highlight.b, 132); g.lineWidth = 1; g.moveTo(-displayWidth / 2 + 28, displayHeight / 2 - 9); g.lineTo(displayWidth / 2 - 28, displayHeight / 2 - 9); g.stroke();
    const outlineColor = material.outline; const titleSize = Math.max(23, Math.min(31, displayHeight * 0.68)); const valueSize = titleSize + 2;
    // Every cabinet now treats TOP WIN as a small piece of theme artwork,
    // rather than a pale utility label. The coloured underprint gives the
    // letters a hand-painted marquee edge while the dark outline preserves
    // legibility over both ivory and mahogany cabinet surfaces.
    const glowTitle = this.label(node, 'TOP WIN', -displayWidth * 0.24, -1, titleSize + 1, readout.topWinGlowTone, true, displayWidth * 0.38); glowTitle.node.name = 'GrandTitleGlow'; glowTitle.enableWrapText = false; this.addLabelOutline(glowTitle, outlineColor, 5); const glowOpacity = glowTitle.node.addComponent(UIOpacity); glowOpacity.opacity = 62; tween(glowOpacity).to(1.1, { opacity: 126 }, { easing: 'sineInOut' }).to(1.25, { opacity: 50 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const title = this.label(node, 'TOP WIN', -displayWidth * 0.24, 1, titleSize, readout.topWinTitleTone, true, displayWidth * 0.38); title.node.name = 'GrandTitle'; title.enableWrapText = false; this.addLabelOutline(title, outlineColor, 3);
    const divider = new Node('GrandDivider'); divider.layer = Layers.Enum.UI_2D; divider.addComponent(UITransform).setContentSize(26, displayHeight - 10); node.addChild(divider); const dividerGraphics = divider.addComponent(Graphics); dividerGraphics.strokeColor = new Color(material.edge.r, material.edge.g, material.edge.b, 218); dividerGraphics.lineWidth = 2; dividerGraphics.moveTo(0, -displayHeight * 0.22); dividerGraphics.lineTo(0, displayHeight * 0.22); dividerGraphics.stroke(); dividerGraphics.strokeColor = new Color(material.highlight.r, material.highlight.g, material.highlight.b, 110); dividerGraphics.lineWidth = 4; dividerGraphics.moveTo(0, -displayHeight * 0.12); dividerGraphics.lineTo(0, displayHeight * 0.12); dividerGraphics.stroke();
    const valueGlow = this.label(node, values[this.selectedGame.id], displayWidth * 0.24, -1, valueSize + 1, readout.topWinGlowTone, true, displayWidth * 0.40); valueGlow.node.name = 'GrandValueGlow'; valueGlow.enableWrapText = false; this.addLabelOutline(valueGlow, outlineColor, 5); const valueGlowOpacity = valueGlow.node.addComponent(UIOpacity); valueGlowOpacity.opacity = 40; tween(valueGlowOpacity).delay(0.28).to(1.15, { opacity: 96 }, { easing: 'sineInOut' }).to(1.3, { opacity: 34 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const value = this.label(node, values[this.selectedGame.id], displayWidth * 0.24, 1, valueSize, readout.topWinValueTone, true, displayWidth * 0.40); value.node.name = 'GrandValue'; value.enableWrapText = false; this.addLabelOutline(value, outlineColor, 3);
    const glint = new Node('TopWinLightSweep'); glint.layer = Layers.Enum.UI_2D; glint.addComponent(UITransform).setContentSize(54, displayHeight - 12); glint.setPosition(-displayWidth * 0.42, 0); glint.angle = -14; node.addChild(glint); const glintGraphics = glint.addComponent(Graphics); glintGraphics.fillColor = new Color(255, 253, 224, 48); glintGraphics.roundRect(-16, -displayHeight / 2, 32, displayHeight, 12); glintGraphics.fill(); glintGraphics.fillColor = new Color(accent.r, accent.g, accent.b, 28); glintGraphics.roundRect(-27, -displayHeight / 2, 54, displayHeight, 16); glintGraphics.fill(); const glintOpacity = glint.addComponent(UIOpacity); glintOpacity.opacity = 0; tween(glint).delay(0.65).to(1.25, { position: new Vec3(displayWidth * 0.42, 0, 0) }, { easing: 'sineInOut' }).call(() => glint.setPosition(-displayWidth * 0.42, 0)).delay(2.25).union().repeatForever().start(); tween(glintOpacity).delay(0.65).to(0.18, { opacity: 190 }, { easing: 'sineOut' }).delay(0.64).to(0.28, { opacity: 0 }, { easing: 'sineInOut' }).delay(3.05).union().repeatForever().start();
  }

  private addMachineFeatureConsole(layout: CabinetLayout, accent: Color): void {
    if (this.selectedGame.id === 'bellhop-bonanza') { this.addLuggageSuiteConsole(layout, accent); return; }
    if (this.selectedGame.id === 'tea-vault-tumble') { this.addTeaTrayConsole(layout, accent); return; }
    if (this.selectedGame.id === 'ballroom-keyways') { this.addBallroomKeyConsole(layout, accent); return; }
    this.addFortuneLiftConsole(layout, accent);
  }

  private featureConsoleBase(name: string, x: number, y: number, width: number, height: number, accent: Color): Node {
    const node = new Node(name); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const g = node.addComponent(Graphics); g.fillColor = new Color(42, 14, 24, 220); g.roundRect(-width / 2, -height / 2, width, height, Math.min(24, height * 0.32)); g.fill();
    g.fillColor = new Color(accent.r, accent.g, accent.b, 25); g.roundRect(-width / 2 + 8, 1, width - 16, height / 2 - 9, Math.min(15, height * 0.2)); g.fill();
    g.strokeColor = new Color(117, 64, 34, 248); g.lineWidth = 5; g.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, Math.min(22, height * 0.29)); g.stroke();
    g.strokeColor = new Color(255, 224, 139, 224); g.lineWidth = 1.5; g.roundRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16, Math.min(16, height * 0.22)); g.stroke();
    return node;
  }

  private addLuggageSuiteConsole(layout: CabinetLayout, accent: Color): void {
    const node = this.featureConsoleBase('LuggageSuiteConsole', 0, layout.featureY, layout.featureWidth, 104, accent);
    const heading = this.label(node, 'SUITE TOWERS', -220, 28, 21, C.paleGold, true, 210); this.addLabelOutline(heading, C.outline, 3);
    const mode = this.label(node, '6 ARRIVALS', 230, 28, 19, C.white, true, 180); this.addLabelOutline(mode, C.outline, 3);
    const symbols = ['luggage-stack', 'luggage-cart', 'bellhop-wild'];
    symbols.forEach((symbolId, index) => {
      const station = this.panel(node, -118 + index * 118, -25, 102, 50, 17, new Color(78, 29, 32, 238), index === 2 ? C.gold : accent, 2, false);
      this.addPremiumSymbol(station, this.selectedGame, symbolId, -28, 0, 43, 'pulse', 238, index * 0.08);
      const copy = this.label(station, index === 2 ? 'WILD' : `TOWER ${index + 1}`, 18, 0, 13, C.white, true, 62); this.addLabelOutline(copy, C.outline, 2);
      const opacity = station.addComponent(UIOpacity); opacity.opacity = 150; tween(opacity).delay(index * 0.22).to(0.48, { opacity: 255 }, { easing: 'sineOut' }).to(0.72, { opacity: 155 }, { easing: 'sineInOut' }).delay(1.1).union().repeatForever().start();
    });
  }

  private addTeaTrayConsole(layout: CabinetLayout, accent: Color): void {
    const node = this.featureConsoleBase('TeaTrayMultiplierConsole', 0, layout.featureY, layout.featureWidth, 104, accent);
    const heading = this.label(node, 'SERVING TRAY', -220, 28, 21, new Color(226, 255, 236), true, 210); this.addLabelOutline(heading, C.outline, 3);
    const mode = this.label(node, 'CLUSTER TUMBLE', 210, 28, 18, C.white, true, 220); this.addLabelOutline(mode, C.outline, 3);
    const multipliers = [1, 2, 3, 5, 10];
    multipliers.forEach((value, index) => {
      const x = -192 + index * 96; const tray = this.panel(node, x, -25, 82, 48, 16, new Color(28, 70, 61, 238), index === 0 ? C.gold : accent, index === 0 ? 3 : 1, false);
      this.addPremiumSymbol(tray, this.selectedGame, index === 4 ? 'tea-wild' : index % 2 ? 'fortune-cake' : 'tea-trolley', -21, 0, 37, index === 0 ? 'pulse' : 'none', index === 0 ? 236 : 124, index * 0.07);
      const copy = this.label(tray, `${value}×`, 20, 0, 17, index === 0 ? C.paleGold : C.white, true, 40); this.addLabelOutline(copy, C.outline, 2);
      if (index === 0) tween(tray).to(0.9, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'sineInOut' }).to(1.05, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
    });
  }

  private addBallroomKeyConsole(layout: CabinetLayout, accent: Color): void {
    const node = this.featureConsoleBase('BallroomKeyConsole', 0, layout.featureY, layout.featureWidth, 112, accent);
    const heading = this.label(node, 'KEY PATH', -226, 33, 21, new Color(218, 250, 255), true, 190); this.addLabelOutline(heading, C.outline, 3);
    const mode = this.label(node, '1024 WAYS', 224, 33, 19, C.white, true, 180); this.addLabelOutline(mode, C.outline, 3);
    [{ key: 3, mult: 2 }, { key: 6, mult: 3 }, { key: 9, mult: 5 }].forEach((milestone, index) => {
      const station = this.panel(node, -126 + index * 126, -25, 112, 58, 19, new Color(31, 53, 72, 242), index === 0 ? C.gold : accent, 2, false);
      this.addPremiumSymbol(station, this.selectedGame, index === 2 ? 'champagne-vault' : 'ballroom-key', -31, 0, 49, index === 0 ? 'pulse' : 'none', index === 0 ? 238 : 145, index * 0.09);
      const copy = this.label(station, `${milestone.key}  ${milestone.mult}×`, 20, 0, 16, C.white, true, 64); this.addLabelOutline(copy, C.outline, 2);
    });
  }

  private addFortuneLiftConsole(layout: CabinetLayout, accent: Color): void {
    const node = this.featureConsoleBase('FortuneLiftConsole', 0, layout.featureY, layout.featureWidth, 112, accent);
    const heading = this.label(node, 'FORTUNE LIFT', -215, 33, 21, C.paleGold, true, 210); this.addLabelOutline(heading, C.outline, 3);
    const mode = this.label(node, '512 TWO-WAY', 210, 33, 18, C.white, true, 210); this.addLabelOutline(mode, C.outline, 3);
    const floors = [2, 4, 6, 8]; const names = ['MINI', 'MINOR', 'MAJOR', 'GRAND'];
    floors.forEach((floor, index) => {
      const station = this.panel(node, -180 + index * 120, -25, 106, 58, 18, new Color(76, 39, 25, 240), index === 3 ? C.gold : accent, 2, false);
      this.addPremiumSymbol(station, this.selectedGame, index === 3 ? 'lift-vault' : index % 2 ? 'treasure-case' : 'penthouse-key', -31, 0, 47, index === 0 ? 'pulse' : 'none', index === 0 ? 238 : 142, index * 0.08);
      const floorCopy = this.label(station, `${floor}F`, 17, 8, 16, C.white, true, 54); this.addLabelOutline(floorCopy, C.outline, 2);
      const nameCopy = this.label(station, names[index], 17, -12, 10, C.paleGold, true, 58); this.addLabelOutline(nameCopy, C.outline, 2);
    });
  }

  private machineReadout(title: string, value: string, x: number, y: number, width: number, height: number, fontSize: number, prominent = false, split = false): Label {
    const node = new Node(`${title}Readout`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const material = MACHINE_MATERIALS[this.selectedGame.id]; const g = node.addComponent(Graphics); const radius = Math.max(11, height * 0.38);
    const paintWindow = (centerX: number, windowWidth: number): void => {
      const left = centerX - windowWidth / 2;
      g.fillColor = material.meterFill; g.roundRect(left, -height / 2, windowWidth, height, radius); g.fill();
      g.fillColor = material.meterInner; g.roundRect(left + 6, -height / 2 + 6, windowWidth - 12, height - 12, Math.max(8, radius - 5)); g.fill();
      g.strokeColor = material.edge; g.lineWidth = 4; g.roundRect(left + 2, -height / 2 + 2, windowWidth - 4, height - 4, radius - 2); g.stroke();
      g.strokeColor = material.highlight; g.lineWidth = 1.25; g.roundRect(left + 7, -height / 2 + 7, windowWidth - 14, height - 14, Math.max(7, radius - 6)); g.stroke();
      g.strokeColor = new Color(material.highlight.r, material.highlight.g, material.highlight.b, 112); g.lineWidth = 1; g.moveTo(left + 14, height / 2 - 8); g.lineTo(left + windowWidth - 14, height / 2 - 8); g.stroke();
    };
    const titleX = split ? -width * 0.36 : -width * 0.31; const titleWidth = split ? width * 0.22 : width * 0.27; const valueX = split ? width * 0.36 : width * 0.13; const valueWidth = split ? width * 0.24 : width * 0.58;
    if (split) { paintWindow(titleX, titleWidth + 8); paintWindow(valueX, valueWidth + 8); } else paintWindow(0, width);
    const titleLabel = this.label(node, title, titleX, 0, Math.max(15, Math.min(19, height * 0.43)), material.label, true, titleWidth); titleLabel.enableWrapText = false; titleLabel.node.name = 'ReadoutTitle'; this.addLabelOutline(titleLabel, material.outline, 2);
    const label = this.label(node, value, valueX, 0, Math.max(27, Math.min(38, fontSize + height * 0.31)), material.value, true, valueWidth); label.node.name = 'ReadoutText'; label.enableWrapText = false; this.addLabelOutline(label, material.outline, prominent ? 3 : 2);
    return label;
  }

  private machineBalanceReadout(value: string, x: number, y: number, width: number, height: number, fontSize: number, surface: 'light' | 'dark'): Label {
    const node = new Node('CREDITSReadout'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const material = MACHINE_MATERIALS[this.selectedGame.id]; const iconWidth = 58; const topUpWidth = 54; const valueWidth = width - iconWidth - topUpWidth - 8;
    const onDark = surface === 'dark'; const valueColor = onDark ? material.value : new Color(22, 69, 57); const outline = onDark ? material.outline : new Color(material.highlight.r, material.highlight.g, material.highlight.b, 250);
    // The manufactured balance rail belongs above the reels on every F7 cabinet.
    // Its enamel and metal now inherit the actual cabinet finish instead of a
    // global burgundy HUD skin.
    const g = node.addComponent(Graphics); const inset = 3; const railHeight = height - 4; const radius = Math.max(15, railHeight * 0.46);
    g.fillColor = onDark ? material.meterFill : new Color(239, 228, 195, 246); g.roundRect(-width / 2, -railHeight / 2, width, railHeight, radius); g.fill();
    g.fillColor = onDark ? material.meterInner : new Color(255, 246, 216, 222); g.roundRect(-width / 2 + 7, -railHeight / 2 + 7, width - 14, railHeight - 14, Math.max(10, radius - 6)); g.fill();
    g.strokeColor = material.edge; g.lineWidth = 5; g.roundRect(-width / 2 + inset, -railHeight / 2 + inset, width - inset * 2, railHeight - inset * 2, radius - 3); g.stroke();
    g.strokeColor = material.highlight; g.lineWidth = 1.5; g.roundRect(-width / 2 + 8, -railHeight / 2 + 8, width - 16, railHeight - 16, Math.max(9, radius - 7)); g.stroke();
    g.strokeColor = new Color(material.highlight.r, material.highlight.g, material.highlight.b, 140); g.lineWidth = 1; g.moveTo(-width / 2 + 30, railHeight / 2 - 9); g.lineTo(width / 2 - 30, railHeight / 2 - 9); g.stroke();
    const creditSymbol = this.selectedGame.id === 'tea-vault-tumble' ? 'gold-coins' : this.selectedGame.id === 'ballroom-keyways' ? 'gold-chip' : 'coin-stack'; this.addPremiumSymbol(node, this.selectedGame, creditSymbol, -width / 2 + 31, 0, Math.min(46, height - 4), 'pulse', 245);
    const valueX = -width / 2 + iconWidth + valueWidth / 2; const valueSize = Math.max(25, Math.min(42, height * 0.74)); const label = this.label(node, value, valueX, 0, valueSize, valueColor, true, valueWidth); label.node.name = 'ReadoutText'; label.enableWrapText = false; this.addLabelOutline(label, outline, onDark ? 3 : 2);
    const topUp = this.button(node, '+', width / 2 - 28, 0, Math.min(48, height - 4), Math.min(48, height - 4), () => this.showQuickTopUp(), 'lobby-secondary'); topUp.name = 'CreditsTopUpButton'; return label;
  }

  private machineBetReadout(value: string, x: number, y: number, width: number, height: number, fontSize: number, tone: Color): Label {
    const node = new Node('BETReadout'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y); this.page.addChild(node);
    const material = MACHINE_MATERIALS[this.selectedGame.id]; const g = node.addComponent(Graphics); const radius = Math.max(14, height * 0.43);
    g.fillColor = new Color(tone.r, tone.g, tone.b, 238); g.roundRect(-width / 2, -height / 2, width, height, radius); g.fill();
    g.fillColor = material.meterInner; g.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, Math.max(9, radius - 6)); g.fill();
    g.strokeColor = material.edge; g.lineWidth = 4; g.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, radius - 2); g.stroke();
    g.strokeColor = material.highlight; g.lineWidth = 1.5; g.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, Math.max(8, radius - 6)); g.stroke();
    const betSymbol = this.selectedGame.id === 'bellhop-bonanza' ? 'coin-stack' : this.selectedGame.id === 'tea-vault-tumble' ? 'gold-coins' : this.selectedGame.id === 'ballroom-keyways' ? 'gold-chip' : 'coin-stack'; this.addPremiumSymbol(node, this.selectedGame, betSymbol, -width * 0.35, 0, Math.min(38, height - 8), 'pulse', 230);
    const betTitle = this.label(node, 'BET', -width * 0.13, 8, Math.max(13, Math.min(16, height * 0.3)), material.label, true, width * 0.22); betTitle.enableWrapText = false; this.addLabelOutline(betTitle, material.outline, 2);
    const label = this.label(node, value, width * 0.19, -4, Math.max(31, Math.min(39, fontSize + 15)), material.value, true, width * 0.48); label.node.name = 'ReadoutText'; label.enableWrapText = false; this.addLabelOutline(label, material.outline, 3); return label;
  }

  private machineButton(text: string, x: number, y: number, width: number, height: number, action: () => void, kind: 'spin' | 'step' | 'switch' | 'switch-on' | 'key' | 'tool', icon: MachineControlIcon): Node {
    const node = new Node(`MachineButton-${kind}`); node.layer = Layers.Enum.UI_2D;
    // Keep the manufactured art unchanged while giving the primary control a
    // forgiving 196×196 logical hit target. This absorbs small finger drift
    // on tall phones without colliding with the neighbouring cabinet keys.
    const hitWidth = icon === 'spin' ? Math.max(220, width) : icon === 'auto' ? Math.max(116, width) : width; const hitHeight = icon === 'spin' ? Math.max(220, height) : icon === 'auto' ? Math.max(116, height) : height;
    node.addComponent(UITransform).setContentSize(hitWidth, hitHeight); node.setPosition(x, y); this.page.addChild(node); const accent = this.themeColor(this.selectedGame.id); const material = MACHINE_MATERIALS[this.selectedGame.id];
    // The photographed enamel cap is the whole button, not a skin behind a
    // second little red plaque. Live lettering sits directly on the material.
    const labelY = 0;
    const plaqueWidth = width * (icon === 'spin' ? 0.66 : 0.78);
    const plaqueHeight = icon === 'spin' ? 52 : 40;
    const plaque = new Node('MachineLabelPlaque'); plaque.layer = Layers.Enum.UI_2D; plaque.addComponent(UITransform).setContentSize(plaqueWidth, plaqueHeight); plaque.setPosition(0, labelY); node.addChild(plaque);
    const displayText = icon === 'sound' ? 'SOUND' : text;
    const lightCap = this.selectedGame.id === 'penthouse-fortune-lift' || (icon === 'spin' && this.selectedGame.id === 'bellhop-bonanza');
    const ink = lightCap ? new Color(66, 30, 17) : new Color(255, 245, 206);
    const label = this.label(plaque, displayText, 0, 0, icon === 'spin' ? 40 : icon === 'plus' || icon === 'minus' ? 36 : 23, ink, true, plaqueWidth); label.node.name = 'Text'; label.enableWrapText = false;
    this.addLabelOutline(label, lightCap ? new Color(255, 238, 176) : new Color(42, 20, 17), lightCap ? 1 : 2.5);
    const iconNode = this.addMachineControlIcon(node, width, height, icon, kind === 'switch-on');
    plaque.setSiblingIndex(node.children.length - 1);
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
    let actionLocked = false; let touchActionDispatched = false; const invokeAction = (): void => {
      if (actionLocked) return; actionLocked = true; action(); this.scheduleOnce(() => { actionLocked = false; }, 0.1);
    };
    node.on(Node.EventType.TOUCH_START, () => {
      this.audio?.play('tap'); this.audio?.vibrate(10); pressCap();
      // SPIN and AUTO are the two time-critical cabinet controls. Fire them on
      // press so a small finger drift cannot cause Cocos' completed-click
      // gesture to disappear before the action is dispatched.
      if (icon === 'spin' || icon === 'auto') { touchActionDispatched = true; invokeAction(); }
    }, this);
    node.on(Node.EventType.TOUCH_END, releaseCap, this);
    node.on(Node.EventType.TOUCH_CANCEL, releaseCap, this);
    // CLICK is also wired for SPIN/AUTO so keyboard activation, accessibility
    // bridges and synthetic mouse input cannot miss the action. A completed
    // touch emits CLICK after TOUCH_START, so consume that one duplicate only.
    node.on(Button.EventType.CLICK, () => {
      if (touchActionDispatched) { touchActionDispatched = false; return; }
      invokeAction();
    }, this); return node;
  }

  private setSpinButtonState(state: 'SPIN' | 'STOP' | 'WAIT' | 'NEXT'): void {
    const label = this.spinButtonLabel; if (!label?.node?.isValid) return;
    label.string = state;
    // F12 hardware is unlettered. Its live caption must remain visible at rest.
    const plaque = label.node.parent;
    if (plaque) plaque.active = true;
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
    const buttonRoot = lamp.parent;
    const atlasSprite = buttonRoot?.getChildByName('ControlIcon-auto')?.getChildByName('ControlAtlasClip')?.getChildByName('ControlAtlasImage')?.getComponent(Sprite); if (atlasSprite) atlasSprite.color = active ? new Color(205, 255, 213) : Color.WHITE;
    if (active) tween(lamp).to(0.52, { scale: new Vec3(1.24, 1.24, 1) }, { easing: 'sineInOut' }).to(0.64, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private setMachineSwitchIndicator(lamp: Node | undefined, active: boolean, icon: 'turbo' | 'sound'): void {
    if (!lamp?.isValid) return;
    Tween.stopAllByTarget(lamp); lamp.setScale(Vec3.ONE); this.paintMachineStatusLamp(lamp, active);
    const buttonRoot = lamp.parent;
    const atlasSprite = buttonRoot?.getChildByName(`ControlIcon-${icon}`)?.getChildByName('ControlAtlasClip')?.getChildByName('ControlAtlasImage')?.getComponent(Sprite);
    if (atlasSprite) atlasSprite.color = active ? new Color(205, 255, 213) : Color.WHITE;
    if (active) tween(lamp).to(0.52, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'sineInOut' }).to(0.64, { scale: Vec3.ONE }, { easing: 'sineInOut' }).union().repeatForever().start();
  }

  private addMachineBackPlate(parent: Node, width: number, height: number, accent: Color): void {
    const plate = new Node('BackMetalPlate'); plate.layer = Layers.Enum.UI_2D; plate.addComponent(UITransform).setContentSize(width, height); parent.addChild(plate); plate.setSiblingIndex(0); const g = plate.addComponent(Graphics); const circular = Math.abs(width - height) < 8; const material = MACHINE_MATERIALS[this.selectedGame.id];
    if (circular) {
      // These utility keys are cabinet-mounted service medallions. A short
      // inward-facing metal neck visually joins each key to the machine's
      // shoulder, so it never reads as a floating HUD badge over the room.
      const radius = Math.min(width, height) / 2; const inward = parent.position.x < 0 ? 1 : -1; const neckLength = 34; const neckX = inward * (radius + neckLength * 0.36);
      g.fillColor = material.meterFill; g.roundRect(neckX - neckLength / 2, -10, neckLength, 20, 8); g.fill();
      g.strokeColor = new Color(accent.r, accent.g, accent.b, 170); g.lineWidth = 2; g.moveTo(neckX - neckLength / 2, 7); g.lineTo(neckX + neckLength / 2, 7); g.stroke();
      g.fillColor = material.meterFill; g.circle(0, 0, radius); g.fill(); g.strokeColor = material.edge; g.lineWidth = 8; g.circle(0, -1, radius - 5); g.stroke(); g.strokeColor = material.highlight; g.lineWidth = 3.5; g.circle(0, 0, radius - 9); g.stroke(); g.strokeColor = new Color(material.highlight.r, material.highlight.g, material.highlight.b, 190); g.lineWidth = 1.5; g.arc(0, 0, radius - 14, 0.36, 2.52, false); g.stroke();
      [[-1, 0], [1, 0], [0, 1], [0, -1]].forEach(([sx, sy]) => { const jewelX = sx * (radius - 10); const jewelY = sy * (radius - 10); g.fillColor = material.label; g.circle(jewelX, jewelY, 3.5); g.fill(); g.fillColor = material.value; g.circle(jewelX - 1, jewelY + 1, 0.9); g.fill(); });
    } else {
      const radius = height * 0.48; g.fillColor = material.meterFill; g.roundRect(-width / 2, -height / 2, width, height, radius); g.fill(); g.strokeColor = material.edge; g.lineWidth = 6; g.roundRect(-width / 2 + 3, -height / 2 + 2, width - 6, height - 6, radius - 2); g.stroke(); g.strokeColor = material.highlight; g.lineWidth = 2.5; g.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, radius - 6); g.stroke(); g.strokeColor = new Color(material.highlight.r, material.highlight.g, material.highlight.b, 170); g.lineWidth = 1; g.moveTo(-width / 2 + radius, height / 2 - 8); g.lineTo(width / 2 - radius, height / 2 - 8); g.stroke(); g.fillColor = material.label; g.circle(width / 2 - 18, 0, 4); g.fill();
    }
  }

  private addMachineKeyEmphasis(parent: Node, width: number, height: number, kind: 'spin' | 'step' | 'switch' | 'switch-on' | 'key' | 'tool', accent: Color): void {
    const plate = new Node('MachineKeyEmphasis'); plate.layer = Layers.Enum.UI_2D; plate.addComponent(UITransform).setContentSize(width, height); parent.addChild(plate); plate.setSiblingIndex(0); const g = plate.addComponent(Graphics); const inset = Math.max(4, Math.min(width, height) * 0.09); const circular = Math.abs(width - height) < 8; const active = kind === 'spin' || kind === 'switch-on'; const material = MACHINE_MATERIALS[this.selectedGame.id];
    g.fillColor = new Color(material.meterInner.r, material.meterInner.g, material.meterInner.b, active ? 56 : 18); g.strokeColor = active ? material.highlight : new Color(material.edge.r, material.edge.g, material.edge.b, 145); g.lineWidth = active ? 3 : 1.5;
    if (circular) { g.circle(0, 0, Math.max(4, Math.min(width, height) / 2 - inset)); g.fill(); g.stroke(); }
    else { const radius = Math.max(8, height * 0.36); g.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, radius); g.fill(); g.stroke(); }
    if (kind === 'spin') { const opacity = plate.addComponent(UIOpacity); opacity.opacity = 150; tween(opacity).to(1.05, { opacity: 238 }, { easing: 'sineInOut' }).to(1.15, { opacity: 145 }, { easing: 'sineInOut' }).union().repeatForever().start(); }
  }

  private addMachineCaptionPlaque(parent: Node, text: string, y: number, accent: Color): void {
    const caption = text === 'PAYOUT' ? 'PAYS' : text; const width = caption === 'RULES' ? 84 : Math.max(70, Math.min(82, 34 + caption.length * 8)); const height = 30; const plate = new Node('MachineCaptionPlaque'); plate.layer = Layers.Enum.UI_2D; plate.addComponent(UITransform).setContentSize(width, height); plate.setPosition(0, y + 2); parent.addChild(plate); const g = plate.addComponent(Graphics); const material = MACHINE_MATERIALS[this.selectedGame.id];
    g.fillColor = material.buttonPlaqueFill; g.roundRect(-width / 2, -height / 2, width, height, 9); g.fill(); g.strokeColor = material.edge; g.lineWidth = 4; g.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 8); g.stroke(); g.strokeColor = material.buttonPlaqueStroke; g.lineWidth = 1.5; g.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 7); g.stroke();
    g.fillColor = material.label; g.circle(-width / 2 + 8, 0, 2.5); g.fill(); g.circle(width / 2 - 8, 0, 2.5); g.fill();
    const label = this.label(plate, caption, 0, 0, 16, material.value, true, width - 10); label.enableWrapText = false; label.node.name = 'CaptionText'; this.addLabelOutline(label, material.outline, 2);
  }

  private addMachineControlIcon(parent: Node, width: number, height: number, icon: MachineControlIcon, active: boolean): Node {
    const unit = Math.min(width, height); const utility = icon === 'home' || icon === 'sound' || icon === 'rules';
    // The generated atlas cells retain generous transparent cutting margins.
    // Scale the finished caps past their logical key size so their metal lips
    // seat into the photographed sockets instead of hovering as tiny badges.
    const visualSize = unit;
    const node = new Node(`ControlIcon-${icon}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(width, height); parent.addChild(node);
    // The four control atlases deliberately use different silhouettes
    // (round, octagonal, scalloped and hexagonal). A circular runtime mask
    // made them all look identical and clipped their manufactured edges.
    const clip = new Node('ControlAtlasClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(visualSize, visualSize); node.addChild(clip);
    const image = new Node('ControlAtlasImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(visualSize, visualSize); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const fallback = new Node('ControlFallback'); fallback.layer = Layers.Enum.UI_2D; fallback.addComponent(UITransform).setContentSize(visualSize, visualSize); node.addChild(fallback); const fallbackGraphics = fallback.addComponent(Graphics); const material = MACHINE_MATERIALS[this.selectedGame.id]; fallbackGraphics.fillColor = material.buttonPlaqueFill; fallbackGraphics.circle(0, 0, visualSize * 0.44); fallbackGraphics.fill(); fallbackGraphics.strokeColor = material.buttonPlaqueStroke; fallbackGraphics.lineWidth = Math.max(2, visualSize * 0.04); fallbackGraphics.circle(0, 0, visualSize * 0.42); fallbackGraphics.stroke();
    // Functional captions remain visible below the control while its atlas is
    // loading. Avoid flashing text glyphs such as ↻, ♪ or ⌂ that read as cheap
    // placeholder icons before the cabinet-specific artwork arrives.
    const gameId = this.selectedGame.id;
    const base = new Node(`MachinedSocket-${icon}`); base.layer = Layers.Enum.UI_2D;
    base.addComponent(UITransform).setContentSize(width * 1.035, height * 1.06);
    base.setPosition(0, icon === 'spin' ? -8 : -5); parent.addChild(base); base.setSiblingIndex(0);
    const baseSprite = base.addComponent(Sprite); baseSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    baseSprite.color = new Color(112, 69, 33);
    const applyFrame = (): void => {
      if (!node.isValid || !image.isValid) return; const frame = MachineControlAtlasCache.frame(gameId, icon); if (!frame) return;
      sprite.spriteFrame = frame; opacity.opacity = 255; fallback.active = false;
      baseSprite.spriteFrame = frame;
      image.getComponent(UITransform)?.setContentSize(width, height);
      // Blank F12 caps need legible live captions, above the cap sprite.
      const plaque = parent.getChildByName('MachineLabelPlaque');
      if (plaque) { plaque.active = true; plaque.setPosition(0, 0); }
    };
    applyFrame(); MachineControlAtlasCache.preload(gameId, applyFrame);
    return node;
  }

  private topBar(title = 'HOME'): void {
    const player = this.ensurePlayer(); const y = this.topY(800);
    const identity = this.panel(this.page, -350, y, 330, 104, 34, new Color(50, 20, 34, 242), LOBBY.rubyLight, 2, false); identity.name = 'FortuneIdentityPod';
    this.avatar(identity, -112, 0, player.avatar, 76); const displayName = this.label(identity, title === 'HOME' ? player.nickname : title, 36, 16, 25, LOBBY.ivory, true, 205); this.addLabelOutline(displayName, LOBBY.ink, 3);
    const clubLine = this.label(identity, player.isGuest ? 'GUEST PASS' : title === 'HOME' ? `LEVEL ${player.level} • GOLDEN HARVEST PASS` : 'LANTERN DISTRICT', 36, -20, 16, player.isGuest ? LOBBY.champagne : LOBBY.muted, true, 205); this.addLabelOutline(clubLine, LOBBY.ink, 2);
    const emblem = this.addBrandEmblem(this.page, 0, y, 94); emblem.name = 'TopAureliaGrandSeal';
    if (title === 'HOME') {
      const mail = this.button(this.page, '', -142, y, 72, 72, () => this.router.go('mail'), 'ghost'); mail.name = 'TopMailButton'; this.addInterfaceControlIcon(mail, 'mail', 0, 0, 35, C.white, this.bootstrap.redDots.mail() > 0 ? C.red : C.cyan);
    }
    const wallet = this.panel(this.page, 350, y, 330, 104, 34, new Color(50, 20, 34, 246), LOBBY.gold, 2, false); wallet.name = 'FortuneWalletPod';
    this.addPremiumSymbol(wallet, GAME_CONFIGS[0], 'coin-stack', -112, 0, 60, 'pulse', 255); this.balanceLabel = this.label(wallet, this.format(player.credits), 8, 15, 30, LOBBY.champagne, true, 176); this.addLabelOutline(this.balanceLabel, LOBBY.ink, 3);
    const walletLine = this.label(wallet, player.isGuest ? 'PLAY COINS' : 'VIRTUAL COINS', 8, -22, 16, LOBBY.muted, true, 176); this.addLabelOutline(walletLine, LOBBY.ink, 2);
    this.button(wallet, '+', 126, 0, 58, 58, () => this.showQuickTopUp(), player.isGuest ? 'ghost' : 'lobby-secondary');
  }

  private header(title: string, back: boolean, showBalance = false): void {
    const bar = this.panel(this.page, 0, this.topY(800), 1020, 120, 26, LOBBY.panel, LOBBY.gold, 1);
    if (back) this.navigationBackButton(bar, () => this.router.route === 'game' ? this.router.reset('home') : this.router.back('home')); this.label(bar, title, 0, 0, 30, C.paleGold, true, 650);
    if (showBalance) { this.addPremiumSymbol(bar, GAME_CONFIGS[0], 'coin-stack', 275, 0, 42, 'pulse', 230); this.balanceLabel = this.label(bar, this.format(this.bootstrap.economy.balance()), 380, 0, 21, C.white, true, 190); }
  }

  private navigationBackButton(parent: Node, action: () => void): void {
    this.button(parent, 'BACK', -395, 0, 176, 62, action, 'ghost');
  }

  private bottomNav(active: 'home' | 'store' | 'rewards' | 'rank' | 'profile'): void {
    const barY = -SafeAreaAdapter.visibleHeight / 2 + NAV_H / 2 + SafeAreaAdapter.safeBottom; const bar = this.panel(this.navigation, 0, barY, 920, 126, 46, new Color(45, 17, 31, 250), LOBBY.gold, 2, false); bar.name = 'AureliaOrbitDock';
    const rail = new Node('OrbitDockRail'); rail.layer = Layers.Enum.UI_2D; rail.addComponent(UITransform).setContentSize(820, 74); rail.setPosition(0, 8); bar.addChild(rail); const railGraphics = rail.addComponent(Graphics); railGraphics.strokeColor = new Color(126, 200, 200, 112); railGraphics.lineWidth = 2; railGraphics.arc(0, -140, 385, 0.22, Math.PI - 0.22, false); railGraphics.stroke();
    const items: readonly [typeof active, string, Route][] = [['home', 'HOME', 'home'], ['store', 'STORE', 'store'], ['rewards', 'REWARDS', 'rewards'], ['rank', 'RANK', 'rank'], ['profile', 'PROFILE', 'profile']];
    const art: readonly [GameConfig, string][] = [[GAME_CONFIGS[0], 'bellhop-wild'], [GAME_CONFIGS[2], 'champagne-vault'], [GAME_CONFIGS[1], 'fortune-cake'], [GAME_CONFIGS[3], 'lift-vault'], [GAME_CONFIGS[3], 'treasure-case']];
    items.forEach(([id, text, route], index) => {
      const x = -348 + index * 174; const raised = id === active ? 14 : index === 2 ? 5 : 0; const item = new Node(`OrbitNav-${id}`); item.layer = Layers.Enum.UI_2D; item.addComponent(UITransform).setContentSize(150, 106); item.setPosition(x, raised); bar.addChild(item);
      const visual = new Node('OrbitNavCap'); visual.layer = Layers.Enum.UI_2D; visual.addComponent(UITransform).setContentSize(150, 106); item.addChild(visual);
      const g = visual.addComponent(Graphics); if (id === active) { g.fillColor = new Color(74, 34, 51, 252); g.circle(0, 17, 43); g.fill(); g.strokeColor = LOBBY.champagne; g.lineWidth = 3; g.circle(0, 17, 40); g.stroke(); } else { g.fillColor = new Color(255, 244, 205, 24); g.roundRect(-68, -45, 136, 88, 30); g.fill(); }
      this.addPremiumSymbol(visual, art[index][0], art[index][1], 0, 19, id === active ? 67 : 56, id === active ? 'pulse' : 'none', id === active ? 255 : 184, index * 0.08);
      const navLabel = this.label(visual, text, 0, -38, 27, id === active ? LOBBY.champagne : C.white, true, 150); this.addLabelOutline(navLabel, LOBBY.ink, 3);
      const navButton = item.addComponent(Button); navButton.transition = Button.Transition.NONE;
      const releaseNav = (): void => { Tween.stopAllByTarget(visual); tween(visual).to(0.16, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'backOut' }).start(); };
      item.on(Node.EventType.TOUCH_START, () => { Tween.stopAllByTarget(visual); tween(visual).to(0.065, { position: new Vec3(0, -3, 0), scale: new Vec3(0.965, 0.965, 1) }, { easing: 'sineOut' }).start(); }, this);
      item.on(Node.EventType.TOUCH_END, releaseNav, this); item.on(Node.EventType.TOUCH_CANCEL, releaseNav, this);
      item.on(Button.EventType.CLICK, () => { if (this.router.route !== route) this.router.reset(route); }, this);
    });
    this.addPanelImageBorder(bar, 920, 126, 0, 220);
  }

  private playPageReveal(animate = true): void {
    const pageOpacity = this.page.getComponent(UIOpacity) ?? this.page.addComponent(UIOpacity); const navOpacity = this.navigation.getComponent(UIOpacity) ?? this.navigation.addComponent(UIOpacity); const backdropOpacity = this.background.getComponent(UIOpacity) ?? this.background.addComponent(UIOpacity);
    Tween.stopAllByTarget(this.page); Tween.stopAllByTarget(pageOpacity); Tween.stopAllByTarget(navOpacity); Tween.stopAllByTarget(backdropOpacity);
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // The background must never fade out: doing so exposes the canvas clear
    // colour and reads as a black flash. Only the foreground settles a few
    // pixels and gains the final sliver of opacity.
    this.page.setScale(Vec3.ONE);
    backdropOpacity.opacity = 255;
    if (!animate || reducedMotion) {
      this.page.setPosition(Vec3.ZERO);
      pageOpacity.opacity = 255;
      navOpacity.opacity = 255;
      return;
    }
    this.page.setPosition(new Vec3(0, -5, 0));
    pageOpacity.opacity = 224;
    navOpacity.opacity = 232;
    tween(this.page).to(0.24, { position: Vec3.ZERO }, { easing: 'cubicOut' }).start();
    tween(pageOpacity).to(0.22, { opacity: 255 }, { easing: 'sineOut' }).start();
    tween(navOpacity).to(0.24, { opacity: 255 }, { easing: 'sineOut' }).start();
  }

  private addBrandEmblem(parent: Node, x: number, y: number, size: number): Node {
    const root = new Node('LuckyAureliaEmblem'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(size, size); root.setPosition(x, y); parent.addChild(root);
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
    const fallback = this.addBrandEmblem(root, 0, 0, size * 0.8); const fallbackOpacity = fallback.addComponent(UIOpacity); fallbackOpacity.opacity = Math.min(alpha, 218);
    const image = new Node('PremiumImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(size, size); root.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const imageOpacity = image.addComponent(UIOpacity); imageOpacity.opacity = 0; image.setScale(new Vec3(0.72, 0.72, 1));
    const atlas = symbolAtlasForGame(config); SymbolAtlasCache.load(atlas, () => { if (!root.isValid || !image.isValid) return; const frame = SymbolAtlasCache.frame(atlas, symbolId); if (!frame) return; sprite.spriteFrame = frame; tween(fallbackOpacity).to(0.22, { opacity: 0 }, { easing: 'quadOut' }).start(); tween(imageOpacity).delay(delay * 0.25).to(0.28, { opacity: alpha }, { easing: 'quadOut' }).start(); tween(image).delay(delay * 0.25).to(0.42, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); });
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
    const paths: Record<string, string> = { boot: LOBBY_SCENE_PATH, login: LOGIN_SCENE_PATH, home: LOBBY_SCENE_PATH, store: LOBBY_SCENE_PATH, rewards: LOBBY_SCENE_PATH, rank: LOBBY_SCENE_PATH, profile: LOBBY_SCENE_PATH, wheel: LOBBY_SCENE_PATH };
    const gamePaths: Record<string, string> = { 'game_bellhop-bonanza': 'art/granary-bank-cabinet', 'game_tea-vault-tumble': 'art/lantern-river-cabinet', 'game_ballroom-keyways': 'art/jade-koi-cabinet', 'game_penthouse-fortune-lift': 'art/fortune-drum-cabinet' };
    const dedicatedRouteScene = asset === 'store' || asset === 'rewards' || asset === 'rank' || asset === 'profile';
    const path = dedicatedRouteScene ? undefined : paths[asset] ?? gamePaths[asset]; if (!path) return;
    const gameBackground = asset.startsWith('game_');
    if (gameBackground) {
      // The scenic layer fills non-portrait margins. The cabinet itself is
      // fitted to the 1920-high design stage below, never cover-cropped.
      resources.load(`${LOBBY_SCENE_PATH}/texture`, Texture2D, (error, texture) => {
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
    // Each service destination is a complete room, not a recoloured lobby
    // card. The finished portrait artwork remains the dominant material while
    // the controls sit on top as physical counters, ledgers and silk rails.
    const scenes: Partial<Record<string, {
      readonly path: string; readonly opacity: number; readonly x: number; readonly y: number;
      readonly grade: Color; readonly gradeAlpha: number; readonly driftX: number;
    }>> = {
      store: { path: 'art/treasury-exchange', opacity: 248, x: 0, y: -18, grade: new Color(77, 37, 26), gradeAlpha: 28, driftX: -10 },
      rewards: { path: 'art/lantern-gift-pavilion', opacity: 248, x: 0, y: -24, grade: new Color(31, 62, 54), gradeAlpha: 24, driftX: 10 },
      rank: { path: 'art/fortune-drum-rank-stage', opacity: 248, x: 0, y: 12, grade: new Color(81, 42, 23), gradeAlpha: 26, driftX: -9 },
      profile: { path: 'art/jade-koi-member-ledger', opacity: 246, x: 0, y: -20, grade: new Color(27, 58, 60), gradeAlpha: 27, driftX: 9 },
    };
    const scene = scenes[asset]; if (!scene) return;
    const image = new Node(`RouteSceneBackdrop-${asset}`); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(width, height); image.setPosition(scene.x, scene.y); parent.addChild(image); image.setSiblingIndex(0);
    const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.RAW; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    resources.load(`${scene.path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !image.isValid) return;
      const frame = new SpriteFrame(); frame.texture = texture; sprite.spriteFrame = frame;
      image.getComponent(UITransform)?.setContentSize(texture.width, texture.height);
      const scale = Math.max(width / texture.width, height / texture.height) * 1.035; image.setScale(new Vec3(scale, scale, 1));
      if (reducedMotion) { opacity.opacity = scene.opacity; return; }
      tween(opacity).to(0.42, { opacity: scene.opacity }, { easing: 'sineOut' }).start();
      tween(image)
        .to(7.6, { position: new Vec3(scene.x + scene.driftX, scene.y + 10, 0), scale: new Vec3(scale * 1.014, scale * 1.014, 1) }, { easing: 'sineInOut' })
        .to(8.2, { position: new Vec3(scene.x - scene.driftX, scene.y - 8, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' })
        .union().repeatForever().start();
    });

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
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for (let index = 0; index < 3; index += 1) {
      const radius = 190 + index * 85; const node = new Node(`AmbientGlow-${index}`); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(radius * 2, radius * 2); node.setPosition(index === 1 ? width * 0.32 : -width * (0.26 + index * 0.04), -height * 0.22 + index * height * 0.22); parent.addChild(node);
      const graphics = node.addComponent(Graphics); graphics.fillColor = new Color(accent.r, accent.g, accent.b, 10 + index * 4); graphics.circle(0, 0, radius); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 105;
      if (!reducedMotion) { const dx = index % 2 ? -90 : 110; const dy = 70 + index * 25; tween(node).by(5 + index * 1.4, { position: new Vec3(dx, dy, 0), scale: new Vec3(0.12, 0.12, 0) }, { easing: 'sineInOut' }).by(5 + index * 1.4, { position: new Vec3(-dx, -dy, 0), scale: new Vec3(-0.12, -0.12, 0) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(2.8 + index, { opacity: 175 }).to(3.4 + index, { opacity: 90 }).union().repeatForever().start(); }
    }
  }

  private addRouteBackdropSignature(parent: Node, asset: string, width: number, height: number): void {
    // The four service rooms already contain their own authored architecture.
    // Adding the old generic vector floor/arches over them makes the result
    // feel assembled from unrelated layers, so the signature remains lobby-only.
    if (asset !== 'home') return;
    const signature = new Node(`BackdropSignature-${asset}`); signature.layer = Layers.Enum.UI_2D; signature.addComponent(UITransform).setContentSize(width, height); parent.addChild(signature); const g = signature.addComponent(Graphics); const halfW = width / 2;
    g.strokeColor = new Color(66, 173, 166, 70); g.lineWidth = 3; g.ellipse(0, height * 0.17, halfW * 0.84, height * 0.18); g.stroke(); g.strokeColor = new Color(255, 220, 132, 82); g.lineWidth = 1.5; g.ellipse(0, height * 0.17, halfW * 0.7, height * 0.13); g.stroke();
    const opacity = signature.addComponent(UIOpacity); opacity.opacity = 72; tween(opacity).to(2.4, { opacity: 148 }, { easing: 'sineInOut' }).to(3.1, { opacity: 62 }, { easing: 'sineInOut' }).union().repeatForever().start();
    const accent = C.cyan;
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

  private animateLoadingProgress(parent: Node, barY: number, labelY: number, width: number, duration: number, statusForRatio: (ratio: number) => string, complete: () => void, resourceProgress?: () => number): void {
    const track = this.panel(parent, 0, barY, width, 28, 14, new Color(73, 30, 26, 220), C.chrome, 2, false); track.name = 'LoadingTrack'; const innerWidth = width - 24;
    const clip = new Node('LoadingFillClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(innerWidth, 14); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT; track.addChild(clip);
    const fill = this.panel(clip, -innerWidth / 2, 0, innerWidth, 14, 7, C.cyan, undefined, 0, false); fill.name = 'LoadingFill'; fill.setScale(new Vec3(0.001, 1, 1));
    const progress = this.label(parent, `${statusForRatio(0)}  0%`, 0, labelY, 26, C.white, true, width + 140); progress.node.name = 'LoadingPercent'; this.addLabelOutline(progress, C.outline, 4);
    const initialDelay = typeof document !== 'undefined' && document.getElementById('csw-preloader') ? 0.48 : 0.08;
    const update = (ratio: number): void => { if (!progress.node?.isValid) return; const safeRatio = Math.max(0, Math.min(1, ratio)); progress.string = `${statusForRatio(safeRatio)}  ${Math.round(safeRatio * 100)}%`; };
    if (resourceProgress) {
      let shown = 0;
      const tick = (dt: number): void => {
        if (!parent.isValid || !parent.parent) { this.unschedule(tick); return; }
        const target = resourceProgress();
        if (target < 0) { this.unschedule(tick); return; }
        shown = Math.min(target, shown + Math.min(dt, 0.1) / duration);
        fill.setScale(shown, 1, 1); fill.setPosition(-innerWidth * (1 - shown) / 2, 0); update(shown);
        if (shown >= 1) { this.unschedule(tick); this.scheduleOnce(() => { if (parent.isValid && parent.parent) complete(); }, 0.22); }
      };
      this.schedule(tick, 0);
      this.addCardShine(track, width - 8, 20, C.paleGold, 0);
      return;
    }
    tween(fill).delay(initialDelay).to(duration, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'quadInOut', onUpdate: () => update(fill.scale.x) }).call(() => { update(1); this.scheduleOnce(complete, 0.12); }).start();
  }

  private addCardShine(parent: Node, width: number, height: number, color: Color, delay: number, x = 0, y = 0): void {
    const clip = new Node('ShineClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height); clip.setPosition(x, y); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-width / 2, -height / 2, width, height, Math.max(4, Math.min(24, height * 0.2))); stencil.fill(); } parent.addChild(clip);
    const stripe = new Node('ShineStripe'); stripe.layer = Layers.Enum.UI_2D; stripe.addComponent(UITransform).setContentSize(180, height * 1.5); stripe.setPosition(-width * 0.72, 0); stripe.angle = -16; clip.addChild(stripe); const graphics = stripe.addComponent(Graphics); graphics.fillColor = new Color(color.r, color.g, color.b, 28); graphics.rect(-90, -height, 180, height * 2); graphics.fill();
    tween(stripe).delay(delay).to(0.9, { position: new Vec3(width * 0.72, 0, 0) }, { easing: 'quadInOut' }).call(() => stripe.setPosition(-width * 0.72, 0)).delay(4.6).union().repeatForever().start();
  }

  private addBannerCarousel(parent: Node, width: number, height: number, x = 0, y = 0): void {
    const clip = new Node('BannerCarousel'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height); clip.setPosition(x, y); const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); if (stencil) { stencil.clear(); stencil.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, Math.max(8, Math.min(34, height * 0.15))); stencil.fill(); } parent.addChild(clip); clip.setSiblingIndex(0);
    const paths = [LOBBY_SCENE_PATH];
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
    const halfW = width / 2; const halfH = height / 2; const layer = new Node('AureliaPassSecurityFoil'); layer.layer = Layers.Enum.UI_2D; layer.addComponent(UITransform).setContentSize(width, height); parent.addChild(layer); layer.setSiblingIndex(Math.min(1, parent.children.length - 1)); const g = layer.addComponent(Graphics);
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
    const path = LOBBY_SCENE_PATH;
    resources.load(`${path}/texture`, Texture2D, (error, texture) => { if (error || !texture || !clip.isValid) return; const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('PanelMaterialImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW; const scale = Math.max(surfaceWidth / texture.width, surfaceHeight / texture.height) * 1.08; image.setScale(new Vec3(scale, scale, 1)); image.setPosition(-16, -8); const opacity = image.addComponent(UIOpacity); opacity.opacity = 34; tween(image).to(7.2, { position: new Vec3(18, 10, 0), scale: new Vec3(scale * 1.025, scale * 1.025, 1) }, { easing: 'sineInOut' }).to(7.2, { position: new Vec3(-16, -8, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); tween(opacity).to(3.2, { opacity: 52 }).to(4, { opacity: 28 }).union().repeatForever().start(); });
  }

  private addPhotographicMaterial(parent: Node, path: string, width: number, height: number, radius: number, imageAlpha: number, tint: Color, focusX = 0, focusY = 0, animated = false): Node {
    // Registration counters and lobby directory plates are physical pieces of
    // the photographed hotel. A restrained scene crop supplies real stone,
    // glass and brass texture while a smoked tint keeps copy readable. This
    // avoids stacking opaque, unrelated UI cards over the environment.
    const clip = new Node('PhotographicMaterial'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(width, height); parent.addChild(clip); clip.setSiblingIndex(0);
    const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_STENCIL; const stencil = clip.getComponent(Graphics); const seal = Math.max(3, Math.min(10, Math.min(width, height) * 0.035));
    if (stencil) { stencil.clear(); stencil.roundRect(-width / 2 + seal, -height / 2 + seal, width - seal * 2, height - seal * 2, Math.max(8, radius - seal)); stencil.fill(); }
    resources.load(`${path}/texture`, Texture2D, (error, texture) => {
      if (error || !texture || !clip.isValid) return;
      const frame = new SpriteFrame(); frame.texture = texture; const image = new Node('MaterialSceneImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(texture.width, texture.height); clip.addChild(image); image.setSiblingIndex(0);
      const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.RAW;
      const scale = Math.max(width / texture.width, height / texture.height) * 1.025; const maxX = Math.max(0, (texture.width * scale - width) / 2); const maxY = Math.max(0, (texture.height * scale - height) / 2); const x = Math.max(-maxX, Math.min(maxX, focusX)); const y = Math.max(-maxY, Math.min(maxY, focusY));
      image.setScale(new Vec3(scale, scale, 1)); image.setPosition(x, y); const opacity = image.addComponent(UIOpacity); opacity.opacity = Math.max(0, Math.min(255, imageAlpha));
      if (animated) { const dx = Math.min(10, maxX * 0.35); const dy = Math.min(8, maxY * 0.2); tween(image).to(6.8, { position: new Vec3(x + dx, y + dy, 0), scale: new Vec3(scale * 1.012, scale * 1.012, 1) }, { easing: 'sineInOut' }).to(7.4, { position: new Vec3(x - dx, y - dy, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(); }
    });
    const glaze = new Node('MaterialGlaze'); glaze.layer = Layers.Enum.UI_2D; glaze.addComponent(UITransform).setContentSize(width, height); clip.addChild(glaze); const g = glaze.addComponent(Graphics);
    g.fillColor = tint; g.rect(-width / 2, -height / 2, width, height); g.fill();
    g.fillColor = new Color(255, 249, 222, Math.min(42, Math.max(18, Math.round(tint.a * 0.2)))); g.roundRect(-width * 0.43, height * 0.24, width * 0.66, Math.max(8, height * 0.055), Math.max(4, height * 0.025)); g.fill();
    g.fillColor = new Color(22, 7, 16, Math.min(68, Math.max(26, Math.round(tint.a * 0.32)))); g.rect(-width / 2, -height / 2, width, height * 0.28); g.fill();
    return clip;
  }

  private addLuxuryFolioFrame(parent: Node, width: number, height: number): Node {
    const frame = new Node('LuxuryFolioFrame'); frame.layer = Layers.Enum.UI_2D; frame.addComponent(UITransform).setContentSize(width, height); parent.addChild(frame);
    const g = frame.addComponent(Graphics); const halfW = width / 2; const halfH = height / 2;
    // Deep leather rim, broad polished brass band, and two hairline highlights.
    // The layered widths give the panel real furniture-like depth at phone size
    // without adding unrelated badges or decorative glyphs.
    g.strokeColor = new Color(38, 13, 18, 248); g.lineWidth = 18; g.roundRect(-halfW + 10, -halfH + 10, width - 20, height - 20, 30); g.stroke();
    g.strokeColor = new Color(156, 91, 43, 255); g.lineWidth = 11; g.roundRect(-halfW + 13, -halfH + 13, width - 26, height - 26, 27); g.stroke();
    g.strokeColor = new Color(255, 222, 139, 248); g.lineWidth = 4; g.roundRect(-halfW + 18, -halfH + 18, width - 36, height - 36, 23); g.stroke();
    g.strokeColor = new Color(255, 249, 216, 176); g.lineWidth = 1.5; g.roundRect(-halfW + 24, -halfH + 24, width - 48, height - 48, 18); g.stroke();
    g.strokeColor = new Color(72, 24, 25, 210); g.lineWidth = 2; g.roundRect(-halfW + 30, -halfH + 30, width - 60, height - 60, 15); g.stroke();

    // A restrained brass title rail and lower rail anchor the typography to
    // the counter instead of letting it float over the photograph.
    g.fillColor = new Color(49, 15, 23, 138); g.roundRect(-halfW + 34, halfH - 128, width - 68, 92, 20); g.fill();
    g.strokeColor = new Color(248, 212, 126, 205); g.lineWidth = 2.5; g.moveTo(-halfW + 62, halfH - 126); g.lineTo(halfW - 62, halfH - 126); g.stroke();
    g.strokeColor = new Color(248, 212, 126, 148); g.lineWidth = 1.5; g.moveTo(-halfW + 70, -halfH + 126); g.lineTo(halfW - 70, -halfH + 126); g.stroke();

    const sheen = new Node('FolioBrassSheen'); sheen.layer = Layers.Enum.UI_2D; sheen.addComponent(UITransform).setContentSize(96, height - 74); sheen.setPosition(-halfW + 42, 0); frame.addChild(sheen); sheen.angle = -8; const sg = sheen.addComponent(Graphics); sg.fillColor = new Color(255, 244, 199, 42); sg.roundRect(-22, -(height - 74) / 2, 44, height - 74, 18); sg.fill(); const opacity = sheen.addComponent(UIOpacity); opacity.opacity = 30;
    tween(sheen).to(5.6, { position: new Vec3(halfW - 42, 0, 0) }, { easing: 'sineInOut' }).to(0, { position: new Vec3(-halfW + 42, 0, 0) }).delay(3.8).union().repeatForever().start();
    tween(opacity).to(1.8, { opacity: 86 }).to(2.2, { opacity: 24 }).union().repeatForever().start();
    return frame;
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
      const words = line.trim().split(/\s+/).filter(Boolean); const gap = size * 0.62;
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
    if (style !== 'apple' && style !== 'link' && style !== 'nav' && style !== 'nav-active') {
      this.addButtonMaterialSurface(effectSurface, text, style, Math.max(10, surfaceWidth), Math.max(10, surfaceHeight), palette);
      this.addCardShine(effectSurface, Math.max(10, surfaceWidth - 8), Math.max(10, surfaceHeight - 8), style === 'primary' || lobbySecondary ? C.paleGold : C.cyan, style === 'primary' ? 1.1 : 2 + this.buttonFrameIndex(text, style) * 0.22);
      this.addButtonEdgePulse(node, width, height, palette[1], style === 'spin');
    }
    if (style !== 'spin') this.addButtonImageFrame(node, text, style, width, height);
    const semanticArt = style === 'apple' ? undefined : this.semanticButtonArt(text, style); if (semanticArt && style !== 'spin' && width >= 52 && height >= 52) { const compact = width < 180; this.addPremiumSymbol(node, semanticArt[0], semanticArt[1], compact ? 0 : -width / 2 + height * 0.62, 0, compact ? Math.min(width, height) * 0.7 : height * 0.78, 'button', compact ? 132 : 210, 0.2); }
    const appleMark = style === 'apple' ? this.addAppleMark(node, -width / 2 + 66, 0, Math.min(46, height * 0.48), palette[2]) : undefined;
    const interfaceIcon = style === 'apple' || semanticArt ? undefined : this.interfaceControlIcon(text, style); const interfaceIconNode = interfaceIcon ? this.addInterfaceControlIcon(node, interfaceIcon, width < 180 ? -width * 0.29 : -width / 2 + height * 0.63, 0, Math.min(height * 0.56, 42), palette[2], palette[1]) : undefined;
    if (style === 'spin') { this.addSpinRings(node, Math.min(width, height) * 0.52); this.addPremiumSymbol(node, this.selectedGame, this.selectedGame.wildId, 0, 0, Math.min(width, height) * 0.78, 'button', 112); }
    const compactControl = text === '‹' || text === '+' || text === '−'; const fontSize = compactControl ? Math.min(38, height * 0.52) : Math.min(style === 'apple' ? 40 : 34, Math.max(27, height * 0.4)); const hasLeftIcon = Boolean(appleMark || interfaceIcon || (semanticArt && width >= 180)); const labelX = style === 'apple' ? 24 : hasLeftIcon ? (width < 180 ? width * 0.13 : height * 0.3) : 0; const labelWidth = style === 'apple' ? width - 150 : hasLeftIcon ? width - (width < 180 ? 50 : height * 0.92) : width - 32; const label = this.label(node, text, labelX, 0, fontSize, palette[2], true, labelWidth); label.node.name = 'Text'; label.enableWrapText = false;
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
    if (copy.includes('TURBO')) return [GAME_CONFIGS[2], 'ballroom-wild'];
    if (copy.includes('AUTO')) return [GAME_CONFIGS[0], 'bellhop-wild'];
    if (copy.includes('WHEEL') || copy.includes('LIFT')) return [GAME_CONFIGS[3], 'lift-vault'];
    if (copy.includes('CHECK-IN') || copy.includes('CLAIM') || copy.includes('COLLECT')) return [GAME_CONFIGS[0], 'coin-stack'];
    if (copy === 'BUY' || copy.includes('PURCHASE')) return [GAME_CONFIGS[2], 'champagne-vault'];
    if (copy === 'VIEW') return [GAME_CONFIGS[3], 'treasure-case'];
    if (copy === 'DONE') return [GAME_CONFIGS[0], 'room-scatter'];
    if (copy.includes('ENTER THE CASINO') || copy.includes('CREATE PROFILE') || copy.includes('RECOVERY HELP')) return [GAME_CONFIGS[2], 'champagne-vault'];
    if (copy.includes('GUEST')) return [GAME_CONFIGS[0], 'room-scatter'];
    if (copy.includes('CHANGE AVATAR') || copy.includes('CHOOSE AVATAR')) return [GAME_CONFIGS[0], 'bellhop-cap'];
    if (copy === '+') return [GAME_CONFIGS[0], 'coin-stack'];
    if (copy === 'OPEN' || copy.includes('OPEN  ›')) return [GAME_CONFIGS[2], 'ballroom-key'];
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
    // Apple sign-in keeps a quiet, high-contrast surface and its own mark.
    if (style === 'apple') return;
    // Real enamel/metal artwork, sliced at its quiet centre so the rounded
    // end caps stay proportional on narrow tabs and wider action buttons.
    if (!['apple', 'link', 'nav', 'nav-active'].includes(style) && width >= 130 && height >= 50) {
      const selected = style === 'primary' || style === 'lobby-secondary';
      const path = selected ? 'art/f12-lantern-carved-key-v2' : 'art/f12-peony-carved-key-v2';
      const image = new Node('SculptedEnamelButton'); image.layer = Layers.Enum.UI_2D;
      image.addComponent(UITransform).setContentSize(width, height); parent.addChild(image);
      const sprite = image.addComponent(Sprite); sprite.type = Sprite.Type.SLICED; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      resources.load(`${path}/texture`, Texture2D, (error, texture) => {
        if (error || !texture || !image.isValid || !parent.isValid) return;
        const frame = new SpriteFrame(); frame.texture = texture;
        // Preserve the complete floral endcaps; only stretch the empty enamel.
        const cap = texture.width * 0.28;
        frame.insetLeft = cap; frame.insetRight = cap;
        frame.insetTop = texture.height * 0.23; frame.insetBottom = texture.height * 0.23;
        sprite.spriteFrame = frame;
        // Inset sizes are source pixels; scale to the intended visual height
        // before stretching the quiet centre, never squeeze oversized corners.
        const scale = height / texture.height;
        // Short labels still need a quiet centre. Compress the floral caps
        // horizontally on compact controls, never stretch them across text.
        const scaleX = Math.min(scale, width * (width < 400 ? 0.13 : 0.18) / cap);
        image.getComponent(UITransform)?.setContentSize(width / scaleX, texture.height);
        image.setScale(scaleX, scale, 1);
        const surface = parent.getChildByName('ButtonSurface');
        if (surface) (surface.getComponent(UIOpacity) ?? surface.addComponent(UIOpacity)).opacity = 0;
      });
      return;
    }
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

  private input(parent: Node, placeholder: string, value: string, x: number, y: number, password = false, shellWidth = 650): EditBox {
    const shellHeight = 96; const shell = this.panel(parent, x, y, shellWidth, shellHeight, 18, C.glassRaised, new Color(207, 133, 68), 2);
    // Keep both the native editing overlay and the canvas labels inside the
    // ornamental frame's clear center window. Using the full 650px shell made
    // typed text begin under the left crest even though the placeholder looked
    // acceptable before focus.
    const insets = this.visualSurfaceInsets(shellWidth, shellHeight, undefined, true); const clearWidth = shellWidth - insets.left - insets.right - 30; const clearCenter = (insets.left - insets.right) / 2; const actionWidth = password ? 112 : 0; const inputWidth = clearWidth - actionWidth; const inputX = clearCenter - actionWidth / 2;
    const node = new Node('EditBoxInput'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(inputWidth, 82); node.setPosition(inputX, 0); shell.addChild(node);
    // Configure before onLoad creates the native DOM element: the default ANY
    // mode would create a textarea, which cannot properly toggle password type.
    node.active = false;
    const edit = node.addComponent(EditBox);
    for (const generatedName of ['TEXT_LABEL', 'PLACEHOLDER_LABEL']) { const generated = node.getChildByName(generatedName); if (generated) { generated.active = false; generated.destroy(); } }
    const labelWidth = inputWidth - 30;
    const textLabel = this.label(node, value, 0, 0, 58, new Color(255, 250, 230), true, labelWidth); textLabel.horizontalAlign = Label.HorizontalAlign.LEFT; textLabel.lineHeight = 68; textLabel.overflow = Label.Overflow.CLAMP; textLabel.enableWrapText = false; textLabel.node.getComponent(UITransform)?.setContentSize(labelWidth, 76); this.addLabelOutline(textLabel, new Color(31, 9, 20, 238), 2);
    const placeholderLabel = this.label(node, placeholder, 0, 0, 50, new Color(238, 226, 200), true, labelWidth); placeholderLabel.horizontalAlign = Label.HorizontalAlign.LEFT; placeholderLabel.lineHeight = 60; placeholderLabel.enableWrapText = false; placeholderLabel.node.getComponent(UITransform)?.setContentSize(labelWidth, 76); this.addLabelOutline(placeholderLabel, new Color(31, 9, 20, 224), 2);
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
    node.active = true;
    // EditBox preload positions stock top-left-anchored labels. Our custom
    // labels are center-anchored, so restore their framed layout after preload.
    for (const label of [textLabel, placeholderLabel]) {
      label.node.setPosition(0, 0);
      label.node.getComponent(UITransform)?.setContentSize(labelWidth, 76);
    }
    return edit;
  }

  private avatar(parent: Node, x: number, y: number, index: number, size: number): Node {
    const safeIndex = ((index % AVATAR_SYMBOLS.length) + AVATAR_SYMBOLS.length) % AVATAR_SYMBOLS.length; const [gameId, symbolId] = AVATAR_SYMBOLS[safeIndex]; const avatarGame = GAME_CONFIG_BY_ID[gameId]; const atlas = symbolAtlasForGame(avatarGame); const colors = [C.cyan, C.gold, C.violet, C.green]; const node = this.panel(parent, x, y, size, size, size / 2, new Color(34, 23, 31), colors[safeIndex % colors.length], 4, false); const clip = new Node('PlayerPortraitClip'); clip.layer = Layers.Enum.UI_2D; clip.addComponent(UITransform).setContentSize(size - 8, size - 8); clip.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE; node.addChild(clip);
    const fallback = this.addBrandEmblem(clip, 0, 0, size * 0.68); const fallbackOpacity = fallback.addComponent(UIOpacity); fallbackOpacity.opacity = 224;
    const image = new Node('PlayerPortraitImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(size - 8, size - 8); clip.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const opacity = image.addComponent(UIOpacity); opacity.opacity = 0;
    SymbolAtlasCache.load(atlas, () => { if (!image.isValid) return; const frame = SymbolAtlasCache.frame(atlas, symbolId); if (!frame) return; sprite.spriteFrame = frame; tween(fallbackOpacity).to(0.18, { opacity: 0 }, { easing: 'quadOut' }).start(); tween(opacity).to(0.22, { opacity: 255 }, { easing: 'quadOut' }).start(); });
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
  private themeColor(id: GameId): Color { return id === 'bellhop-bonanza' ? new Color(239, 174, 87) : id === 'tea-vault-tumble' ? new Color(76, 177, 128) : id === 'ballroom-keyways' ? new Color(226, 103, 79) : new Color(93, 177, 207); }
  private selectQueryGame(query: URLSearchParams): void { const id = query.get('game') as GameId | null; if (id && GAME_CONFIG_BY_ID[id]) this.selectedGame = GAME_CONFIG_BY_ID[id]; }
  private forceFromQuery(force: string | null): ForceResult | undefined { if (force === 'win') return { symbolId: this.selectedGame.symbols.find((s) => s.tier === 'high')?.id, count: 5, wild: true }; if (force === 'free') return { scatterCount: 5 }; if (force === 'hold') return { holdAndSpin: true }; if (force === 'big' || force === 'mega' || force === 'epic') return { winTier: force }; return undefined; }
}

function okStyle(ok: boolean): string { return ok ? 'secondary' : 'ghost'; }
