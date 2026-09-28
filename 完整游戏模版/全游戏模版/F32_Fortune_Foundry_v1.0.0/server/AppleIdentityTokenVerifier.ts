import { createHash, createPublicKey, verify as verifySignature, type JsonWebKey } from 'node:crypto';

interface AppleJwk extends JsonWebKey { readonly kid?: string; readonly alg?: string; readonly use?: string; }
interface AppleJwks { readonly keys: readonly AppleJwk[]; }

export interface AppleIdentityClaims {
  readonly iss: 'https://appleid.apple.com';
  readonly aud: string | readonly string[];
  readonly sub: string;
  readonly exp: number;
  readonly iat: number;
  readonly nonce: string;
  readonly email?: string;
  readonly email_verified?: boolean | 'true' | 'false';
  readonly is_private_email?: boolean | 'true' | 'false';
  readonly real_user_status?: number;
}
type KeyFetcher = () => Promise<AppleJwks>;
const decodePart = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch { throw new Error('Apple identity token is malformed.'); }
};

const liveAppleKeys: KeyFetcher = async () => {
  const response = await fetch('https://appleid.apple.com/auth/keys', { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(6_000) });
  if (!response.ok) throw new Error('Apple identity keys are unavailable.');
  const body = await response.json() as unknown;
  if (!body || typeof body !== 'object' || !Array.isArray((body as { keys?: unknown }).keys)) throw new Error('Apple identity keys are invalid.');
  return body as AppleJwks;
};

/** Verifies Sign in with Apple identity tokens against Apple's rotating JWKS. */
export class AppleIdentityTokenVerifier {
  private keys = new Map<string, AppleJwk>();
  private keysExpireAt = 0;

  public constructor(private readonly bundleId: string, private readonly fetchKeys: KeyFetcher = liveAppleKeys) {
    if (!bundleId) throw new Error('Apple identity verification requires a Bundle ID.');
  }

  public async verify(identityToken: string, rawNonce: string): Promise<AppleIdentityClaims> {
    if (identityToken.length < 128 || identityToken.length > 16_000) throw new Error('Apple identity token has an invalid size.');
    if (!/^[A-Za-z0-9_-]{24,128}$/.test(rawNonce)) throw new Error('Apple sign-in nonce is invalid.');
    const parts = identityToken.split('.'); if (parts.length !== 3) throw new Error('Apple identity token is not a JWT.');
    const header = decodePart(parts[0]); const kid = typeof header.kid === 'string' ? header.kid : '';
    if (header.alg !== 'RS256' || !/^[A-Za-z0-9_-]{2,80}$/.test(kid)) throw new Error('Apple identity token header is invalid.');
    const jwk = await this.key(kid); const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    if (!verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`, 'ascii'), publicKey, Buffer.from(parts[2], 'base64url'))) throw new Error('Apple identity token signature is invalid.');
    const raw = decodePart(parts[1]); const now = Math.floor(Date.now() / 1000); const audience = raw.aud;
    const audienceMatches = audience === this.bundleId || (Array.isArray(audience) && audience.length <= 4 && audience.includes(this.bundleId));
    if (raw.iss !== 'https://appleid.apple.com' || !audienceMatches) throw new Error('Apple identity token issuer or audience is invalid.');
    if (typeof raw.exp !== 'number' || raw.exp <= now - 30 || raw.exp > now + 86_400) throw new Error('Apple identity token has expired.');
    if (typeof raw.iat !== 'number' || raw.iat > now + 300 || raw.iat < now - 86_400) throw new Error('Apple identity token issue time is invalid.');
    if (typeof raw.sub !== 'string' || raw.sub.length < 3 || raw.sub.length > 255) throw new Error('Apple account identifier is invalid.');
    const expectedNonce = createHash('sha256').update(rawNonce, 'utf8').digest('hex');
    if (raw.nonce !== expectedNonce) throw new Error('Apple sign-in nonce does not match.');
    if (raw.email !== undefined && (typeof raw.email !== 'string' || raw.email.length > 320)) throw new Error('Apple relay email is invalid.');
    return raw as unknown as AppleIdentityClaims;
  }

  private async key(kid: string): Promise<AppleJwk> {
    if (Date.now() >= this.keysExpireAt || !this.keys.has(kid)) await this.refresh();
    const key = this.keys.get(kid); if (!key) throw new Error('Apple identity signing key was not found.'); return key;
  }

  private async refresh(): Promise<void> {
    const response = await this.fetchKeys(); const next = new Map<string, AppleJwk>();
    response.keys.slice(0, 20).forEach((key) => { if (key.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256') && (!key.use || key.use === 'sig')) next.set(key.kid, key); });
    if (!next.size) throw new Error('Apple identity keys did not contain a signing key.');
    this.keys = next; this.keysExpireAt = Date.now() + 6 * 60 * 60 * 1_000;
  }
}
