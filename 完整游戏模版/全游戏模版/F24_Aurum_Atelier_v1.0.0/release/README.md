# F24 Aurum Atelier release handoff

Status: **browser-template integration; iOS submission blocked**. This directory contains configuration and interface contracts, not an executable StoreKit bridge, a signed archive, or App Review approval.

## 1. Verify the browser deliverable

```sh
npm run typecheck
npm run typecheck:server
npm test
node release/check-gates.cjs
npm run release:audit
```

The F24 gate checker intentionally exits nonzero while release evidence is missing. The inherited missing-file dependency was fixed on September 17, 2026: `release:audit` now reads `release/readiness.json` and reports BLOCK for missing, malformed or incomplete evidence. Do not manufacture a passing status or reuse F23 reports/screenshots as F24 evidence.

## 2. Export the independent iOS target

```sh
/Applications/CocosCreator.app/Contents/MacOS/CocosCreator --project "$PWD" --build "configPath=$PWD/release/ios-release-build.json"
```

The scaffold preserves the checked-in launch scene and targets portrait iOS 15+. It uses `com.publisher.aurumatelier` and output `ios-f24`. It has not been built or signed in this audit. Register that identifier under the publisher's team or replace it consistently in the build config, product IDs, server verifier and App Store Connect. Set the display name to Aurum Atelier in the generated target. Supply signing, capabilities, icon, privacy manifest entries applicable to the final engine/SDKs, and deployment settings. `tools/ios-preview-build.json` has also been updated to the same F24 identity; neither configuration supplies signing credentials.

## 3. Implement paid coin delivery and authentication

- Implement and test [NATIVE_STOREKIT_BRIDGE](NATIVE_STOREKIT_BRIDGE.md), including unfinished transactions at launch, live updates, server delivery and finishing only accepted transactions.
- Product totals and environment mapping are in `production.env.example`. Use a separate F24 database and registered product catalog. Never deploy the example secrets/domains or the in-memory development server.
- Implement [NATIVE_APPLE_SIGN_IN_BRIDGE](NATIVE_APPLE_SIGN_IN_BRIDGE.md) if keeping the Apple login entry. The current server checks identity tokens, but does not yet exchange/store authorization credentials and revoke Apple tokens on account deletion.
- Review the custom Apple JWS verifier against Apple's maintained App Store Server Library and real signed transactions. Existing source checks are not proof of a completed production integration.

## 4. Complete release evidence

Follow [RELEASE_GATES](../docs/RELEASE_GATES.md) and [APP_STORE_CONNECT](APP_STORE_CONNECT.md). Record real-device, Sandbox and TestFlight runs: successful/pending/cancelled purchase, retry after payment/network loss, duplicate delivery, refund, wallet sync, Apple sign-in/revocation, guest/password/Apple account deletion, all languages, touch targets, safe areas and background/resume.

Do not set `readyForSubmission` based only on unit tests or appearance changes. Distinct artwork and four cabinet names are not a guarantee under Guideline 4.3; compare F24's actual player experience against the other apps and document substantive differences.
