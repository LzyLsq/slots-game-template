"""Original small synthesized interface sounds; no external samples."""
from pathlib import Path
import math, struct, wave

destination = Path(__file__).resolve().parents[1] / 'assets/resources/audio'
destination.mkdir(parents=True, exist_ok=True)
rate = 44100
phrases = {
    'press': [(620, .07), (820, .06)],
    'launch': [(330, .09), (440, .09), (660, .12)],
    'stop': [(510, .055), (1020, .07)],
    'win': [(523.25, .12), (659.25, .12), (783.99, .12), (1046.5, .32)],
    'collect': [(659.25, .10), (783.99, .10), (1046.5, .24)],
}
for name, notes in phrases.items():
    samples = []
    for frequency, duration in notes:
        for i in range(int(duration * rate)):
            t = i / rate
            envelope = min(1, t / .004) * max(0, 1-t/duration)**2
            value = (math.sin(math.tau * frequency * t) + .17*math.sin(math.tau*frequency*2*t)) * envelope * .26
            samples.append(struct.pack('<h', int(value*32767)))
    with wave.open(str(destination / (name+'.wav')), 'wb') as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(rate); out.writeframes(b''.join(samples))

# Original 16-beat, seamlessly looped marimba/bass motif (no sampled recording).
beat = .48
melody = [76,79,83,79,74,78,81,78,72,76,79,76,74,78,81,78]
samples = []
for i in range(int(rate * beat * 16)):
    t = i / rate
    step = int(t / beat)
    local = t % beat
    freq = 440 * 2 ** ((melody[step] - 69) / 12)
    env = min(1, local/.009) * math.exp(-local*9)
    bass = 440 * 2 ** (([48,50,48,55][step//4] - 69) / 12)
    value = .18 * env * (math.sin(math.tau*freq*local)+.22*math.sin(math.tau*freq*2*local))
    value += .10 * math.sin(math.tau*bass*local) * min(1,local/.02) * math.exp(-local*8)
    samples.append(struct.pack('<h', int(value*32767)))
with wave.open(str(destination / 'marina.wav'), 'wb') as out:
    out.setnchannels(1); out.setsampwidth(2); out.setframerate(rate); out.writeframes(b''.join(samples))
