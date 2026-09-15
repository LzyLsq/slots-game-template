# F22 cabinet motion 18

- Stopped columns now use the same spring-to-idle pose function during and after a spin. Earlier columns no longer wait in a fixed resting pose and then jump into an already-progressed idle phase when the last column stops.
- Replace persistent winning rectangles with inset engraved corners. Each column enters 90ms after the previous column; corners brighten, hold, and fade out. Theme accent and symbol emphasis start together.
- Winning columns trigger cabinet edge/title responses once per column, without replaying reel-stop audio.
- During win focus, idle glows and glints ease down, idle sparkle emission pauses, and glass reflection reduces. They return smoothly after focus ends.
- Pooled corner nodes avoid per-frame Graphics redraw. New spin/show clears previous highlights; reduced motion retains a static readable indication without moving bursts. No outcome or payout changes.

Validation: typecheck and web-mobile build passed. Twelve isolated browser cases: four cabinet modes at 320×844, 430×844, and reduced-motion 390×844, each with a real spin followed by a deterministic visual highlight inspection. Tests check idle completion, staged entry, effect cleanup, valid final grid, and page errors. Final focused four-mode run verifies suppressed idle illumination and captures the final screenshots/video. Deterministic highlights are visual tests, not credited wins. Reports: screenshots/motion-18.json and motion-18-focus.json. Actual screenshots reviewed for Caishen and Lotus; final Lotus frame has no nonwinning idle halos. Video: screenshots/motion-18-video/four-cabinets.webm. No physical-device performance claim.
