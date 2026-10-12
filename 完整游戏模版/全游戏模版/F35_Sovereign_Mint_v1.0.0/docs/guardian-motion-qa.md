# F35 Guardian motion — 2026-09-30

## Implemented
- Original high-resolution transparent artwork is continuously skinned on a 36 × 44 grid. No cut-out limb patches, duplicated bodies or whole-statue rotation/scale.
- Golden lion: inviting paw, nod, gentle tail and breathing. Jade qilin: inviting front hoof, nod and tail. Seahorse: independent fins, nod and curled tail. Phoenix: wings, nod and trailing feathers.
- Two local invitations followed by a rest; planted feet/pedestal remain at their original positions. Local, restrained scaling is applied to moving joints only.
- Tap, spin, ordinary-win, big-win and super-win cues have separate strengths and priorities. Award cues use the same `winTier` mapping as the main award presentation.
- Taps have a 2.2-second cooldown and respect touch cancellation/drag. They do not award currency or change economy outcomes.
- Theme-specific tap sound and optional short vibration use existing sound/haptic settings. Existing music and spin/win feedback are retained. Audio was not audited by listening in this pass.
- Reduced-motion mode freezes the rig; background/hidden-app motion pauses. Original cabinet proportions and front ledges remain intact.

## Automated checks
- Client and server TypeScript checks: passed.
- Complete `npm test`: passed, including existing game/economy/auth/rank suites.
- 132 responsive layout combinations: passed.
- 5,784 guardian poses, 1,762,674 planted-point checks and 18,323,712 non-inverting triangles: passed.
- Cue priority, tap cooldown, rest-pose identity, reduced motion and four distinct motion signatures: passed.
- Cocos Creator 3.8.8 web-mobile build reports Finished. Latest code and build copied to the formal template.

## Actual browser verification
Formal preview: http://127.0.0.1:6038/
- 390 × 844: all four cabinets and guardian taps; ordinary award, big award and super award. Award amount visible; guardian restores after the full-screen stage without covering the amount.
- 320 × 568: phoenix and seahorse visible with feet/pedestal aligned, no reel/control displacement from the guardian.
- 768 × 1024: qilin and lion visible and proportionate; qilin tap exercised.
- Inspected page console warnings/errors: none.
- `golden-hour-live.gif` is a ~5-second recording from actual formal browser screenshots, not a generated mockup.
- PNGs are actual formal browser screenshots. `super-win-settled-phone.png` records the restored cabinet after collecting the super award, not its full-screen stage.

## Scope
Browser viewport emulation and mathematical layout tests are not physical iPhone/iPad or native iOS verification. This pass makes no App Store approval claim. No Git commit or push was requested/performed.
