# CC API Image Generation Notes

The premium Arcane Treasures presentation artwork under
`assets/resources/fantasy/generated/` was generated specifically for this
template through the local CC Switch OpenAI-compatible image API.

## Generation profile

- Model: `gpt-image-2`
- Output: PNG
- Art direction: polished mobile fantasy casino UI, sapphire crystal, antique
  gold filigree, royal purple fabric, readable silhouettes and restrained glow
- Composition target: portrait 750×1334 interface with a wide 6×5 playfield
- Special-symbol requirement: isolated centered icon, true transparent
  background, generous safe padding, no text and no square backing plate

## Generated resources

- `arcane-background.png`
- `arcane-logo.png`
- `arcane-board-frame.png`
- `arcane-win-banner.png`
- `arcane-coin-pile.png`
- `arcane-control-console.png`
- `arcane-rules-frame.png`
- `arcane-wild-rune.png`
- `arcane-scatter-rune.png`
- `arcane-multiplier-rune.png`
- `arcane-coin-icon.png`

Commercial upgrade resources generated in the same CC API workflow:

- `arcane-hud-bar-v2.png`
- `arcane-spin-button-v2.png`
- `arcane-utility-button-v2.png`
- `arcane-bet-panel-v2.png`
- `arcane-multiplier-track-v2.png`
- `arcane-result-ribbon-v2.png`
- `arcane-collect-button-v2.png`
- `arcane-tooltip-frame-v2.png`
- `arcane-cluster-burst-v2.png`
- `arcane-spin-aura-v2.png`
- `arcane-treasure-burst-wordmark-v2.png`
- `arcane-legendary-cascade-wordmark-v2.png`
- `arcane-home-icon-v2.png`
- `arcane-sound-icon-v2.png`
- `arcane-rules-icon-v2.png`
- `arcane-auto-icon-v2.png`
- `arcane-plus-icon-v2.png`
- `arcane-minus-icon-v2.png`

Where the API returned green-screen RGB artwork, the flat key was converted to
alpha with a soft matte, one-pixel contraction, subpixel feathering and green
spill cleanup. Existing RGBA outputs were preserved directly. Each control was
then optically aligned to the visible circular or rectangular slot in its
destination frame; transparent canvas bounds were not treated as the visual
center.

The runtime `FRAMES` map keeps the original licensed UI/rune artwork as a
fallback if a generated resource is unavailable. No API key or credential is
stored in this project.

## Regeneration checklist

1. Generate replacements through the local CC Switch image endpoint.
2. Preserve each resource filename and transparent padding.
3. Confirm alpha transparency around all special symbols.
4. Let Cocos Creator reimport the PNGs and rebuild Web Mobile.
5. Recheck loading, rules, recharge, cascades, wordmark win overlay, coin
   flight, control state feedback and optical icon alignment at
   750×1334, 390×844 and 1440×900.
