# -*- coding: utf-8 -*-
"""Kemet slot symbol renderers.

Cells are drawn at 724x724 and downscaled into the 362x362 atlas cells so the
resulting 3x4 atlas (1086x1448) matches the template's atlas exactly.
"""
from __future__ import annotations

import math
from typing import List, Optional, Sequence, Tuple

from PIL import Image, ImageDraw, ImageFilter

from kemet_common import (
    AMETHYST, AMETHYST_LIGHT, CARNELIAN, CARNELIAN_LIGHT, CREAM, FAIENCE, FONT_BOLD, GARNET,
    GOLD, GOLD_DEEP, GOLD_HI, GOLD_MID, GOLD_SHADOW, JASPER, LAPIS, LAPIS_DEEP, LAPIS_LIGHT,
    NIGHT, OBSIDIAN, ONYX, OUT, PIPE_OUT, SAND, SAND_DEEP, SAND_LIGHT, TOPAZ, TURQUOISE,
    TURQUOISE_LIGHT, WHITE, alpha_bounds, draw_ankh, draw_eye_hieroglyph, fit_content, font,
    gold_bevel_panel, gold_gradient, jewel, lerp, rgrad, rounded_mask, sparkle, vgrad, drop_shadow, glow,
)

CELL = 724  # render size, downscaled to 362


# ------------------------------------------------------------------ gems ----
def _poly(n: int, cx: float, cy: float, rx: float, ry: float, rot: float = 0.0) -> List[Tuple[float, float]]:
    return [(cx + rx * math.cos(rot + i * 2 * math.pi / n), cy + ry * math.sin(rot + i * 2 * math.pi / n)) for i in range(n)]


def _shrink(poly: List[Tuple[float, float]], f: float, toward: Tuple[float, float]) -> List[Tuple[float, float]]:
    return [(toward[0] + (p[0] - toward[0]) * f, toward[1] + (p[1] - toward[1]) * f) for p in poly]


