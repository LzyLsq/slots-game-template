# -*- coding: utf-8 -*-
"""Common UI / meta assets for the Kemet collection."""
from __future__ import annotations

import math
from typing import List, Tuple

from PIL import Image, ImageDraw, ImageFilter

from kemet_common import (
    AMETHYST, CARNELIAN, CREAM, FAIENCE, FONT_BOLD, GARNET, GOLD, GOLD_DEEP, GOLD_HI,
    GOLD_MID, GOLD_SHADOW, LAPIS, LAPIS_DEEP, LAPIS_LIGHT, NIGHT, NIGHT_DEEP, OUT, PIPE_OUT, SAND,
    SAND_DEEP, SAND_LIGHT, TURQUOISE, WHITE, KEMET_PNG,
    fit_content, font, glow, gold_bevel_panel, gold_gradient, gold_text, hieroglyph_strip,
    jewel, lerp, rgrad, rounded_mask, sparkle, vgrad, winged_sun, drop_shadow, alpha_bounds,
)
from gen_cabinets import _background, build_cabinet
from gen_symbols import artifact_coin, artifact_pyramid, gem_stone, CELL
from gen_atlas_real import slice_pearl, pack_cell, RENDER

PEARL = slice_pearl()


def real(path: str) -> Image.Image:
    return Image.open(f"{KEMET_PNG}/{path}").convert("RGBA")

TITLES = {
    "game01": ("KEMET PHARAOH", (255, 214, 120), LAPIS_DEEP),
    "game02": ("NILE TREASURY", (150, 240, 222), (10, 46, 52)),
    "game03": ("SCARAB CLASSIC", (255, 196, 130), (58, 34, 14)),
    "game04": ("PYRAMID JACKPOT", (222, 178, 255), (40, 18, 66)),
}


# ---------------------------------------------------------------- frames ----
def button_frame(path: str, size: Tuple[int, int], accent: Tuple[int, int, int], seed: int) -> None:
    w, h = size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bw = int(h * 0.16)
    rad = int(h * 0.30)
    # outer ring
    ring = vgrad((w, h), [(0.0, GOLD_HI), (0.4, GOLD), (0.75, GOLD_MID), (1.0, GOLD_DEEP)])
    m = rounded_mask((w, h), rad)
    img.paste(ring, (0, 0), m)
    # window (transparent center)
    inner = rounded_mask((w - bw * 2, h - bw * 2), max(6, rad - bw))
    cut = Image.new("L", (w, h), 0)
    cut.paste(inner, (bw, bw))
    alpha = img.getchannel("A")
    img.putalpha(Image.composite(Image.new("L", (w, h), 0), alpha, cut))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([bw - 2, bw - 2, w - bw + 2, h - bw + 2], radius=max(6, rad - bw), outline=GOLD_DEEP + (220,), width=3)
    d.rounded_rectangle([2, 2, w - 3, h - 3], radius=rad, outline=(50, 28, 6, 255), width=2)
    d.arc([4, 4, w - 5, h - 5], start=200, end=320, fill=(255, 250, 226, 200), width=3)
    # top crest jewel
    jewel(d, w // 2, 12, int(h * 0.09), accent)
    for cx in (w // 2 - int(w * 0.16), w // 2 + int(w * 0.16)):
        jewel(d, cx, 10, int(h * 0.06), GOLD)
    # corner accents
    for cx, cy in ((int(w * 0.085), int(h * 0.30)), (int(w * 0.915), int(h * 0.30))):
        jewel(d, cx, cy, int(h * 0.10), accent)
    glow(img, 10, accent + (60,)).save(f"{OUT}/common/{path}")
    print(path, "ok")


def control_spin() -> None:
    s = 555
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    cx = cy = s / 2
    r = s * 0.48
    d = ImageDraw.Draw(img)
    # outer gold ring
    ring = rgrad((s, s), GOLD_HI, GOLD_DEEP, center=(0.42, 0.34))
    m = Image.new("L", (s, s), 0)
    ImageDraw.Draw(m).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    img.paste(ring, (0, 0), m)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD_SHADOW, width=4)
    # enamel dish (cream center — crop window shows this region)
    er = r * 0.72
    dish = rgrad((int(er * 2), int(er * 2)), (255, 250, 236), (222, 196, 148), center=(0.44, 0.4))
    dm = Image.new("L", dish.size, 0)
    ImageDraw.Draw(dm).ellipse([0, 0, dish.size[0] - 1, dish.size[1] - 1], fill=255)
    img.paste(dish, (int(cx - er), int(cy - er)), dm)
    d.ellipse([cx - er, cy - er, cx + er, cy + er], outline=GOLD_DEEP, width=5)
    d.ellipse([cx - er * 0.9, cy - er * 0.9, cx + er * 0.9, cy + er * 0.9], outline=(255, 252, 240, 160), width=3)
    # jewel studs at cardinal points
    for a in (0, 90, 180, 270):
        jx = cx + math.cos(math.radians(a)) * r * 0.86
        jy = cy + math.sin(math.radians(a)) * r * 0.86
        jewel(d, int(jx), int(jy), int(r * 0.075), CARNELIAN)
    img = glow(img, 12, (255, 226, 150, 70))
    img.save(f"{OUT}/common/cabinet_control_spin_v01.png")
    print("spin ok")


def control_bet() -> None:
    w, h = 583, 297
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rad = int(h * 0.34)
    ring = vgrad((w, h), [(0.0, GOLD_HI), (0.4, GOLD), (0.8, GOLD_MID), (1.0, GOLD_DEEP)])
    m = rounded_mask((w, h), rad)
    img.paste(ring, (0, 0), m)
    d.rounded_rectangle([2, 2, w - 3, h - 3], radius=rad, outline=GOLD_SHADOW, width=4)
    d.arc([6, 6, w - 7, h - 7], start=200, end=320, fill=(255, 250, 226, 210), width=4)
    # two recessed circles (minus/plus crops show these) at x=160,402 y=148 r~70
    for cx in (160, 402):
        cy = 148
        r = 66
        rec = rgrad((r * 2, r * 2), lerp(CARNELIAN, (0, 0, 0), 0.15), lerp(CARNELIAN, (0, 0, 0), 0.55), center=(0.45, 0.35))
        rm = Image.new("L", rec.size, 0)
        ImageDraw.Draw(rm).ellipse([0, 0, rec.size[0] - 1, rec.size[1] - 1], fill=255)
        img.paste(rec, (cx - r, cy - r), rm)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD_DEEP, width=5)
        d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], outline=(255, 240, 210, 120), width=3)
    img.save(f"{OUT}/common/cabinet_control_bet_v01.png")
    print("bet ok")


