# Fortune Lantern House — acoustic score, orchestral awards & material feedback (2026-10-12)

## Direction

Light, festive, welcoming treasure-house music, not shrill electronic casino
alerts. The replacement score uses **authored notes and arrangements rendered
from sampled instruments**. This is not an AI music-generation download or a
claim that a live orchestra was recorded. No third-party song/demo MIDI is used.

| Scene | Musical identity |
|---|---|
| Login / opening | Nylon-string question, flute answer, sparse harp, soft strings |
| Hall | G-major flute, marimba replies, pizzicato, nylon and light hand percussion |
| Jade Ferry | D-major flute, low koto response, flowing harp, wooden accents |
| Pearl Garden | F-major harp lead, low celesta answer, nylon and soft strings |
| Ember Foundry | C-major marimba, muted guitar offbeats, pizzicato, wood groove |
| Celestial Vault | Warm low horn, clarinet replies, koto and restrained strings |
| Shop / gifts / atlas | Nimble nylon melody, marimba reply, sparse harp |
| Account / rankings / ledger | Quiet nylon, harp answer and a soft keyboard/string bed |

Each loop is 16 bars: A, answering variation, contrasting B, returning cadence.
Four phrase levels (.90, .79, .97, .86), lighter fourth-bar backing, deliberate
pauses and a maximum 9 ms timing nuance give the phrases space. The string bed
now follows the current bar rather than sustaining an old chord across the next
root. Account/ranking/ledger music is 98 BPM rather than 112 BPM. Four rooms ×
three award tiers retain separate authored gestures tied to their instruments.
Home/gift fallback cues retain their own nylon arrangement, not identical copies.

## Music and visual staging

This pass keeps the existing generated artwork, cabinet layout and original
in-cabinet motion. It does not add a full-screen illustration or pretend that
retiming music is a new mascot animation. The score supports the original reveal,
counting, coin waves and final amount while the cabinet and reel nodes stay put.

| Tier | Delivered score length | Alignment to original cabinet staging |
|---|---:|---|
| Ordinary | 1.72 s | Compact return gesture; ordinary award presentation retained |
| BIG | 6.50 s | Score begins at .26 s; counting at .98 s; resolves at 5.58 s |
| SUPER | 8.35 s | Same entry/counting; independent encore at 6.18 s; resolves at 7.38 s |

### Luxury award music edition: `orchestral-awards-20261012`

This edition changes the **music**, not the visual staging, award probability,
wallet, stake or save data. It replaces only the eight room BIG/SUPER scores
and two nylon fallback BIG/SUPER scores. All eight background loops, ordinary
wins and the other interaction/coin/counting cues retain their previous PCM.

BIG is a composed miniature celebration: a low warm-horn salute, the room's
lead-and-answer melody, broad strings, a diatonic harp flourish, a changing
contrabass root, tuned timpani and a rounded orchestral cadence. The harmony
travels I → IV → ii → V → I. It has **10 sampled parts**, not just a faster or
louder version of the old short cue. The master peaks remain **.50 BIG / .54
SUPER**, and the runtime award source gains remain **.53 / .56**.

SUPER has its own opening statement, a contrasting vi string/woodwind bridge,
a return through IV to V, and an independently written brass response on the
second act at 6.18 seconds. The added eleventh part is a restrained low brass
section; a tuned timpani roll, harp pickup and fuller tonic cadence resolve on
the displayed final amount at 7.38 seconds. It does not loop the BIG cue, repeat
its fanfare at higher speed, or use a siren/high-pitched bell wash. String beds
release before the next chord boundary; final phrases have their full tail.

| Room | Foreground award identity | Distinctive response |
|---|---|---|
| Jade Ferry | Flute / koto | Flowing ascending question, harp/string reply |
| Pearl Garden | Harp / low celesta | Falling ornamental answer, gentle rising brass return |
| Ember Foundry | Marimba / muted guitar | Short syncopated calls, low rhythmic brass answer |
| Celestial Vault | Horn / clarinet / koto | Broad ceremonial phrase and held brass response |

