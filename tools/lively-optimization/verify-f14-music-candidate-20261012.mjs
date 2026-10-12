// Playback/layout checks only. Passing this script is not a human listening approval.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root = process.argv.find(a => a.startsWith('--output='))?.slice(9) || '/Users/mengjunzhu/Desktop/F14_音乐试听候选_20261012';
const require = createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium} = require('playwright');
const manifest = JSON.parse(readFileSync(join(root, '音乐清单与授权.json')));
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
assert.equal(manifest.tracks.length, 20);
assert.equal(new Set(manifest.tracks.filter(t => t.fullComposition).map(t => t.sourceSha256)).size, 7);
for (const track of manifest.tracks) assert.equal(hash(join(root, track.file)), track.sha256, 'Stored file mismatch: ' + track.file);
const browser = await chromium.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
const errors = [], requests = [], tracks = [];
const context = await browser.newContext({viewport: {width: 320, height: 568}});
const page = await context.newPage();
page.on('pageerror', e => errors.push(String(e)));
page.on('request', r => requests.push(r.url()));
const report = {checkedAt: new Date().toISOString(), passed: false, tracks, errors,
  scope: 'Stored audio checksums, isolated local Chromium playback, 320px layout, rapid replacement and stop. Not in-game playback, real-device performance, seamless loops or human listening approval.',
  humanListeningApproved: false, gameIntegrationTested: false};
try {
  await page.goto(pathToFileURL(join(root, '音乐新旧对比.html')).href);
  assert.equal(await page.locator('audio').count(), 1);
  assert.equal(await page.locator('#new-music .cue').count(), 7);
  assert.equal(await page.locator('#new-wins .cue').count(), 5);
  assert.equal(await page.locator('#old .cue').count(), 8);
  assert(await page.locator('#player').evaluate(p => p.paused && !p.hasAttribute('src') && p.preload === 'none'));
  for (const track of manifest.tracks) {
    const button = page.locator(`[data-id="${track.id}"] .cue`);
    const b = await button.boundingBox();
    assert(b && b.width >= 44 && b.height >= 44 && b.x >= 0 && b.x + b.width <= 320, 'Clipped/small cue button: ' + track.id);
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await page.waitForFunction(() => {
      const p = document.querySelector('#player');
      return !p.error && p.readyState >= 2 && p.currentTime > .02 && (!p.paused || p.ended);
    }, null, {timeout: 12000});
    const status = await page.locator('#player').evaluate(p => ({src: decodeURIComponent(p.currentSrc), duration: p.duration, time: p.currentTime, error: p.error?.message}));
    assert(status.src.endsWith('/' + track.file), 'Wrong source: ' + track.id);
    assert(Number.isFinite(status.duration) && Math.abs(status.duration - track.duration) < .15 && !status.error);
    assert.equal(await page.locator('#error').textContent(), '');
    assert.equal(await page.locator('.card.active').count(), 1);
    await page.locator('#stop').click();
    assert(await page.locator('#player').evaluate(p => p.paused && !p.hasAttribute('src')));
    assert.equal(await page.locator('.card.active').count(), 0);
    tracks.push({id: track.id, duration: status.duration, playbackAdvanced: true, buttonFits320px: true});
    console.log('PLAYBACK PASS: ' + track.id);
  }
  await page.locator('#new-music .cue-mid').first().scrollIntoViewIfNeeded();
  await page.locator('#new-music .cue-mid').first().click();
  const expectedMiddle = Math.floor(manifest.tracks[0].duration * .4);
  await page.waitForFunction(expected => document.querySelector('#player').currentTime >= expected, expectedMiddle);
  await page.locator('#stop').click();
  report.middleSectionSeek = true;
  // Rapid replacements must not leave an old playback promise reporting an error or changing the current card.
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('.cue')];
    for (let i = 0; i < 30; ++i) buttons[i % buttons.length].click();
    document.querySelector('#stop').click();
  });
  await page.waitForFunction(() => {const p = document.querySelector('#player');return p.paused && !p.hasAttribute('src') && !document.querySelector('.active');});
  assert.equal(await page.locator('#error').textContent(), '');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert(!requests.some(url => /^https?:/i.test(url)), 'Audition should not fetch remote files');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('h1').scrollIntoViewIfNeeded();
  await page.screenshot({path: join(root, 'verification', '试听页-320px.png')});
  await page.screenshot({path: join(root, 'verification', '试听页-320px-全页.png'), fullPage: true});
  await page.setViewportSize({width: 1200, height: 900});
  await page.screenshot({path: join(root, 'verification', '试听页-桌面.png')});
  Object.assign(report, {passed: true, singlePlayer: true, noRemoteAudioRequests: true, rapidReplacementAndStop: true, noHorizontalOverflow320px: true});
} catch (e) {
  report.failure = String(e);
  throw e;
} finally {
  writeFileSync(join(root, 'verification', '试听页播放检查.json'), JSON.stringify(report, null, 2) + '\n');
  await context.close();
  await browser.close();
}
console.log(`DONE: ${tracks.length}/20 local files play; 7 distinct full compositions; original project untouched.`);
