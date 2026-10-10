import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';

const spins = Math.max(10_000, Number.parseInt(process.argv[2] ?? '100000', 10) || 100_000);
const seed=Number(process.argv[3]??0x51a7cafe)>>>0;
const betIndex=process.argv[4]==='max'?Infinity:Math.max(0,Number(process.argv[4]??2));
const maxHalfWidth=Number(process.env.RTP_MAX_HALF_WIDTH??0.01);
if(!Number.isFinite(maxHalfWidth)||maxHalfWidth<=0)throw new Error('RTP_MAX_HALF_WIDTH must be positive');
const results = GAME_CONFIGS.map((config, index) => {
  const generator = new ResultGenerator(); const rng = new SeededRNG(seed + index * 0x10001); const bet = config.bets[Math.min(config.bets.length-1,betIndex)]; let wagered = 0; let won = 0; let baseWon = 0; let featureWon = 0; let hits = 0; let features = 0; let maxWin = 0;let squares=0;
  for (let spin = 0; spin < spins; spin += 1) { const result = generator.generate(config, bet, rng); wagered += bet; won += result.totalWin;squares+=(result.totalWin/bet)**2; baseWon += result.baseWin; featureWon += result.featureWin; if (result.totalWin > 0) hits += 1; if (result.feature) features += 1; maxWin = Math.max(maxWin, result.totalWin); }
  const rtp=won/wagered,se=Math.sqrt(Math.max(0,squares/spins-rtp*rtp)/(spins-1));
  const targetWithinConfidence95=Math.abs(rtp-config.targetRtp)<=1.96*se;
  const sufficientlyPrecise=1.96*se<=maxHalfWidth;
  const calibrationStatus=!targetWithinConfidence95?'TARGET_NOT_SUPPORTED':sufficientlyPrecise?'TARGET_COMPATIBLE':'INSUFFICIENT_PRECISION';
  return { calibrationStatus,targetWithinConfidence95,sufficientlyPrecise,gameId: config.id, spins, seed, bet, payoutScale:config.payoutScale,targetRtp: config.targetRtp, rtp, confidence95:[rtp-1.96*se,rtp+1.96*se],baseRtp: baseWon / wagered, featureRtp: featureWon / wagered, hitRate: hits / spins, featureRate: features / spins, maxWin };
});
const status=results.some(r=>r.calibrationStatus==='TARGET_NOT_SUPPORTED')?'CALIBRATION_REQUIRED':results.some(r=>!r.sufficientlyPrecise)?'MORE_SAMPLES_REQUIRED':'TARGET_COMPATIBLE';
console.log(JSON.stringify({status,naturalOnly:true,newcomerIncluded:false,forcedResultsIncluded:false,maxConfidence95HalfWidth:maxHalfWidth,note:'RTP is long-run total return divided by stake, not hit probability. A compatible interval is not proof of exact target RTP.',results},null,2));
if(status!=='TARGET_COMPATIBLE')process.exitCode=1;
