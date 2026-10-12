"""Original warm material/phrase sound design (no external samples).
Modal wood/jade, dispersive string plucks, breathy flute and a small diffuse
room. Deterministic source and pre/post mastering measurements are recorded.
Scene music and economy are deliberately untouched.
"""
from pathlib import Path
import numpy as np, wave, json, hashlib, uuid
from warm_audio import warm_filter, spectral_metrics, MASTERING
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'assets/resources/audio'; SR=32000
RNG=np.random.default_rng(331009); records=[]

def modal(freq,dur,kind='jade'):
 t=np.arange(int(SR*dur))/SR
 ratios,decays=({'wood':([1,2.76,4.9],[.17,.055,.025]),'jade':([1,1.49,2.12,2.88],[.27,.18,.09,.045]),'gold':([1,1.58,2.37,3.07],[.35,.19,.07,.035])})[kind]
 x=np.zeros(len(t))
 for k,(r,d) in enumerate(zip(ratios,decays)):
  # A struck resonator: upper modes die first; slight dispersion is not a beep.
  x+=np.sin(2*np.pi*freq*r*t+.04*np.exp(-t*28)) * np.exp(-t/d) / (1+k*1.6)
 x*=(1-np.exp(-t*420)); x+=RNG.normal(0,.035,len(t))*np.exp(-t*180)
 return x

def pluck(freq,dur):
 n=int(SR*dur); period=max(8,round(SR/freq)); ring=RNG.normal(0,.48,period)
 ring=np.convolve(ring,np.ones(3)/3,'same'); x=np.zeros(n)
 for i in range(n):
  p=i%period; x[i]=ring[p]; ring[p]=.998*(ring[p]+ring[(p+1)%period])*.5
 return x*(1-np.exp(-np.arange(n)/SR*190))

def flute(freq,dur):
 t=np.arange(int(SR*dur))/SR; phase=2*np.pi*freq*t+.055*np.sin(2*np.pi*4.3*t)*(1-np.exp(-t*7))
 env=(1-np.exp(-t*28))*np.exp(-t/max(.09,dur*.43)); return (np.sin(phase)+.09*np.sin(2*phase))*env

def place(x,y,at,gain):
 off=round(at*SR); take=min(len(y),len(x)-off)
 if take>0:x[off:off+take]+=y[:take]*gain

def room(x):
 dry=x.copy()
 for secs,gain in [(.037,.13),(.071,.09),(.113,.065),(.173,.04)]:place(x,dry,secs,gain)
 return x

