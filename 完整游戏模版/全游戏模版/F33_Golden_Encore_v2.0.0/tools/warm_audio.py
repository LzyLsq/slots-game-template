"""Shared, offline warmth pass for the F33 original score and short sound cues.

NumPy only. A broad, smooth treble shelf preserves melodic detail while a
four-pole magnitude roll-off removes brittle upper partials. Periodic music is
filtered as a loop; one-shots get zero padding, never wrapping their tails.
This is timbre shaping, not loudness normalisation or an audibility guarantee.
"""
import numpy as np

MASTERING = {
    'version': 'warm-20261008',
    'trebleShelfHz': 1500,
    'trebleShelfDb': -8,
    'lowPassHzMusic': 3200,
    'lowPassHzEffects': 3400,
    'method': 'smooth zero-phase spectral shelf and four-pole low-pass magnitude; softened source attacks',
}


def warm_filter(samples, sample_rate=32000, loop=False):
    padding = 0 if loop else 4096
    signal = np.pad(samples, (padding, padding)) if padding else samples
    frequencies = np.fft.rfftfreq(len(signal), 1 / sample_rate)
    shelf = 1 / (1 + (frequencies / MASTERING['trebleShelfHz']) ** 4)
    floor = 10 ** (MASTERING['trebleShelfDb'] / 20)
    shelf = floor + (1 - floor) * shelf
    cutoff = MASTERING['lowPassHzMusic' if loop else 'lowPassHzEffects']
    response = shelf / np.sqrt(1 + (frequencies / cutoff) ** 8)
    filtered = np.fft.irfft(np.fft.rfft(signal) * response, n=len(signal))
    return filtered[padding:-padding] if padding else filtered


def spectral_metrics(samples, sample_rate=32000):
    frequencies = np.fft.rfftfreq(len(samples), 1 / sample_rate)
    energy = np.abs(np.fft.rfft(samples)) ** 2
    total = max(float(energy.sum()), 1e-20)
    return {
        'above1800': float(energy[frequencies >= 1800].sum() / total),
        'above3000': float(energy[frequencies >= 3000].sum() / total),
        'centroid': float((energy * frequencies).sum() / total),
    }
