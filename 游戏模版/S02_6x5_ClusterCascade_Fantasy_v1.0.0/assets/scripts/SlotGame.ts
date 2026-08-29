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
    LabelOutline,
    LabelShadow,
    Node,
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

const { ccclass } = _decorator;

type Cell = { row: number; col: number };
type Cluster = { symbol: string; cells: Cell[] };

const ROWS = 5;
const COLS = 6;
const MIN_CLUSTER = 5;
const MULTIPLIERS = [1, 2, 3, 5];

const SYMBOLS = [
    'gemBlue',
    'gemGreen',
    'gemRed',
    'potionBlue',
    'potionGreen',
    'potionRed',
    'tome',
    'shield',
];

const SYMBOL_VALUES: Record<string, number> = {
    gemBlue: 2,
    gemGreen: 2,
    gemRed: 3,
    potionBlue: 4,
    potionGreen: 4,
    potionRed: 5,
    tome: 6,
    shield: 8,
};

const SYMBOL_NAMES: Record<string, string> = {
    gemBlue: 'SAPPHIRE SHARD',
    gemGreen: 'EMERALD SHARD',
    gemRed: 'RUBY SHARD',
    potionBlue: 'MANA POTION',
    potionGreen: 'NATURE POTION',
    potionRed: 'POWER POTION',
    tome: 'ARCANE TOME',
    shield: 'ROYAL SHIELD',
    wild: 'WILD RUNE',
    scatter: 'SCATTER RUNE',
};

const FRAME_FALLBACKS: Record<string, string> = {
    generatedBackground: 'castles',
    generatedLogo: 'banner',
    generatedBoardFrame: 'panelBorder',
    generatedWinBanner: 'banner',
    generatedCoinPile: 'coin',
    generatedControlConsole: 'panelDark',
    generatedRulesFrame: 'panelDark',
    wild: 'legacyWild',
    scatter: 'legacyScatter',
    multiplier: 'legacyMultiplier',
    coin: 'legacyCoin',
    commercialHud: 'panel',
    commercialSpin: 'buttonPrimary',
    commercialUtility: 'buttonSecondary',
    commercialBet: 'panel',
    commercialMultiplierTrack: 'panelDark',
    commercialResultRibbon: 'banner',
    commercialCollect: 'buttonPrimary',
    commercialTooltip: 'panelDark',
    commercialClusterBurst: 'multiplier',
    commercialSpinAura: 'multiplier',
    commercialTreasureWordmark: 'generatedLogo',
    commercialLegendaryWordmark: 'generatedLogo',
    commercialHome: 'home',
    commercialSound: 'jewel',
    commercialRules: 'tome',
    commercialAuto: 'multiplier',
    commercialPlus: 'buttonRound',
    commercialMinus: 'buttonRoundDark',
};

const FRAMES: Record<string, string> = {
    generatedBackground: 'fantasy/generated/arcane-background',
    generatedLogo: 'fantasy/generated/arcane-logo',
    generatedBoardFrame: 'fantasy/generated/arcane-board-frame',
    generatedWinBanner: 'fantasy/generated/arcane-win-banner',
    generatedCoinPile: 'fantasy/generated/arcane-coin-pile',
    generatedControlConsole: 'fantasy/generated/arcane-control-console',
    generatedRulesFrame: 'fantasy/generated/arcane-rules-frame',
    commercialHud: 'fantasy/generated/arcane-hud-bar-v2',
    commercialSpin: 'fantasy/generated/arcane-spin-button-v2',
    commercialUtility: 'fantasy/generated/arcane-utility-button-v2',
    commercialBet: 'fantasy/generated/arcane-bet-panel-v2',
    commercialMultiplierTrack: 'fantasy/generated/arcane-multiplier-track-v2',
    commercialResultRibbon: 'fantasy/generated/arcane-result-ribbon-v2',
    commercialCollect: 'fantasy/generated/arcane-collect-button-v2',
    commercialTooltip: 'fantasy/generated/arcane-tooltip-frame-v2',
    commercialClusterBurst: 'fantasy/generated/arcane-cluster-burst-v2',
    commercialSpinAura: 'fantasy/generated/arcane-spin-aura-v2',
    commercialTreasureWordmark: 'fantasy/generated/arcane-treasure-burst-wordmark-v2',
    commercialLegendaryWordmark: 'fantasy/generated/arcane-legendary-cascade-wordmark-v2',
    commercialHome: 'fantasy/generated/arcane-home-icon-v2',
    commercialSound: 'fantasy/generated/arcane-sound-icon-v2',
    commercialRules: 'fantasy/generated/arcane-rules-icon-v2',
    commercialAuto: 'fantasy/generated/arcane-auto-icon-v2',
    commercialPlus: 'fantasy/generated/arcane-plus-icon-v2',
    commercialMinus: 'fantasy/generated/arcane-minus-icon-v2',
    castles: 'fantasy/background/castles',
    forest: 'fantasy/background/forest',
    mountain: 'fantasy/background/mountain',
    moon: 'fantasy/background/moon',
    cloud: 'fantasy/background/cloud',
    castle: 'fantasy/background/castle',
    home: 'fantasy/ui/home',
    panel: 'fantasy/ui/panel',
    panelDark: 'fantasy/ui/panel-dark',
    panelBorder: 'fantasy/ui/panel-border',
    banner: 'fantasy/ui/banner',
    buttonPrimary: 'fantasy/ui/button-primary',
    buttonSecondary: 'fantasy/ui/button-secondary',
    buttonRound: 'fantasy/ui/button-round',
    buttonRoundDark: 'fantasy/ui/button-round-dark',
    progressBorder: 'fantasy/ui/progress-border',
    progressFill: 'fantasy/ui/progress-fill',
    close: 'fantasy/ui/close',
    star: 'fantasy/ui/star',
    jewel: 'fantasy/ui/jewel',
    wild: 'fantasy/generated/arcane-wild-rune',
    scatter: 'fantasy/generated/arcane-scatter-rune',
    multiplier: 'fantasy/generated/arcane-multiplier-rune',
    coin: 'fantasy/generated/arcane-coin-icon',
    legacyWild: 'fantasy/runes/wild',
    legacyScatter: 'fantasy/runes/scatter',
    legacyMultiplier: 'fantasy/runes/multiplier',
    legacyCoin: 'fantasy/symbols/coin',
    helmet: 'fantasy/symbols/helmet',
    wand: 'fantasy/symbols/wand',
    heart: 'fantasy/symbols/heart',
    gemBlue: 'fantasy/symbols/gemBlue',
    gemGreen: 'fantasy/symbols/gemGreen',
    gemRed: 'fantasy/symbols/gemRed',
    potionBlue: 'fantasy/symbols/potionBlue',
    potionGreen: 'fantasy/symbols/potionGreen',
    potionRed: 'fantasy/symbols/potionRed',
    tome: 'fantasy/symbols/tome',
    shield: 'fantasy/symbols/shield',
};

const AUDIO: Record<string, string> = {
    spin: 'fantasy/audio/spin',
    drop: 'fantasy/audio/drop',
    burst: 'fantasy/audio/burst',
    win: 'fantasy/audio/win',
    coins: 'fantasy/audio/coins',
    click: 'fantasy/audio/click',
};

