# F22 market and rewards polish 20

Market: 280ms showcase crossfade; outgoing content has system events paused, bounded retirement prevents accumulated showcases under rapid input. Selected underline fades in 240ms. Same-offer clicks preserve the showcase. A shared numeric counter transitions from its current displayed value over 420ms instead of restarting at zero. Counter stops on page destruction. Empty catalogs are handled before indexing.

Rewards: two small glints travel the existing seven-day ellipse every 16 seconds, behind the tiles and central treasury. Dates and amounts do not move. Animation proxy tweens stop on node destruction. Reduced motion skips the traveling glints and transitions.

Validation: typecheck and Cocos web-mobile build passed. Real-pointer tests at 320×568, 390×844, 430×932, plus reduced-motion 390×844. Four offers, seven rapid selections, single surviving showcase/selection, decoration-only touches with no credits, exact-once check-in (+2000) and daily reward (+5000) all passed, no page errors. Actual 320px market/calendar screenshots inspected. Evidence: screenshots/services-validation-services-20.json, services-validation-services-20-reduced.json and *services-20.png. Store purchase availability and existing economy behavior remain unchanged.
