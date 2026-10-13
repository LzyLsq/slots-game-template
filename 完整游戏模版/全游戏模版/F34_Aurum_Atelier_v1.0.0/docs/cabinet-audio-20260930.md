# F34 · Theme score and award synchronization

Verified on September 30, 2026, in the Cocos Creator 3.8.8 web-mobile preview.

Historical score revision. The later [festive casino score](festive-score-20260930.md) replaces the musical arrangements below; the managed-source and visual-reveal synchronization architecture remains.

The score now follows the goldsmith atelier and each workshop's material. These are original deterministic synthesized instrumental compositions authored in `art-source/compose_audio.py`; they contain no external samples or recorded instruments. Instrument names below describe the synthesized timbres and arrangement. Signal checks establish playback and transitions; they do not replace subjective listening or phone speaker/headphone checks.

| Scene | Musical direction | Meter and tempo | Loop length |
|---|---|---|---|
| Salon | Chamber waltz, flute questions and celesta responses with light strings | 3/4, 94 BPM | 45.957 s |
| Coin Engraver | Nimble plucked strings, warm celesta and light workshop rhythm | 4/4, 104 BPM | 36.923 s |
| Sapphire Faceter | Clear glockenspiel, shimmering strings and flowing compound rhythm | 6/8, 150 eighth-note pulses/minute | 38.400 s |
| Pearl Loom | Gentle legato strings and flowing harp, without hard percussion | 3/4, 80 BPM | 45.000 s |
| Crown Foundry | Rounded brass, strings and restrained timpani for a festive royal room | 4/4, 90 BPM | 42.667 s |

The legacy IDs `jade-treasury` and `ruby-revel` identify Sapphire Faceter and Crown Foundry. The music follows their current artwork and world, rather than an unrelated jade or ruby setting.

## Award sequence

All four workshops have separately arranged BIG, SUPER, MEGA and EPIC scores. Each tier has an opening/counting section and an amount-resolution section. The palette follows its cabinet; higher tiers broaden the arrangement. Ordinary awards, click feedback, rolling, reel stops, coin collection and feature cues remain available.

`assets/scripts/vfx/AwardTiming.ts` is shared with the offline composer. Count periods are 3.1 / 4.0 / 4.7 / 5.3 seconds, followed by a 2.5-second hold and a 0.42-second exit. The resolution cue starts when the stage actually reveals the exact amount, including an early tap or reduced motion. Its 2.92-second ending covers the normal hold and exit. An early second tap fades both score voices over the actual visual exit, and restores the background music. Timing is not tied to a fixed ten-second sound file.

The counting and ending voices crossfade over 0.16 seconds. Background music ducks during an audible performance and returns as it closes. Both voices belong to the AudioManager, so mute, backgrounding, scene changes and destruction control them. Returning from the background resumes the still-active segment; muting and unmuting does not restart an award.

No award thresholds, rules, payout values, welcome bonuses, symbol frames, cabinet artwork or guardian geometry were changed in this music pass. The presentation continues to show an already-settled result without awarding it twice.

## Verification

- TypeScript checking passed; all 11 existing test groups passed.
- The Cocos web-mobile release build completed successfully.
- All 44 WAV assets loaded. Offline PCM checks found distinct files, valid lengths, no individual-file clipping, stereo score data and continuous loop boundaries. See [asset report](screenshots/f34-theme-score/audio-assets.json).
- Seven isolated runtime cases passed: four genuine seeded BIG rounds at 390 × 844, plus presentation fixtures for Coin SUPER, Sapphire MEGA and Crown EPIC at 320 × 568. They verified the actual managed WebAudio output, correct theme/tier selection, resolution switching, mute, hide/show, cleanup, wallet settlement and return to salon. Forced higher tiers exist only in temporary QA contexts. See [runtime report](screenshots/f34-theme-score/runtime-qa.json).
- The Pearl run captured one complete automatic BIG award with actual game audio and canvas frames sharing one MediaRecorder clock. It covers idle, spin, count, amount resolution, exit, cabinet restoration and salon music transition. See [recording](screenshots/f34-theme-score/motion/pearl-complete-with-audio.webm) and [timeline](screenshots/f34-theme-score/motion/pearl-complete-with-audio.json).
- Reduced motion at 320 × 568 passed: the guardian remained still; rotation completed; the full amount immediately selected the resolution music; actual audio was detected; award audio stopped after exit; a subsequent no-win round completed. See [report](screenshots/f34-theme-score/motion/reduced-check.json).
- Current cabinet and award captures were visually checked. [Cabinet comparison](screenshots/f34-theme-score/four-cabinets.png), [award comparison](screenshots/f34-theme-score/four-awards.png) and [recorded sequence](screenshots/f34-theme-score/motion/sequence.png) accompany the runtime results. Sequence stills check composition; they do not establish smoothness or subjective audio quality.

Browser checks do not verify iPhone/iPad speaker balance, native interruption handling, audio latency or real-device performance. Those remain separate device checks. No Git submission was requested in this pass.

## Reproduce

From the F34 project directory:

```sh
python3 art-source/compose_audio.py
npm run typecheck
npm test
```

Build with `tools/web-mobile-release-build.json`, then serve `build/web-mobile` on port 6035. The runtime and recording tools use `PLAYWRIGHT_PACKAGE` and optional `BROWSER_EXECUTABLE` for existing local installations:

```sh
node tools/cabinet-audio-runtime.cjs
node tools/cabinet-audio-record.cjs
```

The full generated asset inventory and timing are in `art-source/audio-manifest.json`.
