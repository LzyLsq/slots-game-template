"""macOS AAC decode/peak/loop audit. Requires NumPy; writes no files into audio assets.
Usage: python3 tools/audio-asset-qa.py AUDIO_DIR REPORT_JSON
"""
import sys,json,wave,hashlib,subprocess,tempfile,datetime,re
from pathlib import Path
import numpy as np
root=Path(sys.argv[1]);manifest=json.loads((root/'manifest.json').read_text());report=[]
with tempfile.TemporaryDirectory(prefix='f38-audio-qa-') as tmp:
 for item in manifest['recordings']:
  source=root/(item['name']+'.m4a');decoded=Path(tmp)/(item['name']+'.wav')
  subprocess.run(['/usr/bin/afconvert',str(source),str(decoded),'-f','WAVE','-d','LEI16'],check=True,capture_output=True)
  with wave.open(str(decoded),'rb') as f:
   assert (f.getnchannels(),f.getsampwidth(),f.getframerate())==(2,2,44100),item['name']
   n=f.getnframes();data=np.frombuffer(f.readframes(n),'<i2').reshape(-1,2).astype(np.float64)/32768
  seconds=n/44100;rms=float(np.sqrt(np.mean(data**2)));peak=float(np.max(abs(data)))
  assert abs(seconds-item['seconds'])<.025,(item['name'],'duration',seconds,item['seconds'])
  assert rms>.001 and .015<peak<.88,(item['name'],'silent/clipped',rms,peak)
  result={'name':item['name'],'decodedSeconds':round(seconds,5),'rmsDb':round(20*np.log10(rms),2),'peakDb':round(20*np.log10(peak),2),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
  if re.fullmatch(r'fx-(tap|bet|toggle|navigate|confirm)(-v[12])?',item['name']):
   mono=np.mean(data,axis=1);threshold=peak*10**(-35/20)
   audible=np.flatnonzero(np.max(abs(data),axis=1)>threshold)
   onset=float(audible[0]/44100) if len(audible) else seconds
   power=abs(np.fft.rfft(mono))**2;freq=np.fft.rfftfreq(len(mono),1/44100)
   bright=float(power[freq>4000].sum()/max(power.sum(),1e-12))
   assert seconds<=.20 and onset<.015,(item['name'],'long/late button contact',seconds,onset)
   assert bright<.15,(item['name'],'excessive high-frequency transient',bright)
   result.update(onsetMs=round(onset*1000,2),above4kHzEnergy=round(bright,5))
  if item['kind'] in ['music','award']:
   mono=np.mean(data,axis=1);power=abs(np.fft.rfft(mono))**2;freq=np.fft.rfftfreq(len(mono),1/44100)
   bright=float(power[freq>4000].sum()/max(power.sum(),1e-12))
   assert bright<(.12 if item['kind']=='music' else .22),(item['name'],'excessive treble energy',bright)
   if item['kind']=='music':assert -30<result['rmsDb']<-20,(item['name'],'BGM loudness range',result['rmsDb'])
   result['above4kHzEnergy']=round(bright,6)
  if item['loop']:
   frame=round(item['loop']*44100);assert abs(frame-n)<2
   seam=float(np.max(abs(data[frame-1]-data[0])));assert seam<.025,(item['name'],'loop seam',seam)
   result['loopSeamAmplitude']=round(seam,7)
   assert float(np.sqrt(np.mean(data[:4096]**2)))>.001,(item['name'],'silent loop start')
  report.append(result)
scenes=['crown-club','emerald-fortune','ruby-royale','vault-reserve']
base=['tap','bet','navigate','toggle','confirm','spin','reel-stop','win','big-win','epic-win','reward','collect','error']
expected={f'music-{s}' for s in ['lobby']+scenes}|{f'fx-{c}' for c in base}|{'fx-reel-roll'}|{f'award-{s}-{tier}{ending}' for s in scenes for tier in range(5) for ending in ['', '-resolve']}|{f'fx-{b}-v{v}' for b in base[:5] for v in [1,2]}|{f'fx-cabinet-{s}-{r}' for s in scenes for r in ['spin','reel-stop','reel-roll','collect','feature-entry','feature-step']}
assert {r['name'] for r in report}==expected and len(report)==len(expected)==93
assert len({r['sha256'] for r in report})==93
assert sum(bool(r['loop']) for r in manifest['recordings'])==10
assert len(list(root.glob('*.m4a')))==93, 'orphaned audio assets'
output=Path(sys.argv[2]);output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps({'date':datetime.date.today().isoformat(),'test':'F38: 93 actual AAC files decoded, stereo 44100Hz, duration, non-silence, headroom, distinct payload, loop seams, contact onsets and treble energy. Technical QA, not speaker listening.','tracks':report},indent=2)+'\n')
print('PASS 93 AAC files; ten periodic loops; no orphaned or silent assets; report:',output)
