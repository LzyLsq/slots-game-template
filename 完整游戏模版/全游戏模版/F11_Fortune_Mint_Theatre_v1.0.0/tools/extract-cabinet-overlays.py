#!/usr/bin/env python3
"""Extract the four F11 cabinets from their baked scene backgrounds.

The CC Switch cabinet renders were delivered as opaque 1024x1536 scene
composites.  Runtime also renders a dedicated full-screen environment, so
using those composites directly creates a visible rectangular seam.  These
carefully authored silhouettes preserve each complete cabinet (including its
contact shadow) while removing the second, conflicting room around it.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1] / "assets/resources/generated"

# Points are measured in the original 1024x1536 render coordinate space.
# Each outline follows the manufactured cabinet rather than applying a generic
# rectangular fade, which would clip crowns, gears, control decks and plinths.
SILHOUETTES: dict[str, list[tuple[int, int]]] = {
    "game01": [
        (510, 26), (594, 38), (650, 60), (698, 76), (756, 98), (798, 151),
        (821, 224), (830, 352), (826, 814), (812, 910), (850, 982),
        (875, 1068), (868, 1125), (851, 1163), (878, 1427), (852, 1472),
        (786, 1494), (238, 1494), (172, 1472), (145, 1428), (166, 1162),
        (149, 1124), (151, 1067), (176, 982), (211, 910), (198, 814),
        (194, 351), (203, 245), (225, 179), (264, 121), (321, 82),
        (386, 55), (447, 37),
    ],
    "game02": [
        (510, 7), (610, 18), (697, 56), (769, 104), (858, 154), (929, 218),
        (967, 314), (973, 735), (966, 956), (1002, 1068), (1014, 1186),
        (996, 1282), (956, 1314), (942, 1434), (900, 1475), (122, 1475),
        (79, 1434), (66, 1315), (26, 1281), (9, 1186), (21, 1068),
        (57, 956), (50, 735), (56, 314), (94, 218), (165, 153), (254, 104),
        (327, 56), (414, 18),
    ],
    "game03": [
        (512, -8), (618, 2), (681, 30), (719, 78), (763, 117), (848, 136),
        (873, 230), (869, 365), (878, 838), (899, 948), (924, 1000),
        (925, 1120), (955, 1193), (956, 1419), (921, 1480), (814, 1496),
        (210, 1496), (102, 1480), (67, 1419), (68, 1193), (99, 1120),
        (100, 1000), (124, 948), (145, 838), (154, 365), (150, 230),
        (176, 136), (260, 117), (304, 77), (343, 30), (406, 2),
    ],
    "game04": [
        (512, -8), (585, 16), (627, 48), (714, 61), (780, 89), (858, 143),
        (905, 230), (924, 355), (953, 586), (946, 953), (925, 1092),
        (965, 1155), (969, 1278), (943, 1350), (930, 1424), (884, 1468),
        (140, 1468), (94, 1424), (81, 1350), (55, 1278), (59, 1155),
        (99, 1092), (78, 953), (71, 586), (100, 355), (119, 230),
        (166, 143), (244, 89), (310, 61), (397, 48), (439, 16),
    ],
}


def save_atomic(image: Image.Image, destination: Path) -> None:
    descriptor, temporary = tempfile.mkstemp(
        prefix=f".{destination.stem}-", suffix=".png", dir=destination.parent
    )
    os.close(descriptor)
    try:
        image.save(temporary, optimize=True)
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main() -> None:
    for game, outline in SILHOUETTES.items():
        source = ROOT / game / "cabinet_f11.png"
        destination = ROOT / game / "cabinet_overlay_f11.png"
        image = Image.open(source).convert("RGBA")
        if image.size != (1024, 1536):
            raise ValueError(f"unexpected cabinet size for {source}: {image.size}")

        hard_mask = Image.new("L", image.size, 0)
        ImageDraw.Draw(hard_mask).polygon(outline, fill=255)
        # A small feather removes the synthetic cut line without making the
        # gold chassis itself look soft or translucent.
        mask = hard_mask.filter(ImageFilter.GaussianBlur(5.5))
        image.putalpha(mask)
        save_atomic(image, destination)
        print(destination.relative_to(ROOT.parent.parent))


if __name__ == "__main__":
    main()
