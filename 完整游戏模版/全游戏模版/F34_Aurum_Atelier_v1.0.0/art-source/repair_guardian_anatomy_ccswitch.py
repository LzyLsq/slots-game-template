"""Targeted F34 guardian-body edits through the user's local CC Switch provider.

Read credentials in memory using the established project helper. Save versioned
raw paintings for review; this command never installs art into the game.
"""
from pathlib import Path
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor
import base64, json, uuid, urllib.request
from PIL import Image
from generate_ccswitch import provider
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'art-source/raw'
PROMPTS = ROOT / 'art-source/prompts'
INVARIANTS = """Use case: precise-object-edit. Edit ONLY this premium transparent game mascot torso sprite, not a complete character composition. Preserve the exact canvas aspect, character placement and scale, face, eyes, crown, necklace, polished metal and jewel material, warm lighting, palette, visible foot positions, and primary held jewel. True transparent background and clean alpha. No text, scenery or extra accessories. This body-only image will have ONE raised limb added from a separate existing animation layer. The raised limb is entirely absent in this input and MUST remain absent. Anatomical correctness matters more than preserving an erroneous body contour. No new limbs, no extra arm or wing disguised as ornament. """
SPECS = {
 'pearl': INVARIANTS + """CRITICAL CORRECTION: the input body is cupping the pearl with TWO folded wings, one on the near viewer-left side and a second far wing wrapping around the viewer-RIGHT edge of the pearl. This is anatomically invalid because a raised wing is added later. Remove the ENTIRE FAR wing on the viewer-RIGHT edge of the pearl, including its wing-shaped golden rim, upper shoulder, white curling feathers, lower feather tips, and any forearm-like feather loop. Leave the pearl silhouette visibly unobstructed on its right and upper right, with clean transparent space to the right; no residual far wing behind or under the pearl. Retain exactly ONE clearly folded near wing, attached to the viewer-left breast, cupping the pearl from its near-left underside. The pearl is supported by THIS ONE folded wing only. Remove the fan-shaped rear tail on the viewer-LEFT rump; replace with a tiny short, single tapered white tail flush with the rump, so it cannot be mistaken for a wing. The remaining torso is one smooth rounded breast/belly with short close-fitting feathers; no large wing-shaped feather panel on the belly. Body-only output: ONE folded wing, TWO legs and TWO webbed feet, ONE tiny tail, and ZERO raised wings. The final animation later adds the second wing. Preserve the large pearl and elegant swan princess face exactly.""",
 'ruby': INVARIANTS + """CRITICAL CORRECTION: the input retains a long straight DOWNWARD FRONT LEG under the mane on viewer-left, directly beside the medallion. This competes with the TWO hind haunches and makes the raised front paw into an extra limb. Completely remove that downward front-leg column from shoulder/chest to the floor. Repaint that area as ONE short fluffy rounded belly that ends ABOVE the floor between the two hind feet, with no vertical limb-shaped fur strip or center paw. Keep exactly TWO clearly identifiable HIND haunches, rounded to each side, each ending in its own one hind foot on the floor; hind feet must connect directly to their rounded rear thighs, never a vertical chest limb. Keep exactly ONE FRONT LEG, the bent viewer-right foreleg whose paw rests on top of the ruby medallion. The other front leg is absent because it will be added later as the raised waving layer; do not paint any stump or replacement lowered front leg on viewer-left. Body-only output: THREE paws total, exactly TWO on floor (left hind/right hind) and ONE on medallion (right forepaw), ZERO raised paws, ZERO central floor paws. Clearly separate the rounded belly from the left hind haunch so the anatomy reads naturally. Keep the mane, tail, smiling face, crown, necklace and ruby medallion intact."""
}

def edit(name):
    url, key = provider()
    prompt = SPECS[name]
    (PROMPTS / f'guardian-{name}-anatomy-v3.txt').write_text(prompt + '\n')
    reference = (RAW / f'guardian-{name}-anatomy-reference-v3.png').read_bytes()
    boundary = '----f34-anatomy-' + uuid.uuid4().hex
    parts = []
    for field, value in [('model','gpt-image-2.5'),('prompt',prompt),('size','1024x1024'),('quality','high'),('background','transparent')]:
        parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"\r\n\r\n{value}\r\n').encode())
    parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="reference.png"\r\nContent-Type: image/png\r\n\r\n').encode()+reference+b'\r\n')
    parts.append((f'--{boundary}--\r\n').encode())
    req = urllib.request.Request(url+'/images/edits', b''.join(parts), {'Content-Type':f'multipart/form-data; boundary={boundary}', 'Authorization':'Bearer '+key})
    with urllib.request.urlopen(req, timeout=900) as response:
        data = json.load(response)['data'][0]
    image = Image.open(BytesIO(base64.b64decode(data['b64_json']))).convert('RGBA')
    dest = RAW / f'guardian-{name}-torso-anatomy-v3.png'
    image.save(dest, optimize=True)
    print(f'{name}: saved {dest.name}, {image.size}, alpha {image.getchannel("A").getextrema()}', flush=True)

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(edit, SPECS))
