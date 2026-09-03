import {
    _decorator,
    Button,
    Color,
    Component,
    EditBox,
    Font,
    Graphics,
    Label,
    Node,
    ResolutionPolicy,
    resources,
    screen,
    Sprite,
    SpriteFrame,
    sys,
    Texture2D,
    tween,
    Tween,
    UITransform,
    UIOpacity,
    Vec3,
    view,
} from 'cc';

const { ccclass } = _decorator;

type LobbyPage = 'home' | 'store' | 'rank' | 'rewards' | 'account';
type GameCategory = 'all' | 'wheel' | 'megaways' | 'tumble' | 'cash';
type RankPeriod = 'daily' | 'weekly' | 'all';

interface LobbyAccount {
    username: string;
    password: string;
    coins: number;
    avatar: number;
    createdAt: number;
}

interface RankEntry {
    name: string;
    coins: number;
    avatar: number;
    current?: boolean;
}

@ccclass('SlotGame')
export class SlotGame extends Component {
    private readonly designWidth = 750;
    private readonly designHeight = 1334;
    private readonly accountsKey = 'l02-royal-wealth-accounts-v1';
    private readonly sessionKey = 'l02-royal-wealth-session-v1';
    private readonly rewardKey = 'l02-royal-wealth-daily-reward-v1';
    private viewportWidth = 750;
    private viewportHeight = 1334;

    private frames = new Map<string, SpriteFrame>();
    private uiFont: Font | null = null;
    private uiFontBold: Font | null = null;
    private uiDisplayFont: Font | null = null;
    private currentUser: LobbyAccount | null = null;
    private pageRoot!: Node;
    private navigationRoot: Node | null = null;
    private navigationSelector: Node | null = null;
    private navigationButtons = new Map<LobbyPage, Node>();
    private navigationIcons = new Map<LobbyPage, Sprite>();
    private navigationLabels = new Map<LobbyPage, Label>();
    private entranceNodes = new WeakSet<Node>();
    private currentPage: LobbyPage = 'home';
    private isTransitioning = false;
    private isAuthTransitioning = false;
    private registerAvatar = 0;
    private selectedCategory: GameCategory = 'all';
    private selectedRankPeriod: RankPeriod = 'daily';
    private soundEnabled = true;
    private notificationsEnabled = true;

    protected async start(): Promise<void> {
        const frame = screen.windowSize;
        const screenRatio = frame.width / Math.max(1, frame.height);
        const designRatio = this.designWidth / this.designHeight;
        const policy = screenRatio >= designRatio ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH;
        view.setDesignResolutionSize(this.designWidth, this.designHeight, policy);
        const visible = view.getVisibleSize();
        this.viewportWidth = visible.width;
        this.viewportHeight = visible.height;
        this.ensureTransform(this.node, visible.width, visible.height);
        await this.loadArtwork();
        this.currentUser = this.restoreSession();
        const authPreview = this.authPreviewFromUrl();
        if (authPreview !== null) this.buildAuth(authPreview);
        else if (this.currentUser) this.buildApp(this.initialPageFromUrl());
        else this.buildAuth(false);
        this.signalReady();
    }

    private signalReady(): void {
        if (typeof window === 'undefined') return;
        const readyWindow = window as typeof window & { __ROYAL_WEALTH_LOBBY_READY__?: boolean };
        readyWindow.__ROYAL_WEALTH_LOBBY_READY__ = true;
        window.dispatchEvent(new Event('royal-wealth-lobby-ready'));
    }

    private authPreviewFromUrl(): boolean | null {
        if (typeof window === 'undefined') return null;
        const requested = new URLSearchParams(window.location.search).get('auth');
        if (requested === 'login') return false;
        if (requested === 'register') return true;
        return null;
    }

    private initialPageFromUrl(): LobbyPage {
        if (typeof window === 'undefined') return 'home';
        const requested = new URLSearchParams(window.location.search).get('page');
        return (['home', 'store', 'rank', 'rewards', 'account'] as string[]).includes(requested ?? '')
            ? requested as LobbyPage
            : 'home';
    }

    private async loadArtwork(): Promise<void> {
        const entries: Array<[string, string]> = [
            ['casino-hall-background', 'lobby/v3/lobby-background-v3/spriteFrame'],
            ['auth-casino-background', 'lobby/v6/auth-background-v6/spriteFrame'],
            ['hero-banner-v7', 'lobby/v5/lobby-banner-v5/spriteFrame'],
            ['page-store-background', 'lobby/v6/store-background-v6/spriteFrame'],
            ['page-rank-background', 'lobby/v6/rank-background-v6/spriteFrame'],
            ['page-rewards-background', 'lobby/v6/rewards-background-v6/spriteFrame'],
            ['page-account-background', 'lobby/v6/account-background-v6/spriteFrame'],
            ['nav-background', 'lobby/navigation/tabbar-bg/spriteFrame'],
            ['nav-floor-v8', 'lobby/navigation/v8/casino-floor-emblem-v8/spriteFrame'],
            ['nav-cashier-v8', 'lobby/navigation/v8/cashier-emblem-v8/spriteFrame'],
            ['nav-rank-v9', 'lobby/navigation/v8/ranking-emblem-v9/spriteFrame'],
            ['nav-rewards-v9', 'lobby/navigation/v8/rewards-emblem-v9/spriteFrame'],
            ['nav-account-v8', 'lobby/navigation/v8/account-emblem-v8/spriteFrame'],
            ['login-input-box', 'lobby/login/input-box/spriteFrame'],
            ['game-s07', 'lobby/lineup/s07-royal-fortune-wheel/spriteFrame'],
            ['game-s08', 'lobby/lineup/s08-royal-diamond-megaways/spriteFrame'],
            ['game-s09', 'lobby/lineup/s09-aurum-forge/spriteFrame'],
            ['game-s10', 'lobby/lineup/s10-sovereign-treasury/spriteFrame'],
            ['card-s07', 'lobby/lineup/cards/s07-floor-card/spriteFrame'],
            ['card-s08', 'lobby/lineup/cards/s08-floor-card/spriteFrame'],
            ['card-s09', 'lobby/lineup/cards/s09-floor-card/spriteFrame'],
            ['card-s10', 'lobby/lineup/cards/s10-floor-card/spriteFrame'],
            ['feature-s07', 'lobby/lineup/s07-wheel-feature/spriteFrame'],
            ['feature-s08', 'lobby/lineup/s08-diamond-chest/spriteFrame'],
            ['feature-s09', 'lobby/lineup/s09-liquid-coin/spriteFrame'],
            ['treasure-chest-emblem', 'lobby/v7/treasure-chest-emblem-soft-v7/spriteFrame'],
            ['coin-emblem', 'lobby/v7/coin-emblem-soft-v7/spriteFrame'],
            ['button-primary-soft', 'lobby/v4/button-primary-soft/spriteFrame'],
            ['button-accent-soft', 'lobby/v4/button-accent-soft/spriteFrame'],
            ['button-gold-fortune', 'lobby/v7/button-gold-fortune-v7/spriteFrame'],
            ['button-ruby-fortune', 'lobby/v7/button-ruby-fortune-v7/spriteFrame'],
            ['card-fortune-portrait', 'lobby/v7/card-fortune-portrait-v7/spriteFrame'],
            ['rank-podium-fortune', 'lobby/v7/rank-podium-fortune-v7/spriteFrame'],
            ['panel-fortune-wide', 'lobby/v7/panel-fortune-wide-v7/spriteFrame'],
            ['panel-fortune-row', 'lobby/v7/panel-fortune-row-v7/spriteFrame'],
            ['panel-fortune-square', 'lobby/v7/panel-fortune-square-v7/spriteFrame'],
            ['nav-selector-soft', 'lobby/v4/nav-selector-soft/spriteFrame'],
            ['login-user', 'lobby/login/user-icon/spriteFrame'],
            ['login-password', 'lobby/login/password-icon/spriteFrame'],
            ['login-guest', 'lobby/login/guest-icon/spriteFrame'],
            ['account-inbox', 'lobby/account/details/inbox/spriteFrame'],
            ...Array.from({ length: 8 }, (_, index): [string, string] => [
                `account-info-${index + 1}`,
                `lobby/account/details/info-${index + 1}/spriteFrame`,
            ]),
            ...Array.from({ length: 6 }, (_, index): [string, string] => [
                `store-coin-${index + 1}`,
                `lobby/store/coin-${index + 1}/spriteFrame`,
            ]),
            ...(['home', 'store', 'rank', 'rewards', 'account'] as LobbyPage[]).flatMap((page): Array<[string, string]> => [
                [`nav-${page}-normal`, `lobby/navigation/${page}-normal/spriteFrame`],
                [`nav-${page}-selected`, `lobby/navigation/${page}-selected/spriteFrame`],
            ]),
            ['avatar-default', 'lobby/avatars/default/spriteFrame'],
            ...Array.from({ length: 6 }, (_, index): [string, string] => [
                `avatar-${index + 1}`,
                `lobby/avatars/head-${index + 1}/spriteFrame`,
            ]),
        ];
        await Promise.all(entries.map(async ([key, path]) => {
            const frame = await this.loadResource(path, SpriteFrame);
            if (frame) this.frames.set(key, frame);
        }));
        const textureEntries: Array<[string, string]> = [
            ['banner', 'lobby/sovereign-treasury/fx/win-stage-v1/texture'],
            ['wealth-chest', 'lobby/sovereign-treasury/symbols/collector-chest/texture'],
            ['wealth-coin', 'lobby/sovereign-treasury/symbols/sovereign-coin/texture'],
            ['wealth-ruby', 'lobby/sovereign-treasury/symbols/ruby-signet/texture'],
            ['wealth-emerald', 'lobby/sovereign-treasury/symbols/emerald-lockbox/texture'],
            ['wealth-key', 'lobby/sovereign-treasury/symbols/diamond-key/texture'],
        ];
        await Promise.all(textureEntries.map(async ([key, path]) => {
            const texture = await this.loadResource(path, Texture2D);
            if (!texture) return;
            const frame = new SpriteFrame();
            frame.texture = texture;
            this.frames.set(key, frame);
        }));
        [this.uiFont, this.uiFontBold, this.uiDisplayFont] = await Promise.all([
            this.loadResource('lobby/fonts/Nunito-SemiBold', Font),
            this.loadResource('lobby/fonts/Nunito-ExtraBold', Font),
            this.loadResource('lobby/fonts/Cinzel-Bold', Font),
        ]);
    }

    private loadResource<T>(path: string, type: new (...args: never[]) => T): Promise<T | null> {
        return new Promise((resolve) => {
            resources.load(path, type as never, (error: Error | null, asset: T) => {
                if (error || !asset) {
                    console.warn(`Unable to load lobby asset: ${path}`, error);
                    resolve(null);
                    return;
                }
                resolve(asset);
            });
        });
    }

    private clearCanvas(): void {
        this.navigationRoot = null;
        this.navigationSelector = null;
        this.navigationButtons.clear();
        this.navigationIcons.clear();
        this.navigationLabels.clear();
        this.isTransitioning = false;
        this.isAuthTransitioning = false;
        for (const child of [...this.node.children]) {
            if (child.name === 'Camera') continue;
            Tween.stopAllByTarget(child);
            child.destroy();
        }
    }

    private createCasinoHallScene(parent: Node, authMode: boolean): void {
        const [width, height] = this.coverViewportSize(1024 / 1536);
        const hallFrame = this.frames.get(authMode ? 'auth-casino-background' : 'casino-hall-background');
        const hall = this.createSpriteNode('RoyalCasinoHall', parent, width, height, 0, 0, hallFrame);
        hall.setScale(1.04, 1.04, 1);
        // Slow parallax keeps the lobby alive without pulling focus from the UI.
        tween(hall)
            .repeatForever(
                tween()
                    .to(8.5, { position: new Vec3(-5, 7, 0), scale: new Vec3(1.055, 1.055, 1) }, { easing: 'sineInOut' })
                    .to(8.5, { position: new Vec3(5, -5, 0), scale: new Vec3(1.04, 1.04, 1) }, { easing: 'sineInOut' }),
            )
            .start();
        this.createPanel(
            'CasinoAtmosphereWash',
            parent,
            this.viewportWidth,
            this.viewportHeight,
            authMode ? new Color(42, 11, 24, 104) : new Color(18, 23, 24, 76),
            0,
            0,
            0,
        );
        this.createFloatingWealthDecor(parent, authMode ? 9 : 11);
        this.createAmbientGoldDust(parent, 12);
    }

    private createFloatingWealthDecor(parent: Node, count: number): void {
        const placements = [
            [-326, 446, 52], [318, 408, 44], [-336, 276, 34], [330, 212, 46],
            [-322, 42, 42], [326, -30, 34], [-330, -222, 48], [324, -282, 40],
            [-288, -468, 34], [286, -446, 48], [-250, 530, 34], [252, 506, 38],
        ];
        const artworkKeys = ['wealth-coin', 'wealth-ruby', 'wealth-emerald', 'wealth-key'];
        for (let index = 0; index < Math.min(count, placements.length); index += 1) {
            const [x, y, size] = placements[index];
            const key = artworkKeys[index % artworkKeys.length];
            const ornament = this.createSpriteNode(`FloatingWealth_${index}`, parent, size, size, x, y, this.frames.get(key));
            const opacity = ornament.addComponent(UIOpacity);
            const baseOpacity = 74 + (index % 4) * 18;
            opacity.opacity = baseOpacity;
            ornament.angle = index % 2 === 0 ? -7 : 8;
            const driftX = index % 2 === 0 ? 9 : -9;
            const driftY = 15 + (index % 3) * 6;
            const duration = 5.6 + (index % 5) * 0.8;
            tween(ornament)
                .delay(index * 0.13)
                .repeatForever(
                    tween()
                        .to(duration, { position: new Vec3(x + driftX, y + driftY, 0), angle: -ornament.angle }, { easing: 'sineInOut' })
                        .to(duration, { position: new Vec3(x, y, 0), angle: ornament.angle }, { easing: 'sineInOut' }),
                )
                .start();
            tween(opacity)
                .delay(index * 0.1)
                .repeatForever(
                    tween()
                        .to(duration * 0.72, { opacity: Math.min(172, baseOpacity + 34) }, { easing: 'sineInOut' })
                        .to(duration * 0.72, { opacity: baseOpacity }, { easing: 'sineInOut' }),
                )
                .start();
        }
    }

