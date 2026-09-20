# Hall entrances — v12

## Interaction decision

The previous hall looked like a selection control (SELECTED plus a shared PLAY),
but tapping a treasure immediately navigated. Replace this conflicting metaphor
with four individually labelled entrances on one continuous console.

- Each treasure, name and PLAY plate shares a single animated press surface.
- Tapping any part enters that game directly; no confirmation step.
- Pavilion nameplates remain visible and also act as direct entrances.
- Dragging cancels the tap. Plaza swipes preview a destination without entering.
- Entry guard prevents repeated navigation; returning restores PLAY labels.
- Keep existing artwork and page structure: this is a scoped interaction change.

## Verification

- TypeScript typecheck: passed.
- All nine project test suites: passed, including press cancellation/ownership.
- Cocos 3.8.8 web build: log reports Finished; CLI exits 36 as before.
- Browser viewport 320×568: clicked all four entrance names, reviewed each
  corresponding cabinet screenshot, and returned to the hall.
- Drag away from an entrance: remained in hall.
- Browser viewport 414×896: reviewed layout and whole-surface pressed state.
- Horizontal plaza swipe: updated destination preview without entering.
- Double-click crown pavilion: reached Crown Carnival; a single Back restored
  the hall without stale OPENING labels.

Screenshots: workspace `output/playwright/f16-entrances-v12-*.png`.
Preview: port 4851, version query `treasure-entrances-v12`.

This is browser interaction verification, not physical iPhone touch testing or
App Store release certification.
