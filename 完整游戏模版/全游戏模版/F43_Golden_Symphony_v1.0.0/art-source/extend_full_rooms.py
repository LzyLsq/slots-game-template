from finish_registered_art import ART,WORK,IDS,edit
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
# Registered 2x room provides mobile/tablet overscan without rectangular re-pastes.
def extend(id):
 dst=ART/(id+'-room-full.png')
 if dst.exists():return
 original=Image.open(ART/(id+'-room-center.png')).convert('RGBA')
 canvas=Image.new('RGBA',(1024,1536));canvas.alpha_composite(original.resize((512,768),Image.Resampling.LANCZOS),(256,384))
 result=edit(id+'-full-room',canvas,'Complete ONLY the transparent outside into ONE continuous bright premium musical palace interior. The exact centered original room must keep its position, proportions, lighting, camera and floor perspective. Extend matching architecture above, the SAME gold-trimmed marble floor below, and walls on both sides. Seamless four edges. No new cabinets, no characters, no lettering, no dark vignette, no black corners. Warm champagne light, joyful wealthy concert palace.').resize((2048,3072),Image.Resampling.LANCZOS)
 result.convert('RGB').save(dst)
 print(id+' full room ready',flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(extend,IDS))
