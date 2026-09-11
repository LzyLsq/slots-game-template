# F17 art provenance

The original F17 artwork was generated through the user-authorized local CC Switch Responses route using gpt-image-2. The complete production prompts are in [art-prompts](art-prompts/).

The delivered asset set includes the caravan arrival, four-stop courtyard, merchant desk, Golden Caravan wordmark, four illustrated destination posters, sixteen common treasure symbols, sixteen regional symbols, sixteen utility icons, sixteen independently themed dimensional controls, four material panels, four prize compositions and four integrated cabinet environments. The last four environments were outpainted to tall mobile aspect ratios, preserving natural sky and floor rather than stretching edge pixels.

Sprites were extracted using connected contours on the keyed source. The touching saffron-bowl / moon-lantern chain was separated at the measured source boundary. Runtime atlases use 256px cells with at least 20px clear margins; regional symbol mappings are explicit in GameConfigs. Four friendly character portraits are available. The Apple mark and additive optical textures are reused from the approved foundation.

Final production art is stored in `assets/resources/art/`; the web preloader has local copies of its arrival and logo. Raw generation responses and intermediate files stay outside the game project. Source math and service logic originate from the established F8–F15 implementation; F17 has its own package identity, save namespace, images and page compositions.

`cabinet-measurements.json` records the final painted reel interiors. Each cabinet, full background, controls, displays and reel aperture share one transform. The templates are checked with actual browser screenshots in addition to geometry tests.
