import {
    _decorator,
    AudioClip,
    AudioSource,
    BlockInputEvents,
    Button,
    Color,
    Component,
    Font,
    Graphics,
    Label,
    Node,
    profiler,
    ResolutionPolicy,
    resources,
    screen,
    Sprite,
    SpriteFrame,
    sys,
    tween,
    Tween,
    UITransform,
    UIOpacity,
    Vec2,
    Vec3,
    view,
} from 'cc';
import { EconomyService, FreeSpinController, FreeSpinState } from '../features/FeatureControllers';
import { ResultGenerator, SpinResult, SymbolId } from '../paytable/GameMath';
import { SeededRNG } from '../core/SeededRNG';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1334;
const COLS = 5;
const ROWS = 3;

const FRAMES: Record<string, string> = {
    background: 'generated/backgrounds/background_base_v01',
    tideMeter: 'generated/characters/guardian_idle_v01',
    shockwave: 'generated/vfx/vfx_shockwave_v01',
    reelFrame: 'generated/ui/ui_reel_frame_v01',
    jackpotHeader: 'generated/ui/ui_jackpot_header_v01',
    spinButton: 'generated/ui/ui_spin_button_v01',
    coinCell: 'generated/ui/ui_coin_cell_v01',
    bonusHeader: 'generated/ui/ui_bonus_header_v01',
    titleCrest: 'generated/ui/ui_title_crest_v01',
    utilityButton: 'generated/ui/ui_utility_button_v01',
    home: 'shared/icons/arcane-home-icon-v2',
    sound: 'shared/icons/arcane-sound-icon-v2',
    rules: 'shared/icons/arcane-rules-icon-v2',
    auto: 'shared/icons/arcane-auto-icon-v2',
    plus: 'shared/icons/arcane-plus-icon-v2',
    minus: 'shared/icons/arcane-minus-icon-v2',
    pearl: 'generated/symbols/symbol_amethyst_v01',
    coral: 'generated/symbols/symbol_ruby_v01',
    spiralShell: 'generated/symbols/symbol_sapphire_v01',
    seahorse: 'generated/symbols/symbol_emerald_v01',
    starfish: 'generated/symbols/symbol_topaz_v01',
    nautilus: 'generated/symbols/symbol_moonstone_v01',
    compass: 'generated/symbols/symbol_scepter_v01',
    trident: 'generated/symbols/symbol_astrolabe_v01',
    crown: 'generated/symbols/symbol_crown_v01',
    throne: 'generated/symbols/symbol_chalice_v01',
    wild: 'generated/symbols/symbol_wild_v01',
    scatter: 'generated/symbols/symbol_scatter_v01',
    bonus: 'generated/symbols/symbol_bonus_v01',
};

const AUDIO: Record<string, string> = {
    spin: 'shared/audio/spin',
    drop: 'shared/audio/drop',
    burst: 'shared/audio/burst',
    win: 'shared/audio/win',
    coins: 'shared/audio/coins',
    click: 'shared/audio/click',
};

const SYMBOL_NAMES: Record<SymbolId, string> = {
    pearl: 'TIDAL PEARL', coral: 'ROYAL CORAL', spiralShell: 'SPIRAL SHELL', seahorse: 'JADE SEAHORSE',
    starfish: 'CORAL STAR', nautilus: 'GOLD NAUTILUS', compass: 'TIDE COMPASS', trident: 'ROYAL TRIDENT',
    crown: 'SEA CROWN', throne: 'PEARL THRONE', wild: 'TIDAL WILD', scatter: 'PORTAL SCATTER',
};

const VISIBLE_SYMBOLS = Object.values(SymbolId);

