from pathlib import Path
import struct,wave,json,subprocess,numpy as np
R=Path(__file__).resolve().parents[1];out=R/'assets/audio';out.mkdir(exist_ok=True,parents=True);loops=json.loads((R/'art-source/audio-loops.json').read_text());report={}
def read(path):
 data=path.read_bytes();pos=12;fmt=None;raw=None
 while pos+8<=len(data):
  k=data[pos:pos+4];n=struct.unpack('<I',data[pos+4:pos+8])[0];chunk=data[pos+8:pos+8+n];pos+=8+n+(n%2)
  if k==b'fmt ':fmt=struct.unpack('<HHIIHH',chunk[:16])
  if k==b'data':raw=chunk
 typ,channels,rate,_,_,bits=fmt
 if typ==3 and bits==32:return np.frombuffer(raw,dtype='<f4').reshape(-1,channels).copy(),rate
 raise ValueError(fmt)
for src in sorted((R/'art-source/audio-raw').glob('*.wav')):
 name=src.stem;x,rate=read(src);x-=x.mean(0);is_loop=name in loops
 # Gentle room reflections, with no synth oscillators or harsh bells.
 dry=x.copy()
 for delay,gain in [(.044,.08),(.091,.055),(.149,.035)]:
  shift=int(delay*rate);x[shift:]+=dry[:-shift,::-1]*gain
 if is_loop:
  n=round(loops[name]*rate)
  if len(x)>n:
   tail=x[n:];k=min(len(tail),n);x[:k]+=tail[:k]
  x=x[:n]
  # Smooth very short zero seam, avoids percussion-like ticks at restart.
  nfade=int(rate*.008);x[:nfade]*=np.linspace(0,1,nfade)[:,None];x[-nfade:]*=np.linspace(1,0,nfade)[:,None]
 else:
  nfade=int(rate*.007);x[:nfade]*=np.linspace(0,1,nfade)[:,None];k=min(int(rate*.15),len(x));x[-k:]*=np.linspace(1,0,k)[:,None]
 rms=float(np.sqrt(np.mean(x*x)));target=.115 if is_loop else .12 if name.startswith('award') else .1
 gain=min(target/max(rms,1e-9),.65/max(np.max(np.abs(x)),1e-9));x*=gain
 # Saturation avoids clipping without adding a sharp transient.
 x=np.tanh(x*1.05)/1.05
 temp=R/'art-source/audio-raw'/('master-'+name+'.wav')
 with wave.open(str(temp),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes((x*32767).astype('<i2').tobytes())
 subprocess.run(['/usr/bin/afconvert',str(temp),str(out/(name+'.m4a')),'-f','m4af','-d','aac','-b','96000'],check=True,capture_output=True);temp.unlink()
 report[name]={'seconds':len(x)/rate,'peak':round(float(np.max(np.abs(x))),5),'rms':round(float(np.sqrt(np.mean(x*x))),5),'bytes':(out/(name+'.m4a')).stat().st_size,'loop':is_loop}
(out/'manifest.json').write_text(json.dumps(report,indent=2));print('Mastered',len(report),'recordings')
