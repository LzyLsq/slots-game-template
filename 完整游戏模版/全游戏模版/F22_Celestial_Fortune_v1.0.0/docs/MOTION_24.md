# F22 · Cabinet motion continuity

Symbol scale is now captured together with position and angle at spin entry. The captured pose blends into reel motion over the existing 220 ms transition instead of snapping back to unit scale.

Cabinet energy and reel streak opacity follow measured reel velocity. Each stopped column releases its landing light into its own idle light over a smooth 650 ms transition, eliminating the final-column switch from running to idle lighting.

Landing profiles use separate duration, row delay, compression and displacement: Caishen 500 ms with weighty settling; Wish 560 ms with restrained lateral twist; Lotus 660 ms with a softer return; Forge 400 ms with a brief impact. Idle motion resumes after all rows in each column finish their landing response.

## Verification

TypeScript and Cocos web-mobile build passed. Twelve browser cases covered four cabinets at 320×568, 430×932 and 390×844 (reduced motion). Each case checked exact start-pose continuity, a known-grid animation and a regular game spin. Final state was idle with finite transforms, zero reel trails and unchanged Sprite node counts. Known-grid animation retained all result symbols. Screenshots and sampled motion traces were reviewed. This is browser viewport validation, not physical-phone frame-rate certification.

Evidence: screenshots/motion-24.json; screenshots/*-landing-24.png; screenshots/*-idle-24.png; screenshots/motion-24-video/four-cabinets.webm.
