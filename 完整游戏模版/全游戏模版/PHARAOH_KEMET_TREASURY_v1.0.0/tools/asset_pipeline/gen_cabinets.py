# -*- coding: utf-8 -*-
"""Cabinet backdrops (1024x1536) — the source of truth for the game screen.

Shared geometry across all four cabinets (aperture & control recesses), with
per-game accent palettes. The Kemet studio reel frame is composited around the
reel window so the machine reads as a hand-built temple cabinet.
"""
from __future__ import annotations

import math
from typing import Tuple

from PIL import Image, ImageDraw, ImageFilter

from kemet_common import (
    CARNELIAN, GOLD, GOLD_DEEP, GOLD_HI, GOLD_MID, GOLD_SHADOW, LAPIS, LAPIS_DEEP,
    LAPIS_LIGHT, NIGHT, NIGHT_DEEP, OBSIDIAN, SAND, SAND_DEEP, SAND_LIGHT, TURQUOISE,
    AMETHYST, WHITE, hieroglyph_strip, jewel, lerp, rgrad, rounded_mask, vgrad, winged_sun, KEMET_PNG, OUT,
)

CANVAS = (1024, 1536)

# reel frame placement (image px)
FRAME_SCALE_X = 620 / 1386
FRAME_SCALE_Y = 361 / 826
FRAME_W = int(2000 * FRAME_SCALE_X)
FRAME_H = int(1350 * FRAME_SCALE_Y)
FRAME_CENTER = (512, 695)
APERTURE = (208, 525, 828, 886)

GAME_STYLES = {
    "game01": {"panel": LAPIS_DEEP, "accent": (255, 196, 96), "glyph": GOLD, "trim": LAPIS},
    "game02": {"panel": (12, 52, 58), "accent": (96, 226, 205), "glyph": TURQUOISE, "trim": TURQUOISE},
    "game03": {"panel": (66, 40, 20), "accent": (240, 160, 90), "glyph": (226, 148, 60), "trim": CARNELIAN},
    "game04": {"panel": (44, 22, 74), "accent": (196, 140, 255), "glyph": AMETHYST, "trim": AMETHYST},
}


def _background(size: Tuple[int, int], blur: int = 6, darken: float = 0.42) -> Image.Image:
    bg = Image.open(f"{KEMET_PNG}/background/background.png").convert("RGB")
    # center crop to target aspect
    tw, th = size
    scale = max(tw / bg.width, th / bg.height)
    bg = bg.resize((int(bg.width * scale) + 1, int(bg.height * scale) + 1), Image.LANCZOS)
    x = (bg.width - tw) // 2
    y = (bg.height - th) // 2
    bg = bg.crop((x, y, x + tw, y + th)).filter(ImageFilter.GaussianBlur(blur))
    dark = Image.new("RGB", size, (int(10 * darken * 255 / 255),) * 3)
    overlay = Image.new("RGB", size, (8, 6, 18))
    bg = Image.blend(bg, overlay, darken)
    return bg


