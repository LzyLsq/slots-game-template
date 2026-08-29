import assert from 'node:assert/strict';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { EconomyService, HoldAndSpinController } from '../assets/scripts/features/FeatureControllers';
import { ResultGenerator } from '../assets/scripts/paytable/GameMath';

const BET = 20;

const simulate = (seed: number, spins: number) => {
    const rng = new SeededRNG(seed);
    const generator = new ResultGenerator(rng);
    const feature = new HoldAndSpinController(rng);
    const economy = new EconomyService(spins * BET + 1000);
    let baseWins = 0;
    let featureWins = 0;
    let featureCount = 0;
    let losingSpins = 0;
    let fullBoards = 0;

    for (let index = 0; index < spins; index += 1) {
        assert(economy.debit(BET));
        const result = generator.generate(BET);
        assert.equal(result.grid.length, 5);
        assert(result.grid.every((column) => column.length === 3));
        economy.credit(result.totalWin);
        baseWins += result.totalWin;
        if (result.totalWin === 0 && !result.bonus) losingSpins += 1;
        if (!result.bonus) continue;

        featureCount += 1;
        let step = feature.start(BET, result.bonusPositions);
        let guard = 0;
        while (!step.complete) {
            step = feature.spin();
            guard += 1;
            assert(guard < 100, 'Hold & Win must terminate');
        }
        economy.credit(step.total);
        featureWins += step.total;
        if (step.filled === 15) fullBoards += 1;
    }

    const totalBet = spins * BET;
    return {
        spins,
        baseWins,
        featureWins,
        featureCount,
        losingSpins,
        fullBoards,
        rtp: Number(((baseWins + featureWins) / totalBet).toFixed(4)),
        hitRate: Number(((spins - losingSpins) / spins).toFixed(4)),
        featureRate: Number((featureCount / spins).toFixed(4)),
        credits: economy.credits,
    };
};

assert.deepEqual(simulate(20260829, 500), simulate(20260829, 500));
assert(!new EconomyService(1).debit(BET));
const forcedRng = new SeededRNG(7);
const forced = new ResultGenerator(forcedRng).generate(BET, true);
assert(forced.bonus);
assert(forced.bonusPositions.length >= 6);
const report = simulate(20260829, 200000);
assert(report.losingSpins > report.spins * 0.45, 'Game must include meaningful losing rounds');
assert(report.featureCount > 0, 'Feature must be reachable');
console.log(JSON.stringify({ status: 'PASS', reproducible: true, report }, null, 2));
