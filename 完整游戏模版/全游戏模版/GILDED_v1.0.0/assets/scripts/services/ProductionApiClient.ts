import type { GameId, SpinResult } from '../math/types';

export interface RemotePlayer { id: string; username: string; nickname: string; isGuest: boolean; credits: number; }
export interface RemoteSession { player: RemotePlayer; csrfToken: string; }

export class ProductionApiClient {
  private csrfToken = '';
  public constructor(private readonly baseUrl = '/api') {}

  public async register(input: { username: string; nickname: string; password: string; acceptedTerms: boolean }): Promise<RemoteSession> { return this.session('/auth/register', input); }
  public async login(input: { username: string; password: string }): Promise<RemoteSession> { return this.session('/auth/login', input); }
  public async guestLogin(): Promise<RemoteSession> { return this.session('/auth/guest', {}); }
  public async me(): Promise<RemoteSession> { const session = await this.request<RemoteSession>('/me', { method: 'GET' }); this.csrfToken = session.csrfToken; return session; }
  public async logout(): Promise<void> { await this.request('/auth/logout', { method: 'POST', body: '{}' }); this.csrfToken = ''; }
  public async spin(gameId: GameId, bet: number, requestId: string): Promise<{ result: SpinResult; balance: number }> { return this.request('/spins', { method: 'POST', body: JSON.stringify({ gameId, bet, requestId }) }); }

  private async session(path: string, body: unknown): Promise<RemoteSession> { const session = await this.request<RemoteSession>(path, { method: 'POST', body: JSON.stringify(body) }); this.csrfToken = session.csrfToken; return session; }
  private async request<T = void>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers); headers.set('Accept', 'application/json'); if (init.body) headers.set('Content-Type', 'application/json'); if (this.csrfToken) headers.set('X-CSRF-Token', this.csrfToken);
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers, credentials: 'include', redirect: 'error' });
    const payload = await response.json().catch(() => ({ error: 'Invalid server response.' })) as T & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`); return payload;
  }
}
