"""F34 original festive stereo score: rounded swing, piano, brass and coin chimes.
No external recordings or samples. NumPy is only used by this authoring tool.
Musical tails wrap around complete phrases; existing Cocos UUIDs are preserved.
"""
from pathlib import Path
import json, uuid, wave, re
import numpy as np

DEST = Path(__file__).resolve().parents[1] / 'assets' / 'resources' / 'audio'
DEST.mkdir(parents=True, exist_ok=True)
RATE = 32000
RNG = np.random.default_rng(340930)
REPORT = []

def buffer(seconds): return np.zeros((round(seconds * RATE), 2), dtype=np.float64)
def midi(note): return 440 * 2 ** ((note - 69) / 12)
def add(track, sound, start, pan=0, loop=False):
    pos = round(start * RATE)
    gains = np.array([np.sqrt((1-pan)/2), np.sqrt((1+pan)/2)])
    stereo = sound[:, None] * gains
    if loop:
        np.add.at(track, (np.arange(len(sound))+pos) % len(track), stereo)
    else:
        count = min(len(sound), len(track)-pos)
        if pos >= 0 and count > 0: track[pos:pos+count] += stereo[:count]

def voice(track, note, start, length, volume, kind='celesta', pan=0, loop=False):
    t = np.arange(round(length*RATE))/RATE
    hz = midi(note)
    release = np.minimum(1, np.maximum(0, length-t)/min(.09, length*.3))
    if kind in ('strings', 'horn', 'trumpet', 'flute'):
        weights = {'strings':[1,.40,.17,.10,.05], 'horn':[1,.51,.20,.080,.032],
                   'trumpet':[1,.52,.24,.105,.052,.025,.012], 'flute':[1,.18,.04]}[kind]
        tone = np.zeros_like(t)
        for detune, phase_offset in ((-.0014,.2),(0,.8),(.0011,1.7)):
            phase = 2*np.pi*hz*(1+detune)*t + .024*np.sin(2*np.pi*5.1*t+phase_offset)
            for harmonic, weight in enumerate(weights,1):
                if hz*(1+detune)*harmonic >= RATE*.45: continue
                brightness = np.exp(-t*max(0,harmonic-2)*(.85 if kind=='trumpet' else .30))
                tone += weight*np.sin(phase*harmonic+phase_offset)*brightness*.13
        attack = {'strings':.10, 'horn':.035, 'trumpet':.022, 'flute':.045}[kind]
        env = np.minimum(1,t/attack)*release
        env *= .9+.1*np.exp(-t*4)
    elif kind in ('piano', 'harp', 'pizz', 'guitar'):
        tone = np.zeros_like(t)
        is_piano = kind=='piano'
        for harmonic in range(1,17 if is_piano else 12):
            stiffness = .000045 if is_piano else .000025
            partial_hz = hz*harmonic*np.sqrt(1+stiffness*harmonic**2)
            if partial_hz*1.0015 >= RATE*.45: continue
            phase = 2*np.pi*partial_hz*t
            decay = (.75+harmonic*.15) if is_piano else (1.45+harmonic*.35)
            tone += .68/harmonic**(1.45 if is_piano else 1.7)*np.sin(phase+.03*harmonic)*np.exp(-t*decay)
            if is_piano: tone += .17/harmonic**1.5*np.sin(phase*1.0015+.12)*np.exp(-t*decay*1.2)
        env = np.minimum(1,t/.008)*release
        if kind=='pizz': env *= np.exp(-t*4)
    elif kind in ('bass', 'timpani'):
        tone = .72*np.sin(2*np.pi*hz*t)+.20*np.sin(4*np.pi*hz*t)*np.exp(-t*3)+.07*np.sin(6*np.pi*hz*t)*np.exp(-t*6)
        if kind=='timpani': tone += .15*np.sin(2*np.pi*hz*1.47*t)*np.exp(-t*8)
        env = np.minimum(1,t/.009)*np.exp(-2.4*t/max(.1,length))*release
    elif kind=='wood':
        tone = .6*np.sin(2*np.pi*hz*t)*np.exp(-t*23)+.2*np.sin(2*np.pi*hz*2.76*t)*np.exp(-t*34)
        env = np.minimum(1,t/.004)*release
    else:
        upper = .042 if kind=='celesta' else .075 if kind=='vibes' else .10
        tone = .71*np.sin(2*np.pi*hz*t)
        for ratio, weight, decay in ((3.99,upper,6),(9.98,.009,12)):
            if hz*ratio < RATE*.45: tone += weight*np.sin(2*np.pi*hz*ratio*t)*np.exp(-t*decay)
        env = np.minimum(1,t/.010)*np.exp((-2.2 if kind=='celesta' else -1.65)*t/max(.2,length))*release
    add(track,volume*tone*env,start,pan,loop)

