"""Reproducible original physical cues and gentle masters; no downloaded songs.
Usage: python3 tools/master-audio.py RAW_DIR OUTPUT_DIR SCORES_JSON
       python3 tools/master-audio.py --effects-only OUTPUT_DIR
Then run: python3 tools/render-feedback.py OUTPUT_DIR (appends cabinet/variant/feature bank).
Sampled score rendering is performed by tools/render-instruments.swift.
"""
import sys,json,struct,wave,subprocess,tempfile
from pathlib import Path
import numpy as np
rate=44100
effects_only=sys.argv[1]=='--effects-only'
workspace=tempfile.TemporaryDirectory(prefix='f37-physical-masters-') if effects_only else None
raw=Path(workspace.name) if workspace else Path(sys.argv[1])
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
# Refresh physical/currency cues without re-rendering or re-encoding the five scores.
manifest=json.loads((out/'manifest.json').read_text()) if effects_only else {}
reports=[r for r in manifest.get('recordings',[]) if not r['name'].startswith('fx-')]
def read_float(path):
 data=path.read_bytes();offset=12;fmt=None;pcm=None
 while offset+8<=len(data):
  name=data[offset:offset+4];n=struct.unpack_from('<I',data,offset+4)[0];body=data[offset+8:offset+8+n]
  if name==b'fmt ':fmt=struct.unpack_from('<HHIIHH',body)
  if name==b'data':pcm=body
  offset+=8+n+(n%2)
 if fmt[0]!=3 or fmt[1]!=2 or fmt[2]!=rate:raise ValueError(('unexpected PCM',fmt))
 return np.frombuffer(pcm,dtype='<f4').reshape(-1,2).copy()
def room(data):
 wet=data.copy()
 for delay,gain in [(.031,.09),(.057,.07),(.113,.044),(.193,.026),(.281,.018)]:
  k=int(delay*rate);wet[k:]+=data[:-k,::-1]*gain
 return wet
