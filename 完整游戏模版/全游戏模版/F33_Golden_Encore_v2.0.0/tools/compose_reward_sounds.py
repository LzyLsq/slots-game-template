"""Original F33 reward scores and coin foley, matching the house's D-pentatonic music.
Regenerate with Python 3 + NumPy; no external samples or licensed material.
Fanfare, particle, counter and confirmation layers are separately cancellable.
"""
from pathlib import Path
import wave
import numpy as np
from warm_audio import warm_filter

SR = 32000
OUT = Path(__file__).resolve().parents[1] / 'assets/resources/audio'
RNG = np.random.default_rng(330930)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def note(mix, start, pitch, decay=.2, gain=.12, timbre='mallet'):
    offset = round(start * SR)
    t = np.arange(len(mix) - offset) / SR
    if timbre == 'bell':
        partials = [(1, 1), (2.006, .12), (3.93, .03)]
    elif timbre == 'harp':
        partials = [(1, 1), (2, .16), (3, .045), (4, .014)]
    else:
        partials = [(1, 1), (2.003, .13), (3.01, .03)]
    body = sum(weight * np.sin(2 * np.pi * hz(pitch) * ratio * t) * np.exp(-t * (ratio - 1) * 3)
               for ratio, weight in partials)
    envelope = (1 - np.exp(-t * 85)) * np.exp(-t / decay)
    mix[offset:] += gain * body * envelope


def impact(mix, start, pitch=300, gain=.06):
    offset = round(start * SR)
    n = min(round(.11 * SR), len(mix) - offset)
    t = np.arange(n) / SR
    noise = np.convolve(RNG.normal(size=n), np.ones(17) / 17, mode='same')
    body = .45 * noise + np.sin(2 * np.pi * pitch * t) * .6
    mix[offset:offset+n] += gain * body * (1-np.exp(-t*420)) * np.exp(-t*60)


def finish(name, mix, room=True):
    if room:
        dry = mix.copy()
        for seconds, gain in [(.033, .085), (.071, .045)]:
            delay = round(seconds * SR)
            mix[delay:] += dry[:-delay] * gain
    mix = warm_filter(mix, SR)
    fade = min(round(.035 * SR), len(mix) // 5)
    mix[:80] *= np.linspace(0, 1, 80)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix = .72 * mix / max(.72, np.max(np.abs(mix)))
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(SR)
        audio.writeframes((mix * 32767).astype('<i2').tobytes())
    print(f'{name}: {len(mix)/SR:.3f}s, peak {np.max(np.abs(mix)):.3f}')


def fanfare(name, duration, phrase, scale):
    mix = np.zeros(round(duration * SR))
    # Sparkling ascending melody with a supporting harp answer and warm bass.
    for start, pitch in phrase:
        note(mix, start, pitch, .22, .19, 'mallet')
        note(mix, start + .04, pitch, .17, .038, 'bell')
    for i, pitch in enumerate([62, 66, 69, 74, 78, 81]):
        note(mix, .08 + i * .075, pitch, .27, .065, 'harp')
    for start in [0, duration * .4]:
        note(mix, start, 50, .32, .095)
        impact(mix, start, gain=.065)
    landing = phrase[-1][0]
    for pitch, gain in [(62, .08), (66, .085), (69, .085), (74, .12)]:
        note(mix, landing, pitch, .36 * scale, gain, 'harp')
    finish(name, mix)


fanfare('reward-win-ordinary', 1.72, [(0,74),(.17,78),(.34,81),(.54,86),(.79,81)], 1)
fanfare('reward-win-big', 2.68, [(0,69),(.15,74),(.3,78),(.45,81),(.7,86),(1.03,81),(1.24,86),(1.62,86)], 1.3)
fanfare('reward-win-super', 3.52, [(0,62),(.16,69),(.32,74),(.48,78),(.64,81),(.88,86),(1.14,86),(1.43,86),(1.67,81),(1.91,86),(2.25,86)], 1.65)

mix = np.zeros(round(.91 * SR))
impact(mix, 0, pitch=235, gain=.1)
for start, pitch in [(0,69),(.12,74),(.25,78),(.39,81)]:
    note(mix,start,pitch,.19,.17,'harp')
finish('reward-gift-open', mix)

# Bronze coin contact with rounded, sparse inharmonic overtones: texture, not a buzzer.
mix = np.zeros(round(.78 * SR))
for i in range(12):
    offset = round((.015 + i * .046 + RNG.uniform(0,.014)) * SR)
    t = np.arange(len(mix)-offset)/SR
    f = RNG.uniform(640,940)
    body = sum(weight*np.sin(2*np.pi*f*ratio*t) for ratio,weight in [(1,1),(1.73,.12),(2.47,.04)])
    mix[offset:] += (.038 + i % 3 * .009)*body*(1-np.exp(-t*180))*np.exp(-t/.031)
    impact(mix, offset/SR, pitch=RNG.uniform(330,520), gain=.028)
finish('reward-coin-shower',mix * 3.5,False)

mix = np.zeros(round(.072 * SR))
note(mix,0,74,.013,.21,'harp'); impact(mix,0,pitch=420,gain=.055)
finish('reward-counter',mix * 2.5,False)

mix = np.zeros(round(.54 * SR))
for start,pitch,gain in [(0,78,.13),(.035,81,.13),(.085,86,.17)]:
    note(mix,start,pitch,.12,gain,'bell')
finish('reward-count-complete',mix)

mix = np.zeros(round(.69 * SR))
for start,pitch in [(0,81),(.1,78),(.21,74)]:
    note(mix,start,pitch,.15,.19,'harp')
impact(mix,.21,pitch=285,gain=.045)
finish('reward-collect',mix)
