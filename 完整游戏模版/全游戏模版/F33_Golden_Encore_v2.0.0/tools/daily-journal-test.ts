import assert from 'node:assert/strict';
import { claimJournal, freshJournal, journalForDay, journalGoals, recordJournalSpin } from '../assets/scripts/domain/DailyJournal';
const day = '2026-09-29';
let state = freshJournal(day);
assert.equal(claimJournal(state, day, 0), null);
state = recordJournalSpin(state, day, 0, false);
state = recordJournalSpin(state, day, 0, true);
assert.deepEqual(journalGoals(state, day).map(goal => goal.ready), [false, false, false]);
state = recordJournalSpin(state, day, 1, true);
assert.deepEqual(journalGoals(state, day).map(goal => goal.ready), [true, true, true]);
for (let i = 0; i < 3; i += 1) {
  const result = claimJournal(state, day, i); assert.ok(result); state = result.state;
  assert.equal(result.award, [300, 500, 700][i]);
  assert.equal(claimJournal(state, day, i), null, 'no double claim');
}
assert.deepEqual(journalGoals(state, day).map(goal => goal.claimed), [true, true, true]);
assert.deepEqual(journalGoals(state, '2026-09-30').map(goal => goal.progress), [0, 0, 0]);
assert.equal(journalForDay({ day, spins: -50, rooms: [true], claimed: [true] }, day).spins, 0);
assert.equal(claimJournal(state, '2026-09-30', 0), null, 'yesterday cannot be claimed today');
console.log('PASS daily journal objectives, day rollover and one-time claims');