    private buildBackground(): void {
        this.createCasinoHallScene(this.node, false);
    }

    private buildApp(page: LobbyPage): void {
        if (!this.currentUser) {
            this.buildAuth(false);
            return;
        }
        this.clearCanvas();
        this.currentPage = page;
        this.buildBackground();
        this.buildHeader();
        this.createPage(page, true);
        this.buildNavigation(page);
    }

    private createPage(page: LobbyPage, animateEntrance: boolean): void {
        this.pageRoot = new Node('PageRoot');
        this.node.addChild(this.pageRoot);
        this.ensureTransform(this.pageRoot, 750, 1040);
        this.pageRoot.setPosition(animateEntrance ? 42 : 0, -28);
        const opacity = this.pageRoot.addComponent(UIOpacity);
        opacity.opacity = animateEntrance ? 0 : 255;

        if (page !== 'home') {
            const backgroundKey: Record<Exclude<LobbyPage, 'home'>, string> = {
                store: 'page-store-background',
                rank: 'page-rank-background',
                rewards: 'page-rewards-background',
                account: 'page-account-background',
            };
            const pageArtwork = this.createSpriteNode('RoyalPageArtwork', this.pageRoot, 686, 1029, 0, 0, this.frames.get(backgroundKey[page]));
            const pageArtworkOpacity = pageArtwork.addComponent(UIOpacity);
            pageArtworkOpacity.opacity = 236;
            this.createPanel('PageLegibilityWash', this.pageRoot, 686, 1029, new Color(39, 7, 18, 82), 0, 0, 28);
            this.createPanel('BurgundyCrownBand', this.pageRoot, 664, 88, new Color(91, 17, 33, 222), 0, 465, 25);
            this.createOutlinePanel('PageSurfaceGoldEdge', this.pageRoot, 690, 1032, new Color(255, 226, 135, 220), 0, 0, 34, 3);
            this.createOutlinePanel('PageSurfaceInnerEdge', this.pageRoot, 674, 1014, new Color(255, 248, 217, 70), 0, 0, 28, 1);
            const pageCoin = this.createSpriteNode('PageCoinSeal', this.pageRoot, 66, 66, -292, 465, this.frames.get('coin-emblem'));
            const pageRuby = this.createSpriteNode('PageRubySeal', this.pageRoot, 58, 58, 292, 465, this.frames.get('wealth-ruby'));
            this.animateSoftImage(pageCoin, 0.1);
            this.animateSoftImage(pageRuby, 0.3);
        }

        if (page === 'home') this.buildHomePage();
        else if (page === 'store') this.buildStorePage();
        else if (page === 'rank') this.buildRankPage();
        else if (page === 'rewards') this.buildRewardsPage();
        else this.buildAccountPage();

        if (this.navigationRoot?.isValid) this.navigationRoot.setSiblingIndex(this.node.children.length - 1);

        if (animateEntrance) {
            tween(this.pageRoot)
                .to(0.32, { position: new Vec3(0, -28, 0) }, { easing: 'quartOut' })
                .start();
            tween(opacity).to(0.22, { opacity: 255 }, { easing: 'quadOut' }).start();
        }
    }

    private transitionTo(page: LobbyPage): void {
        if (this.isTransitioning || page === this.currentPage || !this.pageRoot?.isValid) return;
        this.isTransitioning = true;
        const oldRoot = this.pageRoot;
        const oldOpacity = oldRoot.getComponent(UIOpacity) ?? oldRoot.addComponent(UIOpacity);
        const direction = this.pageIndex(page) > this.pageIndex(this.currentPage) ? -1 : 1;
        this.currentPage = page;
        this.updateNavigation(page);
        tween(oldRoot)
            .to(0.18, { position: new Vec3(direction * 34, -28, 0), scale: new Vec3(0.992, 0.992, 1) }, { easing: 'quadIn' })
            .call(() => {
                if (oldRoot.isValid) oldRoot.destroy();
                this.createPage(page, false);
                const newRoot = this.pageRoot;
                const newOpacity = newRoot.getComponent(UIOpacity)!;
                newRoot.setPosition(-direction * 44, -28);
                newRoot.setScale(0.992, 0.992, 1);
                newOpacity.opacity = 0;
                tween(newRoot)
                    .to(0.32, { position: new Vec3(0, -28, 0), scale: Vec3.ONE }, { easing: 'quartOut' })
                    .call(() => { this.isTransitioning = false; })
                    .start();
                tween(newOpacity).to(0.22, { opacity: 255 }, { easing: 'quadOut' }).start();
            })
            .start();
        tween(oldOpacity).to(0.14, { opacity: 0 }, { easing: 'quadIn' }).start();
    }

    private pageIndex(page: LobbyPage): number {
        return ['home', 'store', 'rank', 'rewards', 'account'].indexOf(page);
    }

    private navigationX(page: LobbyPage): number {
        return -300 + this.pageIndex(page) * 150;
    }

    private buildHeader(): void {
        const user = this.currentUser!;
        const headerWidth = Math.max(this.designWidth, this.viewportWidth);
        this.createPanel('HeaderShadow', this.node, headerWidth, 122, new Color(24, 8, 10, 94), 0, 556, 0);
        const header = this.createPanel('Header', this.node, headerWidth, 114, new Color(6, 54, 42, 245), 0, 568, 0);
        this.createPanel('HeaderBurgundyBand', header, headerWidth, 36, new Color(104, 25, 37, 218), 0, 37, 0);
        this.createPanel('HeaderTopLine', header, headerWidth, 3, new Color(255, 232, 151, 190), 0, 55, 0);
        this.createPanel('HeaderBottomLine', header, headerWidth, 4, new Color(255, 199, 64, 220), 0, -55, 0);

        const avatarButton = this.createCirclePanel('HeaderAvatarRim', header, 78, new Color(246, 211, 111, 255), -302, 0);
        this.createCirclePanel('HeaderAvatarInset', avatarButton, 70, new Color(93, 24, 35, 255), 0, 0);
        this.createSpriteNode('HeaderAvatar', avatarButton, 64, 64, 0, 0, this.avatarFrame(user.avatar));
        avatarButton.addComponent(Button);
        avatarButton.on(Button.EventType.CLICK, () => this.transitionTo('account'), this);
        this.bindPressMotion(avatarButton);

        this.createLabel(user.username.toUpperCase(), header, 19, new Color(255, 247, 220), -190, 12, 184, 32, true);
        this.createLabel('SOVEREIGN VIP', header, 10, new Color(155, 255, 211, 235), -190, -18, 184, 22, true);

        const crest = this.createSpriteNode('RoyalWealthCrest', header, 54, 54, 8, 0, this.frames.get('wealth-coin'));
        this.animateSoftImage(crest, 0.2);

        const coinPill = this.createPanel('CoinBar', header, 258, 60, new Color(38, 15, 24, 244), 222, 0, 22);
        this.createOutlinePanel('CoinBarOutline', coinPill, 256, 58, new Color(246, 211, 111, 170), 0, 0, 22, 2);
        const headerCoin = this.createSpriteNode('HeaderCoin', coinPill, 44, 44, -101, 0, this.frames.get('wealth-coin'));
        this.animateSoftImage(headerCoin, 0.35);
        this.createLabel(user.coins.toLocaleString('en-US'), coinPill, 22, new Color(255, 246, 205), -8, 0, 126, 40, true);
        this.createTextButton('+', coinPill, 101, 0, 42, 42, () => this.transitionTo('store'), new Color(196, 137, 43), 20);
    }

    private buildHomePage(): void {
        // Treat the jackpot art as an inset lobby display: the layered mount, rails
        // and side medallions keep the artwork from reading as a pasted rectangle.
        const mount = this.createPanel('RoyalJackpotMount', this.pageRoot, 710, 244, new Color(91, 47, 27, 252), 0, 404, 34);
        this.createOutlinePanel('RoyalJackpotMountEdge', mount, 708, 242, new Color(255, 218, 104, 242), 0, 0, 34, 4);
        this.createOutlinePanel('RoyalJackpotMountHighlight', mount, 696, 230, new Color(255, 249, 218, 104), 0, 0, 30, 1);
        this.createPanel('RoyalJackpotTopRail', mount, 624, 8, new Color(249, 210, 102, 232), 0, 116, 4);
        this.createPanel('RoyalJackpotBottomRail', mount, 624, 8, new Color(173, 105, 37, 242), 0, -116, 4);
        this.createSpriteNode('RoyalJackpotLeftMedallion', mount, 38, 38, -338, 0, this.frames.get('wealth-coin'));
        this.createSpriteNode('RoyalJackpotRightMedallion', mount, 38, 38, 338, 0, this.frames.get('wealth-coin'));

        const hero = this.createPanel('RoyalJackpotStage', mount, 684, 224, new Color(66, 10, 20, 255), 0, 0, 27);
        const banner = this.createSpriteNode('RoyalJackpotArtwork', hero, 672, 224, 0, 0, this.frames.get('hero-banner-v7'));
        tween(banner)
            .repeatForever(
                tween()
                    .to(7.5, { position: new Vec3(2, 0, 0), scale: new Vec3(1.003, 1.003, 1) }, { easing: 'sineInOut' })
                    .to(7.5, { position: new Vec3(-2, 0, 0), scale: Vec3.ONE }, { easing: 'sineInOut' }),
            )
            .start();
        this.createPanel('JackpotCopyGlass', hero, 368, 190, new Color(49, 7, 17, 218), -154, 0, 22);
        this.createOutlinePanel('RoyalJackpotGoldEdge', hero, 680, 220, new Color(255, 224, 129, 238), 0, 0, 27, 3);
        this.createOutlinePanel('RoyalJackpotInnerEdge', hero, 664, 204, new Color(255, 249, 222, 88), 0, 0, 22, 1);
        this.createLabel('S07–S10 · SOVEREIGN COLLECTION', hero, 12, new Color(255, 219, 140), -156, 66, 340, 28, true);
        this.createDisplayLabel('ROYAL JACKPOT', hero, 31, new Color(255, 249, 222), -156, 30, 350, 48);
        const jackpot = this.createDisplayLabel('5,728,400', hero, 29, new Color(255, 205, 65), -156, -10, 330, 44);
        const jackpotOpacity = jackpot.node.addComponent(UIOpacity);
        tween(jackpotOpacity).repeatForever(tween().to(1.8, { opacity: 226 }, { easing: 'sineInOut' }).to(1.8, { opacity: 255 }, { easing: 'sineInOut' })).start();
        const play = this.createArtworkButton('ENTER THE VAULT', hero, -156, -67, 220, 50, () => {
            this.launchGame('game-s10', 'SOVEREIGN TREASURY');
        }, 'button-primary', 13, new Color(246, 211, 111), new Color(63, 24, 20));
        const coin = this.createSpriteNode('JackpotCoin', hero, 58, 58, 292, 65, this.frames.get('coin-emblem'));
        this.animateLobbyFeature(coin, 1, 5);
        this.bindPressMotion(play);
        const sheen = this.createPanel('JackpotSheen', hero, 30, 174, new Color(255, 238, 176, 22), -318, 0, 10);
        sheen.angle = -12;
        tween(sheen).repeatForever(tween().delay(2.8).to(1.7, { position: new Vec3(318, 0, 0) }, { easing: 'sineInOut' }).delay(4.2).call(() => sheen.setPosition(-318, 0))).start();
        this.animateEntrance(mount, 0, 0, -12, 0.98);

        this.createDisplayLabel("MEMBERS' FLOOR", this.pageRoot, 23, new Color(255, 239, 184), -202, 266, 320, 42);
        this.createLabel('CHOOSE A SIGNATURE SLOT', this.pageRoot, 12, new Color(255, 220, 145), 220, 264, 260, 30, true);

        const categories: Array<[GameCategory, string, number, number]> = [
            ['all', 'ALL', -286, 94],
            ['wheel', 'WHEEL', -154, 118],
            ['megaways', 'MEGAWAYS', 0, 138],
            ['tumble', 'TUMBLE', 158, 122],
            ['cash', 'CASH', 288, 96],
        ];
        categories.forEach(([category, text, x, width]) => {
            const selected = category === this.selectedCategory;
            const chip = new Node(`Category_${category}`);
            this.pageRoot.addChild(chip);
            chip.setPosition(x, 218);
            this.ensureTransform(chip, width, 44);
            const chipFace = this.createSpriteNode('CategoryImage', chip, width, 44, 0, 0, this.frames.get(selected ? 'button-gold-fortune' : 'button-ruby-fortune'));
            const chipOpacity = chipFace.addComponent(UIOpacity);
            chipOpacity.opacity = selected ? 255 : 205;
            this.createLabel(text, chip, 11, selected ? new Color(63, 24, 20) : new Color(255, 246, 225), 0, 0, width - 18, 28, true);
            chip.addComponent(Button);
            chip.on(Button.EventType.CLICK, () => this.selectCategory(category), this);
            this.bindPressMotion(chip);
            if (selected) this.animateSoftImage(chipFace, 0.1);
        });

        const games = [
            { key: 'game-s07', category: 'wheel' as GameCategory },
            { key: 'game-s08', category: 'megaways' as GameCategory },
            { key: 'game-s09', category: 'tumble' as GameCategory },
            { key: 'game-s10', category: 'cash' as GameCategory },
        ];
        const visibleGames = this.selectedCategory === 'all' ? games : games.filter((game) => game.category === this.selectedCategory);
        if (visibleGames.length === 4) {
            // Keep the machine banks clear of the category rail and give both rows
            // enough visual air for their entrance/idle motion at narrow aspect ratios.
            this.createWealthGameTile(visibleGames[0].key, -172, 16, 326, 258, 0);
            this.createWealthGameTile(visibleGames[1].key, 172, 16, 326, 258, 1);
            this.createWealthGameTile(visibleGames[2].key, -172, -264, 326, 258, 2);
            this.createWealthGameTile(visibleGames[3].key, 172, -264, 326, 258, 3);
        } else if (visibleGames.length === 2) {
            visibleGames.forEach((game, index) => this.createWealthGameTile(game.key, index === 0 ? -172 : 172, -72, 326, 258, index));
        } else if (visibleGames.length === 1) {
            const game = visibleGames[0];
            this.createWealthGameTile(game.key, 0, -86, 548, 420, 0);
            const vipStrip = this.createPanel('VipReturnStrip', this.pageRoot, 610, 64, new Color(82, 15, 29, 236), 0, -347, 24);
            this.createOutlinePanel('VipReturnEdge', vipStrip, 606, 60, new Color(246, 211, 111, 168), 0, 0, 24, 2);
            this.createSpriteNode('VipReturnCoin', vipStrip, 44, 44, -262, 0, this.frames.get('coin-emblem'));
            this.createLabel('FILTER ACTIVE · TAP ALL TO VIEW THE FULL FLOOR', vipStrip, 13, new Color(255, 240, 198), 24, 0, 520, 34, true);
        }
    }

