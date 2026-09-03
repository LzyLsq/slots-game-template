from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "assets/resources/theme/sovereign-treasury"
SOURCE = THEME / "cabinet-v1.png"
BACKGROUND = THEME / "treasury-hall-bg-v1.png"
CUTOUT = THEME / "cabinet-cutout-v3.png"


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(1, height - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
        draw.line((0, y, width, y), fill=color)
    return image


source = Image.open(SOURCE).convert("RGBA")
canvas_size = (1024, 2216)

# Build a coherent private-casino hall from the machine's own marble, ruby and
# emerald palette. The blurred source supplies matching reflections without
# repeating recognizable cabinet controls behind the foreground machine.
ambient = source.convert("RGB").resize((1478, 2216), Image.Resampling.LANCZOS)
ambient = ambient.crop(((ambient.width - canvas_size[0]) // 2, 0, (ambient.width + canvas_size[0]) // 2, 2216))
ambient = ambient.filter(ImageFilter.GaussianBlur(86))
ambient = ImageEnhance.Color(ambient).enhance(0.58)
ambient = ImageEnhance.Brightness(ambient).enhance(0.48)

hall = vertical_gradient(canvas_size, (46, 12, 23), (18, 39, 32)).convert("RGBA")
hall = Image.blend(hall, ambient.convert("RGBA"), 0.46)

# Reuse subdued architectural fragments from the authored cabinet as distant
# room trim. They retain real marble and metal detail, but reduced contrast and
# opacity keep them clearly behind the interactive foreground.
room_detail = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
cornice = source.crop((0, 0, 1024, 82)).resize((1024, 150), Image.Resampling.LANCZOS)
cornice = ImageEnhance.Brightness(cornice).enhance(0.38)
cornice.putalpha(cornice.getchannel("A").point(lambda value: round(value * 0.55)))
room_detail.alpha_composite(cornice, (0, 0))
left_column = source.crop((68, 55, 172, 430)).resize((132, 1350), Image.Resampling.LANCZOS)
left_column = ImageEnhance.Brightness(ImageEnhance.Color(left_column).enhance(0.68)).enhance(0.5)
left_column.putalpha(left_column.getchannel("A").point(lambda value: round(value * 0.64)))
right_column = left_column.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
room_detail.alpha_composite(left_column, (34, 110))
room_detail.alpha_composite(right_column, (858, 110))
hall = Image.alpha_composite(hall, room_detail)

architecture = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
draw = ImageDraw.Draw(architecture)

# Deep ruby wall panels and champagne-gold ribs establish a real room behind
# the machine while keeping the center quieter than the gameplay surface.
draw.rounded_rectangle((58, 90, 966, 1502), radius=86, fill=(72, 18, 33, 120), outline=(224, 170, 64, 120), width=7)
draw.rounded_rectangle((126, 150, 898, 1450), radius=68, fill=(18, 57, 44, 72), outline=(248, 213, 113, 78), width=4)
for x in (70, 188, 836, 954):
    draw.rounded_rectangle((x - 15, 75, x + 15, 1600), radius=15, fill=(126, 73, 19, 128))
    draw.line((x, 90, x, 1600), fill=(255, 222, 133, 132), width=5)

# Warm wall sconces are deliberately soft so they read as environmental light,
# not as extra game buttons.
glow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
for x in (112, 912):
    for y, radius in ((390, 72), (760, 54), (1120, 42)):
        glow_draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 202, 79, 88))
        glow_draw.ellipse((x - 12, y - 12, x + 12, y + 12), fill=(255, 245, 196, 210))
glow = glow.filter(ImageFilter.GaussianBlur(26))

# A marble floor with converging brass inlays gives the cabinet a physical
# standing plane instead of a flat poster-like bottom extension.
floor_top = 1480
draw.polygon(((0, floor_top), (1024, floor_top), (1024, 2216), (0, 2216)), fill=(56, 38, 31, 185))
marble = source.crop((170, 90, 854, 300)).resize((1024, 736), Image.Resampling.LANCZOS)
marble = ImageEnhance.Brightness(ImageEnhance.Color(marble).enhance(0.55)).enhance(0.34)
marble = marble.filter(ImageFilter.GaussianBlur(5))
marble.putalpha(marble.getchannel("A").point(lambda value: round(value * 0.62)))
architecture.alpha_composite(marble, (0, floor_top))
for y, alpha in ((1535, 100), (1650, 86), (1810, 72), (2020, 58)):
    draw.line((0, y, 1024, y), fill=(235, 193, 102, alpha), width=4)
for x in (-400, -120, 1400, 1120):
    draw.line((512, floor_top, x, 2216), fill=(235, 193, 102, 62), width=5)

# Central halo and a restrained floor reflection visually anchor the machine.
halo = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
halo_draw = ImageDraw.Draw(halo)
halo_draw.ellipse((120, 185, 904, 1660), fill=(255, 206, 101, 80))
halo_draw.ellipse((250, 1510, 774, 2030), fill=(240, 190, 88, 64))
halo = halo.filter(ImageFilter.GaussianBlur(115))

hall = Image.alpha_composite(hall, architecture)
hall = Image.alpha_composite(hall, glow)
hall = Image.alpha_composite(hall, halo)

# Subtle vignette keeps attention on the cabinet but never creates a black box.
vignette = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
vignette_draw = ImageDraw.Draw(vignette)
for inset in range(0, 180, 6):
    alpha = round(3.0 * (180 - inset) / 180)
    vignette_draw.rounded_rectangle((inset, inset, 1024 - inset, 2216 - inset), radius=150, outline=(22, 4, 12, alpha), width=8)
hall = Image.alpha_composite(hall, vignette)
hall.convert("RGB").save(BACKGROUND, format="PNG", optimize=True)

# Remove the poster-shaped corners from the original cabinet. The silhouette
# follows its arched crown, side vault wheels and lower pedestal, with a soft
# 12px edge that blends into the matching hall light.
mask = Image.new("L", source.size, 0)
mask_draw = ImageDraw.Draw(mask)
silhouette = [
    (512, 0), (770, 12), (898, 74), (970, 176), (1023, 322),
    (1023, 1050), (984, 1120), (1010, 1248), (998, 1380),
    (940, 1438), (910, 1535), (114, 1535), (84, 1438),
    (26, 1380), (14, 1248), (40, 1120), (0, 1050), (0, 322),
    (54, 176), (126, 74), (254, 12),
]
mask_draw.polygon(silhouette, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(12))
cabinet = source.copy()
cabinet.putalpha(mask)
cabinet.save(CUTOUT, format="PNG", optimize=True)

print(f"Created {BACKGROUND} ({hall.width}x{hall.height})")
print(f"Created {CUTOUT} ({cabinet.width}x{cabinet.height})")