def save(name,duration,events,peak,description,texture=None):
 x=np.zeros(round(duration*SR))
 for at,freq,length,gain,kind in events:
  y=pluck(freq,length) if kind=='pluck' else flute(freq,length) if kind=='flute' else modal(freq,length,kind)
  place(x,y,at,gain)
 if texture:
  noise=RNG.normal(0,1,len(x)); noise=np.convolve(noise,np.ones(65)/65,'same'); t=np.arange(len(x))/SR
  envelope=(1-np.exp(-t*24))*np.exp(-t/texture); x+=noise*envelope*.28
 room(x)
 raw=x.copy(); x=warm_filter(warm_filter(x,SR),SR); x*=peak/max(1e-8,np.max(np.abs(x)))
 fade=min(768,len(x)//5); x[:96]*=np.linspace(0,1,96); x[-fade:]*=np.linspace(1,0,fade)
 pcm=np.rint(np.clip(x,-1,1)*32767).astype('<i2'); path=OUT/f'{name}.wav'
 with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes(pcm.tobytes())
 meta=Path(str(path)+'.meta')
 if not meta.exists():meta.write_text(json.dumps({'ver':'1.0.0','importer':'audio-clip','imported':True,'uuid':str(uuid.uuid4()),'files':['.json','.wav'],'subMetas':{},'userData':{'loadMode':0}},indent=2))
 post=pcm.astype(float)/32768
 record={'asset':name,'duration':len(pcm)/SR,'bytes':path.stat().st_size,'peak':float(np.abs(post).max()),'rms':float(np.sqrt(np.mean(post**2))),'loop':False,'spectrum':spectral_metrics(post,SR),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'description':description,'before':spectral_metrics(raw,SR),'after':spectral_metrics(post,SR),'source':'compose_premium_foley.py; newly composed source, not the October 8 source'}
 records.append(record)

save('ui-jade-tap',.125,[(0,370,.1,.5,'wood'),(.009,610,.1,.15,'jade')],.39,'Soft tactile wood contact with a restrained jade resonance')
save('ui-gold-step',.170,[(0,430,.16,.35,'gold'),(.036,645,.12,.14,'wood')],.39,'Small gilded detent, not a menu melody')
save('ui-spin-launch',.240,[(0,330,.22,.18,'wood'),(.05,495,.18,.24,'pluck'),(.105,660,.12,.15,'jade')],.44,'Brushed latch and ascending plucked release',.06)
# Tier cues maintain the existing choreography lengths. Optional room-specific
# phrases change instrument and melody, never financial results.
durations={'ordinary':1.72,'big':2.68,'super':3.52}
phrases=[([0,4,7,12],'pluck',293.66),([0,7,9,12],'jade',329.63),([0,3,7,10],'wood',261.63),([0,5,7,12],'flute',246.94)]
for mode,(notes,timbre,base) in enumerate(phrases):
 for tier,dur in durations.items():
  count={'ordinary':3,'big':5,'super':8}[tier]; events=[]
  for i in range(count):
   at=.06+i*({'ordinary':.18,'big':.24,'super':.27}[tier]); note=notes[min(i,len(notes)-1)]
   freq=base*2**(note/12); events.append((at,freq,min(.68,dur-at),.34,timbre))
   if tier!='ordinary':events.append((at+.023,freq*.5,.8,.17,'pluck'))
  events.extend([(0,165,.25,.13,'wood'),(dur-.82,base,.70,.12,'flute')])
  save(f'reward-{mode}-{tier}',dur,events,.56 if tier=='super' else .52,f'Room {mode}: {timbre} motif, {tier} composed fanfare with diffuse acoustic tail')
  if mode==0:save(f'reward-win-{tier}',dur,events,.56 if tier=='super' else .52,'Warm fallback tier phrase')
save('reward-gift-open',.91,[(0,240,.22,.2,'wood'),(.16,523,.6,.3,'pluck'),(.26,784,.5,.15,'jade')],.49,'Soft lacquered lid release and silk gift flourish',.2)
coin_events=[(.025+i*.069,420+int(RNG.uniform(-40,180)),.20,.16-i*.007,'gold') for i in range(8)]
save('reward-coin-shower',.78,coin_events,.28,'Small irregular coin contacts, falling with natural deceleration')
save('reward-counter',.072,[(0,330,.071,.28,'wood')],.19,'Quiet felt-backed tally, no shrill repetitive bell')
save('reward-count-complete',.54,[(0,440,.48,.28,'jade'),(.072,660,.45,.15,'pluck')],.44,'Soft resolved tally cadence')
save('reward-collect',.69,[(0,293,.6,.24,'pluck'),(.08,440,.5,.20,'jade'),(.16,587,.5,.16,'pluck')],.46,'Warm descending-to-resolved treasury receipt')
save('reel-silk-roll',.64,[(0,185,.4,.16,'wood'),(.30,185,.32,.11,'wood')],.24,'Low silky cabinet mechanism, smooth repeating bed',.40)
for i in range(5):save(f'reel-stop-{i}',.19,[(0,250+i*27,.16,.3,'wood'),(.017,400+i*32,.17,.1,'jade')],.34,'Soft mechanical catch, lightly stepped pitch')
save('feature-lantern-rise',1.20,[(.06+i*.13,330*2**(n/12),.55,.2,'pluck') for i,n in enumerate([0,2,7,9,12])],.47,'Warm luminous lantern reveal',.19)
manifest=json.loads((ROOT/'docs/audio-score-manifest.json').read_text()); byname={r['asset']:r for r in records}
for key in ['tracks','foley']:
 manifest[key]=[{**r,**{k:v for k,v in byname.get(r['asset'],{}).items() if k not in ('before','after')}} for r in manifest[key]]
known={r['asset'] for k in ['tracks','foley'] for r in manifest[k]}
manifest['foley'] += [{k:v for k,v in r.items() if k not in ('before','after')} for r in records if r['asset'] not in known]
manifest['date']='2026-10-09'; manifest['soundDesign']='material-phrases-20261009; BGM preserved'
(ROOT/'docs/audio-score-manifest.json').write_text(json.dumps(manifest,indent=2))
# Preserve the authentic older music regression. New effects have a NEW source
# baseline; do not claim old before/after deltas for a replaced composition.
report=json.loads((ROOT/'docs/audio-warmth-regression.json').read_text()); old={r['asset']:r for r in report['items']}
for r in records:
 old[r['asset']]={'asset':r['asset'],'sha256':r['sha256'],'before':r['before'],'after':r['after'],'baseline':r['source'],'above1800Reduction':1-r['after']['above1800']/max(r['before']['above1800'],1e-12)}
report['items']=list(old.values()); report['date']='2026-10-09'; report['soundDesign']='material-phrases-20261009'
(ROOT/'docs/audio-warmth-regression.json').write_text(json.dumps(report,indent=2))
print('Prepared',len(records),'material/phrase cues; retained existing BGM. Max high band:',max(r['after']['above1800'] for r in records))
