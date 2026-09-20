# Treasure arrival loading pass

Scope: entering a cabinet from the hall; not a replacement of the cold-start bootstrap.

## Changes

- Theme-specific title and treasure art remain proportional over the existing illustrated plaza.
- Brief fade-in and settled treasure entrance, soft additive illumination, six staggered glints; no whole-object looping wobble.
- One inset progress plaque replaces scattered symbols, isolated percentage and floor text. Larger small-screen typography.
- Real resource completion drives monotone progress, followed by cabinet rendering and a completed 100% state before the fade-out.
- Cached entry uses the existing shorter path. No extra long showcase delay.
- Progress tween, ambient tweens and lifecycle subscriptions cleaned up. Reduced-motion path omits ambient choreography.
- Hall direct-entry behavior and navigation input lock retained.

## Verification

- `npm run typecheck`: passed after final changes.
- `npm test`: all nine suites passed (math, economy, Apple auth verification logic, rank, layout, rules, language, motion, press). These are not native StoreKit tests.
- Cocos web build: log reports Finished; CLI retains its existing exit-code 36 behavior. Do not characterize this as a clean native release build.
- Browser rendering: 414×896 LUCKY CHEST loading and completed cabinet; 320×568 PEARL PARTY loading; final enlarged text checked on 320×568 GEM PARADE cached loading and completed cabinet.
- Observed direct entry, progress display, transition completion and repeat entry. No overlap seen in inspected loading screenshots.
- Screenshots stored under workspace `output/playwright/f16-loading-v11-*`.
- Background event behavior, reduced-motion behavior, slow-network failure recovery and physical-device frame rate are implemented/retained but not newly runtime-certified in this pass.

## Shared production requirements

The workspace `GAME_PRODUCTION_STANDARD.md` consolidates this conversation's art, interaction, four-mode, resource, transaction, testing and independent App Store release requirements. Workspace `AGENTS.md` requires reading it for subsequent game tasks in this workspace. For a project created outside this workspace, carry that standard into the new workspace explicitly.
