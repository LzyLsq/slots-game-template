import {
    _decorator,
    AudioClip,
    AudioSource,
    BlockInputEvents,
    Button,
    Color,
    Component,
    Graphics,
    Label,
    LabelOutline,
    LabelShadow,
    Node,
    ResolutionPolicy,
    resources,
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
};

const FRAMES: Record<string, string> = {
    generatedBackground: 'fantasy/generated/arcane-background',
    generatedLogo: 'fantasy/generated/arcane-logo',
    generatedBoardFrame: 'fantasy/generated/arcane-board-frame',
    generatedWinBanner: 'fantasy/generated/arcane-win-banner',
    generatedCoinPile: 'fantasy/generated/arcane-coin-pile',
    generatedControlConsole: 'fantasy/generated/arcane-control-console',
    generatedRulesFrame: 'fantasy/generated/arcane-rules-frame',
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
    private readonly bets = [10, 20, 50, 100];
    private frameMap = new Map<string, SpriteFrame>();
    private audioMap = new Map<string, AudioClip>();
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
    private autoLabel!: Label;
    private rulesOverlay: Node | null = null;
    private rechargeOverlay: Node | null = null;
    private balance = 2500;
    private betIndex = 1;
    private spinning = false;
    private autoPlay = false;
    private soundEnabled = true;
    private spinCount = 0;
    private reducedMotion = false;

    protected async start(): Promise<void> {
        view.resizeWithBrowserSize(true);
        view.setDesignResolutionSize(this.designWidth, this.designHeight, ResolutionPolicy.SHOW_ALL);
        this.reducedMotion = sys.isBrowser
            && typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.ensureTransform(this.node, this.designWidth, this.designHeight);
        this.audioSource = this.node.getComponent(AudioSource) ?? this.node.addComponent(AudioSource);
        this.buildBootScreen();
        await this.loadAssets();
        await this.playLoadingScreen();
        this.buildInterface();
        this.grid = this.createRandomGrid();
        this.renderGrid(false);
        this.refreshHud();
        this.startAmbientMotion();
    }

    private buildBootScreen(): void {
        this.clearCanvas();
        this.createPanel('BootBackdrop', this.node, 750, 1334, new Color(13, 18, 52), 0, 0, 0);
        const label = this.createLabel('OPENING THE ARCANE VAULT', this.node, 24, new Color(200, 225, 255), 0, 0, 610, 48, true);
        this.styleLabel(label, new Color(18, 16, 46), 3, new Color(0, 0, 0, 120), 2, -3);
    }

    private async loadAssets(): Promise<void> {
        await Promise.all(Object.entries(FRAMES).map(async ([key, path]) => {
            const frame = await this.loadResource(`${path}/spriteFrame`, SpriteFrame);
            if (frame) this.frameMap.set(key, frame);
        }));
        await Promise.all(Object.entries(AUDIO).map(async ([key, path]) => {
            const clip = await this.loadResource(path, AudioClip);
            if (clip) this.audioMap.set(key, clip);
        }));
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
        this.createImage('LoadingBackground', this.node, 'generatedBackground', 890, 1334, 0, 0);
        this.createPanel('LoadingTopShade', this.node, 750, 380, new Color(8, 10, 37, 76), 0, 475, 0);
        this.createPanel('LoadingBottomShade', this.node, 750, 440, new Color(6, 8, 30, 128), 0, -472, 0);

        const logo = this.createImage('LoadingLogo', this.node, 'generatedLogo', 590, 340, 0, 294);
        logo.setScale(0.88, 0.88, 1);
        tween(logo).to(0.62, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        const treasure = this.createImage('LoadingTreasure', this.node, 'generatedCoinPile', 500, 334, 0, -20);
        tween(treasure)
            .repeatForever(tween().to(1.3, { position: new Vec3(0, -10, 0) }, { easing: 'sineInOut' }).to(1.3, { position: new Vec3(0, -20, 0) }, { easing: 'sineInOut' }))
            .start();
        const loadingCopy = this.createLabel('OPENING THE ARCANE VAULT', this.node, 18, new Color(211, 232, 255), 0, -235, 520, 36, true);
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

        const holder = { value: 0 };
        await new Promise<void>((resolve) => {
            tween(holder)
                .to(this.reducedMotion ? 0.45 : 1.65, { value: 1 }, {
                    easing: 'quadOut',
                    onUpdate: () => {
                        const progress = Math.max(0.01, holder.value);
                        fill.getComponent(UITransform)!.setContentSize(470 * progress, 24);
                        progressText.string = `${Math.floor(progress * 100)}%`;
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

        const background = this.createImage('Background', this.node, 'generatedBackground', 890, 1334, 0, 0);
        background.setSiblingIndex(0);
        this.createPanel('SkyTint', this.node, 750, 1334, new Color(9, 12, 43, 26), 0, 0, 0);
        this.createPanel('BottomVignette', this.node, 750, 440, new Color(6, 8, 30, 116), 0, -447, 0);
        this.createAmbientSparkles();

        this.createHomeButton();
        this.createTitleBlock();
        this.createBalanceBar();
        this.createBoard();
        this.createMultiplierTrack();
        this.createBottomControls();

        this.effectLayer = new Node('GlobalEffects');
        this.node.addChild(this.effectLayer);
        this.ensureTransform(this.effectLayer, 750, 1334);
    }

    private createHomeButton(): void {
        const button = this.createImage('HomeButton', this.node, 'buttonRoundDark', 82, 82, -320, 586, true);
        this.addButton(button, () => this.onHome());
        this.createImage('HomeArt', button, 'home', 57, 57, 0, 3);
        this.createImage('HomeStar', button, 'star', 14, 14, 23, 25);
    }

    private createTitleBlock(): void {
        const logo = this.createImage('TitleLogo', this.node, 'generatedLogo', 402, 210, 0, 559);
        const subtitle = this.createLabel('6×5  •  CLUSTER PAYS  •  CASCADE', this.node, 12, new Color(202, 230, 255), 0, 466, 370, 24, true);
        this.styleLabel(subtitle, new Color(38, 24, 75), 2, new Color(0, 0, 0, 110), 1, -2);
        tween(logo).repeatForever(tween().to(1.8, { scale: new Vec3(1.018, 1.018, 1) }, { easing: 'sineInOut' }).to(1.8, { scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
    }

    private createBalanceBar(): void {
        const bar = this.createImage('BalanceBar', this.node, 'panel', 430, 74, 0, 449, true, new Color(225, 197, 157));
        this.createImage('BalanceBorder', bar, 'panelBorder', 422, 72, 0, 0, true, new Color(255, 223, 125));
        this.createImage('CoinIcon', bar, 'coin', 60, 60, -166, 1);
        this.createLabel('BALANCE', bar, 11, new Color(255, 226, 140), -44, 18, 200, 22, true);
        this.balanceLabel = this.createLabel('2,500', bar, 28, Color.WHITE, -44, -10, 230, 42, true);
        this.styleLabel(this.balanceLabel, new Color(68, 31, 75), 3, new Color(0, 0, 0, 125), 2, -2);
        const plus = this.createImage('RechargeButton', bar, 'buttonRound', 58, 58, 171, 0, true);
        this.addButton(plus, () => this.showRecharge());
        const plusText = this.createLabel('+', plus, 32, Color.WHITE, 0, 1, 50, 46, true);
        this.styleLabel(plusText, new Color(96, 45, 26), 3);
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

        const xs = [-250, -150, -50, 50, 150, 250];
        const ys = [168, 84, 0, -84, -168];
        for (let row = 0; row < ROWS; row += 1) {
            const nodeRow: Node[] = [];
            const spriteRow: Sprite[] = [];
            for (let col = 0; col < COLS; col += 1) {
                const cell = new Node(`Cell_${row}_${col}`);
                this.boardInner.addChild(cell);
                cell.setPosition(xs[col], ys[row]);
                this.ensureTransform(cell, 94, 80);
                this.createPanel('CellDepth', cell, 91, 77, new Color(5, 14, 44, 226), 0, -1, 13);
                this.createImage('CellFrame', cell, 'panelBorder', 93, 79, 0, 0, true, new Color(112, 171, 224, 158));
                const halo = this.createPanel('CellHalo', cell, 72, 64, new Color(46, 103, 174, 38), 0, 0, 22);
                halo.setSiblingIndex(1);
                const symbolNode = this.createImage('Symbol', cell, 'gemBlue', 72, 72, 0, 1);
                const sprite = symbolNode.getComponent(Sprite)!;
                this.addButton(cell, () => this.inspectSymbol(row, col));
                nodeRow.push(cell);
                spriteRow.push(sprite);
            }
            this.cellNodes.push(nodeRow);
            this.cellSprites.push(spriteRow);
        }
        this.createImage('GeneratedBoardFrame', board, 'generatedBoardFrame', 704, 520, 0, 0);
    }

    private createMultiplierTrack(): void {
        const track = this.createImage('MultiplierTrack', this.node, 'panelDark', 610, 66, 0, -226, true, new Color(215, 218, 250));
        this.createImage('TrackBorder', track, 'panelBorder', 604, 62, 0, 0, true, new Color(255, 210, 102));
        this.createImage('MultiplierRune', track, 'multiplier', 47, 47, -266, 0);
        const values = ['1×', '2×', '3×', '5×'];
        values.forEach((text, index) => {
            const x = -154 + index * 104;
            const medallion = this.createImage(`Multiplier_${index}`, track, index === 0 ? 'buttonRound' : 'buttonRoundDark', 48, 48, x, 0, true);
            this.addButton(medallion, () => this.previewMultiplier(index));
            const label = this.createLabel(text, medallion, 18, index === 0 ? Color.WHITE : new Color(174, 191, 223), 0, 0, 44, 36, true);
            this.styleLabel(label, new Color(67, 31, 83), 2);
        });
        this.multiplierLabel = this.createLabel('CASCADE 1×', track, 14, new Color(255, 224, 123), 247, 0, 126, 34, true);
        this.styleLabel(this.multiplierLabel, new Color(63, 29, 76), 2);
    }

    private createBottomControls(): void {
        this.createImage('GeneratedControlConsole', this.node, 'generatedControlConsole', 720, 340, 0, -436);
        const resultPlate = this.createImage('ResultPlate', this.node, 'panelDark', 568, 72, 0, -308, true, new Color(210, 214, 245));
        this.createImage('ResultBorder', resultPlate, 'panelBorder', 562, 68, 0, 0, true, new Color(255, 210, 100));
        this.resultLabel = this.createLabel('GROUP 5+ MATCHING TREASURES TO WIN', resultPlate, 16, new Color(211, 231, 255), 0, 0, 530, 40, true);
        this.styleLabel(this.resultLabel, new Color(35, 26, 74), 2);

        const betPanel = this.createImage('BetPanel', this.node, 'panel', 270, 86, -205, -418, true, new Color(231, 202, 147));
        this.createLabel('BET', betPanel, 11, new Color(255, 224, 132), 0, 24, 90, 22, true);
        this.betLabel = this.createLabel('20', betPanel, 28, Color.WHITE, 0, -8, 100, 38, true);
        this.styleLabel(this.betLabel, new Color(73, 32, 74), 3);
        const minus = this.createImage('BetMinus', betPanel, 'buttonRoundDark', 58, 58, -91, 0, true);
        const plus = this.createImage('BetPlus', betPanel, 'buttonRoundDark', 58, 58, 91, 0, true);
        this.addButton(minus, () => this.changeBet(-1));
        this.addButton(plus, () => this.changeBet(1));
        this.createLabel('−', minus, 27, Color.WHITE, 0, 1, 45, 40, true);
        this.createLabel('+', plus, 27, Color.WHITE, 0, 1, 45, 40, true);

        this.spinButton = this.createImage('SpinButton', this.node, 'buttonPrimary', 262, 110, 148, -418, true);
        this.addButton(this.spinButton, () => void this.spin());
        this.createImage('SpinWand', this.spinButton, 'wand', 70, 70, -82, 4);
        const spinLabel = this.createLabel('SPIN', this.spinButton, 34, Color.WHITE, 32, 9, 145, 48, true);
        this.styleLabel(spinLabel, new Color(111, 32, 33), 4, new Color(0, 0, 0, 130), 2, -3);
        const spinSub = this.createLabel('DROP & CASCADE', this.spinButton, 10, new Color(255, 226, 187), 32, -27, 150, 20, true);
        this.styleLabel(spinSub, new Color(111, 32, 33), 1);

        const utility = this.createImage('UtilityBar', this.node, 'panelDark', 610, 72, 0, -535, true, new Color(205, 212, 245));
        this.createUtilityButton(utility, -200, 'SOUND', () => this.toggleSound());
        this.createUtilityButton(utility, 0, 'RULES', () => this.showRules());
        const auto = this.createUtilityButton(utility, 200, 'AUTO', () => this.toggleAuto());
        this.autoLabel = auto.getComponentInChildren(Label)!;
        const footer = this.createLabel('CLUSTER PAYS  •  NO PAYLINES  •  WINNING SYMBOLS CASCADE', this.node, 11, new Color(169, 197, 235), 0, -606, 700, 26, true);
        this.styleLabel(footer, new Color(19, 18, 49), 1);
    }

    private createUtilityButton(parent: Node, x: number, text: string, action: () => void): Node {
        const button = this.createImage(`${text}Button`, parent, 'buttonSecondary', 174, 52, x, 0, true);
        this.addButton(button, action);
        const label = this.createLabel(text, button, 16, Color.WHITE, 0, 0, 160, 34, true);
        this.styleLabel(label, new Color(80, 39, 29), 2);
        return button;
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
                symbolNode.setPosition(0, animateDrop ? 260 + row * 28 : 1);
                const opacity = symbolNode.getComponent(UIOpacity) ?? symbolNode.addComponent(UIOpacity);
                opacity.opacity = 255;
                if (animateDrop) {
                    tween(symbolNode)
                        .delay(col * 0.035 + row * 0.018)
                        .to(0.42, { position: new Vec3(0, 1, 0) }, { easing: 'backOut' })
                        .start();
                }
            }
        }
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
        this.multiplierLabel.string = 'CASCADE 1×';
        this.playSound('spin', 0.7);
        tween(this.spinButton).to(0.12, { scale: new Vec3(0.95, 0.95, 1) }).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();

        this.grid = this.createRandomGrid();
        this.forceShowcaseCluster();
        this.renderGrid(true);
        await this.wait(0.56);
        this.playSound('drop', 0.7);
        await this.runCascades(bet);
        this.spinning = false;
        this.setSpinEnabled(true);
        if (this.autoPlay) this.scheduleOnce(() => void this.spin(), 0.85);
    }

    private forceShowcaseCluster(): void {
        const premium = ['gemRed', 'potionRed', 'tome', 'shield'][this.spinCount % 4];
        const shape: Cell[] = [
            { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 },
            { row: 2, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 2 },
        ];
        shape.forEach(({ row, col }) => { this.grid[row][col] = premium; });
    }

    private async runCascades(bet: number): Promise<void> {
        let cascade = 0;
        let totalWin = 0;
        while (cascade < MULTIPLIERS.length) {
            const clusters = this.findClusters();
            if (clusters.length === 0) break;
            const multiplier = MULTIPLIERS[cascade];
            this.setMultiplierState(cascade);
            const winningCells = this.uniqueCells(clusters.flatMap((cluster) => cluster.cells));
            const cascadeWin = clusters.reduce((sum, cluster) => {
                const base = SYMBOL_VALUES[cluster.symbol] ?? 5;
                const sizeFactor = 1 + Math.max(0, cluster.cells.length - MIN_CLUSTER) * 0.32;
                return sum + Math.floor(base * sizeFactor * bet * multiplier * 0.55);
            }, 0);
            totalWin += cascadeWin;
            this.resultLabel.string = `${winningCells.length} TREASURES  •  +${this.formatNumber(cascadeWin)}  •  ${multiplier}×`;
            await this.highlightClusters(winningCells, multiplier);
            await this.explodeCells(winningCells);
            cascade += 1;
            await this.collapseGrid(winningCells, cascade);
        }

        if (totalWin > 0) {
            await this.showWinCelebration(totalWin, cascade);
        } else {
            this.resultLabel.string = 'NO CLUSTER — TRY ANOTHER DROP';
            this.multiplierLabel.string = 'CASCADE 1×';
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
        cells.forEach((cell, index) => {
            const node = this.cellSprites[cell.row][cell.col].node;
            tween(node)
                .delay(index * 0.018)
                .to(0.16, { scale: new Vec3(1.24, 1.24, 1) }, { easing: 'backOut' })
                .to(0.18, { scale: new Vec3(1.08, 1.08, 1) })
                .start();
            const rune = this.createImage('ClusterRune', this.cellNodes[cell.row][cell.col], 'multiplier', 54, 54, 0, 0, false, new Color(120, 211, 255, 145));
            rune.setSiblingIndex(2);
            const opacity = rune.addComponent(UIOpacity);
            opacity.opacity = 150;
            rune.setScale(0.3, 0.3, 1);
            tween(rune).to(0.3, { scale: new Vec3(1.65, 1.65, 1), angle: 35 }).to(0.2, { scale: new Vec3(2.1, 2.1, 1) }).call(() => rune.destroy()).start();
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
        this.ensureTransform(root, 430, 125);
        this.createImage('CalloutBanner', root, 'banner', 430, 104, 0, 0, true);
        const title = this.createLabel(titleText, root, 25, Color.WHITE, 0, 13, 390, 42, true);
        this.styleLabel(title, new Color(117, 32, 49), 4, new Color(0, 0, 0, 120), 2, -2);
        const subtitle = this.createLabel(subtitleText, root, 13, new Color(255, 232, 159), 0, -25, 360, 25, true);
        this.styleLabel(subtitle, new Color(111, 31, 45), 2);
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

        if (cascade === 1 && this.spinCount % 2 === 1) {
            const symbol = ['gemBlue', 'potionGreen', 'shield'][this.spinCount % 3];
            [{ row: 0, col: 3 }, { row: 0, col: 4 }, { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 2, col: 4 }]
                .forEach((cell) => { this.grid[cell.row][cell.col] = symbol; });
        }

        this.renderGrid(true);
        await this.wait(0.5);
        this.playSound('drop', 0.58);
    }

    private setMultiplierState(index: number): void {
        const multiplier = MULTIPLIERS[Math.min(index, MULTIPLIERS.length - 1)];
        this.multiplierLabel.string = `CASCADE ${multiplier}×`;
        const track = this.node.getChildByName('MultiplierTrack');
        if (!track) return;
        MULTIPLIERS.forEach((_, itemIndex) => {
            const medal = track.getChildByName(`Multiplier_${itemIndex}`);
            if (!medal) return;
            medal.getComponent(Sprite)!.spriteFrame = this.frameMap.get(itemIndex <= index ? 'buttonRound' : 'buttonRoundDark') ?? null;
            tween(medal).to(0.18, { scale: itemIndex === index ? new Vec3(1.16, 1.16, 1) : Vec3.ONE }, { easing: 'backOut' }).start();
        });
    }

    private async showWinCelebration(amount: number, cascades: number): Promise<void> {
        this.playSound('win', 0.76);
        const overlay = new Node('WinOverlay');
        this.node.addChild(overlay);
        this.ensureTransform(overlay, 750, 1334);
        overlay.addComponent(BlockInputEvents);
        this.createPanel('WinShade', overlay, 750, 1334, new Color(5, 7, 27, 198), 0, 0, 0);

        const stage = new Node('PremiumWinStage');
        overlay.addChild(stage);
        this.ensureTransform(stage, 750, 1000);
        stage.setPosition(0, 10);
        const banner = this.createImage('GeneratedWinBanner', stage, 'generatedWinBanner', 700, 466, 0, 160);
        const title = this.createLabel(cascades > 2 ? 'LEGENDARY CASCADE!' : 'TREASURE BURST!', banner, 39, Color.WHITE, 0, 86, 570, 64, true);
        this.styleLabel(title, new Color(96, 30, 114), 5, new Color(0, 0, 0, 150), 3, -4);
        const chainCopy = this.createLabel(`${cascades} CASCADE${cascades === 1 ? '' : 'S'} COMPLETED`, banner, 14, new Color(200, 229, 255), 0, 37, 500, 28, true);
        this.styleLabel(chainCopy, new Color(43, 25, 79), 2);
        const winLabel = this.createLabel(`+${this.formatNumber(amount)}`, banner, 56, new Color(255, 223, 93), 0, -26, 560, 82, true);
        this.styleLabel(winLabel, new Color(80, 27, 100), 6, new Color(0, 0, 0, 155), 3, -4);
        const wonCopy = this.createLabel('COINS WON', banner, 16, new Color(202, 229, 255), 0, -83, 320, 32, true);
        this.styleLabel(wonCopy, new Color(42, 25, 78), 2);

        const treasure = this.createImage('GeneratedTreasurePile', stage, 'generatedCoinPile', 700, 466, 0, -215);
        const heroKey = this.grid.flat().find((id) => SYMBOLS.includes(id)) ?? 'gemRed';
        const hero = this.createImage('WinningTreasure', stage, heroKey, 142, 142, 0, -64);
        tween(hero).repeatForever(tween().to(0.72, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' }).to(0.72, { scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
        for (let i = 0; i < 14; i += 1) {
            const sparkle = this.createImage(`WinSparkle_${i}`, stage, i % 3 === 0 ? 'jewel' : 'star', 18 + (i % 3) * 5, 18 + (i % 3) * 5, -292 + (i % 7) * 97, -120 + Math.floor(i / 7) * 360);
            const opacity = sparkle.addComponent(UIOpacity);
            opacity.opacity = 70 + (i % 4) * 36;
            tween(sparkle).delay(i * 0.06).repeatForever(tween().to(0.48, { scale: new Vec3(1.35, 1.35, 1), angle: 45 }).to(0.48, { scale: new Vec3(0.72, 0.72, 1), angle: 90 })).start();
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
        await this.waitForCollect(stage);
        tween(stage).to(0.22, { scale: new Vec3(0.84, 0.84, 1) }, { easing: 'backIn' }).start();
        const fade = overlay.addComponent(UIOpacity);
        tween(fade).to(0.28, { opacity: 0 }).call(() => overlay.destroy()).start();
        await this.wait(0.3);
        this.resultLabel.string = `TOTAL WIN  +${this.formatNumber(amount)}`;
    }

    private waitForCollect(parent: Node): Promise<void> {
        const collect = this.createImage('CollectButton', parent, 'buttonPrimary', 280, 78, 0, -472, true);
        const label = this.createLabel('COLLECT', collect, 25, Color.WHITE, 0, 7, 240, 40, true);
        this.styleLabel(label, new Color(104, 31, 45), 3, new Color(0, 0, 0, 120), 2, -2);
        const hint = this.createLabel('TAP TO CONTINUE', collect, 9, new Color(255, 226, 184), 0, -22, 220, 18, true);
        this.styleLabel(hint, new Color(104, 31, 45), 1);
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
        this.ensureTransform(overlay, 750, 1334);
        overlay.addComponent(BlockInputEvents);
        this.createPanel('RulesShade', overlay, 750, 1334, new Color(4, 7, 27, 228), 0, 0, 0);
        const panel = this.createImage('RulesPanel', overlay, 'generatedRulesFrame', 690, 1140, 0, -2);
        const title = this.createLabel('HOW TO PLAY', panel, 36, Color.WHITE, 0, 447, 500, 58, true);
        this.styleLabel(title, new Color(84, 28, 105), 5, new Color(0, 0, 0, 140), 2, -3);
        const rulesSubtitle = this.createLabel('ARCANE TREASURES  •  CLUSTER PAYS', panel, 12, new Color(194, 226, 255), 0, 406, 480, 24, true);
        this.styleLabel(rulesSubtitle, new Color(35, 24, 72), 2);

        const close = this.createImage('CloseRules', panel, 'close', 58, 58, 278, 486, true);
        this.addButton(close, () => this.closeRules());

        this.createSectionTitle(panel, '1  FORM A CLUSTER', 346);
        const intro = this.createLabel('Connect 5 or more matching treasures vertically or horizontally.\nThere are no paylines — every connected symbol counts.', panel, 16, new Color(221, 232, 255), 0, 294, 548, 76, true);
        intro.enableWrapText = true;
        this.styleLabel(intro, new Color(28, 25, 68), 2);

        this.createSectionTitle(panel, '2  SPECIAL TREASURES', 216);
        const specials = [
            { key: 'wild', title: 'WILD RUNE', copy: 'Joins any regular treasure' },
            { key: 'scatter', title: 'SCATTER RUNE', copy: 'Feature-ready special symbol' },
            { key: 'multiplier', title: 'CASCADE RUNE', copy: 'Raises each consecutive win' },
        ];
        specials.forEach((item, index) => {
            const x = -200 + index * 200;
            this.createImage(`Special_${index}`, panel, item.key, 72, 72, x, 142);
            const name = this.createLabel(item.title, panel, 12, new Color(255, 220, 118), x, 92, 184, 26, true);
            this.styleLabel(name, new Color(53, 28, 79), 2);
            const copy = this.createLabel(item.copy, panel, 11, new Color(188, 210, 239), x, 59, 176, 40, true);
            copy.enableWrapText = true;
        });

        this.createSectionTitle(panel, '3  CLUSTER REWARDS', -8);
        const tableSymbols = ['shield', 'tome', 'potionRed', 'potionBlue', 'gemRed', 'gemBlue'];
        tableSymbols.forEach((symbol, index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = column === 0 ? -164 : 164;
            const y = -82 - row * 88;
            const rowPanel = this.createImage(`PayRow_${index}`, panel, 'panel', 276, 74, x, y, true, new Color(215, 196, 167));
            this.createImage('PaySymbol', rowPanel, symbol, 56, 56, -92, 0);
            const base = SYMBOL_VALUES[symbol];
            const pay = this.createLabel(`5+  ${base}×\n8+  ${base * 2}×`, rowPanel, 14, Color.WHITE, 34, 0, 146, 54, true);
            this.styleLabel(pay, new Color(68, 33, 71), 2);
        });

        this.createSectionTitle(panel, '4  CASCADE MULTIPLIER', -357);
        const trackCopy = this.createLabel('Winning symbols burst, new symbols fall, and the multiplier grows:', panel, 13, new Color(198, 217, 244), 0, -400, 550, 30, true);
        this.styleLabel(trackCopy, new Color(31, 26, 70), 1);
        ['1×', '2×', '3×', '5×'].forEach((text, index) => {
            const medal = this.createImage(`RuleMultiplier_${index}`, panel, index === 3 ? 'buttonRound' : 'buttonRoundDark', 54, 54, -174 + index * 116, -453, true);
            const label = this.createLabel(text, medal, 19, Color.WHITE, 0, 0, 50, 40, true);
            this.styleLabel(label, new Color(74, 32, 77), 2);
            if (index < 3) this.createLabel('›', panel, 25, new Color(255, 218, 104), -116 + index * 116, -453, 30, 40, true);
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
        this.ensureTransform(overlay, 750, 1334);
        overlay.addComponent(BlockInputEvents);
        this.createPanel('RechargeShade', overlay, 750, 1334, new Color(7, 8, 30, 214), 0, 0, 0);
        const panel = this.createImage('RechargePanel', overlay, 'generatedWinBanner', 660, 500, 0, 20);
        this.createImage('CoinHero', panel, 'generatedCoinPile', 310, 206, 0, 146);
        const title = this.createLabel('REFILL YOUR VAULT', panel, 29, new Color(255, 221, 105), 0, 52, 520, 50, true);
        this.styleLabel(title, new Color(75, 29, 91), 4);
        const copy = this.createLabel('Choose a coin pack to continue the adventure.', panel, 13, new Color(207, 228, 250), 0, 9, 500, 34, true);
        copy.enableWrapText = true;
        this.styleLabel(copy, new Color(29, 25, 67), 1);
        [500, 2000, 5000].forEach((value, index) => {
            const pack = this.createImage(`CoinPack_${value}`, panel, index === 1 ? 'buttonPrimary' : 'buttonSecondary', 178, 82, -194 + index * 194, -72, true);
            this.addButton(pack, () => this.addCoinPack(value));
            this.createImage('PackCoin', pack, 'coin', 38, 38, -57, 0);
            const packLabel = this.createLabel(`+${this.formatNumber(value)}`, pack, 17, Color.WHITE, 20, 0, 105, 34, true);
            this.styleLabel(packLabel, new Color(83, 34, 65), 2);
        });
        const cancel = this.createImage('CancelRecharge', panel, 'buttonSecondary', 250, 60, 0, -166, true);
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
        void this.animateBalance(from, to, this.reducedMotion ? 0.25 : 0.72);
        this.playSound('coins', 0.62);
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
        this.playSound('click', 0.5);
        if (this.autoPlay && !this.spinning) void this.spin();
    }

    private toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        this.resultLabel.string = this.soundEnabled ? 'SOUND ON' : 'SOUND MUTED';
        if (this.soundEnabled) this.playSound('click', 0.5);
    }

    private changeBet(direction: number): void {
        if (this.spinning) return;
        this.betIndex = (this.betIndex + direction + this.bets.length) % this.bets.length;
        this.refreshHud();
        this.playSound('click', 0.45);
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
    }

    private refreshHud(): void {
        if (this.balanceLabel) this.balanceLabel.string = this.formatNumber(this.balance);
        if (this.betLabel) this.betLabel.string = this.formatNumber(this.bets[this.betIndex]);
    }

    private inspectSymbol(row: number, col: number): void {
        if (this.spinning || !this.grid[row]?.[col]) return;
        const symbol = this.grid[row][col];
        const name = SYMBOL_NAMES[symbol] ?? symbol.toUpperCase();
        const copy = symbol === 'wild'
            ? `${name}  •  JOINS ANY REGULAR TREASURE`
            : symbol === 'scatter'
                ? `${name}  •  SPECIAL FEATURE SYMBOL`
                : `${name}  •  5+ CLUSTER  •  BASE ${SYMBOL_VALUES[symbol] ?? 0}×`;
        this.resultLabel.string = copy;
        this.playSound('click', 0.38);
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

    private previewMultiplier(index: number): void {
        if (this.spinning) return;
        const multiplier = MULTIPLIERS[index];
        this.resultLabel.string = index === 0
            ? 'FIRST CLUSTER STARTS AT 1×'
            : `CASCADE ${index + 1} BOOSTS EVERY CLUSTER TO ${multiplier}×`;
        this.playSound('click', 0.4);
        const medal = this.node.getChildByName('MultiplierTrack')?.getChildByName(`Multiplier_${index}`);
        if (!medal) return;
        Tween.stopAllByTarget(medal);
        tween(medal).to(0.14, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'backOut' }).to(0.2, { scale: Vec3.ONE }).start();
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
        this.cellSprites.flat().forEach((sprite, index) => {
            tween(sprite.node)
                .delay((index % 7) * 0.12)
                .repeatForever(tween().to(1.25, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' }).to(1.25, { scale: Vec3.ONE }, { easing: 'sineInOut' }))
                .start();
        });
        tween(this.spinButton)
            .repeatForever(tween().to(0.9, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' }).to(0.9, { scale: Vec3.ONE }, { easing: 'sineInOut' }))
            .start();
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
        label.lineHeight = Math.round(size * 1.25);
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