def percussion(track, start, kind='snare', volume=.05, loop=False):
    length = {'kick':.19,'snare':.14,'hat':.075,'tambourine':.17,'cymbal':.55,'brush':.14}[kind]
    t = np.arange(round(length*RATE))/RATE
    noise = RNG.normal(0,1,len(t))
    soft = np.convolve(noise,np.ones(7)/7,mode='same')
    if kind=='kick':
        tone = np.sin(2*np.pi*(49*t+.72*(1-np.exp(-t*35))))*np.exp(-t*22)+soft*.09*np.exp(-t*50)
    elif kind=='snare':
        tone = (.56*soft+.20*np.sin(2*np.pi*181*t))*np.exp(-t*23)
    elif kind in ('tambourine','cymbal'):
        tone = .33*soft
        for hz in (1241,1717,2393,3161): tone += .065*np.sin(2*np.pi*hz*t+RNG.uniform(0,6))*np.exp(-t*12)
        tone *= np.exp(-t*(13 if kind=='tambourine' else 6))
    elif kind=='hat':
        tone = .26*(noise-np.convolve(noise,np.ones(3)/3,mode='same'))*np.exp(-t*52)
    else: tone = soft*np.exp(-t*29)
    add(track,tone*np.minimum(1,t/.005)*volume,start,.24 if kind in ('hat','tambourine') else -.12,loop)

def harmony(track,chord,start,length,volume=.06,kind='piano',loop=True):
    for i,note in enumerate(chord): voice(track,note,start+i*.006,length,volume,kind,(i-1.5)*.22,loop)
def sequence(track,notes,start,step,length,volume,kind,loop=True):
    for i,note in enumerate(notes): voice(track,note,start+i*step,length,volume*(1-.05*(i%3)),kind,(-.28 if i%2 else .28),loop)
def swing(pulse,amount):
    whole=int(pulse)
    return whole+(amount if pulse-whole==.5 else pulse-whole)

# Broad, smooth mastering curves retain bass and rhythmic definition. Offline
# processing applies on every Cocos platform, without another WebAudio graph.
# Periodic loops stay periodic; non-loops are padded so the ending cannot wrap
# into the opening. This changes timbre, not musical timing or theme melody.
MASTERING = {
    'revision':'rounded-festive-20261008',
    'highShelfHz':2600, 'highShelfDb':-4.5,
    'presenceHz':2300, 'presenceDb':-1.5, 'presenceLogWidth':.50,
    'airRolloffHz':8500, 'saturationDrive':1.06,
}

def soften_spectrum(track,loop):
    pad=0 if loop else round(RATE*.15)
    signal=np.pad(track,((pad,pad),(0,0))) if pad else track
    hz=np.fft.rfftfreq(len(signal),1/RATE)
    shelf=(hz/MASTERING['highShelfHz'])**4
    db=MASTERING['highShelfDb']*shelf/(1+shelf)
    log_hz=np.log(np.maximum(hz,1)/MASTERING['presenceHz'])
    db+=MASTERING['presenceDb']*np.exp(-.5*(log_hz/MASTERING['presenceLogWidth'])**2)
    db-=10*np.log10(1+(hz/MASTERING['airRolloffHz'])**8)
    gain=10**(db/20)
    result=np.fft.irfft(np.fft.rfft(signal,axis=0)*gain[:,None],n=len(signal),axis=0)
    return result[pad:pad+len(track)] if pad else result

