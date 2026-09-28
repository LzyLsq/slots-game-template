"""Remove neighboring atlas-cell fragments from the authored F33 symbol sheets.

The CC Switch artwork is already in the 4x4 sheets. These measured empty gutters
separate the actual symbol from a sliver of the symbol in the next row. No
symbol is drawn, rescaled, or replaced here. Safe to run more than once.
"""
from pathlib import Path
from PIL import Image

ART = Path(__file__).resolve().parents[1] / 'assets/resources/art'
# Per theme: index -> first fully empty row after the intended object's silhouette.
BOTTOM = {
    'golden-hour': {4: 248, 5: 240, 6: 249, 8: 249, 9: 239, 10: 244, 11: 248},
    'jade-treasury': {4: 240, 5: 239, 6: 235, 8: 233, 9: 230, 10: 233, 11: 237},
    'pearl-palace': {4: 249, 5: 248, 6: 245, 8: 236, 9: 237, 10: 235, 11: 249},
    'ruby-revel': {4: 242, 5: 243, 6: 243, 8: 233, 9: 236, 10: 231, 11: 246},
}

def clean(path: Path, cuts: dict[int, int]) -> None:
    im = Image.open(path).convert('RGBA')
    if im.size != (1024, 1024):
        raise ValueError(f'{path.name}: expected 1024x1024, got {im.size}')
    alpha = im.getchannel('A')
    for index, cutoff in cuts.items():
        x, y = (index % 4) * 256, (index // 4) * 256
        # Source images overflow their requested transparent gutter. The
        # neighboring speck only occupies the tail of this one atlas tile.
        alpha.paste(0, (x, y + cutoff, x + 256, y + 256))
    im.putalpha(alpha)
    im.save(path, optimize=True)

for theme, cuts in BOTTOM.items():
    for suffix in ('', '-blur'):
        clean(ART / f'symbols-{theme}{suffix}.png', cuts)
