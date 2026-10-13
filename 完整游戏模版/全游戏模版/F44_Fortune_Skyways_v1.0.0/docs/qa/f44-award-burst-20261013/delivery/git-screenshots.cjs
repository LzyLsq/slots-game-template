/* Fresh screenshots from the current export; private browser accounts only. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const version = 'f44-award-burst-20261013';
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:6044';
const output = path.resolve('docs/screenshots/f44-git-delivery-20261013');
const modes = ['golden-otter', 'moon-rabbit', 'star-fox', 'cloud-elephant'];
fs.mkdirSync(output, {recursive: true});

async function ready(page, screen, mode) {
  await page.goto(`${base}/?debug=1&screen=${screen}${mode ? '&game=' + mode : ''}&v=${version}`);
  await page.waitForFunction(({screen, mode}) => {
    const app = window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
    return app && !app.busy && app.page === screen && (!mode || app.config.id === mode)
      && !app.node.getChildByName('Atelier loading') && !document.querySelector('#csw-preloader')
      && (screen !== 'game' || app.reels && app.content.getComponentsInChildren('CabinetGuardian')[0]?.mesh?.spriteFrame);
  }, {screen, mode}, {timeout: 90000});
  await page.waitForTimeout(700);
}

async function take(page, filename, kind) {
  const state = await page.evaluate(() => {
    const app = window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
    const stage = app.modal?.getComponent('SalonWinStage');
    return {
      page: app.page, mode: app.config.id, busy: app.busy,
      award: stage ? {amount: stage.amount, tier: stage.tier, revealed: stage.revealed, elapsed: stage.elapsed, revealElapsed: stage.elapsed - stage.resolvedAt, display: stage.count.string} : null,
      scroll: {x: window.scrollX, y: window.scrollY}
    };
  });
  assert.deepEqual(state.scroll, {x: 0, y: 0});
  await page.screenshot({path: path.join(output, filename), type: 'jpeg', quality: 95});
  console.log('CAPTURE', filename, state.mode, state.award?.display || 'idle');
  return {file: filename, kind, ...state};
}

(async () => {
  const browser = await chromium.launch({headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']});
  const captures = [], errors = [];
  const viewport = {width: 390, height: 844, deviceScaleFactor: 2};
  try {
    const context = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
    await ready(page, 'home');
    captures.push(await take(page, 'home.jpg', 'lobby'));
    for (const mode of modes) {
      await ready(page, 'game', mode);
      captures.push(await take(page, mode + '.jpg', 'cabinet-idle'));
      const before = await page.evaluate(() => {
        const app = window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
        return {balance: app.services.economy.balance(), played: app.services.profile.current().gamesPlayed,
          ids: app.services.save.currentScope().transactions.map(t => t.id)};
      });
      await page.evaluate(() => {
        const app = window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
        window.__gitCaptureRoundDone = false;
        app.force = 'epic';
        void app.spin().then(() => window.__gitCaptureRoundDone = true);
      });
      await page.waitForFunction(() => {
        const cc = window.cc, app = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
        const stage = app.modal?.getComponent('SalonWinStage');
        if (stage?.revealed && stage.elapsed - stage.resolvedAt >= 1.08) {cc.director.pause(); return true;}
        return false;
      }, null, {timeout: 60000, polling: 'raf'});
      const capture = await take(page, mode + '-epic.jpg', 'actual-paid-debug-epic');
      assert.equal(capture.mode, mode);
      assert.equal(capture.award.tier, 3);
      assert(capture.award.revealed && capture.award.amount > 0);
      await page.evaluate(() => window.cc.director.resume());
      await page.waitForFunction(() => window.__gitCaptureRoundDone, null, {timeout: 20000});
      const after = await page.evaluate(ids => {
        const app = window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
        return {balance: app.services.economy.balance(), played: app.services.profile.current().gamesPlayed,
          pending: !!app.services.save.currentScope().pendingSpin, modal: !!app.modal, busy: app.busy,
          transactions: app.services.save.currentScope().transactions.filter(t => !ids.includes(t.id) && ['spin-bet','spin-win'].includes(t.type)).map(t => ({type: t.type, amount: t.amount}))};
      }, before.ids);
      assert.equal(after.transactions.filter(t => t.type === 'spin-bet').length, 1);
      assert.equal(after.transactions.filter(t => t.type === 'spin-win').length, 1);
      assert.equal(after.balance, before.balance + after.transactions.reduce((sum, t) => sum + t.amount, 0));
      assert.equal(after.played, before.played + 1);
      assert(!after.pending && !after.modal && !after.busy);
      captures.push({...capture, settlement: after,
        captureNote: 'Actual local paid round, QA forced EPIC. Director paused at the second reveal impact for screenshot, then resumed through settlement.'});
    }
    await context.close();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'capture-audit.json'), JSON.stringify({date: '2026-10-13', capturedAt: new Date().toISOString(), version,
      previewPort: Number(new URL(base).port), viewport, captures, pageErrors: errors,
      scope: 'Fresh current-export lobby, four idle cabinets and four real local paid rounds with forced EPIC. Images show rendering, not natural probability, continuous motion or subjective audio quality.'}, null, 2) + '\n');
  }
})();
