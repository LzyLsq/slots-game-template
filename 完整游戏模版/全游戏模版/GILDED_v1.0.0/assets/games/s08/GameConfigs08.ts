export interface SymbolConfig {
    id: string;
    texture: string;
    weight: number;
    multiplier: number;
    kind?: 'regular' | 'wild' | 'scatter' | 'coin' | 'bonus';
    payouts?: {
        three: number;
        four: number;
        five: number;
    };
}

export interface ThemeVisualConfig {
    background: string;
    topCoin: string;
    titleLogo?: string;
    homeIcon?: string;
    soundIcon?: string;
    rulesIcon?: string;
    addCoinIcon?: string;
    autoIcon?: string;
    betIcon?: string;
    winStage?: string;
    wheelStage?: string;
    wheelDial?: string;
    loadingBackground?: string;
    loadingLogo?: string;
    loadingMascot?: string;
    loadingFoods?: string[];
    loadingDecorations?: string[];
    loadingProgressBackground?: string;
    loadingProgressFill?: string;
    winFlare?: string;
    winLight?: string;
    winMagic?: string;
    winStar?: string;
    winSpark?: string;
    winTrophy?: string;
    winMedal?: string;
    winFrame?: string;
    winGoldRing?: string;
    winVerticalGlow?: string;
    winAuraRays?: string;
    winMagicStar?: string;
    winRingRipple?: string;
    winLightRing?: string;
    winHitLine?: string;
    winCommonHalo?: string;
    winTrailingLight?: string;
    layout?: ThemeLayoutConfig;
    accent: string;
    accentSecondary: string;
    panel: string;
    reelPanel: string;
    cell: string;
    text: string;
}

export interface ThemeLayoutConfig {
    titleY?: number;
    subtitleY?: number;
    coinBarY?: number;
    reelPanelY?: number;
    resultY?: number;
    utilityY?: number;
    controlsY?: number;
    footerY?: number;
}

export interface ThemeCopyConfig {
    autoStart?: string;
    autoStop?: string;
    soundOn?: string;
    soundOff?: string;
    rulesLabel?: string;
    rulesTitle?: string;
    rulesMatch?: string;
    rulesFormula?: string;
    meterLabel?: string;
    idle?: string;
    betLabel?: string;
    spinLabel?: string;
    footer?: string;
    loadingEyebrow?: string;
    loadingFeatures?: string[];
    loadingInitial?: string;
    loadingStages?: string[];
    loadingReady?: string;
    loadingTip?: string;
    insufficientCoins?: string;
    spinStart?: string;
    winPrefix?: string;
    nearMiss?: string;
    lose?: string;
    regularWinTitle?: string;
    bigWinTitle?: string;
    jackpotTitle?: string;
}

export interface WinTierConfig {
    bigWinMultiplier?: number;
    jackpotMultiplier?: number;
}

export interface GameConfig {
    id: string;
    title: string;
    subtitle: string;
    initialCoins: number;
    defaultBet: number;
    betOptions: number[];
    winRate: number;
    nearMissRate: number;
    minSpinDuration: number;
    reelStopDelay: number;
    reelCount?: number;
    rowCount?: number;
    waysCount?: number;
    paylineCount?: number;
    coinTarget?: number;
    freeSpinsAward?: number;
    copy?: ThemeCopyConfig;
    winTiers?: WinTierConfig;
    visual: ThemeVisualConfig;
    symbols: SymbolConfig[];
}

export interface ThemeCatalog {
    defaultTheme: string;
    themes: string[];
}

export const FALLBACK_CATALOG: ThemeCatalog = {
    defaultTheme: 'royal-diamond',
    themes: ['royal-diamond'],
};

export const FALLBACK_CONFIG: GameConfig = {
    id: 'fruit',
    title: 'FRUIT FORTUNE',
    subtitle: 'CLASSIC FRUIT SLOT',
    initialCoins: 1000,
    defaultBet: 10,
    betOptions: [10, 20, 50, 100],
    winRate: 0.09,
    nearMissRate: 0.14,
    minSpinDuration: 0.72,
    reelStopDelay: 0.22,
    visual: {
        background: 'theme/classic/background/spriteFrame',
        topCoin: 'theme/classic/top-coin/spriteFrame',
        accent: '#FF6B36',
        accentSecondary: '#FFE573',
        panel: '#21114D',
        reelPanel: '#1E0D41',
        cell: '#FFF7FF',
        text: '#FFF0AC',
    },
    symbols: [
        { id: 'apple', texture: 'theme/classic/apple/spriteFrame', weight: 30, multiplier: 3 },
        { id: 'lemon', texture: 'theme/classic/lemon/spriteFrame', weight: 26, multiplier: 4 },
        { id: 'strawberry', texture: 'theme/classic/strawberry/spriteFrame', weight: 20, multiplier: 6 },
        { id: 'watermelon', texture: 'theme/classic/watermelon/spriteFrame', weight: 14, multiplier: 10 },
        { id: 'gift', texture: 'theme/classic/gift/spriteFrame', weight: 7, multiplier: 20 },
        { id: 'coin', texture: 'theme/classic/coin/spriteFrame', weight: 3, multiplier: 50 },
    ],
};
