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
    Mask,
    Node,
    Rect,
    ResolutionPolicy,
    resources,
    Size,
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
import {
    FALLBACK_CATALOG,
    FALLBACK_CONFIG,
    GameConfig,
    SymbolConfig,
    ThemeCatalog,
} from './GameConfig';
import { PayoutCalculator, SpinOutcome, WinningCell } from './PayoutCalculator';

const { ccclass } = _decorator;

interface LoadingView {
    root: Node;
    emblem: Node;
    fill: Node;
    fillGlow: Node;
    progress: Label;
    status: Label;
    foodIcons: Node[];
}

@ccclass('SlotGame')
export class SlotGame extends Component {
    private readonly soundStorageKey = 'slot-factory-v2-sound';
    private readonly useRuntimeSpriteFx = true;
    private readonly designWidth = 750;
    private readonly designHeight = 1624;
    private sceneWidth = 750;
    private sceneHeight = 1624;
    private config: GameConfig = FALLBACK_CONFIG;
    private coins = 1000;
    private betIndex = 0;
    private spinning = false;
    private autoSpinning = false;
    private soundEnabled = true;
    private cells: Sprite[][] = [];
    private reelColumns: Node[] = [];
    private symbolFrames = new Map<string, SpriteFrame>();
    private fxFrames = new Map<string, SpriteFrame>();
    private preloadedFrames = new Map<string, SpriteFrame>();
    private topCoinFrame: SpriteFrame | null = null;
    private coinLabel!: Label;
    private jackpotLabel!: Label;
    private coinMeterLabel!: Label;
    private freeSpinLabel!: Label;
    private betLabel!: Label;
    private resultLabel!: Label;
    private resultShadowLabel!: Label;
    private spinButton!: Node;
    private autoButton!: Node;
    private autoButtonLabel!: Label;
    private soundButton!: Node;
    private soundButtonLabel!: Label;
    private rulesOverlay: Node | null = null;
    private rechargeOverlay: Node | null = null;
    private spinGlow!: Node;
    private spinAura!: Node;
    private winLine!: Node;
    private reelPanel!: Node;
    private reelFxClip!: Node;
    private titleNode!: Node;
    private marqueeLights: UIOpacity[] = [];
    private audioSource!: AudioSource;
    private spinClip: AudioClip | null = null;
    private winClip: AudioClip | null = null;
    private coinClip: AudioClip | null = null;
    private fxVersion = 0;
    private suppressIdleUntil = 0;
    private coinCollection = 0;
    private freeSpinsRemaining = 0;
    private jackpotValue = 25000;

    private get rowCount(): number {
        return this.config.rowCount ?? 4;
    }

    private get maxMultiplier(): number {
        return Math.max(...this.config.symbols.map((symbol) => symbol.multiplier));
    }

    private get bigWinMultiplier(): number {
        return this.config.winTiers?.bigWinMultiplier ?? 15;
    }

    private get jackpotMultiplier(): number {
        return this.config.winTiers?.jackpotMultiplier ?? 30;
    }

    private get loadingBackgroundPath(): string {
        return this.config.visual.loadingBackground ?? this.config.visual.background;
    }

    private get loadingMascotPath(): string {
        if (this.config.visual.loadingMascot) return this.config.visual.loadingMascot;
        const premiumSymbol = [...this.config.symbols]
            .sort((left, right) => right.multiplier - left.multiplier)[0];
        return premiumSymbol?.texture ?? this.config.visual.topCoin;
    }

    private get loadingFoodPaths(): string[] {
        const configured = this.config.visual.loadingFoods?.filter(Boolean) ?? [];
        return configured.length > 0
            ? configured
            : this.config.symbols.map((symbol) => symbol.texture);
    }

    private get loadingDecorationPaths(): string[] {
        const configured = this.config.visual.loadingDecorations?.filter(Boolean) ?? [];
        if (configured.length > 0) return configured;
        const symbols = this.config.symbols.map((symbol) => symbol.texture);
        if (symbols.length === 0) return [];
        return Array.from({ length: 12 }, (_, index) => symbols[index % symbols.length]);
    }

    private copyText(key: keyof NonNullable<GameConfig['copy']>, fallback: string): string {
        const value = this.config.copy?.[key];
        return typeof value === 'string' && value.trim() ? value : fallback;
    }

    protected start(): void {
        view.resizeWithBrowserSize(true);
        const frameSize = view.getFrameSize();
        const frameAspect = frameSize.width / Math.max(1, frameSize.height);
        const designAspect = this.designWidth / this.designHeight;
        const policy = frameAspect >= designAspect
            ? ResolutionPolicy.FIXED_HEIGHT
            : ResolutionPolicy.FIXED_WIDTH;
        view.setDesignResolutionSize(this.designWidth, this.designHeight, policy);
        this.sceneWidth = frameAspect >= designAspect
            ? this.designHeight * frameAspect
            : this.designWidth;
        this.sceneHeight = frameAspect >= designAspect
            ? this.designHeight
            : this.designWidth / frameAspect;
        const sceneCamera = this.node.getChildByName('Camera')?.getComponent(Camera);
        if (sceneCamera) sceneCamera.clearColor = new Color(90, 7, 24, 255);
        // Do not return the boot promise to Cocos. If start() stays async, the
        // engine splash remains above our branded loader until loading is over.
        void this.initializeGame();
    }

    private async initializeGame(): Promise<void> {
        const catalog: ThemeCatalog = await this.loadJson('config/themes', FALLBACK_CATALOG);
        this.config = await this.loadJson(`config/${catalog.defaultTheme}`, FALLBACK_CONFIG);
        this.soundEnabled = sys.localStorage.getItem(this.soundStorageKey) !== 'off';
        this.betIndex = Math.max(0, this.config.betOptions.indexOf(this.config.defaultBet));
        this.coins = this.readCoins();
        // Preload only the artwork that must be present on the first branded
        // loading frame. Secondary decorations and gameplay FX continue to
        // stream while the visible progress animation is running.
        await this.preloadLoadingArtwork();
        await this.rebuildGame(true);
    }

    private async preloadLoadingArtwork(): Promise<void> {
        const visual = this.config.visual;
        const paths = [
            this.loadingBackgroundPath,
            visual.loadingLogo,
            this.loadingMascotPath,
            ...this.loadingFoodPaths,
        ].filter((path): path is string => Boolean(path));
        await Promise.all(Array.from(new Set(paths)).map(async (path) => {
            const frame = await this.loadResource(path, SpriteFrame);
            if (frame) this.preloadedFrames.set(path, frame);
        }));
    }

    private applyPreloadedFrame(node: Node, path?: string, color?: Color): void {
        if (!path) return;
        const frame = this.preloadedFrames.get(path);
        const sprite = node.getComponent(Sprite);
        if (!frame || !sprite) return;
        sprite.spriteFrame = frame;
        if (color) sprite.color = color;
    }

    private loadJson<T>(path: string, fallback: T): Promise<T> {
        return new Promise((resolve) => {
            resources.load(path, JsonAsset, (error, asset) => {
                if (error || !asset?.json) {
                    console.warn(`Using fallback configuration for ${path}`, error);
                    resolve(fallback);
                    return;
                }
                resolve(asset.json as unknown as T);
            });
        });
    }

    private async rebuildGame(showLoading = false): Promise<void> {
        this.fxVersion += 1;
        const version = this.fxVersion;
        this.cells = [];
        this.reelColumns = [];
        this.marqueeLights = [];
        this.symbolFrames.clear();
        this.fxFrames.clear();
        this.topCoinFrame = null;
        this.buildInterface();
        // Keep the branded HTML boot screen visible until the real game is
        // ready. Creating a second Cocos loading scene here made players sit
        // through two consecutive loading screens.
        await this.loadAssets();
        this.fillInitialGrid();
        this.refreshHud();
        if (showLoading) {
            this.hideWebBootOverlay();
            await this.delay(280);
        }
        void this.animateIdleGlow(this.spinGlow);
        void this.animateAmbientSparkles(version);
        void this.animateGoldDust(version);
        void this.animateMarqueeLights(version);
        void this.animateGoldenSweeps(version);
        void this.animateIdleSymbols(version);
        void this.animateTitleFloat(version);
        void this.animateVaultCoins(version);
        void this.animateSpinAura(version);
    }

    private hideWebBootOverlay(): void {
        if (typeof document === 'undefined') return;
        const bootOverlay = document.getElementById('rfBootLoader');
        if (!bootOverlay) return;
        // Wait one browser frame so the Cocos loading scene is already under
        // the DOM cover, then crossfade without exposing a black canvas frame.
        requestAnimationFrame(() => {
            bootOverlay.style.opacity = '0';
            window.setTimeout(() => bootOverlay.remove(), 260);
        });
    }

    private buildInterface(): void {
        for (const child of [...this.node.children]) {
            if (child.name !== 'Camera') {
                Tween.stopAllByTarget(child);
                child.destroy();
            }
        }
        this.ensureTransform(this.node, this.designWidth, this.sceneHeight);

        const visual = this.config.visual;
        const accent = this.color(visual.accent);
        const gold = this.color(visual.accentSecondary);
        const cream = new Color(255, 249, 226, 255);
        const ruby = new Color(130, 8, 34, 255);

        // SHOW_ALL exposes extra stage area on wide desktop screens. Paint it
        // inside Cocos so the camera never reveals black bars around the
        // portrait cabinet.
        this.createPanel(
            'WideScreenBackdrop',
            this.node,
            this.sceneWidth,
            this.sceneHeight,
            new Color(90, 7, 24, 255),
            0,
            0,
            0,
        );

        // The generated cabinet is the interface. Runtime controls are placed
        // directly into its empty marquee, balance slot, reel glass and
        // physical control wells instead of drawing a second cabinet on top.
        const background = this.createSpriteNode(
            'Background',
            this.node,
            this.designWidth,
            this.sceneHeight,
            0,
            0,
        );
        background.getComponent(Sprite)!.color = Color.WHITE;
        this.applyPreloadedFrame(background, visual.background);

        const titleLogo = new Node('TitleLogo');
        this.node.addChild(titleLogo);
        titleLogo.setPosition(0, 608);
        this.ensureTransform(titleLogo, 520, 176);
        if (visual.titleLogo) {
            this.createSpriteNode('TitleLogoArt', titleLogo, 500, 170, 0, 0);
        } else {
            const royalTitle = this.createLabel('ROYAL ASCENSION', titleLogo, 46, cream, 0, 15, 500, 66, true);
            this.styleArtLabel(royalTitle, ruby, 4, new Color(63, 4, 10, 180), 2, -4, 1);
            royalTitle.spacingX = 1;
            const wheelTitle = this.createLabel('W I L D   R E S P I N S', titleLogo, 20, gold, 0, -36, 430, 42, true);
            this.styleArtLabel(wheelTitle, new Color(84, 7, 18, 245), 2, new Color(40, 0, 8, 170), 2, -2, 1);
        }
        this.titleNode = titleLogo;

        const homeButton = new Node('HomeButton');
        this.node.addChild(homeButton);
        homeButton.setPosition(-322, 656);
        this.ensureTransform(homeButton, 86, 86);
        homeButton.addComponent(Button);
        homeButton.on(Button.EventType.CLICK, this.onHomePressed, this);
        this.bindPressMotion(homeButton);
        this.createSpriteNode('HomeButtonArt', homeButton, 82, 82, 0, 0);
        const homeLabel = this.createLabel('HOME', homeButton, 17, cream, 0, -52, 96, 28, true);
        homeLabel.enableOutline = true;
        homeLabel.outlineColor = ruby;
        homeLabel.outlineWidth = 2;
        const homeLabelHit = new Node('HomeLabelHitTarget');
        this.node.addChild(homeLabelHit);
        homeLabelHit.setPosition(-322, 604);
        this.ensureTransform(homeLabelHit, 104, 30);
        this.bindProxyButton(homeLabelHit, homeButton, () => this.onHomePressed());

        this.soundButton = new Node('SoundButton');
        this.node.addChild(this.soundButton);
        this.soundButton.setPosition(322, 656);
        this.ensureTransform(this.soundButton, 86, 86);
        this.soundButton.addComponent(Button);
        this.soundButton.on(Button.EventType.CLICK, () => this.toggleSound(), this);
        this.bindPressMotion(this.soundButton);
        this.createSpriteNode('SoundButtonArt', this.soundButton, 82, 82, 0, 0);
        this.soundButtonLabel = this.createLabel(
            this.soundEnabled ? this.copyText('soundOn', 'SOUND') : this.copyText('soundOff', 'MUTED'),
            this.soundButton,
            17,
            cream,
            0,
            -52,
            106,
            24,
            true,
        );
        this.soundButtonLabel.enableOutline = true;
        this.soundButtonLabel.outlineColor = ruby;
        this.soundButtonLabel.outlineWidth = 2;
        const soundLabelHit = new Node('SoundLabelHitTarget');
        this.node.addChild(soundLabelHit);
        soundLabelHit.setPosition(322, 604);
        this.ensureTransform(soundLabelHit, 108, 30);
        this.bindProxyButton(soundLabelHit, this.soundButton, () => this.toggleSound());

        const rulesButton = new Node('RulesButton');
        this.node.addChild(rulesButton);
        rulesButton.setPosition(322, 556);
        this.ensureTransform(rulesButton, 78, 78);
        rulesButton.addComponent(Button);
        rulesButton.on(Button.EventType.CLICK, () => this.toggleRules(), this);
        this.bindPressMotion(rulesButton);
        this.createSpriteNode('RulesButtonArt', rulesButton, 74, 74, 0, 0);
        const rulesLabel = this.createLabel(this.copyText('rulesLabel', 'RULES'), rulesButton, 17, cream, 0, -48, 100, 28, true);
        rulesLabel.enableOutline = true;
        rulesLabel.outlineColor = ruby;
        rulesLabel.outlineWidth = 2;
        const rulesLabelHit = new Node('RulesLabelHitTarget');
        this.node.addChild(rulesLabelHit);
        rulesLabelHit.setPosition(322, 508);
        this.ensureTransform(rulesLabelHit, 102, 30);
        this.bindProxyButton(rulesLabelHit, rulesButton, () => this.toggleRules());

        // Balance text uses the narrow ruby display that is already part of
        // the cabinet illustration. No backing rectangle is added here.
        const coinBar = new Node('CoinBar');
        this.node.addChild(coinBar);
        coinBar.setPosition(0, 536);
        this.ensureTransform(coinBar, 370, 104);
        // The balance belongs inside the long black glass display, not on top
        // of the title trim. Only the plus control remains in the small upper
        // hardware well that is painted into the cabinet.
        // Seat the coin artwork inside the cabinet's left circular bezel.
        // The whole balance group is raised so the amount and both side
        // controls share the painted oval's optical center.
        this.createSpriteNode('CoinIcon', coinBar, 42, 40, -100, 0);
        const balanceLabel = this.createLabel('CREDITS', coinBar, 14, new Color(255, 214, 101), 0, 16, 126, 24, true);
        balanceLabel.spacingX = 2;
        this.coinLabel = this.createLabel('2,500', coinBar, 30, Color.WHITE, 0, -12, 150, 42, true);
        this.coinLabel.enableOutline = true;
        this.coinLabel.outlineColor = new Color(2, 34, 25, 255);
        this.coinLabel.outlineWidth = 2;
        const coinPlus = new Node('CoinPlusButton');
        coinBar.addChild(coinPlus);
        coinPlus.setPosition(104, 0);
        this.ensureTransform(coinPlus, 44, 44);
        coinPlus.addComponent(Button);
        coinPlus.on(Button.EventType.CLICK, () => this.showRecharge(), this);
        this.bindPressMotion(coinPlus);
        this.createSpriteNode('CoinPlusArt', coinPlus, 42, 42, 0, 0);

        // GRAND is a separate cabinet meter so it never pushes the centered
        // credit group out of alignment.
        const grandMeter = new Node('GrandMeter');
        this.node.addChild(grandMeter);
        grandMeter.setPosition(0, -660);
        this.ensureTransform(grandMeter, 300, 46);
        this.jackpotLabel = this.createLabel('ASCENSION POT  25,000', grandMeter, 18, gold, 0, 0, 286, 36, true);
        this.jackpotLabel.enableOutline = true;
        this.jackpotLabel.outlineColor = new Color(86, 5, 20, 255);
        this.jackpotLabel.outlineWidth = 2;

        // Reel content is nested inside the cabinet's cream glass. The only
        // runtime surfaces are translucent symbol cards and one restrained
        // center-line highlight.
        this.reelPanel = new Node('ReelPanel');
        this.node.addChild(this.reelPanel);
        this.reelPanel.setPosition(0, 204);
        this.ensureTransform(this.reelPanel, 580, 552);
        const reelContentMask = this.reelPanel.addComponent(Mask);
        reelContentMask.type = Mask.Type.GRAPHICS_RECT;
        this.winLine = this.createPanel('WinLine', this.reelPanel, 574, 546, new Color(255, 196, 54, 5), 0, 0, 18);
        this.createOutlinePanel('ActivePayline', this.winLine, 568, 540, new Color(255, 211, 92, 54), 0, 0, 16, 2);
        const winLineOpacity = this.winLine.addComponent(UIOpacity);
        winLineOpacity.opacity = 48;

        const xPositions = [-236, -118, 0, 118, 236];
        const yPositions = [210, 70, -70, -210];
        for (let reel = 0; reel < 5; reel += 1) {
            const columnRoot = new Node(`Reel_${reel}`);
            this.reelPanel.addChild(columnRoot);
            columnRoot.setPosition(xPositions[reel], 0);
            this.ensureTransform(columnRoot, 116, 560);
            this.reelColumns.push(columnRoot);

            const column: Sprite[] = [];
            for (let row = 0; row < this.rowCount; row += 1) {
                const cell = this.createPanel(
                    `CellBg_${reel}_${row}`,
                    columnRoot,
                    112,
                    132,
                    new Color(255, 249, 229, row === 1 || row === 2 ? 26 : 16),
                    0,
                    yPositions[row],
                    22,
                );
                this.createOutlinePanel(
                    `CellOutline_${reel}_${row}`,
                    cell,
                    108,
                    128,
                    new Color(255, 214, 96, row === 1 || row === 2 ? 48 : 30),
                    0,
                    0,
                    12,
                    row === 1 || row === 2 ? 1.5 : 1,
                );
                const gloss = this.createPanel('CellGloss', cell, 84, 7, new Color(255, 255, 255, 34), 0, 50, 3);
                gloss.setSiblingIndex(0);
                const spriteNode = this.createSpriteNode(`Symbol_${reel}_${row}`, cell, 104, 122, 0, 0);
                column.push(spriteNode.getComponent(Sprite)!);
            }
            this.cells.push(column);
        }

        this.reelFxClip = new Node('ReelFxClip');
        this.reelPanel.addChild(this.reelFxClip);
        this.ensureTransform(this.reelFxClip, 578, 548);
        const reelMask = this.reelFxClip.addComponent(Mask);
        reelMask.type = Mask.Type.GRAPHICS_RECT;
        this.createCabinetReelForeground();
        coinBar.setSiblingIndex(this.node.children.length - 1);

        const idleText = this.copyText('idle', 'TAP SPIN TO PLAY');
        this.resultShadowLabel = this.createLabel(idleText, this.node, 21, new Color(255, 255, 255, 0), 0, -112, 520, 40, true);
        this.resultLabel = this.createLabel(idleText, this.node, 20, new Color(255, 245, 211), 0, -112, 520, 40, true);
        this.resultLabel.enableOutline = true;
        this.resultLabel.outlineColor = new Color(92, 8, 25, 255);
        this.resultLabel.outlineWidth = 2;
        this.coinMeterLabel = this.createLabel('WILD REELS  0/5', this.node, 16, gold, -148, -154, 290, 30, true);
        this.coinMeterLabel.enableOutline = true;
        this.coinMeterLabel.outlineColor = new Color(18, 9, 2, 230);
        this.coinMeterLabel.outlineWidth = 1;
        this.freeSpinLabel = this.createLabel('1024 WAYS', this.node, 16, new Color(235, 255, 247), 148, -154, 270, 30, true);
        this.freeSpinLabel.enableOutline = true;
        this.freeSpinLabel.outlineColor = new Color(18, 9, 2, 230);
        this.freeSpinLabel.outlineWidth = 1;

        // Left roller = bet decrement/increment. Center amber dome = spin.
        // Right silver dome = auto play. All three preserve the cabinet art.
        const betControl = new Node('BetControl');
        this.node.addChild(betControl);
        betControl.setPosition(-227, -260);
        this.ensureTransform(betControl, 150, 94);
        // Dark enamel button faces sit inside the cabinet's gold bezels so
        // the controls read clearly without covering the surrounding art.
        [['BetMinusButton', '−', -46, 0], ['BetPlusButton', '+', 46, 0]].forEach(([name, text, x, y]) => {
            const button = new Node(String(name));
            betControl.addChild(button);
            button.setPosition(Number(x), Number(y));
            this.ensureTransform(button, 46, 46);
            button.addComponent(Button);
            button.on(Button.EventType.CLICK, () => this.changeBet(String(text) === '+' ? 1 : -1), this);
            this.bindPressMotion(button);
            this.createCirclePanel('BetButtonFace', button, 42, new Color(82, 7, 24, 205), 0, 0);
            this.createCircleOutline('BetButtonRing', button, 40, new Color(255, 220, 113, 245), 0, 0, 2);
            const buttonLabel = this.createLabel(String(text), button, 29, Color.WHITE, 0, 3, 42, 40, true);
            buttonLabel.enableOutline = true;
            buttonLabel.outlineColor = new Color(91, 8, 29, 255);
            buttonLabel.outlineWidth = 3;
        });
        const betReadout = new Node('BetReadout');
        this.node.addChild(betReadout);
        betReadout.setPosition(-227, -326);
        this.ensureTransform(betReadout, 150, 36);
        this.createSpriteNode('BetButtonArt', betReadout, 30, 30, -48, 0);
        this.betLabel = this.createLabel('BET 20', betReadout, 20, cream, 16, 0, 116, 38, true);
        this.betLabel.enableOutline = true;
        this.betLabel.outlineColor = ruby;
        this.betLabel.outlineWidth = 2;

        // Keep the spin halo procedural. Some legacy FX atlases contain dark
        // pixels in their transparent padding, which appeared as a black
        // diamond behind the physical cabinet button on mobile GPUs.
        this.spinAura = new Node('SpinAura');
        this.node.addChild(this.spinAura);
        this.spinAura.setPosition(0, -260);
        this.ensureTransform(this.spinAura, 156, 156);
        this.spinAura.addComponent(UIOpacity).opacity = 52;
        this.createCircleOutline('SpinAuraOuterRing', this.spinAura, 148, new Color(255, 224, 107, 132), 0, 0, 3);
        this.createCircleOutline('SpinAuraInnerRing', this.spinAura, 138, new Color(255, 255, 255, 78), 0, 0, 2);
        for (let index = 0; index < 12; index += 1) {
            const angle = index * 30 * Math.PI / 180;
            this.createCirclePanel(
                `SpinAuraDot_${index}`,
                this.spinAura,
                index % 3 === 0 ? 6 : 4,
                index % 3 === 0 ? new Color(255, 255, 255, 220) : new Color(255, 224, 107, 184),
                Math.cos(angle) * 72,
                Math.sin(angle) * 72,
            );
        }
        this.spinGlow = this.createCircleOutline('SpinGlow', this.node, 118, new Color(255, 224, 107, 118), 0, -260, 4);
        this.spinGlow.addComponent(UIOpacity).opacity = 68;
        this.spinButton = new Node('SpinButton');
        this.node.addChild(this.spinButton);
        this.spinButton.setPosition(0, -260);
        this.ensureTransform(this.spinButton, 118, 118);
        this.spinButton.addComponent(Button);
        this.spinButton.on(Button.EventType.CLICK, this.onSpinPressed, this);
        this.bindPressMotion(this.spinButton);
        const spinLabel = this.createLabel(this.copyText('spinLabel', 'SPIN'), this.spinButton, 25, Color.WHITE, 0, -1, 118, 46, true);
        spinLabel.enableOutline = true;
        spinLabel.outlineColor = new Color(135, 45, 0, 255);
        spinLabel.outlineWidth = 3;

        this.autoButton = new Node('AutoButton');
        this.node.addChild(this.autoButton);
        this.autoButton.setPosition(255, -260);
        this.ensureTransform(this.autoButton, 150, 120);
        this.autoButton.addComponent(Button);
        this.autoButton.on(Button.EventType.CLICK, () => this.toggleAutoSpin(), this);
        this.bindPressMotion(this.autoButton);
        const autoArt = this.createSpriteNode('AutoButtonArt', this.autoButton, 38, 38, -42, -62);
        autoArt.getComponent(Sprite)!.color = new Color(255, 255, 255, 230);
        this.autoButtonLabel = this.createLabel(this.copyText('autoStart', 'AUTO'), this.autoButton, 20, cream, 15, -62, 94, 36, true);
        this.autoButtonLabel.enableOutline = true;
        this.autoButtonLabel.outlineColor = ruby;
        this.autoButtonLabel.outlineWidth = 3;
        const autoLabelHit = new Node('AutoLabelHitTarget');
        this.node.addChild(autoLabelHit);
        autoLabelHit.setPosition(255, -322);
        this.ensureTransform(autoLabelHit, 160, 46);
        this.bindProxyButton(autoLabelHit, this.autoButton, () => this.toggleAutoSpin());

        const footer = this.createLabel('1024 WAYS  •  EXPANDING WILDS  •  LOCKED RESPINS  •  ROYAL CHEST', this.node, 17, new Color(255, 244, 211), 0, -786, 700, 42, true);
        footer.enableOutline = true;
        footer.outlineColor = new Color(91, 18, 22, 230);
        footer.outlineWidth = 2;

        this.audioSource = this.node.getComponent(AudioSource) ?? this.node.addComponent(AudioSource);
        this.audioSource.volume = this.soundEnabled ? 1 : 0;
    }

