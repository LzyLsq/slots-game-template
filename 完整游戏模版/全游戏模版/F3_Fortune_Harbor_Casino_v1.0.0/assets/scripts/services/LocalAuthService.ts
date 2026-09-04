import { SecureRNG } from '../core/SecureRNG';
import type { AuthResult, AuthService, LoginInput, RegistrationInput } from './AuthService';
import { createCredential, verifyCredential } from './CredentialService';
import { createPlayerScope, SaveService, type PasswordCredential, type PlayerRecord } from './SaveService';

const newPlayer = (username: string, nickname: string, isGuest: boolean, credential?: PasswordCredential): PlayerRecord => ({
  id: SecureRNG.id(isGuest ? 'guest' : 'player'), username, credential, nickname, avatar: 0, isGuest, level: 1, experience: 0, credits: 100_000,
  gamesPlayed: 0, biggestWin: 0, totalWin: 0,
  settings: { music: true, sound: true, vibration: true, quality: 'medium', language: 'en' },
});

export class LocalAuthService implements AuthService {
  public constructor(private readonly save: SaveService) {}

  public async register(input: RegistrationInput): Promise<AuthResult> {
    const username = input.username.trim(); const nickname = input.nickname.trim();
    if (!/^[A-Za-z0-9_]{3,18}$/.test(username)) return { ok: false, message: 'Username must be 3–18 letters, digits, or underscores.' };
    if (input.password.length < 10 || input.password.length > 72) return { ok: false, message: 'Password must contain 10–72 characters.' };
    if (input.password !== input.confirmPassword) return { ok: false, message: 'Passwords do not match.' };
    if (nickname.length < 2 || nickname.length > 18) return { ok: false, message: 'Nickname must contain 2–18 characters.' };
    if (!input.acceptedTerms) return { ok: false, message: 'Please accept the virtual-credit demo terms.' };
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

  public async guestLogin(): Promise<AuthResult> {
    const suffix = SecureRNG.id('guest').slice(-6); const player = newPlayer(`guest_${suffix}`, 'Starlight Guest', true);
    this.save.update((state) => { state.players[player.id] = player; state.playerData[player.id] = createPlayerScope(); state.currentUserId = player.id; state.rememberLogin = false; });
    return { ok: true, player: this.save.read().players[player.id] };
  }

  public localPasswordHint(identifier: string): string {
    const exists = Object.values(this.save.read().players).some((player) => !player.isGuest && player.username.toLowerCase() === identifier.trim().toLowerCase());
    return exists ? 'Local demo profile found. Password recovery is intentionally unavailable in the offline build.' : 'No local demo profile matched. No email was sent.';
  }

  public logout(): void { this.save.update((state) => { state.currentUserId = null; state.rememberLogin = false; }); }
}