@ccclass('SlotGame')
export class SlotGame extends Component {
    private readonly designWidth = 750;
    private readonly designHeight = 1334;
    private sceneWidth = 750;
    private sceneHeight = 1334;
    private readonly bets = [10, 20, 50, 100];
    private frameMap = new Map<string, SpriteFrame>();
    private audioMap = new Map<string, AudioClip>();
    private bodyFont: Font | null = null;
    private displayFont: Font | null = null;
    private audioSource!: AudioSource;
    private grid: string[][] = [];
    private cellNodes: Node[][] = [];
    private cellSprites: Sprite[][] = [];
    private boardInner!: Node;
    private effectLayer!: Node;
    private balanceLabel!: Label;
    private betLabel!: Label;
    private resultLabel!: Label;
    private multiplierLabel!: Label;
    private spinButton!: Node;
    private spinAura!: Node;
    private spinLabel!: Label;
    private spinSubLabel!: Label;
    private balanceBar!: Node;
    private balanceCoin!: Node;
    private soundButton!: Node;
    private soundLabel!: Label;
    private autoButton!: Node;
    private autoLabel!: Label;
    private footerLabel!: Label;
    private rulesOverlay: Node | null = null;
    private rechargeOverlay: Node | null = null;
    private balance = 2500;
    private betIndex = 1;
    private spinning = false;
    private autoPlay = false;
    private soundEnabled = true;
    private spinCount = 0;
    private lossStreak = 0;
    private reducedMotion = false;
    private resizeQueued = false;
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
        this.configureResolution();
        this.reducedMotion = sys.isBrowser
            && typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.ensureTransform(this.node, this.sceneWidth, this.sceneHeight);
        this.audioSource = this.node.getComponent(AudioSource) ?? this.node.addComponent(AudioSource);
        this.clearCanvas();
        this.createPanel('PreloadBackdrop', this.node, this.sceneWidth, this.sceneHeight, new Color(5, 8, 30), 0, 0, 0);
        await this.loadAssets();
        await this.playLoadingScreen();
        this.buildInterface();
        this.grid = this.createRandomGrid();
        this.renderGrid(false);
        this.refreshHud();
        this.startAmbientMotion();
        this.bindResponsiveResize();
    }

    protected onDestroy(): void {
        if (sys.isBrowser && typeof window !== 'undefined') {
            window.removeEventListener('resize', this.browserResizeHandler);
            window.removeEventListener('orientationchange', this.browserResizeHandler);
        }
    }

    private configureResolution(): void {
        const frame = screen.windowSize;
        const frameAspect = frame.height > 0 ? frame.width / frame.height : this.designWidth / this.designHeight;
        const designAspect = this.designWidth / this.designHeight;
        const policy = frameAspect < designAspect ? ResolutionPolicy.FIXED_WIDTH : ResolutionPolicy.FIXED_HEIGHT;
        view.setDesignResolutionSize(this.designWidth, this.designHeight, policy);
        const visible = view.getVisibleSize();
        this.sceneWidth = Math.max(this.designWidth, visible.width);
        this.sceneHeight = Math.max(this.designHeight, visible.height);
        this.ensureTransform(this.node, this.sceneWidth, this.sceneHeight);
    }

    private bindResponsiveResize(): void {
        if (!sys.isBrowser || typeof window === 'undefined') return;
        window.addEventListener('resize', this.browserResizeHandler);
        window.addEventListener('orientationchange', this.browserResizeHandler);
    }

    private async loadAssets(): Promise<void> {
        const [bodyFont, displayFont] = await Promise.all([
            this.loadResource('fantasy/fonts/Fredoka-Variable', Font),
            this.loadResource('fantasy/fonts/LilitaOne-Regular', Font),
        ]);
        this.bodyFont = bodyFont;
        this.displayFont = displayFont;
        await Promise.all([
            ...Object.entries(FRAMES).map(async ([key, path]) => {
                const frame = await this.loadResource(`${path}/spriteFrame`, SpriteFrame);
                if (frame) this.frameMap.set(key, frame);
            }),
            ...Object.entries(AUDIO).map(async ([key, path]) => {
                const clip = await this.loadResource(path, AudioClip);
                if (clip) this.audioMap.set(key, clip);
            }),
        ]);
    }

    private loadResource<T extends { isValid?: boolean }>(path: string, type: new (...args: never[]) => T): Promise<T | null> {
        return new Promise((resolve) => {
            resources.load(path, type as never, (error: Error | null, asset: T) => {
                if (error || !asset) {
                    console.warn(`Unable to load ${path}`, error);
                    resolve(null);
                    return;
                }
                resolve(asset as unknown as T);
            });
        });
    }

    private async playLoadingScreen(): Promise<void> {
        this.clearCanvas();
        this.createAdaptiveBackground('LoadingBackground', this.node);
        this.createPanel('LoadingTopShade', this.node, this.sceneWidth, 380, new Color(8, 10, 37, 76), 0, 475, 0);
        this.createPanel('LoadingBottomShade', this.node, this.sceneWidth, 440, new Color(6, 8, 30, 128), 0, -472, 0);

        const logo = this.createImage('LoadingLogo', this.node, 'generatedLogo', 590, 340, 0, 294);
        logo.setScale(0.88, 0.88, 1);
        tween(logo).to(0.62, { scale: Vec3.ONE }, { easing: 'backOut' }).start();

        const portal = this.createImage('LoadingPortal', this.node, 'commercialClusterBurst', 390, 390, 0, -24);
        const portalOpacity = portal.addComponent(UIOpacity);
        portalOpacity.opacity = 118;
        if (!this.reducedMotion) {
            tween(portal).repeatForever(tween().by(4.6, { angle: 360 }, { easing: 'linear' })).start();
            tween(portalOpacity)
                .repeatForever(tween().to(0.95, { opacity: 188 }, { easing: 'sineInOut' }).to(0.95, { opacity: 96 }, { easing: 'sineInOut' }))
                .start();
        }

        const orbit = new Node('LoadingCoinOrbit');
        this.node.addChild(orbit);
        orbit.setPosition(0, -24);
        this.ensureTransform(orbit, 430, 360);
        for (let index = 0; index < 10; index += 1) {
            const angle = (Math.PI * 2 * index) / 10;
            const radiusX = 214;
            const radiusY = 158;
            const coin = this.createImage(
                `LoadingOrbitCoin_${index}`,
                orbit,
                index % 3 === 0 ? 'jewel' : 'coin',
                index % 3 === 0 ? 20 : 28,
                index % 3 === 0 ? 20 : 28,
                Math.cos(angle) * radiusX,
                Math.sin(angle) * radiusY,
            );
            coin.angle = index * 29;
            if (!this.reducedMotion) {
                tween(coin)
                    .delay(index * 0.045)
                    .repeatForever(tween().to(0.65, { scale: new Vec3(1.22, 1.22, 1), angle: coin.angle + 80 }, { easing: 'sineInOut' }).to(0.65, { scale: Vec3.ONE, angle: coin.angle + 160 }, { easing: 'sineInOut' }))
                    .start();
            }
        }
        if (!this.reducedMotion) tween(orbit).repeatForever(tween().by(5.8, { angle: -360 }, { easing: 'linear' })).start();

        const treasure = this.createImage('LoadingTreasure', this.node, 'generatedCoinPile', 500, 334, 0, -20);
        tween(treasure)
            .repeatForever(tween().to(1.15, { position: new Vec3(0, -7, 0), scale: new Vec3(1.025, 1.025, 1), angle: 1.2 }, { easing: 'sineInOut' }).to(1.15, { position: new Vec3(0, -23, 0), scale: Vec3.ONE, angle: -1.2 }, { easing: 'sineInOut' }))
            .start();
        const loadingCopy = this.createLabel('SUMMONING THE ARCANE VAULT', this.node, 18, new Color(211, 232, 255), 0, -235, 520, 36, true);
        this.styleLabel(loadingCopy, new Color(35, 25, 77), 3, new Color(0, 0, 0, 120), 2, -2);

        const progressRoot = new Node('ProgressRoot');
        this.node.addChild(progressRoot);
        progressRoot.setPosition(0, -324);
        this.ensureTransform(progressRoot, 530, 90);
        this.createImage('ProgressBorder', progressRoot, 'progressBorder', 500, 38, 0, 4, true, new Color(255, 229, 149));
        const fill = this.createImage('ProgressFill', progressRoot, 'progressFill', 470, 24, -235, 4, true, new Color(129, 206, 255));
        fill.getComponent(UITransform)!.setAnchorPoint(new Vec2(0, 0.5));
        fill.getComponent(UITransform)!.setContentSize(1, 24);
        const progressText = this.createLabel('0%', progressRoot, 17, Color.WHITE, 0, -35, 200, 28, true);
        this.styleLabel(progressText, new Color(25, 24, 70), 2);
        const progressGlow = this.createImage('ProgressGlow', progressRoot, 'jewel', 34, 34, -226, 4);
        const glowOpacity = progressGlow.addComponent(UIOpacity);
        glowOpacity.opacity = 0;
        if (!this.reducedMotion) {
            tween(progressGlow)
                .repeatForever(tween().set({ position: new Vec3(-226, 4, 0), scale: new Vec3(0.55, 0.55, 1) }).to(1.05, { position: new Vec3(226, 4, 0), scale: new Vec3(1.18, 1.18, 1), angle: 150 }, { easing: 'quadInOut' }).delay(0.24))
                .start();
            tween(glowOpacity)
                .repeatForever(tween().to(0.18, { opacity: 220 }).delay(0.62).to(0.24, { opacity: 0 }).delay(0.25))
                .start();
        }

        const holder = { value: 0 };
        await new Promise<void>((resolve) => {
            tween(holder)
                .to(this.reducedMotion ? 0.65 : 2.35, { value: 1 }, {
                    easing: 'quadOut',
                    onUpdate: () => {
                        const progress = Math.max(0.01, holder.value);
                        fill.getComponent(UITransform)!.setContentSize(470 * progress, 24);
                        progressText.string = `${Math.floor(progress * 100)}%`;
                        loadingCopy.string = progress < 0.3
                            ? 'SUMMONING THE ARCANE VAULT'
                            : progress < 0.68
                                ? 'AWAKENING TREASURE RUNES'
                                : progress < 0.94
                                    ? 'CHARGING CASCADE ENERGY'
                                    : 'THE VAULT IS READY';
                    },
                })
                .call(resolve)
                .start();
        });
        await this.wait(0.2);
    }

    private buildInterface(): void {
        this.clearCanvas();
        this.cellNodes = [];
        this.cellSprites = [];

        const background = this.createAdaptiveBackground('Background', this.node);
        background.setSiblingIndex(0);
        this.createPanel('SkyTint', this.node, this.sceneWidth, this.sceneHeight, new Color(9, 12, 43, 26), 0, 0, 0);
        this.createPanel('BottomVignette', this.node, this.sceneWidth, 440, new Color(6, 8, 30, 116), 0, -447, 0);
        this.createAmbientSparkles();

        const landscapePanel = this.createImage('LandscapeSidePanel', this.node, 'generatedRulesFrame', 720, 1230, 0, 0);
        landscapePanel.active = false;

        this.createHomeButton();
        this.createTitleBlock();
        this.createBalanceBar();
        this.createBoard();
        this.createMultiplierTrack();
        this.createBottomControls();
        this.createDynamicSceneAccents();
        this.applyResponsiveLayout();

        this.effectLayer = new Node('GlobalEffects');
        this.node.addChild(this.effectLayer);
        this.ensureTransform(this.effectLayer, this.sceneWidth, this.sceneHeight);
    }

    private createHomeButton(): void {
        const button = this.createImage('HomeButton', this.node, 'commercialHome', 108, 108, -292, 565);
        this.addButton(button, () => this.onHome());
        if (!this.reducedMotion) {
            tween(button)
                .repeatForever(tween().to(1.45, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' }).to(1.45, { scale: Vec3.ONE }, { easing: 'sineInOut' }))
                .start();
        }
    }

    private createTitleBlock(): void {
        const logo = this.createImage('TitleLogo', this.node, 'generatedLogo', 402, 210, 0, 559);
        tween(logo).repeatForever(tween().to(1.8, { scale: new Vec3(1.018, 1.018, 1) }, { easing: 'sineInOut' }).to(1.8, { scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
    }

    private createBalanceBar(): void {
        const bar = this.createImage('BalanceBar', this.node, 'commercialHud', 462, 104, 0, 446);
        this.balanceBar = bar;
        this.balanceCoin = this.createImage('CoinIcon', bar, 'coin', 72, 72, -150, -1);
        const balanceCopy = this.createLabel('VAULT BALANCE', bar, 10, new Color(195, 231, 255), 0, 15, 214, 20, true);
        this.styleLabel(balanceCopy, new Color(31, 23, 71), 2);
        this.balanceLabel = this.createLabel('2,500', bar, 30, new Color(255, 240, 173), 0, -15, 244, 42, true);
        this.styleLabel(this.balanceLabel, new Color(61, 26, 91), 4, new Color(0, 0, 0, 125), 2, -2);
        const plus = this.createImage('RechargeButton', bar, 'commercialPlus', 70, 70, 165, 0);
        this.addButton(plus, () => this.showRecharge());
        if (!this.reducedMotion) {
            tween(this.balanceCoin)
                .repeatForever(tween().to(1.2, { scale: new Vec3(1.055, 1.055, 1), angle: 4 }, { easing: 'sineInOut' }).to(1.2, { scale: Vec3.ONE, angle: -4 }, { easing: 'sineInOut' }))
                .start();
        }
    }

    private createBoard(): void {
        const board = new Node('BoardPanel');
        this.node.addChild(board);
        board.setPosition(0, 116);
        this.ensureTransform(board, 704, 520);
        this.createPanel('BoardDepth', board, 638, 438, new Color(6, 11, 38, 245), 0, -1, 22);
        this.boardInner = new Node('BoardInner');
        board.addChild(this.boardInner);
        this.ensureTransform(this.boardInner, 620, 420);
        this.boardInner.setPosition(0, -1);

        const xs = [-230, -138, -46, 46, 138, 230];
        const ys = [152, 76, 0, -76, -152];
        for (let row = 0; row < ROWS; row += 1) {
            const nodeRow: Node[] = [];
            const spriteRow: Sprite[] = [];
            for (let col = 0; col < COLS; col += 1) {
                const cell = new Node(`Cell_${row}_${col}`);
                this.boardInner.addChild(cell);
                cell.setPosition(xs[col], ys[row]);
                this.ensureTransform(cell, 86, 72);
                this.createPanel('CellDepth', cell, 84, 69, new Color(5, 14, 44, 226), 0, -1, 12);
                this.createImage('CellFrame', cell, 'panelBorder', 86, 71, 0, 0, true, new Color(112, 171, 224, 158));
                const halo = this.createPanel('CellHalo', cell, 68, 58, new Color(46, 103, 174, 116), 0, 0, 20);
                halo.setSiblingIndex(1);
                const haloOpacity = halo.addComponent(UIOpacity);
                haloOpacity.opacity = 34;
                const symbolNode = this.createImage('Symbol', cell, 'gemBlue', 66, 66, 0, 1);
                const sprite = symbolNode.getComponent(Sprite)!;
                this.addButton(cell, () => this.inspectSymbol(row, col));
                nodeRow.push(cell);
                spriteRow.push(sprite);
            }
            this.cellNodes.push(nodeRow);
            this.cellSprites.push(spriteRow);
        }
        this.createImage('GeneratedBoardFrame', board, 'generatedBoardFrame', 704, 520, 0, 0);
        const frameSpark = this.createImage('BoardFrameSpark', board, 'jewel', 22, 22, -272, 226);
        const frameSparkOpacity = frameSpark.addComponent(UIOpacity);
        frameSparkOpacity.opacity = 0;
        if (!this.reducedMotion) {
            tween(frameSpark)
                .repeatForever(tween().set({ position: new Vec3(-272, 226, 0), scale: new Vec3(0.55, 0.55, 1) }).to(2.1, { position: new Vec3(272, 226, 0), scale: new Vec3(1.2, 1.2, 1), angle: 180 }, { easing: 'sineInOut' }).delay(1.2))
                .start();
            tween(frameSparkOpacity)
                .repeatForever(tween().to(0.25, { opacity: 225 }).delay(1.35).to(0.34, { opacity: 0 }).delay(1.36))
                .start();
        }
    }

    private createMultiplierTrack(): void {
        const track = this.createImage('MultiplierTrack', this.node, 'commercialMultiplierTrack', 646, 154, 0, -226);
        const rune = this.createImage('MultiplierRune', track, 'multiplier', 65, 65, -267, 0);
        if (!this.reducedMotion) {
            tween(rune).repeatForever(tween().to(1.5, { angle: 16, scale: new Vec3(1.06, 1.06, 1) }, { easing: 'sineInOut' }).to(1.5, { angle: -16, scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
        }
        const values = ['1×', '2×', '3×', '5×'];
        const guide = this.createLabel('CASCADE WIN MULTIPLIER', track, 11, new Color(203, 226, 255), 0, 39, 390, 22, true);
        this.styleLabel(guide, new Color(45, 25, 77), 2);
        values.forEach((text, index) => {
            const x = -154 + index * 103;
            const medallion = this.createImage(`Multiplier_${index}`, track, index === 0 ? 'buttonRound' : 'buttonRoundDark', 54, 54, x, -1, true);
            const label = this.createLabel(text, medallion, 19, index === 0 ? Color.WHITE : new Color(174, 191, 223), 0, 0, 48, 38, true);
            this.styleLabel(label, new Color(52, 24, 80), 3);
        });
        const progressionCopy = this.createLabel('ADVANCES AFTER EVERY CONSECUTIVE WIN', track, 9, new Color(171, 201, 236), 20, -39, 420, 18, true);
        this.styleLabel(progressionCopy, new Color(38, 24, 70), 1);
        this.multiplierLabel = this.createLabel('ACTIVE 1×', track, 13, new Color(255, 226, 131), 250, -1, 128, 36, true);
        this.styleLabel(this.multiplierLabel, new Color(54, 25, 82), 3);
        const railSpark = this.createImage('MultiplierRailSpark', track, 'star', 20, 20, -205, 0);
        const railSparkOpacity = railSpark.addComponent(UIOpacity);
        railSparkOpacity.opacity = 0;
        if (!this.reducedMotion) {
            tween(railSpark)
                .repeatForever(tween().set({ position: new Vec3(-205, 0, 0), scale: new Vec3(0.6, 0.6, 1) }).to(1.6, { position: new Vec3(196, 0, 0), scale: new Vec3(1.35, 1.35, 1), angle: 160 }, { easing: 'quadInOut' }).delay(0.9))
                .start();
            tween(railSparkOpacity)
                .repeatForever(tween().to(0.22, { opacity: 230 }).delay(0.95).to(0.24, { opacity: 0 }).delay(1.09))
                .start();
        }
    }

    private createBottomControls(): void {
        this.createImage('GeneratedControlConsole', this.node, 'generatedControlConsole', 720, 340, 0, -436);
        const resultPlate = this.createImage('ResultPlate', this.node, 'commercialResultRibbon', 606, 104, 0, -310);
        this.resultLabel = this.createLabel('GROUP 5+ MATCHING TREASURES TO WIN', resultPlate, 15, new Color(218, 237, 255), 0, -1, 510, 40, true);
        this.styleLabel(this.resultLabel, new Color(31, 22, 69), 3, new Color(0, 0, 0, 110), 2, -2);

        const betPanel = this.createImage('BetPanel', this.node, 'commercialBet', 286, 124, -205, -420);
        const betCopy = this.createLabel('TOTAL BET', betPanel, 11, new Color(206, 232, 255), 0, 20, 108, 22, true);
        this.styleLabel(betCopy, new Color(51, 25, 79), 2);
        this.betLabel = this.createLabel('20', betPanel, 31, new Color(255, 238, 174), 0, -14, 104, 42, true);
        this.styleLabel(this.betLabel, new Color(65, 28, 83), 4);
        const minus = this.createImage('BetMinus', betPanel, 'commercialMinus', 68, 68, -86, 0);
        const plus = this.createImage('BetPlus', betPanel, 'commercialPlus', 68, 68, 86, 0);
        this.addButton(minus, () => this.changeBet(-1));
        this.addButton(plus, () => this.changeBet(1));

        this.spinAura = this.createImage('SpinAura', this.node, 'commercialSpinAura', 190, 190, 151, -420);
        const auraOpacity = this.spinAura.addComponent(UIOpacity);
        auraOpacity.opacity = 205;
        this.spinButton = this.createImage('SpinButton', this.node, 'commercialSpin', 284, 150, 151, -420);
        this.addButton(this.spinButton, () => void this.spin());
        this.spinLabel = this.createLabel('SPIN', this.spinButton, 34, Color.WHITE, 0, 8, 176, 48, true);
        this.styleLabel(this.spinLabel, new Color(86, 20, 42), 5, new Color(0, 0, 0, 140), 2, -3);
        this.spinSubLabel = this.createLabel('READY', this.spinButton, 9, new Color(255, 230, 184), 0, -27, 170, 18, true);
        this.styleLabel(this.spinSubLabel, new Color(87, 24, 45), 2);

        const utility = new Node('UtilityBar');
        this.node.addChild(utility);
        utility.setPosition(0, -538);
        this.ensureTransform(utility, 620, 82);
        this.soundButton = this.createUtilityButton(utility, -204, 'SOUND', 'commercialSound', () => this.toggleSound());
        this.soundLabel = this.soundButton.getComponentInChildren(Label)!;
        this.createUtilityButton(utility, 0, 'RULES', 'commercialRules', () => this.showRules());
        this.autoButton = this.createUtilityButton(utility, 204, 'AUTO', 'commercialAuto', () => this.toggleAuto());
        this.autoLabel = this.autoButton.getComponentInChildren(Label)!;
        this.footerLabel = this.createLabel('CLUSTER PAYS  •  NO PAYLINES  •  WINNING SYMBOLS CASCADE', this.node, 12, new Color(181, 209, 242), 0, -606, 700, 28, true);
        this.styleLabel(this.footerLabel, new Color(19, 18, 49), 1);
        this.animateSpinAura(false);
    }

    private createUtilityButton(parent: Node, x: number, text: string, iconKey: string, action: () => void): Node {
        const button = this.createImage(`${text}Button`, parent, 'commercialUtility', 180, 78, x, 0);
        this.addButton(button, action);
        this.createImage(`${text}Icon`, button, iconKey, 48, 48, -45, 0);
        const label = this.createLabel(text, button, 14, Color.WHITE, 29, 0, 92, 34, true);
        this.styleLabel(label, new Color(48, 24, 78), 3);
        return button;
    }

    private createDynamicSceneAccents(): void {
        const balanceShine = this.createImage('BalanceShine', this.balanceBar, 'star', 20, 20, -116, -4);
        const balanceShineOpacity = balanceShine.addComponent(UIOpacity);
        balanceShineOpacity.opacity = 0;
        if (!this.reducedMotion) {
            tween(balanceShine)
                .repeatForever(tween().set({ position: new Vec3(-116, -4, 0), scale: new Vec3(0.55, 0.55, 1) }).to(1.25, { position: new Vec3(118, -4, 0), scale: new Vec3(1.25, 1.25, 1), angle: 150 }, { easing: 'quadInOut' }).delay(1.45))
                .start();
            tween(balanceShineOpacity)
                .repeatForever(tween().to(0.2, { opacity: 235 }).delay(0.72).to(0.26, { opacity: 0 }).delay(1.52))
                .start();
        }

        const driftLayer = new Node('DriftingArcaneDust');
        this.node.addChild(driftLayer);
        this.ensureTransform(driftLayer, this.sceneWidth, this.sceneHeight);
        driftLayer.setSiblingIndex(3);
        for (let index = 0; index < 12; index += 1) {
            const lane = (index + 0.5) / 12;
            const startX = -this.sceneWidth / 2 + this.sceneWidth * lane;
            const startY = -this.sceneHeight / 2 - 28 - (index % 4) * 54;
            const endX = startX + ((index % 3) - 1) * 74;
            const endY = this.sceneHeight / 2 + 34;
            const particle = this.createImage(
                `DriftingParticle_${index}`,
                driftLayer,
                index % 3 === 0 ? 'jewel' : (index % 2 === 0 ? 'star' : 'coin'),
                10 + (index % 4) * 3,
                10 + (index % 4) * 3,
                startX,
                startY,
            );
            const opacity = particle.addComponent(UIOpacity);
            opacity.opacity = this.reducedMotion ? 36 : 0;
            if (this.reducedMotion) continue;
            const duration = 5.2 + (index % 5) * 0.65;
            tween(particle)
                .delay(index * 0.24)
                .repeatForever(tween()
                    .set({ position: new Vec3(startX, startY, 0), scale: new Vec3(0.65, 0.65, 1), angle: index * 21 })
                    .to(duration, { position: new Vec3(endX, endY, 0), scale: new Vec3(1.18, 1.18, 1), angle: 220 + index * 27 }, { easing: 'sineInOut' })
                    .delay(0.4))
                .start();
            tween(opacity)
                .delay(index * 0.24)
                .repeatForever(tween().to(0.55, { opacity: 105 }).delay(Math.max(1.5, duration - 1.25)).to(0.7, { opacity: 0 }).delay(0.4))
                .start();
        }
    }

    private applyResponsiveLayout(): void {
        const landscape = this.sceneWidth / this.sceneHeight >= 1.08;
        const place = (name: string, x: number, y: number): Node | null => {
            const target = this.node.getChildByName(name);
            if (target) target.setPosition(x, y);
            return target;
        };

        if (!landscape) {
            const sidePanel = place('LandscapeSidePanel', 0, 0);
            if (sidePanel) sidePanel.active = false;
            place('HomeButton', -292, 565);
            place('TitleLogo', 0, 559);
            place('BalanceBar', 0, 446);
            const board = place('BoardPanel', 0, 116);
            if (board) board.setScale(1, 1, 1);
            place('MultiplierTrack', 0, -226);
            place('ResultPlate', 0, -310);
            place('GeneratedControlConsole', 0, -436);
            place('BetPanel', -205, -420);
            place('SpinAura', 151, -420);
            place('SpinButton', 151, -420);
            place('UtilityBar', 0, -538);
            if (this.footerLabel) this.footerLabel.node.setPosition(0, -606);
            return;
        }

        const columnOffset = Math.min(470, Math.max(350, this.sceneWidth * 0.205));
        const boardScale = Math.min(1.28, Math.max(1.08, (this.sceneWidth / 2 - 100) / 704));
        const sidePanel = place('LandscapeSidePanel', columnOffset, 0);
        if (sidePanel) sidePanel.active = true;
        place('HomeButton', -this.sceneWidth / 2 + 82, 560);
        place('TitleLogo', columnOffset, 526);
        place('BalanceBar', columnOffset, 388);
        const board = place('BoardPanel', -columnOffset, 42);
        if (board) board.setScale(boardScale, boardScale, 1);
        place('MultiplierTrack', columnOffset, 202);
        place('ResultPlate', columnOffset, 64);
        place('GeneratedControlConsole', columnOffset, -232);
        place('BetPanel', columnOffset - 205, -222);
        place('SpinAura', columnOffset + 151, -222);
        place('SpinButton', columnOffset + 151, -222);
        place('UtilityBar', columnOffset, -420);
        if (this.footerLabel) this.footerLabel.node.setPosition(columnOffset, -500);
    }

    private resizeSceneLayers(): void {
        const background = this.node.getChildByName('Background');
        if (background) {
            const sourceAspect = 890 / 1334;
            const targetAspect = this.sceneWidth / this.sceneHeight;
            const width = targetAspect > sourceAspect ? this.sceneWidth : this.sceneHeight * sourceAspect;
            const height = targetAspect > sourceAspect ? this.sceneWidth / sourceAspect : this.sceneHeight;
            background.getComponent(UITransform)?.setContentSize(width, height);
        }
        ['SkyTint', 'BottomVignette'].forEach((name) => {
            const layer = this.node.getChildByName(name);
            const transform = layer?.getComponent(UITransform);
            if (layer && transform && transform.width > 0) layer.setScale(this.sceneWidth / transform.width, 1, 1);
        });
        const dust = this.node.getChildByName('DriftingArcaneDust');
        if (dust) this.ensureTransform(dust, this.sceneWidth, this.sceneHeight);
        if (this.effectLayer) this.ensureTransform(this.effectLayer, this.sceneWidth, this.sceneHeight);
        [this.rulesOverlay, this.rechargeOverlay].forEach((overlay) => {
            if (overlay) this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        });
    }

    private createRandomGrid(): string[][] {
        return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => this.randomSymbol()));
    }

    private randomSymbol(): string {
        const roll = Math.random();
        if (roll < 0.035) return 'wild';
        if (roll < 0.065) return 'scatter';
        return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }

    private renderGrid(animateDrop: boolean): void {
        for (let row = 0; row < ROWS; row += 1) {
            for (let col = 0; col < COLS; col += 1) {
                const sprite = this.cellSprites[row][col];
                const symbolNode = sprite.node;
                Tween.stopAllByTarget(symbolNode);
                sprite.spriteFrame = this.resolveFrame(this.grid[row][col]) ?? this.resolveFrame('gemBlue');
                sprite.color = Color.WHITE;
                symbolNode.angle = 0;
                symbolNode.setScale(1, 1, 1);
                const dropStartY = 102 + row * 76 + col * 8;
                symbolNode.setPosition(0, animateDrop ? dropStartY : 1);
                const opacity = symbolNode.getComponent(UIOpacity) ?? symbolNode.addComponent(UIOpacity);
                opacity.opacity = animateDrop ? 0 : 255;
                if (animateDrop) {
                    const direction = col % 2 === 0 ? -1 : 1;
                    const delay = col * 0.04 + row * 0.045;
                    const fallDuration = 0.32 + row * 0.03;
                    symbolNode.setPosition(direction * 7, dropStartY);
                    symbolNode.setScale(0.84, 1.18, 1);
                    symbolNode.angle = direction * 5;
                    tween(opacity).delay(delay).to(0.12, { opacity: 255 }, { easing: 'quadOut' }).start();
                    tween(symbolNode)
                        .delay(delay)
                        .to(fallDuration, {
                            position: new Vec3(direction * -2, -10, 0),
                            scale: new Vec3(0.96, 1.08, 1),
                            angle: direction * -2,
                        }, { easing: 'quadIn' })
                        .to(0.1, {
                            position: new Vec3(0, 7, 0),
                            scale: new Vec3(1.1, 0.88, 1),
                            angle: direction * 1.4,
                        }, { easing: 'quadOut' })
                        .to(0.18, { position: new Vec3(0, 1, 0), scale: Vec3.ONE, angle: 0 }, { easing: 'backOut' })
                        .call(() => this.playLandingPulse(row, col))
                        .start();
                }
            }
        }
    }

    private playLandingPulse(row: number, col: number): void {
        const halo = this.cellNodes[row]?.[col]?.getChildByName('CellHalo');
        if (!halo) return;
        const opacity = halo.getComponent(UIOpacity) ?? halo.addComponent(UIOpacity);
        Tween.stopAllByTarget(halo);
        Tween.stopAllByTarget(opacity);
        halo.setScale(0.74, 0.74, 1);
        opacity.opacity = this.reducedMotion ? 72 : 148;
        tween(halo)
            .to(this.reducedMotion ? 0.1 : 0.2, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'quadOut' })
            .to(0.16, { scale: Vec3.ONE }, { easing: 'sineOut' })
            .start();
        tween(opacity).to(this.reducedMotion ? 0.16 : 0.34, { opacity: 34 }, { easing: 'quadOut' }).start();
    }

    private async spin(): Promise<void> {
        if (this.spinning) return;
        const bet = this.bets[this.betIndex];
        if (this.balance < bet) {
            this.showRecharge();
            return;
        }
        this.spinning = true;
        this.spinCount += 1;
        this.balance -= bet;
        this.refreshHud();
        this.setSpinEnabled(false);
        this.resultLabel.string = 'TREASURES ARE FALLING…';
        this.multiplierLabel.string = 'ACTIVE 1×';
        this.setSpinStatus('SPINNING', 'OPENING THE VAULT');
        this.animateSpinAura(true);
        this.haptic([18, 24, 28]);
        this.playSound('spin', 0.7);
        tween(this.spinButton).to(0.12, { scale: new Vec3(0.95, 0.95, 1) }).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();

        this.grid = this.createRandomGrid();
        this.maybeSeedShowcaseCluster();
        this.renderGrid(true);
        await this.wait(1.2);
        this.playSound('drop', 0.7);
        await this.runCascades(bet);
        this.startSymbolIdleMotion();
        this.spinning = false;
        this.setSpinEnabled(true);
        this.setSpinStatus(this.autoPlay ? 'AUTO' : 'SPIN', this.autoPlay ? 'NEXT DROP' : 'READY');
        this.animateSpinAura(false);
        if (this.autoPlay) this.scheduleOnce(() => void this.spin(), 0.85);
    }

    private maybeSeedShowcaseCluster(): boolean {
        const recoveryDrop = this.lossStreak >= 3;
        if (!recoveryDrop && Math.random() >= 0.36) return false;
        const weightedTreasures = [
            'gemBlue', 'gemBlue', 'gemGreen', 'gemGreen', 'gemRed',
            'potionBlue', 'potionGreen', 'potionRed', 'tome', 'shield',
        ];
        const premium = weightedTreasures[Math.floor(Math.random() * weightedTreasures.length)];
        const shape: Cell[] = [
            { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 },
            { row: 2, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 2 },
        ];
        shape.forEach(({ row, col }) => { this.grid[row][col] = premium; });
        return true;
    }

    private async runCascades(bet: number): Promise<void> {
        let cascade = 0;
        let totalWin = 0;
        while (cascade < MULTIPLIERS.length) {
            const clusters = this.findClusters();
            if (clusters.length === 0) break;
            const multiplier = MULTIPLIERS[cascade];
            this.setMultiplierState(cascade);
            this.setSpinStatus('CASCADE', `${multiplier}× POWER`);
            const winningCells = this.uniqueCells(clusters.flatMap((cluster) => cluster.cells));
            const cascadeWin = clusters.reduce((sum, cluster) => {
                const base = SYMBOL_VALUES[cluster.symbol] ?? 5;
                const sizeFactor = 1 + Math.max(0, cluster.cells.length - MIN_CLUSTER) * 0.32;
                return sum + Math.max(1, Math.floor(base * sizeFactor * bet * multiplier * 0.21));
            }, 0);
            totalWin += cascadeWin;
            this.resultLabel.string = `${winningCells.length} TREASURES  •  +${this.formatNumber(cascadeWin)}  •  ${multiplier}×`;
            await this.highlightClusters(winningCells, multiplier);
            await this.explodeCells(winningCells);
            cascade += 1;
            await this.collapseGrid(winningCells, cascade);
        }

        if (totalWin > 0) {
            this.lossStreak = 0;
            await this.showWinCelebration(totalWin, cascade);
        } else {
            this.lossStreak += 1;
            this.resultLabel.string = 'NO CLUSTER  •  BET SPENT  •  NEXT DROP IS INDEPENDENT';
            this.multiplierLabel.string = 'ACTIVE 1×';
        }
    }

    private findClusters(): Cluster[] {
        const clusters: Cluster[] = [];
        const signatures = new Set<string>();
        for (let row = 0; row < ROWS; row += 1) {
            for (let col = 0; col < COLS; col += 1) {
                const symbol = this.grid[row][col];
                if (symbol === 'wild' || symbol === 'scatter') continue;
                const queue: Cell[] = [{ row, col }];
                const visited = new Set<string>();
                const cells: Cell[] = [];
                while (queue.length > 0) {
                    const current = queue.shift()!;
                    const key = `${current.row}:${current.col}`;
                    if (visited.has(key)) continue;
                    visited.add(key);
                    const value = this.grid[current.row]?.[current.col];
                    if (value !== symbol && value !== 'wild') continue;
                    cells.push(current);
                    const neighbors = [
                        { row: current.row - 1, col: current.col },
                        { row: current.row + 1, col: current.col },
                        { row: current.row, col: current.col - 1 },
                        { row: current.row, col: current.col + 1 },
                    ];
                    neighbors.forEach((next) => {
                        if (next.row >= 0 && next.row < ROWS && next.col >= 0 && next.col < COLS) queue.push(next);
                    });
                }
                if (cells.length >= MIN_CLUSTER) {
                    const signature = cells.map((cell) => `${cell.row}:${cell.col}`).sort().join('|');
                    if (!signatures.has(signature)) {
                        signatures.add(signature);
                        clusters.push({ symbol, cells });
                    }
                }
            }
        }
        return clusters;
    }

    private uniqueCells(cells: Cell[]): Cell[] {
        const seen = new Set<string>();
        return cells.filter((cell) => {
            const key = `${cell.row}:${cell.col}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    private async highlightClusters(cells: Cell[], multiplier: number): Promise<void> {
        this.playSound('burst', 0.68);
        this.haptic(multiplier >= 3 ? [20, 16, 30] : 18);
        cells.forEach((cell, index) => {
            const node = this.cellSprites[cell.row][cell.col].node;
            tween(node)
                .delay(index * 0.018)
                .to(0.16, { scale: new Vec3(1.24, 1.24, 1) }, { easing: 'backOut' })
                .to(0.18, { scale: new Vec3(1.08, 1.08, 1) })
                .start();
            const rune = this.createImage('ClusterRune', this.cellNodes[cell.row][cell.col], 'commercialClusterBurst', 102, 102, 0, 0);
            rune.setSiblingIndex(2);
            const opacity = rune.addComponent(UIOpacity);
            opacity.opacity = 220;
            rune.setScale(0.24, 0.24, 1);
            tween(rune).delay(index * 0.012).to(0.26, { scale: new Vec3(1.12, 1.12, 1), angle: 34 }, { easing: 'backOut' }).to(0.22, { scale: new Vec3(1.55, 1.55, 1), angle: 82 }).call(() => rune.destroy()).start();
            tween(opacity).delay(0.24 + index * 0.012).to(0.22, { opacity: 0 }).start();
        });
        const callout = this.createCallout(`${cells.length} SYMBOL CLUSTER`, `${multiplier}× CASCADE`);
        await this.wait(0.68);
        tween(callout).to(0.2, { scale: new Vec3(0.8, 0.8, 1) }).call(() => callout.destroy()).start();
    }

    private createCallout(titleText: string, subtitleText: string): Node {
        const root = new Node('ClusterCallout');
        this.effectLayer.addChild(root);
        root.setPosition(0, 130);
        root.setScale(0.35, 0.35, 1);
        this.ensureTransform(root, 500, 170);
        this.createImage('CalloutBanner', root, 'commercialTooltip', 500, 170, 0, 0);
        const title = this.createLabel(titleText, root, 25, new Color(255, 226, 115), 0, 18, 410, 42, true);
        this.styleLabel(title, new Color(65, 27, 88), 4, new Color(0, 0, 0, 120), 2, -2);
        const subtitle = this.createLabel(subtitleText, root, 13, new Color(211, 231, 255), 0, -27, 380, 25, true);
        this.styleLabel(subtitle, new Color(42, 25, 79), 2);
        tween(root).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        return root;
    }

    private async explodeCells(cells: Cell[]): Promise<void> {
        cells.forEach((cell, index) => {
            const host = this.cellNodes[cell.row][cell.col];
            const symbolNode = this.cellSprites[cell.row][cell.col].node;
            const opacity = symbolNode.getComponent(UIOpacity) ?? symbolNode.addComponent(UIOpacity);
            tween(opacity).delay(index * 0.012).to(0.2, { opacity: 0 }).start();
            tween(symbolNode).delay(index * 0.012).to(0.2, { scale: new Vec3(1.55, 1.55, 1), angle: 18 }).start();
            for (let piece = 0; piece < 3; piece += 1) {
                const key = piece === 0 ? 'star' : (piece === 1 ? this.grid[cell.row][cell.col] : 'jewel');
                const particle = this.createImage('BurstPiece', host, key, piece === 1 ? 30 : 18, piece === 1 ? 30 : 18, 0, 0);
                const angle = (index * 37 + piece * 120) * Math.PI / 180;
                const distance = 52 + piece * 14;
                const opacityPart = particle.addComponent(UIOpacity);
                tween(particle)
                    .delay(index * 0.012)
                    .to(0.34, {
                        position: new Vec3(Math.cos(angle) * distance, Math.sin(angle) * distance, 0),
                        scale: new Vec3(0.35, 0.35, 1),
                        angle: 110 + piece * 60,
                    }, { easing: 'quadOut' })
                    .call(() => particle.destroy())
                    .start();
                tween(opacityPart).delay(0.13).to(0.2, { opacity: 0 }).start();
            }
        });
        await this.wait(0.38);
    }

    private async collapseGrid(winningCells: Cell[], cascade: number): Promise<void> {
        const removed = new Set(winningCells.map((cell) => `${cell.row}:${cell.col}`));
        for (let col = 0; col < COLS; col += 1) {
            const survivors: string[] = [];
            for (let row = ROWS - 1; row >= 0; row -= 1) {
                if (!removed.has(`${row}:${col}`)) survivors.unshift(this.grid[row][col]);
            }
            while (survivors.length < ROWS) survivors.unshift(this.randomSymbol());
            for (let row = 0; row < ROWS; row += 1) this.grid[row][col] = survivors[row];
        }

        if (cascade === 1 && Math.random() < 0.18) {
            const followUpTreasures = ['gemBlue', 'gemGreen', 'potionBlue', 'potionGreen', 'gemRed', 'shield'];
            const symbol = followUpTreasures[Math.floor(Math.random() * followUpTreasures.length)];
            [{ row: 0, col: 3 }, { row: 0, col: 4 }, { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 2, col: 4 }]
                .forEach((cell) => { this.grid[cell.row][cell.col] = symbol; });
        }

        this.renderGrid(true);
        await this.wait(1.2);
        this.playSound('drop', 0.58);
    }

    private setMultiplierState(index: number): void {
        const multiplier = MULTIPLIERS[Math.min(index, MULTIPLIERS.length - 1)];
        this.multiplierLabel.string = `ACTIVE ${multiplier}×`;
        const track = this.node.getChildByName('MultiplierTrack');
        if (!track) return;
        track.getChildByName('MultiplierEnergy')?.destroy();
        const energy = this.createImage('MultiplierEnergy', track, 'commercialClusterBurst', 86, 86, -154 + Math.min(index, 3) * 103, -1);
        energy.setSiblingIndex(1);
        const energyOpacity = energy.addComponent(UIOpacity);
        energyOpacity.opacity = 190;
        energy.setScale(0.35, 0.35, 1);
        tween(energy).to(0.28, { scale: new Vec3(1.12, 1.12, 1), angle: 42 }, { easing: 'backOut' }).to(0.2, { scale: Vec3.ONE, angle: 86 }).start();
        MULTIPLIERS.forEach((_, itemIndex) => {
            const medal = track.getChildByName(`Multiplier_${itemIndex}`);
            if (!medal) return;
            medal.getComponent(Sprite)!.spriteFrame = this.frameMap.get(itemIndex <= index ? 'buttonRound' : 'buttonRoundDark') ?? null;
            const label = medal.getComponentInChildren(Label);
            if (label) label.color = itemIndex <= index ? Color.WHITE : new Color(174, 191, 223);
            tween(medal).to(0.18, { scale: itemIndex === index ? new Vec3(1.16, 1.16, 1) : Vec3.ONE }, { easing: 'backOut' }).start();
        });
    }

    private async showWinCelebration(amount: number, cascades: number): Promise<void> {
        this.playSound('win', 0.76);
        this.haptic([32, 28, 48, 32, 72]);
        this.setSpinStatus('WIN', `${cascades} CASCADE${cascades === 1 ? '' : 'S'}`);
        const overlay = new Node('WinOverlay');
        this.node.addChild(overlay);
        this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        overlay.addComponent(BlockInputEvents);
        this.createPanel('WinShade', overlay, this.sceneWidth, this.sceneHeight, new Color(5, 7, 27, 224), 0, 0, 0);

        const stage = new Node('PremiumWinStage');
        overlay.addChild(stage);
        this.ensureTransform(stage, 750, 1000);
        stage.setPosition(0, 10);
        const burstHalo = this.createImage('WinCrystalBurst', stage, 'commercialClusterBurst', 590, 590, 0, 78);
        const haloOpacity = burstHalo.addComponent(UIOpacity);
        haloOpacity.opacity = 160;
        if (!this.reducedMotion) tween(burstHalo).repeatForever(tween().to(3.6, { angle: 90 }).to(3.6, { angle: 180 })).start();
        this.createImage('GeneratedWinBanner', stage, 'generatedWinBanner', 700, 466, 0, 92);
        const wordmarkKey = cascades > 2 ? 'commercialLegendaryWordmark' : 'commercialTreasureWordmark';
        const wordmark = this.createImage('PremiumWinWordmark', stage, wordmarkKey, 650, 238, 0, 335);
        wordmark.setScale(0.65, 0.65, 1);
        tween(wordmark).delay(0.08).to(0.38, { scale: Vec3.ONE }, { easing: 'backOut' }).start();

        const ribbon = this.createImage('WinResultRibbon', stage, 'commercialResultRibbon', 610, 180, 0, 116);
        const chainCopy = this.createLabel(`${cascades} CASCADE${cascades === 1 ? '' : 'S'} COMPLETED`, ribbon, 14, new Color(205, 232, 255), 0, 48, 500, 28, true);
        this.styleLabel(chainCopy, new Color(43, 25, 79), 2);
        const winLabel = this.createLabel(`+${this.formatNumber(amount)}`, ribbon, 58, new Color(255, 226, 100), 0, 0, 540, 78, true);
        this.styleLabel(winLabel, new Color(80, 27, 100), 6, new Color(0, 0, 0, 155), 3, -4);
        const wonCopy = this.createLabel('COINS WON', ribbon, 14, new Color(202, 229, 255), 0, -53, 320, 28, true);
        this.styleLabel(wonCopy, new Color(42, 25, 78), 2);

        const treasure = this.createImage('GeneratedTreasurePile', stage, 'generatedCoinPile', 700, 466, 0, -215);
        const heroKey = this.grid.flat().find((id) => SYMBOLS.includes(id)) ?? 'gemRed';
        const hero = this.createImage('WinningTreasure', stage, heroKey, 142, 142, 0, -64);
        tween(hero).repeatForever(tween().to(0.72, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' }).to(0.72, { scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
        for (let i = 0; i < 10; i += 1) {
            const sparkle = this.createImage(`WinSparkle_${i}`, stage, i % 3 === 0 ? 'jewel' : 'star', 18 + (i % 3) * 5, 18 + (i % 3) * 5, -292 + (i % 7) * 97, -120 + Math.floor(i / 7) * 360);
            const opacity = sparkle.addComponent(UIOpacity);
            opacity.opacity = 54 + (i % 4) * 28;
            if (!this.reducedMotion) tween(sparkle).delay(i * 0.08).repeatForever(tween().to(0.72, { scale: new Vec3(1.28, 1.28, 1), angle: 38 }).to(0.72, { scale: new Vec3(0.76, 0.76, 1), angle: 76 })).start();
        }

        stage.setScale(0.55, 0.55, 1);
        tween(stage).to(0.38, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        await this.wait(0.55);
        await Promise.all([
            this.flowCoinsToBalance(amount, overlay),
            this.animateBalance(this.balance, this.balance + amount, 1.55),
        ]);
        this.balance += amount;
        this.refreshHud();
        this.pulseBalance();
        await this.waitForCollect(stage);
        tween(stage).to(0.22, { scale: new Vec3(0.84, 0.84, 1) }, { easing: 'backIn' }).start();
        const fade = overlay.addComponent(UIOpacity);
        tween(fade).to(0.28, { opacity: 0 }).call(() => overlay.destroy()).start();
        await this.wait(0.3);
        this.resultLabel.string = `TOTAL WIN  +${this.formatNumber(amount)}`;
    }

    private waitForCollect(parent: Node): Promise<void> {
        const collect = this.createImage('CollectButton', parent, 'commercialCollect', 320, 110, 0, -456);
        const label = this.createLabel('COLLECT', collect, 25, Color.WHITE, 0, 8, 250, 40, true);
        this.styleLabel(label, new Color(34, 91, 61), 4, new Color(0, 0, 0, 120), 2, -2);
        const hint = this.createLabel('TAP TO CONTINUE', collect, 9, new Color(226, 255, 215), 0, -23, 220, 18, true);
        this.styleLabel(hint, new Color(27, 79, 53), 2);
        if (!this.reducedMotion) {
            tween(collect).repeatForever(tween().to(0.72, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' }).to(0.72, { scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
        }
        return new Promise((resolve) => {
            let settled = false;
            const finish = (): void => {
                if (settled) return;
                settled = true;
                this.playSound('click', 0.5);
                collect.destroy();
                resolve();
            };
            this.addButton(collect, finish);
            this.scheduleOnce(finish, this.reducedMotion ? 0.7 : 2.4);
        });
    }

    private async flowCoinsToBalance(_amount: number, parent: Node): Promise<void> {
        this.playSound('coins', 0.72);
        const tasks: Promise<void>[] = [];
        const coinCount = this.reducedMotion ? 18 : 48;
        for (let i = 0; i < coinCount; i += 1) {
            const coin = this.createImage(`FlyingCoin_${i}`, parent, 'coin', 32 + (i % 3) * 6, 32 + (i % 3) * 6, -260 + Math.random() * 520, -235 + Math.random() * 240);
            coin.angle = Math.random() * 90 - 45;
            const delay = i * 0.022;
            tasks.push(new Promise<void>((resolve) => {
                tween(coin)
                    .delay(delay)
                    .to(0.31, { position: new Vec3(-155 + Math.random() * 310, 160 + Math.random() * 90, 0), angle: coin.angle + 130 }, { easing: 'quadOut' })
                    .to(0.5, { position: new Vec3(-72, 449, 0), scale: new Vec3(0.24, 0.24, 1), angle: coin.angle + 300 }, { easing: 'quadIn' })
                    .call(() => { coin.destroy(); resolve(); })
                    .start();
            }));
        }
        await Promise.all(tasks);
    }

    private animateBalance(from: number, to: number, duration: number): Promise<void> {
        const holder = { value: from };
        return new Promise((resolve) => {
            tween(holder)
                .to(duration, { value: to }, {
                    easing: 'linear',
                    onUpdate: () => { this.balanceLabel.string = this.formatNumber(Math.floor(holder.value)); },
                })
                .call(resolve)
                .start();
        });
    }

    private showRules(): void {
        if (this.rulesOverlay) return;
        this.playSound('click', 0.65);
        const overlay = new Node('RulesOverlay');
        this.node.addChild(overlay);
        this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        overlay.addComponent(BlockInputEvents);
        this.createPanel('RulesShade', overlay, this.sceneWidth, this.sceneHeight, new Color(4, 7, 27, 228), 0, 0, 0);
        const panel = this.createImage('RulesPanel', overlay, 'generatedRulesFrame', 690, 1140, 0, -2);
        this.createImage('RulesArt', panel, 'commercialRules', 78, 78, -255, 368);
        const title = this.createLabel('HOW TO PLAY', panel, 32, Color.WHITE, 0, 368, 430, 54, true);
        this.styleLabel(title, new Color(84, 28, 105), 5, new Color(0, 0, 0, 140), 2, -3);
        const rulesSubtitle = this.createLabel('ARCANE TREASURES  •  CLUSTER PAYS', panel, 11, new Color(194, 226, 255), 0, 330, 440, 22, true);
        this.styleLabel(rulesSubtitle, new Color(35, 24, 72), 2);

        const close = this.createImage('CloseRules', panel, 'commercialPlus', 68, 68, 270, 466);
        close.angle = 45;
        this.addButton(close, () => this.closeRules());

        this.createSectionTitle(panel, '1  FORM A CLUSTER', 270);
        const intro = this.createLabel('Connect 5 or more matching treasures vertically or horizontally.\nThere are no paylines — every connected symbol counts.', panel, 16, new Color(221, 232, 255), 0, 218, 548, 76, true);
        intro.enableWrapText = true;
        this.styleLabel(intro, new Color(28, 25, 68), 2);

        this.createSectionTitle(panel, '2  SPECIAL TREASURES', 140);
        const specials = [
            { key: 'wild', title: 'WILD RUNE', copy: 'Joins any\nregular treasure' },
            { key: 'scatter', title: 'SCATTER RUNE', copy: 'Feature-ready\nspecial symbol' },
            { key: 'multiplier', title: 'CASCADE RUNE', copy: 'Raises every\nconsecutive win' },
        ];
        specials.forEach((item, index) => {
            const x = -184 + index * 184;
            this.createImage(`Special_${index}`, panel, item.key, 72, 72, x, 66);
            const name = this.createLabel(item.title, panel, 11, new Color(255, 220, 118), x, 15, 168, 25, true);
            this.styleLabel(name, new Color(53, 28, 79), 2);
            const copy = this.createLabel(item.copy, panel, 11, new Color(188, 210, 239), x, -34, 154, 42, false);
            copy.enableWrapText = true;
        });

        this.createSectionTitle(panel, '3  CLUSTER REWARDS', -84);
        const tableSymbols = ['shield', 'tome', 'potionRed', 'potionBlue', 'gemRed', 'gemBlue'];
        tableSymbols.forEach((symbol, index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = column === 0 ? -164 : 164;
            const y = -158 - row * 88;
            const rowPanel = this.createImage(`PayRow_${index}`, panel, 'panel', 276, 74, x, y, true, new Color(215, 196, 167));
            this.createImage('PaySymbol', rowPanel, symbol, 56, 56, -92, 0);
            const base = SYMBOL_VALUES[symbol];
            const pay = this.createLabel(`5+  ${base}×\n8+  ${base * 2}×`, rowPanel, 14, Color.WHITE, 34, 0, 146, 54, true);
            this.styleLabel(pay, new Color(68, 33, 71), 2);
        });

        this.createSectionTitle(panel, '4  CASCADE MULTIPLIER', -409);
        const trackCopy = this.createLabel('Winning symbols burst, new symbols fall, and the multiplier grows:', panel, 13, new Color(198, 217, 244), 0, -450, 550, 30, true);
        this.styleLabel(trackCopy, new Color(31, 26, 70), 1);
        ['1×', '2×', '3×', '5×'].forEach((text, index) => {
            const medal = this.createImage(`RuleMultiplier_${index}`, panel, index === 3 ? 'buttonRound' : 'buttonRoundDark', 54, 54, -174 + index * 116, -503, true);
            const label = this.createLabel(text, medal, 19, Color.WHITE, 0, 0, 50, 40, true);
            this.styleLabel(label, new Color(74, 32, 77), 2);
            if (index < 3) this.createLabel('›', panel, 25, new Color(255, 218, 104), -116 + index * 116, -503, 30, 40, true);
        });

        this.rulesOverlay = overlay;
        panel.setScale(0.86, 0.86, 1);
        tween(panel).to(0.26, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private createSectionTitle(parent: Node, text: string, y: number): void {
        this.createPanel(`${text}Line`, parent, 560, 2, new Color(255, 207, 96, 105), 0, y - 24, 1);
        const label = this.createLabel(text, parent, 18, new Color(255, 219, 112), 0, y, 560, 36, true);
        this.styleLabel(label, new Color(56, 27, 77), 2);
    }

    private closeRules(): void {
        if (!this.rulesOverlay) return;
        const overlay = this.rulesOverlay;
        this.rulesOverlay = null;
        this.playSound('click', 0.5);
        const opacity = overlay.addComponent(UIOpacity);
        tween(opacity).to(0.18, { opacity: 0 }).call(() => overlay.destroy()).start();
    }

    private showRecharge(): void {
        if (this.rechargeOverlay) return;
        const overlay = new Node('RechargeOverlay');
        this.node.addChild(overlay);
        this.ensureTransform(overlay, this.sceneWidth, this.sceneHeight);
        overlay.addComponent(BlockInputEvents);
        this.createPanel('RechargeShade', overlay, this.sceneWidth, this.sceneHeight, new Color(7, 8, 30, 214), 0, 0, 0);
        const panel = this.createImage('RechargePanel', overlay, 'generatedWinBanner', 660, 500, 0, 20);
        this.createImage('CoinHero', panel, 'generatedCoinPile', 310, 206, 0, 146);
        const title = this.createLabel('REFILL YOUR VAULT', panel, 29, new Color(255, 221, 105), 0, 52, 520, 50, true);
        this.styleLabel(title, new Color(75, 29, 91), 4);
        const copy = this.createLabel('Choose a coin pack to continue the adventure.', panel, 13, new Color(207, 228, 250), 0, 9, 500, 34, true);
        copy.enableWrapText = true;
        this.styleLabel(copy, new Color(29, 25, 67), 1);
        [500, 2000, 5000].forEach((value, index) => {
            const pack = this.createImage(`CoinPack_${value}`, panel, index === 1 ? 'commercialCollect' : 'commercialUtility', 184, 92, -194 + index * 194, -72);
            this.addButton(pack, () => this.addCoinPack(value));
            this.createImage('PackCoin', pack, 'coin', 38, 38, -57, 0);
            const packLabel = this.createLabel(`+${this.formatNumber(value)}`, pack, 17, Color.WHITE, 20, 0, 105, 34, true);
            this.styleLabel(packLabel, new Color(83, 34, 65), 2);
        });
        const cancel = this.createImage('CancelRecharge', panel, 'commercialUtility', 250, 78, 0, -166);
        this.addButton(cancel, () => this.closeRecharge());
        const cancelLabel = this.createLabel('NOT NOW', cancel, 16, Color.WHITE, 0, 0, 240, 36, true);
        this.styleLabel(cancelLabel, new Color(77, 38, 31), 2);
        this.rechargeOverlay = overlay;
        panel.setScale(0.72, 0.72, 1);
        tween(panel).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private addCoinPack(value: number): void {
        const from = this.balance;
        const to = this.balance + value;
        this.balance = to;
        void this.animateBalance(from, to, this.reducedMotion ? 0.25 : 0.72).then(() => this.pulseBalance());
        this.playSound('coins', 0.62);
        this.haptic([18, 18, 34]);
        this.closeRecharge();
    }

    private closeRecharge(): void {
        if (!this.rechargeOverlay) return;
        const overlay = this.rechargeOverlay;
        this.rechargeOverlay = null;
        const opacity = overlay.addComponent(UIOpacity);
        tween(opacity).to(0.18, { opacity: 0 }).call(() => overlay.destroy()).start();
    }

    private toggleAuto(): void {
        this.autoPlay = !this.autoPlay;
        this.autoLabel.string = this.autoPlay ? 'AUTO ON' : 'AUTO';
        this.autoButton.getComponent(Sprite)!.color = this.autoPlay ? new Color(220, 255, 226) : Color.WHITE;
        Tween.stopAllByTarget(this.autoButton);
        tween(this.autoButton).to(0.16, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }).start();
        this.playSound('click', 0.5);
        this.haptic(this.autoPlay ? [12, 18, 18] : 10);
        if (this.autoPlay && !this.spinning) void this.spin();
    }

    private toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        this.soundLabel.string = this.soundEnabled ? 'SOUND' : 'MUTED';
        this.soundButton.getComponent(Sprite)!.color = this.soundEnabled ? Color.WHITE : new Color(158, 166, 196);
        this.resultLabel.string = this.soundEnabled ? 'SOUND ON' : 'SOUND MUTED';
        Tween.stopAllByTarget(this.soundButton);
        tween(this.soundButton).to(0.14, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }).start();
        this.haptic(10);
        if (this.soundEnabled) this.playSound('click', 0.5);
    }

    private changeBet(direction: number): void {
        if (this.spinning) return;
        this.betIndex = (this.betIndex + direction + this.bets.length) % this.bets.length;
        this.refreshHud();
        Tween.stopAllByTarget(this.betLabel.node);
        this.betLabel.node.setScale(0.82, 0.82, 1);
        tween(this.betLabel.node).to(0.24, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' }).to(0.14, { scale: Vec3.ONE }).start();
        this.playSound('click', 0.45);
        this.haptic(9);
    }

    private onHome(): void {
        this.playSound('click', 0.5);
        if (sys.isBrowser && typeof window !== 'undefined') {
            window.location.href = window.location.origin;
        }
    }

    private setSpinEnabled(enabled: boolean): void {
        const button = this.spinButton.getComponent(Button);
        if (button) button.interactable = enabled;
        this.spinButton.getComponent(Sprite)!.color = enabled ? Color.WHITE : new Color(190, 195, 220);
    }

    private refreshHud(): void {
        if (this.balanceLabel) this.balanceLabel.string = this.formatNumber(this.balance);
        if (this.betLabel) this.betLabel.string = this.formatNumber(this.bets[this.betIndex]);
    }

    private setSpinStatus(title: string, detail: string): void {
        if (this.spinLabel) this.spinLabel.string = title;
        if (this.spinSubLabel) this.spinSubLabel.string = detail;
    }

    private animateSpinAura(active: boolean): void {
        if (!this.spinAura || this.reducedMotion) return;
        Tween.stopAllByTarget(this.spinAura);
        this.spinAura.setScale(active ? 1.08 : 1, active ? 1.08 : 1, 1);
        tween(this.spinAura)
            .repeatForever(tween().by(active ? 0.85 : 5.6, { angle: 360 }, { easing: 'linear' }))
            .start();
    }

    private pulseBalance(): void {
        if (!this.balanceBar || !this.balanceCoin) return;
        Tween.stopAllByTarget(this.balanceBar);
        tween(this.balanceBar).to(0.16, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'backOut' }).to(0.22, { scale: Vec3.ONE }).start();
        Tween.stopAllByTarget(this.balanceCoin);
        tween(this.balanceCoin).to(0.16, { scale: new Vec3(1.2, 1.2, 1), angle: 14 }, { easing: 'backOut' }).to(0.24, { scale: Vec3.ONE, angle: 0 }).start();
    }

    private haptic(pattern: number | number[]): void {
        if (this.reducedMotion || !sys.isBrowser || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
        navigator.vibrate(pattern);
    }

    private inspectSymbol(row: number, col: number): void {
        if (this.spinning || !this.grid[row]?.[col]) return;
        const symbol = this.grid[row][col];
        const name = SYMBOL_NAMES[symbol] ?? symbol.toUpperCase();
        const detail = symbol === 'wild'
            ? 'JOINS ANY REGULAR TREASURE'
            : symbol === 'scatter'
                ? 'SPECIAL FEATURE SYMBOL'
                : `5+ CLUSTER  •  BASE ${SYMBOL_VALUES[symbol] ?? 0}×`;
        this.resultLabel.string = `${name}  •  ${detail}`;
        this.showPremiumTooltip(name, detail);
        this.playSound('click', 0.38);
        this.haptic(12);
        const cell = this.cellNodes[row][col];
        Tween.stopAllByTarget(cell);
        tween(cell).to(0.12, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' }).to(0.18, { scale: Vec3.ONE }).start();
        for (let i = 0; i < 5; i += 1) {
            const sparkle = this.createImage(`InspectSparkle_${i}`, cell, i % 2 ? 'star' : 'jewel', 14, 14, 0, 0);
            const angle = (i * 72) * Math.PI / 180;
            const opacity = sparkle.addComponent(UIOpacity);
            tween(sparkle)
                .to(0.34, { position: new Vec3(Math.cos(angle) * 48, Math.sin(angle) * 40, 0), scale: new Vec3(0.45, 0.45, 1), angle: 70 }, { easing: 'quadOut' })
                .call(() => sparkle.destroy())
                .start();
            tween(opacity).delay(0.12).to(0.2, { opacity: 0 }).start();
        }
    }

    private showPremiumTooltip(titleText: string, detailText: string): void {
        const existing = this.effectLayer.getChildByName('PremiumTooltip');
        if (existing) existing.destroy();
        const root = this.createImage('PremiumTooltip', this.effectLayer, 'commercialTooltip', 510, 176, 0, 86);
        root.setScale(0.72, 0.72, 1);
        const title = this.createLabel(titleText, root, 20, new Color(255, 226, 118), 0, 24, 420, 34, true);
        this.styleLabel(title, new Color(56, 26, 83), 3, new Color(0, 0, 0, 110), 2, -2);
        const detail = this.createLabel(detailText, root, 12, new Color(213, 231, 255), 0, -18, 410, 34, true);
        this.styleLabel(detail, new Color(35, 25, 74), 2);
        const opacity = root.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(root).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).delay(1.18).to(0.18, { scale: new Vec3(0.9, 0.9, 1) }).call(() => root.destroy()).start();
        tween(opacity).to(0.16, { opacity: 255 }).delay(1.12).to(0.18, { opacity: 0 }).start();
    }

    private createAmbientSparkles(): void {
        const positions = [
            [-300, 410], [300, 350], [-325, 30], [326, -74], [-290, -250], [290, -300],
        ];
        positions.forEach(([x, y], index) => {
            const sparkle = this.createImage(`AmbientSparkle_${index}`, this.node, index % 3 === 0 ? 'jewel' : 'star', 14 + (index % 2) * 7, 14 + (index % 2) * 7, x, y);
            const opacity = sparkle.addComponent(UIOpacity);
            opacity.opacity = 50 + index * 11;
            if (this.reducedMotion) return;
            tween(sparkle)
                .delay(index * 0.17)
                .repeatForever(tween().to(1.1, { scale: new Vec3(1.38, 1.38, 1), angle: 36 }, { easing: 'sineInOut' }).to(1.1, { scale: new Vec3(0.72, 0.72, 1), angle: 72 }, { easing: 'sineInOut' }))
                .start();
            tween(opacity)
                .delay(index * 0.17)
                .repeatForever(tween().to(1.1, { opacity: 145 }, { easing: 'sineInOut' }).to(1.1, { opacity: 45 }, { easing: 'sineInOut' }))
                .start();
        });
    }

    private startAmbientMotion(): void {
        if (this.reducedMotion) return;
        this.startSymbolIdleMotion();
        tween(this.spinButton)
            .repeatForever(tween().to(0.9, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' }).to(0.9, { scale: Vec3.ONE }, { easing: 'sineInOut' }))
            .start();
    }

    private startSymbolIdleMotion(): void {
        if (this.reducedMotion) return;
        this.cellSprites.flat().forEach((sprite, index) => {
            const node = sprite.node;
            Tween.stopAllByTarget(node);
            node.setPosition(0, 1);
            node.setScale(1, 1, 1);
            node.angle = 0;
            const lift = 2.2 + (index % 4) * 0.65;
            const tilt = index % 2 === 0 ? 1.4 : -1.4;
            const duration = 1.05 + (index % 5) * 0.08;
            tween(node)
                .delay((index % 7) * 0.095)
                .repeatForever(tween()
                    .to(duration, { position: new Vec3(0, 1 + lift, 0), scale: new Vec3(1.045, 1.045, 1), angle: tilt }, { easing: 'sineInOut' })
                    .to(duration, { position: new Vec3(0, 1, 0), scale: Vec3.ONE, angle: -tilt * 0.55 }, { easing: 'sineInOut' }))
                .start();
        });
    }

    private playSound(key: string, volume = 1): void {
        if (!this.soundEnabled) return;
        const clip = this.audioMap.get(key);
        if (clip) this.audioSource.playOneShot(clip, volume);
    }

    private wait(seconds: number): Promise<void> {
        return new Promise((resolve) => this.scheduleOnce(resolve, seconds));
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
        const sourceAspect = 890 / 1334;
        const targetAspect = this.sceneWidth / this.sceneHeight;
        const width = targetAspect > sourceAspect ? this.sceneWidth : this.sceneHeight * sourceAspect;
        const height = targetAspect > sourceAspect ? this.sceneWidth / sourceAspect : this.sceneHeight;
        return this.createImage(name, parent, 'generatedBackground', width, height, 0, 0);
    }

    private createImage(
        name: string,
        parent: Node,
        frameKey: string,
        width: number,
        height: number,
        x: number,
        y: number,
        sliced = false,
        color = Color.WHITE,
    ): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = sliced ? Sprite.Type.SLICED : Sprite.Type.SIMPLE;
        sprite.trim = false;
        sprite.spriteFrame = this.resolveFrame(frameKey);
        sprite.color = color;
        return node;
    }

    private resolveFrame(frameKey: string): SpriteFrame | null {
        const fallbackKey = FRAME_FALLBACKS[frameKey];
        return this.frameMap.get(frameKey) ?? (fallbackKey ? this.frameMap.get(fallbackKey) : null) ?? null;
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

    private createLabel(
        text: string,
        parent: Node,
        size: number,
        color: Color,
        x: number,
        y: number,
        width: number,
        height: number,
        shrink = false,
    ): Label {
        const node = new Node(`Label_${text.slice(0, 18)}`);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        const displayCopy = size >= 24 && text === text.toUpperCase() && text.length <= 18 && !text.includes('\n');
        const selectedFont = displayCopy ? this.displayFont : this.bodyFont;
        if (selectedFont) label.font = selectedFont;
        label.lineHeight = Math.round(size * (displayCopy ? 1.12 : 1.28));
        label.spacingX = displayCopy ? Math.min(1.6, size * 0.04) : Math.min(0.7, size * 0.015);
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

    private addButton(node: Node, action: () => void): void {
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.94;
        node.on(Button.EventType.CLICK, action, this);
    }
}
