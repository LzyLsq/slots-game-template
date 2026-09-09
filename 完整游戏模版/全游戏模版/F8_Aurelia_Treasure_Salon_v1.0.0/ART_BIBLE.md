# F8 · AURELIA — Treasure Salon

## Intent
An adult social-casino treasure salon: warm wealth, coins, celebration and tactile luxury. Not a clone of F6's carnival. No cash-out, real-world prizes, purchased chances advertised as profit, or fabricated multiplayer activity.

## Direction
- Champagne metal `#DCA954`, jade lacquer `#134943`, butter light `#F8E8BF`, coral silk `#DB8E80`, smoky plum `#30252A`, pearl blue `#99CACA`.
- Display: sculpted image lettering for brand/celebrations; Georgia bold for headings. UI: system sans, bold tabular amounts, high-contrast solid text surfaces. Essential information never lives only in artwork.
- Salon layout: architectural welcome scene; one horizontal featured game and an asymmetric gallery of three treasure exhibits. Store, rewards, rank and account use matching illustrated salon surfaces, not a repeated feature-card grid.
- Signature: a three-dimensional treasure reveal with orbiting prize coins that finish by flying into the real wallet, rather than a card over a black overlay.

## Four games
1. Golden Hour: 3×3 centre-line classic, three Scatter safes open a predetermined treasure pick.
2. Jade Treasury: 5×3, 20 lines, six coins lock and respin with a three-life display.
3. Pearl Palace: 5×4, 1024 ways, expanding wild column bonus rounds.
4. Ruby Revel: 5×5 clusters, sequential collapse/refill and rising cascade multiplier.

## Geometry contract
Each cabinet is a single integrated scene raster. Source-pixel screen, title, credit and control coordinates are measured per image. Artwork, reel masks, symbols, glass, controls and win readout all share one transform. A separate full-viewport atmospheric extension fills surplus space without rescaling the cabinet. Resize never rebuilds or cancels a spin. Safe-area navigation is outside the cabinet plane. Minimum touch area: 44 CSS pixels; no global press-scale on framed controls.

## Motion
Pooled reel strips, pullback/acceleration/cruise/staggered deceleration/settle; no random changes to the committed outcome. Bounded additive light sprites, glass sweeps clipped inside the actual screen, local symbol squash, coin arcs. Shared reduced-motion preference; hidden-tab pause; no gameplay animation timers.

## Asset generation
User explicitly selected local CC Switch. Use the existing repository CC Switch generation script and gpt-image-2. Save prompts here; do not store proxy responses, credentials, or generated request payloads in Git. Generated pictures are art assets, not evidence of tested features. Inspect each before assigning geometry.
