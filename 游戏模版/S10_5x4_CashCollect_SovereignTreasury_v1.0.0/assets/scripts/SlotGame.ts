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
    Texture2D,
    tween,
    Tween,
    UITransform,
    UIOpacity,
    Vec2,
    Vec3,
    view,
} from 'cc';
import { FALLBACK_CATALOG, FALLBACK_CONFIG, GameConfig, SymbolConfig, ThemeCatalog } from './GameConfig';
import { CashCell, PayoutCalculator, SpinOutcome, WinningCell } from './PayoutCalculator';

const { ccclass } = _decorator;

type GameState =
    | { kind: 'idle' }
    | { kind: 'spinning' }
    | { kind: 'evaluating' }
    | { kind: 'presenting'; skippable: boolean };

@ccclass('SlotGame')
export class SlotGame extends Component {
    private readonly designWidth = 750;
    private readonly designHeight = 1624;
    private readonly authoredWidth = 900;
    private readonly authoredHeight = 1350;
    private readonly cabinetArtHeight = 1948;
    private readonly cellWidth = 112;
    private readonly cellHeight = 120;
    private readonly soundKey = 's10-sovereign-treasury-sound';
    private readonly balanceKey = 's10-sovereign-treasury-balance';
    private readonly f1AccountsKey = 'l02-royal-wealth-accounts-v1';
    private readonly f1SessionKey = 'l02-royal-wealth-session-v1';
    private config: GameConfig = FALLBACK_CONFIG;
    private sceneWidth = this.designWidth;
    private sceneHeight = this.designHeight;
    private machineScale = 1;
    private state: GameState = { kind: 'idle' };
    private frames = new Map<string, SpriteFrame>();
    private cells: Sprite[][] = [];
    private cashLabels: Label[][] = [];
    private cellBacks: Graphics[][] = [];
    private reels: Node[] = [];
    private grid: SymbolConfig[][] = [];
    private pendingCash = new Map<string, CashCell>();
    private balance = 5000;
    private betIndex = 1;
    private autoEnabled = false;
    private soundEnabled = true;
    private soundButton!: Node;
    private spinButton!: Node;
    private autoButton!: Node;
    private autoLabel!: Label;
    private coinLabel!: Label;
    private betLabel!: Label;
    private resultLabel!: Label;
    private collectLabel!: Label;
    private collectFill!: Node;
    private titleNode!: Node;
    private reelPanel!: Node;
    private machineUi!: Node;
    private fxLayer!: Node;
    private modal: Node | null = null;
    private audioSource!: AudioSource;
    private spinClip: AudioClip | null = null;
    private winClip: AudioClip | null = null;
    private coinClip: AudioClip | null = null;
    private animationVersion = 0;
    private treasuryMeter = 0;

    private get currentBet(): number {
        return this.config.betOptions[this.betIndex] ?? this.config.defaultBet;
    }

