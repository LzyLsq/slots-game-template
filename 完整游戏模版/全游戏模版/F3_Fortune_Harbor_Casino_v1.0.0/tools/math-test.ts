import assert from 'node:assert/strict';
import { GameBootstrap } from '../assets/scripts/core/GameBootstrap';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { HoldAndSpinController } from '../assets/scripts/math/FeatureControllers';
import { ClusterEvaluator, WaysEvaluator } from '../assets/scripts/math/Evaluators';
import { CAPTAINS_CHEST, GAME_CONFIGS, GOLDEN_TIDE, LUCKY_LIGHTHOUSE, PEARL_PARADE } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import { MemoryStorage, SaveService } from '../assets/scripts/services/SaveService';

const main = async (): Promise<void> => {
  const generator = new ResultGenerator();
  const report: Record<string, { spins: number; wagered: number; won: number; wins: number; features: number; maxWin: number }> = {};
  for (const [gameIndex, config] of GAME_CONFIGS.entries()) {
    const rng = new SeededRNG(0xc35e71a1 + gameIndex * 1009); const bet = config.bets[2]; const stats = { spins: 0, wagered: 0, won: 0, wins: 0, features: 0, maxWin: 0 };
    for (let spin = 0; spin < 1_000; spin += 1) {
      const result = generator.generate(config, bet, rng); assert.equal(result.grid.length, config.columns * config.rows); assert.equal(result.stops.length, config.columns); assert.equal(result.totalWin, result.baseWin + result.featureWin); assert(result.totalWin >= 0);
      stats.spins += 1; stats.wagered += bet; stats.won += result.totalWin; if (result.totalWin > 0) stats.wins += 1; if (result.feature) stats.features += 1; stats.maxWin = Math.max(stats.maxWin, result.totalWin);
    }
    report[config.id] = stats;
  }

  const first = generator.generate(GOLDEN_TIDE, 500, new SeededRNG(123456)); const second = new ResultGenerator().generate(GOLDEN_TIDE, 500, new SeededRNG(123456));
  assert.deepEqual(first.grid, second.grid, 'test seeds must reproduce the same grid'); assert.deepEqual(first.stops, second.stops, 'test seeds must reproduce the same stops');
  assert.throws(() => generator.generate(GOLDEN_TIDE, 999_999, new SeededRNG(1)), /Unsupported bet/);

  const forcedLine = generator.generate(GOLDEN_TIDE, 500, new SeededRNG(9003), { symbolId: 'wheel', count: 3, wild: true }); assert(forcedLine.wins.some((win) => win.count >= 3), 'forced three-of-a-kind must evaluate');
  const scatter = generator.generate(GOLDEN_TIDE, 500, new SeededRNG(444), { scatterCount: 3 }); assert.equal(scatter.feature?.type, 'coin-toss'); assert.equal(scatter.featureResult?.rounds.length, 1); assert.equal(scatter.totalWin, scatter.baseWin + scatter.featureWin);
  const bonus = generator.generate(CAPTAINS_CHEST, 500, new SeededRNG(555), { holdAndSpin: true }); assert.equal(bonus.feature?.type, 'hold-and-spin'); assert((bonus.featureResult?.rounds.length ?? 0) > 0); assert((bonus.featureWin ?? 0) > 0);
  const holdResult = new HoldAndSpinController().generate(new SeededRNG(777), [0, 2, 4, 6, 8, 10], 'major', 500); assert.equal(holdResult.jackpot, 'major'); assert(holdResult.totalCredits >= 2_500);
  const epic = generator.generate(CAPTAINS_CHEST, 500, new SeededRNG(888), { winTier: 'epic' }); assert(epic.totalWin >= 75_000);

  const allWild = Array.from({ length: LUCKY_LIGHTHOUSE.columns * LUCKY_LIGHTHOUSE.rows }, () => LUCKY_LIGHTHOUSE.wildId); const wildWays = new WaysEvaluator().evaluate(LUCKY_LIGHTHOUSE, allWild, 500);
  assert.equal(wildWays.length, 1, 'an all-Wild way must not be paid once per regular symbol'); assert.equal(wildWays[0].symbolId, LUCKY_LIGHTHOUSE.wildId);
  const clusterGrid = Array.from({ length: PEARL_PARADE.columns * PEARL_PARADE.rows }, () => 'shell');
  const clusterWins = new ClusterEvaluator().evaluate(PEARL_PARADE, clusterGrid, 500); assert.equal(clusterWins.length, 1); assert.equal(clusterWins[0].count, 30);
  const capped = generator.generate(GOLDEN_TIDE, 500, new SeededRNG(999), { winTier: 'epic' }); assert(capped.totalWin <= 500 * GOLDEN_TIDE.maxWinMultiplier);

  const malformed = new MemoryStorage(); malformed.setItem('fortune-harbor-f3.save.v1', '{"currentUserId":"missing","players":{"broken":{"username":42}},"playerData":"bad"}');
  const recovered = new SaveService(malformed); assert.equal(recovered.read().currentUserId, null); assert.deepEqual(recovered.read().players, {});

  const storage = new MemoryStorage(); const bootstrap = new GameBootstrap(new SaveService(storage));
  const rejectedTerms = await bootstrap.auth.register({ username: 'terms_test', nickname: 'Terms Test', password: 'Starlight88!', confirmPassword: 'Starlight88!', acceptedTerms: false }); assert.equal(rejectedTerms.ok, false);
  const accountA = await bootstrap.auth.register({ username: 'player_alpha', nickname: 'Alpha', password: 'Starlight88!', confirmPassword: 'Starlight88!', acceptedTerms: true }); assert.equal(accountA.ok, true);
  const serialized = storage.getItem('fortune-harbor-f3.save.v1') ?? ''; assert(!serialized.includes('Starlight88!'), 'plaintext password must never be persisted'); assert(serialized.includes('PBKDF2-SHA-256'));
  assert.equal(bootstrap.store.claimDaily('2026-08-31'), true); bootstrap.auth.logout();
  const accountB = await bootstrap.auth.register({ username: 'player_beta', nickname: 'Beta', password: 'Moonlight99!', confirmPassword: 'Moonlight99!', acceptedTerms: true }); assert.equal(accountB.ok, true); assert.equal(bootstrap.store.claimDaily('2026-08-31'), true, 'daily claims must be account-scoped');
  const beforeReservation = bootstrap.economy.balance(); assert.equal(bootstrap.economy.reserveSpin('recovery-spin-0001', 500), true); assert.equal(bootstrap.economy.balance(), beforeReservation - 500); assert.equal(bootstrap.economy.recoverPending(), 500); assert.equal(bootstrap.economy.balance(), beforeReservation);
  const prepared = bootstrap.wheel.prepare('2026-08-31'); assert(prepared); assert.equal(bootstrap.wheel.settle('forged-wheel-id'), false); assert.equal(bootstrap.wheel.settle(prepared.spinId), true);
  bootstrap.auth.logout(); const guest = await bootstrap.auth.guestLogin(); assert.equal(guest.ok, true); const guestCredits = bootstrap.economy.balance(); assert.equal(bootstrap.store.demoPurchase('spark'), false); assert.equal(bootstrap.economy.balance(), guestCredits);

  console.log(JSON.stringify({ status: 'PASS', totalSpins: Object.values(report).reduce((sum, item) => sum + item.spins, 0), report }, null, 2));
};

void main();
