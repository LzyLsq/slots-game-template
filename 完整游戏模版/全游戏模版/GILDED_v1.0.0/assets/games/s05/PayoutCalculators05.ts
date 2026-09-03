import { SymbolConfig } from './GameConfigs05';

export interface SpinOutcome {
    grid: SymbolConfig[][];
    winSymbol: SymbolConfig | null;
    payout: number;
    nearMiss: boolean;
}

export class PayoutCalculators05 {
    public static createOutcome(
        symbols: SymbolConfig[],
        bet: number,
        winRate: number,
        nearMissRate: number,
        random: () => number = Math.random,
    ): SpinOutcome {
        const grid: SymbolConfig[][] = Array.from({ length: 3 }, () =>
            Array.from({ length: 3 }, () => this.pickWeighted(symbols, random)),
        );

        const roll = random();
        let nearMiss = false;
        if (roll < winRate) {
            const winner = this.pickWeighted(symbols, random);
            grid[0][1] = winner;
            grid[1][1] = winner;
            grid[2][1] = winner;
        } else if (roll < winRate + nearMissRate) {
            const almost = this.pickWeighted(symbols, random);
            grid[0][1] = almost;
            grid[1][1] = almost;
            grid[2][1] = this.pickDifferent(symbols, almost.id, random);
            nearMiss = true;
        } else if (grid[0][1].id === grid[1][1].id && grid[1][1].id === grid[2][1].id) {
            // Make the configured winRate exact by preventing accidental wins.
            grid[2][1] = this.pickDifferent(symbols, grid[0][1].id, random);
        }

        const middle = [grid[0][1], grid[1][1], grid[2][1]];
        const winSymbol = middle.every((symbol) => symbol.id === middle[0].id) ? middle[0] : null;
        return {
            grid,
            winSymbol,
            payout: winSymbol ? bet * winSymbol.multiplier : 0,
            nearMiss,
        };
    }

    public static pickWeighted(symbols: SymbolConfig[], random: () => number = Math.random): SymbolConfig {
        const total = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
        let cursor = random() * total;
        for (const symbol of symbols) {
            cursor -= symbol.weight;
            if (cursor <= 0) {
                return symbol;
            }
        }
        return symbols[symbols.length - 1];
    }

    private static pickDifferent(symbols: SymbolConfig[], excludedId: string, random: () => number): SymbolConfig {
        const candidates = symbols.filter((symbol) => symbol.id !== excludedId);
        return this.pickWeighted(candidates, random);
    }
}
