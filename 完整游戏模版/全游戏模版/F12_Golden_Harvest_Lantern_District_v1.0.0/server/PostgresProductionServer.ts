import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { GAME_CONFIG_BY_ID } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import type { GameId, SpinResult } from '../assets/scripts/math/types';
import { SecureRNG } from '../assets/scripts/core/SecureRNG';
import { PRIVACY_VERSION, TERMS_VERSION } from '../assets/scripts/core/ReleaseConfig';
import { AppleSignedTransactionVerifier, type AppleTransactionPayload } from './AppleSignedTransactionVerifier';
import { AppleIdentityTokenVerifier } from './AppleIdentityTokenVerifier';

const MAX_BODY = 32_000; const SESSION_MS = 12 * 60 * 60 * 1_000;
const deriveScrypt = (value: string, salt: Buffer, length: number): Promise<Buffer> => new Promise((ok, fail) => scryptCallback(value, salt, length, { N: 16_384, r: 8, p: 1 }, (error, derived) => error ? fail(error) : ok(derived)));
const tokenHash = (token: string): Buffer => createHash('sha256').update(token, 'utf8').digest();

class ApiError extends Error { public constructor(public readonly status: number, message: string) { super(message); } }
interface Credential { salt: Buffer; hash: Buffer; }
interface PlayerSettings { music: boolean; sound: boolean; vibration: boolean; quality: 'low' | 'medium' | 'high'; language: 'en' | 'zh-CN'; }
interface Account { id: string; appAccountToken: string; username: string; nickname: string; avatar: number; settings: PlayerSettings; isGuest: boolean; signInProvider: 'password' | 'apple' | 'guest'; credential?: Credential; credits: number; }
interface Session { account: Account; csrfToken: string; }
interface ProductMap extends ReadonlyMap<string, number> {}

const numberValue = (value: unknown): number => typeof value === 'number' ? value : Number(value);
const DEFAULT_SETTINGS: PlayerSettings = { music: true, sound: true, vibration: true, quality: 'medium', language: 'en' };
const settingsValue = (value: unknown): PlayerSettings => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    music: typeof source.music === 'boolean' ? source.music : true,
    sound: typeof source.sound === 'boolean' ? source.sound : true,
    vibration: typeof source.vibration === 'boolean' ? source.vibration : true,
    quality: source.quality === 'low' || source.quality === 'high' ? source.quality : 'medium',
    language: source.language === 'zh-CN' ? 'zh-CN' : 'en',
  };
};
const accountFromRow = (row: QueryResultRow): Account => ({
  id: String(row.id), appAccountToken: String(row.app_account_token), username: String(row.username), nickname: String(row.nickname), isGuest: Boolean(row.is_guest),
  signInProvider: Boolean(row.is_guest) ? 'guest' : row.apple_subject ? 'apple' : 'password',
  avatar: Math.max(0, Math.min(15, Math.floor(numberValue(row.avatar ?? 0)))), settings: settingsValue(row.settings),
  credential: row.password_hash && row.password_salt ? { hash: Buffer.from(row.password_hash as Buffer), salt: Buffer.from(row.password_salt as Buffer) } : undefined,
  credits: numberValue(row.balance),
});

class PostgresGameService {
  private readonly generator = new ResultGenerator(); private readonly rng = new SecureRNG();
  public constructor(private readonly pool: Pool, private readonly pepper: string, private readonly appleVerifier: AppleSignedTransactionVerifier, private readonly appleIdentityVerifier: AppleIdentityTokenVerifier, private readonly iapCredits: ProductMap) {}

  public async health(): Promise<void> { await this.pool.query('SELECT 1'); }

