#!/usr/bin/env python3
"""Render the Lantern House score offline (not an in-game synthesizer).

Requires Python + numpy/scipy, clang, and MIT FluidR3_GM.sf2 outside the project.
  python3 tools/compose_sampled_audio.py --bank ~/.cache/f33-audio/FluidR3_GM.sf2
  python3 tools/compose_sampled_audio.py --rewards-only
Only the 66 final WAVs are packaged. Existing Cocos UUIDs are preserved.
Notes, rhythms, voicings and dynamics below are authored, not generated melodies.
"""
from __future__ import annotations
import argparse, ctypes as C, hashlib, json, pathlib, subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/resources/audio'
SR = 32000
BANK_SHA = '74594e8f4250680adf590507a306655a299935343583256f3b722c48a1bc1cb0'
VERSION = 'orchestral-awards-20261012'

class Sampler:
    def __init__(self, bank):
        if hashlib.sha256(bank.read_bytes()).hexdigest() != BANK_SHA:
            raise ValueError('Use the verified FluidR3 3.1 GM bank, not an unlicensed substitute.')
        vendor = ROOT / 'tools/vendor/tinysoundfont'
        # Native tools/artifacts remain outside the Creator project and the game.
        self.temp = tempfile.TemporaryDirectory(prefix='f33-offline-audio-')
        libpath = pathlib.Path(self.temp.name) / 'sampler.dylib'
        subprocess.run(['clang', '-O2', '-shared', '-fPIC', str(vendor/'render.c'), '-o', str(libpath), '-lm'], check=True)
        self.lib = C.CDLL(str(libpath))
        for name, args, result in [
            ('tsf_load_filename', [C.c_char_p], C.c_void_p),
            ('tsf_close', [C.c_void_p], None),
            ('tsf_copy', [C.c_void_p], C.c_void_p),
            ('tsf_set_output', [C.c_void_p,C.c_int,C.c_int,C.c_float],None),
            ('tsf_channel_sounds_off_all',[C.c_void_p,C.c_int],None),
            ('tsf_channel_set_bank_preset',[C.c_void_p,C.c_int,C.c_int,C.c_int],C.c_int),
            ('tsf_channel_set_pan',[C.c_void_p,C.c_int,C.c_float],C.c_int),
            ('tsf_channel_set_volume',[C.c_void_p,C.c_int,C.c_float],C.c_int),
            ('tsf_channel_note_on',[C.c_void_p,C.c_int,C.c_int,C.c_float],C.c_int),
            ('tsf_channel_note_off',[C.c_void_p,C.c_int,C.c_int],None),
            ('tsf_render_float',[C.c_void_p,C.POINTER(C.c_float),C.c_int,C.c_int],None),
            ('tsf_bank_get_presetname',[C.c_void_p,C.c_int,C.c_int],C.c_char_p),
        ]:
            f=getattr(self.lib,name);f.argtypes=args;f.restype=result
        self.f=self.lib.tsf_load_filename(str(bank).encode())
        if not self.f: raise RuntimeError('Soundfont failed to load')
        self.lib.tsf_set_output(self.f,0,SR,-9.0) # stereo interleaved, headroom at source

    def render(self, duration, parts, events):
        """events: seconds, channel, MIDI key, held seconds, velocity."""
        for ch in range(16): self.lib.tsf_channel_sounds_off_all(self.f,ch)
        for ch, (program,pan,gain,bank) in enumerate(parts):
            if not self.lib.tsf_channel_set_bank_preset(self.f,ch,bank,program):
                raise RuntimeError(f'Missing preset {bank}:{program}')
            self.lib.tsf_channel_set_pan(self.f,ch,pan)
            self.lib.tsf_channel_set_volume(self.f,ch,gain)
        actions=[]
        for at,ch,key,hold,vel in events:
            frame=max(0,int(round(at*SR)))
            actions.extend([(frame,1,ch,key,vel),(max(frame+1,int(round((at+hold)*SR))),0,ch,key,0)])
        actions.sort() # releases precede retriggers at the same frame
        frames=int(round(duration*SR)); out=np.zeros((frames,2),np.float32);pos=0
        for at,on,ch,key,vel in actions+[(frames,0,0,0,0)]:
            at=min(at,frames)
            if at>pos:
                self.lib.tsf_render_float(self.f,out[pos:].ctypes.data_as(C.POINTER(C.c_float)),at-pos,0);pos=at
            if pos>=frames:break
            if on:self.lib.tsf_channel_note_on(self.f,ch,key,vel)
            else:self.lib.tsf_channel_note_off(self.f,ch,key)
        return out.astype(np.float64)

    def render_isolated(self,duration,parts,events):
        # sounds_off_all uses a short release, NOT zero-time silence. A fresh
        # voice/channel context prevents the preceding score's release from
        # leaking into a new award, and makes full/selective awards identical.
        # The verified bank's samples are shared/ref-counted, not loaded again.
        parent=self.f;fresh=self.lib.tsf_copy(parent)
        if not fresh:raise RuntimeError('Could not isolate award renderer')
        self.f=fresh
        try:return self.render(duration,parts,events)
        finally:self.lib.tsf_close(fresh);self.f=parent

    def names(self, parts):
        return [self.lib.tsf_bank_get_presetname(self.f,p[3],p[0]).decode() for p in parts]
    def close(self):
        self.lib.tsf_close(self.f);self.temp.cleanup()

