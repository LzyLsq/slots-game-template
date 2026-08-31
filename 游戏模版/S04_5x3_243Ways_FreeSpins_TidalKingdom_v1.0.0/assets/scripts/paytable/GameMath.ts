import { SeededRNG } from '../core/SeededRNG';

export enum SymbolId {
    Pearl = 'pearl',
    Coral = 'coral',
    SpiralShell = 'spiralShell',
    Seahorse = 'seahorse',
    Starfish = 'starfish',
    Nautilus = 'nautilus',
    Compass = 'compass',
    Trident = 'trident',
    Crown = 'crown',
    Throne = 'throne',
    Wild = 'wild',
    Scatter = 'scatter',
}

export type Grid = SymbolId[][];

export interface WaysWin {
    symbol: SymbolId;
    reels: number;
    ways: number;
    credits: number;
    cells: [number, number][];
}

export interface SpinResult {
    seed: number;
    grid: Grid;
    waysWins: WaysWin[];
    winningWays: number;
    scatterCount: number;
    freeSpinsAwarded: number;
    totalWin: number;
}

const PAY_MULTIPLIERS: Record<SymbolId, [number, number, number]> = {
    pearl: [0.18, 0.5, 1.6], coral: [0.2, 0.65, 2], spiralShell: [0.24, 0.8, 2.5],
    seahorse: [0.28, 0.95, 3], starfish: [0.34, 1.15, 3.8], nautilus: [0.42, 1.5, 5],
    compass: [0.55, 2, 7], trident: [0.75, 2.8, 10], crown: [1, 4, 15],
    throne: [1.4, 5.5, 22], wild: [1.8, 7.5, 30], scatter: [0, 0, 0],
};

const STRIP: SymbolId[] = [
    SymbolId.Pearl, SymbolId.Coral, SymbolId.SpiralShell, SymbolId.Pearl, SymbolId.Seahorse,
    SymbolId.Starfish, SymbolId.Coral, SymbolId.Nautilus, SymbolId.Pearl, SymbolId.SpiralShell,
    SymbolId.Compass, SymbolId.Coral, SymbolId.Seahorse, SymbolId.Pearl, SymbolId.Trident,
    SymbolId.Starfish, SymbolId.SpiralShell, SymbolId.Crown, SymbolId.Coral, SymbolId.Nautilus,
    SymbolId.Pearl, SymbolId.Throne, SymbolId.Seahorse, SymbolId.Starfish, SymbolId.Wild,
    SymbolId.Coral, SymbolId.SpiralShell, SymbolId.Compass, SymbolId.Pearl, SymbolId.Nautilus,
    SymbolId.Seahorse, SymbolId.Trident, SymbolId.Coral, SymbolId.Starfish, SymbolId.Crown,
    SymbolId.Pearl, SymbolId.SpiralShell, SymbolId.Scatter, SymbolId.Coral, SymbolId.Wild,
    SymbolId.Seahorse, SymbolId.Pearl, SymbolId.Nautilus, SymbolId.Starfish, SymbolId.Throne,
];

const PAYING_SYMBOLS = Object.values(SymbolId).filter((symbol) => symbol !== SymbolId.Scatter);

export class WaysEvaluator {
    evaluate(grid: Grid, bet: number): WaysWin[] {
        const wins: WaysWin[] = [];
        for (const symbol of PAYING_SYMBOLS) {
            const reelMatches: number[][] = [];
            for (let column = 0; column < 5; column += 1) {
                const rows = grid[column]
                    .map((value, row) => ({ value, row }))
                    .filter(({ value }) => value === symbol || (symbol !== SymbolId.Wild && value === SymbolId.Wild))
                    .map(({ row }) => row);
                if (rows.length === 0) break;
                reelMatches.push(rows);
            }
            if (reelMatches.length < 3) continue;
            const reels = Math.min(5, reelMatches.length);
            const ways = reelMatches.slice(0, reels).reduce((total, rows) => total * rows.length, 1);
            const multiplier = PAY_MULTIPLIERS[symbol][reels - 3];
            const credits = Math.max(1, Math.round(bet * multiplier * ways * 0.78));
            const cells = reelMatches.slice(0, reels)
                .flatMap((rows, column) => rows.map((row): [number, number] => [column, row]));
            wins.push({ symbol, reels, ways, credits, cells });
        }
        return wins;
    }
}

export class ResultGenerator {
    constructor(private rng: SeededRNG, private evaluator = new WaysEvaluator()) {}

    generate(bet: number, forceFreeSpins = false): SpinResult {
        const seed = this.rng.seedState;
        const grid: Grid = [];
        for (let column = 0; column < 5; column += 1) {
            const stop = this.rng.int(STRIP.length);
            grid[column] = [
                STRIP[stop],
                STRIP[(stop + 11 + column) % STRIP.length],
                STRIP[(stop + 27 + column * 2) % STRIP.length],
            ];
        }

        if (forceFreeSpins) [0, 2, 4].forEach((column) => { grid[column][this.rng.int(3)] = SymbolId.Scatter; });

        const waysWins = this.evaluator.evaluate(grid, bet);
        const scatterCount = grid.flat().filter((symbol) => symbol === SymbolId.Scatter).length;
        const scatterWin = scatterCount >= 3 ? Math.round(bet * Math.min(16, 1.5 + (scatterCount - 3) * 2.4)) : 0;
        const freeSpinsAwarded = scatterCount >= 5 ? 15 : scatterCount === 4 ? 12 : scatterCount === 3 ? 8 : 0;
        return {
            seed,
            grid,
            waysWins,
            winningWays: waysWins.reduce((sum, win) => sum + win.ways, 0),
            scatterCount,
            freeSpinsAwarded,
            totalWin: waysWins.reduce((sum, win) => sum + win.credits, 0) + scatterWin,
        };
    }
}
