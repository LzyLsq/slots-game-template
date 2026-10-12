import {
  _decorator, AudioClip, AudioSource, BlockInputEvents, Color, Component, EditBox, EffectAsset, EventTouch, game, Game, Label, LabelOutline, Layers, Mask,
  Node, Rect, resources, Size, Sprite, SpriteFrame, sys, Texture2D, tween, Tween, UIOpacity, UITransform, Vec2, Vec3, view,
} from 'cc';
import { Board, createRound, Guarantee, INITIAL_GUARANTEE, restoreGuarantee, LanternMeters, MODE_RULES, Round, STAKES, SYMBOLS, Tier, atlasMilestone } from '../domain/VaultMath';
import { initializeLanguage, LANGUAGES, language, setLanguage, tr } from './Language';
import { LETTERS, type LetterId, type Inbox, letterState, readLetter, claimLetter, clearRead, unreadCount } from '../domain/Inbox';
import { claimJournal, freshJournal, JournalState, journalForDay, journalGoals, recordJournalSpin } from '../domain/DailyJournal';
import { PendingSpinPayout, reserveSpin, settleSpin } from '../domain/SpinWallet';
import { KeeperGestureView } from './KeeperGestureView';
import { BLINK_ART, BlinkScene, blinkArt } from './BlinkArt';
import { BLINK_ATLAS } from './BlinkSequence';
import { MASCOT_ART, MASCOT_ATLAS } from './KeeperSequence';
import { CABINET_CAST_ART, PRIZE_CAST_ART, CAST_ATLAS, castFrameCount } from './CastArt';
import { HALL_KEEPER_ART, HALL_KEEPER_ATLAS, HALL_KEEPER_PATCHES } from './HallKeeperArt';
import { HallRoomGesture } from './HallRoomGesture';
import { ControlTap } from './ControlTap';
import { ACCOUNT_DETAIL, AVATAR_DETAIL, CALENDAR_DETAIL, NAME_NOTICE, RENAME_DETAIL, RANK_DETAIL, HISTORY_DETAIL, RULES_DETAIL, buttonLettering, lanternDay, sheetViewport, noticeLayout } from './ServiceDetailLayout';
import { CabinetWinMotion, cabinetWinPreview, CABINET_WIN_TITLE, CABINET_WIN_AMOUNT, CABINET_WIN_CLEARANCE, CABINET_WIN_LIGHTS, CABINET_WIN_RAYS, CABINET_WIN_CROWN, CABINET_WIN_ORNAMENTS, CABINET_WIN_AUREOLE, CABINET_WIN_BURSTS, CABINET_WIN_JETS, CABINET_WIN_STREAMERS } from './CabinetWinMotion';
import { CabinetWinView } from './CabinetWinView';
import { LoadingProgress, loadingTitleY } from './LoadingProgress';
import { ArtPreparation } from './ArtPreparation';
import { GAME_BACKDROPS, startupArt, roomCabinetArt, roomCelebrationArt } from './ArtLoadingPlan';
import { ModeEntryLoading, MODE_ENTRY_THEMES, modeEntryLayout, EntryWork } from './ModeEntryLoading';
import { ModeEntryLoadingView } from './ModeEntryLoadingView';
import { cabinetViewport } from './CabinetViewport';
import { HALL_LOWER_DECK, hallModeRowY } from './HallLowerDeck';
import { HallFortuneMotionView } from './HallFortuneMotionView';
import { HallAmbienceView } from './HallAmbienceView';
import { CABINET_SUBTITLE, CABINET_METER_Y, CABINET_TITLE_SLOTS, HALL_BACKLIGHTS, HALL_EXHIBIT_GLINTS, HALL_INLAY_GLINTS, HALL_SCENE_LIGHTS } from './KeeperClearance';
import { KeeperClearanceView } from './KeeperClearanceView';
import { KEEPER_RIGS, KeeperCue } from './KeeperGesture';
import { REEL_ART, PRIMARY_SYMBOL, PRIZE_STAGES, PRIZE_TITLES, reelArt } from './ThemeArt';
import { SHOP_BUNDLES, SHOP_CABINET, SHOP_SLOTS, shopPlacement, ShopFixture } from './ShopLayout';
import { RewardAudio, REWARD_CHANNELS, REWARD_SOUNDS, RewardSound, RewardChannel, ROOM_REWARD_SOUNDS, RewardTier } from './RewardAudio';
import { SceneMusic, MUSIC_TRACKS, MusicScene, musicScene } from './SceneMusic';
import { GameplayAudio, ROOM_GAMEPLAY_SOUNDS, GameplaySound } from './GameplayAudio';
import { InteractionAudio, INTERACTION_SOUNDS, InteractionSound } from './InteractionAudio';
import { AudioPreferences, restoreAudioPreferences, audibleAudio } from './AudioPreferences';
import { TaskGoldReveal } from './TaskGoldReveal';
import { TASK_GOLD_ART, TASK_GOLD_CAST, TASK_GOLD_REFLECTION } from './TaskGoldMotion';

const { ccclass } = _decorator;
type Page = 'login' | 'home' | 'game' | 'store' | 'rewards' | 'rank' | 'account' | 'ledger' | 'rules' | 'atlas';
type LedgerEntry = { label: string; delta: number; at: string };
type ModeId = 0 | 1 | 2 | 3;
type ModeConfig = {
  id: ModeId; name: string; subtitle: string; art: string; lane: number; accent: string; promise: string; multiplier: string; bonus: string;
};
type Save = AudioPreferences & {
  name: string; coins: number; bet: number; spins: number; best: number; totalWon: number; daily: string; dailyStreak: number; roomSpins: [number, number, number, number]; featureProgress: [number, number, number, number];
  chestDaily: string; avatar: number; atlasClaims: [number, number, number, number];
  pendingSpin?: PendingSpinPayout; journal: JournalState; guarantee: Guarantee; roomMeters: [LanternMeters, LanternMeters, LanternMeters, LanternMeters]; accepted: boolean; selectedLane: number; selectedMode: ModeId; ledger: LedgerEntry[]; inbox: Inbox; motionReduced: boolean; musicEnabled: boolean;
};

const MODES: readonly ModeConfig[] = [
  { id: 0, name: 'JADE FERRY', subtitle: 'Collector Tide', art: 'mode-jade-ferry', lane: 0, accent: '#64D4C2', promise: 'Steady collector rhythm', multiplier: 'Tide bonus ×3', bonus: 'TIDE SURGE' },
  { id: 1, name: 'PEARL GARDEN', subtitle: 'Lotus Fortune', art: 'mode-pearl-garden', lane: 1, accent: '#F7C7E3', promise: 'Soft bloom, bright returns', multiplier: 'Pearls hold & re-spin', bonus: 'LOTUS BLOOM' },
  { id: 2, name: 'EMBER FOUNDRY', subtitle: 'Golden Press', art: 'mode-ember-foundry', lane: 2, accent: '#FFB46B', promise: 'Press the vault wide open', multiplier: 'Forge release ×2', bonus: 'FORGE RELEASE' },
  { id: 3, name: 'CELESTIAL VAULT', subtitle: 'Dragon Reserve', art: 'mode-celestial-vault', lane: 2, accent: '#D2E8FF', promise: 'The dragon guards the super prize', multiplier: 'Dragon seal ×5', bonus: 'DRAGON SEAL' },
];
const PAGE_TITLE_ART: Partial<Record<Page, string>> = {
  store: 'title-treasure-shop-wide', rewards: 'title-lantern-gifts-wide',
  rank: 'title-honour-dock-wide', account: 'title-keeper-ledger-wide', ledger: 'title-keeper-ledger-wide', rules: 'title-house-rules-wide', atlas: 'title-treasure-atlas-wide',
};
const KEEPER_ART = ['account-keeper-portrait', 'keeper-otter', 'keeper-rabbit', 'keeper-fox', 'keeper-dragon'] as const;
const KEEPER_NAMES = ['HOUSE KEEPER', 'RIVER OTTER', 'PEARL RABBIT', 'GOLDEN FOX', 'JADE DRAGON'] as const;
const HALL_HERO_ART = ['hero-otter-ferry', 'hero-pearl-garden', 'hero-ember-foundry', 'hero-celestial-vault'] as const;
const MODE_TITLE_ART: Record<ModeId, string> = {
  0: 'title-jade-ferry-wide', 1: 'title-pearl-garden-wide',
  2: 'title-ember-foundry-wide', 3: 'title-celestial-vault-wide',
};
const KEY = 'fortune-lantern-house-local-v2';
const DEFAULT: Save = {
  name: '', coins: 5000, bet: 1, spins: 0, best: 0, totalWon: 0, daily: '', dailyStreak: 0, chestDaily: '', avatar: 0, atlasClaims: [0, 0, 0, 0], roomSpins: [0, 0, 0, 0], featureProgress: [0, 0, 0, 0], guarantee: { ...INITIAL_GUARANTEE },
  journal: freshJournal(''), roomMeters: [[18, 42, 26], [8, 12, 6], [14, 4, 9], [0, 0, 0]], ledger: [], inbox: {}, accepted: false, selectedLane: 1, selectedMode: 0, motionReduced: false, musicEnabled: true, bgmEnabled: true, effectsEnabled: true,
};
const CREAM = '#FFF4D6';
const INK = '#193F3B';
const GOLD = '#FFD58A';
const DAILY_AWARDS = [500, 600, 700, 800, 1000, 1200, 2000] as const;
const JADE = '#0F5F55';
const CORAL = '#D86B55';
const DARK = '#173531';
const storage = () => sys.localStorage;
function matchText(value: string): string {
  const match = /^(\d+) (lanterns|lotus-path pearls|ingots|dragon columns)$/.exec(value);
  return match ? tr(`{amount} ${match[2]}`, { amount: match[1] }) : tr(value);
}
function awardText(match: string, amount: number): string {
  return tr('{match} · {amount} COINS', { match: matchText(match), amount: amount.toLocaleString() });
}
// The narrow cabinet HUD is a glanceable readout; account and history retain full values.
function hudAmount(amount: number): string {
  return amount >= 1_000_000 ? new Intl.NumberFormat(language(), { notation: 'compact', maximumFractionDigits: 1 }).format(amount) : amount.toLocaleString();
}

function readSave(): Save {
  try {
    const raw = JSON.parse(storage().getItem(KEY) || '{}') as Partial<Save>;
    const selectedMode = [0, 1, 2, 3].includes(raw.selectedMode as number) ? raw.selectedMode as ModeId : DEFAULT.selectedMode;
    const restored: Save = {
      ...DEFAULT, ...raw, selectedMode, motionReduced: raw.motionReduced === true, ...restoreAudioPreferences(raw),
      journal: journalForDay(raw.journal, new Date().toLocaleDateString('en-CA')),
      avatar: Number.isInteger(raw.avatar) && (raw.avatar as number) >= 0 && (raw.avatar as number) <= 4 ? raw.avatar as number : 0,
      chestDaily: typeof raw.chestDaily === 'string' ? raw.chestDaily : '',
      atlasClaims: Array.isArray(raw.atlasClaims) && raw.atlasClaims.length === 4 && raw.atlasClaims.every(value => Number.isInteger(value) && value >= 0 && value <= 3) ? raw.atlasClaims as Save['atlasClaims'] : [0, 0, 0, 0],
      guarantee: restoreGuarantee(raw.guarantee),
      dailyStreak: Number.isInteger(raw.dailyStreak) && (raw.dailyStreak as number) >= 0 ? raw.dailyStreak as number : raw.daily ? 1 : 0,
      roomSpins: Array.isArray(raw.roomSpins) && raw.roomSpins.length === 4 ? raw.roomSpins.map(n => Number.isInteger(n) && n >= 0 ? n : 0) as [number, number, number, number] : [0, 0, 0, 0],
      featureProgress: Array.isArray(raw.featureProgress) && raw.featureProgress.length === 4 && raw.featureProgress.every(n => Number.isInteger(n) && n >= 0 && n < 101)
        ? raw.featureProgress as Save['featureProgress'] : [0, 0, 0, 0],
      roomMeters: Array.isArray(raw.roomMeters) && raw.roomMeters.length === 4 && raw.roomMeters.every(room => Array.isArray(room) && room.length === 3 && room.every(value => Number.isInteger(value) && value >= 0 && value < 100))
        ? raw.roomMeters as Save['roomMeters'] : DEFAULT.roomMeters.map((meter, i) => i === 0 && Array.isArray((raw as { meters?: unknown[] }).meters) && (raw as { meters?: unknown[] }).meters?.length === 3
          ? (raw as { meters: LanternMeters }).meters.map(value => Number.isInteger(value) && value >= 0 && value < 100 ? value : 0) as LanternMeters : [...meter] as LanternMeters) as Save['roomMeters'],
      inbox: raw.inbox && typeof raw.inbox === 'object' && !Array.isArray(raw.inbox) ? Object.fromEntries(LETTERS.map(letter => { const entry = raw.inbox?.[letter.id]; return [letter.id, { read: entry?.read === true, claimed: entry?.claimed === true, deleted: entry?.deleted === true }]; })) as Inbox : {},
      ledger: Array.isArray(raw.ledger) ? raw.ledger.filter((entry): entry is LedgerEntry => typeof entry?.label === 'string' && Number.isSafeInteger(entry?.delta) && typeof entry?.at === 'string').slice(0, 12) : [],
      coins: Number.isFinite(raw.coins) && (raw.coins as number) >= 0 ? Math.floor(raw.coins as number) : DEFAULT.coins,
      bet: Number.isInteger(raw.bet) && (raw.bet as number) >= 0 && (raw.bet as number) < STAKES.length ? raw.bet as number : DEFAULT.bet,
      spins: Number.isInteger(raw.spins) && (raw.spins as number) >= 0 ? raw.spins as number : 0,
      totalWon: Number.isInteger(raw.totalWon) && (raw.totalWon as number) >= 0 ? raw.totalWon as number : 0,
      pendingSpin: raw.pendingSpin && Number.isSafeInteger(raw.pendingSpin.award) && raw.pendingSpin.award >= 0 && Number.isSafeInteger(raw.pendingSpin.spin) && raw.pendingSpin.spin > 0 && typeof raw.pendingSpin.label === 'string' ? raw.pendingSpin : undefined,
    };
    // A reload during reel motion completes the already-reserved local outcome
    // exactly once. The accepted stake was persisted before any reel animation.
    if (restored.pendingSpin) {
      const pending = restored.pendingSpin;
      restored.coins = settleSpin(restored.coins, pending).balance;
      restored.totalWon += pending.award; restored.best = Math.max(restored.best, pending.award);
      if (pending.award) restored.ledger.unshift({ label: `${pending.label} · WIN`, delta: pending.award, at: new Date().toLocaleDateString('en-CA') });
      restored.ledger.length = Math.min(12, restored.ledger.length);
      restored.pendingSpin = undefined;
      storage().setItem(KEY, JSON.stringify(restored));
    }
    return restored;
  } catch {
    return { ...DEFAULT, guarantee: { ...DEFAULT.guarantee }, roomMeters: DEFAULT.roomMeters.map(meter => [...meter] as LanternMeters) as Save['roomMeters'] };
  }
}
function node(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
  const n = new Node(name); n.layer = Layers.Enum.UI_2D; n.addComponent(UITransform).setContentSize(w, h); n.setPosition(x, y); parent.addChild(n); return n;
}
function opacity(n: Node, value = 255): UIOpacity { const o = n.getComponent(UIOpacity) || n.addComponent(UIOpacity); o.opacity = value; return o; }
function liveLabel(parent: Node, text: string, x: number, y: number, w: number, h: number, size = 42, color = INK): Label {
  const n = node(parent, `Text · ${text.slice(0, 24)}`, x, y, w, h); const label = n.addComponent(Label);
  label.string = tr(text); label.fontFamily = 'Arial'; label.isBold = true; label.fontSize = size; label.lineHeight = size * 1.16;
  label.color = new Color(color); label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER;
  label.overflow = Label.Overflow.SHRINK; label.enableWrapText = true; label.cacheMode = Label.CacheMode.NONE;
  const outline = n.addComponent(LabelOutline); outline.color = new Color(color === CREAM ? '#183530' : '#FFF2CE'); outline.width = Math.max(1, Math.round(size / 18));
  return label;
}

function singleLine(parent: Node, text: string, x: number, y: number, w: number, h: number, size: number, color = INK): Label {
  const label = liveLabel(parent, text, x, y, w, h, size, color);
  label.enableWrapText = false; return label;
}

@ccclass('GoldenEncoreApp')
export class GoldenEncoreApp extends Component {
  private frames = new Map<string, SpriteFrame>();
  private artPreparation = new ArtPreparation();
  private taskGoldEffect?: EffectAsset;
  private surface?: Node; private page: Page = 'login'; private rulesReturnPage: 'home' | 'game' = 'home'; private save: Save = readSave();
  // Keep the previous surface alive until the new one is fully assembled. Destroying
  // it before the next page has painted creates a visible transparent frame on mobile.
  private retiringSurface?: Node;
  private transitionBlocker?: Node;
  private readonly surfaceScenery = new WeakSet<Node>();
  private reduced = false; private transitionLock = false; private spinning = false; private spinToken = 0; private skipSpin = false; private bootReady = false;
  private round?: Round; private shown?: Board; private boardNodes: Sprite[] = []; private boardNodeRefs: Node[] = [];
  private incomingNodes: Node[] = []; private incomingSprites: Sprite[] = [];
  private cabinetBackdrop?: Node; private winClosing = false; private winPreview?: { tier: 'big' | 'super'; amount: number };
  private closingSheets = new Set<Node>();
  private activeOverlay?: Node; private activeWinAmount?: Label; private activeWinTarget = 0; private toastNode?: Node; private delayed: Array<() => void> = []; private pendingWinReveal?: () => void; private winCounterTick?: () => void; private winCues: Array<() => void> = []; private resumeWinTier?: Exclude<Tier, 'none'>;
  private cabinetFeatureLabel?: Label; private walletLabel?: Label; private betLabel?: Label; private winLabel?: Label; private statusLabel?: Label; private spinFace?: Node; private meterLabels: Label[] = []; private meterPlaques: Node[] = [];
  private autoRemaining = 0; private autoLabel?: Label; private queuedAuto?: () => void; private hallSpotlight: ModeId = 0; private hallBackdrop?: Node;
  private inputName = ''; private accepted = false; private guestSession = false;
  private ambientTargets: Array<Node | UIOpacity> = [];
  private mascotFrames = new Map<string, readonly SpriteFrame[]>();
  private blinkFrames = new Map<string, readonly SpriteFrame[]>();
  private hallKeeperFrames = new Map<ModeId, readonly SpriteFrame[]>();
  private sceneMusic = new SceneMusic<AudioClip>();
  private musicLoads = new Map<MusicScene, Promise<void>>();
  private musicVoices: AudioSource[] = [];
  private rewardVoices: Partial<Record<RewardChannel, AudioSource>> = {};
  private audioEvidenceElapsed = 0;
  private readonly audioQA = typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('debug') === '1' &&
    new URLSearchParams(location.search).get('audioQA') === '1';
  private machineAudio = new GameplayAudio<AudioClip>();
  private machineVoices: AudioSource[] = [];
  private musicUnlocked = false; private musicSuspended = false;
  private rewardAudio = new RewardAudio<AudioClip>();
  private rewardPresentation = false;
  private interactionAudio = new InteractionAudio<AudioClip>();
  private clickVoices: AudioSource[] = [];
  private loadingMeter?: { progress: LoadingProgress; sprite: Sprite; caption: Label; percent: number };

  private modeEntry?: ModeEntryLoading;
  private modeEntryView?: ModeEntryLoadingView;

