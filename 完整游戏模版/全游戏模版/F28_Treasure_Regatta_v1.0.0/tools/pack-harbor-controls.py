"""Pack original CC Switch cutouts without distorting any control's silhouette."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'output/imagegen/harbor-controls-alpha.png').convert('RGBA')
atlas = Image.new('RGBA', (1536, 1024))

def remove_charcoal_halo(image: Image.Image) -> Image.Image:
    """Remove only the dark semi-transparent drop halo around a cutout.

    The opaque illustrated bevel remains untouched. This prevents the outer
    antialias fringe from becoming a black bar when the enamel centre is
    nine-sliced to different lobby widths.
    """
    cleaned = image.copy()
    pixels = cleaned.load()
    for y in range(cleaned.height):
        for x in range(cleaned.width):
            r, g, b, a = pixels[x, y]
            if not a or a >= 252:
                continue
            luminance = (r * 54 + g * 183 + b * 19) / 256
            if luminance >= 118:
                continue
            fringe = (252 - a) / 251
            darkness = (118 - luminance) / 118
            attenuation = min(.94, (.20 + fringe * .92) * darkness * .88)
            pixels[x, y] = (r, g, b, round(a * (1 - attenuation)))
    return cleaned

for index in range(12):
    col, row = index % 3, index // 3
    crop = source.crop((round(col * source.width / 3), round(row * source.height / 4),
                        round((col + 1) * source.width / 3), round((row + 1) * source.height / 4)))
    bounds = crop.getchannel('A').getbbox()
    if bounds is None:
        raise ValueError(f'Empty control {index}')
    sprite = ImageOps.contain(crop.crop(bounds), (488, 240), Image.Resampling.LANCZOS)
    sprite = remove_charcoal_halo(sprite)
    atlas.alpha_composite(sprite, (col * 512 + (512 - sprite.width) // 2,
                                   row * 256 + (256 - sprite.height) // 2))
    print(index, bounds, sprite.size)
atlas.save(ROOT / 'assets/resources/art/harbor-controls.png', optimize=True)