    protected start(): void {
        view.resizeWithBrowserSize(true);
        this.configureResolution();
        const camera = this.node.getChildByName('Camera')?.getComponent(Camera);
        if (camera) camera.clearColor = new Color(65, 18, 25, 255);
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
            this.config.visual.minusIcon,
            this.config.visual.plusIcon,
            this.config.visual.autoIcon,
            this.config.visual.spinIcon,
            ...this.config.symbols.map((symbol) => symbol.texture),
        ];
        await Promise.all(Array.from(new Set(paths)).map(async (path) => {
            // Generated theme art is intentionally imported as Texture2D.
            // Wrap it at runtime so cabinet art, symbols and controls all use
            // proper SpriteFrames in the web and native builds.
            const texturePath = path.replace(/\/spriteFrame$/, '/texture');
            const texture = await this.loadResource(texturePath, Texture2D);
            if (!texture) return;
            const frame = new SpriteFrame();
            frame.texture = texture;
            this.frames.set(path, frame);
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
        this.cashLabels = [];
        this.cellBacks = [];
        this.reels = [];

        this.createPanel('Backdrop', this.node, this.sceneWidth, this.sceneHeight, new Color(46, 12, 21, 255), 0, 0, 0);
        // The cabinet extension is rendered as one continuous surface. The
        // gameplay UI uses the same scale and origin, so nothing looks pasted
        // over a separate fantasy backdrop.
        this.machineScale = Math.max(this.sceneWidth / this.authoredWidth, this.sceneHeight / this.cabinetArtHeight);
        const cabinet = this.createSprite('SovereignTreasuryCabinet', this.node, this.authoredWidth * this.machineScale, this.cabinetArtHeight * this.machineScale, 0, 0, this.config.visual.cabinet);
        cabinet.getComponent(Sprite)!.color = Color.WHITE;

        this.machineUi = new Node('MachineUi');
        this.node.addChild(this.machineUi);
        this.ensureTransform(this.machineUi, this.authoredWidth, this.authoredHeight);
        this.machineUi.setScale(this.machineScale, this.machineScale, 1);

        this.fxLayer = new Node('FxLayer');
        this.machineUi.addChild(this.fxLayer);
        this.ensureTransform(this.fxLayer, this.authoredWidth, this.authoredHeight);

        this.buildHeader();
        this.buildReels();
        this.buildCollectionTray();
        this.buildControls();
        this.buildFooter();

        this.grid = PayoutCalculator.randomGrid(this.config);
        this.applyGrid(this.grid, []);
        this.refreshHud();
        this.startAmbientLoops();
    }

    private buildHeader(): void {
        // Match the proven S09 top utility layout: home isolated at the far
        // left, with sound and rules grouped at the far right of the arch.
        this.createIconButton('Home', this.config.visual.homeIcon, -318, 708, 66, () => {
            this.returnToLobby();
        });
        this.soundButton = this.createIconButton('Sound', this.config.visual.soundIcon, 246, 708, 58, () => this.toggleSound());
        this.createIconButton('Rules', this.config.visual.rulesIcon, 318, 708, 58, () => this.openRules());
        this.refreshSoundButton();

        const title = this.createLabel(this.config.title, this.machineUi, 45, new Color(255, 244, 205), 0, 512, 650, 70);
        this.styleLabel(title, new Color(102, 35, 34, 255), 4, new Color(255, 197, 62, 155));
        this.titleNode = title.node;
        const subtitle = this.createLabel(this.config.subtitle, this.machineUi, 19, new Color(128, 255, 210), 0, 463, 430, 34);
        subtitle.spacingX = 5;

        this.createLabel('CREDITS', this.machineUi, 13, new Color(180, 236, 209), -112, 351, 110, 28);
        this.coinLabel = this.createLabel(Math.floor(this.balance).toLocaleString('en-US'), this.machineUi, 29, new Color(255, 243, 190), 20, 348, 210, 42);
        this.styleLabel(this.coinLabel, new Color(24, 70, 52, 255), 2, new Color(255, 196, 57, 140));
        this.createIconButton('AddCoins', this.config.visual.addIcon, 166, 350, 50, () => this.openRecharge(), this.machineUi);
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
        this.reelPanel = new Node('CashCollectReels');
        this.machineUi.addChild(this.reelPanel);
        this.reelPanel.setPosition(0, 8);
        this.ensureTransform(this.reelPanel, 626, 530);
        this.createPanel('ReelGlass', this.reelPanel, 626, 530, new Color(5, 48, 38, 228), 0, 0, 20);
        this.createOutline('ReelGoldEdge', this.reelPanel, 620, 524, new Color(255, 218, 105, 185), 0, 0, 18, 3);

        const xStart = -this.cellWidth * (this.config.columns - 1) / 2;
        const yStart = this.cellHeight * (this.config.rows - 1) / 2;
        for (let reelIndex = 0; reelIndex < this.config.columns; reelIndex += 1) {
            const reel = new Node(`Reel_${reelIndex}`);
            this.reelPanel.addChild(reel);
            reel.setPosition(xStart + reelIndex * this.cellWidth, 0);
            this.ensureTransform(reel, this.cellWidth, 510);
            this.reels.push(reel);
            const sprites: Sprite[] = [];
            const labels: Label[] = [];
            const backs: Graphics[] = [];
            for (let row = 0; row < this.config.rows; row += 1) {
                const y = yStart - row * this.cellHeight;
                const cell = this.createPanel(`Cell_${reelIndex}_${row}`, reel, 104, 112, new Color(10, 72, 56, 174), 0, y, 15);
                backs.push(cell.getComponent(Graphics)!);
                this.createOutline('CellEdge', cell, 100, 108, new Color(235, 206, 123, 76), 0, 0, 13, 2);
                const symbol = this.createSprite(`Symbol_${reelIndex}_${row}`, cell, 92, 92, 0, 2);
                symbol.addComponent(UIOpacity);
                sprites.push(symbol.getComponent(Sprite)!);
                const cash = this.createLabel('', cell, 17, new Color(255, 247, 211), 0, -32, 82, 28);
                cash.node.active = false;
                this.styleLabel(cash, new Color(76, 37, 15), 2, new Color(255, 203, 70, 150));
                labels.push(cash);
            }
            this.cells.push(sprites);
            this.cashLabels.push(labels);
            this.cellBacks.push(backs);
        }
    }

    private buildCollectionTray(): void {
        const tray = new Node('CollectionTray');
        this.machineUi.addChild(tray);
        tray.setPosition(0, -303);
        this.ensureTransform(tray, 610, 78);
        this.collectLabel = this.createLabel('LAND CASH COINS + COLLECTOR', tray, 17, new Color(255, 241, 190), 0, 15, 540, 30);
        this.styleLabel(this.collectLabel, new Color(26, 63, 48), 2, new Color(255, 192, 49, 120));
        this.createPanel('TreasuryTrack', tray, 480, 11, new Color(12, 56, 44, 220), 0, -19, 6);
        this.collectFill = new Node('TreasuryFill');
        tray.addChild(this.collectFill);
        const transform = this.ensureTransform(this.collectFill, 472, 7);
        transform.anchorPoint = new Vec2(0, 0.5);
        this.collectFill.setPosition(-236, -19);
        const fill = this.collectFill.addComponent(Graphics);
        fill.fillColor = new Color(246, 199, 72, 255);
        fill.roundRect(0, -3.5, 472, 7, 4);
        fill.fill();
    }

    private buildControls(): void {
        this.createLabel('BET', this.machineUi, 13, new Color(115, 54, 38), -205, -506, 110, 24);
        this.createIconButton('BetMinus', this.config.visual.minusIcon, -285, -457, 54, () => this.changeBet(-1), this.machineUi);
        this.createIconButton('BetPlus', this.config.visual.plusIcon, -125, -457, 54, () => this.changeBet(1), this.machineUi);
        this.betLabel = this.createLabel('50', this.machineUi, 18, new Color(255, 239, 183), -205, -457, 66, 30);
        this.styleLabel(this.betLabel, new Color(86, 30, 27), 2, new Color(255, 194, 54, 120));

        // The cabinet artwork has a dedicated emerald spin well on its exact
        // centreline, so the control and its aura share x = 0.
        this.spinButton = this.createIconButton('Spin', this.config.visual.spinIcon, 0, -458, 120, () => void this.spin(), this.machineUi);
        this.autoButton = this.createIconButton('Auto', this.config.visual.autoIcon, 250, -458, 80, () => this.toggleAuto(), this.machineUi);
        this.autoLabel = this.createLabel('AUTO', this.machineUi, 14, new Color(255, 239, 183), 250, -512, 110, 26);
        const aura = this.createOutline('SpinAura', this.machineUi, 136, 136, new Color(255, 221, 105, 205), 0, -458, 68, 4);
        aura.setSiblingIndex(Math.max(0, this.spinButton.getSiblingIndex()));
        const opacity = aura.addComponent(UIOpacity);
        tween(aura)
            .to(1.05, { scale: new Vec3(1.06, 1.06, 1), angle: 8 }, { easing: 'sineInOut' })
            .to(1.05, { scale: Vec3.ONE, angle: 0 }, { easing: 'sineInOut' })
            .union().repeatForever().start();
        tween(opacity).to(1.05, { opacity: 92 }).to(1.05, { opacity: 220 }).union().repeatForever().start();
    }

    private buildFooter(): void {
        this.resultLabel = this.createLabel('CHOOSE YOUR BET · PRESS SPIN', this.machineUi, 16, new Color(255, 242, 198), 0, -570, 620, 38);
        this.styleLabel(this.resultLabel, new Color(91, 28, 30), 2, new Color(255, 190, 51, 120));
        const footer = this.createLabel('1024 WAYS  •  CASH COINS  •  COLLECTOR CHEST', this.machineUi, 13, new Color(255, 220, 156), 0, -620, 610, 28);
        footer.spacingX = 1;
        this.createLabel('S10  SOVEREIGN TREASURY', this.machineUi, 11, new Color(124, 63, 42), 0, -651, 300, 24);
    }

    private applyGrid(grid: SymbolConfig[][], cashCells: CashCell[]): void {
        this.pendingCash.clear();
        cashCells.forEach((cell) => this.pendingCash.set(`${cell.reel}:${cell.row}`, cell));
        for (let reel = 0; reel < this.config.columns; reel += 1) {
            for (let row = 0; row < this.config.rows; row += 1) {
                this.applyCell(reel, row, grid[reel][row]);
                const node = this.cells[reel][row].node;
                node.setPosition(0, 2);
                node.setScale(Vec3.ONE);
                node.angle = 0;
                const opacity = node.getComponent(UIOpacity);
                if (opacity) opacity.opacity = 255;
            }
        }
    }

    private applyCell(reel: number, row: number, symbol: SymbolConfig): void {
        const sprite = this.cells[reel][row];
        sprite.spriteFrame = this.frames.get(symbol.texture) ?? null;
        sprite.color = Color.WHITE;
        sprite.node.name = `Symbol_${symbol.id}`;
        const cashLabel = this.cashLabels[reel][row];
        const cash = this.pendingCash.get(`${reel}:${row}`);
        cashLabel.node.active = symbol.kind === 'coin' && Boolean(cash);
        if (cash) cashLabel.string = `${cash.multiplier}×`;
    }

    private async spin(): Promise<void> {
        if (this.state.kind !== 'idle') return;
        if (this.balance < this.currentBet) {
            this.openRecharge();
            return;
        }
        this.balance -= this.currentBet;
        this.saveBalance();
        this.state = { kind: 'spinning' };
        this.refreshHud();
        this.collectLabel.string = 'SEARCHING THE TREASURY';
        this.resultLabel.string = 'REELS IN MOTION';
        this.play(this.spinClip, 0.48);

        const outcome = PayoutCalculator.createOutcome(this.config, this.currentBet);
        this.pendingCash.clear();
        outcome.cashCells.forEach((cell) => this.pendingCash.set(`${cell.reel}:${cell.row}`, cell));
        await this.animateReels(outcome);
        this.grid = outcome.grid;
        this.state = { kind: 'evaluating' };

        if (outcome.waysWin > 0) await this.presentWays(outcome);
        if (outcome.collectWin > 0) await this.presentCollection(outcome);
        if (outcome.totalWin > 0) {
            await this.presentWin(outcome.totalWin, outcome.collectWin > 0);
        } else {
            this.resultLabel.string = outcome.cashCells.length > 0 ? 'CASH COINS NEED A COLLECTOR' : 'NO WIN · TRY AGAIN';
            this.collectLabel.string = 'LAND CASH COINS + COLLECTOR';
        }

        this.state = { kind: 'idle' };
        this.refreshHud();
        if (this.autoEnabled) this.scheduleOnce(() => void this.spin(), 0.82);
    }

    private async animateReels(outcome: SpinOutcome): Promise<void> {
        const tasks: Promise<void>[] = [];
        for (let reel = 0; reel < this.config.columns; reel += 1) {
            tasks.push(this.spinReel(reel, outcome.grid[reel]));
        }
        await Promise.all(tasks);
    }

    private async spinReel(reelIndex: number, target: SymbolConfig[]): Promise<void> {
        const reel = this.reels[reelIndex];
        const baseX = reel.position.x;
        Tween.stopAllByTarget(reel);
        // sineOut pull-back loads the strip; backOut on the final return gives
        // the reel a restrained mechanical settle instead of a hard stop.
        await this.runTween(reel, tween(reel).to(0.075, { position: new Vec3(baseX, 15, 0) }, { easing: 'sineOut' }));
        const duration = this.config.minSpinDuration + reelIndex * this.config.reelStopDelay;
        const ticks = Math.max(8, Math.round(duration / 0.055));
        const spinPool = this.config.symbols.filter((symbol) => symbol.kind === 'regular' || symbol.kind === 'wild');
        for (let tick = 0; tick < ticks; tick += 1) {
            for (let row = 0; row < this.config.rows; row += 1) {
                const symbol = PayoutCalculator.pickWeighted(spinPool);
                const sprite = this.cells[reelIndex][row];
                const symbolNode = sprite.node;
                Tween.stopAllByTarget(symbolNode);
                sprite.spriteFrame = this.frames.get(symbol.texture) ?? null;
                symbolNode.setPosition(0, 22);
                symbolNode.setScale(0.94, 1.08, 1);
                const opacity = symbolNode.getComponent(UIOpacity)!;
                Tween.stopAllByTarget(opacity);
                opacity.opacity = 190;
                tween(symbolNode)
                    .to(0.052, { position: new Vec3(0, -16, 0), scale: new Vec3(0.98, 1.04, 1) }, { easing: 'linear' })
                    .start();
                tween(opacity).to(0.052, { opacity: 238 }, { easing: 'sineOut' }).start();
                this.cashLabels[reelIndex][row].node.active = false;
            }
            await this.delay(48 + Math.min(28, tick * 1.45));
        }
        for (let row = 0; row < this.config.rows; row += 1) {
            this.applyCell(reelIndex, row, target[row]);
            const symbolNode = this.cells[reelIndex][row].node;
            Tween.stopAllByTarget(symbolNode);
            symbolNode.setPosition(0, -20);
            symbolNode.setScale(0.9, 1.12, 1);
            symbolNode.getComponent(UIOpacity)!.opacity = 255;
        }
        await this.runTween(reel, tween(reel)
            .to(0.19, { position: new Vec3(baseX, -22, 0) }, { easing: 'sineOut' })
            .to(0.16, { position: new Vec3(baseX, 0, 0) }, { easing: 'backOut' }));
        for (let row = 0; row < this.config.rows; row += 1) {
            tween(this.cells[reelIndex][row].node)
                .to(0.16, { position: new Vec3(0, 2, 0), scale: Vec3.ONE }, { easing: 'backOut' })
                .start();
        }
        this.reelStopBurst(reelIndex);
    }

    private async presentWays(outcome: SpinOutcome): Promise<void> {
        const first = outcome.wins[0];
        this.resultLabel.string = `${first.reelCount} REELS · ${first.ways} WAYS · +${outcome.waysWin}`;
        outcome.winningCells.forEach((cell, index) => {
            const node = this.cells[cell.reel][cell.row].node;
            this.paintCell(cell.reel, cell.row, new Color(117, 27, 48, 220));
            tween(node)
                .delay(index * 0.025)
                .to(0.16, { scale: new Vec3(1.14, 1.14, 1), angle: index % 2 ? 3 : -3 }, { easing: 'backOut' })
                .to(0.18, { scale: Vec3.ONE, angle: 0 }, { easing: 'sineOut' })
                .start();
        });
        this.burstAt(0, 6, Math.min(22, 8 + outcome.winningCells.length));
        await this.delay(620);
        this.resetCellColors();
    }

    private async presentCollection(outcome: SpinOutcome): Promise<void> {
        this.collectLabel.string = `COLLECTOR FOUND · ${outcome.cashCells.length} CASH COINS`;
        for (const collector of outcome.collectorCells) {
            const node = this.cells[collector.reel][collector.row].node;
            tween(node)
                .to(0.18, { scale: new Vec3(1.22, 1.22, 1), angle: -4 }, { easing: 'backOut' })
                .to(0.2, { scale: Vec3.ONE, angle: 0 }, { easing: 'sineOut' })
                .start();
            this.paintCell(collector.reel, collector.row, new Color(139, 31, 48, 235));
        }
        await this.delay(360);
        for (let index = 0; index < outcome.cashCells.length; index += 1) {
            const cell = outcome.cashCells[index];
            this.scheduleOnce(() => this.flyCashToCollector(cell), index * 0.105);
        }
        this.play(this.coinClip, 0.58);
        await this.delay(720 + outcome.cashCells.length * 105);
        this.treasuryMeter = (this.treasuryMeter + outcome.cashCells.length) % 20;
        this.refreshHud();
        this.collectLabel.string = `CASH COLLECTED · +${outcome.collectWin}`;
        this.burstAt(0, -303, 28);
        this.resetCellColors();
    }

    private flyCashToCollector(cell: CashCell): void {
        const coin = this.config.symbols.find((symbol) => symbol.kind === 'coin');
        if (!coin) return;
        const startX = this.reels[cell.reel].position.x;
        const startY = this.reelPanel.position.y + this.rowY(cell.row);
        const node = this.createSprite('CollectedCash', this.fxLayer, 72, 72, startX, startY, coin.texture);
        node.setScale(0.82, 0.82, 1);
        const value = this.createLabel(`+${cell.value}`, this.fxLayer, 17, new Color(255, 244, 192), startX, startY - 42, 110, 28);
        this.styleLabel(value, new Color(75, 28, 27), 2, new Color(255, 201, 59, 140));
        tween(node)
            .to(0.22, { position: new Vec3(startX * 0.58, startY + 85, 0), scale: new Vec3(1.05, 1.05, 1), angle: 110 }, { easing: 'sineOut' })
            .to(0.42, { position: new Vec3(0, -303, 0), scale: new Vec3(0.22, 0.22, 1), angle: 360 }, { easing: 'quadIn' })
            .call(() => node.destroy())
            .start();
        const opacity = value.node.addComponent(UIOpacity);
        tween(value.node).to(0.5, { position: new Vec3(startX * 0.55, startY + 110, 0) }, { easing: 'sineOut' }).call(() => value.node.destroy()).start();
        tween(opacity).delay(0.24).to(0.26, { opacity: 0 }).start();
    }

    private async presentWin(amount: number, cashCollect: boolean): Promise<void> {
        this.state = { kind: 'presenting', skippable: true };
        const oldBalance = this.balance;
        this.balance += amount;
        this.saveBalance();
        this.resultLabel.string = `${cashCollect ? 'TREASURY COLLECT' : 'WAYS WIN'} · +${amount}`;
        if (amount >= this.currentBet * 8 || cashCollect) this.showPremiumWinStage(amount, cashCollect);
        this.streamCoinsToBalance(Math.min(34, 12 + Math.round(amount / Math.max(1, this.currentBet))));
        this.play(this.winClip, 0.62);
        await this.countBalance(oldBalance, this.balance, 1.35);
        await this.delay(amount >= this.currentBet * 8 ? 850 : 360);
    }

    private showPremiumWinStage(amount: number, cashCollect: boolean): void {
        const root = new Node('PremiumWin');
        this.machineUi.addChild(root);
        this.ensureTransform(root, this.authoredWidth, this.authoredHeight);
        root.addComponent(BlockInputEvents);
        const opacity = root.addComponent(UIOpacity);
        opacity.opacity = 0;
        this.createPanel('WinDim', root, this.authoredWidth, this.authoredHeight, new Color(56, 10, 24, 150), 0, 0, 0);
        const stage = this.createSprite('VaultWinStage', root, 760, 507, 0, 45, this.config.visual.winStage);
        stage.setScale(0.72, 0.72, 1);
        const headline = this.createLabel(cashCollect ? 'TREASURY COLLECT' : 'SOVEREIGN WIN', root, 42, new Color(255, 247, 211), 0, 96, 570, 62);
        this.styleLabel(headline, new Color(93, 31, 26), 4, new Color(255, 201, 62, 190));
        headline.node.setScale(0.55, 0.55, 1);
        const value = this.createLabel(amount.toLocaleString('en-US'), root, 62, new Color(255, 211, 77), 0, 24, 520, 82);
        this.styleLabel(value, new Color(71, 32, 18), 4, new Color(255, 236, 151, 210));
        tween(opacity).to(0.2, { opacity: 255 }).delay(1.85).to(0.25, { opacity: 0 }).call(() => root.destroy()).start();
        tween(stage).to(0.38, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        tween(headline.node).delay(0.08).to(0.5, { scale: Vec3.ONE }, { easing: 'elasticOut' }).start();
        for (let index = 0; index < 32; index += 1) this.scheduleOnce(() => this.spawnWinCoin(root, index), index * 0.04);
    }

    private changeBet(direction: number): void {
        if (this.state.kind !== 'idle') return;
        this.betIndex = Math.max(0, Math.min(this.config.betOptions.length - 1, this.betIndex + direction));
        this.refreshHud();
        this.toast(`BET SET TO ${this.currentBet}`);
    }

    private toggleAuto(): void {
        this.autoEnabled = !this.autoEnabled;
        this.autoLabel.string = this.autoEnabled ? 'STOP' : 'AUTO';
        this.autoButton.setScale(this.autoEnabled ? new Vec3(1.08, 1.08, 1) : Vec3.ONE);
        this.toast(this.autoEnabled ? 'AUTO SPINS ACTIVE' : 'AUTO SPINS STOPPED');
        if (this.autoEnabled && this.state.kind === 'idle') void this.spin();
    }

    private toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        sys.localStorage.setItem(this.soundKey, this.soundEnabled ? 'on' : 'off');
        this.refreshSoundButton();
        this.toast(this.soundEnabled ? 'SOUND ON' : 'SOUND MUTED');
    }

    private refreshSoundButton(): void {
        if (!this.soundButton?.isValid) return;
        const sprite = this.soundButton.getComponent(Sprite);
        if (sprite) sprite.color = this.soundEnabled ? Color.WHITE : new Color(155, 135, 122, 255);
        this.soundButton.setScale(this.soundEnabled ? Vec3.ONE : new Vec3(0.9, 0.9, 1));
    }

    private openRules(): void {
        if (this.modal?.isValid) return;
        const modal = this.createModal('RulesModal');
        this.modal = modal;
        const title = this.createLabel('HOW TO PLAY', modal, 40, new Color(255, 244, 199), 0, 520, 560, 64);
        this.styleLabel(title, new Color(91, 28, 31), 3, new Color(255, 193, 48, 145));
        this.createLabel('SOVEREIGN TREASURY · CASH COLLECT', modal, 17, new Color(139, 255, 213), 0, 470, 570, 34);
        const rules = [
            ['1', 'SPIN 5 × 4 REELS', 'Wins pay left to right on adjacent reels across 1,024 ways.'],
            ['2', 'LAND CASH COINS', 'Gold coin orbs on reels 1–4 carry a visible bet multiplier.'],
            ['3', 'FIND THE COLLECTOR', 'A Collector Chest on reel 5 gathers every visible Cash Coin.'],
            ['4', 'DOUBLE COLLECT', 'Two Collector Chests collect the complete cash total twice.'],
            ['5', 'VAULT WILD', 'The diamond vault substitutes for all regular treasure symbols.'],
        ];
        rules.forEach((rule, index) => {
            const y = 340 - index * 144;
            this.createPanel(`Rule_${index}`, modal, 600, 116, new Color(11, 69, 53, 242), 0, y, 22);
            this.createOutline('RuleEdge', modal, 600, 116, new Color(241, 206, 104, 125), 0, y, 22, 2);
            this.createPanel('RuleNumber', modal, 56, 56, new Color(244, 199, 76), -252, y + 8, 28);
            this.createLabel(rule[0], modal, 25, new Color(70, 28, 27), -252, y + 8, 48, 48);
            const heading = this.createLabel(rule[1], modal, 18, new Color(255, 237, 176), 40, y + 26, 480, 32);
            heading.horizontalAlign = Label.HorizontalAlign.LEFT;
            const body = this.createLabel(rule[2], modal, 17, new Color(221, 255, 239), 40, y - 18, 480, 54);
            body.horizontalAlign = Label.HorizontalAlign.LEFT;
            body.enableWrapText = true;
        });
        this.createTextButton('CLOSE', 0, -506, 210, 62, 18, () => this.closeModal(), modal);
    }

    private openRecharge(): void {
        if (this.modal?.isValid || this.state.kind !== 'idle') return;
        const modal = this.createModal('RechargeModal');
        this.modal = modal;
        const title = this.createLabel('PRIVATE CREDIT RESERVE', modal, 35, new Color(255, 244, 199), 0, 514, 610, 62);
        this.styleLabel(title, new Color(91, 28, 31), 3, new Color(255, 193, 48, 145));
        this.createLabel('SELECT A DEMO CREDIT PACKAGE', modal, 16, new Color(151, 255, 218), 0, 466, 470, 34);
        const packs = [
            { amount: 1200, symbol: 'gold-ingots', name: 'GOLD RESERVE' },
            { amount: 3200, symbol: 'emerald-lockbox', name: 'EMERALD ACCOUNT' },
            { amount: 9000, symbol: 'collector-chest', name: 'SOVEREIGN VAULT' },
        ];
        packs.forEach((pack, index) => {
            const y = 285 - index * 244;
            const card = this.createPanel(`Pack_${pack.amount}`, modal, 600, 198, new Color(10, 68, 52, 245), 0, y, 26);
            this.createOutline('PackEdge', card, 592, 190, new Color(246, 207, 93, 165), 0, 0, 23, 3);
            const symbol = this.config.symbols.find((item) => item.id === pack.symbol)!;
            this.createSprite('PackArt', card, 126, 126, -207, 0, symbol.texture);
            const name = this.createLabel(pack.name, card, 18, new Color(255, 239, 182), 70, 42, 320, 34);
            name.horizontalAlign = Label.HorizontalAlign.LEFT;
            const amount = this.createLabel(`+${pack.amount.toLocaleString('en-US')} CREDITS`, card, 24, new Color(137, 255, 210), 70, 2, 320, 40);
            amount.horizontalAlign = Label.HorizontalAlign.LEFT;
            this.createTextButton('ADD', 155, -55, 128, 48, 16, () => {
                this.balance += pack.amount;
                this.saveBalance();
                this.refreshHud();
                this.play(this.coinClip, 0.55);
                this.closeModal();
                this.toast(`${pack.amount.toLocaleString('en-US')} CREDITS ADDED`);
            }, card);
        });
        this.createTextButton('CLOSE', 0, -508, 210, 62, 18, () => this.closeModal(), modal);
    }

    private createModal(name: string): Node {
        const modal = new Node(name);
        this.node.addChild(modal);
        this.ensureTransform(modal, this.sceneWidth, this.sceneHeight);
        modal.addComponent(BlockInputEvents);
        this.createPanel('ModalDim', modal, this.sceneWidth, this.sceneHeight, new Color(69, 15, 29, 210), 0, 0, 0);
        const sheet = this.createPanel('ModalSheet', modal, 680, 1190, new Color(7, 52, 40, 252), 0, 0, 40);
        this.createOutline('ModalGoldEdge', sheet, 670, 1180, new Color(249, 215, 112, 220), 0, 0, 36, 5);
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
        if (this.betLabel) this.betLabel.string = this.currentBet.toLocaleString('en-US');
        if (this.collectFill) this.collectFill.setScale(Math.max(0.015, this.treasuryMeter / 20), 1, 1);
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
        tween(this.titleNode)
            .to(1.7, { position: new Vec3(0, 517, 0), scale: new Vec3(1.018, 1.018, 1) }, { easing: 'sineInOut' })
            .to(1.7, { position: new Vec3(0, 512, 0), scale: Vec3.ONE }, { easing: 'sineInOut' })
            .union().repeatForever().start();
        const loop = (): void => {
            if (version !== this.animationVersion || !this.fxLayer?.isValid) return;
            const side = Math.random() > 0.5 ? 1 : -1;
            this.spawnSpark(side * (280 + Math.random() * 90), -230 + Math.random() * 750, 6 + Math.random() * 9);
            this.scheduleOnce(loop, 0.26 + Math.random() * 0.42);
        };
        loop();
    }

    private reelStopBurst(reel: number): void {
        const x = this.reels[reel].position.x;
        for (let index = 0; index < 7; index += 1) {
            this.scheduleOnce(() => this.spawnSpark(x + (Math.random() - 0.5) * 70, 210 - Math.random() * 420, 7 + Math.random() * 9), index * 0.024);
        }
    }

    private burstAt(x: number, y: number, count: number): void {
        for (let index = 0; index < count; index += 1) {
            this.scheduleOnce(() => this.spawnSpark(x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 72, 8 + Math.random() * 11), index * 0.016);
        }
    }

    private spawnSpark(x: number, y: number, size: number): void {
        if (!this.fxLayer?.isValid) return;
        const spark = new Node('GemSpark');
        this.fxLayer.addChild(spark);
        spark.setPosition(x, y);
        this.ensureTransform(spark, size, size);
        const graphics = spark.addComponent(Graphics);
        graphics.fillColor = Math.random() > 0.28 ? new Color(255, 211, 89, 230) : new Color(125, 255, 211, 220);
        graphics.circle(0, 0, size / 2);
        graphics.fill();
        const opacity = spark.addComponent(UIOpacity);
        spark.setScale(0.25, 0.25, 1);
        tween(spark)
            .to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' })
            .to(0.56, { position: new Vec3(x + (Math.random() - 0.5) * 32, y + 58 + Math.random() * 58, 0), scale: new Vec3(0.08, 0.08, 1) }, { easing: 'sineOut' })
            .call(() => spark.destroy())
            .start();
        tween(opacity).delay(0.2).to(0.48, { opacity: 0 }).start();
    }

    private streamCoinsToBalance(count: number): void {
        const coin = this.config.symbols.find((symbol) => symbol.kind === 'coin');
        if (!coin) return;
        for (let index = 0; index < count; index += 1) {
            this.scheduleOnce(() => {
                if (!this.fxLayer?.isValid) return;
                const startX = -280 + Math.random() * 560;
                const startY = -80 + Math.random() * 280;
                const node = this.createSprite('BalanceCoin', this.fxLayer, 42, 42, startX, startY, coin.texture);
                node.setScale(0.4, 0.4, 1);
                tween(node)
                    .to(0.17, { scale: Vec3.ONE }, { easing: 'backOut' })
                    .to(0.62 + Math.random() * 0.2, { position: new Vec3(20, 348, 0), scale: new Vec3(0.16, 0.16, 1), angle: 300 + Math.random() * 220 }, { easing: 'quadIn' })
                    .call(() => node.destroy())
                    .start();
            }, index * 0.032);
        }
        this.play(this.coinClip, 0.45);
    }

    private spawnWinCoin(parent: Node, index: number): void {
        if (!parent.isValid) return;
        const coin = this.config.symbols.find((symbol) => symbol.kind === 'coin');
        if (!coin) return;
        const x = -350 + Math.random() * 700;
        const node = this.createSprite(`WinCoin_${index}`, parent, 48, 48, x, 600 + Math.random() * 130, coin.texture);
        tween(node)
            .to(1.0 + Math.random() * 0.5, { position: new Vec3(x + (Math.random() - 0.5) * 120, -610, 0), angle: 360 + Math.random() * 540 }, { easing: 'quadIn' })
            .call(() => node.destroy())
            .start();
    }

    private async countBalance(from: number, to: number, seconds: number): Promise<void> {
        const holder = { value: from };
        tween(this.coinLabel.node)
            .to(0.12, { scale: new Vec3(1.055, 1.055, 1) }, { easing: 'sineOut' })
            .to(0.14, { scale: Vec3.ONE }, { easing: 'sineIn' })
            .union().repeat(Math.max(1, Math.floor(seconds / 0.26))).start();
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

    private toast(message: string): void {
        const toast = this.createPanel('Toast', this.node, 500, 58, new Color(9, 67, 51, 246), 0, -560, 29);
        this.createOutline('ToastEdge', toast, 494, 52, new Color(248, 213, 106, 190), 0, 0, 26, 2);
        this.createLabel(message, toast, 16, new Color(255, 241, 190), 0, 0, 460, 40);
        const opacity = toast.addComponent(UIOpacity);
        opacity.opacity = 0;
        toast.setPosition(0, -580);
        tween(opacity).to(0.16, { opacity: 255 }).delay(1.15).to(0.2, { opacity: 0 }).start();
        tween(toast).to(0.22, { position: new Vec3(0, -545, 0) }, { easing: 'backOut' }).delay(1.15).call(() => toast.destroy()).start();
    }

    private createIconButton(name: string, path: string, x: number, y: number, size: number, handler: () => void, parent = this.machineUi): Node {
        const node = this.createSprite(`${name}Button`, parent, size, size, x, y, path);
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        node.on(Node.EventType.TOUCH_END, () => {
            handler();
            if (parent === this.machineUi) this.burstAt(x, y, 4);
        }, this);
        return node;
    }

    private createTextButton(text: string, x: number, y: number, width: number, height: number, fontSize: number, handler: () => void, parent = this.machineUi): Node {
        const node = this.createPanel(`Button_${text}`, parent, width, height, new Color(17, 102, 77, 255), x, y, Math.min(width, height) / 2);
        this.createOutline('ButtonGold', node, width - 4, height - 4, new Color(248, 214, 107, 230), 0, 0, Math.min(width, height) / 2 - 2, 4);
        const label = this.createLabel(text, node, fontSize, new Color(255, 243, 198), 0, 1, width - 10, height - 8);
        this.styleLabel(label, new Color(65, 27, 28), 2, new Color(255, 190, 44, 130));
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

    private paintCell(reel: number, row: number, color: Color): void {
        const graphics = this.cellBacks[reel][row];
        graphics.clear();
        graphics.fillColor = color;
        graphics.roundRect(-52, -56, 104, 112, 15);
        graphics.fill();
    }

    private resetCellColors(): void {
        for (let reel = 0; reel < this.config.columns; reel += 1) {
            for (let row = 0; row < this.config.rows; row += 1) this.paintCell(reel, row, new Color(10, 72, 56, 174));
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
        globalThis.dispatchEvent(new CustomEvent('sovereign-treasury-ready'));
        (globalThis as typeof globalThis & { __SOVEREIGN_TREASURY_READY__?: boolean }).__SOVEREIGN_TREASURY_READY__ = true;
    }
}
