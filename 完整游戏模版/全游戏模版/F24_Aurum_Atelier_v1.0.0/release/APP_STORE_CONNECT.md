# F24 App Store Connect checklist

Use this with [RELEASE_GATES](../docs/RELEASE_GATES.md). The checklist is not an assertion that these actions are complete.

## Identity and catalog

- Register Aurum Atelier and the independent candidate identifier `com.publisher.aurumatelier`; confirm name availability, publisher ownership and signing team.
- Create four Consumable products matching `STORE_PRODUCTS` exactly. Server delivery totals, including bonuses:

| Product suffix | Base | Bonus | Total |
|---|---:|---:|---:|
| coins.apprentice | 20,000 | 0 | 20,000 |
| coins.artisan | 100,000 | 10,000 | 110,000 |
| coins.master | 200,000 | 40,000 | 240,000 |
| coins.patron | 400,000 | 120,000 | 520,000 |

Choose prices in App Store Connect; display StoreKit's localized prices, not debug prices. Purchased currency must not expire. Consumables do not restore like permanent unlocks: unfinished delivery recovery and authoritative wallet synchronization must be explained accurately. No cash-out or real-money prize use.

## Metadata and privacy

- Supply current F24 icon, screenshots from the actual build, name/subtitle, accurate descriptions, copyright, content rights, support contact, public HTTPS privacy/support URLs and export-compliance responses.
- Complete the age questionnaire accurately. For an app centered on simulated slots, evaluate frequent simulated gambling; Apple's current global table associates this with 18+, with platform/version and regional differences. Do not claim a lower rating merely because coins cannot be cashed out. No Kids Category positioning.
- Map actual shipped client, server and third-party SDK data to App Privacy. Check identifiers, nickname, purchase history, gameplay content and security/diagnostic records, purposes, linkage, retention and deletion. Do not claim “no tracking” without checking the final SDK inventory.
- Audit applicable privacy manifests / required-reason API declarations in the final native archive. Only declare real reasons and collection behavior.

## Reviewer access and differences

- Provide an accessible review account or complete demo mode, supported test instructions, review contact and running backend.
- Explain simulated casino/no cash redemption, the four real cabinet rules, exact bonus triggers, store synchronization and in-app account deletion, including guest accounts.
- Include a factual comparison to the other submitted games: player decisions, progression, bonus/settlement behavior, navigation and content. Theme/color/name/coin-price changes alone are not sufficient evidence of a distinct product.
- Explain local/demo ranking data honestly. Do not describe simulated characters as real online players or fabricate online counts.
- Do not state approval is guaranteed or claim certification from internal RTP samples.
