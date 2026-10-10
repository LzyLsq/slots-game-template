from pathlib import Path
from PIL import Image,ImageDraw
import json
P=Path(__file__).resolve().parent
chars=json.loads((P/'characters.json').read_text());jobs=[]
# A complete upper-crown patch: x144..880, y0..448 on the 1024x2048 room.
w,h,left,top=736,448,144,0
sequence='''12 consecutive poses, reading order left to right, row by row:
0 neutral cheerful relaxed pose, friendly small OPEN eyes, right hand rests next to the ingot.
1 right elbow bends and hand starts rising, eyes remain open.
2 right hand rises clearly to shoulder height, wrist turns to present the palm.
3 right palm opens facing the viewer, five clear cartoon fingers, friendly welcoming smile.
4 hand stays raised; eyes CLOSE for a natural blink, head nods slightly.
5 eyes open; right fingers curl inward in the traditional Chinese beckoning-for-wealth gesture.
6 fingers reopen, right wrist angles outward a little, left hand keeps supporting the gold ingot.
7 fingers curl inward a second time, left hand gently lifts the ingot only a little.
8 right palm opens again, starts descending, tiny satisfied head nod.
9 right forearm lowers toward ingot, head returns to normal.
10 right hand almost reaches neutral, left ingot settles back.
11 EXACT SAME neutral pose as cell 0 to close the loop.'''
for mode,c in chars.items():
 ref=Image.open(P/f'{mode}-normalized.png').convert('RGB').crop((left,top,left+w,top+h));ref.save(P/f'{mode}-motion-reference.png')
 sheet=Image.new('RGB',(w*4,h*3));mask=Image.new('RGBA',sheet.size,(255,255,255,255));d=ImageDraw.Draw(mask)
 for i in range(12):
  x=i%4*w;y=i//4*h;sheet.paste(ref,(x,y));d.rounded_rectangle((x+90,y+18,x+w-90,y+c['baseline']-18),radius=18,fill=(0,0,0,0))
 sheet.save(P/f'{mode}-pose-input.png');mask.save(P/f'{mode}-pose-mask.png')
 prompt=f'''Create a precise 4 COLUMN x 3 ROW ANIMATION sprite sheet based on the twelve repeated copies in the input. The ONE integrated upper-crown cartoon mascot is: {c['character']}. Redraw only that same character in each cell into genuine consecutive anatomical poses. Preserve the exact same character identity, proportions, crown, costume, art quality, ingot, lighting and cabinet position. It is a charming CARTOON mascot, never a realistic human, photo or lifelike doll.
{sequence}
Actual forearm movement about the elbow, wrist rotations, finger beckoning, eyelid blinking and a tiny neck nod. The robe torso stays anchored behind the cabinet top rail. The full cabinet, marble, metal crest, throne, coins and background remain absolutely FIXED across all frames. Do not scale, rotate, sway or zoom the entire portrait. The hand should travel 45-70 cell pixels clearly but smoothly, without entering neighboring cells. Keep the crown and hands inside x=90..646, y=18..{c['baseline']-18} of every {w}x{h} cell. Exactly one cartoon head, two arms and two hands with five fingers each. No duplicated hands, extra fingers, ghost limbs, faded overlays, motion blur, particles, new text, grid borders or gaps. Match perspective, material reflections and contact shadows to the original. Fixed camera. Final sheet {w*4}x{h*3}, twelve equal cells with NO GUTTERS. Every pose must differ in articulated hand/face action, rather than overall image scaling. Neutral cells 0 and 11 match.'''
 (P/f'{mode}-pose-prompt.txt').write_text(prompt)
 jobs.append({'id':mode+'-poses','image':str(P/f'{mode}-pose-input.png'),'mask':str(P/f'{mode}-pose-mask.png'),'prompt':str(P/f'{mode}-pose-prompt.txt'),'size':f'{w*4}x{h*3}','out':str(P/'output/imagegen'/f'{mode}-poses.png')})
(P/'pose-jobs.json').write_text(json.dumps(jobs,indent=2))
print('Prepared four cartoon gesture sheets')
