import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY, SHOP_PACKS, getRanks } from '../src/services.js';
import { translations, t } from '../src/i18n.js';
const memory = raw => { const data = new Map(raw === undefined ? [] : [[STORAGE_KEY, raw]]); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
test('defaults and corrupted storage recover safely', () => {
  for (const raw of [undefined, '{broken', 'null', '[]', '42', JSON.stringify({ coins: -1, spins: 'bad', mail: [null], lang: 'bad' })]) {
    const store = createStore(memory(raw)); assert.equal(store.state.coins, 40000); assert.equal(store.state.spins, 0); assert.equal(store.state.lang, 'en');
  }
});
test('state is a detached snapshot and committed profile survives reload', () => {
  const storage = memory(); const store = createStore(storage);
  store.state.coins = 0; assert.equal(store.state.coins, 40000);
  assert.equal(store.rename('  Coral  ').ok, true); assert.equal(store.rename(' ').ok, false);
  assert.equal(store.setSetting('lang', 'zh-Hant').ok, true); assert.equal(store.setSetting('coins', 999).ok, false);
  assert.equal(createStore(storage).state.name, 'Coral'); assert.equal(createStore(storage).state.lang, 'zh-Hant');
});
test('spin debit and payout are atomic including decimal wins', () => {
  const store = createStore(memory());
  const before = store.state; assert.equal(store.recordSpin(40001, 999999).error, 'insufficientCoins'); assert.deepEqual(store.state, before);
  for (const value of [NaN, Infinity, -1, '100']) assert.equal(store.recordSpin(100, value).ok, false);
  assert.equal(store.recordSpin(100, 12.345678).ok, true); assert.equal(store.state.coins, 39912.345678);
  assert.equal(store.state.bestWin, 12.345678); assert.equal(store.state.totalWin, 12.345678); assert.equal(store.state.spins, 1);
});
test('mail reward cannot be claimed twice, including reload', () => {
  const storage = memory(); const store = createStore(storage);
  assert.equal(store.claimMail('missing').ok, false); assert.equal(store.claimMail('welcome').ok, true);
  assert.equal(store.state.coins, 45000); assert.equal(store.claimMail('welcome').error, 'alreadyClaimed');
  assert.equal(createStore(storage).claimMail('welcome').ok, false);
  assert.equal(store.state.mail.find(mail => mail.id === 'welcome').read, true);
});
test('daily gift claims once per UTC calendar day', () => {
  const storage = memory(); const store = createStore(storage);
  assert.equal(store.canClaimDaily(), true); assert.equal(store.claimDaily().ok, true); assert.equal(store.state.coins, 43000);
  assert.equal(store.state.dailyLast, new Date().toISOString().slice(0, 10)); assert.equal(store.canClaimDaily(), false);
  assert.equal(createStore(storage).claimDaily().error, 'alreadyClaimed');
  const previous = createStore(memory(JSON.stringify({ dailyLast: '2000-01-01' }))); assert.equal(previous.claimDaily().ok, true);
});
test('mail awards are trusted catalog values, not stored amounts', () => {
  const store = createStore(memory(JSON.stringify({ mail: [{ id: 'welcome', coins: 9999999 }] })));
  store.claimMail('welcome'); assert.equal(store.state.coins, 45000);
});
test('storage failures preserve a playable in-memory session and report persistence', () => {
  const store = createStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } });
  assert.equal(store.rename('Sailor').persistent, false); assert.equal(store.state.name, 'Sailor');
});
test('shop never grants coins and ranks identify examples', () => {
  const store = createStore(memory()); assert.deepEqual(SHOP_PACKS.map(pack => pack.coins), [20000, 110000, 240000, 520000]);
  assert.equal(store.purchase('deckhand').error, 'nativeIAPNotice'); assert.equal(store.state.coins, 40000);
  assert.equal(getRanks(store.state).filter(row => row.example).length, 24);
});
test('five languages have complete labels and interpolation', () => {
  for (const labels of Object.values(translations)) { assert.deepEqual(Object.keys(labels), Object.keys(translations.en)); assert.ok(Object.values(labels).every(Boolean)); }
  assert.ok(Object.keys(translations.en).length >= 80); assert.equal(t('dailyDescription', 'en', { coins: 3000 }).includes('3000'), true);
});
