# F24 acceptance — 2026-09-17

This checklist retains the user's cumulative requirements. “Implemented” is not a claim of App Store approval or native-device verification.

## Product scope
- Four genuine traditional slot mechanics, distinct cabinets, accurate outcome highlighting, explicit trigger/payout rules. See F24_GAMEPLAY.md and mathematical fixtures.
- English default; Simplified/Traditional Chinese, Japanese, Korean. Text must remain readable within the painted surface, not merely within its Cocos label rectangle.
- Login, rename/avatar, local account records and remote authoritative ranking, readable/claimable inbox, rewards and coin shop. Coin packs follow intentional tiers. Never describe seeded entries as verified live players.
- Soft cheerful dimensional treasure art, abundant coins/gems, independent hall/service design; F13–F23 and S05/S06/S07 references for integrated controls, scene continuity and sequential reward feedback. Distinct mint, jewel workbench, chain chest, circular vault silhouettes.
- Mobile swipe navigation, centrally prominent SPIN, distinct AUTO, fixed touch targets, safe-area-aware toolbar.
- Contextual idle/press/spin/landing/winning animations. Cluster clear/refill only when genuine cluster outcomes require it. Winning positions and ordinary/big/mega/epic presentation must remain available.
- No black transition, blocked paytable, lost input or frozen return after repeated play.

## Validation evidence
- Previous pre-redesign baseline: 100 layouts (2 sizes × 5 languages × 10 screens), four-mode touch flows, winning stages and return lifecycle all passed.
- This art/layout revision requires the same checks again. Latest evidence copied below only after completion.
- Real iPhone performance, StoreKit purchase/restore, signing, backend deployment and store submission remain separate release gates. See RELEASE_GATES.md.

## Delivery
- F13–F23 return/win fixes pushed as 139ecb1 before this redesign.
- F24 screenshots and source are delivered with this revision after verification; never treat a prototype native purchase adapter as a live App Store integration.


## Material and motion revision — 2026-09-17
- Phone cabinet bodies enlarged 24–31%, geometry tested at 48 viewport/mode combinations. All four silhouettes retain their painted controls and safe input targets.
- Lobby navigation presses as one visual unit; masked portraits, dedicated ranking action, authoritative account rows, loading/retry/unranked states.
- Lobby wallet coin flips, portrait rim glints, clipped exhibit drift, staggered workshop jewel highlights. Nodes and opacity tweens are reused and cleaned up on exit.
- Four cabinet idle motifs: mint double pulse, staggered jewel refraction, paired chain glints, elliptical vault light flow. Lower effects are masked between controls and numeric plaques.
- Big/mega/epic awards use a painted treasure theatre, feathered room boundaries, phased entrance, pooled coin paths from chest to payout plaque, gem sparkles, rotating light, exact amount reveal and a 300ms double-tap guard. Large amounts remain inside the painted plaque.
- Reduced motion removes moving reward coins and idle effects; award amounts remain immediately readable.
- Five-language mode names and payout-family captions completed.
- Latest browser evidence: `evidence/final-qa.json`, `evidence/motion-qa.json`, `evidence/win-language-qa.json`, `evidence/lifecycle-24.json`. Screenshots and motion recording under `evidence/`.
- Browser automation verifies layout and behavior, not sustained frame rate on an actual iPhone. Native release gates remain open.