type CellView = {
    root: Node;
    symbolNode: Node;
    sprite: Sprite;
    coinFrame: Node;
    valueLabel: Label;
};

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    private readonly rng = new SeededRNG(20260829);
    private readonly generator = new ResultGenerator(this.rng);
    private readonly feature = new FreeSpinController();
    private readonly bets = [10, 20, 50, 100, 200];
    private readonly frames = new Map<string, SpriteFrame>();
    private readonly audio = new Map<string, AudioClip>();
    private economy = new EconomyService(Number(sys.localStorage.getItem('tidalKingdomCredits')) || 10000);
    private bodyFont: Font | null = null;
    private displayFont: Font | null = null;
    private audioSource!: AudioSource;
    private sceneWidth = DESIGN_WIDTH;
    private sceneHeight = DESIGN_HEIGHT;
    private cells: CellView[][] = [];
    private boardRoot!: Node;
    private effectLayer!: Node;
    private balancePanel!: Node;
    private balanceLabel!: Label;
    private betLabel!: Label;
    private resultLabel!: Label;
    private spinLabel!: Label;
    private spinSubLabel!: Label;
    private spinButton!: Node;
    private autoLabel!: Label;
    private soundLabel!: Label;
    private dashboardLabels: Label[] = [];
    private waysPathLabel!: Label;
    private tideMultiplierLabel!: Label;
    private featureStatus: Node | null = null;
    private rulesOverlay: Node | null = null;
    private rechargeOverlay: Node | null = null;
    private pending: SpinResult | null = null;
    private betIndex = 1;
    private busy = false;
    private quickStopRequested = false;
    private turbo = false;
    private soundEnabled = true;
    private autoRounds = 0;
    private reducedMotion = false;
    private resizeQueued = false;
    private waysDepth = 0;
    private currentGrid: SymbolId[][] = [];

    private readonly browserResizeHandler = (): void => {
        if (this.resizeQueued) return;
        this.resizeQueued = true;
        this.scheduleOnce(() => {
            this.resizeQueued = false;
            this.configureResolution();
            this.resizeSceneLayers();
            this.applyResponsiveLayout();
        }, 0.08);
    };

    protected async start(): Promise<void> {
        view.resizeWithBrowserSize(true);
        profiler.hideStats();
        this.configureResolution();
        this.reducedMotion = sys.isBrowser
            && typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.ensureTransform(this.node, this.sceneWidth, this.sceneHeight);
        this.audioSource = this.node.getComponent(AudioSource) ?? this.node.addComponent(AudioSource);
        this.clearCanvas();
        this.createPanel('PreloadBackdrop', this.node, this.sceneWidth, this.sceneHeight, new Color(3, 7, 24), 0, 0);
        await this.loadAssets();
        this.buildInterface();
        this.currentGrid = this.generator.generate(this.bet).grid;
        this.renderGrid(this.currentGrid);
        this.refreshHud();
        this.startAmbientMotion();
        this.bindResponsiveResize();
        this.signalBrowserReady();
    }

    protected onDestroy(): void {
        if (sys.isBrowser && typeof window !== 'undefined') {
            window.removeEventListener('resize', this.browserResizeHandler);
            window.removeEventListener('orientationchange', this.browserResizeHandler);
        }
    }

    private configureResolution(): void {
        const frame = screen.windowSize;
        const frameAspect = frame.height > 0 ? frame.width / frame.height : DESIGN_WIDTH / DESIGN_HEIGHT;
        const designAspect = DESIGN_WIDTH / DESIGN_HEIGHT;
        const policy = frameAspect < designAspect ? ResolutionPolicy.FIXED_WIDTH : ResolutionPolicy.FIXED_HEIGHT;
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, policy);
        const visible = view.getVisibleSize();
        this.sceneWidth = Math.max(DESIGN_WIDTH, visible.width);
        this.sceneHeight = Math.max(DESIGN_HEIGHT, visible.height);
        this.ensureTransform(this.node, this.sceneWidth, this.sceneHeight);
    }

    private bindResponsiveResize(): void {
        if (!sys.isBrowser || typeof window === 'undefined') return;
        window.addEventListener('resize', this.browserResizeHandler);
        window.addEventListener('orientationchange', this.browserResizeHandler);
    }

    private signalBrowserReady(): void {
        if (!sys.isBrowser || typeof window === 'undefined') return;
        window.dispatchEvent(new Event('tidal-ready'));
    }

    private async loadAssets(): Promise<void> {
        const [bodyFont, displayFont] = await Promise.all([
            this.loadResource('shared/fonts/Fredoka-Variable', Font),
            this.loadResource('shared/fonts/LilitaOne-Regular', Font),
        ]);
        this.bodyFont = bodyFont;
        this.displayFont = displayFont;
        await Promise.all([
            ...Object.entries(FRAMES).map(async ([key, path]) => {
                const frame = await this.loadResource(`${path}/spriteFrame`, SpriteFrame);
                if (frame) this.frames.set(key, frame);
            }),
            ...Object.entries(AUDIO).map(async ([key, path]) => {
                const clip = await this.loadResource(path, AudioClip);
                if (clip) this.audio.set(key, clip);
            }),
        ]);
    }

    private loadResource<T extends { isValid?: boolean }>(path: string, type: new (...args: never[]) => T): Promise<T | null> {
        return new Promise((resolve) => {
            resources.load(path, type as never, (error: Error | null, asset: T) => {
                if (error || !asset) {
                    console.warn(`[TidalKingdom] Unable to load ${path}`, error);
                    resolve(null);
                    return;
                }
                resolve(asset as unknown as T);
            });
        });
    }

    private async playCompactLoading(): Promise<void> {
        this.clearCanvas();
        this.createAdaptiveBackground('LoadingBackground', this.node);
        this.createPanel('LoadingShade', this.node, this.sceneWidth, this.sceneHeight, new Color(2, 6, 24, 96), 0, 0);
        const crest = this.createImage('LoadingCrest', this.node, 'titleCrest', 560, 374, 0, 142);
        crest.setScale(0.9, 0.9, 1);
        tween(crest).to(0.5, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        const title = this.createLabel('TIDAL KINGDOM', this.node, 52, new Color(255, 244, 202), 0, 170, 520, 74, true);
        this.styleLabel(title, new Color(7, 72, 78), 5, new Color(0, 0, 0, 120), 2, -3);
        const subtitle = this.createLabel('243 WAYS · FREE SPINS', this.node, 22, new Color(128, 247, 240), 0, 112, 440, 42, true);
        this.styleLabel(subtitle, new Color(4, 65, 73), 3);
        const ring = this.createImage('LoadingRing', this.node, 'shockwave', 230, 230, 0, -88);
        const ringOpacity = ring.addComponent(UIOpacity);
        ringOpacity.opacity = 105;
        if (!this.reducedMotion) tween(ring).repeatForever(tween().by(2.8, { angle: 360 }, { easing: 'linear' })).start();
        const progressRoot = this.createGlassPanel('LoadingProgress', this.node, 470, 50, 0, -270, 24);
        const fill = this.createPanel('LoadingFill', progressRoot, 430, 16, new Color(49, 198, 245), -215, 0, 8);
        fill.getComponent(UITransform)!.setAnchorPoint(new Vec2(0, 0.5));
        fill.getComponent(UITransform)!.setContentSize(1, 16);
        const copy = this.createLabel('OPENING THE TIDE GATES · 0%', this.node, 18, new Color(235, 255, 252), 0, -320, 500, 38, true);
        this.styleLabel(copy, new Color(23, 22, 69), 2);
        const holder = { value: 0 };
        await new Promise<void>((resolve) => {
            tween(holder).to(this.reducedMotion ? 0.35 : 1.25, { value: 1 }, {
                easing: 'quadOut',
                onUpdate: () => {
                    fill.getComponent(UITransform)!.setContentSize(430 * Math.max(0.01, holder.value), 16);
                    copy.string = holder.value < 0.7
                        ? `OPENING THE TIDE GATES · ${Math.floor(holder.value * 100)}%`
                        : `CHARGING FREE SPINS · ${Math.floor(holder.value * 100)}%`;
                },
            }).call(resolve).start();
        });
        await this.wait(0.12);
    }

    private buildInterface(): void {
        this.clearCanvas();
        this.cells = [];
        const background = this.createAdaptiveBackground('Background', this.node);
        background.setSiblingIndex(0);
        this.createPanel('GlobalTint', this.node, this.sceneWidth, this.sceneHeight, new Color(4, 8, 29, 35), 0, 0);
        this.createPanel('BottomShade', this.node, this.sceneWidth, 370, new Color(2, 19, 28, 150), 0, -500);

        // The tide is a real game-state instrument attached to the reels, not a decorative side character.
        const tideMeter = this.createGlassPanel('TideMeter', this.node, 96, 390, 307, 62, 42, new Color(2, 45, 53, 230), new Color(231, 190, 91, 220));
        const tideTitle = this.createLabel('TIDE', tideMeter, 17, new Color(221, 255, 250), 0, 159, 76, 28, true);
        this.styleLabel(tideTitle, new Color(3, 67, 73), 3);
        const tideArt = this.createImage('TideArtifact', tideMeter, 'tideMeter', 112, 258, 0, 10);
        this.tideMultiplierLabel = this.createLabel('1×', tideMeter, 29, new Color(255, 244, 197), 0, -112, 76, 42, true);
        this.styleLabel(this.tideMultiplierLabel, new Color(5, 74, 81), 4);
        this.addButton(tideMeter, () => this.showKeeperTip());
        if (!this.reducedMotion) tween(tideArt).repeatForever(tween().to(1.6, { position: new Vec3(0, 16, 0) }, { easing: 'sineInOut' }).to(1.6, { position: new Vec3(0, 4, 0) }, { easing: 'sineInOut' })).start();

        this.createHomeButton();
        this.createTitle();
        this.createBalance();
        this.createFeatureDashboard();
        this.createBoard();
        this.createControls();
        this.createAmbientSparkles();

        this.effectLayer = new Node('GlobalEffects');
        this.node.addChild(this.effectLayer);
        this.ensureTransform(this.effectLayer, this.sceneWidth, this.sceneHeight);
        this.applyResponsiveLayout();
    }

    private createHomeButton(): void {
        const bezel = this.createImage('HomeButton', this.node, 'utilityButton', 112, 112, -312, 580);
        const icon = this.createImage('HomeIcon', bezel, 'home', 60, 60, 0, 8);
        const homeCopy = this.createLabel('HOME', bezel, 15, Color.WHITE, 0, -37, 82, 24, true);
        this.styleLabel(homeCopy, new Color(45, 25, 78), 2);
        this.addButton(bezel, () => this.onHome());
        if (!this.reducedMotion) tween(icon).repeatForever(tween().to(1.4, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'sineInOut' }).to(1.4, { scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
    }

    private createTitle(): void {
        const crest = this.createImage('TitleCrest', this.node, 'titleCrest', 372, 248, 0, 565);
        const title = this.createLabel('TIDAL KINGDOM', crest, 36, new Color(255, 246, 210), 0, 17, 330, 52, true);
        this.styleLabel(title, new Color(5, 73, 80), 5, new Color(0, 0, 0, 125), 2, -3);
        const subtitle = this.createLabel('WAYS OF THE DEEP', crest, 17, new Color(174, 255, 249), 0, -25, 286, 32, true);
        this.styleLabel(subtitle, new Color(3, 62, 70), 3);
        if (!this.reducedMotion) tween(crest).repeatForever(tween().to(1.8, { scale: new Vec3(1.012, 1.012, 1) }, { easing: 'sineInOut' }).to(1.8, { scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
    }

    private createBalance(): void {
        this.balancePanel = this.createGlassPanel('BalancePanel', this.node, 368, 76, 0, 458, 35);
        const coinHalo = this.createImage('BalanceCoinHalo', this.balancePanel, 'shockwave', 76, 76, -134, 0);
        const haloOpacity = coinHalo.addComponent(UIOpacity);
        haloOpacity.opacity = 92;
        if (!this.reducedMotion) tween(coinHalo).repeatForever(tween().by(5.5, { angle: 360 }, { easing: 'linear' })).start();
        const balanceCoin = this.createImage('BalanceCoin', this.balancePanel, 'bonus', 66, 66, -134, 0);
        balanceCoin.setSiblingIndex(coinHalo.getSiblingIndex() + 1);
        const label = this.createLabel('PEARL BALANCE', this.balancePanel, 14, new Color(213, 255, 251), -6, 18, 206, 26, true);
        this.styleLabel(label, new Color(3, 62, 70), 2);
        this.balanceLabel = this.createLabel('10,000', this.balancePanel, 28, new Color(255, 235, 163), -6, -13, 206, 40, true);
        this.styleLabel(this.balanceLabel, new Color(5, 75, 80), 4, new Color(0, 0, 0, 120), 2, -2);
        const plus = this.createImage('RechargeButton', this.balancePanel, 'plus', 62, 62, 146, 0);
        this.addButton(plus, () => this.showRecharge());
    }

    private createFeatureDashboard(): void {
        const header = this.createGlassPanel('WaysRibbon', this.node, 654, 116, 0, 342, 32, new Color(2, 49, 58, 232), new Color(229, 187, 88, 215));
        const names = ['NO PAYLINES', 'PORTAL SCATTERS', 'FREE-SPIN TIDE'];
        const colors = [new Color(151, 244, 239), new Color(255, 210, 171), new Color(255, 237, 179)];
        names.forEach((name, index) => {
            const x = -218 + index * 218;
            const copy = this.createLabel(name, header, 14, colors[index], x, 30, 190, 26, true);
            this.styleLabel(copy, new Color(3, 61, 69), 2);
            const value = this.createLabel(index === 0 ? '243 WAYS' : index === 1 ? '3+ = FREE SPINS' : '1× → 5×', header, index === 1 ? 18 : 23, new Color(255, 244, 202), x, -4, 194, 36, true);
            this.styleLabel(value, new Color(4, 71, 78), 3);
            this.dashboardLabels.push(value);
        });
        this.waysPathLabel = this.createLabel('3  →  9  →  27  →  81  →  243', header, 15, new Color(178, 246, 239), 0, -39, 566, 26, true);
        this.styleLabel(this.waysPathLabel, new Color(2, 62, 69), 2);
    }

    private createBoard(): void {
        this.boardRoot = new Node('BoardRoot');
        this.node.addChild(this.boardRoot);
        this.boardRoot.setPosition(-34, 66);
        this.ensureTransform(this.boardRoot, 670, 500);
        this.createImage('ReelCabinet', this.boardRoot, 'reelFrame', 660, 456, 0, 6);
        const inner = this.createPanel('ReelInterior', this.boardRoot, 596, 338, new Color(2, 37, 45, 248), 0, 2, 20);
        inner.setSiblingIndex(1);
        const xs = [-236, -118, 0, 118, 236];
        const ys = [106, 0, -106];
        xs.forEach((x, column) => {
            const lane = this.createGlassPanel(`ReelLane_${column}`, this.boardRoot, 112, 330, x, 2, 18, new Color(3, 57, 64, 220), new Color(105, 220, 207, 105));
            lane.setSiblingIndex(2 + column);
            const marker = this.createLabel(`${column + 1}`, lane, 13, new Color(201, 251, 246), 0, 143, 36, 22, true);
            this.styleLabel(marker, new Color(3, 64, 70), 2);
        });
        for (let row = 0; row < ROWS; row += 1) {
            const rowViews: CellView[] = [];
            for (let column = 0; column < COLS; column += 1) {
                const cell = new Node(`Cell_${row}_${column}`);
                this.boardRoot.addChild(cell);
                cell.setPosition(xs[column], ys[row] + 4);
                this.ensureTransform(cell, 112, 104);
                this.createPanel('SymbolShelf', cell, 104, 98, new Color(2, 35, 43, 205), 0, 0, 16);
                const coinFrame = this.createImage('CoinCell', cell, 'coinCell', 109, 109, 0, 0);
                coinFrame.active = false;
                const symbolNode = this.createImage('Symbol', cell, 'pearl', 101, 101, 0, 0);
                const sprite = symbolNode.getComponent(Sprite)!;
                const valueLabel = this.createLabel('', cell, 21, new Color(255, 241, 181), 0, -28, 88, 30, true);
                this.styleLabel(valueLabel, new Color(49, 24, 76), 4, new Color(0, 0, 0, 150), 2, -2);
                valueLabel.node.active = false;
                this.addButton(cell, () => this.inspectSymbol(row, column));
                rowViews.push({ root: cell, symbolNode, sprite, coinFrame, valueLabel });
            }
            this.cells.push(rowViews);
        }
        const glint = this.createImage('BoardGlint', this.boardRoot, 'shockwave', 38, 38, -286, 196);
        const glintOpacity = glint.addComponent(UIOpacity);
        glintOpacity.opacity = 0;
        if (!this.reducedMotion) {
            tween(glint).repeatForever(tween().set({ position: new Vec3(-286, 196, 0), scale: new Vec3(0.5, 0.5, 1) }).to(2.2, { position: new Vec3(286, 196, 0), scale: new Vec3(1.2, 1.2, 1), angle: 180 }, { easing: 'sineInOut' }).delay(1.5)).start();
            tween(glintOpacity).repeatForever(tween().to(0.22, { opacity: 170 }).delay(1.55).to(0.32, { opacity: 0 }).delay(1.61)).start();
        }
    }

    private createControls(): void {
        this.createGlassPanel('ControlDock', this.node, 704, 328, 0, -496, 42, new Color(2, 38, 47, 244), new Color(207, 164, 74, 190));
        const resultPanel = this.createGlassPanel('ResultPanel', this.node, 640, 76, 0, -258, 30);
        this.resultLabel = this.createLabel('MATCH SYMBOLS ON ADJACENT REELS · 243 WAYS', resultPanel, 18, new Color(239, 255, 253), 0, 0, 576, 48, true);
        this.styleLabel(this.resultLabel, new Color(3, 65, 73), 3, new Color(0, 0, 0, 105), 2, -2);

        const betPanel = this.createGlassPanel('BetPanel', this.node, 242, 104, -226, -405, 42);
        const betCopy = this.createLabel('TOTAL BET', betPanel, 14, new Color(218, 255, 252), 0, 25, 160, 26, true);
        this.styleLabel(betCopy, new Color(3, 63, 71), 2);
        this.betLabel = this.createLabel('20', betPanel, 30, new Color(255, 238, 174), 0, -12, 100, 42, true);
        this.styleLabel(this.betLabel, new Color(4, 70, 77), 4);
        const minus = this.createImage('BetMinus', betPanel, 'minus', 62, 62, -78, -4);
        const plus = this.createImage('BetPlus', betPanel, 'plus', 62, 62, 78, -4);
        this.addButton(minus, () => this.changeBet(-1));
        this.addButton(plus, () => this.changeBet(1));

        this.spinButton = this.createImage('SpinButton', this.node, 'spinButton', 202, 202, 0, -408);
        this.addButton(this.spinButton, () => void this.onSpinPressed());
        this.spinLabel = this.createLabel('SPIN', this.spinButton, 31, Color.WHITE, 0, 8, 126, 45, true);
        this.styleLabel(this.spinLabel, new Color(3, 74, 80), 5, new Color(0, 0, 0, 120), 2, -3);
        this.spinSubLabel = this.createLabel('READY', this.spinButton, 13, new Color(255, 244, 207), 0, -27, 116, 24, true);
        this.styleLabel(this.spinSubLabel, new Color(4, 66, 73), 2);

        const autoButton = this.createImage('AutoPlayButton', this.node, 'utilityButton', 124, 104, 226, -405);
        this.createImage('AutoPlayIcon', autoButton, 'auto', 50, 50, 0, 14);
        this.autoLabel = this.createLabel('AUTO', autoButton, 15, Color.WHITE, 0, -31, 96, 26, true);
        this.styleLabel(this.autoLabel, new Color(42, 25, 78), 2);
        this.addButton(autoButton, () => this.toggleAuto());

        const utility = new Node('UtilityBar');
        this.node.addChild(utility);
        utility.setPosition(0, -548);
        this.ensureTransform(utility, 470, 84);
        this.createUtilityButton(utility, -150, 'SOUND', 'sound', () => this.toggleSound());
        this.createUtilityButton(utility, 0, 'RULES', 'rules', () => this.showRules());
        this.createUtilityButton(utility, 150, 'TURBO', 'shockwave', () => this.toggleTurbo());
        this.createLabel('243 WAYS  ·  VIRTUAL CREDITS  ·  NO CASH VALUE', this.node, 14, new Color(214, 248, 245), 0, -622, 700, 30, true);
        this.animateSpinButton();
    }

    private createUtilityButton(parent: Node, x: number, text: string, icon: string, action: () => void): Node {
        const button = this.createImage(`${text}Button`, parent, 'utilityButton', 112, 84, x, 0);
        this.createImage(`${text}Icon`, button, icon, 40, 40, 0, 9);
        const label = this.createLabel(text, button, 14, Color.WHITE, 0, -26, 98, 25, true);
        this.styleLabel(label, new Color(42, 25, 78), 2);
        if (text === 'AUTO') this.autoLabel = label;
        if (text === 'SOUND') this.soundLabel = label;
        this.addButton(button, action);
        return button;
    }

    private applyResponsiveLayout(): void {
        const landscape = this.sceneWidth / this.sceneHeight >= 1.08;
        const place = (name: string, x: number, y: number): Node | null => {
            const target = this.node.getChildByName(name);
            if (target) target.setPosition(x, y);
            return target;
        };
        if (!landscape) {
            place('HomeButton', -312, 590);
            const tideMeter = place('TideMeter', 307, 62);
            if (tideMeter) {
                tideMeter.active = true;
                tideMeter.setScale(0.78, 0.78, 1);
            }
            place('TitleCrest', 0, 548)?.setScale(0.88, 0.88, 1);
            place('BalancePanel', 0, 446);
            place('WaysRibbon', 0, 344)?.setScale(1, 1, 1);
            place('BoardRoot', -34, 68)?.setScale(0.98, 0.98, 1);
            place('ControlDock', 0, -496);
            place('ResultPanel', 0, -258);
            place('BetPanel', -226, -405);
            place('SpinButton', 0, -408);
            place('AutoPlayButton', 226, -405);
            place('UtilityBar', 0, -548);
            const footer = this.node.children.find((child) => child.name.startsWith('Label_243 WAYS'));
            if (footer) footer.setPosition(0, -622);
            return;
        }
        const aspect = this.sceneWidth / this.sceneHeight;
        const ultraWide = aspect >= 1.9;
        const spread = Math.min(720, Math.max(390, this.sceneWidth * (ultraWide ? 0.23 : 0.22)));
        const left = -spread;
        const right = spread;
        place('HomeButton', -this.sceneWidth / 2 + 92, 565);
        const tideMeter = place('TideMeter', left + (ultraWide ? 438 : 395), 86);
        if (tideMeter) {
            tideMeter.active = true;
            tideMeter.setScale(ultraWide ? 1.05 : 0.9, ultraWide ? 1.05 : 0.9, 1);
        }
        place('TitleCrest', right, ultraWide ? 520 : 522)?.setScale(ultraWide ? 1.1 : 1.02, ultraWide ? 1.1 : 1.02, 1);
        place('BalancePanel', right, 372)?.setScale(ultraWide ? 1.08 : 1, ultraWide ? 1.08 : 1, 1);
        place('WaysRibbon', left, 386)?.setScale(ultraWide ? 1.15 : 1.03, ultraWide ? 1.15 : 1.03, 1);
        place('BoardRoot', left - 34, 92)?.setScale(ultraWide ? 1.32 : 1.13, ultraWide ? 1.32 : 1.13, 1);
        place('ControlDock', right, ultraWide ? -170 : -184)?.setScale(ultraWide ? 1.14 : 1, ultraWide ? 1.14 : 1, 1);
        place('ResultPanel', right, 122)?.setScale(ultraWide ? 1.12 : 1, ultraWide ? 1.12 : 1, 1);
        place('BetPanel', right - (ultraWide ? 226 : 210), -70)?.setScale(ultraWide ? 1.08 : 1, ultraWide ? 1.08 : 1, 1);
        place('SpinButton', right, -76)?.setScale(ultraWide ? 1.12 : 1, ultraWide ? 1.12 : 1, 1);
        place('AutoPlayButton', right + (ultraWide ? 226 : 210), -70)?.setScale(ultraWide ? 1.08 : 1, ultraWide ? 1.08 : 1, 1);
        place('UtilityBar', right, ultraWide ? -276 : -266)?.setScale(ultraWide ? 1.1 : 1, ultraWide ? 1.1 : 1, 1);
        const footer = this.node.children.find((child) => child.name.startsWith('Label_243 WAYS'));
        if (footer) footer.setPosition(right, -350);
    }

    private resizeSceneLayers(): void {
        const background = this.node.getChildByName('Background');
        if (background) this.sizeAdaptiveBackground(background);
        ['GlobalTint', 'BottomShade'].forEach((name) => {
            const layer = this.node.getChildByName(name);
            const transform = layer?.getComponent(UITransform);
            if (layer && transform && transform.width > 0) layer.setScale(this.sceneWidth / transform.width, 1, 1);
        });
        if (this.effectLayer) this.ensureTransform(this.effectLayer, this.sceneWidth, this.sceneHeight);
        [this.rulesOverlay, this.rechargeOverlay].forEach((overlay) => {
            if (overlay) this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        });
    }

    private renderGrid(grid: SymbolId[][]): void {
        for (let row = 0; row < ROWS; row += 1) {
            for (let column = 0; column < COLS; column += 1) {
                const cell = this.cells[row][column];
                Tween.stopAllByTarget(cell.symbolNode);
                cell.coinFrame.active = false;
                cell.valueLabel.node.active = false;
                cell.symbolNode.active = true;
                cell.sprite.spriteFrame = this.frames.get(grid[column][row]) ?? null;
                cell.symbolNode.setPosition(0, 0);
                cell.symbolNode.setScale(1, 1, 1);
                cell.symbolNode.angle = 0;
                const opacity = cell.symbolNode.getComponent(UIOpacity) ?? cell.symbolNode.addComponent(UIOpacity);
                opacity.opacity = 255;
            }
        }
    }

    private async onSpinPressed(): Promise<void> {
        if (this.rulesOverlay || this.rechargeOverlay) return;
        if (this.busy) {
            this.quickStopRequested = true;
            this.spinSubLabel.string = 'QUICK STOP';
            this.resultLabel.string = 'QUICK STOP REQUESTED';
            return;
        }
        await this.spin();
    }

    private async spin(): Promise<void> {
        const bet = this.bet;
        if (!this.economy.debit(bet)) {
            this.autoRounds = 0;
            this.showRecharge('NOT ENOUGH CREDITS');
            return;
        }
        this.busy = true;
        this.quickStopRequested = false;
        this.pending = this.generator.generate(bet);
        this.waysDepth = 0;
        this.waysPathLabel.string = 'BUILDING WAYS  ·  3  …';
        this.balanceLabel.string = this.formatNumber(this.economy.credits);
        this.resultLabel.string = 'THE TIDE IS TURNING…';
        this.spinLabel.string = 'STOP';
        this.spinSubLabel.string = this.turbo ? 'TURBO' : 'TAP FOR QUICK STOP';
        this.playSound('spin', 0.55);
        await this.animateReels(this.pending.grid);
        this.currentGrid = this.pending.grid;
        await this.settleBaseSpin(this.pending);
    }

    private async animateReels(result: SymbolId[][]): Promise<void> {
        await Promise.all(Array.from({ length: COLS }, (_, column) => this.animateColumn(column, result[column])));
    }

    private async animateColumn(column: number, result: SymbolId[]): Promise<void> {
        await this.wait((this.turbo ? 0.025 : 0.075) * column);
        const cycles = this.turbo ? 3 + Math.floor(column / 2) : 6 + column;
        for (let cycle = 0; cycle < cycles; cycle += 1) {
            if (this.quickStopRequested && cycle >= 2) break;
            const duration = this.turbo ? 0.035 : 0.065;
            await Promise.all(this.cells.map(async (row) => {
                const cell = row[column];
                cell.sprite.spriteFrame = this.frames.get(this.rng.pick(VISIBLE_SYMBOLS)) ?? null;
                cell.symbolNode.setPosition(0, 42);
                cell.symbolNode.setScale(0.92, 1.12, 1);
                await this.tweenNode(cell.symbolNode, duration, {
                    position: new Vec3(0, -44, 0),
                    scale: new Vec3(1.04, 0.92, 1),
                }, 'quadIn');
            }));
        }
        await Promise.all(this.cells.map(async (row, rowIndex) => {
            const cell = row[column];
            cell.sprite.spriteFrame = this.frames.get(result[rowIndex]) ?? null;
            cell.symbolNode.setPosition(0, 82);
            cell.symbolNode.setScale(0.84, 1.18, 1);
            const opacity = cell.symbolNode.getComponent(UIOpacity) ?? cell.symbolNode.addComponent(UIOpacity);
            opacity.opacity = 75;
            tween(opacity).to(this.turbo ? 0.1 : 0.18, { opacity: 255 }, { easing: 'quadOut' }).start();
            await this.tweenNode(cell.symbolNode, this.turbo ? 0.12 : 0.25, {
                position: new Vec3(0, -8, 0),
                scale: new Vec3(1.06, 0.94, 1),
            }, 'quadIn');
            await this.tweenNode(cell.symbolNode, this.turbo ? 0.08 : 0.16, {
                position: Vec3.ZERO,
                scale: Vec3.ONE,
            }, 'backOut');
        }));
        this.revealWaysDepth(column);
        this.playSound('drop', 0.24);
    }

    private revealWaysDepth(column: number): void {
        this.waysDepth = Math.max(this.waysDepth, column);
        const steps = [3, 9, 27, 81, 243];
        const visible = steps.slice(0, this.waysDepth + 1).join('  →  ');
        this.waysPathLabel.string = this.waysDepth >= steps.length - 1 ? visible : `${visible}  …`;
        if (this.reducedMotion) return;
        const node = this.waysPathLabel.node;
        Tween.stopAllByTarget(node);
        node.setScale(0.97, 0.97, 1);
        tween(node).to(0.16, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }, { easing: 'sineInOut' }).start();
    }

    private async settleBaseSpin(result: SpinResult): Promise<void> {
        const baseWin = result.totalWin;
        if (baseWin > 0) {
            await this.presentLineWins(result);
            const from = this.economy.credits;
            this.economy.credit(baseWin);
            await Promise.all([
                this.animateBalance(from, this.economy.credits, Math.min(1.5, 0.55 + baseWin / Math.max(1, this.bet * 20))),
                this.flyCoinsToBalance(Math.min(14, 5 + result.waysWins.length)),
            ]);
            this.resultLabel.string = `${result.winningWays} WINNING WAY${result.winningWays === 1 ? '' : 'S'}  ·  ${this.formatNumber(baseWin)}`;
        } else if (result.freeSpinsAwarded === 0) {
            this.resultLabel.string = 'NO WIN · THE TIDE WILL TURN';
        }

        if (result.freeSpinsAwarded > 0) {
            await this.playFreeSpins(result.freeSpinsAwarded, false);
        } else {
            await this.finishRound();
        }
    }

    private async presentLineWins(result: SpinResult): Promise<void> {
        const unique = new Set(result.waysWins.flatMap((win) => win.cells.map(([column, row]) => `${row}:${column}`)));
        this.resultLabel.string = result.scatterCount >= 3
            ? `${result.scatterCount} PORTAL SCATTERS · ${result.freeSpinsAwarded} FREE SPINS`
            : `${result.winningWays} WINNING WAY${result.winningWays === 1 ? '' : 'S'} · WIN ${this.formatNumber(result.totalWin)}`;
        unique.forEach((key) => {
            const [row, column] = key.split(':').map(Number);
            const node = this.cells[row][column].symbolNode;
            tween(node).repeat(2, tween().to(0.16, { scale: new Vec3(1.1, 1.1, 1), angle: 2 }, { easing: 'sineOut' }).to(0.16, { scale: Vec3.ONE, angle: -2 }, { easing: 'sineIn' })).call(() => { node.angle = 0; }).start();
            this.spawnShockwave(this.cells[row][column].root, 112, 125);
        });
        this.playSound('win', 0.5);
        await this.wait(this.reducedMotion ? 0.2 : 0.75);
    }

    private async playFreeSpins(spins: number, demo: boolean): Promise<void> {
        this.busy = true;
        if (demo) this.autoRounds = 0;
        const intro = this.createFeatureIntro(spins);
        await this.wait(this.reducedMotion ? 0.35 : 1.1);
        intro.destroy();
        let state = this.feature.start(spins);
        this.enterFreeSpinMode(state);

        while (!state.complete) {
            state = this.feature.beginSpin();
            this.updateFeatureStatus(state);
            this.resultLabel.string = `FREE SPIN · ${state.remaining} REMAINING · TIDE ${state.multiplier}×`;
            const result = this.generator.generate(this.bet);
            await this.animateReels(result.grid);
            this.currentGrid = result.grid;
            if (result.totalWin > 0) await this.presentLineWins(result);
            const previousMultiplier = state.multiplier;
            state = this.feature.settle(result.totalWin, result.scatterCount);
            this.updateFeatureStatus(state);
            if (state.retriggered > 0) {
                this.resultLabel.string = `PORTAL RETRIGGER · +${state.retriggered} FREE SPINS`;
                this.playSound('burst', 0.62);
            } else if (state.lastWin > 0) {
                this.resultLabel.string = `TIDE WIN ${this.formatNumber(state.lastWin)} · MULTIPLIER ${state.multiplier}×`;
                if (state.multiplier > previousMultiplier) this.pulseTideMeter();
            }
            await this.wait(this.turbo ? 0.16 : 0.55);
        }
        await this.finishFeature(state, demo);
    }

    private createFeatureIntro(spins: number): Node {
        const overlay = new Node('FeatureIntro');
        this.effectLayer.addChild(overlay);
        this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        this.createPanel('FeatureIntroShade', overlay, this.sceneWidth, this.sceneHeight, new Color(1, 27, 34, 192), 0, 0);
        const banner = this.createImage('FeatureBanner', overlay, 'bonusHeader', 700, 466, 0, 60);
        banner.setScale(0.78, 0.78, 1);
        tween(banner).to(0.55, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        const title = this.createLabel(`${spins} FREE SPINS`, banner, 43, new Color(255, 244, 198), 0, 18, 540, 64, true);
        this.styleLabel(title, new Color(4, 70, 77), 5, new Color(0, 0, 0, 145), 2, -3);
        const copy = this.createLabel('EVERY WIN RAISES THE TIDE MULTIPLIER · UP TO 5×', banner, 15, new Color(174, 246, 240), 0, -42, 530, 36, true);
        this.styleLabel(copy, new Color(3, 62, 70), 3);
        this.createCoinShower(overlay, 12);
        this.playSound('burst', 0.62);
        return overlay;
    }

    private enterFreeSpinMode(state: FreeSpinState): void {
        const status = this.createGlassPanel('FeatureStatus', this.boardRoot, 430, 66, 0, 225, 26, new Color(2, 54, 62, 248), new Color(243, 196, 95));
        const remaining = this.createLabel(`FREE  ${state.remaining}`, status, 20, new Color(255, 241, 185), -103, 0, 185, 34, true);
        this.styleLabel(remaining, new Color(4, 70, 77), 4);
        remaining.node.name = 'RemainingLabel';
        const multiplier = this.createLabel(`TIDE  ${state.multiplier}×`, status, 20, new Color(151, 246, 238), 103, 0, 185, 34, true);
        this.styleLabel(multiplier, new Color(3, 62, 70), 3);
        multiplier.node.name = 'MultiplierLabel';
        this.featureStatus = status;
        this.updateFeatureStatus(state);
    }

    private updateFeatureStatus(state: FreeSpinState): void {
        const remaining = this.featureStatus?.getChildByName('RemainingLabel')?.getComponent(Label);
        const multiplier = this.featureStatus?.getChildByName('MultiplierLabel')?.getComponent(Label);
        if (remaining) remaining.string = `FREE  ${state.remaining}`;
        if (multiplier) multiplier.string = `TIDE  ${state.multiplier}×`;
        this.tideMultiplierLabel.string = `${state.multiplier}×`;
        if (this.dashboardLabels[2]) this.dashboardLabels[2].string = `${state.multiplier}×`;
    }

    private pulseTideMeter(): void {
        const meter = this.node.getChildByName('TideMeter');
        if (!meter) return;
        const base = meter.scale.clone();
        tween(meter).to(0.16, { scale: new Vec3(base.x * 1.08, base.y * 1.08, 1) }, { easing: 'backOut' }).to(0.25, { scale: base }, { easing: 'sineInOut' }).start();
        this.spawnShockwave(meter, 190, 165);
        this.playSound('coins', 0.46);
    }

    private async finishFeature(state: FreeSpinState, demo: boolean): Promise<void> {
        const from = this.economy.credits;
        if (!demo) this.economy.credit(state.totalWin);
        await this.showWinCelebration(state.totalWin, 'TIDAL TREASURE', demo);
        if (!demo) {
            await Promise.all([
                this.animateBalance(from, this.economy.credits, Math.min(2.2, 0.8 + state.totalWin / Math.max(1, this.bet * 25))),
                this.flyCoinsToBalance(18),
            ]);
        }
        this.featureStatus?.destroy();
        this.featureStatus = null;
        this.tideMultiplierLabel.string = '1×';
        if (this.dashboardLabels[2]) this.dashboardLabels[2].string = '1× → 5×';
        this.currentGrid = this.generator.generate(this.bet).grid;
        this.renderGrid(this.currentGrid);
        this.resultLabel.string = demo ? 'FREE SPIN DEMO COMPLETE · BALANCE UNCHANGED' : `TOTAL FREE SPIN WIN  ${this.formatNumber(state.totalWin)}`;
        await this.finishRound();
    }

    private async showWinCelebration(amount: number, titleText: string, demo: boolean): Promise<void> {
        const overlay = new Node('WinCelebration');
        this.effectLayer.addChild(overlay);
        this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        this.createPanel('WinShade', overlay, this.sceneWidth, this.sceneHeight, new Color(1, 5, 22, 174), 0, 0);
        const wave = this.createImage('CelebrationWave', overlay, 'shockwave', 600, 600, 0, 38);
        const waveOpacity = wave.addComponent(UIOpacity);
        waveOpacity.opacity = 118;
        if (!this.reducedMotion) tween(wave).repeatForever(tween().by(4, { angle: 360 }, { easing: 'linear' })).start();
        const banner = this.createImage('CelebrationBanner', overlay, 'bonusHeader', 690, 460, 0, 36);
        const title = this.createLabel(titleText, banner, 39, new Color(255, 238, 166), 0, 28, 520, 58, true);
        this.styleLabel(title, new Color(61, 24, 80), 5, new Color(0, 0, 0, 155), 2, -3);
        const value = this.createLabel('0', banner, 50, Color.WHITE, 0, -32, 480, 70, true);
        this.styleLabel(value, new Color(35, 44, 105), 6, new Color(0, 0, 0, 155), 3, -3);
        const note = this.createLabel(demo ? 'DEMO RESULT · NO CREDIT CHANGE' : 'FLOWING INTO PEARL BALANCE', banner, 12, new Color(186, 241, 237), 0, -82, 420, 24, true);
        this.styleLabel(note, new Color(3, 62, 70), 2);
        const counter = { value: 0 };
        tween(counter).to(this.reducedMotion ? 0.3 : 1.45, { value: amount }, {
            easing: 'quadOut',
            onUpdate: () => { value.string = this.formatNumber(counter.value); },
        }).start();
        this.createCoinShower(overlay, 24);
        this.playSound('win', 0.72);
        await this.wait(this.reducedMotion ? 0.6 : 2.05);
        overlay.destroy();
    }

    private createCoinShower(parent: Node, count: number): void {
        for (let index = 0; index < count; index += 1) {
            const startX = -this.sceneWidth / 2 + (this.sceneWidth * (index + 0.5)) / count;
            const coin = this.createImage(`CoinShower_${index}`, parent, 'bonus', 42 + (index % 3) * 9, 42 + (index % 3) * 9, startX, this.sceneHeight / 2 + 70 + (index % 5) * 46);
            coin.angle = index * 23;
            const endX = startX + ((index % 5) - 2) * 28;
            const duration = 1.0 + (index % 7) * 0.11;
            tween(coin).delay(index * 0.035).to(duration, { position: new Vec3(endX, -this.sceneHeight / 2 - 90, 0), angle: coin.angle + 420, scale: new Vec3(0.72, 1.12, 1) }, { easing: 'quadIn' }).call(() => coin.destroy()).start();
        }
    }

    private async flyCoinsToBalance(count: number): Promise<void> {
        const boardPosition = this.boardRoot.position;
        const target = this.balancePanel.position;
        const promises: Promise<void>[] = [];
        for (let index = 0; index < count; index += 1) {
            const coin = this.createImage(`BalanceCoin_${index}`, this.effectLayer, 'bonus', 46, 46, boardPosition.x + ((index % 5) - 2) * 66, boardPosition.y - 40 + (index % 3) * 52);
            coin.setScale(0.7, 0.7, 1);
            promises.push(new Promise<void>((resolve) => {
                tween(coin).delay(index * 0.055).to(0.22, { scale: new Vec3(1.1, 1.1, 1), position: new Vec3(coin.position.x, coin.position.y + 70, 0) }, { easing: 'backOut' }).to(0.48, { position: new Vec3(target.x - 120, target.y, 0), scale: new Vec3(0.48, 0.48, 1), angle: 220 }, { easing: 'quadIn' }).call(() => { coin.destroy(); resolve(); }).start();
            }));
        }
        this.playSound('coins', 0.48);
        await Promise.all(promises);
    }

    private async animateBalance(from: number, to: number, duration: number): Promise<void> {
        if (from === to) {
            this.balanceLabel.string = this.formatNumber(to);
            return;
        }
        const holder = { value: from };
        await new Promise<void>((resolve) => {
            tween(holder).to(this.reducedMotion ? Math.min(0.35, duration) : duration, { value: to }, {
                easing: 'linear',
                onUpdate: () => { this.balanceLabel.string = this.formatNumber(holder.value); },
            }).call(() => {
                this.balanceLabel.string = this.formatNumber(to);
                resolve();
            }).start();
        });
    }

    private async finishRound(): Promise<void> {
        sys.localStorage.setItem('tidalKingdomCredits', String(this.economy.credits));
        this.balanceLabel.string = this.formatNumber(this.economy.credits);
        this.busy = false;
        this.quickStopRequested = false;
        this.spinLabel.string = 'SPIN';
        this.spinSubLabel.string = this.turbo ? 'TURBO READY' : 'READY';
        if (this.autoRounds > 0) {
            this.autoRounds -= 1;
            this.autoLabel.string = this.autoRounds > 0 ? `AUTO ${this.autoRounds}` : 'AUTO';
            if (this.autoRounds > 0 && this.economy.credits >= this.bet) {
                this.scheduleOnce(() => { if (!this.busy) void this.spin(); }, this.turbo ? 0.25 : 0.75);
            }
        }
    }

    private changeBet(direction: number): void {
        if (this.busy) return;
        this.betIndex = Math.max(0, Math.min(this.bets.length - 1, this.betIndex + direction));
        this.refreshHud();
        this.playSound('click', 0.3);
    }

    private toggleAuto(): void {
        if (this.autoRounds > 0) {
            this.autoRounds = 0;
            this.autoLabel.string = 'AUTO';
            this.resultLabel.string = 'AUTO PLAY STOPPED';
            return;
        }
        if (this.busy) return;
        this.autoRounds = 10;
        this.autoLabel.string = 'AUTO 10';
        void this.spin();
    }

    private toggleTurbo(): void {
        if (this.busy) return;
        this.turbo = !this.turbo;
        this.resultLabel.string = this.turbo ? 'TURBO SPIN ENABLED' : 'STANDARD SPIN ENABLED';
        this.spinSubLabel.string = this.turbo ? 'TURBO READY' : 'READY';
        this.playSound('click', 0.3);
    }

    private toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        this.soundLabel.string = this.soundEnabled ? 'SOUND' : 'MUTED';
        this.resultLabel.string = this.soundEnabled ? 'SOUND ON' : 'SOUND OFF';
        this.playSound('click', 0.3);
    }

    private inspectSymbol(row: number, column: number): void {
        if (this.busy || !this.currentGrid[column]) return;
        const symbol = this.currentGrid[column][row];
        this.resultLabel.string = symbol === SymbolId.Scatter
            ? 'PORTAL SCATTER · LAND 3+ FOR FREE SPINS'
            : `${SYMBOL_NAMES[symbol]} · PAYS ON ADJACENT REELS`;
        const node = this.cells[row][column].symbolNode;
        tween(node).to(0.12, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }, { easing: 'sineIn' }).start();
        this.playSound('click', 0.22);
    }

    private showKeeperTip(): void {
        if (this.busy || this.rulesOverlay || this.rechargeOverlay) return;
        this.resultLabel.string = 'TIDE GAUGE · EACH FREE-SPIN WIN RAISES THE MULTIPLIER TO 5×';
        const meter = this.node.getChildByName('TideMeter');
        if (meter) {
            const base = meter.scale.clone();
            tween(meter).to(0.12, { scale: new Vec3(base.x * 1.06, base.y * 1.06, 1) }, { easing: 'backOut' }).to(0.2, { scale: base }, { easing: 'sineInOut' }).start();
        }
        this.playSound('click', 0.3);
    }

    private showRules(): void {
        if (this.rulesOverlay || this.busy) return;
        const overlay = new Node('RulesOverlay');
        this.node.addChild(overlay);
        this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        overlay.addComponent(BlockInputEvents);
        this.createPanel('RulesShade', overlay, this.sceneWidth, this.sceneHeight, new Color(1, 4, 20, 220), 0, 0);
        const panel = this.createGlassPanel('RulesPanel', overlay, 660, 1060, 0, 0, 38, new Color(6, 13, 45, 250), new Color(224, 178, 75));
        this.createImage('RulesCrest', panel, 'titleCrest', 450, 300, 0, 405);
        const title = this.createLabel('HOW TO PLAY', panel, 37, new Color(255, 238, 176), 0, 432, 390, 54, true);
        this.styleLabel(title, new Color(58, 24, 82), 5);
        const close = this.createImage('RulesClose', panel, 'utilityButton', 82, 82, 270, 455);
        const x = this.createLabel('×', close, 36, Color.WHITE, 0, 2, 50, 50, true);
        this.styleLabel(x, new Color(47, 25, 79), 4);
        this.addButton(close, () => this.closeRules());

        this.createRuleSection(panel, 270, '243 WAYS', 'Match symbols from reel 1 across adjacent reels.\nEach matching position creates another winning way.', 'pearl');
        this.createRuleSection(panel, 72, 'WILD CURRENT', 'WILD substitutes for every regular symbol.\nExtra WILDS can create many winning combinations.', 'wild');
        this.createRuleSection(panel, -126, 'FREE SPINS', '3 / 4 / 5 SCATTERS award 8 / 12 / 15 free spins.\nThree SCATTERS in the feature add 3 more spins.', 'scatter');
        this.createRuleSection(panel, -324, 'RISING TIDE', 'The feature begins at 1×. Every winning free spin\nraises the persistent multiplier, up to 5×.', 'coinCell');

        const demo = this.createGlassPanel('FeatureDemoButton', panel, 360, 74, 0, -460, 34, new Color(18, 91, 155, 248), new Color(255, 206, 94));
        const demoLabel = this.createLabel('TRY FREE-SPIN DEMO', demo, 22, Color.WHITE, 0, 0, 330, 42, true);
        this.styleLabel(demoLabel, new Color(38, 31, 91), 4);
        this.addButton(demo, () => {
            this.closeRules();
            this.scheduleOnce(() => void this.startFeatureDemo(), 0.1);
        });
        this.rulesOverlay = overlay;
        overlay.setScale(0.92, 0.92, 1);
        tween(overlay).to(0.24, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private createRuleSection(parent: Node, y: number, titleText: string, body: string, iconKey: string): void {
        const card = this.createGlassPanel(`Rule_${titleText}`, parent, 570, 170, 0, y, 24, new Color(8, 19, 57, 238), new Color(71, 151, 211, 150));
        this.createImage(`${titleText}Icon`, card, iconKey, iconKey === 'jackpotHeader' ? 104 : 82, 82, -226, 0);
        const heading = this.createLabel(titleText, card, 22, new Color(255, 235, 174), 70, 47, 380, 36, true);
        heading.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.styleLabel(heading, new Color(52, 24, 79), 3);
        const copy = this.createLabel(body, card, 18, new Color(235, 248, 255), 70, -22, 380, 98, true);
        copy.horizontalAlign = Label.HorizontalAlign.LEFT;
        copy.enableWrapText = true;
        copy.lineHeight = 27;
        this.styleLabel(copy, new Color(12, 25, 58), 2);
    }

    private closeRules(): void {
        this.rulesOverlay?.destroy();
        this.rulesOverlay = null;
    }

    private async startFeatureDemo(): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        this.pending = this.generator.generate(this.bet, true);
        this.currentGrid = this.pending.grid;
        this.renderGrid(this.currentGrid);
        this.resultLabel.string = 'FEATURE DEMO · BALANCE WILL NOT CHANGE';
        await this.wait(0.35);
        await this.playFreeSpins(this.pending.freeSpinsAwarded, true);
    }

    private showRecharge(message = 'ADD DEMO CREDITS'): void {
        if (this.rechargeOverlay || this.busy) return;
        const overlay = new Node('RechargeOverlay');
        this.node.addChild(overlay);
        this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        overlay.addComponent(BlockInputEvents);
        this.createPanel('RechargeShade', overlay, this.sceneWidth, this.sceneHeight, new Color(1, 4, 20, 216), 0, 0);
        const panel = this.createGlassPanel('RechargePanel', overlay, 590, 650, 0, 0, 38, new Color(6, 13, 45, 250), new Color(226, 181, 78));
        this.createImage('RechargeArt', panel, 'bonusHeader', 510, 340, 0, 174);
        const title = this.createLabel(message, panel, 30, new Color(255, 235, 168), 0, 205, 470, 50, true);
        this.styleLabel(title, new Color(57, 24, 81), 5);
        const body = this.createLabel('This template uses local virtual credits only.\nNo purchase or real-money transaction is performed.', panel, 16, new Color(208, 232, 251), 0, 40, 470, 90, true);
        body.enableWrapText = true;
        body.lineHeight = 25;
        this.styleLabel(body, new Color(24, 23, 67), 2);
        const add = this.createGlassPanel('AddCredits', panel, 370, 84, 0, -98, 38, new Color(18, 98, 163, 248), new Color(255, 207, 92));
        const addCopy = this.createLabel('ADD 2,500 CREDITS', add, 20, Color.WHITE, 0, 0, 330, 40, true);
        this.styleLabel(addCopy, new Color(38, 31, 90), 4);
        this.addButton(add, () => {
            const from = this.economy.credits;
            this.economy.credit(2500);
            sys.localStorage.setItem('tidalKingdomCredits', String(this.economy.credits));
            this.rechargeOverlay?.destroy();
            this.rechargeOverlay = null;
            void this.animateBalance(from, this.economy.credits, 0.8);
            this.resultLabel.string = '2,500 DEMO CREDITS ADDED';
        });
        const close = this.createLabel('CLOSE', panel, 14, new Color(177, 211, 240), 0, -205, 180, 36, true);
        this.styleLabel(close, new Color(30, 25, 72), 2);
        this.addButton(close.node, () => {
            this.rechargeOverlay?.destroy();
            this.rechargeOverlay = null;
        });
        this.rechargeOverlay = overlay;
        overlay.setScale(0.92, 0.92, 1);
        tween(overlay).to(0.24, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private onHome(): void {
        if (this.busy) return;
        this.playSound('click', 0.3);
        if (sys.isBrowser && typeof window !== 'undefined') {
            if (window.history.length > 1) window.history.back();
            else window.location.assign('/');
        }
    }

    private refreshHud(): void {
        this.balanceLabel.string = this.formatNumber(this.economy.credits);
        this.betLabel.string = this.formatNumber(this.bet);
        if (this.dashboardLabels[0]) this.dashboardLabels[0].string = '243';
        if (this.dashboardLabels[1]) this.dashboardLabels[1].string = '3+';
        if (this.dashboardLabels[2]) this.dashboardLabels[2].string = '1× → 5×';
    }

    private startAmbientMotion(): void {
        const tideMeter = this.node.getChildByName('TideMeter');
        if (tideMeter && !this.reducedMotion) {
            tween(tideMeter).repeatForever(tween().to(2.2, { angle: 0.35 }, { easing: 'sineInOut' }).to(2.2, { angle: -0.35 }, { easing: 'sineInOut' })).start();
        }
        this.schedule(() => {
            if (this.busy || this.reducedMotion) return;
            const row = this.rng.int(ROWS);
            const column = this.rng.int(COLS);
            const node = this.cells[row]?.[column]?.symbolNode;
            if (!node || !node.active) return;
            tween(node).to(0.28, { scale: new Vec3(1.05, 1.05, 1), angle: column % 2 ? 2 : -2 }, { easing: 'sineOut' }).to(0.34, { scale: Vec3.ONE, angle: 0 }, { easing: 'sineIn' }).start();
        }, 1.6);
    }

    private animateSpinButton(): void {
        if (this.reducedMotion) return;
        tween(this.spinButton).repeatForever(tween().to(1.25, { scale: new Vec3(1.025, 1.025, 1), angle: 0.7 }, { easing: 'sineInOut' }).to(1.25, { scale: Vec3.ONE, angle: -0.7 }, { easing: 'sineInOut' })).start();
    }

    private createAmbientSparkles(): void {
        const layer = new Node('AmbientSparkles');
        this.node.addChild(layer);
        this.ensureTransform(layer, this.sceneWidth, this.sceneHeight);
        layer.setSiblingIndex(3);
        for (let index = 0; index < 14; index += 1) {
            const x = -this.sceneWidth / 2 + (this.sceneWidth * (index + 0.5)) / 14;
            const y = -this.sceneHeight / 2 - 30 - (index % 4) * 60;
            const spark = this.createImage(`Spark_${index}`, layer, index % 3 === 0 ? 'bonus' : 'shockwave', 12 + (index % 3) * 5, 12 + (index % 3) * 5, x, y);
            const opacity = spark.addComponent(UIOpacity);
            opacity.opacity = this.reducedMotion ? 20 : 0;
            if (this.reducedMotion) continue;
            const duration = 5.2 + (index % 5) * 0.7;
            tween(spark).delay(index * 0.2).repeatForever(tween().set({ position: new Vec3(x, y, 0), angle: index * 23 }).to(duration, { position: new Vec3(x + ((index % 3) - 1) * 70, this.sceneHeight / 2 + 40, 0), angle: 260 + index * 19 }, { easing: 'sineInOut' }).delay(0.5)).start();
            tween(opacity).delay(index * 0.2).repeatForever(tween().to(0.6, { opacity: 68 }).delay(Math.max(1.3, duration - 1.4)).to(0.6, { opacity: 0 }).delay(0.5)).start();
        }
    }

    private spawnShockwave(parent: Node, size: number, opacityValue: number): void {
        const wave = this.createImage('ImpactWave', parent, 'shockwave', size, size, 0, 0);
        wave.setSiblingIndex(1);
        wave.setScale(0.35, 0.35, 1);
        const opacity = wave.addComponent(UIOpacity);
        opacity.opacity = opacityValue;
        tween(wave).to(this.reducedMotion ? 0.12 : 0.32, { scale: new Vec3(1.35, 1.35, 1), angle: 90 }, { easing: 'quadOut' }).call(() => wave.destroy()).start();
        tween(opacity).to(this.reducedMotion ? 0.12 : 0.32, { opacity: 0 }, { easing: 'quadOut' }).start();
    }

    private playSound(key: string, volume = 0.5): void {
        if (!this.soundEnabled) return;
        const clip = this.audio.get(key);
        if (clip) this.audioSource.playOneShot(clip, volume);
    }

    private get bet(): number {
        return this.bets[this.betIndex];
    }

    private wait(seconds: number): Promise<void> {
        return new Promise((resolve) => this.scheduleOnce(resolve, seconds));
    }

    private tweenNode(node: Node, duration: number, props: Record<string, unknown>, easing: string): Promise<void> {
        return new Promise((resolve) => {
            tween(node).to(duration, props as never, { easing: easing as never }).call(resolve).start();
        });
    }

    private formatNumber(value: number): string {
        return Math.max(0, Math.floor(value)).toLocaleString('en-US');
    }

    private clearCanvas(): void {
        for (const child of [...this.node.children]) {
            if (child.name === 'Camera') continue;
            Tween.stopAllByTarget(child);
            child.destroy();
        }
    }

    private createAdaptiveBackground(name: string, parent: Node): Node {
        const node = this.createImage(name, parent, 'background', 1, 1, 0, 0);
        this.sizeAdaptiveBackground(node);
        return node;
    }

    private sizeAdaptiveBackground(node: Node): void {
        const sourceAspect = 1024 / 1536;
        const targetAspect = this.sceneWidth / this.sceneHeight;
        const width = targetAspect > sourceAspect ? this.sceneWidth : this.sceneHeight * sourceAspect;
        const height = targetAspect > sourceAspect ? this.sceneWidth / sourceAspect : this.sceneHeight;
        this.ensureTransform(node, width, height);
    }

    private createImage(name: string, parent: Node, frameKey: string, width: number, height: number, x: number, y: number): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.trim = false;
        sprite.spriteFrame = this.frames.get(frameKey) ?? null;
        return node;
    }

    private createPanel(name: string, parent: Node, width: number, height: number, color: Color, x: number, y: number, radius = 0): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = color;
        if (radius > 0) graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        else graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();
        return node;
    }

    private createGlassPanel(
        name: string,
        parent: Node,
        width: number,
        height: number,
        x: number,
        y: number,
        radius = 24,
        fill = new Color(6, 14, 45, 238),
        stroke = new Color(211, 164, 67, 220),
    ): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = fill;
        graphics.strokeColor = stroke;
        graphics.lineWidth = 3;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();
        graphics.stroke();
        graphics.strokeColor = new Color(70, 161, 219, 110);
        graphics.lineWidth = 1;
        graphics.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, Math.max(4, radius - 6));
        graphics.stroke();
        return node;
    }

    private createLabel(text: string, parent: Node, size: number, color: Color, x: number, y: number, width: number, height: number, shrink = false): Label {
        const node = new Node(`Label_${text.slice(0, 20)}`);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        const displayCopy = size >= 20 && text === text.toUpperCase() && text.length <= 24 && !text.includes('\n');
        const font = displayCopy ? this.displayFont : this.bodyFont;
        if (font) label.font = font;
        label.lineHeight = Math.round(size * (displayCopy ? 1.14 : 1.4));
        label.spacingX = displayCopy ? Math.min(1.4, size * 0.035) : 0;
        label.enableWrapText = text.includes('\n');
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = shrink ? Label.Overflow.SHRINK : Label.Overflow.CLAMP;
        return label;
    }

    private styleLabel(label: Label, outlineColor: Color, outlineWidth: number, shadowColor?: Color, shadowX = 2, shadowY = -2): void {
        label.enableOutline = true;
        label.outlineColor = outlineColor;
        label.outlineWidth = outlineWidth;
        if (shadowColor) {
            label.enableShadow = true;
            label.shadowColor = shadowColor;
            label.shadowOffset = new Vec2(shadowX, shadowY);
            label.shadowBlur = 1;
        }
    }

    private ensureTransform(node: Node, width: number, height: number): UITransform {
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        return transform;
    }

    private playButtonPulse(node: Node): void {
        if (this.reducedMotion) return;
        const transform = node.getComponent(UITransform);
        if (!transform) return;
        const size = Math.min(180, Math.max(54, Math.max(transform.width, transform.height) * 1.12));
        const pulse = this.createImage('ButtonPulse', node, 'shockwave', size, size, 0, 0);
        pulse.setSiblingIndex(0);
        pulse.setScale(0.5, 0.5, 1);
        const sprite = pulse.getComponent(Sprite);
        if (sprite) sprite.color = new Color(194, 236, 255, 210);
        const opacity = pulse.addComponent(UIOpacity);
        opacity.opacity = 175;
        tween(pulse)
            .to(0.28, { scale: new Vec3(1.12, 1.12, 1), angle: 18 }, { easing: 'quadOut' })
            .call(() => pulse.destroy())
            .start();
        tween(opacity).to(0.28, { opacity: 0 }, { easing: 'quadOut' }).start();
    }

    private addButton(node: Node, action: () => void): void {
        const button = node.getComponent(Button) ?? node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        button.duration = 0.06;
        const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        node.on(Node.EventType.TOUCH_START, () => {
            Tween.stopAllByTarget(opacity);
            tween(opacity).to(0.05, { opacity: 215 }, { easing: 'quadOut' }).start();
        });
        const release = () => {
            Tween.stopAllByTarget(opacity);
            tween(opacity).to(0.14, { opacity: 255 }, { easing: 'sineOut' }).start();
        };
        node.on(Node.EventType.TOUCH_END, release);
        node.on(Node.EventType.TOUCH_CANCEL, release);
        node.on(Button.EventType.CLICK, () => {
            this.playButtonPulse(node);
            action();
        }, this);
    }
}
