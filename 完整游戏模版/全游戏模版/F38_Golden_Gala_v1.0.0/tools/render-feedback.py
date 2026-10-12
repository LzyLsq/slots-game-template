"""Append 34 original F38 material/action recordings, without touching music/awards.
Usage: python3 tools/render-feedback.py AUDIO_DIR
Reproducible: fixed per-asset seeds, 44.1kHz stereo PCM, macOS AAC encoder.
Run after master-audio.py for a full rebuild. No instrument bank or downloaded audio.
"""
import sys,json,wave,hashlib,subprocess,tempfile
from pathlib import Path
import numpy as np
RATE=44100
out=Path(sys.argv[1]);manifest=json.loads((out/'manifest.json').read_text())
BUTTONS=['tap','bet','navigate','toggle','confirm']
SCENES=['crown-club','emerald-fortune','ruby-royale','vault-reserve']
ROLES=['spin','reel-stop','reel-roll','collect','feature-entry','feature-step']
expected={f'fx-{b}-v{v}' for b in BUTTONS for v in [1,2]}|{f'fx-cabinet-{s}-{r}' for s in SCENES for r in ROLES}
reports=[r for r in manifest['recordings'] if r['name'] not in expected]
def noise(rng,n,width=29):
 return np.convolve(rng.normal(0,1,n),np.ones(width)/width,'same')
def impact(rng,duration,modes,decay,air=.025):
 n=round(duration*RATE);t=np.arange(n)/RATE
 x=sum(np.sin(2*np.pi*f*t+.15*i)*a*np.exp(-t/(decay/(1+i*.22))) for i,(f,a) in enumerate(modes))
 x+=noise(rng,n,23)*air*np.exp(-t/(decay*.32))
 return x*np.minimum(1,t/.0014)
def layered(seconds,parts):
 data=np.zeros((round(seconds*RATE),2))
 for at,signal,pan in parts:
  start=round(at*RATE);signal=signal[:max(0,len(data)-start)]
  data[start:start+len(signal),0]+=signal*np.sqrt((1-pan)*.5)
  data[start:start+len(signal),1]+=signal*np.sqrt((1+pan)*.5)
 return data
