# F36 release boundaries · 2026-10-09

The Cocos source project and local game flows are implemented and tested. This template is **not ready for submission**; `f36-release-status.json` is the machine-readable record used by the release audit.

## Implement before native submission

- Executable Sign in with Apple native bridge and real identity verification/account lifecycle. Source contracts and verifier tests are not a working device sign-in flow.
- Executable StoreKit 2 bridge, transaction delivery/verification/finishing, restore behaviour and App Store Connect product configuration.
- Remote expedition passport settlement/stamp/claim persistence with account isolation and server idempotency. The current passport is local-only.
- Production API configuration/deployment and F36 server acceptance: login, spin/settlement/recovery, profile, gifts, ranking, account deletion and purchase verification.

## Developer-owned configuration

- Replace `com.example.goldenwilds.f36`, `com.publisher.*` and `REPLACE_WITH_*` values with the publisher's bundle ID, products, identity, HTTPS services and public legal/support URLs.
- Finalize hosted privacy/terms/support content and the actual data-retention/privacy declarations. Template policy text is not legal approval.
- Establish asset/provider licensing records, age/content disclosures, independent product metadata and store artwork.

## Device and platform acceptance still required

- Build the iOS target in Creator/Xcode; sign and install it. No F36 iOS binary, provisioning or TestFlight upload was completed here.
- Check Metal/native rendering of the guardian shader, masks, fonts, reels, awards, safe areas and thermal/memory behaviour on real small and tall phones.
- Verify software keyboard, password field, screen readers as applicable, interruptions, background/foreground audio and sound settings on device.
- Exercise Apple login/account deletion and StoreKit Sandbox purchases, replay/cancellation/pending transactions and restore using real platform credentials.
- Perform deployed-server acceptance, then record TestFlight and actual App Store submission/review results.

Local phone-sized browser tests and source-string release checks do not substitute for these items. Keep unavailable services honest; do not enable local debug coin grants in a release build. No platform approval or certified payout result is claimed.
