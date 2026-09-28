"""Install the four CC Switch-generated cabinet paintings without drawing artwork.
Only resize/crop the source paintings for Cocos's atlas and full-height screens.
"""
from pathlib import Path
from PIL import Image

source = Path('/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/images')
art = Path(__file__).resolve().parents[1] / 'assets/resources/art'
names = ('coin-press', 'lantern-ledger', 'cloud-conveyor', 'jubilee-vault')
sheet = Image.new('RGB', (2048, 2048))
for i, name in enumerate(names):
    image = Image.open(source / f'{name}-cabinet-v2.png').convert('RGB')
    image.resize((2048, 4096), Image.Resampling.LANCZOS).save(art / f'{name}-tall.png', optimize=True)
    # A portrait machine is centered in a square showroom tile; the thin room
    # margins are crops of the same authored painting, not painted shapes.
    tile = Image.new('RGB', (1024, 1024))
    backdrop = image.resize((1024, 2048), Image.Resampling.LANCZOS)
    tile.paste(backdrop.crop((0, 512, 1024, 1536)), (0, 0))
    machine = image.resize((512, 1024), Image.Resampling.LANCZOS)
    tile.paste(machine, (256, 0))
    sheet.paste(tile, ((i % 2) * 1024, (i // 2) * 1024))
sheet.save(art / 'foundry-win-machines.png', optimize=True)
print('Installed generated cabinets and matching showroom atlas')
