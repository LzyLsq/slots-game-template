import type { GameId, SpinResult } from '../math/types';

export interface RemotePlayerSettings {
  music: boolean;
  sound: boolean;
  vibration: boolean;
  quality: 'low' | 'medium' | 'high';
  language: 'en' | 'zh-CN';
}
export interface RemotePlayer {
  id: string;
  appAccountToken: string;
  username: string;
  nickname: string;
  avatar: number;
  settings: RemotePlayerSettings;
  isGuest: boolean;
  signInProvider: 'password' | 'apple' | 'guest';
  credits: number;
}
export interface RemoteSession { player: RemotePlayer; csrfToken: string; }
export interface RemoteReward { rewardKey: string; amount: number; balance: number; detail?: { day?: number; sector?: number } }
export interface RemoteRankEntry { rank: number; nickname: string; winnings: number; avatar: number; current: boolean; }
export interface RemoteProfileUpdate { nickname?: string; avatar?: number; settings?: Partial<RemotePlayerSettings>; }

export class ProductionApiClient {
  private csrfToken = '';
  public constructor(private readonly baseUrl = '/api') {}

  public async register(input: { username: string; nickname: string; password: string; acceptedTerms: boolean; confirmedEligibility: boolean; termsVersion: string; privacyVersion: string }): Promise<RemoteSession> { return this.session('/auth/register', input); }
  public async login(input: { username: string; password: string }): Promise<RemoteSession> { return this.session('/auth/login', input); }
  public async appleLogin(input: { identityToken: string; authorizationCode?: string; userIdentifier: string; rawNonce: string; givenName?: string; familyName?: string; acceptedTerms: boolean; confirmedEligibility: boolean; termsVersion: string; privacyVersion: string }): Promise<RemoteSession> { return this.session('/auth/apple', input); }
  public async guestLogin(): Promise<RemoteSession> { return this.session('/auth/guest', {}); }
  public async me(): Promise<RemoteSession> { const session = await this.request<RemoteSession>('/me', { method: 'GET' }); this.csrfToken = session.csrfToken; return session; }
  public async logout(): Promise<void> { await this.request('/auth/logout', { method: 'POST', body: '{}' }); this.csrfToken = ''; }
  public async deleteAccount(password: string): Promise<void> { await this.request('/account', { method: 'DELETE', body: JSON.stringify({ password }) }); this.csrfToken = ''; }
  public async spin(gameId: GameId, bet: number, requestId: string): Promise<{ result: SpinResult; balance: number }> { return this.request('/spins', { method: 'POST', body: JSON.stringify({ gameId, bet, requestId }) }); }
  public async verifyApplePurchase(signedTransactionInfo: string): Promise<{ status: 'verified'; productId: string; transactionId: string; creditedCredits: number; authoritativeBalance: number }> { return this.request('/store/verify', { method: 'POST', body: JSON.stringify({ signedTransactionInfo }) }); }
  public async synchronizePurchases(): Promise<{ status: 'verified'; authoritativeBalance: number }> { return this.request('/store/sync', { method: 'POST', body: '{}' }); }
  public async claimReward(kind: 'daily' | 'check-in' | 'wheel' | 'mail' | 'achievement', id?: string): Promise<RemoteReward> { return this.request('/rewards/claim', { method: 'POST', body: JSON.stringify({ kind, id }) }); }
  public async leaderboard(period: 'daily' | 'weekly' | 'all-time'): Promise<{ entries: RemoteRankEntry[] }> { return this.request(`/rank?period=${encodeURIComponent(period)}`, { method: 'GET' }); }
  public async updateProfile(input: RemoteProfileUpdate): Promise<{ player: RemotePlayer }> { return this.request('/profile', { method: 'PATCH', body: JSON.stringify(input) }); }

  private async session(path: string, body: unknown): Promise<RemoteSession> { const session = await this.request<RemoteSession>(path, { method: 'POST', body: JSON.stringify(body) }); this.csrfToken = session.csrfToken; return session; }
  private async request<T = void>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers); headers.set('Accept', 'application/json'); if (init.body) headers.set('Content-Type', 'application/json'); if (this.csrfToken) headers.set('X-CSRF-Token', this.csrfToken);
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers, credentials: 'include', redirect: 'error' });
    const payload = await response.json().catch(() => ({ error: 'Invalid server response.' })) as T & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`); return payload;
  }
}
