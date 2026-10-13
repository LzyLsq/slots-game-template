"""Original F42 scores. Offline acoustic instrument rendering, no downloaded songs."""
import json,math
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'art-source';out.mkdir(exist_ok=True)
scores=[];loops={}
def score(name,duration):
 s=dict(name=name,duration=duration,notes=[]);scores.append(s);return s

def note(s,program,pitch,at,duration=.25,velocity=42,pan=0,percussion=False):
 s['notes'].append(dict(program=program,pitch=pitch,at=round(at,5),duration=round(duration,5),velocity=velocity,pan=pan,percussion=percussion))
# Five independent melodic/harmonic arrangements, not one song sped up.
themes={
'lobby':dict(bpm=96,beats=4,key=67,melody=[[0,4,7,9],[7,4,2,0],[4,7,11,9],[7,2,4,0],[9,7,4,2],[4,2,0,-3],[2,4,7,4],[2,0,-1,0]],chords=[[0,4,7],[-5,-1,2],[-3,0,4],[-7,-3,0]],lead=0,comp=24),
 'tiger':dict(bpm=108,beats=4,key=62,melody=[[0,0,4,7],[9,7,4,2],[4,7,4,0],[2,4,2,-1],[0,4,7,11],[9,7,9,4],[4,2,4,7],[2,-1,2,0]],chords=[[0,4,7],[-3,0,4],[-5,-1,2],[-7,-3,0]],lead=24,comp=0),
 'koi':dict(bpm=92,beats=3,key=65,melody=[[0,4,7],[9,7,4],[2,4,5],[7,4,2],[4,7,9],[11,9,7],[5,4,2],[4,2,0]],chords=[[0,4,7],[-5,-1,2],[-7,-3,0],[-3,0,4]],lead=46,comp=24),
 'crane':dict(bpm=104,beats=3,key=70,melody=[[7,4,0],[2,5,9],[7,11,9],[7,4,2],[0,4,9],[7,5,2],[4,2,-1],[2,7,0]],chords=[[0,4,7],[-5,-1,2],[-3,0,4],[-7,-3,0]],lead=0,comp=46)
,'tortoise':dict(bpm=100,beats=4,key=60,melody=[[0,4,5,7],[9,7,5,4],[2,5,4,2],[0,2,4,7],[9,12,9,7],[5,7,4,2],[4,5,7,4],[2,-1,2,0]],chords=[[0,4,7],[-7,-3,0],[-5,-1,2],[-3,0,4]],lead=24,comp=46)
}
for name,t in themes.items():
 beat=60/t['bpm'];length=16*t['beats']*beat;s=score('music-'+name,length+.6);loops[s['name']]=length
 for bar in range(16):
  melody=t['melody'][bar%8];chord=t['chords'][bar%4];at=bar*t['beats']*beat
  for k,interval in enumerate(melody):
   velocity=42 if k==0 else 35
   note(s,t['lead'],t['key']+interval,at+k*beat+.008*(k%2),beat*.64,velocity,-.10)
   if bar>=8 and k==len(melody)-1:note(s,t['lead'],t['key']+interval+2,at+(k+.72)*beat,beat*.18,26,-.10)
  # low supportive, soft separated accompaniment; no competing melody.
  note(s,42,t['key']-24+chord[0],at,beat*1.7,31,.15)
  for k in range(t['beats']):
   for interval in chord[1:]:note(s,t['comp'],t['key']-12+interval,at+k*beat+.03,beat*.35,22,.25)
   if name=='koi':note(s,46,t['key']+chord[k%3],at+(k+.5)*beat,beat*.28,18,-.25)
   note(s,0,37 if k==0 else 42,at+k*beat,beat*.12,14,0,True)
# Distinct tactile feedback recordings. No bright oscillator beeps.
for name,program,pitches,length in [('tap',115,[55],.13),('select',24,[55,62],.25),('bet',11,[55,60],.24),('toggle',24,[60,67],.22),('confirm',46,[60,64,67],.65),('error',115,[48,43],.30),('spin',115,[48,52,48,55],.45),('stop',115,[60],.15),('coin',11,[67,74,79],.48),('collect',46,[60,64,67,72],.8),('feature',46,[60,64,67,72,76,79],1.4)]:
 s=score('fx-'+name,length+.25)
 for i,p in enumerate(pitches):note(s,program,p,i*(length*.6/max(1,len(pitches))),.10 if name in ['tap','stop','spin'] else .24,48 if name=='tap' else 40)
for name,t in themes.items():
 for tier,relative,length in [('normal',[0,7,12],.75),('big',[0,4,7,12,7,9,7,12],2.6),('super',[0,4,7,12,14,16,19,16,14,12,7,12],4.0),('mega',[0,7,12,4,9,14,7,12,16,19,16,14,12,16,19,24],5.2)]:
  s=score('award-'+name+'-'+tier,length+.45);step=length/len(relative)
  for i,p in enumerate(relative):
   note(s,46 if tier in ['normal','big'] else 0,t['key']+p-12,i*step,step*.8,40 if tier=='normal' else 52,-.15)
   if tier in ['super','mega'] and i%3==0:
    for c in [0,4,7]:note(s,48,t['key']-12+c,i*step,step*2.1,25,.20)
  if tier=='mega':
   for c in [0,4,7]:note(s,0,t['key']+c,length-.35,.6,38)
(out/'scores.json').write_text(json.dumps(scores));(out/'audio-loops.json').write_text(json.dumps(loops));print('Composed',len(scores),'separate original recordings')
