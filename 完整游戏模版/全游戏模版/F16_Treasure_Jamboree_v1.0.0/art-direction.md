# Treasure Jamboree

## Design argument
An adult virtual-coin arcade imagined as a cheerful treasure fair: a connected plaza, tactile gold machinery, jewel enamel, readable ivory reel windows. Real-money wagering and cash-out are not supported.

The signature is a treasure fountain at the crossroads of four attractions. The hall is a place to explore, not four equivalent cards. Architecture stays grounded; light, flags and rewards carry motion.

## Material and type system
- Coin gold `#EFB94F`: machinery and earned rewards, not an all-over wash.
- Coral enamel `#CE6153`: primary action, fabric accents.
- Lagoon enamel `#397E82`: secondary machinery.
- Warm ivory `#FFF3D1`: reel beds and readable paper.
- Walnut `#402C25`: text and structural shadow.
- Sky `#BDDCD9`: distant daylight, subordinate to the game.
- Illustrated English brand lettering; Georgia only for display headings; Arial for labels, rules and financial numerals. Physical text targets: 16px body, 14px secondary, no shrink-to-fit for essential values.

## Composition
Hall: persistent asset rail, continuous illustrated plaza with a selected attraction, separate physical destination selector and PLAY action. Store is a counter; rewards a chest-opening journey; account a visitor passport; ranking a podium with an honest score list.

Cabinets: one full-room painting per mode, with an actual reel aperture and control counter. Reels and decoration share a transform. Screen aspect controls symbols; viewport changes must never stretch an illustration.

## Motion
Input acknowledgement within one frame. Press only the inner button cap. Selection is interruptible and follows a drag; exiting pages stay rendered until the next page is ready. Reels use pullback, acceleration, cruise, ordered braking and precise settle. Winning symbols precede count-up and coin flight. Reduce motion and background suspension are required.

## Acceptance / release boundaries
Run and inspect all four modes, every service page, 320/390/430px portrait and tablet/landscape. Check cancellation, duplicate input, shared balances, retry and login drafts. Unit tests are necessary but do not certify visual quality or actual device performance.

App Store delivery additionally requires the owner's identity, legal/support URLs, licensed final assets, Apple identifiers, native Sign in with Apple and StoreKit configuration, verified backend transactions, and real-device review. A browser template must not pretend these are already connected.
