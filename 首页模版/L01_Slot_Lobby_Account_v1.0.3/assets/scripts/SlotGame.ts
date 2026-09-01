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
    tween,
    Tween,
    UITransform,
    UIOpacity,
    Vec3,
    view,
} from 'cc';

const { ccclass } = _decorator;

type LobbyPage = 'home' | 'store' | 'rank' | 'rewards' | 'account';
type GameCategory = 'all' | 'line' | 'ways' | 'megaways';
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
    private readonly accountsKey = 'slot-lobby-template-accounts-v1';
    private readonly sessionKey = 'slot-lobby-template-session-v1';
    private readonly rewardKey = 'slot-lobby-template-daily-reward-v1';
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
    private navigationIcons = new Map<LobbyPage, Sprite>();
    private navigationLabels = new Map<LobbyPage, Label>();
    private entranceNodes = new WeakSet<Node>();
    private currentPage: LobbyPage = 'home';
    private isTransitioning = false;
    private isAuthTransitioning = false;
    private registerAvatar = 0;
    private selectedCategory: GameCategory = 'all';
    private selectedRankPeriod: RankPeriod = 'daily';

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
            ['background', 'lobby/v5/lobby-background-v5/spriteFrame'],
            ['banner', 'lobby/v5/lobby-banner-v5/spriteFrame'],
            ['game-golden-chest', 'lobby/v5/game-golden-chest-v5/spriteFrame'],
            ['game-ruby-vault', 'lobby/v5/game-ruby-vault-v5/spriteFrame'],
            ['game-emerald-fortune', 'lobby/v5/game-emerald-fortune-v5/spriteFrame'],
            ['game-coin-fountain', 'lobby/v5/game-coin-fountain-v5/spriteFrame'],
            ['treasure-chest-emblem', 'lobby/v7/treasure-chest-emblem-soft-v7/spriteFrame'],
            ['coin-emblem', 'lobby/v7/coin-emblem-soft-v7/spriteFrame'],
            ['store-page-background', 'lobby/v6/store-background-v6/spriteFrame'],
            ['rank-page-background', 'lobby/v6/rank-background-v6/spriteFrame'],
            ['rewards-page-background', 'lobby/v6/rewards-background-v6/spriteFrame'],
            ['account-page-background', 'lobby/v6/account-background-v6/spriteFrame'],
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
            ['login-background', 'lobby/v6/auth-background-v6/spriteFrame'],
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

    private buildBackground(): void {
        const [width, height] = this.coverViewportSize(2 / 3);
        const background = this.createSpriteNode('LobbyBackground', this.node, width * 1.06, height * 1.06, 0, 0, this.frames.get('background'));
        background.setScale(1.015, 1.015, 1);
        tween(background)
            .repeatForever(
                tween()
                    .to(10.5, { position: new Vec3(-5, 6, 0), scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' })
                    .to(10.5, { position: new Vec3(5, -5, 0), scale: new Vec3(1.015, 1.015, 1) }, { easing: 'sineInOut' }),
            )
            .start();
        this.createPanel('LobbyWarmWash', this.node, this.viewportWidth, this.viewportHeight, new Color(123, 42, 24, 18), 0, 0, 0);
        this.createPanel('LobbyShade', this.node, this.viewportWidth, this.viewportHeight, new Color(59, 13, 13, 28), 0, 0, 0);
        this.createAmbientGoldDust(this.node, 12);
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
            const pageBackgroundKey = page === 'store'
                ? 'store-page-background'
                : page === 'rank'
                    ? 'rank-page-background'
                    : page === 'rewards'
                        ? 'rewards-page-background'
                        : 'account-page-background';
            const pageBackdrop = this.createSpriteNode('PageBackdrop', this.pageRoot, 724, 1086, 0, 0, this.frames.get(pageBackgroundKey));
            const backdropOpacity = pageBackdrop.addComponent(UIOpacity);
            backdropOpacity.opacity = 182;
            pageBackdrop.setScale(1.015, 1.015, 1);
            tween(pageBackdrop)
                .repeatForever(
                    tween()
                        .to(9.5, { position: new Vec3(0, 4, 0), scale: new Vec3(1.03, 1.03, 1) }, { easing: 'sineInOut' })
                        .to(9.5, { position: new Vec3(0, -4, 0), scale: new Vec3(1.015, 1.015, 1) }, { easing: 'sineInOut' }),
                )
                .start();
            this.createPanel('PageSurface', this.pageRoot, 724, 1030, new Color(73, 17, 17, page === 'rank' ? 108 : 92), 0, 0, 34);
            this.createOutlinePanel('PageSurfaceOutline', this.pageRoot, 722, 1028, new Color(231, 191, 104, 100), 0, 0, 34, 1);
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
        this.createPanel('HeaderShadow', this.node, headerWidth, 118, new Color(67, 16, 13, 72), 0, 558, 0);
        const header = this.createPanel('Header', this.node, headerWidth, 112, new Color(83, 24, 22, 226), 0, 568, 0);
        this.createPanel('HeaderWarmGlow', header, headerWidth, 52, new Color(192, 72, 38, 24), 0, 24, 0);
        this.createPanel('HeaderTopLine', header, headerWidth, 2, new Color(255, 225, 142, 98), 0, 54, 0);
        this.createPanel('HeaderBottomLine', header, headerWidth, 3, new Color(255, 199, 64, 176), 0, -54, 0);

        const avatarButton = this.createCirclePanel('HeaderAvatarRim', header, 76, new Color(202, 162, 91, 255), -294, 0);
        this.createCirclePanel('HeaderAvatarInset', avatarButton, 70, new Color(255, 239, 207, 255), 0, 0);
        this.createSpriteNode('HeaderAvatar', avatarButton, 64, 64, 0, 0, this.avatarFrame(user.avatar));
        avatarButton.addComponent(Button);
        avatarButton.on(Button.EventType.CLICK, () => this.transitionTo('account'), this);
        this.bindPressMotion(avatarButton);

        this.createLabel(user.username.toUpperCase(), header, 20, new Color(244, 240, 228), -178, 13, 210, 34, true);
        this.createLabel('HIGH ROLLER MEMBER', header, 10, new Color(255, 220, 154, 230), -178, -18, 210, 22, true);

        const coinPill = this.createPanel('CoinBar', header, 248, 60, new Color(112, 37, 24, 244), 198, 0, 22);
        this.createOutlinePanel('CoinBarOutline', coinPill, 246, 58, new Color(202, 162, 91, 82), 0, 0, 22, 1);
        const headerCoin = this.createSpriteNode('HeaderCoin', coinPill, 42, 42, -98, 0, this.frames.get('coin-emblem'));
        this.animateSoftImage(headerCoin, 0.35);
        this.createLabel(user.coins.toLocaleString('en-US'), coinPill, 22, new Color(244, 240, 228), -2, 0, 130, 40, true);
        this.createTextButton('ADD', coinPill, 92, 0, 52, 36, () => this.transitionTo('store'), new Color(193, 144, 64), 11);
    }

    private buildHomePage(): void {
        const bannerRim = this.createPanel('BannerRim', this.pageRoot, 716, 268, new Color(100, 32, 21, 255), 0, 350, 26);
        this.createOutlinePanel('BannerOutline', bannerRim, 714, 266, new Color(231, 191, 104, 170), 0, 0, 26, 2);
        const banner = this.createSpriteNode('PromoBanner', bannerRim, 704, 256, 0, 0, this.frames.get('banner'));
        this.createPanel('BannerCopyShade', banner, 390, 256, new Color(91, 20, 20, 132), -157, 0, 0);
        this.createLabel('FEATURED JACKPOT', banner, 11, new Color(255, 222, 150), -202, 66, 230, 24, true);
        this.createDisplayLabel('TREASURE RUSH', banner, 28, new Color(255, 249, 233), -151, 27, 330, 44);
        this.createLabel('Coins, chests & lucky reels', banner, 13, new Color(255, 227, 190), -152, -13, 330, 26);
        const explore = new Node('BannerExplore');
        banner.addChild(explore);
        explore.setPosition(-205, -66);
        this.ensureTransform(explore, 154, 42);
        const exploreFace = this.createSpriteNode('BannerExploreImage', explore, 154, 42, 0, 0, this.frames.get('button-gold-fortune'));
        this.createLabel('EXPLORE', explore, 12, new Color(91, 38, 21), 0, 0, 130, 28, true);
        explore.addComponent(Button);
        explore.on(Button.EventType.CLICK, () => this.showToast('FEATURED COLLECTION SELECTED'), this);
        this.bindPressMotion(explore);
        this.animateSoftImage(exploreFace, 0.25);
        const bannerOpacity = banner.addComponent(UIOpacity);
        bannerOpacity.opacity = 0;
        banner.setScale(0.985, 0.985, 1);
        tween(banner).to(0.3, { scale: Vec3.ONE }, { easing: 'quartOut' }).start();
        tween(bannerOpacity).to(0.2, { opacity: 255 }, { easing: 'quadOut' }).start();
        this.scheduleOnce(() => {
            if (!banner.isValid) return;
            tween(banner)
                .repeatForever(
                    tween()
                        .to(6.4, { position: new Vec3(-3, 1, 0), scale: new Vec3(1.008, 1.008, 1) }, { easing: 'sineInOut' })
                        .to(6.4, { position: new Vec3(3, -1, 0), scale: Vec3.ONE }, { easing: 'sineInOut' }),
                )
                .start();
        }, 0.45);
        const bannerSheen = this.createPanel('BannerGoldSheen', banner, 54, 256, new Color(255, 230, 154, 28), -325, 0, 8);
        bannerSheen.setRotationFromEuler(0, 0, -12);
        bannerSheen.setSiblingIndex(1);
        tween(bannerSheen)
            .repeatForever(tween().delay(1.8).to(2.2, { position: new Vec3(330, 0, 0) }, { easing: 'sineInOut' }).delay(3.4).call(() => bannerSheen.setPosition(-325, 0)))
            .start();

        this.createDisplayLabel('TREASURE GAMES', this.pageRoot, 20, new Color(255, 225, 142), -210, 183, 300, 40);

        const categories: Array<[GameCategory, string, number, number]> = [
            ['all', 'ALL', -248, 112],
            ['line', 'LINES', -88, 138],
            ['ways', 'WAYS', 88, 138],
            ['megaways', 'MEGAWAYS', 260, 172],
        ];
        categories.forEach(([category, text, x, width]) => {
            const selected = category === this.selectedCategory;
            const chip = new Node(`Category_${category}`);
            this.pageRoot.addChild(chip);
            chip.setPosition(x, 137);
            this.ensureTransform(chip, width, 48);
            const chipFace = this.createSpriteNode('CategoryImage', chip, width, 48, 0, 0, this.frames.get(selected ? 'button-gold-fortune' : 'button-ruby-fortune'));
            const chipOpacity = chipFace.addComponent(UIOpacity);
            chipOpacity.opacity = selected ? 255 : 205;
            this.createLabel(text, chip, 12, selected ? new Color(91, 38, 21) : new Color(255, 246, 225), 0, 0, width - 18, 30, true);
            chip.addComponent(Button);
            chip.on(Button.EventType.CLICK, () => this.selectCategory(category), this);
            this.bindPressMotion(chip);
            if (selected) this.animateSoftImage(chipFace, 0.1);
        });

        const games = [
            { key: 'game-golden-chest', category: 'line' as GameCategory, tag: 'COINS', color: new Color(193, 113, 28) },
            { key: 'game-ruby-vault', category: 'megaways' as GameCategory, tag: 'JACKPOT', color: new Color(172, 48, 55) },
            { key: 'game-emerald-fortune', category: 'ways' as GameCategory, tag: 'WAYS', color: new Color(35, 137, 91) },
            { key: 'game-coin-fountain', category: 'line' as GameCategory, tag: 'HOT', color: new Color(208, 91, 45) },
        ];
        const visibleGames = this.selectedCategory === 'all' ? games : games.filter((game) => game.category === this.selectedCategory);
        const positions = visibleGames.length === 1
            ? [{ x: 0, y: -185 }]
            : visibleGames.length === 2
                ? [{ x: -128, y: -185 }, { x: 128, y: -185 }]
                : [{ x: -128, y: -45 }, { x: 128, y: -45 }, { x: -128, y: -351 }, { x: 128, y: -351 }];
        visibleGames.forEach((game, index) => this.createGameCard(game.key, positions[index].x, positions[index].y, game.tag, game.color, index));
    }

    private selectCategory(category: GameCategory): void {
        if (category === this.selectedCategory || this.currentPage !== 'home' || this.isTransitioning) return;
        this.selectedCategory = category;
        this.refreshCurrentPage('home');
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
        this.createPageTitle('CASINO CASHIER', 'BUY-IN COINS · BONUS PACKS');

        const offer = this.createPanel('StoreVipOffer', this.pageRoot, 600, 128, new Color(111, 36, 27, 220), 0, 330, 28);
        const offerArt = this.createSpriteNode('StoreVipOfferArt', offer, 600, 128, 0, 0, this.frames.get('button-ruby-fortune'));
        const offerOpacity = offerArt.addComponent(UIOpacity);
        offerOpacity.opacity = 218;
        this.createCirclePanel('StoreOfferGlow', offer, 92, new Color(255, 184, 55, 52), -238, 0);
        const offerChest = this.createSpriteNode('StoreOfferChest', offer, 104, 104, -238, -2, this.frames.get('treasure-chest-emblem'));
        this.animateSoftImage(offerChest, 0.14);
        this.createLabel('VIP FORTUNE WEEK', offer, 18, Color.WHITE, -56, 24, 260, 30, true);
        this.createLabel('EXTRA COINS ON SELECTED JACKPOT PACKS', offer, 10, new Color(255, 225, 142), -42, -14, 300, 24, true);
        this.createArtworkButton('VIEW +20%', offer, 212, 0, 142, 44, () => this.showToast('VIP FORTUNE WEEK · SELECT A BONUS PACK'), 'button-primary', 11);

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
        priceButton.on(Button.EventType.CLICK, () => this.showToast(`${amount} COINS · BILLING CONNECTION REQUIRED`), this);
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
        this.createPageTitle('LUCKY REWARDS', 'DAILY BONUS · BUILD YOUR WIN STREAK');
        const chest = this.createCirclePanel('RewardChestGlow', this.pageRoot, 264, new Color(171, 62, 30, 110), 0, 288);
        this.createCircleOutline('RewardRing1', chest, 228, new Color(202, 162, 91, 150), 0, 0, 3);
        this.createCircleOutline('RewardRing2', chest, 184, new Color(255, 255, 255, 72), 0, 0, 2);
        const gift = this.createSpriteNode('RewardGiftImage', chest, 216, 216, 0, -4, this.frames.get('treasure-chest-emblem'));
        const giftOpacity = gift.addComponent(UIOpacity);
        giftOpacity.opacity = 248;
        chest.addComponent(Button);
        chest.on(Button.EventType.CLICK, () => this.showToast('TREASURE CHEST · DAILY JACKPOT REWARDS'), this);
        this.bindPressMotion(chest);
        this.animateEntrance(chest, 0, 0, -12, 0.96);
        tween(gift)
            .repeatForever(
                tween()
                    .to(4.4, { position: new Vec3(0, 2, 0), scale: new Vec3(1.012, 1.012, 1) }, { easing: 'sineInOut' })
                    .to(4.4, { position: new Vec3(0, -2, 0), scale: Vec3.ONE }, { easing: 'sineInOut' }),
            )
            .start();

        this.createLabel('7-DAY JACKPOT STREAK', this.pageRoot, 24, Color.WHITE, 0, 112, 500, 44, true);
        const rewards = [100, 150, 200, 250, 300, 400, 800];
        rewards.forEach((amount, index) => {
            const x = index < 4 ? -270 + index * 180 : -180 + (index - 4) * 180;
            const y = index < 4 ? 5 : -125;
            const claimed = index < 2;
            const cell = this.createPanel(
                `RewardDay_${index + 1}`,
                this.pageRoot,
                index === 6 ? 170 : 150,
                108,
                claimed ? new Color(78, 23, 23, 222) : index === 2 ? new Color(139, 44, 27, 250) : new Color(91, 25, 24, 242),
                x,
                y,
                24,
            );
            this.decorateCasinoCard(cell, index === 6 ? 170 : 150, 108, index, false);
            this.createOutlinePanel('RewardOutline', cell, (index === 6 ? 170 : 150) - 8, 100, index === 2 ? new Color(225, 190, 117) : new Color(202, 162, 91, 70), 0, 0, 20, index === 2 ? 2 : 1);
            this.createLabel(`DAY ${index + 1}`, cell, 12, new Color(225, 190, 117), 0, 29, 120, 24, true);
            const statusIcon = this.createSpriteNode(
                'RewardStatusImage',
                cell,
                claimed ? 34 : 28,
                claimed ? 34 : 28,
                -34,
                -10,
                this.frames.get('coin-emblem'),
            );
            if (index === 2) this.animateSoftImage(statusIcon, 0.2);
            this.createLabel(`${amount}`, cell, 18, Color.WHITE, 24, -10, 70, 34, true);
            cell.addComponent(Button);
            cell.on(Button.EventType.CLICK, () => this.showToast(`DAY ${index + 1} · ${amount} COINS`), this);
            this.bindPressMotion(cell);
            this.animateEntrance(cell, index + 1, 0, -8, 0.975);
        });

        const claimedToday = this.isRewardClaimedToday();
        const rewardButton = this.createArtworkButton(
            claimedToday ? 'CLAIMED TODAY' : 'CLAIM +200',
            this.pageRoot,
            0,
            -245,
            claimedToday ? 300 : 270,
            claimedToday ? 68 : 104,
            () => this.claimDailyReward(),
            claimedToday ? 'button-wide' : 'button-collect',
            claimedToday ? 16 : 18,
            claimedToday ? new Color(150, 150, 150) : Color.WHITE,
            claimedToday ? Color.WHITE : new Color(75, 12, 16),
        );
        if (!claimedToday) this.createLabel('TODAY', rewardButton, 10, new Color(4, 24, 28, 180), 0, 29, 90, 20, true);
        this.createLabel('NEXT REWARD REFRESHES AT MIDNIGHT', this.pageRoot, 12, new Color(255, 255, 255, 170), 0, -312, 500, 26, true);

        const quests = this.createPanel('QuestPanel', this.pageRoot, 650, 160, new Color(96, 30, 25, 230), 0, -410, 30);
        this.decorateCasinoCard(quests, 650, 160, 1, true);
        this.createOutlinePanel('QuestPanelOutline', quests, 648, 158, new Color(202, 162, 91, 50), 0, 0, 30, 1);
        this.createLabel('CASINO MISSIONS', quests, 17, Color.WHITE, -170, 58, 270, 32, true);
        [['PLAY 3 GAMES', '1 / 3', 0.34], ['WIN ANY SLOT', 'READY', 1]].forEach((item, index) => {
            const y = 8 - index * 62;
            this.createLabel(item[0] as string, quests, 13, Color.WHITE, -170, y + 16, 260, 26, true);
            const track = this.createPanel(`QuestTrack_${index}`, quests, 360, 18, new Color(50, 12, 15, 230), -45, y - 18, 9);
            const progressWidth = 346 * (item[2] as number);
            const progress = this.createPanel(`QuestProgress_${index}`, track, progressWidth, 12, new Color(255, 193, 38), -173 + progressWidth / 2, 0, 6);
            progress.setScale(0.06, 1, 1);
            tween(progress).delay(0.18 + index * 0.08).to(0.42, { scale: Vec3.ONE }, { easing: 'quartOut' }).start();
            this.createLabel(item[1] as string, quests, 14, new Color(255, 218, 83), 245, y, 100, 30, true);
        });
    }

    private buildAccountPage(): void {
        const user = this.currentUser!;
        this.createPageTitle('PLAYER PROFILE', 'VIP LEVEL · JACKPOT STATS · SECURITY');
        const profile = this.createPanel('ProfileCard', this.pageRoot, 650, 372, new Color(105, 33, 27, 232), 0, 238, 36);
        this.decorateCasinoCard(profile, 650, 372, 0, true);
        this.createOutlinePanel('ProfileOutline', profile, 648, 370, new Color(202, 162, 91, 82), 0, 0, 36, 1);
        this.createPanel('ProfileAccent', profile, 4, 166, new Color(202, 162, 91), -308, 62, 2);
        const avatar = this.createCirclePanel('ProfileAvatarRim', profile, 144, new Color(202, 162, 91), -218, 58);
        this.createCirclePanel('ProfileAvatarInset', avatar, 132, new Color(255, 235, 199), 0, 0);
        this.createSpriteNode('ProfileAvatar', avatar, 124, 124, 0, 0, this.avatarFrame(user.avatar));
        this.createLabel(user.username.toUpperCase(), profile, 27, Color.WHITE, 72, 103, 350, 44, true);
        this.createLabel('GOLD HIGH ROLLER', profile, 13, new Color(225, 190, 117), 72, 66, 350, 27, true);
        this.createLabel(`VIP-${Math.abs(this.hashName(user.username)).toString().padStart(6, '0').slice(0, 6)}`, profile, 13, new Color(255, 255, 255, 178), 82, 30, 225, 25);
        this.createArtworkButton('CHANGE AVATAR', profile, 73, -24, 220, 55, () => this.rotateAvatar(), 'button-small', 12);

        const stats = [
            { label: 'BALANCE', value: user.coins.toLocaleString('en-US'), frame: 'coin-emblem' },
            { label: 'GAMES PLAYED', value: '24', frame: 'account-info-3' },
            { label: 'BEST JACKPOT', value: '3,500', frame: 'account-info-4' },
        ];
        stats.forEach((stat, index) => {
            const statCard = this.createPanel('ProfileStat', profile, 184, 92, new Color(117, 45, 35, 118), -202 + index * 202, -118, 22);
            this.decorateCasinoCard(statCard, 184, 92, index, false);
            this.createSpriteNode('ProfileStatIcon', statCard, 34, 34, -60, 12, this.frames.get(stat.frame));
            this.createLabel(stat.value, statCard, 20, new Color(225, 190, 117), 24, 13, 112, 30, true);
            this.createLabel(stat.label, statCard, 10, new Color(255, 255, 255, 165), 0, -24, 155, 22, true);
        });
        this.animateEntrance(profile, 0, 0, -10, 0.975);

        const accountActions = [
            { name: 'INBOX', subtitle: '3 NEW MESSAGES', icon: 'account-inbox', title: 'account-inbox-title', x: -165 },
            { name: 'ACHIEVEMENTS', subtitle: '12 / 36 UNLOCKED', icon: 'account-info-7', title: 'account-achievement-title', x: 165 },
        ];
        accountActions.forEach((action, index) => {
            const actionCard = this.createPanel(`AccountAction_${action.name}`, this.pageRoot, 310, 142, new Color(108, 34, 28, 232), action.x, -68, 30);
            this.decorateCasinoCard(actionCard, 310, 142, index + 1, false);
            this.createOutlinePanel('AccountActionOutline', actionCard, 300, 132, new Color(202, 162, 91, 62), 0, 0, 26, 1);
            const icon = this.createSpriteNode('AccountActionIcon', actionCard, index === 0 ? 72 : 62, index === 0 ? 68 : 62, -98, 8, this.frames.get(action.icon));
            this.createLabel(action.name, actionCard, 17, Color.WHITE, 45, 23, 180, 30, true);
            this.createLabel(action.subtitle, actionCard, 10, new Color(225, 190, 117), 45, -27, 180, 22, true);
            actionCard.addComponent(Button);
            actionCard.on(Button.EventType.CLICK, () => this.showToast(`${action.name} PANEL READY TO CONNECT`), this);
            this.bindPressMotion(actionCard);
            this.animateEntrance(actionCard, index + 1, 0, -10, 0.975);
        });

        const settings = this.createPanel('AccountSettings', this.pageRoot, 650, 264, new Color(94, 29, 25, 232), 0, -288, 34);
        this.decorateCasinoCard(settings, 650, 264, 2, true);
        this.createOutlinePanel('AccountSettingsOutline', settings, 648, 262, new Color(202, 162, 91, 46), 0, 0, 34, 1);
        this.createLabel('VIP PLAYER CENTER', settings, 15, new Color(225, 190, 117), -213, 106, 190, 28, true);
        const menuItems = [
            { label: 'SOUND', value: 'ON', icon: 'account-info-1' },
            { label: 'NOTIFICATIONS', value: 'ON', icon: 'account-info-2' },
            { label: 'SECURITY', value: 'SAFE', icon: 'account-info-5' },
            { label: 'SUPPORT', value: 'OPEN', icon: 'account-info-8' },
        ];
        menuItems.forEach((item, index) => {
            const x = index % 2 === 0 ? -158 : 158;
            const y = index < 2 ? 42 : -70;
            const menu = this.createPanel(`AccountMenu_${item.label}`, settings, 292, 96, new Color(121, 49, 38, 98), x, y, 24);
            this.decorateCasinoCard(menu, 292, 96, index, false);
            this.createSpriteNode('AccountMenuIcon', menu, 48, 48, -104, 0, this.frames.get(item.icon));
            this.createLabel(item.label, menu, 13, Color.WHITE, 0, 13, 150, 26, true);
            this.createLabel(item.value, menu, 10, new Color(225, 190, 117), 0, -18, 150, 22, true);
            menu.addComponent(Button);
            menu.on(Button.EventType.CLICK, () => this.showToast(`${item.label} SETTINGS READY`), this);
            this.bindPressMotion(menu);
        });
        this.animateEntrance(settings, 3, 0, -10, 0.98);

        this.createArtworkButton('LOG OUT', this.pageRoot, 0, -468, 230, 52, () => this.logout(), 'auth-secondary', 13, new Color(255, 178, 178), Color.WHITE);
    }

    private buildNavigation(active: LobbyPage): void {
        this.createPanel('NavigationShadow', this.node, this.viewportWidth, 146, new Color(70, 16, 12, 112), 0, -610, 0);
        const nav = this.createPanel('Navigation', this.node, this.viewportWidth, 138, new Color(95, 28, 20, 248), 0, -603, 0);
        this.navigationRoot = nav;
        this.createPanel('NavigationGoldLine', nav, this.viewportWidth, 1, new Color(202, 162, 91, 96), 0, 68, 0);
        this.navigationSelector = this.createSpriteNode('NavigationSelector', nav, 116, 94, this.navigationX(active), -2, this.frames.get('nav-selector-soft'));
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
                112,
                new Color(255, 255, 255, 0),
                x,
                -4,
                30,
            );
            const [iconWidth, iconHeight] = this.navigationIconSize(page, selected);
            const iconNode = this.createSpriteNode(
                `NavIcon_${page}`,
                button,
                iconWidth,
                iconHeight,
                0,
                -1,
                this.frames.get(`nav-${page}-${selected ? 'selected' : 'normal'}`),
            );
            const iconSprite = iconNode.getComponent(Sprite)!;
            this.navigationIcons.set(page, iconSprite);
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
                icon.spriteFrame = this.frames.get(`nav-${page}-${selected ? 'selected' : 'normal'}`) ?? null;
                const [width, height] = this.navigationIconSize(page, selected);
                icon.node.getComponent(UITransform)?.setContentSize(width, height);
                tween(icon.node).to(0.22, { scale: selected ? new Vec3(1.04, 1.04, 1) : Vec3.ONE }, { easing: 'quartOut' }).start();
            }
            const label = this.navigationLabels.get(page);
            if (label?.node.isValid) label.color = selected ? Color.WHITE : new Color(255, 255, 255, 150);
        });
    }

    private navigationIconSize(page: LobbyPage, selected: boolean): [number, number] {
        const normalRatios: Record<LobbyPage, number> = { home: 126 / 161, store: 121 / 161, rank: 131 / 161, rewards: 168 / 161, account: 169 / 155 };
        const selectedRatios: Record<LobbyPage, number> = { home: 130 / 168, store: 128 / 168, rank: 174 / 181, rewards: 178 / 165, account: 169 / 163 };
        const height = selected ? 68 : 62;
        return [Math.round(height * (selected ? selectedRatios[page] : normalRatios[page])), height];
    }

    private buildAuth(registerMode: boolean): void {
        this.clearCanvas();
        const [backgroundWidth, backgroundHeight] = this.coverViewportSize(2 / 3);
        const authBackground = this.createSpriteNode('AuthBackground', this.node, backgroundWidth * 1.04, backgroundHeight * 1.04, 0, 0, this.frames.get('login-background'));
        authBackground.setScale(1.01, 1.01, 1);
        tween(authBackground)
            .repeatForever(
                tween()
                    .to(10.5, { position: new Vec3(-4, 5, 0), scale: new Vec3(1.025, 1.025, 1) }, { easing: 'sineInOut' })
                    .to(10.5, { position: new Vec3(4, -4, 0), scale: new Vec3(1.01, 1.01, 1) }, { easing: 'sineInOut' }),
            )
            .start();
        this.createPanel('AuthDimmer', this.node, this.viewportWidth, this.viewportHeight, new Color(91, 23, 19, 42), 0, 0, 0);
        this.createAmbientGoldDust(this.node, 8);
        this.createDisplayLabel('FORTUNE CLUB', this.node, 38, new Color(255, 245, 220), 0, 402, 620, 60);
        this.createLabel('TREASURE MEMBER ACCESS', this.node, 12, new Color(139, 70, 48), 0, 360, 580, 28, true);

        const cardHeight = registerMode ? 880 : 690;
        const cardY = registerMode ? -105 : -60;
        this.createPanel('AuthCardShadow', this.node, 626, cardHeight, new Color(0, 0, 0, 52), 0, cardY - 10, 48);
        const card = this.createPanel('AuthCard', this.node, 626, cardHeight, new Color(72, 18, 21, 124), 0, cardY, 48);
        this.decorateCasinoCard(card, 626, cardHeight, registerMode ? 1 : 0, true);
        this.createOutlinePanel('AuthCardOutline', card, 624, cardHeight - 2, new Color(255, 225, 142, 46), 0, 0, 48, 1);
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
            registerMode ? 'START YOUR FORTUNE JOURNEY' : 'SIGN IN TO CONTINUE PLAYING',
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
            'auth-primary',
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
            'auth-secondary',
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
        const face = this.createPanel(`Input_${placeholder}`, parent, 520, 78, new Color(56, 13, 16, 158), 0, y, 20);
        this.createOutlinePanel('InputOutline', face, 518, 76, new Color(255, 225, 142, 38), 0, 0, 20, 1);
        const icon = this.createSpriteNode('InputIcon', face, password ? 29 : 27, password ? 25 : 31, -218, 0, this.frames.get(password ? 'login-password' : 'login-user'));
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