# A and B are independently written four-bar phrases. Resting last beats are
# deliberate: no wall of arpeggios. A', bridge and returning cadence make 16 bars.
# Each bar is (beat, semitone above the scene's tonic, held beats).
def bar(*notes): return list(notes)
L = lambda a,b,c: bar((.12,a,.7),(1.25,b,.6),(2.35,c,1.05))
Q = lambda a,b,c,d: bar((.08,a,.42),(.8,b,.42),(1.55,c,.72),(2.7,d,.95))
H = lambda a,b: bar((.12,a,1.25),(2.1,b,1.35))
R = lambda a,b,c: bar((.08,a,.55),(1.65,b,.58),(2.55,c,.64))

SCORES = [
 dict(asset='welcome-foyer',bpm=90,tonic=62,lead=24,answer=73,comp=46,bed=49,groove='soft',
      chords=[0,5,0,7,9,5,2,7,5,2,9,7,0,5,7,0],
      A=[H(4,2),L(0,2,4),R(7,4,2),H(2,0)], B=[L(9,7,4),Q(5,4,2,0),H(2,7),R(4,2,0)],
      description='Lantern welcome: nylon-string question, breathing flute answer, sparse harp and soft strings'),
 dict(asset='lantern-house-theme',bpm=112,tonic=67,lead=73,answer=12,comp=24,bed=45,groove='lilt',
      chords=[0,5,0,7,9,5,7,0,5,0,2,7,9,5,7,0],
      A=[Q(0,2,7,4),R(5,9,7),Q(4,2,0,2),H(7,4)], B=[Q(9,7,4,2),L(5,7,9),R(7,2,4),H(2,0)],
      description='Festive courtyard: nimble flute, marimba replies, nylon strings, pizzicato and hand percussion'),
 dict(asset='jade-ferry-flow',bpm=104,tonic=62,lead=73,answer=107,comp=46,bed=49,groove='water',
      chords=[0,9,5,7,0,5,2,7,9,5,0,7,5,2,7,0],
      A=[L(7,4,2),H(0,4),R(9,7,4),H(2,7)], B=[L(12,9,7),R(5,4,2),Q(0,2,4,7),H(4,0)],
      description='Jade Ferry: airy flute, low koto replies, flowing harp with gentle wooden accents'),
 dict(asset='pearl-garden-bloom',bpm=96,tonic=65,lead=46,answer=8,comp=24,bed=49,groove='garden',
      chords=[0,5,9,7,0,2,5,7,9,5,2,7,0,5,7,0],
      A=[Q(4,7,9,7),H(5,4),L(2,0,4),H(7,2)], B=[R(12,9,7),Q(9,7,5,4),H(2,5),L(4,2,0)],
      description='Pearl Garden: harp-led lilting phrase, low celesta answer, soft strings and nylon voicings'),
 dict(asset='ember-foundry-groove',bpm=118,tonic=60,lead=12,answer=28,comp=24,bed=45,groove='craft',
      chords=[0,9,5,7,0,5,2,7,5,2,9,7,0,9,7,0],
      A=[R(0,7,4),Q(9,7,4,2),R(5,9,7),H(2,0)], B=[Q(4,7,12,9),R(5,4,2),Q(7,9,7,4),H(2,0)],
      description='Ember Foundry: rounded marimba, muted guitar offbeats, pizzicato bass and tactile wood groove'),
 dict(asset='celestial-vault-ceremony',bpm=102,tonic=62,lead=60,answer=71,comp=107,bed=48,groove='ceremony',
      chords=[0,5,9,7,0,5,2,7,9,5,0,7,5,2,7,0],
      A=[H(0,7),R(9,7,4),H(2,9),L(7,4,2)], B=[L(12,11,9),H(7,4),R(5,2,7),H(4,0)],
      description='Celestial Vault: warm low horn, clarinet answers, restrained koto and string ceremony'),
 dict(asset='treasury-interlude',bpm=108,tonic=67,lead=24,answer=12,comp=46,bed=45,groove='lilt',
      chords=[0,2,5,7,9,5,7,0,5,9,2,7,0,5,7,0],
      A=[R(7,4,2),Q(0,2,4,7),H(9,7),L(4,2,0)], B=[Q(9,7,5,4),H(2,7),L(5,4,2),H(2,0)],
      description='Treasury: upbeat nylon melody, marimba response and light brushed wood; rewarding without casino sirens'),
 dict(asset='ledger-interlude',bpm=98,tonic=62,lead=24,answer=46,comp=4,bed=49,groove='quiet',
      chords=[0,5,9,7,0,5,2,7,5,9,2,7,0,5,7,0],
      A=[H(4,2),H(0,7),L(9,7,4),H(2,0)], B=[L(5,4,2),H(9,7),H(4,2),H(2,0)],
      description='Account and rankings: unhurried nylon, harp, felt-like electric piano and sparse low strings'),
]
# Major/minor voicings follow harmony rather than stacking every major chord.
VOICING = {0:[0,4,7],2:[2,5,9],5:[5,9,12],7:[7,11,14],9:[9,12,16]}

