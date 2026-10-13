"""Compose opaque, game-specific iOS icons from the H5 artwork already shipped.

Run from any directory: python3 compose_app_icons.py
Requires Pillow with WebP support. Previous icons are archived as
ios-wrapper/LegacyAppIcon-1024.png outside the active AppIcon.appiconset.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parent
SIZE = 1024
GAMES = {
    "F13": ("aurelia-wordmark.webp", "aurelia-loader-bg.webp", (25, 46, 34)),
    "F14": ("cloud-crown.webp", "cloud-port.webp", (20, 42, 65)),
    "F15": ("cloud-crown.webp", "cloud-port.webp", (91, 42, 65)),
    "F17": ("caravan-brand.webp", "caravan-arrival.webp", (78, 35, 41)),
    "F18": ("express-brand.webp", "express-arrival.webp", (31, 42, 68)),
    "F19": ("treasury-brand.webp", "treasury-arrival.webp", (25, 55, 55)),
    "F20": ("canopy-brand.webp", "canopy-arrival.webp", (24, 54, 40)),
    "F21": ("canopy-brand.webp", "canopy-arrival.webp", (60, 35, 57)),
}


def compose(game_id: str, logo_name: str, background_name: str, color: tuple[int, int, int]) -> Path:
    matches = list(ROOT.glob(f"{game_id}_*_OC_StoreKit2_Xcode/{game_id}_H5"))
    if len(matches) != 1:
        raise ValueError(f"Expected one {game_id} Xcode H5 project, found {len(matches)}")
    bundle = matches[0]
    iconset = bundle / "ios-wrapper/App/Assets.xcassets/AppIcon.appiconset"
    background = Image.open(bundle / background_name).convert("RGB")
    background = ImageOps.fit(background, (SIZE, SIZE), Image.Resampling.LANCZOS, centering=(0.5, 0.40))
    background = background.filter(ImageFilter.GaussianBlur(22))
    base = Image.blend(background, Image.new("RGB", (SIZE, SIZE), color), 0.67)

    # Illuminate the wordmark without drawing a separate rounded-square mask:
    # iOS applies its own icon corner radius at display time.
    light = Image.new("L", (SIZE, SIZE))
    ImageDraw.Draw(light).ellipse((70, 130, 954, 950), fill=116)
    light = light.filter(ImageFilter.GaussianBlur(115))
    warm = Image.new("RGB", (SIZE, SIZE), tuple(min(255, c + 26) for c in color))
    base = Image.composite(warm, base, light).convert("RGBA")

    with Image.open(bundle / logo_name) as source:
        logo = source.convert("RGBA")
    bounds = logo.getchannel("A").point(lambda alpha: 255 if alpha > 8 else 0).getbbox()
    if bounds is None:
        raise ValueError(f"Logo has no visible pixels: {bundle / logo_name}")
    logo = logo.crop(bounds)
    logo.thumbnail((900, 770), Image.Resampling.LANCZOS)
    x, y = (SIZE - logo.width) // 2, (SIZE - logo.height) // 2

    shadow = Image.new("RGBA", (SIZE, SIZE))
    shadow.paste(logo.getchannel("A"), (x + 7, y + 17))
    shadow.putalpha(shadow.getchannel("A").filter(ImageFilter.GaussianBlur(28)).point(lambda a: int(a * 0.70)))
    base.alpha_composite(Image.composite(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 220)), Image.new("RGBA", (SIZE, SIZE)), shadow.getchannel("A")))
    base.alpha_composite(logo, (x, y))

    output = iconset / f"AppIcon-{game_id}-1024.png"
    # RGB deliberately omits any alpha channel: required for App Store icons.
    base.convert("RGB").save(output, format="PNG", optimize=True)
    return output


if __name__ == "__main__":
    for game, (logo, background, tint) in GAMES.items():
        print(compose(game, logo, background, tint))
