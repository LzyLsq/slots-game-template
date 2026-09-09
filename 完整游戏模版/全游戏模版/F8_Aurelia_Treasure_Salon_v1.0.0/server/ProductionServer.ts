import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { GAME_CONFIG_BY_ID } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import type { GameId, SpinResult } from '../assets/scripts/math/types';
import { SecureRNG } from '../assets/scripts/core/SecureRNG';
import { AppleSignedTransactionVerifier, type AppleTransactionPayload } from './AppleSignedTransactionVerifier';

const deriveScrypt = (value: string, salt: Buffer, length: number): Promise<Buffer> => new Promise((resolve, reject) => {
  scryptCallback(value, salt, length, { N: 16_384, r: 8, p: 1 }, (error, derived) => error ? reject(error) : resolve(derived));
});
const MAX_BODY = 20_000;
const SESSION_MS = 12 * 60 * 60 * 1_000;

interface Credential { salt: string; hash: string; }
interface Account { id: string; appAccountToken: string; username: string; nickname: string; isGuest: boolean; credential?: Credential; credits: number; rounds: Map<string, { result: SpinResult; balance: number }>; }
interface Session { accountId: string; csrfToken: string; expiresAt: number; }
interface PurchaseRecord { accountId: string; productId: string; credits: number; status: 'credited' | 'revoked'; }

class AuthoritativeGameService {
  private readonly accounts = new Map<string, Account>();
  private readonly usernames = new Map<string, string>();
  private readonly sessions = new Map<string, Session>();
  private readonly generator = new ResultGenerator();
  private readonly rng = new SecureRNG();
  private readonly purchases = new Map<string, PurchaseRecord>();
  public constructor(private readonly pepper: string, private readonly appleVerifier?: AppleSignedTransactionVerifier, private readonly iapCredits: ReadonlyMap<string, number> = new Map()) {}

  public async register(input: Record<string, unknown>): Promise<Account> {
    const username = typeof input.username === 'string' ? input.username.trim() : ''; const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : ''; const password = typeof input.password === 'string' ? input.password : '';
    if (!/^[A-Za-z0-9_]{3,18}$/.test(username) || nickname.length < 2 || nickname.length > 18 || password.length < 10 || password.length > 72 || input.acceptedTerms !== true) throw new ApiError(400, 'Invalid registration details.');
    const key = username.toLowerCase(); if (this.usernames.has(key)) throw new ApiError(409, 'Account already exists.');
    const account: Account = { id: SecureRNG.id('player'), appAccountToken: randomUUID(), username, nickname, isGuest: false, credential: await this.hashPassword(password), credits: 100_000, rounds: new Map() };
    this.accounts.set(account.id, account); this.usernames.set(key, account.id); return account;
  }

  public async login(input: Record<string, unknown>): Promise<Account> {
    const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : ''; const password = typeof input.password === 'string' ? input.password : ''; const id = this.usernames.get(username); const account = id ? this.accounts.get(id) : undefined;
    const valid = account?.credential ? await this.verifyPassword(password, account.credential) : false; if (!account || !valid) throw new ApiError(401, 'Username or password is incorrect.'); return account;
  }

  public guest(): Account { const account: Account = { id: SecureRNG.id('guest'), appAccountToken: randomUUID(), username: SecureRNG.id('guest').slice(-12), nickname: 'Starlight Guest', isGuest: true, credits: 100_000, rounds: new Map() }; this.accounts.set(account.id, account); return account; }
  public createSession(account: Account): { token: string; session: Session } { const token = randomBytes(32).toString('base64url'); const session = { accountId: account.id, csrfToken: randomBytes(24).toString('base64url'), expiresAt: Date.now() + SESSION_MS }; this.sessions.set(token, session); return { token, session }; }
  public session(token: string): { account: Account; session: Session } | undefined { const session = this.sessions.get(token); if (!session || session.expiresAt <= Date.now()) { if (token) this.sessions.delete(token); return undefined; } const account = this.accounts.get(session.accountId); return account ? { account, session } : undefined; }
  public logout(token: string): void { this.sessions.delete(token); }

