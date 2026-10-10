const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const OUT = path.resolve(process.env.QA_OUTPUT || 'docs/probability-20261010/rules');
fs.mkdirSync(OUT, { recursive: true });
const errors = [], checks = [];
async function tap(page, name) {
  const point = await page.evaluate(name => {
    const cc = window.cc, app = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
    const find = node => node.name === name && node.activeInHierarchy ? node : node.children.map(find).find(Boolean);
    const node = find(app.root);
    if (!node) throw Error('Missing ' + name);
    const b = node.getComponent('cc.UITransform').getBoundingBoxToWorld(), k = innerWidth / cc.view.getVisibleSize().width;
    return { x: (b.x + b.width / 2) * k, y: innerHeight - (b.y + b.height / 2) * k };
  }, name);
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(150);
}
(async () => {
  const rulesModule = await import('../../assets/scripts/math/PrimaryRuleText.ts');
  const configsModule = await import('../../assets/scripts/math/GameConfigs.ts');
  const primaryRuleText = (rulesModule.default || rulesModule).primaryRuleText;
  const koi = (configsModule.default || configsModule).GAME_CONFIGS.find(c => c.id === 'lotus-koi');
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    for (const [locale, width, height] of [['en',390,844], ...['en','zh-CN','zh-TW','ja','ko'].map(l => [l,320,568])]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(locale => localStorage.setItem('golden-wilds-f36.locale.v1', locale), locale);
      await page.goto('http://127.0.0.1:6036/?debug=1&screen=game&game=lotus-koi&v=f36-probability-rules-20261010');
      await page.waitForFunction(() => {
        const a = window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
        return a?.reels && !a.busy && !a.node.getChildByName('Atelier loading');
      }, null, { timeout: 90000 });
      await page.waitForTimeout(500);
      await tap(page, 'Rules');
      const paragraphs = [];
      const normalize = s => s.replace(/\s/g, '');
      const expected = normalize(primaryRuleText(koi, locale)[2]);
      for (let index = 0; index < 12; index++) {
        const data = await page.evaluate(() => {
          const cc = window.cc, app = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
          const k = innerWidth / cc.view.getVisibleSize().width;
          const labels = app.modal.getComponentsInChildren('cc.Label').filter(l => l.node.activeInHierarchy);
          return labels.map(l => {
            const b = l.node.getComponent('cc.UITransform').getBoundingBoxToWorld();
            return { text: l.string, height: b.height * k, box: [b.x * k, innerHeight - (b.y + b.height) * k, b.width * k, b.height * k] };
          });
        });
        const body = data.find(l => l.height > 100);
        const candidate = body ? normalize(paragraphs.join('') + body.text) : '';
        if (body && candidate && expected.startsWith(candidate)) {
          assert(body.box[0] >= 0 && body.box[1] >= 0 && body.box[0] + body.box[2] <= width + 1 && body.box[1] + body.box[3] <= height + 1);
          paragraphs.push(body.text);
          await page.screenshot({ path: path.join(OUT, `koi-wild-${locale}-${width}x${height}-${paragraphs.length}.png`) });
          if (candidate === expected) break;
        } else if (paragraphs.length) break;
        await tap(page, 'Next rule page');
      }
      assert.equal(normalize(paragraphs.join('')), expected, 'all supplemental text must appear in actual paginated UI');
      checks.push({ locale, width, height, pages: paragraphs.length, paragraph: paragraphs.join('\n') });
      console.log('PASS WILD rule fully visible ' + locale + ' ' + width + 'x' + height);
      await context.close();
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ checks, errors }, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
