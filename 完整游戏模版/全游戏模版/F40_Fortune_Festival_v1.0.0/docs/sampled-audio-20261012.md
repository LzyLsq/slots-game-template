# F40 sampled soundtrack — 2026-10-12

> Historical v2 audio evidence. The v3 arrangements, final export and current checks are recorded in [the award/music refinement](award-music-polish-20261012.md). Retain this report for the earlier implementation and sample-source disclosure.

F40 now has five scene arrangements and matching interaction/award cues. The arrangement follows the user's requested cheerful festival and wealth atmosphere, with softer upper frequencies. This changes sound and audio ownership; the existing cabinet art, award staging and settlement rules are preserved. No production-game recordings or melodies were extracted.

## Scene arrangements

| Scene | Key / tempo | Main voice | Arrangement |
|---|---|---|---|
| Festival salon | G major / 108 BPM | Piano | Light festival groove and alternating flute response |
| Golden Phoenix | D major / 112 BPM | Horn | Brass lead, plucked accompaniment and a piano response |
| Jade Dragon | F major / 106 BPM | Flute | Airy lead over strings and plucked accompaniment |
| Pearl Qilin | G major / 104 BPM | Vibraphone | Rounded melodic attack, harp response and strings |
| Amber Panda | C major / 116 BPM | Clarinet | Playful lead with plucked accompaniment and percussion |

Each background track has 24 bars: A, a contrasting eight-bar response, and a varied A reprise. Loops are approximately 49–55 seconds. The musical direction is implemented; its suitability and listening comfort still need audible review.

## Feedback and award timing

- Lacquered button contact: short muted wood/plucked cue, with immediate-tap rate limiting.
- Spin: a short low-register start gesture plus a quiet managed reel mechanism loop.
- Reel stops: six scene-specific, ascending pentatonic notes; the actual column index selects the sound. Additional feature landings receive their own matching cue.
- Ordinary win, coin collection and feature: distinct phrases in the active scene's key.
- Large awards: four counting arrangements and four corresponding reveal phrases per cabinet. Visible tier upgrades use a short accent rather than layering another complete fanfare.
- Exact amount reveal and early collection resolve the counting score. The exit fades the score with the visual transition; background music returns gradually.

There are **90 final WAV clips**, 32 kHz, 16-bit stereo, approximately 51.3 MiB. Six clips loop: five background tracks and the reel mechanism. The final PCM audit found no clipped samples and a maximum absolute peak below 0.70.

The mix uses a 0.42 background source level. Spinning targets 76% of that level; an audible award targets 16%. Background ducking falls quickly and recovers more slowly. These are source gains, not calibrated device loudness. The mastering recipe softens the presence and upper-frequency bands; this is not a substitute for listening on headphones and phone speakers.

## Audio ownership and recovery

`AudioManager` owns eleven AudioSources: two for scene crossfades, six bounded feedback voices, one reel loop, one counting score and one reveal score. Steady state retains one active background loop. All voices are stoppable by mute, scene exit and engine background events; detached `playOneShot` players are not used.

A currently playing award source resumes its position after engine hide/show. An already ended score does not restart on foreground. Music/effect settings persist through refresh. The resource enumerator uses `Array.from(Set)` because this Creator ES5 export otherwise treated Set spread as a single entry and loaded no audio resources.

## Sources and reproducibility

The arrangements are original local MIDI event scores rendered with **GeneralUser GS 2.0.3** sampled instruments using FluidSynth 2.6.1. They are not live performances or wholly self-recorded samples. The source record retains the library revision, checksum, renderer and author license disclosure. The library license notes incomplete provenance for some constituent samples; final product rights clearance remains separate from this local render.

- [Final audio manifest and mastering measurements](audio-provenance.json)
- [Sample source record](../art-source/audio-sample-source.json)
- [Retained sample-library license](../art-source/GeneralUser-GS-LICENSE.txt)
- [Original event score](../art-source/festival-score.json)
- [Arrangement/render entry point](../art-source/compose_audio.py)
- [Sampled instrument renderer](../art-source/sampled_renderer.py)

The SoundFont is in ignored source storage, not copied into the deliverable as an additional dependency. To regenerate on the current Mac, with that source file present:

```sh
F40_FLUID_LIBRARY=/tmp/f40-audio-renderer/fluid-synth/2.6.1/lib/libfluidsynth.3.6.1.dylib /tmp/f36-image-api-env/bin/python -u art-source/compose_audio.py
```

Keep the event score, source record and license with any redistributed render. Rendering again requires local disk space and the stated Python/FluidSynth environment.

## Verification and build condition

- [Final PCM signal audit](qa/audio-20261012/signal-audit.json): all 90 files, format, non-silence, duration, peak, clipping, hashes and six loop boundaries.
- [Runtime audio audit](qa/audio-20261012/runtime-audit.json): **27 checks passed**, all four cabinets, **four charged and settled debug-EPIC touch rounds**, no browser errors. Checks cover decoded clips, source ownership, per-column cues, counting/reveal, early collect, cleanup, mute persistence, crossfades and engine hide/show. The report retains actual requests, accepted cues, landing callbacks and ledger entries.
- Source TypeScript checking and four win-presentation contract checks passed after the audio integration. No settlement rule or award timing constant was changed.

The latest Creator export encountered **ENOSPC** while copying 72 native resources after script/configuration export. Those resources were restored byte-for-byte from the imported library using independent APFS clones. All **222** exported image/audio files were checked against their imported counterparts; all 90 exported WAV files also match the final source WAVs. This is a recovered local preview, **not a clean CLI build exit**. The [builder log](qa/audio-build-final-20261012.log) and [export recovery/hash audit](qa/audio-20261012/build-export-audit.json) are retained. A clean rebuild with adequate free disk space remains required for release.

The runtime harness operates private desktop Chromium contexts. Forced EPIC rounds still charge and settle exactly once, but do not test production probability. Direct ordinary-win/reward/feature calls are audio routing fixtures. Engine hide/show is a lifecycle fixture, not a physical iOS background or interruption test. Cocos may re-enter AudioSource.play after asynchronous preparation; accepted manager cues and actual landing callbacks are counted separately from source play requests.

Browser source state and PCM checks establish resource/routing behavior, not subjective sound quality, actual output volume, iPhone/iPad performance or native interruption handling. Headphone and phone-speaker listening remains unverified. This task does not complete signing, StoreKit, deployed services or App Store review.

Preview version: `f40-sampled-audio-20261012`, port `6040`.

Current preview screenshot（本地历史媒体：`qa/audio-20261012/preview-home.png`） shows the loaded hall for the new soundtrack version; it does not demonstrate audio quality.
