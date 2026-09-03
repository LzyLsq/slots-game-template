export type SymbolKind = 'regular' | 'wild' | 'coin' | 'collector' | 'scatter';

export interface SymbolConfig {
    id: string;
    label: string;
    texture: string;
    weight: number;
    kind: SymbolKind;
    payouts?: { three: number; four: number; five: number };
}

export interface GameConfig {
    id: string;
    title: string;
    subtitle: string;
    initialCoins: number;
    defaultBet: number;
    betOptions: number[];
    winRate: number;
    collectRate: number;
    minSpinDuration: number;
    reelStopDelay: number;
    columns: number;
    rows: number;
    cashMultipliers: number[];
    visual: {
        cabinet: string;
        winStage: string;
        homeIcon: string;
        rulesIcon: string;
        soundIcon: string;
        addIcon: string;
        minusIcon: string;
        plusIcon: string;
        autoIcon: string;
        spinIcon: string;
        accent: string;
        accentSecondary: string;
        reelPanel: string;
        cell: string;
        text: string;
    };
    symbols: SymbolConfig[];
}

export interface ThemeCatalog {
    defaultTheme: string;
    themes: string[];
}

const texture = (id: string): string => `theme/sovereign-treasury/symbols/${id}/spriteFrame`;
const regular = (id: string, label: string, weight: number, three: number, four: number, five: number): SymbolConfig => ({
    id,
    label,
    texture: texture(id),
    weight,
    kind: 'regular',
    payouts: { three, four, five },
});

export const FALLBACK_CATALOG: ThemeCatalog = {
    defaultTheme: 'sovereign-treasury',
    themes: ['sovereign-treasury'],
};

export const FALLBACK_CONFIG: GameConfig = {
    id: 'sovereign-treasury',
    title: 'SOVEREIGN TREASURY',
    subtitle: 'CASH COLLECT',
    initialCoins: 5000,
    defaultBet: 50,
    betOptions: [20, 50, 100, 200, 500],
    winRate: 0.23,
    collectRate: 0.105,
    minSpinDuration: 0.72,
    reelStopDelay: 0.105,
    columns: 5,
    rows: 4,
    cashMultipliers: [1, 2, 3, 5, 8, 10, 15, 20],
    visual: {
        cabinet: 'theme/sovereign-treasury/cabinet-portrait-v3/spriteFrame',
        winStage: 'theme/sovereign-treasury/fx/win-stage-v1/spriteFrame',
        homeIcon: 'theme/sovereign-treasury/controls/home/spriteFrame',
        rulesIcon: 'theme/sovereign-treasury/controls/rules/spriteFrame',
        soundIcon: 'theme/sovereign-treasury/controls/sound/spriteFrame',
        addIcon: 'theme/sovereign-treasury/controls/add/spriteFrame',
        minusIcon: 'theme/sovereign-treasury/controls/minus/spriteFrame',
        plusIcon: 'theme/sovereign-treasury/controls/plus/spriteFrame',
        autoIcon: 'theme/sovereign-treasury/controls/auto/spriteFrame',
        spinIcon: 'theme/sovereign-treasury/controls/spin/spriteFrame',
        accent: '#8C1833',
        accentSecondary: '#F6D275',
        reelPanel: '#07362A',
        cell: '#0B4B3A',
        text: '#FFF3C4',
    },
    symbols: [
        regular('gold-ingots', 'GOLD INGOTS', 24, 0.7, 1.5, 3.5),
        regular('ruby-signet', 'RUBY SIGNET', 21, 0.9, 2.0, 4.5),
        regular('sapphire-watch', 'SAPPHIRE WATCH', 18, 1.1, 2.5, 6.0),
        regular('emerald-lockbox', 'EMERALD LOCKBOX', 15, 1.5, 3.5, 8.0),
        regular('diamond-key', 'DIAMOND KEY', 12, 2.0, 5.0, 12.0),
        regular('platinum-lion', 'PLATINUM LION', 9, 3.0, 8.0, 20.0),
        { id: 'vault-wild', label: 'VAULT WILD', texture: texture('vault-wild'), weight: 5, kind: 'wild' },
        { id: 'sovereign-coin', label: 'CASH COIN', texture: texture('sovereign-coin'), weight: 6, kind: 'coin' },
        { id: 'collector-chest', label: 'COLLECTOR', texture: texture('collector-chest'), weight: 2, kind: 'collector' },
    ],
};
