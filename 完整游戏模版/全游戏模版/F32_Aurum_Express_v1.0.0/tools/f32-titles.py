#!/usr/bin/env python3
"""High-resolution rasterized Art Deco typographic engravings for dynamic sprite titles."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[1]/'assets/resources/art'
FONT='/System/Library/Fonts/Supplemental/Copperplate.ttc'
TITLES={
'f32-brand-title':'AURUM EXPRESS',
'f32-title-coin-carousel':'ROULETTE RAIL',
'f32-title-lantern-vault':'GOLDEN SLEEPER',
'f32-title-lucky-parade':'HIGH ROLLER',
'f32-title-celestial-mint':'JACKPOT ENGINE',
'f32-heading-store':'THE GOLD EXCHANGE',
'f32-heading-rewards':'DAILY FORTUNE',
'f32-heading-rank':'HIGH ROLLERS',
'f32-heading-profile':'PLAYER PASSPORT',
'f32-win-big':'BIG WIN',
'f32-win-mega':'MEGA WIN',
'f32-win-epic':'SUPER JACKPOT',
}
for name,label in TITLES.items():
    width,height=(1536,326) if name=='f32-brand-title' else (1180,220)
    im=Image.new('RGBA',(width,height));font_size=168 if name=='f32-brand-title' else 130
    while True:
        font=ImageFont.truetype(FONT,font_size)
        bb=ImageDraw.Draw(im).textbbox((0,0),label,font=font,stroke_width=2)
        if bb[2]-bb[0]<width*.90:break
        font_size-=4
    x=(width-(bb[2]-bb[0]))//2-bb[0];y=(height-(bb[3]-bb[1]))//2-bb[1]-2
    mask=Image.new('L',(width,height));d=ImageDraw.Draw(mask);d.text((x,y),label,font=font,fill=255,stroke_width=2)
    gold=Image.new('RGBA',(width,height));p=gold.load()
    for row in range(height):
        t=row/height
        col=(255,242,186) if t<.4 else (221,157,64) if t<.68 else (255,220,133)
        for colx in range(width):p[colx,row]=(*col,255)
    gold.putalpha(mask)
    shadow=Image.new('RGBA',(width,height));shade=Image.new('RGBA',(width,height),(10,13,28,0));shade.putalpha(mask.filter(ImageFilter.GaussianBlur(12)));shadow.alpha_composite(shade,(0,8));shadow.alpha_composite(gold)
    # Retain thin hand-engraved highlight; no rectangular title plate.
    draw=ImageDraw.Draw(shadow)
    draw.line((width*.035,height*.54,width*.11,height*.54),fill=(255,222,157,190),width=3)
    draw.line((width*.89,height*.54,width*.965,height*.54),fill=(255,222,157,190),width=3)
    shadow.save(ROOT/(name+'.png'),optimize=True)
print('F32 image titles ready')
