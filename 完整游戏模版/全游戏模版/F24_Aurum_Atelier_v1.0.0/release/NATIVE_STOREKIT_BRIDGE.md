# F24 StoreKit 2 bridge contract

Status: interface specification only. No executable native bridge was found in the audited F24 project.

During the Cocos iOS export, expose an object at `globalThis.__AURELIA_IAP__` matching `AureliaPurchaseBridge` in `assets/scripts/services/StoreService.ts`.

## `products(productIds)`

- Load `Product.products(for:)`.
- Return the exact StoreKit `id` and `displayPrice`; never hardcode release prices in TypeScript.
- Products are Consumable coin packs.

## `purchase(productId, appAccountToken)`

1. Convert `appAccountToken` to `UUID` and call `product.purchase(options: [.appAccountToken(token)])`.
2. Handle `.userCancelled` as `cancelled`, `.pending` as `pending`, and unverified transactions as `failed`.
3. For a locally verified transaction, return its JWS representation to TypeScript as `signedTransactionInfo`; do not grant coins in Swift.
4. `StoreService` submits that JWS through the authenticated `ProductionApiClient` and checks the same product ID, transaction ID, configured coin amount and authoritative balance.
5. Implement `finish(transactionId)` by locating the matching verified StoreKit transaction and calling `transaction.finish()`. TypeScript invokes it only after the server accepted delivery. If the network fails, leave the transaction unfinished so the listener retries.

## `restore(appAccountToken)`

Consumable products are not restored like non-consumables. This action must:

1. At launch enumerate `Transaction.unfinished`; also maintain the live `Transaction.updates` listener. Return every locally verified unfinished transaction, including its transaction JWS; never invent a replacement transaction.
2. `StoreService` re-submits each entry to the idempotent server endpoint and finishes only accepted transactions.
3. `StoreService` then calls authenticated `POST /api/store/sync` and applies the server’s authoritative virtual-coin balance.

Start a `Transaction.updates` listener at app launch. Never grant coins in Swift or TypeScript based only on a client-side success callback.


Register F24 products under `com.publisher.aurumatelier.coins.*` (or the publisher's consistently substituted namespace). The total delivered coin count must equal base plus bonus, as listed in APP_STORE_CONNECT.md and production.env.example. Do not finish failed or rejected deliveries. Server synchronization recovers an existing authoritative balance; it does not recreate previously spent consumables.
