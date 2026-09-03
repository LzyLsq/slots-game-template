import {
    _decorator,
    AudioClip,
    AudioSource,
    BlockInputEvents,
    Button,
    Camera,
    Color,
    Component,
    Graphics,
    JsonAsset,
    Label,
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
import { FALLBACK_CATALOG, FALLBACK_CONFIG, GameConfig, SymbolConfig, ThemeCatalog } from './GameConfig';
import { ClusterWin, PayoutCalculator } from './PayoutCalculator';

const { ccclass } = _decorator;

type GameState =
    | { kind: 'idle' }
    | { kind: 'spinning' }
    | { kind: 'evaluating'; cascade: number }
    | { kind: 'presenting'; skippable: boolean };

@ccclass('SlotGame')
export class SlotGame extends Component {
    private readonly designWidth = 750;
    private readonly designHeight = 1624;
    private readonly cellWidth = 98;
    private readonly cellHeight = 96;
    private readonly soundKey = 's09-aurum-forge-sound';
    private readonly balanceKey = 's09-aurum-forge-balance';
    private readonly f1AccountsKey = 'l02-royal-wealth-accounts-v1';
    private readonly f1SessionKey = 'l02-royal-wealth-session-v1';
    private config: GameConfig = FALLBACK_CONFIG;
    private sceneWidth = 750;
    private sceneHeight = 1624;
    private state: GameState = { kind: 'idle' };
    private frames = new Map<string, SpriteFrame>();
    private cells: Sprite[][] = [];
    private cellBacks: Graphics[][] = [];
    private reels: Node[] = [];
    private grid: SymbolConfig[][] = [];
    private balance = 5000;
    private betIndex = 1;
    private forgeEnergy = 0;
    private freeSpins = 0;
    private autoEnabled = false;
    private soundEnabled = true;
    private coinLabel!: Label;
    private betLabel!: Label;
    private resultLabel!: Label;
    private energyLabel!: Label;
    private energyFill!: Node;
    private chainLabel!: Label;
    private freeLabel!: Label;
    private machineUi!: Node;
    private machineScale = 1;
    private spinButton!: Node;
    private autoButton!: Node;
    private autoLabel!: Label;
    private reelPanel!: Node;
    private fxLayer!: Node;
    private modal: Node | null = null;
    private audioSource!: AudioSource;
    private spinClip: AudioClip | null = null;
    private winClip: AudioClip | null = null;
    private coinClip: AudioClip | null = null;
    private animationVersion = 0;

    private get currentBet(): number {
        return this.config.betOptions[this.betIndex] ?? this.config.defaultBet;
    }

    protected start(): void {
        view.resizeWithBrowserSize(true);
        this.configureResolution();
        const camera = this.node.getChildByName('Camera')?.getComponent(Camera);
        if (camera) camera.clearColor = new Color(3, 35, 27, 255);
        void this.initialize();
    }

    private configureResolution(): void {
        const frame = view.getFrameSize();
        const frameAspect = frame.width / Math.max(1, frame.height);
        const designAspect = this.designWidth / this.designHeight;
        const policy = frameAspect >= designAspect ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH;
        view.setDesignResolutionSize(this.designWidth, this.designHeight, policy);
        this.sceneWidth = frameAspect >= designAspect ? this.designHeight * frameAspect : this.designWidth;
        this.sceneHeight = frameAspect >= designAspect ? this.designHeight : this.designWidth / frameAspect;
    }

    private async initialize(): Promise<void> {
        const catalog = await this.loadJson<ThemeCatalog>('config/themes', FALLBACK_CATALOG);
        this.config = await this.loadJson<GameConfig>(`config/${catalog.defaultTheme}`, FALLBACK_CONFIG);
        this.betIndex = Math.max(0, this.config.betOptions.indexOf(this.config.defaultBet));
        this.balance = this.readBalance();
        this.soundEnabled = sys.localStorage.getItem(this.soundKey) !== 'off';
        await this.loadArtwork();
        this.buildGame();
        await this.loadAudio();
        this.signalReady();
    }

    private loadJson<T>(path: string, fallback: T): Promise<T> {
        return new Promise((resolve) => {
            resources.load(path, JsonAsset, (error, asset) => {
                if (error || !asset?.json) {
                    console.warn(`Using fallback config for ${path}`, error);
                    resolve(fallback);
                    return;
                }
                resolve(asset.json as unknown as T);
            });
        });
    }

    private async loadArtwork(): Promise<void> {
        const paths = [
            this.config.visual.cabinet,
            this.config.visual.winStage,
            this.config.visual.homeIcon,
            this.config.visual.rulesIcon,
            this.config.visual.soundIcon,
            this.config.visual.addIcon,
            this.config.visual.autoIcon,
            this.config.visual.spinIcon,
            ...this.config.symbols.map((symbol) => symbol.texture),
        ];
        await Promise.all(Array.from(new Set(paths)).map(async (path) => {
            const frame = await this.loadResource(path, SpriteFrame);
            if (frame) this.frames.set(path, frame);
        }));
    }

    private async loadAudio(): Promise<void> {
        this.audioSource = this.node.getComponent(AudioSource) ?? this.node.addComponent(AudioSource);
        this.spinClip = await this.loadResource('audio/spin', AudioClip);
        this.winClip = await this.loadResource('audio/win', AudioClip);
        this.coinClip = await this.loadResource('audio/coins', AudioClip);
    }

    private loadResource<T>(path: string, type: new (...args: never[]) => T): Promise<T | null> {
        return new Promise((resolve) => {
            resources.load(path, type as never, (error: Error | null, asset: T) => {
                if (error || !asset) {
                    console.warn(`Missing resource: ${path}`, error);
                    resolve(null);
                    return;
                }
                resolve(asset);
            });
        });
    }

    private buildGame(): void {
        for (const child of [...this.node.children]) if (child.name !== 'Camera') child.destroy();
        this.animationVersion += 1;
        this.cells = [];
        this.cellBacks = [];
        this.reels = [];

        this.createPanel('Backdrop', this.node, this.sceneWidth, this.sceneHeight, new Color(2, 30, 23, 255), 0, 0, 0);
        // Use one cabinet plate only and scale it proportionally to cover the
        // full viewport.  The live UI shares the exact same scale so its reel,
        // meter and controls stay embedded in the authored recesses.
        this.machineScale = this.sceneHeight / 1350;
        const cabinet = this.createSprite('AurumForgeCabinet', this.node, this.sceneHeight * (2 / 3), this.sceneHeight, 0, 0, this.config.visual.cabinet);
        cabinet.getComponent(Sprite)!.color = new Color(255, 255, 255, 255);

        this.machineUi = new Node('MachineUi');
        this.node.addChild(this.machineUi);
        this.ensureTransform(this.machineUi, 900, 1350);
        this.machineUi.setScale(this.machineScale, this.machineScale, 1);

        this.fxLayer = new Node('AmbientFx');
        this.machineUi.addChild(this.fxLayer);
        this.ensureTransform(this.fxLayer, this.designWidth, this.designHeight);

        this.buildHeader();
        this.buildReels();
        this.buildForgeMeter();
        this.buildControls();
        this.buildFooter();

        this.grid = PayoutCalculator.randomGrid(this.config);
        this.applyGrid(this.grid);
        this.refreshHud();
        this.startAmbientLoops();
    }

    private createAmbientBackdrop(): void {
        const left = this.createPanel('LeftSideGlow', this.node, Math.max(0, (this.sceneWidth - 760) / 2), this.sceneHeight, new Color(4, 52, 39, 255), -this.sceneWidth / 2 + Math.max(0, (this.sceneWidth - 760) / 4), 0, 0);
        const right = this.createPanel('RightSideGlow', this.node, Math.max(0, (this.sceneWidth - 760) / 2), this.sceneHeight, new Color(4, 52, 39, 255), this.sceneWidth / 2 - Math.max(0, (this.sceneWidth - 760) / 4), 0, 0);
        const leftOpacity = left.addComponent(UIOpacity);
        const rightOpacity = right.addComponent(UIOpacity);
        leftOpacity.opacity = 170;
        rightOpacity.opacity = 170;
        tween(leftOpacity).to(3.2, { opacity: 225 }).to(3.2, { opacity: 155 }).union().repeatForever().start();
        tween(rightOpacity).delay(1.2).to(3.2, { opacity: 155 }).to(3.2, { opacity: 225 }).union().repeatForever().start();
    }

    private buildHeader(): void {
        this.createIconButton('Home', this.config.visual.homeIcon, -318, 708, 66, () => {
            this.returnToLobby();
        });
        this.createIconButton('Sound', this.config.visual.soundIcon, 246, 708, 58, () => {
            this.soundEnabled = !this.soundEnabled;
            sys.localStorage.setItem(this.soundKey, this.soundEnabled ? 'on' : 'off');
            this.toast(this.soundEnabled ? 'SOUND ON' : 'SOUND MUTED');
        });
        this.createIconButton('Rules', this.config.visual.rulesIcon, 318, 708, 58, () => this.openRules());

        const title = this.createLabel(this.config.title, this.machineUi, 52, new Color(255, 244, 199), 0, 515, 570, 74);
        this.styleLabel(title, new Color(61, 38, 4, 255), 4, new Color(255, 187, 43, 180));
        const subtitle = this.createLabel(this.config.subtitle, this.machineUi, 18, new Color(166, 255, 219), 0, 468, 380, 34);
        subtitle.spacingX = 4;

        this.createLabel('CREDITS', this.machineUi, 13, new Color(146, 235, 201), -78, 354, 110, 28);
        // Seed the visible counter with the loaded value immediately.  On a
        // cold WebGL frame the later HUD refresh can land before the Label's
        // first render submission, which used to leave the placeholder "0"
        // visible until the next balance change.
        this.coinLabel = this.createLabel(Math.floor(this.balance).toLocaleString('en-US'), this.machineUi, 28, new Color(255, 244, 199), 24, 351, 190, 42);
        this.styleLabel(this.coinLabel, new Color(30, 67, 44, 255), 2, new Color(255, 190, 45, 150));
        this.createIconButton('AddCoins', this.config.visual.addIcon, 150, 352, 48, () => this.openRecharge(), this.machineUi);

        this.chainLabel = this.createLabel('CHAIN  x1', this.machineUi, 16, new Color(255, 224, 115), -214, 309, 176, 34);
        this.freeLabel = this.createLabel('FREE SPINS  0', this.machineUi, 16, new Color(176, 255, 225), 214, 309, 190, 34);
    }

    private returnToLobby(): void {
        this.toast('RETURNING HOME');
        const legacyEvent = new CustomEvent('slot-home', { cancelable: true, detail: { themeId: this.config.id } });
        const suiteEvent = new CustomEvent('slot-home-requested', { cancelable: true, detail: { themeId: this.config.id } });
        if (!globalThis.dispatchEvent(legacyEvent) || !globalThis.dispatchEvent(suiteEvent)) return;
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        const requestedHome = new URLSearchParams(window.location.search).get('home')
            ?? document.documentElement.dataset.homeUrl
            ?? '/';
        let homeUrl = new URL('/', window.location.href);
        try {
            const candidate = new URL(requestedHome, window.location.href);
            if (candidate.origin === window.location.origin) homeUrl = candidate;
        } catch {
            // Invalid host configuration safely falls back to the origin root.
        }
        window.setTimeout(() => window.location.assign(homeUrl.href), 180);
    }

    private buildReels(): void {
        this.reelPanel = new Node('ClusterReelPanel');
        this.machineUi.addChild(this.reelPanel);
        this.reelPanel.setPosition(0, 17);
        this.ensureTransform(this.reelPanel, 620, 500);
        this.createPanel('ReelGlass', this.reelPanel, 620, 500, new Color(4, 48, 37, 225), 0, 0, 18);
        this.createOutline('ReelInnerGold', this.reelPanel, 614, 494, new Color(255, 210, 80, 170), 0, 0, 18, 3);

        const xStart = -this.cellWidth * (this.config.columns - 1) / 2;
        const yStart = this.cellHeight * (this.config.rows - 1) / 2;
        for (let column = 0; column < this.config.columns; column += 1) {
            const reel = new Node(`Column_${column}`);
            this.reelPanel.addChild(reel);
            reel.setPosition(xStart + column * this.cellWidth, 0);
            this.ensureTransform(reel, this.cellWidth, 490);
            this.reels.push(reel);
            const sprites: Sprite[] = [];
            const backs: Graphics[] = [];
            for (let row = 0; row < this.config.rows; row += 1) {
                const y = yStart - row * this.cellHeight;
                const cell = this.createPanel(`Cell_${column}_${row}`, reel, 92, 90, new Color(9, 86, 64, 188), 0, y, 13);
                const graphics = cell.getComponent(Graphics)!;
                backs.push(graphics);
                this.createOutline(`CellEdge_${column}_${row}`, cell, 88, 86, new Color(102, 220, 166, 78), 0, 0, 11, 2);
                const spriteNode = this.createSprite(`Symbol_${column}_${row}`, cell, 78, 78, 0, 0);
                sprites.push(spriteNode.getComponent(Sprite)!);
            }
            this.cells.push(sprites);
            this.cellBacks.push(backs);
        }

        this.resultLabel = this.createLabel('CHOOSE YOUR BET', this.machineUi, 18, new Color(255, 244, 199), 0, -330, 560, 44);
        this.styleLabel(this.resultLabel, new Color(15, 65, 46, 255), 2, new Color(255, 190, 54, 120));
    }

    private buildForgeMeter(): void {
        const meter = new Node('ForgeMeter');
        this.machineUi.addChild(meter);
        meter.setPosition(0, -278);
        this.ensureTransform(meter, 590, 52);
        this.createPanel('MeterTrack', meter, 510, 18, new Color(4, 52, 40, 230), 25, -8, 9);
        this.energyFill = new Node('MeterFill');
        meter.addChild(this.energyFill);
        const fillTransform = this.ensureTransform(this.energyFill, 500, 10);
        fillTransform.anchorPoint = new Vec2(0, 0.5);
        this.energyFill.setPosition(-230, -8);
        const fillGraphics = this.energyFill.addComponent(Graphics);
        fillGraphics.fillColor = new Color(255, 183, 38, 255);
        // Draw from local x=0 so scaleX maps exactly to 0/40…40/40.
        fillGraphics.roundRect(0, -5, 500, 10, 5);
        fillGraphics.fill();
        this.energyLabel = this.createLabel('FORGE ENERGY  0/40', meter, 16, new Color(255, 240, 180), -2, 15, 330, 28);
    }

    private buildControls(): void {
        const minus = this.createTextButton('−', -250, -434, 72, 66, 38, () => this.changeBet(-1), this.machineUi);
        const plus = this.createTextButton('+', -154, -434, 72, 66, 34, () => this.changeBet(1), this.machineUi);
        minus.name = 'BetMinus';
        plus.name = 'BetPlus';
        this.betLabel = this.createLabel('BET  50', this.machineUi, 16, new Color(255, 239, 181), -202, -486, 170, 30);

        this.spinButton = this.createIconButton('Spin', this.config.visual.spinIcon, 0, -435, 128, () => void this.spin(), this.machineUi);
        this.autoButton = this.createIconButton('Auto', this.config.visual.autoIcon, 220, -434, 82, () => this.toggleAuto(), this.machineUi);
        this.autoLabel = this.createLabel('AUTO', this.machineUi, 16, new Color(255, 239, 181), 220, -486, 130, 30);

        const aura = this.createOutline('SpinAura', this.machineUi, 146, 146, new Color(255, 213, 91, 190), 0, -435, 73, 4);
        const opacity = aura.addComponent(UIOpacity);
        tween(aura).to(1.25, { scale: new Vec3(1.07, 1.07, 1), angle: 12 }).to(1.25, { scale: Vec3.ONE, angle: 0 }).union().repeatForever().start();
        tween(opacity).to(1.25, { opacity: 90 }).to(1.25, { opacity: 220 }).union().repeatForever().start();
        aura.setSiblingIndex(Math.max(0, this.spinButton.getSiblingIndex()));
    }

    private buildFooter(): void {
        this.createLabel('5+ CONNECT  •  TUMBLE  •  CHAIN MULTIPLIER  •  FORGE FEATURE', this.machineUi, 15, new Color(196, 255, 229), 0, -602, 570, 34);
        const version = this.createLabel('S09  AURUM FORGE', this.machineUi, 12, new Color(255, 230, 150, 205), 0, -650, 280, 28);
        version.spacingX = 2;
    }

    private applyGrid(grid: SymbolConfig[][]): void {
        for (let column = 0; column < this.config.columns; column += 1) {
            for (let row = 0; row < this.config.rows; row += 1) {
                this.applySymbol(this.cells[column][row], grid[column][row]);
                this.cells[column][row].node.setPosition(0, 0);
                this.cells[column][row].node.setScale(Vec3.ONE);
                this.cells[column][row].node.angle = 0;
                const opacity = this.cells[column][row].node.getComponent(UIOpacity);
                if (opacity) opacity.opacity = 255;
            }
        }
    }

    private applySymbol(sprite: Sprite, symbol: SymbolConfig): void {
        sprite.spriteFrame = this.frames.get(symbol.texture) ?? null;
        sprite.color = Color.WHITE;
        sprite.node.name = `Symbol_${symbol.id}`;
    }

    private async spin(isFreeSpin = false): Promise<void> {
        if (this.state.kind !== 'idle') return;
        if (!isFreeSpin && this.balance < this.currentBet) {
            this.openRecharge();
            return;
        }
        if (!isFreeSpin) {
            this.balance -= this.currentBet;
            this.saveBalance();
        } else {
            this.freeSpins = Math.max(0, this.freeSpins - 1);
        }

        this.state = { kind: 'spinning' };
        this.refreshHud();
        this.resultLabel.string = isFreeSpin ? `FREE SPIN  •  ${this.freeSpins} LEFT` : 'IGNITING THE FORGE';
        this.play(this.spinClip, 0.5);
        const outcome = PayoutCalculator.createOutcome(this.config, this.currentBet, Math.random, isFreeSpin && this.freeSpins === 0);
        await this.animateReels(outcome.grid);

        let workingGrid = outcome.grid;
        let totalWin = outcome.bonusAward;
        let cascade = 0;
        while (cascade < this.config.cascadeMultipliers.length) {
            const multiplier = this.config.cascadeMultipliers[cascade];
            this.state = { kind: 'evaluating', cascade };
            const evaluation = PayoutCalculator.evaluate(workingGrid, this.config, this.currentBet, multiplier);
            if (evaluation.wins.length === 0) break;
            totalWin += evaluation.totalWin;
            this.chainLabel.string = `CHAIN  x${multiplier}`;
            this.resultLabel.string = `${evaluation.wins.reduce((sum, win) => sum + win.cells.length, 0)} SYMBOL CLUSTER  •  +${evaluation.totalWin}`;
            await this.presentClusters(evaluation.wins);
            this.addForgeEnergy(evaluation.removed.size);
            const tumble = PayoutCalculator.tumble(workingGrid, evaluation.removed, this.config);
            workingGrid = tumble.grid;
            this.grid = workingGrid;
            await this.animateTumble(workingGrid, tumble.dropRows);
            cascade += 1;
        }

        this.grid = workingGrid;
        if (outcome.freeSpinsAwarded > 0) {
            this.freeSpins += outcome.freeSpinsAwarded;
            this.toast(`${outcome.freeSpinsAwarded} FREE SPINS AWARDED`);
        }
        if (outcome.bonusAward > 0) this.toast(`FURNACE BONUS  +${outcome.bonusAward}`);

        if (totalWin > 0) {
            await this.presentWin(totalWin);
        } else {
            this.resultLabel.string = 'NO CLUSTER  •  SPIN AGAIN';
            this.chainLabel.string = 'CHAIN  x1';
        }

        this.state = { kind: 'idle' };
        this.refreshHud();
        if (this.freeSpins > 0) {
            this.scheduleOnce(() => void this.spin(true), 0.7);
        } else if (this.autoEnabled) {
            this.scheduleOnce(() => void this.spin(false), 0.85);
        }
    }

    private async animateReels(target: SymbolConfig[][]): Promise<void> {
        const tasks: Promise<void>[] = [];
        for (let column = 0; column < this.config.columns; column += 1) tasks.push(this.spinColumn(column, target[column]));
        await Promise.all(tasks);
    }

    private async spinColumn(column: number, target: SymbolConfig[]): Promise<void> {
        const reel = this.reels[column];
        const baseX = reel.position.x;
        Tween.stopAllByTarget(reel);
        await this.runTween(reel, tween(reel).to(0.075, { position: new Vec3(baseX, 13, 0) }, { easing: 'sineOut' }));
        const duration = this.config.minSpinDuration + column * this.config.reelStopDelay;
        const ticks = Math.max(7, Math.round(duration / 0.052));
        for (let tick = 0; tick < ticks; tick += 1) {
            for (let row = 0; row < this.config.rows; row += 1) {
                this.applySymbol(this.cells[column][row], PayoutCalculator.pickWeighted(this.config.symbols));
            }
            reel.setPosition(baseX, -((tick % 3) * 9));
            await this.delay(52);
        }
        for (let row = 0; row < this.config.rows; row += 1) this.applySymbol(this.cells[column][row], target[row]);
        reel.setPosition(baseX, 24);
        await this.runTween(
            reel,
            tween(reel)
                .to(0.16, { position: new Vec3(baseX, -12, 0) }, { easing: 'sineOut' })
                .to(0.18, { position: new Vec3(baseX, 0, 0) }, { easing: 'backOut' }),
        );
        this.reelStopBurst(column);
    }

    private async presentClusters(wins: ClusterWin[]): Promise<void> {
        const nodes: Node[] = [];
        for (const win of wins) {
            for (const cell of win.cells) {
                const sprite = this.cells[cell.column][cell.row];
                nodes.push(sprite.node);
                this.paintCell(cell.column, cell.row, new Color(255, 185, 38, 210));
                Tween.stopAllByTarget(sprite.node);
                tween(sprite.node)
                    .to(0.14, { scale: new Vec3(1.18, 1.18, 1), angle: cell.column % 2 ? 4 : -4 }, { easing: 'backOut' })
                    .to(0.16, { scale: Vec3.ONE, angle: 0 }, { easing: 'sineInOut' })
                    .start();
                this.burstAt(this.reels[cell.column].position.x, this.rowY(cell.row) + this.reelPanel.position.y, 5);
            }
        }
        this.play(this.winClip, 0.45);
        await this.delay(430);
        await Promise.all(nodes.map((node, index) => new Promise<void>((resolve) => {
            tween(node)
                .delay((index % 6) * 0.018)
                .to(0.16, { scale: new Vec3(0.06, 0.06, 1), angle: index % 2 ? 12 : -12 }, { easing: 'sineIn' })
                .call(resolve)
                .start();
        })));
        this.resetCellColors();
    }

    private async animateTumble(grid: SymbolConfig[][], dropRows: number[][]): Promise<void> {
        const tasks: Promise<void>[] = [];
        for (let column = 0; column < this.config.columns; column += 1) {
            for (let row = 0; row < this.config.rows; row += 1) {
                const sprite = this.cells[column][row];
                const distance = Math.max(1, dropRows[column][row]);
                this.applySymbol(sprite, grid[column][row]);
                // Symbol sprites are children of cells that already sit at
                // baseY.  Animate in cell-local space so a cascade never
                // double-applies the row offset and strands symbols outside
                // the reel window.
                sprite.node.setPosition(0, distance * this.cellHeight + 80);
                sprite.node.setScale(0.88, 1.12, 1);
                sprite.node.angle = (column % 2 ? 1 : -1) * Math.min(9, distance * 2);
                let opacity = sprite.node.getComponent(UIOpacity);
                if (!opacity) opacity = sprite.node.addComponent(UIOpacity);
                opacity.opacity = 0;
                tween(opacity).delay(column * 0.035 + row * 0.018).to(0.14, { opacity: 255 }).start();
                tasks.push(new Promise<void>((resolve) => {
                    tween(sprite.node)
                        .delay(column * 0.035 + row * 0.018)
                        .to(0.28 + distance * 0.035, { position: new Vec3(0, -10, 0), scale: new Vec3(1.04, 0.94, 1), angle: 0 }, { easing: 'sineOut' })
                        .to(0.13, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'backOut' })
                        .call(resolve)
                        .start();
                }));
            }
        }
        await Promise.all(tasks);
        await this.delay(140);
    }

    private async presentWin(amount: number): Promise<void> {
        this.state = { kind: 'presenting', skippable: true };
        const startBalance = this.balance;
        this.resultLabel.string = `TOTAL WIN  +${amount}`;
        const largeWin = amount >= this.currentBet * 8;
        if (largeWin) await this.showBigWin(amount);
        this.coinStream(amount);
        await this.countBalance(startBalance, startBalance + amount, largeWin ? 1.45 : 0.9);
        this.balance += amount;
        this.saveBalance();
        this.refreshHud();
    }

    private async showBigWin(amount: number): Promise<void> {
        const root = new Node('BigWinOverlay');
        this.node.addChild(root);
        this.ensureTransform(root, this.sceneWidth, this.sceneHeight);
        root.addComponent(BlockInputEvents);
        const dim = this.createPanel('Dim', root, this.sceneWidth, this.sceneHeight, new Color(0, 31, 23, 158), 0, 0, 0);
        dim.addComponent(Button);
        const stage = this.createSprite('WinStage', root, 740, 494, 0, 45, this.config.visual.winStage);
        stage.setScale(0.76, 0.76, 1);
        const stageOpacity = stage.addComponent(UIOpacity);
        stageOpacity.opacity = 0;
        const headline = this.createLabel(amount >= this.currentBet * 20 ? 'FORGE JACKPOT' : 'MOLTEN WIN', root, 48, new Color(255, 246, 203), 0, 92, 520, 70);
        this.styleLabel(headline, new Color(90, 45, 0, 255), 4, new Color(255, 190, 43, 190));
        headline.node.setScale(0.55, 0.55, 1);
        const value = this.createLabel('0', root, 62, new Color(255, 210, 72), 0, 18, 420, 78);
        this.styleLabel(value, new Color(68, 45, 0, 255), 4, new Color(255, 233, 147, 220));
        tween(stageOpacity).to(0.22, { opacity: 255 }).start();
        tween(stage).to(0.42, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        tween(headline.node).to(0.55, { scale: Vec3.ONE }, { easing: 'elasticOut' }).start();
        for (let index = 0; index < 28; index += 1) this.scheduleOnce(() => this.spawnWinCoin(root, index), index * 0.045);
        await this.countLabel(value, 0, amount, 1.35);
        await this.delay(650);
        tween(root.getComponent(UIOpacity) ?? root.addComponent(UIOpacity))
            .to(0.25, { opacity: 0 })
            .call(() => root.destroy())
            .start();
        await this.delay(280);
    }

    private addForgeEnergy(amount: number): void {
        this.forgeEnergy += amount;
        if (this.forgeEnergy >= this.config.forgeTarget) {
            this.forgeEnergy -= this.config.forgeTarget;
            const award = this.currentBet * 6;
            this.balance += award;
            this.saveBalance();
            this.toast(`FORGE OVERDRIVE  +${award}`);
            this.burstAt(0, -278, 24);
        }
        this.refreshHud();
    }

    private changeBet(direction: number): void {
        if (this.state.kind !== 'idle') return;
        this.betIndex = Math.max(0, Math.min(this.config.betOptions.length - 1, this.betIndex + direction));
        this.refreshHud();
        this.toast(`BET SET TO ${this.currentBet}`);
    }

    private toggleAuto(): void {
        this.autoEnabled = !this.autoEnabled;
        this.autoLabel.string = this.autoEnabled ? 'STOP AUTO' : 'AUTO';
        this.autoButton.setScale(this.autoEnabled ? new Vec3(1.08, 1.08, 1) : Vec3.ONE);
        this.toast(this.autoEnabled ? 'AUTO SPINS ACTIVE' : 'AUTO SPINS STOPPED');
        if (this.autoEnabled && this.state.kind === 'idle') void this.spin();
    }

    private openRules(): void {
        if (this.modal?.isValid) return;
        const modal = this.createModal('RulesModal');
        this.modal = modal;
        const title = this.createLabel('HOW TO PLAY', modal, 40, new Color(255, 244, 199), 0, 525, 520, 64);
        this.styleLabel(title, new Color(50, 58, 25, 255), 3, new Color(255, 190, 44, 150));
        this.createLabel('AURUM FORGE  •  CLUSTER TUMBLE', modal, 17, new Color(152, 255, 211), 0, 474, 520, 36);

        const rules = [
            ['1', 'CONNECT 5 OR MORE', 'Matching symbols touch horizontally or vertically.'],
            ['2', 'TUMBLE AGAIN', 'Winning symbols melt away and new symbols fall into place.'],
            ['3', 'GROW THE CHAIN', 'Every consecutive tumble raises the multiplier: x1, x2, x3, x5, x8.'],
            ['4', 'CHARGE THE FORGE', `Clear ${this.config.forgeTarget} symbols to trigger a Forge Overdrive award.`],
            ['5', 'SPECIAL SYMBOLS', '3 Scatters award free spins. 3 Furnace Cores award an instant bonus.'],
        ];
        rules.forEach((rule, index) => {
            const y = 350 - index * 145;
            this.createPanel(`Rule_${index}`, modal, 590, 118, new Color(6, 70, 52, 235), 0, y, 22);
            this.createPanel(`RuleNumber_${index}`, modal, 58, 58, new Color(255, 190, 44, 255), -248, y + 10, 29);
            const number = this.createLabel(rule[0], modal, 27, new Color(48, 52, 20), -248, y + 10, 50, 50);
            number.isBold = true;
            const heading = this.createLabel(rule[1], modal, 19, new Color(255, 237, 173), 44, y + 26, 470, 34);
            heading.horizontalAlign = Label.HorizontalAlign.LEFT;
            const body = this.createLabel(rule[2], modal, 19, new Color(221, 255, 238), 44, y - 18, 470, 58);
            body.horizontalAlign = Label.HorizontalAlign.LEFT;
            body.enableWrapText = true;
        });
        this.createTextButton('CLOSE', 0, -505, 210, 62, 19, () => this.closeModal(), modal);
    }

    private openRecharge(): void {
        if (this.modal?.isValid || this.state.kind !== 'idle') return;
        const modal = this.createModal('RechargeModal');
        this.modal = modal;
        const title = this.createLabel('FORGE CREDIT VAULT', modal, 38, new Color(255, 244, 199), 0, 515, 590, 64);
        this.styleLabel(title, new Color(50, 58, 25, 255), 3, new Color(255, 190, 44, 150));
        this.createLabel('SELECT A CREDIT RESERVE', modal, 16, new Color(159, 255, 215), 0, 466, 420, 34);
        const packs = [
            { amount: 1200, symbol: 'gold-ingots', name: 'INGOT RESERVE' },
            { amount: 3000, symbol: 'emerald-crucible', name: 'EMERALD CRUCIBLE' },
            { amount: 8000, symbol: 'furnace-bonus', name: 'MASTER FURNACE' },
        ];
        packs.forEach((pack, index) => {
            const y = 285 - index * 245;
            const card = this.createPanel(`Pack_${pack.amount}`, modal, 590, 202, new Color(7, 76, 56, 240), 0, y, 26);
            this.createOutline('PackEdge', card, 584, 196, new Color(255, 206, 76, 160), 0, 0, 24, 3);
            const cfg = this.config.symbols.find((symbol) => symbol.id === pack.symbol)!;
            this.createSprite(`PackIcon_${index}`, card, 128, 128, -205, 0, cfg.texture);
            const name = this.createLabel(pack.name, card, 19, new Color(255, 240, 183), 80, 44, 310, 34);
            name.horizontalAlign = Label.HorizontalAlign.LEFT;
            const amount = this.createLabel(`+${pack.amount} CREDITS`, card, 25, new Color(143, 255, 207), 80, 4, 310, 40);
            amount.horizontalAlign = Label.HorizontalAlign.LEFT;
            this.createTextButton('ADD', 150, -55, 126, 48, 16, () => {
                this.balance += pack.amount;
                this.saveBalance();
                this.refreshHud();
                this.play(this.coinClip, 0.55);
                this.closeModal();
                this.toast(`${pack.amount} CREDITS ADDED`);
            }, card);
        });
        this.createTextButton('CLOSE', 0, -510, 210, 62, 19, () => this.closeModal(), modal);
    }

    private createModal(name: string): Node {
        const modal = new Node(name);
        this.node.addChild(modal);
        this.ensureTransform(modal, this.sceneWidth, this.sceneHeight);
        modal.addComponent(BlockInputEvents);
        this.createPanel('ModalDim', modal, this.sceneWidth, this.sceneHeight, new Color(0, 28, 20, 215), 0, 0, 0);
        const sheet = this.createPanel('ModalSheet', modal, 670, 1190, new Color(4, 47, 35, 252), 0, 0, 38);
        this.createOutline('ModalGoldEdge', sheet, 660, 1180, new Color(255, 209, 81, 220), 0, 0, 34, 5);
        modal.setScale(0.92, 0.92, 1);
        const opacity = modal.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 255 }).start();
        tween(modal).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        return modal;
    }

    private closeModal(): void {
        if (!this.modal?.isValid) return;
        const modal = this.modal;
        this.modal = null;
        tween(modal.getComponent(UIOpacity) ?? modal.addComponent(UIOpacity))
            .to(0.18, { opacity: 0 })
            .call(() => modal.destroy())
            .start();
    }

    private refreshHud(): void {
        if (this.coinLabel) this.coinLabel.string = Math.floor(this.balance).toLocaleString('en-US');
        if (this.betLabel) this.betLabel.string = `BET  ${this.currentBet}`;
        if (this.freeLabel) this.freeLabel.string = `FREE SPINS  ${this.freeSpins}`;
        if (this.energyLabel) this.energyLabel.string = `FORGE ENERGY  ${this.forgeEnergy}/${this.config.forgeTarget}`;
        if (this.energyFill) {
            const ratio = Math.max(0.015, Math.min(1, this.forgeEnergy / this.config.forgeTarget));
            this.energyFill.setScale(ratio, 1, 1);
        }
    }

    private readBalance(): number {
        const sharedBalance = this.readF1Balance();
        if (sharedBalance !== null) return sharedBalance;
        const stored = sys.localStorage.getItem(this.balanceKey);
        if (stored === null || stored.trim() === '') return this.config.initialCoins;
        const value = Number(stored);
        return Number.isFinite(value) && value >= 0 ? value : this.config.initialCoins;
    }

    private saveBalance(): void {
        if (this.writeF1Balance(this.balance)) return;
        sys.localStorage.setItem(this.balanceKey, String(Math.floor(this.balance)));
    }

    private f1WalletUser(): string | null {
        if (typeof window === 'undefined') return null;
        if (new URLSearchParams(window.location.search).get('suite') !== 'f1') return null;
        const username = sys.localStorage.getItem(this.f1SessionKey)?.trim();
        return username || null;
    }

    private readF1Balance(): number | null {
        const username = this.f1WalletUser();
        if (!username) return null;
        try {
            const raw = sys.localStorage.getItem(this.f1AccountsKey);
            if (!raw) return null;
            const accounts = JSON.parse(raw) as Record<string, { coins?: number }>;
            const balance = Number(accounts[username]?.coins);
            return Number.isFinite(balance) && balance >= 0 ? balance : null;
        } catch {
            return null;
        }
    }

    private writeF1Balance(value: number): boolean {
        const username = this.f1WalletUser();
        if (!username) return false;
        try {
            const raw = sys.localStorage.getItem(this.f1AccountsKey);
            if (!raw) return false;
            const accounts = JSON.parse(raw) as Record<string, { coins?: number }>;
            const account = accounts[username];
            if (!account) return false;
            account.coins = Math.max(0, Math.floor(value));
            sys.localStorage.setItem(this.f1AccountsKey, JSON.stringify(accounts));
            return true;
        } catch {
            return false;
        }
    }

    private startAmbientLoops(): void {
        const version = this.animationVersion;
        const loop = (): void => {
            if (version !== this.animationVersion || !this.fxLayer?.isValid) return;
            const x = -310 + Math.random() * 620;
            this.spawnSpark(x, -205 + Math.random() * 420, 8 + Math.random() * 8);
            this.scheduleOnce(loop, 0.32 + Math.random() * 0.5);
        };
        loop();
    }

    private reelStopBurst(column: number): void {
        const x = this.reels[column].position.x;
        for (let index = 0; index < 7; index += 1) {
            this.scheduleOnce(() => this.spawnSpark(x + (Math.random() - 0.5) * 70, 250 - Math.random() * 500, 8 + Math.random() * 8), index * 0.025);
        }
    }

    private burstAt(x: number, y: number, count: number): void {
        for (let index = 0; index < count; index += 1) {
            this.scheduleOnce(() => this.spawnSpark(x + (Math.random() - 0.5) * 74, y + (Math.random() - 0.5) * 70, 9 + Math.random() * 12), index * 0.018);
        }
    }

    private spawnSpark(x: number, y: number, size: number): void {
        if (!this.fxLayer?.isValid) return;
        const spark = new Node('ForgeSpark');
        this.fxLayer.addChild(spark);
        spark.setPosition(x, y);
        this.ensureTransform(spark, size, size);
        const graphics = spark.addComponent(Graphics);
        graphics.fillColor = Math.random() > 0.35 ? new Color(255, 205, 75, 235) : new Color(94, 255, 193, 220);
        graphics.circle(0, 0, size / 2);
        graphics.fill();
        const opacity = spark.addComponent(UIOpacity);
        spark.setScale(0.4, 0.4, 1);
        tween(spark)
            .to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' })
            .to(0.55, { position: new Vec3(x + (Math.random() - 0.5) * 36, y + 65 + Math.random() * 70, 0), scale: new Vec3(0.1, 0.1, 1) }, { easing: 'sineOut' })
            .call(() => spark.destroy())
            .start();
        tween(opacity).delay(0.2).to(0.48, { opacity: 0 }).start();
    }

    private coinStream(amount: number): void {
        const coin = this.config.symbols.find((symbol) => symbol.id === 'liquid-coin');
        if (!coin) return;
        const count = Math.min(36, Math.max(12, Math.round(amount / Math.max(1, this.currentBet)) * 3));
        for (let index = 0; index < count; index += 1) {
            this.scheduleOnce(() => {
                const node = this.createSprite(`CoinStream_${index}`, this.fxLayer, 42, 42, (Math.random() - 0.5) * 520, -100 + Math.random() * 300, coin.texture);
                node.setScale(0.45, 0.45, 1);
                tween(node)
                    .to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' })
                    .to(0.6 + Math.random() * 0.24, { position: new Vec3(24, 351, 0), scale: new Vec3(0.18, 0.18, 1), angle: 220 + Math.random() * 180 }, { easing: 'quadIn' })
                    .call(() => node.destroy())
                    .start();
            }, index * 0.035);
        }
        this.play(this.coinClip, 0.48);
    }

    private spawnWinCoin(parent: Node, index: number): void {
        if (!parent.isValid) return;
        const coin = this.config.symbols.find((symbol) => symbol.id === 'liquid-coin');
        if (!coin) return;
        const x = -310 + Math.random() * 620;
        const node = this.createSprite(`WinCoin_${index}`, parent, 50, 50, x, 620 + Math.random() * 160, coin.texture);
        const targetX = x + (Math.random() - 0.5) * 150;
        tween(node)
            .to(1.0 + Math.random() * 0.55, { position: new Vec3(targetX, -610, 0), angle: 360 + Math.random() * 540 }, { easing: 'quadIn' })
            .call(() => node.destroy())
            .start();
    }

    private async countBalance(from: number, to: number, seconds: number): Promise<void> {
        if (!this.coinLabel) return;
        const holder = { value: from };
        await new Promise<void>((resolve) => {
            tween(holder)
                .to(seconds, { value: to }, {
                    easing: 'linear',
                    onUpdate: () => { this.coinLabel.string = Math.floor(holder.value).toLocaleString('en-US'); },
                })
                .call(resolve)
                .start();
        });
    }

    private async countLabel(label: Label, from: number, to: number, seconds: number): Promise<void> {
        const holder = { value: from };
        await new Promise<void>((resolve) => {
            tween(holder)
                .to(seconds, { value: to }, {
                    easing: 'linear',
                    onUpdate: () => { label.string = Math.floor(holder.value).toLocaleString('en-US'); },
                })
                .call(resolve)
                .start();
        });
    }

    private toast(message: string): void {
        const toast = this.createPanel('Toast', this.node, 480, 58, new Color(5, 72, 52, 245), 0, -555, 29);
        this.createOutline('ToastEdge', toast, 474, 52, new Color(255, 208, 82, 190), 0, 0, 26, 2);
        this.createLabel(message, toast, 16, new Color(255, 241, 186), 0, 0, 440, 40);
        const opacity = toast.addComponent(UIOpacity);
        opacity.opacity = 0;
        toast.setPosition(0, -570);
        tween(opacity).to(0.16, { opacity: 255 }).delay(1.2).to(0.2, { opacity: 0 }).start();
        tween(toast).to(0.22, { position: new Vec3(0, -540, 0) }, { easing: 'backOut' }).delay(1.2).call(() => toast.destroy()).start();
    }

    private createIconButton(name: string, path: string, x: number, y: number, size: number, handler: () => void, parent = this.node): Node {
        const node = this.createSprite(`${name}Button`, parent, size, size, x, y, path);
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        node.on(Node.EventType.TOUCH_END, handler, this);
        return node;
    }

    private createTextButton(text: string, x: number, y: number, width: number, height: number, fontSize: number, handler: () => void, parent = this.node): Node {
        const node = this.createPanel(`Button_${text}`, parent, width, height, new Color(12, 111, 78, 255), x, y, Math.min(width, height) / 2);
        this.createOutline('ButtonGold', node, width - 4, height - 4, new Color(255, 210, 83, 230), 0, 0, Math.min(width, height) / 2 - 2, 4);
        const label = this.createLabel(text, node, fontSize, new Color(255, 243, 195), 0, 1, width - 10, height - 8);
        this.styleLabel(label, new Color(22, 63, 42, 255), 2, new Color(255, 190, 44, 130));
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        node.on(Node.EventType.TOUCH_END, handler, this);
        return node;
    }

    private createSprite(name: string, parent: Node, width: number, height: number, x: number, y: number, path?: string): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        if (path) sprite.spriteFrame = this.frames.get(path) ?? null;
        return node;
    }

    private createPanel(name: string, parent: Node, width: number, height: number, color: Color, x: number, y: number, radius: number): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();
        return node;
    }

    private createOutline(name: string, parent: Node, width: number, height: number, color: Color, x: number, y: number, radius: number, lineWidth: number): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const graphics = node.addComponent(Graphics);
        graphics.strokeColor = color;
        graphics.lineWidth = lineWidth;
        graphics.roundRect(-width / 2 + lineWidth, -height / 2 + lineWidth, width - lineWidth * 2, height - lineWidth * 2, radius);
        graphics.stroke();
        return node;
    }

    private createLabel(text: string, parent: Node, fontSize: number, color: Color, x: number, y: number, width: number, height: number): Label {
        const node = new Node(`Label_${text}`);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontFamily = 'Arial Rounded MT Bold';
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.22);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableWrapText = false;
        label.isBold = true;
        return label;
    }

    private styleLabel(label: Label, outline: Color, outlineWidth: number, shadow: Color): void {
        label.enableOutline = true;
        label.outlineColor = outline;
        label.outlineWidth = outlineWidth;
        label.enableShadow = true;
        label.shadowColor = shadow;
        label.shadowOffset = new Vec2(0, -2);
        label.shadowBlur = 1;
    }

    private paintCell(column: number, row: number, color: Color): void {
        const graphics = this.cellBacks[column][row];
        graphics.clear();
        graphics.fillColor = color;
        graphics.roundRect(-46, -45, 92, 90, 13);
        graphics.fill();
    }

    private resetCellColors(): void {
        for (let column = 0; column < this.config.columns; column += 1) {
            for (let row = 0; row < this.config.rows; row += 1) this.paintCell(column, row, new Color(9, 86, 64, 188));
        }
    }

    private rowY(row: number): number {
        return this.cellHeight * (this.config.rows - 1) / 2 - row * this.cellHeight;
    }

    private ensureTransform(node: Node, width: number, height: number): UITransform {
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        transform.setAnchorPoint(0.5, 0.5);
        return transform;
    }

    private runTween(node: Node, action: Tween<Node>): Promise<void> {
        return new Promise((resolve) => action.call(resolve).start());
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) => this.scheduleOnce(resolve, milliseconds / 1000));
    }

    private play(clip: AudioClip | null, volume: number): void {
        if (this.soundEnabled && clip && this.audioSource) this.audioSource.playOneShot(clip, volume);
    }

    private signalReady(): void {
        globalThis.dispatchEvent(new CustomEvent('aurum-forge-ready'));
        (globalThis as typeof globalThis & { __AURUM_FORGE_READY__?: boolean }).__AURUM_FORGE_READY__ = true;
    }
}
