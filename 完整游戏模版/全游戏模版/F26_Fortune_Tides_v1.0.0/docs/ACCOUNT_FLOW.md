# F26 account flow — 2026-09-18

Implemented: device-local username/password registration and sign-in, persistent session, guest entry, sign-out confirmation, account deletion after password verification (or guest confirmation), recovery guidance, five-language UI.

Credentials use random salts and PBKDF2-SHA256 (210,000 iterations). Plaintext passwords are not persisted. This browser-local mechanism is a preview feature, not a server trust boundary or a production identity service.

Each registered account has its own save key. The pre-existing `fortune-tides:v1` save remains the guest save. Sign-out retains coins, progress, settings and account credentials. Deletion removes the selected account and its save; it does not clear all local storage. In-memory round results and history clear on account changes. Protected routes return to sign-in without a session.

Not connected: remote registration/login, cloud synchronization, remote password recovery, Sign in with Apple. These require a deployed identity service and native authorization integration before production acceptance. The UI explicitly identifies accounts as device-local and does not display a nonfunctional Apple login button.

Validation: 43 automated tests; browser registration, invalid password, login, reload after logout, isolated balances, legacy guest preservation, actual spin and return, account deletion; 20 login/register language-size combinations (five languages, 320/414px).
