export const TERMS_VERSION = '2026-09-08';
export const PRIVACY_VERSION = '2026-09-08';

/**
 * Publisher-owned values that must be replaced before the release audit can
 * pass. Keeping them centralized prevents test URLs or personal addresses
 * from leaking into an App Store build.
 */
export const RELEASE_CONFIG = Object.freeze({
  publisherLegalName: 'REPLACE_WITH_PUBLISHER_LEGAL_NAME',
  apiBaseUrl: 'https://REPLACE_WITH_PUBLIC_DOMAIN/api',
  supportEmail: 'REPLACE_WITH_SUPPORT_EMAIL',
  supportUrl: 'https://REPLACE_WITH_PUBLIC_DOMAIN/support.html',
  privacyUrl: 'https://REPLACE_WITH_PUBLIC_DOMAIN/privacy.html',
  termsUrl: 'https://REPLACE_WITH_PUBLIC_DOMAIN/terms.html',
});

export const complianceCurrent = (value: { ageConfirmedAt: string | null; termsVersion: string | null; privacyVersion: string | null }): boolean =>
  Boolean(value.ageConfirmedAt && value.termsVersion === TERMS_VERSION && value.privacyVersion === PRIVACY_VERSION);

export const configuredPublicUrl = (value: string): boolean => /^https:\/\/[^/\s]+\/.+/.test(value) && !value.includes('REPLACE_WITH_');