    private createWealthGameTile(key: string, x: number, y: number, width: number, height: number, index: number): void {
        const titles: Record<string, string> = {
            'game-s07': 'ROYAL FORTUNE',
            'game-s08': 'ROYAL DIAMOND',
            'game-s09': 'AURUM FORGE',
            'game-s10': 'SOVEREIGN TREASURY',
        };
        const subtitles: Record<string, string> = {
            'game-s07': '1024 WAYS · FORTUNE WHEEL',
            'game-s08': 'MEGAWAYS · CASCADING REELS',
            'game-s09': 'CLUSTER TUMBLE · FORGE ENERGY',
            'game-s10': 'CASH COLLECT · TREASURE VAULT',
        };
        const cardFrames: Record<string, string> = {
            'game-s07': 'card-s07',
            'game-s08': 'card-s08',
            'game-s09': 'card-s09',
            'game-s10': 'card-s10',
        };
        const featureFrames: Record<string, string> = {
            'game-s07': 'feature-s07',
            'game-s08': 'feature-s08',
            'game-s09': 'feature-s09',
            'game-s10': 'nav-rewards-v9',
        };
        const card = this.createPanel(`WealthMachine_${key}`, this.pageRoot, width, height, new Color(67, 9, 20, 252), x, y, 26);
        const artRatio = 390 / 300;
        const artWidth = Math.min(width - 24, (height - 24) * artRatio);
        const artHeight = artWidth / artRatio;
        const artwork = this.createSpriteNode('MachineArtwork', card, artWidth, artHeight, 0, 0, this.frames.get(cardFrames[key]));
        tween(artwork)
            .delay(0.35 + index * 0.11)
            .repeatForever(
                tween()
                    .to(4.2 + index * 0.18, { scale: new Vec3(1.01, 1.01, 1), position: new Vec3(0, 2, 0) }, { easing: 'sineInOut' })
                    .to(4.2 + index * 0.18, { scale: Vec3.ONE, position: Vec3.ZERO }, { easing: 'sineInOut' }),
            )
            .start();
        this.createPanel('MachineTitleGlass', card, width - 22, 72, new Color(49, 7, 17, 238), 0, -height / 2 + 43, 17);
        this.createPanel('MachineTitleHighlight', card, width - 42, 2, new Color(255, 231, 151, 128), 0, -height / 2 + 82, 1);
        this.createDisplayLabel(titles[key], card, width > 400 ? 24 : 17, new Color(255, 249, 221), -14, -height / 2 + 54, width - 88, 32);
        this.createLabel(subtitles[key], card, width > 400 ? 15 : 10, new Color(255, 217, 134), -14, -height / 2 + 25, width - 88, 22, true);
        this.createOutlinePanel('WealthMachineInnerEdge', card, width - 12, height - 12, new Color(255, 248, 215, 78), 0, 0, 20, 1);
        const goldEdge = this.createOutlinePanel('WealthMachineGoldEdge', card, width - 2, height - 2, new Color(255, 221, 116, 230), 0, 0, 26, 3);
        const edgeOpacity = goldEdge.addComponent(UIOpacity);
        tween(edgeOpacity)
            .delay(index * 0.22)
            .repeatForever(tween().to(2.8, { opacity: 210 }, { easing: 'sineInOut' }).to(2.8, { opacity: 255 }, { easing: 'sineInOut' }))
            .start();

        const livePill = this.createPanel('MachineLivePill', card, 66, 28, new Color(84, 13, 25, 238), width / 2 - 45, -height / 2 + 44, 13);
        const liveDot = this.createCirclePanel('MachineLiveDot', livePill, 9, new Color(115, 255, 188), -20, 0);
        this.createLabel('PLAY', livePill, 10, new Color(255, 242, 204), 9, 0, 42, 20, true);
        const liveOpacity = liveDot.addComponent(UIOpacity);
        tween(liveOpacity).repeatForever(tween().to(1.2, { opacity: 128 }, { easing: 'sineInOut' }).to(1.2, { opacity: 255 }, { easing: 'sineInOut' })).start();
        const feature = this.createSpriteNode('MachineFeature', card, width > 400 ? 74 : 54, width > 400 ? 74 : 54, width / 2 - (width > 400 ? 54 : 40), height / 2 - (width > 400 ? 56 : 42), this.frames.get(featureFrames[key]));
        this.animateLobbyFeature(feature, index, width > 400 ? 5 : 3);
        const titleSweep = this.createPanel('MachineTitleSweep', card, 16, 54, new Color(255, 244, 196, 22), -width / 2 + 28, -height / 2 + 43, 8);
        titleSweep.angle = -12;
        tween(titleSweep)
            .delay(1.2 + index * 0.36)
            .repeatForever(
                tween()
                    .to(1.1, { position: new Vec3(width / 2 - 28, -height / 2 + 43, 0) }, { easing: 'sineInOut' })
                    .delay(4.6 + index * 0.25)
                    .call(() => titleSweep.setPosition(-width / 2 + 28, -height / 2 + 43)),
            )
            .start();
        card.addComponent(Button);
        card.on(Button.EventType.CLICK, () => {
            this.launchGame(key, titles[key]);
        }, this);
        this.bindPressMotion(card);
        this.animateEntrance(card, index + 1, 0, -12, 0.965);
    }

    private animateLobbyFeature(node: Node, index: number, lift: number): void {
        const base = node.position.clone();
        const direction = index % 2 === 0 ? 1 : -1;
        tween(node)
            .delay(index * 0.16)
            .repeatForever(
                tween()
                    .to(2.7 + index * 0.18, {
                        position: new Vec3(base.x + direction * 2, base.y + lift, base.z),
                        angle: direction * 2.5,
                        scale: new Vec3(1.035, 1.035, 1),
                    }, { easing: 'sineInOut' })
                    .to(2.7 + index * 0.18, {
                        position: base,
                        angle: -direction * 2.5,
                        scale: Vec3.ONE,
                    }, { easing: 'sineInOut' }),
            )
            .start();
    }

    private selectCategory(category: GameCategory): void {
        if (category === this.selectedCategory || this.currentPage !== 'home' || this.isTransitioning) return;
        this.selectedCategory = category;
        this.refreshCurrentPage('home');
    }

    private launchGame(key: string, title: string): void {
        this.node.emit('lobby:game-selected', key);
        if (typeof window === 'undefined') {
            this.showToast(`${title} · TABLE OPENED`);
            return;
        }

        // Individual L02 previews remain self-contained. The assembled F1
        // suite opts into real navigation with ?suite=f1.
        const params = new URLSearchParams(window.location.search);
        if (params.get('suite') !== 'f1') {
            this.showToast(`${title} · TABLE OPENED`);
            return;
        }
        if (this.isTransitioning) return;

        const routes: Record<string, string> = {
            'game-s07': './games/s07/index.html',
            'game-s08': './games/s08/index.html',
            'game-s09': './games/s09/index.html',
            'game-s10': './games/s10/index.html',
        };
        const route = routes[key];
        if (!route) {
            this.showToast('TABLE IS TEMPORARILY UNAVAILABLE');
            return;
        }

        this.isTransitioning = true;
        const curtain = this.createPanel(
            'GameLaunchCurtain',
            this.node,
            this.viewportWidth,
            this.viewportHeight,
            new Color(21, 4, 12, 248),
            0,
            0,
            0,
        );
        const opacity = curtain.addComponent(UIOpacity);
        opacity.opacity = 0;
        const coin = this.createSpriteNode('LaunchCoin', curtain, 104, 104, 0, 34, this.frames.get('wealth-coin'));
        coin.setScale(0.76, 0.76, 1);
        this.createDisplayLabel(title, curtain, 25, new Color(255, 246, 211), 0, -54, 620, 48);
        this.createLabel('ENTERING THE ROYAL FLOOR', curtain, 12, new Color(255, 211, 117), 0, -98, 440, 28, true);
        tween(opacity).to(0.22, { opacity: 255 }, { easing: 'quadOut' }).start();
        tween(coin)
            .to(0.26, { scale: new Vec3(1.05, 1.05, 1), angle: 7 }, { easing: 'backOut' })
            .to(0.12, { scale: Vec3.ONE, angle: 0 }, { easing: 'sineOut' })
            .start();

        const destination = new URL(route, window.location.href);
        destination.searchParams.set('suite', 'f1');
        destination.searchParams.set('home', '../../index.html?suite=f1&page=home');
        this.scheduleOnce(() => window.location.assign(destination.href), 0.34);
    }

    private refreshCurrentPage(page: LobbyPage): void {
        if (!this.pageRoot?.isValid || this.isTransitioning) return;
        this.isTransitioning = true;
        const oldRoot = this.pageRoot;
        const oldOpacity = oldRoot.getComponent(UIOpacity) ?? oldRoot.addComponent(UIOpacity);
        tween(oldRoot)
            .to(0.14, { position: new Vec3(0, -34, 0), scale: new Vec3(0.995, 0.995, 1) }, { easing: 'quadIn' })
            .call(() => {
                if (oldRoot.isValid) oldRoot.destroy();
                this.createPage(page, false);
                const newRoot = this.pageRoot;
                const newOpacity = newRoot.getComponent(UIOpacity)!;
                newRoot.setPosition(0, -20);
                newRoot.setScale(0.995, 0.995, 1);
                newOpacity.opacity = 0;
                tween(newRoot)
                    .to(0.24, { position: new Vec3(0, -28, 0), scale: Vec3.ONE }, { easing: 'quartOut' })
                    .call(() => { this.isTransitioning = false; })
                    .start();
                tween(newOpacity).to(0.18, { opacity: 255 }, { easing: 'quadOut' }).start();
            })
            .start();
        tween(oldOpacity).to(0.12, { opacity: 0 }, { easing: 'quadIn' }).start();
    }

    private createGameCard(key: string, x: number, y: number, tag: string, tagColor: Color, index: number): void {
        const sourceRatios: Record<string, number> = {
            'game-golden-chest': 3 / 4,
            'game-ruby-vault': 3 / 4,
            'game-emerald-fortune': 3 / 4,
            'game-coin-fountain': 3 / 4,
        };
        const titles: Record<string, string> = {
            'game-golden-chest': 'GOLDEN CHEST',
            'game-ruby-vault': 'RUBY JACKPOT',
            'game-emerald-fortune': 'EMERALD FORTUNE',
            'game-coin-fountain': 'COIN FOUNTAIN',
        };
        const artWidth = 228;
        const naturalArtHeight = Math.round(artWidth / (sourceRatios[key] ?? 0.74));
        const artHeight = Math.min(286, naturalArtHeight);
        const rimWidth = 240;
        const rimHeight = artHeight + 12;
        this.createPanel(`GameShadow_${key}`, this.pageRoot, rimWidth + 6, rimHeight + 6, new Color(0, 0, 0, 110), x, y - 8, 22);
        const rim = this.createPanel(`GameRim_${key}`, this.pageRoot, rimWidth, rimHeight, new Color(112, 39, 24), x, y, 22);
        this.createOutlinePanel('GameOutline', rim, rimWidth - 2, rimHeight - 2, new Color(255, 222, 145, 200), 0, 0, 22, 2);
        const card = this.createSpriteNode(`GameCard_${key}`, rim, artWidth, artHeight, 0, 0, this.frames.get(key));
        const titleShade = this.createPanel('GameTitleShade', card, artWidth, 50, new Color(102, 22, 20, 230), 0, -artHeight / 2 + 25, 0);
        this.createDisplayLabel(titles[key] ?? key, titleShade, 12, new Color(245, 241, 229), 0, 0, artWidth - 20, 30);
        card.addComponent(Button);
        card.on(Button.EventType.CLICK, () => {
            this.node.emit('lobby:game-selected', key);
            this.showToast(`${key.replace('game-', '').toUpperCase()} · GAME SELECTED`);
        }, this);
        this.bindPressMotion(rim);
        const badge = this.createPanel(`GameBadge_${key}`, rim, 76, 34, tagColor, -74, rimHeight / 2 - 15, 16);
        this.createLabel(tag, badge, 13, Color.WHITE, 0, 0, 72, 30, true);
        this.animateEntrance(rim, index, 0, -10, 0.96);
        this.scheduleOnce(() => {
            if (!card.isValid) return;
            const lift = index % 2 === 0 ? 2 : -2;
            tween(card)
                .repeatForever(
                    tween()
                        .to(4.4 + index * 0.25, { position: new Vec3(0, lift, 0), scale: new Vec3(1.006, 1.006, 1) }, { easing: 'sineInOut' })
                        .to(4.4 + index * 0.25, { position: new Vec3(0, -lift, 0), scale: Vec3.ONE }, { easing: 'sineInOut' }),
                )
                .start();
        }, 0.45 + index * 0.12);
    }

