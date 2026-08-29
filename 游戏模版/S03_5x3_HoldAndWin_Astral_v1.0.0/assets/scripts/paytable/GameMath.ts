import { SeededRNG } from '../core/SeededRNG';

export enum SymbolId {
    Amethyst = 'amethyst',
    Ruby = 'ruby',
    Sapphire = 'sapphire',
    Emerald = 'emerald',
    Topaz = 'topaz',
    Moonstone = 'moonstone',
    Scepter = 'scepter',
    Astrolabe = 'astrolabe',
    Crown = 'crown',
    Chalice = 'chalice',
    Wild = 'wild',
    Scatter = 'scatter',
    Bonus = 'bonus',
}

export type Grid = SymbolId[][];

export interface LineWin {
    line: number;
    symbol: SymbolId;
    count: number;
    credits: number;
    cells: [number, number][];
}

export interface SpinResult {
    seed: number;
    grid: Grid;
    lineWins: LineWin[];
    scatterCount: number;
    bonus: boolean;
    bonusPositions: number[];
    totalWin: number;
}

export const PAYLINES: number[][] = [
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
    [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1],
    [0, 1, 2, 2, 2], [2, 1, 0, 0, 0], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [1, 1, 0, 1, 1],
];

const PAY_VALUES: Record<SymbolId, [number, number, number]> = {
    amethyst: [6, 15, 45], ruby: [6, 18, 54], sapphire: [9, 24, 72], emerald: [9, 30, 90],
    topaz: [12, 36, 120], moonstone: [15, 48, 150], scepter: [18, 66, 210], astrolabe: [24, 84, 270],
    crown: [30, 120, 420], chalice: [36, 150, 540], wild: [45, 210, 750], scatter: [0, 0, 0], bonus: [0, 0, 0],
};

const STRIP: SymbolId[] = [
    SymbolId.Amethyst, SymbolId.Ruby, SymbolId.Sapphire, SymbolId.Emerald, SymbolId.Topaz,
    SymbolId.Amethyst, SymbolId.Moonstone, SymbolId.Ruby, SymbolId.Scepter, SymbolId.Emerald,
    SymbolId.Amethyst, SymbolId.Topaz, SymbolId.Astrolabe, SymbolId.Ruby, SymbolId.Crown,
    SymbolId.Sapphire, SymbolId.Chalice, SymbolId.Amethyst, SymbolId.Moonstone, SymbolId.Wild,
    SymbolId.Ruby, SymbolId.Scatter, SymbolId.Emerald, SymbolId.Topaz, SymbolId.Amethyst,
];

export class PaylineEvaluator {
    evaluate(grid: Grid, betPerLine: number): LineWin[] {
        const wins: LineWin[] = [];
        PAYLINES.forEach((rows, line) => {
            let base: SymbolId | undefined;
            let count = 0;
            const cells: [number, number][] = [];
            for (let column = 0; column < 5; column += 1) {
                const symbol = grid[column][rows[column]];
                if (symbol === SymbolId.Scatter || symbol === SymbolId.Bonus) break;
                if (!base && symbol !== SymbolId.Wild) base = symbol;
                const target = base ?? SymbolId.Wild;
                if (symbol === target || symbol === SymbolId.Wild) {
                    count += 1;
                    cells.push([column, rows[column]]);
                } else {
                    break;
                }
            }
            if (count >= 3) {
                const symbol = base ?? SymbolId.Wild;
                wins.push({
                    line: line + 1,
                    symbol,
                    count,
                    credits: Math.round(PAY_VALUES[symbol][count - 3] * betPerLine),
                    cells,
                });
            }
        });
        return wins;
    }
}

export class ResultGenerator {
    constructor(private rng: SeededRNG, private evaluator = new PaylineEvaluator()) {}

    generate(bet: number, forceBonus = false): SpinResult {
        const seed = this.rng.seedState;
        const grid: Grid = [];
        for (let column = 0; column < 5; column += 1) {
            const stop = this.rng.int(STRIP.length);
            grid[column] = [STRIP[stop], STRIP[(stop + 1) % STRIP.length], STRIP[(stop + 2) % STRIP.length]];
        }

        const bonusPositions: number[] = [];
        const triggerBonus = forceBonus || this.rng.next() < 0.0085;
        if (triggerBonus) {
            const target = 6 + this.rng.int(3);
            while (bonusPositions.length < target) {
                const position = this.rng.int(15);
                if (!bonusPositions.includes(position)) bonusPositions.push(position);
            }
        } else {
            for (let position = 0; position < 15; position += 1) {
                if (this.rng.next() < 0.018 && bonusPositions.length < 5) bonusPositions.push(position);
            }
        }
        bonusPositions.forEach((position) => {
            const column = position % 5;
            const row = Math.floor(position / 5);
            grid[column][row] = SymbolId.Bonus;
        });

        const lineWins = this.evaluator.evaluate(grid, bet / 20);
        const scatterCount = grid.flat().filter((symbol) => symbol === SymbolId.Scatter).length;
        const scatterWin = scatterCount >= 3 ? bet * (scatterCount - 1) : 0;
        const totalWin = lineWins.reduce((sum, win) => sum + win.credits, 0) + scatterWin;
        return {
            seed,
            grid,
            lineWins,
            scatterCount,
            bonus: bonusPositions.length >= 6,
            bonusPositions,
            totalWin,
        };
    }
}
