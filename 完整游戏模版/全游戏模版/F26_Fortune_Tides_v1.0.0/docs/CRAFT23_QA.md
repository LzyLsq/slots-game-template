# Cabinet craft 23 — finalized 2026-09-20

Changes: aperture-aligned travelling metal reflections for each cabinet, staggered treasure glints, slower award lantern and rim breathing. Eight cropped symbols per mode are prerasterized at display resolution with oversampling, rebuilt on size changes and released on destroy. Live landing sparks now fade through settlement rather than being cleared abruptly; a new spin still clears old effects.

Validation: 48 automated tests passed, including crop preservation/cache disposal and particle lifecycle. Build and iOS web sync completed. Eight actual normal/big award cases across four modes passed with exact balances and no page errors; desktop browser frame P95 16.7–16.8ms. Twelve interrupted spin/return cycles passed. At DPR3, all four reflection frames contain their own glass apertures, move over time, do not intercept pointers and disappear with reduced motion. Collection animation cleanup and reduced motion pass. Pearl screenshot visually inspected.

Evidence: screenshots/craft23-{mint,pearl,reef,beacon}.png and screenshots/four-voyages-motion.webm. No physical-device performance or App Store acceptance claim.
