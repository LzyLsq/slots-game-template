import assert from 'node:assert/strict';
import { reserveSpin, settleSpin } from '../assets/scripts/domain/SpinWallet';
const accepted = reserveSpin(5000, 100, 1, 400, 'JADE FERRY');
assert.equal(accepted.balance, 4900, 'Stake must be deducted at acceptance, before reels turn');
assert.equal(settleSpin(accepted.balance, accepted.pending).balance, 5300);
assert.deepEqual(settleSpin(5300, undefined), { balance: 5300, award: 0 }, 'Cleared pending payout cannot be credited again');
assert.equal(settleSpin(reserveSpin(100, 100, 2, 0, 'MISS').balance, { spin: 2, award: 0, label: 'MISS' }).balance, 0);
assert.throws(() => reserveSpin(99, 100, 3, 0, 'MISS'));
console.log('PASS debit-before-spin, single payout, miss and insufficient-balance tests');
