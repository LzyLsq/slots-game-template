import type { PasswordCredential } from './SaveService';

const ITERATIONS = 210_000;
const encoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return globalThis.btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const subtle = (): SubtleCrypto => {
  if (!globalThis.crypto?.subtle) throw new Error('Secure credential storage is unavailable in this runtime.');
  return globalThis.crypto.subtle;
};

const derive = async (password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
  const key = await subtle().importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
};

export const createCredential = async (password: string): Promise<PasswordCredential> => {
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  const verifier = await derive(password, salt, ITERATIONS);
  return { algorithm: 'PBKDF2-SHA-256', salt: toBase64(salt), iterations: ITERATIONS, verifier: toBase64(verifier) };
};

export const verifyCredential = async (password: string, credential: PasswordCredential): Promise<boolean> => {
  if (credential.algorithm !== 'PBKDF2-SHA-256' || credential.iterations < 100_000 || credential.iterations > 1_000_000) return false;
  try {
    const expected = fromBase64(credential.verifier);
    const actual = await derive(password, fromBase64(credential.salt), credential.iterations);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch { return false; }
};
