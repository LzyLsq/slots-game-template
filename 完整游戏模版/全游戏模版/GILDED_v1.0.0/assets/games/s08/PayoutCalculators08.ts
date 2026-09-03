import { SymbolConfig } from './GameConfigs08';

export interface WinningCell {
    reel: number;
    row: number;
}

export interface LineWin {
    lineIndex: number;
    symbol: SymbolConfig;
    count: number;
    ways: number;
    multiplier: number;
    payout: number;
    cells: WinningCell[];
}

export interface SpinOutcome {
    grid: SymbolConfig[][];
    reelHeights: number[];
    waysCount: number;
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

/** Six-reel, two-to-seven-row Megaways model. */
export class PayoutCalculators08 {
    public static readonly REELS = 6;
    public static readonly ROWS = 7;

    public static createOutcome(
        symbols: SymbolConfig[],
        bet: number,
        winRate: number,
        nearMissRate: number,
        random: () => number = Math.random,
    ): SpinOutcome {
        const reelHeights = Array.from({ length: this.REELS }, () => 2 + Math.floor(random() * 6));
        const waysCount = reelHeights.reduce((product, height) => product * height, 1);
        const buildGrid = (): SymbolConfig[][] => Array.from({ length: this.REELS }, () =>
            Array.from({ length: this.ROWS }, () => this.pickWeighted(symbols, random)),
        );
        let grid = buildGrid();
        const roll = random();
        let nearMiss = false;
        const bonus = symbols.find((symbol) => symbol.kind === 'bonus');
        const scatter = symbols.find((symbol) => symbol.kind === 'scatter');
        const payingSymbols = symbols.filter((symbol) =>
            symbol.kind !== 'bonus' && symbol.kind !== 'scatter' && symbol.kind !== 'wild',
        );

        if (bonus && roll < 0.025) {
            this.forceSpecial(grid, reelHeights, bonus, 4, random);
        } else if (scatter && roll < 0.06) {
            this.forceSpecial(grid, reelHeights, scatter, 4, random);
        } else if (roll < 0.06 + winRate) {
            const winner = this.pickWeighted(payingSymbols, random);
            const countRoll = random();
            const reelCount = countRoll < 0.58 ? 3 : countRoll < 0.84 ? 4 : countRoll < 0.96 ? 5 : 6;
            this.forceWaysWin(grid, reelHeights, winner, reelCount, random);
        } else if (roll < 0.06 + winRate + nearMissRate) {
            const almost = this.pickWeighted(payingSymbols, random);
            const replacementPool = payingSymbols.filter((symbol) => symbol.id !== almost.id);
            [0, 1].forEach((reel) => {
                const rows = this.activeRows(reelHeights[reel]);
                grid[reel][rows[Math.floor(random() * rows.length)]] = almost;
            });
            this.activeRows(reelHeights[2]).forEach((row) => {
                grid[2][row] = this.pickWeighted(replacementPool, random);
            });
            nearMiss = true;
        } else {
            for (let attempt = 0; attempt < 30; attempt += 1) {
                const evaluated = this.evaluate(grid, reelHeights, bet);
                if (evaluated.wins.length === 0 && evaluated.scatterCount < 4 && evaluated.bonusCount < 4) break;
                grid = buildGrid();
            }
        }

        const evaluated = this.evaluate(grid, reelHeights, bet);
        return {
            grid,
            reelHeights,
            waysCount,
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

    public static activeRows(height: number): number[] {
        const clampedHeight = Math.max(2, Math.min(this.ROWS, Math.round(height)));
        const start = Math.floor((this.ROWS - clampedHeight) / 2);
        return Array.from({ length: clampedHeight }, (_, index) => start + index);
    }

    private static evaluate(
        grid: SymbolConfig[][],
        reelHeights: number[],
        bet: number,
    ): Omit<SpinOutcome, 'grid' | 'reelHeights' | 'waysCount' | 'nearMiss'> {
        const wins: LineWin[] = [];
        const firstReelCandidates = new Map<string, SymbolConfig>();
        this.activeRows(reelHeights[0]).forEach((row) => {
            const symbol = grid[0][row];
            if (symbol.kind !== 'wild' && symbol.kind !== 'scatter' && symbol.kind !== 'bonus') {
                firstReelCandidates.set(symbol.id, symbol);
            }
        });

        [...firstReelCandidates.values()].forEach((candidate, candidateIndex) => {
            const cellsByReel: WinningCell[][] = [];
            for (let reel = 0; reel < this.REELS; reel += 1) {
                const matchingCells: WinningCell[] = [];
                this.activeRows(reelHeights[reel]).forEach((row) => {
                    const symbol = grid[reel][row];
                    if (symbol.id === candidate.id || symbol.kind === 'wild') {
                        matchingCells.push({ reel, row });
                    }
                });
                if (matchingCells.length === 0) break;
                cellsByReel.push(matchingCells);
            }
            const count = cellsByReel.length;
            if (count < 3) return;
            const ways = cellsByReel.reduce((total, cells) => total * cells.length, 1);
            const table = candidate.payouts;
            const multiplier = table
                ? count === 3 ? table.three : count === 4 ? table.four : count === 5 ? table.five : table.five * 2
                : candidate.multiplier * (count === 3 ? 1 : count === 4 ? 2 : count === 5 ? 4 : 8);
            const payout = Math.max(1, Math.round((bet * multiplier * ways) / 140));
            wins.push({
                lineIndex: candidateIndex,
                symbol: candidate,
                count,
                ways,
                multiplier,
                payout,
                cells: cellsByReel.reduce<WinningCell[]>((all, cells) => all.concat(cells), []),
            });
        });

        const winningCellMap = new Map<string, WinningCell>();
        wins.forEach((win) => win.cells.forEach((cell) => winningCellMap.set(`${cell.reel}:${cell.row}`, cell)));
        const payout = wins.reduce((total, win) => total + win.payout, 0);
        const flat: SymbolConfig[] = [];
        grid.forEach((column, reel) => {
            this.activeRows(reelHeights[reel]).forEach((row) => flat.push(column[row]));
        });
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

    private static forceWaysWin(
        grid: SymbolConfig[][],
        reelHeights: number[],
        symbol: SymbolConfig,
        reelCount: number,
        random: () => number,
    ): void {
        for (let reel = 0; reel < reelCount; reel += 1) {
            const rows = this.activeRows(reelHeights[reel]);
            for (let index = rows.length - 1; index > 0; index -= 1) {
                const target = Math.floor(random() * (index + 1));
                [rows[index], rows[target]] = [rows[target], rows[index]];
            }
            const matchLimit = Math.min(3, rows.length);
            const matches = reel === 0
                ? 1 + Math.floor(random() * Math.min(2, matchLimit))
                : 1 + Math.floor(random() * matchLimit);
            rows.slice(0, matches).forEach((row) => {
                grid[reel][row] = symbol;
            });
        }
    }

    private static forceSpecial(
        grid: SymbolConfig[][],
        reelHeights: number[],
        symbol: SymbolConfig,
        count: number,
        random: () => number,
    ): void {
        const positions: WinningCell[] = [];
        reelHeights.forEach((height, reel) => {
            this.activeRows(height).forEach((row) => positions.push({ reel, row }));
        });
        for (let index = positions.length - 1; index > 0; index -= 1) {
            const target = Math.floor(random() * (index + 1));
            [positions[index], positions[target]] = [positions[target], positions[index]];
        }
        positions.slice(0, count).forEach(({ reel, row }) => {
            grid[reel][row] = symbol;
        });
    }
}