  public async deleteAccount(account: Account, password: string): Promise<void> {
    if (!account.isGuest) {
      const valid = account.credential ? await this.verifyPassword(password, account.credential) : false;
      if (!valid) throw new ApiError(401, 'Password is incorrect.');
    }
    this.accounts.delete(account.id); if (!account.isGuest) this.usernames.delete(account.username.toLowerCase());
    for (const [token, session] of this.sessions) if (session.accountId === account.id) this.sessions.delete(token);
  }

  public verifyPurchase(account: Account, input: Record<string, unknown>): { status: 'verified'; productId: string; transactionId: string; creditedCredits: number; authoritativeBalance: number } {
    if (account.isGuest) throw new ApiError(403, 'Guest accounts cannot purchase coins.');
    if (!this.appleVerifier) throw new ApiError(503, 'Apple transaction verification is not configured.');
    const signedTransactionInfo = typeof input.signedTransactionInfo === 'string' ? input.signedTransactionInfo : '';
    let transaction: AppleTransactionPayload; try { transaction = this.appleVerifier.verify(signedTransactionInfo); } catch { throw new ApiError(400, 'Apple transaction verification failed.'); }
    if (transaction.appAccountToken !== account.appAccountToken) throw new ApiError(403, 'Apple transaction account token does not match the signed-in player.');
    const credits = this.iapCredits.get(transaction.productId); if (!credits) throw new ApiError(400, 'Apple product is not configured.');
    const existing = this.purchases.get(transaction.transactionId);
    if (existing && existing.accountId !== account.id) throw new ApiError(409, 'Apple transaction belongs to another account.');
    if (!existing) { account.credits += credits; this.purchases.set(transaction.transactionId, { accountId: account.id, productId: transaction.productId, credits, status: 'credited' }); }
    return { status: 'verified', productId: transaction.productId, transactionId: transaction.transactionId, creditedCredits: credits, authoritativeBalance: account.credits };
  }

  public synchronizePurchases(account: Account): { status: 'verified'; authoritativeBalance: number } {
    if (account.isGuest) throw new ApiError(403, 'Guest accounts cannot synchronize purchases.');
    return { status: 'verified', authoritativeBalance: account.credits };
  }

  public handleAppleNotification(input: Record<string, unknown>): void {
    if (!this.appleVerifier) throw new ApiError(503, 'Apple transaction verification is not configured.');
    const signedPayload = typeof input.signedPayload === 'string' ? input.signedPayload : ''; let notification: Record<string, unknown>;
    try { notification = this.appleVerifier.verifyNotification(signedPayload); } catch { throw new ApiError(400, 'Apple notification verification failed.'); }
    const type = typeof notification.notificationType === 'string' ? notification.notificationType : ''; const data = notification.data && typeof notification.data === 'object' ? notification.data as Record<string, unknown> : {};
    const signedTransactionInfo = typeof data.signedTransactionInfo === 'string' ? data.signedTransactionInfo : '';
    if (!['REFUND', 'REVOKE'].includes(type) || !signedTransactionInfo) return;
    let transaction: AppleTransactionPayload; try { transaction = this.appleVerifier.verify(signedTransactionInfo, true); } catch { throw new ApiError(400, 'Apple notification transaction verification failed.'); }
    const purchase = this.purchases.get(transaction.transactionId); if (!purchase || purchase.status === 'revoked') return; const account = this.accounts.get(purchase.accountId);
    if (account) account.credits = Math.max(0, account.credits - purchase.credits); purchase.status = 'revoked';
  }

  public spin(account: Account, input: Record<string, unknown>): { result: SpinResult; balance: number } {
    const gameId = input.gameId as GameId; const config = GAME_CONFIG_BY_ID[gameId]; const bet = Number(input.bet); const requestId = typeof input.requestId === 'string' ? input.requestId : '';
    if (!config || !config.bets.includes(bet) || !/^[A-Za-z0-9_-]{12,80}$/.test(requestId)) throw new ApiError(400, 'Invalid spin request.');
    const replay = account.rounds.get(requestId); if (replay) return replay;
    if (account.credits < bet) throw new ApiError(409, 'Insufficient credits.');
    const result = this.generator.generate(config, bet, this.rng); const nextBalance = account.credits - bet + result.totalWin;
    if (!Number.isSafeInteger(nextBalance) || nextBalance < 0 || result.totalWin > 50_000_000) throw new ApiError(500, 'Round settlement rejected.');
    account.credits = nextBalance; const settled = { result, balance: nextBalance }; account.rounds.set(requestId, settled); if (account.rounds.size > 200) account.rounds.delete(account.rounds.keys().next().value as string); return settled;
  }

