import type { PlayerRecord } from './SaveService';

export interface RegistrationInput { username: string; password: string; confirmPassword: string; nickname: string; acceptedTerms: boolean; }
export interface LoginInput { username: string; password: string; remember: boolean; }
export interface AuthResult { ok: boolean; player?: PlayerRecord; message?: string; }

export interface AuthService {
  resume(): Promise<AuthResult>;
  register(input: RegistrationInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  guestLogin(): Promise<AuthResult>;
  passwordRecoveryGuidance(identifier: string): string;
  logout(): void;
  deleteCurrentAccount(password: string): Promise<AuthResult>;
}
