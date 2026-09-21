"""Pack the original six-control cutout into a small, padded runtime atlas."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Image.open(root / 'output/imagegen/helm-controls-alpha.png').convert('RGBA')
atlas = Image.new('RGBA', (1024, 768))
for i, name in enumerate(('captain', 'pearl', 'cargo', 'reef', 'auto', 'turbo')):
    x, y = i % 2 * 512, i // 2 * 512
    cell = source.crop((x, y, x + 512, y + 512))
    bounds = cell.getchannel('A').getbbox()
    if bounds is None:
        raise ValueError(f'Missing control: {name}')
    cut = cell.crop(bounds)
    cut.thumbnail((488, 240), Image.Resampling.LANCZOS)
    atlas.alpha_composite(cut, (x + (512 - cut.width) // 2, i // 2 * 256 + (256 - cut.height) // 2))
    print(name, bounds, cut.size)
atlas.save(root / 'assets/resources/art/helm-controls.png', optimize=True)
