# F24 cabinet framing — 2026-09-17

The previous layout capped the cabinet at the full 1024-pixel room width, leaving a large ceiling and reducing the reels and controls. The new layout permits a 35% larger room transform, then fits actual controls, status and number plaques between the unchanged toolbar/footer reservations. Horizontal hit areas retain an 8-design-unit edge gap. Artwork coordinates and the integrated tall painting are unchanged.

The Jade cabinet's two 148×148 bet hit areas move 24 source units right. Painted button faces stay fixed, both faces' centers remain inside their respective targets, and the targets remain disjoint from SPIN and the BET display.

Measured scale change from the previous mobile framing:

| Viewport | Golden | Jade | Pearl | Ruby |
|---|---:|---:|---:|---:|
| 320×568 | +24.2% | +29.7% | +25.5% | +24.7% |
| 390×844 | +28.7% | +29.7% | +25.5% | +31.4% |
| 414×896 | +28.7% | +29.7% | +25.5% | +31.4% |
| 430×932 | +28.7% | +29.7% | +25.5% | +31.4% |

Short-screen growth is capped by the existing vertical safe bounds; desktop landscape was already height-limited. Minimum tested mobile target is now 57.5 physical pixels at 320×568.

Validation: `npm run test:layout` passes 48 cabinet/viewport combinations, including 1280×720, 1440×900 and 1920×1080 desktop; existing clipping, safe inset, nonoverlap and ≥44-pixel checks are preserved, with a new ≥24% mobile enlargement regression check. `npm run typecheck` passes. Runtime screenshot review is handled by the integrating agent.
