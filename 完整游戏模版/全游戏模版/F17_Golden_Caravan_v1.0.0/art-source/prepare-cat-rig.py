"""Prepare the CC Switch cat parts; never overwrite the original baked card."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/imagegen"
ART = ROOT / "assets/resources/art"
PART_NAMES = ["body", "head-open", "head-blink", "tail", "ear", "tassel"]


def prepare():
    source = Image.open(OUT / "ccswitch-f17-cat-parts-v2-chroma.png").convert("RGBA")
    if source.size != (1536, 1024):
        raise ValueError(f"Unexpected atlas size {source.size}")
    # The provider returned native alpha. Do NOT key out fur by its RGB color.
    alpha = source.getchannel("A")
    if alpha.getextrema()[0] != 0 or alpha.histogram()[0] < 100000:
        raise ValueError("Missing genuine transparent background")
    alpha = alpha.point(lambda v: 0 if v < 8 else min(255, round(v * 255 / 254)))
    source.putalpha(alpha)
    atlas = source.resize((768, 512), Image.Resampling.LANCZOS)
    bounds = []
    for i, name in enumerate(PART_NAMES):
        x, y = (i % 3) * 256, (i // 3) * 256
        cell = atlas.crop((x, y, x + 256, y + 256))
        bb = cell.getchannel("A").point(lambda v: 255 if v >= 12 else 0).getbbox()
        if not bb or bb[0] < 4 or bb[1] < 4 or bb[2] > 252 or bb[3] > 252:
            raise ValueError(f"Part {name} touches its cell border: {bb}")
        bounds.append([x + bb[0], y + bb[1], bb[2] - bb[0], bb[3] - bb[1]])
        print(name, bounds[-1])
    atlas.save(ART / "caravan-cat-rig-parts.png", optimize=True)
    bg = Image.open(OUT / "ccswitch-f17-cat-background-v1.png").convert("RGB")
    bg = bg.resize((599, 599), Image.Resampling.LANCZOS)
    bg.save(ART / "caravan-card-0-rig-bg.png", optimize=True)
    # Exact layout metadata is consumed by Cocos; keep extraction reproducible.
    (OUT / "ccswitch-f17-cat-rig-bounds.json").write_text(
        json.dumps({"source": "ccswitch-f17-cat-parts-v2-chroma.png", "size": [768, 512],
                    "parts": dict(zip(PART_NAMES, bounds))}, indent=2) + "\n")
    sheet = Image.new("RGBA", atlas.size, (239, 227, 210, 255))
    sheet.alpha_composite(atlas)
    sheet.convert("RGB").save(OUT / "ccswitch-f17-cat-parts-alpha-check.jpg", quality=94)
    # A static assembly catches neck seams and misplaced pivots before building.
    layers = [
        (3, (78, 368, 136, 154)),
        (0, (150, 276, 237, 252)),
        (4, (252, 83, 80, 78)),
        (1, (164, 111, 270, 246)),
        (5, (373, 279, 33, 119)),
    ]
    preview = bg.convert("RGBA")
    for index, (x, y, w, h) in layers:
        bx, by, bw, bh = bounds[index]
        part = atlas.crop((bx, by, bx + bw, by + bh)).resize((w, h), Image.Resampling.LANCZOS)
        preview.alpha_composite(part, (x, y))
    preview.convert("RGB").save(OUT / "ccswitch-f17-cat-assembly-v1.jpg", quality=95)


if __name__ == "__main__":
    prepare()
