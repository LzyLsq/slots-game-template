import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { REEL_ART, PRIMARY_SYMBOL, PRIZE_STAGES, reelArt } from '../assets/scripts/ui/ThemeArt';
const all = REEL_ART.flat();
assert.equal(all.length, 24);
assert.equal(new Set(all).size, 24, 'No shared sprite aliases between rooms');
const hashes = all.map(name => {
  const bytes = readFileSync(`assets/resources/art/${name}.png`);
  assert.equal(bytes.readUInt32BE(16), 384); assert.equal(bytes.readUInt32BE(20), 384);
  assert.equal(bytes[25], 6, 'Generated reel art must retain RGBA');
  return createHash('sha256').update(bytes).digest('hex');
});
assert.equal(new Set(hashes).size, 24, 'Not copies of the same sprite under different filenames');
for (const mode of [0,1,2,3] as const) {
  assert.equal(reelArt(mode, PRIMARY_SYMBOL[mode]), REEL_ART[mode][PRIMARY_SYMBOL[mode]]);
  assert.equal(REEL_ART[mode].length, 6);
}
assert.deepEqual(PRIZE_STAGES.map(s => s.keeper), ['otter','rabbit','fox','dragon']);
assert.equal(new Set(PRIZE_STAGES.map(s=>s.art)).size,4,'Each room owns its full award scene');
const app=readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
assert.ok(!app.includes('this.frames.get(SYMBOLS['),'Initial, moving and settled reels must all use current room art');
assert.ok(app.includes('this.round.presentationTier') && app.includes("tier === 'ordinary'") && app.includes('this.showCabinetWin()'));
assert.ok(app.includes('node(this.surface, `Win · ${tier} · cabinet`'));
assert.ok(app.includes('CABINET_WIN_TITLE') && app.includes('CABINET_WIN_AMOUNT'));
console.log('PASS four independent generated six-symbol sets; distinct room/keeper stages; correct visual tier dispatch');

// Behavioral coverage of the actual callback/update lives in page-transition-test.
// Keep this dispatch assertion tied to the new retained/coalesced resize path.
const resizeGuard = app.slice(app.indexOf('  private flushViewportRefresh()'), app.indexOf('  protected update('));
assert.ok(resizeGuard.includes('!this.bootReady') && resizeGuard.includes('this.spinning') && resizeGuard.includes('this.activeOverlay') && resizeGuard.includes('return;'), 'A pending resize must not cancel a newly opened award');
