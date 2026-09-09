"""Prepare existing CC Switch artwork for UI use; no drawn replacement icons.

Compact ledgers use the material and straight bevel sections of the original
panels, without squeezing square botanical corner ornaments into a thin bar.
Motion blur is isolated per atlas cell, so adjacent symbols cannot bleed in.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ART = Path(__file__).resolve().parents[1] / 'assets/resources/art'

def main():
    source = Image.open(ART / 'surfaces.png').convert('RGBA')
    ledgers = Image.new('RGBA', (1024, 320))
    for index in range(4):
        tile = source.crop((index % 2 * 512, index // 2 * 512,
                            (index % 2 + 1) * 512, (index // 2 + 1) * 512))
        panel = Image.new('RGBA', (512, 160))
        panel.paste(tile.crop((0, 170, 512, 330)), (0, 0))
        panel.paste(tile.crop((0, 0, 512, 22)), (0, 0))
        panel.paste(tile.crop((0, 490, 512, 512)), (0, 138))
        ledgers.paste(panel, (index % 2 * 512, index // 2 * 160))
    ledgers.save(ART / 'ledgers.png', optimize=True)

    symbols = Image.open(ART / 'symbols.png').convert('RGBA')
    blurred = Image.new('RGBA', symbols.size)
    for index in range(16):
        x, y = index % 4 * 256, index // 4 * 256
        tile = symbols.crop((x, y, x + 256, y + 256))
        # Weighted, symmetric vertical shutter samples. Never rescale matter.
        accum = Image.new('RGBA', (256, 256))
        total = 0
        for offset, weight in [(-24, 1), (-16, 2), (-8, 3), (0, 4), (8, 3), (16, 2), (24, 1)]:
            shifted = Image.new('RGBA', tile.size)
            shifted.paste(tile, (0, offset))
            accum = Image.blend(accum, shifted, weight / (total + weight))
            total += weight
        blurred.paste(accum.filter(ImageFilter.GaussianBlur(.65)), (x, y))
    blurred.save(ART / 'symbols-blur.png', optimize=True)
    print('Prepared compact image ledgers and 16 isolated motion-blur cells.')

if __name__ == '__main__':
    main()
