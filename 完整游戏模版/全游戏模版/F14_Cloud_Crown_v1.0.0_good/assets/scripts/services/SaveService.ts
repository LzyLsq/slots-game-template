import { SecureRNG } from '../core/SecureRNG';

export interface PasswordCredential {
  algorithm: 'PBKDF2-SHA-256';
  salt: string;
  iterations: number;
  verifier: string;
}

export interface PlayerRecord {
  id: string;
  appAccountToken: string;
  termsAcceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
  username: string;
  credential?: PasswordCredential;
  nickname: string;
  avatar: number;
  isGuest: boolean;
  signInProvider: 'password' | 'apple' | 'guest';
  level: number;
  experience: number;
  credits: number;
  gamesPlayed: number;
  biggestWin: number;
  totalWin: number;
  settings: { music: boolean; sound: boolean; vibration: boolean; quality: 'low' | 'medium' | 'high'; language: 'en' | 'zh-CN' };
}

export interface TransactionRecord {
  id: string;
  at: string;
  type: 'spin-bet' | 'spin-win' | 'spin-refund' | 'store-sandbox' | 'store-iap' | 'balance-sync' | 'daily-free' | 'check-in' | 'wheel' | 'mail' | 'achievement' | 'feature-win';
  amount: number;
  balance: number;
  reference: string;
}

export interface PlayerScopedSave {
  transactions: TransactionRecord[];
  claims: Record<string, string>;
  mail: Record<string, { read: boolean; claimed: boolean; deleted: boolean }>;
  achievements: Record<string, { progress: number; claimed: boolean }>;
  checkIn: { cycleDay: number; lastClaimDate: string | null };
  wheel: { date: string | null; remaining: number; settledSpinIds: string[]; pending?: { spinId: string; sector: number; amount: number } };
  pendingSpin?: { spinId: string; bet: number; reservedAt: string };
  pendingRemoteSpin?: { requestId: string; gameId: string; bet: number };
  settledSpinIds: string[];
  creditedPurchaseIds: string[];
}

export interface AppSave {
  version: number;
  currentUserId: string | null;
  rememberLogin: boolean;
  players: Record<string, PlayerRecord>;
  playerData: Record<string, PlayerScopedSave>;
  compliance: { ageConfirmedAt: string | null; termsVersion: string | null; privacyVersion: string | null };
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  public getItem(key: string): string | null { return this.values.get(key) ?? null; }
  public setItem(key: string, value: string): void { this.values.set(key, value); }
  public removeItem(key: string): void { this.values.delete(key); }
}

const objectValue = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const numberValue = (value: unknown, fallback = 0, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number => Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, Number(value))) : fallback;
const stringValue = (value: unknown, fallback = '', maximum = 128): string => typeof value === 'string' ? value.slice(0, maximum) : fallback;
const boolValue = (value: unknown, fallback: boolean): boolean => typeof value === 'boolean' ? value : fallback;

export const createPlayerScope = (): PlayerScopedSave => ({
  transactions: [], claims: {}, mail: {}, achievements: {},
  checkIn: { cycleDay: 0, lastClaimDate: null },
  wheel: { date: null, remaining: 1, settledSpinIds: [] },
  settledSpinIds: [],
  creditedPurchaseIds: [],
});

const defaultSave = (): AppSave => ({ version: 5, currentUserId: null, rememberLogin: false, players: {}, playerData: {}, compliance: { ageConfirmedAt: null, termsVersion: null, privacyVersion: null } });

const sanitizeCredential = (value: unknown): PasswordCredential | undefined => {
  const candidate = objectValue(value);
  if (candidate.algorithm !== 'PBKDF2-SHA-256') return undefined;
  const iterations = numberValue(candidate.iterations, 0, 100_000, 1_000_000);
  const salt = stringValue(candidate.salt, '', 128); const verifier = stringValue(candidate.verifier, '', 256);
  return iterations && salt && verifier ? { algorithm: 'PBKDF2-SHA-256', iterations, salt, verifier } : undefined;
};

