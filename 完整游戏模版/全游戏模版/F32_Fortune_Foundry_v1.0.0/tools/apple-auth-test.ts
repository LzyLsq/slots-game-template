import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { AppleIdentityTokenVerifier } from '../server/AppleIdentityTokenVerifier';

const base64url = (value: unknown): string => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const main = async (): Promise<void> => {
  const bundleId = 'com.example.luckyskylight'; const rawNonce = `apple-${'a'.repeat(32)}`; const kid = 'test-key-01';
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' };
  const token = (overrides: Record<string, unknown> = {}): string => {
    const now = Math.floor(Date.now() / 1000); const header = base64url({ alg: 'RS256', kid });
    const payload = base64url({ iss: 'https://appleid.apple.com', aud: bundleId, sub: '000123.abcdef', iat: now, exp: now + 600, nonce: createHash('sha256').update(rawNonce).digest('hex'), email: 'relay@example.com', email_verified: 'true', ...overrides });
    const input = `${header}.${payload}`; return `${input}.${sign('RSA-SHA256', Buffer.from(input, 'ascii'), privateKey).toString('base64url')}`;
  };
  const verifier = new AppleIdentityTokenVerifier(bundleId, async () => ({ keys: [jwk] }));
  const claims = await verifier.verify(token(), rawNonce); assert.equal(claims.sub, '000123.abcdef');
  await assert.rejects(() => verifier.verify(token(), `apple-${'b'.repeat(32)}`), /nonce/);
  await assert.rejects(() => verifier.verify(token({ aud: 'com.attacker.app' }), rawNonce), /issuer or audience/);
  await assert.rejects(() => verifier.verify(token({ exp: 1 }), rawNonce), /expired/);
  process.stdout.write('PASS  Apple identity signature, audience, expiry and nonce verification\n');
};

void main();
