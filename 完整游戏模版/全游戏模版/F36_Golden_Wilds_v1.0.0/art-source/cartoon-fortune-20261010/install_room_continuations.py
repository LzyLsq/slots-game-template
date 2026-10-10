"""Install commissioned ceiling/floor continuation; preserve the entire room.
Run after install_cartoon_motion.py. The original room's world origin is fixed;
adding the same number of pixels at both ends never moves cabinet coordinates.
"""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageOps,ImageDraw
HERE=Path(__file__).resolve().parent
PROJECT=HERE.parent.parent
ART=PROJECT/'assets/resources/art'
reports=[]
review=Image.new('RGB',(1024,1280))
for index,mode in enumerate(['sun-lion','emerald-elephant','lotus-koi','moon-fox']):
 old=Image.open(HERE/'room-continuations'/f'{mode}-before.png').convert('RGB')
 generated=Image.open(HERE/'output/imagegen'/f'{mode}-continuation.png').convert('RGB')
 raw_size=generated.size
 continuation=generated.resize((1024,2560),Image.Resampling.LANCZOS)
 # Source pixels remain exact, including the animated panel's neutral background.
 continuation.paste(old,(0,256))
 assert continuation.crop((0,256,1024,2304)).tobytes()==old.tobytes()
 path=ART/f'{mode}-extended.png';continuation.save(path,optimize=True)
 reports.append({'mode':mode,'providerOutputSize':raw_size,'installedSize':[1024,2560],
                 'sourceRoomOffset':256,'original1536RoomOffset':512,
                 'unchangedMiddleRoom':True,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 thumb=continuation.copy();thumb.thumbnail((256,1250));review.paste(thumb,(index*256,25));ImageDraw.Draw(review).text((index*256+5,5),mode,fill='white')
review.save(HERE/'room-continuation-review.jpg')
(HERE/'room-continuations/installation.json').write_text(json.dumps({'date':'2026-10-10','rooms':reports},indent=2)+'\n')
print(json.dumps(reports,indent=2))
