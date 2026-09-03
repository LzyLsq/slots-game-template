import { GameConfig, SymbolConfig } from './GameConfig';

export interface GridCell {
    column: number;
    row: number;
}

export interface ClusterWin {
    symbol: SymbolConfig;
    cells: GridCell[];
    payout: number;
}

export interface GridEvaluation {
    wins: ClusterWin[];
    totalWin: number;
    removed: Set<string>;
    scatterCount: number;
    bonusCount: number;
}

export interface SpinOutcome {
    grid: SymbolConfig[][];
    freeSpinsAwarded: number;
    bonusAward: number;
}

/** Pure TypeScript cluster math. No scene objects or Cocos APIs live here. */
export class PayoutCalculator {
    public static createOutcome(
        config: GameConfig,
        bet: number,
        random: () => number = Math.random,
        forceFeature = false,
    ): SpinOutcome {
        const grid = this.randomGrid(config, random);
        const roll = random();

        if (roll < config.winRate) {
            this.forceCluster(grid, config, random);
        } else {
            this.breakClusters(grid, config, random);
        }

        if (forceFeature || roll > 0.955) {
            this.forceSpecial(grid, config, 'scatter', 3, random);
        } else if (roll > 0.915) {
            this.forceSpecial(grid, config, 'bonus', 3, random);
        }

        const scatterCount = this.countKind(grid, 'scatter');
        const bonusCount = this.countKind(grid, 'bonus');
        return {
            grid,
            freeSpinsAwarded: scatterCount >= 3 ? config.freeSpinsAward : 0,
            bonusAward: bonusCount >= 3 ? Math.round(bet * (8 + Math.min(3, bonusCount - 3) * 4)) : 0,
        };
    }

    public static evaluate(
        grid: SymbolConfig[][],
        config: GameConfig,
        bet: number,
        cascadeMultiplier: number,
    ): GridEvaluation {
        const candidates: ClusterWin[] = [];
        const regularSymbols = config.symbols.filter((symbol) => symbol.kind === 'regular');

        for (const target of regularSymbols) {
            const visited = new Set<string>();
            for (let column = 0; column < config.columns; column += 1) {
                for (let row = 0; row < config.rows; row += 1) {
                    const key = this.key(column, row);
                    if (visited.has(key) || !this.matches(grid[column][row], target)) continue;
                    const cells = this.flood(grid, config, target, column, row, visited);
                    const hasNatural = cells.some((cell) => grid[cell.column][cell.row].id === target.id);
                    if (!hasNatural || cells.length < config.minimumCluster) continue;
                    candidates.push({
                        symbol: target,
                        cells,
                        payout: this.clusterPayout(bet, target.clusterValue, cells.length, cascadeMultiplier),
                    });
                }
            }
        }

        // A WILD can connect more than one candidate. Present the highest-value
        // cluster first and avoid paying the same physical cell twice.
        candidates.sort((left, right) => right.payout - left.payout || right.cells.length - left.cells.length);
        const occupied = new Set<string>();
        const wins: ClusterWin[] = [];
        for (const candidate of candidates) {
            const uniqueCells = candidate.cells.filter((cell) => !occupied.has(this.key(cell.column, cell.row)));
            if (uniqueCells.length < config.minimumCluster) continue;
            candidate.cells = uniqueCells;
            candidate.payout = this.clusterPayout(
                bet,
                candidate.symbol.clusterValue,
                uniqueCells.length,
                cascadeMultiplier,
            );
            uniqueCells.forEach((cell) => occupied.add(this.key(cell.column, cell.row)));
            wins.push(candidate);
        }

        return {
            wins,
            totalWin: wins.reduce((total, win) => total + win.payout, 0),
            removed: occupied,
            scatterCount: this.countKind(grid, 'scatter'),
            bonusCount: this.countKind(grid, 'bonus'),
        };
    }

    public static tumble(
        grid: SymbolConfig[][],
        removed: Set<string>,
        config: GameConfig,
        random: () => number = Math.random,
    ): { grid: SymbolConfig[][]; dropRows: number[][] } {
        const next: SymbolConfig[][] = [];
        const dropRows: number[][] = [];
        for (let column = 0; column < config.columns; column += 1) {
            const survivors: SymbolConfig[] = [];
            for (let row = config.rows - 1; row >= 0; row -= 1) {
                if (!removed.has(this.key(column, row))) survivors.unshift(grid[column][row]);
            }
            const missing = config.rows - survivors.length;
            const newColumn: SymbolConfig[] = [];
            const distances: number[] = [];
            for (let row = 0; row < config.rows; row += 1) {
                if (row < missing) {
                    newColumn.push(this.pickWeighted(config.symbols, random));
                    distances.push(missing - row + 1);
                } else {
                    newColumn.push(survivors[row - missing]);
                    distances.push(missing);
                }
            }
            next.push(newColumn);
            dropRows.push(distances);
        }
        return { grid: next, dropRows };
    }

