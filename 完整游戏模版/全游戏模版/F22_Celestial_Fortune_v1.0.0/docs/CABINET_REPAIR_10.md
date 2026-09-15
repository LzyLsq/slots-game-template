# F22 cabinet repair — 2026-09-15

- Atlas sampling windows exclude observed neighboring-cell fragments; untrimmed 256px canvases preserve symbol scale and aspect ratio. Same windows apply to sharp and blur atlas variants.
- Reels use continuous velocity-based deformation of sharp symbols instead of abrupt sharp/blur texture changes. Speed is 12 cells/sec, braking .82sec, with reduced landing deformation. Reel result logic is unchanged.
- Ordinary win typography and ornaments use panel-relative safe insets. Amounts show complete integers; both normal and grand wins reserve room for their scale pulse and forbid wrapping.

## Validation

TypeScript passed. Cocos web-mobile build finished successfully (CLI returned its usual code 36). Four modes passed continuous-start, bounded-travel and exact-result checks. Desktop Chrome requestAnimationFrame p95 measured 16.7–16.8ms in this test; this is not a real-phone performance guarantee.

All four modes passed normal/grand presentation cleanup and no-additional-wallet-credit checks. Long amounts 123,456,789 and 987,654,321 were rendered and captured at 320×568 and 430×932. Reviewed all four narrow-phone screenshots for text containment. Reports and screenshots are in screenshots/ with repair-10 suffixes, plus reel-motion-validation.json.

## Hand repair — revision 12

The lotus character hand was corrected using the existing tools/cc-generate.sh CC Switch Responses image-generation route. Visually verified one thumb and four fingers. Only a feathered hand region was composited into the installed cabinet; image dimensions, aperture geometry and pixels outside the edit region were preserved. Web-mobile build completed. Rendered at 320×568 and 430×932 with no page errors; screenshots: 320-lotus-hand-12.png, 430-lotus-hand-12.png and lotus-five-fingers-detail.png.

Some source atlas objects still start at the source cell boundary: sampling removes adjacent fragments but cannot reconstruct details missing from the original artwork.
