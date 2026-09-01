import { SymbolConfig } from './GameConfig';

export interface WinningCell {
    reel: number;
    row: number;
}

export interface LineWin {
    lineIndex: number;
    symbol: SymbolConfig;
    count: number;
    multiplier: number;
    payout: number;
    cells: WinningCell[];
}

export interface SpinOutcome {
    grid: SymbolConfig[][];
    wins: LineWin[];
    winningCells: WinningCell[];
    winSymbol: SymbolConfig | null;
    winMultiplier: number;
    payout: number;
    nearMiss: boolean;
    scatterCount: number;
    coinCount: number;
    bonusCount: number;
}

/** Ten readable fixed lines for a classic five-reel cabinet. */
export const PAYLINES: number[][] = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 0],
];

export class PayoutCalculator {
    public static createOutcome(
        symbols: SymbolConfig[],
        bet: number,
        winRate: number,
        nearMissRate: number,
        random: () => number = Math.random,
    ): SpinOutcome {
        const buildGrid = (): SymbolConfig[][] => Array.from({ length: 5 }, () =>
            Array.from({ length: 3 }, () => this.pickWeighted(symbols, random)),
        );
        let grid = buildGrid();
        const roll = random();
        let nearMiss = false;
        const bonus = symbols.find((symbol) => symbol.kind === 'bonus');
        const scatter = symbols.find((symbol) => symbol.kind === 'scatter');
        const regulars = symbols.filter((symbol) => symbol.kind !== 'bonus' && symbol.kind !== 'scatter' && symbol.kind !== 'wild');

        if (bonus && roll < 0.025) {
            this.forceSpecial(grid, bonus, 3, random);
        } else if (scatter && roll < 0.065) {
            this.forceSpecial(grid, scatter, 3, random);
        } else if (roll < 0.065 + winRate) {
            const line = PAYLINES[Math.floor(random() * PAYLINES.length)];
            const winner = this.pickWeighted(regulars, random);
            const countRoll = random();
            const count = countRoll < 0.7 ? 3 : countRoll < 0.92 ? 4 : 5;
            for (let reel = 0; reel < count; reel += 1) grid[reel][line[reel]] = winner;
        } else if (roll < 0.065 + winRate + nearMissRate) {
            const line = PAYLINES[Math.floor(random() * PAYLINES.length)];
            const almost = this.pickWeighted(regulars, random);
            grid[0][line[0]] = almost;
            grid[1][line[1]] = almost;
            grid[2][line[2]] = this.pickDifferent(regulars, almost.id, random);
            nearMiss = true;
        } else {
            // Losing spins are regenerated so a configured non-win does not
            // accidentally become a payline or three-special trigger.
            for (let attempt = 0; attempt < 16; attempt += 1) {
                const evaluated = this.evaluate(grid, bet);
                if (evaluated.wins.length === 0 && evaluated.scatterCount < 3 && evaluated.bonusCount < 3) break;
                grid = buildGrid();
            }
        }

        const evaluated = this.evaluate(grid, bet);
        return {
            grid,
            ...evaluated,
            nearMiss: nearMiss && evaluated.payout === 0,
        };
    }

    public static pickWeighted(symbols: SymbolConfig[], random: () => number = Math.random): SymbolConfig {
        const total = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
        let cursor = random() * total;
        for (const symbol of symbols) {
            cursor -= symbol.weight;
            if (cursor <= 0) return symbol;
        }
        return symbols[symbols.length - 1];
    }

    private static evaluate(grid: SymbolConfig[][], bet: number): Omit<SpinOutcome, 'grid' | 'nearMiss'> {
        const wins: LineWin[] = [];
        const lineBet = Math.max(1, bet / PAYLINES.length);
        PAYLINES.forEach((rows, lineIndex) => {
            const sequence = rows.map((row, reel) => grid[reel][row]);
            const candidate = sequence.find((symbol) => symbol.kind !== 'wild') ?? sequence[0];
            if (!candidate || candidate.kind === 'scatter' || candidate.kind === 'bonus') return;
            let count = 0;
            for (const symbol of sequence) {
                if (symbol.id === candidate.id || symbol.kind === 'wild') count += 1;
                else break;
            }
            if (count < 3) return;
            const table = candidate.payouts;
            const multiplier = table
                ? count === 3 ? table.three : count === 4 ? table.four : table.five
                : candidate.multiplier * (count === 3 ? 1 : count === 4 ? 2 : 4);
            const payout = Math.max(1, Math.round(lineBet * multiplier));
            wins.push({
                lineIndex,
                symbol: candidate,
                count,
                multiplier,
                payout,
                cells: Array.from({ length: count }, (_, reel) => ({ reel, row: rows[reel] })),
            });
        });
        const winningCellMap = new Map<string, WinningCell>();
        wins.forEach((win) => win.cells.forEach((cell) => winningCellMap.set(`${cell.reel}:${cell.row}`, cell)));
        const payout = wins.reduce((total, win) => total + win.payout, 0);
        const flat = grid.reduce<SymbolConfig[]>((items, column) => items.concat(column), []);
        return {
            wins,
            winningCells: [...winningCellMap.values()],
            winSymbol: wins[0]?.symbol ?? null,
            winMultiplier: bet > 0 ? payout / bet : 0,
            payout,
            scatterCount: flat.filter((symbol) => symbol.kind === 'scatter').length,
            coinCount: flat.filter((symbol) => symbol.kind === 'coin').length,
            bonusCount: flat.filter((symbol) => symbol.kind === 'bonus').length,
        };
    }

    private static forceSpecial(grid: SymbolConfig[][], symbol: SymbolConfig, count: number, random: () => number): void {
        const reels = [0, 1, 2, 3, 4];
        for (let index = reels.length - 1; index > 0; index -= 1) {
            const target = Math.floor(random() * (index + 1));
            [reels[index], reels[target]] = [reels[target], reels[index]];
        }
        reels.slice(0, count).forEach((reel) => {
            grid[reel][Math.floor(random() * 3)] = symbol;
        });
    }

    private static pickDifferent(symbols: SymbolConfig[], excludedId: string, random: () => number): SymbolConfig {
        return this.pickWeighted(symbols.filter((symbol) => symbol.id !== excludedId), random);
    }
}
