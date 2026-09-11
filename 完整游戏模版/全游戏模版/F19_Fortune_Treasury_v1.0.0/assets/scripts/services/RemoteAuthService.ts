import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import type { AuthResult, AuthService, LoginInput, RegistrationInput } from './AuthService';
import { appleSignInAvailable, requestAppleAuthorization } from './AppleSignInService';
import { ProductionApiClient, type RemotePlayer } from './ProductionApiClient';
import { createPlayerScope, SaveService, type PlayerRecord } from './SaveService';

export class RemoteAuthService implements AuthService {
  public constructor(private readonly save: SaveService, private readonly api: ProductionApiClient) {}

  public async resume(): Promise<AuthResult> {
    try { return { ok: true, player: this.cache((await this.api.me()).player) }; }
    catch { this.clearCurrent(); return { ok: false, message: 'Your session expired. Please sign in again.' }; }
  }

  public async register(input: RegistrationInput): Promise<AuthResult> {
    try { return { ok: true, player: this.cache((await this.api.register({ username: input.username, nickname: input.nickname, password: input.password, acceptedTerms: input.acceptedTerms, confirmedEligibility: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION })).player) }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Registration failed.' }; }
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    try { const player = this.cache((await this.api.login({ username: input.username, password: input.password })).player); this.save.update((state) => { state.rememberLogin = input.remember; }); return { ok: true, player }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Sign-in failed.' }; }
  }

  public appleSignInAvailable(): Promise<boolean> { return appleSignInAvailable(); }

  public async signInWithApple(): Promise<AuthResult> {
    if (!complianceCurrent(this.save.read().compliance)) return { ok: false, message: 'Please confirm eligibility before continuing.' };
    const authorization = await requestAppleAuthorization();
    if (authorization.status !== 'authorized' || !authorization.identityToken || !authorization.userIdentifier) {
      return { ok: false, message: authorization.message ?? (authorization.status === 'cancelled' ? 'Apple sign-in was cancelled.' : 'Apple sign-in failed.') };
    }
    try {
      const session = await this.api.appleLogin({
        identityToken: authorization.identityToken, authorizationCode: authorization.authorizationCode,
        userIdentifier: authorization.userIdentifier, rawNonce: authorization.rawNonce,
        givenName: authorization.givenName, familyName: authorization.familyName,
        acceptedTerms: true, confirmedEligibility: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION,
      });
      const player = this.cache(session.player); this.save.update((state) => { state.rememberLogin = true; }); return { ok: true, player };
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Apple sign-in failed.' }; }
  }

  public async guestLogin(): Promise<AuthResult> {
    try { return { ok: true, player: this.cache((await this.api.guestLogin()).player) }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Guest session failed.' }; }
  }

  public passwordRecoveryGuidance(): string { return 'Open Player Support for secure account recovery. Passwords are never returned by the service.'; }

  public logout(): void { void this.api.logout().catch(() => undefined); this.clearCurrent(); }

  public async deleteCurrentAccount(password: string): Promise<AuthResult> {
    const id = this.save.read().currentUserId; if (!id) return { ok: false, message: 'No signed-in account was found.' };
    try { await this.api.deleteAccount(password); this.save.deletePlayer(id); return { ok: true }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Account deletion failed.' }; }
  }

  private cache(remote: RemotePlayer): PlayerRecord {
    const existing = this.save.read().players[remote.id]; const player: PlayerRecord = {
      id: remote.id, appAccountToken: remote.appAccountToken, termsAcceptedAt: existing?.termsAcceptedAt ?? new Date().toISOString(), termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION,
      username: remote.username, nickname: remote.nickname, avatar: remote.avatar, isGuest: remote.isGuest, signInProvider: remote.signInProvider, level: existing?.level ?? 1, experience: existing?.experience ?? 0, credits: remote.credits,
      gamesPlayed: existing?.gamesPlayed ?? 0, biggestWin: existing?.biggestWin ?? 0, totalWin: existing?.totalWin ?? 0,
      settings: remote.settings,
    };
    this.save.update((state) => { state.players[player.id] = player; state.playerData[player.id] ??= createPlayerScope(); state.currentUserId = player.id; }); return this.save.read().players[player.id];
  }

  private clearCurrent(): void { this.save.update((state) => { state.currentUserId = null; state.rememberLogin = false; }); }
}
