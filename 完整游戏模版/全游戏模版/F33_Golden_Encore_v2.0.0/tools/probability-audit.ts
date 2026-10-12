/** Reproducible local-demo audit. Never imports the scene or reads user storage. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import * as sourceMath from '../assets/scripts/domain/VaultMath';
import { reserveSpin, settleSpin } from '../assets/scripts/domain/SpinWallet';
import type { Tier, ModeId, LanternMeters } from '../assets/scripts/domain/VaultMath';

// Execute only the actual emitted math module and its Babel helpers, not the app.
// This detects a stale preview bundle or a Creator down-compilation discrepancy.
function builtMath(): typeof sourceMath {
  type Registration = { deps: string[]; declare: (publish: (key: string | object, value?: unknown) => unknown) => { setters: Array<(exports: object) => void>; execute: () => void } };
  const modules = new Map<string, Registration>(), exports = new Map<string, Record<string, unknown>>();
  const register = (name: string | string[], deps: string[] | Registration['declare'], declare?: Registration['declare']) => {
    if (typeof name === 'string') modules.set(name, { deps: deps as string[], declare: declare! });
    else (deps as Registration['declare'])(() => undefined).execute(); // shared-helper bundle's registration envelope
  };
  const context = vm.createContext({ System: { register } });
  vm.runInContext(readFileSync('build/web-mobile/src/chunks/bundle.js', 'utf8'), context, { timeout: 5000 });
  vm.runInContext(readFileSync('build/web-mobile/assets/main/index.js', 'utf8'), context, { timeout: 5000 });
  const load = (name: string): Record<string, unknown> => {
    if (name === 'cc') return { cclegacy: { _RF: { push() {}, pop() {} } } };
    if (exports.has(name)) return exports.get(name)!;
    const module = modules.get(name); assert.ok(module, `Missing built module ${name}`);
    const out: Record<string, unknown> = {}; exports.set(name, out);
    const declared = module.declare((key, value) => { if (typeof key === 'string') out[key] = value; else Object.assign(out, key); return value; });
    module.deps.forEach((dep, index) => declared.setters[index](load(dep.startsWith('./') ? `chunks:///_virtual/${dep.slice(2)}` : dep)));
    declared.execute(); return out;
  };
  return load('chunks:///_virtual/VaultMath.ts') as unknown as typeof sourceMath;
}
const args = process.argv.slice(2);
const option = (name: string, fallback: string) => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? fallback;
const rounds = Number(option('--rounds', '100000'));
const accounts = Number(option('--accounts', '1000'));
assert.ok(Number.isSafeInteger(rounds) && rounds >= 10000 && rounds <= 10000000);
assert.ok(Number.isSafeInteger(accounts) && accounts >= 1 && accounts <= 100000);
const built = args.includes('--built'), math = built ? builtMath() : sourceMath;
assert.equal(JSON.stringify(math.BASE_ODDS), JSON.stringify(sourceMath.BASE_ODDS));
assert.equal(JSON.stringify(math.FEATURE_MATH), JSON.stringify(sourceMath.FEATURE_MATH));
const tiers: Tier[] = ['none', 'ordinary', 'big', 'super'];
const empty = () => ({ none: 0, ordinary: 0, big: 0, super: 0 });
const seeded = (initial: number) => {
  let seed = initial >>> 0;
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
};
const { BASE_ODDS: odds, BASE_MULTIPLIERS: pay, FEATURE_MATH: feature } = math;

/** Exact long-run model for this result-driven generator, at a constant stake.
 * Tide uses a renewal cycle with overshoot reset; forge uses a modulo carry;
 * dragon uses the stationary consecutive-hit chain; pearl uses two upgrades. */