const sanitizePlayer = (id: string, value: unknown): PlayerRecord | undefined => {
  const player = objectValue(value); const username = stringValue(player.username, '', 18).trim();
  if (!username) return undefined;
  const settings = objectValue(player.settings); const quality = settings.quality === 'low' || settings.quality === 'high' ? settings.quality : 'medium';
  return {
    id, appAccountToken: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stringValue(player.appAccountToken, '', 36)) ? stringValue(player.appAccountToken, '', 36) : SecureRNG.uuid(),
    termsAcceptedAt: stringValue(player.termsAcceptedAt, '', 48), termsVersion: stringValue(player.termsVersion, '', 24), privacyVersion: stringValue(player.privacyVersion, '', 24),
    username, credential: sanitizeCredential(player.credential), nickname: stringValue(player.nickname, username, 24).trim() || username,
    avatar: Math.floor(numberValue(player.avatar, 0, 0, 15)), isGuest: boolValue(player.isGuest, false),
    signInProvider: player.signInProvider === 'apple' ? 'apple' : boolValue(player.isGuest, false) ? 'guest' : 'password', level: Math.floor(numberValue(player.level, 1, 1, 10_000)),
    experience: Math.floor(numberValue(player.experience)), credits: Math.floor(numberValue(player.credits, 100_000, 0, 1_000_000_000)),
    gamesPlayed: Math.floor(numberValue(player.gamesPlayed)), biggestWin: Math.floor(numberValue(player.biggestWin)), totalWin: Math.floor(numberValue(player.totalWin)),
    settings: { music: boolValue(settings.music, true), sound: boolValue(settings.sound, true), vibration: boolValue(settings.vibration, true), quality, language: settings.language === 'zh-CN' ? 'zh-CN' : 'en' },
  };
};

const sanitizeScope = (value: unknown): PlayerScopedSave => {
  const raw = objectValue(value); const next = createPlayerScope(); const checkIn = objectValue(raw.checkIn); const wheel = objectValue(raw.wheel); const pending = objectValue(raw.pendingSpin); const pendingWheel = objectValue(wheel.pending);
  const recordMap = <T>(source: unknown, convert: (entry: Record<string, unknown>) => T): Record<string, T> => Object.fromEntries(Object.entries(objectValue(source)).slice(0, 250).map(([key, entry]) => [key.slice(0, 96), convert(objectValue(entry))]));
  next.transactions = Array.isArray(raw.transactions) ? raw.transactions.slice(0, 200).flatMap((entry): TransactionRecord[] => { const item = objectValue(entry); const amount = numberValue(item.amount, Number.NaN, -1_000_000_000, 1_000_000_000); if (!Number.isFinite(amount)) return []; return [{ id: stringValue(item.id, '', 96), at: stringValue(item.at, '', 48), type: stringValue(item.type, 'spin-refund', 24) as TransactionRecord['type'], amount, balance: numberValue(item.balance), reference: stringValue(item.reference, '', 128) }]; }) : [];
  next.claims = Object.fromEntries(Object.entries(objectValue(raw.claims)).slice(0, 500).map(([key, entry]) => [key.slice(0, 128), stringValue(entry, '', 48)]));
  next.mail = recordMap(raw.mail, (entry) => ({ read: boolValue(entry.read, false), claimed: boolValue(entry.claimed, false), deleted: boolValue(entry.deleted, false) }));
  next.achievements = recordMap(raw.achievements, (entry) => ({ progress: numberValue(entry.progress), claimed: boolValue(entry.claimed, false) }));
  next.checkIn = { cycleDay: Math.floor(numberValue(checkIn.cycleDay, 0, 0, 6)), lastClaimDate: typeof checkIn.lastClaimDate === 'string' ? checkIn.lastClaimDate.slice(0, 10) : null };
  next.wheel = { date: typeof wheel.date === 'string' ? wheel.date.slice(0, 10) : null, remaining: Math.floor(numberValue(wheel.remaining, 1, 0, 1)), settledSpinIds: Array.isArray(wheel.settledSpinIds) ? wheel.settledSpinIds.filter((id): id is string => typeof id === 'string').slice(-100) : [] };
  if (pendingWheel.spinId && Number.isFinite(pendingWheel.amount) && Number.isFinite(pendingWheel.sector)) next.wheel.pending = { spinId: stringValue(pendingWheel.spinId, '', 96), sector: Math.floor(numberValue(pendingWheel.sector, 0, 0, 7)), amount: Math.floor(numberValue(pendingWheel.amount, 0, 1, 100_000)) };
  if (pending.spinId && Number.isFinite(pending.bet)) next.pendingSpin = { spinId: stringValue(pending.spinId, '', 128), bet: Math.floor(numberValue(pending.bet, 0, 1, 1_000_000)), reservedAt: stringValue(pending.reservedAt, '', 48) };
  const remote=objectValue(raw.pendingRemoteSpin);
  if(typeof remote.requestId==='string'&&/^[a-z0-9-]{12,128}$/i.test(remote.requestId)&&typeof remote.gameId==='string'&&['golden-hour','jade-treasury','pearl-palace','ruby-revel'].includes(remote.gameId)&&[50,100,200,500,1000].includes(remote.bet as number))next.pendingRemoteSpin={requestId:remote.requestId,gameId:remote.gameId,bet:remote.bet as number};
  next.settledSpinIds = Array.isArray(raw.settledSpinIds) ? raw.settledSpinIds.filter((id): id is string => typeof id === 'string').slice(-200) : [];
  next.creditedPurchaseIds = Array.isArray(raw.creditedPurchaseIds) ? raw.creditedPurchaseIds.filter((id): id is string => typeof id === 'string' && /^[A-Za-z0-9._:-]{3,160}$/.test(id)).slice(-500) : [];
  return next;
};

