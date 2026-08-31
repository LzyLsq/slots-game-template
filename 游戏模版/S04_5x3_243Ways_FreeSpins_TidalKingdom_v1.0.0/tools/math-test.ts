import assert from 'node:assert/strict';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { EconomyService, FreeSpinController } from '../assets/scripts/features/FeatureControllers';
import { ResultGenerator, SymbolId, WaysEvaluator } from '../assets/scripts/paytable/GameMath';

const BET = 20;

const simulate = (seed: number, spins: number) => {
    const rng = new SeededRNG(seed);
    const generator = new ResultGenerator(rng);
    const economy = new EconomyService(spins * BET + 1000);
    let baseWins = 0;
    let featureWins = 0;
    let featureCount = 0;
    let losingSpins = 0;

    for (let index = 0; index < spins; index += 1) {
        assert(economy.debit(BET));
        const result = generator.generate(BET);
        assert.equal(result.grid.length, 5);
        assert(result.grid.every((column) => column.length === 3));
        economy.credit(result.totalWin);
        baseWins += result.totalWin;
        if (result.totalWin === 0 && result.freeSpinsAwarded === 0) losingSpins += 1;
        if (result.freeSpinsAwarded === 0) continue;

        featureCount += 1;
        const feature = new FreeSpinController();
        let state = feature.start(result.freeSpinsAwarded);
        let guard = 0;
        while (!state.complete) {
            state = feature.beginSpin();
            const freeResult = generator.generate(BET);
            state = feature.settle(freeResult.totalWin, freeResult.scatterCount);
            guard += 1;
            assert(guard < 200, 'Free spins must terminate');
        }
        economy.credit(state.totalWin);
        featureWins += state.totalWin;
    }

    const totalBet = spins * BET;
    return {
        spins,
        baseWins,
        featureWins,
        featureCount,
        losingSpins,
        rtp: Number(((baseWins + featureWins) / totalBet).toFixed(4)),
        hitRate: Number(((spins - losingSpins) / spins).toFixed(4)),
        featureRate: Number((featureCount / spins).toFixed(4)),
        credits: economy.credits,
    };
};

const wildGrid = Array.from({ length: 5 }, () => [SymbolId.Pearl, SymbolId.Pearl, SymbolId.Wild]);
const ways = new WaysEvaluator().evaluate(wildGrid, BET);
assert(ways.some((win) => win.symbol === SymbolId.Pearl && win.ways === 243));
assert.deepEqual(simulate(20260831, 500), simulate(20260831, 500));
assert(!new EconomyService(1).debit(BET));
const forced = new ResultGenerator(new SeededRNG(7)).generate(BET, true);
assert(forced.freeSpinsAwarded >= 8);
assert(forced.scatterCount >= 3);
const report = simulate(20260831, 100000);
assert(report.losingSpins > report.spins * 0.35, 'Game must include meaningful losing rounds');
assert(report.featureCount > 0, 'Free spins must be reachable');
console.log(JSON.stringify({ status: 'PASS', reproducible: true, report }, null, 2));
