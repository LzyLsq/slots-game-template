import { SeededRNG } from '../core/SeededRNG';

export class EconomyService {
    constructor(public credits = 10000) {}

    debit(value: number): boolean {
        if (value <= 0 || this.credits < value) return false;
        this.credits -= value;
        return true;
    }

    credit(value: number): void {
        this.credits += Math.max(0, value);
    }
}

export type JackpotTier = 'MINI' | 'MINOR' | 'MAJOR' | 'GRAND';

export interface HoldCoin {
    position: number;
    value: number;
    multiplier: number;
    jackpot?: JackpotTier;
}

export interface HoldSpinStep {
    coins: HoldCoin[];
    landed: HoldCoin[];
    respins: number;
    reset: boolean;
    complete: boolean;
    filled: number;
    total: number;
    grandAward: number;
}

const REGULAR_MULTIPLIERS = [1, 1, 1, 1, 2, 2, 2, 3, 3, 5, 10];

export class HoldAndSpinController {
    private locked = new Map<number, HoldCoin>();
    private wager = 20;
    private respins = 0;
    private grandAward = 0;

    constructor(private rng: SeededRNG) {}

    start(bet: number, initialPositions: number[]): HoldSpinStep {
        this.locked.clear();
        this.wager = Math.max(1, bet);
        this.respins = 3;
        this.grandAward = 0;

        const positions = Array.from(new Set(initialPositions.filter((position) => position >= 0 && position < 15)));
        while (positions.length < 6) {
            const position = this.rng.int(15);
            if (!positions.includes(position)) positions.push(position);
        }
        positions.forEach((position) => this.locked.set(position, this.createCoin(position)));
        return this.snapshot(Array.from(this.locked.values()), true, false);
    }

    spin(): HoldSpinStep {
        if (this.respins <= 0 || this.locked.size >= 15) return this.snapshot([], false, true);

        const landed: HoldCoin[] = [];
        const empty = Array.from({ length: 15 }, (_, position) => position)
            .filter((position) => !this.locked.has(position));
        const landChance = this.locked.size >= 12 ? 0.095 : 0.08;

        for (const position of empty) {
            if (landed.length >= 3) break;
            if (this.rng.next() < landChance) {
                const coin = this.createCoin(position);
                this.locked.set(position, coin);
                landed.push(coin);
            }
        }

        const reset = landed.length > 0;
        this.respins = reset ? 3 : this.respins - 1;
        if (this.locked.size === 15) {
            this.grandAward = this.wager * 500;
            this.respins = 0;
        }
        return this.snapshot(landed, reset, this.respins <= 0 || this.locked.size >= 15);
    }

    private createCoin(position: number): HoldCoin {
        const jackpotRoll = this.rng.next();
        let jackpot: JackpotTier | undefined;
        let multiplier: number;
        if (jackpotRoll < 0.0005) {
            jackpot = 'GRAND';
            multiplier = 500;
        } else if (jackpotRoll < 0.003) {
            jackpot = 'MAJOR';
            multiplier = 100;
        } else if (jackpotRoll < 0.015) {
            jackpot = 'MINOR';
            multiplier = 25;
        } else if (jackpotRoll < 0.05) {
            jackpot = 'MINI';
            multiplier = 10;
        } else {
            multiplier = this.rng.pick(REGULAR_MULTIPLIERS);
        }
        return { position, value: multiplier * this.wager, multiplier, jackpot };
    }

    private snapshot(landed: HoldCoin[], reset: boolean, complete: boolean): HoldSpinStep {
        const coins = Array.from(this.locked.values()).sort((a, b) => a.position - b.position);
        return {
            coins,
            landed,
            respins: this.respins,
            reset,
            complete,
            filled: coins.length,
            total: coins.reduce((sum, coin) => sum + coin.value, 0) + this.grandAward,
            grandAward: this.grandAward,
        };
    }
}
