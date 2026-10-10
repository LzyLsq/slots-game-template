# F36 artwork and audio provenance · 2026-10-10

## Bitmap commissions

F36 bitmap artwork was commissioned through the current image provider configured in the local CC Switch database. Configuration was read for this task; global providers and credentials were not changed. Credentials are not stored in this project. `art-source/generate_ccswitch.py` contains the generation/import pipeline; `art-source/original-commissions.json` preserves the executed initial prompts and provider/model description.

The source commissions cover the expedition hall, service rooms, four sanctuary rooms, brand and mode wordmarks, loading/prize illustrations, symbol atlases, button materials and utility icon atlas. Images are decoded/cropped into Cocos sprite resources with `.meta` files. Symbol cells and transparent bounds are measured; titles and prize boards retain their intended aspect ratio rather than being squeezed to arbitrary rectangles. The Apple mark is a raster of the platform system glyph via `rasterize_platform_mark.swift`, not a generated decorative imitation.

## Upper wildlife guardians and continuous animation

The current cabinet artwork is commissioned through the same local CC Switch selected image provider. `art-source/wildlife-rig-20261010/` retains the prompts, provider outputs, extraction masks, installation scripts and hashes. The four guardians match the hall: a golden cartoon lion, emerald cartoon elephant, pearl/coral/gold koi and russet cartoon fox. Animals, ornament and light were commissioned in their existing crown setting, then separated into a single transparent animal and a stationary architectural plate. New clean plates fill only the animal removal region; perimeter registration preserves the surrounding room. The installed textures are 1472×896 pixels for a 736×448 Cocos panel.

`prepare_rig.py` extracts measured silhouettes with narrow edge refinement and preserves opaque animal interiors. `install_rig.py` installs the registered `*-guardian-base.png` and `*-guardian-skin.png` textures plus Cocos metadata. `installation-manifest.json` records the installed hashes. The fixed panel maps to x144…880, y256…704 in the 1024×2560 extended room. The room, title, reels and controls retain their geometry and textures.

`GuardianMesh.ts` renders one connected 64×40 cell Sprite mesh (2,665 vertices) using the commissioned image. `CabinetGuardian.ts` deforms local joint regions over one continuous clock: lion/fox beckoning paws, elephant trunk and ears, koi tail and fins, with rigid head response. Mammal blinking is implemented separately with registered closed-eye texture patches and a curved eyelid material; it does not deform the face. The koi eyes remain open with no eyelid deformation. Broad smooth weight transitions avoid triangle folding. Spin/win energy eases rather than replacing a drawing or resetting the loop. The architecture and whole-crown transform stay fixed. Reduced motion gives exact neutral vertices. This is 2D image mesh articulation, not a 3D character or an imported skeletal animation.

The earlier human fortune characters and 48-frame pose atlases are superseded and are not shipped. Their source commissions and earlier QA remain historical records. Do not rerun `art-source/cartoon-fortune-20261010/install_cartoon_motion.py`; it reinstalls the rejected artwork and animation. The current blink and isolated-arm evidence is under `docs/screenshots/f36-eyelids-limb-isolation-20261010/`; earlier runtime evidence remains historical.

The original central cabinet and compact lower treasury retain their artwork. The new peripheral room commissions below extend the same setting across wider viewports.

## Registered mammal eyelids · 2026-10-10

`art-source/eyelids-20261010/` preserves the new closed-eye commission and measured installation. The image was generated through the existing CC Switch selected provider using the current animals as a reference. Three 1472×896 textures keep the original open-eye skin outside the two registered eye rectangles, including all original alpha. `installation-audit.json` records zero altered pixels outside those rectangles. `GuardianEyelids.ts` applies the curved lid boundary to eye RGB only; there is no alternate full-animal silhouette, image crossfade or face compression. Koi has no closed-eye texture or eyelid material. The generated eyelid textures are included in the refreshed shipped-asset manifest.

## Continuous peripheral rooms · 2026-10-10

`art-source/room-panorama-20261010/` retains four commissions executed through the locally selected CC Switch image provider, preservation masks, prompts, returned images and logs. These extend the existing savannah, emerald waterfall, lotus pond and sunset pavilion settings. The provider returned **1374×1145 pixels** per panorama, despite the requested 3072×2560 canvas. The returned resolution is recorded in `installation-manifest.json`; these are not native 3072-pixel commissions.

`install_scene_wings.py` installs a 560×1280 image for each side plus a 1024×2560 central plate. Peripheral resampling prepares the authored coordinate scale and does not create extra source detail. The central RGB pixels remain exactly those of the existing room; only the outer 96-pixel room margins receive alpha feathering. The original source files remain available. Wing and center textures use clamp-to-edge sampling.

All three plates share the measured Cocos cabinet plane. Wings overlap the center by 96 world units, preserving floor perspective and illumination. The separately registered animal, title, reels and console retain their coordinates and detail. Generated center figures are excluded from the wing crops, and the existing clean architectural/animal mesh panel continues to cover the older figure in the original central room. No additional animal or cabinet instance is created. Approximate decoded RGBA storage is 15.47 MiB per room, before engine overhead, guardian textures and other resources; this is a storage estimate, not a device memory measurement.

## Startup art

All four web-preview startup bitmaps now come from F36 commissions: expedition room, Golden Wilds brand, Sun Lion treasure illustration and textured loading/retry plate. Inherited atelier startup art and copy were removed. Boot resource progress, failure/retry and overlay teardown were verified after rebuilding.

## Audio

`art-source/compose_audio.py` synthesizes 44 new stereo WAV tracks and effects. `audio-manifest.json` records the four sanctuary scores, tempos, instrumentation, durations, loop seams and mastering revision `golden-wilds-rounded-festive-20261009`. Audio uses warm festive synthetic instruments with softened highs; it is not a recorded orchestra or a licensed commercial music library.

## File identity check

`shipped-asset-manifest.json` hashes all shipped PNG/WAV assets in `assets/resources` and `build-templates`, including the startup files. The current counts and reference comparisons are recorded in the refreshed manifest dated 2026-10-10. This establishes file identity only; it does not prove exclusive rights, visual originality, provider licensing or release approval.

Code and service infrastructure reuse are documented separately from artwork creation. Before publication, the publisher must preserve the provider's applicable commercial-use terms, platform-mark use conditions and final asset rights records. Those rights were not independently cleared here.
