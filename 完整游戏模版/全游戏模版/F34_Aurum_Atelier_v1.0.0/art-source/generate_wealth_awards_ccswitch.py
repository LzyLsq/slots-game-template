"""Original four-mode wealth stages and award lettering via the local CC Switch provider.
Reuses the project's established image transport; credentials remain in CC Switch.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from PIL import Image
from generate_ccswitch import ART, ROOT, generate, provider

COMPOSITION = '''A complete luxury prize celebration ROOM, not a slot cabinet, not a frame or collage. Portrait 2:3 image. One coherent eye-level architectural scene, symmetrical and naturally lit, with beautiful depth. Central treasure on an elegant pedestal occupying y=34%-64%. Rich abundant gold coins and jewels naturally spilling down the pedestal and along the sides. The foreground includes ONE wide blank ivory enamel number plaque physically inset into a polished gold-edged plinth, precisely centered at x=50%, y=76%, width=51%, height=8%; leave its entire face clean and empty for the live payout number. The very top y=7%-28% is calm luxurious architectural wall with no objects overlapping the later title. The lower y=85%-97% is a clear continuous warm marble step for the game's continue button. All essential shapes lie in the central 64% horizontal region, since phone screens crop the sides. Columns, sconces and foreground coins continue naturally to all image edges, no vignette, no black background. Rich warm bounced light, fine jewelry photography quality, believable brushed metal, translucent cut jewels, sharp precise details, elegant cinematic prize reveal. No text, no letters, no digits, no UI buttons, no empty transparent holes, no generic prize bars, no reels, no separate floating symbols, no confetti. The treasure must feel monumental and tangible. '''
THEMES = {
 'coin': 'COIN ENGRAVER celebration: a monumental open minted-gold treasury chest overflowing with intricate newly engraved coins. Warm cream travertine, champagne gold arcade, dark olive enamel accents, embossed fox cameo relief in the plinth, luminous afternoon atelier light. No live animals.',
 'sapphire': 'SAPPHIRE FACETER celebration: a monumental brilliant-cut deep blue sapphire rising from an open satin-gold jewelry casket surrounded by diamond facets and gold coins. Pale blue veined marble, sapphire enamel insets and gold atelier columns, gentle cool-blue refractions in warm sunlight, carved owl cameo relief in the plinth. No live animals.',
 'pearl': 'PEARL LOOM celebration: a monumental luminous nacre pearl resting in a beautiful open scallop-shaped rose-gold jewelry casket amid strands of pearls and overflowing gold coins. Warm ivory stone, shell carvings, champagne and rose gold, soft peach reflected light, sculpted swan cameo relief in the plinth. No live animals.',
 'ruby': 'CROWN FOUNDRY celebration: a magnificent royal gold crown with a deep red ruby on a velvet-lined treasure casket, plenty of minted coins and fine garnets. Warm caramel marble, ruby enamel and forged gold columns, regal warm theatrical illumination, sculpted lion cameo relief in the plinth. No live animals.'
}
TASKS = {f'award-{theme}-room': COMPOSITION + details for theme, details in THEMES.items()}
for tier, words in [('big','BIG WIN'), ('super','SUPER BIG WIN'), ('mega','MEGA WIN'), ('epic','EPIC WIN')]:
 TASKS['award-title-'+tier] = f'''A single isolated luxury game award WORDMARK with the exact words "{words}". Verbatim English lettering, all capitals, perfectly readable. Sculpted dimensional champagne-gold typography, polished bevels, subtle engraved face, dark warm bronze inner shadow, soft ivory edge reflections. The words are the primary silhouette, not written on a rectangular button or a plaque. Elegant small jewelry crown and coin branches organically merged with the upper and side strokes, restrained crimson and sapphire gemstones, refined not cluttered. Symmetrical front-on composition, wide horizontal wordmark filling x=6%-94%, centered y=50%, overall width:height around 3.5:1. {'Use two carefully balanced lines, SUPER above BIG WIN.' if tier=='super' else 'Use one line.'} Actual transparent alpha background, no ground, no outer shadow card, no glow fog, no cast rectangle, no extra text, no watermark. Sharp crafted lettering readable at 300px display width.'''
TASKS['award-coin'] = '''One single isolated engraved gold coin, three-quarter view, slightly tilted to show its milled thickness. Fine embossed sunburst and tiny star crest WITHOUT letters or numbers. Satin champagne gold with crisp polished rim and believable bright reflection, substantial high-quality game collectible, actual transparent alpha background. Centered, fills 80% canvas, no props, no background, no thick glow, no shadow rectangle.'''

def trim(name):
 if name.endswith('-room'): return
 image=Image.open(ART/(name+'.png')).convert('RGBA')
 bounds=image.getchannel('A').getbbox()
 if not bounds: raise ValueError('Generated award has empty alpha')
 # Trim only alpha padding; every final sprite retains its own proportions.
 image=image.crop(bounds)
 image.save(ART/(name+'.png'),optimize=True)

def main():
 url,key=provider()
 prompts=ROOT/'art-source/prompts';prompts.mkdir(parents=True,exist_ok=True)
 for name,prompt in TASKS.items(): (prompts/(name+'.txt')).write_text(prompt)
 with ThreadPoolExecutor(max_workers=3) as pool:
  jobs={pool.submit(generate,name,prompt,url,key):name for name,prompt in TASKS.items()}
  for future in as_completed(jobs):
   name=jobs[future];result=future.result()
   if not result.startswith('FAILED'):trim(name)
   print(result,flush=True)
if __name__=='__main__':main()
