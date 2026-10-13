const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = process.env.QA_OUTPUT ? path.resolve(process.env.QA_OUTPUT) : path.resolve(__dirname, '../../docs/screenshots/f44-continuous-room-20261010/motion');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const results = [], errors = [];
  for (const mode of ['golden-otter', 'moon-rabbit', 'star-fox', 'cloud-elephant']) {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 }, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://127.0.0.1:6044/?debug=1&screen=game&game=' + mode + '&v='+encodeURIComponent(process.env.QA_VERSION||'f44-continuous-room-20261010'));
    await page.waitForFunction(() => {
      const app = window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
      return app?.page === 'game' && !app.busy &&
        !document.getElementById('csw-preloader') &&
        app.content?.getComponentsInChildren('CabinetGuardian')[0]?.mesh?.spriteFrame;
    }, null, { timeout: 90000 });
    const data = await page.evaluate(async () => {
      const app = window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
      const guardian = app.content.getComponentsInChildren('CabinetGuardian')[0];
      guardian.celebrate();
      guardian.watch(true);
      const samples = [];
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const node = guardian.sprite.node;
        samples.push({ joint: guardian.point(220,180), gesture:guardian.gesture, scale: [node.scale.x, node.scale.y, node.scale.z], angle: node.angle });
      }
      return {
        appReduced: app.reduced, guardianReduced: guardian.reducedMotion,
        vertexCount: guardian.mesh.renderData.data.length, samples,
        scroll: [document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight],
      };
    });
    assert(data.appReduced && data.guardianReduced);
    assert.equal(data.vertexCount, 2665);
    assert.deepEqual(data.scroll, [0, 0]);
    for (const sample of data.samples) {
      assert.deepEqual(sample.joint, [220,180]);
      assert.equal(sample.gesture, 0);
      assert.deepEqual(sample.scale, [1, 1, 1]);
      assert.equal(sample.angle, 0);
    }
    results.push({ mode, ...data });
    console.log('PASS reduced motion neutral guardian ' + mode);
    await context.close();
  }
  await browser.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'reduced-motion-audit.json'), JSON.stringify({ results, errors }, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
