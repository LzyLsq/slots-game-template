"""Slender original music cabinet wordmarks commissioned via local CC Switch."""
from finish_registered_art import edit,ART
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
NAMES=['GOLDEN STRINGS','SAPPHIRE HARP','RUBY BRASS','PEARL RHYTHM']
MATERIALS=['amber gold carved violin lettering','sapphire blue enamel in fine gold harp edging','ruby red enamel and warm gold brass edging','ivory pearl enamel and fine warm gold edging']
def run(i):
 im=Image.open(ART/f'canopy-title-{i}.png').convert('RGBA')
 result=edit(f'slim-marquee-{i}',im,f'Create one NEW extremely SLENDER single-line premium casino cabinet wordmark based on this exact title material: the only text is {NAMES[i]}. Uppercase engraved letters in {MATERIALS[i]}, legible clean letterforms. A 10:1 horizontal painted wordmark, letters fill the silhouette height. Wide classical capital letters, generous precise spacing, tiny gold bevels and crisp highlights. No top or bottom flourishes, NO large instruments, NO frame, NO subtitle, NO vertical decorations, NO second line. Transparent background around lettering. Center the horizontal title across almost the full width of this canvas. Keep the beautiful musical-palace luxury material. All visible ink must lie in a very narrow central horizontal strip. This title goes in a real very shallow cabinet marquee.','1536x1024')
 result.save(ART/f'marquee-title-{i}.png',optimize=True)
 print(f'marquee-{i} ready',flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(run,range(4)))
