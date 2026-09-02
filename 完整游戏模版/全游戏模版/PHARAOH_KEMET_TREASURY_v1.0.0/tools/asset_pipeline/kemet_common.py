# -*- coding: utf-8 -*-
"""Kemet asset pipeline — shared rendering library.

Every asset is drawn at 2x and downscaled for anti-aliasing. The palette and
gold treatments intentionally mirror the Crowns of Kemet studio pack so the
programmatically drawn pieces sit next to the hand-painted ones undetectably.
"""
from __future__ import annotations

import math
from typing import Optional, Sequence, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------- palette ---
LAPIS_DEEP = (16, 24, 66)
LAPIS = (30, 64, 156)
LAPIS_LIGHT = (86, 130, 224)
TURQUOISE = (26, 168, 152)
TURQUOISE_LIGHT = (108, 220, 200)
CARNELIAN = (186, 44, 34)
CARNELIAN_LIGHT = (238, 108, 76)
AMETHYST = (118, 58, 168)
AMETHYST_LIGHT = (188, 128, 236)
GARNET = (140, 22, 56)
FAIENCE = (34, 142, 96)
TOPAZ = (222, 138, 28)
ONYX = (28, 34, 64)
JASPER = (196, 110, 34)
GOLD_HI = (255, 240, 190)
GOLD = (232, 186, 92)
GOLD_MID = (198, 142, 52)
GOLD_DEEP = (138, 88, 26)
GOLD_SHADOW = (86, 52, 12)
SAND = (206, 168, 112)
SAND_LIGHT = (238, 212, 160)
SAND_DEEP = (150, 108, 60)
NIGHT = (24, 18, 46)
NIGHT_DEEP = (10, 8, 24)
OBSIDIAN = (30, 24, 54)
CREAM = (247, 236, 208)
WHITE = (255, 252, 244)

KEMET_PNG = "/Users/xzkj/Desktop/图片/slots素材/CrownsOfKemet_RetroStyle/RSG-Slot-Asset-Pack-Crowns-of-Kemet-Free/PNG"
OUT = "/Users/xzkj/Desktop/slots-game-template/完整游戏模版/全游戏模版/PHARAOH_KEMET_TREASURY_v1.0.0/assets/resources/generated"
PIPE_OUT = "/Users/xzkj/Desktop/slots-game-template/完整游戏模版/全游戏模版/PHARAOH_KEMET_TREASURY_v1.0.0/tools/asset_pipeline/out"

FONT_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
FONT_BOOK = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def lerp(a: Tuple[int, int, int], b: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))  # type: ignore[return-value]


def vgrad(size: Tuple[int, int], stops: Sequence[Tuple[float, Tuple[int, int, int]]]) -> Image.Image:
    """Vertical gradient image; stops = [(pos0..1, rgb), ...]."""
    w, h = size
    col = Image.new("RGB", (1, h))
    px = col.load()
    for y in range(h):
        t = y / max(1, h - 1)
        lo, hi = stops[0], stops[-1]
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                lo, hi = stops[i], stops[i + 1]
                break
        span = max(1e-6, hi[0] - lo[0])
        px[0, y] = lerp(lo[1], hi[1], (t - lo[0]) / span)
    return col.resize((w, h))


def rgrad(size: Tuple[int, int], inner: Tuple[int, int, int], outer: Tuple[int, int, int],
          center: Tuple[float, float] = (0.5, 0.42), radius: float = 0.75) -> Image.Image:
    """Radial gradient (inner -> outer)."""
    w, h = size
    small = max(8, int(min(w, h) * 0.25))
    img = Image.new("RGB", (small, small))
    px = img.load()
    cx, cy = center[0] * small, center[1] * small
    rmax = radius * small
    for y in range(small):
        for x in range(small):
            d = math.hypot(x - cx, y - cy) / rmax
            px[x, y] = lerp(inner, outer, min(1.0, d))
    return img.resize((w, h), Image.BILINEAR)


def rounded_mask(size: Tuple[int, int], radius: int, inset: int = 0) -> Image.Image:
    w, h = size
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([inset, inset, w - 1 - inset, h - 1 - inset], radius=radius, fill=255)
    return m


def alpha_bounds(img: Image.Image, thresh: int = 8) -> Tuple[int, int, int, int]:
    bbox = img.getchannel("A").point(lambda p: 255 if p > thresh else 0).getbbox()
    return bbox if bbox else (0, 0, img.width, img.height)


