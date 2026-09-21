import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WordRandom } from '../assets/scripts/core/Random';
import { Wallet } from '../assets/scripts/core/Wallet';

test('native random-word failures are rejected, including bridge false/negative sentinel', () => {
  for (const value of [-1, NaN, Infinity, .5, 0x100000000, false, null, undefined]) {
    assert.throws(() => new WordRandom(() => value as number).int(10), /Secure random source failed/);
  }
  assert.equal(new WordRandom(() => 0xffffffff).int(0x100000000), 0xffffffff);
});

test('failed native entropy never charges the wallet', () => {
  let saved: string | null = null;
  const wallet = new Wallet({read: () => saved, write: value => { saved = value; }});
  const before = wallet.snapshot();
  assert.throws(() => wallet.begin('captain', 20, before.revision, new WordRandom(() => -1)));
  assert.deepEqual(wallet.snapshot(), before);
});
