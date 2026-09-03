import { GameConfig, SymbolConfig } from './GameConfig';

export interface WinningCell {
    reel: number;
    row: number;
}

export interface WaysWin {
    symbol: SymbolConfig;
    reelCount: number;
    ways: number;
    payout: number;
    cells: WinningCell[];
}

export interface CashCell extends WinningCell {
    multiplier: number;
    value: number;
}

export interface SpinOutcome {
    grid: SymbolConfig[][];
    wins: WaysWin[];
    winningCells: WinningCell[];
    waysWin: number;
    cashCells: CashCell[];
    collectorCells: WinningCell[];
    collectWin: number;
    totalWin: number;
}

/** Pure TypeScript result generation and 1024-Ways evaluation. */
export class PayoutCalculator {
    public static createOutcome(
        config: GameConfig,
        bet: number,
        random: () => number = Math.random,
    ): SpinOutcome {
        const regularPool = config.symbols.filter((symbol) => symbol.kind === 'regular' || symbol.kind === 'wild');
        const coin = config.symbols.find((symbol) => symbol.kind === 'coin');
        const collector = config.symbols.find((symbol) => symbol.kind === 'collector');
        let grid = this.randomGrid(config, regularPool, random);
        const forceWays = random() < config.winRate;
        const forceCollect = random() < config.collectRate;

        if (forceWays) {
            const candidates = config.symbols.filter((symbol) => symbol.kind === 'regular');
            const winner = this.pickWeighted(candidates, random);
            const reelCountRoll = random();
            this.forceWaysWin(grid, winner, reelCountRoll < 0.68 ? 3 : reelCountRoll < 0.92 ? 4 : 5, random);
        } else {
            for (let attempt = 0; attempt < 14 && this.evaluateWays(grid, config, bet).waysWin > 0; attempt += 1) {
                grid = this.randomGrid(config, regularPool, random);
            }
        }

        const cashCells: CashCell[] = [];
        if (coin) {
            const coinCount = forceCollect ? 2 + Math.floor(random() * 5) : random() < 0.42 ? 1 + Math.floor(random() * 3) : 0;
            const positions = this.shuffledPositions(4, config.rows, random);
            positions.slice(0, coinCount).forEach((cell) => {
                grid[cell.reel][cell.row] = coin;
                const multiplier = this.pickCashMultiplier(config.cashMultipliers, random);
                cashCells.push({ ...cell, multiplier, value: Math.round(bet * multiplier) });
            });
        }

        const collectorCells: WinningCell[] = [];
        if (forceCollect && collector) {
            const count = random() < 0.12 ? 2 : 1;
            const rows = [0, 1, 2, 3];
            this.shuffle(rows, random);
            rows.slice(0, count).forEach((row) => {
                grid[config.columns - 1][row] = collector;
                collectorCells.push({ reel: config.columns - 1, row });
            });
        }

        const evaluation = this.evaluateWays(grid, config, bet);
        const collectWin = collectorCells.length > 0
            ? cashCells.reduce((sum, cell) => sum + cell.value, 0) * collectorCells.length
            : 0;
        return {
            grid,
            wins: evaluation.wins,
            winningCells: evaluation.winningCells,
            waysWin: evaluation.waysWin,
            cashCells,
            collectorCells,
            collectWin,
            totalWin: evaluation.waysWin + collectWin,
        };
    }

    public static randomGrid(
        config: GameConfig,
        pool: SymbolConfig[] = config.symbols.filter((symbol) => symbol.kind === 'regular' || symbol.kind === 'wild'),
        random: () => number = Math.random,
    ): SymbolConfig[][] {
        return Array.from({ length: config.columns }, () =>
            Array.from({ length: config.rows }, () => this.pickWeighted(pool, random)),
        );
    }

    public static pickWeighted(symbols: SymbolConfig[], random: () => number = Math.random): SymbolConfig {
        const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
        let cursor = random() * totalWeight;
        for (const symbol of symbols) {
            cursor -= symbol.weight;
            if (cursor <= 0) return symbol;
        }
        return symbols[symbols.length - 1];
    }

    public static evaluateWays(
        grid: SymbolConfig[][],
        config: GameConfig,
        bet: number,
    ): { wins: WaysWin[]; winningCells: WinningCell[]; waysWin: number } {
        const wins: WaysWin[] = [];
        const candidates = new Map<string, SymbolConfig>();
        grid[0].forEach((symbol) => {
            if (symbol.kind === 'regular') candidates.set(symbol.id, symbol);
        });
        for (const candidate of candidates.values()) {
            const cellsByReel: WinningCell[][] = [];
            for (let reel = 0; reel < config.columns; reel += 1) {
                const matches: WinningCell[] = [];
                grid[reel].forEach((symbol, row) => {
                    if (symbol.id === candidate.id || symbol.kind === 'wild') matches.push({ reel, row });
                });
                if (matches.length === 0) break;
                cellsByReel.push(matches);
            }
            if (cellsByReel.length < 3 || !candidate.payouts) continue;
            const reelCount = cellsByReel.length;
            const ways = cellsByReel.reduce((product, cells) => product * cells.length, 1);
            const multiplier = reelCount === 3 ? candidate.payouts.three : reelCount === 4 ? candidate.payouts.four : candidate.payouts.five;
            const payout = Math.max(1, Math.round(bet * multiplier * ways / 12));
            wins.push({
                symbol: candidate,
                reelCount,
                ways,
                payout,
                cells: cellsByReel.reduce<WinningCell[]>((all, cells) => all.concat(cells), []),
            });
        }
        const unique = new Map<string, WinningCell>();
        wins.forEach((win) => win.cells.forEach((cell) => unique.set(`${cell.reel}:${cell.row}`, cell)));
        return {
            wins,
            winningCells: [...unique.values()],
            waysWin: wins.reduce((sum, win) => sum + win.payout, 0),
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
            this.shuffle(rows, random);
            const matches = reel === 0 ? 1 + Math.floor(random() * 2) : 1 + Math.floor(random() * 3);
            rows.slice(0, matches).forEach((row) => { grid[reel][row] = symbol; });
        }
    }

    private static shuffledPositions(columns: number, rows: number, random: () => number): WinningCell[] {
        const positions: WinningCell[] = [];
        for (let reel = 0; reel < columns; reel += 1) {
            for (let row = 0; row < rows; row += 1) positions.push({ reel, row });
        }
        this.shuffle(positions, random);
        return positions;
    }

    private static pickCashMultiplier(options: number[], random: () => number): number {
        const roll = random();
        const index = roll < 0.5 ? Math.floor(random() * Math.min(3, options.length))
            : roll < 0.86 ? Math.floor(random() * Math.min(5, options.length))
                : Math.floor(random() * options.length);
        return options[Math.max(0, Math.min(options.length - 1, index))];
    }

    private static shuffle<T>(items: T[], random: () => number): void {
        for (let index = items.length - 1; index > 0; index -= 1) {
            const target = Math.floor(random() * (index + 1));
            [items[index], items[target]] = [items[target], items[index]];
        }
    }
}
