import assert from 'node:assert/strict';
import { atlasMilestone, createRound, evaluateBoard, INITIAL_GUARANTEE, awardTier, BASE_ODDS, BASE_MULTIPLIERS, evaluateTier, restoreGuarantee, onboardingTier } from '../assets/scripts/domain/VaultMath';
const meters: [number, number, number] = [0, 0, 0];
let guarantee = { ...INITIAL_GUARANTEE };
for (let spin = 0; spin < 10; spin += 1) {
  const round = createRound({ spinsBefore: spin, bet: 2, lane: spin % 3, meters, guarantee, rng: () => 0.7 });
  guarantee = round.guarantee;
  if (spin === 4) assert.equal(round.tier, 'big');
  if (spin === 9) assert.equal(round.tier, 'super');
}
const first = createRound({ spinsBefore: 0, bet: 1, lane: 0, meters, guarantee: { ...INITIAL_GUARANTEE }, rng: () => 0.001 });
assert.equal(first.tier, 'super');
assert.equal(first.board.length, 5);
assert.equal(first.board[0].length, 3);
const charge = createRound({ spinsBefore: 12, bet: 2, lane: 1, meters: [0, 95, 0], guarantee: { bigSeen: true, superSeen: true }, rng: () => 0.1 });
assert.equal(charge.lanternBonus, 6);
assert.equal(charge.meters[1], 0);
assert.equal(charge.award, 8);
const noCharge = createRound({ spinsBefore: 12, bet: 2, lane: 1, meters: [0, 90, 0], guarantee: { bigSeen: true, superSeen: true }, rng: () => 0.1 });
assert.equal(noCharge.lanternBonus, 0);
assert.equal(noCharge.meters[1], 98);
console.log('PASS Fortune Lantern House guarantee, board and integer award tests');

// A room is not merely a payout skin: every room has a different winning pattern.
for (const mode of [0, 1, 2, 3] as const) {
  for (const [roll, expected] of [[0.1, 'ordinary'], [0.01, 'big'], [0.001, 'super']] as const) {
    const result = createRound({ spinsBefore: 20, bet: 5, lane: 1, mode, meters: [0, 0, 0], guarantee: { bigSeen: true, superSeen: true }, rng: () => roll });
    assert.equal(result.tier, expected, `mode ${mode} ${expected}`);
    assert.equal(result.matchedCells.length, mode === 2 ? ({ ordinary: 6, big: 9, super: 12 }[expected]) : ({ ordinary: 3, big: 4, super: 5 }[expected]));
    assert.equal(evaluateBoard(result.board, mode, 1)?.tier, expected);
    assert.equal(result.board.length, 5);
  }
}
// Deliberately tamper with a required position: a pearl path is not a horizontal line.
const garden = createRound({ spinsBefore: 20, bet: 1, lane: 0, mode: 1, meters: [0, 0, 0], guarantee: { bigSeen: true, superSeen: true }, rng: () => 0.1 });
garden.board[1][1] = 0;
assert.equal(evaluateBoard(garden.board, 1, 0), null);

// Even an early super award does not consume the separate big-award promise.
let early = { ...INITIAL_GUARANTEE };
for (let spin = 0; spin < 10; spin += 1) {
  const result = createRound({ spinsBefore: spin, bet: 1, mode: 3, lane: 0, meters: [0, 0, 0], guarantee: early, rng: () => spin === 0 ? 0.001 : 0.9 });
  early = result.guarantee;
  if (spin === 0) assert.equal(result.tier, 'super');
  if (spin === 4) assert.equal(result.tier, 'big');
}

for (const mode of [0, 1, 2, 3] as const) {
  const miss = createRound({ spinsBefore: 25, bet: 2, mode, lane: 1, meters: [0, 0, 0], guarantee: { bigSeen: true, superSeen: true }, rng: () => 0.95 });
  assert.equal(miss.tier, 'none');
  assert.equal(miss.award, 0);
  assert.deepEqual(miss.matchedCells, []);
  assert.equal(evaluateBoard(miss.board, mode, 1), null);
}