    private buildStorePage(): void {
        this.createPageTitle('SOVEREIGN CASHIER', 'ROYAL COINS · VIP RESERVE PACKS');

        const offer = this.createPanel('StoreVipOffer', this.pageRoot, 600, 128, new Color(111, 36, 27, 220), 0, 330, 28);
        const offerArt = this.createSpriteNode('StoreVipOfferArt', offer, 600, 128, 0, 0, this.frames.get('button-ruby-fortune'));
        const offerOpacity = offerArt.addComponent(UIOpacity);
        offerOpacity.opacity = 218;
        this.createCirclePanel('StoreOfferGlow', offer, 92, new Color(255, 184, 55, 52), -238, 0);
        const offerChest = this.createSpriteNode('StoreOfferChest', offer, 104, 104, -238, -2, this.frames.get('treasure-chest-emblem'));
        this.animateSoftImage(offerChest, 0.14);
        this.createLabel('CROWN VAULT BONUS', offer, 18, Color.WHITE, -56, 24, 260, 30, true);
        this.createLabel('EXTRA COINS ON SELECTED JACKPOT PACKS', offer, 10, new Color(255, 225, 142), -42, -14, 300, 24, true);
        this.createArtworkButton('VIEW +20%', offer, 212, 0, 142, 44, () => this.showToast('CROWN VAULT BONUS · SELECT A PACK'), 'button-primary', 11);

        const packs = [
            { amount: '1,000', price: '$0.99', bonus: 'STARTER', coin: 1 },
            { amount: '2,500', price: '$1.99', bonus: '+10% BONUS', coin: 2 },
            { amount: '6,000', price: '$3.99', bonus: '+20% BONUS', coin: 3 },
            { amount: '14,000', price: '$7.99', bonus: '+30% BONUS', coin: 4 },
            { amount: '32,000', price: '$14.99', bonus: '+45% BONUS', coin: 5 },
            { amount: '80,000', price: '$29.99', bonus: 'BEST VALUE', coin: 6 },
        ];
        packs.forEach((pack, index) => {
            const x = -225 + (index % 3) * 225;
            const y = index < 3 ? 118 : -176;
            this.createStoreProduct(pack.amount, pack.price, pack.bonus, pack.coin, x, y, index);
        });

        const secure = this.createPanel('StoreSecureBar', this.pageRoot, 650, 58, new Color(89, 23, 21, 236), 0, -366, 26);
        this.createOutlinePanel('StoreSecureOutline', secure, 648, 56, new Color(202, 162, 91, 54), 0, 0, 26, 1);
        this.createSpriteNode('StoreSecureIcon', secure, 28, 28, -280, 0, this.frames.get('coin-emblem'));
        this.createLabel('VIRTUAL COINS · DEMO CHECKOUT · NO REAL-MONEY WAGERING', secure, 11, new Color(255, 239, 209, 210), 12, 0, 570, 30, true);
    }

    private createStoreProduct(
        amount: string,
        price: string,
        bonus: string,
        coinIndex: number,
        x: number,
        y: number,
        index: number,
    ): void {
        const card = this.createPanel(`StorePack_${coinIndex}`, this.pageRoot, 198, 276, index === 5 ? new Color(146, 52, 27, 250) : new Color(101, 32, 27, 246), x, y, 24);
        this.decorateCasinoCard(card, 198, 276, index, false);
        this.createOutlinePanel('StorePackOutline', card, 196, 274, index === 5 ? new Color(229, 192, 113) : new Color(202, 162, 91, 76), 0, 0, 24, index === 5 ? 2 : 1);
        const titleBar = this.createPanel('StorePackTitle', card, 150, 38, new Color(202, 162, 91), 0, 103, 14);
        this.createLabel(amount, titleBar, 17, new Color(5, 25, 29), 0, 0, 132, 28, true);

        const sourceSizes = [[110, 87], [126, 102], [141, 129], [168, 144], [157, 178], [231, 155]];
        const [sourceWidth, sourceHeight] = sourceSizes[coinIndex - 1];
        const maxWidth = coinIndex === 6 ? 138 : 112;
        const coinHeight = Math.round(maxWidth * sourceHeight / sourceWidth);
        const coin = this.createSpriteNode('StorePackCoins', card, maxWidth, coinHeight, 0, 21, this.frames.get(`store-coin-${coinIndex}`));
        tween(coin)
            .delay(index * 0.12)
            .repeatForever(
                tween()
                    .to(4.2 + index * 0.16, { position: new Vec3(0, 24, 0), scale: new Vec3(1.01, 1.01, 1) }, { easing: 'sineInOut' })
                    .to(4.2 + index * 0.16, { position: new Vec3(0, 18, 0), scale: Vec3.ONE }, { easing: 'sineInOut' }),
            )
            .start();

        const bonusColor = index === 5 ? new Color(255, 230, 92) : new Color(255, 255, 255, 205);
        this.createLabel(bonus, card, 11, bonusColor, 0, -52, 160, 24, true);
        const priceButton = new Node('StorePriceButton');
        card.addChild(priceButton);
        priceButton.setPosition(0, -103);
        this.ensureTransform(priceButton, 150, 40);
        const priceFace = this.createSpriteNode('StorePriceImage', priceButton, 150, 40, 0, 0, this.frames.get('button-gold-fortune'));
        this.createLabel(price, priceButton, 14, new Color(91, 38, 21), 0, 0, 120, 28, true);
        priceButton.addComponent(Button);
        priceButton.on(Button.EventType.CLICK, () => this.purchaseCoinPack(amount), this);
        this.bindPressMotion(priceButton);
        this.animateSoftImage(priceFace, (index % 3) * 0.12);
        this.animateEntrance(card, index, 0, -10, 0.97);
    }

    private buildRankPage(): void {
        const periods: Array<{ key: RankPeriod; label: string; pool: string }> = [
            { key: 'daily', label: 'DAILY', pool: '888,888' },
            { key: 'weekly', label: 'WEEKLY', pool: '5,888,888' },
            { key: 'all', label: 'ALL TIME', pool: '88,888,888' },
        ];
        const activePeriod = periods.find((period) => period.key === this.selectedRankPeriod) ?? periods[0];
        this.createPageTitle('HIGH ROLLERS', `${activePeriod.label} JACKPOT LEADERS · LIVE COIN RANKING`);

        const prizePill = new Node('RankPrizePool');
        this.pageRoot.addChild(prizePill);
        prizePill.setPosition(0, 414);
        this.ensureTransform(prizePill, 360, 48);
        const prizeFace = this.createSpriteNode('RankPrizePoolImage', prizePill, 360, 48, 0, 0, this.frames.get('button-gold-fortune'));
        this.createSpriteNode('RankPrizePoolCoin', prizePill, 34, 34, -142, 0, this.frames.get('coin-emblem'));
        this.createLabel('JACKPOT POOL', prizePill, 11, new Color(91, 48, 24), -66, 0, 118, 28, true);
        this.createDisplayLabel(activePeriod.pool, prizePill, 17, new Color(73, 31, 18), 77, 0, 150, 30);
        prizePill.addComponent(Button);
        prizePill.on(Button.EventType.CLICK, () => this.showToast(`${activePeriod.pool} COINS · ${activePeriod.label} PRIZE POOL`), this);
        this.bindPressMotion(prizePill);
        this.animateSoftImage(prizeFace, 0.18);

        const tabs = this.createPanel('RankTabs', this.pageRoot, 600, 62, new Color(89, 25, 22, 246), 0, 350, 31);
        this.createOutlinePanel('RankTabsOutline', tabs, 598, 60, new Color(238, 195, 109, 86), 0, 0, 30, 1);
        periods.forEach((period, index) => {
            const selected = period.key === this.selectedRankPeriod;
            const tab = new Node(`RankTab_${period.key}`);
            tabs.addChild(tab);
            tab.setPosition(-190 + index * 190, 0);
            this.ensureTransform(tab, 184, 50);
            const face = this.createSpriteNode(
                'RankTabImage',
                tab,
                184,
                50,
                0,
                0,
                this.frames.get(selected ? 'button-gold-fortune' : 'button-ruby-fortune'),
            );
            const faceOpacity = face.addComponent(UIOpacity);
            faceOpacity.opacity = selected ? 255 : 208;
            this.createLabel(period.label, tab, 13, selected ? new Color(74, 34, 19) : new Color(255, 239, 211), 0, 0, 160, 32, true);
            tab.addComponent(Button);
            tab.on(Button.EventType.CLICK, () => this.selectRankPeriod(period.key), this);
            this.bindPressMotion(tab);
            if (selected) this.animateSoftImage(face, 0.08);
        });

        const ranking = this.rankEntries();
        const podium = [ranking[1], ranking[0], ranking[2]];
        const podiumX = [-205, 0, 205];
        const podiumY = [178, 226, 160];
        podium.forEach((entry, index) => {
            if (!entry) return;
            const rank = index === 1 ? 1 : index === 0 ? 2 : 3;
            const height = rank === 1 ? 224 : 190;
            const card = this.createPanel(
                `Podium_${rank}`,
                this.pageRoot,
                174,
                height,
                rank === 1 ? new Color(146, 51, 27, 242) : new Color(101, 32, 28, 238),
                podiumX[index],
                podiumY[index],
                30,
            );
            this.decorateCasinoCard(card, 174, height, rank - 1, false);
            this.createOutlinePanel('PodiumOutline', card, 164, height - 10, rank === 1 ? new Color(225, 190, 117) : new Color(202, 162, 91, 98), 0, 0, 26, rank === 1 ? 2 : 1);
            const badge = this.createSpriteNode(`RankBadge_${rank}`, card, rank === 1 ? 50 : 44, rank === 1 ? 50 : 44, 0, height / 2 - 25, this.frames.get('coin-emblem'));
            const rankCore = this.createCirclePanel('RankNumberCore', badge, rank === 1 ? 29 : 25, new Color(104, 31, 24, 238), 0, 0);
            this.createLabel(`${rank}`, rankCore, rank === 1 ? 18 : 15, Color.WHITE, 0, 0, 24, 24, true);
            this.createSpriteNode('PodiumCoinFlareLeft', card, rank === 1 ? 24 : 20, rank === 1 ? 24 : 20, -62, 56, this.frames.get('coin-emblem'));
            this.createSpriteNode('PodiumCoinFlareRight', card, rank === 1 ? 20 : 17, rank === 1 ? 20 : 17, 62, 48, this.frames.get('coin-emblem'));
            const avatar = this.createCirclePanel('PodiumAvatarRim', card, rank === 1 ? 82 : 70, new Color(202, 162, 91), 0, 22);
            this.createSpriteNode('PodiumAvatar', avatar, rank === 1 ? 70 : 60, rank === 1 ? 70 : 60, 0, 0, this.avatarFrame(entry.avatar));
            this.createLabel(entry.name.toUpperCase(), card, 14, Color.WHITE, 0, -40, 150, 26, true);
            this.createSpriteNode('PodiumPrizePlate', card, 142, 36, 0, -72, this.frames.get('button-gold-fortune'));
            this.createSpriteNode('PodiumPrizeCoin', card, 22, 22, -48, -72, this.frames.get('coin-emblem'));
            this.createLabel(entry.coins.toLocaleString('en-US'), card, 15, new Color(75, 33, 19), 19, -72, 102, 28, true);
            card.addComponent(Button);
            card.on(Button.EventType.CLICK, () => this.showToast(`#${rank} ${entry.name.toUpperCase()} · ${entry.coins.toLocaleString('en-US')} COINS`), this);
            this.bindPressMotion(card);
            this.animateEntrance(card, index, 0, -12, 0.97);
        });

        const list = this.createPanel('RankList', this.pageRoot, 680, 472, new Color(88, 28, 24, 228), 0, -252, 36);
        this.decorateCasinoCard(list, 680, 472, 0, true);
        this.createOutlinePanel('RankListOutline', list, 668, 460, new Color(202, 162, 91, 70), 0, 0, 31, 1);
        ranking.slice(3, 9).forEach((entry, index) => {
            const y = 195 - index * 75;
            const row = this.createPanel(
                `RankRow_${index + 4}`,
                list,
                628,
                66,
                entry.current ? new Color(146, 48, 29, 188) : new Color(78, 20, 22, index % 2 === 0 ? 116 : 82),
                0,
                y,
                22,
            );
            this.decorateCasinoCard(row, 628, 66, index, false);
            this.createLabel(`#${index + 4}`, row, 17, new Color(225, 190, 117), -273, 0, 54, 34, true);
            const avatar = this.createCirclePanel('RankAvatarRim', row, 48, new Color(202, 162, 91), -214, 0);
            this.createSpriteNode('RankAvatar', avatar, 42, 42, 0, 0, this.avatarFrame(entry.avatar));
            this.createLabel(entry.current ? `${entry.name}  ·  YOU` : entry.name, row, 16, Color.WHITE, -76, 0, 220, 34, true);
            this.createSpriteNode('RankCoin', row, 28, 28, 152, 0, this.frames.get('coin-emblem'));
            this.createLabel(entry.coins.toLocaleString('en-US'), row, 17, new Color(225, 190, 117), 218, 0, 150, 34, true);
            row.addComponent(Button);
            row.on(Button.EventType.CLICK, () => this.showToast(`${entry.name.toUpperCase()} · ${entry.coins.toLocaleString('en-US')} COINS`), this);
            this.bindPressMotion(row);
            this.animateEntrance(row, index + 2, -16, 0, 0.99);
        });
    }