def fit_content(img: Image.Image, box: int, shadow: bool = True) -> Image.Image:
    """Trim transparent margins then scale to fit `box` (square), centered on `box` canvas."""
    bbox = alpha_bounds(img)
    img = img.crop(bbox)
    scale = box / max(img.width, img.height)
    img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    canvas.paste(img, ((box - img.width) // 2, (box - img.height) // 2), img)
    return canvas


def glow(img: Image.Image, radius: int, color: Tuple[int, int, int, int], strength: float = 1.0) -> Image.Image:
    """Add a soft outer glow using the image's own alpha."""
    base = img.split()[3].filter(ImageFilter.GaussianBlur(radius))
    layer = Image.new("RGBA", img.size, color)
    layer.putalpha(base.point(lambda p: int(min(255, p * strength))))
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.alpha_composite(layer)
    out.alpha_composite(img)
    return out


def drop_shadow(img: Image.Image, dx: int, dy: int, blur: int, alpha: int = 140) -> Image.Image:
    pad = blur * 2
    w, h = img.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    mask = img.getchannel("A")
    black = Image.new("RGBA", img.size, (8, 6, 16, alpha))
    sh.paste(black, (pad + dx, pad + dy), mask)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(sh)
    canvas.alpha_composite(img, (pad, pad))
    return canvas.crop((pad - max(0, -dx) - blur, pad - max(0, -dy) - blur,
                        pad + w + max(0, dx) + blur, pad + h + max(0, dy) + blur))


# ------------------------------------------------------------ gold frames ---
def gold_gradient(size: Tuple[int, int], vertical: bool = True) -> Image.Image:
    stops = [(0.0, GOLD_HI), (0.28, GOLD), (0.52, GOLD_MID), (0.74, GOLD), (1.0, GOLD_DEEP)]
    return vgrad(size, stops) if vertical else vgrad((size[1], size[0]), stops).rotate(90, expand=True).resize(size)


def gold_bevel_panel(size: Tuple[int, int], radius: int, border: int,
                     inner: Optional[Image.Image] = None,
                     inner_color: Tuple[int, int, int] = (52, 34, 78)) -> Image.Image:
    """Metallic gold rounded panel with beveled rim, optional inner image fill."""
    w, h = size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # outer dark outline
    outline = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(outline)
    d.rounded_rectangle([2, 2, w - 3, h - 3], radius=radius, fill=GOLD_SHADOW + (255,))
    img.alpha_composite(outline)
    # gold rim
    rim = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = rounded_mask((w, h), radius)
    rim.paste(gold_gradient((w, h)), (0, 0), mask)
    img.alpha_composite(rim)
    # rim shading: bottom inner shadow + top highlight line
    shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shade)
    ds.rounded_rectangle([border, border, w - 1 - border, h - 1 - border], radius=max(4, radius - border), fill=(0, 0, 0, 0))
    ds.rounded_rectangle([2, 2, w - 3, h - 3], radius=radius, outline=(60, 36, 8, 160), width=2)
    ds.arc([4, 4, w - 5, h - 5], start=200, end=320, fill=(255, 248, 214, 220), width=3)
    img.alpha_composite(shade)
    # inner panel
    if inner is not None:
        inner = inner.resize((w - border * 2, h - border * 2), Image.LANCZOS)
        m = rounded_mask(inner.size, max(4, radius - border))
        img.paste(inner, (border, border), m)
    else:
        panel = rgrad((w - border * 2, h - border * 2),
                      lerp(inner_color, (255, 255, 255), 0.14), lerp(inner_color, (0, 0, 0), 0.42))
        m = rounded_mask(panel.size, max(4, radius - border))
        img.paste(panel, (border, border), m)
        pd = ImageDraw.Draw(img)
        pd.rounded_rectangle([border, border, w - border - 1, h - border - 1],
                             radius=max(4, radius - border), outline=GOLD_DEEP + (200,), width=2)
    return img


def jewel(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color: Tuple[int, int, int],
          highlight: bool = True) -> None:
    """Small round cabochon gem with gold bezel."""
    d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], fill=GOLD_DEEP)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=lerp(color, (0, 0, 0), 0.35))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD, width=2)
    if highlight:
        d.ellipse([cx - int(r * 0.55), cy - int(r * 0.62), cx - 1, cy - int(r * 0.1)],
                  fill=lerp(color, WHITE, 0.72))