    private buildLegacyInterface(): void {
        for (const child of [...this.node.children]) {
            if (child.name !== 'Camera') {
                Tween.stopAllByTarget(child);
                child.destroy();
            }
        }
        this.ensureTransform(this.node, this.designWidth, this.sceneHeight);

        const visual = this.config.visual;
        const layout = visual.layout ?? {};
        const titleY = layout.titleY ?? 548;
        const subtitleY = layout.subtitleY ?? 498;
        const coinBarY = layout.coinBarY ?? 422;
        const reelPanelY = layout.reelPanelY ?? 74;
        const resultY = layout.resultY ?? -246;
        const utilityY = layout.utilityY ?? -350;
        const controlsY = layout.controlsY ?? -468;
        const footerY = layout.footerY ?? -580;
        const accent = this.color(visual.accent);
        const accentSecondary = this.color(visual.accentSecondary);
        const panelColor = this.color(visual.panel, 238);
        const reelColor = this.color(visual.reelPanel, 246);
        const cellColor = this.color(visual.cell, 245);
        const resultColor = this.color(visual.panel);

        // Keep the cabinet on the original 750 x 1334 artboard so every control
        // continues to line up with the screen and physical button artwork. The
        // scene backdrop only fills the extra height on modern tall phones.
        const sceneBackdrop = this.createSpriteNode('SceneBackdrop', this.node, this.designWidth, this.sceneHeight, 0, 0);
        sceneBackdrop.getComponent(Sprite)!.color = Color.WHITE;
        const background = this.createSpriteNode('Background', this.node, this.designWidth, this.designHeight, 0, 0);
        background.getComponent(Sprite)!.color = Color.WHITE;
        const shade = this.createPanel('Shade', this.node, this.designWidth, this.sceneHeight, new Color(28, 8, 22, 24), 0, 0, 0);
        shade.setSiblingIndex(2);

        const titlePlaqueRim = this.createPanel('TitlePlaqueRim', this.node, 548, 116, accentSecondary, 0, titleY - 20, 44);
        const titlePlaqueFace = this.createPanel(
            'TitlePlaqueFace',
            titlePlaqueRim,
            528,
            96,
            this.color(visual.reelPanel, 248),
            0,
            0,
            37,
        );
        this.createOutlinePanel(
            'TitlePlaqueInnerLine',
            titlePlaqueFace,
            510,
            78,
            this.color(visual.accent, 160),
            0,
            0,
            31,
            2,
        );
        this.createPanel('TitlePlaqueGloss', titlePlaqueFace, 402, 9, new Color(255, 255, 255, 64), 0, 32, 5);
        [-238, 238].forEach((x, index) => {
            const jewel = this.createCirclePanel(
                `TitlePlaqueJewel_${index}`,
                titlePlaqueFace,
                14,
                index === 0 ? Color.WHITE : this.color(visual.accentSecondary),
                x,
                0,
            );
            this.createCirclePanel('TitlePlaqueJewelCore', jewel, 6, this.color(visual.accent), -1, 1);
        });

        const titleLabel = this.createLabel(this.config.title, this.node, 50, accentSecondary, 0, titleY, 510, 70, true);
        this.styleArtLabel(titleLabel, this.color(visual.panel, 245), 4, new Color(50, 5, 0, 190), 3, -4, 2);
        this.titleNode = titleLabel.node;
        const subtitleBadge = this.createPanel(
            'SubtitleBadgeRim',
            this.node,
            300,
            34,
            this.color(visual.accentSecondary),
            0,
            subtitleY,
            17,
        );
        const subtitleBadgeFace = this.createPanel(
            'SubtitleBadgeFace',
            subtitleBadge,
            288,
            24,
            this.color(visual.panel, 244),
            0,
            0,
            12,
        );
        const subtitleLabel = this.createLabel(this.config.subtitle, subtitleBadgeFace, 16, Color.WHITE, 0, 0, 276, 24, true);
        this.styleArtLabel(subtitleLabel, this.color(visual.panel, 230), 1, new Color(40, 4, 0, 150), 1, -2, 0);
        [-238, 238].forEach((x, index) => {
            const sparkle = this.createSparkle(`TitleSparkle_${index}`, this.node, x, titleY, index === 0 ? 26 : 20);
            sparkle.angle = index === 0 ? -10 : 12;
            this.animateTextSparkle(sparkle, 0.8 + index * 1.35);
        });
        const homeButton = this.createCirclePanel('HomeButton', this.node, 78, this.color(visual.panel, 232), -320, 590);
        homeButton.addComponent(Button);
        homeButton.on(Button.EventType.CLICK, this.onHomePressed, this);
        this.bindPressMotion(homeButton);
        this.createCircleOutline('HomeButtonRing', homeButton, 74, this.color(visual.accentSecondary), 0, 0, 3);
        this.createSpriteNode('HomeButtonArt', homeButton, 68, 68, 0, 0);

        const utilityDockRim = this.createPanel(
            'UtilityDockRim',
            this.node,
            552,
            62,
            this.color(visual.accentSecondary, 218),
            0,
            utilityY,
            31,
        );
        const utilityDock = this.createPanel(
            'UtilityDock',
            utilityDockRim,
            540,
            50,
            this.color(visual.panel, 238),
            0,
            0,
            25,
        );
        [-90, 90].forEach((x, index) => {
            this.createPanel(
                `UtilityDivider_${index}`,
                utilityDock,
                2,
                28,
                this.color(visual.accentSecondary, 82),
                x,
                0,
                1,
            );
        });

        this.soundButton = this.createUtilityButton(
            this.soundEnabled
                ? this.copyText('soundOn', 'SOUND')
                : this.copyText('soundOff', 'MUTED'),
            utilityDock,
            -180,
            0,
            164,
            40,
            () => this.toggleSound(),
        );
        this.soundButtonLabel = this.soundButton.getComponentsInChildren(Label)[0];
        this.createUtilityButton(
            this.copyText('rulesLabel', 'RULES'),
            utilityDock,
            0,
            0,
            164,
            40,
            () => this.toggleRules(),
        );
        this.autoButton = this.createUtilityButton(
            this.copyText('autoStart', 'AUTO'),
            utilityDock,
            180,
            0,
            164,
            40,
            () => this.toggleAutoSpin(),
        );
        this.autoButtonLabel = this.autoButton.getComponentsInChildren(Label)[0];

        const coinBar = this.createPanel('CoinBar', this.node, 346, 82, accentSecondary, 0, coinBarY, 34);
        const coinBarFace = this.createPanel('CoinBarFace', coinBar, 330, 66, new Color(158, 48, 20, 250), 0, 0, 28);
        this.createPanel('CoinBarGloss', coinBarFace, 258, 10, new Color(255, 255, 255, 50), 24, 19, 5);
        this.createCirclePanel('CoinIconPlate', coinBar, 62, new Color(255, 184, 35, 245), -120, 0);
        this.createCirclePanel('CoinIconInset', coinBar, 50, new Color(126, 35, 14, 210), -120, 0);
        this.createSpriteNode('CoinIcon', coinBar, 46, 46, -120, 0);
        const balanceLabel = this.createLabel('BALANCE', coinBarFace, 12, new Color(255, 224, 126, 235), 15, 19, 176, 20, true);
        this.styleArtLabel(balanceLabel, new Color(78, 15, 4, 220), 1, new Color(32, 3, 0, 140), 1, -1, 0);
        this.coinLabel = this.createLabel('1,000', coinBar, 29, new Color(255, 249, 221), 15, -8, 190, 48, true);
        this.styleArtLabel(this.coinLabel, new Color(82, 17, 4, 235), 2, new Color(35, 3, 0, 185), 2, -2, 1);
        const coinPlus = this.createCirclePanel('CoinPlusButton', coinBar, 54, this.color(visual.accent), 140, 0);
        coinPlus.addComponent(Button);
        coinPlus.on(Button.EventType.CLICK, () => this.showRecharge(), this);
        this.bindPressMotion(coinPlus);
        this.createLabel('+', coinPlus, 30, Color.WHITE, 0, 1, 50, 48, true);
        this.createSpriteNode('CoinPlusArt', coinPlus, 50, 50, 0, 0);

        this.reelPanel = this.createPanel('ReelPanel', this.node, 674, 548, reelColor, 0, reelPanelY, 42);
        const rim = this.createPanel('Rim', this.reelPanel, 642, 506, accentSecondary, 0, 0, 32);
        const innerPanel = this.createPanel('ReelInner', rim, 610, 466, cellColor, 0, 0, 25);
        this.createOutlinePanel('ReelInnerOutline', innerPanel, 596, 452, this.color(visual.panel, 120), 0, 0, 20, 3);
        this.createPanel('ReelTopGlass', innerPanel, 570, 16, new Color(255, 255, 255, 54), 0, 210, 8);
        this.createPanel('ReelBottomShade', innerPanel, 570, 13, this.color(visual.panel, 36), 0, -210, 7);
        [-101, 101].forEach((x, index) => {
            this.createPanel(`ReelDividerShadow_${index}`, innerPanel, 7, 414, this.color(visual.panel, 32), x + 2, 0, 3);
            this.createPanel(`ReelDividerGlow_${index}`, innerPanel, 2, 414, this.color(visual.accentSecondary, 78), x, 0, 1);
        });
        [-1, 1].forEach((direction) => {
            const endpoint = this.createCirclePanel(
                `PaylineEndpoint_${direction}`,
                innerPanel,
                31,
                accentSecondary,
                direction * 284,
                0,
            );
            endpoint.angle = 45;
            this.createCirclePanel('PaylineEndpointCore', endpoint, 15, accent, 0, 0);
            this.createCirclePanel('PaylineEndpointShine', endpoint, 6, Color.WHITE, -3, 3);
        });

        this.winLine = this.createPanel('WinLine', innerPanel, 596, 144, this.color(visual.accentSecondary, 90), 0, 0, 18);
        const winLineOpacity = this.winLine.addComponent(UIOpacity);
        winLineOpacity.opacity = 80;

        const xPositions = [-202, 0, 202];
        const yPositions = [146, 0, -146];
        for (let reel = 0; reel < 3; reel += 1) {
            const columnRoot = new Node(`Reel_${reel}`);
            innerPanel.addChild(columnRoot);
            columnRoot.setPosition(xPositions[reel], 0);
            this.ensureTransform(columnRoot, 190, 446);
            this.reelColumns.push(columnRoot);

            const column: Sprite[] = [];
            for (let row = 0; row < 3; row += 1) {
                this.createPanel(
                    `CellShadow_${reel}_${row}`,
                    columnRoot,
                    184,
                    136,
                    this.color(visual.panel, 44),
                    0,
                    yPositions[row] - 4,
                    21,
                );
                const cellBg = this.createPanel(
                    `CellBg_${reel}_${row}`,
                    columnRoot,
                    180,
                    132,
                    new Color(255, 255, 255, 230),
                    0,
                    yPositions[row],
                    19,
                );
                this.createOutlinePanel(
                    `CellOutline_${reel}_${row}`,
                    cellBg,
                    170,
                    122,
                    this.color(visual.accentSecondary, 92),
                    0,
                    0,
                    15,
                    2,
                );
                const highlight = this.createPanel(
                    `CellGloss_${reel}_${row}`,
                    cellBg,
                    154,
                    18,
                    new Color(255, 255, 255, 70),
                    0,
                    46,
                    9,
                );
                highlight.setSiblingIndex(0);
                const halo = this.createCirclePanel(
                    `SymbolHalo_${reel}_${row}`,
                    cellBg,
                    94,
                    this.color(visual.accentSecondary, row === 1 ? 34 : 20),
                    0,
                    0,
                );
                halo.setSiblingIndex(1);
                this.createCirclePanel('CellGem', cellBg, 7, new Color(255, 255, 255, 175), -72, 50);
                const spriteNode = this.createSpriteNode(`Symbol_${reel}_${row}`, cellBg, 116, 116, 0, 0);
                column.push(spriteNode.getComponent(Sprite)!);
            }
            this.cells.push(column);
        }
        this.reelFxClip = new Node('ReelFxClip');
        innerPanel.addChild(this.reelFxClip);
        this.ensureTransform(this.reelFxClip, 596, 446);
        const reelMask = this.reelFxClip.addComponent(Mask);
        reelMask.type = Mask.Type.GRAPHICS_RECT;
        this.buildMarqueeLights();

        const resultPlateRim = this.createPanel('ResultPlateRim', this.node, 536, 80, accentSecondary, 0, resultY, 39);
        const resultPlate = this.createPanel('ResultPlateFace', resultPlateRim, 520, 64, new Color(255, 246, 218, 246), 0, 0, 31);
        this.createPanel('ResultPlateGloss', resultPlate, 430, 9, new Color(255, 255, 255, 92), 0, 19, 5);
        [-230, 230].forEach((x, index) => {
            const rivet = this.createCirclePanel(`ResultRivet_${index}`, resultPlate, 16, accentSecondary, x, 0);
            this.createCirclePanel('ResultRivetCore', rivet, 7, index === 0 ? accent : new Color(255, 105, 170), 0, 0);
            this.createCirclePanel('ResultRivetShine', rivet, 3, Color.WHITE, -2, 2);
        });
        const meterBadge = this.createPanel('MeterBadge', this.node, 190, 34, panelColor, 0, resultY + 46, 17);
        this.createOutlinePanel('MeterBadgeLine', meterBadge, 180, 26, this.color(visual.accentSecondary, 150), 0, 0, 13, 2);
        this.createLabel(this.copyText('meterLabel', 'WIN METER'), meterBadge, 14, accentSecondary, 0, 0, 164, 30, true);
        const idleText = this.copyText('idle', 'TAP SPIN TO PLAY');
        this.resultShadowLabel = this.createLabel(idleText, this.node, 31, new Color(255, 255, 255, 170), 2, resultY - 4, 650, 64, true);
        this.resultLabel = this.createLabel(idleText, this.node, 29, resultColor, 0, resultY, 650, 60, true);
        this.styleArtLabel(this.resultLabel, new Color(255, 205, 76, 230), 2, new Color(92, 24, 3, 130), 2, -2, 1);

        const betRim = this.createPanel('BetRim', this.node, 420, 98, accentSecondary, -92, controlsY, 46);
        const betPanel = this.createPanel('BetPanel', betRim, 400, 78, panelColor, 0, 0, 38);
        this.createLabel(this.copyText('betLabel', 'BET LEVEL'), betPanel, 11, new Color(255, 255, 255, 165), 0, 22, 180, 22, true);
        this.createTextButton('-', betPanel, -158, 0, 62, 62, () => this.changeBet(-1), accent, 34);
        this.betLabel = this.createLabel('BET 10', betPanel, 27, Color.WHITE, 0, -8, 220, 52, true);
        this.styleArtLabel(this.betLabel, this.color(visual.accentSecondary, 245), 2, new Color(36, 3, 0, 180), 2, -3, 1);
        this.createTextButton('+', betPanel, 158, 0, 62, 62, () => this.changeBet(1), accent, 34);

        const spinX = 228;
        this.spinAura = new Node('SpinAura');
        this.node.addChild(this.spinAura);
        this.spinAura.setPosition(spinX, controlsY);
        this.ensureTransform(this.spinAura, 208, 208);
        this.spinAura.addComponent(UIOpacity).opacity = 72;
        this.createCirclePanel('SpinAuraSoftGlow', this.spinAura, 202, this.color(visual.accentSecondary, 24), 0, 0);
        this.createCircleOutline('SpinAuraOuterRing', this.spinAura, 194, this.color(visual.accentSecondary, 92), 0, 0, 3);
        this.createCircleOutline('SpinAuraInnerRing', this.spinAura, 174, new Color(255, 255, 255, 72), 0, 0, 2);
        for (let index = 0; index < 12; index += 1) {
            const angle = index * 30 * Math.PI / 180;
            this.createCirclePanel(
                `SpinAuraDot_${index}`,
                this.spinAura,
                index % 3 === 0 ? 7 : 4,
                index % 3 === 0 ? Color.WHITE : this.color(visual.accentSecondary, 210),
                Math.cos(angle) * 96,
                Math.sin(angle) * 96,
            );
        }
        this.spinGlow = this.createCirclePanel('SpinGlow', this.node, 178, this.color(visual.accentSecondary, 105), spinX, controlsY);
        this.spinGlow.addComponent(UIOpacity).opacity = 58;
        this.createCirclePanel('SpinRimOuter', this.node, 158, accentSecondary, spinX, controlsY);
        this.createCirclePanel('SpinRimInner', this.node, 142, this.color(visual.panel), spinX, controlsY);
        this.spinButton = this.createCirclePanel('SpinButton', this.node, 128, accent, spinX, controlsY);
        this.spinButton.addComponent(Button);
        this.spinButton.on(Button.EventType.CLICK, this.onSpinPressed, this);
        this.bindPressMotion(this.spinButton);
        this.createPanel('SpinHighlight', this.spinButton, 76, 16, new Color(255, 255, 255, 76), 0, 35, 8);
        for (let index = 0; index < 8; index += 1) {
            const angle = index * 45 * Math.PI / 180;
            this.createCirclePanel(
                `SpinStud_${index}`,
                this.spinButton,
                index % 2 === 0 ? 8 : 6,
                index % 2 === 0 ? accentSecondary : new Color(255, 255, 255, 190),
                Math.cos(angle) * 52,
                Math.sin(angle) * 52,
            );
        }
        const spinLabel = this.createLabel(this.copyText('spinLabel', 'SPIN'), this.spinButton, 29, Color.WHITE, 0, -1, 116, 60, true);
        this.styleArtLabel(spinLabel, new Color(112, 24, 4, 245), 3, new Color(48, 4, 0, 190), 2, -3, 1);
        const footerLabel = this.createLabel(
            this.copyText('footer', `WIN UP TO ${this.maxMultiplier}x`),
            this.node,
            18,
            new Color(255, 255, 255, 225),
            0,
            footerY,
            500,
            40,
            true,
        );
        this.styleArtLabel(footerLabel, new Color(75, 12, 4, 215), 2, new Color(24, 2, 0, 145), 2, -2, 1);

        this.audioSource = this.node.getComponent(AudioSource) ?? this.node.addComponent(AudioSource);
        this.audioSource.volume = this.soundEnabled ? 1 : 0;
    }

