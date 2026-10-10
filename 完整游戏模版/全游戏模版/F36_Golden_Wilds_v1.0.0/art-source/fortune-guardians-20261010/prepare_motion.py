from pathlib import Path
from PIL import Image,ImageDraw
import json
P=Path(__file__).resolve().parent
chars=json.loads((P/'characters.json').read_text());jobs=[]
sequence='''12 poses in reading order, left to right, row by row:
0 neutral relaxed open eyes, right hand beside ingot.
1 right elbow bends slightly, right hand rises a little; head starts a tiny friendly nod.
2 right hand rises to shoulder height; wrist turns palm slightly toward viewer; left ingot stays supported.
3 right hand raised, fingers gently open in welcome; head nods, friendly smile.
4 same raised hand; eyes gently CLOSE for one natural blink.
5 eyes OPEN; right fingers gently CURL toward himself in a traditional prosperity beckoning gesture.
6 fingers reopen; wrist bends gently forward again; head tilts slightly in welcome.
7 fingers curl gently again, second prosperity beckon; ingot is lifted just a little with the LEFT hand.
8 wrist returns, hand descends a little; head begins returning upright.
9 right arm returns to chest height; left ingot lowers back to its neutral position.
10 right hand almost back beside ingot; head and eyes are neutral.
11 EXACT SAME neutral pose as cell 0, seamless loop.'''
for mode,(name,y,char) in chars.items():
 h=1440-y;w=768
 original=Image.open(P/'output/imagegen'/f'{mode}-panel.png').convert('RGB').resize((1024,h),Image.Resampling.LANCZOS)
 original.save(P/f'{mode}-panel-normalized.png')
 tile=original.crop((128,0,896,h));tile.save(P/f'{mode}-animation-reference.png')
 sheet=Image.new('RGB',(w*4,h*3));mask=Image.new('RGBA',sheet.size,(255,255,255,255));d=ImageDraw.Draw(mask)
 for i in range(12):
  x=(i%4)*w;yy=(i//4)*h;sheet.paste(tile,(x,yy));d.rectangle((x+100,yy+14,x+w-100,yy+h-48),fill=(0,0,0,0))
 sheet.save(P/f'{mode}-pose-input.png');mask.save(P/f'{mode}-pose-mask.png')
 prompt=f'''Create a production animation sprite sheet from this 4 COLUMN × 3 ROW exact grid. It contains twelve repeated copies of ONE integrated treasury fascia, not twelve different people. Redraw ONLY the central living human character into consecutive actual poses. Character: {char}. Preserve EXACT identity, face, costume, style, scales, crown, gold ingot, camera and position from the reference. The ONE character appears once in every cell. Do not merge cells, add borders, leave gutters or print numbers.
{sequence}
Important: draw genuine anatomical gesture changes, forearm bending about the elbow, hand turning at wrist, fingers beckoning, eyes blinking and a slight natural head nod. NEVER simply scale, enlarge, shrink, rotate, sway, translate or warp the whole image. The seated torso remains anchored. Keep motion smooth and connected between neighboring poses. All fingers, hands and the crown remain INSIDE each cell and below its horizontal top rail. Modest movement amplitude, about 30-45 source pixels at the raised hand. Keep the cabinet structural frame, carved gold, floor, coin piles, gems and all background pixels absolutely locked in every cell. Matching ground contact, shadows, gold light and perspective, exquisite commercial illustrated 3D game quality. Exactly two arms and two hands per person, no ghost hands, no repeated limbs, no motion blur, no faded overlays, no added animals, no text, no sparkles hiding anatomy. This is one physical scene repeated in time. Rendering and lighting must stay consistent. Size is {w*4}×{h*3}, each cell {w}×{h}.'''
 (P/f'{mode}-pose-prompt.txt').write_text(prompt)
 jobs.append({'id':mode+'-poses','image':str(P/f'{mode}-pose-input.png'),'mask':str(P/f'{mode}-pose-mask.png'),'prompt':str(P/f'{mode}-pose-prompt.txt'),'size':f'{w*4}x{h*3}','out':str(P/'output/imagegen'/f'{mode}-poses.png')})
(P/'pose-jobs.json').write_text(json.dumps(jobs,indent=2))