    private selectRankPeriod(period: RankPeriod): void {
        if (period === this.selectedRankPeriod || this.currentPage !== 'rank' || this.isTransitioning) return;
        this.selectedRankPeriod = period;
        this.refreshCurrentPage('rank');
    }

    private buildRewardsPage(): void {
        this.createPageTitle('ROYAL REWARDS', 'SOVEREIGN DROPS · DAILY GOLD · VIP MISSIONS');
        const claimedToday = this.isRewardClaimedToday();
        const hero = this.createPanel('RewardHero', this.pageRoot, 650, 270, new Color(73, 11, 26, 238), 0, 274, 34);
        this.createPanel('RewardHeroHighlight', hero, 620, 60, new Color(255, 232, 164, 22), 0, 92, 22);
        this.createOutlinePanel('RewardHeroGoldEdge', hero, 648, 268, new Color(255, 220, 116, 226), 0, 0, 34, 3);
        this.createOutlinePanel('RewardHeroInnerEdge', hero, 630, 250, new Color(255, 249, 220, 70), 0, 0, 27, 1);
        const chestStage = this.createPanel('RewardChestStage', hero, 222, 222, new Color(85, 13, 27, 220), -196, 0, 28);
        this.createOutlinePanel('RewardChestStageEdge', chestStage, 218, 218, new Color(255, 218, 115, 158), 0, 0, 28, 2);
        const gift = this.createSpriteNode('RewardGiftImage', chestStage, 204, 204, 0, -2, this.frames.get('nav-rewards-v9'));
        this.animateLobbyFeature(gift, 0, 4);
        chestStage.addComponent(Button);
        chestStage.on(Button.EventType.CLICK, () => this.showToast('SOVEREIGN DROP · 200 COINS READY'), this);
        this.bindPressMotion(chestStage);

        this.createLabel('TODAY’S SOVEREIGN DROP', hero, 12, new Color(255, 220, 140), 128, 80, 276, 26, true);
        this.createDisplayLabel(claimedToday ? 'COLLECTED' : '200 COINS', hero, 28, new Color(255, 249, 218), 130, 42, 286, 46);
        this.createLabel('DAY 3 OF 7 · KEEP THE JACKPOT STREAK ALIVE', hero, 11, new Color(255, 235, 194), 130, 4, 310, 28, true);
        this.createArtworkButton(
            claimedToday ? 'CLAIMED TODAY' : 'CLAIM REWARD',
            hero,
            130,
            -62,
            250,
            60,
            () => this.claimDailyReward(),
            claimedToday ? 'button-wide' : 'button-collect',
            15,
            claimedToday ? new Color(160, 160, 160) : Color.WHITE,
            claimedToday ? Color.WHITE : new Color(75, 12, 16),
        );
        this.animateEntrance(hero, 0, 0, -12, 0.97);

        this.createDisplayLabel('7-DAY GOLD STREAK', this.pageRoot, 20, new Color(255, 240, 193), -188, 104, 310, 36);
        this.createLabel('TAP A DAY TO VIEW ITS VALUE', this.pageRoot, 11, new Color(255, 222, 151), 215, 104, 280, 28, true);
        const rewards = [100, 150, 200, 250, 300, 400, 800];
        rewards.forEach((amount, index) => {
            const x = -282 + index * 94;
            const y = 25;
            const claimed = index < 2;
            const cell = this.createPanel(
                `RewardDay_${index + 1}`,
                this.pageRoot,
                86,
                112,
                claimed ? new Color(74, 18, 27, 236) : index === 2 ? new Color(139, 36, 29, 252) : new Color(91, 17, 29, 244),
                x,
                y,
                20,
            );
            this.createOutlinePanel('RewardOutline', cell, 82, 108, index === 2 ? new Color(255, 225, 128) : new Color(202, 162, 91, 94), 0, 0, 19, index === 2 ? 2 : 1);
            this.createLabel(`DAY ${index + 1}`, cell, 11, new Color(255, 218, 130), 0, 33, 76, 22, true);
            const statusIcon = this.createSpriteNode('RewardStatusImage', cell, 32, 32, 0, 2, this.frames.get('coin-emblem'));
            if (index === 2) this.animateSoftImage(statusIcon, 0.2);
            this.createLabel(`${amount}`, cell, 16, Color.WHITE, 0, -33, 74, 28, true);
            cell.addComponent(Button);
            cell.on(Button.EventType.CLICK, () => this.showToast(`DAY ${index + 1} · ${amount} COINS`), this);
            this.bindPressMotion(cell);
            this.animateEntrance(cell, index + 1, 0, -8, 0.975);
        });

        const quests = this.createPanel('QuestPanel', this.pageRoot, 650, 244, new Color(72, 10, 24, 242), 0, -190, 30);
        this.createPanel('QuestPanelHighlight', quests, 620, 48, new Color(255, 231, 160, 18), 0, 86, 20);
        this.createOutlinePanel('QuestPanelOutline', quests, 648, 242, new Color(255, 218, 116, 160), 0, 0, 30, 2);
        this.createDisplayLabel('CASINO MISSIONS', quests, 19, new Color(255, 241, 198), -178, 88, 270, 34);
        this.createLabel('DAILY', quests, 11, new Color(255, 213, 123), 254, 88, 90, 24, true);
        [['PLAY 3 GAMES', '1 / 3', 0.34], ['WIN ANY SLOT', 'READY', 1]].forEach((item, index) => {
            const y = 32 - index * 82;
            this.createLabel(item[0] as string, quests, 14, Color.WHITE, -190, y + 14, 230, 28, true);
            const track = this.createPanel(`QuestTrack_${index}`, quests, 336, 18, new Color(41, 7, 16, 245), -36, y - 18, 9);
            const progressWidth = 346 * (item[2] as number);
            const safeProgressWidth = Math.min(326, progressWidth);
            const progress = this.createPanel(`QuestProgress_${index}`, track, safeProgressWidth, 12, new Color(255, 193, 38), -163 + safeProgressWidth / 2, 0, 6);
            progress.setScale(0.06, 1, 1);
            tween(progress).delay(0.18 + index * 0.08).to(0.42, { scale: Vec3.ONE }, { easing: 'quartOut' }).start();
            this.createLabel(item[1] as string, quests, 14, new Color(255, 218, 83), 250, y, 110, 30, true);
        });
        this.createLabel('REWARDS REFRESH DAILY AT MIDNIGHT', this.pageRoot, 11, new Color(255, 238, 203, 190), 0, -344, 520, 28, true);
    }

    private buildAccountPage(): void {
        const user = this.currentUser!;
        this.createPageTitle('SOVEREIGN ACCOUNT', 'PRIVATE MEMBER CARD · PREFERENCES · SECURITY');
        const profile = this.createPanel('ProfileCard', this.pageRoot, 650, 304, new Color(75, 10, 25, 242), 0, 270, 36);
        this.createPanel('ProfileCardHighlight', profile, 620, 60, new Color(255, 234, 171, 22), 0, 103, 24);
        this.createOutlinePanel('ProfileOutline', profile, 648, 302, new Color(255, 220, 118, 224), 0, 0, 36, 3);
        this.createOutlinePanel('ProfileInnerOutline', profile, 630, 284, new Color(255, 248, 216, 68), 0, 0, 29, 1);
        const avatar = this.createCirclePanel('ProfileAvatarRim', profile, 136, new Color(255, 218, 112), -224, 53);
        this.createCirclePanel('ProfileAvatarInset', avatar, 124, new Color(92, 14, 29), 0, 0);
        this.createSpriteNode('ProfileAvatar', avatar, 116, 116, 0, 0, this.avatarFrame(user.avatar));
        this.createLabel('SOVEREIGN MEMBER', profile, 11, new Color(255, 216, 132), 70, 102, 330, 26, true);
        this.createDisplayLabel(user.username.toUpperCase(), profile, 27, new Color(255, 249, 221), 70, 65, 350, 44);
        this.createLabel('GOLD HIGH ROLLER · PRIVATE FLOOR ACCESS', profile, 12, new Color(255, 235, 193), 70, 27, 360, 28, true);
        this.createArtworkButton('CHANGE PORTRAIT', profile, 70, -22, 224, 52, () => this.rotateAvatar(), 'button-small', 12);

        const stats = [
            { label: 'BALANCE', value: user.coins.toLocaleString('en-US'), frame: 'coin-emblem' },
            { label: 'VIP POINTS', value: '8,240', frame: 'account-info-7' },
            { label: 'BEST WIN', value: '3,500', frame: 'account-info-4' },
        ];
        stats.forEach((stat, index) => {
            const statCard = this.createPanel('ProfileStat', profile, 194, 70, new Color(54, 7, 18, 226), -204 + index * 204, -108, 19);
            this.createOutlinePanel('ProfileStatEdge', statCard, 190, 66, new Color(255, 218, 115, 86), 0, 0, 18, 1);
            this.createSpriteNode('ProfileStatIcon', statCard, 30, 30, -68, 0, this.frames.get(stat.frame));
            this.createLabel(stat.value, statCard, 18, new Color(255, 222, 132), 28, 12, 122, 30, true);
            this.createLabel(stat.label, statCard, 10, new Color(255, 246, 220, 185), 27, -17, 126, 22, true);
        });
        this.animateEntrance(profile, 0, 0, -10, 0.975);

        const accountActions = [
            { name: 'VIP INBOX', subtitle: '3 NEW OFFERS', icon: 'treasure-chest-emblem', x: -165 },
            { name: 'ACHIEVEMENTS', subtitle: '12 / 36 UNLOCKED', icon: 'coin-emblem', x: 165 },
        ];
        accountActions.forEach((action, index) => {
            const actionCard = this.createPanel(`AccountAction_${action.name}`, this.pageRoot, 310, 112, new Color(85, 13, 27, 242), action.x, 46, 28);
            this.createPanel('AccountActionHighlight', actionCard, 284, 30, new Color(255, 232, 165, 18), 0, 30, 14);
            this.createOutlinePanel('AccountActionOutline', actionCard, 306, 108, new Color(255, 218, 115, 132), 0, 0, 27, 2);
            const icon = this.createSpriteNode('AccountActionIcon', actionCard, 72, 72, -102, 0, this.frames.get(action.icon));
            this.animateSoftImage(icon, 0.16 + index * 0.2);
            this.createLabel(action.name, actionCard, 16, Color.WHITE, 46, 20, 180, 30, true);
            this.createLabel(action.subtitle, actionCard, 11, new Color(255, 220, 138), 46, -20, 180, 24, true);
            actionCard.addComponent(Button);
            actionCard.on(Button.EventType.CLICK, () => this.showToast(`${action.name} · ${action.subtitle}`), this);
            this.bindPressMotion(actionCard);
            this.animateEntrance(actionCard, index + 1, 0, -10, 0.975);
        });

        const settings = this.createPanel('AccountSettings', this.pageRoot, 650, 258, new Color(69, 9, 22, 244), 0, -160, 34);
        this.createPanel('AccountSettingsHighlight', settings, 620, 42, new Color(255, 232, 163, 18), 0, 101, 20);
        this.createOutlinePanel('AccountSettingsOutline', settings, 648, 256, new Color(255, 217, 113, 142), 0, 0, 34, 2);
        this.createDisplayLabel('PLAYER PREFERENCES', settings, 17, new Color(255, 237, 187), -178, 101, 270, 30);
        const menuItems = [
            { label: 'SOUND', icon: 'account-info-1', toggle: 'sound' },
            { label: 'NOTIFICATIONS', icon: 'account-info-2', toggle: 'notifications' },
            { label: 'SECURITY', icon: 'account-info-5', toggle: '' },
            { label: 'VIP SUPPORT', icon: 'account-info-8', toggle: '' },
        ];
        menuItems.forEach((item, index) => {
            const x = index % 2 === 0 ? -158 : 158;
            const y = index < 2 ? 37 : -65;
            const menu = this.createPanel(`AccountMenu_${item.label}`, settings, 292, 86, new Color(104, 22, 32, 218), x, y, 22);
            this.createOutlinePanel('AccountMenuEdge', menu, 288, 82, new Color(255, 220, 119, 70), 0, 0, 21, 1);
            this.createSpriteNode('AccountMenuIcon', menu, 46, 46, -102, 0, this.frames.get(item.icon));
            this.createLabel(item.label, menu, 13, Color.WHITE, 4, 12, 170, 26, true);
            const currentValue = item.toggle === 'sound'
                ? (this.soundEnabled ? 'ON' : 'OFF')
                : item.toggle === 'notifications'
                    ? (this.notificationsEnabled ? 'ON' : 'OFF')
                    : item.label === 'SECURITY' ? 'PROTECTED' : 'OPEN';
            const valueLabel = this.createLabel(currentValue, menu, 11, new Color(255, 218, 128), 4, -17, 170, 22, true);
            menu.addComponent(Button);
            menu.on(Button.EventType.CLICK, () => {
                if (item.toggle === 'sound') {
                    this.soundEnabled = !this.soundEnabled;
                    valueLabel.string = this.soundEnabled ? 'ON' : 'OFF';
                    this.showToast(`SOUND · ${valueLabel.string}`);
                } else if (item.toggle === 'notifications') {
                    this.notificationsEnabled = !this.notificationsEnabled;
                    valueLabel.string = this.notificationsEnabled ? 'ON' : 'OFF';
                    this.showToast(`NOTIFICATIONS · ${valueLabel.string}`);
                } else {
                    this.showToast(item.label === 'SECURITY' ? 'ACCOUNT SECURITY · PROTECTED' : 'VIP SUPPORT · CONCIERGE OPEN');
                }
            }, this);
            this.bindPressMotion(menu);
        });
        this.animateEntrance(settings, 3, 0, -10, 0.98);

        this.createArtworkButton('SIGN OUT', this.pageRoot, 0, -344, 230, 52, () => this.logout(), 'auth-secondary', 13, new Color(255, 178, 178), Color.WHITE);
    }

