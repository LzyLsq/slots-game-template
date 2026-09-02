import assert from 'node:assert/strict';
import { GameBootstrap } from '../assets/scripts/core/GameBootstrap';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { HoldAndSpinController } from '../assets/scripts/math/FeatureControllers';
import { WaysEvaluator } from '../assets/scripts/math/Evaluators';
import { ASTRAL_VAULT, COSMIC_COINS, GAME_CONFIGS, GOLDEN_DYNASTY } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import { RankService } from '../assets/scripts/services/RankService';
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

  const first = generator.generate(ASTRAL_VAULT, 500, new SeededRNG(123456)); const second = new ResultGenerator().generate(ASTRAL_VAULT, 500, new SeededRNG(123456));
  assert.deepEqual(first.grid, second.grid, 'test seeds must reproduce the same grid'); assert.deepEqual(first.stops, second.stops, 'test seeds must reproduce the same stops');
  assert.throws(() => generator.generate(ASTRAL_VAULT, 999_999, new SeededRNG(1)), /Unsupported bet/);

  for (const count of [3, 4, 5] as const) { const forced = generator.generate(ASTRAL_VAULT, 500, new SeededRNG(9000 + count), { symbolId: 'necklace', count, wild: count === 4 }); assert(forced.wins.some((win) => win.count >= count), `forced ${count}-of-a-kind must evaluate`); }
  const scatter = generator.generate(ASTRAL_VAULT, 500, new SeededRNG(444), { scatterCount: 5 }); assert.equal(scatter.feature?.type, 'free-spins'); assert.equal(scatter.featureResult?.rounds.length, 18); assert.equal(scatter.totalWin, scatter.baseWin + scatter.featureWin);
  const bonus = generator.generate(COSMIC_COINS, 500, new SeededRNG(555), { holdAndSpin: true }); assert.equal(bonus.feature?.type, 'hold-and-spin'); assert((bonus.featureResult?.rounds.length ?? 0) > 0); assert((bonus.featureWin ?? 0) > 0);
  const holdResult = new HoldAndSpinController().generate(new SeededRNG(777), [0, 2, 4, 6, 8, 10], 'major', 500); assert.equal(holdResult.jackpot, 'major'); assert(holdResult.totalCredits >= 2_500);
  const epic = generator.generate(COSMIC_COINS, 500, new SeededRNG(888), { winTier: 'epic' }); assert(epic.totalWin >= 75_000);

  const allWild = Array.from({ length: GOLDEN_DYNASTY.columns * GOLDEN_DYNASTY.rows }, () => GOLDEN_DYNASTY.wildId); const wildWays = new WaysEvaluator().evaluate(GOLDEN_DYNASTY, allWild, 500);
  assert.equal(wildWays.length, 1, 'an all-Wild way must not be paid once per regular symbol'); assert.equal(wildWays[0].symbolId, GOLDEN_DYNASTY.wildId);

  const malformed = new MemoryStorage(); malformed.setItem('pharaoh-kemet-treasury.save.v1', '{"currentUserId":"missing","players":{"broken":{"username":42}},"playerData":"bad"}');
  const recovered = new SaveService(malformed); assert.equal(recovered.read().currentUserId, null); assert.deepEqual(recovered.read().players, {});

  const storage = new MemoryStorage(); const bootstrap = new GameBootstrap(new SaveService(storage));
  const rejectedTerms = await bootstrap.auth.register({ username: 'terms_test', nickname: 'Terms Test', password: 'Starlight88!', confirmPassword: 'Starlight88!', acceptedTerms: false }); assert.equal(rejectedTerms.ok, false);
  const accountA = await bootstrap.auth.register({ username: 'player_alpha', nickname: 'Alpha', password: 'Starlight88!', confirmPassword: 'Starlight88!', acceptedTerms: true }); assert.equal(accountA.ok, true);
  const serialized = storage.getItem('pharaoh-kemet-treasury.save.v1') ?? ''; assert(!serialized.includes('Starlight88!'), 'plaintext password must never be persisted'); assert(serialized.includes('PBKDF2-SHA-256'));
  assert.equal(bootstrap.store.claimDaily('2026-08-31'), true); bootstrap.auth.logout();
  const accountB = await bootstrap.auth.register({ username: 'player_beta', nickname: 'Beta', password: 'Moonlight99!', confirmPassword: 'Moonlight99!', acceptedTerms: true }); assert.equal(accountB.ok, true); assert.equal(bootstrap.store.claimDaily('2026-08-31'), true, 'daily claims must be account-scoped');
  const rankSnapshot = bootstrap.rank.snapshot('daily', bootstrap.profile.current()); assert.equal(rankSnapshot.current?.nickname, 'Beta'); assert.equal(rankSnapshot.current?.rankLabel, '10K+', 'a new player outside the visible field must receive a rank band'); assert.equal(RankService.rankLabel(101), '100+'); assert.equal(RankService.rankLabel(1_001), '1K+'); assert.equal(RankService.rankLabel(10_001), '10K+');
  const beforeReservation = bootstrap.economy.balance(); assert.equal(bootstrap.economy.reserveSpin('recovery-spin-0001', 500), true); assert.equal(bootstrap.economy.balance(), beforeReservation - 500); assert.equal(bootstrap.economy.recoverPending(), 500); assert.equal(bootstrap.economy.balance(), beforeReservation);
  assert.equal(bootstrap.wheel.sectorWeights.reduce((sum, weight) => sum + weight, 0), 100, 'wheel odds must total 100%');
  bootstrap.wheel.sectors.forEach((_amount, sector) => { const sectorCentre = (sector + 0.5) * 45; const landingAngle = (sectorCentre + bootstrap.wheel.targetRotation(sector)) % 360; assert.equal(landingAngle, 90, `wheel sector ${sector} must stop under the top pointer`); });
  const wheelBalance = bootstrap.economy.balance(); const prepared = bootstrap.wheel.prepare('2026-08-31'); assert(prepared); assert.equal(prepared.amount, bootstrap.wheel.sectors[prepared.sector], 'selected sector and reward must match'); assert.equal(bootstrap.wheel.prepare('2026-08-31')?.spinId, prepared.spinId, 'repeat taps must reuse the pending result'); assert.equal(bootstrap.wheel.settle('forged-wheel-id'), false); assert.equal(bootstrap.wheel.settle(prepared.spinId), true); assert.equal(bootstrap.economy.balance(), wheelBalance + prepared.amount, 'wheel reward must be credited exactly once'); assert.equal(bootstrap.wheel.settle(prepared.spinId), false); assert.equal(bootstrap.economy.balance(), wheelBalance + prepared.amount, 'settled wheel rewards must not be credited twice');
  bootstrap.auth.logout(); const guest = await bootstrap.auth.guestLogin(); assert.equal(guest.ok, true); const guestCredits = bootstrap.economy.balance(); assert.equal(bootstrap.store.demoPurchase('spark'), false); assert.equal(bootstrap.economy.balance(), guestCredits);

  console.log(JSON.stringify({ status: 'PASS', totalSpins: Object.values(report).reduce((sum, item) => sum + item.spins, 0), report }, null, 2));
};

void main();
