# Apple sign-in integration status — 2026-09-18

Implemented and simulator-compiled:
- AuthenticationServices native authorization bridge, restricted to the bundled main frame.
- Secure random nonce (SHA-256 request hash), returned-state validation, cancellation, timeout and duplicate-request protection.
- Native credential-state query.
- Sign in with Apple entitlement in both build configurations.
- JavaScript adapter that distinguishes authorization from an authenticated game session; browser and cancellation cannot grant a login.

Still blocked / not an end-to-end login:
- Xcode DEVELOPMENT_TEAM is empty and bundle identifier remains local.f26.fortunetides.
- No F26 deployed account API or configured server identity exchange.
- No signed-device Apple ID acceptance test.
- No token exchange/revocation integration for Apple-linked account deletion.

Required configuration: authorized developer Team ID, registered F26 bundle identifier with Sign in with Apple capability, and deployed account-service project/endpoint. Apple private keys belong only in server secret storage, never in web assets or the app bundle.

Server must verify Apple identity signature, issuer, audience, expiry and nonce, exchange the authorization code, create its own session, and revoke Apple tokens when deleting the linked account. Only after this exists should the login UI expose Apple login and use the server account identifier for its save scope. Do not treat the returned native identityToken/userIdentifier as a completed application session.

Validation: simulator build passed; 46 tests passed, including unsupported browser, cancellation/error and revoked credential propagation. No real Apple account authorization was performed.