function expected(mode: ModeId) {
  const board: Record<Tier, number> = { ...odds }, paid = empty(), histogram: Record<string, number> = {};
  const add = (tier: Tier, probability: number, bonus = 0) => {
    const award = pay[tier] + bonus;
    paid[math.awardTier(award, 1, tier)] += probability;
    histogram[award] = (histogram[award] ?? 0) + probability;
  };
  if (mode === 1) {
    const p = feature.pearlUpgradeChance;
    board.ordinary = odds.ordinary * (1 - p);
    board.big = (odds.big + odds.ordinary * p) * (1 - p);
    board.super = odds.super + odds.big * p + odds.ordinary * p * p;
    for (const tier of tiers) add(tier, board[tier]);
  } else if (mode === 0) {
    const visits = Array<number>(feature.tide.target).fill(0); visits[0] = 1;
    const releases = empty();
    for (let level = 0; level < visits.length; level++) {
      for (const tier of tiers) {
        const probability = visits[level] * odds[tier], next = level + feature.tide.gains[tier];
        if (next >= feature.tide.target) releases[tier] += probability; else visits[next] += probability;
      }
    }
    const length = visits.reduce((sum, n) => sum + n, 0);
    for (const tier of tiers) {
      const rate = releases[tier] / length;
      add(tier, odds[tier] - rate); add(tier, rate, feature.tide.multiplier);
    }
  } else if (mode === 2) {
    // The four constructed board counts are independently pinned by vault-math-test.
    const counts = { none: 4, ordinary: 6, big: 9, super: 12 };
    for (const tier of tiers) {
      const chance = counts[tier] / feature.forge.target;
      add(tier, odds[tier] * (1 - chance)); add(tier, odds[tier] * chance, feature.forge.multiplier);
    }
  } else {
    const hit = 1 - odds.none;
    const weights = Array.from({ length: feature.dragon.target }, (_, i) => hit ** i);
    const ready = weights.at(-1)! / weights.reduce((sum, n) => sum + n, 0);
    add('none', odds.none);
    for (const tier of ['ordinary', 'big', 'super'] as const) {
      add(tier, odds[tier] * (1 - ready)); add(tier, odds[tier] * ready, feature.dragon.multiplier);
    }
  }
  const payoutRatio = Object.entries(histogram).reduce((sum, [amount, probability]) => sum + Number(amount) * probability, 0);
  assert.ok(Math.abs(Object.values(paid).reduce((sum, n) => sum + n, 0) - 1) < 1e-12);
  return { board, paid, histogram, payoutRatio };
}

// Reproduce the old-save defect directly. Stale welcome flags must NOT force a
// prize at spin 11, spin 101, or on a missing-flag saved account.
for (const spinsBefore of [10, 20, 100]) {
  assert.equal(math.evaluateTier(spinsBefore, math.restoreGuarantee(undefined), () => .99), 'none');
}
const results = [];
for (const mode of [0, 1, 2, 3] as const) {
  const rng = seeded(93817 + mode), board = empty(), paid = empty(), featureAwards = empty();
  const histogram: Record<string, number> = {};
  let meters: LanternMeters = [0, 0, 0], progress = 0, total = 0;
  const stake = 100, initialBalance = rounds * stake + 5000;
  let balance = initialBalance;
  for (let i = 0; i < rounds; i++) {
    // Deliberately leave the flags false: after ten spins they must not change odds.
    const round = math.createRound({ mode, spinsBefore: i + 20, bet: stake, lane: 1, meters,
      featureProgress: progress, guarantee: { bigSeen: false, superSeen: false }, rng });
    const reserved = reserveSpin(balance, stake, i + 21, round.award, `AUDIT ${mode}`);
    assert.equal(reserved.balance, balance - stake);
    balance = settleSpin(reserved.balance, reserved.pending).balance;
    assert.equal(math.evaluateBoard(round.board, mode, 1)?.tier ?? 'none', round.tier);
    assert.equal(round.presentationTier, math.awardTier(round.award, stake, round.tier));
    assert.ok(Number.isSafeInteger(round.award) && round.award >= 0);
    board[round.tier]++; paid[round.presentationTier]++;
    if (round.featureBonus + round.lanternBonus > 0) featureAwards[round.tier]++;
    total += round.award; meters = round.meters; progress = round.featureProgress;
    histogram[round.award / stake] = (histogram[round.award / stake] ?? 0) + 1;
  }
  assert.equal(balance, initialBalance - rounds * stake + total);
  const model = expected(mode), tolerance = Math.max(.004, 6 / Math.sqrt(rounds));
  for (const tier of tiers) {
    assert.ok(Math.abs(board[tier] / rounds - model.board[tier]) < tolerance, `Mode ${mode} board ${tier}`);
    assert.ok(Math.abs(paid[tier] / rounds - model.paid[tier]) < tolerance, `Mode ${mode} paid ${tier}`);
  }
  assert.ok(Math.abs(total / rounds / stake - model.payoutRatio) < Math.max(.01, 15 / Math.sqrt(rounds)), `Mode ${mode} payout ratio`);
  results.push({ mode, rounds, seed: 93817 + mode, stake, board, paid, featureAwards, histogram,
    observed: { anyAward: 1 - paid.none / rounds, refund: paid.ordinary / rounds,
      big: paid.big / rounds, super: paid.super / rounds, profit: (paid.big + paid.super) / rounds, payoutRatio: total / rounds / stake }, expected: model });
}

