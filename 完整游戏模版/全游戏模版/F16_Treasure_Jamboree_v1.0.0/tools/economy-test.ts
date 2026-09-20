import assert from 'node:assert/strict';
import { GameBootstrap } from '../assets/scripts/core/GameBootstrap';
import { TERMS_VERSION, PRIVACY_VERSION } from '../assets/scripts/core/ReleaseConfig';
import { MemoryStorage, SaveService } from '../assets/scripts/services/SaveService';

class FallibleStorage extends MemoryStorage {
  public fail = false;
  public writes = 0;
  public override setItem(key: string, value: string): void {
    if (this.fail) throw new Error('Storage unavailable');
    this.writes += 1;
    super.setItem(key, value);
  }
}

async function main(): Promise<void> {
  const storage = new FallibleStorage();
  const save = new SaveService(storage);
  save.acceptCompliance(TERMS_VERSION, PRIVACY_VERSION);
  const app = new GameBootstrap(save);
  assert.equal((await app.auth.guestLogin()).ok, true);
  const original = app.economy.balance();

  storage.fail = true;
  assert.throws(() => app.economy.reserveSpin('failed-round-0001', 50), /Storage unavailable/);
  assert.equal(app.economy.balance(), original);
  assert.equal(save.currentScope()?.pendingSpin, undefined);
  storage.fail = false;
  assert.equal(app.economy.reserveSpin('settled-round-0001', 50), true);
  assert.equal(app.economy.reserveSpin('duplicate-round-0001', 50), false);
  assert.equal(app.economy.settleSpin('settled-round-0001', 120), true);
  assert.equal(app.economy.settleSpin('settled-round-0001', 120), false);
  assert.equal(app.economy.reserveSpin('settled-round-0001', 50), false);
  assert.equal(app.economy.balance(), original + 70);
  assert.equal(app.economy.reserveSpin('fractional-round-1', .5), false);
  assert.equal(app.economy.credit(Number.MAX_SAFE_INTEGER, 'mail', 'invalid'), false);
  assert.equal(app.economy.reserveSpin('refund-round-0001', 100), true);
  const reloaded = new GameBootstrap(new SaveService(storage));
  assert.equal(reloaded.economy.balance(), original + 70);
  assert.equal(reloaded.economy.recoverPending(), 0);
  assert.equal(reloaded.economy.reserveSpin('refund-round-0001', 100), false);
  assert.throws(() => app.economy.credit(10, 'mail', 'stale-tab'), /another tab/);

  let before = reloaded.economy.balance();
  let writes = storage.writes;
  assert.equal(reloaded.store.claimDaily('2026-09-18'), true);
  assert.equal(storage.writes, writes + 1, 'daily reward and claim marker must be one durable write');
  assert.equal(reloaded.store.claimDaily('2026-09-18'), false);
  assert.equal(reloaded.store.claimDaily('2026-09-17'), false);
  assert.equal(reloaded.store.claimDaily('2026-99-99'), false);
  assert.equal(reloaded.checkIn.claimToday('2026-02-30').ok, false);
  assert.equal(reloaded.economy.balance(), before + 5000);
  writes = storage.writes;
  assert.equal(reloaded.mail.claim('welcome'), true);
  assert.equal(storage.writes, writes + 1, 'mail credit and claimed state must commit together');
  assert.equal(reloaded.mail.claim('welcome'), false);
  writes = storage.writes;
  assert.equal(reloaded.checkIn.claimToday('2026-09-18').ok, true);
  assert.equal(storage.writes, writes + 1);
  assert.equal(reloaded.checkIn.claimToday('2026-09-17').ok, false);

  const wheel = reloaded.wheel.prepare('2026-09-18');
  assert(wheel);
  assert.deepEqual(reloaded.wheel.prepare('2026-09-19'), wheel, 'midnight must not discard an unsettled prize');
  before = reloaded.economy.balance();
  storage.fail = true;
  assert.throws(() => reloaded.wheel.settle(wheel.spinId), /Storage unavailable/);
  assert.equal(reloaded.economy.balance(), before);
  storage.fail = false;
  writes = storage.writes;
  assert.equal(reloaded.wheel.settle(wheel.spinId), true);
  assert.equal(storage.writes, writes + 1, 'wheel prize and pending marker must commit together');
  assert.equal(reloaded.wheel.settle(wheel.spinId), false);
  assert.equal(reloaded.economy.balance(), before + wheel.amount);

  const isolated = new MemoryStorage();
  isolated.setItem('royal-jubilee-f21.cocos.save.v1', storage.getItem('f16-treasure-jamboree.cocos.save.v1')!);
  assert.equal(new SaveService(isolated).read().currentUserId, null, 'never import the reference game wallet');
  console.log('PASS guest ledger: write failure, stale tabs, debit/settlement/refund replay, safe amounts, atomic rewards, midnight recovery and isolated persistence.');
}

void main();
