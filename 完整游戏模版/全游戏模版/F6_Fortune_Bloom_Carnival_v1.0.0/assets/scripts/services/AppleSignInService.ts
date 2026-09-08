import { SecureRNG } from '../core/SecureRNG';

export type AppleAuthorizationStatus = 'authorized' | 'cancelled' | 'failed';

export interface NativeAppleAuthorization {
  readonly status: AppleAuthorizationStatus;
  readonly identityToken?: string;
  readonly authorizationCode?: string;
  readonly userIdentifier?: string;
  /** Apple supplies name and email only on the first authorization. */
  readonly email?: string;
  readonly givenName?: string;
  readonly familyName?: string;
  readonly message?: string;
}

export type AppleCredentialState = 'authorized' | 'revoked' | 'not-found' | 'transferred';

/**
 * Contract implemented by the exported iOS target with AuthenticationServices.
 * The native layer hashes rawNonce with SHA-256 before assigning request.nonce.
 */
export interface FortuneBloomAppleAuthBridge {
  isAvailable(): boolean | Promise<boolean>;
  authorize(rawNonce: string): Promise<NativeAppleAuthorization>;
  credentialState(userIdentifier: string): Promise<AppleCredentialState>;
}

type RuntimeWithAppleAuth = typeof globalThis & { __FORTUNE_BLOOM_APPLE_AUTH__?: FortuneBloomAppleAuthBridge };
const nativeBridge = (): FortuneBloomAppleAuthBridge | undefined => (globalThis as RuntimeWithAppleAuth).__FORTUNE_BLOOM_APPLE_AUTH__;

export interface AppleAuthorizationRequest extends NativeAppleAuthorization { readonly rawNonce: string; }

export const appleSignInAvailable = async (): Promise<boolean> => {
  const bridge = nativeBridge();
  if (!bridge) return false;
  try { return await bridge.isAvailable(); } catch { return false; }
};
export const requestAppleAuthorization = async (): Promise<AppleAuthorizationRequest> => {
  const bridge = nativeBridge();
  if (!bridge || !(await appleSignInAvailable())) return { status: 'failed', rawNonce: '', message: 'Sign in with Apple is unavailable on this device.' };
  const rawNonce = SecureRNG.id('apple');
  try {
    const response = await bridge.authorize(rawNonce);
    if (response.status !== 'authorized') return { ...response, rawNonce };
    if (!response.identityToken || !response.userIdentifier) return { status: 'failed', rawNonce, message: 'Apple returned an incomplete authorization.' };
    return { ...response, rawNonce };
  } catch {
    return { status: 'failed', rawNonce, message: 'Apple authorization could not be completed.' };
  }
};
