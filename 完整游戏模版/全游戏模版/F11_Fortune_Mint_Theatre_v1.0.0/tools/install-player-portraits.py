"""Install reviewed 3x3 portrait sheet into the existing account avatar slots."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
sheet = Image.open(root / 'output/imagegen/player-portraits.png')
names = ['elodie', 'kai', 'nia', 'mateo', 'meilin', 'marina', 'astral', 'cosmic', 'sage']
target = root / 'assets/resources/generated/common/avatars'
target.mkdir(exist_ok=True)
for index, name in enumerate(names):
    col, row = index % 3, index // 3
    box = (round(col*sheet.width/3), round(row*sheet.height/3), round((col+1)*sheet.width/3), round((row+1)*sheet.height/3))
    sheet.crop(box).resize((384, 384), Image.Resampling.LANCZOS).save(target / f'player_{name}.png')
print('Installed 9 reviewed portraits')
