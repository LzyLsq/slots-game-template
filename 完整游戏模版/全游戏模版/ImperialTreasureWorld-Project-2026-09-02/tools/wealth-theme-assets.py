#!/usr/bin/env python3
"""Create the Imperial Treasure World art pass from the preserved source art.

This is an offline, deterministic production tool.  It keeps every texture's
dimensions and alpha channel intact so existing Cocos sprite-frame metadata,
nine-slice measurements and atlas coordinates remain valid.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets" / "resources" / "generated"
SOURCE_ART = ROOT.parent / "CelestialSpinWorld" / "assets" / "resources" / "generated"
SEED = 0x1A2B3C


def gradient_lut(stops: list[tuple[int, tuple[int, int, int]]]) -> list[tuple[int, int, int]]:
    lut: list[tuple[int, int, int]] = []
    for value in range(256):
        left = stops[0]
        right = stops[-1]
        for index in range(len(stops) - 1):
            if stops[index][0] <= value <= stops[index + 1][0]:
                left, right = stops[index], stops[index + 1]
                break
        span = max(1, right[0] - left[0])
        ratio = (value - left[0]) / span
        lut.append(tuple(round(left[1][channel] * (1 - ratio) + right[1][channel] * ratio) for channel in range(3)))
    return lut


def grade(image: Image.Image, palette: list[tuple[int, tuple[int, int, int]]], original_mix: float = 0.22) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    rgb = rgba.convert("RGB")
    luminance = ImageOps.grayscale(rgb)
    table = gradient_lut(palette)
    mapped = Image.merge("RGB", tuple(luminance.point([entry[channel] for entry in table]) for channel in range(3)))
    result = Image.blend(mapped, rgb, original_mix)
    result = ImageEnhance.Contrast(result).enhance(1.06)
    result = ImageEnhance.Color(result).enhance(1.08)
    return Image.merge("RGBA", (*result.split(), alpha))


def gold_detail(image: Image.Image, amount: float = 0.55) -> Image.Image:
    rgba = image.convert("RGBA")
    rgb = rgba.convert("RGB")
    luminance = ImageOps.grayscale(rgb)
    edges = luminance.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.8))
    highlights = ImageChops.lighter(edges, luminance.point(lambda p: max(0, (p - 132) * 2)))
    highlights = highlights.point(lambda p: round(p * amount))
    gold = Image.new("RGBA", rgba.size, (255, 194, 70, 0))
    gold.putalpha(ImageChops.multiply(highlights, rgba.getchannel("A")))
    return Image.alpha_composite(rgba, gold)


def central_readability(image: Image.Image, strength: int = 82, centre_y: float = 0.54) -> Image.Image:
    w, h = image.size
    small = Image.new("L", (256, 384), 0)
    pixels = small.load()
    for y in range(small.height):
        for x in range(small.width):
            dx = (x / (small.width - 1) - 0.5) / 0.42
            dy = (y / (small.height - 1) - centre_y) / 0.55
            distance = math.sqrt(dx * dx + dy * dy)
            pixels[x, y] = round(strength * max(0.0, 1.0 - distance) ** 1.6)
    mask = small.resize((w, h), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(max(2, w // 100)))
    shade = Image.new("RGBA", (w, h), (2, 4, 8, 0))
    shade.putalpha(mask)
    return Image.alpha_composite(image.convert("RGBA"), shade)


def draw_glint(draw: ImageDraw.ImageDraw, x: int, y: int, radius: int, color: tuple[int, int, int, int]) -> None:
    draw.polygon([(x, y - radius), (x + max(1, radius // 5), y - radius // 5), (x + radius, y),
                  (x + radius // 5, y + radius // 5), (x, y + radius), (x - radius // 5, y + radius // 5),
                  (x - radius, y), (x - radius // 5, y - radius // 5)], fill=color)


def jewel_layer(size: tuple[int, int], jewels: list[tuple[float, float, float, str]], seed: int) -> Image.Image:
    rng = random.Random(seed)
    w, h = size
    art = Image.new("RGBA", size, (0, 0, 0, 0))
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    draw = ImageDraw.Draw(art, "RGBA")
    colors = {
        "ruby": ((104, 3, 24, 255), (229, 25, 69, 255), (255, 164, 174, 255)),
        "emerald": ((2, 73, 57, 255), (18, 184, 121, 255), (167, 255, 218, 255)),
        "sapphire": ((8, 38, 121, 255), (31, 115, 239, 255), (185, 224, 255, 255)),
        "diamond": ((78, 112, 150, 245), (186, 229, 255, 255), (255, 255, 255, 255)),
    }
    for nx, ny, scale, kind in jewels:
        x, y = round(nx * w), round(ny * h)
        radius = max(8, round(scale * w))
        dark, mid, light = colors[kind]
        gd.ellipse((x - radius * 2, y - radius * 2, x + radius * 2, y + radius * 2), fill=(*mid[:3], 80))
        shadow = max(2, radius // 7)
        draw.ellipse((x - radius - shadow, y - radius + shadow, x + radius + shadow, y + radius + shadow * 2), fill=(0, 0, 0, 125))
        points = [(x, y - radius), (x + round(radius * .75), y - round(radius * .38)),
                  (x + radius, y + round(radius * .22)), (x + round(radius * .42), y + radius),
                  (x - round(radius * .45), y + radius), (x - radius, y + round(radius * .15)),
                  (x - round(radius * .72), y - round(radius * .45))]
        draw.polygon(points, fill=dark, outline=(255, 216, 123, 220), width=max(1, radius // 12))
        draw.polygon([points[0], points[1], (x, y + radius // 5), points[6]], fill=light)
        draw.polygon([points[1], points[2], points[3], (x, y + radius // 5)], fill=mid)
        draw.polygon([points[3], points[4], (x, y + radius // 5)], fill=dark)
        draw.line(points + [points[0]], fill=(255, 238, 188, 165), width=max(1, radius // 16))
        draw_glint(draw, x - radius // 4, y - radius // 3, max(3, radius // 3), (255, 255, 245, 235))
        if rng.random() > .35:
            draw_glint(draw, x + radius, y - radius, max(2, radius // 5), (255, 236, 178, 180))
    glow = glow.filter(ImageFilter.GaussianBlur(max(8, w // 90)))
    return Image.alpha_composite(glow, art)


def pearl_layer(size: tuple[int, int], pearls: list[tuple[float, float, float]], seed: int) -> Image.Image:
    rng = random.Random(seed)
    w, h = size
    art = Image.new("RGBA", size, (0, 0, 0, 0))
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    draw = ImageDraw.Draw(art, "RGBA")
    for nx, ny, scale in pearls:
        x, y = round(nx * w), round(ny * h)
        radius = max(6, round(scale * w))
        gd.ellipse((x - radius * 2, y - radius * 2, x + radius * 2, y + radius * 2), fill=(157, 223, 255, 60))
        draw.ellipse((x - radius - 5, y - radius - 2, x + radius + 5, y + radius + 8), fill=(0, 0, 0, 125))
        draw.ellipse((x - radius - 4, y - radius - 4, x + radius + 4, y + radius + 4), fill=(71, 40, 10, 255), outline=(255, 216, 112, 235), width=max(2, radius // 7))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(158, 117, 45, 255))
        pearl_radius = radius * .82
        steps = max(7, radius // 2)
        for step in range(steps, 0, -1):
            rr = pearl_radius * step / steps
            ratio = 1 - step / steps
            color = (
                round(203 + 46 * ratio),
                round(195 + 55 * ratio),
                round(215 + 40 * ratio),
                255,
            )
            draw.ellipse((x - rr, y - rr, x + rr, y + rr), fill=color)
        draw.arc((x - pearl_radius, y - pearl_radius, x + pearl_radius, y + pearl_radius), 18, 205, fill=(255, 239, 194, 230), width=max(1, radius // 8))
        highlight = max(2, radius // 4)
        draw.ellipse((x - radius * .45 - highlight, y - radius * .45 - highlight, x - radius * .45 + highlight, y - radius * .45 + highlight), fill=(255, 255, 255, 235))
        if rng.random() > .5:
            draw_glint(draw, x + radius, y - radius, max(2, radius // 5), (255, 244, 205, 190))
    return Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(max(6, w // 110))), art)


def strings_between(points: list[tuple[float, float]], size: tuple[int, int]) -> Image.Image:
    w, h = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")
    px = [(round(x * w), round(y * h)) for x, y in points]
    draw.line(px, fill=(232, 184, 86, 190), width=max(2, w // 450), joint="curve")
    draw.line([(x, y - 2) for x, y in px], fill=(255, 240, 181, 95), width=max(1, w // 800), joint="curve")
    return layer


BACKGROUND_PALETTES = {
    "home/home_bg_v01.png": [(0, (2, 3, 7)), (42, (16, 10, 8)), (100, (48, 27, 11)), (170, (133, 80, 23)), (225, (233, 181, 78)), (255, (255, 237, 183))],
    "login/login_bg_v01.png": [(0, (3, 3, 5)), (52, (20, 12, 9)), (112, (70, 38, 15)), (180, (166, 99, 28)), (232, (239, 191, 86)), (255, (255, 242, 202))],
    "common/common_bg_v01.png": [(0, (2, 3, 5)), (45, (13, 9, 8)), (105, (52, 31, 15)), (172, (142, 86, 29)), (225, (229, 175, 69)), (255, (255, 239, 190))],
    "game01/base_bg_v01.png": [(0, (3, 3, 8)), (45, (19, 8, 13)), (104, (67, 15, 30)), (170, (153, 36, 59)), (225, (232, 143, 92)), (255, (255, 236, 193))],
    "game02/base_bg_v01.png": [(0, (4, 3, 2)), (50, (31, 18, 5)), (108, (92, 52, 10)), (174, (180, 112, 26)), (228, (245, 196, 82)), (255, (255, 245, 202))],
    "game03/base_bg_v01.png": [(0, (3, 2, 6)), (48, (25, 5, 10)), (105, (79, 8, 24)), (170, (169, 22, 50)), (224, (235, 116, 99)), (255, (255, 225, 176))],
    "game04/base_bg_v01.png": [(0, (2, 4, 7)), (46, (11, 22, 25)), (105, (32, 72, 73)), (171, (104, 145, 137)), (224, (213, 211, 189)), (255, (255, 250, 225))],
}


BACKGROUND_DECOR = {
    "home/home_bg_v01.png": ([(.075, .25, .027, "ruby"), (.915, .29, .025, "emerald"), (.095, .73, .022, "sapphire"), (.89, .77, .023, "diamond")], [(.13, .18, .016), (.86, .18, .015), (.11, .86, .018), (.89, .86, .018)]),
    "login/login_bg_v01.png": ([(.12, .12, .024, "ruby"), (.88, .12, .024, "emerald"), (.09, .74, .019, "sapphire"), (.91, .74, .019, "diamond")], [(.18, .20, .014), (.82, .20, .014), (.15, .84, .019), (.85, .84, .019)]),
    "common/common_bg_v01.png": ([(.085, .17, .021, "ruby"), (.91, .17, .021, "emerald"), (.09, .79, .02, "sapphire"), (.91, .79, .02, "diamond")], [(.14, .10, .015), (.86, .10, .015), (.13, .90, .018), (.87, .90, .018)]),
    "game01/base_bg_v01.png": ([(.095, .22, .028, "ruby"), (.90, .22, .028, "sapphire"), (.10, .68, .021, "emerald"), (.90, .68, .021, "diamond")], [(.15, .15, .014), (.85, .15, .014)]),
    "game02/base_bg_v01.png": ([(.10, .22, .026, "emerald"), (.90, .23, .026, "emerald"), (.09, .73, .019, "ruby"), (.91, .73, .019, "diamond")], [(.16, .13, .014), (.84, .13, .014)]),
    "game03/base_bg_v01.png": ([(.10, .18, .028, "ruby"), (.90, .18, .028, "ruby"), (.09, .72, .02, "diamond"), (.91, .72, .02, "sapphire")], [(.16, .12, .014), (.84, .12, .014), (.12, .87, .017), (.88, .87, .017)]),
    "game04/base_bg_v01.png": ([(.095, .22, .021, "emerald"), (.905, .22, .021, "sapphire"), (.09, .70, .017, "diamond"), (.91, .70, .017, "diamond")], [(.11, .13, .023), (.89, .13, .023), (.10, .35, .018), (.90, .35, .018), (.11, .78, .022), (.89, .78, .022)]),
}


ASSET_GRADES = {
    "common/button_frame_astral_v01.png": [(0, (3, 2, 5)), (58, (42, 7, 15)), (126, (128, 18, 39)), (195, (219, 119, 54)), (255, (255, 239, 190))],
    "common/button_frame_golden_v01.png": [(0, (3, 3, 2)), (58, (37, 23, 4)), (126, (115, 70, 9)), (195, (226, 160, 44)), (255, (255, 245, 198))],
    "common/button_frame_neon_v01.png": [(0, (2, 4, 7)), (58, (9, 26, 59)), (126, (22, 76, 155)), (195, (125, 176, 226)), (255, (255, 239, 194))],
    "common/button_frame_cosmic_v01.png": [(0, (3, 4, 4)), (58, (28, 29, 26)), (126, (90, 98, 91)), (195, (199, 193, 170)), (255, (255, 248, 224))],
    "common/character_astral_v01.png": [(0, (2, 2, 5)), (55, (34, 7, 14)), (118, (105, 22, 38)), (185, (195, 104, 70)), (255, (255, 233, 198))],
    "common/character_golden_v01.png": [(0, (3, 3, 2)), (55, (34, 23, 8)), (118, (112, 69, 15)), (185, (205, 142, 48)), (255, (255, 238, 186))],
    "common/character_neon_v01.png": [(0, (3, 2, 5)), (55, (37, 5, 14)), (118, (126, 14, 39)), (185, (218, 74, 83)), (255, (255, 226, 196))],
    "common/character_cosmic_v01.png": [(0, (3, 5, 6)), (55, (24, 35, 36)), (118, (83, 101, 96)), (185, (185, 185, 165)), (255, (255, 244, 210))],
    "game01/symbol_atlas_v02.png": [(0, (2, 2, 5)), (55, (39, 7, 16)), (120, (124, 18, 45)), (190, (220, 105, 76)), (255, (255, 240, 204))],
    "game01/symbol_atlas_cutout_v02.png": [(0, (2, 2, 5)), (55, (39, 7, 16)), (120, (124, 18, 45)), (190, (220, 105, 76)), (255, (255, 240, 204))],
    "game02/symbol_atlas_v02.png": [(0, (3, 3, 2)), (55, (38, 25, 4)), (120, (124, 76, 8)), (190, (224, 157, 38)), (255, (255, 241, 184))],
    "game02/symbol_atlas_cutout_v02.png": [(0, (3, 3, 2)), (55, (38, 25, 4)), (120, (124, 76, 8)), (190, (224, 157, 38)), (255, (255, 241, 184))],
    "game03/symbol_atlas_v02.png": [(0, (3, 2, 5)), (55, (40, 5, 14)), (120, (133, 15, 42)), (190, (226, 85, 75)), (255, (255, 231, 194))],
    "game03/symbol_atlas_cutout_v02.png": [(0, (3, 2, 5)), (55, (40, 5, 14)), (120, (133, 15, 42)), (190, (226, 85, 75)), (255, (255, 231, 194))],
    "game04/symbol_atlas_v02.png": [(0, (3, 5, 6)), (55, (22, 35, 38)), (120, (80, 106, 103)), (190, (190, 195, 178)), (255, (255, 247, 218))],
    "game04/symbol_atlas_cutout_v02.png": [(0, (3, 5, 6)), (55, (22, 35, 38)), (120, (80, 106, 103)), (190, (190, 195, 178)), (255, (255, 247, 218))],
}


def process_background(relative: str, palette: list[tuple[int, tuple[int, int, int]]], index: int) -> None:
    path = ART / relative
    source = Image.open(SOURCE_ART / relative).convert("RGBA")
    result = grade(source, palette, .18)
    result = gold_detail(result, .48)
    result = central_readability(result, 34 if "home" in relative else 48)
    warm_lounge = Image.new("RGBA", result.size, (92, 61, 42, 255))
    result = Image.blend(result, warm_lounge, .075)
    result = ImageEnhance.Brightness(result).enhance(1.08)
    result = ImageEnhance.Contrast(result).enhance(.97)
    _, pearls = BACKGROUND_DECOR[relative]
    result = Image.alpha_composite(result, pearl_layer(result.size, pearls, SEED + index * 31))
    result.convert("RGB").save(path, quality=96, optimize=True)


def process_asset(relative: str, palette: list[tuple[int, tuple[int, int, int]]], index: int) -> None:
    path = ART / relative
    source = Image.open(SOURCE_ART / relative)
    result = grade(source, palette, .28 if "character" in relative else .2)
    result = gold_detail(result, .46 if "character" in relative else .62)
    if source.mode == "RGBA":
        result.putalpha(source.getchannel("A"))
        result.save(path, optimize=True)
    else:
        result.convert("RGB").save(path, quality=96, optimize=True)


def main() -> None:
    for index, (relative, palette) in enumerate(BACKGROUND_PALETTES.items()):
        process_background(relative, palette, index)
    for index, (relative, palette) in enumerate(ASSET_GRADES.items()):
        process_asset(relative, palette, index)
    print(f"Imperial wealth art pass completed: {len(BACKGROUND_PALETTES) + len(ASSET_GRADES)} textures")


if __name__ == "__main__":
    main()