// Cross-room first-ten promises survive JSON reload; changing stake, lane and
// room must not restart the global welcome counter. No user data is involved.
let bigDeadline = 0, superDeadline = 0;
for (let account = 0; account < accounts; account++) {
  const rng = seeded(811000 + account);
  let saved = { spins: 0, guarantee: { ...math.INITIAL_GUARANTEE },
    meters: [[18, 42, 26], [8, 12, 6], [14, 4, 9], [0, 0, 0]] as LanternMeters[], progress: [0, 0, 0, 0] };
  let firstBig = 0, firstSuper = 0;
  for (let i = 0; i < 20; i++) {
    const mode = Math.floor(rng() * 4) as ModeId, lane = Math.floor(rng() * 3);
    const stake = math.STAKES[Math.floor(rng() * math.STAKES.length)];
    const round = math.createRound({ spinsBefore: saved.spins, guarantee: saved.guarantee,
      bet: stake, mode, lane, meters: saved.meters[mode], featureProgress: saved.progress[mode], rng });
    if (!firstBig && round.presentationTier === 'big') firstBig = i + 1;
    if (!firstSuper && round.presentationTier === 'super') firstSuper = i + 1;
    saved.spins++; saved.guarantee = round.guarantee;
    saved.meters[mode] = round.meters; saved.progress[mode] = round.featureProgress;
    saved = JSON.parse(JSON.stringify(saved)); saved.guarantee = math.restoreGuarantee(saved.guarantee);
    if (i === 4) assert.ok(firstBig > 0 && firstBig <= 5, `Account ${account}: BIG by five`);
    if (i === 9) assert.ok(firstSuper > 0 && firstSuper <= 10, `Account ${account}: SUPER by ten`);
  }
  bigDeadline = Math.max(bigDeadline, firstBig); superDeadline = Math.max(superDeadline, firstSuper);
}
const report = { scope: 'LOCAL VIRTUAL-COIN DEMO · fixed-stake post-onboarding simulation, not certified RTP',
  implementation: built ? 'actual web-mobile emitted VaultMath module' : 'source VaultMath module',
  baseOdds: odds, baseMultipliers: pay, featureMath: feature, results,
  onboarding: { accounts, mixedRooms: true, reloadEverySpin: true, latestFirstBig: bigDeadline, latestFirstSuper: superDeadline },
  staleSaveGuarantee: 'PASS: no forced prizes after the first ten spins', wallet: 'PASS: debit then one settlement; aggregate cash flow exact' };
const output = option('--output', '');
if (output) writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.table(results.map(({ mode, observed }) => ({ mode, paid: `${(observed.anyAward * 100).toFixed(3)}%`,
  refund: `${(observed.refund * 100).toFixed(3)}%`, big: `${(observed.big * 100).toFixed(3)}%`,
  super: `${(observed.super * 100).toFixed(3)}%`, profit: `${(observed.profit * 100).toFixed(3)}%`, payoutRatio: observed.payoutRatio.toFixed(6) })));
console.log(`PASS ${built ? 'emitted' : 'source'} math: ${rounds} rounds/room, final paid tiers vs analytical model, debit/settlement, ${accounts} cross-room/reload welcome accounts and expired flags`);
