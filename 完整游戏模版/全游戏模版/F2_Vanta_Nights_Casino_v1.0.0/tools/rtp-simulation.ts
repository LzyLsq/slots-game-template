import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';

const spins = Math.max(10_000, Number.parseInt(process.argv[2] ?? '100000', 10) || 100_000);
const results = GAME_CONFIGS.map((config, index) => {
  const generator = new ResultGenerator(); const rng = new SeededRNG(0x51a7cafe + index * 0x10001); const bet = config.bets[2]; let wagered = 0; let won = 0; let baseWon = 0; let featureWon = 0; let hits = 0; let features = 0; let maxWin = 0;
  for (let spin = 0; spin < spins; spin += 1) { const result = generator.generate(config, bet, rng); wagered += bet; won += result.totalWin; baseWon += result.baseWin; featureWon += result.featureWin; if (result.totalWin > 0) hits += 1; if (result.feature) features += 1; maxWin = Math.max(maxWin, result.totalWin); }
  return { gameId: config.id, spins, targetRtp: config.targetRtp, rtp: won / wagered, baseRtp: baseWon / wagered, featureRtp: featureWon / wagered, hitRate: hits / spins, featureRate: features / spins, maxWin };
});
console.log(JSON.stringify({ status: results.every((result) => result.rtp >= 0.93 && result.rtp <= 0.99) ? 'PASS' : 'CALIBRATION_REQUIRED', results }, null, 2));
if (results.some((result) => result.rtp < 0.93 || result.rtp > 0.99)) process.exitCode = 1;
