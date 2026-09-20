# Premium enamel cabinet controls

Generated with the previously user-requested local CC Switch image pipeline (gpt-image-2), after the built-in tool returned no usable output. Exact prompt and source evidence are in workspace `output/jamboree-art/premium-controls.prompt.txt`, `.request.json`, `.response.json`, and `.png`. Extraction script: `prepare_premium_controls.py`.

Design prompt: isolated orthographic circular treasure-game controls; champagne enamel spin, pearl enamel plus/minus, turquoise auto; slim polished gold bezel, fine milled inner edge, soft dome and upper-left highlights; avoid chunky stacked rings, brown bevels and plastic glare. Magenta extraction background removed before import.

Runtime files in `assets/resources/art/`: `jamboree-premium-spin.png`, `jamboree-premium-plus.png`, `jamboree-premium-minus.png`, `jamboree-premium-auto.png`. Each is a transparent 392px PNG; all four are loaded and referenced. Existing wallet coin and top-up controls remain unchanged.

Validated: TypeScript check and press tests passed. Actual Crown Carnival cabinet render reviewed at 621×782; plus press changed bet 100 to 200 without changing balance. Hitboxes and accounting logic unchanged. Web output built and ran, but Cocos CLI still exited with code 36; this is not release certification. No new real-device performance or full multi-device acceptance claimed.

## State feedback follow-up

Controls now fade gently when a round locks betting or the selected bet reaches its bounds. A small inset arc indicates a round in progress without rotating the mounted button or moving hitboxes. Retry remains available. Reduced-motion mode uses static state feedback; background updates are skipped. State fades occur only on transitions rather than spawning tweens every frame.

Typecheck, press and economy tests passed. Native preview verified minimum bet 50, running reels with control feedback, and idle restoration after settlement. Observed ledger: 99,044 - 50 + 86 = 99,080; award readout 86 matched. Browser error log was empty in this check. Preview version: enamel-states-v4. No real-money transactions performed.
