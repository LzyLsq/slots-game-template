"""Guard against neighbouring art bleeding into runtime's 3x4 atlas slices."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
for game in ('game02', 'game03', 'game04'):
    image = Image.open(root / 'assets/resources/generated' / game / 'symbol_atlas_f11.png')
    assert image.size == (1152, 1536), (game, image.size)
    alpha = image.getchannel('A')
    for index in range(12):
        x, y = index % 3 * 384, index // 3 * 384
        bounds = alpha.crop((x, y, x + 384, y + 384)).getbbox()
        if index < 9:
            assert bounds and min(bounds[0], bounds[1], 384-bounds[2], 384-bounds[3]) >= 30, (game, index, bounds)
        else:
            assert bounds is None, (game, index, 'unexpected artwork')
    print(f'{game}: 9 isolated symbols; transparent gutters and reserved row PASS')
