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

export interface FreeSpinState {
    remaining: number;
    totalSpins: number;
    multiplier: number;
    totalWin: number;
    lastWin: number;
    retriggered: number;
    complete: boolean;
}

export class FreeSpinController {
    private remaining = 0;
    private totalSpins = 0;
    private multiplier = 1;
    private totalWin = 0;

    start(spins: number): FreeSpinState {
        this.remaining = Math.max(1, spins);
        this.totalSpins = this.remaining;
        this.multiplier = 1;
        this.totalWin = 0;
        return this.snapshot(0, 0);
    }

    beginSpin(): FreeSpinState {
        if (this.remaining > 0) this.remaining -= 1;
        return this.snapshot(0, 0);
    }

    settle(baseWin: number, scatterCount: number): FreeSpinState {
        const win = Math.max(0, baseWin) * this.multiplier;
        this.totalWin += win;
        if (baseWin > 0) this.multiplier = Math.min(5, this.multiplier + 1);
        const retriggered = scatterCount >= 3 ? 3 : 0;
        this.remaining += retriggered;
        this.totalSpins += retriggered;
        return this.snapshot(win, retriggered);
    }

    private snapshot(lastWin: number, retriggered: number): FreeSpinState {
        return {
            remaining: this.remaining,
            totalSpins: this.totalSpins,
            multiplier: this.multiplier,
            totalWin: this.totalWin,
            lastWin,
            retriggered,
            complete: this.remaining <= 0,
        };
    }
}
