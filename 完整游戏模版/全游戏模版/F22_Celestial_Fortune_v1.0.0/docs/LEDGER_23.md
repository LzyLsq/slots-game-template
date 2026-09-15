# F22 · Coin ledger and dialog polish

Fixed the ledger selecting the oldest seven records and reversing them: EconomyService inserts newest transactions at index zero. The ledger now preserves that order and pages through all stored records, six per page.

Rows display localized transaction sources, local dates/times and signed amounts. Positive and negative amounts use separate readable ink colors. Amounts retain exact digits rather than abbreviated values. Paging has bounded previous/next controls, a page count and short staggered row reveals; only the current page is mounted after deferred node destruction.

The close button fades the dialog over 180 ms with a restrained 12-unit downward movement. Internal dialog replacements remain immediate. Reduced motion closes immediately. Closing an old dialog cannot remove a newly opened dialog.

Validation: TypeScript, five-language tests and Cocos web-mobile build passed. Actual-pointer browser checks at 320×568 (English), 430×932 (Chinese), and 390×844 (reduced motion) covered newest-first ordering, 14-record pagination, first/last bounds, exact ten-digit amounts, empty state, close fade, replacement during close, and unchanged wallet balance. Screenshots were visually inspected. Records used for pagination are test fixtures in isolated browser contexts, not user transactions. These viewport checks do not measure physical-phone performance.

Evidence: `screenshots/ledger-23.json`, `*-ledger-first-23.png`, `*-ledger-last-23.png`, `*-ledger-empty-23.png`.
