const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const output = path.resolve(process.env.QA_OUTPUT || 'docs/qa/award-copy');
fs.mkdirSync(output, {recursive: true});

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const checks = [], errors = [];
  for (const locale of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
    const context = await browser.newContext({viewport: {width: 320, height: 568}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push({locale, message: error.message}));
    page.on('console', message => {if (message.type() === 'error') errors.push({locale, message: message.text()});});
    await page.addInitScript(locale => localStorage.setItem('fortune-festival-f40.locale.v1', locale), locale);
    await page.goto('http://127.0.0.1:6040/?debug=1&screen=game&game=jade-dragon&v=' + encodeURIComponent(process.env.QA_VERSION || 'award-copy'));
    await page.waitForFunction(() => {
      const app = window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
      return app?.reels && !app.busy && !app.node.getChildByName('Atelier loading') && !document.getElementById('csw-preloader');
    }, null, {timeout: 90000});
    for (const fixture of [{amount: 2537, welcome: false}, {amount: 12345678, welcome: true}]) {
      const saved = await page.evaluate(() => JSON.stringify(window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').services.save.currentScope()));
      await page.evaluate(({amount, welcome}) => {
        const app = window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
        window.__copyDone = false;
        void app.presentWin(amount, 80, welcome).then(() => window.__copyDone = true);
      }, fixture);
      await page.waitForFunction(() => window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').modal?.getComponent('SalonWinStage'));
      await page.waitForTimeout(1100);
      async function tapCollect() {
        const point = await page.evaluate(() => {
          const cc = window.cc, app = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
          const node = app.modal.getComponent('SalonWinStage').group.getChildByName('Collect your treasure');
          const b = node.getComponent('cc.UITransform').getBoundingBoxToWorld(), r = innerWidth / cc.view.getVisibleSize().width;
          return {x: (b.x + b.width / 2) * r, y: innerHeight - (b.y + b.height / 2) * r};
        });
        assert(point.x > 0 && point.x < 320 && point.y > 0 && point.y < 568);
        await page.touchscreen.tap(point.x, point.y);
      }
      await tapCollect();
      await page.waitForTimeout(260);
      const data = await page.evaluate(() => {
        const cc = window.cc, app = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'), stage = app.modal.getComponent('SalonWinStage');
        const ratio = innerWidth / cc.view.getVisibleSize().width;
        return {
          display: stage.count.string, revealed: stage.revealed, tier: stage.shownTier,
          digitAtlas: {active: stage.digits.node.activeInHierarchy, fallbackAlpha: stage.count.node.getComponent('cc.UIOpacity')?.opacity ?? 255, sprites: stage.digits.node.children.filter(n => n.activeInHierarchy).map(n => {const b = n.getComponent('cc.UITransform').getBoundingBoxToWorld(); return {frame: !!n.getComponent('cc.Sprite').spriteFrame, box: [b.x * ratio, innerHeight - (b.y + b.height) * ratio, b.width * ratio, b.height * ratio]};})},
          labels: app.modal.getComponentsInChildren('cc.Label').filter(label => label.node.activeInHierarchy).map(label => {
            const b = label.node.getComponent('cc.UITransform').getBoundingBoxToWorld();
            return {text: label.string, box: [b.x * ratio, innerHeight - (b.y + b.height) * ratio, b.width * ratio, b.height * ratio], font: label.fontSize * label.node.worldScale.y * ratio};
          }),
          scroll: [document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight],
        };
      });
      assert(data.revealed);
      assert.equal(data.display, fixture.amount.toLocaleString('en-US'));
      assert(data.digitAtlas.active && data.digitAtlas.fallbackAlpha === 0, 'Localized long returns must retain the bitmap counter');
      assert.equal(data.digitAtlas.sprites.length, data.display.length);
      for (const glyph of data.digitAtlas.sprites) {const [x, y, w, h] = glyph.box; assert(glyph.frame && x >= -1 && y >= -1 && x + w <= 321 && y + h <= 569, JSON.stringify(glyph));}
      assert.deepEqual(data.scroll, [0, 0]);
      for (const label of data.labels) {
        const [x, y, w, h] = label.box;
        assert(x >= -1 && y >= -1 && x + w <= 321 && y + h <= 569, JSON.stringify(label));
      }
      const tag = 'jade-dragon-' + locale + '-' + fixture.amount + '-320x568';
      await page.screenshot({path: path.join(output, tag + '.png')});
      await tapCollect();
      await page.waitForFunction(() => window.__copyDone && !window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').modal, null, {timeout: 10000});
      const restored = await page.evaluate(() => JSON.stringify(window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').services.save.currentScope()));
      assert.equal(restored, saved, 'Presentation must not credit or modify saved wallet state');
      checks.push({locale, fixture, tag, ...data});
      console.log('PASS ' + tag);
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(output, 'copy-audit.json'), JSON.stringify({checks, errors, scope: 'Direct presentation fixtures; long amount is a layout stress case, not a reachable payout or settlement claim.'}, null, 2));
  assert.equal(errors.length, 0, JSON.stringify(errors));
})().catch(error => {console.error(error); process.exit(1);});