    private buildNavigation(active: LobbyPage): void {
        const nav = this.createPanel('Navigation', this.node, this.viewportWidth, 154, new Color(42, 6, 16, 255), 0, -590, 0);
        this.navigationRoot = nav;
        const navArtwork = this.createSpriteNode('NavigationArtwork', nav, this.viewportWidth, 154, 0, 0, this.frames.get('nav-background'));
        const navArtworkOpacity = navArtwork.addComponent(UIOpacity);
        navArtworkOpacity.opacity = 242;
        this.createPanel('NavigationBurgundyBand', nav, this.viewportWidth, 30, new Color(104, 20, 38, 235), 0, 61, 0);
        this.createPanel('NavigationGoldLine', nav, this.viewportWidth, 4, new Color(255, 221, 118, 235), 0, 76, 0);
        this.navigationSelector = this.createPanel('NavigationSelector', nav, 124, 124, new Color(111, 24, 34, 236), this.navigationX(active), -4, 30);
        this.createOutlinePanel('NavigationSelectorGoldEdge', this.navigationSelector, 120, 120, new Color(255, 221, 119, 218), 0, 0, 29, 2);
        this.createPanel('NavigationSelectorHighlight', this.navigationSelector, 94, 2, new Color(255, 242, 194, 122), 0, 47, 1);
        const selectorOpacity = this.navigationSelector.addComponent(UIOpacity);
        selectorOpacity.opacity = 232;
        tween(selectorOpacity)
            .repeatForever(tween().to(3.2, { opacity: 255 }, { easing: 'sineInOut' }).to(3.2, { opacity: 224 }, { easing: 'sineInOut' }))
            .start();
        const items: Array<[LobbyPage, string]> = [
            ['home', 'HOME'],
            ['store', 'STORE'],
            ['rank', 'RANK'],
            ['rewards', 'REWARDS'],
            ['account', 'ACCOUNT'],
        ];
        items.forEach(([page, label], index) => {
            const x = -300 + index * 150;
            const selected = page === active;
            const button = this.createPanel(
                `Nav_${page}`,
                nav,
                140,
                126,
                new Color(255, 255, 255, 0),
                x,
                -4,
                30,
            );
            this.navigationButtons.set(page, button);
            const medallion = this.createCirclePanel(
                `NavMedallion_${page}`,
                button,
                selected ? 68 : 62,
                selected ? new Color(255, 223, 133, 238) : new Color(167, 109, 46, 188),
                0,
                18,
            );
            this.createCirclePanel(`NavMedallionInset_${page}`, medallion, selected ? 61 : 55, new Color(77, 11, 24, 255), 0, 0);
            const [iconWidth, iconHeight] = this.navigationIconSize(page, selected);
            const iconNode = this.createSpriteNode(
                `NavIcon_${page}`,
                medallion,
                iconWidth,
                iconHeight,
                0,
                0,
                this.frames.get(this.navigationArtworkKey(page)),
            );
            const iconSprite = iconNode.getComponent(Sprite)!;
            this.navigationIcons.set(page, iconSprite);
            const navLabel = this.createLabel(
                label,
                button,
                selected ? 15 : 14,
                selected ? new Color(255, 239, 185) : new Color(255, 244, 218, 190),
                0,
                -34,
                132,
                30,
                true,
            );
            this.navigationLabels.set(page, navLabel);
            button.addComponent(Button);
            button.on(Button.EventType.CLICK, () => this.transitionTo(page), this);
            this.bindPressMotion(button);
        });
    }

    private updateNavigation(active: LobbyPage): void {
        if (this.navigationSelector?.isValid) {
            const x = this.navigationX(active);
            tween(this.navigationSelector).to(0.26, { position: new Vec3(x, -4, 0) }, { easing: 'quartOut' }).start();
        }
        (['home', 'store', 'rank', 'rewards', 'account'] as LobbyPage[]).forEach((page) => {
            const selected = page === active;
            const icon = this.navigationIcons.get(page);
            if (icon?.node.isValid) {
                const [width, height] = this.navigationIconSize(page, selected);
                icon.node.getComponent(UITransform)?.setContentSize(width, height);
                tween(icon.node).to(0.22, { scale: selected ? new Vec3(1.06, 1.06, 1) : Vec3.ONE }, { easing: 'quartOut' }).start();
            }
            const label = this.navigationLabels.get(page);
            if (label?.node.isValid) {
                label.color = selected ? new Color(255, 239, 185) : new Color(255, 244, 218, 190);
                label.fontSize = selected ? 15 : 14;
            }
        });
    }

    private navigationIconSize(page: LobbyPage, selected: boolean): [number, number] {
        const size = selected ? 54 : 48;
        return [size, size];
    }

    private navigationArtworkKey(page: LobbyPage): string {
        const keys: Record<LobbyPage, string> = {
            home: 'nav-floor-v8',
            store: 'nav-cashier-v8',
            rank: 'nav-rank-v9',
            rewards: 'nav-rewards-v9',
            account: 'nav-account-v8',
        };
        return keys[page];
    }

    private buildAuth(registerMode: boolean): void {
        this.clearCanvas();
        this.createCasinoHallScene(this.node, true);
        const titlePlaque = this.createPanel('AuthTitlePlaque', this.node, 620, 158, new Color(75, 14, 31, 222), 0, 424, 38);
        this.createOutlinePanel('AuthTitleGoldEdge', titlePlaque, 616, 154, new Color(255, 222, 132, 204), 0, 0, 38, 3);
        this.createOutlinePanel('AuthTitleInnerEdge', titlePlaque, 596, 134, new Color(255, 247, 216, 58), 0, 0, 31, 1);
        const titleCoin = this.createSpriteNode('AuthTitleCoin', titlePlaque, 92, 92, -252, 4, this.frames.get('wealth-coin'));
        const titleRuby = this.createSpriteNode('AuthTitleRuby', titlePlaque, 76, 76, 252, 4, this.frames.get('wealth-ruby'));
        this.animateLobbyFeature(titleCoin, 0, 5);
        this.animateLobbyFeature(titleRuby, 1, 6);
        this.createDisplayLabel('ROYAL WEALTH', titlePlaque, 43, new Color(255, 246, 211), 0, 25, 440, 60);
        this.createLabel('SOVEREIGN CASINO MEMBER ACCESS', titlePlaque, 12, new Color(151, 255, 215), 0, -23, 430, 28, true);
        this.createLabel('S07  ·  S08  ·  S09  ·  S10', titlePlaque, 10, new Color(255, 219, 139), 0, -54, 400, 24, true);
        this.animateEntrance(titlePlaque, 0, 0, -10, 0.98);

        const cardHeight = registerMode ? 880 : 690;
        const cardY = registerMode ? -105 : -60;
        this.createOutlinePanel('AuthCardAura', this.node, 642, cardHeight + 16, new Color(255, 204, 88, 58), 0, cardY, 54, 5);
        const card = this.createPanel('AuthCard', this.node, 626, cardHeight, new Color(5, 48, 38, 244), 0, cardY, 48);
        const ornateFrame = this.createSpriteNode('AuthOrnateFrame', card, 650, cardHeight + 24, 0, 0, this.frames.get('panel-fortune-square'));
        const frameOpacity = ornateFrame.addComponent(UIOpacity);
        frameOpacity.opacity = 232;
        const contentGlass = this.createPanel('AuthContentGlass', card, 534, cardHeight - 92, new Color(4, 48, 38, 226), 0, -1, 34);
        this.createPanel('AuthContentGlow', contentGlass, 500, 116, new Color(255, 226, 153, 18), 0, cardHeight / 2 - 116, 28);
        this.createOutlinePanel('AuthContentEdge', contentGlass, 532, cardHeight - 94, new Color(255, 236, 177, 50), 0, 0, 34, 1);
        this.createOutlinePanel('AuthCardOutline', card, 624, cardHeight - 2, new Color(246, 211, 111, 198), 0, 0, 48, 3);
        const cornerChest = this.createSpriteNode('AuthCornerChest', card, 82, 82, -258, cardHeight / 2 - 76, this.frames.get('wealth-chest'));
        const cornerEmerald = this.createSpriteNode('AuthCornerEmerald', card, 64, 64, 260, cardHeight / 2 - 82, this.frames.get('wealth-emerald'));
        this.animateLobbyFeature(cornerChest, 2, 4);
        this.animateLobbyFeature(cornerEmerald, 3, 5);
        const cardOpacity = card.addComponent(UIOpacity);
        cardOpacity.opacity = 0;
        card.setPosition(0, cardY - 18);
        tween(card).to(0.38, { position: new Vec3(0, cardY, 0) }, { easing: 'quartOut' }).start();
        tween(cardOpacity).to(0.24, { opacity: 255 }, { easing: 'quadOut' }).start();

        const tabsY = registerMode ? 327 : cardHeight / 2 - 68;
        const tabs = this.createPanel('AuthTabs', card, 520, 58, new Color(56, 14, 16, 52), 0, tabsY, 20);
        const tabX = registerMode ? 130 : -130;
        this.createPanel('AuthTabUnderline', tabs, 128, 3, new Color(255, 210, 86), tabX, -23, 2);
        const loginTab = this.createLabel('LOGIN', tabs, 14, registerMode ? new Color(255, 255, 255, 156) : new Color(255, 225, 142), -130, 0, 230, 34, true).node;
        const registerTab = this.createLabel('REGISTER', tabs, 14, registerMode ? new Color(255, 225, 142) : new Color(255, 255, 255, 156), 130, 0, 230, 34, true).node;
        this.makeLabelClickable(loginTab, () => this.switchAuth(false));
        this.makeLabelClickable(registerTab, () => this.switchAuth(true));

        const titleY = registerMode ? 253 : cardHeight / 2 - 142;
        this.createDisplayLabel(registerMode ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK', card, 25, new Color(247, 243, 232), 0, titleY, 520, 46);
        this.createLabel(
            registerMode ? 'ENTER THE ROYAL WEALTH CLUB' : 'SIGN IN TO THE PRIVATE CASINO',
            card,
            13,
            new Color(255, 221, 188),
            0,
            titleY - 38,
            500,
            28,
            true,
        );

        const username = this.createInput(card, 'USERNAME', registerMode ? 132 : 90, false);
        const password = this.createInput(card, 'PASSWORD', registerMode ? 34 : -8, true);
        const confirm = registerMode ? this.createInput(card, 'CONFIRM PASSWORD', -64, true) : null;

        if (registerMode) {
            this.createLabel('CHOOSE AVATAR', card, 12, new Color(255, 220, 180), -200, -132, 170, 28, true);
            for (let index = 0; index < 6; index += 1) {
                const selected = this.registerAvatar === index;
                const avatar = this.createCirclePanel(
                    `RegisterAvatar_${index}`,
                    card,
                    selected ? 60 : 54,
                    selected ? new Color(202, 162, 91) : new Color(110, 35, 27),
                    -225 + index * 90,
                    -190,
                );
                this.createSpriteNode('RegisterAvatarImage', avatar, selected ? 52 : 46, selected ? 52 : 46, 0, 0, this.avatarFrame(index));
                avatar.addComponent(Button);
                avatar.on(Button.EventType.CLICK, () => {
                    this.registerAvatar = index;
                    this.switchAuth(true);
                }, this);
                this.bindPressMotion(avatar);
            }
        } else {
            this.createLabel('Demo: player  /  123456', card, 12, new Color(255, 219, 188), 0, -82, 480, 28);
        }

        const message = this.createLabel('', card, 13, new Color(236, 128, 128), 0, registerMode ? -252 : -135, 520, 30, true);
        const buttonY = registerMode ? -316 : -204;
        this.createArtworkButton(
            registerMode ? 'CREATE ACCOUNT' : 'LOGIN',
            card,
            0,
            buttonY,
            430,
            82,
            () => {
                if (registerMode && confirm) this.register(username.string, password.string, confirm.string, message);
                else this.login(username.string, password.string, message);
            },
            'button-primary',
            21,
        );
        const secondaryButton = this.createArtworkButton(
            registerMode ? 'BACK TO LOGIN' : 'PLAY AS GUEST',
            card,
            0,
            buttonY - 92,
            380,
            68,
            () => registerMode ? this.switchAuth(false) : this.guestLogin(),
            'button-secondary',
            16,
            new Color(155, 90, 112),
            Color.WHITE,
        );
        if (!registerMode) this.createSpriteNode('GuestIcon', secondaryButton, 30, 30, -142, 0, this.frames.get('login-guest'));
        if (!registerMode) {
            const create = this.createLabel('NEW HERE?  CREATE AN ACCOUNT', card, 14, new Color(255, 214, 84), 0, -360, 480, 32, true).node;
            this.makeLabelClickable(create, () => this.switchAuth(true));
        }
    }

    private switchAuth(registerMode: boolean): void {
        if (this.isAuthTransitioning) return;
        this.isAuthTransitioning = true;
        const curtain = this.createPanel('AuthTransitionCurtain', this.node, this.viewportWidth, this.viewportHeight, new Color(61, 13, 15), 0, 0, 0);
        const opacity = curtain.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity)
            .to(0.18, { opacity: 236 }, { easing: 'quadIn' })
            .call(() => this.buildAuth(registerMode))
            .start();
    }

