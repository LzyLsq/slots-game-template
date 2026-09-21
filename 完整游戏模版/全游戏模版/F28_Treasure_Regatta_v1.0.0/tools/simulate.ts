import { MODES } from '../assets/scripts/core/Modes';
import { generateRound } from '../assets/scripts/core/Rules';
import { SeededRandom } from '../assets/scripts/core/Random';
import type { ModeId } from '../assets/scripts/core/Model';

const count = Number(process.argv[2] ?? 100000);
if (!Number.isSafeInteger(count) || count < 100 || count > 10000000) throw new Error('Round count must be 100–10,000,000');
const metrics = (Object.keys(MODES) as ModeId[]).map((mode, index) => {
  const rng = new SeededRandom(27092026 + index);
  let won = 0, hits = 0, max = 0, squared = 0, feature = 0;
  for (let i = 0; i < count; i++) {
    const result = generateRound(mode, 100, rng), x = result.totalWin / 100;
    won += x; squared += x * x; hits += Number(x > 0); max = Math.max(max, x);
    feature += Number(result.stages.length > 1);
  }
  const average = won / count;
  const standardError = Math.sqrt(Math.max(0, squared / count - average * average) / count);
  return { mode, rounds: count, observedReturn: average, approximate95PercentInterval: [average - 1.96 * standardError, average + 1.96 * standardError], hitRate: hits / count, multipleStageRate: feature / count, largestObservedBetMultiple: max };
});
console.log(JSON.stringify({ note: 'Seeded development simulation, not certified RTP or production assurance.', metrics }, null, 2));