Each room has a separately authored salutation, middle statement and SUPER
encore, not a shared phrase transposed four times. The quartet retains the
existing room key. Orchestral parts and tuned timpani follow that key; only
bank-128 drums use untransposed raw drum MIDI. All instrumentation is rendered
offline from the licensed sampled bank into **one existing owned score voice**.
No extra runtime instruments, unbounded one-shots or voice pools are added.

Manifest anchors are asset-relative; production still adds the .26-second
reveal delay. Tests check actual PCM in the opening, counting/answer, encore
and cadence, written instrument roles and harmonic movement, four distinct
opening/encore signatures, the unchanged peak limits, routing/cancellation and
all previous warmth/spectrum/dynamics/mono/package constraints. These are
composition and signal checks, **not a subjective listening certification**.

## Interaction and mix

- A neutral tap is a rounded jade/wood contact. Accepted bet-up and bet-down
  use different gold-detent cues; bounds/busy/insufficient balance use a quieter
  soft-limit contact, never a success flourish.
- Hall arrows and completed swipes share a room-settle cue. Accepted direct
  entry has a separate short door/hardware release. Cancelled drags are silent.
- Four cabinet identities: Jade lacquer/jade, Pearl porcelain,
  Ember cushioned wood, Dragon warm bronze. Each has its own launch, rolling
  loop, five actual settle catches and instrument-aligned feature response.
- Launch is a neutral material release, not the former fixed-key harp pickup.
  It occurs only after stake reservation and persistence. Held Pearl re-spins
  have no second debit/launch. STOP remains a neutral touch.
- Rolling is low continuous cabinet air/material movement; stop catches duck
  the rolling voice. Reduced-motion simultaneous settles emit one soft catch.
- Gold shower is unequal, decaying material contacts, never one sound per
  particle. Duplicate waves under 800 ms are rejected for the 780 ms cue.
- Counting has felt-backed ticks with a 170 ms limiter. Completion replaces
  stale ticks; collection has a soft pouch/wood and settling-gold response.
- Fixed owned pools: 2 contact, 3 machine, 4 reward and 2 music voices. No
  detached/unbounded one-shots. Missing optional clips never block gameplay.
- Room rewards retain their own authored instrument identities. The new
  orchestral arrangements replace BIG/SUPER music without inventing another
  award screen, mascot or a shared generic fanfare across all four themes.
- Scene music waits for the next half-beat (at most 334 ms) without delaying UI,
  then fades incoming over .95 s and outgoing over .40 s. Same-scene visits do
  not restart; stale pending transitions cancel during rapid changes/loading.
- Awards lower BGM to 40% in .20 s; collection recovers it gently in .55 s.
- Contact levels: tap .26, bet-up .29, bet-down .27, settle .28, entry .32,
  blocked .18. Machine launch/feature .30, roll .13, stops .25.
  Scene levels .17–.23; awards .36/.53/.56, gold .28, counting .13,
  finish .35 and collection .40. These are source gains, not SPL measurements.
- Account has a localized AUDIO SETTINGS scroll with legacy master,
  independent BGM/effects toggles and Done. Old saves keep master mute;
  absent new preferences default on. Changes persist without resetting
  gameplay/progress. Gesture unlock and app-background silence still apply.
- Enabling sound never replays past clicks/awards. Cancelling a presentation or
  leaving a scene stops owned tails. Material contacts are authored offline
  synthesis, not a claim of new field recordings or AI-generated music.

## Delivery and reproduction

Current assets: **8 stereo music loops + 58 mono cues**, 32 kHz 16-bit PCM WAV.
There is no synthesizer, SoundFont or native renderer in the runtime build.
Existing audio UUIDs are unchanged. The PCM package is about **42.570 MiB (44 MiB regression ceiling)**;
stereo costs more than the superseded mono bank. Only welcome/hall are initially
loaded; other scene music is lazy and cannot block first playable artwork.

