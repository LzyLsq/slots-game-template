"""Prepare the F40 commissions, preserving installed room/guardian corrections.

Existing registered scenes are authoritative. To repair atlases only, use
prepare_atlases.py directly; neither entry point restores obsolete silhouettes.
"""
from pathlib import Path
from PIL import Image, ImageOps
from prepare_atlases import prepare as prepare_atlases
import json

P = Path(__file__).resolve().parents[1]
R = P / 'art-source/raw'
A = P / 'assets/resources/art'
IDS = ['golden-phoenix', 'jade-dragon', 'pearl-qilin', 'amber-panda']
def load(name): return Image.open(R / (name + '.png')).convert('RGBA')
def save(name, image): image.save(A / (name + '.png'), optimize=True)
def tight(image):
    bounds = image.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    return image.crop(bounds) if bounds else image

# Initial import only. Installed room extensions and anatomical/eyelid fixes
# belong to later commission workflows and must survive an atlas preparation.
for mode in IDS:
    if not (A / (mode + '-room-center.png')).exists():
        room = load(mode + '-panorama').resize((2304, 1536), Image.Resampling.LANCZOS).convert('RGB')
        for suffix, bounds in [('center', (640, 0, 1664, 1536)), ('left', (0, 0, 640, 1536)), ('right', (1664, 0, 2304, 1536))]:
            save(mode + '-room-' + suffix, room.crop(bounds))
    if not (A / (mode + '-guardian-skin.png')).exists():
        fitted = ImageOps.contain(tight(load(mode + '-guardian')), (1472, 896), Image.Resampling.LANCZOS)
        full = Image.new('RGBA', (1472, 896)); full.alpha_composite(fitted, ((1472 - fitted.width) // 2, 896 - fitted.height))
        skin, base = full.copy(), full.copy()
        skin.paste((0, 0, 0, 0), (0, 704, 1472, 896)); base.paste((0, 0, 0, 0), (0, 0, 1472, 704))
        save(mode + '-guardian', full); save(mode + '-guardian-skin', skin); save(mode + '-guardian-base', base)
for index in range(4): save('canopy-title-' + str(index), tight(load('canopy-title-' + str(index))))
save('ledger-paper-room', load('ledger-frame-room').crop((160, 220, 864, 1316)))
save('salon-hall', load('salon')); save('canopy-hall-soft', load('salon'))
for alias, mode in zip(['mascot-coin', 'mascot-sapphire', 'mascot-pearl', 'mascot-ruby'], IDS):
    save(alias, tight(load('prize-' + mode)))
prepare_atlases()
provenance_path = P / 'docs/art-provenance.json'
provenance = json.loads(provenance_path.read_text()) if provenance_path.exists() else {
    'project': 'F40', 'provider': 'User local CC Switch compatible image service',
    'modelAlias': 'gpt-image-2.5', 'sourceReuse': False,
    'commissions': list(json.loads((P / 'art-source/original-commissions.json').read_text())),
}
provenance['atlasProcessing'] = 'Component-based extraction, proportional object packing, transparent RGB gutters and isolated premultiplied-alpha blur. See atlas-crop-audit-20261012.json.'
provenance['scenePreservation'] = 'Existing extended rooms, guardian mesh skins and corrected eyelids are preserved.'
provenance_path.write_text(json.dumps(provenance, indent=2) + '\n')
print('F40 art prepared; installed scene corrections preserved')
