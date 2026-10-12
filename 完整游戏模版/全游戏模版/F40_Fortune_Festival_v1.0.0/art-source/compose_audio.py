"""F40 v3 original score: sampled acoustic festival music and tactile feedback.
No finished-game melody, recording or extracted asset is used. GeneralUser GS
sample provenance and author license are recorded separately from authorship.
"""
from pathlib import Path
import os, json, uuid, wave, re, hashlib
import numpy as np
from sampled_renderer import Score, Renderer, RATE

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'assets/resources/audio'; DEST.mkdir(parents=True,exist_ok=True)
SF=Path(os.environ.get('F40_SOUNDFONT',ROOT/'art-source/raw/audio/GeneralUser-GS.sf2'))
EXPECTED='9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe'
if hashlib.sha256(SF.read_bytes()).hexdigest()!=EXPECTED: raise RuntimeError('Unexpected SoundFont revision')
renderer=Renderer(SF)
REPORT=[]; SCORES=[]; RNG=np.random.default_rng(401012)
IDS=['salon','golden-phoenix','jade-dragon','pearl-qilin','amber-panda']
ROOTS=[55,50,53,55,48]; BPMS=[108,112,106,104,116]
LEADS=['piano','horn','flute','vibes','clarinet']
KEYS=['G major','D major','F major','G major','C major']
MASTERING={'revision':'sampled-festival-v3-20261012','highShelfHz':3300,'highShelfDb':-4.2,
           'presenceHz':2700,'presenceDb':-2.0,'airRolloffHz':9200,
           'backgroundTargetRms':.115,'scoreTargetRms':.148,'ceiling':.68}

