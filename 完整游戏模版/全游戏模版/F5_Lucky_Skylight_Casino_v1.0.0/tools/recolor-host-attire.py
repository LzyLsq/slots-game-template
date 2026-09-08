#!/usr/bin/env python3
"""Recolour only the hostess's cream suit into Jubilee burgundy velvet."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: recolor-host-attire.py INPUT.png OUTPUT.png")

    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    image = Image.open(source).convert("RGBA")
    width, height = image.size

    # Polygons follow the manufactured garment panels. Colour qualification
    # below supplies the fine edge, so skin, hair, shirt, waistcoat and brooch
    # remain untouched even where a polygon deliberately overlaps an edge.
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    sx = width / 1024
    sy = height / 1536

    def polygon(points: list[tuple[int, int]]) -> None:
        draw.polygon([(round(x * sx), round(y * sy)) for x, y in points], fill=255)

    polygon([(172, 542), (358, 411), (467, 458), (470, 650), (385, 1008), (246, 879), (170, 676)])
    polygon([(600, 400), (761, 418), (818, 631), (950, 1094), (795, 1138), (700, 858), (590, 664)])
    polygon([(342, 414), (490, 392), (548, 482), (511, 872), (438, 1024), (333, 962)])
    polygon([(557, 402), (746, 416), (812, 1007), (650, 1037), (566, 873), (548, 492)])
    polygon([(337, 840), (703, 840), (787, 1536), (306, 1536)])

    # The broad garment polygons intentionally overlap adjacent anatomy so no
    # cream halo survives at the seams. Cut those protected regions back out
    # explicitly before the colour pass.
    draw.polygon([(0, 525), (154, 535), (224, 592), (226, 682), (174, 706), (74, 655), (0, 610)], fill=0)
    draw.polygon([(830, 958), (953, 963), (1024, 1010), (1024, 1215), (892, 1194), (847, 1110)], fill=0)
    draw.polygon([(431, 354), (663, 354), (680, 506), (653, 748), (634, 879), (579, 919), (466, 884), (445, 742), (421, 504)], fill=0)
    pixels = image.load()
    selection = mask.load()
    for y in range(height):
        for x in range(width):
            if selection[x, y] == 0:
                continue
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0 or blue > red + 55:
                continue
            source_x, source_y = x / sx, y / sy
            in_gold_detail = (
                (657 <= source_x <= 720 and 471 <= source_y <= 540)
                or (638 <= source_x <= 682 and 740 <= source_y <= 790)
            )
            if in_gold_detail and red > green * 1.08 and green > blue * 1.20:
                continue
            maximum = max(red, green, blue)
            warm_neutral = red >= green * 0.94 and red <= green * 1.50 and green >= blue * 0.82
            if not warm_neutral or maximum < 42:
                continue

            luminance = (red * 0.26 + green * 0.58 + blue * 0.16) / 255
            velvet = max(0.0, min(1.0, (luminance - 0.16) / 0.84))
            # Burgundy velvet keeps the original folds and highlights while
            # avoiding a flat hue replacement. Highlights lean ruby; shadows
            # remain wine-dark to match the lobby lacquer and cabinet enamel.
            out_red = round(45 + 137 * velvet)
            out_green = round(9 + 43 * velvet)
            out_blue = round(24 + 53 * velvet)

            pixels[x, y] = (out_red, out_green, out_blue, alpha)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, optimize=True)


if __name__ == "__main__":
    main()
