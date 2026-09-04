"""Repack the CC Switch amethyst cut-outs into a true 3x4 runtime atlas.

The generated source remains untouched. Its tenth symbol was placed below the
third-row diamond instead of in row four, so uniform runtime slicing combined
two pieces of art and produced empty cells. This script only trims, scales and
centres the original pixels; it does not synthesize or redraw any artwork.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/resources/generated/game04/symbol_atlas_cutout_v02.png"
OUTPUT = ROOT / "assets/resources/generated/game04/symbol_atlas_cutout_v03.png"
CELL = 418

# Source regions in GameConfig order: coin, chest, ring, seven, crown, vault,
# diamond, host, eclipse, orb. Regions deliberately separate the diamond and
# orb that share the source image's first column.
REGIONS = (
    (0, 0, 418, 350),
    (418, 0, 836, 350),
    (836, 0, 1254, 350),
    (0, 340, 418, 660),
    (418, 340, 836, 660),
    (836, 340, 1254, 680),
    (0, 650, 418, 932),
    (418, 820, 836, 1250),
    (836, 820, 1254, 1250),
    (0, 932, 418, 1250),
)


def trim_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    # A light threshold excludes isolated generation fringe pixels while the
    # original antialiased edge is retained in the returned RGBA crop.
    mask = alpha.point(lambda value: 255 if value > 8 else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("source region contains no visible artwork")
    return image.crop(bounds)


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    atlas = Image.new("RGBA", (CELL * 3, CELL * 4), (0, 0, 0, 0))
    target_extent = 340
    for index, region in enumerate(REGIONS):
        symbol = trim_alpha(source.crop(region))
        ratio = min(target_extent / symbol.width, target_extent / symbol.height)
        size = (max(1, round(symbol.width * ratio)), max(1, round(symbol.height * ratio)))
        symbol = symbol.resize(size, Image.Resampling.LANCZOS)
        column, row = index % 3, index // 3
        x = column * CELL + (CELL - symbol.width) // 2
        y = row * CELL + (CELL - symbol.height) // 2
        atlas.alpha_composite(symbol, (x, y))
    atlas.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
