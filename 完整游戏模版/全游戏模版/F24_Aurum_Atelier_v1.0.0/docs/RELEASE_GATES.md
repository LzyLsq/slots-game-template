# F24 release gates — September 17, 2026

**Current conclusion: a browser game template is being integrated; a signed, submission-ready iOS product has not been demonstrated.** The release configuration does not supply publisher credentials or native bridge implementations. The review below used Apple's official pages fetched successfully on this date; source URLs and response hashes are recorded in `release/official-source-check.json`.

## Concrete gates

| Gate | Audit evidence | Required action |
|---|---|---|
| Independent product / 4.3 | F24 now specifies fixed lines, ways, coin collection and cluster cabinets; other family projects still share engine/services | Compare actual decisions, progression, bonus behavior, navigation and content against every app submitted alongside F24. Attach a factual comparison and current builds; appearance or SKU changes alone do not establish substantive differentiation. No guarantee of approval. |
| Bundle/signing | Both checked-in iOS build configurations now use F24 identity; no signed native archive has been verified | Use the new `release/ios-release-build.json`, candidate `com.publisher.aurumatelier`. Register or replace consistently, export, set team/capabilities, sign and test. New config is a scaffold, not a tested IPA. |
| Native IAP | TypeScript bridge interface exists; no executable Swift/Objective-C StoreKit bridge found | Implement product retrieval, purchase, pending/cancel, JWS forwarding, unfinished replay, transaction updates and finish-after-server-delivery. Test with Apple Sandbox. |
| Server verification | `AppleSignedTransactionVerifier.ts` checks JWS signatures/certificates; PostgreSQL checks account token, product and duplicate transaction IDs | Configure production roots/environment/catalog, review verifier against Apple's maintained library, test authentic signed transactions, notification/refund delivery and retries. Source inspection is not live verification. |
| Apple login and deletion | Apple identity-token verification and local/server deletion paths exist; no native auth bridge or Apple token-revocation implementation found | If retaining Apple sign-in, implement native authorization and server authorization-code/token lifecycle with token revocation during deletion. Test guest, password and Apple account/data deletion, including retained purchase-record disclosures. |
| Publisher/privacy | `ReleaseConfig.ts` and public legal pages contain placeholders | Set publisher identity and public URLs. Inventory all shipped engine/SDK/server data, retention and sharing; finalize App Privacy and applicable native privacy manifests/required-reason API entries. |
| Age/territories | No F24 App Store Connect questionnaire or territory decision is available | Answer for frequent simulated gambling where accurate. Current Apple rating tables place frequent simulated gambling at 18+ in the current global system; regional/older-OS treatment can differ. Confirm the actual generated rating in App Store Connect. |
| Honest ranking/metadata | `hallStandings()` contains workshop-themed generated characters with `virtual: true` | Clearly identify demo/local/simulated standings or ship real server rankings. Do not present generated users or fabricated online counts as real players. Use only actual F24 screenshots and supported feature claims. |
| Device/StoreKit evidence | Browser/typechecking evidence does not cover signed iOS behavior | Record iPhone safe-area/touch/text checks, all supported languages, background/resume, motion reduction, account deletion, Sandbox purchases/refunds and TestFlight. |
| Audit wiring | Fixed: `npm run release:audit` reads `release/readiness.json`, validates its identity/schema and reports incomplete evidence as BLOCK | Run both `npm run release:audit` and `node release/check-gates.cjs`. Neither a passing source scan nor manually setting a flag proves native readiness. |

## Official requirements and scope

- **[App Review Guidelines 4.3](https://developer.apple.com/app-store/review/guidelines/#spam):** multiple Bundle IDs do not make the same app distinct. Apple evaluates repetitive apps and meaningful user experience, not a fixed count of unique slot mechanisms. Shared engine code by itself is not evidence of either approval or rejection.
- **[Guidelines 3.1.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase):** this template's native coin shop is designed for IAP. Purchased currency cannot expire. Do not describe consumable recovery as restoring spent coins. Storefront-specific external-payment rules exist; this project does not implement or rely on them.
- **[Account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/):** deletion must cover automatically created guest accounts too. Apple-sign-in accounts need token revocation. A logout, account deactivation or local-cache reset alone does not establish completed account/data deletion.
- **[App Privacy details](https://developer.apple.com/app-store/app-privacy-details/):** report the shipped data flows, including third-party SDKs. The current server can process player identifiers, nicknames, gameplay and purchase information; finalize the labels from the actual deployment instead of copying another project's answers.
- **[Age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/):** simulated gambling remains relevant even without cash redemption. A consent screen does not determine the App Store rating.
- **[Guidelines 5.3](https://developer.apple.com/app-store/review/guidelines/#gaming-gambling-and-lotteries):** keep this product within simulated play with no cash-out or real-world prizes. Adding real-money gaming changes the applicable licensing/territory obligations; purchased IAP currency cannot fund real-money gaming.

## Acceptance order

1. Finish the F24 browser build, four exact rule/settlement contracts, language fit and current screenshot evidence.
2. Register the App ID and products; configure the isolated backend and policies. Coin pack totals are 20,000 / 110,000 / 240,000 / 520,000. All real displayed prices come from StoreKit.
3. Implement native bridges and Apple token revocation; export/sign the F24 iOS target.
4. Complete Sandbox, device and TestFlight checks; capture reproducible evidence in the release record.
5. Resolve all BLOCK items and manually review metadata and cross-app differentiation before submission. Only Apple can determine the review outcome.

Do not fill `readyForSubmission` with `true` merely to make a command pass. Update `release/readiness.json` only with verified evidence. F23 screenshots, RTP results and release assertions are not substitutes for F24 checks.