def master(track,loop,peak,rms=None):
    # Circular filtering for loops; zero padding prevents non-loop tail wrap.
    pad=0 if loop else round(RATE*.12)
    src=np.pad(track,((pad,pad),(0,0))) if pad else track
    hz=np.fft.rfftfreq(len(src),1/RATE)
    shelf=(hz/MASTERING['highShelfHz'])**4
    db=MASTERING['highShelfDb']*shelf/(1+shelf)
    db+=MASTERING['presenceDb']*np.exp(-.5*(np.log(np.maximum(hz,1)/MASTERING['presenceHz'])/.45)**2)
    db-=10*np.log10(1+(hz/MASTERING['airRolloffHz'])**8)
    db-=10*np.log10(1+(32/np.maximum(hz,1))**4)
    track=np.fft.irfft(np.fft.rfft(src,axis=0)*(10**(db/20))[:,None],n=len(src),axis=0)
    if pad:track=track[pad:pad+len(src)-2*pad]
    level=float(np.sqrt(np.mean(track**2)))
    gain=min(peak/max(1e-9,float(np.max(np.abs(track)))),rms/max(level,1e-9)) if rms else peak/max(1e-9,float(np.max(np.abs(track))))
    track*=gain
    if loop:
        # Only a 1 ms boundary correction after rendering the periodic score
        # through three cycles; does not fade a bar out and back in.
        n=32;delta=track[-1]-track[0]
        track[:n]+=delta*(.5+.5*np.cos(np.linspace(0,np.pi,n)))[:,None]
    else:
        track[:64]*=np.linspace(0,1,64)[:,None]
        n=min(round(RATE*.09),len(track)//5);track[-n:]*=np.linspace(1,0,n)[:,None]
    return track

def output(name,score,peak=.60,rms=None,extra=None):
    track=master(renderer.render(score),score.loop,peak,rms)
    sample=np.round(np.clip(track,-.99,.99)*32767).astype('<i2')
    with wave.open(str(DEST/f'{name}.wav'),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(sample.tobytes())
    meta=DEST/f'{name}.wav.meta'
    if not meta.exists():meta.write_text(json.dumps({'ver':'1.0.0','importer':'audio-clip','imported':True,'uuid':str(uuid.uuid4()),'files':['.json','.wav'],'subMetas':{},'userData':{'downloadMode':0}},indent=2)+'\n')
    spectrum=np.abs(np.fft.rfft(track,axis=0))**2;hz=np.fft.rfftfreq(len(track),1/RATE)
    window=round(RATE*.05);edge=np.concatenate([track[-window:],track[:window]])
    rms_value=float(np.sqrt(np.mean(track**2)));peak_value=float(np.max(np.abs(track)))
    record={'name':name,'duration':round(score.seconds,4),'channels':2,'sampleRate':RATE,'loop':score.loop,
            'peak':round(peak_value,5),'rms':round(rms_value,5),'crestDb':round(20*np.log10(peak_value/max(rms_value,1e-9)),2),
            'seamDelta':round(float(np.max(np.abs(track[-1]-track[0]))),7),
            'seamRms':round(float(np.sqrt(np.mean(edge**2))),5),
            'highBandEnergyPercent':round(float(spectrum[hz>=5000].sum()/max(1e-9,spectrum.sum())*100),4),
            'bytes':(DEST/f'{name}.wav').stat().st_size,'sha256':hashlib.sha256((DEST/f'{name}.wav').read_bytes()).hexdigest()}
    if extra:record.update(extra)
    REPORT.append(record);SCORES.append({'name':name,'seconds':score.seconds,'loop':score.loop,'events':score.events})
    print(name,record['duration'],'seconds · rms',record['rms'],flush=True)

# Twenty-four bars: a stated theme, answering middle section and varied reprise.
# Voicings, bass and harmonic rhythm vary; the melody is not repeated each bar.
A=[[(0,0,.65),(1,4,.5),(1.75,7,.65),(2.75,9,.45),(3.5,7,.4)],
   [(0,4,1),(1.5,2,.45),(2.25,0,1.35)],
   [(0,2,.55),(.75,4,.5),(1.5,7,1),(2.75,4,.55),(3.5,2,.4)],
   [(0,7,.8),(1.25,9,.5),(2,12,1.2),(3.5,9,.35)],
   [(0,7,.75),(1,4,.7),(2,2,.55),(2.75,4,.9)],
   [(0,9,.8),(1.25,7,.5),(2,4,.6),(3,2,.6)],
   [(0,4,.6),(.75,7,.5),(1.5,9,.75),(2.75,7,.45),(3.5,2,.35)],
   [(0,7,.75),(1,4,.65),(2,2,.45),(2.75,0,1.05)]]
B=[[(0,9,.7),(1,12,.8),(2.25,9,.65),(3.25,7,.55)],
   [(0,4,.6),(.75,7,.65),(1.75,9,1.35)],
   [(0,12,.65),(.75,9,.5),(1.5,7,.7),(2.5,4,1)],
   [(0,2,.65),(1,7,1),(2.5,9,.65),(3.5,7,.4)],
   [(0,9,.65),(1,7,.65),(2,4,1.25)],
   [(0,4,.6),(.75,2,.55),(1.5,0,.9),(2.75,2,.9)],
   [(0,2,.55),(.75,4,.6),(1.75,7,.7),(2.75,9,.85)],
   [(0,7,.8),(1.25,4,.6),(2.25,2,.65),(3.25,7,.6)]]
CHORDS=[(0,[0,4,7,9]),(-3,[0,3,7,10]),(5,[0,4,7,9]),(7,[0,4,7,10])]
for idx,id in enumerate(IDS):
    root=ROOTS[idx];beat=60/BPMS[idx];s=Score(beat*96,True)
    for bar in range(24):
        start=bar*4*beat;offset,intervals=CHORDS[bar%4];ch=[root+offset+x for x in intervals]
        middle=8<=bar<16;reprise=bar>=16
        s.chord('strings',ch,start,3.75*beat,44 if not middle else 51,0)
        for b in [0,2]:
            s.note('bass',root+offset-12+(7 if b==2 and bar%2 else 0),start+b*beat,.72*beat,77 if b==0 else 68)
            s.drum(36,start+b*beat,45 if b==0 else 38)
        for b in [1,3]:s.drum(37,start+b*beat,43);s.chord('pizz',ch[:3],start+b*beat,.4*beat,57,.009)
        for b in range(8):s.drum(82,start+(b*.5+(.03 if b%2 else 0))*beat,27+(b%2)*8)
        part='koto' if idx in (1,2,4) else 'harp'
        for b,n in enumerate([ch[0],ch[2],ch[1]+12,ch[2]+12]):s.note(part,n,start+(b+.04)*beat,1.2*beat,52+(b%2)*5)
        motif=(B if middle else A)[(bar+(idx*2 if middle else idx))%8]
        lead=('flute' if idx==0 else 'piano' if idx in (1,3) else LEADS[idx]) if middle else LEADS[idx]
        for n,(b,v,gate) in enumerate(motif):
            # The reprise ends with a lower register cadence before the loop.
            note=root+(0 if lead=='horn' else 12)+v
            if bar==23 and b>=2:note=root+12+(4 if b<3 else 0)
            s.note(lead,note,start+b*beat,gate*beat,70+(4 if reprise else 0)-(n%3)*4)
        # Low brass answers the melody on phrase ends, rather than piling
        # bright high notes over the whole loop.
        if bar%4==3:
            for b,v in [(2.5,7),(3,4),(3.5,0)]:s.note('horn',root+v,start+b*beat,.40*beat,48+(6 if reprise else 0))
        if bar%2==1:
            answer='vibes' if idx in (0,2) else 'harp'
            for n,note in enumerate([ch[2]+12,ch[1]+12,ch[0]+12]):s.note(answer,note,start+(2.5+n*.5)*beat,.75*beat,42+n*3)
        if bar%8 in (6,7):
            s.drum(54,start+3*beat,33)
            s.drum(45,start+3.5*beat,35);s.drum(47,start+3.75*beat,31)
    output('music-'+id,s,.60,MASTERING['backgroundTargetRms'],{'key':KEYS[idx],'bpm':BPMS[idx],'bars':24,'form':'A / response B / varied A reprise'})

# UI: lacquered-button contact and a low, muted wood click. Deliberately short.
s=Score(.20);s.note('wood',70,0,.065,62);s.note('pizz',55,.018,.045,46);s.drum(37,0,25)
output('ui-touch',s,.32)
s=Score(.52);s.drum(36,0,38)
for i,n in enumerate([48,55,60]):s.note('pizz',n,.018+i*.065,.12,63-i*4)
output('reel-start',s,.41)
s=Score(.96,True)
for i in range(16):s.drum(82,i*.06,23+i%3*2);s.drum(37,i*.06+.025,16)
output('reel-roll',s,.24)
# Tonal feedback follows the room's key; stops rise within one pentatonic octave.
for idx,id in enumerate(IDS):
    root=ROOTS[idx];suffix='' if id=='salon' else '-'+id
    for tag,notes,step,length in [('coin-collect',[7,9,12,7],.075,.85),('win-normal',[0,4,7,9,12],.10,1.24),('feature',[7,9,12,16],.11,1.32)]:
        s=Score(length)
        s.chord('harp',[root,root+7],0,.55,52)
        for i,v in enumerate(notes):s.note('vibes' if tag=='coin-collect' else 'piano',root+(0 if tag in ('coin-collect','feature') else 12)+v,i*step,.24,61+i*2)
        if tag!='coin-collect':s.chord('strings',[root+4,root+7,root+12],.12,.8,46)
        output(tag+suffix,s,.43 if tag=='coin-collect' else .47)
    for column,degree in enumerate([0,2,4,7,9,12]):
        s=Score(.30);s.drum(37,0,45)
        s.note('wood',root+12+degree,.007,.08,48);s.note('vibes',root+12+degree,.01,.11,44)
        name='reel-stop'+suffix+('' if column==0 else '-'+str(column))
        output(name,s,.36,extra={'column':column,'key':KEYS[idx]})
    # A short musical punctuation for each real visible tier upgrade.
    s=Score(.58);s.chord('horn',[root+4,root+7,root+12],.015,.22,57)
    s.drum(45,0,40);s.note('harp',root+12,.07,.24,48)
    output('award-accent'+suffix,s,.39)

# Entry score lasts exactly through the existing count animation. The resolve
# is a separate event at the exact amount reveal, so early collect is musical.
timing=(ROOT/'assets/scripts/vfx/AwardTiming.ts').read_text()
counts=[float(x) for x in re.search(r'AWARD_COUNT_SECONDS = \[([^]]+)\]',timing).group(1).split(',')]
impacts=[float(x) for x in re.search(r'AWARD_REVEAL_IMPACTS = \[([^]]+)\]',timing).group(1).split(',')]
for idx,id in enumerate(IDS[1:],1):
    root=ROOTS[idx];suffix='' if idx==1 else '-'+id
    for tier,tag in enumerate(['grand','super','mega','epic']):
        duration=counts[tier];pulse=duration/8;s=Score(duration+.35)
        # One pentatonic wealth motif travels from strings and plucks into
        # warm brass. The final two pulses prepare the resolve, without a
        # separate shrill melody competing with visible title upgrades.
        for b in range(8):
            at=b*pulse;rise=b/7;off=0 if b<3 else 5 if b<5 else 7
            notes=[root+off,root+off+4,root+off+7]
            s.chord('strings',notes,at,pulse*.88,48+round(18*rise)+tier*3,0)
            s.note('bass',root+off-12,at,pulse*.7,65+tier*3)
            s.drum(36,at,43+tier*4);s.drum(37,at+pulse*.48,28+round(12*rise))
            s.note('koto' if idx in (1,2,4) else 'harp',notes[b%3]+12,at+.025,pulse*.65,55+round(16*rise))
            if b>=2:
                lead='piano' if idx==1 else LEADS[idx]
                s.note(lead,root+12+[0,4,7,9,7,9,12,9][b],at,pulse*.74,60+tier*3)
            if tier>=1:s.chord('horn',notes,at+pulse*.10,pulse*.66,45+round(14*rise)+tier*3,0)
            if tier>=2:s.drum(45,at+pulse*.74,37+tier*4)
            if tier==3:s.note('trombone',root+off,at,pulse*.76,57)
            if b>=6:s.drum(47,at+pulse*.86,34+tier*3)
        output('win-'+tag+suffix,s,.61,MASTERING['scoreTargetRms']+tier*.007,{'countSeconds':duration,'tier':tag,'key':KEYS[idx]})
        s=Score(3.22)
        # Soft rolling pickup, two rounded brass attacks shared with the
        # cabinet's light crests, then a descending plucked receipt cadence.
        s.chord('strings',[root,root+4,root+7],0,2.55,52+tier*3,0)
        for n,at in enumerate([.015,.085,.15]):s.drum(45+n,at,32+n*6+tier*2)
        for volley,at in enumerate(impacts):
            velocity=70+tier*3+(4 if volley else 0)
            s.chord('horn',[root+4,root+7,root+12],at,.67 if volley==0 else 1.05,velocity,0)
            s.note('bass',root-12,at,.70,78+tier*3)
            s.drum(36,at,56+tier*4)
            if tier>=2:s.note('trombone',root,at,.72,58+tier*3)
            if tier>=1:s.drum(49,at,24+tier*3)
            for i,v in enumerate([0,4,7,12]):s.note('harp',root+12+v,at+.025+i*.12,.42,57+i*3+tier*2)
            if volley:s.chord('strings',[root+4,root+7,root+12],at,1.30,62+tier*3,0)
        # The second pickup is separate from its actual impact, matching
        # fountain growth. No repeated full fanfare during the payout hold.
        for i,n in enumerate([45,47,50]):s.drum(n,impacts[1]-.19+i*.055,35+i*4+tier*2)
        for i,v in enumerate([9,7,4,0]):s.note('piano',root+12+v,1.66+i*.13,.40,56-i*3)
        s.chord('pizz',[root,root+4,root+7],2.24,.28,47,0)
        output('win-'+tag+'-resolve'+suffix,s,.63,.152+tier*.006,{'tier':tag,'key':KEYS[idx],'revealImpactSeconds':impacts})

sf_source=json.loads((ROOT/'art-source/audio-sample-source.json').read_text())
(ROOT/'docs/audio-provenance.json').write_text(json.dumps({'originalCompositions':True,'source':'F40 original MIDI event score rendered offline with sampled instruments','revision':'sampled-festival-v3-20261012','livePerformance':False,'extractedGameAudio':False,'sampleLibrary':sf_source,'mastering':MASTERING,'clips':REPORT},indent=2)+'\n')
(ROOT/'art-source/festival-score.json').write_text(json.dumps({'rate':RATE,'eventFormat':['sample','noteOn','channel','midi','velocity'],'clips':SCORES},separators=(',',':'))+'\n')
print('Completed',len(REPORT),'clips',flush=True)
