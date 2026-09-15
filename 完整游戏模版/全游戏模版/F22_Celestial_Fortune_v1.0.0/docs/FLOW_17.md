# F22 transition polish 17

- Use the actual cabinet texture cache to shorten repeat entry. Keep first-entry loading, a monotonic clipped progress bar, completed root crossfade, visible 100%, and cover fade-out.
- Ignore navigation to the current page so repeated taps do not rebuild the interface or restart its effects.
- Reset loading treasure rotation before each loop while invisible, keeping successive drops consistent.
- No changes to payouts or balances.

Validation: TypeScript and Cocos web-mobile build passed. Isolated Chrome viewport checks at 320×844, 430×844, and reduced-motion 390×844 passed. Cold entry measured 2.09–2.10 seconds; cached entry 1.52 seconds; reduced motion 0.21 seconds. Concurrent entry, repeated navigation, injected asset failure/retry, monotonic progress with 100% observed, and transition cleanup passed without page errors. Destruction assertions wait for Cocos deferred node cleanup.

Rendered loading and cabinet screenshots reviewed at 320px; loading text and bar stay within their frames. These are desktop browser viewport checks, not physical-device performance measurements. Evidence: screenshots/flow-17.json and *-flow-17.png.
