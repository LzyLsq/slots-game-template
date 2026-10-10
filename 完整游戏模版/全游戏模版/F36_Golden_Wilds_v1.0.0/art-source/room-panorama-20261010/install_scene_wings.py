"""Install commissioned peripheral room views without resizing central gameplay art.
Run with Python/Pillow/numpy. Original source assets are retained.
"""
from pathlib import Path
from PIL import Image
import numpy as np
import hashlib, json, uuid
SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parent.parent
ART = ROOT / 'assets/resources/art'
MODES = ['sun-lion', 'emerald-elephant', 'lotus-koi', 'moon-fox']

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def metadata(file, alpha):
    target = Path(str(file) + '.meta')
    data = json.loads(target.read_text()) if target.exists() else json.loads((ART / 'sun-lion-extended.png.meta').read_text())
    identifier = data['uuid'] if target.exists() else str(uuid.uuid5(uuid.NAMESPACE_URL, 'f36/room-panorama/' + file.name))
    data['uuid'] = identifier
    data['userData'].update(hasAlpha=alpha, redirect=identifier + '@6c48a')
    sub = data['subMetas']['6c48a']
    sub.update(uuid=identifier + '@6c48a', displayName=file.stem)
    sub['userData'].update(imageUuidOrDatabaseUri=identifier, wrapModeS='clamp-to-edge', wrapModeT='clamp-to-edge')
    target.write_text(json.dumps(data, indent=2) + '\n')

manifest = []
for mode in MODES:
    generated = SOURCE / 'output/imagegen' / (mode + '-panorama.png')
    pano = Image.open(generated).convert('RGB')
    # Provider returned 1374 x 1145. This resampling prepares fixed 2:1
    # world units; it does not create additional source detail.
    peripheral = pano.resize((1536, 1280), Image.Resampling.LANCZOS)
    left = peripheral.crop((0, 0, 560, 1280))
    right = peripheral.crop((976, 0, 1536, 1280))
    source = ART / (mode + '-extended.png')
    center = Image.open(source).convert('RGBA')
    assert center.size == (1024, 2560)
    # Only the outer room margins feather. Cabinet/animal/reel pixels are exact.
    distance = np.minimum(np.arange(1024), np.arange(1024)[::-1])
    alpha = np.clip(distance / 96, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    center.putalpha(Image.fromarray(np.broadcast_to(np.round(alpha * 255).astype('uint8'), (2560, 1024)).copy()))
    installed = []
    for suffix, image in [('room-left', left), ('room-right', right), ('room-center', center)]:
        dest = ART / (mode + '-' + suffix + '.png')
        image.save(dest)
        metadata(dest, suffix == 'room-center')
        installed.append({'file': str(dest.relative_to(ROOT)), 'size': list(image.size), 'sha256': digest(dest)})
    # Final room preview excludes the animal mesh/title/reels/control overlays.
    preview = Image.new('RGB', (3072, 2560))
    preview.paste(left.resize((1120, 2560)), (0, 0))
    preview.paste(right.resize((1120, 2560)), (1952, 0))
    preview.paste(center, (1024, 0), center.getchannel('A'))
    preview.resize((1152, 960), Image.Resampling.LANCZOS).save(SOURCE / (mode + '-join-preview.jpg'), quality=94)
    manifest.append({'mode': mode, 'providerOutput': str(generated.relative_to(ROOT)), 'providerSize': list(pano.size), 'providerSha256': digest(generated), 'originalCenterSha256': digest(source), 'assets': installed, 'registration': 'original 1024x2560 center at (0,-38), wings at (+/-976,-38), 96-unit peripheral overlaps', 'decodedTextureBytes': 4 * (1024*2560 + 2*560*1280)})
(SOURCE / 'installation-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Installed four original-detail centers and eight commissioned room wings; originals preserved.')