  protected onLoad(): void {
    initializeLanguage(storage());
    this.reduced = (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) || this.save.motionReduced;
    this.inputName = this.save.name; this.accepted = this.save.accepted;
    game.on(Game.EVENT_HIDE, this.onHide, this); game.on(Game.EVENT_SHOW, this.onShow, this); view.on('canvas-resize', this.onResize, this);
    // Browsers require the first playback to happen inside a real interaction.
    globalThis.addEventListener?.('pointerdown', this.unlockMusic, { passive: true });
    globalThis.addEventListener?.('keydown', this.unlockMusic);
    this.node.on(Node.EventType.TOUCH_START, this.unlockMusic, this);
    void this.boot();
  }
  protected onEnable(): void { if (!this.musicSuspended) this.modeEntry?.resume(); }
  protected onDisable(): void { this.modeEntry?.suspend(); }
  protected onDestroy(): void {
    this.artPreparation.dispose();
    this.viewportRefreshPending = false;
    this.modeEntry?.cancel(); this.modeEntry = undefined; this.modeEntryView = undefined;
    this.loadingMeter = undefined;
    this.toastNode?.destroy(); this.toastNode = undefined;
    game.off(Game.EVENT_HIDE, this.onHide, this); game.off(Game.EVENT_SHOW, this.onShow, this); view.off('canvas-resize', this.onResize, this);
    globalThis.removeEventListener?.('pointerdown', this.unlockMusic);
    globalThis.removeEventListener?.('keydown', this.unlockMusic);
    this.node.off(Node.EventType.TOUCH_START, this.unlockMusic, this);
    this.musicSuspended = true; this.rewardAudio.stopAll();
    this.sceneMusic.stopAll(); this.machineAudio.stopAll(); this.interactionAudio.stopAll();
    this.completeSurfaceTransition();
    this.settleCurrentRound(); this.cancelSpin(); this.clearWinTimeline(); this.clearAmbientMotion(); this.unscheduleAllCallbacks(); this.activeOverlay?.destroy();
    for (const frames of this.mascotFrames.values()) for (const frame of frames) frame.destroy();
    this.mascotFrames.clear();
    for (const frames of this.hallKeeperFrames.values()) for (const frame of frames) frame.destroy();
    this.hallKeeperFrames.clear();
    for (const frames of this.blinkFrames.values()) for (const frame of frames) frame.destroy();
    this.blinkFrames.clear();
    for (const frame of this.frames.values()) frame.destroy();
    this.frames.clear();
  }
  private viewportRefreshPending = false;
  private onResize = (): void => {
    // The view event follows resolution adaptation. Coalesce an event burst
    // into one frame's layout pass rather than rebuilding for each raw resize.
    this.viewportRefreshPending = true;
  };
  private flushViewportRefresh(): void {
    // Keep the request while a spin/reward owns the stage; do not cancel its
    // animation or count-up merely because the browser dimensions changed.
    if (!this.viewportRefreshPending || !this.bootReady || this.musicSuspended || this.spinning || this.activeOverlay) return;
    this.viewportRefreshPending = false;
    this.render();
  }
  protected update(dt: number): void {
    this.sceneMusic.update(dt);
    this.publishAudioEvidence(dt);
    this.flushViewportRefresh();
    const entry = this.modeEntry;
    if (entry && !this.musicSuspended) {
      entry.step(dt); this.modeEntryView?.apply();
      if (entry.phase === 'failed') { this.leaveModeEntry(entry, false); }
      else if (entry.phase === 'complete' && !this.transitionLock) { this.leaveModeEntry(entry, true); }
    }
    const meter = this.loadingMeter;
    if (!meter || !meter.caption.isValid || !meter.sprite.isValid) return;
    meter.sprite.fillRange = meter.progress.step(dt);
    if (meter.percent !== meter.progress.percent) {
      meter.percent = meter.progress.percent;
      meter.caption.string = meter.percent === 100 ? tr('Every lantern is ready')
        : tr('Preparing the treasury {percent}%', { percent: meter.percent });
    }
  }
  private async loadMusic(): Promise<void> {
    const voices = [0, 1].map(index => node(this.node, `Scene music voice ${index}`, 0, 0, 0, 0).addComponent(AudioSource));
    this.musicVoices = voices;
    this.sceneMusic.bind(voices); this.syncMusic();
    // Load only the welcome/hall initially. The other scores are lazy, deduped,
    // and never delay the generated artwork or the first playable screen.
    await Promise.all([this.ensureMusic('welcome'), this.ensureMusic('hall')]);
  }
  private ensureMusic(scene: MusicScene): Promise<void> {
    const existing = this.musicLoads.get(scene); if (existing) return existing;
    const task = new Promise<void>(resolve => resources.load(`audio/${MUSIC_TRACKS[scene].asset}`, AudioClip, (error, clip) => {
      if (this.node.isValid) {
        if (error) { console.warn(`[FortuneLanternHouse] Optional ${scene} score unavailable`, error); this.sceneMusic.markUnavailable(scene); }
        else this.sceneMusic.setClip(scene, clip);
      }
      resolve();
    }));
    this.musicLoads.set(scene, task); return task;
  }
  private async loadGameplayAudio(): Promise<void> {
    const rooms = await Promise.all(ROOM_GAMEPLAY_SOUNDS.map(async names => {
      const clips: Partial<Record<GameplaySound, AudioClip>> = {};
      await Promise.all(Object.entries(names).map(async ([kind, path]) => {
        try { clips[kind as GameplaySound] = await new Promise<AudioClip>((resolve, reject) =>
          resources.load(`audio/${path}`, AudioClip, (error, asset) => error ? reject(error) : resolve(asset))); }
        catch (error) { console.warn(`[FortuneLanternHouse] Optional ${path} foley unavailable`, error); }
      }));
      return clips;
    }));
    if (!this.node.isValid) return;
    const voices = [0, 1, 2].map(index => node(this.node, `Machine audio voice ${index}`, 0, 0, 0, 0).addComponent(AudioSource));
    this.machineVoices = voices; this.machineAudio.bind(rooms[0], voices, rooms); this.syncMusic();
  }
  private async loadClicks(): Promise<void> {
    const clips: Partial<Record<InteractionSound, AudioClip>> = {};
    await Promise.all(Object.entries(INTERACTION_SOUNDS).map(async ([kind, path]) => {
      try { clips[kind as InteractionSound] = await new Promise<AudioClip>((resolve, reject) =>
        resources.load(`audio/${path}`, AudioClip, (error, asset) => error ? reject(error) : resolve(asset))); }
      catch (error) { console.warn(`[FortuneLanternHouse] Optional ${path} click unavailable`, error); }
    }));
    if (!this.node.isValid) return;
    this.clickVoices = [0, 1].map(index => node(this.node, `Contact audio voice ${index}`, 0, 0, 0, 0).addComponent(AudioSource));
    this.interactionAudio.bind(clips, this.clickVoices); this.syncMusic();
  }
  private async loadRewardAudio(): Promise<void> {
    const entries = await Promise.all(Object.entries(REWARD_SOUNDS).map(async ([kind, path]) => {
      try {
        const clip = await new Promise<AudioClip>((resolve, reject) =>
          resources.load(`audio/${path}`, AudioClip, (error, asset) => error ? reject(error) : resolve(asset)));
        return [kind as RewardSound, clip] as const;
      } catch (error) {
        console.warn(`[FortuneLanternHouse] Optional ${kind} reward sound unavailable`, error);
        return undefined;
      }
    }));
    if (!this.node.isValid) return;
    const clips: Partial<Record<RewardSound, AudioClip>> = {};
    for (const entry of entries) if (entry) clips[entry[0]] = entry[1];
    // Fixed owned voices: cancellation stops the score/foley, not detached one-shots.
    const voices = {} as Record<RewardChannel, AudioSource>;
    for (const channel of REWARD_CHANNELS) voices[channel] = this.node.addComponent(AudioSource);
    const roomClips = await Promise.all(ROOM_REWARD_SOUNDS.map(async names => {
      const room: Partial<Record<RewardTier, AudioClip>> = {};
      await Promise.all(Object.entries(names).map(async ([tier, path]) => {
        try { room[tier as RewardTier] = await new Promise<AudioClip>((resolve, reject) =>
          resources.load(`audio/${path}`, AudioClip, (error, asset) => error ? reject(error) : resolve(asset))); }
        catch (error) { console.warn(`[FortuneLanternHouse] Optional room phrase ${path} unavailable`, error); }
      }));
      return room;
    }));
    if (!this.node.isValid) return;
    this.rewardVoices = voices;
    this.rewardAudio.bind(clips, voices, roomClips); this.syncMusic();
  }
  /** Only real completed touches call this; cancelled gestures and autoplay stay silent. */
  private playClick(kind: InteractionSound = 'tap'): void {
    if (!this.musicUnlocked && !this.musicSuspended) this.unlockMusic();
    this.interactionAudio.play(kind);
  }
  private unlockMusic = (): void => {
    if (this.musicUnlocked) return; // pointerdown and canvas TOUCH_START report the same gesture
    this.musicUnlocked = true;
    this.syncMusic();
  };
  private syncMusic(): void {
    const audible = audibleAudio(this.save, this.musicUnlocked, this.musicSuspended);
    this.rewardAudio.setAudible(audible.effects); // optional BGM cannot disable reward feedback
    this.machineAudio.setAudible(audible.effects);
    this.interactionAudio.setAudible(audible.effects);
    this.sceneMusic.setDucked(this.rewardPresentation);
    const scene = musicScene(this.modeEntry ? 'game' : this.bootReady ? this.page : 'loading', this.save.selectedMode, this.rulesReturnPage);
    this.sceneMusic.select(scene);
    this.sceneMusic.setAudible(audible.music);
    void this.ensureMusic(scene);
  }
  /** Read-only DOM evidence for explicit local audio QA, not a playback control.
   * No engine/global injection, sample replay, save reset or spin is required. */
  private publishAudioEvidence(dt: number): void {
    if (!this.audioQA || typeof document === 'undefined') return;
    this.audioEvidenceElapsed += dt;
    if (this.audioEvidenceElapsed < .25) return;
    this.audioEvidenceElapsed = 0;
    const voice = (source: AudioSource) => ({
      clip: source.clip?.name ?? null, playing: source.playing,
      loop: source.loop, volume: source.volume,
    });
    document.documentElement.dataset.lanternAudio = JSON.stringify({
      version: 'material-feedback-20261012', page: this.page,
      unlocked: this.musicUnlocked, suspended: this.musicSuspended,
      enabled: this.save.musicEnabled, bgmEnabled: this.save.bgmEnabled, effectsEnabled: this.save.effectsEnabled, music: this.sceneMusic.snapshot,
      musicVoices: this.musicVoices.map(voice),
      rewardVoices: Object.entries(this.rewardVoices).map(([channel, source]) => ({ channel, ...voice(source!) })),
      interaction: this.interactionAudio.snapshot, clicks: this.clickVoices.map(voice),
      machineVoices: this.machineVoices.map(voice),
      machine: this.machineAudio.snapshot,
    });
  }
  private persist(): void { if (!this.guestSession && !this.winPreview) storage().setItem(KEY, JSON.stringify(this.save)); }
  private record(label: string, delta: number): void {
    this.save.ledger.unshift({ label, delta, at: new Date().toLocaleDateString('en-CA') });
    this.save.ledger.length = Math.min(12, this.save.ledger.length);
  }
  private pause(seconds: number): Promise<void> {
    return new Promise(resolve => {
      const cb = () => { this.delayed = this.delayed.filter(item => item !== cb); resolve(); };
      this.delayed.push(cb); this.scheduleOnce(cb, seconds);
    });
  }
  private async loadMascot(mode: ModeId, scene: 'loading' | 'cabinet' | 'prize' = 'loading'): Promise<void> {
    const key = `${scene}:${mode}`;
    this.artPreparation.assertActive();
    if (this.mascotFrames.has(key)) return;
    const art = scene === 'cabinet' ? CABINET_CAST_ART[mode] : scene === 'prize' ? PRIZE_CAST_ART[mode] : MASCOT_ART[0];
    return this.artPreparation.run(`mascot:${key}`, async () => {
      await this.loadArt(art);
      this.artPreparation.assertActive();
      const texture = this.frames.get(art)!.texture!;
      const { columns, width, height } = scene === 'loading' ? MASCOT_ATLAS : CAST_ATLAS;
      const gutter = scene === 'loading' ? 0 : CAST_ATLAS.gutter;
      const count = scene === 'loading' ? MASCOT_ATLAS.frames : castFrameCount(scene);
      const frames: SpriteFrame[] = [];
      for (let i = 0; i < count; i += 1) {
        const frame = new SpriteFrame(); frame.texture = texture;
        frame.rect = new Rect(i % columns * (width + gutter * 2) + gutter,
          Math.floor(i / columns) * (height + gutter * 2) + gutter, width, height);
        frame.originalSize = new Size(width, height); frame.offset = new Vec2();
        frame.packable = false; frames.push(frame);
      }
      this.mascotFrames.set(key, frames);
    });
  }
  private async loadHallKeeper(mode: ModeId): Promise<void> {
    this.artPreparation.assertActive();
    if (this.hallKeeperFrames.has(mode)) return;
    return this.artPreparation.run(`hall:${mode}`, async () => {
      await this.loadArt(HALL_KEEPER_ART[mode]);
      this.artPreparation.assertActive();
      const texture = this.frames.get(HALL_KEEPER_ART[mode])!.texture!;
      const { columns, width, height, gutter, frames: count } = HALL_KEEPER_ATLAS;
      const frames: SpriteFrame[] = [];
      for (let i = 0; i < count; i += 1) {
        const frame = new SpriteFrame(); frame.texture = texture;
        frame.rect = new Rect(i % columns * (width + gutter * 2) + gutter,
          Math.floor(i / columns) * (height + gutter * 2) + gutter, width, height);
        frame.originalSize = new Size(width, height); frame.offset = new Vec2();
        frame.packable = false; frames.push(frame);
      }
      this.hallKeeperFrames.set(mode, frames);
    });
  }
  private cueKeeper(cue: KeeperCue): void {
    this.surface?.getComponentsInChildren(KeeperGestureView).forEach(keeper => keeper.cue(cue));
  }
  private async loadArt(name: string): Promise<void> {
    this.artPreparation.assertActive();
    if (this.frames.has(name)) return;
    return this.artPreparation.run(`texture:${name}`, async () => {
      const texture = await new Promise<Texture2D>((resolve, reject) => resources.load(`art/${name}/texture`, Texture2D, (error, asset) => error ? reject(error) : resolve(asset)));
      this.artPreparation.assertActive();
      texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
      const frame = new SpriteFrame(); frame.texture = texture; frame.packable = false; this.frames.set(name, frame);
    });
  }
  private async loadBlink(mode: ModeId, scene: BlinkScene): Promise<void> {
    const { art, rect: [, , width, height] } = blinkArt(scene, mode);
    this.artPreparation.assertActive();
    if (this.blinkFrames.has(art)) return;
    return this.artPreparation.run(`blink:${art}`, async () => {
      await this.loadArt(art);
      this.artPreparation.assertActive();
      const texture = this.frames.get(art)!.texture!;
      const { columns, frames: count, gutter } = BLINK_ATLAS;
      const frames: SpriteFrame[] = [];
      for (let i = 0; i < count; i += 1) {
        const frame = new SpriteFrame(); frame.texture = texture;
        frame.rect = new Rect(i % columns * (width + gutter * 2) + gutter,
          Math.floor(i / columns) * (height + gutter * 2) + gutter, width, height);
        frame.originalSize = new Size(width, height); frame.offset = new Vec2(); frame.packable = false; frames.push(frame);
      }
      this.blinkFrames.set(art, frames);
    });
  }
  private allArt(): string[] {
    return [
      MASCOT_ART[0], ...TASK_GOLD_ART, TASK_GOLD_REFLECTION, ...Object.values(BLINK_ART).flat().map(item => item.art), ...CABINET_CAST_ART, ...PRIZE_CAST_ART, ...HALL_KEEPER_ART, 'hall-room-previous', 'hall-room-next', 'login-foyer-v4', 'hall-theatre-gallery-v8', 'hall-treasury-stage-v3', 'treasure-atlas', ...HALL_HERO_ART, ...GAME_BACKDROPS, 'store', 'rewards', 'rank', 'account', 'rules', ...PRIZE_STAGES.map(stage => stage.art), ...Object.values(PRIZE_TITLES), ...REEL_ART.flat(),
      'title-stage-house', ...Object.values(PAGE_TITLE_ART), ...Object.values(MODE_TITLE_ART), 'button-gold', 'button-coral', 'coin', 'ui-coin', 'ui-spin-button', 'ui-ticket-button', 'ui-wide-ticket', 'ui-rules-scroll', 'hall-lower-deck-frame', 'hall-journal-ledger', ...KEEPER_ART, 'reward-chest', 'rank-trophy', 'store-coin-platter', 'store-cabinet-v2', 'daily-lantern-route', 'rank-podium-medallion', 'game-cabinet-crown', 'title-house-journal-wide', 'fx-gilded-light', 'fx-prize-rays', 'fx-prize-firework', 'fx-prize-aureole', 'fx-prize-jet', 'fx-prize-streamer', 'prize-ingot', 'prize-jewel-0', 'prize-jewel-1', 'prize-jewel-2', 'prize-jewel-3', ...[0, 1, 2, 3].flatMap(room => [0, 1, 2, 3].map(part => `prize-ornament-${room}-${part}`)), 'fx-cabinet-0', 'fx-cabinet-1', 'fx-cabinet-2', 'fx-cabinet-3', 'spin-face-0', 'spin-face-1', 'spin-face-2', 'spin-face-3', ...[0, 1, 2, 3].map(mode => `hud-inlay-${mode}`),
      ...[0, 1, 2, 3].flatMap(mode => [`bet-minus-${mode}`, `bet-plus-${mode}`, `utility-home-${mode}`, `utility-auto-${mode}`, `utility-rules-${mode}`]),
      ...MODES.map(mode => mode.art), ...SYMBOLS,
    ];
  }
  private async boot(): Promise<void> {
    try {
      // Optional presentation asset is ready before any claimed reward can open.
      const taskGoldEffectReady = new Promise<void>(resolve => resources.load('effects/task-gold-joints', EffectAsset, (error, effect) => {
        if (error) console.warn('[Treasure] Joint material unavailable; retaining safe reward acknowledgement', error);
        else if (this.node.isValid) this.taskGoldEffect = effect;
        resolve();
      }));
      void this.loadMusic();
      void this.loadClicks();
      void this.loadRewardAudio();
      void this.loadGameplayAudio();
      // Paint the loading stage as soon as its two large, visible images are ready.
      // Previously every opening image was awaited before creating the stage, so a
      // cache hit made Loading flash by before its animation could be seen.
      const openingArt = ['hall-treasury-stage-v3', 'title-stage-house'];
      await Promise.all(openingArt.map(name => this.loadArt(name)));
      const loading = this.startSurface('Loading'); const loadingBackdrop = this.background(loading, 'hall-treasury-stage-v3');
      const loadingStartedAt = Date.now();
      const titleY = loadingTitleY(view.getVisibleSize().height / Math.max(loading.scale.y, .001));
      const title = this.image(loading, 'title-stage-house', 0, titleY, 740, 278);
      this.float(title, 3, 3.4);
      const caption = liveLabel(loading, 'Lighting the treasury…', 0, -635, 730, 52, 32, CREAM);
      // These are the only extra images needed by the loading chrome. They are
      // loaded after the stage is already visible, so slow decoding never blanks it.
      await Promise.all(['button-coral', 'ui-wide-ticket', 'ui-coin', 'coin'].map(name => this.loadArt(name)));
      const loadingCoin = this.image(loading, 'ui-coin', 0, -505, 108, 108);
      opacity(loadingCoin, 238); this.float(loadingCoin, 14, 1.35);
      if (!this.reduced) tween(loadingCoin).by(1.15, { angle: 360 }, { easing: 'linear' }).repeatForever().start();
      const track = this.image(loading, 'ui-wide-ticket', 0, -735, 730, 90, true); opacity(track, 247);
      const fill = this.image(loading, 'button-coral', 0, -735, 650, 53, true);
      const fillSprite = fill.getComponent(Sprite)!; fillSprite.type = Sprite.Type.FILLED; fillSprite.fillType = Sprite.FillType.HORIZONTAL; fillSprite.fillStart = 0; fillSprite.fillRange = 0.03;
      const progress = new LoadingProgress(this.reduced);
      this.loadingMeter = { progress, sprite: fillSprite, caption, percent: -1 };
      this.sparkleField(loading, 12, 0, 110);
      // First mascot is decoded before bulk art, so the loading animation also
      // plays during genuine network/texture work, not only a fake final delay.
      await this.loadMascot(0);
      const loadingScale = loadingBackdrop.getComponent(UITransform)!.contentSize.width / 1024;
      loadingBackdrop.addComponent(KeeperGestureView).initialize(this.mascotFrames.get('loading:0')!, 'loading', 0, this.reduced,
        [504, 741, 759, 987], loadingScale);
      const mascotStartedAt = Date.now();
      const art = startupArt(this.allArt()); let done = 0;
      for (let i = 0; i < art.length; i += 4) {
        await Promise.all(art.slice(i, i + 4).map(name => this.loadArt(name)));
        done = Math.min(art.length, i + 4); progress.advance(.03 + .79 * done / art.length);
        await this.pause(0.02);
      }
      // Hall gestures/blinks must be ready for immediate manual switching. Large
      // cabinet/prize banks are prepared by the selected room's real entry work.
      const animationLoads = [0, 1, 2, 3].map(mode => this.loadBlink(mode as ModeId, 'hall'));
      let animated = 0;
      await Promise.all(animationLoads.map(async task => { await task; progress.advance(.82 + .12 * ++animated / animationLoads.length); }));
      let greeted = 0;
      await Promise.all([0, 1, 2, 3].map(async mode => { await this.loadHallKeeper(mode as ModeId); progress.advance(.94 + .03 * ++greeted / 4); }));
      await taskGoldEffectReady; progress.advance(.98);
      // Keep the stage on screen long enough for the first animation loop to read,
      // even when every generated texture was already cached by the preview server.
      const minimumLoadingSeconds = this.reduced ? 0.6 : 2.4;
      const elapsedSeconds = (Date.now() - loadingStartedAt) / 1000;
      if (elapsedSeconds < minimumLoadingSeconds) await this.pause(minimumLoadingSeconds - elapsedSeconds);
      const mascotSeconds = (Date.now() - mascotStartedAt) / 1000;
      if (!this.reduced && mascotSeconds < 2.1) await this.pause(2.1 - mascotSeconds);
      progress.complete(); await this.pause(this.reduced ? 0.08 : 0.32);
      fillSprite.fillRange = 1; caption.string = tr('Every lantern is ready');
      const query = new URLSearchParams(globalThis.location?.search ?? ''); const requested = query.get('screen');
      const valid: Page[] = ['login', 'home', 'game', 'store', 'rewards', 'rank', 'account', 'ledger', 'rules', 'atlas'];
      this.page = query.get('debug') === '1' && valid.includes(requested as Page) ? requested as Page : (this.save.name ? 'home' : 'login');
      const preview = cabinetWinPreview(globalThis.location?.search ?? '', STAKES[this.save.bet]);
      if (preview) {
        this.winPreview = preview;
        this.save = { ...this.save, selectedMode: preview.mode ?? this.save.selectedMode };
        this.reduced = this.reduced || preview.reduced;
      }
      this.loadingMeter = undefined; this.bootReady = true;
      if (this.page === 'game') this.beginModeEntry(MODES[this.save.selectedMode]); else this.render();
    } catch (error) {
      if (!this.node.isValid) return;
      this.loadingMeter = undefined;
      const detail = error instanceof Error ? error.message : String(error);
      console.error('[FortuneLanternHouse] Art boot failed', detail, error);
      if (this.surface) liveLabel(this.surface, `Artwork failed · ${detail.slice(0, 90)}`, 0, -420, 880, 150, 26, CORAL);
    }
  }
  private startSurface(name: string): Node {
    this.toastNode?.destroy(); this.toastNode = undefined;
    // A resize or same-page refresh can arrive during a transition. Finish the
    // previous one first rather than accumulating half-transparent page roots.
    this.completeSurfaceTransition();
    const old = this.surface;
    if (old?.isValid) {
      this.clearAmbientMotion();
      old.pauseSystemEvents(true);
      old.getComponentsInChildren(EditBox).forEach(edit => { edit.enabled = false; });
      this.retiringSurface = old;
    }
    const n = node(this.node, name, 0, 0, 1024, 2048); const size = view.getVisibleSize();
    const scale = Math.min(size.width / 1024, size.height / 1800); n.setScale(scale, scale, 1); this.surface = n;
    // The first loading stage and layout-only refreshes are immediately opaque.
    opacity(n, old && old.name !== name && !this.reduced ? 0 : 255);
    return n;
  }
  private surfaceForeground(surface: Node): Node {
    // Keep all source-registered scenery untouched. Only page copy/controls get
    // their own opacity owner; local transforms and touch rectangles do not move.
    const content = surface.getChildByName('Page foreground') || node(surface, 'Page foreground', 0, 0, 1024, 2048);
    for (const child of Array.from(surface.children)) {
      if (child !== content && !this.surfaceScenery.has(child)) child.setParent(content);
    }
    return content;
  }
  private finishSurfaceTransition(incoming: Node): void {
    const content = this.surfaceForeground(incoming);
    const outgoing = this.retiringSurface;
    if (!outgoing?.isValid || this.reduced || outgoing.name === incoming.name) {
      this.completeSurfaceTransition();
      return;
    }
    // Scenes crossfade over an opaque backplate, so no canvas-clear flash is
    // exposed. Copy does NOT crossfade: the old labels leave before new ones
    // arrive, preventing two wallets/titles/buttons from appearing superimposed.
    opacity(outgoing, 255);
    const outgoingCopy = opacity(this.surfaceForeground(outgoing), 255);
    const incomingCopy = opacity(content, 0);
    tween(outgoingCopy).to(.075, { opacity: 0 }, { easing: 'sineIn' }).start();
    tween(incomingCopy).delay(.075).to(.145, { opacity: 255 }, { easing: 'sineOut' }).start();
    incoming.pauseSystemEvents(true);
    this.transitionLock = true;
    const size = view.getVisibleSize();
    const shield = this.transitionBlocker = node(this.node, 'Page transition input shield', 0, 0, size.width, size.height);
    shield.addComponent(BlockInputEvents);
    const incomingAlpha = opacity(incoming, 0);
    tween(incomingAlpha).to(0.22, { opacity: 255 }, { easing: 'sineInOut' })
      .call(() => { if (this.surface === incoming) this.completeSurfaceTransition(); }).start();
  }
  private completeSurfaceTransition(): void {
    const incoming = this.surface;
    if (incoming?.isValid) {
      const alpha = incoming.getComponent(UIOpacity);
      if (alpha) { Tween.stopAllByTarget(alpha); alpha.opacity = 255; }
      const copy = incoming.getChildByName('Page foreground')?.getComponent(UIOpacity);
      if (copy) { Tween.stopAllByTarget(copy); copy.opacity = 255; }
      incoming.resumeSystemEvents(true);
    }
    const outgoing = this.retiringSurface; this.retiringSurface = undefined;
    if (outgoing?.isValid) {
      const copy = outgoing.getChildByName('Page foreground')?.getComponent(UIOpacity);
      if (copy) Tween.stopAllByTarget(copy);
      outgoing.active = false; outgoing.destroy();
    }
    if (this.transitionBlocker?.isValid) { this.transitionBlocker.active = false; this.transitionBlocker.destroy(); }
    this.transitionBlocker = undefined; this.transitionLock = false;
  }
  private background(parent: Node, name: string): Node {
    const frame = this.frames.get(name); if (!frame) throw new Error(`Missing generated art ${name}`);
    const visible = view.getVisibleSize();
    const surfaceScale = Math.max(parent.scale.x, 0.001);
    const logicalWidth = visible.width / surfaceScale; const logicalHeight = visible.height / surfaceScale;
    const isCabinet = (GAME_BACKDROPS as readonly string[]).includes(name);
    const layout = cabinetViewport(logicalWidth, logicalHeight, frame.rect.width, frame.rect.height);
    const scale = isCabinet ? layout.scale : layout.cover;
    if (isCabinet) {
      this.gameBackdropScale = scale; this.gameChromeScale = layout.chromeScale;
      this.gameWalletY = layout.walletY; this.gameUtilityY = layout.utilityY;
      if (layout.wide) {
        // Only the generated clean plate supplies the quiet side ambience.
        // Do not duplicate animated keepers, reels or interactive controls.
        const ambient = this.image(parent, name, 0, 0, frame.rect.width * layout.cover, frame.rect.height * layout.cover, true);
        this.surfaceScenery.add(ambient);
        ambient.name = 'Cabinet wide-window ambient backplate';
        ambient.getComponent(Sprite)!.color = new Color('#332B22');
      }
    }
    const backdrop = this.image(parent, name, 0, 0, frame.rect.width * scale, frame.rect.height * scale, true);
    this.surfaceScenery.add(backdrop);
    if (isCabinet) this.cabinetBackdrop = backdrop;
    if ((HALL_HERO_ART as readonly string[]).includes(name)) this.hallBackdropScale = scale;
    // Source scene coordinates own both the clean plate and character. Reels
    // and controls remain untouched; only the independent mascot changes frames.
    const hallMode = (HALL_HERO_ART as readonly string[]).indexOf(name);
    const cabinetMode = (GAME_BACKDROPS as readonly string[]).indexOf(name);
    const prizeMode = PRIZE_STAGES.findIndex(stage => stage.art === name);
    if (hallMode >= 0 || cabinetMode >= 0 || prizeMode >= 0) {
      const mode = (hallMode >= 0 ? hallMode : cabinetMode >= 0 ? cabinetMode : prizeMode) as ModeId;
      const scene = hallMode >= 0 ? 'hall' : cabinetMode >= 0 ? 'cabinet' : 'prize';
      if (scene === 'hall') {
        backdrop.addComponent(HallAmbienceView).initialize(mode, this.frames.get('ui-coin')!, this.frames.get('fx-gilded-light')!, scale, this.reduced);
        const frames = this.hallKeeperFrames.get(mode);
        if (frames) backdrop.addComponent(KeeperGestureView).initializeScenePatch(frames, mode, this.reduced,
          HALL_KEEPER_PATCHES[mode], scale);
      } else {
        const frames = this.mascotFrames.get(`${scene}:${mode}`);
        if (frames) backdrop.addComponent(KeeperGestureView).initialize(frames, scene, mode, this.reduced,
          KEEPER_RIGS[scene][mode].bounds, scale);
      }
      // Keep the original generated expression; only the tiny source-registered
      // eyelid patch blinks. No face/gaze/smile morph is layered over the keeper.
      const blink = blinkArt(scene, mode); const eyes = this.blinkFrames.get(blink.art);
      if (eyes) backdrop.getComponent(KeeperGestureView)?.initializeBlink(eyes, scene, mode, this.reduced, blink.rect, scale);
    }
    return backdrop;
  }
  private image(parent: Node, name: string, x: number, y: number, w: number, h: number, stretch = false): Node {
    const frame = this.frames.get(name); if (!frame) throw new Error(`Missing generated art ${name}`);
    if (!stretch) { const scale = Math.min(w / frame.rect.width, h / frame.rect.height); w = frame.rect.width * scale; h = frame.rect.height * scale; }
    const n = node(parent, `Art · ${name}`, x, y, w, h); const sprite = n.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = frame; return n;
  }
  /** Only generated award effects get a separate visibility gate. The image's
   * own position, native fade and destruction remain owned by its old timeline. */
  private particleImage(parent: Node, name: string, x: number, y: number, w: number, h: number, stretch = false): Node {
    const guard = parent.getComponent(KeeperClearanceView);
    if (!guard) return this.image(parent, name, x, y, w, h, stretch);
    const gate = node(parent, `Keeper clearance · ${name}`, 0, 0, 1, 1);
    const image = this.image(gate, name, x, y, w, h, stretch);
    const size = image.getComponent(UITransform)!.contentSize;
    guard.add(gate, image, size.width, size.height);
    return image;
  }
  private float(target: Node, distance = 10, seconds = 2.2): void {
    if (this.reduced) return; const base = target.position.clone();
    tween(target).to(seconds, { position: new Vec3(base.x, base.y + distance, base.z) }, { easing: 'sineInOut' })
      .to(seconds, { position: new Vec3(base.x, base.y - distance, base.z) }, { easing: 'sineInOut' }).union().repeatForever().start();
  }
  private shimmer(target: Node, low = 180, high = 255): void {
    if (this.reduced) return; const a = opacity(target, high);
    tween(a).to(1.2, { opacity: low }, { easing: 'sineInOut' }).to(1.2, { opacity: high }, { easing: 'sineInOut' }).union().repeatForever().start();
  }
  private bindTap(hit: Node, action: () => void, press: () => void = () => {}, release: () => void = () => {}): void {
    const gesture = new ControlTap();
    hit.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
      if (this.closingSheets?.size) return;
      const point = event.getLocation();
      if (gesture.begin(event.getID() ?? 0, point.x, point.y)) press();
    });
    hit.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
      const point = event.getLocation();
      if (gesture.move(event.getID() ?? 0, point.x, point.y)) release();
    });
    hit.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      const pointer = event.getID() ?? 0; if (!gesture.owns(pointer)) return;
      const point = event.getLocation(); const activate = gesture.end(pointer, point.x, point.y);
      release(); if (activate && hit.isValid && !this.transitionLock && !this.closingSheets?.size) action();
    });
    hit.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => { if (gesture.cancel(event.getID() ?? 0)) release(); });
  }
  private controlPress(target: Node, amount = .955): void {
    Tween.stopAllByTarget(target);
    if (!this.reduced) tween(target).to(.085, { scale: new Vec3(amount, amount, 1) }, { easing: 'quadOut' }).start();
  }
  private controlRelease(target: Node): void {
    Tween.stopAllByTarget(target);
    if (this.reduced) target.setScale(1, 1, 1);
    else tween(target).to(.18, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' }).start();
  }
  private button(parent: Node, text: string, x: number, y: number, w: number, h: number, action: () => void, accent: 'gold' | 'coral' = 'gold', size = 36, skin: 'plaque' | 'ticket' | 'spin' = 'plaque'): Node {
    const hit = node(parent, `Button · ${text}`, x, y, w, h);
    const art = skin === 'spin' ? 'ui-spin-button' : skin === 'ticket' ? (w / h > 2.7 ? 'ui-wide-ticket' : 'ui-ticket-button') : accent === 'coral' ? 'button-coral' : 'button-gold';
    this.image(hit, art, 0, 0, w, h, true);
    const copy = buttonLettering(art, w, h);
    const label = liveLabel(hit, text, copy.x, copy.y, copy.width, copy.height, size, skin === 'ticket' ? INK : CREAM);
    label.enableWrapText = false;
    // Lettering travels with the generated hardware; dragging cancels, silently.
    this.bindTap(hit, () => { this.playClick(); action(); }, () => this.controlPress(hit), () => this.controlRelease(hit));
    return hit;
  }
  /** Cabinet controls are registered against the original 1024×1536 artwork,
   * then transformed by the SAME cover scale as the cabinet and reel apertures. */
  private cabinetPoint(px: number, py: number): [number, number] {
    return [(px - 512) * this.gameBackdropScale, (768 - py) * this.gameBackdropScale];
  }
  private cabinetPanelControl(parent: Node, text: string, action: () => void): Node {
    const s = this.gameBackdropScale;
    const [x, y] = this.cabinetPoint(326, 953);
    const hit = node(parent, `Cabinet mode · ${text}`, x, y, 166 * s, 78 * s);
    const label = liveLabel(hit, text, 0, 0, 154 * s, 51 * s, 25 * s, CREAM);
    label.enableWrapText = false;
    this.bindTap(hit, () => { this.playClick(); action(); }, () => this.controlPress(hit), () => this.controlRelease(hit));
    return hit;
  }
  private cabinetBetButton(parent: Node, mode: ModeId, direction: -1 | 1, action: () => void): void {
    const s = this.gameBackdropScale;
    const [x, y] = this.cabinetPoint(direction < 0 ? 634 : 766, 954);
    const hit = node(parent, `BET ${direction < 0 ? 'minus' : 'plus'}`, x, y, 102 * s, 100 * s);
    const fit = [80, 79, 77, 80][mode]; // Match each generated silhouette to the engraved 100px socket.
    const cradle = node(hit, 'Theme control cradle', 0, 0, fit * s, fit * s);
    const face = this.image(cradle, `bet-${direction < 0 ? 'minus' : 'plus'}-${mode}`, 0, 0, fit * s, fit * s, true);
    this.idleCabinetControl(cradle, mode, direction < 0 ? 0.38 : 0.92);
    const flash = this.image(hit, 'fx-gilded-light', 0, 0, 106 * s, 70 * s, true);
    const flashAlpha = opacity(flash, 0);
    this.bindTap(hit, () => {
      if (!this.reduced) {
        Tween.stopAllByTarget(flash); Tween.stopAllByTarget(flashAlpha);
        flash.setScale(0.72, 0.72, 1); flashAlpha.opacity = 175;
        tween(flash).to(0.4, { scale: new Vec3(1.13, 1.13, 1) }, { easing: 'sineOut' }).start();
        tween(flashAlpha).to(0.42, { opacity: 0 }, { easing: 'sineIn' }).start();
      }
      action(); // The accepted adjustment, not its hit box, owns the feedback.
    }, () => this.controlPress(hit, .94), () => this.controlRelease(hit));
  }
  /** These are three different physical control types in each room, all
   * extracted from one CC Switch-generated transparent atlas per theme row. */
  private cabinetUtilityButton(parent: Node, mode: ModeId, role: 'home' | 'auto' | 'rules', text: string, x: number, action: () => void): Node {
    const registration = node(parent, `Cabinet ${role} · registered mount`, x * this.gameChromeScale, this.gameUtilityY, 230, 112);
    registration.setScale(this.gameChromeScale, this.gameChromeScale, 1);
    const hit = node(registration, `Cabinet ${role} · ${text}`, 0, 0, 230, 112);
    const face = this.image(hit, `utility-${role}-${mode}`, 0, 0, 205, 115, true);
    const label = liveLabel(hit, text, 0, -2, role === 'auto' ? 166 : 150, 42, 28, CREAM);
    label.enableWrapText = false;
    this.bindTap(hit, () => { this.playClick(); action(); }, () => this.controlPress(hit), () => this.controlRelease(hit));
    if (!this.reduced && role === 'auto') {
      const gleam = this.image(hit, 'fx-gilded-light', 0, 36, 118, 43, true);
      const alpha = opacity(gleam, 0); this.ambientTargets.push(gleam, alpha);
      tween(alpha).delay(0.8).to(0.46, { opacity: 170 }, { easing: 'sineOut' })
        .to(0.7, { opacity: 0 }, { easing: 'sineIn' }).delay(mode === 2 ? 1.4 : 2.5).union().repeatForever().start();
    }
    return hit;
  }
  /** Mechanical idle movement is owned by the cradle. A press animates the
   * face independently, so tapping never fights a long ambient tween. */
  private idleCabinetControl(cradle: Node, mode: ModeId, phase: number): void {
    if (this.reduced) return;
    this.ambientTargets.push(cradle);
    const seconds = [2.7, 2.3, 1.55, 3.1][mode];
    const lift = [1.035, 1.055, 1.018, 1.03][mode];
    const tilt = [1.8, 0.7, 0, 2.6][mode];
    tween(cradle).delay(phase)
      .to(seconds * 0.48, { scale: new Vec3(lift, lift, 1), angle: tilt }, { easing: 'sineInOut' })
      .to(seconds * 0.52, { scale: new Vec3(1, 1, 1), angle: -tilt }, { easing: 'sineInOut' })
      .union().repeatForever().start();
  }
  private cabinetSpinButton(parent: Node, mode: ModeId, text: string, action: () => void): Node {
    const s = this.gameBackdropScale;
    const [x, y] = this.cabinetPoint(512, 937);
    const hit = node(parent, `Spin · ${text}`, x, y, 158 * s, 158 * s);
    const cradle = node(hit, 'Theme spin cradle', 0, 0, 132 * s, 132 * s);
    const face = this.image(cradle, `spin-face-${mode}`, 0, 0, 132 * s, 132 * s, true);
    this.idleCabinetControl(cradle, mode, 0);
    const label = liveLabel(hit, text, 0, -2 * s, 112 * s, 39 * s, (mode === 3 ? 24 : 27) * s, CREAM);
    label.enableWrapText = false;
    this.bindTap(hit, () => {
      action(); // Debit acceptance owns launch audio; STOP is a neutral touch.
    }, () => this.controlPress(hit, .94), () => this.controlRelease(hit));
    if (!this.reduced) {
      const halo = this.image(parent, 'fx-gilded-light', x, y + 66 * s, 130 * s, 55 * s, true);
      const alpha = opacity(halo, 0); this.ambientTargets.push(halo, alpha);
      tween(alpha).to(0.72, { opacity: 205 }, { easing: 'sineOut' }).to(1.2, { opacity: 0 }, { easing: 'sineIn' })
        .delay(mode === 2 ? 0.65 : 1.55).union().repeatForever().start();
    }
    // Label is a live localized overlay; the mechanical face is unique to this room.
    return hit;
  }
  private header(parent: Node, title: string, subtitle: string, y = 820, compact = false): Node {
    const shortScreen = view.getVisibleSize().height / view.getVisibleSize().width < 1.9;
    const frame = node(parent, 'House title', 0, shortScreen ? Math.min(y, 788) : y, 960, 218);
    const artName = title === 'FORTUNE LANTERN HOUSE' ? 'title-stage-house'
      : this.page === 'game' ? MODE_TITLE_ART[this.save.selectedMode] : PAGE_TITLE_ART[this.page];
    if (artName) {
      const atlasNarrow = this.page === 'atlas' && shortScreen;
      const titleArt = this.image(frame, artName, 0, title === 'FORTUNE LANTERN HOUSE' ? -6 : atlasNarrow ? -35 : shortScreen ? -30 : this.page === 'atlas' ? 42 : 30, atlasNarrow ? 830 : this.page === 'atlas' ? 1010 : compact ? 810 : 850, title === 'FORTUNE LANTERN HOUSE' ? 255 : atlasNarrow ? 190 : this.page === 'atlas' ? 230 : compact ? 175 : 195);
      this.float(titleArt, 3, 3.2);
      if (!this.reduced) {
        // Light catches the two embossed end ornaments in the generated title,
        // leaving the letterforms themselves fully readable. Since these are
        // children of the art, the tiny reflections travel with its float.
        const width = titleArt.getComponent(UITransform)!.contentSize.width;
        for (const [index, side] of [-1, 1].entries()) {
          const gleam = this.image(titleArt, 'fx-gilded-light', side * width * 0.39, 0, 94, 64, true);
          const alpha = opacity(gleam, 0); this.ambientTargets.push(alpha);
          tween(alpha).delay(index * 1.65).to(0.42, { opacity: 182 }, { easing: 'sineOut' })
            .to(0.92, { opacity: 0 }, { easing: 'sineIn' })
            .delay(2.45).union().repeatForever().start();
        }
      }
    }
    // On the lobby the title and wallet occupy this entire band; the subtitle
    // used to sit behind the wallet and looked like clipped copy.
    if (this.page !== 'home' && this.page !== 'login' && this.page !== 'atlas' && (!shortScreen || this.page === 'game')) {
      // The illustrated wordmark extends below its sprite centre. On compact
      // game screens the subtitle uses the clear band before the meter lamps.
      // Other compact pages start their hero art there, so omit the optional
      // flavour subtitle rather than lettering over the generated artwork.
      const subtitleY = this.page === 'game' && shortScreen ? -166 : title === 'FORTUNE LANTERN HOUSE' ? -124 : -80;
      liveLabel(frame, subtitle, 0, subtitleY, 850, 48, this.page === 'game' ? (shortScreen ? 30 : 34) : 28, this.page === 'game' ? CREAM : INK);
    }
    return frame;
  }
  /** Wordmark and copy use the cabinet's source registration, not a fixed
   * viewport header. Motion clearance includes the keeper's full pinned region. */
  private cabinetHeader(parent: Node, mode: ModeId): void {
    const s = this.gameBackdropScale;
    const [px, py, width, height] = CABINET_TITLE_SLOTS[mode];
    const [x, y] = this.cabinetPoint(px, py);
    const title = this.image(parent, MODE_TITLE_ART[mode], x, y, width * s, height * s);
    this.float(title, 1.7 * s, 3.2);
    if (!this.reduced) {
      for (const [index, side] of [-1, 1].entries()) {
        const glint = this.image(title, 'fx-gilded-light', side * width * s * .39, 0, 44 * s, 26 * s, true);
        const alpha = opacity(glint, 0); this.ambientTargets.push(alpha);
        tween(alpha).delay(index * 1.65).to(.42, { opacity: 155 }, { easing: 'sineOut' })
          .to(.92, { opacity: 0 }, { easing: 'sineIn' }).delay(2.45).union().repeatForever().start();
      }
    }
    const [sx, sy] = this.cabinetPoint(CABINET_SUBTITLE[0], CABINET_SUBTITLE[1]);
    const subtitlePlate = this.image(parent, 'ui-wide-ticket', sx, sy, CABINET_SUBTITLE[2] * s, 42 * s, true);
    liveLabel(subtitlePlate, MODE_RULES[mode], 0, 0, (CABINET_SUBTITLE[2] - 78) * s, CABINET_SUBTITLE[3] * s, 25 * s, INK).node.name = 'Cabinet subtitle · keeper clearance';
  }
  private render(): void {
    if (!this.bootReady) return;
    this.viewportRefreshPending = false;
    if (this.modeEntry) { this.renderModeEntry(this.modeEntry); return; }
    this.syncMusic();
    if (this.activeOverlay) this.clearWinTimeline();
    this.activeOverlay?.destroy(); this.activeOverlay = undefined;
    const root = this.startSurface(this.page);
    const art = this.page === 'login' ? 'login-foyer-v4' : this.page === 'home' ? HALL_HERO_ART[this.hallSpotlight] : this.page === 'game' ? GAME_BACKDROPS[this.save.selectedMode] : this.page === 'ledger' ? 'account' : this.page === 'atlas' ? 'treasure-atlas' : this.page;
    const backdrop = this.background(root, art);
    this.hallBackdrop = this.page === 'home' ? backdrop : undefined;
    // Scene-specific generated light stays behind UI, never over labels or taps.
    if (this.page !== 'game' && this.page !== 'home') this.sceneLight(root, this.page);
    // The lobby's pooled light/gold field belongs to its generated backdrop.
    // Do not stack the old screen-space trails over that room-attached field.
    if (this.page === 'game') { this.cabinetThemeCurrent(root); this.architecturalGlints(root, 'cabinet'); this.cabinetCues(root); }
    if (this.page === 'login') this.loginPage(root); else if (this.page === 'home') this.homePage(root); else if (this.page === 'game') this.gamePage(root); else this.servicePage(root);
    this.finishSurfaceTransition(root);
  }
  private navigate(page: Page): void {
    if (this.modeEntry || this.transitionLock || this.spinning || page === this.page) return;
    if (page === 'rules') this.rulesReturnPage = this.page === 'game' ? 'game' : 'home';
    if (page !== 'game') { this.autoRemaining = 0; this.cancelQueuedAuto(); }
    // Assemble the new page before its scene crossfade and non-overlapping copy
    // handoff. The transition shield owns input until the last label is legible.
    this.page = page; this.render();
  }
  private field(parent: Node, placeholder: string, y: number, value: string, onChange: (value: string) => void): void {
    const plate = this.image(parent, 'ui-wide-ticket', 0, y, 640, 92, true); opacity(plate, 246);
    const holder = node(parent, `Input · ${placeholder}`, 0, y, 525, 70); const edit = holder.addComponent(EditBox);
    const textNode = node(holder, 'Input text', 0, 0, 500, 66); const text = textNode.addComponent(Label);
    const hintNode = node(holder, 'Input hint', 0, 0, 500, 66); const hint = hintNode.addComponent(Label);
    [text, hint].forEach(label => { label.fontFamily = 'Arial'; label.fontSize = 32; label.isBold = true; label.horizontalAlign = Label.HorizontalAlign.LEFT; label.verticalAlign = Label.VerticalAlign.CENTER; label.overflow = Label.Overflow.SHRINK; });
    text.color = new Color(INK); hint.color = new Color('#6B8274'); hint.string = tr(placeholder); text.string = value;
    edit.backgroundImage = null!; edit.textLabel = text; edit.placeholderLabel = hint; edit.inputMode = EditBox.InputMode.SINGLE_LINE; edit.maxLength = 18; edit.string = value;
    // EditBox creates fallback TEXT_LABEL / PLACEHOLDER_LABEL children when added at runtime.
    // Keep the two deliberately styled labels above and hide those fallback nodes so no stray
    // "label" text can leak outside the generated ticket on web or native builds.
    const fallbackText = holder.getChildByName('TEXT_LABEL'); if (fallbackText && fallbackText !== textNode) fallbackText.active = false;
    const fallbackHint = holder.getChildByName('PLACEHOLDER_LABEL'); if (fallbackHint && fallbackHint !== hintNode) fallbackHint.active = false;
    holder.on(EditBox.EventType.TEXT_CHANGED, () => onChange(edit.string)); holder.on(EditBox.EventType.EDITING_DID_ENDED, () => onChange(edit.string));
  }
  private loginPage(root: Node): void {
    // The generated console is part of the pavilion architecture. All live controls
    // sit within its uninterrupted ivory inset rather than on a floating marquee.
    this.header(root, 'FORTUNE LANTERN HOUSE', '', 785);
    const console = node(root, 'Built-in entry console', 0, 20, 820, 980);
    liveLabel(console, 'WELCOME TO THE TREASURY', 0, 430, 690, 60, 39, INK);
    liveLabel(console, 'Choose a name for your lantern pass', 0, 363, 690, 42, 27, INK);
    this.field(console, 'Enter a stage name', 270, this.inputName, value => { this.inputName = value.slice(0, 18); });
    this.button(console, this.accepted ? 'HOUSE RULES REVIEWED' : 'REVIEW HOUSE RULES', 0, 134, 620, 90, () => this.reviewRules(root), 'gold', 27, 'ticket');
    this.button(console, 'ENTER AS GUEST', 0, -5, 620, 104, () => this.accepted ? this.enterHouse(true) : this.toast('Please accept the house rules first.'), 'coral', 32, 'plaque');
    this.button(console, 'CREATE LOCAL PASS', 0, -146, 620, 90, () => this.accepted ? this.enterHouse(false) : this.toast('Please accept the house rules first.'), 'gold', 27, 'ticket');
    liveLabel(console, 'Guest: this session only  ·  Local pass: saved here', 0, -255, 690, 46, 25, INK);
    const vows: Array<[string, string]> = [
      ['symbol-ingot', 'Four distinct treasure rituals'],
      ['symbol-lantern', 'Grand by spin 5 · super by spin 10'],
      ['ui-coin', 'Virtual coins only · no cash prizes'],
    ];
    vows.forEach(([art, text], index) => {
      const y = -373 - index * 104;
      const seal = this.image(console, art, -286, y, 56, 56);
      this.shimmer(seal, 205, 255);
      liveLabel(console, text, 48, y, 580, 60, 30, INK);
    });
    this.button(root, `${tr('LANGUAGE')} · ${LANGUAGES.find(item => item.code === language())!.name}`, 0, -700, 470, 76, () => this.languagePicker(root), 'gold', 27, 'ticket');
    this.blocking(root);
  }
  private reviewRules(root: Node): void {
    const modal = node(root, 'House rules for this local demo', 0, 0, 1024, 2048);
    modal.addComponent(BlockInputEvents);
    const plate = this.image(modal, 'ui-rules-scroll', 0, 20, 880, 1100, true);
    liveLabel(plate, 'BEFORE YOU ENTER', 0, 360, 710, 60, 42, INK);
    const statements = [
      'Virtual coins only · no cash value',
      'No withdrawals or cash prizes',
      'Shop adds free demo coins',
      'Local pass saves on this device',
      'Guest play ends with this session',
      'BIG by spin 5 · SUPER by spin 10',
    ];
    statements.forEach((line, i) => {
      this.image(plate, 'symbol-lantern', -290, 234 - i * 93, 44, 44);
      liveLabel(plate, line, 25, 234 - i * 93, 520, 58, 28, INK);
    });
    this.button(plate, 'NOT YET', -200, -358, 350, 92, () => modal.destroy(), 'gold', 28, 'ticket');
    this.button(plate, 'I UNDERSTAND', 200, -358, 350, 92, () => {
      this.accepted = true; this.save.accepted = true; this.persist(); modal.destroy(); this.render();
    }, 'coral', 27, 'plaque');
  }
  private enterHouse(guest: boolean): void {
    const name = this.inputName.trim().slice(0, 18);
    if (!guest && name.length < 2) { this.toast('Enter a name of at least two characters for a local pass.'); return; }
    this.guestSession = guest;
    if (guest) this.save = { ...DEFAULT, guarantee: { ...INITIAL_GUARANTEE }, roomMeters: DEFAULT.roomMeters.map(meter => [...meter] as LanternMeters) as Save['roomMeters'], roomSpins: [0, 0, 0, 0], featureProgress: [0, 0, 0, 0], atlasClaims: [0, 0, 0, 0], journal: freshJournal(''), ledger: [], inbox: {} };
    this.save.name = name || 'Lantern Guest'; this.save.accepted = true; this.persist(); this.navigate('home');
  }
  private homePage(root: Node): void {
    this.header(root, 'FORTUNE LANTERN HOUSE', 'Four treasure rooms · choose your journey', 850, true);
    const wallet = this.image(root, 'ui-wide-ticket', 0, 680, 755, 104, true);
    this.image(wallet, 'ui-coin', -304, 0, 66, 66);
    const treasuryTitle = liveLabel(wallet, 'TREASURY', -125, 0, 245, 45, 29, INK); treasuryTitle.enableWrapText = false;
    this.walletLabel = liveLabel(wallet, this.save.coins.toLocaleString(), 137, 0, 245, 54, 41, INK);
    this.walletLabel.enableWrapText = false;
    // The plus uses an existing CC Switch-generated jade/gold button, seated on
    // the plaque's right ornament. Its generous hit area never covers the value.
    const addCoins = node(wallet, 'Treasury · add virtual coins', 315, 0, 108, 116);
    this.image(addCoins, 'bet-plus-0', 0, 0, 65, 65, true);
    this.bindTap(addCoins, () => { this.playClick(); this.navigate('store'); }, () => this.controlPress(addCoins), () => this.controlRelease(addCoins));

    // Manual room browsing owns the hero. Floor exhibits remain direct entrances,
    // so choosing a named mode never adds a redundant confirmation step.
    const stage = node(root, 'Rotating treasury exhibit', 0, 0, 900, 1060);
    // The keeper is now integrated into the generated room itself. Only a small
    // source-registered forearm patch changes; feet and scene light stay fixed.
    const featurePlate = this.image(stage, 'ui-wide-ticket', 0, -123, 810, 112, true);
    const title = liveLabel(featurePlate, MODES[this.hallSpotlight].name, 0, 17, 710, 52, 44, INK);
    const sub = liveLabel(featurePlate, MODES[this.hallSpotlight].multiplier.toUpperCase(), 0, -30, 710, 37, 29, INK);
    title.enableWrapText = false; sub.enableWrapText = false;
    const shortHall = view.getVisibleSize().height / view.getVisibleSize().width < 1.9;
    const start = this.button(stage, 'PLAY THIS ROOM', 0, shortHall ? -225 : -250, 560, 94,
      () => this.enterMode(MODES[this.hallSpotlight]), 'coral', 32, 'plaque');
    if (!this.reduced) {
      for (const side of [-1, 1]) {
        const gleam = this.image(start, 'fx-gilded-light', side * 222, 0, 80, 66, true);
        const alpha = opacity(gleam, 0); this.ambientTargets.push(alpha);
        tween(alpha).delay(side < 0 ? .25 : 1.65).to(.7, { opacity: 225 }, { easing: 'sineOut' })
          .to(1.1, { opacity: 0 }, { easing: 'sineIn' }).delay(1.4).union().repeatForever().start();
      }
    }
    const stageHit = node(stage, 'Swipe rooms or tap to enter', 0, 240, 820, 490);

    const shortNames = ['JADE', 'PEARL', 'EMBER', 'DRAGON'] as const;
    const floorExhibits: Array<{ hit: Node; icon: Node; label: Label; selection: UIOpacity; room: ModeConfig }> = [];
    MODES.forEach((room, i) => {
      const x = HALL_LOWER_DECK.modeXs[i];
      const y = hallModeRowY(this.hallBackdropScale);
      const hit = node(root, `Enter ${room.name}`, x, y, HALL_LOWER_DECK.modeHitWidth, HALL_LOWER_DECK.modeHitHeight);
      const icon = this.image(hit, room.art, 0, 65, 180, 135);
      // Only the generated miniature flexes about its grounded bottom edge.
      // Its name and generous touch rectangle stay fixed during jelly motion.
      const label = liveLabel(hit, shortNames[i], 0, HALL_LOWER_DECK.modeLabelY, 204, HALL_LOWER_DECK.modeLabelHeight, 34, CREAM);
      label.enableWrapText = false;
      const underline = this.image(hit, 'fx-gilded-light', 0, -96, 136, 18, true);
      const selection = opacity(underline, 0); underline.setSiblingIndex(0);
      floorExhibits.push({ hit, icon, label, selection, room });
    });
    const fortuneMotion = root.addComponent(HallFortuneMotionView);
    fortuneMotion.initialize(floorExhibits, this.hallSpotlight, this.frames.get('ui-coin')!, this.frames.get('fx-gilded-light')!, this.reduced);
    let previousSpotlight: ModeId = this.hallSpotlight;
    let retiringBackdrop: Node | undefined;
    const select = (index: ModeId, direction = 1): void => {
      this.hallSpotlight = index;
      const room = MODES[index];
      if (previousSpotlight !== index && this.hallBackdrop?.isValid) {
        // Complete an interrupted fade before owning a new two-scene pair.
        // Rapid arrows/swipes cannot accumulate half-visible keepers or stages.
        if (retiringBackdrop?.isValid) { retiringBackdrop.active = false; retiringBackdrop.destroy(); }
        retiringBackdrop = undefined;
        const previous = this.hallBackdrop;
        Tween.stopAllByTarget(opacity(previous)); opacity(previous, 255);
        previous.getComponent(KeeperGestureView)?.setPresentationHidden(true);
        previous.getComponent(HallAmbienceView)?.setPresentationHidden(true);
        const next = this.background(root, HALL_HERO_ART[index]);
        next.setSiblingIndex(previous.getSiblingIndex() + 1);
        this.hallBackdrop = next;
        if (this.reduced) previous.destroy();
        else {
          retiringBackdrop = previous; opacity(next, 0);
          tween(opacity(next)).to(0.38, { opacity: 255 }, { easing: 'sineInOut' })
            .call(() => {
              if (previous.isValid) { previous.active = false; previous.destroy(); }
              if (this.hallBackdrop === next) retiringBackdrop = undefined;
            }).start();
        }
      }
      title.string = tr(room.name); sub.string = `${tr(room.subtitle)}  ·  ${tr(room.multiplier)}`;
      floorExhibits.forEach(({ icon, label, selection }, i) => {
        opacity(icon, i === index ? 255 : 205);
        label.color = new Color(i === index ? GOLD : CREAM);
        selection.opacity = i === index ? 175 : 0;
        label.node.getComponent(LabelOutline)!.color = new Color(DARK);
      });
      // Reuse one spring/coin pool per exhibit; rapid swipes cannot stack effects.
      if (previousSpotlight !== index) fortuneMotion.select(index, direction);
      // The new room settles briefly before its quiet greeting starts.
      previousSpotlight = index;
    };
    select(this.hallSpotlight);
    const stepRoom = (direction: 1 | -1): void => {
      select((this.hallSpotlight + direction + MODES.length) % MODES.length as ModeId, direction);
      this.playClick('settle');
    };
    const bindRoomGesture = (hit: Node, onTap: () => void, mode?: ModeId): void => {
      const gesture = new HallRoomGesture();
      hit.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
        const point = event.getLocation();
        if (gesture.begin((event.getID() ?? 0), point.x, point.y) && mode !== undefined) fortuneMotion.press(mode);
      });
      hit.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
        const point = event.getLocation(); gesture.move((event.getID() ?? 0), point.x, point.y);
      });
      hit.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
        const pointer = event.getID() ?? 0; if (!gesture.owns(pointer)) return;
        const point = event.getLocation(); const action = gesture.end(pointer, point.x, point.y);
        if (!action) { if (mode !== undefined) fortuneMotion.release(mode); return; }
        if (mode !== undefined) fortuneMotion.release(mode);
        if (action === 'tap') onTap();
        else stepRoom(action === 'next' ? 1 : -1);
      });
      hit.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
        if (gesture.cancel((event.getID() ?? 0)) && mode !== undefined) fortuneMotion.release(mode);
      });
    };
    bindRoomGesture(stageHit, () => this.enterMode(MODES[this.hallSpotlight]));
    floorExhibits.forEach(({ hit, room }) => bindRoomGesture(hit, () => this.enterMode(room), room.id));
    for (const direction of [-1, 1] as const) {
      const arrow = node(stage, direction < 0 ? 'Previous treasure room' : 'Next treasure room', direction * 405, 130, 144, 144);
      const face = this.image(arrow, direction < 0 ? 'hall-room-previous' : 'hall-room-next', 0, 0, 104, 104);
      arrow.on(Node.EventType.TOUCH_START, () => {
        if (!this.reduced) { Tween.stopAllByTarget(face); tween(face).to(.09, { scale: new Vec3(.94, .94, 1) }, { easing: 'quadOut' }).start(); }
      });
      const restore = (): void => {
        Tween.stopAllByTarget(face);
        if (this.reduced) face.setScale(1, 1, 1);
        else tween(face).to(.16, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' }).start();
      };
      bindRoomGesture(arrow, () => stepRoom(direction));
      arrow.on(Node.EventType.TOUCH_END, restore); arrow.on(Node.EventType.TOUCH_CANCEL, restore);
    }
    // No automatic room tour: a manually chosen exhibit remains selected.
    // One generated lower deck replaces three competing stacked ticket frames.
    // Modes retain their own clear band; daily tasks and primary destinations
    // occupy two non-overlapping rows inside the same piece of house hardware.
    this.navigationDock(root, HALL_LOWER_DECK.y);
  }
  /** One destination for daily goals, the existing atlas and the house rules. */
  private houseJournal(root: Node): void {
    const today = new Date().toLocaleDateString('en-CA');
    this.save.journal = journalForDay(this.save.journal, today);
    const goals = journalGoals(this.save.journal, today);
    const modal = node(root, 'House journal · daily voyage', 0, 0, 1024, 2048);
    modal.addComponent(BlockInputEvents);
    this.setHallPresentationHidden(root, true);
    modal.once(Node.EventType.NODE_DESTROYED, () => {
      if (root.isValid) this.setHallPresentationHidden(root, false);
    });
    const scroll = this.image(modal, 'ui-rules-scroll', 0, -10, 910, 1450, true);
    this.image(scroll, 'title-house-journal-wide', 0, 525, 760, 230, true);
    liveLabel(scroll, 'THREE DAILY MISSIONS · LOCAL VIRTUAL COINS', 0, 411, 735, 45, 27, INK);
    const icons = ['symbol-lantern', 'mode-jade-ferry', 'symbol-ingot'] as const;
    goals.forEach((goal, i) => {
      const y = 247 - i * 228;
      const symbol = this.image(scroll, icons[i], -327, y + 7, 105, 100);
      if (goal.ready) this.shimmer(symbol, 193, 255);
      liveLabel(scroll, goal.name, -63, y + 47, 425, 48, 35, INK);
      liveLabel(scroll, goal.detail, -63, y + 2, 425, 44, 29, INK);
      liveLabel(scroll, goal.claimed ? 'KEPT TODAY' : tr('{progress}/{target} · +{amount} COINS', { progress: goal.progress, target: goal.target, amount: goal.award }), -63, y - 45, 425, 43, 30, INK);
      this.button(scroll, goal.claimed ? 'KEPT' : goal.ready ? 'CLAIM' : 'PLAY', 273, y, 146, 82, () => {
        if (goal.claimed) return;
        if (!goal.ready) {
          modal.destroy();
          const unvisited = this.save.journal.rooms.findIndex(visited => !visited);
          this.enterMode(MODES[i === 1 && unvisited >= 0 ? unvisited : this.save.selectedMode]);
          return;
        }
        const result = claimJournal(this.save.journal, new Date().toLocaleDateString('en-CA'), i);
        if (!result) { this.toast('The daily voyage has changed. Open the journal again.'); return; }
        this.save.journal = result.state; this.save.coins += result.award;
        this.record(`${goal.name} · DAILY VOYAGE`, result.award); this.persist();
        // Settle the wallet first, then let the daily-voyage story earn its
        // reward card: reach into the sash, reveal the generated treasure,
        // sparkle, smile, return it, then enable the confirmation button.
        modal.destroy();
        this.showTaskGoldReveal(tr(goal.name), result.award);
      }, goal.ready ? 'coral' : 'gold', 29, 'ticket');
    });
    this.button(scroll, 'TREASURE ATLAS', -260, -467, 240, 88, () => this.navigate('atlas'), 'gold', 22, 'ticket');
    this.button(scroll, 'MAIL', 0, -467, 240, 88, () => { modal.destroy(); this.mailbox(root); }, 'gold', 26, 'ticket');
    this.button(scroll, 'HOUSE RULES', 260, -467, 240, 88, () => this.navigate('rules'), 'gold', 22, 'ticket');
    this.button(scroll, 'CLOSE JOURNAL', 0, -589, 500, 90, () => modal.destroy(), 'coral', 29, 'plaque');
  }
  private enterMode(room: ModeConfig): void {
    if (!this.bootReady || this.modeEntry || this.transitionLock || this.spinning) return;
    this.hallSpotlight = room.id; this.save.selectedMode = room.id; this.save.selectedLane = room.lane;
    this.round = undefined; this.shown = undefined;
    this.persist(); this.beginModeEntry(room); this.playClick('enter');
  }
  private beginModeEntry(room: ModeConfig): void {
    this.autoRemaining = 0; this.cancelQueuedAuto();
    const entry = this.modeEntry = new ModeEntryLoading(room.id, this.reduced);
    if (this.musicSuspended) entry.suspend();
    this.renderModeEntry(entry); this.syncMusic();
    // Actual prerequisites, including the room's unique controls/symbols and
    // prize cast. Cached calls are no-ops, not a made-up 0→100 timer.
    const work: readonly [EntryWork, () => Promise<unknown>][] = [
      ['cabinet', () => Promise.all(roomCabinetArt(room.id).map(art => this.loadArt(art)))],
      ['symbols', () => Promise.all(REEL_ART[room.id].map(art => this.loadArt(art)))],
      ['keeper', () => Promise.all([this.loadMascot(room.id, 'cabinet'), this.loadBlink(room.id, 'cabinet')])],
      ['celebration', () => Promise.all([this.loadMascot(room.id, 'prize'), this.loadBlink(room.id, 'prize'),
        ...roomCelebrationArt(room.id).map(art => this.loadArt(art))])],
    ];
    for (const [key, prepare] of work) void prepare().then(() => {
      if (this.node.isValid && this.modeEntry === entry) entry.completeWork(key);
    }).catch(error => {
      if (!this.node.isValid || this.modeEntry !== entry) return;
      console.warn('[FortuneLanternHouse] Room preparation failed', error); entry.fail();
    });
  }
  private renderModeEntry(entry: ModeEntryLoading): void {
    const theme = MODE_ENTRY_THEMES[entry.mode];
    const root = this.startSurface(`Entering room ${entry.mode}`);
    const backdrop = this.background(root, theme.scene);
    backdrop.getComponent(KeeperGestureView)?.cue('greet');
    const visible = view.getVisibleSize(); const scale = Math.max(root.scale.y, .001);
    const layout = modeEntryLayout(visible.height / scale);
    const title = this.image(root, theme.title, 0, layout.titleY, 790, 250);
    this.float(title, 3, 3.4);
    const panel = this.image(root, 'ui-wide-ticket', 0, layout.panelY, 800, 170, true);
    panel.name = `Room ${entry.mode} loading · generated progress fixture`;
    const emblem = this.image(panel, theme.emblem, -300, 0, 104, 112);
    const glint = this.image(panel, 'fx-gilded-light', -278, 20, 95, 64);
    const caption = liveLabel(panel, theme.preparing, 58, 30, 524, 48, 36, INK);
    caption.enableWrapText = false;
    this.image(panel, 'button-gold', 58, -25, 520, 33, true);
    const fill = this.image(panel, 'fx-gilded-light', 58, -25, 466, 11, true).getComponent(Sprite)!;
    fill.type = Sprite.Type.FILLED; fill.fillType = Sprite.FillType.HORIZONTAL; fill.fillStart = 0;
    this.modeEntryView = root.addComponent(ModeEntryLoadingView);
    this.modeEntryView.initialize(entry, fill, caption, emblem, glint, this.frames.get('fx-gilded-light')!);
    liveLabel(root, 'Your coins and bet stay unchanged', 0, layout.tipY, 820, 44, 33, CREAM);
    const shield = node(root, 'Room preparation input shield', 0, 0, visible.width / scale, visible.height / scale);
    shield.addComponent(BlockInputEvents);
    this.finishSurfaceTransition(root);
  }
  private leaveModeEntry(entry: ModeEntryLoading, ready: boolean): void {
    if (this.modeEntry !== entry) return;
    entry.cancel(); this.modeEntry = undefined; this.modeEntryView = undefined;
    this.page = ready ? 'game' : 'home'; this.render();
    if (!ready && this.surface) this.toast('This room could not open. Please try again.');
  }
  private setHallPresentationHidden(root: Node, hidden: boolean): void {
    root.getComponent(HallFortuneMotionView)?.setPresentationHidden(hidden);
    root.getComponentsInChildren(HallAmbienceView).forEach(field => field.setPresentationHidden(hidden));
  }
  private navigationDock(root: Node, y: number): void {
    const geometry = HALL_LOWER_DECK;
    const dock = this.image(root, 'hall-lower-deck-frame', 0, y, geometry.width, geometry.height, true);
    dock.name = 'Hall lower deck · daily tasks and destinations';
    const today = new Date().toLocaleDateString('en-CA');
    const readyCount = journalGoals(this.save.journal, today).filter(goal => goal.ready).length;
    const dailyStatus = this.save.daily === today ? tr('TOMORROW') : `+${DAILY_AWARDS[this.save.dailyStreak % 7].toLocaleString()}`;
    const journalStatus = readyCount ? tr('{amount} READY', { amount: readyCount }) : tr('DAILY VOYAGE');
    const utilities: Array<[string, string, string, () => void]> = [
      ['DAILY GIFTS', 'symbol-lantern', dailyStatus, () => this.navigate('rewards')],
      ['HOUSE JOURNAL', 'hall-journal-ledger', journalStatus, () => this.houseJournal(root)],
    ];
    utilities.forEach(([title, art, status, action], i) => {
      const hit = node(dock, `Open ${title}`, geometry.utilityXs[i], geometry.utilityY, geometry.utilityWidth, geometry.utilityHeight);
      const icon = this.image(hit, art, -168, 0, 56, 64);
      const titleLabel = liveLabel(hit, title, 27, 20, 310, 42, 36, INK);
      titleLabel.node.name = `Deck utility title · ${title}`; titleLabel.enableWrapText = false;
      const statusLabel = liveLabel(hit, status, 27, -23, 310, 38, 32, INK);
      statusLabel.node.name = `Deck utility status · ${title}`; statusLabel.enableWrapText = false;
      // The shared generated jade inlay is the background; only its local content
      // presses. No extra floating plaque or frame is stacked over the modes.
      this.bindTap(hit, () => { this.playClick(); action(); }, () => this.controlPress(hit, .975), () => this.controlRelease(hit));
      if (i === 0 || readyCount) this.shimmer(icon, 210, 255);
    });
    const entries: Array<[string, string, Page]> = [
      ['SHOP', 'store-coin-platter', 'store'], ['GIFTS', 'reward-chest', 'rewards'],
      ['RANK', 'rank-trophy', 'rank'], ['PROFILE', 'account-keeper-portrait', 'account'],
    ];
    entries.forEach(([label, art, page], i) => {
      const x = geometry.modeXs[i];
      const hit = node(dock, `Open ${label}`, x, geometry.navigationY, geometry.navigationWidth, geometry.navigationHeight);
      const icon = this.image(hit, art, 0, geometry.navigationIconY, 100, geometry.navigationIconHeight);
      if (!this.reduced) {
        this.ambientTargets.push(icon);
        tween(icon).delay(i * 0.32).to(1.9 + i * 0.16, { position: new Vec3(0, geometry.navigationIconY + geometry.navigationFloatLift, 0) }, { easing: 'sineInOut' })
          .to(1.9 + i * 0.16, { position: new Vec3(0, geometry.navigationIconY, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
      }
      const destinationLabel = liveLabel(hit, label, 0, geometry.navigationLabelY, geometry.navigationLabelWidth, 42, 32, INK);
      destinationLabel.node.name = `Deck destination title · ${label}`; destinationLabel.enableWrapText = false;
      this.bindTap(hit, () => { this.playClick(); this.navigate(page); }, () => this.controlPress(hit, .975), () => this.controlRelease(hit));
    });
  }
  private ferryMotion(root: Node): void {
    if (this.reduced) return; const ferry = this.image(root, 'mode-jade-ferry', 380, -245, 170, 150); opacity(ferry, 120);
    tween(ferry).to(4.6, { position: new Vec3(-380, -230, 0) }, { easing: 'sineInOut' }).to(4.6, { position: new Vec3(380, -245, 0) }, { easing: 'sineInOut' }).union().repeatForever().start();
  }
  private sparkleField(root: Node, count: number, centerX = 0, centerY = 0): void {
    if (this.reduced) return;
    for (let i = 0; i < count; i += 1) {
      const x = centerX - 430 + ((i * 173) % 860); const y = centerY - 420 + ((i * 241) % 840);
      const mote = this.particleImage(root, i % 3 === 0 ? 'ui-coin' : 'coin', x, y, 18 + (i % 3) * 10, 18 + (i % 3) * 10); opacity(mote, 48 + (i % 4) * 14);
      tween(mote).delay(i * 0.09).to(1.7 + (i % 3) * 0.4, { position: new Vec3(x + (i % 2 ? 22 : -18), y + 34, 0), angle: i * 36 }, { easing: 'sineInOut' })
        .to(1.7 + (i % 3) * 0.4, { position: new Vec3(x, y, 0), angle: i * 72 }, { easing: 'sineInOut' }).union().repeatForever().start();
    }
  }
  private clearAmbientMotion(): void {
    this.ambientTargets.forEach(target => Tween.stopAllByTarget(target));
    this.ambientTargets.length = 0;
  }
  /** One-shot reflected light is confined to an existing metal detail. It has
   * no independent decorative frame and destroys itself after the cue. */
  private metalFlash(parent: Node, x: number, y: number, width: number, height: number, delay = 0, strength = 220): void {
    if (this.reduced || !parent.isValid) return;
    const gleam = this.image(parent, 'fx-gilded-light', x, y, width, height, true);
    const alpha = opacity(gleam, 0);
    tween(alpha).delay(delay).to(0.16, { opacity: strength }, { easing: 'sineOut' })
      .to(0.55, { opacity: 0 }, { easing: 'sineIn' })
      .call(() => { if (gleam.isValid) gleam.destroy(); }).start();
  }
  /** Every stopping reel throws a short reflection onto its two fixed bezel
   * lips. This is feedback on the machine, not an overlay across the symbols. */
  private reelStopCue(column: number): void {
    this.machineAudio.columnStop(column);
    if (this.reduced || !this.surface?.isValid || this.page !== 'game') return;
    const s = this.gameBackdropScale;
    for (const [index, py] of [475, 869].entries()) {
      const [x, y] = this.cabinetPoint(280 + column * 116, py);
      this.metalFlash(this.surface, x, y, 95 * s, 43 * s, index * 0.06, 205);
    }
  }
  /** A pair of offset trails follows the carved side rails, never the reel or HUD.
   * All sprites come from the generated art set and are recycled by infinite tweens
   * only for the lifetime of this page's root. No per-frame allocation or timers. */
  private treasuryCurrent(root: Node, scene: 'hall' | 'cabinet'): void {
    if (this.reduced) return;
    const hall = scene === 'hall';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 6; i += 1) {
        const s = hall ? this.hallBackdropScale : 1;
        const rail = hall ? (386 + (i % 3) * 7) * s : 452 + (i % 3) * 10;
        const x = side * rail;
        const y = hall ? (-58 + i * 64) * s : -220 + i * 96;
        const size = hall ? 27 + i % 3 * 7 : 43 + i % 3 * 7;
        const isLight = i % 3 === 0;
        const fleck = this.image(root, isLight ? 'fx-gilded-light' : i % 2 ? 'coin' : 'ui-coin',
          x, y, isLight ? (hall ? 62 * s : 135) : size * s, isLight ? (hall ? 36 * s : 80) : size * s, isLight);
        const alpha = opacity(fleck, 0); this.ambientTargets.push(fleck, alpha);
        const delay = ((i * 5 + (side > 0 ? 3 : 0)) % 9) * 0.26;
        const rise = hall ? 40 * s : 65;
        const span = 2.6 + (i % 3) * 0.32;
        tween(fleck).delay(delay)
          .to(span * 0.55, { position: new Vec3(x - side * (hall ? 5 * s : 16), y + rise * 0.55, 0), angle: side * 14 }, { easing: 'sineOut' })
          .to(span * 0.45, { position: new Vec3(x - side * (hall ? 8 * s : 27), y + rise, 0), angle: side * 27 }, { easing: 'sineInOut' })
          .call(() => { if (fleck.isValid) { fleck.setPosition(x, y, 0); fleck.angle = 0; } })
          .union().repeatForever().start();
        tween(alpha).delay(delay).to(span * 0.28, { opacity: isLight ? (hall ? 160 : 228) : hall ? 150 : 185 }, { easing: 'sineOut' })
          .to(span * 0.42, { opacity: isLight ? (hall ? 95 : 154) : hall ? 105 : 125 }, { easing: 'sineInOut' })
          .to(span * 0.3, { opacity: 0 }, { easing: 'sineIn' })
          .union().repeatForever().start();
      }
    }
  }
  /** Rock a generated figure around its lower contact point, so the head and
   * raised treasure visibly sway while the feet stay grounded. No new drawn art. */
  private swayFigure(figure: Node, degrees: number, seconds: number, drift = 4): void {
    if (this.reduced) return;
    const transform = figure.getComponent(UITransform)!;
    const height = transform.contentSize.height;
    transform.setAnchorPoint(0.5, 0.14);
    const base = new Vec3(figure.position.x, figure.position.y - height * 0.36, figure.position.z);
    figure.setPosition(base);
    this.ambientTargets.push(figure);
    tween(figure)
      .to(seconds, { position: new Vec3(base.x + drift, base.y + 6, base.z), angle: degrees, scale: new Vec3(1.014, 1.014, 1) }, { easing: 'sineInOut' })
      .to(seconds * 1.08, { position: new Vec3(base.x - drift, base.y + 4, base.z), angle: -degrees, scale: new Vec3(1.01, 1.01, 1) }, { easing: 'sineInOut' })
      .to(seconds * 0.8, { position: base, angle: 0, scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
      .union().repeatForever().start();
  }
  /** The character and its treasure stage are one generated sculpture. A slow
   * lower-pivot rock reads as movement without detaching the figure from it. */
  private exhibitBreath(hero: Node): void { this.swayFigure(hero, 1.55, 1.85, 1.5); }
  /** Short flashes lift out of the treasure at staggered beats, below the title plaque. */
  private exhibitGlints(stage: Node): void {
    if (this.reduced) return;
    const s = this.hallBackdropScale;
    HALL_EXHIBIT_GLINTS.forEach(([px, py, w, h], i) => {
      const x = (px - 512) * s, y = (768 - py) * s;
      const glint = this.image(stage, 'fx-gilded-light', x, y, w * s, h * s, true);
      const alpha = opacity(glint, 0); this.ambientTargets.push(glint, alpha);
      const delay = i * 0.54;
      tween(glint).delay(delay).to(2.45, { position: new Vec3(x + (i % 2 ? 7 : -7) * s, y + 22 * s, 0), angle: 12 }, { easing: 'sineOut' })
        .call(() => { if (glint.isValid) { glint.setPosition(x, y, 0); glint.angle = 0; } })
        .union().repeatForever().start();
      tween(alpha).delay(delay).to(0.5, { opacity: 165 }).to(1.05, { opacity: 110 })
        .to(0.9, { opacity: 0 }).union().repeatForever().start();
    });
  }
  /** Reflections sit on the inlaid floor / cabinet bezel, rather than drifting over content. */
  private architecturalGlints(root: Node, scene: 'hall' | 'cabinet'): void {
    if (this.reduced) return;
    const hall = scene === 'hall';
    const s = hall ? this.hallBackdropScale : 1;
    const anchors = hall ? HALL_INLAY_GLINTS.map(([px, py, w, h]) => [(px - 512) * s, (768 - py) * s, w * s, h * s])
      : [[-350, 335, 105, 60], [350, 335, 105, 60], [-350, 64, 105, 60], [350, 64, 105, 60],
        [-350, -180, 105, 60], [350, -180, 105, 60], [0, -240, 135, 72], [300, -360, 135, 72]];
    anchors.forEach(([x, y, w, h], index) => {
      const light = this.image(root, 'fx-gilded-light', x, y, w, h, true);
      const alpha = opacity(light, 0); this.ambientTargets.push(light, alpha);
      const delay = (index * 0.79) % 3.7;
      tween(light).delay(delay).to(0.75, { position: new Vec3(x + (index % 2 ? 7 : -7) * s, y + 3 * s, 0) }, { easing: 'sineInOut' })
        .to(0.72, { position: new Vec3(x, y, 0) }, { easing: 'sineInOut' })
        .delay(2.6).union().repeatForever().start();
      tween(alpha).delay(delay).to(0.42, { opacity: 157 }, { easing: 'sineOut' })
        .to(0.9, { opacity: 0 }, { easing: 'sineIn' }).delay(2.75).union().repeatForever().start();
    });
  }
  /** Generated glints re-light metal, lanterns and floor inlays, not UI stickers.
   * Each page has its own anchors; these live behind controls and stop with the page. */
  private sceneLight(root: Node, page: Page): void {
    if (this.reduced) return;
    const layouts: Partial<Record<Page, Array<[number, number, number, number]>>> = {
      login: [[-430, 562, 160, 130], [430, 562, 160, 130], [-418, -448, 105, 75], [418, -448, 105, 75], [0, -810, 310, 77]],
      home: HALL_SCENE_LIGHTS.map(([px, py, w, h]) => [(px - 512) * this.hallBackdropScale, (768 - py) * this.hallBackdropScale, w * this.hallBackdropScale, h * this.hallBackdropScale]),
      store: [[-412, 609, 146, 118], [412, 609, 146, 118], [-329, -322, 140, 73], [329, -322, 140, 73], [0, -571, 310, 67]],
      rewards: [[-399, 475, 128, 105], [399, 475, 128, 105], [-319, -43, 105, 69], [319, -43, 105, 69], [0, -446, 258, 72]],
      rank: [[-395, 586, 145, 125], [395, 586, 145, 125], [-285, 402, 122, 80], [285, 402, 122, 80], [0, -568, 278, 62]],
      account: [[-405, 686, 124, 100], [405, 686, 124, 100], [-360, -403, 110, 72], [360, -403, 110, 72]],
      ledger: [[-405, 686, 124, 100], [405, 686, 124, 100], [-338, -528, 115, 72], [338, -528, 115, 72]],
      rules: [[-396, 605, 125, 90], [396, 605, 125, 90]],
      atlas: [[-394, 550, 125, 90], [394, 550, 125, 90]],
    };
    (layouts[page] || []).forEach(([x, y, w, h], index) => {
      const light = this.image(root, 'fx-gilded-light', x, y, w, h, true);
      const alpha = opacity(light, 0); this.ambientTargets.push(light, alpha);
      const lead = index * 0.43;
      tween(light).delay(lead).to(1.18, { position: new Vec3(x + (index % 2 ? -12 : 12), y + 5, 0) }, { easing: 'sineInOut' })
        .to(1.18, { position: new Vec3(x, y, 0) }, { easing: 'sineInOut' }).delay(1.75).union().repeatForever().start();
      tween(alpha).delay(lead).to(0.65, { opacity: 205 }, { easing: 'sineOut' })
        .to(1.0, { opacity: 65 }, { easing: 'sineInOut' })
        .to(0.72, { opacity: 0 }, { easing: 'sineIn' }).delay(1.74).union().repeatForever().start();
    });
  }
  private exhibitBacklight(stage: Node): void {
    if (this.reduced) return;
    // Reflections light the side shrines / lower plinth, not the keeper's face.
    const s = this.hallBackdropScale;
    HALL_BACKLIGHTS.forEach(([px, py, w, h], index) => {
      const beam = this.image(stage, 'fx-gilded-light', (px - 512) * s, (768 - py) * s, w * s, h * s, true);
      const alpha = opacity(beam, 18); this.ambientTargets.push(beam, alpha);
      tween(alpha).delay(index * 0.82).to(1.15, { opacity: 215 }, { easing: 'sineOut' })
        .to(1.55, { opacity: 20 }, { easing: 'sineInOut' }).delay(0.7).union().repeatForever().start();
    });
  }
  /** A quiet, staggered reveal gives each real image its own place in the room. */
  private settleIntoPlace(target: Node, delay: number, rise = 30): void {
    if (this.reduced) return;
    const p = target.position.clone(); const alpha = opacity(target, 0);
    target.setPosition(p.x, p.y - rise, p.z);
    tween(target).delay(delay).to(0.58, { position: p }, { easing: 'sineOut' }).start();
    tween(alpha).delay(delay).to(0.48, { opacity: 255 }, { easing: 'sineOut' }).start();
  }
  private gameBackdropScale = 1;
  private gameChromeScale = 1;
  private gameWalletY = -535;
  private gameUtilityY = -710;
  private hallBackdropScale = 1;
  private reelPositions(): { columns: number[]; rows: number[]; size: number } {
    const scale = this.gameBackdropScale;
    return { columns: [280, 396, 512, 628, 744].map(x => (x - 512) * scale),
      rows: [542, 666, 790].map(y => (768 - y) * scale), size: 94 * scale };
  }
  private gamePage(root: Node): void {
    const mode = MODES[this.save.selectedMode];
    this.cabinetHeader(root, mode.id);
    this.keeperInteraction(root, mode.id);
    // The original generated arch supplies the crown; an extra floating crest
    // competed with the keeper/subtitle and is intentionally not layered here.
    this.meters(root);
    const board = this.shown || this.defaultBoard(); this.boardNodes = []; this.boardNodeRefs = []; this.incomingNodes = []; this.incomingSprites = [];
    const { columns, rows, size } = this.reelPositions();
    for (let c = 0; c < 5; c += 1) for (let r = 0; r < 3; r += 1) {
      // Each aperture clips a two-symbol vertical strip. Both symbols actually travel
      // through the cabinet window instead of snapping to a new image every tick.
      const aperture = node(root, `Reel ${c + 1} · row ${r + 1}`, columns[c], rows[r], size * 1.08, size * 1.12);
      const mask = aperture.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_RECT;
      const symbolNode = this.image(aperture, reelArt(this.save.selectedMode, board[c][r]), 0, 0, size, size);
      const nextNode = this.image(aperture, reelArt(this.save.selectedMode, (board[c][r] + 1) % SYMBOLS.length), 0, size * 1.12, size, size);
      this.boardNodes.push(symbolNode.getComponent(Sprite)!); this.boardNodeRefs.push(aperture);
      this.incomingNodes.push(nextNode); this.incomingSprites.push(nextNode.getComponent(Sprite)!);
    }
    // The reel window is display-only: an invisible full-window hit target caused
    // unintended spins when players inspected symbols or tapped nearby controls.
    // Only the themed SPIN control and explicitly enabled AUTO may start a round.
    // The generated cabinet has three separate controls: left jewel, central
    // pearl and right enamel well. Keep all hit targets inside their own inlay.
    const left = this.cabinetPanelControl(root, this.cabinetFeatureText(), () => {
      if (this.spinning) return;
      if (mode.id > 1) { this.navigate('rules'); return; }
      this.save.selectedLane = (this.save.selectedLane + 1) % 3; this.persist();
      this.refreshMeters();
    });
    this.cabinetFeatureLabel = left.getComponentInChildren(Label) || undefined;
    const adjustBet = (direction: -1 | 1): void => {
      if (this.spinning || this.activeOverlay) { this.playClick('blocked'); return; }
      const next = Math.max(0, Math.min(STAKES.length - 1, this.save.bet + direction));
      if (next === this.save.bet) { this.playClick('blocked'); this.toast(direction > 0 ? 'Maximum bet selected.' : 'Minimum bet selected.'); return; }
      this.save.bet = next; this.persist(); this.playClick(direction > 0 ? 'betUp' : 'betDown');
      if (this.betLabel) this.betLabel.string = tr('BET {amount}', { amount: STAKES[next] });
    };
    this.cabinetBetButton(root, mode.id, -1, () => adjustBet(-1));
    this.cabinetBetButton(root, mode.id, 1, () => adjustBet(1));
    const faceText = ['SAIL', 'BLOOM', 'FORGE', 'UNSEAL'][mode.id];
    this.spinFace = this.cabinetSpinButton(root, mode.id, faceText,
      () => { if (this.spinning) { this.playClick(); this.fastForwardSpin(); } else void this.spin(); });
    const footer = node(root, 'Cabinet wallet · registered mount', 0, this.gameWalletY, 880, 82);
    footer.setScale(this.gameChromeScale, this.gameChromeScale, 1);
    this.image(footer, `hud-inlay-${mode.id}`, 0, 0, 880, 82, true);
    this.image(footer, 'ui-coin', -365, 0, 43, 43); this.walletLabel = liveLabel(footer, tr('COINS {amount}', { amount: hudAmount(this.save.coins) }), -210, 0, 300, 55, 34, CREAM);
    this.betLabel = liveLabel(footer, tr('BET {amount}', { amount: STAKES[this.save.bet] }), 30, 0, 165, 55, 32, CREAM); this.winLabel = liveLabel(footer, tr('WIN {amount}', { amount: hudAmount(this.round?.award || 0) }), 260, 0, 240, 55, 32, CREAM);
    for (const label of [this.walletLabel, this.betLabel, this.winLabel]) label.enableWrapText = false;
    this.cabinetUtilityButton(root, mode.id, 'home', 'HOME', -302, () => this.navigate('home'));
    const auto = this.cabinetUtilityButton(root, mode.id, 'auto', this.autoRemaining > 0 ? tr('STOP {amount}', { amount: this.autoRemaining }) : 'AUTO ×5', 0, () => this.toggleAuto());
    this.autoLabel = auto.getComponentInChildren(Label) || undefined;
    this.cabinetUtilityButton(root, mode.id, 'rules', 'RULES', 302, () => this.navigate('rules'));
    // A concise live status belongs to the cabinet's own dark enamel beam.
    // The complete match detail remains in the win reveal; it cannot fit on
    // this small physical display without shrinking to unreadable text.
    const [statusX, statusY] = this.cabinetPoint(512, 1050);
    this.statusLabel = liveLabel(root, this.winPreview ? 'PREVIEW · NO COIN CHANGES' : this.round ? this.round.award ? tr('WIN {amount}', { amount: hudAmount(this.round.award) }) : tr('NO MATCH') : tr('PRESS SPIN'),
      statusX, statusY, 510 * this.gameBackdropScale, 48 * this.gameBackdropScale, 29 * this.gameBackdropScale, CREAM);
    this.reportWinPreview('ready');
  }
  /** A keeper tap is presentation-only, bounded above the reels. It cannot
   * debit / award coins or call SPIN; scrolling across the keeper is not a tap. */
  private keeperInteraction(root: Node, mode: ModeId): void {
    const bounds = KEEPER_RIGS.cabinet[mode].bounds;
    const [x, y] = this.cabinetPoint((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2);
    const hit = node(root, 'Greet treasure keeper · no spin', x, y,
      (bounds[2] - bounds[0]) * this.gameBackdropScale, (bounds[3] - bounds[1]) * this.gameBackdropScale);
    this.bindTap(hit, () => {
      if (this.activeOverlay || this.spinning) return;
      this.playClick(); this.cueKeeper('greet');
    });
  }
  /** Animate generated treasure currents *inside* the two carved outside columns.
   * The mask is attached to the same 1024×1536 artwork transform as the reels.
   * The two sides are offset; each generated trail moves and fades as a single
   * carved current, never covering controls or readable display. */
  private cabinetThemeCurrent(root: Node): void {
    if (this.reduced) return;
    const mode = this.save.selectedMode;
    const s = this.gameBackdropScale;
    for (const side of [-1, 1] as const) {
      const [railX, railY] = this.cabinetPoint(side < 0 ? 190 : 834, 690);
      const clip = node(root, `Carved ${side < 0 ? 'left' : 'right'} column current`, railX, railY, 67 * s, 420 * s);
      const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_RECT;
      const current = this.image(clip, `fx-cabinet-${mode}`, 0, -103 * s,
        (mode === 1 ? 91 : 87) * s, 270 * s, true);
      if (side > 0) current.setScale(-1, 1, 1);
      const alpha = opacity(current, 0); this.ambientTargets.push(current, alpha);
      const delay = side > 0 ? 1.35 : 0;
      const duration = mode === 2 ? 3.0 : mode === 1 ? 4.0 : 3.55;
      tween(current).delay(delay)
        .to(duration, { position: new Vec3((side < 0 ? 4 : -4) * s, 76 * s, 0) }, { easing: 'sineInOut' })
        .call(() => { if (current.isValid) current.setPosition(0, -103 * s, 0); })
        .union().repeatForever().start();
      tween(alpha).delay(delay).to(0.7, { opacity: mode === 2 ? 184 : 167 }, { easing: 'sineOut' })
        .delay(duration - 1.45).to(0.75, { opacity: 0 }, { easing: 'sineIn' })
        .union().repeatForever().start();
    }
  }
  /** Light follows the generated metal rails and the three fixed lamps. It is
   * created behind reels and labels, so it cannot float over gameplay or eat taps. */
  private cabinetCues(root: Node): void {
    if (this.reduced) return;
    const mode = this.save.selectedMode;
    const s = this.gameBackdropScale;
    const pulse = [3.4, 4.1, 2.4, 3.1][mode];
    const lanterns = [[300, 327], [512, 324], [724, 327]] as const;
    lanterns.forEach(([px, py], index) => {
      const [x, y] = this.cabinetPoint(px, py);
      const glow = this.image(root, 'fx-gilded-light', x, y, 166 * s, 114 * s, true);
      const alpha = opacity(glow, 22); this.ambientTargets.push(glow, alpha);
      // Forge heats in quick left-to-right waves; lotus and jade breathe gently;
      // the dragon alternates its outer two lamps with the central jewel.
      const phase = mode === 3 ? (index === 1 ? pulse * 0.48 : 0) : index * pulse * 0.22;
      tween(alpha).delay(phase)
        .to(pulse * 0.31, { opacity: mode === 2 ? 250 : 227 }, { easing: 'sineOut' })
        .to(pulse * 0.39, { opacity: 30 }, { easing: 'sineIn' })
        .delay(pulse * 0.3).union().repeatForever().start();
    });
    // The relief surrounding each physical jewel brightens in turn. The
    // generated button sprite is drawn afterward and remains the tap target.
    [[512, 936], [634, 954], [766, 954]].forEach(([px, py], index) => {
      const [x, y] = this.cabinetPoint(px, py);
      const aura = this.image(root, 'fx-gilded-light', x, y, 178 * s, 126 * s, true);
      const alpha = opacity(aura, 0); this.ambientTargets.push(aura, alpha);
      const delay = (mode === 3 ? [0, 1.35, 0.4] : mode === 2 ? [0, 0.42, 0.84] : [0.5, 1.65, 2.7])[index];
      tween(alpha).delay(delay)
        .to(0.58, { opacity: 238 }, { easing: 'sineOut' })
        .to(0.88, { opacity: 26 }, { easing: 'sineIn' })
        .delay(mode === 2 ? 1.2 : 2.2).union().repeatForever().start();
    });
    // A long reflection is clipped into each narrow carved metal lip; it never
    // crosses the reel symbols, the BET values, or the live controls.
    const rails = [{ py: 472, width: 714, height: 25 }, { py: 1085, width: 708, height: 33 }];
    rails.forEach(({ py, width, height }, index) => {
      const [x, y] = this.cabinetPoint(512, py);
      const clip = node(root, `Cabinet metal rail ${index + 1}`, x, y, width * s, height * s);
      const mask = clip.addComponent(Mask); mask.type = Mask.Type.GRAPHICS_RECT;
      const beam = this.image(clip, 'fx-gilded-light', -width * s * 0.55, 0, 184 * s, height * s * 2.5, true);
      const alpha = opacity(beam, 0); this.ambientTargets.push(beam, alpha);
      const delay = index * pulse * 0.55;
      tween(beam).delay(delay)
        .to(mode === 2 ? 1.25 : 1.85, { position: new Vec3(width * s * 0.55, 0, 0) }, { easing: 'sineInOut' })
        .call(() => { if (beam.isValid) beam.setPosition(-width * s * 0.55, 0, 0); })
        .delay(mode === 2 ? 1.5 : 2.6).union().repeatForever().start();
      tween(alpha).delay(delay).to(0.34, { opacity: 210 }, { easing: 'sineOut' })
        .delay(mode === 2 ? 0.62 : 1.22).to(0.54, { opacity: 0 }, { easing: 'sineIn' })
        .delay(mode === 2 ? 1.25 : 2.21).union().repeatForever().start();
    });
    const gems = mode === 0 ? [[184, 660], [840, 660], [190, 1003], [834, 1003]]
      : mode === 1 ? [[185, 687], [839, 687], [193, 1020], [831, 1020]]
      : mode === 2 ? [[184, 580], [840, 580], [190, 1010], [834, 1010]]
      : [[184, 665], [840, 665], [190, 1008], [834, 1008]];
    gems.forEach(([px, py], index) => {
      const [x, y] = this.cabinetPoint(px, py);
      const glint = this.image(root, 'fx-gilded-light', x, y, 105 * s, 72 * s, true);
      const alpha = opacity(glint, 0); this.ambientTargets.push(glint, alpha);
      const delay = (index % 2) * pulse * 0.5 + Math.floor(index / 2) * pulse * 0.24;
      tween(glint).delay(delay)
        .to(pulse * 0.38, { position: new Vec3(x + (index % 2 ? -12 : 12) * s, y + 9 * s, 0) }, { easing: 'sineOut' })
        .to(pulse * 0.35, { position: new Vec3(x, y, 0) }, { easing: 'sineInOut' })
        .delay(pulse * 0.27).union().repeatForever().start();
      tween(alpha).delay(delay).to(pulse * 0.27, { opacity: 178 }, { easing: 'sineOut' })
        .to(pulse * 0.46, { opacity: 0 }, { easing: 'sineIn' })
        .delay(pulse * 0.27).union().repeatForever().start();
    });
  }
  private meterText(): string[] {
    const mode = this.save.selectedMode; const progress = this.save.featureProgress[mode];
    return mode === 0 ? this.save.roomMeters[0].map((value, i) => tr('TIDE {lane} · {percent}%', { lane: i + 1, percent: value }))
      : mode === 1 ? [tr('PATH {amount}', { amount: this.save.selectedLane + 1 }), 'PEARLS HOLD', 'ONE RE-SPIN']
      : mode === 2 ? [tr('INGOTS {amount}/60', { amount: progress }), 'FORGE RELEASE', 'BONUS 2×']
      : [tr('SEALS {amount}/3', { amount: progress }), 'CHAIN WINS', 'BONUS 5×'];
  }
  private cabinetFeatureText(): string {
    const mode = this.save.selectedMode;
    return mode === 0 ? tr('TIDE {amount}', { amount: this.save.selectedLane + 1 })
      : mode === 1 ? tr('PATH {amount}', { amount: this.save.selectedLane + 1 })
      : mode === 2 ? tr('FORGE {amount}/60', { amount: this.save.featureProgress[2] })
      : tr('SEALS {amount}/3', { amount: this.save.featureProgress[3] });
  }
  private refreshMeters(): void {
    if (this.cabinetFeatureLabel?.isValid) this.cabinetFeatureLabel.string = this.cabinetFeatureText();
    const labels = this.meterText();
    labels.forEach((text, index) => {
      if (this.meterLabels[index]?.isValid) this.meterLabels[index].string = tr(text);
      const plaque = this.meterPlaques[index];
      if (plaque?.isValid) opacity(plaque, (this.save.selectedMode === 0 && index === this.save.selectedLane) || (this.save.selectedMode !== 0 && index === 0) ? 252 : 222);
    });
  }
  private meters(root: Node): void {
    this.meterLabels = []; this.meterPlaques = [];
    const xs = [-280, 0, 280]; const mode = this.save.selectedMode;
    const [, meterY] = this.cabinetPoint(512, CABINET_METER_Y);
    this.meterText().forEach((text, i) => {
      const plaque = this.image(root, `hud-inlay-${mode}`, xs[i], meterY, 250, 52, true);
      this.image(plaque, reelArt(mode, PRIMARY_SYMBOL[mode]), -87, 0, 29, 29);
      this.meterPlaques.push(plaque);
      this.meterLabels.push(liveLabel(plaque, text, 16, 0, 164, 34, 25, CREAM));
    });
    this.refreshMeters();
  }
  private defaultBoard(): Board { return Array.from({ length: 5 }, (_, c) => Array.from({ length: 3 }, (_, r) => ((c + r) % SYMBOLS.length) as 0 | 1 | 2 | 3 | 4 | 5)); }
  private randomBoard(): Board { return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => Math.floor(Math.random() * SYMBOLS.length) as 0 | 1 | 2 | 3 | 4 | 5)); }
  private setBoard(board: Board): void {
    this.shown = board; for (let c = 0; c < 5; c += 1) for (let r = 0; r < 3; r += 1) { const sprite = this.boardNodes[c * 3 + r]; if (sprite?.isValid) sprite.spriteFrame = this.frames.get(reelArt(this.save.selectedMode, board[c][r]))!; }
  }
  private setColumn(column: number, values: Board): void {
    if (!this.shown) this.shown = this.defaultBoard();
    for (let row = 0; row < 3; row += 1) { this.shown[column][row] = values[column][row]; const sprite = this.boardNodes[column * 3 + row]; if (sprite?.isValid) sprite.spriteFrame = this.frames.get(reelArt(this.save.selectedMode, values[column][row]))!; }
  }
  private async animateColumn(column: number, finalBoard: Board, token: number, held?: readonly {column: number; row: number}[]): Promise<void> {
    const cycles = this.reduced ? 0 : held ? 4 + column : 7 + column * 2;
    const locked = (row: number) => held?.some(cell => cell.column === column && cell.row === row) ?? false;
    const travel = this.reelPositions().size * 1.12;
    for (let step = 0; step < cycles; step += 1) {
      if (token !== this.spinToken || this.skipSpin) return;
      const coast = step / Math.max(1, cycles - 1);
      const duration = step === 0 ? 0.15 : coast < 0.65 ? 0.075 : 0.075 + Math.pow((coast - 0.65) / 0.35, 2) * 0.115;
      const easing = step === 0 ? 'quadIn' : coast > 0.65 ? 'quadOut' : 'linear';
      const previews = this.randomBoard();
      for (let row = 0; row < 3; row += 1) {
        if (locked(row)) continue;
        const index = column * 3 + row;
        const current = this.boardNodes[index].node;
        const incoming = this.incomingNodes[index];
        this.incomingSprites[index].spriteFrame = this.frames.get(reelArt(this.save.selectedMode, previews[column][row]))!;
        current.setPosition(0, 0, 0); incoming.setPosition(0, travel, 0);
        tween(current).to(duration, { position: new Vec3(0, -travel, 0) }, { easing }).start();
        tween(incoming).to(duration, { position: new Vec3(0, 0, 0) }, { easing }).start();
      }
      await this.pause(duration);
      if (token !== this.spinToken || this.skipSpin) return;
      for (let row = 0; row < 3; row += 1) {
        if (locked(row)) continue;
        const index = column * 3 + row;
        const current = this.boardNodes[index].node;
        const incoming = this.incomingNodes[index];
        Tween.stopAllByTarget(current); Tween.stopAllByTarget(incoming);
        this.boardNodes[index].spriteFrame = this.incomingSprites[index].spriteFrame;
        current.setPosition(0, 0, 0); incoming.setPosition(0, travel, 0);
      }
      if (column === 3 && step === cycles - 1 && this.round && (this.round.presentationTier === 'big' || this.round.presentationTier === 'super') && this.statusLabel)
        this.statusLabel.string = tr(this.round.presentationTier === 'super' ? 'SUPER WIN NEAR' : 'BIG WIN NEAR');
    }
    if (token !== this.spinToken || this.skipSpin) return;
    this.setColumn(column, finalBoard);
    if (this.reduced) return;
    this.reelStopCue(column);
    for (let row = 0; row < 3; row += 1) {
      if (locked(row)) continue;
      const cell = this.boardNodeRefs[column * 3 + row];
      tween(cell).to(0.075, { scale: new Vec3(1, 0.91, 1) }, { easing: 'quadOut' })
        .to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }
    await this.pause(0.15);
  }
  private resetReelMotion(): void {
    for (let index = 0; index < this.boardNodes.length; index += 1) {
      const current = this.boardNodes[index]?.node; const incoming = this.incomingNodes[index]; const aperture = this.boardNodeRefs[index];
      if (current?.isValid) { Tween.stopAllByTarget(current); current.setPosition(0, 0, 0); }
      if (incoming?.isValid) { Tween.stopAllByTarget(incoming); incoming.setPosition(0, this.reelPositions().size * 1.12, 0); }
      if (aperture?.isValid) { Tween.stopAllByTarget(aperture); aperture.setScale(1, 1, 1); }
    }
    if (this.spinFace?.isValid) { Tween.stopAllByTarget(this.spinFace); this.spinFace.angle = 0; }
  }
  private flushPauses(): void {
    for (const callback of [...this.delayed]) { this.unschedule(callback); callback(); }
  }
  private fastForwardSpin(): void {
    if (!this.spinning || this.skipSpin) return;
    this.skipSpin = true;
    this.machineAudio.stopAll();
    this.resetReelMotion(); this.flushPauses();
  }
  private cancelSpin(): void {
    this.machineAudio.stopAll();
    this.autoRemaining = 0; this.cancelQueuedAuto(); this.skipSpin = true; this.spinToken += 1; this.spinning = false;
    this.resetReelMotion(); this.flushPauses();
  }
  private onHide = (): void => {
    this.completeSurfaceTransition();
    this.modeEntry?.suspend();
    this.musicSuspended = true; this.syncMusic();
    this.settleCurrentRound();
    if ((this.spinning || this.pendingWinReveal) && this.round && this.round.presentationTier !== 'none') this.resumeWinTier = this.round.presentationTier;
    this.clearWinTimeline();
    if (this.spinning && this.round) { this.cancelSpin(); this.setBoard(this.round.board); this.persist(); }
  };
  private onShow = (): void => {
    this.musicSuspended = false; this.modeEntry?.resume(); this.syncMusic();
    if (this.modeEntry) return;
    if (!this.bootReady || this.page !== 'game' || this.spinning) return;
    if (this.activeOverlay) {
      // Hide cancels the owned award timeline. On return, retire that settled
      // presentation rather than leaving a modal with no dismissal callback.
      if (this.activeOverlay.name.startsWith('Win ·')) this.closeWin();
      return;
    }
    this.render();
    if (this.resumeWinTier) { const tier = this.resumeWinTier; this.resumeWinTier = undefined; this.showWin(tier); }
  };
  private cancelQueuedAuto(): void { if (this.queuedAuto) { this.unschedule(this.queuedAuto); this.queuedAuto = undefined; } }
  private toggleAuto(): void {
    if (this.autoRemaining) { this.autoRemaining = 0; this.cancelQueuedAuto(); if (this.autoLabel) this.autoLabel.string = tr('AUTO ×5'); return; }
    if (this.spinning || this.activeOverlay) return;
    this.autoRemaining = 5; if (this.autoLabel) this.autoLabel.string = tr('STOP {amount}', { amount: 5 });
    void this.spin();
  }
  private queueAuto(): void {
    this.cancelQueuedAuto();
    if (!this.autoRemaining || this.page !== 'game') return;
    const next = () => { this.queuedAuto = undefined; if (this.autoRemaining && this.page === 'game' && !this.spinning && !this.activeOverlay) void this.spin(); };
    this.queuedAuto = next; this.scheduleOnce(next, this.reduced ? 0.12 : 0.5);
  }
  private async spin(): Promise<void> {
    if (this.spinning || this.page !== 'game' || this.activeOverlay) return;
    this.cancelQueuedAuto();
    if (this.winPreview) { this.playClick(); this.showWin(this.winPreview.tier); return; }
    const stake = STAKES[this.save.bet]; if (this.save.coins < stake) { this.playClick('blocked'); this.autoRemaining = 0; if (this.autoLabel) this.autoLabel.string = tr('AUTO ×5'); this.toast('Not enough coins · visit the shop for demo coins.'); return; }
    if (this.autoRemaining > 0) { this.autoRemaining -= 1; if (this.autoLabel) this.autoLabel.string = this.autoRemaining ? tr('STOP {amount}', { amount: this.autoRemaining }) : tr('AUTO ×5'); }
    this.round = createRound({ spinsBefore: this.save.spins, bet: stake, lane: this.save.selectedLane, mode: this.save.selectedMode, meters: this.save.roomMeters[this.save.selectedMode], guarantee: this.save.guarantee, featureProgress: this.save.featureProgress[this.save.selectedMode] });
    const reservation = reserveSpin(this.save.coins, stake, this.save.spins + 1, this.round.award, MODES[this.save.selectedMode].name);
    this.save.coins = reservation.balance; this.save.pendingSpin = reservation.pending;
    this.save.spins += 1; this.save.roomSpins[this.save.selectedMode] += 1;
    this.save.journal = recordJournalSpin(this.save.journal, new Date().toLocaleDateString('en-CA'), this.save.selectedMode, this.round.award > 0);
    this.record(`${reservation.pending.label} · BET`, -stake);
    this.save.guarantee = this.round.guarantee; this.save.roomMeters[this.save.selectedMode] = this.round.meters; this.save.featureProgress[this.save.selectedMode] = this.round.featureProgress;
    // Persist the debit before the reel moves; payout is committed separately on settle.
    this.persist(); this.refreshMeters(); this.skipSpin = false; this.spinning = true; const token = ++this.spinToken;
    if (this.walletLabel) this.walletLabel.string = tr('COINS {amount}', { amount: hudAmount(this.save.coins) });
    if (this.winLabel) this.winLabel.string = tr('WIN {amount}', { amount: '0' });
    this.cueKeeper('spin');
    this.machineAudio.begin(!this.reduced, this.save.selectedMode, true);
    this.playBetDebit(stake);
    const faceLabel = this.spinFace?.getComponentInChildren(Label); if (faceLabel) faceLabel.string = tr('STOP');
    if (this.statusLabel) this.statusLabel.string = tr('SPINNING');
    if (this.spinFace && !this.reduced) tween(this.spinFace).to(0.35, { angle: 4 }, { easing: 'sineInOut' }).to(0.35, { angle: -4 }, { easing: 'sineInOut' }).union().repeatForever().start();
    await Promise.all([0, 1, 2, 3, 4].map(column => this.animateColumn(column, this.round!.firstBoard ?? this.round!.board, token)));
    if (token === this.spinToken && !this.skipSpin && this.round.firstBoard && this.round.lockedCells && !this.reduced) {
      this.setBoard(this.round.firstBoard);
      if (this.statusLabel) this.statusLabel.string = tr('PEARLS HELD');
      this.highlightWinCells(this.round.lockedCells);
      this.machineAudio.feature();
      await this.pause(0.35);
      if (token === this.spinToken && !this.skipSpin) {
        this.machineAudio.begin(true, this.save.selectedMode);
        await Promise.all([0, 1, 2, 3, 4].map(column => this.animateColumn(column, this.round!.board, token, this.round!.lockedCells)));
      }
    }
    if (token !== this.spinToken) return;
    this.machineAudio.stopReels();
    this.resetReelMotion(); this.setBoard(this.round.board); this.spinning = false;
    if ((this.round.featureBonus > 0 || this.round.lanternBonus > 0) && !this.round.firstBoard) this.machineAudio.feature();
    this.settleCurrentRound(false);
    if (faceLabel?.isValid) faceLabel.string = tr(['SAIL', 'BLOOM', 'FORGE', 'UNSEAL'][this.save.selectedMode]);
    // The transaction is already durable, but its reveal waits for the cabinet
    // to finish the result beat. Closing/skipping the scene renders the true balance.
    if (!this.round.award && this.walletLabel) this.walletLabel.string = tr('COINS {amount}', { amount: hudAmount(this.save.coins) });
    if (this.statusLabel) this.statusLabel.string = this.round.award ? tr('WIN {amount}', { amount: '…' }) : tr('NO MATCH');
    const tier = this.round.presentationTier;
    if (tier !== 'none') this.cueKeeper(tier);
    if (tier === 'none') { this.queueAuto(); return; }
    this.highlightWinCells(this.round.matchedCells);
    const reveal = () => { this.pendingWinReveal = undefined; if (this.page === 'game' && token === this.spinToken && !this.activeOverlay) this.showWin(tier); };
    this.pendingWinReveal = reveal;
    if (!this.reduced && !this.skipSpin) this.playWinAnticipation(tier);
    this.scheduleOnce(reveal, this.reduced || this.skipSpin ? 0.05 : tier === 'super' ? 0.88 : tier === 'big' ? 0.72 : 0.58);
  }
  private settleCurrentRound(updateHud = true): void {
    const pending = this.save.pendingSpin;
    if (!pending) return;
    this.save.coins = settleSpin(this.save.coins, pending).balance;
    this.save.totalWon += pending.award;
    this.save.best = Math.max(this.save.best, pending.award);
    if (pending.award) this.record(`${pending.label} · WIN`, pending.award);
    this.save.pendingSpin = undefined; this.persist();
    if (updateHud && this.walletLabel?.isValid) this.walletLabel.string = tr('COINS {amount}', { amount: hudAmount(this.save.coins) });
  }
  private playBetDebit(stake: number): void {
    if (this.reduced || !this.surface) return;
    const root = this.surface;
    const coin = this.image(root, 'ui-coin', -365, -535, 53, 53);
    const alpha = opacity(coin, 255);
    tween(coin).to(0.28, { position: new Vec3(-92, -365, 0), scale: new Vec3(0.64, 0.64, 1) }, { easing: 'sineInOut' })
      .to(0.25, { position: new Vec3(0, -210, 0), scale: new Vec3(0.18, 0.18, 1) }, { easing: 'quadIn' })
      .call(() => { if (coin.isValid) coin.destroy(); }).start();
    tween(alpha).delay(0.29).to(0.22, { opacity: 0 }, { easing: 'sineIn' }).start();
    if (this.walletLabel?.isValid) tween(this.walletLabel.node).to(0.11, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'sineOut' })
      .to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' }).start();
  }
  private playWinAnticipation(tier: Exclude<Tier, 'none'>): void {
    if (!this.surface) return;
    const root = this.surface;
    const s = this.gameBackdropScale;
    for (const [index, px] of [310, 512, 714].entries()) {
      const [x, y] = this.cabinetPoint(px, tier === 'super' ? 365 : 450);
      const glint = this.image(root, 'fx-gilded-light', x, y, 118 * s, 85 * s, true);
      const alpha = opacity(glint, 0);
      tween(alpha).delay(index * 0.12).to(0.2, { opacity: 235 }, { easing: 'sineOut' })
        .to(0.36, { opacity: 0 }, { easing: 'sineIn' }).call(() => { if (glint.isValid) glint.destroy(); }).start();
    }
    // Treasure crosses the side carvings before the prize stage is visible.
    // All particles are instances of the CC Switch-generated coin art.
    const count = tier === 'super' ? 12 : tier === 'big' ? 8 : 4;
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 ? 1 : -1;
      const [x, y] = this.cabinetPoint(side < 0 ? 214 : 810, 478 + (i % 3) * 31);
      const coin = this.image(root, 'coin', x, y, (27 + (i % 3) * 6) * s, (27 + (i % 3) * 6) * s);
      const alpha = opacity(coin, 0);
      const delay = i * 0.048;
      tween(coin).delay(delay).to(0.56, { position: new Vec3(x + side * 13 * s, y - (120 + i % 3 * 22) * s, 0), angle: side * (80 + i * 19) }, { easing: 'sineIn' })
        .call(() => { if (coin.isValid) coin.destroy(); }).start();
      tween(alpha).delay(delay).to(0.12, { opacity: 230 }, { easing: 'sineOut' })
        .to(0.44, { opacity: 0 }, { easing: 'sineIn' }).start();
    }
    if (this.statusLabel) this.statusLabel.string = tr(tier === 'super' ? 'CELESTIAL RESERVE' : tier === 'big' ? 'GOLDEN SURGE' : 'LANTERN SPARK');
  }
  private highlightWinCells(cells: Round['matchedCells']): void {
    if (this.reduced) return;
    for (const { column, row } of cells) {
      const ref = this.boardNodeRefs[column * 3 + row]; if (!ref) continue;
      tween(ref).to(0.14, { scale: new Vec3(1.16, 1.16, 1) }, { easing: 'quadOut' }).to(0.28, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' }).repeat(2).start();
    }
  }
  private clearWinTimeline(holdPresentation = false): void {
    if (this.pendingWinReveal) { this.unschedule(this.pendingWinReveal); this.pendingWinReveal = undefined; }
    if (this.winCounterTick) { this.unschedule(this.winCounterTick); this.winCounterTick = undefined; }
    for (const cue of this.winCues) this.unschedule(cue);
    this.winCues.length = 0;
    const presentation = this.activeOverlay?.getComponentInChildren(CabinetWinView);
    if (holdPresentation) presentation?.hold(); else presentation?.finish();
    if (this.activeWinAmount?.isValid) this.activeWinAmount.string = tr('{amount} COINS', { amount: this.activeWinTarget.toLocaleString() });
    this.activeWinAmount = undefined;
    this.rewardAudio.stopPresentation(); this.rewardPresentation = false; this.syncMusic();
  }
  private winCue(overlay: Node, seconds: number, action: () => void): void {
    const cue = () => {
      this.winCues = this.winCues.filter(item => item !== cue);
      if (overlay.isValid && this.activeOverlay === overlay) action();
    };
    this.winCues.push(cue); this.scheduleOnce(cue, seconds);
  }
  /** Reuse the actual themed control, including its original ambient motion.
   * Only its hit target is lifted above the input shield. Never stack a second
   * button/label/halo or retain destroyed tween targets after each award. */
  private cabinetCollectControl(overlay: Node): void {
    const label = this.spinFace?.getComponentInChildren(Label);
    if (label?.isValid) label.string = tr('COLLECT');
    const [x, y] = this.cabinetPoint(512, 937), s = this.gameBackdropScale;
    const hit = node(overlay, 'Collect · existing physical spin control', x, y, 158 * s, 158 * s);
    this.bindTap(hit, () => { this.playClick('tap'); this.closeWin(); },
      () => { if (this.spinFace?.isValid) this.controlPress(this.spinFace, .94); },
      () => { if (this.spinFace?.isValid) this.controlRelease(this.spinFace); });
  }
  /** Refund-sized wins stay in the physical cabinet, not a fullscreen poster. */
  private showCabinetWin(): void {
    if (!this.surface) return;
    const overlay = node(this.surface, 'Win · ordinary', 0, 0, 1024, 2048);
    this.activeOverlay = overlay; this.rewardPresentation = true; this.syncMusic();
    if (this.statusLabel) this.statusLabel.node.active = false;
    const [x, y] = this.cabinetPoint(512, 1050), s = this.gameBackdropScale;
    const amount = liveLabel(overlay, tr('{amount} COINS', { amount: 0 }), x, y, 470 * s, 46 * s, 30 * s, CREAM);
    this.activeWinAmount = amount; this.activeWinTarget = this.round?.award ?? 0;
    this.cabinetCollectControl(overlay);
    this.blocking(overlay);
    this.rewardAudio.play('ordinary', Date.now(), this.save.selectedMode);
    this.countUp(amount, this.activeWinTarget, 1.15);
    if (!this.reduced) {
      const ordinaryMount = node(overlay, 'Ordinary source-registered celebration', 0, 0, 1024, 1536);
      ordinaryMount.setScale(s, s, 1);
      const effects = node(ordinaryMount, 'Cabinet coin return', 0, 0, 1024, 1536);
      if (this.cabinetBackdrop) effects.addComponent(KeeperClearanceView).initialize(this.cabinetBackdrop,
        [[0, 0, 1024, 438], [0, 896, 1024, 1536]]);
      this.treasureFountains(effects, 12, [0, 768 - 852]);
      const rails = node(overlay, 'Ordinary gold rail glints', 0, 0, 1024, 1536);
      rails.setScale(s, s, 1);
      for (const [px, py, w, h] of CABINET_WIN_LIGHTS.slice(8)) {
        const glint = this.image(rails, 'fx-gilded-light', px - 512, 768 - py, w, h, true);
        const light = opacity(glint, 0);
        tween(light).to(.26, { opacity: 190 }).to(.8, { opacity: 65 }).to(.42, { opacity: 0 }).start();
      }
      this.rewardAudio.play('coins');
    }
    // A brief readable hold then back to play; collection is presentation-only.
    this.winCue(overlay, this.reduced ? 1.1 : 2.35, () => this.closeWin());
  }
  private showWin(tier: Exclude<Tier, 'none'>): void {
    if (!this.surface || this.page !== 'game') return;
    this.clearWinTimeline(); this.activeOverlay?.destroy(); this.winClosing = false;
    if (tier === 'ordinary') { this.showCabinetWin(); return; }
    const mode = this.save.selectedMode;
    // A local presentation layer, NOT a second page or a replacement backdrop.
    const overlay = node(this.surface, `Win · ${tier} · cabinet`, 0, 0, 1024, 2048);
    this.activeOverlay = overlay; this.rewardPresentation = true; this.syncMusic();
    if (this.statusLabel) this.statusLabel.node.active = false;
    const mount = node(overlay, 'Source-registered cabinet celebration', 0, 0, 1024, 1536);
    mount.setScale(this.gameBackdropScale, this.gameBackdropScale, 1);
    const effects = node(mount, 'Cabinet treasure cascades', 0, 0, 1024, 1536);
    if (this.cabinetBackdrop) effects.addComponent(KeeperClearanceView).initialize(this.cabinetBackdrop, CABINET_WIN_CLEARANCE);
    const position = (fixture: readonly [number, number, number, number]): [number, number, number, number] =>
      [fixture[0] - 512, 768 - fixture[1], fixture[2], fixture[3]];
    const motion = new CabinetWinMotion(tier, this.reduced, mode);
    // Transparent CC Switch gold lighting sits BEHIND the lettering. Nothing
    // replaces the existing room, and neither rays nor coins obscure controls.
    const rays: Node[] = [];
    if (!this.reduced) for (const fixture of CABINET_WIN_RAYS)
      rays.push(this.image(mount, 'fx-prize-rays', ...position(fixture), true));
    const aureole = this.reduced ? undefined : this.image(mount, 'fx-prize-aureole', ...position(CABINET_WIN_AUREOLE), true);
    const ornaments = CABINET_WIN_ORNAMENTS.map((fixture, i) =>
      this.image(mount, `prize-ornament-${mode}-${i}`, ...position(fixture), true));
    // Large room-owned treasures rise from the reel sill in independent
    // curved paths. All artwork is existing generated alpha art, not new
    // drawn icons or a replacement full-screen prize poster.
    const heroes: Node[] = [], heroGlints: Node[] = [];
    for (const piece of motion.heroFixtures) {
      heroes.push(this.image(mount, piece.kind === 'ingot' ? 'prize-ingot' : `prize-jewel-${mode}`,
        ...position(piece.fixture)));
      heroGlints.push(this.image(mount, 'fx-gilded-light', 0, 0, 42, 42));
    }
    // Dynamic effects must be visible, not lost beneath opaque golden carving.
    const bursts: Node[] = [], jets: Node[] = [], streamers: Node[] = [];
    if (!this.reduced) {
      for (const fixture of CABINET_WIN_BURSTS.slice(0, tier === 'super' ? 6 : 4))
        bursts.push(this.image(mount, 'fx-prize-firework', ...position(fixture), true));
      for (const fixture of CABINET_WIN_JETS)
        jets.push(this.image(mount, 'fx-prize-jet', ...position(fixture), true));
      for (const fixture of CABINET_WIN_STREAMERS)
        streamers.push(this.image(mount, 'fx-prize-streamer', ...position(fixture), true));
    }
    // Some gold crosses IN FRONT of the physical treasury sculpture, while
    // the rest falls behind it. Both layers still sit BELOW title and amount.
    const foreground = node(mount, 'Foreground gold over treasury', 0, 0, 1024, 1536);
    if (this.cabinetBackdrop) foreground.addComponent(KeeperClearanceView).initialize(this.cabinetBackdrop, CABINET_WIN_CLEARANCE);
    const salutes: Node[] = [];
    for (let i = 0; i < motion.saluteCapacity; i++)
      salutes.push(this.particleImage(foreground, 'fx-gilded-light', 0, 0, 32, 32));
    const crown: Node[] = [];
    if (!this.reduced) for (const fixture of CABINET_WIN_CROWN)
      crown.push(this.image(mount, 'fx-gilded-light', ...position(fixture), true));
    const title = this.image(mount, PRIZE_TITLES[tier], ...position(CABINET_WIN_TITLE));
    // A compact room-specific enamel display sits INSIDE the reel aperture.
    // Its padding leaves the original reel symbols and architecture visible.
    const plaque = this.image(mount, `hud-inlay-${mode}`, ...position(CABINET_WIN_AMOUNT), true);
    const amount = liveLabel(mount, tr('{amount} COINS', { amount: 0 }),
      CABINET_WIN_AMOUNT[0] - 512, 768 - CABINET_WIN_AMOUNT[1], 376, 62, 44, CREAM);
    amount.enableWrapText = false;
    this.activeWinAmount = amount; this.activeWinTarget = this.winPreview?.amount ?? this.round?.award ?? 0;
    const coins: Node[] = [], lights: Node[] = [], sparkles: Node[] = [], treasures: Node[] = [], treasureGlints: Node[] = [];
    for (let i = 0; i < motion.capacity; i += 1) {
      // A fixed pooled canvas; the actual motion size is applied by the view.
      // Most gold crosses the ornament foreground, not hidden behind it.
      coins.push(this.particleImage(i % 4 === 3 ? effects : foreground, 'coin', 0, 0, 64, 64));
    }
    if (!this.reduced) for (const [x, y, w, h] of CABINET_WIN_LIGHTS)
      lights.push(this.particleImage(effects, 'fx-gilded-light', x - 512, 768 - y, w, h, true));
    for (let i = 0; i < motion.sparkleCapacity; i += 1)
      sparkles.push(this.particleImage(effects, 'fx-gilded-light', 0, 0, 36, 28, true));
    for (let i = 0; i < motion.treasureCapacity; i++) {
      treasures.push(this.particleImage(foreground, i % 3 === 0 ? 'prize-ingot' : `prize-jewel-${mode}`, 0, 0, 64, 64, true));
      treasureGlints.push(this.particleImage(foreground, 'fx-gilded-light', 0, 0, 24, 24, true));
    }
    mount.addComponent(CabinetWinView).initialize(motion, title, [plaque, amount.node], coins, [...lights, ...crown],
      rays, sparkles, this.boardNodeRefs, ornaments, bursts, aureole, jets, streamers, treasures, treasureGlints, heroes, heroGlints, salutes);
    this.cabinetCollectControl(overlay);
    this.blocking(overlay);
    this.reportWinPreview('celebrating');
    // Original keeper stays in its original architecture, with its own room cue.
    this.cueKeeper(tier);
    // Every player returns to the same cabinet automatically, not only AUTO.
    // Keep the entire tier score and 1.5s final-amount hold; reduced motion
    // omits visual movement, not the full music or the owned dismissal timer.
    this.winCue(overlay, motion.holdTime, () => this.closeWin());
    if (this.reduced) {
      amount.string = tr('{amount} COINS', { amount: this.activeWinTarget.toLocaleString() });
      this.rewardAudio.play(tier, Date.now(), mode); return;
    }
    this.winCue(overlay, .26, () => this.rewardAudio.play(tier, Date.now(), mode));
    this.winCue(overlay, motion.counterDelay, () => this.countUp(amount, this.activeWinTarget, motion.counterDuration));
    for (const seconds of motion.waveTimes) this.winCue(overlay, seconds, () => this.rewardAudio.play('coins'));
    this.winCue(overlay, motion.finaleTime, () => this.rewardAudio.play('coins'));
    // The last SUPER waves build a separate encore before the number lands.
    // No repeated payout, no second screen, and no restart of the main fanfare.
    if (tier === 'super') this.winCue(overlay, motion.encoreTime, () => this.cueKeeper('super'));
    // The physical COLLECT control can still end this presentation early.
    // Its close path cancels the same owned timer; settlement is never repeated.
  }
  /** Paired generated coin arcs erupt from the actual chest and land outside
   * the central amount/claim axis. No CSS shapes or hand-drawn particles. */
  private treasureFountains(stage: Node, count: number, origin: readonly [number, number] = [0, -280]): void {
    if (this.reduced || !stage.isValid) return;
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 ? 1 : -1;
      const startX = side * (85 + i % 3 * 22);
      const targetX = side * (260 + i % 5 * 36);
      const coin = this.particleImage(stage, i % 4 ? 'coin' : 'ui-coin', startX + origin[0], origin[1], 34 + i % 4 * 7, 34 + i % 4 * 7);
      const alpha = opacity(coin, 0);
      const lead = (i % 8) * 0.052;
      tween(coin).delay(lead).to(0.47 + i % 4 * 0.06,
        { position: new Vec3(origin[0] + targetX, origin[1] + 320 + i % 5 * 38, 0), angle: side * (160 + i * 13), scale: new Vec3(1.18, 1.18, 1) }, { easing: 'sineOut' })
        .to(0.9 + i % 3 * 0.11, { position: new Vec3(origin[0] + targetX + side * 30, -784, 0), angle: side * (390 + i * 27) }, { easing: 'quadIn' })
        .call(() => { if (coin.isValid) coin.destroy(); }).start();
      tween(alpha).delay(lead).to(0.13, { opacity: 250 }, { easing: 'sineOut' })
        .delay(0.76).to(0.38, { opacity: 0 }, { easing: 'sineIn' }).start();
    }
  }
  private countUp(label: Label, target: number, seconds: number): void {
    if (this.winCounterTick) { this.unschedule(this.winCounterTick); this.winCounterTick = undefined; }
    if (this.reduced) { label.string = tr('{amount} COINS', { amount: target.toLocaleString() }); return; }
    let elapsed = 0, previous = 0;
    const tick = (dt = 0) => {
      if (!label.node.isValid) { this.unschedule(tick); this.winCounterTick = undefined; return; }
      elapsed += Number.isFinite(dt) && dt > 0 ? Math.min(dt, .25) : 0;
      const progress = seconds <= 0 ? 1 : Math.min(1, elapsed / seconds);
      const eased = progress * progress * (3 - 2 * progress);
      const value = Math.round(target * eased);
      label.string = tr('{amount} COINS', { amount: value.toLocaleString() });
      if (progress >= 1) {
        label.string = tr('{amount} COINS', { amount: target.toLocaleString() });
        this.unschedule(tick); this.winCounterTick = undefined;
        if (target > 0) this.rewardAudio.play('complete');
      } else if (value !== previous) this.rewardAudio.play('counter'); // controller caps at fewer than 6 soft ticks/sec
      previous = value;
    };
    this.winCounterTick = tick; this.schedule(tick, 1 / 30); // elapsed-time counting stays in sync even on slower frames
  }
  private coinRain(parent: Node, count: number): void {
    if (this.reduced || !parent.isValid) return;
    this.rewardAudio.play('coins'); // one texture per wave, never one sound per particle
    for (let i = 0; i < count; i += 1) {
      const x = -465 + ((i * 83) % 930); const y = 760 + ((i * 47) % 190); const coin = this.particleImage(parent, i % 5 === 0 ? 'ui-coin' : 'coin', x, y, 28 + (i % 4) * 11, 28 + (i % 4) * 11); opacity(coin, 190 + (i % 3) * 20); coin.setRotationFromEuler(0, 0, i * 37);
      const drift = ((i % 5) - 2) * 54; const curve = y - 380; tween(coin).delay(i * 0.018).to(0.72 + (i % 4) * 0.1, { position: new Vec3(x + drift * 0.35, curve, 0), angle: i * 95 }, { easing: 'quadIn' })
        .to(0.85 + (i % 5) * 0.12, { position: new Vec3(x + drift, -820, 0), angle: i * 210 }, { easing: 'quadIn' }).call(() => coin.destroy()).start();
    }
  }
  private closeWin(): void {
    const overlay = this.activeOverlay;
    if (!overlay || this.winClosing || !overlay.name.startsWith('Win ·')) return;
    this.winClosing = true;
    this.clearWinTimeline(true); this.resumeWinTier = undefined;
    // Settlement already happened once before the reveal. Collect only updates
    // live copy; never call persist/settle or recreate the current cabinet.
    if (this.walletLabel?.isValid) this.walletLabel.string = tr('COINS {amount}', { amount: hudAmount(this.save.coins) });
    if (this.winLabel?.isValid) this.winLabel.string = tr('WIN {amount}', { amount: hudAmount(this.round?.award || 0) });
    if (this.statusLabel?.isValid) {
      this.statusLabel.string = this.round?.award ? tr('WIN {amount}', { amount: hudAmount(this.round.award) }) : tr('PRESS SPIN');
      // Restored only when the old amount has faded, avoiding two overlapping inscriptions.
    }
    this.refreshMeters();
    this.rewardAudio.play('collect');
    const complete = () => {
      if (this.activeOverlay !== overlay) return;
      overlay.destroy(); this.activeOverlay = undefined; this.winClosing = false;
      if (this.statusLabel?.isValid) this.statusLabel.node.active = true;
      const faceLabel = this.spinFace?.getComponentInChildren(Label);
      if (faceLabel?.isValid) faceLabel.string = tr(['SAIL', 'BLOOM', 'FORGE', 'UNSEAL'][this.save.selectedMode]);
      this.reportWinPreview('collected');
      this.queueAuto();
    };
    if (this.reduced) complete();
    else tween(opacity(overlay)).to(.24, { opacity: 0 }, { easing: 'sineInOut' }).call(complete).start();
  }
  /** Read-only evidence for explicit debug previews; absent in normal sessions. */
  private reportWinPreview(phase: 'ready' | 'celebrating' | 'collected'): void {
    if (!this.winPreview || typeof document === 'undefined') return;
    document.documentElement.dataset.cabinetWinPreview = JSON.stringify({
      phase, tier: this.winPreview.tier, mode: this.save.selectedMode,
      surface: this.surface?.uuid, backdrop: this.cabinetBackdrop?.uuid,
      reels: this.boardNodeRefs.map(reel => reel.uuid),
      keepers: this.surface?.getComponentsInChildren(KeeperGestureView).map(keeper => keeper.node.uuid),
      overlayParent: this.activeOverlay?.parent?.uuid ?? null,
      balance: this.save.coins, spins: this.save.spins,
    });
  }
  private servicePage(root: Node): void {
    const titles: Record<Page, [string, string]> = {
      login: ['', ''], home: ['', ''], game: ['', ''], store: ['TREASURE SHOP', 'Stock your cabinet before the next reveal'], rewards: ['DAILY LANTERN', 'A small ritual with a real sense of arrival'],
      rank: ['HONOUR DOCK', 'Local demo standings · your rank changes with wins'], account: ['KEEPER LEDGER', 'Your balance, rhythm and room preference'], ledger: ['COIN HISTORY', 'Your recent virtual coin activity'], rules: ['HOUSE RULES', 'Know the cabinet before you let it perform'], atlas: ['TREASURE ATLAS', 'Four keepers · three keepsakes in each room'],
    };
    this.header(root, titles[this.page][0], titles[this.page][1], 850, true);
    const backToGame = this.page === 'rules' && this.rulesReturnPage === 'game';
    this.button(root, backToGame ? 'BACK TO GAME' : 'BACK TO HOUSE', -245, -780, 360, 86, () => this.navigate(backToGame ? 'game' : 'home'), 'gold', 25, 'ticket');
    this.button(root, this.page === 'account' ? 'DAILY GIFTS' : this.page === 'ledger' ? 'PROFILE' : 'ACCOUNT', 245, -780, 300, 86, () => this.navigate(this.page === 'account' ? 'rewards' : 'account'), 'gold', 25, 'ticket');
    if (this.page === 'store') this.storePage(root); if (this.page === 'rewards') this.rewardsPage(root); if (this.page === 'rank') this.rankPage(root); if (this.page === 'account') this.accountPage(root); if (this.page === 'ledger') this.ledgerPage(root); if (this.page === 'rules') this.rulesPage(root); if (this.page === 'atlas') this.atlasPage(root);
  }
  private storePage(root: Node): void {
    const treasure = this.image(root, 'store-coin-platter', 0, 552, 550, 295); this.float(treasure, 6, 3.4);
    const wallet = this.image(root, 'ui-wide-ticket', 0, 380, 760, 94, true);
    this.image(wallet, 'ui-coin', -310, 0, 62, 62);
    liveLabel(wallet, 'VIRTUAL WALLET', -105, 0, 300, 42, 27, INK);
    const walletAmount = liveLabel(wallet, this.save.coins.toLocaleString(), 205, 0, 205, 50, 37, INK);
    walletAmount.enableWrapText = false;
    // Preserve the generated cabinet's aspect ratio. Every item, label and hit
    // target below registers on the actual source niches, not screen offsets.
    const cabinet = this.image(root, 'store-cabinet-v2', SHOP_CABINET.x, SHOP_CABINET.y, SHOP_CABINET.width, SHOP_CABINET.height);
    const cabinetSize = cabinet.getComponent(UITransform)!.contentSize;
    const place = (slot: ShopFixture) => shopPlacement(slot, cabinetSize.width, cabinetSize.height);
    const inscription = (name: string, text: string, slot: ShopFixture, size: number, color: string): Label => {
      const box = place(slot);
      const label = liveLabel(cabinet, text, box.x, box.y, box.width, box.height, size, color);
      label.node.name = name; label.enableWrapText = false;
      return label;
    };
    this.settleIntoPlace(cabinet, 0.16, 20);
    let claiming = false;
    SHOP_BUNDLES.forEach(({ name, amount, detail, art }, index) => {
      const slots = SHOP_SLOTS[index]; const product = place(slots.product);
      const item = this.image(cabinet, art, product.x, product.y, product.width, product.height);
      this.float(item, 3, 3.1 + index * 0.2);
      // Reflections follow only the generated goods, never the readable copy.
      if (!this.reduced) {
        const shine = this.image(item, 'fx-gilded-light', 0, -28, 94, 48, true);
        const alpha = opacity(shine, 0); this.ambientTargets.push(shine, alpha);
        tween(alpha).delay(index * 0.78).to(0.65, { opacity: 178 }, { easing: 'sineOut' })
          .to(0.85, { opacity: 0 }, { easing: 'sineIn' }).delay(2.1).union().repeatForever().start();
      }
      inscription(`Shop ${index} · title`, name, slots.title, 31, INK);
      inscription(`Shop ${index} · amount`, `+${amount.toLocaleString()}`, slots.amount, 40, INK);
      inscription(`Shop ${index} · detail`, detail, slots.detail, 26, INK);
      const hit = place(slots.hit);
      const sign = node(cabinet, `Add ${name} demo coins`, hit.x, hit.y, hit.width, hit.height);
      const caption = place(slots.claim);
      const signText = liveLabel(sign, 'ADD COINS  +', caption.x - hit.x, caption.y - hit.y, caption.width, caption.height, 29, CREAM);
      signText.node.name = `Shop ${index} · claim`; signText.enableWrapText = false;
      this.bindTap(sign, () => {
        if (!sign.isValid || claiming) return;
        claiming = true; this.playClick();
        this.save.coins += amount; this.record(`${name} · DEMO COINS`, amount); this.persist();
        this.showRewardClaim(tr(name), amount, 'title-treasure-shop-wide');
      }, () => this.controlPress(signText.node, .96), () => this.controlRelease(signText.node));
    });
    liveLabel(root, 'Demo coins only · no money or purchase is taken', 0, -700, 820, 42, 25, CREAM);
  }
  private rewardsPage(root: Node): void {
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    const ready = this.save.daily !== today;
    const nextDay = this.save.daily === yesterday ? this.save.dailyStreak % 7 + 1 : 1;
    const currentDay = ready ? nextDay : Math.max(1, (this.save.dailyStreak - 1) % 7 + 1);
    const amount = DAILY_AWARDS[currentDay - 1];
    const chest = this.image(root, 'reward-chest', 0, 525, 350, 290); this.float(chest, 9, 2.5);
    if (ready) this.shimmer(chest, 220, 255);
    const todayPlate = this.image(root, 'ui-wide-ticket', 0, 298, 760, 110, true);
    liveLabel(todayPlate, ready ? tr('DAY {day} · LANTERN READY', { day: currentDay }) : tr('DAY {day} · CLAIMED', { day: currentDay }), -45, 20, 610, 43, 31, INK);
    liveLabel(todayPlate, tr('+{amount} VIRTUAL COINS', { amount: amount.toLocaleString() }), -45, -27, 610, 43, 32, INK);
    const route = this.image(root, 'daily-lantern-route', 0, 72, 905, 305);
    this.settleIntoPlace(route, 0.18, 17);
    if (!this.reduced) {
      // The current lantern brightens in sequence with its neighbours. These
      // are reflections tucked into the generated hanging lantern image.
      for (let i = 0; i < 7; i += 1) {
        const x = -350 + i * 116;
        const gleam = this.image(root, 'fx-gilded-light', x, 62, 75, 58, true);
        const alpha = opacity(gleam, 0); this.ambientTargets.push(gleam, alpha);
        tween(alpha).delay(i * 0.27).to(0.4, { opacity: i + 1 === currentDay ? 195 : 105 }, { easing: 'sineOut' })
          .to(0.48, { opacity: 0 }, { easing: 'sineIn' }).delay(1.7).union().repeatForever().start();
      }
    }
    for (let i = 0; i < 7; i += 1) {
      const x = -348 + i * 116;
      const day = lanternDay(i + 1, currentDay, ready);
      const tag = this.image(root, day.art, x, -113, 112, 68, true);
      opacity(tag, day.current ? 255 : 230);
      singleLine(tag, tr('DAY {day}', { day: i + 1 }), day.current ? 0 : -2, 0, 86, 39, 28, day.current ? CREAM : INK);
      this.bindTap(tag, () => { this.playClick(); this.rewardCalendar(root, currentDay, ready); },
        () => this.controlPress(tag, .97), () => this.controlRelease(tag));
    }
    this.button(root, ready ? tr('OPEN DAY {day} LANTERN', { day: currentDay }) : 'RETURN TOMORROW', 0, -254, 640, 115, () => {
      if (!ready || this.save.daily === today) { this.toast('Tomorrow a new lantern will glow.'); return; }
      this.save.daily = today; this.save.dailyStreak = currentDay; this.save.coins += amount; this.record(`DAY ${currentDay} · DAILY LANTERN`, amount); this.persist();
      this.showRewardClaim(tr('DAY {day} LANTERN', { day: currentDay }), amount);
    }, ready ? 'coral' : 'gold', 31, ready ? 'plaque' : 'ticket');
    const chestReady = this.save.chestDaily !== today;
    const chestDock = this.image(root, 'ui-wide-ticket', 0, -448, 870, 160, true);
    const tinyChest = this.image(chestDock, 'reward-chest', -321, 3, 112, 106);
    if (chestReady) this.shimmer(tinyChest, 205, 255);
    liveLabel(chestDock, 'DAILY TREASURE CHEST', -38, 30, 430, 42, 27, INK);
    liveLabel(chestDock, chestReady ? '+750 COINS · READY' : 'CLAIMED TODAY', -38, -27, 430, 43, 27, INK);
    this.button(chestDock, chestReady ? 'OPEN' : 'TOMORROW', 295, -5, 208, 76, () => {
      if (this.save.chestDaily === today) { this.toast('The chest opens again tomorrow.'); return; }
      this.save.chestDaily = today; this.save.coins += 750; this.record('DAILY TREASURE CHEST', 750); this.persist();
      this.showRewardClaim(tr('TREASURE CHEST'), 750);
    }, chestReady ? 'coral' : 'gold', 25, chestReady ? 'plaque' : 'ticket');
  }
  private showTaskGoldReveal(title: string, amount: number): void {
    this.clearWinTimeline(); this.activeOverlay?.destroy();
    const mode = this.save.selectedMode; const cast = TASK_GOLD_CAST[mode];
    const body = this.frames.get(cast.body);
    const heldArm = this.frames.get(cast.arm);
    const smileAtlas = cast.smile ? this.frames.get(cast.smile) : undefined;
    const glint = this.frames.get(TASK_GOLD_REFLECTION);
    if (!body || !heldArm || (cast.smile && !smileAtlas) || !glint) {
      // The wallet is already persisted. Optional art must never strand a claim.
      this.showRewardClaim(title, amount, 'title-house-journal-wide'); return;
    }
    const visible = view.getVisibleSize();
    const scale = Math.min(visible.width / 1024, visible.height / 1800);
    const overlay = node(this.node, `Daily treasure ritual · ${title}`, 0, 0, visible.width / scale, visible.height / scale);
    overlay.setScale(scale, scale, 1);
    this.surface?.getComponentsInChildren(KeeperGestureView).forEach(keeper => keeper.setPresentationHidden(true));
    this.activeOverlay = overlay; this.rewardPresentation = true; this.syncMusic();
    const backdrop = this.background(overlay, 'hall-treasury-stage-v3');
    const stageScale = backdrop.getComponent(UITransform)!.contentSize.width / 1024;
    const titleArt = this.image(overlay, 'title-house-journal-wide', 0, 730, 735, 178, true);
    this.settleIntoPlace(titleArt, 0.14, 14);
    const caption = liveLabel(overlay, 'A LITTLE FORTUNE, JUST FOR YOU', 0, 560, 760, 46, 28, CREAM);
    const plaque = this.image(overlay, 'ui-wide-ticket', 0, -575, 740, 150, true);
    liveLabel(plaque, title, 0, 30, 660, 44, 30, INK);
    const count = liveLabel(plaque, tr('{amount} COINS', { amount: 0 }), 0, -30, 650, 53, 39, INK);
    this.activeWinAmount = count; this.activeWinTarget = amount;
    this.settleIntoPlace(plaque, 0.32, 12);
    const keep = this.button(overlay, 'KEEP TREASURE', 0, -765, 540, 108, () => {
      // This button acknowledges the already-persisted reward; it cannot pay twice.
      this.clearWinTimeline(); overlay.destroy(); this.activeOverlay = undefined;
      this.render(); this.rewardAudio.play('collect');
    }, 'coral', 31, 'plaque');
    keep.active = false;
    overlay.addComponent(TaskGoldReveal).initialize({ body, heldArm, smileAtlas, glint, jointEffect: this.taskGoldEffect }, this.reduced, mode, stageScale, cue => {
      if (this.activeOverlay !== overlay || !overlay.isValid) return;
      if (cue === 'reach') this.rewardAudio.play('open');
      if (cue === 'shine') {
        this.rewardAudio.play('coins'); this.countUp(count, amount, this.reduced ? 0 : .85);
      }
      if (cue === 'return') caption.string = tr('FORTUNE SAFELY KEPT');
    }, () => {
      if (!overlay.isValid || this.activeOverlay !== overlay) return;
      count.string = tr('{amount} COINS', { amount: amount.toLocaleString() });
      caption.string = tr('FORTUNE SAFELY KEPT');
      keep.active = true; this.settleIntoPlace(keep, 0, 9);
      // Keep the same pavilion on screen: no second sticker/reward popup.
    });
    // The stage is opaque before the keeper enters: no old/new character ghosting.
    opacity(overlay, 255);
    this.blocking(overlay);
  }
  private showRewardClaim(title: string, amount: number, titleArt = 'title-lantern-gifts-wide'): void {
    this.clearWinTimeline(); this.activeOverlay?.destroy();
    const overlay = node(this.node, `Gift reveal · ${title}`, 0, 0, 1024, 2048);
    this.surface?.getComponentsInChildren(KeeperGestureView).forEach(keeper => keeper.setPresentationHidden(true));
    this.activeOverlay = overlay; this.rewardPresentation = true; this.syncMusic();
    this.background(overlay, 'win-ordinary');
    const header = this.image(overlay, titleArt, 0, 710, 800, 190);
    // The prize art already contains an ivory marquee. Fit live copy inside
    // that real inset rather than covering it with a second ticket sticker.
    const inscription = node(overlay, 'Prize inscription in carved marquee', 0, 335, 740, 172);
    liveLabel(inscription, title, 0, 39, 690, 51, 36, INK);
    const count = liveLabel(inscription, tr('{amount} COINS', { amount: 0 }), 0, -27, 690, 69, 55, INK);
    this.activeWinAmount = count; this.activeWinTarget = amount;
    if (this.reduced) {
      count.string = tr('{amount} COINS', { amount: amount.toLocaleString() });
      this.rewardAudio.play('open');
    } else {
      this.winCue(overlay, 0.23, () => this.rewardAudio.play('open'));
      const alpha = opacity(overlay, 0);
      tween(alpha).to(0.32, { opacity: 255 }, { easing: 'sineOut' }).start();
      this.settleIntoPlace(header, 0.15, 18);
      this.settleIntoPlace(inscription, 0.28, 16);
      for (const [i, x] of [-214, 214].entries()) {
        const flare = this.image(overlay, 'fx-gilded-light', x, -225, 215, 135, true);
        const light = opacity(flare, 0);
        tween(light).delay(0.24 + i * 0.14).to(0.42, { opacity: 225 }, { easing: 'sineOut' })
          .to(0.66, { opacity: 0 }, { easing: 'sineIn' }).call(() => flare.destroy()).start();
      }
      this.winCue(overlay, 0.49, () => {
        this.countUp(count, amount, 0.88); this.coinRain(overlay, 35);
      });
    }
    const keep = this.button(overlay, 'KEEP TREASURE', 0, -620, 550, 110, () => {
      // Balance is already settled; collecting can skip the show, including after backgrounding.
      this.clearWinTimeline();
      overlay.destroy(); this.activeOverlay = undefined; this.render(); this.rewardAudio.play('collect');
    }, 'coral', 31, 'plaque');
    this.settleIntoPlace(keep, 0.62, 24);
    this.blocking(overlay);
  }
  private sheet(root: Node, name: string): Node {
    const visible = view.getVisibleSize(); const bounds = sheetViewport(visible.width, visible.height);
    const modal = node(root, name, 0, 0, bounds.width, bounds.height);
    modal.addComponent(BlockInputEvents); return modal;
  }
  private presentSheet(modal: Node, panel: Node): void {
    if (this.reduced) return;
    const destination = panel.position.clone(); const alpha = opacity(panel, 0);
    panel.setPosition(destination.x, destination.y - 8, destination.z);
    tween(panel).to(.24, { position: destination }, { easing: 'sineOut' }).start();
    tween(alpha).to(.22, { opacity: 255 }, { easing: 'sineOut' }).start();
    modal.once(Node.EventType.NODE_DESTROYED, () => { Tween.stopAllByTarget(panel); Tween.stopAllByTarget(alpha); });
  }
  private dismissSheet(modal: Node, after: () => void = () => {}): void {
    if (!modal.isValid || this.closingSheets.has(modal)) return;
    this.closingSheets.add(modal);
    const alpha = opacity(modal);
    modal.once(Node.EventType.NODE_DESTROYED, () => { Tween.stopAllByTarget(alpha); this.closingSheets.delete(modal); });
    const finish = () => { if (!modal.isValid) return; modal.destroy(); after(); };
    if (this.reduced) finish();
    else tween(alpha).to(.14, { opacity: 0 }, { easing: 'sineIn' }).call(finish).start();
  }
  private rewardCalendar(root: Node, currentDay: number, ready: boolean): void {
    const modal = this.sheet(root, 'Seven-day lantern calendar');
    const plate = this.image(modal, 'ui-rules-scroll', 0, 20, 880, 1120, true);
    this.presentSheet(modal, plate);
    liveLabel(plate, 'SEVEN LANTERN GIFTS', 0, 380, 710, 60, 41, INK);
    DAILY_AWARDS.forEach((amount, i) => {
      const y = 275 - i * 86;
      const day = lanternDay(i + 1, currentDay, ready);
      if (day.current) this.image(plate, 'button-gold', 0, y, 724, 79, true);
      const lettering = day.current ? CREAM : INK;
      this.image(plate, day.current ? 'reward-chest' : 'symbol-lantern', -294, y, 57, 55);
      singleLine(plate, tr('DAY {day}', { day: i + 1 }), CALENDAR_DETAIL.dayX, y, CALENDAR_DETAIL.dayWidth, 47, 30, lettering);
      singleLine(plate, `+${amount.toLocaleString()}`, CALENDAR_DETAIL.amountX, y, CALENDAR_DETAIL.amountWidth, 47, 32, lettering);
      singleLine(plate, day.state, CALENDAR_DETAIL.stateX, y, CALENDAR_DETAIL.stateWidth, 43, 26, lettering);
    });
    this.button(plate, 'BACK TO GIFTS', 0, -425, 460, 87, () => this.dismissSheet(modal), 'coral', 28, 'plaque');
  }
  private rankPage(root: Node): void {
    const podium = this.image(root, 'rank-podium-medallion', 0, 400, 750, 425);
    this.settleIntoPlace(podium, 0.12, 22);
    if (!this.reduced) {
      // Winning metal catches light in place; podium does not levitate.
      for (const [i, x] of [-250, 0, 250].entries()) {
        const gleam = this.image(podium, 'fx-gilded-light', x, 13, 98, 62, true);
        const alpha = opacity(gleam, 0); this.ambientTargets.push(gleam, alpha);
        tween(alpha).delay(i * 0.49).to(0.62, { opacity: 190 }).to(0.76, { opacity: 0 }).delay(1.4).union().repeatForever().start();
      }
    }
    const leaders: Array<[string, string, string]> = [
      ['#2', 'PearlRiver', '21,100'], ['#1', 'JadeMoth', '28,450'], ['#3', 'KoiKeeper', '17,780'],
    ];
    leaders.forEach(([rank, name, score], i) => {
      const x = [-285, 0, 285][i];
      const tag = this.image(root, 'ui-ticket-button', x, 135, 272, 125, true);
      this.settleIntoPlace(tag, 0.27 + i * 0.12, 16);
      const captain = liveLabel(tag, `${rank}  ${name}`, -12, 22, 190, 39, 28, INK); captain.enableWrapText = false;
      const total = liveLabel(tag, score, -12, -20, 184, 39, 31, INK); total.enableWrapText = false;
    });
    const others: Array<[string, string, string]> = [
      ['4', 'LanternFox', '12,600'], ['5', 'CloudWander', '10,920'], ['6', 'GoldFinch', '9,140'],
    ];
    others.forEach(([rank, name, score], i) => {
      const row = this.image(root, 'ui-wide-ticket', 0, -25 - i * 130, 850, 105, true);
      this.settleIntoPlace(row, 0.52 + i * 0.1, 17);
      singleLine(row, `#${rank}`, RANK_DETAIL.rankX, 0, RANK_DETAIL.rankWidth, 48, 33);
      const captainName = singleLine(row, name, RANK_DETAIL.nameX, 0, RANK_DETAIL.nameWidth, 48, 30);
      captainName.horizontalAlign = Label.HorizontalAlign.LEFT;
      const total = singleLine(row, score, RANK_DETAIL.amountX, 0, RANK_DETAIL.amountWidth, 48, 31);
      total.horizontalAlign = Label.HorizontalAlign.RIGHT;
    });
    liveLabel(root, 'FICTIONAL CAPTAINS · LOCAL DEMO', 0, -378, 750, 35, 23, INK);
    const my = 1 + [28450, 21100, 17780, 12600, 10920, 9140].filter(score => score > this.save.totalWon).length;
    const mine = this.image(root, 'button-coral', 0, -480, 850, 140, true);
    this.settleIntoPlace(mine, 0.78, 19);
    singleLine(mine, tr('MY RANK #{rank}', { rank: my }), -195, 30, 260, 48, 33, CREAM);
    singleLine(mine, this.save.name || tr('Lantern Guest'), 142, 30, 338, 48, 31, CREAM);
    singleLine(mine, tr('TOTAL WON {amount} · {spins} SPINS', { amount: this.save.totalWon.toLocaleString(), spins: this.save.spins }), 0, -25, 650, 42, 27, CREAM);
  }
  private accountPage(root: Node): void {
    const portraitRig = node(root, 'Keeper portrait rig', 0, 418, 355, 400);
    const portrait = this.image(portraitRig, KEEPER_ART[this.save.avatar], 0, 0, 355, 400);
    this.settleIntoPlace(portraitRig, 0.13, 23);
    this.swayFigure(portrait, 2.5, 1.8);
    if (!this.reduced) {
      const lanternLight = this.image(portrait, 'fx-gilded-light', 12, 8, 127, 90, true);
      const alpha = opacity(lanternLight, 24); this.ambientTargets.push(lanternLight, alpha);
      tween(alpha).to(1.4, { opacity: 196 }, { easing: 'sineInOut' })
        .to(1.55, { opacity: 25 }, { easing: 'sineInOut' }).union().repeatForever().start();
    }
    const portraitHit = node(root, 'Change keeper portrait', 0, 428, 440, 385);
    this.bindTap(portraitHit, () => { this.playClick(); this.avatarPicker(root); });
    const namePlate = this.image(root, 'ui-wide-ticket', 0, 210, 790, 115, true);
    const keeperName = liveLabel(namePlate, this.save.name || tr('Lantern Guest'), 0, 15, 700, 55, 43, INK); keeperName.enableWrapText = false;
    liveLabel(namePlate, this.guestSession ? 'TAP PORTRAIT TO CHANGE · GUEST SESSION' : 'TAP PORTRAIT TO CHANGE · SAVED ON THIS DEVICE', 0, -34, 710, 38, 24, INK);
    const stats: Array<[string, string, string]> = [
      ['BALANCE', this.save.coins.toLocaleString(), 'ui-coin'],
      ['SPINS', `${this.save.spins}`, 'symbol-lantern'],
      ['TOTAL WON', this.save.totalWon.toLocaleString(), 'symbol-ingot'],
    ];
    // One continuous carved ledger instead of three badly stretched ticket
    // sprites; the red wax seal no longer sits on a coin total.
    const statRail = this.image(root, 'ui-wide-ticket', 0, -48, 855, 235, true);
    this.settleIntoPlace(statRail, 0.3, 18);
    stats.forEach(([label, value, art], i) => {
      const x = ACCOUNT_DETAIL.statXs[i];
      this.image(statRail, art, x, 55, 82, 82);
      singleLine(statRail, label, x, -12, ACCOUNT_DETAIL.statCopyWidth, 39, 27, INK);
      singleLine(statRail, value, x, -67, ACCOUNT_DETAIL.statCopyWidth, 50, 37, INK);
    });
    const collection = this.image(root, 'ui-wide-ticket', 0, -291, 850, 212, true);
    this.settleIntoPlace(collection, 0.57, 16);
    liveLabel(collection, 'ROOM LEDGER  ·  SPINS PLAYED', 0, 73, 720, 37, 28, INK);
    MODES.forEach((room, i) => {
      const x = -298 + i * 198;
      const icon = this.image(collection, room.art, x, 8, 120, 106);
      this.float(icon, 2 + i, 3.2 + i * 0.18);
      singleLine(collection, tr('{amount} SPINS', { amount: this.save.roomSpins[i] }), x, -62, 163, 37, 25, INK);
    });
    this.button(root, 'COIN HISTORY', -205, -464, 385, 91, () => this.navigate('ledger'), 'coral', 27, 'plaque');
    this.button(root, unreadCount(this.save.inbox) ? tr('MAIL · {amount} NEW', { amount: unreadCount(this.save.inbox) }) : 'MAIL', 205, -464, 385, 91, () => this.mailbox(root), 'gold', 27, 'ticket');
    this.button(root, 'EDIT NAME', -227, -594, 380, 85, () => this.rename(root), 'gold', 28, 'ticket');
    this.button(root, this.guestSession ? 'END GUEST PLAY' : 'DELETE DATA', 227, -594, 380, 85, () => this.guestSession ? this.endGuest() : this.confirmReset(root), 'gold', 26, 'ticket');
    const systemReduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.button(root, systemReduced ? 'MOTION · SYSTEM' : this.save.motionReduced ? 'MOTION · REDUCED' : 'MOTION · FULL', ACCOUNT_DETAIL.settingXs[0], ACCOUNT_DETAIL.settingY, ACCOUNT_DETAIL.settingWidth, ACCOUNT_DETAIL.settingHeight, () => {
      if (systemReduced) { this.toast('Motion follows your device accessibility setting.'); return; }
      this.save.motionReduced = !this.save.motionReduced; this.reduced = this.save.motionReduced; this.persist(); this.render();
    }, 'gold', 27, 'ticket');
    this.button(root, 'AUDIO SETTINGS', ACCOUNT_DETAIL.settingXs[1], ACCOUNT_DETAIL.settingY, ACCOUNT_DETAIL.settingWidth, ACCOUNT_DETAIL.settingHeight,
      () => this.audioSettings(root), 'gold', 26, 'ticket');
    this.button(root, 'LANGUAGE', ACCOUNT_DETAIL.settingXs[2], ACCOUNT_DETAIL.settingY, ACCOUNT_DETAIL.settingWidth, ACCOUNT_DETAIL.settingHeight, () => this.languagePicker(root), 'gold', 28, 'ticket');
  }
  private audioSettings(root: Node): void {
    const modal = this.sheet(root, 'Audio settings');
    const scroll = this.image(modal, 'ui-rules-scroll', 0, 0, 890, 1200, true);
    this.presentSheet(modal, scroll);
    liveLabel(scroll, 'AUDIO SETTINGS', 0, 423, 690, 65, 41, INK);
    liveLabel(scroll, 'Soft music, clear feedback. Change each independently.', 0, 309, 675, 100, 28, INK);
    const fields = ['musicEnabled', 'bgmEnabled', 'effectsEnabled'] as const;
    const names = ['MASTER SOUND', 'BACKGROUND MUSIC', 'SOUND EFFECTS'] as const;
    const faces: Label[] = [];
    fields.forEach((field, i) => {
      const caption = () => tr('{setting} · {state}', { setting: tr(names[i]), state: tr(this.save[field] ? 'ON' : 'OFF') });
      const hit = this.button(scroll, caption(), 0, 133 - i * 160, 690, 108, () => {
        this.save[field] = !this.save[field]; this.persist(); this.syncMusic();
        faces[i].string = caption();
        if (this.save[field]) this.playClick(); // No success sound while master/effects are muted.
      }, 'gold', 30, 'ticket');
      faces.push(hit.getComponentInChildren(Label)!);
    });
    liveLabel(scroll, 'Music fades back gently. Muted rewards never replay.', 0, -345, 675, 94, 27, INK);
    this.button(scroll, 'DONE', 0, -499, 570, 96, () => this.dismissSheet(modal), 'coral', 30, 'plaque');
  }
  private mailbox(root: Node, open?: LetterId): void {
    root.getChildByName('House mailbox')?.destroy();
    const modal = this.sheet(root, 'House mailbox');
    this.setHallPresentationHidden(root, true);
    modal.once(Node.EventType.NODE_DESTROYED, () => {
      if (root.isValid) this.setHallPresentationHidden(root, false);
    });
    const scroll = this.image(modal, 'ui-rules-scroll', 0, 0, 890, 1200, true);
    this.presentSheet(modal, scroll);
    liveLabel(scroll, open ? 'LETTER' : 'HOUSE MAIL', 0, 423, 690, 65, 41, INK);
    if (open) {
      const item = LETTERS.find(letter => letter.id === open)!;
      this.save.inbox = readLetter(this.save.inbox, open); this.persist();
      this.image(scroll, item.coins ? 'reward-chest' : 'symbol-lantern', 0, 228, 190, 160);
      liveLabel(scroll, item.title, 0, 91, 740, 58, 36, INK);
      liveLabel(scroll, item.body, 0, -36, 710, 132, 29, INK);
      const claimed = letterState(this.save.inbox, open).claimed;
      if (item.coins) liveLabel(scroll, tr('ATTACHMENT · +{amount} COINS', { amount: item.coins }), 0, -158, 720, 50, 30, INK);
      if (item.coins) this.button(scroll, claimed ? 'ALREADY COLLECTED' : 'COLLECT ATTACHMENT', 0, -294, 620, 92, () => {
        const result = claimLetter(this.save.inbox, open);
        if (!result.coins) return;
        this.save.inbox = result.inbox; this.save.coins += result.coins;
        this.record(`${item.title} · MAIL`, result.coins); this.persist();
        this.showRewardClaim(tr(item.title), result.coins);
      }, claimed ? 'gold' : 'coral', 28, claimed ? 'ticket' : 'plaque');
      this.button(scroll, 'BACK TO MAIL', 0, -422, 475, 82, () => this.dismissSheet(modal, () => { if (root.isValid) this.mailbox(root); }), 'gold', 27, 'ticket');
      return;
    }
    const items = LETTERS.filter(letter => !letterState(this.save.inbox, letter.id).deleted);
    if (!items.length) liveLabel(scroll, 'No letters remain in this local inbox.', 0, 50, 710, 95, 30, INK);
    items.forEach((item, i) => {
      const y = 238 - i * 185;
      const entry = this.image(scroll, 'ui-wide-ticket', 0, y, 750, 156, true);
      this.image(entry, item.coins ? 'reward-chest' : 'symbol-lantern', -302, 0, 110, 97);
      liveLabel(entry, item.title, -25, 25, 480, 48, 33, INK);
      const state = letterState(this.save.inbox, item.id);
      liveLabel(entry, state.claimed ? 'COLLECTED' : item.coins ? tr('+{amount} COINS · {status}', { amount: item.coins, status: state.read ? tr('READ') : tr('NEW') }) : state.read ? 'READ' : 'NEW', -25, -28, 480, 40, 25, INK);
      this.bindTap(entry, () => { this.playClick(); this.dismissSheet(modal, () => { if (root.isValid) this.mailbox(root, item.id); }); },
        () => this.controlPress(entry, .985), () => this.controlRelease(entry));
    });
    this.button(scroll, 'COLLECT ALL', -192, -362, 335, 85, () => {
      let total = 0;
      for (const item of LETTERS) {
        const result = claimLetter(this.save.inbox, item.id);
        if (!result.coins) continue;
        this.save.inbox = result.inbox; total += result.coins;
        this.record(`${item.title} · MAIL`, result.coins);
      }
      if (!total) { this.toast('No attachments ready.'); return; }
      this.save.coins += total; this.persist(); this.showRewardClaim(tr('HOUSE MAIL'), total);
    }, 'coral', 25, 'plaque');
    this.button(scroll, 'CLEAR READ', 192, -362, 335, 85, () => {
      this.save.inbox = clearRead(this.save.inbox); this.persist(); modal.destroy(); this.mailbox(root);
    }, 'gold', 25, 'ticket');
    this.button(scroll, 'CLOSE', 0, -471, 450, 80, () => this.dismissSheet(modal), 'gold', 27, 'ticket');
  }
  private languagePicker(root: Node): void {
    const modal = this.sheet(root, 'Choose language');
    this.setHallPresentationHidden(root, true);
    modal.once(Node.EventType.NODE_DESTROYED, () => {
      if (root.isValid) this.setHallPresentationHidden(root, false);
    });
    const scroll = this.image(modal, 'ui-rules-scroll', 0, 20, 880, 1090, true);
    this.presentSheet(modal, scroll);
    liveLabel(scroll, 'CHOOSE LANGUAGE', 0, 345, 700, 65, 40, INK);
    LANGUAGES.forEach((choice, index) => {
      const y = 243 - index * 126;
      this.button(scroll, `${choice.code === language() ? '✓  ' : ''}${choice.name}`, 0, y, 585, 85, () => {
        setLanguage(choice.code); modal.destroy(); this.render(); this.toast('Language saved on this device');
      }, choice.code === language() ? 'coral' : 'gold', 31, choice.code === language() ? 'plaque' : 'ticket');
    });
    this.button(scroll, 'CLOSE', 0, -429, 400, 80, () => this.dismissSheet(modal), 'gold', 29, 'ticket');
  }
  private avatarPicker(root: Node): void {
    const modal = this.sheet(root, 'Keeper portrait selection');
    const parchment = this.image(modal, 'ui-rules-scroll', 0, 20, 900, 1220, true);
    this.presentSheet(modal, parchment);
    liveLabel(parchment, 'CHOOSE YOUR KEEPER', 0, 465, 650, 62, 40, INK);
    liveLabel(parchment, 'Your portrait appears on your local lantern pass.', 0, 402, 650, 42, 26, INK);
    KEEPER_ART.forEach((art, i) => {
      const x = i < 3 ? AVATAR_DETAIL.upperXs[i] : -137 + (i - 3) * 274;
      const y = i < 3 ? 185 : -148;
      const slot = node(parchment, `Keeper ${KEEPER_NAMES[i]}`, x, y, AVATAR_DETAIL.slotWidth, 285);
      const portrait = this.image(slot, art, 0, 25, AVATAR_DETAIL.portraitWidth, 210);
      if (i === this.save.avatar) this.shimmer(portrait, 215, 255);
      const selected = i === this.save.avatar;
      this.image(slot, selected ? 'button-coral' : 'ui-wide-ticket', 0, -103, AVATAR_DETAIL.tagWidth, 70, true);
      singleLine(slot, KEEPER_NAMES[i], selected ? 0 : -5, -103, AVATAR_DETAIL.copyWidth, 38, 23, selected ? CREAM : INK);
      this.bindTap(slot, () => { this.playClick(); this.save.avatar = i; this.persist(); this.dismissSheet(modal, () => this.render()); },
        () => this.controlPress(slot, .98), () => this.controlRelease(slot));
    });
    this.button(parchment, 'KEEP CURRENT', 0, -495, 460, 90, () => this.dismissSheet(modal), 'gold', 28, 'ticket');
  }
  private endGuest(): void {
    this.guestSession = false; this.save = readSave(); this.inputName = this.save.name; this.accepted = this.save.accepted; this.page = 'login'; this.render();
  }
  private ledgerPage(root: Node): void {
    const coin = this.image(root, 'store-coin-platter', 0, 500, 340, 225); this.float(coin, 5, 3.4);
    const wallet = this.image(root, 'ui-wide-ticket', 0, 337, 810, 112, true);
    liveLabel(wallet, tr('CURRENT BALANCE {amount}', { amount: this.save.coins.toLocaleString() }), 0, 0, 720, 52, 35, INK);
    const entries = this.save.ledger.slice(0, 7);
    if (!entries.length) {
      const empty = this.image(root, 'ui-wide-ticket', 0, 90, 790, 200, true);
      liveLabel(empty, 'No coin activity yet', 0, 35, 650, 48, 33, INK);
      liveLabel(empty, 'Play a room or claim a daily lantern to begin.', 0, -28, 670, 41, 25, INK);
    }
    entries.forEach((entry, i) => {
      const row = this.image(root, 'ui-wide-ticket', 0, 218 - i * 120, 850, 100, true);
      this.settleIntoPlace(row, 0.24 + i * 0.09, 12);
      this.image(row, entry.delta >= 0 ? 'symbol-ingot' : 'ui-coin', -350, 0, 54, 54);
      const activity = singleLine(row, entry.label, HISTORY_DETAIL.copyX, 18, HISTORY_DETAIL.copyWidth, 39, 26);
      activity.horizontalAlign = Label.HorizontalAlign.LEFT;
      const time = singleLine(row, entry.at, HISTORY_DETAIL.copyX, -21, HISTORY_DETAIL.copyWidth, 31, 22);
      time.horizontalAlign = Label.HorizontalAlign.LEFT;
      const amount = singleLine(row, `${entry.delta >= 0 ? '+' : ''}${entry.delta.toLocaleString()}`, HISTORY_DETAIL.amountX, 0, HISTORY_DETAIL.amountWidth, 48, 29);
      amount.horizontalAlign = Label.HorizontalAlign.RIGHT;
    });
    liveLabel(root, 'Stored on this device · no payment history', 0, -676, 780, 40, 25, CREAM);
  }
  private confirmReset(root: Node): void {
    const modal = this.sheet(root, 'Confirm local data deletion');
    const plate = this.image(modal, 'ui-rules-scroll', 0, 20, 780, 850, true);
    this.presentSheet(modal, plate);
    liveLabel(plate, 'DELETE LOCAL DATA?', 0, 214, 700, 55, 41, INK);
    liveLabel(plate, 'This removes coins, spins, daily gifts and history', 0, 86, 740, 48, 29, INK);
    liveLabel(plate, 'from this device. This cannot be undone.', 0, 26, 730, 45, 29, INK);
    this.button(plate, 'KEEP PROFILE', -186, -239, 320, 94, () => this.dismissSheet(modal), 'gold', 27, 'ticket');
    this.button(plate, 'DELETE DATA', 186, -239, 320, 94, () => {
      this.guestSession = false;
      this.save = { ...DEFAULT, guarantee: { ...INITIAL_GUARANTEE }, roomMeters: DEFAULT.roomMeters.map(meter => [...meter] as LanternMeters) as Save['roomMeters'], roomSpins: [0, 0, 0, 0], featureProgress: [0, 0, 0, 0], atlasClaims: [0, 0, 0, 0], journal: freshJournal(''), ledger: [], inbox: {} };
      this.inputName = ''; this.accepted = false; this.persist(); this.page = 'login'; this.render();
    }, 'coral', 27, 'plaque');
  }
  private rename(root: Node): void {
    const modal = this.sheet(root, 'Edit keeper name');
    const plate = this.image(modal, 'ui-rules-scroll', 0, 0, 790, 680, true);
    this.presentSheet(modal, plate);
    liveLabel(plate, 'YOUR LANTERN PASS', 0, 195, 690, 60, 40, INK);
    liveLabel(plate, 'Choose a name that appears in your local ledger.', 0, RENAME_DETAIL.copyY, RENAME_DETAIL.copyWidth, RENAME_DETAIL.copyHeight, 27, INK);
    let draft = this.save.name;
    this.field(plate, 'Keeper name · 2–18 letters', 25, draft, value => { draft = value; });
    this.button(plate, 'CANCEL', -175, -185, 310, 90, () => this.dismissSheet(modal), 'gold', 29, 'ticket');
    this.button(plate, 'SAVE NAME', 175, -185, 310, 90, () => {
      const clean = draft.trim().slice(0, 18);
      if (clean.length < 2) { this.toast('Please use at least two characters.', plate); return; }
      this.save.name = clean; this.inputName = clean; this.persist(); this.render();
    }, 'coral', 29, 'plaque');
  }
  private atlasPage(root: Node): void {
    const characters = ['keeper-otter', 'keeper-rabbit', 'keeper-fox', 'keeper-dragon'] as const;
    MODES.forEach((room, i) => {
      const x = i % 2 === 0 ? -241 : 241;
      const upper = i < 2;
      const centerY = upper ? 394 : -130;
      const ledgeY = upper ? 144 : -410;
      const portrait = this.image(root, characters[i], x, centerY, 230, 226);
      this.float(portrait, 4 + i, 3 + i * 0.25);
      liveLabel(root, room.name, x, centerY - 134, 358, 42, 27, CREAM);
      const goal = atlasMilestone(this.save.roomSpins[i], this.save.atlasClaims[i]);
      const caption = goal ? goal.ready ? tr('CLAIM +{amount} COINS', { amount: goal.award }) : tr('{amount} SPINS', { amount: `${this.save.roomSpins[i]} / ${goal.threshold}` })
        : 'THREE KEEPSAKES FOUND';
      liveLabel(root, caption, x, ledgeY, 350, 42, goal?.ready ? 29 : 26, INK);
      if (goal?.ready) this.shimmer(portrait, 185, 255);
      const hit = node(root, `Atlas ${room.name} · ${caption}`, x, (centerY + ledgeY) / 2, 388, 420);
      this.bindTap(hit, () => {
        const current = atlasMilestone(this.save.roomSpins[i], this.save.atlasClaims[i]);
        this.playClick();
        if (!current?.ready) { this.enterMode(room); return; }
        this.save.atlasClaims[i] += 1;
        this.save.coins += current.award;
        this.record(`${room.name} · KEEPSAKE`, current.award);
        this.persist();
        this.showRewardClaim(tr('{name} KEEPSAKE', { name: tr(room.name) }), current.award, 'title-treasure-atlas-wide');
      });
    });
    const found = this.save.atlasClaims.reduce((sum, count) => sum + count, 0);
    const shortScreen = view.getVisibleSize().height / view.getVisibleSize().width < 1.9;
    liveLabel(root, tr('KEEPSAKES {amount}/12 · TAP TO PLAY OR CLAIM', { amount: found }), 0, shortScreen ? -575 : -657, 840, 47, shortScreen ? 23 : 27, CREAM);
  }
  private rulesPage(root: Node): void {
    // All of the four room summaries stay within the generated open book.
    // The detailed paytable is a tap away rather than being squeezed into its margins.
    const narrow = view.getVisibleSize().height / view.getVisibleSize().width < 1.9;
    liveLabel(root, 'THE FOUR TREASURE RITUALS', 0, narrow ? 255 : 324, 760, 49, 34, INK);
    liveLabel(root, 'Touch a room to read its full guide', 0, narrow ? 211 : 278, 730, 36, 25, INK);
    const rooms: Array<[string, string, string]> = [
      ['symbol-lantern', 'JADE FERRY', 'Chosen lantern row · fill the tide for 3×'],
      ['symbol-pearl', 'PEARL GARDEN', 'Winding pearl path · hold & re-spin'],
      ['symbol-ingot', 'EMBER FOUNDRY', 'Collect 60 ingots · release the 2× forge'],
      ['symbol-dragon', 'CELESTIAL VAULT', 'Chain dragon columns · open the 5× seal'],
    ];
    const rowLayout = RULES_DETAIL[narrow ? 'compact' : 'full'];
    rooms.forEach(([art, title, detail], i) => {
      const y = rowLayout.rowY - i * rowLayout.rowStep;
      const emblem = this.image(root, art, -330, y, rowLayout.emblemSize, rowLayout.emblemSize);
      this.float(emblem, 2, 3.4 + i * 0.3);
      liveLabel(root, title, 12, y + rowLayout.titleY, 605, rowLayout.titleHeight, 30, INK);
      if (!narrow) liveLabel(root, detail, 12, y + rowLayout.detailY, 640, rowLayout.detailHeight, 24, INK);
      const hit = node(root, `Open ${title} room guide`, 0, y, 790, rowLayout.hitHeight);
      this.bindTap(hit, () => { this.playClick(); this.roomGuide(root, i as ModeId); });
    });
    liveLabel(root, 'NEW PLAYER · BIG BY 5 · SUPER BY 10', 0, narrow ? -96 : -114, 780, 37, 26, INK);
    liveLabel(root, 'Virtual coins only · no cash prizes or purchases', 0, narrow ? -134 : -152, 785, 30, 21, INK);
    this.button(root, 'PRIVACY · TERMS · HELP', 0, -352, 580, 82, () => this.houseInformation(root, 'privacy'), 'gold', 25, 'ticket');
  }
  private houseInformation(root: Node, kind: 'privacy' | 'terms' | 'help'): void {
    root.getChildByName('House information')?.destroy();
    const modal = node(root, 'House information', 0, 0, 1024, 2048);
    modal.addComponent(BlockInputEvents);
    this.setHallPresentationHidden(root, true);
    modal.once(Node.EventType.NODE_DESTROYED, () => {
      if (root.isValid) this.setHallPresentationHidden(root, false);
    });
    const scroll = this.image(modal, 'ui-rules-scroll', 0, 0, 900, 1190, true);
    liveLabel(scroll, 'HOUSE INFORMATION', 0, 426, 720, 62, 39, INK);
    (['privacy', 'terms', 'help'] as const).forEach((tab, i) => {
      this.button(scroll, tab === 'privacy' ? 'PRIVACY' : tab === 'terms' ? 'TERMS' : 'HELP', -256 + i * 256, 306, 225, 82,
        () => { modal.destroy(); this.houseInformation(root, tab); }, tab === kind ? 'coral' : 'gold', 25, tab === kind ? 'plaque' : 'ticket');
    });
    const text = kind === 'privacy' ? [
      ['DEVICE-LOCAL DATA', 'Your nickname, wallet, rounds, settings and messages are stored on this device only.'],
      ['YOUR CONTROLS', 'Open Account to delete local game data. Language is stored separately and can be changed at any time.'],
      ['NO ONLINE ACCOUNT', 'This demo has no account server, analytics, ad tracking or real-money checkout.'],
    ] : kind === 'terms' ? [
      ['SIMULATED PLAY', 'Virtual coins have no cash value. They cannot be withdrawn, sold or exchanged for prizes.'],
      ['FREE DEMO COINS', 'The shop adds free virtual coins. No payment, Apple purchase or receipt is created.'],
      ['PLAY RESPONSIBLY', 'This is simulated gambling. Follow local age requirements and take regular breaks.'],
    ] : [
      ['GAME GUIDE', 'Open House Rules for all four games and their paytables. Open the Journal for daily goals.'],
      ['ACCOUNT & DATA', 'Local passes remain on this device. Delete Data in Account removes progress and virtual coins.'],
      ['PURCHASES & ONLINE PLAY', 'This demo has no paid purchases, remote account or live leaderboard to restore.'],
    ];
    text.forEach(([title, body], i) => {
      const y = 176 - i * 190;
      this.image(scroll, 'symbol-lantern', -333, y, 50, 50);
      liveLabel(scroll, title, -2, y + 26, 640, 48, 31, INK);
      liveLabel(scroll, body, -2, y - 53, 640, 137, 32, INK);
    });
    this.button(scroll, 'BACK TO RULES', 0, -471, 480, 84, () => modal.destroy(), 'coral', 27, 'plaque');
  }
  private roomGuide(root: Node, room: ModeId): void {
    const modal = node(root, `${MODES[room].name} full guide`, 0, 0, 1024, 2048);
    modal.addComponent(BlockInputEvents);
    const page = this.image(modal, 'ui-rules-scroll', 0, 0, 875, 1270, true);
    const mode = MODES[room];
    const icons = REEL_ART.map((art, i) => art[PRIMARY_SYMBOL[i]]);
    const thresholds = room === 2 ? ['6 INGOTS', '9 INGOTS', '12 INGOTS'] : room === 3
      ? ['3 COLUMNS', '4 COLUMNS', '5 COLUMNS'] : ['3 SYMBOLS', '4 SYMBOLS', '5 SYMBOLS'];
    const explanation: readonly string[] = room === 0 ? [
      'Choose a row on the cabinet before spinning.',
      'Lanterns must start at the leftmost column.',
      'Your chosen tide meter persists between spins.',
      'At 100%, it resets and adds 3× total bet.',
    ] : room === 1 ? [
      'Choose one of three winding lotus paths.',
      'Pearls must connect from the first column.',
      'A winning path holds its pearls for one re-spin.',
      'The final board decides the award tier.',
    ] : room === 2 ? [
      'Ingots count anywhere on the whole board.',
      'Even losing spins add ingots to the press.',
      'Collect 60 to release another 2× total bet.',
      'Unused ingots carry on to the next spin.',
    ] : [
      'Each column needs at least one dragon.',
      'The chain starts with the first column.',
      'Three winning spins in a row open the seal.',
      'The seal adds 5× bet; a miss resets it.',
    ];
    this.image(page, icons[room], 0, 420, 180, 170);
    liveLabel(page, mode.name, 0, 304, 690, 58, 43, INK);
    liveLabel(page, mode.subtitle, 0, 255, 660, 41, 27, INK);
    const pay = ['1× BET', '4× BET', '8× BET'] as const;
    thresholds.forEach((threshold, i) => {
      const x = -257 + i * 257;
      // The scroll is an open paper surface: printed emblems and a two-line
      // paytable sit directly on it, with no ornate button art masking the rates.
      this.image(page, icons[room], x, 153, 62, 62);
      liveLabel(page, threshold, x, 91, 222, 34, 25, INK);
      liveLabel(page, pay[i], x, 46, 222, 38, 31, INK);
    });
    explanation.forEach((line, i) => liveLabel(page, line, 0, -104 - i * 65, 720, 46, 27, INK));
    const progress = room === 0 ? tr('SELECTED TIDE {amount}% / 100%', { amount: this.save.roomMeters[0][this.save.selectedLane] })
      : room === 1 ? tr('PATH {amount} · ONE HOLD & RE-SPIN', { amount: this.save.selectedLane + 1 })
      : room === 2 ? tr('FORGE {amount} / 60 INGOTS', { amount: this.save.featureProgress[2] })
      : tr('DRAGON SEALS {amount} / 3', { amount: this.save.featureProgress[3] });
    liveLabel(page, progress, 0, -389, 720, 43, 27, INK);
    this.button(page, 'BACK TO RULES', -185, -485, 334, 83, () => modal.destroy(), 'gold', 26, 'ticket');
    this.button(page, 'ENTER ROOM', 190, -485, 334, 83, () => this.enterMode(mode), 'coral', 28, 'plaque');
  }
  private toast(message: string, anchor?: Node): void {
    this.toastNode?.destroy();
    const visible = view.getVisibleSize();
    // Field validation belongs to the open sheet, not across its page title.
    const layout = anchor ? { scale: 1, ...NAME_NOTICE } : noticeLayout(this.page, visible.width, visible.height);
    const n = this.toastNode = node(anchor ?? this.node, 'Toast', 0, layout.y * layout.scale, layout.width, layout.height);
    n.setScale(layout.scale, layout.scale, 1); n.addComponent(BlockInputEvents);
    this.image(n, 'ui-wide-ticket', 0, 0, layout.width, layout.height, true);
    const copy = liveLabel(n, message, -17, 0, Math.min(660, layout.width * .78), layout.height - 20, 28, INK);
    copy.enableWrapText = true;
    const alpha = opacity(n, this.reduced ? 255 : 0);
    n.once(Node.EventType.NODE_DESTROYED, () => {
      Tween.stopAllByTarget(alpha); if (this.toastNode === n) this.toastNode = undefined;
    });
    // A single notice replaces the previous one. It remains visible long enough
    // to read, and page replacement cancels its owner rather than leaking it.
    tween(alpha).to(this.reduced ? 0 : .16, { opacity: 255 }, { easing: 'sineOut' })
      .delay(tr(message).length > 64 ? 3 : 2.1).to(this.reduced ? 0 : .2, { opacity: 0 })
      .call(() => { if (n.isValid) n.destroy(); }).start();
  }
  private blocking(root: Node): void { const blocker = node(root, 'Input blocker', 0, 0, 1024, 2048); blocker.addComponent(BlockInputEvents); blocker.setSiblingIndex(0); }
}
