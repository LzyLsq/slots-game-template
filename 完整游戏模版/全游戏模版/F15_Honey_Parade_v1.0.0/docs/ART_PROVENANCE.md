# F15 art provenance

Original Honey Parade bitmap assets were generated for this project using the previously user-authorized CC Switch image-generation route, with gpt-image-2 requests. The runtime did not expose a built-in image-generation tool. Prompts used are preserved in `art-prompts/`.

New art includes the honey-fountain login, matte ivory theatre, four themed cabinets, four story illustrations, Honey Parade logo, matte porcelain/velvet UI materials, sixteen thematic controls, sixteen symbols, sixteen utility icons, sixteen friendly cartoon portraits, four service backgrounds and the honey-pot jackpot hero. Assets live in `assets/resources/art/`; runtime assets do not reference external generation folders.

Magenta-key sheets were extracted into transparent sprites with consistent margins. Intended plum and porcelain colours were preserved. Buttons are grouped by cabinet theme and action. The source 887×1774 cabinet illustration is normalized to a 1536×3072 central plane; reflected edge extension is baked into a 1920×3456 room bitmap for wider/taller device coverage without moving any central cabinet pixels. Reel apertures and physical control sockets were measured from each final illustration and reviewed in the rendered game.

Reusable code, additive optics and the Apple mark come from the previously approved F14 foundation. The four mathematical game models and secure service boundaries were retained; the new illustrations, navigation composition, show selector and service layouts were designed for F15. Publisher-owned legal content, StoreKit product IDs and native certification are not supplied by generated art.

### Theme-isolated symbols and jackpot prizes
Original raster illustrations generated through the user-authorized local CC Switch image route (gpt-image-2), then keyed, cropped per cell, scaled and assembled into separate game atlases. Prompts: `art-prompts/theme-symbols.txt`, `art-prompts/theme-prizes.txt`. Final assets: `assets/resources/art/symbols-{game-id}.png`, matching `-blur.png`, and `prize-{game-id}.png`. Generic crown/chest/wild/safe/purse assets remain shared; the shared coin now has a neutral star. No payout math was modified by the art changes.

### Living theatre curtains
`assets/resources/art/parade-curtain.png`: original coral velvet/ivory silk curtain generated with the authorized CC Switch image route (gpt-image-2); magenta keyed and tightly cropped. Prompt: `docs/art-prompts/curtain.txt`. Runtime uses overlapping horizontal texture strips to form continuous wind waves with fixed top attachments. Hanging coins reuse the neutral star coin, with drawn gold suspension chains and existing glint textures.

The final theatre revision supersedes the earlier window-style curtain: `parade-curtain.png` now contains the theatrical wing from `art-prompts/theatre-wing.txt`; `theatre-valance.png` uses `art-prompts/theatre-top.txt`. Both were generated through the authorized CC Switch gpt-image-2 route and keyed/cropped into production assets. Final screenshot: `docs/screenshots/390-curtain-stage.png`.

### Unified painted theatre (supersedes separate curtain overlays)
`harvest-hall-soft.png` is now an original reference-guided scene edit with curtains physically painted into the architecture, generated through the authorized CC Switch gpt-image-2 route. `theatre-front.png` extracts cloth from that exact scene, excluding static gold architecture, for foreground occlusion. `theatre-velvet.png` is an original fully opaque pleated textile used for gathering transitions. Prompts: `art-prompts/integrated-stage.txt`, `art-prompts/closed-velvet.txt`.
