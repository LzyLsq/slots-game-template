import { SymbolConfig } from './GameConfig';

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

/**
 * Five-reel, four-row 1024 Ways model.
 *
 * Matching symbols pay on adjacent reels from the left. Every matching
 * position on each reel multiplies the number of winning ways; WILD joins a
 * regular symbol's route. Scatter and bonus symbols are evaluated separately.
 */
export class PayoutCalculator {
    private static readonly REELS = 5;
    private static readonly ROWS = 4;

    public static createOutcome(
        symbols: SymbolConfig[],
        bet: number,
        winRate: number,
        nearMissRate: number,
        random: () => number = Math.random,
    ): SpinOutcome {
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

        if (bonus && roll < 0.022) {
            this.forceSpecial(grid, bonus, 3, random);
        } else if (scatter && roll < 0.057) {
            this.forceSpecial(grid, scatter, 3, random);
        } else if (roll < 0.057 + winRate) {
            const winner = this.pickWeighted(payingSymbols, random);
            const countRoll = random();
            const reelCount = countRoll < 0.68 ? 3 : countRoll < 0.92 ? 4 : 5;
            this.forceWaysWin(grid, winner, reelCount, random);
        } else if (roll < 0.057 + winRate + nearMissRate) {
            const almost = this.pickWeighted(payingSymbols, random);
            const replacementPool = payingSymbols.filter((symbol) => symbol.id !== almost.id);
            grid[0][Math.floor(random() * this.ROWS)] = almost;
            grid[1][Math.floor(random() * this.ROWS)] = almost;
            for (let row = 0; row < this.ROWS; row += 1) {
                grid[2][row] = this.pickWeighted(replacementPool, random);
            }
            nearMiss = true;
        } else {
            // A configured losing spin must not accidentally become a Ways
            // win or a three-special trigger.
            for (let attempt = 0; attempt < 24; attempt += 1) {
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
        const firstReelCandidates = new Map<string, SymbolConfig>();
        grid[0].forEach((symbol) => {
            if (symbol.kind !== 'wild' && symbol.kind !== 'scatter' && symbol.kind !== 'bonus') {
                firstReelCandidates.set(symbol.id, symbol);
            }
        });

        [...firstReelCandidates.values()].forEach((candidate, candidateIndex) => {
            const cellsByReel: WinningCell[][] = [];
            for (let reel = 0; reel < this.REELS; reel += 1) {
                const matchingCells: WinningCell[] = [];
                grid[reel].forEach((symbol, row) => {
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
                ? count === 3 ? table.three : count === 4 ? table.four : table.five
                : candidate.multiplier * (count === 3 ? 1 : count === 4 ? 2 : 4);
            // Normalize against 1024 possible routes so a normal three-reel
            // Ways hit can still pay below the bet while dense routes escalate.
            const payout = Math.max(1, Math.round((bet * multiplier * ways) / 80));
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

    private static forceWaysWin(
        grid: SymbolConfig[][],
        symbol: SymbolConfig,
        reelCount: number,
        random: () => number,
    ): void {
        for (let reel = 0; reel < reelCount; reel += 1) {
            const rows = [0, 1, 2, 3];
            for (let index = rows.length - 1; index > 0; index -= 1) {
                const target = Math.floor(random() * (index + 1));
                [rows[index], rows[target]] = [rows[target], rows[index]];
            }
            const matches = reel === 0 ? 1 + Math.floor(random() * 2) : 1 + Math.floor(random() * 3);
            rows.slice(0, matches).forEach((row) => {
                grid[reel][row] = symbol;
            });
        }
    }

    private static forceSpecial(
        grid: SymbolConfig[][],
        symbol: SymbolConfig,
        count: number,
        random: () => number,
    ): void {
        const positions = Array.from({ length: this.REELS * this.ROWS }, (_, index) => index);
        for (let index = positions.length - 1; index > 0; index -= 1) {
            const target = Math.floor(random() * (index + 1));
            [positions[index], positions[target]] = [positions[target], positions[index]];
        }
        positions.slice(0, count).forEach((position) => {
            const reel = Math.floor(position / this.ROWS);
            const row = position % this.ROWS;
            grid[reel][row] = symbol;
        });
    }
}