work=raw/'masters';work.mkdir(exist_ok=True)
def write(name,data,kind,loop=None):
 data=np.nan_to_num(data)
 rms=float(np.sqrt(np.mean(data**2)));target=.078 if kind=='music' else .13 if kind=='award' else .045 if name in ['fx-tap','fx-bet','fx-toggle','fx-navigate','fx-confirm'] else .055
 peaklimit=.49 if kind=='music' else .64 if kind=='award' else .48
 if rms>1e-7:data*=min(target/rms,peaklimit/max(float(np.max(abs(data))),1e-6))
 data=np.clip(data,-.8,.8)
 if loop is None:
  a=min(len(data)//3,int((.002 if name.startswith('fx-') else .006)*rate));b=min(len(data)//3,int(.10*rate))
  data[:a]*=np.linspace(0,1,a)[:,None];data[-b:]*=np.linspace(1,0,b)[:,None]
 else:
  # Exactly periodic endpoints; retain the entire phrase rather than insert silence.
  edge=data[0].copy();n=48;data[-n:]=data[-n:]*np.linspace(1,0,n)[:,None]+edge*np.linspace(0,1,n)[:,None]
 pcm=np.round(data*32767).astype('<i2');wav=work/(name+'.wav')
 with wave.open(str(wav),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
 subprocess.run(['/usr/bin/afconvert',str(wav),str(out/(name+'.m4a')),'-f','m4af','-d','aac','-b','160000' if kind=='music' else '128000','-q','127'],check=True,stdout=subprocess.DEVNULL)
 reports.append({'name':name,'kind':kind,'seconds':len(data)/rate,'rmsDb':round(20*np.log10(max(1e-8,float(np.sqrt(np.mean(data**2))))),2),'peakDb':round(20*np.log10(max(1e-8,float(np.max(abs(data))))),2),'loop':loop,'bytes':(out/(name+'.m4a')).stat().st_size})
for s in ([] if effects_only else json.loads(Path(sys.argv[3]).read_text())):
 data=room(read_float(raw/(s['name']+'.wav')))
 L=s.get('loopSeconds')
 if L: a=round(L*rate);data=data[a:a+round(L*rate)]
 write(s['name'],data,'music' if L else 'award',L)
rng=np.random.default_rng(35)
def pulse(duration,freqs,decay,noise=.08):
 n=round(duration*rate);t=np.arange(n)/rate
 x=sum(np.sin(2*np.pi*f*t+p)*v for f,v,p in freqs)*np.exp(-t/decay)
 # Rounded contact noise: no white-noise edge fighting the melody or coin rings.
 contact=rng.normal(0,noise,n);contact=np.convolve(contact,np.array([1,3,5,6,5,3,1])/24,'same')
 x+=contact*np.exp(-t/(decay*.24))
 x*=np.minimum(1,t/.0015);return x
def cue(name,duration,parts,kind='effects',ambient=False):
 data=np.zeros((round(duration*rate),2))
 for at,signal,pan in parts:
  start=round(at*rate);signal=signal[:len(data)-start]
  data[start:start+len(signal),0]+=signal*np.sqrt((1-pan)*.5);data[start:start+len(signal),1]+=signal*np.sqrt((1+pan)*.5)
 if ambient:data=room(data)
 write('fx-'+name,data,kind)
metal=lambda dur=.16: pulse(dur,[(590,.65,0),(1130,.22,.35),(1840,.07,.8)],.018,.14)
wood=lambda dur=.14:pulse(dur,[(185,.7,0),(390,.22,.3),(680,.10,.8)],.024,.12)
coin=lambda f,dur=.3:pulse(dur,[(f,.55,0),(f*1.5,.17,.4),(f*2,.08,.7)],.053,.065)
# Each control has its own pressure / latch / release balance; never a UI melody.
cue('tap',.125,[(0,wood(.105),0),(.009,metal(.11)*.38,0)])
cue('bet',.145,[(0,wood(.11)*.50,0),(.009,metal(.12)*.72,0),(.024,pulse(.095,[(310,.28,0)],.012,.04),0)])
cue('toggle',.125,[(0,wood(.10)*.70,0),(.014,metal(.095)*.55,0),(.034,wood(.075)*.16,0)])
swish=rng.normal(0,.16,6000);swish=np.convolve(swish,np.ones(25)/25,'same')*np.sin(np.linspace(0,np.pi,6000))**2
cue('navigate',.18,[(0,wood(.11),0),(.016,swish*.60,0)])
cue('confirm',.16,[(0,wood(.115)*1.10,0),(.012,metal(.125)*.30,0),(.032,pulse(.09,[(245,.18,0)],.022,.03),0)])
N=14553;t=np.arange(N)/rate
motor=(np.sin(2*np.pi*(92*t+130*t*t))*.45+np.sin(2*np.pi*(180*t+70*t*t))*.12+np.convolve(rng.normal(0,.18,N),np.ones(9)/9,'same'))*np.sin(np.pi*np.arange(N)/N)**1.4
# The press layer owns the click. The spin action adds only the motor pickup.
cue('spin',.36,[(.015,motor,0)])
cue('reel-stop',.13,[(0,wood(.105)*.8,0),(.008,pulse(.10,[(310,.22,0),(910,.09,.8)],.018,.06),0)])
for name,n in [('win',3),('reward',7),('big-win',7),('epic-win',11),('collect',5)]:
 # Open-fifth coin cascade fits both major and minor scenes.
 # No major third collides with the caravan harmonic-minor score; lower register.
 seq=[coin(440*2**((([60,67,72,67][i%4])-69)/12),.32) for i in range(n)]
 cue(name,.25+n*.083,[(i*.083,s,(-1 if i%2 else 1)*.20) for i,s in enumerate(seq)],ambient=True)
cue('error',.20,[(0,wood(.08)*.65,0),(.072,wood(.085)*.40,0)])
# Quiet endless bearing texture; no bright pulse competes with landing/award sounds.
N=round(rate*1.1);t=np.arange(N)/rate
roll=np.sin(2*np.pi*90*t)*.05+np.sin(2*np.pi*180*t)*.014+np.convolve(rng.normal(0,.024,N),np.ones(19)/19,'same')
roll=np.column_stack([roll,roll]);write('fx-reel-roll',roll,'effects',1.1)
(out/'manifest.json').write_text(json.dumps({'sampleRate':rate,'source':'Original F37 festive casino score with five independently composed joyful major-key merchant, parade, courtyard, waltz and maritime arrangements with warm piano, nylon guitar, harp and restrained strings; one melodic lane, soft bass and restrained percussion; open-fifth currency cues for compatibility with each scene key; offline AVAudioUnitSampler rendering using installed CoreAudio instrument bank; original rounded pressure/latch/release contact design with band-limited impact noise and consonant fifth/octave coin partials. Instrument bank itself is not bundled.','recordings':reports},indent=2)+'\n')
print('MASTERED',len(reports),'AAC files,',sum(r['bytes'] for r in reports),'bytes')
if workspace:workspace.cleanup()