  private async hashPassword(password: string): Promise<Credential> { const salt = randomBytes(16); const derived = await deriveScrypt(`${password}${this.pepper}`, salt, 32); return { salt: salt.toString('base64'), hash: derived.toString('base64') }; }
  private async verifyPassword(password: string, credential: Credential): Promise<boolean> { try { const expected = Buffer.from(credential.hash, 'base64'); const actual = await deriveScrypt(`${password}${this.pepper}`, Buffer.from(credential.salt, 'base64'), expected.length); return expected.length === actual.length && timingSafeEqual(expected, actual); } catch { return false; } }
}

class ApiError extends Error { public constructor(public readonly status: number, message: string) { super(message); } }

const json = (response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }); response.end(JSON.stringify(body)); };
const cookies = (request: IncomingMessage): Record<string, string> => Object.fromEntries((request.headers.cookie ?? '').split(';').flatMap((part) => { const index = part.indexOf('='); return index < 0 ? [] : [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))]]; }));
const body = async (request: IncomingMessage): Promise<Record<string, unknown>> => { let size = 0; const chunks: Buffer[] = []; for await (const chunk of request) { const buffer = Buffer.from(chunk); size += buffer.length; if (size > MAX_BODY) throw new ApiError(413, 'Request body too large.'); chunks.push(buffer); } try { const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as unknown; if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed as Record<string, unknown>; } catch { throw new ApiError(400, 'Invalid JSON body.'); } };