def _pylon(img: Image.Image, side: str, style: dict) -> None:
    """Temple pylon column with hieroglyph band and glowing sconce."""
    w, h = CANVAS
    d = ImageDraw.Draw(img)
    x0, x1 = (0, 150) if side == "L" else (w - 150, w)
    grad = vgrad((x1 - x0, h), [(0.0, lerp(SAND_DEEP, (0, 0, 0), 0.25)), (0.5, SAND_DEEP), (1.0, lerp(SAND_DEEP, (0, 0, 0), 0.55))])
    m = Image.new("L", grad.size, 255)
    img.paste(grad, (x0, 0), m)
    # inner edge highlight + gold trim
    edge = w - 150 if side == "L" else w - 150
    ex = 149 if side == "L" else w - 150
    d.line([ex, 0, ex, h], fill=GOLD_SHADOW, width=4)
    d.line([ex - (3 if side == "L" else -3), 0, ex - (3 if side == "L" else -3), h], fill=GOLD_MID, width=2)
    # glyph band down the middle
    band_w = 74
    bx = (x0 + x1) // 2 - band_w // 2
    band_bg = Image.new("RGBA", (band_w, h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band_bg)
    bd.rectangle([0, 0, band_w - 1, h - 1], fill=lerp(style["panel"], (0, 0, 0), 0.35) + (235,))
    glyphs = hieroglyph_strip((band_w, h), style["glyph"], seed=hash(side + str(style["accent"])) % 997, cell=58, alpha=210)
    band_bg.alpha_composite(glyphs)
    img.paste(band_bg, (bx, 0), band_bg)
    # sconces at two heights
    for fy in (0.2, 0.62):
        cy = int(h * fy)
        cx = (x0 + x1) // 2
        glow = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse([30, 30, 90, 90], fill=style["accent"] + (180,))
        glow = glow.filter(ImageFilter.GaussianBlur(14))
        img.paste(glow, (cx - 60, cy - 60), glow)
        dd = ImageDraw.Draw(img)
        dd.ellipse([cx - 14, cy - 22, cx + 14, cy + 22], fill=GOLD_DEEP)
        dd.ellipse([cx - 9, cy - 14, cx + 9, cy + 10], fill=lerp(style["accent"], WHITE, 0.45))
        dd.polygon([(cx - 16, cy - 24), (cx + 16, cy - 24), (cx, cy - 44)], fill=GOLD_DEEP)


def _recess_circle(img: Image.Image, cx: int, cy: int, r: int, style: dict, depth: float = 0.75) -> None:
    d = ImageDraw.Draw(img)
    panel = lerp(style["panel"], (0, 0, 0), 0.5)
    d.ellipse([cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6], fill=GOLD_SHADOW)
    ring = rgrad((int((r + 6) * 2), int((r + 6) * 2)), GOLD, GOLD_DEEP, center=(0.5, 0.35))
    rm = Image.new("L", ring.size, 0)
    ImageDraw.Draw(rm).ellipse([0, 0, ring.size[0] - 1, ring.size[1] - 1], fill=255)
    img.paste(ring, (cx - r - 6, cy - r - 6), rm)
    inner = rgrad((int(r * 2), int(r * 2)), lerp(panel, (255, 255, 255), 0.06), lerp(panel, (0, 0, 0), 0.35), center=(0.5, 0.3))
    im = Image.new("L", inner.size, 0)
    ImageDraw.Draw(im).ellipse([0, 0, inner.size[0] - 1, inner.size[1] - 1], fill=255)
    img.paste(inner, (cx - r, cy - r), im)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=lerp(GOLD_DEEP, (0, 0, 0), 0.3), width=3)
    d.arc([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], start=200, end=340, fill=(255, 244, 205, 90), width=3)


def _recess_rect(img: Image.Image, box: Tuple[int, int, int, int], radius: int, style: dict) -> None:
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(img)
    panel = lerp(style["panel"], (0, 0, 0), 0.5)
    d.rounded_rectangle([x0 - 5, y0 - 5, x1 + 5, y1 + 5], radius=radius + 5, fill=GOLD_SHADOW)
    ring = vgrad((x1 - x0 + 10, y1 - y0 + 10), [(0.0, GOLD), (0.6, GOLD_MID), (1.0, GOLD_DEEP)])
    rm = rounded_mask(ring.size, radius + 5)
    img.paste(ring, (x0 - 5, y0 - 5), rm)
    inner = vgrad((x1 - x0, y1 - y0), [(0.0, lerp(panel, (255, 255, 255), 0.05)), (1.0, lerp(panel, (0, 0, 0), 0.3))])
    im = rounded_mask(inner.size, radius)
    img.paste(inner, (x0, y0), im)
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=lerp(GOLD_DEEP, (0, 0, 0), 0.3), width=2)