def sparkle(img: Image.Image, cx: int, cy: int, r: int, alpha: int = 235) -> None:
    """4-point star sparkle."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = []
    for i in range(8):
        ang = math.pi / 4 * i
        rad = r if i % 2 == 0 else r * 0.22
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    d.polygon(pts, fill=(255, 252, 236, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(max(1, r // 8)))
    img.alpha_composite(layer)


# ------------------------------------------------------------- glyph art ---
def draw_ankh(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, fill, outline=None, width=3) -> None:
    loop_r = s * 0.30
    d.ellipse([cx - loop_r, cy - s * 0.52, cx + loop_r, cy - s * 0.52 + loop_r * 2], outline=fill, width=int(max(3, s * 0.16)))
    d.line([cx, cy - s * 0.52 + loop_r * 2 - s * 0.02, cx, cy + s * 0.5], fill=fill, width=int(max(3, s * 0.18)))
    d.line([cx - s * 0.34, cy - s * 0.08, cx + s * 0.34, cy - s * 0.08], fill=fill, width=int(max(3, s * 0.16)))


def draw_eye_hieroglyph(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, fill) -> None:
    d.line([cx - s * 0.42, cy, cx + s * 0.3, cy - s * 0.05], fill=fill, width=int(max(2, s * 0.1)))
    d.arc([cx + s * 0.18, cy - s * 0.22, cx + s * 0.5, cy + s * 0.14], start=-80, end=100, fill=fill, width=int(max(2, s * 0.08)))
    d.line([cx - s * 0.1, cy + s * 0.05, cx - s * 0.18, cy + s * 0.4], fill=fill, width=int(max(2, s * 0.08)))
    d.arc([cx - s * 0.02, cy + s * 0.12, cx + s * 0.24, cy + s * 0.42], start=180, end=330, fill=fill, width=int(max(2, s * 0.08)))


def draw_sun_disk(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color=GOLD) -> None:
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def hieroglyph_strip(size: Tuple[int, int], color: Tuple[int, int, int], seed: int = 7,
                     cell: int = 46, alpha: int = 255) -> Image.Image:
    """A horizontal frieze of pseudo-hieroglyphs (deterministic)."""
    import random

    rng = random.Random(seed)
    w, h = size
    strip = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(strip)
    x = cell // 2
    while x < w - cell // 2:
        kind = rng.randrange(6)
        cy = h // 2
        s = int(cell * rng.uniform(0.5, 0.66))
        lw = max(2, s // 7)
        if kind == 0:
            draw_ankh(d, x, cy, s, color + (alpha,))
        elif kind == 1:
            draw_eye_hieroglyph(d, x, cy, s, color + (alpha,))
        elif kind == 2:
            d.ellipse([x - s * 0.3, cy - s * 0.3, x + s * 0.3, cy + s * 0.3], outline=color + (alpha,), width=lw)
            d.ellipse([x - s * 0.12, cy - s * 0.12, x + s * 0.12, cy + s * 0.12], fill=color + (alpha,))
        elif kind == 3:
            d.rectangle([x - s * 0.3, cy - s * 0.36, x + s * 0.3, cy + s * 0.36], outline=color + (alpha,), width=lw)
            d.line([x - s * 0.3, cy, x + s * 0.3, cy], fill=color + (alpha,), width=lw)
        elif kind == 4:
            d.polygon([(x - s * 0.32, cy + s * 0.3), (x, cy - s * 0.34), (x + s * 0.32, cy + s * 0.3)],
                      outline=color + (alpha,), width=lw)
        else:
            d.arc([x - s * 0.32, cy - s * 0.3, x + s * 0.32, cy + s * 0.3], start=20, end=320, fill=color + (alpha,), width=lw)
            d.line([x, cy + s * 0.02, x, cy + s * 0.42], fill=color + (alpha,), width=lw)
        x += int(cell * rng.uniform(0.82, 1.05))
    return strip


def winged_sun(size: Tuple[int, int]) -> Image.Image:
    """Stylized winged sun disk emblem — cabinet cornices and jackpot stage."""
    w, h = size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = w // 2, int(h * 0.58)
    disk_r = int(min(w * 0.5, h) * 0.30)
    wing_len = w * 0.5 - disk_r * 0.9

    def wing(sign: int) -> None:
        # three swept feather rows, each a fan of tapered quads
        rows = 3
        for row in range(rows):
            t = row / (rows - 1)
            feathers = 9 - row * 2
            base_y = cy - disk_r * (0.42 - t * 0.5)
            drop = disk_r * (0.85 - t * 0.55)
            flen = wing_len * (1.0 - t * 0.22)
            for i in range(feathers):
                f = (i + 0.5) / feathers
                fx = cx + sign * (disk_r * 0.72 + f * flen)
                fy = base_y + (f ** 1.6) * drop
                fw = disk_r * (0.42 - t * 0.10) * (1.0 - f * 0.45)
                fh = disk_r * (0.62 - t * 0.14) * (1.0 - f * 0.5)
                ang = (f ** 1.3) * 0.55
                col = lerp(GOLD_HI, GOLD_DEEP, min(1.0, 0.15 + 0.55 * f + 0.2 * t))
                tile = Image.new("RGBA", (int(fw * 2 + 8), int(fh * 2 + 8)), (0, 0, 0, 0))
                td = ImageDraw.Draw(tile)
                td.ellipse([4, 4, fw * 2 + 4, fh * 2 + 4], fill=col + (255,))
                td.ellipse([4, 4, fw * 2 + 4, fh * 2 + 4], outline=lerp(GOLD_DEEP, (0, 0, 0), 0.35) + (180,), width=2)
                tile = tile.rotate(math.degrees(ang) * sign, expand=False)
                img.alpha_composite(tile, (int(fx - tile.width / 2), int(fy - tile.height / 2)))
        # wing top sweep
        d.arc([cx + (sign * disk_r * 0.5) - disk_r * 0.2 if sign > 0 else cx - wing_len - disk_r * 0.2,
               cy - disk_r * 1.35,
               cx + wing_len + disk_r * 0.2 if sign > 0 else cx - sign * disk_r * 0.5 + disk_r * 0.2,
               cy + disk_r * 0.4], start=280 if sign > 0 else 180, end=360 if sign > 0 else 80,
              fill=GOLD_MID + (255,), width=max(3, int(disk_r * 0.14)))

    wing(-1)
    wing(1)
    # disk with horns
    horns = ImageDraw.Draw(img)
    horns.arc([cx - disk_r * 1.6, cy - disk_r * 1.75, cx + disk_r * 1.6, cy + disk_r * 0.95], start=185, end=355,
              fill=GOLD_MID + (255,), width=int(disk_r * 0.26))
    disk = rgrad((disk_r * 2, disk_r * 2), (255, 248, 216), (200, 130, 36), center=(0.46, 0.4))
    mask = Image.new("L", disk.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, disk.size[0] - 1, disk.size[1] - 1], fill=255)
    img.paste(disk, (cx - disk_r, cy - disk_r), mask)
    d.ellipse([cx - disk_r, cy - disk_r, cx + disk_r, cy + disk_r], outline=GOLD_DEEP + (255,), width=3)
    d.ellipse([cx - disk_r * 0.5, cy - disk_r * 0.58, cx - disk_r * 0.08, cy - disk_r * 0.16], fill=(255, 252, 232, 200))
    return img


# ------------------------------------------------------------ gold text ----
def gold_text(text: str, size: int, tracking: int = 6, font_path: str = FONT_BOLD) -> Image.Image:
    """Render display text as beveled gold letters with dark outline + glow."""
    f = font(font_path, size)
    widths = []
    for ch in text:
        if ch == " ":
            widths.append(int(size * 0.34))
        else:
            bbox = f.getbbox(ch)
            widths.append((bbox[2] - bbox[0]) + tracking)
    total_w = sum(widths) + 40
    asc, desc = f.getmetrics()
    total_h = asc + desc + 40
    tile = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))

    # per-glyph draw so tracking is even
    grad = vgrad((total_w, total_h), [(0.0, GOLD_HI), (0.34, (248, 214, 128)), (0.62, GOLD_MID), (0.82, GOLD), (1.0, GOLD_DEEP)])
    mask = Image.new("L", (total_w, total_h), 0)
    md = ImageDraw.Draw(mask)
    x = 20
    for ch, cw in zip(text, widths):
        if ch != " ":
            bbox = f.getbbox(ch)
            md.text((x - bbox[0], 20), ch, font=f, fill=255)
        x += cw

    out = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    # dark extrude
    ex = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    ex.paste(Image.new("RGBA", (total_w, total_h), (64, 36, 8, 255)), (0, 0), mask)
    for dy in (5, 4, 3, 2):
        out.alpha_composite(ex, (0, dy))
    # gold fill
    out.paste(grad, (0, 0), mask)
    # bevel: light top edge, dark bottom edge via offset masks
    top = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    top.paste(Image.new("RGBA", (total_w, total_h), (255, 250, 224, 190)), (0, 0), mask)
    out.alpha_composite(Image.composite(top, Image.new("RGBA", out.size, (0, 0, 0, 0)), mask.filter(ImageFilter.GaussianBlur(0.1))))
    edge = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    inner = mask.filter(ImageFilter.MinFilter(3))
    edge_mask = Image.composite(Image.new("L", mask.size, 0), mask, inner)  # mask minus inner
    edge.paste(Image.new("RGBA", (total_w, total_h), (120, 74, 18, 200)), (0, 0), edge_mask)
    out.alpha_composite(edge)
    # top-half gloss
    gloss_mask = mask.copy()
    fade = Image.new("L", (total_w, total_h), 0)
    fd = ImageDraw.Draw(fade)
    fd.rectangle([0, 0, total_w, int(total_h * 0.42)], fill=90)
    gloss_mask = Image.composite(gloss_mask, Image.new("L", mask.size, 0), fade)
    out.paste(Image.new("RGBA", out.size, (255, 255, 240, 255)), (0, 0), gloss_mask)
    # dark outline
    o = mask.filter(ImageFilter.MaxFilter(3))
    ring = Image.composite(Image.new("L", mask.size, 0), o, mask)
    out.paste(Image.new("RGBA", out.size, (40, 20, 4, 255)), (0, 0), ring)
    bbox = out.getbbox()
    return out.crop(bbox)
