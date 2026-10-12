"""Commission four complete cabinet-top guardians through the configured CC Switch provider."""
from __future__ import annotations
import concurrent.futures
from generate_ccswitch import generate, provider

GUARDIANS = {
    'guardian-coin': 'One COMPLETE small seated golden fox mascot, minted as a luxury jewelry atelier cabinet finial. Full body from ears to BOTH paws and curled tail visible, holding a single engraved gold coin against its chest. Warm chased brass, amber cabochon eyes, tiny malachite enamel accents, detailed believable sculpted metal and soft reflected light. Three-quarter front view, compact triangular silhouette, calm warm expression. Isolated on TRANSPARENT background with clean alpha; no pedestal, no writing, no detached pieces, no cutoff, no human figure, no decorative scene.',
    'guardian-sapphire': 'One COMPLETE small perched owl mascot, made as a master jeweler cabinet finial. Full body from feather crest to BOTH talons and folded wings visible, gently protecting one faceted blue sapphire. Polished champagne-gold claws, deep cobalt enamel feathers, restrained sapphire refraction, delicate carved feather detail and realistic soft reflected light. Three-quarter front view, compact readable silhouette. Isolated on TRANSPARENT background with clean alpha; no pedestal, no writing, no detached pieces, no cutoff, no human figure, no decorative scene.',
    'guardian-pearl': 'One COMPLETE small graceful swan mascot, made as a pearl jewelry cabinet finial. Full body with curved neck, BOTH folded wings, rounded breast and lower feet visible; a single pearl nestled between its wings. Luminous carved ivory nacre, subtle sage enamel inlay, rose-gold chased edge and soft pearl reflections. Three-quarter front view, compact readable silhouette. Isolated on TRANSPARENT background with clean alpha; no pedestal, no writing, no detached pieces, no cutoff, no human figure, no decorative scene.',
    'guardian-ruby': 'One COMPLETE small seated royal lion mascot, made as a ruby crown foundry cabinet finial. Full body from mane to BOTH front paws and curled tail visible; a little ruby is held between the paws, modest crown-like gold tuft. Hammered rose gold mane, deep crimson enamel accents, rich ruby setting and realistic warm reflected light. Three-quarter front view, compact readable silhouette, noble but friendly. Isolated on TRANSPARENT background with clean alpha; no pedestal, no writing, no detached pieces, no cutoff, no human figure, no decorative scene.',
}

def main():
    url, key = provider()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for result in pool.map(lambda item: generate(item[0],item[1],url,key),GUARDIANS.items()):
            print(result,flush=True)
            if not result.endswith(' generated') and not result.endswith(' already present'):
                raise RuntimeError(result)

if __name__ == '__main__':main()
