"""Actual exported PCM checks; separate from musical/listening judgement."""
import os
from pathlib import Path
import json,wave,hashlib
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
p=json.loads((ROOT/'docs/audio-provenance.json').read_text());checks=[]
for spec in p['clips']:
 f=ROOT/'assets/resources/audio'/(spec['name']+'.wav')
 with wave.open(str(f),'rb') as w:
  assert (w.getsampwidth(),w.getframerate(),w.getnchannels())==(2,32000,2),f
  x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,2)/32768
  duration=len(x)/w.getframerate()
 peak=float(abs(x).max());rms=float(np.sqrt(np.mean(x*x)))
 assert len(x)>100 and rms>.001 and peak<.70,(f,peak,rms)
 assert abs(duration-spec['duration'])<.0001,(f,duration)
 assert hashlib.sha256(f.read_bytes()).hexdigest()==spec['sha256'],f
 seam=float(abs(x[-1]-x[0]).max())
 if spec['loop']:assert seam<.0001,(f,seam)
 checks.append({'name':spec['name'],'seconds':round(duration,4),'peak':round(peak,5),'rms':round(rms,5),'clippedSamples':int(np.sum(abs(x)>=.999)),'loopSeamDelta':seam if spec['loop'] else None})
assert len(checks)==90
out=Path(os.environ.get('QA_OUTPUT',ROOT/'docs/qa/audio-20261012'));out.mkdir(parents=True,exist_ok=True)
(out/'signal-audit.json').write_text(json.dumps({'checks':checks,'method':'Final 16-bit stereo WAV PCM: duration, non-silence, peak, clipping, boundary and hash. Not a listening or device-output test.'},indent=2)+'\n')
print('PASS 90 PCM files; six loop boundaries. Listening remains separate.')
