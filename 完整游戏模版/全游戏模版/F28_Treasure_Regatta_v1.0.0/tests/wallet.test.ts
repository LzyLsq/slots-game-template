import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Wallet, type Persistence } from '../assets/scripts/core/Wallet';
import { SeededRandom } from '../assets/scripts/core/Random';
import { Session } from '../assets/scripts/core/Session';

class Memory implements Persistence {
  value: string | null = null;
  fail = false;
  read(): string | null { return this.value; }
  write(value: string): void { if (this.fail) throw new Error('Disk full'); this.value = value; }
}
const rng = () => new SeededRandom(27);
test('deduct exactly once, settle exactly once, receipt copies cannot mutate balance', () => {
  const wallet = new Wallet(new Memory());
  const before = wallet.snapshot();
  const round = wallet.begin('captain', 20, before.revision, rng());
  assert.equal(wallet.snapshot().balance, before.balance - 20);
  assert.throws(() => wallet.begin('captain', 20, before.revision, rng()));
  const receipt = wallet.settle(round.id);
  assert.equal(receipt.balance, before.balance - 20 + round.round.totalWin);
  const balance = receipt.balance; receipt.balance = 0;
  assert.equal(wallet.settle(round.id).balance, balance);
  assert.throws(() => wallet.begin('captain', 20, before.revision, rng()));
});
test('reload of pending round preserves outcome and recovery does not deduct again', () => {
  const storage = new Memory(), a = new Wallet(storage);
  const pending = a.begin('reef', 20, 0, rng());
  const b = new Wallet(storage), result = b.recover()!;
  assert.equal(result.win, pending.round.totalWin);
  assert.equal(result.balance, 9980 + pending.round.totalWin);
  assert.equal(b.recover(), null);
  assert.equal(new Wallet(storage).snapshot().balance, result.balance);
});
test('failed save rolls back memory; retrying settlement credits only once', () => {
  const storage = new Memory(), wallet = new Wallet(storage);
  storage.fail = true;
  assert.throws(() => wallet.begin('captain', 20, 0, rng()));
  assert.equal(wallet.snapshot().balance, 10000);
  storage.fail = false;
  const pending = wallet.begin('captain', 20, 0, rng());
  storage.fail = true;
  assert.throws(() => wallet.settle(pending.id));
  assert.equal(wallet.snapshot().balance, 9980);
  storage.fail = false;
  assert.equal(wallet.recover()!.balance, 9980 + pending.round.totalWin);
});
test('rewards are claimed once per UTC day; corrupted saves fail closed', () => {
  const storage = new Memory(), wallet = new Wallet(storage), day = new Date('2026-09-20T12:00:00Z');
  wallet.claimDaily(day);
  assert.throws(() => wallet.claimDaily(day));
  assert.throws(() => new Wallet(storage).claimDaily(day));
  assert.equal(wallet.snapshot().balance, 10500);
  storage.value = '{broken';
  assert.throws(() => new Wallet(storage));
  assert.equal(storage.value, '{broken');
});
test('stale session cannot overwrite another session’s changes', () => {
  const storage = new Memory(), a = new Wallet(storage), b = new Wallet(storage);
  a.setting('sound', false);
  assert.throws(() => b.begin('captain', 20, 0, rng()));
  assert.equal(new Wallet(storage).snapshot().settings.sound, false);
});
test('session ignores double clicks/stops; skip presentation cannot repeat settlement', () => {
  const wallet = new Wallet(new Memory()), session = new Session(wallet, rng());
  assert.ok(session.spin('pearl', 20, false));
  assert.equal(session.spin('pearl', 20, false), false);
  assert.equal(session.canLeave(), false);
  const spin = session.state(); assert.equal(spin.kind, 'spinning');
  if (spin.kind !== 'spinning') throw new Error('missing spin');
  session.reelsStopped(spin.id); const balance = wallet.snapshot().balance;
  session.reelsStopped(spin.id); session.finishPresentation(); session.finishPresentation();
  assert.equal(wallet.snapshot().balance, balance);
  assert.equal(session.state().kind, 'idle');
});
test('backgrounding cancels auto; showing never causes another automatic bet', () => {
  const wallet = new Wallet(new Memory()), s = new Session(wallet, rng());
  assert.ok(s.startAuto(10, 'captain', 20, true));
  s.hide(); const state = s.state();
  if (state.kind !== 'spinning') throw new Error('missing spin');
  s.reelsStopped(state.id); s.finishPresentation();
  const balance = wallet.snapshot().balance;
  s.show(); for (let i = 0; i < 100; i++) s.tick(.016);
  assert.equal(wallet.snapshot().balance, balance);
  assert.equal(s.remainingAuto, 0);
});
test('auto makes exactly the requested number of spins', () => {
  const wallet = new Wallet(new Memory()), s = new Session(wallet, rng());
  s.startAuto(10, 'captain', 20, false);
  for (let i = 0; i < 10; i++) {
    const state = s.state(); if (state.kind !== 'spinning') throw new Error('missing auto spin');
    s.reelsStopped(state.id); s.finishPresentation();
    for (let f = 0; f < 50; f++) s.tick(.016);
  }
  assert.equal(wallet.snapshot().receipts.length, 10);
  assert.equal(s.state().kind, 'idle');
});
