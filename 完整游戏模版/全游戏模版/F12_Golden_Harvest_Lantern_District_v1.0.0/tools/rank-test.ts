import assert from 'node:assert/strict';
import { RankService } from '../assets/scripts/services/RankService';
import type { PlayerRecord, SaveService, TransactionRecord } from '../assets/scripts/services/SaveService';

const record = (at: string, amount: number, type: TransactionRecord['type'] = 'spin-win') => ({ at, amount, type });
const transactions = [
  record('2026-09-10T00:00:00Z', 100),
  record('2026-09-10T10:00:00Z', 200, 'feature-win'),
  record('2026-09-07T00:00:00Z', 400),
  record('2026-09-06T23:59:59Z', 800),
  record('2026-09-11T00:00:00Z', 1600),
  record('2026-09-10T01:00:00Z', 10000, 'store-iap'),
  record('2026-09-10T01:00:00Z', 10000, 'daily-free'),
  record('2026-09-10T01:00:00Z', 10000, 'spin-refund'),
  record('invalid', 10000),
];
const save = { currentScope: () => ({ transactions }) } as unknown as SaveService;
const player = { nickname: 'QA', avatar: 1, totalWin: 9000 } as PlayerRecord;
const service = new RankService(undefined, save);
const now = new Date('2026-09-10T12:00:00Z');
assert.equal(service.list('daily', player, now)[0].winnings, 300);
assert.equal(service.list('weekly', player, now)[0].winnings, 700);
assert.equal(service.list('all-time', player, now)[0].winnings, 9000);
assert.deepEqual(service.list('daily', undefined, now), []);
assert.equal(service.list('daily', player, new Date('2026-09-11T00:00:00Z'))[0].winnings, 1600);
assert.equal(service.list('weekly', player, new Date('2026-09-14T00:00:00Z'))[0].winnings, 0);
console.log('Rank tests passed: UTC day/week boundaries, win-only totals, future records, lifetime and no-player state.');
