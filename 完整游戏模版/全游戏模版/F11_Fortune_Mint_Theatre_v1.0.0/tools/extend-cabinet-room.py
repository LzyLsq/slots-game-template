"""Prepare an outpaint target or preserve its exact original cabinet center."""
import argparse
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('mode', choices=['prepare', 'compose'])
p.add_argument('original')
p.add_argument('output')
p.add_argument('--generated')
a = p.parse_args()
original = Image.open(a.original).convert('RGB')
width, height = 1536, 2560
x, y = (width-original.width)//2, (height-original.height)//2
if a.mode == 'prepare':
    canvas = Image.new('RGB', (width, height), (24, 24, 24))
    canvas.paste(original, (x, y))
else:
    canvas = Image.open(a.generated).convert('RGB')
    if abs(canvas.width / canvas.height - width / height) > 0.002:
        raise SystemExit(f'Unexpected generated aspect ratio: {canvas.size}')
    # The local provider can return a uniformly downsampled image. Restore
    # the requested canvas, then replace the cabinet with full-resolution art.
    canvas = canvas.resize((width, height), Image.Resampling.LANCZOS)
    # Only the outermost architectural edge blends; the cabinet is untouched.
    mask = Image.new('L', original.size, 255)
    pixels = mask.load()
    for py in range(original.height):
        for px in range(original.width):
            edge = min(px, py, original.width-1-px, original.height-1-py)
            if edge < 16:
                pixels[px, py] = round(255*edge/16)
    canvas.paste(original, (x, y), mask)
canvas.save(a.output, optimize=True)
print(a.output)