def make_score(s, sampler):
    beat=60/s['bpm']; length=16*4*beat; events=[];rng=np.random.default_rng(310+s['tonic']+s['bpm'])
    # lead/answer, plucked accompaniment, soft harmonic bed, acoustic bass,
    # sampled drums. Small physical placement, not fake L/R delay widening.
    parts=[(s['lead'],.47,.88,0),(s['answer'],.56,.65,0),(s['comp'],.30,.52,0),
           (s['bed'],.65,.20,0),(32,.50,.57,0),(0,.52,.36,128)]
    phrases=s['A'] + s['A'][:3]+[s['B'][3]] + s['B'] + s['A'][:3]+[H(2,0)]
    def note(at,ch,key,hold,velocity):
        # Bounded deterministic timing/velocity nuance, never pitch randomness.
        jitter=float(rng.uniform(-.009,.009));v=velocity*float(rng.uniform(.94,1.045))
        events.append((max(.008,at*beat+jitter),ch,key,hold*beat,min(.80,v)))
    for b in range(16):
        root=s['chords'][b];chord=VOICING[root];base=b*4
        # Phrase-level breathing: answers and cadences leave backing space.
        phrase_gain=[.90,.79,.97,.86][b//4]
        cadence=b%4==3
        for at,degree,hold in phrases[b]:
            channel=1 if 4<=b<8 or 10<=b<12 else 0
            note(base+at,channel,s['tonic']+degree,hold,(.58 if channel==0 else .49)*phrase_gain)
        note(base+.02,4,s['tonic']-24+root,1.55,.53 if s['groove']!='quiet' else .40)
        if s['groove'] not in ('quiet','soft'):
            note(base+2.04,4,s['tonic']-24+(root+7)%12,1.2,.40)
        backing=[.48,1.55,2.55] if s['groove'] in ('water','garden') else [.65,2.55]
        if cadence: backing=backing[:1]
        for i,at in enumerate(backing):
            note(base+at,2,s['tonic']-12+chord[i%3],.65,.42*phrase_gain)
            if s['groove'] in ('lilt','craft'):
                note(base+at+.02,2,s['tonic']-12+chord[(i+1)%3],.6,.27)
        # Resolve to the actual bar's harmony; the former 5.5-beat held bed
        # carried yesterday's chord across the next root. Give each bar air.
        for degree in chord: note(base+.10,3,s['tonic']-12+degree,2.65 if not cadence else 2.0,.30*phrase_gain)
        # Real sampled percussion at a conversational level, no synthetic hiss.
        if s['groove'] not in ('quiet','soft'):
            note(base+.05,5,36,.10,.29) # softly played kick
            for at in ([1.08] if cadence else [1.08,3.08]):note(base+at,5,76 if s['groove']=='craft' else 75,.09,.25*phrase_gain)
            if s['groove'] in ('lilt','garden'):note(base+2.73,5,64,.10,.18)
        elif b%2==1 and s['groove']=='soft':note(base+3.0,5,75,.1,.14)
    # Render three cycles, keep the settled middle cycle after room processing:
    # previous-bar sample releases are present at the seam, not cut off/reset.
    triple=[(at+c*length,ch,key,hold,vel) for c in range(3) for at,ch,key,hold,vel in events]
    raw=sampler.render(length*3,parts,triple)
    acoustic=room(raw,.15 if s['groove']!='quiet' else .12)
    n=round(length*SR);acoustic=acoustic[n:2*n]
    return master(acoustic,.64,True),dict(bpm=s['bpm'],bars=16,description=s['description'],instruments=sampler.names(parts),form='A / answering A / contrasting B / returning cadence',notesPerCycle=len(events),timingNuanceMs=9,phraseDynamics=[.90,.79,.97,.86],cadenceBacking='One pluck and shortened current-bar harmonic bed')

def room(x,amount=.13):
    # A short diffuse room, not a conspicuous rhythmic echo. Wet path is darker.
    n=round(.46*SR);ir=np.zeros(n);rng=np.random.default_rng(821)
    for delay,gain in [(.017,.42),(.031,.31),(.047,.22),(.067,.15),(.093,.11),(.132,.08),(.187,.055),(.273,.027)]:
        i=int(delay*SR);ir[i:i+11]+=gain*rng.uniform(.6,1.0,11)/11
    wet=np.stack([fftconvolve(x[:,ch],ir)[:len(x)] for ch in range(x.shape[1])],axis=1)
    wet=sosfilt(butter(2,3100,fs=SR,output='sos'),wet,axis=0)
    return x+amount*wet

def master(x,peak,loop=False):
    if x.ndim==1:x=x[:,None]
    x=x-np.mean(x,axis=0)
    x=sosfilt(butter(2,45,fs=SR,btype='highpass',output='sos'),x,axis=0)
    # Gentle upper roll-off retains acoustic attacks. The previous -8 dB shelf
    # applied twice flattened all instrument identities; deliberately not used.
    x=sosfilt(butter(2,5800 if loop else 4800,fs=SR,output='sos'),x,axis=0)
    x=np.tanh(x*1.25)/1.25  # soft peak shaping, never clipped/brickwalled
    edge=round((.002 if loop else .004)*SR)
    x[:edge]*=np.linspace(0,1,edge)[:,None]
    tail=edge if loop else min(round(.085*SR),len(x)//3)
    x[-tail:]*=np.linspace(1,0,tail)[:,None]
    m=np.max(np.abs(x))
    if m<1e-8:raise RuntimeError('Silent render')
    return x*(peak/m)

# Room-tier cues share a musical identity with that room, not a reused mascot
# or one identical fanfare transposed four times. Durations match visual cues.
REWARD_PHRASES=[
 [[(0,7,.23),(.23,9,.24),(.50,12,.55)],[(0,4,.24),(.27,7,.25),(.54,9,.24),(.88,12,.82)],[(0,0,.25),(.31,4,.24),(.62,7,.28),(.96,9,.27),(1.36,12,1.0)]],
 [[(0,4,.22),(.26,7,.25),(.55,12,.5)],[(0,7,.2),(.22,4,.23),(.50,9,.28),(.84,12,.9)],[(0,4,.24),(.29,7,.26),(.63,9,.25),(.98,7,.22),(1.36,12,1.05)]],
 [[(0,0,.20),(.24,7,.23),(.51,4,.50)],[(0,0,.22),(.26,7,.24),(.56,4,.25),(.87,12,.8)],[(0,0,.2),(.25,7,.23),(.55,4,.24),(.88,9,.28),(1.25,12,1.08)]],
 [[(0,7,.40),(.47,12,.55)],[(0,0,.38),(.46,7,.30),(.86,12,.88)],[(0,0,.42),(.49,7,.32),(.90,9,.26),(1.28,12,1.15)]],
]

# The score begins 260 ms into the original cabinet reveal. These relative
# musical anchors are checked against CabinetWinMotion by audio-choreography.
REWARD_SCORE_DELAY = .26
REWARD_DURATIONS = [1.72,6.50,8.35]

# Four written melodies, not one generic fanfare transposed or sped up.
# (asset time, semitone above room tonic, hold, lead/answer channel)
REWARD_STATEMENTS = [
 [(.94,4,.22,0),(1.23,7,.24,0),(1.58,9,.26,1),(1.96,12,.26,0),
  (2.40,9,.29,0),(2.77,5,.24,1),(3.10,9,.28,0),(3.47,12,.27,0)],
 [(.94,7,.19,0),(1.20,12,.22,0),(1.50,9,.26,1),(1.91,4,.25,0),
  (2.40,5,.19,0),(2.67,9,.21,0),(2.98,12,.27,1),(3.43,9,.28,0)],
 [(.91,0,.19,0),(1.19,7,.19,1),(1.53,4,.21,0),(1.87,12,.27,0),
  (2.38,5,.21,0),(2.75,12,.19,1),(3.05,9,.20,0),(3.42,5,.28,0)],
 [(.91,0,.36,0),(1.40,7,.30,0),(1.87,12,.28,1),
  (2.40,9,.42,0),(3.01,5,.28,1),(3.43,9,.29,0)],
]
# A contrasting string-led middle act and an independently scored brass encore.
# The encore starts on the second treasure act, not at the beginning of SUPER.
REWARD_BRIDGES = [
 [(3.91,9,.28),(4.25,12,.26),(4.58,16,.22),(5.05,12,.26),(5.38,9,.21)],
 [(3.92,16,.23),(4.21,12,.29),(4.57,9,.25),(5.04,5,.22),(5.34,12,.24)],
 [(3.91,9,.20),(4.20,16,.20),(4.51,12,.26),(5.01,9,.22),(5.36,5,.22)],
 [(3.92,12,.34),(4.38,16,.35),(5.01,9,.30),(5.42,5,.21)],
]
REWARD_ENCORES = [
 [(0,7,.16),(.20,11,.16),(.43,14,.21),(.72,11,.23)],
 [(0,11,.21),(.28,14,.17),(.53,7,.19),(.80,11,.17)],
 [(0,7,.15),(.23,14,.15),(.47,11,.18),(.77,7,.21)],
 [(0,7,.30),(.38,11,.26),(.75,14,.23)],
]


def ordinary_reward(sampler,mode,fallback):
    # Kept byte-for-byte musically equivalent: ordinary wins and all UI/coin
    # feedback retain the previous short, understated gesture.
    s=SCORES[mode+2];parts=[(s['lead'],.50,.78,0),(s['answer'],.50,.58,0),
        (s['comp'],.50,.45,0),(s['bed'],.50,.24,0),(0,.50,.22,128)]
    events=[]
    def add(at,ch,degree,hold,velocity):
        events.append((at,ch,s['tonic']+degree if parts[ch][3]!=128 else degree,hold,velocity))
    for at,d,hold in REWARD_PHRASES[mode][0]:add(.035+at,0,d,hold,.55)
    finale=REWARD_PHRASES[mode][0][-1][0]+.075
    for i,d in enumerate([0,4,7]):add(finale+.016*i,2,d,.56,.33)
    add(.016,4,64,.10,.19)
    if fallback:
        parts[0]=(24,.50,.74,0);parts[1]=(46,.50,.53,0)
        events=[(at,ch,key-2 if parts[ch][3]!=128 else key,hold,v*.96) for at,ch,key,hold,v in events]
    x=sampler.render(REWARD_DURATIONS[0],parts,events).mean(axis=1,keepdims=True)
    name='Fallback nylon' if fallback else s['asset']
    return master(room(x,.16),.50),dict(
        description=f"{name} ordinary: opening, room-specific response, short resolution",
        instruments=sampler.names(parts),source='Own arranged tier score rendered from licensed acoustic samples',
        anchors=dict(scoreDelay=REWARD_SCORE_DELAY),
        noteEvents=[dict(at=round(at,4),channel=ch,key=key,hold=round(hold,4),velocity=round(v,4)) for at,ch,key,hold,v in events])


def reward(sampler,mode,tier,fallback=False):
    if tier==0:return ordinary_reward(sampler,mode,fallback)
    s=SCORES[mode+2];duration=REWARD_DURATIONS[tier];super_win=tier==2
    # Offline orchestration folded into ONE owned score voice. Lower-register
    # horns and strings supply grandeur without a louder/shriller master.
    # channels: room quartet 0..3, drums 4, horn 5, strings 6, harp 7,
    # contrabass 8, tuned timpani 9, SUPER-only brass section 10.
    parts=[(s['lead'],.50,.73,0),(s['answer'],.50,.53,0),(s['comp'],.50,.36,0),
           (s['bed'],.50,.24,0),(0,.50,.20,128),(60,.50,.48,0),
           (48,.50,.36,0),(46,.50,.34,0),(43,.50,.38,0),(47,.50,.32,0)]
    if super_win:parts.append((61,.50,.24,0))
    events=[];counting=.98-REWARD_SCORE_DELAY
    finale=(5.58 if tier==1 else 7.38)-REWARD_SCORE_DELAY
    encore=6.18-REWARD_SCORE_DELAY if super_win else None
    def add(at,ch,degree,hold,velocity):
        # All pitched orchestral additions follow the room's key. Only bank
        # 128 is raw drum MIDI; channel-number heuristics would detune horns.
        key=s['tonic']+degree if parts[ch][3]!=128 else degree
        events.append((at,ch,key,hold,velocity))
    for at,d,hold in REWARD_PHRASES[mode][tier]:add(.035+at,0,d,min(hold,.30),.50)
    # Three-tone low brass salute, with room-specific rhythm/voice leading.
    opening=[[(.035,0,.16),(.25,4,.16),(.48,7,.23)],
             [(.035,7,.20),(.31,4,.17),(.54,0,.18)],
             [(.035,0,.18),(.29,7,.17),(.53,4,.19)],
             [(.035,0,.28),(.39,7,.30)]][mode]
    for at,d,hold in opening:
        add(at,5,d-12,hold,.46)
        if super_win:add(at+.018,10,d-5,min(hold,.24),.34)
    # Counter melody: primary room instrument and answer stay in the foreground.
    for i,(at,d,hold,ch) in enumerate(REWARD_STATEMENTS[mode]):
        add(at,ch,d,hold,.50+.025*(i%3))
        if i%3==1:add(at+.015,6,d-12,min(hold+.12,.40),.40)
    spans=[(.055,0,.54),(counting,0,1.48),(2.30,5,1.43)]
    spans += [(3.82,9,1.04),(4.97,5,.58),(5.64,7,1.30)] if super_win else [(3.82,2,.34),(4.23,7,.90)]
    # Broad harmonic movement, string swells, and changing low roots. Avoid
    # sustaining the previous harmony over the next chord boundary.
    for section,(at,root,hold) in enumerate(spans):
        chord=VOICING[root];v=.30+.025*section
        add(at,8,root-24,min(hold,.66),.52)
        for i,d in enumerate(chord):
            add(at+.022*i,3,d-12,max(.12,hold-.09),.29)
            add(at+.030*i,6,d-12,max(.15,hold-.14),min(.50,v+.045*i))
            add(at+.040*i,2,d-12,.32,.35)
        if hold>.8:
            # Alternating bowed/woodwind answer rather than a continuous pad.
            add(at+.64,5,chord[1]-12,.29,.43)
            add(at+.67,1,chord[2]-12,.27,.43)
            add(at+.72,8,chord[2]-24,.27,.38)
        # Short diatonic harp sweeps only at phrase changes; not a bell wash.
        order=[0,1,2,1] if mode in [0,2] else [2,1,0,1]
        for i,j in enumerate(order):add(at+.11+i*.095,7,chord[j],.24,.36+i*.018)
        add(at+.018,9,root-24,.14,.42 if section<2 else .46)
        add(at+.010,4,36,.10,.33) # cushioned bass drum
        if section>0:add(at+.035,4,49,.13,.15 if section<3 else .19)
    if super_win:
        for i,(at,d,hold) in enumerate(REWARD_BRIDGES[mode]):
            add(at,6,d-12,hold,.53)
            add(at+.018,1,d,hold*.72,.43)
        for i,(rel,d,hold) in enumerate(REWARD_ENCORES[mode]):
            at=encore+rel
            add(at,5,d-12,hold,.57)
            add(at+.018,10,d-5,hold,.48)
            add(at+.026,0,d,.16,.47)
        # An answered dominant fanfare and a real percussion roll lead the
        # second act to its cadence. This is not the BIG cue played faster.
        for i in range(6):add(finale-.54+i*.075,9,7-24,.075,.26+i*.045)
        for i,d in enumerate([7,11,14,19]):add(encore+.08+i*.11,7,d,.23,.39+i*.025)
    else:
        # A shorter woodwind/string response leaves BIG a complete identity.
        cadence=[[2,5,9,7],[9,5,2,7],[5,2,9,7],[9,5,2,7]][mode]
        for i,d in enumerate(cadence):add(3.85+i*.09,1,d,.14,.45)
        for i,d in enumerate([7,11,14]):add(4.28+i*.24,5,d-12,.18,.48+i*.04)
        for i in range(3):add(finale-.30+i*.09,9,7-24,.08,.31+i*.055)
    # Final scale pickup answers the dominant; it does not resolve early.
    for i,d in enumerate([7,11,14]):add(finale-.50+i*.145,1,d,.13,.49+i*.025)
    add(finale,0,12,.55,.64) # exact displayed-final-amount lead anchor
    for i,d in enumerate([0,4,7]):
        add(finale+.015*i,2,d,.62,.39)
        add(finale+.019*i,3,d-12,.68,.34)
        add(finale+.022*i,5,d-12,.58,.53)
        add(finale+.025*i,6,d,.70,.49)
        if super_win:add(finale+.018*i,10,d-12,.60,.49)
    add(finale,8,-24,.74,.58);add(finale+.010,9,-24,.22,.55)
    add(finale+.012,4,36,.10,.42);add(finale+.028,4,49,.16,.24)
    for i,d in enumerate([0,4,7,12]):add(finale+.03+i*.075,7,d,.40,.44-i*.025)
    if fallback:
        parts[0]=(24,.50,.69,0);parts[1]=(46,.50,.49,0)
        events=[(at,ch,key-2 if parts[ch][3]!=128 else key,hold,v*.96) for at,ch,key,hold,v in events]
    x=sampler.render_isolated(duration,parts,events).mean(axis=1,keepdims=True)
    name='Fallback nylon' if fallback else s['asset']
    return master(room(x,.16),.54 if super_win else .50),dict(
        description=f"{name} {'SUPER' if super_win else 'BIG'}: warm brass salute, room-led call/answer, strings and harp, {'contrasting bridge and independent brass encore, ' if super_win else ''}orchestral tonic finale",
        instruments=sampler.names(parts),source='Own arranged tier score rendered from licensed acoustic samples',
        arrangementVersion=VERSION,
        orchestration=dict(roomChannels=[0,1,2,3],drums=4,horn=5,strings=6,harp=7,bass=8,timpani=9,encoreBrass=10 if super_win else None),
        form=['salute','room-call-and-answer','contrasting-string-bridge','independent-brass-encore','tonic-finale'] if super_win else ['salute','room-call-and-answer','dominant-response','tonic-finale'],
        harmonicSections=[dict(at=round(at,4),root=root,hold=hold) for at,root,hold in spans]+[dict(at=round(finale,4),root=0,hold=.74)],
        anchors=dict(scoreDelay=REWARD_SCORE_DELAY,counting=counting,finale=finale,encore=encore),
        noteEvents=[dict(at=round(at,4),channel=ch,key=key,hold=round(hold,4),velocity=round(v,4)) for at,ch,key,hold,v in events])

# Material foley: nonpitched/resonant components are shaped and softened; pitched
# UI accents are sampled nylon/harp/marimba, not oscillator-only alert beeps.
def contact(duration,kind,seed):
    rng=np.random.default_rng(seed);t=np.arange(round(duration*SR))/SR;n=len(t)
    noise=rng.standard_normal(n)
    if kind=='coin':
        texture=sosfilt(butter(2,[650,3400],fs=SR,btype='bandpass',output='sos'),noise)*np.exp(-t/.010)*.13
        modes=sum(a*np.sin(2*np.pi*f*t+ph)*np.exp(-t/tau) for f,a,tau,ph in [(1230,.31,.031,0),(1763,.15,.019,.3),(2510,.04,.014,1)])
    elif kind=='wood':
        texture=sosfilt(butter(2,2100,fs=SR,output='sos'),noise)*np.exp(-t/.008)*.17
        modes=.38*np.sin(2*np.pi*245*t)*np.exp(-t/.021)+.15*np.sin(2*np.pi*510*t)*np.exp(-t/.012)
    elif kind=='bronze':
        texture=sosfilt(butter(2,[220,1800],fs=SR,btype='bandpass',output='sos'),noise)*np.exp(-t/.019)*.10
        modes=.32*np.sin(2*np.pi*382*t)*np.exp(-t/.044)+.16*np.sin(2*np.pi*827*t)*np.exp(-t/.027)
    elif kind=='porcelain':
        texture=sosfilt(butter(2,[430,2200],fs=SR,btype='bandpass',output='sos'),noise)*np.exp(-t/.008)*.09
        modes=.23*np.sin(2*np.pi*916*t)*np.exp(-t/.038)+.12*np.sin(2*np.pi*1472*t)*np.exp(-t/.024)
    else:
        texture=sosfilt(butter(2,[180,1500],fs=SR,btype='bandpass',output='sos'),noise)*np.exp(-t/.025)*.12
        modes=.28*np.sin(2*np.pi*460*t)*np.exp(-t/.041)
    x=(texture+modes)*(1-np.exp(-t/.0012));x[-min(n,640):]*=np.linspace(1,0,min(n,640))
    return x

def cues(sampler):
    records=[]
    def emit(name,duration,events,description,peak=.42,material=None,program=24,loop=False):
        parts=[(program,.50,.70,0),(46,.50,.43,0),(0,.50,.29,128)]
        x=sampler.render(duration,parts,events).mean(axis=1)
        if material is not None:x+=material
        if loop:
            y=master(x,peak,True)
        else:y=master(room(x[:,None],.10),peak)
        records.append((name,y,dict(description=description,source='Own sampled gesture with authored material contact' if events else 'Own shaped material contact; deliberately no fixed musical key',instruments=sampler.names(parts) if events else ['Authored material contact'],loop=loop)))
    emit('ui-jade-tap',.125,[],'Cushioned wood/jade touch without a melody fighting the current scene',.31,contact(.125,'wood',1)*.40+contact(.125,'jade',11)*.16)
    emit('ui-gold-step',.170,[],'Soft gold detent with a felt-backed wooden body, no fixed-key beep',.34,contact(.17,'coin',2)*.25+contact(.17,'wood',12)*.22)
    def touches(duration, events):
        x=np.zeros(round(duration*SR))
        for at,kind,gain,seed in events:
            start=round(at*SR);c=contact(duration-at,kind,seed);x[start:start+len(c)]+=c*gain
        return x
    emit('ui-gold-step-down',.185,[],'Lower felt-backed gold detent; distinct from increasing the stake',.31,touches(.185,[(0,'wood',.28,300),(.036,'coin',.12,301)]))
    emit('ui-room-settle',.260,[],'Lacquer card settles into its golden socket after a completed swipe',.33,touches(.26,[(0,'jade',.22,302),(.062,'wood',.29,303)]))
    emit('ui-room-enter',.310,[],'Soft latch followed by a small gold release, only for an accepted room entry',.36,touches(.31,[(0,'wood',.26,304),(.073,'coin',.20,305),(.133,'jade',.09,306)]))
    emit('ui-soft-limit',.145,[],'One cushioned low contact for a rejected action; no error alarm or success sparkle',.22,contact(.145,'wood',307)*.27)
    emit('ui-spin-launch',.240,[],'Jade Ferry debit accepted: lacquer latch and jade release; no pitched pickup',.35,touches(.24,[(0,'wood',.25,3),(.049,'jade',.17,308)]))
    emit('reward-gift-open',.910,[(.13,0,62,.22,.43),(.28,1,69,.26,.37),(.43,1,74,.3,.35)],'Soft box lid followed by an airy harp unfurl',.46,contact(.91,'wood',4)*.11)
    # Unequal contacts and decaying density avoid eight identical metal pings.
    d=.78;x=np.zeros(round(d*SR))
    for i,(at,gain) in enumerate([(0,.38),(.064,.28),(.137,.36),(.234,.22),(.361,.24),(.508,.17),(.614,.09)]):
        c=contact(d-at,'coin',41+i);n=min(len(c),len(x)-round(at*SR));x[round(at*SR):round(at*SR)+n]+=c[:n]*gain
    emit('reward-coin-shower',d,[],'Irregular small gold contacts with a soft falling finish',.26,x)
    emit('reward-counter',.072,[],'Very quiet felt-backed count tick, no repeating bell',.16,contact(.072,'wood',81)*.23)
    d=.54;settled=np.zeros(round(d*SR))
    for i,(at,gain) in enumerate([(0,.34),(.078,.20),(.185,.13)]):
        c=contact(d-at,'coin',120+i);n=min(len(c),len(settled)-round(at*SR));settled[round(at*SR):round(at*SR)+n]+=c[:n]*gain
    emit('reward-count-complete',d,[],'Soft gold settles on felt; harmony is supplied by the actual room finale',.42,settled)
    d=.69;received=contact(d,'wood',130)*.22
    for i,(at,gain) in enumerate([(.045,.35),(.142,.23),(.292,.12)]):
        c=contact(d-at,'coin',131+i);n=min(len(c),len(received)-round(at*SR));received[round(at*SR):round(at*SR)+n]+=c[:n]*gain
    emit('reward-collect',d,[],'Gold received with a soft pouch/wood contact; no foreign-key melody after the room cadence',.44,received)
    # A continuous, low-level band-limited mechanism; 640 ms is NOT two thuds.
    n=round(.64*SR);rng=np.random.default_rng(823);noise=rng.standard_normal(n)
    roll=sosfilt(butter(2,[95,850],fs=SR,btype='bandpass',output='sos'),noise)
    t=np.arange(n)/SR;roll*=.03*(.85+.15*np.cos(2*np.pi*t/.64))
    emit('reel-silk-roll',.64,[],'Continuous soft cabinet roller, seamless low air/wood texture',.20,roll,loop=True)
    for i in range(5):
        emit(f'reel-stop-{i}',.19,[],'Distinct cushioned cabinet catch, no ascending fixed-key electronic scale',.30,contact(.19,'wood',90+i)*(.22+i*.012)+contact(.19,'jade',190+i)*(.08-i*.008))
    emit('feature-lantern-rise',1.20,[(.07+i*.145,1,key,.24,.38-i*.015) for i,key in enumerate([62,66,69,71,74])],'Breathing harp pickup for a genuine feature reveal',.44)
    # Each room owns its mechanism, catch and feature pickup, not a transposed sound set.
    # Tiny pre-rendered mono cues; no runtime synthesis or uncontrolled audio nodes.
    rooms=[(1,'porcelain',310,95,1150,.72),(2,'wood',360,110,760,.56),(3,'bronze',410,75,620,.84)]
    for mode,material,seed,low,high,duration in rooms:
        emit(f'cabinet-{mode}-launch',.26,[],f'Room {mode}: accepted debit, {material} latch with a muted gold release',.35,
             touches(.26,[(0,material,.28,seed),(.055,'coin',.12,seed+1)]))
        n=round(duration*SR);t=np.arange(n)/SR;rng=np.random.default_rng(seed+2)
        mechanism=sosfilt(butter(2,[low,high],fs=SR,btype='bandpass',output='sos'),rng.standard_normal(n))
        mechanism*=.025*(.90+.10*np.cos(2*np.pi*t/duration))
        emit(f'cabinet-{mode}-roll',duration,[],f'Room {mode}: continuous {material} mechanism, low level and seamless',.18,mechanism,loop=True)
        for column in range(5):
            d=.19+mode*.009
            emit(f'cabinet-{mode}-stop-{column}',d,[],f'Room {mode}: cushioned {material} catch {column+1}, no fixed-key scale',.28,
                 touches(d,[(0,material,.24+column*.012,seed+10+column),(.025+column*.004,'wood',.11,seed+20+column)]))
        patterns={1:[(0,65,.19),(.22,69,.24),(.55,72,.35)],2:[(0,60,.17),(.19,67,.15),(.43,64,.30)],3:[(0,62,.29),(.37,69,.37),(.78,74,.31)]}
        program={1:46,2:12,3:71}[mode]
        emit(f'cabinet-{mode}-feature',1.24,[(.05+at,0,key,held,.38) for at,key,held in patterns[mode]],
             f'Room {mode}: own feature pickup in the room tonic, matching its instrument family',.43,
             contact(1.24,material,seed+30)*.08,program=program)
    return records

def metrics(x,loop):
    if x.ndim==1:x=x[:,None]
    mono=x.mean(axis=1);peak=float(np.max(np.abs(x)));rms=float(np.sqrt(np.mean(x*x)))
    block=4096;energies=np.zeros(block//2+1)
    for at in np.linspace(0,max(0,len(x)-block),min(24,max(1,len(x)//block)),dtype=int):
        z=mono[at:at+block];z=np.pad(z,(0,block-len(z)))
        energies+=np.abs(np.fft.rfft(z*np.hanning(block)))**2
    freq=np.fft.rfftfreq(block,1/SR);total=float(energies.sum())
    corr=float(np.corrcoef(x.T)[0,1]) if x.shape[1]==2 else 1.0
    return dict(peak=peak,rms=rms,crestDb=float(20*np.log10(peak/max(rms,1e-9))),
                spectrum=dict(above1800=float(energies[freq>=1800].sum()/total),above3000=float(energies[freq>=3000].sum()/total),above6000=float(energies[freq>=6000].sum()/total),centroid=float((energies*freq).sum()/total)),
                dc=float(np.max(np.abs(x.mean(axis=0)))),monoRetention=float(np.sqrt(np.mean(mono*mono))/rms),stereoCorrelation=corr,
                seamDelta=float(np.max(np.abs(x[0]-x[-1]))) if loop else None,
                maxAdjacentDelta=float(np.max(np.abs(np.diff(x,axis=0)))))

def write_asset(name,x,info):
    if x.ndim==1:x=x[:,None]
    pcm=np.round(np.clip(x,-1,1)*32767).astype('<i2')
    path=OUT/f'{name}.wav'
    meta=OUT/f'{name}.wav.meta'
    if not meta.exists():
        # New sound identities only; never overwrite an existing resource UUID.
        import uuid
        template=json.loads((OUT/'ui-jade-tap.wav.meta').read_text())
        template['uuid']=str(uuid.uuid4());meta.write_text(json.dumps(template,indent=2)+'\n')
    with wave.open(str(path),'wb') as w:
        w.setnchannels(x.shape[1]);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    measured=pcm.astype(float)/32768
    record=dict(asset=name,channels=x.shape[1],duration=len(pcm)/SR,bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),**info,**metrics(measured,info.get('loop',False)))
    print(f"{name:28} {record['duration']:6.3f}s {record['channels']}ch peak {record['peak']:.2f} RMS {record['rms']:.3f} >3k {record['spectrum']['above3000']:.3f}",flush=True)
    return record

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bank',type=pathlib.Path,default=pathlib.Path.home()/'.cache/f33-audio/FluidR3_GM.sf2')
    parser.add_argument('--rewards-only',action='store_true',help='Render only BIG/SUPER; verify and retain the other 56 PCM records')
    args=parser.parse_args();manifest_path=ROOT/'docs/audio-score-manifest.json'
    # Refuse to merge a stale/missing manifest. Every preserved asset hash must
    # match the current file before the sampler or any output is modified.
    if args.rewards_only:
        old=json.loads(manifest_path.read_text())
        for row in old['tracks']+old['foley']:
            if hashlib.sha256((OUT/f"{row['asset']}.wav").read_bytes()).hexdigest()!=row['sha256']:
                raise ValueError(f"Stale PCM manifest: {row['asset']}; perform a full render")
    sampler=Sampler(args.bank)
    try:
        if args.rewards_only:
            tracks=old['tracks'];foley=old['foley'];replacements={}
            for mode in range(4):
                for tier in [1,2]:
                    x,info=reward(sampler,mode,tier)
                    name=f"reward-{mode}-{['ordinary','big','super'][tier]}"
                    replacements[name]=write_asset(name,x,dict(loop=False,**info))
            for tier in [1,2]:
                x,info=reward(sampler,0,tier,True);name=f"reward-win-{['ordinary','big','super'][tier]}"
                replacements[name]=write_asset(name,x,dict(loop=False,**info))
            foley=[replacements.get(row['asset'],row) for row in foley]
            mastering=old['mastering'] # EQ/master curves are unchanged.
        else:
            tracks=[];foley=[]
            for score in SCORES:
                x,info=make_score(score,sampler);tracks.append(write_asset(score['asset'],x,dict(loop=True,**info)))
            for mode in range(4):
                for tier in range(3):
                    x,info=reward(sampler,mode,tier);foley.append(write_asset(f"reward-{mode}-{['ordinary','big','super'][tier]}",x,dict(loop=False,**info)))
            for tier in range(3):
                x,info=reward(sampler,0,tier,True);foley.append(write_asset(f"reward-win-{['ordinary','big','super'][tier]}",x,dict(loop=False,**info)))
            for name,x,info in cues(sampler):foley.append(write_asset(name,x,info))
            mastering=dict(version='material-feedback-20261012',method='Gentle 45 Hz high-pass / 5.8 kHz music or 4.8 kHz cues low-pass; retained sampled articulation, short diffuse room, soft peak shaping, 2 ms loop seam envelope',musicPeak=.64)
        assert len(tracks)==8 and len(foley)==58
        report=dict(date='2026-10-12',soundDesign=VERSION,provenance='Original authored arrangements rendered offline with MIT FluidR3 sampled instruments; own material foley. No third-party music or demo MIDI.',mastering=mastering,sampleRate=SR,format='16-bit PCM WAV; stereo BGM, mono short cues',sources='docs/licenses/audio-sources.json',tracks=tracks,foley=foley)
        manifest_path.write_text(json.dumps(report,indent=2)+'\n')
        (ROOT/'docs/audio-acoustic-regression.json').write_text(json.dumps(dict(date=report['date'],version=VERSION,scope='Measured signal, format and composition provenance; not a listening certification',items=tracks+foley,runtimeBytes=sum(r['bytes'] for r in tracks+foley)),indent=2)+'\n')
    finally:sampler.close()

if __name__=='__main__':main()