// Pearl Garden locks its first winning pearls and pre-resolves a distinct second board.
let gardenCalls = 0;
const gardenBloom = createRound({ spinsBefore: 20, bet: 3, mode: 1, lane: 0, meters: [0, 0, 0],
  guarantee: { bigSeen: true, superSeen: true }, rng: () => gardenCalls++ === 0 ? 0.1 : gardenCalls > 31 ? 0.99 : 0.5 });
assert.equal(gardenBloom.firstBoard?.[0][0], 2);
assert.equal(gardenBloom.lockedCells?.length, 3);
assert.equal(gardenBloom.tier, 'super');
assert.equal(gardenBloom.award, 24);
for (const cell of gardenBloom.lockedCells ?? []) assert.equal(gardenBloom.board[cell.column][cell.row], gardenBloom.firstBoard?.[cell.column][cell.row]);
// Foundry accumulates ingots even without winning and releases a one-time press bonus.
const press = createRound({ spinsBefore: 20, bet: 2, mode: 2, lane: 1, meters: [0, 0, 0], featureProgress: 58,
  guarantee: { bigSeen: true, superSeen: true }, rng: () => 0.1 });
assert.equal(press.featureName, 'FORGE RELEASE');
assert.equal(press.featureBonus, 4);
assert.equal(press.featureProgress, 4);
assert.equal(press.award, 6);
// Vault streak is reset by a miss, and the third hit actually pays its seal.
const seal = createRound({ spinsBefore: 20, bet: 2, mode: 3, lane: 1, meters: [0, 0, 0], featureProgress: 2,
  guarantee: { bigSeen: true, superSeen: true }, rng: () => 0.1 });
assert.equal(seal.featureBonus, 10);
assert.equal(seal.featureProgress, 0);
const broken = createRound({ spinsBefore: 20, bet: 2, mode: 3, lane: 1, meters: [0, 0, 0], featureProgress: 2,
  guarantee: { bigSeen: true, superSeen: true }, rng: () => 0.95 });
assert.equal(broken.featureProgress, 0);
assert.equal(broken.featureBonus, 0);
console.log('PASS four room features, held re-spin and persistent release state');

// Atlas keeps one independently claimable milestone ladder per room.
assert.deepEqual(atlasMilestone(2, 0), { threshold: 3, award: 200, ready: false });
assert.deepEqual(atlasMilestone(3, 0), { threshold: 3, award: 200, ready: true });
assert.deepEqual(atlasMilestone(10, 1), { threshold: 10, award: 750, ready: true });
assert.deepEqual(atlasMilestone(25, 2), { threshold: 25, award: 2000, ready: true });
assert.equal(atlasMilestone(100, 3), null);
assert.equal(atlasMilestone(-1, 0), null);
console.log('PASS treasure atlas independent claim thresholds');

// Stable seeded economy audit (post-onboarding): all four modes must be occasional
// rather than near-certain wins, and long-run awards must not mint coins endlessly.
for (const mode of [0, 1, 2, 3] as const) {
  let seed = 93817 + mode;
  const rng = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  let meter: [number, number, number] = [0, 0, 0];
  let progress = 0; let wins = 0; let total = 0; let max = 0;
  for (let spin = 0; spin < 100000; spin += 1) {
    const round = createRound({ spinsBefore: spin + 20, bet: 1, mode, lane: 1, meters: meter, featureProgress: progress,
      guarantee: { bigSeen: true, superSeen: true }, rng });
    if (round.tier !== 'none') wins += 1;
    total += round.award; max = Math.max(max, round.award); meter = round.meters; progress = round.featureProgress;
  }
  assert.ok(wins > 41000 && wins < 44000, `mode ${mode} hit rate ${wins / 100000}`);
  assert.ok(total > 77000 && total < 97000, `mode ${mode} long-run payout ${total / 100000}`);
  assert.ok(max <= 15, `mode ${mode} single-spin award ${max}`);
}
console.log('PASS 100k seeded rounds in each mode: restrained hit rate, capped payouts, and no runaway economy');