    private createInput(parent: Node, placeholder: string, y: number, password: boolean): EditBox {
        const face = new Node(`Input_${placeholder}`);
        parent.addChild(face);
        face.setPosition(0, y);
        this.ensureTransform(face, 520, 78);
        const inputArtwork = this.createSpriteNode('InputArtwork', face, 520, 78, 0, 0, this.frames.get('login-input-box'));
        const inputArtworkOpacity = inputArtwork.addComponent(UIOpacity);
        inputArtworkOpacity.opacity = 246;
        this.createPanel('InputGlass', face, 410, 56, new Color(5, 45, 36, 62), 43, 0, 16);
        const iconRim = this.createCirclePanel('InputIconRim', face, 54, new Color(92, 21, 31, 238), -218, 0);
        this.createCircleOutline('InputIconGoldRing', iconRim, 52, new Color(255, 216, 120, 146), 0, 0, 2);
        const icon = this.createSpriteNode('InputIcon', iconRim, password ? 29 : 27, password ? 25 : 31, 0, 0, this.frames.get(password ? 'login-password' : 'login-user'));
        const editNode = new Node(`Edit_${placeholder}`);
        editNode.active = false;
        face.addChild(editNode);
        // Keep the actual input box centered; the browser text baseline is normalized below.
        editNode.setPosition(38, 0);
        this.ensureTransform(editNode, 400, 58);
        const editBox = editNode.addComponent(EditBox);
        editBox.inputMode = EditBox.InputMode.SINGLE_LINE;
        editBox.inputFlag = password ? EditBox.InputFlag.PASSWORD : EditBox.InputFlag.DEFAULT;
        editBox.maxLength = password ? 32 : 20;
        editNode.active = true;
        const textLabel = editBox.textLabel!;
        const placeholderLabel = editBox.placeholderLabel!;
        textLabel.node.getComponent(UITransform)!.setAnchorPoint(0, 1);
        textLabel.node.getComponent(UITransform)!.setContentSize(400, 58);
        placeholderLabel.node.getComponent(UITransform)!.setAnchorPoint(0, 1);
        placeholderLabel.node.getComponent(UITransform)!.setContentSize(400, 58);
        textLabel.fontSize = 18;
        textLabel.font = this.uiFont;
        textLabel.lineHeight = 22;
        textLabel.color = Color.WHITE;
        textLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        textLabel.verticalAlign = Label.VerticalAlign.CENTER;
        placeholderLabel.fontSize = 15;
        placeholderLabel.font = this.uiFont;
        placeholderLabel.lineHeight = 20;
        placeholderLabel.color = new Color(255, 244, 220, 118);
        placeholderLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        placeholderLabel.verticalAlign = Label.VerticalAlign.CENTER;
        editBox.fontSize = 18;
        editBox.placeholderFontSize = 15;
        editBox.fontColor = Color.WHITE;
        editBox.placeholderFontColor = new Color(255, 244, 220, 118);
        editBox.string = '';
        editBox.placeholder = placeholder;
        textLabel.node.setPosition(-198, 29);
        placeholderLabel.node.setPosition(-198, 29);
        editNode.on(EditBox.EventType.EDITING_DID_BEGAN, () => {
            this.centerNativeInputText();
            Tween.stopAllByTarget(face);
            Tween.stopAllByTarget(icon);
            tween(face).to(0.16, { scale: new Vec3(1.01, 1.01, 1) }, { easing: 'quadOut' }).start();
            tween(icon).to(0.16, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'quartOut' }).start();
        });
        editNode.on(EditBox.EventType.EDITING_DID_ENDED, () => {
            Tween.stopAllByTarget(face);
            Tween.stopAllByTarget(icon);
            tween(face).to(0.18, { scale: Vec3.ONE }, { easing: 'quadOut' }).start();
            tween(icon).to(0.18, { scale: Vec3.ONE }, { easing: 'quadOut' }).start();
        });
        this.scheduleOnce(() => {
            if (!editNode.isValid) return;
            editBox.string = '';
            editBox.placeholder = placeholder;
        }, 0);
        return editBox;
    }

    private centerNativeInputText(): void {
        if (typeof document === 'undefined') return;
        this.scheduleOnce(() => {
            const input = document.activeElement as HTMLInputElement | null;
            if (!input?.classList.contains('cocosEditBox')) return;
            input.style.boxSizing = 'border-box';
            input.style.height = '58px';
            input.style.lineHeight = '58px';
            input.style.paddingTop = '0';
            input.style.paddingBottom = '0';
            input.style.verticalAlign = 'middle';
        }, 0);
    }

    private login(usernameRaw: string, password: string, message: Label): void {
        const username = usernameRaw.trim().toLowerCase();
        if (!username || !password) {
            message.string = 'PLEASE ENTER USERNAME AND PASSWORD';
            this.pulse(message.node, 1.08);
            return;
        }
        const accounts = this.readAccounts();
        const account = accounts[username];
        if (!account || account.password !== password) {
            message.string = 'USERNAME OR PASSWORD IS INCORRECT';
            this.pulse(message.node, 1.08);
            return;
        }
        this.currentUser = account;
        this.persistAccounts(accounts);
        sys.localStorage.setItem(this.sessionKey, username);
        this.buildApp('home');
    }

    private register(usernameRaw: string, password: string, confirm: string, message: Label): void {
        const username = usernameRaw.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,16}$/.test(username)) {
            message.string = 'USERNAME: 3–16 LETTERS, NUMBERS OR _';
            this.pulse(message.node, 1.08);
            return;
        }
        if (password.length < 6) {
            message.string = 'PASSWORD MUST BE AT LEAST 6 CHARACTERS';
            this.pulse(message.node, 1.08);
            return;
        }
        if (password !== confirm) {
            message.string = 'PASSWORDS DO NOT MATCH';
            this.pulse(message.node, 1.08);
            return;
        }
        const accounts = this.readAccounts();
        if (accounts[username]) {
            message.string = 'THIS USERNAME ALREADY EXISTS';
            this.pulse(message.node, 1.08);
            return;
        }
        const account: LobbyAccount = {
            username,
            password,
            coins: 5000,
            avatar: this.registerAvatar,
            createdAt: Date.now(),
        };
        accounts[username] = account;
        this.persistAccounts(accounts);
        sys.localStorage.setItem(this.sessionKey, username);
        this.currentUser = account;
        this.buildApp('home');
    }

    private guestLogin(): void {
        const accounts = this.readAccounts();
        let account = accounts.guest;
        if (!account) {
            account = { username: 'guest', password: '', coins: 3000, avatar: 1, createdAt: Date.now() };
            accounts.guest = account;
            this.persistAccounts(accounts);
        }
        this.currentUser = account;
        sys.localStorage.setItem(this.sessionKey, 'guest');
        this.buildApp('home');
    }

    private logout(): void {
        sys.localStorage.removeItem(this.sessionKey);
        this.currentUser = null;
        this.buildAuth(false);
    }

    private rotateAvatar(): void {
        if (!this.currentUser) return;
        this.currentUser.avatar = (this.currentUser.avatar + 1) % 6;
        const accounts = this.readAccounts();
        accounts[this.currentUser.username] = this.currentUser;
        this.persistAccounts(accounts);
        this.buildApp('account');
        this.showToast('AVATAR UPDATED');
    }

    private claimDailyReward(): void {
        if (!this.currentUser) return;
        if (this.isRewardClaimedToday()) {
            this.showToast('TODAY\'S REWARD IS ALREADY CLAIMED');
            return;
        }
        this.currentUser.coins += 200;
        const accounts = this.readAccounts();
        accounts[this.currentUser.username] = this.currentUser;
        this.persistAccounts(accounts);
        sys.localStorage.setItem(this.rewardStorageKey(), this.todayKey());
        this.buildApp('rewards');
        this.showToast('+200 COINS · DAILY REWARD CLAIMED');
    }

    private purchaseCoinPack(amountLabel: string): void {
        if (!this.currentUser) return;
        const amount = Number.parseInt(amountLabel.replace(/,/g, ''), 10);
        if (!Number.isFinite(amount) || amount <= 0) {
            this.showToast('COIN PACK IS TEMPORARILY UNAVAILABLE');
            return;
        }
        this.currentUser.coins += amount;
        const accounts = this.readAccounts();
        accounts[this.currentUser.username] = this.currentUser;
        this.persistAccounts(accounts);
        this.buildApp('store');
        this.showToast(`+${amountLabel} COINS · DEMO PACK ADDED`);
    }

    private readAccounts(): Record<string, LobbyAccount> {
        const fallback: Record<string, LobbyAccount> = {
            player: { username: 'player', password: '123456', coins: 8800, avatar: 0, createdAt: Date.now() },
        };
        try {
            const raw = sys.localStorage.getItem(this.accountsKey);
            if (!raw) return fallback;
            return { ...fallback, ...(JSON.parse(raw) as Record<string, LobbyAccount>) };
        } catch {
            return fallback;
        }
    }

    private persistAccounts(accounts: Record<string, LobbyAccount>): void {
        sys.localStorage.setItem(this.accountsKey, JSON.stringify(accounts));
    }

    private restoreSession(): LobbyAccount | null {
        const username = sys.localStorage.getItem(this.sessionKey);
        if (!username) return null;
        return this.readAccounts()[username] ?? null;
    }

    private rankEntries(): RankEntry[] {
        const samplesByPeriod: Record<RankPeriod, RankEntry[]> = {
            daily: [
                { name: 'LunaGold', coins: 128500, avatar: 2 },
                { name: 'TigerMax', coins: 110800, avatar: 4 },
                { name: 'RubySpin', coins: 98600, avatar: 3 },
                { name: 'JackpotJoe', coins: 76400, avatar: 1 },
                { name: 'LuckyMia', coins: 65350, avatar: 5 },
                { name: 'ChipMaster', coins: 52200, avatar: 0 },
                { name: 'GoldenAce', coins: 41900, avatar: 4 },
                { name: 'MegaBetty', coins: 33800, avatar: 2 },
            ],
            weekly: [
                { name: 'RubySpin', coins: 742800, avatar: 3 },
                { name: 'JackpotJoe', coins: 698400, avatar: 1 },
                { name: 'LunaGold', coins: 655900, avatar: 2 },
                { name: 'GoldenAce', coins: 604200, avatar: 4 },
                { name: 'TigerMax', coins: 572600, avatar: 4 },
                { name: 'LuckyMia', coins: 526300, avatar: 5 },
                { name: 'MegaBetty', coins: 481700, avatar: 2 },
                { name: 'ChipMaster', coins: 438900, avatar: 0 },
            ],
            all: [
                { name: 'JackpotJoe', coins: 12888600, avatar: 1 },
                { name: 'GoldenAce', coins: 9864200, avatar: 4 },
                { name: 'LunaGold', coins: 8755900, avatar: 2 },
                { name: 'RubySpin', coins: 7642800, avatar: 3 },
                { name: 'MegaBetty', coins: 6537100, avatar: 2 },
                { name: 'TigerMax', coins: 5942600, avatar: 4 },
                { name: 'LuckyMia', coins: 4825300, avatar: 5 },
                { name: 'ChipMaster', coins: 3768900, avatar: 0 },
            ],
        };
        const samples = samplesByPeriod[this.selectedRankPeriod].map((entry) => ({ ...entry }));
        if (this.currentUser) samples.push({
            name: this.currentUser.username,
            coins: this.currentUser.coins * (this.selectedRankPeriod === 'daily' ? 1 : this.selectedRankPeriod === 'weekly' ? 7 : 30),
            avatar: this.currentUser.avatar,
            current: true,
        });
        return samples.sort((left, right) => right.coins - left.coins);
    }

    private createPageTitle(title: string, subtitle: string): void {
        this.createDisplayLabel(title, this.pageRoot, 34, new Color(255, 225, 142), 0, 500, 650, 58);
        this.createLabel(subtitle, this.pageRoot, 13, new Color(255, 255, 255, 180), 0, 458, 620, 28, true);
        const line = this.createPanel('PageTitleLine', this.pageRoot, 220, 4, new Color(255, 198, 39), 0, 432, 2);
        line.setScale(0.1, 1, 1);
        tween(line).to(0.34, { scale: Vec3.ONE }, { easing: 'quartOut' }).start();
    }

    private showToast(text: string): void {
        const old = this.node.getChildByName('Toast');
        if (old) old.destroy();
        const toast = this.createPanel('Toast', this.node, 580, 74, new Color(92, 24, 22, 250), 0, -450, 30);
        this.decorateCasinoCard(toast, 580, 74, 2, false);
        this.createOutlinePanel('ToastOutline', toast, 570, 64, new Color(202, 162, 91, 120), 0, 0, 26, 1);
        this.createCirclePanel('ToastDot', toast, 12, new Color(202, 162, 91), -248, 0);
        this.createLabel(text, toast, 14, Color.WHITE, 18, 0, 500, 44, true);
        const opacity = toast.addComponent(UIOpacity);
        opacity.opacity = 0;
        toast.setScale(0.95, 0.95, 1);
        tween(toast)
            .to(0.2, { scale: Vec3.ONE, position: new Vec3(0, -430, 0) }, { easing: 'quartOut' })
            .delay(1.6)
            .to(0.2, { scale: new Vec3(0.96, 0.96, 1), position: new Vec3(0, -446, 0) }, { easing: 'quadIn' })
            .call(() => toast.destroy())
            .start();
        tween(opacity).to(0.14, { opacity: 255 }, { easing: 'quadOut' }).delay(1.65).to(0.2, { opacity: 0 }, { easing: 'quadIn' }).start();
    }

    private avatarFrame(index: number): SpriteFrame | undefined {
        return this.frames.get(`avatar-${(Math.abs(index) % 6) + 1}`) ?? this.frames.get('avatar-default');
    }

    private todayKey(): string {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    private rewardStorageKey(): string {
        return `${this.rewardKey}:${this.currentUser?.username ?? 'anonymous'}`;
    }

    private isRewardClaimedToday(): boolean {
        return sys.localStorage.getItem(this.rewardStorageKey()) === this.todayKey();
    }

    private hashName(name: string): number {
        return name.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
    }

    private makeLabelClickable(node: Node, handler: () => void): void {
        node.addComponent(Button);
        node.on(Button.EventType.CLICK, handler, this);
        this.bindPressMotion(node);
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

    private decorateCasinoCard(card: Node, width: number, height: number, variant = 0, watermark = false): void {
        const ratio = width / Math.max(1, height);
        const useRichArtwork = card.name.startsWith('StorePack_')
            || card.name.startsWith('Podium_')
            || card.name === 'RankList'
            || card.name === 'ProfileCard';
        if (!useRichArtwork) {
            const washHeight = Math.max(18, Math.round(height * 0.32));
            this.createPanel(
                'CardSoftLight',
                card,
                Math.max(24, width - 12),
                washHeight,
                new Color(255, 225, 155, watermark ? 18 : 12),
                0,
                height / 2 - washHeight / 2 - 6,
                Math.min(20, Math.round(Math.min(width, height) * 0.14)),
            );
            this.createPanel('CardGoldBaseline', card, Math.max(28, width - 34), 1, new Color(255, 214, 104, 64), 0, -height / 2 + 10, 1);
            return;
        }
        const storePackArtwork = Math.abs(variant) % 3 === 0
            ? 'card-fortune-portrait'
            : Math.abs(variant) % 3 === 1
                ? 'panel-fortune-square'
                : 'rank-podium-fortune';
        const artworkKey = card.name.startsWith('StorePack_')
            ? storePackArtwork
            : card.name.startsWith('Podium_')
                ? 'rank-podium-fortune'
                : ratio <= 0.9
                ? 'card-fortune-portrait'
                : ratio >= 3.15
                    ? 'panel-fortune-row'
                    : ratio <= 1.28
                        ? 'panel-fortune-square'
                        : 'panel-fortune-wide';
        const fallbackKey = ratio >= 3.15 ? 'panel-fortune-row' : 'panel-fortune-wide';
        const frame = this.frames.get(artworkKey) ?? this.frames.get(fallbackKey);
        if (!frame) return;
        const artwork = this.createSpriteNode(`FortuneSurface_${artworkKey}`, card, width, height, 0, 0, frame);
        artwork.setSiblingIndex(0);
        const opacity = artwork.addComponent(UIOpacity);
        const denseContent = card.name.startsWith('RankRow_')
            || card.name.startsWith('RewardDay_')
            || card.name.startsWith('AccountMenu_')
            || card.name === 'ProfileStat';
        opacity.opacity = denseContent ? 224 : watermark ? 242 : 246;
        const insetX = ratio >= 3.15 ? 52 : ratio <= 0.9 ? 30 : 38;
        const insetY = ratio >= 3.15 ? 14 : ratio <= 0.9 ? 38 : 28;
        this.createPanel(
            'FortuneContentQuietZone',
            card,
            Math.max(24, width - insetX),
            Math.max(20, height - insetY),
            new Color(63, 10, 14, denseContent ? 64 : 28),
            0,
            0,
            Math.min(22, Math.round(Math.min(width, height) * 0.16)),
        );
        if (watermark || card.name.startsWith('Podium_') || card.name.startsWith('StorePack_')) {
            this.animateSoftImage(artwork, (Math.abs(variant) % 4) * 0.15);
        }
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
        graphics.roundRect(-width / 2 + lineWidth, -height / 2 + lineWidth, width - lineWidth * 2, height - lineWidth * 2, radius);
        graphics.stroke();
        return node;
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

    private createCircleOutline(name: string, parent: Node, diameter: number, color: Color, x: number, y: number, lineWidth: number): Node {
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

    private createSpriteNode(name: string, parent: Node, width: number, height: number, x: number, y: number, frame?: SpriteFrame): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        if (frame) sprite.spriteFrame = frame;
        return node;
    }

    private createLabel(text: string, parent: Node, fontSize: number, color: Color, x: number, y: number, width: number, height: number, bold = false): Label {
        const node = new Node(`Label_${text}`);
        parent.addChild(node);
        node.setPosition(x, y);
        this.ensureTransform(node, width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableWrapText = false;
        label.isBold = bold;
        label.font = bold ? (this.uiFontBold ?? this.uiFont) : this.uiFont;
        return label;
    }

    private createDisplayLabel(text: string, parent: Node, fontSize: number, color: Color, x: number, y: number, width: number, height: number): Label {
        const label = this.createLabel(text, parent, fontSize, color, x, y, width, height, true);
        label.font = this.uiDisplayFont ?? this.uiFontBold ?? this.uiFont;
        label.spacingX = Math.max(0, Math.round(fontSize * 0.04));
        return label;
    }

    private createArtworkButton(
        text: string,
        parent: Node,
        x: number,
        y: number,
        width: number,
        height: number,
        handler: () => void,
        artworkKey: string,
        fontSize: number,
        tint: Color = Color.WHITE,
        textColor: Color = new Color(82, 24, 18),
    ): Node {
        const button = new Node(`ArtworkButton_${text || artworkKey}`);
        parent.addChild(button);
        button.setPosition(x, y);
        this.ensureTransform(button, width, height);
        const isSoftAuth = artworkKey === 'auth-primary' || artworkKey === 'auth-secondary';
        const isPrimary = artworkKey === 'button-primary' || artworkKey === 'button-collect' || artworkKey === 'auth-primary';
        const isDisabled = text === 'CLAIMED TODAY';
        if (isSoftAuth) {
            this.createPanel('AuthButtonShadow', button, width, height, new Color(24, 8, 10, 86), 0, -4, height / 2);
            const face = this.createPanel(
                'AuthButtonFace',
                button,
                width,
                height,
                isPrimary ? new Color(218, 169, 82, 242) : new Color(118, 36, 48, 236),
                0,
                0,
                height / 2,
            );
            this.createPanel(
                'AuthButtonHighlight',
                face,
                width - 18,
                Math.max(12, Math.round(height * 0.34)),
                isPrimary ? new Color(255, 245, 210, 48) : new Color(255, 185, 178, 30),
                0,
                height * 0.2,
                Math.round(height * 0.2),
            );
            this.createOutlinePanel(
                'AuthButtonOutline',
                face,
                width - 2,
                height - 2,
                isPrimary ? new Color(255, 231, 157, 154) : new Color(255, 196, 158, 98),
                0,
                0,
                height / 2,
                1,
            );
            this.createLabel(
                text,
                button,
                fontSize,
                isPrimary ? new Color(75, 35, 21) : Color.WHITE,
                0,
                1,
                width - 42,
                height - 12,
                true,
            );
            this.animateSoftImage(face, (text.length % 3) * 0.12);
            button.addComponent(Button);
            button.on(Button.EventType.CLICK, handler, this);
            this.bindPressMotion(button);
            return button;
        }
        const skinKey = isSoftAuth
            ? isPrimary ? 'button-primary-soft' : 'button-accent-soft'
            : isPrimary ? 'button-gold-fortune' : 'button-ruby-fortune';
        const fallbackKey = isPrimary ? 'button-primary-soft' : 'button-accent-soft';
        const skinFrame = this.frames.get(skinKey) ?? this.frames.get(fallbackKey);
        const shadow = this.createSpriteNode('ArtworkButtonImageShadow', button, width, height, 0, -4, skinFrame);
        shadow.getComponent(Sprite)!.color = new Color(35, 20, 16, 170);
        const shadowOpacity = shadow.addComponent(UIOpacity);
        shadowOpacity.opacity = 82;
        const face = this.createSpriteNode('ArtworkButtonImage', button, width, height, 0, 0, skinFrame);
        const faceOpacity = face.addComponent(UIOpacity);
        faceOpacity.opacity = isDisabled ? 145 : 248;
        if (!isDisabled) this.animateSoftImage(face, (text.length % 4) * 0.18);
        if (text) this.createLabel(
            text,
            button,
            fontSize,
            isPrimary ? new Color(63, 37, 20) : new Color(255, 249, 231),
            0,
            1,
            Math.max(80, width - 48),
            height - 12,
            true,
        );
        button.addComponent(Button);
        button.on(Button.EventType.CLICK, handler, this);
        this.bindPressMotion(button);
        return button;
    }

    private createTextButton(
        text: string,
        parent: Node,
        x: number,
        y: number,
        width: number,
        height: number,
        handler: () => void,
        color: Color,
        fontSize: number,
    ): Node {
        const rim = new Node(`ImageButton_${text}`);
        parent.addChild(rim);
        rim.setPosition(x, y);
        this.ensureTransform(rim, width, height);
        const face = this.createSpriteNode(`ButtonImage_${text}`, rim, width, height, 0, 0, this.frames.get('button-gold-fortune') ?? this.frames.get('button-primary-soft'));
        this.createLabel(text, rim, fontSize, new Color(91, 38, 21), 0, 0, width - 10, height - 8, true);
        this.animateSoftImage(face, 0.1);
        rim.addComponent(Button);
        rim.on(Button.EventType.CLICK, handler, this);
        this.bindPressMotion(rim);
        return rim;
    }

    private animateEntrance(
        node: Node,
        index = 0,
        xOffset = 0,
        yOffset = -10,
        startScale = 0.97,
    ): void {
        const finalPosition = node.position.clone();
        const delay = Math.min(0.32, index * 0.055);
        const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        this.entranceNodes.add(node);
        opacity.opacity = 0;
        node.setPosition(finalPosition.x + xOffset, finalPosition.y + yOffset, finalPosition.z);
        node.setScale(startScale, startScale, 1);
        tween(node)
            .delay(delay)
            .to(0.32, { position: finalPosition, scale: Vec3.ONE }, { easing: 'quartOut' })
            .call(() => this.entranceNodes.delete(node))
            .start();
        tween(opacity)
            .delay(delay)
            .to(0.22, { opacity: 255 }, { easing: 'quadOut' })
            .start();
    }

    private animateSoftImage(node: Node, delay: number): void {
        const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        tween(node)
            .delay(delay)
            .repeatForever(
                tween()
                    .to(3.4, { scale: new Vec3(1.006, 1.006, 1) }, { easing: 'sineInOut' })
                    .to(3.4, { scale: Vec3.ONE }, { easing: 'sineInOut' }),
            )
            .start();
        tween(opacity)
            .delay(delay)
            .repeatForever(
                tween()
                    .to(3.1, { opacity: 255 }, { easing: 'sineInOut' })
                    .to(3.1, { opacity: 247 }, { easing: 'sineInOut' }),
            )
            .start();
    }

    private createAmbientGoldDust(parent: Node, count: number): void {
        const spots = [
            [-318, 420], [292, 352], [-276, 188], [326, 78], [-330, -86], [300, -228],
            [-258, -404], [236, -478], [-132, 510], [146, 438], [-78, -318], [92, 236],
        ];
        for (let index = 0; index < Math.min(count, spots.length); index += 1) {
            const [x, y] = spots[index];
            const size = 5 + (index % 4) * 2;
            const dust = this.createCirclePanel(`AmbientGoldDust_${index}`, parent, size, new Color(255, 220, 137, 180), x, y);
            const opacity = dust.addComponent(UIOpacity);
            opacity.opacity = 32 + (index % 3) * 18;
            const duration = 5 + (index % 5) * 0.7;
            const travel = 12 + (index % 4) * 4;
            dust.setScale(0.7, 0.7, 1);
            tween(dust)
                .delay(index * 0.22)
                .repeatForever(
                    tween()
                        .to(duration, { position: new Vec3(x + (index % 2 === 0 ? 5 : -5), y + travel, 0), scale: new Vec3(1.05, 1.05, 1) }, { easing: 'sineInOut' })
                        .to(duration, { position: new Vec3(x, y, 0), scale: new Vec3(0.7, 0.7, 1) }, { easing: 'sineInOut' }),
                )
                .start();
            tween(opacity)
                .delay(index * 0.18)
                .repeatForever(
                    tween()
                        .to(duration * 0.8, { opacity: 112 }, { easing: 'sineInOut' })
                        .to(duration * 0.8, { opacity: 28 }, { easing: 'sineInOut' }),
                )
                .start();
        }
    }

    private bindPressMotion(node: Node): void {
        node.on(Node.EventType.TOUCH_START, () => {
            if (this.entranceNodes.has(node)) return;
            Tween.stopAllByTarget(node);
            tween(node).to(0.09, { scale: new Vec3(0.97, 0.97, 1) }, { easing: 'quadOut' }).start();
        });
        const release = () => {
            if (this.entranceNodes.has(node)) return;
            Tween.stopAllByTarget(node);
            tween(node).to(0.2, { scale: Vec3.ONE }, { easing: 'quartOut' }).start();
        };
        node.on(Node.EventType.TOUCH_END, release);
        node.on(Node.EventType.TOUCH_CANCEL, release);
    }

    private pulse(node: Node, scale = 1.06): void {
        Tween.stopAllByTarget(node);
        tween(node).to(0.1, { scale: new Vec3(scale, scale, 1) }, { easing: 'quadOut' }).to(0.2, { scale: Vec3.ONE }, { easing: 'quartOut' }).start();
    }

    private ensureTransform(node: Node, width: number, height: number): UITransform {
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        return transform;
    }

    private coverViewportSize(sourceRatio: number): [number, number] {
        const targetRatio = this.viewportWidth / Math.max(1, this.viewportHeight);
        if (targetRatio >= sourceRatio) return [this.viewportWidth, this.viewportWidth / sourceRatio];
        return [this.viewportHeight * sourceRatio, this.viewportHeight];
    }

}
