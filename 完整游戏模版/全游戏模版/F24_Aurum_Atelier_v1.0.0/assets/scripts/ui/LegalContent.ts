import { PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';

export type LegalPage = 'privacy' | 'terms' | 'support';
export interface LegalSection { readonly title: string; readonly body: string; }

export const LEGAL_PAGE_TITLES: Readonly<Record<LegalPage, string>> = {
  privacy: 'PRIVACY POLICY', terms: 'TERMS OF SERVICE', support: 'PLAYER SUPPORT',
};

export const LEGAL_PAGE_SUBTITLES: Readonly<Record<LegalPage, string>> = {
  privacy: `Effective ${PRIVACY_VERSION} • No advertising tracking`,
  terms: `Effective ${TERMS_VERSION} • Virtual-coin simulated casino`,
  support: 'Purchases • account access • data requests',
};

export const LEGAL_SECTIONS: Readonly<Record<LegalPage, readonly LegalSection[]>> = {
  privacy: [
    { title: 'DATA WE PROCESS', body: 'Account name, nickname, password verifier, avatar and settings.\nPlay history, virtual wallet, rewards and Apple transaction IDs.' },
    { title: 'WHY WE USE IT', body: 'To sign you in, run fair rounds, keep your wallet and deliver purchases.\nAlso to prevent duplicates, provide support and protect the service.' },
    { title: 'PAYMENTS & TRACKING', body: 'Apple processes payment details; we do not receive full card details.\nWe do not sell personal data or use advertising tracking.' },
    { title: 'STORAGE & RETENTION', body: 'Preferences stay on device. Account, wallet and verified transactions\nstay on the service while active or as legally required.' },
    { title: 'YOUR CONTROLS', body: 'Delete your account in the Artisan Dossier. Required fraud, tax, refund or legal\nrecords may be retained for the period stated in the full policy.' },
  ],
  terms: [
    { title: 'ELIGIBILITY', body: 'Use the game only if you meet the regional minimum age for simulated\ngambling and local law allows access.' },
    { title: 'VIRTUAL COINS', body: 'Coins are entertainment items with no cash value. They cannot be\nredeemed, transferred, sold or exchanged for real-world prizes.' },
    { title: 'APPLE PURCHASES', body: 'Coin packs are consumable Apple In-App Purchases. Apple handles\npayment and refunds; server verification is required before delivery.' },
    { title: 'GAME RESULTS', body: 'Rules and paytables determine results. RTP is a long-run estimate,\nnot a promise that an individual session will win.' },
    { title: 'FAIR USE', body: 'Automation, tampering, transaction fraud, account resale and exploits\nare prohibited and may result in correction or restriction.' },
  ],
  support: [
    { title: 'PURCHASE PENDING', body: 'Do not buy the same pack again. Wait for Apple approval, then use\nUnfinished purchases at the Coin Counter.' },
    { title: 'COINS NOT SHOWN', body: 'Open Coin Counter → Unfinished purchases. Keep the Apple receipt and\nPlayer ID when contacting support.' },
    { title: 'REFUNDS', body: 'Request payment refunds through Apple. Refunded or revoked transactions\nmay remove the corresponding unused virtual coins.' },
    { title: 'ACCOUNT & DATA', body: 'Artisan Dossier contains Delete account. Support can help with\naccess, privacy questions and deletion status.' },
    { title: 'SAFER PLAY', body: 'This is simulated gambling with no cash-out. Take regular breaks and\nstop if the experience is no longer comfortable.' },
  ],
};
