# F22 grand celebration 19

- Reveal no longer advances the animation clock to the count deadline. Rays and side ornaments remain continuous after an early tap, and counting cannot overwrite the revealed total.
- Track the actual reveal time for the 2.2-second automatic hold. Suppress dismissal for 300ms after reveal to protect against double taps; later taps still dismiss normally.
- Fade in the warm backdrop over 380ms and bring the pooled coin fountain in after 300ms over 850ms. Treasure/title retain their existing staged entrance.
- Side ornaments breathe with uniform scaling, preserving their silhouettes.

Typecheck and web-mobile build passed. Six presentation cases cover four themes at 430px, Lotus at 320px, and reduced-motion Lotus at 390px. Nine-digit amounts fit the panel in inspected rendered screenshots. Asserted no elapsed/rotation jump on reveal, no double-tap dismissal, no count rewind, stage cleanup, and unchanged wallet. Additional real-pointer collect tests and automatic count/hold tests passed; cabinet controls restored. QA presentation amounts were synthetic visual tests and did not credit wallets. Evidence: screenshots/celebration-19.json, celebration-19-controls.json, and *-grand-19.png. Browser viewport validation, not a physical-device performance benchmark.