def output(name,track,loop=False,peak=.60):
    # Short room reflections preserve attack and stereo detail; no long wash.
    dry=track.copy()
    for seconds,amount in ((.037,.075),(.079,.055),(.151,.032),(.241,.018)):
        offset=round(seconds*RATE);echo=np.roll(dry[:,::-1],offset,axis=0)*amount
        if not loop: echo[:offset]=0
        track+=echo
    maximum=float(np.max(np.abs(track)))
    if maximum: track/=maximum
    track=np.tanh(track*MASTERING['saturationDrive'])
    track=soften_spectrum(track,loop)
    track*=peak/max(.001,float(np.max(np.abs(track))))
    if loop:
        count=64;delta=track[-1]-track[0]
        track[:count]+=delta*(.5+.5*np.cos(np.linspace(0,np.pi,count)))[:,None]
    else:
        fade=min(round(RATE*.065),len(track)//8)
        track[:64]*=np.linspace(0,1,64)[:,None]
        track[-fade:]*=np.linspace(1,0,fade)[:,None]
    samples=np.round(np.clip(track,-.99,.99)*32767).astype('<i2')
    with wave.open(str(DEST/f'{name}.wav'),'wb') as file:
        file.setnchannels(2);file.setsampwidth(2);file.setframerate(RATE);file.writeframes(samples.tobytes())
    meta=DEST/f'{name}.wav.meta'
    if not meta.exists(): meta.write_text(json.dumps({'ver':'1.0.0','importer':'audio-clip','imported':True,'uuid':str(uuid.uuid4()),'files':['.json','.wav'],'subMetas':{},'userData':{'downloadMode':0}},indent=2)+'\n')
    REPORT.append({'name':name,'duration':round(len(track)/RATE,3),'channels':2,'sampleRate':RATE,'loop':loop,'peak':round(float(np.max(np.abs(track))),4),'rms':round(float(np.sqrt(np.mean(track*track))),4),'seamDelta':round(float(np.max(np.abs(track[-1]-track[0]))),6),'bytes':(DEST/f'{name}.wav').stat().st_size})
    print(name,REPORT[-1]['duration'],'sec',flush=True)

# All five settings are lively major-key celebrations, each with distinct
# melody, groove and lead. Stable resource IDs retain existing save mappings.
THEMES={
 'salon':{'name':'Aurum Atelier salon','bpm':116,'meter':'4/4','lead':'trumpet','style':'festive casino big-band swing','root':60,'swing':.63,'comp':'piano'},
 'golden-hour':{'name':'Coin Engraver','bpm':124,'meter':'4/4','lead':'celesta','style':'coin-jingle shuffle with piano and brass answers','root':55,'swing':.66,'comp':'piano'},
 'jade-treasury':{'name':'Sapphire Faceter','bpm':118,'meter':'4/4','lead':'vibes','style':'bright jewel Latin swing with guitar and mallets','root':62,'swing':.54,'comp':'guitar'},
 'pearl-palace':{'name':'Pearl Loom','bpm':114,'meter':'4/4','lead':'piano','style':'buoyant pearl gala swing with harp and strings','root':65,'swing':.60,'comp':'pizz'},
 'ruby-revel':{'name':'Crown Foundry','bpm':126,'meter':'4/4','lead':'horn','style':'royal jackpot brass parade with festive backbeat','root':58,'swing':.58,'comp':'piano'},
}
MELODIES={
 'salon':[(0,7),(.5,9),(1,12),(2,9),(2.5,7),(3.5,4)],
 'golden-hour':[(0,12),(.5,7),(1.5,9),(2,12),(2.5,16),(3.5,14)],
 'jade-treasury':[(0,7),(.5,12),(1.5,16),(2.5,14),(3,12)],
 'pearl-palace':[(0,12),(1,16),(1.5,19),(2,16),(3,14),(3.5,12)],
 'ruby-revel':[(0,7),(.5,7),(1,12),(2,16),(2.5,14),(3,12)],
}
for theme,info in THEMES.items():
    root=info['root'];beat=60/info['bpm'];track=buffer(16*4*beat)
    # I6 - VI minor7 - IV6 - V7; upbeat main-theme phrases return to the tonic.
    chords=[[root,root+4,root+7,root+9],[root-3,root,root+4,root+7],
            [root+5,root+9,root+12,root+14],[root+7,root+11,root+14,root+17]]
    for bar in range(16):
        base=bar*4*beat;chord_index=(bar//2)%4;c=chords[chord_index];section=bar//4
        # A walking bass and offbeat accompaniment establish an obvious pulse.
        walk=[c[0]-12,c[1]-12,c[2]-12,c[0]-10]
        for pulse,note in enumerate(walk):
            voice(track,note,base+pulse*beat,.76*beat,.11,'bass',-.12,True)
            percussion(track,base+pulse*beat,'kick',.038 if pulse%2==0 else .022,True)
        comp_offsets=(0,1.5,2.5,3.5) if theme=='jade-treasury' else (.5,1.5,2.5,3.5)
        for pulse in comp_offsets: harmony(track,c,base+swing(pulse,info['swing'])*beat,.57*beat,.047,info['comp'])
        for pulse in (1,3): percussion(track,base+pulse*beat,'snare',.075,True)
        for pulse in (0,.5,1,1.5,2,2.5,3,3.5):
            percussion(track,base+swing(pulse,info['swing'])*beat,'hat',.013 if pulse%1 else .010,True)
        if theme in ('jade-treasury','ruby-revel'):
            for pulse in (.5,2.5):percussion(track,base+swing(pulse,info['swing'])*beat,'tambourine',.023,True)
        # Root-relative riffs make a coherent four-bar call and answer.
        melody_root=c[0]+(0 if theme in ('salon','pearl-palace','ruby-revel') else 12)
        for i,(pulse,interval) in enumerate(MELODIES[theme]):
            # The VI chord has a minor third/sixth within the major key.
            # Keep bright riffs in-key rather than clashing with accompaniment.
            fitted_interval=interval-(1 if chord_index==1 and interval%12 in (4,9) else 0)
            note=melody_root+fitted_interval-(12 if section==2 else 0)
            length=(.62 if theme in ('salon','ruby-revel') else .85)*beat
            voice(track,note,base+swing(pulse,info['swing'])*beat,length,.105,info['lead'],.18,True)
            if section in (1,3) and i%2==0:voice(track,note-12,base+swing(pulse,info['swing'])*beat,length,.042,'horn',-.25,True)
        if bar%2==1:
            harmony(track,[c[1]+12,c[2]+12],base+3*beat,.64*beat,.045,'horn')
        if theme=='pearl-palace':
            harmony(track,c,base,4.1*beat,.030,'strings')
            sequence(track,[c[0]+12,c[1]+12,c[2]+12],base+2.5*beat,.25*beat,.85*beat,.024,'harp')
        if theme=='golden-hour' and bar%2==1:
            sequence(track,[c[2]+12,c[3]+12,c[0]+24],base+2.5*beat,.5*beat,.55*beat,.038,'glock')
        if bar%4==3:
            for j in range(4):percussion(track,base+(3+j*.25)*beat,'snare',.025+j*.006,True)
        if bar%4==0:percussion(track,base,'cymbal',.027,True)
    output('music-'+theme,track,True,.57)
    REPORT[-1].update({'theme':info['name'],'bpm':info['bpm'],'stage':'background-loop','style':info['style']})

# Rounded tactile contacts with short major-third answers and softer attacks.
cue=buffer(.19)
voice(cue,74,0,.13,.15,'wood');voice(cue,78,.025,.14,.045,'celesta');output('ui-touch',cue,peak=.40)
cue=buffer(.48)
voice(cue,43,0,.24,.13,'bass');percussion(cue,.008,'brush',.046)
sequence(cue,[67,71,74],.04,.07,.25,.075,'piano',False);output('reel-start',cue,peak=.53)
cue=buffer(.27)
voice(cue,43,0,.18,.17,'bass');voice(cue,74,.022,.19,.06,'celesta');percussion(cue,.005,'brush',.025);output('reel-stop',cue,peak=.48)
rolling=buffer(1.2)
for i in range(12):
    voice(rolling,40+(i%3),i*.1,.062,.032,'wood',(-1 if i%2 else 1)*.2,True)
    percussion(rolling,i*.1,'brush',.017,True)
output('reel-roll',rolling,True,.27)
for name,notes,step in (('win-normal',[72,76,79,84],.12),('feature',[76,79,84,88,91],.10),('coin-collect',[79,84,88,91],.075)):
    cue=buffer(len(notes)*step+.83)
    for i,note in enumerate(notes):
        voice(cue,note,i*step,.60,.11,'celesta',-.24+i*.10)
        voice(cue,note-12,i*step,.35,.055,'piano',.20)
    harmony(cue,[60,64,67,72],(len(notes)-1)*step,.68,.046,'horn',False)
    percussion(cue,(len(notes)-1)*step,'tambourine',.024)
    output(name,cue,peak=.56)

# Actual visual reveal drives the fanfare cadence. Count segments finish at
# their existing timing; early reveal can resolve straight to the tonic.
timing=(Path(__file__).parents[1]/'assets/scripts/vfx/AwardTiming.ts').read_text()
COUNTS=json.loads(re.search(r'AWARD_COUNT_SECONDS = (\[[^;]+?\])',timing).group(1))
HOLD=float(re.search(r'AWARD_HOLD_SECONDS = ([0-9.]+)',timing).group(1))
EXIT=float(re.search(r'AWARD_EXIT_SECONDS = ([0-9.]+)',timing).group(1))
COUNT_START=float(re.search(r'AWARD_COUNT_START = ([0-9.]+)',timing).group(1))
for theme in ('golden-hour','jade-treasury','pearl-palace','ruby-revel'):
    info=THEMES[theme];root=info['root'];lead=info['lead'];suffix='' if theme=='golden-hour' else '-'+theme
    tonic=[root,root+4,root+7,root+12];dominant=[root+7,root+11,root+14,root+17]
    for tier,name in enumerate(('win-grand','win-super','win-mega','win-epic')):
        duration=COUNTS[tier];track=buffer(duration+.32)
        harmony(track,tonic,0,.52,.082,'horn',False)
        sequence(track,[root+12,root+16,root+19,root+24],.035,.125,.37,.10,lead,False)
        voice(track,root-12,.015,.40,.14,'bass',-.12,False)
        percussion(track,.02,'cymbal',.045)
        steps=[10,14,18,22][tier];pulse=(duration-COUNT_START)/steps
        for i in range(steps):
            start=COUNT_START+i*pulse;p=i/steps
            chord=tonic if p<.38 else [root+5,root+9,root+12,root+16] if p<.70 else dominant
            note=chord[(i+int(p*4))%4]+12
            voice(track,note,start,max(.16,pulse*1.8),.066+tier*.006,lead,(-.28 if i%2 else .28),False)
            if i%2==0:
                harmony(track,chord,start,pulse*1.65,.043+tier*.005,'piano',False)
                voice(track,chord[0]-12,start,pulse*1.5,.085,'bass',-.12,False)
                percussion(track,start,'kick',.040)
            else:percussion(track,start,'snare',.056+tier*.006)
            if i%4==0:harmony(track,chord,start,pulse*2.5,.047+tier*.006,'horn',False)
            if tier>=1 and i%3==0:voice(track,note,start,.36,.018,'glock',.24,False)
            if tier>=2 and i>=steps-6:percussion(track,start,'tambourine',.030)
        output(name+suffix,track,peak=.65)
        REPORT[-1].update({'theme':info['name'],'stage':'opening-count','revealAt':duration,'style':'rising major-key jackpot fanfare'})
        tail=buffer(HOLD+EXIT)
        # Brass answer and coin cascade hit exactly when the amount is revealed.
        harmony(tail,tonic,0,1.28,.14+tier*.007,'horn',False)
        harmony(tail,[n+12 for n in tonic[:3]],.014,.68,.048+tier*.004,'trumpet',False)
        voice(tail,root-12,.008,1.15,.16,'bass',-.12,False)
        percussion(tail,.006,'cymbal',.057+tier*.006)
        sequence(tail,[root+12,root+16,root+19,root+24,root+28],.04,.073,.63,.09,lead,False)
        # A short celebratory response releases fully before automatic exit.
        for i,note in enumerate([root+19,root+16,root+19,root+24]):
            start=.72+i*.22
            voice(tail,note,start,.38,.065+tier*.004,'piano',(-.22 if i%2 else .22),False)
            if i%2:percussion(tail,start,'tambourine',.022)
        harmony(tail,tonic,1.54,.89,.065+tier*.005,'horn',False)
        voice(tail,root+24,1.64,.81,.047,'celesta',.25,False)
        output(name+'-resolve'+suffix,tail,peak=.64)
        REPORT[-1].update({'theme':info['name'],'stage':'resolution-hold-exit','hold':HOLD,'exit':EXIT,'style':'brass celebration and coin-chime cadence'})

(Path(__file__).parent/'audio-manifest.json').write_text(json.dumps({
 'authorship':'Original deterministic F34 synthesized festive instrumental compositions; no external samples or recordings',
 'direction':'Upbeat major-key casino celebration and wealth; five distinct themes, rounded tactile feedback and four escalating jackpot tiers',
 'mastering':MASTERING,'themes':THEMES,'awardTiming':{'countStart':COUNT_START,'counts':COUNTS,'hold':HOLD,'exit':EXIT},'tracks':REPORT
},indent=2)+'\n')
