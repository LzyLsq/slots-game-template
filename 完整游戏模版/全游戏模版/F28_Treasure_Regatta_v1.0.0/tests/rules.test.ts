import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES, modeRules } from '../assets/scripts/core/Modes';
import { BETS, MAX_CASCADES, type Grid, type ModeId } from '../assets/scripts/core/Model';
import { evaluate, generateRound, collapse } from '../assets/scripts/core/Rules';
import { SeededRandom, SecureRandom } from '../assets/scripts/core/Random';

const filled = (mode: ModeId, id: string): Grid => Array.from({ length: MODES[mode].columns }, () => Array(MODES[mode].rows).fill(id));

test('four modes have independent symbol identities and explicit rules', () => {
  const symbols = Object.values(MODES).flatMap(m => m.symbols.map(s => s.id));
  assert.equal(new Set(symbols).size, 24);
  assert.equal(new Set(Object.values(MODES).map(m => m.mechanic)).size, 4);
  for (const id of Object.keys(MODES) as ModeId[]) assert.ok(modeRules(id).length >= 4);
});
test('captain pays only the center row', () => {
  const g = filled('captain', 'captain-chest');
  assert.equal(evaluate('captain', g, 20)[0]!.amount, 1600);
  g[1]![1] = 'captain-bell';
  assert.equal(evaluate('captain', g, 20).length, 0);
});
test('ways use consecutive left columns and count all matching combinations once', () => {
  const g = filled('pearl', 'pearl-oyster');
  const awards = evaluate('pearl', g, 20);
  assert.equal(awards.length, 1);
  assert.equal(awards[0]!.ways, 243);
  assert.equal(awards[0]!.amount, 37908);
  g[2] = Array(3).fill('pearl-star');
  assert.equal(evaluate('pearl', g, 20).length, 0);
});
test('cargo lines divide total bet and ignore cargo coins as line wins', () => {
  const a = evaluate('cargo', filled('cargo', 'cargo-emerald'), 20);
  assert.equal(a.length, 5);
  assert.equal(a.reduce((sum, w) => sum + w.amount, 0), 3600);
  assert.equal(evaluate('cargo', filled('cargo', 'cargo-coin'), 20).length, 0);
});
test('clusters are orthogonal; full grid pays one cluster with declared cascade multiplier', () => {
  const g = filled('reef', 'reef-turtle');
  assert.equal(evaluate('reef', g, 20, 4)[0]!.amount, 6400);
  const checker = Array.from({ length: 5 }, (_, c) => Array.from({ length: 5 }, (_, r) => (c + r) % 2 ? 'reef-shell' : 'reef-pebble'));
  assert.equal(evaluate('reef', checker, 20).length, 0);
});
test('collapse preserves survivor order and moves survivors down', () => {
  const ids = MODES.reef.symbols.map(s => s.id);
  const g = Array.from({ length: 5 }, () => ids.slice(0, 5));
  const next = collapse(g, [{ column: 0, row: 1 }, { column: 0, row: 3 }], new SeededRandom(4));
  assert.deepEqual(next[0]!.slice(2), [ids[0], ids[2], ids[4]]);
  assert.deepEqual(next[1], g[1]);
  assert.deepEqual(g[0], ids.slice(0, 5));
});
test('cargo feature pays once and stops on a full board', () => {
  const round = generateRound('cargo', 20, { int: () => 0 });
  assert.equal(round.stages.length, 2);
  assert.equal(round.totalWin, 300);
  assert.equal(round.stages.flatMap(s => s.awards).length, 1);
});
test('cascades have a hard limit and exact evidence', () => {
  const r = generateRound('reef', 20, { int: () => 0 });
  assert.equal(r.stages.length, MAX_CASCADES);
  assert.deepEqual(r.stages.map(s => s.multiplier), [1, 2, 3, 4, 4, 4, 4, 4]);
  assert.equal(r.totalWin, 26 * 20 * 80);
});
test('20,000 seeded rounds: integer money, bounded features, exact winning-cell evidence', () => {
  const rng = new SeededRandom(27092026);
  for (const id of Object.keys(MODES) as ModeId[]) for (let i = 0; i < 5000; i++) {
    const round = generateRound(id, BETS[i % BETS.length]!, rng);
    let total = 0;
    assert.ok(round.stages.length <= (id === 'reef' ? MAX_CASCADES : 50));
    for (const stage of round.stages) for (const award of stage.awards) {
      assert.ok(Number.isSafeInteger(award.amount) && award.amount >= 0);
      assert.ok(award.cells.every(c => stage.grid[c.column]![c.row] === award.symbol));
      total += award.amount;
    }
    assert.equal(total, round.totalWin);
    assert.ok(total <= round.bet * 5000);
  }
});
test('invalid inputs fail before a result is created', () => {
  for (const bet of [0, -1, NaN, Infinity, 0.1, 21]) assert.throws(() => generateRound('captain', bet, new SeededRandom(1)));
  assert.throws(() => evaluate('captain', filled('pearl', 'pearl-oyster'), 20));
  const bad = filled('captain', 'captain-bell'); bad[0]![0] = 'foreign';
  assert.throws(() => evaluate('captain', bad, 20));
});
test('secure RNG rejects biased upper tail', () => {
  let calls = 0;
  const source = { getRandomValues<T extends ArrayBufferView | null>(target: T): T {
    (target as Uint32Array)[0] = calls++ === 0 ? 0xffffffff : 7; return target;
  } };
  assert.equal(new SecureRandom(source).int(10), 7);
  assert.equal(calls, 2);
});
