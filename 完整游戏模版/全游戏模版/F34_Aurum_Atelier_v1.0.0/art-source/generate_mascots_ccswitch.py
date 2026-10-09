"""Generate original, transparent F34 atelier guides with the project's CC Switch art provider."""
from __future__ import annotations
import concurrent.futures
import sys
from pathlib import Path
from generate_ccswitch import generate, provider
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROMPTS = {
    'mascot-coin': 'Isolated character illustration, the Atelier coin engraver: a charming adult blonde goldsmith in fitted dark malachite velvet and finely tooled gold apron, smiling and proudly presenting a large freshly minted gold coin in one raised hand. Bust and both arms visible, believable human anatomy, intricately rendered polished metal, softly brushed blonde hair, dramatic but natural warm reflection. Her apron and elbows make a broad low silhouette. Premium painterly mobile game character, expressive but elegant, crisp enough at 220px. True transparent alpha background, NO circular portrait frame, no medallion, no pedestal, no scenery, no cast shadow, no writing, no logo; full head, shoulders and hands contained with safe transparent margin.',
    'mascot-sapphire': 'Isolated character illustration, the Atelier sapphire faceter: distinguished silver-haired master jeweler with deep teal velvet vest, delicate golden loupe and one glowing royal-blue sapphire held near his face, welcoming expression and expressive free hand. Bust and both arms visible, believable human anatomy, detailed silk and jewel refraction, refined cool-blue highlights within warm gold atelier art direction. Premium painterly mobile game character, crisp at 220px. True transparent alpha background, NO circular portrait frame, no medallion, no pedestal, no scenery, no cast shadow, no writing, no logo; full head, shoulders and hands contained with safe transparent margin.',
    'mascot-pearl': 'Isolated character illustration, the Atelier pearl stringer: graceful adult woman artisan in pearl-white brocade with pale rose sleeves and gold clasps, happy and welcoming, both hands arranging a short naturally curved strand of luminous pearls. Bust and both arms visible, believable human anatomy, nacre sheen and realistic material light, tasteful regal jewelry atelier style. Premium painterly mobile game character, crisp at 220px. True transparent alpha background, NO circular portrait frame, no medallion, no pedestal, no scenery, no cast shadow, no writing, no logo; full head, shoulders and hands contained with safe transparent margin.',
    'mascot-ruby': 'Isolated character illustration, the Atelier crown founder: charismatic adult male goldsmith with warm dark curls and a dark crimson velvet vest over finely embroidered ivory shirt, confidently presents a small ruby crown jewel in one raised hand, other hand rests lightly at waist, warm smile. Bust and both arms visible, believable human anatomy, faceted ruby fire and polished rose gold highlights. Premium painterly mobile game character, crisp at 220px. True transparent alpha background, NO circular portrait frame, no medallion, no pedestal, no scenery, no cast shadow, no writing, no logo; full head, shoulders and hands contained with safe transparent margin.',
}

def main():
    url, key = provider()
    names = sys.argv[1:] or list(PROMPTS)
    for name in names:
        if name not in PROMPTS:
            raise SystemExit(f'Unknown F34 mascot: {name}')
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for name, result in zip(names, pool.map(lambda name: generate(name, PROMPTS[name], url, key), names)):
            if result != name + ' generated':
                raise RuntimeError(result)
            asset = ROOT / 'assets' / 'resources' / 'art' / (name + '.png')
            image = Image.open(asset).convert('RGBA')
            alpha = image.getchannel('A')
            pixels = alpha.load()
            for y in range(image.height - 94, image.height):
                fade = max(0, min(1, (image.height - y) / 94)) ** 1.6
                for x in range(image.width):
                    pixels[x, y] = round(pixels[x, y] * fade)
            image.putalpha(alpha)
            image.save(asset, optimize=True)
            print(result, flush=True)

if __name__ == '__main__': main()