  public async register(input: Record<string, unknown>): Promise<Account> {
    const username = typeof input.username === 'string' ? input.username.trim() : ''; const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : ''; const password = typeof input.password === 'string' ? input.password : '';
    if (!/^[A-Za-z0-9_]{3,18}$/.test(username) || nickname.length < 2 || nickname.length > 18 || password.length < 10 || password.length > 72 || input.acceptedTerms !== true || input.confirmedEligibility !== true || input.termsVersion !== TERMS_VERSION || input.privacyVersion !== PRIVACY_VERSION) throw new ApiError(400, 'Invalid registration or compliance details.');
    const salt = randomBytes(16); const hash = await deriveScrypt(`${password}${this.pepper}`, salt, 32); const id = randomUUID(); const appAccountToken = randomUUID(); const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO accounts (id, username, nickname, app_account_token, password_hash, password_salt, is_guest, terms_version, privacy_version, terms_accepted_at, age_confirmed_at) VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, now(), now())', [id, username, nickname, appAccountToken, hash, salt, TERMS_VERSION, PRIVACY_VERSION]);
      await client.query('INSERT INTO wallets (account_id, balance) VALUES ($1, $2)', [id, 100_000]); await client.query('COMMIT');
      return { id, appAccountToken, username, nickname, avatar: 0, settings: DEFAULT_SETTINGS, isGuest: false, signInProvider: 'password', credential: { hash, salt }, credits: 100_000 };
    } catch (error) { await client.query('ROLLBACK'); if ((error as { code?: string }).code === '23505') throw new ApiError(409, 'Account already exists.'); throw error; } finally { client.release(); }
  }

  public async login(input: Record<string, unknown>): Promise<Account> {
    const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : ''; const password = typeof input.password === 'string' ? input.password : '';
    const result = await this.pool.query('SELECT a.*, w.balance FROM accounts a JOIN wallets w ON w.account_id = a.id WHERE lower(a.username) = $1 AND a.deleted_at IS NULL LIMIT 1', [username]);
    const account = result.rows[0] ? accountFromRow(result.rows[0]) : undefined; const valid = account?.credential ? await this.verifyPassword(password, account.credential) : false;
    if (!account || !valid) throw new ApiError(401, 'Username or password is incorrect.'); return account;
  }

  public async appleLogin(input: Record<string, unknown>): Promise<Account> {
    if (input.acceptedTerms !== true || input.confirmedEligibility !== true || input.termsVersion !== TERMS_VERSION || input.privacyVersion !== PRIVACY_VERSION) throw new ApiError(400, 'Current eligibility, Terms and Privacy consent are required.');
    const identityToken = typeof input.identityToken === 'string' ? input.identityToken : ''; const rawNonce = typeof input.rawNonce === 'string' ? input.rawNonce : '';
    let claims; try { claims = await this.appleIdentityVerifier.verify(identityToken, rawNonce); } catch { throw new ApiError(401, 'Apple identity verification failed.'); }
    if (input.userIdentifier !== claims.sub) throw new ApiError(401, 'Apple account identifier does not match the verified token.');
    const existing = await this.pool.query('UPDATE accounts SET terms_version=$2, privacy_version=$3, terms_accepted_at=now(), age_confirmed_at=now() WHERE apple_subject=$1 AND deleted_at IS NULL RETURNING *', [claims.sub, TERMS_VERSION, PRIVACY_VERSION]);
    if (existing.rows[0]) { const wallet = await this.pool.query('SELECT balance FROM wallets WHERE account_id=$1', [existing.rows[0].id]); return accountFromRow({ ...existing.rows[0], balance: wallet.rows[0]?.balance ?? 0 }); }
    const cleanName = [input.givenName, input.familyName].filter((part): part is string => typeof part === 'string').join(' ').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 18);
    const id = randomUUID(); const appAccountToken = randomUUID(); const username = `ap_${createHash('sha256').update(claims.sub, 'utf8').digest('hex').slice(0, 15)}`; const nickname = cleanName.length >= 2 ? cleanName : 'Fortune Player'; const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO accounts (id, username, nickname, app_account_token, apple_subject, is_guest, terms_version, privacy_version, terms_accepted_at, age_confirmed_at) VALUES ($1,$2,$3,$4,$5,false,$6,$7,now(),now())', [id, username, nickname, appAccountToken, claims.sub, TERMS_VERSION, PRIVACY_VERSION]);
      await client.query('INSERT INTO wallets (account_id, balance) VALUES ($1,$2)', [id, 100_000]); await client.query('COMMIT');
      return { id, appAccountToken, username, nickname, avatar: 0, settings: DEFAULT_SETTINGS, isGuest: false, signInProvider: 'apple', credits: 100_000 };
    } catch (error) { await client.query('ROLLBACK'); if ((error as { code?: string }).code === '23505') throw new ApiError(409, 'This Apple account is already linked. Please try again.'); throw error; } finally { client.release(); }
  }

  public async guest(): Promise<Account> {
    const id = randomUUID(); const appAccountToken = randomUUID(); const username = `guest_${randomBytes(6).toString('hex')}`; const client = await this.pool.connect();
    try { await client.query('BEGIN'); await client.query('INSERT INTO accounts (id, username, nickname, app_account_token, is_guest) VALUES ($1, $2, $3, $4, true)', [id, username, 'Fortune Guest', appAccountToken]); await client.query('INSERT INTO wallets (account_id, balance) VALUES ($1, $2)', [id, 100_000]); await client.query('COMMIT'); }
    catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    return { id, appAccountToken, username, nickname: 'Fortune Guest', avatar: 0, settings: DEFAULT_SETTINGS, isGuest: true, signInProvider: 'guest', credits: 100_000 };
  }

  public async createSession(account: Account): Promise<{ token: string; csrfToken: string }> {
    const token = randomBytes(32).toString('base64url'); const csrfToken = randomBytes(24).toString('base64url'); const expiresAt = new Date(Date.now() + SESSION_MS);
    await this.pool.query('INSERT INTO sessions (token_hash, account_id, csrf_token, expires_at) VALUES ($1, $2, $3, $4)', [tokenHash(token), account.id, csrfToken, expiresAt]); return { token, csrfToken };
  }

  public async session(token: string): Promise<Session | undefined> {
    if (!token) return undefined; const result = await this.pool.query('SELECT a.*, w.balance, s.csrf_token FROM sessions s JOIN accounts a ON a.id = s.account_id JOIN wallets w ON w.account_id = a.id WHERE s.token_hash = $1 AND s.expires_at > now() AND a.deleted_at IS NULL LIMIT 1', [tokenHash(token)]);
    return result.rows[0] ? { account: accountFromRow(result.rows[0]), csrfToken: String(result.rows[0].csrf_token) } : undefined;
  }

  public async logout(token: string): Promise<void> { if (token) await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash(token)]); }

  public async deleteAccount(account: Account, password: string): Promise<void> {
    if (account.signInProvider === 'password') { const valid = account.credential ? await this.verifyPassword(password, account.credential) : false; if (!valid) throw new ApiError(401, 'Password is incorrect.'); }
    const client = await this.pool.connect(); try {
      await client.query('BEGIN'); await client.query('DELETE FROM rounds WHERE account_id = $1', [account.id]); await client.query('DELETE FROM reward_claims WHERE account_id = $1', [account.id]); await client.query("DELETE FROM wallet_transactions WHERE account_id = $1 AND kind NOT IN ('store-iap', 'store-refund')", [account.id]); await client.query('DELETE FROM sessions WHERE account_id = $1', [account.id]);
      if (account.isGuest) await client.query('DELETE FROM accounts WHERE id = $1', [account.id]);
      else { await client.query("UPDATE accounts SET username = 'deleted_' || id::text, nickname = 'Deleted Player', apple_subject = NULL, password_hash = NULL, password_salt = NULL, deleted_at = now() WHERE id = $1", [account.id]); await client.query('UPDATE wallets SET balance = 0, version = version + 1 WHERE account_id = $1', [account.id]); }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  public async spin(account: Account, input: Record<string, unknown>): Promise<{ result: SpinResult; balance: number }> {
    const gameId = input.gameId as GameId; const config = GAME_CONFIG_BY_ID[gameId]; const bet = Number(input.bet); const requestId = typeof input.requestId === 'string' ? input.requestId : '';
    if (!config || !config.bets.includes(bet) || !/^[A-Za-z0-9_-]{12,80}$/.test(requestId)) throw new ApiError(400, 'Invalid spin request.'); const client = await this.pool.connect();
    try {
      await client.query('BEGIN'); await client.query('SELECT balance FROM wallets WHERE account_id = $1 FOR UPDATE', [account.id]);
      const replay = await client.query('SELECT result_json, balance_after FROM rounds WHERE account_id = $1 AND request_id = $2', [account.id, requestId]); if (replay.rows[0]) { await client.query('COMMIT'); return { result: replay.rows[0].result_json as SpinResult, balance: numberValue(replay.rows[0].balance_after) }; }
      const wallet = await client.query('SELECT balance FROM wallets WHERE account_id = $1', [account.id]); const balance = numberValue(wallet.rows[0]?.balance); if (!Number.isSafeInteger(balance) || balance < bet) throw new ApiError(409, 'Insufficient credits.');
      const result = this.generator.generate(config, bet, this.rng); const nextBalance = balance - bet + result.totalWin; if (!Number.isSafeInteger(nextBalance) || nextBalance < 0 || result.totalWin > 50_000_000) throw new ApiError(500, 'Round settlement rejected.');
      await client.query('UPDATE wallets SET balance = $2, version = version + 1 WHERE account_id = $1', [account.id, nextBalance]);
      await client.query('INSERT INTO rounds (id, account_id, request_id, game_id, bet, win, result_json, balance_after) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [randomUUID(), account.id, requestId, gameId, bet, result.totalWin, JSON.stringify(result), nextBalance]);
      await client.query('INSERT INTO wallet_transactions (id, account_id, round_id, kind, amount, balance_after, idempotency_key) SELECT $1,$2,id,$3,$4,$5,$6 FROM rounds WHERE account_id=$2 AND request_id=$7', [randomUUID(), account.id, 'spin-settlement', result.totalWin - bet, nextBalance, `round:${requestId}`, requestId]);
      await client.query('COMMIT'); return { result, balance: nextBalance };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  public async verifyPurchase(account: Account, input: Record<string, unknown>): Promise<{ status: 'verified'; productId: string; transactionId: string; creditedCredits: number; authoritativeBalance: number }> {
    if (account.isGuest) throw new ApiError(403, 'Guest accounts cannot purchase coins.'); const signed = typeof input.signedTransactionInfo === 'string' ? input.signedTransactionInfo : ''; let transaction: AppleTransactionPayload;
    try { transaction = this.appleVerifier.verify(signed); } catch { throw new ApiError(400, 'Apple transaction verification failed.'); }
    if (transaction.appAccountToken !== account.appAccountToken) throw new ApiError(403, 'Apple transaction account token does not match the signed-in player.'); const credits = this.iapCredits.get(transaction.productId); if (!credits) throw new ApiError(400, 'Apple product is not configured.'); const client = await this.pool.connect();
    try {
      await client.query('BEGIN'); await client.query("SELECT pg_advisory_xact_lock(hashtextextended('apple:' || $1, 0))", [transaction.transactionId]); const existing = await client.query('SELECT account_id, product_id, credited_amount, status FROM purchase_receipts WHERE platform=$1 AND external_transaction_id=$2 FOR UPDATE', ['apple', transaction.transactionId]);
      if (existing.rows[0] && String(existing.rows[0].account_id) !== account.id) throw new ApiError(409, 'Apple transaction belongs to another account.');
      if (existing.rows[0] && existing.rows[0].status !== 'credited') throw new ApiError(409, 'Apple transaction is no longer eligible for delivery.');
      await client.query('SELECT balance FROM wallets WHERE account_id=$1 FOR UPDATE', [account.id]);
      if (!existing.rows[0]) {
        await client.query('INSERT INTO purchase_receipts (id, account_id, platform, external_transaction_id, product_id, status, credited_amount, verified_payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [randomUUID(), account.id, 'apple', transaction.transactionId, transaction.productId, 'credited', credits, JSON.stringify(transaction)]);
        await client.query('UPDATE wallets SET balance=balance+$2, version=version+1 WHERE account_id=$1', [account.id, credits]);
        await client.query("INSERT INTO wallet_transactions (id, account_id, kind, amount, balance_after, idempotency_key) SELECT $1,$2,'store-iap',$3,balance,$4 FROM wallets WHERE account_id=$2", [randomUUID(), account.id, credits, `apple:${transaction.transactionId}`]);
      }
      const wallet = await client.query('SELECT balance FROM wallets WHERE account_id=$1', [account.id]); await client.query('COMMIT'); return { status: 'verified', productId: transaction.productId, transactionId: transaction.transactionId, creditedCredits: credits, authoritativeBalance: numberValue(wallet.rows[0].balance) };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  public async synchronizePurchases(account: Account): Promise<{ status: 'verified'; authoritativeBalance: number }> { const result = await this.pool.query('SELECT balance FROM wallets WHERE account_id=$1', [account.id]); if (!result.rows[0]) throw new ApiError(404, 'Wallet not found.'); return { status: 'verified', authoritativeBalance: numberValue(result.rows[0].balance) }; }

  public async updateProfile(account: Account, input: Record<string, unknown>): Promise<Account> {
    let nickname: string | null = null; let avatar: number | null = null; const settings: Partial<PlayerSettings> = {}; let changed = false;
    if (input.nickname !== undefined) { if (typeof input.nickname !== 'string' || input.nickname.trim().length < 2 || input.nickname.trim().length > 18) throw new ApiError(400, 'Nickname must contain 2–18 characters.'); nickname = input.nickname.trim(); changed = true; }
    if (input.avatar !== undefined) { if (!Number.isSafeInteger(input.avatar) || Number(input.avatar) < 0 || Number(input.avatar) > 15) throw new ApiError(400, 'Avatar is invalid.'); avatar = Number(input.avatar); changed = true; }
    if (input.settings !== undefined) {
      if (!input.settings || typeof input.settings !== 'object' || Array.isArray(input.settings)) throw new ApiError(400, 'Settings are invalid.');
      const patch = input.settings as Record<string, unknown>; const allowed = new Set(['music', 'sound', 'vibration', 'quality', 'language']);
      if (Object.keys(patch).some((key) => !allowed.has(key))) throw new ApiError(400, 'Settings contain an unsupported field.');
      if (patch.music !== undefined) { if (typeof patch.music !== 'boolean') throw new ApiError(400, 'Music setting is invalid.'); settings.music = patch.music; }
      if (patch.sound !== undefined) { if (typeof patch.sound !== 'boolean') throw new ApiError(400, 'Sound setting is invalid.'); settings.sound = patch.sound; }
      if (patch.vibration !== undefined) { if (typeof patch.vibration !== 'boolean') throw new ApiError(400, 'Vibration setting is invalid.'); settings.vibration = patch.vibration; }
      if (patch.quality !== undefined) { if (patch.quality !== 'low' && patch.quality !== 'medium' && patch.quality !== 'high') throw new ApiError(400, 'Quality setting is invalid.'); settings.quality = patch.quality; }
      if (patch.language !== undefined) { if (patch.language !== 'en' && patch.language !== 'zh-CN') throw new ApiError(400, 'Language setting is invalid.'); settings.language = patch.language; }
      changed = Object.keys(settings).length > 0 || changed;
    }
    if (!changed) throw new ApiError(400, 'No profile changes were supplied.');
    const result = await this.pool.query('UPDATE accounts SET nickname=coalesce($2,nickname), avatar=coalesce($3,avatar), settings=settings || $4::jsonb WHERE id=$1 AND deleted_at IS NULL RETURNING *', [account.id, nickname, avatar, JSON.stringify(settings)]);
    if (!result.rows[0]) throw new ApiError(404, 'Account not found.'); return { ...accountFromRow({ ...result.rows[0], balance: account.credits }), credits: account.credits };
  }

  public async leaderboard(account: Account, period: string): Promise<{ entries: Array<{ rank: number; nickname: string; winnings: number; avatar: number; current: boolean }> }> {
    if (period !== 'daily' && period !== 'weekly' && period !== 'all-time') throw new ApiError(400, 'Leaderboard period is invalid.');
    const timeFilter = period === 'daily' ? "AND r.created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')" : period === 'weekly' ? "AND r.created_at >= (date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')" : '';
    const result = await this.pool.query(`WITH scores AS (
      SELECT a.id, a.nickname, a.avatar, coalesce(sum(r.win), 0)::bigint AS winnings
      FROM accounts a LEFT JOIN rounds r ON r.account_id=a.id ${timeFilter}
      WHERE a.deleted_at IS NULL AND a.is_guest=false GROUP BY a.id, a.nickname, a.avatar
    ), ranked AS (
      SELECT id, nickname, avatar, winnings, row_number() OVER (ORDER BY winnings DESC, id ASC)::int AS position FROM scores
    ) SELECT * FROM ranked WHERE position <= 8 OR id=$1 ORDER BY position ASC`, [account.id]);
    const mapped = result.rows.map((row) => ({ rank: numberValue(row.position), nickname: String(row.nickname), winnings: numberValue(row.winnings), avatar: numberValue(row.avatar), current: String(row.id) === account.id }));
    const current = mapped.find((entry) => entry.current); const top = mapped.filter((entry) => entry.rank <= 8);
    return { entries: current && current.rank > 8 ? [...top.slice(0, 7), current] : top.slice(0, 8) };
  }

  public async claimReward(account: Account, input: Record<string, unknown>): Promise<{ rewardKey: string; amount: number; balance: number; detail?: { day?: number; sector?: number } }> {
    const kind = typeof input.kind === 'string' ? input.kind : ''; const id = typeof input.id === 'string' ? input.id : ''; const today = new Date().toISOString().slice(0, 10); let rewardKey = ''; let amount = 0; let detail: { day?: number; sector?: number } | undefined;
    if (kind === 'daily') { rewardKey = `daily-free:${today}`; amount = 5_000; }
    else if (kind === 'check-in') { const count = await this.pool.query("SELECT count(*)::int AS count FROM reward_claims WHERE account_id=$1 AND reward_key LIKE 'check-in:%'", [account.id]); const day = numberValue(count.rows[0]?.count) % 7; const rewards = [2_000, 3_000, 5_000, 8_000, 12_000, 18_000, 50_000] as const; rewardKey = `check-in:${today}`; amount = rewards[day]; detail = { day: day + 1 }; }
    else if (kind === 'wheel') { const sectors = [1_000, 2_000, 5_000, 10_000, 1_500, 3_000, 8_000, 25_000] as const; const sector = this.rng.int(0, sectors.length); rewardKey = `wheel:${today}`; amount = sectors[sector]; detail = { sector }; }
    else if (kind === 'mail') { const mail = new Map([['welcome', 5_000], ['weekend', 3_000]]); amount = mail.get(id) ?? 0; rewardKey = `mail:${id}`; }
    else if (kind === 'achievement') {
      const stats = await this.pool.query("SELECT count(*)::int AS spins, coalesce(sum(win),0)::bigint AS total_win, count(*) FILTER (WHERE result_json ? 'feature')::int AS features FROM rounds WHERE account_id=$1", [account.id]); const row = stats.rows[0] ?? {}; const achievements = new Map<string, { eligible: boolean; amount: number }>([
        ['first-spin', { eligible: numberValue(row.spins) >= 1, amount: 1_000 }], ['spin-25', { eligible: numberValue(row.spins) >= 25, amount: 5_000 }], ['win-10000', { eligible: numberValue(row.total_win) >= 10_000, amount: 8_000 }], ['feature-3', { eligible: numberValue(row.features) >= 3, amount: 12_000 }],
      ]); const reward = achievements.get(id); if (!reward?.eligible) throw new ApiError(409, 'Achievement is not ready.'); rewardKey = `achievement:${id}`; amount = reward.amount;
    }
    if (!rewardKey || amount <= 0) throw new ApiError(400, 'Reward request is invalid.'); const client = await this.pool.connect();
    try {
      await client.query('BEGIN'); await client.query('SELECT balance FROM wallets WHERE account_id=$1 FOR UPDATE', [account.id]); const inserted = await client.query('INSERT INTO reward_claims (account_id, reward_key, amount) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING reward_key', [account.id, rewardKey, amount]); if ((inserted.rowCount ?? 0) === 0) throw new ApiError(409, 'Reward already claimed.'); await client.query('UPDATE wallets SET balance=balance+$2,version=version+1 WHERE account_id=$1', [account.id, amount]); await client.query("INSERT INTO wallet_transactions (id, account_id, kind, amount, balance_after, idempotency_key) SELECT $1,$2,$3,$4,balance,$5 FROM wallets WHERE account_id=$2", [randomUUID(), account.id, kind, amount, `reward:${rewardKey}`]); const wallet = await client.query('SELECT balance FROM wallets WHERE account_id=$1', [account.id]); await client.query('COMMIT'); return { rewardKey, amount, balance: numberValue(wallet.rows[0].balance), detail };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  public async handleAppleNotification(input: Record<string, unknown>): Promise<void> {
    const signed = typeof input.signedPayload === 'string' ? input.signedPayload : ''; let notification: Record<string, unknown>; try { notification = this.appleVerifier.verifyNotification(signed); } catch { throw new ApiError(400, 'Apple notification verification failed.'); }
    const type = typeof notification.notificationType === 'string' ? notification.notificationType : ''; const notificationUuid = typeof notification.notificationUUID === 'string' ? notification.notificationUUID : ''; const data = notification.data && typeof notification.data === 'object' ? notification.data as Record<string, unknown> : {}; const signedTransaction = typeof data.signedTransactionInfo === 'string' ? data.signedTransactionInfo : '';
    if (!/^[0-9a-f-]{36}$/i.test(notificationUuid)) throw new ApiError(400, 'Apple notification identifier is invalid.'); let transaction: AppleTransactionPayload | undefined; if (signedTransaction) { try { transaction = this.appleVerifier.verify(signedTransaction, true); } catch { throw new ApiError(400, 'Apple notification transaction verification failed.'); } }
    const client = await this.pool.connect(); try {
      await client.query('BEGIN'); const inserted = await client.query('INSERT INTO app_store_notifications (notification_uuid, notification_type, transaction_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING notification_uuid', [notificationUuid, type || 'UNKNOWN', transaction?.transactionId ?? null]); if ((inserted.rowCount ?? 0) === 0) { await client.query('COMMIT'); return; }
      if (transaction && ['REFUND', 'REVOKE'].includes(type)) {
        const receipt = await client.query("SELECT account_id, credited_amount, status FROM purchase_receipts WHERE platform='apple' AND external_transaction_id=$1 FOR UPDATE", [transaction.transactionId]); const row = receipt.rows[0];
        if (row && row.status === 'credited') { const accountId = String(row.account_id); const amount = numberValue(row.credited_amount); await client.query('SELECT balance FROM wallets WHERE account_id=$1 FOR UPDATE', [accountId]); await client.query('UPDATE wallets SET balance=greatest(0,balance-$2), version=version+1 WHERE account_id=$1', [accountId, amount]); await client.query("UPDATE purchase_receipts SET status='revoked', revoked_at=now(), verified_payload=$2 WHERE platform='apple' AND external_transaction_id=$1", [transaction.transactionId, JSON.stringify(transaction)]); await client.query("INSERT INTO wallet_transactions (id, account_id, kind, amount, balance_after, idempotency_key) SELECT $1,$2,'store-refund',$3,balance,$4 FROM wallets WHERE account_id=$2", [randomUUID(), accountId, -amount, `apple-refund:${transaction.transactionId}`]); }
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  private async verifyPassword(password: string, credential: Credential): Promise<boolean> { try { const actual = await deriveScrypt(`${password}${this.pepper}`, credential.salt, credential.hash.length); return actual.length === credential.hash.length && timingSafeEqual(actual, credential.hash); } catch { return false; } }
}

const required = (name: string): string => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; };
const allowedOrigin = required('CSW_ALLOWED_ORIGIN'); if (!allowedOrigin.startsWith('https://')) throw new Error('CSW_ALLOWED_ORIGIN must use HTTPS.');
const pepper = required('CSW_SESSION_PEPPER'); if (pepper.length < 32) throw new Error('CSW_SESSION_PEPPER must contain at least 32 characters.');
const databaseUrl = required('DATABASE_URL'); const appleBundleId = required('CSW_APPLE_BUNDLE_ID'); const appleRootPaths = required('CSW_APPLE_ROOT_CA_PATHS').split(',').map((value) => value.trim()).filter(Boolean); const appleEnvironment = process.env.CSW_APPLE_ENVIRONMENT === 'Sandbox' ? 'Sandbox' : 'Production';
const parseProducts = (source: string): ProductMap => { const parsed = JSON.parse(source) as unknown; if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('CSW_IAP_PRODUCTS must be a JSON object.'); const entries = Object.entries(parsed as Record<string, unknown>).map(([id, credits]) => { if (!/^[A-Za-z0-9._-]{3,180}$/.test(id) || typeof credits !== 'number' || !Number.isSafeInteger(credits) || credits <= 0 || credits > 10_000_000) throw new Error(`Invalid IAP product mapping: ${id}`); return [id, credits] as const; }); if (!entries.length) throw new Error('At least one IAP product is required.'); return new Map(entries); };
const products = parseProducts(required('CSW_IAP_PRODUCTS')); const verifier = new AppleSignedTransactionVerifier({ bundleId: appleBundleId, environment: appleEnvironment, rootCertificatePaths: appleRootPaths }); const identityVerifier = new AppleIdentityTokenVerifier(appleBundleId); const pool = new Pool({ connectionString: databaseUrl, max: Number(process.env.CSW_DB_POOL_SIZE ?? 12), ssl: process.env.CSW_DB_SSL === 'disable' ? false : { rejectUnauthorized: true } }); const service = new PostgresGameService(pool, pepper, verifier, identityVerifier, products);
const webRoot = resolve(process.env.CSW_WEB_ROOT ?? join(process.cwd(), 'build/web-mobile')); const port = Number.parseInt(process.env.PORT ?? '4191', 10); const host = process.env.HOST ?? '0.0.0.0';

const securityHeaders = { 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'", 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin' };
const json = (response: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}): void => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }); response.end(JSON.stringify(value)); };
const cookies = (request: IncomingMessage): Record<string, string> => Object.fromEntries((request.headers.cookie ?? '').split(';').flatMap((part) => { const index = part.indexOf('='); return index < 0 ? [] : [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))]]; }));
const requestBody = async (request: IncomingMessage): Promise<Record<string, unknown>> => { let size = 0; const chunks: Buffer[] = []; for await (const chunk of request) { const value = Buffer.from(chunk); size += value.length; if (size > MAX_BODY) throw new ApiError(413, 'Request body too large.'); chunks.push(value); } try { const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as unknown; if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed as Record<string, unknown>; } catch { throw new ApiError(400, 'Invalid JSON body.'); } };
const sessionCookie = (token: string, maxAge = Math.floor(SESSION_MS / 1000)): string => `csw_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const publicPlayer = (account: Account) => ({ id: account.id, appAccountToken: account.appAccountToken, username: account.username, nickname: account.nickname, avatar: account.avatar, settings: account.settings, isGuest: account.isGuest, signInProvider: account.signInProvider, credits: account.credits });
const issueSession = async (response: ServerResponse, account: Account): Promise<void> => { const session = await service.createSession(account); json(response, 200, { player: publicPlayer(account), csrfToken: session.csrfToken }, { 'Set-Cookie': sessionCookie(session.token) }); };
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.wasm': 'application/wasm', '.bin': 'application/octet-stream' };
const serveStatic = (pathname: string, response: ServerResponse): void => { const relative = pathname === '/' ? 'index.html' : normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, ''); const target = resolve(webRoot, relative); if (!target.startsWith(`${webRoot}/`) || !existsSync(target) || !statSync(target).isFile()) throw new ApiError(404, 'File not found.'); response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream', 'Cache-Control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable', ...securityHeaders }); createReadStream(target).pipe(response); };

interface RateWindow { startedAt: number; count: number; }
const rateWindows = new Map<string, RateWindow>();
const requestAddress = (request: IncomingMessage): string => {
  if (process.env.CSW_TRUST_PROXY === '1') { const forwarded = request.headers['x-forwarded-for']; const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]; if (first?.trim()) return first.trim().slice(0, 80); }
  return request.socket.remoteAddress?.slice(0, 80) ?? 'unknown';
};
const consumeRateLimit = (request: IncomingMessage, pathname: string): { ok: boolean; retryAfter: number } => {
  if (!pathname.startsWith('/api/') || pathname === '/api/health') return { ok: true, retryAfter: 0 };
  const now = Date.now(); const windowMs = 60_000; const limit = pathname.startsWith('/api/auth/') ? 20 : pathname === '/api/spins' ? 180 : pathname.startsWith('/api/store/') ? 40 : 120; const key = `${requestAddress(request)}:${pathname}`; const current = rateWindows.get(key);
  if (!current || now - current.startedAt >= windowMs) { rateWindows.set(key, { startedAt: now, count: 1 }); return { ok: true, retryAfter: 0 }; }
  current.count += 1; if (rateWindows.size > 20_000) { for (const [entry, value] of rateWindows) if (now - value.startedAt >= windowMs) rateWindows.delete(entry); while (rateWindows.size > 20_000) rateWindows.delete(rateWindows.keys().next().value as string); }
  return { ok: current.count <= limit, retryAfter: Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000)) };
};

const server = createServer(async (request, response) => {
  Object.entries(securityHeaders).forEach(([name, value]) => response.setHeader(name, value));
  try {
    const url = new URL(request.url ?? '/', allowedOrigin); const method = request.method ?? 'GET'; const callback = url.pathname === '/api/store/apple-notifications';
    if (request.headers['x-forwarded-proto'] !== 'https' && process.env.CSW_TRUST_DIRECT_TLS !== '1') throw new ApiError(400, 'HTTPS is required.');
    const rate = consumeRateLimit(request, url.pathname); if (!rate.ok) return json(response, 429, { error: 'Too many requests. Please try again shortly.' }, { 'Retry-After': String(rate.retryAfter) });
    if (method !== 'GET' && method !== 'HEAD' && !callback && request.headers.origin !== allowedOrigin) throw new ApiError(403, 'Origin rejected.');
    if (url.pathname === '/api/health' && method === 'GET') { await service.health(); return json(response, 200, { status: 'ok' }); }
    if (callback && method === 'POST') { await service.handleAppleNotification(await requestBody(request)); return json(response, 200, {}); }
    const rawToken = cookies(request).csw_session ?? ''; const authenticated = await service.session(rawToken);
    if (url.pathname === '/api/auth/register' && method === 'POST') return void await issueSession(response, await service.register(await requestBody(request)));
    if (url.pathname === '/api/auth/login' && method === 'POST') return void await issueSession(response, await service.login(await requestBody(request)));
    if (url.pathname === '/api/auth/apple' && method === 'POST') return void await issueSession(response, await service.appleLogin(await requestBody(request)));
    if (url.pathname === '/api/auth/guest' && method === 'POST') return void await issueSession(response, await service.guest());
    if (url.pathname === '/api/auth/logout' && method === 'POST') { if (authenticated && request.headers['x-csrf-token'] !== authenticated.csrfToken) throw new ApiError(403, 'CSRF token rejected.'); await service.logout(rawToken); return json(response, 200, {}, { 'Set-Cookie': sessionCookie('', 0) }); }
    if (url.pathname.startsWith('/api/')) {
      if (!authenticated) throw new ApiError(401, 'Authentication required.'); if (method !== 'GET' && request.headers['x-csrf-token'] !== authenticated.csrfToken) throw new ApiError(403, 'CSRF token rejected.');
      if (url.pathname === '/api/me' && method === 'GET') return json(response, 200, { player: publicPlayer(authenticated.account), csrfToken: authenticated.csrfToken });
      if (url.pathname === '/api/rank' && method === 'GET') return json(response, 200, await service.leaderboard(authenticated.account, url.searchParams.get('period') ?? 'daily'));
      if (url.pathname === '/api/profile' && method === 'PATCH') return json(response, 200, { player: publicPlayer(await service.updateProfile(authenticated.account, await requestBody(request))) });
      if (url.pathname === '/api/spins' && method === 'POST') return json(response, 200, await service.spin(authenticated.account, await requestBody(request)));
      if (url.pathname === '/api/store/verify' && method === 'POST') return json(response, 200, await service.verifyPurchase(authenticated.account, await requestBody(request)));
      if (url.pathname === '/api/store/sync' && method === 'POST') return json(response, 200, await service.synchronizePurchases(authenticated.account));
      if (url.pathname === '/api/rewards/claim' && method === 'POST') return json(response, 200, await service.claimReward(authenticated.account, await requestBody(request)));
      if (url.pathname === '/api/account' && method === 'DELETE') { await service.deleteAccount(authenticated.account, String((await requestBody(request)).password ?? '')); return json(response, 200, {}, { 'Set-Cookie': sessionCookie('', 0) }); }
      throw new ApiError(404, 'API route not found.');
    }
    serveStatic(url.pathname, response);
  } catch (error) { const failure = error instanceof ApiError ? error : new ApiError(500, 'Internal server error.'); json(response, failure.status, { error: failure.message }); }
});

server.listen(port, host, () => process.stdout.write(`Aurelia production service listening on ${host}:${port}\n`));
const shutdown = (): void => { server.close(() => void pool.end().finally(() => process.exit(0))); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