    public static randomGrid(config: GameConfig, random: () => number = Math.random): SymbolConfig[][] {
        const grid: SymbolConfig[][] = [];
        for (let column = 0; column < config.columns; column += 1) {
            const reel: SymbolConfig[] = [];
            for (let row = 0; row < config.rows; row += 1) {
                reel.push(this.pickWeighted(config.symbols, random));
            }
            grid.push(reel);
        }
        return grid;
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

    private static matches(symbol: SymbolConfig, target: SymbolConfig): boolean {
        return symbol.id === target.id || symbol.kind === 'wild';
    }

    private static flood(
        grid: SymbolConfig[][],
        config: GameConfig,
        target: SymbolConfig,
        startColumn: number,
        startRow: number,
        visited: Set<string>,
    ): GridCell[] {
        const queue: GridCell[] = [{ column: startColumn, row: startRow }];
        const cells: GridCell[] = [];
        visited.add(this.key(startColumn, startRow));
        let head = 0;
        while (head < queue.length) {
            const current = queue[head];
            head += 1;
            cells.push(current);
            const neighbors = (
                [
                    [current.column - 1, current.row],
                    [current.column + 1, current.row],
                    [current.column, current.row - 1],
                    [current.column, current.row + 1],
                ] as const
            );
            for (const [column, row] of neighbors) {
                if (column < 0 || row < 0 || column >= config.columns || row >= config.rows) continue;
                const key = this.key(column, row);
                if (visited.has(key) || !this.matches(grid[column][row], target)) continue;
                visited.add(key);
                queue.push({ column, row });
            }
        }
        return cells;
    }

    private static clusterPayout(bet: number, value: number, size: number, multiplier: number): number {
        const sizeFactor = size >= 15 ? 10 : size >= 12 ? 6 : size >= 10 ? 4 : size >= 8 ? 2.5 : size >= 6 ? 1.4 : 1;
        return Math.max(1, Math.round(bet * value * sizeFactor * multiplier * 0.45));
    }

    private static forceCluster(
        grid: SymbolConfig[][],
        config: GameConfig,
        random: () => number,
    ): void {
        const candidates = config.symbols.filter((symbol) => symbol.kind === 'regular');
        const winner = candidates[Math.floor(random() * candidates.length)];
        const targetSize = config.minimumCluster + Math.floor(random() * 5);
        const selected: GridCell[] = [{
            column: 1 + Math.floor(random() * Math.max(1, config.columns - 2)),
            row: 1 + Math.floor(random() * Math.max(1, config.rows - 2)),
        }];
        const used = new Set<string>([this.key(selected[0].column, selected[0].row)]);

        while (selected.length < targetSize) {
            const anchor = selected[Math.floor(random() * selected.length)];
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            const [dx, dy] = directions[Math.floor(random() * directions.length)];
            const column = anchor.column + dx;
            const row = anchor.row + dy;
            const key = this.key(column, row);
            if (column < 0 || row < 0 || column >= config.columns || row >= config.rows || used.has(key)) continue;
            used.add(key);
            selected.push({ column, row });
        }
        selected.forEach((cell, index) => {
            const useWild = index === selected.length - 1 && selected.length >= 7 && random() < 0.35;
            grid[cell.column][cell.row] = useWild
                ? config.symbols.find((symbol) => symbol.kind === 'wild') ?? winner
                : winner;
        });
    }

    private static breakClusters(
        grid: SymbolConfig[][],
        config: GameConfig,
        random: () => number,
    ): void {
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const evaluation = this.evaluate(grid, config, config.defaultBet, 1);
            if (evaluation.wins.length === 0) return;
            for (const win of evaluation.wins) {
                for (const cell of win.cells) {
                    grid[cell.column][cell.row] = this.pickWeighted(
                        config.symbols.filter((symbol) => symbol.id !== win.symbol.id && symbol.kind === 'regular'),
                        random,
                    );
                }
            }
        }
    }

    private static forceSpecial(
        grid: SymbolConfig[][],
        config: GameConfig,
        kind: 'scatter' | 'bonus',
        count: number,
        random: () => number,
    ): void {
        const symbol = config.symbols.find((candidate) => candidate.kind === kind);
        if (!symbol) return;
        const positions = new Set<number>();
        while (positions.size < count) positions.add(Math.floor(random() * config.columns * config.rows));
        positions.forEach((position) => {
            const column = Math.floor(position / config.rows);
            const row = position % config.rows;
            grid[column][row] = symbol;
        });
    }

    private static countKind(grid: SymbolConfig[][], kind: SymbolConfig['kind']): number {
        let count = 0;
        for (const column of grid) {
            for (const symbol of column) if (symbol.kind === kind) count += 1;
        }
        return count;
    }

    private static key(column: number, row: number): string {
        return `${column}:${row}`;
    }
}
