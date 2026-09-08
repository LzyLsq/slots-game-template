import assert from 'node:assert/strict';
import { GameBootstrap } from '../assets/scripts/core/GameBootstrap';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { HoldAndSpinController } from '../assets/scripts/math/FeatureControllers';
import { ClusterEvaluator, WaysEvaluator } from '../assets/scripts/math/Evaluators';
import { CLOVER_CASH_CLUB, DICE_DRIFT_DELUXE, GAME_CONFIGS, SEVEN_SKYLIGHT, SKY_VAULT_CASCADE } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import { MemoryStorage, SaveService } from '../assets/scripts/services/SaveService';
import { PRIVACY_VERSION, TERMS_VERSION } from '../assets/scripts/core/ReleaseConfig';
import { StoreService, STORE_PRODUCTS, type LuckySkylightPurchaseBridge, type StoreServerClient } from '../assets/scripts/services/StoreService';

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

  const first = generator.generate(SEVEN_SKYLIGHT, 500, new SeededRNG(123456)); const second = new ResultGenerator().generate(SEVEN_SKYLIGHT, 500, new SeededRNG(123456));
  assert.deepEqual(first.grid, second.grid, 'test seeds must reproduce the same grid'); assert.deepEqual(first.stops, second.stops, 'test seeds must reproduce the same stops');
  assert.throws(() => generator.generate(SEVEN_SKYLIGHT, 999_999, new SeededRNG(1)), /Unsupported bet/);

  const forcedLine = generator.generate(SEVEN_SKYLIGHT, 500, new SeededRNG(9003), { symbolId: 'champagne-seven', count: 3, wild: true }); assert(forcedLine.wins.some((win) => win.count >= 3), 'forced three-of-a-kind must evaluate');
  const scatter = generator.generate(SEVEN_SKYLIGHT, 500, new SeededRNG(444), { scatterCount: 3 }); assert.equal(scatter.feature?.type, 'orbit-pick'); assert.equal(scatter.featureResult?.rounds.length, 1); assert.equal(scatter.totalWin, scatter.baseWin + scatter.featureWin);
  const bonus = generator.generate(CLOVER_CASH_CLUB, 500, new SeededRNG(555), { holdAndSpin: true }); assert.equal(bonus.feature?.type, 'cash-respin'); assert((bonus.featureResult?.rounds.length ?? 0) > 0); assert((bonus.featureWin ?? 0) > 0);
  const holdResult = new HoldAndSpinController().generate(new SeededRNG(777), [0, 2, 4, 6, 8, 10], 'major', 500); assert.equal(holdResult.jackpot, 'major'); assert(holdResult.totalCredits >= 2_500);
  const epic = generator.generate(CLOVER_CASH_CLUB, 500, new SeededRNG(888), { winTier: 'epic' }); assert(epic.totalWin >= 75_000);

  const allWild = Array.from({ length: DICE_DRIFT_DELUXE.columns * DICE_DRIFT_DELUXE.rows }, () => DICE_DRIFT_DELUXE.wildId); const wildWays = new WaysEvaluator().evaluate(DICE_DRIFT_DELUXE, allWild, 500);
  assert.equal(wildWays.length, 1, 'an all-Wild way must not be paid once per regular symbol'); assert.equal(wildWays[0].symbolId, DICE_DRIFT_DELUXE.wildId);
  const clusterGrid = Array.from({ length: SKY_VAULT_CASCADE.columns * SKY_VAULT_CASCADE.rows }, () => 'coin-pile');
  const clusterWins = new ClusterEvaluator().evaluate(SKY_VAULT_CASCADE, clusterGrid, 500); assert.equal(clusterWins.length, 1); assert.equal(clusterWins[0].count, 30);
  const capped = generator.generate(SEVEN_SKYLIGHT, 500, new SeededRNG(999), { winTier: 'epic' }); assert(capped.totalWin <= 500 * SEVEN_SKYLIGHT.maxWinMultiplier);

  const malformed = new MemoryStorage(); malformed.setItem('lucky-skylight-f5.save.v1', '{"currentUserId":"missing","players":{"broken":{"username":42}},"playerData":"bad"}');
  const recovered = new SaveService(malformed); assert.equal(recovered.read().currentUserId, null); assert.deepEqual(recovered.read().players, {});

  const storage = new MemoryStorage(); const save = new SaveService(storage); save.acceptCompliance(TERMS_VERSION, PRIVACY_VERSION); const bootstrap = new GameBootstrap(save, true);
  const rejectedTerms = await bootstrap.auth.register({ username: 'terms_test', nickname: 'Terms Test', password: 'Starlight88!', confirmPassword: 'Starlight88!', acceptedTerms: false }); assert.equal(rejectedTerms.ok, false);
  const accountA = await bootstrap.auth.register({ username: 'player_alpha', nickname: 'Alpha', password: 'Starlight88!', confirmPassword: 'Starlight88!', acceptedTerms: true }); assert.equal(accountA.ok, true);
  const serialized = storage.getItem('lucky-skylight-f5.save.v1') ?? ''; assert(!serialized.includes('Starlight88!'), 'plaintext password must never be persisted'); assert(serialized.includes('PBKDF2-SHA-256'));
  assert.equal(bootstrap.store.claimDaily('2026-08-31'), true); bootstrap.auth.logout();
  const accountB = await bootstrap.auth.register({ username: 'player_beta', nickname: 'Beta', password: 'Moonlight99!', confirmPassword: 'Moonlight99!', acceptedTerms: true }); assert.equal(accountB.ok, true); assert.equal(bootstrap.store.claimDaily('2026-08-31'), true, 'daily claims must be account-scoped');
  const beforeReservation = bootstrap.economy.balance(); assert.equal(bootstrap.economy.reserveSpin('recovery-spin-0001', 500), true); assert.equal(bootstrap.economy.balance(), beforeReservation - 500); assert.equal(bootstrap.economy.recoverPending(), 500); assert.equal(bootstrap.economy.balance(), beforeReservation);
  const verifiedBefore = bootstrap.economy.balance(); assert.equal(bootstrap.economy.creditVerifiedPurchase(10_000, '1000000000001'), true); assert.equal(bootstrap.economy.creditVerifiedPurchase(10_000, '1000000000001'), false, 'a verified transaction must never credit twice'); assert.equal(bootstrap.economy.balance(), verifiedBefore + 10_000);
  const paidBefore = bootstrap.economy.balance(); const paidTransactionId = '2000000000001'; let finished = 0;
  const bridge: LuckySkylightPurchaseBridge = {
    products: async () => [{ productId: STORE_PRODUCTS[0].appleProductId, displayPrice: '$0.99' }],
    purchase: async () => ({ status: 'verified', productId: STORE_PRODUCTS[0].appleProductId, transactionId: paidTransactionId, signedTransactionInfo: 'signed-apple-jws' }),
    restore: async () => [], finish: async (transactionId) => { assert.equal(transactionId, paidTransactionId); finished += 1; },
  };
  const purchaseServer: StoreServerClient = {
    verifyApplePurchase: async () => ({ status: 'verified', productId: STORE_PRODUCTS[0].appleProductId, transactionId: paidTransactionId, creditedCredits: 10_000, authoritativeBalance: paidBefore + 10_000 }),
    synchronizePurchases: async () => ({ status: 'verified', authoritativeBalance: paidBefore + 10_000 }),
  };
  (globalThis as typeof globalThis & { __LUCKY_SKYLIGHT_IAP__?: LuckySkylightPurchaseBridge }).__LUCKY_SKYLIGHT_IAP__ = bridge;
  const paidStore = new StoreService(save, bootstrap.economy, false, purchaseServer); const delivered = await paidStore.purchase('spark'); assert.equal(delivered.status, 'verified'); assert.equal(delivered.credited, 10_000); assert.equal(bootstrap.economy.balance(), paidBefore + 10_000); assert.equal(finished, 1);
  const duplicate = await paidStore.purchase('spark'); assert.equal(duplicate.status, 'duplicate'); assert.equal(duplicate.credited, 0); assert.equal(bootstrap.economy.balance(), paidBefore + 10_000, 'replayed Apple transaction must not credit twice'); assert.equal(finished, 2);
  const interruptedBalance = bootstrap.economy.balance(); let invalidFinishCalls = 0;
  const pendingBridge: LuckySkylightPurchaseBridge = {
    products: bridge.products,
    purchase: async () => ({ status: 'pending', message: 'Awaiting approval' }),
    restore: async () => [], finish: async () => { invalidFinishCalls += 1; },
  };
  (globalThis as typeof globalThis & { __LUCKY_SKYLIGHT_IAP__?: LuckySkylightPurchaseBridge }).__LUCKY_SKYLIGHT_IAP__ = pendingBridge;
  const pending = await paidStore.purchase('spark'); assert.equal(pending.status, 'pending'); assert.equal(pending.credited, 0); assert.equal(bootstrap.economy.balance(), interruptedBalance); assert.equal(invalidFinishCalls, 0, 'pending StoreKit transactions must remain unfinished');
  const mismatchedBridge: LuckySkylightPurchaseBridge = {
    products: bridge.products,
    purchase: async () => ({ status: 'verified', productId: STORE_PRODUCTS[0].appleProductId, transactionId: '2000000000002', signedTransactionInfo: 'signed-mismatched-jws' }),
    restore: async () => [], finish: async () => { invalidFinishCalls += 1; },
  };
  const mismatchedServer: StoreServerClient = {
    verifyApplePurchase: async () => ({ status: 'verified', productId: STORE_PRODUCTS[0].appleProductId, transactionId: '2000000000002', creditedCredits: 9_999, authoritativeBalance: interruptedBalance + 9_999 }),
    synchronizePurchases: purchaseServer.synchronizePurchases,
  };
  (globalThis as typeof globalThis & { __LUCKY_SKYLIGHT_IAP__?: LuckySkylightPurchaseBridge }).__LUCKY_SKYLIGHT_IAP__ = mismatchedBridge;
  const rejectedPurchase = await new StoreService(save, bootstrap.economy, false, mismatchedServer).purchase('spark'); assert.equal(rejectedPurchase.status, 'failed'); assert.equal(rejectedPurchase.credited, 0); assert.equal(bootstrap.economy.balance(), interruptedBalance); assert.equal(invalidFinishCalls, 0, 'mismatched server delivery must not finish StoreKit');
  delete (globalThis as typeof globalThis & { __LUCKY_SKYLIGHT_IAP__?: LuckySkylightPurchaseBridge }).__LUCKY_SKYLIGHT_IAP__;
  const prepared = bootstrap.wheel.prepare('2026-08-31'); assert(prepared); assert.equal(bootstrap.wheel.settle('forged-wheel-id'), false); assert.equal(bootstrap.wheel.settle(prepared.spinId), true);
  assert.equal((await bootstrap.auth.deleteCurrentAccount('wrong-password')).ok, false); assert.equal((await bootstrap.auth.deleteCurrentAccount('Moonlight99!')).ok, true); assert.equal(bootstrap.profile.current(), undefined, 'account deletion must remove the current profile');
  const guest = await bootstrap.auth.guestLogin(); assert.equal(guest.ok, true); const guestCredits = bootstrap.economy.balance(); assert.equal(bootstrap.store.debugPurchase('spark'), false); assert.equal(bootstrap.economy.balance(), guestCredits);

  console.log(JSON.stringify({ status: 'PASS', totalSpins: Object.values(report).reduce((sum, item) => sum + item.spins, 0), report }, null, 2));
};

void main();
