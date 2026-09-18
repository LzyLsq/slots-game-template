import assert from 'node:assert/strict';
import { ECONOMY } from '../assets/scripts/math/EconomyProfile';
import { EconomyService } from '../assets/scripts/services/EconomyService';
import { MailService } from '../assets/scripts/services/MailService';
import { PlayerProfileService } from '../assets/scripts/services/PlayerProfileService';
import { ApiRequestError, ProductionApiClient, type RemoteMailState, type RemotePlayer, type RemoteReward } from '../assets/scripts/services/ProductionApiClient';
import { RemoteAuthService } from '../assets/scripts/services/RemoteAuthService';
import { createPlayerScope, MemoryStorage, SaveService } from '../assets/scripts/services/SaveService';

const createSave = (credits: number): SaveService => {
  const save = new SaveService(new MemoryStorage());
  save.update((state) => {
    state.currentUserId = 'remote-player';
    state.players['remote-player'] = {
      id: 'remote-player', appAccountToken: '00000000-0000-4000-8000-000000000001', termsAcceptedAt: new Date().toISOString(), termsVersion: 'test', privacyVersion: 'test',
      username: 'remote_player', nickname: 'Remote Player', avatar: 0, isGuest: false, signInProvider: 'password', level: 1, experience: 0, credits,
      gamesPlayed: 0, biggestWin: 0, totalWin: 0, settings: { music: true, sound: true, vibration: true, quality: 'medium', language: 'en' },
    };
    state.playerData['remote-player'] = createPlayerScope();
  });
  return save;
};

const testDefinitiveSpinErrors = async (): Promise<void> => {
  const originalFetch = globalThis.fetch;
  try {
    const client = new ProductionApiClient('https://example.invalid/api');
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Insufficient credits.', code: 'INSUFFICIENT_CREDITS' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(client.spin('golden-hour', 500, 'request-123456'), (error: unknown) => error instanceof ApiRequestError && error.status === 409 && error.code === 'INSUFFICIENT_CREDITS' && error.definitive);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Conflict.' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(client.spin('golden-hour', 500, 'request-123457'), (error: unknown) => error instanceof ApiRequestError && error.status === 409 && !error.definitive);
  } finally { globalThis.fetch = originalFetch; }
};

const testAuthoritativeMail = async (): Promise<void> => {
  let serverBalance = 10_000; const serverClaims = new Set<string>();
  const api = {
    async mailState(): Promise<RemoteMailState> { return { claimedIds: [...serverClaims], balance: serverBalance }; },
    async claimReward(kind: string, id?: string): Promise<RemoteReward> {
      assert.equal(kind, 'mail'); const item = id === 'welcome' ? ECONOMY.mail[0] : id === 'weekend' ? ECONOMY.mail[1] : 0; assert(item > 0 && id);
      const rewardKey = `mail:${id}`;
      if (serverClaims.has(id)) return { rewardKey, amount: 0, balance: serverBalance, alreadyClaimed: true };
      serverClaims.add(id); serverBalance += item; return { rewardKey, amount: item, balance: serverBalance, alreadyClaimed: false };
    },
  } as unknown as ProductionApiClient;
  const save = createSave(1); const economy = new EconomyService(save, new PlayerProfileService(save)); const mail = new MailService(save, economy, api);
  assert.equal(await mail.synchronizeRemote(), 0); assert.equal(economy.balance(), 10_000);
  const first = await mail.claimRemote('welcome'); assert.equal(first.amount, ECONOMY.mail[0]); assert.equal(mail.state('welcome').claimed, true); assert.equal(economy.balance(), serverBalance);
  const duplicate = await mail.claimRemote('welcome'); assert.equal(duplicate.amount, 0); assert.equal(duplicate.alreadyClaimed, true); assert.equal(economy.balance(), serverBalance, 'duplicate mail must not credit twice');
  assert.equal(await mail.claimAllRemote(), ECONOMY.mail[1], 'claim-all only credits the remaining server reward'); assert.equal(serverClaims.size, 2); assert.equal(economy.balance(), serverBalance);
  save.update((state) => { state.playerData['remote-player'].mail.welcome = { read: true, claimed: false, deleted: true }; });
  assert.equal(await mail.synchronizeRemote(), 2); assert.equal(mail.state('welcome').claimed, true, 'server claim state repairs stale local state');
};

const testAuthenticationMailSynchronization = async (): Promise<void> => {
  const player: RemotePlayer = {
    id: 'remote-auth-player', appAccountToken: '00000000-0000-4000-8000-000000000002', username: 'remote_auth', nickname: 'Remote Auth', avatar: 0,
    settings: { music: true, sound: true, vibration: true, quality: 'medium', language: 'en' }, isGuest: false, signInProvider: 'password', credits: 20_000,
  };
  const session = { player, csrfToken: 'csrf' };
  const api = {
    async me() { return session; }, async register() { return session; }, async login() { return session; }, async guestLogin() { return session; },
  } as unknown as ProductionApiClient;
  const save = new SaveService(new MemoryStorage()); let synchronizations = 0;
  const auth = new RemoteAuthService(save, api, async () => { assert.equal(save.read().currentUserId, player.id); synchronizations += 1; });
  assert((await auth.resume()).ok); assert((await auth.register({ username: player.username, nickname: player.nickname, password: 'LongPassword1!', confirmPassword: 'LongPassword1!', acceptedTerms: true })).ok);
  assert((await auth.login({ username: player.username, password: 'LongPassword1!', remember: true })).ok); assert((await auth.guestLogin()).ok); assert.equal(synchronizations, 4, 'every completed remote authentication must trigger mailbox synchronization');
  assert((await new RemoteAuthService(save, api, async () => { throw new Error('temporary mailbox failure'); }).resume()).ok, 'mailbox synchronization failure must not invalidate an established session');
};

const main = async (): Promise<void> => {
  await testDefinitiveSpinErrors();
  await testAuthoritativeMail();
  await testAuthenticationMailSynchronization();
  process.stdout.write('service regression tests passed\n');
};
void main();
