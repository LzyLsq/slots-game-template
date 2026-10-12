/** Record the actual hall canvas during authored idle and touch selection. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve(process.env.QA_OUTPUT || 'docs/qa/hall-motion');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:6040/?debug=1&screen=home&v=' + encodeURIComponent(process.env.QA_VERSION || 'hall-motion'));
    await page.waitForFunction(() => {
      const a = window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
      return a?.page === 'home' && !a.busy && !document.getElementById('csw-preloader');
    }, null, { timeout: 90000 });
    await page.evaluate(() => {
      const stream = document.querySelector('#GameCanvas').captureStream(30);
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x));
      const recorder = window.__hallRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3500000 });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      window.__hallVideo = new Promise(resolve => {
        recorder.onstop = () => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(new Blob(chunks, { type: mimeType }));
          stream.getTracks().forEach(t => t.stop());
        };
      });
      recorder.start(200);
    });
    const selections = [];
    await page.waitForTimeout(1800);
    for (const index of [1, 2, 3, 0]) {
      const point = await page.evaluate(index => {
        const cc = window.cc, a = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
        const n = a.content.getComponentsInChildren('cc.UITransform').find(c => c.node.name === 'Choose destination ' + index).node;
        const ratio = innerWidth / cc.view.getVisibleSize().width;
        return { x: n.worldPosition.x * ratio, y: innerHeight - n.worldPosition.y * ratio };
      }, index);
      await page.touchscreen.tap(point.x, point.y);
      await page.waitForTimeout(1100);
      const state = await page.evaluate(() => {
        const cc = window.cc, a = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
        return { selected: a.selectedRoute, groups: a.content.getComponentsInChildren('cc.UITransform').filter(c => c.node.name.startsWith('House presentation ')).map(c => ({ name: c.node.name, alpha: c.node.getComponent('cc.UIOpacity')?.opacity ?? 255 })) };
      });
      assert.equal(state.selected, index);
      assert.equal(state.groups.length, 1);
      assert.equal(state.groups[0].alpha, 255);
      selections.push(state);
    }
    await page.waitForTimeout(1800);
    const encoded = await page.evaluate(async () => {
      window.__hallRecorder.stop();
      return await window.__hallVideo;
    });
    fs.writeFileSync(path.join(output, 'hall-selection.webm'), Buffer.from(encoded, 'base64'));
    await page.screenshot({ path: path.join(output, 'hall-restored.png') });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'hall-motion-audit.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), method: 'Actual GameCanvas.captureStream(30) recording with touchscreen selections; capture rate is not a native frame-rate measurement', selections, errors }, null, 2) + '\n');
    console.log('PASS hall continuous recording and four touch selections');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