const production = process.env.NODE_ENV === 'production';
const allowedOrigin = process.env.CSW_ALLOWED_ORIGIN ?? (production ? '' : 'http://127.0.0.1:4191');
const pepper = process.env.CSW_SESSION_PEPPER ?? (production ? '' : randomBytes(32).toString('hex'));
if (production && (!allowedOrigin.startsWith('https://') || pepper.length < 32)) throw new Error('Production requires CSW_ALLOWED_ORIGIN=https://… and a 32+ character CSW_SESSION_PEPPER.');
const port = Number.parseInt(process.env.PORT ?? '4191', 10);
const webRoot = resolve(process.env.CSW_WEB_ROOT ?? join(process.cwd(), 'build/web-mobile'));
const appleBundleId = process.env.CSW_APPLE_BUNDLE_ID ?? '';
const appleEnvironment = process.env.CSW_APPLE_ENVIRONMENT === 'Sandbox' ? 'Sandbox' : 'Production';
const appleRootPaths = (process.env.CSW_APPLE_ROOT_CA_PATHS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
const appleVerifier = appleBundleId && appleRootPaths.length ? new AppleSignedTransactionVerifier({ bundleId: appleBundleId, environment: appleEnvironment, rootCertificatePaths: appleRootPaths }) : undefined;
const parseIapCredits = (source: string): ReadonlyMap<string, number> => { try { const value = JSON.parse(source) as unknown; if (!value || typeof value !== 'object' || Array.isArray(value)) return new Map(); return new Map(Object.entries(value as Record<string, unknown>).flatMap(([id, credits]) => typeof credits === 'number' && Number.isSafeInteger(credits) && credits > 0 && credits <= 10_000_000 ? [[id, credits] as const] : [])); } catch { return new Map(); } };
const iapCredits = parseIapCredits(process.env.CSW_IAP_PRODUCTS ?? '{}');
if (production && (!appleVerifier || iapCredits.size === 0)) throw new Error('Production requires CSW_APPLE_BUNDLE_ID, CSW_APPLE_ROOT_CA_PATHS and CSW_IAP_PRODUCTS.');
const service = new AuthoritativeGameService(pepper, appleVerifier, iapCredits);
// Cocos Creator 3.8's SystemJS/runtime bundles construct functions dynamically.
// Keep the exception scoped to scripts while all resources remain self-hosted.
const securityHeaders = { 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin' };

const server = createServer(async (request, response) => {
  Object.entries(securityHeaders).forEach(([name, value]) => response.setHeader(name, value));
  try {
    const url = new URL(request.url ?? '/', allowedOrigin || 'http://localhost'); const method = request.method ?? 'GET';
    const signedAppleCallback = url.pathname === '/api/store/apple-notifications';
    if (method !== 'GET' && method !== 'HEAD' && !signedAppleCallback && request.headers.origin !== allowedOrigin) throw new ApiError(403, 'Origin rejected.');
    if (url.pathname === '/api/health' && method === 'GET') return json(response, 200, { status: 'ok' });
    if (url.pathname === '/api/store/apple-notifications' && method === 'POST') { service.handleAppleNotification(await body(request)); return json(response, 200, {}); }
    const token = cookies(request).csw_session ?? ''; const authenticated = service.session(token);
    if (url.pathname === '/api/auth/register' && method === 'POST') return issueSession(response, await service.register(await body(request)));
    if (url.pathname === '/api/auth/login' && method === 'POST') return issueSession(response, await service.login(await body(request)));
    if (url.pathname === '/api/auth/guest' && method === 'POST') return issueSession(response, service.guest());
    if (url.pathname === '/api/auth/logout' && method === 'POST') { if (authenticated && request.headers['x-csrf-token'] !== authenticated.session.csrfToken) throw new ApiError(403, 'CSRF token rejected.'); service.logout(token); return json(response, 200, {}, { 'Set-Cookie': sessionCookie('', 0) }); }
    if (url.pathname.startsWith('/api/')) {
      if (!authenticated) throw new ApiError(401, 'Authentication required.');
      if (method !== 'GET' && request.headers['x-csrf-token'] !== authenticated.session.csrfToken) throw new ApiError(403, 'CSRF token rejected.');
      if (url.pathname === '/api/me' && method === 'GET') return json(response, 200, { player: publicPlayer(authenticated.account), csrfToken: authenticated.session.csrfToken });
      if (url.pathname === '/api/spins' && method === 'POST') return json(response, 200, service.spin(authenticated.account, await body(request)));
      if (url.pathname === '/api/store/verify' && method === 'POST') return json(response, 200, service.verifyPurchase(authenticated.account, await body(request)));
      if (url.pathname === '/api/store/sync' && method === 'POST') return json(response, 200, service.synchronizePurchases(authenticated.account));
      if (url.pathname === '/api/account' && method === 'DELETE') { await service.deleteAccount(authenticated.account, String((await body(request)).password ?? '')); return json(response, 200, {}, { 'Set-Cookie': sessionCookie('', 0) }); }
      throw new ApiError(404, 'API route not found.');
    }
    serveStatic(url.pathname, response);
  } catch (error) { const failure = error instanceof ApiError ? error : new ApiError(500, 'Internal server error.'); json(response, failure.status, { error: failure.message }); }
});

const publicPlayer = (account: Account) => ({ id: account.id, appAccountToken: account.appAccountToken, username: account.username, nickname: account.nickname, isGuest: account.isGuest, credits: account.credits });
const sessionCookie = (token: string, maxAge = Math.floor(SESSION_MS / 1000)): string => `csw_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production ? '; Secure' : ''}`;
const issueSession = (response: ServerResponse, account: Account): void => { const created = service.createSession(account); json(response, 200, { player: publicPlayer(account), csrfToken: created.session.csrfToken }, { 'Set-Cookie': sessionCookie(created.token) }); };
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.wasm': 'application/wasm', '.bin': 'application/octet-stream' };
const serveStatic = (pathname: string, response: ServerResponse): void => { const relative = pathname === '/' ? 'index.html' : normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, ''); const target = resolve(webRoot, relative); if (!target.startsWith(`${webRoot}/`) || !existsSync(target) || !statSync(target).isFile()) throw new ApiError(404, 'File not found.'); response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream', 'Cache-Control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' }); createReadStream(target).pipe(response); };

server.listen(port, '127.0.0.1', () => { process.stdout.write(`Aurelia development server listening on http://127.0.0.1:${port}\n`); });