def control_auto() -> None:
    """Scarab idol on a plinth (auto control) — 389x490."""
    w, h = 389, 490
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # plinth
    d.rounded_rectangle([w * 0.16, h * 0.78, w * 0.84, h * 0.94], radius=14, fill=GOLD_MID, outline=GOLD_DEEP, width=4)
    d.rounded_rectangle([w * 0.22, h * 0.70, w * 0.78, h * 0.80], radius=10, fill=GOLD, outline=GOLD_DEEP, width=3)
    # dark disc
    disc = rgrad((int(w * 0.72), int(w * 0.72)), lerp(NIGHT, (60, 40, 100), 0.3), NIGHT_DEEP)
    dm = Image.new("L", disc.size, 0)
    ImageDraw.Draw(dm).ellipse([0, 0, disc.size[0] - 1, disc.size[1] - 1], fill=255)
    img.paste(disc, (int(w * 0.14), int(h * 0.10)), dm)
    d.ellipse([w * 0.14, h * 0.10, w * 0.86, h * 0.10 + w * 0.72], outline=GOLD_DEEP, width=6)
    d.ellipse([w * 0.17, h * 0.13, w * 0.83, h * 0.13 + w * 0.66], outline=GOLD_MID, width=3)
    # real studio scarab in the disc
    scarab = fit_content(real("symbols/high/high_scarab_no_frame.png"), int(w * 0.52))
    img.alpha_composite(scarab, (int(w / 2 - scarab.width / 2), int(h * 0.16)))
    img = glow(img, 10, (255, 220, 140, 60))
    img.save(f"{OUT}/common/cabinet_control_auto_v01.png")
    print("auto ok")


