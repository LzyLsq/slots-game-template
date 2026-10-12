# F40 probability evidence — 2026-10-10

These results describe **natural reel/feature returns**, excluding newcomer top-ups and forced visual fixtures. RTP is total returned virtual credits divided by total charged stake over many rounds. A hit is any positive return; it can still be less than the stake and is not the probability of profit or a BIG award.

Each sampling row uses **2,000,000 paid rounds**, seed 40571, actual integer payouts and feature settlement. The minimum stake is 30 and maximum 900. Seed reuse aids comparison but does not mean the two stake samples are statistically independent. Nominal target: 96%, with a 0.4 percentage-point tolerance for integer rounding. Compatibility means the 95% interval intersects that tolerance band, not that the true value is proven to be exactly 96%.

| Mode | Stake | Sample RTP | 95% confidence interval | Positive-return frequency |
|---|---:|---:|---|---:|
| golden-phoenix | 30 | 95.590% | 95.183–95.998% | 43.868% |
| golden-phoenix | 900 | 95.998% | 95.590–96.406% | 43.868% |
| jade-dragon | 30 | 95.554% | 95.170–95.937% | 57.614% |
| jade-dragon | 900 | 95.716% | 95.333–96.100% | 58.475% |
| pearl-qilin | 30 | 96.480% | 96.247–96.714% | 67.834% |
| pearl-qilin | 900 | 96.435% | 96.201–96.669% | 67.834% |
| amber-panda | 30 | 95.905% | 95.718–96.092% | 55.142% |
| amber-panda | 900 | 96.047% | 95.860–96.235% | 55.142% |

Raw reports: [minimum stake](qa/rtp-min.json), [maximum stake](qa/rtp-max.json). Rare high awards make short samples noisy; these rates do not guarantee any player's outcome. They are project calibration evidence, not a claimed industry standard.

Amber Panda is also checked by enumerating **148,877 stop combinations for each independent board**, convolving lantern counts and uniform mystery replacements, and including three free spins and per-line integer rounding. Across all six allowed stakes its exact RTP ranges from 95.879% to 96.239%. See [exact enumeration](qa/panda-exact.json).

BIG starts when the total return strictly exceeds the charged stake. The fifth and tenth settled rounds receive disclosed shortfall credits to at least 5× and 10× respectively; this is account-wide, not per house. These welcome credits do not change reel symbols or turn a losing reel into an invented line win. Separate [touch settlement evidence](qa/settlement/summary.json) checks those credits, pending recovery and one-time accounting.
