export type SymbolKind = 'regular' | 'wild' | 'scatter' | 'bonus';

export interface SymbolConfig {
    id: string;
    label: string;
    texture: string;
    weight: number;
    clusterValue: number;
    kind: SymbolKind;
}

export interface GameConfig {
    id: string;
    title: string;
    subtitle: string;
    initialCoins: number;
    defaultBet: number;
    betOptions: number[];
    winRate: number;
    minSpinDuration: number;
    reelStopDelay: number;
    columns: number;
    rows: number;
    minimumCluster: number;
    cascadeMultipliers: number[];
    forgeTarget: number;
    freeSpinsAward: number;
    visual: {
        cabinet: string;
        winStage: string;
        homeIcon: string;
        rulesIcon: string;
        soundIcon: string;
        addIcon: string;
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

const symbol = (id: string, label: string, weight: number, clusterValue: number, kind: SymbolKind = 'regular'): SymbolConfig => ({
    id,
    label,
    weight,
    clusterValue,
    kind,
    texture: `theme/aurum-forge/symbols/${id}/spriteFrame`,
});

export const FALLBACK_CATALOG: ThemeCatalog = {
    defaultTheme: 'aurum-forge',
    themes: ['aurum-forge'],
};

export const FALLBACK_CONFIG: GameConfig = {
    id: 'aurum-forge',
    title: 'AURUM FORGE',
    subtitle: 'CLUSTER TUMBLE',
    initialCoins: 5000,
    defaultBet: 50,
    betOptions: [20, 50, 100, 200, 500],
    winRate: 0.27,
    minSpinDuration: 0.68,
    reelStopDelay: 0.09,
    columns: 6,
    rows: 5,
    minimumCluster: 5,
    cascadeMultipliers: [1, 2, 3, 5, 8],
    forgeTarget: 40,
    freeSpinsAward: 6,
    visual: {
        cabinet: 'theme/aurum-forge/cabinet-v1/spriteFrame',
        winStage: 'theme/aurum-forge/fx/win-stage-v1/spriteFrame',
        homeIcon: 'theme/aurum-forge/controls/home/spriteFrame',
        rulesIcon: 'theme/aurum-forge/controls/rules/spriteFrame',
        soundIcon: 'theme/aurum-forge/controls/sound/spriteFrame',
        addIcon: 'theme/aurum-forge/controls/add/spriteFrame',
        autoIcon: 'theme/aurum-forge/controls/auto/spriteFrame',
        spinIcon: 'theme/aurum-forge/controls/spin/spriteFrame',
        accent: '#16A879',
        accentSecondary: '#FFD76A',
        reelPanel: '#063E31',
        cell: '#0C624A',
        text: '#FFF4C7',
    },
    symbols: [
        symbol('gold-ingots', 'GOLD INGOTS', 23, 0.8),
        symbol('emerald-crucible', 'EMERALD CRUCIBLE', 20, 1),
        symbol('ruby-gear', 'RUBY GEAR', 18, 1.2),
        symbol('sapphire-anvil', 'SAPPHIRE ANVIL', 16, 1.45),
        symbol('diamond-tongs', 'DIAMOND TONGS', 14, 1.8),
        symbol('liquid-coin', 'LIQUID GOLD', 11, 2.2),
        symbol('molten-wild', 'MOLTEN WILD', 5, 2.8, 'wild'),
        symbol('mint-press-scatter', 'FORGE SCATTER', 4, 0, 'scatter'),
        symbol('furnace-bonus', 'FURNACE BONUS', 3, 0, 'bonus'),
    ],
};
