from finish_registered_art import ART,WORK,IDS,edit
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
# Request a proportionally registered reference. Enlargement/cropping then
# restores the entire original 1024x1536 central room without resampling it.
def extend(id):
 if (ART/(id+'-room-extended.png')).exists():return
 original=Image.open(ART/(id+'-room-center.png')).convert('RGBA')
 canvas=Image.new('RGBA',(1024,1536));canvas.alpha_composite(original.resize((682,1024),Image.Resampling.LANCZOS),(171,256))
 canvas.save(WORK/(id+'-extended-reference.png'))
 result=edit(id+'-extended-room',canvas,'Complete only the transparent outside of this exact reference into ONE continuous bright premium musical palace interior. Keep the existing centered room at its exact location and proportions. Extend architecture above and the SAME marble floor below, seamlessly continue lighting and perspective at the four edges. No new cabinet, no new character, no text, no vignette, no black shadow. Foreground is a reflective warm marble concert floor. Rich elegant gold architecture, cheerful light, not dark. Preserve the reference room.').resize((1536,2304),Image.Resampling.LANCZOS)
 result.alpha_composite(original,(256,384));result.convert('RGB').save(ART/(id+'-room-extended.png'))
 print(id+' extended room ready',flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(extend,IDS))