    private buildMarqueeLights(): void {
        const positions: Array<[number, number]> = [];
        const horizontalCount = 18;
        const verticalCount = 12;
        for (let index = 0; index < horizontalCount; index += 1) {
            positions.push([-292 + index * (584 / (horizontalCount - 1)), 250]);
        }
        for (let index = 1; index < verticalCount - 1; index += 1) {
            positions.push([314, 250 - index * (500 / (verticalCount - 1))]);
        }
        for (let index = horizontalCount - 1; index >= 0; index -= 1) {
            positions.push([-292 + index * (584 / (horizontalCount - 1)), -250]);
        }
        for (let index = verticalCount - 2; index >= 1; index -= 1) {
            positions.push([-314, 250 - index * (500 / (verticalCount - 1))]);
        }

        positions.forEach(([x, y], index) => {
            const light = new Node(`MarqueeLight_${index}`);
            this.reelPanel.addChild(light);
            light.setPosition(x, y);
            this.ensureTransform(light, 24, 24);
            const opacity = light.addComponent(UIOpacity);
            opacity.opacity = 52;
            this.createCirclePanel('Glow', light, 23, this.color(this.config.visual.accentSecondary, 88), 0, 0);
            this.createCirclePanel('Bulb', light, 12, this.color(this.config.visual.accentSecondary), 0, 0);
            this.createCirclePanel('HotCore', light, 5, new Color(255, 255, 255, 245), -2, 2);
            this.marqueeLights.push(opacity);
        });
    }

    private createLoadingScreen(): LoadingView {
        const root = this.createPanel(
            'LoadingScreen',
            this.node,
            this.designWidth,
            this.sceneHeight,
            // A warm neutral safety fill prevents a red frame from flashing
            // if the loading artwork and the gameplay scene exchange frames.
            new Color(255, 244, 218, 255),
            0,
            0,
            0,
        );
        root.addComponent(UIOpacity).opacity = 255;

        const loadingBackground = this.createSpriteNode('LoadingArtBackground', root, this.designWidth, this.sceneHeight, 0, 0);
        this.applyPreloadedFrame(loadingBackground, this.loadingBackgroundPath);
        this.createPanel('LoadingVignette', root, this.designWidth, this.sceneHeight, new Color(76, 4, 0, 26), 0, 0, 0);

        // Loading FX is deliberately built from transparent vector shapes.
        // The old light/ray bitmaps carried dark matte pixels in their alpha
        // fringe and produced a large black diamond on some browsers.
        const loadingAura = new Node('LoadingAuraRig');
        root.addChild(loadingAura);
        loadingAura.setPosition(0, 82);
        this.ensureTransform(loadingAura, 690, 690);
        loadingAura.addComponent(UIOpacity).opacity = 82;
        this.createCirclePanel('LoadingAuraSoftCore', loadingAura, 360, new Color(255, 214, 74, 24), 0, 0);
        this.createCircleOutline('LoadingAuraOuterRing', loadingAura, 520, new Color(255, 225, 124, 94), 0, 0, 4);
        this.createCircleOutline('LoadingAuraMiddleRing', loadingAura, 448, new Color(255, 255, 255, 62), 0, 0, 3);
        for (let index = 0; index < 16; index += 1) {
            const angle = index * 22.5 * Math.PI / 180;
            const radius = index % 2 === 0 ? 252 : 228;
            this.createCirclePanel(
                `LoadingAuraSpark_${index}`,
                loadingAura,
                index % 4 === 0 ? 12 : 7,
                index % 4 === 0 ? new Color(255, 255, 255, 210) : new Color(255, 220, 104, 176),
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
            );
        }
        tween(loadingAura)
            .to(1.5, { scale: new Vec3(1.08, 1.08, 1), angle: 28 }, { easing: 'quadInOut' })
            .to(1.5, { scale: new Vec3(0.96, 0.96, 1), angle: 56 }, { easing: 'quadInOut' })
            .start();

        const loadingRing = this.createCircleOutline(
            'LoadingCenterRing', root, 390,
            this.color(this.config.visual.accentSecondary, 112), 0, 88, 5,
        );
        const loadingRingOpacity = loadingRing.addComponent(UIOpacity);
        loadingRingOpacity.opacity = 76;
        tween(loadingRing)
            .to(1.1, { scale: new Vec3(1.1, 1.1, 1), angle: 24 }, { easing: 'quadInOut' })
            .to(1.1, { scale: new Vec3(0.96, 0.96, 1), angle: 48 }, { easing: 'quadInOut' })
            .start();

        const decorationLayout: Array<[number, number, number, number]> = [
            [-314, 430, 112, -16], [314, 420, 102, 14],
            [-326, 260, 92, -12], [325, 245, 108, 17],
            [-318, 70, 94, -17], [320, 55, 104, 13],
            [-315, -120, 90, -14], [316, -132, 100, 16],
            [-306, -320, 82, -12], [306, -324, 88, 13],
            [-272, 552, 70, -10], [272, 552, 70, 10],
        ];
        const decorationPaths = this.loadingDecorationPaths;
        decorationLayout.forEach(([x, y, size, angle], index) => {
            const bubble = this.createCirclePanel(
                `LoadingDecorBubble_${index}`,
                root,
                size + 18,
                index % 2 === 0
                    ? new Color(255, 224, 113, 58)
                    : new Color(255, 111, 70, 70),
                x,
                y,
            );
            const decoration = this.createSpriteNode(`LoadingDecor_${index}`, bubble, size, size, 0, 0);
            this.applyPreloadedFrame(
                decoration,
                decorationPaths[index % Math.max(1, decorationPaths.length)],
                index >= 10 ? this.color(this.config.visual.accentSecondary) : undefined,
            );
            if (index >= 10) decoration.getComponent(Sprite)!.color = this.color(this.config.visual.accentSecondary);
            decoration.setScale(0.28, 0.28, 1);
            decoration.angle = angle;
            tween(decoration)
                .delay(0.08 + index * 0.035)
                .to(0.28, { scale: new Vec3(1.08, 1.08, 1), angle: -angle * 0.35 }, { easing: 'backOut' })
                .to(0.48, { scale: Vec3.ONE, position: new Vec3(0, 8, 0), angle: angle * 0.25 }, { easing: 'quadInOut' })
                .to(0.48, { position: Vec3.ZERO, angle: -angle * 0.18 }, { easing: 'quadInOut' })
                .start();
        });

        for (let index = 0; index < 34; index += 1) {
            const dot = this.createCirclePanel(
                `LoadingGoldDust_${index}`,
                root,
                3 + Math.random() * 9,
                index % 3 === 0 ? Color.WHITE : this.color(this.config.visual.accentSecondary),
                -340 + Math.random() * 680,
                -560 + Math.random() * 1160,
            );
            const opacity = dot.addComponent(UIOpacity);
            opacity.opacity = 35 + Math.random() * 120;
            tween(dot)
                .delay(Math.random() * 0.8)
                .to(0.5 + Math.random() * 0.4, { scale: new Vec3(1.9, 1.9, 1), angle: 45 })
                .to(0.5, { scale: new Vec3(0.55, 0.55, 1), angle: 90 })
                .start();
        }

        const loadingEyebrow = this.createLabel(
            this.copyText('loadingEyebrow', `${this.config.subtitle}  •  JACKPOT ARCADE`),
            root,
            17,
            new Color(255, 255, 255, 220),
            0,
            720,
            650,
            36,
            true,
        );
        this.styleArtLabel(loadingEyebrow, new Color(89, 15, 3, 225), 2, new Color(30, 2, 0, 150), 2, -2, 1);
        const logo = this.config.visual.loadingLogo
            ? this.createSpriteNode('LoadingLogo', root, 510, 282, 0, 552)
            : this.createLabel(
                this.config.title,
                root,
                58,
                this.color(this.config.visual.accentSecondary),
                0,
                552,
                650,
                100,
                true,
            ).node;
        if (this.config.visual.loadingLogo) {
            this.applyPreloadedFrame(logo, this.config.visual.loadingLogo);
        }
        const emblemGlow = this.createCirclePanel('LoadingMascotGlow', root, 360, this.color(this.config.visual.accentSecondary, 54), 0, 52);
        emblemGlow.addComponent(UIOpacity).opacity = 90;
        const emblem = this.createSpriteNode('LoadingMascot', root, 350, 350, 0, 48);
        this.applyPreloadedFrame(emblem, this.loadingMascotPath);
        logo.setScale(0.82, 0.82, 1);
        tween(logo)
            .to(0.38, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'backOut' })
            .to(0.18, { scale: Vec3.ONE })
            .start();
        tween(emblem)
            .to(0.38, { scale: new Vec3(1.06, 1.06, 1), position: new Vec3(0, 58, 0) }, { easing: 'backOut' })
            .to(0.5, { scale: Vec3.ONE, position: new Vec3(0, 42, 0) }, { easing: 'quadInOut' })
            .to(0.5, { position: new Vec3(0, 51, 0) }, { easing: 'quadInOut' })
            .start();
        tween(emblemGlow)
            .to(0.7, { scale: new Vec3(1.14, 1.14, 1) })
            .to(0.7, { scale: new Vec3(0.96, 0.96, 1) })
            .start();

        const foodIcons: Node[] = [];
        const foodPositions = [-240, -120, 0, 120, 240];
        const loadingFoodPaths = this.loadingFoodPaths;
        foodPositions.forEach((x, index) => {
            const plate = this.createCirclePanel(
                `LoadingFoodPlate_${index}`,
                root,
                94,
                index % 2 === 0 ? new Color(116, 23, 8, 220) : new Color(255, 190, 38, 230),
                x,
                -214,
            );
            this.createCirclePanel('PlateInner', plate, 78, new Color(255, 244, 191, 238), 0, 0);
            const icon = this.createSpriteNode(`LoadingFood_${index}`, plate, 72, 72, 0, 0);
            this.applyPreloadedFrame(icon, loadingFoodPaths[index % Math.max(1, loadingFoodPaths.length)]);
            icon.setScale(0.5, 0.5, 1);
            icon.angle = index % 2 === 0 ? -8 : 8;
            tween(icon)
                .delay(index * 0.08)
                .to(0.2, { scale: new Vec3(1.12, 1.12, 1), angle: 0 }, { easing: 'backOut' })
                .to(0.22, { scale: Vec3.ONE })
                .to(0.34, { position: new Vec3(0, 8, 0), angle: index % 2 === 0 ? 4 : -4 }, { easing: 'quadInOut' })
                .to(0.34, { position: Vec3.ZERO, angle: 0 }, { easing: 'quadInOut' })
                .start();
            foodIcons.push(icon);
        });

        const configuredFeatures = this.config.copy?.loadingFeatures ?? [];
        const featureTexts = [
            configuredFeatures[0] ?? `${this.config.symbols.length} SYMBOLS`,
            configuredFeatures[1] ?? `UP TO ${this.maxMultiplier}x`,
            configuredFeatures[2] ?? 'LUCKY STREAKS',
        ];
        featureTexts.forEach((text, index) => {
            const chip = this.createPanel(
                `LoadingFeature_${index}`,
                root,
                188,
                38,
                index === 1 ? this.color(this.config.visual.accentSecondary) : new Color(102, 18, 5, 218),
                -204 + index * 204,
                -300,
                19,
            );
            this.createOutlinePanel(
                'FeatureOutline',
                chip,
                180,
                30,
                index === 1 ? new Color(112, 29, 13, 170) : this.color(this.config.visual.accentSecondary, 170),
                0,
                0,
                15,
                2,
            );
            this.createLabel(
                text,
                chip,
                13,
                index === 1 ? this.color(this.config.visual.panel) : Color.WHITE,
                0,
                0,
                174,
                32,
                true,
            );
        });

        // The old texture-backed loader had a dark rectangular edge. Use a
        // clean cream-and-gold track so the loading bar never reads as a black
        // shadow box on mobile screens.
        const barPlate = this.createPanel('LoadingBarPlate', root, 620, 74, new Color(255, 255, 255, 0), 0, -412, 36);
        this.createPanel('LoadingBarGoldRim', barPlate, 596, 54, new Color(255, 206, 61, 255), 0, 0, 27);
        this.createPanel('LoadingBarTrack', barPlate, 574, 42, new Color(255, 246, 204, 255), 0, 0, 21);
        this.createOutlinePanel('LoadingBarTrackLine', barPlate, 568, 36, new Color(255, 139, 28, 210), 0, 0, 18, 2);
        const fillClip = new Node('LoadingBarFillClip');
        barPlate.addChild(fillClip);
        this.ensureTransform(fillClip, 548, 32);
        const fillMask = fillClip.addComponent(Mask);
        fillMask.type = Mask.Type.GRAPHICS_RECT;
        const fill = this.createPanel('LoadingBarFill', fillClip, 548, 30, new Color(255, 119, 22, 255), 0, 0, 15);
        this.createPanel('LoadingBarFillGold', fill, 526, 16, new Color(255, 203, 47, 245), 0, 4, 8);
        this.createPanel('LoadingBarFillSheen', fill, 500, 6, new Color(255, 255, 255, 105), 0, 9, 3);
        fill.setScale(0.01, 1, 1);
        fill.setPosition(-274 + 274 * 0.01, 0);
        const fillGlow = this.createCirclePanel(
            'LoadingBarProgressGlow',
            barPlate,
            18,
            new Color(255, 255, 255, 220),
            -266,
            0,
        );
        this.createCirclePanel(
            'LoadingBarProgressGlowCore',
            fillGlow,
            10,
            this.color(this.config.visual.accentSecondary),
            0,
            0,
        );