export class SaveService {
  public static readonly CURRENT_VERSION = 5;
  private readonly key = 'cloud-crown-f14.cocos.save.v1';
  private readonly legacyKey = 'cloud-crown-f14.cocos.save.legacy';
  private state: AppSave;

  public constructor(private readonly storage: KeyValueStorage = SaveService.runtimeStorage()) { this.state = this.load(); }

  private static runtimeStorage(): KeyValueStorage { return typeof localStorage === 'undefined' ? new MemoryStorage() : localStorage; }

  private load(): AppSave {
    const raw = this.storage.getItem(this.key) ?? this.storage.getItem(this.legacyKey);
    if (!raw || raw.length > 2_000_000) return defaultSave();
    try { return this.migrate(JSON.parse(raw) as unknown); } catch { return defaultSave(); }
  }

  private migrate(value: unknown): AppSave {
    const old = objectValue(value); const next = defaultSave(); const players = objectValue(old.players);
    Object.entries(players).slice(0, 50).forEach(([id, value]) => { const player = sanitizePlayer(id.slice(0, 96), value); if (player) next.players[player.id] = player; });
    const playerData = objectValue(old.playerData);
    Object.keys(next.players).forEach((id) => { next.playerData[id] = sanitizeScope(playerData[id]); });
    // v3 reward fields were global and cannot be safely assigned to an account.
    const selected = stringValue(old.currentUserId, '', 96); next.currentUserId = next.players[selected] ? selected : null;
    next.rememberLogin = boolValue(old.rememberLogin, false) && Boolean(next.currentUserId);
    const compliance = objectValue(old.compliance);
    next.compliance = {
      ageConfirmedAt: typeof compliance.ageConfirmedAt === 'string' ? compliance.ageConfirmedAt.slice(0, 48) : null,
      termsVersion: typeof compliance.termsVersion === 'string' ? compliance.termsVersion.slice(0, 24) : null,
      privacyVersion: typeof compliance.privacyVersion === 'string' ? compliance.privacyVersion.slice(0, 24) : null,
    };
    return next;
  }

  public read(): Readonly<AppSave> { return this.state; }
  public currentScope(): PlayerScopedSave | undefined { const id = this.state.currentUserId; return id ? this.state.playerData[id] : undefined; }
  public ensureScope(playerId: string): PlayerScopedSave { return this.state.playerData[playerId] ?? (this.state.playerData[playerId] = createPlayerScope()); }

  public update(mutator: (draft: AppSave) => void): void {
    const draft = structuredClone(this.state);
    mutator(draft); draft.version = SaveService.CURRENT_VERSION;
    const next = this.migrate(draft);
    // Do not acknowledge a reservation in memory if durable storage failed.
    this.storage.setItem(this.key, JSON.stringify(next));
    this.state = next;
  }

  public clearConfirmed(confirmation: string): boolean {
    if (confirmation !== 'RESET') return false;
    this.state = defaultSave(); this.storage.removeItem(this.key); this.storage.removeItem(this.legacyKey); return true;
  }

  public deletePlayer(playerId: string): boolean {
    if (!this.state.players[playerId]) return false;
    this.update((state) => {
      delete state.players[playerId]; delete state.playerData[playerId];
      if (state.currentUserId === playerId) { state.currentUserId = null; state.rememberLogin = false; }
    });
    return true;
  }

  public acceptCompliance(termsVersion: string, privacyVersion: string): void {
    this.update((state) => { state.compliance = { ageConfirmedAt: new Date().toISOString(), termsVersion, privacyVersion }; });
  }
}