def gem_stone(size: int, shape: str, color: Tuple[int, int, int], rot: float = 0.0,
              prongs: bool = False) -> Image.Image:
    """Faceted gemstone: girdle polygon + crown facets to an inset table.

    Symmetric brilliant-style construction with facet brightness derived from
    each facet's angle toward the upper-left key light.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = size / 2.0
    light_dir = math.pi * 0.78  # upper-left key light

    def facet_color(mid_angle: float, base_shift: float, alt: int) -> Tuple[int, int, int]:
        bright = 0.5 + 0.5 * math.cos(mid_angle + math.pi - light_dir)
        t = min(1.0, max(0.0, 0.10 + 0.62 * bright + (0.20 if alt == 0 else -0.16) + base_shift))
        return lerp(lerp(color, (0, 0, 0), 0.42), lerp(color, WHITE, 0.85), t)

    if shape in ("round", "oval"):
        n = 10 if shape == "round" else 12
        girdle = _poly(n, cx, cy, size * 0.36, size * (0.36 if shape == "round" else 0.41), rot)
        table_c = (cx, cy - size * 0.02)
        table = _shrink(girdle, 0.42, table_c)
        star = _shrink(girdle, 0.16, table_c)
        d.polygon(girdle, fill=lerp(color, (0, 0, 0), 0.3))
        for i in range(n):  # crown facets to table corners
            a, b = girdle[i], girdle[(i + 1) % n]
            t = table[(i + 1) // 2 % n]
            mid = math.atan2((a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cx)
            d.polygon([a, b, t], fill=facet_color(mid, 0, i % 2))
        for i in range(0, n, 2):  # main facets to table edge
            a, b = girdle[i], girdle[(i + 1) % n]
            t1, t2 = table[i % n], table[(i + 1) % n]
            mid = math.atan2((a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cx)
            d.polygon([a, b, t2, t1], fill=facet_color(mid, 0.08, (i // 2) % 2))
        d.polygon(table, fill=lerp(color, WHITE, 0.30))
        d.polygon(star, fill=lerp(color, WHITE, 0.55))
    elif shape == "emerald":
        girdle = _poly(8, cx, cy, size * 0.42, size * 0.32, rot)
        for k, f in enumerate((1.0, 0.8, 0.6, 0.42)):
            step = _shrink(girdle, f, (cx, cy))
            col = lerp(color, WHITE, 0.34 - 0.16 * k) if k % 2 == 0 else lerp(color, (0, 0, 0), 0.28 + 0.1 * k)
            if k > 0:
                d.polygon(girdle, fill=lerp(color, (0, 0, 0), 0.4))
            d.polygon(step, fill=col, outline=lerp(color, (0, 0, 0), 0.45), width=2)
        d.polygon(_shrink(girdle, 0.42, (cx, cy)), fill=lerp(color, WHITE, 0.3))
    elif shape == "cushion":
        girdle = _poly(8, cx, cy, size * 0.38, size * 0.38, rot + math.pi / 8)
        table_c = (cx, cy - size * 0.015)
        table = _shrink(girdle, 0.4, table_c)
        d.polygon(girdle, fill=lerp(color, (0, 0, 0), 0.3))
        for i in range(8):
            a, b = girdle[i], girdle[(i + 1) % 8]
            t = table[(i + 1) // 2 % 8]
            mid = math.atan2((a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cx)
            d.polygon([a, b, t], fill=facet_color(mid, 0.05, i % 2))
        d.polygon(table, fill=lerp(color, WHITE, 0.34))
    elif shape == "pear":
        # teardrop: pointed top, round bottom. Sides = power curve into a true arc.
        tip = (cx, cy - size * 0.42)
        rb = size * 0.30
        cy0 = cy + size * 0.10
        right: List[Tuple[float, float]] = []
        left: List[Tuple[float, float]] = []
        for i in range(1, 9):
            t = i / 9
            y = cy - size * 0.42 + (cy0 - (cy - size * 0.42)) * t
            x = rb * (t ** 1.4)
            right.append((cx + x, y))
            left.append((cx - x, y))
        arc = [(cx + rb * math.cos(math.pi * i / 8) * 0.98, cy0 + rb * 0.88 * math.sin(math.pi * i / 8)) for i in range(1, 8)]
        outline = [tip] + right + arc + list(reversed(left))
        d.polygon(outline, fill=lerp(color, (0, 0, 0), 0.28))
        fan = [(cx + rb * 0.92 * math.cos(math.pi * i / 8) * 0.98, cy0 + rb * 0.80 * math.sin(math.pi * i / 8)) for i in range(0, 9)]
        for i in range(8):
            mid = math.pi * ((i + 0.5) / 8)
            d.polygon([tip, fan[i], fan[i + 1]], fill=facet_color(mid - math.pi / 2, 0.03, i % 2))
        d.polygon(outline, outline=lerp(color, (0, 0, 0), 0.6))
        d.ellipse([cx - size * 0.12, cy + size * 0.02, cx + size * 0.12, cy + size * 0.26], fill=lerp(color, WHITE, 0.34))
    elif shape == "marquise":
        tipT = (cx, cy - size * 0.44)
        tipB = (cx, cy + size * 0.44)
        n = 7
        left = [(cx - size * 0.21 * math.sin(math.pi * i / n), cy - size * 0.42 * math.cos(math.pi * i / n)) for i in range(1, n)]
        right = [(cx + size * 0.21 * math.sin(math.pi * i / n), cy - size * 0.42 * math.cos(math.pi * i / n)) for i in range(1, n)]
        outline = [tipT] + left + [tipB] + list(reversed(right))
        d.polygon(outline, fill=lerp(color, (0, 0, 0), 0.3))
        # vertical main facets + horizontal cross facets
        cL = lerp(color, WHITE, 0.38)
        cR = lerp(color, (0, 0, 0), 0.22)
        midL = (cx - size * 0.06, cy)
        d.polygon([tipT, midL, tipB] + [tipB], fill=cL)
        d.polygon([tipT, tipT, tipB, (cx + size * 0.06, cy)], fill=cR)
        d.polygon([tipT, (cx - size * 0.06, cy), tipB], fill=cL)
        d.polygon([tipT, tipB, (cx + size * 0.06, cy)], fill=cR)
        d.line([tipT, tipB], fill=lerp(color, WHITE, 0.5), width=max(2, size // 100))
        for i in range(1, n):
            y = cy - size * 0.42 * math.cos(math.pi * i / n)
            w = size * 0.21 * math.sin(math.pi * i / n)
            d.line([cx - w, y, cx + w, y], fill=lerp(color, WHITE, 0.42) if i % 2 else lerp(color, (0, 0, 0), 0.3), width=max(2, size // 110))
    else:
        raise ValueError(shape)

    # outline + gloss clipped to silhouette
    alpha = img.getchannel("A")
    d = ImageDraw.Draw(img)
    gloss = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.ellipse([cx - size * 0.3, cy - size * 0.42, cx + size * 0.02, cy - size * 0.1], fill=(255, 255, 246, 135))
    gloss = gloss.filter(ImageFilter.GaussianBlur(size * 0.018))
    img.paste(gloss, (0, 0), Image.composite(alpha, Image.new("L", (size, size), 0), gloss.getchannel("A")))
    # bottom inner reflection
    refl = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(refl)
    rd.ellipse([cx - size * 0.22, cy + size * 0.18, cx + size * 0.3, cy + size * 0.44], fill=(255, 240, 210, 60))
    refl = refl.filter(ImageFilter.GaussianBlur(size * 0.03))
    img.paste(refl, (0, 0), Image.composite(alpha, Image.new("L", (size, size), 0), refl.getchannel("A")))
    return img


def framed_symbol(art: Image.Image, panel_color: Tuple[int, int, int], radius_ratio: float = 0.16,
                  border: int = 26, accent: Tuple[int, int, int] = GOLD_MID) -> Image.Image:
    """Wrap symbol art on a dark panel inside the metallic gold frame (pack style)."""
    img = gold_bevel_panel((CELL, CELL), int(CELL * radius_ratio), border, inner_color=panel_color)
    panel = art
    bbox = alpha_bounds(panel)
    panel = panel.crop(bbox)
    target = int(CELL * 0.74)
    scale = min(target / panel.width, target / panel.height, 1.6)
    panel = panel.resize((int(panel.width * scale), int(panel.height * scale)), Image.LANCZOS)
    shadow = Image.new("RGBA", (panel.width + 60, panel.height + 60), (0, 0, 0, 0))
    shadow.paste(Image.new("RGBA", panel.size, (0, 0, 0, 150)), (30, 34), panel.getchannel("A"))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    img.alpha_composite(shadow, ((CELL - shadow.width) // 2, (CELL - shadow.height) // 2))
    img.alpha_composite(panel, ((CELL - panel.width) // 2, (CELL - panel.height) // 2))
    return img


def gem_symbol(shape: str, color: Tuple[int, int, int], panel: Tuple[int, int, int],
               rot: float = 0.0) -> Image.Image:
    stone = gem_stone(int(CELL * 0.8), shape, color, rot=rot)
    return framed_symbol(stone, panel)


# -------------------------------------------------------------- artifacts ---
def artifact_cartouche() -> Image.Image:
    s = int(CELL * 0.78)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = s / 2, s / 2
    rw, rh = s * 0.30, s * 0.44
    # rope oval
    for wdt, col in ((18, GOLD_DEEP), (13, GOLD_MID), (6, GOLD_HI)):
        d.rounded_rectangle([cx - rw, cy - rh, cx + rw, cy + rh], radius=rw, outline=col, width=wdt)
    d.rounded_rectangle([cx - rw, cy - rh, cx + rw, cy + rh], radius=rw, outline=(64, 38, 10, 255), width=3)
    inner = ImageDraw.Draw(img)
    draw_ankh(inner, cx, cy - rh * 0.52, s * 0.16, GOLD_HI)
    draw_eye_hieroglyph(inner, cx, cy, s * 0.3, GOLD_HI)
    inner.line([cx - rw * 0.5, cy + rh * 0.62, cx + rw * 0.5, cy + rh * 0.62], fill=GOLD_HI, width=int(s * 0.035))
    return img


def artifact_ring() -> Image.Image:
    s = int(CELL * 0.8)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = s / 2, s * 0.6
    r = s * 0.27
    for wdt, col in ((24, GOLD_DEEP), (17, GOLD_MID), (7, GOLD_HI)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=wdt)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(64, 38, 10, 255), width=2)
    d.ellipse([cx - r + 8, cy - r + 4, cx + r - 8, cy + r - 12], outline=(255, 248, 214, 140), width=3)
    # bezel basket + stone sitting on the band top
    bx, by = cx, cy - r
    bw = s * 0.20
    d.polygon([(bx - bw, by + s * 0.02), (bx + bw, by + s * 0.02), (bx + bw * 0.72, by - s * 0.16), (bx - bw * 0.72, by - s * 0.16)], fill=GOLD_DEEP)
    d.rounded_rectangle([bx - bw * 0.86, by - s * 0.21, bx + bw * 0.86, by - s * 0.13], radius=int(s * 0.02), fill=GOLD, outline=GOLD_DEEP, width=3)
    stone = gem_stone(int(s * 0.24), "oval", CARNELIAN, prongs=False)
    img.alpha_composite(stone, (int(bx - stone.width / 2), int(by - s * 0.30)))
    return img


def artifact_jar(color: Tuple[int, int, int] = FAIENCE) -> Image.Image:
    """Canopic jar: ovoid body, gold collar, pharaoh-head stopper."""
    s = int(CELL * 0.8)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = s / 2
    body_top, body_bot = s * 0.34, s * 0.88
    # body silhouette (egg)
    body = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.ellipse([cx - s * 0.26, body_top - s * 0.06, cx + s * 0.26, body_bot], fill=color)
    shade = vgrad((int(s * 0.52), int(body_bot - body_top + s * 0.06)),
                  [(0.0, lerp(color, WHITE, 0.34)), (0.4, color), (1.0, lerp(color, (0, 0, 0), 0.52))])
    m = Image.new("L", shade.size, 0)
    ImageDraw.Draw(m).ellipse([0, 0, shade.width - 1, shade.height - 1], fill=255)
    body.paste(shade, (int(cx - s * 0.26), int(body_top - s * 0.06)), m)
    hl = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.ellipse([cx - s * 0.18, body_top, cx - s * 0.02, body_top + s * 0.22], fill=(255, 255, 240, 120))
    body.alpha_composite(hl)
    img.alpha_composite(body)
    # neck + collar
    d.rounded_rectangle([cx - s * 0.12, body_top - s * 0.1, cx + s * 0.12, body_top + s * 0.06],
                        radius=int(s * 0.03), fill=lerp(color, (0, 0, 0), 0.2), outline=GOLD_DEEP, width=3)
    d.rounded_rectangle([cx - s * 0.19, body_top + s * 0.1, cx + s * 0.19, body_top + s * 0.19],
                        radius=int(s * 0.02), fill=GOLD, outline=GOLD_DEEP, width=3)
    # base
    d.rounded_rectangle([cx - s * 0.2, body_bot - s * 0.05, cx + s * 0.2, body_bot + s * 0.045],
                        radius=int(s * 0.02), fill=GOLD_MID, outline=GOLD_DEEP, width=3)
    # stopper: pharaoh head with nemes
    hy = body_top - s * 0.1
    for k in (-1, 1):
        d.polygon([(cx + k * s * 0.02, hy - s * 0.24), (cx + k * s * 0.17, hy - s * 0.02),
                   (cx + k * s * 0.17, hy - s * 0.17)], fill=LAPIS)
        d.line([(cx + k * s * 0.095, hy - s * 0.13), (cx + k * s * 0.17, hy - s * 0.02)], fill=GOLD_HI, width=3)
    d.ellipse([cx - s * 0.105, hy - s * 0.21, cx + s * 0.105, hy - s * 0.005], fill=lerp(GOLD, WHITE, 0.3))
    d.ellipse([cx - s * 0.105, hy - s * 0.21, cx + s * 0.105, hy - s * 0.005], outline=GOLD_DEEP, width=3)
    d.rectangle([cx - s * 0.045, hy - s * 0.14, cx + s * 0.045, hy - s * 0.05], fill=LAPIS)
    d.ellipse([cx - s * 0.038, hy - s * 0.10, cx + s * 0.038, hy - s * 0.02], fill=lerp(GOLD, WHITE, 0.4))
    # painted scarab on body
    d.ellipse([cx - s * 0.07, body_top + s * 0.28, cx + s * 0.07, body_top + s * 0.44], fill=GOLD_DEEP)
    d.ellipse([cx - s * 0.035, body_top + s * 0.22, cx + s * 0.035, body_top + s * 0.32], fill=GOLD_DEEP)
    return img


def artifact_sistrum() -> Image.Image:
    s = int(CELL * 0.8)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = s / 2
    # handle
    d.rounded_rectangle([cx - s * 0.032, s * 0.40, cx + s * 0.032, s * 0.9], radius=int(s * 0.028), fill=GOLD_MID)
    d.line([cx - s * 0.012, s * 0.42, cx - s * 0.012, s * 0.86], fill=GOLD_HI, width=3)
    d.ellipse([cx - s * 0.055, s * 0.86, cx + s * 0.055, s * 0.95], fill=GOLD_DEEP)
    # naos-shaped top (bell)
    d.polygon([(cx - s * 0.28, s * 0.10), (cx + s * 0.28, s * 0.10), (cx + s * 0.19, s * 0.44), (cx - s * 0.19, s * 0.44)],
              fill=lerp(GOLD_DEEP, (0, 0, 0), 0.25))
    d.polygon([(cx - s * 0.28, s * 0.10), (cx + s * 0.28, s * 0.10), (cx + s * 0.19, s * 0.44), (cx - s * 0.19, s * 0.44)],
              outline=GOLD_DEEP, width=5)
    d.polygon([(cx - s * 0.23, s * 0.14), (cx + s * 0.23, s * 0.14), (cx + s * 0.15, s * 0.40), (cx - s * 0.15, s * 0.40)],
              fill=GOLD)
    # cross bars with jingles
    for i, fy in enumerate((0.18, 0.32)):
        y = s * fy
        d.line([cx - s * 0.21, y, cx + s * 0.21, y], fill=GOLD_HI, width=int(s * 0.018))
        for k in (-1, 0, 1):
            jx = cx + k * s * 0.15
            d.ellipse([jx - s * 0.03, y - s * 0.03, jx + s * 0.03, y + s * 0.03], fill=GOLD, outline=GOLD_DEEP, width=2)
    d.ellipse([cx - s * 0.045, s * 0.20, cx + s * 0.045, s * 0.30], fill=TURQUOISE, outline=GOLD_DEEP, width=3)
    return img


def artifact_crook_flail() -> Image.Image:
    s = int(CELL * 0.8)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    cx, cy = s * 0.5, s * 0.52
    d = ImageDraw.Draw(img)

    def staff(angle: float, kind: str) -> None:
        ln = s * 0.36
        dx, dy = math.cos(angle), math.sin(angle)
        x0, y0 = cx - dx * ln, cy - dy * ln
        x1, y1 = cx + dx * ln, cy + dy * ln
        # shaft
        for wdt, col in ((int(s * 0.052), GOLD_DEEP), (int(s * 0.034), GOLD_MID)):
            d.line([x0, y0, x1, y1], fill=col, width=wdt)
        d.line([x0, y0 - 2, x1, y1 - 2], fill=GOLD_HI, width=max(2, int(s * 0.012)))
        if kind == "crook":
            # hooked top at (x1,y1)
            hx, hy = x1, y1
            d.arc([hx - s * 0.17, hy - s * 0.24, hx + s * 0.11, hy + s * 0.08], start=185, end=15,
                  fill=GOLD_MID, width=int(s * 0.042))
            d.arc([hx - s * 0.17, hy - s * 0.24, hx + s * 0.11, hy + s * 0.08], start=185, end=15,
                  fill=GOLD_DEEP, width=2)
        else:
            # flail: 3 tassels hanging from top end
            tx, ty = x1, y1
            for i in range(3):
                t = (i - 1) * 0.4
                ex, ey = tx + s * 0.02 + t * s * 0.14, ty + s * 0.16
                d.line([tx, ty, ex, ey], fill=GOLD_HI, width=int(s * 0.02))
                d.ellipse([ex - s * 0.028, ey - s * 0.028, ex + s * 0.028, ey + s * 0.028], fill=GOLD, outline=GOLD_DEEP, width=2)
        d.ellipse([x0 - s * 0.032, y0 - s * 0.032, x0 + s * 0.032, y0 + s * 0.032], fill=GOLD, outline=GOLD_DEEP, width=2)

    staff(math.radians(115), "crook")
    staff(math.radians(65), "flail")
    # crossing collar
    d.ellipse([cx - s * 0.05, cy - s * 0.05, cx + s * 0.05, cy + s * 0.05], fill=GOLD_HI, outline=GOLD_DEEP, width=2)
    return img


def artifact_bar(rows: int = 1) -> Image.Image:
    """Classic BAR — stacked gold ingots with engraved text."""
    s = int(CELL * 0.8)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bw, bh = s * 0.72, s * (0.20 if rows > 1 else 0.26)
    gap = s * 0.045
    total_h = rows * bh + (rows - 1) * gap
    y0 = s / 2 - total_h / 2
    for i in range(rows):
        y = y0 + i * (bh + gap)
        ing = Image.new("RGBA", (int(bw), int(bh)), (0, 0, 0, 0))
        grad = vgrad((int(bw), int(bh)), [(0.0, GOLD_HI), (0.45, GOLD), (1.0, GOLD_DEEP)])
        m = rounded_mask(grad.size, int(bh * 0.3))
        ing.paste(grad, (0, 0), m)
        ing = drop_shadow(ing, 4, 8, 8, 130)
        img.alpha_composite(ing, (int(s / 2 - bw / 2), int(y)))
        idd = ImageDraw.Draw(img)
        f = font(FONT_BOLD, int(bh * 0.62))
        text = "BAR"
        bbox = f.getbbox(text)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = s / 2 - tw / 2 - bbox[0]
        ty = y + bh / 2 - th / 2 - bbox[1]
        idd.text((tx + 2, ty + 3), text, font=f, fill=(90, 52, 10, 220))
        idd.text((tx, ty), text, font=f, fill=(255, 248, 214, 255))
    return img


def artifact_seven() -> Image.Image:
    s = int(CELL * 0.82)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    # radiant sun behind
    cx, cy = s / 2, s * 0.42
    rays = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for i in range(16):
        a = i * math.pi / 8
        r0, r1 = s * 0.28, s * (0.40 if i % 2 == 0 else 0.33)
        rd.polygon([(cx + math.cos(a) * r0, cy + math.sin(a) * r0),
                    (cx + math.cos(a - 0.06) * r1, cy + math.sin(a - 0.06) * r1),
                    (cx + math.cos(a + 0.06) * r1, cy + math.sin(a + 0.06) * r1)], fill=GOLD_MID + (235,))
    rays = rays.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(rays)
    d = ImageDraw.Draw(img)
    d.ellipse([cx - s * 0.26, cy - s * 0.26, cx + s * 0.26, cy + s * 0.26], fill=lerp(GOLD, WHITE, 0.35), outline=GOLD_DEEP, width=4)
    # big 7
    f = font(FONT_BOLD, int(s * 0.72))
    t = "7"
    bbox = f.getbbox(t)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = s / 2 - tw / 2 - bbox[0], s * 0.86 - th - bbox[1]
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).text((tx, ty), t, font=f, fill=255)
    grad = vgrad((s, s), [(0.0, GOLD_HI), (0.4, GOLD), (0.75, GOLD_MID), (1.0, GOLD_DEEP)])
    for dy in (6, 5, 4, 3):
        img.paste(Image.new("RGBA", (s, s), (64, 36, 8, 255)), (0, dy), mask)
    img.paste(grad, (0, 0), mask)
    gloss = Image.new("RGBA", (s, s), (255, 255, 240, 90))
    fade = Image.new("L", (s, s), 0)
    ImageDraw.Draw(fade).rectangle([0, 0, s, int(s * 0.5)], fill=120)
    img.paste(gloss, (0, 0), Image.composite(mask, Image.new("L", (s, s), 0), fade))
    ring = mask.filter(ImageFilter.MaxFilter(3))
    img.paste(Image.new("RGBA", (s, s), (40, 20, 4, 255)), (0, 0), Image.composite(ring, Image.new("L", (s, s), 0), mask))
    return img


def artifact_coin() -> Image.Image:
    """Hold & Spin bonus coin — embossed scarab medallion."""
    s = int(CELL * 0.8)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = s / 2
    r = s * 0.42
    disc = rgrad((int(r * 2), int(r * 2)), GOLD_HI, GOLD_DEEP, center=(0.42, 0.36))
    m = Image.new("L", disc.size, 0)
    ImageDraw.Draw(m).ellipse([0, 0, disc.size[0] - 1, disc.size[1] - 1], fill=255)
    img.paste(disc, (int(cx - r), int(cy - r)), m)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD_SHADOW, width=5)
    d.ellipse([cx - r * 0.86, cy - r * 0.86, cx + r * 0.86, cy + r * 0.86], outline=GOLD_MID, width=5)
    d.ellipse([cx - r * 0.86, cy - r * 0.86, cx + r * 0.86, cy + r * 0.86], outline=(255, 244, 200, 90), width=2)
    # bold scarab silhouette: shadow pass then light pass
    for off, col in ((4, (104, 60, 12, 255)), (0, (255, 244, 202, 255))):
        sd = ImageDraw.Draw(img)
        bx, by = cx + off, cy + off * 0.5
        u = r * 0.40
        # wing covers: two thick arcs sweeping outward-down
        for k in (-1, 1):
            sd.arc([bx - u * 1.05 + (k * u * 0.28 if k > 0 else 0), by - u * 0.30,
                    bx + u * 1.05 + (k * u * 0.28 if k > 0 else 0), by + u * 0.95],
                   start=205 if k < 0 else 335, end=120 if k < 0 else 60, fill=col, width=int(u * 0.22))
        # body
        sd.ellipse([bx - u * 0.38, by - u * 0.30, bx + u * 0.38, by + u * 0.70], fill=col)
        # pronotum + head
        sd.ellipse([bx - u * 0.26, by - u * 0.62, bx + u * 0.26, by - u * 0.08], fill=col)
        sd.ellipse([bx - u * 0.15, by - u * 0.88, bx + u * 0.15, by - u * 0.50], fill=col)
        # horns
        for k in (-1, 1):
            sd.arc([bx + k * u * 0.06 - u * 0.1, by - u * 1.12, bx + k * u * 0.06 + u * 0.34, by - u * 0.62],
                   start=90 if k < 0 else 0, end=270 if k < 0 else 180, fill=col, width=int(u * 0.12))
        # legs
        for k in (-1, 1):
            for fy in (0.05, 0.4):
                lx, ly = bx + k * u * 0.34, by + u * fy
                sd.line([lx, ly, lx + k * u * 0.26, ly + u * 0.16], fill=col, width=max(3, int(u * 0.09)))
    d.line([cx, cy - r * 0.18, cx, cy + r * 0.34], fill=(140, 88, 22, 255), width=max(3, int(r * 0.05)))
    return img


def artifact_pyramid() -> Image.Image:
    """Scatter — jeweled pyramid with radiant capstone."""
    s = int(CELL * 0.82)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    cx = s / 2
    base_y = s * 0.82
    half = s * 0.40
    apex = (cx, s * 0.12)
    glow_layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    gd.ellipse([cx - s * 0.22, s * 0.04, cx + s * 0.22, s * 0.34], fill=(255, 236, 170, 210))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(20))
    img.alpha_composite(glow_layer)
    d = ImageDraw.Draw(img)
    d.polygon([apex, (cx - half, base_y), (cx, base_y)], fill=lerp(LAPIS, NIGHT, 0.2))
    d.polygon([apex, (cx + half, base_y), (cx, base_y)], fill=lerp(LAPIS, LAPIS_LIGHT, 0.42))
    for t in (0.32, 0.54, 0.76):
        y = s * 0.12 + (base_y - s * 0.12) * t
        w2 = half * t
        d.line([cx - w2, y, cx + w2, y], fill=lerp(LAPIS_DEEP, (0, 0, 0), 0.35), width=3)
        # brick joints
        for f in (0.33, 0.66):
            d.line([cx + (2 * f - 1) * w2, y, cx + (2 * f - 1) * half * max(0.0, t - 0.12), y + (base_y - s * 0.12) * 0.1],
                   fill=lerp(LAPIS_DEEP, (0, 0, 0), 0.35), width=2)
    d.polygon([apex, (cx - half, base_y), (cx, base_y), (cx + half, base_y)], outline=GOLD_DEEP, width=4)
    ct = 0.24
    cy2 = s * 0.12 + (base_y - s * 0.12) * ct
    w2 = half * ct
    d.polygon([apex, (cx - w2, cy2), (cx + w2, cy2)], fill=GOLD)
    d.polygon([apex, (cx - w2, cy2), (cx, cy2)], fill=GOLD_HI)
    d.rounded_rectangle([cx - half * 1.15, base_y, cx + half * 1.15, base_y + s * 0.075], radius=8, fill=GOLD_MID, outline=GOLD_DEEP, width=3)
    for jx, jy, col in ((cx - half * 0.4, base_y - s * 0.14, TURQUOISE), (cx + half * 0.42, base_y - s * 0.2, CARNELIAN), (cx - half * 0.14, base_y - s * 0.34, GOLD)):
        jewel(d, int(jx), int(jy), int(s * 0.036), col)
    sparkle(img, int(cx - half * 0.44), int(base_y - s * 0.44), int(s * 0.055))
    sparkle(img, int(cx + half * 0.46), int(base_y - s * 0.3), int(s * 0.04))
    return img


def artifact_sun_ra() -> Image.Image:
    """Scatter — radiant Ra sun disk."""
    s = int(CELL * 0.82)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    cx, cy = s / 2, s * 0.54
    rays = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for i in range(20):
        a = i * math.pi / 10
        r1 = s * (0.48 if i % 2 == 0 else 0.41)
        rd.polygon([(cx + math.cos(a - 0.055) * s * 0.28, cy + math.sin(a - 0.055) * s * 0.28),
                    (cx + math.cos(a) * r1, cy + math.sin(a) * r1),
                    (cx + math.cos(a + 0.055) * s * 0.28, cy + math.sin(a + 0.055) * s * 0.28)], fill=GOLD + (255,))
    rays = rays.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(rays)
    d = ImageDraw.Draw(img)
    disc = rgrad((int(s * 0.64), int(s * 0.64)), (255, 246, 208), (212, 138, 34))
    m = Image.new("L", disc.size, 0)
    ImageDraw.Draw(m).ellipse([0, 0, disc.size[0] - 1, disc.size[1] - 1], fill=255)
    img.paste(disc, (int(cx - s * 0.32), int(cy - s * 0.32)), m)
    d.ellipse([cx - s * 0.32, cy - s * 0.32, cx + s * 0.32, cy + s * 0.32], outline=GOLD_DEEP, width=5)
    d.ellipse([cx - s * 0.32, cy - s * 0.32, cx + s * 0.32, cy + s * 0.32], outline=(255, 248, 214, 130), width=2)
    # inner carved eye of Ra mark
    d.ellipse([cx - s * 0.14, cy - s * 0.12, cx + s * 0.14, cy + s * 0.1], outline=GOLD_DEEP, width=4)
    d.ellipse([cx - s * 0.05, cy - s * 0.07, cx + s * 0.05, cy + s * 0.05], fill=lerp(GARNET, CARNELIAN, 0.5))
    return img


def _rotated_petal(size: int, angle: float, length: float, width: float,
                   color: Tuple[int, int, int], outline: Tuple[int, int, int]) -> Image.Image:
    """Broad rounded petal centered in its tile pointing up; caller rotates for direction."""
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    td.ellipse([size / 2 - width / 2, size / 2 - length, size / 2 + width / 2, size / 2 + length * 0.18],
               fill=color, outline=outline, width=3)
    td.ellipse([size / 2 - width * 0.20, size / 2 - length * 0.82, size / 2 + width * 0.14, size / 2 - length * 0.38],
               fill=lerp(color, WHITE, 0.42))
    # angle is the CCW correction so the up-pointing petal aims at direction a:
    # theta = -90deg - a  (PIL rotate is CCW-positive)
    return tile


def artifact_lotus(color: Tuple[int, int, int] = TURQUOISE) -> Image.Image:
    """Golden lotus in the style of the Kemet decor ornament."""
    s = int(CELL * 0.8)
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    cx, cy = s * 0.5, s * 0.60
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    def add(a: float, ln: float, wdt: float, col: Tuple[int, int, int]) -> None:
        pet = _rotated_petal(s, a, ln, wdt, col, lerp(col, (0, 0, 0), 0.55))
        theta = -90 - math.degrees(a)
        pet = pet.rotate(theta, resample=Image.BICUBIC)
        layer.alpha_composite(pet, (int(cx - s / 2), int(cy - s / 2)))

    dark = lerp(color, (0, 0, 0), 0.22)
    add(math.radians(-152), s * 0.46, s * 0.30, dark)
    add(math.radians(-28), s * 0.46, s * 0.30, dark)
    add(math.radians(-118), s * 0.52, s * 0.32, color)
    add(math.radians(-62), s * 0.52, s * 0.32, color)
    add(math.radians(-90), s * 0.60, s * 0.34, lerp(color, WHITE, 0.16))
    img.alpha_composite(layer)
    d = ImageDraw.Draw(img)
    d.ellipse([cx - s * 0.09, cy - s * 0.10, cx + s * 0.09, cy + s * 0.08], fill=lerp(LAPIS, LAPIS_LIGHT, 0.5), outline=GOLD_DEEP, width=3)
    d.ellipse([cx - s * 0.048, cy - s * 0.075, cx - s * 0.002, cy - s * 0.005], fill=lerp(LAPIS_LIGHT, WHITE, 0.55))
    d.rounded_rectangle([cx - s * 0.36, cy + s * 0.08, cx + s * 0.36, cy + s * 0.19], radius=int(s * 0.05), fill=GOLD, outline=GOLD_DEEP, width=3)
    d.line([cx - s * 0.3, cy + s * 0.115, cx + s * 0.3, cy + s * 0.115], fill=GOLD_HI, width=3)
    return img


# ------------------------------------------------------------ pack loads ----
def pack(path: str) -> Image.Image:
    from kemet_common import KEMET_PNG
    return Image.open(f"{KEMET_PNG}/{path}").convert("RGBA")


# ------------------------------------------------------------ atlas build ---
def build_atlas(order: List[Optional[Image.Image]], game_dir: str) -> None:
    """order: 12 entries (row-major). None -> placeholder dark cell."""
    atlas_cut = Image.new("RGBA", (1086, 1448), (0, 0, 0, 0))
    atlas_solid = Image.new("RGB", (1086, 1448), (12, 9, 22))
    for i, art in enumerate(order):
        if art is None:
            continue
        cell = art.resize((362, 362), Image.LANCZOS)
        col, row = i % 3, i // 3
        atlas_cut.paste(cell, (col * 362, row * 362))
        atlas_solid.paste(cell, (col * 362, row * 362), cell)
    atlas_cut.save(f"{OUT}/{game_dir}/symbol_atlas_cutout_v02.png")
    atlas_solid.save(f"{OUT}/{game_dir}/symbol_atlas_v02.png")
    print(f"atlas {game_dir} ok")


def symbol_sheet(cells: List[Tuple[str, Image.Image]], path: str) -> None:
    cols = 4
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * 380, rows * 380), (36, 30, 58, 255))
    for i, (name, art) in enumerate(cells):
        if art is None:
            continue
        small = art.resize((362, 362), Image.LANCZOS)
        sheet.paste(small, ((i % cols) * 380 + 9, (i // cols) * 380 + 9), small)
    sheet.convert("RGB").save(path, quality=90)
    print("sheet", path)


PANEL = {  # inner panel colors per game accent
    "g1": (44, 30, 86), "g2": (16, 74, 74), "g3": (74, 46, 26), "g4": (52, 26, 84),
}


def game01_cells() -> List[Tuple[str, Image.Image]]:
    p = PANEL["g1"]
    cells = [
        ("lapis", gem_symbol("round", LAPIS, p)),
        ("carnelian", gem_symbol("oval", CARNELIAN, p)),
        ("turquoise", gem_symbol("pear", TURQUOISE, p)),
        ("jasper", gem_symbol("marquise", JASPER, p)),
        ("cartouche", framed_symbol(artifact_cartouche(), p)),
        ("ring", framed_symbol(artifact_ring(), p)),
        ("ankh", fit_content(pack("symbols/high/high_ankh.png"), CELL)),
        ("eye", fit_content(pack("symbols/high/high_eye.png"), CELL)),
        ("scarab", fit_content(pack("symbols/high/high_scarab.png"), CELL)),
        ("necklace", fit_content(pack("symbols/high/high_necklace.png"), CELL)),
        ("wild", fit_content(pack("symbols/wild/wild.png"), CELL)),
        ("scatter", framed_symbol(artifact_pyramid(), p)),
    ]
    return cells


def game02_cells() -> List[Tuple[str, Image.Image]]:
    p = PANEL["g2"]
    cells = [
        ("garnet", gem_symbol("round", GARNET, p)),
        ("faience", gem_symbol("emerald", FAIENCE, p)),
        ("onyx", gem_symbol("cushion", ONYX, p)),
        ("topaz", gem_symbol("oval", TOPAZ, p)),
        ("sistrum", framed_symbol(artifact_sistrum(), p)),
        ("crook", framed_symbol(artifact_crook_flail(), p)),
        ("eye", fit_content(pack("symbols/high/high_eye.png"), CELL)),
        ("scarab", fit_content(pack("symbols/high/high_scarab.png"), CELL)),
        ("necklace", fit_content(pack("symbols/high/high_necklace.png"), CELL)),
        ("wild", fit_content(pack("symbols/wild/wild.png"), CELL)),
        ("scatter", framed_symbol(artifact_lotus(), p)),
        (None, None),
    ]
    return cells


def game03_cells() -> List[Tuple[str, Image.Image]]:
    p = PANEL["g3"]
    cells = [
        ("lotus", framed_symbol(artifact_lotus(FAIENCE), p)),
        ("jar", framed_symbol(artifact_jar(TOPAZ), p)),
        ("sistrum", framed_symbol(artifact_sistrum(), p)),
        ("bar", framed_symbol(artifact_bar(1), p)),
        ("double-bar", framed_symbol(artifact_bar(2), p)),
        ("seven", framed_symbol(artifact_seven(), p)),
        ("wild", fit_content(pack("symbols/wild/wild.png"), CELL)),
        (None, None),
        (None, None),
        (None, None),
        (None, None),
        (None, None),
    ]
    return cells


def game04_cells() -> List[Tuple[str, Image.Image]]:
    p = PANEL["g4"]
    cells = [
        ("lapis", gem_symbol("cushion", LAPIS, p)),
        ("carnelian", gem_symbol("marquise", CARNELIAN, p)),
        ("turquoise", gem_symbol("oval", TURQUOISE, p)),
        ("amethyst", gem_symbol("emerald", AMETHYST, p)),
        ("ring", framed_symbol(artifact_ring(), p)),
        ("jar", framed_symbol(artifact_jar(FAIENCE), p)),
        ("ankh", fit_content(pack("symbols/high/high_ankh.png"), CELL)),
        ("eye", fit_content(pack("symbols/high/high_eye.png"), CELL)),
        ("necklace", fit_content(pack("symbols/high/high_necklace.png"), CELL)),
        ("bonus", framed_symbol(artifact_coin(), p)),
        ("wild", fit_content(pack("symbols/wild/wild.png"), CELL)),
        ("scatter", framed_symbol(artifact_sun_ra(), p)),
    ]
    return cells


if __name__ == "__main__":
    import os
    for g, fn in (("game01", game01_cells), ("game02", game02_cells), ("game03", game03_cells), ("game04", game04_cells)):
        cells = fn()
        build_atlas([c[1] for c in cells], g)
        symbol_sheet(cells, f"{PIPE_OUT}/symbols_{g}.jpg")
