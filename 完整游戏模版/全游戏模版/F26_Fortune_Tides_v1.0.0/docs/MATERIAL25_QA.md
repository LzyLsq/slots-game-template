# Cabinet materials pass 25

- Re-exported four cabinet masters at WebP quality 96 with restrained detail recovery. Composition and glass aperture coordinates remain unchanged.
- Restored 32 individual symbol assets from the native atlas resolution instead of the previous 244px intermediate. Original assets retained.
- Added explicit per-symbol artwork bounds; sprite preparation and rendering share these crops. Symbols fit rectangular cells with 12% horizontal / 18% vertical breathing room before animation.
- No new cabinet shadows, glass overlays, rule changes or payout changes.
- 48 automated tests passed; static build and native web sync passed.
- Browser evidence: MATERIAL25_QA.json and screenshots/material25-*.png, 320/390 CSS pixels at DPR3.
- Image generation returned no usable artifact; this pass improves existing source material and display fidelity, not a newly painted asset set.
