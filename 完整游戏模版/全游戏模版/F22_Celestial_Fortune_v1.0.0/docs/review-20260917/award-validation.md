# V12 winning-position presentation QA

- Projects: F13, F14, F15, F17–F23 (F16 absent).
- 40/40 cabinet cases pass at 320×568 Chromium.
- Browser errors: 0; measured overflow: 0.
- 96 individual positive-award selections + 40 final unions match existing engine-generated fixture positions. Winners are excluded from nonwinner shading; exact board sequence remains unchanged.
- 40/40 guide persistence checks, 40/40 show() clears, 40/40 begin() clears. Persistence advances the component by 8 simulated seconds, not real wall time.
- 40/40 guide layers above symbol columns.
- 80 screenshots saved: first positive award + final union per cabinet.
- Presenter holds observed: 1.2 seconds per displayed award; 0.7 seconds for multiple-award summary.

## Scope

Actual presentAwardEvidence() replay with existing positive-credit engine fixtures; no fabricated win records, product-source modifications, or payout math changes. This checks presentation and lifecycle, not new random-spin mathematics, feature replacement-board sequences, big-win overlay playback, real iPhone/Safari, or frame-rate performance. Text diagnostics were collected only in these 40 final states; this is not a new full multilingual audit.

The initial helper could not settle Label snapshots during an intentional animated counter; first-screenshot synchronization was changed to rendered frames and F13 rerun. See harness-note.md.