def _plaque(img: Image.Image, box: Tuple[int, int, int, int], radius: int, style: dict, glow: bool = False) -> None:
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(img)
    base = vgrad((x1 - x0, y1 - y0), [(0.0, lerp(SAND, WHITE, 0.16)), (0.55, SAND), (1.0, lerp(SAND, SAND_DEEP, 0.45))])
    m = rounded_mask(base.size, radius)
    img.paste(base, (x0, y0), m)
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=GOLD_SHADOW, width=3)
    d.rounded_rectangle([x0 + 4, y0 + 4, x1 - 4, y1 - 4], radius=max(2, radius - 4), outline=GOLD_MID, width=2)
    for cx, cy in ((x0 + 10, y0 + 10), (x1 - 10, y0 + 10), (x0 + 10, y1 - 10), (x1 - 10, y1 - 10)):
        jewel(d, cx, cy, 5, style["accent"])


def build_cabinet(game: str, seed: int) -> Image.Image:
    style = GAME_STYLES[game]
    w, h = CANVAS
    img = _background(CANVAS, blur=5, darken=0.5).convert("RGBA")

    # floor shadow under cabinet
    d = ImageDraw.Draw(img)
    sh = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([92, 1180, w - 92, 1500], fill=(0, 0, 0, 190))
    sh = sh.filter(ImageFilter.GaussianBlur(48))
    img.alpha_composite(sh)

    _pylon(img, "L", style)
    _pylon(img, "R", style)

    # ---- cornice: winged sun + lintel -------------------------------------
    cornice = winged_sun((560, 130))
    img.alpha_composite(cornice, (w // 2 - 280, 26))
    d = ImageDraw.Draw(img)
    # lintel band under cornice
    lintel = vgrad((w, 74), [(0.0, lerp(SAND, WHITE, 0.2)), (0.5, SAND), (1.0, SAND_DEEP)])
    lm = rounded_mask((w, 74), 18)
    img.paste(lintel, (0, 132), lm)
    d.rounded_rectangle([-20, 132, w + 20, 206], radius=18, outline=GOLD_SHADOW, width=3)
    d.rounded_rectangle([6, 138, w - 6, 200], radius=14, outline=GOLD_MID, width=2)
    glyphs = hieroglyph_strip((w - 220, 40), style["glyph"], seed=seed, cell=44, alpha=200)
    img.paste(glyphs, (110, 149), glyphs)

    # ---- title marquee recess (title art drawn over it by the app) --------
    _plaque(img, (300, 216, 724, 306), 16, style)

    # ---- balance plaque ----------------------------------------------------
    _plaque(img, (330, 318, 700, 384), 12, style)

    # ---- reel window: dark shaft + studio frame ---------------------------
    ax0, ay0, ax1, ay1 = APERTURE
    shaft = vgrad((ax1 - ax0, ay1 - ay0), [(0.0, lerp(NIGHT_DEEP, (30, 24, 60), 0.4)), (1.0, NIGHT_DEEP)])
    sm = rounded_mask(shaft.size, 26)
    img.paste(shaft, (ax0, ay0), sm)
    d.rounded_rectangle([ax0, ay0, ax1, ay1], radius=26, outline=(0, 0, 0, 255), width=3)
    frame = Image.open(f"{KEMET_PNG}/reel/reel_frame_empty.png").convert("RGBA")
    frame = frame.resize((FRAME_W, FRAME_H), Image.LANCZOS)
    img.alpha_composite(frame, (FRAME_CENTER[0] - FRAME_W // 2, FRAME_CENTER[1] - FRAME_H // 2))

    # ---- win plaque ---------------------------------------------------------
    _plaque(img, (300, 1002, 700, 1068), 12, style)

    # ---- console deck -------------------------------------------------------
    deck = vgrad((w, 250), [(0.0, lerp(style["panel"], (255, 255, 255), 0.05)), (1.0, lerp(style["panel"], (0, 0, 0), 0.4))])
    dm = rounded_mask((w, 250), 26)
    img.paste(deck, (0, 1082), dm)
    d.rounded_rectangle([-20, 1082, w + 20, 1332], radius=26, outline=GOLD_SHADOW, width=4)
    d.rounded_rectangle([8, 1090, w - 8, 1324], radius=20, outline=GOLD_MID, width=2)
    # spin / minus / plus / auto recesses
    _recess_circle(img, 512, 1152, 92, style)
    _recess_circle(img, 205, 1154, 40, style)
    _recess_circle(img, 305, 1154, 40, style)
    _recess_rect(img, (700, 1108, 822, 1198), 16, style)
    # bet panel
    _recess_rect(img, (330, 1244, 694, 1330), 18, style)
    _recess_circle(img, 402, 1287, 34, style)

    # ---- frieze + base ------------------------------------------------------
    frieze = vgrad((w, 120), [(0.0, SAND_DEEP), (1.0, lerp(SAND_DEEP, (0, 0, 0), 0.5))])
    fm = rounded_mask((w, 120), 20)
    img.paste(frieze, (0, 1352), fm)
    d.rounded_rectangle([-20, 1352, w + 20, 1472], radius=20, outline=GOLD_SHADOW, width=3)
    glyphs2 = hieroglyph_strip((w - 160, 56), style["glyph"], seed=seed + 31, cell=52, alpha=190)
    img.paste(glyphs2, (80, 1384), glyphs2)
    # payouts / turbo recesses
    _recess_rect(img, (100, 1394, 276, 1452), 14, style)
    _recess_rect(img, (748, 1394, 924, 1452), 14, style)
    # base plinth
    plinth = vgrad((w, h - 1472), [(0.0, SAND), (1.0, lerp(SAND_DEEP, (0, 0, 0), 0.5))])
    pm = rounded_mask(plinth.size, 16)
    img.paste(plinth, (0, 1472), pm)
    d.rounded_rectangle([-20, 1472, w + 20, h + 20], radius=16, outline=GOLD_SHADOW, width=4)

    # corner gold caps
    for cx, cy in ((150, 210), (w - 150, 210)):
        jewel(d, cx, cy, 12, style["accent"])
    # top gold cap stone
    d.rounded_rectangle([w // 2 - 130, 8, w // 2 + 130, 40], radius=12, fill=GOLD_MID, outline=GOLD_DEEP, width=3)

    # global vignette
    vig = Image.new("L", CANVAS, 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-160, -160, w + 160, h + 160], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(120))
    black = Image.new("RGBA", CANVAS, (4, 3, 10, 130))
    img = Image.composite(img, Image.alpha_composite(black, img), vig)

    return img.convert("RGB")


def build_edge_bg(game: str) -> Image.Image:
    bg = _background(CANVAS, blur=26, darken=0.62)
    vig = Image.new("L", CANVAS, 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-200, -200, CANVAS[0] + 200, CANVAS[1] + 200], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(140))
    dark = Image.new("RGB", CANVAS, (6, 5, 14))
    return Image.composite(bg, dark, vig)


if __name__ == "__main__":
    for i, game in enumerate(("game01", "game02", "game03", "game04")):
        cab = build_cabinet(game, seed=17 + i * 53)
        cab.save(f"{OUT}/{game}/base_bg_v01.png")
        build_edge_bg(game).save(f"{OUT}/{game}/edge_bg_v01.png")
        prev = cab.copy()
        prev.thumbnail((420, 630))
        prev.save(f"out/cabinet_{game}.jpg", quality=90)
        print(game, "ok")
    # combined preview
    from PIL import Image as I
    ims = [I.open(f"out/cabinet_game0{i}.jpg") for i in (1, 2, 3, 4)]
    sheet = I.new("RGB", (sum(i.width for i in ims) + 30, max(i.height for i in ims)), (20, 20, 30))
    x = 0
    for im in ims:
        sheet.paste(im, (x, 0))
        x += im.width + 10
    sheet.save("out/all_cabinets.jpg", quality=88)
    print("done")