def control_secondary() -> None:
    w, h = 555, 302
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rad = int(h * 0.42)
    ring = vgrad((w, h), [(0.0, GOLD_HI), (0.4, GOLD), (0.8, GOLD_MID), (1.0, GOLD_DEEP)])
    m = rounded_mask((w, h), rad)
    img.paste(ring, (0, 0), m)
    d.rounded_rectangle([2, 2, w - 3, h - 3], radius=rad, outline=GOLD_SHADOW, width=4)
    d.arc([6, 6, w - 7, h - 7], start=200, end=320, fill=(255, 250, 226, 210), width=4)
    # inner pill recess
    iw, ih = int(w * 0.66), int(h * 0.46)
    rec = vgrad((iw, ih), [(0.0, lerp(CARNELIAN, (0, 0, 0), 0.2)), (1.0, lerp(CARNELIAN, (0, 0, 0), 0.55))])
    rm = rounded_mask(rec.size, int(ih * 0.45))
    img.paste(rec, ((w - iw) // 2, (h - ih) // 2), rm)
    d.rounded_rectangle([(w - iw) // 2, (h - ih) // 2, (w + iw) // 2, (h + ih) // 2],
                        radius=int(ih * 0.45), outline=GOLD_DEEP, width=4)
    for cx in (w * 0.09, w * 0.91):
        jewel(d, int(cx), h // 2, int(h * 0.08), LAPIS)
    img.save(f"{OUT}/common/cabinet_control_secondary_v01.png")
    print("secondary ok")


def bezel_frames() -> None:
    base = None
    w, h = 768, 482
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bw = int(h * 0.13)
    rad = int(h * 0.16)
    ring = vgrad((w, h), [(0.0, GOLD_HI), (0.42, GOLD), (0.8, GOLD_MID), (1.0, GOLD_DEEP)])
    m = rounded_mask((w, h), rad)
    img.paste(ring, (0, 0), m)
    inner = rounded_mask((w - bw * 2, h - bw * 2), max(6, rad - bw))
    cut = Image.new("L", (w, h), 0)
    cut.paste(inner, (bw, bw))
    img.putalpha(Image.composite(Image.new("L", (w, h), 0), img.getchannel("A"), cut))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([bw - 2, bw - 2, w - bw + 2, h - bw + 2], radius=max(6, rad - bw), outline=GOLD_DEEP + (230,), width=3)
    # lamp bulbs along border
    step = 46
    for x in range(int(rad * 0.9), w - int(rad * 0.9), step):
        for y in (bw // 2, h - bw // 2):
            glow_b = Image.new("RGBA", (26, 26), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow_b)
            gd.ellipse([3, 3, 23, 23], fill=(255, 232, 170, 200))
            img.alpha_composite(glow_b, (x - 13, y - 13))
            jewel(d, x, y, 7, (255, 238, 190))
    for y in range(int(rad * 0.9) + 20, h - int(rad * 0.9) - 20, step):
        for x in (bw // 2, w - bw // 2):
            glow_b = Image.new("RGBA", (26, 26), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow_b)
            gd.ellipse([3, 3, 23, 23], fill=(255, 232, 170, 200))
            img.alpha_composite(glow_b, (x - 13, y - 13))
            jewel(d, x, y, 7, (255, 238, 190))
    # corner cartouche caps
    for cx, cy in ((w * 0.10, h * 0.10), (w * 0.90, h * 0.10), (w * 0.10, h * 0.90), (w * 0.90, h * 0.90)):
        jewel(d, int(cx), int(cy), 12, LAPIS)
    img.save(f"{OUT}/common/casino_bezel_large_frame_v02.png")
    img.resize((384, 241), Image.LANCZOS).save(f"{OUT}/common/casino_bezel_large_frame_v02_medium.png")
    img.resize((192, 121), Image.LANCZOS).save(f"{OUT}/common/casino_bezel_large_frame_v02_compact.png")
    print("bezel ok")


def coin_wealth_frame() -> None:
    w, h = 768, 473
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bw = int(h * 0.085)
    rad = int(h * 0.10)
    ring = vgrad((w, h), [(0.0, GOLD), (0.5, GOLD_MID), (1.0, GOLD_DEEP)])
    m = rounded_mask((w, h), rad)
    img.paste(ring, (0, 0), m)
    inner = rounded_mask((w - bw * 2, h - bw * 2), max(4, rad - bw))
    cut = Image.new("L", (w, h), 0)
    cut.paste(inner, (bw, bw))
    img.putalpha(Image.composite(Image.new("L", (w, h), 0), img.getchannel("A"), cut))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([bw - 2, bw - 2, w - bw + 2, h - bw + 2], radius=max(4, rad - bw), outline=GOLD_DEEP + (220,), width=2)
    for cx, cy in ((14, 14), (w - 14, 14), (14, h - 14), (w - 14, h - 14)):
        jewel(d, cx, cy, 11, LAPIS)
    img.save(f"{OUT}/common/coin_wealth_large_frame_v01.png")
    print("coin frame ok")


def currency_coin() -> None:
    """Currency icon: the real Solar Disc art (gold coin look)."""
    coin = pack_cell(PEARL["sun"], fill=0.98).resize((1254, 1254), Image.LANCZOS)
    img = glow(coin, 26, (255, 226, 150, 80))
    sparkle(img, 380, 320, 70)
    sparkle(img, 900, 900, 55)
    img.save(f"{OUT}/common/currency_coin_icon_v01.png")
    print("currency ok")


# ------------------------------------------------------------- characters ---
def hero_anubis(size: int) -> Image.Image:
    anubis = Image.open(f"{KEMET_PNG}/characters/anubis.png").convert("RGBA")
    bbox = alpha_bounds(anubis)
    anubis = anubis.crop((bbox[0], bbox[1], bbox[2], int(bbox[1] + (bbox[3] - bbox[1]) * 0.62)))
    return fit_content(anubis, size)


def hero_scarab_idol(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # pedestal
    d.rounded_rectangle([size * 0.2, size * 0.8, size * 0.8, size * 0.94], radius=int(size * 0.03), fill=GOLD_MID, outline=GOLD_DEEP, width=4)
    d.rounded_rectangle([size * 0.26, size * 0.72, size * 0.74, size * 0.82], radius=int(size * 0.02), fill=GOLD, outline=GOLD_DEEP, width=3)
    scarab = fit_content(Image.open(f"{KEMET_PNG}/symbols/high/high_scarab_no_frame.png").convert("RGBA"), int(size * 0.56))
    img.alpha_composite(scarab, (int(size * 0.22), int(size * 0.14)))
    img = glow(img, int(size * 0.03), (255, 224, 150, 70))
    return img


def hero_anubis_flip(size: int) -> Image.Image:
    an = hero_anubis(size).transpose(Image.FLIP_LEFT_RIGHT)
    return an


def hero_anubis_bust(size: int) -> Image.Image:
    an = Image.open(f"{KEMET_PNG}/characters/anubis.png").convert("RGBA")
    bbox = alpha_bounds(an)
    an = an.crop((bbox[0], bbox[1], bbox[2], int(bbox[1] + (bbox[3] - bbox[1]) * 0.34)))
    return fit_content(an, size)


def hero_eye_idol(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([size * 0.2, size * 0.8, size * 0.8, size * 0.94], radius=int(size * 0.03), fill=GOLD_MID, outline=GOLD_DEEP, width=4)
    d.rounded_rectangle([size * 0.26, size * 0.72, size * 0.74, size * 0.82], radius=int(size * 0.02), fill=GOLD, outline=GOLD_DEEP, width=3)
    eye = fit_content(real("symbols/high/high_eye_no_frame.png"), int(size * 0.58))
    img.alpha_composite(eye, (int(size * 0.21), int(size * 0.16)))
    return glow(img, int(size * 0.03), (255, 224, 150, 70))


def character_atlas(game_index: int) -> None:
    """2x2 atlas; quadrant(slot) = that game's hero. Bottom-left = slot 0.

    All quadrants are real studio art: Anubis (full / flipped / bust) and the
    jeweled scarab idol built from the pack's scarab.
    """
    heroes = [hero_anubis(700), hero_anubis_flip(700), hero_scarab_idol(700), hero_anubis_bust(700)]
    order = [heroes[(i - game_index) % 4] for i in range(4)]
    atlas = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    atlas.alpha_composite(order[0], (0, 768))
    atlas.alpha_composite(order[1], (512, 768))
    atlas.alpha_composite(order[2], (0, 0))
    atlas.alpha_composite(order[3], (512, 0))
    atlas.save(f"{OUT}/common/character_astral_v01.png".replace("astral", ["astral", "golden", "neon", "cosmic"][game_index]))
    print("character", game_index, "ok")


def mascot_atlas() -> None:
    size = 627
    cells = [hero_anubis(size), fit_content(PEARL["sun"], size), hero_scarab_idol(size), hero_eye_idol(size)]
    atlas = Image.new("RGBA", (1254, 1254), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        atlas.alpha_composite(c, ((i % 2) * size, (i // 2) * size))
    atlas.save(f"{OUT}/common/fortune_mascot_atlas_v01.png")
    print("mascots ok")


# ---------------------------------------------------------------- wheels ----
def wheel_disc() -> None:
    s = 1254
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = s / 2
    r = s * 0.46
    seg_colors = [GOLD, LAPIS, TURQUOISE, CARNELIAN, SAND, LAPIS_LIGHT, FAIENCE, GOLD_MID]
    for i, col in enumerate(seg_colors):
        a0 = i * 45 - 90 + 1
        a1 = (i + 1) * 45 - 90 - 1
        d.pieslice([cx - r * 0.86, cy - r * 0.86, cx + r * 0.86, cy + r * 0.86], start=a0, end=a1, fill=lerp(col, (0, 0, 0), 0.22))
    for i, col in enumerate(seg_colors):
        a0 = i * 45 - 90 + 2
        a1 = (i + 1) * 45 - 90 - 2
        d.pieslice([cx - r * 0.80, cy - r * 0.80, cx + r * 0.80, cy + r * 0.80], start=a0, end=a1, fill=col)
    # hub
    hub = rgrad((int(r * 0.5), int(r * 0.5)), GOLD_HI, GOLD_DEEP)
    hm = Image.new("L", hub.size, 0)
    ImageDraw.Draw(hm).ellipse([0, 0, hub.size[0] - 1, hub.size[1] - 1], fill=255)
    img.paste(hub, (int(cx - r * 0.25), int(cy - r * 0.25)), hm)
    d.ellipse([cx - r * 0.25, cy - r * 0.25, cx + r * 0.25, cy + r * 0.25], outline=GOLD_DEEP, width=4)
    jewel(d, int(cx), int(cy), int(r * 0.085), CARNELIAN)
    # gold rim with studs
    ring = rgrad((s, s), GOLD, GOLD_DEEP, center=(0.46, 0.4))
    rm = Image.new("L", (s, s), 0)
    rd_ = ImageDraw.Draw(rm)
    rd_.ellipse([cx - r, cy - r, cx + r, cx * 0 + cy + r], fill=255)
    rd_.ellipse([cx - r * 0.87, cy - r * 0.87, cx + r * 0.87, cy + r * 0.87], fill=0)
    img.paste(ring, (0, 0), rm)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD_SHADOW, width=5)
    for i in range(16):
        a = math.radians(i * 22.5)
        jewel(d, int(cx + math.cos(a) * r * 0.935), int(cy + math.sin(a) * r * 0.935), int(r * 0.035), (255, 240, 190))
    img = glow(img, 14, (255, 224, 150, 60))
    img.save(f"{OUT}/common/lucky_pearl_wheel_disc_v02.png")
    print("wheel disc ok")


def wheel_page() -> None:
    bg = _background((1024, 1536), blur=10, darken=0.55).convert("RGBA")
    d = ImageDraw.Draw(bg)
    # light shaft
    shaft = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shaft)
    sd.polygon([(380, 0), (644, 0), (760, 900), (264, 900)], fill=(255, 232, 170, 60))
    shaft = shaft.filter(ImageFilter.GaussianBlur(40))
    bg.alpha_composite(shaft)
    disc = Image.open(f"{OUT}/common/lucky_pearl_wheel_disc_v02.png").resize((820, 820), Image.LANCZOS)
    bg.alpha_composite(disc, (102, 400))
    # pointer
    d = ImageDraw.Draw(bg)
    d.polygon([(512, 380), (478, 440), (546, 440)], fill=GOLD_DEEP)
    d.polygon([(512, 392), (488, 436), (536, 436)], fill=GOLD_HI)
    # pedestal glow
    glow_l = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_l)
    gd.ellipse([180, 1150, 844, 1330], fill=(255, 214, 130, 90))
    glow_l = glow_l.filter(ImageFilter.GaussianBlur(60))
    bg.alpha_composite(glow_l)
    d.rounded_rectangle([240, 1240, 784, 1330], radius=22, fill=lerp(GOLD_MID, (0, 0, 0), 0.25), outline=GOLD_DEEP, width=4)
    bg.convert("RGB").save(f"{OUT}/common/lucky_pearl_wheel_v01.png")
    print("wheel page ok")


# ----------------------------------------------------------- jackpot art ----
def jackpot_stage(path: str, wide: bool) -> None:
    w, h = 1536, 1024
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # real light-fx layer from the studio big-win set
    psd_dir = "psd_out"
    try:
        fx = Image.open(f"{psd_dir}/bigwin_fx.png").convert("RGBA")
        fx = fx.resize((int(w * 0.72), int(fx.height * w * 0.72 / fx.width)), Image.LANCZOS)
        img.alpha_composite(fx, (w // 2 - fx.width // 2, -60))
    except Exception:
        pass
    sun = winged_sun((int(w * 0.62), int(h * 0.5)))
    img.alpha_composite(sun, (w // 2 - sun.width // 2, 10))
    # real lotus ornaments flanking the banner
    try:
        lotus = Image.open(f"{psd_dir}/bigwin_decor.png").convert("RGBA")
        lotus = lotus.resize((300, int(lotus.height * 300 / lotus.width)), Image.LANCZOS)
        img.alpha_composite(lotus, (int(w * 0.055), int(h * 0.60)))
        img.alpha_composite(lotus.transpose(Image.FLIP_LEFT_RIGHT), (int(w * 0.72), int(h * 0.60)))
    except Exception:
        pass
    d = ImageDraw.Draw(img)
    # banner frame below the disk — translucent panel with gold border
    bx0, by0, bx1, by1 = int(w * 0.18), int(h * 0.42), int(w * 0.82), int(h * 0.80)
    panel = vgrad((bx1 - bx0, by1 - by0), [(0.0, (22, 16, 44, 216)), (1.0, (10, 8, 24, 226))])
    pm = rounded_mask(panel.size, 36)
    img.paste(panel, (bx0, by0), pm)
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=36, outline=GOLD_SHADOW, width=6)
    d.rounded_rectangle([bx0 + 8, by0 + 8, bx1 - 8, by1 - 8], radius=30, outline=GOLD_MID, width=3)
    for cx, cy in ((bx0 + 18, by0 + 18), (bx1 - 18, by0 + 18), (bx0 + 18, by1 - 18), (bx1 - 18, by1 - 18)):
        jewel(d, cx, cy, 12, LAPIS)
    # pearl dangle
    d.line([w // 2, by1, w // 2, by1 + 34], fill=GOLD_MID, width=5)
    pearl = rgrad((64, 64), WHITE, (198, 178, 150))
    pml = Image.new("L", pearl.size, 0)
    ImageDraw.Draw(pml).ellipse([0, 0, 63, 63], fill=255)
    img.paste(pearl, (w // 2 - 32, by1 + 34), pml)
    d.ellipse([w // 2 - 32, by1 + 34, w // 2 + 32, by1 + 98], outline=GOLD_DEEP, width=3)
    img.save(f"{OUT}/common/{path}")
    print(path, "ok")


# ------------------------------------------------------------- screens ------
def screen_common_bg() -> None:
    bg = _background((1024, 1536), blur=7, darken=0.62).convert("RGBA")
    d = ImageDraw.Draw(bg)
    # faint hieroglyph wall texture
    glyphs = hieroglyph_strip((1024, 1536), GOLD, seed=99, cell=120, alpha=26)
    bg.alpha_composite(glyphs)
    vig = Image.new("L", (1024, 1536), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-180, -180, 1024 + 180, 1536 + 180], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(150))
    dark = Image.new("RGBA", (1024, 1536), (5, 4, 12, 150))
    bg = Image.composite(bg, Image.alpha_composite(dark, bg), vig)
    bg.convert("RGB").save(f"{OUT}/common/common_bg_v01.png")
    print("common bg ok")


def screen_start() -> None:
    bg = _background((1024, 1536), blur=4, darken=0.30).convert("RGBA")
    shaft = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shaft)
    sd.polygon([(330, 0), (694, 0), (820, 1536), (204, 1536)], fill=(255, 236, 180, 70))
    shaft = shaft.filter(ImageFilter.GaussianBlur(60))
    bg.alpha_composite(shaft)
    # floor reflection strip
    d = ImageDraw.Draw(bg)
    floor_glow = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    fd = ImageDraw.Draw(floor_glow)
    fd.ellipse([140, 1240, 884, 1440], fill=(255, 220, 140, 80))
    bg.alpha_composite(floor_glow.filter(ImageFilter.GaussianBlur(50)))
    bg.convert("RGB").save(f"{OUT}/common/start_bg_v01.png")
    print("start bg ok")


def screen_login() -> None:
    bg = _background((1024, 1536), blur=8, darken=0.55).convert("RGBA")
    d = ImageDraw.Draw(bg)
    # gold ring halo behind the guardian
    halo = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([212, 240, 812, 840], fill=(255, 222, 140, 70))
    bg.alpha_composite(halo.filter(ImageFilter.GaussianBlur(70)))
    d.ellipse([262, 290, 762, 790], outline=GOLD_MID + (220,), width=8)
    d.ellipse([282, 310, 742, 770], outline=(255, 240, 200, 90), width=3)
    an = hero_anubis(560)
    bg.alpha_composite(an, (232, 260))
    # floor dais
    glow_l = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_l)
    gd.ellipse([220, 900, 804, 1060], fill=(255, 214, 130, 90))
    bg.alpha_composite(glow_l.filter(ImageFilter.GaussianBlur(60)))
    d.rounded_rectangle([300, 960, 724, 1042], radius=20, fill=lerp(GOLD_MID, (0, 0, 0), 0.3), outline=GOLD_DEEP, width=4)
    # torch sconces
    for x in (120, 904):
        glow_t = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
        td = ImageDraw.Draw(glow_t)
        td.ellipse([50, 50, 150, 150], fill=(255, 200, 110, 170))
        bg.alpha_composite(glow_t.filter(ImageFilter.GaussianBlur(18)), (x - 100, 300))
        d.rounded_rectangle([x - 10, 340, x + 10, 520], radius=8, fill=GOLD_DEEP)
    vig = Image.new("L", (1024, 1536), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-160, -160, 1024 + 160, 1536 + 160], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(140))
    dark = Image.new("RGBA", (1024, 1536), (4, 3, 10, 120))
    bg = Image.composite(bg, Image.alpha_composite(dark, bg), vig)
    bg.convert("RGB").save(f"{OUT}/login/login_bg_v01.png")
    print("login ok")


def screen_home() -> None:
    bg = _background((1024, 1536), blur=3, darken=0.34).convert("RGBA")
    d = ImageDraw.Draw(bg)
    floor_glow = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
    fd = ImageDraw.Draw(floor_glow)
    fd.ellipse([100, 1150, 924, 1420], fill=(255, 218, 140, 90))
    bg.alpha_composite(floor_glow.filter(ImageFilter.GaussianBlur(56)))
    # hanging bunting of jewels at top
    for i, x in enumerate(range(80, 1024, 120)):
        col = [LAPIS, TURQUOISE, CARNELIAN, GOLD][i % 4]
        jewel(d, x, 60 + (20 if i % 2 else 0), 12, col)
    bg.convert("RGB").save(f"{OUT}/home/home_bg_v01.png")
    print("home bg ok")


def screen_embedded() -> None:
    """Mini slot screen: 5x2 grid of atlas symbols inside a gold pylon border."""
    import random
    w, h = 1536, 544
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # inner dark screen
    bx0, by0, bx1, by1 = 26, 26, w - 26, h - 26
    scr = vgrad((bx1 - bx0, by1 - by0), [(0.0, (26, 20, 52)), (1.0, (10, 8, 24))])
    sm = rounded_mask(scr.size, 34)
    img.paste(scr, (bx0, by0), sm)
    atlas = Image.open(f"{OUT}/game01/symbol_atlas_cutout_v02.png").convert("RGBA")
    rng = random.Random(5)
    cols, rows = 5, 2
    cw = (bx1 - bx0 - 8) / cols
    chh = (by1 - by0 - 8) / rows
    for c in range(cols):
        for r in range(rows):
            idx = rng.randrange(12)
            cell = atlas.crop(((idx % 3) * 362, (idx // 3) * 362, (idx % 3) * 362 + 362, (idx // 3) * 362 + 362))
            cell = cell.resize((int(cw) - 10, int(chh) - 10), Image.LANCZOS)
            img.alpha_composite(cell, (int(bx0 + 4 + c * cw + 5), int(by0 + 4 + r * chh + 5)))
    # gold pylon border
    ring = vgrad((w, h), [(0.0, GOLD_HI), (0.42, GOLD), (0.8, GOLD_MID), (1.0, GOLD_DEEP)])
    rm = rounded_mask((w, h), 40)
    img.paste(ring, (0, 0), Image.composite(rm, Image.new("L", (w, h), 0), Image.eval(rm, lambda p: 0)))
    border = Image.new("L", (w, h), 0)
    bd = ImageDraw.Draw(border)
    bd.rounded_rectangle([0, 0, w - 1, h - 1], radius=40, fill=255)
    bd.rounded_rectangle([26, 26, w - 27, h - 27], radius=34, fill=0)
    img.paste(ring, (0, 0), border)
    d.rounded_rectangle([26, 26, w - 27, h - 27], radius=34, outline=GOLD_DEEP + (230,), width=3)
    # corner pylons + center jewel
    for cx in (26, w - 26):
        d.polygon([(cx - (18 if cx < 100 else -18), 26), (cx, 92), (cx + (18 if cx < 100 else -18), 26)], fill=GOLD_DEEP)
    jewel(d, w // 2, 20, 12, LAPIS)
    img = glow(img, 14, (255, 214, 130, 60))
    img.save(f"{OUT}/home/home_embedded_slot_screen_v01.png")
    print("embedded ok")


def screen_wealth_cabinet() -> None:
    """Home hero: mini cabinet with live-looking reels inside the aperture."""
    cab = build_cabinet("game01", seed=17).convert("RGBA")
    # fill aperture with symbol cells from the atlas
    atlas = Image.open(f"{OUT}/game01/symbol_atlas_cutout_v02.png").convert("RGBA")
    ax0, ay0, ax1, ay1 = 208, 525, 828, 886
    cols, rows = 5, 3
    cw, chh = (ax1 - ax0) / cols, (ay1 - ay0) / rows
    d = ImageDraw.Draw(cab)
    panel = [(16, 12, 34, 255)]
    d.rounded_rectangle([ax0, ay0, ax1, ay1], radius=24, fill=(14, 11, 28, 255))
    import random
    rng = random.Random(11)
    for c in range(cols):
        for r in range(rows):
            idx = rng.randrange(12)
            cell = atlas.crop(((idx % 3) * 362, (idx // 3) * 362, (idx % 3) * 362 + 362, (idx // 3) * 362 + 362)).resize((int(cw) - 8, int(chh) - 8), Image.LANCZOS)
            cab.alpha_composite(cell, (int(ax0 + c * cw + 4), int(ay0 + r * chh + 4)))
    # winning row glow
    glow_l = Image.new("RGBA", cab.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_l)
    gd.rectangle([ax0, ay0 + chh, ax1, ay0 + 2 * chh], fill=(255, 214, 120, 60))
    cab.alpha_composite(glow_l.filter(ImageFilter.GaussianBlur(24)))
    cab.convert("RGB").save(f"{OUT}/common/wealth_cabinet_v01.png")
    print("wealth cabinet ok")


def loading_screens() -> None:
    accents = {"loading_fortune_stage_v01": GOLD, "loading_coin_garden_v01": TURQUOISE,
               "loading_gem_classic_v01": CARNELIAN, "loading_diamond_vault_v01": AMETHYST}
    for name, accent in accents.items():
        bg = _background((1024, 1536), blur=10, darken=0.58).convert("RGBA")
        d = ImageDraw.Draw(bg)
        shaft = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shaft)
        sd.polygon([(360, 0), (664, 0), (780, 1000), (244, 1000)], fill=lerp(accent, WHITE, 0.4) + (60,))
        shaft = shaft.filter(ImageFilter.GaussianBlur(50))
        bg.alpha_composite(shaft)
        # medallion ring (progress art overlays center)
        med = Image.new("RGBA", (520, 520), (0, 0, 0, 0))
        md = ImageDraw.Draw(med)
        md.ellipse([10, 10, 510, 510], outline=GOLD_MID + (235,), width=14)
        md.ellipse([34, 34, 486, 486], outline=lerp(GOLD_DEEP, (0, 0, 0), 0.2) + (200,), width=6)
        for i in range(12):
            a = math.radians(i * 30)
            jewel(md, int(260 + math.cos(a) * 216), int(260 + math.sin(a) * 216), 9, accent)
        med = med.filter(ImageFilter.GaussianBlur(0.5))
        bg.alpha_composite(med, (252, 330))
        # pedestal
        glow_l = Image.new("RGBA", (1024, 1536), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow_l)
        gd.ellipse([210, 1160, 814, 1330], fill=accent + (80,))
        bg.alpha_composite(glow_l.filter(ImageFilter.GaussianBlur(60)))
        d.rounded_rectangle([272, 1230, 752, 1320], radius=20, fill=lerp(GOLD_MID, (0, 0, 0), 0.3), outline=GOLD_DEEP, width=4)
        bg.convert("RGB").save(f"{OUT}/common/{name}.png")
        print(name, "ok")


# ---------------------------------------------------------------- titles ----
def game_title(game: str) -> None:
    text, accent, shadow_c = TITLES[game]
    t = gold_text(text, 190, tracking=10)
    # accent tint pass
    tint = Image.new("RGBA", t.size, accent + (255,))
    tinted = Image.composite(tint, t, t.getchannel("A").point(lambda p: 40 if p > 200 else 0))
    out = Image.new("RGBA", (t.width + 120, t.height + 130), (0, 0, 0, 0))
    # underline cartouche bar
    d = ImageDraw.Draw(out)
    out.alpha_composite(t, (60, 20))
    out.alpha_composite(tinted, (60, 20))
    d.rounded_rectangle([60, out.height - 62, out.width - 60, out.height - 46], radius=8, fill=GOLD_MID + (230,), outline=GOLD_DEEP + (255,), width=2)
    sparkle(out, 90, 50, 26)
    sparkle(out, out.width - 90, 50, 26)
    out = drop_shadow(out, 0, 10, 18, 150)
    out.save(f"{OUT}/{game}/title_v02.png")
    print(game, "title ok")


def main_title() -> None:
    logo = Image.open(f"{KEMET_PNG}/logo/logo_long.png").convert("RGBA")
    scale = 1890 / logo.width
    logo = logo.resize((1890, int(logo.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (1890, 369), (0, 0, 0, 0))
    canvas.alpha_composite(logo, (0, (369 - logo.height) // 2))
    canvas = glow(canvas, 16, (255, 220, 140, 60))
    canvas.save(f"{OUT}/common/pearl_fortune_title_v01.png")
    print("main title ok")


if __name__ == "__main__":
    button_frame("button_frame_astral_v01.png", (556, 254), LAPIS_LIGHT, 3)
    button_frame("button_frame_golden_v01.png", (560, 248), GOLD, 7)
    button_frame("button_frame_neon_v01.png", (550, 279), TURQUOISE, 11)
    button_frame("button_frame_cosmic_v01.png", (562, 284), AMETHYST, 13)
    control_spin()
    control_bet()
    control_auto()
    control_secondary()
    bezel_frames()
    coin_wealth_frame()
    currency_coin()
    for i in range(4):
        character_atlas(i)
    mascot_atlas()
    wheel_disc()
    wheel_page()
    jackpot_stage("jackpot_pearl_stage_v03.png", False)
    jackpot_stage("jackpot_royal_stage_wide_v02.png", True)
    screen_common_bg()
    screen_start()
    screen_login()
    screen_home()
    screen_embedded()
    screen_wealth_cabinet()
    loading_screens()
    main_title()
    for g in TITLES:
        game_title(g)
    print("ALL UI DONE")