        const status = this.createLabel(
            this.copyText('loadingInitial', 'LOADING THE REELS...'),
            root,
            20,
            Color.WHITE,
            0,
            -482,
            620,
            42,
            true,
        );
        this.styleArtLabel(status, new Color(90, 16, 3, 235), 2, new Color(35, 3, 0, 170), 2, -2, 1);
        const progress = this.createLabel('0%', root, 30, this.color(this.config.visual.accentSecondary), 0, -530, 240, 50, true);
        this.styleArtLabel(progress, new Color(93, 16, 2, 245), 3, new Color(34, 2, 0, 185), 2, -3, 1);
        this.createLabel(
            this.copyText('loadingTip', 'MATCH 3 SYMBOLS ON THE CENTER LINE'),
            root,
            16,
            new Color(255, 245, 209, 210),
            0,
            -600,
            650,
            36,
        );
        return { root, emblem, fill, fillGlow, progress, status, foodIcons };
    }

    private updateLoadingProgress(viewState: LoadingView, percent: number): void {
        const ratio = Math.max(0, Math.min(100, percent)) / 100;
        const visibleRatio = Math.max(0.01, ratio);

        // LoadingBarFill is drawn around its node origin. Move that origin as
        // it scales so the fill's left edge remains locked to the track.
        viewState.fill.setScale(visibleRatio, 1, 1);
        viewState.fill.setPosition(-274 + 274 * visibleRatio, 0);
        viewState.fillGlow.setPosition(-266 + 532 * ratio, 0);
        viewState.progress.string = `${Math.round(ratio * 100)}%`;
    }

    private async animateLoadingProgress(viewState: LoadingView, version: number): Promise<void> {
        await this.delay(520);
        const steps = 72;
        for (let step = 1; step <= steps && version === this.fxVersion; step += 1) {
            const linear = step / steps;
            const eased = 1 - Math.pow(1 - linear, 2.2);
            const percent = Math.min(92, Math.round(eased * 92));
            this.updateLoadingProgress(viewState, percent);
            const stages = this.config.copy?.loadingStages ?? [];
            if (percent < 28) viewState.status.string = stages[0] ?? 'POLISHING THE SYMBOLS...';
            else if (percent < 62) viewState.status.string = stages[1] ?? 'CHARGING THE LIGHTS...';
            else viewState.status.string = stages[2] ?? 'PREPARING THE JACKPOT...';
            await this.delay(36);
        }
    }

    private async finishLoadingScreen(viewState: LoadingView): Promise<void> {
        for (let percent = 93; percent <= 100; percent += 1) {
            this.updateLoadingProgress(viewState, percent);
            await this.delay(24);
        }
        viewState.status.string = this.copyText('loadingReady', 'READY TO SPIN!');
        this.pulse(viewState.emblem, 1.16);
        viewState.foodIcons.forEach((icon, index) => {
            this.scheduleOnce(() => this.pulse(icon, 1.22), index * 0.045);
        });
        await this.delay(180);
        const opacity = viewState.root.getComponent(UIOpacity)!;
        // Hand the fully loaded gameplay scene over with one clean opacity
        // crossfade. The old red particle burst and zoom-out produced a stray
        // red flash immediately after the loader reached 100%.
        tween(opacity).to(0.34, { opacity: 0 }, { easing: 'quadOut' }).start();
        await this.delay(360);
        if (viewState.root.isValid) viewState.root.destroy();
    }

    private async loadAssets(): Promise<void> {
        const promises: Promise<void>[] = this.config.symbols.map(async (symbol) => {
            const frame = await this.loadResource(symbol.texture, SpriteFrame);
            if (frame) this.symbolFrames.set(symbol.id, frame);
        });
        promises.push((async () => {
            const frame = await this.loadResource(this.config.visual.background, SpriteFrame);
            const sprite = this.node.getChildByName('Background')?.getComponent(Sprite);
            if (frame && sprite) sprite.spriteFrame = frame;
        })());
        promises.push((async () => {
            const frame = await this.loadResource(this.loadingBackgroundPath, SpriteFrame);
            const sprite = this.node.getChildByName('SceneBackdrop')?.getComponent(Sprite);
            if (frame && sprite) sprite.spriteFrame = frame;
        })());
        promises.push((async () => {
            const frame = await this.loadResource(this.config.visual.topCoin, SpriteFrame);
            const icon = this.node.getChildByName('CoinBar')?.getChildByName('CoinIcon')?.getComponent(Sprite);
            if (frame) {
                this.topCoinFrame = frame;
                if (icon) icon.spriteFrame = frame;
            }
        })());
        promises.push((async () => {
            const frame = await this.loadResource(
                this.config.visual.addCoinIcon ?? 'theme/classic/top-plus/spriteFrame',
                SpriteFrame,
            );
            const icon = this.node.getChildByName('CoinBar')
                ?.getChildByName('CoinPlusButton')
                ?.getChildByName('CoinPlusArt')
                ?.getComponent(Sprite);
            if (frame && icon) icon.spriteFrame = frame;
        })());
        promises.push((async () => {
            const frame = await this.loadResource(
                this.config.visual.homeIcon ?? 'theme/classic/home-button/spriteFrame',
                SpriteFrame,
            );
            const icon = this.node.getChildByName('HomeButton')?.getChildByName('HomeButtonArt')?.getComponent(Sprite);
            if (frame && icon) icon.spriteFrame = frame;
        })());
        const interfaceSprites: Array<[string | undefined, string, string]> = [
            [this.config.visual.titleLogo, 'TitleLogo', ''],
            [this.config.visual.soundIcon, 'SoundButton', 'SoundButtonArt'],
            [this.config.visual.rulesIcon, 'RulesButton', 'RulesButtonArt'],
            [this.config.visual.autoIcon, 'AutoButton', 'AutoButtonArt'],
            [this.config.visual.betIcon, 'BetReadout', 'BetButtonArt'],
        ];
        interfaceSprites.forEach(([path, parentName, childName]) => {
            if (!path) return;
            promises.push((async () => {
                const frame = await this.loadResource(path, SpriteFrame);
                const parent = this.node.getChildByName(parentName);
                const target = childName ? parent?.getChildByName(childName) : parent;
                const sprite = target?.getComponent(Sprite);
                if (frame && sprite) sprite.spriteFrame = frame;
            })());
        });
        promises.push((async () => {
            if (!this.config.visual.betIcon) return;
            const frame = await this.loadResource(this.config.visual.betIcon, SpriteFrame);
            const icon = this.node.getChildByName('BetButtonArt')?.getComponent(Sprite);
            if (frame && icon) icon.spriteFrame = frame;
        })());
        promises.push((async () => {
            const frame = await this.loadResource('theme/classic/win-coin-pile/spriteFrame', SpriteFrame);
            if (frame) this.fxFrames.set('coinPile', frame);
        })());
        const fxAssets: Array<[string, string | undefined]> = [
            ['flare', this.config.visual.winFlare],
            ['light', this.config.visual.winLight],
            ['magic', this.config.visual.winMagic],
            ['star', this.config.visual.winStar],
            ['spark', this.config.visual.winSpark],
            ['trophy', this.config.visual.winTrophy],
            ['medal', this.config.visual.winMedal],
            ['frame', this.config.visual.winFrame],
            ['goldRing', this.config.visual.winGoldRing],
            ['verticalGlow', this.config.visual.winVerticalGlow],
            ['auraRays', this.config.visual.winAuraRays],
            ['magicStar', this.config.visual.winMagicStar],
            ['ringRipple', this.config.visual.winRingRipple],
            ['lightRing', this.config.visual.winLightRing],
            ['hitLine', this.config.visual.winHitLine],
            ['commonHalo', this.config.visual.winCommonHalo],
            ['trailingLight', this.config.visual.winTrailingLight],
            ['premiumStage', this.config.visual.winStage],
        ];
        fxAssets.forEach(([key, path]) => {
            if (!path || !this.useRuntimeSpriteFx) return;
            promises.push((async () => {
                const frame = await this.loadResource(path, SpriteFrame);
                if (frame) this.fxFrames.set(key, frame);
            })());
        });
        const loadingRoot = this.node.getChildByName('LoadingScreen');
        const loadingSpriteTargets: Array<[string | undefined, Node | null | undefined]> = [
            [this.config.visual.loadingBackground, loadingRoot?.getChildByName('LoadingArtBackground')],
            [this.config.visual.loadingLogo, loadingRoot?.getChildByName('LoadingLogo')],
            [this.config.visual.loadingMascot, loadingRoot?.getChildByName('LoadingMascot')],
        ];
        loadingSpriteTargets.forEach(([path, target]) => {
            if (!path || !target) return;
            promises.push((async () => {
                const frame = await this.loadResource(path, SpriteFrame);
                const sprite = target.getComponent(Sprite);
                if (frame && sprite) sprite.spriteFrame = frame;
            })());
        });
        this.config.visual.loadingFoods?.forEach((path, index) => {
            const target = loadingRoot
                ?.getChildByName(`LoadingFoodPlate_${index}`)
                ?.getChildByName(`LoadingFood_${index}`);
            if (!target) return;
            promises.push((async () => {
                const frame = await this.loadResource(path, SpriteFrame);
                const sprite = target.getComponent(Sprite);
                if (frame && sprite) sprite.spriteFrame = frame;
            })());
        });
        this.config.visual.loadingDecorations?.forEach((path, index) => {
            const target = loadingRoot
                ?.getChildByName(`LoadingDecorBubble_${index}`)
                ?.getChildByName(`LoadingDecor_${index}`);
            if (!target) return;
            promises.push((async () => {
                const frame = await this.loadResource(path, SpriteFrame);
                const sprite = target.getComponent(Sprite);
                if (frame && sprite) sprite.spriteFrame = frame;
            })());
        });
        await Promise.all(promises);
        const spinAuraFrame = this.fxFrames.get('auraRays') ?? this.fxFrames.get('goldRing');
        const spinAuraSprite = this.spinAura?.getComponent(Sprite);
        if (spinAuraFrame && spinAuraSprite) {
            spinAuraSprite.spriteFrame = spinAuraFrame;
            spinAuraSprite.color = this.color(this.config.visual.accentSecondary);
            this.spinAura.getComponent(UIOpacity)!.opacity = 92;
        }
        const loadingFxTargets: Array<[string, string]> = [
            ['light', 'LoadingLight'],
            ['flare', 'LoadingFlare'],
            ['auraRays', 'LoadingAuraRays'],
            ['magicStar', 'LoadingMagicStar'],
        ];
        loadingFxTargets.forEach(([key, nodeName]) => {
            const frame = this.fxFrames.get(key);
            const sprite = loadingRoot?.getChildByName(nodeName)?.getComponent(Sprite);
            if (frame && sprite) {
                sprite.spriteFrame = frame;
                sprite.color = this.color(this.config.visual.accentSecondary);
            }
        });
        this.spinClip = await this.loadResource('audio/spin', AudioClip);
        this.winClip = await this.loadResource('audio/win', AudioClip);
        this.coinClip = await this.loadResource('audio/coins', AudioClip);
    }

    private loadResource<T>(path: string, type: new (...args: never[]) => T): Promise<T | null> {
        return new Promise((resolve) => {
            resources.load(path, type as never, (error: Error | null, asset: T) => {
                if (error) {
                    console.warn(`Unable to load ${path}`, error);
                    resolve(null);
                    return;
                }
                resolve(asset);
            });
        });
    }

    private fillInitialGrid(): void {
        for (let reel = 0; reel < this.cells.length; reel += 1) {
            for (let row = 0; row < this.rowCount; row += 1) {
                this.applySymbol(this.cells[reel][row], PayoutCalculator.pickWeighted(this.config.symbols));
            }
        }
    }

    private onSpinPressed(): void {
        if (this.autoSpinning) {
            this.stopAutoSpin();
            return;
        }
        void this.performSpin();
    }

    private onHomePressed(): void {
        this.stopAutoSpin();
        if (this.rulesOverlay?.isValid) this.closeRules();
        if (this.rechargeOverlay?.isValid) this.closeRecharge();
        this.setResultText('RETURNING HOME...');
        this.node.emit('home-requested');

        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        // Let an embedding lobby intercept the request first. Standalone
        // builds still need a real result, so they fall back to a configurable
        // same-origin home URL instead of leaving the button visually active
        // but functionally inert.
        const homeEvent = new CustomEvent('slot-home-requested', {
            cancelable: true,
            detail: { themeId: this.config.id },
        });
        if (!window.dispatchEvent(homeEvent)) return;

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

    private async performSpin(): Promise<boolean> {
        if (this.spinning) return false;
        const bet = this.currentBet;
        const isFreeSpin = this.freeSpinsRemaining > 0;
        if (!isFreeSpin && this.coins < bet) {
            this.setResultText(this.copyText('insufficientCoins', 'NOT ENOUGH COINS'));
            this.pulse(this.resultLabel.node, 1.13);
            this.showRecharge();
            return false;
        }

        this.spinning = true;
        try {
            this.suppressIdleUntil = Date.now() + 1800;
            if (isFreeSpin) {
                this.freeSpinsRemaining -= 1;
            } else {
                this.coins -= bet;
                this.jackpotValue += bet * 0.02;
                this.writeCoins();
            }
            this.refreshHud();
            this.setResultText(isFreeSpin ? `FREE SPIN  •  ${this.freeSpinsRemaining} LEFT` : this.copyText('spinStart', 'GOOD LUCK!'));
            this.spinClip && this.audioSource.playOneShot(this.spinClip, 0.55);
            this.pulseSpinButton();
            this.spinIgnition();
            void this.playSpinStreaks();

            const outcome = PayoutCalculator.createOutcome(
                this.config.symbols,
                bet,
                this.config.winRate,
                this.config.nearMissRate,
            );
            await Promise.all(this.reelColumns.map((_, reel) => this.spinReel(reel, outcome.grid[reel])));
            if (outcome.expandingWildReels.length > 0) {
                await this.revealExpandingWilds(outcome.expandingWildReels);
            }
            await this.showOutcome(outcome, true);

            // The defining S09 feature is a real automatic locked respin, not
            // a decorative badge. Expanded lion reels remain fully WILD while
            // every other reel spins again without deducting another bet.
            if (outcome.expandingWildReels.length > 0) {
                const locked = outcome.expandingWildReels;
                this.setResultText(`${locked.length} WILD REEL${locked.length > 1 ? 'S' : ''} LOCKED  •  RESPIN`);
                this.pulse(this.resultLabel.node, 1.12);
                await this.delay(720);
                const respin = PayoutCalculator.createOutcome(
                    this.config.symbols,
                    bet,
                    this.config.winRate + 0.08,
                    this.config.nearMissRate,
                    Math.random,
                    locked,
                    false,
                );
                this.spinClip && this.audioSource.playOneShot(this.spinClip, 0.5);
                await Promise.all(this.reelColumns.map((_, reel) => locked.includes(reel)
                    ? this.holdLockedWildReel(reel)
                    : this.spinReel(reel, respin.grid[reel])));
                this.setResultText('LOCKED WILD RESPIN COMPLETE');
                await this.showOutcome(respin, false);
            }
            return true;
        } finally {
            this.spinning = false;
        }
    }

    private async spinReel(reel: number, result: SymbolConfig[]): Promise<void> {
        const column = this.reelColumns[reel];
        this.spawnSpinBeam(reel);
        tween(column)
            .to(0.16, { scale: new Vec3(0.96, 1.07, 1) }, { easing: 'quadOut' })
            .start();
        const durationMs = (this.config.minSpinDuration + reel * this.config.reelStopDelay) * 1000;
        const start = Date.now();
        let tick = 0;
        while (Date.now() - start < durationMs) {
            for (let row = 0; row < this.rowCount; row += 1) {
                this.applySymbol(this.cells[reel][row], PayoutCalculator.pickWeighted(this.config.symbols));
            }
            const offsets = [31, 9, -25, -5];
            const offset = offsets[tick % offsets.length];
            column.setPosition(column.position.x, offset);
            column.angle = tick % 2 === 0 ? -0.55 : 0.55;
            if (tick % 2 === 0) this.spawnReelGhost(reel);
            tick += 1;
            await this.delay(56 + reel * 4);
        }

        for (let row = 0; row < this.rowCount; row += 1) {
            this.applySymbol(this.cells[reel][row], result[row]);
        }
        Tween.stopAllByTarget(column);
        column.setScale(0.96, 0.9, 1);
        column.angle = 0;
        column.setPosition(column.position.x, -62);
        tween(column)
            .to(0.1, { position: new Vec3(column.position.x, 18, 0), scale: new Vec3(1.03, 1.04, 1) }, { easing: 'quadOut' })
            .to(0.2, { position: new Vec3(column.position.x, 0, 0), scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
        this.reelStopBurst(reel);
        this.cells[reel].forEach((cell, row) => {
            this.scheduleOnce(() => this.pulse(cell.node, 1.08), row * 0.035);
        });
        await this.delay(330);
    }

    private async revealExpandingWilds(reels: number[]): Promise<void> {
        this.suppressIdleUntil = Date.now() + 1900;
        this.setResultText(reels.length > 1 ? 'DOUBLE WILD ASCENSION!' : 'LION WILD ASCENDS!');
        this.coinClip && this.audioSource.playOneShot(this.coinClip, 0.72);
        reels.forEach((reel, reelIndex) => {
            const x = this.reelColumns[reel].position.x;
            const glow = this.createPanel(
                `ExpandingWildGlow_${reel}`,
                this.reelFxClip,
                112,
                536,
                new Color(255, 205, 72, 74),
                x,
                0,
                28,
            );
            this.createOutlinePanel(
                `ExpandingWildRail_${reel}`,
                glow,
                106,
                528,
                new Color(255, 239, 164, 238),
                0,
                0,
                24,
                4,
            );
            const opacity = glow.addComponent(UIOpacity);
            opacity.opacity = 0;
            tween(opacity)
                .delay(reelIndex * 0.1)
                .to(0.16, { opacity: 255 })
                .to(0.2, { opacity: 126 })
                .to(0.32, { opacity: 0 })
                .call(() => glow.isValid && glow.destroy())
                .start();
            this.cells[reel].forEach((cell, row) => {
                this.scheduleOnce(() => this.pulse(cell.node, 1.14), reelIndex * 0.08 + row * 0.055);
            });
            this.createShockwave(this.reelFxClip, x, 0, 142, new Color(255, 220, 96, 210), 1.4);
        });
        this.shakeReelPanel(reels.length > 1 ? 15 : 10);
        this.burstWinParticles(reels.length > 1 ? 34 : 22);
        await this.delay(820);
    }

    private async holdLockedWildReel(reel: number): Promise<void> {
        const column = this.reelColumns[reel];
        const x = column.position.x;
        const lockGlow = this.createPanel(
            `LockedWild_${reel}`,
            this.reelFxClip,
            110,
            534,
            new Color(255, 202, 63, 52),
            x,
            0,
            26,
        );
        this.createOutlinePanel('LockedWildOutline', lockGlow, 104, 526, new Color(255, 235, 150, 224), 0, 0, 23, 3);
        const opacity = lockGlow.addComponent(UIOpacity);
        tween(opacity)
            .repeat(3, tween(opacity).to(0.18, { opacity: 232 }).to(0.18, { opacity: 94 }))
            .call(() => lockGlow.isValid && lockGlow.destroy())
            .start();
        this.cells[reel].forEach((cell, row) => {
            this.scheduleOnce(() => this.pulse(cell.node, 1.08), row * 0.07);
        });
        await this.delay((this.config.minSpinDuration + 4 * this.config.reelStopDelay) * 1000 + 330);
    }

    private async showOutcome(outcome: SpinOutcome, countWildFeature = true): Promise<void> {
        const coinTarget = this.config.coinTarget ?? 5;
        const previousMeter = this.coinCollection;
        let ascensionAward = 0;
        if (countWildFeature && outcome.expandingWildReels.length > 0) {
            this.coinCollection = Math.min(coinTarget, this.coinCollection + outcome.expandingWildReels.length);
            if (this.coinCollection >= coinTarget) {
                ascensionAward = this.currentBet * 15;
                this.coinCollection = 0;
            }
        }
        const chestAward = outcome.bonusCount >= 3
            ? this.currentBet * (12 + Math.min(3, outcome.bonusCount - 3) * 6)
            : 0;
        if (outcome.scatterCount >= 3) {
            this.freeSpinsRemaining += this.config.freeSpinsAward ?? 5;
        }
        const totalPayout = outcome.payout + chestAward + ascensionAward;
        const effectiveMultiplier = totalPayout / Math.max(1, this.currentBet);
        const winningWays = outcome.wins.reduce((total, win) => total + win.ways, 0);
        const specialCells: WinningCell[] = [];
        outcome.grid.forEach((column, reel) => column.forEach((symbol, row) => {
            if ((outcome.bonusCount >= 3 && symbol.kind === 'bonus') || (outcome.scatterCount >= 3 && symbol.kind === 'scatter')) {
                specialCells.push({ reel, row });
            }
        }));
        const highlightedCells = [...outcome.winningCells, ...specialCells];

        if (totalPayout > 0) {
            this.suppressIdleUntil = Date.now() + 2100;
            const oldCoins = this.coins;
            this.coins += totalPayout;
            this.writeCoins();
            const result = ascensionAward > 0
                ? `GOLDEN ASCENSION  +${totalPayout}`
                : chestAward > 0
                    ? `ROYAL CHEST  +${totalPayout}`
                    : `${winningWays} WAYS WIN  +${totalPayout}`;
            this.setResultText(result);
            this.winClip && this.audioSource.playOneShot(this.winClip, 0.85);
            this.coinClip && this.audioSource.playOneShot(this.coinClip, 0.55);
            this.flashWinLine();
            const isBigWin = effectiveMultiplier >= this.bigWinMultiplier;
            const isJackpot = effectiveMultiplier >= this.jackpotMultiplier;
            this.highlightWinningPayline(isBigWin, highlightedCells);
            this.shakeReelPanel(isJackpot ? 22 : isBigWin ? 15 : 10);
            this.burstWinParticles(isJackpot ? 42 : isBigWin ? 30 : 18);
            this.coinRain(isJackpot ? 64 : isBigWin ? 38 : 24);
            this.danceWinningSymbols(isBigWin, highlightedCells);
            this.flyPayout(totalPayout);
            const balanceDuration = isJackpot ? 2200 : isBigWin ? 1800 : 1400;
            this.streamCoinsToBalance(isJackpot ? 110 : isBigWin ? 76 : 44, balanceDuration);
            if (isBigWin && !isJackpot) {
                this.scheduleOnce(() => {
                    this.shakeReelPanel(11);
                    this.burstWinParticles(46);
                }, 0.42);
            }
            this.showPremiumWinStage(totalPayout, effectiveMultiplier);
            await this.countCoins(oldCoins, this.coins, balanceDuration);
        } else if (outcome.scatterCount >= 3) {
            this.suppressIdleUntil = Date.now() + 1600;
            this.setResultText(`${this.config.freeSpinsAward ?? 5} FREE SPINS AWARDED`);
            this.highlightWinningPayline(true, highlightedCells);
            this.burstWinParticles(30);
            this.coinRain(22);
            this.pulse(this.freeSpinLabel.node, 1.18);
        } else if (outcome.nearMiss) {
            this.suppressIdleUntil = Date.now() + 700;
            this.setResultText(this.copyText('nearMiss', 'SO CLOSE!'));
            this.pulse(this.cells[0][1].node, 1.18);
            this.scheduleOnce(() => this.pulse(this.cells[1][1].node, 1.18), 0.08);
            this.wobble(this.cells[2][1].node);
            this.showNearMissFocus();
            this.pulse(this.resultLabel.node, 1.1);
        } else {
            this.setResultText(outcome.expandingWildReels.length > 0
                ? `WILD ASCENSION  ${previousMeter} → ${this.coinCollection}/${coinTarget}`
                : this.copyText('lose', 'TRY AGAIN'));
        }
        this.refreshHud();
    }

    private toggleAutoSpin(): void {
        if (this.autoSpinning) {
            this.stopAutoSpin();
            return;
        }
        if (this.spinning || this.coins < this.currentBet) {
            if (this.coins < this.currentBet) {
                this.setResultText(this.copyText('insufficientCoins', 'NOT ENOUGH COINS'));
                this.pulse(this.resultLabel.node, 1.13);
                this.showRecharge();
            }
            return;
        }
        this.autoSpinning = true;
        this.updateControlButtons();
        this.pulse(this.autoButton, 1.06);
        void this.runAutoSpin();
    }

    private stopAutoSpin(): void {
        if (!this.autoSpinning) return;
        this.autoSpinning = false;
        this.updateControlButtons();
        this.pulse(this.autoButton, 1.06);
    }

    private async runAutoSpin(): Promise<void> {
        while (this.autoSpinning) {
            const completed = await this.performSpin();
            if (!completed || !this.autoSpinning) break;
            await this.delay(700);
        }
        this.autoSpinning = false;
        this.updateControlButtons();
    }

    private toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        sys.localStorage.setItem(this.soundStorageKey, this.soundEnabled ? 'on' : 'off');
        this.audioSource.volume = this.soundEnabled ? 1 : 0;
        this.updateControlButtons();
        this.pulse(this.soundButton, 1.06);
    }

    private updateControlButtons(): void {
        if (this.autoButtonLabel?.isValid) {
            this.autoButtonLabel.string = this.autoSpinning
                ? this.copyText('autoStop', 'STOP')
                : this.copyText('autoStart', 'AUTO');
        }
        if (this.soundButtonLabel?.isValid) {
            this.soundButtonLabel.string = this.soundEnabled
                ? this.copyText('soundOn', 'SOUND')
                : this.copyText('soundOff', 'MUTED');
        }
    }

    private showRecharge(): void {
        if (this.rechargeOverlay?.isValid || this.spinning) return;
        this.stopAutoSpin();
        const visual = this.config.visual;
        const overlay = this.createPanel('RechargeOverlay', this.node, this.designWidth, this.sceneHeight, new Color(73, 0, 23, 232), 0, 0, 0);
        overlay.addComponent(BlockInputEvents);
        const opacity = overlay.addComponent(UIOpacity);
        opacity.opacity = 0;
        this.rechargeOverlay = overlay;
        const card = this.createPanel('RechargeCard', overlay, 680, 940, this.color(visual.panel, 252), 0, 0, 46);
        this.createOutlinePanel('RechargeGoldFrame', card, 652, 912, this.color(visual.accentSecondary), 0, 0, 42, 5);
        this.createPanel('RechargeHeader', card, 620, 132, this.color(visual.accent, 205), 0, 356, 34);
        const storeTitle = this.createLabel('ROYAL BANK', card, 42, this.color(visual.accentSecondary), 0, 376, 580, 70, true);
        this.styleArtLabel(storeTitle, new Color(76, 12, 2, 245), 4, new Color(31, 2, 0, 185), 3, -4, 2);
        this.createLabel('ADD DEMO CREDITS TO YOUR FORTUNE', card, 16, Color.WHITE, 0, 326, 540, 34, true);
        const packs = [
            { amount: 500, image: 'theme/royal-ascension/symbols/coin-tower/spriteFrame', label: 'COIN TOWER' },
            { amount: 1200, image: 'theme/royal-ascension/symbols/diamond-rosette/spriteFrame', label: 'JEWEL RESERVE' },
            { amount: 3000, image: 'theme/royal-ascension/symbols/royal-chest-bonus/spriteFrame', label: 'ROYAL CHEST' },
        ];
        packs.forEach((pack, index) => {
            const x = -206 + index * 206;
            const item = this.createPanel(`CoinPack_${pack.amount}`, card, 186, 400, this.color(visual.reelPanel, 245), x, 40, 28);
            this.createOutlinePanel('CoinPackLine', item, 172, 386, this.color(visual.accentSecondary, index === 1 ? 220 : 110), 0, 0, 24, index === 1 ? 4 : 2);
            this.createLabel(pack.label, item, 16, index === 1 ? this.color(visual.accentSecondary) : Color.WHITE, 0, 154, 166, 30, true);
            const art = this.createSpriteNode('CoinPackArt', item, 150, 132, 0, 58);
            void this.loadResource(pack.image, SpriteFrame).then((frame) => {
                if (frame && art.isValid) art.getComponent(Sprite)!.spriteFrame = frame;
            });
            this.createLabel(`${pack.amount.toLocaleString('en-US')}`, item, 30, this.color(visual.accentSecondary), 0, -40, 170, 50, true);
            this.createLabel('COINS', item, 15, new Color(255, 255, 255, 215), 0, -75, 150, 30, true);
            this.createTextButton('ADD COINS', item, 0, -140, 154, 58, () => this.completeDemoRecharge(pack.amount), this.color(visual.accent), 18);
        });
        this.createLabel('DEMO CREDITS ONLY  •  NO REAL-MONEY PURCHASE', card, 15, new Color(255, 255, 255, 210), 0, -344, 590, 32, true);
        this.createTextButton('CLOSE', card, 0, -402, 200, 58, () => this.closeRecharge(), this.color(visual.accent), 19);
        card.setScale(0.82, 0.82, 1);
        tween(card).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        tween(opacity).to(0.18, { opacity: 255 }).start();
    }

    private completeDemoRecharge(amount: number): void {
        this.coins += amount;
        this.writeCoins();
        this.refreshHud();
        this.coinClip && this.audioSource.playOneShot(this.coinClip, 0.6);
        this.closeRecharge();
        this.scheduleOnce(() => this.pulse(this.coinLabel.node, 1.18), 0.18);
    }

    private closeRecharge(): void {
        if (!this.rechargeOverlay?.isValid) return;
        const overlay = this.rechargeOverlay;
        this.rechargeOverlay = null;
        const opacity = overlay.getComponent(UIOpacity)!;
        tween(opacity).to(0.16, { opacity: 0 }).call(() => overlay.destroy()).start();
    }

    private toggleRules(): void {
        if (this.rulesOverlay?.isValid) {
            this.closeRules();
            return;
        }
        this.stopAutoSpin();
        if (this.spinning) return;
        this.showRules();
    }

    private closeRules(): void {
        if (!this.rulesOverlay?.isValid) {
            this.rulesOverlay = null;
            return;
        }
        const overlay = this.rulesOverlay;
        this.rulesOverlay = null;
        const opacity = overlay.getComponent(UIOpacity)!;
        tween(overlay)
            .to(0.16, { scale: new Vec3(0.94, 0.94, 1) }, { easing: 'quadIn' })
            .call(() => overlay.destroy())
            .start();
        tween(opacity).to(0.16, { opacity: 0 }).start();
    }

    private showRules(): void {
        const visual = this.config.visual;
        const obsidian = new Color(68, 7, 25, 252);
        const blackMarble = new Color(91, 15, 34, 250);
        const antiqueGold = new Color(226, 168, 48, 255);
        const paleGold = new Color(255, 224, 132, 255);
        const vaultRuby = new Color(111, 7, 28, 255);
        const overlay = this.createPanel(
            'RulesOverlay',
            this.node,
            this.designWidth,
            this.sceneHeight,
            new Color(71, 0, 22, 232),
            0,
            0,
            0,
        );
        overlay.addComponent(BlockInputEvents);
        overlay.addComponent(UIOpacity).opacity = 0;
        overlay.setScale(0.92, 0.92, 1);
        this.rulesOverlay = overlay;

        const card = this.createPanel('RulesCard', overlay, 700, 1180, obsidian, 0, 0, 30);
        this.createOutlinePanel('RulesCardGold', card, 680, 1160, antiqueGold, 0, 0, 26, 6);
        this.createOutlinePanel('RulesCardInnerLine', card, 658, 1138, new Color(255, 220, 119, 92), 0, 0, 22, 2);
        this.createOutlinePanel('RulesCardRubyLine', card, 644, 1124, new Color(141, 10, 36, 160), 0, 0, 19, 2);
        this.createPanel('RulesTopRail', card, 524, 4, antiqueGold, 0, 566, 2);
        this.createPanel('RulesBottomRail', card, 524, 4, antiqueGold, 0, -566, 2);
        [[-316, 548], [316, 548], [-316, -548], [316, -548]].forEach(([x, y], index) => {
            const mount = this.createCirclePanel(`RulesCornerMount_${index}`, card, 28, antiqueGold, x, y);
            this.createCirclePanel('RulesCornerRuby', mount, 15, vaultRuby, 0, 0);
            this.createCirclePanel('RulesCornerGlint', mount, 5, new Color(255, 245, 190, 245), -3, 4);
        });

        const headerRim = this.createPanel('RulesHeaderRim', card, 638, 178, antiqueGold, 0, 474, 20);
        const headerFace = this.createPanel('RulesHeaderFace', headerRim, 620, 160, blackMarble, 0, 0, 15);
        this.createOutlinePanel('RulesHeaderInnerLine', headerFace, 602, 142, new Color(153, 10, 38, 205), 0, 0, 12, 3);
        this.createPanel('RulesHeaderGloss', headerFace, 530, 5, new Color(255, 236, 170, 68), 0, 61, 3);
        const headerFrameArt = this.createFxSprite(
            'RulesHeaderFrameArt',
            'frame',
            headerRim,
            646,
            186,
            0,
            0,
            this.color(visual.accentSecondary),
        );
        if (headerFrameArt) headerFrameArt.addComponent(UIOpacity).opacity = 116;
        const guideBadge = this.createPanel(
            'RulesGuideBadge',
            headerFace,
            286,
            30,
            antiqueGold,
            0,
            54,
            10,
        );
        const guideBadgeFace = this.createPanel(
            'RulesGuideBadgeFace',
            guideBadge,
            274,
            20,
            vaultRuby,
            0,
            0,
            7,
        );
        this.createLabel('ROYAL ASCENSION  •  PAYTABLE', guideBadgeFace, 14, paleGold, 0, 0, 262, 24, true);
        const rulesTitleLabel = this.createLabel(
            this.copyText('rulesTitle', 'PAYTABLE & RULES'),
            headerFace, 32, Color.WHITE, 0, 12, 570, 48, true,
        );
        this.styleArtLabel(rulesTitleLabel, antiqueGold, 3, new Color(0, 0, 0, 190), 2, -3, 1);
        [['ruby-crown', -258], ['diamond-rosette', 258]].forEach(([symbolId, x]) => {
            const ornament = this.createSpriteNode(`RulesHeaderOrnament_${symbolId}`, headerFace, 72, 72, Number(x), 4);
            const frame = this.symbolFrames.get(String(symbolId));
            if (frame) ornament.getComponent(Sprite)!.spriteFrame = frame;
        });
        [-220, 220].forEach((x, index) => {
            const titleSparkle = this.createSparkle(`RulesTitleTextSparkle_${index}`, headerFace, x, 15, 15);
            this.animateTextSparkle(titleSparkle, 1.2 + index * 1.4);
        });
        const rulesInstruction = this.createLabel(
            this.copyText('rulesMatch', 'MATCH 3 IDENTICAL SYMBOLS ON THE CENTER LINE'),
            headerFace, 18, new Color(255, 242, 205, 250), 0, -39, 590, 36, true,
        );
        this.styleArtLabel(rulesInstruction, new Color(98, 27, 3, 225), 1, new Color(0, 0, 0, 150), 1, -1, 0);
        [-284, 284].forEach((x, index) => {
            const sparkle = this.createSparkle(`RulesHeaderSparkle_${index}`, card, x, 492, 24);
            sparkle.angle = index === 0 ? -12 : 12;
        });

        const paytable = this.createPanel('PaytableSection', card, 646, 650, new Color(20, 15, 10, 246), 0, 70, 18);
        this.createOutlinePanel('PaytableSectionLine', paytable, 630, 634, new Color(226, 168, 48, 138), 0, 0, 15, 2);
        const payoutTitleRim = this.createPanel(
            'PayoutTitleRim',
            card,
            274,
            44,
            antiqueGold,
            0,
            388,
            22,
        );
        const payoutTitleFace = this.createPanel(
            'PayoutTitleFace',
            payoutTitleRim,
            262,
            34,
            vaultRuby,
            0,
            0,
            17,
        );
        const payoutTitleLabel = this.createLabel('SYMBOL PAYOUTS', payoutTitleFace, 18, Color.WHITE, 0, 0, 246, 34, true);
        this.styleArtLabel(payoutTitleLabel, antiqueGold, 2, new Color(0, 0, 0, 170), 1, -2, 1);
        [-154, 154].forEach((x, index) => {
            const sparkle = this.createSparkle(`PayoutTitleSparkle_${index}`, card, x, 356, 17);
            sparkle.angle = index === 0 ? -8 : 8;
        });

        this.config.symbols.forEach((symbol, index) => {
            // Two wide columns keep every symbol name and payout legible on a
            // 390 px portrait phone. The previous three-column grid rendered
            // its 14 px labels at roughly seven physical pixels.
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = column === 0 ? -158 : 158;
            const y = 238 - row * 120;
            const item = this.createPanel(
                `Rule_${symbol.id}`,
                paytable,
                294,
                106,
                blackMarble,
                x,
                y,
                24,
            );
            this.createOutlinePanel(
                `RuleOutline_${symbol.id}`,
                item,
                284,
                96,
                new Color(226, 168, 48, 142),
                0,
                0,
                20,
                2,
            );
            const icon = this.createSpriteNode(`RuleIcon_${symbol.id}`, item, 76, 76, -92, 0);
            const frame = this.symbolFrames.get(symbol.id);
            if (frame) icon.getComponent(Sprite)!.spriteFrame = frame;
            const displayNames: Record<string, string> = {
                'ruby-crown': 'RUBY CROWN',
                'sapphire-scepter': 'SAPPHIRE SCEPTER',
                'diamond-rosette': 'DIAMOND ROSETTE',
                'jewel-chalice': 'JEWEL CHALICE',
                'royal-mystery': 'ROYAL MYSTERY',
                'coin-tower': 'COIN TOWER',
                'lion-wild': 'WILD LION',
                'fortune-wheel-scatter': 'ASCENSION SCATTER',
                'royal-chest-bonus': 'BONUS CHEST',
            };
            const symbolName = this.createLabel(displayNames[symbol.id] ?? symbol.id.toUpperCase(), item, 16, new Color(255, 246, 215, 250), 45, 21, 178, 30, true);
            symbolName.enableOutline = true;
            symbolName.outlineColor = new Color(54, 21, 2, 220);
            symbolName.outlineWidth = 1;
            const multiplierBadge = this.createPanel('MultiplierBadge', item, 174, 34, vaultRuby, 45, -22, 9);
            this.createOutlinePanel('MultiplierBadgeGoldLine', multiplierBadge, 166, 28, new Color(255, 211, 99, 170), 0, 0, 7, 1.5);
            const payoutCopy = symbol.kind === 'wild'
                ? 'EXPANDS + RESPIN'
                : symbol.kind === 'scatter'
                    ? '3+ = 5 FS'
                    : symbol.kind === 'bonus'
                        ? '3+ BONUS'
                        : `${symbol.payouts?.three ?? symbol.multiplier}/${symbol.payouts?.four ?? symbol.multiplier * 2}/${symbol.payouts?.five ?? symbol.multiplier * 4}`;
            this.createLabel(payoutCopy, multiplierBadge, 15, paleGold, 0, 0, 168, 32, true);
        });

        const summary = this.createPanel('RulesSummary', card, 646, 152, blackMarble, 0, -346, 18);
        this.createOutlinePanel('RulesSummaryOutline', summary, 630, 136, new Color(226, 168, 48, 178), 0, 0, 14, 3);
        const formulaLabel = this.createLabel(
            this.copyText('rulesFormula', 'PAYOUT = BET x SYMBOL MULTIPLIER'),
            summary,
            19,
            Color.WHITE,
            0,
            45,
            580,
            38,
            true,
        );
        this.styleArtLabel(formulaLabel, antiqueGold, 2, new Color(0, 0, 0, 165), 1, -2, 1);
        const bigWinBadge = this.createPanel('BigWinBadge', summary, 286, 42, vaultRuby, -154, -12, 10);
        const jackpotBadge = this.createPanel('JackpotBadge', summary, 286, 42, new Color(66, 42, 12, 255), 154, -12, 10);
        this.createOutlinePanel('BigWinBadgeGold', bigWinBadge, 278, 34, new Color(255, 211, 99, 150), 0, 0, 8, 1.5);
        this.createOutlinePanel('JackpotBadgeGold', jackpotBadge, 278, 34, new Color(255, 211, 99, 150), 0, 0, 8, 1.5);
        this.createLabel('FULL REEL WILD = RESPIN', bigWinBadge, 15, paleGold, 0, 0, 274, 40, true);
        this.createLabel('3 CHESTS = BONUS', jackpotBadge, 15, paleGold, 0, 0, 274, 40, true);

        this.createTextButton(
            'CLOSE',
            card,
            0,
            -520,
            210,
            62,
            () => this.closeRules(),
            this.color(visual.accent),
            20,
        );

        tween(overlay).to(0.24, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        tween(overlay.getComponent(UIOpacity)!).to(0.16, { opacity: 255 }).start();
    }

    private changeBet(direction: number): void {
        if (this.spinning || this.autoSpinning || this.rulesOverlay?.isValid) return;
        this.betIndex = (this.betIndex + direction + this.config.betOptions.length) % this.config.betOptions.length;
        this.refreshHud();
        this.pulse(this.betLabel.node, 1.08);
    }

    private applySymbol(sprite: Sprite, symbol: SymbolConfig): void {
        const frame = this.symbolFrames.get(symbol.id);
        if (frame) {
            sprite.spriteFrame = frame;
            sprite.color = Color.WHITE;

            // Fit every symbol inside its reel cell without changing the
            // source aspect ratio. The previous fixed 104×116 rectangle made
            // round jewels and coins look vertically stretched.
            const cellTransform = sprite.node.parent?.getComponent(UITransform);
            const sourceSize = frame.originalSize;
            if (cellTransform && sourceSize.width > 0 && sourceSize.height > 0) {
                const fitWidth = cellTransform.contentSize.width * 0.91;
                const fitHeight = cellTransform.contentSize.height * 0.88;
                const fitScale = Math.min(fitWidth / sourceSize.width, fitHeight / sourceSize.height);
                this.ensureTransform(
                    sprite.node,
                    sourceSize.width * fitScale,
                    sourceSize.height * fitScale,
                );
            }
        }
    }

    private refreshHud(): void {
        this.coinLabel.string = this.coins.toLocaleString('en-US');
        this.betLabel.string = `BET ${this.currentBet}`;
        if (this.jackpotLabel?.isValid) {
            this.jackpotLabel.string = `ASCENSION POT  ${Math.floor(this.jackpotValue).toLocaleString('en-US')}`;
        }
        if (this.coinMeterLabel?.isValid) {
            this.coinMeterLabel.string = `WILD REELS  ${this.coinCollection}/${this.config.coinTarget ?? 5}`;
        }
        if (this.freeSpinLabel?.isValid) {
            this.freeSpinLabel.string = this.freeSpinsRemaining > 0
                ? `FREE SPINS  ${this.freeSpinsRemaining}`
                : `${this.config.waysCount ?? 1024} WAYS`;
        }
    }

    private setResultText(text: string): void {
        this.resultLabel.string = text;
        this.resultShadowLabel.string = text;
    }

    private get currentBet(): number {
        return this.config.betOptions[this.betIndex];
    }

    private get coinStorageKey(): string {
        return `slot-factory-v2-${this.config.id}-coins`;
    }

    private readCoins(): number {
        const raw = sys.localStorage.getItem(this.coinStorageKey);
        if (raw === null || raw === '') return this.config.initialCoins;
        const stored = Number(raw);
        return Number.isFinite(stored) && stored >= 0 ? stored : this.config.initialCoins;
    }

    private writeCoins(): void {
        sys.localStorage.setItem(this.coinStorageKey, String(this.coins));
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

    private createOutlinePanel(
        name: string,
        parent: Node,
        width: number,
        height: number,
        color: Color,
        x: number,
        y: number,
        radius: number,
        lineWidth: number,
    ): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const graphics = node.addComponent(Graphics);
        graphics.strokeColor = color;
        graphics.lineWidth = lineWidth;
        graphics.roundRect(
            -width / 2 + lineWidth,
            -height / 2 + lineWidth,
            width - lineWidth * 2,
            height - lineWidth * 2,
            radius,
        );
        graphics.stroke();
        return node;
    }

    private createSparkle(name: string, parent: Node, x: number, y: number, size: number): Node {
        const sparkle = new Node(name);
        parent.addChild(sparkle);
        sparkle.setPosition(x, y);
        this.ensureTransform(sparkle, size, size);
        this.createPanel('SparkleVertical', sparkle, Math.max(3, size * 0.16), size, Color.WHITE, 0, 0, size * 0.08);
        this.createPanel('SparkleHorizontal', sparkle, size, Math.max(3, size * 0.16), Color.WHITE, 0, 0, size * 0.08);
        this.createCirclePanel('SparkleCore', sparkle, Math.max(5, size * 0.24), this.color(this.config.visual.accentSecondary), 0, 0);
        return sparkle;
    }

    private createCirclePanel(name: string, parent: Node, diameter: number, color: Color, x: number, y: number): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, diameter, diameter);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.circle(0, 0, diameter / 2);
        graphics.fill();
        return node;
    }

    private createCircleOutline(
        name: string,
        parent: Node,
        diameter: number,
        color: Color,
        x: number,
        y: number,
        lineWidth: number,
    ): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, diameter, diameter);
        const graphics = node.addComponent(Graphics);
        graphics.strokeColor = color;
        graphics.lineWidth = lineWidth;
        graphics.circle(0, 0, diameter / 2 - lineWidth);
        graphics.stroke();
        return node;
    }

    private createSpriteNode(name: string, parent: Node, width: number, height: number, x: number, y: number): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        return node;
    }

    private createCabinetReelForeground(): void {
        const sourceFrame = this.preloadedFrames.get(this.config.visual.background);
        const texture = sourceFrame?.texture;
        if (!sourceFrame || !texture) return;
        const sourceWidth = sourceFrame.originalSize.width || sourceFrame.rect.width;
        const sourceHeight = sourceFrame.originalSize.height || sourceFrame.rect.height;
        const scaleX = this.designWidth / sourceWidth;
        const scaleY = this.sceneHeight / sourceHeight;
        const foreground = new Node('CabinetReelForeground');
        this.node.addChild(foreground);
        this.ensureTransform(foreground, this.designWidth, this.sceneHeight);

        const addSlice = (name: string, x: number, y: number, width: number, height: number): void => {
            const frame = new SpriteFrame();
            frame.texture = texture;
            frame.rect = new Rect(sourceFrame.rect.x + x, sourceFrame.rect.y + y, width, height);
            frame.originalSize = new Size(width, height);
            frame.offset = new Vec2(0, 0);
            frame.rotated = false;
            const node = this.createSpriteNode(
                name,
                foreground,
                width * scaleX,
                height * scaleY,
                (x + width / 2 - sourceWidth / 2) * scaleX,
                (sourceHeight / 2 - y - height / 2) * scaleY,
            );
            node.getComponent(Sprite)!.spriteFrame = frame;
        };

        // Exact cabinet artwork sits in front of the live reels. The curved
        // rails, five reel separators and four row dividers remain visible
        // during motion, so the grid reads as hardware mounted behind glass.
        addSlice('CabinetScreenLeft', 84, 332, 40, 650);
        addSlice('CabinetScreenRight', 765, 332, 40, 650);
        addSlice('CabinetScreenTop', 88, 330, 710, 48);
        addSlice('CabinetScreenBottom', 88, 935, 710, 50);
        [234, 371, 508, 645].forEach((x, index) => addSlice(`CabinetReelDivider_${index}`, x - 5, 350, 10, 610));
        [507, 650, 794].forEach((y, index) => addSlice(`CabinetRowDivider_${index}`, 104, y - 5, 680, 10));
    }

    private createFxSprite(
        name: string,
        frameKey: string,
        parent: Node,
        width: number,
        height: number,
        x: number,
        y: number,
        color: Color = Color.WHITE,
    ): Node | null {
        const frame = this.fxFrames.get(frameKey);
        if (!frame) return null;
        const node = this.createSpriteNode(name, parent, width, height, x, y);
        const sprite = node.getComponent(Sprite)!;
        sprite.spriteFrame = frame;
        sprite.color = color;
        return node;
    }

    private createLabel(text: string, parent: Node, fontSize: number, color: Color, x: number, y: number, width: number, height: number, bold = false): Label {
        const node = new Node(`Label_${text}`);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontFamily = 'Arial Rounded MT Bold';
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableWrapText = false;
        label.isBold = true;
        label.spacingX = bold ? 1 : 0;
        return label;
    }

    private styleArtLabel(
        label: Label,
        outlineColor: Color,
        outlineWidth: number,
        shadowColor: Color,
        shadowX = 2,
        shadowY = -2,
        shadowBlur = 1,
    ): Label {
        label.enableOutline = true;
        label.outlineColor = outlineColor;
        label.outlineWidth = outlineWidth;
        label.enableShadow = true;
        label.shadowColor = shadowColor;
        label.shadowOffset = new Vec2(shadowX, shadowY);
        label.shadowBlur = shadowBlur;
        return label;
    }

    private animateTextSparkle(sparkle: Node, initialDelay = 0): void {
        sparkle.setScale(0.22, 0.22, 1);
        const opacity = sparkle.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(sparkle)
            .delay(initialDelay)
            .to(0.18, { scale: new Vec3(1.08, 1.08, 1), angle: sparkle.angle + 38 }, { easing: 'backOut' })
            .to(0.28, { scale: new Vec3(0.24, 0.24, 1), angle: sparkle.angle + 94 })
            .delay(2.65)
            .union()
            .repeatForever()
            .start();
        tween(opacity)
            .delay(initialDelay)
            .to(0.14, { opacity: 235 })
            .to(0.32, { opacity: 0 })
            .delay(2.65)
            .union()
            .repeatForever()
            .start();
    }

    private createTextButton(text: string, parent: Node, x: number, y: number, width: number, height: number, handler: () => void, color: Color, fontSize: number): Node {
        const node = this.createPanel(`Button_${text}`, parent, width, height, this.color(this.config.visual.accentSecondary), x, y, Math.min(width, height) / 2);
        const face = this.createPanel(`ButtonFace_${text}`, node, width - 8, height - 8, color, 0, 0, Math.min(width, height) / 2 - 4);
        this.createPanel(`ButtonGloss_${text}`, face, Math.max(20, width - 26), 8, new Color(255, 255, 255, 70), 0, height * 0.22, 4);
        node.addComponent(Button);
        node.on(Button.EventType.CLICK, handler, this);
        this.bindPressMotion(node);
        const label = this.createLabel(text, face, fontSize, Color.WHITE, 0, 1, width - 8, height - 8, true);
        if (fontSize >= 18) {
            this.styleArtLabel(
                label,
                new Color(94, 17, 4, 235),
                fontSize >= 28 ? 3 : 2,
                new Color(42, 3, 0, 175),
                2,
                -2,
                1,
            );
        }
        return node;
    }

    private createUtilityButton(
        text: string,
        parent: Node,
        x: number,
        y: number,
        width: number,
        height: number,
        handler: () => void,
    ): Node {
        const node = this.createPanel(
            `UtilityButton_${text}`,
            parent,
            width,
            height,
            new Color(255, 255, 255, 10),
            x,
            y,
            height / 2,
        );
        this.createOutlinePanel(
            `UtilityButtonOutline_${text}`,
            node,
            width - 4,
            height - 4,
            this.color(this.config.visual.accentSecondary, 58),
            0,
            0,
            height / 2 - 2,
            1.5,
        );
        this.createCirclePanel(
            `UtilityButtonStatus_${text}`,
            node,
            7,
            this.color(this.config.visual.accentSecondary, 220),
            -width / 2 + 22,
            0,
        );
        node.addComponent(Button);
        node.on(Button.EventType.CLICK, handler, this);
        this.bindPressMotion(node);
        const label = this.createLabel(text, node, 18, new Color(255, 255, 255, 245), 8, 0, width - 42, height, true);
        this.styleArtLabel(label, new Color(94, 17, 4, 220), 2, new Color(35, 3, 0, 150), 1, -2, 0);
        return node;
    }

    private bindPressMotion(node: Node): void {
        node.on(Node.EventType.TOUCH_START, () => {
            Tween.stopAllByTarget(node);
            tween(node).to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadOut' }).start();
        });
        const release = () => {
            Tween.stopAllByTarget(node);
            tween(node).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        };
        node.on(Node.EventType.TOUCH_END, release);
        node.on(Node.EventType.TOUCH_CANCEL, release);
    }

    private bindProxyButton(target: Node, visual: Node, handler: () => void): void {
        target.addComponent(Button);
        target.on(Button.EventType.CLICK, handler, this);
        target.on(Node.EventType.TOUCH_START, () => {
            Tween.stopAllByTarget(visual);
            tween(visual).to(0.06, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadOut' }).start();
        });
        const release = (): void => {
            Tween.stopAllByTarget(visual);
            tween(visual).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        };
        target.on(Node.EventType.TOUCH_END, release);
        target.on(Node.EventType.TOUCH_CANCEL, release);
    }

    private ensureTransform(node: Node, width: number, height: number): UITransform {
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        return transform;
    }

    private pulse(node: Node, scale = 1.12): void {
        Tween.stopAllByTarget(node);
        tween(node)
            .to(0.1, { scale: new Vec3(scale, scale, 1) }, { easing: 'quadOut' })
            .to(0.2, { scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
    }

    private wobble(node: Node): void {
        const x = node.position.x;
        const y = node.position.y;
        tween(node)
            .to(0.06, { position: new Vec3(x - 10, y, 0) })
            .to(0.06, { position: new Vec3(x + 10, y, 0) })
            .to(0.06, { position: new Vec3(x - 6, y, 0) })
            .to(0.08, { position: new Vec3(x, y, 0) })
            .start();
    }

    private pulseSpinButton(): void {
        Tween.stopAllByTarget(this.spinButton);
        tween(this.spinButton)
            .to(0.07, { scale: new Vec3(0.9, 0.9, 1) }, { easing: 'quadOut' })
            .to(0.2, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'backOut' })
            .to(0.12, { scale: Vec3.ONE })
            .start();
    }

    private async animateIdleGlow(glow: Node): Promise<void> {
        while (glow.isValid) {
            const opacity = glow.getComponent(UIOpacity);
            tween(glow).to(0.85, { scale: new Vec3(1.1, 1.1, 1) }).to(0.55, { scale: Vec3.ONE }).start();
            if (opacity) tween(opacity).to(0.85, { opacity: 20 }).to(0.55, { opacity: 75 }).start();
            await this.delay(1450);
        }
    }

    private async animateSpinAura(version: number): Promise<void> {
        while (this.spinAura?.isValid && version === this.fxVersion) {
            const opacity = this.spinAura.getComponent(UIOpacity);
            const duration = this.spinning ? 0.72 : 2.2;
            const targetAngle = this.spinAura.angle + (this.spinning ? 82 : 32);
            tween(this.spinAura)
                .to(duration, {
                    angle: targetAngle,
                    scale: this.spinning ? new Vec3(1.12, 1.12, 1) : new Vec3(1.04, 1.04, 1),
                }, { easing: 'quadInOut' })
                .to(duration * 0.42, { scale: Vec3.ONE }, { easing: 'quadOut' })
                .start();
            if (opacity) {
                tween(opacity)
                    .to(duration * 0.55, { opacity: this.spinning ? 168 : 112 })
                    .to(duration * 0.45, { opacity: this.spinning ? 96 : 66 })
                    .start();
            }
            await this.delay((duration + duration * 0.42) * 1000);
        }
    }

    private async animateAmbientSparkles(version: number): Promise<void> {
        while (this.node.isValid && version === this.fxVersion) {
            // Keep decorative glints behind modal content. Over a rules,
            // recharge or wheel card, the cross-shaped glint can be mistaken
            // for a close button even though it is not interactive.
            if (!this.rulesOverlay?.isValid && !this.rechargeOverlay?.isValid) {
                this.createAmbientSparkle();
            }
            await this.delay(210 + Math.random() * 190);
        }
    }

    private createAmbientSparkle(): void {
        const onSide = Math.random() > 0.45;
        const x = onSide ? (Math.random() > 0.5 ? 325 : -325) + (Math.random() - 0.5) * 36 : (Math.random() - 0.5) * 560;
        const y = onSide ? -170 + Math.random() * 610 : 430 + Math.random() * 130;
        const useImage = this.fxFrames.has('magicStar') && Math.random() > 0.52;
        const sparkle = useImage
            ? this.createFxSprite(
                'AmbientImageSparkle',
                'magicStar',
                this.node,
                42,
                42,
                x,
                y,
                Math.random() > 0.35 ? this.color(this.config.visual.accentSecondary) : Color.WHITE,
            )!
            : new Node('AmbientSparkle');
        if (!useImage) this.node.addChild(sparkle);
        sparkle.setPosition(x, y);
        sparkle.setScale(0.05, 0.05, 1);
        this.ensureTransform(sparkle, 24, 24);
        if (!useImage) {
            const graphics = sparkle.addComponent(Graphics);
            graphics.fillColor = Math.random() > 0.35
                ? this.color(this.config.visual.accentSecondary, 220)
                : new Color(255, 255, 255, 230);
            graphics.roundRect(-2, -12, 4, 24, 2);
            graphics.roundRect(-12, -2, 24, 4, 2);
            graphics.fill();
        }
        const opacity = sparkle.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(sparkle)
            .to(0.28, { scale: new Vec3(1.15, 1.15, 1), angle: 35 }, { easing: 'backOut' })
            .to(0.45, { scale: new Vec3(0.05, 0.05, 1), angle: 90 })
            .call(() => sparkle.destroy())
            .start();
        tween(opacity).to(0.18, { opacity: 255 }).delay(0.22).to(0.3, { opacity: 0 }).start();
    }

    private async animateGoldDust(version: number): Promise<void> {
        while (this.node.isValid && version === this.fxVersion) {
            if (!this.rulesOverlay?.isValid && !this.rechargeOverlay?.isValid) {
                this.createGoldDustParticle();
                if (Math.random() > 0.58) this.createGoldDustParticle();
            }
            await this.delay(150 + Math.random() * 140);
        }
    }

    private createGoldDustParticle(): void {
        const diameter = 3 + Math.random() * 7;
        const startX = -340 + Math.random() * 680;
        const startY = -300 + Math.random() * 760;
        const dust = this.createCirclePanel(
            'GoldDust',
            this.node,
            diameter,
            Math.random() > 0.22
                ? this.color(this.config.visual.accentSecondary)
                : Color.WHITE,
            startX,
            startY,
        );
        const opacity = dust.addComponent(UIOpacity);
        opacity.opacity = 0;
        const duration = 1.15 + Math.random() * 1.15;
        tween(dust)
            .to(duration, {
                position: new Vec3(startX + (Math.random() - 0.5) * 90, startY + 100 + Math.random() * 170, 0),
                scale: new Vec3(0.25, 0.25, 1),
            }, { easing: 'quadOut' })
            .call(() => dust.destroy())
            .start();
        tween(opacity)
            .to(duration * 0.22, { opacity: 150 + Math.random() * 105 })
            .delay(duration * 0.38)
            .to(duration * 0.4, { opacity: 0 })
            .start();
    }

    private async animateMarqueeLights(version: number): Promise<void> {
        let head = 0;
        while (this.node.isValid && version === this.fxVersion && this.marqueeLights.length > 0) {
            const count = this.marqueeLights.length;
            this.marqueeLights.forEach((opacity, index) => {
                if (!opacity.node.isValid) return;
                const backwardDistance = (head - index + count) % count;
                const forwardDistance = (index - head + count) % count;
                if (backwardDistance === 0) opacity.opacity = 255;
                else if (backwardDistance <= 2) opacity.opacity = 220 - backwardDistance * 24;
                else if (forwardDistance === 1) opacity.opacity = 165;
                else opacity.opacity = 45 + ((index + head) % 3) * 13;
            });
            head = (head + 1) % count;
            await this.delay(this.spinning ? 44 : 68);
        }
    }

    private async animateGoldenSweeps(version: number): Promise<void> {
        await this.delay(420);
        while (this.node.isValid && version === this.fxVersion) {
            if (this.reelFxClip?.isValid) this.createGoldenSweep();
            await this.delay(this.spinning ? 1150 : 2350 + Math.random() * 650);
        }
    }

    private createGoldenSweep(): void {
        const sweep = new Node('GoldenSweep');
        this.reelFxClip.addChild(sweep);
        sweep.setPosition(-340, 0);
        sweep.angle = -9;
        this.ensureTransform(sweep, 104, 556);
        const opacity = sweep.addComponent(UIOpacity);
        opacity.opacity = 0;
        this.createPanel('SweepWide', sweep, 60, 550, this.color(this.config.visual.accentSecondary, 72), 0, 0, 26);
        this.createPanel('SweepCore', sweep, 11, 550, new Color(255, 255, 255, 155), 4, 0, 6);
        this.createPanel('SweepTrail', sweep, 22, 550, this.color(this.config.visual.accent, 45), -42, 0, 11);
        tween(sweep)
            .to(0.92, { position: new Vec3(340, 0, 0) }, { easing: 'quadInOut' })
            .call(() => sweep.destroy())
            .start();
        tween(opacity)
            .to(0.12, { opacity: 125 })
            .delay(0.56)
            .to(0.24, { opacity: 0 })
            .start();
    }

    private async animateIdleSymbols(version: number): Promise<void> {
        await this.delay(520);
        while (this.node.isValid && version === this.fxVersion) {
            if (!this.spinning && Date.now() >= this.suppressIdleUntil && this.cells.length === 5) {
                const reel = Math.floor(Math.random() * this.cells.length);
                const row = Math.floor(Math.random() * this.rowCount);
                const symbol = this.cells[reel][row]?.node;
                if (symbol?.isValid) {
                    const lean = Math.random() > 0.5 ? 5 : -5;
                    tween(symbol)
                        .to(0.24, { scale: new Vec3(1.1, 1.1, 1), angle: lean }, { easing: 'quadOut' })
                        .to(0.18, { scale: new Vec3(0.97, 0.97, 1), angle: -lean * 0.45 })
                        .to(0.26, { scale: Vec3.ONE, angle: 0 }, { easing: 'backOut' })
                        .start();
                }
            }
            await this.delay(430 + Math.random() * 360);
        }
    }

    private async animateTitleFloat(version: number): Promise<void> {
        const originY = this.titleNode.position.y;
        while (this.titleNode.isValid && version === this.fxVersion) {
            tween(this.titleNode)
                .to(1.25, { position: new Vec3(0, originY + 8, 0), angle: 1.2 }, { easing: 'quadInOut' })
                .to(1.25, { position: new Vec3(0, originY - 3, 0), angle: -1.1 }, { easing: 'quadInOut' })
                .to(0.55, { position: new Vec3(0, originY, 0), angle: 0 }, { easing: 'quadOut' })
                .start();
            await this.delay(3100);
        }
    }

    private async animateVaultCoins(version: number): Promise<void> {
        await this.delay(780);
        while (this.node.isValid && version === this.fxVersion) {
            if (!this.spinning && this.topCoinFrame) this.createAmbientVaultCoin();
            await this.delay(1500 + Math.random() * 900);
        }
    }

    private createAmbientVaultCoin(): void {
        if (!this.topCoinFrame) return;
        const onRight = Math.random() > 0.5;
        const startX = onRight ? 342 : -342;
        const startY = -390 + Math.random() * 650;
        const size = 32 + Math.random() * 10;
        const coin = this.createSpriteNode('AmbientVaultCoin', this.node, size, size, startX, startY);
        coin.getComponent(Sprite)!.spriteFrame = this.topCoinFrame;
        coin.setScale(0.18, 0.7, 1);
        const opacity = coin.addComponent(UIOpacity);
        opacity.opacity = 0;
        const targetX = startX + (onRight ? -12 : 12);
        tween(coin)
            .to(0.32, { scale: new Vec3(0.78, 1, 1), angle: onRight ? -18 : 18 }, { easing: 'backOut' })
            .to(1.45, { position: new Vec3(targetX, startY + 126, 0), scale: new Vec3(0.28, 1, 1), angle: onRight ? 190 : -190 }, { easing: 'quadInOut' })
            .to(0.32, { scale: new Vec3(0.08, 0.7, 1), position: new Vec3(targetX, startY + 160, 0) })
            .call(() => coin.destroy())
            .start();
        tween(opacity)
            .to(0.22, { opacity: 115 })
            .delay(1.2)
            .to(0.55, { opacity: 0 })
            .start();
    }

    private spinIgnition(): void {
        const x = this.spinButton.position.x;
        const y = this.spinButton.position.y;
        for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
            this.scheduleOnce(() => {
                this.createShockwave(
                    this.node,
                    x,
                    y,
                    134,
                    ringIndex % 2 === 0 ? this.color(this.config.visual.accentSecondary) : Color.WHITE,
                    1.48 + ringIndex * 0.18,
                );
            }, ringIndex * 0.06);
        }
        this.burstAt(x, y, 18, 150);
    }

    private async playSpinStreaks(): Promise<void> {
        let wave = 0;
        while (this.spinning && wave < 14 && this.reelFxClip.isValid) {
            for (let index = 0; index < 9; index += 1) {
                const width = 3 + Math.random() * 7;
                const height = 68 + Math.random() * 120;
                const streak = this.createPanel(
                    `SpeedStreak_${wave}_${index}`,
                    this.reelFxClip,
                    width,
                    height,
                    index % 3 === 0 ? new Color(255, 255, 255, 135) : this.color(this.config.visual.accentSecondary, 112),
                    -275 + Math.random() * 550,
                    255 + Math.random() * 36,
                    width / 2,
                );
                const opacity = streak.addComponent(UIOpacity);
                opacity.opacity = 0;
                const duration = 0.18 + Math.random() * 0.14;
                tween(streak)
                    .to(duration, { position: new Vec3(streak.position.x, -286, 0), scale: new Vec3(1, 0.25, 1) }, { easing: 'quadIn' })
                    .call(() => streak.destroy())
                    .start();
                tween(opacity).to(0.04, { opacity: 205 }).to(duration - 0.04, { opacity: 0 }).start();
            }
            wave += 1;
            await this.delay(82);
        }
    }

    private spawnSpinBeam(reel: number): void {
        const x = this.reelColumns[reel]?.position.x ?? 0;
        const beam = this.createFxSprite(
            `SpinBeam_${reel}`,
            'verticalGlow',
            this.reelFxClip,
            94,
            532,
            x,
            0,
            this.color(this.config.visual.accentSecondary),
        );
        if (!beam) return;
        beam.setScale(0.38, 1.12, 1);
        const opacity = beam.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(beam)
            .to(0.22, { scale: new Vec3(0.92, 1.04, 1) }, { easing: 'quadOut' })
            .delay(0.56 + reel * 0.16)
            .to(0.22, { scale: new Vec3(0.45, 1.25, 1) })
            .call(() => beam.destroy())
            .start();
        tween(opacity)
            .to(0.1, { opacity: 118 })
            .delay(0.55 + reel * 0.16)
            .to(0.24, { opacity: 0 })
            .start();
    }

    private spawnReelGhost(reel: number): void {
        const sourceRow = Math.floor(Math.random() * this.rowCount);
        const frame = this.cells[reel]?.[sourceRow]?.spriteFrame;
        if (!frame || !this.reelFxClip?.isValid) return;
        const x = this.reelColumns[reel]?.position.x ?? 0;
        const ghost = this.createSpriteNode(`ReelGhost_${reel}`, this.reelFxClip, 82, 118, x, 258);
        const sprite = ghost.getComponent(Sprite)!;
        sprite.spriteFrame = frame;
        sprite.color = new Color(255, 246, 196, 176);
        ghost.setScale(0.76, 1.12, 1);
        const opacity = ghost.addComponent(UIOpacity);
        opacity.opacity = 0;
        const duration = 0.22 + Math.random() * 0.08;
        tween(ghost)
            .to(duration, {
                position: new Vec3(x, -274, 0),
                scale: new Vec3(0.56, 1.32, 1),
            }, { easing: 'quadIn' })
            .call(() => ghost.destroy())
            .start();
        tween(opacity).to(0.04, { opacity: 64 }).to(duration - 0.04, { opacity: 0 }).start();
    }

    private reelStopBurst(reel: number): void {
        const x = this.reelColumns[reel]?.position.x ?? 0;
        const flash = this.createPanel(
            `ReelStopFlash_${reel}`,
            this.reelFxClip,
            92,
            538,
            new Color(255, 244, 196, 92),
            x,
            0,
            24,
        );
        const opacity = flash.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity)
            .to(0.045, { opacity: 126 })
            .to(0.2, { opacity: 0 })
            .call(() => flash.destroy())
            .start();
        const ring = this.createFxSprite(
            `ReelStopRing_${reel}`,
            'goldRing',
            this.reelFxClip,
            92,
            92,
            x,
            0,
            this.color(this.config.visual.accentSecondary),
        );
        if (ring) {
            ring.setScale(0.25, 0.25, 1);
            const ringOpacity = ring.addComponent(UIOpacity);
            ringOpacity.opacity = 0;
            tween(ring)
                .to(0.26, { scale: new Vec3(1.18, 1.18, 1), angle: 42 }, { easing: 'backOut' })
                .to(0.18, { scale: new Vec3(1.52, 1.52, 1), angle: 70 })
                .call(() => ring.destroy())
                .start();
            tween(ringOpacity).to(0.06, { opacity: 220 }).delay(0.16).to(0.22, { opacity: 0 }).start();
        }
        const lightRing = this.createFxSprite(
            `ReelStopLightRing_${reel}`,
            'lightRing',
            this.reelFxClip,
            88,
            88,
            x,
            0,
            this.color(this.config.visual.accentSecondary),
        );
        if (lightRing) {
            lightRing.setScale(0.18, 0.18, 1);
            const lightRingOpacity = lightRing.addComponent(UIOpacity);
            lightRingOpacity.opacity = 0;
            tween(lightRing)
                .to(0.18, { scale: new Vec3(1.06, 1.06, 1), angle: -24 }, { easing: 'backOut' })
                .to(0.24, { scale: new Vec3(1.28, 1.28, 1), angle: 18 })
                .call(() => lightRing.destroy())
                .start();
            tween(lightRingOpacity).to(0.05, { opacity: 245 }).delay(0.11).to(0.25, { opacity: 0 }).start();
        }
        const stopLine = this.createFxSprite(
            `ReelStopHitLine_${reel}`,
            'hitLine',
            this.reelFxClip,
            176,
            34,
            x,
            0,
            this.color(this.config.visual.accentSecondary),
        );
        if (stopLine) {
            stopLine.setScale(0.08, 1, 1);
            const lineOpacity = stopLine.addComponent(UIOpacity);
            lineOpacity.opacity = 0;
            tween(stopLine)
                .to(0.13, { scale: new Vec3(1.08, 1.18, 1) }, { easing: 'backOut' })
                .to(0.2, { scale: new Vec3(0.72, 0.55, 1) })
                .call(() => stopLine.destroy())
                .start();
            tween(lineOpacity).to(0.04, { opacity: 225 }).delay(0.1).to(0.2, { opacity: 0 }).start();
        }
        const star = this.createFxSprite(
            `ReelStopStar_${reel}`,
            'magicStar',
            this.reelFxClip,
            116,
            116,
            x,
            0,
            Color.WHITE,
        );
        if (star) {
            star.setScale(0.12, 0.12, 1);
            const starOpacity = star.addComponent(UIOpacity);
            tween(star)
                .to(0.16, { scale: new Vec3(1.2, 1.2, 1), angle: 32 }, { easing: 'backOut' })
                .to(0.2, { scale: new Vec3(0.2, 0.2, 1), angle: 82 })
                .call(() => star.destroy())
                .start();
            tween(starOpacity).delay(0.08).to(0.27, { opacity: 0 }).start();
        }
        this.createShockwave(this.reelFxClip, x, 0, 104, this.color(this.config.visual.accentSecondary), 2.15);
        this.burstAt(x, 0, 10, 105, this.reelFxClip);
    }

    private flashWinLine(): void {
        const opacity = this.winLine.getComponent(UIOpacity)!;
        this.winLine.setScale(0.12, 1, 1);
        opacity.opacity = 80;
        tween(this.winLine).to(0.24, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        tween(opacity).to(0.14, { opacity: 255 }).to(0.18, { opacity: 95 }).to(0.14, { opacity: 255 }).to(0.42, { opacity: 80 }).start();
    }

    private shakeReelPanel(intensity = 9): void {
        const y = this.reelPanel.position.y;
        tween(this.reelPanel)
            .to(0.045, { position: new Vec3(-intensity, y + intensity * 0.25, 0) })
            .to(0.045, { position: new Vec3(intensity, y - intensity * 0.2, 0) })
            .to(0.045, { position: new Vec3(-intensity * 0.65, y, 0) })
            .to(0.08, { position: new Vec3(0, y, 0) })
            .start();
    }

    private createShockwave(parent: Node, x: number, y: number, diameter: number, color: Color, targetScale: number): void {
        const ring = new Node('Shockwave');
        parent.addChild(ring);
        ring.setPosition(x, y);
        ring.setScale(0.45, 0.45, 1);
        this.ensureTransform(ring, diameter, diameter);
        const graphics = ring.addComponent(Graphics);
        graphics.strokeColor = color;
        graphics.lineWidth = 5;
        graphics.circle(0, 0, diameter / 2 - 6);
        graphics.stroke();
        const opacity = ring.addComponent(UIOpacity);
        opacity.opacity = 230;
        tween(ring)
            .to(0.42, { scale: new Vec3(targetScale, targetScale, 1), angle: 35 }, { easing: 'quadOut' })
            .call(() => ring.destroy())
            .start();
        tween(opacity).delay(0.05).to(0.37, { opacity: 0 }).start();
    }

    private createCleanCelebrationAura(
        name: string,
        parent: Node,
        diameter: number,
        x: number,
        y: number,
        color: Color,
    ): Node {
        // Procedural geometry avoids the dark alpha fringe present in the
        // legacy ray/flare textures while keeping a layered premium glow.
        const aura = new Node(name);
        parent.addChild(aura);
        aura.setPosition(x, y);
        this.ensureTransform(aura, diameter, diameter);
        this.createCirclePanel(
            'AuraSoftCore',
            aura,
            diameter * 0.46,
            new Color(color.r, color.g, color.b, 22),
            0,
            0,
        );
        this.createCircleOutline(
            'AuraOuterRing',
            aura,
            diameter * 0.9,
            new Color(color.r, color.g, color.b, 112),
            0,
            0,
            Math.max(3, diameter * 0.006),
        );
        this.createCircleOutline(
            'AuraInnerRing',
            aura,
            diameter * 0.68,
            new Color(255, 255, 255, 74),
            0,
            0,
            Math.max(2, diameter * 0.004),
        );
        for (let index = 0; index < 16; index += 1) {
            const angle = index * 22.5;
            const radians = angle * Math.PI / 180;
            const radius = diameter * (index % 2 === 0 ? 0.41 : 0.35);
            const ray = this.createPanel(
                `AuraRay_${index}`,
                aura,
                diameter * (index % 2 === 0 ? 0.16 : 0.1),
                Math.max(3, diameter * 0.008),
                index % 4 === 0
                    ? new Color(255, 255, 255, 122)
                    : new Color(color.r, color.g, color.b, 92),
                Math.cos(radians) * radius,
                Math.sin(radians) * radius,
                Math.max(2, diameter * 0.004),
            );
            ray.angle = angle;
            this.createCirclePanel(
                `AuraGem_${index}`,
                aura,
                index % 4 === 0 ? diameter * 0.022 : diameter * 0.013,
                index % 4 === 0 ? Color.WHITE : new Color(color.r, color.g, color.b, 205),
                Math.cos(radians) * diameter * 0.46,
                Math.sin(radians) * diameter * 0.46,
            );
        }
        return aura;
    }

    private burstAt(x: number, y: number, count: number, radius: number, parent: Node = this.node): void {
        const palette = [
            this.color(this.config.visual.accent),
            this.color(this.config.visual.accentSecondary),
            Color.WHITE,
            new Color(255, 105, 190),
        ];
        for (let index = 0; index < count; index += 1) {
            const particle = this.createCirclePanel(
                `Burst_${index}`,
                parent,
                6 + Math.random() * 10,
                palette[index % palette.length],
                x,
                y,
            );
            const opacity = particle.addComponent(UIOpacity);
            const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.22;
            const distance = radius * (0.58 + Math.random() * 0.55);
            const duration = 0.25 + Math.random() * 0.2;
            tween(particle)
                .to(duration, {
                    position: new Vec3(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0),
                    scale: new Vec3(0.15, 0.15, 1),
                }, { easing: 'quadOut' })
                .call(() => particle.destroy())
                .start();
            tween(opacity).delay(duration * 0.35).to(duration * 0.65, { opacity: 0 }).start();
        }
    }

    private flashScreen(isBig: boolean): void {
        const flash = this.createPanel('ScreenFlash', this.node, this.designWidth, this.sceneHeight, Color.WHITE, 0, 0, 0);
        const opacity = flash.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity)
            .to(0.055, { opacity: isBig ? 150 : 95 })
            .to(0.24, { opacity: 0 })
            .call(() => flash.destroy())
            .start();
    }

    private premiumWinImpact(isBig: boolean): void {
        const aura = this.createCleanCelebrationAura(
            'PremiumWinAura',
            this.node,
            isBig ? 760 : 610,
            0,
            55,
            this.color(this.config.visual.accentSecondary),
        );
        aura.setScale(0.18, 0.18, 1);
        const auraOpacity = aura.addComponent(UIOpacity);
        auraOpacity.opacity = 0;
        tween(aura)
            .to(0.3, { scale: Vec3.ONE, angle: 24 }, { easing: 'backOut' })
            .to(isBig ? 1.35 : 1.0, { scale: new Vec3(1.24, 1.24, 1), angle: 104 })
            .to(0.28, { scale: new Vec3(0.68, 0.68, 1), angle: 132 })
            .call(() => aura.destroy())
            .start();
        tween(auraOpacity)
            .to(0.1, { opacity: isBig ? 182 : 126 })
            .delay(isBig ? 1.35 : 1.0)
            .to(0.38, { opacity: 0 })
            .start();

        const ring = this.createCircleOutline(
            'PremiumWinRing',
            this.node,
            isBig ? 570 : 450,
            new Color(255, 235, 151, 230),
            0,
            55,
            isBig ? 8 : 6,
        );
        ring.setScale(0.18, 0.18, 1);
        const ringOpacity = ring.addComponent(UIOpacity);
        ringOpacity.opacity = 0;
        tween(ring)
            .to(0.22, { scale: new Vec3(1.08, 1.08, 1), angle: -28 }, { easing: 'backOut' })
            .to(0.48, { scale: new Vec3(1.42, 1.42, 1), angle: 28 }, { easing: 'quadOut' })
            .call(() => ring.destroy())
            .start();
        tween(ringOpacity).to(0.06, { opacity: 240 }).delay(0.25).to(0.38, { opacity: 0 }).start();

        const impactCount = isBig ? 5 : 3;
        for (let index = 0; index < impactCount; index += 1) {
            this.scheduleOnce(() => {
                const x = (index - (impactCount - 1) / 2) * 116;
                const star = this.createFxSprite(
                    `PremiumImpactStar_${index}`,
                    'magicStar',
                    this.node,
                    isBig ? 170 : 132,
                    isBig ? 170 : 132,
                    x,
                    78 + (index % 2) * 62,
                    index % 2 === 0 ? Color.WHITE : this.color(this.config.visual.accentSecondary),
                );
                if (!star) return;
                star.setScale(0.08, 0.08, 1);
                const opacity = star.addComponent(UIOpacity);
                tween(star)
                    .to(0.16, { scale: new Vec3(1.12, 1.12, 1), angle: 35 }, { easing: 'backOut' })
                    .to(0.28, { scale: new Vec3(0.12, 0.12, 1), angle: 95 })
                    .call(() => star.destroy())
                    .start();
                tween(opacity).delay(0.12).to(0.3, { opacity: 0 }).start();
            }, index * 0.065);
        }

        const waveCount = isBig ? 4 : 3;
        for (let wave = 0; wave < waveCount; wave += 1) {
            this.scheduleOnce(() => {
                this.createShockwave(
                    this.node,
                    0,
                    55,
                    (isBig ? 210 : 170) + wave * 54,
                    wave % 2 === 0 ? Color.WHITE : this.color(this.config.visual.accentSecondary),
                    isBig ? 3.4 : 2.7,
                );
                this.burstAt(0, 55, isBig ? 24 : 16, (isBig ? 190 : 145) + wave * 24);
            }, wave * 0.11);
        }
    }

    private highlightWinningPayline(isBig: boolean, winningCells: WinningCell[]): void {
        winningCells.forEach(({ reel, row }, index) => {
            this.scheduleOnce(() => {
                const symbol = this.cells[reel]?.[row];
                const cell = symbol?.node.parent;
                if (!symbol || !cell) return;
                this.pulse(symbol.node, isBig ? 1.22 : 1.15);
                const frame = this.createOutlinePanel(
                    `WinningCellFrame_${reel}_${row}`,
                    cell,
                    90,
                    76,
                    this.color(this.config.visual.accentSecondary),
                    0,
                    0,
                    12,
                    isBig ? 4 : 3,
                );
                frame.setScale(0.62, 0.62, 1);
                const frameOpacity = frame.addComponent(UIOpacity);
                frameOpacity.opacity = 0;
                tween(frame)
                    .to(0.17, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'backOut' })
                    .delay(isBig ? 0.92 : 0.64)
                    .to(0.24, { scale: new Vec3(0.9, 0.9, 1) })
                    .call(() => frame.destroy())
                    .start();
                tween(frameOpacity).to(0.06, { opacity: 255 }).delay(isBig ? 0.93 : 0.65).to(0.25, { opacity: 0 }).start();
                const sparkle = this.createSparkle(`PaylineSpark_${reel}_${row}`, cell, 24, 22, isBig ? 20 : 14);
                const sparkleOpacity = sparkle.addComponent(UIOpacity);
                tween(sparkle).to(0.22, { scale: new Vec3(1.4, 1.4, 1), angle: 55 }).to(0.26, { scale: new Vec3(0.2, 0.2, 1) }).call(() => sparkle.destroy()).start();
                tween(sparkleOpacity).delay(0.18).to(0.28, { opacity: 0 }).start();
            }, index * 0.055);
        });
    }

    private launchWinComets(isBig: boolean): void {
        const count = isBig ? 6 : 3;
        for (let index = 0; index < count; index += 1) {
            this.scheduleOnce(() => {
                const fromLeft = index % 2 === 0;
                const startX = fromLeft ? -390 : 390;
                const startY = -210 + (index % 3) * 220;
                const comet = this.createPanel(
                    `WinComet_${index}`,
                    this.node,
                    isBig ? 16 : 12,
                    isBig ? 250 : 190,
                    index % 3 === 0
                        ? new Color(255, 255, 255, 210)
                        : this.color(this.config.visual.accentSecondary, 205),
                    startX,
                    startY,
                    isBig ? 8 : 6,
                );
                this.createCirclePanel(
                    'WinCometCore',
                    comet,
                    isBig ? 30 : 24,
                    Color.WHITE,
                    0,
                    (isBig ? 250 : 190) * 0.42,
                );
                comet.angle = fromLeft ? -54 : 54;
                comet.setScale(0.45, 0.65, 1);
                const opacity = comet.addComponent(UIOpacity);
                opacity.opacity = 0;
                const targetX = fromLeft ? 90 : -90;
                const targetY = 35 + (index % 2) * 110;
                tween(comet)
                    .to(0.42, {
                        position: new Vec3(targetX, targetY, 0),
                        scale: new Vec3(1.05, 1.2, 1),
                    }, { easing: 'quadOut' })
                    .to(0.18, { scale: new Vec3(0.2, 0.35, 1) })
                    .call(() => comet.destroy())
                    .start();
                tween(opacity).to(0.08, { opacity: isBig ? 205 : 145 }).delay(0.23).to(0.29, { opacity: 0 }).start();
            }, index * (isBig ? 0.07 : 0.1));
        }
    }

    private showNearMissFocus(): void {
        const parent = this.cells[2]?.[1]?.node.parent;
        if (!parent) return;
        const ring = this.createCircleOutline(
            'NearMissRing',
            parent,
            160,
            this.color(this.config.visual.accentSecondary),
            0,
            0,
            5,
        );
        ring.setScale(0.35, 0.35, 1);
        const opacity = ring.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(ring)
            .to(0.2, { scale: new Vec3(1.12, 1.12, 1), angle: 30 }, { easing: 'backOut' })
            .to(0.18, { scale: new Vec3(0.88, 0.88, 1), angle: 54 })
            .to(0.22, { scale: new Vec3(1.32, 1.32, 1), angle: 86 })
            .call(() => ring.destroy())
            .start();
        tween(opacity).to(0.08, { opacity: 215 }).delay(0.28).to(0.24, { opacity: 0 }).start();
    }

    private showCelebrationBackdrop(isBig: boolean): void {
        const dimmer = this.createPanel('WinDimmer', this.node, this.designWidth, this.sceneHeight, new Color(18, 3, 15, 210), 0, 0, 0);
        const dimOpacity = dimmer.addComponent(UIOpacity);
        dimOpacity.opacity = 0;
        tween(dimOpacity)
            .to(0.18, { opacity: isBig ? 145 : 92 })
            .delay(isBig ? 1.45 : 1.12)
            .to(0.32, { opacity: 0 })
            .call(() => dimmer.destroy())
            .start();

        const flare = this.createCleanCelebrationAura(
            'WinCelebrationAura',
            this.node,
            isBig ? 720 : 590,
            0,
            60,
            this.color(this.config.visual.accentSecondary),
        );
        flare.setScale(0.25, 0.25, 1);
        const flareOpacity = flare.addComponent(UIOpacity);
        flareOpacity.opacity = 0;
        tween(flare)
            .to(0.3, { scale: new Vec3(1.05, 1.05, 1), angle: 22 }, { easing: 'backOut' })
            .to(isBig ? 1.25 : 0.95, { scale: new Vec3(1.24, 1.24, 1), angle: 72 })
            .to(0.28, { scale: new Vec3(0.6, 0.6, 1), angle: 96 })
            .call(() => flare.destroy())
            .start();
        tween(flareOpacity).to(0.12, { opacity: isBig ? 235 : 185 }).delay(isBig ? 1.35 : 1.02).to(0.31, { opacity: 0 }).start();

        [-1, 1].forEach((direction, index) => {
            const magic = this.createFxSprite(
                `WinMagic_${index}`,
                'magic',
                this.node,
                isBig ? 290 : 230,
                isBig ? 290 : 230,
                direction * 245,
                75 + index * 110,
                index === 0 ? this.color(this.config.visual.accentSecondary) : new Color(255, 104, 187),
            );
            if (!magic) return;
            magic.setScale(0.2, 0.2, 1);
            const opacity = magic.addComponent(UIOpacity);
            opacity.opacity = 0;
            tween(magic)
                .delay(index * 0.1)
                .to(0.28, { scale: Vec3.ONE, angle: direction * 35 }, { easing: 'backOut' })
                .to(isBig ? 1.18 : 0.88, { scale: new Vec3(1.3, 1.3, 1), angle: direction * 145 })
                .call(() => magic.destroy())
                .start();
            tween(opacity).delay(index * 0.1).to(0.12, { opacity: 190 }).delay(isBig ? 0.96 : 0.7).to(0.28, { opacity: 0 }).start();
        });

        const rays = new Node('CelebrationRays');
        this.node.addChild(rays);
        rays.setPosition(0, 60);
        rays.setScale(0.5, 0.5, 1);
        this.ensureTransform(rays, 650, 650);
        const rayOpacity = rays.addComponent(UIOpacity);
        rayOpacity.opacity = 0;
        const rayCount = isBig ? 20 : 14;
        for (let index = 0; index < rayCount; index += 1) {
            const angle = (360 / rayCount) * index;
            const radians = angle * Math.PI / 180;
            const ray = this.createPanel(
                `Ray_${index}`,
                rays,
                index % 2 === 0 ? 28 : 16,
                isBig ? 380 : 300,
                index % 2 === 0
                    ? this.color(this.config.visual.accentSecondary, 82)
                    : new Color(255, 255, 255, 45),
                Math.cos(radians) * 150,
                Math.sin(radians) * 150,
                12,
            );
            ray.angle = angle - 90;
        }
        tween(rays)
            .to(0.32, { scale: Vec3.ONE, angle: 18 }, { easing: 'backOut' })
            .to(isBig ? 1.45 : 1.1, { scale: new Vec3(1.18, 1.18, 1), angle: 72 })
            .to(0.25, { scale: new Vec3(0.75, 0.75, 1), angle: 90 })
            .call(() => rays.destroy())
            .start();
        tween(rayOpacity).to(0.18, { opacity: isBig ? 160 : 105 }).delay(isBig ? 1.4 : 1.05).to(0.3, { opacity: 0 }).start();
    }

    private coinRain(count: number): void {
        for (let index = 0; index < count; index += 1) {
            const size = 18 + Math.random() * 16;
            const startX = -345 + Math.random() * 690;
            const startY = 680 + Math.random() * 220;
            const coin = this.topCoinFrame
                ? this.createSpriteNode(`CoinRain_${index}`, this.node, size * 1.35, size * 1.35, startX, startY)
                : this.createCirclePanel(
                    `CoinRain_${index}`,
                    this.node,
                    size,
                    this.color(this.config.visual.accentSecondary),
                    startX,
                    startY,
                );
            const coinSprite = coin.getComponent(Sprite);
            if (coinSprite && this.topCoinFrame) coinSprite.spriteFrame = this.topCoinFrame;
            coin.setScale(0.28, 1, 1);
            this.createCirclePanel('CoinShine', coin, Math.max(4, size * 0.22), new Color(255, 255, 255, 185), -size * 0.16, size * 0.18);
            const opacity = coin.addComponent(UIOpacity);
            opacity.opacity = 0;
            const delay = index * 0.022 + Math.random() * 0.2;
            const duration = 1.05 + Math.random() * 0.7;
            tween(coin)
                .delay(delay)
                .to(duration, {
                    position: new Vec3(startX + (Math.random() - 0.5) * 150, -720, 0),
                    scale: new Vec3(1, 0.28, 1),
                    angle: 360 + Math.random() * 540,
                }, { easing: 'quadIn' })
                .call(() => coin.destroy())
                .start();
            tween(opacity).delay(delay).to(0.08, { opacity: 255 }).delay(duration * 0.72).to(duration * 0.22, { opacity: 0 }).start();
        }
    }

    private danceWinningSymbols(isBig: boolean, winningCells: WinningCell[]): void {
        winningCells.forEach(({ reel, row }, index) => {
            const symbol = this.cells[reel]?.[row]?.node;
            if (!symbol) return;
            Tween.stopAllByTarget(symbol);
            const scale = isBig ? 1.46 : 1.34;
            tween(symbol)
                .delay(index * 0.055)
                .to(0.13, { scale: new Vec3(scale, scale, 1), angle: index % 2 === 0 ? 8 : -8 }, { easing: 'backOut' })
                .to(0.1, { scale: new Vec3(0.94, 0.94, 1), angle: 0 })
                .to(0.13, { scale: new Vec3(scale * 0.92, scale * 0.92, 1), angle: index % 2 === 0 ? -7 : 7 })
                .to(0.22, { scale: Vec3.ONE, angle: 0 }, { easing: 'backOut' })
                .start();
            this.scheduleOnce(() => this.createShockwave(symbol.parent!, 0, 0, 74, this.color(this.config.visual.accentSecondary), 1.75), index * 0.055 + 0.04);
        });
    }

    private flyPayout(payout: number): void {
        const flying = this.createLabel(`+${payout}`, this.node, 40, this.color(this.config.visual.accentSecondary), 0, 90, 320, 70, true);
        this.styleArtLabel(flying, new Color(91, 14, 2, 240), 3, new Color(31, 2, 0, 180), 2, -3, 1);
        const opacity = flying.node.addComponent(UIOpacity);
        flying.node.setScale(0.4, 0.4, 1);
        tween(flying.node)
            .to(0.22, { scale: new Vec3(1.35, 1.35, 1), position: new Vec3(0, 180, 0) }, { easing: 'backOut' })
            .delay(0.28)
            .to(0.55, { scale: new Vec3(0.35, 0.35, 1), position: new Vec3(0, 422, 0) }, { easing: 'quadIn' })
            .call(() => flying.node.destroy())
            .start();
        tween(opacity).delay(0.58).to(0.47, { opacity: 0 }).start();
    }

    private streamCoinsToBalance(count: number, totalDurationMs: number): void {
        const targetX = -118;
        const targetY = 416;
        for (let index = 0; index < count; index += 1) {
            const size = 18 + Math.random() * 15;
            const startX = (Math.random() - 0.5) * 180;
            const startY = 20 + Math.random() * 150;
            const coin = this.topCoinFrame
                ? this.createSpriteNode(`BalanceCoin_${index}`, this.node, size * 1.3, size * 1.3, startX, startY)
                : this.createCirclePanel(
                    `BalanceCoin_${index}`,
                    this.node,
                    size,
                    this.color(this.config.visual.accentSecondary),
                    startX,
                    startY,
                );
            const sprite = coin.getComponent(Sprite);
            if (sprite && this.topCoinFrame) sprite.spriteFrame = this.topCoinFrame;
            coin.setScale(0.18, 0.18, 1);
            const opacity = coin.addComponent(UIOpacity);
            opacity.opacity = 0;

            const delay = index / Math.max(1, count - 1) * Math.max(0.35, totalDurationMs / 1000 - 0.78);
            const side = index % 2 === 0 ? -1 : 1;
            const controlX = side * (110 + Math.random() * 210);
            const controlY = 150 + Math.random() * 270;
            tween(coin)
                .delay(delay)
                .to(0.2, {
                    position: new Vec3(controlX, controlY, 0),
                    scale: new Vec3(1.08, 1.08, 1),
                    angle: side * (120 + Math.random() * 140),
                }, { easing: 'quadOut' })
                .to(0.54, {
                    position: new Vec3(targetX, targetY, 0),
                    scale: new Vec3(0.22, 0.22, 1),
                    angle: side * (420 + Math.random() * 280),
                }, { easing: 'quadIn' })
                .call(() => {
                    this.pulse(this.coinLabel.node, 1.035);
                    coin.destroy();
                })
                .start();
            tween(opacity)
                .delay(delay)
                .to(0.06, { opacity: 255 })
                .delay(0.48)
                .to(0.2, { opacity: 0 })
                .start();
        }
    }

    private burstWinParticles(count: number): void {
        const palette = [
            this.color(this.config.visual.accent),
            this.color(this.config.visual.accentSecondary),
            new Color(255, 255, 255),
            new Color(255, 94, 181),
            new Color(99, 232, 255),
        ];
        for (let index = 0; index < count; index += 1) {
            const size = 9 + Math.random() * 15;
            const startX = (Math.random() - 0.5) * 120;
            const startY = -10 + Math.random() * 80;
            const frameKey = index % 4 === 0 ? 'star' : index % 7 === 0 ? 'spark' : null;
            let particle: Node;
            if (frameKey && this.fxFrames.has(frameKey)) {
                particle = this.createFxSprite(
                    `WinImageParticle_${index}`,
                    frameKey,
                    this.node,
                    size * 3.4,
                    size * 3.4,
                    startX,
                    startY,
                    palette[index % palette.length],
                )!;
            } else {
                particle = new Node(`WinParticle_${index}`);
                this.node.addChild(particle);
                particle.setPosition(startX, startY);
                this.ensureTransform(particle, size, size);
                const graphics = particle.addComponent(Graphics);
                graphics.fillColor = palette[index % palette.length];
                if (index % 3 === 0) graphics.rect(-size / 2, -size / 2, size, size);
                else graphics.circle(0, 0, size / 2);
                graphics.fill();
            }
            particle.addComponent(UIOpacity).opacity = 255;

            const targetX = (Math.random() - 0.5) * 680;
            const targetY = 170 + Math.random() * 430;
            const duration = 0.65 + Math.random() * 0.55;
            tween(particle)
                .to(duration, {
                    position: new Vec3(targetX, targetY, 0),
                    scale: new Vec3(0.25, 0.25, 1),
                    angle: (Math.random() - 0.5) * 540,
                }, { easing: 'quadOut' })
                .call(() => particle.destroy())
                .start();
            tween(particle.getComponent(UIOpacity)!).delay(duration * 0.45).to(duration * 0.55, { opacity: 0 }).start();
        }
    }

    private imageFireworks(isBig: boolean): void {
        const burstCount = isBig ? 7 : 3;
        for (let burst = 0; burst < burstCount; burst += 1) {
            this.scheduleOnce(() => {
                const x = -285 + Math.random() * 570;
                const y = 5 + Math.random() * 520;
                const core = this.createSparkle(
                    `FireworkCore_${burst}`,
                    this.node,
                    x,
                    y,
                    isBig ? 92 : 70,
                );
                core.setScale(0.12, 0.12, 1);
                const coreOpacity = core.addComponent(UIOpacity);
                tween(core)
                    .to(0.18, { scale: new Vec3(1.15, 1.15, 1), angle: 35 }, { easing: 'backOut' })
                    .to(0.36, { scale: new Vec3(0.45, 0.45, 1), angle: 90 })
                    .call(() => core.destroy())
                    .start();
                tween(coreOpacity).delay(0.22).to(0.3, { opacity: 0 }).start();

                const starCount = isBig ? 12 : 8;
                for (let index = 0; index < starCount; index += 1) {
                    const angle = (Math.PI * 2 * index) / starCount + Math.random() * 0.2;
                    const distance = (isBig ? 96 : 72) + Math.random() * 76;
                    const star = this.createSparkle(
                        `FireworkStar_${burst}_${index}`,
                        this.node,
                        x,
                        y,
                        24 + Math.random() * 22,
                    );
                    star.setScale(0.25, 0.25, 1);
                    const opacity = star.addComponent(UIOpacity);
                    const duration = 0.42 + Math.random() * 0.28;
                    tween(star)
                        .to(duration, {
                            position: new Vec3(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0),
                            scale: new Vec3(0.82, 0.82, 1),
                            angle: 180 + Math.random() * 220,
                        }, { easing: 'quadOut' })
                        .call(() => star.destroy())
                        .start();
                    tween(opacity).delay(duration * 0.4).to(duration * 0.6, { opacity: 0 }).start();
                }
            }, burst * (isBig ? 0.14 : 0.18));
        }
    }

    private jackpotFinale(): void {
        const gold = this.color(this.config.visual.accentSecondary);
        const aura = this.createCleanCelebrationAura('JackpotFinaleAura', this.node, 920, 0, 55, gold);
        aura.setScale(0.12, 0.12, 1);
        const auraOpacity = aura.addComponent(UIOpacity);
        auraOpacity.opacity = 0;
        tween(aura)
            .to(0.32, { scale: new Vec3(1.08, 1.08, 1), angle: 34 }, { easing: 'backOut' })
            .to(2.15, { scale: new Vec3(1.38, 1.38, 1), angle: 210 })
            .to(0.38, { scale: new Vec3(0.72, 0.72, 1), angle: 250 })
            .call(() => aura.destroy())
            .start();
        tween(auraOpacity).to(0.12, { opacity: 225 }).delay(2.25).to(0.48, { opacity: 0 }).start();

        const verticalGlow = new Node('JackpotVerticalGlow');
        this.node.addChild(verticalGlow);
        verticalGlow.setPosition(0, 40);
        this.ensureTransform(verticalGlow, 720, 1180);
        this.createPanel('JackpotBeamWide', verticalGlow, 180, 1120, new Color(gold.r, gold.g, gold.b, 18), 0, 0, 90);
        this.createPanel('JackpotBeamCore', verticalGlow, 34, 1120, new Color(255, 255, 255, 38), 0, 0, 17);
        verticalGlow.setScale(0.35, 0.18, 1);
        const verticalGlowOpacity = verticalGlow.addComponent(UIOpacity);
        verticalGlowOpacity.opacity = 0;
        tween(verticalGlow)
            .to(0.26, { scale: new Vec3(1.12, 1.08, 1) }, { easing: 'backOut' })
            .delay(1.9)
            .to(0.34, { scale: new Vec3(0.5, 1.28, 1) })
            .call(() => verticalGlow.destroy())
            .start();
        tween(verticalGlowOpacity).to(0.08, { opacity: 205 }).delay(2.05).to(0.4, { opacity: 0 }).start();

        for (let wave = 0; wave < 3; wave += 1) {
            this.scheduleOnce(() => {
                this.flashScreen(true);
                this.shakeReelPanel(22 - wave * 3);
                this.createShockwave(this.node, 0, 55, 250 + wave * 90, wave % 2 === 0 ? Color.WHITE : gold, 3.1);
                this.burstAt(0, 55, 38 + wave * 8, 330 + wave * 45);
                this.launchWinComets(true);
                if (wave > 0) this.imageFireworks(true);
                if (wave === 1) this.coinRain(28);
                if (this.coinClip) this.audioSource.playOneShot(this.coinClip, 0.42);
            }, 0.18 + wave * 0.38);
        }
    }

    private showPremiumWinStage(payout: number, multiplier: number): void {
        const stageFrame = this.fxFrames.get('premiumStage');
        if (!stageFrame) {
            this.showLegacyPremiumWinStage(payout, multiplier);
            return;
        }
        const isBig = multiplier >= this.bigWinMultiplier;
        const isJackpot = multiplier >= this.jackpotMultiplier;
        const stage = new Node('PremiumWinStage');
        this.node.addChild(stage);
        stage.setPosition(0, 48);
        stage.setScale(0.18, 0.18, 1);
        this.ensureTransform(stage, 748, 548);
        const opacity = stage.addComponent(UIOpacity);
        opacity.opacity = 0;

        const aura = this.createCleanCelebrationAura(
            'PremiumStageAura',
            stage,
            isJackpot ? 720 : 630,
            0,
            18,
            this.color(this.config.visual.accentSecondary),
        );
        aura.addComponent(UIOpacity).opacity = isJackpot ? 92 : 58;
        tween(aura)
            .to(isJackpot ? 2.8 : 2.1, { angle: 120, scale: new Vec3(1.18, 1.18, 1) })
            .start();

        const art = this.createSpriteNode('PremiumStageArt', stage, 744, 496, 0, 0);
        art.getComponent(Sprite)!.spriteFrame = stageFrame;
        art.setScale(0.72, 0.72, 1);
        tween(art)
            .delay(0.05)
            .to(0.32, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'backOut' })
            .to(0.14, { scale: Vec3.ONE })
            .to(0.7, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'quadInOut' })
            .to(0.6, { scale: Vec3.ONE }, { easing: 'quadInOut' })
            .start();

        const winTitle = isJackpot
            ? this.copyText('jackpotTitle', 'ROYAL JACKPOT!')
            : isBig
                ? this.copyText('bigWinTitle', 'MEGA SWEET WIN!')
                : this.copyText('regularWinTitle', 'SWEET WIN!');
        const title = this.createLabel(
            winTitle,
            stage,
            isJackpot ? 54 : isBig ? 50 : 45,
            new Color(170, 12, 48),
            0,
            116,
            620,
            76,
            true,
        );
        // Keep the award copy crisp without the dark red/black halo that read
        // as a rectangular shadow when the whole stage scaled on mobile.
        title.enableOutline = true;
        title.outlineColor = new Color(255, 190, 45, 255);
        title.outlineWidth = 3;
        title.node.setScale(0.2, 0.2, 1);
        tween(title.node)
            .delay(0.18)
            .to(0.28, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' })
            .to(0.12, { scale: Vec3.ONE })
            .start();

        const payoutText = this.createLabel(
            `+${payout.toLocaleString('en-US')}`,
            stage,
            isJackpot ? 58 : 52,
            new Color(205, 45, 45),
            0,
            17,
            500,
            76,
            true,
        );
        payoutText.enableOutline = true;
        payoutText.outlineColor = new Color(255, 252, 220, 255);
        payoutText.outlineWidth = 3;
        payoutText.node.setScale(0.24, 0.24, 1);
        tween(payoutText.node)
            .delay(0.28)
            .to(0.3, { scale: new Vec3(1.16, 1.16, 1) }, { easing: 'backOut' })
            .to(0.14, { scale: Vec3.ONE })
            .start();

        const multiplierLabel = this.createLabel(
            `${multiplier.toFixed(multiplier >= 10 ? 0 : 1)}×  TOTAL BET`,
            stage,
            19,
            new Color(139, 14, 42),
            0,
            -58,
            420,
            36,
            true,
        );
        multiplierLabel.enableOutline = true;
        multiplierLabel.outlineColor = new Color(255, 196, 52, 255);
        multiplierLabel.outlineWidth = 2;

        for (let index = 0; index < (isJackpot ? 16 : 10); index += 1) {
            const angle = Math.PI * 2 * index / (isJackpot ? 16 : 10);
            const sparkle = this.createSparkle(
                `PremiumSparkle_${index}`,
                stage,
                Math.cos(angle) * (255 + index % 2 * 38),
                28 + Math.sin(angle) * (170 + index % 3 * 18),
                18 + index % 3 * 8,
            );
            sparkle.setScale(0.12, 0.12, 1);
            const sparkleOpacity = sparkle.addComponent(UIOpacity);
            sparkleOpacity.opacity = 0;
            tween(sparkle)
                .delay(0.12 + index * 0.045)
                .to(0.2, { scale: new Vec3(1.1, 1.1, 1), angle: 45 }, { easing: 'backOut' })
                .to(0.36, { scale: new Vec3(0.35, 0.35, 1), angle: 100 })
                .start();
            tween(sparkleOpacity)
                .delay(0.12 + index * 0.045)
                .to(0.1, { opacity: 255 })
                .to(0.46, { opacity: 0 })
                .start();
        }

        const hold = isJackpot ? 2.55 : isBig ? 1.9 : 1.45;
        tween(stage)
            .to(0.34, { scale: Vec3.ONE }, { easing: 'backOut' })
            .delay(hold)
            .to(0.26, { scale: new Vec3(0.78, 0.78, 1), position: new Vec3(0, 106, 0) }, { easing: 'quadIn' })
            .call(() => stage.destroy())
            .start();
        tween(opacity)
            .to(0.1, { opacity: 255 })
            .delay(hold + 0.28)
            .to(0.28, { opacity: 0 })
            .start();
    }

    private showLegacyPremiumWinStage(payout: number, multiplier: number): void {
        const isBig = multiplier >= this.bigWinMultiplier;
        const isJackpot = multiplier >= this.jackpotMultiplier;
        const stage = new Node('PremiumWinStage');
        this.node.addChild(stage);
        stage.setPosition(0, 48);
        stage.setScale(0.2, 0.2, 1);
        this.ensureTransform(stage, 700, 620);
        const stageOpacity = stage.addComponent(UIOpacity);
        stageOpacity.opacity = 0;
        const flare = this.createCleanCelebrationAura(
            'PrizeAura',
            stage,
            isJackpot ? 620 : 520,
            0,
            70,
            this.color(this.config.visual.accentSecondary),
        );
        flare.addComponent(UIOpacity).opacity = isJackpot ? 108 : 76;
        tween(flare).to(isJackpot ? 2.8 : 1.8, { angle: 75, scale: new Vec3(1.12, 1.12, 1) }).start();
        const coinFrame = this.fxFrames.get('coinPile');
        if (coinFrame) {
            const coinPile = this.createSpriteNode('PrizeCoinPile', stage, isJackpot ? 390 : 330, isJackpot ? 262 : 222, 0, 58);
            coinPile.getComponent(Sprite)!.spriteFrame = coinFrame;
            coinPile.setScale(0.15, 0.15, 1);
            tween(coinPile)
                .delay(0.08)
                .to(0.34, { scale: new Vec3(1.16, 1.16, 1), position: new Vec3(0, 76, 0) }, { easing: 'backOut' })
                .to(0.18, { scale: Vec3.ONE, position: new Vec3(0, 58, 0) })
                .to(0.62, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'quadInOut' })
                .to(0.5, { scale: Vec3.ONE }, { easing: 'quadInOut' })
                .start();
        }
        const winTitle = isJackpot ? this.copyText('jackpotTitle', 'JACKPOT!') : isBig ? this.copyText('bigWinTitle', 'MEGA WIN!') : this.copyText('regularWinTitle', 'BIG WIN!');
        this.createLabel(winTitle, stage, isJackpot ? 58 : 52, new Color(70, 25, 0, 210), 3, 231, 660, 84, true);
        const title = this.createLabel(winTitle, stage, isJackpot ? 58 : 52, this.color(this.config.visual.accentSecondary), 0, 236, 660, 84, true);
        this.styleArtLabel(title, new Color(82, 14, 2, 245), 4, new Color(28, 2, 0, 190), 3, -4, 2);
        title.node.setScale(0.3, 0.3, 1);
        tween(title.node).delay(0.16).to(0.3, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' }).to(0.12, { scale: Vec3.ONE }).start();
        const payoutText = this.createLabel(`+${payout}`, stage, isJackpot ? 54 : 48, Color.WHITE, 0, -108, 560, 76, true);
        this.styleArtLabel(payoutText, new Color(97, 16, 2, 245), 4, new Color(28, 2, 0, 185), 3, -4, 2);
        payoutText.node.setScale(0.25, 0.25, 1);
        tween(payoutText.node).delay(0.28).to(0.3, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'backOut' }).to(0.14, { scale: Vec3.ONE }).start();
        this.createLabel(`${multiplier}x PAYOUT`, stage, 19, this.color(this.config.visual.accentSecondary), 0, -158, 420, 38, true);
        for (let index = 0; index < (isJackpot ? 14 : 9); index += 1) {
            const angle = Math.PI * 2 * index / (isJackpot ? 14 : 9);
            const sparkle = this.createSparkle(`PrizeSparkle_${index}`, stage, Math.cos(angle) * (245 + index % 3 * 22), 52 + Math.sin(angle) * (190 + index % 2 * 28), 20 + index % 3 * 8);
            sparkle.setScale(0.2, 0.2, 1);
            tween(sparkle).delay(index * 0.045).to(0.22, { scale: Vec3.ONE, angle: 45 }, { easing: 'backOut' }).start();
        }
        const hold = isJackpot ? 2.45 : isBig ? 1.65 : 1.25;
        tween(stage).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).delay(hold).to(0.25, { scale: new Vec3(0.82, 0.82, 1), position: new Vec3(0, 96, 0) }).call(() => stage.destroy()).start();
        tween(stageOpacity).to(0.12, { opacity: 255 }).delay(hold + 0.24).to(0.26, { opacity: 0 }).start();
    }

    private showWinBanner(payout: number, multiplier: number): void {
        const isBig = multiplier >= this.bigWinMultiplier;
        const isJackpot = multiplier >= this.jackpotMultiplier;
        const banner = this.createPanel('WinBannerRim', this.node, 654, 286, this.color(this.config.visual.accentSecondary), 0, 62, 54);
        const face = this.createPanel('WinBannerFace', banner, 626, 258, this.color(this.config.visual.panel, 248), 0, 0, 45);
        const frameArt = this.createFxSprite(
            'WinBannerFrameArt',
            'frame',
            banner,
            664,
            296,
            0,
            0,
            this.color(this.config.visual.accentSecondary),
        );
        if (frameArt) frameArt.addComponent(UIOpacity).opacity = 178;
        this.createPanel('WinBannerGloss', face, 530, 24, new Color(255, 255, 255, 52), 0, 98, 10);
        const awardHalo = this.createFxSprite(
            'WinAwardHalo', 'commonHalo', face,
            isJackpot ? 230 : 190, isJackpot ? 230 : 190,
            0, 116, this.color(this.config.visual.accentSecondary),
        );
        if (awardHalo) {
            awardHalo.setScale(0.2, 0.2, 1);
            awardHalo.addComponent(UIOpacity).opacity = isJackpot ? 235 : 188;
            tween(awardHalo)
                .to(0.28, { scale: new Vec3(1.18, 1.18, 1), angle: 35 }, { easing: 'backOut' })
                .to(isJackpot ? 2.45 : 1.25, { scale: new Vec3(1.34, 1.34, 1), angle: 175 })
                .start();
        }
        for (let dot = -2; dot <= 2; dot += 1) {
            this.createCirclePanel(`BannerLight_${dot}`, face, dot === 0 ? 15 : 10, dot % 2 === 0 ? Color.WHITE : this.color(this.config.visual.accent), dot * 84, 108);
        }
        banner.setScale(0.24, 0.24, 1);
        const opacity = banner.addComponent(UIOpacity);
        opacity.opacity = 0;
        const award = this.createFxSprite(
            'WinAwardImage',
            isBig ? 'trophy' : 'medal',
            face,
            isJackpot ? 158 : isBig ? 136 : 112,
            isJackpot ? 158 : isBig ? 136 : 112,
            0,
            118,
            this.color(this.config.visual.accentSecondary),
        );
        if (award) {
            award.setScale(0.2, 0.2, 1);
            tween(award)
                .delay(0.1)
                .to(0.25, { scale: new Vec3(1.28, 1.28, 1), angle: -8 }, { easing: 'backOut' })
                .to(0.18, { scale: Vec3.ONE, angle: 0 })
                .to(0.55, { scale: new Vec3(1.08, 1.08, 1), angle: 5 }, { easing: 'quadInOut' })
                .to(0.45, { scale: Vec3.ONE, angle: 0 }, { easing: 'quadInOut' })
                .start();
        }
        [-238, 238].forEach((x, index) => {
            const star = this.createFxSprite(
                `WinBannerStar_${index}`,
                'star',
                face,
                112,
                112,
                x,
                42,
                index === 0 ? this.color(this.config.visual.accentSecondary) : Color.WHITE,
            );
            if (!star) return;
            tween(star)
                .to(0.32, { scale: new Vec3(1.24, 1.24, 1), angle: index === 0 ? 45 : -45 })
                .to(0.32, { scale: new Vec3(0.86, 0.86, 1), angle: index === 0 ? 90 : -90 })
                .start();
        });
        const winTitle = isJackpot
            ? this.copyText('jackpotTitle', 'JACKPOT!')
            : isBig
                ? this.copyText('bigWinTitle', 'MEGA WIN!')
                : this.copyText('regularWinTitle', 'BIG WIN!');
        const title = this.createLabel(winTitle, face, isJackpot ? 48 : 46, this.color(this.config.visual.accentSecondary), 0, 30, 590, 74, true);
        this.styleArtLabel(title, new Color(82, 14, 2, 245), 4, new Color(28, 2, 0, 185), 3, -4, 2);
        if (isJackpot) {
            tween(title.node)
                .delay(0.34)
                .to(0.14, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'backOut' })
                .to(0.12, { scale: Vec3.ONE })
                .delay(0.22)
                .to(0.14, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' })
                .to(0.14, { scale: Vec3.ONE })
                .start();
        }
        const payoutLabel = this.createLabel(`+${payout}   •   ${multiplier}x`, face, isJackpot ? 38 : 35, Color.WHITE, 0, -54, 550, 62, true);
        this.styleArtLabel(payoutLabel, new Color(95, 16, 3, 240), 3, new Color(30, 2, 0, 175), 2, -3, 1);
        tween(payoutLabel.node)
            .delay(0.16)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
            .to(0.14, { scale: Vec3.ONE })
            .start();
        if (isJackpot) {
            [-168, 168].forEach((x, index) => {
                const jackpotStar = this.createFxSprite(
                    `JackpotStar_${index}`,
                    'magicStar',
                    face,
                    92,
                    92,
                    x,
                    30,
                    index === 0 ? Color.WHITE : this.color(this.config.visual.accentSecondary),
                );
                if (!jackpotStar) return;
                jackpotStar.setScale(0.18, 0.18, 1);
                tween(jackpotStar)
                    .delay(index * 0.08)
                    .to(0.2, { scale: Vec3.ONE, angle: index === 0 ? 32 : -32 }, { easing: 'backOut' })
                    .to(0.45, { scale: new Vec3(0.7, 0.7, 1), angle: index === 0 ? 88 : -88 })
                    .start();
            });
        }
        tween(banner)
            .to(0.24, { scale: new Vec3(1.15, 1.15, 1), angle: -2 }, { easing: 'backOut' })
            .to(0.1, { scale: new Vec3(0.96, 0.96, 1), angle: 1 })
            .to(0.12, { scale: new Vec3(1.04, 1.04, 1), angle: 0 }, { easing: 'backOut' })
            .delay(isJackpot ? 2.35 : isBig ? 1.05 : 0.82)
            .to(0.22, { scale: new Vec3(0.7, 0.7, 1), angle: 4 })
            .call(() => banner.destroy())
            .start();
        tween(opacity).to(0.1, { opacity: 255 }).delay(isJackpot ? 2.65 : isBig ? 1.35 : 1.1).to(0.27, { opacity: 0 }).start();
        this.createShockwave(this.node, 0, 55, 260, this.color(this.config.visual.accentSecondary), 2.7);
    }

    private async countCoins(from: number, to: number, durationMs = 1400): Promise<void> {
        const startedAt = Date.now();
        while (Date.now() - startedAt < durationMs) {
            const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
            this.coinLabel.string = Math.round(from + (to - from) * progress).toLocaleString('en-US');
            await this.delay(16);
        }
        this.coinLabel.string = to.toLocaleString('en-US');
        this.pulse(this.coinLabel.node, 1.12);
    }

    private color(hex: string, alpha = 255): Color {
        const normalized = hex.replace('#', '');
        const expanded = normalized.length === 3
            ? normalized.split('').map((character) => character + character).join('')
            : normalized;
        const value = Number.parseInt(expanded, 16);
        if (!Number.isFinite(value)) return new Color(255, 255, 255, alpha);
        return new Color((value >> 16) & 255, (value >> 8) & 255, value & 255, alpha);
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }
}
