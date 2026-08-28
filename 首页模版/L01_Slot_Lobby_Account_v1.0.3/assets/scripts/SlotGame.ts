import {
    _decorator,
    Button,
    Color,
    Component,
    EditBox,
    Graphics,
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
    Vec3,
    view,
} from 'cc';

const { ccclass } = _decorator;

type LobbyPage = 'home' | 'store' | 'rank' | 'rewards' | 'account';

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

    private frames = new Map<string, SpriteFrame>();
    private currentUser: LobbyAccount | null = null;
    private pageRoot!: Node;
    private navigationRoot: Node | null = null;
    private navigationSelector: Node | null = null;
    private navigationIcons = new Map<LobbyPage, Sprite>();
    private navigationLabels = new Map<LobbyPage, Label>();
    private currentPage: LobbyPage = 'home';
    private isTransitioning = false;
    private fxVersion = 0;
    private registerAvatar = 0;

    protected async start(): Promise<void> {
        view.setDesignResolutionSize(this.designWidth, this.designHeight, ResolutionPolicy.SHOW_ALL);
        this.ensureTransform(this.node, this.designWidth, this.designHeight);
        await this.loadArtwork();
        this.currentUser = this.restoreSession();
        if (this.currentUser) this.buildApp('home');
        else this.buildAuth(false);
    }

    private async loadArtwork(): Promise<void> {
        const entries: Array<[string, string]> = [
            ['background', 'lobby/home/background/spriteFrame'],
            ['banner', 'lobby/home/banner/spriteFrame'],
            ['top-header', 'lobby/home/top-header/spriteFrame'],
            ['coin-bar', 'lobby/home/coin-bar/spriteFrame'],
            ['category-button', 'lobby/home/category-button/spriteFrame'],
            ['category-line', 'lobby/home/category-line/spriteFrame'],
            ['category-way', 'lobby/home/category-way/spriteFrame'],
            ['category-megaways', 'lobby/home/category-megaways/spriteFrame'],
            ['game-elf', 'lobby/home/game-elf/spriteFrame'],
            ['game-pharaoh', 'lobby/home/game-pharaoh/spriteFrame'],
            ['game-mermaid', 'lobby/home/game-mermaid/spriteFrame'],
            ['game-sweet', 'lobby/home/game-sweet/spriteFrame'],
            ['login-background', 'lobby/login/background/spriteFrame'],
            ['login-input', 'lobby/login/input-box/spriteFrame'],
            ['login-user', 'lobby/login/user-icon/spriteFrame'],
            ['login-password', 'lobby/login/password-icon/spriteFrame'],
            ['login-guest', 'lobby/login/guest-icon/spriteFrame'],
            ['button-primary', 'lobby/buttons/primary/spriteFrame'],
            ['button-secondary', 'lobby/buttons/secondary/spriteFrame'],
            ['button-small', 'lobby/buttons/small/spriteFrame'],
            ['button-wide', 'lobby/buttons/wide/spriteFrame'],
            ['button-collect', 'lobby/buttons/collect/spriteFrame'],
            ['tabbar', 'lobby/navigation/tabbar-bg/spriteFrame'],
            ['rank-background', 'lobby/rank/background/spriteFrame'],
            ['rank-content', 'lobby/rank/content/spriteFrame'],
            ['rank-badge-1', 'lobby/rank/badge-1/spriteFrame'],
            ['rank-badge-2', 'lobby/rank/badge-2/spriteFrame'],
            ['rank-badge-3', 'lobby/rank/badge-3/spriteFrame'],
            ['rank-star', 'lobby/rank/star/spriteFrame'],
            ['rewards-background', 'lobby/rewards/background/spriteFrame'],
            ['account-background', 'lobby/account/background/spriteFrame'],
            ['account-profile', 'lobby/account/profile-panel/spriteFrame'],
            ['account-coin', 'lobby/account/coin-icon/spriteFrame'],
            ['account-inbox', 'lobby/account/details/inbox/spriteFrame'],
            ['account-inbox-title', 'lobby/account/details/inbox-title/spriteFrame'],
            ['account-achievement-title', 'lobby/account/details/achievement-title/spriteFrame'],
            ['account-money', 'lobby/account/details/money/spriteFrame'],
            ['account-id', 'lobby/account/details/id/spriteFrame'],
            ...Array.from({ length: 8 }, (_, index): [string, string] => [
                `account-info-${index + 1}`,
                `lobby/account/details/info-${index + 1}/spriteFrame`,
            ]),
            ['store-background', 'lobby/store/background/spriteFrame'],
            ['store-item-bg', 'lobby/store/item-bg/spriteFrame'],
            ['store-item-sbg', 'lobby/store/item-sbg/spriteFrame'],
            ['store-panel-name', 'lobby/store/panel-name/spriteFrame'],
            ['store-name-bar', 'lobby/store/name-bar/spriteFrame'],
            ['store-price-bar', 'lobby/store/price-bar/spriteFrame'],
            ['store-coin-icon', 'lobby/store/coin-icon/spriteFrame'],
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
        this.fxVersion += 1;
        this.navigationRoot = null;
        this.navigationSelector = null;
        this.navigationIcons.clear();
        this.navigationLabels.clear();
        this.isTransitioning = false;
        for (const child of [...this.node.children]) {
            if (child.name === 'Camera') continue;
            Tween.stopAllByTarget(child);
            child.destroy();
        }
    }

    private buildBackground(): void {
        const background = this.createSpriteNode('LobbyBackground', this.node, 750, 1334, 0, 0, this.frames.get('background'));
        background.getComponent(Sprite)!.color = new Color(255, 246, 236, 255);
        this.createPanel('LobbyShade', this.node, 750, 1334, new Color(26, 4, 22, 62), 0, 0, 0);
        tween(background)
            .to(4.2, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'quadInOut' })
            .to(4.2, { scale: Vec3.ONE }, { easing: 'quadInOut' })
            .union()
            .repeatForever()
            .start();
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
        const version = this.fxVersion;
        void this.animateAmbientGold(version);
    }

    private createPage(page: LobbyPage, animateEntrance: boolean): void {
        this.pageRoot = new Node('PageRoot');
        this.node.addChild(this.pageRoot);
        this.ensureTransform(this.pageRoot, 750, 1040);
        this.pageRoot.setPosition(animateEntrance ? 58 : 0, -28);
        const opacity = this.pageRoot.addComponent(UIOpacity);
        opacity.opacity = animateEntrance ? 0 : 255;

        const pageBackgroundKey = page === 'rank'
            ? 'rank-background'
            : page === 'store'
                ? 'store-background'
            : page === 'rewards'
                ? 'rewards-background'
                : page === 'account'
                    ? 'account-background'
                    : null;
        if (pageBackgroundKey) {
            const art = this.createSpriteNode('PageArtwork', this.pageRoot, 750, 1040, 0, 0, this.frames.get(pageBackgroundKey));
            art.getComponent(Sprite)!.color = new Color(255, 255, 255, page === 'store' ? 218 : page === 'account' ? 172 : 128);
            this.createPanel('PageArtworkShade', this.pageRoot, 750, 1040, new Color(28, 3, 23, page === 'store' ? 42 : 74), 0, 0, 0);
        }

        if (page === 'home') this.buildHomePage();
        else if (page === 'store') this.buildStorePage();
        else if (page === 'rank') this.buildRankPage();
        else if (page === 'rewards') this.buildRewardsPage();
        else this.buildAccountPage();

        if (this.navigationRoot?.isValid) this.navigationRoot.setSiblingIndex(this.node.children.length - 1);

        if (animateEntrance) {
            tween(this.pageRoot)
                .to(0.36, { position: new Vec3(0, -28, 0) }, { easing: 'quartOut' })
                .start();
            tween(opacity).to(0.24, { opacity: 255 }, { easing: 'quadOut' }).start();
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
            .to(0.2, { position: new Vec3(direction * 48, -28, 0), scale: new Vec3(0.985, 0.985, 1) }, { easing: 'quadIn' })
            .call(() => {
                if (oldRoot.isValid) oldRoot.destroy();
                this.createPage(page, false);
                const newRoot = this.pageRoot;
                const newOpacity = newRoot.getComponent(UIOpacity)!;
                newRoot.setPosition(-direction * 66, -28);
                newRoot.setScale(0.985, 0.985, 1);
                newOpacity.opacity = 0;
                tween(newRoot)
                    .to(0.38, { position: new Vec3(0, -28, 0), scale: Vec3.ONE }, { easing: 'quartOut' })
                    .call(() => { this.isTransitioning = false; })
                    .start();
                tween(newOpacity).to(0.25, { opacity: 255 }, { easing: 'quadOut' }).start();
            })
            .start();
        tween(oldOpacity).to(0.16, { opacity: 0 }, { easing: 'quadIn' }).start();
    }

    private pageIndex(page: LobbyPage): number {
        return ['home', 'store', 'rank', 'rewards', 'account'].indexOf(page);
    }

    private navigationX(page: LobbyPage): number {
        return -300 + this.pageIndex(page) * 150;
    }

    private buildHeader(): void {
        const user = this.currentUser!;
        const shadow = this.createPanel('HeaderShadow', this.node, 718, 120, new Color(25, 4, 18, 92), 0, 566, 48);
        shadow.setPosition(0, 558);
        const rim = this.createPanel('HeaderRim', this.node, 718, 120, new Color(255, 207, 65, 248), 0, 566, 48);
        const header = this.createSpriteNode('HeaderArtwork', rim, 706, 108, 0, 0, this.frames.get('top-header'));
        this.createPanel('HeaderGloss', header, 610, 10, new Color(255, 255, 255, 34), 20, 35, 5);

        const avatarButton = this.createCirclePanel('HeaderAvatarRim', header, 86, new Color(255, 210, 63, 255), -292, 0);
        this.createCirclePanel('HeaderAvatarInset', avatarButton, 74, new Color(123, 30, 33, 255), 0, 0);
        this.createSpriteNode('HeaderAvatar', avatarButton, 68, 68, 0, 0, this.avatarFrame(user.avatar));
        avatarButton.addComponent(Button);
        avatarButton.on(Button.EventType.CLICK, () => this.transitionTo('account'), this);
        this.bindPressMotion(avatarButton);

        this.createLabel(`HI, ${user.username.toUpperCase()}`, header, 22, Color.WHITE, -175, 14, 210, 34, true);
        this.createLabel('FORTUNE MEMBER', header, 12, new Color(255, 214, 100, 220), -175, -17, 210, 24, true);

        const coinPill = this.createSpriteNode('CoinBarArtwork', header, 254, 70, 194, 0, this.frames.get('coin-bar'));
        const headerCoin = this.createSpriteNode('HeaderCoin', coinPill, 44, 44, -96, 0, this.frames.get('account-coin'));
        tween(headerCoin)
            .to(0.55, { scale: new Vec3(1.12, 1.12, 1), angle: 10 }, { easing: 'quadOut' })
            .to(0.65, { scale: Vec3.ONE, angle: -7 }, { easing: 'quadInOut' })
            .delay(1.1)
            .union()
            .repeatForever()
            .start();
        this.createLabel(user.coins.toLocaleString('en-US'), coinPill, 25, Color.WHITE, 12, 0, 144, 44, true);
        this.createTextButton('+', coinPill, 98, 0, 42, 42, () => this.showToast('COIN STORE READY TO CONNECT'), new Color(245, 130, 17), 28);
    }

    private buildHomePage(): void {
        const bannerRim = this.createPanel('BannerRim', this.pageRoot, 716, 304, new Color(255, 213, 61), 0, 332, 25);
        const banner = this.createSpriteNode('PromoBanner', bannerRim, 704, 292, 0, 0, this.frames.get('banner'));
        const bannerOpacity = banner.addComponent(UIOpacity);
        bannerOpacity.opacity = 0;
        banner.setScale(0.92, 0.92, 1);
        tween(banner)
            .to(0.38, { scale: Vec3.ONE }, { easing: 'backOut' })
            .call(() => {
                if (!banner.isValid) return;
                tween(banner)
                    .to(1.35, { position: new Vec3(0, 3, 0), angle: 0.28 }, { easing: 'quadInOut' })
                    .to(1.35, { position: new Vec3(0, -3, 0), angle: -0.22 }, { easing: 'quadInOut' })
                    .union()
                    .repeatForever()
                    .start();
            })
            .start();
        tween(bannerOpacity).to(0.26, { opacity: 255 }).start();
        const live = this.createPanel('LiveBadge', bannerRim, 118, 38, new Color(218, 39, 42, 244), -270, -112, 19);
        const liveDot = this.createCirclePanel('LiveDot', live, 10, Color.WHITE, -40, 0);
        tween(liveDot)
            .to(0.42, { scale: new Vec3(1.45, 1.45, 1) }, { easing: 'quadOut' })
            .to(0.42, { scale: new Vec3(0.82, 0.82, 1) }, { easing: 'quadIn' })
            .union()
            .repeatForever()
            .start();
        this.createLabel('LIVE', live, 14, Color.WHITE, 10, 0, 72, 30, true);
        const bannerCoinLeft = this.createSpriteNode('BannerCoinLeft', bannerRim, 54, 54, -315, 116, this.frames.get('account-coin'));
        const bannerCoinRight = this.createSpriteNode('BannerCoinRight', bannerRim, 42, 42, 320, 104, this.frames.get('account-coin'));
        tween(bannerCoinLeft).to(1.5, { position: new Vec3(-315, 124, 0), angle: 12 }).to(1.5, { position: new Vec3(-315, 116, 0), angle: -8 }).union().repeatForever().start();
        tween(bannerCoinRight).delay(0.35).to(1.25, { position: new Vec3(320, 112, 0), angle: -12 }).to(1.25, { position: new Vec3(320, 104, 0), angle: 10 }).union().repeatForever().start();

        [
            { x: -338, y: 220, size: 28, delay: 0.1, angle: -18 },
            { x: 340, y: 12, size: 34, delay: 0.55, angle: 16 },
            { x: -338, y: -226, size: 24, delay: 1.05, angle: 22 },
            { x: 340, y: -472, size: 27, delay: 1.5, angle: -12 },
        ].forEach((ornament, index) => {
            const coin = this.createSpriteNode(
                `HomeFloatingCoin_${index}`,
                this.pageRoot,
                ornament.size,
                ornament.size,
                ornament.x,
                ornament.y,
                this.frames.get('account-coin'),
            );
            coin.angle = ornament.angle;
            tween(coin)
                .delay(ornament.delay)
                .to(1.15, {
                    position: new Vec3(ornament.x, ornament.y + 16, 0),
                    angle: ornament.angle + 28,
                    scale: new Vec3(1.16, 1.16, 1),
                }, { easing: 'quadInOut' })
                .to(1.15, {
                    position: new Vec3(ornament.x, ornament.y, 0),
                    angle: ornament.angle,
                    scale: Vec3.ONE,
                }, { easing: 'quadInOut' })
                .union()
                .repeatForever()
                .start();
        });

        this.createLabel('CHOOSE YOUR FORTUNE', this.pageRoot, 24, Color.WHITE, -170, 145, 350, 44, true);
        const allChip = this.createPanel('AllGamesChip', this.pageRoot, 92, 38, new Color(255, 202, 51), 267, 145, 19);
        this.createLabel('ALL 4', allChip, 13, new Color(100, 25, 24), 0, 0, 82, 30, true);

        const categories = [
            ['LINE', 'category-line', -220],
            ['WAYS', 'category-way', 0],
            ['MEGAWAYS', 'category-megaways', 220],
        ] as Array<[string, string, number]>;
        categories.forEach(([text, artKey, x], index) => {
            const chip = this.createSpriteNode(`Category_${text}`, this.pageRoot, index === 2 ? 190 : 164, 50, x, 88, this.frames.get('category-button'));
            const markWidth = text === 'MEGAWAYS' ? 118 : 82;
            const mark = this.createSpriteNode(`CategoryMark_${text}`, chip, markWidth, 32, 0, 0, this.frames.get(artKey));
            if (index !== 0) mark.getComponent(Sprite)!.color = new Color(255, 255, 255, 200);
            tween(mark)
                .delay(0.35 + index * 0.3)
                .to(0.28, { scale: new Vec3(1.09, 1.09, 1) }, { easing: 'backOut' })
                .to(0.34, { scale: Vec3.ONE }, { easing: 'quadOut' })
                .delay(1.35)
                .union()
                .repeatForever()
                .start();
            chip.addComponent(Button);
            chip.on(Button.EventType.CLICK, () => this.showToast(`${text} GAMES SELECTED`), this);
            this.bindPressMotion(chip);
        });

        const games = [
            { key: 'game-pharaoh', x: -118, y: -80, tag: 'HOT', color: new Color(238, 68, 29) },
            { key: 'game-elf', x: 118, y: -80, tag: 'NEW', color: new Color(39, 189, 240) },
            { key: 'game-mermaid', x: -118, y: -362, tag: 'WAYS', color: new Color(137, 91, 229) },
            { key: 'game-sweet', x: 118, y: -362, tag: 'S01', color: new Color(255, 135, 23) },
        ];
        games.forEach((game, index) => this.createGameCard(game.key, game.x, game.y, game.tag, game.color, index));
    }

    private createGameCard(key: string, x: number, y: number, tag: string, tagColor: Color, index: number): void {
        const sourceRatios: Record<string, number> = {
            'game-pharaoh': 462 / 623,
            'game-elf': 513 / 671,
            'game-mermaid': 491 / 661,
            'game-sweet': 469 / 650,
        };
        const artWidth = 196;
        const artHeight = Math.round(artWidth / (sourceRatios[key] ?? 0.74));
        const rimWidth = 208;
        const rimHeight = artHeight + 12;
        const shadow = this.createPanel(`GameShadow_${key}`, this.pageRoot, rimWidth + 2, rimHeight + 2, new Color(26, 3, 18, 110), x, y - 8, 24);
        shadow.angle = index % 2 === 0 ? -1 : 1;
        const rim = this.createPanel(`GameRim_${key}`, this.pageRoot, rimWidth, rimHeight, new Color(255, 211, 61), x, y, 24);
        const card = this.createSpriteNode(`GameCard_${key}`, rim, artWidth, artHeight, 0, 0, this.frames.get(key));
        card.addComponent(Button);
        card.on(Button.EventType.CLICK, () => this.showToast(`${key.replace('game-', '').toUpperCase()} · GAME ENTRY READY`), this);
        this.bindPressMotion(rim);
        const badge = this.createPanel(`GameBadge_${key}`, rim, 70, 32, tagColor, -64, rimHeight / 2 - 14, 16);
        this.createLabel(tag, badge, 13, Color.WHITE, 0, 0, 66, 28, true);
        const opacity = rim.addComponent(UIOpacity);
        opacity.opacity = 0;
        rim.setScale(0.7, 0.7, 1);
        tween(rim)
            .delay(0.08 + index * 0.08)
            .to(0.34, { scale: Vec3.ONE }, { easing: 'backOut' })
            .call(() => {
                if (!rim.isValid) return;
                tween(rim)
                    .delay(index * 0.12)
                    .to(1.55, { position: new Vec3(x, y + 6, 0) }, { easing: 'quadInOut' })
                    .to(1.55, { position: new Vec3(x, y, 0) }, { easing: 'quadInOut' })
                    .union()
                    .repeatForever()
                    .start();
            })
            .start();
        // Match the reference lobby: start after 0.5 s, then spotlight one image every 0.8 s.
        tween(card)
            .delay(0.5 + index * 0.8)
            .to(0.3, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadOut' })
            .to(0.3, { scale: Vec3.ONE }, { easing: 'quadInOut' })
            .delay(2.6)
            .union()
            .repeatForever()
            .start();
        tween(badge)
            .delay(0.62 + index * 0.8)
            .to(0.18, { scale: new Vec3(1.16, 1.16, 1), angle: index % 2 === 0 ? -4 : 4 }, { easing: 'backOut' })
            .to(0.24, { scale: Vec3.ONE, angle: 0 }, { easing: 'quadOut' })
            .delay(2.78)
            .union()
            .repeatForever()
            .start();
        tween(opacity).delay(index * 0.07).to(0.25, { opacity: 255 }).start();
    }

    private buildStorePage(): void {
        const user = this.currentUser!;
        this.createPageTitle('FORTUNE STORE', 'COIN PACKS · SAFE DEMO CHECKOUT');

        const wallet = this.createSpriteNode('StoreWalletBar', this.pageRoot, 548, 155, 0, 330, this.frames.get('store-name-bar'));
        const avatarRim = this.createCirclePanel('StoreAvatarRim', wallet, 84, new Color(255, 211, 61), -202, 2);
        this.createSpriteNode('StoreAvatar', avatarRim, 74, 74, 0, 0, this.avatarFrame(user.avatar));
        this.createLabel(user.username.toUpperCase(), wallet, 18, Color.WHITE, -68, 27, 210, 30, true);
        this.createLabel('CURRENT BALANCE', wallet, 11, new Color(255, 221, 117), -68, -4, 210, 24, true);
        this.createSpriteNode('StoreWalletCoin', wallet, 36, 36, 84, 1, this.frames.get('store-coin-icon'));
        this.createLabel(user.coins.toLocaleString('en-US'), wallet, 22, Color.WHITE, 172, 1, 130, 34, true);
        tween(avatarRim).to(1.2, { scale: new Vec3(1.06, 1.06, 1) }).to(1.2, { scale: Vec3.ONE }).union().repeatForever().start();

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

        const secure = this.createPanel('StoreSecureBar', this.pageRoot, 650, 58, new Color(50, 9, 30, 222), 0, -366, 26);
        this.createLabel('◆', secure, 18, new Color(255, 210, 68), -280, 0, 30, 30, true);
        this.createLabel('DEMO STORE · CONNECT APP STORE / GOOGLE PLAY BILLING BEFORE RELEASE', secure, 11, new Color(255, 255, 255, 190), 12, 0, 570, 30, true);
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
        const card = this.createSpriteNode(`StorePack_${coinIndex}`, this.pageRoot, 198, 276, x, y, this.frames.get('store-item-bg'));
        this.createOutlinePanel('StorePackOutline', card, 188, 266, index === 5 ? new Color(255, 232, 118) : new Color(255, 200, 52, 150), 0, 0, 22, index === 5 ? 4 : 2);
        const titleBar = this.createSpriteNode('StorePackTitle', card, 166, 42, 0, 103, this.frames.get('store-price-bar'));
        this.createLabel(amount, titleBar, 18, new Color(91, 25, 20), 0, 0, 132, 30, true);

        const sourceSizes = [[110, 87], [126, 102], [141, 129], [168, 144], [157, 178], [231, 155]];
        const [sourceWidth, sourceHeight] = sourceSizes[coinIndex - 1];
        const maxWidth = coinIndex === 6 ? 138 : 112;
        const coinHeight = Math.round(maxWidth * sourceHeight / sourceWidth);
        const coin = this.createSpriteNode('StorePackCoins', card, maxWidth, coinHeight, 0, 21, this.frames.get(`store-coin-${coinIndex}`));
        tween(coin)
            .delay(index * 0.12)
            .to(1.05, { position: new Vec3(0, 28, 0), scale: new Vec3(1.05, 1.05, 1) }, { easing: 'quadInOut' })
            .to(1.05, { position: new Vec3(0, 21, 0), scale: Vec3.ONE }, { easing: 'quadInOut' })
            .union()
            .repeatForever()
            .start();

        const bonusColor = index === 5 ? new Color(255, 230, 92) : new Color(255, 255, 255, 205);
        this.createLabel(bonus, card, 11, bonusColor, 0, -52, 160, 24, true);
        const priceButton = this.createSpriteNode('StorePriceButton', card, 166, 42, 0, -103, this.frames.get('store-price-bar'));
        this.createLabel(price, priceButton, 15, new Color(91, 25, 20), 0, 0, 120, 28, true);
        priceButton.addComponent(Button);
        priceButton.on(Button.EventType.CLICK, () => this.showToast(`${amount} COINS · BILLING CONNECTION REQUIRED`), this);
        this.bindPressMotion(priceButton);

        const opacity = card.addComponent(UIOpacity);
        opacity.opacity = 0;
        card.setScale(0.72, 0.72, 1);
        tween(card).delay(index * 0.07).to(0.34, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        tween(opacity).delay(index * 0.07).to(0.24, { opacity: 255 }).start();
    }

    private buildRankPage(): void {
        const contentArt = this.createSpriteNode('RankContentArtwork', this.pageRoot, 700, 890, 0, -74, this.frames.get('rank-content'));
        contentArt.getComponent(Sprite)!.color = new Color(255, 255, 255, 212);
        this.createPageTitle('LEADERBOARD', 'TOP PLAYERS · LIVE COIN RANKING');
        const tabs = this.createPanel('RankTabs', this.pageRoot, 520, 58, new Color(77, 17, 39, 240), 0, 380, 29);
        this.createPanel('RankTabActive', tabs, 168, 46, new Color(255, 196, 38), -168, 0, 23);
        ['DAILY', 'WEEKLY', 'ALL TIME'].forEach((text, index) => {
            this.createLabel(text, tabs, 14, index === 0 ? new Color(94, 22, 27) : Color.WHITE, -168 + index * 168, 0, 150, 36, true);
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
                rank === 1 ? new Color(151, 50, 24, 248) : new Color(78, 19, 40, 242),
                podiumX[index],
                podiumY[index],
                30,
            );
            this.createOutlinePanel('PodiumOutline', card, 164, height - 10, rank === 1 ? new Color(255, 217, 72) : new Color(255, 196, 56, 160), 0, 0, 26, rank === 1 ? 4 : 2);
            const badge = this.createSpriteNode(`RankBadge_${rank}`, card, rank === 1 ? 104 : 92, rank === 1 ? 44 : 38, 0, height / 2 - 27, this.frames.get(`rank-badge-${rank}`));
            if (rank === 1) tween(badge).to(0.7, { scale: new Vec3(1.15, 1.15, 1) }).to(0.7, { scale: Vec3.ONE }).union().repeatForever().start();
            const avatar = this.createCirclePanel('PodiumAvatarRim', card, rank === 1 ? 82 : 70, new Color(255, 203, 52), 0, 22);
            this.createSpriteNode('PodiumAvatar', avatar, rank === 1 ? 70 : 60, rank === 1 ? 70 : 60, 0, 0, this.avatarFrame(entry.avatar));
            this.createLabel(entry.name.toUpperCase(), card, 14, Color.WHITE, 0, -40, 150, 26, true);
            this.createLabel(entry.coins.toLocaleString('en-US'), card, 17, new Color(255, 216, 86), 0, -70, 150, 30, true);
        });

        const list = this.createPanel('RankList', this.pageRoot, 680, 472, new Color(51, 10, 31, 215), 0, -252, 36);
        this.createOutlinePanel('RankListOutline', list, 668, 460, new Color(255, 204, 62, 145), 0, 0, 31, 2);
        ranking.slice(3, 9).forEach((entry, index) => {
            const y = 195 - index * 75;
            const row = this.createPanel(
                `RankRow_${index + 4}`,
                list,
                628,
                66,
                entry.current ? new Color(158, 54, 25, 246) : new Color(255, 255, 255, index % 2 === 0 ? 16 : 8),
                0,
                y,
                22,
            );
            this.createLabel(`#${index + 4}`, row, 17, new Color(255, 209, 66), -273, 0, 54, 34, true);
            const avatar = this.createCirclePanel('RankAvatarRim', row, 48, new Color(255, 190, 41), -214, 0);
            this.createSpriteNode('RankAvatar', avatar, 42, 42, 0, 0, this.avatarFrame(entry.avatar));
            this.createLabel(entry.current ? `${entry.name}  ·  YOU` : entry.name, row, 16, Color.WHITE, -76, 0, 220, 34, true);
            this.createSpriteNode('RankCoin', row, 26, 26, 152, 0, this.frames.get('rank-star'));
            this.createLabel(entry.coins.toLocaleString('en-US'), row, 17, new Color(255, 220, 98), 218, 0, 150, 34, true);
            const rowOpacity = row.addComponent(UIOpacity);
            rowOpacity.opacity = 0;
            row.setPosition(-34, y);
            tween(row).delay(0.06 * index).to(0.3, { position: new Vec3(0, y, 0) }, { easing: 'quartOut' }).start();
            tween(rowOpacity).delay(0.06 * index).to(0.22, { opacity: 255 }).start();
        });
    }

    private buildRewardsPage(): void {
        this.createPageTitle('DAILY REWARDS', 'RETURN EVERY DAY · BUILD YOUR STREAK');
        const chest = this.createCirclePanel('RewardChestGlow', this.pageRoot, 264, new Color(255, 194, 38, 46), 0, 288);
        this.createCircleOutline('RewardRing1', chest, 228, new Color(255, 210, 65, 170), 0, 0, 4);
        this.createCircleOutline('RewardRing2', chest, 184, new Color(255, 255, 255, 72), 0, 0, 2);
        const gift = this.createPanel('GiftBox', chest, 120, 96, new Color(219, 55, 38), 0, -8, 18);
        this.createPanel('GiftRibbonV', gift, 22, 96, new Color(255, 211, 57), 0, 0, 5);
        this.createPanel('GiftRibbonH', gift, 120, 22, new Color(255, 211, 57), 0, 12, 5);
        this.createLabel('★', gift, 34, Color.WHITE, 0, 8, 48, 48, true);
        tween(chest).to(0.9, { scale: new Vec3(1.08, 1.08, 1), angle: 5 }).to(0.9, { scale: Vec3.ONE, angle: -5 }).union().repeatForever().start();
        [[-145, 330, 54, -12], [150, 345, 48, 10], [-116, 240, 38, 8], [126, 220, 44, -10]].forEach(([x, y, size, angle], index) => {
            const coin = this.createSpriteNode(`RewardCoin_${index}`, this.pageRoot, size, size, x, y, this.frames.get('account-coin'));
            coin.angle = angle;
            tween(coin).delay(index * 0.16).to(1.25, { position: new Vec3(x, y + 12, 0), angle: angle + 18 }).to(1.25, { position: new Vec3(x, y, 0), angle }).union().repeatForever().start();
        });

        this.createLabel('7-DAY FORTUNE STREAK', this.pageRoot, 24, Color.WHITE, 0, 112, 500, 44, true);
        const rewards = [100, 150, 200, 250, 300, 400, 800];
        rewards.forEach((amount, index) => {
            const x = -270 + (index % 4) * 180;
            const y = index < 4 ? 5 : -125;
            const claimed = index < 2;
            const cell = this.createPanel(
                `RewardDay_${index + 1}`,
                this.pageRoot,
                index === 6 ? 170 : 150,
                108,
                claimed ? new Color(76, 27, 42, 215) : index === 2 ? new Color(174, 60, 24, 248) : new Color(91, 23, 42, 238),
                x,
                y,
                24,
            );
            this.createOutlinePanel('RewardOutline', cell, (index === 6 ? 170 : 150) - 8, 100, index === 2 ? new Color(255, 222, 79) : new Color(255, 199, 51, 120), 0, 0, 20, index === 2 ? 3 : 2);
            this.createLabel(`DAY ${index + 1}`, cell, 12, new Color(255, 226, 125), 0, 29, 120, 24, true);
            this.createLabel(claimed ? '✓' : '★', cell, 25, claimed ? new Color(129, 230, 163) : new Color(255, 199, 36), -34, -10, 40, 40, true);
            this.createLabel(`${amount}`, cell, 18, Color.WHITE, 24, -10, 70, 34, true);
        });

        const claimedToday = sys.localStorage.getItem(this.rewardKey) === this.todayKey();
        const rewardButton = this.createArtworkButton(
            claimedToday ? 'CLAIMED TODAY' : '',
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
        if (!claimedToday) {
            const amountBadge = this.createPanel('RewardAmountBadge', rewardButton, 86, 30, new Color(91, 18, 30, 242), 92, 36, 15);
            this.createLabel('+200', amountBadge, 13, new Color(255, 226, 112), 0, 0, 76, 24, true);
        }
        this.createLabel('NEXT REWARD REFRESHES AT MIDNIGHT', this.pageRoot, 12, new Color(255, 255, 255, 170), 0, -312, 500, 26, true);

        const quests = this.createPanel('QuestPanel', this.pageRoot, 650, 160, new Color(53, 12, 32, 225), 0, -410, 30);
        this.createLabel('FORTUNE MISSIONS', quests, 17, Color.WHITE, -170, 58, 270, 32, true);
        [['PLAY 3 GAMES', '1 / 3', 0.34], ['WIN ANY SLOT', 'READY', 1]].forEach((item, index) => {
            const y = 8 - index * 62;
            this.createLabel(item[0] as string, quests, 13, Color.WHITE, -170, y + 16, 260, 26, true);
            const track = this.createPanel(`QuestTrack_${index}`, quests, 360, 18, new Color(24, 5, 19, 200), -45, y - 18, 9);
            const progressWidth = 346 * (item[2] as number);
            const progress = this.createPanel(`QuestProgress_${index}`, track, progressWidth, 12, new Color(255, 193, 38), -173 + progressWidth / 2, 0, 6);
            progress.setScale(0.06, 1, 1);
            tween(progress).delay(0.18 + index * 0.1).to(0.48, { scale: Vec3.ONE }, { easing: 'quartOut' }).start();
            this.createLabel(item[1] as string, quests, 14, new Color(255, 218, 83), 245, y, 100, 30, true);
        });
    }

    private buildAccountPage(): void {
        const user = this.currentUser!;
        this.createPageTitle('MY ACCOUNT', 'PROFILE · ACHIEVEMENTS · SECURITY');
        const profile = this.createSpriteNode('ProfileArtwork', this.pageRoot, 650, 404, 0, 222, this.frames.get('account-profile'));
        this.createPanel('ProfileShade', profile, 610, 342, new Color(55, 10, 29, 78), 0, -5, 32);
        this.createOutlinePanel('ProfileOutline', profile, 638, 392, new Color(255, 215, 77, 185), 0, 0, 38, 2);
        const avatar = this.createCirclePanel('ProfileAvatarRim', profile, 144, new Color(255, 209, 57), -218, 58);
        this.createCirclePanel('ProfileAvatarInset', avatar, 132, new Color(120, 29, 34), 0, 0);
        const avatarImage = this.createSpriteNode('ProfileAvatar', avatar, 124, 124, 0, 0, this.avatarFrame(user.avatar));
        tween(avatarImage).to(1.35, { scale: new Vec3(1.045, 1.045, 1) }).to(1.35, { scale: Vec3.ONE }).union().repeatForever().start();
        this.createLabel(user.username.toUpperCase(), profile, 27, Color.WHITE, 72, 103, 350, 44, true);
        this.createLabel('GOLD FORTUNE MEMBER', profile, 13, new Color(255, 218, 92), 72, 66, 350, 27, true);
        this.createSpriteNode('ProfileIdIcon', profile, 31, 20, -60, 30, this.frames.get('account-id'));
        this.createLabel(`FC-${Math.abs(this.hashName(user.username)).toString().padStart(6, '0').slice(0, 6)}`, profile, 13, new Color(255, 255, 255, 178), 82, 30, 225, 25);
        this.createArtworkButton('CHANGE AVATAR', profile, 73, -24, 220, 55, () => this.rotateAvatar(), 'button-small', 12);

        const stats = [
            { label: 'BALANCE', value: user.coins.toLocaleString('en-US'), frame: 'account-money' },
            { label: 'GAMES PLAYED', value: '24', frame: 'account-info-3' },
            { label: 'BEST WIN', value: '3,500', frame: 'account-info-4' },
        ];
        stats.forEach((stat, index) => {
            const statCard = this.createPanel('ProfileStat', profile, 184, 92, new Color(55, 11, 31, 220), -202 + index * 202, -132, 22);
            this.createSpriteNode('ProfileStatIcon', statCard, 34, 34, -60, 12, this.frames.get(stat.frame));
            this.createLabel(stat.value, statCard, 20, new Color(255, 216, 78), 24, 13, 112, 30, true);
            this.createLabel(stat.label, statCard, 10, new Color(255, 255, 255, 165), 0, -24, 155, 22, true);
        });

        const accountActions = [
            { name: 'INBOX', subtitle: '3 NEW MESSAGES', icon: 'account-inbox', title: 'account-inbox-title', x: -165 },
            { name: 'ACHIEVEMENTS', subtitle: '12 / 36 UNLOCKED', icon: 'account-info-7', title: 'account-achievement-title', x: 165 },
        ];
        accountActions.forEach((action, index) => {
            const actionCard = this.createPanel(`AccountAction_${action.name}`, this.pageRoot, 310, 142, new Color(67, 15, 38, 238), action.x, -74, 30);
            this.createOutlinePanel('AccountActionOutline', actionCard, 300, 132, new Color(255, 203, 56, 125), 0, 0, 26, 2);
            const icon = this.createSpriteNode('AccountActionIcon', actionCard, index === 0 ? 72 : 62, index === 0 ? 68 : 62, -98, 8, this.frames.get(action.icon));
            const titleWidth = index === 0 ? 104 : 158;
            this.createSpriteNode('AccountActionTitle', actionCard, titleWidth, index === 0 ? 46 : 31, 45, 23, this.frames.get(action.title));
            this.createLabel(action.subtitle, actionCard, 10, new Color(255, 228, 133), 45, -27, 180, 22, true);
            this.createLabel('›', actionCard, 28, Color.WHITE, 130, 0, 28, 42, true);
            actionCard.addComponent(Button);
            actionCard.on(Button.EventType.CLICK, () => this.showToast(`${action.name} PANEL READY TO CONNECT`), this);
            this.bindPressMotion(actionCard);
            tween(icon).delay(index * 0.3).to(1.1, { position: new Vec3(-98, 14, 0) }).to(1.1, { position: new Vec3(-98, 8, 0) }).union().repeatForever().start();
        });

        const settings = this.createPanel('AccountSettings', this.pageRoot, 650, 264, new Color(48, 9, 29, 232), 0, -292, 34);
        this.createLabel('ACCOUNT CENTER', settings, 15, new Color(255, 218, 94), -213, 106, 190, 28, true);
        const menuItems = [
            { label: 'SOUND', value: 'ON', icon: 'account-info-1' },
            { label: 'NOTIFICATIONS', value: 'ON', icon: 'account-info-2' },
            { label: 'SECURITY', value: 'SAFE', icon: 'account-info-5' },
            { label: 'SUPPORT', value: 'OPEN', icon: 'account-info-8' },
        ];
        menuItems.forEach((item, index) => {
            const x = index % 2 === 0 ? -158 : 158;
            const y = index < 2 ? 42 : -70;
            const menu = this.createPanel(`AccountMenu_${item.label}`, settings, 292, 96, new Color(255, 255, 255, 13), x, y, 24);
            this.createSpriteNode('AccountMenuIcon', menu, 48, 48, -104, 0, this.frames.get(item.icon));
            this.createLabel(item.label, menu, 13, Color.WHITE, 0, 13, 150, 26, true);
            this.createLabel(item.value, menu, 10, new Color(255, 214, 86), 0, -18, 150, 22, true);
            this.createLabel('›', menu, 24, new Color(255, 255, 255, 180), 116, 0, 24, 34, true);
            menu.addComponent(Button);
            menu.on(Button.EventType.CLICK, () => this.showToast(`${item.label} SETTINGS READY`), this);
            this.bindPressMotion(menu);
        });

        this.createArtworkButton('LOG OUT', this.pageRoot, 0, -468, 230, 52, () => this.logout(), 'button-wide', 13, new Color(255, 178, 178), Color.WHITE);
    }

    private buildNavigation(active: LobbyPage): void {
        const shadow = this.createPanel('NavigationShadow', this.node, 750, 150, new Color(15, 2, 13, 130), 0, -603, 0);
        shadow.setPosition(0, -610);
        const nav = this.createSpriteNode('Navigation', this.node, 750, 150, 0, -603, this.frames.get('tabbar'));
        this.navigationRoot = nav;
        this.createPanel('NavigationGoldLine', nav, 750, 3, new Color(255, 205, 56), 0, 73, 2);
        this.navigationSelector = this.createPanel('NavigationSelector', nav, 126, 104, new Color(255, 194, 35, 30), this.navigationX(active), -4, 32);
        this.createPanel('NavigationSelectorGlow', this.navigationSelector, 72, 5, new Color(255, 214, 74), 0, 49, 3);
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
            tween(iconNode)
                .delay(index * 0.24)
                .to(1.1, { position: new Vec3(0, 4, 0), angle: index % 2 === 0 ? 1.5 : -1.5 }, { easing: 'quadInOut' })
                .to(1.1, { position: new Vec3(0, -1, 0), angle: 0 }, { easing: 'quadInOut' })
                .union()
                .repeatForever()
                .start();
            button.addComponent(Button);
            button.on(Button.EventType.CLICK, () => this.transitionTo(page), this);
            this.bindPressMotion(button);
        });
    }

    private updateNavigation(active: LobbyPage): void {
        if (this.navigationSelector?.isValid) {
            const x = this.navigationX(active);
            tween(this.navigationSelector).to(0.34, { position: new Vec3(x, -4, 0) }, { easing: 'backOut' }).start();
        }
        (['home', 'store', 'rank', 'rewards', 'account'] as LobbyPage[]).forEach((page) => {
            const selected = page === active;
            const icon = this.navigationIcons.get(page);
            if (icon?.node.isValid) {
                icon.spriteFrame = this.frames.get(`nav-${page}-${selected ? 'selected' : 'normal'}`) ?? null;
                const [width, height] = this.navigationIconSize(page, selected);
                icon.node.getComponent(UITransform)?.setContentSize(width, height);
                tween(icon.node).to(0.22, { scale: selected ? new Vec3(1.12, 1.12, 1) : Vec3.ONE }, { easing: 'backOut' }).start();
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
        const authBackground = this.createSpriteNode('AuthBackground', this.node, 750, 1334, 0, 0, this.frames.get('login-background'));
        authBackground.setScale(1.025, 1.025, 1);
        tween(authBackground).to(6, { scale: Vec3.ONE }, { easing: 'quadInOut' }).to(6, { scale: new Vec3(1.025, 1.025, 1) }, { easing: 'quadInOut' }).union().repeatForever().start();
        this.createPanel('AuthDimmer', this.node, 750, 1334, new Color(26, 2, 22, 48), 0, 0, 0);
        const logoGlow = this.createCirclePanel('AuthLogoGlow', this.node, 330, new Color(255, 192, 38, 34), 0, 438);
        this.createCircleOutline('AuthLogoRing', logoGlow, 280, new Color(255, 207, 59, 118), 0, 0, 3);
        const crown = this.createLabel('♛', logoGlow, 72, new Color(255, 211, 58), 0, 36, 130, 100, true);
        this.createLabel('FORTUNE CLUB', this.node, 46, Color.WHITE, 0, 392, 620, 70, true);
        this.createLabel('YOUR PREMIUM SLOT DESTINATION', this.node, 14, new Color(255, 221, 119), 0, 346, 580, 30, true);
        tween(crown.node).to(0.9, { scale: new Vec3(1.12, 1.12, 1), angle: 4 }).to(0.9, { scale: Vec3.ONE, angle: -4 }).union().repeatForever().start();

        const cardHeight = registerMode ? 790 : 690;
        const cardY = registerMode ? -105 : -60;
        const shadow = this.createPanel('AuthCardShadow', this.node, 642, cardHeight, new Color(20, 2, 16, 118), 0, cardY - 12, 48);
        shadow.setScale(0.96, 0.96, 1);
        const rim = this.createPanel('AuthCardRim', this.node, 642, cardHeight, new Color(255, 207, 59), 0, cardY, 48);
        const card = this.createPanel('AuthCard', rim, 628, cardHeight - 14, new Color(63, 13, 38, 250), 0, 0, 42);
        card.setScale(0.78, 0.78, 1);
        tween(card).to(0.34, { scale: Vec3.ONE }, { easing: 'backOut' }).start();

        const tabs = this.createPanel('AuthTabs', card, 520, 62, new Color(32, 5, 25, 215), 0, cardHeight / 2 - 68, 31);
        const tabX = registerMode ? 130 : -130;
        this.createPanel('AuthTabActive', tabs, 248, 50, new Color(255, 190, 35), tabX, 0, 25);
        const loginTab = this.createLabel('LOGIN', tabs, 16, registerMode ? new Color(255, 255, 255, 180) : new Color(96, 22, 27), -130, 0, 230, 36, true).node;
        const registerTab = this.createLabel('REGISTER', tabs, 16, registerMode ? new Color(96, 22, 27) : new Color(255, 255, 255, 180), 130, 0, 230, 36, true).node;
        this.makeLabelClickable(loginTab, () => this.switchAuth(false));
        this.makeLabelClickable(registerTab, () => this.switchAuth(true));

        const titleY = cardHeight / 2 - 142;
        this.createLabel(registerMode ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK', card, 28, Color.WHITE, 0, titleY, 520, 46, true);
        this.createLabel(
            registerMode ? 'START YOUR FORTUNE JOURNEY' : 'SIGN IN TO CONTINUE PLAYING',
            card,
            13,
            new Color(255, 218, 112),
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
            this.createLabel('CHOOSE AVATAR', card, 13, new Color(255, 225, 133), -200, -132, 170, 28, true);
            for (let index = 0; index < 4; index += 1) {
                const selected = this.registerAvatar === index;
                const avatar = this.createCirclePanel(
                    `RegisterAvatar_${index}`,
                    card,
                    selected ? 78 : 70,
                    selected ? new Color(255, 209, 57) : new Color(138, 44, 48),
                    -180 + index * 120,
                    -192,
                );
                this.createSpriteNode('RegisterAvatarImage', avatar, selected ? 68 : 60, selected ? 68 : 60, 0, 0, this.avatarFrame(index));
                avatar.addComponent(Button);
                avatar.on(Button.EventType.CLICK, () => {
                    this.registerAvatar = index;
                    this.switchAuth(true);
                }, this);
                this.bindPressMotion(avatar);
            }
        } else {
            this.createLabel('Demo account:  player  /  123456', card, 13, new Color(255, 255, 255, 150), 0, -82, 480, 28);
        }

        const message = this.createLabel('', card, 13, new Color(255, 125, 125), 0, registerMode ? -258 : -135, 520, 30, true);
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
            'button-wide',
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
        const curtain = this.createPanel('AuthTransitionCurtain', this.node, 750, 1334, new Color(22, 2, 18), 0, 0, 0);
        const opacity = curtain.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity)
            .to(0.16, { opacity: 230 }, { easing: 'quadIn' })
            .call(() => this.buildAuth(registerMode))
            .start();
    }

    private createInput(parent: Node, placeholder: string, y: number, password: boolean): EditBox {
        const face = this.createSpriteNode(`Input_${placeholder}`, parent, 520, 78, 0, y, this.frames.get('login-input'));
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
        textLabel.lineHeight = 22;
        textLabel.color = Color.WHITE;
        textLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        textLabel.verticalAlign = Label.VerticalAlign.CENTER;
        placeholderLabel.fontSize = 15;
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
            tween(face).to(0.15, { scale: new Vec3(1.018, 1.018, 1) }, { easing: 'quadOut' }).start();
            tween(icon).to(0.15, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' }).start();
        });
        editNode.on(EditBox.EventType.EDITING_DID_ENDED, () => {
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
        if (sys.localStorage.getItem(this.rewardKey) === this.todayKey()) {
            this.showToast('TODAY\'S REWARD IS ALREADY CLAIMED');
            return;
        }
        this.currentUser.coins += 200;
        const accounts = this.readAccounts();
        accounts[this.currentUser.username] = this.currentUser;
        this.persistAccounts(accounts);
        sys.localStorage.setItem(this.rewardKey, this.todayKey());
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
        const samples: RankEntry[] = [
            { name: 'LunaGold', coins: 128500, avatar: 2 },
            { name: 'TigerMax', coins: 110800, avatar: 4 },
            { name: 'RubySpin', coins: 98600, avatar: 3 },
            { name: 'OceanAce', coins: 76400, avatar: 1 },
            { name: 'LuckyMia', coins: 65350, avatar: 5 },
            { name: 'Pharaoh7', coins: 52200, avatar: 0 },
            { name: 'CandyKing', coins: 41900, avatar: 4 },
            { name: 'NovaWays', coins: 33800, avatar: 2 },
        ];
        if (this.currentUser) samples.push({
            name: this.currentUser.username,
            coins: this.currentUser.coins,
            avatar: this.currentUser.avatar,
            current: true,
        });
        return samples.sort((left, right) => right.coins - left.coins);
    }

    private createPageTitle(title: string, subtitle: string): void {
        this.createLabel(title, this.pageRoot, 38, new Color(255, 214, 69), 0, 500, 650, 58, true);
        this.createLabel(subtitle, this.pageRoot, 13, new Color(255, 255, 255, 180), 0, 458, 620, 28, true);
        const line = this.createPanel('PageTitleLine', this.pageRoot, 220, 4, new Color(255, 198, 39), 0, 432, 2);
        line.setScale(0.1, 1, 1);
        tween(line).to(0.38, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private showToast(text: string): void {
        const old = this.node.getChildByName('Toast');
        if (old) old.destroy();
        const toast = this.createPanel('Toast', this.node, 580, 74, new Color(47, 8, 32, 248), 0, -450, 30);
        this.createOutlinePanel('ToastOutline', toast, 570, 64, new Color(255, 205, 56, 180), 0, 0, 26, 2);
        this.createCirclePanel('ToastDot', toast, 12, new Color(255, 201, 45), -248, 0);
        this.createLabel(text, toast, 14, Color.WHITE, 18, 0, 500, 44, true);
        const opacity = toast.addComponent(UIOpacity);
        opacity.opacity = 0;
        toast.setScale(0.82, 0.82, 1);
        tween(toast)
            .to(0.2, { scale: Vec3.ONE, position: new Vec3(0, -430, 0) }, { easing: 'backOut' })
            .delay(1.6)
            .to(0.22, { scale: new Vec3(0.88, 0.88, 1), position: new Vec3(0, -458, 0) })
            .call(() => toast.destroy())
            .start();
        tween(opacity).to(0.14, { opacity: 255 }).delay(1.65).to(0.22, { opacity: 0 }).start();
    }

    private async animateAmbientGold(version: number): Promise<void> {
        while (this.node.isValid && version === this.fxVersion) {
            const sparkle = this.createSparkle(
                `AmbientGold_${Date.now()}`,
                this.node,
                -330 + Math.random() * 660,
                -430 + Math.random() * 960,
                12 + Math.random() * 15,
            );
            const opacity = sparkle.addComponent(UIOpacity);
            opacity.opacity = 0;
            sparkle.setScale(0.12, 0.12, 1);
            tween(sparkle)
                .to(0.22, { scale: Vec3.ONE, angle: 38 })
                .to(0.42, { scale: new Vec3(0.08, 0.08, 1), angle: 95 })
                .call(() => sparkle.destroy())
                .start();
            tween(opacity).to(0.12, { opacity: 235 }).delay(0.2).to(0.3, { opacity: 0 }).start();
            await this.delay(260 + Math.random() * 230);
        }
    }

    private avatarFrame(index: number): SpriteFrame | undefined {
        return this.frames.get(`avatar-${(Math.abs(index) % 6) + 1}`) ?? this.frames.get('avatar-default');
    }

    private todayKey(): string {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
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
        const shadow = this.createSpriteNode('ArtworkButtonShadow', button, width, height, 0, -4, this.frames.get(artworkKey));
        shadow.getComponent(Sprite)!.color = new Color(42, 8, 22, 120);
        const artwork = this.createSpriteNode('ArtworkButtonFace', button, width, height, 0, 0, this.frames.get(artworkKey));
        artwork.getComponent(Sprite)!.color = tint;
        if (text) this.createLabel(text, button, fontSize, textColor, 0, 1, Math.max(80, width - 70), height - 16, true);
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
        const rim = this.createPanel(`ButtonRim_${text}`, parent, width, height, new Color(255, 207, 58), x, y, height / 2);
        const face = this.createPanel(`ButtonFace_${text}`, rim, width - 10, height - 10, color, 0, 0, height / 2 - 5);
        this.createPanel('ButtonGloss', face, Math.max(30, width - 44), 8, new Color(255, 255, 255, 54), 0, height * 0.2, 4);
        this.createLabel(text, face, fontSize, Color.WHITE, 0, 0, width - 20, height - 12, true);
        rim.addComponent(Button);
        rim.on(Button.EventType.CLICK, handler, this);
        this.bindPressMotion(rim);
        return rim;
    }

    private createSparkle(name: string, parent: Node, x: number, y: number, size: number): Node {
        const sparkle = new Node(name);
        parent.addChild(sparkle);
        sparkle.setPosition(x, y);
        this.ensureTransform(sparkle, size, size);
        this.createPanel('SparkleVertical', sparkle, Math.max(3, size * 0.14), size, Color.WHITE, 0, 0, 2);
        this.createPanel('SparkleHorizontal', sparkle, size, Math.max(3, size * 0.14), Color.WHITE, 0, 0, 2);
        this.createCirclePanel('SparkleCore', sparkle, Math.max(5, size * 0.28), new Color(255, 204, 55), 0, 0);
        return sparkle;
    }

    private bindPressMotion(node: Node): void {
        node.on(Node.EventType.TOUCH_START, () => {
            Tween.stopAllByTarget(node);
            tween(node).to(0.07, { scale: new Vec3(0.94, 0.94, 1) }, { easing: 'quadOut' }).start();
        });
        const release = () => {
            Tween.stopAllByTarget(node);
            tween(node).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        };
        node.on(Node.EventType.TOUCH_END, release);
        node.on(Node.EventType.TOUCH_CANCEL, release);
    }

    private pulse(node: Node, scale = 1.12): void {
        Tween.stopAllByTarget(node);
        tween(node).to(0.1, { scale: new Vec3(scale, scale, 1) }).to(0.2, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private ensureTransform(node: Node, width: number, height: number): UITransform {
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        return transform;
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }
}
