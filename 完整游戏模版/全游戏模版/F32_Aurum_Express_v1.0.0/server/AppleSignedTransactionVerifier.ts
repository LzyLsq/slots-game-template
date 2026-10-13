import { readFileSync } from 'node:fs';
import { timingSafeEqual, verify as verifySignature, X509Certificate } from 'node:crypto';

interface JwsHeader { readonly alg?: unknown; readonly x5c?: unknown; }
export interface AppleTransactionPayload {
  readonly transactionId: string;
  readonly originalTransactionId?: string;
  readonly appAccountToken?: string;
  readonly bundleId: string;
  readonly productId: string;
  readonly type?: string;
  readonly environment: string;
  readonly purchaseDate?: number;
  readonly signedDate?: number;
  readonly revocationDate?: number;
  readonly quantity?: number;
}

export interface AppleVerifierConfig {
  readonly bundleId: string;
  readonly environment: 'Sandbox' | 'Production';
  readonly rootCertificatePaths: readonly string[];
}

const decodeJson = (part: string): Record<string, unknown> => {
  const parsed = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Signed data JSON is invalid.');
  return parsed as Record<string, unknown>;
};

const certificateCurrent = (certificate: X509Certificate, now: number): boolean => {
  const from = Date.parse(certificate.validFrom); const to = Date.parse(certificate.validTo);
  return Number.isFinite(from) && Number.isFinite(to) && from <= now && now <= to;
};

const sameCertificate = (a: X509Certificate, b: X509Certificate): boolean => a.raw.length === b.raw.length && timingSafeEqual(a.raw, b.raw);

/**
 * Verifies the ES256 JWS and its x5c chain against publisher-provided Apple
 * root certificates. Root .cer/.pem files come from Apple PKI and are kept
 * outside the repository so certificate rotation does not require an app
 * update. Production startup refuses to enable IAP without them.
 */
export class AppleSignedTransactionVerifier {
  private readonly roots: readonly X509Certificate[];

  public constructor(private readonly config: AppleVerifierConfig) {
    if (!config.bundleId || config.rootCertificatePaths.length === 0) throw new Error('Apple transaction verification is not configured.');
    this.roots = config.rootCertificatePaths.map((path) => new X509Certificate(readFileSync(path)));
  }

  private verifyPayload(signedData: string): Record<string, unknown> {
    if (signedData.length < 128 || signedData.length > 64_000) throw new Error('Signed Apple data has an invalid size.');
    const parts = signedData.split('.'); if (parts.length !== 3) throw new Error('Signed Apple data is not a JWS.');
    const header = decodeJson(parts[0]) as JwsHeader; if (header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length < 2 || header.x5c.length > 5 || !header.x5c.every((item) => typeof item === 'string')) throw new Error('Signed transaction header is invalid.');
    const chain = (header.x5c as string[]).map((encoded) => new X509Certificate(Buffer.from(encoded, 'base64'))); const now = Date.now();
    if (chain.some((certificate) => !certificateCurrent(certificate, now))) throw new Error('Apple signing certificate is outside its validity period.');
    for (let index = 0; index < chain.length - 1; index += 1) if (!chain[index].verify(chain[index + 1].publicKey)) throw new Error('Apple signing certificate chain is invalid.');
    const chainRoot = chain[chain.length - 1]; const trusted = this.roots.some((root) => certificateCurrent(root, now) && (sameCertificate(chainRoot, root) || chainRoot.verify(root.publicKey)));
    if (!trusted) throw new Error('Apple signing certificate root is not trusted.');
    const signature = Buffer.from(parts[2], 'base64url'); const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`, 'ascii');
    if (!verifySignature('sha256', signingInput, { key: chain[0].publicKey, dsaEncoding: 'ieee-p1363' }, signature)) throw new Error('Apple data signature is invalid.');
    return decodeJson(parts[1]);
  }

  public verify(signedTransactionInfo: string, allowRevoked = false): AppleTransactionPayload {
    const raw = this.verifyPayload(signedTransactionInfo); const payload = raw as unknown as AppleTransactionPayload; const now = Date.now();
    if (typeof payload.transactionId !== 'string' || !/^\d{3,40}$/.test(payload.transactionId) || typeof payload.bundleId !== 'string' || typeof payload.productId !== 'string' || typeof payload.environment !== 'string') throw new Error('Apple transaction payload is incomplete.');
    if (payload.bundleId !== this.config.bundleId || payload.environment !== this.config.environment) throw new Error('Apple transaction target does not match this release.');
    if (payload.type && payload.type !== 'Consumable') throw new Error('Only consumable coin products are accepted.');
    if (payload.quantity !== undefined && payload.quantity !== 1) throw new Error('Unexpected purchase quantity.');
    if (!allowRevoked && payload.revocationDate !== undefined) throw new Error('Revoked Apple transaction rejected.');
    if (payload.signedDate !== undefined && payload.signedDate > now + 5 * 60_000) throw new Error('Apple transaction signing time is invalid.');
    return payload;
  }

  public verifyNotification(signedPayload: string): Record<string, unknown> { return this.verifyPayload(signedPayload); }
}