with tempfile.TemporaryDirectory(prefix='f38-feedback-') as tmp:
 def write(name,data,loop=None,description=''):
  rms=max(1e-9,float(np.sqrt(np.mean(data**2))));peak=max(1e-9,float(np.max(abs(data))))
  data=data*min(.045/rms,.46/peak)
  if loop:
   edge=data[0].copy();n=48;blend=np.linspace(0,1,n)[:,None];data[-n:]=data[-n:]*(1-blend)+edge*blend
  else:
   a=min(90,len(data)//8);b=min(round(.050*RATE),len(data)//3)
   data[:a]*=np.linspace(0,1,a)[:,None];data[-b:]*=np.linspace(1,0,b)[:,None]
  wav=Path(tmp)/(name+'.wav')
  with wave.open(str(wav),'wb') as f:
   f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(np.round(data*32767).astype('<i2').tobytes())
  subprocess.run(['/usr/bin/afconvert',str(wav),str(out/(name+'.m4a')),'-f','m4af','-d','aac','-b','128000','-q','127'],check=True,capture_output=True)
  reports.append({'name':name,'kind':'effects','seconds':len(data)/RATE,'rmsDb':round(20*np.log10(float(np.sqrt(np.mean(data**2)))),2),'peakDb':round(20*np.log10(float(np.max(abs(data)))),2),'loop':loop,'bytes':(out/(name+'.m4a')).stat().st_size,'design':description})
 for j,b in enumerate(BUTTONS):
  for v in [1,2]:
   name=f'fx-{b}-v{v}';rng=np.random.default_rng(3700+j*10+v)
   # New wood/brass pressure, latch and release balances, not pitch/rate aliases.
   durations=[.125,.145,.18,.125,.16];duration=durations[j]
   wood=impact(rng,.11,[(168+11*j+5*v,.65),(350+21*v,.18),(640+17*j,.05)],.020+.002*v,.10)
   latch=impact(rng,.11,[(510+37*j+23*v,.46),(1030+29*v,.14),(1670+38*j,.035)],.014+.001*v,.06)
   release=impact(rng,.075,[(225+19*j+12*v,.20),(510+22*v,.06)],.013,.045)
   parts=[(0,wood*(.72 if b=='bet' else 1),0),(.007+.004*v,latch*(.78 if b in ['bet','toggle'] else .33),0),(.027+.005*v,release*(.36 if b=='toggle' else .16),0)]
   if b=='navigate':
    n=round(.14*RATE);swish=noise(rng,n,63)*np.sin(np.linspace(0,np.pi,n))**2
    parts.append((.012,swish*.23,0))
   write(name,layered(duration,parts),description=f'{b}: contact {v+1}, independently modelled pressure/latch/release')
 # Each cabinet has its own material body, gear and treasury palette.
 banks=[([(145,.70),(320,.18),(760,.065)],.033,84,62,'carved wood and rounded brass'),
        ([(255,.60),(640,.22),(1320,.055)],.027,72,69,'polished jade ceramic and soft crystal'),
        ([(185,.68),(510,.16),(1060,.085)],.022,96,67,'felt-lined brass latch and ruby gems'),
        ([(125,.72),(275,.20),(870,.055)],.040,66,65,'teak chest and muted brass ratchet')]
 for s,(modes,decay,motorHz,root,material) in zip(SCENES,banks):
  rng=np.random.default_rng(int(hashlib.sha256(s.encode()).hexdigest()[:8],16))
  hit=lambda d=.15:impact(rng,d,modes,decay,.08)
  treasury=lambda note,d=.25:impact(rng,d,[(440*2**((note-69)/12),.55),(440*2**((note-69)/12)*1.5,.10),(440*2**((note-69)/12)*2,.035)],.045,.035)
  prefix='fx-cabinet-'+s+'-'
  n=round(.29*RATE);t=np.arange(n)/RATE
  motor=(np.sin(2*np.pi*(motorHz*t+(41+motorHz/3)*t*t))*.24+noise(rng,n,49)*.07)*np.sin(np.linspace(0,np.pi,n))**1.6
  write(prefix+'spin',layered(.34,[(0,hit(.14)*.48,0),(.018,motor,0)]),description=material+' motor pickup')
  write(prefix+'reel-stop',layered(.15,[(0,hit(),0),(.014,impact(rng,.10,[(modes[0][0]*1.65,.15),(modes[1][0]*1.2,.06)],.013,.025),.03)]),description=material+' damped reel landing')
  seconds=[1.0,1.2,1.1,1.25][SCENES.index(s)];n=round(seconds*RATE);t=np.arange(n)/RATE
  # Periodic filtered bearing noise and harmonics, no bright ticking ostinato.
  spectrum=np.fft.rfft(rng.normal(0,1,n));f=np.fft.rfftfreq(n,1/RATE)
  bearing=np.fft.irfft(spectrum*np.exp(-(f/520)**4),n);bearing/=max(1e-9,np.std(bearing))
  hz=round(motorHz*seconds)/seconds
  roll=np.sin(2*np.pi*hz*t)*.14+np.sin(2*np.pi*hz*2*t)*.021+bearing*.017
  write(prefix+'reel-roll',np.column_stack([roll,roll]),seconds,material+' continuous bearing')
  # Scene-key currency contacts: engraved coins, jade tokens, gems, chest gold.
  spacing=[.075,.096,.062,.084][SCENES.index(s)];count=[5,4,6,5][SCENES.index(s)]
  notes=[root,root+7,root+12,root+7,root,root+7]
  parts=[(i*spacing,treasury(notes[i])*(1-i*.065),(.14 if i%2 else -.14)) for i in range(count)]
  parts.insert(0,(0,hit(.10)*.18,0))
  write(prefix+'collect',layered(.25+(count-1)*spacing,parts),description=material+' actual collected currency, composed in scene key')
  # Restrained feature-entry pair distinct from a win melody; step is a physical action.
  write(prefix+'feature-entry',layered(.43,[(0,hit(.15)*.55,0),(.045,treasury(root,.32)*.50,-.06),(.12,treasury(root+7,.26)*.25,.08)]),description=material+' feature opened, not a victory fanfare')
  if s=='crown-club':
   n=round(.28*RATE);sweep=noise(rng,n,67)*np.sin(np.linspace(0,np.pi,n))**2
   parts=[(0,hit(.12)*.6,-.12),(.018,sweep*.32,0),(.20,hit(.10)*.35,.12)];duration=.34;action='travelling WILD glide'
  elif s=='emerald-fortune':
   parts=[(0,hit(.13)*.8,0),(.018,treasury(root+12,.20)*.35,0)];duration=.24;action='new sticky WILD lock'
  elif s=='ruby-royale':
   n=round(.20*RATE);sweep=noise(rng,n,47)*np.sin(np.linspace(0,np.pi,n))**2
   parts=[(0,hit(.10)*.6,0),(.01,sweep*.18,0),(.075,treasury(root,.20)*.40,.06)];duration=.30;action='mystery symbol reveal'
  else:
   parts=[(0,hit(.15),-.08),(.075,hit(.14)*.60,.08),(.145,treasury(root,.17)*.24,0)];duration=.34;action='cluster clear and treasure drop'
  write(prefix+'feature-step',layered(duration,parts),description=material+' '+action)
assert len([r for r in reports if r['name'] in expected])==34
manifest['recordings']=reports
manifest['feedbackSource']='34 additional original physically modelled material recordings: ten control variants, four independent cabinet motor/landing/bearing/treasury sets, eight real feature entry/action cues. Rate remains 1x; no existing background or award master re-encoded.'
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('APPENDED 34 feedback recordings;',len(reports),'total AAC assets; added',sum(r['bytes'] for r in reports if r['name'] in expected),'bytes')
