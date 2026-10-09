"""Build a single cabinet-and-room canvas at the reel coordinate system's scale.

The authored cabinet pixels in the central 1024 x 2304 region are preserved
exactly. Only its outer boundary is extended into the paired workshop room.
This avoids compositing two independently scaled full-screen rooms at runtime.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets' / 'resources' / 'art'
RAW = ROOT / 'art-source' / 'raw'
PAIRINGS = (
    ('golden-hour', 'coin'),
    ('jade-treasury', 'sapphire'),
    ('pearl-palace', 'pearl'),
    ('ruby-revel', 'ruby'),
)
WIDTH, HEIGHT = 2048, 3072
X, Y, CAB_W, CAB_H = 512, 384, 1024, 2304


def feather(out: Image.Image, source: Image.Image, room: Image.Image) -> Image.Image:
    # A narrow continuation of the same marble, columns and light bridges
    # the edge. Beyond it, the actual room remains sharp and contextual.
    for distance in range(1, 73):
        mix = max(0, min(255, round(255 * (1 - distance / 73) ** 1.8)))
        if mix == 0:
            continue
        left = source.crop((distance - 1, 0, distance, CAB_H))
        right = source.crop((CAB_W - distance, 0, CAB_W - distance + 1, CAB_H))
        for strip, px in ((left, X-distance), (right, X+CAB_W+distance-1)):
            original = room.crop((px, Y, px+1, Y+CAB_H))
            out.paste(Image.blend(original, strip, mix/255), (px, Y))
    for distance in range(1, 89):
        mix = max(0, min(255, round(255 * (1-distance/90) ** 1.8)))
        if mix == 0:
            continue
        top = source.crop((0, distance-1, CAB_W, distance))
        bottom = source.crop((0, CAB_H-distance, CAB_W, CAB_H-distance+1))
        for strip, py in ((top, Y-distance), (bottom, Y+CAB_H+distance-1)):
            original = room.crop((X, py, X+CAB_W, py+1))
            out.paste(Image.blend(original, strip, mix/255), (X, py))
    return out

for cabinet, room_name in PAIRINGS:
    cabinet_image = Image.open(RAW / f'{cabinet}-tall.png').convert('RGB')
    room_image = Image.open(RAW / f'{room_name}-room.png').convert('RGB')
    cabinet_center = ImageOps.fit(cabinet_image, (CAB_W, CAB_H), method=Image.Resampling.LANCZOS)
    room = ImageOps.fit(room_image, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
    combined = feather(room.copy(), cabinet_center, room)
    combined.paste(cabinet_center, (X, Y))
    output = ART / f'{cabinet}-environment.png'
    combined.save(output, optimize=True)
    print(output.name, output.stat().st_size)
