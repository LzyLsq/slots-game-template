# Fortune Tides mathematics

This is a demonstration engine. No certified or guaranteed RTP is claimed. Bets and awards use one common credit unit, with monetary results rounded to six decimal places. The browser wallet must charge the bet once and credit `totalWin` once, not credit individual animation stages again.

## API

`src/engine.js` is a dependency-free ES module exporting:

- `MODES`: `{id, cols, rows, kind}[]`, with IDs `mint`, `pearl`, `reef`, `beacon`.
- `SYMBOLS`: integer IDs `COIN=0`, `PEARL=1`, `EMERALD=2`, `RUBY=3`, `COMPASS=4`, `CHEST=5`, `WILD=6`, `SCATTER=7`.
- `PAYTABLE`, `PAYLINES`, and `RULES` for inspecting rules.
- `evaluate(modeId, grid, bet)`: `{wins, award, remove}` for a supplied grid. This pure evaluator does not run cascades or the hold feature.
- `spin(modeId, bet, rng=Math.random)`: `{grid, stages, totalWin, feature, detail}`. `grid` is the final board; initial and intermediate boards are available through `stages`.

Every grid is column-major: `grid[c][r]`, row zero at top. Each stage has `{grid, wins, remove, award, kind}`. Each win has `{cells:[{c,r}], amount, label}` and may provide symbol/count/line/ways metadata. A final stage always has zero award and empty wins/removals. Stage grids are independent snapshots. The random callback must return values in `[0,1)`. Bet must be positive and finite.

Beacon stages additionally contain `coinValues[c][r]`: zero means no locked coin; a positive number is its absolute credit value, already multiplied by bet. Respins add `remaining`, `added`, and `round`. Feature kinds are `holdspin-start`, `holdspin-respin`, `holdspin-collect`, and `final`; non-triggered rounds use `base` then `final`.

## Mint: 5 × 3, twenty fixed lines

Twenty unique paylines are exported in `PAYLINES`. A line requires three or more matching symbols on consecutive reels from the left edge. Wild substitutes for symbols 0–5. Each line pays its highest eligible combination once, including all-wild combinations. Scatter does not pay or substitute. Awards equal total bet / 20 × the multiplier in `PAYTABLE.mint`; columns correspond to 3, 4, and 5 symbols.

## Pearl: 4 × 4, 256 ways

Matching symbols on three or four consecutive reels from the leftmost reel win; rows need not align. Matching-position counts multiply across reels. Wild substitutes for symbols 0–5. Every path whose first three reels are all wild belongs exclusively to the wild award. Such a prefix is excluded from ordinary symbol awards even if the fourth reel extends it with a native symbol. This explicit allocation prevents paying the same prefix both as wild-3 and ordinary-symbol-4. Highlight cells include only positions that participate in at least one allocated winning path. Scatter does not pay. Each way pays total bet / 256 × the 3-reel or 4-reel multiplier in `PAYTABLE.pearl`.

## Reef: 5 × 4, pay anywhere and cascade

Eight or more identical symbols anywhere on the board pay. Wild is a separately paying symbol here and does not substitute. Scatter does not pay. The three multiplier columns cover 8–9, 10–11, and 12–20 identical symbols. Each matching group pays total bet × its multiplier. All winning cells are removed together. Remaining cells fall down within their column; new symbols fill from the top. Winning stages show the board before removal.

There is an explicit maximum of **eight paid cascade stages per purchased spin**. After the eighth removal/refill, the final board is displayed without evaluating or paying it; `feature.capped` and the final stage's `capped` indicate that limit. No additional bet is charged during cascades.

## Beacon: 5 × 3, hold and spin

Three, four, or five initial coins pay respectively 1×, 2×, or 3× total bet. These base awards use coin count, regardless of the coin face values. Zero to two coins pay nothing. Six or more initial coins trigger hold and spin, replacing the base count award.

Each initial coin locks a value of 1×, 2×, 3×, 5×, or 10× total bet. The feature starts with three respins. Each empty position independently has a 12% chance of landing a new coin each respin. Existing coins and their values never move or change. Any new coin resets the remaining respins to three; otherwise the counter decreases by one. The feature ends when the counter reaches zero or every position is occupied. All locked values are collected **once**, in the `holdspin-collect` stage. A full initial board collects immediately without respins. There is no additional full-board jackpot or bet deduction.

## Symbol and value sampling

Mint and Pearl independently sample each cell: symbols 0–5 each have probability 15%, wild 6%, scatter 4%. Reef uses symbol probabilities [35%, 25%, 15%, 10%, 6%, 4%, 3%, 2%] for IDs 0–7, including refills. Beacon initial cells have coin probability 14.4%; other IDs 1–7 divide the remaining 85.6% equally. Coin values use probabilities 45%, 25%, 15%, 10%, 5% for 1×, 2×, 3×, 5×, 10× respectively. These weights are demonstration settings and do not constitute an RTP statement.

## Verification

Run `node --test tests/engine.test.mjs`. Tests cover line adjacency, wild substitution, 256 ways, pure wild payout, anywhere counts, removal/refill, the eight-cascade cap, base coin awards, preserved coin values, respin resets, one-time feature collection, immediate full-board collection, validation, and deterministic totals across 600 seeded spins.

## Simulation audit (September 18, 2026)

`MATH_SIMULATION.json` records 100,000 deterministic rounds per mode at bet 100, before and after balancing. Observed final returns were Mint 93.903%, Pearl 93.902%, Reef 93.558%, and Beacon 93.292%. These are finite-sample measurements, not certified, theoretical, or guaranteed RTP values. Win frequency counts any positive payout, including returns below the bet. Maximum wins in the report are sampled maxima, not game caps.

The audit corrected Pearl all-wild-prefix allocation, increased Mint/Pearl/Reef payouts, changed Reef sampling to make cascades reasonably frequent, and reduced Beacon initial coin frequency. Exports are recursively frozen; supplied evaluation grids are not mutated; stage snapshots are independent. Awards retain six decimal places; a consumer using integer atomic currency should convert the complete transaction once rather than round each stage or each way.
