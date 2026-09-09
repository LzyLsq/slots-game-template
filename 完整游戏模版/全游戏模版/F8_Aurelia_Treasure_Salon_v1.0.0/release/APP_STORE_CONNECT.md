# App Store Connect checklist

## In-App Purchases

Create four **Consumable** products whose IDs exactly match `STORE_PRODUCTS`. Add localized display names, descriptions and prices. Include an App Review screenshot showing the Coin Shop and provide review access to every product. Purchases do not alter game odds and coins cannot be cashed out.

## App Privacy

Confirm the production data path before answering. The current design processes user ID, user-generated nickname, purchase history, gameplay content and diagnostics/security records. Payment card details are processed by Apple, not the game server. Tracking and third-party advertising are absent. Publish the HTTPS Privacy Policy URL before submission.

## Age rating and territories

Answer the simulated-gambling questions accurately. Restrict territories where the game, simulated casino content or purchasable virtual coins require additional approval. The in-app eligibility notice does not replace App Store age rating or legal territory review.

## Review notes

- State clearly: simulated casino, no real-money wagering, no cash-out and no prizes.
- Explain how reviewers obtain test coins and provide a stable review account.
- Describe Coin Shop → Sync Purchases and Settings → Delete Account & Data.
- Explain that Turbo, Auto and Quick Stop affect presentation timing only, never results.
- Provide a contact available during review and server uptime monitoring.

## Metadata still supplied during iOS conversion

App name/subtitle, categories, keywords, descriptions, support and marketing URLs, screenshots for every required device size, 1024×1024 icon, copyright, encryption declaration, content rights, age questionnaire and reviewer credentials.

Enable the Sign in with Apple capability for the App ID and Xcode target, verify the Bundle ID matches `CSW_APPLE_BUNDLE_ID`, and exercise the native bridge checklist in `NATIVE_APPLE_SIGN_IN_BRIDGE.md`. Configure all four coin packs as Consumable In-App Purchases and keep the StoreKit display price authoritative.
