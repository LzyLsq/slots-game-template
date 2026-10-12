"""Original F33 instrumental score and machine foley; no external audio/samples.

Regenerate with Python 3 + NumPy. Eight related, separately arranged cues use
D-major/pentatonic harmony so the existing reward fanfares do not fight the BGM.
PCM32k mono limits mobile decode cost; cyclical tails and reflections preserve
loop continuity. Music is authored procedurally, not a recording or AI service.
"""
from pathlib import Path
import hashlib
import json
import uuid
import wave
import numpy as np
from warm_audio import MASTERING, warm_filter, spectral_metrics

SR = 32000
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/resources/audio'
RNG = np.random.default_rng(330930)
CHORDS = [(50, [62, 66, 69, 76]), (47, [59, 62, 66, 69]),
          (43, [59, 62, 67, 74]), (45, [61, 64, 69, 74])]
# Pauses and unequal note lengths let the melody breathe instead of playing
# unbroken eighth notes. Each cue has its own phrase, answering phrase and mood.
PROFILES = [
 ('welcome-foyer', 90, 16, 'flute', 'pluck', .42, .18, .08, [74,78,81,76,74,71,74,78], 'Warm lantern welcome; flute, soft plucked strings, low bells'),
 ('lantern-house-theme', 112, 16, 'marimba', 'pluck', .74, .53, .35, [74,78,81,83,81,78,76,74], 'Cheerful treasure hall; marimba, zither-like plucks, brushed hand percussion'),
 ('jade-ferry-flow', 104, 16, 'flute', 'pluck', .60, .32, .16, [74,76,78,81,78,76,71,74], 'Jade current; breathing flute, flowing broken chords, wooden pulse'),
 ('pearl-garden-bloom', 96, 16, 'celesta', 'harp', .58, .20, .09, [78,81,83,81,78,76,74,76], 'Pearl garden; rounded celesta, harp-like arpeggios and a soft string bed'),
 ('ember-foundry-groove', 118, 16, 'marimba', 'muted', .64, .60, .38, [62,66,69,74,69,66,64,62], 'Golden workshop; low marimba, muted strings, warm bass and dry wood percussion'),
 ('celestial-vault-ceremony', 102, 16, 'horn', 'harp', .60, .34, .20, [74,81,83,86,83,81,78,74], 'Dragon vault; rounded ceremonial brass, harp, bell accents and half-time drum'),
 ('treasury-interlude', 108, 16, 'celesta', 'pluck', .60, .34, .18, [81,78,74,76,78,81,83,81], 'Treasure shop and gifts; gold-bell melody, plucked answers and gentle rhythm'),
 ('ledger-interlude', 84, 12, 'flute', 'harp', .32, .10, .03, [74,71,69,71,74,76,78,74], 'Quiet ledger; slower flute, warm strings, sparse harp; no busy percussion'),
]
MANIFEST = {'date': '2026-10-08', 'provenance': 'Original deterministic procedural composition, no third-party audio or samples',
            'mastering': MASTERING, 'sampleRate': SR, 'format': '16-bit mono PCM WAV', 'tracks': [], 'foley': []}


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def tone(note, seconds, kind):
    n = max(16, round(seconds * SR))
    t = np.arange(n) / SR
    f = hz(note)
    vibrato = .0018 * np.sin(2*np.pi*4.4*t) * (1-np.exp(-t*5))
    phase = 2*np.pi*f*(t + vibrato/(2*np.pi*4.4))
    if kind in ('pluck', 'harp', 'muted'):
        softness = 1.25 if kind == 'harp' else .82 if kind == 'muted' else 1
        body = sum((.76/k**1.95)*np.sin(phase*k + .17*k)*np.exp(-t*(1.9+k*.65)/softness) for k in range(1, 9))
        env = (1-np.exp(-t*95)) * np.exp(-t/(seconds*.65))
    elif kind in ('marimba', 'celesta', 'bell'):
        ratios = (1, 2.003, 3.99, 5.91) if kind == 'marimba' else (1, 2.01, 2.99, 4.04)
        weights = (.82,.17,.045,.010) if kind == 'marimba' else (.80,.105,.038,.012)
        body = sum(v*np.sin(phase*r)*np.exp(-t*(.5+j*1.7)) for j,(r,v) in enumerate(zip(ratios,weights)))
        env = (1-np.exp(-t*72))*np.exp(-t/(seconds*.68))
    elif kind == 'flute':
        body = .86*np.sin(phase)+.075*np.sin(phase*2)+.018*np.sin(phase*3)
        breath = np.convolve(RNG.normal(size=n), np.ones(21)/21, mode='same')
        body += breath*.035
        env = (1-np.exp(-t*22)) * np.minimum(1, np.maximum(0,(seconds-t)/.16))
    elif kind == 'horn':
        body = .66*np.sin(phase)+.17*np.sin(phase*2)+.055*np.sin(phase*3)+.012*np.sin(phase*4)
        env = (1-np.exp(-t*11))*np.minimum(1,np.maximum(0,(seconds-t)/.24))
    elif kind == 'pad':
        body = .47*np.sin(phase)+.24*np.sin(phase*1.0011+.4)+.12*np.sin(phase*2)
        env = np.minimum(1,t/.32)*np.minimum(1,np.maximum(0,(seconds-t)/.6))
    else:  # rounded, non-clicking bass
        body = .84*np.sin(phase)+.10*np.sin(phase*2)
        env = (1-np.exp(-t*55))*np.exp(-t/(seconds*.9))
    # Every individual voice ends at zero; no chopped waveform at an edit point.
    fade = min(n//4, round(.025*SR))
    env[-fade:] *= np.linspace(1,0,fade)
    return body*env


def add(mix, start, sample, gain, cyclic=True):
    pos = round(start*SR)
    if cyclic:
        idx = (pos + np.arange(len(sample))) % len(mix)
        np.add.at(mix, idx, sample*gain)
    else:
        a=max(0,pos); b=min(len(mix),pos+len(sample))
        if b>a: mix[a:b] += sample[a-pos:b-pos]*gain


def percussion(kind, seconds=.12):
    t=np.arange(round(seconds*SR))/SR
    if kind == 'drum':
        return np.sin(2*np.pi*(76*t+16*(1-np.exp(-t*35))/35))*(1-np.exp(-t*260))*np.exp(-t*22)
    noise=np.convolve(RNG.normal(size=len(t)),np.ones(13)/13,mode='same')
    if kind == 'brush': return noise*np.exp(-t*44)*(1-np.exp(-t*400))
    return (.7*np.sin(2*np.pi*285*t)+.22*np.sin(2*np.pi*426*t)+noise*.3)*np.exp(-t*52)*(1-np.exp(-t*260))


def write(name,mix,loop,group,extra):
    mix = warm_filter(mix, SR, loop)
    peak=float(np.max(np.abs(mix)))
    mix *= .66 / max(peak,1e-9)
    if loop:
        # Two-millisecond boundary easing prevents a discontinuity without the
        # obvious long silence of fading the entire musical phrase at each loop.
        fade=64
        mix[:fade] *= np.linspace(0,1,fade)
        mix[-fade:] *= np.linspace(1,0,fade)
    else:
        mix[:64] *= np.linspace(0,1,64)
        fade=min(round(.04*SR),len(mix)//4)
        mix[-fade:] *= np.linspace(1,0,fade)
    path=OUT/f'{name}.wav'
    with wave.open(str(path),'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(SR)
        wav.writeframes(np.round(mix*32767).astype('<i2').tobytes())
    meta=Path(f'{path}.meta')
    if not meta.exists():
        meta.write_text(json.dumps({'ver':'1.0.0','importer':'audio-clip','imported':True,
          'uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,f'f33:audio:{name}')),
          'files':['.json','.wav'],'subMetas':{},'userData':{'downloadMode':0}},indent=2)+'\n')
    MANIFEST[group].append({'asset':name,'duration':len(mix)/SR,'bytes':path.stat().st_size,
      'peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),
      'loop':loop,'spectrum':spectral_metrics(mix, SR),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**extra})
    print(f'{name}: {len(mix)/SR:.2f}s, {path.stat().st_size//1024} KiB')


for name,bpm,bars,lead,accomp,energy,rhythm,brightness,melody,description in PROFILES:
    beat=60/bpm
    mix=np.zeros(round(bars*4*beat*SR))
    for bar in range(bars):
        bass,chord=CHORDS[bar%4]
        origin=bar*4*beat
        section=bar//4
        dynamics=[.76,1,.68,.9][section%4]
        # A warm harmonic bed, not a constant loud melody over every control.
        for pitch in chord[:3]: add(mix,origin,tone(pitch,beat*4.15,'pad'),.034*energy*dynamics)
        for offset in (0,2): add(mix,origin+offset*beat,tone(bass+(7 if offset else 0),beat*1.55,'bass'),.14*energy*dynamics)
        steps=8 if name not in ('welcome-foyer','ledger-interlude') else 4
        for step in range(steps):
            off=step*4/steps
            # Slight humanized swing, never random pitch or bad seam timing.
            swing=.028*beat if step%2 and name in ('lantern-house-theme','ember-foundry-groove','treasury-interlude') else 0
            pitch=chord[(step+bar)%4]+(12 if step%3 and chord[(step+bar)%4] < 70 else 0)
            add(mix,origin+off*beat+swing,tone(pitch,beat*.88,accomp),.095*energy*dynamics)
        # Melody phrases alternate an invitation, its answer, a quieter bridge,
        # and a decorated return. Half-beat rests stop the cue sounding frantic.
        notes=[(0,melody[(bar*2)%8],.8),(1.25,melody[(bar*2+1)%8],.65),
               (2.25,melody[(bar*2+3+section)%8],1.25)]
        if lead in ('flute','horn'): notes=[(0,melody[(bar+section)%8],1.6),(2.35,melody[(bar+3)%8],1.25)]
        if bar%4==3: notes=[(0,melody[(bar+1)%8],1.4),(2.1,74 if section%2 else 81,1.5)]
        for offset,pitch,length in notes:
            # Celesta stays in a rounded mid register; its melody/rhythm survive.
            if lead == 'celesta': pitch -= 12
            add(mix,origin+offset*beat,tone(pitch,beat*length,lead),.22*energy*dynamics)
        if section%2 and bar%2==0:
            add(mix,origin+3.45*beat,tone(chord[bar%4],beat*.9,'bell'),.06*brightness)
        if rhythm>.05:
            drum_beats=(0,2) if name!='celestial-vault-ceremony' else (0,)
            for off in drum_beats: add(mix,origin+off*beat,percussion('drum',.23),.11*rhythm*dynamics)
            for off in (1,3): add(mix,origin+off*beat,percussion('wood'),.13*rhythm*dynamics)
            for off in (.5,1.5,2.5,3.5): add(mix,origin+off*beat,percussion('brush'),.09*rhythm*dynamics)
    dry=mix.copy()
    for delay,gain in [(.043,.11),(.091,.09),(.173,.065),(.281,.038),(.417,.026)]:
        mix += np.roll(dry,round(delay*SR))*gain
    write(name,mix,True,'tracks',{'bpm':bpm,'bars':bars,'description':description})

# Restrained foley: soft rolling texture, a prepared five-note D-pentatonic
# settle sequence, and a one-second sparkle for an actual room feature reveal.
t=np.arange(SR)/SR
noise=np.convolve(RNG.normal(size=SR),np.ones(25)/25,mode='same')
roll=(noise*.48 + .12*np.sin(2*np.pi*96*t)+.05*np.sin(2*np.pi*192*t))*(.78+.22*np.sin(2*np.pi*8*t))
write('reel-silk-roll',roll,True,'foley',{'description':'Quiet reusable reel roll; no loud motor buzz'})
for i,note in enumerate([62,64,66,69,71]):
    mix=np.zeros(round(.27*SR))
    add(mix,0,tone(note,.25,'muted'),.72,False)
    add(mix,.009,percussion('wood',.10),.12,False)
    write(f'reel-stop-{i}',mix,False,'foley',{'note':note,'description':'Soft ascending settle tick'})
mix=np.zeros(round(1.22*SR))
for i,note in enumerate([74,78,81,86]): add(mix,i*.115,tone(note,.63,'harp'),.20,False)
write('feature-lantern-rise',mix,False,'foley',{'description':'Small rising treasure phrase at held/released feature, not a jackpot fanfare'})
(ROOT/'docs/audio-score-manifest.json').write_text(json.dumps(MANIFEST,ensure_ascii=False,indent=2)+'\n')
