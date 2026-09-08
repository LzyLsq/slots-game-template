# F6 paid-release handoff

The project now fails closed around paid virtual coins: a release build cannot grant a coin pack unless the native StoreKit layer reports a server-verified Apple transaction. PostgreSQL uses unique transaction and notification identifiers, and refund/revocation notifications remove the corresponding remaining coins.

Use `npm run server:production` for deployment. `npm run server:dev` is an in-memory localhost aid with no durable wallet and must never receive production traffic. The production API also owns rounds, free rewards, rankings, profile settings and account deletion so the local cache cannot become a second authority.

## Publisher-owned values still required

1. Replace the publisher name, support email and public HTTPS URLs in `assets/scripts/core/ReleaseConfig.ts` and the three files under `build-templates/web-mobile/`.
2. Replace `com.publisher.*` in `assets/scripts/services/StoreService.ts` with the exact Consumable product IDs created in App Store Connect.
3. Configure the native StoreKit 2 bridge described in `NATIVE_STOREKIT_BRIDGE.md` during the iOS export.
4. Enable Sign in with Apple and implement `NATIVE_APPLE_SIGN_IN_BRIDGE.md`. Apply `server/migrations/001_apple_sign_in.sql` to an existing database.
5. Supply PostgreSQL, Apple Bundle ID and Apple root certificate paths using `production.env.example`. Secrets never belong in the repository.
6. Point App Store Server Notifications V2 to `https://YOUR_API/api/store/apple-notifications`.
7. Have qualified counsel finalize publisher identity, retention, governing law and release territories in the policy drafts.
8. Put distributed rate limiting/WAF in front of the included process-level limiter. Set `CSW_TRUST_PROXY=1` only behind a trusted proxy that replaces `X-Forwarded-For`.

Run `npm run release:audit`. A release is blocked while any item reports `BLOCK`.

For the Web Mobile artifact, use `tools/web-mobile-release-build.json` with
Cocos Creator's `--build configPath=<absolute path>` option. This keeps the
launch scene in the bundle and leaves `privacy.html`, `terms.html` and
`support.html` at stable public URLs.

## Required validation sequence

```bash
npm ci
npm run typecheck
npm run typecheck:server
npm test
npm run test:rtp -- 1000000
npm run release:audit
```

Then validate StoreKit in Xcode with a StoreKit Configuration, Apple Sandbox accounts and TestFlight. Test purchase success, Ask to Buy/pending, cancellation, duplicate delivery, network loss after charge, server retry, refund notification, account deletion and wallet synchronization.
