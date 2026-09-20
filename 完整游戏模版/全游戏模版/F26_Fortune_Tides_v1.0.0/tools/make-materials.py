"""Deterministic, seamless microtextures. No runtime SVG filters or blur."""
from PIL import Image
import random, math
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'public/art'
r=random.Random(26)
for name,base in [('enamel-grain',(26,91,85)),('ivory-grain',(245,229,192)),('bronze-grain',(164,112,50))]:
 im=Image.new('RGB',(256,256)); pixels=[]
 for y in range(256):
  for x in range(256):
   grain=r.gauss(0,1.6)
   # Periodic layered grain wraps without seams; warm grain resembles cut brass.
   vein=(math.sin(x*math.tau/256*3+math.sin(y*math.tau/256)*1.4)+math.sin(y*math.tau/256*19+x*math.tau/256))*1.4
   if name=='bronze-grain': vein+=math.sin(y*math.tau/256*63)*2
   pixels.append(tuple(max(0,min(255,round(c+grain+vein))) for c in base))
 im.putdata(pixels);im.save(out/(name+'.webp'),lossless=True)
