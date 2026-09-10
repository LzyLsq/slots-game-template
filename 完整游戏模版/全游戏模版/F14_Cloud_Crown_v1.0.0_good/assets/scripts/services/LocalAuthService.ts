import { SecureRNG } from '../core/SecureRNG';
import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import type { AuthResult, AuthService, LoginInput, RegistrationInput } from './AuthService';
import { createCredential, verifyCredential } from './CredentialService';
import { createPlayerScope, SaveService, type PasswordCredential, type PlayerRecord } from './SaveService';

const newPlayer = (username: string, nickname: string, isGuest: boolean, credential?: PasswordCredential): PlayerRecord => ({
  id: SecureRNG.id(isGuest ? 'guest' : 'player'), appAccountToken: SecureRNG.uuid(), termsAcceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, username, credential, nickname, avatar: 0, isGuest, signInProvider: isGuest ? 'guest' : 'password', level: 1, experience: 0, credits: 100_000,
  gamesPlayed: 0, biggestWin: 0, totalWin: 0,
  settings: { music: true, sound: true, vibration: true, quality: 'medium', language: 'en' },
});

export class LocalAuthService implements AuthService {
  public constructor(private readonly save: SaveService) {}

  public async resume(): Promise<AuthResult> { const id = this.save.read().currentUserId; const player = id ? this.save.read().players[id] : undefined; return player ? { ok: true, player } : { ok: false, message: 'No saved local session.' }; }

  public async register(input: RegistrationInput): Promise<AuthResult> {
    const username = input.username.trim(); const nickname = input.nickname.trim();
    if (!/^[A-Za-z0-9_]{3,18}$/.test(username)) return { ok: false, message: 'Username must be 3–18 letters, digits, or underscores.' };
    if (input.password.length < 10 || input.password.length > 72) return { ok: false, message: 'Password must contain 10–72 characters.' };
    if (input.password !== input.confirmPassword) return { ok: false, message: 'Passwords do not match.' };
    if (nickname.length < 2 || nickname.length > 18) return { ok: false, message: 'Nickname must contain 2–18 characters.' };
    if (!input.acceptedTerms || !complianceCurrent(this.save.read().compliance)) return { ok: false, message: 'Please confirm eligibility and accept the Terms and Privacy Policy.' };
    if (Object.values(this.save.read().players).some((player) => !player.isGuest && player.username.toLowerCase() === username.toLowerCase())) return { ok: false, message: 'Account already exists.' };
    try {
      const player = newPlayer(username, nickname, false, await createCredential(input.password));
      this.save.update((state) => { state.players[player.id] = player; state.playerData[player.id] = createPlayerScope(); state.currentUserId = player.id; state.rememberLogin = true; });
      return { ok: true, player: this.save.read().players[player.id] };
    } catch { return { ok: false, message: 'Secure credential storage is unavailable. Use HTTPS or localhost.' }; }
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const username = input.username.trim().toLowerCase();
    const player = Object.values(this.save.read().players).find((candidate) => !candidate.isGuest && candidate.username.toLowerCase() === username);
    if (!player?.credential || !(await verifyCredential(input.password, player.credential))) return { ok: false, message: 'Username or password is incorrect.' };
    this.save.update((state) => { state.currentUserId = player.id; state.rememberLogin = input.remember; });
    return { ok: true, player: this.save.read().players[player.id] };
  }

  public async appleSignInAvailable(): Promise<boolean> { return false; }

  public async signInWithApple(): Promise<AuthResult> {
    return { ok: false, message: 'Sign in with Apple becomes available in the signed iOS build.' };
  }

  public async guestLogin(): Promise<AuthResult> {
    if (!complianceCurrent(this.save.read().compliance)) return { ok: false, message: 'Please confirm eligibility before continuing.' };
    const currentId=this.save.read().currentUserId,current=currentId?this.save.read().players[currentId]:undefined;
    if(current?.isGuest)return {ok:true,player:current};
    const suffix = SecureRNG.id('guest').slice(-6); const player = newPlayer(`guest_${suffix}`, 'Guest Captain', true);
    this.save.update((state) => { state.players[player.id] = player; state.playerData[player.id] = createPlayerScope(); state.currentUserId = player.id; state.rememberLogin = false; });
    return { ok: true, player: this.save.read().players[player.id] };
  }

  public passwordRecoveryGuidance(identifier: string): string {
    const exists = Object.values(this.save.read().players).some((player) => !player.isGuest && player.username.toLowerCase() === identifier.trim().toLowerCase());
    return exists ? 'This preview profile is stored only on this device and cannot be recovered remotely.' : 'No on-device profile matched that username.';
  }

  public logout(): void { this.save.update((state) => { state.currentUserId = null; state.rememberLogin = false; }); }

  public async deleteCurrentAccount(password: string): Promise<AuthResult> {
    const player = this.save.read().currentUserId ? this.save.read().players[this.save.read().currentUserId as string] : undefined;
    if (!player) return { ok: false, message: 'No signed-in account was found.' };
    if (!player.isGuest && (!player.credential || !(await verifyCredential(password, player.credential)))) return { ok: false, message: 'Password is incorrect.' };
    return this.save.deletePlayer(player.id) ? { ok: true } : { ok: false, message: 'Unable to delete the account.' };
  }
}
