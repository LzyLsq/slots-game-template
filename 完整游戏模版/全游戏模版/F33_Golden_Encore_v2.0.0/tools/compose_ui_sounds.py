"""Compose short, quiet interaction sounds for the Lantern House (original audio).

Three related timbres: a wood/jade tap, a small gilded coin and a rounded
launch chime. No externally sampled material. Regenerate with Python + NumPy.
"""
from pathlib import Path
import wave
import numpy as np
from warm_audio import warm_filter

SR = 32000
OUT = Path(__file__).resolve().parents[1] / 'assets/resources/audio'
RNG = np.random.default_rng(3307)


def write(name, duration, voices, noise_level=0.0):
    n = int(duration * SR)
    t = np.arange(n) / SR
    samples = np.zeros(n, dtype=np.float64)
    for start, frequency, length, gain, partials in voices:
        offset = int(start * SR)
        local = t[:n - offset]
        attack = 1 - np.exp(-local * 145)
        envelope = attack * np.exp(-local / length)
        tone = sum(weight * np.sin(2 * np.pi * frequency * ratio * local)
                   for ratio, weight in partials)
        samples[offset:] += gain * envelope * tone
    if noise_level:
        dust = RNG.normal(size=n)
        # Restrict the impact transient to a warm, diffuse tap rather than hiss.
        dust = np.convolve(dust, np.ones(11) / 11, mode='same')
        samples += noise_level * dust * np.exp(-t * 100)
    fade = min(240, n // 5)
    samples[-fade:] *= np.linspace(1, 0, fade)
    samples = warm_filter(np.tanh(samples * 1.1), SR)
    samples[:64] *= np.linspace(0, 1, 64)
    samples[-fade:] *= np.linspace(1, 0, fade)
    # Leave digital headroom for background music and simultaneous visuals.
    peak = max(1, np.max(np.abs(samples)) / .47)
    pcm = (samples / peak * 32767).astype('<i2')
    path = OUT / f'{name}.wav'
    with wave.open(str(path), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(SR)
        audio.writeframes(pcm.tobytes())
    print(f'{path.name}: {duration * 1000:.0f} ms, {path.stat().st_size} bytes')


JADE = [(1, 1), (2.02, .14), (3.01, .045)]
GOLD = [(1, 1), (2.005, .17), (3.91, .035)]
write('ui-jade-tap', .125, [(0, 560, .026, .29, JADE), (.016, 780, .031, .16, JADE)], .095)
write('ui-gold-step', .170, [(0, 620, .044, .28, GOLD), (.025, 930, .055, .19, GOLD)], .06)
write('ui-spin-launch', .240, [(0, 520, .065, .28, GOLD), (.048, 780, .068, .23, JADE), (.092, 1040, .059, .16, GOLD)], .06)
