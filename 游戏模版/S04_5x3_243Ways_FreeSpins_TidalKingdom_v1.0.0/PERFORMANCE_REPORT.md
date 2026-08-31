# Performance Report

The game keeps 15 persistent symbol views and reuses them for every paid and free spin. Results are precomputed; reel presentation, Turbo and quick stop cannot change awards. Animations use bounded Cocos tweens, staggered reel landings, pooled visual structure and short particle runs rather than creating reel objects every frame.

The 23 generated production images are loaded through Cocos resources. Responsive composition is recalculated on resize and orientation change, including an independent portrait layout and a two-column landscape/desktop layout. `prefers-reduced-motion` shortens loading, reel, free-spin and celebration transitions without removing gameplay feedback.

For production distribution, prepare device-specific texture compression and atlases after final art lock. Keep symbols at high quality, but scale non-critical full-screen artwork by device tier when memory budgets require it.