// Pearl re-spin must not upgrade the guaranteed fifth-spin big prize into a
// super prize, which would leave the separate promise unfulfilled.
for (const mode of [0, 1, 2, 3] as const) {
  const promisedBig = createRound({ spinsBefore: 4, bet: 2, mode, lane: 1, meters: [0, 0, 0],
    guarantee: { bigSeen: false, superSeen: false }, rng: () => 0.99 });
  assert.equal(promisedBig.tier, 'big', `mode ${mode} fifth-spin big`);
  assert.ok(promisedBig.guarantee.bigSeen);
  const promisedSuper = createRound({ spinsBefore: 9, bet: 2, mode, lane: 1, meters: [0, 0, 0],
    guarantee: { bigSeen: true, superSeen: false }, rng: () => 0.99 });
  assert.equal(promisedSuper.tier, 'super', `mode ${mode} tenth-spin super`);
  assert.ok(promisedSuper.guarantee.superSeen);
}
console.log('PASS distinct fifth/tenth-spin promises in all four modes, including Pearl re-spin');

assert.ok(Math.abs(Object.values(BASE_ODDS).reduce((sum, p) => sum + p, 0) - 1) < 1e-12);
assert.equal(awardTier(0, 100, 'none'), 'none');
assert.equal(awardTier(100, 100, 'ordinary'), 'ordinary');
assert.equal(awardTier(101, 100, 'ordinary'), 'big');
assert.equal(awardTier(200, 100, 'none'), 'big', 'Feature-only profit needs a show');
assert.equal(awardTier(800, 100, 'super'), 'super');
assert.deepEqual(BASE_MULTIPLIERS, { none: 0, ordinary: 1, big: 4, super: 8 });
console.log('PASS actual-award presentation tiers, retained ordinary refunds and super boards');

// Introductory promises are one global first-ten window, not a repeating pity system.
for (const spinsBefore of [5, 6, 8, 10, 11, 100, 100000]) {
  for (const stale of [{ bigSeen: false, superSeen: false }, { bigSeen: false, superSeen: true }, { bigSeen: true, superSeen: false }]) {
    assert.equal(onboardingTier(spinsBefore, stale), undefined);
    assert.equal(evaluateTier(spinsBefore, stale, () => .99), 'none', `No overdue guarantee at spin ${spinsBefore + 1}`);
    assert.equal(evaluateTier(spinsBefore, stale, () => .1), 'ordinary');
    assert.equal(evaluateTier(spinsBefore, stale, () => .01), 'big');
    assert.equal(evaluateTier(spinsBefore, stale, () => .001), 'super');
  }
}
assert.equal(onboardingTier(4, INITIAL_GUARANTEE), 'big');
assert.equal(onboardingTier(9, INITIAL_GUARANTEE), 'super');
assert.equal(onboardingTier(4, { bigSeen: true, superSeen: false }), undefined);
assert.equal(onboardingTier(9, { bigSeen: false, superSeen: true }), undefined);
for (const raw of [undefined, null, [], 'true', { bigSeen: 'false', superSeen: 1 }]) {
  assert.deepEqual(restoreGuarantee(raw), INITIAL_GUARANTEE);
}
assert.deepEqual(restoreGuarantee({ bigSeen: true }), { bigSeen: true, superSeen: false });
assert.deepEqual(restoreGuarantee(JSON.parse(JSON.stringify({ bigSeen: false, superSeen: true }))), { bigSeen: false, superSeen: true });
// A stale missing flag must not suppress the genuine Pearl upgrade after onboarding.
let staleCalls = 0;
const staleGarden = createRound({ spinsBefore: 100, bet: 1, mode: 1, lane: 0, meters: [0, 0, 0],
  guarantee: restoreGuarantee(undefined), rng: () => staleCalls++ === 0 ? .01 : .99 });
assert.equal(staleGarden.tier, 'super');
console.log('PASS bounded onboarding, strict saved flags, old-save normal odds, and post-onboarding Pearl upgrades');
