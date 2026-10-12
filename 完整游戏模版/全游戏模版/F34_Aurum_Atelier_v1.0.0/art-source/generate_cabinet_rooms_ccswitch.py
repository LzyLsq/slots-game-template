"""Create four original side-stage backgrounds with the configured local CC Switch provider."""
from __future__ import annotations
import concurrent.futures
from generate_ccswitch import generate, provider

ROOMS = {
    'coin-room': 'Portrait jewelry atelier architecture, viewed straight on: warm golden coin engraving workshop with deep green velvet wall panels, polished marble pilasters, soft lamp niches and quiet tiled floor. A broad CENTRAL EMPTY RECESS with subtle softly lit plaster wall, fully behind the separate playable cabinet, while distinct workshop architecture and tools are visible at FAR LEFT and RIGHT edges. Gold leaf accents and a few naturally placed coins near the floor. Cohesive realistic painterly mobile game environment, sharp polished materials, golden-hour ambient lighting, deep spatial perspective. NO machine, NO slot cabinet, NO large object at center, NO characters, NO writing, NO UI, NO logo; naturally continuous floor at bottom and architecture at top.',
    'sapphire-room': 'Portrait master jeweler sapphire cutting workshop, viewed straight on: regal cobalt-blue enamel columns, white stone, polished brass and cool faceted sapphire highlights under warm atelier lamps. A broad CENTRAL EMPTY RECESS behind a separate playable cabinet, with gemstone tools and banners confined to FAR LEFT and RIGHT edges, continuous stone floor across bottom. Realistic painterly premium mobile game environment, crisp material detail, natural depth and restrained optical sparkle. NO machine, NO slot cabinet, NO large object at center, NO characters, NO writing, NO UI, NO logo.',
    'pearl-room': 'Portrait pearl stringing atelier, viewed straight on: luminous pearl ivory shell architecture, soft sage green silk wall panels, rose gold trim, natural mother of pearl reflections and display niches at FAR LEFT and RIGHT edges. Broad CENTRAL EMPTY RECESS behind a separate playable cabinet, elegant continuous warm marble floor. Premium painterly mobile game environment with clear physical depth, refined detail and soft natural lighting. NO machine, NO slot cabinet, NO large object at center, NO characters, NO writing, NO UI, NO logo.',
    'ruby-room': 'Portrait royal ruby crown foundry, viewed straight on: crimson velvet between carved stone and brushed gold columns, softly glowing forges and crown jewels in recesses only at FAR LEFT and RIGHT edges. Broad CENTRAL EMPTY RECESS behind a separate playable cabinet, continuous polished warm stone floor, restrained ruby reflections. Premium realistic painterly mobile game architecture, detailed material response, warmly lit coherent depth. NO machine, NO slot cabinet, NO large object at center, NO characters, NO writing, NO UI, NO logo.',
}

def main():
    url, key = provider()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for result in pool.map(lambda item: generate(item[0], item[1], url, key), ROOMS.items()):
            print(result, flush=True)
            if not result.endswith(' generated') and not result.endswith(' already present'):
                raise RuntimeError(result)

if __name__ == '__main__': main()
