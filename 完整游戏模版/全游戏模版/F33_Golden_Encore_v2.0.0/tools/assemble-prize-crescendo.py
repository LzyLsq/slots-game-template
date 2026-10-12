"""Isolate the actual CC Switch VFX atlas; crop/rotate/contain only, no repaint."""
from pathlib import Path
from datetime import datetime
import hashlib,json,uuid
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/resources/art'; SRC=ROOT/'output/generation/prize-crescendo-vfx.png'
MANIFEST=ROOT/'docs/prize-crescendo-source.json'; PROV=ROOT/'docs/ART_PROVENANCE.json'
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
specs=[
 ('fx-prize-jet',(155,0,837,515),(344,748),-42),
 ('fx-prize-streamer',(24,520,1000,808),(1284,148),0),
 ('prize-ingot',(72,812,570,1172),(384,384),0),
 ('prize-jewel-2',(580,812,946,1172),(384,384),0),
 ('prize-jewel-0',(48,1180,344,1510),(384,384),0),
 ('prize-jewel-1',(365,1180,663,1510),(384,384),0),
 ('prize-jewel-3',(685,1180,975,1510),(384,384),0),
]
source=Image.open(SRC).convert('RGBA'); entries=[]
metaTemplate=json.loads((ART/'fx-prize-firework.png.meta').read_text())
response=json.loads((ROOT/'output/generation/prize-crescendo-requests/vfx.response.json').read_text()) if not MANIFEST.exists() else None
info=json.loads(MANIFEST.read_text()) if MANIFEST.exists() else dict(response_id=response['id'],bridge='Local CC Switch',request_model='gpt-5.6-sol',image_tool='gpt-image-2',quality='high',source=str(SRC.relative_to(ROOT)),source_sha256=digest(SRC))
for name,box,size,rotate in specs:
 im=source.crop(box)
 # Generated near-zero alpha noise is not an opaque shadow/corner. Preserve
 # luminous fractional alpha everywhere above that quantization floor.
 alpha=im.getchannel('A').point(lambda v:0 if v<=2 else v); im.putalpha(alpha)
 if rotate: im=im.rotate(rotate,resample=Image.Resampling.BICUBIC,expand=True)
 bbox=im.getchannel('A').getbbox();im=im.crop(bbox)
 im.thumbnail((size[0]-16,size[1]-16),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',size);out.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
 path=ART/f'{name}.png';out.save(path,optimize=True)
 meta=path.with_suffix('.png.meta')
 if not meta.exists():
  data=json.loads(json.dumps(metaTemplate));old=data['uuid'];new=str(uuid.uuid4());
  text=json.dumps(data).replace(old,new).replace('fx-prize-firework',name)
  meta.write_text(json.dumps(json.loads(text),ensure_ascii=False,indent=2)+'\n')
 entries.append(dict(asset=path.name,sha256=digest(path),**info,prompt=(ROOT/'docs/prompts/prize-crescendo-vfx.txt').read_text(),crop_box=list(box),rotation=rotate,generated_at=datetime.now().astimezone().isoformat(),derivation='Separate alpha atlas component; remove <=2/255 alpha noise, source-preserving rigid rotation and uniform contain with 8px safety gutter. No vector drawing, repainting or stretched jewels.'))
provenance=json.loads(PROV.read_text());names={e['asset'] for e in entries}
provenance['assets']=[e for e in provenance['assets'] if e.get('asset') not in names]+entries
PROV.write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n');MANIFEST.write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(entries),'CC Switch sprites with true alpha and source/crop hashes')
