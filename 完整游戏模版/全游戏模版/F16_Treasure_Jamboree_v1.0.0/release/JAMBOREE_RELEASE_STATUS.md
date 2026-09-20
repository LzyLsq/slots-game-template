# Treasure Jamboree release boundaries

Date: 2026-09-18

This is a virtual-coin entertainment game. Coins cannot be withdrawn or redeemed for money or physical prizes. No real-money gambling workflow is implemented.

## Independent application identity

- Package: `f16-treasure-jamboree`.
- Guest persistence: `f16-treasure-jamboree.cocos.save.v1`; no old F16 or reference-game migration.
- Native JavaScript hooks: `__JAMBOREE_IAP__` and `__JAMBOREE_APPLE_AUTH__`.
- Server configuration variables: `JAMBOREE_*`; separate deployment and database required.
- Session cookie: `jamboree_session`.
- Draft product identifiers: `com.publisher.treasurejamboree.coins.{purse,bullion,chest,vault}`. Replace the publisher prefix with the signed application's verified product mapping.

## Implemented local guarantees

Guest debits, settlement and refunds are persisted before success is reported. Reward delivery and its claim marker commit in one storage write. A recorded wheel result survives midnight and restart. Duplicate recent round IDs and replayed claims are rejected. Stale instances refuse to overwrite another tab's newer save. Invalid amounts are rejected instead of silently truncating a delivery at the balance limit.

Local storage is user-editable. These protections prevent ordinary UI/recovery errors, not malicious client tampering. The stale-write check is not a distributed atomic transaction. Do not use this guest wallet as the authority for paid coins.

## External release blockers

The repository's TypeScript bridge contracts are not a compiled or signed StoreKit implementation. Before claiming App Store readiness, supply and test:

1. Publisher identity, support contact, hosted privacy policy and terms.
2. App ID, signed Xcode wrapper, Apple sign-in capability, and native bridge implementations.
3. StoreKit consumable products and localized prices; sandbox/TestFlight cancellation, pending, interruption, duplicate delivery and synchronization tests.
4. Dedicated HTTPS PostgreSQL service with migrations, secrets, Apple certificate trust roots, bundle-ID audience and signed transaction verification, purchase notifications and operational monitoring.
5. Device-based accessibility, performance, memory, safe-area, offline/reconnect and background/foreground tests.
6. Publisher review of asset/font/audio commercial-use rights and age/content declarations.

Automated math, guest-ledger and verification tests do not establish visual quality or App Store approval. `npm run release:audit` intentionally remains blocked while publisher configuration or build evidence is absent.
