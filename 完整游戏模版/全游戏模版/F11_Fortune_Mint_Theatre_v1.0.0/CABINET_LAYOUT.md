# F11 Fortune Mint Theatre — Cabinet layout system

F11 uses one **cabinet stage plane** for every game. The authored environment,
cabinet shell, live reel aperture, readouts and physical controls are siblings
under the same responsive transform. Nothing inside the machine is positioned
against the phone viewport.

## Visual tokens

- Mint brass — `#D8A84E`
- Champagne light — `#FFE7A4`
- Peacock enamel — `#0F6666`
- Coral lacquer — `#C85C4A`
- Ivory porcelain — `#FFF5D8`
- Theatre shadow — `#261925`

Display lettering is reserved for generated title plaques. Runtime numbers use
a heavy tabular face and strong light/dark separation. Utility copy is kept
short and never baked into the cabinet image.

## Shared vertical hierarchy

```text
┌────────────────────────────────────────┐
│ safe utility rail       lobby / sound │  outside machine plane
├────────────────────────────────────────┤
│              title crown               │
│          TOP WIN / feature lamp        │
│              balance rail              │
│  ┌──────────────────────────────────┐  │
│  │       measured reel aperture     │  │  all live content clipped here
│  └──────────────────────────────────┘  │
│               win meter                │
│      bet stepper   SPIN   auto/turbo   │
│        integrated control console      │
│        cabinet plinth / signature      │
└────────────────────────────────────────┘
```

This follows the natural reading order that makes S05 and S06 feel convincing,
without copying their silhouettes or coordinates.

## Four distinct machines

1. **Mint Mosaic** — broad coining-press arch, square 4×4 viewing chamber,
   symmetric five-control console.
2. **Ribbon Routes** — theatre proscenium with a wider 5×4 panoramic aperture,
   curved conductor-style control rail.
3. **Vault Elevator** — tall mint-elevator portal with a 5×5 inspection window,
   offset lift lever and compact thumb controls.
4. **Fortune Orbit** — round astronomical mint instrument around a square 3×3
   aperture, with a satellite spin control and arc-shaped secondary controls.

## Responsive contract

- Source art is authored at 1024×1536.
- The whole plane fits between the safe top toolbar and bottom hint rail.
- Interactive slots are measured in source pixels and transformed once.
- Reel clipping, symbol sizing and hit areas derive from the measured aperture.
- No individual control receives a second viewport scale.
- On tall phones the extra room belongs to the environment, not to spacing
  inserted inside the cabinet.