Final music peaks are .64 (-3.9 dBFS), with RMS .085–.115. Gentle 45 Hz high-pass
and 5.8 kHz upper roll-off retain acoustic articulation; the old repeated -8 dB
shelf/low-pass is removed. Effects use 4.8 kHz upper roll-off. A short dark room
adds depth without a conspicuous echo. Soft peak shaping avoids hard clipping.
Music is rendered across three cycles and the middle cycle is retained, with a
2 ms seam envelope. Stereo keeps a centred lead and compatible mono downmix.
These measurements are **not a loudspeaker listening/perceptual certification**.

Re-render using Python with numpy/scipy and clang:

```sh
python3 tools/compose_sampled_audio.py --bank "$HOME/.cache/f33-audio/FluidR3_GM.sf2"
# Bounded award-only replacement; validates every existing PCM hash first:
python3 tools/compose_sampled_audio.py --rewards-only
```

The external cache contains the verified FluidR3 GM bank. Source/license hashes
are in `docs/licenses/audio-sources.json`; MIT notices accompany both the bank
and the vendored build-only TinySoundFont header. The bank is not in this
repository or the exported game. Historical procedural composer scripts and
`audio-warmth-regression.json` describe the **superseded** score; use the current
sampled composer and `audio-acoustic-regression.json` for this edition.

`tools/audio-choreography-test.ts` checks all eight BIG/SUPER room scores
against the production counter/encore/finale, written orchestral roles, four
distinct salutes/encores, actual PCM phrase presence, retained peak limits,
complete shower intervals and the neutral-key material contacts. The new award scores use
isolated offline voice contexts so a preceding tune cannot leak its release
into the next award; fresh/full and selective award renders have identical
PCM. The established mastering edition remains material-feedback.
The arrangement edition and the EQ/master edition are recorded separately.

`npm test` measures hashes/PCM/channel count/headroom/dynamics/DC/high bands,
mono compatibility, seam envelopes, eight composition identities and size
budget. It also retains routing, voice ownership, counter boundaries,
missing-resource, rapid-switch, mute, hide and wallet regression tests.
`debug=1&audioQA=1` publishes read-only DOM evidence of the owned Cocos playback
sources; this is not a command API and is absent in normal previews.

## 2026-10-12 verification and limits

- Both TypeScript checks and the complete regression suite passed; emitted
  lifetime-plan checks passed against the final web build.
- All 66 final source WAV files match their emitted Creator/native WAV SHA256.
- Current guarded 390×844 Jade BIG/Dragon SUPER snapshots verify separate room
  music/reward routing, bounded owned voices, quiet hold and collection recovery.
  Dragon score was observed playing at 5.032 s; Jade mid-score was not sampled
  in this pass. The preceding acoustic QA includes fuller award timelines.
- Account sound controls checked at 390×844 and 320×568, including all five
  languages at 320. Independent BGM/effects/master routing, final restored flags,
  hall arrow/swipe settle and bet-direction contacts have runtime evidence in
  `audio-feedback-runtime-regression-20261012.json`.
- Guarded previews preserved balance 311,828 and 120 spins; final account also
  retains 340,922 total won. No normal paid spin, AUTO, purchase, persisted daily
  claim, save reset/storage injection or probability edit was made.
- Browser playback state and PCM measurements are not a subjective listening
  approval. Phone speakers/headphones and real-device performance still need
  listening/device acceptance.
- Creator produced a finished runnable web build, but its process still exited
  36 with the existing native IPC teardown diagnostic. This is not a clean
  release/native/App Store build certification. Final web output completed
  2026-10-12 10:29:56 +08:00; sampled browser warn/error log is empty.
- Temporary verification tab closed and viewport reset; original user tab kept.
  No external Chrome opened.

Current score version: `material-feedback-20261012`. Supporting manifests and
runtime evidence are listed in the material-feedback section of `QUALITY_AUDIT.md`.

The preceding acoustic-score QA refers to its 38-asset bank and remains historical
evidence only. Current source/emitted hashes, settings captures and runtime state
are `audio-feedback-*` artifacts; asset counts and mix above describe this bank.
