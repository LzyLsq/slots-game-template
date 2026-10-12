/** Run the production save parser against isolated in-memory data, never user saves. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRound, evaluateTier, restoreGuarantee, INITIAL_GUARANTEE, STAKES } from '../assets/scripts/domain/VaultMath';
import { LETTERS } from '../assets/scripts/domain/Inbox';
import { freshJournal, journalForDay } from '../assets/scripts/domain/DailyJournal';
import { restoreAudioPreferences } from '../assets/scripts/ui/AudioPreferences';
import { reserveSpin, settleSpin } from '../assets/scripts/domain/SpinWallet';

const source = readFileSync('assets/scripts/ui/GoldenEncoreApp.ts', 'utf8');
const tree = ts.createSourceFile('GoldenEncoreApp.ts', source, ts.ScriptTarget.Latest, true);
const parser = tree.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'readSave');
assert.ok(parser);
const constant = (name: string) => {
  const declaration = tree.statements.find(s => ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(tree) === name));
  assert.ok(declaration); return declaration.getText(tree);
};
let raw: string | null = null, writes = 0;
const storage = () => ({ getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; writes++; } });
const read = vm.runInNewContext(ts.transpileModule(`${constant('KEY')}\n${constant('DEFAULT')}\n${parser.getText(tree)}\nreadSave;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText,
  { storage, restoreAudioPreferences, STAKES, INITIAL_GUARANTEE, restoreGuarantee, freshJournal, journalForDay, LETTERS, settleSpin });
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
for (const guarantee of [undefined, null, { bigSeen: 'false', superSeen: 'true' }, { bigSeen: false, superSeen: false }]) {
  raw = JSON.stringify({ spins: 120, coins: 34567, name: 'Existing keeper', guarantee }); writes = 0;
  const restored = read();
  assert.equal(restored.spins, 120); assert.equal(restored.coins, 34567); assert.equal(restored.name, 'Existing keeper');
  assert.deepEqual(plain(restored.guarantee), { bigSeen: false, superSeen: false });
  assert.equal(evaluateTier(restored.spins, restored.guarantee, () => .99), 'none', 'Missing/invalid flags cannot force old-save prizes');
  assert.equal(writes, 0, 'Merely reading old saves must not reset or rewrite them');
}
for (const settings of [{ musicEnabled: false }, { bgmEnabled: false }, { effectsEnabled: false }, {}]) {
  raw = JSON.stringify({ spins: 120, coins: 34567, ...settings }); writes = 0;
  const restored = read();
  assert.equal(restored.spins, 120); assert.equal(restored.coins, 34567);
  const expected = restoreAudioPreferences(settings);
  for (const key of ['musicEnabled','bgmEnabled','effectsEnabled'] as const) assert.equal(restored[key], expected[key]);
  assert.equal(writes, 0, 'Audio migration neither resets nor rewrites gameplay');
}
raw = JSON.stringify({ spins: 120, coins: 34567, guarantee: { bigSeen: true, superSeen: true } });
assert.deepEqual(plain(read().guarantee), { bigSeen: true, superSeen: true });
for (const [spins, expected] of [[4, 'big'], [9, 'super']] as const) {
  raw = JSON.stringify({ spins, coins: 5000 });
  const saved = read();
  const round = createRound({ spinsBefore: saved.spins, bet: 2, mode: 1, lane: 1,
    meters: saved.roomMeters[1], featureProgress: saved.featureProgress[1], guarantee: saved.guarantee, rng: () => .99 });
  assert.equal(round.presentationTier, expected, 'Actual saved first-five/ten windows remain intact');
}
// Reload a previously accepted old-player spin: settle its reserved award once,
// then ensure absent flags do not force another introductory award on the next spin.
const accepted = reserveSpin(5000, 100, 121, 400, 'AUDIT');
raw = JSON.stringify({ spins: 121, coins: accepted.balance, totalWon: 50, pendingSpin: accepted.pending }); writes = 0;
const recovered = read();
assert.equal(recovered.coins, 5300); assert.equal(recovered.totalWon, 450);
assert.equal(recovered.pendingSpin, undefined); assert.equal(writes, 1);
assert.equal(evaluateTier(recovered.spins, recovered.guarantee, () => .99), 'none');
assert.equal(read().coins, 5300); assert.equal(writes, 1, 'Repeated reload cannot settle twice');
console.log('PASS production readSave: strict flags, unchanged existing balances/progress, exact first-five/ten windows, no overdue guarantees and once-only pending recovery');
